import assert from 'node:assert/strict'
import {readFile, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const entry = async path => (await readFile(path,'utf8')).match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
const fixtureRuntime=process.env.PANE_BROWSER_FIXTURE?await import('../tests/browser-runtime.mjs'):null
const first = fixtureRuntime?fixtureRuntime.origin:await entry(process.env.PANE_LAUNCH_LOG), second = fixtureRuntime?fixtureRuntime.origin:await entry(process.env.PANE_SECOND_LAUNCH_LOG ?? process.env.PANE_LAUNCH_LOG)
if (!first || !second) throw Error('A native local dev entry is required for each isolated browser context.')
const origin = new URL(first).origin, folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/editing')
await mkdir(folder,{recursive:true})
const browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const a = await browser.newContext(), b = await browser.newContext({acceptDownloads:true})
let page = await a.newPage()
const other = await b.newPage()
for (const tab of [page,other]) tab.setDefaultTimeout(20000)
const text = tab => tab.getByLabel('Text',{exact:true})
async function saved(tab) {await tab.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')}
async function capture(tab,name) {
 const comparison=tab.locator('[data-conflict]:not([hidden])')
 if(await comparison.count())await comparison.scrollIntoViewIfNeeded()
 await tab.screenshot({path:resolve(folder,name+'.png'),fullPage:true})
 assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
}
try {
 if(fixtureRuntime){await fixtureRuntime.signIn(page);await fixtureRuntime.signIn(other)}
 else {await page.goto(first);await page.waitForURL(url=>url.pathname==='/app');await other.goto(second);await other.waitForURL(url=>url.pathname==='/app')}
 for (const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});await other.setViewportSize({width,height:1000})
  await page.goto(origin+'/app?page=services')
  const original=await text(page).inputValue()
  const initialLive=await (await page.request.get(origin+'/site/services')).text()
  const edits=Array.from({length:5},(_,i)=>original+`\n\nEditing step ${width}-${i+1}.`)
  for(const edit of edits){await text(page).fill(edit);await saved(page)}
  // The five-step history is visible behavior; it is not an implementation-state assertion.
  for(let i=4;i>=0;i--){await page.getByRole('button',{name:'Undo',exact:true}).click();const expected=i?edits[i-1]:original;await page.waitForFunction(value=>document.querySelector('#page-text').value===value,expected);assert.equal(await text(page).inputValue(),expected);await saved(page)}
  assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).isEnabled(),false)
  for(const edit of edits){await page.getByRole('button',{name:'Redo',exact:true}).click();await page.waitForFunction(value=>document.querySelector('#page-text').value===value,edit);assert.equal(await text(page).inputValue(),edit);await saved(page)}
  await capture(page,`saved-history-${width}`)
  await page.close();page=await a.newPage();page.setDefaultTimeout(20000);await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/app?page=services')
  assert.equal(await text(page).inputValue(),edits[4],'PAGE-006: closing and reopening keeps the durable draft')
  assert.equal(await (await page.request.get(origin+'/site/services')).text(),initialLive,'Autosaving never publishes')
  await other.goto(origin+'/app?page=services')
  const fromFirst=edits[4]+`\n\nFirst editor ${width}.`, fromSecond=edits[4]+`\n\nSecond editor ${width}.`
  await text(page).fill(fromFirst);await saved(page)
  await text(other).fill(fromSecond)
  await other.waitForFunction(()=>document.querySelector('[data-conflict]')?.hidden===false)
  assert.equal(await text(other).inputValue(),fromSecond,'The losing editor keeps their own text')
  assert.ok((await other.locator('[data-latest]').innerText()).includes(`First editor ${width}.`),'The other saved version is shown for comparison')
  await capture(other,`conflict-${width}`)
  const download=other.waitForEvent('download');await other.getByRole('button',{name:'Download my copy',exact:true}).click()
  const copy=await download, copyPath=resolve(folder,`my-copy-${width}.json`);await copy.saveAs(copyPath)
  assert.equal(JSON.parse(await readFile(copyPath,'utf8'))['page.services.body'],fromSecond,'Download keeps the original conflicting copy')
  const merged=fromFirst+`\n\nSecond editor ${width}.`
  await text(other).fill(merged);await other.getByRole('button',{name:'Save merged draft',exact:true}).click();await saved(other)
  await capture(other,`merged-${width}`)
  await page.reload();assert.equal(await text(page).inputValue(),merged,'Both editors see the approved merge after reopening')
  assert.equal(await (await page.request.get(origin+'/site/services')).text(),initialLive,'Even a merged draft awaits publication')
  // A third change while a conflict is open must cause another conflict, not a blind overwrite.
  await other.goto(origin+'/app?page=services')
  await text(page).fill(merged+`\n\nNewer editor change ${width}.`);await saved(page)
  await text(other).fill(merged+`\n\nOlder editor change ${width}.`)
  await other.waitForFunction(()=>document.querySelector('[data-conflict]')?.hidden===false)
  await text(page).fill(merged+`\n\nNewest change during comparison ${width}.`);await saved(page)
  await other.getByRole('button',{name:'Save merged draft',exact:true}).click()
  await other.waitForFunction(expected=>!document.querySelector('[data-conflict]').hidden&&document.querySelector('[data-latest]').textContent.includes(expected),`Newest change during comparison ${width}.`)
  assert.ok((await text(other).inputValue()).includes(`Older editor change ${width}.`),'A stale comparison cannot discard either editor’s newer work')
  await capture(other,`comparison-refreshed-${width}`)
  await other.getByRole('button',{name:'Use latest draft',exact:true}).click();await other.waitForLoadState('domcontentloaded')
  await other.waitForFunction(expected=>document.querySelector('#page-text')?.value.includes(expected),`Newest change during comparison ${width}.`)
  await capture(other,`latest-selected-${width}`)
 }
 console.log('PAGE-006 browser journey passed at 1440 and 390: autosave, tab reopen, five undo/redo steps, comparison, copy download, merge and latest selection without changing the live site.')
} catch(error) {try{await capture(page,'editing-failure')}catch{};throw error} finally {await browser.close()}
