import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const ownsFixture = !process.env.PANE_BROWSER_FIXTURE
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/acknowledgment')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
const context = await browser.newContext(), page = await context.newPage(), origin = fixture.origin
const site = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
async function capture(name) {
 await page.screenshot({path: resolve(folder, name + '.png'), fullPage: true})
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, name + ' overflow')
}
async function saved() { await page.waitForFunction(() => document.querySelector('[data-save-status]').textContent === 'Draft saved. Not published.') }
async function publish() {
 await page.goto(origin + '/app')
 await Promise.all([page.waitForURL(url => url.pathname === '/app' && url.searchParams.has('notice')), page.getByRole('button', {name: 'Approve & publish'}).click()])
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
  await page.goto(origin + '/app?page=contact')
  await page.getByText('Acknowledgment email', {exact: true}).click()
  await page.getByLabel('Acknowledgment subject', {exact: true}).fill('Thank you from Cedar Street')
  await page.getByLabel('Acknowledgment wording', {exact: true}).fill('We received your request. Our workshop team will review the details and get in touch.')
  await page.getByLabel('Expected response time', {exact: true}).fill('Within two business days — ' + width + ' proof')
  await page.getByLabel('Send acknowledgment', {exact: true}).selectOption('on')
  await saved(); await page.reload()
  await page.getByText('Acknowledgment email', {exact: true}).click()
  assert.equal(await page.getByLabel('Send acknowledgment', {exact: true}).inputValue(), 'on')
  await capture('acknowledgment-settings-' + width)
  await publish()
  await page.goto(origin + '/site/contact')
  await page.getByLabel('Your name', {exact: true}).fill('Avery Cooper ' + width)
  await page.getByLabel('Email address', {exact: true}).fill('avery@example.test')
  await page.getByLabel('Message', {exact: true}).fill('Could you repair our studio dining table before the open house?')
  await Promise.all([page.waitForURL('**/site/contact?sent=1'), page.getByRole('button', {name: 'Send message'}).click()])
  await capture('acknowledgment-contact-sent-' + width)
  await page.goto(origin + '/app/inquiries')
  const message = page.locator('.message').filter({has: page.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true})})
  assert.match(await message.innerText(), /Suppressed in development or demo/)
  assert.match(await message.innerText(), /studio dining table/)
  await capture('acknowledgment-inquiry-' + width)
  // Ownership and follow-up: the new enquiry waits in the reply queue until it is marked replied.
  const open = page.locator('section[aria-labelledby="queue-open"]'), handled = page.locator('section[aria-labelledby="queue-handled"]')
  assert.match(await message.innerText(), /Reply by/)
  await message.getByLabel('Owner', {exact: true}).selectOption({index: 1})
  await Promise.all([page.waitForURL(url => url.searchParams.has('notice')), message.getByRole('button', {name: 'Save'}).click()])
  assert.match(await open.locator('.message').filter({has: page.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true})}).innerText(), /Owner/)
  await open.locator('.message').filter({has: page.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true})}).getByLabel('Status', {exact: true}).selectOption('replied')
  await Promise.all([page.waitForURL(url => url.searchParams.has('notice')), open.locator('.message').filter({has: page.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true})}).getByRole('button', {name: 'Save'}).click()])
  assert.equal(await open.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true}).count(), 0)
  assert.equal(await handled.getByRole('heading', {name: 'Avery Cooper ' + width, exact: true}).count(), 1)
  await capture('inquiry-follow-up-' + width)
 }
 await page.goto(origin + '/app?page=contact')
 await page.getByText('Acknowledgment email', {exact: true}).click()
 await page.getByLabel('Send acknowledgment', {exact: true}).selectOption('off')
 await saved(); await publish()
 const dashboard = await (await context.request.get(origin + '/api/pane')).json()
 assert.equal(dashboard.live.site.pages.find(page => page.slug === 'contact').acknowledgment, undefined)
 console.log('Acknowledgment browser journey passed: saved wording, explicit enable, owner publication, durable inquiry, honest development suppression, owner assignment, reply queue and disable at 1440 and 390.')
} finally { await browser.close(); if (ownsFixture) await fixture.stop() }
