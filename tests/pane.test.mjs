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
  for(const prefix of ['/api/pane/','/app/'])for(const action of ['prepare','publish','rollback','review','messages/erase','privacy/find','privacy/export','privacy/erase','ownership/transfer','team/revoke','policies/generate','import/dry-run','import/apply','import/undo']){
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

test('explicit person erasure removes actor attribution, preserves the log and revokes access',async()=>{
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
  assert.equal((await app.request('/api/pane/activity',{headers:{Cookie:adminCookie}})).status,403)
  const issued=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-6',operatorId:person,scopes:['pages:read']})).json()
  assert.equal((await call('/api/pane/tokens/revoke',{id:issued.id})).status,200)
  const presented={headers:{Authorization:'Bearer '+issued.token}}
  assert.equal((await app.request('/api/pane/pages',presented)).status,401)
  const before=await rows(),entry=before.find(row=>row.subject==='revision:'+draft.id)
  assert.equal(entry.actor,'Synthetic administrator')
  assert.ok(before.some(row=>row.agent===issued.id&&row.action==='api.GET.401'))
  assert.equal((await call('/api/pane/people/erase',{id:person})).status,400)
  assert.equal((await call('/api/pane/people/erase',{id:person,confirm:'erase-person'},adminCookie)).status,403)
  assert.equal((await call('/api/pane/people/erase',{id:person,confirm:'erase-person'})).status,200)
  assert.equal((await app.request('/api/pane/pages',presented)).status,401)
  const after=await rows();assert.ok(after.length>=before.length)
  assert.ok(!after.some(row=>row.agent===issued.id),'Erasure anonymizes the person\'s token attribution, including later refused calls')
  assert.match(after.find(row=>row.sequence===entry.sequence).actor,/Former person/)
  assert.doesNotMatch(JSON.stringify(after),/Synthetic administrator|synthetic-pane-4@example/)
  assert.equal((await call('/api/pane/prepare',{site:fixture},adminCookie)).status,401)
  const erased=await app.db.prepare('SELECT email,display_name,status FROM oa_operators WHERE id=?').bind(person).first()
  assert.equal(erased.status,'inactive');assert.equal(erased.display_name,'Former person');assert.ok(erased.email.endsWith('@erased.invalid'))
  const ownerId=(await app.db.prepare("SELECT id FROM oa_operators WHERE role='owner'").first()).id
  assert.equal((await call('/api/pane/people/erase',{id:ownerId,confirm:'erase-person'})).status,400)
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
  assert.equal((await get('/api/pane/collections')).status,501,'No collection API success is claimed before CMS-001')
 }finally{await app.mf.dispose()}
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
   {roles:['author']},
   {roles:['comment-moderator']},
   {roles:['inbox'],inbox:true},
   {roles:['reporting'],reports:true},
   {roles:['editor','inbox','reporting'],pages:true,edit:true,inbox:true,reports:true},
  ]
  for(const [index,row] of matrix.entries()){
   const invitation=await call('/api/pane/roles/invite',{email:`synthetic-pane-${30+index}@example.test`,displayName:'Synthetic '+row.roles.join(' '),roles:row.roles})
   assert.equal(invitation.status,200,await invitation.clone().text());const person=await invitation.json()
   // Delivery happens only after the role assignment exists; inspect that boundary.
   assert.equal((await app.db.prepare('SELECT roles FROM pane_roles WHERE operator_id=?').bind(person.operatorId).first()).roles,JSON.stringify([...row.roles].sort()))
   const cookie=await signInvitation(row.edit?'/app':row.inbox?'/app/inquiries':row.reports?'/app/sites':'/app')
   const admission=await (await get('/api/pane/activity')).json()
   assert.ok(admission.some(event=>event.subject==='person:'+person.operatorId&&event.action==='authentication.change'&&event.actor==='Synthetic '+row.roles.join(' ')),'Native confirmation attributes the admitted person')
   const expected=new Map([
    ['/app',row.pages?200:row.inbox||row.reports?303:403],['/app/sites',row.pages||row.reports?200:403],['/app/inquiries',row.inbox?200:403],['/app/moves',403],['/app/search',row.edit?200:403],
    ['/preview/'+prepared.id+'/home',row.edit?200:403],['/api/pane',200],['/api/pane/pages',row.pages?200:403],['/api/pane/collections',row.pages?501:403],
    ['/api/pane/activity',403],['/api/pane/activity/export',403],['/api/pane/roles',403],['/api/pane/tokens',403],
   ])
   for(const [path,status] of expected)assert.equal((await get(path,cookie)).status,status,row.roles+': '+path)
   if(!row.pages&&(row.inbox||row.reports))assert.equal((await get('/app',cookie)).headers.get('location'),row.inbox?'/app/inquiries':'/app/sites')
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
   const scoped=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-26',operatorId:person.operatorId,scopes:['pages:read']})).json()
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,row.pages?200:403)
   assert.equal((await call('/api/pane/roles/set',{operatorId:person.operatorId,roles:[]})).status,200)
   assert.equal((await app.request(hosted+'/api/pane/pages',{headers:{Authorization:'Bearer '+scoped.token}})).status,403,'Tokens lose revoked Pane capabilities on the next request')
   assert.equal((await get('/app',cookie)).status,403,'Removing a grant takes effect on the next request')
   assert.equal((await get('/app/inquiries',cookie)).status,403)
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

test('form protection refuses and separately counts honeypot, per-form bursts and invalid provider proofs',async()=>{
 let answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:'contact'},calls=0,unavailable=false
 const app=await runtime({turnstile:async(_request,fields)=>{
  calls++;assert.equal(fields.get('secret'),'synthetic-pane-2');assert.ok(fields.get('idempotency_key'))
  return unavailable?new Response(null,{status:503}):Response.json(answer)
 }})
 try{
  const boot=await app.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'Synthetic designer'})})
  const cookie=boot.headers.get('set-cookie').split(';')[0]
  assert.equal((await app.request('/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const post=(path,body)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const site=structuredClone(fixture);site.pages.push({...site.pages.find(p=>p.slug==='contact'),slug:'quote',kind:'contact'})
  const rev=await(await post('/api/pane/prepare',{site})).json();assert.equal((await post('/api/pane/publish',{revision:rev.id})).status,200)
  const send=(fields={},slug='contact')=>app.request('/site/'+slug,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:crypto.randomUUID(),name:'Synthetic visitor',email:'synthetic-pane@example.test',message:'Private rejected words','cf-turnstile-response':'synthetic-pane-3',...fields})})
  assert.equal((await send({website:'synthetic-pane-4'})).status,403);assert.equal(calls,0)
  for(const proof of [{success:false},{hostname:'elsewhere.example.test'},{action:'other'},{cdata:'quote'}]){
   answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:'contact',...proof}
   assert.equal((await send()).status,403)
  }
  assert.equal((await send({'cf-turnstile-response':''})).status,403)
  unavailable=true;assert.equal((await send()).status,503);unavailable=false
  answer={success:true,hostname:new URL(origin).hostname,action:'pane-contact',cdata:'contact'}
  const id=crypto.randomUUID();assert.equal((await send({idempotency:id})).status,303);assert.equal((await send({idempotency:id})).status,303)
  const rows=await app.db.prepare('SELECT * FROM pane_messages').all();assert.equal(rows.results.length,1);assert.equal(rows.results[0].id,id)
  // Each form has an independent bucket. Rejected bot proofs cannot bypass it.
  let status
  for(let index=0;index<20;index++)status=(await send({'cf-turnstile-response':''})).status
  assert.equal(status,429)
  answer.cdata='quote';assert.equal((await send({},'quote')).status,303)
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
  const site={...fixture,analytics:{ga4:'G-SYNTH12345',vane:{origin:'https://vane.example.test',site:'synthetic-pane-1'}}}
  const draft=await(await post('/api/pane/prepare',{site})).json();await post('/api/pane/publish',{revision:draft.id})
  assert.equal((await post('/api/pane/policies/generate',{base:draft.id},'')).status,401)
  const generated=await(await post('/api/pane/policies/generate',{base:draft.id})).json()
  assert.equal(generated.site.pages.length,site.pages.length+3)
  const privacy=generated.site.pages.find(p=>p.slug==='privacy-policy')
  for(const name of ['Google Analytics 4 (GA4)','Vane','Cloudflare Turnstile','name, email address and message','not legal advice'])assert.ok(privacy.body.includes(name),name)
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
 const app=await runtime({isolatedLive:true});let mail
 const native=createOperatorAuth({db:app.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async value=>{mail=value;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 const post=(path,body,cookie)=>app.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(body)})
 try{
  await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'})
  await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),cookie=(await post('/auth/confirm',{token})).headers.get('set-cookie').split(';')[0]
  const draft=await(await post('/api/pane/prepare',{site:fixture},cookie)).json();await post('/api/pane/publish',{revision:draft.id},cookie)
  const id=crypto.randomUUID(),email='synthetic-pane-pending@example.test'
  assert.equal((await app.request('/site/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({idempotency:id,name:'Synthetic visitor',email,message:'Pending personal data','cf-turnstile-response':'synthetic-pane-3'})})).status,303)
  const found=await(await post('/api/pane/privacy/find',{email},cookie)).json();assert.equal(found.queued.length,1);assert.equal(found.messages.length,0)
  const erased=await post('/api/pane/privacy/erase',{email,confirm:'erase-person-data'},cookie);assert.equal(erased.status,200,await erased.clone().text())
  assert.equal((await(await post('/api/pane/privacy/find',{email},cookie)).json()).queued.length,0)
  await(await app.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'* * * * *'})
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS total FROM pane_messages').first()).total,0)
  assert.ok(await app.db.prepare('SELECT id FROM pane_erased_messages WHERE id=?').bind(id).first())
 }finally{await app.mf.dispose()}
})
