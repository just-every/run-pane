import type { Site, Page } from './model'
import { pageId, activePages } from './pages'
import { localInstant } from './schedule-time'
import { escape } from './ui/kit'
export type Promotion = { title:string; text:string; pages:string[]; days:number; delay?:number; scroll?:number; exit:boolean; start?:string; end?:string; link?:string; label?:string }
export function normalizePromotion(value:unknown, pages:Page[], zone:string):Promotion|undefined {
 if(value===undefined)return undefined
 const p=value as Promotion
 if(!p||typeof p!=='object'||typeof p.title!=='string'||!p.title.trim()||p.title.length>120||typeof p.text!=='string'||!p.text.trim()||p.text.length>2000)throw Error('Enter a promotion title and message.')
 const ids=new Set(pages.filter(page=>!page.deleted).map(pageId))
 if(!Array.isArray(p.pages)||!p.pages.length||p.pages.some(id=>typeof id!=='string'||!ids.has(id)))throw Error('Choose existing promotion pages.')
 const integer=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max
 if(!integer(p.days,1,365)||typeof p.exit!=='boolean'||(p.delay!==undefined&&!integer(p.delay,1,3600))||(p.scroll!==undefined&&!integer(p.scroll,1,100))||(!p.delay&&!p.scroll&&!p.exit))throw Error('Choose a frequency from 1 to 365 days and at least one valid trigger.')
 if(Boolean(p.start)!==Boolean(p.end))throw Error('Enter both promotion schedule dates, or leave both blank.')
 if(p.start&&p.end&&localInstant(p.end,zone)<=localInstant(p.start,zone))throw Error('The promotion must end after it starts.')
 if(p.link!==undefined&&(!/^\/site(?:\/[a-z0-9-]+)*$/.test(p.link)||!p.label?.trim()||p.label.length>120))throw Error('Choose a local site destination and button label.')
 return {title:p.title.trim(),text:p.text.trim(),pages:[...new Set(p.pages)],days:p.days,exit:p.exit,...(p.delay?{delay:p.delay}:{}),...(p.scroll?{scroll:p.scroll}:{}),...(p.start?{start:p.start,end:p.end}:{}),...(p.link?{link:p.link,label:p.label!.trim()}:{})}
}
export function promotionFromForm(input:Record<string,unknown>,site:Site):Pick<Site,'promotion'> {
 if(input['promotion.title']===undefined)return {promotion:site.promotion}
 const text=(key:string)=>String(input['promotion.'+key]??'').trim()
 if(!text('title'))return {promotion:undefined}
 return {promotion:{title:text('title'),text:text('text'),pages:activePages(site).filter(page=>input['promotion.page.'+pageId(page)]==='yes').map(pageId),days:Number(text('days')),exit:text('exit')==='yes',...(text('delay')?{delay:Number(text('delay'))}:{}),...(text('scroll')?{scroll:Number(text('scroll'))}:{}),...(text('start')?{start:text('start'),end:text('end')}:{}),...(text('link')?{link:text('link'),label:text('label')}: {})}}
}
/** Only published, explicitly selected pages carry a popup. Draft previews never do. */
export function promotionMarkup(site:Site,slug:string):string {
 const p=site.promotion,page=activePages(site).find(page=>page.slug===slug)
 if(!p||!page||!p.pages.includes(pageId(page)))return ''
 const zone=site.automations?.timeZone??'America/Chicago'
 const config={days:p.days,delay:p.delay,scroll:p.scroll,exit:p.exit,start:p.start?localInstant(p.start,zone):0,end:p.end?localInstant(p.end,zone):0}
 return `<dialog class="public-promotion" aria-labelledby="promotion-title" aria-describedby="promotion-message" data-promotion="${escape(JSON.stringify(config))}"><button type="button" class="secondary" data-promotion-close>Close</button><h2 id="promotion-title">${escape(p.title)}</h2><p id="promotion-message">${escape(p.text)}</p>${p.link?`<a href="${escape(p.link)}">${escape(p.label)}</a>`:''}</dialog><script src="/pane-promotion.js" defer></script>`
}
