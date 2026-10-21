import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs')
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage(),origin=fixture.origin
page.setDefaultTimeout(20000)
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/redirects');await mkdir(folder,{recursive:true})
const post=(path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data})
const dashboard=async()=>(await context.request.get(origin+'/api/pane')).json()
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-save-status]').textContent==='Draft saved. Not published.',undefined,{timeout:20000})
async function capture(name,width){await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} overflow at ${width}`)}
const csv=rows=>['from,to,status',...rows.map(row=>row.map(value=>{const text=String(value);return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text}).join(','))].join('\r\n')
try {
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
 await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const prepared=await post('/api/pane/prepare',{site});assert.equal(prepared.status(),200)
 await post('/api/pane/publish',{revision:(await prepared.json()).id})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  let state=await dashboard();const source=state.live.site.pages.find(item=>(item.id??item.slug)==='about').slug
  await page.goto(origin+'/app?page='+source);await page.getByText('Pages and folders',{exact:true}).click()
  await page.locator('[data-page-id="about"]').getByLabel('Address',{exact:true}).fill('our-story-'+width);await saved()
  await page.reload();await page.getByText('Redirects',{exact:true}).click()
  const offer=page.locator('[data-redirect-offer]').filter({has:page.locator(`[name="redirect.offer.${encodeURIComponent('/site/'+source)}.accept"]`)})
  assert.equal(await offer.count(),1)
  await offer.getByLabel('Add this redirect?',{exact:true}).selectOption('yes');await saved()
  const add=page.locator('[data-redirect-add-fields]')
  await add.getByLabel('From',{exact:true}).fill('/site/special-'+width)
  await add.getByLabel('To',{exact:true}).fill('/site/contact?booking=consultation')
  await add.getByLabel('Redirect status',{exact:true}).selectOption('302')
  await add.getByRole('button',{name:'Add redirect',exact:true}).click();await saved()
  const rows=Array.from({length:200},(_,index)=>['/site/legacy-'+width+'-'+index,'/site/'+(index%2?'contact':'services')+'?topic=wood,care&source='+index,index%2?302:301])
  await page.getByLabel('Import CSV',{exact:true}).fill(csv(rows))
  await page.getByRole('button',{name:'Import redirects',exact:true}).click();await saved()
  await capture('imported-redirect-map',width)
  const unchanged=await context.request.get(origin+'/site/'+source,{maxRedirects:0});assert.equal(unchanged.status(),200,'Imported redirects remain drafts until owner publication')
  for(let step=0;step<2;step++){
   if(step)await page.getByRole('button',{name:'Redo',exact:true}).click()
   else await page.getByRole('button',{name:'Undo',exact:true}).click()
   await saved()
  }
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).click()])
  for(const [from,to,status] of [...rows,['/site/'+source,'/site/our-story-'+width,301],['/site/special-'+width,'/site/contact?booking=consultation',302]]){
   const response=await context.request.get(origin+from,{maxRedirects:0})
   assert.equal(response.status(),status,from);assert.equal(response.headers().location,to,from)
  }
  state=await dashboard()
  assert.equal(state.live.site.redirects.filter(row=>row.from.startsWith('/site/legacy-'+width+'-')).length,200)
  await page.goto(origin+'/site/our-story-'+width);await capture('renamed-published-page',width)
  // Retarget one row through individual controls, then remove it from the map.
  await page.goto(origin+'/app');await page.getByText('Redirects',{exact:true}).click()
  const revise=page.locator('[data-redirect-add-fields]')
  await revise.getByLabel('From',{exact:true}).fill('/site/special-'+width)
  await revise.getByLabel('To',{exact:true}).fill('/site/services')
  await revise.getByLabel('Redirect status',{exact:true}).selectOption('301')
  await revise.getByRole('button',{name:'Add redirect',exact:true}).click();await saved()
  let revision=(await dashboard()).draft
  await post('/api/pane/publish',{revision:revision.id})
  const retargeted=await context.request.get(origin+'/site/special-'+width,{maxRedirects:0});assert.equal(retargeted.status(),301);assert.equal(retargeted.headers().location,'/site/services')
  const map=page.getByLabel('Redirect map (CSV)',{exact:true}),before=await map.inputValue()
  const edited=before.split('\n').filter(line=>!line.startsWith('/site/special-'+width+',')).join('\n')
  await map.fill(edited);await saved()
  const draft=(await dashboard()).draft
  assert.equal(draft.site.redirects.some(row=>row.from==='/site/special-'+width),false)
  assert.equal(state.live.site.redirects.some(row=>row.from==='/site/special-'+width),true)
  await post('/api/pane/publish',{revision:draft.id})
  assert.equal((await context.request.get(origin+'/site/special-'+width,{maxRedirects:0})).status(),404)
  await post('/api/pane/rollback',{revision:state.live.id})
  const restored=await context.request.get(origin+'/site/special-'+width,{maxRedirects:0});assert.equal(restored.status(),302)
 }
 console.log('Redirect manager journey passed at 1440/390: published slug offer accepted, individual 302, quoted 200-row CSV import, every status/target, undo/redo, draft isolation, deletion and rollback.')
} catch(error){await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});console.error(await page.locator('[data-save-status]').allTextContents());throw error}
finally{await browser.close();await fixture.stop()}
