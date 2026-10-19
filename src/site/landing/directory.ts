// 02 · Five businesses: the lobby directory board on the fuchsia field, with a
// hand sliding the Hollis & Pine row into place.
import { eyebrow, heading, nb, picture } from './parts'

const rows: [key: string, name: string, trade: string, from: string, pages: string, october: string][] = [
  ['ortega', 'Ortega Bakery', `Bakery and catering · ${nb('San Antonio, TX')}`, `WordPress.com, ${nb('Tue Aug 18')}`, '87 · English and Spanish', `Page 87, wedding cakes · ${nb('Thu Oct 22')}`],
  ['delgado', 'Delgado Plumbing', `Plumbing and water heaters · ${nb('Albuquerque, NM')}`, `Wix, ${nb('Mon Oct 12')}`, '31', 'Email kept, a lost link found next morning'],
  ['brightside', 'Brightside Yoga', `Yoga studio · ${nb('Asheville, NC')}`, 'A new site', '8', `Live ${nb('Fri Oct 23')} · ${nb('14 of 16')} mats Saturday`],
  ['kim', 'Kim Law', `Estate planning · ${nb('Chicago, IL')}`, `Squarespace, ${nb('Mon Sep 14')}`, '22', `A bounced notice, answered by ${nb('11:42 AM')}`],
  ['hollis', 'Hollis &amp; Pine Florist', `Flowers and weddings · ${nb('Portsmouth, NH')}`, `Squarespace, ${nb('Mon Oct 19')}`, '46', '212 old links kept'],
]

export function directory(): string {
  const body = rows.map(([key, name, trade, from, pages, october]) => `<div class="pn-dir-row pn-dir-${key}" role="row">`
    + `<div class="pn-dir-biz" role="rowheader">${picture(`thumb-${key}`, '', 158, 100, { className: `pn-thumb pn-bg-${key}` })}<strong>${name}</strong></div>`
    + `<div role="cell"><span class="pn-dir-label">Trade · city</span>${trade}</div><div role="cell"><span class="pn-dir-label">Came from</span>${from}</div>`
    + `<div role="cell"><span class="pn-dir-label">Pages</span>${pages}</div><div role="cell" class="pn-dir-oct"><span class="pn-dir-label">October</span><span>${october}</span><span class="pn-dir-go" aria-hidden="true">→</span></div></div>`).join('')
  return `<section class="pn-sec pn-dir" aria-labelledby="pn-dir-title">
  <div class="pn-wrap pn-center">
    ${eyebrow('lemon', ['Five businesses', 'October 2026'])}
    ${heading('pn-dir-title', 'Five trades.', 'Five sites of their own.')}
    <p class="pn-lede">A bakery, a plumber, a yoga studio, a law office and a florist. Each runs its own site in Pane. Here is what each one did this fall.</p>
  </div>
  <div class="pn-dir-field">
    <div class="pn-dir-board" role="table" aria-label="Five businesses and their October">
      <div class="pn-dir-head" role="row"><span role="columnheader">Business</span><span role="columnheader">Trade · city</span><span role="columnheader">Came from</span><span role="columnheader">Pages</span><span role="columnheader">October</span></div>
      ${body}
      ${picture('02-hand', '', 138, 166, { className: 'pn-dir-hand' })}
    </div>
  </div>
</section>`
}
