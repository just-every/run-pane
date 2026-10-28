import type {Site} from './model'
import {builtInFonts,normalizeFonts,type SiteFont} from './fonts'
export type SiteStyles={heading:string;body:string;primary:string;text:string;background:string;sectionBackground:string;button:'rounded'|'square'|'pill';spacing:number;fonts:SiteFont[]}
export const defaultStyles:SiteStyles={heading:'figtree',body:'figtree',primary:'#d4005f',text:'#4a3a45',background:'#ffffff',sectionBackground:'#ffffff',button:'rounded',spacing:32,fonts:[]}
export function normalizeStyles(value:unknown):SiteStyles|undefined{
 if(value===undefined)return undefined
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide site style settings.')
 const raw=value as Record<string,unknown>
 if(Object.keys(raw).some(key=>!Object.hasOwn(defaultStyles,key)))throw Error('Unsupported site style setting.')
 const result={...defaultStyles,...raw,fonts:normalizeFonts(raw.fonts)} as SiteStyles
 for(const key of ['heading','body'] as const)if(typeof result[key]!=='string'||!Object.hasOwn(builtInFonts,result[key])&&!result.fonts.some(font=>font.id===result[key]))throw Error('Choose a built-in or uploaded font.')
 for(const key of ['primary','text','background','sectionBackground'] as const){if(typeof result[key]!=='string'||!/^#[a-fA-F0-9]{6}$/.test(result[key]))throw Error('Use a six-digit hex color.');result[key]=result[key].toLowerCase()}
 if(!['rounded','square','pill'].includes(result.button)||!Number.isInteger(result.spacing)||result.spacing<0||result.spacing>120)throw Error('Choose a button shape and spacing from 0 to 120 pixels.')
 return result
}
export function stylesFromForm(input:Record<string,unknown>,site:Site):{styles?:SiteStyles}{
 if(!Object.keys(input).some(key=>key.startsWith('styles.')))return {styles:site.styles}
 const value:Record<string,unknown>={...defaultStyles,...site.styles}
 for(const key of Object.keys(defaultStyles))if(input['styles.'+key]!==undefined)value[key]=key==='fonts'?JSON.parse(String(input['styles.'+key])):key==='spacing'?Number(input['styles.'+key]):input['styles.'+key]
 const styles=normalizeStyles(value)
 return {styles:!site.styles&&JSON.stringify(styles)===JSON.stringify(defaultStyles)?undefined:styles}
}
/** Scoped CSS never changes the edition's approved theme or owner homepage. */
export function siteStyleCss(styles:SiteStyles|undefined,fontBase:string):string{
 if(!styles)return ''
 const s=styles,p='.rer-themed .pane .public-site[data-site-styles]'
 const family=(id:string)=>Object.hasOwn(builtInFonts,id)?builtInFonts[id as keyof typeof builtInFonts].css:`"Pane-${id}", sans-serif`
 const faces=s.fonts.filter(font=>[s.heading,s.body].includes(font.id)).map(font=>`@font-face{font-family:"Pane-${font.id}";src:url("${fontBase}${fontBase.includes('?')?'&':'?'}pane-font=${font.id}") format("${{woff2:'woff2',woff:'woff',ttf:'truetype',otf:'opentype'}[font.format]}");font-display:swap;font-weight:100 900}`).join('')
 return faces+`${p}{--pn-action:${s.primary};--pn-fuchsia-deep:${s.primary};--pn-ink:${s.text===defaultStyles.text?'#1f0717':s.text};--pn-body:${s.text};--pn-white:${s.background};background:${s.background};color:${s.text};font-family:${family(s.body)}}${p} :is(p,li,label,input,textarea,select,button,nav,a){font-family:inherit}${p} :is(h1,h2,h3,h4,.public-brand){font-family:${family(s.heading)}}${s.spacing===defaultStyles.spacing?'':`${p} .public-main{padding-top:${s.spacing*2}px;padding-bottom:${s.spacing*2}px}`}${p} [data-section]:not([data-background-override]){background:${s.sectionBackground}}${p} :is(.button,button,.public-menu-cta){border-radius:${{rounded:'8px',square:'0',pill:'999px'}[s.button]}}${p} :is(.button,button,.public-menu-cta){background:${s.primary};border-color:${s.primary};color:white}`
}
