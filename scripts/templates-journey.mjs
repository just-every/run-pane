// One catalog-to-publication journey, with a new native installation for every choice.
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'
import {chromium} from '@playwright/test'
const require=createRequire(import.meta.url),axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/templates');await mkdir(folder,{recursive:true})
const categories=['restaurant','salon-spa','trades','professional','clinic','studio','retail','nonprofit']
const expected=categories.flatMap(category=>[1,2,3,4,5].map(number=>category+'-'+number))
const browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM?{executablePath:process.env.PANE_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const results=[]
async function check(page,label,width){
 await page.evaluate(()=>document.fonts.ready)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,label+' overflow at '+width)
 await page.evaluate(axe)
 const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)})))
 assert.deepEqual(violations,[],label+' axe at '+width)
 await page.screenshot({path:resolve(folder,label+'-'+width+'.png'),fullPage:true})
 results.push({label,width,overflow:false,violations})
}
try{
 for(const [index,id] of expected.entries()){
  const fixture=await import('../tests/browser-runtime.mjs?template='+id),origin=fixture.origin
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000)
  const call=async(path,data,status=200,headers={})=>{const response=await context.request.post(origin+path,{headers:{Origin:origin,...headers},data,maxRedirects:0});assert.equal(response.status(),status,await response.text());return response}
  const state=async()=>(await context.request.get(origin+'/api/pane')).json()
  try{
   assert.equal((await context.request.post(origin+'/api/pane/templates/start',{headers:{Origin:origin},data:{template:id,name:'synthetic-pane-1'}})).status(),401)
   await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
   await page.goto(origin+'/app/templates')
   if(index===0){
    assert.deepEqual(await page.locator('[data-template-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.templateId)),expected,'Catalog offers the complete independently specified set')
    assert.deepEqual(await page.locator('[data-template-category]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.templateCategory,count:node.querySelectorAll('[data-template-id]').length}))),categories.map(id=>({id,count:5})),'Every business category has five choices')
    await call('/api/pane/templates/start',{template:'unknown',name:'synthetic-pane-1'},400)
    await call('/api/pane/templates/start',{template:id,name:''},400)
    await call('/api/pane/templates/start',{template:id,name:'synthetic-pane-1'},403,{Origin:'https://elsewhere.invalid'})
    assert.equal((await state()).draft,null,'Refused starts create no draft')
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await check(page,'catalog',width);const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip',{name:'Account and team'}).waitFor()}
    await page.setViewportSize({width:1440,height:1000})
   }
   const card=page.locator(`[data-template-id="${id}"]`);await card.locator('summary').click();await card.getByLabel('Your business name').fill('synthetic-pane-'+(index+1));await Promise.all([page.waitForURL(url=>url.pathname==='/app'),card.getByRole('button',{name:'Create draft site'}).click()])
   const initial=(await state()).draft
   assert.equal(initial.site.template,id);assert.equal(initial.site.name,'synthetic-pane-'+(index+1));assert.deepEqual(initial.site.pages.map(page=>page.slug),['home','services','visit-us'],'Every template starts all three editable pages');assert.equal((await state()).live,null,'Starting never publishes')
   await call('/api/pane/templates/start',{template:expected[(index+1)%expected.length],name:'replacement'},409)
   assert.equal((await state()).draft.id,initial.id,'A second choice preserves the first draft')
   // Edit every page through the existing canvas, then reopen its durable revision.
   for(const slug of ['home','services','visit-us']){
    await page.goto(origin+'/app/canvas?page='+slug)
    const editable=page.locator('[contenteditable=true]').first();await editable.waitFor();await editable.fill('Personalized '+id+' '+slug);await editable.press('Tab')
    await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
    await page.reload();assert.equal(await page.locator('[contenteditable=true]').first().innerText(),'Personalized '+id+' '+slug,'Canvas edits reopen')
   }
   const draft=(await state()).draft;assert.equal((await state()).live,null,'Canvas autosave stays private')
   await page.goto(origin+'/app/sites');await page.getByRole('button',{name:'Approve & publish',exact:true}).first().click()
   const published=await state();assert.equal(published.live.id,draft.id,'Explicit approval publishes the reviewed revision');assert.equal(published.approvals.length,1)
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000})
    for(const slug of ['home','services','visit-us']){
     const response=await page.goto(origin+(slug==='home'?'/site':'/site/'+slug));assert.equal(response.status(),200)
     assert.equal(await page.locator('[data-block]').first().innerText(),'Personalized '+id+' '+slug,'Published page contains the accepted canvas edit')
     assert.equal(await page.locator('[data-section]').count(),3,'Every template section is delivered')
     assert.equal(await page.locator('.preview-banner').count(),0)
     await check(page,id+'-'+slug,width)
    }
   }
   console.log('Template passed: '+id+'; edited and published three pages; overflow and axe at 1440 and 390')
  }finally{await context.close();await fixture.stop()}
 }
 assert.equal(results.length,242,'All catalog screens and every template page were checked')
 await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2))
}finally{await browser.close()}
