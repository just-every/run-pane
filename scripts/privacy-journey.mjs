import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const ownsFixture = !process.env.PANE_BROWSER_FIXTURE
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/privacy')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage()
const origin = fixture.origin
const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
site.pages.push({slug:'requests/quote',kind:'contact',title:'Request a quote',body:'Tell us about your project.'})
async function capture(name) {
 await page.screenshot({path: resolve(folder, name + '.png'), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
try {
 if (ownsFixture) {
  await fixture.bootstrap(context)
  await page.goto(origin + '/setup')
  await page.getByRole('checkbox').check()
  await Promise.all([page.waitForURL('**/app'), page.getByRole('button', {name: 'Finish setup'}).click()])
  const prepared = await context.request.post(origin + '/api/pane/prepare', {headers: {Origin: origin}, data: {site}})
  assert.equal(prepared.status(), 200)
  assert.equal((await context.request.post(origin + '/api/pane/publish', {headers: {Origin: origin}, data: {revision: (await prepared.json()).id}})).status(), 200)
 } else await fixture.signIn(page)
 let loads = 0
 await page.addInitScript(() => { addEventListener('message', event => { if (event.data?.privacyProbe) window.privacyProbe = {parentCookie: event.data.privacyProbe, origin: event.origin, api: event.data.api} }) })
 await page.route('https://www.youtube-nocookie.com/**', async route => {
  loads++
  await route.fulfill({contentType: 'text/html', body: `<html><body><h1>Workshop video</h1><script>(async()=>{let result,api;try{void parent.document.cookie;result='exposed'}catch{result='blocked'}try{const r=await fetch('${origin}/api/pane',{credentials:'include'});api=r.status===200?'exposed':'refused'}catch{api='blocked'}parent.postMessage({privacyProbe:result,api},'*')})()</script></body></html>`})
 })
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  await page.goto(origin + '/app?page=home')
  await page.getByText('External embed', {exact: true}).click()
  await page.getByLabel('Embed title', {exact: true}).fill('A look inside our workshop')
  await page.getByLabel('Embed URL', {exact: true}).fill('https://www.youtube-nocookie.com/embed/synthetic-pane-' + width)
  await page.waitForFunction(() => /Draft saved|Draft not saved|Complete the required|Conflict:/.test(document.querySelector('[data-save-status]').textContent))
  assert.equal(await page.locator('[data-save-status]').innerText(),'Draft saved. Not published.',JSON.stringify(await page.locator('input:invalid,textarea:invalid,select:invalid').evaluateAll(nodes=>nodes.map(node=>({name:node.name,message:node.validationMessage})))))
  await page.reload()
  await page.getByText('External embed', {exact: true}).click()
  await capture('embed-editor-' + width)
  const preview = await page.getByRole('link', {name: 'Preview this page'}).getAttribute('href')
  await page.goto(origin + preview)
  assert.equal(await page.locator('iframe').count(), 0)
  assert.match(await page.locator('body').innerText(), /disabled in workspace and draft previews/)
  await capture('embed-preview-' + width)
  await page.goto(origin + '/app')
  await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])
  await page.goto(origin + '/site')
  await page.evaluate(() => localStorage.clear())
  const response = await page.reload()
  assert.match(response.headers()['content-security-policy'], /frame-src https:\/\/www.youtube-nocookie.com/)
  const before = loads
  assert.equal(await page.locator('iframe').count(), 0)
  await capture('embed-consent-' + width)
  assert.equal(loads, before)
  await page.getByRole('button', {name: 'Allow external content'}).click()
  await page.waitForFunction(() => window.privacyProbe?.parentCookie === 'blocked' && window.privacyProbe?.api === 'blocked')
  assert.equal((await page.evaluate(() => window.privacyProbe)).api, 'blocked')
  assert.equal((await page.evaluate(() => window.privacyProbe)).origin, 'null', 'Sandbox has an opaque origin')
  await page.waitForFunction(() => document.querySelector('iframe') !== null)
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts')
  assert.equal(await page.locator('iframe').getAttribute('referrerpolicy'), 'no-referrer')
  await capture('embed-enabled-' + width)
  await page.getByRole('button', {name: 'Keep external content off'}).click()
  assert.equal(await page.locator('iframe').count(), 0)
  await page.reload()
  assert.equal(await page.locator('iframe').count(), 0)
  await page.evaluate(() => localStorage.setItem('pane:embed-consent:https://www.youtube-nocookie.com', 'allow'))
  await context.setExtraHTTPHeaders({'Sec-GPC': '1'})
  await page.reload()
  assert.equal(await page.getByRole('button', {name: 'Allow external content'}).isDisabled(), true)
  assert.equal(await page.locator('iframe').count(), 0)
  await capture('embed-gpc-' + width)
  await context.setExtraHTTPHeaders({})
 }
 // The spam review and the real contact form use the same first-party controls at both widths.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/site/contact')
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic visitor')
  await page.getByLabel('Email address',{exact:true}).fill('synthetic-pane@example.test')
  await page.getByLabel('Message',{exact:true}).fill('A normal verified enquiry')
  await capture('spam-contact-'+width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('sent')),page.getByRole('button',{name:'Send message'}).click()])
  await page.goto(origin+'/site/requests/quote')
  await page.getByLabel('Your name',{exact:true}).fill('Synthetic nested visitor')
  await page.getByLabel('Email address',{exact:true}).fill('synthetic-pane-nested@example.test')
  await page.getByLabel('Message',{exact:true}).fill('A verified nested quote request')
  await capture('spam-nested-form-'+width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('sent')),page.getByRole('button',{name:'Send message'}).click()])
  const refused=await context.request.post(origin+'/site/contact',{headers:{Origin:origin},form:{idempotency:crypto.randomUUID(),name:'Synthetic visitor',email:'synthetic-pane@example.test',message:'Rejected words',website:'synthetic-pane-4'}})
  assert.equal(refused.status(),403)
  await page.goto(origin+'/app/inquiries');await page.getByRole('region',{name:'Spam protection review'}).scrollIntoViewIfNeeded()
  assert.match(await page.getByRole('region',{name:'Spam protection review'}).innerText(),/honeypot/)
  assert.equal(await page.locator('button,a').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&n.querySelector('svg')&&!n.dataset.tip).length),0,'Every icon-only control has a tooltip')
  await capture('spam-review-'+width)
 }
 console.log('Privacy browser journey passed: owner revision approval, page-only CSP, inert previews, consent, GPC, opaque sandbox and API refusal at 1440 and 390.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
