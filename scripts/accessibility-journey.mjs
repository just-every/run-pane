import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createRequire} from 'node:module'
import {chromium} from '@playwright/test'
const require=createRequire(import.meta.url),axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8')
const fixture=await import('../tests/browser-runtime.mjs'),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/accessibility')
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
const state=async()=>(await context.request.get(origin+'/api/pane')).json()
const call=async(path,data,status=200)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),status,await response.text());return response.json()}
const saved=async()=>{await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.');await page.waitForTimeout(80)}
async function capture(name){await page.screenshot({path:resolve(folder,name+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')}
async function keyboard(slug,width){
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>location.hash),'#main')
 if(width===390){await page.locator('.public-menu-mobile>summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.public-menu-mobile').getAttribute('open'),'');await page.keyboard.press('Enter')}
 if(slug==='faq'){await page.locator('.public-content summary').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.public-content details').first().getAttribute('open'),'');await page.keyboard.press('Enter')}
 if(slug==='contact'){
  await page.getByLabel('Your name',{exact:true}).focus();await page.keyboard.type('Avery');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('name'),'email');await page.keyboard.type('avery@example.test');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('name'),'message');await page.keyboard.type('Please tell me about celebration cakes.');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').innerText(),'Send message');await Promise.all([page.waitForURL('**/site/contact?sent=1'),page.keyboard.press('Enter')]);assert.match(await page.locator('[role=status]').allTextContents().then(values=>values.join(' ')),/Your message has been received/)
 }
 const controls=page.locator('a,button,summary,input:not([type=hidden]),textarea,select')
 const visible=await controls.evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&!node.disabled&&node.tabIndex>=0).length)
 assert.ok(visible>0)
 const reached=new Set()
 for(let index=0;index<visible+3;index++){await page.keyboard.press('Tab');const focused=await page.evaluate(()=>{const node=document.activeElement;if(node===document.body)return null;return {tag:node.localName,text:(node.getAttribute('aria-label')??node.innerText??node.name??'').trim(),outline:getComputedStyle(node).outlineStyle,shadow:getComputedStyle(node).boxShadow,hidden:node.closest('[hidden],[inert]')!==null}});if(focused){assert.equal(focused.hidden,false);assert.ok(focused.outline!=='none'||focused.shadow!=='none','Keyboard focus is visible: '+JSON.stringify(focused));reached.add(focused.tag+focused.text)}}
 assert.ok(reached.size>1,'Keyboard can move between controls without a trap')
}
const base={name:'Riverbend Bakery',description:'Handmade celebration cakes and bread, baked in our neighbourhood.',pages:[{slug:'home',title:'Good things from our oven',body:'Fresh bread and custom cakes.'},{slug:'contact',title:'Plan your celebration',body:'Tell us what you have in mind.'}]}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 await call('/api/pane/prepare',{site:base})
 await page.goto(origin+'/app/canvas?page=home');await page.locator('[contenteditable=true]').waitFor();await page.getByLabel('Add image file').setInputFiles('public/site/cake-3.webp');await page.locator('[data-image-settings]:not([hidden])').waitFor();await saved()
 let draft=(await state()).draft;assert.ok(draft.site.pages[0].sections[0].blocks.some(item=>item.image),'Real image bytes are in the immutable draft')
 const refused=await call('/api/pane/publish',{revision:draft.id},400);assert.match(refused.error,/Accessibility warning/);assert.equal((await state()).live,null)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites');await page.getByRole('region',{name:'Accessibility warnings'}).waitFor();await capture('missing-alt-warning-'+width);if(width===1440){const refusal=page.waitForResponse(response=>response.url().endsWith('/app/publish')&&response.request().method()==='POST');await page.getByRole('button',{name:'Approve & publish',exact:true}).first().click();assert.equal((await refusal).status(),400);assert.match(await page.locator('body').innerText(),/Accessibility warning/);assert.equal((await state()).live,null);await page.goto(origin+'/app/sites')}const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await capture('warning-tooltip-'+width)}
 await page.goto(origin+'/app/canvas?page=home');await page.locator('[data-image-block]').click();await page.getByLabel('Decorative image',{exact:true}).check();await saved();draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id});await page.goto(origin+'/site');assert.equal(await page.locator('[data-image-block] img').getAttribute('alt'),'');assert.equal(await page.locator('[data-image-block] img').getAttribute('role'),'presentation')
 await page.goto(origin+'/app/canvas?page=home');await page.locator('[data-image-block]').click();await page.getByLabel('Decorative image',{exact:true}).uncheck();await page.getByLabel('Alternative text',{exact:true}).fill('Two-tier lemon celebration cake with yellow flowers');await saved()
 await page.locator('[contenteditable=true]').first().click();await page.getByText('Layout settings',{exact:true}).click();await page.getByLabel('Paragraph style',{exact:true}).selectOption('h3');await saved();await page.locator('[data-layout-canvas] [data-section]').focus();await page.getByLabel('Hex background',{exact:true}).fill('#222222');await saved()
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/sites');const warnings=page.getByRole('region',{name:'Accessibility warnings'});assert.match(await warnings.innerText(),/Heading 3 follows Heading 1/);assert.match(await warnings.innerText(),/contrast/);await capture('heading-contrast-warning-'+width)}
 await page.goto(origin+'/app/canvas?page=home');await page.locator('[contenteditable=true]').first().click();await page.getByText('Layout settings',{exact:true}).click();await page.getByLabel('Paragraph style',{exact:true}).selectOption('h2');await saved();await page.locator('[data-layout-canvas] [data-section]').focus();await page.getByLabel('Hex background',{exact:true}).fill('#ffffff');await saved()
 // Create every current starter through the same organizer used by an owner.
 await page.goto(origin+'/app');await page.getByText('Pages and folders',{exact:true}).click()
 for(const layout of ['landing','service','team','menu','pricing','faq','location']){await page.getByLabel('Starter layout',{exact:true}).selectOption(layout);await page.getByLabel('New page title',{exact:true}).fill(layout);await page.getByRole('button',{name:'Add page',exact:true}).click();await saved()}
 draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
 const results=[]
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto(origin+'/app/canvas?page=home');await page.locator('[data-image-block] img').waitFor();await capture('populated-canvas-'+width)
  for(const item of draft.site.pages){
   await page.goto(origin+(item.slug==='home'?'/site':'/site/'+item.slug));await page.evaluate(()=>document.fonts.ready);await keyboard(item.slug,width)
   // Inject axe into the browser's isolated evaluation context, retaining product CSP.
   await page.evaluate(axe)
   const result=await page.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}))
   const serious=result.violations.filter(item=>['serious','critical'].includes(item.impact));results.push({width,page:item.slug,violations:result.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.map(node=>node.target)}))});assert.deepEqual(serious.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)})),[],`Axe serious violations on ${item.slug} at ${width}`)
   if(item.slug==='home'){assert.equal(await page.locator('[data-image-block] img').getAttribute('alt'),'Two-tier lemon celebration cake with yellow flowers');assert.equal(await page.locator('[data-image-block] img').evaluate(node=>node.complete&&node.naturalWidth>0),true)}
   await capture('live-'+item.slug+'-'+width)
  }
 }
 await writeFile(resolve(folder,'axe-results.json'),JSON.stringify(results,null,2))
 console.log('Accessible output journey passed: native image picker, missing-alt refusal and owner warnings, decorative and descriptive images, heading and contrast warnings, seven starter layouts and populated canvas output, keyboard forms, skip links, disclosures, visible focus and axe at 1440 and 390.')
}catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});console.error(await page.locator('[data-save-status],[data-layout-selection]').allTextContents());throw error}finally{await browser.close();await fixture.stop()}
