import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const ownsFixture = !process.env.PANE_BROWSER_FIXTURE
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/analytics')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage(), origin = fixture.origin
const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
const measurement = 'G-SYNTH12345', vaneAddress = 'https://vane.example.test'
const goals = ['Quote request | form | contact', 'Phone calls | phone']
// Network-edge stand-ins for the two providers' scripts. Each follows its provider's documented contract: Vane's
// script sends nothing under GPC or DNT and reports `vane(name)` events; the Google tag reads dataLayer commands.
const vaneScript = `(()=>{const s=document.currentScript,site=s.dataset.site,base=new URL(s.src).origin
if(navigator.globalPrivacyControl||navigator.doNotTrack==='1')return
const send=(path,body)=>fetch(base+path,{method:'POST',keepalive:true,credentials:'omit',headers:{'Content-Type':'text/plain'},body:JSON.stringify({site,...body})}).catch(()=>{})
send('/api/vane/collect',{path:location.pathname})
window.vane=(name)=>send('/api/vane/custom',{name,path:location.pathname})})()`
const gtagScript = `(()=>{const id=new URL(document.currentScript.src).searchParams.get('id'),consent={},config={}
const ping=(en,extra={})=>navigator.sendBeacon('https://www.google-analytics.com/g/collect?'+new URLSearchParams({v:'2',tid:id,en,gcs:JSON.stringify(consent),...extra}))
const handle=args=>{
 if(args[0]==='consent')Object.assign(consent,args[2])
 else if(args[0]==='config'){Object.assign(config,args[2]);document.cookie='_ga=GA1.1.synthetic-pane-1; path=/';document.cookie='_ga_'+id.slice(2)+'=GS1.1.synthetic-pane-2; path=/';if(!window['ga-disable-'+id])ping('page_view',{signals:String(config.allow_google_signals)})}
 else if(args[0]==='event'&&!window['ga-disable-'+id]){ping(args[1],{goal:args[2]?.goal_name})}}
// Like Google's tag, queued commands reach the network later, so a page that navigates at once loses them.
const later=args=>setTimeout(()=>handle(args),50)
for(const args of window.dataLayer)later(args)
const push=window.dataLayer.push.bind(window.dataLayer);window.dataLayer.push=(...items)=>{items.forEach(later);return push(...items)}})()`
async function capture(target, name, options = {}) {
 await target.screenshot({path: resolve(folder, name + '.png'), ...options})
 assert.equal(await target.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
// Every icon-only control names itself with a tooltip.
const unnamed = target => target.evaluate(() => [...document.querySelectorAll('button, a[href], summary, [role="button"]')].filter(element => element.checkVisibility() && !element.dataset.tip && !([...element.querySelectorAll('.visually-hidden')].reduce((text, hidden) => text.replace(hidden.textContent, ''), element.textContent).trim())).map(element => element.outerHTML.slice(0, 120)))
async function visitorFor(width, {gpc = false, saved} = {}) {
 const visitor = await browser.newContext({viewport: {width, height: 900}, ...(gpc ? {extraHTTPHeaders: {'Sec-GPC': '1'}} : {})})
 await fixture.protect(visitor)
 const hits = {vane: [], google: [], tag: [], loader: 0}
 if (gpc) await visitor.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', {value: true}))
 if (saved) await visitor.addInitScript(choice => localStorage.setItem('pane:consent:analytics', choice), saved)
 await visitor.route(vaneAddress + '/**', route => route.request().url().endsWith('/vane.js')
  ? route.fulfill({contentType: 'text/javascript', body: vaneScript, headers: {'access-control-allow-origin': '*'}})
  : route.fulfill({status: 204, headers: {'access-control-allow-origin': '*'}}))
 await visitor.route('https://www.googletagmanager.com/**', route => route.fulfill({contentType: 'text/javascript', body: gtagScript}))
 await visitor.route('https://www.google-analytics.com/**', route => route.fulfill({status: 204}))
 visitor.on('request', request => {
  const url = new URL(request.url())
  if (url.origin === vaneAddress && url.pathname.startsWith('/api/vane/')) hits.vane.push({...JSON.parse(request.postData() ?? '{}'), door: url.pathname})
  else if (url.hostname === 'www.google-analytics.com') hits.google.push(Object.fromEntries(url.searchParams))
  else if (url.hostname === 'www.googletagmanager.com') hits.tag.push(request.url())
  else if (url.pathname === '/pane-analytics.js') hits.loader++
 })
 return {visitor, hits}
}
const phoneTap = async tab => {
 await tab.evaluate(() => document.addEventListener('click', event => event.target.closest('a[href^="tel:"]') && event.preventDefault()))
 await tab.getByRole('link', {name: 'Call us'}).click()
}
const sendQuote = async tab => {
 await tab.getByLabel('Your name').fill('Synthetic Pane'); await tab.getByLabel('Email address').fill('synthetic-pane@example.test'); await tab.getByRole('textbox', {name: 'Message'}).fill('Quote for synthetic-pane-13')
 await Promise.all([tab.waitForURL(url => url.searchParams.has('sent')), tab.getByRole('button', {name: 'Send message'}).click()])
}
try {
 if (ownsFixture) {
  await fixture.bootstrap(context)
  await page.goto(origin + '/setup'); await page.getByRole('checkbox').check()
  await Promise.all([page.waitForURL('**/app'), page.getByRole('button', {name: 'Finish setup'}).click()])
  const prepared = await context.request.post(origin + '/api/pane/prepare', {headers: {Origin: origin}, data: {site: {...site, socials: {yelp: 'https://www.yelp.com/biz/synthetic-pane-1'}, navigation: {headerSocials: false, footerSocials: true}}}})
  assert.equal(prepared.status(), 200, await prepared.text())
  await context.request.post(origin + '/api/pane/publish', {headers: {Origin: origin}, data: {revision: (await prepared.json()).id}})
 } else await fixture.signIn(page)
 for (const width of [1440, 390]) {
  const siteId = 'synthetic-pane-' + width
  await page.setViewportSize({width, height: 1000})
  await page.goto(origin + '/app?page=home')
  await page.getByText('Site name and description', {exact: true}).click()
  await page.getByLabel('Vane address', {exact: true}).fill(vaneAddress)
  await page.getByLabel('Vane site ID', {exact: true}).fill(siteId)
  await page.getByLabel('Google Analytics 4 measurement ID', {exact: true}).fill(measurement.toLowerCase())
  await page.getByLabel('Conversion goals', {exact: true}).fill(goals.join('\n'))
  await page.getByText('Search box and links', {exact: true}).click()
  await page.getByLabel('Page links', {exact: true}).fill('Call us | tel:+13035550100')
  await page.waitForFunction(() => document.querySelector('[data-save-status]').textContent === 'Draft saved. Not published.')
  await page.reload(); await page.getByText('Site name and description', {exact: true}).click()
  assert.equal(await page.getByLabel('Vane address', {exact: true}).inputValue(), vaneAddress)
  assert.equal(await page.getByLabel('Vane site ID', {exact: true}).inputValue(), siteId)
  assert.equal(await page.getByLabel('Google Analytics 4 measurement ID', {exact: true}).inputValue(), measurement)
  await page.getByLabel('Google Analytics 4 measurement ID', {exact: true}).scrollIntoViewIfNeeded()
  await capture(page, 'analytics-settings-' + width)
  assert.deepEqual(await unnamed(page), [], 'Every icon-only workspace control has a tooltip')
  // The account avatar names itself after about 300 ms of hover and at once on keyboard focus.
  const avatar = page.locator('.avatar[data-tip]').first()
  await avatar.hover()
  assert.equal(await page.locator('.pane-tooltip').count(), 0, 'No tooltip before the hover delay')
  await page.waitForSelector('.pane-tooltip', {timeout: 1500})
  assert.equal(await page.locator('.pane-tooltip').innerText(), 'Account and team')
  await page.mouse.move(5, 500); await page.waitForSelector('.pane-tooltip', {state: 'detached'})
  await page.goto(origin + '/app')
  await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])

  // Consent flow: Vane is cookie-free and reports at once; Google loads only after the visitor allows it.
  const {visitor, hits} = await visitorFor(width)
  const tab = await visitor.newPage()
  await tab.goto(origin + '/site', {waitUntil: 'networkidle'})
  assert.ok(hits.vane.some(hit => hit.door === '/api/vane/collect' && hit.site === siteId), 'Vane receives the page view with the connected site ID')
  const banner = tab.locator('[data-analytics-consent]')
  await banner.waitFor({state: 'visible'})
  assert.deepEqual([hits.google.length, hits.tag.length], [0, 0], 'No Google request before the visitor chooses')
  await capture(tab, 'analytics-consent-' + width)
  assert.deepEqual(await unnamed(tab), [], 'Every icon-only public control has a tooltip')
  const social = tab.getByRole('link', {name: 'Yelp'})
  for (let step = 0; step < 40 && await tab.evaluate(() => document.activeElement?.dataset.tip !== 'Yelp'); step++) await tab.keyboard.press('Tab')
  assert.equal(await tab.locator('.pane-tooltip').innerText(), 'Yelp', 'The tooltip shows at once on keyboard focus')
  assert.equal(await social.getAttribute('data-tip'), 'Yelp')
  await tab.keyboard.press('Escape')
  await tab.getByRole('button', {name: 'No thanks'}).click()
  await tab.reload({waitUntil: 'networkidle'})
  assert.equal(await banner.getAttribute('data-choice'), 'deny', 'The refusal is remembered')
  assert.deepEqual([hits.google.length, hits.tag.length], [0, 0], 'A refusal keeps Google off across loads')
  await tab.getByRole('button', {name: 'Allow analytics'}).click()
  await tab.waitForFunction(() => document.querySelector('[data-analytics-status]').textContent.includes('is on'))
  await tab.waitForTimeout(300)
  assert.deepEqual(hits.tag, ['https://www.googletagmanager.com/gtag/js?id=' + measurement])
  const view = hits.google.find(hit => hit.en === 'page_view')
  assert.ok(view && view.tid === measurement, 'Allowing sends the page view to the connected measurement ID')
  assert.deepEqual(JSON.parse(view.gcs), {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}, 'Only analytics storage is granted')
  assert.equal(view.signals, 'false')
  await tab.reload({waitUntil: 'networkidle'})
  assert.equal(hits.google.filter(hit => hit.en === 'page_view').length, 2, 'An allowed choice is remembered')
  await phoneTap(tab)
  await tab.waitForTimeout(300)
  assert.ok(hits.google.some(hit => hit.en === 'phone_calls' && hit.goal === 'Phone calls'), 'The phone-click goal reaches Google')
  assert.ok(hits.vane.some(hit => hit.door === '/api/vane/custom' && hit.name === 'Phone calls' && hit.site === siteId), 'The phone-click goal reaches Vane')
  const quote = await visitor.newPage()
  await quote.goto(origin + '/site/contact', {waitUntil: 'networkidle'})
  await sendQuote(quote)
  await quote.waitForTimeout(300)
  assert.equal(new URL(quote.url()).search, '', 'The thank-you marker is dropped once the Google goal is sent')
  assert.ok(hits.google.some(hit => hit.en === 'quote_request' && hit.goal === 'Quote request'), 'The form goal reaches Google')
  assert.ok(hits.vane.some(hit => hit.door === '/api/vane/custom' && hit.name === 'Quote request'), 'The form goal reaches Vane')
  assert.equal(hits.vane.filter(hit=>hit.door==='/api/vane/custom'&&hit.name==='Quote request').length,1,'Verification and the accepted submit produce one Vane form goal')
  const quotes = () => hits.google.filter(hit => hit.en === 'quote_request').length
  assert.equal(quotes(), 1)
  await quote.reload({waitUntil: 'networkidle'}); await quote.waitForTimeout(300)
  assert.equal(quotes(), 1, 'Reloading the thank-you page does not repeat the goal')
  assert.ok((await visitor.cookies()).some(cookie => cookie.name === '_ga'), 'The allowed tag set its analytics cookie')
  await tab.getByRole('button', {name: 'No thanks'}).click()
  assert.deepEqual((await visitor.cookies()).filter(cookie => cookie.name.startsWith('_ga')), [], 'Withdrawing consent clears the analytics cookies')
  const after = hits.google.length, vaneAfter = hits.vane.length
  await phoneTap(tab); await tab.waitForTimeout(300)
  assert.equal(hits.google.length, after, 'No Google event after withdrawal')
  assert.equal(hits.vane.length, vaneAfter + 1, 'Vane keeps counting cookie-free goals')
  await capture(tab, 'analytics-withdrawn-' + width)
  await visitor.close()

  // GPC (even with an allow choice saved earlier): no Vane, Google, banner or loader at all.
  for (const saved of [undefined, 'allow']) {
   const {visitor: private_, hits: none} = await visitorFor(width, {gpc: true, saved})
   const quiet = await private_.newPage()
   await quiet.goto(origin + '/site', {waitUntil: 'networkidle'})
   assert.equal(await quiet.locator('[data-analytics-consent], script[src*="vane"]').count(), 0)
   await phoneTap(quiet)
   await quiet.goto(origin + '/site/contact', {waitUntil: 'networkidle'}); await sendQuote(quiet); await quiet.waitForTimeout(300)
   assert.deepEqual([none.vane.length, none.google.length, none.tag.length, none.loader], [0, 0, 0, 0], 'GPC visitors load and send nothing third-party (saved: ' + saved + ')')
   assert.deepEqual(await private_.cookies(), [])
   await private_.close()
  }
 }
 console.log('Analytics browser journey passed: published Vane and GA4 connections, Vane page views and goals, zero Google requests before consent or after refusal, consented GA4 page views and goals with advertising storage denied, cookie clearing on withdrawal, zero third-party requests under GPC, and tooltips on icon-only controls at 1440 and 390.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
