import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixtureRuntime=process.env.PANE_BROWSER_FIXTURE?await import('../tests/browser-runtime.mjs'):null
const log=fixtureRuntime?'':await readFile(process.env.PANE_LAUNCH_LOG,'utf8'),entry=fixtureRuntime?fixtureRuntime.origin+'/setup':log.match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
if(!entry)throw Error('Launch log has no private RER_OPEN link; rer dev must finish first.')
const origin=new URL(entry).origin,folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/browser')
await mkdir(folder,{recursive:true})
const fixture=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
async function capture(name) {
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  if (['installed-lobby','signin','setup','empty-workspace'].includes(name)) {
   await page.evaluate(() => document.fonts.ready)
   const face = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    loaded: [...document.fonts].some(font => font.family.replace(/['"]/g, '') === 'Figtree' && font.status === 'loaded'),
    local: performance.getEntriesByType('resource').some(entry => new URL(entry.name).origin === location.origin && new URL(entry.name).pathname.startsWith('/fonts/figtree/')),
   }))
   assert.match(face.body, /Figtree/, `LOBBY-001: ${name} renders the shared typeface at ${width}`)
   assert.ok(face.loaded && face.local, `LOBBY-001: ${name} loads its self-hosted font at ${width}`)
  }
  await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
  assert.equal(overflow,false,`${name} overflows at ${width}`)
 }
}
async function submit(button,path='/app') {
 const [response]=await Promise.all([page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).origin===origin&&new URL(response.url()).pathname!=='/app/autosave'),button.click()])
 const expected=path==='/app/import/dry-run'?200:303
 if(response.status()!==expected)throw Error(`Form refused (${response.status()}): ${await response.text()}`)
 await page.waitForURL(url=>url.pathname===path)
 await page.waitForLoadState('domcontentloaded')
}
const theme = async () => page.evaluate(() => {
 const root = getComputedStyle(document.documentElement)
 return ['--pn-font', '--pn-tint', '--pn-action'].map(name => root.getPropertyValue(name).trim())
})
try {
 await page.goto(origin+'/');await page.locator('.door').waitFor();await page.evaluate(()=>document.fonts.ready)
 const sharedTheme=await theme();assert.ok(sharedTheme.every(Boolean),'LOBBY-001: Lobby loads shared theme tokens')
 await capture('installed-lobby')
 await page.goto(origin+'/signin');assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: sign-in shares Lobby theme');await capture('signin')
 if(fixtureRuntime)await fixtureRuntime.bootstrap(context)
 try { await page.goto(entry) } catch { throw Error('Private local sign-in navigation failed.') };await page.waitForURL(url=>['/setup','/app'].includes(url.pathname))
 if(new URL(page.url()).pathname==='/setup'){
  assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: setup shares Lobby theme');await capture('setup');await page.getByRole('checkbox').check();await submit(page.getByRole('button',{name:'Finish setup'}))
 }
 assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: workspace shares Lobby theme');assert.equal(await page.locator('a[href="#main"]').count(),1);assert.equal(await page.locator('#main').count(),1);await capture('empty-workspace')
 await page.goto(origin+'/site');await capture('not-published');await page.goto(origin+'/app')
 await page.getByLabel('Site name',{exact:true}).fill(fixture.name)
 await page.getByLabel('Description',{exact:true}).fill(fixture.description)
 for(const p of fixture.pages){const set=page.locator('#start-'+p.slug);await set.getByLabel('Page title').fill(p.title);await set.getByLabel('Text').fill(p.body)}
 await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 await capture('prepared-draft')
 const preview=await page.getByRole('link',{name:'Preview draft'}).getAttribute('href')
 const first=(await page.locator('form[action="/app/publish"] input[name="revision"]').getAttribute('value'))
 const previewFonts=new Map()
 for(const p of fixture.pages){await page.goto(origin+preview.replace(/\/home$/,'/'+p.slug));assert.equal(await page.locator('.preview-banner').count(),1,'PRESENT-001: draft banner');previewFonts.set(p.slug,await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily));await capture('preview-'+p.slug)}
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}));await capture('published-workspace')
 for(const p of fixture.pages){await page.goto(origin+(p.slug==='home'?'/site':'/site/'+p.slug));assert.ok((await page.title()).includes(fixture.name),'PRESENT-001: business title');assert.doesNotMatch(await page.title(),/\bPane\b/);assert.doesNotMatch(await page.locator('body').innerText(),/\bPane\b/);assert.equal(await page.locator('[src*="/brand/"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').count(),0);assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily),previewFonts.get(p.slug),'PRESENT-001: preview typography');await capture('live-'+p.slug)}
 await page.getByLabel('Your name',{exact:true}).fill('Avery Cooper')
 await page.getByLabel('Email address',{exact:true}).fill('avery@example.test')
 await page.getByLabel('Message',{exact:true}).fill('Could you cater our studio opening for 24 people next Friday?')
 await Promise.all([page.waitForURL('**/site/contact?sent=1'),page.getByRole('button',{name:'Send message'}).click()]);await capture('contact-sent')
 await page.goto(origin+'/app/inquiries');await capture('inquiries');await page.goto(origin+'/app/sites');await capture('sites-and-visits')
 await page.goto(origin+'/app');const text=page.getByLabel('Text',{exact:true})
 const changedBody=fixture.pages[0].body+'\n\nFriday dinner service now runs until 8 PM.'
 await text.fill(changedBody);assert.equal(await text.inputValue(),changedBody);await capture('edited-page')
 await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 const nextPreview=await page.getByRole('link',{name:'Preview this page'}).getAttribute('href');await page.goto(origin+nextPreview);await capture('change-preview')
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}))
 await page.goto(origin+'/site');assert.ok((await page.textContent('body')).includes('Friday dinner service'))
 await page.goto(origin+'/app/sites');const restore=page.locator('form[action="/app/rollback"]').filter({has:page.locator(`input[value="${first}"]`)})
 await submit(restore.getByRole('button'),'/app/sites');await page.goto(origin+'/site');assert.ok(!(await page.textContent('body')).includes('Friday dinner service'));await capture('rolled-back-site')
 await page.goto(origin+'/app/moves')
 const imported={...fixture,name:'Riverbend move-in'};await page.getByLabel('Source JSON',{exact:true}).fill(JSON.stringify(imported,null,2))
 await submit(page.getByRole('button',{name:'Check import'}),'/app/import/dry-run');await capture('import-review')
 await submit(page.getByRole('button',{name:'Approve import'}),'/app/moves');await capture('import-applied')
 await submit(page.getByRole('button',{name:'Undo import'}),'/app/moves');await capture('import-undone')
 await page.goto(origin+'/app/inquiries');await page.getByText('Erase personal data',{exact:true}).click();await submit(page.getByRole('button',{name:'Permanently erase message'}),'/app/inquiries');await capture('message-erased')
 console.log('Browser journey passed: sign-in, setup, five-page prepare/preview/publish, contact, visits, change, rollback, reviewed move-in/undo, erasure at 1440 and 390.')
} catch(error) {await capture('journey-failure');throw error} finally {await browser.close()}
