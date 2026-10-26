import {pageReference,referenceUrl} from './page-link-references'
import {parseFragment,type DefaultTreeAdapterMap} from 'parse5'
import {accessibilityFindings} from './accessibility'
import {activePages,pagePath} from './pages'
import type {Site,Page} from './model'
export type ContentWarning={field:'image'|'link';message:string;href:string}
/** Follow current public links without fetching arbitrary external destinations. */
export function contentWarnings(site:Site,page:Page):ContentWarning[]{
 const fix=`${page.sections?'/app/canvas':'/app'}?page=${encodeURIComponent(page.slug)}`
 const result:ContentWarning[]=accessibilityFindings(site).filter(f=>f.slug===page.slug&&f.image).map(f=>({field:'image',message:f.message,href:fix}))
 const images=page.sections?.flatMap(section=>section.blocks.flatMap(block=>[...(block.image?[block.image]:[]),...(block.gallery?.items.flatMap(item=>{const image=site.media?.find(asset=>asset.id===item.asset)?.image;return image?[image]:[]})??[])]))??[]
 // Assess the prepared public payloads; retained private originals are never delivered.
 if(images.some(image=>[image.src,...(image.renditions?.map(r=>r.src)??[])].some(src=>src.length*3/4>200*1024)))result.push({field:'image',message:'A very large public image may slow this page. Choose a smaller image.',href:fix})
 const urls=[...(page.links?.map(link=>link.url)??[]),...(page.sections?.flatMap(section=>section.blocks.flatMap(block=>block.gallery?.items.flatMap(item=>item.href?[item.href]:[])??[]))??[])]
 if(page.importedHtml){const walk=(node:DefaultTreeAdapterMap['node'])=>{if('tagName' in node&&node.tagName==='a'){const href=node.attrs.find(a=>a.name==='href')?.value;if(href)urls.push(href)}if('childNodes' in node)node.childNodes.forEach(walk)};walk(parseFragment(page.importedHtml))}
 const routes=new Set(activePages(site).map(page=>pagePath(site,page.slug)))
 for(const href of new Set(urls)){
  if(pageReference(href)!==undefined){if(referenceUrl(site,href)===null)result.push({field:'link',message:'Broken internal page reference: '+decodeURIComponent(href.slice(5)),href:'/app?page='+encodeURIComponent(page.slug)});continue}
  if(!href.startsWith('/site')||!/^\/site(?:[/?#]|$)/.test(href))continue
  const path=new URL(href,'https://site.invalid').pathname
  if(!routes.has(path)&&path!=='/site/search'&&!site.redirects?.some(r=>r.from===path))result.push({field:'link',message:`Broken internal link: ${href}`,href:fix})
 }
 return result
}
