import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
import {invalidatedSchedules} from '../tests/post-schedule-proof.mjs'
process.env.PANE_BROWSER_NOW='2026-10-01T12:00:00Z'
process.env.PANE_LIVE_FIXTURE='1'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/post-schedules');await mkdir(folder,{recursive:true})
page.setDefaultTimeout(20000)
const response=value=>({status:value.status(),json:()=>value.json(),text:()=>value.text(),clone:()=>({text:()=>value.text()})})
const post=async(path,data)=>response(await context.request.post(origin+path,{headers:{Origin:origin},data}))
const get=async path=>response(await context.request.get(origin+path))
async function capture(name,width){await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} overflow at ${width}`)}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 await page.setViewportSize({width:1440,height:1000})
 const scheduled=await invalidatedSchedules({post,get,tick:fixture.advance,expiry:true})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites')
  const region=page.getByRole('region',{name:'Schedules and reviews'})
  await region.getByText('Schedule event history',{exact:true}).click()
  await region.getByText('post publication failed',{exact:true}).waitFor()
  await region.scrollIntoViewIfNeeded();await capture('failed-post-with-successful-expiry',width)
  await page.goto(origin+'/app/posts?id='+scheduled[1].id)
  await page.getByText('Publication schedule',{exact:true}).click()
  await page.getByRole('status').filter({hasText:'Schedule failed'}).waitFor()
  const account=page.locator('[data-tip="Account and team"]')
  await account.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor()
  await page.mouse.move(0,500);await page.keyboard.press('Escape');await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor()
  await page.keyboard.press('Escape');await capture('failed-post-schedule',width)
  await page.goto(origin+'/site/recipes/later-safe');await page.getByRole('heading',{name:'later-safe',exact:true}).waitFor();await capture('later-safe-publication',width)
 }
 console.log('Invalidated post schedule journey passed: failed approval visible, unrelated publication live, expired post absent, durable state matches execution history; screens at 1440 and 390.')
}catch(error){await page.screenshot({path:resolve(folder,'failure-post-schedules.png'),fullPage:true});throw error}
finally{await browser.close();await fixture.stop()}
