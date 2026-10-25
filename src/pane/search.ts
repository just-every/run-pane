import { isProtected } from './access'
import { liveSnapshot } from './outage'
import { capabilities } from './roles'
import { activePages, homeSlug, pagePath } from './pages'
import { operatorAuth, runtimeBindings, type Bindings } from '../auth.server'
import { prepare, revision } from './content'
import type { Revision } from './model'
import { document } from './views'
import { escape } from './ui/kit'
import { searchView } from './search-view'

async function liveRevision(env: Bindings): Promise<Revision | null> {
 if(env.PANE_LIVE)return liveSnapshot(env)
 const row = await env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
 return row ? revision(row) : null
}
const text = (body: string, type: string, status = 200) => new Response(body, {status, headers: {'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'}})

export async function searchResponse(request: Request, original: Bindings): Promise<Response | null> {
 const url = new URL(request.url), path = url.pathname
 if (!['/sitemap.xml', '/robots.txt', '/app/search'].includes(path)) return null
 const env = runtimeBindings(original), origin = new URL(env.AUTH_ORIGIN).origin
 if (path !== '/app/search') {
  if (!['GET', 'HEAD'].includes(request.method)) return text('Method not allowed.', 'text/plain', 405)
  const live = await liveRevision(env)
  if (!live) return text('Website not published.', 'text/plain', 404)
  const body = path === '/robots.txt' ? (live.site.robots ?? 'User-agent: *\nAllow: /site\n') + `\nSitemap: ${origin}/sitemap.xml\n` : `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${activePages(live.site).filter(page => !isProtected(live.site,page) && !page.hidden && page.slug!==live.site.notFound && !page.search?.noindex).map(page => `<url><loc>${escape(origin + pagePath(live.site,page.slug))}</loc><lastmod>${escape(live.created_at)}</lastmod></url>`).join('')}</urlset>`
  return text(request.method === 'HEAD' ? '' : body, path === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8')
 }
 if (request.method === 'POST' && (url.origin !== origin || request.headers.get('Origin') !== origin)) return text('Same-origin request required.', 'text/plain', 403)
 const session = await operatorAuth(env).getSession(request)
 if (!session) return new Response(null, {status: 303, headers: {location: '/signin?returnTo=%2Fapp%2Fsearch'}})
 const caps=await capabilities(env.DB,session.operator)
 if (!caps.includes('pages:write')) return text('An owner or admin must edit search settings.', 'text/plain', 403)
 if (!['GET', 'POST'].includes(request.method)) return text('Method not allowed.', 'text/plain', 405)
 if (request.method === 'POST') {
  if (Number(request.headers.get('content-length') ?? 0) > 40000) return text('Search settings too large.', 'text/plain', 413)
  try {
   const form = await request.formData(), base = String(form.get('base') ?? '')
   const latest = await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC LIMIT 1').first()
   if (!latest || latest.id !== base) return text('A newer draft exists. Reload search settings before saving.', 'text/plain', 409)
   const draft = revision(latest)
   if(!caps.includes('settings:write')&&form.has('robots')&&String(form.get('robots'))!==(draft.site.robots??''))return text('Only owners and admins can change robots rules.','text/plain',403)
   const site = {...draft.site, ...(caps.includes('settings:write')?{robots:String(form.get('robots')??'')}:{}), pages: draft.site.pages.map(page => page.deleted ? page : ({...page, search: {title: String(form.get(`${page.slug}.title`) ?? ''), description: String(form.get(`${page.slug}.description`) ?? ''), canonical: String(form.get(`${page.slug}.canonical`) ?? ''), noindex: form.has(`${page.slug}.noindex`)}}))}
   await prepare(env.DB, session.operator.id, site,base)
   return new Response(null, {status: 303, headers: {location: '/app/search?saved=1'}})
  } catch (error) { return text(error instanceof Error ? error.message : 'Invalid search settings.', 'text/plain', 400) }
 }
 const row = await env.DB.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC LIMIT 1').first()
 if (!row) return document('Search settings', '<main id="main" class="public-shell"><h1>Search settings</h1><p><a href="/app">Prepare your first site</a> before editing search settings.</p></main>')
 return document('Search settings', searchView(revision(row), origin, url.searchParams.has('saved') ? 'Search draft prepared. Review and publish it from Sites.' : '',caps.includes('settings:write')))
}

/** Add search metadata only to business documents; workspace output stays separate. */
export async function searchMetadata(request: Request, response: Response, original: Bindings): Promise<Response> {
 const url = new URL(request.url), preview = url.pathname.startsWith('/preview/'), live = url.pathname === '/site' || url.pathname.startsWith('/site/')
 if (preview) { const headers = new Headers(response.headers); headers.set('x-robots-tag', 'noindex, nofollow'); response = new Response(response.body, {status: response.status, headers}) }
 if ((!preview && !live) || request.method !== 'GET' || response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response
 const env = runtimeBindings(original), parts = url.pathname.split('/')
 let draft: Revision | null
 if (preview) { const row = await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(parts[2]).first(); draft = row ? revision(row) : null }
 else draft = await liveRevision(env)
 if (!draft) return response
 const page = activePages(draft.site).find(page => page.slug === (preview ? decodeURIComponent(parts.slice(3).join('/')) || homeSlug(draft.site) : decodeURIComponent(parts.slice(2).join('/')) || homeSlug(draft.site)))
 if (!page) return response
 const search = page.search ?? {}, canonical = search.canonical || new URL(pagePath(draft.site,page.slug), original.AUTH_ORIGIN).href
 if(!preview&&response.headers.get('x-robots-tag')?.includes('noindex'))return response
 const noindex = isProtected(draft.site,page) || preview || url.origin !== new URL(env.AUTH_ORIGIN).origin || !!original.RER_DEV_ORIGIN || search.noindex
 const headers = new Headers(response.headers)
 if (noindex) headers.set('x-robots-tag', 'noindex, nofollow')
 const title = search.title || draft.site.name
 const updated = new Response(response.body, {status: response.status, headers})
 return new HTMLRewriter().on('title', {element(element) {element.setInnerContent(title)}}).on('head', {element(element) {
  element.append(`<meta name="description" content="${escape(search.description || draft.site.description)}"><link rel="canonical" href="${escape(canonical)}">${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}`, {html: true})
 }}).transform(updated)
}
