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
const {fetch:providerFetch,ProxyAgent}=require('undici')
const proxy=process.env.HTTPS_PROXY?new ProxyAgent(process.env.HTTPS_PROXY):undefined
const network=(input,init={})=>providerFetch(input,{...init,...(proxy?{dispatcher:proxy}:{})})
const kit=resolve('node_modules/@runeditrun/rer/modules/deploy-kit')
const {main:ownerCommand}=await import(resolve(kit,'owner-cli.mjs'))
const {providerFailure}=await import(resolve(kit,'diagnostics.mjs'))
const environment='sx-pane-c9-proof',statePath=resolve(folder,'owner-state.json'),declarationPath=resolve(folder,'declaration.json')
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
  return Response.json({success:fields.get('response')==='synthetic-pane-3',hostname:new URL(env.AUTH_ORIGIN).hostname,action:'pane-contact',cdata:'contact'});
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
let browser,state,dbId,offline=false,proofError,cleanupError
const result={journey:'Hosted outage journey',sourceSha:sha,adapterSha256:createHash('sha256').update(wrapper).digest('hex'),providerEdge:'synthetic Turnstile verification',livePages:[],viewports:[1440,390],accepted:0,recovered:0,removed:false}
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
 await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js**',route=>route.fulfill({contentType:'application/javascript',body:"window.turnstile={render(slot,options){options.callback('synthetic-pane-3')}}"}))
 const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data,maxRedirects:0})
 const boot=await post('/auth/bootstrap',{token:inputs.SETUP_TOKEN,displayName:'Synthetic hosted owner'});assert.equal(boot.status(),303)
 assert.equal((await context.request.post(origin+'/setup',{headers:{Origin:origin},form:{confirm:'yes'},maxRedirects:0})).status(),303)
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const prepared=await post('/api/pane/prepare',{site});assert.equal(prepared.status(),200)
 assert.equal((await post('/api/pane/publish',{revision:(await prepared.json()).id})).status(),200)
 await query('ALTER TABLE pane_revisions RENAME TO synthetic_pane_unavailable_revisions; ALTER TABLE pane_messages RENAME TO synthetic_pane_unavailable_messages;');offline=true
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  for(const item of site.pages){
   const response=await page.goto(origin+(item.slug==='home'?'/site':'/site/'+item.slug))
   assert.equal(response.status(),200);assert.equal(await page.getByRole('heading',{name:item.title,exact:true}).count(),1)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
   await page.screenshot({path:resolve(folder,'hosted-outage-'+item.slug+'-'+width+'.png'),fullPage:true})
   if(width===1440)result.livePages.push(item.slug)
  }
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic outage '+width)
  await page.getByLabel('Email address',{exact:true}).fill('synthetic-pane-outage@example.test')
  await page.getByLabel('Message',{exact:true}).fill('Hosted durable enquiry '+width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('sent')),page.getByRole('button',{name:'Send message',exact:true}).click()]);result.accepted++
  await page.screenshot({path:resolve(folder,'hosted-outage-accepted-'+width+'.png'),fullPage:true})
 }
 assert.equal((await query('SELECT COUNT(*) AS total FROM synthetic_pane_unavailable_messages'))[0].total,0)
 await query('ALTER TABLE synthetic_pane_unavailable_revisions RENAME TO pane_revisions; ALTER TABLE synthetic_pane_unavailable_messages RENAME TO pane_messages;');offline=false
 for(let index=0;index<2;index++)assert.equal((await post('/__outage-proof/scheduled',{})).status(),200)
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
 result.status=proofError||cleanupError?'failed':'success'
 if(proofError){result.failure=proofError.message.split('\n')[0];result.providerFailure=providerFailure(proofError,text=>['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','SESSION_SECRET','SETUP_TOKEN','MAIL_API_KEY'].reduce((clean,key)=>inputs[key]?clean.split(inputs[key]).join('[REDACTED]'):clean,String(text)))}
 if(cleanupError)result.cleanupFailure=cleanupError.message.split('\n')[0]
 await writeFile(resolve(folder,'receipt.json'),JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify(result))
}
if(proofError||cleanupError)process.exitCode=1
