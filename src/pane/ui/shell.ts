import { can } from '../roles'
import { activePages } from '../pages'
// The one white top bar every signed-in screen shares: the mark and heavy
// wordmark, the site switcher, the four tabs and the signed-in person.
import branding from '../../branding.json'
import type { Dashboard } from '../model'
import { escape, icon, initials } from './kit'

export type Tab = 'sites' | 'pages' | 'posts' | 'inquiries' | 'moves'
const tabs: [Tab, string, string][] = [['sites', 'Sites', '/app/sites'], ['pages', 'Pages', '/app'], ['posts','Posts','/app/posts'], ['inquiries', 'Inquiries', '/app/inquiries'], ['moves', 'Moves', '/app/moves']]

/** The site's one-line state, as the switcher and the Sites tile say it. */
export function siteStatus(data: Dashboard): string {
  const pending = data.draft && data.draft.id !== data.live?.id
  if (data.live) return `${activePages(data.live.site).length} pages live${pending ? ' + 1 draft' : ''}`
  return data.draft ? 'Draft prepared, not published yet' : 'No pages yet'
}

function switcher(data: Dashboard): string {
  const site = data.draft?.site ?? data.live?.site
  const name = site?.name ?? 'Your site'
  return `<details class="switcher"><summary><span class="site-dot" aria-hidden="true"></span><span class="switcher-name">${escape(name)}</span>${icon('chevron')}<span class="visually-hidden">Switch site</span></summary><div class="popover switcher-pop"><div class="mini-site"><div class="mini-site-top"><strong>${escape(name)}</strong><span aria-hidden="true"></span></div><p>${escape(site?.description || 'Prepare your five pages to start the site.')}</p></div><p class="mini-status">${data.live ? icon('check') : ''}${escape(siteStatus(data))}</p>${data.live ? '<a class="text-link" href="/site">Open live site</a>' : ''}<p class="popover-note">This Pane runs one site. Each business installs its own.</p></div></details>`
}

function account(data: Dashboard): string {
  const owner = data.role.toLowerCase() === 'owner'
  return `<details class="account"><summary class="avatar" data-tip="Account and team">${initials(data.name)}<span class="visually-hidden">Account and team</span></summary><div class="popover account-pop"><strong>${escape(data.name)}</strong><span class="role">${escape(data.roleLabel??data.role)}</span><h2>Team</h2><ul>${data.team.map(person => `<li><span class="avatar avatar-sm" aria-hidden="true">${initials(person.name)}</span><span>${escape(person.name)}</span><span class="role">${escape(person.role)}</span></li>`).join('')}</ul>${owner ? '<a class="text-link" href="/auth/settings/identity">Sign-in settings</a>' : ''}</div></details>`
}

export function shell(data: Dashboard, tab: Tab, body: string): string {
  const unread = data.messages.length
  const home=can(data,'pages:read')?'/app':can(data,'posts:write')?'/app/posts':can(data,'inbox:read')?'/app/inquiries':can(data,'reports:read')?'/app/sites':'/app'
  const allowed: Record<Tab,boolean>={sites:can(data,'pages:read')||can(data,'reports:read'),pages:can(data,'pages:read'),posts:can(data,'posts:write'),inquiries:can(data,'inbox:read'),moves:can(data,'imports:read')}
  const nav = tabs.filter(([id])=>allowed[id]).map(([id, label, href]) => `<a href="${href}"${id === tab ? ' aria-current="page"' : ''}>${label}${id === 'inquiries' && unread ? `<span class="count">${unread}</span>` : ''}</a>`).join('')
  const notice = data.notice ? `<div class="notice" role="status">${icon('check')}<span>${escape(data.notice)}</span></div>` : ''
  return `<div data-workspace-locale="${escape(data.locale??'en-US')}" hidden></div><header class="topbar"><a class="brand" href="${home}"><img src="/brand/mark.svg" alt="" width="40" height="30"><span data-rer-name>${escape(branding.name)}</span></a><span class="topbar-divider" aria-hidden="true"></span>${switcher(data)}<nav class="tabs" aria-label="Workspace">${nav}</nav>${account(data)}</header>${notice}<main id="main" class="screen screen-${tab}">${body}</main><script src="/pane-app.js" defer></script><script src="/pane-tooltip.js" defer></script>`
}
