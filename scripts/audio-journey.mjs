import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

export async function audioJourney({page,context,origin,state,call,saved,capture,initial}){
 let draft=await call('/api/pane/prepare',{site:initial,base:(await state()).draft.id})
 for(const [name,type] of [['workshop.mp3','audio/mpeg'],['workshop.m4a','audio/mp4']]){
  await page.goto(origin+'/app/posts');await page.getByText('Settings',{exact:true}).click();await page.getByText('Audio library',{exact:true}).click()
  await page.getByLabel('Library audio',{exact:true}).setInputFiles({name,mimeType:type,buffer:await readFile(resolve('./fixtures/audio',name))})
  await Promise.all([page.waitForURL(url=>url.searchParams.has('notice')),page.getByRole('button',{name:'Upload private audio',exact:true}).click()])
  draft=(await state()).draft;assert.equal((await context.request.get(origin+'/site/files/'+draft.site.libraryFiles.at(-1).id)).status(),404)
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.getByText('Settings',{exact:true}).click();await page.getByText('Audio library',{exact:true}).click();await capture('audio-library-'+width)
  if(width===1440)await page.goto(origin+'/app/posts')
 }
 await page.goto(origin+'/app/canvas?page=hours');await page.getByText('Links and body blocks',{exact:true}).click()
 for(const [index,file] of draft.site.libraryFiles.entries()){
  await page.getByLabel('Audio title',{exact:true}).fill(index?'Workshop welcome M4A':'Workshop welcome MP3');await page.getByLabel('Library audio',{exact:true}).selectOption(file.id);await page.getByRole('button',{name:'Add audio',exact:true}).click();await saved()
 }
 assert.equal(await page.locator('[data-block-type="audio"] audio').count(),2)
 await page.locator('[data-block-type="audio"]').last().focus();await page.getByLabel('Audio title',{exact:true}).fill('Workshop welcome M4A revised');await page.getByRole('button',{name:'Update selected audio',exact:true}).click();await saved()
 await page.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await page.getByLabel('Audio title',{exact:true}).inputValue(),'Workshop welcome M4A');await page.getByRole('button',{name:'Redo',exact:true}).click();await saved();await page.reload();assert.equal(await page.locator('[data-block-type="audio"] figcaption').last().innerText(),'Workshop welcome M4A revised')
 await page.getByText('Links and body blocks',{exact:true}).click();await page.getByLabel('Block type',{exact:true}).selectOption('search');await page.getByRole('group',{name:'Native blocks',exact:true}).getByLabel('Block text',{exact:true}).fill('Search the workshop');await page.getByRole('button',{name:'Add native block',exact:true}).click();await saved()
 draft=(await state()).draft;await call('/api/pane/publish',{revision:draft.id})
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/canvas?page=hours');await page.getByText('Links and body blocks',{exact:true}).click();await capture('audio-editor-'+width)
  await page.goto(origin+'/site/hours');const blocks=page.locator('[data-block-type="audio"]');assert.equal(await blocks.count(),2)
  for(const [index,block] of (await blocks.all()).entries()){
   const audio=block.locator('audio'),file=draft.site.libraryFiles[index];assert.equal(await audio.getAttribute('src'),'/site/files/'+file.id);assert.equal(await audio.getAttribute('autoplay'),null)
   await audio.evaluate(node=>new Promise((resolve,reject)=>{if(node.readyState>=1)return resolve();node.addEventListener('loadedmetadata',resolve,{once:true});node.addEventListener('error',()=>reject(Error('Audio metadata failed: '+node.error?.code)),{once:true})}))
   assert.ok(await audio.evaluate(node=>node.duration>0),'Native player decodes uploaded audio metadata')
   await audio.focus();assert.equal(await page.evaluate(()=>document.activeElement.tagName),'AUDIO')
   const download=block.getByRole('link',{name:/Download Workshop/});assert.equal(await download.getAttribute('href'),'/site/files/'+file.id);assert.equal(await download.getAttribute('download'),file.name)
   const response=await context.request.get(origin+'/site/files/'+file.id);assert.deepEqual(await response.body(),await readFile(resolve('./fixtures/audio',file.name)))
  }
  await page.evaluate(await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8'));assert.deepEqual((await page.evaluate(()=>axe.run(document))).violations.map(item=>item.id),[],'Audio live accessibility')
  await capture('audio-live-'+width)
  const search=page.locator('[data-block-type="search"]');await search.getByRole('searchbox').fill('workshop');await Promise.all([page.waitForURL('**/site/search?q=workshop'),search.getByRole('button',{name:'Search',exact:true}).click()]);assert.ok(await page.locator('main').getByRole('link',{name:initial.pages.find(item=>item.slug==='hours').title,exact:true}).count(),'The grid search block submits through native site search')
 }
 console.log('Native private audio upload, MP3 and M4A players, downloads, undo, reopen and axe passed at 1440 and 390.')
}
