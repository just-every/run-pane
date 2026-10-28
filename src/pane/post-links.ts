import {pagePath} from './pages'
import type {Site} from './model'

export function blogPostPath(site:Site,post:{blog:string;content:{slug:string}}):string {
 const blog=site.blogs?.find(blog=>blog.id===post.blog)
 if(!blog)throw Error('A published post needs its configured blog.')
 return '/site/'+blog.prefix+'/'+post.content.slug
}
export function bodyLinkResolver(site:Site,mode:'live'|'preview'|'frame',currentSlug:string,pages:Pick<import('./model').Page,'id'|'slug'|'deleted'|'sections'>[]=site.pages){
 return (href:string):string|undefined=>{
  if(href.startsWith('anchor:')){
   const [,pageId,sectionId]=href.split(':'),page=pages.find(page=>!page.deleted&&(page.id??page.slug)===pageId),section=page?.sections?.find(section=>section.id===sectionId)
   return page&&section?(mode==='live'?pagePath(site,page.slug):mode==='frame'?'/app?page='+encodeURIComponent(page.slug):'./'+page.slug)+'#'+(section.anchor??'section-'+section.id):undefined
  }
  if(href.startsWith('page:')){
   const id=decodeURIComponent(href.slice(5)),page=pages.find(page=>!page.deleted&&(page.id??page.slug)===id)
   return page?(mode==='live'?pagePath(site,page.slug):mode==='frame'?'/app?page='+encodeURIComponent(page.slug):'./'+page.slug):undefined
  }
  if(href.startsWith('post:')){
   const id=decodeURIComponent(href.slice(5)),post=(mode==='live'?site.blogPosts:[...(site.posts??[]),...(site.blogPosts??[])] )?.find(post=>post.id===id)
   return post?(mode==='live'?blogPostPath(site,post):'/app/posts/canvas?id='+encodeURIComponent(post.id)):undefined
  }
  if(href.startsWith('file:')){
   const id=href.slice(5)
   return site.libraryFiles?.some(file=>file.id===id)?'/site/files/'+encodeURIComponent(id):undefined
  }
  if(/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(href))return href
  if(/^\/site(?:\/|$)/.test(href)&&!href.includes('\\'))return href
  try{const url=new URL(href);if(['https:','http:','mailto:','tel:','sms:'].includes(url.protocol)&&!url.username&&!url.password)return href}catch{}
  return undefined
 }
}
export function missingBodyLinks(site:Site,page:import('./model').Page,pages?:Pick<import('./model').Page,'id'|'slug'|'deleted'|'sections'>[]):string[]{
 const links:string[]=[]
 function walk(nodes:import('./sections').RichNode[]){for(const node of nodes){if(node.tag==='a')links.push(node.href);if('children' in node)walk(node.children)}}
 for(const section of page.sections??[])for(const block of section.blocks){if(block.link)links.push(block.link.href);if(block.content)walk(block.content)}
 const resolve=bodyLinkResolver(site,'live',page.slug,pages)
 return [...new Set(links)].filter(href=>!resolve(href))
}
