import {createHash} from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
const require=createRequire(await realpath('node_modules/wrangler/package.json'))
const {Miniflare,convertV4MiniflareOptions}=require('miniflare')
const {unstable_splitSqlQuery}=require('wrangler')
export const origin='http://127.0.0.1:8787'
export const settings={AUTH_ORIGIN:origin,AUTH_LOCAL:'true',OWNER_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-key-'.repeat(4),SETUP_TOKEN:'test-setup-key-'.repeat(4),MAIL_PROVIDER:'development',MAIL_FROM:'pane@example.test'}
export async function runtime({bindings={},outboundService,cf,turnstile,isolatedLive=false}={}) {
 const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'))
 const files=[config.main,...(await readdir('dist/server',{recursive:true})).filter(n=>n.endsWith('.js')&&n!==config.main)]
 const modules=files.map(path=>({type:'ESModule',path:resolve('dist/server',path)}))
 // A streamed body is a client still uploading: its response reports how many body bytes the Worker read first.
 modules.unshift({type:'ESModule',path:resolve('dist/server/__test-entry.mjs'),contents:'import app from "./index.js"; export { PaneLive } from "./index.js"; const streamed=({head,chunk,count,tail},read)=>{ let sent=-1; return new ReadableStream({pull(controller){ const part=sent<0?head:sent<count?chunk:sent===count?tail:null; sent++; if(part===null)return controller.close(); const bytes=new TextEncoder().encode(part); read.bytes+=bytes.byteLength; controller.enqueue(bytes); }}); }; export default { async scheduled(controller,env,context) { return app.scheduled(controller,env,context); }, async fetch(request,env,context) { const input=await request.json(),read={bytes:0}; const targetRequest=new Request(input.url,input.stream?{...input.init,body:streamed(input.stream,read)}:input.init); if(input.cf)Object.defineProperty(targetRequest,"cf",{value:input.cf}); const response=await app.fetch(targetRequest,env,context); if(!input.stream)return response; const headers=new Headers(response.headers); headers.set("x-test-body-read",String(read.bytes)); return new Response(response.body,{status:response.status,headers}); } }'})
 const mf=new Miniflare({...convertV4MiniflareOptions({modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-09-08',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'pane-test'},...(isolatedLive?{durableObjects:{PANE_LIVE:{className:'PaneLive',useSQLite:true}}}:{}),bindings:{...settings,TURNSTILE_SITE_KEY:'synthetic-pane-1',TURNSTILE_SECRET:'synthetic-pane-2',...bindings},outboundService:async request=>{if(new URL(request.url).hostname==='challenges.cloudflare.com'){const form=await request.formData(),token=String(form.get('response')??''),proof=/^synthetic-pane-3:([a-f0-9]{64})$/.exec(token);return turnstile?turnstile(request,form):Response.json({success:token==='synthetic-pane-3'||!!proof,hostname:new URL(bindings.AUTH_ORIGIN??origin).hostname,action:'pane-contact',cdata:proof?.[1]??createHash('sha256').update('contact').digest('hex')})}if(outboundService)return outboundService(request);throw Error('Unexpected outbound request: '+new URL(request.url).origin)}})})
 let db
 try {
  db=await mf.getD1Database('DB')
  for(const name of (await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort()) {
   const queries=unstable_splitSqlQuery(await readFile('migrations/core/'+name,'utf8'))
   await db.batch(queries.filter(q=>q.trim()).map(q=>db.prepare(q)))
  }
 }catch(e){await mf.dispose();throw e}
 return {mf,db,request:(path,{stream,...options}={})=>{
  const target=new URL(path,origin)
  return mf.dispatchFetch('http://localhost/__test_dispatch',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({cf,stream,url:target.href,init:{...options,headers:{Host:target.host,'CF-Connecting-IP':'127.0.0.1',...options.headers},...(options.body?{body:String(options.body)}:{})}})})
 }}
}
