import {activePages,pagePath} from './pages'
import {collectionItemPath,collectionPages} from './collection-page'
import {missingBodyLinks} from './post-links'
import type {Site} from './model'

/** Collections own item URLs, never a sibling blog or an existing page URL. */
export function collectionIntegrity(site:Site):void{
 for(const page of [...site.pages,...collectionPages(site)])for(const section of page.sections??[])for(const block of section.blocks){
  if(block.audio?.file&&!site.libraryFiles?.some(file=>file.id===block.audio?.file&&file.type.startsWith('audio/')))throw Error('A collection audio file is missing from the library.')
  if(block.listing){const collection=site.collections?.find(collection=>collection.id===block.listing?.collection),scalar=(id:string)=>collection?.fields.some(field=>field.id===id&&['text','number','price','date','option'].includes(field.type));if(!collection||block.listing.sort!=='title'&&!scalar(block.listing.sort)||block.listing.filter&&!scalar(block.listing.filter.field))throw Error('Choose an existing collection and supported list fields.')}
 }
 const routes=new Set(activePages(site).map(page=>pagePath(site,page.slug)))
 for(const collection of site.collections??[]){
  if(['search','visit','files'].includes(collection.prefix.split('/')[0]))throw Error('Choose a collection URL prefix outside Pane services.')
  for(const prefix of [...(site.blogs??[]).map(blog=>blog.prefix),...(site.collections??[]).filter(other=>other.id!==collection.id).map(other=>other.prefix)])if(prefix===collection.prefix||prefix.startsWith(collection.prefix+'/')||collection.prefix.startsWith(prefix+'/'))throw Error('Collections and blogs need separate URL prefixes.')
  for(const item of collection.items){const path=collectionItemPath(collection,item);if(routes.has(path))throw Error('A collection item would replace an existing page.');routes.add(path)}
 }
 for(const redirect of site.redirects??[])if(routes.has(redirect.from))throw Error('A redirect would replace a collection item or page.')
 for(const page of collectionPages(site)){
  const broken=missingBodyLinks(site,page);if(broken.length)throw Error('Review collection description destinations: '+broken.join(', '))
  for(const section of page.sections??[])for(const block of section.blocks)for(const item of block.gallery?.items??[])if(!site.media?.some(asset=>asset.id===item.asset))throw Error('A collection gallery image is missing from the library.')
 }
}
