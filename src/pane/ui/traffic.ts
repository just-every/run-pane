import type { NativeTrafficDimension, TrafficBreakdowns } from '../visit-data'
import { escape } from './kit'

export function trafficView(traffic: TrafficBreakdowns): string {
 const names = {day: 'Day', source: 'Channel', referrer: 'Referrer domain', medium: 'UTM medium', campaignSource: 'UTM source', device: 'Device', location: 'Country or US state', campaign: 'UTM campaign'}
 const labels: Record<string, string> = {phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop', unknown: 'Unknown'}
 return `<section class="card visits-card" aria-labelledby="traffic-title"><h2 id="traffic-title">Traffic details</h2><p class="help">Aggregate visits only. No cookies, visitor IDs, IP addresses or raw referrers. Only referrer domains and approved or known source labels are kept. Unapproved campaign tags count separately without their text.</p>${Object.entries(names).map(([dimension, title]) => {
  const rows = traffic[dimension as NativeTrafficDimension]
  return `<details open><summary>${title}</summary>${rows.length ? `<dl class="traffic-counts">${rows.map(row => `<div><dt>${escape((dimension === 'device' ? labels[row.label] : undefined) ?? (row.label || (dimension === 'campaign' ? 'No campaign tag' : dimension === 'referrer' ? 'Direct or previously unclassified' : 'Not provided')))}</dt><dd>${row.count.toLocaleString('en-US')}</dd></div>`).join('')}</dl>` : '<p class="help">No visits recorded yet.</p>'}</details>`
 }).join('')}</section>${importedTrafficView(traffic.imported)}`
}

function importedTrafficView(imported: TrafficBreakdowns['imported']): string {
 const months = imported.month.map(row => `<div><dt>${escape(row.label)}</dt><dd>${row.count.toLocaleString('en-US')}</dd></div>`).join('')
 const pages = imported.page.map(row => `<div><dt>${escape(row.month)} · ${escape(row.source)} · <code>${escape(row.path)}</code></dt><dd>${row.count.toLocaleString('en-US')}</dd></div>`).join('')
 return `<section class="card visits-card" aria-labelledby="imported-traffic-title"><h2 id="imported-traffic-title">Imported traffic baseline</h2><p class="help">Historical monthly page totals from source exports. These counts are kept separate from visits recorded by Pane.</p>${imported.month.length ? `<dl class="traffic-counts" aria-label="Imported baseline total"><div><dt>Total imported visits</dt><dd>${imported.total.toLocaleString('en-US')}</dd></div></dl><details open><summary>Imported monthly totals</summary><dl class="traffic-counts" aria-label="Imported monthly totals">${months}</dl></details><details open><summary>Imported page rows</summary><dl class="traffic-counts" aria-label="Imported page rows">${pages}</dl></details>` : '<p class="help">No imported traffic baseline yet.</p>'}</section>`
}
