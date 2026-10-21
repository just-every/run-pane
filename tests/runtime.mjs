import { createRequire } from 'node:module'
import { readFile, readdir, realpath } from 'node:fs/promises'
import { resolve } from 'node:path'
const require=createRequire(await realpath('node_modules/wrangler/package.json'))
const {Miniflare,convertV4MiniflareOptions}=require('miniflare')
const {unstable_splitSqlQuery}=require('wrangler')
export const origin='http://127.0.0.1:8787'
export const settings={AUTH_ORIGIN:origin,AUTH_LOCAL:'true',OWNER_EMAIL:'owner@example.test',SESSION_SECRET:'test-session-key-'.repeat(4),SETUP_TOKEN:'test-setup-key-'.repeat(4),MAIL_PROVIDER:'development',MAIL_FROM:'pane@example.test'}
export async function runtime({bindings={},outboundService,cf}={}) {
 const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'))
 const files=[config.main,...(await readdir('dist/server',{recursive:true})).filter(n=>n.endsWith('.js')&&n!==config.main)]
 const modules=files.map(path=>({type:'ESModule',path:resolve('dist/server',path)}))
 modules.unshift({type:'ESModule',path:resolve('dist/server/__test-entry.mjs'),contents:'import app from "./index.js"; export default { async scheduled(controller,env,context) { return app.scheduled(controller,env,context); }, async fetch(request,env,context) { const input=await request.json(); const targetRequest=new Request(input.url,input.init); if(input.cf)Object.defineProperty(targetRequest,"cf",{value:input.cf}); return app.fetch(targetRequest,env,context); } }'})
 const mf=new Miniflare({...convertV4MiniflareOptions({modules,modulesRoot:resolve('dist/server'),compatibilityDate:'2026-09-08',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'pane-test'},bindings:{...settings,...bindings},...(outboundService?{outboundService}:{})})})
 let db
 try {
  db=await mf.getD1Database('DB')
  for(const name of (await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort()) {
   const queries=unstable_splitSqlQuery(await readFile('migrations/core/'+name,'utf8'))
   await db.batch(queries.filter(q=>q.trim()).map(q=>db.prepare(q)))
  }
 }catch(e){await mf.dispose();throw e}
 return {mf,db,request:(path,options={})=>{
  const target=new URL(path,origin)
  return mf.dispatchFetch('http://localhost/__test_dispatch',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({cf,url:target.href,init:{...options,headers:{Host:target.host,'CF-Connecting-IP':'127.0.0.1',...options.headers},...(options.body?{body:String(options.body)}:{})}})})
 }}
}
