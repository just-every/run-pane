// 06 · Email kept: Delgado's seven DNS records and Hollis & Pine's three
// forwarding aliases, joined by one ribbon. No mail clip art (critic, 18 Oct).
import { eyebrow, heading, nb, ok, tick } from './parts'

const dns: [type: string, name: string, to: string, status: 'kept' | 'changed'][] = [
  ['MX', '@', 'smtp.google.com', 'kept'],
  ['TXT', '@', 'v=spf1 include:_spf.google.com ~all', 'kept'],
  ['TXT', 'google._domainkey', 'Google DKIM key', 'kept'],
  ['TXT', '_dmarc', 'v=DMARC1; p=quarantine', 'kept'],
  ['TXT', '@', 'google-site-verification', 'kept'],
  ['A', '@', 'Wix → the new site', 'changed'],
  ['CNAME', 'www', 'Wix → the new site', 'changed'],
]
const aliases: [string, string][] = [['orders@', "Theo's Gmail"], ['weddings@', "June's Gmail"], ['catch-all', "June's Gmail"]]

export function email(): string {
  return `<section class="pn-sec pn-tint pn-mail" aria-labelledby="pn-mail-title">
  <div class="pn-wrap pn-center">
    ${eyebrow('teal', ['Email kept', 'Delgado Plumbing Mon Oct 12', 'Hollis &amp; Pine Mon Oct 19'])}
    ${heading('pn-mail-title', 'New site,', 'same inboxes.')}
    <p class="pn-lede">Pane read each domain's records before cutover. Delgado's Google Workspace mailboxes stayed exactly as they were, and Hollis &amp; Pine's Squarespace forwarding was rebuilt and every address proven first.</p>
  </div>
  <div class="pn-wrap pn-mail-grid">
    <article class="pn-card pn-rec pn-rec-delgado" aria-label="Delgado Plumbing DNS records">
      <h3 class="pn-rec-head">delgadoplumbingabq.com</h3>
      <p class="pn-rec-sub">DNS at GoDaddy · read ${nb('Mon Oct 12, 8:40 AM MT')} · 7 records · 5 kept · 2 changed</p>
      <div class="pn-dns" role="table" aria-label="DNS records">
        <div class="pn-dns-row pn-dns-th" role="row"><span role="columnheader">Type</span><span role="columnheader">Name</span><span role="columnheader">Points to</span><span role="columnheader">Status</span></div>
        ${dns.map(([type, name, to, status]) => `<div class="pn-dns-row${status === 'changed' ? ' is-changed' : ''}" role="row"><span role="cell"><b>${type}</b></span><span role="cell">${name}</span><span role="cell" class="pn-dns-to">${to}</span><span role="cell" class="pn-dns-st">${status}${tick('pn-tick-sm')}</span></div>`).join('')}
      </div>
      <p class="pn-rec-foot">Changed by Tina Delgado at GoDaddy ${nb('8:57 AM')} · checked ${ok} · live ${nb('9:00 AM')} · mail records unchanged ${ok} · Tina's test email to ${nb('office@')} arrived ${nb('9:06 AM')}</p>
    </article>
    <article class="pn-card pn-rec pn-rec-hollis" aria-label="Hollis &amp; Pine forwarding">
      <h3 class="pn-rec-head">hollisandpineflorist.com</h3>
      <p class="pn-rec-sub">Mail records point to Squarespace forwarding · flagged as forwarding, not mailboxes</p>
      <ul class="pn-alias">${aliases.map(([from, to]) => `<li><b>${from}</b><span class="pn-alias-arrow" aria-hidden="true">→</span><span>${to}</span><span class="pn-proven">proven ${ok} ${nb('Thu Oct 15')}</span></li>`).join('')}</ul>
      <p class="pn-rec-foot">Rebuilt in June's own account · 3 of 3 proven before cutover · after cutover ${nb('Mon Oct 19, 6:20 AM')}: 3 of 3 delivering ${ok}</p>
    </article>
  </div>
  <div class="pn-wrap"><p class="pn-ribbon">Two moves · 3 mailboxes and 3 aliases · all delivering ${ok}</p></div>
</section>`
}
