// Inquiries: what the live Contact page has sent, newest first, as one stream.
import { spamReview } from './spam-review'
import { personPrivacy } from './person-privacy'
import { can } from '../roles'
import type { Dashboard } from '../model'
import { inquiryStatuses } from '../followups'
import { localAt } from '../schedule-time'
import { escape, icon, initials, key, hidden, form, when } from './kit'

const tints = ['gallery', 'contact', 'booking', 'map', 'blog']
const week = 7 * 86400000

const statusNames: Record<string, string> = {new: 'Needs reply', replied: 'Replied', booked: 'Booked', closed: 'Closed', spam: 'Spam'}
const delivery = (status?: string | null) => status === 'accepted' ? 'sent' : status === 'suppressed' ? 'not sent in development or demo' : status === 'failed' ? 'could not be sent' : status === 'uncertain' ? 'outcome unconfirmed' : 'sending'

/** Who owns an enquiry, when a reply is due and what the reminders did. */
function followUp(data: Dashboard, message: Dashboard['messages'][number], manager: boolean): string {
  const status = message.status ?? 'new', people = data.people, zone = data.replyWindow.zone
  const due = message.follow_up_at ? new Date(message.follow_up_at) : null, overdue = status === 'new' && due !== null && due.getTime() < Date.now()
  const facts = [
    `<span class="pill pill-state">${escape(statusNames[status] ?? status)}</span>`,
    `<span class="pill pill-state">${message.assignee ? 'Owner ' + escape(people[message.assignee] ?? 'a former team member') : 'Unassigned'}</span>`,
    status === 'new' && due ? `<span class="pill ${overdue ? 'pill-live-state' : 'pill-state'}">${overdue ? 'Overdue · ' : 'Reply by '}${when(due, 'short',data.timeZone,data.locale)}</span>` : '',
  ].join('')
  const sent = [
    message.reminded_at ? `<li>Reminder to ${escape(people[message.reminder_to ?? ''] ?? 'a former team member')} ${delivery(message.reminder_status)} · ${when(new Date(message.reminded_at), 'short',data.timeZone,data.locale)}</li>` : '',
    message.escalated_at ? `<li>Escalated to ${escape(people[message.escalated_to ?? ''] ?? 'the site owner')} ${delivery(message.escalation_status)} · ${when(new Date(message.escalated_at), 'short',data.timeZone,data.locale)}</li>` : '',
  ].join('')
  const id = escape(message.id)
  const controls = manager ? `<form method="post" action="/app/messages/update" class="followup-form">${key()}${hidden('id', message.id)}<div><label for="status-${id}">Status</label><select id="status-${id}" name="status">${inquiryStatuses.map(name => `<option value="${name}"${name === status ? ' selected' : ''}>${statusNames[name]}</option>`).join('')}</select></div>${`<div><label for="owner-${id}">Owner</label><select id="owner-${id}" name="assignee"><option value="">Unassigned</option>${data.assignees.map(person => `<option value="${escape(person.id)}"${person.id === message.assignee ? ' selected' : ''}>${escape(person.name)}</option>`).join('')}</select></div>`}<div><label for="due-${id}">Follow up by (${escape(zone)})</label><input id="due-${id}" type="datetime-local" name="followUp" value="${message.follow_up_at ? localAt(message.follow_up_at, zone) : ''}"></div><button type="submit" class="secondary small">Save</button></form>` : ''
  return `<div class="followup"><div class="actions">${facts}</div>${sent ? `<ul class="decisions" aria-label="Follow-up">${sent}</ul>` : ''}${controls}</div>`
}

function replies(data:Dashboard,message:Dashboard['messages'][number],manager:boolean):string {
 const history=data.replies.filter(reply=>reply.message_id===message.id)
 return `${history.length?`<h3>Replies</h3><ul>${history.map(reply=>`<li><strong>${escape(reply.subject)}</strong> · ${escape(reply.status)} · ${when(reply.created_at,'short',data.timeZone,data.locale)}<p class="plain-text">${escape(reply.body)}</p></li>`).join('')}</ul>`:''}${manager?`<details><summary>Reply to enquiry</summary><form method="post" action="/app/messages/reply" class="edit-form">${key()}${hidden('id',message.id)}${hidden('confirm','send-reply')}<label>Reply subject<input name="subject" required maxlength="200" value="Re: Your enquiry"></label><label>Reply text<textarea name="body" rows="3" required maxlength="10000"></textarea></label><p class="help">Send this text to the enquirer. Development and demo mail is suppressed; failed or unconfirmed sends are retained without automatic retries.</p><button type="submit" class="secondary small">Send reply</button></form></details>`:''}`
}

export function inquiries(data: Dashboard): string {
  const role = data.role.toLowerCase(), owner = role === 'owner', manager = can(data,'inbox:write')
  const recent = data.messages.filter(message => Date.now() - new Date(message.created_at).getTime() < week).length
  const open = data.messages.filter(message => (message.status ?? 'new') === 'new').sort((a, b) => (a.follow_up_at ?? Infinity) - (b.follow_up_at ?? Infinity))
  const handled = data.messages.filter(message => (message.status ?? 'new') !== 'new')
  const overdue = open.filter(message => message.follow_up_at !== null && message.follow_up_at !== undefined && message.follow_up_at < Date.now()).length
  const card = (message: Dashboard['messages'][number], index: number) => `<li class="card message"><span class="message-avatar tile-${tints[index % tints.length]}" aria-hidden="true">${initials(message.name)}</span><div class="message-body"><div class="message-head"><h2>${escape(message.name)}</h2><span class="message-meta">${escape(message.email)} · ${when(message.created_at, 'short',data.timeZone,data.locale)}</span></div><p class="plain-text">${escape(message.message)}</p>${message.files?.length?`<ul aria-label="Private uploads">${message.files.map(file=>`<li><a href="/app/files/${escape(file.id)}">${escape(file.name)}</a> · ${Math.ceil(file.size/1024)} KB · Private</li>`).join('')}</ul>`:''}${followUp(data, message, manager)}${replies(data,message,manager)}${message.acknowledgment_status && message.acknowledgment_status !== 'not_requested' ? `<p class="help">Acknowledgment: <strong>${escape(message.acknowledgment_status === 'accepted' ? 'Accepted by provider' : message.acknowledgment_status === 'suppressed' ? 'Suppressed in development or demo' : message.acknowledgment_status === 'sending' ? 'Sending — outcome not yet confirmed' : message.acknowledgment_status)}</strong>${message.acknowledgment_provider ? ` · ${escape(message.acknowledgment_provider)}` : ''}. The enquiry is stored independently.</p>` : ''}${owner ? `<details class="erase"><summary>Erase personal data</summary><p>This permanently erases this contact message and the sender's personal data. This cannot be undone.</p>${form('/app/messages/erase', hidden('id', message.id), 'Permanently erase message', 'danger')}</details>` : ''}</div></li>`
  const list = (title: string, id: string, messages: Dashboard['messages'][number][], empty: string) => `<section aria-labelledby="${id}"><h2 id="${id}" class="queue-title">${title} <span class="pill pill-state">${messages.length}</span></h2>${messages.length ? `<ol class="stream">${messages.map(card).join('')}</ol>` : `<p class="help">${empty}</p>`}</section>`
  const exports=data.submissionForms?`<section class="card submission-export" aria-label="Submission export"><details><summary>Download submissions</summary><form method="get" action="/app/submissions/export" class="edit-form"><label>Form<select name="form" aria-label="Form" required>${data.submissionForms.map(form=>`<option value="${escape(form.id)}">${escape(form.name)} · ${escape(form.id)}</option>`).join('')}</select></label><label>From date (UTC)<input type="date" name="from"></label><label>Through date (UTC)<input type="date" name="to"></label><p class="help">Includes every matching structured submission, beyond the latest 100 shown here. Dates include the whole day in UTC. Earlier unstructured inquiries remain in installation archives.</p><button type="submit" class="secondary">Download CSV</button></form></details></section>`:''
  const spam=spamReview(data)
  const stream = data.messages.length
    ? `<div class="queues">${list('Needs reply', 'queue-open', open, 'Every enquiry has been handled.')}${list('Handled', 'queue-handled', handled, 'Replied, booked, closed and spam enquiries are listed here.')}</div>`
    : `<div class="card empty empty-inbox"><img src="/brand/mark.svg" alt="" width="96" height="70"><strong>Your inbox is clear</strong><p>Messages submitted through the live contact page will appear here.</p></div>`
  return `<div class="screen-head"><div><h1>Inquiries</h1><p>Messages from your Contact page. Each one lands here and nowhere else.</p></div></div><div class="inquiries-body">${exports}${stream}${spam}${personPrivacy(data)}<aside class="card summary-card" aria-label="Inbox summary"><dl><div><dt>Needs reply</dt><dd>${open.length}</dd></div><div><dt>Overdue</dt><dd>${overdue}</dd></div><div><dt>This week</dt><dd>${recent}</dd></div><div><dt>All messages</dt><dd>${data.messages.length}</dd></div></dl><p class="help">${icon('contact')}<span>From the form at <a href="/site/contact">/site/contact</a>. Showing the latest 100.</span></p></aside></div>`
}
