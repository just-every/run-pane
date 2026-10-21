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
 const d=await data();assert.equal(d.live.id,first.id);assert.equal(d.approvals[0].revision,first.id);assert.ok(d.approvals[0].actor)
})
test('ACCESS-002: mutations require the canonical origin; accepted contact is durable and visits respect privacy',async()=>{
 const before=await data(),foreign='https://elsewhere.invalid'
 for(const originHeader of [{},{Origin:foreign},{Origin:'null'}]){
  for(const prefix of ['/api/pane/','/app/'])for(const action of ['prepare','publish','rollback','review','messages/erase','import/dry-run','import/apply','import/undo']){
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
 const submit = (id, email = 'avery@example.test') => app.request(hosted + '/site/contact', {method: 'POST', headers: {Origin: hosted, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({idempotency: id, name: 'Avery', email, message: 'Visitor text must stay in the inbox.'})})
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
 await f.request('/site/contact', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({idempotency: localId, name: 'Avery', email: 'avery@example.test', message: 'Local proof'})})
 assert.equal((await data()).messages.find(message => message.id === localId).acknowledgment_status, 'suppressed')
})

test('traffic groups real public visit events without retaining referrers or unapproved identifiers and excludes privacy opt-outs', async () => {
 const app = await runtime({cf: {country: 'US', regionCode: 'CO', city: 'Denver'}})
 let cookie = ''
 const post = (path, body) => app.request(path, {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
 const dashboard = async () => (await app.request('/api/pane', {headers: {Cookie: cookie}})).json()
 const visit = (path, referrerHost, campaign, agent, headers = {}) => app.request('/site/visit', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'User-Agent': agent, 'CF-Connecting-IP': '203.0.113.25', ...headers}, body: JSON.stringify({path, referrerHost, campaign})})
 const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile'
 const desktop = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'
 try {
  const signed = await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Traffic owner'})
  cookie = signed.headers.get('set-cookie').split(';')[0]
  await app.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
  const first = await (await post('/api/pane/prepare', {site: fixture})).json()
  await post('/api/pane/publish', {revision: first.id})
  const site = {...fixture, analyticsCampaigns: ['spring-open-house', 'summer-workshop']}
  const prepared = await (await post('/api/pane/prepare', {site})).json()
  await visit('home', '', 'spring-open-house', desktop)
  assert.deepEqual((await dashboard()).traffic.campaign, [{label: '', count: 1}], 'Draft labels cannot authorize retention')
  await post('/api/pane/publish', {revision: prepared.id})
  assert.equal((await visit('home', 'www.google.com', 'spring-open-house', phone)).status, 204)
  assert.equal((await visit('about', 'www.facebook.com', 'summer-workshop', desktop)).status, 204)
  assert.equal((await visit('services', 'avery.private.example', 'customer-avery-29383838', desktop)).status, 204)
  const data = await dashboard()
  assert.deepEqual(data.visits, [{path: 'about', count: 1}, {path: 'home', count: 2}, {path: 'services', count: 1}])
  assert.ok(data.traffic.source.some(row => row.label === 'Google' && row.count === 1))
  assert.ok(data.traffic.source.some(row => row.label === 'Facebook' && row.count === 1))
  assert.ok(data.traffic.source.some(row => row.label === 'Other website' && row.count === 1))
  assert.ok(data.traffic.device.some(row => row.label === 'phone' && row.count === 1))
  assert.ok(data.traffic.device.some(row => row.label === 'desktop' && row.count === 3))
  assert.deepEqual(data.traffic.location, [{label: 'US-CO', count: 4}])
  assert.deepEqual(data.traffic.day, [{label: new Date().toISOString().slice(0, 10), count: 4}])
  assert.ok(data.traffic.campaign.some(row => row.label === 'spring-open-house' && row.count === 1))
  assert.ok(data.traffic.campaign.some(row => row.label === 'summer-workshop' && row.count === 1))
  assert.ok(data.traffic.campaign.some(row => row.label === '' && row.count === 2))
  for (const privacy of [{'Sec-GPC': '1'}, {DNT: '1'}]) assert.equal((await visit('home', 'www.google.com', 'spring-open-house', phone, privacy)).status, 204)
  assert.deepEqual(await dashboard(), data, 'Privacy opt-outs cause no counter write')
  const rows = await app.db.prepare('SELECT * FROM pane_visits').all()
  assert.doesNotMatch(JSON.stringify(rows.results), /avery|29383838|203\.0\.113\.25|Mozilla|Denver|private\.example/)
  const html = await (await app.request('/app/sites', {headers: {Cookie: cookie}})).text()
  for (const label of ['Google', 'Facebook', 'spring-open-house', 'summer-workshop', 'US-CO']) assert.ok(html.includes(label))
  assert.equal((await app.request('/api/pane')).status, 401)
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
  const first=await (await post('/api/pane/prepare',{site})).json()
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
