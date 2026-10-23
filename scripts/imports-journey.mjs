import assert from 'node:assert/strict'
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises'
import {resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/import-browser-runtime.mjs')
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/imports')
await mkdir(folder,{recursive:true});page.setDefaultTimeout(20000)
const data=async()=> (await context.request.get(origin+'/api/pane')).json()
const post=async(path,input)=>{
 const response=await context.request.post(origin+'/api/pane/'+path,{headers:{Origin:origin},data:input,maxRedirects:0})
 assert.equal(response.status(),200,await response.text());return response.json()
}
async function capture(name,width){await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow at '+width)}
async function tooltip(width,name){
 const account=page.locator('.account > summary')
 await page.getByRole('heading',{level:1}).click();await account.hover()
 await page.waitForTimeout(120);assert.equal(await page.getByRole('tooltip').count(),0,'Tooltip waits on hover')
 await page.getByRole('tooltip').waitFor();assert.equal(await page.getByRole('tooltip').textContent(),'Account and team')
 await page.mouse.move(0,0);await page.keyboard.press('Tab');await account.focus()
 await page.getByRole('tooltip').waitFor({timeout:1000});await capture(name,width)
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0)
}
const scratch=await mkdtemp(resolve(tmpdir(),'synthetic-pane-import-'))
try{
 const cookie=await fixture.bootstrap(context)
 const sessionFile=resolve(scratch,'session')
 await writeFile(sessionFile,cookie,{mode:0o600})
 const helper=async(command,input)=>{
  const inputFile=resolve(scratch,'input.json');await writeFile(inputFile,JSON.stringify(input),{mode:0o600})
  const result=await promisify(execFile)(process.execPath,['scripts/pane.mjs',command,'--origin',origin,'--session-file',sessionFile,'--input',inputFile],{maxBuffer:2000000})
  return JSON.parse(result.stdout)
 }
 await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const initial=await post('prepare',{site:starter});await post('publish',{revision:initial.id})
 const source=await readFile('fixtures/imports/migration-report.json','utf8')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/moves')
  await tooltip(width,'moves-tooltip')
  await page.getByLabel('Source JSON',{exact:true}).fill(source+' '.repeat(width===390?1:0))
  await Promise.all([page.waitForURL('**/app/import/dry-run'),page.getByRole('button',{name:'Check import'}).click()])
  assert.match(await page.locator('#migration-report').locator('..').textContent(),/No writes have been made/)
  assert.equal((await data()).draft.id,initial.id)
  await tooltip(width,'import-preflight')
  await Promise.all([page.waitForURL(url=>url.pathname==='/app/moves'),page.getByRole('button',{name:'Approve import'}).click()])
  const current=await data(),job=current.imports.find(job=>job.state==='completed')
  assert.equal(current.live.id,initial.id);assert.notEqual(current.draft.id,initial.id)
  const reportForm=page.locator('form[action="/app/import/dry-run"]').filter({has:page.locator(`input[name="job"][value="${job.id}"]`)})
  await Promise.all([page.waitForURL('**/app/import/dry-run'),reportForm.getByRole('button',{name:'View report'}).click()])
  const report=page.locator('#migration-report').locator('..')
  const reportText=await report.textContent();assert.match(reportText,/5 applied/);assert.match(reportText,/Dangling internal target:.*skipped/);assert.match(reportText,/Old form destination/);assert.match(reportText,/Traffic and sales analytics history stays/)
  await tooltip(width,'import-applied-report')
  await page.getByRole('heading',{name:'Fidelity recheck'}).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(folder,`import-fidelity-${width}.png`)})
  await page.getByRole('link',{name:'Back to Moves'}).click()
  await Promise.all([page.waitForURL(url=>url.pathname==='/app/moves'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Undo import',exact:true}).click()])
  assert.equal((await data()).draft.id,initial.id)
  const undoneForm=page.locator('form[action="/app/import/dry-run"]').filter({has:page.locator(`input[name="job"][value="${job.id}"]`)})
  await Promise.all([page.waitForURL('**/app/import/dry-run'),undoneForm.getByRole('button',{name:'View report'}).click()])
  assert.match(await page.locator('#migration-report').locator('..').textContent(),/The import was undone/)
  await capture('import-undone-report',width)
 }
 // The committed exact-candidate scale journey exercises the documented WXR
 // acceptance inventory; unsupported posts/comments remain explicit exceptions.
 const wxr=await readFile('fixtures/imports/wordpress.xml','utf8')
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/moves')
  await page.getByLabel('Source JSON',{exact:true}).fill(wxr)
  await Promise.all([page.waitForURL('**/app/import/dry-run'),page.getByRole('button',{name:'Check import'}).click()])
  const warning=page.getByText(/^Imported headings, lists and inline links/).first()
  await warning.scrollIntoViewIfNeeded();assert.match(await warning.textContent(),/Original visual layout and unsupported widgets/)
  assert.equal((await data()).draft.id,initial.id,'Rich-page preflight still makes no writes')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'WXR preflight overflow at '+width)
  await page.screenshot({path:resolve(folder,`import-rich-preflight-warning-${width}.png`)})
 }
 const plan=await post('import/dry-run',{source:wxr});assert.equal(plan.report.counts.post.source,100);assert.equal(plan.report.counts.comment.source,50)
 const applied=await post('import/apply',{source:wxr,fingerprint:plan.fingerprint});assert.equal(applied.report.counts.page.applied,2);assert.equal(applied.report.counts.post.applied,0)
 await post('import/undo',{job:applied.id})
 for(const provider of ['wix','webflow','framer','durable']){
  const source=await readFile(`fixtures/imports/${provider}.json`,'utf8'),plan=await post('import/dry-run',{source}),job=await post('import/apply',{source,fingerprint:plan.fingerprint})
  assert.equal(job.report.counts.page.applied,2);assert.ok(job.report.inventory.some(item=>item.reason));await post('import/undo',{job:job.id})
 }
 const richSource=await readFile('fixtures/imports/rich-page.json','utf8'),richPlan=await post('import/dry-run',{source:richSource}),richJob=await post('import/apply',{source:richSource,fingerprint:richPlan.fingerprint})
 const external=[];page.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)external.push(request.url())})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/preview/'+richJob.report.revision+'/home')
  const body=page.locator('.public-content')
  assert.equal(await body.locator('h1#welcome').textContent(),'Welcome')
  assert.equal(await body.locator('strong').textContent(),'bold');assert.equal(await body.locator('em').textContent(),'clear')
  assert.equal(await body.locator('ol').getAttribute('start'),'3');assert.equal(await body.locator('ol > li > ul > li').textContent(),'Nested')
  assert.equal(await body.locator('a').filter({hasText:'Visit hours'}).getAttribute('href'),'./about#hours')
  assert.equal(await body.locator('a').filter({hasText:'Visit hours'}).getAttribute('rel'),'noopener noreferrer')
  assert.equal(await body.locator('a[href="sms:+13035550100"]').textContent(),'Text')
  assert.equal(await body.locator('img,iframe').count(),0);assert.equal(await body.getByRole('img',{name:'Source alt'}).count(),1)
  assert.equal(await body.locator('pre code').textContent(),'synthetic-pane-1-'.repeat(50));assert.equal(await body.locator('figcaption').textContent(),'Source caption');assert.equal(await page.evaluate(()=>window.syntheticPane),undefined)
  await capture('import-structured-preview',width)
  await page.goto(origin+'/preview/'+richJob.report.revision+'/about');await page.getByRole('link',{name:'Welcome again',exact:true}).click()
  await page.waitForURL('**/home#welcome')
  await page.goto(origin+'/app?page=home');assert.equal(await page.getByLabel('Text',{exact:true}).isEditable(),false)
  await page.getByLabel('Text',{exact:true}).focus();await page.getByText('Imported formatting is preserved.',{exact:false}).scrollIntoViewIfNeeded()
  await capture('import-structured-editor',width);await tooltip(width,'import-structured-editor-tooltip')
 }
 assert.deepEqual(external,[],'Imported source scripts, widgets and media never load in preview or workspace')
 await post('import/undo',{job:richJob.id})
 for(const provider of ['wix','webflow','framer','durable']){
  const challenge=provider==='wix'?await helper('import-crawl-challenge',{origin:'https://synthetic-pane-1.example.com',provider}):await post('import/crawl-challenge',{origin:'https://synthetic-pane-1.example.com',provider})
  fixture.edge.proof=challenge.record.value
  const collections=provider==='webflow'||provider==='framer'?JSON.parse(await readFile(`fixtures/imports/${provider}.json`,'utf8')).collections:[]
  const input={challenge:challenge.challenge,confirm:'crawl-source',collections}
  const captured=provider==='wix'?await helper('import-crawl',input):await post('import/crawl',input)
  assert.equal(captured.plan.report.crawl.origin,'https://synthetic-pane-1.example.com')
  const applied=await post('import/apply',{source:captured.source,fingerprint:captured.plan.fingerprint})
  assert.equal(applied.report.counts.page.applied,3);assert.equal((await data()).live.id,initial.id)
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/moves')
   const form=page.locator('form[action="/app/import/dry-run"]').filter({has:page.locator(`input[name="job"][value="${applied.id}"]`)})
   await Promise.all([page.waitForURL('**/app/import/dry-run'),form.getByRole('button',{name:'View report'}).click()])
   const proof=page.getByText(/^Published source crawl verified for/)
   await proof.scrollIntoViewIfNeeded();await proof.waitFor()
   assert.match(await proof.textContent(),/synthetic-pane-1.example.com/)
   await page.screenshot({path:resolve(folder,`import-${provider}-verified-crawl-${width}.png`)})
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Verified crawl report overflow at '+width)
   await tooltip(width,`import-${provider}-crawl-tooltip`)
  }
  await post('import/undo',{job:applied.id})
 }
 console.log('Import journey passed at 1440/390: preflight, typed exceptions, fingerprinted unpublished apply, stored fidelity recheck, retained report/undo and hover/keyboard tooltips. Exact-candidate WXR inventory: 100 posts, 50 comments; two native pages applied. Offline provider captures and CSV exception fields reconciled separately; explicit DNS-verified Wix/Webflow/Framer/Durable captures, retained proof, preserved semantic page DOM, inert third-party content, readonly structured editor and tooltips pass at both widths.')
}finally{await context.close();await browser.close();await fixture.stop();await rm(scratch,{recursive:true,force:true})}
