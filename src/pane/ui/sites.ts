import { siteTools } from './site-tools'
import { can } from '../roles'
import { activityView } from './activity'
import { scheduleStatus } from './schedule-status'
import { activePages, homeSlug } from '../pages'
// Sites: the site as one homepage tile with its live and draft state, every
// revision on a ribbon with the owner's decisions on it, and visits by page.
import { trafficView } from './traffic'
import { goalsView } from './goals'
import type { Dashboard, Revision } from '../model'
import { slugs } from '../content'
import { siteChanges } from './changes'
import { searchCheckView } from '../search-checks'
import { siteStatus } from './shell'
import { escape, form, hidden, icon, pageBrick, short, when } from './kit'

function tile(data: Dashboard, owner: boolean, canPreview: boolean): string {
  const site = data.draft?.site ?? data.live?.site
  const pending = data.draft && data.draft.id !== data.live?.id ? data.draft : null
  const actions = [
    data.live ? '<a class="button secondary" href="/site">Open live site</a>' : '',
    pending && canPreview ? `<a class="button secondary" href="/preview/${encodeURIComponent(pending.id)}/${homeSlug(pending.site)}">Preview draft</a>` : '',
    pending && owner ? form('/app/publish', hidden('revision', pending.id), 'Approve & publish', 'primary') : '',
    site && canPreview ? '<a class="button secondary" href="/app/search">Search settings</a>' : site ? '' : '<a class="button primary" href="/app">Start your site</a>',
  ].join('')
  const nav = site ? `<ul class="tile-pages">${activePages(site).map(page => `<li class="tile-${pageBrick[page.slug] ?? 'blog'}">${escape(page.title)}</li>`).join('')}</ul>` : ''
  return `<section class="site-tile" aria-labelledby="site-name"><div class="site-tile-top"><span class="site-dot" aria-hidden="true"></span><h1 id="site-name">${escape(site?.name ?? 'Your site')}</h1></div><p class="site-tile-desc">${escape(site?.description || 'Prepare your five pages to start the site.')}</p>${nav}<p class="site-tile-status">${data.live ? icon('check') : ''}${escape(siteStatus(data))}</p><div class="actions">${actions}</div></section>`
}

function stateCards(data: Dashboard): string {
  const card = (label: string, revision: Revision | null, empty: string, extra = '') => `<article class="card state-card"><div class="state-label"><span class="status-dot ${label === 'Live now' ? 'live' : 'draft'}" aria-hidden="true"></span>${label}</div>${revision ? `<p class="state-id"><code>${short(revision.id)}</code> · ${when(revision.created_at, 'short',data.timeZone,data.locale)}</p><p>Prepared by ${escape(data.people[revision.actor] ?? 'a former team member')}</p>${extra}` : `<p>${empty}</p>`}</article>`
  const pending = data.draft && data.draft.id !== data.live?.id ? data.draft : null
  const changes = pending ? siteChanges(pending.site, data.live?.site, false) : {}
  const changed = pending?.site.pages.filter(page => changes[page.slug]?.changed) ?? []
  return `<div class="state-cards">${card('Live now', data.live, 'Your site will appear here after the owner approves a revision.')}${card('Draft · awaiting approval', pending, 'No draft prepared. Edit a page to prepare one.', data.live && changed.length ? `<p class="state-changes">Changes ${changed.map(page => `<a href="/app?page=${page.slug}">${escape(page.title)}</a>`).join(', ')}</p>` : '')}</div>`
}

function ribbon(data: Dashboard, owner: boolean, canPreview: boolean): string {
  if (!data.revisions.length) return `<div class="empty"><strong>No revision history</strong><p>Your first prepared revision will appear here.</p></div>`
  // Restore puts back a site that was live before; a draft that never was is approved and published like on the tile.
  const once = new Set(data.approvals.map(approval => approval.revision))
  const rows = data.revisions.map(revision => {
    const decisions = data.approvals.filter(approval => approval.revision === revision.id).map(approval => `<li>${approval.action === 'rollback' ? 'Restored' : 'Published'} ${when(approval.created_at, 'short',data.timeZone,data.locale)} · ${escape(data.people[approval.actor] ?? 'a former team member')}</li>`).join('')
    const live = revision.id === data.live?.id, draft = revision.id === data.draft?.id && !live
    return `<li class="revision${live ? ' is-live' : ''}"><span class="revision-dot" aria-hidden="true"></span><div class="revision-card"><div class="revision-head"><strong><code>${short(revision.id)}</code></strong>${live ? '<span class="pill pill-live-state">Live</span>' : ''}${draft ? '<span class="pill pill-state">Draft</span>' : ''}<span class="revision-time">${when(revision.created_at, 'short',data.timeZone,data.locale)}</span></div><p>${escape(revision.site.name)} · Prepared by ${escape(data.people[revision.actor] ?? 'a former team member')}</p>${decisions ? `<ul class="decisions" aria-label="Decisions">${decisions}</ul>` : ''}<div class="actions">${canPreview ? `<a class="text-link" href="/preview/${encodeURIComponent(revision.id)}/${homeSlug(revision.site)}">Preview</a>` : ''}${!owner || live ? '' : once.has(revision.id) ? form('/app/rollback', hidden('revision', revision.id), 'Restore live', 'secondary small') : draft ? form('/app/publish', hidden('revision', revision.id), 'Approve & publish', 'primary small') : ''}</div></div></li>`
  }).join('')
  return `<ol class="ribbon">${rows}</ol>`
}

/** Visits per page in the dock's order, named as the site names them. */
function visits(data: Dashboard): string {
  const total = data.visits.reduce((sum, visit) => sum + visit.count, 0), pages = (data.live ?? data.draft)?.site.pages ?? []
  const rows = [...data.visits].sort((a, b) => slugs.indexOf(a.path) - slugs.indexOf(b.path))
  const label = (path: string) => `<span class="visit-page"><span>${escape(pages.find(page => page.slug === path)?.title ?? path)}</span><small>${path === 'home' ? '/site' : `/site/${escape(path)}`}</small></span>`
  const list = data.visits.length ? `<ul class="visit-list">${rows.map(visit => `<li><span class="tile tile-${pageBrick[visit.path] ?? 'blog'}">${icon(visit.path)}</span>${label(visit.path)}<strong>${visit.count.toLocaleString('en-US')}</strong></li>`).join('')}<li class="visit-total"><span></span><span>All pages</span><strong>${total.toLocaleString('en-US')}</strong></li></ul>` : '<div class="empty"><strong>No visits recorded yet</strong><p>Page visits will appear after people open your live site.</p></div>'
  return `<section class="card visits-card" id="visits" aria-labelledby="visits-title"><h2 id="visits-title">Visits by page</h2><p class="help">Recorded activity on the live website. Previews are excluded.</p>${list}</section>`
}

export function sites(data: Dashboard): string {
  const role = data.role.toLowerCase(), owner = role === 'owner', canPreview = can(data,'pages:write')
  if(!can(data,'pages:read'))return `<h1>Reports</h1>${visits(data)}${goalsView(data.goals,slug=>slug)}${trafficView(data.traffic)}`
  return `<div class="sites-top">${tile(data, owner, canPreview)}${stateCards(data)}</div>${scheduleStatus(data)}${canPreview && data.draft ? searchCheckView(data.draft.site) : ''}<div class="sites-body"><section class="history" id="history" aria-labelledby="history-title"><h2 id="history-title">Every revision, kept</h2><p class="help">Preview saved revisions. The owner can restore one that was live before; each decision is recorded on its revision.</p>${ribbon(data, owner, canPreview)}</section>${can(data,'reports:read')?`${visits(data)}${goalsView(data.goals, slug => (data.live ?? data.draft)?.site.pages.find(page => page.slug === slug)?.title ?? slug)}${trafficView(data.traffic)}`:''}${siteTools(data)}${activityView(data)}</div>`
}
