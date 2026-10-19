// 10 · Results: five one-page October reports, fanned like paper (built as
// documents, not KPI tiles: critic, 18 Oct), over the 221-inquiries ribbon.
import { eyebrow, heading, nb, ok } from './parts'

type Sheet = { key: string; name: string; span?: string; lines: [string, string][]; note?: string }
const sheets: Sheet[] = [
  { key: 'ortega', name: 'Ortega Bakery', lines: [['Visits', '9,840'], ['Search clicks', '2,310'], ['Inquiries (catering 41, wedding cakes 9, general 14)', '64'], ['Tastings booked', '12']],
    note: `Thanksgiving: your Google profile says closed ${nb('Thu Nov 26')} · hours and banner drafted · approved by Elena ${nb(`8:15 AM ${ok}`)}` },
  { key: 'delgado', name: 'Delgado Plumbing', lines: [['Visits', '4,120'], ['Search clicks', '1,180'], ['Quote requests', '87'], ['Phone taps', '142']],
    note: `4 old Wix addresses redirected · no 404s since ${nb('Oct 13')}` },
  { key: 'brightside', name: 'Brightside Yoga', span: 'live Oct 23–31', lines: [['Visits', '1,260'], ['Search clicks', '140'], ['Class bookings', '58'], ['Inquiries', '9']],
    note: `${nb('Sat Nov 7, 9:00 AM')} class: 16 of 16 booked` },
  { key: 'kim', name: 'Kim Law', lines: [['Visits', '2,050'], ['Consultation requests', '38'], ['Consultations booked', '17']],
    note: `1 bounced notice recovered ${nb('Tue Oct 20')}` },
  { key: 'hollis', name: 'Hollis &amp; Pine Florist', span: 'Oct 19–31', lines: [['Visits', '3,880'], ['Wedding inquiries', '23'], ['Shop orders through Stall', '96']] },
]

export function results(): string {
  return `<section class="pn-sec pn-tint pn-results" aria-labelledby="pn-results-title">
  <div class="pn-wrap pn-center">
    ${eyebrow('lemon', ['Results', 'Mon Nov 2'])}
    ${heading('pn-results-title', 'October,', 'counted in inquiries.')}
    <p class="pn-lede">On the first business day of November each owner got a one-page report: visits, search clicks, inquiries and bookings by source, and anything still unanswered.</p>
  </div>
  <div class="pn-wrap">
    <ol class="pn-sheets">${sheets.map(sheet => `<li class="pn-sheet pn-sheet-${sheet.key}"><article aria-label="${sheet.name} October report">`
      + `<header><h3>${sheet.name}</h3><p>${sheet.span ? nb(sheet.span) : 'October report'}</p></header>`
      + `<dl>${sheet.lines.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}<div class="pn-sheet-zero"><dt>Unanswered</dt><dd>0</dd></div></dl>`
      + `${sheet.note ? `<p class="pn-sheet-note">${sheet.note}</p>` : ''}</article></li>`).join('')}</ol>
    <p class="pn-ribbon pn-ribbon-big">221 inquiries · every one answered by a person</p>
  </div>
</section>`
}
