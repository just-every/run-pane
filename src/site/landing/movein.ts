// 05 · Move in: Hollis & Pine's migration report, its old-to-new address map,
// the 212-of-212 ring and the four steps to cutover.
import { eyebrow, heading, nb, ok, picture } from './parts'

const moved: [string, string][] = [
  ['Pages', '46 (29 keep their address, 17 renamed)'],
  ['Journal', '128 posts · 211 comments (186 approved, 17 pending, 8 spam), threading kept'],
  ['Workshops', '36 events in the events calendar (31 past, 5 upcoming)'],
  ['Galleries', '6 pages rebuilt as gallery blocks · 412 images'],
  ['Media', '1,184 images fetched'],
  ['Forms', '3 (Contact, Wedding inquiry, Workshop waitlist), same fields and same recipients · 940 past submissions imported, not re-sent'],
  ['Shop', '31 products → Stall import file'],
  ['Wedding consultations', 'Acuity link kept'],
  ['Newsletter', '1,406 subscribers → Mango · 62 unsubscribed kept suppressed'],
]
const map: [string, string][] = [
  ['/blog/2025/2/10/peonies-are-back', '/journal/peonies-are-back'],
  ['/events/wreath-making-workshop', '/workshops/wreath-making-workshop'],
  ['/shop/p/autumn-market-bouquet', 'shop.hollisandpineflorist.com/autumn-market-bouquet'],
  ['/new-page-2', '/weddings'],
]
// Break long paths only after a slash or hyphen.
const path = (value: string) => `<code>${value.replace(/([/-])/g, '$1<wbr>')}</code>`

export function movein(): string {
  return `<section class="pn-sec pn-move" aria-labelledby="pn-move-title">
  ${picture('05-left', '', 180, 800, { className: 'pn-move-art-left' })}${picture('05-right', '', 183, 355, { className: 'pn-move-art-right' })}
  <div class="pn-wrap">
    <div class="pn-split-head">
      <div>${eyebrow('mint', ['Move in', 'Hollis &amp; Pine Florist', 'Thu Oct 8 – Mon Oct 19'])}${heading('pn-move-title', '46 pages moved.', '212 old links kept.')}</div>
      <p class="pn-lede">The agent read their Squarespace export and crawled the live site. June saw what would move, what would stay behind and where every old link would land, before anything changed.</p>
    </div>
    <div class="pn-move-grid">
      <article class="pn-card pn-report" aria-label="Migration report">
        <header class="pn-report-head"><h3>Migration report · ${nb('hollisandpineflorist.com')}</h3><p>Ready ${nb('Thu Oct 8')} · ${nb('2:15 PM')} · reviewed by June Hollis</p></header>
        <dl class="pn-report-rows">${moved.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd><span class="pn-gtick" aria-label="moved"></span></div>`).join('')}</dl>
        <div class="pn-report-left"><h4>Listed, not moved</h4><ul><li>3 images already broken on Squarespace</li><li>1 empty member area</li><li>Squarespace traffic and sales history, which stays with Squarespace</li></ul></div>
      </article>
      <article class="pn-card pn-urlmap" aria-label="Old address to new address">
        <h3>Old address → new address</h3>
        <ul class="pn-url-rows">${map.map(([from, to]) => `<li><span class="pn-url-old">${path(from)}</span><span class="pn-url-code"><span>301</span><span class="pn-url-arrow" aria-hidden="true">→</span></span><span class="pn-url-new">${path(to)}</span></li>`).join('')}</ul>
        <div class="pn-ring-wrap"><div class="pn-ring" role="img" aria-label="212 of 212 old links tested on preview"><strong>212</strong><span>of 212</span></div><p>tested on preview ${ok}</p></div>
      </article>
    </div>
    <ol class="pn-timeline">
      <li><strong>${nb('Thu Oct 8')}</strong> · report ready</li>
      <li><strong>${nb('Fri Oct 9, 9:40 AM')}</strong> · applied as a draft · live site unchanged</li>
      <li><strong>${nb('Thu Oct 15')}</strong> · preview checks · 212 of 212 redirects · 3 of 3 forms delivered ${ok}</li>
      <li><strong>${nb('Mon Oct 19, 6:00 AM')}</strong> · cutover ${ok}</li>
    </ol>
  </div>
</section>`
}
