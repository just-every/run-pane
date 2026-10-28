import type {SiteStyles} from './site-styles'

export type AdobeProject={project:string;families:string[];authorized:true}

/** Owner authorization and the external project travel with the immutable draft. */
export function normalizeAdobeProject(value:unknown):AdobeProject|undefined{
 if(value===undefined||value===null)return undefined
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide an Adobe Fonts web project.')
 const raw=value as Record<string,unknown>
 if(Object.keys(raw).some(key=>!['project','families','authorized'].includes(key))||raw.authorized!==true)throw Error('Authorize your Adobe Fonts web project before connecting it.')
 if(typeof raw.project!=='string'||!/^[a-z0-9]{7}$/.test(raw.project))throw Error('Use the seven-character Adobe web project ID, without its embed code.')
 if(!Array.isArray(raw.families)||!raw.families.length||raw.families.length>12||raw.families.some(name=>typeof name!=='string'||!/^[a-z][a-z0-9-]{0,79}$/i.test(name))||new Set(raw.families).size!==raw.families.length)throw Error('Enter up to twelve distinct CSS font family names from your Adobe web project.')
 return {project:raw.project,families:raw.families as string[],authorized:true}
}

export function adobeStylesheet(styles:SiteStyles|undefined):string|undefined{
 return styles?.adobe&&[styles.heading,styles.body].some(id=>id.startsWith('adobe:'))?`https://use.typekit.net/${styles.adobe.project}.css`:undefined
}

export function adobeMarkup(styles:SiteStyles|undefined):string{
 const href=adobeStylesheet(styles)
 return href?`<link rel="stylesheet" data-adobe-fonts href="${href}" referrerpolicy="no-referrer">`:''
}

/** CSS-only hosting needs no Adobe scripts or broad inline-style permission. */
export function adobePolicy(policy:string):string{
 return policy.replace("style-src 'self'","style-src 'self' https://use.typekit.net https://p.typekit.net")
  .replace("font-src 'self'","font-src 'self' https://use.typekit.net")
  .replace("img-src 'self'","img-src 'self' https://p.typekit.net")
}
