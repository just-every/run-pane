// 09 · Search: Delgado's daily clicks to /water-heater-repair with the 404
// spike on the old address, beside the agent's finding and Ray's approval.
import { eyebrow, heading, nb, ok, tick } from './parts'

// Oct 5 … Oct 19: daily search clicks, and 404 visits on /copy-of-water-heater-repair.
const clicks = [9, 8, 10, 7, 9, 8, 7, 5, 8, 10, 9, 8, 9, 9, 8]
const misses: Record<number, number> = { 7: 16, 8: 4 }
const labels: Record<number, string> = { 0: 'Oct 5', 3: 'Oct 8', 7: 'Oct 12', 10: 'Oct 15', 14: 'Oct 19' }

export function search(): string {
  const days = clicks.map((count, index) => `<li><span class="pn-bar" style="--v:${count}" title="${count} clicks"></span>`
    + (misses[index] ? `<span class="pn-bar pn-bar-404" style="--v:${misses[index]}" title="${misses[index]} visits to the old address"></span>` : '')
    + (labels[index] ? `<span class="pn-bar-x">${labels[index]}</span>` : '') + '</li>').join('')
  return `<section class="pn-sec pn-search" aria-labelledby="pn-search-title">
  <div class="pn-wrap">
    <div class="pn-split-head">
      <div>${eyebrow('sky', ['Search', 'Delgado Plumbing', 'Tue Oct 13'])}${heading('pn-search-title', 'One old link,', 'found the next morning.')}</div>
      <p class="pn-lede">Wix had been redirecting an old address that no crawl could see. The morning after cutover, the agent traced its 404s to Google, Yelp and the Google profile, and drafted the fix.</p>
    </div>
    <div class="pn-search-grid">
      <article class="pn-card pn-chart" aria-label="Daily search clicks to /water-heater-repair, October 5 to 19">
        <h3>/water-heater-repair · daily search clicks</h3>
        <div class="pn-chart-area">
          <ul class="pn-chart-y" aria-hidden="true"><li>20</li><li>15</li><li>10</li><li>5</li><li>0</li></ul>
          <div class="pn-chart-plot">
            <ol class="pn-bars">${days}</ol>
            <span class="pn-mark pn-mark-cut"><span>cutover ${nb('Mon Oct 12,')} ${nb('9:00 AM')}</span></span>
            <span class="pn-mark pn-mark-fix"><span>fixed ${nb('Tue Oct 13,')} ${nb('7:12 AM')}</span></span>
          </div>
        </div>
        <p class="pn-chart-sum">20 visits hit the 404 in 22 hours · none since ${nb('7:12 AM')} · clicks ${nb('Oct 5–11: 58')} · ${nb('Oct 13–19: 61')}</p>
        <p class="pn-chart-key"><span><i class="pn-key-clicks"></i>search clicks</span><span><i class="pn-key-404"></i>404s on the old address</span></p>
      </article>
      <article class="pn-card pn-find" aria-label="The agent's finding">
        <p class="pn-approved">${tick()}<span>Approved by Ray Delgado · ${nb('7:12 AM')} · live ${ok}</span></p>
        <h3>Agent · ${nb('Tue Oct 13')} · ${nb('6:00 AM MT')}</h3>
        <ul>
          <li>${tick()}<p>${nb('/copy-of-water-heater-repair')} → 404 · 19 visits since cutover · Google search 9 · Yelp 6 · Google profile link 4</p></li>
          <li>${tick()}<p>Evidence: the old Wix site, still kept, answers it with a 301 to ${nb('/water-heater-repair')} · Search Console: 23 clicks in September landed on this address</p></li>
          <li>${tick()}<p>3 more from Search Console's 16 months: ${nb('/copy-of-drain-cleaning,')} ${nb('/services-1,')} ${nb('/blank-2')}</p></li>
          <li>${tick()}<p>Draft: 4 redirects · Google profile service link → ${nb('/water-heater-repair')}</p></li>
        </ul>
      </article>
    </div>
  </div>
</section>`
}
