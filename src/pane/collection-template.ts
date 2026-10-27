import {collectionId,collectionKeys,collectionObject} from './collection-values'
import type {CollectionField,CollectionItem,CollectionRichText,CollectionSchema,CollectionTemplate} from './collection-types'

export function normalizeCollectionTemplate(value:unknown,fields:CollectionField[]):CollectionTemplate|undefined{
 if(value===undefined)return undefined
 const input=collectionObject(value,'a collection template')
 collectionKeys(input,['fields','titleField','descriptionField','imageField'],'collection template')
 if(!Array.isArray(input.fields)||!input.fields.length||input.fields.length>50)throw Error('Choose from 1 to 50 template fields in reading order.')
 const selected=input.fields.map(collectionId),available=new Map(fields.map(field=>[field.id,field]))
 if(new Set(selected).size!==selected.length||selected.some(id=>!available.has(id)))throw Error('Template fields must be unique existing collection fields.')
 const template:CollectionTemplate={fields:selected}
 for(const binding of ['titleField','descriptionField','imageField'] as const){
  if(input[binding]===undefined)continue
  const id=collectionId(input[binding]),field=available.get(id)
  const allowed=binding==='titleField'?['text']:binding==='descriptionField'?['text','richText']:['image']
  if(!field||!allowed.includes(field.type))throw Error('Choose an existing field with the correct type for '+binding+'.')
  template[binding]=id
 }
 return template
}

export function templateDescription(value:unknown):string|undefined{
 if(typeof value==='string')return value
 if(value&&typeof value==='object'&&typeof (value as CollectionRichText).body==='string')return (value as CollectionRichText).body
 return undefined
}

/** Configured metadata bindings must resolve for every item, including later saves. */
export function validateTemplateItem(schema:CollectionSchema,item:CollectionItem):void{
 for(const binding of ['titleField','descriptionField','imageField'] as const){
  const id=schema.template?.[binding]
  if(!id)continue
  const value=item.values[id]
  if(value===undefined||binding!=='imageField'&&!templateDescription(value)?.trim())throw Error('Every item needs a value for the template '+binding+'.')
 }
}
