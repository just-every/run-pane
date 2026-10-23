// Real built Worker, independent Durable Object and D1; no product outage switch.
import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
process.env.PANE_LIVE_FIXTURE='1'
const fixture=await import('../tests/browser-runtime.mjs')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/outage');await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
let offline=false
async function capture(name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow');await page.screenshot({path:resolve(folder,name+'.png'),fullPage:true})}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const prepared=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}})
 assert.equal(prepared.status(),200)
 assert.equal((await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:(await prepared.json()).id}})).status(),200)
 await fixture.databaseUnavailable(true);offline=true
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  for(const item of site.pages){
   const response=await page.goto(origin+(item.slug==='home'?'/site':'/site/'+item.slug))
   assert.equal(response.status(),200);assert.equal(await page.getByRole('heading',{name:item.title,exact:true}).count(),1)
   await capture('outage-'+item.slug+'-'+width)
  }
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic outage '+width)
  await page.getByLabel('Email address',{exact:true}).fill('synthetic-pane-outage@example.test')
  await page.getByLabel('Message',{exact:true}).fill('Received while D1 was unavailable '+width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('sent')),page.getByRole('button',{name:'Send message',exact:true}).click()])
  assert.match(await page.locator('body').innerText(),/message has been received/)
  await capture('outage-accepted-'+width)
 }
 await fixture.databaseUnavailable(false);offline=false
 await fixture.advance(new Date().toISOString());await fixture.advance(new Date().toISOString())
 const dashboard=await(await context.request.get(origin+'/api/pane')).json()
 assert.equal(dashboard.messages.length,2)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries')
  assert.equal(await page.getByRole('heading',{name:'Synthetic outage '+width,exact:true}).count(),1)
  assert.equal(await page.locator('a,button').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&n.querySelector('svg')&&!n.dataset.tip).length),0)
  await capture('outage-recovered-'+width)
 }
 console.log('Outage browser journey passed: every live page and verified form intake survive missing D1 tables; recovery delivers each message once through the scheduled event at 1440 and 390.')
}finally{if(offline)await fixture.databaseUnavailable(false);await browser.close();await fixture.stop();delete process.env.PANE_LIVE_FIXTURE}
