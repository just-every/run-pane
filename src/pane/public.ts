import {tags,tagSource,tagSources} from './tags'
import { customCodeSource, codeConfirmation } from './custom-code'
import { typedForm,validateForm,boundedForm,uploadStatements,type Upload } from './forms'
import { accessResponse, pageRules } from './access'
import { promotionMarkup } from './promotions'
import { liveCall, liveSnapshot } from './outage'
import { rejectForm, verifyForm } from './form-protection'
import { activeBanners } from './schedules'
import { escape } from './ui/kit'
import { activePages, homeSlug, pagePath } from './pages'
import { visitDimensions } from './visit-dimensions'
import { recordGoal } from './goal-data'
import { followUpDue } from './followups'
import { deliverAcknowledgment } from './acknowledgment'
import { embedOrigin } from './embeds'
import { runtimeBindings, type Bindings } from '../auth.server'
import { slugs, revision } from './content'
import { document } from './views'
import { publicPage } from './public-view'
import { siteSearch } from './site-search'
const json = (v:unknown,status=200) => Response.json(v,{status,headers:{'cache-control':'no-store'}})
const notFound = () => document('Not found','<div class="public-site"><div class="public-shell"><main class="public-main" id="main"><h1>Page not found</h1><p><a href="/site">Back to the home page</a></p></main></div></div>','site').then(r=>new Response(r.body,{status:404,headers:r.headers}))
const optedOut=(request:Request)=>request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1'
async function limited(db:D1Database,key:string,limit:number) {
 const minute = new Date().toISOString().slice(0,16)
 // Only this minute's counts matter, so earlier buckets are dropped as each count is taken.
 const [,r]=await db.batch<{count:number}>([
  db.prepare('DELETE FROM pane_rate_limits WHERE bucket<?').bind(minute),
  db.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(`${minute}:${key}`),
 ])
 return (r?.results[0]?.count??limit+1)>limit
}
/** Each visitor has its own quota per form under a form-wide emergency ceiling; retrying a stored or erased enquiry spends neither. */
async function contactLimited(db:D1Database,form:string,visitor:string,id:string) {
 if(await db.prepare('SELECT 1 FROM pane_messages WHERE id=? UNION ALL SELECT 1 FROM pane_erased_messages WHERE id=?').bind(id,id).first())return false
 return await limited(db,`contact-visitor:${visitor}:${form}`,20)||await limited(db,'contact:'+form,200)
}
/** The visitor a quota belongs to: Cloudflare's client address, an IPv6 address reduced to the /64
 * one subscriber holds, kept only as a keyed digest so no address is stored. */
async function visitor(request:Request,secret:string) {
 const ip=(request.headers.get('CF-Connecting-IP')??'').toLowerCase()
 let network=ip
 if(ip.includes(':')&&!ip.includes('.')) {
  const [head,tail]=ip.split('::'),left=head?head.split(':'):[],right=tail?tail.split(':'):[]
  const groups=tail===undefined?left:[...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right]
  network=groups.slice(0,4).map(group=>group.replace(/^0+(?=.)/,'')).join(':')+'::/64'
 }
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('contact\0'+network))),b=>b.toString(16).padStart(2,'0')).join('')
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
 const page=activePages(site).find(page=>page.slug===slug)
 if(url.searchParams.has('pane-image')){
  if(!['GET','HEAD'].includes(request.method)||!page)return new Response(null,{status:404})
  const image=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===url.searchParams.get('pane-image'))?.image
  const width=url.searchParams.get('width'),source=width==='0'?image?.src:image?.renditions?.find(item=>String(item.width)===width)?.src
  if(!source)return new Response(null,{status:404,headers:{'cache-control':'private, no-store'}})
  const bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0))
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':width==='0'?'image/png':'image/webp','content-length':String(bytes.length),'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'}})
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
 const form=typedForm(site,slug)
 if((form||page?.kind==='contact'||(page && slug==='contact'))&&request.method==='POST') {
  if(!form&&Number(request.headers.get('content-length')??0)>100000)return json({error:'Message too large.'},413)
  let f:FormData
  try{f=form?await boundedForm(request):await request.formData()}catch{return json({error:'Submission exceeds 6 MB or has invalid form data.'},413)}
  const id=String(f.get('idempotency')??'')
  let name=String(f.get('name')??'').trim(),email=String(f.get('email')??'').trim(),message=String(f.get('message')??'').trim(),uploads:Upload[]=[]
  if(form){
   if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Invalid submission receipt.'},400)
   const checked=await validateForm(form,f,id)
   if(Object.keys(checked.state.errors).length){
    const response=await document(site.name,publicPage(site,slug,'live',false,true,env.TURNSTILE_SITE_KEY,checked.state),'site')
    const headers=new Headers(response.headers);headers.set('content-security-policy',headers.get('content-security-policy')!.replace("script-src 'self'","script-src 'self' https://challenges.cloudflare.com").replace("connect-src 'self'","connect-src 'self' https://challenges.cloudflare.com")+'; frame-src https://challenges.cloudflare.com');headers.set('x-robots-tag','noindex, nofollow');headers.set('cache-control','private, no-store')
    return new Response(response.body,{status:400,headers})
   }
   ({name,email,message,uploads}=checked);f.set('name',name);f.set('email',email);f.set('message',message)
  }
  if(String(f.get('website')??''))return rejectForm(env,slug,'honeypot',f)
  if(!form&&(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!message||message.length>5000))return json({error:'Enter a name, valid email and message up to 5,000 characters.'},400)
  // Pencil's immutable original receipt: retries cannot replace an earlier answer, and spend no quota.
  const sender=await visitor(request,env.SESSION_SECRET)
  if(env.PANE_LIVE?(await liveCall(env,'/rate',{form:slug,visitor:sender,id})).limited:await contactLimited(env.DB,slug,sender,id))return rejectForm(env,slug,'rate',f)
  const verification=await verifyForm(env,String(f.get('cf-turnstile-response')??''),id,slug)
  if(verification!=='verified')return rejectForm(env,slug,verification,f)
  const acknowledgment=page?.acknowledgment,received=Date.now()
  if(env.PANE_LIVE){
   let attribution:unknown={};try{const text=String(f.get('attribution')??'');if(text.length<=2000)attribution=JSON.parse(text||'{}')}catch{}
   await liveCall(env,'/accept',{id,name,email,message,received:new Date(received).toISOString(),acknowledgment:acknowledgment??null,followUp:followUpDue(site,received),goals:optedOut(request)?[]:(site.goals??[]).filter(goal=>goal.type==='form'&&goal.page===slug).map(goal=>({id:goal.id,page:slug})),dimensions:visitDimensions(request,attribution,site.analyticsCampaigns),uploads})
   return new Response(null,{status:303,headers:{location:codeConfirmation(site,slug,form?.redirect)}})
  }
  const messageStatement=env.DB.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment,acknowledgment_status,follow_up_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(id,name,email,message,new Date(received).toISOString(),acknowledgment ? JSON.stringify(acknowledgment) : null,acknowledgment ? 'pending' : 'not_requested',followUpDue(site,received),id)
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
  return new Response(null,{status:303,headers:{location:codeConfirmation(site,slug,form?.redirect)}})
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
  const response=await document(site.name,announcements+publicPage(site,missing.slug,'live',request.headers.get('Sec-GPC')==='1',optedOut(request),env.TURNSTILE_SITE_KEY),'site',missing.embed ? embedOrigin(missing.embed) : undefined,optedOut(request) ? undefined : site.analytics,site.locale?.locale,optedOut(request)?'':customCodeSource(site,missing)+tags(site).map(tagSource).join(''),optedOut(request)?undefined:tagSources(site))
  const headers=new Headers(response.headers);headers.set('x-robots-tag','noindex, nofollow')
  return new Response(request.method==='HEAD'?null:response.body,{status:404,headers})
 }
 const notice=(form||page.kind==='contact'||slug==='contact')&&url.searchParams.has('sent')?'<div class="public-site public-sent"><div class="public-shell"><p class="notice" role="status">'+escape(form?.confirmation??'Thank you. Your message has been received.')+'</p></div></div>':''
 const embed=page.embed
 const response=await document(site.name,announcements+notice+publicPage(site,slug,'live',request.headers.get('Sec-GPC')==='1',optedOut(request),env.TURNSTILE_SITE_KEY)+promotionMarkup(site,slug),'site',embed ? embedOrigin(embed) : undefined,optedOut(request) ? undefined : site.analytics,site.locale?.locale,optedOut(request)?'':customCodeSource(site,page!)+tags(site).map(tagSource).join(''),optedOut(request)?undefined:tagSources(site))
 if(form||page.kind==='contact'||slug==='contact'){
  const headers=new Headers(response.headers);headers.set('vary','Cookie');headers.set('cache-control','private, no-store');const policy=headers.get('content-security-policy')!
  headers.set('content-security-policy',policy.replace("script-src 'self'","script-src 'self' https://challenges.cloudflare.com").replace("connect-src 'self'","connect-src 'self' https://challenges.cloudflare.com")+(embed||(!optedOut(request)&&(site.customCode||page.customCode))?' https://challenges.cloudflare.com':'; frame-src https://challenges.cloudflare.com'))
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers})
 }
 const privateHeaders=new Headers(response.headers);privateHeaders.set('cache-control','private, no-store');privateHeaders.set('vary','Cookie')
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:privateHeaders})
}
