import {draftRevision,DraftConflict,revision} from './content'
import type {Bindings} from '../auth.server'
import type {Revision} from './model'
type History={actor:string;head_revision:string;entries:string;position:number}
async function latest(db:D1Database){const row=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first();return row?revision(row):null}
async function stored(db:D1Database,actor:string){return db.prepare('SELECT * FROM pane_ai_history WHERE actor=?').bind(actor).first<History>()}
export async function aiHistory(db:D1Database,actor:string){
 const current=await latest(db),history=await stored(db,actor)
 if(!history||history.head_revision!==current?.id)return {base:current?.id,undo:null,redo:null,undoCount:0,redoCount:0}
 const entries=JSON.parse(history.entries) as string[]
 const summary=async(id:string|undefined)=>id?db.prepare('SELECT id,slug,mode FROM pane_ai_proposals WHERE id=? AND actor=?').bind(id,actor).first():null
 return {base:history.head_revision,undo:await summary(entries[history.position-1]),redo:await summary(entries[history.position]),undoCount:history.position,redoCount:entries.length-history.position}
}
export async function appendAiHistory(db:D1Database,actor:string,base:string,next:string,proposal:string){
 const old=await stored(db,actor)
 const previous=old?.head_revision===base?(JSON.parse(old.entries) as string[]).slice(0,old.position):[]
 const entries=[...previous,proposal].slice(-20)
 return db.prepare(`INSERT INTO pane_ai_history(actor,head_revision,entries,position) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_revisions WHERE id=?) ON CONFLICT(actor) DO UPDATE SET head_revision=excluded.head_revision,entries=excluded.entries,position=excluded.position`).bind(actor,next,JSON.stringify(entries),entries.length,next)
}
/** A durable stack follows accepted batches; unrelated newer work fences the stack. */
export async function undoAiHistory(env:Bindings,actor:string,input:Record<string,unknown>){
 const base=await latest(env.DB),history=await stored(env.DB,actor)
 if(!base||input.base!==base.id||history?.head_revision!==base.id)throw new DraftConflict(base)
 const entries=JSON.parse(history.entries) as string[]
 const supplied=await env.DB.prepare('SELECT id,base,accepted_revision,undone FROM pane_ai_proposals WHERE id=? AND actor=?').bind(String(input.id??''),actor).first<{id:string;base:string;accepted_revision:string;undone:number}>()
 if(!supplied)throw Error('Accepted proposal not found.')
 const direction=input.direction??(supplied.undone?'redo':'undo')
 if(!['undo','redo'].includes(String(direction)))throw Error('Choose Undo or Redo.')
 const position=direction==='undo'?history.position-1:history.position
 if(position<0||position>=entries.length||entries[position]!==supplied.id)throw new DraftConflict(base)
 const target=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(direction==='undo'?supplied.base:supplied.accepted_revision).first()
 if(!target)throw Error('Original revision is unavailable.')
 const row:Revision=await draftRevision(crypto.randomUUID(),actor,revision(target).site,new Date(Math.max(Date.now(),Date.parse(base.created_at)+1)).toISOString())
 const nextPosition=direction==='undo'?history.position-1:history.position+1
 const results=await env.DB.batch([
  env.DB.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND EXISTS(SELECT 1 FROM pane_ai_history WHERE actor=? AND head_revision=? AND position=?)`).bind(row.id,JSON.stringify(row.site),row.hash,actor,row.created_at,base.id,actor,base.id,history.position),
  env.DB.prepare(`UPDATE pane_ai_proposals SET last_revision=?,undone=? WHERE id=? AND EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(row.id,direction==='undo'?1:0,supplied.id,row.id),
  env.DB.prepare(`UPDATE pane_ai_history SET head_revision=?,position=? WHERE actor=? AND head_revision=? AND EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(row.id,nextPosition,actor,base.id,row.id),
 ])
 if(!results[0].meta.changes)throw new DraftConflict(await latest(env.DB))
 return {id:supplied.id,revision:row,undone:direction==='undo'}
}
