// Small pieces every app screen shares: escaping, one-time form keys, action
// forms, times the browser shows in its own zone (public/pane-app.js) and icons.
export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
export const key = () => `<input type="hidden" name="idempotency" value="${crypto.randomUUID()}">`
export const hidden = (name: string, value: string) => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`
export const form = (action: string, fields: string, label: string, kind = '') => `<form method="post" action="${action}" class="action-form">${key()}${fields}<button type="submit"${kind ? ` class="${kind}"` : ''}>${escape(label)}</button></form>`
export const short = (value: string) => escape(value.slice(0, 8))
export const initials = (name: string) => escape(name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? '').join('').toUpperCase() || '?')

/** A <time> the browser rewrites in the viewer's own zone; until then it reads in UTC. */
export type TimeFormat = 'full' | 'short' | 'day' | 'time'
const fallback: Record<TimeFormat, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
  short: { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  day: { weekday: 'short', month: 'short', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
}
export function when(value: string | Date, format: TimeFormat = 'short'): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return escape(value)
  const text = parsed.toLocaleString('en-US', { ...fallback[format], timeZone: 'UTC' }) + (format === 'day' ? '' : ' UTC')
  return `<time datetime="${parsed.toISOString()}" data-format="${format}">${escape(text)}</time>`
}

const paths: Record<string, string> = {
  home: '<path d="m3 11 9-7 9 7M5 10v10h5v-6h4v6h5V10"/>',
  about: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.6M18 14.5c1.8.8 3 2.7 3 5"/>',
  services: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  contact: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>',
  text: '<path d="M5 6h14M5 10h14M5 14h14M5 18h9"/>',
  form: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h4"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  alert: '<path d="M12 7v6M12 16.5v.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  inbox: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  move: '<path d="M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
}
export const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] ?? paths.text}</svg>`

/** Each of the five pages wears one block-brick colour in the dock, the phone and the tiles. */
export const pageBrick: Record<string, string> = { home: 'gallery', about: 'blog', services: 'booking', hours: 'map', contact: 'contact' }
