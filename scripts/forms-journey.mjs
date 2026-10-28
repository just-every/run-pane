import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
process.env.PANE_BROWSER_NOW='2030-06-20T12:00:00.000Z'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM_PATH?{executablePath:process.env.PANE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const owner=await browser.newContext({acceptDownloads:true}),visitor=await browser.newContext()
const page=await owner.newPage(),live=await visitor.newPage(),origin=fixture.origin
await fixture.protect(visitor)
const folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/forms');await mkdir(folder,{recursive:true})
const data=async()=> (await owner.request.get(origin+'/api/pane')).json()
async function call(path,value){const response=await owner.request.post(origin+path,{headers:{Origin:origin},data:value});assert.ok(response.ok(),await response.text());return response.json()}
async function capture(tab,name,width){assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow');await tab.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})}
async function publish(){const current=await data();await call('/api/pane/publish',{revision:current.draft.id})}
async function fill(){await live.getByLabel('Your name (required)',{exact:true}).fill('Synthetic visitor');await live.getByLabel('Email address (required)',{exact:true}).fill('synthetic-pane-71@example.test');await live.getByLabel('Project details (required)',{exact:true}).fill('Please repair my chair.')}
try{
 await fixture.bootstrap(owner);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click();await page.waitForURL('**/app')
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'));await call('/api/pane/prepare',{site});await publish()
 await page.goto(origin+'/app/sites');const settings=page.getByRole('region',{name:'Form settings'});await settings.getByText('Create a form',{exact:true}).click()
 await settings.getByLabel('Form name',{exact:true}).fill('Workshop quote');await settings.getByLabel('Confirmation message',{exact:true}).fill('Your workshop request has arrived.')
 const phone=settings.locator('[data-fields] > fieldset').nth(2);await phone.getByLabel('Help text',{exact:true}).fill('Use the number where we can reach you.');await phone.getByLabel('Validation message',{exact:true}).fill('A reachable US phone is required.')
 await page.setViewportSize({width:1440,height:1000});await capture(page,'form-builder',1440)
 await settings.getByRole('button',{name:'Save form draft',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('notice'))
 const form=(await data()).draft.site.forms[0]
 for(const slug of ['about','contact']){
  await page.goto(origin+'/app?page='+slug);await page.getByText('Form placement',{exact:true}).click();await page.getByLabel('Reusable form',{exact:true}).selectOption(form.id)
  await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.');await page.reload()
 }
 await publish()
 const pdf=Buffer.alloc(5*1024*1024,32);pdf.write('%PDF-1.7\nsynthetic-pane-72')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await live.setViewportSize({width,height:1000})
  await page.goto(origin+'/app/sites');await settings.getByText('Workshop quote',{exact:true}).click();await capture(page,'saved-form-builder',width)
  await page.goto(origin+'/app?page=about');await page.getByText('Form placement',{exact:true}).click();await capture(page,'form-placement',width)
  await live.goto(origin+'/site/about');await fill();await live.getByLabel('Email address (required)',{exact:true}).fill('invalid-email');await live.getByRole('button',{name:'Request quote',exact:true}).click()
  await live.getByText('Enter a valid email address.',{exact:true}).waitFor();assert.equal(await live.getByLabel('Your name (required)',{exact:true}).inputValue(),'Synthetic visitor')
  const number=live.getByLabel('US phone (required)',{exact:true});assert.equal(await number.getAttribute('aria-invalid'),'true');await live.getByText('A reachable US phone is required.',{exact:true}).waitFor();assert.match(await number.getAttribute('aria-describedby'),/field-phone-help field-phone-error/)
  await capture(live,'field-errors-retained-answers',width)
  await live.getByLabel('Email address (required)',{exact:true}).fill('synthetic-pane-71@example.test');await number.fill('312 555 0123')
  await live.getByLabel('Project PDF',{exact:true}).setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('wrong')});await live.getByRole('button',{name:'Request quote',exact:true}).click();await live.getByText('Choose a PDF file.',{exact:true}).waitFor();await capture(live,'file-type-error',width)
  await live.getByLabel('Project PDF',{exact:true}).setInputFiles({name:'project.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(5*1024*1024+1)});await live.getByRole('button',{name:'Request quote',exact:true}).click();await live.getByText('Choose a file of 5 MB or smaller.',{exact:true}).waitFor();await capture(live,'file-size-error',width)
  await live.getByLabel('Project PDF',{exact:true}).setInputFiles({name:'project.pdf',mimeType:'application/pdf',buffer:pdf});await live.getByRole('button',{name:'Request quote',exact:true}).click();await live.waitForURL(url=>url.searchParams.has('sent'));await live.getByRole('status').filter({hasText:'Your workshop request has arrived.'}).waitFor();await capture(live,'confirmation',width)
  await page.goto(origin+'/app/inquiries');const file=page.getByRole('link',{name:'project.pdf',exact:true}).first();const downloadEvent=page.waitForEvent('download');await file.click();const download=await downloadEvent,downloadPath=resolve(folder,'private-project-'+width+'.pdf');await download.saveAs(downloadPath);assert.deepEqual(await readFile(downloadPath),pdf);await capture(page,'private-file-inbox',width)
  const stored=(await data()).messages[0].files[0],locked=await visitor.request.get(origin+'/api/pane/files/'+stored.id);assert.equal(locked.status(),401)
  await live.goto(origin+'/site/contact');await live.getByRole('heading',{name:'Workshop quote',exact:true}).waitFor();assert.equal(await live.getByLabel('US phone (required)',{exact:true}).getAttribute('aria-describedby'),'field-phone-help');await capture(live,'second-placement',width)
  const direct=await visitor.request.post(origin+'/site/contact',{headers:{Origin:origin},multipart:{idempotency:crypto.randomUUID(),name:'Kept answer',email:'bad-email',phone:'',message:'Please keep this answer.'}});assert.equal(direct.status(),400)
  await live.setContent(await direct.text());assert.equal(await live.getByLabel('Your name (required)',{exact:true}).inputValue(),'Kept answer');assert.equal(await live.getByLabel('US phone (required)',{exact:true}).getAttribute('aria-invalid'),'true');await capture(live,'direct-post-errors',width)
  await page.goto(origin+'/app/inquiries');let review=page.getByRole('region',{name:'Spam protection review'})
  await review.getByText('Settings',{exact:true}).click();await review.getByLabel('Rejected content retention').selectOption('on');await review.getByLabel('I confirm this retention choice.').check();await capture(page,'rejected-file-retention',width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),review.getByRole('button',{name:'Save retention'}).click()])
  await live.goto(origin+'/site/contact');await fill();await live.getByLabel('US phone (required)',{exact:true}).fill('312 555 0123');await live.getByLabel('Project PDF',{exact:true}).setInputFiles({name:'rejected.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nsynthetic-pane-73-private-bytes')});await live.locator('[name="website"]').evaluate(node=>node.value='synthetic-pane-74')
  const refusal=live.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/site/contact');await live.getByRole('button',{name:'Request quote',exact:true}).click();const rejected=await refusal;assert.equal(rejected.status(),403);assert.match((await rejected.json()).error,/Spam verification failed/)
  await page.goto(origin+'/app/inquiries');review=page.getByRole('region',{name:'Spam protection review'});await review.getByText('Synthetic visitor · honeypot',{exact:true}).click();assert.match(await review.innerText(),/Project PDF: rejected.pdf/);assert.doesNotMatch(await review.innerText(),/synthetic-pane-73-private-bytes/);await capture(page,'rejected-file-review',width)
  const beforeRescue=(await data()).messages.length;assert.equal((await data()).rejectedContent.length,1)
  await review.getByLabel('Confirm mark not spam').check();await capture(page,'rejected-file-rescue-confirmation',width)
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),review.getByRole('button',{name:'Mark not spam'}).click()])
  const rescued=await data();assert.equal(rescued.messages.length,beforeRescue+1);assert.deepEqual(rescued.messages.find(row=>row.message.includes('rejected.pdf')).files,[]);await capture(page,'rejected-file-rescued-text',width)
  await page.goto(origin+'/app/inquiries');const control=page.locator('[data-tip="Account and team"]');await control.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture(page,'inbox-focus-tooltip',width);await control.blur();await control.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture(page,'inbox-hover-tooltip',width)
 }
 // Export from two independently identified forms through the native public intake.
 const exportSite=structuredClone((await data()).draft.site)
 const exportForms=['synthetic-pane-export-1','synthetic-pane-export-2'].map(id=>({...structuredClone(form),id,name:'Export workshop'}))
 exportSite.forms.push(...exportForms);exportSite.pages.find(row=>row.slug==='contact').formId=exportForms[0].id;exportSite.pages.find(row=>row.slug==='about').formId=exportForms[1].id
 await call('/api/pane/prepare',{site:exportSite,base:(await data()).draft.id});await publish()
 const send=async(slug,at,message='Synthetic CSV request')=>{
  process.env.PANE_BROWSER_NOW=at
  const id=crypto.randomUUID(),proof='synthetic-pane-3:'+await page.evaluate(async slug=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(slug))),b=>b.toString(16).padStart(2,'0')).join(''),slug)
  const response=await visitor.request.post(origin+'/site/'+slug,{headers:{Origin:origin},multipart:{idempotency:id,name:'Synthetic CSV visitor',email:['synthetic-pane-82','example.test'].join('@'),phone:'312 555 0123',message,'cf-turnstile-response':proof},maxRedirects:0});assert.equal(response.status(),303,await response.text());return id
 }
 const before=await send('contact','2030-06-20T23:59:59.999Z')
 const first=await send('contact','2030-06-21T00:00:00.000Z','A comma, a "quote" and a new line'),expected=[first]
 const other=await send('about','2030-06-21T00:00:00.000Z')
 for(let i=0;i<101;i++)expected.push(await send('contact',new Date(Date.parse('2030-06-21T12:00:00.000Z')+i*60000).toISOString()))
 expected.push(await send('contact','2030-06-21T23:59:59.999Z'))
 const after=await send('contact','2030-06-22T00:00:00.000Z')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/inquiries')
  const exports=page.getByRole('region',{name:'Submission export'});await exports.getByText('Download submissions',{exact:true}).click()
  await exports.getByLabel('Form',{exact:true}).selectOption(exportForms[0].id);await exports.getByLabel('From date (UTC)',{exact:true}).fill('2030-06-21');await exports.getByLabel('Through date (UTC)',{exact:true}).fill('2030-06-21')
  const downloadEvent=page.waitForEvent('download');await exports.getByRole('button',{name:'Download CSV',exact:true}).focus();await page.keyboard.press('Enter');const download=await downloadEvent,path=resolve(folder,'submissions-'+width+'.csv');await download.saveAs(path)
  if(width===1440){
   const text=await readFile(path,'utf8'),actual=[...text.matchAll(/^"([a-f0-9-]{36})",/gm)].map(match=>match[1]);assert.deepEqual(actual.sort(),expected.sort(),'Workspace CSV includes the entire form and date set beyond 100');assert.ok(!actual.some(id=>[before,after,other].includes(id)));assert.match(text,/"A comma, a ""quote"" and a new line"/)
   assert.equal((await visitor.request.get(origin+'/api/pane/submissions/export?form='+exportForms[0].id)).status(),401)
   assert.equal((await data()).messages.length,110);assert.ok((await data()).messages.some(row=>row.id===first),'The earliest enquiry remains browsable with all later records')
   const minimum=await exports.locator('label,button,p').evaluateAll(nodes=>Math.min(...nodes.map(node=>parseFloat(getComputedStyle(node).fontSize))));assert.ok(minimum>=13,'Export text meets the readable minimum')
  }
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(node=>node.getBoundingClientRect().right>innerWidth+2).slice(0,8).map(node=>({tag:node.tagName,classes:node.className,right:node.getBoundingClientRect().right})));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Submission export overflow '+JSON.stringify(overflow))
  await page.screenshot({path:resolve(folder,'submission-export-'+width+'.png'),fullPage:false})
 }
 await call('/api/pane/messages/erase',{id:first})
 const erased=await owner.request.get(origin+'/app/submissions/export?form='+exportForms[0].id+'&from=2030-06-21&to=2030-06-21');assert.ok(!((await erased.text()).includes(first)),'An erased receipt is absent from the next workspace download')
 console.log('Typed form browser journey passed at 1440 and 390: real builder, two placements, required/help/errors with retained answers, private 5 MB PDF, refusals, inbox download, confirmation, tooltips and complete per-form CSV downloads with UTC boundaries and erasure exclusion.')
}catch(error){await page.screenshot({path:resolve(folder,'owner-failure.png'),fullPage:true});await live.screenshot({path:resolve(folder,'visitor-failure.png'),fullPage:true});console.error('Forms state',new URL(page.url()).pathname,new URL(live.url()).pathname);throw error}finally{await browser.close();await fixture.stop()}
