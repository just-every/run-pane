// Browser adapter for the same built Worker and native D1/auth used by pane.test.mjs.
// This is an isolated fixture, never an installed server or an alternative auth route.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {runtime,settings} from './runtime.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'
let f
const assets=resolve('dist/client')
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json','.webmanifest':'application/manifest+json'}
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,origin),file=resolve(assets,'.'+decodeURIComponent(url.pathname))
  if(['GET','HEAD'].includes(req.method)&&file.startsWith(assets+sep)){
   try {const bytes=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);return}catch(error){if(!['ENOENT','EISDIR'].includes(error.code))throw error}
  }
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const body=Buffer.concat(chunks).toString('utf8')
  const {host,...headers}=req.headers // runtime() supplies the target Host exactly once.
  const response=await f.request(url.href,{method:req.method,headers,...(body?{body}:{})})
  response.headers.forEach((value,key)=>{if(!['content-length','transfer-encoding','connection','set-cookie'].includes(key))res.setHeader(key,value)})
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies)
  res.writeHead(response.status);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()))
 } catch(error){res.writeHead(500,{'content-type':'text/plain'});res.end('Browser fixture request failed.');console.error(error.name+': '+error.message.split('\n')[0])}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
export const origin = 'http://127.0.0.1:' + server.address().port
f = await runtime({bindings: {AUTH_ORIGIN: origin}})
export async function bootstrap(context){
 const response=await context.request.post(origin+'/auth/bootstrap',{headers:{Origin:origin},data:{token:settings.SETUP_TOKEN,displayName:'Browser proof owner'},maxRedirects:0})
 assert.equal(response.status(),303,'Native bootstrap creates the first browser session')
}
export async function signIn(page){
 // The existing auth tests use this network-edge mail fixture too. No cookie or
 // browser profile is copied: the browser consumes and confirms a native link.
 let message
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{message=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await auth.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL,returnTo:'/app'})
 assert.ok(message,'The native sign-in flow issued a link to the test mail edge')
 const link=message.text.match(/http:\/\/[^\s]+/)[0]
 await page.goto(link)
 await page.getByRole('button',{name:/Confirm/}).click()
 await page.waitForURL(url=>url.pathname==='/app')
}
export async function stop(){await new Promise(resolve=>server.close(resolve));await f.mf.dispose()}

// Dispatch the platform scheduled event against the built production Worker.
export async function advance(iso){const result=await (await f.mf.getWorker()).scheduled({scheduledTime:new Date(iso),cron:"* * * * *"});assert.equal(result.outcome,"ok")}
