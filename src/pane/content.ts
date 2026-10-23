import { normalizeAutomations } from './schedules'
import { schedulesFromForm } from './ui/schedule-form'
import { normalizePageLinks, pageLinksFromText } from './page-extras'
import { activePages, cleanSlug, folderName, normalizePageOrganization, pageId, pagePath, redirectOffers, structureFromForm } from './pages'
import { normalizeRedirects } from './redirects'
import { redirectsFromForm } from './ui/redirect-settings'
import { normalizeNavigation, normalizeSocials } from './navigation'
import { navigationFromForm } from './ui/navigation-settings'
import { normalizeCampaigns } from './visit-dimensions'
import { goalsFromText, normalizeGoals } from './goals'
import { normalizeResponseDays } from './followups'
import { normalizeAcknowledgment } from './acknowledgment'
import { normalizeEmbed } from './embeds'
import { analyticsFromForm, normalizeAnalytics } from './analytics'
import type { Site, Revision } from './model'
import { normalizeSearch, normalizeRobots } from './search-settings'
// The five pages are a starter template; published snapshots have no fixed inventory.
export const slugs = ['home','about','services','hours','contact']
export function normalizeSite(value: unknown): Site {
 const input = value as Site
 if (!input || typeof input !== 'object' || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.description !== 'string' || input.description.length > 500 || !Array.isArray(input.pages) || !input.pages.length) throw new Error('Provide a business name, description and pages.')
 const pages = input.pages.map(page => {
  if (!page || typeof page.title !== 'string' || !page.title.trim() || page.title.length > 120 || typeof page.body !== 'string' || !page.body.trim() || page.body.length > 20000) throw new Error('Every page needs a title and body (up to 20,000 characters).')
  if(page.policyStarter!==undefined&&!['privacy','terms','accessibility'].includes(page.policyStarter))throw Error('Invalid policy starter.')
  const slug = cleanSlug(page.slug)
  for (const name of ['hidden','deleted','searchBox'] as const) if (page[name] !== undefined && typeof page[name] !== 'boolean') throw Error(`Invalid page ${name}.`)
  if (page.id !== undefined && (typeof page.id !== 'string' || !page.id || page.id.length > 240)) throw Error('Invalid page identity.')
  if (page.kind !== undefined && page.kind !== 'contact') throw Error('Invalid page kind.')
  return {slug, ...(page.policyStarter?{policyStarter:page.policyStarter}:{}), ...(page.id ? {id: page.id} : {}), ...(page.kind ? {kind: page.kind} : {}), ...(page.folder ? {folder: folderName(page.folder)} : {}), ...(page.hidden ? {hidden: true} : {}), ...(page.deleted ? {deleted: true} : {}), title: page.title.normalize('NFC').trim(), body: page.body.normalize('NFC').trim(), ...(page.search ? {search: normalizeSearch(page.search)} : {}), ...(page.embed ? {embed: normalizeEmbed(page.embed)} : {}), ...(page.acknowledgment !== undefined ? {acknowledgment: normalizeAcknowledgment(page.acknowledgment)} : {}), ...(page.searchBox ? {searchBox: true} : {}), ...(page.links !== undefined ? {links: normalizePageLinks(page.links)} : {})}
 })
 const analyticsCampaigns = normalizeCampaigns(input.analyticsCampaigns), goals = normalizeGoals(input.goals,pages), analytics = normalizeAnalytics(input.analytics), responseDays = normalizeResponseDays(input.responseDays)
 const site: Site = {...normalizePageOrganization(input,pages), ...(input.automations !== undefined ? {automations: normalizeAutomations(input.automations)} : {}), ...(input.navigation ? {navigation: normalizeNavigation(input.navigation,pages)} : {}), ...(input.socials ? {socials: normalizeSocials(input.socials)} : {}), ...(analyticsCampaigns.length ? {analyticsCampaigns} : {}), ...(analytics ? {analytics} : {}), ...(goals.length ? {goals} : {}), ...(responseDays ? {responseDays} : {}), name: input.name.normalize('NFC').trim(), description: input.description.normalize('NFC').trim(), pages, ...(input.robots !== undefined ? {robots: normalizeRobots(input.robots)} : {}), ...(input.redirects !== undefined ? {redirects: normalizeRedirects(input.redirects)} : {})}
 const routes = new Set(activePages(site).map(page => pagePath(site,page.slug)))
 for (const redirect of site.redirects ?? []) if (routes.has(redirect.from) || ['/site/search','/site/visit'].includes(redirect.from)) throw Error(`Redirect ${redirect.from} would replace an existing page or service.`)
 return site
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
 const liveRow = await db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
 const offers = redirectOffers(row.site,liveRow ? revision(liveRow).site : null)
 if (offers.length) {row.site.redirectOffers = offers; row.hash = await contentHash(row.site)}
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
/** Apply text fields and structural edits over the immutable revision that was opened. */
export async function siteFromForm(db: D1Database, input: Record<string, unknown>): Promise<Site> {
 const row = input.base ? await db.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(String(input.base)).first() : null
 if (input.base && !row) throw new Error('Revision not found.')
 const base = row ? revision(row).site : null
 const field = (name: string, fallback?: string) => typeof input[name] === 'string' ? String(input[name]).replace(/\r\n/g,'\n') : fallback
 const site: Site = base ? structureFromForm({...base, ...navigationFromForm(input,base), ...redirectsFromForm(input,base), ...schedulesFromForm(input,base)},input.structure) : {name: '',description: '',pages: slugs.map(slug => ({slug,title:'',body:''}))}
 return normalizeSite({...site, name: field('name',site.name), description: field('description',site.description), analyticsCampaigns: typeof input.analyticsCampaigns === 'string' ? input.analyticsCampaigns.split(/\r?\n/).map(label=>label.trim()).filter(Boolean) : site.analyticsCampaigns, goals: typeof input.goals === 'string' ? goalsFromText(input.goals) : site.goals, analytics: analyticsFromForm(input,site.analytics), responseDays: input.responseDays !== undefined ? input.responseDays : site.responseDays,
 pages: site.pages.map(page => {
  const original = base?.pages.find(old => pageId(old) === pageId(page))
  const slug = input.pageId === pageId(page) && typeof input.slug === 'string' ? input.slug : original?.slug ?? page.slug
  const changed = (name:string,previous:unknown) => input[name] !== undefined && input[name] !== previous
  const title = changed(`page.${slug}.title`,original?.title) ? field(`page.${slug}.title`) : page.title
  const visibility = input[`page.${slug}.hidden`]
  const hidden = visibility !== undefined && visibility !== (original?.hidden ? 'yes':'no') ? visibility === 'yes' : page.hidden
  return {...page,title,hidden,body: field(`page.${slug}.body`,page.body),
   acknowledgment: input[`page.${slug}.acknowledgment.enabled`] !== undefined ? (input[`page.${slug}.acknowledgment.enabled`] === 'on' ? {subject: field(`page.${slug}.acknowledgment.subject`),text: field(`page.${slug}.acknowledgment.text`),responseTime: field(`page.${slug}.acknowledgment.responseTime`)} : undefined) : page.acknowledgment,
   embed: input[`page.${slug}.embed.url`] !== undefined ? (field(`page.${slug}.embed.url`)?.trim() ? {url:field(`page.${slug}.embed.url`),title:field(`page.${slug}.embed.title`)} : undefined) : page.embed,
   searchBox: input[`page.${slug}.searchBox`] !== undefined ? input[`page.${slug}.searchBox`] === 'yes' : page.searchBox,
   ...(input[`page.${slug}.links`] !== undefined ? {links:pageLinksFromText(String(input[`page.${slug}.links`]))} : {}),
  }
 })})
}
