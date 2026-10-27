import {safeBodyHref} from '../../public/pane-body-links.mjs'
import {normalizeImage} from './images'
import {normalizeSections,sectionText} from './sections'
import type {CollectionField,CollectionRichText} from './collection-types'

export function collectionObject(value:unknown,label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide '+label+' as an object.')
 return value as Record<string,unknown>
}
export function collectionKeys(value:Record<string,unknown>,allowed:readonly string[],label:string){
 if(Object.keys(value).some(key=>!allowed.includes(key)))throw Error('Unsupported '+label+' field.')
}
export function collectionId(value:unknown):string{
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(value)||['__proto__','prototype','constructor'].includes(value))throw Error('Collection, field and item identities need 1 to 80 letters, numbers, hyphens or underscores.')
 return value
}
export function collectionText(value:unknown,label:string,max:number,empty=false):string{
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw Error(label+' needs text up to '+max+' characters.')
 const result=value.normalize('NFC').trim()
 if(!empty&&!result)throw Error(label+' cannot be empty.')
 return result
}
function richValue(value:unknown,required:boolean):CollectionRichText{
 const rich=collectionObject(value,'rich text')
 collectionKeys(rich,['body','sections'],'rich text')
 const body=collectionText(rich.body,'Rich text body',20000,!required),sections=normalizeSections(rich.sections)
 if(sections?.some(section=>section.blocks.some(block=>block.kind==='html')))throw Error('HTML blocks are currently authored on pages.')
 if(sections?.some(section=>section.component))throw Error('Collection rich text needs local sections; detach reusable components first.')
 if(sections&&sectionText(sections)!==body)throw Error('Rich text sections must match the body in reading order.')
 return {body,...(sections?{sections}:{})}
}
function calendarDate(value:unknown):string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-'))throw Error('Use a real calendar date in YYYY-MM-DD form.')
 const time=Date.parse(value+'T00:00:00.000Z')
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw Error('Use a real calendar date in YYYY-MM-DD form.')
 return value
}
/** Each field has one concrete stored representation; optional means omitted. */
export function normalizeCollectionValue(field:CollectionField,value:unknown):unknown{
 if(value===undefined){if(field.required)throw Error(field.label+' is required.');return undefined}
 switch(field.type){
  case 'text':return collectionText(value,field.label,20000,!field.required)
  case 'richText':return richValue(value,field.required===true)
  case 'image':return normalizeImage(value)
  case 'number':
   if(typeof value!=='number'||!Number.isFinite(value))throw Error(field.label+' needs a finite number.')
   return value
  case 'price':
   if(typeof value!=='number'||!Number.isFinite(value)||value<0||Math.round(value*100)/100!==value)throw Error(field.label+' needs a finite nonnegative USD dollar amount with at most two decimal places.')
   return value
  case 'date':return calendarDate(value)
  case 'link':
   if(!safeBodyHref(value))throw Error(field.label+' needs a safe URL or native content reference.')
   return value
  case 'reference':return collectionId(value)
  case 'option':
   if(typeof value!=='string'||!field.options?.includes(value))throw Error(field.label+' needs one of its configured options.')
   return value
 }
}
