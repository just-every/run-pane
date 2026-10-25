import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
const fixture=await import('../tests/browser-runtime.mjs'),origin=fixture.origin
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/devices')
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
const errors=[];page.on('pageerror',error=>errors.push(error.message))
const state=async()=>(await context.request.get(origin+'/api/pane')).json()
const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
const saved=async()=>{await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.');await page.waitForTimeout(80)}
const field=label=>page.getByLabel(label,{exact:true})
const selectBlock=id=>page.locator(`[data-block="${id}"]`).click()
const selectSection=id=>page.locator(`[data-section="${id}"]`).focus()
const block=(id,text,column,span,row)=>({id,kind:'text',text,column,span,row,order:0,align:'left',vertical:'start'})
const site={name:'Riverbend Workshop',description:'Practical repairs and thoughtful craft.',pages:[{slug:'home',title:'Repairs that last',body:'Furniture repairs\n\nRestore a favourite chair or table with our experienced local team.\n\nVisit our workshop',sections:[{id:'services',kind:'columns',ratio:'2:1',gap:24,paddingTop:64,paddingBottom:64,blocks:[block('heading','Furniture repairs',1,8,1),block('detail','Restore a favourite chair or table with our experienced local team.',9,4,1)]},{id:'visit',kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks:[block('invitation','Visit our workshop',1,12,1)]}]}]}
async function boxes(){return page.locator('[data-block]').evaluateAll(nodes=>{const root=nodes[0].closest('.public-content').getBoundingClientRect();return nodes.filter(node=>node.getClientRects().length).map(node=>{const b=node.getBoundingClientRect();return {id:node.dataset.block,x:b.x-root.x,y:b.y-root.y,width:b.width,height:b.height}})})}
function equalBoxes(actual,expected,label){assert.equal(actual.length,expected.length,label);for(const box of actual){const other=expected.find(item=>item.id===box.id);assert.ok(other,label+' block identity');for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-other[key])<=2,`${label}: ${box.id} ${key}`)}}
async function capture(name){await page.screenshot({path:resolve(folder,name+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' outer overflow')}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
 for(const width of [1440,390]){
  await call('/api/pane/prepare',{site});await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/canvas?page=home');await page.locator('[contenteditable=true]').first().waitFor()
  for(const preview of ['1440','768','390']){await field('Device preview').selectOption(preview);await page.waitForFunction(expected=>document.querySelector('.public-site').getBoundingClientRect().width===expected,Number(preview));assert.equal(await page.locator('.public-site').evaluate(node=>node.getBoundingClientRect().width),Number(preview));await capture('preview-'+preview+'-screen-'+width)}
  await field('Device preview').selectOption('1440');const desktopBefore=await boxes()
  await field('Device preview').selectOption('390');const stacked=await boxes();assert.ok(stacked[1].y>stacked[0].y,'Phone defaults stack in reading order');assert.equal(stacked[0].width,stacked[1].width)
  await selectBlock('detail');await page.getByRole('button',{name:'Move earlier',exact:true}).click();await saved()
  await page.getByText('Layout settings',{exact:true}).click();await field('Column span').fill('8');await saved();await field('First column').fill('2');await saved()
  const reordered=await boxes();assert.ok(reordered.find(item=>item.id==='detail').y<reordered.find(item=>item.id==='heading').y,'Phone reorder moves detail above heading');assert.deepEqual(await page.locator('[data-section="services"] [data-block]').evaluateAll(nodes=>nodes.map(node=>node.dataset.block)),['detail','heading'],'Phone DOM reading order matches the visual order')
  await selectSection('services');await field('Top padding').fill('12');await field('Bottom padding').fill('16');await field('Minimum height').selectOption('medium');await saved()
  await selectBlock('heading');await field('Hide selection on phones').check();await saved();assert.equal(await page.locator('[data-block="heading"]').isVisible(),false)
  await page.getByRole('button',{name:'Reset layout',exact:true}).click();await saved();assert.equal(await page.locator('[data-block="heading"]').isVisible(),true);assert.equal(await page.locator('[data-block="heading"]').getAttribute('data-phone-override'),null)
  // Reorder after reset to retain independent rows for every arranged block.
  await selectBlock('detail');await page.getByRole('button',{name:'Move later',exact:true}).click();await saved();await page.getByRole('button',{name:'Move earlier',exact:true}).click();await saved()
  await selectSection('visit');await field('Hide selection on phones').check();await saved();assert.equal(await page.locator('[data-section="visit"]').isVisible(),false)
  await capture('phone-settings-'+width)
  await field('Device preview').selectOption('1440');equalBoxes(await boxes(),desktopBefore,'Phone edits leave desktop unchanged')
  await selectBlock('detail');await field('Column span').fill('3');await saved();const arranged=(await state()).draft.site.pages[0].sections[0].blocks.map(item=>item.phone)
  await field('Device preview').selectOption('390');assert.deepEqual((await state()).draft.site.pages[0].sections[0].blocks.map(item=>item.phone),arranged,'Desktop resize preserves arranged phone geometry')
  const phoneBefore=await boxes();await field('Device preview').selectOption('1440');await field('Column span').fill('4');await saved();await selectSection('services');await field('Top padding').fill('120');await field('Column gap').fill('40');await field('Minimum height').selectOption('large');await saved();await field('Device preview').selectOption('390');equalBoxes(await boxes(),phoneBefore,'Desktop resize and section settings cannot move phone blocks');await field('Device preview').selectOption('1440');await field('Top padding').fill('64');await field('Column gap').fill('24');await field('Minimum height').selectOption('auto');await saved();await field('Device preview').selectOption('390')
  await page.reload();await page.locator('[contenteditable=true]').first().waitFor();await field('Device preview').selectOption('390');equalBoxes(await boxes(),phoneBefore,'Reopen retains phone arrangement')
  assert.ok(await page.locator('[data-phone-override]').count());assert.match(await page.locator('[data-device-status]').innerText(),/independent/)
  assert.equal(await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(node=>!node.textContent.trim()&&node.querySelector('svg')&&!node.dataset.tip).length),0,'Icon controls have tooltips')

  const draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
  for(const viewport of [390,1440]){
   await field('Device preview').selectOption(String(viewport));await page.evaluate(()=>document.fonts.ready);const canvas=await boxes();await capture('canvas-'+viewport+'-screen-'+width)
   await page.setViewportSize({width:viewport,height:1000});await page.goto(origin+'/site');await page.evaluate(()=>document.fonts.ready);const live=await boxes();equalBoxes(live,canvas,'Canvas and live geometry '+viewport);assert.equal(await page.locator('[data-section="visit"]').isVisible(),viewport===1440);if(viewport===1440)equalBoxes(live,desktopBefore,'Live desktop unchanged')
   await capture('live-'+viewport+'-screen-'+width);await writeFile(resolve(folder,'geometry-'+viewport+'-screen-'+width+'.json'),JSON.stringify({canvas,live},null,2));await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/canvas?page=home');await page.locator('[contenteditable=true]').first().waitFor()
  }
 }
 assert.deepEqual(errors,[])
 console.log('Device canvas journey passed: real device widths, automatic stacking, independent phone order, move, resize, height, padding, block and section visibility, reset, desktop isolation, reopening, tooltips and two-pixel live parity at both screen widths.')
}catch(error){console.error('Browser errors',errors);console.error(await page.locator('[data-layout-canvas]').evaluate(node=>({canvas:node.getBoundingClientRect().width,device:document.querySelector('[data-layout-device]').value,rules:[...(document.querySelector('style[data-pane-layout]').sheet?.cssRules??[])].map(r=>r.cssText)})));await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true});throw error}finally{await browser.close();await fixture.stop()}
