export type ImageContent = { src: string; width: number; height: number; alt?: string; decorative: boolean; crop?:{ratio:'original'|'1:1'|'4:3'|'3:2'|'16:9'|'free';width:number;height:number;x:number;y:number} }

/** Only browser-rasterized, bounded PNGs can enter an immutable draft. */
export function normalizeImage(value: unknown): ImageContent {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Provide an image.')
 const image = value as Record<string, unknown>
 if (Object.keys(image).some(key => !['src', 'width', 'height', 'alt', 'decorative', 'crop'].includes(key))) throw Error('Unsupported image field.')
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
 let crop:ImageContent['crop']
 if(image.crop!==undefined){
  if(!image.crop||typeof image.crop!=='object'||Array.isArray(image.crop))throw Error('Invalid image crop.')
  const source=image.crop as Record<string,unknown>
  if(Object.keys(source).some(key=>!['ratio','width','height','x','y'].includes(key))||!['original','1:1','4:3','3:2','16:9','free'].includes(String(source.ratio)))throw Error('Choose a supported image crop ratio.')
  const bounded=(value:unknown,min:number,max:number)=>{if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw Error('Image crop values are outside their allowed range.');return value}
  crop={ratio:source.ratio as NonNullable<ImageContent['crop']>['ratio'],width:bounded(source.width,1,1000),height:bounded(source.height,1,1000),x:bounded(source.x,0,100),y:bounded(source.y,0,100)}
 }
 return { ...(crop?{crop}:{}), src: image.src, width, height, ...(alt === undefined ? {} : { alt }), decorative: image.decorative }
}
