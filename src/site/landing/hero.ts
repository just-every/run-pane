// 01 · The worktable hero: the approved art as a text-free plate, with the
// header, copy and the five record cards set as HTML at the desk's positions.
import { actions, lockup, nb, ok, picture, tick } from './parts'

const card = (key: string, title: string, body: string, extra = '') =>
  `<li class="pn-hcard pn-hcard-${key}">${tick()}<div><p class="pn-hcard-title">${title}${extra}</p><p>${body}</p></div></li>`

const cards = [
  card('hollis', 'Hollis &amp; Pine Florist', `Squarespace import · 46 pages · ${nb(`212 old links → 301 ${ok}`)}`),
  card('kim', 'Kim Law', `Marcus Bell's inquiry · ${nb('intake@')} notice bounced → flagged to Grace Kim → ${nb(`replied 11:42 AM ${ok}`)} · ${nb('Tue Oct 20')}`, '<span class="pn-pill">recovered</span>'),
  card('ortega', 'Ortega Bakery', 'page 87 published · catering, wedding cakes'),
  card('booked', 'Booked via Strap', `Brightside Yoga · ${nb('Sat Oct 24')} · ${nb('9:00 AM')} · ${nb('14 of 16')}`),
  card('delgado', 'Delgado Plumbing', `Wix import · 31 pages · ${nb(`email kept ${ok}`)}`),
].join('')

export function hero(source: string): string {
  return `<section class="pn-hero" aria-labelledby="pn-title">
  <div class="pn-hero-stage"><div class="pn-hero-frame">
    ${picture('hero', 'Five small-business homepages on a worktable: Ortega Bakery, Delgado Plumbing, Brightside Yoga, Kim Law and Hollis & Pine Florist, with hands dropping menu, gallery, booking and photo blocks into them.', 1536, 1024, { widths: [768, 1152, 1536], sizes: '(max-width: 860px) 1px, min(150vh, 100vw, 1620px)', className: 'pn-hero-art', eager: true })}
    <header class="pn-header">${lockup(true)}<nav aria-label="Site"><a href="/docs">Docs</a><a href="/contract">Contract</a><a href="${source}">Source</a></nav></header>
    <div class="pn-hero-copy">
      <h1 id="pn-title"><span>Your</span> <span>website,</span> <span>finally</span> <span>yours.</span></h1>
      <p class="pn-hero-sub">Pane builds your business site visually, moves it over with old links and email kept, and checks every inquiry reaches a person.</p>
      <p class="pn-hero-alt">100% free, open source alternative to <strong>Squarespace</strong>, <strong>Wix</strong> and <strong>WordPress.com</strong></p>
      ${actions(true)}
    </div>
    <ul class="pn-hcards" aria-label="Five businesses this October">${cards}</ul>
  </div></div>
  ${picture('hero-phone', '', 1084, 776, { widths: [640, 1084], sizes: '(max-width: 860px) 100vw, 1px', className: 'pn-hero-phone' })}
</section>`
}
