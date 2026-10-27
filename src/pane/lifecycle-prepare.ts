import {recordDeletions,restoreTrash,trashItems} from './lifecycle'
import {revision} from './content'
import type {LifecycleSite,LifecycleEvent,LifecycleTransition} from './lifecycle'
import type {Revision} from './model'

/** Ordinary organizer saves inherit the same trash boundary as focused routes. */
export async function prepareLifecycle(db:D1Database,before:Revision|null,after:LifecycleSite,actor:string,at:string):Promise<LifecycleTransition>{
 if(!before){if(after.trash?.length||after.postDeletions?.length)throw Error('New content cannot supply retained deletion metadata.');return {site:after,events:[]}}
 const prior=before.site as LifecycleSite,ctx={actor,at},transition=recordDeletions(prior,after,{...ctx,sourceRevision:before.id})
 for(const entry of transition.site.trash??[]){const chosen=after.redirects?.find(redirect=>redirect.from===entry.path);if(!entry.restoredAt&&chosen&&!prior.redirects?.some(redirect=>redirect.from===entry.path))entry.deletionTarget=chosen.to}
 for(const page of prior.pages.filter(page=>page.deleted)){
  const id=page.id??page.slug,target=transition.site.pages.find(page=>(page.id??page.slug)===id)
  if(!target||target.deleted)continue
  // The explicit source is read from retained server metadata, never caller fields.
  const entry=trashItems(prior,at).filter(entry=>entry.kind==='page'&&entry.id===id).at(-1)
  if(!entry)throw Error('This item is no longer available in the trash.')
  const source=await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(entry.sourceRevision).first()
  if(!source)throw Error('The retained deletion source is unavailable.')
  target.deleted=true
  const restored=restoreTrash(transition.site,revision(source).site,{kind:'page',id},ctx)
  transition.site=restored.site;transition.events.push(...restored.events)
 }
 // Removing a post is a pending draft change; no approved live snapshot changes here.
 transition.site.blogPosts=transition.site.blogPosts?.filter(post=>!transition.site.postDeletions?.includes(post.id))
 return transition
}
export function lifecycleAuditStatements(db:D1Database,actor:string,revisionId:string,events:LifecycleEvent[]){
 return events.map(event=>db.prepare(`INSERT INTO pane_activity(actor,action,subject,created_at,details)
  SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(actor,event.action,event.kind+':'+event.id,event.at,JSON.stringify({kind:event.kind,id:event.id,...(event.sourceRevision?{sourceRevision:event.sourceRevision}:{}),...(event.sourceDeletion?{sourceDeletion:event.sourceDeletion}:{}),...(event.requiresCodeApproval?{requiresCodeApproval:true}:{})}),revisionId))
}
