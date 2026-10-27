import type {ImageContent} from './images'

/** Public doors serve only an explicitly selected prepared display rendition. */
export function preparedImageResponse(image:ImageContent|undefined,width:string|null,head:boolean):Response{
 const source=width==='0'?image?.src:image?.renditions?.find(item=>String(item.width)===width)?.src
 if(!source)return new Response(null,{status:404,headers:{'cache-control':'private, no-store'}})
 const bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0))
 return new Response(head?null:bytes,{headers:{'content-type':width==='0'?'image/png':'image/webp','content-length':String(bytes.length),'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'}})
}
