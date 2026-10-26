import {brandSettings} from '../brand'
import { customCodeSettings } from './custom-code-settings'
import { componentSettings, componentCreation } from './component-settings'
import { placementSettings } from './form-settings'
import { promotionSettings } from './promotion-settings'
import { localeSettings, businessFields } from './locale-settings'
import { pageStatus } from '../page-review'
import { can } from '../roles'
import { scheduleSettings } from './schedule-settings'
import { activePages, homeSlug, pageId, pagePath } from '../pages'
import { pageExtraFields } from '../page-extras'
import { pageOrganization } from './page-organization'
import { redirectSettings } from './redirect-settings'
import { navigationSettings } from './navigation-settings'
// Pages: the phone-first editor (owner pick A). One page bar, the selected page
// on a phone with its heading block selected, the edit card and the not-live
// card hanging off that block, the desktop preview set back beneath them, the
// five pages as bricks along the bottom: one screen on a laptop or larger.
import { trafficSettings } from './traffic-settings'
import { goalSettings } from './goal-settings'
import { analyticsSettings } from './analytics-settings'
import { inquirySettings } from './inquiry-settings'
import type { Dashboard, Page, Site } from '../model'
import { slugs } from '../content'
import { paragraphs, publicPage } from '../public-view'
import { changeSummary, siteChanges, type PageChange } from './changes'
import { escape, form, hidden, icon, key, pageBrick, short, when } from './kit'

const sitePath = (slug: string,site?: Site) => site ? pagePath(site,slug) : slug === 'home' ? '/site' : `/site/${slug}`
const week = 7 * 86400000

function markNote(data: Dashboard, empty: boolean): string {
  if(!can(data,'inbox:read'))return ''
  const recent = data.messages.filter(message => Date.now() - new Date(message.created_at).getTime() < week)
  const newest = data.messages[0]
  const note = empty
    ? '<span class="note"><strong>Start with your five pages</strong><span>or move in a site from Moves.</span></span>'
    : `<a class="note" href="/app/inquiries"><strong>${recent.length} message${recent.length === 1 ? '' : 's'} this week</strong>${newest ? `<span>Newest: ${escape(newest.name)}, ${when(newest.created_at, 'day',data.timeZone,data.locale)}</span>` : '<span>Your inbox is clear.</span>'}</a>`
  return `<aside class="mark-note" aria-label="Pane"><img src="/brand/mark.svg" alt="" width="120" height="88">${note}</aside>`
}

function phoneTop(siteName: string,timeZone?:string,locale?:string): string {
  return `<div class="phone-status"><span>${when(new Date(), 'time',timeZone,locale)}</span><svg class="phone-icons" viewBox="0 0 66 14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0 10h3v4H0zM5 7h3v7H5zM10 4h3v10h-3zM15 1h3v13h-3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M25 6.5a9 9 0 0 1 12 0M28 9.5a4.6 4.6 0 0 1 6 0"/><circle cx="31" cy="12.4" r="1.4" fill="currentColor"/><rect x="43" y="1.5" width="19" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="45.2" y="3.7" width="13" height="6.6" rx="1.4" fill="currentColor"/><path fill="currentColor" d="M63.5 5h1.3a.7.7 0 0 1 .7.7v2.6a.7.7 0 0 1-.7.7h-1.3z"/></svg></div><div class="phone-site"><strong>${escape(siteName)}</strong>${icon('menu')}</div>`
}

function blockRows(site: Site, page: Page, change: PageChange): string {
  const rows = paragraphs(page.body).map((text, index) => {
    const lines = text.split('\n').length, words = text.split(/\s+/).length, mark = change.marks[index]
    return `<li class="block-row${mark === 'same' ? '' : ' is-new'}"><span class="tile tile-blog">${icon('text')}</span><span class="block-copy"><strong>${lines > 1 ? 'List' : 'Text'}</strong> · ${lines > 1 ? `${lines} lines` : `${words} words`}<small>${escape(text.replace(/\n/g, ' · '))}</small></span>${mark === 'same' ? '' : `<span class="pill pill-new">${mark === 'new' ? 'New in draft' : 'Changed'}</span>`}</li>`
  })
  if ((page.kind === 'contact'||page.slug === 'contact')) rows.push(`<li class="block-row"><span class="tile tile-contact">${icon('form')}</span><span class="block-copy"><strong>Form</strong> · Send a message to Inquiries<small>Your name, email address and message</small></span></li>`)
  if (change.removed) rows.push(`<li class="block-row is-removed"><span class="tile tile-plain">${icon('text')}</span><span class="block-copy"><strong>Removed</strong> · ${change.removed} paragraph${change.removed === 1 ? '' : 's'}<small>On the live page, not in this draft</small></span></li>`)
  rows.push(`<li class="block-row block-footer"><span class="tile tile-plain">${icon('menu')}</span><span class="block-copy"><strong>Footer</strong> · On every page<small>${escape([site.name, site.description].filter(Boolean).join(' · '))}</small></span></li>`)
  return `<ol class="phone-blocks" aria-label="Blocks on this page">${rows.join('')}</ol>`
}

function editCard(site: Site, page: Page, base: string, canEdit: boolean, inSync: boolean, canSettings: boolean, owner: boolean): string {
  const fields = canEdit
    ? `<form method="post" action="/app/prepare" class="edit-form" data-autosave>${key()}${hidden('base', base)}${hidden('slug', page.slug)}${hidden('pageId',pageId(page))}${page.slug === homeSlug(site) ? `<details class="site-fields"><summary>Site name and description</summary><div class="edit-form"><label>Site name<input name="name" value="${escape(site.name)}" required maxlength="120" autocomplete="organization"></label><div class="field"><label for="site-description">Description</label><textarea id="site-description" name="description" rows="2" maxlength="500">${escape(site.description)}</textarea></div>${canSettings?trafficSettings(site)+goalSettings(site)+analyticsSettings(site)+inquirySettings(site):''}</div></details>` : ''}${pageOrganization(site)}<details><summary>Visual canvas</summary><p>Edit sections and text on the page, with layout settings and keyboard controls.</p><a class="button secondary" href="/app/canvas?page=${encodeURIComponent(page.slug)}">Open visual canvas</a></details>${redirectSettings(site)}${brandSettings(site)}${navigationSettings(site)}${canSettings?scheduleSettings(site)+promotionSettings(site)+localeSettings(site):''}${owner?customCodeSettings(site,page):''}${componentSettings(site,page)}${placementSettings(site,page)}${businessFields(page)}${pageExtraFields(page)}<details><summary>Page visibility</summary><label for="page-hidden">Show in menus</label><select id="page-hidden" name="page.${page.slug}.hidden"><option value="no"${page.hidden ? '' : ' selected'}>Visible</option><option value="yes"${page.hidden ? ' selected' : ''}>Hidden</option></select></details><label>Page title<input name="page.${page.slug}.title" value="${escape(page.title)}" required maxlength="120"></label><div class="field"><label for="page-text">Text</label><textarea id="page-text"${page.importedHtml||page.sections?' readonly':''} name="page.${page.slug}.body" rows="3" required maxlength="20000" aria-describedby="text-help">${escape(page.body)}</textarea><p class="help in-use" id="text-help">${page.importedHtml?'Imported formatting is preserved. To change this body, edit the source and import it again.':'A blank line starts a new paragraph.'}</p></div>${(page.kind === 'contact'||page.slug === 'contact') ? `<details><summary>Acknowledgment email</summary><p class="help">Optionally send visitors your wording after they submit this form. The owner approves these settings when publishing. Development and demo mail stays off.</p><label>Acknowledgment subject<input name="page.${page.slug}.acknowledgment.subject" value="${escape(page.acknowledgment?.subject ?? '')}" maxlength="200"></label><label for="acknowledgment-wording">Acknowledgment wording</label><textarea id="acknowledgment-wording" name="page.${page.slug}.acknowledgment.text" rows="3" maxlength="5000">${escape(page.acknowledgment?.text ?? '')}</textarea><label>Expected response time<input name="page.${page.slug}.acknowledgment.responseTime" value="${escape(page.acknowledgment?.responseTime ?? '')}" maxlength="200"></label><label for="acknowledgment-enabled">Send acknowledgment</label><select id="acknowledgment-enabled" name="page.${page.slug}.acknowledgment.enabled"><option value="off"${page.acknowledgment ? '' : ' selected'}>Off</option><option value="on"${page.acknowledgment ? ' selected' : ''}>On</option></select></details>` : ''}<details><summary>External embed</summary><p class="help">Add a YouTube, Vimeo, Google Maps, Instagram or Facebook embed URL. Visitors choose whether to load it. Leave the URL blank to remove it.</p><label>Embed title<input name="page.${page.slug}.embed.title" value="${escape(page.embed?.title ?? '')}" maxlength="120"></label><label>Embed URL<input type="url" name="page.${page.slug}.embed.url" value="${escape(page.embed?.url ?? '')}" maxlength="4000"></label>${page.embed ? `<p class="help">Published frame policy: <code>frame-src ${escape(new URL(page.embed.url).origin)}</code>. Workspace and draft previews keep external content off.</p>` : ''}</details><div class="draft-tools"><button type="button" class="secondary small" data-undo disabled>Undo</button><button type="button" class="secondary small" data-redo disabled>Redo</button><span role="status" data-save-status>Changes save automatically as a draft.</span></div><section data-conflict hidden aria-label="Compare draft changes"><h3>Another editor saved changes</h3><p>Your edits are kept in the fields above. Compare the latest page below, then edit your fields to merge, or download your own copy.</p><pre data-latest></pre><div class="form-actions"><button type="button" class="secondary small" data-merge>Save merged draft</button><button type="button" class="secondary small" data-copy>Download my copy</button><button type="button" class="secondary small" data-load>Use latest draft</button></div></section><div class="form-actions"><button type="submit" class="secondary small">Prepare draft revision</button><span class="help in-use">Publishing requires the owner's approval.</span>${inSync ? `<span class="in-sync">${icon('check')}Live matches this page</span>` : ''}</div></form>`
    : `<p class="access-note">You have read-only access to site content.</p>${inSync ? `<span class="in-sync">${icon('check')}Live matches this page</span>` : ''}`
  return `<section class="card edit-card" aria-labelledby="edit-title"><div class="card-title"><h2 id="edit-title">Edit this page</h2><span class="card-path"><span class="visually-hidden">URL </span>${sitePath(page.slug,site)}</span></div>${fields}${canEdit?componentCreation(site,page,base):''}</section>`
}

function alertCard(data: Dashboard, page: Page, change: PageChange, canPreview: boolean): string {
  const draft = data.draft!, site = draft.site, preview = canPreview ? `<a class="button primary" href="/preview/${encodeURIComponent(draft.id)}/${page.slug.split('/').map(encodeURIComponent).join('/')}">Preview this page</a>` : ''
  if (!data.live) return `<section class="card alert-card" aria-labelledby="alert-title"><span class="alert-icon" aria-hidden="true">!</span><h2 id="alert-title">Not published yet <span>· ${sitePath(page.slug,site)}</span></h2><p>Nobody can see the site yet. The owner approves the draft to publish the whole site.</p><div class="alert-actions">${preview}</div></section>`
  if (!change.changed) return `<section class="card alert-card"><h2>Published</h2><p>Save your changes, then send this page for review.</p>${canPreview?form('/app/page-request-review',hidden('base',draft.id)+hidden('page',pageId(page))+hidden('slug',page.slug),'Send page for review','secondary'):''}</section>`
  const published = data.approvals.find(approval => approval.revision === data.live!.id)?.created_at ?? data.live.created_at
  const id=pageId(page), status=pageStatus(data,id)
  const request=data.pageRequests?.find(request=>request.page_id===id&&data.revisions.find(row=>row.id===request.revision)?.site.pages.some(candidate=>pageId(candidate)===id&&JSON.stringify(candidate)===JSON.stringify(page)))
  const fields=hidden('base',draft.id)+hidden('page',id)+hidden('slug',page.slug)
  const review=canPreview?form('/app/page-request-review',fields,'Send page for review','secondary'):''
  const approve=can(data,'publish')&&request?form('/app/page-publish',fields+hidden('request',request.id),'Approve this page','primary'):''
  return `<section class="card alert-card" aria-labelledby="alert-title"><span class="alert-icon" aria-hidden="true">!</span><p class="pill">${status}</p><h2 id="alert-title">Not live yet <span>· ${sitePath(page.slug,site)}</span></h2><p>The live site still shows this page as published ${when(published, 'day',data.timeZone,data.locale)}. This draft changes ${changeSummary(change)}.</p><div class="alert-actions">${preview}<a class="button secondary" href="${sitePath(page.slug,site)}">Open live page</a>${review}${approve}</div></section>`
}

function pageBar(data: Dashboard, slug: string, changed: number, owner: boolean, canPreview: boolean): string {
  const draft = data.draft!, site = draft.site, same = draft.id === data.live?.id
  const by = data.people[draft.actor] ?? 'a former team member'
  const action = owner ? `<span data-publication-action${same ? ' hidden' : ''}>${form('/app/publish', hidden('revision', draft.id), 'Approve & publish', 'primary')}</span>` : same ? '' : canPreview ? `<a class="button primary" href="/preview/${encodeURIComponent(draft.id)}/${homeSlug(site)}">Preview draft</a>` : ''
  const note = same ? 'The live site matches the newest revision' : `Prepared by ${escape(by)}${owner && canPreview ? ` · <a href="/preview/${encodeURIComponent(draft.id)}/${homeSlug(site)}">Preview draft</a>` : ' · the owner approves it'}`
  const live = data.live ? `<span class="pill pill-plain">Live <code>${short(data.live.id)}</code></span>` : '<span class="pill pill-plain">Not published yet</span>'
  return `<div class="pagebar"><div class="pagebar-page"><h1 class="path">${sitePath(slug,site)}</h1><span class="pill pill-state">${same ? 'Live' : 'Draft'}</span><span class="saved">${same ? 'Published' : 'Prepared'} ${when(draft.created_at, 'time',data.timeZone,data.locale)}</span></div><div class="pagebar-tools"><fieldset class="device-toggle"><legend class="visually-hidden">Preview on</legend><label><input type="radio" name="device" value="phone" checked>Phone</label><label><input type="radio" name="device" value="desktop">Desktop</label></fieldset>${!same && data.live ? `<span class="pill pill-changes"><i aria-hidden="true"></i>${changed} of ${activePages(draft.site).length} pages changed</span>` : ''}${live}</div><div class="pagebar-action" data-live="${escape(data.live?.id ?? '')}">${action}<small data-publication-note>${note}</small></div></div>`
}

function dock(pages: { slug: string; title: string }[], slug: string, changed: (slug: string) => boolean, side: string, site?:Site,timeZone?:string,locale?:string): string {
  const bricks = pages.map(page => `<a class="brick brick-${pageBrick[page.slug] ?? 'blog'}" href="/app?page=${encodeURIComponent(page.slug)}"${page.slug === slug ? ' aria-current="page"' : ''}>${icon(page.slug)}<strong>${escape(page.title)}</strong><small>${sitePath(page.slug,site)}</small>${changed(page.slug) ? '<span class="brick-flag">Changed</span>' : ''}</a>`).join('')
  return `<div class="dock"><nav class="bricks" aria-label="Pages"${pages.length>5 ? ' data-many="true"' : ''}>${bricks}</nav><div class="dock-side">${side}<p class="clock">${when(new Date(), 'full',timeZone,locale)}</p></div></div>`
}

function starter(data: Dashboard, canEdit: boolean): string {
  const titles: Record<string, string> = { home: 'Home', about: 'About', services: 'Services', hours: 'Hours', contact: 'Contact' }
  const fields = slugs.map(slug => `<fieldset class="start-page" id="start-${slug}"><legend><span class="tile tile-${pageBrick[slug]}">${icon(slug)}</span>${sitePath(slug)}</legend><label>Page title<input name="page.${slug}.title" value="${titles[slug]}" required maxlength="120"></label><label>Text<textarea name="page.${slug}.body" rows="3" required maxlength="20000"></textarea></label></fieldset>`).join('')
  const card = canEdit
    ? `<section class="card edit-card start-card" aria-labelledby="start-title"><div class="card-title"><h2 id="start-title">Start your site</h2></div><p class="help">Write all five pages. Preparing them makes a draft you preview; the owner publishes it.</p><form method="post" action="/app/prepare" class="edit-form" data-autosave>${key()}<label>Site name<input name="name" required maxlength="120" autocomplete="organization"></label><label>Description<textarea name="description" rows="2" maxlength="500"></textarea></label>${fields}<div class="draft-tools"><button type="button" class="secondary small" data-undo disabled>Undo</button><button type="button" class="secondary small" data-redo disabled>Redo</button><span role="status" data-save-status>Changes save automatically as a draft.</span></div><section data-conflict hidden aria-label="Compare draft changes"><h3>Another editor saved changes</h3><p>Your edits are kept in the fields above. Compare the latest page below, then edit your fields to merge, or download your own copy.</p><pre data-latest></pre><div class="form-actions"><button type="button" class="secondary small" data-merge>Save merged draft</button><button type="button" class="secondary small" data-copy>Download my copy</button><button type="button" class="secondary small" data-load>Use latest draft</button></div></section><div class="form-actions"><button type="submit" class="primary">Prepare draft revision</button><span class="help">Publishing requires the owner's approval.</span></div></form></section>`
    : '<section class="card edit-card"><p class="access-note">You have read-only access to site content.</p></section>'
  const bar = `<div class="pagebar"><div class="pagebar-page"><h1 class="path">/site</h1><span class="pill pill-state">No pages yet</span></div></div>`
  const phone = `<div class="phone" role="region" aria-label="Phone preview"><div class="phone-head">${phoneTop('Your site',data.timeZone,data.locale)}<div class="phone-empty"><div class="empty-window" aria-hidden="true">${icon('contact')}</div><h2>No pages yet</h2><p>Write your five pages in the card, or move in a site you already have.</p><a class="button secondary" href="/app/moves">Move in a site</a></div></div><span class="phone-home" aria-hidden="true"></span></div>`
  return `<script src="/pane-autosave.js" defer></script>${bar}<div class="canvas">${markNote(data, true)}<div class="stage stage-start">${phone}<div class="side"><div class="cardstack">${card}</div></div></div></div>${dock(slugs.map(slug => ({ slug, title: titles[slug] })), '', () => false, '',undefined,data.timeZone,data.locale)}`
}

export function editor(data: Dashboard, requested: string): string {
  const role = data.role.toLowerCase(), owner = role === 'owner', canEdit = can(data,'pages:write')
  if (!data.draft) return starter(data, canEdit)
  const draft = data.draft, site = draft.site, same = draft.id === data.live?.id
  const slug = activePages(site).some(page=>page.slug===requested) ? requested : homeSlug(site)!, page = activePages(site).find(candidate => candidate.slug === slug)!
  const changes = siteChanges(site, data.live?.site, same), change = changes[slug]
  const changed = Object.values(changes).filter(entry => entry.changed).length
  const phone = `<div class="phone" role="region" aria-label="Phone preview of ${escape(page.title)}"><div class="phone-head">${phoneTop(site.name,data.timeZone,data.locale)}<div class="block block-heading is-selected"><span class="block-tag">Heading</span>${change.title ? '<span class="pill pill-new">Changed</span>' : ''}<h2>${escape(page.title)}</h2>${slug === homeSlug(site) && site.description ? `<p>${escape(site.description)}</p>` : ''}</div></div>${blockRows(site, page, change)}<span class="phone-home" aria-hidden="true"></span></div>`
  const desktop = `<section class="desktop" aria-label="Desktop preview of ${escape(page.title)}"><div class="desktop-bar" aria-hidden="true"><i></i><i></i><i></i><span>${sitePath(slug,site)}</span></div><div class="desktop-viewport"><div class="desktop-page">${publicPage(site, slug, 'frame')}</div></div></section>`
  const by = data.people[draft.actor] ?? 'a former team member'
  const chip = `<a class="chip" href="/app/sites#history"><span class="chip-icon">${icon('history')}</span><span class="chip-copy"><strong>${same ? 'Live' : 'Prepared'} · ${escape(by)}</strong><span>Revision <code>${short(draft.id)}</code> · ${when(draft.created_at, 'short',data.timeZone,data.locale)}</span></span>${icon('arrow')}</a>`
  return `<script src="/pane-autosave.js" defer></script>${pageBar(data, slug, changed, owner, canEdit)}<div class="canvas canvas-fit">${markNote(data, false)}<div class="stage">${phone}<div class="side"><div class="cardstack">${editCard(site, page, draft.id, canEdit, Boolean(data.live) && !change.changed,can(data,'settings:write'),owner)}${alertCard(data, page, change, canEdit)}</div>${desktop}</div></div></div>${dock(activePages(site), slug, entry => changes[entry]?.changed ?? false, chip,site,data.timeZone,data.locale)}`
}
