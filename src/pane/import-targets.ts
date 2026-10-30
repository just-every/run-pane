import type { D1Sql, D1TargetAdapter } from '../modules/import-kit/src/d1/types.ts'
import type { TargetRow } from '../modules/import-kit/src/types.ts'
import { destination as siteDestination, targetKind } from './import-source'

type NativeRevision = { id: string; site: string; hash: string; actor: string; created_at: string; kit_revision: string | null; imported_at: string | null }
type ObservedTarget = TargetRow & { nativeCreatedAt?: string }
type RevisionValue = { site: string; hash: string; actor: string }
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
const fields = `SELECT r.*,i.kit_revision,i.created_at AS imported_at FROM pane_revisions r
  LEFT JOIN pane_import_targets i ON i.revision_id=r.id`

function scope(destination: string, kind: string): void {
  if (destination !== siteDestination || kind !== targetKind) throw new Error('IMPORT_TARGET_SCOPE_MISMATCH')
}

function target(row: NativeRevision): ObservedTarget {
  // An edit to any native field, including its timestamp, must block undo.
  if (!row.kit_revision || row.created_at !== row.imported_at) throw new Error('NATIVE_EDIT_CONFLICT')
  return {
    destination: siteDestination, targetKind, targetId: row.id, revision: row.kit_revision,
    value: { site: row.site, hash: row.hash, actor: row.actor }, nativeCreatedAt: row.created_at,
  }
}

/** All returned writes are inert SQL, committed with the kit's journal. */
export function revisionTargets(): D1TargetAdapter {
  const createdAt = new Date().toISOString()
  return {
    async read(db, destination, kind, id) {
      scope(destination, kind)
      const row = await db.prepare(`${fields} WHERE r.id=?`).bind(id).first<NativeRevision>()
      return row ? target(row) : undefined
    },
    matches(row, destination, kind, id) {
      scope(destination, kind)
      if (!row) return sql(`NOT EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)
        AND NOT EXISTS(SELECT 1 FROM pane_import_targets WHERE revision_id=?)`, id, id)
      const value = row.value as RevisionValue
      const timestamp = (row as ObservedTarget).nativeCreatedAt ?? createdAt
      return sql(`EXISTS(SELECT 1 FROM pane_revisions r JOIN pane_import_targets i ON i.revision_id=r.id
        WHERE r.id=? AND r.site IS ? AND r.hash IS ? AND r.actor IS ? AND r.created_at IS ?
        AND i.kit_revision IS ? AND i.created_at IS ?)`,
      id, value.site, value.hash, value.actor, timestamp, row.revision, timestamp)
    },
    matchesCount(count, destination) {
      scope(destination, targetKind)
      return sql('(SELECT COUNT(*) FROM pane_import_targets)=?', count)
    },
    write(row) {
      scope(row.destination, row.targetKind)
      const value = row.value as RevisionValue
      // This importer only creates revisions; it never overwrites an existing one.
      return [
        sql('INSERT INTO pane_revisions(id,site,hash,actor,created_at) VALUES(?,?,?,?,?)',
          row.targetId, value.site, value.hash, value.actor, createdAt),
        sql('INSERT INTO pane_import_targets(revision_id,kit_revision,created_at) VALUES(?,?,?)',
          row.targetId, row.revision, createdAt),
      ]
    },
    remove(destination, kind, id) {
      scope(destination, kind)
      // The strict kit postcondition rolls back the whole batch if publication or
      // an ordinary immutable save changes eligibility after Pane's preflight.
      return [sql(`DELETE FROM pane_revisions WHERE id=?
        AND NOT EXISTS(SELECT 1 FROM pane_state WHERE live=?)
        AND id=(SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)`, id, id)]
    },
    async list(db, destination) {
      scope(destination, targetKind)
      const rows = await db.prepare(`${fields} WHERE i.revision_id IS NOT NULL ORDER BY r.id`).all<NativeRevision>()
      return rows.results.map(target)
    },
  }
}
