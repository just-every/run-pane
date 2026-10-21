import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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

test('SEO-001 SEO-003 SEO-004: search drafts, index output, page editing and rollback use the published revision', async () => {
 assert.equal((await f.request('/sitemap.xml')).status, 404)
 first = await (await post('/api/pane/prepare', {site: fixture})).json()
 await post('/api/pane/publish', {revision: first.id})
 const before = await page('/sitemap.xml')
 assert.equal((before.match(/<url>/g) ?? []).length, fixture.pages.length)
 assert.match(before, /<loc>http:\/\/127.0.0.1:8787\/site<\/loc>/)
 assert.match(before, /<lastmod>\d{4}-\d\d-\d\dT/)
 assert.match(await page('/site/services'), new RegExp(`<title>${fixture.pages.find(p => p.slug === 'services').title} · ${fixture.name}</title>`))
 const title = 'Riverbend catering & private events', description = 'Fresh pastries for "your" studio & team.'
 const fields = {'services.title': title, 'services.description': description, 'services.canonical': 'https://riverbend.example/catering', 'hours.noindex': 'on'}
 assert.equal((await save(first.id, fields)).status, 303)
 let draft = (await dashboard()).draft
 assert.equal((await page('/sitemap.xml')), before, 'An unpublished draft must not change the index')
 assert.doesNotMatch(await page('/site/services'), /riverbend.example\/catering/)
 const preview = await f.request(`/preview/${draft.id}/services`, {headers: {Cookie: owner}})
 assert.match(preview.headers.get('x-robots-tag'), /noindex/)
 assert.match(await preview.text(), /name="robots" content="noindex/)
 const signedOut = await f.request(`/preview/${draft.id}/services`)
 assert.match(signedOut.headers.get('x-robots-tag'), /noindex/)
 const settingsHtml = await page('/app/search')
 assert.ok(settingsHtml.includes(`aria-label="Search preview for ${fixture.pages.find(p => p.slug === 'services').title}"`))
 assert.ok(settingsHtml.includes('Riverbend catering &amp; private events'))
 // Editing body content via the regular page form must retain search settings.
 const edited = await f.request('/app/prepare', {method: 'POST', headers: {Cookie: owner, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({base: draft.id, slug: 'services', 'page.services.body': 'Catering for neighborhood gatherings.'})})
 assert.equal(edited.status, 303)
 draft = (await dashboard()).draft
 assert.equal((await post('/api/pane/publish', {revision: draft.id})).status, 200)
 const html = await page('/site/services')
 assert.ok(html.includes('<title>Riverbend catering &amp; private events</title>'))
 assert.ok(html.includes('name="description" content="Fresh pastries for &quot;your&quot; studio &amp; team."'))
 assert.ok(html.includes('rel="canonical" href="https://riverbend.example/catering"'))
 assert.match(await page('/site/contact'), /rel="canonical" href="http:\/\/127.0.0.1:8787\/site\/contact"/)
 const staging = await f.request('http://staging.example/site/services')
 assert.match(staging.headers.get('x-robots-tag'), /noindex/, 'Staging origins never index the business site')
 assert.match(await staging.text(), /rel="canonical" href="https:\/\/riverbend.example\/catering"/)
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
 assert.doesNotMatch(await page('/site/services'), /riverbend.example\/catering/)
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
