import {gridFormsJourney} from './grid-forms-journey.mjs'
import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,executablePath:process.env.PANE_CHROMIUM_PATH,args:['--use-mock-keychain','--password-store=basic']})
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
 for(const width of process.env.PANE_GRID_FORMS_ONLY?[]:[1440,390]){
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
 await gridFormsJourney({page,live,owner,visitor,origin,data,call,capture,form,publish})
 console.log('Typed form browser journey passed at 1440 and 390: real builder, two placements, required/help/errors with retained answers, private 5 MB PDF, refusals, inbox download, confirmation and tooltips.')
}catch(error){await page.screenshot({path:resolve(folder,'owner-failure.png'),fullPage:true});await live.screenshot({path:resolve(folder,'visitor-failure.png'),fullPage:true});console.error('Forms state',new URL(page.url()).pathname,new URL(live.url()).pathname);throw error}finally{await browser.close();await fixture.stop()}
