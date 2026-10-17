import type { D1Database, D1ImportContext } from '../modules/import-kit/src/d1/types.ts'
import { destination, mappingVersion, namespace } from './import-source'
import { revisionTargets } from './import-targets'

export type ImportActor = { id: string; role: string }

/** The HTTP boundary checks the session; every kit boundary rechecks the actor. */
export async function moveInContext(db: D1Database, actor: ImportActor): Promise<D1ImportContext> {
  const current = await db.prepare('SELECT role,status,version FROM oa_operators WHERE id=?').bind(actor.id)
    .first<{ role: string; status: string; version: number }>()
  if (!current || current.status !== 'active' || !['owner', 'admin'].includes(current.role) || current.role !== actor.role) {
    throw new Error('Only an active owner or admin can move in a site.')
  }
  return {
    destination, namespace, mappingVersion, batchSize: 1, maxBatches: 1,
    storage: { database: db, targets: revisionTargets() },
    authorization: {
      principalId: actor.id,
      predicate: (_action, scope) => ({
        sql: `?=? AND EXISTS(SELECT 1 FROM oa_operators
          WHERE id=? AND role=? AND role IN ('owner','admin') AND status='active' AND version=?)`,
        params: [scope, destination, actor.id, actor.role, current.version],
      }),
    },
  }
}
