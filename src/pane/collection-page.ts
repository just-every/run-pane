import type {Collection,CollectionField,CollectionItem,CollectionRichText} from './collection-types'
import type {ImageContent} from './images'
import type {Page,Site} from './model'
import type {RichNode,Section,TextBlock} from './sections'
import {sectionText} from './sections'

export const collectionItemPath=(collection:Collection,item:CollectionItem)=>'/site/'+collection.prefix+'/'+item.slug
const textNode=(text:string):RichNode=>({tag:'text',text})
const dollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',currencyDisplay:'code'})

function textBlock(id:string,text:string,content?:RichNode[],format:TextBlock['format']='p'):TextBlock{
 return {id,kind:'text',text,format,...(content?{content}:{}),column:1,span:12,row:1,order:0,align:'left',vertical:'start'}
}
function section(id:string,blocks:TextBlock[]):Section{
 return {id,kind:'text',ratio:'1:1',gap:24,paddingTop:16,paddingBottom:16,blocks:blocks.map((block,index)=>({...block,row:index+1,order:index}))}
}
function valueLink(site:Site,field:CollectionField,value:string):{href:string;label:string}{
 if(field.type!=='reference')return {href:value,label:value}
 const collection=site.collections?.find(candidate=>candidate.id===field.reference)
 const item=collection?.items.find(candidate=>candidate.id===value)
 if(!collection||!item)throw Error('The collection reference does not have a published destination.')
 return {href:collectionItemPath(collection,item),label:item.title}
}

/** Every field uses the existing semantic body renderer and prepared image door. */
export function collectionItemPage(site:Site,collection:Collection,item:CollectionItem):Page{
 const sections:Section[]=[]
 collection.fields.forEach((field,index)=>{
  const value=item.values[field.id]
  if(value===undefined)return
  const prefix='cf'+index
  sections.push(section(prefix+'label',[textBlock(prefix+'heading',field.label,undefined,'h2')]))
  if(field.type==='richText'){
   const rich=value as CollectionRichText
   if(rich.sections){
    let blockIndex=0
    sections.push(...rich.sections.map((source,sectionIndex)=>({...structuredClone(source),id:prefix+'s'+sectionIndex,blocks:source.blocks.map(block=>({...structuredClone(block),id:prefix+'b'+blockIndex++}))})))
   }else if(rich.body){
    sections.push(section(prefix+'body',rich.body.split(/\n\s*\n/).filter(text=>text.trim()).map((text,paragraph)=>textBlock(prefix+'p'+paragraph,text.trim()))))
   }
  }else if(field.type==='image'){
   const image=value as ImageContent
   sections.push(section(prefix+'body',[{...textBlock(prefix+'image',image.decorative?'':image.alt??''),kind:'image',image,format:undefined}]))
  }else if(field.type==='link'||field.type==='reference'){
   const link=valueLink(site,field,value as string)
   sections.push(section(prefix+'body',[textBlock(prefix+'value',link.label,[{tag:'a',href:link.href,newTab:false,children:[textNode(link.label)]}])]))
  }else{
   const text=field.type==='price'?dollars.format(value as number):String(value)
   sections.push(section(prefix+'body',[textBlock(prefix+'value',text)]))
  }
 })
 return {id:'collection-'+collection.id+'-'+item.id,slug:collection.prefix+'/'+item.slug,title:item.title,hidden:true,body:sectionText(sections),...(sections.length?{sections}:{})}
}

export function collectionPages(site:Site):Page[]{
 return (site.collections??[]).flatMap(collection=>collection.items.map(item=>collectionItemPage(site,collection,item)))
}
