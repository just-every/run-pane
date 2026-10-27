import {DraftConflict,revision,contentHash,approvalStatements,revisionStatement} from './content'
import {latestContent,PostDenied} from './posts'
import {publishPage} from './page-review'
import {pageId} from './pages'
import {localInstant,normalizeTimeZone} from './schedule-time'
import type {Revision} from './model'

type ScheduledPage={end_occurrence:string|null;end_at:number|null;expired_at:number|null;expiry_revision:string|null;id:string;page_id:string;source_revision:string;review:string|null;occurrence:string;occurrence_at:number;time_zone:string;approved_by:string|null;cancelled_at:number|null;executed_at:number|null;result_revision:string|null}
export async function pageSchedules(db:D1Database):Promise<ScheduledPage[]>{
 return (await db.prepare('SELECT * FROM pane_page_schedules ORDER BY occurrence_at,id').all<ScheduledPage>()).results
}
/** Saving a time never grants publication authority. Approval binds immutable content. */
export async function schedulePage(db:D1Database,actor:{id:string;role:string},input:Record<string,unknown>){
 if(actor.role!=='owner'||!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first())throw new PostDenied('Only the native owner can schedule pages.')
 const draft=await latestContent(db)
 if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 const page=draft.site.pages.find(page=>pageId(page)===input.id),now=Date.now()
 if(!page||page.deleted)throw Error('Choose an active draft page.')
 if(input.cancel==='yes'){
  await db.prepare('UPDATE pane_page_schedules SET cancelled_at=? WHERE page_id=? AND expired_at IS NULL AND cancelled_at IS NULL').bind(now,pageId(page)).run()
  return {cancelled:true}
 }
 const timeZone=normalizeTimeZone(input.timeZone),occurrence=String(input.occurrence??''),at=localInstant(occurrence,timeZone)
 if(at<=now)throw Error('Choose a future business-local publication time.')
 const end=String(input.end??'').trim(),endAt=end?localInstant(end,timeZone):null
 if(endAt!==null&&endAt<=at)throw Error('Unpublication must follow publication in the business time zone.')
 const approved=input.approve==='yes'
 if(approved)await publishPage(db,actor.id,draft.id,pageId(page),String(input.review??''),{preview:true})
 const id=crypto.randomUUID()
 await db.batch([
  db.prepare('INSERT INTO pane_page_schedules(id,page_id,source_revision,review,occurrence,occurrence_at,time_zone,created_by,approved_by,created_at,end_occurrence,end_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?').bind(id,pageId(page),draft.id,approved?String(input.review):null,occurrence,at,timeZone,actor.id,approved?actor.id:null,now,end||null,endAt,draft.id),
  db.prepare('UPDATE pane_page_schedules SET cancelled_at=? WHERE page_id=? AND id!=? AND expired_at IS NULL AND cancelled_at IS NULL AND EXISTS(SELECT 1 FROM pane_page_schedules WHERE id=?)').bind(now,pageId(page),id,id),
 ])
 if(!await db.prepare('SELECT 1 FROM pane_page_schedules WHERE id=?').bind(id).first())throw new DraftConflict(await latestContent(db))
 return {id,approved,sourceRevision:draft.id,occurrence,timeZone}
}
/** Native scheduled events are the only execution door; ordinary reads do no work. */
export async function runPageSchedules(db:D1Database,now:number):Promise<Revision|null>{
 if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid scheduled event time.')
 const clock=await db.prepare('SELECT scheduled_at FROM pane_schedule_clock WHERE id=1').first<{scheduled_at:number}>()
 if(clock&&now<clock.scheduled_at)return null
 let published:Revision|null=null
 for(const entry of await pageSchedules(db)){
  if(entry.cancelled_at!==null||entry.expired_at!==null||!entry.approved_by||entry.occurrence_at>now)continue
  if(entry.executed_at!==null){
   if(entry.end_at!==null&&entry.end_at<=now&&entry.expired_at===null){const expired=await expirePage(db,entry,now);if(expired)published=expired}
   continue
  }
  if(entry.end_at!==null&&entry.end_at<=now){
   await db.prepare('UPDATE pane_page_schedules SET expired_at=? WHERE id=? AND executed_at IS NULL AND expired_at IS NULL AND cancelled_at IS NULL').bind(now,entry.id).run()
   continue
  }
  const row=await db.prepare('SELECT * FROM pane_revisions WHERE id=? AND NOT EXISTS(SELECT 1 FROM pane_revoked_revisions WHERE revision=?)').bind(entry.source_revision,entry.source_revision).first()
  if(!row)continue
  const current=await latestContent(db);if(!current)continue
  published=await publishPage(db,entry.approved_by,current.id,entry.page_id,entry.review??'',{source:revision(row),schedule:{id:entry.id,now}})
 }
 return published
}

/** An explicitly approved expiry removes only the page version this schedule published. */
async function expirePage(db:D1Database,entry:ScheduledPage,now:number):Promise<Revision|null>{
 if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(entry.approved_by).first())return null
 const [draft,row]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()])
 if(!draft||!row)return null
 const live=revision(row),page=live.site.pages.find(page=>pageId(page)===entry.page_id)
 const approvedRow=await db.prepare('SELECT site FROM pane_revisions WHERE id=?').bind(entry.result_revision).first<{site:string}>()
 const approved=approvedRow?JSON.parse(approvedRow.site).pages.find((item:import('./model').Page)=>pageId(item)===entry.page_id):null
 if(!page||JSON.stringify(page)!==JSON.stringify(approved)){
  await db.prepare('UPDATE pane_page_schedules SET expired_at=? WHERE id=? AND expired_at IS NULL').bind(now,entry.id).run()
  return null
 }
 // Keep an expired page in its immutable snapshot as deleted; its private draft is retained.
 const site={...live.site,pages:live.site.pages.map(item=>pageId(item)===entry.page_id?{...item,deleted:true}:item)},at=Math.max(now,Date.parse(draft.created_at)+1)
 const published:Revision={id:crypto.randomUUID(),actor:entry.approved_by!,site,hash:await contentHash(site),created_at:new Date(at).toISOString()}
 const retained:Revision={...draft,id:crypto.randomUUID(),created_at:new Date(at+1).toISOString()}
 await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=? AND EXISTS(SELECT 1 FROM pane_page_schedules WHERE id=? AND expired_at IS NULL AND cancelled_at IS NULL)`).bind(published.id,JSON.stringify(site),published.hash,published.actor,published.created_at,draft.id,live.id,entry.id),
  ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:published.actor,created_at:published.created_at}),revisionStatement(db,retained),
  db.prepare('UPDATE pane_page_schedules SET expired_at=?,expiry_revision=? WHERE id=?').bind(now,published.id,entry.id),
 ])
 return published
}
