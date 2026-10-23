import { businessMarkup } from './locale'
import { importedBody } from './import-body'
import { knownVisitSources, visitMediums } from './visit-dimensions'
import { homeSlug, pagePath } from './pages'
import { goalsOnPage } from './goals'
import { pageExtras } from './page-extras'
import { renderNavigation, renderFooter } from './navigation'
import { embedMarkup } from './embeds'
import { analyticsMarkup } from './analytics'
import type { Site } from './model'
import { escape, key } from './ui/kit'

/** Paragraphs are separated by blank lines; line breaks inside one are kept. */
export const paragraphs = (body: string) => body.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean)

/**
 * One business page. `live` is the published site at /site; `preview` is a
 * revision at /preview/<id>/<slug> under the draft banner; `frame` is the same
 * page inside the editor's desktop preview, linking back to the editor.
 * `quiet` is a visitor who sends Global Privacy Control or Do Not Track.
 */
export function publicPage(site: Site, slug: string, mode: 'live' | 'preview' | 'frame', gpc = false, quiet = false): string {
  const page = site.pages.find(candidate => candidate.slug === slug && !candidate.deleted)
  const pageUrl = (value: string) => mode === 'preview' ? `./${encodeURIComponent(value)}` : mode === 'frame' ? `/app?page=${encodeURIComponent(value)}` : pagePath(site,value)
  let body = page?.importedHtml ? importedBody(page.importedHtml,{navigation:mode!=='live',prefixIds:mode==='frame'?'pn-imported-':'',link:href=>{
   if(!/^\/site(?:[/?#]|$)/.test(href)||mode==='live')return href
   const url=new URL(href,'https://destination.invalid'),target=site.pages.find(candidate=>pagePath(site,candidate.slug)===url.pathname)
   return target?pageUrl(target.slug)+url.search+(mode==='frame'&&url.hash?'#pn-imported-'+url.hash.slice(1):url.hash):href
  }}) : (page ? paragraphs(page.body) : []).map(paragraph => `<p>${escape(paragraph)}</p>`).join('')
  if (page?.layout && !page.importedHtml) body = paragraphs(page.body).map(paragraph => {
   const [heading,...lines] = paragraph.split('\n'), text = lines.map(line=>`<p>${escape(line)}</p>`).join('')
   return page.layout === 'faq' ? `<details><summary>${escape(heading)}</summary>${text}</details>` : `<section><h2>${escape(heading)}</h2>${text}</section>`
  }).join('')
  const contact = (slug === 'contact'||page?.kind==='contact') && page ? `<section class="contact-section" aria-label="Send a message"><h2>Send a message</h2>${mode === 'preview' ? '<p class="notice">This is a draft preview. Contact messages can be sent from the live website.</p>' : ''}<form method="post" action="${escape(pagePath(site,slug))}" class="contact-form">${key()}${mode === 'live' ? '<input type="hidden" name="attribution">' : ''}<fieldset${mode === 'live' ? '' : ' disabled'}><label>Your name<input name="name" required maxlength="120" autocomplete="name"></label><label>Email address<input type="email" name="email" required maxlength="254" autocomplete="email"></label><label>Message<textarea name="message" rows="6" required maxlength="5000"></textarea></label><div class="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabindex="-1" autocomplete="off"></label></div><button type="submit">Send message</button></fieldset></form></section>` : ''
  const banner = mode === 'preview' ? '<div class="preview-banner"><img src="/brand/mark.svg" alt="" width="34" height="25"><strong>Draft preview</strong><span>This revision is not the live website.</span><a href="/app">Back to workspace</a></div>' : ''
  const footer = renderFooter(site,pageUrl)
  return `${banner}<div class="public-site"><div class="public-shell"><header class="public-header"><a class="public-brand" href="${pageUrl(homeSlug(site)!)}">${escape(site.name)}</a>${renderNavigation(site,slug,pageUrl)}</header><main class="public-main${(slug === 'contact'||page?.kind==='contact') ? ' public-contact' : ''}"${mode === 'frame' ? '' : ' id="main"'}><div class="public-copy"><div class="eyebrow">${escape(site.name)}</div><h1>${escape(page?.title ?? 'Page not found')}</h1>${slug === homeSlug(site) && site.description ? `<p class="public-description">${escape(site.description)}</p>` : ''}<div class="public-content">${page ? body+businessMarkup(site,page) : '<p>This page is not available.</p>'}${page ? pageExtras(page,mode==='live') : ''}${page?.embed ? embedMarkup(page.embed, mode === 'live', gpc) : ''}</div></div>${contact}</main>${footer}</div></div>${mode !== 'frame' ? '<script src="/pane-tooltip.js" defer></script>' : ''}${mode === 'live' ? `<script src="/pane-tracker.js" data-sources="${escape(JSON.stringify(knownVisitSources))}" data-mediums="${escape(JSON.stringify(visitMediums))}" data-campaigns="${escape(JSON.stringify(site.analyticsCampaigns ?? []))}" data-goals="${escape(JSON.stringify(goalsOnPage(site.goals, slug)))}" data-page="${escape(slug)}" defer></script>${page?.embed ? '<script src="/pane-embeds.js" defer></script>' : ''}${analyticsMarkup(site.analytics, quiet)}` : ''}`
}
