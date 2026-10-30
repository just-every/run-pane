// Real local command transport with isolated installations, never an owner's data.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {cp,mkdtemp,mkdir,readFile,readdir,rm,symlink,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {runtime,origin,settings} from '../tests/runtime.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'

const execute=promisify(execFile),checkout=resolve('.'),rer=resolve('node_modules/@runeditrun/rer/global/rer.mjs')
async function command(root,args){
 try{return await execute(process.execPath,[rer,...args],{cwd:root,timeout:120000,maxBuffer:2000000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}})}
 catch(error){error.message='Archive journey command failed: rer '+args[0]+' (exit '+error.code+')\n'+error.stdout+'\n'+error.stderr;throw error}
}
async function installation(root){
 await mkdir(root)
 const excluded=new Set(['.git','node_modules','dist','.output','.wrangler','.rer','.cache','.seed','.tanstack','test-results','exports'])
 for(const entry of await readdir(checkout))if(!excluded.has(entry)&&!entry.startsWith('.env')&&!entry.startsWith('.dev.vars'))await cp(join(checkout,entry),join(root,entry),{recursive:true})
 for(const entry of ['node_modules','dist'])await symlink(join(checkout,entry),join(root,entry),'dir')
}
const sorted=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
async function tables(db,predicate){
 const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results.map(row=>row.name).filter(predicate)
 return Object.fromEntries(await Promise.all(names.map(async name=>[name,sorted((await db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()).results)])))
}
const historyTable=name=>['pane_revisions','pane_state','pane_approvals'].includes(name)||name.startsWith('ik_')&&name!=='ik_d1_assertions'
const productTable=name=>name.startsWith('pane_')||name.startsWith('ik_')||name.startsWith('oa_')||name.startsWith('oc_')
function native(app){
 let cookie=''
 const post=async(path,input)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)})
 return {post,setCookie(value){cookie=value},async call(path,input){const response=await post(path,input);assert.equal(response.status,200,path+': '+await response.clone().text());return response.json()},async data(){const response=await app.request('/api/pane',{headers:{Cookie:cookie}});assert.equal(response.status,200);return response.json()},get cookie(){return cookie}}
}
async function bootstrap(app){
 const door=native(app),response=await door.post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic archive owner'})
 assert.equal(response.status,303,await response.clone().text());door.setCookie(response.headers.get('set-cookie').split(';')[0])
 assert.equal((await app.request('/setup',{method:'POST',headers:{Cookie:door.cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
 return door
}
async function signIn(app){
 let delivered
 const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{delivered=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await auth.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host}}),{email:settings.OWNER_EMAIL,returnTo:'/app'})
 assert.ok(delivered,'Restored durable owner can request a fresh native sign-in')
 const token=new URL(delivered.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),door=native(app)
 const response=await door.post('/auth/confirm',{token});assert.equal(response.status,303)
 door.setCookie(response.headers.get('set-cookie').split(';')[0]);return door
}
async function screens(app,door,folder){
 const {createServer}=await import('node:http'),{extname,sep}=await import('node:path'),{chromium}=await import('@playwright/test')
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,origin).pathname
   const assets=resolve('./dist/client'),file=resolve(assets,'.'+decodeURIComponent(path))
   if(['GET','HEAD'].includes(req.method)&&file.startsWith(assets+sep)){
    try{
     const bytes=await readFile(file)
     res.writeHead(200,{'content-type':{'.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);return
    }catch(error){if(!['ENOENT','EISDIR'].includes(error.code))throw error}
   }
   const chunks=[];for await(const chunk of req)chunks.push(chunk)
   const {host,...headers}=req.headers
   const response=await app.request(req.url,{method:req.method,headers:{...headers,Origin:origin},...(chunks.length?{body:Buffer.concat(chunks)}:{})})
   response.headers.forEach((value,key)=>{if(!['content-length','connection','transfer-encoding'].includes(key))res.setHeader(key,value)})
   res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()))
  }catch{res.writeHead(500);res.end('Archive browser fixture failed.')}
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM?{executablePath:process.env.PANE_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 try{
  const context=await browser.newContext(),address='http://127.0.0.1:'+server.address().port
  const split=door.cookie.indexOf('=');await context.addCookies([{name:door.cookie.slice(0,split),value:door.cookie.slice(split+1),url:address}])
  const page=await context.newPage()
  await mkdir(folder,{recursive:true})
  for(const width of [1440,390])for(const [path,name,text] of [['/app','restored-editor','synthetic-pane-draft'],['/app/moves','restored-journals','Moves'],['/site','restored-live','synthetic-pane-live']]){
   await page.setViewportSize({width,height:1000});await page.goto(address+path)
   assert.ok((await page.content()).includes(text),name)
   assert.ok(await page.locator('link[rel=stylesheet]').evaluateAll(links=>links.length>0&&links.every(link=>link.sheet)),'Every restored screen loads its stylesheets')
   await page.evaluate(()=>document.fonts.ready)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
   await page.screenshot({path:join(folder,name+'-'+width+'.png'),fullPage:true})
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}

export async function archiveTransportJourney({browser=false,folder}={}){
 const scratch=await mkdtemp(join(tmpdir(),'synthetic-pane-archive-')),source=join(scratch,'source'),empty=join(scratch,'empty'),occupied=join(scratch,'occupied'),archive=join(scratch,'pane.rer')
 let app
 try{
  for(const root of [source,empty,occupied])await installation(root)
  await execute('pnpm',['exec','wrangler','d1','migrations','apply','foundation','--local','--persist-to','.wrangler/state','--config','wrangler.jsonc'],{cwd:source,timeout:120000,maxBuffer:2000000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
  app=await runtime({installation:source})
  const owner=await bootstrap(app),site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
  site.name='synthetic-pane-live'
  const first=await owner.call('/api/pane/prepare',{site});await owner.call('/api/pane/publish',{revision:first.id})
  const second=await owner.call('/api/pane/prepare',{site:{...site,name:'synthetic-pane-second'}});await owner.call('/api/pane/publish',{revision:second.id});await owner.call('/api/pane/rollback',{revision:first.id})
  const jobs=[]
  for(const [index,undo] of [[1,true],[2,false]]){
   const source=JSON.stringify({...site,name:'synthetic-pane-import-'+index}),plan=await owner.call('/api/pane/import/dry-run',{source})
   const job=await owner.call('/api/pane/import/apply',{source,fingerprint:plan.fingerprint});jobs.push(await owner.call('/api/pane/import/dry-run',{job:job.id}))
   if(undo){await owner.call('/api/pane/import/undo',{job:job.id});jobs[index-1]=await owner.call('/api/pane/import/dry-run',{job:job.id})}
  }
  await owner.call('/api/pane/prepare',{site:{...site,name:'synthetic-pane-draft'}})
  const before=await tables(app.db,historyTable),state=await owner.data(),oldCookie=owner.cookie
  assert.ok(before.pane_revisions.length>=4);assert.equal(before.pane_approvals.length,3)
  assert.deepEqual(jobs.map(job=>job.state),['undone','completed'])
  assert.ok(Object.entries(before).some(([name,rows])=>name.startsWith('ik_')&&name.includes('original')&&rows.length),'Import custody contains retained originals')
  for(const row of before.pane_revisions){assert.equal(createHash('sha256').update(row.site).digest('hex'),row.hash);assert.ok(row.actor);assert.ok(Number.isFinite(Date.parse(row.created_at)))}
  await app.mf.dispose();app=undefined
  await writeFile(join(source,'.dev.vars'),'SESSION_SECRET=synthetic-pane-private-setting\n',{mode:0o600})
  await command(source,['export','--output',archive])
  const bytes=await readFile(archive);assert.ok(bytes.byteLength>0,'Documented export writes a real archive')
  assert.ok(!bytes.includes(Buffer.from('synthetic-pane-private-setting')),'Private local settings stay out of the archive')
  await command(empty,['import','--input',archive,'--yes'])
  app=await runtime({installation:empty})
  assert.deepEqual(await tables(app.db,historyTable),before,'Every immutable revision, hash, actor, timestamp, approval, live selection and complete import journal survives transport')
  assert.equal((await app.request('/api/pane',{headers:{Cookie:oldCookie}})).status,401,'Source sessions do not restore authority')
  assert.equal(await app.db.prepare('SELECT COUNT(*) AS n FROM oa_sessions').first('n'),0)
  const restored=await signIn(app)
  assert.equal((await app.request('/setup',{headers:{Cookie:restored.cookie}})).status,200,'Restored owner confirms local setup explicitly')
  assert.equal((await app.request('/setup',{method:'POST',headers:{Cookie:restored.cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const after=await restored.data()
  for(const field of ['revisions','live','draft','approvals','imports','people'])assert.deepEqual(after[field],state[field],'Authenticated restored '+field)
  for(const job of jobs)assert.deepEqual(await restored.call('/api/pane/import/dry-run',{job:job.id}),job,'Retained import report reopens from its exact original bytes')
  assert.equal((await app.request('/app',{headers:{Cookie:restored.cookie}})).status,200)
  assert.match(await (await app.request('/site')).text(),/synthetic-pane-live/)
  assert.deepEqual(await tables(app.db,historyTable),before,'Reopening never mutates source history')
  if(browser)await screens(app,restored,folder??resolve('./test-results/archive'))
  await app.mf.dispose();app=undefined
  // A different installation with its own records must survive an attempted overwrite.
  await execute('pnpm',['exec','wrangler','d1','migrations','apply','foundation','--local','--persist-to','.wrangler/state','--config','wrangler.jsonc'],{cwd:occupied,timeout:120000,maxBuffer:2000000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
  app=await runtime({installation:occupied});const existing=await bootstrap(app)
  const saved=await existing.call('/api/pane/prepare',{site:{...site,name:'synthetic-pane-occupied'}});await existing.call('/api/pane/publish',{revision:saved.id})
  const records=await tables(app.db,productTable)
  await app.mf.dispose();app=undefined
  await assert.rejects(command(occupied,['import','--input',archive,'--yes']),error=>error.code===4&&/target_not_empty|empty installation/.test(error.message),'Occupied destination refuses the documented import')
  app=await runtime({installation:occupied})
  assert.deepEqual(await tables(app.db,productTable),records,'Refused import changes no existing product, owner or import record')
  assert.match(await (await app.request('/site')).text(),/synthetic-pane-occupied/)
  await app.mf.dispose();app=await runtime({installation:source})
  assert.deepEqual(await tables(app.db,historyTable),before,'Export and every restore attempt leave the source immutable records exact')
  console.log('PROBE BACKUP-001 transport: rer export and rer import -> live revision, every immutable snapshot and hash and actor and timestamp, approvals, completed and undone import custody reconcile; fresh native owner sign-in and retained reports reopen.')
  console.log('PROBE BACKUP-001 refusal: rer import into occupied destination -> exit 4; every existing product and owner record unchanged; source sessions excluded and source history unchanged.')
 }finally{await app?.mf.dispose();await rm(scratch,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await archiveTransportJourney({browser:process.argv.includes('--browser'),folder:process.env.PANE_SCREENSHOTS})
