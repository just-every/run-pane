import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

const live=process.env.PANE_AI_LIVE==='1'
if(!live)process.env.PANE_AI_FIXTURE='1'
const fixture=await import('../tests/browser-runtime.mjs')
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/ai'),evidence=[]
let browser,page,context
const origin=fixture.origin
const data=async()=>{const response=await context.request.get(origin+'/api/pane');assert.equal(response.status(),200);return response.json()}
const home=revision=>revision.site.pages.find(item=>item.slug==='home')
const panel=()=>page.locator('[data-ai-assist]')
async function capture(name,width){
 for(const size of live?[1440,390]:[width]){
  await page.setViewportSize({width:size,height:1000})
  await page.screenshot({path:resolve(folder,`${name}-${size}.png`),fullPage:true})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${name} fits at ${size}`)
 }
 await page.setViewportSize({width,height:1000})
}
async function editor(){await page.goto(origin+'/app?page=home');await panel().locator(':scope > summary').click();await panel().getByRole('button',{name:'Send to OpenAI',exact:true}).waitFor()}
async function formSubmit(name){
 await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name,exact:true}).click()])
}
async function publish(){await formSubmit('Approve & publish');const state=await data();assert.equal(state.live.id,state.draft.id);return state.live}
async function prepare(site){
 const response=await context.request.post(origin+'/api/pane/prepare',{headers:{Origin:origin},data:{site}})
 assert.equal(response.status(),200);return response.json()
}
async function aiResponse(path,action,navigates=false){
 const navigation=navigates?page.waitForEvent('domcontentloaded'):null
 const [response]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/pane/ai/'+path&&response.request().method()==='POST'),action()])
 const result=await response.json()
 assert.equal(response.status(),200,result.error??'The owner AI action succeeds')
 if(navigation)await navigation
 return result
}
async function propose(mode,width,fields={}){
 const before=await data(),count=fixture.aiRequests.length
 await panel().getByLabel('Help with',{exact:true}).selectOption(mode)
 if(fields.selection)await panel().getByLabel('Selected paragraph',{exact:true}).fill(fields.selection)
 if(fields.tone)await panel().getByLabel('Tone',{exact:true}).fill(fields.tone)
 if(mode==='translate')await panel().getByLabel('Language',{exact:true}).fill('Spanish')
 assert.equal(fixture.aiRequests.length,count,'Selecting assistance never calls a model')
 const result=await aiResponse('propose',()=>panel().getByRole('button',{name:'Send to OpenAI',exact:true}).click())
 await panel().locator('[data-ai-suggestions] article').first().waitFor()
 assert.equal(fixture.aiRequests.length,count+1,'Only the explicit send action calls the model')
 assert.equal((await data()).draft.id,before.draft.id,'Reviewing suggestions leaves the draft intact')
 for(const item of result.suggestions){
  const control=panel().locator(`[data-suggestion-id="${item.id}"]`),row=control.locator('xpath=ancestor::article')
  assert.equal(await row.locator('dd').last().innerText(),item.after,'Review displays the actual model proposal')
  if(item.kind==='finding')assert.equal(await control.locator('option[value=accept]').count(),0,'Findings cannot be accepted as content')
 }
 await capture(mode+'-review',width)
 evidence.push({viewport:width,mode,model:result.model,suggestions:result.suggestions})
 return result
}
async function decide(proposal,accept){
 let accepted=0
 for(const item of proposal.suggestions){const value=accept(item,accepted);if(value)accepted++;await panel().locator(`[data-suggestion-id="${item.id}"]`).selectOption(value?'accept':'reject')}
 const result=await aiResponse('decide',()=>panel().getByRole('button',{name:'Save decisions as a draft',exact:true}).click(),accepted>0)
 assert.equal(result.accepted,accepted)
 evidence.at(-1).accepted=proposal.suggestions.filter(item=>accept(item,proposal.suggestions.indexOf(item))).map(item=>item.id)
 if(!accepted)await panel().getByText('All suggestions dismissed. Your page has not changed.',{exact:true}).waitFor()
 return result
}
async function history(name){
 if(await panel().getAttribute('open')===null)await panel().locator(':scope > summary').click()
 return aiResponse('undo',()=>panel().getByRole('button',{name,exact:true}).click(),true)
}
async function workshopImages(){
 return page.evaluate(()=>Array.from({length:5},(_,index)=>{
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=320
  const pen=canvas.getContext('2d'),colors=['#995e36','#a82b31','#356b90','#527651','#b78043']
  pen.fillStyle='#eee5d5';pen.fillRect(0,0,480,320);pen.fillStyle='#b5d0d3';pen.fillRect(25,20,150,100)
  pen.fillStyle='#706452';pen.fillRect(0,260,480,60);pen.fillStyle=colors[index]
  if(index===0){pen.fillRect(75,160,330,30);pen.fillRect(95,190,20,90);pen.fillRect(365,190,20,90)}
  if(index===1){pen.fillRect(180,110,100,20);pen.fillRect(175,120,12,130);pen.fillRect(275,120,12,130);pen.fillRect(170,190,120,20);pen.fillRect(175,205,12,80);pen.fillRect(275,205,12,80)}
  if(index===2){pen.fillRect(130,125,220,155);pen.fillStyle='#d2aa55';pen.fillRect(210,185,10,25);pen.fillRect(260,185,10,25);pen.strokeRect(240,125,1,155)}
  if(index===3){pen.fillRect(130,180,220,100);pen.fillRect(180,150,120,20);pen.fillStyle='#d0bd92';for(let i=0;i<4;i++)pen.fillRect(155+i*45,135,10,90)}
  if(index===4){pen.beginPath();pen.ellipse(240,180,150,45,0,0,Math.PI*2);pen.fill();pen.fillStyle='#51463b';pen.fillRect(150,200,20,90);pen.fillRect(315,200,20,90)}
  return {src:canvas.toDataURL('image/png'),width:480,height:320,alt:'',decorative:false}
 }))
}
async function tooltipAudit(width){
 const unnamed=await page.locator('button,a[href],summary,[role=button]').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()&&!node.dataset.tip&&!node.textContent.trim()&&!node.getAttribute('aria-label')&&!node.querySelector('img[alt]')).map(node=>node.outerHTML.slice(0,160)))
 assert.deepEqual(unnamed,[],'Touched editor controls have accessible names or tooltips')
 const account=page.locator('[data-tip="Account and team"]')
 await account.hover();await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture('editor-hover-tooltip',width)
 await page.keyboard.press('Escape');await page.mouse.move(5,500);await account.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')
 await page.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await capture('editor-keyboard-tooltip',width);await page.keyboard.press('Escape')
}

try{
 await mkdir(folder,{recursive:true})
 browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 context=await browser.newContext();page=await context.newPage();page.setDefaultTimeout(live?120000:20000)
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await formSubmit('Finish setup')
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 await page.getByLabel('Site name',{exact:true}).fill(starter.name);await page.getByLabel('Description',{exact:true}).fill(starter.description)
 for(const item of starter.pages){const fields=page.locator('#start-'+item.slug);await fields.getByLabel('Page title',{exact:true}).fill(item.title);await fields.getByLabel('Text',{exact:true}).fill(item.body)}
 await formSubmit('Prepare draft revision');await publish()
 assert.equal(fixture.aiRequests.length,0,'Native owner setup never calls a model')
 for(const width of live?[1440]:[1440,390]){
  await page.setViewportSize({width,height:1000});await prepare(starter);await page.goto(origin+'/app');await publish();await editor()
  await tooltipAudit(width);await capture('owner-ai-help',width)
  const before=await data(),liveBefore=await (await context.request.get(origin+'/site')).text(),proposal=await propose('search',width)
  for(const kind of ['search-title','search-description','heading','link','finding'])assert.ok(proposal.suggestions.some(item=>item.kind===kind),'Search review includes '+kind)
  await decide(proposal,item=>['search-title','search-description'].includes(item.kind))
  let state=await data(),accepted=home(state.draft)
  assert.equal(accepted.search.title,proposal.suggestions.find(item=>item.kind==='search-title').after)
  assert.equal(accepted.search.description,proposal.suggestions.find(item=>item.kind==='search-description').after)
  assert.equal(accepted.title,home(before.draft).title);assert.equal(accepted.body,home(before.draft).body);assert.deepEqual(accepted.links,home(before.draft).links)
  assert.equal(state.live.id,before.live.id,'Saving AI decisions leaves live content unchanged')
  assert.equal(await (await context.request.get(origin+'/site')).text(),liveBefore,'The public page still serves the same content after saving AI decisions');await capture('search-private-draft',width)
  const published=await publish();await page.goto(origin+'/site')
  assert.equal(await page.title(),accepted.search.title);assert.equal(await page.locator('meta[name=description]').getAttribute('content'),accepted.search.description)
  assert.equal(await page.getByRole('heading',{level:1}).innerText(),home(before.draft).title);await capture('search-published',width)
  await editor();await history('Undo accepted changes');state=await data();assert.deepEqual(home(state.draft),home(before.draft));assert.equal(state.live.id,published.id);await capture('search-undone-private',width)
  await history('Redo accepted changes');state=await data();assert.deepEqual(home(state.draft),accepted);assert.equal(state.live.id,published.id);await capture('search-redone-private',width)
  for(const mode of ['rewrite','shorten','tone']){
   await editor();const snapshot=await data(),selection=home(snapshot.draft).body.split(/\n\s*\n/)[0]
   const writing=await propose(mode,width,{selection,tone:'Warm, practical and welcoming'})
   assert.ok(writing.suggestions.every(item=>item.kind==='text'))
   const change=writing.suggestions[0];assert.notEqual(change.after,selection)
   if(mode==='shorten')assert.ok(change.after.length<selection.length,'The shorter proposal reduces the selected paragraph')
   await decide(writing,()=>mode!=='tone');state=await data()
   assert.equal(home(state.draft).body,mode==='tone'?home(snapshot.draft).body:home(snapshot.draft).body.replace(selection,change.after))
   assert.equal(state.live.id,published.id);await capture(mode+'-decision',width)
  }
  const images=await workshopImages(),imageSite=structuredClone((await data()).draft.site),imageHome=imageSite.pages.find(item=>item.slug==='home')
  imageHome.sections=[{id:'workshop',kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks:[{id:'intro',kind:'text',text:imageHome.body,column:1,span:12,row:1,order:0,align:'left',vertical:'start'},...images.map((image,index)=>({id:'image-'+index,kind:'image',image,text:'',column:1,span:12,row:index+2,order:index+1,align:'left',vertical:'start'}))]}]
  await prepare(imageSite);await editor();const imageBefore=await data(),alts=await propose('alt',width)
  assert.equal(alts.suggestions.length,5);assert.ok(alts.suggestions.every(item=>item.kind==='alt'));assert.equal(fixture.aiRequests.at(-1).imageCount,5)
  for(const src of fixture.aiRequests.at(-1).images)assert.ok(images.some(image=>image.src===src),'Native raster bytes reach the model request')
  const acceptedAltIds=new Set(alts.suggestions.slice(0,2).map(item=>item.id))
  await decide(alts,item=>acceptedAltIds.has(item.id));state=await data()
  for(const item of alts.suggestions){const block=home(state.draft).sections.flatMap(section=>section.blocks).find(block=>'block:'+block.id===item.target);assert.equal(block.image.alt,acceptedAltIds.has(item.id)?item.after:'')}
  assert.equal(state.live.id,imageBefore.live.id);await capture('image-descriptions-private',width)
  const original=structuredClone(home(state.draft)),pageCount=state.draft.site.pages.length
  await editor();const translation=await propose('translate',width)
  assert.equal(translation.suggestions.length,1);assert.equal(translation.suggestions[0].kind,'translation')
  assert.match(translation.suggestions[0].after,/\b(de|para|muebles|taller|la|los|una|en)\b/i,'Spanish proposal contains readable translated text')
  await decide(translation,()=>true);state=await data()
  assert.equal(state.draft.site.pages.length,pageCount+1);assert.deepEqual(home(state.draft),original,'Translation preserves the original page')
  const translated=state.draft.site.pages.find(item=>!imageSite.pages.some(existing=>existing.slug===item.slug))
  assert.ok(translated.hidden);assert.notEqual(translated.slug,'home');assert.equal(translated.title+'\n\n'+translated.body,translation.suggestions[0].after)
  assert.equal(state.live.id,published.id);assert.equal((await context.request.get(origin+'/site/'+translated.slug)).status(),404,'The translated draft is not live')
  await page.goto(origin+'/preview/'+state.draft.id+'/'+translated.slug);assert.equal(await page.getByRole('heading',{level:1}).innerText(),translated.title);await capture('spanish-page-preview',width)
  await editor();const rejected=await propose('translate',width),rejectionBase=(await data()).draft.id
  await decide(rejected,()=>false);assert.equal((await data()).draft.id,rejectionBase);await capture('translation-rejected',width)
  await page.reload();await panel().locator(':scope > summary').click()
  const newer=await prepare((await data()).draft.site)
  const [guard]=await Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname==='/api/pane/ai/undo'),panel().getByRole('button',{name:'Undo accepted changes',exact:true}).click()])
  assert.equal(guard.status(),409);await panel().locator('[data-ai-latest]').waitFor();assert.equal((await data()).draft.id,newer.id);await capture('stale-undo-guard',width)
  assert.equal((await data()).live.id,published.id,'Writing, images, translations and stale Undo never publish')
 }
 await writeFile(resolve(folder,live?'live-model-evidence.json':'fixture-evidence.json'),JSON.stringify({live,calls:fixture.aiRequests.length,evidence},null,2)+'\n')
 console.log(`AI-003 and AI-002 browser journey passed: explicit model requests, reviewed decisions, private drafts, publication, guarded Undo and Redo, paragraph modes, five raster images and separate Spanish page (${live?'live model':'fixture'}, 1440 and 390).`)
}catch(error){if(page)await page.screenshot({path:resolve(folder,'failure.png'),fullPage:true}).catch(()=>{});throw error}
finally{if(browser)await browser.close();await fixture.stop()}
