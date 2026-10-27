import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runtime,settings} from './runtime.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'
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


test('approved immutable posts publish at Chicago nine while unapproved times are flagged and retries stay fenced',async()=>{
 for(const isolatedLive of [false,true]){
  let now=Date.parse('2026-10-01T12:00:00Z')
  const f=await runtime({isolatedLive,now:Date.parse('2026-10-01T12:00:00Z')}),origin=settings.AUTH_ORIGIN
  let cookie
  const call=(path,input,session=cookie,source=origin)=>f.request(path,{method:'POST',headers:{Origin:source,Cookie:session??'','Content-Type':'application/json'},body:JSON.stringify(input)})
  const get=path=>f.request(path,{headers:{Cookie:cookie??''}})
  const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
  const state=async()=>ok(await get('/api/pane'))
  const tick=async iso=>{now=Date.parse(iso);assert.equal((await (await f.mf.getWorker()).scheduled({scheduledTime:new Date(now),cron:'* * * * *'})).outcome,'ok')}
  try{
   cookie=(await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Scheduling owner'},'')).headers.get('set-cookie').split(';')[0]
   await f.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
   const initial=await ok(await call('/api/pane/prepare',{site:JSON.parse(await readFile('fixtures/static-site.json','utf8'))}));await ok(await call('/api/pane/publish',{revision:initial.id}))
   const write=async(slug,id,body='Approved workshop story.')=>ok(await call('/api/pane/posts/save',{base:(await state()).draft.id,...(id?{id}:{}),blog:'news',byline:'Workshop team',authorSlug:'team',content:{slug,title:slug,body}}))
   let saved=await write('morning'),post=saved.posts.at(-1)
   const pending=await write('unapproved'),unapproved=pending.posts.at(-1)
   const unapprovedInput={base:pending.base,id:unapproved.id,timeZone:'America/Chicago',occurrence:'2026-11-02T09:00'}
   let invitation
   const auth=createOperatorAuth({clock:()=>Date.parse('2026-10-01T12:00:00Z'),db:f.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{invitation=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
   for(const role of ['admin','member']){
    await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie}}),{email:'synthetic-pane-'+role+'@example.test',displayName:'Schedule '+role,role})
    const token=new URL(invitation.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token'),response=await call('/auth/confirm',{token},'')
    assert.equal(response.status,303);const deniedCookie=response.headers.get('set-cookie').split(';')[0]
    assert.equal((await call('/api/pane/posts/schedule',unapprovedInput,deniedCookie)).status,403,'Only the native owner may schedule')
   }

   assert.equal((await call('/api/pane/posts/schedule',unapprovedInput,'')).status,401)
   assert.equal((await call('/api/pane/posts/schedule',unapprovedInput,cookie,'https://elsewhere.invalid')).status,403)
   await ok(await call('/api/pane/posts/schedule',unapprovedInput))
   assert.equal((await call('/api/pane/posts/schedule',{...unapprovedInput,approve:'yes'})).status,400,'Unsubmitted content cannot be approved')
   saved=await ok(await call('/api/pane/posts/submit',{base:(await state()).draft.id,id:post.id}));post=saved.posts.find(item=>item.id===post.id)
   const source=structuredClone((await state()).draft),input={base:saved.base,id:post.id,review:post.review,timeZone:'America/Chicago',occurrence:'2026-11-02T09:00',end:'2026-11-03T09:00',approve:'yes'}
   for(const occurrence of ['2027-03-14T02:30','2026-11-01T01:30'])assert.equal((await call('/api/pane/posts/schedule',{...input,occurrence})).status,400)
   assert.equal((await call('/api/pane/posts/schedule',{...input,base:initial.id})).status,409)
   assert.equal((await call('/api/pane/posts/schedule',{...input,review:'synthetic-pane-wrong'})).status,400)
   const approved=await ok(await call('/api/pane/posts/schedule',input))
   assert.equal(approved.sourceRevision,source.id)
   await write('morning',post.id,'Later private author work.')
   let current=await state();const privateSite=structuredClone(current.draft.site);privateSite.pages[0].body='Later private owner work.'
   await ok(await call('/api/pane/prepare',{base:current.draft.id,site:privateSite}))
   await tick('2026-11-02T14:59:00Z');assert.equal((await get('/site/news/morning')).status,404,'No early publication at 08:59 Central')
   await tick('2026-11-02T15:00:00Z')
   current=await state();assert.equal((await get('/site/news/morning')).status,200);assert.match(await (await get('/site/news/morning')).text(),/Approved workshop story/)
   assert.doesNotMatch(await (await get('/site/news/morning')).text(),/Later private/)
   assert.deepEqual(current.live.site.pages,initial.site.pages)
   assert.equal(current.draft.site.posts.find(item=>item.id===post.id).content.body,'Later private author work.')
   assert.equal(current.draft.site.pages[0].body,'Later private owner work.')
   assert.deepEqual(current.revisions.find(row=>row.id===source.id),source,'The approved source remains immutable')
   const events=current.schedules.history.filter(event=>event.kind==='post-published')
   assert.equal(events.length,1);assert.equal(events[0].revision,source.id);assert.equal(events[0].occurrence,'2026-11-02T09:00');assert.equal(events[0].timeZone,'America/Chicago');assert.equal(events[0].executedAt,now);assert.ok(events[0].detail.includes(current.live.id))
   assert.deepEqual(current.schedules.draftDue,['Post: unapproved']);assert.equal((await get('/site/news/unapproved')).status,404)
   assert.match(await (await get('/app/sites')).text(),/Unapproved schedules are due/)
   const live=current.live.id;await tick('2026-11-02T15:00:00Z');await tick('2026-11-02T14:00:00Z');assert.equal((await state()).live.id,live);assert.equal((await state()).schedules.history.filter(event=>event.kind==='post-published').length,1)
   const future=await write('cancelled'),cancelled=future.posts.at(-1)
   const submittedCancel=await ok(await call('/api/pane/posts/submit',{base:future.base,id:cancelled.id}))
   await ok(await call('/api/pane/posts/schedule',{base:submittedCancel.base,id:cancelled.id,review:submittedCancel.posts.find(item=>item.id===cancelled.id).review,approve:'yes',timeZone:'America/Chicago',occurrence:'2026-11-03T09:00'}))
   await ok(await call('/api/pane/posts/schedule',{base:submittedCancel.base,id:cancelled.id,cancel:'yes'}))
   await tick('2026-11-03T14:59:00Z');assert.equal((await get('/site/news/morning')).status,200)
   await tick('2026-11-03T15:00:00Z');assert.equal((await get('/site/news/morning')).status,404,'The explicitly approved expiry unpublishes at nine Central');assert.equal((await state()).schedules.history.filter(event=>event.kind==='post-unpublished').length,1);assert.equal((await state()).draft.site.posts.find(item=>item.id===post.id).content.body,'Later private author work.')
   assert.equal((await state()).schedules.posts.some(entry=>entry.postId===cancelled.id),false);assert.equal((await get('/site/news/cancelled')).status,404)
   let replacement=await write('updated'),updated=replacement.posts.at(-1)
   replacement=await ok(await call('/api/pane/posts/submit',{base:replacement.base,id:updated.id}))
   await ok(await call('/api/pane/posts/schedule',{base:replacement.base,id:updated.id,review:replacement.posts.find(item=>item.id===updated.id).review,approve:'yes',timeZone:'America/Chicago',occurrence:'2026-11-04T09:00',end:'2026-11-05T09:00'}))
   await tick('2026-11-04T15:00:00Z');assert.equal((await get('/site/news/updated')).status,200)
   replacement=await write('updated',updated.id,'Newer explicitly published story.')
   replacement=await ok(await call('/api/pane/posts/submit',{base:replacement.base,id:updated.id}))
   await ok(await call('/api/pane/posts/publish',{base:replacement.base,id:updated.id,review:replacement.posts.find(item=>item.id===updated.id).review}))
   await tick('2026-11-05T15:00:00Z');assert.equal((await get('/site/news/updated')).status,200);assert.match(await (await get('/site/news/updated')).text(),/Newer explicitly published story/,'An old expiry never removes a newer explicit publication')
   let missed=await write('missed-window'),missedPost=missed.posts.at(-1)
   missed=await ok(await call('/api/pane/posts/submit',{base:missed.base,id:missedPost.id}))
   await ok(await call('/api/pane/posts/schedule',{base:missed.base,id:missedPost.id,review:missed.posts.find(item=>item.id===missedPost.id).review,approve:'yes',timeZone:'America/Chicago',occurrence:'2026-11-06T09:00',end:'2026-11-06T10:00'}))
   await tick('2026-11-06T16:00:00Z');assert.equal((await get('/site/news/missed-window')).status,404,'A missed publication window never exposes an expired post')
   assert.equal((await state()).schedules.history.filter(event=>event.kind==='post-window-missed').length,1)
   const audit=await ok(await get('/api/pane/activity'))
   for(const action of ['schedule.save','schedule.approve','schedule.cancel'])assert.ok(audit.some(event=>event.action===action),'Transactional metadata audit: '+action)
   assert.ok(!JSON.stringify(audit).includes('Later private author work.'))

  }finally{await f.mf.dispose()}
 }
})

test('an invalidated blog schedule cannot starve other publications or leave an expired post public',async()=>{
 const {invalidatedSchedules}=await import('./post-schedule-proof.mjs')
 for(const expiry of [false,true]){
  const f=await runtime({isolatedLive:true,now:Date.parse('2026-10-01T12:00:00Z')}),origin=settings.AUTH_ORIGIN
  let cookie=''
  const post=(path,input)=>f.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)})
  const get=path=>f.request(path,{headers:{Cookie:cookie}})
  const tick=async iso=>assert.equal((await (await f.mf.getWorker()).scheduled({scheduledTime:new Date(iso),cron:'* * * * *'})).outcome,'ok')
  try{
   cookie=(await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Scheduling owner'})).headers.get('set-cookie').split(';')[0]
   await f.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
   await invalidatedSchedules({post,get,tick,expiry})
  }finally{await f.mf.dispose()}
 }
})

test('committed publications and expiries reconcile durable reads even when failure recording is unavailable',async()=>{
 const {invalidatedSchedules}=await import('./post-schedule-proof.mjs')
 const f=await runtime({isolatedLive:true,now:Date.parse('2026-10-01T12:00:00Z')}),origin=settings.AUTH_ORIGIN
 let cookie='',injected=false
 const post=(path,input)=>f.request(path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)})
 const get=path=>f.request(path,{headers:{Cookie:cookie}})
 const dispatch=iso=>(f.mf.getWorker()).then(worker=>worker.scheduled({scheduledTime:new Date(iso),cron:'* * * * *'}))
 const tick=async iso=>{
  if(!injected&&iso==='2026-11-02T15:02:00Z'){
   injected=true
   // Storage-edge failure only: production has no fault injection door.
   await f.db.prepare("CREATE TRIGGER synthetic_schedule_record_unavailable BEFORE UPDATE OF failure_at ON pane_post_schedules BEGIN SELECT RAISE(FAIL,'synthetic-pane-1'); END").run()
   try{
    assert.equal((await dispatch(iso)).outcome,'exception','The platform receives the persistence failure')
    const current=await (await get('/api/pane')).json()
    assert.deepEqual(current.live.site.blogPosts.map(row=>row.content.slug),['later-safe'])
    assert.equal(current.schedules.history.filter(event=>event.kind==='post-unpublished').length,1)
    assert.equal((await get('/site/recipes/first-safe')).status,404,'A committed expiry reaches durable reads even on a failed sweep')
    assert.equal((await get('/site/recipes/later-safe')).status,200,'A committed later publication reaches durable reads even on a failed sweep')
    assert.doesNotMatch(await (await get('/site')).text(),/Scheduled workshop promotion/,'Other completed sweeps reconcile durable banners before surfacing the error')
   }finally{await f.db.prepare('DROP TRIGGER synthetic_schedule_record_unavailable').run()}
  }
  assert.equal((await dispatch(iso)).outcome,'ok')
 }
 try{
  cookie=(await post('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Scheduling owner'})).headers.get('set-cookie').split(';')[0]
  await f.request('/setup',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  await invalidatedSchedules({post,get,tick,expiry:true})
  assert.equal(injected,true,'The failing sweep was exercised')
 }finally{await f.mf.dispose()}
})
