export type ImageContent = { renditions?: {src:string;width:number;height:number}[]; src: string; width: number; height: number; alt?: string; decorative: boolean; original?: string; rotation?: 0|90|180|270; crop?:{ratio:'original'|'1:1'|'4:3'|'3:2'|'16:9'|'free';width:number;height:number;x:number;y:number} }

/** Only browser-rasterized, bounded PNGs can enter an immutable draft. */
export function normalizeImage(value: unknown): ImageContent {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Provide an image.')
 const image = value as Record<string, unknown>
 if (Object.keys(image).some(key => !['src', 'width', 'height', 'alt', 'decorative', 'crop', 'original', 'rotation', 'renditions'].includes(key))) throw Error('Unsupported image field.')
 if (typeof image.src !== 'string' || !image.src.startsWith('data:image/png;base64,')) throw Error('Choose a PNG image prepared by the image picker.')
 const encoded = image.src.slice('data:image/png;base64,'.length)
 if (!encoded.length || encoded.length > Math.ceil(256 * 1024 / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw Error('Image data must be valid base64 and no larger than 256 KiB.')
 const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0))
 if (bytes.length > 256 * 1024) throw Error('Choose an image smaller than 256 KiB after preparation.')
 // Re-encoding checks unused padding bits as well as the base64 alphabet.
 let binary = ''
 for (const byte of bytes) binary += String.fromCharCode(byte)
 if (btoa(binary) !== encoded) throw Error('Image data must use canonical base64.')
 if (bytes.length < 33 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) throw Error('Image data is not a PNG.')
 const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
 if (header.getUint32(8) !== 13 || ![73, 72, 68, 82].every((byte, index) => bytes[index + 12] === byte)) throw Error('PNG image needs a valid IHDR header.')
 const dimension = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1600) throw Error('Image dimensions must be integers from 1 to 1600.')
  return value
 }
 const width = dimension(image.width), height = dimension(image.height)
 if (header.getUint32(16) !== width || header.getUint32(20) !== height) throw Error('Image dimensions do not match its PNG header.')
 if (typeof image.decorative !== 'boolean') throw Error('Choose whether the image is decorative.')
 if (image.alt !== undefined && (typeof image.alt !== 'string' || image.alt.length > 500)) throw Error('Alt text must contain at most 500 characters.')
 const alt = typeof image.alt === 'string' ? image.alt.normalize('NFC').trim() : undefined
 if (image.decorative && alt) throw Error('Decorative images must have empty alt text.')
 let renditions:ImageContent['renditions']
 if(image.renditions!==undefined){
  if(!Array.isArray(image.renditions)||!image.renditions.length||image.renditions.length>3)throw Error('Provide up to three responsive WebP renditions.')
  let previous=0
  renditions=image.renditions.map(value=>{
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid responsive image.')
   const item=value as Record<string,unknown>
   if(Object.keys(item).some(key=>!['src','width','height'].includes(key))||typeof item.src!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.src)||item.src.length>Math.ceil(96*1024/3)*4+24)throw Error('Responsive images must be bounded WebP data.')
   const data=Uint8Array.from(atob(item.src.split(',')[1]),c=>c.charCodeAt(0)),view=new DataView(data.buffer)
   let binary='';for(const byte of data)binary+=String.fromCharCode(byte)
   if(btoa(binary)!==item.src.split(',')[1]||data.length<30||String.fromCharCode(...data.slice(0,4))!=='RIFF'||String.fromCharCode(...data.slice(8,12))!=='WEBP'||view.getUint32(4,true)+8!==data.length)throw Error('Invalid WebP bytes.')
   const format=String.fromCharCode(...data.slice(12,16))
   let w=0,h=0
   if(format==='VP8 '&&data[23]===157&&data[24]===1&&data[25]===42){w=view.getUint16(26,true)&16383;h=view.getUint16(28,true)&16383}
   if(format==='VP8L'&&data[20]===47){const packed=view.getUint32(21,true);w=(packed&16383)+1;h=((packed>>>14)&16383)+1}
   if(format==='VP8X'){w=1+data[24]+(data[25]<<8)+(data[26]<<16);h=1+data[27]+(data[28]<<8)+(data[29]<<16)}
   if(w!==item.width||h!==item.height||w<=previous||w>1600||h<1||h>1600||Math.abs(w/h-width/height)>0.03)throw Error('Responsive dimensions do not match the image.')
   previous=w
   return {src:item.src,width:w,height:h}
  })
 }
 let original:string|undefined
 if(image.original!==undefined){
  if(typeof image.original!=='string')throw Error('Invalid original image.')
  const match=/^data:image\/(png|jpeg|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(image.original)
  if(!match||!match[2].length||match[2].length>Math.ceil(768*1024/3)*4)throw Error('Original image exceeds 768 KiB or has an unsupported type.')
  const bytes=Uint8Array.from(atob(match[2]),character=>character.charCodeAt(0))
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
  if(bytes.length>768*1024||btoa(binary)!==match[2])throw Error('Invalid original image encoding.')
  const signature=match[1]==='png'?[137,80,78,71,13,10,26,10]:match[1]==='jpeg'?[255,216,255]:[82,73,70,70]
  if(!signature.every((byte,index)=>bytes[index]===byte)||(match[1]==='webp'&&String.fromCharCode(...bytes.slice(8,12))!=='WEBP'))throw Error('Original image type does not match its bytes.')
  original=image.original
 }
 if(image.rotation!==undefined&&![0,90,180,270].includes(Number(image.rotation)))throw Error('Choose a quarter-turn image rotation.')
 if(image.rotation!==undefined&&typeof image.rotation!=='number')throw Error('Choose a numeric image rotation.')
 let crop:ImageContent['crop']
 if(image.crop!==undefined){
  if(!image.crop||typeof image.crop!=='object'||Array.isArray(image.crop))throw Error('Invalid image crop.')
  const source=image.crop as Record<string,unknown>
  if(Object.keys(source).some(key=>!['ratio','width','height','x','y'].includes(key))||!['original','1:1','4:3','3:2','16:9','free'].includes(String(source.ratio)))throw Error('Choose a supported image crop ratio.')
  const bounded=(value:unknown,min:number,max:number)=>{if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw Error('Image crop values are outside their allowed range.');return value}
  crop={ratio:source.ratio as NonNullable<ImageContent['crop']>['ratio'],width:bounded(source.width,1,1000),height:bounded(source.height,1,1000),x:bounded(source.x,0,100),y:bounded(source.y,0,100)}
 }
 return { ...(renditions?{renditions}:{}),...(original?{original}:{}),...(image.rotation===undefined?{}:{rotation:image.rotation as ImageContent['rotation']}),...(crop?{crop}:{}), src: image.src, width, height, ...(alt === undefined ? {} : { alt }), decorative: image.decorative }
}
