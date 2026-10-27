import type {Collection,CollectionItem} from './collection-types'
import type {ImageContent} from './images'
import type {Page} from './model'
import {collectionItemPath} from './collection-page'
import {escape} from './ui/kit'

export function collectionSocialImage(collection:Collection,item:CollectionItem):ImageContent|undefined{
 const id=collection.template?.imageField
 return id?item.values[id] as ImageContent:undefined
}

/** Public metadata comes exclusively from the approved item and its template bindings. */
export function collectionTemplateHead(collection:Collection,item:CollectionItem,page:Page,origin:string):string{
 if(!collection.template)return ''
 const canonical=new URL(collectionItemPath(collection,item),origin).href,description=page.search?.description
 const image=collectionSocialImage(collection,item)
 const width=image?.renditions?.at(-1)?.width??0
 const imageUrl=image?canonical+'?pane-collection-social=1&width='+width:undefined
 const meta=(attribute:'name'|'property',name:string,value:string)=>`<meta ${attribute}="${name}" content="${escape(value)}">`
 const priceFields=collection.fields.filter(field=>field.type==='price'&&collection.template?.fields.includes(field.id)&&item.values[field.id]!==undefined)
 const offers=priceFields.map(field=>({'@type':'Offer',name:field.label,price:item.values[field.id],priceCurrency:'USD',url:canonical}))
 const service={'@context':'https://schema.org','@type':'Service',name:page.title,url:canonical,...(description?{description}:{}),...(imageUrl?{image:imageUrl}:{}),...(offers.length?{offers}:{})}
 const json=JSON.stringify(service).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')
 return `<link rel="canonical" href="${escape(canonical)}">`
  +meta('property','og:type','website')+meta('property','og:title',page.title)+meta('property','og:url',canonical)
  +meta('name','twitter:title',page.title)+meta('name','twitter:card',image?'summary_large_image':'summary')
  +(description?meta('name','description',description)+meta('property','og:description',description)+meta('name','twitter:description',description):'')
  +(imageUrl?meta('property','og:image',imageUrl)+meta('name','twitter:image',imageUrl)+meta('property','og:image:alt',image?.decorative?'':image?.alt??'')+meta('name','twitter:image:alt',image?.decorative?'':image?.alt??''):'')
  +`<script type="application/ld+json">${json}</script>`
}
