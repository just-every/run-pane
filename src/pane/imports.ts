import type { D1Database } from '../modules/import-kit/src/d1/types.ts'
import { planD1Import, createD1ImportJob, applyD1ImportBatches, undoD1Import } from '../modules/import-kit/src/d1/index.ts'
import { moveInSource } from '../modules/import-kit/pane-source'
import { moveInContext, type ImportActor } from '../modules/import-kit/pane-authority'

/** SELECT-only dry run. The complete Base plan carries the reviewed fingerprint. */
export async function planMoveIn(db: D1Database, actor: ImportActor, source: string) {
  const context = await moveInContext(db, actor)
  const input = await moveInSource(source, actor.id)
  return planD1Import(input.source, input.mapping, context)
}

export async function applyMoveIn(db: D1Database, actor: ImportActor, source: string, reviewedFingerprint: string): Promise<{ id: string; state: string }> {
  const context = await moveInContext(db, actor)
  const input = await moveInSource(source, actor.id)
  const plan = await planD1Import(input.source, input.mapping, context)
  const reviewed = { ...context, reviewedFingerprint }
  const job = await createD1ImportJob(plan, reviewed)
  return applyD1ImportBatches(job.id, reviewed)
}

export async function undoMoveIn(db: D1Database, actor: ImportActor, job: string) {
  const context = await moveInContext(db, actor)
  const published = await db.prepare(`SELECT 1 FROM ik_provenance p JOIN pane_state s ON s.live=p.target_id
    WHERE p.job_id=? AND p.destination=? AND p.target_kind='site-revision' AND p.reversed=0`)
    .bind(job, context.destination).first()
  if (published) throw new Error('This imported revision is published. Publish another revision before undoing this import.')
  return undoD1Import(job, context)
}
