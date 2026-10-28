import type { D1Database } from '../modules/import-kit/src/d1/types.ts'
import { canonicalJson } from '../modules/import-kit/src/provenance/identity.ts'
import { importKinds, type ImportDocument, type MigrationReport } from './import-report'

export async function historyReport(db:D1Database,input:ImportDocument,phase:MigrationReport['phase']):Promise<MigrationReport> {
 const expected=input.historyRows!,ids=JSON.stringify(expected.map(row=>row.id)),kind=expected[0].kind
 const table=kind==='enquiry'?'pane_messages':'pane_import_visits'
 const rows=(await db.prepare(`SELECT * FROM ${table} WHERE id IN (SELECT value FROM json_each(?))`).bind(ids).all<Record<string,any>>()).results
 const found=new Map(rows.map(row=>[row.id,row]))
 const counts:MigrationReport['counts']=Object.fromEntries([...importKinds,'comment:approved','comment:pending','comment:spam','comment:other'].map(kind=>[kind,{source:0,planned:0,applied:phase==='preflight'?null:0,exceptions:0}]))
 const failures:MigrationReport['failures']=[]
 const inventory=input.items.map(item=>{
  const row=expected.find(row=>row.id===item.id)!,observed=found.get(item.id),count=counts[item.kind]
  count.source++;count.planned++
  if(phase==='applied'){
   if(observed){count.applied=(count.applied??0)+1
    const values=Object.fromEntries(Object.keys(row.value).map(key=>[key,key.startsWith('_')?'[]':observed[key]]))
    if(canonicalJson(values)!==canonicalJson(row.value))failures.push({id:item.id,check:'fields',reason:'Stored history fields differ from the reviewed CSV.'})
   }else failures.push({id:item.id,check:'inventory',reason:'Reviewed history record is absent from its native destination.'})
  }
  return {...item,target:kind==='enquiry'?'/app/inquiries#'+item.id:'/app/sites#imported-traffic-title'}
 })
 return {phase,format:input.format,counts,inventory,failures,history:[
  kind==='enquiry'?'Original dates, forms and every CSV field are retained in the inbox, labeled imported. Historical enquiries are closed; import never sends acknowledgments, notifications or reminders.':'The imported monthly visits by page form a separate labeled baseline. Native Pane visits are unchanged; sales history stays with the old platform.',
  'Subscriber delivery and consent transfer to Mango and Mailchimp are not performed. No contact is subscribed or notified.',
  'Undo removes unchanged imported history. Native edits or replies prevent undo. Person erasure withdraws affected source bytes and fences replay.',
 ],ok:phase==='applied'&&!failures.length}
}
