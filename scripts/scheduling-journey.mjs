import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
// Approval timestamps predate the first review cutoff, independent of the host clock.
process.env.PANE_BROWSER_NOW='2026-10-01T12:00:00Z'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
page.setDefaultTimeout(20000)
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/schedules');await mkdir(folder,{recursive:true})
const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data})
const dashboard=async()=>(await context.request.get(origin+'/api/pane')).json()
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.',undefined,{timeout:20000})
const siteText=async()=>(await context.request.get(origin+'/site')).text()
async function capture(name,width){await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} overflow at ${width}`)}
async function tooltip(){await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'})});await page.mouse.move(0,500);const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await page.mouse.move(0,500);await page.keyboard.press('Escape');await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await page.keyboard.press('Escape')}
async function accessible(){await page.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'));assert.deepEqual(await page.evaluate(async()=> (await axe.run(document)).violations),[],'Scheduled publication controls pass axe')}
async function tick(iso){await fixture.advance(iso)}
try {
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const source=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 // The post acceptance runs once at desktop width; both widths record the changed screens.
 await page.setViewportSize({width:1440,height:1000})
 const initial=await (await post('/api/pane/prepare',{site:source})).json()
 assert.equal((await post('/api/pane/publish',{revision:initial.id})).status(),200)
 const write=async slug=>{
  const state=await dashboard()
  const response=await post('/api/pane/posts/save',{base:state.draft.id,blog:'news',byline:'Workshop team',authorSlug:'team',content:{slug,title:slug,body:'Approved morning workshop news.'}})
  assert.equal(response.status(),200);return (await response.json()).posts.at(-1)
 }
 const morning=await write('morning-news'),pending=await write('unapproved-news')
 let state=await dashboard()
 assert.equal((await post('/api/pane/posts/submit',{base:state.draft.id,id:morning.id})).status(),200)
 await page.goto(origin+'/app/posts?id='+morning.id);await page.getByText('Publication schedule',{exact:true}).click()
 await page.getByLabel('Publish at',{exact:true}).fill('2026-10-02T09:00')
 await page.getByLabel('Unpublish at (optional)',{exact:true}).fill('2026-10-03T09:00')
 await page.getByLabel('Publication time zone',{exact:true}).selectOption('America/Chicago')
 await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Approve scheduled post',exact:true}).click()])
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.getByText('Publication schedule',{exact:true}).click()
  await page.getByText('Approved for',{exact:false}).waitFor()
  const account=page.locator('[data-tip="Account and team"]')
  await account.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor()
  await page.mouse.move(0,500);await page.keyboard.press('Escape');await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor()
  await capture('approved-post-schedule',width);await page.keyboard.press('Escape')
  await page.reload()
 }
 state=await dashboard()
 assert.equal((await post('/api/pane/posts/schedule',{base:state.draft.id,id:pending.id,timeZone:'America/Chicago',occurrence:'2026-10-02T09:00'})).status(),200)
 await tick('2026-10-02T13:59:00Z');assert.equal((await context.request.get(origin+'/site/news/morning-news')).status(),404)
 await tick('2026-10-02T14:00:00Z');assert.equal((await context.request.get(origin+'/site/news/morning-news')).status(),200)
 state=await dashboard();const executed=state.schedules.history.filter(event=>event.kind==='post-published')
 assert.equal(executed.length,1);assert.equal(executed[0].occurrence,'2026-10-02T09:00');assert.equal(executed[0].executedAt,Date.parse('2026-10-02T14:00:00Z'));assert.equal(executed[0].timeZone,'America/Chicago')
 assert.deepEqual(state.schedules.draftDue,['Post: unapproved-news']);assert.equal((await context.request.get(origin+'/site/news/unapproved-news')).status(),404)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites')
  const region=page.getByRole('region',{name:'Schedules and reviews'});await region.getByText('Schedule event history',{exact:true}).click()
  await region.getByText('post published',{exact:true}).waitFor();await region.scrollIntoViewIfNeeded();await capture('post-execution-and-unapproved',width)
  await page.goto(origin+'/site/news/morning-news');await capture('scheduled-live-post',width)
 }

 await tick('2026-10-03T13:59:00Z');assert.equal((await context.request.get(origin+'/site/news/morning-news')).status(),200)
 await tick('2026-10-03T14:00:00Z');assert.equal((await context.request.get(origin+'/site/news/morning-news')).status(),404)
 assert.equal((await dashboard()).schedules.history.filter(event=>event.kind==='post-unpublished').length,1)
 const pageDraft=structuredClone((await dashboard()).draft.site);pageDraft.pages.find(page=>page.slug==='about').body='Scheduled studio page';pageDraft.pages.find(page=>page.slug==='hours').body='Unapproved hours draft'
 const pageSource=await(await post('/api/pane/prepare',{base:(await dashboard()).draft.id,site:pageDraft})).json()
 const aboutReview=await(await post('/api/pane/page-request-review',{base:pageSource.id,page:'about'})).json(),hoursReview=await(await post('/api/pane/page-request-review',{base:pageSource.id,page:'hours'})).json()
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/app?page=about');await page.getByText('Page publication schedule',{exact:true}).click()
 await page.getByLabel('Page publication time zone',{exact:true}).selectOption('America/Chicago');await page.getByLabel('Publish page at',{exact:true}).fill('2026-10-17T09:00');await page.getByLabel('Unpublish page at (optional)',{exact:true}).fill('2026-10-18T09:00')
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await tooltip();if(width===1440)await accessible();await capture('page-schedule-approval',width)}
 await page.setViewportSize({width:1440,height:1000})
 await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Approve page schedule',exact:true}).click()])
 assert.equal((await post('/api/pane/page-schedule',{base:pageSource.id,page:'hours',request:hoursReview.id,start:'2026-10-17T09:00',timeZone:'America/Chicago'})).status(),200)
 await tick('2026-10-17T13:59:00Z');assert.ok(!(await(await context.request.get(origin+'/site/about')).text()).includes('Scheduled studio page'))
 await tick('2026-10-17T14:00:00Z');assert.ok((await(await context.request.get(origin+'/site/about')).text()).includes('Scheduled studio page'));assert.ok(!(await(await context.request.get(origin+'/site/hours')).text()).includes('Unapproved hours draft'))
 const pageHistory=(await dashboard()).schedules.history.filter(event=>event.kind==='page-publish');assert.equal(pageHistory.length,1);assert.equal(pageHistory[0].revision,pageSource.id);assert.equal(pageHistory[0].executedAt,Date.parse('2026-10-17T14:00:00Z'))
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/site/about');await page.getByText('Scheduled studio page',{exact:true}).waitFor();await capture('scheduled-page-live',width);await page.goto(origin+'/app/sites');const status=page.getByRole('region',{name:'Schedules and reviews'});if(width===1440)assert.ok((await status.innerText()).includes('Page awaiting approval: Visit the workshop'));await status.getByText('Schedule event history',{exact:true}).click();await status.scrollIntoViewIfNeeded();await capture('page-schedule-history-and-refusal',width)}
 await tick('2026-10-18T13:59:00Z');assert.equal((await context.request.get(origin+'/site/about')).status(),200)
 await tick('2026-10-18T14:00:00Z');assert.equal((await context.request.get(origin+'/site/about')).status(),404);assert.equal((await dashboard()).schedules.history.filter(event=>event.kind==='page-expire').length,1)
 for(const [width,year,thanksgiving] of [[1440,2026,26],[390,2028,23]]){
  await page.setViewportSize({width,height:1000})
  const clean=await (await post('/api/pane/prepare',{site:source})).json()
  assert.equal((await post('/api/pane/publish',{revision:clean.id})).status(),200)
  await page.goto(origin+'/app');await page.getByText('Schedules',{exact:true}).click()
  const controls=page.locator('[data-schedule-settings]')
  await controls.getByLabel('Business time zone',{exact:true}).selectOption('America/Chicago')
  // Finish dates before enabling each banner; all edits remain an autosaved draft.
  await controls.getByLabel('Holiday starts',{exact:true}).fill(`${year}-11-${thanksgiving}T07:00`)
  await controls.getByLabel('Holiday ends',{exact:true}).fill(`${year}-11-${thanksgiving+1}T09:00`)
  const holiday=`Thanksgiving hours: Cedar Street Studio is closed until Friday (${year}).`
  await controls.getByLabel('Holiday banner',{exact:true}).fill(holiday)
  await controls.getByLabel('Promotion starts',{exact:true}).fill(`${year}-10-31T09:00`)
  await controls.getByLabel('Promotion ends',{exact:true}).fill(`${year}-11-0${year===2026?1:5}T09:00`)
  const promotion=`Fall workshop offer ends at 9 AM Central (${year}).`
  await controls.getByLabel('Promotion banner',{exact:true}).fill(promotion)
  await controls.getByLabel('Quarterly review starts',{exact:true}).fill(`${year+1}-01-${thanksgiving}T09:00`)
  await saved()
  await controls.getByLabel('Business time zone',{exact:true}).scrollIntoViewIfNeeded();await capture('schedule-controls',width)
  await controls.getByLabel('Quarterly review starts',{exact:true}).scrollIntoViewIfNeeded();await capture('schedule-review-controls',width)
  // Existing editor guarantees apply to these controls too.
  await controls.getByLabel('Holiday banner',{exact:true}).fill(holiday+' Draft correction');await saved()
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved()
  assert.equal((await dashboard()).draft.site.automations.banners.find(b=>b.id==='holiday').text,holiday)
  await page.reload();await page.getByText('Schedules',{exact:true}).click()
  assert.equal(await page.getByLabel('Holiday banner',{exact:true}).inputValue(),holiday,'Schedule draft survives tab reload')
  const approved=(await dashboard()).draft
  await post('/api/pane/publish',{revision:approved.id})
  const autumnEnd=year===2026?'01':'05'
  await tick(`${year}-10-31T13:59:00Z`);assert.equal((await siteText()).includes(promotion),false)
  await tick(`${year}-10-31T14:00:00Z`);assert.ok((await siteText()).includes(promotion),'Promotion begins at 9 AM CDT')
  await tick(`${year}-11-${autumnEnd}T14:59:00Z`);assert.ok((await siteText()).includes(promotion),'Promotion stays until 9 AM CST after DST')
  await tick(`${year}-11-${autumnEnd}T15:00:00Z`);assert.equal((await siteText()).includes(promotion),false,'Promotion expires at 9 AM CST')
  await tick(`${year}-11-${thanksgiving}T12:59:00Z`);assert.equal((await siteText()).includes(holiday),false)
  await tick(`${year}-11-${thanksgiving}T13:00:00Z`)
  await page.goto(origin+'/site');await page.getByRole('complementary',{name:'Announcements'}).getByText(holiday,{exact:true}).waitFor();await capture('thanksgiving-banner',width)
  assert.ok((await context.request.get(origin+'/site/search?q=wood')).status()===200)
  let state=await dashboard();assert.ok(state.schedules.history.some(e=>e.kind==='banner-start'&&e.occurrence===`${year}-11-${thanksgiving}T07:00`))
  const events=state.schedules.history.length
  await tick(`${year}-11-${thanksgiving}T13:00:00Z`);assert.equal((await dashboard()).schedules.history.length,events,'Repeated platform delivery does not duplicate execution')
  await tick(`${year}-11-${thanksgiving+1}T15:00:00Z`);assert.equal((await siteText()).includes(holiday),false)
  await tick(`${year+1}-01-${thanksgiving}T14:59:00Z`);assert.equal((await dashboard()).schedules.reminders.length,0)
  await tick(`${year+1}-01-${thanksgiving}T15:00:00Z`)
  state=await dashboard();assert.ok(state.schedules.reminders.some(r=>r.occurrence===`${year+1}-01-${thanksgiving}T09:00`&&r.pages.length===source.pages.length),'Quarterly stale-page reminder arrives at 9 AM CST')
  await page.goto(origin+'/app/sites');const status=page.getByRole('region',{name:'Schedules and reviews'})
  assert.ok((await status.innerText()).includes(new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(`${year+1}-01-${thanksgiving}T09:00Z`))),'Scheduled wall-clock occurrences use local US date/time labels')
  await status.getByText('Page review reminders',{exact:true}).waitFor();await status.scrollIntoViewIfNeeded();await capture('quarterly-review',width)
  const homeReminder=status.locator('li').filter({has:page.locator('a[href="/app?page=home"]')}).last()
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),homeReminder.getByRole('button',{name:'Mark reviewed',exact:true}).click()])
  assert.equal((await dashboard()).schedules.reminders.some(r=>r.pages.some(p=>p.id==='home')),false,'Mark reviewed durably clears that stale-page reminder')
  // A different, overdue draft cannot alter the approved site or run by itself.
  state=await dashboard()
  const unapproved=structuredClone(state.live.site);unapproved.automations.banners.push({id:'draft-only',text:'Unapproved summer sale',start:`${year+1}-04-${thanksgiving}T08:00`,end:`${year+1}-04-${thanksgiving}T18:00`})
  await post('/api/pane/prepare',{site:unapproved,base:state.draft.id})
  await tick(`${year+1}-04-${thanksgiving}T13:59:00Z`);assert.equal((await dashboard()).schedules.reminders.some(r=>r.occurrence===`${year+1}-04-${thanksgiving}T09:00`),false)
  await tick(`${year+1}-04-${thanksgiving}T14:00:00Z`)
  state=await dashboard();assert.ok(state.schedules.reminders.some(r=>r.occurrence===`${year+1}-04-${thanksgiving}T09:00`),'Recurring reminder preserves 9 AM after spring DST')
  assert.ok(state.schedules.draftDue.length);assert.equal((await siteText()).includes('Unapproved summer sale'),false)
  await page.goto(origin+'/app/sites');await page.getByText('Unapproved schedules are due.',{exact:false}).waitFor();await page.getByRole('region',{name:'Schedules and reviews'}).scrollIntoViewIfNeeded();await capture('unapproved-schedule',width)
  assert.equal((await context.request.post(origin+'/api/pane/review',{headers:{Origin:'https://elsewhere.invalid'},data:{page:'home'}})).status(),403)
 }
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  const clean=await (await post('/api/pane/prepare',{site:source})).json();await post('/api/pane/publish',{revision:clean.id})
  await page.goto(origin+'/app?page=hours');await page.getByText('Schedules',{exact:true}).click()
  await page.getByLabel('Business time zone',{exact:true}).selectOption('America/Denver')
  await page.locator('summary').filter({hasText:/^Business details$/}).click()
  await page.getByLabel('Monday hours',{exact:true}).fill('09:00-17:00')
  await page.getByLabel('Price list',{exact:true}).fill('Consultation | 125.50')
  await page.getByLabel('Business phone',{exact:true}).fill('3035550123')
  await page.getByLabel('Street address',{exact:true}).fill('10 Main Street')
  await page.getByLabel('City',{exact:true}).fill('Denver')
  await page.getByLabel('State or region',{exact:true}).fill('CO')
  await page.getByLabel('Postal code',{exact:true}).fill('80202')
  await page.getByLabel('Country',{exact:true}).fill('United States');await saved()
  await page.getByLabel('Price list',{exact:true}).scrollIntoViewIfNeeded();await capture('business-details-editor',width)
  await page.getByText('Language and formats',{exact:true}).click();await page.getByLabel('Locale',{exact:true}).scrollIntoViewIfNeeded();await capture('us-format-defaults',width)
  let draft=(await dashboard()).draft;await post('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site/hours')
  for(const text of ['America/Denver','9:00 AM','5:00 PM','$125.50','(303) 555-0123','Denver, CO 80202'])assert.ok((await page.locator('.public-content').innerText()).includes(text),text)
  assert.equal(await page.locator('table thead th').first().innerText(),'Su');await capture('denver-us-business-details',width)
  await page.goto(origin+'/app?page=hours');await page.getByText('Language and formats',{exact:true}).click()
  await page.getByLabel('Locale',{exact:true}).selectOption('en-GB')
  await page.getByLabel('Currency',{exact:true}).selectOption('GBP')
  await page.getByLabel('Phone format',{exact:true}).selectOption('international')
  await page.getByLabel('Address format',{exact:true}).selectOption('international')
  await page.getByLabel('Calendar first day',{exact:true}).selectOption('1');await saved()
  await page.getByLabel('Locale',{exact:true}).scrollIntoViewIfNeeded();await capture('changed-format-settings',width)
  draft=(await dashboard()).draft;await post('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site/hours')
  for(const text of ['£125.50','+1 303 555 0123','80202 Denver'])assert.ok((await page.locator('.public-content').innerText()).includes(text),text)
  assert.equal(await page.locator('table thead th').first().innerText(),'Mo');await capture('changed-business-formats',width)
 }
 console.log('Business-local scheduling journey passed: reviewed posts and selected pages publish at Chicago 9 AM, expire locally, retain private work, flag unapproved schedules and record execution; promotion DST, reminders, axe and tooltips; screens at 1440 and 390.')
} catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}
finally {await browser.close();await fixture.stop()}
