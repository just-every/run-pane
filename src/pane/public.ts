import type { Bindings } from '../auth.server'
import { slugs, revision } from './content'
import { document, publicPage } from './views'
const json = (v:unknown,status=200) => Response.json(v,{status,headers:{'cache-control':'no-store'}})
async function limited(db:D1Database,key:string,limit:number) {
 const bucket = `${new Date().toISOString().slice(0,16)}:${key}`
 const r=await db.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>()
 return (r?.count??limit+1)>limit
}
export async function publicResponse(request:Request,env:Bindings):Promise<Response|null> {
 const url=new URL(request.url),path=url.pathname
 if(path !== '/site' && !path.startsWith('/site/')) return null
 const row=await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
 if(!row) return document('Website not published','<div class="public-shell"><main class="public-main" id="main"><h1>This website is getting ready</h1><p>The business has not published its first version.</p></main></div>')
 const site=revision(row).site, slug=path==='/site'?'home':path.slice(6)
 if(path==='/site/visit' && request.method==='POST') {
  if(request.headers.get('Origin')!==url.origin) return json({error:'Same-origin request required.'},403)
  if(request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return new Response(null,{status:204})
  const body=await request.json() as {path:string}
  if(!slugs.includes(body.path))return json({error:'Unknown page.'},400)
  if(await limited(env.DB,'visits',300))return new Response(null,{status:429})
  await env.DB.prepare('INSERT INTO pane_visits(day,path,count) VALUES(?,?,1) ON CONFLICT(day,path) DO UPDATE SET count=count+1').bind(new Date().toISOString().slice(0,10),body.path).run()
  return new Response(null,{status:204})
 }
 if(slug==='contact'&&request.method==='POST') {
  if(request.headers.get('Origin')!==url.origin)return json({error:'Same-origin request required.'},403)
  if(Number(request.headers.get('content-length')??0)>100000)return json({error:'Message too large.'},413)
  const f=await request.formData(),name=String(f.get('name')??'').trim(),email=String(f.get('email')??'').trim(),message=String(f.get('message')??'').trim(),id=String(f.get('idempotency')??'')
  if(String(f.get('website')??''))return new Response(null,{status:303,headers:{location:'/site/contact?sent=1'}})
  if(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!message||message.length>5000)return json({error:'Enter a name, valid email and message up to 5,000 characters.'},400)
  // Pencil's immutable original receipt: retries cannot replace an earlier answer.
  if(await limited(env.DB,'contact',20))return json({error:'Please try again in a minute.'},429)
  await env.DB.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(id,name,email,message,new Date().toISOString(),id).run()
  return new Response(null,{status:303,headers:{location:'/site/contact?sent=1'}})
 }
 if(request.method!=='GET')return json({error:'Method not allowed.'},405)
 if(!slugs.includes(slug))return document('Not found','<h1>Page not found</h1>').then(r=>new Response(r.body,{status:404,headers:r.headers}))
 const notice=slug==='contact'&&url.searchParams.has('sent')?'<div class="public-shell"><p class="notice" role="status">Thank you. Your message is in the business inbox.</p></div>':''
 return document(site.name,notice+publicPage(site,slug,false))
}
