import assert from 'node:assert/strict'
import {readFile, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture = await import('../tests/browser-runtime.mjs')
const browser = await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context = await browser.newContext({acceptDownloads:true}), otherContext = await browser.newContext({acceptDownloads:true})
let page = await context.newPage()
const other = await otherContext.newPage(), origin = fixture.origin
const folder = resolve(process.env.PANE_SCREENSHOTS ?? 'test-results/pages')
await mkdir(folder,{recursive:true})
for (const tab of [page,other]) tab.setDefaultTimeout(20000)
const data = async () => (await context.request.get(origin+'/api/pane')).json()
const structure = tab => tab.locator('[name=structure]')
const count = async tab => JSON.parse(await structure(tab).inputValue()).pages.length
const row = (tab, id) => tab.locator(`[data-page-id="${id}"]`)
const saved = tab => tab.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.',undefined,{timeout:20000})
async function capture(name,width) {await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage: !['forty-page-organization','site-revisions','page-search-settings'].includes(name)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} overflow at ${width}`)}
async function openOrganization(tab=page) {await tab.getByText('Pages and folders',{exact:true}).click()}
async function publish() {
 await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).click()])
}
try {
 await fixture.bootstrap(context)
 await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 await page.getByLabel('Site name',{exact:true}).fill(starter.name)
 await page.getByLabel('Description',{exact:true}).fill(starter.description)
 for(const item of starter.pages){const set=page.locator('#start-'+item.slug);await set.getByLabel('Page title',{exact:true}).fill(item.title);await set.getByLabel('Text',{exact:true}).fill(item.body)}
 await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Prepare draft revision',exact:true}).click()])
 await publish()
 await page.setViewportSize({width:1440,height:1000})
 await openOrganization()
 for(const title of ['Business','Guides','Support']) {await page.getByLabel('New folder name',{exact:true}).fill(title);await page.getByRole('button',{name:'Add folder',exact:true}).click()}
 const titles=Array.from({length:35},(_,index)=>index===34?'Find your workshop':`Cabinet care ${index+1}`)
 for(const title of titles) {await page.getByLabel('New page title',{exact:true}).fill(title);await page.getByRole('button',{name:'Add page',exact:true}).click()}
 await saved(page);assert.equal(await count(page),40)
 // Page creation participates in the same five-step undo/redo as body edits.
 for(let step=1;step<=5;step++){await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await count(page),40-step);await saved(page)}
 for(let step=1;step<=5;step++){await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await count(page),35+step);await saved(page)}
 const all=JSON.parse(await structure(page).inputValue()).pages
 for(const [index,item] of all.entries()) await row(page,item.id).getByLabel('Folder',{exact:true}).fill(['Business','Guides','Support'][index%3])
 const chosen=all.find(item=>item.slug==='cabinet-care-1'),missing=all.find(item=>item.slug==='find-your-workshop')
 await page.getByLabel('Home page',{exact:true}).selectOption(chosen.id)
 await page.getByLabel('Not-found page',{exact:true}).selectOption(missing.id)
 await row(page,missing.id).getByLabel('Hidden from menus',{exact:true}).check()
 await row(page,chosen.id).getByRole('button',{name:/Move .* up/}).click();await saved(page)
 const durable=JSON.parse(await structure(page).inputValue())
 await page.close();page=await context.newPage();page.setDefaultTimeout(20000)
 await page.goto(origin+'/app');await openOrganization()
 assert.deepEqual(JSON.parse(await structure(page).inputValue()),durable,'Closing and reopening keeps the saved structure')
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await capture('forty-page-organization',width)}
 await publish()
 let snapshot=(await data()).live
 assert.equal(snapshot.site.pages.length,40);assert.equal(snapshot.site.folders.length,3)
 for(const item of snapshot.site.pages){const path=item.slug===snapshot.site.home?'/site':'/site/'+item.slug;assert.equal((await context.request.get(origin+path)).status(),200,path)}
 // Edit the not-found page through the same ordinary page/body editor.
 await page.goto(origin+'/app?page='+missing.slug)
 await page.getByLabel('Page title',{exact:true}).fill('Let us find your next project')
 await page.getByLabel('Text',{exact:true}).fill('Search our workshop pages or contact the studio for help.')
 await page.getByText('Search box and links',{exact:true}).click()
 await page.getByLabel('Show a search box',{exact:true}).selectOption('yes')
 await page.getByLabel('Page links',{exact:true}).fill('Contact the studio | /site/contact');await saved(page)
 await page.goto(origin+'/app');await openOrganization()
 const rename=all.filter(item=>['cabinet-care-2','cabinet-care-3'].includes(item.slug)),deleted=all.find(item=>item.slug==='cabinet-care-4')
 for(const item of rename) await row(page,item.id).getByLabel('Address',{exact:true}).fill(item.slug+'-guide')
 await row(page,deleted.id).getByRole('button',{name:/Delete /}).click();await saved(page)
 await page.reload();await page.getByText('Redirects',{exact:true}).click()
 const offers=page.locator('[data-redirect-offer]');assert.equal(await offers.count(),3)
 for(const offer of await offers.all()) {
  const from=await offer.getAttribute('data-redirect-source')
  if(from.endsWith('/cabinet-care-4'))await offer.getByLabel('Redirect target',{exact:true}).fill('/site/contact')
  await offer.getByLabel('Add this redirect?',{exact:true}).selectOption('yes');await saved(page)
 }
 await saved(page)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await capture('reviewed-redirect-offers',width)}
 await publish();snapshot=(await data()).live
 assert.equal(snapshot.site.pages.length,40,'The immutable snapshot retains all 40, including the deleted page')
 assert.equal(snapshot.site.pages.filter(item=>item.deleted).length,1)
 for(const item of snapshot.site.pages.filter(item=>!item.deleted)){const path=item.slug===snapshot.site.home?'/site':'/site/'+item.slug;assert.equal((await context.request.get(origin+path)).status(),200,path)}
 for(const item of [...rename,deleted]) {
  const response=await context.request.get(origin+'/site/'+item.slug,{maxRedirects:0})
  assert.equal(response.status(),301)
  assert.equal(response.headers().location,item.id===deleted.id?'/site/contact':'/site/'+item.slug+'-guide')
 }
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/site');await capture('chosen-home',width)
  const response=await page.goto(origin+'/site/a/previously-unknown-page');assert.equal(response.status(),404)
  assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Let us find your next project')
  assert.equal(await page.getByRole('search').count(),1);assert.equal(await page.getByRole('link',{name:'Contact the studio',exact:true}).getAttribute('href'),'/site/contact')
  await capture('edited-not-found',width)
  await page.goto(origin+'/app/sites');assert.equal(parseInt(await page.locator('.site-tile-status').innerText(),10),39,'Only active pages count as live');await capture('site-revisions',width)
  await page.goto(origin+'/app/search');await capture('page-search-settings',width)
 }
 // A new structural editor must also preserve both writers on conflict.
 await fixture.signIn(other)
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});await other.setViewportSize({width,height:1000})
  await page.goto(origin+'/app');await other.goto(origin+'/app');await openOrganization();await openOrganization(other)
  const ownerFolder='Owner workshop notes '+width,otherFolder='Second editor notes '+width
  await page.getByLabel('New folder name',{exact:true}).fill(ownerFolder);await page.getByRole('button',{name:'Add folder',exact:true}).click();await saved(page)
  await other.getByLabel('New folder name',{exact:true}).fill(otherFolder);await other.getByRole('button',{name:'Add folder',exact:true}).click()
  await other.waitForFunction(()=>document.querySelector('[data-conflict]')?.hidden===false,undefined,{timeout:20000})
  assert.ok((await other.locator('[data-latest]').innerText()).includes(ownerFolder))
  assert.ok(JSON.parse(await structure(other).inputValue()).folders.includes(otherFolder))
  await other.locator('[data-conflict]').scrollIntoViewIfNeeded()
  await other.screenshot({path:resolve(folder,`structure-conflict-${width}.png`),fullPage:false})
  assert.equal(await other.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
  const download=other.waitForEvent('download');await other.getByRole('button',{name:'Download my copy',exact:true}).click()
  const copy=await download,copyPath=resolve(folder,`structural-conflict-copy-${width}.json`);await copy.saveAs(copyPath)
  assert.ok((await readFile(copyPath,'utf8')).includes(otherFolder))
  await other.getByRole('button',{name:'Use latest draft',exact:true}).click();await other.waitForLoadState('domcontentloaded')
  assert.ok(JSON.parse(await structure(other).inputValue()).folders.includes(ownerFolder))
  assert.equal((await data()).live.id,snapshot.id,'Neither structural draft nor conflict resolution publishes')
 }
 // Each starter and duplicate goes through the real autosaving organizer.
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app');await openOrganization()
  const layouts=['landing','service','team','menu','pricing','faq','location']
  for(const layout of layouts){
   await page.getByLabel('Starter layout',{exact:true}).selectOption(layout)
   await page.getByLabel('New page title',{exact:true}).fill(`Starter ${layout} ${width}`)
   await page.getByRole('button',{name:'Add page',exact:true}).click();await saved(page)
  }
  await row(page,'services').getByRole('button',{name:'Duplicate Repairs and commissions',exact:true}).click();await saved(page)
  await page.getByLabel('Starter layout',{exact:true}).scrollIntoViewIfNeeded();await capture('starter-choices',width)
  const draft=(await data()).draft, duplicate=draft.site.pages.filter(item=>item.slug.startsWith('services-copy')).at(-1)
  assert.equal(duplicate.body,draft.site.pages.find(item=>item.slug==='services').body)
  await page.reload();await publish()
  await page.goto(origin+'/site');const styles=await page.locator('.public-site').evaluate(node=>({font:getComputedStyle(node).fontFamily,color:getComputedStyle(node).color}))
  for(const slug of [...layouts.map(layout=>`starter-${layout}-${width}`),duplicate.slug]){
   await page.goto(origin+'/site/'+slug)
   assert.deepEqual(await page.locator('.public-site').evaluate(node=>({font:getComputedStyle(node).fontFamily,color:getComputedStyle(node).color})),styles,'Every starter and duplicate inherits the site font and color')
   if(slug.includes('faq')){await page.locator('.public-content summary').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.public-content details').first().getAttribute('open'),'')}
   await capture(slug,width)
  }
  await page.goto(origin+'/app')
  const account=page.locator('[data-tip="Account and team"]');await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')
  await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture('editor-tooltip',width)
 }
 const socialSite=structuredClone((await data()).draft.site)
 socialSite.socials={instagram:'https://www.instagram.com/synthetic-pane-99/'}
 socialSite.navigation={main:[],footer:[],details:'',headerSocials:true,footerSocials:false}
 const socialDraft=await (await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site:socialSite}})).json()
 await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:socialDraft.id}})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/site')
  if(width===390)await page.locator('.public-menu-mobile > summary').click()
  const profile=page.locator(width===390?'.public-menu-mobile':'.public-menu-desktop').getByRole('link',{name:'Instagram',exact:true})
  await profile.hover();await page.getByRole('tooltip').getByText('Instagram profile',{exact:true}).waitFor();await capture('public-header-tooltip',width)
  await profile.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')
  await page.getByRole('tooltip').getByText('Instagram profile',{exact:true}).waitFor();await capture('public-header-keyboard-tooltip',width)
  await page.goto(origin+'/app?page=services');await page.getByLabel('Text',{exact:true}).fill(`Unfinished service draft ${width}`);await saved(page)
  const before=(await data()).live
  await page.goto(origin+'/app?page=about');await page.getByLabel('Text',{exact:true}).fill(`Reviewed studio update ${width}`);await saved(page);await page.reload()
  await page.getByRole('button',{name:'Send page for review',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('notice'))
  await page.getByText('Needs review',{exact:true}).waitFor();await capture('page-needs-review',width)
  await page.getByRole('button',{name:'Approve this page',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('notice')?.startsWith('Selected page'))
  const after=await data();assert.equal(after.live.site.pages.find(item=>item.slug==='about').body,`Reviewed studio update ${width}`)
  assert.equal(after.live.site.pages.find(item=>item.slug==='services').body,before.site.pages.find(item=>item.slug==='services').body)
  assert.equal(after.draft.site.pages.find(item=>item.slug==='services').body,`Unfinished service draft ${width}`)
  assert.equal(after.approvals[0].revision,after.live.id)
  await page.goto(origin+'/app?page=services');await capture('unpublished-other-page',width)
  await page.goto(origin+'/app/sites');await capture('selective-publication-history',width)
 }
 console.log('Forty-page editor journey passed: three folders, add/order/hide/home, rename/delete 301 offers, all routes and complete snapshot, editable 404, five undo/redo steps and conflict copy/latest at 1440/390.')
} catch(error) {await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});console.error(await page.locator('[data-save-status]').allTextContents());throw error}
finally {await browser.close();await fixture.stop()}
