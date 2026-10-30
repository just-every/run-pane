import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
process.env.PANE_BROWSER_NOW ??= '2030-06-20T12:00:00.000Z'
const fixture = await import('../tests/browser-runtime.mjs')
const ownsFixture = !process.env.PANE_BROWSER_FIXTURE
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/traffic')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}), args: ['--no-sandbox', '--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage(), origin = fixture.origin
const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
const campaigns = ['spring-open-house', 'summer-workshop']
const goals = ['Quote request | form | contact', 'Phone calls | phone']
const visitors = []
async function capture(name) {
 await page.screenshot({path: resolve(folder, name + '.png'), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
const data = async () => (await context.request.get(origin + '/api/pane')).json()
const identitySentinels = ['198.51.100.71', '203.0.113.72', 'synthetic-pane-visit-agent', 'synthetic-pane-private-query', 'synthetic-pane-referrer-path', 'synthetic-pane-referrer-subdomain']
async function emptyBrowserStorage(tab) {
 assert.deepEqual(await tab.context().cookies(), [], 'Public navigation sets no cookie')
 assert.deepEqual(await tab.evaluate(async () => ({
  cookie: document.cookie,
  local: Object.entries(localStorage), session: Object.entries(sessionStorage),
  databases: (await indexedDB.databases()).map(database => database.name),
  caches: await caches.keys(), workers: (await navigator.serviceWorker.getRegistrations()).map(worker => worker.scope),
 })), {cookie: '', local: [], session: [], databases: [], caches: [], workers: []}, 'Public visits retain no browser identity or address')
}
function onlyAggregateWrites(before, after) {
 assert.deepEqual(Object.keys(after), Object.keys(before), 'Visits create no visitor table')
 for (const table of Object.keys(before)) if (!['pane_visits', 'pane_rate_limits'].includes(table)) {
  assert.deepEqual(after[table], before[table], 'Visits leave ' + table + ' unchanged')
 }
 const rateChanges = after.pane_rate_limits.filter(row => !before.pane_rate_limits.some(old => JSON.stringify(old) === JSON.stringify(row)))
 assert.equal(rateChanges.length, 1, 'One shared rate bucket changes')
 assert.match(rateChanges[0].bucket, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:visits$/, 'The rate bucket contains no visitor identifier')
 const prior = before.pane_rate_limits.find(row => row.bucket === rateChanges[0].bucket)
 assert.deepEqual(rateChanges[0], {bucket: rateChanges[0].bucket, count: (prior?.count ?? 0) + 1}, 'Rate storage contains only the shared aggregate')
 const retained = JSON.stringify(after)
 for (const sentinel of identitySentinels) assert.ok(!retained.includes(sentinel), 'Application storage discards ' + sentinel)
}
async function aggregatePrivacyJourney(tab, width, campaign) {
 // Start from the real earlier navigations, so an empty report cannot pass.
 const before = await data(), count = before.visits.find(row => row.path === 'home').count
 assert.ok(count > 0, 'The public counter is already nonempty')
 const storage = await fixture.inspectApplicationStorage()
 // A different client address must merge into the existing coarse aggregate.
 await tab.setExtraHTTPHeaders({'CF-Connecting-IP': '203.0.113.72'})
 const response = tab.waitForResponse(response => new URL(response.url()).pathname === '/site/visit')
 await tab.goto(origin + '/site?utm_campaign=' + campaign.toUpperCase() + '&private=synthetic-pane-private-query', {referer: 'https://synthetic-pane-referrer-subdomain.yelp.com/synthetic-pane-referrer-path?private=synthetic-pane-private-query'})
 const counted = await response
 assert.equal(counted.status(), 204)
 assert.equal(counted.headers()['set-cookie'], undefined)
 assert.deepEqual(counted.request().postDataJSON(), {path: 'home', referrerHost: 'synthetic-pane-referrer-subdomain.yelp.com', campaign, campaignTagged: true, utm_source: '', utm_medium: ''})
 const afterStorage = await fixture.inspectApplicationStorage()
 onlyAggregateWrites(storage, afterStorage)
 const sameAggregate = row => row.path === 'home' && row.referrer === 'yelp.com' && row.campaign === campaign && row.device === (width === 390 ? 'phone' : 'desktop')
 assert.equal(storage.pane_visits.filter(sameAggregate).length, 1, 'Earlier navigation seeded the coarse aggregate')
 const expected = storage.pane_visits.map(row => sameAggregate(row) ? {...row, count: row.count + 1} : row).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
 assert.deepEqual(afterStorage.pane_visits, expected, 'Another address merges into the existing count without a visitor record or per-visitor dimension')
 const after = await data()
 assert.deepEqual(after.visits, before.visits.map(row => row.path === 'home' ? {...row, count: count + 1} : row), 'A published navigation adds exactly one to its page, preserving other counts')
 assert.equal(after.traffic.referrer.find(row => row.label === 'yelp.com').count, before.traffic.referrer.find(row => row.label === 'yelp.com').count + 1, 'Approved coarse attribution survives normalization')
 await emptyBrowserStorage(tab)
 await tab.screenshot({path: resolve(folder, 'aggregate-public-' + width + '.png'), fullPage: true})
 console.log('PROBE VISIT-001 public-' + width + ': published home navigation from count ' + count + ' -> ' + (count + 1) + '; only aggregate and shared rate writes; no identity sentinels or browser storage')
 // The native authenticated preview renders the page but must never send a visit.
 let previewEvents = 0
 const observe = request => { if (new URL(request.url()).pathname.startsWith('/site/visit')) previewEvents++ }
 page.on('request', observe)
 const previewBefore = await fixture.inspectApplicationStorage()
 const preview = await page.goto(origin + '/preview/' + after.live.id + '/home', {waitUntil: 'networkidle'})
 assert.equal(preview.status(), 200)
 assert.equal(await page.locator('.preview-banner').isVisible(), true)
 assert.equal(previewEvents, 0, 'Private preview sends no visit or goal request')
 assert.deepEqual(await fixture.inspectApplicationStorage(), previewBefore, 'Private preview causes no application storage writes')
 await page.screenshot({path: resolve(folder, 'aggregate-preview-' + width + '.png'), fullPage: true})
 page.off('request', observe)
 console.log('PROBE VISIT-001 preview-' + width + ': native private preview -> draft banner, zero visit requests and zero application writes')
 for (const [name, headers] of [['DNT', {DNT: '1'}], ['GPC', {'Sec-GPC': '1'}]]) {
  const privateVisitor = await browser.newContext({viewport: {width, height: 1000}, userAgent: 'Mozilla/5.0 (Macintosh) synthetic-pane-visit-agent', extraHTTPHeaders: {'CF-Connecting-IP': '198.51.100.71', ...headers}})
  visitors.push(privateVisitor)
  await privateVisitor.addInitScript(kind => Object.defineProperty(navigator, kind === 'DNT' ? 'doNotTrack' : 'globalPrivacyControl', {value: kind === 'DNT' ? '1' : true}), name)
  const quiet = await privateVisitor.newPage()
  let requests = 0
  quiet.on('request', request => {if (new URL(request.url()).pathname.startsWith('/site/visit')) requests++})
  const quietBefore = await fixture.inspectApplicationStorage()
  for (let repeat = 0; repeat < 2; repeat++) await quiet.goto(origin + '/site?private=synthetic-pane-private-query', {waitUntil: 'networkidle'})
  assert.equal(requests, 0, name + ' browser sends no visit request on repeated public navigation')
  // The route must also honor the header when a caller bypasses the tracker.
  const refused = await privateVisitor.request.post(origin + '/site/visit', {headers: {Origin: origin}, data: {path: 'home', visitor: 'synthetic-pane-visit-agent', address: '198.51.100.71'}})
  assert.equal(refused.status(), 204)
  assert.equal(refused.headers()['set-cookie'], undefined)
  assert.deepEqual(await fixture.inspectApplicationStorage(), quietBefore, name + ' writes no application row, including rate limits')
  await emptyBrowserStorage(quiet)
  assert.deepEqual((await data()).visits, after.visits, name + ' leaves the nonempty counters unchanged')
  console.log('PROBE VISIT-001 ' + name + '-' + width + ': two published navigations and direct visit POST -> zero requests from tracker, zero application writes, unchanged nonempty counters and empty browser storage')
 }
}
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
  await page.getByLabel('Conversion goals', {exact: true}).fill(goals.join('\n'))
  await page.getByText('Search box and links', {exact: true}).click()
  await page.getByLabel('Page links', {exact: true}).fill('Call us | tel:+13035550100')
  await page.waitForFunction(() => document.querySelector('[data-save-status]').textContent === 'Draft saved. Not published.')
  await page.reload(); await page.getByText('Site name and description', {exact: true}).click()
  assert.equal(await page.getByLabel('Analytics campaign labels', {exact: true}).inputValue(), labels.join('\n'))
  assert.equal(await page.getByLabel('Conversion goals', {exact: true}).inputValue(), goals.join('\n'))
  await capture('traffic-settings-' + width)
  await page.goto(origin + '/app')
  await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])
  const visitor = await browser.newContext({viewport: {width, height: 1000}, extraHTTPHeaders: {'CF-Connecting-IP': '198.51.100.71'}, userAgent: (width === 390 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)') + ' synthetic-pane-visit-agent'})
 await fixture.protect(visitor)
  visitors.push(visitor)
  const tab = await visitor.newPage(), campaign = width === 390 ? campaigns[1] : campaigns[0]
  const examples = [
   {query: '?utm_campaign=' + campaign.toUpperCase(), referer: 'https://www.yelp.com/biz/synthetic-pane-1?private=synthetic-pane-2', domain: 'yelp.com', channel: 'Local and review'},
   {query: '', referer: 'https://chatgpt.com/c/synthetic-pane-3', domain: 'chatgpt.com', channel: 'AI assistants'},
   {query: '?utm_medium=email&utm_source=' + campaign.toUpperCase(), channel: 'Email'},
   {query: '?utm_source=perplexity&utm_medium=social', channel: 'Social'},
   {query: '?utm_campaign=synthetic-pane-6&utm_source=synthetic-pane-7&utm_medium=synthetic-pane-8&utm_term=synthetic-pane-9&utm_content=synthetic-pane-10', channel: 'Other website'},
  ]
  for (const example of examples) {
   const counted = tab.waitForResponse(response => new URL(response.url()).pathname === '/site/visit')
   await tab.goto(origin + '/site' + example.query, {referer: example.referer})
   const response = await counted
   assert.equal(response.status(), 204)
   const sent = response.request().postDataJSON()
   assert.doesNotMatch(JSON.stringify(sent), /synthetic-pane-|utm_term|utm_content/)
   const traffic = (await data()).traffic
   assert.ok(traffic.source.some(row => row.label === example.channel && row.count >= 1))
   if (example.domain) assert.ok(traffic.referrer.some(row => row.label === example.domain && row.count >= 1))
  }
  await aggregatePrivacyJourney(tab, width, campaign)
  // The browser's public request door also refuses IP-literal attribution.
  assert.equal((await visitor.request.post(origin + '/site/visit', {headers: {Origin: origin}, data: {path: 'home', referrerHost: 'https://192.168.1.1/private'}})).status(), 204)
  assert.deepEqual(await visitor.cookies(), [], 'Tagged visits leave the visitor browser without any cookie')
  // Goals: complete the quote form and tap the phone number from tagged landings.
  const quote = await visitor.newPage()
  const landed = quote.waitForResponse(response => new URL(response.url()).pathname === '/site/visit')
  await quote.goto(origin + '/site/contact?utm_campaign=' + campaign.toUpperCase() + '&utm_medium=email')
  await landed
  await quote.getByLabel('Your name').fill('Synthetic Pane'); await quote.getByLabel('Email address').fill('synthetic-pane@example.test'); await quote.getByRole('textbox', {name: 'Message'}).fill('Quote for synthetic-pane-13')
  await Promise.all([quote.waitForURL(url => url.searchParams.has('sent')), quote.getByRole('button', {name: 'Send message'}).click()])
  const call = await visitor.newPage()
  await call.goto(origin + '/site?utm_campaign=' + campaign + '&utm_source=Google', {waitUntil: 'networkidle'})
  await call.evaluate(() => { window.__goals = []; addEventListener('pane:goal', event => window.__goals.push(event.detail.name)); document.addEventListener('click', event => event.target.closest('a[href^="tel:"]')?.href && event.preventDefault()) })
  const counted = call.waitForResponse(response => new URL(response.url()).pathname === '/site/visit/goal')
  await call.getByRole('link', {name: 'Call us'}).click()
  assert.equal((await counted).status(), 204)
  assert.deepEqual(await call.evaluate(() => window.__goals), ['Phone calls'])
  assert.deepEqual(await visitor.cookies(), [], 'Goal visits and conversions leave the visitor browser without any cookie')
  const results = (await data()).goals
  const form = results.find(goal => goal.id === 'quote-request'), phone = results.find(goal => goal.id === 'phone-calls')
  assert.ok(form.conversions >= 1 && form.byCampaign.some(row => row.label === campaign && row.conversions >= 1 && row.visits >= 1), 'quote form counted under its campaign')
  assert.ok(phone.conversions >= 1 && phone.byCampaign.some(row => row.label === campaign && row.conversions >= 1) && phone.bySource.length, 'phone click counted under its campaign')
  assert.ok(form.byPage.some(row => row.label === 'contact' && row.conversions >= 1))
  const dashboard = await data()
  for (const [dimension, label] of [['campaign', campaign], ['campaign', 'Unapproved campaign tag'], ['referrer', 'Unknown'], ['campaignSource', campaign], ['campaignSource', 'Perplexity'], ['medium', 'email'], ['medium', 'social'], ['medium', 'other']]) {
   assert.ok(dashboard.traffic[dimension].some(row => row.label === label && row.count >= 1), dimension + ': ' + label)
  }
  assert.ok(dashboard.traffic.device.some(row => row.label === (width === 390 ? 'phone' : 'desktop') && row.count >= 1))
  await page.goto(origin + '/app/sites')
  const panel = page.locator('[aria-labelledby="traffic-title"]')
  for (const label of ['yelp.com', 'chatgpt.com', 'Local and review', 'AI assistants', 'Email', campaign, 'Unapproved campaign tag']) assert.ok((await panel.innerText()).includes(label), label)
  const goalPanel = page.locator('[aria-labelledby="goals-title"]')
  for (const summary of await goalPanel.locator('summary').all()) await summary.click()
  for (const label of ['Quote request', 'Phone calls', 'Funnel', 'Conversion rate', 'By campaign', campaign]) assert.ok((await goalPanel.innerText()).includes(label), label)
  await goalPanel.scrollIntoViewIfNeeded()
  await capture('goals-dashboard-' + width)
  await page.getByRole('heading', {name: 'Traffic details', exact: true}).scrollIntoViewIfNeeded()
  await capture('traffic-dashboard-' + width)
  await panel.screenshot({path: resolve(folder, 'traffic-panel-' + width + '.png')})
  const privateVisitor = await browser.newContext({viewport: {width, height: 1000}, extraHTTPHeaders: {'Sec-GPC': '1'}})
 await fixture.protect(privateVisitor)
  visitors.push(privateVisitor)
  await privateVisitor.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', {value: true}))
  const privateTab = await privateVisitor.newPage()
  let events = 0
  let goalEvents = 0
  privateTab.on('request', request => { const name = new URL(request.url()).pathname; if (name === '/site/visit') events++; if (name === '/site/visit/goal') goalEvents++ })
  await privateTab.goto(origin + '/site?utm_campaign=' + campaign, {waitUntil: 'networkidle'})
  assert.equal(events, 0)
  await privateTab.evaluate(() => document.addEventListener('click', event => event.target.closest('a[href^="tel:"]') && event.preventDefault()))
  await privateTab.getByRole('link', {name: 'Call us'}).click()
  await privateTab.goto(origin + '/site/contact', {waitUntil: 'networkidle'})
  await privateTab.getByLabel('Your name').fill('Synthetic Pane'); await privateTab.getByLabel('Email address').fill('synthetic-pane@example.test'); await privateTab.getByRole('textbox', {name: 'Message'}).fill('Private quote')
  await Promise.all([privateTab.waitForURL(url => url.searchParams.has('sent')), privateTab.getByRole('button', {name: 'Send message'}).click()])
  assert.equal(goalEvents, 0, 'GPC visitors send no goal request')
  assert.deepEqual((await data()).traffic, dashboard.traffic)
  const gpcGoals = (await data()).goals
  assert.deepEqual(gpcGoals.map(goal => goal.conversions), dashboard.goals.map(goal => goal.conversions), 'GPC visitors add no goal conversion')
 }
 console.log('Traffic browser journey passed: case-insensitive published labels, registrable Yelp and ChatGPT referrers and channels, safe UTM source and medium and unapproved counts, all dashboard dimensions, quote-form and phone-click goals with funnel and campaign counts, nonempty exact visit increments, private-preview and repeated DNT and GPC zero-write exclusions, complete application and public browser storage inspection, an empty cookie jar, and zero GPC visit or goal events at 1440 and 390.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
