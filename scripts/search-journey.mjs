import assert from 'node:assert/strict'
import {readFile, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixtureRuntime = process.env.PANE_BROWSER_FIXTURE ? await import('../tests/browser-runtime.mjs') : null
const log = fixtureRuntime ? '' : await readFile(process.env.PANE_LAUNCH_LOG, 'utf8'), entry = fixtureRuntime ? fixtureRuntime.origin + '/app' : log.match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
if (!entry) throw Error('Launch a local Pane installation first.')
const origin = new URL(entry).origin, folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/search')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage()
page.setDefaultTimeout(15000)
async function capture(name) {
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({path: resolve(folder, `${name}-${width}.png`), fullPage: true})
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, `${name} overflow at ${width}`)
 }
}
async function submit(name, path) {
 const button = page.getByRole('button', {name, exact: true}).first()
 const action = await button.evaluate(node => node.form.action)
 const [response] = await Promise.all([page.waitForResponse(r => r.request().method() === 'POST' && r.url() === action), button.click()])
 if (response.status() !== 303) throw Error(`Form refused (${response.status()}): ${await response.text().catch(() => 'Response body unavailable after navigation.')}`)
 await page.waitForURL(url => url.pathname === path)
 await page.waitForLoadState('domcontentloaded')
}
try {
 if (fixtureRuntime) await fixtureRuntime.signIn(page)
 else await page.goto(entry)
 await page.waitForURL(url => ['/setup', '/app'].includes(url.pathname))
 if (new URL(page.url()).pathname === '/setup') {await page.getByRole('checkbox').check(); await submit('Finish setup', '/app')}
 const fixture = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
 if (await page.getByLabel('Site name', {exact: true}).isVisible()) {
  await page.getByLabel('Site name', {exact: true}).fill(fixture.name)
  await page.getByLabel('Description', {exact: true}).fill(fixture.description)
  for (const p of fixture.pages) {const field = page.locator('#start-' + p.slug); await field.getByLabel('Page title').fill(p.title); await field.getByLabel('Text').fill(p.body)}
  await submit('Prepare draft revision', '/app')
 }
 // SEO-009: prepare warnings through the authenticated product API, then fix
 // them through the editor. No database seeding or alternative auth path.
 const defaultDraft = await page.request.post(origin + '/api/pane/prepare', {headers: {Origin: origin}, data: {site: fixture}})
 assert.equal(defaultDraft.status(), 200)
 await page.goto(origin + '/app/sites')
 const defaultChecks = page.getByRole('region', {name: 'Search checks', exact: true})
 const defaultFix = defaultChecks.getByRole('link', {name: 'Review search title for ' + fixture.pages.find(p => p.slug === 'home').title, exact: true})
 assert.match(await defaultFix.locator('xpath=ancestor::li[1]').innerText(), /\/site\/about/, 'SEO-009: site-default metadata reports duplicate peers, rather than treating unset overrides as missing')
 const checksSite = {...fixture, description: '', pages: fixture.pages.map(p => ({...p, search: {
  title: p.slug === 'home' ? 'Repair & care' : p.slug === 'about' ? 'ＲＥＰＡＩＲ  &   CARE' : 'Search title for ' + p.slug,
  description: p.slug === 'home' ? 'Repairs  & care' : p.slug === 'about' ? 'REPAIRS & CARE' : p.slug === 'hours' ? '' : 'Description for ' + p.slug,
  noindex: p.slug === 'contact',
 }}))}
 const publishedBefore = await (await page.request.get(origin + '/site')).text()
 const prepared = await page.request.post(origin + '/api/pane/prepare', {headers: {Origin: origin}, data: {site: checksSite}})
 assert.equal(prepared.status(), 200, 'SEO-009: a normal draft can contain search problems')
 await page.goto(origin + '/app/sites')
 const checks = page.getByRole('region', {name: 'Search checks', exact: true})
 const homeTitle = fixture.pages.find(p => p.slug === 'home').title, aboutTitle = fixture.pages.find(p => p.slug === 'about').title, contactTitle = fixture.pages.find(p => p.slug === 'contact').title
 const fixTitle = checks.getByRole('link', {name: 'Review search title for ' + homeTitle, exact: true})
 assert.equal(await fixTitle.count(), 1, 'SEO-009: duplicate effective title is actionable on its page')
 assert.equal(await checks.getByRole('link', {name: 'Review search title for ' + aboutTitle, exact: true}).count(), 1, 'SEO-009: both affected pages are listed after Unicode, whitespace and case normalization')
 assert.equal(await checks.getByRole('link', {name: 'Review search description for ' + homeTitle, exact: true}).count(), 1, 'SEO-009: duplicate descriptions are actionable')
 const missingTitle = fixture.pages.find(p => p.slug === 'hours').title
 assert.equal(await checks.getByRole('link', {name: 'Review search description for ' + missingTitle, exact: true}).count(), 1, 'SEO-009: an empty effective description is actionable')
 assert.equal(await checks.getByRole('link', {name: 'Review indexing for ' + contactTitle, exact: true}).count(), 1, 'SEO-009: excluded page is flagged for review')
 assert.match(await fixTitle.locator('xpath=ancestor::li[1]').innerText(), /\/site\/about/, 'SEO-009: the title warning identifies the duplicate page')
 const descriptionFix = checks.getByRole('link', {name: 'Review search description for ' + homeTitle, exact: true})
 assert.match(await descriptionFix.locator('xpath=ancestor::li[1]').innerText(), /\/site\/about/, 'SEO-009: description comparison folds case and whitespace too')
 const missingFix = checks.getByRole('link', {name: 'Review search description for ' + missingTitle, exact: true})
 assert.match(await missingFix.locator('xpath=ancestor::li[1]').innerText(), /missing/i, 'SEO-009: an empty effective description is distinguished from a duplicate')
 await capture('search-checks-sites')
 await fixTitle.click()
 assert.equal(await page.getByLabel('Search title for ' + homeTitle, {exact: true}).evaluate(el => el.matches(':target')), true, 'SEO-009: the fix link reaches the corresponding control')
 assert.equal(await page.getByLabel('Keep ' + contactTitle + ' out of search results', {exact: true}).isChecked(), true, 'SEO-009: a warning never changes an indexing choice')
 await page.getByRole('region', {name: 'Search checks', exact: true}).getByRole('link', {name: 'Review search description for ' + missingTitle, exact: true}).click()
 assert.equal(await page.getByLabel('Search description for ' + missingTitle, {exact: true}).evaluate(el => el.matches(':target')), true, 'SEO-009: a missing-description link reaches that page’s description')
 await page.getByRole('region', {name: 'Search checks', exact: true}).getByRole('link', {name: 'Review indexing for ' + contactTitle, exact: true}).click()
 assert.equal(await page.getByLabel('Keep ' + contactTitle + ' out of search results', {exact: true}).evaluate(el => el.matches(':target')), true, 'SEO-009: an indexing review link reaches that page’s checkbox')
 await capture('search-checks-editor')
 for (const p of fixture.pages) {
  await page.getByLabel('Search title for ' + p.title, {exact: true}).fill('Chosen title for ' + p.slug)
  await page.getByLabel('Search description for ' + p.title, {exact: true}).fill('Chosen description for ' + p.slug)
 }
 await page.getByLabel('Keep ' + contactTitle + ' out of search results', {exact: true}).uncheck()
 await submit('Prepare search draft', '/app/search')
 assert.equal(await page.getByRole('region', {name: 'Search checks', exact: true}).getByRole('link').count(), 0, 'SEO-009: corrected draft clears the corresponding warnings')
 assert.equal(await (await page.request.get(origin + '/site')).text(), publishedBefore, 'SEO-009: checking and fixing a draft never publishes it')
 await capture('search-checks-fixed')
 await page.goto(origin + '/app/sites')
 assert.equal(await page.getByRole('region', {name: 'Search checks', exact: true}).getByRole('link').count(), 0, 'SEO-009: Sites uses the current draft checks')
 await submit('Approve & publish', '/app')
 await page.goto(origin + '/site')
 assert.equal(await page.locator('meta[name=description]').getAttribute('content'), 'Chosen description for home', 'SEO-009: publication uses the corrected effective metadata')
 await page.goto(origin + '/app/sites'); await capture('sites-before')
 await page.getByRole('link', {name: 'Search settings', exact: true}).click(); await capture('settings-defaults')
 const serviceTitle = fixture.pages.find(p => p.slug === 'services').title, hoursTitle = fixture.pages.find(p => p.slug === 'hours').title
 await page.getByLabel('Search title for ' + serviceTitle, {exact: true}).fill('Furniture repairs & handmade commissions')
 await page.getByLabel('Search description for ' + serviceTitle, {exact: true}).fill('Furniture repairs and custom pieces made in our neighborhood workshop.')
 await page.getByLabel('Canonical URL for ' + serviceTitle, {exact: true}).fill('https://cedar-street.example/workshop')
 await page.getByLabel('Keep ' + hoursTitle + ' out of search results', {exact: true}).check()
 await page.getByLabel('robots.txt', {exact: true}).fill('User-agent: *\nDisallow: /site/hours\n')
 await capture('settings-edited')
 await submit('Prepare search draft', '/app/search'); await capture('settings-saved')
 const preview = page.locator(`[aria-label="Search preview for ${serviceTitle}"]`)
 assert.equal(await preview.getByRole('heading').innerText(), 'Furniture repairs & handmade commissions', 'SEO-001: saved search preview')
 await page.getByRole('link', {name: 'Back to Sites'}).click(); await capture('sites-search-draft')
 await submit('Approve & publish', '/app'); await page.goto(origin + '/app/sites'); await capture('sites-published')
 await page.goto(origin + '/site/services'); await capture('published-services')
 // The local dev entry decorates document titles; the built-Worker test checks the exact production title.
 assert.equal(await page.title(), 'Furniture repairs & handmade commissions' + (fixtureRuntime ? '' : ' Dev'), 'SEO-001: published title under the local Dev entry')
 assert.equal(await page.locator('meta[name=description]').getAttribute('content'), 'Furniture repairs and custom pieces made in our neighborhood workshop.')
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://cedar-street.example/workshop', 'SEO-004: canonical')
 await page.goto(origin + '/site/hours'); await capture('published-noindex')
 assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/, 'SEO-004: noindex')
 const sitemap = await (await page.request.get(origin + '/sitemap.xml')).text()
 assert.match(sitemap, /\/site\/services/); assert.doesNotMatch(sitemap, /\/site\/hours/, 'SEO-003: exclude noindex')
 assert.match(await (await page.request.get(origin + '/robots.txt')).text(), /Disallow: \/site\/hours/, 'SEO-003: published robots')
 console.log('SEO-009 checks/fix links and SEO-001/003/004 browser path passed at 1440 and 390: Sites, saved search preview, publication, canonical/noindex, sitemap and robots.')
} finally {await browser.close()}
