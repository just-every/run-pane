import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const log=await readFile(process.env.PANE_LAUNCH_LOG,'utf8'),entry=log.match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
if(!entry)throw Error('Launch log has no private RER_OPEN link; rer dev must finish first.')
const origin=new URL(entry).origin,folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/browser')
await mkdir(folder,{recursive:true})
const fixture=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
const browser=await chromium.launch({headless:true})
const context=await browser.newContext(),page=await context.newPage()
async function capture(name) {
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
  assert.equal(overflow,false,`${name} overflows at ${width}`)
 }
}
async function submit(button,path='/app') {await Promise.all([page.waitForURL(url=>url.pathname===path),button.click()])}
try {
 await page.goto(origin+'/signin');await capture('signin')
 try { await page.goto(entry) } catch { throw Error('Private local sign-in navigation failed.') };await page.waitForURL(url=>['/setup','/app'].includes(url.pathname))
 if(new URL(page.url()).pathname==='/setup'){
  await capture('setup');await page.getByRole('checkbox').check();await submit(page.getByRole('button',{name:'Finish setup'}))
 }
 await capture('empty-workspace')
 await page.goto(origin+'/site');await capture('not-published');await page.goto(origin+'/app')
 await page.getByLabel('Site name',{exact:true}).fill(fixture.name)
 await page.getByLabel('Description',{exact:true}).fill(fixture.description)
 await page.getByLabel('Pages JSON',{exact:true}).fill(JSON.stringify(fixture.pages,null,2))
 await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 await capture('prepared-draft')
 const preview=await page.getByRole('link',{name:'Preview draft'}).getAttribute('href')
 const first=(await page.locator('form[action="/app/publish"] input[name="revision"]').getAttribute('value'))
 for(const p of fixture.pages){await page.goto(origin+preview.replace(/\/home$/,'/'+p.slug));await capture('preview-'+p.slug)}
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}));await capture('published-workspace')
 for(const p of fixture.pages){await page.goto(origin+(p.slug==='home'?'/site':'/site/'+p.slug));await capture('live-'+p.slug)}
 await page.getByLabel('Your name',{exact:true}).fill('Avery Cooper')
 await page.getByLabel('Email address',{exact:true}).fill('avery@example.test')
 await page.getByLabel('Message',{exact:true}).fill('Could you cater our studio opening for 24 people next Friday?')
 await Promise.all([page.waitForURL('**/site/contact?sent=1'),page.getByRole('button',{name:'Send message'}).click()]);await capture('contact-sent')
 await page.goto(origin+'/app');await capture('inbox-and-visits')
 if (!await page.getByLabel('Pages JSON',{exact:true}).isVisible()) await page.getByText('Edit site content',{exact:true}).click()
 const changed=structuredClone(fixture.pages);changed[0].body+='\n\nFriday dinner service now runs until 8 PM.'
 await page.getByLabel('Pages JSON',{exact:true}).fill(JSON.stringify(changed,null,2));await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 const nextPreview=await page.getByRole('link',{name:'Preview draft'}).getAttribute('href');await page.goto(origin+nextPreview);await capture('change-preview')
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}))
 await page.goto(origin+'/site');assert.ok((await page.textContent('body')).includes('Friday dinner service'))
 await page.goto(origin+'/app');const restore=page.locator('form[action="/app/rollback"]').filter({has:page.locator(`input[value="${first}"]`)})
 await submit(restore.getByRole('button'));await page.goto(origin+'/site');assert.ok(!(await page.textContent('body')).includes('Friday dinner service'));await capture('rolled-back-site')
 await page.goto(origin+'/app');await page.getByText('Paste an export',{exact:true}).click()
 const imported={...fixture,name:'Riverbend move-in'};await page.getByLabel('Source JSON',{exact:true}).fill(JSON.stringify(imported,null,2))
 await submit(page.getByRole('button',{name:'Check import'}),'/app/import/dry-run');await capture('import-review')
 await submit(page.getByRole('button',{name:'Approve import'}));await capture('import-applied')
 await submit(page.getByRole('button',{name:'Undo import'}));await capture('import-undone')
 await page.getByText('Erase personal data',{exact:true}).click();await submit(page.getByRole('button',{name:'Permanently erase message'}));await capture('message-erased')
 console.log('Browser journey passed: sign-in, setup, five-page prepare/preview/publish, contact, visits, change, rollback, reviewed move-in/undo, erasure at 1440 and 390.')
} finally {await browser.close()}
