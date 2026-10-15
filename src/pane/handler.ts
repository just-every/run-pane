import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements, invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { dashboardData } from './data'
import { prepare, publish, revision, slugs, normalizeSite } from './content'
import { document, dashboard, publicPage } from './views'
import { planMoveIn, applyMoveIn, undoMoveIn } from './imports'
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}})
export async function paneResponse(request:Request,original:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname,api=path.startsWith('/api/pane'),preview=path.startsWith('/preview/')
 if(path!=='/app'&&!path.startsWith('/app/')&&!api&&!preview)return null
 const env=runtimeBindings(original),session=await operatorAuth(env).getSession(request)
 if(!session)return api?json({error:'Sign in required.'},401):new Response(null,{status:303,headers:{location:'/signin?returnTo='+encodeURIComponent(path)}})
 const actor=session.operator,owner=actor.role==='owner',editor=owner||actor.role==='admin'
 if(!['owner','admin','member'].includes(actor.role))return json({error:'Role has no access.'},403)
 try {
  if(preview) {
   if(!editor)return json({error:'An owner or admin must preview.'},403)
   const [, ,id,slug='home']=path.split('/'),row=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
   if(!row||!slugs.includes(slug))return json({error:'Preview not found.'},404)
   return document('Preview',publicPage(revision(row).site,slug,true))
  }
  if(request.method==='GET') {
   const data=await dashboardData(env.DB,actor.displayName,actor.role)
   if(api&&path!=='/api/pane')return json({error:'Not found.'},404)
   if(api)return json(data)
   data.notice=url.searchParams.get('notice')??undefined
   return document('Pane · Your website',dashboard(data))
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required.'},403)
  if(Number(request.headers.get('content-length')??0)>1200000)return json({error:'Input exceeds 1.2 MB.'},413)
  const input:Record<string,any>=request.headers.get('content-type')?.includes('application/json')?await request.json():Object.fromEntries(await request.formData())
  const action=api?path.slice('/api/pane/'.length):path.slice('/app/'.length)
  let result:unknown,notice='Saved.'
  if(['publish','rollback','messages/erase'].includes(action)?!owner:!editor)return json({error:'Your role cannot perform this action.'},403)
  if(action==='prepare') {
   result=await prepare(env.DB,actor.id,input.site??{name:input.name,description:input.description,pages:JSON.parse(input.pages)})
   notice='Draft prepared. Preview it before publishing.'
  } else if(action==='publish'||action==='rollback') {
   result=await publish(env.DB,actor.id,String(input.revision),action)
   notice=action==='publish'?'Published. Your approval is recorded.':'Rolled back. Your approval is recorded.'
  } else if(action==='import/dry-run') {
   result=await planMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source))
   if(!api) {
    const p=result as any
    const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
    const site=normalizeSite(JSON.parse(String(input.source)))
    return document('Review move-in',`<div class="public-shell"><main class="public-main" id="main"><h1>Review your move-in</h1><p>Import <strong>${esc(site.name)}</strong> as an unpublished five-page draft. Preview the draft before the owner publishes it.</p>${site.pages.map(page=>`<article><h2>${esc(page.title)}</h2><p class="plain-text">${esc(page.body)}</p></article>`).join('')}<details><summary>Import identity</summary><code>${esc(p.fingerprint)}</code></details><form method="post" action="/app/import/apply"><input type="hidden" name="fingerprint" value="${esc(p.fingerprint)}"><textarea hidden name="source">${esc(String(input.source))}</textarea><button>Approve import</button></form><p><a href="/app">Cancel</a></p></main></div>`)

   }
  } else if(action==='import/apply') {
   result=await applyMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source),String(input.fingerprint??''))
   notice='Import applied as an unpublished draft. Preview it before publishing.'
  } else if(action==='import/undo') {
   result=await undoMoveIn(env.DB,actor,String(input.job));notice='Import undone. The journal is retained.'
  } else if(action==='messages/erase') {
   const id=String(input.id??'')
   const wire=wireDatabase(env.DB)
   await wire.batch([
    ...await erasureStatements(wire,'pane_messages',{id}),
    ...await invalidateTransfersStatements(wire),
    wire.prepare('INSERT OR IGNORE INTO pane_erased_messages(id,created_at) VALUES(?,?)').bind(id,new Date().toISOString()),
    wire.prepare('DELETE FROM pane_messages WHERE id=?').bind(id),
   ]);result={erased:id};notice='Contact message erased. Its replay fence is retained.'
  } else return json({error:'Not found.'},404)
  return api?json(result):new Response(null,{status:303,headers:{location:'/app?notice='+encodeURIComponent(notice)}})
 } catch(error) {
  const message=error instanceof Error?error.message:'Request failed.'
  return json({error:message},400)
 }
}
