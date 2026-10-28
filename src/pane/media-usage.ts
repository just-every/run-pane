import {collectionPages} from './collection-page'
import {postFiles} from './library-files'
import type {Page,Site} from './model'

export type MediaUse={page:string;title:string;slug:string;kind:'page'|'post'|'item'|'component'}
export type MediaKind='image'|'pdf'

/** Include unpublished, protected and retained content; never infer use from a filename. */
export function mediaUses(site:Site,kind:MediaKind,id:string):MediaUse[]{
 const uses:MediaUse[]=[]
 const inspect=(page:Page,type:MediaUse['kind'],identity=page.id??page.slug)=>{
  const used=kind==='image'?page.sections?.some(section=>section.blocks.some(block=>block.gallery?.items.some(item=>item.asset===id))):postFiles(site,page).some(file=>file.id===id)||page.links?.some(link=>link.url==='file:'+id||link.url==='/site/files/'+id)
  if(used)uses.push({page:identity,title:page.title,slug:page.slug,kind:type})
 }
 for(const page of site.pages)inspect(page,'page')
 for(const post of [...(site.posts??[]),...(site.blogPosts??[])])inspect(post.content,'post',post.id)
 for(const page of collectionPages(site))inspect(page,'item')
 for(const component of site.components??[])inspect({slug:component.id,title:component.name,body:'',sections:[component.section]},'component',component.id)
 return distinctUses(uses)
}

export function distinctUses(uses:MediaUse[]):MediaUse[]{
 return [...new Map(uses.map(use=>[JSON.stringify([use.kind,use.page,use.slug]),use])).values()]
}

export class MediaInUse extends Error {
 constructor(public uses:MediaUse[]){super('This file is still in use. Remove every placement before deleting it.')}
}
