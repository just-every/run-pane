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
const goals = ['Quote request | form | contact', 'Phone calls | phone']
const visitors = []
const analyticsCsv = await readFile('fixtures/imports/squarespace-analytics.csv', 'utf8')
const axeSource = await readFile('node_modules/axe-core/axe.min.js', 'utf8')
const nativeDimensions = ['day', 'source', 'device', 'location', 'campaign', 'referrer', 'medium', 'campaignSource']
const nativeCounts = dashboard => ({visits: dashboard.visits, traffic: Object.fromEntries(nativeDimensions.map(dimension => [dimension, dashboard.traffic[dimension]]))})
const expectedMonths = Array.from({length: 12}, (_, index) => ({label: '2024-' + String(index + 1).padStart(2, '0'), count: (index + 1) * 11}))
const expectedPages = expectedMonths.flatMap((month, index) => [
 {month: month.label, path: '/', count: (index + 1) * 10, source: 'Squarespace'},
 {month: month.label, path: '/contact', count: index + 1, source: 'Squarespace'},
])
const emptyBaseline = {total: 0, month: [], page: []}
const importedBaseline = {total: 858, month: expectedMonths, page: expectedPages}
async function capture(name) {
 await page.screenshot({path: resolve(folder, name + '.png'), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
const data = async () => (await context.request.get(origin + '/api/pane')).json()
const post = async (path, input) => {
 const response = await context.request.post(origin + '/api/pane/' + path, {headers: {Origin: origin}, data: input})
 assert.equal(response.status(), 200, await response.text())
 return response.json()
}
async function tooltip(width) {
 const account = page.locator('.account > summary')
 await page.getByRole('heading', {level: 1}).first().click()
 await account.hover(); await page.waitForTimeout(120)
 assert.equal(await page.getByRole('tooltip').count(), 0, 'Tooltip waits on hover')
 await page.getByRole('tooltip').getByText('Account and team', {exact: true}).waitFor()
 await page.mouse.move(0, 0); await page.keyboard.press('Escape'); await account.focus()
 await page.getByRole('tooltip').getByText('Account and team', {exact: true}).waitFor({timeout: 1000})
 await capture('traffic-import-tooltip-' + width)
 await page.keyboard.press('Escape')
 assert.equal(await page.getByRole('tooltip').count(), 0)
}
async function importedTrafficJourney(width) {
 await page.setViewportSize({width, height: 1000})
 // A distinct upload lets the second viewport create a fresh job after undo.
 const source = analyticsCsv + (width === 390 ? '\n' : '')
 const before = await data(), native = nativeCounts(before)
 assert.deepEqual(before.traffic.imported, emptyBaseline)
 await page.goto(origin + '/app/moves')
 await page.locator('textarea[name="source"]').fill(source)
 await Promise.all([page.waitForURL('**/app/import/dry-run'), page.getByRole('button', {name: 'Check import', exact: true}).click()])
 const preflight = await data()
 assert.deepEqual(preflight.traffic.imported, emptyBaseline, 'CSV preflight writes no imported visits')
 assert.deepEqual(nativeCounts(preflight), native, 'CSV preflight preserves native visits')
 await capture('traffic-import-preflight-' + width)
 await Promise.all([page.waitForURL(url => url.pathname === '/app/moves'), page.getByRole('button', {name: 'Approve import', exact: true}).click()])
 const applied = await data(), job = applied.imports.find(job => job.state === 'completed' && !before.imports.some(previous => previous.id === job.id))
 assert.ok(job, 'CSV import has a retained completed job')
 assert.deepEqual(applied.traffic.imported, importedBaseline, 'CSV import preserves all 12 monthly totals and 24 source page rows, totalling 858')
 assert.deepEqual(nativeCounts(applied), native, 'Historical CSV counts are separate from native visits')
 await page.goto(origin + '/app/sites')
 await tooltip(width)
 const baseline = page.locator('[aria-labelledby="imported-traffic-title"]')
 assert.equal(await baseline.locator('dl[aria-label="Imported baseline total"] dd').textContent(), '858')
 assert.deepEqual(await baseline.locator('dl[aria-label="Imported monthly totals"] dt').allTextContents(), expectedMonths.map(row => row.label))
 assert.deepEqual(await baseline.locator('dl[aria-label="Imported monthly totals"] dd').allTextContents(), expectedMonths.map(row => String(row.count)))
 assert.deepEqual(await baseline.locator('dl[aria-label="Imported page rows"] dt').allTextContents(), expectedPages.map(row => `${row.month} · ${row.source} · ${row.path}`))
 assert.deepEqual(await baseline.locator('dl[aria-label="Imported page rows"] dd').allTextContents(), expectedPages.map(row => String(row.count)))
 await page.evaluate(axeSource)
 assert.deepEqual(await baseline.evaluate(async node => (await axe.run(node)).violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)}))), [], 'Imported traffic baseline passes axe at ' + width)
 await baseline.scrollIntoViewIfNeeded()
 await capture('traffic-imported-dashboard-' + width)
 await baseline.screenshot({path: resolve(folder, 'traffic-imported-panel-' + width + '.png')})
 const plan = await post('import/dry-run', {source})
 await post('import/apply', {source, fingerprint: plan.fingerprint})
 const reapplied = await data()
 assert.deepEqual(reapplied.traffic.imported, importedBaseline, 'Reapplying the CSV adds no duplicate historical counts')
 assert.deepEqual(nativeCounts(reapplied), native, 'Reapplying the CSV preserves native visits')
 await page.goto(origin + '/app/moves')
 const undo = page.locator('form[action="/app/import/undo"]').filter({has: page.locator(`input[name="job"][value="${job.id}"]`)})
 await Promise.all([page.waitForURL(url => url.pathname === '/app/moves' && url.searchParams.has('notice')), undo.getByRole('button', {name: 'Undo import', exact: true}).click()])
 const undone = await data()
 assert.deepEqual(undone.traffic.imported, emptyBaseline, 'Undo removes the imported baseline')
 assert.deepEqual(nativeCounts(undone), native, 'Undo preserves native visits')
 await page.goto(origin + '/app/sites')
 assert.equal(await page.locator('[aria-labelledby="imported-traffic-title"] dl').count(), 0)
 await page.locator('[aria-labelledby="imported-traffic-title"]').scrollIntoViewIfNeeded()
 await capture('traffic-import-undone-' + width)
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
  const visitor = await browser.newContext({viewport: {width, height: 1000}, userAgent: width === 390 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'})
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
 for (const width of [1440, 390]) await importedTrafficJourney(width)
 console.log('Traffic browser journey passed at 1440 and 390: published labels, safe attribution, dashboard dimensions, form and phone goals, cookie-free visits and GPC; Squarespace CSV preflight and apply, 858 separate imported visits across 12 months and 24 page rows, unchanged native counts, duplicate-free reapply, undo, tooltips, axe and screenshots.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
