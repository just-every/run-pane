import assert from 'node:assert/strict'
import {readFile, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/navigation')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage(), origin = fixture.origin
page.setDefaultTimeout(20000)
const post = (path, data) => context.request.post(origin + path, {headers: {Origin: origin}, data})
const saved = () => page.waitForFunction(() => document.querySelector('[data-save-status]').textContent === 'Draft saved. Not published.', {timeout: 20000})
async function capture(name, width) {
 await page.screenshot({path: resolve(folder, `${name}-${width}.png`), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, `${name} overflow at ${width}`)
}
try {
 await fixture.bootstrap(context)
 await page.goto(origin + '/setup'); await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'), page.getByRole('button', {name: 'Finish setup'}).click()])
 const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
 const prepared = await post('/api/pane/prepare', {site}); assert.equal(prepared.status(), 200)
 await post('/api/pane/publish', {revision: (await prepared.json()).id})
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  await page.goto(origin + '/app?page=about')
  await page.getByText('Page visibility', {exact: true}).click()
  await page.getByLabel('Show in menus', {exact: true}).selectOption('yes'); await saved()
  await page.getByText('Navigation and brand links', {exact: true}).click()
  await page.getByLabel('Main menu', {exact: true}).fill('Visit\n> Our hours | page:hours\n> Hidden about | page:about\nExplore\n> Our services | page:services\nJournal | https://journal.example.test/\nBook | page:contact | button')
  await page.getByLabel('Footer links', {exact: true}).fill('Get in touch | page:contact\nHidden footer | page:about')
  await page.getByLabel('Business details', {exact: true}).fill('24 Cedar Street\nOpen Monday to Friday')
  for (const [name, url] of [['Instagram', 'https://www.instagram.com/cedarworkshop/'], ['Facebook', 'https://www.facebook.com/cedarworkshop/'], ['Yelp', 'https://www.yelp.com/biz/cedar-workshop']]) await page.getByLabel(name + ' profile', {exact: true}).fill(url)
  await page.getByLabel('Social icons in header', {exact: true}).selectOption('yes')
  await page.getByLabel('Social icons in footer', {exact: true}).selectOption('yes'); await saved()
  await capture('navigation-editor', width)
  await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])
  await page.goto(origin + '/site')
  const nav = page.locator(width === 390 ? '.public-menu-mobile' : '.public-menu-desktop')
  if (width === 390) await nav.locator(':scope > summary').click()
  for (const group of ['Visit', 'Explore']) {
   const summary = nav.locator('summary').filter({hasText: group})
   await summary.focus(); await page.keyboard.press('Enter')
   assert.equal(await summary.locator('..').getAttribute('open'), '', `${group} opens by keyboard`)
   await summary.press('Enter'); await summary.click()
   assert.equal(await summary.locator('..').getAttribute('open'), '', `${group} opens by pointer`)
  }
  assert.equal(await page.locator('header a[href="/site/about"], footer a[href="/site/about"]').count(), 0)
  assert.equal(await nav.getByRole('link', {name: 'Journal', exact: true}).getAttribute('href'), 'https://journal.example.test/')
  const book = nav.getByRole('link', {name: 'Book', exact: true}); await book.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/site/contact')
  await page.goto(origin + '/site')
  if (width === 390) await page.locator('.public-menu-mobile > summary').click()
  await capture('navigation-published', width)
  await page.goto(origin + '/site')
  for (const region of ['header', 'footer']) for (const [name, url] of [['Instagram', 'https://www.instagram.com/cedarworkshop/'], ['Facebook', 'https://www.facebook.com/cedarworkshop/'], ['Yelp', 'https://www.yelp.com/biz/cedar-workshop']]) {
   // Observe the actual navigation without depending on provider sign-in or availability.
   await page.route(url, route => route.fulfill({contentType: 'text/html', body: '<h1>Profile network edge</h1>'}))
   if (region === 'header' && width === 390) await page.locator('.public-menu-mobile > summary').click()
   const area = region === 'header' ? page.locator(width === 390 ? '.public-menu-mobile' : '.public-menu-desktop') : page.locator('footer')
   const link = area.getByRole('link', {name, exact: true})
   assert.equal(await link.getAttribute('href'), url)
   await link.focus(); await page.keyboard.press('Enter'); await page.waitForURL(url)
   assert.equal(page.url(), url)
   await page.goto(origin + '/site')
  }
  await page.goto(origin + '/site/search?q=workshop'); await capture('navigation-search', width)
 }
 console.log('Navigation editor and published menus passed at 1440/390: two dropdowns, external link, Book, hidden page, footer, keyboard/pointer and accessible profile destinations.')
} catch (error) {await page.screenshot({path: resolve(folder, 'failure.png'), fullPage: true}); console.error(await page.locator('[data-save-status]').allTextContents()); throw error} finally {await browser.close(); await fixture.stop()}
