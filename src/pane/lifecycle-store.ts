import {capabilities} from './roles'
import {DraftConflict,revision,revisionForDraft} from './content'
import {latestContent,PostDenied} from './posts'
import {recordDeletions,restoreTrash,restoreHistorical,trashItems} from './lifecycle'
import type {LifecycleSite,LifecycleTarget,LifecycleTransition} from './lifecycle'
import type {Page,Revision} from './model'

type Actor={id:string;role:string}
const manages=(actor:Actor)=>['owner','admin'].includes(actor.role)
export function lifecycleTarget(input:Record<string,unknown>):LifecycleTarget{
 if(!['page','post'].includes(String(input.kind))||typeof input.id!=='string'||!input.id||input.id.length>240)throw Error('Choose a page or post.')
 return {kind:input.kind as 'page'|'post',id:input.id}
}
async function authorize(db:D1Database,actor:Actor,site:LifecycleSite,target:LifecycleTarget){
 const caps=await capabilities(db,actor)
 if(target.kind==='page'){
  if(!caps.includes('pages:write'))throw new PostDenied('Your role cannot restore pages.')
  const page=site.pages.find(page=>(page.id??page.slug)===target.id)
  if(!page)throw Error('This page is not retained.')
  return page
 }
 const post=site.posts?.find(post=>post.id===target.id)
 if(!caps.includes('posts:write')||!post||!manages(actor)&&post.author!==actor.id)throw new PostDenied('This post is outside your content permissions.')
 return post.content
}
async function current(db:D1Database,base?:unknown){
 const row=await latestContent(db)
 if(!row||base!==undefined&&row.id!==base)throw new DraftConflict(row)
 return row
}
async function person(db:D1Database,id:string){
 const row=await db.prepare('SELECT display_name FROM oa_operators WHERE id=? AND NOT EXISTS(SELECT 1 FROM pane_anonymized_people WHERE id=?)').bind(id,id).first<{display_name:string}>()
 return row?.display_name??'Former person'
}
export async function contentTrash(db:D1Database,actor:Actor,kind?:string){
 const row=await current(db),site=row.site as LifecycleSite,caps=await capabilities(db,actor),rows=[]
 if(kind&&!['page','post'].includes(kind))throw Error('Choose page or post trash.')
 if(kind==='page'&&!caps.includes('pages:write')||kind==='post'&&!caps.includes('posts:write')||!caps.includes('pages:write')&&!caps.includes('posts:write'))throw new PostDenied('Your role cannot read the trash.')
 for(const entry of trashItems(site,new Date().toISOString())){
  if(kind&&entry.kind!==kind)continue
  if(entry.kind==='page'&&!caps.includes('pages:write'))continue
  if(entry.kind==='post'&&(!caps.includes('posts:write')||!manages(actor)&&site.posts?.find(post=>post.id===entry.id)?.author!==actor.id))continue
  const source=await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(entry.sourceRevision).first()
  if(!source)throw Error('The retained deletion source is unavailable.')
  const original=revision(source).site as LifecycleSite,page=entry.kind==='page'?original.pages.find(page=>(page.id??page.slug)===entry.id):original.posts?.find(post=>post.id===entry.id)?.content
  if(!page)throw Error('The retained deletion source does not contain this item.')
  rows.push({kind:entry.kind,id:entry.id,title:page.title,deleted_at:entry.deletedAt,actor:await person(db,entry.actor),expires_at:new Date(Date.parse(entry.deletedAt)+30*86400000).toISOString()})
 }
 return {base:row.id,rows}
}
export async function contentHistory(db:D1Database,actor:Actor,input:Record<string,unknown>){
 const target=lifecycleTarget(input),row=await current(db),page=await authorize(db,actor,row.site,target)
 const cursor=typeof input.before==='string'?input.before.split('|'):undefined
 if(cursor&&(cursor.length!==2||!Number.isFinite(Date.parse(cursor[0]))||!cursor[1]))throw Error('Choose a retained history page.')
 const field=target.kind==='page'?'pages':'posts',identity=target.kind==='page'?"COALESCE(json_extract(j.value,'$.id'),json_extract(j.value,'$.slug'))":"json_extract(j.value,'$.id')"
 const history=await db.prepare(`SELECT r.id,r.actor,r.created_at,j.value AS item,
  EXISTS(SELECT 1 FROM pane_approvals a WHERE a.revision=r.id) AS published
  FROM pane_revisions r JOIN json_each(r.site,'$.${field}') j
  WHERE ${identity}=? AND (? IS NULL OR r.created_at<? OR (r.created_at=? AND r.id<?))
  ORDER BY r.created_at DESC,r.id DESC LIMIT 21`).bind(target.id,cursor?.[0]??null,cursor?.[0]??null,cursor?.[0]??null,cursor?.[1]??null).all<{id:string;actor:string;created_at:string;item:string;published:number}>()
 const approvedPages=target.kind==='page'?(await db.prepare(`SELECT DISTINCT j.value AS item FROM pane_revisions r JOIN pane_approvals a ON a.revision=r.id JOIN json_each(r.site,'$.pages') j WHERE COALESCE(json_extract(j.value,'$.id'),json_extract(j.value,'$.slug'))=?`).bind(target.id).all<{item:string}>()).results.map(row=>row.item):[]
 const approved=target.kind==='post'?(await db.prepare(`SELECT DISTINCT json_extract(j.value,'$.sourceReview') AS review FROM pane_revisions r JOIN pane_approvals a ON a.revision=r.id JOIN json_each(r.site,'$.blogPosts') j WHERE json_extract(j.value,'$.id')=?`).bind(target.id).all<{review:string}>()).results.map(row=>row.review):[]
 const seen=new Set<string>(),rows=[]
 for(const version of history.results.slice(0,20)){
  const item=JSON.parse(version.item),content:Page=target.kind==='page'?item:item.content
  if(target.kind==='post'&&item.author!==row.site.posts?.find(post=>post.id===target.id)?.author||item.deleted||seen.has(version.item))continue
  seen.add(version.item)
  rows.push({revision:version.id,title:content.title,body:content.body,created_at:version.created_at,actor:await person(db,version.actor),state:(target.kind==='page'?version.published||approvedPages.includes(version.item):approved.includes(item.review))?'published' as const:'draft' as const})
 }
 const last=history.results[19]
 return {base:row.id,target:{...target,title:page.title},rows,...(history.results.length>20&&last?{next:last.created_at+'|'+last.id}:{})}
}
/** The conditional revision and metadata entries succeed together or leave no trace. */
async function persist(db:D1Database,actor:Actor,base:Revision,transition:LifecycleTransition){
 const created_at=new Date(Math.max(Date.now(),Date.parse(base.created_at)+1)).toISOString()
 const value={...transition.site,blogPosts:transition.site.blogPosts?.filter(post=>!transition.site.postDeletions?.includes(post.id))}
 const row=await revisionForDraft(db,actor.id,value,created_at)
 const results=await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?`).bind(row.id,JSON.stringify(row.site),row.hash,row.actor,row.created_at,base.id),
  ...transition.events.map(event=>db.prepare(`INSERT INTO pane_activity(actor,action,subject,created_at,details) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(actor.id,event.action,event.kind+':'+event.id,event.at,JSON.stringify({kind:event.kind,id:event.id,...(event.sourceRevision?{sourceRevision:event.sourceRevision}:{}),...(event.sourceDeletion?{sourceDeletion:event.sourceDeletion}:{}),...(event.requiresCodeApproval?{requiresCodeApproval:true}:{})}),row.id)),
 ])
 if(!results[0].meta.changes)throw new DraftConflict(await latestContent(db))
 return row
}
export async function deleteContent(db:D1Database,actor:Actor,input:Record<string,unknown>){
 const target=lifecycleTarget(input),base=await current(db,input.base),site=structuredClone(base.site) as LifecycleSite
 await authorize(db,actor,site,target)
 if(target.kind==='page'){
  const page=site.pages.find(page=>(page.id??page.slug)===target.id)!
  if(page.deleted)throw Error('This page is already in the trash.')
  page.deleted=true
 }else{
  const post=site.posts!.find(post=>post.id===target.id)!
  if(post.deleted)throw Error('This post is already in the trash.')
  post.deleted=true
 }
 const transition=recordDeletions(base.site,site,{actor:actor.id,at:new Date().toISOString(),sourceRevision:base.id})
 return persist(db,actor,base,transition)
}
export async function restoreContent(db:D1Database,actor:Actor,input:Record<string,unknown>){
 const target=lifecycleTarget(input),base=await current(db,input.base),site=base.site as LifecycleSite
 await authorize(db,actor,site,target)
 const at=new Date().toISOString(),historical=typeof input.revision==='string'&&!!input.revision
 const entry=historical?undefined:trashItems(site,at).filter(entry=>entry.kind===target.kind&&entry.id===target.id).at(-1)
 if(!historical&&!entry)throw Error('This item is no longer available in the trash.')
 const id=historical?String(input.revision):entry!.sourceRevision,source=await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
 if(!source)throw Error('Choose a retained source revision.')
 const original=revision(source).site as LifecycleSite
 if(target.kind==='post'&&original.posts?.find(post=>post.id===target.id)?.author!==site.posts?.find(post=>post.id===target.id)?.author)throw new PostDenied('Historical content cannot change post ownership.')
 const ctx={actor:actor.id,at},transition=historical?restoreHistorical(site,original,{...target,revision:id},ctx):restoreTrash(site,original,target,ctx)
 return persist(db,actor,base,transition)
}
