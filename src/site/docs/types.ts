export type DocsPage = { slug: string; source: string; label: string }
export type DocsSection = { title: string; pages: DocsPage[] }
export type Heading = { id: string; title: string; depth: number }
export type RenderedDoc = DocsPage & { title: string; description: string; html: string; headings: Heading[] }

export const docsHref = (slug: string): string => slug ? `/docs/${slug}` : '/docs'
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!))
