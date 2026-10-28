import {siteStyleDefaults} from '../../public/pane-site-styles.mjs'
import type {Site} from './model'
export type SiteStyles=typeof siteStyleDefaults
export function normalizeSiteStyles(value:unknown):SiteStyles|undefined {
 if(value===undefined)return undefined
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide site style settings.')
 const input=value as Record<string,unknown>,result={...siteStyleDefaults}
 if(Object.keys(input).some(key=>!(key in result)))throw Error('Unsupported site style setting.')
 for(const key of ['headingFont','bodyFont'] as const){if(!['figtree','georgia','system','mono'].includes(String(input[key])))throw Error('Choose a built-in site font.');result[key]=String(input[key])}
 for(const key of ['primary','heading','text','background','sectionBackground'] as const){if(typeof input[key]!=='string'||!/^#[a-fA-F0-9]{6}$/.test(input[key]))throw Error('Choose a six-digit site color.');result[key]=input[key].toLowerCase()}
 if(!['square','rounded','pill'].includes(String(input.button)))throw Error('Choose a button shape.');result.button=String(input.button)
 for(const key of ['gap','paddingTop','paddingBottom'] as const){if(!Number.isInteger(input[key])||Number(input[key])<0||Number(input[key])>(key==='gap'?160:240))throw Error('Choose bounded site spacing.');result[key]=Number(input[key])}
 return result
}
export function stylesFromForm(input:Record<string,unknown>,site:Site):SiteStyles|undefined {
 if(input['style.headingFont']===undefined)return site.styles
 const styles=normalizeSiteStyles(Object.fromEntries(Object.keys(siteStyleDefaults).map(key=>[key,typeof siteStyleDefaults[key as keyof SiteStyles]==='number'?Number(input['style.'+key]):input['style.'+key]])))
 return !site.styles&&JSON.stringify(styles)===JSON.stringify(siteStyleDefaults)?undefined:styles
}
