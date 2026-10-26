import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
/** Runs inside the existing native components journey and its authenticated fixture. */
export async function galleryBrandJourney({page,context,origin,state,call,saved,folder}){
 const shots=[]
 const capture=async name=>{await page.screenshot({path:resolve(folder,name+'.png'),fullPage:true});shots.push(name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow')}
 const initial={name:'Riverbend Bakery',description:'Celebration cakes, fresh bread and pastry from our neighbourhood bakery.',pages:[{slug:'home',title:'A gallery of celebrations',body:'Made for your occasion',search:{title:'Riverbend cake gallery',description:'Our recent celebration cakes and pastries.'}},{slug:'visit',title:'Visit the bakery',body:'Come in for a slice.',search:{title:'Visit Riverbend',description:'Plan your visit to our local bakery.'}}]}
 await call('/api/pane/prepare',{site:initial});await page.goto(origin+'/app/canvas?page=home');await page.locator('[contenteditable=true]').waitFor()
 const uploads=await page.evaluate(async()=>{
  const image=new Image();image.src='/site/cake-3.webp';await image.decode()
  return Array.from({length:24},(_,i)=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=i%3===0?128:96;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);return {name:`Celebration cake ${i+1}.jpg`,mimeType:'image/jpeg',base64:canvas.toDataURL('image/jpeg',.7).split(',')[1]}})
 })
 await page.getByRole('button',{name:'Add gallery',exact:true}).click()
 await page.getByLabel('Add gallery images',{exact:true}).setInputFiles(uploads.map(({base64,...file})=>({...file,buffer:Buffer.from(base64,'base64')})))
 await page.waitForFunction(()=>document.querySelectorAll('[data-gallery] figure').length===24);await saved()
 let draft=(await state()).draft;assert.equal(draft.site.media.length,24);assert.equal(draft.site.pages[0].sections[0].blocks.at(-1).gallery.items.length,24)
 const refused=await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:draft.id}});assert.equal(refused.status(),400,'Gallery images require descriptions before publication')
 for(let i=0;i<24;i++){await page.getByLabel('Gallery image',{exact:true}).selectOption(String(i));await page.getByLabel('Image description',{exact:true}).fill(`Celebration cake with lemon flowers, view ${i+1}`)}await saved()
 await page.getByLabel('Gallery image',{exact:true}).selectOption('0');await page.getByLabel('Image caption',{exact:true}).fill('Lemon celebration cake');await page.getByLabel('Image link',{exact:true}).fill('/site/visit');await saved()
 for(const layout of ['masonry','slideshow','carousel']){await page.getByRole('button',{name:'Duplicate selection',exact:true}).click();await page.getByLabel('Gallery layout',{exact:true}).selectOption(layout);await saved()}
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.getByLabel('Device preview',{exact:true}).selectOption(String(width));await capture('gallery-canvas-'+width)
  const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.getByRole('tooltip',{name:'Account and team'}).waitFor()
 }
 await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Gallery layout',{exact:true}).inputValue(),'slideshow');await page.getByRole('button',{name:'Redo',exact:true}).click();await saved()
 await page.reload();await page.locator('[data-gallery="carousel"]').click();assert.equal(await page.getByLabel('Desktop columns',{exact:true}).inputValue(),'3');assert.equal(await page.getByLabel('Phone columns',{exact:true}).inputValue(),'1')
 // Public brand settings share the existing immutable draft and autosave boundary.
 await page.goto(origin+'/app?page=home');await page.getByText('Brand images',{exact:true}).click()
 for(const label of ['Logo file','Favicon file','Social image file']){await page.getByLabel(label,{exact:true}).setInputFiles('public/site/cake-3.webp');await saved()}
 await page.getByText('Navigation and brand links',{exact:true}).click();await page.getByLabel('Instagram profile',{exact:true}).fill('https://www.instagram.com/riverbendbakery');await page.getByLabel('Facebook profile',{exact:true}).fill('https://www.facebook.com/riverbendbakery');await page.getByLabel('Social icons in header',{exact:true}).selectOption('yes');await saved()
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await capture('brand-settings-'+width);await page.getByRole('region',{name:'Social card preview'}).getByRole('img').evaluate(image=>image.decode())}
 draft=(await state()).draft;assert.ok(draft.site.brand.logo&&!draft.site.brand.logo.original,'Only prepared public brand bytes enter the brand kit')
 await call('/api/pane/publish',{revision:draft.id})
 const visitor=await context.browser().newContext(),live=await visitor.newPage();const errors=[];live.on('pageerror',error=>errors.push(error.message))
 try{
  for(const width of [1440,390]){
   await live.setViewportSize({width,height:1000})
   await live.addInitScript(()=>{window.galleryShifts=[];new PerformanceObserver(list=>{for(const item of list.getEntries())if(!item.hadRecentInput)window.galleryShifts.push(item.value)}).observe({type:'layout-shift',buffered:true})})
   await live.goto(origin+'/site');await live.evaluate(()=>document.fonts.ready)
   for(const layout of ['grid','masonry','slideshow','carousel']){
    const gallery=live.locator(`[data-gallery="${layout}"]`);assert.equal(await gallery.locator('figure').count(),24)
    if(layout==='grid'){const columns=await gallery.locator('.gallery-items').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);assert.equal(columns,width===390?1:3)}
    await gallery.scrollIntoViewIfNeeded();const before=await gallery.boundingBox();await gallery.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));const after=await gallery.boundingBox();assert.ok(Math.abs(before.height-after.height)<1,'Intrinsic image sizes prevent gallery layout shift')
    const trigger=gallery.locator('[data-gallery-open]').first();await trigger.click();const dialog=live.getByRole('dialog',{name:'Image lightbox'});await dialog.waitFor();await live.keyboard.press('ArrowRight');assert.match(await dialog.getByRole('status').innerText(),/Image 2 of 24/)
    await dialog.dispatchEvent('touchstart',{touches:[{clientX:250}]});await dialog.dispatchEvent('touchend',{changedTouches:[{clientX:50}]});assert.match(await dialog.getByRole('status').innerText(),/Image 3 of 24/)
    await dialog.getByRole('button',{name:'Next image',exact:true}).focus();await live.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name:'Close lightbox'}).evaluate(node=>node===document.activeElement),true)
    await live.keyboard.press('Shift+Tab');assert.equal(await dialog.getByRole('button',{name:'Next image',exact:true}).evaluate(node=>node===document.activeElement),true)
    await live.addScriptTag({path:'node_modules/axe-core/axe.min.js'});let axe=await live.evaluate(()=>window.axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[],'Accessible lightbox at '+width)
    await live.screenshot({path:resolve(folder,`gallery-${layout}-lightbox-${width}.png`)});await live.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await trigger.evaluate(node=>node===document.activeElement),true,'Escape restores the originating image focus')
    if(['slideshow','carousel'].includes(layout)){await gallery.getByRole('button',{name:'Next image',exact:true}).click();assert.match(await gallery.getByRole('status').innerText(),/Image 4 of 24/);await gallery.getByRole('button',{name:'Previous image',exact:true}).click()}
    await gallery.screenshot({path:resolve(folder,`gallery-${layout}-live-${width}.png`)})
   }
   assert.equal(await live.locator('.public-brand-logo').getAttribute('alt'),initial.name);assert.ok(await live.locator('link[rel=icon]').getAttribute('href'));assert.ok(await live.locator('link[rel=apple-touch-icon]').getAttribute('href'))
   assert.equal((await visitor.request.get(origin+'/site?pane-brand=favicon')).headers()['content-type'],'image/png');assert.equal((await visitor.request.get(await live.locator('meta[property="og:image"]').getAttribute('content'))).status(),200)
   const business=JSON.parse(await live.locator('script[type="application/ld+json"]').textContent());assert.deepEqual(business.sameAs.sort(),['https://www.facebook.com/riverbendbakery','https://www.instagram.com/riverbendbakery'].sort())
   assert.equal(await live.locator('.public-header a[href="https://www.instagram.com/riverbendbakery"]').count(),1)
   await live.evaluate(()=>scrollTo(0,0));await live.screenshot({path:resolve(folder,'brand-live-'+width+'.png')})
   await live.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const axe=await live.evaluate(()=>window.axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],'Accessible gallery page at '+width)
   assert.equal(await live.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No live overflow at '+width)
  }
  assert.deepEqual(errors,[])
 }finally{await visitor.close()}
 // Search checks must give a useful route to repair current content, including galleries.
 const bad=structuredClone(draft.site);bad.media[0].image.alt='';bad.pages[0].sections[0].blocks.find(b=>b.gallery).gallery.items[0].href='/site/deleted-page';bad.pages[1].search.title=bad.pages[0].search.title
 const warnings=await call('/api/pane/prepare',{site:bad,base:draft.id})
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/search');const checks=page.getByRole('region',{name:'Search checks'});assert.match(await checks.innerText(),/alternative text/);assert.match(await checks.innerText(),/Broken internal link/);assert.match(await checks.innerText(),/Shares its search title/);assert.ok(await checks.locator('a[href="/app/canvas?page=home"]').count());await capture('search-content-warnings-'+width)}
 assert.equal((await context.request.post(origin+'/api/pane/publish',{headers:{Origin:origin},data:{revision:warnings.id}})).status(),400,'Missing gallery alt refuses publication')
 await call('/api/pane/prepare',{site:draft.site,base:warnings.id})
 await writeFile(resolve(folder,'gallery-brand-results.json'),JSON.stringify({journey:'Gallery, brand and content checks',widths:[1440,390],imagesPerLayout:24,layouts:['grid','masonry','slideshow','carousel'],screens:shots},null,2))
 console.log('Gallery, brand and content checks passed at 1440 and 390: 24 images in all four layouts, stable geometry, keyboard, swipe, focus, axe, shared library, brand images and search fix links.')
}
