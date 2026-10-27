import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runtime,settings} from './runtime.mjs'
import {postBody} from './post-fixture.mjs'

test('authors submit two isolated blogs for exact owner approval and public semantic delivery',async()=>{
 const origin='https://pane.example.test',outbounds=[],mail=[],f=await runtime({isolatedLive:true,now:Date.parse('2026-10-15T16:00:00Z'),bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-7'},outboundService:async request=>{outbounds.push(request.url);assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');mail.push(await request.json());return new Response(null,{status:202})}})
 let owner,author,other,person,admin,ownerId;const publications=[]
 const call=(path,input,cookie=owner,headers={})=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json',...headers},body:JSON.stringify(input)})
 const get=(path,cookie=owner)=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=async()=>ok(await get('/api/pane'))
 const own=async(cookie=author)=>ok(await get('/api/pane/posts',cookie))
 try{
  const first=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Workshop owner'},'');assert.equal(first.status,303);owner=first.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'));site.pages.find(page=>page.slug==='services').access={mode:'members'};site.pages.find(page=>page.slug==='services').title='synthetic-pane-private-service-title';site.blogs=[{id:'news',prefix:'news',title:'News',comments:false,pageSize:2},{id:'recipes',prefix:'recipes',title:'Recipes',comments:false,pageSize:10}]
  const initial=await ok(await call('/api/pane/prepare',{site}));await ok(await call('/api/pane/publish',{revision:initial.id}));publications.push(initial.id);const nativePeople=(await state()).people;ownerId=Object.keys(nativePeople).find(id=>nativePeople[id]==='Workshop owner');assert.ok(ownerId)
  for(const [email,name] of [['synthetic-pane-author@example.test','Workshop author'],['synthetic-pane-other@example.test','Another author']]){
   const invitation=await ok(await call('/api/pane/roles/invite',{email,displayName:name,roles:['author']}))
   const text=mail.at(-1).content.find(part=>part.type==='text/plain').value
   const confirmed=await call('/auth/confirm',{token:new URL(text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(confirmed.status,303)
   if(name==='Workshop author'){author=confirmed.headers.get('set-cookie').split(';')[0];person=invitation.operatorId}else other=confirmed.headers.get('set-cookie').split(';')[0]
  }
  assert.equal((await call('/auth/invite',{email:'synthetic-pane-admin@example.test',displayName:'Workshop administrator',role:'admin'})).status,202)
  const adminText=mail.at(-1).content.find(part=>part.type==='text/plain').value,adminConfirmed=await call('/auth/confirm',{token:new URL(adminText.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(adminConfirmed.status,303);admin=adminConfirmed.headers.get('set-cookie').split(';')[0]
  const invitationCalls=outbounds.length;assert.equal(invitationCalls,3)
  const write=async(blog,index,extra={},cookie=author)=>ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog,content:{slug:'story-'+index,title:blog+' story '+index,body:'Stories from our local workshop.'},excerpt:'A useful workshop story.',categories:[index===2?'Celebration':'Workshop'],tags:[index===2?'Seasonal':'Care'],byline:index===2?'Guest bakers':'Cedar Street team',authorSlug:index===2?'guest-team':'cedar-team',...extra},cookie))
  const foreign=(await write('news',99,{},other)).posts[0]
  const created=[]
  for(const blog of ['news','recipes'])for(let index=0;index<3;index++){const saved=await write(blog,index),post=saved.posts.at(-1);created.push(post.id);assert.equal(post.author,person);assert.equal((await get('/site/'+blog+'/story-'+index,'')).status,404)}
  assert.equal((await own()).posts.length,6);assert.ok(!JSON.stringify(await own()).includes(foreign.id))
  assert.equal((await call('/api/pane/posts/save',{base:(await own()).base,id:foreign.id,content:foreign.content},author)).status,403)
  const pdf=Buffer.from('%PDF-1.4\nsynthetic-pane-care-guide\n%%EOF'),form=new FormData();form.set('base',(await state()).draft.id);form.set('file',new File([pdf],'care-guide.pdf',{type:'application/pdf'}))
  const uploaded=await f.request(origin+'/api/pane/library/upload',{method:'POST',headers:{Origin:origin,Cookie:owner},body:form});const library=await ok(uploaded),file=library.site.libraryFiles[0]
  assert.equal((await get('/site/files/'+file.id,'')).status,404);await ok(await call('/api/pane/publish',{revision:library.id}));publications.push(library.id);assert.equal((await get('/site/files/'+file.id,'')).status,404,'Publishing an unreferenced private PDF does not expose it')
  const image={src:'data:image/png;base64,'+(await readFile('public/brand/icon-192.png')).toString('base64'),width:192,height:192,decorative:false,alt:'Workshop image'}
  let posts=await own(),bodyPost=posts.posts.find(post=>post.id===created[0]),linked=posts.posts.find(post=>post.id===created[1])
  const body=postBody(image,{post:linked.id,file:file.id})
  body.sections[0].blocks.push({id:'gallery',kind:'gallery',text:'A seasonal celebration',column:1,span:12,row:7,order:0,align:'left',vertical:'start',gallery:{layout:'grid',columns:1,phoneColumns:1,gap:12,phoneGap:12,lightbox:true,items:[{asset:'synthetic-pane-cake-gallery',caption:'A seasonal celebration'}]}});body.body+='\n\nA seasonal celebration'
  await write('news',0,{id:bodyPost.id,featuredImage:image,media:[{id:'synthetic-pane-cake-gallery',name:'Seasonal cake',image}],content:{...bodyPost.content,...body}})
  const unrelated=structuredClone((await state()).draft.site);unrelated.pages[0].body='Unpublished owner page work.';await ok(await call('/api/pane/prepare',{base:(await state()).draft.id,site:unrelated}))
  // Foreign-origin edits and non-owner publication cannot change any snapshot.
  assert.equal((await get('/api/pane/posts','')).status,401)
  assert.equal((await get('/app/posts/canvas?id='+foreign.id,author)).status,403)
  const authorScreen=await (await get('/app/posts',author)).text();assert.ok(authorScreen.includes('news story 0'));assert.ok(!authorScreen.includes(foreign.id));assert.ok(!authorScreen.includes('Unpublished owner page work.'));const authorCanvas=await (await get('/app/posts/canvas?id='+bodyPost.id,author)).text();assert.ok(authorCanvas.includes('Page: Our studio'),'Authors can select an approved public page');assert.ok(!authorCanvas.includes('synthetic-pane-private-service-title'),'The author picker does not expose protected page metadata')
  const before=await state();assert.equal((await call('/api/pane/posts/submit',{base:before.draft.id,id:bodyPost.id},author,{Origin:'https://elsewhere.invalid'})).status,403)
  assert.equal((await call('/api/pane/posts/publish',{base:before.draft.id,id:bodyPost.id,review:'synthetic-pane-1'},author)).status,403)
  assert.deepEqual(await state(),before)
  for(const id of [...created.slice(1),created[0]]){
   const submitted=await ok(await call('/api/pane/posts/submit',{base:(await own()).base,id},author)),post=submitted.posts.find(post=>post.id===id)
   assert.ok(post.review);assert.equal((await call('/api/pane/posts/publish',{base:submitted.base,id,review:post.review},admin)).status,403);assert.equal((await call('/api/pane/posts/publish',{base:'synthetic-pane-stale',id,review:post.review})).status,409);assert.equal((await call('/api/pane/posts/publish',{base:submitted.base,id,review:'synthetic-pane-wrong'},owner)).status,400)
   const prior=(await state()).live,source=structuredClone((await state()).draft),published=await ok(await call('/api/pane/posts/publish',{base:submitted.base,id,review:post.review}));publications.push(published.id);assert.equal(published.actor,ownerId,'A reviewed post records the exact approving native owner');assert.equal((await state()).approvals.find(approval=>approval.revision===published.id).actor,ownerId,'The persisted approval belongs to that same owner')
   assert.deepEqual(published.site.pages,initial.site.pages,'A post approval never publishes unrelated owner page work');for(const previous of prior.site.blogPosts??[])if(previous.id!==id)assert.deepEqual(published.site.blogPosts.find(item=>item.id===previous.id),previous,'Other approved posts stay exact')
   assert.equal(published.site.blogPosts.at(-1).id,id);assert.equal(published.site.blogPosts.at(-1).author,undefined)
   assert.equal((await own()).posts.length,6);assert.deepEqual((await state()).revisions.find(row=>row.id===source.id),source)
  }
  for(const blog of ['news','recipes']){
   const index=await get('/site/'+blog,'');assert.equal(index.status,200);const html=await index.text();assert.ok(html.includes(blog+' story'));assert.ok(!html.includes((blog==='news'?'recipes':'news')+' story'))
   const feed=await get('/site/'+blog+'/feed.xml','');assert.equal(feed.status,200);const xml=await feed.text();assert.equal((xml.match(/<item>/g)??[]).length,3);assert.ok(!xml.includes((blog==='news'?'recipes':'news')+' story'));assert.ok(!xml.includes(foreign.id))
   for(const path of ['/category/Workshop','/tag/Care','/author/cedar-team']){const response=await get('/site/'+blog+path,'');assert.equal(response.status,200);const filtered=await response.text();assert.deepEqual([...filtered.matchAll(/<article><h2><a[^>]*>([^<]+)<\/a><\/h2>/g)].map(match=>match[1]).sort(),[blog+' story 0',blog+' story 1'],'Taxonomy and author routes return exactly their matching blog posts')}
   assert.equal((await get('/site/'+blog+'/archive/2026-10','')).status,200)
   for(let index=0;index<3;index++)assert.equal((await get('/site/'+blog+'/story-'+index,'')).status,200)
  }
  assert.match(await (await get('/site/news?page=2','')).text(),/news story/)
  const html=await (await get('/site/news/story-0','')).text()
  for(const pattern of [/<h2[^>]*>Decorating celebration cakes<\/h2>/,/<h3[^>]*>Prepare the layers<\/h3>/,/<ul><li>Vanilla sponge<ul><li>Lemon curd<\/li><\/ul><\/li><\/ul>/,/<strong>Fold gently<\/strong>/,/<em>cool first<\/em>/,/<figcaption>Lemon cake with flowers<\/figcaption>/,/<figcaption>Chocolate cake for a celebration<\/figcaption>/,/<blockquote[^>]*>A celebration starts with something made with care\./,/Riverbend baking team/,/data-embed/,/<a\b[^>]*href="\/site\/about"[^>]*>Meet the bakers<\/a>/,/href="\/site\/news\/story-1"/,new RegExp('href="/site/files/'+file.id+'"'),/href="tel:\+13125550123"/])assert.match(html,pattern)
  assert.ok(html.includes('property="og:image"'));assert.equal((await get('/site/news/story-0?featured=1','')).status,200);assert.equal((await get('/site/news/story-0?featured=1&width=not-a-width','')).status,404);const featuredHead=await f.request(origin+'/site/news/story-0?featured=1',{method:'HEAD'});assert.equal(featuredHead.status,200);assert.equal((await featuredHead.arrayBuffer()).byteLength,0)
  assert.doesNotMatch(html,/<iframe/);assert.ok(!html.includes('synthetic-pane-author@example.test'));assert.ok(!html.includes('Another author'))
  assert.match(html,/data-gallery/);const liveGallery=(await state()).live.site.blogPosts.find(item=>item.id===bodyPost.id).content.sections[0].blocks.find(block=>block.gallery).gallery.items[0].asset;assert.notEqual(liveGallery,'synthetic-pane-cake-gallery');assert.equal((await get('/site/news/story-0?pane-image=gallery:'+liveGallery+'&width=0','')).status,200);assert.equal((await own()).posts.find(item=>item.id===bodyPost.id).media[0].id,'synthetic-pane-cake-gallery')
  const served=await get('/site/files/'+file.id,'');assert.equal(served.status,200);assert.match(served.headers.get('content-disposition'),/^attachment/);assert.deepEqual(Buffer.from(await served.arrayBuffer()),pdf)
  const feed=await (await get('/site/news/feed.xml','')).text();assert.ok(feed.includes('&lt;h2'));assert.ok(feed.includes(origin+'/site/news/story-1'));assert.ok(feed.includes(origin+'/site/files/'+file.id));assert.ok(!feed.includes('href=&quot;/site'))
  linked=(await own()).posts.find(post=>post.id===linked.id)
  await write('news',1,{id:linked.id,content:{...linked.content,slug:'renamed-story'}})
  const submitted=await ok(await call('/api/pane/posts/submit',{base:(await own()).base,id:linked.id},author)),review=submitted.posts.find(post=>post.id===linked.id).review
  const renamed=await ok(await call('/api/pane/posts/publish',{base:submitted.base,id:linked.id,review}));publications.push(renamed.id)
  assert.match(await (await get('/site/news/story-0','')).text(),/href="\/site\/news\/renamed-story"/);assert.equal((await get('/site/news/renamed-story','')).status,200)
  assert.deepEqual(outbounds.slice(invitationCalls),[],'Writing, submission and explicit publication perform no outbound action')
  const audit=await ok(await get('/api/pane/activity'));const approvals=audit.filter(event=>event.action==='publish');assert.deepEqual(approvals.map(event=>event.subject).sort(),publications.map(id=>'revision:'+id).sort(),'Every explicit publication has one transactional activity entry');for(const event of approvals){assert.equal(event.actor,'Workshop owner');assert.ok(Number.isFinite(Date.parse(event.created_at)));assert.deepEqual(Object.keys(event).sort(),['sequence','action','subject','created_at','actor','agent','details'].sort());assert.equal(event.details,null)}for(const privateValue of [body.body,'Unpublished owner page work.','synthetic-pane-author@example.test'])assert.ok(!JSON.stringify(audit).includes(privateValue),'Activity retains only change metadata')
 }finally{await f.mf.dispose()}
})
