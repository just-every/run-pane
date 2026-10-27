import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

// Exercise the same owner doors for both a late first sweep and an expiry sweep.
export async function invalidatedSchedules({post,get,tick,expiry=false,day='2026-11-02',utcHour='15'}){
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 const state=async()=>ok(await get('/api/pane'))
 const site=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
 site.blogs=[{id:'news',prefix:'news',title:'News',comments:false,pageSize:10},{id:'recipes',prefix:'recipes',title:'Recipes',comments:false,pageSize:10}]
 site.automations={timeZone:'America/Chicago',banners:[{id:'promotion',text:'Scheduled workshop promotion',start:`${day}T09:00`,end:`${day}T09:02`}]}
 const initial=await ok(await post('/api/pane/prepare',{site}));await ok(await post('/api/pane/publish',{revision:initial.id}))
 const scheduled=[]
 for(const [slug,blog,occurrence,end] of [['first-safe','recipes',`${day}T09:00`,expiry?`${day}T09:02`:''],['invalidated','news',`${day}T09:01`,''],['later-safe','recipes',`${day}T09:02`,'']]){
  const saved=await ok(await post('/api/pane/posts/save',{base:(await state()).draft.id,blog,byline:'Workshop team',authorSlug:'team',content:{slug,title:slug,body:'Approved '+slug+' workshop story.'}})),item=saved.posts.at(-1)
  const submitted=await ok(await post('/api/pane/posts/submit',{base:saved.base,id:item.id})),review=submitted.posts.find(row=>row.id===item.id).review
  const schedule=await ok(await post('/api/pane/posts/schedule',{base:submitted.base,id:item.id,review,timeZone:'America/Chicago',occurrence,end,approve:'yes'}))
  scheduled.push({slug,id:item.id,schedule:schedule.id,source:submitted.base})
 }
 // A supported full owner publication invalidates only the earlier News URL approval.
 const changed=await ok(await post('/api/pane/blogs/save',{base:(await state()).draft.id,id:'news',title:'News',prefix:'updates',pageSize:10}))
 await ok(await post('/api/pane/publish',{revision:changed.id}))
 if(expiry){
  await tick(`${day}T${utcHour}:00:00Z`)
  assert.equal((await get('/site/recipes/first-safe')).status,200,'An approved post is public before expiry')
  assert.match(await (await get('/site')).text(),/Scheduled workshop promotion/)
 }
 for(const iso of [`${day}T${utcHour}:02:00Z`,`${day}T${utcHour}:03:00Z`]){
  await tick(iso)
  const current=await state(),history=current.schedules.history
  assert.deepEqual(current.live.site.blogPosts.map(row=>row.id).sort(),(expiry?[scheduled[2].id]:[scheduled[0].id,scheduled[2].id]).sort(),'Recorded live state contains exactly the successful schedules')
  for(const index of [0,2]){
   const entry=scheduled[index],published=history.filter(event=>event.kind==='post-published'&&event.rule==='post:'+entry.id)
   assert.equal(published.length,1,'Each safe publication executes exactly once');assert.equal(published[0].revision,entry.source)
   const response=await get('/site/recipes/'+entry.slug)
   assert.equal(response.status,expiry&&index===0?404:200,'Public durable state agrees with execution history')
   if(response.status===200)assert.match(await response.text(),new RegExp('Approved '+entry.slug))
  }
  assert.equal(history.filter(event=>event.kind==='post-unpublished').length,expiry?1:0,'Only the explicitly expired version has an unpublication record')
  if(expiry)assert.equal(history.find(event=>event.kind==='post-unpublished').executedAt,Date.parse(`${day}T${utcHour}:02:00Z`))
  assert.equal((await get('/site/news/invalidated')).status,404);assert.equal((await get('/site/updates/invalidated')).status,404)
  const failed=current.schedules.posts.find(row=>row.id===scheduled[1].schedule)
  assert.equal(failed.executedAt,null);assert.equal(failed.failedAt,Date.parse(iso));assert.equal(failed.failureAction,'publication')
  const failure=history.filter(event=>event.kind==='post-publication-failed');assert.equal(failure.length,1);assert.equal(failure[0].revision,scheduled[1].source)
  assert.match(await (await get('/app/sites')).text(),/Schedule failed — review required/,'The owner sees the failure without raw errors')
  assert.doesNotMatch(await (await get('/site')).text(),/Scheduled workshop promotion/,'Durable banner state also reconciles at expiry')
 }
 return scheduled
}
