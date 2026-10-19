// 07 · Domain & booking: brightsideyoga.com pinned onto the studio's tile, the
// launch rail, and Saturday's class card drawn from the record (16 mats, 14 booked).
import { eyebrow, heading, nb, ok, picture } from './parts'

const stops: [string, string][] = [
  ['Mon Oct 19', "Registered in Naomi's own account"],
  ['Fri Oct 23, 9:58 AM', `Connected · apex primary · ${nb('www → apex 301')}`],
  ['10:03 AM', `HTTPS certificate issued · good to ${nb('Thu Jan 21, 2027')} · renews itself`],
  ['10:04 AM', `Live ${ok} · alias ${nb('brightsideyogaavl.com → 301')}`],
  ['10:05 AM', 'Sitemap sent to Google Search Console and Bing'],
]
const sources: [string, number][] = [['Instagram', 6], ['Google profile', 4], ['Google search', 2], ['direct', 2]]

export function launch(): string {
  const mats = Array.from({ length: 16 }, (_, index) => `<i class="${index < 14 ? 'is-booked' : 'is-open'}"></i>`).join('')
  return `<section class="pn-sec pn-launch" aria-labelledby="pn-launch-title">
  <div class="pn-wrap pn-center">
    ${eyebrow('violet', ['Domain &amp; booking', 'Brightside Yoga', 'Fri Oct 23 – Sat Oct 24'])}
    ${heading('pn-launch-title', 'Live Friday.', 'Full Saturday.')}
    <p class="pn-lede"><strong>brightsideyoga.com</strong> went live at the apex and www with HTTPS on Friday morning. By Saturday's first class, 14 of 16 mats were booked through Strap.</p>
    <div class="pn-domain">
      ${picture('tile-brightside', '', 189, 192, { className: 'pn-domain-tile' })}
      <p class="pn-domain-pill"><span>https://brightsideyoga.com</span><span class="pn-gdisc" aria-label="live"></span></p>
    </div>
  </div>
  <div class="pn-wrap">
    <ol class="pn-rail">${stops.map(([when, what]) => `<li><span class="pn-gdisc" aria-hidden="true"></span><strong>${nb(when)}</strong><span>${what}</span></li>`).join('')}</ol>
    <article class="pn-card pn-class" aria-label="Saturday Community Flow">
      <h3 class="pn-class-head">Booked via Strap · Saturday Community Flow · ${nb('Sat Oct 24')} · ${nb('9:00 AM')} · ${nb('14 of 16')}</h3>
      <div class="pn-class-body">
        <div><p class="pn-class-label">16 mats · 14 booked · 2 open</p><div class="pn-mats" role="img" aria-label="14 of 16 mats booked">${mats}</div></div>
        <div><p class="pn-class-label">14 bookings from <code>/schedule</code></p>
          <p class="pn-split" role="img" aria-label="Instagram 6, Google profile 4, Google search 2, direct 2">${sources.map(([name, count], index) => `<span class="pn-split-${index}" style="flex-grow:${count}"></span>`).join('')}</p>
          <ul class="pn-split-key">${sources.map(([name, count], index) => `<li><i class="pn-split-${index}"></i>${name} <b>${count}</b></li>`).join('')}</ul>
        </div>
      </div>
    </article>
  </div>
</section>`
}
