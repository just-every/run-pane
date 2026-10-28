import { retireD1ImportCustody, upgradeD1ImportErasureIndex } from '../modules/import-kit/src/d1/index.ts'
import type { D1Sql } from '../modules/import-kit/src/d1/types.ts'
import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasedImportPerson,historyTargets } from './import-history-targets'
import { revisionTargets } from './import-targets'
import { moveInContext } from './import-authority'

/** Keep the native statement's SQL available to the shared atomic custody batch. */
export function privacySql(db:D1Database):D1Database {
 const prepare=(sql:string,params:unknown[]=[]):any=>{
  const native=params.length?db.prepare(sql).bind(...params):db.prepare(sql)
  return new Proxy(native,{get(target,key){
   if(key==='sql')return sql
   if(key==='params')return params
   if(key==='bind')return (...values:unknown[])=>prepare(sql,values)
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value
  }})
 }
 return new Proxy(db,{get(target,key){if(key==='prepare')return prepare;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}})
}

export async function eraseImportedCustody(db:D1Database,email:string,id:string,actorId:string,statements:D1Sql[],checkpoint:D1Sql[]) {
 const context=await moveInContext(db,{id:actorId,role:'owner'})
 context.storage.targets=historyTargets(revisionTargets(),{erasure:true})
 // Current schema creates indexed jobs. This also upgrades an older installation
 // before any native deletion, using Base's bounded metadata migration.
 while(!(await upgradeD1ImportErasureIndex(context)).complete){}
 return retireD1ImportCustody({target:{kind:'enquiry',id},values:[email],related:{
  source:record=>record.kind==='enquiry'&&typeof record.payload==='object'&&record.payload!==null&&!Array.isArray(record.payload)&&String(record.payload.email??'').trim().toLowerCase()===email,
 }},[...statements,{sql:'INSERT OR IGNORE INTO pane_erased_import_people(digest) VALUES(?)',params:[erasedImportPerson(email)]}],context,checkpoint)
}

export async function commitPrivacySql(db:D1Database,statements:D1Sql[]) {
 const wire=wireDatabase(db)
 await wire.batch(statements.map(statement=>statement.params?.length?wire.prepare(statement.sql).bind(...statement.params):wire.prepare(statement.sql)))
}
