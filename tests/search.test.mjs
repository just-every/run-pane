import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { runtime, origin, settings } from './runtime.mjs'
import { createOperatorAuth } from '../src/modules/operator-auth/index.mjs'
let f, owner, first
const fixture = JSON.parse(await readFile('fixtures/static-site.json', 'utf8'))
const post = (path, body, cookie = owner, headers = {}) => f.request(path, {method: 'POST', headers: {Cookie: cookie ?? '', Origin: origin, 'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body)})
const dashboard = async () => (await f.request('/api/pane', {headers: {Cookie: owner}})).json()
const save = (base, fields = {}, cookie = owner, headers = {}) => f.request('/app/search', {method: 'POST', headers: {Cookie: cookie ?? '', Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...headers}, body: new URLSearchParams({base, robots: 'User-agent: *\nDisallow: /site/hours\n', ...fields})})
const page = async path => (await f.request(path, {headers: {Cookie: owner}})).text()
before(async () => {
 f = await runtime()
 const signIn = await post('/auth/bootstrap', {token: settings.SETUP_TOKEN, displayName: 'Riverbend owner'}, '')
 owner = signIn.headers.get('set-cookie').split(';')[0]
 await f.request('/setup', {method: 'POST', headers: {Cookie: owner, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})
})
after(async () => { await f?.mf.dispose() })

test('health identifies the local deployment and unknown installed paths return 404', async () => {
 const record = {sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), fingerprint: createHash('sha256').update(await readFile('deploy.json')).digest('hex'), versionId: randomUUID()}
 const local = await runtime({bindings: {RER_DEPLOY_SOURCE: record.sourceSha, RER_DEPLOY_FINGERPRINT: record.fingerprint, RER_VERSION: {id: record.versionId}}})
 try {
  const response = await local.request('/health')
  assert.equal(response.status, 200)
  const health = await response.json()
  assert.equal(health.ok, true)
  assert.deepEqual(health.deployment, record)
  assert.equal((await local.request('/unknown-installed-path')).status, 404)
  assert.equal((await f.request('/app/unknown-page', {headers: {Cookie: owner}})).status, 404)
  assert.equal((await f.request('/site/unknown-page')).status, 404)
 } finally { await local.mf.dispose() }
})

test('SEO-001 SEO-003 SEO-004: search drafts, index output, page editing and rollback use the published revision', async () => {
 assert.equal((await f.request('/sitemap.xml')).status, 404)
 first = await (await post('/api/pane/prepare', {site: fixture})).json()
 await post('/api/pane/publish', {revision: first.id})
 const before = await page('/sitemap.xml')
 assert.equal((before.match(/<url>/g) ?? []).length, fixture.pages.length)
 assert.match(before, /<loc>http:\/\/127.0.0.1:8787\/site<\/loc>/)
 assert.match(before, /<lastmod>\d{4}-\d\d-\d\dT/)
 assert.match(await page('/site/services'), new RegExp(`<title>${fixture.name}</title>`))
 const title = 'Furniture repairs & handmade commissions', description = 'Fresh pastries for "your" studio & team.'
 const fields = {'services.title': title, 'services.description': description, 'services.canonical': 'https://cedar-street.example/workshop', 'hours.noindex': 'on'}
 assert.equal((await save(first.id, fields)).status, 303)
 let draft = (await dashboard()).draft
 assert.equal((await page('/sitemap.xml')), before, 'An unpublished draft must not change the index')
 assert.doesNotMatch(await page('/site/services'), /cedar-street.example\/workshop/)
 const preview = await f.request(`/preview/${draft.id}/services`, {headers: {Cookie: owner}})
 assert.match(preview.headers.get('x-robots-tag'), /noindex/)
 assert.match(await preview.text(), /name="robots" content="noindex/)
 const signedOut = await f.request(`/preview/${draft.id}/services`)
 assert.match(signedOut.headers.get('x-robots-tag'), /noindex/)
 const settingsHtml = await page('/app/search')
 assert.ok(settingsHtml.includes(`aria-label="Search preview for ${fixture.pages.find(p => p.slug === 'services').title}"`))
 assert.ok(settingsHtml.includes('Furniture repairs &amp; handmade commissions'))
 // Editing body content via the regular page form must retain search settings.
 const edited = await f.request('/app/prepare', {method: 'POST', headers: {Cookie: owner, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({base: draft.id, slug: 'services', 'page.services.body': 'Repairs and custom furniture for neighborhood homes.'})})
 assert.equal(edited.status, 303)
 draft = (await dashboard()).draft
 assert.equal((await post('/api/pane/publish', {revision: draft.id})).status, 200)
 const html = await page('/site/services')
 assert.ok(html.includes('<title>Furniture repairs &amp; handmade commissions</title>'))
 assert.ok(html.includes('name="description" content="Fresh pastries for &quot;your&quot; studio &amp; team."'))
 assert.ok(html.includes('rel="canonical" href="https://cedar-street.example/workshop"'))
 assert.match(await page('/site/contact'), /rel="canonical" href="http:\/\/127.0.0.1:8787\/site\/contact"/)
 const staging = await f.request('http://staging.example/site/services')
 assert.match(staging.headers.get('x-robots-tag'), /noindex/, 'Staging origins never index the business site')
 assert.match(await staging.text(), /rel="canonical" href="https:\/\/cedar-street.example\/workshop"/)
 const excluded = await f.request('/site/hours')
 assert.match(excluded.headers.get('x-robots-tag'), /noindex/)
 assert.match(await excluded.text(), /name="robots" content="noindex/)
 const sitemap = await page('/sitemap.xml')
 assert.doesNotMatch(sitemap, /\/site\/hours/)
 assert.equal((sitemap.match(/<url>/g) ?? []).length, fixture.pages.length - 1)
 assert.match(sitemap, /\/site\/services/)
 assert.match(await page('/robots.txt'), /Disallow: \/site\/hours/)
 assert.equal((await f.request('/sitemap.xml', {method: 'HEAD'})).status, 200)
 assert.equal((await f.request('/sitemap.xml', {method: 'HEAD'})).headers.get('content-type'), 'application/xml; charset=utf-8')
 const bad = await save(draft.id, {'services.canonical': 'javascript:alert(1)'})
 assert.equal(bad.status, 400)
 assert.equal((await dashboard()).draft.id, draft.id)
 assert.equal((await save(first.id, fields)).status, 409, 'Stale settings cannot replace a newer page draft')
 await post('/api/pane/rollback', {revision: first.id})
 assert.equal(await page('/sitemap.xml'), before)
 assert.doesNotMatch(await page('/robots.txt'), /Disallow: \/site\/hours/)
 assert.doesNotMatch(await page('/site/services'), /cedar-street.example\/workshop/)
 assert.equal((await f.request('/site/hours')).headers.get('x-robots-tag'), null)
})

test('search settings enforce native roles and canonical origin through the installed route', async () => {
 assert.equal((await f.request('/app/search')).status, 303)
 const latest = (await dashboard()).draft.id
 assert.equal((await save(latest, {}, owner, {Origin: 'https://foreign.example'})).status, 403)
 let delivered
 const auth = createOperatorAuth({db: f.db, config: {...settings, origin, local: true}, clientIp: () => '127.0.0.1', mailSender: {send: async mail => {delivered = mail; return {status: 'accepted', provider: 'test-network-edge', providerMessageId: null}}}})
 await auth.invite(new Request(origin + '/auth/invite', {method: 'POST', headers: {Host: new URL(origin).host, Origin: origin, Cookie: owner}}), {email: 'member@example.test', displayName: 'Riverbend member', role: 'member'})
 const token = new URL(delivered.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
 const confirmed = await post('/auth/confirm', {token}, '')
 const member = confirmed.headers.get('set-cookie').split(';')[0]
 assert.equal((await f.request('/app/search', {headers: {Cookie: member}})).status, 403)
 assert.equal((await save(latest, {'home.title': 'Unauthorized'}, member)).status, 403)
 assert.equal((await dashboard()).draft.id, latest)
})


test('CMS-008: visitors search published pages, follow results, and never find unpublished edits', async () => {
 const site = structuredClone(fixture)
 site.pages.find(p => p.slug === 'services').body = 'Café furniture repairs. Local cedar restoration.'
 site.pages.find(p => p.slug === 'about').body = 'Our cedar workshop team.'
 const live = await (await post('/api/pane/prepare', {site})).json()
 assert.equal((await post('/api/pane/publish', {revision: live.id})).status, 200)
 const search = async query => {
  const response = await f.request('/site/search?q=' + encodeURIComponent(query))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  return response.text()
 }
 const matches = await search(' ＣＥＤＡＲ ')
 assert.match(matches, /3 pages found/)
 assert.match(matches, /<h2><a href="\/site\/services">/)
 assert.match(matches, /<h2><a href="\/site">/)
 assert.match(matches, /<h2><a href="\/site\/about">/)
 assert.match(await search('CAFE\u0301'), /1 page found/)
 assert.match(await search('furniture   repairs'), /1 page found/)
 for (const path of [...matches.matchAll(/<h2><a href="([^"]+)"/g)].map(m => m[1])) assert.equal((await f.request(path)).status, 200)
 assert.match(await search(''), /Enter a word or phrase/)
 assert.doesNotMatch(await search(''), /aria-label="Search results"/)
 assert.match(await search('nonexistent-phrase'), /No pages found/)
 const hostile = await search('<img src=x onerror=alert(1)>')
 assert.doesNotMatch(hostile, /<img src=x/)
 assert.match(hostile, /&lt;img src=x onerror=alert\(1\)&gt;/)
 assert.doesNotMatch(matches, /pane-tracker|name="email"|name="message"/)
 const oversize = await f.request('/site/search?q=' + 'x'.repeat(201))
 assert.equal(oversize.status, 400)
 assert.match(await oversize.text(), /up to 200 characters/)
 assert.equal((await post('/site/search', {})).status, 405)
 const unpublished = structuredClone(site)
 unpublished.pages.find(p => p.slug === 'services').body = 'unpublished-secret-phrase'
 const draft = await (await post('/api/pane/prepare', {site: unpublished})).json()
 assert.match(await search('unpublished-secret-phrase'), /No pages found/)
 assert.match(await search('cedar'), /3 pages found/)
 assert.equal((await dashboard()).draft.id, draft.id, 'CMS-008: a search never changes the draft')
 assert.equal((await post('/api/pane/publish', {revision: draft.id})).status, 200)
 assert.match(await search('unpublished-secret-phrase'), /1 page found/)
 assert.equal((await post('/api/pane/rollback', {revision: live.id})).status, 200)
 assert.match(await search('unpublished-secret-phrase'), /No pages found/)
 assert.match(await search('cedar'), /3 pages found/)
 for (const p of site.pages) assert.match(await page(p.slug === 'home' ? '/site' : '/site/' + p.slug), /href="\/site\/search">Search<\/a>/)
})

test('PRIV-004: current Pane workspace, preview, live, search and not-found documents retain their security headers', async () => {
 const draft = (await dashboard()).draft
 for (const path of ['/app', '/app/sites', '/app/inquiries', '/app/moves', '/app/search', `/preview/${draft.id}/home`, ...fixture.pages.map(p => p.slug === 'home' ? '/site' : '/site/' + p.slug), '/site/search?q=cedar', '/site/unknown-page']) {
  const response = await f.request(path, {headers: {Cookie: owner}})
  assert.equal(response.status, path === '/site/unknown-page' ? 404 : 200, path)
  assert.match(response.headers.get('content-type'), /text\/html/, path)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path)
  assert.equal(response.headers.get('x-frame-options'), 'DENY', path)
  assert.equal(response.headers.get('referrer-policy'), 'same-origin', path)
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', path)
  const csp = response.headers.get('content-security-policy')
  for (const directive of ["default-src 'none'", "script-src 'self'", "connect-src 'self'", "form-action 'self'", "base-uri 'none'", "frame-ancestors 'none'"]) assert.ok(csp.split(';').map(s => s.trim()).includes(directive), path + ': ' + directive)
  assert.doesNotMatch(csp, /https?:|unsafe-eval|\*/, path + ': no external hosts or wildcard sources')
 }
})
