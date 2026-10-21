import type { TrafficBreakdowns } from '../visit-data'
import { escape } from './kit'

export function trafficView(traffic: TrafficBreakdowns): string {
 const names = {day: 'Day', source: 'Referrer source', device: 'Device', location: 'Country or US state', campaign: 'UTM campaign'}
 const labels: Record<string, string> = {phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop', unknown: 'Unknown'}
 return `<section class="card visits-card" aria-labelledby="traffic-title"><h2 id="traffic-title">Traffic details</h2><p class="help">Aggregate visits only. No cookies, visitor IDs, IP addresses or raw referrers. Unknown campaign tags are discarded; visits still count without a campaign.</p>${Object.entries(names).map(([dimension, title]) => {
  const rows = traffic[dimension as keyof TrafficBreakdowns]
  return `<details open><summary>${title}</summary>${rows.length ? `<dl class="traffic-counts">${rows.map(row => `<div><dt>${escape((dimension === 'device' ? labels[row.label] : undefined) ?? (row.label || 'No approved campaign'))}</dt><dd>${row.count.toLocaleString('en-US')}</dd></div>`).join('')}</dl>` : '<p class="help">No visits recorded yet.</p>'}</details>`
 }).join('')}</section>`
}
