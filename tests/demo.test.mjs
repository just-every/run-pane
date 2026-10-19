import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runtime, origin, settings } from './runtime.mjs'

test('demo: Ortega Bakery opens lived-in; the draft publishes, a message arrives and an invitation sends nothing',async()=>{
 const outbound=[]
 const f=await runtime({bindings:{RER_DEMO:'1',MAIL_PROVIDER:'resend',MAIL_API_KEY:'test-network-edge'},outboundService:async request=>{outbound.push(request.url);return Response.json({id:'sent'})}})
 try {
  const post=(path,body,cookie,type='application/json')=>f.request(path,{method:'POST',headers:{Origin:origin,'Content-Type':type,Cookie:cookie??''},body:type==='application/json'?JSON.stringify(body):new URLSearchParams(body),redirect:'manual'})
  const r=await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Owner',returnTo:'/app'});assert.equal(r.status,303,await r.text())
  const owner=r.headers.get('set-cookie').split(';')[0],data=async()=>(await f.request('/api/pane',{headers:{Cookie:owner}})).json()
  let d=await data()
  assert.equal(d.name,'Elena Ortega');assert.equal(d.live.site.name,'Ortega Bakery');assert.ok(d.revisions.length>=8)
  assert.notEqual(d.draft.id,d.live.id);assert.match(d.draft.site.pages.find(p=>p.slug==='services').body,/Tastings Tuesday to Saturday/);assert.equal(d.people[d.draft.actor],'Mateo Ortega')
  assert.deepEqual(d.approvals.map(a=>a.action).filter(a=>a==='rollback'),['rollback']);assert.ok(d.messages.length>=12);assert.equal(d.messages[0].name,'Lucia Ramirez')
  assert.ok(d.visits.reduce((sum,v)=>sum+v.count,0)>1000)
  assert.equal((await post('/api/pane/publish',{revision:d.draft.id},owner)).status,200)
  assert.match(await (await f.request('/site/services')).text(),/Tastings Tuesday to Saturday/)
  assert.equal((await post('/site/contact',{idempotency:crypto.randomUUID(),name:'Ana Silva',email:'ana@example.test',message:'Do you bake sugar-free cakes?',website:''},'','application/x-www-form-urlencoded')).status,303)
  d=await data();assert.equal(d.live.id,d.draft.id);assert.equal(d.messages[0].name,'Ana Silva')
  assert.equal((await post('/auth/invite',{email:'sofia@example.test',displayName:'Sofia Grant',role:'admin',returnTo:'/app'},owner)).status,202)
  assert.deepEqual(outbound,[])
  const page=await f.request('/app',{headers:{Cookie:owner}});assert.equal(page.status,200);const html=await page.text()
  assert.equal(html.match(/<[a-z]+[^>]*\sdata-rer-name[\s>=]/g)?.length,1);assert.ok(!html.includes('Demo Demo'));assert.match(html,/<title>[^<]*Pane Demo<\/title>/)
 } finally { await f.mf.dispose() }
})
