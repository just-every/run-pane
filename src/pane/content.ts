import type { Site, Revision } from './model'
export const slugs = ['home','about','services','hours','contact']
export function normalizeSite(value: unknown): Site {
 const input = value as Site
 if (!input || typeof input !== 'object' || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.description !== 'string' || input.description.length > 500 || !Array.isArray(input.pages) || input.pages.length !== 5) throw new Error('Provide a business name, description and exactly five pages.')
 const pages = slugs.map(slug => {
  const page = input.pages.find(p => p?.slug === slug)
  if (!page || typeof page.title !== 'string' || !page.title.trim() || page.title.length > 120 || typeof page.body !== 'string' || !page.body.trim() || page.body.length > 20000) throw new Error(`Page ${slug} needs a title and body (up to 20,000 characters).`)
  return { slug, title: page.title.normalize('NFC').trim(), body: page.body.normalize('NFC').trim() }
 })
 return { name: input.name.normalize('NFC').trim(), description: input.description.normalize('NFC').trim(), pages }
}
// Slate's revision comparison adapted to hash the entire canonical site snapshot,
// including property names, route order and links, rather than only extracted text.
export async function contentHash(site: Site): Promise<string> {
 const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(site)))
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
export function revision(row: any): Revision { return { ...row, site: JSON.parse(row.site) } }
export async function prepare(db: D1Database, actor: string, value: unknown): Promise<Revision> {
 const site = normalizeSite(value), row = { id:crypto.randomUUID(),site,hash:await contentHash(site),actor,created_at:new Date().toISOString() }
 await db.prepare('INSERT INTO pane_revisions(id,site,hash,actor,created_at) VALUES(?,?,?,?,?)').bind(row.id,JSON.stringify(site),row.hash,actor,row.created_at).run()
 return row
}
export async function publish(db:D1Database,actor:string,id:string,action:'publish'|'rollback') {
 const row = await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(id).first()
 if (!row) throw new Error('Revision not found.')
 await db.batch([
  db.prepare('INSERT INTO pane_state(id,live) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET live=excluded.live').bind(id),
  db.prepare('INSERT INTO pane_approvals(id,action,revision,actor,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),action,id,actor,new Date().toISOString())
 ])
 return revision(row)
}
