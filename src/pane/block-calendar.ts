import type {Site} from './model'
export type BlockCalendar={collection:string;start:string;end:string;month:string;view:'list'|'month'}
export function normalizeBlockCalendar(value:unknown):BlockCalendar {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Choose a dated collection for this calendar.')
 const input=value as Record<string,unknown>
 if(Object.keys(input).some(key=>!['collection','start','end','month','view'].includes(key))||['collection','start','end'].some(key=>typeof input[key]!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(String(input[key])))||typeof input.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)||!['list','month'].includes(String(input.view)))throw Error('Choose date fields, a month and a calendar view.')
 return {collection:String(input.collection),start:String(input.start),end:String(input.end),month:input.month,view:input.view as BlockCalendar['view']}
}
export function calendarIntegrity(site:Site):void {
 for(const page of site.pages)for(const section of page.sections??[])for(const block of section.blocks){
  const settings=block.calendar;if(!settings)continue
  const collection=site.collections?.find(collection=>collection.id===settings.collection)
  if(!collection||[settings.start,settings.end].some(id=>!collection.fields.some(field=>field.id===id&&field.type==='date')))throw Error('Calendar start and end must reference date fields in an existing collection.')
  for(const item of collection.items){const start=item.values[settings.start],end=item.values[settings.end];if(typeof start!=='string'||typeof end!=='string'||end<start)throw Error('Every calendar item needs a start date and an equal or later end date.')}
 }
}
