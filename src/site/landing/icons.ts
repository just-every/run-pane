const paths = {
  page: '<path d="M7 3h8l5 5v16H7z"/><path d="M15 3v6h5M11 14h5M11 18h5"/>',
  clock: '<circle cx="14" cy="14" r="11"/><path d="M14 7v8h5"/>',
  people: '<circle cx="10" cy="9" r="4"/><path d="M3 24v-3a7 7 0 0 1 14 0v3M19 5a4 4 0 0 1 0 8M21 17a6 6 0 0 1 4 6v1"/>',
  upload: '<path d="M14 19V3M8 9l6-6 6 6M4 18v7h20v-7"/>',
  bin: '<path d="M4 7h20M10 7V3h8v4M7 7l1 18h12l1-18M11 11v10M17 11v10"/>',
  archive: '<path d="M3 4h22v6H3zM5 10v15h18V10M11 15h6"/>',
} as const

export function icon(name: keyof typeof paths): string {
  return `<svg viewBox="0 0 28 28" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`
}
