import type { Site } from './model'
import type { SiteForm, Upload } from './forms'

export type Submission = {formId:string;formName:string;page:string;fields:{key:string;label:string;type:string;value:string}[]}
/** Capture the published schema and validated values before inbox text is flattened. */
export function submissionRecord(form:SiteForm|undefined,page:string,values:Record<string,string>,uploads:Upload[]=[]):Submission {
 return {formId:form?.id??'native:contact',formName:form?.name??'Contact',page,
  fields:form?form.fields.map(field=>({key:field.key,label:field.label,type:field.type,value:field.type==='file'?uploads.find(file=>file.id.endsWith('-'+field.key))?.name??'':values[field.key]??''})):
   ['name','email','message'].map(key=>({key,label:key,type:key==='email'?'email':'text',value:values[key]??''}))}
}
/** The original receipt, structured values and inbox copy commit atomically. */
export function enquiryStatement(db:D1Database,message:{id:string;name:string;email:string;message:string;received:string;acknowledgment:unknown;followUp:number;submission?:Submission}) {
 return db.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment,acknowledgment_status,follow_up_at,form_id,submission) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)')
  .bind(message.id,message.name,message.email,message.message,message.received,message.acknowledgment?JSON.stringify(message.acknowledgment):null,message.acknowledgment?'pending':'not_requested',message.followUp,message.submission?.formId??null,message.submission?JSON.stringify(message.submission):null,message.id)
}
export async function submissionForms(db:D1Database,site?:Site) {
 const records=(await db.prepare(`SELECT form_id,MIN(json_extract(submission,'$.formName')) AS form_name FROM pane_messages WHERE submission IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pane_erased_messages e WHERE e.id=pane_messages.id) GROUP BY form_id ORDER BY form_id`).all<{form_id:string;form_name:string}>()).results
 const forms=new Map<string,string>([['native:contact','Contact (built in)'],...(site?.forms??[]).map(form=>[form.id,form.name] as [string,string])])
 for(const record of records)if(!forms.has(record.form_id))forms.set(record.form_id,record.form_name)
 return [...forms].map(([id,name])=>({id,name}))
}
const day=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
// Quote every cell and neutralize spreadsheet formulas, retaining the original stored value.
const cell=(value:string)=>'"'+(/^[\s]*[=+@-]/.test(value)?"'"+value:value).replaceAll('"','""')+'"'
export async function submissionCsv(db:D1Database,query:URLSearchParams) {
 const form=query.get('form')??'',from=query.get('from')??'',to=query.get('to')??''
 if(!form||!(/^[a-zA-Z0-9-]{1,80}$/.test(form)||form==='native:contact')||from&&!day(from)||to&&!day(to)||from&&to&&from>to)throw Error('Choose a form and a valid date range. Dates include the entire day in UTC.')
 const start=from?from+'T00:00:00.000Z':'',end=to?to+'T23:59:59.999Z':''
 const records=(await db.prepare(`SELECT id,created_at,submission FROM pane_messages m WHERE form_id=? AND submission IS NOT NULL
  AND (?='' OR created_at>=?) AND (?='' OR created_at<=?)
  AND NOT EXISTS(SELECT 1 FROM pane_erased_messages e WHERE e.id=m.id) ORDER BY created_at,id`).bind(form,start,start,end,end).all<{id:string;created_at:string;submission:string}>()).results
 const submissions=records.map(row=>({...row,values:JSON.parse(row.submission) as Submission}))
 const keys=[...new Set(submissions.flatMap(row=>row.values.fields.map(field=>field.key)))].sort()
 const lines=[['submission_id','form_id','form_name','submitted_at_utc','page',...keys.map(key=>'field:'+key)],...submissions.map(row=>[row.id,row.values.formId,row.values.formName,row.created_at,row.values.page,...keys.map(key=>row.values.fields.find(field=>field.key===key)?.value??'')])]
 return new Response(lines.map(line=>line.map(cell).join(',')).join('\r\n')+'\r\n',{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="pane-submissions.csv"','cache-control':'private, no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; sandbox",'vary':'Cookie'}})
}
