import type { Page, Site } from '../model'
import { normalizeLocale } from '../locale'
import { escape } from './kit'
export function localeSettings(site:Site):string {
 const value=normalizeLocale(site.locale),id=crypto.randomUUID()
 const select=(key:keyof typeof value,label:string,options:(string|number)[])=>`<label for="${id}-${key}">${label}</label><select id="${id}-${key}" name="locale.${key}">${options.map(option=>`<option value="${option}"${option===value[key]?' selected':''}>${option}</option>`).join('')}</select>`
 return `<details><summary>Language and formats</summary><p class="help">Published defaults apply to business details and workspace dates. Calendar 0 starts on Sunday; 1 starts on Monday. The business time zone is in Schedules.</p>${select('locale','Locale',['en-US','en-GB','es-US','fr-CA'])}${select('currency','Currency',['USD','CAD','GBP','EUR'])}${select('phoneFormat','Phone format',['US','international'])}${select('addressFormat','Address format',['US','international'])}${select('weekStart','Calendar first day',[0,1])}</details>`
}
export function businessFields(page:Page):string {
 const value=page.business,prefix=`page.${page.slug}.business.`
 const field=(name:string,label:string,text:string)=>`<label>${label}<input name="${prefix+name}" value="${escape(text)}" maxlength="200"></label>`
 return `<details><summary>Business details</summary><p class="help">Opening times use the business time zone. Enter 24-hour times such as 09:00-17:00; leave a day blank when closed. Prices use the published currency. Leave all fields blank to omit this section.</p>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,index)=>field('hours.'+index,day+' hours',value?.hours[index]??'')).join('')}<label>Price list<textarea name="${prefix}prices" rows="3" placeholder="Consultation | 125.50">${escape(value?.prices.map(price=>price.label+' | '+(price.cents/100).toFixed(2)).join('\n')??'')}</textarea></label><p class="help">One label and decimal amount per line, separated by a vertical bar.</p>${(['phone','street','city','region','postal','country'] as const).map(key=>field(key,({phone:'Business phone',street:'Street address',city:'City',region:'State or region',postal:'Postal code',country:'Country'})[key],value?.[key]??'')).join('')}</details>`
}
