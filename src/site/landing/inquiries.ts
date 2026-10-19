// 08 · Inquiries: the page's one dark band. Kim Law's morning, from the daily
// test through the bounced notice to Marcus Bell's booking (red only on the bounce).
import { eyebrow, heading, nb, ok } from './parts'

type Kind = 'ok' | 'off' | 'bounce' | 'agent'
const log: [time: string, kind: Kind, text: string][] = [
  ['7:00 AM', 'ok', `Daily test inquiry · stored · notice to ${nb('intake@')} accepted · HubSpot ${ok} · labeled test`],
  ['9:30 AM', 'off', `${nb('intake@')} removed with Dana Wu's Microsoft 365 account`],
  ['10:14 AM', 'ok', `Marcus Bell · Free consultation · 'Wills and a trust for our family' · stored ${ok} · HubSpot contact ${ok} · acknowledgement sent ${ok}`],
  ['10:14 AM', 'bounce', `Notice to the firm's ${nb('intake@')} mailbox · bounced: ${nb('550 5.1.10')} recipient not found`],
  ['10:15 AM', 'agent', `Agent: inquiry unread, notice failed · flagged to Grace Kim by push and ${nb(`grace@ ${ok}`)}`],
  ['11:42 AM', 'ok', `Grace replied from Outlook ${ok} · ${nb('1 hr 28 min')}`],
  ['11:50 AM', 'ok', `Notices now go to ${nb('grace@')} · approved by Grace`],
  ['11:53 AM', 'ok', `Test inquiry · stored · notice accepted · HubSpot · Dial booking link · ${nb(`4 of 4 ${ok}`)}`],
  ['11:58 AM', 'ok', `Marcus booked a consultation · ${nb('Thu Oct 22')} · ${nb('2:00 PM')} · via Dial`],
]

export function inquiries(): string {
  return `<section class="pn-sec pn-night" aria-labelledby="pn-inq-title">
  <div class="pn-wrap pn-inq">
    <div class="pn-inq-main">
      ${eyebrow('teal', ['Inquiries', 'Kim Law', 'Tue Oct 20, 7:00 – 11:58 AM CT'])}
      ${heading('pn-inq-title', 'A notice bounced.', 'Grace replied by 11:42.')}
      <ol class="pn-log" aria-label="Tuesday's inquiry log">${log.map(([time, kind, text]) => `<li class="pn-log-${kind}"><time>${time}</time><span class="pn-log-dot" aria-hidden="true"></span><p>${text}</p></li>`).join('')}</ol>
    </div>
    <div class="pn-inq-side">
      <p class="pn-lede"><strong>${nb('intake@')}</strong> was removed with a departing paralegal's account, so Marcus Bell's notice bounced. Pane kept his inquiry, the agent flagged it to Grace, and she replied within 90 minutes.</p>
      <div class="pn-push" aria-label="Push notice on Grace's phone">
        <div class="pn-push-phone"><div class="pn-push-screen"><div class="pn-push-note"><img src="/brand/mark.svg" width="27" height="20" alt=""><p><strong>Pane · Kim Law</strong>Marcus Bell's inquiry didn't reach ${nb('intake@')} (bounced) · reply due by ${nb('Wed 10:14 AM')}</p></div></div></div>
        <p class="pn-push-done">Replied ${nb(`11:42 AM ${ok}`)}</p>
      </div>
      <article class="pn-card pn-route" aria-label="Route to a person">
        <h3>Route to a person</h3>
        <ol>${['Stored', `Notice → ${nb('grace@')}`, 'HubSpot', 'Dial booking link'].map((step, index) => `<li><span class="pn-gdisc pn-gdisc-sm" aria-hidden="true"></span><b>${index + 1}</b>${step}</li>`).join('')}</ol>
        <span class="pn-pill">recovered</span>
      </article>
    </div>
  </div>
  <p class="pn-inq-next">Next daily test ${nb('Wed Oct 21, 7:00 AM')} · ${nb(`4 of 4 ${ok}`)}</p>
</section>`
}
