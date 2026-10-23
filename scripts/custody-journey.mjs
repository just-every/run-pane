import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/custody');await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),origin=fixture.origin
const business=await browser.newContext(),client=await business.newPage()
async function capture(tab,name){assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow');assert.equal(await tab.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&n.querySelector('svg')&&!n.dataset.tip).length),0,name+' icon tooltip audit');await tab.screenshot({path:resolve(folder,name+'.png'),fullPage:true})}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 await fixture.signIn(page)
 await context.route('https://vane.example.test/**',route=>route.fulfill({contentType:'application/javascript',body:''}))
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 site.analytics={ga4:'G-SYNTH12345',vane:{origin:'https://vane.example.test',site:'synthetic-pane-1'}}
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  const prepared=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}});assert.equal(prepared.status(),200)
  await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:(await prepared.json()).id}})
  await page.goto(origin+'/app/sites');await page.getByRole('region',{name:'Policy starters',exact:true}).scrollIntoViewIfNeeded();await capture(page,'policy-generate-'+width)
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.get('page')==='privacy-policy'),page.getByRole('button',{name:'Generate policy starters',exact:true}).click()])
  const text=page.getByLabel('Text',{exact:true});assert.match(await text.inputValue(),/Google Analytics 4 \(GA4\)/);assert.match(await text.inputValue(),/Vane/)
  await text.fill((await text.inputValue())+'\n\nContact the studio for a privacy request.');await page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.')
  await capture(page,'policy-edit-'+width)
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).click()])
  for(const slug of ['privacy-policy','terms','accessibility']){await page.goto(origin+'/site/'+slug);assert.match(await page.locator('body').innerText(),/Starter for owner review — not legal advice/);await capture(page,'policy-'+slug+'-'+width)}
 }
 const email='synthetic-pane-person@example.test'
 for(let index=0;index<3;index++)assert.equal((await context.request.post(origin+'/site/contact',{headers:{Origin:origin},form:{idempotency:crypto.randomUUID(),name:'Synthetic requester',email,message:'Synthetic personal enquiry '+index,'cf-turnstile-response':'synthetic-pane-3'},maxRedirects:0})).status(),303)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries');await page.getByLabel('Person email',{exact:true}).fill(email)
  await Promise.all([page.waitForURL('**/app/privacy/find'),page.getByRole('button',{name:'Find person data',exact:true}).click()])
  const panel=page.getByRole('region',{name:'Person privacy request',exact:true});await panel.scrollIntoViewIfNeeded();assert.match(await panel.innerText(),/3 enquiries/)
  await capture(page,'privacy-person-found-'+width)
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export person data',exact:true}).click();assert.equal((await download).suggestedFilename(),'pane-person.json')
 }
 await page.getByText('Erase all matched person data',{exact:true}).click();await page.getByRole('checkbox',{name:/I confirm permanent erasure/}).check()
 await capture(page,'privacy-person-confirm-390')
 await Promise.all([page.waitForURL(url=>url.pathname==='/app/inquiries'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Permanently erase person data',exact:true}).click()])
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries');assert.equal(await page.getByRole('heading',{name:'Synthetic requester',exact:true}).count(),0);await capture(page,'privacy-person-erased-'+width)}
 const link=await fixture.invitePerson(context,{email:'synthetic-pane-business@example.test',displayName:'Synthetic business owner',roles:['editor']})
 await client.goto(link);await client.getByRole('button',{name:/Confirm/}).click();await client.waitForURL(url=>url.pathname==='/app')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites')
  const panel=page.getByRole('region',{name:'Site ownership',exact:true})
  // Every ownership control remains reachable while scrolling the report grid.
  for(const control of await panel.locator('select,input:not([type=hidden]),button').all()){
   await control.scrollIntoViewIfNeeded()
   assert.equal(await control.evaluate(node=>{
    const box=node.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2
    const top=document.elementFromPoint(x,y)
    return node===top||node.contains(top)
   }),true,'Ownership control must not be covered at '+width+': '+await control.getAttribute('name'))
  }
  await panel.getByRole('button',{name:'Transfer ownership',exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:resolve(folder,'handover-controls-'+width+'.png'),fullPage:false})
  await capture(page,'handover-confirm-'+width)
  // Existing shared tooltip: delayed hover and immediate focus on this changed screen.
  const avatar=page.locator('.avatar[data-tip]').first();await avatar.hover();await page.waitForTimeout(100);assert.equal(await page.locator('.pane-tooltip').count(),0,'Tooltip waits for the hover delay');await page.locator('.pane-tooltip').waitFor();await page.keyboard.press('Escape');await page.mouse.move(5,500);await avatar.focus();await page.locator('.pane-tooltip').waitFor();assert.equal(await page.locator('.pane-tooltip').innerText(),'Account and team');await page.keyboard.press('Escape')
 }
 const panel=page.getByRole('region',{name:'Site ownership',exact:true})
 await panel.getByLabel('New business owner',{exact:true}).selectOption({label:'Synthetic business owner · synthetic-pane-business@example.test'})
 await panel.getByLabel("Confirm new owner's email",{exact:true}).fill('synthetic-pane-business@example.test')
 await panel.getByRole('checkbox',{name:/I confirm this transfer/}).check()
 await Promise.all([page.waitForURL(url=>url.pathname==='/signin'),panel.getByRole('button',{name:'Transfer ownership',exact:true}).click()])
 await fixture.signIn(client,'synthetic-pane-business@example.test');await fixture.signIn(page)
 for(const width of [1440,390]){
  await client.setViewportSize({width,height:1000});await client.goto(origin+'/app/sites');await client.getByRole('region',{name:'Site ownership',exact:true}).scrollIntoViewIfNeeded();await capture(client,'handover-new-owner-'+width)
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app');assert.equal(await page.getByRole('button',{name:'Approve & publish',exact:true}).count(),0);assert.equal(await page.getByRole('navigation',{name:'Workspace'}).getByRole('link',{name:/Inquiries/}).count(),0);await capture(page,'handover-designer-editor-'+width)
 }
 await client.getByRole('button',{name:'Revoke Browser proof owner',exact:true}).click();await client.waitForURL(url=>url.pathname==='/app/sites'&&url.searchParams.has('notice'))
 assert.equal((await context.request.get(origin+'/api/pane')).status(),401)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app');assert.equal(new URL(page.url()).pathname,'/signin');await capture(page,'handover-revoked-'+width)}
 console.log('Custody browser journey passed: factual labeled policy drafts, owner editing and publication, three-enquiry person lookup, export and erasure, unobstructed native ownership handover, designer editor permissions, immediate revocation and tooltips at 1440 and 390.')
}finally{await business.close();await browser.close();await fixture.stop()}
