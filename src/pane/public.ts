import {pageHtmlPolicySource} from './html-blocks'
import {submissionRecord,enquiryStatement,type Submission} from './submission-export'
import {collectionResponse} from './collection-public'
import {submitComment,likePost} from './comments'
import {preparedImageResponse} from './image-response'
import {tags,tagSource,tagSources} from './tags'
import {blogResponse} from './blog-public'
import {blogPostPath} from './post-links'
import { customCodeSource, codeConfirmation } from './custom-code'
import { typedForm,validateForm,boundedForm,uploadStatements,type Upload,type SiteForm } from './forms'
import type { Site,Page } from './model'
import { accessResponse, pageRules } from './access'
import { promotionMarkup } from './promotions'
import { liveCall, liveSnapshot } from './outage'
import { rejectForm, verifyForm,limited,contactLimited,visitor } from './form-protection'
import { activeBanners } from './schedules'
import { escape } from './ui/kit'
import { activePages, homeSlug, pagePath } from './pages'
import { visitDimensions } from './visit-dimensions'
import { recordGoal } from './goal-data'
import { followUpDue } from './followups'
import { deliverAcknowledgment } from './acknowledgment'
import { pageEmbedOrigins } from './embeds'
import { runtimeBindings, type Bindings } from '../auth.server'
import { slugs, revision } from './content'
import { document } from './views'
import { publicPage } from './public-view'
import { siteSearch } from './site-search'
const json = (v:unknown,status=200) => Response.json(v,{status,headers:{'cache-control':'no-store'}})
const notFound = () => document('Not found','<div class="public-site"><div class="public-shell"><main class="public-main" id="main"><h1>Page not found</h1><p><a href="/site">Back to the home page</a></p></main></div></div>','site').then(r=>new Response(r.body,{status:404,headers:r.headers}))
const optedOut=(request:Request)=>request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1'
const hasGridForm=(site:Site,page:Page,slug:string)=>page.sections?.some(section=>section.blocks.some(block=>block.kind==='form'&&!!block.form&&!!typedForm(site,slug,block.form)))??false
/** Append the provider to its own directives, preserving every existing embed origin. */
function formHeaders(headers:Headers){
 const directives=(headers.get('content-security-policy')??'').split(';').map(part=>part.trim().split(/\s+/)).filter(parts=>parts[0])
 for(const name of ['script-src','connect-src','frame-src']){
  let directive=directives.find(parts=>parts[0]===name)
  if(!directive){directive=[name,...(directives.find(parts=>parts[0]==='default-src')?.slice(1)??[])];directives.push(directive)}
  const sources=directive.slice(1).filter(source=>source!=="'none'")
  directive.splice(1,directive.length-1,...new Set([...sources,'https://challenges.cloudflare.com']))
 }
 headers.set('content-security-policy',directives.map(parts=>parts.join(' ')).join('; '))
 headers.set('vary','Cookie');headers.set('cache-control','private, no-store')
 return headers
}
function sentNotice(site:Site,page:Page,slug:string,url:URL){
 if(!url.searchParams.has('sent'))return ''
 const requested=url.searchParams.get('_pane_form'),form=requested===null?typedForm(site,slug):typedForm(site,slug,requested)
 if(!form&&(requested!==null||page.kind!=='contact'&&slug!=='contact'))return ''
 return '<div class="public-site public-sent"><div class="public-shell"><p class="notice" role="status">'+escape(form?.confirmation??'Thank you. Your message has been received.')+'</p></div></div>'
}
function formConfirmation(site:Site,slug:string,form?:SiteForm){
 const location=codeConfirmation(site,slug,form?.redirect)
 return form&&!form.redirect&&form.id!==typedForm(site,slug)?.id?location+'&_pane_form='+encodeURIComponent(form.id):location
}
export async function publicResponse(request:Request,original:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname
 if(path !== '/site' && !path.startsWith('/site/')) return null
 const env=runtimeBindings(original),canonical=new URL(env.AUTH_ORIGIN).origin
 if(request.method==='POST'&&(url.origin!==canonical||request.headers.get('Origin')!==canonical))return json({error:'Same-origin request required.'},403)
 let slug: string
 try {slug=path==='/site'?'':decodeURIComponent(path.slice(6))} catch {return notFound()}
 const snapshot=env.PANE_LIVE?await liveSnapshot(env):null
 const row=env.PANE_LIVE?snapshot:await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
 if(!row&&(url.searchParams.has('pane-image')||url.searchParams.has('pane-brand')))return new Response(null,{status:404,headers:{'cache-control':'private, no-store'}})
 if(!row && path !== '/site' && !slugs.includes(slug) && slug !== 'search') return notFound()
 if(!row) return document('Website not published','<div class="public-site"><div class="public-shell"><main class="public-main" id="main"><h1>This website is getting ready</h1><p>The business has not published its first version.</p></main></div></div>','site')
 const site=snapshot?snapshot.site:revision(row).site
 if (!slug) slug=homeSlug(site)!
 const selectedPage=activePages(site).find(page=>page.slug===slug)
 const gate=await accessResponse(request,env,site,selectedPage)
 if(gate)return gate
 if(request.method==='POST'&&url.searchParams.has('unlock'))return new Response(null,{status:303,headers:{location:path,'cache-control':'private, no-store'}})
 const redirect=site.redirects?.find(redirect=>redirect.from===path)
 if (redirect && ['GET','HEAD'].includes(request.method)) return new Response(null,{status:redirect.status,headers:{location:redirect.to,'cache-control':'no-store'}})
 const approvedPost=site.blogPosts?.find(post=>blogPostPath(site,post)===path)
 if(approvedPost&&request.method==='POST'&&url.searchParams.has('like'))return likePost(request,env,site,approvedPost.id)
 const page=activePages(site).find(page=>page.slug===slug)??approvedPost?.content
 if(url.searchParams.has('pane-brand')){
  const key=url.searchParams.get('pane-brand'),image=key&&['logo','favicon','social'].includes(key)?site.brand?.[key as keyof NonNullable<typeof site.brand>]:undefined
  if(!image||!['GET','HEAD'].includes(request.method))return new Response(null,{status:404,headers:{'cache-control':'private, no-store'}})
  const bytes=Uint8Array.from(atob(image.src.split(',')[1]),c=>c.charCodeAt(0))
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':'image/png','content-length':String(bytes.length),'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'}})
 }
 const collection=await collectionResponse(request,site);if(collection)return collection
 if(url.searchParams.has('pane-image')){
  if(!['GET','HEAD'].includes(request.method)||!page)return new Response(null,{status:404})
  const [blockId,assetId]=(url.searchParams.get('pane-image')??'').split(':')
  const block=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===blockId)
  const image=assetId&&block?.gallery?.items.some(item=>item.asset===assetId)?site.media?.find(asset=>asset.id===assetId)?.image:block?.image
  return preparedImageResponse(image,url.searchParams.get('width'),request.method==='HEAD')
 }

 const legacyForm=typedForm(site,slug),gridForm=!!page&&hasGridForm(site,page,slug),hasForm=!!legacyForm||gridForm,legacyContact=!!page&&(page.kind==='contact'||slug==='contact')
 const blog=await blogResponse(request,site,env)
 if(blog){
  if(!approvedPost||!hasForm||url.searchParams.has('featured'))return blog
  const headers=formHeaders(new Headers(blog.headers))
  if(request.method==='HEAD')return new Response(null,{status:blog.status,headers})
  // Published posts use their blog shell; supply its public verification key and notice here.
  const body=(await blog.text()).replace(/(<form\b[^>]*\bdata-turnstile-key=")[^"]*(")/g,(_match,start,end)=>start+escape(env.TURNSTILE_SITE_KEY??'')+end).replace('<div class="public-site">',sentNotice(site,page!,slug,url)+'<div class="public-site">')
  return new Response(body,{status:blog.status,headers})
 }

 if(path==='/site/visit' && request.method==='POST') {
  if(optedOut(request))return new Response(null,{status:204})
  const body=await request.json() as Record<string,unknown>
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.path!=='string'||!activePages(site).some(page=>page.slug===body.path))return json({error:'Unknown page.'},400)
  if(await limited(env.DB,'visits',300))return new Response(null,{status:429})
  const dimensions=visitDimensions(request,body,site.analyticsCampaigns)
  await env.DB.prepare('INSERT INTO pane_visits(day,path,source,device,country,region,campaign,referrer,medium,campaign_source,count) VALUES(?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(day,path,source,device,country,region,campaign,referrer,medium,campaign_source) DO UPDATE SET count=count+1').bind(new Date().toISOString().slice(0,10),body.path,dimensions.source,dimensions.device,dimensions.country,dimensions.region,dimensions.campaign,dimensions.referrer,dimensions.medium,dimensions.campaignSource).run()
  return new Response(null,{status:204})
 }
 if(path==='/site/visit/goal' && request.method==='POST') {
  if(optedOut(request))return new Response(null,{status:204})
  const body=await request.json().catch(()=>null) as Record<string,unknown>
  const goal=body&&typeof body==='object'&&!Array.isArray(body)?site.goals?.find(goal=>goal.id===body.goal):undefined
  if(!goal||goal.type==='form'||typeof body.path!=='string'||(goal.page&&goal.page!==body.path)||!activePages(site).some(page=>page.slug===body.path))return json({error:'Unknown goal.'},400)
  if(await limited(env.DB,'goals',300))return new Response(null,{status:429})
  await recordGoal(env.DB,goal.id,body.path,visitDimensions(request,body,site.analyticsCampaigns))
  return new Response(null,{status:204})
 }
 if(page&&request.method==='POST') {
  if(!hasForm&&Number(request.headers.get('content-length')??0)>100000)return json({error:'Message too large.'},413)
  let f:FormData
  try{f=await boundedForm(approvedPost?request.clone():request)}catch{return json({error:'Submission exceeds 6 MB or has invalid form data.'},413)}
  const requested=f.getAll('_pane_form')
  if(approvedPost&&!requested.length)return submitComment(request,env,site,approvedPost.id)
  const form=requested.length===0?legacyForm:requested.length===1&&typeof requested[0]==='string'?typedForm(site,slug,requested[0]):undefined
  if(requested.length&&!form)return json({error:'Choose a form on this page.'},400)
  if(!form&&!legacyContact)return json({error:hasForm?'Choose a form on this page.':'Method not allowed.'},hasForm?400:405)
  if(!form&&Number(request.headers.get('content-length')??0)>100000)return json({error:'Message too large.'},413)
  const instances=f.getAll('_pane_form_instance'),instance=instances[0]
  if(instances.length&&(instances.length!==1||typeof instance!=='string'||!form||!page.sections?.some(section=>section.blocks.some(block=>block.kind==='form'&&block.form===form.id&&block.id===instance))))return json({error:'Choose a form on this page.'},400)
  const id=String(f.get('idempotency')??'')
  let name=String(f.get('name')??'').trim(),email=String(f.get('email')??'').trim(),message=String(f.get('message')??'').trim(),uploads:Upload[]=[],submission:Submission|undefined
  if(form){
   if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Invalid submission receipt.'},400)
   const checked=await validateForm(form,f,id)
   checked.state.instance=typeof instance==='string'?instance:''
   if(Object.keys(checked.state.errors).length){
    const renderSite=approvedPost&&!selectedPage?{...site,pages:[...site.pages.filter(candidate=>candidate.slug!==slug),{...page,slug}]}:site
    const response=await document(site.name,publicPage(renderSite,slug,'live',false,true,env.TURNSTILE_SITE_KEY,checked.state),'site',pageEmbedOrigins(page),undefined,site.locale?.locale)
    const headers=formHeaders(new Headers(response.headers));headers.set('x-robots-tag','noindex, nofollow')
    return new Response(response.body,{status:400,headers})
   }
   ({name,email,message,uploads}=checked);submission=submissionRecord(form,slug,checked.state.values,uploads);f.set('name',name);f.set('email',email);f.set('message',message)
  }
  submission??=submissionRecord(undefined,slug,{name,email,message})
  if(String(f.get('website')??''))return rejectForm(env,slug,'honeypot',f,submission)
  if(!form&&(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!message||message.length>5000))return json({error:'Enter a name, valid email and message up to 5,000 characters.'},400)
  // Pencil's immutable original receipt: retries cannot replace an earlier answer, and spend no quota.
  const sender=await visitor(request,env.SESSION_SECRET)
  if(env.PANE_LIVE?(await liveCall(env,'/rate',{form:slug,visitor:sender,id})).limited:await contactLimited(env.DB,slug,sender,id))return rejectForm(env,slug,'rate',f,submission)
  const verification=await verifyForm(env,String(f.get('cf-turnstile-response')??''),id,slug)
  if(verification!=='verified')return rejectForm(env,slug,verification,f,submission)
  const acknowledgment=page?.acknowledgment,received=Date.now()
  if(env.PANE_LIVE){
   let attribution:unknown={};try{const text=String(f.get('attribution')??'');if(text.length<=2000)attribution=JSON.parse(text||'{}')}catch{}
   await liveCall(env,'/accept',{id,name,email,message,submission,received:new Date(received).toISOString(),acknowledgment:acknowledgment??null,followUp:followUpDue(site,received),goals:optedOut(request)?[]:(site.goals??[]).filter(goal=>goal.type==='form'&&goal.page===slug).map(goal=>({id:goal.id,page:slug})),dimensions:visitDimensions(request,attribution,site.analyticsCampaigns),uploads})
   return new Response(null,{status:303,headers:{location:formConfirmation(site,slug,form)}})
  }
  const messageStatement=enquiryStatement(env.DB,{id,name,email,message,submission,received:new Date(received).toISOString(),acknowledgment,followUp:followUpDue(site,received)})
  const [stored]=await env.DB.batch([messageStatement,...uploadStatements(env.DB,id,message,uploads)])
  // A goal counts once per stored message, from the submitting page view's own attribution; never for opt-outs.
  const goals=optedOut(request)||!stored.meta.changes ? [] : (site.goals??[]).filter(goal=>goal.type==='form'&&goal.page===slug)
  if(goals.length) {
   let attribution:unknown={}
   try { const text=String(f.get('attribution')??''); attribution=text.length<=2000 ? JSON.parse(text||'{}') : {} } catch {}
   const dimensions=visitDimensions(request,attribution,site.analyticsCampaigns)
   for(const goal of goals) await recordGoal(env.DB,goal.id,slug,dimensions)
  }
  await deliverAcknowledgment(env,id)
  return new Response(null,{status:303,headers:{location:formConfirmation(site,slug,form)}})
 }
 if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed.'},405)
 const banners=snapshot?snapshot.banners??[]:await activeBanners(env.DB,String(row.id))
 const announcements=banners.length ? `<div class="public-site"><aside class="public-shell public-announcements" aria-label="Announcements">${banners.map(banner=>`<p class="notice">${escape(banner.text)}</p>`).join('')}</aside></div>` : ''
 if(slug==='search') {
  const query=url.searchParams.get('q')??''
  const response=await document(`Search · ${site.name}`,announcements+siteSearch({...site,pages:site.pages.filter(page=>!pageRules(site,page).length)},query),'site',undefined,undefined,site.locale?.locale)
  return query.length > 200 ? new Response(response.body,{status:400,headers:response.headers}) : response
 }
 if(!page) {
  const missing=site.notFound && activePages(site).find(page=>page.slug===site.notFound)
  if(!missing)return notFound()
  const missingGate=await accessResponse(request,env,site,missing);if(missingGate)return missingGate
  const response=await document(site.name,announcements+publicPage(site,missing.slug,'live',request.headers.get('Sec-GPC')==='1',optedOut(request),env.TURNSTILE_SITE_KEY),'site',pageEmbedOrigins(missing),optedOut(request) ? undefined : site.analytics,site.locale?.locale,optedOut(request)?'':customCodeSource(site,missing)+pageHtmlPolicySource(missing)+tags(site).map(tagSource).join(''),optedOut(request)?undefined:tagSources(site))
  const headers=new Headers(response.headers);headers.set('x-robots-tag','noindex, nofollow')
  if(typedForm(site,missing.slug)||hasGridForm(site,missing,missing.slug)||missing.kind==='contact'||missing.slug==='contact')formHeaders(headers)
  return new Response(request.method==='HEAD'?null:response.body,{status:404,headers})
 }
 const notice=sentNotice(site,page,slug,url)
 const response=await document(site.name,announcements+notice+publicPage(site,slug,'live',request.headers.get('Sec-GPC')==='1',optedOut(request),env.TURNSTILE_SITE_KEY)+promotionMarkup(site,slug),'site',pageEmbedOrigins(page),optedOut(request) ? undefined : site.analytics,site.locale?.locale,optedOut(request)?'':customCodeSource(site,page!)+pageHtmlPolicySource(page!)+tags(site).map(tagSource).join(''),optedOut(request)?undefined:tagSources(site))
 if(hasForm||legacyContact){
  const headers=formHeaders(new Headers(response.headers))
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers})
 }
 const privateHeaders=new Headers(response.headers);privateHeaders.set('cache-control','private, no-store');privateHeaders.set('vary','Cookie')
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:privateHeaders})
}
