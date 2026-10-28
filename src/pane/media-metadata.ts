export type MediaMetadata = {folder?:string;caption?:string}

/** Library organization belongs to the immutable draft, alongside its bytes. */
export function mediaMetadata(value:Record<string,unknown>):MediaMetadata {
 const result:MediaMetadata={}
 for(const key of ['folder','caption'] as const){
  if(value[key]===undefined)continue
  const text=value[key]
  if(typeof text!=='string'||text.length>(key==='folder'?120:500)||/[\u0000-\u001f\u007f]/.test(text))throw Error('Use a bounded folder name and caption without control characters.')
  if(text.trim())result[key]=text.normalize('NFC').trim()
 }
 return result
}
