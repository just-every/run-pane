import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/access')
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
try {
 await fixture.bootstrap(context)
 await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const prepared=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}})
 assert.equal(prepared.status(),200)
 const revision=(await prepared.json()).id
 assert.equal((await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision}})).status(),200)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites')
  const log=page.locator('[aria-labelledby="activity-title"]')
  await log.scrollIntoViewIfNeeded();await log.getByRole('heading',{name:'Activity log'}).waitFor()
  assert.match(await log.innerText(),/edit/);assert.match(await log.innerText(),/publish/)
  const download=page.waitForEvent('download');await log.getByRole('link',{name:'Export activity'}).click()
  const exported=await download;assert.equal(exported.suggestedFilename(),'pane-activity.json')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Activity screen overflow '+width)
  await page.screenshot({path:resolve(folder,'activity-'+width+'.png'),fullPage:true})
 }
 console.log('Access browser journey passed: owner activity, chronological edit/publication metadata and JSON export at 1440 and 390.')
}finally{await browser.close();await fixture.stop()}
