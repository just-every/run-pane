import { activePages, homeSlug } from './pages'
import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements, invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { dashboardData } from './data'
import { prepare, DraftConflict, publish, revision, slugs, normalizeSite, siteFromForm } from './content'
import { document, screens, workspace } from './views'
import { publicPage } from './public-view'
import { shell } from './ui/shell'
import { moveReview } from './ui/moves'
import { planMoveIn, applyMoveIn, undoMoveIn } from './imports'
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}})
export async function paneResponse(request:Request,original:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname,api=path.startsWith('/api/pane'),preview=path.startsWith('/preview/')
 if(path!=='/app'&&!path.startsWith('/app/')&&!api&&!preview)return null
 const env=runtimeBindings(original),canonical=new URL(env.AUTH_ORIGIN).origin
 if(request.method==='POST'&&(url.origin!==canonical||request.headers.get('Origin')!==canonical))return json({error:'Same-origin request required.'},403)
 const session=await operatorAuth(env).getSession(request)
 if(!session)return api?json({error:'Sign in required.'},401):new Response(null,{status:303,headers:{location:'/signin?returnTo='+encodeURIComponent(path)}})
 const actor=session.operator,owner=actor.role==='owner',editor=owner||actor.role==='admin'
 if(!['owner','admin','member'].includes(actor.role))return json({error:'Role has no access.'},403)
 try {
  if(preview) {
   if(!editor)return json({error:'An owner or admin must preview.'},403)
   const [, ,id,...parts]=path.split('/'),row=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
   if(!row)return json({error:'Preview not found.'},404)
   const site=revision(row).site,slug=parts.length ? decodeURIComponent(parts.join('/')) : homeSlug(site)!
   if(!activePages(site).some(page=>page.slug===slug))return json({error:'Preview not found.'},404)
   return document('Preview',publicPage(site,slug,'preview'),'site')
  }
  if(request.method==='GET') {
   const data=await dashboardData(env.DB,actor.displayName,actor.role)
   if(api&&path!=='/api/pane')return json({error:'Not found.'},404)
   if(api)return json(data)
   if(!screens[path])return json({error:'Not found.'},404)
   data.notice=url.searchParams.get('notice')??undefined
   return document(screens[path][1],workspace(data,path,url.searchParams.get('page')??'home'))
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  if(Number(request.headers.get('content-length')??0)>1200000)return json({error:'Input exceeds 1.2 MB.'},413)
  const input:Record<string,any>=request.headers.get('content-type')?.includes('application/json')?await request.json():Object.fromEntries(await request.formData())
  const action=api?path.slice('/api/pane/'.length):path.slice('/app/'.length)
  let result:unknown,notice='Saved.',back='/app'
  if(['publish','rollback','messages/erase'].includes(action)?!owner:!editor)return json({error:'Your role cannot perform this action.'},403)
  if(action==='prepare'||action==='autosave') {
   result=await prepare(env.DB,actor.id,input.site??await siteFromForm(env.DB,input), action==='autosave' ? String(input.base??'') : typeof input.base==='string' ? input.base : undefined)
   if(action==='autosave')return json(result)
   notice='Draft prepared. Preview it before publishing.'
   if(typeof input.slug==='string')back='/app?page='+encodeURIComponent(input.slug)
  } else if(action==='publish'||action==='rollback') {
   result=await publish(env.DB,actor.id,String(input.revision),action)
   notice=action==='publish'?'Published. Your approval is recorded.':'Rolled back. Your approval is recorded.'
   if(action==='rollback')back='/app/sites'
  } else if(action==='import/dry-run') {
   result=await planMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source))
   if(!api) {
    const site=normalizeSite(JSON.parse(String(input.source)))
    const data=await dashboardData(env.DB,actor.displayName,actor.role)
    return document('Review move-in',shell(data,'moves',moveReview(site,(result as {fingerprint:string}).fingerprint,String(input.source))))
   }
  } else if(action==='import/apply') {
   result=await applyMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source),String(input.fingerprint??''))
   notice='Import applied as an unpublished draft. Preview it before publishing.';back='/app/moves'
  } else if(action==='import/undo') {
   result=await undoMoveIn(env.DB,actor,String(input.job));notice='Import undone. The journal is retained.';back='/app/moves'
  } else if(action==='messages/erase') {
   const id=String(input.id??'')
   const wire=wireDatabase(env.DB)
   await wire.batch([
    ...await erasureStatements(wire,'pane_messages',{id}),
    ...await invalidateTransfersStatements(wire),
    wire.prepare('INSERT OR IGNORE INTO pane_erased_messages(id,created_at) VALUES(?,?)').bind(id,new Date().toISOString()),
    wire.prepare('DELETE FROM pane_messages WHERE id=?').bind(id),
   ]);result={erased:id};notice='Contact message erased. Its replay fence is retained.';back='/app/inquiries'
  } else return json({error:'Not found.'},404)
  return api?json(result):new Response(null,{status:303,headers:{location:back+(back.includes('?')?'&':'?')+'notice='+encodeURIComponent(notice)}})
 } catch(error) {
  if(error instanceof DraftConflict)return json({error:error.message,latest:error.latest},409)
  const message=error instanceof Error?error.message:'Request failed.'
  return json({error:message},400)
 }
}
