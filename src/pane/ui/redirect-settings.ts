import { normalizeRedirects, parseRedirectCsv, redirectCsv } from '../redirects'
import type { Redirect, RedirectOffer } from '../redirects'
import type { Site } from '../model'
import { escape } from './kit'

export type RedirectSite = Site & { redirects?: Redirect[]; redirectOffers?: RedirectOffer[] }
const offerKey = (from: string) => `redirect.offer.${encodeURIComponent(from)}`

/** Only submitted fields change the map; imports deliberately replace matching sources. */
export function redirectsFromForm(input: Record<string, unknown>, site: RedirectSite): { redirects?: Redirect[]; redirectOffers?: RedirectOffer[] } {
 const text = (name: string) => {
  if (typeof input[name] !== 'string') throw Error('Redirect fields must contain text.')
  return input[name] as string
 }
 let redirects = normalizeRedirects(site.redirects)
 if (input['redirects.csv'] !== undefined) redirects = parseRedirectCsv(text('redirects.csv'))
 const upsert = (rows: Redirect[]) => {
  const bySource = new Map(redirects.map(row => [row.from, row]))
  for (const row of rows) bySource.set(row.from, row)
  redirects = [...bySource.values()]
 }
 if (input['redirects.import'] !== undefined) {
  const imported = text('redirects.import')
  if (imported.trim()) upsert(parseRedirectCsv(imported))
 }
 // Optional native form action for integrations which provide named controls.
 if (input['redirect.action'] !== undefined) {
  if (input['redirect.action'] !== 'add') throw Error('Unknown redirect action.')
  const status = text('redirect.status')
  if (status !== '301' && status !== '302') throw Error('Choose redirect status 301 or 302.')
  upsert(normalizeRedirects([{ from: text('redirect.from'), to: text('redirect.to'), status: Number(status) }]))
 }
 const offers: RedirectOffer[] = []
 for (const offer of site.redirectOffers ?? []) {
  const prefix = offerKey(offer.from), accept = input[`${prefix}.accept`]
  if (accept !== undefined && accept !== 'no' && accept !== 'yes') throw Error('Choose whether to add the suggested redirect.')
  if (accept !== 'yes') { offers.push({ ...offer }); continue }
  const status = text(`${prefix}.status`)
  if (status !== '301' && status !== '302') throw Error('Choose redirect status 301 or 302.')
  upsert(normalizeRedirects([{ from: offer.from, to: text(`${prefix}.to`), status: Number(status) }]))
 }
 return { ...(site.redirects !== undefined || redirects.length || input['redirects.csv'] !== undefined || input['redirects.import'] !== undefined || input['redirect.action'] !== undefined ? { redirects: normalizeRedirects(redirects) } : {}), ...(site.redirectOffers !== undefined ? { redirectOffers: offers } : {}) }
}

/** Fields inside the existing autosave form; no publication or network actions. */
export function redirectSettings(site: RedirectSite): string {
 const status = (name?: string) => `<select${name ? ` name="${escape(name)}"` : ''} data-redirect-status aria-label="Redirect status"><option value="301">301 — Permanent</option><option value="302">302 — Temporary</option></select>`
 const offers = (site.redirectOffers ?? []).map(offer => {
  const prefix = offerKey(offer.from)
  return `<fieldset data-redirect-offer data-redirect-source="${escape(offer.from)}"><legend>${escape(offer.from)} — page ${escape(offer.reason)}</legend><label>Redirect target<input name="${escape(prefix)}.to" data-redirect-target value="${escape(offer.to)}" autocomplete="off"></label>${status(`${prefix}.status`)}<label>Add this redirect?<select name="${escape(prefix)}.accept" data-redirect-accept aria-label="Add this redirect?"><option value="no">No</option><option value="yes">Yes</option></select></label></fieldset>`
 }).join('')
 return `<details class="redirect-settings" data-redirect-settings><summary>Redirects</summary><p class="help">Redirects take effect when you publish this draft. Sources must be exact /site paths. Targets can be /site paths or full HTTP or HTTPS URLs. Choose 301 for a permanent move or 302 for a temporary move.</p><fieldset data-redirect-add-fields><legend>Add a redirect</legend><label>From<input data-redirect-from placeholder="/site/old-page" autocomplete="off"></label><label>To<input data-redirect-to placeholder="/site/new-page" autocomplete="off"></label>${status()}<button type="button" data-redirect-add>Add redirect</button><p class="help">Adding an existing source replaces its target and status.</p></fieldset><label for="redirects-csv">Redirect map (CSV)</label><textarea id="redirects-csv" name="redirects.csv" data-redirect-csv rows="7" spellcheck="false" aria-describedby="redirects-format">${escape(redirectCsv(normalizeRedirects(site.redirects)))}</textarea><p id="redirects-format" class="help">Use the header from,to,status, then one redirect per row. Quote fields containing commas. Edit a row to change a redirect, or remove its row to delete it.</p><label for="redirects-import">Import CSV</label><textarea id="redirects-import" name="redirects.import" data-redirect-import rows="4" spellcheck="false" placeholder="from,to,status"></textarea><p class="help">Imported rows are added to the map. Matching sources replace their current target and status.</p><button type="button" data-redirect-import-button>Import redirects</button><p data-redirect-message role="status" aria-live="polite"></p>${offers ? `<section aria-label="Suggested redirects"><h3>Suggested redirects</h3><p class="help">Review each move and choose Yes to add it to this draft.</p>${offers}</section>` : ''}</details>`
}
