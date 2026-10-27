import {upsertCollectionItem} from './collections'
import type {Collection,CollectionItem} from './collection-types'
import type {LifecycleSite,LifecycleTarget} from './lifecycle-types'

export const lifecycleItemPath=(collection:Collection,item:CollectionItem)=>'/site/'+collection.prefix+'/'+item.slug
/** Restore only a selected value record; schemas and other items stay current. */
export function restoreItemVersion(site:LifecycleSite,source:LifecycleSite,target:Extract<LifecycleTarget,{kind:'item'}>):string{
 const original=source.collections?.find(collection=>collection.id===target.collection),current=site.collections?.find(collection=>collection.id===target.collection)
 const item=original?.items.find(item=>item.id===target.id)
 if(!original||!current||!item)throw Error('The parent collection or retained item is unavailable.')
 if(original.prefix!==current.prefix)throw Error('The original collection prefix is unavailable; review it before restoring.')
 for(const field of original.fields)if(Object.hasOwn(item.values,field.id)){
  const latest=current.fields.find(candidate=>candidate.id===field.id)
  if(!latest||latest.type!==field.type||latest.reference!==field.reference)throw Error('The current collection schema is incompatible with this version.')
 }
 const items=current.items,existing=items.some(candidate=>candidate.id===item.id)
 site.collections=upsertCollectionItem(site.collections,current.id,item)
 if(!existing){
  const restored=site.collections.find(collection=>collection.id===current.id)!,index=original.items.findIndex(candidate=>candidate.id===item.id)
  const next=original.items.slice(index+1).find(candidate=>items.some(saved=>saved.id===candidate.id))
  if(next){
   const saved=restored.items.pop()!,position=restored.items.findIndex(candidate=>candidate.id===next.id)
   restored.items.splice(position,0,saved)
  }
 }
 return lifecycleItemPath(original,item)
}
