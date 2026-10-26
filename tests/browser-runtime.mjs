// Browser adapter for the same built Worker and native D1/auth used by pane.test.mjs.
// This is an isolated fixture, never an installed server or an alternative auth route.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {runtime,settings} from './runtime.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'
let f, ownerCookie
const aiLive=process.env.PANE_AI_LIVE==='1',aiFixture=process.env.PANE_AI_FIXTURE==='1'
if(aiLive&&!process.env.AI_API_KEY)throw Error('AI_API_KEY is required for the live AI journey.')
export const aiRequests=[],aiOutbounds=[]
let aiObserver,aiBoundaryError
export function observeAiEdge(observer){aiObserver=observer;aiBoundaryError=undefined}
export function assertAiBoundary(){if(aiBoundaryError)throw aiBoundaryError}
export let aiProviderFailure=false
export function failAiProvider(value){aiProviderFailure=value}
async function aiEdge(request){
 const url=new URL(request.url)
 aiOutbounds.push({origin:url.origin,path:url.pathname,method:request.method})
 if(url.hostname==='api.sendgrid.com')return new Response(null,{status:202})
 assert.equal(url.protocol,'https:');assert.equal(url.hostname,'api.openai.com','AI requests stay on the configured provider edge')
 const payload=await request.clone().json(),content=payload.messages.find(message=>message.role==='user').content,input=JSON.parse(content[0].text)
 aiRequests.push({payload,input,imageCount:content.filter(part=>part.type==='image_url').length,images:content.filter(part=>part.type==='image_url').map(part=>part.image_url.url)})
 if(aiObserver)try{await aiObserver(aiRequests.at(-1))}catch(error){aiBoundaryError=error;throw error}
 if(aiProviderFailure)return Response.json({error:{message:'synthetic-pane-raw-provider-error'}},{status:400})
 if(aiLive){assert.ok(aiRequests.length<=8,'The live journey has a bounded model budget');const response=await fetch(request.url,{method:request.method,headers:Object.fromEntries(request.headers),body:await request.arrayBuffer(),redirect:'manual'});const record=aiRequests.at(-1);record.status=response.status;record.providerRequestId=response.headers.get('x-request-id');return response}
 assert.equal(request.headers.get('authorization'),'Bearer synthetic-pane-4')
 const suggestion=(kind,label,target,after)=>({kind,label,target,after})
 let suggestions
 if(input.mode==='search')suggestions=[
  suggestion('search-title','Workshop search title','page',input.page.title+' | Cedar Street repairs'),
  suggestion('search-description','Workshop search description','page','Repair well-loved furniture at Cedar Street Studio. Tell the workshop about your piece and the care it needs.'),
  suggestion('heading','Clearer page heading',input.headings[0].target,'Furniture repairs with care'),
  suggestion('link','Related workshop page',input.destinations[0].id,input.destinations[0].title),
  suggestion('finding','Review business details','page','Confirm the workshop contact details before considering business structured data.'),
 ]
 else if(input.mode==='alt'){
  assert.equal(input.images.length,5);assert.equal(aiRequests.at(-1).imageCount,5)
  for(const src of aiRequests.at(-1).images)assert.ok(src.startsWith('data:image/png;base64,')&&Buffer.from(src.split(',')[1],'base64').length>300,'The model receives actual raster image bytes')
  const descriptions=['A timber workbench beneath a workshop window.','A wooden chair with a red seat beside a bench.','A blue cabinet with two brass handles.','A green toolbox holding workshop hand tools.','A round timber table on two dark legs.']
  suggestions=input.images.map((image,index)=>suggestion('alt','Describe workshop image '+(index+1),image.target,descriptions[index]))
 }else if(input.mode==='translate'){
  suggestions=input.texts.map(text=>suggestion('translation','Traducir '+text.target,text.target,!text.text?'':text.target==='title'?'Muebles hechos para durar':text.target==='body'?'En Cedar Street Studio reparamos muebles queridos y creamos piezas prácticas para la vida cotidiana.\n\nCuéntanos sobre tu proyecto y el cuidado que necesita.':'Taller de muebles: '+text.text))
 }else suggestions=[suggestion('text','Revise selected paragraph','selection',input.mode==='shorten'?'We repair furniture and make practical pieces.':input.mode==='tone'?'Bring us your well-loved furniture. We will talk through the care it needs together.':'At Cedar Street Studio, we repair well-loved furniture and build useful pieces for everyday life.')]
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(input.mode==='translate'?{translations:Object.fromEntries(suggestions.map(item=>[item.target,item.after]))}:{suggestions})}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}})
}
const assets=resolve('dist/client')
const types={'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.json':'application/json','.webmanifest':'application/manifest+json'}
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,origin),file=resolve(assets,'.'+decodeURIComponent(url.pathname))
  if(['GET','HEAD'].includes(req.method)&&file.startsWith(assets+sep)){
   try {const bytes=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);return}catch(error){if(!['ENOENT','EISDIR'].includes(error.code))throw error}
  }
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const body=Buffer.concat(chunks)
  const {host,...headers}=req.headers // runtime() supplies the target Host exactly once.
  const response=await f.request(url.href,{method:req.method,headers,...(body.length?{body}:{})})
  response.headers.forEach((value,key)=>{if(!['content-length','transfer-encoding','connection','set-cookie'].includes(key))res.setHeader(key,value)})
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies)
  res.writeHead(response.status);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()))
 } catch(error){res.writeHead(500,{'content-type':'text/plain'});res.end('Browser fixture request failed.');console.error(error.name+': '+error.message.split('\n')[0])}
})
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
export const origin = 'http://127.0.0.1:' + server.address().port
f = await runtime({...(process.env.PANE_BROWSER_NOW?{now:Date.parse(process.env.PANE_BROWSER_NOW)}:{}),bindings: {AUTH_ORIGIN: origin,...(aiLive||aiFixture?{AI_ENABLED:'true',AI_API_KEY:aiLive?process.env.AI_API_KEY:'synthetic-pane-4',AI_MODEL:'gpt-4.1-mini'}:{})},...(aiLive||aiFixture?{outboundService:aiEdge}:{}),isolatedLive:process.env.PANE_LIVE_FIXTURE==='1'})
export async function protect(context){
 await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(slot,options){if(!/^[a-f0-9]{64}$/.test(options.cData))return options['error-callback']();options.callback('synthetic-pane-3:'+options.cData)}}`}))
}
export async function bootstrap(context){
 await protect(context)
 const response=await context.request.post(origin+'/auth/bootstrap',{headers:{Origin:origin},data:{token:settings.SETUP_TOKEN,displayName:'Browser proof owner'},maxRedirects:0})
 assert.equal(response.status(),303,'Native bootstrap creates the first browser session')
 ownerCookie=response.headers()['set-cookie'].split(';')[0]
}
export async function signIn(page,email=settings.OWNER_EMAIL){
 await protect(page.context())
 // The existing auth tests use this network-edge mail fixture too. No cookie or
 // browser profile is copied: the browser consumes and confirms a native link.
 let message
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{message=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await auth.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email,returnTo:'/app'})
 assert.ok(message,'The native sign-in flow issued a link to the test mail edge')
 const link=message.text.match(/http:\/\/[^\s]+/)[0]
 await page.goto(link)
 await page.getByRole('button',{name:/Confirm/}).click()
 await page.waitForURL(url=>url.pathname==='/app')
}
export async function stop(){await new Promise(resolve=>server.close(resolve));await f.mf.dispose()}

// Dispatch the platform scheduled event against the built production Worker.
export async function advance(iso){const result=await (await f.mf.getWorker()).scheduled({scheduledTime:new Date(iso),cron:"* * * * *"});assert.equal(result.outcome,"ok")}

// Synthetic native invitation at the mail edge; never a real browser profile.
export async function invitePerson(context,{email,displayName,roles}){
 let message
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{message=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:ownerCookie}}),{email,displayName,role:'member'})
 const person=await f.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(email).first()
 assert.equal((await context.request.post(origin+'/api/pane/roles/set',{headers:{Origin:origin},data:{operatorId:person.id,roles}})).status(),200)
 return message.text.match(/http:\/\/[^\s]+/)[0]
}

// Only the test adapter can disconnect content/intake tables. No product outage switch.
export async function databaseUnavailable(value){
 for(const table of ['pane_revisions','pane_messages'])await f.db.prepare(value?`ALTER TABLE ${table} RENAME TO synthetic_unavailable_${table}`:`ALTER TABLE synthetic_unavailable_${table} RENAME TO ${table}`).run()
}

// Private records are seeded only in the isolated test database.
export async function seedAiPrivateData(sentinels){
 const now=new Date().toISOString()
 for(const [id,message] of [['form',sentinels.form],['enquiry',sentinels.enquiry]])await f.db.prepare('INSERT INTO pane_messages(id,name,email,message,created_at) VALUES(?,?,?,?,?)').bind('synthetic-pane-'+id,'Synthetic visitor',id+'@example.test',message,now).run()
 await f.db.prepare('INSERT INTO pane_visits(day,path,source,device,campaign,referrer,count) VALUES(?,?,?,?,?,?,?)').bind('2026-10-01','/site','Direct','desktop',sentinels.visitor,'',1).run()
 await f.db.prepare("INSERT INTO oa_operators(id,email,display_name,role,status,version,created_at) VALUES(?,?,?,'member','active',1,?)").bind('synthetic-pane-account','private@example.test',sentinels.account,now).run()
 await f.db.prepare('INSERT INTO rer_dependency_keys(interface,private_key) VALUES(?,?)').bind('synthetic-pane-private',sentinels.secret).run()
}
