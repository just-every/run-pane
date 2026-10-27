import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
process.env.PANE_BROWSER_NOW='2026-10-15T16:00:00Z'
const fixture=await import('../tests/browser-runtime.mjs'),{origin}=fixture
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const owner=await browser.newContext({acceptDownloads:true}),mod=await browser.newContext(),writer=await browser.newContext(),visitor=await browser.newContext()
const page=await owner.newPage(),moderator=await mod.newPage(),author=await writer.newPage(),live=await visitor.newPage(),folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/comments')
await mkdir(folder,{recursive:true});await fixture.protect(visitor)
for(const tab of [page,moderator,author,live]){tab.setDefaultTimeout(15000);await tab.setViewportSize({width:1440,height:1000})}
const call=async(context,path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
const state=async()=>{const response=await owner.request.get(origin+'/api/pane');assert.equal(response.status(),200);return response.json()}
async function submit(tab,button){await Promise.all([tab.waitForEvent('domcontentloaded'),button.click()])}
async function proof(tab,name){
 for(const width of [1440,390]){
  await tab.setViewportSize({width,height:1000})
  if(width===1440){await tab.evaluate(await readFile('node_modules/axe-core/axe.min.js','utf8'));const result=await tab.evaluate(()=>axe.run(document));assert.deepEqual(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[],name+' axe')}
  await tab.evaluate(()=>document.activeElement?.blur());await tab.screenshot({path:resolve(folder,name+'-'+width+'.png'),fullPage:true});assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' fits')
 }
 await tab.setViewportSize({width:1440,height:1000})
}
async function tooltip(tab){const control=tab.locator('[data-tip="Account and team"]');await control.hover();await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.mouse.move(0,900);await tab.keyboard.press('Escape');await control.focus();await tab.keyboard.press('Tab');await tab.keyboard.press('Shift+Tab');await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.keyboard.press('Escape')}
try{
 await fixture.bootstrap(owner);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await submit(page,page.getByRole('button',{name:'Finish setup'}))
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8'));starter.blogs=[{id:'news',prefix:'news',title:'News',comments:false,pageSize:10}]
 const initial=await call(owner,'/api/pane/prepare',{site:starter});await call(owner,'/api/pane/publish',{revision:initial.id})
 for(const [context,tab,email,displayName,role] of [[mod,moderator,'synthetic-pane-moderator@example.test','Comment moderator','comment-moderator'],[writer,author,'synthetic-pane-author@example.test','Post author','author']]){
  const link=await fixture.invitePerson(owner,{email,displayName,roles:[role]});await tab.goto(link);await tab.getByRole('button',{name:/Confirm/}).click();await tab.waitForURL(url=>url.pathname===(role==='author'?'/app/posts':'/app/comments'))
 }
 let saved=await call(writer,'/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',content:{slug:'story',title:'A day in the workshop',body:'A story from our local team.'},byline:'Workshop author',authorSlug:'workshop'}),post=saved.posts[0]
 saved=await call(writer,'/api/pane/posts/submit',{base:saved.base,id:post.id});await call(owner,'/api/pane/posts/publish',{base:saved.base,id:post.id,review:saved.posts[0].review})
 await page.goto(origin+'/app/posts');await page.getByText('Settings',{exact:true}).click();await page.getByText('Comment settings',{exact:true}).click();const settings=page.locator('form[action="/app/comments/settings"]');await settings.getByLabel('Enable comments',{exact:true}).check();await settings.getByLabel('Show cookie-free likes',{exact:true}).check();await submit(page,settings.getByRole('button',{name:'Save comment settings'}));await page.getByText('Settings',{exact:true}).click();await page.getByText('Comment settings',{exact:true}).click();await tooltip(page);await proof(page,'comment-settings')
 await live.goto(origin+'/site/news/story');await proof(live,'visitor-comment-form')
 await submit(live,live.getByRole('button',{name:'Like this post',exact:true}));assert.equal(await live.locator('[data-like-count]').textContent(),'1');assert.deepEqual(await visitor.cookies(),[])
 const form=live.locator('form[data-turnstile-key]');await form.getByLabel('Name',{exact:true}).fill('Workshop visitor');await form.getByLabel('Email',{exact:true}).fill('synthetic-pane-commenter@example.test');await form.getByLabel('Comment',{exact:true}).fill('Thank you <script> for this story.');await submit(live,form.getByRole('button',{name:'Submit comment'}));assert.equal(await live.getByText('Thank you <script> for this story.',{exact:true}).count(),0)
 const queue=await (await mod.request.get(origin+'/api/pane/comments')).json(),comment=queue[0];assert.equal(queue.length,1);assert.equal(comment.state,'pending')
 // The same authenticated destination is carried in the email, asserted at the SendGrid edge by the route flow.
 await moderator.goto(origin+'/app/comments?comment='+comment.id);await tooltip(moderator);await proof(moderator,'moderator-notification-review');await moderator.getByLabel('Select comment by Workshop visitor',{exact:true}).check();await submit(moderator,moderator.getByRole('button',{name:'Approve selected',exact:true}));await moderator.goto(origin+'/app/comments?comment='+comment.id);await proof(moderator,'moderator-approved-reply')
 await author.goto(origin+'/app/posts?id='+post.id);await author.getByLabel('Author reply',{exact:true}).fill('Thank you from the workshop.');await proof(author,'author-comment-reply');await submit(author,author.getByRole('button',{name:'Publish author reply',exact:true}))
 await live.reload();assert.equal(await live.getByText('Thank you <script> for this story.',{exact:true}).count(),1);assert.equal(await live.locator('.comment-replies').getByText('Thank you from the workshop.',{exact:true}).count(),1);assert.ok(!(await live.content()).includes('synthetic-pane-commenter@example.test'));await proof(live,'approved-comment-thread')
 await page.goto(origin+'/app/posts?id='+post.id);await submit(page,page.getByRole('button',{name:'Save availability',exact:true}));await live.reload();assert.equal(await live.getByRole('button',{name:'Submit comment'}).count(),0);await proof(live,'closed-comments')
 await fixture.signIn(page)
 await page.goto(origin+'/app/posts');await page.getByText('Settings',{exact:true}).click();await page.getByText('Comment portability',{exact:true}).click()
 const wxrSource=await readFile('fixtures/imports/comment-transfer.xml','utf8'),transfer=page.locator('form[action="/app/comments/import-review"]')
 await transfer.getByLabel('WXR export',{exact:true}).fill(wxrSource);await transfer.getByLabel('Source post URL',{exact:true}).fill('https://synthetic-pane-1.example/workshop');await transfer.getByLabel('Destination post',{exact:true}).selectOption(post.id);await tooltip(page);await proof(page,'comment-transfer-settings')
 await submit(page,transfer.getByRole('button',{name:'Review comment import',exact:true}));await page.getByRole('heading',{name:'Review comment import',exact:true}).waitFor();assert.equal(await page.locator('li').filter({hasText:'2025-02-03T14:15:16.000Z'}).count(),1);await proof(page,'comment-import-review')
 await submit(page,page.getByRole('button',{name:'Import private comments',exact:true}));const imported=(await (await owner.request.get(origin+'/api/pane/comments')).json()).filter(row=>row.import_pending);assert.equal(imported.length,4);assert.deepEqual(imported.map(row=>row.state),['approved','approved','pending','spam']);assert.equal(imported[1].parent,imported[0].id)
 await live.reload();assert.equal(await live.getByText('Kept <script>alert(1)</script> & text',{exact:true}).count(),0);await proof(page,'private-imported-comments')
 for(const row of imported)await page.getByLabel('Select comment by '+row.name,{exact:true}).check()
 await submit(page,page.getByRole('button',{name:'Release imported comments',exact:true}));await live.reload();assert.equal(await live.getByText('Kept <script>alert(1)</script> & text',{exact:true}).count(),1);assert.equal(await live.locator('.comment-replies').getByText('A preserved reply',{exact:true}).count(),1);assert.equal(await live.getByText('Not approved',{exact:true}).count(),0);assert.equal(await live.getByText('Held as spam',{exact:true}).count(),0);await proof(live,'released-imported-thread')
 await page.goto(origin+'/app/posts');await page.getByText('Settings',{exact:true}).click();await page.getByText('Comment portability',{exact:true}).click()
 const [wxrDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Export comments as WXR',exact:true}).click()]);const wxr=await readFile(await wxrDownload.path(),'utf8');assert.ok(wxr.includes('synthetic-pane-10@example.test'));assert.ok(wxr.includes('<wp:comment_parent>1</wp:comment_parent>'));assert.ok(wxr.includes('<wp:comment_approved>spam</wp:comment_approved>'))
 await page.goto(origin+'/app/inquiries');await page.getByLabel('Person email',{exact:true}).fill('synthetic-pane-commenter@example.test');await submit(page,page.getByRole('button',{name:'Find person data'}));await proof(page,'comment-person-privacy')
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export person data'}).click()]);const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.deepEqual(exported.comments.map(row=>row.id),[comment.id]);assert.equal(exported.comments[0].body,'Thank you <script> for this story.')
 await page.getByText('Erase all matched person data',{exact:true}).click();await page.getByRole('checkbox',{name:/I confirm permanent erasure/}).check();await submit(page,page.getByRole('button',{name:'Permanently erase person data'}));await live.reload();assert.equal(await live.getByText('Thank you <script> for this story.',{exact:true}).count(),0)
 console.log('Comments browser journey passed: approval, notification review, author thread, closure and person custody; screens at 1440 and 390.')
}finally{await browser.close();await fixture.stop()}
