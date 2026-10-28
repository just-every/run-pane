import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
process.env.PANE_BROWSER_NOW='2030-06-20T12:00:00.000Z'
const axe=await readFile('node_modules/axe-core/axe.min.js','utf8')
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
 site.forms=[{id:'synthetic-pane-consent',name:'Studio enquiry',submit:'Send enquiry',confirmation:'Your enquiry is received.',fields:[
  {key:'name',type:'text',label:'Your name',help:'',placeholder:'',required:true},
  {key:'email',type:'email',label:'Email address',help:'',placeholder:'',required:true},
  {key:'phone',type:'phone',label:'US phone',help:'',placeholder:'',required:false},
  {key:'email_marketing',type:'email-consent',label:'Email me studio news.',help:'You can withdraw your choice.',placeholder:'',required:false},
  {key:'sms_marketing',type:'sms-consent',label:'Text me studio news.',help:'Message and data rates may apply.',placeholder:'',required:false,business:'Cedar Street Studio',frequency:'Up to four messages per month'},
 ]}];site.pages.find(page=>page.slug==='contact').formId=site.forms[0].id
 site.analytics={ga4:'G-SYNTH12345',vane:{origin:'https://vane.example.test',site:'synthetic-pane-1'}}
 const prepared=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}});assert.equal(prepared.status(),200)
 await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:(await prepared.json()).id}})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/app/sites');await page.getByRole('region',{name:'Policy starters',exact:true}).scrollIntoViewIfNeeded();await capture(page,'policy-generate-'+width)
  if(width===1440)await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.get('page')==='privacy-policy'),page.getByRole('button',{name:'Generate policy starters',exact:true}).click()])
  else{
   const before=await (await context.request.get(origin+'/api/pane')).json()
   const refused=await context.request.post(origin+'/api/pane/policies/generate',{headers:{Origin:origin},data:{base:before.draft.id}})
   assert.equal(refused.status(),400,'Generating policy starters never overwrites existing owner content')
   assert.deepEqual(await (await context.request.get(origin+'/api/pane')).json(),before,'Refused policy regeneration leaves every retained revision exact')
   await page.goto(origin+'/app?page=privacy-policy')
  }
  const text=page.getByLabel('Text',{exact:true});assert.match(await text.inputValue(),/Google Analytics 4 \(GA4\)/);assert.match(await text.inputValue(),/Vane/)
  await text.fill((await text.inputValue())+'\n\nContact the studio for a privacy request.');await page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.')
  await capture(page,'policy-edit-'+width)
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).click()])
  for(const slug of ['privacy-policy','terms','accessibility']){await page.goto(origin+'/site/'+slug);assert.match(await page.locator('body').innerText(),/Starter for owner review — not legal advice/);await capture(page,'policy-'+slug+'-'+width)}
 }
 const email=['synthetic-pane-person','example.test'].join('@'),ids=[]
 const schema=(await (await context.request.get(origin+'/site/contact')).text()).match(/name="consent_schema" value="([^"]+)"/)[1]
 const send=async id=>context.request.post(origin+'/site/contact',{headers:{Origin:origin},form:{idempotency:id,name:'Synthetic requester',email,email_marketing:'yes',consent_schema:schema,'cf-turnstile-response':'synthetic-pane-3'},maxRedirects:0})
 for(let index=0;index<3;index++){const id=crypto.randomUUID();ids.push(id);assert.equal((await send(id)).status(),303)}
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries');await page.getByLabel('Person email',{exact:true}).fill(email)
  await Promise.all([page.waitForURL('**/app/privacy/find'),page.getByRole('button',{name:'Find person data',exact:true}).click()])
  const panel=page.getByRole('region',{name:'Person privacy request',exact:true});await panel.scrollIntoViewIfNeeded();assert.match(await panel.innerText(),/3 enquiries/)
  await page.evaluate(axe);assert.deepEqual(await panel.evaluate(async node=>(await axe.run(node)).violations.map(item=>item.id)),[],'Person privacy controls pass axe');await capture(page,'privacy-person-found-'+width)
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export person data',exact:true}).focus();await page.keyboard.press('Enter');const download=await downloadEvent;assert.equal(download.suggestedFilename(),'pane-person.json');const path=resolve(folder,'person-'+width+'.json');await download.saveAs(path)
  const portable=JSON.parse(await readFile(path,'utf8'));assert.equal(portable.marketingConsents.length,3);assert.deepEqual(portable.marketingConsents.map(row=>row.inquiryId).sort(),[...ids].sort())
  for(const consent of portable.marketingConsents){assert.equal(consent.receivedAt,'2030-06-20T12:00:00.000Z');assert.equal(consent.page,'contact');assert.deepEqual(consent.choices.map(choice=>[choice.channel,choice.granted]),[['email',true],['sms',false]]);assert.equal(consent.choices[0].wording,'Email me studio news.\nYou can withdraw your choice.');assert.match(consent.choices[1].wording,/Cedar Street Studio\. Message frequency: Up to four messages per month/)}
 }
 await page.getByText('Erase all matched person data',{exact:true}).click();await page.getByRole('checkbox',{name:/I confirm permanent erasure/}).check()
 await capture(page,'privacy-person-confirm-390')
 await Promise.all([page.waitForURL(url=>url.pathname==='/app/inquiries'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Permanently erase person data',exact:true}).click()])
 assert.equal((await send(ids[0])).status(),303,'A captured enquiry can be retried but never resurrected')
 const after=await context.request.post(origin+'/api/pane/privacy/find',{headers:{Origin:origin},data:{email}});assert.deepEqual((await after.json()).marketingConsents,[])
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
