import {revision} from './content'
import type {LifecycleSite,LifecycleTarget} from './lifecycle'

type ItemTarget=Extract<LifecycleTarget,{kind:'item'}>
/** An item can be absent from the latest collection while its history remains. */
export async function retainedLifecycleItem(db:D1Database,site:LifecycleSite,target:ItemTarget){
 const collection=site.collections?.find(collection=>collection.id===target.collection)
 if(!collection)throw Error('The parent collection is unavailable.')
 const current=collection.items.find(item=>item.id===target.id)
 if(current)return current
 const entry=site.trash?.filter(entry=>entry.kind==='item'&&entry.collection===target.collection&&entry.id===target.id).at(-1)
 if(!entry)throw Error('This collection item is not retained.')
 const row=await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(entry.sourceRevision).first()
 const item=row?(revision(row).site as LifecycleSite).collections?.find(collection=>collection.id===target.collection)?.items.find(item=>item.id===target.id):undefined
 if(!item)throw Error('The retained source item is unavailable.')
 return item
}
/** Read versions through the native revision table, scoped to both identities. */
export async function collectionItemHistory(db:D1Database,target:ItemTarget,cursor:string[]|undefined,person:(id:string)=>Promise<string>){
 const history=await db.prepare(`SELECT r.id,r.actor,r.created_at,j.value AS item,c.value AS collection,
  EXISTS(SELECT 1 FROM pane_approvals a WHERE a.revision=r.id) AS published
  FROM pane_revisions r JOIN json_each(r.site,'$.collections') c JOIN json_each(c.value,'$.items') j
  WHERE json_extract(c.value,'$.id')=? AND json_extract(j.value,'$.id')=?
  AND (? IS NULL OR r.created_at<? OR (r.created_at=? AND r.id<?))
  ORDER BY r.created_at DESC,r.id DESC LIMIT 21`).bind(target.collection,target.id,cursor?.[0]??null,cursor?.[0]??null,cursor?.[0]??null,cursor?.[1]??null).all<{id:string;actor:string;created_at:string;item:string;collection:string;published:number}>()
 const approved=(await db.prepare(`SELECT DISTINCT j.value AS item FROM pane_revisions r JOIN pane_approvals a ON a.revision=r.id JOIN json_each(r.site,'$.collections') c JOIN json_each(c.value,'$.items') j WHERE json_extract(c.value,'$.id')=? AND json_extract(j.value,'$.id')=?`).bind(target.collection,target.id).all<{item:string}>()).results.map(row=>row.item)
 const seen=new Set<string>(),rows=[]
 for(const version of history.results.slice(0,20)){
  if(seen.has(version.item))continue
  seen.add(version.item)
  const item=JSON.parse(version.item),collection=JSON.parse(version.collection)
  const body=collection.fields.flatMap((field:{id:string;label:string})=>{
   const value=item.values[field.id],text=typeof value==='string'||typeof value==='number'?String(value):value&&typeof value==='object'&&typeof value.body==='string'?value.body:''
   return text?[field.label+': '+text]:[]
  }).join('\n\n')
  rows.push({revision:version.id,title:String(item.title),body,created_at:version.created_at,actor:await person(version.actor),state:version.published||approved.includes(version.item)?'published' as const:'draft' as const})
 }
 const last=history.results[19]
 return {rows,...(history.results.length>20&&last?{next:last.created_at+'|'+last.id}:{})}
}
