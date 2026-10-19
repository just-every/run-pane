// Inquiries: what the live Contact page has sent, newest first, as one stream.
import type { Dashboard } from '../model'
import { escape, form, hidden, icon, initials, when } from './kit'

const tints = ['gallery', 'contact', 'booking', 'map', 'blog']
const week = 7 * 86400000

export function inquiries(data: Dashboard): string {
  const owner = data.role.toLowerCase() === 'owner'
  const recent = data.messages.filter(message => Date.now() - new Date(message.created_at).getTime() < week).length
  const stream = data.messages.length
    ? `<ol class="stream">${data.messages.map((message, index) => `<li class="card message"><span class="message-avatar tile-${tints[index % tints.length]}" aria-hidden="true">${initials(message.name)}</span><div class="message-body"><div class="message-head"><h2>${escape(message.name)}</h2><span class="message-meta">${escape(message.email)} · ${when(message.created_at, 'short')}</span></div><p class="plain-text">${escape(message.message)}</p>${owner ? `<details class="erase"><summary>Erase personal data</summary><p>This permanently erases this contact message and the sender's personal data. This cannot be undone.</p>${form('/app/messages/erase', hidden('id', message.id), 'Permanently erase message', 'danger')}</details>` : ''}</div></li>`).join('')}</ol>`
    : `<div class="card empty empty-inbox"><img src="/brand/mark.svg" alt="" width="96" height="70"><strong>Your inbox is clear</strong><p>Messages submitted through the live contact page will appear here.</p></div>`
  return `<div class="screen-head"><div><h1>Inquiries</h1><p>Messages from your Contact page. Each one lands here and nowhere else.</p></div></div><div class="inquiries-body">${stream}<aside class="card summary-card" aria-label="Inbox summary"><dl><div><dt>This week</dt><dd>${recent}</dd></div><div><dt>All messages</dt><dd>${data.messages.length}</dd></div></dl><p class="help">${icon('contact')}<span>From the form at <a href="/site/contact">/site/contact</a>. Pane keeps the latest 100.</span></p></aside></div>`
}
