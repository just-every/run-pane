import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/access')
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const roleContexts=[]
const context=await browser.newContext({timezoneId:'Asia/Tokyo'}),page=await context.newPage(),origin=fixture.origin
try {
 await fixture.bootstrap(context)
 await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 site.automations={timeZone:'America/Denver',banners:[]}
 const prepared=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}})
 assert.equal(prepared.status(),200)
 const revision=(await prepared.json()).id
 assert.equal((await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision}})).status(),200)
 const messageId=crypto.randomUUID()
 await context.request.post(origin+'/site/contact',{headers:{Origin:origin},form:{idempotency:messageId,name:'Synthetic enquirer',email:'synthetic-pane-1@example.test',message:'Synthetic enquiry',website:''}})
 const people={}
 for(const role of ['editor','inbox','reporting']){
  const link=await fixture.invitePerson(context,{email:'synthetic-pane-'+role+'@example.test',displayName:'Synthetic '+role,roles:[role]})
  const member=await browser.newContext({timezoneId:'Asia/Tokyo'}),tab=await member.newPage();roleContexts.push(member)
  await tab.goto(link);await tab.getByRole('button',{name:/Confirm/}).click()
  await tab.waitForURL(url=>url.pathname.startsWith('/app'))
  people[role]={context:member,page:tab}
 }
 async function capture(tab,name){
  for(const element of await tab.locator('time[data-format]').all()){
   assert.equal(await element.getAttribute('data-time-zone'),'America/Denver','Every current workspace timestamp carries the published business zone')
   const valid=await element.evaluate(time=>{return time.textContent.includes(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',...(time.dataset.format==='day'?{day:'numeric'}:{hour:'numeric',minute:'2-digit'})}).format(new Date(time.dateTime)))})
   assert.equal(valid,true,'Business-local date survives a Tokyo browser')
  }
  assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
  await tab.screenshot({path:resolve(folder,name+'.png'),fullPage:true})
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites')
  const log=page.locator('[aria-labelledby="activity-title"]')
  await log.scrollIntoViewIfNeeded();await log.getByRole('heading',{name:'Activity log'}).waitFor()
  assert.match(await log.innerText(),/edit/);assert.match(await log.innerText(),/publish/)
  const download=page.waitForEvent('download');await log.getByRole('link',{name:'Export activity'}).click()
  const exported=await download;assert.equal(exported.suggestedFilename(),'pane-activity.json')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Activity screen overflow '+width)
  await page.screenshot({path:resolve(folder,'activity-'+width+'.png'),fullPage:true})
  await capture(page,'owner-sites-'+width)
  await log.screenshot({path:resolve(folder,'activity-panel-'+width+'.png')})
  for(const path of ['/app','/app/moves','/app/inquiries']){await page.goto(origin+path);await capture(page,'owner-'+path.split('/').at(-1)+'-'+width)}
  const editor=people.editor.page;await editor.setViewportSize({width,height:1000})
  await editor.goto(origin+'/app?page=home')
  assert.equal(await editor.getByRole('button',{name:'Approve & publish',exact:true}).count(),0)
  assert.equal(await editor.getByRole('navigation',{name:'Workspace'}).getByRole('link',{name:/Inquiries/}).count(),0)
  await editor.getByLabel('Text',{exact:true}).fill('Synthetic editor draft '+width)
  await editor.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.')
  await capture(editor,'editor-pages-'+width)
  await editor.goto(origin+'/app/search');await editor.getByRole('heading',{name:'Search settings',exact:true}).waitFor();await capture(editor,'editor-search-'+width)
  await editor.goto(origin+'/app/sites');assert.equal(await editor.getByRole('heading',{name:'Traffic details',exact:true}).count(),0);await capture(editor,'editor-sites-'+width)
  assert.equal((await people.editor.context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision}})).status(),403)
  assert.equal((await people.inbox.context.request.get(origin+'/app',{maxRedirects:0})).headers().location,'/app/inquiries')
  assert.equal((await people.reporting.context.request.get(origin+'/app',{maxRedirects:0})).headers().location,'/app/sites')
  const inbox=people.inbox.page;await inbox.setViewportSize({width,height:1000});await inbox.goto(origin+'/app/inquiries')
  assert.ok((await inbox.locator('a.brand').getAttribute('href'))==='/app/inquiries')
  await inbox.getByText('Reply to enquiry',{exact:true}).click()
  await inbox.getByLabel('Reply text',{exact:true}).fill('Synthetic reply '+width)
  await capture(inbox,'inbox-compose-'+width)
  await Promise.all([inbox.waitForURL(url=>url.pathname==='/app/inquiries'&&url.searchParams.has('notice')),inbox.getByRole('button',{name:'Send reply',exact:true}).click()])
  assert.match(await inbox.locator('main').innerText(),/suppressed/)
  await capture(inbox,'inbox-reply-'+width)
  const reporter=people.reporting.page;await reporter.setViewportSize({width,height:1000});await reporter.goto(origin+'/app/sites')
  await reporter.getByRole('heading',{name:'Reports',exact:true}).waitFor()
  assert.equal(await reporter.getByRole('heading',{name:'Every revision, kept',exact:true}).count(),0)
  assert.equal(await reporter.getByRole('heading',{name:'Activity log',exact:true}).count(),0)
  await capture(reporter,'reporting-'+width)
 }
 console.log('Access browser journey passed: owner activity and export, permitted editor/search/preview controls, isolated reporting and explicit inbox replies and Denver workspace dates in a Tokyo browser at 1440 and 390.')
}finally{for(const member of roleContexts)await member.close();await browser.close();await fixture.stop()}
