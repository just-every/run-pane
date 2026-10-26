import {htmlTargets,replaceHtmlTarget} from './ai-html'
import type {Page,Site} from './model'
import type {ImageContent} from './images'
import {sectionText} from './sections'
import {pageId} from './pages'
export function imageTargets(site:Site,page:Page):{target:string;image:ImageContent}[]{
 const result:{target:string;image:ImageContent}[]=[],seen=new Set<string>()
 for(const section of page.sections??[])for(const block of section.blocks){
  if(block.image)result.push({target:'block:'+block.id,image:block.image})
  for(const item of block.gallery?.items??[]){const asset=site.media?.find(asset=>asset.id===item.asset);if(asset&&!seen.has(asset.id)){seen.add(asset.id);result.push({target:'asset:'+asset.id,image:asset.image})}}
 }
 return result.slice(0,5)
}
export function requestedImages(site:Site,page:Page,names:unknown){
 const images=imageTargets(site,page)
 if(!Array.isArray(names)||names.length!==images.length||new Set(names).size!==images.length||images.some(image=>!names.includes(image.target)))throw Error('Review and explicitly name the current page images before sending them.')
 return images
}

export function pageTextTargets(page:Page,site?:Site):{target:string;text:string}[]{
 return [{target:'title',text:page.title},...(page.importedHtml?htmlTargets(page):page.sections?page.sections.flatMap(section=>section.blocks.flatMap(block=>block.kind==='text'?[{target:'block:'+block.id,text:block.text}]:block.image?[{target:'alt:'+block.id,text:block.image.alt??''}]:[])):[{target:'body',text:page.body}]),...((page.sections??[]).flatMap(section=>section.blocks.flatMap(block=>(block.gallery?.items??[]).map((item,index)=>({target:'caption:'+block.id+':'+index,text:item.caption}))))),...((site?.media??[]).filter(asset=>page.sections?.some(section=>section.blocks.some(block=>block.gallery?.items.some(item=>item.asset===asset.id)))).map(asset=>({target:'asset-alt:'+asset.id,text:asset.image.alt??''}))),...(page.embed?[{target:'embed-title',text:page.embed.title}]:[]),...(page.links??[]).map((link,i)=>({target:'link:'+i,text:link.label})),...(page.search?.title?[{target:'search-title',text:page.search.title}]:[]),...(page.search?.description?[{target:'search-description',text:page.search.description}]:[])]
}
export function replaceText(page:Page,target:string,text:string){
 if(target==='title')page.title=text
 else if(target==='body')page.body=text
 else if(target.startsWith('html:'))replaceHtmlTarget(page,target,text)
 else if(target.startsWith('block:')){const block=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===target.slice(6));if(!block||block.kind!=='text')throw Error('Text block no longer exists.');block.text=text;delete block.content}
 else if(target.startsWith('alt:')){const block=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===target.slice(4));if(!block?.image)throw Error('Image no longer exists.');block.image.alt=text;block.image.decorative=!text;block.text=text}
 else if(target.startsWith('caption:')){const [,id,index]=target.split(':');const block=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===id);if(!block?.gallery?.items[Number(index)])throw Error('Gallery caption no longer exists.');block.gallery.items[Number(index)].caption=text}
 else if(target.startsWith('link:'))page.links![Number(target.slice(5))].label=text
 else if(target==='embed-title')page.embed!.title=text
 else if(target==='search-title')page.search={...page.search,title:text}
 else if(target==='search-description')page.search={...page.search,description:text}
 else throw Error('Unsupported text destination.')
 if(page.sections)page.body=sectionText(page.sections)
}
/** Shared placements become independent snapshots so an accepted edit affects only its named page. */
export function detachPage(page:Page){for(const section of page.sections??[])delete section.component}
export function nativeLink(site:Site,target:string){const page=site.pages.find(page=>!page.deleted&&pageId(page)===target);if(!page)throw Error('Choose an existing native page.');return 'page:'+encodeURIComponent(pageId(page))}
