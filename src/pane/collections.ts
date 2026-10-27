import {normalizeCollectionTemplate,validateTemplateItem} from './collection-template'
import {cleanSlug} from './pages'
import {collectionId,collectionKeys,collectionObject,collectionText,normalizeCollectionValue} from './collection-values'
import type {Collection,CollectionField,CollectionFieldType,CollectionItem,CollectionSchema} from './collection-types'
export type {Collection,CollectionField,CollectionFieldType,CollectionItem,CollectionRichText,CollectionSchema,CollectionTemplate} from './collection-types'

const fieldTypes:readonly CollectionFieldType[]=['text','richText','image','number','price','date','link','reference','option']
function fields(value:unknown):CollectionField[]{
 if(!Array.isArray(value)||value.length>50)throw Error('Provide at most 50 fields per collection.')
 const ids=new Set<string>()
 return value.map(raw=>{
  const field=collectionObject(raw,'a collection field')
  collectionKeys(field,['id','label','type','required','help','options','reference'],'collection schema')
  const id=collectionId(field.id),label=collectionText(field.label,'Field label',120)
  if(ids.has(id))throw Error('Each collection field needs a unique identity.')
  ids.add(id)
  if(!fieldTypes.includes(field.type as CollectionFieldType))throw Error('Choose a supported collection field type.')
  const type=field.type as CollectionFieldType
  if(field.required!==undefined&&typeof field.required!=='boolean')throw Error('Choose whether the field is required.')
  const help=field.help===undefined?undefined:collectionText(field.help,'Field help',1000,true)
  let options:string[]|undefined,reference:string|undefined
  if(type==='option'){
   if(!Array.isArray(field.options)||!field.options.length||field.options.length>100)throw Error('An option field needs from 1 to 100 choices.')
   options=field.options.map(option=>collectionText(option,'Option',120))
   if(new Set(options).size!==options.length)throw Error('Option choices must be unique.')
  }else if(field.options!==undefined)throw Error('Only option fields accept choices.')
  if(type==='reference')reference=collectionId(field.reference)
  else if(field.reference!==undefined)throw Error('Only reference fields accept a target collection.')
  return {id,label,type,...(field.required===undefined?{}:{required:field.required}),...(help===undefined?{}:{help}),...(options?{options}:{}),...(reference?{reference}:{})} as CollectionField
 })
}
function schema(value:unknown):CollectionSchema{
 const input=collectionObject(value,'a collection schema')
 collectionKeys(input,['id','prefix','title','fields','template'],'collection schema')
 const normalizedFields=fields(input.fields),template=normalizeCollectionTemplate(input.template,normalizedFields)
 return {id:collectionId(input.id),prefix:cleanSlug(input.prefix),title:collectionText(input.title,'Collection title',120),fields:normalizedFields,...(template?{template}:{})}
}
function item(value:unknown,schema:CollectionSchema):CollectionItem{
 const input=collectionObject(value,'a collection item')
 collectionKeys(input,['id','slug','title','values'],'collection item')
 const source=collectionObject(input.values,'collection item values'),values:Record<string,unknown>={}
 const allowed=schema.fields.map(field=>field.id)
 collectionKeys(source,allowed,'collection item value')
 for(const field of schema.fields){
  const value=normalizeCollectionValue(field,Object.hasOwn(source,field.id)?source[field.id]:undefined)
  if(value!==undefined)values[field.id]=value
 }
 const normalized={id:collectionId(input.id),slug:cleanSlug(input.slug),title:collectionText(input.title,'Item title',120),values}
 validateTemplateItem(schema,normalized)
 return normalized
}
/** Validate schemas first, then references against the complete normalized set. */
export function normalizeCollections(value:unknown):Collection[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>100)throw Error('Provide at most 100 collections.')
 if(JSON.stringify(value).length>1750000)throw Error('Collections exceed the draft content budget.')
 const ids=new Set<string>(),prefixes=new Set<string>();let count=0
 const collections:Collection[]=value.map(raw=>{
  const input=collectionObject(raw,'a collection')
  collectionKeys(input,['id','prefix','title','fields','items','template'],'collection')
  const normalized=schema({id:input.id,prefix:input.prefix,title:input.title,fields:input.fields,template:input.template})
  if(ids.has(normalized.id)||prefixes.has(normalized.prefix))throw Error('Each collection needs a unique identity and URL prefix.')
  ids.add(normalized.id);prefixes.add(normalized.prefix)
  if(!Array.isArray(input.items)||input.items.length>1000||(count+=input.items.length)>5000)throw Error('Provide at most 1000 items per collection and 5000 overall.')
  const itemIds=new Set<string>(),slugs=new Set<string>()
  const items=input.items.map(raw=>{
   const normalizedItem=item(raw,normalized)
   if(itemIds.has(normalizedItem.id)||slugs.has(normalizedItem.slug))throw Error('Each item needs a unique identity and URL within its collection.')
   itemIds.add(normalizedItem.id);slugs.add(normalizedItem.slug)
   return normalizedItem
  })
  return {...normalized,items}
 })
 const targets=new Map(collections.map(collection=>[collection.id,collection]))
 for(const collection of collections)for(const field of collection.fields)if(field.type==='reference'){
  const target=targets.get(field.reference!)
  if(!target)throw Error('Choose an existing collection for '+field.label+'.')
  const allowed=new Set(target.items.map(item=>item.id))
  for(const item of collection.items)if(Object.hasOwn(item.values,field.id)&&!allowed.has(item.values[field.id] as string))throw Error(field.label+' must reference an existing item in its target collection.')
 }
 return collections
}
/** Schema changes retain all existing items and validate them without migration. */
export function upsertCollection(existing:Collection[]|undefined,value:unknown):Collection[]{
 const replacement=schema(value),current=existing??[],previous=current.find(collection=>collection.id===replacement.id)
 const next={...replacement,items:previous?.items??[]}
 const merged=previous?current.map(collection=>collection.id===replacement.id?next:collection):[...current,next]
 return normalizeCollections(merged)!
}
/** An item save replaces exactly one complete record, never another collection. */
export function upsertCollectionItem(existing:Collection[]|undefined,collectionId:string,value:unknown):Collection[]{
 const current=existing??[],collection=current.find(collection=>collection.id===collectionId)
 if(!collection)throw Error('Choose an existing collection before saving an item.')
 const saved=item(value,collection),previous=collection.items.some(item=>item.id===saved.id)
 const items=previous?collection.items.map(item=>item.id===saved.id?saved:item):[...collection.items,saved]
 return normalizeCollections(current.map(candidate=>candidate.id===collectionId?{...candidate,items}:candidate))!
}

/** Template saves retain the complete schema and all items for native draft preparation. */
export function upsertCollectionTemplate(existing:Collection[]|undefined,collectionId:string,value:unknown):Collection[]{
 const collection=existing?.find(candidate=>candidate.id===collectionId)
 if(!collection)throw Error('Choose an existing collection before saving a template.')
 const {items,...schema}=collection
 return upsertCollection(existing,{...schema,template:value})
}
