import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
page.setDefaultTimeout(20000)
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/schedules');await mkdir(folder,{recursive:true})
const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data})
const dashboard=async()=>(await context.request.get(origin+'/api/pane')).json()
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.',undefined,{timeout:20000})
const siteText=async()=>(await context.request.get(origin+'/site')).text()
async function capture(name,width){await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} overflow at ${width}`)}
async function tick(iso){await fixture.advance(iso)}
try {
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const source=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
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
 console.log('Business-local scheduling journey passed at 1440/390: approved Thanksgiving banner, quarterly stale-page reminders, promotion expiry and recurring DST times, replay fence, owner review and unapproved draft isolation.')
} catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}
finally {await browser.close();await fixture.stop()}
