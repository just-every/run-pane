import type { D1TargetAdapter, D1Sql } from '../modules/import-kit/src/d1/types.ts'
import type { TargetRow } from '../modules/import-kit/src/types.ts'
import { sha256 } from '../modules/import-kit/src/provenance/identity.ts'

export const enquiryDefaults = {marketing_consent:null,acknowledgment:null,acknowledgment_status:'not_requested',acknowledgment_provider:null,acknowledgment_provider_id:null,assignee:null,follow_up_at:null,reminded_at:null,reminder_to:null,reminder_status:null,escalated_at:null,escalated_to:null,escalation_status:null,_files:'[]',_replies:'[]'}
export const erasedImportPerson = (email:string) => sha256('pane-import-person:'+email.trim().toLowerCase())
const sql=(sql:string,...params:unknown[]):D1Sql=>({sql,params})
const table=(kind:string)=>kind==='enquiry'?'pane_messages':kind==='visit-baseline'?'pane_import_visits':undefined
const revisionColumn=(kind:string)=>kind==='enquiry'?'import_revision':'kit_revision'
const columns=(value:TargetRow['value'])=>Object.entries(value as Record<string,unknown>).filter(([name])=>!name.startsWith('_'))
const replyColumns=['id','message_id','actor','subject','body','status','created_at']
/** Compare the observed reply set, so explicit erasure can include native replies
 * while any concurrent insertion, removal or field change aborts the batch. */
function repliesMatch(id:string,snapshot:string):D1Sql {
 const replies=JSON.parse(snapshot) as Record<string,unknown>[]
 return sql(`(SELECT COUNT(*) FROM pane_inquiry_replies WHERE message_id=?)=? AND NOT EXISTS(
  SELECT 1 FROM pane_inquiry_replies actual WHERE actual.message_id=? AND NOT EXISTS(
   SELECT 1 FROM json_each(?) expected WHERE ${replyColumns.map(key=>`actual."${key}" IS json_extract(expected.value,'$.${key}')`).join(' AND ')}))`,id,replies.length,id,snapshot)
}

/** Native values, evidence and dependent records all participate in strict undo. */
export function historyTargets(revisions:D1TargetAdapter):D1TargetAdapter {
 const scope=(destination:string)=>{if(destination!=='pane-site')throw Error('IMPORT_TARGET_SCOPE_MISMATCH')}
 const adapter:D1TargetAdapter={
  async read(db,destination,kind,id){
   if(!table(kind))return revisions.read(db,destination,kind,id)
   scope(destination)
   const row=await db.prepare(`SELECT * FROM ${table(kind)} WHERE id=?`).bind(id).first<Record<string,any>>()
   if(!row)return undefined
   const {id:_,[revisionColumn(kind)]:revision,...value}=row
   if(!revision)throw Error('NATIVE_EDIT_CONFLICT')
   if(kind==='enquiry'){
    value._files=JSON.stringify((await db.prepare('SELECT * FROM pane_files WHERE message_id=? ORDER BY id').bind(id).all()).results)
    value._replies=JSON.stringify((await db.prepare('SELECT * FROM pane_inquiry_replies WHERE message_id=? ORDER BY id').bind(id).all()).results)
   }
   return {destination,targetKind:kind,targetId:id,revision,value}
  },
  matches(row,destination,kind,id){
   if(!table(kind))return revisions.matches(row,destination,kind,id)
   scope(destination)
   if(!row)return sql(`NOT EXISTS(SELECT 1 FROM ${table(kind)} WHERE id=?)`,id)
   const entries=columns(row.value)
   if(kind==='enquiry'&&(row.value as any)._files!=='[]')throw Error('NATIVE_EDIT_CONFLICT')
   const replies=kind==='enquiry'?repliesMatch(id,(row.value as any)._replies):undefined
   return sql(`EXISTS(SELECT 1 FROM ${table(kind)} WHERE id=? AND ${revisionColumn(kind)}=? AND ${entries.map(([key])=>`"${key}" IS ?`).join(' AND ')}) ${replies?`AND NOT EXISTS(SELECT 1 FROM pane_files WHERE message_id=?) AND ${replies.sql}`:''}`,id,row.revision,...entries.map(([,v])=>v),...(replies?[id,...replies.params??[]]:[]))
  },
  matchesCount(count,destination){scope(destination);return sql('(SELECT COUNT(*) FROM pane_import_targets)+(SELECT COUNT(*) FROM pane_messages WHERE import_revision IS NOT NULL)+(SELECT COUNT(*) FROM pane_import_visits)=?',count)},
  write(row){
   const kind=row.targetKind
   if(!table(kind))return revisions.write(row)
   scope(row.destination)
   const entries=columns(row.value),value=row.value as Record<string,any>
   return [sql(`INSERT INTO ${table(kind)}(id,${revisionColumn(kind)},${entries.map(([key])=>`"${key}"`).join(',')}) SELECT ${[row.targetId,row.revision,...entries].map(()=>'?').join(',')} ${kind==='enquiry'?`WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?) AND NOT EXISTS(SELECT 1 FROM pane_erased_import_people WHERE digest=?)`:''}`,row.targetId,row.revision,...entries.map(([,v])=>v),...(kind==='enquiry'?[row.targetId,erasedImportPerson(value.email)]:[]))]
  },
  remove(destination,kind,id){if(!table(kind))return revisions.remove(destination,kind,id);scope(destination);return [sql(`DELETE FROM ${table(kind)} WHERE id=?`,id)]},
  async list(db,destination){
   scope(destination)
   const rows=await revisions.list(db,destination)
   for(const kind of ['enquiry','visit-baseline']){
    const ids=await db.prepare(`SELECT id FROM ${table(kind)} ${kind==='enquiry'?'WHERE import_revision IS NOT NULL':''} ORDER BY id`).all<{id:string}>()
    for(const row of ids.results)rows.push((await adapter.read(db,destination,kind,row.id))!)
   }
   return rows
  },
 }
 return adapter
}
