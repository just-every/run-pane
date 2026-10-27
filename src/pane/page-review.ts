import {PostDenied} from './posts'
import {requireImageDescriptions} from './accessibility'
import type { Dashboard, Revision, Site } from './model'
import { activePages, pageId } from './pages'
import { contentHash, DraftConflict, revision, revisionStatement, approvalStatements, normalizeSite } from './content'
export type PageRequest = {id:string;page_id:string;revision:string;actor:string;created_at:string}
export async function requestPageReview(db:D1Database,actor:string,base:string,id:string) {
 const row=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
 if(!row || row.id!==base)throw new DraftConflict(row?revision(row):null)
 if(!activePages(revision(row).site).some(page=>pageId(page)===id))throw Error('Choose an active draft page.')
 const request={id:crypto.randomUUID(),page_id:id,revision:base,actor,created_at:new Date().toISOString()}
 const saved=await db.prepare(`INSERT INTO pane_page_requests(id,page_id,revision,actor,created_at) SELECT ?,?,?,?,?
  WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?`).bind(request.id,id,base,actor,request.created_at,base).run()
 if(!saved.meta.changes){const current=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first();throw new DraftConflict(current?revision(current):null)}
 return request
}
export function pageStatus(data:Dashboard,id:string):'Published'|'Needs review'|'Draft' {
 const page=data.draft?.site.pages.find(page=>pageId(page)===id),live=data.live?.site.pages.find(page=>pageId(page)===id)
 if(page&&JSON.stringify(page)===JSON.stringify(live))return 'Published'
 const requested=data.pageRequests?.some(request=>request.page_id===id&&data.revisions.find(revision=>revision.id===request.revision)?.site.pages.some(candidate=>pageId(candidate)===id&&JSON.stringify(candidate)===JSON.stringify(page)))
 return requested?'Needs review':'Draft'
}
/** A selected approval starts from live content, retaining all unrelated drafts. */
export async function publishPage(db:D1Database,actor:string,base:string,id:string,requestId:string, execution?:{source?:Revision;preview?:boolean;schedule?:{id:string;now:number}}) {
 if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor).first())throw new PostDenied('Only the active native owner can publish pages.')
 const [latest,liveRow,request]=await Promise.all([
  db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_page_requests q ON q.revision=r.id WHERE q.id=? AND q.page_id=?').bind(requestId,id).first(),
 ])
 if(!latest || latest.id!==base)throw new DraftConflict(latest?revision(latest):null)
 if(!liveRow)throw Error('Publish the initial site before approving individual pages.')
 const draft=revision(latest),source=execution?.source??draft,live=revision(liveRow),page=source.site.pages.find(page=>pageId(page)===id)
 const reviewed=request?revision(request).site.pages.find(candidate=>pageId(candidate)===id):undefined
 if(!page || page.deleted || !reviewed || JSON.stringify(page)!==JSON.stringify(reviewed))throw Error('Request review again after changing this page.')
 if(JSON.stringify(source.site.media??null)!==JSON.stringify(live.site.media??null))throw Error('Publish shared image library changes with the whole site.')
 if(JSON.stringify(source.site.components??null)!==JSON.stringify(live.site.components??null)||JSON.stringify(source.site.customCode??null)!==JSON.stringify(live.site.customCode??null))throw Error('Publish shared component or custom code changes with the whole site.')
 const previous=live.site.pages.find(candidate=>pageId(candidate)===id)
 // Shared organization stays a separate explicit whole-site approval.
 if(previous && page.slug!==previous.slug)throw Error('Publish URL changes with the site organization and reviewed redirects.')
 const pages=previous?live.site.pages.map(candidate=>pageId(candidate)===id?page:candidate):[...live.site.pages,page]
 const site:Site=normalizeSite({...live.site,pages})
 requireImageDescriptions(site)
 const at=Math.max(execution?.schedule?.now??Date.now(),Date.parse(draft.created_at)+1)
 const published:Revision={id:crypto.randomUUID(),site,actor,hash:await contentHash(site),created_at:new Date(at).toISOString()}
 if(execution?.preview)return published
 const retained:Revision={...draft,id:crypto.randomUUID(),created_at:new Date(at+1).toISOString()}
 try {
  await db.batch([
   db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
    WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?
    AND (SELECT live FROM pane_state WHERE id=1)=?
    AND (? IS NULL OR EXISTS(SELECT 1 FROM pane_page_schedules WHERE id=? AND approved_by=? AND executed_at IS NULL AND cancelled_at IS NULL))`).bind(published.id,JSON.stringify(site),published.hash,actor,published.created_at,base,live.id,execution?.schedule?.id??null,execution?.schedule?.id??null,actor),
   ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor,created_at:published.created_at}),
   revisionStatement(db,retained),
   ...(execution?.schedule?[db.prepare('UPDATE pane_page_schedules SET executed_at=?,result_revision=? WHERE id=?').bind(execution.schedule.now,published.id,execution.schedule.id)]:[db.prepare('UPDATE pane_page_schedules SET cancelled_at=? WHERE page_id=? AND expired_at IS NULL AND cancelled_at IS NULL').bind(at,id)]),
  ])
 }catch(error){
  const current=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
  if(current?.id!==base)throw new DraftConflict(current?revision(current):null)
  throw error
 }
 return published
}
