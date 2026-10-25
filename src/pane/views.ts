import { codeHashes } from './custom-code'
import { permissionsPolicy } from './document-security'
import { analyticsSources, type Analytics } from './analytics'
import { fontHead } from '../base/font-head'
import { themeFrame } from '../base/theme-frame'
import { iconHead } from '../base/icon-head'
import branding from '../branding.json'
import type { Dashboard } from './model'
import { editor } from './ui/editor'
import { inquiries } from './ui/inquiries'
import { escape } from './ui/kit'
import { moves } from './ui/moves'
import { shell, type Tab } from './ui/shell'
import { sites } from './ui/sites'

export async function document(title: string, body: string, kind: 'app' | 'site' = 'app', embedOrigin?: string, analytics?: Analytics, locale = 'en-US', codeSource = ''): Promise<Response> {
  const frame = await themeFrame({ href: '/rer-theme.css', productName: branding.name, accentColor: branding.primaryColor })
  const extra = analyticsSources(analytics)
  const hashes = codeSource ? await codeHashes(codeSource) : []
  const layoutStyles=[...body.matchAll(/<style data-pane-layout>([\s\S]*?)<\/style>/g)].map(match=>'<style>'+match[1]+'</style>').join('')
  const styleHashes = [...(codeSource ? await codeHashes(codeSource,'style') : []),...(layoutStyles?await codeHashes(layoutStyles,'style'):[])]
  const sources = (list: string[]) => list.length ? ' ' + list.join(' ') : ''
  const imagePolicy=(body.includes('src="data:image/png;base64,')||body.includes('data-image-upload'))?frame.policy.replace("img-src 'self'","img-src 'self' data: blob:"):frame.policy
  const policy = extra.image.length ? imagePolicy.replace("img-src 'self'", `img-src 'self'${sources(extra.image)}`) : imagePolicy
  const pageTitle = kind === 'site' ? title : `${title} · ${branding.name}`
  const head = kind === 'site' && iconHead ? frame.head.replace(iconHead, '') : frame.head
  return new Response(`<!doctype html><html lang="${escape(locale)}"${frame.htmlClass}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(pageTitle)}</title>${fontHead}${head}<link rel="stylesheet" href="/pane.css"></head><body class="pane pane-${kind}"><a class="skip-link" href="#main">Skip to content</a>${body}</body></html>`, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'permissions-policy': permissionsPolicy,
      'content-security-policy': `default-src 'none'; script-src 'self'${sources([...extra.script,...hashes])}; connect-src 'self'${sources(extra.connect)}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; ${styleHashes.length ? policy.replace("style-src 'self'","style-src 'self'"+sources(styleHashes)) : policy}${embedOrigin || codeSource ? `; frame-src ${codeSource ? "about: " : ''}${embedOrigin??''}` : ''}`,
    },
  })
}

/** The signed-in screens by path: Pages is the everyday editor at /app. */
export const screens: Record<string, [Tab, string]> = { '/app': ['pages', 'Pages'], '/app/sites': ['sites', 'Sites'], '/app/inquiries': ['inquiries', 'Inquiries'], '/app/moves': ['moves', 'Moves'] }

export function workspace(data: Dashboard, path: string, page: string): string {
  const [tab] = screens[path]
  const body = tab === 'pages' ? editor(data, page) : tab === 'sites' ? sites(data) : tab === 'inquiries' ? inquiries(data) : moves(data)
  return shell(data, tab, body)
}
