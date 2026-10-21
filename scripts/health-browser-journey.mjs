import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const fixture = process.env.PANE_HEALTH_ORIGIN ? null : await import('../tests/browser-runtime.mjs')
const origin = process.env.PANE_HEALTH_ORIGIN ?? fixture.origin
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/health')
await mkdir(folder, {recursive: true})
const browser = await chromium.launch({headless: true, args: ['--use-mock-keychain', '--password-store=basic']})
try {
 const page = await browser.newPage()
 for (const width of [1440, 390]) {
  await page.setViewportSize({width, height: 1000})
  for (const [name, path, status] of [['health', '/health', 200], ['unknown-app', '/unknown-installed-path', 404]]) {
   const response = await page.goto(origin + path)
   assert.equal(response.status(), status)
   if (name === 'health') assert.equal(JSON.parse(await page.locator('body').innerText()).ok, true)
   await page.screenshot({path: resolve(folder, `${name}-${width}.png`), fullPage: true})
  }
 }
 console.log('Health and unknown installed path browser journey passed at 1440 and 390.')
} finally { await browser.close(); await fixture?.stop() }
