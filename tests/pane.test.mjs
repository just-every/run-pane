import {createHash,createHmac} from 'node:crypto'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runtime, origin, settings, moveInSnapshot } from './runtime.mjs'
import { createOperatorAuth } from '../src/modules/operator-auth/index.mjs'
import { createPortability, readArchive } from '@runeditrun/rer/modules/portability'
import { productPolicy } from '../scripts/pane-policy.mjs'
let f,owner,admin,member,first,second,importJob,contactId,oldArchive,laterArchive
const fixture=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
const json=async (path,body,cookie=owner,headers={})=>f.request(path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie??'',...headers},body:JSON.stringify(body),redirect:'manual'})
const data=async()=> (await f.request('/api/pane',{headers:{Cookie:owner}})).json()
async function exportData(db){const s=await createPortability({db,policy:productPolicy}),id=await s.exports.create();while((await s.exports.advance(id,{maxParts:100})).phase==='building'){}const records=[];for await(const r of readArchive(await s.exports.download(id)))records.push(r);return {manifest:records[0],parts:records.filter(r=>r.kind==='part'),closing:records.at(-1)}}
async function restore(db,a,later){const s=await createPortability({db,policy:productPolicy}),id=await s.imports.create(a.manifest);for(const part of a.parts)await s.imports.uploadPart(id,part.index,part);return s.imports.finalize(id,{contentHash:a.closing.contentHash,archiveHash:a.closing.archiveHash,laterJournal:later?.manifest})}
before(async()=>{f=await runtime()})
after(async()=>{await f?.mf.dispose()})
test('native owner sign-in and role sessions protect direct handlers',async()=>{
 assert.equal((await f.request('/api/pane')).status,401)
 const r=await json('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Riverbend owner',returnTo:'/app'},'')
 assert.equal(r.status,303,await r.text());owner=r.headers.get('set-cookie').split(';')[0]
 assert.equal((await f.request('/auth/session',{headers:{Cookie:owner}})).status,200)
 const setup=await f.request('/setup',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 let delivered
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=>'127.0.0.1',mailSender:{send:async m=>{delivered=m;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 for(const role of ['admin','member']) {
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:owner}}),{email:role+'@example.test',displayName:'Riverbend '+role,role})
  const token=new URL(delivered.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  const confirmed=await json('/auth/confirm',{token},'');assert.equal(confirmed.status,303,await confirmed.text())
  if(role==='admin')admin=confirmed.headers.get('set-cookie').split(';')[0];else member=confirmed.headers.get('set-cookie').split(';')[0]
  assert.equal((await json('/auth/confirm',{token},'')).status,400)
 }
 for(const cookie of [member]){
  for(const path of ['/api/pane/templates/start','/app/templates/start'])assert.equal((await json(path,{template:'restaurant-1',name:'synthetic-pane-1'},cookie)).status,403,'Read-only members cannot start a template')
  assert.equal((await f.request('/app/templates',{headers:{Cookie:cookie}})).status,403)
 }
 assert.equal((await f.request('/app/templates',{headers:{Cookie:admin}})).status,200,'Admins retain their existing draft preparation authority')
 assert.equal((await json('/api/pane/prepare',{site:fixture},member)).status,403)
 assert.equal((await json('/api/pane/review',{page:'home'},member)).status,403)
 assert.equal((await json('/api/pane/publish',{revision:'missing'},admin)).status,403)
 assert.equal((await json('/api/pane/prepare',{site:fixture},owner,{Origin:'https://elsewhere.invalid'})).status,403)
 assert.equal((await data()).revisions.length,0)
 for(const path of ['/site/contact','/site/visit']){
  assert.equal((await f.request(path,{method:'POST',headers:{Origin:'https://elsewhere.invalid'}})).status,403,'ACCESS-002: unpublished forms also refuse foreign origins')
 }
})
test('PRESENT-001: five pages preview with a draft banner and publish without product branding',async()=>{
 const r=await json('/api/pane/prepare',{site:fixture},admin);assert.equal(r.status,200,await r.clone().text());first=await r.json()
 assert.equal((await f.request('/preview/'+first.id+'/home',{redirect:'manual'})).status,303)
 assert.equal((await f.request('/preview/'+first.id+'/home',{headers:{Cookie:member}})).status,403)
 const preview=await f.request('/preview/'+first.id+'/home',{headers:{Cookie:admin}}),previewHtml=await preview.text();assert.match(previewHtml,new RegExp(fixture.name));assert.match(previewHtml,/class="preview-banner"/)
 assert.equal((await json('/api/pane/publish',{revision:first.id})).status,200)
 for(const page of fixture.pages){const p=await f.request(page.slug==='home'?'/site':'/site/'+page.slug);assert.equal(p.status,200);const html=await p.text();assert.ok(html.includes(page.title));assert.ok(html.includes(`<title>${fixture.name}</title>`));assert.doesNotMatch(html,/\bPane\b|\/brand\/|rel="(?:icon|apple-touch-icon|manifest)"|preview-banner/)}
 const d=await data();assert.equal(d.live.id,first.id);assert.equal(d.approvals[0].revision,first.id);assert.equal(d.approvals[0].actor,Object.keys(d.people).find(id=>d.people[id]==='Riverbend owner'),'Publication records the exact approving native owner')
})
test('private selected previews refuse visitors and members and keep ordinary and typed contact sending inert',async()=>{
 const origin='https://pane.example.test',outbound=[]
 const app=await runtime({bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-preview',MAIL_FROM:['synthetic-pane-preview','example.test'].join('@')},observeOutbound:request=>outbound.push(new URL(request.url).hostname),outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.sendgrid.com');return new Response(null,{status:202})}})
 const request=(path,options)=>app.request(origin+path,options)
 const post=(path,body,cookie='')=>request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const state=async cookie=>(await request('/api/pane',{headers:{Cookie:cookie}})).json()
 const stableHtml=html=>html.replace(/name="idempotency" value="[^"]*"/g,'name="idempotency"')
 try{
  const ownerCookie=(await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic preview owner'})).headers.get('set-cookie').split(';')[0]
  let invitation
  const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:false},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{invitation=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  const cookies={}
  for(const role of ['admin','member']){
   await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:ownerCookie}}),{email:['synthetic-pane-preview-'+role,'example.test'].join('@'),displayName:'Synthetic preview '+role,role})
   const token=new URL(invitation.text.match(/https?:\/\/[^\s]+/)[0]).searchParams.get('token')
   cookies[role]=(await post('/auth/confirm',{token})).headers.get('set-cookie').split(';')[0]
  }
  const source=structuredClone(fixture)
  source.forms=[{id:'synthetic-pane-preview',name:'Preview project request',submit:'Send project request',confirmation:'Request received.',fields:[
   {key:'name',type:'text',label:'Project name',help:'',placeholder:'',required:true},
   {key:'email',type:'email',label:'Reply address',help:'',placeholder:'',required:true},
   {key:'message',type:'text',label:'Project details',help:'',placeholder:'',required:true},
  ]}]
  source.pages.find(page=>page.slug==='about').formId=source.forms[0].id
  for(const page of source.pages.filter(page=>['about','contact'].includes(page.slug)))page.acknowledgment={subject:'Preview enquiry received',text:'We will review your request.',responseTime:'Two business days'}
  const prepared=await post('/api/pane/prepare',{site:source},ownerCookie);assert.equal(prepared.status,200,await prepared.clone().text());const selected=await prepared.json()
  assert.ok(selected.id)
  assert.equal(selected.hash,createHash('sha256').update(JSON.stringify(selected.site)).digest('hex'))
  assert.equal((await post('/api/pane/publish',{revision:selected.id},ownerCookie)).status,200)
  const livePages=await Promise.all(['about','contact'].map(async slug=>{
   const html=await(await request('/site/'+slug)).text();assert.match(html,/<fieldset>/);return stableHtml(html)
  }))
  const baseline=await state(ownerCookie),mailBefore=await app.db.prepare('SELECT COUNT(*) AS total FROM rer_mail_development_outbox').first(),requestsBefore=outbound.length
  for(const slug of ['about','contact']){
   const path='/preview/'+selected.id+'/'+slug
   const signedOut=await request(path),memberPage=await request(path,{headers:{Cookie:cookies.member}})
   assert.equal(signedOut.status,303);assert.equal(memberPage.status,403)
   for(const response of [signedOut,memberPage])assert.ok(!(await response.text()).includes(source.pages.find(page=>page.slug===slug).body),'Refusal contains no draft content')
   for(const cookie of [ownerCookie,cookies.admin]){
    const response=await request(path,{headers:{Cookie:cookie}}),html=await response.text()
    assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private|no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/)
    assert.ok(html.includes(source.pages.find(page=>page.slug===slug).body));assert.match(html,/class="preview-banner"/)
    assert.match(html,/<fieldset disabled>[\s\S]*<button type="submit">/)
    assert.equal(html.includes('data-typed-form'),slug==='about')
    assert.doesNotMatch(html,/data-turnstile-key|pane-turnstile\.js|pane-forms\.js|pane-tracker\.js/)
   }
   // A direct submission to the private preview door is inert too.
   const response=await request(path,{method:'POST',headers:{Cookie:cookies.admin,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Synthetic preview request',email:['synthetic-pane-preview','example.test'].join('@'),message:'Must remain unsent','cf-turnstile-response':'synthetic-pane-3:'+createHash('sha256').update(slug).digest('hex')})})
   assert.equal(response.status,200)
  }
  assert.deepEqual(await state(ownerCookie),baseline,'Preview reads and attempted sends change no enquiries, approvals, visits or live state')
  assert.equal(outbound.length,requestsBefore,'No preview verification or notification request occurs')
  assert.deepEqual(await app.db.prepare('SELECT COUNT(*) AS total FROM rer_mail_development_outbox').first(),mailBefore)
  const changed=structuredClone(selected.site);changed.pages.find(page=>page.slug==='contact').body='Newer contact draft only.';changed.forms[0].name='Newer project request only.'
  const newer=await(await post('/api/pane/prepare',{site:changed,base:selected.id},ownerCookie)).json();assert.ok(newer.id);assert.notEqual(newer.id,selected.id)
  for(const slug of ['about','contact']){
   const html=await(await request('/preview/'+selected.id+'/'+slug,{headers:{Cookie:cookies.admin}})).text()
   assert.ok(html.includes(selected.site.pages.find(page=>page.slug===slug).body));assert.doesNotMatch(html,/Newer contact draft only|Newer project request only/)
  }
  const current=await state(ownerCookie);assert.deepEqual(current.revisions.find(row=>row.id===selected.id),selected);assert.deepEqual(current.live,baseline.live)
  assert.deepEqual(await Promise.all(['about','contact'].map(async slug=>stableHtml(await(await request('/site/'+slug)).text()))),livePages)
  // Positive control: the separately approved live forms still accept real native submissions.
  for(const slug of ['contact','about']){
   const response=await request('/site/'+slug,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Synthetic live request',email:['synthetic-pane-preview','example.test'].join('@'),message:'A separately submitted live enquiry','cf-turnstile-response':'synthetic-pane-3:'+createHash('sha256').update(slug).digest('hex')})})
   assert.equal(response.status,303,await response.text())
  }
  assert.equal((await state(ownerCookie)).messages.length,2)
  assert.equal(outbound.length,requestsBefore+4,'Only live submissions request verification and notifications')
  assert.equal(outbound.filter(host=>host==='api.sendgrid.com').length,2,'The live positive control exercises notification delivery')
  assert.ok((await state(ownerCookie)).messages.every(row=>row.acknowledgment_status==='accepted'),'Both live notification outcomes are retained')
  const operators=await(await request('/auth/operators',{headers:{Cookie:ownerCookie}})).json(),admin=operators.find(row=>row.role==='admin')
  assert.equal((await post('/api/pane/team/revoke',{operatorId:admin.id,confirm:'revoke-access'},ownerCookie)).status,200)
  for(const slug of ['contact','about']){
   const refused=await request('/preview/'+selected.id+'/'+slug,{headers:{Cookie:cookies.admin}})
   assert.equal(refused.status,303);assert.ok(!(await refused.text()).includes(selected.site.pages.find(row=>row.slug===slug).body),'A revoked session cannot reopen the private source')
  }
  assert.deepEqual((await state(ownerCookie)).live,baseline.live)
 }finally{await app.mf.dispose()}
})
test('ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy',async()=>{
 const before=await data(),foreign='https://elsewhere.invalid'
 for(const originHeader of [{},{Origin:foreign},{Origin:'null'}]){
  for(const prefix of ['/api/pane/','/app/'])for(const action of ['prepare','publish','rollback','review','page-request-review','page-publish','messages/erase','privacy/find','privacy/export','privacy/erase','ownership/transfer','team/revoke','policies/generate','import/dry-run','import/apply','import/undo']){
   const response=await f.request(prefix+action,{method:'POST',headers:{Cookie:owner,'Content-Type':'application/json',...originHeader},body:JSON.stringify({site:fixture,revision:first.id,id:crypto.randomUUID(),source:JSON.stringify(fixture)})})
   assert.equal(response.status,403,prefix+action)
  }
  assert.equal((await f.request('/site/contact',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...originHeader},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:crypto.randomUUID(),name:'Avery',email:'avery@example.test',message:'A cross-origin enquiry'})})).status,403)
  assert.equal((await f.request('/site/visit',{method:'POST',headers:{'Content-Type':'application/json',...originHeader},body:JSON.stringify({path:'home'})})).status,403)
 }
 // A matching Origin on an alternate hostname must not redefine the installation.
 for(const headerOrigin of [foreign,origin]){
  assert.equal((await f.request(foreign+'/site/contact',{method:'POST',headers:{Origin:headerOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:crypto.randomUUID(),name:'Avery',email:'avery@example.test',message:'An alternate-host enquiry'})})).status,403)
  assert.equal((await f.request(foreign+'/site/visit',{method:'POST',headers:{Origin:headerOrigin,'Content-Type':'application/json'},body:JSON.stringify({path:'home'})})).status,403)
 }
 assert.deepEqual(await data(),before,'Rejected mutations must not change revisions, approvals, imports, inbox or visits')
 contactId=crypto.randomUUID()
 const body=new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:contactId,name:'Avery <script>',email:'avery@example.test',message:'Can you cater our opening?',website:''})
 const send=()=>f.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'})
 assert.equal((await send()).status,303);assert.equal((await send()).status,303)
 const d=await data();assert.equal(d.messages.length,1);assert.equal(d.messages[0].message,'Can you cater our opening?')
 const html=await (await f.request('/app/inquiries',{headers:{Cookie:owner}})).text();assert.ok(html.includes('Avery &lt;script&gt;'))
 assert.equal((await json('/site/visit',{path:'home'},'',{DNT:'1'})).status,204)
 assert.equal((await json('/site/visit',{path:'home'},'')).status,204)
 assert.equal((await data()).visits.find(v=>v.path==='home').count,1)
 oldArchive=await exportData(f.db)
})
test('later change and rollback restore the exact immutable site with recorded decisions',async()=>{
 const site=structuredClone(fixture);site.pages[0].body='Open late on Fridays. Freshly updated.'
 const original=structuredClone(first)
 second=await (await json('/api/pane/prepare',{site})).json()
 const changed=structuredClone(second)
 const retained=async()=>{const state=await data();for(const expected of [original,changed])assert.deepEqual(state.revisions.find(row=>row.id===expected.id),expected,'Later prepare, publication and rollback preserve each source snapshot and hash')}
 await retained()
 assert.equal((await json('/api/pane/publish',{revision:second.id})).status,200)
 await retained()
 assert.ok((await (await f.request('/site')).text()).includes('Open late on Fridays.'))
 assert.equal((await json('/api/pane/rollback',{revision:first.id})).status,200)
 await retained()
 assert.ok(!(await (await f.request('/site')).text()).includes('Open late on Fridays.'))
 assert.equal((await data()).approvals.filter(a=>a.action==='rollback').length,1)
 const never=await (await json('/api/pane/prepare',{site:{...fixture,name:'Riverbend never live'}})).json()
 await retained()
 const refused=await json('/api/pane/rollback',{revision:never.id});assert.equal(refused.status,400);assert.match((await refused.json()).error,/Approve and publish/)
 assert.equal((await data()).live.id,first.id)
})
test('the editor prepares one page over the revision it opened, and every screen opens',async()=>{
 const form=(path,body,cookie=admin)=>f.request(path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie},body:new URLSearchParams(body),redirect:'manual'})
 const base=(await data()).draft
 const r=await form('/app/prepare',{idempotency:crypto.randomUUID(),base:base.id,slug:'hours','page.hours.title':'Hours and parking','page.hours.body':'Open daily from 7 AM.\r\n\r\nPark behind the building.'})
 assert.equal(r.status,303);assert.match(r.headers.get('location'),/^\/app\?page=hours&notice=/)
 const draft=(await data()).draft;assert.notEqual(draft.id,base.id);assert.equal(draft.site.name,base.site.name)
 assert.deepEqual(draft.site.pages.find(p=>p.slug==='hours'),{slug:'hours',title:'Hours and parking',body:'Open daily from 7 AM.\n\nPark behind the building.'})
 assert.deepEqual(draft.site.pages.filter(p=>p.slug!=='hours'),base.site.pages.filter(p=>p.slug!=='hours'))
 assert.equal((await form('/app/prepare',{idempotency:crypto.randomUUID(),base:base.id,slug:'hours','page.hours.title':'Hours','page.hours.body':''})).status,400)
 for(const path of ['/app','/app?page=hours','/app/sites','/app/inquiries','/app/moves']){const page=await f.request(path,{headers:{Cookie:member}});assert.equal(page.status,200,path);assert.match(await page.text(),/aria-current="page"/)}
 assert.equal((await f.request('/app/elsewhere',{headers:{Cookie:owner}})).status,404)
})
test('PAGE-006: autosave persists an immutable draft, rejects stale and simultaneous edits, and keeps publication separate',async()=>{
 const save=(base,body,cookie=admin,originHeader=origin)=>f.request('/app/autosave',{method:'POST',headers:{Origin:originHeader,'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie??''},body:new URLSearchParams({base,slug:'services','page.services.body':body})})
 const before=await data(),base=before.draft,body='Repairs, refinishing and custom cabinets.'
 assert.equal((await save(base.id,body,'')).status,303)
 assert.equal((await save(base.id,body,member)).status,403)
 assert.equal((await save(base.id,body,admin,'https://elsewhere.invalid')).status,403)
 const result=await save(base.id,body);assert.equal(result.status,200);const draft=await result.json()
 assert.equal(draft.site.pages.find(p=>p.slug==='services').body,body)
 assert.deepEqual((await data()).live.site,before.live.site)
 assert.ok((await (await f.request('/app?page=services',{headers:{Cookie:admin}})).text()).includes(body),'Reopening the editor reads the saved draft')
 const stale=await save(base.id,'A conflicting edit');assert.equal(stale.status,409)
 assert.equal((await stale.json()).latest.site.pages.find(p=>p.slug==='services').body,body)
 assert.deepEqual((await data()).draft.site,draft.site)
 // Both requests saw the same base; exactly one compare-and-insert may succeed.
 const raced=await Promise.all([save(draft.id,'First concurrent draft'),save(draft.id,'Second concurrent draft',owner)])
 assert.deepEqual(raced.map(r=>r.status).sort(),[200,409])
 const winner=await raced.find(r=>r.status===200).json()
 assert.deepEqual((await data()).draft.site,winner.site)
 const merged=await save(winner.id,'First and second changes merged')
 assert.equal(merged.status,200)
 const after=await data()
 assert.equal(after.draft.site.pages.find(p=>p.slug==='services').body,'First and second changes merged')
 assert.deepEqual(after.revisions.find(r=>r.id===base.id).site,base.site,'Autosave never rewrites its base')
 assert.deepEqual(after.live.site,before.live.site)
})
test('move-in dry run requires reviewed fingerprint, applies inert draft and journals undo',async()=>{
 const source=JSON.stringify({...fixture,name:'Riverbend imported'})
 const before=await data(),custody=await moveInSnapshot(f.db)
 const plan=await json('/api/pane/import/dry-run',{source},admin);assert.equal(plan.status,200,await plan.clone().text());const p=await plan.json()
 assert.deepEqual(await moveInSnapshot(f.db),custody,'Dry run creates no native revision or import journal')
 assert.equal((await json('/api/pane/import/apply',{source,fingerprint:'wrong'},admin)).status,400)
 assert.deepEqual(await moveInSnapshot(f.db),custody,'Wrong fingerprint leaves content and custody unchanged')
 const applied=await json('/api/pane/import/apply',{source,fingerprint:p.fingerprint},admin);assert.equal(applied.status,200,await applied.clone().text());importJob=await applied.json();assert.equal(importJob.state,'completed')
 const imported=await data(),retained=await moveInSnapshot(f.db)
 assert.equal(imported.live.id,first.id);assert.equal(imported.draft.id,importJob.report.revision)
 const replay=await json('/api/pane/import/apply',{source,fingerprint:p.fingerprint},admin);assert.equal(replay.status,200);assert.equal((await replay.json()).id,importJob.id)
 assert.deepEqual((await data()).revisions,imported.revisions,'Reviewed replay creates no second revision')
 assert.equal((await json('/api/pane/import/undo',{job:importJob.id},member)).status,403)
 assert.deepEqual(await moveInSnapshot(f.db),retained,'Member refusal leaves the retained originals and journal unchanged')
 const undone=await json('/api/pane/import/undo',{job:importJob.id},admin);assert.equal(undone.status,200,await undone.clone().text());assert.equal((await undone.json()).state,'undone')
 assert.equal((await data()).draft.id,before.draft.id)
 assert.ok((await data()).imports.some(j=>j.id===importJob.id&&j.state==='undone'))
 const reversed=await moveInSnapshot(f.db)
 assert.deepEqual(reversed.ik_originals,retained.ik_originals,'Successful undo retains the exact source bytes')
 assert.ok(reversed.ik_batches.some(batch=>batch.job_id===importJob.id&&batch.action==='undo'),'Successful undo keeps its reversal journal')
 for(const mode of ['published','edited']){
  const source=JSON.stringify({...fixture,name:'synthetic-pane-'+mode})
  const plan=await (await json('/api/pane/import/dry-run',{source},admin)).json()
  const response=await json('/api/pane/import/apply',{source,fingerprint:plan.fingerprint},admin);assert.equal(response.status,200,await response.clone().text())
  const job=await response.json(),imported=(await data()).draft
  if(mode==='published')assert.equal((await json('/api/pane/publish',{revision:imported.id})).status,200)
  else {
   const save=await f.request('/app/autosave',{method:'POST',headers:{Origin:origin,Cookie:admin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:imported.id,slug:'home','page.home.body':'synthetic-pane-1 ordinary saved edit'})})
   assert.equal(save.status,200,await save.clone().text());assert.notEqual((await save.json()).id,imported.id)
  }
  const state=await data(),snapshot=await moveInSnapshot(f.db)
  assert.deepEqual(state.revisions.find(row=>row.id===imported.id),imported,'Publication and ordinary editing preserve the imported source revision and hash')
  const refused=await json('/api/pane/import/undo',{job:job.id},admin)
  assert.equal(refused.status,400,'Undo must refuse an import that is '+mode)
  assert.match((await refused.json()).error,mode==='published'?/published/:/newer draft/)
  const after=await data()
  for(const field of ['draft','live','revisions','approvals','imports'])assert.deepEqual(after[field],state[field],mode+' refusal preserves '+field)
  assert.deepEqual(await moveInSnapshot(f.db),snapshot,mode+' refusal preserves exact content, originals and every import journal')
  const report=await json('/api/pane/import/dry-run',{job:job.id},admin);assert.equal(report.status,200);assert.equal((await report.json()).report.phase,'applied')
  if(mode==='published'){
   assert.equal((await json('/api/pane/rollback',{revision:first.id})).status,200)
   assert.equal((await json('/api/pane/import/undo',{job:job.id},admin)).status,200,'An unchanged import becomes eligible after another revision is published')
  }
 }

})
test('owner erasure removes personal data and prevents submission replay',async()=>{
 assert.equal((await json('/api/pane/messages/erase',{id:contactId},admin)).status,403)
 assert.equal((await json('/api/pane/messages/erase',{id:contactId})).status,200)
 assert.equal((await data()).messages.length,0)
 await f.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:contactId,name:'Avery',email:'avery@example.test',message:'Replay'})})
 assert.equal((await data()).messages.length,0)
 laterArchive=await exportData(f.db)
})
test('archive transport restores data into empty D1 and rejects an erased older backup',async()=>{
 const destination=await runtime()
 try {
  const status=await restore(destination.db,laterArchive);assert.equal(status.phase,'complete')
  const live=await destination.db.prepare('SELECT r.site FROM pane_revisions r JOIN pane_state s ON s.live=r.id').first();assert.equal(JSON.parse(live.site).name,fixture.name)
  assert.equal((await destination.db.prepare('SELECT COUNT(*) AS n FROM pane_messages').first()).n,0)
  assert.ok((await destination.db.prepare('SELECT COUNT(*) AS n FROM ik_jobs').first()).n>0)
 }finally{await destination.mf.dispose()}
 const empty=await runtime()
 try{await assert.rejects(restore(empty.db,oldArchive,laterArchive),/erased_row|erasure_epoch/)}finally{await empty.mf.dispose()}
})
test('deactivated credentials lose access to direct product commands',async()=>{
 const operators=await (await f.request('/auth/operators',{headers:{Cookie:owner}})).json();const user=operators.find(o=>o.role==='admin')
 assert.equal((await json('/auth/operator/status',{operatorId:user.id,status:'inactive'})).status,200)
 assert.equal((await json('/api/pane/prepare',{site:fixture},admin)).status,401)
})

test('an approved form acknowledgment reaches the provider once with owner wording and durable independent status', async () => {
 const hosted = 'https://pane.example.test', deliveries = []
 let providerStatus = 202
 const app = await runtime({bindings: {AUTH_ORIGIN: hosted, AUTH_LOCAL: 'false', MAIL_PROVIDER: 'sendgrid', MAIL_API_KEY: 'synthetic-pane-1', MAIL_FROM: 'studio@example.test'}, outboundService: async request => {
  assert.equal(request.url, 'https://api.sendgrid.com/v3/mail/send')
  assert.equal(request.method, 'POST')
  deliveries.push(await request.json())
  return new Response(null, {status: providerStatus, headers: {'x-message-id': 'synthetic-pane-2'}})
 }})
 let cookie = ''
 const call = (path, body, extra = {}) => app.request(hosted + path, {method: 'POST', headers: {Cookie: cookie, Origin: hosted, 'Content-Type': 'application/json', ...extra}, body: JSON.stringify(body)})
 const dashboard = async () => (await app.request(hosted + '/api/pane', {headers: {Cookie: cookie}})).json()
 const submit = (id, email = 'avery@example.test') => app.request(hosted + '/site/contact', {method: 'POST', headers: {Origin: hosted, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency: id, name: 'Avery', email, message: 'Visitor text must stay in the inbox.'})})
 const prepare = async site => {const r = await call('/api/pane/prepare', {site}); assert.equal(r.status, 200); return r.json()}
 try {
  const signed = await call('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Acknowledgment owner'})
  assert.equal(signed.status, 303)
  cookie = signed.headers.get('set-cookie').split(';')[0]
  assert.equal((await app.request(hosted + '/setup', {method: 'POST', headers: {Cookie: cookie, Origin: hosted, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})).status, 303)
  const original = await prepare(fixture)
  await call('/api/pane/publish', {revision: original.id})
  const disabled = crypto.randomUUID()
  assert.equal((await submit(disabled)).status, 303)
  assert.equal(deliveries.length, 0)
  const site = structuredClone(fixture)
  const acknowledgment = {subject: 'Thank you from Cedar Street', text: 'We received your request and will review it with our workshop team.', responseTime: 'Within two business days'}
  site.pages.find(page => page.slug === 'contact').acknowledgment = acknowledgment
  const draft = await prepare(site)
  assert.equal((await submit(crypto.randomUUID())).status, 303)
  assert.equal(deliveries.length, 0, 'An unpublished acknowledgment never sends')
  await call('/api/pane/publish', {revision: draft.id})
  const id = crypto.randomUUID()
  const repeated = await Promise.all([submit(id), submit(id)])
  assert.deepEqual(repeated.map(response => response.status), [303, 303])
  assert.equal(deliveries.length, 1)
  assert.equal(deliveries[0].subject, acknowledgment.subject)
  assert.deepEqual(deliveries[0].personalizations[0].to, [{email: 'avery@example.test'}])
  assert.equal(deliveries[0].content.find(part => part.type === 'text/plain').value, acknowledgment.text + '\n\nExpected response time: ' + acknowledgment.responseTime)
  assert.doesNotMatch(JSON.stringify(deliveries[0]), /Visitor text must stay/)
  let stored = (await dashboard()).messages.filter(message => message.id === id)
  assert.equal(stored.length, 1)
  assert.equal(stored[0].acknowledgment_status, 'accepted')
  assert.equal(stored[0].acknowledgment_provider, 'sendgrid')
  assert.equal(stored[0].acknowledgment_provider_id, 'synthetic-pane-2')
  assert.equal((await submit(id, 'different@example.test')).status, 303)
  assert.equal(deliveries.length, 1, 'A replay cannot change the sender or send again')
  assert.equal((await dashboard()).messages.find(message => message.id === id).email, 'avery@example.test')
  for (const [status, expected] of [[400, 'failed'], [503, 'uncertain']]) {
   providerStatus = status
   const failed = crypto.randomUUID()
   assert.equal((await submit(failed)).status, 303)
   stored = (await dashboard()).messages.filter(message => message.id === failed)
   assert.equal(stored[0].acknowledgment_status, expected)
   assert.equal(stored[0].message, 'Visitor text must stay in the inbox.')
   const count = deliveries.length
   await submit(failed)
   assert.equal(deliveries.length, count, 'A failed or uncertain provider attempt is not automatically replayed')
  }
  const inbox = await app.request(hosted + '/app/inquiries', {headers: {Cookie: cookie}})
  const html = await inbox.text()
  assert.match(html, /Accepted by provider/)
  assert.match(html, /uncertain/)
  assert.match(html, /failed/)
  assert.equal((await call('/api/pane/messages/erase', {id})).status, 200)
  const count = deliveries.length
  await submit(id)
  assert.equal(deliveries.length, count)
  assert.equal((await dashboard()).messages.some(message => message.id === id), false)
 } finally { await app.mf.dispose() }
 // Development exercises the same public door while the shared mail adapter suppresses sends.
 const localSite = structuredClone(fixture)
 localSite.pages.find(page => page.slug === 'contact').acknowledgment = {subject: 'Thanks', text: 'We have your message.', responseTime: 'Two days'}
 const localDraft = await (await json('/api/pane/prepare', {site: localSite})).json()
 await json('/api/pane/publish', {revision: localDraft.id})
 const localId = crypto.randomUUID()
 await f.request('/site/contact', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency: localId, name: 'Avery', email: 'avery@example.test', message: 'Local proof'})})
 assert.equal((await data()).messages.find(message => message.id === localId).acknowledgment_status, 'suppressed')
})

test('one visitor\'s burst of enquiries is refused without blocking other visitors, and retried enquiries are not charged again',async()=>{
 // Both intake doors: D1 directly, and the independent queue behind the published snapshot.
 for(const isolatedLive of [false,true]) {
  const app=await runtime({isolatedLive}),door=isolatedLive?' (queued intake)':' (direct intake)';let cookie
  const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const submit=(visitor,id=crypto.randomUUID())=>app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':visitor},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:id,name:'synthetic-pane-1',email:'synthetic-pane-1@example.test',message:'synthetic-pane-2'})})
  try {
   cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
   const draft=await (await call('/api/pane/prepare',{site:fixture})).json()
   assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
   // Addresses inside one IPv6 /64 are one visitor; 41 attempts exceed its limit even when a minute boundary splits them.
   const burst=[];for(let i=1;i<=41;i++)burst.push((await submit('2001:db8:1:2::'+i.toString(16))).status)
   assert.ok(burst.includes(429),'A burst from one visitor is refused'+door);assert.ok(burst.every(status=>status===303||status===429),door)
   for(const visitor of ['2001:db8:1:3::1','192.0.2.7'])assert.equal((await submit(visitor)).status,303,'Another visitor still reaches the inbox'+door)
   const retried=crypto.randomUUID()
   for(let i=0;i<21;i++)assert.equal((await submit('192.0.2.8',retried)).status,303,'A retried enquiry is answered again'+door)
   assert.equal((await submit('192.0.2.8')).status,303,'Retries do not spend the visitor\'s quota'+door)
   if(isolatedLive)assert.equal((await (await app.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'* * * * *'})).outcome,'ok')
   const messages=(await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).messages
   assert.equal(messages.filter(message=>message.id===retried).length,1,door)
  } finally {await app.mf.dispose()}
 }
})

test('traffic groups real public visit events without retaining raw referrers or unapproved identifiers and excludes privacy opt-outs', async () => {
 const app = await runtime({cf: {country: 'US', regionCode: 'CO', city: 'Denver'}})
 let cookie = ''
 const post = (path, body) => app.request(path, {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 const dashboard = async () => (await app.request('/api/pane', {headers: {Cookie: cookie}})).json()
 const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile'
 const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'
 const visit = async (body, agent = desktop, headers = {}) => { const response = await app.request('/site/visit', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'User-Agent': agent, 'CF-Connecting-IP': '203.0.113.25', ...headers}, body: JSON.stringify({path: 'home', ...body})}); assert.equal(response.headers.get('set-cookie'), null, 'Public visit responses never set a cookie'); return response }
 const has = (traffic, dimension, label, count = 1) => assert.ok(traffic[dimension].some(row => row.label === label && row.count === count), `${dimension}: ${label} = ${count}`)
 try {
  cookie = (await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Traffic owner'})).headers.get('set-cookie').split(';')[0]
  await app.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
  // Run the real upgrade against pre-attribution aggregates; merged channels
  // retain every count, without inventing domains or UTM attribution.
  await app.db.prepare('DROP TABLE pane_visits').run()
  const legacy = (await readFile('migrations/core/0018_visit_dimensions.sql', 'utf8')).split('INSERT INTO')[0].replace('pane_visits_dimensions', 'pane_visits')
  await app.db.prepare(legacy).run()
  for (const [source, count] of [['Google', 2], ['Bing', 3], ['Facebook', 4], ['Instagram', 5]]) await app.db.prepare("INSERT INTO pane_visits(day,path,source,count) VALUES('2026-10-20','home',?,?)").bind(source, count).run()
  const migration = (await readFile('migrations/core/0020_visit_attribution.sql', 'utf8')).split(';').filter(sql => sql.trim())
  await app.db.batch(migration.map(sql => app.db.prepare(sql)))
  const historical = await dashboard()
  assert.deepEqual(historical.visits, [{path: 'home', count: 14}])
  assert.deepEqual(historical.traffic.source, [{label: 'Social', count: 9}, {label: 'Search', count: 5}])
  for (const dimension of ['referrer', 'medium', 'campaignSource']) assert.deepEqual(historical.traffic[dimension], [{label: '', count: 14}])
  await app.db.prepare('DELETE FROM pane_visits').run()
  const first = await (await post('/api/pane/prepare', {site: fixture})).json()
  await post('/api/pane/publish', {revision: first.id})
  const site = {...fixture, analyticsCampaigns: ['spring-open-house', 'summer-workshop']}
  const prepared = await (await post('/api/pane/prepare', {site})).json()
  await visit({campaign: 'spring-open-house', utm_source: 'spring-open-house'})
  assert.deepEqual((await dashboard()).traffic.campaign, [{label: 'Unapproved campaign tag', count: 1}], 'Draft labels cannot authorize retention')
  assert.deepEqual((await dashboard()).traffic.campaignSource, [{label: '', count: 1}], 'Draft source labels cannot authorize retention')
  await post('/api/pane/publish', {revision: prepared.id})
  const cases = [
   [{referrerHost: 'https://www.yelp.com:8443/biz/synthetic-pane-1?private=synthetic-pane-2', campaign: 'SPRING-OPEN-HOUSE'}, phone, 'Local and review', 'yelp.com'],
   [{path: 'about', referrerHost: 'https://chatgpt.com/c/synthetic-pane-3'}, desktop, 'AI assistants', 'chatgpt.com'],
   [{referrerHost: 'answers.perplexity.ai'}, desktop, 'AI assistants', 'perplexity.ai'],
   [{referrerHost: 'www.nextdoor.com'}, desktop, 'Local and review', 'nextdoor.com'],
   [{referrerHost: 'www.google.co.uk'}, desktop, 'Search', 'google.co.uk'],
   [{referrerHost: 'www.facebook.com', campaign: 'summer-workshop'}, desktop, 'Social', 'facebook.com'],
   [{referrerHost: 'https://mail.google.com/mail/u/0/#synthetic-pane-4'}, desktop, 'Email', 'google.com'],
   [{referrerHost: 'blog.mozilla.org'}, desktop, 'Other website', 'mozilla.org'],
   [{referrerHost: 'synthetic-pane-5.github.io'}, desktop, 'Other website', 'synthetic-pane-5.github.io'],
   [{utm_medium: 'EMAIL', utm_source: 'summer-WORKSHOP'}, desktop, 'Email', ''],
   [{utm_medium: 'cpc', utm_source: 'GOOGLE'}, desktop, 'Search', ''],
   [{campaign: 'synthetic-pane-6', utm_source: 'synthetic-pane-7', utm_medium: 'synthetic-pane-8', utm_term: 'synthetic-pane-9', utm_content: 'synthetic-pane-10'}, desktop, 'Other website', ''],
   ...['social', 'display', 'referral', 'affiliate'].map(medium => [{utm_medium: medium}, desktop, medium === 'social' ? 'Social' : 'Other website', '']),
   [{}, desktop, 'Direct', ''],
   [{campaignTagged: true}, desktop, 'Direct', ''],
  ]
  for (const [body, agent, channel, domain] of cases) {
   assert.equal((await visit(body, agent)).status, 204)
   const row = (await app.db.prepare('SELECT * FROM pane_visits WHERE path=? AND source=? AND referrer=?').bind(body.path ?? 'home', channel, domain).all()).results
   assert.ok(row.length, JSON.stringify({channel, domain}))
  }
  for (const host of ['https://203.0.113.25/private', '192.168.1.1', '[::1]', 'http://[2001:db8::1]:8080/private', 'localhost', 'printer', 'router.local', 'workspace.internal', 'https://private.example/path', 'file:///etc/passwd', 'malformed host']) {
   assert.equal((await visit({referrerHost: host})).status, 204)
  }
  const data = await dashboard(), total = 1 + cases.length + 11
  assert.deepEqual(data.visits, [{path: 'about', count: 1}, {path: 'home', count: total - 1}])
  has(data.traffic, 'referrer', 'Unknown', 11)
  has(data.traffic, 'campaign', 'spring-open-house')
  has(data.traffic, 'campaign', 'summer-workshop')
  has(data.traffic, 'campaign', 'Unapproved campaign tag', 3)
  has(data.traffic, 'campaign', '', total - 5)
  for (const medium of ['email', 'paid search', 'social', 'display', 'referral', 'affiliate', 'other']) has(data.traffic, 'medium', medium)
  has(data.traffic, 'campaignSource', 'summer-workshop'); has(data.traffic, 'campaignSource', 'Google')
  has(data.traffic, 'device', 'phone'); has(data.traffic, 'device', 'desktop', total - 1)
  assert.deepEqual(data.traffic.location, [{label: 'US-CO', count: total}])
  assert.deepEqual(data.traffic.day, [{label: new Date().toISOString().slice(0, 10), count: total}])
  const tables = (await app.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.filter(({name}) => !name.startsWith('_cf_') && !name.startsWith('sqlite_'))
  const snapshot = async () => Promise.all(tables.map(async ({name}) => [name, (await app.db.prepare(`SELECT * FROM "${name}"`).all()).results]))
  const before = await snapshot()
  for (const privacy of [{'Sec-GPC': '1'}, {DNT: '1'}]) assert.equal((await visit({referrerHost: 'www.yelp.com', campaign: 'synthetic-pane-11'}, phone, privacy)).status, 204)
  assert.deepEqual(await snapshot(), before, 'GPC/DNT write zero rows to every application table, including rate limits')
  // Read the dashboard after the zero-write proof: API-001 logs this owner API call.
  assert.deepEqual(await dashboard(), data, 'Privacy opt-outs cause no counter write')
  assert.doesNotMatch(JSON.stringify(before), /synthetic-pane-(?:[1-4]|[6-9]|10)(?!\d)|203\.0\.113\.25|Mozilla|Denver|private\.example|www\.yelp|:8443|utm_term|utm_content/)
  const html = await (await app.request('/app/sites', {headers: {Cookie: cookie}})).text()
  for (const label of ['yelp.com', 'chatgpt.com', 'Local and review', 'AI assistants', 'Email', 'spring-open-house', 'Unapproved campaign tag', 'US-CO']) assert.ok(html.includes(label), label)
  assert.equal((await app.request('/api/pane')).status, 401)
 } finally { await app.mf.dispose() }
})

test('conversion goals count quote-form submissions and phone clicks by page, channel and campaign with a funnel, never for opt-outs or replays', async () => {
 const app = await runtime({cf: {country: 'US', regionCode: 'CO'}})
 let cookie = ''
 const post = (path, body, headers = {}) => app.request(path, {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body)})
 const dashboard = async () => (await app.request('/api/pane', {headers: {Cookie: cookie}})).json()
 const visit = (body, headers = {}) => app.request('/site/visit', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', ...headers}, body: JSON.stringify({path: 'contact', ...body})})
 const tap = (body, headers = {}) => app.request('/site/visit/goal', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', ...headers}, body: JSON.stringify({path: 'home', goal: 'phone-calls', ...body})})
 const submit = (fields, headers = {}) => app.request('/site/contact', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...headers}, body: new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',name: 'Synthetic Pane', email: 'synthetic-pane@example.test', message: 'Quote please', website: '', ...fields}), redirect: 'manual'})
 const goal = (data, id) => data.goals.find(item => item.id === id)
 try {
  cookie = (await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Goal owner'})).headers.get('set-cookie').split(';')[0]
  await app.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
  const site = structuredClone(fixture)
  site.analyticsCampaigns = ['spring-open-house']
  site.pages.find(page => page.slug === 'home').links = [{label: 'Call us', url: 'tel:+13035550100'}, {label: 'Email us', url: 'mailto:hello@example.test'}]
  for (const bad of [[{name: 'Quote', type: 'form', page: 'about'}], [{name: 'Quote', type: 'form'}], [{name: 'Calls', type: 'phone', page: 'nowhere'}], [{name: 'Calls', type: 'phone'}, {name: 'calls', type: 'email'}], [{name: 'Calls', type: 'phone', target: 'example.com'}], [{name: 'Visit', type: 'view'}]]) {
   assert.equal((await post('/api/pane/prepare', {site: {...site, goals: bad}})).status, 400, JSON.stringify(bad))
  }
  assert.equal((await post('/api/pane/prepare', {site: {...site, pages: site.pages.map(page => page.slug === 'about' ? {...page, links: [{label: 'Call', url: 'tel:javascript'}]} : page)}})).status, 400)
  site.goals = [{name: 'Quote request', type: 'form', page: 'contact'}, {name: 'Phone calls', type: 'phone'}, {name: 'Partner site', type: 'outbound', target: 'example.org'}]
  const prepared = await (await post('/api/pane/prepare', {site})).json()
  assert.deepEqual(prepared.site.goals.map(item => item.id), ['quote-request', 'phone-calls', 'partner-site'])
  await post('/api/pane/publish', {revision: prepared.id})
  const live = await (await app.request('/site')).text()
  assert.match(live, /data-goals="\[[^"]*phone-calls/)
  assert.doesNotMatch(live, /quote-request/, 'A page carries only the goals that can count on it')
  const contactPage = await (await app.request('/site/contact')).text()
  assert.match(contactPage, /name="attribution"/)
  assert.match(contactPage, /quote-request/)
  // Visits are the funnel's first step; three tagged contact views, one untagged and one opt-out.
  for (let index = 0; index < 3; index++) assert.equal((await visit({campaign: 'spring-open-house', utm_medium: 'email'})).status, 204)
  assert.equal((await visit({})).status, 204)
  assert.equal((await visit({campaign: 'spring-open-house'}, {'Sec-GPC': '1'})).status, 204)
  const attribution = JSON.stringify({campaign: 'spring-open-house', campaignTagged: true, utm_medium: 'email', utm_source: 'synthetic-pane-1', referrerHost: 'https://mail.google.com/mail/u/0/'})
  const first = crypto.randomUUID()
  for (const response of [await submit({idempotency: first, attribution}), await submit({idempotency: first, attribution})]) {
   assert.equal(response.status, 303)
   assert.equal(response.headers.get('set-cookie'), null, 'Goal counting sets no cookie')
  }
  assert.equal((await submit({idempotency: crypto.randomUUID(), attribution: JSON.stringify({campaign: 'synthetic-pane-2', campaignTagged: true})})).status, 303)
  assert.equal((await submit({idempotency: crypto.randomUUID(), attribution: '{broken'})).status, 303)
  assert.equal((await submit({idempotency: crypto.randomUUID(), website: 'synthetic-pane-3', attribution})).status, 403, 'Honeypot visits are explicitly refused')
  const private_ = await submit({idempotency: crypto.randomUUID(), attribution}, {'Sec-GPC': '1'})
  assert.equal(private_.status, 303)
  let data = await dashboard()
  assert.equal(data.messages.length, 4, 'Opt-out visitors still reach the inbox')
  let quote = goal(data, 'quote-request')
  assert.deepEqual([quote.visits, quote.conversions, quote.page], [4, 3, 'contact'])
  assert.equal(quote.rate, 0.75)
  assert.deepEqual(quote.byPage, [{label: 'contact', visits: 4, conversions: 3}])
  assert.deepEqual(quote.byCampaign.map(row => [row.label, row.visits, row.conversions]), [['spring-open-house', 3, 1], ['', 1, 1], ['Unapproved campaign tag', 0, 1]])
  assert.deepEqual(quote.bySource.find(row => row.label === 'Email'), {label: 'Email', visits: 3, conversions: 1})
  // Phone clicks come from any page, on the page view where they happen.
  const click = {campaign: 'spring-open-house', campaignTagged: true, referrerHost: 'www.yelp.com'}
  for (const body of [click, click, {path: 'about', ...click}]) {
   const response = await tap(body)
   assert.equal(response.status, 204)
   assert.equal(response.headers.get('set-cookie'), null)
  }
  assert.equal((await tap({campaign: 'synthetic-pane-4'}, {DNT: '1'})).status, 204)
  assert.equal((await tap({}, {'Sec-GPC': '1'})).status, 204)
  for (const bad of [{goal: 'quote-request'}, {goal: 'missing'}, {goal: 'partner-site', path: 'nowhere'}, {goal: ['phone-calls']}]) assert.equal((await tap(bad)).status, 400, JSON.stringify(bad))
  assert.equal((await app.request('/site/visit/goal', {method: 'POST', headers: {Origin: origin}, body: 'not json'})).status, 400)
  assert.equal((await app.request('/site/visit/goal', {method: 'POST', headers: {Origin: 'https://foreign.example'}, body: '{}'})).status, 403)
  data = await dashboard()
  const phone = goal(data, 'phone-calls')
  assert.deepEqual([phone.conversions, phone.visits], [3, 4])
  assert.deepEqual(phone.byCampaign.find(row => row.label === 'spring-open-house'), {label: 'spring-open-house', visits: 3, conversions: 3})
  assert.deepEqual(phone.bySource.find(row => row.label === 'Local and review'), {label: 'Local and review', visits: 0, conversions: 3})
  assert.deepEqual(phone.byPage.map(row => [row.label, row.conversions]).filter(([, count]) => count).sort(), [['about', 1], ['home', 2]])
  assert.equal(goal(data, 'partner-site').conversions, 0)
  assert.equal(goal(data, 'partner-site').rate, 0)
  const tables = (await app.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.filter(({name}) => !name.startsWith('_cf_') && !name.startsWith('sqlite_'))
  const snapshot = JSON.stringify(await Promise.all(tables.map(async ({name}) => name.startsWith('pane_goals') || name === 'pane_visits' ? (await app.db.prepare(`SELECT * FROM "${name}"`).all()).results : [])))
  assert.doesNotMatch(snapshot, /synthetic-pane|Quote please|example\.test|mail\.google|yelp\.com\/|u\/0/)
  const html = await (await app.request('/app/sites', {headers: {Cookie: cookie}})).text()
  for (const label of ['Conversion goals', 'Quote request', 'Phone calls', '75%', 'spring-open-house', 'Unapproved campaign tag', 'Funnel']) assert.ok(html.includes(label), label)
  assert.equal((await app.request('/api/pane')).status, 401)
 } finally { await app.mf.dispose() }
})

test('connected Vane and Google Analytics 4 render only on live pages, widen the policy only for what is connected and stay absent for GPC and DNT visitors', async () => {
 const app = await runtime()
 let cookie = ''
 const post = (path, body) => app.request(path, {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 const live = (headers = {}, path = '/site') => app.request(path, {headers})
 const policy = response => response.headers.get('content-security-policy')
 try {
  cookie = (await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Analytics owner'})).headers.get('set-cookie').split(';')[0]
  await app.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
  for (const bad of [{vane: {origin: 'http://vane.example.test', site: 'site_1'}}, {vane: {origin: 'https://vane.example.test:8443', site: 'site_1'}}, {vane: {origin: 'https://vane.example.test/app', site: 'site_1'}}, {vane: {origin: 'https://192.168.1.1', site: 'site_1'}}, {vane: {origin: 'https://vane.example.test', site: 'bad id'}}, {vane: {origin: 'https://vane.example.test'}}, {ga4: 'UA-12345-1'}, {ga4: 'G-<script>'}, 'G-ABC123XYZ4']) {
   assert.equal((await post('/api/pane/prepare', {site: {...fixture, analytics: bad}})).status, 400, JSON.stringify(bad))
  }
  const prepared = await (await post('/api/pane/prepare', {site: {...fixture, analytics: {vane: {origin: 'https://vane.example.test/vane.js', site: 'synthetic-pane_1'}, ga4: 'g-synth12345'}}})).json()
  assert.deepEqual(prepared.site.analytics, {vane: {origin: 'https://vane.example.test', site: 'synthetic-pane_1'}, ga4: 'G-SYNTH12345'})
  const draft = (await app.request('/preview/' + prepared.id + '/home', {headers: {Cookie: cookie}})), draftHtml = await draft.text()
  assert.doesNotMatch(draftHtml + policy(draft), /vane\.example\.test|pane-analytics|G-SYNTH12345|googletagmanager/, 'Draft previews load no analytics')
  assert.doesNotMatch(await (await live()).text(), /vane\.example\.test|pane-analytics/, 'Nothing renders before publication')
  await post('/api/pane/publish', {revision: prepared.id})
  for (const path of ['/site', '/site/contact', '/site/about']) {
   const page = await live({}, path), html = await page.text()
   assert.match(html, /<script defer src="https:\/\/vane\.example\.test\/vane\.js" data-site="synthetic-pane_1"><\/script>/, path)
   assert.match(html, /<script src="\/pane-analytics\.js" data-ga4="G-SYNTH12345" defer><\/script>/, path)
   assert.match(html, /data-analytics-consent aria-label="Analytics choices" hidden>/, 'The choice starts hidden and nothing from Google is in the markup')
   assert.doesNotMatch(html, /googletagmanager|google-analytics/)
   assert.equal(policy(page).split('; ').find(part=>part.startsWith('script-src')),"script-src 'self' "+(path==='/site/contact'?'https://challenges.cloudflare.com ':'')+'https://vane.example.test https://www.googletagmanager.com')
   assert.equal(policy(page).split('; ').find(part=>part.startsWith('connect-src')),"connect-src 'self' "+(path==='/site/contact'?'https://challenges.cloudflare.com ':'')+'https://vane.example.test https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com')
   assert.match(policy(page), /img-src 'self' https:\/\/\*\.google-analytics\.com/)
   assert.equal(page.headers.get('set-cookie'), null)
  }
  for (const privacy of [{'Sec-GPC': '1'}, {DNT: '1'}]) {
   const page = await live(privacy), html = await page.text()
   assert.doesNotMatch(html + policy(page), /vane\.example\.test|pane-analytics|data-analytics|G-SYNTH12345|googletagmanager|google-analytics/, JSON.stringify(privacy))
   assert.match(policy(page), /script-src 'self'; connect-src 'self'; /)
  }
  const vaneOnly = await (await post('/api/pane/prepare', {site: {...fixture, analytics: {vane: {origin: 'https://vane.example.test', site: 'synthetic-pane_1'}}}})).json()
  await post('/api/pane/publish', {revision: vaneOnly.id})
  const only = await live(), onlyHtml = await only.text()
  assert.match(onlyHtml, /vane\.js/); assert.doesNotMatch(onlyHtml + policy(only), /data-analytics|data-ga4|googletagmanager|google-analytics/)
  const none = await (await post('/api/pane/prepare', {site: fixture})).json()
  await post('/api/pane/publish', {revision: none.id})
  const bare = await live(); assert.doesNotMatch(await bare.text() + policy(bare), /vane\.|pane-analytics|googletagmanager|google-analytics/, 'Disconnecting removes both')
 } finally { await app.mf.dispose() }
})

test('enquiries carry an owner, status and follow-up time; unanswered ones are reminded then escalated by business day and replied ones leave the queue', async () => {
 const hosted = 'https://pane.example.test', mails = []
 const app = await runtime({bindings: {AUTH_ORIGIN: hosted, AUTH_LOCAL: 'false', MAIL_PROVIDER: 'sendgrid', MAIL_API_KEY: 'synthetic-pane-1', MAIL_FROM: 'studio@example.test'}, outboundService: async request => {
  mails.push(await request.json())
  return new Response(null, {status: 202, headers: {'x-message-id': 'synthetic-pane-2'}})
 }})
 const cookies = {}
 const call = (path, body, who = 'owner') => app.request(hosted + path, {method: 'POST', headers: {Cookie: cookies[who] ?? '', Origin: hosted, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 const state = async () => (await app.request(hosted + '/api/pane', {headers: {Cookie: cookies.owner}})).json()
 const tick = async time => assert.equal((await (await app.mf.getWorker()).scheduled({scheduledTime: new Date(time), cron: '* * * * *'})).outcome, 'ok')
 const submit = name => app.request(hosted + '/site/contact', {method: 'POST', headers: {Origin: hosted, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency: crypto.randomUUID(), name, email: 'synthetic-pane@example.test', message: 'Private visitor words for ' + name})})
 const find = async name => (await state()).messages.find(message => message.name === name)
 const memberId = async () => (await app.db.prepare("SELECT id FROM oa_operators WHERE role='member'").first()).id
 const recipients = () => mails.map(mail => mail.personalizations[0].to[0].email)
 try {
  cookies.owner = (await call('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Follow-up owner'}, '')).headers.get('set-cookie').split(';')[0]
  await app.request(hosted + '/setup', {method: 'POST', headers: {Cookie: cookies.owner, Origin: hosted, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
  let delivered
  const auth = createOperatorAuth({db: app.db, config: {...settings, origin: hosted, local: false}, clientIp: () => '127.0.0.1', mailSender: {send: async mail => { delivered = mail; return {status: 'accepted', provider: 'test-network-edge', providerMessageId: 'synthetic-pane-3'} }}})
  for (const role of ['admin', 'member']) {
   await auth.invite(new Request(hosted + '/auth/invite', {method: 'POST', headers: {Host: new URL(hosted).host, Origin: hosted, Cookie: cookies.owner}}), {email: role + '@example.test', displayName: 'Follow-up ' + role, role})
   const token = new URL(delivered.text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')
   const confirmed = await call('/auth/confirm', {token}, '')
   assert.equal(confirmed.status, 303)
   cookies[role] = confirmed.headers.get('set-cookie').split(';')[0]
  }
  const site = {...structuredClone(fixture), automations: {timeZone: 'America/Denver', banners: []}}
  for (const days of [0, 11, 1.5, 'soon']) assert.equal((await call('/api/pane/prepare', {site: {...site, responseDays: days}})).status, 400, String(days))
  const prepared = await (await call('/api/pane/prepare', {site})).json()
  await call('/api/pane/publish', {revision: prepared.id})
  for (const name of ['Queue Alpha', 'Queue Bravo', 'Queue Charlie']) assert.equal((await submit(name)).status, 303)
  let data = await state()
  const people = Object.fromEntries(data.assignees.map(person => [person.role, person.id]))
  assert.deepEqual(data.replyWindow, {zone: 'America/Denver', days: 1})
  const [alpha, bravo, charlie] = await Promise.all(['Queue Alpha', 'Queue Bravo', 'Queue Charlie'].map(find))
  for (const message of [alpha, bravo, charlie]) {
   assert.equal(message.status, 'new')
   assert.ok(message.follow_up_at - Date.now() > 20 * 3_600_000 && message.follow_up_at - Date.now() < 4 * 86_400_000, 'One business day ahead')
   assert.ok(!['Sat', 'Sun'].includes(new Date(message.follow_up_at).toLocaleDateString('en-US', {timeZone: 'America/Denver', weekday: 'short'})), 'Follow-ups fall on weekdays')
  }
  // Roles: owners and admins manage enquiries and assign them to each other, never to a member.
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, status: 'closed'}, '')).status, 401)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, status: 'closed'}, 'member')).status, 403)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, assignee: await memberId()})).status, 400)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, status: 'invented'})).status, 400)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, assignee: 'nobody'})).status, 400)
  assert.equal((await call('/api/pane/messages/update', {id: 'missing', status: 'closed'})).status, 400)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, assignee: people.admin}, 'admin')).status, 200)
  assert.equal((await call('/api/pane/messages/update', {id: charlie.id, assignee: people.owner})).status, 200)
  assert.equal((await call('/api/pane/messages/update', {id: charlie.id, status: 'replied'})).status, 200)
  const queue = html => html.slice(html.indexOf('id="queue-open"'), html.indexOf('id="queue-handled"'))
  let inbox = await (await app.request(hosted + '/app/inquiries', {headers: {Cookie: cookies.owner}})).text()
  assert.ok(queue(inbox).includes('Queue Alpha') && queue(inbox).includes('Queue Bravo') && !queue(inbox).includes('Queue Charlie'), 'A replied enquiry leaves the queue')
  assert.match(inbox, /Owner Follow-up admin/)
  // The reminder goes to the assignee, or the site owner when unassigned, once.
  const due = alpha.follow_up_at
  await tick(due - 60_000)
  assert.equal(mails.length, 0, 'Nothing is sent before the window ends')
  await tick(due + 60_000); await tick(due + 60_000)
  assert.deepEqual(recipients().sort(), ['admin@example.test', 'owner@example.test'])
  assert.doesNotMatch(JSON.stringify(mails), /Private visitor words|synthetic-pane@example\.test/, 'Internal mail never carries the enquiry text or contact details')
  data = await state()
  assert.deepEqual([data.messages.find(m => m.id === alpha.id).reminder_to, data.messages.find(m => m.id === alpha.id).reminder_status], [people.admin, 'accepted'])
  assert.deepEqual([data.messages.find(m => m.id === bravo.id).reminder_to, data.messages.find(m => m.id === charlie.id).reminded_at], [people.owner, null])
  // The site owner hears of an unanswered assigned enquiry one business day after the reminder, once.
  await tick(due + 12 * 3_600_000); assert.equal(mails.length, 2)
  await tick(due + 4 * 86_400_000); await tick(due + 4 * 86_400_000)
  assert.deepEqual(recipients().sort(), ['admin@example.test', 'owner@example.test', 'owner@example.test'])
  data = await state()
  const escalated = data.messages.find(message => message.id === alpha.id)
  assert.deepEqual([escalated.escalated_to, escalated.escalation_status, data.messages.find(m => m.id === bravo.id).escalated_at], [people.owner, 'accepted', null])
  inbox = await (await app.request(hosted + '/app/inquiries', {headers: {Cookie: cookies.owner}})).text()
  assert.match(inbox, /Reminder to Follow-up admin sent/); assert.match(inbox, /Escalated to Follow-up owner sent/); assert.match(inbox, /Overdue/)
  // Replying ends the chain and leaves the queue; reopening restarts the window.
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, status: 'replied'}, 'admin')).status, 200)
  assert.equal(queue(await (await app.request(hosted + '/app/inquiries', {headers: {Cookie: cookies.owner}})).text()).includes('Queue Alpha'), false)
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, status: 'new'})).status, 200)
  const reopened = await find('Queue Alpha')
  assert.deepEqual([reopened.reminded_at, reopened.escalated_at], [null, null])
  assert.ok(reopened.follow_up_at > Date.now())
  assert.equal((await call('/api/pane/messages/update', {id: alpha.id, followUp: '2027-01-05T09:30'})).status, 200)
  assert.equal((await find('Queue Alpha')).follow_up_at, Date.parse('2027-01-05T16:30:00Z'), 'A follow-up time is read in the business zone')
  // Business-day arithmetic keeps the local clock across weekends and a daylight-saving change.
  for (const [name, created] of [['Friday', '2026-10-23T22:00:00.000Z'], ['Saturday', '2026-10-24T16:00:00.000Z'], ['Before the clocks change', '2026-10-30T22:00:00.000Z']]) {
   await app.db.prepare('INSERT INTO pane_messages(id,name,email,message,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), name, 'synthetic-pane@example.test', 'Older enquiry', created).run()
  }
  await tick('2026-10-24T00:00:00Z')
  for (const [name, expected] of [['Friday', '2026-10-26T22:00:00.000Z'], ['Saturday', '2026-10-26T16:00:00.000Z'], ['Before the clocks change', '2026-11-02T23:00:00.000Z']]) assert.equal(new Date((await find(name)).follow_up_at).toISOString(), expected, name)
  // A longer owner-chosen window applies to enquiries received after it is published.
  const longer = await (await call('/api/pane/prepare', {site: {...site, responseDays: 3}})).json()
  await call('/api/pane/publish', {revision: longer.id})
  assert.equal((await state()).replyWindow.days, 3)
  await submit('Queue Delta')
  assert.ok((await find('Queue Delta')).follow_up_at - Date.now() > 2.9 * 86_400_000)
  assert.equal((await call('/api/pane/messages/erase', {id: alpha.id})).status, 200)
  assert.equal(await find('Queue Alpha'), undefined)
 } finally { await app.mf.dispose() }
})

test('published navigation keeps ordered dropdowns, links, CTA, footer and shared accessible social profiles with hidden pages excluded', async () => {
 const app = await runtime()
 let cookie
 const post = (path, body) => app.request(path, {method: 'POST', headers: {Origin: origin, Cookie: cookie ?? '', 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 try {
  cookie = (await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Navigation owner'})).headers.get('set-cookie').split(';')[0]
  const site = structuredClone(fixture)
  site.pages.find(page => page.slug === 'about').hidden = true
  site.navigation = {main: [{label: 'Visit', children: [{label: 'Our hours', page: 'hours'}, {label: 'Hidden about', page: 'about'}]}, {label: 'Explore', children: [{label: 'Our services', page: 'services'}]}, {label: 'Journal', url: 'https://journal.example.test/'}, {label: 'Book', page: 'contact', cta: true}], footer: [{label: 'Get in touch', page: 'contact'}, {label: 'Hidden footer', page: 'about'}], details: '24 Cedar Street\nOpen Monday to Friday', headerSocials: true, footerSocials: true}
  site.socials = {instagram: 'https://www.instagram.com/cedarworkshop/', facebook: 'https://www.facebook.com/cedarworkshop/', yelp: 'https://www.yelp.com/biz/cedar-workshop', linkedin: 'https://www.linkedin.com/company/cedar/', x: 'https://x.com/cedar', youtube: 'https://www.youtube.com/@cedar', tiktok: 'https://www.tiktok.com/@cedar', google: 'https://maps.google.com/?cid=123'}
  const prepared = await post('/api/pane/prepare', {site}); assert.equal(prepared.status, 200)
  const draft = await prepared.json()
  assert.equal((await post('/api/pane/publish', {revision: draft.id})).status, 200)
  for (const path of ['/site', '/site/search?q=wood']) {
   const response = await app.request(path); assert.equal(response.status, 200)
   const html = await response.text(), header = html.match(/<header[\s\S]*?<\/header>/)[0], footer = html.match(/<footer[\s\S]*?<\/footer>/)[0]
   assert.ok(header.indexOf('Visit') < header.indexOf('Explore'))
   assert.match(header, /<summary>Visit/); assert.match(header, /<summary>Explore/)
   assert.match(header, /href="https:\/\/journal.example.test\/"/); assert.match(header, /class="public-menu-cta"/)
   assert.doesNotMatch(header + footer, /href="\/site\/about"|Hidden about|Hidden footer/)
   assert.match(footer, /24 Cedar Street/); assert.match(footer, /Get in touch/)
   for (const url of Object.values(site.socials)) for (const region of [header, footer]) assert.ok(region.includes(url.replace(/&/g, '&amp;')), url)
   for (const label of ['Instagram', 'Facebook', 'Yelp', 'LinkedIn', 'X', 'YouTube', 'TikTok', 'Google Business Profile']) for (const region of [header, footer]) assert.ok(region.includes(`aria-label="${label}"`), label)
  }
  assert.equal((await app.request('/site/about')).status, 200, 'Hiding from menus preserves the page URL')
  const changed = {...site, navigation: {...site.navigation, details: 'Unpublished footer'}}
  const next = await (await post('/api/pane/prepare', {site: changed})).json()
  assert.doesNotMatch(await (await app.request('/site')).text(), /Unpublished footer/)
  await post('/api/pane/publish', {revision: next.id})
  assert.match(await (await app.request('/site')).text(), /Unpublished footer/)
  await post('/api/pane/rollback', {revision: draft.id})
  assert.doesNotMatch(await (await app.request('/site')).text(), /Unpublished footer/)
  for (const invalid of [{...site, socials: {instagram: 'javascript:alert(1)'}}, {...site, navigation: {...site.navigation, main: [{label: 'Unsafe', url: 'data:text/html,unsafe'}]}}]) assert.equal((await post('/api/pane/prepare', {site: invalid})).status, 400)
 } finally {await app.mf.dispose()}
})

test('page organization keeps stable identities, complete revisions, safe edits and chosen public home and not-found content', async () => {
 const app = await runtime()
 let cookie
 const post = (path, body) => app.request(path, {method: 'POST', headers: {Cookie: cookie ?? '', Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 const form = (base, fields) => app.request('/app/autosave', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({base, ...fields})})
 try {
  cookie = (await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Pages owner'})).headers.get('set-cookie').split(';')[0]
  assert.equal((await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const original = await (await post('/api/pane/prepare', {site: fixture})).json()
  await post('/api/pane/publish', {revision: original.id})
  const structure = {pages: fixture.pages.map(page => ({id: page.slug, slug: page.slug, title: page.title, folder: 'Business'})), folders: ['Business', 'Resources', 'Support'], home: 'services', notFound: 'missing-page'}
  structure.pages.push({id: 'missing-page', slug: 'help/missing', title: 'Let us help you find it', folder: 'Support', hidden: true})
  structure.pages.find(page => page.id === 'about').slug = 'our-studio'
  structure.pages.find(page => page.id === 'hours').deleted = true
  let response = await form(original.id, {slug: 'about', pageId: 'about', structure: JSON.stringify(structure), 'page.about.body': 'A larger workshop for local projects.'})
  assert.equal(response.status, 200, await response.clone().text())
  const organized = await response.json()
  assert.equal(organized.site.pages.length, 6)
  assert.equal(organized.site.pages.find(page => page.id === 'hours').deleted, true)
  assert.equal(organized.site.pages.find(page => page.id === 'about').slug, 'our-studio')
  assert.equal(organized.site.pages.find(page => page.id === 'about').body, 'A larger workshop for local projects.')
  assert.deepEqual(organized.site.folders, ['Business', 'Resources', 'Support'])
  assert.deepEqual(organized.site.redirectOffers.map(offer => [offer.from, offer.reason]).sort(), [['/site/about', 'renamed'], ['/site/hours', 'deleted'], ['/site/services', 'renamed']])
  assert.match(await (await app.request('/site')).text(), /Made to last/)
  assert.equal((await form(original.id, {structure: JSON.stringify(structure)})).status, 409)
  response = await form(organized.id, {slug: 'help/missing', pageId: 'missing-page', 'page.help/missing.title': 'Find your next workshop', 'page.help/missing.body': 'Search our services or contact the studio.', 'page.help/missing.searchBox': 'yes', 'page.help/missing.links': 'Contact our team | /site/contact'})
  assert.equal(response.status, 200)
  const complete = await response.json()
  assert.equal((await post('/api/pane/publish', {revision: complete.id})).status, 200)
  assert.match(await (await app.request('/site')).text(), /Repairs and commissions/)
  assert.match(await (await app.request('/site/home')).text(), /Made to last/)
  assert.match(await (await app.request('/site/our-studio')).text(), /larger workshop/)
  for (const path of ['/site/missing', '/site/nested/unknown', '/site/hours']) {
   const missing = await app.request(path); assert.equal(missing.status, 404)
   const html = await missing.text(); assert.match(html, /Find your next workshop/); assert.match(html, /role="search"/); assert.match(html, /href="\/site\/contact"/)
  }
  const map = await (await app.request('/sitemap.xml')).text()
  assert.doesNotMatch(map, /help\/missing|\/site\/hours/)
  const preview = await app.request(`/preview/${complete.id}/help/missing`, {headers: {Cookie: cookie}})
  assert.equal(preview.status, 200); assert.match(preview.headers.get('x-robots-tag'), /noindex/)
  assert.equal((await app.request(`/preview/${complete.id}/hours`, {headers: {Cookie: cookie}})).status, 404)
  await post('/api/pane/rollback', {revision: original.id})
  assert.match(await (await app.request('/site')).text(), /Made to last/)
  assert.equal((await app.request('/site/our-studio')).status, 404)
 } finally {await app.mf.dispose()}
})

test('approved business-local schedules drive banners and reminders while drafts, roles and invalid DST dates stay fenced', async () => {
 const app=await runtime();let cookie
 const post=(path,body,session=cookie,source=origin)=>app.request(path,{method:'POST',headers:{Cookie:session??'',Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const state=async()=>(await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
 const tick=async time=>assert.equal((await (await app.mf.getWorker()).scheduled({scheduledTime:new Date(time),cron:'* * * * *'})).outcome,'ok')
 const html=async()=>(await app.request('/site')).text()
 try {
  cookie=(await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Scheduling owner'},'')).headers.get('set-cookie').split(';')[0]
  await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  const site={...fixture,automations:{timeZone:'America/Denver',banners:[{id:'spring',text:'Spring workshop offer',start:'2027-03-13T09:00',end:'2027-03-14T09:00'}],review:{start:'2027-04-01T09:00',months:3}}}
  let first=await (await post('/api/pane/prepare',{site})).json()
  const edit=await app.request('/app/autosave',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:first.id,description:site.description+' Workshop bookings are open.','automation.timeZone':'America/Denver','automation.review.start':'2027-04-01T09:00'})})
  assert.equal(edit.status,200);first=await edit.json()
  assert.equal(first.site.automations.banners[0].id,'spring','Editing named settings retains schedules configured through the API')
  await tick('2027-03-13T16:00:00Z')
  assert.equal((await html()).includes('Spring workshop offer'),false,'An unapproved schedule does not execute')
  assert.ok((await state()).schedules.draftDue.length)
  assert.equal((await post('/api/pane/publish',{revision:first.id})).status,200)
  await tick('2027-03-13T16:00:00Z')
  assert.ok((await html()).includes('Spring workshop offer'),'A newly approved revision can execute at the same platform time')
  const count=(await state()).schedules.history.length
  await tick('2027-03-13T16:00:00Z');assert.equal((await state()).schedules.history.length,count)
  await tick('2027-03-14T14:59:00Z');assert.ok((await html()).includes('Spring workshop offer'))
  await tick('2027-03-14T15:00:00Z');assert.equal((await html()).includes('Spring workshop offer'),false)
  await tick('2027-03-13T16:00:00Z');assert.equal((await html()).includes('Spring workshop offer'),false,'A late delivery cannot resurrect an expired banner')
  for(const start of ['2027-03-14T02:30','2027-11-07T01:30']) {
   const invalid=structuredClone(site);invalid.automations.banners[0]={id:'invalid',text:'Invalid DST choice',start,end:'2027-11-08T09:00'}
   assert.equal((await post('/api/pane/prepare',{site:invalid})).status,400)
  }
  assert.equal((await state()).draft.id,first.id,'Invalid local times cannot leave a partial draft')
  await tick('2027-04-01T14:59:00Z');assert.equal((await state()).schedules.reminders.length,0)
  await tick('2027-04-01T15:00:00Z');assert.equal((await state()).schedules.reminders[0].pages.length,fixture.pages.length)
  assert.equal((await post('/api/pane/review',{page:'home'},'')).status,401)
  assert.equal((await post('/api/pane/review',{page:'home'},cookie,'https://elsewhere.invalid')).status,403)
  assert.equal((await post('/api/pane/review',{page:'missing'})).status,400)
  assert.equal((await post('/api/pane/review',{page:'home'})).status,200)
  assert.equal((await state()).schedules.reminders[0].pages.some(page=>page.id==='home'),false)
  await tick('2027-07-01T15:00:00Z')
  assert.ok((await state()).schedules.reminders.some(reminder=>reminder.occurrence==='2027-07-01T09:00'&&reminder.pages.some(page=>page.id==='home')))
  const noSchedules=await (await post('/api/pane/prepare',{site:fixture})).json()
  await post('/api/pane/publish',{revision:noSchedules.id});assert.equal((await html()).includes('Spring workshop offer'),false)
 } finally {await app.mf.dispose()}
})

test('activity records successful existing changes atomically and exports ordered owner-only metadata',async()=>{
 const app=await runtime();let cookie
 const call=(path,body,session=cookie)=>app.request(path,{method:'POST',headers:{Cookie:session??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const get=(path,session=cookie)=>app.request(path,{headers:{Cookie:session??''}})
 try {
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  const created=await (await call('/api/pane/prepare',{site:fixture})).json()
  await call('/api/pane/publish',{revision:created.id})
  await call('/api/pane/rollback',{revision:created.id})
  const invalid=await call('/api/pane/prepare',{site:{name:'invalid'}});assert.equal(invalid.status,400)
  const plan=await (await call('/api/pane/import/dry-run',{source:JSON.stringify(fixture)})).json()
  const job=await call('/api/pane/import/apply',{source:JSON.stringify(fixture),fingerprint:plan.fingerprint});assert.equal(job.status,200,await job.clone().text())
  const invitation=await call('/auth/invite',{email:'synthetic-pane-1@example.test',displayName:'Synthetic member',role:'member'});assert.equal(invitation.status,202)
  const person=(await app.db.prepare("SELECT id FROM oa_operators WHERE role='member'").first()).id
  assert.equal((await call('/auth/operator/role',{operatorId:person,role:'admin'})).status,200)
  const id=crypto.randomUUID()
  await app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:id,name:'synthetic-pane-2',email:'synthetic-pane-2@example.test',message:'synthetic-pane-3',website:''})})
  assert.equal((await call('/api/pane/messages/update',{id,status:'closed'})).status,200)
  assert.equal((await call('/api/pane/messages/erase',{id})).status,200)
  const rows=await (await get('/api/pane/activity')).json()
  for(const action of ['edit','publish','rollback','import','person.invite','authentication.change','workspace.change','erasure'])assert.ok(rows.some(row=>row.action===action),action)
  assert.equal(rows.filter(row=>row.action==='edit'&&row.subject==='revision:'+created.id).length,1,'Failed edits create no successful activity')
  assert.deepEqual(rows.map(row=>row.sequence),[...rows.map(row=>row.sequence)].sort((a,b)=>a-b))
  assert.ok(rows.every(row=>row.created_at&&row.actor&&row.subject))
  assert.doesNotMatch(JSON.stringify(rows),/synthetic-pane-2@example|synthetic-pane-3|test-session-key|test-setup-key/)
  const exported=await get('/api/pane/activity/export');assert.match(exported.headers.get('content-disposition'),/attachment/);assert.deepEqual((await exported.json()).filter(row=>row.sequence<=rows.at(-1).sequence),rows)
  assert.equal((await get('/api/pane/activity','')).status,401)
  const denied=await app.db.prepare('SELECT COUNT(*) AS count FROM pane_audit_context').first();assert.equal(denied.count,0,'Transaction actor never leaks into another request')
 } finally {await app.mf.dispose()}
})

test('explicit person erasure preserves anonymous ordered activity through archive restore and revokes access',async()=>{
 const app=await runtime();let cookie
 const call=(path,body,session=cookie)=>app.request(path,{method:'POST',headers:{Cookie:session??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const rows=async()=> (await app.request('/api/pane/activity',{headers:{Cookie:cookie}})).json()
 try {
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  let mail
  const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{mail=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{email:'synthetic-pane-4@example.test',displayName:'Synthetic administrator',role:'admin'})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  const adminCookie=(await call('/auth/confirm',{token},'')).headers.get('set-cookie').split(';')[0]
  const person=(await app.db.prepare("SELECT id FROM oa_operators WHERE role='admin'").first()).id
  const draft=await (await call('/api/pane/prepare',{site:fixture},adminCookie)).json()
  for(const path of ['/api/pane/activity','/api/pane/activity/export'])assert.equal((await app.request(path,{headers:{Cookie:adminCookie}})).status,403,'Even an active admin cannot read or export the owner log')
  const issued=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-6',operatorId:person,scopes:['pages:read']})).json()
  assert.equal((await call('/api/pane/tokens/revoke',{id:issued.id})).status,200)
  const presented={headers:{Authorization:'Bearer '+issued.token}}
  assert.equal((await app.request('/api/pane/pages',presented)).status,401)
  const before=await rows(),entry=before.find(row=>row.subject==='revision:'+draft.id)
  assert.equal(entry.actor,'Synthetic administrator')
  assert.ok(before.some(row=>row.agent===issued.id&&row.action==='api.GET.401'))
  const active=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-7',operatorId:person,scopes:['pages:read']})).json()
  assert.equal((await app.request('/api/pane/pages',{headers:{Authorization:'Bearer '+active.token}})).status,200)
  const older=await exportData(app.db)
  assert.equal((await call('/api/pane/people/erase',{id:person})).status,400)
  assert.equal((await call('/api/pane/people/erase',{id:person,confirm:'erase-person'},adminCookie)).status,403)
  assert.equal((await call('/api/pane/people/erase',{id:person,confirm:'erase-person'})).status,200)
  assert.equal((await app.request('/api/pane/pages',presented)).status,401)
  const after=await rows();assert.ok(after.length>=before.length)
  assert.ok(!after.some(row=>row.agent===issued.id),'Erasure anonymizes the person\'s token attribution, including later refused calls')
  assert.match(after.find(row=>row.sequence===entry.sequence).actor,/Former person/)
  assert.doesNotMatch(JSON.stringify(after),/Synthetic administrator|synthetic-pane-4@example/)
  assert.equal((await call('/api/pane/prepare',{site:fixture},adminCookie)).status,401)
  assert.equal((await app.request('/api/pane/pages',{headers:{Authorization:'Bearer '+active.token}})).status,401)
  const erased=await app.db.prepare('SELECT email,display_name,status FROM oa_operators WHERE id=?').bind(person).first()
  assert.equal(erased.status,'inactive');assert.equal(erased.display_name,'Former person');assert.ok(erased.email.endsWith('@erased.invalid'))
  const ownerId=(await app.db.prepare("SELECT id FROM oa_operators WHERE role='owner'").first()).id
  assert.equal((await call('/api/pane/people/erase',{id:ownerId,confirm:'erase-person'})).status,400)
  const retained=await rows(),later=await exportData(app.db),restored=await runtime(),old=await runtime()
  try {
   await assert.rejects(restore(old.db,older,later),/erased_row|erasure_epoch/,'An up-to-date erasure journal refuses the pre-erasure archive')
   assert.equal((await old.db.prepare('SELECT COUNT(*) AS count FROM oa_operators').first()).count,0,'Refused restore installs no account')
   assert.equal((await old.db.prepare('SELECT COUNT(*) AS count FROM pane_activity').first()).count,0,'Refused restore installs no identifying activity')
   assert.equal((await restore(restored.db,later)).phase,'complete')
   let ownerMail
   const native=createOperatorAuth({db:restored.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{ownerMail=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
   await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
   const signInToken=new URL(ownerMail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
   const signedIn=await restored.request('/auth/confirm',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:signInToken})})
   assert.equal(signedIn.status,303)
   const ownerSession=signedIn.headers.get('set-cookie').split(';')[0]
   const history=await (await restored.request('/api/pane/activity',{headers:{Cookie:ownerSession}})).json()
   assert.deepEqual(history.filter(row=>row.sequence<=retained.at(-1).sequence),retained,'Restore retains every ordered event and anonymized attribution')
   assert.match(history.find(row=>row.sequence===entry.sequence).actor,/Former person/)
   assert.doesNotMatch(JSON.stringify(history),/Synthetic administrator|synthetic-pane-4@example/)
   const exported=await restored.request('/api/pane/activity/export',{headers:{Cookie:ownerSession}})
   assert.match(exported.headers.get('content-disposition'),/attachment/)
   const exportedRows=await exported.json()
   assert.deepEqual(exportedRows.slice(0,history.length),history,'Restored owner export preserves the chronological log')
   assert.deepEqual(exportedRows.slice(history.length).map(({action,subject,actor})=>({action,subject,actor})),[{action:'api.GET.200',subject:'api:activity',actor:'Synthetic owner'}],'Reading the log appends only its own metadata event')
   for(const path of ['/api/pane/activity','/api/pane/activity/export']){
    assert.equal((await restored.request(path)).status,401)
    assert.equal((await restored.request(path,{headers:{Cookie:adminCookie}})).status,401)
   }
   assert.equal((await restored.request('/api/pane/prepare',{method:'POST',headers:{Cookie:adminCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({site:fixture})})).status,401)
   assert.equal((await restored.request('/api/pane/pages',{headers:{Authorization:'Bearer '+active.token}})).status,401)
   ownerMail=undefined
   await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:'synthetic-pane-4@example.test'})
   assert.equal(ownerMail,undefined,'An erased address cannot obtain a sign-in link after restore')
  } finally {await restored.mf.dispose();await old.mf.dispose()}
 } finally {await app.mf.dispose()}
})

test('scoped agent tokens intersect native authority and audit allowed, denied, expired and revoked calls without exposing credentials',async()=>{
 const app=await runtime();let cookie
 const call=(path,body,headers={})=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})
 const get=(path,headers={Cookie:cookie??''})=>app.request(path,{headers})
 try {
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  const prepared=await (await call('/api/pane/prepare',{site:fixture})).json()
  assert.equal((await call('/api/pane/tokens/create',{name:'synthetic-pane-1',scopes:['publish']})).status,400)
  const created=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-2',scopes:['pages:read','status:read'],days:1})).json()
  assert.ok(created.token)
  const bearer={Authorization:'Bearer '+created.token}
  assert.equal((await get('/api/pane/pages',bearer)).status,200)
  assert.equal((await (await get('/api/pane/pages',bearer)).json()).pages.length,fixture.pages.length)
  const status=await (await get('/api/pane',bearer)).json();assert.equal(status.draft.id,prepared.id);assert.equal(status.messages,undefined)
  assert.equal((await call('/api/pane/prepare',{site:fixture},bearer)).status,403)
  assert.equal((await call('/api/pane/publish',{revision:prepared.id},bearer)).status,403)
  assert.equal((await get('/api/pane/activity',bearer)).status,403)
  assert.equal((await call('/api/pane/tokens/create',{name:'synthetic-pane-3',scopes:['pages:read']},bearer)).status,403)
  assert.equal((await get('https://foreign.invalid/api/pane/pages',bearer)).status,403)
  assert.equal((await call('/api/pane/prepare',{site:fixture},{...bearer,Origin:'https://foreign.invalid'})).status,403)
  const stored=await app.db.prepare('SELECT token_hash,scopes FROM pane_api_tokens WHERE id=?').bind(created.id).first()
  assert.notEqual(stored.token_hash,created.token);assert.equal(stored.token_hash.length,64)
  const listing=await (await get('/api/pane/tokens')).text();assert.ok(!listing.includes(created.token));assert.ok(!listing.includes(stored.token_hash))
  assert.equal((await call('/api/pane/tokens/revoke',{id:created.id})).status,200)
  assert.equal((await get('/api/pane/pages',bearer)).status,401)
  const expired=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-4',scopes:['pages:read']})).json()
  await app.db.prepare('UPDATE pane_api_tokens SET expires_at=? WHERE id=?').bind(Date.now()-1,expired.id).run()
  assert.equal((await get('/api/pane/pages',{Authorization:'Bearer '+expired.token})).status,401)
  const history=await (await get('/api/pane/activity')).json()
  assert.ok(history.some(row=>row.agent===created.id&&row.action==='api.POST.403'&&row.subject==='api:prepare'))
  for(const action of ['token.create','token.revoke','api.GET.200','api.POST.403','api.GET.401'])assert.ok(history.some(row=>row.action===action),action)
  for(const token of [created,expired])assert.ok(history.some(row=>row.agent===token.id&&row.action==='api.GET.401'&&row.subject==='api:pages'),'A refused revoked or expired token call keeps its token id')
  assert.ok(!JSON.stringify(history).includes(created.token));assert.ok(!JSON.stringify(history).includes(stored.token_hash))
  const schema=await (await call('/api/pane/collections/schema',{base:prepared.id,id:'services',title:'Services',prefix:'care',fields:[{id:'description',label:'Description',type:'text',required:true}]})).json()
  const item=await (await call('/api/pane/collections/items/save',{base:schema.id,collection:'services',id:'repair',slug:'repair',title:'Chair repair',values:{description:'Repair well-loved chairs.'}})).json()
  const reader=await (await call('/api/pane/tokens/create',{name:'Collection reader',scopes:['collections:read']})).json(),readHeader={Authorization:'Bearer '+reader.token}
  const populated=await get('/api/pane/collections',readHeader);assert.equal(populated.status,200);assert.deepEqual((await populated.json()).collections[0].items.map(item=>item.title),['Chair repair'])
  assert.equal((await get('/api/pane/collections',bearer)).status,401)
  assert.equal((await call('/api/pane/collections/items/save',{base:item.id,collection:'services',id:'repair',slug:'repair',title:'Denied edit',values:{description:'Denied'}},readHeader)).status,403)
  assert.equal((await get('/api/pane/pages',readHeader)).status,403)
  const readAudit=await (await get('/api/pane/activity')).json();assert.ok(readAudit.some(row=>row.agent===reader.id&&row.action==='api.GET.200'&&row.subject==='api:collections'));assert.ok(readAudit.some(row=>row.agent===reader.id&&row.action==='api.POST.403'&&row.subject==='api:collections'+'/items/save'))

 }finally{await app.mf.dispose()}
})

test('API calls without a recognized credential add nothing to the activity log',async()=>{
 const app=await runtime()
 try {
  const cookie=(await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})})).headers.get('set-cookie').split(';')[0]
  const log=async()=> (await app.request('/api/pane/activity',{headers:{Cookie:cookie}})).json()
  const before=await log()
  for(const headers of [{},{Cookie:'synthetic-pane-1=0'},{Authorization:'Bearer '+'synthetic-pane-2'.padEnd(43,'0')},{Authorization:'synthetic-pane-3'}])
   for(let i=0;i<5;i++)assert.equal((await app.request('/api/pane',{headers})).status,401)
  assert.equal((await app.request('/api/pane/prepare',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({site:fixture})})).status,401)
  const after=await log()
  assert.deepEqual(after.slice(0,before.length),before)
  assert.deepEqual(after.slice(before.length).map(row=>[row.action,row.subject,row.actor]),[['api.GET.200','api:activity','Synthetic owner']],'Only the owner\'s own read is added')
 } finally {await app.mf.dispose()}
})

test('the real helper uses an authorized admin private session file for status, prepare and import and refuses publication',async()=>{
 const {createServer}=await import('node:http'),{spawn}=await import('node:child_process')
 const {mkdtemp,writeFile,chmod,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
 let app,adminCookie
 const server=createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk)
   const {host,...headers}=req.headers
   const response=await app.request(actual+req.url,{method:req.method,headers,...(chunks.length?{body:Buffer.concat(chunks).toString()}:{} )})
   response.headers.forEach((value,key)=>res.setHeader(key,value));res.writeHead(response.status);res.end(Buffer.from(await response.arrayBuffer()))
  }catch{res.writeHead(500);res.end('{}')}
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const actual='http://127.0.0.1:'+server.address().port,folder=await mkdtemp(join(tmpdir(),'synthetic-pane-'))
 const privateFile=join(folder,'session'),siteFile=join(folder,'site.json')
 const call=(path,body,cookie='')=>app.request(actual+path,{method:'POST',headers:{Cookie:cookie,Origin:actual,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const helper=(command,extra=[])=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/pane.mjs',command,'--origin',actual,'--session-file',privateFile,...extra],{stdio:['ignore','pipe','pipe']})
  let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('error',reject);child.on('close',code=>resolve({code,output}))
 })
 try {
  app=await runtime({bindings:{AUTH_ORIGIN:actual}})
  const ownerCookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  let mail
  const auth=createOperatorAuth({db:app.db,config:{...settings,origin:actual,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{mail=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await auth.invite(new Request(actual+'/auth/invite',{method:'POST',headers:{Host:new URL(actual).host,Origin:actual,Cookie:ownerCookie}}),{email:'synthetic-pane-5@example.test',displayName:'Synthetic admin',role:'admin'})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  adminCookie=(await call('/auth/confirm',{token})).headers.get('set-cookie').split(';')[0]
  await writeFile(privateFile,adminCookie,{mode:0o600});await writeFile(siteFile,JSON.stringify(fixture))
  const status=await helper('status');assert.equal(status.code,0,status.output)
  const prepared=await helper('prepare',['--input',siteFile]);assert.equal(prepared.code,0,prepared.output)
  const revision=JSON.parse(prepared.output).id
  const postFile=join(folder,'post.json')
  await writeFile(postFile,JSON.stringify({base:revision,blog:'news',content:{slug:'workshop-story',title:'Workshop story',body:'A private workshop story.'}}))
  const savedPost=await helper('post-save',['--input',postFile]);assert.equal(savedPost.code,0,savedPost.output)
  const post=JSON.parse(savedPost.output).posts[0]
  const listedPosts=await helper('posts');assert.equal(listedPosts.code,0,listedPosts.output);assert.equal(JSON.parse(listedPosts.output).posts[0].id,post.id)
  await writeFile(postFile,JSON.stringify({base:JSON.parse(savedPost.output).base,id:post.id}))
  const submittedPost=await helper('post-submit',['--input',postFile]);assert.equal(submittedPost.code,0,submittedPost.output);assert.equal(JSON.parse(submittedPost.output).posts[0].state,'review')
  const postHistory=await helper('ai-history',['--post',post.id]);assert.equal(postHistory.code,0,postHistory.output);assert.equal(JSON.parse(postHistory.output).undo,null)
  const plan=await helper('import-plan',['--input',siteFile]);assert.equal(plan.code,0,plan.output)
  const applied=await helper('import-apply',['--input',siteFile,'--fingerprint',JSON.parse(plan.output).fingerprint]);assert.equal(applied.code,0,applied.output)
  const refused=await helper('publish',['--revision',revision]);assert.equal(refused.code,1);assert.match(refused.output,/role cannot/)
  assert.ok(![status,prepared,plan,applied,refused].some(value=>value.output.includes(adminCookie)))
  await chmod(privateFile,0o644);const unsafe=await helper('status');assert.equal(unsafe.code,1);assert.match(unsafe.output,/mode 0600/)
  const history=await (await app.request(actual+'/api/pane/activity',{headers:{Cookie:ownerCookie}})).json()
  assert.ok(history.some(row=>row.actor==='Synthetic admin'&&row.subject==='api:import/apply'&&row.action==='api.POST.200'))
  assert.ok(history.some(row=>row.actor==='Synthetic admin'&&row.subject==='api:publish'&&row.action==='api.POST.403'))
 }finally{await new Promise(resolve=>server.close(resolve));await app?.mf.dispose();await rm(folder,{recursive:true,force:true})}
})

test('composable Pane roles are invited natively and enforced across workspace, preview, search and every existing API action',async()=>{
 const hosted='https://pane.example.test',deliveries=[]
 const app=await runtime({bindings:{AUTH_ORIGIN:hosted,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-17',MAIL_FROM:'pane@example.test'},outboundService:async request=>{deliveries.push(await request.json());return new Response(null,{status:202,headers:{'x-message-id':'synthetic-pane-18'}})}})
 let ownerCookie
 const call=(path,body,cookie=ownerCookie,headers={})=>app.request(hosted+path,{method:'POST',headers:{Cookie:cookie??'',Origin:hosted,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})
 const get=(path,cookie=ownerCookie)=>app.request(hosted+path,{headers:{Cookie:cookie??''}})
 const ownerData=async()=> (await get('/api/pane')).json()
 const signInvitation=async(expectedHome)=>{
  const text=deliveries.at(-1).content.find(part=>part.type==='text/plain').value
  const link=new URL(text.match(/https:\/\/[^\s]+/)[0])
  const confirmed=await call('/auth/confirm',{token:link.searchParams.get('token')},'');assert.equal(confirmed.status,303,await confirmed.clone().text())
  assert.equal(confirmed.headers.get('location'),expectedHome)
  return confirmed.headers.get('set-cookie').split(';')[0]
 }
 try{
  ownerCookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  await app.request(hosted+'/setup',{method:'POST',headers:{Cookie:ownerCookie,Origin:hosted,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  const prepared=await (await call('/api/pane/prepare',{site:fixture})).json();await call('/api/pane/publish',{revision:prepared.id})
  const id=crypto.randomUUID()
  await app.request(hosted+'/site/contact',{method:'POST',headers:{Origin:hosted,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:id,name:'Synthetic enquirer',email:'synthetic-pane-19@example.test',message:'synthetic-pane-20'})})
  const matrix=[
   {roles:['editor'],pages:true,edit:true},
   {roles:['author'],posts:true},
   {roles:['comment-moderator'],comments:true},
   {roles:['inbox'],inbox:true},
   {roles:['reporting'],reports:true},
   {roles:['editor','inbox','reporting'],pages:true,edit:true,inbox:true,reports:true},
  ]
  for(const [index,row] of matrix.entries()){
   const invitation=await call('/api/pane/roles/invite',{email:`synthetic-pane-${30+index}@example.test`,displayName:'Synthetic '+row.roles.join(' '),roles:row.roles})
   assert.equal(invitation.status,200,await invitation.clone().text());const person=await invitation.json()
   // Delivery happens only after the role assignment exists; inspect that boundary.
   assert.equal((await app.db.prepare('SELECT roles FROM pane_roles WHERE operator_id=?').bind(person.operatorId).first()).roles,JSON.stringify([...row.roles].sort()))
   const cookie=await signInvitation(row.comments?'/app/comments':row.edit?'/app':row.posts?'/app/posts':row.inbox?'/app/inquiries':row.reports?'/app/sites':'/app')
   const admission=await (await get('/api/pane/activity')).json()
   assert.ok(admission.some(event=>event.subject==='person:'+person.operatorId&&event.action==='authentication.change'&&event.actor==='Synthetic '+row.roles.join(' ')),'Native confirmation attributes the admitted person')
   const expected=new Map([
    ['/app',row.pages?200:row.comments||row.posts||row.inbox||row.reports?303:403],['/app/sites',row.pages||row.reports?200:403],['/app/inquiries',row.inbox?200:403],['/app/moves',403],['/app/search',row.edit?200:403],
    ['/preview/'+prepared.id+'/home',row.edit?200:403],['/api/pane',200],['/api/pane/pages',row.pages?200:403],['/api/pane/collections',row.edit?200:403],['/app/collections',row.edit?200:403],
    ['/api/pane/submissions/export?form=native%3Acontact',row.inbox?200:403],['/app/submissions/export?form=native%3Acontact',row.inbox?200:403],['/app/comments',row.comments?200:403],['/api/pane/comments',row.comments?200:403],['/app/posts',row.posts?200:403],['/api/pane/posts',row.posts?200:403],['/api/pane/activity',403],['/api/pane/activity/export',403],['/api/pane/roles',403],['/api/pane/tokens',403],
   ])
   for(const [path,status] of expected)assert.equal((await get(path,cookie)).status,status,row.roles+': '+path)
   if(!row.pages&&(row.posts||row.inbox||row.reports))assert.equal((await get('/app',cookie)).headers.get('location'),row.posts?'/app/posts':row.inbox?'/app/inquiries':'/app/sites')
   const status=await (await get('/api/pane',cookie)).json()
   assert.equal(status.activity,undefined);assert.equal(status.imports.length,0)
   assert.equal(status.messages.length,row.inbox?1:0);assert.equal(status.replies.length,row.inbox?(await ownerData()).replies.length:0)
   assert.equal(status.revisions.length>0,!!row.pages)
   if(!row.reports){assert.deepEqual(status.visits,[]);assert.deepEqual(status.goals,[]);assert.ok(Object.values(status.traffic).every(rows=>rows.length===0))}
   const body={site:fixture,base:(await ownerData()).draft.id,revision:prepared.id,page:'home',id,source:JSON.stringify(fixture),fingerprint:'synthetic-pane-21',job:'synthetic-pane-22',operatorId:person.operatorId,roles:['editor'],scopes:['pages:read'],name:'synthetic-pane-23',idempotency:crypto.randomUUID(),confirm:'send-reply',subject:'Synthetic reply',body:'synthetic-pane-24'}
   const allowed=new Set([...(row.edit?['prepare','autosave','review']:[]),...(row.inbox?['messages/update','messages/reply']:[])])
   const actions=['prepare','autosave','publish','rollback','review','import/dry-run','import/apply','import/undo','messages/update','messages/reply','messages/erase','people/erase','roles/set','roles/invite','tokens/create','tokens/revoke']
   for(const prefix of ['/api/pane/','/app/'])for(const action of actions){
    const response=await call(prefix+action,{...body,idempotency:crypto.randomUUID(),...(['prepare','autosave'].includes(action)?{base:(await ownerData()).draft.id}:{})},cookie)
    assert.equal(response.status,allowed.has(action)?(prefix==='/app/'&&action!=='autosave'?303:200):403,row.roles+': '+prefix+action+' '+await response.text())
   }
   for(const path of ['/auth/invite','/auth/operator/role','/auth/operator/status','/auth/domain-rules','/auth/settings/identity']){
    assert.equal((await call(path,{operatorId:person.operatorId,role:'admin',status:'inactive',email:'synthetic-pane-99@example.test'},cookie)).status,403,row.roles+': '+path)
   }
   if(row.edit){
    assert.equal((await call('/api/pane/prepare',{site:{...fixture,responseDays:2},base:(await ownerData()).draft.id},cookie)).status,403,'Editors cannot change business settings through whole-site snapshots')
    assert.equal((await call('/api/pane/prepare',{site:{...fixture,analytics:{ga4:'G-SYNTH12345'}},base:(await ownerData()).draft.id},cookie)).status,403,'Editors cannot connect analytics')
    const form=new URLSearchParams({base:(await ownerData()).draft.id})
    for(const page of fixture.pages){form.set(page.slug+'.title','Synthetic '+page.slug);form.set(page.slug+'.description','synthetic-pane-25')}
    assert.equal((await app.request(hosted+'/app/search',{method:'POST',headers:{Cookie:cookie,Origin:hosted,'Content-Type':'application/x-www-form-urlencoded'},body:form})).status,303)
   }
   const scoped=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-26',operatorId:person.operatorId,scopes:['pages:read','collections:read']})).json()
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,row.pages?200:403)
   assert.equal((await app.request(hosted+'/api/pane/collections',{headers:{Authorization:'Bearer '+scoped.token}})).status,row.edit?200:403,'Collection tokens intersect the current native grant')
   assert.equal((await call('/api/pane/roles/set',{operatorId:person.operatorId,roles:[]})).status,200)
   assert.equal((await app.request(hosted+'/api/pane/collections',{headers:{Authorization:'Bearer '+scoped.token}})).status,403,'Collection tokens lose a revoked grant on the next request')
   assert.equal((await get('/app/collections',cookie)).status,403,'Collection screens lose a revoked grant on the next request')
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,403,'Tokens lose revoked Pane capabilities on the next request')
   assert.equal((await get('/app',cookie)).status,403,'Removing a grant takes effect on the next request')
   assert.equal((await get('/app/inquiries',cookie)).status,403)
   assert.equal((await get('/api/pane/submissions/export?form=native%3Acontact',cookie)).status,403,'CSV loses revoked inbox authority on the next request')
   assert.equal((await call('/auth/operator/status',{operatorId:person.operatorId,status:'inactive'})).status,200)
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,401,'Native deactivation invalidates the scoped token')
   assert.equal((await call('/auth/operator/status',{operatorId:person.operatorId,status:'active'})).status,200)
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,401,'Reactivation cannot resurrect an old-version token')
  }
  assert.ok(deliveries.some(value=>value.personalizations[0].to[0].email==='synthetic-pane-19@example.test'&&value.subject==='Synthetic reply'))
  const history=await (await get('/api/pane/activity')).json()
  assert.ok(history.some(row=>row.action==='roles.change'));assert.ok(history.some(row=>row.action==='enquiry.reply'));assert.ok(history.some(row=>row.action==='settings.search'))
  assert.doesNotMatch(JSON.stringify(history),/synthetic-pane-24|synthetic-pane-19@example/)
 }finally{await app.mf.dispose()}
})

test('explicit enquiry replies are retained, delivered once at the provider edge and erased with the parent enquiry',async()=>{
 const hosted='https://pane.example.test',deliveries=[];let providerStatus=202
 const app=await runtime({bindings:{AUTH_ORIGIN:hosted,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-50',MAIL_FROM:'pane@example.test'},outboundService:async request=>{deliveries.push(await request.json());return new Response(null,{status:providerStatus})}})
 let cookie
 const call=(path,body)=>app.request(hosted+path,{method:'POST',headers:{Cookie:cookie??'',Origin:hosted,'Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  const revision=await (await call('/api/pane/prepare',{site:fixture})).json();await call('/api/pane/publish',{revision:revision.id})
  const id=crypto.randomUUID();await app.request(hosted+'/site/contact',{method:'POST',headers:{Origin:hosted,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':'synthetic-pane-3',idempotency:id,name:'Synthetic enquirer',email:'synthetic-pane-51@example.test',message:'synthetic-pane-52'})})
  const input={id,idempotency:crypto.randomUUID(),subject:'Synthetic reply',body:'synthetic-pane-53',confirm:'send-reply'}
  assert.equal((await call('/api/pane/messages/reply',{...input,confirm:''})).status,400);assert.equal(deliveries.length,0)
  const results=await Promise.all([call('/api/pane/messages/reply',input),call('/api/pane/messages/reply',input)])
  assert.ok(results.every(response=>response.status===200));assert.equal(deliveries.length,1)
  assert.deepEqual(deliveries[0].personalizations[0].to,[{email:'synthetic-pane-51@example.test'}]);assert.equal(deliveries[0].content.find(part=>part.type==='text/plain').value,input.body)
  assert.equal((await app.db.prepare('SELECT status FROM pane_messages WHERE id=?').bind(id).first()).status,'replied')
  assert.equal((await call('/api/pane/messages/reply',{...input,body:'Changed'})).status,400)
  for(const [code,status] of [[400,'failed'],[503,'uncertain']]){
   providerStatus=code;const failed={...input,idempotency:crypto.randomUUID()}
   assert.equal((await (await call('/api/pane/messages/reply',failed)).json()).status,status)
   const before=deliveries.length;await call('/api/pane/messages/reply',failed);assert.equal(deliveries.length,before)
  }
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM pane_inquiry_replies WHERE message_id=?').bind(id).first()).count,3)
  const archive=await exportData(app.db),restored=await runtime()
  try{assert.equal((await restore(restored.db,archive)).phase,'complete');assert.equal((await restored.db.prepare('SELECT COUNT(*) AS count FROM pane_inquiry_replies').first()).count,3)}finally{await restored.mf.dispose()}
  await call('/api/pane/messages/erase',{id})
  const later=await exportData(app.db),old=await runtime()
  try{await assert.rejects(restore(old.db,archive,later),/erased_row|erasure_epoch/)}finally{await old.mf.dispose()}
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM pane_inquiry_replies WHERE message_id=?').bind(id).first()).count,0)
  const history=await (await app.request(hosted+'/api/pane/activity',{headers:{Cookie:cookie}})).json();assert.ok(history.some(row=>row.action==='enquiry.reply'))
 }finally{await app.mf.dispose()}
})

test('native connection approval, callback, settings and unlink produce owner-attributed secret-free activity',async()=>{
 const provider='https://synthetic-pane.example.test';let sector
 const app=await runtime({outboundService:async request=>{
  if(request.url===provider+'/.well-known/openid-configuration')return Response.json({issuer:provider,authorization_endpoint:provider+'/authorize',token_endpoint:provider+'/token',jwks_uri:provider+'/jwks',response_types_supported:['code'],id_token_signing_alg_values_supported:['ES256'],token_endpoint_auth_methods_supported:['private_key_jwt'],rer_interfaces:['oidc-provider@1.0.0']})
  if(request.url===provider+'/.well-known/rer-provider')return Response.json({issuer:provider,version:1,interface:'oidc-provider@1',initiate:provider+'/initiate',redeem:provider+'/redeem',deregister:provider+'/deregister'})
  if(request.url===provider+'/redeem')return Response.json({issuer:provider,interface:'oidc-provider@1',origin,callback:origin+'/.well-known/rer-link/callback',sector_id:sector,client_id:'synthetic-pane-70'})
  if(request.url===provider+'/deregister')return Response.json({removed:true})
  throw Error('Unexpected network edge')
 }})
 let cookie
 const call=(path,body,session=cookie)=>app.request(path,{method:'POST',headers:{Cookie:session??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const get=path=>app.request(path,{headers:{Cookie:cookie??''}})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic connection owner'})).headers.get('set-cookie').split(';')[0]
  sector=(await (await get('/.well-known/rer-dependencies')).json()).sector_id
  let proofMail
  const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{proofMail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await native.requestStepUp(new Request(origin+'/auth/step-up',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{action:'providers:relink'})
  const proofToken=new URL(proofMail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  assert.equal((await call('/auth/confirm',{token:proofToken})).status,303)
  assert.equal((await call('/auth/dependencies/relink',{issuer:provider})).status,200)
  const linked=await call('/.well-known/rer-link/callback',{issuer:provider,interface:'oidc-provider@1',code:'synthetic-pane-71'},'')
  assert.equal(linked.status,200,await linked.clone().text())
  assert.equal((await (await get('/auth/dependencies/status')).json()).linked,true)
  assert.equal((await call('/auth/settings/identity',{idpSignIn:true})).status,200)
  const unlinked=await call('/auth/dependencies/unlink',{});assert.equal(unlinked.status,200,await unlinked.clone().text())
  assert.equal((await (await get('/auth/dependencies/status')).json()).linked,false)
  const history=await (await get('/api/pane/activity')).json(),connections=history.filter(row=>row.action==='connection.change')
  assert.ok(connections.length>=2);assert.ok(connections.every(row=>row.actor==='Synthetic connection owner'))
  assert.ok(history.some(row=>row.action==='settings.change'&&row.actor==='Synthetic connection owner'))
  assert.doesNotMatch(JSON.stringify(history),/synthetic-pane-70|synthetic-pane-71|private_key|client_assertion|test-session-key/)
 }finally{await app.mf.dispose()}
})

test('an oversized connection callback is refused before its whole body is read',async()=>{
 const stream={head:'{"interface":"oidc-provider@1","code":"synthetic-pane-72","padding":"',chunk:'synthetic-pane-73'.padEnd(1024,'0'),count:1024,tail:'"}'}
 const response=await f.request('/.well-known/rer-link/callback',{method:'POST',headers:{'Content-Type':'application/json'},stream})
 assert.equal(response.status,413)
 const read=Number(response.headers.get('x-test-body-read'));assert.ok(read<64*1024,`Read ${read} bytes of a 1 MiB body`)
})

test('starter layouts and duplicates retain editable content and shared published styles',async()=>{
 const f=await runtime();let owner
 const json=(path,body)=>f.request(path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:owner??''},body:JSON.stringify(body),redirect:'manual'})
 const data=async()=>{const response=await f.request('/api/pane',{headers:{Cookie:owner}});assert.equal(response.status,200);return response.json()}
 try{
 const signed=await json('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Template owner'});assert.equal(signed.status,303);owner=signed.headers.get('set-cookie').split(';')[0]
 assert.equal((await f.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 assert.equal((await json('/api/pane/prepare',{site:fixture})).status,200)

 const layouts=['landing','service','team','menu','pricing','faq','location']
 for(const layout of layouts){
  await json('/api/pane/prepare',{site:fixture})
  const templatePages=[...fixture.pages.map(page=>({id:page.slug,slug:page.slug,title:page.title})),{id:'synthetic-pane-template-'+layout,slug:'template-'+layout,title:'Template page',layout}]
  const applied=await f.request('/app/prepare',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:(await data()).draft.id,structure:JSON.stringify({pages:templatePages,folders:[],home:'home',notFound:''})}),redirect:'manual'});assert.equal(applied.status,303)
  const collections=(await data()).draft.site.collections;assert.ok(Array.isArray(collections),'Every template starts with collection schemas');assert.deepEqual(collections.map(collection=>collection.title).sort(),['Projects','Services','Team'],'Every template starts with editable collection schemas');assert.ok(collections.every(collection=>collection.items.length===0),'Template collections invent no business records')
  for(const collection of collections)assert.ok(collection.fields.length>0,'Starter collections contain typed editable fields')
 }
 const pages=fixture.pages.map(page=>({id:page.id??page.slug,slug:page.slug,title:page.title}))
 for(const layout of layouts)pages.push({id:'synthetic-pane-'+layout,slug:'starter-'+layout,title:'Starter '+layout,layout})
 pages.push({id:'synthetic-pane-copy',slug:'services-copy',title:'Services copy',sourceId:'services'})
 const save=await f.request('/app/prepare',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:(await data()).draft.id,structure:JSON.stringify({pages,folders:[],home:'home',notFound:''})}),redirect:'manual'})
 assert.equal(save.status,303,await save.text())
 const draft=(await data()).draft
 for(const layout of layouts){const page=draft.site.pages.find(page=>page.slug==='starter-'+layout);assert.equal(page.layout,layout);assert.ok(page.body.includes('\n\n'))}
 const source=draft.site.pages.find(page=>page.slug==='services'),copy=draft.site.pages.find(page=>page.slug==='services-copy')
 assert.equal(copy.body,source.body);assert.notEqual(copy.id,source.id??source.slug)
 assert.equal((await json('/api/pane/publish',{revision:draft.id})).status,200)
 for(const slug of [...layouts.map(layout=>'starter-'+layout),'services-copy']){
  const response=await f.request('/site/'+slug);assert.equal(response.status,200)
  const html=await response.text();assert.match(html,/class="public-site"/);assert.match(html,/pane.css/);assert.match(html,/pane-tooltip.js/)
  if(slug==='starter-faq')assert.match(html,/<details><summary>/)
  else if(slug.startsWith('starter-'))assert.match(html,/<section><h2>/)
 }
 const changed=structuredClone(draft.site);changed.pages.find(page=>page.slug==='services-copy').body='An independent duplicate.'
 const edit=await (await json('/api/pane/prepare',{site:changed,base:draft.id})).json()
 assert.equal(edit.site.pages.find(page=>page.slug==='services').body,source.body)
 assert.equal((await json('/api/pane/prepare',{site:{...changed,pages:changed.pages.map(page=>({...page,layout:'unsupported'}))}})).status,400)
 }finally{await f.mf.dispose()}
})

test('page review binds the exact content and selective owner approval keeps other drafts and records an immutable revision',async()=>{
 const base=await (await json('/api/pane/prepare',{site:fixture})).json()
 await json('/api/pane/publish',{revision:base.id})
 const site=structuredClone(fixture);site.pages[1].body='Reviewed studio change.';site.pages[2].body='Unfinished service draft.'
 const draft=await (await json('/api/pane/prepare',{site,base:base.id})).json()
 const request=await json('/api/pane/page-request-review',{base:draft.id,page:'about'})
 assert.equal(request.status,200,await request.clone().text());const review=await request.json()
 assert.equal((await json('/api/pane/page-publish',{base:draft.id,page:'about',request:review.id},member)).status,403)
 const publish=await json('/api/pane/page-publish',{base:draft.id,page:'about',request:review.id})
 assert.equal(publish.status,200,await publish.clone().text());const live=await publish.json(),after=await data()
 assert.equal(live.site.pages[1].body,'Reviewed studio change.')
 assert.equal(live.site.pages[2].body,fixture.pages[2].body)
 assert.equal(after.draft.site.pages[2].body,'Unfinished service draft.')
 assert.equal(after.approvals[0].revision,live.id)
 assert.deepEqual(after.revisions.find(row=>row.id===draft.id).site,draft.site)
 assert.ok((await (await f.request('/site/about')).text()).includes('Reviewed studio change.'))
 assert.ok(!(await (await f.request('/site/services')).text()).includes('Unfinished service draft.'))
 const stale=await json('/api/pane/page-publish',{base:draft.id,page:'about',request:review.id});assert.equal(stale.status,409)
 const changed=structuredClone(after.draft.site);changed.pages[1].body='Changed after review.'
 const newer=await (await json('/api/pane/prepare',{site:changed,base:after.draft.id})).json()
 assert.equal((await json('/api/pane/page-publish',{base:newer.id,page:'about',request:review.id})).status,400)
 assert.equal((await json('/api/pane/page-request-review',{base:draft.id,page:'about'})).status,409)
 const requested=await (await json('/api/pane/page-request-review',{base:newer.id,page:'about'})).json()
 const concurrent=await Promise.all([json('/api/pane/page-publish',{base:newer.id,page:'about',request:requested.id}),json('/api/pane/page-publish',{base:newer.id,page:'about',request:requested.id})])
 assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,409],'Only one concurrent approval can consume the opened draft')
})

test('US business defaults render Denver hours, currency, phone, address and Sunday calendars and owners can change the formats',async()=>{
 const site=structuredClone(fixture)
 site.automations={timeZone:'America/Denver',banners:[]}
 site.pages[3].business={hours:['','09:00-17:00','09:00-17:00','09:00-17:00','09:00-17:00','09:00-17:00',''],prices:[{label:'Consultation',cents:12550}],phone:'3035550123',street:'10 Main Street',city:'Denver',region:'CO',postal:'80202',country:'United States'}
 let draft=await (await json('/api/pane/prepare',{site})).json()
 await json('/api/pane/publish',{revision:draft.id})
 let html=await (await f.request('/site/hours')).text()
 for(const value of ['America/Denver','9:00 AM','5:00 PM','$125.50','(303) 555-0123','Denver, CO 80202','title="Sunday"'])assert.ok(html.includes(value),value)
 assert.ok(html.indexOf('title="Sunday"')<html.indexOf('title="Monday"'))
 assert.equal((await data()).timeZone,'America/Denver')
 const changed={...site,locale:{locale:'en-GB',currency:'GBP',phoneFormat:'international',addressFormat:'international',weekStart:1}}
 draft=await (await json('/api/pane/prepare',{site:changed})).json()
 assert.ok((await (await f.request('/site/hours')).text()).includes('$125.50'),'Draft formatting cannot change live content')
 await json('/api/pane/publish',{revision:draft.id})
 html=await (await f.request('/site/hours')).text()
 for(const value of ['£125.50','+1 303 555 0123','80202 Denver','lang="en-GB"'])assert.ok(html.includes(value),value)
 assert.ok(html.indexOf('title="Monday"')<html.indexOf('title="Sunday"'))
 assert.equal((await data()).locale,'en-GB')
 for(const bad of [{locale:{...changed.locale,currency:'invalid'}},{pages:site.pages.map(page=>page.business?{...page,business:{...page.business,hours:['bad']}}:page)}])assert.equal((await json('/api/pane/prepare',{site:{...site,...bad}})).status,400)
})

test('form protection refuses and separately counts honeypot, per-form bursts and invalid provider proofs',async()=>{
 const binding=form=>createHash('sha256').update(form).digest('hex')
 let now=Date.parse('2026-10-26T08:06:59.000Z')
 let answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:binding('contact')},calls=0,unavailable=false
 const app=await runtime({now:()=>now,turnstile:async(_request,fields)=>{
  calls++;assert.equal(fields.get('secret'),'synthetic-pane-2');assert.ok(fields.get('idempotency_key'))
  return unavailable?new Response(null,{status:503}):Response.json(answer)
 }})
 try{
  const boot=await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic designer'})})
  const cookie=boot.headers.get('set-cookie').split(';')[0]
  assert.equal((await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const post=(path,body)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const site=structuredClone(fixture);site.pages.push({...site.pages.find(p=>p.slug==='contact'),slug:'requests/quote',kind:'contact'})
  const rev=await(await post('/api/pane/prepare',{site})).json();assert.equal((await post('/api/pane/publish',{revision:rev.id})).status,200)
  const send=(fields={},slug='contact')=>app.request('/site/'+slug,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Synthetic visitor',email:'synthetic-pane@example.test',message:'Private rejected words','cf-turnstile-response':'synthetic-pane-3',...fields})})
  assert.equal((await send({website:'synthetic-pane-4'})).status,403);assert.equal(calls,0)
  for(const proof of [{success:false},{hostname:'elsewhere.example.test'},{action:'other'},{cdata:'quote'}]){
   answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:binding('contact'),...proof}
   assert.equal((await send()).status,403)
  }
  assert.equal((await send({'cf-turnstile-response':''})).status,403)
  unavailable=true;assert.equal((await send()).status,503);unavailable=false
  answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:binding('contact')}
  const id=crypto.randomUUID();assert.equal((await send({idempotency:id})).status,303);assert.equal((await send({idempotency:id})).status,303)
  const rows=await app.db.prepare('SELECT * FROM pane_messages').all();assert.equal(rows.results.length,1);assert.equal(rows.results[0].id,id)
  // Each form has an independent bucket. Rejected bot proofs cannot bypass it.
  let status
  for(let index=0;index<20;index++)status=(await send({'cf-turnstile-response':''})).status
  assert.equal(status,429)
  answer.cdata=binding('requests/quote');assert.equal((await send({},'requests/quote')).status,303)
  // Crossing a minute opens a fresh bucket, even after the previous one refused a burst.
  now+=60_000
  assert.equal((await send({'cf-turnstile-response':''})).status,403)
  for(let index=1;index<20;index++)assert.equal((await send({'cf-turnstile-response':''})).status,403)
  assert.equal((await send({'cf-turnstile-response':''})).status,429)
  const rejected=(await app.db.prepare('SELECT * FROM pane_form_rejections').all()).results
  for(const reason of ['honeypot','turnstile','rate','unavailable'])assert.ok(rejected.some(r=>r.reason===reason),reason)
  assert.doesNotMatch(JSON.stringify(rejected),/Private rejected words|synthetic-pane@example.test|synthetic-pane-3/)
  const review=await(await app.request('/app/inquiries',{headers:{Cookie:cookie}})).text()
  assert.match(review,/Spam protection review/);assert.match(review,/honeypot/);assert.match(review,/turnstile/)
  assert.equal((await app.request('/api/pane')).status,401)
  const contact=await app.request('/site/contact');assert.match(contact.headers.get('content-security-policy'),/frame-src https:\/\/challenges.cloudflare.com/)
  assert.match(await contact.text(),/data-turnstile-key="synthetic-pane-1"/)
 }finally{await app.mf.dispose()}
})

test('published snapshot and queued forms survive missing workspace tables and drain once after recovery',async()=>{
 const app=await runtime({isolatedLive:true})
 try{
  const boot=await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})})
  const cookie=boot.headers.get('set-cookie').split(';')[0]
  const post=(path,body)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const site=structuredClone(fixture)
  const prepared=await(await post('/api/pane/prepare',{site})).json()
  assert.equal((await post('/api/pane/publish',{revision:prepared.id})).status,200)
  // Make the real D1 content and intake tables unavailable after publication.
  await app.db.prepare('ALTER TABLE pane_revisions RENAME TO synthetic_pane_unavailable_revisions').run()
  await app.db.prepare('ALTER TABLE pane_messages RENAME TO synthetic_pane_unavailable_messages').run()
  for(const page of site.pages){
   const response=await app.request(page.slug==='home'?'/site':'/site/'+page.slug)
   assert.equal(response.status,200);assert.match(await response.text(),new RegExp(page.title))
  }
  assert.equal((await app.request('/sitemap.xml')).status,200)
  const id=crypto.randomUUID(),send=()=>app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:id,name:'Synthetic visitor',email:'synthetic-pane@example.test',message:'Queued through the outage','cf-turnstile-response':'synthetic-pane-3'})})
  assert.equal((await send()).status,303);assert.equal((await send()).status,303)
  assert.equal((await app.db.prepare('SELECT * FROM synthetic_pane_unavailable_messages').all()).results.length,0)
  await app.db.prepare('ALTER TABLE synthetic_pane_unavailable_revisions RENAME TO pane_revisions').run()
  await app.db.prepare('ALTER TABLE synthetic_pane_unavailable_messages RENAME TO pane_messages').run()
  for(let index=0;index<2;index++){
   const event=await(await app.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'* * * * *'});assert.equal(event.outcome,'ok')
   const rows=(await app.db.prepare('SELECT * FROM pane_messages').all()).results
   assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal(rows[0].message,'Queued through the outage')
  }
  assert.equal((await send()).status,303)
  await(await app.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'* * * * *'})
  assert.equal((await app.db.prepare('SELECT * FROM pane_messages').all()).results.length,1)
 }finally{await app.mf.dispose()}
})

test('policy starters name actual services, remain editable drafts and require owner publication',async()=>{
 const app=await runtime()
 try{
  const boot=await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})})
  const cookie=boot.headers.get('set-cookie').split(';')[0]
  const post=(path,body,who=cookie)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:who,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const site={...fixture,styles:{body:'adobe:synthetic-pane-body',adobe:{project:'syn0001',families:['synthetic-pane-body'],authorized:true}},analytics:{ga4:'G-SYNTH12345',vane:{origin:'https://vane.example.test',site:'synthetic-pane-1'}}}
  const draft=await(await post('/api/pane/prepare',{site})).json();await post('/api/pane/publish',{revision:draft.id})
  assert.equal((await post('/api/pane/policies/generate',{base:draft.id},'')).status,401)
  const generated=await(await post('/api/pane/policies/generate',{base:draft.id})).json()
  assert.equal(generated.site.pages.length,site.pages.length+3)
  const privacy=generated.site.pages.find(p=>p.slug==='privacy-policy')
  for(const name of ['Google Analytics 4 (GA4)','Vane','Cloudflare Turnstile','name, email address and message','not legal advice','Rejected form content retention is off by default','30 days','legal hold','excluded from installation archives'])assert.ok(privacy.body.includes(name),name)
  assert.ok(privacy.body.includes(site.styles.adobe.project),'The policy draft identifies the owner-connected Adobe project')
  assert.doesNotMatch(privacy.body,/HubSpot|Orbit|Meta Pixel|Mailchimp/,'Unconnected services are never invented')
  assert.equal((await app.request('/site/privacy-policy')).status,404)
  const edited=await(await post('/api/pane/prepare',{base:generated.id,site:{...generated.site,pages:generated.site.pages.map(p=>p.slug==='privacy-policy'?{...p,body:p.body+'\n\nContact our business at the studio.'}:p)}})).json()
  assert.equal((await post('/api/pane/policies/generate',{base:edited.id})).status,400,'Regeneration does not overwrite reviewed text')
  await post('/api/pane/publish',{revision:edited.id})
  for(const slug of ['privacy-policy','terms','accessibility']){
   const response=await app.request('/site/'+slug);assert.equal(response.status,200);assert.match(await response.text(),/Starter for owner review — not legal advice/)
  }
  assert.match(await(await app.request('/site/privacy-policy')).text(),/Contact our business at the studio/)
 }finally{await app.mf.dispose()}
})

test('ownership handover atomically grants the business owner, demotes the designer and permits immediate revocation',async()=>{
 const app=await runtime();let mail
 const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 const request=cookie=>new Request(origin+'/auth/invite',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,Cookie:cookie??''}})
 const post=(path,body,cookie)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(body)})
 const confirm=async()=>{const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token');const response=await post('/auth/confirm',{token});assert.equal(response.status,303,await response.clone().text());return response.headers.get('set-cookie').split(';')[0]}
 const signIn=async email=>{await native.requestMagicLink(request(),{email,returnTo:'/app'});return confirm()}
 try{
  const boot=await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic designer'}),original=boot.headers.get('set-cookie').split(';')[0]
  let designer=original
  const prepared=await(await post('/api/pane/prepare',{site:fixture},designer)).json();await post('/api/pane/publish',{revision:prepared.id},designer)
  const clients=[]
  for(const n of [1,2]){
   const email='synthetic-pane-business-'+n+'@example.test';await native.invite(request(designer),{email,displayName:'Synthetic business '+n,role:'member'})
   const cookie=await confirm(),person=await app.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind(email).first();clients.push({email,id:person.id,cookie})
  }
  const input=client=>({operatorId:client.id,email:client.email,confirm:'transfer-ownership'})
  assert.equal((await post('/api/pane/ownership/transfer',input(clients[0]),'')).status,401)
  assert.equal((await post('/api/pane/ownership/transfer',input(clients[0]),clients[0].cookie)).status,403)
  assert.equal((await post('/api/pane/ownership/transfer',input(clients[0]),designer)).status,400,'Bootstrap alone has no fresh native proof')
  designer=await signIn(settings.OWNER_EMAIL)
  assert.equal((await post('/api/pane/ownership/transfer',{...input(clients[0]),confirm:''},designer)).status,400)
  assert.equal((await post('/api/pane/ownership/transfer',{...input(clients[0]),email:'other@example.test'},designer)).status,400)
  const minted=await(await post('/api/pane/tokens/create',{name:'synthetic-pane-1',scopes:['status:read']},designer)).json()
  const race=await Promise.all(clients.map(client=>post('/api/pane/ownership/transfer',input(client),designer)))
  assert.equal(race.filter(r=>r.status===200).length,1);assert.ok(race.filter(r=>r.status!==200).every(r=>[400,401,403,409].includes(r.status)))
  const changed=await race.find(r=>r.status===200).json(),business=clients.find(c=>c.id===changed.owner)
  assert.deepEqual(changed.designerRoles,['editor'])
  assert.equal((await app.request('/api/pane',{headers:{Cookie:designer}})).status,401,'All previous designer sessions are fenced')
  assert.equal((await app.request('/api/pane',{headers:{Authorization:'Bearer '+minted.token}})).status,401,'Pre-transfer agent tokens are fenced')
  assert.equal((await app.request('/api/pane',{headers:{Cookie:business.cookie}})).status,401,'Business user must sign in with their new authority')
  const businessCookie=await signIn(business.email),editor=await signIn(settings.OWNER_EMAIL)
  const ownerData=await(await app.request('/api/pane',{headers:{Cookie:businessCookie}})).json(),editorData=await(await app.request('/api/pane',{headers:{Cookie:editor}})).json()
  assert.equal(ownerData.role,'owner');assert.equal(editorData.roleLabel,'editor')
  assert.equal((await post('/api/pane/prepare',{base:editorData.draft.id,site:{...fixture,description:'Designer draft after handover'}},editor)).status,200)
  for(const path of ['/api/pane/publish','/api/pane/roles/set','/api/pane/team/revoke'])assert.equal((await post(path,{},editor)).status,403,path)
  assert.equal(editorData.messages.length,0);assert.equal(editorData.activity,undefined)
  const history=await(await app.request('/api/pane/activity',{headers:{Cookie:businessCookie}})).json()
  assert.ok(history.filter(row=>row.subject.startsWith('person:')&&row.actor==='Synthetic designer').length>=2,'Promotion and demotion retain the transfer actor')
  assert.equal((await post('/api/pane/team/revoke',{operatorId:changed.designer,confirm:'revoke-access'},businessCookie)).status,200)
  assert.equal((await app.request('/api/pane',{headers:{Cookie:editor}})).status,401,'Revocation takes effect on the next request')
  assert.equal((await app.db.prepare("SELECT COUNT(*) AS total FROM oa_operators WHERE role='owner' AND status='active'").first()).total,1)
 }finally{await app.mf.dispose()}
})

test('person privacy finds three enquiries, exports portable records, atomically erases and fences old account backups',async()=>{
 const app=await runtime();let mail
 const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 const post=(path,body,cookie)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(body)})
 const req=cookie=>new Request(origin+'/auth/invite',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,Cookie:cookie??''}})
 const consume=async()=>{const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token');const response=await post('/auth/confirm',{token});assert.equal(response.status,303);return response.headers.get('set-cookie').split(';')[0]}
 try{
  let ownerCookie=(await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  await native.requestMagicLink(req(),{email:settings.OWNER_EMAIL});ownerCookie=await consume()
  await native.invite(req(ownerCookie),{email:'synthetic-pane-person@example.test',displayName:'Synthetic person',role:'member'});const personCookie=await consume()
  const draft=await(await post('/api/pane/prepare',{site:fixture},ownerCookie)).json();await post('/api/pane/publish',{revision:draft.id},ownerCookie)
  const ids=[]
  for(const email of ['synthetic-pane-person@example.test','SYNTHETIC-PANE-PERSON@example.test','synthetic-pane-person@example.test','synthetic-pane-other@example.test']){
   const id=crypto.randomUUID();ids.push(id)
   assert.equal((await app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:id,name:'Synthetic person',email,message:'Synthetic private message '+id,'cf-turnstile-response':'synthetic-pane-3'})})).status,303)
  }
  await post('/api/pane/messages/reply',{id:ids[0],idempotency:crypto.randomUUID(),subject:'Your enquiry',body:'Synthetic response',confirm:'send-reply'},ownerCookie)
  const input={email:' SYNTHETIC-PANE-PERSON@example.test '}
  assert.equal((await post('/api/pane/privacy/find',input,personCookie)).status,403)
  const found=await(await post('/api/pane/privacy/find',input,ownerCookie)).json()
  assert.equal(found.messages.length,3);assert.equal(found.replies.length,1);assert.equal(found.accounts.length,1);assert.deepEqual(found.crmDeliveries,[])
  const exported=await post('/api/pane/privacy/export',input,ownerCookie)
  assert.equal(exported.headers.get('content-disposition'),'attachment; filename="pane-person.json"')
  const portable=await exported.json();assert.equal(portable.messages.length,3);assert.doesNotMatch(JSON.stringify(portable),/token_hash|SESSION_SECRET|test-session-key/)
  const older=await exportData(app.db)
  assert.equal((await post('/api/pane/privacy/erase',{...input,confirm:''},ownerCookie)).status,400)
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS total FROM pane_messages').first()).total,4,'Missing confirmation makes no partial deletion')
  const erased=await post('/api/pane/privacy/erase',{...input,confirm:'erase-person-data'},ownerCookie)
  assert.equal(erased.status,200,await erased.clone().text());assert.equal((await erased.json()).erasedMessages,3)
  const after=await(await post('/api/pane/privacy/find',input,ownerCookie)).json()
  for(const field of ['messages','replies','accounts','externalIdentities','credentials','activity'])assert.equal(after[field].length,0,field)
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS total FROM pane_messages').first()).total,1,'Other people are preserved')
  assert.equal((await app.request('/api/pane',{headers:{Cookie:personCookie}})).status,401)
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS total FROM pane_erased_messages WHERE id IN (?,?,?)').bind(...ids.slice(0,3)).first()).total,3)
  const later=await exportData(app.db),restored=await runtime(),old=await runtime()
  try{assert.equal((await restore(restored.db,later)).phase,'complete');await assert.rejects(restore(old.db,older,later),/erased_row|erasure_epoch/)}finally{await restored.mf.dispose();await old.mf.dispose()}
  assert.equal((await post('/api/pane/privacy/erase',{email:settings.OWNER_EMAIL,confirm:'erase-person-data'},ownerCookie)).status,400,'An active owner account cannot be erased')
 }finally{await app.mf.dispose()}
})

test('person erasure includes pending durable enquiries and prevents their recovery delivery',async()=>{
 const {app,submit}=await formFixture({isolatedLive:true,marketing:true});let mail
 const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 const post=(path,body,cookie)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),cookie=(await post('/auth/confirm',{token})).headers.get('set-cookie').split(';')[0]
  const id=crypto.randomUUID(),email=['synthetic-pane-pending','example.test'].join('@')
  assert.equal((await submit('contact',{email,email_marketing:'yes'},undefined,id)).status,303)
  const found=await(await post('/api/pane/privacy/find',{email},cookie)).json();assert.equal(found.queued.length,1);assert.equal(found.messages.length,0);assert.deepEqual(found.marketingConsents[0].choices.map(choice=>[choice.channel,choice.granted]),[['email',true],['sms',false]])
  const exported=await post('/api/pane/privacy/export',{email},cookie);assert.equal(exported.status,200);assert.deepEqual((await exported.json()).marketingConsents,found.marketingConsents)
  const erased=await post('/api/pane/privacy/erase',{email,confirm:'erase-person-data'},cookie);assert.equal(erased.status,200,await erased.clone().text())
  assert.equal((await(await post('/api/pane/privacy/find',{email},cookie)).json()).queued.length,0)
  assert.equal((await submit('contact',{email,sms_marketing:'yes'},undefined,id)).status,303)
  assert.deepEqual((await(await post('/api/pane/privacy/find',{email},cookie)).json()).marketingConsents,[])
  await(await app.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'* * * * *'})
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS total FROM pane_messages').first()).total,0)
  assert.ok(await app.db.prepare('SELECT id FROM pane_erased_messages WHERE id=?').bind(id).first())
 }finally{await app.mf.dispose()}
})

test('published promotions target selected pages while invalid settings and unauthorized changes stay fenced',async()=>{
 const app=await runtime()
 const post=(path,body,cookie='')=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
 try {
  const boot=await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic promotion owner'}),cookie=boot.headers.get('set-cookie').split(';')[0]
  const site=structuredClone(fixture)
  site.promotion={title:'Studio news',text:'Read our latest news.',pages:['home','about'],days:7,delay:10,scroll:50,exit:true,link:'/site/contact',label:'Contact us',start:'2026-11-01T08:00',end:'2026-11-02T08:00'}
  const clean=await(await post('/api/pane/prepare',{site:fixture},cookie)).json();await post('/api/pane/publish',{revision:clean.id},cookie)
  const prepared=await post('/api/pane/prepare',{site},cookie);assert.equal(prepared.status,200,await prepared.clone().text());const draft=await prepared.json()
  assert.doesNotMatch(await(await app.request('/site')).text(),/data-promotion=/,'Drafts do not activate a promotion')
  assert.doesNotMatch(await(await app.request('/preview/'+draft.id+'/home',{headers:{Cookie:cookie}})).text(),/data-promotion=/,'Previews do not execute promotions')
  assert.equal((await post('/api/pane/publish',{revision:draft.id},cookie)).status,200)
  for(const path of ['/site','/site/about']) {
   const html=await(await app.request(path)).text();assert.match(html,/data-promotion=/);assert.match(html,/aria-labelledby="promotion-title"/);assert.match(html,/data-promotion-close>Close/)
  }
  for(const path of ['/site/contact','/site/search','/site/unknown'])assert.doesNotMatch(await(await app.request(path)).text(),/data-promotion=/,path)
  for(const patch of [{pages:['missing']},{days:0},{delay:0},{scroll:101},{delay:undefined,scroll:undefined,exit:false},{link:'https://elsewhere.invalid'},{start:'2026-11-01T01:30'},{end:'2026-10-01T08:00'}]) {
   const result=await post('/api/pane/prepare',{site:{...site,promotion:{...site.promotion,...patch}}},cookie);assert.equal(result.status,400,JSON.stringify(patch))
  }
  assert.equal((await post('/api/pane/prepare',{site})).status,401)
  assert.equal((await app.request('/api/pane/prepare',{method:'POST',headers:{Origin:'https://elsewhere.invalid',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({site})})).status,403)
 } finally {await app.mf.dispose()}
})

// Fresh native installation for rejected-content custody journeys.
async function spamFixture(isolatedLive=false){
 const app=await runtime({isolatedLive})
 const boot=await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic spam owner'})})
 let cookie=boot.headers.get('set-cookie').split(';')[0]
 await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
 let proof
 const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{proof=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL,returnTo:'/app'})
 const token=new URL(proof.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
 const confirmed=await app.request('/auth/confirm',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token})});cookie=confirmed.headers.get('set-cookie').split(';')[0]
 const post=(path,input,who=cookie)=>app.request(path,{method:'POST',headers:{Cookie:who,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)})
 const site=structuredClone(fixture);site.pages.find(p=>p.slug==='contact').acknowledgment={subject:'Synthetic acknowledgment',text:'Synthetic text',responseTime:'One day'}
 const rev=await(await post('/api/pane/prepare',{site})).json();assert.equal((await post('/api/pane/publish',{revision:rev.id})).status,200)
 const send=(id=crypto.randomUUID(),fields={})=>app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:id,name:'Synthetic rejected visitor',email:'synthetic-pane-rejected@example.test',message:'Synthetic private rejected content <script>probe</script>',website:'synthetic-pane-4',...fields})})
 const read=async()=>await(await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
 return {app,cookie,post,send,read}
}

test('rejected content is opt-in, owner-only and expires after thirty days unless explicitly held',async()=>{
 const {app,cookie,post,send,read}=await spamFixture(true)
 try{
  assert.equal((await read()).spamRetention,false)
  await send();assert.equal((await read()).rejectedContent.length,0)
  assert.equal((await post('/api/pane/spam/settings',{enabled:'on'})).status,400)
  assert.equal((await post('/api/pane/spam/settings',{enabled:'on',confirm:'change-retention'})).status,200)
  const id=crypto.randomUUID();assert.equal((await send(id)).status,403)
  let state=await read();assert.equal(state.rejectedContent.length,1)
  const row=state.rejectedContent[0];assert.equal(row.id,id);assert.equal(row.expires_at-Date.parse(row.created_at),30*86400000)
  assert.equal(state.messages.length,0);assert.doesNotMatch(JSON.stringify(state.formRejections),/Synthetic private rejected|synthetic-pane-rejected/)
  const html=await(await app.request('/app/inquiries',{headers:{Cookie:cookie}})).text();assert.match(html,/&lt;script&gt;probe&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>probe/)
  let mail
  const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  for(const role of ['admin','member']){
   await native.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{email:'synthetic-pane-'+role+'@example.test',displayName:'Synthetic '+role,role})
   const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),admitted=await post('/auth/confirm',{token},'')
   const who=admitted.headers.get('set-cookie').split(';')[0]
   const data=await(await app.request('/api/pane',{headers:{Cookie:who}})).json();assert.equal(data.rejectedContent,undefined);assert.equal(data.spamRetention,undefined);assert.deepEqual(data.formRejections,[])
   assert.doesNotMatch(await(await app.request('/app/inquiries',{headers:{Cookie:who}})).text(),/Synthetic private rejected content|Spam protection review/)
   for(const action of ['settings','hold','release','rescue','purge'])assert.equal((await post('/api/pane/spam/'+action,{id,enabled:'on',confirm:action==='settings'?'change-retention':action+'-rejected'},who)).status,403)
  }
  assert.equal((await app.request('/api/pane')).status,401)
  assert.equal((await post('/api/pane/spam/hold',{id,confirm:'hold-rejected'})).status,200)
  const scheduled=async time=>assert.equal((await(await app.mf.getWorker()).scheduled({scheduledTime:new Date(time),cron:'* * * * *'})).outcome,'ok')
  await scheduled(row.expires_at+1);assert.equal((await read()).rejectedContent[0].held,1)
  assert.equal((await post('/api/pane/spam/release',{id,confirm:'release-rejected'})).status,200)
  await scheduled(row.expires_at-1);assert.equal((await read()).rejectedContent.length,1)
  await scheduled(row.expires_at);assert.equal((await read()).rejectedContent.length,0)
  assert.equal((await post('/api/pane/spam/settings',{enabled:'off',confirm:'change-retention'})).status,200)
  await send();assert.equal((await read()).rejectedContent.length,0)
 }finally{await app.mf.dispose()}
})

test('owner rescues a rejection once without an automatic reply and confirmed purge fences replay',async()=>{
 const {app,post,send,read}=await spamFixture()
 try{
  await post('/api/pane/spam/settings',{enabled:'on',confirm:'change-retention'})
  const id=crypto.randomUUID();await send(id);await send(id)
  assert.equal((await read()).rejectedContent.length,1)
  assert.equal((await post('/api/pane/spam/rescue',{id})).status,400)
  const attempts=await Promise.all([post('/api/pane/spam/rescue',{id,confirm:'rescue-rejected'}),post('/api/pane/spam/rescue',{id,confirm:'rescue-rejected'})])
  assert.ok(attempts.some(r=>r.status===200))
  let state=await read();assert.equal(state.messages.length,1);assert.equal(state.messages[0].id,id);assert.equal(state.messages[0].acknowledgment_status,'not_requested');assert.equal(state.rejectedContent.length,0)
  assert.equal((await post('/api/pane/spam/rescue',{id,confirm:'rescue-rejected'})).status,400)
  await send(id);assert.equal((await read()).rejectedContent.length,0)
  const purge=crypto.randomUUID();await send(purge)
  assert.equal((await post('/api/pane/spam/purge',{id:purge})).status,400);assert.equal((await read()).rejectedContent.length,1)
  assert.equal((await post('/api/pane/spam/purge',{id:purge,confirm:'purge-rejected'})).status,200)
  await send(purge);state=await read();assert.equal(state.rejectedContent.length,0);assert.equal(state.messages.length,1)
  const audit=(await app.db.prepare("SELECT * FROM pane_activity WHERE action LIKE 'spam.%'").all()).results
  assert.ok(audit.some(r=>r.action==='spam.rescue'));assert.ok(audit.some(r=>r.action==='spam.purge'));assert.doesNotMatch(JSON.stringify(audit),/synthetic-pane-rejected@example.test|Synthetic private rejected/)
 }finally{await app.mf.dispose()}
})

test('rejected answers join person export and atomic erasure while legal holds refuse deletion and archives exclude content',async()=>{
 const {app,post,send,read}=await spamFixture(true)
 try{
  await post('/api/pane/spam/settings',{enabled:'on',confirm:'change-retention'})
  const id=crypto.randomUUID(),email='synthetic-pane-rejected@example.test';await send(id)
  const older=await exportData(app.db)
  assert.doesNotMatch(JSON.stringify(older),/Synthetic private rejected content|synthetic-pane-rejected@example.test/)
  const copy=await runtime();try{assert.equal((await restore(copy.db,older)).phase,'complete');assert.equal(await copy.db.prepare('SELECT COUNT(*) AS n FROM pane_rejected_content').first('n'),0);assert.equal(await copy.db.prepare('SELECT enabled FROM pane_spam_settings').first('enabled'),0)}finally{await copy.mf.dispose()}
  let found=await(await post('/api/pane/privacy/find',{email:email.toUpperCase()})).json();assert.equal(found.rejected.length,1)
  const exported=await post('/api/pane/privacy/export',{email});assert.equal(exported.status,200,await exported.clone().text());assert.equal((await exported.json()).rejected[0].id,id)
  await post('/api/pane/spam/hold',{id,confirm:'hold-rejected'})
  for(const action of ['rescue','purge'])assert.equal((await post('/api/pane/spam/'+action,{id,confirm:action+'-rejected'})).status,400)
  assert.equal((await post('/api/pane/privacy/erase',{email,confirm:'erase-person-data'})).status,400)
  assert.equal((await read()).rejectedContent.length,1)
  await post('/api/pane/spam/release',{id,confirm:'release-rejected'})
  assert.equal((await post('/api/pane/privacy/erase',{email,confirm:'erase-person-data'})).status,200)
  found=await(await post('/api/pane/privacy/find',{email})).json();assert.deepEqual(found.rejected,[])
  await send(id);assert.equal((await read()).rejectedContent.length,0)
  const later=await exportData(app.db),old=await runtime();try{await assert.rejects(restore(old.db,older,later),/erased_row|erasure_epoch/)}finally{await old.mf.dispose()}
 }finally{await app.mf.dispose()}
})

async function gatedFixture(){
 const app=await runtime(),call=(path,body,cookie='')=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Access owner'}),cookie=signed.headers.get('set-cookie').split(';')[0]
 await app.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
 const site=structuredClone(fixture);site.folders=['Private','Members'];site.pages.find(p=>p.slug==='about').folder='Private';site.pages.find(p=>p.slug==='services').folder='Members'
 const prepared=await call('/api/pane/prepare',{site},cookie);assert.equal(prepared.status,200);let draft=await prepared.json()
 const save=async(extra={})=>{
  const body=new URLSearchParams({base:draft.id,gateMode:'open',gateTitle:'Opening soon',gateMessage:'We are getting ready.',...Object.fromEntries(site.pages.map((_,i)=>['page.'+i+'.mode','public'])),'folder.0.mode':'password','folder.0.password':'synthetic-pane-42','folder.1.mode':'members',...extra})
  const response=await app.request('/app/access',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body});assert.equal(response.status,303,await response.text())
  draft=(await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).draft
  assert.equal((await call('/api/pane/publish',{revision:draft.id},cookie)).status,200)
  return draft
 }
 return {app,call,cookie,save,get draft(){return draft}}
}
test('page and folder gates require passwords or explicitly admitted active native members without leaking through discovery',async()=>{
 const proof=await gatedFixture(),{app,call,cookie}=proof
 try{
  let message
  const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{message=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,Cookie:cookie}}),{email:'synthetic-pane-44@example.test',displayName:'Admitted reader',role:'member'})
  const token=new URL(message.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),signed=await call('/auth/confirm',{token}),memberCookie=signed.headers.get('set-cookie').split(';')[0]
  const person=await app.db.prepare('SELECT id FROM oa_operators WHERE email=?').bind('synthetic-pane-44@example.test').first()
  await proof.save({members:person.id,'page.3.mode':'password','page.3.password':'synthetic-pane-43'})
  for(const path of ['/site/about','/site/hours','/site/services']){
   const locked=await app.request(path);assert.match(locked.headers.get('cache-control'),/private, no-store/);assert.match(locked.headers.get('x-robots-tag'),/noindex/)
   const html=await locked.text();assert.ok(!html.includes(fixture.pages.find(p=>path.endsWith('/'+p.slug)).body))
   assert.ok(!(await (await app.request(path,{method:'HEAD'})).text()).length)
  }
  const unlock=async(password)=>app.request('/site/about?unlock=1',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password})})
  assert.equal((await unlock('wrong')).status,403)
  const opened=await unlock('synthetic-pane-42');assert.equal(opened.status,303)
  const passwordCookie=opened.headers.get('set-cookie').split(';')[0];assert.match(opened.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/)
  const privatePage=await app.request('/site/about',{headers:{Cookie:passwordCookie}});assert.match(await privatePage.text(),new RegExp(fixture.pages.find(p=>p.slug==='about').body));assert.match(privatePage.headers.get('cache-control'),/private, no-store/);assert.equal(privatePage.headers.get('vary'),'Cookie')
  const expired=Date.now()-1000,rule=proof.draft.site.access.folders.Private,signature=createHmac('sha256',settings.SESSION_SECRET).update('pane-access:'+JSON.stringify(rule)+':'+expired).digest('hex')
  const expiredCookie=passwordCookie.split('=')[0]+'='+expired+'.'+signature
  assert.ok(!(await (await app.request('/site/about',{headers:{Cookie:expiredCookie}})).text()).includes(fixture.pages.find(p=>p.slug==='about').body),'A correctly signed but expired password proof is refused by the server')
  assert.ok(!(await (await app.request('/site/about')).text()).includes(fixture.pages.find(p=>p.slug==='about').body),'Another visitor never receives an opened response')
  assert.equal((await app.request('/site/services')).status,403)
  assert.match(await (await app.request('/site/services',{headers:{Cookie:memberCookie}})).text(),new RegExp(fixture.pages.find(p=>p.slug==='services').body))
  assert.equal((await app.request('/site/services',{headers:{Cookie:cookie}})).status,403,'Owner is not automatically a site member')
  const memberBody=fixture.pages.find(p=>p.slug==='services').body
  const preview=await app.request('/preview/'+proof.draft.id+'/services',{headers:{Cookie:cookie}})
  assert.equal(preview.status,200);assert.ok((await preview.text()).includes(memberBody))
  assert.equal((await app.request('/site/services',{headers:{Cookie:cookie}})).status,403,'Preview grants no member access')
  assert.deepEqual((await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).live.site.access.members,[person.id],'Preview leaves member admission unchanged')
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,Cookie:cookie}}),{email:'synthetic-pane-48@example.test',displayName:'Unadmitted reader',role:'member'})
  const otherToken=new URL(message.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),otherSigned=await call('/auth/confirm',{token:otherToken}),otherCookie=otherSigned.headers.get('set-cookie').split(';')[0]
  assert.equal((await app.request('/site/services',{headers:{Cookie:otherCookie,'X-Paid-Member':'true','X-Subscription-Status':'active'}})).status,403,'An active native account and claimed paid signals grant no admission')
  assert.ok((await (await app.request('/site/services',{headers:{Cookie:memberCookie}})).text()).includes(memberBody),'Explicit admission still opens the same page')
  await proof.save({members:'','page.3.mode':'password'})
  assert.equal((await app.request('/site/services',{headers:{Cookie:memberCookie}})).status,403,'Removing admission takes effect on the next request')
  await proof.save({members:person.id,'page.3.mode':'password'})
  assert.ok((await (await app.request('/site/services',{headers:{Cookie:memberCookie}})).text()).includes(memberBody))
  const sitemap=await (await app.request('/sitemap.xml')).text();for(const path of ['about','services','hours'])assert.ok(!sitemap.includes('/site/'+path))
  const search=await (await app.request('/site/search?q='+encodeURIComponent(fixture.pages.find(p=>p.slug==='about').body.split(' ')[0]))).text();assert.ok(!search.includes('<a href="/site/about">'))
  assert.equal((await app.request('/site/about?unlock=1',{method:'POST',headers:{Origin:'https://foreign.invalid'},body:'password=synthetic-pane-42'})).status,403)
  assert.equal((await call('/api/pane/roles/set',{operatorId:person.id,roles:['editor']},cookie)).status,200)
  const unauthorized=structuredClone(proof.draft.site);unauthorized.access.mode='coming-soon'
  assert.equal((await call('/api/pane/prepare',{site:unauthorized},memberCookie)).status,403,'An editor cannot change admission or gates')
  assert.equal((await call('/api/pane/access',{},memberCookie)).status,403)
  await app.db.prepare("UPDATE oa_operators SET status='inactive' WHERE id=?").bind(person.id).run()
  assert.equal((await app.request('/site/services',{headers:{Cookie:memberCookie}})).status,403,'Native revocation applies on the next request')
  const proposed=structuredClone(proof.draft.site);proposed.access.mode='coming-soon'
  assert.equal((await call('/api/pane/prepare',{site:proposed},memberCookie)).status,401)
  await proof.save({'folder.0.password':'synthetic-pane-45'})
  assert.ok(!(await (await app.request('/site/about',{headers:{Cookie:passwordCookie}})).text()).includes(fixture.pages.find(p=>p.slug==='about').body),'Password rotation invalidates old proofs')
 }finally{await app.mf.dispose()}
})
test('coming-soon and site password gates cover every live URL while previews and disabling restore the published site',async()=>{
 const proof=await gatedFixture(),{app,cookie}=proof
 try{
  await proof.save({gateMode:'coming-soon',sitePassword:'synthetic-pane-46'})
  for(const path of ['/site','/site/about','/site/search?q=secret','/site/unknown/route','/site/visit']){
   const response=await app.request(path);assert.equal(response.status,200);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.match(await response.text(),/Opening soon/)
  }
  assert.ok(!(await (await app.request('/sitemap.xml')).text()).includes('<loc>'))
  const preview=await app.request('/preview/'+proof.draft.id+'/home',{headers:{Cookie:cookie}});assert.equal(preview.status,200);assert.match(await preview.text(),/Draft preview/)
  const opened=await app.request('/site?unlock=1',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'password=synthetic-pane-46'})
  assert.equal(opened.status,303);assert.match(await (await app.request('/site',{headers:{Cookie:opened.headers.get('set-cookie').split(';')[0]}})).text(),new RegExp(fixture.pages[0].body))
  assert.equal((await app.request('/site/services',{headers:{Cookie:opened.headers.get('set-cookie').split(';')[0]}})).status,403,'A site password never bypasses a member-only folder')
  await proof.save({gateMode:'password',sitePassword:'synthetic-pane-47'})
  assert.match(await (await app.request('/site/contact')).text(),/Opening soon/)
  await proof.save({gateMode:'open','folder.0.mode':'public','folder.1.mode':'public'})
  assert.match(await (await app.request('/site')).text(),new RegExp(fixture.pages[0].body));assert.match(await (await app.request('/site/about')).text(),new RegExp(fixture.pages[1].body))
 }finally{await app.mf.dispose()}
})

const quoteDefinition={id:'synthetic-pane-60',name:'Request a quote',submit:'Send quote',confirmation:'Your quote request is safely received.',fields:[
 {key:'name',type:'text',label:'Your name',help:'',placeholder:'',required:true},
 {key:'email',type:'email',label:'Email address',help:'We reply here.',placeholder:'',required:true},
 {key:'phone',type:'phone',label:'US phone',help:'Use the number where we can reach you.',placeholder:'312 555 0123',required:true},
 {key:'address',type:'address',label:'Project address',help:'',placeholder:'',required:false},
 {key:'service',type:'choice',label:'Service',help:'',placeholder:'',required:true,options:['Repair','New furniture']},
 {key:'date',type:'date',label:'Preferred date',help:'',placeholder:'',required:false},
 {key:'consent',type:'consent',label:'You may contact me about this request.',help:'',placeholder:'',required:true},
 {key:'message',type:'text',label:'Project details',help:'',placeholder:'',required:true},
 {key:'file',type:'file',label:'Project PDF',help:'Private project information.',placeholder:'',required:false},
]}
const marketingFields=[
 {key:'email_marketing',type:'email-consent',label:'Send me studio news by email.',help:'You can withdraw your choice.',placeholder:'',required:false},
 {key:'sms_marketing',type:'sms-consent',label:'Send me studio updates by text.',help:'Message and data rates may apply.',placeholder:'',required:false,business:'Cedar Street Studio',frequency:'Up to four messages per month'},
]
async function formFixture({marketing=false,...options}={}){
 const app=await runtime(options),call=(path,body,cookie='')=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Forms owner'}),cookie=signed.headers.get('set-cookie').split(';')[0]
 await app.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
 const site=structuredClone(fixture);site.forms=[structuredClone(quoteDefinition)];if(marketing)site.forms[0].fields.push(...structuredClone(marketingFields));site.pages[1].formId=quoteDefinition.id;site.pages[4].formId=quoteDefinition.id
 const draft=await (await call('/api/pane/prepare',{site},cookie)).json();assert.ok(draft.id)
 assert.equal((await call('/api/pane/publish',{revision:draft.id},cookie)).status,200)
 const submit=async(slug='contact',changes={},file,id=crypto.randomUUID(),proof=true)=>{
  const fields=new FormData();for(const [key,value] of Object.entries({idempotency:id,name:'Synthetic visitor',email:'synthetic-pane-61@example.test',phone:'312 555 0123',address:'Workshop',service:'Repair',date:'2030-06-20',consent:'yes',message:'Please repair my chair.',...changes}))fields.set(key,value)
  if(marketing&&!Object.hasOwn(changes,'consent_schema'))fields.set('consent_schema',(await (await app.request('/site/'+slug)).text()).match(/name="consent_schema" value="([^"]+)"/)[1])
  if(proof)fields.set('cf-turnstile-response','synthetic-pane-3:'+createHash('sha256').update(slug).digest('hex'))
  if(file)fields.set('file',file,'project.pdf')
  return app.request('/site/'+slug,{method:'POST',headers:{Origin:origin},body:fields})
 }
 return {app,call,cookie,site,draft,submit}
}
test('reusable typed forms preserve invalid answers, enforce every field type, accept a private five MB PDF and refuse unsafe files through public doors',async()=>{
 const {app,cookie,submit}=await formFixture()
 try{
  for(const slug of ['about','contact']){const html=await (await app.request('/site/'+slug)).text();assert.match(html,/Request a quote/);assert.match(html,/aria-describedby="field-phone-help"/);assert.match(html,/name="phone" required aria-required="true"/)}
  const invalid=await submit('contact',{phone:'',email:'bad-email'});assert.equal(invalid.status,400);const html=await invalid.text()
  assert.match(html,/id="field-phone"[^>]*aria-describedby="field-phone-help field-phone-error"[^>]*aria-invalid="true"/);assert.match(html,/Enter a valid email address/);assert.match(html,/value="Synthetic visitor"/);assert.match(html,/Please repair my chair/);assert.match(html,/role="alert"/)
  for(const changes of [{phone:'111'}, {date:'2030-02-30'}, {service:'Unknown'}, {consent:'no'}])assert.equal((await submit('about',changes)).status,400)
  const pdf=new Uint8Array(5*1024*1024);pdf.set(new TextEncoder().encode('%PDF-1.7\nsynthetic-pane-62'));pdf.fill(32,32)
  const id=crypto.randomUUID(),accepted=await submit('about',{},new File([pdf],'project.pdf',{type:'application/pdf'}),id);assert.equal(accepted.status,303,await accepted.text())
  const dashboard=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json(),message=dashboard.messages.find(message=>message.id===id),file=message.files[0]
  assert.equal(file.size,pdf.length);assert.match(message.message,/US phone: 312 555 0123/)
  assert.equal((await app.request('/app/files/'+file.id)).status,303)
  assert.equal((await app.request('/api/pane/files/'+file.id)).status,401)
  const downloaded=await app.request('/app/files/'+file.id,{headers:{Cookie:cookie}});assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('cache-control'),/private, no-store/);assert.match(downloaded.headers.get('content-disposition'),/attachment/);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),pdf)
  const confirmation=await app.request(accepted.headers.get('location'));assert.match(await confirmation.text(),/Your quote request is safely received/)
  assert.equal((await submit('about',{},new File([new Uint8Array(5*1024*1024+1)],'project.pdf',{type:'application/pdf'}))).status,400)
  assert.equal((await submit('contact',{},new File(['not a PDF'],'project.pdf',{type:'application/pdf'}))).status,400)
  assert.equal((await submit('contact',{},new File(['%PDF-fake'],'project.pdf',{type:'text/plain'}))).status,400)
  assert.equal((await submit('contact',{website:'spam'})).status,403)
  assert.equal((await submit('contact',{},undefined,crypto.randomUUID(),false)).status,403)
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first()).n,1)
  assert.equal((await app.request('/site/contact',{method:'POST',headers:{Origin:'https://foreign.invalid'},body:new FormData()})).status,403)
 }finally{await app.mf.dispose()}
})
// An independent CSV reader checks embedded newlines and escaped quote fidelity.
function submissionRows(text){
 const rows=[];let row=[],value='',quoted=false
 for(let i=0;i<text.length;i++){
  const char=text[i]
  if(char==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(char===','&&!quoted){row.push(value);value=''}
  else if(char==='\r'&&text[i+1]==='\n'&&!quoted){row.push(value);rows.push(row);row=[];value='';i++}
  else value+=char
 }
 assert.equal(quoted,false,'CSV quotes are balanced')
 return rows
}
test('native submission CSV filters stable forms and inclusive UTC dates beyond the inbox limit without exposing erased or unauthorized records',async()=>{
 let instant=Date.parse('2030-06-19T23:59:59.999Z')
 const {app,call,cookie,site,submit}=await formFixture({now:()=>instant})
 const email=['synthetic-pane-81','example.test'].join('@'),get=(query,credential=cookie)=>app.request('/api/pane/submissions/export?'+query,{headers:{Cookie:credential}})
 const range='form='+quoteDefinition.id+'&from=2030-06-20&to=2030-06-20'
 try{
  // Same display name, different identity: names and placement paths are never filters.
  const other={...structuredClone(quoteDefinition),id:'synthetic-pane-other-form'};site.forms.push(other);site.pages[1].formId=other.id
  const latest=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
  const revision=await (await call('/api/pane/prepare',{site,base:latest.draft.id},cookie)).json();assert.ok(revision.id);await call('/api/pane/publish',{revision:revision.id},cookie)
  const send=async(slug='contact',changes={},id=crypto.randomUUID())=>{assert.equal((await submit(slug,{email,...changes},undefined,id)).status,303);return id}
  const before=await send()
  instant=Date.parse('2030-06-20T00:00:00.000Z');const first=await send('contact',{message:'A comma, a "quote"\r\nand another line',address:'=2+2'})
  const secondForm=await send('about',{message:'Only the second form'})
  const expected=[first]
  for(let i=0;i<101;i++){instant=Date.parse('2030-06-20T12:00:00.000Z')+i*60000;expected.push(await send('contact',{name:'Synthetic visitor '+i}))}
  instant=Date.parse('2030-06-20T23:59:59.999Z');const last=await send();expected.push(last)
  instant=Date.parse('2030-06-21T00:00:00.000Z');const after=await send()
  const dashboard=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json();assert.equal(dashboard.messages.length,100);assert.ok(!dashboard.messages.some(row=>row.id===first),'The first exported record is beyond the inbox cutoff')
  const response=await get(range);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/csv/);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.match(response.headers.get('content-disposition'),/attachment/)
  const text=await response.text(),rows=submissionRows(text),header=rows.shift(),id=header.indexOf('submission_id'),field=key=>header.indexOf('field:'+key)
  assert.deepEqual(rows.map(row=>row[id]).sort(),expected.sort(),'CSV contains the complete independently specified form and date set')
  assert.ok(!rows.some(row=>[before,after,secondForm].includes(row[id])))
  assert.equal(rows.find(row=>row[id]===first)[field('message')],'A comma, a "quote"\r\nand another line','CSV preserves structured multiline text instead of flattened label text')
  assert.equal(rows.find(row=>row[id]===first)[field('address')],"'=2+2",'Spreadsheet formulas are inert')
  assert.equal(rows.find(row=>row[id]===last)[header.indexOf('submitted_at_utc')],'2030-06-20T23:59:59.999Z')
  const otherRows=submissionRows(await (await get('form='+other.id)).text());assert.equal(otherRows.length,2);assert.equal(otherRows[1][0],secondForm)
  // Later schema and name edits cannot relabel or overwrite the retained original receipt.
  const renamed=structuredClone(site);renamed.forms[0].name='Renamed quote';renamed.forms[0].fields.find(field=>field.key==='message').label='Changed label'
  const current=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json(),changed=await (await call('/api/pane/prepare',{site:renamed,base:current.draft.id},cookie)).json();await call('/api/pane/publish',{revision:changed.id},cookie)
  await send('contact',{message:'Replay replacement'},first);assert.equal(await (await get(range)).text(),text,'Replay cannot change original structured values or form identity')
  const found=await (await call('/api/pane/privacy/find',{email},cookie)).json();assert.equal(found.messages.length,106);assert.equal(JSON.parse(found.messages.find(row=>row.id===first).submission).fields.find(field=>field.key==='message').value,'A comma, a "quote"\r\nand another line')
  assert.equal((await get(range,'')).status,401);assert.equal((await app.request('/app/submissions/export?'+range)).status,303)
  for(const query of ['form='+other.id+'&from=2030-02-30','form='+other.id+'&from=2030-06-21&to=2030-06-20','from=2030-06-20'])assert.equal((await get(query)).status,400)
  assert.equal((await app.request('https://elsewhere.invalid/api/pane/submissions/export?'+range,{headers:{Cookie:cookie}})).status,403)
  const scoped=await (await call('/api/pane/tokens/create',{name:'Synthetic CSV scope',scopes:['status:read']},cookie)).json();assert.ok(scoped.token)
  assert.equal((await app.request('/api/pane/submissions/export?'+range,{headers:{Authorization:'Bearer '+scoped.token}})).status,403)
  // Message erasure deletes the structured columns and fences a captured retry.
  assert.equal((await call('/api/pane/messages/erase',{id:first},cookie)).status,200)
  await send('contact',{message:'Erased replay'},first)
  const erasedRows=submissionRows(await (await get(range)).text());assert.equal(erasedRows.length,103);assert.ok(!erasedRows.slice(1).some(row=>row[0]===first),'Erased submission cannot reappear in a download')
  const archive=await exportData(app.db),restored=await runtime()
  try{assert.equal((await restore(restored.db,archive)).phase,'complete');assert.equal(await restored.db.prepare('SELECT COUNT(*) AS n FROM pane_messages WHERE submission IS NOT NULL').first('n'),105);assert.equal(await restored.db.prepare('SELECT submission FROM pane_messages WHERE id=?').bind(first).first(),null)}finally{await restored.mf.dispose()}
  const plain=structuredClone(renamed);delete plain.pages.find(row=>row.slug==='contact').formId
  const nativeCurrent=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json(),nativeDraft=await (await call('/api/pane/prepare',{site:plain,base:nativeCurrent.draft.id},cookie)).json();await call('/api/pane/publish',{revision:nativeDraft.id},cookie)
  const builtin=await send('contact',{message:'Native built-in contact'})
  const builtinRows=submissionRows(await (await get('form=native%3Acontact')).text());assert.equal(builtinRows.length,2);assert.equal(builtinRows[1][0],builtin);assert.equal(builtinRows[1][builtinRows[0].indexOf('field:message')],'Native built-in contact')
 }finally{await app.mf.dispose()}
})
test('private uploads join native archive restore and person export and erasure without replaying old files',async()=>{
 const {app,call,cookie,submit}=await formFixture()
 try{
  const id=crypto.randomUUID(),file=new File(['%PDF-1.7\nsynthetic-pane-63'],'project.pdf',{type:'application/pdf'})
  assert.equal((await submit('contact',{},file,id)).status,303)
  const archive=await exportData(app.db),destination=await runtime()
  try{assert.equal((await restore(destination.db,archive)).phase,'complete');assert.equal((await destination.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first()).n,1);const chunk=await destination.db.prepare('SELECT data FROM pane_file_chunks').first();assert.match(Buffer.from(chunk.data,'base64').toString(),/synthetic-pane-63/)}finally{await destination.mf.dispose()}
  const found=await call('/api/pane/privacy/find',{email:'synthetic-pane-61@example.test'},cookie);assert.equal(found.status,200);const record=await found.json();assert.equal(record.files.length,1);assert.ok(record.fileChunks.length);assert.equal(JSON.parse(record.messages[0].submission).formId,quoteDefinition.id)
  let nativeMail
  const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{nativeMail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
  const token=new URL(nativeMail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),confirmed=await call('/auth/confirm',{token}),freshCookie=confirmed.headers.get('set-cookie').split(';')[0]
  const exported=await call('/api/pane/privacy/export',{email:'synthetic-pane-61@example.test'},freshCookie);assert.equal(exported.status,200);const portable=await exported.json();assert.equal(portable.files.length,1);assert.match(Buffer.from(portable.fileChunks[0].data,'base64').toString(),/synthetic-pane-63/)
  const erased=await call('/api/pane/privacy/erase',{email:'synthetic-pane-61@example.test',confirm:'erase-person-data'},freshCookie);assert.equal(erased.status,200,await erased.text())
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first()).n,0);assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM pane_file_chunks').first()).n,0)
  assert.equal(submissionRows(await (await app.request('/api/pane/submissions/export?form='+quoteDefinition.id,{headers:{Cookie:cookie}})).text()).length,1,'Person erasure excludes every structured answer from CSV')
  assert.equal((await app.request('/app/files/'+record.files[0].id,{headers:{Cookie:cookie}})).status,404)
  await submit('contact',{},file,id);assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first()).n,0)
  const later=await exportData(app.db),empty=await runtime()
  try{await assert.rejects(restore(empty.db,archive,later),/erased_row|erasure_epoch/)}finally{await empty.mf.dispose()}
 }finally{await app.mf.dispose()}
})
test('rejected PDFs leave no stored bytes and only opted-in validated text and metadata can be rescued by the owner',async()=>{
 for(const isolatedLive of [false,true]){
  const {app,call,cookie,submit}=await formFixture({isolatedLive})
  try{
   const read=async()=> (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
   const file=new File(['%PDF-1.7\nsynthetic-pane-65-private-rejected-bytes'],'project.pdf',{type:'application/pdf'})
   const emptyFiles=async()=>{
    assert.equal(await app.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first('n'),0)
    assert.equal(await app.db.prepare('SELECT COUNT(*) AS n FROM pane_file_chunks').first('n'),0)
    const records=await call('/api/pane/privacy/find',{email:'synthetic-pane-61@example.test'},cookie);assert.equal(records.status,200)
    assert.doesNotMatch(await records.text(),/synthetic-pane-65-private-rejected-bytes|JVBERi0x/)
    if(isolatedLive){
     const namespace=await app.mf.getDurableObjectNamespace('PANE_LIVE'),stored=await namespace.get(namespace.idFromName('published-site')).syntheticStored()
     assert.ok(!stored.some(([key])=>key.startsWith('file:')||key.startsWith('message:')),'Rejected uploads never enter durable intake')
     assert.doesNotMatch(JSON.stringify(stored),/synthetic-pane-65-private-rejected-bytes|JVBERi0x/)
    }
   }
   const off=await submit('contact',{website:'synthetic-pane-66'},file);assert.equal(off.status,403);assert.match((await off.json()).error,/Spam verification failed/)
   assert.equal((await read()).rejectedContent.length,0);assert.equal((await read()).messages.length,0);await emptyFiles()
   assert.equal((await call('/api/pane/spam/settings',{enabled:'on',confirm:'change-retention'},cookie)).status,200)
   const id=crypto.randomUUID(),rejected=await submit('contact',{website:'synthetic-pane-66'},file,id);assert.equal(rejected.status,403);assert.match((await rejected.json()).error,/Spam verification failed/)
   let state=await read();assert.equal(state.messages.length,0);assert.equal(state.rejectedContent.length,1)
   const row=state.rejectedContent[0];assert.equal(row.expires_at-Date.parse(row.created_at),30*86400000);assert.match(row.message,/US phone: 312 555 0123/);assert.match(row.message,/Project PDF: project.pdf \(\d+ bytes\)/)
   const review=await (await app.request('/app/inquiries',{headers:{Cookie:cookie}})).text();assert.match(review,/30 days/);assert.match(review,/project.pdf/)
   await emptyFiles()
   assert.equal(submissionRows(await (await app.request('/api/pane/submissions/export?form='+quoteDefinition.id,{headers:{Cookie:cookie}})).text()).length,1,'Rejected answers are absent from CSV before explicit rescue')
   assert.equal((await call('/api/pane/spam/rescue',{id},cookie)).status,400);assert.equal((await read()).messages.length,0,'Viewing or unconfirmed rescue creates no submission')
   assert.equal((await call('/api/pane/spam/rescue',{id,confirm:'rescue-rejected'},cookie)).status,200)
   state=await read();assert.equal(state.messages.length,1);assert.equal(state.messages[0].id,id);assert.equal(state.messages[0].acknowledgment_status,'not_requested');assert.deepEqual(state.messages[0].files,[]);assert.equal(state.rejectedContent.length,0)
   const rescuedCsv=submissionRows(await (await app.request('/api/pane/submissions/export?form='+quoteDefinition.id,{headers:{Cookie:cookie}})).text());assert.equal(rescuedCsv.length,2);assert.equal(rescuedCsv[1][0],id);assert.equal(rescuedCsv[1][rescuedCsv[0].indexOf('field:service')],'Repair');assert.equal(rescuedCsv[1][rescuedCsv[0].indexOf('field:file')],'project.pdf');assert.doesNotMatch(JSON.stringify(rescuedCsv),/synthetic-pane-65-private-rejected-bytes|JVBERi0x/)
   await emptyFiles()
  }finally{await app.mf.dispose()}
 }
})

test('durable typed intake retains private upload chunks through workspace outage and drains once after recovery',async()=>{
 const {app,cookie,submit}=await formFixture({isolatedLive:true,marketing:true,now:Date.parse('2030-06-20T12:00:00.000Z')})
 try{
  await app.db.prepare('ALTER TABLE pane_messages RENAME TO synthetic_unavailable_messages').run()
  const pdf=new Uint8Array(5*1024*1024);pdf.set(new TextEncoder().encode('%PDF-1.7\nsynthetic-pane-64'));pdf.fill(32,32)
  const id=crypto.randomUUID(),file=new File([pdf],'project.pdf',{type:'application/pdf'})
  assert.equal((await submit('contact',{email_marketing:'yes'},file,id)).status,303)
  const namespace=await app.mf.getDurableObjectNamespace('PANE_LIVE'),stub=namespace.get(namespace.idFromName('published-site'))
  const original=(await stub.syntheticStored()).find(([key])=>key==='message:'+id)[1].consent
  assert.deepEqual(original.choices.map(choice=>[choice.channel,choice.granted]),[['email',true],['sms',false]])
  assert.equal(original.receivedAt,'2030-06-20T12:00:00.000Z');assert.equal(original.inquiryId,id)
  await submit('contact',{sms_marketing:'yes'},file,id)
  assert.deepEqual((await stub.syntheticStored()).find(([key])=>key==='message:'+id)[1].consent,original,'An outage retry cannot replace affirmative or absent choices')
  assert.equal((await app.request('/site/about')).status,200)
  await app.db.prepare('ALTER TABLE synthetic_unavailable_messages RENAME TO pane_messages').run()
  const worker=await app.mf.getWorker();assert.equal((await worker.scheduled({scheduledTime:new Date('2030-06-20T12:00:00Z'),cron:'* * * * *'})).outcome,'ok')
  const dashboard=await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json(),receipt=dashboard.messages.find(message=>message.id===id);assert.equal(receipt.files.length,1);assert.equal(JSON.parse(receipt.submission).formId,quoteDefinition.id);assert.equal(JSON.parse(receipt.submission).fields.find(field=>field.key==='service').value,'Repair')
  assert.deepEqual(JSON.parse(receipt.marketing_consent),original,'Recovery retains the captured wording, choices and acceptance time')
  const response=await app.request('/app/files/'+receipt.files[0].id,{headers:{Cookie:cookie}});assert.deepEqual(new Uint8Array(await response.arrayBuffer()),pdf)
  await submit('contact',{},file,id);await worker.scheduled({scheduledTime:new Date('2030-06-20T12:01:00Z'),cron:'* * * * *'})
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM pane_files').first()).n,1)
 }finally{await app.mf.dispose()}
})

test('marketing choices bind published wording to immutable enquiry receipts and travel through export, archives and erasure without subscription delivery',async()=>{
 let instant=Date.parse('2030-06-20T12:00:00.000Z'),outbound=[]
 const {app,call,cookie,site,draft,submit}=await formFixture({marketing:true,now:()=>instant,observeOutbound:request=>outbound.push(new URL(request.url).hostname)})
 const email=['synthetic-pane-61','example.test'].join('@'),read=async id=>JSON.parse(await app.db.prepare('SELECT marketing_consent FROM pane_messages WHERE id=?').bind(id).first('marketing_consent'))
 try{
  const html=await (await app.request('/site/contact')).text(),schema=html.match(/name="consent_schema" value="([^"]+)"/)[1]
  for(const key of ['email_marketing','sms_marketing']){const control=html.match(new RegExp('<input[^>]+name="'+key+'"[^>]*>'))?.[0];assert.match(control,/type="checkbox" value="yes"/);assert.doesNotMatch(control,/\bchecked|\brequired/,'Marketing starts optional and unchecked')}
  assert.match(html,/Cedar Street Studio\. Message frequency: Up to four messages per month/)
  for(const mutate of [form=>form.fields.find(field=>field.type==='sms-consent').required=true,form=>delete form.fields.find(field=>field.type==='sms-consent').frequency]){
   const invalid=structuredClone(site);mutate(invalid.forms[0]);assert.equal((await call('/api/pane/prepare',{site:invalid,base:draft.id},cookie)).status,400)
  }
  assert.equal((await submit('contact',{email_marketing:'on'})).status,400,'Only an explicit supported checkbox value grants permission')
  const id=crypto.randomUUID();assert.equal((await submit('contact',{email_marketing:'yes',receivedAt:'1900-01-01T00:00:00Z'},undefined,id)).status,303)
  const original=await read(id)
  assert.deepEqual(original,{version:1,inquiryId:id,formId:quoteDefinition.id,page:'contact',pageId:draft.site.pages.find(page=>page.slug==='contact').id??'contact',revisionId:draft.id,receivedAt:'2030-06-20T12:00:00.000Z',choices:[
   {channel:'email',fieldKey:'email_marketing',granted:true,wording:'Send me studio news by email.\nYou can withdraw your choice.'},
   {channel:'sms',fieldKey:'sms_marketing',granted:false,wording:'Send me studio updates by text. — Cedar Street Studio. Message frequency: Up to four messages per month.\nMessage and data rates may apply.'},
  ]})
  const changed=structuredClone(site);changed.forms[0].fields.find(field=>field.type==='email-consent').label='A different published email offer.'
  const prepared=await (await call('/api/pane/prepare',{site:changed,base:draft.id},cookie)).json();assert.ok(prepared.id)
  const beforePublish=crypto.randomUUID();assert.equal((await submit('contact',{email_marketing:'yes'},undefined,beforePublish)).status,303);assert.equal((await read(beforePublish)).choices[0].wording,original.choices[0].wording,'Draft wording never changes the live prompt or receipt')
  assert.equal((await call('/api/pane/publish',{revision:prepared.id},cookie)).status,200)
  const staleId=crypto.randomUUID(),stale=await submit('contact',{consent_schema:schema,email_marketing:'yes'},undefined,staleId);assert.equal(stale.status,400);const staleHtml=await stale.text();assert.match(staleHtml,/The consent wording changed/);assert.doesNotMatch(staleHtml,/name="email_marketing"[^>]* checked/);assert.equal(await app.db.prepare('SELECT id FROM pane_messages WHERE id=?').bind(staleId).first(),null)
  instant+=60000;await submit('contact',{sms_marketing:'yes'},undefined,id);assert.deepEqual(await read(id),original,'Retries cannot rewrite choices, wording, time or page')
  const smsId=crypto.randomUUID();assert.equal((await submit('about',{sms_marketing:'yes'},undefined,smsId)).status,303);assert.deepEqual((await read(smsId)).choices.map(choice=>[choice.channel,choice.granted]),[['email',false],['sms',true]])
  const absentId=crypto.randomUUID();assert.equal((await submit('contact',{},undefined,absentId)).status,303);assert.deepEqual((await read(absentId)).choices.map(choice=>choice.granted),[false,false])
  const policies=await (await call('/api/pane/policies/generate',{base:prepared.id},cookie)).json();assert.ok(policies.id);const policy=policies.site.pages.find(page=>page.slug==='privacy-policy').body;assert.match(policy,/separate and optional/);assert.ok(policy.includes(marketingFields[1].label));assert.doesNotMatch(policy,/Mailchimp|Orbit|Mango/,'Unconnected providers are never invented')
  const inbox=await (await app.request('/app/inquiries',{headers:{Cookie:cookie}})).text();assert.match(inbox,/Marketing consent records/);assert.match(inbox,/SMS: Not consented/);assert.match(inbox,/2030-06-20T12:00:00.000Z/)
  const csv=submissionRows(await (await app.request('/api/pane/submissions/export?form='+quoteDefinition.id,{headers:{Cookie:cookie}})).text());assert.deepEqual(JSON.parse(csv.find(row=>row[0]===id)[csv[0].indexOf('marketing_consent')]),original)
  const archive=await exportData(app.db),destination=await runtime()
  try{assert.equal((await restore(destination.db,archive)).phase,'complete');assert.deepEqual(JSON.parse(await destination.db.prepare('SELECT marketing_consent FROM pane_messages WHERE id=?').bind(id).first('marketing_consent')),original)}finally{await destination.mf.dispose()}
  let nativeMail
  const native=createOperatorAuth({clock:()=>instant,db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{nativeMail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
  const token=new URL(nativeMail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),confirmed=await call('/auth/confirm',{token}),fresh=confirmed.headers.get('set-cookie').split(';')[0]
  assert.equal((await call('/api/pane/privacy/export',{email},'')).status,401)
  const exported=await call('/api/pane/privacy/export',{email},fresh);assert.equal(exported.status,200);const portable=await exported.json();assert.equal(portable.marketingConsents.length,4);assert.deepEqual(portable.marketingConsents.find(row=>row.inquiryId===id),original)
  assert.equal((await call('/api/pane/privacy/erase',{email,confirm:'erase-person-data'},fresh)).status,200)
  await submit('contact',{email_marketing:'yes',sms_marketing:'yes'},undefined,id)
  const after=await (await call('/api/pane/privacy/find',{email},fresh)).json();assert.deepEqual(after.marketingConsents,[]);assert.deepEqual(after.messages,[])
  const later=await exportData(app.db),empty=await runtime()
  try{await assert.rejects(restore(empty.db,archive,later),/erased_row|erasure_epoch/)}finally{await empty.mf.dispose()}
  assert.deepEqual([...new Set(outbound)],['challenges.cloudflare.com'],'Recording choices never initiates a subscription or marketing request')
 }finally{await app.mf.dispose()}
})

test('section drafts preserve validated layout and reading text through publication, conflict and rollback',async()=>{
 const app=await runtime();let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const dashboard=async()=> (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
 try {
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  const site=structuredClone(fixture),page=site.pages.find(page=>page.slug==='services')
  page.body='Synthetic section heading\n\nSynthetic section detail'
  page.sections=[{id:'synthetic-pane-section',kind:'columns',ratio:'2:1',background:'#AABBCC',phone:{paddingTop:12,paddingBottom:16,height:'medium',hidden:false},paddingTop:96,blocks:[{id:'synthetic-pane-block-1',kind:'text',text:'Synthetic section heading',phone:{column:2,span:8,row:2,hidden:false},format:'h2',column:2,span:6,align:'right'},{id:'synthetic-pane-block-2',kind:'text',text:'Synthetic section detail',column:8,span:5,row:2}]}]
  const prepared=await call('/api/pane/prepare',{site,base:''});assert.equal(prepared.status,200,await prepared.clone().text())
  const first=await prepared.json(),stored=first.site.pages.find(page=>page.slug==='services')
  assert.deepEqual(stored.sections[0].phone,{paddingTop:12,paddingBottom:16,height:'medium',hidden:false});assert.deepEqual(stored.sections[0].blocks[0].phone,{column:2,span:8,row:2,hidden:false})
  assert.equal(stored.sections[0].ratio,'2:1');assert.equal(stored.sections[0].background,'#aabbcc')
  assert.deepEqual(stored.sections[0].blocks.map(({column,span,row,align})=>({column,span,row,align})),[{column:2,span:6,row:1,align:'right'},{column:8,span:5,row:2,align:'left'}])
  assert.equal((await app.request('/api/pane/pages',{headers:{Cookie:cookie}})).status,200)
  assert.equal((await call('/api/pane/publish',{revision:first.id})).status,200)
  const rendered=await app.request('/site/services'),renderedHtml=await rendered.text()
  assert.match(renderedHtml,/<h2 data-block="synthetic-pane-block-1"[^>]*>Synthetic section heading<\/h2>/)
  assert.match(renderedHtml,/grid-column:2\/span 6/)
  assert.match(rendered.headers.get('content-security-policy'),/style-src 'self'.*'sha256-/)
  assert.match(await (await app.request('/site/search?q=Synthetic%20section%20detail')).text(),/href="\/site\/services"/)
  const changed=structuredClone(first.site);changed.pages.find(page=>page.slug==='services').sections[0].paddingTop=120
  const secondResponse=await call('/api/pane/prepare',{site:changed,base:first.id});assert.equal(secondResponse.status,200)
  const second=await secondResponse.json()
  const conflict=await call('/api/pane/prepare',{site:first.site,base:first.id});assert.equal(conflict.status,409)
  assert.equal((await conflict.json()).latest.site.pages.find(page=>page.slug==='services').sections[0].paddingTop,120)
  assert.equal((await call('/api/pane/publish',{revision:second.id})).status,200)
  assert.equal((await call('/api/pane/rollback',{revision:first.id})).status,200)
  assert.deepEqual((await dashboard()).live.site.pages.find(page=>page.slug==='services').sections,stored.sections)
  const before=(await dashboard()).revisions.length
  for(const mutate of [
   p=>p.sections[0].blocks[0].span=12,
   p=>p.sections[0].phone.hidden='yes',
   p=>p.sections[0].blocks[0].phone.span=12,
   p=>p.sections[0].phone.paddingTop=-1,
   p=>p.sections[0].phone.style='display:none',
   p=>p.sections[0].blocks[1].id=p.sections[0].blocks[0].id,
   p=>p.sections[0].background='url(https://invalid.example)',
   p=>p.sections[0].blocks[0].kind='html',
   p=>p.sections[0].blocks[0].text='Unindexed hidden text',
   p=>p.sections[0].blocks[0].column=2.5,
   p=>p.sections[0].blocks[0].style='position:fixed',
   p=>p.importedHtml='<p>Synthetic section heading</p><p>Synthetic section detail</p>',
  ]) {
   const invalid=structuredClone(first.site);mutate(invalid.pages.find(page=>page.slug==='services'))
   assert.equal((await call('/api/pane/prepare',{site:invalid,base:second.id})).status,400)
  }
  assert.equal((await dashboard()).revisions.length,before,'Invalid section drafts never create revisions')
 }finally{await app.mf.dispose()}
})

test('reusable section references propagate across five immutable pages and detached copies remain independent',async()=>{
 const app=await runtime();let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const dashboard=async()=> (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic component owner'})).headers.get('set-cookie').split(';')[0]
  const initial=await (await call('/api/pane/prepare',{site:fixture,base:''})).json()
  const created=await call('/api/pane/component-create',{base:initial.id,slug:'home',section:'body',componentName:'Announcement'});assert.equal(created.status,200,await created.clone().text())
  const first=await created.json(),component=first.site.components[0]
  let site=structuredClone(first.site)
  for(const page of site.pages.slice(1))page.sections=[{...component.section,id:'synthetic-pane-'+page.slug,component:component.id}]
  const placed=await (await call('/api/pane/prepare',{site,base:first.id})).json()
  site=structuredClone(placed.site);site.components[0].section.blocks[0].text='Synthetic announcement changed once'
  const changed=await call('/api/pane/prepare',{site,base:placed.id});assert.equal(changed.status,200,await changed.clone().text());const second=await changed.json()
  for(const page of second.site.pages){
   assert.equal(page.body,'Synthetic announcement changed once')
   assert.match(await (await app.request('/preview/'+second.id+'/'+page.slug,{headers:{Cookie:cookie}})).text(),/Synthetic announcement changed once/)
  }
  assert.deepEqual((await dashboard()).revisions.find(row=>row.id===placed.id).site,placed.site)
  site=structuredClone(second.site);delete site.pages[4].sections[0].component
  const detached=await (await call('/api/pane/prepare',{site,base:second.id})).json()
  site=structuredClone(detached.site);site.components[0].section.blocks[0].text='Synthetic next announcement'
  const third=await (await call('/api/pane/prepare',{site,base:detached.id})).json()
  assert.equal(third.site.pages[4].body,'Synthetic announcement changed once')
  for(const page of third.site.pages.slice(0,4))assert.equal(page.body,'Synthetic next announcement')
  assert.equal((await call('/api/pane/prepare',{site:second.site,base:second.id})).status,409)
  assert.equal((await call('/api/pane/publish',{revision:third.id})).status,200)
  assert.match(await (await app.request('/site/contact')).text(),/Synthetic announcement changed once/)
  const invalid=structuredClone(third.site);invalid.components=[]
  assert.equal((await call('/api/pane/prepare',{site:invalid,base:third.id})).status,400)
  assert.equal((await call('/api/pane/rollback',{revision:placed.id})).status,400,'An unpublished component snapshot cannot bypass approval')
 }finally{await app.mf.dispose()}
})

test('custom code requires owner authoring and approved immutable live revisions while previews and privacy refusals stay inert',async()=>{
 for(const isolatedLive of [false,true]){
 const app=await runtime({isolatedLive});let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic code owner'})).headers.get('set-cookie').split(';')[0]
  const site=structuredClone(fixture);site.customCode={tags:JSON.stringify([{provider:'plausible',category:'analytics',account:'synthetic-pane-1.test'},{provider:'meta',category:'advertising',account:'synthetic-pane-2'}]),css:'.proof { color: rgb(120, 20, 60) }',html:'<p class="proof">Synthetic embed</p>',header:'<meta name="synthetic-verification" content="synthetic-pane-1">',footer:'<script>window.syntheticFooter=true</script>'};site.pages[4].customCode={header:'<script>window.syntheticThankYou=true</script>'}
  const response=await call('/api/pane/prepare',{site,base:''});assert.equal(response.status,200,await response.clone().text());const prepared=await response.json()
  const preview=await app.request('/preview/'+prepared.id+'/contact',{headers:{Cookie:cookie}})
  assert.doesNotMatch(await preview.text(),/data-custom-code|data-marketplace|pane-custom-code.js|pane-tags.js|syntheticThankYou/)
  assert.doesNotMatch(preview.headers.get('content-security-policy'),/unsafe-inline/)
  assert.equal((await call('/api/pane/publish',{revision:prepared.id})).status,200)
  const live=await app.request('/site/contact'),html=await live.text()
  assert.match(html,/data-marketplace/);assert.match(live.headers.get('content-security-policy'),/connect.facebook.net/);assert.match(html,/data-custom-code/);assert.match(html,/syntheticThankYou/)
  assert.match(live.headers.get('content-security-policy'),/script-src 'self'.*'sha256-/)
  const home=await app.request('/site');assert.doesNotMatch(await home.text(),/syntheticThankYou/)
  for(const headers of [{'Sec-GPC':'1'},{DNT:'1'}]){
   const quiet=await app.request('/site/contact',{headers});assert.doesNotMatch(await quiet.text(),/data-custom-code|data-marketplace|pane-custom-code.js|pane-tags.js|syntheticThankYou/)
   assert.doesNotMatch(quiet.headers.get('content-security-policy'),/unsafe-inline|frame-src 'self'/)
  }
  let mail;const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{email:'synthetic-pane-code-admin@example.test',displayName:'Synthetic admin',role:'admin'})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  const adminCookie=(await call('/auth/confirm',{token})).headers.get('set-cookie').split(';')[0]
  const changed=structuredClone(prepared.site);changed.customCode.html='<p>Unapproved replacement</p>'
  const denied=await app.request('/api/pane/prepare',{method:'POST',headers:{Cookie:adminCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({site:changed,base:prepared.id})})
  assert.equal(denied.status,403)
  const changedTag=structuredClone(prepared.site);changedTag.customCode.tags=JSON.stringify([{provider:'meta',category:'advertising',account:'synthetic-pane-3'}]);assert.equal((await app.request('/api/pane/prepare',{method:'POST',headers:{Cookie:adminCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({site:changedTag,base:prepared.id})})).status,403,'Tag changes inherit owner-only authoring')
  for(const tags of [[{provider:'meta',category:'analytics',account:'synthetic-pane-1'}],[{provider:'unknown',category:'advertising',account:'synthetic-pane-1'}],[{provider:'plausible',category:'analytics',account:'https://unexpected.test'}]]){const invalid=structuredClone(prepared.site);invalid.customCode.tags=JSON.stringify(tags);assert.equal((await call('/api/pane/prepare',{site:invalid,base:prepared.id})).status,400)}
  const imported=await app.request('/api/pane/import/dry-run',{method:'POST',headers:{Cookie:adminCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({source:JSON.stringify({...changed,schemaVersion:1})})});assert.equal(imported.status,403,'Imports cannot bypass owner-only custom code authoring')
  for(const css of ['@import "https://external.invalid/x.css";', '.proof { background: url(/api/pane) }', '.proof { background: image-set("https://external.invalid/x.png" 1x) }', '.proof { color: \\72 ed }']){const unsafe=structuredClone(changed);unsafe.customCode.css=css;assert.equal((await call('/api/pane/prepare',{site:unsafe,base:prepared.id})).status,400,'Resource-loading CSS stays denied')}
  const next=await call('/api/pane/prepare',{site:changed,base:prepared.id});assert.equal(next.status,200)
  const replacement=await next.json()
  assert.notEqual(replacement.id,prepared.id,'A code edit creates a new immutable version')
  assert.deepEqual((await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).revisions.find(row=>row.id===prepared.id).site,prepared.site,'Published source bytes never change')
  assert.doesNotMatch(await (await app.request('/site/contact')).text(),/Unapproved replacement/)
  assert.equal((await call('/api/pane/rollback',{revision:replacement.id})).status,400,'Every changed code version needs a new approval')
  assert.equal((await call('/api/pane/publish',{revision:replacement.id})).status,200)
  assert.match(await (await app.request('/site/contact')).text(),/Unapproved replacement/)
  const revoke={revision:replacement.id,confirm:'revoke-publication'}
  assert.equal((await app.request('/api/pane/publication-revoke',{method:'POST',headers:{Cookie:adminCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(revoke)})).status,403)
  assert.equal((await call('/api/pane/publication-revoke',{revision:replacement.id})).status,400)
  assert.match(await (await app.request('/site/contact')).text(),/Unapproved replacement/)
  assert.equal((await call('/api/pane/publication-revoke',revoke)).status,200)
  for(const path of ['/site','/site/contact','/site/search'])assert.doesNotMatch(await (await app.request(path)).text(),/data-custom-code|data-marketplace|Unapproved replacement|Synthetic embed/,'Revoked approval takes every live door down on the next request')
  assert.equal((await call('/api/pane/publish',{revision:replacement.id})).status,400,'A revoked version cannot be republished')
  assert.equal((await call('/api/pane/rollback',{revision:replacement.id})).status,400,'Rollback cannot revive revoked code')
  const events=await (await app.request('/api/pane/activity',{headers:{Cookie:cookie}})).json()
  assert.ok(events.some(event=>event.action==='publication.revoke'&&event.subject==='revision:'+replacement.id),'Revocation is retained in the owner activity log')
  const renewed=await (await call('/api/pane/prepare',{site:replacement.site,base:replacement.id})).json()
  assert.equal((await call('/api/pane/publish',{revision:renewed.id})).status,200,'A new draft requires explicit approval after revocation')

 }finally{await app.mf.dispose()}
 }
})


test('rich section text keeps semantic formatting and nested lists through immutable publication and rollback',async()=>{
 const app=await runtime();let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const leaf=text=>({tag:'text',text}),element=(tag,...children)=>({tag,children})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  const site=structuredClone(fixture),page=site.pages.find(page=>page.slug==='services')
  const content=[element('h2',leaf('Workshop heading')),element('p',element('strong',leaf('Bold')),leaf(' '),element('em',leaf('italic')),leaf(' '),element('u',leaf('underline')),leaf(' '),element('s',leaf('strike'))),element('ul',element('li',leaf('Outer bullet'),element('ul',element('li',leaf('Nested bullet'))))),element('ol',element('li',leaf('Outer number'),element('ol',element('li',leaf('Nested number')))))]
  content[0].align='center';content[1].align='right';content[2].children[0].align='left';content[3].children[0].align='justify'
  page.body='Workshop heading\nBold italic underline strike\n\nOuter bullet\nNested bullet\n\n\nOuter number\nNested number'
  page.sections=[{id:'synthetic-pane-rich-section',blocks:[{id:'synthetic-pane-rich-block',kind:'text',format:'div',text:page.body,content,align:'justify'}]}]
  const response=await call('/api/pane/prepare',{site,base:''});assert.equal(response.status,200,await response.clone().text())
  const first=await response.json();assert.deepEqual(first.site.pages.find(page=>page.slug==='services').sections[0].blocks[0].content,content)
  assert.equal((await call('/api/pane/publish',{revision:first.id})).status,200)
  const html=await (await app.request('/site/services')).text()
  for(const fragment of ['<h2 data-text-align="center">Workshop heading</h2>','<p data-text-align="right">','<li data-text-align="left">','<li data-text-align="justify">','<strong>Bold</strong>','<em>italic</em>','<u>underline</u>','<s>strike</s>','<ul><li data-text-align="left">Outer bullet<ul><li>Nested bullet</li></ul></li></ul>','<ol><li data-text-align="justify">Outer number<ol><li>Nested number</li></ol></li></ol>','text-align:justify'])assert.ok(html.includes(fragment),fragment)
  assert.match(await (await app.request('/site/search?q=Nested%20bullet')).text(),/href="\/site\/services"/)
  const invalidCases=[
   block=>block.content[0].tag='script',
   block=>block.content[0].align='arbitrary',
   block=>block.content[1].children[0].align='left',
   block=>block.content[0].onclick='alert(1)',
   block=>block.content[1].children[0].children[0].text='Unindexed hidden content',
   block=>block.content[2].children[0].children[1].children[0].children.push(element('ul',element('li',leaf('Too deep')))),
   block=>block.content[0].children=[element('ul',element('li',leaf('Invalid heading child')))],
  ]
  for(const mutate of invalidCases){const invalid=structuredClone(first.site);mutate(invalid.pages.find(page=>page.slug==='services').sections[0].blocks[0]);assert.equal((await call('/api/pane/prepare',{site:invalid,base:first.id})).status,400)}
  const changed=structuredClone(first.site),changedPage=changed.pages.find(page=>page.slug==='services');changedPage.sections[0].blocks[0].content=[leaf('Later text')];changedPage.sections[0].blocks[0].text=changedPage.body='Later text'
  const next=await call('/api/pane/prepare',{site:changed,base:first.id});assert.equal(next.status,200);const second=await next.json()
  assert.equal((await call('/api/pane/publish',{revision:second.id})).status,200)
  assert.equal((await call('/api/pane/rollback',{revision:first.id})).status,200)
  assert.ok((await (await app.request('/site/services')).text()).includes('<strong>Bold</strong>'))
 }finally{await app.mf.dispose()}
})

test('image drafts preserve explicit descriptions and publication refuses missing alt while warning about headings and contrast',async()=>{
 for(const isolatedLive of [false,true]){
 const app=await runtime({isolatedLive});let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})).headers.get('set-cookie').split(';')[0]
  await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  const png=await readFile('public/brand/icon-192.png'),image={src:'data:image/png;base64,'+png.toString('base64'),width:png.readUInt32BE(16),height:png.readUInt32BE(20),decorative:false}
  const text={id:'synthetic-pane-text',kind:'text',text:'Our bakery',format:'h3',column:1,span:12,row:1},picture={id:'synthetic-pane-image',kind:'image',text:'',image,column:1,span:12,row:2}
  const site={name:'Synthetic bakery',description:'Fresh bread every morning.',pages:[{slug:'home',title:'Welcome',body:'Our bakery',sections:[{id:'synthetic-pane-section',kind:'text',background:'#222222',blocks:[text,picture]}]}]}
  let response=await call('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());let draft=await response.json()
  assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,400)
  assert.match(await (await app.request('/app/sites',{headers:{Cookie:cookie}})).text(),/An image needs alternative text/)
  assert.match(await (await app.request('/app/sites',{headers:{Cookie:cookie}})).text(),/Heading 3 follows Heading 1/)
  assert.match(await (await app.request('/app/sites',{headers:{Cookie:cookie}})).text(),/contrast is below/)
  assert.equal((await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).live,null)
  picture.image={...image,alt:'',decorative:true};text.format='h2';site.pages[0].sections[0].background='#ffffff'
  response=await call('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());draft=await response.json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
  assert.match(await (await app.request('/site')).text(),/alt="" role="presentation"/)
  const bad=structuredClone(draft.site);bad.pages[0].sections[0].blocks[1].image.decorative=false
  const pending=await (await call('/api/pane/prepare',{site:bad,base:draft.id})).json()
  const review=await (await call('/api/pane/page-request-review',{base:pending.id,page:'home'})).json()
  assert.equal((await call('/api/pane/page-publish',{base:pending.id,page:'home',request:review.id})).status,400,'Selected approvals require image descriptions too')
  picture.image={...image,alt:'Bakery workshop mark',crop:{ratio:'4:3',width:4,height:3,x:65,y:30}};picture.text='Bakery workshop mark';site.pages[0].body='Our bakery\n\nBakery workshop mark'
  response=await call('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());draft=await response.json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
  assert.match(await (await app.request('/site')).text(),/alt="Bakery workshop mark"/)
  assert.deepEqual(draft.site.pages[0].sections[0].blocks[1].image.crop,picture.image.crop)
  assert.match(await (await app.request('/site')).text(),/aspect-ratio:4\/3;object-fit:cover;object-position:65% 30%/)
  const originalBytes=await readFile('public/site/cake-3.webp')
  picture.image.original='data:image/webp;base64,'+originalBytes.toString('base64');picture.image.rotation=90
  response=await call('/api/pane/prepare',{site,base:draft.id});assert.equal(response.status,200,await response.clone().text());const rotated=await response.json()
  assert.equal(rotated.site.pages[0].sections[0].blocks[1].image.original,picture.image.original,'Exact upload bytes survive the immutable draft')
  const stale=await call('/api/pane/prepare',{site,base:draft.id});assert.equal(stale.status,409,'Image edits preserve the revision conflict boundary')
  assert.equal((await call('/api/pane/publish',{revision:rotated.id})).status,200)
  const publicHtml=await (await app.request('/site')).text()
  const served=await app.request('/site?pane-image=synthetic-pane-image&width=0');assert.equal(served.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await served.arrayBuffer()),png);assert.equal(served.headers.get('cache-control'),'private, no-store')
  assert.equal((await app.request('/site?pane-image=synthetic-pane-image&width=480')).status,404,'Only retained rendition widths can be served')
  assert.equal((await app.request('/site?pane-image=missing&width=0')).status,404)
  const head=await app.request('/site?pane-image=synthetic-pane-image&width=0',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0)
  assert.ok(!publicHtml.includes(picture.image.original),'The retained upload is not embedded in the public document')
  const signedOut=await app.request('/api/pane');assert.equal(signedOut.status,401,'Original upload custody remains behind native authentication')
  assert.equal((await (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()).draft.site.pages[0].sections[0].blocks[1].image.original,picture.image.original,'Reopened owner draft keeps the exact upload')
  for(const mutate of [p=>p.image.rotation=45,p=>p.image.rotation='90',p=>p.image.original='data:image/webp;base64,c3ludGhldGljLXBhbmUtMQ==']){
   const invalid=structuredClone(site);mutate(invalid.pages[0].sections[0].blocks[1]);assert.equal((await call('/api/pane/prepare',{site:invalid})).status,400,'Invalid original bytes or rotation cannot create a draft')
  }
  const protectedSite=structuredClone(rotated.site);protectedSite.pages[0].access={mode:'members'}
  const protectedDraft=await (await call('/api/pane/prepare',{site:protectedSite,base:rotated.id})).json();assert.equal((await call('/api/pane/publish',{revision:protectedDraft.id})).status,200)
  const privateImage=await app.request('/site?pane-image=synthetic-pane-image&width=0');assert.notEqual(privateImage.headers.get('content-type'),'image/png','Protected page images use the every-request membership gate')
  assert.equal((await call('/api/pane/publication-revoke',{revision:protectedDraft.id,confirm:'revoke-publication'})).status,200)
  assert.equal((await app.request('/site?pane-image=synthetic-pane-image&width=0')).status,404,'Revocation immediately removes image delivery too')
  for(const mutate of [p=>p.image.src='data:image/svg+xml;base64,PHN2Zz4=',p=>p.image.width++,p=>p.image.renditions=[{src:'data:image/webp;base64,c3ludGhldGljLXBhbmUtMQ==',width:480,height:240}],p=>p.image.decorative=true,p=>p.image.crop.x=101,p=>p.image.crop.width=0,p=>p.image.crop.ratio='arbitrary',p=>p.image.crop.script='unsupported']){const invalid=structuredClone(site);mutate(invalid.pages[0].sections[0].blocks[1]);assert.equal((await call('/api/pane/prepare',{site:invalid})).status,400)}
  const imported={...site,pages:[{slug:'home',title:'Imported bakery',body:'Our bakery',importedHtml:'<p>Our bakery</p><img src="https://example.test/bakery.png">'}]}
  response=await call('/api/pane/prepare',{site:imported});assert.equal(response.status,200,await response.clone().text());draft=await response.json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,400,'Import normalization must not invent a decorative choice')
  imported.pages[0].importedHtml='<p>Our bakery</p><img src="https://example.test/bakery.png" alt="">'
  response=await call('/api/pane/prepare',{site:imported});assert.equal(response.status,200,await response.clone().text());draft=await response.json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
  assert.match(await (await app.request('/site')).text(),/<span aria-hidden="true"><\/span>/)
 }finally{await app.mf.dispose()}
 }
})

test('gallery publications resolve immutable library images and enforce the page gate and revocation for every rendition',async()=>{
 for(const isolatedLive of [false,true]){
  const app=await runtime({isolatedLive});let cookie
  const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
  try{
   cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic bakery owner'})).headers.get('set-cookie').split(';')[0]
   await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
   const png=await readFile('public/brand/icon-192.png'),image={src:'data:image/png;base64,'+png.toString('base64'),width:png.readUInt32BE(16),height:png.readUInt32BE(20),decorative:false,alt:'Bakery celebration mark',original:'data:image/png;base64,'+png.toString('base64')}
   const text={id:'synthetic-pane-text',kind:'text',text:'Fresh from our bakery',column:1,span:12,row:1},gallery={id:'synthetic-pane-gallery',kind:'gallery',text:'',column:1,span:12,row:2,gallery:{layout:'grid',columns:3,phoneColumns:1,gap:16,phoneGap:12,lightbox:true,items:[{asset:'synthetic-pane-1',caption:'A celebration',href:'/site'}]}}
   const site={name:'Riverbend Bakery',description:'Bread and celebration cakes.',media:[{id:'synthetic-pane-1',name:'Celebration',image}],pages:[{slug:'home',title:'Our work',body:text.text,sections:[{id:'synthetic-pane-section',kind:'text',blocks:[text,gallery]}]}]}
   const missing=structuredClone(site);missing.media[0].image.alt='';let response=await call('/api/pane/prepare',{site:missing});assert.equal(response.status,200,await response.clone().text());assert.equal((await call('/api/pane/publish',{revision:(await response.json()).id})).status,400,'A gallery cannot bypass missing image descriptions')
   response=await call('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());let draft=await response.json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
   const html=await (await app.request('/site')).text();assert.match(html,/data-gallery="grid"/);assert.match(html,/A celebration/);assert.ok(!html.includes(image.original),'Original library uploads never enter public markup')
   const path='/site?pane-image=synthetic-pane-gallery%3Asynthetic-pane-1&width=0'
   const served=await app.request(path);assert.equal(served.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await served.arrayBuffer()),png);assert.equal(served.headers.get('cache-control'),'private, no-store')
   assert.equal((await app.request(path,{method:'HEAD'})).status,200);assert.equal((await app.request(path+'&original=1')).headers.get('content-type'),'image/png');assert.equal((await app.request('/site?pane-image=unplaced%3Asynthetic-pane-1&width=0')).status,404)
   const altered=structuredClone(site);altered.media[0].image.alt='Changed in draft';const next=await (await call('/api/pane/prepare',{site:altered,base:draft.id})).json();assert.match(await (await app.request('/site')).text(),/alt="Bakery celebration mark"/,'An unpublished library change cannot mutate the live page')
   assert.equal((await call('/api/pane/prepare',{site,base:draft.id})).status,409,'Library editing keeps conflict protection')
   const missingAsset=structuredClone(site);missingAsset.media=[];assert.equal((await call('/api/pane/prepare',{site:missingAsset})).status,400,'Missing library references are refused')
   const protectedSite=structuredClone(next.site);protectedSite.pages[0].access={mode:'members'};draft=await (await call('/api/pane/prepare',{site:protectedSite,base:next.id})).json();assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
   assert.notEqual((await app.request(path)).headers.get('content-type'),'image/png','Gallery bytes follow the current member gate')
   await call('/api/pane/publication-revoke',{revision:draft.id,confirm:'revoke-publication'});assert.equal((await app.request(path)).status,404)
  }finally{await app.mf.dispose()}
 }
})

test('native media library uploads, organizes and reuses private assets while refusing used deletion and stale edits',async()=>{
 for(const isolatedLive of [false,true]){
  const app=await runtime({isolatedLive});let cookie
  const call=(path,body,credential=cookie)=>app.request(path,{method:'POST',headers:{Cookie:credential??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const read=async()=> (await app.request('/api/pane',{headers:{Cookie:cookie}})).json()
  const save=async body=>{const response=await call('/api/pane/library',body);assert.equal(response.status,200,await response.clone().text());return response.json()}
  try{
   cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic bakery owner'})).headers.get('set-cookie').split(';')[0]
   await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
   const initial=await (await call('/api/pane/prepare',{site:fixture})).json()
   const png=await readFile('public/brand/icon-192.png'),original='data:image/png;base64,'+png.toString('base64')
   const image={src:original,original,width:png.readUInt32BE(16),height:png.readUInt32BE(20),alt:'',decorative:false}
   const images=Array.from({length:50},(_,index)=>({id:'synthetic-pane-'+index,name:'Bakery photo '+index,image}))
   const pdf=Buffer.from('%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF\n')
   const files=Array.from({length:3},(_,index)=>({id:crypto.randomUUID(),name:'Bakery menu '+index+'.pdf',type:'application/pdf',size:pdf.length,data:pdf.toString('base64')}))
   const upload={base:initial.id,action:'upload',images,files}
   let draft=await save(upload)
   assert.equal(draft.site.media.length,50);assert.equal(draft.site.libraryFiles.length,3)
   assert.equal((await call('/api/pane/library',upload)).status,409,'Replaying a capture cannot duplicate assets or overwrite a newer revision')
   const snapshot=structuredClone(draft),asset=images[0].id
   assert.equal((await app.request('/site/files/'+files[0].id)).status,404,'A private upload has no public delivery')
   for(const page of ['home','about','services'])draft=await save({base:draft.id,action:'place',kind:'image',id:asset,page})
   draft=await save({base:draft.id,action:'place',kind:'pdf',id:files[0].id,page:'home'})
   const refusal=await call('/api/pane/library',{base:draft.id,action:'delete',kind:'image',id:asset})
   assert.equal(refusal.status,409)
   assert.deepEqual((await refusal.json()).uses.map(use=>({slug:use.slug,title:use.title,kind:use.kind})),fixture.pages.slice(0,3).map(page=>({slug:page.slug,title:page.title,kind:'page'})))
   assert.equal((await call('/api/pane/library',{base:draft.id,action:'delete',kind:'pdf',id:files[0].id})).status,409)
   const undoUsed=await call('/api/pane/library',{base:draft.id,action:'restore',site:initial.site})
   assert.equal(undoUsed.status,409,'Restoring an older capture cannot bypass usage-aware deletion')
   assert.deepEqual((await undoUsed.json()).uses.map(use=>use.slug),['home','about','services'])
   assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,400,'Library placements cannot bypass missing-alt refusal')
   const edit={action:'update',kind:'image',id:asset,name:'Celebration cakes',folder:'Celebrations',caption:'A cake for a birthday',alt:'A birthday cake with flowers',decorative:false}
   const old=draft.id;draft=await save({base:draft.id,...edit})
   const stale=await call('/api/pane/library',{base:old,...edit,alt:'Lost edit'})
   assert.equal(stale.status,409);assert.equal((await stale.json()).latest.id,draft.id)
   const search=async query=>(await (await app.request('/api/pane/library?'+new URLSearchParams(query),{headers:{Cookie:cookie}})).json()).assets
   assert.deepEqual((await search({q:'BIRTHDAY',type:'image',folder:'Celebrations'})).map(asset=>asset.id),[asset])
   assert.deepEqual((await search({type:'pdf'})).map(asset=>asset.id),files.map(file=>file.id))
   assert.equal((await search({folder:'__unfiled'})).length,52)
   assert.deepEqual(await search({q:'birthday',type:'pdf'}),[])
   assert.deepEqual((await (await app.request('/api/pane/library',{headers:{Cookie:cookie}})).json()).assets.find(item=>item.id===asset).uses.map(use=>use.slug),['home','about','services'])
   assert.match(await (await app.request('/app/library',{headers:{Cookie:cookie}})).text(),/Celebration cakes/)
   assert.equal((await read()).draft.site.media[0].image.original,original,'Reopening preserves exact retained upload bytes')
   assert.deepEqual((await read()).revisions.find(row=>row.id===snapshot.id),snapshot,'Metadata and placements never mutate the original uploaded revision')
   assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
   const live=structuredClone(draft),placed=draft.site.pages[0].sections.flatMap(section=>section.blocks).find(block=>block.gallery)
   const path='/site?pane-image='+encodeURIComponent(placed.id+':'+asset)+'&width=0'
   const delivered=await app.request(path);assert.equal(delivered.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await delivered.arrayBuffer()),png);assert.equal(delivered.headers.get('cache-control'),'private, no-store')
   const download=await app.request('/site/files/'+files[0].id);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.deepEqual(Buffer.from(await download.arrayBuffer()),pdf)
   assert.ok(!(await (await app.request('/site')).text()).includes(original),'Live HTML never embeds original bytes')
   draft=await save({base:draft.id,...edit,alt:'An unpublished alternative'})
   assert.match(await (await app.request('/site')).text(),/alt="A birthday cake with flowers"/)
   assert.deepEqual((await read()).revisions.find(row=>row.id===live.id),live,'Draft edits preserve the approved immutable source')
   const withoutUses=structuredClone(draft.site)
   for(const page of withoutUses.pages){page.sections=undefined;page.body=fixture.pages.find(item=>item.slug===page.slug).body}
   draft=await (await call('/api/pane/prepare',{site:withoutUses,base:draft.id})).json()
   const liveRefusal=await call('/api/pane/library',{base:draft.id,action:'delete',kind:'image',id:asset})
   assert.equal(liveRefusal.status,409);assert.deepEqual((await liveRefusal.json()).uses.map(use=>use.slug),['home','about','services'],'Approved placements still prevent deletion after draft placements are removed')
   assert.equal((await call('/api/pane/publish',{revision:draft.id})).status,200)
   draft=await save({base:draft.id,action:'delete',kind:'image',id:asset})
   assert.equal(draft.site.media.length,49);assert.equal(draft.site.media.some(item=>item.id===asset),false)
   draft=await save({base:draft.id,action:'delete',kind:'pdf',id:files[0].id})
   assert.equal(draft.site.libraryFiles.length,2)
   assert.equal((await app.request(path)).status,404);assert.equal((await app.request('/site/files/'+files[0].id)).status,404)
   const count=(await read()).revisions.length
   for(const body of [{base:draft.id,action:'upload',images:[images[1]]},{base:draft.id,action:'upload',files:[{...files[0],data:'c3ludGhldGljLXBhbmUtMQ==',size:16}]},{base:draft.id,...edit,id:images[1].id,folder:'x'.repeat(121)}])assert.equal((await call('/api/pane/library',body)).status,400)
   assert.equal((await read()).revisions.length,count,'Rejected uploads and metadata never create revisions')
   assert.equal((await app.request('/api/pane/library')).status,401)
   const scoped=await (await call('/api/pane/tokens/create',{name:'Synthetic media integration',scopes:['status:read','draft:write']})).json()
   for(const method of ['GET','POST'])assert.equal((await app.request('/api/pane/library',{method,headers:{Origin:origin,Authorization:'Bearer '+scoped.token,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(upload)}:{})})).status,403,'Owner-scoped integration tokens have no library authority')
   await call('/api/pane/tokens/revoke',{id:scoped.id})
   assert.equal((await app.request('/api/pane/library',{headers:{Authorization:'Bearer '+scoped.token}})).status,401)
   const audit=await (await app.request('/api/pane/activity',{headers:{Cookie:cookie}})).json()
   assert.ok(audit.some(entry=>entry.subject==='api:library'&&entry.action==='api.POST.200'&&entry.actor==='Synthetic bakery owner'),'Successful library writes retain native actor attribution in activity')
   let message
   const auth=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{message=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
   const invited=await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{email:['synthetic-pane-20','example.test'].join('@'),displayName:'Library contributor',role:'admin'})
   const token=new URL(message.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
   const contributor=(await call('/auth/confirm',{token},'')).headers.get('set-cookie').split(';')[0]
   for(const action of ['upload','update','delete','place','restore'])assert.equal((await call('/api/pane/library',{base:draft.id,action,kind:'image',id:images[1].id,site:draft.site,images:[images[0]]},contributor)).status,403)
   assert.equal((await app.request('/app/library',{headers:{Cookie:contributor}})).status,403)
   assert.equal((await app.request('/api/pane/library',{headers:{Cookie:contributor}})).status,403)
   const person=await app.db.prepare('SELECT id FROM oa_operators WHERE display_name=?').bind('Library contributor').first()
   assert.equal((await call('/api/pane/team/revoke',{operatorId:person.id,confirm:'revoke-access'})).status,200)
   assert.equal((await app.request('/api/pane/library',{headers:{Cookie:contributor}})).status,401,'Revoked credentials cannot reopen library bytes')
   assert.equal((await call('/api/pane/people/erase',{id:person.id,confirm:'erase-person'})).status,200)
   assert.equal((await call('/api/pane/library',upload,contributor)).status,401,'An erased person cannot replay an earlier upload')
   assert.equal((await read()).draft.id,draft.id)
  }finally{await app.mf.dispose()}
 }
})

test('brand uploads stay draft until approval and publish served icons, social images and profile structured data',async()=>{
 const app=await runtime();let cookie
 const call=(path,body)=>app.request(path,{method:'POST',headers:{Cookie:cookie??'',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Bakery owner'})).headers.get('set-cookie').split(';')[0]
  await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  const png=await readFile('public/brand/icon-192.png'),image={src:'data:image/png;base64,'+png.toString('base64'),width:png.readUInt32BE(16),height:png.readUInt32BE(20)}
  const site={name:'Riverbend Bakery',description:'Fresh bread and handmade cakes.',brand:{logo:image,favicon:image,social:image},socials:{instagram:'https://www.instagram.com/riverbendbakery',facebook:'https://www.facebook.com/riverbendbakery'},pages:[{slug:'home',title:'Welcome',body:'Baked in our neighbourhood.'}]}
  let response=await call('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());let draft=await response.json();assert.equal((await app.request('/site?pane-brand=favicon')).status,404,'Draft brand assets have no live delivery')
  await call('/api/pane/publish',{revision:draft.id});const html=await (await app.request('/site')).text();assert.match(html,/class="public-brand-logo"/);assert.match(html,/rel="apple-touch-icon"/);assert.match(html,/property="og:image"/);assert.match(html,/@type":"LocalBusiness"/);assert.match(html,/sameAs/)
  for(const key of ['logo','favicon','social']){const response=await app.request('/site?pane-brand='+key);assert.equal(response.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);assert.equal((await app.request('/site?pane-brand='+key,{method:'HEAD'})).status,200)}
  assert.equal((await app.request('/site?pane-brand=original')).status,404)
  const bad=structuredClone(site);bad.brand.logo.src='data:image/svg+xml;base64,PHN2Zz4=';assert.equal((await call('/api/pane/prepare',{site:bad})).status,400,'Branding uses the raster validation boundary')
  await call('/api/pane/publication-revoke',{revision:draft.id,confirm:'revoke-publication'});assert.equal((await app.request('/site?pane-brand=logo')).status,404,'Revocation removes public brand delivery')
 }finally{await app.mf.dispose()}
})


test('owner style drafts retain self-hosted fonts through preview, conflict, publication and rollback',async()=>{
 const f=await runtime();let owner,admin,member,mail
 const json=(path,body,cookie=owner,headers={})=>f.request(path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie??'',...headers},body:JSON.stringify(body),redirect:'manual'})
 const data=async()=>(await f.request('/api/pane',{headers:{Cookie:owner}})).json()
 try{
 owner=(await json('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Workshop owner'},'')).headers.get('set-cookie').split(';')[0]
 assert.equal((await f.request('/setup',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=>'127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 for(const role of ['admin','member']){
  await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:owner}}),{email:'synthetic-pane-'+role+'@'+'example.test',displayName:'Workshop '+role,role})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),response=await json('/auth/confirm',{token},'')
  assert.equal(response.status,303)
  const cookie=response.headers.get('set-cookie').split(';')[0];if(role==='admin')admin=cookie;else member=cookie
 }
 const initial=await(await json('/api/pane/prepare',{site:fixture})).json()
 await json('/api/pane/publish',{revision:initial.id})
 const fontBytes=await readFile('public/fonts/noto-serif/noto-serif-latin-wght-normal.woff2')
 const font={id:'font-'+crypto.randomUUID(),name:'Workshop serif',format:'woff2',data:fontBytes.toString('base64')}
 const formats=await Promise.all(['woff','ttf','otf'].map(async format=>({id:'font-'+crypto.randomUUID(),name:'Workshop '+format,format,data:(await readFile('tests/fonts/synthetic-pane.'+format)).toString('base64')})))
 const styles={heading:font.id,body:'adobe:synthetic-pane-body',adobe:{project:'syn0001',families:['synthetic-pane-body'],authorized:true},primary:'#075985',text:'#1f0717',background:'#ffffff',sectionBackground:'#f0f9ff',button:'pill',spacing:40,fonts:[font,...formats]}
 const site={...initial.site,styles},before=(await data()).revisions.length
 for(const cookie of [admin,member,'']){
  assert.equal((await json('/api/pane/prepare',{site,base:initial.id},cookie)).status,cookie?403:401)
  assert.equal((await json('/api/pane/autosave',{site,base:initial.id},cookie)).status,cookie?403:401)
 }
 for(const adobe of [{...styles.adobe,authorized:false},{...styles.adobe,project:'https://elsewhere.invalid'},{...styles.adobe,families:['synthetic-pane-body\";color:red'] }]){
  const refused=await json('/api/pane/autosave',{base:initial.id,site:{...site,styles:{...styles,adobe}}});assert.equal(refused.status,400,'Invalid or unauthorized external font settings never save')
 }
 const bad=await json('/api/pane/autosave',{base:initial.id,site:{...site,styles:{...styles,fonts:[{...font,data:Buffer.from('synthetic-pane-1').toString('base64')}]}}})
 assert.equal(bad.status,400)
 assert.equal((await data()).revisions.length,before,'Refused font writes preserve the latest draft')
 const saved=await json('/api/pane/autosave',{base:initial.id,site});assert.equal(saved.status,200,await saved.clone().text());const draft=await saved.json()
 assert.deepEqual(draft.site.styles,styles)
 const reopened=await f.request('/app?page=services',{headers:{Cookie:owner}}),reopenedHtml=await reopened.text();assert.ok(reopenedHtml.includes('site styles'));assert.ok(reopenedHtml.includes(fixture.pages.length+' of '+fixture.pages.length+' pages changed'),'A shared style draft marks every page as changed')
 assert.equal((await json('/app/autosave',{base:draft.id,'styles.primary':'#064e3b'},admin)).status,403,'Form writes obey the owner boundary')
 assert.equal((await json('/api/pane/import/dry-run',{source:JSON.stringify(fixture)},admin)).status,403,'Import cannot discard owner styles')
 const token=await(await json('/api/pane/tokens/create',{name:'synthetic-pane-42',scopes:['draft:write'],days:1})).json()
 assert.ok(token.token)
 assert.equal((await json('/api/pane/autosave',{base:draft.id,site:{...site,styles:{...styles,primary:'#064e3b'}}},'',{Authorization:'Bearer '+token.token})).status,403,'An owner-scoped agent credential cannot write styles')
 await json('/api/pane/tokens/revoke',{id:token.id})
 assert.equal((await json('/api/pane/autosave',{base:draft.id,site},'',{Authorization:'Bearer '+token.token})).status,401,'Revoked credentials stay refused')
 const stale=await json('/api/pane/autosave',{base:initial.id,site:{...site,styles:{...styles,primary:'#064e3b'}}});assert.equal(stale.status,409);assert.deepEqual((await stale.json()).latest.site.styles,styles)
 assert.equal((await f.request('/site?pane-font='+font.id+'&pane-revision='+draft.id)).status,404,'A draft font is not public')
 for(const slug of ['home','about','services']){
  const preview=await f.request('/preview/'+draft.id+'/'+slug,{headers:{Cookie:owner}});assert.equal(preview.status,200)
  const html=await preview.text();assert.ok(html.includes('https://use.typekit.net/'+styles.adobe.project+'.css'));assert.ok(html.includes('font-family:"synthetic-pane-body"'));assert.ok(html.includes('font-display:swap'));assert.ok(html.includes('Pane-'+font.id));assert.ok(html.includes('#075985'));assert.ok(html.includes('border-radius:999px'))
 }
 const previewFont='/preview/'+draft.id+'/home?pane-font='+font.id
 assert.equal((await f.request(previewFont,{redirect:'manual'})).status,303)
 const cssPath='/preview/'+draft.id+'/home?pane-style-css=1'
 assert.equal((await f.request(cssPath,{redirect:'manual'})).status,303)
 const sheet=await f.request(cssPath,{headers:{Cookie:owner}});assert.match(sheet.headers.get('content-type'),/text\/css/);assert.ok((await sheet.text()).includes('Pane-'+font.id))
 const privateFont=await f.request(previewFont,{headers:{Cookie:owner}});assert.equal(privateFont.headers.get('content-type'),'font/'+font.format);assert.deepEqual(Buffer.from(await privateFont.arrayBuffer()),fontBytes)
 assert.equal((await json('/api/pane/publish',{revision:draft.id})).status,200)
 const live=await f.request('/site');assert.ok((await live.text()).includes('https://use.typekit.net/'+styles.adobe.project+'.css'));const policy=live.headers.get('content-security-policy');assert.match(policy,/font-src 'self' https:\/\/use\.typekit\.net/);assert.doesNotMatch(policy.split(';').find(part=>part.trim().startsWith('script-src')),/typekit|unsafe-inline/,'Adobe fonts do not grant external script authority')
 const asset='/site?pane-font='+font.id+'&pane-revision='+draft.id
 const delivered=await f.request(asset);assert.equal(delivered.status,200);assert.match(delivered.headers.get('cache-control'),/no-store/);assert.equal(delivered.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await delivered.arrayBuffer()),fontBytes)
 assert.equal((await f.request(asset,{method:'HEAD'})).headers.get('content-length'),String(fontBytes.length))
 assert.equal((await f.request(asset.replace(draft.id,initial.id))).status,404,'A stale live revision cannot deliver a font')
 for(const item of formats){const response=await f.request('/site?pane-font='+item.id+'&pane-revision='+draft.id);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'font/'+item.format);assert.deepEqual(Buffer.from(await response.arrayBuffer()).toString('base64'),item.data)}
 const archive=await exportData(f.db),restored=await runtime()
 try{assert.equal((await restore(restored.db,archive)).phase,'complete');const response=await restored.request(asset);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fontBytes);assert.ok((await(await restored.request('/site')).text()).includes('https://use.typekit.net/'+styles.adobe.project+'.css'))}finally{await restored.mf.dispose()}
 assert.equal((await json('/api/pane/rollback',{revision:initial.id})).status,200)
 assert.ok(!(await(await f.request('/site')).text()).includes('use.typekit.net'),'Rollback removes the Adobe connection from the live page')
 assert.equal((await f.request(asset)).status,404,'Rollback withdraws the uploaded font from public delivery')
 for(const expected of [initial,draft])assert.deepEqual((await data()).revisions.find(row=>row.id===expected.id),expected,'Style edits and approvals leave complete prior snapshots immutable')
 const activityRows=await(await f.request('/api/pane/activity',{headers:{Cookie:owner}})).json();assert.ok(activityRows.some(row=>row.subject==='revision:'+draft.id&&row.action==='edit'),'The style draft has transactional activity')
 }finally{await f.mf.dispose()}
})
