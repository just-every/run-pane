import { findPersonData,erasePersonData,personEmail } from './privacy'
import { policyStarters } from './policies'
import { transferOwnership,revokeContributor } from './ownership'
import { liveCall } from './outage'
import { capabilities, permittedDashboard, routeCapability, assignRoles, inviteRoles } from './roles'
import { apiIdentity, createToken } from './api-tokens'
import { activity, erasePerson } from './audit'
import { markReviewed } from './schedules'
import { activePages, homeSlug } from './pages'
import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements, invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { dashboardData } from './data'
import { prepare, DraftConflict, publish, revision, normalizeSite, siteFromForm } from './content'
import { document, screens, workspace } from './views'
import { publicPage } from './public-view'
import { shell } from './ui/shell'
import { moveReview } from './ui/moves'
import { planMoveIn, applyMoveIn, undoMoveIn } from './imports'
import { replyToInquiry } from './inquiry-replies'
import { updateInquiry } from './followups'
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}})
export async function paneResponse(request:Request,original:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname,api=path==='/api/pane'||path.startsWith('/api/pane/'),preview=path.startsWith('/preview/')
 if(path!=='/app'&&!path.startsWith('/app/')&&!api&&!preview)return null
 const env=runtimeBindings(original),canonical=new URL(env.AUTH_ORIGIN).origin
 if(url.origin!==canonical || (request.headers.get('Host')&&request.headers.get('Host')!==new URL(canonical).host))return json({error:'Canonical host required.'},403)
 if(request.method==='POST'&&request.headers.get('Origin')!==canonical)return json({error:'Same-origin request required.'},403)
 const session=api?await apiIdentity(request,env):await operatorAuth(env).getSession(request)
 if(!session)return api?json({error:'Sign in required.'},401):new Response(null,{status:303,headers:{location:'/signin?returnTo='+encodeURIComponent(path)}})
 const actor=session.operator,owner=actor.role==='owner',caps=await capabilities(env.DB,actor),editor=caps.includes('pages:write')
 if(!['owner','admin','member'].includes(actor.role))return json({error:'Role has no access.'},403)
 try {
  if(path==='/app'&&request.method==='GET'&&!caps.includes('pages:read')){
   const home=caps.includes('inbox:read')?'/app/inquiries':caps.includes('reports:read')?'/app/sites':null
   if(home)return new Response(null,{status:303,headers:{location:home}})
  }
  const requiredCapability=routeCapability(path,request.method)
  if(requiredCapability&&!caps.includes(requiredCapability))return json({error:'Your role cannot perform this action.'},403)
  if(path==='/app/sites'&&!caps.includes('pages:read')&&!caps.includes('reports:read'))return json({error:'Your role cannot read this screen.'},403)
  const scopes='scopes' in session?session.scopes:undefined
  if(scopes){
   const required=request.method==='GET'?({'/api/pane':'status:read','/api/pane/pages':'pages:read','/api/pane/collections':'collections:read'} as Record<string,string>)[path]:
    path==='/api/pane/prepare'||path==='/api/pane/autosave'?'draft:write':path.startsWith('/api/pane/import/')?'imports:write':undefined
   if(!required||!scopes.includes(required))return json({error:'Token scope refused.'},403)
  }
  if(request.method==='GET'&&path==='/api/pane/roles')return json((await env.DB.prepare('SELECT o.id,o.display_name,o.role,o.status,r.roles FROM oa_operators o LEFT JOIN pane_roles r ON r.operator_id=o.id ORDER BY o.created_at,o.id').all()).results)
  if(request.method==='GET'&&path==='/api/pane/tokens'){
   if(!owner)return json({error:'Owner only.'},403)
   return json((await env.DB.prepare('SELECT id,name,operator_id,scopes,created_at,expires_at,revoked_at FROM pane_api_tokens ORDER BY created_at,id').all()).results)
  }
  if(request.method==='GET'&&path==='/api/pane/pages'){
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   return json({revision:row?.id??null,pages:row?activePages(revision(row).site):[]})
  }
  if(request.method==='GET'&&path==='/api/pane/collections')return json({error:'Collections await CMS-001.'},501)
  if(preview) {
   if(!editor)return json({error:'An owner or admin must preview.'},403)
   const [, ,id,...parts]=path.split('/'),row=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
   if(!row)return json({error:'Preview not found.'},404)
   const site=revision(row).site,slug=parts.length ? decodeURIComponent(parts.join('/')) : homeSlug(site)!
   if(!activePages(site).some(page=>page.slug===slug))return json({error:'Preview not found.'},404)
   return document('Preview',publicPage(site,slug,'preview'),'site')
  }
  if(request.method==='GET' && ['/api/pane/activity','/api/pane/activity/export'].includes(path)) {
   if(!owner)return json({error:'Owner only.'},403)
   const rows=await activity(env.DB)
   return new Response(JSON.stringify(rows),{headers:{'content-type':'application/json','cache-control':'no-store',...(path.endsWith('/export')?{'content-disposition':'attachment; filename="pane-activity.json"'}:{})}})
  }
  if(request.method==='GET') {
   const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps)
   if(env.PANE_LIVE&&['owner','admin'].includes(actor.role)){const review=await env.PANE_LIVE.get(env.PANE_LIVE.idFromName('published-site')).fetch('https://pane.internal/review');Object.assign(data,await review.json())}
   if(api&&path!=='/api/pane')return json({error:'Not found.'},404)
   if(api)return json(scopes?{role:actor.role,draft:data.draft?{id:data.draft.id}:null,live:data.live?{id:data.live.id}:null}:{...data,activity:undefined})
   if(!screens[path])return json({error:'Not found.'},404)
   data.notice=url.searchParams.get('notice')??undefined
   return document(screens[path][1],workspace(data,path,url.searchParams.get('page')??''))
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  if(Number(request.headers.get('content-length')??0)>1200000)return json({error:'Input exceeds 1.2 MB.'},413)
  const input:Record<string,any>=request.headers.get('content-type')?.includes('application/json')?await request.json():Object.fromEntries(await request.formData())
  const action=api?path.slice('/api/pane/'.length):path.slice('/app/'.length)
  let result:unknown,notice='Saved.',back='/app'
  if(!routeCapability(path,'POST')||!caps.includes(routeCapability(path,'POST')!))return json({error:'Your role cannot perform this action.'},403)
  if(['privacy/find','privacy/export','privacy/erase'].includes(action)){
   const email=personEmail(input.email)
   const privacyActor:{id:string;version:number;sessionId?:string}={id:actor.id,version:actor.version}
   if(action!=='privacy/find'){const proof=await operatorAuth(env).requireStepUp(request,action==='privacy/export'?'export':'delete');privacyActor.sessionId=proof.id}
   result=env.PANE_LIVE?await liveCall(env,action==='privacy/erase'?'/privacy/erase':'/privacy/find',{email,confirm:input.confirm,actor:privacyActor}):action==='privacy/erase'?await erasePersonData(env.DB,email,input.confirm,privacyActor):await findPersonData(env.DB,email)
   if(action==='privacy/export')return new Response(JSON.stringify(result,null,2),{headers:{'content-type':'application/json','content-disposition':'attachment; filename="pane-person.json"','cache-control':'no-store'}})
   if(action==='privacy/find'&&!api){const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps);data.privacyRequest=result as import('./privacy').PersonPrivacy;return document('Person privacy request',workspace(data,'/app/inquiries',''))}
   notice='Person data erased. Backup and replay fences are retained; follow up with the listed downstream services.';back='/app/inquiries'
  }else if(action==='ownership/transfer'){
   result=await transferOwnership(env,request,input);notice='Ownership transferred. Sign in again as an editor.';back='/signin?returnTo=%2Fapp'
  }else if(action==='team/revoke'){
   result=await revokeContributor(env,request,input);notice='Contributor access revoked.';back='/app/sites'
  }else if(action==='policies/generate'){
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   if(!row)throw Error('Prepare a site first.')
   result=await prepare(env.DB,actor.id,policyStarters(revision(row).site,env),String(input.base??''));notice='Policy starters prepared. Review and edit before publishing.';back='/app?page=privacy-policy'
  }else if(action==='roles/invite') {
   result=await inviteRoles(env,request,actor.id,input)
  } else if(action==='roles/set') {
   result=await assignRoles(env.DB,actor.id,input)
  } else if(action==='tokens/create') {
   if('kind' in session && ['dev','review'].includes(session.kind))return json({error:'Use a native owner sign-in to create persistent tokens.'},403)
   result=await createToken(env.DB,actor.id,input)
  } else if(action==='tokens/revoke') {
   await env.DB.prepare('UPDATE pane_api_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE id=?').bind(Date.now(),String(input.id??'')).run();result={revoked:true}
  } else if(action==='prepare'||action==='autosave') {
   const proposed=normalizeSite(input.site??await siteFromForm(env.DB,input))
   if(!caps.includes('settings:write')){
    const latest=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
    const current=latest?revision(latest).site:null
    if(latest&&input.base!==latest.id)throw new DraftConflict(latest?revision(latest):null)
    for(const key of ['automations','goals','analyticsCampaigns','analytics','responseDays','robots'] as const)if(JSON.stringify(proposed[key]??null)!==JSON.stringify(current?.[key]??null))return json({error:'Only owners and admins can change business settings.'},403)
   }
   result=await prepare(env.DB,actor.id,proposed, action==='autosave' ? String(input.base??'') : typeof input.base==='string' ? input.base : undefined)
   if(action==='autosave')return json(result)
   notice='Draft prepared. Preview it before publishing.'
   if(typeof input.slug==='string')back='/app?page='+encodeURIComponent(input.slug)
  } else if(action==='publish'||action==='rollback') {
   result=env.PANE_LIVE?await liveCall(env,'/publish',{actor:actor.id,id:String(input.revision),action}):await publish(env.DB,actor.id,String(input.revision),action)
   notice=action==='publish'?'Published. Your approval is recorded.':'Rolled back. Your approval is recorded.'
   if(action==='rollback')back='/app/sites'
  } else if(action==='review') {
   const live = await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
   const id=String(input.page??'')
   if(!live || !activePages(revision(live).site).some(page=>(page.id??page.slug)===id))throw Error('Published page not found.')
   await markReviewed(env.DB,id,actor.id,Date.now());result={reviewed:id};notice='Page review recorded.';back='/app/sites'
  } else if(action==='import/dry-run') {
   result=await planMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source))
   if(!api) {
    const site=normalizeSite(JSON.parse(String(input.source)))
    const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps)
    return document('Review move-in',shell(data,'moves',moveReview(site,(result as {fingerprint:string}).fingerprint,String(input.source))))
   }
  } else if(action==='import/apply') {
   result=await applyMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source),String(input.fingerprint??''))
   notice='Import applied as an unpublished draft. Preview it before publishing.';back='/app/moves'
  } else if(action==='import/undo') {
   result=await undoMoveIn(env.DB,actor,String(input.job));notice='Import undone. The journal is retained.';back='/app/moves'
  } else if(action==='messages/reply') {
   result=await replyToInquiry(env,actor.id,input);notice='Reply recorded. Check its delivery status below.';back='/app/inquiries'
  } else if(action==='messages/update') {
   const live=await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
   result=await updateInquiry(env.DB,input,live?revision(live).site:null);notice='Enquiry updated.';back='/app/inquiries'
  } else if(action==='people/erase') {
   result=await erasePerson(env.DB,String(input.id??''),input.confirm);notice='Person erased and activity attribution anonymized.'
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
