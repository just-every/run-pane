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
async function check(page,label,width,slugs=['home','services','visit-us']){
 await page.evaluate(()=>document.fonts.ready)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,label+' overflow at '+width)
 if(!label.startsWith('catalog')){
  await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>location.hash),'#main')
  if(width===390){await page.locator('.public-menu-mobile>summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.public-menu-mobile').getAttribute('open'),'','Mobile navigation opens by keyboard')}
  const menu=page.locator(width===390?'.public-menu-mobile nav':'.public-menu-desktop');assert.deepEqual(await menu.locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),['/site',...slugs.slice(1).map(slug=>'/site/'+slug),'/site/search'],'Every page destination is reachable from navigation')
  const controls=await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&node.tabIndex>=0).map(node=>({tag:node.tagName,text:node.innerText.trim()})))
  assert.ok(controls.some(control=>control.text==='Skip to content'),'Keyboard inventory includes the skip link')
  const reached=new Set()
  for(let step=0;step<controls.length+3;step++){
   await page.keyboard.press('Tab')
   const focus=await page.evaluate(()=>{const node=document.activeElement;if(node===document.body)return null;const style=getComputedStyle(node);return {key:node.tagName+node.innerText.trim(),visible:node.getClientRects().length>0,outline:style.outlineStyle,shadow:style.boxShadow}})
   if(focus){assert.equal(focus.visible,true);assert.ok(focus.outline!=='none'||focus.shadow!=='none',label+' visible keyboard focus');reached.add(focus.key)}
  }
  for(const control of controls)assert.ok(reached.has(control.tag+control.text),label+' keyboard reaches '+control.text)
 }
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
   if(index===0){
    for(const width of [1440,390]){
     await page.setViewportSize({width,height:1000})
     for(const [path,label] of [['/app','start-pages'],['/app/sites','start-sites']]){
      await page.goto(origin+path)
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,label+' overflow')
      await page.screenshot({path:resolve(folder,label+'-'+width+'.png'),fullPage:true})
      await page.getByRole('link',{name:'Choose a template'}).waitFor()
     }
    }
    await page.setViewportSize({width:1440,height:1000})
   }
   await page.goto(origin+'/app/templates')
   if(index===0){
    assert.deepEqual(await page.locator('[data-template-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.templateId)),expected,'Catalog offers the complete independently specified set')
    assert.deepEqual(await page.locator('[data-template-category]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.templateCategory,count:node.querySelectorAll('[data-template-id]').length}))),categories.map(id=>({id,count:5})),'Every business category has five choices')
    await call('/api/pane/templates/start',{template:'unknown',name:'synthetic-pane-1'},400)
    await call('/api/pane/templates/start',{template:id,name:''},400)
    await call('/api/pane/templates/start',{template:id,name:'synthetic-pane-1'},403,{Origin:'https://elsewhere.invalid'})
    const issued=await (await call('/api/pane/tokens/create',{name:'synthetic-pane-2',scopes:['draft:write'],days:1})).json()
    const tokenContext=await browser.newContext()
    try{assert.equal((await tokenContext.request.post(origin+'/api/pane/templates/start',{headers:{Origin:origin,Authorization:'Bearer '+issued.token},data:{template:id,name:'synthetic-pane-1'}})).status(),403,'A scoped token cannot start a site')}finally{await tokenContext.close()}
    assert.equal((await state()).draft,null,'Refused starts create no draft')
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await check(page,'catalog',width);const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('tooltip').waitFor({state:'hidden'})}
    await page.setViewportSize({width:1440,height:1000})
   }
   let startingPage=page,adminContext
   if(index===0){
    const link=await fixture.invitePerson(context,{email:'admin@example.test',displayName:'Template administrator',nativeRole:'admin'})
    adminContext=await browser.newContext();await fixture.protect(adminContext)
    const confirmed=await adminContext.request.post(origin+'/auth/confirm',{headers:{Origin:origin},data:{token:new URL(link).searchParams.get('token')},maxRedirects:0});assert.equal(confirmed.status(),303,await confirmed.text())
    startingPage=await adminContext.newPage();await startingPage.goto(origin+'/app/templates')
   }
   const card=startingPage.locator(`[data-template-id="${id}"]`);await card.locator('summary').click();await card.getByLabel('Your business name').fill('synthetic-pane-'+(index+1));await Promise.all([startingPage.waitForURL(url=>url.pathname==='/app'),card.getByRole('button',{name:'Create draft site'}).click()])
   const initial=(await state()).draft
   assert.equal(initial.site.template,id);assert.equal(initial.site.name,'synthetic-pane-'+(index+1));assert.deepEqual(initial.site.pages.map(page=>page.slug),['home','services','visit-us'],'Every template starts all three editable pages');assert.equal((await state()).live,null,'Starting never publishes')
   if(adminContext){
    assert.equal((await state()).people[initial.actor],'Template administrator','The native admin prepares the template draft')
    const refused=await adminContext.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:initial.id}});assert.equal(refused.status(),403,'Admin preparation grants no publication authority')
    await adminContext.close()
   }
   await call('/api/pane/templates/start',{template:expected[(index+1)%expected.length],name:'replacement'},409)
   assert.equal((await state()).draft.id,initial.id,'A second choice preserves the first draft')
   // Edit every page through the existing canvas, then reopen its durable revision.
   for(const slug of ['home','services','visit-us']){
    await page.goto(origin+'/app/canvas?page='+slug)
    const editable=page.locator('[contenteditable=true]').first();await editable.waitFor();await editable.fill('Personalized '+id+' '+slug);await editable.press('Tab')
    await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
    await page.reload();assert.equal(await page.locator('[contenteditable=true]').first().innerText(),'Personalized '+id+' '+slug,'Canvas edits reopen')
   }
   async function previewLinks(draft){
    for(const source of draft.site.pages){
     await page.goto(origin+'/preview/'+draft.id+'/'+source.slug)
     const target=draft.site.pages.find(candidate=>candidate.id===(source.id==='visit-us'?'services':'visit-us'))
     const button=page.locator('[data-block] a').last()
     assert.equal(await button.getAttribute('href'),'./'+target.slug,'Template preview CTA stays in the reviewed draft')
     await button.click()
     assert.equal(new URL(page.url()).pathname,'/preview/'+draft.id+'/'+target.slug,'Template preview CTA never escapes to the live website')
     assert.equal(await page.locator('.preview-banner').count(),1,'Destination retains the draft banner')
     assert.equal(await page.locator('[data-block]').first().innerText(),'Personalized '+id+' '+target.id,'Destination is the reviewed draft content')
     if(index===0&&source.id==='home'&&target.slug.endsWith('-renamed')){
      for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:resolve(folder,'renamed-draft-destination-'+width+'.png'),fullPage:true})}
      await page.setViewportSize({width:1440,height:1000})
     }
    }
   }
   const edited=(await state()).draft;assert.equal((await state()).live,null,'Canvas autosave stays private')
   await previewLinks(edited)
   if(index===0){
    await page.goto(origin+'/app');await page.getByText('Pages and folders',{exact:true}).click()
    for(const destination of ['services','visit-us'])await page.locator(`[data-page-id="${destination}"]`).getByLabel('Address',{exact:true}).fill(destination+'-renamed')
    await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
    await page.reload()
    const renamed=(await state()).draft
    assert.deepEqual(renamed.site.pages.map(item=>({id:item.id,slug:item.slug})),[{id:'home',slug:'home'},{id:'services',slug:'services-renamed'},{id:'visit-us',slug:'visit-us-renamed'}],'Renaming preserves destination identities')
    await previewLinks(renamed)
    await previewLinks(edited)
   }
   const draft=(await state()).draft,slugs=draft.site.pages.map(item=>item.slug)
   await page.goto(origin+'/app/sites');await page.getByRole('button',{name:'Approve & publish',exact:true}).first().click()
   const published=await state();assert.ok(published.live,'Owner approval makes the selected revision live');assert.equal(published.live.id,draft.id,'Explicit approval publishes the reviewed revision');assert.equal(published.approvals.length,1)
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000})
    for(const slug of slugs){
     const response=await page.goto(origin+(slug==='home'?'/site':'/site/'+slug));assert.equal(response.status(),200)
     assert.equal(await page.locator('[data-block]').first().innerText(),'Personalized '+id+' '+draft.site.pages.find(item=>item.slug===slug).id,'Published page contains the accepted canvas edit')
     assert.equal(await page.locator('[data-section]').count(),3,'Every template section is delivered')
     assert.equal(await page.locator('.preview-banner').count(),0)
     await check(page,id+'-'+slug,width,slugs)
     const source=draft.site.pages.find(item=>item.slug===slug),target=draft.site.pages.find(item=>item.id===(source.id==='visit-us'?'services':'visit-us'))
     const button=page.locator('[data-block] a').last()
     assert.equal(await button.getAttribute('href'),'/site/'+target.slug,'Template live CTA follows the destination identity after rename')
     const destination=await context.request.get(origin+'/site/'+target.slug,{maxRedirects:0})
     assert.equal(destination.status(),200,'Renamed template destination is served directly without a redirect')
     await button.click()
     assert.equal(new URL(page.url()).pathname,'/site/'+target.slug,'Template CTA reaches the correct published destination')
     assert.equal(await page.locator('[data-block]').first().innerText(),'Personalized '+id+' '+target.id,'Template CTA serves the chosen destination content')
    }
   }
   console.log('Template passed: '+id+'; edited and published three pages; overflow and axe at 1440 and 390')
  }finally{await context.close();await fixture.stop()}
 }
 assert.equal(results.length,242,'All catalog screens and every template page were checked')
 await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2))
}finally{await browser.close()}
