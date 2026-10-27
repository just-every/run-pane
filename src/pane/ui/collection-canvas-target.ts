import type {Dashboard,Page} from '../model'
import type {CollectionRichText} from '../collection-types'
import {hidden} from './kit'
export type CollectionCanvasTarget={collection:string;item:string;field:string}

export function collectionCanvasTarget(data:Dashboard,target:CollectionCanvasTarget){
 const collection=data.draft?.site.collections?.find(collection=>collection.id===target.collection)
 const item=collection?.items.find(item=>item.id===target.item),field=collection?.fields.find(field=>field.id===target.field)
 if(!collection||!item||field?.type!=='richText')throw Error('Choose a saved item rich description.')
 const rich=item.values[field.id] as CollectionRichText|undefined
 const page:Page={id:'item-'+item.id+'-'+field.id,slug:collection.prefix+'/'+item.slug,title:item.title+' · '+field.label,body:rich?.body??'',sections:rich?.sections}
 return {page,back:'/app/collections?collection='+encodeURIComponent(collection.id)+'&item='+encodeURIComponent(item.id),fields:hidden('collection',collection.id)+hidden('item',item.id)+hidden('field',field.id)}
}
