import {DraftConflict,revision,normalizeSite,contentHash,approvalStatements,revisionStatement} from './content'
import {latestContent,ownPost,publishPost,PostDenied} from './posts'
import {localInstant,normalizeTimeZone} from './schedule-time'
import type {Revision} from './model'

type ScheduledPost={failure_at:number|null;failure_action:'publication'|'expiry'|null;end_occurrence:string|null;end_at:number|null;expired_at:number|null;expiry_revision:string|null;id:string;post_id:string;source_revision:string;review:string|null;occurrence:string;occurrence_at:number;time_zone:string;approved_by:string|null;cancelled_at:number|null;executed_at:number|null;result_revision:string|null}
export async function postSchedules(db:D1Database):Promise<ScheduledPost[]>{
 return (await db.prepare('SELECT * FROM pane_post_schedules ORDER BY occurrence_at,id').all<ScheduledPost>()).results
}
/** Saving a time never grants publication authority. Approval binds immutable content. */
export async function schedulePost(db:D1Database,actor:{id:string;role:string},input:Record<string,unknown>){
 if(actor.role!=='owner'||!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first())throw new PostDenied('Only the native owner can schedule posts.')
 const draft=await latestContent(db)
 if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 const post=ownPost(draft.site,input.id,actor.id,true),now=Date.now()
 if(input.cancel==='yes'){
  await db.prepare('UPDATE pane_post_schedules SET cancelled_at=? WHERE post_id=? AND expired_at IS NULL AND cancelled_at IS NULL').bind(now,post.id).run()
  return {cancelled:true}
 }
 const timeZone=normalizeTimeZone(input.timeZone),occurrence=String(input.occurrence??''),at=localInstant(occurrence,timeZone)
 if(at<=now)throw Error('Choose a future business-local publication time.')
 const end=String(input.end??'').trim(),endAt=end?localInstant(end,timeZone):null
 if(endAt!==null&&endAt<=at)throw Error('Unpublication must follow publication in the business time zone.')
 const approved=input.approve==='yes'
 if(approved)await publishPost(db,actor,{base:draft.id,id:post.id,review:String(input.review??'')},{preview:true})
 const id=crypto.randomUUID()
 await db.batch([
  db.prepare('INSERT INTO pane_post_schedules(id,post_id,source_revision,review,occurrence,occurrence_at,time_zone,created_by,approved_by,created_at,end_occurrence,end_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?').bind(id,post.id,draft.id,post.review??null,occurrence,at,timeZone,actor.id,approved?actor.id:null,now,end||null,endAt,draft.id),
  db.prepare('UPDATE pane_post_schedules SET cancelled_at=? WHERE post_id=? AND id!=? AND expired_at IS NULL AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM pane_post_schedules WHERE id=?)').bind(now,post.id,id,id),
 ])
 if(!await db.prepare('SELECT 1 FROM pane_post_schedules WHERE id=?').bind(id).first())throw new DraftConflict(await latestContent(db))
 return {id,approved,sourceRevision:draft.id,occurrence,timeZone}
}
/** Native scheduled events are the only execution door; ordinary reads do no work. */
export async function runPostSchedules(db:D1Database,now:number):Promise<Revision|null>{
 if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid scheduled event time.')
 const clock=await db.prepare('SELECT scheduled_at FROM pane_schedule_clock WHERE id=1').first<{scheduled_at:number}>()
 if(clock&&now<clock.scheduled_at)return null
 let published:Revision|null=null
 const failures:unknown[]=[]
 for(const entry of await postSchedules(db)){
  if(entry.cancelled_at!==null||entry.expired_at!==null||!entry.approved_by||entry.occurrence_at>now)continue
  try{
  if(entry.executed_at!==null){
   if(entry.end_at!==null&&entry.end_at<=now&&entry.expired_at===null){const expired=await expirePost(db,entry,now);if(expired)published=expired}
   continue
  }
  if(entry.end_at!==null&&entry.end_at<=now){
   await db.prepare('UPDATE pane_post_schedules SET expired_at=? WHERE id=? AND executed_at IS NULL AND expired_at IS NULL AND cancelled_at IS NULL').bind(now,entry.id).run()
   continue
  }
  const row=await db.prepare('SELECT * FROM pane_revisions WHERE id=? AND NOT EXISTS(SELECT 1 FROM pane_revoked_revisions WHERE revision=?)').bind(entry.source_revision,entry.source_revision).first()
  if(!row)throw Error('The approved source is unavailable.')
  const current=await latestContent(db);if(!current)throw Error('No current draft is available.')
  published=await publishPost(db,{id:entry.approved_by,role:'owner'},{base:current.id,id:entry.post_id,review:entry.review??''},{source:revision(row),schedule:{id:entry.id,now}})
  }catch{
   // Persist only a safe outcome; one rejected entry must not starve another blog.
   try{await db.prepare('UPDATE pane_post_schedules SET failure_at=?,failure_action=? WHERE id=? AND cancelled_at IS NULL').bind(now,entry.executed_at===null?'publication':'expiry',entry.id).run()}catch(error){failures.push(error)}
  }
 }
 if(failures.length)throw new AggregateError(failures,'Schedule failures could not be recorded.')
 return published
}

/** An explicitly approved expiry removes only the version this schedule published. */
async function expirePost(db:D1Database,entry:ScheduledPost,now:number):Promise<Revision|null>{
 if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(entry.approved_by).first())throw new PostDenied('The approving owner is no longer active.')
 const [draft,row]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()])
 if(!draft||!row)throw Error('The current publication is unavailable.')
 const live=revision(row),post=live.site.blogPosts?.find(post=>post.id===entry.post_id)
 if(!post||post.sourceReview!==entry.review){
  await db.prepare('UPDATE pane_post_schedules SET expired_at=? WHERE id=? AND expired_at IS NULL').bind(now,entry.id).run()
  return null
 }
 const site=normalizeSite({...live.site,blogPosts:live.site.blogPosts!.filter(post=>post.id!==entry.post_id)}),at=Math.max(now,Date.parse(draft.created_at)+1)
 const published:Revision={id:crypto.randomUUID(),actor:entry.approved_by!,site,hash:await contentHash(site),created_at:new Date(at).toISOString()}
 const retainedSite=normalizeSite({...draft.site,blogPosts:site.blogPosts}),retained:Revision={...draft,id:crypto.randomUUID(),site:retainedSite,hash:await contentHash(retainedSite),created_at:new Date(at+1).toISOString()}
 await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=? AND EXISTS(SELECT 1 FROM pane_post_schedules WHERE id=? AND expired_at IS NULL AND cancelled_at IS NULL)`).bind(published.id,JSON.stringify(site),published.hash,published.actor,published.created_at,draft.id,live.id,entry.id),
  ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:published.actor,created_at:published.created_at}),revisionStatement(db,retained),
  db.prepare('UPDATE pane_post_schedules SET expired_at=?,expiry_revision=? WHERE id=?').bind(now,published.id,entry.id),
 ])
 return published
}
