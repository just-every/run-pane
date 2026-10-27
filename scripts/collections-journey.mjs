import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
import {serviceFields,serviceItem} from '../tests/collection-fixture.mjs'
process.env.PANE_BROWSER_NOW='2026-10-15T16:00:00Z'
const fixture=await import('../tests/browser-runtime.mjs'),{origin}=fixture
const browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM_PATH?{executablePath:process.env.PANE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext({acceptDownloads:true}),visitor=await browser.newContext(),page=await context.newPage(),live=await visitor.newPage(),folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/collections')
await mkdir(folder,{recursive:true});page.setDefaultTimeout(20000);live.setDefaultTimeout(20000)
const json=async response=>{assert.equal(response.status(),200,await response.text());return response.json()}
const state=()=>context.request.get(origin+'/api/pane').then(json)
const call=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data}).then(json)
const save=async(path,data)=>call('/api/pane/collections'+path,{base:(await state()).draft.id,...data})
const submit=async button=>Promise.all([page.waitForEvent('domcontentloaded'),button.click()])
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
async function capture(tab,name,width,canvas=false){
 await tab.evaluate(()=>scrollTo({top:0,behavior:'instant'}))
 if(tab===page&&!canvas){const account=tab.locator('[data-tip="Account and team"]');await account.hover();await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.mouse.move(0,500);await tab.keyboard.press('Escape');await account.focus();await tab.keyboard.press('Tab');await tab.keyboard.press('Shift+Tab');await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.keyboard.press('Escape')}
 if(!canvas){
  const main=tab.locator('#main'),controls=main.locator('a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')
  const expected=await controls.evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map((node,index)=>{node.dataset.journeyFocus=String(index);return index}))
  await main.locator('h1').evaluate(node=>{node.tabIndex=-1;node.focus()});const focused=[],rings=[]
  for(let steps=0;focused.length<expected.length&&steps<expected.length+12;steps++){
   await tab.keyboard.press('Tab');const next=await tab.evaluate(()=>{const node=document.activeElement,style=getComputedStyle(node);return {id:Number(node.dataset.journeyFocus??-1),type:node.type,ring:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0||style.boxShadow!=='none'}});rings.push(next)
   // Native date fields expose successive date parts within the same control.
   if(next.id===focused.at(-1)&&next.type==='date')continue
   focused.push(next.id)
  }
  assert.deepEqual(focused,expected,name+' keyboard reading order');assert.ok(rings.every(node=>node.ring),name+' visible keyboard focus: '+JSON.stringify(rings.filter(node=>!node.ring)))
  await tab.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'));assert.deepEqual(await tab.evaluate(async()=>(await axe.run(document)).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))),[],name+' axe')
 }else{await tab.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'));assert.deepEqual(await tab.locator('[data-layout-canvas]').evaluate(async node=>(await axe.run(node)).violations.map(item=>item.id)),[],name+' semantic canvas axe')}

 assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' fits '+width)
 await tab.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await tab.screenshot({path:resolve(folder,name+'-'+width+'.png'),fullPage:true})
}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await submit(page.getByRole('button',{name:'Finish setup'}))
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8'));starter.blogs=[{id:'news',title:'News',prefix:'news',comments:false,pageSize:10}];let draft=await call('/api/pane/prepare',{site:starter});await call('/api/pane/publish',{revision:draft.id})
 const created=await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',content:{slug:'bakery-story',title:'Our bakery story',body:'A story about careful local work.'}}),linked=created.posts.at(-1)
 async function publishLinked(slug){await call('/api/pane/posts/save',{base:(await state()).draft.id,id:linked.id,blog:'news',content:{...linked.content,slug}});const review=await call('/api/pane/posts/submit',{base:(await state()).draft.id,id:linked.id});await call('/api/pane/posts/publish',{base:review.base,id:linked.id,review:review.posts.find(post=>post.id===linked.id).review})}
 await publishLinked('bakery-story')
 await save('/schema',{id:'team',title:'Team',prefix:'team',fields:[{id:'name',label:'Name',type:'text',required:true}]});await save('/items/save',{collection:'team',id:'june',slug:'june',title:'June Ellis',values:{name:'June Ellis'}})
 await page.goto(origin+'/app/collections?collection=team&item=june');await submit(page.getByRole('button',{name:'Approve and publish item',exact:true}))
 await page.goto(origin+'/app/collections');const schema=page.locator('[data-collection-schema]');assert.equal(await schema.isVisible(),true)
 await schema.getByLabel('Collection title',{exact:true}).fill('Services');await schema.getByLabel('URL prefix',{exact:true}).fill('service-directory')
 for(const [index,field] of serviceFields.entries()){
  await schema.getByRole('button',{name:'Add field',exact:true}).click();const row=schema.locator('[data-schema-field]').nth(index)
  await row.getByLabel('Field name',{exact:true}).fill(field.label);await row.getByLabel('Field type',{exact:true}).selectOption(field.type)
  if(field.required)await row.getByLabel('Required field',{exact:true}).check();if(field.help)await row.getByLabel('Help text',{exact:true}).fill(field.help)
  if(field.type==='reference')await row.getByLabel('Related collection',{exact:true}).selectOption('team');if(field.type==='option')await row.getByLabel('Choices, one per line',{exact:true}).fill(field.options.join('\n'))
 }
 await schema.getByRole('button',{name:'Save collection schema',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('collection'))
 let collection=(await state()).draft.site.collections.find(value=>value.title==='Services');assert.equal(collection.fields.length,10)
 const values=index=>Object.fromEntries(serviceFields.map(field=>[collection.fields.find(value=>value.label===field.label).id,serviceItem(index).values[field.id]]).filter(([,value])=>value!==undefined))
 for(let index=1;index<=30;index++)await save('/items/save',{collection:collection.id,...serviceItem(index),values:values(index)})
 const form=new FormData();form.set('base',(await state()).draft.id);form.set('file',new File([Buffer.from('%PDF-1.4\nsynthetic-pane-care-guide\n%%EOF')],'care-guide.pdf',{type:'application/pdf'}))
 const upload=await context.request.post(origin+'/api/pane/library/upload',{headers:{Origin:origin},multipart:{base:(await state()).draft.id,file:{name:'care-guide.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic-pane-care-guide\n%%EOF')}}}).then(json),file=upload.site.libraryFiles[0]
 const description=collection.fields.find(field=>field.type==='richText').id
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await live.setViewportSize({width,height:1000})
  await page.goto(origin+'/app/collections?collection='+collection.id+'&item=service-1')
  await page.getByText('Settings',{exact:true}).click();await page.getByText('Edit collection schema',{exact:true}).click();await capture(page,'schema',width);await page.getByText('Settings',{exact:true}).click()
  assert.equal(await page.locator('[data-collection-item-list] li').count(),30)
  const item=page.locator('[data-collection-item-form]');await item.getByLabel('Item title',{exact:true}).fill('Chair restoration '+width);await item.getByRole('button',{name:'Save item draft',exact:true}).click();await item.locator('[data-collection-status]').getByText('Draft saved. Not published.',{exact:true}).waitFor();await capture(page,'item-details',width)
  await item.getByRole('link',{name:'Edit Description formatting',exact:true}).click();await page.waitForURL(url=>url.pathname.endsWith('/canvas'))
  const block=page.locator('[data-layout-canvas] [contenteditable=true]').first()
  await block.evaluate((node,html)=>{node.focus();const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);const data=new DataTransfer();data.setData('text/html',html);data.setData('text/plain','Chair restoration');node.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}))},`<h2>Chair restoration</h2><h3>Prepare the layers</h3><ul><li>Inspect joints<ul><li>Repair carefully</li></ul></li></ul><p><strong>Keep the original character</strong> and <em>cool first</em>. <a href="post:${linked.id}">Read our bakery story</a> <a href="page:about">Meet the workshop</a> <a href="file:${file.id}">Download care guide</a> <a href="tel:+13125550123">Call the workshop</a></p>`);await saved()
  await page.locator('[data-image-upload]').setInputFiles({name:'workshop.webp',mimeType:'image/webp',buffer:await readFile('public/site/cake-3.webp')});await page.locator('[data-layout-canvas] [data-image-block]').last().waitFor();await page.getByLabel('Alternative text',{exact:true}).fill('A celebration cake made with care');await page.getByLabel('Caption',{exact:true}).fill('Made with care');await saved()
  await page.locator('[data-image-upload]').setInputFiles({name:'chocolate.webp',mimeType:'image/webp',buffer:await readFile('public/site/cake-2.webp')});await page.locator('[data-layout-canvas] [data-image-block]').nth(width===1440?1:3).waitFor();await page.getByLabel('Alternative text',{exact:true}).fill('A chocolate celebration cake with piped decoration');await page.getByLabel('Caption',{exact:true}).fill('Chocolate cake for a celebration');await saved()
  await page.getByText('Links and body blocks',{exact:true}).click();await page.getByRole('button',{name:'Add quote',exact:true}).click();await page.locator('[data-quote-block] [contenteditable=true]').last().fill('A celebration starts with something made with care.');await page.getByLabel('Attribution',{exact:true}).fill('Riverbend baking team');await saved()
  await page.getByLabel('Video title',{exact:true}).fill('How to decorate a cake');await page.getByLabel('YouTube embed URL',{exact:true}).fill('https://www.youtube-nocookie.com/embed/syntheticPane1');await page.getByRole('button',{name:'Add video',exact:true}).click();await saved()
  await page.getByLabel('Button label',{exact:true}).fill('Meet the bakers');await page.getByLabel('Page, post or file',{exact:true}).selectOption('page:about');await page.getByRole('button',{name:'Add button',exact:true}).click();await saved()
  await page.locator('[data-layout-canvas] [data-image-block]').last().click()
  if(width===1440){
   for(let index=1;index<=5;index++){await page.getByLabel('Caption',{exact:true}).fill('Care detail '+index);await saved()}
   for(let index=4;index>=0;index--){await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Caption',{exact:true}).inputValue(),index?'Care detail '+index:'Chocolate cake for a celebration')}
   for(let index=1;index<=5;index++){await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Caption',{exact:true}).inputValue(),'Care detail '+index)}
   const second=await context.newPage();await second.goto(page.url());await second.locator('[data-layout-canvas] [data-image-block]').last().click();await second.getByLabel('Caption',{exact:true}).fill('Latest shared description');await second.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
   await page.getByLabel('Caption',{exact:true}).fill('My retained description');await page.locator('[data-conflict]:not([hidden])').waitFor();const retained=await page.locator('form[data-collection-editor]').evaluate(form=>Object.fromEntries([...form.querySelectorAll('input[name]:not([type=hidden]),textarea[name]')].map(field=>[field.name,field.value])));const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download my copy',exact:true}).click()]);assert.equal(download.suggestedFilename(),'my-item-description.json');const copy=resolve(folder,'retained-description.json');await download.saveAs(copy);assert.deepEqual(JSON.parse(await readFile(copy,'utf8')),retained,'The conflict download preserves every personal description field');assert.ok(JSON.stringify(retained).includes('My retained description'),'The retained copy includes the losing tab’s work');assert.ok(!JSON.stringify(retained).includes('Latest shared description'),'The retained copy is not replaced with the winning revision');await page.getByRole('button',{name:'Use latest draft',exact:true}).click();await page.locator('[data-layout-canvas] figcaption').getByText('Latest shared description',{exact:true}).waitFor();await second.close()
  }
  await capture(page,'rich-description',width,true)
  await page.getByRole('link',{name:'Back to Collections',exact:true}).click();await page.waitForURL(url=>url.pathname==='/app/collections')
  const preview=await context.newPage();await preview.setViewportSize({width,height:1000});await preview.goto(origin+await page.getByRole('link',{name:'Preview item draft',exact:true}).getAttribute('href'));await preview.getByText('Draft preview',{exact:false}).first().waitFor();await preview.screenshot({path:resolve(folder,'private-item-preview-'+width+'.png'),fullPage:true});await preview.close()
  await submit(page.getByRole('button',{name:'Approve and publish item',exact:true}));assert.equal(await page.getByRole('link',{name:'Open live item',exact:true}).getAttribute('href'),'/site/service-directory/service-1')
  await live.goto(origin+'/site/service-directory/service-1');const body=live.locator('.public-content');await body.getByRole('heading',{name:'Chair restoration',exact:true}).waitFor();assert.equal(await body.locator('ul > li').filter({hasText:'Inspect joints'}).count(),1);assert.equal(await body.locator('strong').innerText(),'Keep the original character');assert.equal(await body.getByRole('link',{name:'Meet the workshop',exact:true}).getAttribute('href'),'/site/about');assert.equal(await body.getByRole('link',{name:'Download care guide',exact:true}).getAttribute('href'),'/site/files/'+file.id);assert.equal(await body.getByRole('link',{name:'Call the workshop',exact:true}).getAttribute('href'),'tel:+13125550123');assert.match(await body.innerText(),/USD\s125\.50/);await capture(live,'published-item',width)
  assert.equal(await body.locator('h3').getByText('Prepare the layers',{exact:true}).count(),1);assert.equal(await body.locator('ul > li > ul > li').getByText('Repair carefully',{exact:true}).count(),1);assert.equal(await body.locator('em').innerText(),'cool first')
  for(const alt of ['A celebration cake made with care','A chocolate celebration cake with piped decoration']){const image=body.getByRole('img',{name:alt,exact:true}).first();assert.equal(await image.count(),1,'The public description includes each described inline image');const imageResponse=await visitor.request.get(origin+await image.getAttribute('src'));assert.equal(imageResponse.status(),200);assert.ok((await imageResponse.body()).length>0,'The public image contains bytes')}
  const quotes=body.locator('blockquote');assert.ok((await quotes.allTextContents()).some(text=>text.includes('A celebration starts with something made with care.')));assert.ok((await body.innerText()).includes('Riverbend baking team'));assert.equal(await body.locator('[data-embed]').first().getAttribute('data-embed'),'https://www.youtube-nocookie.com/embed/syntheticPane1');assert.equal(await body.locator('iframe').count(),0);assert.equal(await body.getByRole('link',{name:'Meet the bakers',exact:true}).first().getAttribute('href'),'/site/about')
  await publishLinked('renamed-bakery-story');await live.reload();assert.equal(await live.getByRole('link',{name:'Read our bakery story',exact:true}).getAttribute('href'),'/site/news/renamed-bakery-story');assert.equal((await visitor.request.get(origin+'/site/news/renamed-bakery-story',{maxRedirects:0})).status(),200,'A renamed post destination is served without a redirect hop');await capture(live,'published-renamed-link',width)
  await page.goto(origin+'/app/content/history?kind=item&collection='+collection.id+'&id=service-1');await capture(page,'item-history',width)
  await page.goto(origin+'/app/collections?collection='+collection.id+'&item=service-30');await submit(page.getByRole('button',{name:'Move item to trash',exact:true}));await capture(page,'item-trash',width)
  await submit(page.getByRole('button',{name:/Restore /}).first());await capture(page,'item-trash-empty',width)
 }
 await call('/api/pane/content/delete',{kind:'item',collection:collection.id,id:'service-29',base:(await state()).draft.id})
 process.env.PANE_BROWSER_NOW='2026-11-15T16:00:00Z';await fixture.signIn(page)
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/content/trash?kind=item&collection='+collection.id);assert.equal(await page.getByRole('button',{name:/Restore /}).count(),0,'Collection trash expires after 31 days');await capture(page,'expired-item-trash',width)}
 const expired=await context.request.post(origin+'/api/pane/content/restore',{headers:{Origin:origin},data:{kind:'item',collection:collection.id,id:'service-29',base:(await state()).draft.id}});assert.equal(expired.status(),400,'An expired collection item cannot be restored')
 console.log('Collections browser journey passed: ten typed fields, thirty items, rich description, undo and conflicts, published semantics and item lifecycle at 1440 and 390.')
}catch(error){console.error('Collections URL '+page.url());console.error((await page.locator('body').innerText()).slice(0,4500));await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}finally{await browser.close();await fixture.stop()}
