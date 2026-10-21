import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runtime, origin, settings } from './runtime.mjs'
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
 assert.equal((await json('/api/pane/prepare',{site:fixture},member)).status,403)
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
 const d=await data();assert.equal(d.live.id,first.id);assert.equal(d.approvals[0].revision,first.id);assert.ok(d.approvals[0].actor)
})
test('ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy',async()=>{
 const before=await data(),foreign='https://elsewhere.invalid'
 for(const originHeader of [{},{Origin:foreign},{Origin:'null'}]){
  for(const prefix of ['/api/pane/','/app/'])for(const action of ['prepare','publish','rollback','messages/erase','import/dry-run','import/apply','import/undo']){
   const response=await f.request(prefix+action,{method:'POST',headers:{Cookie:owner,'Content-Type':'application/json',...originHeader},body:JSON.stringify({site:fixture,revision:first.id,id:crypto.randomUUID(),source:JSON.stringify(fixture)})})
   assert.equal(response.status,403,prefix+action)
  }
  assert.equal((await f.request('/site/contact',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...originHeader},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Avery',email:'avery@example.test',message:'A cross-origin enquiry'})})).status,403)
  assert.equal((await f.request('/site/visit',{method:'POST',headers:{'Content-Type':'application/json',...originHeader},body:JSON.stringify({path:'home'})})).status,403)
 }
 // A matching Origin on an alternate hostname must not redefine the installation.
 for(const headerOrigin of [foreign,origin]){
  assert.equal((await f.request(foreign+'/site/contact',{method:'POST',headers:{Origin:headerOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Avery',email:'avery@example.test',message:'An alternate-host enquiry'})})).status,403)
  assert.equal((await f.request(foreign+'/site/visit',{method:'POST',headers:{Origin:headerOrigin,'Content-Type':'application/json'},body:JSON.stringify({path:'home'})})).status,403)
 }
 assert.deepEqual(await data(),before,'Rejected mutations must not change revisions, approvals, imports, inbox or visits')
 contactId=crypto.randomUUID()
 const body=new URLSearchParams({idempotency:contactId,name:'Avery <script>',email:'avery@example.test',message:'Can you cater our opening?',website:''})
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
 second=await (await json('/api/pane/prepare',{site})).json()
 assert.equal((await json('/api/pane/publish',{revision:second.id})).status,200)
 assert.ok((await (await f.request('/site')).text()).includes('Open late on Fridays.'))
 assert.equal((await json('/api/pane/rollback',{revision:first.id})).status,200)
 assert.ok(!(await (await f.request('/site')).text()).includes('Open late on Fridays.'))
 assert.equal((await data()).approvals.filter(a=>a.action==='rollback').length,1)
 const never=await (await json('/api/pane/prepare',{site:{...fixture,name:'Riverbend never live'}})).json()
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
 const plan=await json('/api/pane/import/dry-run',{source},admin);assert.equal(plan.status,200,await plan.clone().text());const p=await plan.json()
 assert.equal((await json('/api/pane/import/apply',{source,fingerprint:'wrong'},admin)).status,400)
 const applied=await json('/api/pane/import/apply',{source,fingerprint:p.fingerprint},admin);assert.equal(applied.status,200,await applied.clone().text());importJob=await applied.json();assert.equal(importJob.state,'completed')
 assert.equal((await data()).live.id,first.id)
 assert.equal((await json('/api/pane/import/undo',{job:importJob.id},member)).status,403)
 const undone=await json('/api/pane/import/undo',{job:importJob.id},admin);assert.equal(undone.status,200,await undone.clone().text());assert.equal((await undone.json()).state,'undone')
 assert.ok((await data()).imports.some(j=>j.id===importJob.id&&j.state==='undone'))
})
test('owner erasure removes personal data and prevents submission replay',async()=>{
 assert.equal((await json('/api/pane/messages/erase',{id:contactId},admin)).status,403)
 assert.equal((await json('/api/pane/messages/erase',{id:contactId})).status,200)
 assert.equal((await data()).messages.length,0)
 await f.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:contactId,name:'Avery',email:'avery@example.test',message:'Replay'})})
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
