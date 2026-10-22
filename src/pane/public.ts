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
 const bucket = `${new Date().toISOString().slice(0,16)}:${key}`
 const r=await db.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>()
 return (r?.count??limit+1)>limit
}
export async function publicResponse(request:Request,original:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname
 if(path !== '/site' && !path.startsWith('/site/')) return null
 const env=runtimeBindings(original),canonical=new URL(env.AUTH_ORIGIN).origin
 if(request.method==='POST'&&(url.origin!==canonical||request.headers.get('Origin')!==canonical))return json({error:'Same-origin request required.'},403)
 let slug: string
 try {slug=path==='/site'?'':decodeURIComponent(path.slice(6))} catch {return notFound()}
 const row=await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
 if(!row && path !== '/site' && !slugs.includes(slug) && slug !== 'search') return notFound()
 if(!row) return document('Website not published','<div class="public-site"><div class="public-shell"><main class="public-main" id="main"><h1>This website is getting ready</h1><p>The business has not published its first version.</p></main></div></div>','site')
 const site=revision(row).site
 if (!slug) slug=homeSlug(site)!
 const redirect=site.redirects?.find(redirect=>redirect.from===path)
 if (redirect && ['GET','HEAD'].includes(request.method)) return new Response(null,{status:redirect.status,headers:{location:redirect.to,'cache-control':'no-store'}})
 const page=activePages(site).find(page=>page.slug===slug)
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
 if((page?.kind==='contact'||(page && slug==='contact'))&&request.method==='POST') {
  if(Number(request.headers.get('content-length')??0)>100000)return json({error:'Message too large.'},413)
  const f=await request.formData(),name=String(f.get('name')??'').trim(),email=String(f.get('email')??'').trim(),message=String(f.get('message')??'').trim(),id=String(f.get('idempotency')??'')
  if(String(f.get('website')??''))return new Response(null,{status:303,headers:{location:pagePath(site,slug)+'?sent=1'}})
  if(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!message||message.length>5000)return json({error:'Enter a name, valid email and message up to 5,000 characters.'},400)
  // Pencil's immutable original receipt: retries cannot replace an earlier answer.
  if(await limited(env.DB,'contact',20))return json({error:'Please try again in a minute.'},429)
  const acknowledgment=page?.acknowledgment,received=Date.now()
  const stored=await env.DB.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment,acknowledgment_status,follow_up_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(id,name,email,message,new Date(received).toISOString(),acknowledgment ? JSON.stringify(acknowledgment) : null,acknowledgment ? 'pending' : 'not_requested',followUpDue(site,received),id).run()
  // A goal counts once per stored message, from the submitting page view's own attribution; never for opt-outs.
  const goals=optedOut(request)||!stored.meta.changes ? [] : (site.goals??[]).filter(goal=>goal.type==='form'&&goal.page===slug)
  if(goals.length) {
   let attribution:unknown={}
   try { const text=String(f.get('attribution')??''); attribution=text.length<=2000 ? JSON.parse(text||'{}') : {} } catch {}
   const dimensions=visitDimensions(request,attribution,site.analyticsCampaigns)
   for(const goal of goals) await recordGoal(env.DB,goal.id,slug,dimensions)
  }
  await deliverAcknowledgment(env,id)
  return new Response(null,{status:303,headers:{location:pagePath(site,slug)+'?sent=1'}})
 }
 if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed.'},405)
 const banners=await activeBanners(env.DB,String(row.id))
 const announcements=banners.length ? `<div class="public-site"><aside class="public-shell public-announcements" aria-label="Announcements">${banners.map(banner=>`<p class="notice">${escape(banner.text)}</p>`).join('')}</aside></div>` : ''
 if(slug==='search') {
  const query=url.searchParams.get('q')??''
  const response=await document(`Search · ${site.name}`,announcements+siteSearch(site,query),'site')
  return query.length > 200 ? new Response(response.body,{status:400,headers:response.headers}) : response
 }
 if(!page) {
  const missing=site.notFound && activePages(site).find(page=>page.slug===site.notFound)
  if(!missing)return notFound()
  const response=await document(site.name,announcements+publicPage(site,missing.slug,'live',request.headers.get('Sec-GPC')==='1'),'site',missing.embed ? embedOrigin(missing.embed) : undefined)
  const headers=new Headers(response.headers);headers.set('x-robots-tag','noindex, nofollow')
  return new Response(request.method==='HEAD'?null:response.body,{status:404,headers})
 }
 const notice=(page.kind==='contact'||slug==='contact')&&url.searchParams.has('sent')?'<div class="public-site public-sent"><div class="public-shell"><p class="notice" role="status">Thank you. Your message is in the business inbox.</p></div></div>':''
 const embed=page.embed
 const response=await document(site.name,announcements+notice+publicPage(site,slug,'live',request.headers.get('Sec-GPC')==='1'),'site',embed ? embedOrigin(embed) : undefined)
 return request.method==='HEAD' ? new Response(null,{status:response.status,headers:response.headers}) : response
}
