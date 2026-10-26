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
  const challenge=path==='/site/contact'?' https://challenges.cloudflare.com':''
  for (const directive of ["default-src 'none'", "script-src 'self'"+challenge, "connect-src 'self'"+challenge, "form-action 'self'", "base-uri 'none'", "frame-ancestors 'none'",...(challenge?['frame-src https://challenges.cloudflare.com']:[])]) assert.ok(csp.split(';').map(s => s.trim()).includes(directive), path + ': ' + directive)
  assert.deepEqual(csp.match(/https?:\/\/[^ ;]+/g)??[],challenge?Array(3).fill('https://challenges.cloudflare.com'):[],path+': only the mandatory contact verifier may add an external host')
  assert.doesNotMatch(csp, /unsafe-|\*/, path + ': no unsafe or wildcard sources')
 }
})

test('shared entry documents deny device permissions while native authentication and origin refusals remain intact', async () => {
 const entry = await runtime()
 const secure = async (path, cookie = '') => {
  const response = await entry.request(path, {headers: {Cookie: cookie}})
  assert.match(response.headers.get('content-type'), /text\/html/, path)
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', path)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path)
  assert.ok(response.headers.get('referrer-policy'), path)
  const csp = response.headers.get('content-security-policy')
  assert.match(csp, /frame-ancestors 'none'/, path)
  assert.doesNotMatch(csp, /https?:|unsafe-|\*/, path)
  return response
 }
 try {
  assert.equal((await secure('/')).status, 200)
  assert.equal((await secure('/signin')).status, 200)
  assert.equal((await secure('/auth/confirm?token=synthetic-pane-1')).status, 400)
  const refused = await entry.request('/setup')
  assert.equal(refused.status, 303)
  assert.equal(refused.headers.get('location'), '/signin?returnTo=%2Fsetup')
  assert.equal((await entry.request('https://foreign.example/')).status, 404)
  assert.equal((await entry.request('/api/pane')).status, 401)
  const bootstrap = await entry.request('/auth/bootstrap', {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({token: settings.SETUP_TOKEN, displayName: 'Security proof owner'})})
  const cookie = bootstrap.headers.get('set-cookie').split(';')[0]
  assert.equal((await secure('/')).status, 200)
  assert.equal((await secure('/signin')).status, 200)
  assert.equal((await secure('/setup', cookie)).status, 200)
  assert.equal((await entry.request('/setup', {method: 'HEAD', headers: {Cookie: cookie}})).headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()')
  assert.equal((await entry.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: 'https://foreign.example', 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})).status, 403)
  assert.equal((await secure('/setup', cookie)).status, 200, 'Foreign-origin POST did not complete setup')
  assert.equal((await entry.request('/setup', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=yes'})).status, 303)
  assert.equal((await entry.request('/app', {headers: {Cookie: cookie}})).status, 200, 'The header wrapper preserves native sign-in and setup')
 } finally { await entry.mf.dispose() }
})

test('only an approved page embed widens its frame policy and workspace previews stay inert', async () => {
 const initial = (await dashboard()).live.id
 const site = structuredClone(fixture)
 site.pages[0].embed = {title: 'Visit our workshop', url: 'https://www.youtube-nocookie.com/embed/synthetic-pane-1'}
 const prepared = await (await post('/api/pane/prepare', {site})).json()
 assert.doesNotMatch((await f.request('/site')).headers.get('content-security-policy'), /youtube/)
 for (const path of ['/app', `/preview/${prepared.id}/home`]) {
  const response = await f.request(path, {headers: {Cookie: owner}})
  assert.doesNotMatch(response.headers.get('content-security-policy'), /youtube|frame-src/)
  assert.doesNotMatch(await response.text(), /<iframe|data-embed /)
 }
 assert.equal((await post('/api/pane/publish', {revision: prepared.id})).status, 200)
 const response = await f.request('/site')
 const csp = response.headers.get('content-security-policy')
 assert.ok(csp.split(';').map(value => value.trim()).includes('frame-src https://www.youtube-nocookie.com'))
 assert.doesNotMatch(csp, /frame-src https:;|\*|unsafe-/)
 assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()')
 const html = await response.text()
 assert.match(html, /data-url="https:\/\/www.youtube-nocookie.com\/embed\/synthetic-pane-1"/)
 assert.doesNotMatch(html, /<iframe/)
 assert.match(html, /Allow external content/)
 assert.doesNotMatch((await f.request('/site/about')).headers.get('content-security-policy'), /youtube|frame-src/)
 const gpc = await f.request('/site', {headers: {'Sec-GPC': '1'}})
 assert.match(await gpc.text(), /data-gpc="1"/)
 for (const url of [origin + '/api/pane', 'http://www.youtube-nocookie.com/embed/a', 'https://evil.example/embed/a', 'https://user@www.youtube-nocookie.com/embed/a']) {
  const invalid = structuredClone(site); invalid.pages[0].embed.url = url
  assert.equal((await post('/api/pane/prepare', {site: invalid})).status, 400)
 }
 const removed = await f.request('/app/prepare', {method: 'POST', headers: {Cookie: owner, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({base: prepared.id, slug: 'home', 'page.home.embed.url': ''})})
 assert.equal(removed.status, 303)
 const draft = (await dashboard()).draft
 assert.equal(draft.site.pages[0].embed, undefined)
 assert.equal((await post('/api/pane/publish', {revision: draft.id})).status, 200)
 assert.doesNotMatch((await f.request('/site')).headers.get('content-security-policy'), /youtube|frame-src/)
 assert.equal((await post('/api/pane/rollback', {revision: prepared.id})).status, 200)
 assert.match((await f.request('/site')).headers.get('content-security-policy'), /frame-src https:\/\/www.youtube-nocookie.com/)
 await post('/api/pane/rollback', {revision: initial})
})

test('published URL changes offer explicit redirects and each revision owns its exact status and target map', async () => {
 const initial = {...structuredClone(fixture), pages: fixture.pages.map(page => ({...page, id: page.slug}))}
 const before = await (await post('/api/pane/prepare', {site: initial})).json()
 await post('/api/pane/publish', {revision: before.id})
 const site = structuredClone(initial)
 site.pages.find(page => page.id === 'about').slug = 'our-story'
 site.pages.find(page => page.id === 'hours').deleted = true
 let draft = await (await post('/api/pane/prepare', {site})).json()
 assert.deepEqual(draft.site.redirectOffers.map(row => [row.from, row.reason]).sort(), [['/site/about', 'renamed'], ['/site/hours', 'deleted']])
 const fields = {base: draft.id, 'redirects.csv': 'from,to,status\n/site/temporary,/site/contact,302'}
 for (const offer of draft.site.redirectOffers) {
  const prefix = 'redirect.offer.' + encodeURIComponent(offer.from)
  fields[prefix + '.accept'] = 'yes'; fields[prefix + '.status'] = '301'; fields[prefix + '.to'] = offer.reason === 'deleted' ? '/site/contact' : offer.to
 }
 const accepted = await f.request('/app/autosave', {method: 'POST', headers: {Cookie: owner, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(fields)})
 assert.equal(accepted.status, 200, await accepted.clone().text()); draft = await accepted.json()
 assert.equal((await f.request('/site/about')).status, 200, 'Draft redirects do not change a published route')
 await post('/api/pane/publish', {revision: draft.id})
 for (const [from,to,status] of [['/site/about','/site/our-story',301], ['/site/hours','/site/contact',301], ['/site/temporary','/site/contact',302]]) {
  for (const method of ['GET','HEAD']) {const response = await f.request(from + '?source=old-link', {method}); assert.equal(response.status,status); assert.equal(response.headers.get('location'),to)}
 }
 for (const redirects of [[{from:'/site/contact',to:'/site',status:301}], [{from:'/site/a',to:'/site/b',status:301},{from:'/site/b',to:'/site/a',status:302}], [{from:'/site/old',to:'//elsewhere.invalid',status:302}], [{from:'/site/old',to:'javascript:alert(1)',status:301}]]) assert.equal((await post('/api/pane/prepare',{site:{...draft.site,redirects}})).status,400)
 const prior=(await dashboard()).draft
 const bad=await f.request('/app/autosave',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:prior.id,'redirects.import':'from,to,status\n/site/valid,/site/contact,301\n/site/invalid,/site/services,999'})})
 assert.equal(bad.status,400)
 assert.equal((await dashboard()).draft.id,prior.id,'A malformed CSV never saves a partial map')
 await post('/api/pane/rollback', {revision: before.id})
 assert.equal((await f.request('/site/about')).status, 200)
 assert.equal((await f.request('/site/temporary')).status, 404)
})

test('native page references follow renamed URLs and report a deleted destination before publication',async()=>{
 const site={name:'Riverbend Bakery',description:'Fresh bread and cakes.',pages:[{id:'synthetic-pane-home',slug:'home',title:'Welcome',body:'Our local bakery.',links:[{label:'Our cakes',url:'page:synthetic-pane-cakes'}]},{id:'synthetic-pane-cakes',slug:'cakes',title:'Celebration cakes',body:'Made for your occasion.'}]}
 let response=await post('/api/pane/prepare',{site});assert.equal(response.status,200,await response.clone().text());let draft=await response.json();await post('/api/pane/publish',{revision:draft.id});assert.match(await page('/site'),/href="\/site\/cakes">Our cakes/)
 const renamed=structuredClone(draft.site);renamed.pages[1].slug='celebrations'
 response=await post('/api/pane/prepare',{site:renamed,base:draft.id});assert.equal(response.status,200,await response.clone().text());draft=await response.json();assert.equal((await post('/api/pane/publish',{revision:draft.id})).status,200);assert.match(await page('/site'),/href="\/site\/celebrations">Our cakes/,'A reference resolves the new URL without a redirect hop')
 const removed=structuredClone(draft.site);removed.pages[1].deleted=true
 response=await post('/api/pane/prepare',{site:removed,base:draft.id});assert.equal(response.status,200,await response.clone().text());const checks=await page('/app/search');assert.match(checks,/Broken internal page reference/);assert.match(checks,/href="\/app\?page=home"/,'The finding links to the native link editor');assert.match(await page('/site'),/href="\/site\/celebrations">Our cakes/,'A deletion draft cannot change the approved site')
})

async function aiWorkspace(respond) {
 const hosted='https://pane.example.test',mail=[],requests=[]
 const app=await runtime({bindings:{AUTH_ORIGIN:hosted,AUTH_LOCAL:'false',MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-5',AI_ENABLED:'true',AI_API_KEY:'synthetic-pane-4',AI_MODEL:'gpt-4.1-mini'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.sendgrid.com'){mail.push(await request.json());return new Response(null,{status:202})}
  assert.equal(new URL(request.url).origin,'https://api.openai.com')
  const input=await request.json(),content=input.messages.find(message=>message.role==='user').content
  const context=JSON.parse(content.find(part=>part.type==='text').text)
  requests.push(context)
  const suggestions=await respond(context,content)
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({suggestions})}}],usage:{prompt_tokens:70,completion_tokens:40,total_tokens:110}})
 }})
 let cookie
 const call=(path,body,session=cookie,headers={})=>app.request(hosted+path,{method:'POST',headers:{Cookie:session??'',Origin:hosted,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})
 const get=(path,session=cookie)=>app.request(hosted+path,{headers:{Cookie:session??''}})
 const state=async()=>{const response=await get('/api/pane');assert.equal(response.status,200);return response.json()}
 const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
 try{
  const signedIn=await call('/auth/bootstrap',{token:settings.SETUP_TOKEN,displayName:'Synthetic owner'},'')
  assert.equal(signedIn.status,303)
  cookie=signedIn.headers.get('set-cookie').split(';')[0]
  const setup=await app.request(hosted+'/setup',{method:'POST',headers:{Cookie:cookie,Origin:hosted,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
  assert.equal(setup.status,303)
 }catch(error){await app.mf.dispose();throw error}
 const propose=async(base,mode,fields={})=>ok(await call('/api/pane/ai/propose',{base,slug:'home',mode,consent:true,...fields}))
 const decide=async(proposal,accept)=>ok(await call('/api/pane/ai/decide',{id:proposal.id,base:proposal.base,decisions:proposal.suggestions.map((suggestion,index)=>({id:suggestion.id,accept:accept(suggestion,index)}))}))
 return {app,call,get,state,ok,propose,decide,requests,async admin(){
  assert.equal((await call('/auth/invite',{email:'synthetic-pane-6@example.test',displayName:'Synthetic administrator',role:'admin'})).status,202)
  const text=mail.at(-1).content.find(part=>part.type==='text/plain').value
  const token=new URL(text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token')
  const confirmed=await call('/auth/confirm',{token},'');assert.equal(confirmed.status,303)
  return confirmed.headers.get('set-cookie').split(';')[0]
 }}
}

test('Pane AI search decisions require the native owner, preserve rejected edits and publish approved native links',async()=>{
 const proposedTitle='Careful repairs for everyday furniture',proposedDescription='Visit our independent furniture workshop.',rejectedHeading='Unapproved workshop heading',linkLabel='Meet our workshop team'
 const workspace=await aiWorkspace(context=>[
  {kind:'search-title',label:'Improve search title',target:'title',after:proposedTitle},
  {kind:'search-description',label:'Describe the workshop',target:'description',after:proposedDescription},
  {kind:'heading',label:'Clarify the heading',target:'title',after:rejectedHeading},
  {kind:'link',label:'Connect the studio page',target:context.destinations.find(page=>page.title===fixture.pages[1].title).id,after:linkLabel},
  {kind:'finding',label:'Review structured data',target:'structured-data',after:'Consider reviewing the business information.'},
 ])
 const {app,call,get,state,ok,propose,decide,requests}=workspace
 try{
  const source=structuredClone(fixture);source.pages.find(page=>page.slug==='home').links=[{label:fixture.pages[1].title,url:'page:about'}];source.pages.find(page=>page.slug==='about').title='Private unrelated title';source.pages.find(page=>page.slug==='about').body='Private unrelated material that must never reach the model.'
  const shared={id:'synthetic-pane-shared',name:'Workshop introduction',section:{id:'shared-intro',kind:'text',blocks:[{id:'shared-text',kind:'text',text:source.pages.find(page=>page.slug==='home').body,column:1,span:12,row:1}]}}
  source.components=[shared];source.pages.find(page=>page.slug==='home').sections=[{...structuredClone(shared.section),id:'home-intro',component:shared.id}]
  const initial=await ok(await call('/api/pane/prepare',{site:source}))
  await ok(await call('/api/pane/publish',{revision:initial.id}))
  const originalHtml=await(await get('/site','')).text(),proposal=await propose(initial.id,'search')
  assert.equal(proposal.base,initial.id);assert.equal(proposal.slug,'home');assert.equal(proposal.mode,'search')
  assert.equal(proposal.suggestions.length,5)
  assert.ok(!JSON.stringify(requests).includes('Private unrelated'),'Only selected-page material crosses the provider edge')
  assert.equal((await state()).draft.id,initial.id,'Generating suggestions does not save a draft')
  const decisionBody={id:proposal.id,base:proposal.base,decisions:proposal.suggestions.map(s=>({id:s.id,accept:s.kind.startsWith('search-')}))}
  const administrator=await workspace.admin()
  for(const [session,headers,status] of [['',{},401],[administrator,{},403],[undefined,{Origin:'https://foreign.example'},403]]){
   for(const [path,body] of [['/api/pane/ai/propose',{base:initial.id,slug:'home',mode:'search',consent:true}],['/api/pane/ai/decide',decisionBody],['/api/pane/ai/undo',{id:proposal.id,base:initial.id}]]){
    assert.equal((await call(path,body,session,headers)).status,status,path)
   }
  }
  assert.equal(requests.length,1,'Refused requests do not send page data to the model')
  assert.equal((await call('/api/pane/ai/propose',{base:initial.id,slug:'home',mode:'search',consent:false})).status,400)
  assert.equal((await call('/api/pane/ai/decide',{...decisionBody,decisions:decisionBody.decisions.slice(1)})).status,400,'Every suggestion needs an explicit decision')
  const finding=proposal.suggestions.find(s=>s.kind==='finding')
  assert.equal((await call('/api/pane/ai/decide',{...decisionBody,decisions:decisionBody.decisions.map(row=>row.id===finding.id?{...row,accept:true}:row)})).status,400,'Findings cannot be applied as content')
  const applied=await ok(await call('/api/pane/ai/decide',decisionBody)),accepted=(await state()).draft
  assert.equal(applied.revision.id,accepted.id)
  const expected=structuredClone(initial.site);expected.pages.find(page=>page.slug==='home').search={...(expected.pages.find(page=>page.slug==='home').search??{}),title:proposedTitle,description:proposedDescription}
  assert.deepEqual(accepted.site,expected,'Rejected headings, links and findings never enter the draft')
  assert.equal(await(await get('/site','')).text(),originalHtml,'Accepting suggestions does not publish')
  assert.ok((await call('/api/pane/ai/decide',decisionBody)).status>=400,'A consumed proposal cannot be applied again')
  const undo=await ok(await call('/api/pane/ai/undo',{id:proposal.id,base:accepted.id}))
  assert.equal((await state()).draft.id,undo.revision.id);assert.deepEqual((await state()).draft.site,initial.site)
  const redo=await ok(await call('/api/pane/ai/undo',{id:proposal.id,base:undo.revision.id}))
  assert.equal((await state()).draft.id,redo.revision.id);assert.deepEqual((await state()).draft.site,accepted.site)
  await ok(await call('/api/pane/publish',{revision:redo.revision.id}))
  const published=await(await get('/site','')).text()
  assert.ok(published.includes('<title>'+proposedTitle+'</title>'));assert.ok(published.includes('name="description" content="'+proposedDescription+'"'))
  assert.ok(!published.includes(rejectedHeading));assert.ok(!published.includes(linkLabel))
  const links=await propose(redo.revision.id,'search'),linked=await decide(links,s=>['link','heading'].includes(s.kind)),draft=(await state()).draft
  const home=draft.site.pages.find(page=>page.slug==='home'),destination=draft.site.pages.find(page=>page.slug==='about')
  assert.equal(home.title,rejectedHeading,'An explicitly accepted heading changes only its named page')
  assert.ok(home.links.some(link=>link.label===linkLabel&&link.url==='page:'+(destination.id??destination.slug)))
  assert.ok(!(await(await get('/site','')).text()).includes(linkLabel))
  await ok(await call('/api/pane/publish',{revision:linked.revision.id}))
  assert.match(await(await get('/site','')).text(),/href="\/site\/about">Meet our workshop team/)
  assert.equal((await get('/site/about','')).status,200)
  const activity=await (await get('/api/pane/activity')).json()
  for(const action of ['ai.request','ai.propose','ai.decide','ai.undo','ai.redo'])assert.ok(activity.some(event=>event.action===action),'The owner can trace '+action)
  for(const event of activity.filter(event=>event.action.startsWith('ai.')))assert.ok(!JSON.stringify(event).includes(proposedDescription),'Activity contains metadata only')
  const privacy=await ok(await call('/api/pane/policies/generate',{base:draft.id}))
  assert.ok(privacy.site.pages.find(page=>page.policyStarter==='privacy').body.includes('OpenAI'))
 }finally{await app.mf.dispose()}
})

test('Pane AI writing modes change selected text only and fence both saved and in-flight stale revisions',async()=>{
 let hold=false,entered,release
 const waiting=new Promise(resolve=>{entered=resolve})
 const workspace=await aiWorkspace(async context=>{
  if(hold){entered();await new Promise(resolve=>{release=resolve})}
  return [{kind:'text',label:'Revise the selection',target:'selection',after:{rewrite:'We repair furniture with care.',shorten:'Careful furniture repairs.',tone:'Bring your favorite furniture to our workshop.'}[context.mode]}]
 })
 const {app,call,get,state,ok,propose,decide,requests}=workspace
 try{
  const initial=await ok(await call('/api/pane/prepare',{site:fixture}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  const live=await(await get('/site','')).text();let base=initial.id,selection='We repair well-loved furniture and build practical pieces for everyday life.'
  const acceptedStates=[]
  for(const mode of ['rewrite','shorten','tone','rewrite','shorten']){
   const before=(await state()).draft;acceptedStates.push(before.site);const proposal=await propose(base,mode,{selection,...(mode==='tone'?{tone:'Warm and welcoming'}:{})})
   assert.equal(proposal.suggestions.length,1);assert.equal(proposal.suggestions[0].before,selection)
   assert.equal((await state()).draft.id,base)
   if(mode==='rewrite'){
    await decide(proposal,()=>false);assert.deepEqual((await state()).draft.site,before.site)
   }
   const acceptedProposal=mode==='rewrite'?await propose(base,mode,{selection}):proposal
   const applied=await decide(acceptedProposal,()=>true),after=(await state()).draft
   const expected=structuredClone(before.site);expected.pages.find(page=>page.slug==='home').body=expected.pages.find(page=>page.slug==='home').body.replace(selection,acceptedProposal.suggestions[0].after)
   assert.deepEqual(after.site,expected,'Unselected content survives each writing mode')
   assert.equal(await(await get('/site','')).text(),live)
   base=applied.revision.id;selection=acceptedProposal.suggestions[0].after
  }
  const acceptedFinal=(await state()).draft.site
  for(let index=4;index>=0;index--){
   const history=await (await get('/api/pane/ai/history')).json()
   const undone=await ok(await call('/api/pane/ai/undo',{id:history.undo.id,base:history.base,direction:'undo'}))
   assert.deepEqual(undone.revision.site,acceptedStates[index]);base=undone.revision.id
  }
  assert.equal((await (await get('/api/pane/ai/history')).json()).undo,null)
  for(let index=0;index<5;index++){
   const history=await (await get('/api/pane/ai/history')).json()
   const redone=await ok(await call('/api/pane/ai/undo',{id:history.redo.id,base:history.base,direction:'redo'}))
   base=redone.revision.id
  }
  assert.deepEqual((await state()).draft.site,acceptedFinal,'Five durable redo steps restore the accepted draft')
  assert.equal(requests.find(context=>context.mode==='tone').tone,'Warm and welcoming')
  const savedProposal=await propose(base,'rewrite',{selection}),changed=structuredClone((await state()).draft.site)
  changed.pages.find(page=>page.slug==='about').body='A newer owner edit in the studio page.'
  const newer=await ok(await call('/api/pane/prepare',{base,site:changed}))
  assert.equal((await call('/api/pane/ai/decide',{id:savedProposal.id,base,decisions:savedProposal.suggestions.map(s=>({id:s.id,accept:true}))})).status,409)
  assert.equal((await call('/api/pane/ai/propose',{base,slug:'home',mode:'rewrite',selection,consent:true})).status,409)
  assert.deepEqual((await state()).draft.site,newer.site)
  hold=true
  const pending=call('/api/pane/ai/propose',{base:newer.id,slug:'home',mode:'shorten',selection,consent:true})
  try{
   await waiting
   const latestSite=structuredClone(newer.site);latestSite.pages.find(page=>page.slug==='about').body='An owner edit while the model is still responding.'
   const latest=await ok(await call('/api/pane/prepare',{base:newer.id,site:latestSite}))
   release();assert.equal((await pending).status,409)
   assert.equal((await state()).draft.id,latest.id);assert.deepEqual((await state()).draft.site,latest.site)
  }finally{release?.();await pending}
  assert.equal(await(await get('/site','')).text(),live)
  hold=false
  const imported=structuredClone(fixture),importedHome=imported.pages.find(page=>page.slug==='home')
  importedHome.importedHtml='<p>We repair <strong>well-loved furniture</strong> with care.</p><p>Visit <a href="/site/about">our studio</a>.</p>'
  importedHome.body='We repair well-loved furniture with care. Visit our studio.'
  const importedBase=await ok(await call('/api/pane/prepare',{site:imported}))
  const importedProposal=await propose(importedBase.id,'rewrite',{selection:'We repair well-loved furniture with care.'})
  await decide(importedProposal,()=>true)
  const importedDraft=(await state()).draft.site.pages.find(page=>page.slug==='home')
  assert.ok(importedDraft.importedHtml.includes('<strong>'))
  assert.ok(importedDraft.importedHtml.includes('<a href="/site/about">our studio</a>'))
  assert.ok(importedDraft.body.startsWith(importedProposal.suggestions[0].after))
 }finally{release?.();await app.mf.dispose()}
})

test('Pane AI reviews five real page images individually and creates a hidden translated draft without changing its source',async()=>{
 const png=await readFile('public/brand/icon-192.png'),src='data:image/png;base64,'+png.toString('base64')
 const workspace=await aiWorkspace((context,content)=>{
  if(context.mode==='alt'){
   assert.equal(context.images.length,5)
   assert.deepEqual(content.filter(part=>part.type==='image_url').map(part=>part.image_url.url),Array(5).fill(src),'The model receives the saved raster bytes')
   return context.images.map((image,index)=>({kind:'alt',label:'Describe image '+(index+1),target:image.target,after:'A bakery emblem in image '+(index+1)+'.'}))
  }
  assert.equal(context.mode,'translate');assert.ok(['Spanish','French'].includes(context.language))
  assert.ok(context.texts.some(entry=>entry.target==='title'))
  return context.texts.map((entry,index)=>({kind:'translation',label:'Translate page text',target:entry.target,after:entry.text?(context.language==='Spanish'?'Texto de la panadería ':'Texte de la boulangerie ')+(index+1)+'.':''}))
 })
 const {app,call,get,state,ok,propose,decide}=workspace
 try{
  const site=structuredClone(fixture),home=site.pages.find(page=>page.slug==='home')
  home.body='Fresh bread and cakes.'
  home.sections=[{id:'synthetic-pane-10',kind:'text',blocks:[{id:'synthetic-pane-11',kind:'text',text:home.body,column:1,span:12,row:1},...Array.from({length:6},(_,index)=>({id:'synthetic-pane-'+(12+index),kind:'image',text:'Existing bakery description '+(index+1)+'.',image:{src,width:png.readUInt32BE(16),height:png.readUInt32BE(20),decorative:false,alt:'Existing bakery description '+(index+1)+'.'},column:1,span:12,row:index+2}))]}]
  home.body=home.sections.flatMap(section=>section.blocks.map(block=>block.text).filter(Boolean)).join('\n\n')
  const initial=await ok(await call('/api/pane/prepare',{site}));await ok(await call('/api/pane/publish',{revision:initial.id}))
  assert.equal((await call('/api/pane/ai/propose',{base:initial.id,slug:'home',mode:'alt',consent:true,images:['block:unselected-image']})).status,400)
  assert.equal(workspace.requests.length,0,'An unselected image identifier never starts a model request')
  const live=await(await get('/site','')).text(),proposal=await propose(initial.id,'alt',{images:Array.from({length:5},(_,index)=>'block:synthetic-pane-'+(12+index))})
  assert.equal(proposal.suggestions.length,5)
  const applied=await decide(proposal,(_,index)=>index%2===0),draft=(await state()).draft
  const expected=structuredClone(initial.site),images=expected.pages.find(page=>page.slug==='home').sections[0].blocks.filter(block=>block.kind==='image')
  for(const index of [0,2,4])images[index].text=images[index].image.alt='A bakery emblem in image '+(index+1)+'.'
  expected.pages.find(page=>page.slug==='home').body=expected.pages.find(page=>page.slug==='home').sections.flatMap(section=>section.blocks.map(block=>block.text).filter(Boolean)).join('\n\n')
  assert.deepEqual(draft.site,expected,'Rejected images and the sixth image retain their existing descriptions')
  assert.equal(await(await get('/site','')).text(),live)
  await ok(await call('/api/pane/publish',{revision:applied.revision.id}))
  const published=await(await get('/site','')).text()
  for(const index of [0,2,4])assert.ok(published.includes('alt="A bakery emblem in image '+(index+1)+'."'))
  for(const index of [1,3,5])assert.ok(published.includes('alt="Existing bakery description '+(index+1)+'."'))
  const rejected=await propose(draft.id,'translate',{language:'Spanish'})
  assert.equal(rejected.suggestions.length,1);assert.equal(rejected.suggestions[0].kind,'translation')
  await decide(rejected,()=>false);assert.deepEqual((await state()).draft.site,draft.site)
  const translated=await propose(draft.id,'translate',{language:'Spanish'}),translation=await decide(translated,()=>true),latest=(await state()).draft
  assert.equal(latest.site.pages.length,draft.site.pages.length+1)
  for(const page of draft.site.pages)assert.deepEqual(latest.site.pages.find(candidate=>candidate.slug===page.slug),page)
  const spanish=latest.site.pages.find(page=>!draft.site.pages.some(source=>source.slug===page.slug))
  assert.equal(spanish.hidden,true);assert.ok(spanish.title.includes('Texto de la panadería'));assert.ok(spanish.body.includes('Texto de la panadería'))
  assert.equal((await get('/site/'+spanish.slug,'')).status,404,'Translated content stays private until publication')
  assert.equal(await(await get('/site','')).text(),published)
  await ok(await call('/api/pane/publish',{revision:translation.revision.id}))
  assert.ok((await(await get('/site/'+spanish.slug,'')).text()).includes('Texto de la panadería'))
  assert.ok(!(await(await get('/sitemap.xml','')).text()).includes('/site/'+spanish.slug))
  assert.equal(await(await get('/site','')).text(),published,'Publishing the translated page preserves the original page')
  const frenchProposal=await propose(latest.id,'translate',{language:'French'});await decide(frenchProposal,()=>true)
  const french=(await state()).draft.site.pages.find(page=>page.title.startsWith('Texte de la boulangerie'))
  assert.ok(french&&french.hidden&&french.slug!==spanish.slug,'Another requested language has its own private page')
  assert.deepEqual((await state()).draft.site.pages.find(page=>page.slug==='home'),latest.site.pages.find(page=>page.slug==='home'))
 }finally{await app.mf.dispose()}
})
