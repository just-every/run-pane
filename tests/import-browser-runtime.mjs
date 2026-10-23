// Import-owned browser adapter: production Worker and native auth/D1, with only
// the public DNS/source-network edge faked. No alternate product/auth route.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {runtime,settings} from './runtime.mjs'
import {crawlEdge} from './import-crawl-edge.mjs'
export const edge=crawlEdge()
let f
const assets=resolve('dist/client')
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon','.json':'application/json'}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin),file=resolve(assets,'.'+decodeURIComponent(url.pathname))
  if(['GET','HEAD'].includes(req.method)&&file.startsWith(assets+sep)){
   try{const bytes=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);return}catch(error){if(!['ENOENT','EISDIR'].includes(error.code))throw error}
  }
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const body=Buffer.concat(chunks).toString('utf8'),{host,...headers}=req.headers
  const response=await f.request(url.href,{method:req.method,headers,...(body?{body}:{})})
  response.headers.forEach((value,key)=>{if(!['content-length','transfer-encoding','connection','set-cookie'].includes(key))res.setHeader(key,value)})
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies)
  res.writeHead(response.status);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()))
 }catch(error){res.writeHead(500,{'content-type':'text/plain'});res.end('Import browser fixture request failed.');console.error(error.name+': '+error.message.split('\n')[0])}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
export const origin='http://127.0.0.1:'+server.address().port
f=await runtime({bindings:{AUTH_ORIGIN:origin},outboundService:edge.fetch})
export async function bootstrap(context){const response=await context.request.post(origin+'/auth/bootstrap',{headers:{Origin:origin},data:{token:settings.SETUP_TOKEN,displayName:'synthetic-pane-1'},maxRedirects:0});assert.equal(response.status(),303);return response.headers()['set-cookie'].split(';')[0]}
export async function stop(){await new Promise(resolve=>server.close(resolve));await f.mf.dispose()}
