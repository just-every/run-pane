import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve,dirname,join} from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),playwrightRequire=createRequire(require.resolve('@playwright/test/package.json')),coreRequire=createRequire(playwrightRequire.resolve('playwright/package.json'))
const comparePng=require(join(dirname(coreRequire.resolve('playwright-core/package.json')),'lib/coreBundle.js')).utils.getComparator('image/png')
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs'),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/components-code')
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.PANE_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
const state=async()=> (await context.request.get(origin+'/api/pane')).json()
const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
const saved=async()=>{await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.');await page.waitForTimeout(50)}
async function capture(name){await page.screenshot({path:resolve(folder,name+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')}
const initial=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 await page.addInitScript(()=>{addEventListener('message',event=>{if(event.data?.syntheticCode)window.syntheticCode={...event.data,origin:event.origin};if(event.data?.syntheticGoal){sessionStorage.setItem('syntheticGoal',JSON.stringify(event.data.syntheticGoal));sessionStorage.setItem('syntheticGoals',JSON.stringify([...(JSON.parse(sessionStorage.getItem('syntheticGoals')??'[]')),event.data.syntheticGoal]))}})})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  let draft=await call('/api/pane/prepare',{site:initial})
  if(!process.env.PANE_CANVAS_ONLY){
  await page.goto(origin+'/app?page=home');await page.getByText('Save reusable section',{exact:true}).click()
  await page.getByLabel('Component name',{exact:true}).fill('Workshop announcement')
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Save section as component'}).click()])
  for(const slug of ['about','services','hours','contact']){
   await page.goto(origin+'/app?page='+slug);await page.getByText('Reusable components',{exact:true}).click()
   await page.getByLabel(/^Placement on /).selectOption('shared');await saved()
  }
  await page.goto(origin+'/app?page=home');await page.getByText('Reusable components',{exact:true}).click()
  await page.getByLabel('Component text',{exact:true}).fill('Announcement version one '+width);await saved();await page.reload();await page.getByText('Reusable components',{exact:true}).click()
  const panel=page.locator('details').filter({has:page.getByText('Reusable components',{exact:true})});assert.equal(await panel.getByRole('link').count(),5)
  await capture('component-usage-'+width)
  draft=(await state()).draft
  for(const item of initial.pages){await page.goto(origin+'/preview/'+draft.id+'/'+item.slug);assert.match(await page.locator('.public-content').innerText(),new RegExp('Announcement version one '+width));await capture('component-preview-'+item.slug+'-'+width)}
  await page.goto(origin+'/app?page=contact');await page.getByText('Reusable components',{exact:true}).click();await page.getByLabel(/^Placement on /).selectOption('detach');await saved()
  await page.goto(origin+'/app?page=home');await page.getByText('Reusable components',{exact:true}).click();await page.getByLabel('Component text',{exact:true}).fill('Announcement version two '+width);await saved()
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Component text',{exact:true}).inputValue(),'Announcement version one '+width)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved()
  draft=(await state()).draft
  for(const item of initial.pages){await page.goto(origin+'/preview/'+draft.id+'/'+item.slug);const text=await page.locator('.public-content').innerText();assert.match(text,new RegExp('Announcement version '+(item.slug==='contact'?'one':'two')+' '+width))}
  await capture('component-detached-'+width)
  // Existing icon-only controls retain delayed hover and keyboard tooltips.
  await page.goto(origin+'/app');const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await capture('component-tooltip-'+width)
  // Add a real redirected thank-you page through the revision API, then author code in owner settings.
  let codeApiNavigations=0,codeProviderLoads=0
  await page.route('https://www.youtube-nocookie.com/**',async route=>{codeProviderLoads++;await route.fulfill({contentType:'text/html',body:'<p>Synthetic provider</p>'})})
  const recordCodeRequest=request=>{if(new URL(request.url()).pathname==='/api/pane')codeApiNavigations++}
  page.on('request',recordCodeRequest)
  const withThanks=structuredClone((await state()).draft.site)
  withThanks.pages.push({slug:'thanks',title:'Thank you for your quote request',body:'We will reply soon.'})
  withThanks.forms=[{id:'synthetic-pane-quote',name:'Quote request',submit:'Send message',confirmation:'Thank you for your request.',redirect:'/site/thanks',fields:[{key:'name',type:'text',label:'Your name',help:'',placeholder:'',required:true},{key:'email',type:'email',label:'Email address',help:'',placeholder:'',required:true},{key:'message',type:'text',label:'Message',help:'',placeholder:'',required:true}]}]
  withThanks.pages.find(item=>item.slug==='contact').formId='synthetic-pane-quote'
  withThanks.pages.find(item=>item.slug==='contact').embed={title:'Workshop URL embed',url:'https://www.youtube-nocookie.com/embed/synthetic-pane-'+width}
  withThanks.goals=[{name:'Quote request',type:'form',page:'contact'}]
  await call('/api/pane/prepare',{site:withThanks,base:(await state()).draft.id})
  await page.goto(origin+'/app?page=contact');await page.getByText('Custom code settings',{exact:true}).click()
  await page.getByLabel('Site css code',{exact:true}).fill('.proof, .pane .public-brand { color: rgb(120, 20, 60) }')
  await page.getByLabel('Site html code',{exact:true}).fill('<p class="proof">Custom workshop content</p>')
  await page.getByLabel('Site header code',{exact:true}).fill(`<meta name="synthetic-verification" content="synthetic-pane-${width}"><script>addEventListener('pane:goal',event=>top.postMessage({syntheticGoal:event.detail},'*'));let cookie='blocked';try{void top.document.cookie;cookie='exposed'}catch{};const isolation={};for(const [name,read] of Object.entries({cookies:()=>document.cookie,local:()=>localStorage.length,session:()=>sessionStorage.length,frames:()=>parent.document.body,identity:()=>top.document.querySelector('[data-account]')})){try{read();isolation[name]='exposed'}catch{isolation[name]='blocked'}};fetch('/api/pane',{credentials:'include'}).then(()=>top.postMessage({syntheticCode:true,cookie,isolation,api:'exposed'},'*')).catch(()=>top.postMessage({syntheticCode:true,cookie,isolation,api:'blocked'},'*'))</script>`)
  await page.getByLabel('Site footer code',{exact:true}).fill('<p id="synthetic-footer">Custom footer</p>')
  await saved();await page.goto(origin+'/app?page=thanks');await page.getByText('Custom code settings',{exact:true}).click()
  await page.getByLabel('Page header code',{exact:true}).fill('<meta name="synthetic-thanks" content="Quote thank-you view"><script>window.syntheticThankYou=true</script>')
  await saved();await capture('custom-code-settings-'+width)
  draft=(await state()).draft
  await page.goto(origin+'/preview/'+draft.id+'/thanks');assert.equal(await page.locator('[data-custom-code],iframe').count(),0);await capture('custom-code-inert-preview-'+width)
  const site=structuredClone(draft.site);site.goals=[{name:'Quote request',type:'form',page:'contact'}]
  draft=await call('/api/pane/prepare',{site,base:draft.id});await call('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site/contact');await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await page.reload();assert.equal(await page.locator('[data-custom-code] iframe').count(),0);assert.equal(await page.locator('head meta[name="synthetic-verification"]').count(),0);assert.notEqual(await page.locator('.public-brand').evaluate(node=>getComputedStyle(node).color),'rgb(120, 20, 60)');assert.equal(codeApiNavigations,0);assert.equal(codeProviderLoads,0);await capture('custom-code-consent-'+width)
  await page.getByRole('button',{name:'No thanks',exact:true}).count().then(async count=>{if(count)await page.getByRole('button',{name:'No thanks',exact:true}).click()})
  await page.getByRole('button',{name:'Keep custom code off'}).click();assert.equal(await page.locator('iframe').count(),0)
  await page.getByRole('button',{name:'Allow custom code'}).click();await page.waitForFunction(()=>window.syntheticCode?.api==='blocked')
  assert.deepEqual(await page.evaluate(()=>window.syntheticCode),{syntheticCode:true,cookie:'blocked',isolation:{cookies:'blocked',local:'blocked',session:'blocked',frames:'blocked',identity:'blocked'},api:'blocked',origin:'null'})
  assert.equal(await page.locator('head meta[name="synthetic-verification"]').count(),1);assert.equal(await page.locator('.public-brand').evaluate(node=>getComputedStyle(node).color),'rgb(120, 20, 60)');const frame=page.frameLocator('[data-custom-code] iframe').frameLocator('iframe');assert.equal(await frame.locator('.proof').evaluate(node=>getComputedStyle(node).color),'rgb(120, 20, 60)');assert.equal(await frame.locator('meta[name="synthetic-verification"]').count(),1);assert.equal(await frame.locator('meta[name="synthetic-thanks"]').count(),0);await frame.locator('#synthetic-footer').waitFor();await frame.locator('.proof').evaluate((node,origin)=>{location.href=origin+'/api/pane'},origin);await page.waitForTimeout(100);assert.equal(codeApiNavigations,0,'Code cannot navigate to the workspace API');await page.getByRole('button',{name:'Keep custom code off'}).click();await page.evaluate(()=>{window.syntheticCode=null});await page.getByRole('button',{name:'Allow custom code'}).click();await page.waitForFunction(()=>window.syntheticCode?.api==='blocked');await frame.locator('.proof').evaluate(()=>{location.href='https://www.youtube-nocookie.com/embed/synthetic-pane-navigation'});await page.waitForTimeout(100);assert.equal(codeProviderLoads,0,'Code cannot bypass a separate provider choice');await page.getByRole('button',{name:'Keep custom code off'}).click();await page.evaluate(()=>{window.syntheticCode=null});await page.getByRole('button',{name:'Allow custom code'}).click();await page.waitForFunction(()=>window.syntheticCode?.api==='blocked');await frame.locator('.proof').waitFor();await capture('custom-code-enabled-'+width)
  await page.getByLabel('Your name (required)',{exact:true}).fill('Synthetic quote visitor');await page.getByLabel('Email address (required)',{exact:true}).fill('synthetic-pane-'+width+'@example.test');await page.getByLabel('Message (required)',{exact:true}).fill('Please quote this workshop project.')
  await Promise.all([page.waitForURL(url=>url.pathname==='/site/thanks'),page.getByRole('button',{name:'Send message',exact:true}).click()])
  await page.waitForFunction(()=>sessionStorage.getItem('syntheticGoal')!==null)
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('syntheticGoal'))),{name:'Quote request',value:1})
  await page.waitForFunction(()=>document.querySelector('[data-custom-code] iframe'));assert.equal(await page.frameLocator('[data-custom-code] iframe').frameLocator('iframe').locator('meta[name="synthetic-thanks"]').count(),1);assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('syntheticGoals')).length),1);await capture('custom-code-thanks-'+width)
  await page.evaluate(()=>{document.cookie='_ga=synthetic-pane-cookie; path=/'})
  assert.equal(await page.evaluate(()=>document.cookie.includes('_ga=')),true)
  await page.getByRole('button',{name:'Keep custom code off'}).click();assert.equal(await page.evaluate(()=>document.cookie.includes('_ga=')),false);assert.equal(await page.locator('iframe').count(),0,'Withdrawal removes the active frame immediately');assert.equal(await page.locator('head meta[name="synthetic-verification"]').count(),0);assert.notEqual(await page.locator('.public-brand').evaluate(node=>getComputedStyle(node).color),'rgb(120, 20, 60)');await capture('custom-code-withdrawn-'+width)
  await page.goto(origin+'/site');await page.getByRole('button',{name:'Allow custom code'}).click();assert.equal(await page.frameLocator('[data-custom-code] iframe').frameLocator('iframe').locator('meta[name="synthetic-thanks"]').count(),0,'Page header code stays on the selected page')
  await context.setExtraHTTPHeaders({'Sec-GPC':'1'});await page.reload();assert.equal(await page.locator('[data-custom-code],iframe').count(),0);await capture('custom-code-gpc-'+width);await context.setExtraHTTPHeaders({})
  page.off('request',recordCodeRequest)
  await page.unroute('https://www.youtube-nocookie.com/**')
  await context.setExtraHTTPHeaders({DNT:'1'});await page.reload();assert.equal(await page.locator('[data-custom-code],iframe').count(),0);await context.setExtraHTTPHeaders({})
  await page.goto(origin+'/app/sites');await page.getByRole('button',{name:'Revoke publication approval',exact:true}).click();await page.waitForURL(url=>url.searchParams.has('notice'));await capture('custom-code-revoked-settings-'+width)
  await page.goto(origin+'/site/thanks');assert.equal(await page.locator('[data-custom-code],iframe').count(),0);assert.match(await page.locator('main').innerText(),/getting ready|Page not found/);await capture('custom-code-revoked-live-'+width)
  }
  // The native canvas uses the live renderer and the same immutable save boundary.
  const native=structuredClone(initial);native.pages.find(item=>item.slug==='services').body='Native starting text'
  await call('/api/pane/prepare',{site:native,base:(await state()).draft.id})
  await page.goto(origin+'/app/canvas?page=services');await page.locator('[contenteditable=true]').waitFor()
  const layout=label=>page.getByLabel(label,{exact:true})
  await page.locator('[contenteditable=true]').fill('Native heading');await saved()
  await page.getByText('Layout settings',{exact:true}).click();await layout('Paragraph style').selectOption('h2');await saved()
  await page.getByRole('button',{name:'Add text block',exact:true}).click();await page.locator('[contenteditable=true]').last().fill('Native detail');await saved()
  await page.locator('[data-layout-canvas] [data-section]').focus();await layout('Section type').selectOption('columns');await layout('Column ratio').selectOption('2:1');await layout('Hex background').fill('#aabbcc');await layout('Top padding').fill('96');await layout('Bottom padding').fill('96');await saved()
  await page.locator('[contenteditable=true]').last().click();await layout('First column').fill('2');await layout('Column span').fill('6');await layout('Grid row').fill('2');await layout('Text alignment').selectOption('right');await saved()
  // Desktop geometry is inspected in the real desktop preview at either screen width.
  await layout('Device preview').selectOption('1440')
  assert.equal(await page.locator('[contenteditable=true]').last().evaluate(node=>getComputedStyle(node).gridColumn),'2 / span 6')
  assert.equal(await page.locator('[contenteditable=true]').last().evaluate(node=>getComputedStyle(node).textAlign),'right')
  await layout('Device preview').selectOption('fit')
  await page.getByRole('button',{name:'Reset layout',exact:true}).click();await saved();assert.equal(await layout('Column span').inputValue(),'12')
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await layout('Column span').inputValue(),'6')
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();await page.getByRole('button',{name:'Undo',exact:true}).click();await saved()
  await page.getByRole('button',{name:'Add section',exact:true}).click();await page.locator('[contenteditable=true]').last().fill('Native second section');await saved()
  await page.locator('[data-layout-canvas] [data-section]').last().focus();await page.getByRole('button',{name:'Duplicate selection',exact:true}).click();await saved();assert.equal(await page.locator('[data-layout-canvas] [data-section]').count(),3)
  await page.getByRole('button',{name:'Delete selection',exact:true}).click();await saved();assert.equal(await page.locator('[data-layout-canvas] [data-section]').count(),2)
  await page.locator('[data-layout-canvas] [data-section]').last().dragTo(page.locator('[data-layout-canvas] [data-section]').first(),{sourcePosition:{x:5,y:5},targetPosition:{x:5,y:5}});await saved()
  assert.match(await page.locator('[data-layout-canvas] [data-section]').first().innerText(),/Native second section/)
  await page.locator('[data-layout-canvas] [data-section]').first().focus();await page.getByRole('button',{name:'Move later',exact:true}).focus();await page.keyboard.press('Enter');await saved()
  assert.match(await page.locator('[data-layout-canvas] [data-section]').first().innerText(),/Native heading/)
  await page.reload();await page.locator('[contenteditable=true]').first().waitFor();assert.equal(await page.locator('h2[data-block]').innerText(),'Native heading','Canvas reopen keeps semantic text and layout')
  const competing=await context.newPage();await competing.setViewportSize({width,height:1000});await competing.goto(origin+'/app/canvas?page=services');await competing.locator('[contenteditable=true]').first().waitFor()
  await page.locator('[contenteditable=true]').first().fill('Native heading revised');await saved()
  await competing.locator('[contenteditable=true]').first().fill('Native conflicting heading')
  await competing.waitForFunction(()=>document.querySelector('[data-conflict]').hidden===false)
  assert.equal(await competing.locator('[contenteditable=true]').first().innerText(),'Native conflicting heading','A canvas conflict keeps local text')
  assert.match(await competing.locator('[data-latest]').innerText(),/Native heading revised/,'A canvas conflict exposes the latest section snapshot')
  const copyEvent=competing.waitForEvent('download');await competing.getByRole('button',{name:'Download my copy',exact:true}).click();const copy=await copyEvent;await copy.saveAs(resolve(folder,'native-conflict-copy-'+width+'.json'))
  assert.match(JSON.parse(await readFile(resolve(folder,'native-conflict-copy-'+width+'.json'),'utf8')).sections,/Native conflicting heading/)
  await competing.getByRole('button',{name:'Use latest draft',exact:true}).click();await competing.waitForFunction(()=>document.querySelector('[contenteditable=true]')?.textContent==='Native heading revised');await competing.close()
  // Rich authoring stays inside the same native canvas and revision boundary.
  await page.getByRole('button',{name:'Add text block',exact:true}).click()
  const richBlock=page.locator('[contenteditable=true]').last()
  await richBlock.fill('Bold italic underline strike');await saved()
  async function mark(start,length,label){
   await richBlock.focus();await page.keyboard.press('Home')
   for(let index=0;index<start;index++)await page.keyboard.press('ArrowRight')
   for(let index=0;index<length;index++)await page.keyboard.press('Shift+ArrowRight')
   const control=page.getByRole('button',{name:label,exact:true})
   if(label==='Italic'){await control.focus();await page.keyboard.press('Enter')}else await control.click()
   await saved()
  }
  await mark(0,4,'Bold');await mark(5,6,'Italic');await mark(12,9,'Underline');await mark(22,6,'Strikethrough')
  await page.getByText('Layout settings',{exact:true}).click()
  await layout('Text alignment').selectOption('justify');await saved()
  assert.equal(await richBlock.evaluate(node=>getComputedStyle(node).textAlign),'justify')
  for(const [tag,text] of [['strong','Bold'],['em','italic'],['u','underline'],['s','strike']])assert.equal(await richBlock.locator(tag).innerText(),text)
  for(const format of ['h1','h2','h3','h4','p','p-large','p-small','blockquote','pre']){
   await page.getByRole('button',{name:'Add text block',exact:true}).click()
   await page.locator('[contenteditable=true]').last().fill('Paragraph '+format);await saved()
   await layout('Paragraph style').selectOption(format);await saved()
  }
  await page.getByRole('button',{name:'Add text block',exact:true}).click()
  await page.locator('[contenteditable=true]').last().focus()
  const pasted='<h3 style="color:red">Pasted heading</h3><p><span style="font-weight:700">Pasted bold</span></p><ul><li>Outer bullet<ul><li>Nested bullet</li></ul></li></ul><ol><li>Outer number<ol><li>Nested number</li></ol></li></ol><script>window.syntheticPasteExecuted=true</script><img src="https://example.test/forbidden-image">'
  let pasteRequests=0
  await page.route('https://example.test/**',route=>{pasteRequests++;return route.abort()})
  await page.locator('[contenteditable=true]').last().evaluate((node,html)=>{const data=new DataTransfer();data.setData('text/html',html);node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}))},pasted)
  await saved();assert.equal(pasteRequests,0,'Inert paste never loads remote content')
  assert.equal(await page.evaluate(()=>window.syntheticPasteExecuted),undefined,'Pasted scripts never run')
  await page.unroute('https://example.test/**')
  await page.reload();await page.locator('[contenteditable=true]').last().locator('h3').waitFor()
  const documentBlock=page.locator('[contenteditable=true]').last()
  await documentBlock.locator('h3').waitFor()
  assert.equal(await documentBlock.locator('strong').innerText(),'Pasted bold')
  assert.equal(await documentBlock.locator('ul ul li').innerText(),'Nested bullet')
  assert.equal(await documentBlock.locator('ol ol li').innerText(),'Nested number')
  assert.equal(await documentBlock.locator('script,img,[style]').count(),0)
  assert.equal(await page.evaluate(()=>window.syntheticPasteExecuted),undefined)
  await page.locator('[contenteditable=true]').last().locator('ol ol li').waitFor()
  await documentBlock.locator('h3').click();await page.getByText('Layout settings',{exact:true}).click()
  await layout('Paragraph style').selectOption('h4');await saved();await documentBlock.locator('h4').waitFor()
  await documentBlock.locator('h4').click();await layout('Paragraph style').selectOption('h3');await saved();await documentBlock.locator('h3').waitFor()
  for(const [selector,alignment] of [['h3','center'],['p','right'],['ul > li','left'],['ol > li','justify']]){
   await documentBlock.locator(selector).first().click({position:{x:5,y:5}});await layout('Text alignment').selectOption(alignment);await saved()
   assert.equal(await documentBlock.locator(selector).first().evaluate(node=>getComputedStyle(node).textAlign),alignment)
  }
  await page.reload();await page.locator('[contenteditable=true]').last().locator('h3').waitFor()
  for(const [selector,alignment] of [['h3','center'],['p','right'],['ul > li','left'],['ol > li','justify']])assert.equal(await page.locator('[contenteditable=true]').last().locator(selector).first().evaluate(node=>getComputedStyle(node).textAlign),alignment,'Independent paragraph alignment survives reopening')
  await page.getByText('Layout settings',{exact:true}).click()
  await page.locator('[contenteditable=true]').last().click()
  await page.getByRole('button',{name:'Add text block',exact:true}).click()
  const listBlock=page.locator('[contenteditable=true]').last()
  await listBlock.fill('Toolbar first item');await saved()
  await page.getByRole('button',{name:'Bulleted list',exact:true}).click();await saved()
  await listBlock.focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await page.keyboard.insertText('Toolbar nested item')
  await page.getByRole('button',{name:'Nest list',exact:true}).click();await saved()
  await page.locator('[contenteditable=true]').last().locator('ul ul li').waitFor()
  assert.equal(await page.locator('[contenteditable=true]').last().locator('ul ul li').innerText(),'Toolbar nested item')
  await page.locator('[contenteditable=true]').last().click()
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved()
  assert.equal(await page.locator('[contenteditable=true]').last().locator('ul ul').count(),0)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved()
  await capture('rich-canvas-'+width)
  const largeOriginal=await page.evaluate(async source=>{const photo=new Image();photo.src=source;await photo.decode();const canvas=document.createElement('canvas');canvas.width=6000;canvas.height=3000;canvas.getContext('2d').drawImage(photo,0,0,6000,3000);return canvas.toDataURL('image/jpeg',0.5)},'data:image/webp;base64,'+(await readFile('public/site/cake-3.webp')).toString('base64'))
  await page.getByLabel('Add image file').setInputFiles({name:'synthetic-pane-1.jpg',mimeType:'image/jpeg',buffer:Buffer.from(largeOriginal.split(',')[1],'base64')});await saved();await page.locator('[data-image-settings]:not([hidden])').waitFor()
  await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-layout-state]').value).flatMap(section=>section.blocks).some(block=>block.image))
  await saved()
  const downsampled=(await state()).draft.site.pages.find(item=>item.slug==='services').sections.flatMap(item=>item.blocks).find(item=>item.image).image
  assert.equal(downsampled.renditions.at(-1).width,1600);assert.equal(downsampled.renditions.at(-1).height,800);assert.equal(downsampled.original,largeOriginal,'The full 6000-pixel upload is retained before browser downsampling')
  await page.getByLabel('Alternative text',{exact:true}).fill('Synthetic 6000-pixel workshop photo');await saved()
  const responsiveDraft=(await state()).draft;await call('/api/pane/publish',{revision:responsiveDraft.id})
  let phoneBytes,desktopBytes
  for(const viewportWidth of [390,1440]){
   const visitor=await browser.newContext({viewport:{width:viewportWidth,height:1000},deviceScaleFactor:1}),live=await visitor.newPage(),requests=[]
   live.on('response',response=>{if(response.url().includes('pane-image='))requests.push(response)})
   await live.goto(origin+'/site/services');const image=live.locator('[data-image-block] img');assert.ok(await image.evaluate(node=>node.getBoundingClientRect().top>innerHeight),'The responsive photo is below the fold');await image.scrollIntoViewIfNeeded();await image.evaluate(node=>node.decode())
   const selected=await image.evaluate(node=>node.currentSrc),expected=viewportWidth===390?480:1600
   assert.equal(new URL(selected).searchParams.get('width'),String(expected),'Viewport chooses a matched WebP payload')
   const payload=requests.find(response=>response.url()===selected);assert.ok(payload);assert.equal(payload.headers()['content-type'],'image/webp')
   const bytes=(await payload.body()).length;if(viewportWidth===390)phoneBytes=bytes;else desktopBytes=bytes
   assert.equal(await image.getAttribute('loading'),'lazy');assert.ok(Number(await image.getAttribute('width'))>0);assert.ok(Number(await image.getAttribute('height'))>0)
   assert.equal(requests.length,1,'The document does not download every rendition or the retained original')
   await live.screenshot({path:resolve(folder,'responsive-photo-'+viewportWidth+'.png'),fullPage:true});assert.equal(await live.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false)
   await visitor.close()
  }
  assert.ok(phoneBytes<desktopBytes,'The phone receives fewer image bytes than the desktop')
  await capture('responsive-image-settings-'+width)
  await page.getByRole('button',{name:'Delete selection',exact:true}).click();await saved()
  await page.getByLabel('Add image file').setInputFiles('public/site/cake-3.webp');await page.locator('[data-image-settings]:not([hidden])').waitFor();await saved()
  await page.getByLabel('Alternative text',{exact:true}).fill('Celebration cake with yellow flowers');await saved()
  const originalImage=(await state()).draft.site.pages.find(item=>item.slug==='services').sections.flatMap(item=>item.blocks).find(item=>item.image).image
  assert.equal(originalImage.original,'data:image/webp;base64,'+(await readFile('public/site/cake-3.webp')).toString('base64'),'Picker retains exact uploaded bytes, before PNG preparation')
  const selectedImage=async()=>(await state()).draft.site.pages.find(item=>item.slug==='services').sections.flatMap(item=>item.blocks).find(item=>item.image).image
  for(const rotation of [90,180,270]){
   await page.getByLabel('Image rotation',{exact:true}).selectOption(String(rotation));await saved()
   await page.waitForFunction(rotation=>JSON.parse(document.querySelector('[data-layout-state]').value).flatMap(section=>section.blocks).find(block=>block.image).image.rotation===rotation,rotation)
   const image=await selectedImage();assert.equal(image.rotation,rotation);assert.equal(image.original,originalImage.original)
   assert.equal(image.width,rotation===180?originalImage.width:originalImage.height);assert.equal(image.height,rotation===180?originalImage.height:originalImage.width)
   assert.equal(await page.evaluate(async({source,target,rotation})=>{
    async function pixels(src){const image=new Image();image.src=src;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d');context.drawImage(image,0,0);return {width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data}}
    const before=await pixels(source),after=await pixels(target)
    for(let y=0;y<before.height;y++)for(let x=0;x<before.width;x++){
     const tx=rotation===90?before.height-1-y:rotation===180?before.width-1-x:y
     const ty=rotation===90?x:rotation===180?before.height-1-y:before.width-1-x
     for(let channel=0;channel<4;channel++)if(Math.abs(before.data[(y*before.width+x)*4+channel]-after.data[(ty*after.width+tx)*4+channel])>1)return false
    }
    return true
   },{source:originalImage.src,target:image.src,rotation}),true,'Each quarter turn rotates the actual retained pixels')
   await page.locator('[data-image-block] img').evaluate(node=>node.decode());const currentSource=await page.locator('[data-image-block] img').evaluate(node=>node.currentSrc);assert.ok(image.renditions.some(item=>item.src===currentSource),'The rotated canvas selects one of the newly rotated responsive payloads')
  }
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal((await selectedImage()).rotation,180)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();assert.equal((await selectedImage()).rotation,270)
  await page.reload();await page.locator('[data-image-block]').click();assert.equal(await page.getByLabel('Image rotation',{exact:true}).inputValue(),'270')
  await page.getByRole('button',{name:'Reset image crop',exact:true}).click();await saved();assert.equal((await selectedImage()).src,originalImage.src);assert.equal((await selectedImage()).rotation,0)
  for(const ratio of ['1:1','4:3','3:2','16:9','free']){
   if(ratio==='1:1'){await page.getByLabel('Image aspect ratio',{exact:true}).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown')}else await page.getByLabel('Image aspect ratio',{exact:true}).selectOption(ratio)
   if(ratio==='free'){await page.getByLabel('Free crop width',{exact:true}).fill('5');await page.getByLabel('Free crop height',{exact:true}).fill('4')}
   await saved();const expected=ratio==='free'?1.25:Number(ratio.split(':')[0])/Number(ratio.split(':')[1])
   assert.ok(Math.abs(await page.locator('[data-image-block] img').evaluate(node=>node.getBoundingClientRect().width/node.getBoundingClientRect().height)-expected)<0.01,'Chosen image crop ratio')
  }
  await page.getByLabel('Focal point horizontal',{exact:true}).fill('65');await page.getByLabel('Focal point vertical',{exact:true}).fill('30');await saved()
  assert.equal(await page.locator('[data-image-block] img').evaluate(node=>getComputedStyle(node).objectPosition),'65% 30%')
  await page.getByRole('button',{name:'Reset image crop',exact:true}).click();await saved()
  assert.ok(Math.abs(await page.locator('[data-image-block] img').evaluate(node=>node.getBoundingClientRect().width/node.getBoundingClientRect().height)-originalImage.width/originalImage.height)<0.01,'Reset restores original image proportions')
  assert.equal((await state()).draft.site.pages.find(item=>item.slug==='services').sections.flatMap(item=>item.blocks).find(item=>item.image).image.src,originalImage.src,'Crop never replaces original pixels')
  await page.getByLabel('Image aspect ratio',{exact:true}).selectOption('4:3');await page.getByLabel('Focal point horizontal',{exact:true}).fill('65');await page.getByLabel('Focal point vertical',{exact:true}).fill('30');await saved()
  await page.reload();await page.locator('[data-image-block] img').waitFor();await page.locator('[data-image-block]').click()
  assert.equal(await page.getByLabel('Image aspect ratio',{exact:true}).inputValue(),'4:3');assert.equal(await page.getByLabel('Focal point horizontal',{exact:true}).inputValue(),'65');await capture('image-crop-canvas-'+width)
  // Formatting controls are named text buttons; existing icon controls have tooltips.
  assert.equal(await page.getByRole('button',{name:'Bold',exact:true}).count(),1)
  await page.getByText('Layout settings',{exact:true}).click();await capture('native-canvas-settings-'+width)
  assert.equal(await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(node=>!node.textContent.trim()&&node.querySelector('svg')&&!node.dataset.tip).length),0,'Canvas icon control tooltip audit')
  await page.locator('.canvas-toolbar h1').click();await page.evaluate(()=>document.querySelectorAll('[data-selected]').forEach(node=>node.removeAttribute('data-selected')))
  const boxes=async()=>page.locator('[data-block]').evaluateAll(nodes=>{const root=nodes[0].closest('.public-content').getBoundingClientRect();return nodes.map(node=>{const box=node.getBoundingClientRect();return {id:node.dataset.block,x:box.x-root.x,y:box.y-root.y,width:box.width,height:box.height}})})
  // Remove editor chrome before the content-only crop so raster origins match.
  // The public page subtree and its layout rules remain unchanged.
  await page.locator('.canvas-toolbar,.canvas-tools').evaluateAll(nodes=>nodes.forEach(node=>node.style.display='none'))
  const canvasBoxes=await boxes(),canvasImage=await page.locator('[data-layout-canvas] .public-content').screenshot({path:resolve(folder,'native-canvas-content-'+width+'.png')})
  draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site/services');await page.evaluate(()=>document.fonts.ready)
  const liveBoxes=await boxes();const liveImage=await page.locator('.public-content').screenshot({path:resolve(folder,'native-live-content-'+width+'.png')})
  assert.equal(liveBoxes.length,canvasBoxes.length)
  for(let index=0;index<liveBoxes.length;index++)for(const key of ['x','y','width','height'])assert.ok(Math.abs(liveBoxes[index][key]-canvasBoxes[index][key])<=2,`Native block ${key} parity at ${width}`)
  const difference=comparePng(liveImage,canvasImage,{maxDiffPixelRatio:0.005,threshold:0});if(difference?.diff)await writeFile(resolve(folder,'native-parity-diff-'+width+'.png'),difference.diff);assert.ok(!difference,difference?.errorMessage)
  await writeFile(resolve(folder,'native-geometry-'+width+'.json'),JSON.stringify({canvas:canvasBoxes,live:liveBoxes,maxGeometryDifference:Math.max(...liveBoxes.flatMap((box,index)=>['x','y','width','height'].map(key=>Math.abs(box[key]-canvasBoxes[index][key])))),pixelDifferenceLimit:0.005},null,2))
  for(const [tag,text] of [['strong','Bold'],['em','italic'],['u','underline'],['s','strike']])assert.equal(await page.locator('[data-block] '+tag).filter({hasText:new RegExp('^'+text+'$')}).innerText(),text)
  for(const tag of ['h1','h2','h3','h4','blockquote','pre'])assert.ok(await page.locator(tag+'[data-block]').count())
  assert.equal(await page.locator('ul ul li').filter({hasText:/^Nested bullet$/}).innerText(),'Nested bullet');assert.equal(await page.locator('ol ol li').innerText(),'Nested number')
  for(const [tag,alignment] of [['h3','center'],['p','right'],['li','left'],['li','justify']])assert.ok(await page.locator(`[data-block] ${tag}[data-text-align="${alignment}"]`).count(),'Published paragraph alignment')
  assert.equal(await page.locator('.pane-p-large').count(),1);assert.equal(await page.locator('.pane-p-small').count(),1)
  assert.equal(await page.locator('[data-image-block] img').evaluate(node=>getComputedStyle(node).objectPosition),'65% 30%')
  assert.ok(Math.abs(await page.locator('[data-image-block] img').evaluate(node=>node.getBoundingClientRect().width/node.getBoundingClientRect().height)-4/3)<0.01)
  await capture('native-live-'+width)
  // A real photo is the first visual section on the published home page.
  const heroSite=structuredClone((await state()).draft.site),heroImage=structuredClone(originalImage)
  heroImage.crop={ratio:'1:1',width:1,height:1,x:65,y:30}
  heroSite.pages.find(item=>item.slug==='home').body=heroImage.alt
  heroSite.pages.find(item=>item.slug==='home').sections=[{id:'synthetic-pane-hero',kind:'text',blocks:[{id:'synthetic-pane-photo',kind:'image',text:heroImage.alt,image:heroImage,column:1,span:12,row:1}]}]
  draft=await call('/api/pane/prepare',{site:heroSite});await call('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site');await page.locator('[data-image-block] img').evaluate(image=>image.decode());await capture('hero-cropped-live-'+width)
  const visibleSubject=await page.locator('[data-image-block] img').evaluate(image=>{
   const box=image.getBoundingClientRect(),scale=Math.max(box.width/image.naturalWidth,box.height/image.naturalHeight)
   // The upper yellow-flower cluster occupies this rectangle in the uploaded image.
   return [[.30,.02],[.62,.36]].every(([sx,sy])=>{
    const x=image.naturalWidth*sx*scale+(box.width-image.naturalWidth*scale)*.65
    const y=image.naturalHeight*sy*scale+(box.height-image.naturalHeight*scale)*.30
    return x>=0&&x<=box.width&&y>=0&&y<=box.height
   })
  });assert.equal(visibleSubject,true,'The chosen subject focal point remains inside the published hero')
  assert.ok(!(await page.content()).includes(heroImage.original),'Live hero does not disclose original upload bytes')
  await page.goto(origin+'/app/canvas?page=home');await page.locator('[data-image-block]').click()
  await page.getByLabel('Image rotation',{exact:true}).selectOption('90');await saved()
  await page.reload();await page.locator('[data-image-block]').click();assert.equal(await page.getByLabel('Image rotation',{exact:true}).inputValue(),'90')
  await capture('hero-rotated-canvas-'+width)
  await page.getByRole('button',{name:'Reset image crop',exact:true}).click();await saved()
  const reset=(await state()).draft.site.pages.find(item=>item.slug==='home').sections[0].blocks[0].image
  assert.equal(reset.src,originalImage.src);assert.equal(reset.original,originalImage.original);assert.equal(reset.rotation,0);assert.equal(reset.crop,undefined)
  await capture('hero-reset-canvas-'+width)
  draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id});await page.goto(origin+'/site')
  await page.locator('[data-image-block] img').evaluate(image=>image.decode());assert.ok((await page.locator('[data-image-block] img').getAttribute('src')).includes('pane-image='))
  assert.ok(await page.locator('[data-image-block] img').evaluate((image,ratio)=>Math.abs(image.naturalWidth-ratio*image.naturalHeight)<=1,originalImage.width/originalImage.height),'Responsive density correction preserves the original proportions within one rounded pixel')
  await capture('hero-reset-live-'+width)
  console.log('Native canvas geometry, pixel parity and conflict safety passed at '+width+'.')


 }
 console.log(process.env.PANE_CANVAS_ONLY?'Native canvas and reversible image journey passed at 1440 and 390.':'Reusable components and isolated custom code journey passed at 1440 and 390: five pages, one edit, usage, detached copy, undo and redo, approved live code, CSS, scoped headers, goals, consent, withdrawal, privacy refusals and workspace isolation.')
}catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});await writeFile(resolve(folder,'failure.html'),await page.content());await writeFile(resolve(folder,'failure-state.json'),JSON.stringify(await state()));throw error}finally{await browser.close();await fixture.stop()}
