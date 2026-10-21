import { normalizeAcknowledgment } from './acknowledgment'
import { normalizeEmbed } from './embeds'
import type { Site, Revision } from './model'
import { normalizeSearch, normalizeRobots } from './search-settings'
export const slugs = ['home','about','services','hours','contact']
export function normalizeSite(value: unknown): Site {
 const input = value as Site
 if (!input || typeof input !== 'object' || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.description !== 'string' || input.description.length > 500 || !Array.isArray(input.pages) || input.pages.length !== 5) throw new Error('Provide a business name, description and exactly five pages.')
 const pages = slugs.map(slug => {
  const page = input.pages.find(p => p?.slug === slug)
  if (!page || typeof page.title !== 'string' || !page.title.trim() || page.title.length > 120 || typeof page.body !== 'string' || !page.body.trim() || page.body.length > 20000) throw new Error(`Page ${slug} needs a title and body (up to 20,000 characters).`)
  return { slug, title: page.title.normalize('NFC').trim(), body: page.body.normalize('NFC').trim(), ...(page.search ? { search: normalizeSearch(page.search) } : {}), ...(page.embed ? {embed: normalizeEmbed(page.embed)} : {}), ...(page.acknowledgment !== undefined ? {acknowledgment: normalizeAcknowledgment(page.acknowledgment)} : {}) }
 })
 return { name: input.name.normalize('NFC').trim(), description: input.description.normalize('NFC').trim(), pages, ...(input.robots !== undefined ? { robots: normalizeRobots(input.robots) } : {}) }
}
// Slate's revision comparison adapted to hash the entire canonical site snapshot,
// including property names, route order and links, rather than only extracted text.
export async function contentHash(site: Site): Promise<string> {
 const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(site)))
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
export function revision(row: any): Revision { return { ...row, site: JSON.parse(row.site) } }
// One revision row and one recorded approval: the statements prepare and publish
// write, and the demo's history (src/demo.ts) writes with fixed ids and times.
export function revisionStatement(db: D1Database, row: Revision): D1PreparedStatement {
 return db.prepare('INSERT INTO pane_revisions(id,site,hash,actor,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(row.id,JSON.stringify(row.site),row.hash,row.actor,row.created_at)
}
export function approvalStatements(db: D1Database, approval: { id: string; action: 'publish'|'rollback'; revision: string; actor: string; created_at: string }): D1PreparedStatement[] {
 return [
  db.prepare('INSERT INTO pane_state(id,live) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET live=excluded.live').bind(approval.revision),
  db.prepare('INSERT INTO pane_approvals(id,action,revision,actor,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(approval.id,approval.action,approval.revision,approval.actor,approval.created_at),
 ]
}
export async function draftRevision(id: string, actor: string, value: unknown, created_at: string): Promise<Revision> {
 const site = normalizeSite(value)
 return { id, site, hash: await contentHash(site), actor, created_at }
}
export class DraftConflict extends Error {
 constructor(public latest: Revision | null) { super('Another editor saved a newer draft. Compare their changes before saving yours.') }
}
export async function prepare(db: D1Database, actor: string, value: unknown, expectedBase?: string): Promise<Revision> {
 const latest = await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
 // Keep revision ordering stable even when saves share a millisecond.
 const created = new Date(Math.max(Date.now(), latest ? Date.parse(String(latest.created_at)) + 1 : 0)).toISOString()
 const row = await draftRevision(crypto.randomUUID(), actor, value, created)
 if (expectedBase === undefined) await revisionStatement(db, row).run()
 else {
  // Compare and insert in one statement: two saves of the same base cannot both win.
  const result = await db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at)
   SELECT ?,?,?,?,? WHERE COALESCE((SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1),'')=?`)
   .bind(row.id, JSON.stringify(row.site), row.hash, row.actor, row.created_at, expectedBase).run()
  if (!result.meta.changes) {
   const current = await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first()
   throw new DraftConflict(current ? revision(current) : null)
  }
 }
 return row
}
export async function publish(db:D1Database,actor:string,id:string,action:'publish'|'rollback') {
 const row = await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
 if (!row) throw new Error('Revision not found.')
 if (action === 'rollback' && !await db.prepare('SELECT 1 FROM pane_approvals WHERE revision=? LIMIT 1').bind(id).first()) throw new Error('Only a revision that was live before can be restored. Approve and publish this draft instead.')
 await db.batch(approvalStatements(db, { id: crypto.randomUUID(), action, revision: id, actor, created_at: new Date().toISOString() }))
 return revision(row)
}
/**
 * The site a form prepares: the editor's one page (`page.<slug>.title` and
 * `.body`, plus name and description on Home) over the revision it was opened
 * from (`base`), or all five pages and the name when the site is new.
 */
export async function siteFromForm(db: D1Database, input: Record<string, unknown>): Promise<Site> {
 const row = input.base ? await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(String(input.base)).first() : null
 if (input.base && !row) throw new Error('Revision not found.')
 const base = row ? revision(row).site : null
 const field = (name: string, fallback?: string) => typeof input[name] === 'string' ? String(input[name]).replace(/\r\n/g, '\n') : fallback
 return normalizeSite({
  name: field('name', base?.name), description: field('description', base?.description ?? ''),
  ...(base?.robots !== undefined ? { robots: base.robots } : {}),
  pages: slugs.map(slug => { const page = base?.pages.find(p => p.slug === slug); return { slug, ...(page?.search ? { search: page.search } : {}), acknowledgment: input[`page.${slug}.acknowledgment.enabled`] !== undefined ? (input[`page.${slug}.acknowledgment.enabled`] === 'on' ? {subject: field(`page.${slug}.acknowledgment.subject`), text: field(`page.${slug}.acknowledgment.text`), responseTime: field(`page.${slug}.acknowledgment.responseTime`)} : undefined) : page?.acknowledgment, embed: input[`page.${slug}.embed.url`] !== undefined ? (field(`page.${slug}.embed.url`)?.trim() ? {url: field(`page.${slug}.embed.url`), title: field(`page.${slug}.embed.title`)} : undefined) : page?.embed, title: field(`page.${slug}.title`, page?.title), body: field(`page.${slug}.body`, page?.body) } }),
 })
}
