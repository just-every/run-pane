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
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
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
  assert.equal(await page.locator('[contenteditable=true]').last().evaluate(node=>getComputedStyle(node).gridColumn),'2 / span 6')
  assert.equal(await page.locator('[contenteditable=true]').last().evaluate(node=>getComputedStyle(node).textAlign),'right')
  await page.getByRole('button',{name:'Reset layout',exact:true}).click();await saved();assert.equal(await layout('Column span').inputValue(),'12')
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await layout('Column span').inputValue(),'6')
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();await page.getByRole('button',{name:'Undo',exact:true}).click();await saved()
  await page.getByRole('button',{name:'Add section',exact:true}).click();await page.locator('[contenteditable=true]').last().fill('Native second section');await saved()
  await page.locator('[data-layout-canvas] [data-section]').last().focus();await page.getByRole('button',{name:'Duplicate selection',exact:true}).click();await saved();assert.equal(await page.locator('[data-layout-canvas] [data-section]').count(),3)
  await page.getByRole('button',{name:'Delete selection',exact:true}).click();await saved();assert.equal(await page.locator('[data-layout-canvas] [data-section]').count(),2)
  await page.locator('[data-layout-canvas] [data-section]').last().dragTo(page.locator('[data-layout-canvas] [data-section]').first());await saved()
  assert.match(await page.locator('[data-layout-canvas] [data-section]').first().innerText(),/Native second section/)
  await page.locator('[data-layout-canvas] [data-section]').first().focus();await page.getByRole('button',{name:'Move later',exact:true}).focus();await page.keyboard.press('Enter');await saved()
  assert.match(await page.locator('[data-layout-canvas] [data-section]').first().innerText(),/Native heading/)
  await page.reload();await page.locator('[contenteditable=true]').first().waitFor();assert.equal(await page.locator('h2[data-block]').innerText(),'Native heading','Canvas reopen keeps semantic text and layout')
  await page.getByText('Layout settings',{exact:true}).click();await capture('native-canvas-settings-'+width)
  assert.equal(await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(node=>!node.textContent.trim()&&node.querySelector('svg')&&!node.dataset.tip).length),0,'Canvas icon control tooltip audit')
  await page.locator('.canvas-toolbar h1').click();await page.evaluate(()=>document.querySelectorAll('[data-selected]').forEach(node=>node.removeAttribute('data-selected')))
  const boxes=async()=>page.locator('[data-block]').evaluateAll(nodes=>{const root=nodes[0].closest('.public-content').getBoundingClientRect();return nodes.map(node=>{const box=node.getBoundingClientRect();return {id:node.dataset.block,x:box.x-root.x,y:box.y-root.y,width:box.width,height:box.height}})})
  const canvasBoxes=await boxes(),canvasImage=await page.locator('[data-layout-canvas] .public-content').screenshot({path:resolve(folder,'native-canvas-content-'+width+'.png')})
  draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
  await page.goto(origin+'/site/services');await page.evaluate(()=>document.fonts.ready)
  const liveBoxes=await boxes(),liveImage=await page.locator('.public-content').screenshot({path:resolve(folder,'native-live-content-'+width+'.png')})
  assert.equal(liveBoxes.length,canvasBoxes.length)
  for(let index=0;index<liveBoxes.length;index++)for(const key of ['x','y','width','height'])assert.ok(Math.abs(liveBoxes[index][key]-canvasBoxes[index][key])<=2,`Native block ${key} parity at ${width}`)
  const difference=comparePng(liveImage,canvasImage,{maxDiffPixelRatio:0.005,threshold:0});assert.equal(difference,null,difference?.errorMessage)
  await capture('native-live-'+width)


 }
 console.log('Reusable components and isolated custom code journey passed at 1440 and 390: five pages, one edit, usage, detached copy, undo and redo, approved live code, CSS, scoped headers, goals, consent, withdrawal, privacy refusals and workspace isolation.')
}catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});await writeFile(resolve(folder,'failure.html'),await page.content());await writeFile(resolve(folder,'failure-state.json'),JSON.stringify(await state()));throw error}finally{await browser.close();await fixture.stop()}
