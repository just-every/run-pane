import {restoredRedirects,restorePublishedMenu} from './lifecycle-publication'
import {requireImageDescriptions} from './accessibility'
import type { Dashboard, Revision, Site } from './model'
import { activePages, pageId, pagePath } from './pages'
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
export async function publishPage(db:D1Database,actor:string,base:string,id:string,requestId:string) {
 const [latest,liveRow,request]=await Promise.all([
  db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_page_requests q ON q.revision=r.id WHERE q.id=? AND q.page_id=?').bind(requestId,id).first(),
 ])
 if(!latest || latest.id!==base)throw new DraftConflict(latest?revision(latest):null)
 if(!liveRow)throw Error('Publish the initial site before approving individual pages.')
 const draft=revision(latest),live=revision(liveRow),page=draft.site.pages.find(page=>pageId(page)===id)
 const reviewed=request?revision(request).site.pages.find(candidate=>pageId(candidate)===id):undefined
 if(!page || page.deleted || !reviewed || JSON.stringify(page)!==JSON.stringify(reviewed))throw Error('Request review again after changing this page.')
 if(JSON.stringify(draft.site.media??null)!==JSON.stringify(live.site.media??null))throw Error('Publish shared image library changes with the whole site.')
 if(JSON.stringify(draft.site.components??null)!==JSON.stringify(live.site.components??null)||JSON.stringify(draft.site.customCode??null)!==JSON.stringify(live.site.customCode??null))throw Error('Publish shared component or custom code changes with the whole site.')
 const previous=live.site.pages.find(candidate=>pageId(candidate)===id)
 // Shared organization stays a separate explicit whole-site approval.
 if(previous && page.slug!==previous.slug)throw Error('Publish URL changes with the site organization and reviewed redirects.')
 const pages=previous?live.site.pages.map(candidate=>pageId(candidate)===id?page:candidate):[...live.site.pages,page]
 const selected:Site={...structuredClone(live.site),pages,redirects:restoredRedirects(draft.site,live.site,'page',id,pagePath(draft.site,page.slug))}
 restorePublishedMenu(draft.site,selected,id,pagePath(draft.site,page.slug))
 const site:Site=normalizeSite(selected)
 requireImageDescriptions(site)
 const at=Math.max(Date.now(),Date.parse(draft.created_at)+1)
 const published:Revision={id:crypto.randomUUID(),site,actor,hash:await contentHash(site),created_at:new Date(at).toISOString()}
 const retained:Revision={...draft,id:crypto.randomUUID(),created_at:new Date(at+1).toISOString()}
 try {
  await db.batch([
   db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
    WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?
    AND (SELECT live FROM pane_state WHERE id=1)=?`).bind(published.id,JSON.stringify(site),published.hash,actor,published.created_at,base,live.id),
   ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor,created_at:published.created_at}),
   revisionStatement(db,retained),
  ])
 }catch(error){
  const current=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
  if(current?.id!==base)throw new DraftConflict(current?revision(current):null)
  throw error
 }
 return published
}
