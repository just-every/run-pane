import type { Dashboard } from '../model'
import { escape, hidden, key, when } from './kit'
import { shell } from './shell'

export type ContentKind = 'page' | 'post'
export type LifecycleTarget = { kind: ContentKind; id: string; title: string }
export type TrashRow = LifecycleTarget & { deleted_at: string; actor: string; expires_at: string }
export type HistoryRow = {
 revision: string; title: string; body: string; created_at: string; actor: string; state: 'draft' | 'published'
}

const collection = (kind: ContentKind) => kind === 'post' ? {tab:'posts' as const, href:'/app/posts', label:'Posts'} : {tab:'pages' as const, href:'/app', label:'Pages'}
const historyUrl = (target: Pick<LifecycleTarget, 'kind' | 'id'>, revision?: string, before?: string) => '/app/content/history?kind=' + encodeURIComponent(target.kind) + '&id=' + encodeURIComponent(target.id) + (revision === undefined ? '' : '&revision=' + encodeURIComponent(revision)) + (before === undefined ? '' : '&before=' + encodeURIComponent(before))
const actorName = (data: Dashboard, actor: string) => escape(actor)
const timestamp = (data: Dashboard, value: string) => when(value, 'full', data.timeZone, data.locale)
const draftNotice = '<p>Restored content stays a draft until the owner publishes it.</p>'

function restoreForm(base: string, target: Pick<LifecycleTarget, 'kind' | 'id'>, revision?: string): string {
 return `<form method="post" action="/app/content/restore" class="action-form">${key()}${hidden('kind',target.kind)}${hidden('id',target.id)}${hidden('base',base)}${revision === undefined ? '' : hidden('revision',revision)}<button type="submit" class="secondary">${revision === undefined ? 'Restore draft' : 'Restore this version'}</button></form>`
}

/** Rows are already permission-filtered and exclude expired trash. */
export function trashScreen(data: Dashboard, base: string, rows: TrashRow[], kind: ContentKind = 'page'): string {
 const back = collection(kind)
 const items = rows.map(row => `<li class="revision"><span class="revision-dot" aria-hidden="true"></span><article class="revision-card"><div class="revision-head"><strong>${escape(row.title)}</strong><span class="pill">${row.kind === 'post' ? 'Post' : 'Page'}</span></div><p>Deleted by ${actorName(data,row.actor)} · ${timestamp(data,row.deleted_at)}</p><p>Available to restore until ${timestamp(data,row.expires_at)}</p><div class="actions"><a class="text-link" href="${escape(historyUrl(row))}">View history</a>${restoreForm(base,row)}</div></article></li>`).join('')
 const body = `<div class="screen-head"><div><h1>Trash</h1>${draftNotice}</div><a class="text-link" href="${back.href}">Back to ${back.label}</a></div>${rows.length ? `<section class="history" aria-label="Deleted content"><ol class="ribbon">${items}</ol></section>` : '<div class="empty"><strong>No deleted content to restore</strong><p>Deleted content appears here while it is still available to restore.</p></div>'}`
 return shell(data,back.tab,`<section class="screen-sites">${body}</section>`)
}

/** An explicit missing revision never silently previews a different version. */
export function historyScreen(data: Dashboard, base: string, target: LifecycleTarget, rows: HistoryRow[], selectedRevision?: string, before?: string, next?: string): string {
 const back = collection(target.kind)
 const selected = selectedRevision === undefined ? rows[0] : rows.find(row => row.revision === selectedRevision)
 const versions = rows.map(row => `<li class="revision${row.state === 'published' ? ' is-live' : ''}"><span class="revision-dot" aria-hidden="true"></span><article class="revision-card"><div class="revision-head"><strong>${escape(row.title)}</strong><span class="pill ${row.state === 'published' ? 'pill-live-state' : 'pill-state'}">${row.state === 'published' ? 'Published version' : 'Draft version'}</span>${row === selected ? '<span class="pill">Selected</span>' : ''}</div><p>Saved by ${actorName(data,row.actor)} · ${timestamp(data,row.created_at)}</p><a class="text-link" href="${escape(historyUrl(target,row.revision,before))}"${row === selected ? ' aria-current="page"' : ''}>Read version</a></article></li>`).join('')
 const preview = selected ? `<section class="card" aria-labelledby="version-preview-title"><h2 id="version-preview-title">${escape(selected.title)}</h2><p>${selected.state === 'published' ? 'Published version' : 'Draft version'} · Saved by ${actorName(data,selected.actor)} · ${timestamp(data,selected.created_at)}</p>${selected.body ? `<p class="plain-text">${escape(selected.body)}</p>` : '<p>This saved version has no body text.</p>'}${restoreForm(base,target,selected.revision)}</section>` : rows.length ? '<p class="notice" role="status">This version is not available. Choose a saved version below.</p>' : ''
 const older=next?`<p><a class="text-link" href="${escape(historyUrl(target,undefined,next))}">Older versions</a></p>`:''
 const body = `<div class="screen-head"><div><h1>History</h1><p>${escape(target.title)}</p>${draftNotice}</div><a class="text-link" href="${back.href}">Back to ${back.label}</a></div>${rows.length ? `${preview}<section class="history" aria-labelledby="saved-versions-title"><h2 id="saved-versions-title">Saved versions</h2><ol class="ribbon">${versions}</ol></section>` : '<div class="empty"><strong>No saved versions available</strong><p>There are no draft or published versions available for this item.</p></div>'}${older}`
 return shell(data,back.tab,`<section class="screen-sites">${body}</section>`)
}
