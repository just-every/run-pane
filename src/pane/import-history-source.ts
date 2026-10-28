import { csvRows } from './import-csv'
import { sha256, canonicalJson, assertNoCredentials } from '../modules/import-kit/src/provenance/identity.ts'
import type { ImportDocument } from './import-report'
import { enquiryDefaults } from './import-history-targets'
import type { Submission } from './submission-export'

export type HistoryRow = {id:string;kind:'enquiry'|'visit-baseline';value:Record<string,string|number|null>}

/** Offline fields remain text, never consent or provider-delivery authority. */
export function historyCsv(source:string):ImportDocument {
 const rows=csvRows(source),header=rows.shift()
 if(!header?.length||header.some(name=>!name.trim())||new Set(header.map(name=>name.toLowerCase())).size!==header.length)throw Error('History CSV needs unique, nonempty column names.')
 if(!rows.length||rows.length>2000)throw Error('History CSV needs between 1 and 2,000 rows.')
 const columns=header.map(name=>name.trim().toLowerCase()),analytics=columns.join(',')==='month,page,visits'
 const dateColumn=columns.findIndex(name=>['submitted on','submitted at','date submitted'].includes(name))
 const formColumn=columns.indexOf('form'),emailColumn=columns.indexOf('email'),nameColumn=columns.indexOf('name')
 if(!analytics&&(dateColumn<0||formColumn<0||emailColumn<0||nameColumn<0))throw Error('Enquiry CSV needs Submitted On, Form, Name and Email columns. Analytics CSV needs Month, Page and Visits.')
 const records:HistoryRow[]=[],identities=new Set<string>()
 const items=rows.map((row,index)=>{
  if(row.length!==header.length)throw Error('History CSV row '+(index+2)+' has the wrong field count.')
  const fields=Object.fromEntries(header.map((name,i)=>[name,row[i]]));assertNoCredentials(fields)
  if(row.some(cell=>cell.length>20000))throw Error('History CSV field exceeds 20,000 characters.')
  let value:HistoryRow['value'],kind:HistoryRow['kind'],id:string,title:string
  if(analytics){
   const [month,path,visits]=row
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!path.startsWith('/')||path.startsWith('//')||/[?#\s\\]/.test(path)||path.length>500||!/^\d+$/.test(visits)||!Number.isSafeInteger(Number(visits)))throw Error('Analytics rows need a YYYY-MM month, a page path and a nonnegative whole visit count.')
   kind='visit-baseline';id='baseline-'+sha256(canonicalJson(['Squarespace',month,path]));title=month+' · '+path
   value={month,path,count:Number(visits),source:'Squarespace'}
  }else{
   const date=row[dateColumn],form=row[formColumn],email=row[emailColumn].trim().toLowerCase(),name=row[nameColumn]
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(date)||Number.isNaN(Date.parse(date))||!form.trim()||form.length>200||!name.trim()||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Enquiry rows need an original timestamp with timezone, form, name and complete email address.')
   const formId='import-'+sha256('Squarespace:'+form).slice(0,40)
   const submission:Submission={formId,formName:form,page:'',fields:header.map((label,i)=>({key:label,label,type:i===emailColumn?'email':'text',value:row[i]}))}
   kind='enquiry';id='enquiry-'+sha256(canonicalJson(['Squarespace',form,email,new Date(date).toISOString(),fields]));title=name+' · '+form
   value={...enquiryDefaults,name,email,message:row[columns.indexOf('message')]??'',created_at:new Date(date).toISOString(),form_id:formId,submission:JSON.stringify(submission),imported_from:'Squarespace',status:'closed'}
  }
  if(identities.has(id))throw Error('Duplicate history record at row '+(index+2)+'. Nothing was imported.')
  identities.add(id);records.push({id,kind,value})
  return {id,kind,title,fields}
 })
 return {site:null,format:analytics?'squarespace-analytics-csv-v1':'squarespace-enquiries-csv-v1',items,historyRows:records}
}
