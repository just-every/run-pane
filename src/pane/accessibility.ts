import {effectiveSection} from '../../public/pane-site-styles.mjs'
import {collectionPages} from './collection-page'
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5'
import type { Site } from './model'
import type { RichNode } from './sections'
import { activePages } from './pages'
import { escape } from './ui/kit'

export type AccessibilityFinding = { slug: string; message: string; image?:boolean }
type Node = DefaultTreeAdapterMap['node']
// Published theme values from public/site/theme.css. H1–H3 use ink;
// the remaining content inherits body. The public canvas background is white.
const ink = '#1f0717', body = '#4a3a45'
function background(hex = '#ffffff'): number[] {
 const digits = hex.slice(1), expanded = digits.length <= 4 ? [...digits].map(value => value + value).join('') : digits
 const rgb = [0, 2, 4].map(index => parseInt(expanded.slice(index, index + 2), 16))
 const alpha = expanded.length === 8 ? parseInt(expanded.slice(6), 16) / 255 : 1
 return rgb.map(value => value * alpha + 255 * (1 - alpha))
}
function luminance(rgb: number[]): number {
 return rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
}
function contrast(foreground: string, surface: number[]): number {
 const first = luminance(background(foreground)), second = luminance(surface)
 return (Math.max(first, second) + .05) / (Math.min(first, second) + .05)
}
function richTags(nodes: RichNode[]): string[] {
 return nodes.flatMap(node => node.tag === 'text' ? (node.text.trim() ? ['text'] : []) : [node.tag, ...richTags(node.children)])
}

/** Informational draft checks, in the same stored reading order as live output. */
export function accessibilityFindings(site: Site): AccessibilityFinding[] {
 const findings: AccessibilityFinding[] = []
 for (const page of activePages(site)) {
  const warn = (message: string) => findings.push({ slug: page.slug, message })
  let previous = 1 // publicPage always supplies the page title as H1.
  const heading = (tag: string) => {
   if (!/^h[1-6]$/.test(tag)) return
   const level = Number(tag[1])
   if (level === 1) warn('Content has a Heading 1; use a lower heading level because the page title already supplies Heading 1.')
   if (level > previous + 1) warn(`Heading ${level} follows Heading ${previous}; add the missing heading level or change this heading.`)
   previous = level
  }
  if (page.sections) {
   for (const [index, section] of page.sections.entries()) {
    for(const block of section.blocks)for(const image of [block.image,...(block.gallery?.items.map(item=>site.media?.find(asset=>asset.id===item.asset)?.image)??[])])if(image&&!image.decorative&&!image.alt?.trim())findings.push({slug:page.slug,image:true,message:'An image needs alternative text or an explicit decorative mark before publishing.'})
    const tags = section.blocks.filter(block=>block.kind==='text').flatMap(block => [block.format ?? 'p', ...(block.content ? richTags(block.content) : [])])
    tags.forEach(heading)
    const surface = background(effectiveSection(section,site.styles).background??site.styles?.background)
    // At the narrowest published size H1–H3 qualify as large bold text.
    const headingText = tags.some(tag => /^h[1-3]$/.test(tag))
    const bodyText = section.blocks.some(block => block.kind==='text' && !/^h[1-3]$/.test(block.format ?? 'p') && (block.format !== 'div' || !block.content || block.content.some(node => !/^h[1-3]$/.test(node.tag))))
    if (headingText && contrast(site.styles?.heading??ink, surface) < 3) warn(`Section ${index + 1} heading contrast is below 3:1; choose a lighter background.`)
    if (bodyText && contrast(site.styles?.text??body, surface) < 4.5) warn(`Section ${index + 1} text contrast is below 4.5:1; choose a lighter background.`)
   }
   let phonePrevious=1
   for(const section of page.sections.filter(section=>!section.phone?.hidden))for(const block of section.blocks.filter(block=>block.kind==='text'&&!block.phone?.hidden)){
    for(const tag of [block.format??'p',...(block.content?richTags(block.content):[])])if(/^h[1-6]$/.test(tag)){
     const level=Number(tag[1]);if(level>phonePrevious+1)warn(`Phone Heading ${level} follows Heading ${phonePrevious}; restore the hidden parent heading or change this heading.`);phonePrevious=level
    }
   }
  } else if (page.importedHtml) {
   const walk = (node: Node) => {
    if ('tagName' in node) {
     if (['head', 'script', 'style', 'template', 'noscript', 'iframe', 'video', 'audio', 'svg', 'math'].includes(node.tagName) || node.attrs.some(attribute => attribute.name === 'hidden')) return
     heading(node.tagName)
     if (node.tagName === 'img' && !node.attrs.some(attribute => attribute.name === 'alt')) findings.push({slug:page.slug,image:true,message:'An imported image has no alt text; add descriptive alt text or explicitly mark it decorative with empty alt text in the source and re-import.'})
    }
    if ('childNodes' in node) node.childNodes.forEach(walk)
   }
   walk(parseFragment(page.importedHtml))
  }
 }
 return findings
}

export function accessibilityWarnings(site: Site): string {
 const findings = accessibilityFindings(site)
 if (!findings.length) return ''
 return `<section class="card" aria-label="Accessibility warnings"><h2>Accessibility warnings</h2><p>Review these draft issues before publishing.</p><ul>${findings.map(finding => {
  const page = site.pages.find(page => page.slug === finding.slug)!
  const href = `${page.sections ? '/app/canvas' : '/app'}?page=${encodeURIComponent(page.slug)}`
  return `<li>${escape(finding.message)} <a href="${escape(href)}">Review ${escape(page.title)}</a></li>`
 }).join('')}</ul></section>`
}

export function requireImageDescriptions(site:Site):void{const missing=accessibilityFindings({...site,pages:[...site.pages,...collectionPages(site)]}).filter(finding=>finding.image);if(missing.length)throw Error('Accessibility warning: '+missing.map(finding=>finding.slug+': '+finding.message).join(' '))}
