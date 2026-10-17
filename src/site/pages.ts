// The run site `rer build --site` writes: the homepage with its Run action,
// /run, Markdown documentation, the not-found page and their public files. Every Run page
// string and command is in run.json; nothing here reads installation data.
import { contractPageHtml } from '../base/contract-page'
import { runPageHtml, siteNotFoundHtml, type RunData, type SiteBuild, type SiteContext } from '../base/run-site'
import { identity } from '../identity'
import run from './run.json'
import { landingHtml } from './landing'
import { docsPages } from './docs'

function landingDocument(): string {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Pane — Your website, open for business</title><meta name="description" content="Five pages and a contact inbox. Preview every change, publish, and roll back in one step.">'
    + '<link rel="icon" href="/brand/mark.svg"><link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/rer-theme.css"><link rel="stylesheet" href="/design-assets/landing.css">'
    + '<style>body{margin:0;background:var(--pane-paper)}</style></head><body>' + landingHtml() + '</body></html>'
}

export function sitePages({ contract }: Partial<SiteContext> = {}): SiteBuild {
  const data: RunData = run
  return {
    pages: [
      { path: '/', html: landingDocument() },
      { path: '/run', html: runPageHtml(identity, data, contract) },
      ...(contract ? [{ path: '/contract', html: contractPageHtml(identity, data, contract) }] : []),
      ...docsPages(),
      { path: '/404', html: siteNotFoundHtml(identity, data, contract) },
    ],
    assets: ['rer-theme.css', 'fonts', 'brand', 'design-assets'],
  }
}
