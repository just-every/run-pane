// Moves: bring a whole site in from an export, reviewed page by page, applied
// as a draft for approval, and undone while it is still unpublished.
import type { Dashboard, Site } from '../model'
import { escape, icon, key, short, when } from './kit'

const steps = '<ol class="move-steps"><li><span class="tile tile-blog">' + icon('move') + '</span><strong>Paste an export</strong><span>One JSON file of the whole site</span></li><li><span class="tile tile-booking">' + icon('services') + '</span><strong>Review every page</strong><span>Check the import before anything changes</span></li><li><span class="tile tile-contact">' + icon('check') + '</span><strong>Draft for approval</strong><span>The owner previews and publishes it</span></li></ol>'

export function moves(data: Dashboard): string {
  const canEdit = ['owner', 'admin'].includes(data.role.toLowerCase())
  const paste = canEdit
    ? `<form method="post" action="/app/import/dry-run" class="edit-form">${key()}<label for="import-source">Source JSON</label><p class="help" id="source-help">Export format: <code>{"schemaVersion":1,"name":"…","description":"…","pages":[{"slug":"home","title":"…","body":"…"},…]}</code>. Include all five pages.</p><textarea id="import-source" name="source" rows="10" class="code-input" spellcheck="false" required aria-describedby="source-help" placeholder="Paste your exported JSON here"></textarea><div class="form-actions"><button type="submit" class="primary">Check import</button></div></form>`
    : '<p class="access-note">Only owners and admins can import content.</p>'
  const jobs = data.imports.length
    ? `<ul class="job-list">${data.imports.map(job => `<li><span class="job-copy"><strong>Import <code>${short(job.id)}</code></strong><span>${when(job.created_at, 'short')}</span></span><span class="pill pill-job pill-${escape(job.state)}">${escape(job.state)}</span>${canEdit && job.state === 'completed' ? `<form method="post" action="/app/import/undo" class="action-form">${key()}<input type="hidden" name="job" value="${escape(job.id)}"><button type="submit" class="secondary small">Undo import</button></form>` : ''}</li>`).join('')}</ul>`
    : '<div class="empty"><strong>No imports yet</strong><p>Your import checks and applied imports will appear here.</p></div>'
  return `<div class="screen-head"><div><h1>Moves</h1><p>Move a whole site in as an unpublished draft. Nothing goes live until the owner approves it.</p></div></div>${steps}<div class="moves-body"><section class="card" aria-labelledby="paste-title"><h2 id="paste-title">Import a site</h2>${paste}</section><section class="card" aria-labelledby="jobs-title"><h2 id="jobs-title">Moves so far</h2>${jobs}</section></div>`
}

export function moveReview(site: Site, fingerprint: string, source: string): string {
  return `<div class="screen-head"><div><h1>Review your move-in</h1><p>Import <strong>${escape(site.name)}</strong> as an unpublished five-page draft. Preview the draft before the owner publishes it.</p></div></div><div class="review-pages">${site.pages.map(page => `<article class="card"><span class="review-slug">${page.slug === 'home' ? '/site' : `/site/${escape(page.slug)}`}</span><h2>${escape(page.title)}</h2><p class="plain-text">${escape(page.body)}</p></article>`).join('')}</div><div class="card review-actions"><details><summary>Import identity</summary><code>${escape(fingerprint)}</code></details><form method="post" action="/app/import/apply" class="action-form">${key()}<input type="hidden" name="fingerprint" value="${escape(fingerprint)}"><textarea hidden name="source">${escape(source)}</textarea><button type="submit" class="primary">Approve import</button></form><a class="text-link" href="/app/moves">Cancel</a></div>`
}
