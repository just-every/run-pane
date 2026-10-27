import {postSchedules} from './post-schedules'
import type { Page, Revision, Site } from './model'
import { activePages, pageId } from './pages'
import { addMonths, localAt, localInstant, normalizeTimeZone } from './schedule-time'

export type Automations = {timeZone:string;banners:{id:string;text:string;start:string;end:string}[];review?:{start:string;months:number}}
type ReminderPage = {id:string;title:string;slug:string}
type ReminderRow = {id:string;revision:string;occurrence:string;occurrence_at:number;time_zone:string;data:string}
type History = {id:string;revision:string;rule:string;occurrence:string;kind:string;timeZone:string;executedAt:number;detail?:string}
export type ScheduleOverview = {
 posts:{failedAt:number|null;failureAction:'publication'|'expiry'|null;id:string;postId:string;sourceRevision:string;occurrence:string;timeZone:string;approved:boolean;executedAt:number|null;end:string|null;expiredAt:number|null}[];lastTick:number|null;timeZone:string|null;activeBanners:{id:string;text:string}[];draftDue:string[];
 reminders:{id:string;revision:string;occurrence:string;timeZone:string;pages:ReminderPage[]}[];history:History[]
}
export function normalizeAutomations(value: unknown): Automations | undefined {
 if (value === undefined || value === null) return undefined
 if (!value || typeof value !== 'object') throw Error('Provide schedule settings.')
 const input = value as Automations, timeZone = normalizeTimeZone(input.timeZone)
 if (!Array.isArray(input.banners) || input.banners.length > 40) throw Error('Provide up to 40 scheduled banners.')
 const banners = input.banners.map(banner => {
  if (!banner || typeof banner.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(banner.id)) throw Error('Each banner needs a unique short identity using letters, numbers, hyphens or underscores.')
  if (typeof banner.text !== 'string' || !banner.text.trim() || banner.text.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(banner.text)) throw Error('A banner needs plain text up to 500 characters.')
  if (localInstant(banner.end,timeZone) <= localInstant(banner.start,timeZone)) throw Error('A banner must end after it starts in the business time zone.')
  return {id:banner.id,text:banner.text.normalize('NFC').trim(),start:banner.start,end:banner.end}
 })
 if (new Set(banners.map(banner => banner.id)).size !== banners.length) throw Error('Banner identities must be unique.')
 if (input.review === undefined) return {timeZone,banners}
 if (!input.review || !Number.isInteger(input.review.months) || input.review.months < 1 || input.review.months > 12) throw Error('Review reminders must repeat every 1 to 12 months.')
 localInstant(input.review.start,timeZone)
 return {timeZone,banners,review:{start:input.review.start,months:input.review.months}}
}
const settings = (site?: Site) => site ? normalizeAutomations((site as Site & {automations?:unknown}).automations) : undefined
const trustedTime = (now:number) => { if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(new Date(now).getTime())) throw Error('The scheduler needs a valid trusted event timestamp.'); return now }
async function clock(db:D1Database) { return (await db.prepare('SELECT scheduled_at FROM pane_schedule_clock WHERE id=1').first<{scheduled_at:number}>())?.scheduled_at ?? null }
async function liveRevision(db:D1Database):Promise<Revision|null> {
 const row = await db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1 AND EXISTS(SELECT 1 FROM pane_approvals a WHERE a.revision=r.id)').first<Record<string,string>>()
 return row ? {...row,site:JSON.parse(row.site)} as Revision : null
}
type PublishedPage = ReminderPage & {changedAt:number}
/** Publishing unrelated edits must not make an unchanged page look reviewed. */
async function publishedPages(db:D1Database, live:Revision):Promise<PublishedPage[]> {
 const rows = await db.prepare('SELECT r.site,a.created_at FROM pane_approvals a JOIN pane_revisions r ON r.id=a.revision ORDER BY a.created_at,a.id').all<{site:string;created_at:string}>()
 const previous = new Map<string,string>(), changed = new Map<string,number>()
 for (const row of rows.results) {
  const site:Site = JSON.parse(row.site), present = new Set<string>()
  for (const page of activePages(site)) {
   const id = pageId(page), content = JSON.stringify(page); present.add(id)
   if (previous.get(id) !== content) changed.set(id,Date.parse(row.created_at))
   previous.set(id,content)
  }
  for (const id of previous.keys()) if (!present.has(id)) previous.delete(id)
 }
 return activePages(live.site).map(page => ({id:pageId(page),title:page.title,slug:page.slug,changedAt:changed.get(pageId(page)) ?? Date.parse(live.created_at)}))
}
async function reviews(db:D1Database) {
 const rows = await db.prepare('SELECT page_id,MAX(reviewed_at) reviewed_at FROM pane_page_reviews GROUP BY page_id').all<{page_id:string;reviewed_at:number}>()
 return new Map(rows.results.map(row => [row.page_id,row.reviewed_at]))
}
type Occurrence = {local:string;at:number|null;previous:number|null;error?:string}
function reviewOccurrences(config:Automations, now:number):Occurrence[] {
 if (!config.review) return []
 const result:Occurrence[] = [], {start,months} = config.review, localNow = localAt(now,config.timeZone)
 for (let index=0; ; index++) {
  const local = addMonths(start,index*months)
  if (local > localNow) return result
  try {
   result.push({local,at:localInstant(local,config.timeZone),previous:localInstant(addMonths(start,(index-1)*months),config.timeZone)})
  } catch (error) { result.push({local,at:null,previous:null,error:error instanceof Error ? error.message : String(error)}) }
 }
}
/** Only this trusted-clock path executes schedules; drafts never enter it. */
export async function runSchedules(db:D1Database, scheduledTime:number) {
 const now = trustedTime(scheduledTime), lastTick = await clock(db)
 if (lastTick !== null && now < lastTick) return {lastTick,revision:null,executed:0}
 const live = await liveRevision(db), config = settings(live?.site), revision = live?.id ?? ''
 const runId = `${now}:${revision}`
 // Every mutation rechecks the live pointer and the monotonic clock inside the
 // transaction. A concurrent publish or a late cron cannot restore old state.
 const guard = `EXISTS(SELECT 1 FROM pane_schedule_clock WHERE id=1 AND scheduled_at=?) AND COALESCE((SELECT live FROM pane_state WHERE id=1),'')=?`
 const statements:D1PreparedStatement[] = [
  db.prepare('INSERT INTO pane_schedule_clock(id,scheduled_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET scheduled_at=MAX(scheduled_at,excluded.scheduled_at)').bind(now),
  db.prepare(`INSERT INTO pane_schedule_ticks(id,scheduled_at,revision) SELECT ?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`).bind(runId,now,revision || null,now,revision),
  db.prepare(`DELETE FROM pane_schedule_banners WHERE revision!=? AND ${guard}`).bind(revision,now,revision),
 ]
 const eventIndexes:number[] = []
 const event = (rule:string,kind:string,occurrence:string,at:number|null,data:unknown) => {
  eventIndexes.push(statements.length)
  statements.push(db.prepare(`INSERT INTO pane_schedule_events(id,run_id,revision,rule,kind,occurrence,occurrence_at,time_zone,executed_at,data) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(id) DO NOTHING`)
   .bind(JSON.stringify([revision,rule,kind,occurrence]),runId,revision,rule,kind,occurrence,at,config!.timeZone,now,JSON.stringify(data),now,revision))
 }
 if (config) {
  for (const banner of config.banners) {
   const start = localInstant(banner.start,config.timeZone), end = localInstant(banner.end,config.timeZone), rule = `banner:${banner.id}`
   if (start <= now) event(rule,'banner-start',banner.start,start,{text:banner.text})
   if (end <= now) event(rule,'banner-end',banner.end,end,{text:banner.text})
   statements.push(start <= now && now < end
    ? db.prepare(`INSERT INTO pane_schedule_banners(revision,rule,text) SELECT ?,?,? WHERE ${guard} ON CONFLICT(revision,rule) DO UPDATE SET text=excluded.text`).bind(revision,banner.id,banner.text,now,revision)
    : db.prepare(`DELETE FROM pane_schedule_banners WHERE revision=? AND rule=? AND ${guard}`).bind(revision,banner.id,now,revision))
  }
  if (config.review && live) {
   const [pages,reviewed] = await Promise.all([publishedPages(db,live),reviews(db)])
   for (const occurrence of reviewOccurrences(config,now)) {
    if (occurrence.error) { event('review','review-blocked',occurrence.local,null,{error:occurrence.error}); continue }
    const cutoff = occurrence.previous!
    const stale = pages.filter(page => page.changedAt <= cutoff && (reviewed.get(page.id) ?? -1) <= cutoff)
    event('review','review-reminder',occurrence.local,occurrence.at,{pages:stale.map(({id,title,slug}) => ({id,title,slug}))})
   }
  }
 }
 const results = await db.batch(statements)
 return {lastTick:await clock(db),revision:live?.id ?? null,executed:eventIndexes.reduce((count,index) => count+results[index].meta.changes,0)}
}
/** Caller renders this validated plain text with its normal HTML escaping. */
export async function activeBanners(db:D1Database, liveRevisionId:string):Promise<{id:string;text:string}[]> {
 const rows = await db.prepare('SELECT b.rule id,b.text FROM pane_schedule_banners b JOIN pane_state s ON s.live=b.revision WHERE s.id=1 AND b.revision=? ORDER BY b.rule').bind(liveRevisionId).all<{id:string;text:string}>()
 return rows.results
}
export async function markReviewed(db:D1Database, id:string, actor:string, now:number) {
 trustedTime(now)
 if (!actor || !id) throw Error('A page review needs an authenticated actor and page identity.')
 const live = await liveRevision(db)
 if (!live || !activePages(live.site).some((page:Page) => pageId(page) === id)) throw Error('Only a current published page can be marked reviewed.')
 const at = Math.max(now,(await clock(db)) ?? now)
 await db.prepare('INSERT INTO pane_page_reviews(id,page_id,actor,reviewed_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,actor,at).run()
 return at
}
export async function scheduleOverview(db:D1Database, draft?:Revision|null, suppliedLive?:Revision|null):Promise<ScheduleOverview> {
 const live = suppliedLive === undefined ? await liveRevision(db) : suppliedLive
 const [lastTick,historyRows,banners,reviewed,pages,reminderRows] = await Promise.all([
  clock(db),db.prepare('SELECT * FROM pane_schedule_events ORDER BY executed_at DESC,occurrence_at DESC,id LIMIT 100').all<{id:string;revision:string;rule:string;occurrence:string;kind:string;time_zone:string;executed_at:number;occurrence_at:number;data:string}>(),
  live ? activeBanners(db,live.id) : Promise.resolve([]),reviews(db),live ? publishedPages(db,live) : Promise.resolve([]),
  live ? db.prepare("SELECT id,revision,occurrence,occurrence_at,time_zone,data FROM pane_schedule_events WHERE kind='review-reminder' AND revision=? ORDER BY occurrence_at DESC").bind(live.id).all<ReminderRow>() : Promise.resolve({results:[] as ReminderRow[]}),
 ])
 const config = settings(live?.site), draftConfig = settings(draft?.site), draftDue:string[] = []
 if (draft && draft.id !== live?.id && draftConfig && lastTick !== null) {
  for (const banner of draftConfig.banners) if (localInstant(banner.start,draftConfig.timeZone) <= lastTick) draftDue.push(`${banner.id}: ${banner.text}`)
  if (draftConfig.review && localInstant(draftConfig.review.start,draftConfig.timeZone) <= lastTick) draftDue.push('Page review reminder')
 }
 const posts=await postSchedules(db)
 for(const entry of posts)if(entry.cancelled_at===null&&!entry.approved_by&&entry.executed_at===null&&lastTick!==null&&entry.occurrence_at<=lastTick)draftDue.push('Post: '+(draft?.site.posts?.find(post=>post.id===entry.post_id)?.content.title??entry.post_id))
 const currentPages = new Map(pages.map(page => [page.id,page]))
 const reminders = reminderRows.results.map(row => ({id:row.id,revision:row.revision,occurrence:row.occurrence,timeZone:row.time_zone,
  pages:(JSON.parse(row.data).pages as ReminderPage[]).filter(page => {
   const current = currentPages.get(page.id)
   return current && current.changedAt <= row.occurrence_at && (reviewed.get(page.id) ?? -1) < row.occurrence_at
  }).map(page => { const current = currentPages.get(page.id)!; return {id:current.id,title:current.title,slug:current.slug} }),
 })).filter(reminder => reminder.pages.length)
 return {posts:posts.filter(entry=>entry.cancelled_at===null).map(entry=>({failedAt:entry.failure_at,failureAction:entry.failure_action,id:entry.id,postId:entry.post_id,sourceRevision:entry.source_revision,occurrence:entry.occurrence,timeZone:entry.time_zone,approved:!!entry.approved_by,executedAt:entry.executed_at,end:entry.end_occurrence,expiredAt:entry.expired_at})),lastTick,timeZone:config?.timeZone ?? draftConfig?.timeZone ?? null,activeBanners:banners,draftDue,reminders,
  history:[...posts.filter(entry=>entry.failure_at!==null).map(entry=>({id:entry.id+':failure',revision:entry.source_revision,rule:'post:'+entry.post_id,occurrence:entry.failure_action==='expiry'?entry.end_occurrence!:entry.occurrence,kind:'post-'+entry.failure_action+'-failed',timeZone:entry.time_zone,executedAt:entry.failure_at!,detail:'The scheduled '+entry.failure_action+' was refused. Review the post and blog settings, then cancel or approve a new schedule. Unrelated schedules continue.'})),...posts.filter(entry=>entry.expired_at!==null).map(entry=>({id:entry.id+':expiry',revision:entry.source_revision,rule:'post:'+entry.post_id,occurrence:entry.end_occurrence!,kind:entry.expiry_revision?'post-unpublished':entry.executed_at===null?'post-window-missed':'post-expiry-preserved-newer-version',timeZone:entry.time_zone,executedAt:entry.expired_at!,detail:entry.expiry_revision?'Published revision '+entry.expiry_revision:entry.executed_at===null?'The publication window elapsed without execution.':'A newer post version was retained.'})),...posts.filter(entry=>entry.executed_at!==null).map(entry=>({id:entry.id,revision:entry.source_revision,rule:'post:'+entry.post_id,occurrence:entry.occurrence,kind:'post-published',timeZone:entry.time_zone,executedAt:entry.executed_at!,detail:'Published revision '+entry.result_revision})),...historyRows.results.map(row => ({id:row.id,revision:row.revision,rule:row.rule,occurrence:row.occurrence,kind:row.kind,timeZone:row.time_zone,executedAt:row.executed_at,...(row.kind === 'review-blocked' ? {detail:JSON.parse(row.data).error} : {})}))]}
}
