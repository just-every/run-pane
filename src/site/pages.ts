// The run site `rer build --site` writes: the homepage with its Run action,
// /run, Markdown documentation, the not-found page and their public files. Every Run page
// string and command is in run.json; nothing here reads installation data.
import { contractPageHtml } from '../base/contract-page'
import { runPageHtml, siteNotFoundHtml, type RunData, type SiteBuild, type SiteContext } from '../base/run-site'
import { siteIdentity as identity } from './identity'
import run from './run.json'
import { landingHtml, landingScript } from './landing'
import { docsPages } from './docs'
import { siteHead } from './head'
import { keepCommands } from './command'

const TITLE = 'Pane — Your website, finally yours.'
const DESCRIPTION = 'Pane builds your business site visually, moves it over with old links and email kept, and checks every inquiry reaches a person. 100% free, open source alternative to Squarespace, Wix and WordPress.com.'

// Base's shared pages print the British "licence"; Pane is a US product.
const usSpelling = (html: string) => html.replaceAll(`${run.licence} licence`, `${run.licence} license`)
// A separator or arrow never starts a line: bind it to the word before it.
const keepSeparators = (html: string) => html.replaceAll(' · ', '\u00a0· ').replaceAll(' → ', '\u00a0→ ')
// The installer line wraps only before its URL, so "| sh" never starts a line (the Copy button copies data-copy).
const installLine = (html: string) => html.replace('<code>curl -fsSL https://runeditrun.com/install.sh | sh</code>', '<code>curl -fsSL <span class="code-word">https://runeditrun.com/install.sh | sh</span></code>')
// rer links favicon-32.svg as "any" size, so browsers draw its face cut at 16 px. Offer the
// faceless 16 px cut first and size each icon, so a 16 px tab draws the frame, glass and leaf.
const ICONS = '<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any"><link rel="icon" href="/favicon-32.svg" type="image/svg+xml" sizes="any">'
const smallIcon = (html: string) => html.replace(ICONS, '<link rel="icon" href="/brand/favicon-16.svg" type="image/svg+xml" sizes="16x16">'
  + '<link rel="icon" href="/favicon-32.svg" type="image/svg+xml" sizes="32x32"><link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16 32x32">')

export function sitePages({ contract }: Partial<SiteContext> = {}): SiteBuild {
  const data: RunData = run
  const pages = [
    { path: '/', html: `<!doctype html><html lang="en"><head>${siteHead(TITLE, DESCRIPTION, ['/site/site.css', '/site/sections.css'])}</head><body class="pn-body">${landingHtml()}<script>${landingScript}</script></body></html>` },
    { path: '/run', html: keepCommands(installLine(usSpelling(runPageHtml(identity, data, contract)))) },
    ...(contract ? [{ path: '/contract', html: usSpelling(contractPageHtml(identity, data, contract)) }] : []),
    ...docsPages(),
    { path: '/404', html: usSpelling(siteNotFoundHtml(identity, data, contract)) },
  ]
  return {
    pages: pages.map(page => ({ ...page, html: smallIcon(keepSeparators(page.html)) })),
    assets: ['rer-theme.css', 'fonts', 'brand', 'site', 'favicon.ico', 'favicon-32.svg', 'apple-touch-icon.png'],
  }
}
