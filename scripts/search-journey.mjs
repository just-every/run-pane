import assert from 'node:assert/strict'
import {readFile, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const log = await readFile(process.env.PANE_LAUNCH_LOG, 'utf8'), entry = log.match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
if (!entry) throw Error('Launch a local Pane installation first.')
const origin = new URL(entry).origin, folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/search')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage()
async function capture(name) {
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  await page.screenshot({path: resolve(folder, `${name}-${width}.png`), fullPage: true})
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, `${name} overflow at ${width}`)
 }
}
async function submit(name, path) {
 const [response] = await Promise.all([page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).origin === origin), page.getByRole('button', {name, exact: true}).click()])
 assert.equal(response.status(), 303, await response.text())
 await page.waitForURL(url => url.pathname === path)
 await page.waitForLoadState('domcontentloaded')
}
try {
 await page.goto(entry)
 await page.waitForURL(url => ['/setup', '/app'].includes(url.pathname))
 if (new URL(page.url()).pathname === '/setup') {await page.getByRole('checkbox').check(); await submit('Finish setup', '/app')}
 const fixture = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
 if (await page.getByLabel('Site name', {exact: true}).isVisible()) {
  await page.getByLabel('Site name', {exact: true}).fill(fixture.name)
  await page.getByLabel('Description', {exact: true}).fill(fixture.description)
  for (const p of fixture.pages) {const field = page.locator('#start-' + p.slug); await field.getByLabel('Page title').fill(p.title); await field.getByLabel('Text').fill(p.body)}
  await submit('Prepare draft revision', '/app')
 }
 await page.goto(origin + '/app/sites'); await capture('sites-before')
 await page.getByRole('link', {name: 'Search settings', exact: true}).click(); await capture('settings-defaults')
 const serviceTitle = fixture.pages.find(p => p.slug === 'services').title, hoursTitle = fixture.pages.find(p => p.slug === 'hours').title
 await page.getByLabel('Search title for ' + serviceTitle, {exact: true}).fill('Riverbend catering & private events')
 await page.getByLabel('Search description for ' + serviceTitle, {exact: true}).fill('Fresh pastries and neighborhood catering for your team.')
 await page.getByLabel('Canonical URL for ' + serviceTitle, {exact: true}).fill('https://riverbend.example/catering')
 await page.getByLabel('Keep ' + hoursTitle + ' out of search results', {exact: true}).check()
 await page.getByLabel('robots.txt', {exact: true}).fill('User-agent: *\nDisallow: /site/hours\n')
 await capture('settings-edited')
 await submit('Prepare search draft', '/app/search'); await capture('settings-saved')
 const preview = page.locator(`[aria-label="Search preview for ${serviceTitle}"]`)
 assert.equal(await preview.getByRole('heading').innerText(), 'Riverbend catering & private events', 'SEO-001: saved search preview')
 await page.getByRole('link', {name: 'Back to Sites'}).click(); await capture('sites-search-draft')
 await submit('Approve & publish', '/app/sites'); await capture('sites-published')
 await page.goto(origin + '/site/services'); await capture('published-services')
 assert.equal(await page.title(), 'Riverbend catering & private events', 'SEO-001: published title')
 assert.equal(await page.locator('meta[name=description]').getAttribute('content'), 'Fresh pastries and neighborhood catering for your team.')
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://riverbend.example/catering', 'SEO-004: canonical')
 await page.goto(origin + '/site/hours'); await capture('published-noindex')
 assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/, 'SEO-004: noindex')
 const sitemap = await (await page.request.get(origin + '/sitemap.xml')).text()
 assert.match(sitemap, /\/site\/services/); assert.doesNotMatch(sitemap, /\/site\/hours/, 'SEO-003: exclude noindex')
 assert.match(await (await page.request.get(origin + '/robots.txt')).text(), /Disallow: \/site\/hours/, 'SEO-003: published robots')
 console.log('SEO-001/003/004 browser path passed at 1440 and 390: Sites, saved search preview, publication, canonical/noindex, sitemap and robots.')
} finally {await browser.close()}
