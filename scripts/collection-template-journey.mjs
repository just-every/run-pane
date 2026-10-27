import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
import {serviceFields,serviceItem} from '../tests/collection-fixture.mjs'
process.env.PANE_BROWSER_NOW='2026-10-15T16:00:00Z'
const fixture=await import('../tests/browser-runtime.mjs'),{origin}=fixture,browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM_PATH?{executablePath:process.env.PANE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),visitor=await browser.newContext(),page=await context.newPage(),live=await visitor.newPage(),folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/collection-template')
await mkdir(folder,{recursive:true});page.setDefaultTimeout(20000);live.setDefaultTimeout(20000)
const json=async response=>{assert.equal(response.status(),200,await response.text());return response.json()},state=()=>context.request.get(origin+'/api/pane').then(json)
const call=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data}).then(json),save=async(path,data)=>call('/api/pane/collections'+path,{base:(await state()).draft.id,...data})
const submit=button=>Promise.all([page.waitForEvent('domcontentloaded'),button.click()])
async function capture(tab,name,width){
 await tab.evaluate(()=>scrollTo({top:0,behavior:'instant'}))
 if(tab===page){const account=tab.locator('[data-tip="Account and team"]');await account.hover();await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.mouse.move(0,500);await tab.keyboard.press('Escape');await account.focus();await tab.keyboard.press('Tab');await tab.keyboard.press('Shift+Tab');await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.keyboard.press('Escape')}
 await tab.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'));assert.deepEqual(await tab.evaluate(async()=>(await axe.run(document)).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))),[],name+' axe')
 const main=tab.locator('#main'),controls=main.locator('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary'),expected=await controls.evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map((node,index)=>{node.dataset.templateFocus=String(index);return index})),seen=[]
 await main.locator('h1').evaluate(node=>{node.tabIndex=-1;node.focus()})
 for(let step=0;seen.length<expected.length&&step<expected.length+12;step++){await tab.keyboard.press('Tab');const next=await tab.evaluate(()=>{const node=document.activeElement,style=getComputedStyle(node);return {id:Number(node.dataset.templateFocus??-1),type:node.type,ring:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0||style.boxShadow!=='none'}});assert.ok(next.ring,name+' keyboard focus');if(next.type==='date'&&next.id===seen.at(-1))continue;seen.push(next.id)}
 assert.deepEqual(seen,expected,name+' keyboard order');assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' fits '+width);await tab.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await tab.screenshot({path:resolve(folder,name+'-'+width+'.png'),fullPage:true})
}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await submit(page.getByRole('button',{name:'Finish setup'}))
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'));site.name='Riverbend baking studio';site.description='Hand-decorated cakes for local celebrations.'
 let draft=await call('/api/pane/prepare',{site});await call('/api/pane/publish',{revision:draft.id})
 await save('/schema',{id:'team',title:'Team',prefix:'team',fields:[{id:'name',label:'Name',type:'text',required:true}]});await save('/items/save',{collection:'team',id:'june',slug:'june',title:'June Ellis',values:{name:'June Ellis'}})
 await save('/schema',{id:'services',title:'Celebration cakes',prefix:'celebration-cakes',fields:serviceFields})
 for(let index=1;index<=30;index++)await save('/items/save',{collection:'services',...serviceItem(index),title:'Celebration cake service '+index,values:{...serviceItem(index).values,name:'Hand-decorated cake '+index,description:{body:'Made with care for a local celebration.'},notes:'Cake care for celebration '+index}})
 await page.goto(origin+'/app/collections?collection=services&item=service-1');await page.locator('[data-collection-image]').setInputFiles({name:'celebration.webp',mimeType:'image/webp',buffer:await readFile('public/site/cake-3.webp')});await page.getByLabel('Service image alternative text',{exact:true}).fill('A lemon celebration cake with flowers');await page.getByRole('button',{name:'Save item draft',exact:true}).click();await page.locator('[data-collection-item-form] [data-collection-status]').getByText('Draft saved. Not published.',{exact:true}).waitFor()
 const preparedImage=(await state()).draft.site.collections.find(collection=>collection.id==='services').items[0].values.image
 for(let index=2;index<=30;index++)await save('/items/save',{collection:'services',...serviceItem(index),title:'Celebration cake service '+index,values:{...serviceItem(index).values,name:'Hand-decorated cake '+index,description:{body:'Made with care for a local celebration.'},notes:'Cake care for celebration '+index,image:preparedImage}})
 draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await live.setViewportSize({width,height:1000});await page.goto(origin+'/app/collections?collection=services&item=service-1');await page.getByText('Settings',{exact:true}).click();await page.getByText('Template page',{exact:true}).click();const form=page.locator('[data-collection-template]'),saved=()=>form.locator('[data-collection-status]').getByText('Draft saved. Not published.',{exact:true}).waitFor()
  if(width===1440){
   await form.getByLabel('Use a template page for every item',{exact:true}).check();await saved()
   for(const [label,value] of [['Search title','name'],['Search description','notes'],['Social image','image']]){await form.getByLabel(label,{exact:true}).selectOption(value);await saved()}
   for(const field of serviceFields.filter(field=>!['notes','description','price','image'].includes(field.id))){await form.locator('[data-template-field="'+field.id+'"]').getByRole('checkbox').uncheck();await saved()}
   for(let index=0;index<9;index++){await form.getByRole('button',{name:'Move earlier: Care notes',exact:true}).click();await saved()}
  }
  assert.deepEqual((await state()).draft.site.collections.find(collection=>collection.id==='services').template,{fields:['notes','description','price','image'],titleField:'name',descriptionField:'notes',imageField:'image'})
  await capture(page,'template-settings',width)
  await form.getByRole('link',{name:'Review in Pages and approve the whole site to publish',exact:true}).click();await page.waitForURL(url=>url.pathname==='/app');if(width===1440)await submit(page.getByRole('button',{name:'Approve & publish',exact:true}));else assert.equal((await state()).live.id,(await state()).draft.id,'The approved template remains the live revision')
  for(let index=1;index<=30;index++){
   const response=await visitor.request.get(origin+'/site/celebration-cakes/service-'+index);assert.equal(response.status(),200,'Every item URL is public after owner approval');const html=await response.text();assert.ok(html.includes('<title>Hand-decorated cake '+index+'</title>'));assert.ok(html.includes('name="description" content="Cake care for celebration '+index+'"'));const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);assert.equal(structured.name,'Hand-decorated cake '+index);assert.equal(structured.description,'Cake care for celebration '+index);assert.equal(structured.url,origin+'/site/celebration-cakes/service-'+index)
  }
  await live.goto(origin+'/site/celebration-cakes/service-1');assert.equal(await live.locator('h1').innerText(),'Hand-decorated cake 1');const headings=await live.locator('.public-content h2').allTextContents();assert.deepEqual(headings,['Care notes','Description','Price','Service image']);const social=await live.locator('meta[property="og:image"]').getAttribute('content');assert.ok(social.startsWith(origin+'/site/celebration-cakes/service-1?pane-collection-social=1'));assert.equal((await visitor.request.get(social)).status(),200);await capture(live,'published-template-item',width)
 }
 console.log('Collection template browser journey passed: native field design and SEO bindings, whole-site owner approval, all thirty item URLs and structured data, prepared social image, keyboard and axe at 1440 and 390.')
}catch(error){console.error('Template URL '+page.url());console.error((await page.locator('body').innerText()).slice(0,3000));await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}finally{await browser.close();await fixture.stop()}
