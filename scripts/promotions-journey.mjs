import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs'),origin=fixture.origin
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
const folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/promotions');await mkdir(folder,{recursive:true})
const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data})
const dashboard=async()=>(await context.request.get(origin+'/api/pane')).json()
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.')
async function capture(name,width){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow');assert.equal(await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&n.querySelector('svg')&&!n.dataset.tip).length),0,name+' tooltip audit');await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})}
const source=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
// Long real page content makes the scroll trigger observable at both viewport widths.
source.pages[0].body=Array.from({length:45},(_,i)=>`Studio news ${i+1}. Visit our studio for workshops, classes and seasonal announcements.`).join('\n\n')
async function fresh(width,{storage=true}={}){
 const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage()
 await p.clock.install({time:new Date('2026-11-01T15:00:00Z')});await p.clock.pauseAt(new Date('2026-11-01T15:00:01Z'))
 if(!storage)await p.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage unavailable')}}))
 return {c,p}
}
try {
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:900})
  const clean=await(await post('/api/pane/prepare',{site:source})).json();await post('/api/pane/publish',{revision:clean.id})
  await page.goto(origin+'/app');await page.getByText('Promotional pop-up',{exact:true}).click()
  const controls=page.locator('[data-promotion-settings]')
  await controls.getByLabel('Promotion message',{exact:true}).fill('Read studio news and contact us to learn more.')
  await controls.getByRole('group',{name:'Show on these pages'}).getByLabel(source.pages[0].title,{exact:true}).selectOption('yes')
  await controls.getByRole('group',{name:'Show on these pages'}).getByLabel(source.pages[1].title,{exact:true}).selectOption('yes')
  await controls.getByLabel('Delay in seconds',{exact:true}).fill('10');await controls.getByLabel('Scroll depth percent',{exact:true}).fill('50')
  await controls.getByLabel('Desktop exit intent',{exact:true}).selectOption('yes')
  await controls.getByLabel('Promotion destination',{exact:true}).fill('/site/contact');await controls.getByLabel('Promotion button label',{exact:true}).fill('Contact the studio')
  await controls.getByLabel('Pop-up starts',{exact:true}).fill('2026-11-01T08:00');await controls.getByLabel('Pop-up ends',{exact:true}).fill('2026-11-16T08:00')
  await controls.getByLabel('Promotion title',{exact:true}).fill('Studio newsletter');await saved()
  await controls.scrollIntoViewIfNeeded();await capture('promotion-settings',width)
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal((await dashboard()).draft.site.promotion,undefined)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved()
  await page.reload();await page.getByText('Promotional pop-up',{exact:true}).click();assert.equal(await page.getByLabel('Promotion title',{exact:true}).inputValue(),'Studio newsletter')
  // Tooltip behavior on the editor's existing icon-only account control.
  const avatar=page.locator('.avatar[data-tip]').first();await avatar.hover();await page.waitForTimeout(100);assert.equal(await page.locator('.pane-tooltip').count(),0);await page.locator('.pane-tooltip').waitFor();await page.keyboard.press('Escape');await page.mouse.move(5,500);await page.keyboard.press('Tab');await avatar.focus();await page.locator('.pane-tooltip').waitFor();await page.keyboard.press('Escape')
  const draft=(await dashboard()).draft
  assert.equal((await(await context.request.get(origin+'/site')).text()).includes('data-promotion='),false)
  assert.equal((await post('/api/pane/publish',{revision:draft.id})).status(),200)
  const {c,p}=await fresh(width)
  await p.goto(origin+'/site');await p.locator('.public-brand').focus();assert.equal(await p.locator('dialog').isVisible(),false)
  await p.clock.runFor(9999);assert.equal(await p.locator('dialog').isVisible(),false,'Delay does not open early')
  await p.clock.runFor(1)
  if(width===390){assert.equal(await p.locator('dialog').isVisible(),false,'Phone arrival stays unobstructed');await p.screenshot({path:resolve(folder,'phone-arrival-390.png')});await p.evaluate(()=>scrollTo(0,innerHeight+5));}
  await p.getByRole('dialog').waitFor()
  assert.ok(await p.getByRole('button',{name:'Close',exact:true}).evaluate(el=>el===document.activeElement))
  await p.keyboard.press('Shift+Tab');assert.ok(await p.locator('dialog a').evaluate(el=>el===document.activeElement),'Reverse Tab stays in dialog')
  await p.keyboard.press('Tab');assert.ok(await p.getByRole('button',{name:'Close',exact:true}).evaluate(el=>el===document.activeElement),'Tab wraps within dialog')
  if(width===390)assert.ok(await p.locator('dialog').evaluate(el=>el.getBoundingClientRect().height<=innerHeight/2+1),'Phone popup is bounded')
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
  await p.screenshot({path:resolve(folder,`promotion-dialog-${width}.png`),fullPage:true})
  await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);assert.ok(await p.locator('.public-brand').evaluate(el=>el===document.activeElement),'Dismissal restores focus')
  await p.goto(origin+'/site/about');await p.clock.runFor(11000);assert.equal(await p.locator('dialog').isVisible(),false,'Same cap applies to the second selected page')
  await p.clock.fastForward(7*86400000-11000);await p.goto(origin+'/site');await p.clock.runFor(10000);if(width===390)await p.evaluate(()=>scrollTo(0,innerHeight+5));await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');await p.clock.setSystemTime(new Date('2026-11-16T14:00:00Z'));await p.reload();await p.clock.runFor(10000);await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));assert.equal(await p.locator('dialog').isVisible(),false,'Expired schedule never reopens')
  await c.close()
  const before=await fresh(width);await before.p.clock.setSystemTime(new Date('2026-11-01T13:59:40Z'));await before.p.goto(origin+'/site');await before.p.clock.runFor(10000);await before.p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));assert.equal(await before.p.locator('dialog').isVisible(),false,'Schedule does not open early');await before.p.clock.runFor(10000);await before.p.getByRole('dialog').waitFor();await before.p.clock.fastForward(15*86400000);assert.equal(await before.p.locator('dialog').isVisible(),false,'Schedule closes an open dialog at expiry');await before.c.close()
  const scroll=await fresh(width);await scroll.p.goto(origin+'/site');await scroll.p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await scroll.p.getByRole('dialog').waitFor();await scroll.p.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await scroll.p.locator('dialog').isVisible(),false);await scroll.c.close()
  const blocked=await fresh(width,{storage:false});await blocked.p.goto(origin+'/site');await blocked.p.clock.runFor(10000);await blocked.p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));assert.equal(await blocked.p.locator('dialog').isVisible(),false);await blocked.c.close()
  const exit=await fresh(width);await exit.p.goto(origin+'/site/about');await exit.p.evaluate(()=>document.dispatchEvent(new MouseEvent('mouseout',{clientY:0,relatedTarget:null})))
  if(width===1440)await exit.p.getByRole('dialog').waitFor();else assert.equal(await exit.p.locator('dialog').isVisible(),false,'Phone ignores exit intent')
  await exit.c.close()
  const other=await fresh(width);await other.p.goto(origin+'/site/contact');assert.equal(await other.p.locator('[data-promotion]').count(),0);await other.c.close()
 }
 console.log('Promotional popup journey passed at 1440 and 390: owner autosave, undo, targeting, delay, scroll, desktop exit, browser cap, schedule expiry, focus trap, keyboard close, safe phone arrival and tooltips.')
} catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}
finally {await browser.close();await fixture.stop()}
