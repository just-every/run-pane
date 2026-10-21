import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const ownsFixture = !process.env.PANE_BROWSER_FIXTURE
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/traffic')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage(), origin = fixture.origin
const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
const campaigns = ['spring-open-house', 'summer-workshop']
const visitors = []
async function capture(name) {
 await page.screenshot({path: resolve(folder, name + '.png'), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
const data = async () => (await context.request.get(origin + '/api/pane')).json()
try {
 if (ownsFixture) {
  await fixture.bootstrap(context)
  await page.goto(origin + '/setup'); await page.getByRole('checkbox').check()
  await Promise.all([page.waitForURL('**/app'), page.getByRole('button', {name: 'Finish setup'}).click()])
  const prepared = await context.request.post(origin + '/api/pane/prepare', {headers: {Origin: origin}, data: {site}})
  assert.equal(prepared.status(), 200)
  await context.request.post(origin + '/api/pane/publish', {headers: {Origin: origin}, data: {revision: (await prepared.json()).id}})
 } else await fixture.signIn(page)
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  await page.goto(origin + '/app?page=home')
  await page.getByText('Site name and description', {exact: true}).click()
  // Change the saved labels on each pass so both viewport flows make a draft.
  const labels = width === 1440 ? campaigns : [...campaigns, 'fall-exhibition']
  await page.getByLabel('Analytics campaign labels', {exact: true}).fill(labels.join('\n'))
  await page.waitForFunction(() => document.querySelector('[data-save-status]').textContent === 'Draft saved. Not published.')
  await page.reload(); await page.getByText('Site name and description', {exact: true}).click()
  assert.equal(await page.getByLabel('Analytics campaign labels', {exact: true}).inputValue(), labels.join('\n'))
  await capture('traffic-settings-' + width)
  await page.goto(origin + '/app')
  await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])
  const visitor = await browser.newContext({viewport: {width, height: 1000}, userAgent: width === 390 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'})
  visitors.push(visitor)
  const tab = await visitor.newPage(), campaign = width === 390 ? campaigns[1] : campaigns[0]
  const counted = tab.waitForResponse(response => new URL(response.url()).pathname === '/site/visit')
  await tab.goto(origin + '/site?utm_campaign=' + campaign, {referer: width === 390 ? 'https://www.facebook.com/' : 'https://www.google.com/search?q=local+workshop'})
  assert.equal((await counted).status(), 204)
  const dashboard = await data()
  assert.ok(dashboard.traffic.campaign.some(row => row.label === campaign && row.count >= 1))
  assert.ok(dashboard.traffic.device.some(row => row.label === (width === 390 ? 'phone' : 'desktop') && row.count >= 1))
  assert.ok(dashboard.traffic.source.some(row => row.label === (width === 390 ? 'Facebook' : 'Google') && row.count >= 1))
  await page.goto(origin + '/app/sites')
  await page.getByRole('heading', {name: 'Traffic details', exact: true}).scrollIntoViewIfNeeded()
  await capture('traffic-dashboard-' + width)
  await page.locator('[aria-labelledby="traffic-title"]').screenshot({path: resolve(folder, 'traffic-panel-' + width + '.png')})
  const privateVisitor = await browser.newContext({viewport: {width, height: 1000}, extraHTTPHeaders: {'Sec-GPC': '1'}})
  visitors.push(privateVisitor)
  await privateVisitor.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', {value: true}))
  const privateTab = await privateVisitor.newPage()
  let events = 0
  privateTab.on('request', request => { if (new URL(request.url()).pathname === '/site/visit') events++ })
  await privateTab.goto(origin + '/site?utm_campaign=' + campaign, {waitUntil: 'networkidle'})
  assert.equal(events, 0)
  assert.deepEqual((await data()).traffic, dashboard.traffic)
 }
 console.log('Traffic browser journey passed: owner-approved labels, real phone and desktop tagged/referrer visits, all dashboard dimensions, and zero GPC events at 1440 and 390.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
