// Shared link boundary: stable references stay data until the site resolves them.
export function safeBodyHref(value){
 if(typeof value!=='string'||!value||value.length>4000||value!==value.trim()||/[\u0000-\u0020\u007f\\]/.test(value))return undefined
 if(/^(page|post|file):[a-zA-Z0-9_/-]{1,240}$/.test(value))return value
 if(value.startsWith('#')||value.startsWith('./')||(/^\/(?!\/)/.test(value)))return value
 try{const url=new URL(value);if(!['https:','http:','mailto:','tel:','sms:'].includes(url.protocol)||url.username||url.password)return undefined;return value}catch{return undefined}
}
export function normalizeBodyLink(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['href','newTab'].includes(key))||!safeBodyHref(value.href)||value.newTab!==undefined&&typeof value.newTab!=='boolean')throw Error('Choose a safe URL or a page, post or file reference.')
 return {href:value.href,newTab:value.newTab===true}
}
export function resolvedBodyHref(href,resolve){
 const safe=safeBodyHref(href);if(!safe)return undefined
 const target=resolve?resolve(safe):/^(page|post|file):/.test(safe)?undefined:safe
 return target&&!/^(page|post|file):/.test(target)?safeBodyHref(target):undefined
}
