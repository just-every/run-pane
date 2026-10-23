import type { D1Database } from '../modules/import-kit/src/d1/types.ts'
import { planD1Import, createD1ImportJob, applyD1ImportBatches, undoD1Import, readD1ImportOriginals, readD1ImportJob } from '../modules/import-kit/src/d1/index.ts'
import { moveInSource } from './import-source'
import { moveInContext, type ImportActor } from './import-authority'
import { migrationReport } from './import-report'
import type { Site } from './model'
import { Buffer } from 'node:buffer'

/** SELECT-only dry run. The complete Base plan carries the reviewed fingerprint. */
export async function planMoveIn(db: D1Database, actor: ImportActor, source: string) {
  const context = await moveInContext(db, actor)
  const input = await moveInSource(source, actor.id)
  return {...await planD1Import(input.source, input.mapping, context), site: input.document.site, report: migrationReport(input.document)}
}

export async function applyMoveIn(db: D1Database, actor: ImportActor, source: string, reviewedFingerprint: string) {
  const context = await moveInContext(db, actor)
  const input = await moveInSource(source, actor.id)
  const plan = await planD1Import(input.source, input.mapping, context)
  const reviewed = { ...context, reviewedFingerprint }
  const job = await createD1ImportJob(plan, reviewed)
  const applied = await applyD1ImportBatches(job.id, reviewed)
  const row = await db.prepare('SELECT site FROM pane_revisions WHERE id=?').bind(input.targetId).first<{site:string}>()
  return {...applied, report: migrationReport(input.document,row ? JSON.parse(row.site) : null,applied.state==='undone'?'undone':'applied',input.targetId)}
}

export async function undoMoveIn(db: D1Database, actor: ImportActor, job: string) {
  const context = await moveInContext(db, actor)
  const published = await db.prepare(`SELECT 1 FROM ik_provenance p JOIN pane_state s ON s.live=p.target_id
    WHERE p.job_id=? AND p.destination=? AND p.target_kind='site-revision' AND p.reversed=0`)
    .bind(job, context.destination).first()
  if (published) throw new Error('This imported revision is published. Publish another revision before undoing this import.')
  return undoD1Import(job, context)
}

/** Re-open the retained report without trusting a resubmitted source. Base's
 * reader checks current authority, job ownership, fingerprint and byte custody. */
export async function readMoveInReport(db:D1Database,actor:ImportActor,id:string) {
 const context=await moveInContext(db,actor)
 const job=await readD1ImportJob(id,context)
 const originals=await readD1ImportOriginals(id,context)
 const original=originals.find(item=>item.kind==='artifact')
 if(!original||original.original.status!=='retained')throw Error('Import source is unavailable after erasure.')
 const source=Buffer.from(original.original.base64,'base64').toString('utf8')
 const input=await moveInSource(source,actor.id)
 const row=await db.prepare('SELECT site FROM pane_revisions WHERE id=?').bind(input.targetId).first<{site:string}>()
 return {id, state:job.state, fingerprint:job.fingerprint, report:migrationReport(input.document,row?JSON.parse(row.site) as Site:null,job.state==='undone'?'undone':'applied',input.targetId)}
}
