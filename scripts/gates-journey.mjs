import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const owner=await browser.newContext(),visitor=await browser.newContext(),member=await browser.newContext()
const page=await owner.newPage(),live=await visitor.newPage(),memberPage=await member.newPage(),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/gates');await mkdir(folder,{recursive:true})
const request=async(path,data)=>{const response=await owner.request.post(origin+path,{headers:{Origin:origin},data});assert.ok(response.ok(),await response.text());return response.json()}
const capture=async(tab,name,width)=>{assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow');await tab.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})}
async function save(){await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Save access draft',exact:true}).click()]);const data=await (await owner.request.get(origin+'/api/pane')).json();await request('/api/pane/publish',{revision:data.draft.id});return data.draft}
try{
 await fixture.bootstrap(owner);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click();await page.waitForURL('**/app')
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'));site.folders=['Private','Members'];site.pages[1].folder='Private';site.pages[2].folder='Members'
 const draft=await request('/api/pane/prepare',{site});await request('/api/pane/publish',{revision:draft.id})
 const invitation=await fixture.invitePerson(owner,{email:'synthetic-pane-51@example.test',displayName:'Site reader',roles:[]})
 await memberPage.goto(invitation);await memberPage.getByRole('button',{name:/Confirm/}).click();await memberPage.waitForURL(url=>url.pathname==='/app')
 for(const width of [1440,390]){
  for(const tab of [page,live,memberPage])await tab.setViewportSize({width,height:1000})
  await page.goto(origin+'/app/sites')
  const settings=page.getByRole('region',{name:'Access settings'})
  await settings.locator('details').filter({hasText:'Folder:'}).evaluateAll(nodes=>nodes.forEach(node=>node.open=true));await settings.locator('[name="folder.0.mode"]').selectOption('password');await settings.locator('[name="folder.0.password"]').fill('synthetic-pane-52')
  await settings.locator('[name="folder.1.mode"]').selectOption('members');await settings.getByLabel('Site reader',{exact:true}).check()
  await settings.scrollIntoViewIfNeeded();await capture(page,'access-settings',width);let saved=await save()
  await live.goto(origin+'/site/about');assert.equal(await live.getByRole('heading',{level:1}).innerText(),'This page is protected');await capture(live,'folder-password-gate',width)
  await live.getByLabel('Site password',{exact:true}).fill('wrong');await live.getByRole('button',{name:'Open site',exact:true}).click();await live.getByRole('alert').waitFor();await capture(live,'password-error',width)
  await live.getByLabel('Site password',{exact:true}).fill('synthetic-pane-52');await live.getByRole('button',{name:'Open site',exact:true}).click();await live.getByRole('heading',{name:site.pages[1].title,exact:true}).waitFor();await capture(live,'opened-private-page',width)
  await live.goto(origin+'/site/services');await live.getByRole('link',{name:'Member sign in',exact:true}).waitFor();await capture(live,'member-gate',width)
  await memberPage.goto(origin+'/site/services');await memberPage.getByRole('heading',{name:site.pages[2].title,exact:true}).waitFor();await capture(memberPage,'admitted-member',width)
  await page.goto(origin+'/site/services');await page.getByRole('heading',{name:'Member sign-in required',exact:true}).waitFor();await capture(page,'owner-not-admitted',width)
  const membersBefore=(await (await owner.request.get(origin+'/api/pane')).json()).live.site.access.members
  await page.goto(origin+'/preview/'+saved.id+'/services');await page.getByText('Draft preview',{exact:true}).waitFor();await page.getByRole('heading',{name:site.pages[2].title,exact:true}).waitFor();await capture(page,'owner-member-preview',width)
  assert.deepEqual((await (await owner.request.get(origin+'/api/pane')).json()).live.site.access.members,membersBefore)
  assert.equal((await owner.request.get(origin+'/site/services')).status(),403)
  await page.goto(origin+'/app/sites');await settings.getByLabel('Site reader',{exact:true}).uncheck();await save()
  await memberPage.goto(origin+'/site/services');await memberPage.getByRole('heading',{name:'Member sign-in required',exact:true}).waitFor();await capture(memberPage,'removed-member-refused',width)
  await page.goto(origin+'/app/sites');await settings.getByLabel('Site reader',{exact:true}).check();await save()

  await page.goto(origin+'/app/sites');await settings.getByLabel('Site gate',{exact:true}).selectOption('coming-soon');await settings.getByLabel('Gate title',{exact:true}).fill('Our workshop returns soon');await settings.getByLabel('Gate message',{exact:true}).fill('We are preparing new ideas for your next project.');await settings.getByLabel('New site password',{exact:true}).fill('synthetic-pane-53');saved=await save()
  for(const path of ['/site','/site/unknown','/site/search?q=workshop']){const response=await live.goto(origin+path);assert.match(response.headers()['x-robots-tag'],/noindex/);await live.getByRole('heading',{name:'Our workshop returns soon',exact:true}).waitFor()}
  await capture(live,'coming-soon',width)
  await page.goto(origin+'/preview/'+saved.id+'/home');await page.getByText('Draft preview',{exact:true}).waitFor();await capture(page,'preview-bypasses-gate',width)
  await live.goto(origin+'/site');await live.getByLabel('Site password',{exact:true}).fill('synthetic-pane-53');await live.getByRole('button',{name:'Open site',exact:true}).click();await live.getByRole('heading',{name:site.pages[0].title,exact:true}).waitFor();await capture(live,'site-password-bypass',width)
  await page.goto(origin+'/app/sites');await settings.getByLabel('Site gate',{exact:true}).selectOption('open');await save()
  await visitor.clearCookies();await live.goto(origin+'/site');await live.getByRole('heading',{name:site.pages[0].title,exact:true}).waitFor();await capture(live,'gate-disabled',width)
  await page.goto(origin+'/app/sites');const control=page.locator('[data-tip="Account and team"]');await control.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture(page,'settings-focus-tooltip',width);await control.blur();await control.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture(page,'settings-hover-tooltip',width)
 }
 console.log('Gate browser journey passed at 1440 and 390: settings, passwords, member admission, coming soon, previews, disabling and tooltips.')
}catch(error){console.error('Owner page',new URL(page.url()).pathname,await page.title());await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}finally{await browser.close();await fixture.stop()}
