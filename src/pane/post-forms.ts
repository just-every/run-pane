import {sectionText} from './sections'
import {ownPost} from './posts'
import type {Revision} from './model'
export function postForm(current:Revision,actor:string,manage:boolean,input:Record<string,unknown>){
 const old=input.id?ownPost(current.site,input.id,actor,manage):undefined
 const sections=typeof input.sections==='string'?JSON.parse(input.sections):old?.content.sections
 const content={...old?.content,slug:String(input.slug??old?.content.slug??''),title:String(input.title??old?.content.title??''),body:sections?sectionText(sections):String(input.body??old?.content.body??''),...(sections?{sections}:{})}
 const fields:Record<string,unknown>={...input,content}
 if(typeof input.media==='string')fields.media=JSON.parse(input.media)
 if(typeof input.featuredImage==='string'){
  if(input.featuredImage){const image=JSON.parse(input.featuredImage);fields.featuredImage={...image,alt:String(input.featuredAlt??image.alt??''),decorative:false}}
  else fields.featuredImage=null
 }
 for(const field of ['categories','tags'])if(typeof input[field]==='string')fields[field]=(input[field] as string).split(',').map(value=>value.trim()).filter(Boolean)
 return fields
}
