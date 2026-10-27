import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {chromium} from '@playwright/test'
process.env.PANE_BROWSER_NOW='2026-10-15T16:00:00Z'
const fixture=await import('../tests/browser-runtime.mjs'),{origin}=fixture
const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext({acceptDownloads:true}),authorContext=await browser.newContext({acceptDownloads:true}),visitor=await browser.newContext()
const page=await context.newPage(),author=await authorContext.newPage(),live=await visitor.newPage(),folder=resolve(process.env.PANE_SCREENSHOTS??'./test-results/posts')
await mkdir(folder,{recursive:true});await visitor.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());for(const tab of [page,author,live])tab.setDefaultTimeout(20000)
const state=async()=>{const response=await context.request.get(origin+'/api/pane');assert.equal(response.status(),200);return response.json()}
const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
const capture=async(tab,name,width)=>{
 if(['author-posts','owner-review','owner-settings','author-composer','published-owner','published-author'].includes(name)){
  await tab.evaluate(await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8'));const result=await tab.evaluate(()=>axe.run(document));assert.deepEqual(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[],name+' axe')
 }
 await tab.screenshot({path:resolve(folder,name+'-'+width+'.png'),fullPage:true});assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' fits at '+width)
}
const saved=async()=>author.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
async function submit(tab,button){await Promise.all([tab.waitForEvent('domcontentloaded'),button.click()])}
async function tooltip(tab){const account=tab.locator('[data-tip="Account and team"]');await account.hover();await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.mouse.move(0,500);await tab.keyboard.press('Escape');await account.focus();await tab.keyboard.press('Tab');await tab.keyboard.press('Shift+Tab');await tab.getByRole('tooltip').getByText('Account and team',{exact:true}).waitFor();await tab.keyboard.press('Escape')}
async function editBody(post,linked,file,width){
 await author.goto(origin+'/app/posts/canvas?id='+post.id)
 await author.getByText('Links and body blocks',{exact:true}).click();await author.getByLabel('Page, post or file',{exact:true}).selectOption('file:'+file.id);assert.equal(await author.getByLabel('URL or saved reference',{exact:true}).inputValue(),'file:'+file.id);await author.getByText('Links and body blocks',{exact:true}).click()
 const block=author.locator('[data-layout-canvas] [contenteditable=true]').first()
 await block.evaluate((node,html)=>{node.focus();const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);const data=new DataTransfer();data.setData('text/html',html);data.setData('text/plain','Decorating celebration cakes');node.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}))},`<h2>Decorating celebration cakes</h2><h3>Prepare the layers</h3><ul><li>Vanilla sponge<ul><li>Lemon curd</li></ul></li></ul><p><strong>Fold gently</strong> and <em>cool first</em>. <a href="post:${linked.id}">Read our bakery story</a> <a href="file:${file.id}">Download cake guide</a> <a href="tel:+13125550123">Call the bakery</a></p>`)
 await saved()
 for(const [index,caption] of ['Lemon cake with flowers','Chocolate cake for a celebration'].entries()){
  await author.locator('[data-image-upload]').setInputFiles({name:'celebration-'+index+'.webp',mimeType:'image/webp',buffer:await readFile('public/site/cake-'+[3,2][index]+'.webp')})
  await author.locator('[data-layout-canvas] [data-image-block]').nth(index).waitFor()
  await author.getByLabel('Alternative text',{exact:true}).fill(index?'A chocolate celebration cake with piped decoration':'A lemon celebration cake ready for a birthday')
  await author.getByLabel('Caption',{exact:true}).fill(caption);await saved()
 }
 await author.getByText('Links and body blocks',{exact:true}).click()
 await author.getByRole('button',{name:'Add quote',exact:true}).click()
 await author.locator('[data-quote-block] [contenteditable=true]').fill('A celebration starts with something made with care.')
 await author.getByLabel('Attribution',{exact:true}).fill('Riverbend baking team');await saved()
 await author.getByLabel('Embed block type',{exact:true}).selectOption('video');await author.getByLabel('Embed title',{exact:true}).fill('How to decorate a cake');await author.getByLabel('Provider embed URL',{exact:true}).fill('https://www.youtube-nocookie.com/embed/syntheticPane1');await author.getByRole('button',{name:'Add external embed',exact:true}).click();await saved()
 await author.getByLabel('Button label',{exact:true}).fill('Meet the bakers');await author.getByLabel('Page, post or file',{exact:true}).selectOption('page:about');await author.getByRole('button',{name:'Add button',exact:true}).click();await saved()
 // Five durable saves through the shared section editor support undo, redo and reopen.
 const title=author.getByLabel('Post title',{exact:true})
 for(let index=1;index<=5;index++){await title.fill('Decorating celebration cakes '+index);await saved()}
 for(let index=4;index>=0;index--){await author.getByRole('button',{name:'Undo',exact:true}).click();await saved();assert.equal(await title.inputValue(),index?'Decorating celebration cakes '+index:post.content.title)}
 for(let index=1;index<=5;index++){await author.getByRole('button',{name:'Redo',exact:true}).click();await saved();assert.equal(await title.inputValue(),'Decorating celebration cakes '+index)}
 await author.getByRole('link',{name:'Back to Posts',exact:true}).click();await author.waitForURL(url=>url.pathname==='/app/posts');await author.goto(origin+'/app/posts/canvas?id='+post.id);assert.equal(await title.inputValue(),'Decorating celebration cakes 5');await author.locator('[data-layout-canvas] h2').getByText('Decorating celebration cakes',{exact:true}).waitFor()
 await capture(author,'author-body',width)
 // A second native browser tab creates a real stale-base conflict and retains work.
 const second=await authorContext.newPage();await second.goto(origin+'/app/posts/canvas?id='+post.id)
 await second.getByLabel('Post title',{exact:true}).fill('Owner review edition');await second.waitForFunction(()=>document.querySelector('[data-save-status]')?.textContent==='Draft saved. Not published.')
 await title.fill('My retained edition');await author.locator('[data-conflict]:not([hidden])').waitFor();assert.equal(await title.inputValue(),'My retained edition')
 const [download]=await Promise.all([author.waitForEvent('download'),author.getByRole('button',{name:'Download my copy',exact:true}).click()]);assert.equal(download.suggestedFilename(),'my-post-draft.json')
 await author.getByRole('button',{name:'Use latest draft',exact:true}).click();await author.waitForFunction(()=>document.querySelector('[name=title]')?.value==='Owner review edition');await second.close()
 await author.goto(origin+'/app/posts?id='+post.id)
}
try{
 await fixture.bootstrap(context);await page.goto(origin+'/setup');await page.getByRole('checkbox').check();await submit(page,page.getByRole('button',{name:'Finish setup'}))
 const starter=JSON.parse(await readFile('fixtures/static-site.json','utf8')),initial=await call('/api/pane/prepare',{site:starter});await call('/api/pane/publish',{revision:initial.id})
 const link=await fixture.invitePerson(context,{email:'synthetic-pane-author@example.test',displayName:'Workshop author',roles:['author']})
 await author.goto(link);await author.getByRole('button',{name:/Confirm/}).click();await author.waitForURL(url=>url.pathname==='/app/posts')
 const blogs=new Map()
 for(const [prefix,title] of [['news','News'],['recipes','Recipes']]){
  await page.goto(origin+'/app/posts');await page.getByText('Settings',{exact:true}).click();await page.getByText('Blog settings',{exact:true}).click();const form=page.locator('[data-blog-settings]')
  await form.getByLabel('Choose blog',{exact:true}).selectOption('');await form.getByLabel('Blog title',{exact:true}).fill(title);await form.getByLabel('URL prefix',{exact:true}).fill(prefix);await form.getByLabel('Posts per page',{exact:true}).fill('2');await form.locator('[data-blog-save-status]').getByText('Saved',{exact:true}).waitFor()
  blogs.set(prefix,(await state()).draft.site.blogs.find(blog=>blog.title===title).id)
 }
 // A real stale revision keeps the owner's entered settings visible.
 {const form=page.locator('[data-blog-settings]'),latest=await state();await call('/api/pane/prepare',{base:latest.draft.id,site:latest.draft.site});await form.getByLabel('Blog title',{exact:true}).fill('Retained recipe title');await form.locator('[data-blog-save-status]').getByText('Another editor saved changes. Your values are kept here.',{exact:true}).waitFor();assert.equal(await form.getByLabel('Blog title',{exact:true}).inputValue(),'Retained recipe title');page.once('dialog',dialog=>dialog.accept());await page.reload()}
 await page.getByText('Settings',{exact:true}).click();await page.getByText('PDF library',{exact:true}).click();await page.getByLabel('Library PDF',{exact:true}).setInputFiles({name:'care-guide.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic-pane-care-guide\n%%EOF')});await submit(page,page.getByRole('button',{name:'Upload private PDF'}));const file=(await state()).draft.site.libraryFiles[0]
 const librarySite=structuredClone((await state()).draft.site),libraryPage=librarySite.pages.find(page=>page.slug==='about');libraryPage.sections=[{id:'library-guide',kind:'text',blocks:[{id:'guide-link',kind:'text',format:'div',text:'Download the cake guide',column:1,span:12,row:1,content:[{tag:'p',children:[{tag:'a',href:'file:'+file.id,newTab:false,children:[{tag:'text',text:'Download the cake guide'}]}]}]}]}];libraryPage.body='Download the cake guide';const guide=await call('/api/pane/prepare',{base:(await state()).draft.id,site:librarySite});await call('/api/pane/publish',{revision:guide.id})
 const created=[]
 for(const blog of ['news','recipes'])for(let index=0;index<3;index++){
  await author.goto(origin+'/app/posts');const details=author.locator('details').filter({has:author.getByText('Write a post',{exact:true})});if(await details.getAttribute('open')===null)await details.locator('summary').click();const form=details.locator('form')
  await form.getByLabel('Blog',{exact:true}).selectOption(blogs.get(blog));await form.getByLabel('Post title',{exact:true}).fill((blog==='news'?'Workshop news ':'Seasonal recipe ')+(index+1));await form.getByLabel('Post URL',{exact:true}).fill('story-'+index);await form.getByLabel('Opening paragraph',{exact:true}).fill('Practical advice and stories from Cedar Street Studio.');await form.getByLabel('Public byline',{exact:true}).fill('Cedar Street team');await form.getByLabel('Author page URL',{exact:true}).fill('cedar-team');await submit(author,form.getByRole('button',{name:'Create private post'}))
  const id=new URL(author.url()).searchParams.get('id'),current=(await state()).draft.site.posts.find(post=>post.id===id);created.push(current)
  const metadata=author.locator('form[action="/app/posts/save"]').filter({has:author.locator('input[name=id]')})
  if(blog==='news'&&index===0){await metadata.getByText('Featured image',{exact:true}).click();await metadata.locator('[data-post-featured]').setInputFiles({name:'lemon-cake.webp',mimeType:'image/webp',buffer:await readFile('public/site/cake-3.webp')});await author.waitForFunction(()=>!!document.querySelector('[name=featuredImage]')?.value);await metadata.getByLabel('Featured image description',{exact:true}).fill('Lemon celebration cake with flowers')}
  await metadata.getByLabel('Categories',{exact:true}).fill('Workshop');await metadata.getByLabel('Tags',{exact:true}).fill('Care');await metadata.getByLabel('Excerpt',{exact:true}).fill('News and useful advice from our workshop.');await submit(author,metadata.getByRole('button',{name:'Save post details'}))
 }
 for(const width of [1440,390]){
  for(const tab of [page,author,live])await tab.setViewportSize({width,height:1000})
  await author.goto(origin+'/app/posts');await tooltip(author);await capture(author,'author-posts',width)
  await page.goto(origin+'/app/posts');await tooltip(page);await capture(page,'owner-review',width)
  await page.getByText('Settings',{exact:true}).click();await page.getByText('Blog settings',{exact:true}).click();await page.getByText('PDF library',{exact:true}).click();await capture(page,'owner-settings',width)
  await author.getByText('Write a post',{exact:true}).click();await capture(author,'author-composer',width)
 }
 await author.setViewportSize({width:1440,height:1000});await editBody(created[0],created[1],file,1440)
 for(const post of [...created.slice(1),created[0]]){
  await author.goto(origin+'/app/posts?id='+post.id);await submit(author,author.getByRole('button',{name:'Submit for review'}))
  await page.goto(origin+'/app/posts?id='+post.id);await submit(page,page.getByRole('button',{name:'Approve and publish post'}))
 }
 const published=(await state()).live
 assert.equal(published.site.blogPosts.length,6);assert.equal((await state()).draft.site.posts.length,6)
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/app/posts?id='+created[0].id);await capture(page,'published-owner',width)
  await author.setViewportSize({width,height:1000});await author.goto(origin+'/app/posts?id='+created[0].id);assert.equal(await author.getByText(/^Review deleted or unpublished link targets:/).count(),0,'Published page and PDF targets stay valid in the private author screen');await capture(author,'published-author',width);await author.goto(origin+'/app/posts/canvas?id='+created[0].id);await capture(author,'durable-body',width)
  await live.setViewportSize({width,height:1000})
  let outbound=[];live.on('request',request=>{if(new URL(request.url()).origin!==origin)outbound.push(request.url())})
  await live.goto(origin+'/site/news/story-0');await live.locator('.public-content h2').getByText('Decorating celebration cakes',{exact:true}).waitFor();await capture(live,'live-post',width)
  const body=live.locator('.public-content')
  assert.equal(await body.locator('h3').getByText('Prepare the layers',{exact:true}).count(),1);assert.equal(await body.locator('ul > li > ul > li').innerText(),'Lemon curd');assert.equal(await body.locator('strong').getByText('Fold gently',{exact:true}).count(),1);assert.equal(await body.locator('em').getByText('cool first',{exact:true}).count(),1)
  assert.deepEqual(await body.locator('figure[data-image-block] figcaption').allTextContents(),['Lemon cake with flowers','Chocolate cake for a celebration']);assert.deepEqual(await body.locator('figure[data-image-block] img').evaluateAll(nodes=>nodes.map(node=>node.alt)),['A lemon celebration cake ready for a birthday','A chocolate celebration cake with piped decoration'])
  assert.equal(await body.locator('figure[data-quote-block] blockquote').innerText(),'A celebration starts with something made with care.');assert.equal(await body.locator('figure[data-quote-block] figcaption').innerText(),'Riverbend baking team');assert.equal(await body.locator('[data-embed]').getAttribute('data-url'),'https://www.youtube-nocookie.com/embed/syntheticPane1');assert.equal(await body.locator('iframe').count(),0)
  assert.equal(await body.getByRole('link',{name:'Meet the bakers',exact:true}).getAttribute('href'),'/site/about');assert.equal(await body.getByRole('link',{name:'Read our bakery story',exact:true}).getAttribute('href'),'/site/news/story-1');assert.equal(await body.getByRole('link',{name:'Download cake guide',exact:true}).getAttribute('href'),'/site/files/'+file.id);assert.equal(await body.getByRole('link',{name:'Call the bakery',exact:true}).getAttribute('href'),'tel:+13125550123')
  assert.deepEqual(outbound,[],'No embed or sharing provider is contacted before a visitor action')
  const expected=await body.locator('a[href],button').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>node.textContent.trim())),focused=[]
  await live.locator('h1').evaluate(node=>{node.tabIndex=-1;node.focus()})
  for(let index=0;index<expected.length;index++){await live.keyboard.press('Tab');focused.push(await live.evaluate(()=>document.activeElement.textContent.trim()))}
  assert.deepEqual(focused,expected,'Body links and controls follow the semantic reading order')
  await live.evaluate(await readFile(resolve('node_modules/axe-core/axe.min.js'),'utf8'));const axe=await live.evaluate(()=>axe.run(document));assert.deepEqual(axe.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[])
  await visitor.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Video provider edge</title><p>Requested cake video</p>'}))
  await body.getByRole('button',{name:'Allow external content',exact:true}).click();await live.frameLocator('[data-embed] iframe').getByText('Requested cake video',{exact:true}).waitFor()
  assert.equal(await body.locator('iframe').getAttribute('src'),'https://www.youtube-nocookie.com/embed/syntheticPane1');assert.equal(await body.locator('iframe').getAttribute('allow'),null)
  await body.getByRole('button',{name:'Keep external content off',exact:true}).click();assert.equal(await body.locator('iframe').count(),0)
  for(const name of ['Facebook','X','LinkedIn','Pinterest','Email']){
   const button=live.getByRole('link',{name:'Share by '+name,exact:true}),href=await button.getAttribute('href'),url=new URL(href),postUrl=origin+'/site/news/story-0'
   assert.equal(url.searchParams.get(name==='Facebook'?'u':name==='Email'?'body':'url'),postUrl)
   if(name!=='Email'){
    await visitor.route(url.origin+'/**',route=>route.fulfill({contentType:'text/html',body:'<p>Sharing destination received the selected post.</p>'}));const [popup]=await Promise.all([live.waitForEvent('popup'),button.click()]);await popup.waitForLoadState();assert.equal(new URL(popup.url()).searchParams.get(name==='Facebook'?'u':'url'),postUrl);await popup.close()
   }else{await button.click();assert.equal(new URL(href).searchParams.get('body'),postUrl)}
  }
  for(const blog of ['news','recipes']){
   await live.goto(origin+'/site/'+blog);assert.equal(await live.locator('main article').count(),2);await capture(live,blog+'-index',width);if(blog==='news'){const image=live.locator('main article img');await image.waitFor();assert.ok(await image.getAttribute('srcset'));assert.equal(await image.getAttribute('loading'),'lazy');await image.scrollIntoViewIfNeeded();await image.evaluate(node=>node.decode());const currentSrc=await image.evaluate(node=>node.currentSrc);assert.ok(new URL(currentSrc).searchParams.has('width'));const raster=await visitor.request.get(currentSrc);assert.equal(raster.status(),200);assert.equal(raster.headers()['content-type'],'image/webp')}
   await live.getByRole('link',{name:'Next page',exact:true}).click();assert.equal(await live.locator('main article').count(),1)
   for(const suffix of ['/category/Workshop','/tag/Care','/author/cedar-team','/archive/'+published.site.blogPosts[0].publishedAt.slice(0,7)]){const response=await live.goto(origin+'/site/'+blog+suffix);assert.equal(response.status(),200);await capture(live,blog+'-'+suffix.split('/')[1],width)}
   const feed=await visitor.request.get(origin+'/site/'+blog+'/feed.xml');assert.equal(feed.status(),200);const xml=await feed.text();assert.equal((xml.match(/<item>/g)??[]).length,3);assert.ok(!xml.includes(blog==='news'?'Seasonal recipe':'Workshop news'))
   if(blog==='news'){const semantic=await live.evaluate(xml=>{const rss=new DOMParser().parseFromString(xml,'application/xml'),item=[...rss.querySelectorAll('item')].find(item=>item.querySelector('link').textContent.endsWith('/news/story-0')),doc=new DOMParser().parseFromString(item.querySelector('description').textContent,'text/html');return {headings:[...doc.querySelectorAll('h2,h3')].map(node=>[node.tagName,node.textContent]),nested:doc.querySelector('ul > li > ul > li')?.textContent,strong:doc.querySelector('strong')?.textContent,em:doc.querySelector('em')?.textContent,captions:[...doc.querySelectorAll('figure[data-image-block] figcaption')].map(node=>node.textContent),images:[...doc.querySelectorAll('figure[data-image-block] img')].map(node=>node.getAttribute('src')),links:[...doc.querySelectorAll('a')].map(node=>node.getAttribute('href'))}},xml);assert.deepEqual(semantic.headings,[['H2','Decorating celebration cakes'],['H3','Prepare the layers'],['H2','How to decorate a cake']]);assert.equal(semantic.nested,'Lemon curd');assert.equal(semantic.strong,'Fold gently');assert.equal(semantic.em,'cool first');assert.deepEqual(semantic.captions,['Lemon cake with flowers','Chocolate cake for a celebration']);assert.equal(semantic.images.length,2);for(const src of semantic.images)assert.ok(src.startsWith(origin+'/site/news/story-0?pane-image='));assert.deepEqual(semantic.links,[origin+'/site/news/story-1',origin+'/site/files/'+file.id,'tel:+13125550123',origin+'/site/about'])}
  }
 }
 // Rename by reference: the referring post does not need an edit or redirect.
 await author.goto(origin+'/app/posts?id='+created[1].id);const metadata=author.locator('form[action="/app/posts/save"]').filter({has:author.locator('input[name=id]')});await metadata.getByLabel('Post URL',{exact:true}).fill('renamed-story');await submit(author,metadata.getByRole('button',{name:'Save post details'}));await submit(author,author.getByRole('button',{name:'Submit for review'}));await page.goto(origin+'/app/posts?id='+created[1].id);await submit(page,page.getByRole('button',{name:'Approve and publish post'}));await live.goto(origin+'/site/news/story-0');assert.equal(await live.getByRole('link',{name:'Read our bakery story',exact:true}).getAttribute('href'),'/site/news/renamed-story')
 console.log('Posts browser journey passed: two isolated blogs, native author review, semantic body, private PDF, history and conflicts, reference rename, feeds and visitor-triggered sharing at 1440 and 390.')
}catch(error){console.error('Post journey owner URL: '+page.url());console.error((await page.locator('body').innerText()).slice(0,4000));await page.screenshot({path:resolve(folder,'failure-owner.png'),fullPage:true});console.error('Post journey author URL: '+author.url());console.error((await author.locator('body').innerText()).slice(0,4000));await author.screenshot({path:resolve(folder,'failure-author.png'),fullPage:true});throw error}finally{await browser.close();await fixture.stop()}
