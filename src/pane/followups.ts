import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
import { addBusinessDays, localInstant } from './schedule-time'
import type { Site } from './model'

export const inquiryStatuses = ['new', 'replied', 'booked', 'closed', 'spam'] as const
export type InquiryStatus = typeof inquiryStatuses[number]
type Window = { zone: string; days: number }
type Operator = { id: string; email: string; display_name: string; role: string }
type Due = { id: string; name: string; created_at: string; assignee: string | null; follow_up_at: number; reminded_at: number | null }
type Delivery = 'accepted' | 'suppressed' | 'failed' | 'uncertain'

/** The business's own clock: its schedule time zone, else US Eastern, and a default of one business day. */
export const responseWindow = (site?: Site | null): Window => ({zone: site?.automations?.timeZone ?? 'America/New_York', days: site?.responseDays ?? 1})
export const followUpDue = (site: Site | null | undefined, receivedAt: number) => { const {zone, days} = responseWindow(site); return addBusinessDays(receivedAt, days, zone) }

export function normalizeResponseDays(value: unknown): number | undefined {
 if (value === undefined || value === '') return undefined
 const days = typeof value === 'string' ? Number(value) : value
 if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 10) throw Error('Reply within 1 to 10 business days.')
 return days === 1 ? undefined : days
}

const operators = async (db: D1Database) => (await db.prepare("SELECT id,email,display_name,role FROM oa_operators WHERE status='active' ORDER BY created_at,id").all<Operator>()).results
const siteOwner = (all: Operator[]) => all.find(operator => operator.role === 'owner')

/** The caller is an owner or admin; enquiries are assigned only to people who can act on them. */
export async function updateInquiry(db: D1Database, input: Record<string, unknown>, site: Site | null | undefined, now = Date.now()) {
 const id = String(input.id ?? ''), row = await db.prepare('SELECT status FROM pane_messages WHERE id=?').bind(id).first<{status: InquiryStatus}>()
 if (!row) throw Error('Enquiry not found.')
 const sets: string[] = [], values: unknown[] = []
 let status = row.status
 if (input.status !== undefined && input.status !== '') {
  if (!inquiryStatuses.includes(input.status as InquiryStatus)) throw Error('Choose new, replied, booked, closed or spam.')
  status = input.status as InquiryStatus
 }
 if (input.assignee !== undefined) {
  const assignee = String(input.assignee)
  if (assignee && !(await operators(db)).some(operator => operator.id === assignee && operator.role !== 'member')) throw Error('Assign an enquiry to an active owner or admin.')
  sets.push('assignee=?'); values.push(assignee || null)
 }
 let followUp: number | null | undefined
 if (typeof input.followUp === 'string' && input.followUp) followUp = localInstant(input.followUp, responseWindow(site).zone)
 if (status !== row.status) {
  sets.push('status=?'); values.push(status)
  // Reopening restarts the window and the reminder chain; any other status ends it.
  if (status === 'new') { sets.push('reminded_at=NULL,reminder_to=NULL,reminder_status=NULL,escalated_at=NULL,escalated_to=NULL,escalation_status=NULL'); followUp ??= followUpDue(site, now) }
 }
 if (followUp !== undefined) { sets.push('follow_up_at=?'); values.push(followUp) }
 if (!sets.length) return {id, status}
 await db.prepare(`UPDATE pane_messages SET ${sets.join(',')} WHERE id=?`).bind(...values, id).run()
 return {id, status}
}

async function notify(env: Bindings, to: Operator, id: string, kind: 'reminder' | 'escalation', name: string, receivedAt: string): Promise<Delivery> {
 let sender: ReturnType<typeof operatorMail>
 try { sender = operatorMail(env) } catch { return 'failed' }
 if (!sender || !env.MAIL_FROM?.trim()) return 'failed'
 // Internal mail names the enquirer but never carries their message or contact details.
 const text = `${kind === 'escalation' ? 'Escalation: an' : 'Reminder: an'} enquiry from ${name} (received ${receivedAt}) has had no reply within the response window.\n\nOpen the inbox: ${new URL('/app/inquiries', env.AUTH_ORIGIN).href}`
 const html = `<p>${text.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]!)).replace(/\n/g, '<br>')}</p>`
 try {
  const result = await sender.send({deliveryId: `pane-followup:${id}:${kind}`, from: env.MAIL_FROM, to: [to.email], subject: kind === 'escalation' ? 'Unanswered enquiry escalated' : 'Enquiry needs a reply', text, html, headers: {}})
  return result.status === 'accepted' ? 'accepted' : result.status === 'development' ? 'suppressed' : result.status === 'uncertain' ? 'uncertain' : 'failed'
 } catch (error) {
  return error instanceof Error && error.name === 'MailValidationError' ? 'failed' : 'uncertain'
 }
}

/**
 * Trusted-clock sweep: a new enquiry past its follow-up time reminds its
 * assignee (the site owner when unassigned); one window later, if an assignee
 * was reminded, the site owner is told. Each step is claimed once.
 */
export async function runFollowUps(env: Bindings, now: number) {
 const db = env.DB
 const live = await db.prepare('SELECT r.site FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first<{site: string}>()
 const site: Site | null = live ? JSON.parse(live.site) : null, {zone, days} = responseWindow(site)
 const pending = await db.prepare("SELECT id,created_at FROM pane_messages WHERE status='new' AND follow_up_at IS NULL LIMIT 100").all<{id: string; created_at: string}>()
 for (const row of pending.results) await db.prepare('UPDATE pane_messages SET follow_up_at=? WHERE id=? AND follow_up_at IS NULL').bind(followUpDue(site, Date.parse(row.created_at)), row.id).run()
 const all = await operators(db), owner = siteOwner(all)
 if (!owner) return {reminded: 0, escalated: 0}
 // An enquiry already reminded to the site owner has nobody further to tell.
 const due = (await db.prepare("SELECT id,name,created_at,assignee,follow_up_at,reminded_at FROM pane_messages WHERE status='new' AND follow_up_at<=? AND escalated_at IS NULL AND (reminded_at IS NULL OR reminder_to!=?) ORDER BY follow_up_at,id LIMIT 50").bind(now, owner.id).all<Due>()).results
 let reminded = 0, escalated = 0
 for (const row of due) {
  const received = new Date(row.created_at).toUTCString()
  if (row.reminded_at === null) {
   const to = all.find(operator => operator.id === row.assignee) ?? owner
   const claim = await db.prepare("UPDATE pane_messages SET reminded_at=?,reminder_to=?,reminder_status='sending' WHERE id=? AND status='new' AND reminded_at IS NULL").bind(now, to.id, row.id).run()
   if (!claim.meta.changes) continue
   const status = await notify(env, to, row.id, 'reminder', row.name, received)
   await db.prepare('UPDATE pane_messages SET reminder_status=? WHERE id=?').bind(status, row.id).run()
   reminded++
  } else if (addBusinessDays(row.follow_up_at, days, zone) <= now) {
   const claim = await db.prepare("UPDATE pane_messages SET escalated_at=?,escalated_to=?,escalation_status='sending' WHERE id=? AND status='new' AND escalated_at IS NULL").bind(now, owner.id, row.id).run()
   if (!claim.meta.changes) continue
   const status = await notify(env, owner, row.id, 'escalation', row.name, received)
   await db.prepare('UPDATE pane_messages SET escalation_status=? WHERE id=?').bind(status, row.id).run()
   escalated++
  }
 }
 return {reminded, escalated}
}
