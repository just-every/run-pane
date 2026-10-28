import {latestContent,PostDenied} from './posts'
import {publishPage} from './page-review'
import {DraftConflict,revision,normalizeSite,contentHash,revisionStatement,approvalStatements} from './content'
import {pageId} from './pages'
import {localInstant,normalizeTimeZone} from './schedule-time'
import type {Revision} from './model'
type PageSchedule={id:string;page:string;source:string;request:string;time_zone:string;starts:string;starts_at:number;actor:string|null;executed_revision:string|null;ends:string|null;ends_at:number|null;expired_revision:string|null}
export async function pageScheduleRows(db:D1Database){return(await db.prepare('SELECT * FROM pane_page_schedules ORDER BY starts_at,id').all<PageSchedule>()).results}
export async function savePageSchedule(db:D1Database,actor:{id:string;role:string},input:Record<string,any>,approve:boolean){
 if(actor.role!=='owner'||!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first())throw new PostDenied('Only the native owner schedules page publication.')
 const draft=await latestContent(db);if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 const id=String(input.page),request=String(input.request),zone=normalizeTimeZone(input.timeZone),starts=String(input.start),at=localInstant(starts,zone)
 if(at<=Date.now())throw Error('Choose a future business-local publication time.')
 await publishPage(db,actor.id,draft.id,id,request,{source:draft.id,at,preview:true})
 const ends=input.end?String(input.end):null,endsAt=ends?localInstant(ends,zone):null
 if(endsAt!==null&&draft.site.pages.filter(page=>!page.deleted).length<2)throw Error('Keep at least one other page before scheduling page expiry.')
 if(endsAt!==null&&endsAt<=at)throw Error('Page expiry must be after publication.')
 const schedule=crypto.randomUUID()
 const saved=await db.prepare(`INSERT INTO pane_page_schedules(id,page,source,request,time_zone,starts,starts_at,actor,ends,ends_at)
 SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?
 ON CONFLICT(page) DO UPDATE SET id=excluded.id,source=excluded.source,request=excluded.request,time_zone=excluded.time_zone,starts=excluded.starts,starts_at=excluded.starts_at,actor=excluded.actor,ends=excluded.ends,ends_at=excluded.ends_at,executed_revision=NULL,expired_revision=NULL`)
 .bind(schedule,id,draft.id,request,zone,starts,at,approve?actor.id:null,ends,endsAt,draft.id).run()
 if(!saved.meta.changes)throw new DraftConflict(await latestContent(db))
 return {id:schedule,source:draft.id,approved:approve}
}
export async function runPageSchedules(db:D1Database,now:number,runId:string){
 if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid scheduled event time.')
 const clock=await db.prepare('SELECT scheduled_at FROM pane_schedule_clock WHERE id=1').first<{scheduled_at:number}>()
 if(clock&&now<clock.scheduled_at)return
 await db.prepare('INSERT INTO pane_schedule_ticks(id,scheduled_at,revision) SELECT ?,?,live FROM pane_state WHERE id=1 ON CONFLICT(id) DO NOTHING').bind(runId,now).run()

 const failures:unknown[]=[]
 for(const row of await pageScheduleRows(db)){
  if(!row.actor||row.starts_at>now||row.expired_revision||row.executed_revision&&row.ends_at===null)continue
  try{
  if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(row.actor).first())throw new PostDenied('The approving owner is no longer active.')
  if(!row.executed_revision){
   if(row.ends_at!==null&&row.ends_at<=now){
    await db.batch([
     db.prepare("UPDATE pane_page_schedules SET expired_revision=source WHERE id=?").bind(row.id),
     db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) VALUES(?,?,?,?,'page-window-missed',?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(JSON.stringify(['page-missed',row.id]),runId,row.source,'page:'+row.page,row.starts,row.starts_at,row.time_zone,now,'{}'),
    ]);continue
   }
   const latest=await latestContent(db);if(!latest)continue
   await publishPage(db,row.actor,latest.id,row.page,row.request,{source:row.source,at:now,queue:row.id,finish:[
    db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) VALUES(?,?,?,?,'page-publish',?,?,?,?,?)`)
     .bind(JSON.stringify(['page',row.id]),runId,row.source,'page:'+row.page,row.starts,row.starts_at,row.time_zone,now,JSON.stringify({schedule:row.id})),
    db.prepare('UPDATE pane_page_schedules SET executed_revision=(SELECT live FROM pane_state WHERE id=1) WHERE id=?').bind(row.id),
   ]})
  }
  if(row.ends_at!==null&&row.ends_at<=now&&!row.expired_revision)await expirePage(db,row,now,runId)
  }catch{
   try{await db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) VALUES(?,?,?,?,'page-schedule-failed',?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
    .bind(JSON.stringify(['page-failure',row.id,row.executed_revision?'expiry':'publication']),runId,row.source,'page:'+row.page,row.executed_revision?row.ends:row.starts,row.executed_revision?row.ends_at:row.starts_at,row.time_zone,now,JSON.stringify({error:'The scheduled page change was refused. Review the source and owner approval; other schedules continue.'})).run()}catch(error){failures.push(error)}
  }
 }
 if(failures.length)throw new AggregateError(failures,'Page schedule failures could not be recorded.')
}
async function expirePage(db:D1Database,row:PageSchedule,now:number,runId:string){
 const [draft,liveRow,source]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(row.source).first()])
 if(!draft||!liveRow||!source)return
 const live=revision(liveRow),approved=revision(source).site.pages.find(page=>pageId(page)===row.page),current=live.site.pages.find(page=>pageId(page)===row.page)
 const same=JSON.stringify(current)===JSON.stringify(approved)
 if(!(same)){
  await db.batch([
   db.prepare('UPDATE pane_page_schedules SET expired_revision=? WHERE id=? AND expired_revision IS NULL AND (SELECT live FROM pane_state WHERE id=1)=?').bind(live.id,row.id,live.id),
   db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_page_schedules WHERE id=? AND expired_revision=?) ON CONFLICT(id) DO NOTHING`)
    .bind(JSON.stringify(['page-expiry',row.id]),runId,row.source,'page:'+row.page,'page-expiry-preserved-newer',row.ends,row.ends_at,row.time_zone,now,JSON.stringify({schedule:row.id}),row.id,live.id),
  ])
  return
 }
 const pages=live.site.pages.map(page=>pageId(page)===row.page&&same?{...page,deleted:true}:page)
 const home=pages.find(page=>!page.deleted&&page.slug!==live.site.notFound)?.slug
 const site=normalizeSite({...live.site,pages,...(same&&live.site.home===current?.slug?{home}:{}),...(same&&live.site.notFound===current?.slug?{notFound:undefined}:{})})
 const at=Math.max(now,Date.parse(draft.created_at)+1),created_at=new Date(at).toISOString()
 const published:Revision={id:crypto.randomUUID(),site,actor:row.actor!,hash:await contentHash(site),created_at}
 const retained:Revision={...draft,id:crypto.randomUUID(),created_at:new Date(at+1).toISOString()}
 await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
   WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=?
   AND EXISTS(SELECT 1 FROM pane_page_schedules WHERE id=? AND actor=? AND executed_revision IS NOT NULL AND expired_revision IS NULL)
   AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')`).bind(published.id,JSON.stringify(site),published.hash,row.actor,created_at,draft.id,live.id,row.id,row.actor,row.actor),
  ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:row.actor!,created_at}),revisionStatement(db,retained),
  db.prepare('UPDATE pane_page_schedules SET expired_revision=? WHERE id=?').bind(published.id,row.id),
  db.prepare('INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(JSON.stringify(['page-expiry',row.id]),runId,row.source,'page:'+row.page,same?'page-expire':'page-expiry-preserved-newer',row.ends,row.ends_at,row.time_zone,now,JSON.stringify({schedule:row.id})),
 ])
}
