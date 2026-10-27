import {createHash} from 'node:crypto'
import {createPortability,readArchive} from '@runeditrun/rer/modules/portability'
import {productPolicy} from '../scripts/pane-policy.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'
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
   if(id===bodyPost.id){
  const completePost=structuredClone((await own()).posts.find(post=>post.id===bodyPost.id)),missingAlt=structuredClone(completePost.content);missingAlt.sections[0].blocks.find(block=>block.image).image.alt='';missingAlt.sections[0].blocks.find(block=>block.image).image.decorative=false;missingAlt.sections[0].blocks.find(block=>block.image).text='';missingAlt.body=missingAlt.sections.flatMap(section=>section.blocks.map(block=>[block.text,block.caption,block.attribution].filter(Boolean).join('\n')).filter(Boolean)).join('\n\n')
  await write('news',0,{id:bodyPost.id,content:missingAlt});const invalidReview=await ok(await call('/api/pane/posts/submit',{base:(await own()).base,id:bodyPost.id},author)),invalidPost=invalidReview.posts.find(post=>post.id===bodyPost.id),beforeRefusal=await state(),refused=await call('/api/pane/posts/publish',{base:invalidReview.base,id:bodyPost.id,review:invalidPost.review});assert.equal(refused.status,400,'Reviewed posts without image alt text are refused');assert.match(await refused.text(),/Accessibility warning:/,'The refusal includes an accessibility warning');assert.deepEqual(await state(),beforeRefusal,'An inaccessible reviewed post cannot change any revision or approval');await write('news',0,{id:bodyPost.id,content:completePost.content})
   }
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
 let clock=Date.parse('2026-10-15T16:00:00Z'),owner,admin,editor,reporter
 const mail=[],outbounds=[],collectionWrites=[]
 const origin='https://pane.example.test',f=await runtime({isolatedLive:true,now:()=>clock,observeOutbound:request=>outbounds.push(request.url),bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-9'},outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');mail.push(await request.json());return new Response(null,{status:202})}})
 const call=(path,input,cookie=owner)=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json'},body:JSON.stringify(input)})
 const get=(path,cookie=owner)=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=()=>get('/api/pane').then(ok)
 const save=async(path,input)=>{const result=await ok(await call('/api/pane/collections'+path,{base:(await state()).draft.id,...input}));collectionWrites.push({id:result.id,action:path==='/items/publish'?'publish':'edit'});return result}
 try{
  const signed=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Collection owner'},'');assert.equal(signed.status,303);owner=signed.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const starterSite=JSON.parse(await readFile('fixtures/static-site.json','utf8'));starterSite.navigation={main:[{label:'Home',page:'home'},{label:'Our studio',page:'about'}],footer:[{label:'Contact',url:'/site/contact'},{label:'Chair restoration',url:'/site/service-directory/service-1'},{label:'Our studio',url:'/site/about'}],details:'',headerSocials:false,footerSocials:false};starterSite.blogs=[{id:'news',title:'News',prefix:'news',comments:false,pageSize:10}]
  const initial=await ok(await call('/api/pane/prepare',{site:starterSite}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  assert.equal((await call('/auth/invite',{email:'synthetic-pane-admin@example.test',displayName:'Collection administrator',role:'admin'})).status,202)
  const message=mail.at(-1).content.find(part=>part.type==='text/plain').value,confirmed=await call('/auth/confirm',{token:new URL(message.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(confirmed.status,303);admin=confirmed.headers.get('set-cookie').split(';')[0]
  await ok(await call('/api/pane/roles/invite',{email:'synthetic-pane-editor@example.test',displayName:'Collection editor',roles:['editor']}))
  const editorMessage=mail.at(-1).content.find(part=>part.type==='text/plain').value,editorConfirmed=await call('/auth/confirm',{token:new URL(editorMessage.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(editorConfirmed.status,303);editor=editorConfirmed.headers.get('set-cookie').split(';')[0]
  const invited=await ok(await call('/api/pane/roles/invite',{email:'synthetic-pane-reporter@example.test',displayName:'Collection reporter',roles:['reporting']}))
  const reportMessage=mail.at(-1).content.find(part=>part.type==='text/plain').value,reportConfirmed=await call('/auth/confirm',{token:new URL(reportMessage.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(reportConfirmed.status,303);reporter=reportConfirmed.headers.get('set-cookie').split(';')[0]
  const people=(await state()).people,ownerId=Object.keys(people).find(id=>people[id]==='Collection owner');assert.ok(ownerId)
  const starters=await save('/starters',{});assert.deepEqual(starters.site.collections.map(collection=>collection.title).sort(),['Projects','Services','Team'])
  await ok(await call('/api/pane/prepare',{base:starters.id,site:initial.site}))
  await save('/schema',{id:'team',title:'Team',prefix:'team',fields:[{id:'name',label:'Name',type:'text',required:true}]})
  await save('/items/save',{collection:'team',id:'june',slug:'june',title:'June Ellis',values:{name:'June Ellis'}})
  await save('/schema',{id:'services',title:'Services',prefix:'service-directory',fields:serviceFields})
  for(let index=1;index<=30;index++)await save('/items/save',{collection:'services',...serviceItem(index)})
  const linkedDraft=await ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',byline:'Workshop team',authorSlug:'workshop-team',content:{slug:'bakery-story',title:'Our bakery story',body:'A story about careful local work.'}})),linked=linkedDraft.posts.at(-1)
  const linkedReview=await ok(await call('/api/pane/posts/submit',{base:linkedDraft.base,id:linked.id}));await ok(await call('/api/pane/posts/publish',{base:linkedReview.base,id:linked.id,review:linkedReview.posts.find(post=>post.id===linked.id).review}))
  await ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',content:{slug:'owner-private',title:'synthetic-pane-private-owner-post',body:'A private owner post outside the collection editor grant.'}}))
  const editorDraft=await ok(await call('/api/pane/collections/items/save',{base:(await state()).draft.id,collection:'services',...serviceItem(30),title:'Editor saved furniture care'},editor));assert.equal(editorDraft.site.collections.find(collection=>collection.id==='services').items.find(item=>item.id==='service-30').title,'Editor saved furniture care');assert.equal(editorDraft.site.posts,undefined,'Collection responses exclude private posts outside the editor grant');assert.ok(!JSON.stringify(editorDraft).includes('synthetic-pane-private-owner-post'))
  const staleEditorBase=editorDraft.id
  await save('/items/save',{collection:'services',...serviceItem(29),title:'Latest owner furniture care'})
  const editorView=(await ok(await get('/api/pane',editor))).draft
  for(const path of ['/api/pane/collections/items/save','/app/collections/items/save']){
   const conflict=await call(path,{base:staleEditorBase,collection:'services',...serviceItem(30),title:'Retained editor furniture care'},editor)
   assert.equal(conflict.status,409,'A stale collection edit offers the latest permitted draft')
   const body=await conflict.json();assert.deepEqual(body.latest,editorView,'Collection conflicts expose exactly the normal role-filtered draft');assert.equal(body.latest.site.posts,undefined);assert.ok(!JSON.stringify(body).includes('synthetic-pane-private-owner-post'),'Conflict bodies never disclose private owner posts')
  }
  assert.equal((await call('/api/pane/collections/items/publish',{base:editorDraft.id,collection:'services',id:'service-30'},editor)).status,403)
  const list=await ok(await get('/api/pane/collections')),services=list.collections.find(collection=>collection.id==='services');assert.equal(services.items.length,30,'All thirty service items remain available');assert.deepEqual(services.items.map(item=>item.id).sort(),Array.from({length:30},(_,index)=>'service-'+(index+1)).sort(),'The entire service inventory is retained');assert.deepEqual(services.fields.map(field=>[field.id,field.type,field.required??false]),[['name','text',true],['description','richText',true],['price','price',true],['duration','number',false],['available','date',false],['details','link',false],['team','reference',true],['category','option',false],['image','image',false],['notes','text',false]],'Ten independently specified typed fields retain their required rules');assert.equal(services.fields.find(field=>field.id==='team').reference,'team');assert.equal(services.fields.find(field=>field.id==='name').help,'A short human name.','Owner field help survives the native schema round trip')
  assert.equal((await get('/api/pane/collections','')).status,401)
  for(const change of [{price:'125.50'},{description:{body:''}},{team:'missing'},{available:'2026-02-30'},{name:42},{duration:'two'},{details:'javascript:alert(1)'},{category:'Unknown'},{image:'not an image'}]){
   const values={...serviceItem(1).values,...change}
   const before=await state();assert.equal((await call('/api/pane/collections/items/save',{base:before.draft.id,collection:'services',...serviceItem(1),values})).status,400,'Typed and required collection values are refused');assert.deepEqual(await state(),before,'Validation leaves the draft untouched')
  }
  const htmlDescription={body:'Workshop HTML',sections:[{id:'collection-html-section',blocks:[{id:'collection-html-block',kind:'html',text:'Workshop HTML',html:{source:'<h2>Workshop HTML</h2>',height:320}}]}]}
  for(const cookie of [owner,editor])for(const prefix of ['/api/pane/collections','/app/collections'])for(const [action,input] of [
   ['/items/save',{collection:'services',...serviceItem(1),values:{...serviceItem(1).values,description:htmlDescription}}],
   ['/body',{collection:'services',item:'service-1',field:'description',sections:htmlDescription.sections}],
  ]){
   const before=await state(),path=prefix+action
   assert.equal((await call(path,{base:before.draft.id,...input},cookie)).status,400,path+' refuses HTML blocks outside pages even for authorized collection writers')
   assert.deepEqual(await state(),before,'Refusing collection HTML preserves drafts, publication and approvals')
  }
  const pdf=Buffer.from('%PDF-1.4\nsynthetic-pane-service-guide\n%%EOF'),form=new FormData();form.set('base',(await state()).draft.id);form.set('file',new File([pdf],'care-guide.pdf',{type:'application/pdf'}))
  const uploaded=await ok(await f.request(origin+'/api/pane/library/upload',{method:'POST',headers:{Origin:origin,Cookie:owner},body:form})),file=uploaded.site.libraryFiles[0]
  const image={src:'data:image/png;base64,'+(await readFile('public/brand/icon-192.png')).toString('base64'),width:192,height:192,decorative:false,alt:'Furniture care at the workshop'}
  const body=postBody(image,{post:linked.id,file:file.id})
  const actions=[['/schema',{id:'services',title:'Services',prefix:'service-directory',fields:serviceFields}],['/template',{collection:'services',template:{fields:['description','price']}}],['/items/save',{collection:'services',...serviceItem(1)}],['/body',{collection:'services',item:'service-1',field:'description',sections:body.sections}],['/starters',{}],['/items/publish',{collection:'services',id:'service-1'}]]
  const beforeDenied=await state()
  for(const prefix of ['/api/pane/collections','/app/collections'])for(const [action,input] of actions){
   const path=prefix+action,payload={base:beforeDenied.draft.id,...input}
   assert.equal((await call(path,payload,'')).status,prefix.startsWith('/api/')?401:303,path+' requires native sign-in')
   assert.equal((await call(path,payload,reporter)).status,403,path+' refuses a non-collection role')
   for(const Origin of ['https://elsewhere.invalid','null',undefined]){
    const headers={Cookie:owner,'Content-Type':'application/json',...(Origin===undefined?{}:{Origin})}
    assert.equal((await f.request(origin+path,{method:'POST',headers,body:JSON.stringify(payload)})).status,403,path+' requires the canonical origin')
   }
  }
  await ok(await call('/api/pane/roles/set',{operatorId:invited.operatorId,roles:['editor']}));assert.equal((await get('/api/pane/collections',reporter)).status,200)
  await ok(await call('/api/pane/roles/set',{operatorId:invited.operatorId,roles:[]}));for(const [action,input] of actions)assert.equal((await call('/api/pane/collections'+action,{base:beforeDenied.draft.id,...input},reporter)).status,403,'Revoking the collection grant takes effect on the next mutation')
  const afterDenied=await state();assert.deepEqual(afterDenied.revisions,beforeDenied.revisions);assert.deepEqual(afterDenied.approvals,beforeDenied.approvals);assert.equal(afterDenied.live.id,beforeDenied.live.id,'Rejected collection mutations leave publication unchanged')
  await save('/items/save',{collection:'services',...serviceItem(1),title:'Chair restoration',values:{...serviceItem(1).values,description:body,image}})
  assert.equal((await get('/site/service-directory/service-1','')).status,404)
  const beforeAdmin=await state();assert.equal((await call('/api/pane/collections/items/publish',{base:beforeAdmin.draft.id,collection:'services',id:'service-1'},admin)).status,403);assert.deepEqual(await state(),beforeAdmin,'An administrator cannot approve publication')
  const source=structuredClone((await state()).draft),preview='/preview/'+source.id+'/service-directory/service-1';assert.equal((await get(preview,'')).status,303,'Unpublished item previews require native sign-in');const adminPreview=await get(preview,admin);assert.equal(adminPreview.status,200);assert.match(await adminPreview.text(),/Draft preview/,'An administrator sees the unpublished item with its draft banner');assert.equal((await get('/site/service-directory/service-1','')).status,404,'Private preview never publishes an item');await ok(await call('/api/pane/publish',{revision:source.id}))
  const undescribed=structuredClone(body);const undescribedImage=undescribed.sections[0].blocks.find(block=>block.image);undescribedImage.image.alt='';undescribedImage.image.decorative=false;undescribedImage.text='';undescribed.body=undescribed.sections[0].blocks.map(block=>[block.text,block.caption,block.attribution].filter(Boolean).join('\n')).join('\n\n')
  await save('/items/save',{collection:'services',...serviceItem(1),title:'Chair restoration',values:{...serviceItem(1).values,description:undescribed,image}})
  const beforeAlt=await state(),refusedAlt=await call('/api/pane/collections/items/publish',{base:beforeAlt.draft.id,collection:'services',id:'service-1'});assert.equal(refusedAlt.status,400,'Selected collection publication refuses an undescribed inline image');assert.match(await refusedAlt.text(),/Accessibility warning:/,'The owner sees the missing-alt warning');assert.deepEqual(await state(),beforeAlt,'Missing-alt refusal preserves all revisions and approvals')
  await save('/items/save',{collection:'services',...serviceItem(1),title:'Chair restoration',values:{...serviceItem(1).values,description:body,image}})
  const html=await (await get('/site/service-directory/service-1','')).text()
  for(const pattern of [/<h2[^>]*>Decorating celebration cakes<\/h2>/,/<ul><li>Vanilla sponge/,/<strong>Fold gently<\/strong>/,/<figcaption>Lemon cake with flowers<\/figcaption>/,/href="\/site\/about"/,new RegExp('href="/site/files/'+file.id+'"'),/href="tel:\+13125550123"/,/USD\s*125\.50/,/href="\/site\/team\/june"/,/<h3[^>]*>Prepare the layers<\/h3>/,/<ul><li>Vanilla sponge<ul><li>Lemon curd<\/li><\/ul><\/li><\/ul>/,/<em>cool first<\/em>/,/<blockquote[^>]*>A celebration starts with something made with care\./,/Riverbend baking team/,/data-embed/,/https:\/\/www.youtube-nocookie.com\/embed\/syntheticPane1/,/href="\/site\/news\/bakery-story"/])assert.match(html,pattern,'The published item preserves the shared semantic description')
  for(const [alt,caption] of [['A lemon celebration cake ready for a birthday','Lemon cake with flowers'],['A chocolate celebration cake with piped decoration','Chocolate cake for a celebration']])assert.match(html,new RegExp('<figure\\b[^>]*>(?:(?!</figure>)[\\s\\S])*<img\\b[^>]*alt="'+alt+'"(?:(?!</figure>)[\\s\\S])*<figcaption>'+caption+'</figcaption>'),'Each published inline image retains its own alt text and caption')
  assert.doesNotMatch(html,/<iframe/,'The video remains behind the consent door')
  await ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,id:linked.id,blog:'news',content:{...linked.content,slug:'renamed-bakery-story'}}));const renamedReview=await ok(await call('/api/pane/posts/submit',{base:(await state()).draft.id,id:linked.id}));await ok(await call('/api/pane/posts/publish',{base:renamedReview.base,id:linked.id,review:renamedReview.posts.find(post=>post.id===linked.id).review}))
  assert.match(await (await get('/site/service-directory/service-1','')).text(),/href="\/site\/news\/renamed-bakery-story"/,'Collection body references follow a renamed published post');assert.equal((await get('/site/news/renamed-bakery-story','')).status,200,'The renamed destination is served directly')
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
  assert.equal(approved.actor,ownerId,'Selected item approval records the exact native owner');assert.equal((await state()).approvals.find(row=>row.revision===approved.id).actor,ownerId,'The persisted item approval names the selected revision and owner')
  assert.equal((await get('/site/service-directory/service-1','')).status,200,'Owner approval restores the original item URL');assert.deepEqual(approved.site.navigation.footer,starterSite.navigation.footer,'Item restoration retains the original menu place');assert.ok(!approved.site.redirects.some(row=>row.from==='/site/service-directory/service-1'));assert.ok(approved.site.redirects.some(row=>row.from==='/site/old-care'&&row.to==='/site/about'));assert.deepEqual((await state()).revisions.find(row=>row.id===original.id),original,'Item restoration leaves the original source snapshot and hash exact')
  assert.equal(outbounds.length,3,'Collection editing and publication send no outbound request')
  const activity=await ok(await get('/api/pane/activity')),restores=activity.filter(event=>['content.restore','content.restore-version'].includes(event.action));assert.deepEqual(restores.map(event=>[event.action,event.subject,event.actor,event.created_at]),[['content.restore','item:services:service-1','Collection editor',new Date(clock).toISOString()],['content.restore-version','item:services:service-1','Collection owner',new Date(clock).toISOString()]],'Item restores record the exact native actor and server time');for(const event of restores)assert.deepEqual(Object.keys(JSON.parse(event.details)).sort(),(event.action==='content.restore'?['kind','id','collection','sourceRevision','sourceDeletion']:['kind','id','collection','sourceRevision']).sort())
  for(const write of collectionWrites){const rows=activity.filter(event=>event.action===write.action&&event.subject==='revision:'+write.id);assert.equal(rows.length,1,'Every successful collection write has one transactional activity event');assert.equal(rows[0].actor,'Collection owner');assert.ok(Number.isFinite(Date.parse(rows[0].created_at)))}
  assert.equal(activity.find(event=>event.action==='edit'&&event.subject==='revision:'+editorDraft.id).actor,'Collection editor','Collection edits retain the native editor attribution')
  const itemApproval=activity.filter(event=>event.action==='collection.item.publish'&&event.subject==='item:services:service-1');assert.equal(itemApproval.length,1);assert.equal(itemApproval[0].actor,'Collection owner');assert.deepEqual(JSON.parse(itemApproval[0].details),{kind:'item',collection:'services',id:'service-1',revision:approved.id},'Selected-item publication records only its exact decision metadata')
  for(const privateValue of ['Fold gently','synthetic-pane-private-owner-post','synthetic-pane-editor@example.test'])assert.ok(!JSON.stringify(activity).includes(privateValue),'Collection activity excludes content and private addresses')
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
  const beforeRollback=await state(),rolledBack=await ok(await call('/api/pane/rollback',{revision:published.id})),rollbackState=await state()
  assert.deepEqual(rolledBack.site.collections,published.site.collections,'Rollback restores all populated collection values and template bindings exactly');assert.equal(rollbackState.live.id,published.id)
  const approval=rollbackState.approvals.find(row=>row.action==='rollback'&&row.revision===published.id);assert.ok(approval,'Rollback retains its owner approval');assert.equal(approval.actor,published.actor)
  assert.deepEqual(rollbackState.draft,beforeRollback.draft,'Whole-site rollback retains unrelated current drafts');for(const expected of [designed,published,changed])assert.deepEqual(rollbackState.revisions.find(row=>row.id===expected.id),expected,'Rollback never rewrites source snapshots or hashes')
  for(let index=1;index<=30;index++){const response=await get('/site/service-directory/service-'+index);assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('<title>Repair &lt;/script&gt; &amp; care '+index+'</title>'),'Rollback restores each original item title');assert.ok(html.includes('name="description" content="Service details &amp; care '+index+'"'));const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);assert.equal(data.name,'Repair </script> & care '+index);assert.equal(data.offers[0].price,125.5)}

 }finally{await f.mf.dispose()}
})

test('native comment moderation protects notifications, threaded replies, closure and person erasure',async()=>{
 let clock=Date.parse('2026-10-15T16:00:00Z'),mailFails=false
 const origin='https://pane.example.test',mail=[],f=await runtime({now:()=>clock,bindings:{AUTH_ORIGIN:origin,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-7'},outboundService:async request=>{assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');mail.push(await request.json());return new Response(null,{status:mailFails?500:202})}})
 let owner,author,moderator,other,admin,moderatorId,commentId=crypto.randomUUID()
 const call=(path,input,cookie=owner,headers={})=>f.request(origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie??'','Content-Type':'application/json',...headers},body:JSON.stringify(input)})
 const get=(path,cookie=owner)=>f.request(origin+path,{headers:{Cookie:cookie??''}})
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=async()=>ok(await get('/api/pane'))
 const visitor=async(message,extra={})=>{const fields=new FormData();for(const [key,value] of Object.entries({idempotency:crypto.randomUUID(),name:'Visitor <script>',email:'synthetic-pane-commenter@example.test',message,website:'','cf-turnstile-response':'synthetic-pane-3:'+createHash('sha256').update('comment:'+post.id).digest('hex'),...extra}))fields.set(key,value);return f.request(origin+'/site/news/story',{method:'POST',headers:{Origin:origin},body:fields})}
 let post
 try{
  const first=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Comment owner'},'');assert.equal(first.status,303);owner=first.headers.get('set-cookie').split(';')[0]
  assert.equal((await f.request(origin+'/setup',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})).status,303)
  const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'));site.blogs=[{id:'news',prefix:'news',title:'News',comments:false,pageSize:10}]
  site.forms=[{id:'synthetic-pane-post-form',name:'Workshop enquiry',submit:'Send enquiry',confirmation:'Your enquiry arrived.',fields:['name','email','message'].map(key=>({key,type:key==='email'?'email':'text',label:key,help:'',placeholder:'',required:true}))}]
  const initial=await ok(await call('/api/pane/prepare',{site}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  for(const [role,email,name] of [['author','synthetic-pane-author@example.test','Post author'],['comment-moderator','synthetic-pane-moderator@example.test','Comment moderator'],['inbox','synthetic-pane-inbox@example.test','Inbox colleague']]){
   const invited=await ok(await call('/api/pane/roles/invite',{email,displayName:name,roles:[role]})),text=mail.at(-1).content.find(part=>part.type==='text/plain').value
   const confirmed=await call('/auth/confirm',{token:new URL(text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(confirmed.status,303);const cookie=confirmed.headers.get('set-cookie').split(';')[0]
   if(role==='author')author=cookie;else if(role==='comment-moderator'){moderator=cookie;moderatorId=invited.operatorId}else other=cookie
  }
  assert.equal((await call('/auth/invite',{email:'synthetic-pane-admin@example.test',displayName:'Comment administrator',role:'admin'})).status,202)
  const adminText=mail.at(-1).content.find(part=>part.type==='text/plain').value,adminConfirmed=await call('/auth/confirm',{token:new URL(adminText.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(adminConfirmed.status,303);admin=adminConfirmed.headers.get('set-cookie').split(';')[0]
  let saved=await ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,blog:'news',content:{slug:'story',title:'Our workshop',body:'Our first story.\n\nWorkshop enquiry',sections:[{id:'synthetic-pane-post-section',blocks:[{id:'synthetic-pane-story',kind:'text',text:'Our first story.'},{id:'synthetic-pane-post-enquiry',kind:'form',form:'synthetic-pane-post-form',text:'Workshop enquiry',row:2}]}]},byline:'Workshop writer',authorSlug:'workshop'},author));post=saved.posts[0]
  saved=await ok(await call('/api/pane/posts/submit',{base:saved.base,id:post.id},author));await ok(await call('/api/pane/posts/publish',{base:saved.base,id:post.id,review:saved.posts[0].review}))
  assert.equal((await visitor('Closed by default')).status,403)
  const enquiryId=crypto.randomUUID(),enquiry=new FormData()
  for(const [key,value] of Object.entries({idempotency:enquiryId,_pane_form:'synthetic-pane-post-form',_pane_form_instance:'synthetic-pane-post-enquiry',name:'Workshop visitor',email:'synthetic-pane-enquirer@example.test',message:'Please restore my chair.','cf-turnstile-response':'synthetic-pane-3:'+createHash('sha256').update(['news','story'].join('/')).digest('hex')}))enquiry.set(key,value)
  const submitted=await f.request(origin+'/site/news/story',{method:'POST',headers:{Origin:origin},body:enquiry});assert.equal(submitted.status,303,await submitted.clone().text())
  assert.ok((await state()).messages.some(row=>row.id===enquiryId&&row.message.includes('Please restore my chair.')),'A placed post form reaches the enquiry inbox while comments are closed')
  assert.ok(!(await ok(await get('/api/pane/comments'))).some(row=>row.id===enquiryId),'An enquiry is never retained as a comment')
  assert.match(await (await get(submitted.headers.get('location'),'' )).text(),/Your enquiry arrived\./)
  await ok(await call('/api/pane/comments/settings',{blog:'news',enabled:'on',approval:'on',closeDays:0,likes:'on'}))
  assert.equal((await call('/api/pane/comments/settings',{blog:'news',enabled:'on'},moderator)).status,403)
  assert.equal((await get('/api/pane/comments','')).status,401)
  for(const cookie of [author,other]){assert.equal((await get('/api/pane/comments',cookie)).status,403);assert.equal((await call('/api/pane/comments/approve',{ids:[commentId]},cookie)).status,403)}
  assert.match(await (await get('/site/news/story','')).text(),/data-like-count>0<\/span>/)
  const liked=await f.request(origin+'/site/news/story?like=1',{method:'POST',headers:{Origin:origin}});assert.equal(liked.status,303);assert.equal(liked.headers.get('set-cookie'),null)
  await f.request(origin+'/site/news/story?like=1',{method:'POST',headers:{Origin:origin}});assert.match(await (await get('/site/news/story','')).text(),/data-like-count>1<\/span>/,'Repeat likes from the same request network are bounded without cookies')
  await ok(await call('/api/pane/spam/settings',{enabled:'on',confirm:'change-retention'}))
  const rejectedId=crypto.randomUUID();assert.equal((await visitor('Honeypot comment',{website:'bot',idempotency:rejectedId})).status,403)
  const invalidProofId=crypto.randomUUID();assert.equal((await visitor('Bad verification',{'cf-turnstile-response':'synthetic-pane-invalid',idempotency:invalidProofId})).status,403)
  assert.equal((await visitor('A visitor <img src=x onerror=alert(1)> comment',{idempotency:commentId})).status,303)
  const spamId=crypto.randomUUID();assert.equal((await visitor('https://a.test https://b.test https://c.test https://d.test https://e.test https://f.test',{idempotency:spamId})).status,303)
  const queue=await ok(await get('/api/pane/comments',moderator));assert.deepEqual(queue.map(row=>[row.id,row.state]).sort(),[[commentId,'pending'],[spamId,'spam']].sort())
  assert.ok(!(await (await get('/site/news/story','')).text()).includes('A visitor &lt;img'))
  const notifications=mail.slice(4);assert.equal(notifications.length,6);assert.deepEqual([...new Set(notifications.flatMap(message=>message.personalizations.flatMap(item=>item.to.map(to=>to.email))))].sort(),['owner@example.test','synthetic-pane-admin@example.test','synthetic-pane-moderator@example.test'])
  for(const message of notifications){
   assert.ok(!JSON.stringify(message).includes('synthetic-pane-commenter@example.test'),'Notifications omit commenter addresses')
   const text=message.content.find(part=>part.type==='text/plain').value,html=message.content.find(part=>part.type==='text/html').value
   const link=text.match(/https:\/\/[^\s]+/)[0]
   assert.ok(html.includes('href="'+link+'"'),'HTML notifications carry the same private review link as plain text')
  }
  const text=notifications.find(message=>message.content.find(part=>part.type==='text/plain').value.includes(commentId)).content.find(part=>part.type==='text/plain').value,notification=new URL(text.match(/https:\/\/[^\s]+/)[0]);assert.equal(notification.pathname,'/app/comments');assert.equal(notification.searchParams.get('comment'),commentId)
  assert.equal((await get(notification.pathname+notification.search,moderator)).status,200)
  assert.equal((await get('/api/pane/comments',admin)).status,200)
  assert.equal((await call('/api/pane/comments/approve',{ids:[commentId]},moderator,{Origin:'https://foreign.invalid'})).status,403)
  await ok(await call('/api/pane/comments/approve',{ids:[commentId]},moderator))
  let html=await (await get('/site/news/story','')).text();assert.match(html,/A visitor &lt;img/);assert.ok(!html.includes('synthetic-pane-commenter@example.test'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('https://a.test'))
  assert.equal((await call('/api/pane/comments/reply',{id:commentId,body:'Impersonation'},other)).status,403)
  await ok(await call('/api/pane/comments/reply',{id:commentId,body:'Thank you from the workshop.'},author))
  const approved=await ok(await get('/api/pane/comments',moderator)),reply=approved.find(row=>row.parent===commentId);assert.ok(reply);assert.equal(reply.name,'Workshop writer');assert.equal(reply.state,'approved')
  assert.equal((await call('/api/pane/comments/author-reply',{id:commentId,body:'Unauthorized moderation reply'},other)).status,403)
  await ok(await call('/api/pane/comments/author-reply',{id:commentId,body:'Reviewed reply on behalf of the workshop.'},moderator));assert.ok((await ok(await get('/api/pane/comments',moderator))).some(row=>row.parent===commentId&&row.name==='Workshop writer'&&row.body==='Reviewed reply on behalf of the workshop.'))
  html=await (await get('/site/news/story','')).text();assert.match(html,/comment-replies/);assert.match(html,/Thank you from the workshop\./)
  const notificationsAfter=mail.length;await ok(await call('/api/pane/comments/close',{post:post.id,closed:'on'}));html=await (await get('/site/news/story','')).text();assert.ok(!html.includes('Submit comment'));assert.match(html,/Comments are closed/);assert.equal((await visitor('After closing')).status,403);assert.equal(mail.length,notificationsAfter)
  assert.equal((await call('/api/pane/privacy/export',{email:'synthetic-pane-commenter@example.test'})).status,400,'Bootstrap does not bypass fresh native sign-in')
  let signIn
  const native=createOperatorAuth({clock:()=>Date.parse('2026-10-15T16:00:00Z'),db:f.db,config:{...settings,origin,local:false},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{signIn=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await native.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL})
  const signed=await call('/auth/confirm',{token:new URL(signIn.text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')},'');assert.equal(signed.status,303);owner=signed.headers.get('set-cookie').split(';')[0]
  const exported=await ok(await call('/api/pane/privacy/export',{email:'synthetic-pane-commenter@example.test'}));assert.deepEqual(exported.comments.map(row=>row.id).sort(),[commentId,spamId].sort());assert.deepEqual(exported.rejected.map(row=>row.id).sort(),[rejectedId,invalidProofId].sort(),'Person export includes each retained rejected comment before erasure');assert.equal(exported.comments.find(row=>row.id===commentId).body,'A visitor <img src=x onerror=alert(1)> comment')
  const portability=await createPortability({db:f.db,policy:productPolicy}),archiveId=await portability.exports.create();while((await portability.exports.advance(archiveId,{maxParts:100})).phase==='building'){}const older=[];for await(const record of readArchive(await portability.exports.download(archiveId)))older.push(record)
  const populated=await runtime();try{const target=await createPortability({db:populated.db,policy:productPolicy}),id=await target.imports.create(older[0]);for(const part of older.filter(record=>record.kind==='part'))await target.imports.uploadPart(id,part.index,part);assert.equal((await target.imports.finalize(id,{contentHash:older.at(-1).contentHash,archiveHash:older.at(-1).archiveHash})).phase,'complete');const restoredHtml=await (await populated.request('/site/news/story')).text();assert.match(restoredHtml,/A visitor &lt;img/);assert.match(restoredHtml,/Thank you from the workshop\./);assert.ok(!restoredHtml.includes('synthetic-pane-commenter@example.test'))}finally{await populated.mf.dispose()}
  const erased=await ok(await call('/api/pane/privacy/erase',{email:'synthetic-pane-commenter@example.test',confirm:'erase-person-data'}));assert.equal(erased.erasedComments,2);assert.equal(erased.backupFence,true)
  const laterId=await portability.exports.create();while((await portability.exports.advance(laterId,{maxParts:100})).phase==='building'){}const later=[];for await(const record of readArchive(await portability.exports.download(laterId)))later.push(record)
  const restored=await runtime();try{const target=await createPortability({db:restored.db,policy:productPolicy}),id=await target.imports.create(older[0]);for(const part of older.filter(record=>record.kind==='part'))await target.imports.uploadPart(id,part.index,part);await assert.rejects(target.imports.finalize(id,{contentHash:older.at(-1).contentHash,archiveHash:older.at(-1).archiveHash,laterJournal:later[0]}),/erased_row|erasure_epoch/)}finally{await restored.mf.dispose()}
  assert.deepEqual((await ok(await call('/api/pane/privacy/find',{email:'synthetic-pane-commenter@example.test'}))).comments,[])
  assert.ok(!(await (await get('/site/news/story','')).text()).includes('A visitor &lt;img'))
  await ok(await call('/api/pane/comments/close',{post:post.id,closed:'off'}))
  await visitor('Replay accepted content as rejected',{idempotency:commentId,website:'bot'})
  await visitor('Replay rejected content as accepted',{idempotency:rejectedId})
  const replayed=await ok(await call('/api/pane/privacy/find',{email:'synthetic-pane-commenter@example.test'}))
  assert.deepEqual([replayed.rejected.filter(row=>row.id===commentId).length,replayed.comments.filter(row=>row.id===rejectedId).length],[0,0],'Erased accepted and rejected comments cannot return through the opposite store')
  await visitor('Replay erased content',{idempotency:commentId});assert.ok(!(await ok(await get('/api/pane/comments',moderator))).some(row=>row.id===commentId))
  for(let attempt=0;attempt<20;attempt++)await visitor('Burst',{'cf-turnstile-response':'synthetic-pane-invalid'})
  assert.equal((await visitor('Over the rate limit')).status,429)
  const activity=await ok(await get('/api/pane/activity'));assert.ok(activity.some(event=>event.subject==='comment:'+commentId&&event.action==='comment.approved'&&event.actor==='Comment moderator'));for(const value of ['synthetic-pane-commenter@example.test','A visitor <img'])assert.ok(!JSON.stringify(activity).includes(value),'Comment audit is metadata only')
  await ok(await call('/api/pane/roles/set',{operatorId:moderatorId,roles:['inbox']}));assert.equal((await get('/api/pane/comments',moderator)).status,403)
  clock+=120000
  await ok(await call('/api/pane/comments/settings',{blog:'news',enabled:'on',approval:'on',notificationMode:'daily',closeDays:1}))
  const beforeDigest=mail.length,digestId=crypto.randomUUID();assert.equal((await visitor('A comment for the daily review',{idempotency:digestId})).status,303);assert.equal(mail.length,beforeDigest,'Daily notifications wait for the scheduled sweep')
  const early=await (await f.mf.getWorker()).scheduled({scheduledTime:clock+23*3600000,cron:'* * * * *'});assert.equal(early.outcome,'ok');assert.equal(mail.length,beforeDigest)
  clock+=86400000
  const tick=async()=>assert.equal((await (await f.mf.getWorker()).scheduled({scheduledTime:clock,cron:'* * * * *'})).outcome,'ok');await tick();assert.equal(mail.length,beforeDigest+2,'Only the active owner and admin receive the daily digest after moderator revocation');for(const message of mail.slice(beforeDigest)){
   assert.ok(message.content.find(part=>part.type==='text/plain').value.includes(digestId))
   assert.ok(message.content.find(part=>part.type==='text/html').value.includes('href="'+origin+'/app/comments?comment='+digestId+'"'),'HTML digests link each comment to review')
  }await tick();assert.equal(mail.length,beforeDigest+2,'A repeated sweep cannot send the digest twice')
  assert.ok(!(await (await get('/site/news/story','')).text()).includes('Submit comment'));assert.equal((await visitor('After automatic expiry')).status,403)
  await ok(await call('/api/pane/comments/settings',{blog:'news',enabled:'on',approval:'off',notificationMode:'daily',blockedWords:'forbidden'}))
  const known=crypto.randomUUID(),unknown=crypto.randomUUID(),blocked=crypto.randomUUID();assert.equal((await visitor('A returning approved writer',{idempotency:known,email:'synthetic-pane-author@example.test'})).status,303);assert.equal((await visitor('A new unapproved writer',{idempotency:unknown})).status,303);assert.equal((await visitor('A forbidden phrase',{idempotency:blocked,email:'synthetic-pane-author@example.test'})).status,303)
  const cases=await ok(await get('/api/pane/comments',admin));assert.deepEqual([known,unknown,blocked].map(id=>cases.find(row=>row.id===id).state),['approved','pending','spam'])
  await ok(await call('/api/pane/comments/edit',{id:unknown,body:'Edited <b>comment</b>'},admin));await ok(await call('/api/pane/comments/approve',{ids:[unknown,blocked]},admin));assert.match(await (await get('/site/news/story','')).text(),/Edited &lt;b&gt;comment&lt;\/b&gt;/);await ok(await call('/api/pane/comments/spam',{ids:[unknown,blocked]},admin));assert.ok(!(await (await get('/site/news/story','')).text()).includes('Edited &lt;b&gt;'));await ok(await call('/api/pane/comments/delete',{ids:[unknown,blocked]},admin));assert.ok(!(await ok(await get('/api/pane/comments',admin))).some(row=>[unknown,blocked].includes(row.id)))
  await ok(await call('/api/pane/comments/settings',{blog:'news',enabled:'on',approval:'on'}));mailFails=true;const failedId=crypto.randomUUID();assert.equal((await visitor('A retained comment despite email failure',{idempotency:failedId})).status,303);mailFails=false;assert.ok((await ok(await get('/api/pane/comments',admin))).some(row=>row.id===failedId));assert.match(await (await get('/app/comments?comment='+failedId,admin)).text(),/uncertain/)
 }finally{await f.mf.dispose()}
})
