import {latestContent,ownPost,publishPost,PostDenied} from './posts'
import {DraftConflict,revision,normalizeSite,contentHash,revisionStatement,approvalStatements} from './content'
import type {Revision} from './model'
import {localInstant,normalizeTimeZone} from './schedule-time'
type ScheduledPost={id:string;post:string;source:string;review:string;time_zone:string;starts:string;starts_at:number;actor:string|null;executed_revision:string|null;ends:string|null;ends_at:number|null;expired_revision:string|null}
/** Saving a time grants no publication authority. Approval pins an immutable source. */
export async function savePostSchedule(db:D1Database,actor:{id:string;role:string},input:Record<string,any>,approve:boolean){
 if(actor.role!=='owner')throw new PostDenied('Only the native owner can schedule publication.')
 const draft=await latestContent(db)
 if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 const post=ownPost(draft.site,input.id,actor.id,true)
 if(!post.review||post.state!=='review')throw Error('Submit this post for review before scheduling.')
 const zone=normalizeTimeZone(input.timeZone),starts=String(input.start),at=localInstant(starts,zone)
 // Validate all ordinary publication gates, including alt text, without publishing.
 await publishPost(db,actor,{base:draft.id,id:post.id,review:post.review},{source:draft.id,at,preview:true})
 const ends=input.end?String(input.end):null,endsAt=ends?localInstant(ends,zone):null
 if(endsAt!==null&&endsAt<=at)throw Error('Post expiry must be after publication.')
 const id=crypto.randomUUID()
 const saved=await db.prepare(`INSERT INTO pane_post_schedules(id,post,source,review,time_zone,starts,starts_at,actor,ends,ends_at)
 SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?
 ON CONFLICT(post) DO UPDATE SET id=excluded.id,source=excluded.source,review=excluded.review,time_zone=excluded.time_zone,starts=excluded.starts,starts_at=excluded.starts_at,actor=excluded.actor,ends=excluded.ends,ends_at=excluded.ends_at,executed_revision=NULL,expired_revision=NULL`)
 .bind(id,post.id,draft.id,post.review,zone,starts,at,approve?actor.id:null,ends,endsAt,draft.id).run()
 if(!saved.meta.changes)throw new DraftConflict(await latestContent(db))
 return {id,source:draft.id,approved:approve,start:starts,timeZone:zone}
}
export async function postScheduleRows(db:D1Database){return (await db.prepare('SELECT * FROM pane_post_schedules ORDER BY starts_at,id').all<ScheduledPost>()).results}
/** Called only by the trusted scheduler; retries retain the exact reviewed source. */
export async function runPostSchedules(db:D1Database,now:number,runId:string){
 for(const row of await postScheduleRows(db)){
  if(!row.actor||row.starts_at>now)continue
  if(row.executed_revision){if(row.ends_at!==null&&row.ends_at<=now&&!row.expired_revision)await expirePost(db,row,now,runId);continue}
  const latest=await latestContent(db);if(!latest)continue
  const eventId=JSON.stringify(['post',row.id])
  const result=await publishPost(db,{id:row.actor,role:'owner'},{base:latest.id,id:row.post,review:row.review},{source:row.source,at:now,queue:row.id,finish:[
   db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data)
    VALUES(?,?,?,?,'post-publish',?,?,?,?,?)`).bind(eventId,runId,row.source,'post:'+row.post,row.starts,row.starts_at,row.time_zone,now,JSON.stringify({schedule:row.id})),
   db.prepare('UPDATE pane_post_schedules SET executed_revision=(SELECT live FROM pane_state WHERE id=1) WHERE id=? AND executed_revision IS NULL').bind(row.id),
  ]})
  if(!result)throw Error('Scheduled publication did not complete.')
  if(row.ends_at!==null&&row.ends_at<=now)await expirePost(db,row,now,runId)
 }
}

/** Expiry removes only the approved version; a newer publication is never withdrawn. */
async function expirePost(db:D1Database,row:ScheduledPost,now:number,runId:string){
 const [draft,liveRow]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()])
 if(!draft||!liveRow)return
 const live=revision(liveRow),current=live.site.blogPosts?.find(post=>post.id===row.post)
 if(!(current?.sourceReview===row.review)){
  await db.batch([
   db.prepare('UPDATE pane_post_schedules SET expired_revision=? WHERE id=? AND expired_revision IS NULL AND (SELECT live FROM pane_state WHERE id=1)=?').bind(live.id,row.id,live.id),
   db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_post_schedules WHERE id=? AND expired_revision=?) ON CONFLICT(id) DO NOTHING`)
    .bind(JSON.stringify(['post-expiry',row.id]),runId,row.source,'post:'+row.post,'post-expiry-preserved-newer',row.ends,row.ends_at,row.time_zone,now,JSON.stringify({schedule:row.id}),row.id,live.id),
  ])
  return
 }
 const site=normalizeSite({...live.site,blogPosts:(live.site.blogPosts??[]).filter(post=>post.id!==row.post||post.sourceReview!==row.review)})
 const at=Math.max(now,Date.parse(draft.created_at)+1),created_at=new Date(at).toISOString()
 const published:Revision={id:crypto.randomUUID(),site,actor:row.actor!,hash:await contentHash(site),created_at}
 const retainedSite=normalizeSite({...draft.site,blogPosts:site.blogPosts})
 const retained:Revision={...draft,id:crypto.randomUUID(),site:retainedSite,hash:await contentHash(retainedSite),created_at:new Date(at+1).toISOString()}
 await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
   WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=?
   AND EXISTS(SELECT 1 FROM pane_post_schedules WHERE id=? AND actor=? AND executed_revision IS NOT NULL AND expired_revision IS NULL)
   AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')`)
   .bind(published.id,JSON.stringify(site),published.hash,row.actor,created_at,draft.id,live.id,row.id,row.actor,row.actor),
  ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:row.actor!,created_at}),revisionStatement(db,retained),
  db.prepare('UPDATE pane_post_schedules SET expired_revision=? WHERE id=?').bind(published.id,row.id),
  db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) VALUES(?,?,?,?,?,?,?,?,?,?)`)
   .bind(JSON.stringify(['post-expiry',row.id]),runId,row.source,'post:'+row.post,current?.sourceReview===row.review?'post-expire':'post-expiry-preserved-newer',row.ends,row.ends_at,row.time_zone,now,JSON.stringify({schedule:row.id})),
 ])
}
