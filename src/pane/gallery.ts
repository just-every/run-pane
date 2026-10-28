import {normalizeImage,type ImageContent} from './images'
import {mediaMetadata,type MediaMetadata} from './media-metadata'
export type MediaImage=MediaMetadata&{id:string;name:string;image:ImageContent}
export type Gallery={layout:'grid'|'masonry'|'slideshow'|'carousel';columns:number;phoneColumns:number;gap:number;phoneGap:number;lightbox:boolean;items:{asset:string;caption:string;href?:string}[]}
export function normalizeMedia(value:unknown):MediaImage[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>100)throw Error('The image library holds up to 100 images.')
 const ids=new Set<string>()
 return value.map(item=>{if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>200)throw Error('Invalid library image.');ids.add(item.id);return {id:item.id,name:item.name.normalize('NFC').trim(),...mediaMetadata(item),image:normalizeImage(item.image)}})
}
export function normalizeGallery(value:unknown):Gallery{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide a gallery.')
 const g=value as Record<string,unknown>,bounded=(key:string,min:number,max:number)=>{const n=g[key];if(typeof n!=='number'||!Number.isInteger(n)||n<min||n>max)throw Error('Invalid gallery spacing or columns.');return n}
 if(Object.keys(g).some(key=>!['layout','columns','phoneColumns','gap','phoneGap','lightbox','items'].includes(key))||!['grid','masonry','slideshow','carousel'].includes(String(g.layout))||typeof g.lightbox!=='boolean'||!Array.isArray(g.items)||!g.items.length||g.items.length>100)throw Error('Choose a gallery layout and between 1 and 100 images.')
 const items=g.items.map(item=>{
  if(!item||typeof item!=='object'||Object.keys(item).some(key=>!['asset','caption','href'].includes(key))||typeof item.asset!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.asset)||typeof item.caption!=='string'||item.caption.length>500)throw Error('Invalid gallery image or caption.')
  if(item.href!==undefined&&(typeof item.href!=='string'||(!/^https?:\/\//.test(item.href)&&!/^\/site(?:\/[^\s<>"']*)?$/.test(item.href))||item.href.length>4000))throw Error('Use an HTTPS link or a local site page for the image link.')
  return {asset:item.asset,caption:item.caption,...(item.href?{href:item.href}:{})}
 })
 return {layout:g.layout as Gallery['layout'],columns:bounded('columns',1,6),phoneColumns:bounded('phoneColumns',1,6),gap:bounded('gap',0,80),phoneGap:bounded('phoneGap',0,80),lightbox:g.lightbox,items}
}
export function gallerySettings():string{return `<fieldset data-gallery-settings hidden><legend>Gallery settings</legend><label>Gallery layout<select aria-label="Gallery layout" data-gallery-field="layout"><option>grid</option><option>masonry</option><option>slideshow</option><option>carousel</option></select></label><label>Desktop columns<input type="number" min="1" max="6" data-gallery-field="columns"></label><label>Phone columns<input type="number" min="1" max="6" data-gallery-field="phoneColumns"></label><label>Desktop gallery gap<input type="number" min="0" max="80" data-gallery-field="gap"></label><label>Phone gallery gap<input type="number" min="0" max="80" data-gallery-field="phoneGap"></label><label><input type="checkbox" data-gallery-field="lightbox">Click to enlarge</label><label>Gallery image<select aria-label="Gallery image" data-gallery-item></select></label><label>Image description<input data-gallery-alt maxlength="500"></label><label>Image caption<input data-gallery-caption maxlength="500"></label><label>Image link<input data-gallery-link maxlength="4000"></label><button type="button" data-gallery-remove>Remove gallery image</button><label>Add gallery images<input type="file" multiple accept="image/png,image/jpeg,image/webp" data-gallery-upload></label><label>Library image<select aria-label="Library image" data-gallery-library></select></label><button type="button" data-gallery-add>Add library image</button><p role="status" data-gallery-status></p></fieldset>`}
