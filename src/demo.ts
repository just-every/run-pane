// Demo mode's sample business (Base DEMO.md): Ortega Bakery with two
// months of published versions, one restore, the admin's pending draft, the
// contact inbox and page visits, dated back from `now` at office hours. It runs once after the
// owner exists, never fetches, and writes fixed ids that a repeat leaves unchanged.
import type { Bindings } from './auth.server'
import type { Page } from './pane/model'
import { approvalStatements, draftRevision, revisionStatement } from './pane/content'
import { decisions, owner, site, team, versions } from './pane/demo/bakery'
import { demoClock } from './pane/demo/clock'
import { messages, visits } from './pane/demo/inbox'

export async function seedDemo(env: Bindings, { ownerEmail, now }: { ownerEmail: string; now: Date }): Promise<void> {
  const db = env.DB
  const ownerRow = await db.prepare("SELECT id FROM oa_operators WHERE email=? AND role='owner' AND status='active'").bind(ownerEmail).first<{ id: string }>()
  if (!ownerRow) throw new Error('The demo owner does not exist yet.')
  // Each version changes the pages that were live when it was prepared.
  const at = demoClock(now), pages = new Map<string, Page[]>(), revisions = []
  for (const version of versions) {
    const live = decisions.filter(d => at(d.at) < at(version.at)).at(-1), from = live ? pages.get(versions[live.version].id)! : []
    const next = ['home', 'about', 'services', 'hours', 'contact'].map(slug => ({ slug, ...(version.changes[slug] ?? from.find(page => page.slug === slug)!) }))
    pages.set(version.id, next)
    revisions.push(await draftRevision(version.id, version.actor ?? ownerRow.id, { ...site, pages: next }, at(version.at)))
  }
  const created = now.getTime() - 130 * 86400000
  await db.batch([
    db.prepare('UPDATE oa_operators SET display_name=? WHERE id=?').bind(owner, ownerRow.id),
    // The owner's finished first run: the demo opens on the workspace, not on setup.
    db.prepare('INSERT INTO oa_first_run(singleton,completed_by,completed_at) VALUES(1,?,?) ON CONFLICT(singleton) DO NOTHING').bind(ownerRow.id, now.getTime()),
    db.prepare(`INSERT INTO oa_operators(id,email,display_name,role,status,created_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.email'),json_extract(value,'$.name'),json_extract(value,'$.role'),json_extract(value,'$.status'),? FROM json_each(?) WHERE true ON CONFLICT DO NOTHING`).bind(created, JSON.stringify(team)),
    ...revisions.map(row => revisionStatement(db, row)),
    ...decisions.flatMap(d => approvalStatements(db, { id: d.id, action: d.action, revision: versions[d.version].id, actor: ownerRow.id, created_at: at(d.at) })),
    db.prepare(`INSERT INTO pane_messages(id,name,email,message,created_at) SELECT printf('6f1d2c3a-0000-4000-8000-%012d',400+key),json_extract(value,'$.name'),json_extract(value,'$.email'),json_extract(value,'$.message'),json_extract(value,'$.at') FROM json_each(?) WHERE true ON CONFLICT DO NOTHING`).bind(JSON.stringify(messages.map(m => ({ ...m, at: at(m.at) })))),
    db.prepare(`INSERT INTO pane_visits(day,path,count) SELECT json_extract(value,'$.day'),json_extract(value,'$.path'),json_extract(value,'$.count') FROM json_each(?) WHERE true ON CONFLICT DO NOTHING`).bind(JSON.stringify(visits(now))),
  ])
}
