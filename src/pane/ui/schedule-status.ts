import type { Dashboard } from '../model'
import type { ScheduleOverview } from '../schedules'
import { escape, form, hidden, short } from './kit'

/** Keep scheduler timestamps in the business zone, rather than the viewer's zone. */
function businessTime(timestamp: number, timeZone: string, locale = 'en-US'): string {
 const date = new Date(timestamp)
 const label = new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium', timeStyle: 'short', timeZone,
 }).format(date)
 return `<time datetime="${date.toISOString()}">${escape(label)} (${escape(timeZone)})</time>`
}

function localTime(occurrence: string, timeZone: string, locale = 'en-US'): string {
 // Format the saved wall-clock fields without converting their business zone.
 const label=new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(occurrence+'Z'))
 return `<time datetime="${escape(occurrence)}">${escape(label)} (${escape(timeZone)})</time>`
}

function reviewReminders(schedules: ScheduleOverview, canReview: boolean, locale = 'en-US'): string {
 if (!schedules.reminders.length) return '<p class="help">No outstanding page review reminders.</p>'
 return `<ul>${schedules.reminders.map(reminder => `<li><p>Quarterly review due ${localTime(reminder.occurrence, reminder.timeZone,locale)} · Revision <code>${short(reminder.revision)}</code></p><ul>${reminder.pages.map(page => `<li><a href="/app?page=${encodeURIComponent(page.slug)}">${escape(page.title)}</a>${canReview ? form('/app/review', hidden('page', page.id) + hidden('reminder', reminder.id), 'Mark reviewed', 'secondary small') : ''}</li>`).join('')}</ul></li>`).join('')}</ul>`
}

function scheduleHistory(schedules: ScheduleOverview, locale = 'en-US'): string {
 if (!schedules.history.length) return '<p class="help">No schedule events recorded yet.</p>'
 return `<ol>${schedules.history.map(event => `<li><strong>${escape(event.kind.replace(/[_-]/g, ' '))}</strong>${event.detail ? `<p class="notice">${escape(event.detail)}</p>` : ''} · ${escape(event.rule)} · Revision <code>${short(event.revision)}</code><p>Scheduled for ${localTime(event.occurrence, event.timeZone,locale)}; processed ${businessTime(event.executedAt, event.timeZone,locale)}.</p></li>`).join('')}</ol>`
}

/** Display persisted scheduler output; rendering never advances the clock or runs rules. */
export function scheduleStatus(data: Dashboard): string {
 const schedules = data.schedules
 if (!schedules) return ''
 const role = data.role.toLowerCase(), canReview = role === 'owner' || role === 'admin'
 const checked = schedules.lastTick === null
  ? 'The scheduler has not checked yet.'
  : `Last checked ${businessTime(schedules.lastTick, schedules.timeZone ?? data.timeZone ?? 'America/New_York',data.locale)}.`
 const due = schedules.draftDue.length
  ? `<p class="notice" role="status">Unapproved schedules are due. The owner must explicitly approve publication before they can affect the live site.</p><ul aria-label="Due schedules awaiting approval">${schedules.draftDue.map(label => `<li>${escape(label)}</li>`).join('')}</ul>`
  : ''
 const banners = schedules.activeBanners.length
  ? `<ul>${schedules.activeBanners.map(banner => `<li data-active-banner="${escape(banner.id)}">${escape(banner.text)}</li>`).join('')}</ul>`
  : '<p class="help">No banners are active on the live site.</p>'
 return `<section class="card visits-card schedule-status" aria-label="Schedules and reviews" aria-labelledby="schedules-title"><h2 id="schedules-title">Schedules and reviews</h2><p>${schedules.timeZone ? `Business time zone: ${escape(schedules.timeZone)}.` : 'No business time zone is configured.'}</p><p>${checked}</p>${due}<h3>Post schedules</h3><ul>${schedules.posts.map(entry=>`<li><a href="/app/posts?id=${encodeURIComponent(entry.postId)}">Open scheduled post</a> · ${entry.failedAt!==null&&entry.failedAt>(entry.failureAction==='expiry'?entry.expiredAt??-1:entry.executedAt??-1)?'Schedule failed — review required':entry.expiredAt!==null?'Unpublished':entry.executedAt!==null?'Published':entry.approved?'Approved':'Awaiting approval'} · ${localTime(entry.occurrence,entry.timeZone,data.locale)} · Source <code>${short(entry.sourceRevision)}</code></li>`).join('')}</ul><h3>Active banners</h3>${banners}<h3>Page review reminders</h3><p class="help">Reminders stay in this workspace; no email is sent. Mark a page reviewed after checking its published content.</p>${reviewReminders(schedules, canReview,data.locale)}<details><summary>Schedule event history</summary><p class="help">Each event records its approved revision and business time.</p>${scheduleHistory(schedules,data.locale)}</details></section>`
}
