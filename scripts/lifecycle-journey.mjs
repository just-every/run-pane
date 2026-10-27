import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'

process.env.PANE_BROWSER_NOW='2026-10-15T16:00:00Z'
const deletedAt=new Date(process.env.PANE_BROWSER_NOW).toISOString()
const fixture=await import('../tests/browser-runtime.mjs'),{origin}=fixture
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const ownerContext=await browser.newContext(),authorContext=await browser.newContext(),editorContext=await browser.newContext()
const owner=await ownerContext.newPage(),author=await authorContext.newPage(),editor=await editorContext.newPage()
const folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/lifecycle')
await mkdir(folder,{recursive:true})
const axeSource=await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8')
for(const tab of [owner,author,editor])tab.setDefaultTimeout(20000)
async function json(response){assert.equal(response.status(),200,await response.text());return response.json()}
const call=(context,path,data)=>context.request.post(origin+path,{headers:{Origin:origin},data}).then(json)
const state=()=>ownerContext.request.get(origin+'/api/pane').then(json)
const own=()=>authorContext.request.get(origin+'/api/pane/posts').then(json)
const submit=async(tab,button)=>Promise.all([tab.waitForEvent('domcontentloaded'),button.click()])
const saved=tab=>tab.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
async function tooltip(tab){
 const account=tab.locator('[data-tip="Account and team"]')
 await account.hover();await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor()
 await tab.mouse.move(0,500);await tab.keyboard.press('Escape')
 await account.focus();await tab.keyboard.press('Tab');await tab.keyboard.press('Shift+Tab')
 await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.keyboard.press('Escape')
}
async function proof(tab,name,width){
 await tooltip(tab)
 const main=tab.locator('#main'),selector='a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary'
 const expected=await main.locator(selector).evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>({tag:node.tagName,text:(node.textContent??'').trim(),href:node.getAttribute('href')})))
 await main.locator('h1').evaluate(node=>{node.tabIndex=-1;node.focus()})
 const focused=[]
 for(let index=0;index<expected.length;index++){
  await tab.keyboard.press('Tab')
  focused.push(await tab.evaluate(()=>{const node=document.activeElement,style=getComputedStyle(node);return {tag:node.tagName,text:(node.textContent??'').trim(),href:node.getAttribute('href'),ring:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0||style.boxShadow!=='none'}}))
 }
 assert.deepEqual(focused.map(({ring,...node})=>node),expected,name+' keyboard reading order')
 assert.ok(focused.every(node=>node.ring),name+' visible keyboard focus')
 await tab.evaluate(axeSource)
 const violations=await tab.evaluate(async()=>{const result=await axe.run(document);return result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))})
 assert.deepEqual(violations,[],name+' axe')
 await tab.locator('h1').evaluate(node=>node.blur())
 assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' fits '+width)
 await tab.screenshot({path:resolve(folder,name+'-'+width+'.png'),fullPage:true})
}
async function organizerProof(tab,width){
 await tooltip(tab)
 const organizer=tab.locator('[data-page-organization]'),controls=organizer.locator('summary,a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select:not([disabled])')
 const expected=await controls.evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>({tag:node.tagName,href:node.getAttribute('href'),label:node.getAttribute('aria-label')??node.textContent.trim()})))
 await organizer.locator('summary').first().focus();const focused=[]
 for(let index=0;index<expected.length;index++){
  focused.push(await tab.evaluate(()=>{const node=document.activeElement,style=getComputedStyle(node);return {tag:node.tagName,href:node.getAttribute('href'),label:node.getAttribute('aria-label')??node.textContent.trim(),ring:style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0||style.boxShadow!=='none'}}));if(index+1<expected.length)await tab.keyboard.press('Tab')
 }
 assert.deepEqual(focused.map(({ring,...node})=>node),expected,'Organizer controls and history links follow keyboard reading order');assert.ok(focused.every(node=>node.ring),'Organizer history links retain visible keyboard focus: '+JSON.stringify(focused.filter(node=>!node.ring)))
 await tab.evaluate(axeSource);assert.deepEqual(await organizer.evaluate(async node=>(await axe.run(node)).violations.map(item=>item.id)),[],'Organizer entry controls pass axe')
 assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Organizer fits '+width);await tab.screenshot({path:resolve(folder,'page-organizer-'+width+'.png'),fullPage:true})
}
async function signUp(tab,context,displayName,email,roles){
 const link=await fixture.invitePerson(ownerContext,{displayName,email,roles})
 await fixture.protect(context);await tab.goto(link)
 await submit(tab,tab.getByRole('button',{name:/Confirm/}))
}
async function publishPost(id){
 await author.goto(origin+'/app/posts?id='+id)
 await submit(author,author.getByRole('button',{name:'Submit for review',exact:true}))
 const submitted=(await own()).posts.find(post=>post.id===id)
 assert.equal(submitted.state,'review');assert.ok(submitted.review)
 await owner.goto(origin+'/app/posts?id='+id)
 const approval=owner.locator('form[action="/app/posts/publish"]')
 assert.equal(await approval.locator('[name=review]').inputValue(),submitted.review,'Owner approves the exact submitted content')
 await submit(owner,approval.getByRole('button',{name:'Approve and publish post',exact:true}))
}
async function publishSite(){
 await owner.goto(origin+'/app')
 await submit(owner,owner.getByRole('button',{name:'Approve & publish',exact:true}))
}
async function deletePage(id){
 await editor.goto(origin+'/app');await editor.getByText('Pages and folders',{exact:true}).click()
 await editor.locator('[data-page-id="'+id+'"]').getByRole('button',{name:/Delete /}).click();await saved(editor)
}
async function earlierPage(id,body){
 let before
 for(let attempt=0;attempt<10;attempt++){
  const query='kind=page&id='+encodeURIComponent(id)+(before?'&before='+encodeURIComponent(before):'')
  const history=await editorContext.request.get(origin+'/api/pane/content/history?'+query).then(json)
  const row=history.rows.find(row=>row.body===body&&row.state==='published')
  if(row){
   await editor.goto(origin+'/app/content/history?'+query)
   await editor.locator('a[href*="revision='+encodeURIComponent(row.revision)+'"]').click()
   return row
  }
  assert.ok(history.next,'Original published page remains in history');before=history.next
 }
 throw Error('Original page was not found through paged history.')
}
try{
 await fixture.bootstrap(ownerContext);await owner.goto(origin+'/setup');await owner.getByRole('checkbox').check()
 await submit(owner,owner.getByRole('button',{name:'Finish setup'}))
 await signUp(author,authorContext,'Workshop author','synthetic-pane-author@example.test',['author'])
 await signUp(editor,editorContext,'Page editor','synthetic-pane-editor@example.test',['editor'])
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 for(const page of site.pages)page.id=page.slug
 site.blogs=[{id:'news',title:'News',prefix:'news',comments:false,pageSize:10}]
 for(const width of [1440,390])for(const slug of ['about','services','hours','contact','old-offer']){
  const source=site.pages.find(page=>page.slug===slug)??{title:'Winter offer',body:'An offer from an earlier season.'}
  site.pages.push({id:slug+'-'+width,slug:slug+'-'+width,title:source.title+' '+width,body:source.body})
 }
 const initial=await call(ownerContext,'/api/pane/prepare',{site});await call(ownerContext,'/api/pane/publish',{revision:initial.id})
 const expired=[]
 for(const width of [1440,390]){
  for(const tab of [owner,author,editor])await tab.setViewportSize({width,height:1000})
  const suffix='-'+width,postTitle='Workshop story '+width
  const created=await call(authorContext,'/api/pane/posts/save',{base:(await own()).base,blog:'news',byline:'Workshop team',authorSlug:'workshop-team',content:{slug:'story'+suffix,title:postTitle,body:'Our original workshop article '+width+'.'}})
  const post=created.posts.find(post=>post.content.title===postTitle)
  await publishPost(post.id)
  await deletePage('old-offer'+suffix);expired.push('old-offer'+suffix)
  await deletePage('about'+suffix)
  await author.goto(origin+'/app/posts?id='+post.id)
  await proof(author,'post-details',width)
  await submit(author,author.getByRole('button',{name:'Move post to trash',exact:true}))
  const changes={}
  for(const slug of ['services','hours','contact']){
   const id=slug+suffix,body='Updated '+slug+' instructions '+width+'.';changes[id]=body
   await editor.goto(origin+'/app?page='+id);await editor.getByLabel('Text',{exact:true}).fill(body);await saved(editor)
  }
  const draft=(await state()).draft,withRedirects=structuredClone(draft.site)
  withRedirects.redirects=[...(withRedirects.redirects??[]),{from:'/site/about'+suffix,to:'/site/services'+suffix,status:301},{from:'/site/news/story'+suffix,to:'/site/news',status:301},{from:'/site/old-offer'+suffix,to:'/site',status:301}]
  await call(ownerContext,'/api/pane/prepare',{base:draft.id,site:withRedirects});await publishSite()
  const removed=await ownerContext.request.get(origin+'/site/news/story'+suffix,{maxRedirects:0});assert.equal(removed.status(),301)
  await editor.goto(origin+'/app');await editor.getByText('Pages and folders',{exact:true}).click()
  await organizerProof(editor,width)
  await editor.getByRole('link',{name:'Page trash',exact:true}).click()
  await editor.getByRole('heading',{name:'Trash',exact:true}).waitFor();const pageTrash=await editorContext.request.get(origin+'/api/pane/content/trash?kind=page').then(json);assert.deepEqual(pageTrash.rows.map(row=>row.id).sort(),[...expired,'about'+suffix].sort(),'Organizer deletions appear immediately in native trash');await editor.getByText(site.pages.find(page=>page.id==='about'+suffix).title,{exact:true}).waitFor();await proof(editor,'page-trash',width)
  await author.goto(origin+'/app/posts');await author.getByRole('link',{name:'Post trash',exact:true}).click()
  const trashCard=author.locator('article').filter({has:author.getByText(postTitle,{exact:true})})
  await trashCard.getByText(/Deleted by Workshop author/).waitFor()
  await proof(author,'post-trash',width)
  await trashCard.getByRole('link',{name:'View history',exact:true}).click();await proof(author,'post-history',width)
  await author.getByRole('link',{name:'Back to Posts',exact:true}).click();await author.getByRole('link',{name:'Post trash',exact:true}).click()
  await submit(author,author.getByRole('button',{name:'Restore draft',exact:true}))
  await author.getByText('No deleted content to restore',{exact:true}).waitFor();await proof(author,'post-trash-empty',width)
  assert.equal((await ownerContext.request.get(origin+'/site/news/story'+suffix,{maxRedirects:0})).status(),301,'Restoring a draft does not publish it')
  await publishPost(post.id)
  assert.equal((await ownerContext.request.get(origin+'/site/news/story'+suffix,{maxRedirects:0})).status(),200)
  const published=(await state()).live.site
  assert.ok(!published.redirects.some(row=>row.from==='/site/news/story'+suffix))
  for(const [id,body] of Object.entries(changes))assert.equal(published.pages.find(page=>page.id===id).body,body,'Post restore retains all three page edits')
  await editor.goto(origin+'/app/content/trash?kind=page')
  const aboutCard=editor.locator('article').filter({has:editor.getByText(site.pages.find(page=>page.id==='about'+suffix).title,{exact:true})})
  await submit(editor,aboutCard.getByRole('button',{name:'Restore draft',exact:true}))
  await publishSite()
  const earlier=site.pages.find(page=>page.id==='services'+suffix)
  await earlierPage(earlier.id,earlier.body);await proof(editor,'page-history',width)
  await editor.getByText(earlier.body,{exact:true}).waitFor()
  const before=(await state()).live.site
  await submit(editor,editor.getByRole('button',{name:'Restore this version',exact:true}))
  await editor.goto(origin+'/app?page='+earlier.slug)
  await submit(editor,editor.getByRole('button',{name:'Send page for review',exact:true}))
  await owner.goto(origin+'/app?page='+earlier.slug)
  await submit(owner,owner.getByRole('button',{name:'Approve this page',exact:true}))
  const after=(await state()).live.site
  assert.equal(after.pages.find(page=>page.id===earlier.id).body,earlier.body)
  for(const page of before.pages.filter(page=>page.id!==earlier.id))assert.deepEqual(after.pages.find(item=>item.id===page.id),page,'Only the selected page changes on publication')
  assert.deepEqual(after.blogPosts,before.blogPosts)
  const response=await ownerContext.request.get(origin+'/site/'+earlier.slug);assert.equal(response.status(),200);assert.ok((await response.text()).includes('Furniture repairs'))
  await owner.goto(origin+'/app/sites')
  const activity=owner.getByRole('heading',{name:'Activity log',exact:true}).locator('..')
  await activity.getByText('content.restore-version',{exact:true}).first().waitFor()
  assert.ok((await activity.innerText()).includes('Page editor'));assert.ok((await activity.innerText()).includes('Workshop author'))
  const events=await ownerContext.request.get(origin+'/api/pane/activity').then(json)
  for(const [action,subject,actor] of [['content.restore','post:'+post.id,'Workshop author'],['content.restore','page:about'+suffix,'Page editor'],['content.restore-version','page:services'+suffix,'Page editor']])assert.ok(events.some(event=>event.action===action&&event.subject===subject&&event.actor===actor&&event.created_at===deletedAt),'Restore activity retains actor and time')
  await owner.screenshot({path:resolve(folder,'restore-activity-'+width+'.png'),fullPage:true})
 }
 process.env.PANE_BROWSER_NOW='2026-11-15T16:00:00Z'
 await fixture.signIn(owner)
 for(const width of [1440,390]){
  await owner.setViewportSize({width,height:1000});await owner.goto(origin+'/app/content/trash?kind=page')
  await owner.getByText('No deleted content to restore',{exact:true}).waitFor();await proof(owner,'expired-page-trash',width)
 }
 for(const id of expired){
  const response=await ownerContext.request.post(origin+'/api/pane/content/restore',{headers:{Origin:origin},data:{kind:'page',id,base:(await state()).draft.id}})
  assert.equal(response.status(),400,'An expired item cannot be restored by guessing its identifier')
 }
 console.log('Trash and selective history browser journey passed at 1440 and 390.')
}finally{await browser.close();await fixture.stop()}
