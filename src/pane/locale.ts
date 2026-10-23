import type { Page, Site } from './model'
import { escape } from './ui/kit'
import { localAt } from './schedule-time'
export type LocaleSettings={locale:string;currency:string;phoneFormat:'US'|'international';addressFormat:'US'|'international';weekStart:0|1}
export type BusinessContent={hours:string[];prices:{label:string;cents:number}[];phone:string;street:string;city:string;region:string;postal:string;country:string}
export const usDefaults:LocaleSettings={locale:'en-US',currency:'USD',phoneFormat:'US',addressFormat:'US',weekStart:0}
export function normalizeLocale(value:unknown):LocaleSettings {
 if(value===undefined)return {...usDefaults}
 if(!value || typeof value!=='object')throw Error('Provide locale settings.')
 const input=value as LocaleSettings
 if(!['en-US','en-GB','es-US','fr-CA'].includes(input.locale)||!['USD','CAD','GBP','EUR'].includes(input.currency)||!['US','international'].includes(input.phoneFormat)||!['US','international'].includes(input.addressFormat)||![0,1].includes(input.weekStart))throw Error('Choose supported language, currency, phone, address and calendar settings.')
 return {locale:input.locale,currency:input.currency,phoneFormat:input.phoneFormat,addressFormat:input.addressFormat,weekStart:input.weekStart}
}
export function normalizeBusiness(value:unknown):BusinessContent|undefined {
 if(value===undefined)return undefined
 const input=value as BusinessContent
 if(!input||!Array.isArray(input.hours)||input.hours.length!==7||input.hours.some(time=>typeof time!=='string'||time!==''&&!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(time)||time!==''&&time.slice(0,5)>=time.slice(6)))throw Error('Opening hours need seven days, each closed or an opening and later closing time, such as 09:00-17:00.')
 const text=(key:keyof BusinessContent)=>{const value=input[key];if(typeof value!=='string'||value.length>200||/[\u0000-\u001f]/.test(value))throw Error('Business details need plain text up to 200 characters.');return value.trim()}
 const phone=text('phone');if(phone&&!/^(?:\d{10}|\+[1-9]\d{7,14})$/.test(phone))throw Error('Use ten US phone digits or a plus sign and international digits.')
 if(!Array.isArray(input.prices)||input.prices.length>30||input.prices.some(price=>!price||typeof price.label!=='string'||!price.label.trim()||price.label.length>120||!Number.isSafeInteger(price.cents)||price.cents<0||price.cents>100000000))throw Error('Provide up to 30 named prices with nonnegative amounts.')
 return {hours:input.hours,prices:input.prices.map(price=>({label:price.label.trim(),cents:price.cents})),phone,street:text('street'),city:text('city'),region:text('region'),postal:text('postal'),country:text('country')}
}
export function localeFromForm(input:Record<string,unknown>,site:Site):Partial<Site> {
 const locale=input['locale.locale']===undefined?site.locale:normalizeLocale({locale:input['locale.locale'],currency:input['locale.currency'],phoneFormat:input['locale.phoneFormat'],addressFormat:input['locale.addressFormat'],weekStart:Number(input['locale.weekStart'])})
 return locale?{locale}:{}
}
export function businessFromForm(input:Record<string,unknown>,page:Page):BusinessContent|undefined {
 const prefix=`page.${page.slug}.business.`, get=(name:string)=>String(input[prefix+name]??'').trim()
 if(input[prefix+'prices']===undefined)return page.business
 const prices=get('prices').split(/\r?\n/).filter(Boolean).map(line=>{
  const [label,amount,...extra]=line.split('|').map(value=>value.trim())
  if(extra.length||!/^\d{1,7}(?:\.\d{1,2})?$/.test(amount??''))throw Error('Each price needs a label, a vertical bar and a decimal amount.')
  return {label,cents:Math.round(Number(amount)*100)}
 })
 const hours=Array.from({length:7},(_,day)=>get('hours.'+day)),fields=Object.fromEntries(['phone','street','city','region','postal','country'].map(key=>[key,get(key)]))
 if(!prices.length&&!hours.some(Boolean)&&!Object.values(fields).some(Boolean))return undefined
 return normalizeBusiness({...fields,hours,prices})
}
export function businessMarkup(site:Site,page:Page):string {
 const info=page.business;if(!info)return ''
 const settings=normalizeLocale(site.locale),zone=site.automations?.timeZone??'America/New_York'
 const time=(value:string)=>new Intl.DateTimeFormat(settings.locale,{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(new Date('2000-01-02T'+value+':00Z'))
 const days=Array.from({length:7},(_,index)=>(index+settings.weekStart)%7)
 const weekday=(day:number)=>new Intl.DateTimeFormat(settings.locale,{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+day)))
 const address=settings.addressFormat==='US'?[info.street,[info.city,[info.region,info.postal].filter(Boolean).join(' ')].filter(Boolean).join(', '),info.country]:[info.street,[info.postal,info.city].filter(Boolean).join(' '),info.region,info.country]
 const digits=info.phone.replace(/^\+1/,'');const phone=/^\d{10}$/.test(digits)?settings.phoneFormat==='US'?`(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`:`+1 ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`:info.phone
 const local=localAt(Date.now(),zone),[year,month]=local.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),count=new Date(Date.UTC(year,month,0)).getUTCDate(),offset=(first-settings.weekStart+7)%7
 const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,index)=>{const day=index-offset+1;return `<td>${day>0&&day<=count?new Intl.NumberFormat(settings.locale,{useGrouping:false}).format(day):''}</td>`})
 const calendar=`<table aria-label="Opening hours calendar"><caption>${escape(new Intl.DateTimeFormat(settings.locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1))))}</caption><thead><tr>${days.map(day=>`<th scope="col"><abbr title="${escape(weekday(day))}">${escape(weekday(day).slice(0,2))}</abbr></th>`).join('')}</tr></thead><tbody>${Array.from({length:cells.length/7},(_,row)=>`<tr>${cells.slice(row*7,row*7+7).join('')}</tr>`).join('')}</tbody></table>`
 return `<section lang="${settings.locale}" aria-label="Business details">${info.hours.some(Boolean)?`<h2>Opening hours</h2><p>${escape(zone)}</p><dl>${days.map(day=>`<dt>${escape(weekday(day))}</dt><dd>${info.hours[day]?escape(info.hours[day].split('-').map(time).join(' – ')):'Closed'}</dd>`).join('')}</dl>${calendar}`:''}${info.prices.length?`<h2>Prices</h2><dl>${info.prices.map(price=>`<dt>${escape(price.label)}</dt><dd>${escape(new Intl.NumberFormat(settings.locale,{style:'currency',currency:settings.currency}).format(price.cents/100))}</dd>`).join('')}</dl>`:''}${address.some(Boolean)?`<address>${address.filter(Boolean).map(escape).join('<br>')}</address>`:''}${phone?`<p><a href="tel:${escape(info.phone.startsWith('+')?info.phone:'+1'+info.phone)}">${escape(phone)}</a></p>`:''}</section>`
}
