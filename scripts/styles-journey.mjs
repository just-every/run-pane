import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

/** Exercised by the existing core browser journey, using native draft and approval doors. */
export async function siteStylesJourney({page,context,origin,folder}){
 const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
 const state=async()=>(await context.request.get(origin+'/api/pane')).json()
 const saved=async()=>{await page.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.');await page.waitForTimeout(80)}
 const uploadFont=async path=>{const count=await page.locator('[data-font-state]').evaluate(field=>JSON.parse(field.value).length);await page.getByLabel('Upload font',{exact:true}).setInputFiles(path);await page.waitForFunction(count=>JSON.parse(document.querySelector('[data-font-state]').value).length===count+1,count);await saved()}
 const baseline=(await state()).draft?.site
 const initial=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 const services=initial.pages.find(page=>page.slug==='services'),override='Each commission has its own workshop plan.'
 const section=(id,text,background)=>({id,kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,...(background?{background}:{}),blocks:[{id:id+'-text',kind:'text',format:'p',text,column:1,span:12,row:1,order:0,align:'left',vertical:'start'}]})
 services.sections=[section('workshop-services',services.body),section('workshop-local',override,'#fff7ed')];services.body+='\n\n'+override
 initial.navigation={main:initial.pages.map(item=>({label:item.title,page:item.slug,cta:item.slug==='contact'}))}
 async function screen(name,width){
  await page.evaluate(()=>document.fonts.ready)
  await page.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'))
  const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))})
  assert.deepEqual(violations,[],name+' accessibility')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')
  const iconOnly=await page.locator('button,a[href],summary').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()&&!node.dataset.tip&&!node.textContent.trim()).map(node=>node.outerHTML.slice(0,100)))
  assert.deepEqual(iconOnly,[],name+' icon tooltips')
  await page.screenshot({path:resolve(folder,`styles-${name}-${width}.png`),fullPage:true})
 }
 async function rendered(id){
  await page.evaluate(()=>document.fonts.ready)
  const actual=await page.evaluate(id=>{
   const heading=document.querySelector('.public-main h1'),body=document.querySelector('.public-content p'),button=document.querySelector('.public-menu-cta')
   const canvas=document.createElement('canvas').getContext('2d'),measure=family=>{canvas.font='32px '+family;return canvas.measureText('Workshop furniture repairs').width}
   return {heading:getComputedStyle(heading).fontFamily,body:getComputedStyle(body).fontFamily,loaded:[...document.fonts].some(font=>font.family.replaceAll('"','')==='Pane-'+id&&font.status==='loaded'),local:performance.getEntriesByType('resource').some(entry=>new URL(entry.name).origin===location.origin&&new URL(entry.name).searchParams.get('pane-font')===id),primary:getComputedStyle(button).backgroundColor,radius:getComputedStyle(button).borderRadius,spacing:getComputedStyle(document.querySelector('.public-main')).paddingTop,distinct:measure(getComputedStyle(heading).fontFamily)!==measure(getComputedStyle(body).fontFamily)}
  },id)
  assert.match(actual.heading,new RegExp('Pane-'+id));assert.match(actual.body,/Figtree/)
  assert.ok(actual.loaded&&actual.local&&actual.distinct,'The uploaded font actually loads from this origin and differs from the body face')
  assert.equal(actual.primary,'rgb(7, 89, 133)');assert.equal(actual.radius,'999px');assert.equal(actual.spacing,'80px')
 }
 for(const width of [1440,390]){
  console.log('Site styles: opening settings at '+width)
  await page.setViewportSize({width,height:1000})
  const first=await call('/api/pane/prepare',{site:initial});await call('/api/pane/publish',{revision:first.id})
  await page.goto(origin+'/site');const originalFont=await page.locator('.public-main h1').evaluate(el=>getComputedStyle(el).fontFamily)
  await page.goto(origin+'/app');await page.locator('[data-site-style-settings] > summary').click()
  const ordinary=await page.getByLabel('Text',{exact:true}).inputValue();await page.getByLabel('Text',{exact:true}).fill(ordinary+'\n\nA draft text edit.');await saved();assert.equal((await state()).draft.site.styles,undefined,'Ordinary text editing preserves the approved style defaults');await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Text',{exact:true}).inputValue(),ordinary)
  await page.getByRole('radio',{name:'Desktop',exact:true}).check()
  await page.getByLabel('Heading font',{exact:true}).selectOption('notoDisplay');await saved()
  await page.waitForFunction(()=>{const node=document.querySelector('[data-style-preview] .public-main h1');return node&&getComputedStyle(node).fontFamily.includes('Noto Serif Display')&&[...document.fonts].some(face=>face.family.replaceAll('\"','').replaceAll("'",'')==='Noto Serif Display'&&face.status==='loaded')})
  await uploadFont('public/fonts/noto-serif/noto-serif-latin-wght-normal.woff2')
  const font=(await state()).draft.site.styles.fonts[0]
  for(const format of ['woff','ttf','otf']){
   await uploadFont('tests/fonts/synthetic-pane.'+format)
   const added=(await state()).draft.site.styles.fonts.at(-1)
   await page.getByLabel('Body font',{exact:true}).selectOption(added.id);await saved()
   await page.waitForFunction(id=>{const node=document.querySelector('[data-style-preview] .public-content p');return node&&getComputedStyle(node).fontFamily.includes(id)&&[...document.fonts].some(face=>face.family.replaceAll('\"','')==='Pane-'+id&&face.status==='loaded')},added.id)
  }
  await page.getByLabel('Body font',{exact:true}).selectOption('figtree');await saved()
  await page.getByLabel('Heading font',{exact:true}).selectOption(font.id)
  await page.getByLabel('Primary color',{exact:true}).fill('#075985')
  await page.getByLabel('Button shape',{exact:true}).selectOption('pill')
  const initialSpacing=await page.getByLabel('Page spacing',{exact:true}).inputValue()
  await page.getByLabel('Page spacing',{exact:true}).fill('40');await saved()
  let draft=(await state()).draft
  const preview=page.locator('[data-style-preview]');await preview.locator('.public-main h1').waitFor()
  await page.waitForFunction(id=>document.querySelector('[data-style-preview] .public-main h1')&&getComputedStyle(document.querySelector('[data-style-preview] .public-main h1')).fontFamily.includes(id),font.id)
  console.log('Site styles: draft preview loaded at '+width)
  await screen('settings',width)
  await page.locator('[data-style-preview]').scrollIntoViewIfNeeded();await screen('settings-preview',width)
  const avatar=page.locator('.avatar[data-tip]').first();await page.keyboard.press('Tab');await avatar.focus();assert.equal(await page.getByRole('tooltip').innerText(),'Account and team');await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Page spacing',{exact:true}).inputValue(),initialSpacing)
  await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Page spacing',{exact:true}).inputValue(),'40')
  await page.reload();await page.getByRole('radio',{name:'Desktop',exact:true}).check();assert.equal(await page.locator('.pill-changes').innerText(),initial.pages.length+' of '+initial.pages.length+' pages changed');await page.locator('[data-site-style-settings] > summary').click()
  await screen('settings-saved',width)
  const stale=await context.newPage();await stale.goto(origin+'/app');await stale.locator('[data-site-style-settings] > summary').click()
  await page.getByLabel('Section background',{exact:true}).fill('#f0f9ff');await saved()
  await stale.getByLabel('Primary color',{exact:true}).fill('#064e3b');await stale.locator('[data-conflict]:not([hidden])').waitFor()
  assert.equal(await stale.getByLabel('Primary color',{exact:true}).inputValue(),'#064e3b')
  assert.match(await stale.locator('[data-latest]').innerText(),/#075985/,'Conflict comparison includes the winning style')
  const downloadPromise=stale.waitForEvent('download');await stale.getByRole('button',{name:'Download my copy'}).click();const download=await downloadPromise,copy=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(copy['styles.primary'],'#064e3b');assert.ok(JSON.parse(copy['styles.fonts'])[0].data,'Conflict copy retains font bytes')
  await page.screenshot({path:resolve(folder,`styles-saved-${width}.png`),fullPage:true})
  await stale.getByRole('button',{name:'Use latest draft'}).click();await stale.waitForLoadState('domcontentloaded');await stale.close()
  draft=(await state()).draft
  await page.goto(origin+'/app/canvas?page=services');await rendered(font.id);await screen('canvas',width)
  for(const slug of ['home','services','contact']){await page.goto(origin+'/preview/'+draft.id+'/'+slug);await rendered(font.id);if(slug==='services'){assert.equal(await page.locator('[data-section=workshop-services]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(240, 249, 255)');assert.equal(await page.locator('[data-section=workshop-local]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 247, 237)')}await screen('preview-'+slug,width)}
  await page.goto(origin+'/app');await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).click()])
  for(const slug of ['home','services','contact']){await page.goto(origin+(slug==='home'?'/site':'/site/'+slug));await rendered(font.id);await screen('live-'+slug,width)}
  const before=(await state()).revisions.filter(row=>[first.id,draft.id].includes(row.id))
  await page.goto(origin+'/app/sites');const restore=page.locator('form[action="/app/rollback"]').filter({has:page.locator(`input[value="${first.id}"]`)})
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),restore.getByRole('button').click()])
  await page.goto(origin+'/site');assert.equal(await page.locator('.public-main h1').evaluate(el=>getComputedStyle(el).fontFamily),originalFont);assert.equal(await page.locator('[data-site-styles]').count(),0)
  assert.deepEqual((await state()).revisions.filter(row=>[first.id,draft.id].includes(row.id)),before,'Publication and rollback preserve both complete style revisions')
  assert.equal((await context.request.get(origin+'/site?pane-font='+font.id+'&pane-revision='+draft.id)).status(),404)
  await screen('rollback',width)
 }
 if(baseline){const restored=await call('/api/pane/prepare',{site:baseline});await call('/api/pane/publish',{revision:restored.id})}
 console.log('Site style journey passed: owner upload, separate heading and body rendering, same-origin font loading, autosave, undo and redo, retained conflict copy, three-page preview and publication, immutable rollback, axe and no overflow at 1440 and 390.')
}
