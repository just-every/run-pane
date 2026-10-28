import {collectionStarters} from './collection-starters'
import {DraftConflict,prepare,revision,normalizeSite,contentHash} from './content'
import {latestContent,PostDenied} from './posts'
import {normalizeCollections,upsertCollection,upsertCollectionItem,upsertCollectionTemplate} from './collections'
import {collectionId} from './collection-values'
import {normalizeSections,sectionText} from './sections'
import {normalizeMedia} from './gallery'
import {postFiles} from './library-files'
import {missingBodyLinks,bodyLinkResolver} from './post-links'
import {requireImageDescriptions} from './accessibility'
import {restoredRedirects,restorePublishedItemMenu} from './lifecycle-publication'
import type {Collection,CollectionRichText} from './collection-types'
import type {ImageContent} from './images'
import type {Page,Revision} from './model'

async function current(db:D1Database,base:unknown){const row=await latestContent(db);if(!row||typeof base!=='string'||row.id!==base)throw new DraftConflict(row);return row}
export function collectionTarget(collections:Collection[]|undefined,collection:unknown,id?:unknown){
 const selected=collections?.find(candidate=>candidate.id===collectionId(collection))
 if(!selected)throw Error('Choose an existing collection.')
 const item=id===undefined?undefined:selected.items.find(item=>item.id===collectionId(id))
 if(id!==undefined&&!item)throw Error('Choose an existing collection item.')
 return {collection:selected,item}
}
export async function saveCollectionSchema(db:D1Database,actor:string,input:Record<string,unknown>){
 const row=await current(db,input.base),collections=upsertCollection(row.site.collections,{id:input.id,title:input.title,prefix:input.prefix,fields:input.fields,template:row.site.collections?.find(collection=>collection.id===input.id)?.template})
 return prepare(db,actor,{...row.site,collections},row.id)
}
export async function saveCollectionTemplate(db:D1Database,actor:string,input:Record<string,unknown>){
 const row=await current(db,input.base),collections=upsertCollectionTemplate(row.site.collections,collectionId(input.collection),input.template)
 return prepare(db,actor,{...row.site,collections},row.id)
}
export async function saveCollectionItem(db:D1Database,actor:string,input:Record<string,unknown>){
 const row=await current(db,input.base),collections=upsertCollectionItem(row.site.collections,collectionId(input.collection),{id:input.id,slug:input.slug,title:input.title,values:input.values})
 return prepare(db,actor,{...row.site,collections},row.id)
}
export async function saveCollectionBody(db:D1Database,actor:string,input:Record<string,unknown>){
 const row=await current(db,input.base),{collection,item}=collectionTarget(row.site.collections,input.collection,input.item??input.id),field=collection.fields.find(field=>field.id===input.field)
 if(!item||field?.type!=='richText')throw Error('Choose a rich description field on an existing item.')
 const sections=normalizeSections(input.sections);if(!sections)throw Error('Provide the description sections.')
 const collections=upsertCollectionItem(row.site.collections,collection.id,{...item,values:{...item.values,[field.id]:{body:sectionText(sections),sections}}})
 const media=input.media===undefined?row.site.media:normalizeMedia(input.media)
 return prepare(db,actor,{...row.site,collections,...(media===undefined?{}:{media})},row.id)
}
export async function addStarterCollections(db:D1Database,actor:string,base:unknown){
 const row=await current(db,base)
 const collections=normalizeCollections(collectionStarters(row.site.collections,(row.site.blogs??[]).map(blog=>blog.prefix)))
 return prepare(db,actor,{...row.site,collections},row.id)
}

/** Only an exact active native-owner approval can adopt this item and schema. */
export async function publishCollectionItem(db:D1Database,actorId:string,input:{base:string;collection:string;id:string},execution?:{source?:Revision;preview?:boolean;schedule?:{id:string;now:number}}):Promise<Revision>{
 if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actorId).first())throw new PostDenied('Only the native owner can publish a collection item.')
 const [draft,liveRow]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()])
 if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 if(!liveRow)throw Error('Publish the initial site before approving individual items.')
 const source=execution?.source??draft
 if(await db.prepare('SELECT 1 FROM pane_revoked_revisions WHERE revision=?').bind(source.id).first())throw Error('The approved item source was revoked.')
 const live=revision(liveRow),target=collectionTarget(source.site.collections,input.collection,input.id),collection=target.collection,item=structuredClone(target.item!)
 const previous=live.site.collections?.find(candidate=>candidate.id===collection.id)
 if(previous&&previous.prefix!==collection.prefix)throw Error('Publish collection URL changes with the whole site.')
 if(previous&&JSON.stringify(previous.fields)!==JSON.stringify(collection.fields))throw Error('Publish shared collection schema changes with the whole site.')
 if(JSON.stringify(previous?.template)!==JSON.stringify(collection.template))throw Error('Publish shared collection template changes with whole-site approval from Pages.')
 const previousItem=previous?.items.find(candidate=>candidate.id===item.id)
 if(previousItem&&previousItem.slug!==item.slug)throw Error('Publish item URL changes with the whole site and reviewed redirects.')
 const media=[...(live.site.media??[])],fileIds=new Set<string>(),copies=new Map<string,string>()
 const pages:Page[]=[]
 for(const field of collection.fields){
  const value=item.values[field.id]
  if(field.type==='image'&&value){const image=value as ImageContent;if(!image.decorative&&!image.alt?.trim())throw Error('Add alternative text or mark the item image decorative before publishing.')}
  if(field.type==='link'&&typeof value==='string'&&value.startsWith('file:'))fileIds.add(value.slice(5))
  if(field.type!=='richText'||!value)continue
  const rich=value as CollectionRichText,page={slug:item.slug,title:item.title,body:rich.body,sections:rich.sections}
  for(const file of postFiles(source.site,page))fileIds.add(file.id)
  for(const section of rich.sections??[])for(const block of section.blocks)for(const image of block.gallery?.items??[]){
   let id=copies.get(image.asset)
   if(!id){const assetSource=source.site.media?.find(asset=>asset.id===image.asset);if(!assetSource)throw Error('A description gallery image is missing.');id=crypto.randomUUID();copies.set(image.asset,id);media.push({...structuredClone(assetSource),id})}
   image.asset=id
  }
  pages.push(page)
 }
 const files=[...(live.site.libraryFiles??[])]
 for(const id of fileIds){const file=source.site.libraryFiles?.find(file=>file.id===id);if(!file)throw Error('A linked PDF is missing.');const approved=files.find(candidate=>candidate.id===id);if(approved&&JSON.stringify(approved)!==JSON.stringify(file))throw Error('Publish shared PDF changes with the whole site.');if(!approved)files.push(file)}
 const approvedCollection={...structuredClone(collection),items:previous?[...previous.items.filter(candidate=>candidate.id!==item.id),item]:[item]}
 const collections=normalizeCollections(previous?(live.site.collections??[]).map(candidate=>candidate.id===collection.id?approvedCollection:candidate):[...(live.site.collections??[]),approvedCollection])
 const path='/site/'+collection.prefix+'/'+item.slug,{posts:privatePosts,...publicSite}=live.site
 const selected={...publicSite,collections,media,libraryFiles:files,redirects:restoredRedirects(source.site,live.site,'item',item.id,path,collection.id)}
 restorePublishedItemMenu(source.site,selected,item.id,path,collection.id)
 const site=normalizeSite(selected)
 for(const page of pages){const missing=missingBodyLinks(site,page);if(missing.length)throw Error('Review deleted or unpublished description links before publishing.');requireImageDescriptions({...site,pages:[page]})}
 for(const field of collection.fields)if(field.type==='link'&&item.values[field.id]&&!bodyLinkResolver(site,'live',item.slug)(String(item.values[field.id])))throw Error('Review the item link destination before publishing.')
 const at=Math.max(execution?.schedule?.now??Date.now(),Date.parse(draft.created_at)+1),created_at=new Date(at).toISOString()
 const published:Revision={id:crypto.randomUUID(),site,actor:actorId,hash:await contentHash(site),created_at}
 if(execution?.preview)return published
 const known=new Set((draft.site.media??[]).map(asset=>asset.id)),retainedSite=normalizeSite({...draft.site,media:[...(draft.site.media??[]),...media.filter(asset=>!known.has(asset.id))]})
 const retained:Revision={id:crypto.randomUUID(),site:retainedSite,actor:actorId,hash:await contentHash(retainedSite),created_at:new Date(at+1).toISOString()}
 const present='EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)'
 const result=await db.batch([
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND (SELECT live FROM pane_state WHERE id=1)=? AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active') AND NOT EXISTS(SELECT 1 FROM pane_revoked_revisions WHERE revision=?) AND (? IS NULL OR EXISTS(SELECT 1 FROM pane_item_schedules WHERE id=? AND actor=? AND executed_at IS NULL AND cancelled_at IS NULL))`).bind(published.id,JSON.stringify(site),published.hash,actorId,created_at,input.base,live.id,actorId,source.id,execution?.schedule?.id??null,execution?.schedule?.id??null,actorId),
  db.prepare(`UPDATE pane_state SET live=? WHERE id=1 AND ${present}`).bind(published.id,published.id),
  db.prepare(`INSERT INTO pane_approvals(id,action,revision,actor,created_at) SELECT ?,'publish',?,?,? WHERE ${present}`).bind(crypto.randomUUID(),published.id,actorId,created_at,published.id),
  db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE ${present}`).bind(retained.id,JSON.stringify(retainedSite),retained.hash,actorId,retained.created_at,published.id),
  ...(execution?.schedule?[db.prepare(`UPDATE pane_item_schedules SET executed_at=?,result_revision=? WHERE id=? AND ${present}`).bind(execution.schedule.now,published.id,execution.schedule.id,published.id)]:[db.prepare(`UPDATE pane_item_schedules SET cancelled_at=? WHERE collection_id=? AND item_id=? AND cancelled_at IS NULL AND expired_at IS NULL AND ${present}`).bind(at,collection.id,item.id,published.id)]),
  db.prepare(`INSERT INTO pane_activity(actor,action,subject,created_at,details) SELECT ?,'collection.item.publish',?,?,? WHERE ${present}`).bind(actorId,'item:'+collection.id+':'+item.id,created_at,JSON.stringify({kind:'item',collection:collection.id,id:item.id,revision:published.id}),published.id),
 ])
 if(!result[0].meta.changes){if(!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actorId).first())throw new PostDenied('Only the active native owner can publish an item.');throw new DraftConflict(await latestContent(db))}
 return published
}
