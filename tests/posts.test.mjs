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

test('trash and single-item history restore preserve unrelated published edits and expire availability',async()=>{
 let clock=Date.parse('2026-10-15T16:00:00Z'),owner,author,other,editor,reporter
 const origin='https://pane.example.test',mail=[],outbounds=[],f=await runtime({isolatedLive:true,now:()=>clock,bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-8'},outboundService:async request=>{outbounds.push(request.url);assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');mail.push(await request.json());return new Response(null,{status:202})}})
 const call=(path,input,cookie=owner)=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(input)})
 const get=(path,cookie=owner)=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=()=>get('/api/pane').then(ok),own=()=>get('/api/pane/posts',author).then(ok)
 const confirm=async()=>{const text=mail.at(-1).content.find(part=>part.type==='text/plain').value,response=await call('/auth/confirm',{token:new URL(text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(response.status,303);return response.headers.get('set-cookie').split(';')[0]}
 try{
  const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Workshop owner'},'');assert.equal(signed.status,303);owner=signed.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  for(const [name,email,roles] of [['Workshop author','synthetic-pane-author@example.test',['author']],['Other author','synthetic-pane-other@example.test',['author']],['Page editor','synthetic-pane-editor@example.test',['editor']],['Reporter','synthetic-pane-reporter@example.test',['reporting']]]){
   await ok(await call('/api/pane/roles/invite',{displayName:name,email,roles}));const cookie=await confirm();if(name==='Workshop author')author=cookie;else if(name==='Other author')other=cookie;else if(name==='Page editor')editor=cookie;else reporter=cookie
  }
  const invitationCalls=outbounds.length,site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
  for(const page of site.pages)page.id=page.slug
  site.pages.push({id:'old-offer',slug:'old-offer',title:'Winter offer',body:'A retired winter workshop offer.'})
  site.blogs=[{id:'news',title:'News',prefix:'news',comments:false,pageSize:10}]
  site.navigation={main:[{label:'Home',page:'home'},{label:'Explore',children:[{label:'Our studio',page:'about'},{label:'Services',page:'services'}]},{label:'Hours',page:'hours'},{label:'Contact',page:'contact'}],footer:[{label:'Workshop story',url:origin+'/site/news/story'}],details:'',headerSocials:false,footerSocials:false}
  const initial=await ok(await call('/api/pane/prepare',{site}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  const write=async(cookie,slug,body)=>ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',byline:'Workshop team',authorSlug:'workshop-team',content:{slug,title:slug==='story'?'Workshop story':'Private other story',body}},cookie))
  const post=(await write(author,'story','Our original published workshop article.')).posts[0],foreign=(await write(other,'other-story','Private other author content.')).posts[0]
  const submitted=await ok(await call('/api/pane/posts/submit',{base:(await own()).base,id:post.id},author)),review=submitted.posts.find(item=>item.id===post.id).review
  await ok(await call('/api/pane/posts/publish',{base:submitted.base,id:post.id,review}))
  assert.equal((await get('/site/news/story','')).status,200)
  const snapshots=structuredClone((await state()).revisions)
  assert.equal((await get('/api/pane/content/history?kind=post&id='+post.id,'')).status,401)
  assert.equal((await get('/api/pane/content/history?kind=post&id='+post.id,editor)).status,403)
  assert.equal((await get('/api/pane/content/history?kind=post&id='+foreign.id,author)).status,403)
  assert.equal((await get('/api/pane/content/trash?kind=page',reporter)).status,403)
  for(const target of [{kind:'page',id:'old-offer'},{kind:'page',id:'about'}])await ok(await call('/api/pane/content/delete',{...target,base:(await state()).draft.id},editor))
  const beforePost=await state();assert.equal((await call('/api/pane/content/delete',{kind:'post',id:foreign.id,base:beforePost.draft.id},author)).status,403);assert.deepEqual(await state(),beforePost)
  await ok(await call('/api/pane/content/delete',{kind:'post',id:post.id,base:(await own()).base},author))
  let draft=(await state()).draft
  assert.deepEqual(draft.site.redirectOffers.filter(offer=>offer.reason==='deleted').map(offer=>offer.from).sort(),['/site/about','/site/news/story','/site/old-offer'])
  const edited=structuredClone(draft.site),changes={services:'Updated service choices.',hours:'Updated workshop hours.',contact:'Updated contact instructions.'}
  for(const [slug,body] of Object.entries(changes))edited.pages.find(page=>page.slug===slug).body=body
  edited.redirects=[{status:301,from:'/site/about',to:'/site/services'},{status:301,from:'/site/news/story',to:'/site/news'},{status:301,from:'/site/old-offer',to:'/site'}]
  draft=await ok(await call('/api/pane/prepare',{base:draft.id,site:edited}));await ok(await call('/api/pane/publish',{revision:draft.id}))
  const removed=await get('/site/news/story','');assert.equal(removed.status,301);assert.equal(removed.headers.get('location'),'/site/news')
  const trash=await ok(await get('/api/pane/content/trash?kind=post',author));assert.deepEqual(trash.rows.map(row=>row.id),[post.id]);assert.equal(trash.rows[0].actor,'Workshop author');assert.equal(trash.rows[0].deleted_at,new Date(clock).toISOString())
  assert.ok(!JSON.stringify(trash).includes(foreign.id));assert.ok(!JSON.stringify(trash).includes('Private other author content.'))
  assert.equal((await call('/api/pane/content/restore',{kind:'post',id:post.id,base:beforePost.draft.id},author)).status,409)
  await ok(await call('/api/pane/content/restore',{kind:'post',id:post.id,base:trash.base},author))
  const restored=(await own()).posts.find(item=>item.id===post.id);assert.equal(restored.content.body,post.content.body);assert.equal(restored.author,post.author);assert.equal(restored.state,'draft');assert.equal(restored.review,undefined)
  assert.equal((await get('/site/news/story','')).status,301,'Restoring a draft never publishes it')
  const resubmitted=await ok(await call('/api/pane/posts/submit',{base:(await own()).base,id:post.id},author)),approved=await ok(await call('/api/pane/posts/publish',{base:resubmitted.base,id:post.id,review:resubmitted.posts.find(item=>item.id===post.id).review}))
  assert.equal((await get('/site/news/story','')).status,200,'The restored post returns at its original URL after owner approval')
  assert.ok(!approved.site.redirects.some(redirect=>redirect.from==='/site/news/story'));assert.ok(approved.site.redirects.some(redirect=>redirect.from==='/site/about'&&redirect.to==='/site/services'))
  for(const [slug,body] of Object.entries(changes))assert.equal(approved.site.pages.find(page=>page.slug===slug).body,body,'Post restoration preserves every later page edit')
  assert.deepEqual(approved.site.navigation.footer,site.navigation.footer,'The restored post keeps its original menu place')
  await ok(await call('/api/pane/content/restore',{kind:'page',id:'about',base:(await state()).draft.id},editor));const pageTrashDraft=(await state()).draft,pageRestoreReview=await ok(await call('/api/pane/page-request-review',{base:pageTrashDraft.id,page:'about'},editor));await ok(await call('/api/pane/page-publish',{base:pageTrashDraft.id,page:'about',request:pageRestoreReview.id}));const restoredPage=(await state()).live;assert.equal((await get('/site/about','')).status,200);assert.deepEqual(restoredPage.site.navigation.main,site.navigation.main,'Page trash restore keeps its original nested menu position');assert.ok(!restoredPage.site.redirects.some(redirect=>redirect.from==='/site/about'))
  const history=await ok(await get('/api/pane/content/history?kind=page&id=services',editor)),previous=history.rows.find(row=>row.body===site.pages.find(page=>page.slug==='services').body)
  assert.ok(previous);assert.equal(previous.state,'published')
  const beforeHistory=structuredClone((await state()).draft)
  await ok(await call('/api/pane/content/restore',{kind:'page',id:'services',base:history.base,revision:previous.revision},editor))
  const pageDraft=(await state()).draft
  assert.equal(pageDraft.site.pages.find(page=>page.id==='services').body,site.pages.find(page=>page.slug==='services').body)
  for(const page of beforeHistory.site.pages.filter(page=>page.id!=='services'))assert.deepEqual(pageDraft.site.pages.find(item=>item.id===page.id),page,'Single-page history leaves every other page exact')
  assert.deepEqual(pageDraft.site.posts,beforeHistory.site.posts);assert.deepEqual(pageDraft.site.blogPosts,beforeHistory.site.blogPosts)
  const request=await ok(await call('/api/pane/page-request-review',{base:pageDraft.id,page:'services'},editor)),published=await ok(await call('/api/pane/page-publish',{base:pageDraft.id,page:'services',request:request.id}))
  assert.equal(published.site.pages.find(page=>page.id==='services').body,site.pages.find(page=>page.id==='services').body)
  for(const [slug,body] of Object.entries(changes).filter(([slug])=>slug!=='services'))assert.equal(published.site.pages.find(page=>page.slug===slug).body,body)
  assert.equal((await get('/site/news/story','')).status,200)
  const serviceHtml=await (await get('/site/services','')).text();assert.ok(serviceHtml.includes('Furniture repairs'));assert.ok(!serviceHtml.includes(changes.services),'Only the selected historical service body goes live');for(const slug of ['hours','contact'])assert.ok((await (await get('/site/'+slug,'')).text()).includes(changes[slug]))
  const activity=await ok(await get('/api/pane/activity')),restores=activity.filter(event=>['content.restore','content.restore-version'].includes(event.action))
  assert.deepEqual(restores.map(event=>[event.action,event.subject,event.actor,event.created_at]),[['content.restore','post:'+post.id,'Workshop author',new Date(clock).toISOString()],['content.restore','page:about','Page editor',new Date(clock).toISOString()],['content.restore-version','page:services','Page editor',new Date(clock).toISOString()]],'Every restore records its exact native actor and server time')
  for(const event of restores){const details=JSON.parse(event.details);assert.deepEqual(Object.keys(details).sort(),(event.action==='content.restore'?['kind','id','sourceRevision','sourceDeletion']:['kind','id','sourceRevision']).sort());assert.ok(!JSON.stringify(details).includes('article'))}
  for(const snapshot of snapshots)assert.deepEqual((await state()).revisions.find(row=>row.id===snapshot.id),snapshot,'Selective restores never mutate earlier snapshots or hashes')
  assert.deepEqual(outbounds.slice(invitationCalls),[],'Content deletion and restoration send no outbound request')
  clock+=31*86400000
  assert.equal((await call('/auth/magic-link',{email:settings.OWNER_EMAIL,returnTo:'/app'},'')).status,202);owner=await confirm()
  assert.deepEqual((await ok(await get('/api/pane/content/trash?kind=page'))).rows,[],'Items deleted 31 days ago disappear from the trash')
  assert.equal((await call('/api/pane/content/restore',{kind:'page',id:'old-offer',base:(await state()).draft.id})).status,400,'Expired trash cannot be restored through a guessed identifier')
 }finally{await f.mf.dispose()}
})

test('typed service collections validate thirty items and publish rich descriptions with selective item restoration',async()=>{
 const {serviceFields,serviceItem}=await import('./collection-fixture.mjs')
 let clock=Date.parse('2026-10-15T16:00:00Z'),owner,admin,editor
 const mail=[],outbounds=[]
 const origin='https://pane.example.test',f=await runtime({isolatedLive:true,now:()=>clock,bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-9'},outboundService:async request=>{outbounds.push(request.url);assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');mail.push(await request.json());return new Response(null,{status:202})}})
 const call=(path,input,cookie=owner)=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(input)})
 const get=(path,cookie=owner)=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=()=>get('/api/pane').then(ok)
 const save=async(path,input)=>ok(await call('/api/pane/collections'+path,{base:(await state()).draft.id,...input}))
 try{
  const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Collection owner'},'');assert.equal(signed.status,303);owner=signed.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const starterSite=JSON.parse(await readFile('fixtures/static-site.json','utf8'));starterSite.navigation={main:[{label:'Home',page:'home'},{label:'Our studio',page:'about'}],footer:[{label:'Contact',url:'/site/contact'},{label:'Chair restoration',url:'/site/service-directory/service-1'},{label:'Our studio',url:'/site/about'}],details:'',headerSocials:false,footerSocials:false};starterSite.blogs=[{id:'news',title:'News',prefix:'news',comments:false,pageSize:10}]
  const initial=await ok(await call('/api/pane/prepare',{site:starterSite}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  assert.equal((await call('/auth/invite',{email:'synthetic-pane-admin@example.test',displayName:'Collection administrator',role:'admin'})).status,202)
  const message=mail.at(-1).content.find(part=>part.type==='text/plain').value,confirmed=await call('/auth/confirm',{token:new URL(message.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(confirmed.status,303);admin=confirmed.headers.get('set-cookie').split(';')[0]
  await ok(await call('/api/pane/roles/invite',{email:'synthetic-pane-editor@example.test',displayName:'Collection editor',roles:['editor']}))
  const editorMessage=mail.at(-1).content.find(part=>part.type==='text/plain').value,editorConfirmed=await call('/auth/confirm',{token:new URL(editorMessage.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(editorConfirmed.status,303);editor=editorConfirmed.headers.get('set-cookie').split(';')[0]
  const starters=await save('/starters',{});assert.deepEqual(starters.site.collections.map(collection=>collection.title).sort(),['Projects','Services','Team'])
  await ok(await call('/api/pane/prepare',{base:starters.id,site:initial.site}))
  await save('/schema',{id:'team',title:'Team',prefix:'team',fields:[{id:'name',label:'Name',type:'text',required:true}]})
  await save('/items/save',{collection:'team',id:'june',slug:'june',title:'June Ellis',values:{name:'June Ellis'}})
  await save('/schema',{id:'services',title:'Services',prefix:'service-directory',fields:serviceFields})
  for(let index=1;index<=30;index++)await save('/items/save',{collection:'services',...serviceItem(index)})
  await ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',content:{slug:'owner-private',title:'synthetic-pane-private-owner-post',body:'A private owner post outside the collection editor grant.'}}))
  const editorDraft=await ok(await call('/api/pane/collections/items/save',{base:(await state()).draft.id,collection:'services',...serviceItem(30),title:'Editor saved furniture care'},editor));assert.equal(editorDraft.site.collections.find(collection=>collection.id==='services').items.find(item=>item.id==='service-30').title,'Editor saved furniture care');assert.equal(editorDraft.site.posts,undefined,'Collection responses exclude private posts outside the editor grant');assert.ok(!JSON.stringify(editorDraft).includes('synthetic-pane-private-owner-post'))
  assert.equal((await call('/api/pane/collections/items/publish',{base:editorDraft.id,collection:'services',id:'service-30'},editor)).status,403)
  const list=await ok(await get('/api/pane/collections'));assert.equal(list.collections.find(collection=>collection.id==='services').items.length,30,'All thirty service items remain available')
  assert.equal((await get('/api/pane/collections','')).status,401)
  for(const values of [{...serviceItem(1).values,price:'125.50'},{...serviceItem(1).values,description:{body:''}},{...serviceItem(1).values,team:'missing'},{...serviceItem(1).values,available:'2026-02-30'}]){
   const before=await state();assert.equal((await call('/api/pane/collections/items/save',{base:before.draft.id,collection:'services',...serviceItem(1),values})).status,400,'Typed and required collection values are refused');assert.deepEqual(await state(),before,'Validation leaves the draft untouched')
  }
  const pdf=Buffer.from('%PDF-1.4\nsynthetic-pane-service-guide\n%%EOF'),form=new FormData();form.set('base',(await state()).draft.id);form.set('file',new File([pdf],'care-guide.pdf',{type:'application/pdf'}))
  const uploaded=await ok(await f.request(origin+'/api/pane/library/upload',{method:'POST',headers:{Origin:origin,Cookie:owner},body:form})),file=uploaded.site.libraryFiles[0]
  const image={src:'data:image/png;base64,'+(await readFile('public/brand/icon-192.png')).toString('base64'),width:192,height:192,decorative:false,alt:'Furniture care at the workshop'}
  const body=postBody(image,{post:'unused',file:file.id});const first=body.sections[0].blocks[0];first.content[3].children=first.content[3].children.filter(node=>node.href!=='post:unused');first.text=(await import('../public/pane-rich.mjs')).richText(first.content);body.body=body.sections[0].blocks.map(block=>[block.text,block.caption,block.attribution].filter(Boolean).join('\n')).join('\n\n')
  await save('/items/save',{collection:'services',...serviceItem(1),title:'Chair restoration',values:{...serviceItem(1).values,description:body,image}})
  assert.equal((await get('/site/service-directory/service-1','')).status,404)
  const beforeAdmin=await state();assert.equal((await call('/api/pane/collections/items/publish',{base:beforeAdmin.draft.id,collection:'services',id:'service-1'},admin)).status,403);assert.deepEqual(await state(),beforeAdmin,'An administrator cannot approve publication')
  const source=structuredClone((await state()).draft);await ok(await call('/api/pane/publish',{revision:source.id}))
  const html=await (await get('/site/service-directory/service-1','')).text()
  for(const pattern of [/<h2[^>]*>Decorating celebration cakes<\/h2>/,/<ul><li>Vanilla sponge/,/<strong>Fold gently<\/strong>/,/<figcaption>Lemon cake with flowers<\/figcaption>/,/href="\/site\/about"/,new RegExp('href="/site/files/'+file.id+'"'),/href="tel:\+13125550123"/,/USD\s*125\.50/,/href="\/site\/team\/june"/])assert.match(html,pattern,'The published item preserves the shared semantic description')
  assert.equal((await get('/site/files/'+file.id,'')).status,200);assert.deepEqual((await state()).revisions.find(row=>row.id===source.id),source)
  const original=structuredClone((await state()).draft),target={kind:'item',collection:'services',id:'service-1'}
  await ok(await call('/api/pane/content/delete',{...target,base:(await state()).draft.id}))
  const deleted=structuredClone((await state()).draft);assert.deepEqual(deleted.site.navigation.footer.map(item=>item.label),['Contact','Our studio'],'Deleting the item removes only its actual menu link');deleted.site.redirects=[{status:301,from:'/site/service-directory/service-1',to:'/site/service-directory'},{status:301,from:'/site/old-care',to:'/site/about'}];const deletionApproval=await ok(await call('/api/pane/prepare',{base:deleted.id,site:deleted.site}));await ok(await call('/api/pane/publish',{revision:deletionApproval.id}));assert.equal((await get('/site/service-directory/service-1','')).status,301)
  await save('/items/save',{collection:'services',...serviceItem(2),title:'Unrelated current repair'})
  const trash=await ok(await get('/api/pane/content/trash?kind=item&collection=services'));assert.equal(trash.rows[0].id,'service-1')
  await ok(await call('/api/pane/content/restore',{...target,base:trash.base},editor));assert.equal((await get('/site/service-directory/service-1','')).status,301,'Restoring an item draft does not publish it')
  const restored=(await state()).draft.site.collections.find(collection=>collection.id==='services');assert.equal(restored.items.find(item=>item.id==='service-1').title,'Chair restoration');assert.equal(restored.items.find(item=>item.id==='service-2').title,'Unrelated current repair')
  await save('/items/save',{collection:'services',...serviceItem(1),title:'New description edition'})
  const history=await ok(await get('/api/pane/content/history?kind=item&collection=services&id=service-1'));const previousItem=history.rows.find(row=>row.title==='Chair restoration'&&row.state==='published');assert.ok(previousItem,'Published item content remains in single-item history')
  await ok(await call('/api/pane/content/restore',{...target,base:history.base,revision:previousItem.revision}))
  const approved=await save('/items/publish',{collection:'services',id:'service-1'});assert.equal(approved.site.collections.find(collection=>collection.id==='services').items.find(item=>item.id==='service-1').title,'Chair restoration');assert.equal(approved.site.collections.find(collection=>collection.id==='services').items.find(item=>item.id==='service-2').title,'Furniture care 2','Approving one item leaves unrelated draft work private')
  assert.equal((await get('/site/service-directory/service-1','')).status,200,'Owner approval restores the original item URL');assert.deepEqual(approved.site.navigation.footer,starterSite.navigation.footer,'Item restoration retains the original menu place');assert.ok(!approved.site.redirects.some(row=>row.from==='/site/service-directory/service-1'));assert.ok(approved.site.redirects.some(row=>row.from==='/site/old-care'&&row.to==='/site/about'));assert.deepEqual((await state()).revisions.find(row=>row.id===original.id),original,'Item restoration leaves the original source snapshot and hash exact')
  assert.equal(outbounds.length,2,'Collection editing and publication send no outbound request')
  const activity=await ok(await get('/api/pane/activity')),restores=activity.filter(event=>['content.restore','content.restore-version'].includes(event.action));assert.deepEqual(restores.map(event=>[event.action,event.subject,event.actor,event.created_at]),[['content.restore','item:services:service-1','Collection editor',new Date(clock).toISOString()],['content.restore-version','item:services:service-1','Collection owner',new Date(clock).toISOString()]],'Item restores record the exact native actor and server time');for(const event of restores)assert.deepEqual(Object.keys(JSON.parse(event.details)).sort(),(event.action==='content.restore'?['kind','id','collection','sourceRevision','sourceDeletion']:['kind','id','collection','sourceRevision']).sort())
  await ok(await call('/api/pane/content/delete',{kind:'item',collection:'services',id:'service-29',base:(await state()).draft.id}))
  clock+=31*86400000;assert.equal((await call('/auth/magic-link',{email:settings.OWNER_EMAIL,returnTo:'/app'},'')).status,202)
  const refreshMessage=mail.at(-1).content.find(part=>part.type==='text/plain').value,refresh=await call('/auth/confirm',{token:new URL(refreshMessage.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(refresh.status,303);owner=refresh.headers.get('set-cookie').split(';')[0]
  assert.deepEqual((await ok(await get('/api/pane/content/trash?kind=item&collection=services'))).rows,[],'Collection item trash expires after 31 days');assert.equal((await call('/api/pane/content/restore',{kind:'item',collection:'services',id:'service-29',base:(await state()).draft.id})).status,400,'Expired collection items cannot be restored')
 }finally{await f.mf.dispose()}
})

test('designed collection templates publish every item with exact metadata and prepared social images',async()=>{
 const {serviceFields,serviceItem}=await import('./collection-fixture.mjs'),origin=settings.AUTH_ORIGIN,f=await runtime({isolatedLive:true,now:Date.parse('2026-10-15T16:00:00Z')});let cookie
 const call=(path,input)=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(input)})
 const get=path=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=()=>get('/api/pane').then(ok),save=async(path,input)=>ok(await call('/api/pane/collections'+path,{base:(await state()).draft.id,...input}))
 try{
  const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Template owner'});assert.equal(signed.status,303);cookie=signed.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const initial=await ok(await call('/api/pane/prepare',{site:JSON.parse(await readFile('fixtures/static-site.json','utf8'))}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  await save('/schema',{id:'team',title:'Team',prefix:'team',fields:[{id:'name',label:'Name',type:'text',required:true}]});await save('/items/save',{collection:'team',id:'june',slug:'june',title:'June Ellis',values:{name:'June Ellis'}})
  await save('/schema',{id:'services',title:'Services',prefix:'service-directory',fields:serviceFields})
  const image={src:'data:image/png;base64,'+(await readFile('public/brand/icon-192.png')).toString('base64'),width:192,height:192,alt:'A repaired timber chair',decorative:false}
  for(let index=1;index<=30;index++)await save('/items/save',{collection:'services',...serviceItem(index),values:{...serviceItem(index).values,name:'Repair </script> & care '+index,notes:'Service details & care '+index,image}})
  const draft=(await state()).draft;await ok(await call('/api/pane/publish',{revision:draft.id}));const unchanged=structuredClone((await state()).live)
  const template={fields:['notes','description','price','image'],titleField:'name',descriptionField:'notes',imageField:'image'}
  const designed=await save('/template',{collection:'services',template})
  assert.equal((await call('/api/pane/collections/items/publish',{base:designed.id,collection:'services',id:'service-1'})).status,400,'Shared template changes require whole-site owner approval');assert.deepEqual((await state()).live,unchanged)
  for(const invalid of [{...template,titleField:'image'},{...template,fields:['notes','notes']},{...template,fields:['missing']}]){const before=await state();assert.equal((await call('/api/pane/collections/template',{base:before.draft.id,collection:'services',template:invalid})).status,400);assert.deepEqual(await state(),before)}
  const published=await ok(await call('/api/pane/publish',{revision:designed.id}));assert.deepEqual(published.site.collections.find(collection=>collection.id==='services').template,template)
  for(let index=1;index<=30;index++){
   const path='/site/service-directory/service-'+index,response=await get(path);assert.equal(response.status,200,'Every service item has its own public URL');const html=await response.text()
   assert.ok(html.includes('<title>Repair &lt;/script&gt; &amp; care '+index+'</title>'),'The template binds the exact item search title');assert.ok(html.includes('name="description" content="Service details &amp; care '+index+'"'),'The template binds the exact item description')
   const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);assert.equal(data['@type'],'Service');assert.equal(data.name,'Repair </script> & care '+index,'Structured data preserves the item title safely');assert.equal(data.description,'Service details & care '+index);assert.equal(data.url,origin+path);assert.equal(data.offers[0].price,125.5);assert.equal(data.offers[0].priceCurrency,'USD');assert.equal(data.image,origin+path+'?pane-collection-social=1&width=0')
   assert.ok(html.indexOf('Service details &amp; care '+index)<html.indexOf('Thoughtful repairs for well-loved furniture.'),'The designed field reading order is rendered')
   const social=await get(path+'?pane-collection-social=1&width=0');assert.equal(social.status,200);assert.match(social.headers.get('content-type'),/^image\//);assert.deepEqual(Buffer.from(await social.arrayBuffer()),Buffer.from(image.src.split(',')[1],'base64'));assert.equal((await get(path+'?pane-collection-social=1&width=invalid')).status,404)
  }
  const changed=await save('/items/save',{collection:'services',...serviceItem(2),values:{...serviceItem(2).values,name:'Updated repair',notes:'Updated service details',image}});await save('/items/publish',{collection:'services',id:'service-2'});assert.ok((await (await get('/site/service-directory/service-2')).text()).includes('<title>Updated repair</title>'));assert.ok((await (await get('/site/service-directory/service-1')).text()).includes('Repair &lt;/script&gt; &amp; care 1'));assert.deepEqual((await state()).revisions.find(row=>row.id===designed.id),designed,'Template approval retains its immutable source')
 }finally{await f.mf.dispose()}
})
