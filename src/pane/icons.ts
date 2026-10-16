const paths: Record<string, string> = {
  overview: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
  content: '<path d="M6 3h8l5 5v13H6zM14 3v6h5"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  inbox: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
  visits: '<path d="M5 20V12M12 20V4M19 20V8"/>',
  imports: '<path d="M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7"/>',
  approvals: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
}
export const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.content}</svg>`
export const windowBand = '<div class="window-band" aria-hidden="true"></div>'
