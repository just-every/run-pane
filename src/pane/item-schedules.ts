import {publishCollectionItem,collectionTarget} from './collection-store'
import {latestContent,PostDenied} from './posts'
import {DraftConflict,revision,normalizeSite,contentHash,approvalStatements,revisionStatement} from './content'
import {localInstant,normalizeTimeZone} from './schedule-time'
import type {Revision} from './model'

type ItemSchedule={id:string;collection_id:string;item_id:string;source_revision:string;actor:string|null;starts:string;starts_at:number;time_zone:string;ends:string|null;ends_at:number|null;executed_at:number|null;result_revision:string|null;expired_at:number|null;expiry_revision:string|null;cancelled_at:number|null;failure_at:number|null;failure_action:'publication'|'expiry'|null}
export async function itemSchedules(db:D1Database){return(await db.prepare('SELECT * FROM pane_item_schedules ORDER BY starts_at,id').all<ItemSchedule>()).results}

/** Scheduling preserves an exact owner-approved source; saving a time grants no approval. */
export async function saveItemSchedule(db:D1Database,actor:{id:string;role:string},input:Record<string,unknown>){
 if(actor.role!=='owner'||!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first())throw new PostDenied('Only the native owner schedules collection items.')
 const draft=await latestContent(db);if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 const {collection,item}=collectionTarget(draft.site.collections,input.collection,input.id),now=Date.now()
 if(input.cancel==='yes'){
  await db.prepare('UPDATE pane_item_schedules SET cancelled_at=? WHERE collection_id=? AND item_id=? AND cancelled_at IS NULL AND expired_at IS NULL').bind(now,collection.id,item!.id).run()
  return {cancelled:true}
 }
 const zone=normalizeTimeZone(input.timeZone),starts=String(input.start??''),at=localInstant(starts,zone),ends=input.end?String(input.end):null,endsAt=ends?localInstant(ends,zone):null
 if(at<=now)throw Error('Choose a future business-local publication time.')
 if(endsAt!==null&&endsAt<=at)throw Error('Item expiry must follow publication.')
 const approved=input.approve==='yes'
 await publishCollectionItem(db,actor.id,{base:draft.id,collection:collection.id,id:item!.id},{preview:true})
 const id=crypto.randomUUID()
 await db.batch([
  db.prepare(`INSERT INTO pane_item_schedules(id,collection_id,item_id,source_revision,actor,starts,starts_at,time_zone,ends,ends_at)
   SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?`).bind(id,collection.id,item!.id,draft.id,approved?actor.id:null,starts,at,zone,ends,endsAt,draft.id),
  db.prepare('UPDATE pane_item_schedules SET cancelled_at=? WHERE collection_id=? AND item_id=? AND id!=? AND cancelled_at IS NULL AND expired_at IS NULL AND EXISTS(SELECT 1 FROM pane_item_schedules WHERE id=?)').bind(now,collection.id,item!.id,id,id),
 ])
 if(!await db.prepare('SELECT 1 FROM pane_item_schedules WHERE id=?').bind(id).first())throw new DraftConflict(await latestContent(db))
 return {id,approved,sourceRevision:draft.id}
}

/** Independent due entries continue after a refused publication or expiry. */
export async function runItemSchedules(db:D1Database,now:number){
 if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid scheduled event time.')
 const clock=await db.prepare('SELECT scheduled_at FROM pane_schedule_clock WHERE id=1').first<{scheduled_at:number}>()
 if(clock&&now<clock.scheduled_at)return
 const failures:unknown[]=[]
 for(const entry of await itemSchedules(db)){
  if(entry.cancelled_at!==null||entry.expired_at!==null||!entry.actor||entry.starts_at>now)continue
  try{
   if(entry.executed_at===null){
    if(entry.ends_at!==null&&entry.ends_at<=now){await db.prepare('UPDATE pane_item_schedules SET expired_at=? WHERE id=?').bind(now,entry.id).run();continue}
    const row=await db.prepare('SELECT * FROM pane_revisions WHERE id=? AND NOT EXISTS(SELECT 1 FROM pane_revoked_revisions WHERE revision=?)').bind(entry.source_revision,entry.source_revision).first()
    if(!row)throw Error('The approved source is unavailable.')
    const draft=await latestContent(db);if(!draft)throw Error('No current draft is available.')
    await publishCollectionItem(db,entry.actor,{base:draft.id,collection:entry.collection_id,id:entry.item_id},{source:revision(row),schedule:{id:entry.id,now}})
   }else if(entry.ends_at!==null&&entry.ends_at<=now)await expireItem(db,entry,now)
  }catch{
   try{await db.prepare('UPDATE pane_item_schedules SET failure_at=?,failure_action=? WHERE id=?').bind(now,entry.executed_at===null?'publication':'expiry',entry.id).run()}catch(error){failures.push(error)}
  }
 }
 if(failures.length)throw new AggregateError(failures,'Item schedule failures could not be recorded.')
}

async function expireItem(db:D1Database,entry:ItemSchedule,now:number){
 if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(entry.actor).first())throw new PostDenied('The approving owner is no longer active.')
 const [draft,row,executed]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(entry.result_revision).first()])
 if(!draft||!row||!executed)throw Error('The current publication is unavailable.')
 const live=revision(row),publishedItem=revision(executed).site.collections?.find(collection=>collection.id===entry.collection_id)?.items.find(item=>item.id===entry.item_id)
 const current=live.site.collections?.find(collection=>collection.id===entry.collection_id)?.items.find(item=>item.id===entry.item_id)
 if(!current||JSON.stringify(current)!==JSON.stringify(publishedItem)){
  await db.prepare('UPDATE pane_item_schedules SET expired_at=? WHERE id=?').bind(now,entry.id).run();return
 }
 const site=normalizeSite({...live.site,collections:live.site.collections!.map(collection=>collection.id===entry.collection_id?{...collection,items:collection.items.filter(item=>item.id!==entry.item_id)}:collection)})
 const at=Math.max(now,Date.parse(draft.created_at)+1),created_at=new Date(at).toISOString()
 const published:Revision={id:crypto.randomUUID(),site,actor:entry.actor!,hash:await contentHash(site),created_at}
 const retained:Revision={...draft,id:crypto.randomUUID(),created_at:new Date(at+1).toISOString()}
 const result=await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
   WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=?
   AND EXISTS(SELECT 1 FROM pane_item_schedules WHERE id=? AND executed_at IS NOT NULL AND expired_at IS NULL AND cancelled_at IS NULL)
   AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')`).bind(published.id,JSON.stringify(site),published.hash,entry.actor,created_at,draft.id,live.id,entry.id,entry.actor),
  ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:entry.actor!,created_at}),revisionStatement(db,retained),
  db.prepare('UPDATE pane_item_schedules SET expired_at=?,expiry_revision=? WHERE id=?').bind(now,published.id,entry.id),
 ])
 if(!result[0].meta.changes)throw new DraftConflict(await latestContent(db))
}

export async function itemScheduleOverview(db:D1Database,draft:Revision|null|undefined,lastTick:number|null){
 const rows=(await itemSchedules(db)).filter(entry=>entry.cancelled_at===null)
 const items=rows.map(entry=>({id:entry.id,collection:entry.collection_id,item:entry.item_id,title:draft?.site.collections?.find(collection=>collection.id===entry.collection_id)?.items.find(item=>item.id===entry.item_id)?.title??entry.item_id,source:entry.source_revision,occurrence:entry.starts,end:entry.ends,timeZone:entry.time_zone,state:entry.failure_at!==null&&entry.failure_at>(entry.failure_action==='expiry'?entry.expired_at??-1:entry.executed_at??-1)?'Review required':entry.expired_at!==null?'Finished':entry.executed_at!==null?'Published':entry.actor?'Approved':'Awaiting approval'}))
 const history=rows.flatMap(entry=>[
  ...(entry.executed_at!==null?[{id:entry.id,revision:entry.source_revision,rule:'item:'+entry.collection_id+':'+entry.item_id,occurrence:entry.starts,kind:'item-published',timeZone:entry.time_zone,executedAt:entry.executed_at,detail:'Published revision '+entry.result_revision}]:[]),
  ...(entry.expired_at!==null?[{id:entry.id+':expiry',revision:entry.source_revision,rule:'item:'+entry.collection_id+':'+entry.item_id,occurrence:entry.ends!,kind:entry.expiry_revision?'item-unpublished':entry.executed_at===null?'item-window-missed':'item-expiry-preserved-newer',timeZone:entry.time_zone,executedAt:entry.expired_at,detail:entry.expiry_revision?'Published revision '+entry.expiry_revision:entry.executed_at===null?'The publication window elapsed without execution.':'A newer item version was retained.'}]:[]),
  ...(entry.failure_at!==null?[{id:entry.id+':failure',revision:entry.source_revision,rule:'item:'+entry.collection_id+':'+entry.item_id,occurrence:entry.failure_action==='expiry'?entry.ends!:entry.starts,kind:'item-'+entry.failure_action+'-failed',timeZone:entry.time_zone,executedAt:entry.failure_at,detail:'The scheduled change was refused. Review the item and its collection, then cancel or approve a new schedule. Other schedules continue.'}]:[]),
 ])
 return {items,history,due:rows.filter(entry=>!entry.actor&&entry.executed_at===null&&lastTick!==null&&entry.starts_at<=lastTick).map(entry=>'Item awaiting approval: '+items.find(item=>item.id===entry.id)!.title)}
}
