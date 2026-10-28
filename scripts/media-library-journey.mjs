import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

// A complete, small PDF: offsets, stream length, cross-reference table and trailer
// are calculated from its real bytes rather than using a signature-only fixture.
function carePdf(number){
 const stream=`BT /F1 12 Tf 32 160 Td (Celebration cake care guide ${number}) Tj ET\n`
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 let body='%PDF-1.4\n',offsets=[0]
 for(const [index,object] of objects.entries()){offsets.push(Buffer.byteLength(body));body+=`${index+1} 0 obj\n${object}\nendobj\n`}
 const xref=Buffer.byteLength(body)
 body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
 return {name:`Cake guide ${number}.pdf`,mimeType:'application/pdf',buffer:Buffer.from(body)}
}

/** Keep this flow's retained trash and approvals out of the following journeys. */
export async function runMediaLibraryJourney({browser,folder}){
 const fixture=await import('../tests/browser-runtime.mjs?media-library'),origin=fixture.origin
 const context=await browser.newContext(),page=await context.newPage()
 const state=async()=>(await context.request.get(origin+'/api/pane')).json()
 const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
 try{
  await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check()
  await Promise.all([page.waitForURL('**/app'),page.getByRole('button',{name:'Finish setup'}).click()])
  await mediaLibraryJourney({page,context,origin,state,call,folder})
 }catch(error){await page.screenshot({path:resolve(folder,'media-library-failure.png'),fullPage:true});throw error}
 finally{await context.close();await fixture.stop()}
}

/** Native library flow, called by every components-code journey invocation. */
export async function mediaLibraryJourney({page,context,origin,state,call,folder}){
 const screens=[],errors=[]
 const recordError=error=>errors.push(error.message)
 page.on('pageerror',recordError)
 const asset=(tab,id)=>tab.locator(`[data-library-item][data-id="${id}"]`)
 const selected=async(tab,id)=>{await asset(tab,id).click();await tab.getByLabel('Media name',{exact:true}).waitFor()}
 const saved=tab=>tab.waitForFunction(()=>document.querySelector('[data-library-status]')?.textContent==='Draft saved. Not published.')
 const mutate=async(tab,action,perform,status=200)=>{
  const [response]=await Promise.all([tab.waitForResponse(response=>new URL(response.url()).pathname==='/api/pane/library'&&response.request().method()==='POST'&&response.request().postDataJSON()?.action===action),perform()])
  assert.equal(response.status(),status,await response.text())
  const result=await response.json()
  if(status===200)await saved(tab)
  return result
 }
 const rows=expected=>page.waitForFunction(expected=>[...document.querySelectorAll('[data-library-item]')].filter(node=>node.getClientRects().length).length===expected,expected)
 const capture=async(name,width)=>{
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0))
  await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true});screens.push(`${name}-${width}`)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' overflow at '+width)
 }
 const accessible=async width=>{
  await page.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'))
  const result=await page.evaluate(()=>window.axe.run({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}))
  assert.deepEqual(result.violations.filter(item=>['serious','critical'].includes(item.impact)).map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),[],'Accessible native media library at '+width)
 }
 const initial={name:'Riverbend Bakery',description:'Celebration cakes and care guides from our neighbourhood bakery.',pages:[{id:'home',slug:'home',title:'Our celebration cakes',body:'A cake for every community table.'},{id:'about',slug:'about',title:'Special occasions',body:'Plan a celebration with our bakery.'},{id:'services',slug:'services',title:'Visit our bakery',body:'Come in for a slice and a conversation.'}]}
 try{
  await call('/api/pane/prepare',{site:initial})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+'/app')
   assert.equal(await page.getByRole('link',{name:'Media library',exact:true}).count(),1)
   await capture('media-library-pages-entry',width)
  }
  await page.setViewportSize({width:1440,height:1000})
  await page.getByRole('link',{name:'Media library',exact:true}).click();await page.waitForURL('**/app/library')
  const images=await page.evaluate(async()=>{
   const source=new Image();source.src='/site/cake-3.webp';await source.decode()
   return Array.from({length:50},(_,index)=>{
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=36
    const drawing=canvas.getContext('2d');drawing.drawImage(source,0,0,48,36)
    // Each real raster retains a small, distinct corner alongside the photo.
    drawing.fillStyle=`hsl(${index*7} 60% 50%)`;drawing.fillRect(0,0,3,3)
    return {name:`Celebration cake ${String(index+1).padStart(2,'0')}.jpg`,mimeType:'image/jpeg',base64:canvas.toDataURL('image/jpeg',.65).split(',')[1]}
   })
  })
  const files=[...images.map(({base64,...image})=>({...image,buffer:Buffer.from(base64,'base64')})),...Array.from({length:3},(_,index)=>carePdf(index+1))]
  await mutate(page,'upload',()=>page.getByLabel('Upload media',{exact:true}).setInputFiles(files));await rows(53)
  const uploaded=(await state()).draft,retained=structuredClone(uploaded.site)
  assert.equal(uploaded.site.media.length,50);assert.equal(uploaded.site.libraryFiles.length,3)
  assert.ok(Buffer.byteLength(JSON.stringify(uploaded.site))<1750000,'Real batch fits the native draft budget')
  for(const image of images)assert.equal(uploaded.site.media.find(item=>item.name===image.name).image.original,'data:image/jpeg;base64,'+image.base64,'The original upload remains byte-for-byte in owner custody')
  for(const file of files.filter(file=>file.mimeType==='application/pdf'))assert.equal(uploaded.site.libraryFiles.find(item=>item.name===file.name).data,file.buffer.toString('base64'))
  const image=uploaded.site.media[0],pdf=uploaded.site.libraryFiles[0],unusedImage=uploaded.site.media.at(-1),unusedPdf=uploaded.site.libraryFiles.at(-1)
  const visitor=await context.browser().newContext()
  try{
   assert.equal((await visitor.request.get(origin+'/site/files/'+pdf.id)).status(),404,'An uploaded PDF has no public delivery before approval')
   await page.getByLabel('Search media',{exact:true}).fill('cake 07');await rows(1);assert.match(await page.locator('[data-library-item]:visible').innerText(),/Celebration cake 07/)
   await page.getByLabel('Search media',{exact:true}).fill('Cake guide');await rows(3)
   await page.getByLabel('Search media',{exact:true}).fill('unmatched-library-query');await rows(0)
   await page.getByLabel('Search media',{exact:true}).fill('');await rows(53)
   await page.getByLabel('Media type',{exact:true}).selectOption('image');await rows(50)
   await page.getByLabel('Media type',{exact:true}).selectOption('pdf');await rows(3)
   await page.getByLabel('Media type',{exact:true}).selectOption('');await rows(53)
   await selected(page,image.id)
   await page.getByLabel('Media name',{exact:true}).fill('Lemon celebration cake.jpg')
   await page.getByLabel('Folder',{exact:true}).fill('Celebrations')
   await page.getByLabel('Caption',{exact:true}).fill('Lemon cake for the community table')
   await mutate(page,'update',()=>page.getByRole('button',{name:'Save details',exact:true}).click())
   await page.getByLabel('Filter folder',{exact:true}).selectOption('Celebrations');await rows(1)
   assert.match(await asset(page,image.id).innerText(),/Lemon celebration cake/)
   await page.getByLabel('Filter folder',{exact:true}).selectOption('__unfiled');await rows(52)
   await page.getByLabel('Filter folder',{exact:true}).selectOption('');await rows(53)
   await selected(page,pdf.id);await page.getByLabel('Media name',{exact:true}).fill('Cake care guide.pdf')
   await page.getByLabel('Folder',{exact:true}).fill('Planning');await page.getByLabel('Caption',{exact:true}).fill('How to carry and serve your cake')
   await mutate(page,'update',()=>page.getByRole('button',{name:'Save details',exact:true}).click())
   await page.getByLabel('Page',{exact:true}).selectOption(initial.pages[0].id)
   await mutate(page,'place',()=>page.getByRole('button',{name:'Place on page',exact:true}).click())
   await selected(page,image.id)
   for(const destination of initial.pages){
    await page.getByLabel('Page',{exact:true}).selectOption(destination.id)
    await mutate(page,'place',()=>page.getByRole('button',{name:'Place on page',exact:true}).click())
   }
   const placed=(await state()).draft
   for(const destination of placed.site.pages){
    const galleries=destination.sections.flatMap(section=>section.blocks).filter(block=>block.gallery)
    assert.equal(galleries.length,1);assert.equal(galleries[0].gallery.items.length,1)
    assert.equal(galleries[0].gallery.items[0].asset,image.id,'Page placement reuses the stable library asset')
   }
   assert.ok(placed.site.pages[0].sections.flatMap(section=>section.blocks).some(block=>block.link?.href==='file:'+pdf.id),'PDF placement is a native file link')
   await page.getByRole('button',{name:'Delete file',exact:true}).click()
   const refused=await mutate(page,'delete',()=>page.getByRole('button',{name:'Delete permanently',exact:true}).click(),409)
   assert.deepEqual([...new Set(refused.uses.map(use=>use.page))].sort(),initial.pages.map(destination=>destination.id).sort())
   const usage=page.getByRole('region',{name:'File usage',exact:true})
   await usage.waitFor();assert.deepEqual((await usage.locator('[data-library-uses] a').allTextContents()).sort(),initial.pages.map(destination=>destination.title).sort(),'Refusal visibly identifies exactly the three dependent pages')
   for(const destination of initial.pages)assert.ok(await usage.locator(`a[href*="page=${destination.slug}"]`).count(),'Usage links open the exact affected page')
   assert.equal((await state()).draft.id,placed.id,'Refused deletion does not create a draft')
   for(const width of [1440,390])await capture('media-library-used-image',width)
   await page.goto(origin+'/app/sites')
   const [refusedPublication]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/app/publish'&&response.request().method()==='POST'),page.getByRole('button',{name:'Approve & publish',exact:true}).first().click()])
   assert.equal(refusedPublication.status(),400,'Missing alternative text refuses native owner publication')
   assert.match(await page.locator('body').innerText(),/alternative text/i)
   await page.goto(origin+'/app/library');await selected(page,image.id)
   assert.equal(await page.getByLabel('Folder',{exact:true}).inputValue(),'Celebrations');assert.equal(await page.getByLabel('Caption',{exact:true}).inputValue(),'Lemon cake for the community table')
   await page.getByLabel('Alternative text',{exact:true}).fill('A lemon celebration cake topped with flowers')
   await mutate(page,'update',()=>page.getByRole('button',{name:'Save details',exact:true}).click())
   await page.reload();await selected(page,image.id)
   assert.equal(await page.getByLabel('Alternative text',{exact:true}).inputValue(),'A lemon celebration cake topped with flowers')
   await page.goto(origin+'/app/sites');await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).first().click()])
   const approved=(await state()).live
   assert.equal(approved.site.media.find(item=>item.id===image.id).image.alt,'A lemon celebration cake topped with flowers')
   const delivered=await visitor.request.get(origin+'/site/files/'+pdf.id)
   assert.equal(delivered.status(),200);assert.equal(delivered.headers()['content-type'],'application/pdf');assert.deepEqual(await delivered.body(),files.find(file=>file.mimeType==='application/pdf').buffer)
   assert.equal((await visitor.request.get(origin+'/site/files/'+unusedPdf.id)).status(),404,'Unplaced PDFs remain private after site approval')
   for(const destination of initial.pages){
    const response=await visitor.request.get(origin+(destination.slug==='home'?'/site':'/site/'+destination.slug)),html=await response.text()
    assert.match(html,/A lemon celebration cake topped with flowers/);assert.ok(!html.includes(image.image.original),'Public pages never disclose retained original upload bytes')
   }
   await page.goto(origin+'/app/library');await selected(page,image.id)
   await mutate(page,'update',()=>page.getByLabel('Caption',{exact:true}).fill('Draft caption awaiting owner approval'))
   assert.deepEqual((await state()).live,approved,'Metadata saves cannot change the approved snapshot')
   assert.ok(!(await (await visitor.request.get(origin+'/site')).text()).includes('Draft caption awaiting owner approval'))
   // Live-only dependencies remain visible after placements are removed in a draft.
   const beforeRemoval=(await state()).draft,removed=structuredClone(beforeRemoval.site)
   for(const destination of removed.pages.slice(1))destination.sections=destination.sections.filter(section=>!section.blocks.some(block=>block.gallery?.items.some(item=>item.asset===image.id)))
   await call('/api/pane/prepare',{site:removed,base:beforeRemoval.id});await page.reload();await selected(page,image.id)
   await page.getByRole('button',{name:'Delete file',exact:true}).click()
   const liveRefusal=await mutate(page,'delete',()=>page.getByRole('button',{name:'Delete permanently',exact:true}).click(),409)
   assert.deepEqual([...new Set(liveRefusal.uses.map(use=>use.page))].sort(),initial.pages.map(destination=>destination.id).sort(),'Deletion accounts for the union of current draft and approved page uses')
   assert.deepEqual((await page.getByRole('region',{name:'File usage',exact:true}).locator('[data-library-uses] a').allTextContents()).sort(),initial.pages.map(destination=>destination.title).sort(),'Live-only dependencies are visible in the refusal')
   await call('/api/pane/prepare',{site:beforeRemoval.site,base:(await state()).draft.id});await page.reload()
   // Deleting an unused file is reversible through the same native history controls.
   await selected(page,unusedImage.id);await page.getByRole('button',{name:'Delete file',exact:true}).click()
   await mutate(page,'delete',()=>page.getByRole('button',{name:'Delete permanently',exact:true}).click());await rows(52)
   await mutate(page,'restore',()=>page.getByRole('button',{name:'Undo',exact:true}).click());await rows(53)
   assert.deepEqual((await state()).draft.site.media.find(item=>item.id===unusedImage.id),unusedImage,'Undo restores all original bytes and metadata')
   await mutate(page,'restore',()=>page.getByRole('button',{name:'Redo',exact:true}).click());await rows(52)
   await mutate(page,'restore',()=>page.getByRole('button',{name:'Undo',exact:true}).click());await rows(53)
   await selected(page,image.id)
   const previousCaption=await page.getByLabel('Caption',{exact:true}).inputValue(),captions=Array.from({length:5},(_,index)=>`Library caption revision ${index+1}`)
   for(const caption of captions){await page.getByLabel('Caption',{exact:true}).fill(caption);await mutate(page,'update',()=>page.getByRole('button',{name:'Save details',exact:true}).click())}
   for(let index=4;index>=0;index--){await mutate(page,'restore',()=>page.getByRole('button',{name:'Undo',exact:true}).click());assert.equal(await page.getByLabel('Caption',{exact:true}).inputValue(),index?captions[index-1]:previousCaption,'Five successive native edits can be undone independently')}
   for(const caption of captions){await mutate(page,'restore',()=>page.getByRole('button',{name:'Redo',exact:true}).click());assert.equal(await page.getByLabel('Caption',{exact:true}).inputValue(),caption,'Five successive native edits can be redone independently')}
   // Two real library tabs submit against the revision each actually opened.
   const second=await context.newPage()
   try{
    await page.reload();await selected(page,image.id)
    await second.goto(origin+'/app/library');await selected(second,image.id)
    await page.getByLabel('Caption',{exact:true}).fill('A newer draft caption from the first tab')
    const latest=await mutate(page,'update',()=>page.getByRole('button',{name:'Save details',exact:true}).click())
    const conflict=await mutate(second,'update',async()=>{await second.getByLabel('Media name',{exact:true}).fill('Lemon cake selected in the second tab.jpg');await second.getByRole('button',{name:'Save details',exact:true}).click()},409)
    assert.equal(conflict.latest.id,latest.id);await second.locator('[data-library-conflict]').waitFor({state:'visible'})
    assert.equal(await second.getByLabel('Media name',{exact:true}).inputValue(),'Lemon cake selected in the second tab.jpg','Conflict retains the unsaved local fields')
    await mutate(second,'update',()=>second.getByRole('button',{name:'Retry my changes',exact:true}).click())
    assert.equal((await state()).draft.site.media.find(item=>item.id===image.id).name,'Lemon cake selected in the second tab.jpg')
    assert.equal((await state()).draft.site.media.find(item=>item.id===image.id).caption,'A newer draft caption from the first tab','Retry preserves the other tab\'s untouched metadata')
    assert.deepEqual((await state()).live,approved,'Resolving a draft conflict does not publish it')
   }finally{await second.close()}
   await page.reload();await selected(page,image.id)
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000})
    const search=page.getByLabel('Search media',{exact:true});await search.focus();await page.keyboard.type('second tab');await rows(1)
    await page.keyboard.press('Tab');assert.equal(await page.getByLabel('Media type',{exact:true}).evaluate(node=>node===document.activeElement),true,'Search leads to the type filter by keyboard')
    const control=asset(page,image.id);await control.focus();await page.keyboard.press('Enter')
    assert.equal(await page.getByLabel('Media name',{exact:true}).inputValue(),'Lemon cake selected in the second tab.jpg')
    const account=page.locator('[data-tip="Account and team"]');await account.hover();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.mouse.move(0,0);await account.focus();await page.getByRole('tooltip',{name:'Account and team'}).waitFor();await page.keyboard.press('Escape')
    assert.equal(await page.locator('a,button,summary').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&!node.textContent.trim()&&node.querySelector('svg')&&!node.dataset.tip).length),0,'Library icon controls retain tooltips')
    assert.equal(await page.locator('[data-media-library] :is(label,button,input,textarea,select,p,a,span)').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&parseFloat(getComputedStyle(node).fontSize)<13).length),0,'Library controls and text remain at least thirteen pixels')
    await accessible(width);await capture('media-library-end-state',width)
    await search.fill('');await rows(53)
   }
   const history=(await state()).revisions.find(revision=>revision.id===uploaded.id)
   assert.ok(history,'The original batch revision remains in history');assert.deepEqual(history.site,retained,'Later metadata and history actions preserve the prior revision')
   assert.equal((await state()).draft.site.media.find(item=>item.id===image.id).image.original,image.image.original)
   // Existing publication revocation must also withdraw a previously delivered PDF.
   await page.goto(origin+'/app/sites');await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Revoke publication approval',exact:true}).click()])
   assert.equal((await visitor.request.get(origin+'/site/files/'+pdf.id)).status(),404,'Revocation immediately withdraws PDF delivery')
   const protectedDraft=(await state()).draft,protectedSite=structuredClone(protectedDraft.site)
   protectedSite.pages[0].access={mode:'members'}
   await call('/api/pane/prepare',{site:protectedSite,base:protectedDraft.id})
   await page.goto(origin+'/app/sites');await Promise.all([page.waitForURL(url=>url.pathname==='/app'&&url.searchParams.has('notice')),page.getByRole('button',{name:'Approve & publish',exact:true}).first().click()])
   assert.equal((await visitor.request.get(origin+'/site/files/'+pdf.id)).status(),404,'A PDF used only on a protected page stays private after fresh approval')
  }finally{await visitor.close()}
  assert.deepEqual(errors,[])
  console.log('Native media library passed: 50 real images and 3 PDFs; search, filters, metadata, three-page reuse, exact draft and live deletion dependencies, alt approval, immutable custody, undo, conflicts, revoked and protected PDF delivery, keyboard and axe at 1440 and 390.')
 }finally{page.off('pageerror',recordError)}
}
