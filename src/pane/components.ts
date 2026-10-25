import { createHash } from 'node:crypto'
import type { Site, Page } from './model'
import { normalizeSections, sectionText, type Section } from './sections'
export type Component = {id:string; name:string; section:Section}
export function normalizeComponents(value:unknown):Component[]|undefined {
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>100)throw Error('Use at most 100 reusable components.')
 const ids=new Set<string>()
 return value.map(raw=>{
  if(!raw||typeof raw.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)||ids.has(raw.id)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>120)throw Error('Components need unique identities and names.')
  ids.add(raw.id)
  const section=normalizeSections([raw.section])![0]
  if(section.component)throw Error('Components cannot contain component references.')
  return {id:raw.id,name:raw.name.trim(),section}
 })
}
export function resolveComponents(page:Page,components:Component[]):Page {
 if(!page.sections?.some(section=>section.component))return page
 const sections=page.sections.map(section=>{
  if(!section.component)return section
  const component=components.find(item=>item.id===section.component)
  if(!component)throw Error('A component is still used by a page. Detach its copies before removing it.')
  return {...component.section,id:section.id,component:component.id,blocks:component.section.blocks.map((block,index)=>({...block,id:'cb-'+createHash('sha256').update(section.id+'\0'+block.id).digest('hex')}))}
 })
 return {...page,sections,body:sectionText(sections)}
}
export function createComponent(site:Site,slug:string,sectionId:string,name:string):Site {
 const page=site.pages.find(page=>page.slug===slug)
 if(!page)throw Error('Choose a page.')
 const section=sectionId==='body'&&!page.sections?{id:crypto.randomUUID(),kind:'text' as const,ratio:'1:1' as const,gap:24,paddingTop:32,paddingBottom:32,blocks:[{id:crypto.randomUUID(),kind:'text' as const,text:page.body,column:1,span:12,row:1,order:0,align:'left' as const,vertical:'start' as const}]}:page.sections?.find(section=>section.id===sectionId)
 if(!section)throw Error('Choose a section to save.')
 const id=crypto.randomUUID(),copy={...section};delete copy.component
 return {...site,components:[...(site.components??[]),{id,name,section:copy}],pages:site.pages.map(item=>item===page?{...page,sections:(page.sections??[section]).map(item=>item===section?{...section,component:id}:item)}:item)}
}
export function componentsFromForm(site:Site,input:Record<string,unknown>):Site {
 const components=site.components?.map(component=>({...component,section:{...component.section,blocks:component.section.blocks.map(block=>({...block,text:typeof input['component.'+component.id+'.'+block.id]==='string'?String(input['component.'+component.id+'.'+block.id]):block.text}))}}))
 const pages=site.pages.map(page=>{
  let sections=page.sections
  for(const component of components??[]){
   const choice=input['placement.'+page.slug+'.'+component.id]
   if(choice===undefined)continue
   const existing=sections?.find(section=>section.component===component.id)
   if(choice==='detach'&&existing)sections=sections!.map(section=>section===existing?({...section,component:undefined}):section)
   else if(choice==='shared'&&!existing){
    const initial=sections??[{id:crypto.randomUUID(),kind:'text' as const,ratio:'1:1' as const,gap:24,paddingTop:32,paddingBottom:32,blocks:[{id:crypto.randomUUID(),kind:'text' as const,text:page.body,column:1,span:12,row:1,order:0,align:'left' as const,vertical:'start' as const}]}]
    sections=[...initial,{...component.section,id:crypto.randomUUID(),component:component.id}]
   }
  }
  return sections?{...page,sections,body:sectionText(sections)}:page
 })
 return {...site,components,pages}
}
