import {submissionCsv,submissionForms} from './submission-export'
import {collectionPrivateResponse} from './collection-handlers'
import {collectionPages} from './collection-page'
import {contentTrash,contentHistory,deleteContent,restoreContent} from './lifecycle-store'
import {trashScreen,historyScreen} from './ui/lifecycle'
import {commentAction,commentSettingsMarkup,moderationMarkup,authorCommentMarkup,commentList} from './comments'
import {templateSite} from './templates'
import {templateCatalog} from './ui/templates'
import {latestContent,ownPost,postView,PostDenied,savePost,publishPost} from './posts'
import {postForm} from './post-forms'
import {postsEditor} from './ui/posts'
import {uploadLibraryFile,publicLibraryFiles} from './library-files'
import {aiHistory,undoAiHistory} from './ai-history'
import {proposeAi,decideAi} from './ai'
import {canvasEditor} from './ui/canvas'
import { parseImportDocument } from './import-formats'
import { createComponent } from './components'
import { normalizeForms, privateFile } from './forms'
import { accessFromForm,isProtected } from './access'
import { changeRejected } from './rejected-content'
import { requestPageReview, publishPage } from './page-review'
import { findPersonData,erasePersonData,personEmail } from './privacy'
import { policyStarters } from './policies'
import { transferOwnership,revokeContributor } from './ownership'
import { liveCall } from './outage'
import { capabilities, permittedDashboard, visibleRevision, routeCapability, assignRoles, inviteRoles } from './roles'
import { apiIdentity, createToken } from './api-tokens'
import { activity, erasePerson } from './audit'
import { markReviewed } from './schedules'
import { activePages, homeSlug } from './pages'
import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements, invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { dashboardData } from './data'
import { prepare, DraftConflict, revokePublication, publish, revision, normalizeSite, siteFromForm } from './content'
import { document, screens, workspace } from './views'
import { publicPage } from './public-view'
import { shell } from './ui/shell'
import { moveReview, moveReport } from './ui/moves'
import { crawlChallenge, crawlSource } from './import-crawl'
import { planMoveIn, applyMoveIn, undoMoveIn, readMoveInReport } from './imports'
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
   const home=caps.includes('comments:moderate')?'/app/comments':caps.includes('posts:write')?'/app/posts':caps.includes('inbox:read')?'/app/inquiries':caps.includes('reports:read')?'/app/sites':null
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
  if(request.method==='GET'&&['/app/submissions/export','/api/pane/submissions/export'].includes(path))return await submissionCsv(env.DB,url.searchParams)
  const collectionReply=await collectionPrivateResponse(request,env,actor,!!scopes);if(collectionReply)return collectionReply
  if(request.method==='GET'&&['/app/content/trash','/api/pane/content/trash','/app/content/history','/api/pane/content/history'].includes(path)){
   const query=Object.fromEntries(url.searchParams),kind=query.kind??(caps.includes('pages:write')?'page':'post')
   const result=path.endsWith('/trash')?await contentTrash(env.DB,actor,kind,query.collection):await contentHistory(env.DB,actor,query)
   if(api)return json(result)
   const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
   if(!owner&&actor.role!=='admin'){data.team=[{name:actor.displayName,role:caps.includes('pages:write')?'editor':'author'}];data.people={}}
   data.notice=query.notice
   if('target' in result){
    return document('Content history',historyScreen(data,result.base,result.target,result.rows,query.revision,query.before,result.next))
   }
   return document('Trash',trashScreen(data,result.base,result.rows,kind as 'page'|'post'|'item',query.collection))
  }
  if(request.method==='GET'&&(path.startsWith('/app/files/')||path.startsWith('/api/pane/files/')))return privateFile(env.DB,decodeURIComponent(path.split('/').at(-1)!))
  if(request.method==='GET'&&['/app/posts','/app/posts/canvas'].includes(path)){
   const current=await latestContent(env.DB),data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
   if(current){
    const own=postView(current,actor.id,owner||actor.role==='admin')
    data.draft={...current,site:owner||actor.role==='admin'?current.site:{name:current.site.name,description:current.site.description,pages:[],blogs:current.site.blogs,blogPosts:current.site.blogPosts,posts:own.posts}}
   }
   const targetRow=await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
   if(data.draft&&!owner&&actor.role!=='admin'&&targetRow){const approved=revision(targetRow).site;data.draft.site.brand=approved.brand;data.draft.site.libraryFiles=publicLibraryFiles(approved)}
   const destinationSite=owner?current?.site:targetRow?revision(targetRow).site:null
   data.postDestinations=destinationSite?.pages.filter(page=>!page.deleted&&(owner||!page.hidden&&!isProtected(destinationSite,page))).map(page=>({id:page.id??page.slug,slug:page.slug,title:page.title}))??[]
   if(!owner&&actor.role!=='admin'){data.team=[{name:actor.displayName,role:'author'}];data.people={}}
   if(path.endsWith('/canvas')){
    if(!current)throw Error('Save a post first.')
    ownPost(current.site,url.searchParams.get('id'),actor.id,owner||actor.role==='admin')
    return document('Post body',canvasEditor(data,'',url.searchParams.get('id')??''),'site')
   }
   data.notice=url.searchParams.get('notice')??undefined
   const selected=url.searchParams.get('id')??''
   const settings=owner&&current?await commentSettingsMarkup(env.DB,current.site):''
   const replies=current&&selected?await authorCommentMarkup(env.DB,current.site,selected,actor.id,owner):''
   return document('Posts',shell(data,'posts',postsEditor(data,selected).replace('<details><summary>PDF library',settings+'<details><summary>PDF library')+replies))
  }
  if(request.method==='GET'&&['/app/comments','/api/pane/comments'].includes(path)){
   if(api)return json(await commentList(env.DB))
   const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
   return document('Comments',shell(data,'comments',await moderationMarkup(env.DB,url.searchParams.get('comment')??'')))
  }
  if(request.method==='GET'&&path==='/api/pane/posts')return json(postView(await latestContent(env.DB),actor.id,owner||actor.role==='admin'))
  if(request.method==='GET'&&path==='/api/pane/ai/history'){
   const post=url.searchParams.get('post')
   if(post||!editor){
    if(!caps.includes('posts:write'))return json({error:'Your role cannot assist with posts.'},403)
    const current=await latestContent(env.DB);if(!current)return json({error:'Save a post first.'},403)
    ownPost(current.site,post,actor.id,owner||actor.role==='admin')
   }
   return json(await aiHistory(env.DB,actor.id,!owner,post))
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
  if(preview) {
   if(!editor)return json({error:'An owner or admin must preview.'},403)
   const [, ,id,...parts]=path.split('/'),row=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
   if(!row)return json({error:'Preview not found.'},404)
   const site=revision(row).site,slug=parts.length ? decodeURIComponent(parts.join('/')) : homeSlug(site)!
   site.pages=[...site.pages,...collectionPages(site)]
   if(!activePages(site).some(page=>page.slug===slug))return json({error:'Preview not found.'},404)
   return document('Preview',publicPage(site,slug,'preview'),'site')
  }
  if(request.method==='GET' && ['/api/pane/activity','/api/pane/activity/export'].includes(path)) {
   if(!owner)return json({error:'Owner only.'},403)
   const rows=await activity(env.DB)
   return new Response(JSON.stringify(rows),{headers:{'content-type':'application/json','cache-control':'no-store',...(path.endsWith('/export')?{'content-disposition':'attachment; filename="pane-activity.json"'}:{})}})
  }
  if(request.method==='GET') {
   const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
   if(env.PANE_LIVE&&owner){const review=await env.PANE_LIVE.get(env.PANE_LIVE.idFromName('published-site')).fetch('https://pane.internal/review');Object.assign(data,await review.json())}
   if(path==='/app/templates'){if(!owner)return json({error:'Native owner only.'},403);return document('Templates',shell(data,'sites',templateCatalog(data)))}
   if(path==='/app/canvas')return document('Visual canvas',canvasEditor(data,url.searchParams.get('page')??''),'site')
   if(api&&path!=='/api/pane')return json({error:'Not found.'},404)
   if(api)return json(scopes?{role:actor.role,draft:data.draft?{id:data.draft.id}:null,live:data.live?{id:data.live.id}:null}:{...data,activity:undefined})
   if(!screens[path])return json({error:'Not found.'},404)
   if(path==='/app/inquiries')data.submissionForms=await submissionForms(env.DB,(data.live??data.draft)?.site)
   data.notice=url.searchParams.get('notice')??undefined
   return document(screens[path][1],workspace(data,path,url.searchParams.get('page')??''),'app',undefined,undefined,data.locale)
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  if(Number(request.headers.get('content-length')??0)>1800000)return json({error:'Input exceeds 1.8 MB.'},413)
  const formData=request.headers.get('content-type')?.includes('application/json')?null:await request.formData()
  const input:Record<string,any>=formData?Object.fromEntries(formData):await request.json()
  if(formData&&path.startsWith('/app/comments/')&&formData.has('ids'))input.ids=formData.getAll('ids')
  if(formData&&path==='/app/access')input.members=formData.getAll('members')
  const action=api?path.slice('/api/pane/'.length):path.slice('/app/'.length)
  let result:unknown,notice='Saved.',back='/app'
  const lifecycleAction=['/api/pane/content/delete','/app/content/delete','/api/pane/content/restore','/app/content/restore'].includes(path)
  if(!lifecycleAction&&(!routeCapability(path,'POST')||!caps.includes(routeCapability(path,'POST')!)))return json({error:'Your role cannot perform this action.'},403)
  if((!owner||scopes)&&['/api/pane/import/dry-run','/api/pane/import/apply','/app/import/dry-run','/app/import/apply'].includes(path)&&input.source){
   const imported=parseImportDocument(typeof input.source==='string'?input.source:JSON.stringify(input.source)).site
   if(imported?.customCode||imported?.pages.some(page=>page.customCode))return json({error:'Only a native owner authors custom code, including imports.'},403)
  }
  if(action.startsWith('comments/')){
   if(scopes)return json({error:'Native session required.'},403)
   const verb=action.slice(9)
   if(['settings','close'].includes(verb)&&!owner)return json({error:'Native owner only.'},403)
   const saved=await commentAction(env,actor,verb,input,caps.includes('comments:moderate'))
   if(api)return json(saved)
   return new Response(null,{status:303,headers:{location:verb==='reply'||verb==='settings'||verb==='close'?'/app/posts':'/app/comments','cache-control':'no-store'}})
  }
  if(path.endsWith('/posts/save')||path.endsWith('/posts/submit')){
   const current=await latestContent(env.DB)
   const fields=formData&&path.endsWith('/posts/save')&&current?postForm(current,actor.id,owner||actor.role==='admin',input):input
   const saved=postView(await savePost(env.DB,actor.id,fields,owner||actor.role==='admin',path.endsWith('/posts/submit')),actor.id,owner||actor.role==='admin')
   if(api||request.headers.get('Accept')?.includes('application/json'))return json(saved)
   const id=String(input.id??saved.posts.at(-1)?.id??'')
   return new Response(null,{status:303,headers:{location:'/app/posts?id='+encodeURIComponent(id)}})
  }
  if(lifecycleAction){
   const deleting=path.endsWith('/delete'),retained=deleting?await deleteContent(env.DB,actor,input):await restoreContent(env.DB,actor,input)
   result=editor?visibleRevision(retained,caps,actor):postView(retained,actor.id,false)
   notice=deleting?'Moved to trash as a draft. Owner publication is separate.':'Restored as a draft. Submit a restored post for owner review before publication.'
   back='/app/content/trash?kind='+encodeURIComponent(String(input.kind))+(input.kind==='item'?'&collection='+encodeURIComponent(String(input.collection)):'')
  }else if(['/api/pane/posts/publish','/app/posts/publish'].includes(path)){
   const selected={base:String(input.base),id:String(input.id),review:String(input.review)}
   result=env.PANE_LIVE?await liveCall(env,'/post-publish',{actor:{id:actor.id,role:actor.role},...selected}):await publishPost(env.DB,actor,selected)
   notice='Post published. Other private drafts are unchanged.';back='/app/posts?id='+encodeURIComponent(String(input.id))
  }else if(['/api/pane/blogs/save','/app/blogs/save'].includes(path)){
   if(!owner||scopes)return json({error:'Native owner only.'},403)
   const current=await latestContent(env.DB);if(!current)throw Error('Prepare the site first.')
   const blog={id:String(input.id),title:String(input.title),prefix:String(input.prefix),pageSize:Number(input.pageSize??10),comments:false}
   result=await prepare(env.DB,actor.id,{...current.site,blogs:[...(current.site.blogs??[]).filter(item=>item.id!==blog.id),blog]},String(input.base))
   notice='Blog settings saved as a draft.';back='/app/posts'
  }else if(['/api/pane/library/upload','/app/library/upload'].includes(path)){
   if(!owner||scopes)return json({error:'Native owner only.'},403)
   const file=formData?.get('file');if(!(file instanceof File))throw Error('Choose a PDF file.')
   result=await uploadLibraryFile(env.DB,actor.id,String(input.base),file);notice='PDF saved privately. Link it from a post for review.';back='/app/posts'
  }else if(action.startsWith('ai/')){
   const retained=path.endsWith('/ai/propose')?null:await env.DB.prepare('SELECT post_id,mode,suggestions FROM pane_ai_proposals WHERE id=? AND actor=?').bind(String(input.id??''),actor.id).first<{post_id:string|null;mode:string;suggestions:string}>()
   const post=path.endsWith('/ai/propose')?input.post:retained?.post_id
   if(post&&(path.endsWith('/ai/propose')?input.mode:retained?.mode)==='search')return json({error:'Post assistance supports writing, image descriptions and separate translated drafts.'},403)
   if(post||!editor){
    if(!post||!caps.includes('posts:write')||input.post!==post)return json({error:'Choose a post within your current content permissions.'},403)
    const current=await latestContent(env.DB);if(!current)return json({error:'Save a post first.'},403)
    ownPost(current.site,post,actor.id,owner||actor.role==='admin')
   }
   // Route capabilities admit native page writers and own-post authors. Authority is
   // checked from retained metadata, never the caller's claimed operation.
   if(!owner){
    const proposal=retained
    const mode=path.endsWith('/ai/propose')?input.mode:proposal?.mode
    if(!['rewrite','shorten','tone','alt','translate'].includes(mode))return json({error:'Page writers may use writing assistance on their own proposals. Search review requires the owner.'},403)
    // Duplicating owner-authored executable code is outside an editor's grant.
    if(mode==='translate'&&!post){
     const source=path.endsWith('/ai/propose')?await env.DB.prepare('SELECT site FROM pane_revisions WHERE id=?').bind(String(input.base??'')).first<{site:string}>():null
     if((source&&JSON.parse(source.site).pages.some((page:{slug:string;customCode?:unknown})=>page.slug===input.slug&&page.customCode))||(proposal&&JSON.parse(proposal.suggestions).some((item:{page?:{customCode?:unknown}})=>item.page?.customCode)))return json({error:'Only the owner may duplicate a page containing custom code.'},403)
    }
   }
   result=path.endsWith('/ai/propose')?await proposeAi(env,actor.id,input):path.endsWith('/ai/decide')?await decideAi(env,actor.id,input):path.endsWith('/ai/undo')?await undoAiHistory(env,actor.id,input):undefined
   if(!result)return json({error:'Not found.'},404)
   if(typeof result==='object'&&'revision' in result)result={...result,revision:!editor?postView(result.revision as import('./model').Revision,actor.id,false):visibleRevision(result.revision as import('./model').Revision,caps,actor)}
   return json(result)
  }else if(action==='templates/start'){
   if(!owner||scopes)return json({error:'Native owner only.'},403)
   const site=templateSite(input.template,input.name)
   // Empty-base compare is atomic: two template choices cannot overwrite one another.
   result=await prepare(env.DB,actor.id,site,'');notice='Template saved as an unpublished draft. Edit every page before publishing.';back='/app'
  }else if(action==='component-create'){
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   if(!row)throw Error('Prepare a site first.')
   result=await prepare(env.DB,actor.id,createComponent(revision(row).site,String(input.slug),String(input.section),String(input.componentName)),String(input.base??''));notice='Reusable section saved.';back='/app?page='+encodeURIComponent(String(input.slug))
  }else if(action==='forms'){
   if(!owner||scopes)return json({error:'Native owner only.'},403)
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   if(!row)throw Error('Prepare a site first.')
   const site=revision(row).site,id=String(input.formId||crypto.randomUUID())
   const form=normalizeForms([{id,name:input.formName,submit:input.submitLabel,confirmation:input.confirmation,redirect:input.redirect||undefined,fields:JSON.parse(String(input.fields))}])![0]
   result=await prepare(env.DB,actor.id,{...site,forms:[...(site.forms??[]).filter(form=>form.id!==id),form]},String(input.base??''));notice='Form draft saved. Choose its page placements, then publish.';back='/app/sites'
  }else if(action==='access'){
   if(!owner||scopes)return json({error:'Native owner only.'},403)
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   if(!row)throw Error('Prepare a site first.')
   const form=await accessFromForm(revision(row).site,input)
   result=await prepare(env.DB,actor.id,form,String(input.base??''));notice='Access draft saved. Publish to apply it.';back='/app/sites'
  }else if(action.startsWith('spam/')){
   if(!owner)return json({error:'Owner only.'},403)
   result=await changeRejected(env.DB,action.slice(5),input);notice='Spam review updated.';back='/app/inquiries'
  }else if(['privacy/find','privacy/export','privacy/erase'].includes(action)){
   const email=personEmail(input.email)
   const privacyActor:{id:string;version:number;sessionId?:string}={id:actor.id,version:actor.version}
   if(action!=='privacy/find'){const proof=await operatorAuth(env).requireStepUp(request,action==='privacy/export'?'export':'delete');privacyActor.sessionId=proof.id}
   result=env.PANE_LIVE?await liveCall(env,action==='privacy/erase'?'/privacy/erase':'/privacy/find',{email,confirm:input.confirm,actor:privacyActor}):action==='privacy/erase'?await erasePersonData(env.DB,email,input.confirm,privacyActor):await findPersonData(env.DB,email)
   if(action==='privacy/export')return new Response(JSON.stringify(result,null,2),{headers:{'content-type':'application/json','content-disposition':'attachment; filename="pane-person.json"','cache-control':'no-store'}})
   if(action==='privacy/find'&&!api){const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor);data.privacyRequest=result as import('./privacy').PersonPrivacy;return document('Person privacy request',workspace(data,'/app/inquiries',''))}
   notice='Person data erased. Backup and replay fences are retained; follow up with the listed downstream services.';back='/app/inquiries'
  }else if(action==='ownership/transfer'){
   result=await transferOwnership(env,request,input);notice='Ownership transferred. Sign in again as an editor.';back='/signin?returnTo=%2Fapp'
  }else if(action==='team/revoke'){
   result=await revokeContributor(env,request,input);notice='Contributor access revoked.';back='/app/sites'
  }else if(action==='policies/generate'){
   const row=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   if(!row)throw Error('Prepare a site first.')
   result=await prepare(env.DB,actor.id,policyStarters(revision(row).site,env,!!await env.DB.prepare('SELECT 1 FROM pane_comment_settings WHERE enabled=1').first()),String(input.base??''));notice='Policy starters prepared. Review and edit before publishing.';back='/app?page=privacy-policy'
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
   const currentAccess=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   const previousAccess=currentAccess?revision(currentAccess).site:null
   if((!caps.includes('collections:write')||scopes)&&input.site?.collections!==undefined&&JSON.stringify(input.site.collections)!==JSON.stringify(previousAccess?.collections))return json({error:'Your grants do not allow collection draft changes.'},403)
   if((!caps.includes('collections:write')||scopes)&&input.site)input.site={...input.site,collections:previousAccess?.collections}
   if(!owner&&actor.role!=='admin'&&input.site?.posts!==undefined)return json({error:'Your role cannot change posts.'},403)
   if(!owner&&input.site&&['blogs','libraryFiles','blogPosts'].some(key=>input.site[key]!==undefined&&JSON.stringify(input.site[key]??null)!==JSON.stringify(previousAccess?.[key as keyof typeof previousAccess]??null)))return json({error:'Only the native owner can change blog settings or the file library.'},403)
   if(input.site)input.site={...input.site,blogPosts:previousAccess?.blogPosts,...(!owner?{blogs:previousAccess?.blogs,libraryFiles:previousAccess?.libraryFiles}:{})}
   const proposed=normalizeSite(input.site?{...input.site,...(!owner&&actor.role!=='admin'&&previousAccess?.posts?{posts:previousAccess.posts}:{})}:await siteFromForm(env.DB,input))
   if((!owner||scopes)&&(JSON.stringify(proposed.customCode??null)!==JSON.stringify(previousAccess?.customCode??null)||proposed.pages.some(page=>JSON.stringify(page.customCode??null)!==JSON.stringify(previousAccess?.pages.find(old=>(old.id??old.slug)===(page.id??page.slug))?.customCode??null))))return json({error:'Only the owner authors custom code.'},403)
   if(!owner&&(JSON.stringify(proposed.forms??null)!==JSON.stringify(previousAccess?.forms??null)||JSON.stringify(proposed.access??null)!==JSON.stringify(previousAccess?.access??null)||proposed.pages.some(page=>JSON.stringify(page.access??null)!==JSON.stringify(previousAccess?.pages.find(old=>(old.id??old.slug)===(page.id??page.slug))?.access??null))))return json({error:'Only the owner changes access.'},403)
   if(!caps.includes('settings:write')){
    const latest=await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
    const current=latest?revision(latest).site:null
    if(latest&&input.base!==latest.id)throw new DraftConflict(latest?revision(latest):null)
    for(const key of ['posts','blogs','libraryFiles','brand','promotion','locale','automations','goals','analyticsCampaigns','analytics','responseDays','robots'] as const)if(JSON.stringify(proposed[key]??null)!==JSON.stringify(current?.[key]??null))return json({error:'Only owners and admins can change business settings.'},403)
   }
   result=await prepare(env.DB,actor.id,proposed, action==='autosave' ? String(input.base??'') : typeof input.base==='string' ? input.base : undefined)
   if(action==='autosave')return json(visibleRevision(result as import('./model').Revision,caps,actor))
   notice='Draft prepared. Preview it before publishing.'
   if(typeof input.slug==='string')back='/app?page='+encodeURIComponent(input.slug)
  } else if(action==='page-request-review') {
   result=await requestPageReview(env.DB,actor.id,String(input.base??''),String(input.page??''));notice='Page sent for review.';back='/app?page='+encodeURIComponent(String(input.slug??''))
  } else if(action==='page-publish') {
   result=env.PANE_LIVE?await liveCall(env,'/page-publish',{actor:actor.id,base:String(input.base??''),page:String(input.page??''),request:String(input.request??'')}):await publishPage(env.DB,actor.id,String(input.base??''),String(input.page??''),String(input.request??''));notice='Selected page published. Other drafts are kept.';back='/app?page='+encodeURIComponent(String(input.slug??''))
  } else if(action==='publication-revoke') {
   result=env.PANE_LIVE?await liveCall(env,'/revoke',{actor:actor.id,id:String(input.revision),confirm:input.confirm}):await revokePublication(env.DB,actor.id,String(input.revision),input.confirm)
   notice='Approval revoked. The published site is down.';back='/app/sites'
  } else if(action==='publish'||action==='rollback') {
   result=env.PANE_LIVE?await liveCall(env,'/publish',{actor:actor.id,id:String(input.revision),action}):await publish(env.DB,actor.id,String(input.revision),action)
   notice=action==='publish'?'Published. Your approval is recorded.':'Rolled back. Your approval is recorded.'
   if(action==='rollback')back='/app/sites'
  } else if(action==='review') {
   const live = await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
   const id=String(input.page??'')
   if(!live || !activePages(revision(live).site).some(page=>(page.id??page.slug)===id))throw Error('Published page not found.')
   await markReviewed(env.DB,id,actor.id,Date.now());result={reviewed:id};notice='Page review recorded.';back='/app/sites'
  } else if(action==='import/crawl-challenge'||action==='import/crawl') {
   if(scopes)return json({error:'Use a native owner or admin session to authorize an outbound crawl.'},403)
   const current=await env.DB.prepare('SELECT version FROM oa_operators WHERE id=?').bind(actor.id).first<{version:number}>()
   if(!current)throw Error('Active operator required.')
   const identity={id:actor.id,role:actor.role,version:current.version}
   if(action==='import/crawl-challenge')result=await crawlChallenge(env,identity,input)
   else {const captured=await crawlSource(env,identity,input);result={...captured,plan:await planMoveIn(env.DB,actor,captured.source)}}
  } else if(action==='import/dry-run') {
   if(input.job){
    const saved=await readMoveInReport(env.DB,actor,String(input.job))
    if(api)return json(saved)
    const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
    return document('Migration report',shell(data,'moves','<div class="screen-head"><div><h1>Your migration report</h1><p>Rechecked from the retained source against the imported draft.</p></div></div>'+moveReport(saved.report)+'<p><a class="text-link" href="/app/moves">Back to Moves</a></p>'))
   }
   result=await planMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source))
   if(!api) {
    const site=(result as Awaited<ReturnType<typeof planMoveIn>>).site
    const data=permittedDashboard(await dashboardData(env.DB,actor.displayName,actor.role,actor.id),caps,actor)
    return document('Review move-in',shell(data,'moves',moveReview(site,(result as {fingerprint:string}).fingerprint,String(input.source),(result as Awaited<ReturnType<typeof planMoveIn>>).report)))
   }
  } else if(action==='import/apply') {
   result=await applyMoveIn(env.DB,actor,typeof input.source==='string'?input.source:JSON.stringify(input.source),String(input.fingerprint??''))
   notice=(result as Awaited<ReturnType<typeof applyMoveIn>>).report.counts.page.planned ? 'Import applied as an unpublished draft. Preview it before publishing.' : 'Import inventory recorded. No supported pages were imported.';back='/app/moves'
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
   const files=(await env.DB.prepare('SELECT id FROM pane_files WHERE message_id=?').bind(id).all<{id:string}>()).results
   const chunks=(await env.DB.prepare('SELECT id FROM pane_file_chunks WHERE file_id IN (SELECT id FROM pane_files WHERE message_id=?)').bind(id).all<{id:string}>()).results
   const fileFences=[]
   for(const file of files)fileFences.push(...await erasureStatements(wire,'pane_files',{id:file.id}))
   for(const chunk of chunks)fileFences.push(...await erasureStatements(wire,'pane_file_chunks',{id:chunk.id}))
   await wire.batch([
    ...fileFences,
    ...await erasureStatements(wire,'pane_messages',{id}),
    ...await invalidateTransfersStatements(wire),
    wire.prepare('INSERT OR IGNORE INTO pane_erased_messages(id,created_at) VALUES(?,?)').bind(id,new Date().toISOString()),
    wire.prepare('DELETE FROM pane_messages WHERE id=?').bind(id),
   ]);result={erased:id};notice='Contact message erased. Its replay fence is retained.';back='/app/inquiries'
  } else return json({error:'Not found.'},404)
  if(result&&typeof result==='object'&&'site' in result)result=visibleRevision(result as import('./model').Revision,caps,actor)
  return api?json(result):new Response(null,{status:303,headers:{location:back+(back.includes('?')?'&':'?')+'notice='+encodeURIComponent(notice)}})
 } catch(error) {
  if(error instanceof PostDenied)return json({error:error.message},403)
  if(error instanceof DraftConflict)return json({error:error.message,latest:!editor?postView(error.latest,actor.id,false):visibleRevision(error.latest,caps,actor)},409)
  const message=error instanceof Error?error.message:'Request failed.'
  return json({error:message},400)
 }
}
