// Explicit disposable RunEditRun sandbox proof. The deployed test adapter only
// replaces the Turnstile network edge and transports the native scheduled event;
// all page, snapshot, intake, storage and recovery behavior is production code.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,realpath,rm} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {createRequire} from 'node:module'
import {randomBytes,createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {chromium} from '@playwright/test'
const root=process.cwd(),folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/hosted-outage')
await mkdir(folder,{recursive:true})
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Commit the candidate before running the hosted journey')
assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID,'b20c0ca9cab0c2b70e13d7cf724b89bd','Use only the authorized RunEditRun account')
const require=createRequire(await realpath('node_modules/wrangler/package.json'))
const {fetch:transportFetch,ProxyAgent}=require(process.env.PANE_PROXY_MODULE??'undici')
const proxy=process.env.HTTPS_PROXY?new ProxyAgent(process.env.HTTPS_PROXY):undefined
const network=async(input,init={})=>{
 let body=init.body,headers=init.headers
 // Encode multipart once with the same native implementation that created it.
 // A byte body gives the proxy a definite length, without mixed-version streams.
 if(body instanceof globalThis.FormData){const encoded=new Response(body);body=new Uint8Array(await encoded.arrayBuffer());headers={...Object.fromEntries(new Headers(headers)),'content-type':encoded.headers.get('content-type'),'content-length':String(body.byteLength)}}
 return transportFetch(input,{...init,headers,...(body===undefined?{}:{body}),...(proxy?{dispatcher:proxy}:{})})
}
const kit=resolve('node_modules/@runeditrun/rer/modules/deploy-kit')
const {main:ownerCommand}=await import(resolve(kit,'owner-cli.mjs'))
const {providerFailure}=await import(resolve(kit,'diagnostics.mjs'))
// A fresh disposable host prevents a previous sandbox deletion from polluting route readiness.
const environment='c9-'+sha.slice(0,8)+'-'+Date.now().toString(36),statePath=resolve(folder,'owner-state.json'),declarationPath=resolve(folder,'declaration.json')
const configPath=resolve('dist/server/wrangler.json'),configBytes=await readFile(configPath),config=JSON.parse(configBytes)
const wrapperName='__outage-proof.mjs',wrapperPath=resolve('dist/server',wrapperName)
const declaration=JSON.parse(await readFile('deploy.json','utf8'))
// Keep the same project/deploy identity and bindings. Suppress all sandbox mail.
declaration.vars={...declaration.vars,MAIL_PROVIDER:'development'}
await writeFile(declarationPath,JSON.stringify(declaration),{mode:0o600})
const wrapper=`import app,{PaneLive} from './${config.main}';
import {env} from 'cloudflare:workers';
export {PaneLive};
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const request=new Request(input,init);
 if(request.url==='https://challenges.cloudflare.com/turnstile/v0/siteverify'){
  const fields=await request.formData();
  return Response.json({success:fields.get('response')==='synthetic-pane-3',hostname:new URL(env.AUTH_ORIGIN).hostname,action:'pane-contact',cdata:'${createHash('sha256').update('contact').digest('hex')}'});
 }
 return nativeFetch(request);
};
export default {
 scheduled:app.scheduled,
 async fetch(request,bindings,context){
  if(new URL(request.url).pathname==='/__outage-proof/scheduled'&&request.method==='POST'){
   await app.scheduled({scheduledTime:Date.now(),cron:'* * * * *'},bindings,context);return Response.json({advanced:true});
  }
  return app.fetch(request,{...bindings,TURNSTILE_SITE_KEY:'synthetic-pane-1',TURNSTILE_SECRET:'synthetic-pane-2'},context);
 }
};\n`
await writeFile(wrapperPath,wrapper);await writeFile(configPath,JSON.stringify({...config,main:wrapperName}))
const inputs={...process.env,OWNER_EMAIL:'synthetic-pane-proof@example.test',SESSION_SECRET:randomBytes(48).toString('base64url'),SETUP_TOKEN:randomBytes(48).toString('base64url'),MAIL_API_KEY:'synthetic-pane-4'}
const command=verb=>ownerCommand([verb,'--declaration',declarationPath,'--environment',environment,'--product','','--state',statePath],inputs,{cwd:root,fetch:network,notice:()=>{}})
let browser,state,dbId,offline=false,proofError,cleanupError,phase='deploy'
const result={journey:'Hosted outage journey',sourceSha:sha,adapterSha256:createHash('sha256').update(wrapper).digest('hex'),providerEdge:'synthetic Turnstile verification',livePages:[],viewports:[1440,390],accepted:0,recovered:0,removed:false,assetResponses:[]}
async function query(sql){
 const response=await network('https://api.cloudflare.com/client/v4/accounts/'+process.env.CLOUDFLARE_ACCOUNT_ID+'/d1/database/'+dbId+'/query',{method:'POST',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({sql})})
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.success,true);return body.result[0].results
}
try{
 await command('deploy')
 state=JSON.parse(await readFile(statePath,'utf8'));assert.equal(state.receipt.source.sha,sha)
 dbId=state.receipt.resources.d1.find(item=>item.binding==='DB').id
 const origin=state.receipt.origin
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})})
 const context=await browser.newContext(),page=await context.newPage()
 page.on('response',response=>{const url=new URL(response.url());if(url.origin===origin&&/\.(css|js|woff2)$/.test(url.pathname))result.assetResponses.push({path:url.pathname,status:response.status(),type:response.headers()['content-type']??''})})
 await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js**',route=>route.fulfill({contentType:'application/javascript',body:"window.turnstile={render(slot,options){options.callback('synthetic-pane-3')}}"}))
 const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data,maxRedirects:0})
 const boot=await post('/auth/bootstrap',{token:inputs.SETUP_TOKEN,displayName:'Synthetic hosted owner'});assert.equal(boot.status(),303)
 assert.equal((await context.request.post(origin+'/setup',{headers:{Origin:origin},form:{confirm:'yes'},maxRedirects:0})).status(),303)
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const prepared=await post('/api/pane/prepare',{site});assert.equal(prepared.status(),200)
 assert.equal((await post('/api/pane/publish',{revision:(await prepared.json()).id})).status(),200)
 // Establish the fully deployed site before disconnecting D1. A new assets
 // version can briefly return a missing file while its routes settle.
 const assets=['/pane.css','/pane-base.css','/pane-editor.css','/pane-screens.css','/pane-public.css','/pane-turnstile.js','/pane-tracker.js','/rer-theme.css','/site/theme.css','/fonts/fonts.css','/fonts/figtree/figtree-latin-wght-normal.woff2']
 const deadline=Date.now()+90000
 for(const path of assets){
  let ready=false
  while(!ready&&Date.now()<deadline){const response=await context.request.get(origin+path,{maxRedirects:0});ready=response.status()===200;if(!ready)await new Promise(resolve=>setTimeout(resolve,2000))}
  assert.equal(ready,true,'Deployed asset readiness: '+path)
 }
 await query('ALTER TABLE pane_revisions RENAME TO synthetic_pane_unavailable_revisions; ALTER TABLE pane_messages RENAME TO synthetic_pane_unavailable_messages;');offline=true
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  for(const item of site.pages){
   phase='live '+item.slug+' at '+width
   const response=await page.goto(origin+(item.slug==='home'?'/site':'/site/'+item.slug))
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.public-header')).display==='flex',{},{timeout:8000})
   await page.screenshot({path:resolve(folder,'hosted-outage-'+item.slug+'-'+width+'.png'),fullPage:true})
   assert.equal(response.status(),200,phase+' HTTP status');assert.equal(await page.getByRole('heading',{name:item.title,exact:true}).count(),1,phase+' heading')
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
   await page.screenshot({path:resolve(folder,'hosted-outage-'+item.slug+'-'+width+'.png'),fullPage:true})
   if(width===1440)result.livePages.push(item.slug)
  }
  phase='form at '+width
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic outage '+width)
  await page.getByLabel('Email address',{exact:true}).fill('synthetic-pane-outage@example.test')
  await page.getByLabel('Message',{exact:true}).fill('Hosted durable enquiry '+width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('sent')),page.getByRole('button',{name:'Send message',exact:true}).click()]);result.accepted++
  await page.screenshot({path:resolve(folder,'hosted-outage-accepted-'+width+'.png'),fullPage:true})
 }
 assert.equal((await query('SELECT COUNT(*) AS total FROM synthetic_pane_unavailable_messages'))[0].total,0)
 await query('ALTER TABLE synthetic_pane_unavailable_revisions RENAME TO pane_revisions; ALTER TABLE synthetic_pane_unavailable_messages RENAME TO pane_messages;');offline=false
 result.scheduledAttempts=[]
 for(let index=0;index<2;index++){
  phase='native scheduled recovery '+index
  const deadline=Date.now()+90000;let status
  do{status=(await post('/__outage-proof/scheduled',{})).status();result.scheduledAttempts.push(status);if(status===404||status===503)await new Promise(resolve=>setTimeout(resolve,2000));else break}while(Date.now()<deadline)
  assert.equal(status,200,phase)
 }
 result.recovered=(await query('SELECT COUNT(*) AS total FROM pane_messages'))[0].total;assert.equal(result.recovered,2)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries')
  assert.equal(await page.getByRole('heading',{name:'Synthetic outage '+width,exact:true}).count(),1)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
  await page.screenshot({path:resolve(folder,'hosted-outage-recovered-'+width+'.png'),fullPage:true})
 }
}catch(error){proofError=error}
finally{
 await browser?.close()
 try{
  if(offline&&dbId)await query('ALTER TABLE synthetic_pane_unavailable_revisions RENAME TO pane_revisions; ALTER TABLE synthetic_pane_unavailable_messages RENAME TO pane_messages;')
  try{await readFile(statePath);await command('remove');result.removed=true}catch(error){if(error.code!=='ENOENT')throw error}
 }catch(error){cleanupError=error}
 await writeFile(configPath,configBytes);await rm(wrapperPath,{force:true})
 await proxy?.close()
 result.status=proofError||cleanupError?'failed':'success';result.phase=phase
 if(proofError&&typeof proofError.actual==='number')result.actual=proofError.actual
 if(proofError&&typeof proofError.expected==='number')result.expected=proofError.expected
 if(proofError){result.failure=proofError.message.split('\n')[0];result.providerFailure=providerFailure(proofError,text=>['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','SESSION_SECRET','SETUP_TOKEN','MAIL_API_KEY'].reduce((clean,key)=>inputs[key]?clean.split(inputs[key]).join('[REDACTED]'):clean,String(text)))}
 if(cleanupError)result.cleanupFailure=cleanupError.message.split('\n')[0]
 await writeFile(resolve(folder,'receipt.json'),JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify({...result,assetResponses:undefined,assetFailures:result.assetResponses.filter(row=>row.status!==200)}))
}
if(proofError||cleanupError)process.exitCode=1
