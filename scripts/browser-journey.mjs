import {siteStylesJourney} from './styles-journey.mjs'
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
const lobbyOnly=process.argv.includes('--lobby-only')
const previewOnly=process.argv.includes('--preview-only')
const fixtureRuntime=process.env.PANE_BROWSER_FIXTURE?await import('../tests/browser-runtime.mjs'):null
const log=fixtureRuntime?'':await readFile(process.env.PANE_LAUNCH_LOG,'utf8'),entry=fixtureRuntime?fixtureRuntime.origin+'/setup':log.match(/RER_OPEN\s+(https?:\/\/\S+)/)?.[1]
if(!entry)throw Error('Launch log has no private RER_OPEN link; rer dev must finish first.')
const origin=new URL(entry).origin,folder=resolve(process.env.PANE_SCREENSHOTS??'test-results/browser')
await mkdir(folder,{recursive:true})
const fixture=JSON.parse(await readFile('fixtures/static-site.json','utf8'))
const browser=await chromium.launch({headless:true,...(process.env.PANE_CHROMIUM_PATH?{executablePath:process.env.PANE_CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
const context=await browser.newContext(),page=await context.newPage()
async function capture(name) {
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000})
  if (['installed-lobby','signin','setup','empty-workspace'].includes(name)) {
   await page.evaluate(() => document.fonts.ready)
   const face = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    loaded: [...document.fonts].some(font => font.family.replace(/['"]/g, '') === 'Figtree' && font.status === 'loaded'),
    local: performance.getEntriesByType('resource').some(entry => new URL(entry.name).origin === location.origin && new URL(entry.name).pathname.startsWith('/fonts/figtree/')),
   }))
   assert.match(face.body, /Figtree/, `LOBBY-001: ${name} renders the shared typeface at ${width}`)
   assert.ok(face.loaded && face.local, `LOBBY-001: ${name} loads its self-hosted font at ${width}`)
  }
  if (['installed-lobby','signin','setup','empty-workspace'].includes(name)) {
   const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return ['--pn-fuchsia', '--pn-action'].map(name => root.getPropertyValue(name).trim())
   })
   assert.deepEqual(colors, ['#f5026f', '#e8176e'], `Shared Lobby and workspace theme: ${name} fuchsia at ${width}`)
   const unnamed = await page.locator('button, a[href], summary, [role="button"]').evaluateAll(nodes => nodes.filter(node => node.checkVisibility() && !node.dataset.tip && ![...node.querySelectorAll('.visually-hidden')].reduce((text, hidden) => text.replace(hidden.textContent, ''), node.textContent).trim()).map(node => node.outerHTML.slice(0, 120)))
   assert.deepEqual(unnamed, [], `${name} icon-only controls have tooltips at ${width}`)
   if (name === 'empty-workspace') {
    const skip = page.locator('a[href="#main"]')
    await skip.focus(); await page.keyboard.press('Enter')
    assert.equal(new URL(page.url()).hash, '#main', `Workspace anchor is operable at ${width}`)
    assert.equal(await page.locator('#main').count(), 1)
    const avatar = page.locator('.avatar[data-tip]').first()
    await page.mouse.move(5, 500); await avatar.hover(); await page.waitForTimeout(100)
    assert.equal(await page.getByRole('tooltip').count(), 0, 'Tooltip waits for hover delay')
    await page.getByRole('tooltip').waitFor()
    assert.equal(await page.getByRole('tooltip').innerText(), 'Account and team')
    await page.keyboard.press('Escape'); await page.mouse.move(5, 500)
    await page.keyboard.press('Tab'); await avatar.focus()
    assert.equal(await page.getByRole('tooltip').innerText(), 'Account and team', 'Tooltip appears on keyboard focus')
    await page.keyboard.press('Escape')
   }
  }
  await page.screenshot({path:resolve(folder,`${name}-${width}.png`),fullPage:true})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
  assert.equal(overflow,false,`${name} overflows at ${width}`)
 }
}
async function submit(button,path='/app') {
 const [response]=await Promise.all([page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).origin===origin&&new URL(response.url()).pathname!=='/app/autosave'),button.click()])
 const expected=path==='/app/import/dry-run'?200:303
 if(response.status()!==expected)throw Error(`Form refused (${response.status()}): ${await response.text()}`)
 await page.waitForURL(url=>url.pathname===path)
 await page.waitForLoadState('domcontentloaded')
}
const theme = async () => page.evaluate(() => {
 const root = getComputedStyle(document.documentElement)
 return ['--pn-font', '--pn-tint', '--pn-action'].map(name => root.getPropertyValue(name).trim())
})
async function privatePreviewJourney(){
 const call=async(path,data)=>{const response=await context.request.post(origin+path,{headers:{Origin:origin},data});assert.equal(response.status(),200,await response.text());return response.json()}
 const state=async()=>(await context.request.get(origin+'/api/pane')).json()
 const stableHtml=html=>html.replace(/name="idempotency" value="[^"]*"/g,'name="idempotency"')
 const previous=await state(),source=structuredClone(fixture)
 source.forms=[{id:'synthetic-pane-preview',name:'Preview project request',submit:'Send project request',confirmation:'Request received.',fields:[
  {key:'name',type:'text',label:'Project name',help:'',placeholder:'',required:true},
  {key:'email',type:'email',label:'Reply address',help:'',placeholder:'',required:true},
  {key:'message',type:'text',label:'Project details',help:'',placeholder:'',required:true},
 ]}]
 source.pages.find(page=>page.slug==='about').formId=source.forms[0].id
 for(const item of source.pages.filter(item=>['about','contact'].includes(item.slug)))item.acknowledgment={subject:'Preview enquiry received',text:'We will review your request.',responseTime:'Two business days'}
 const selected=await call('/api/pane/prepare',{site:source});await call('/api/pane/publish',{revision:selected.id})
 const baseline=await state(),liveBefore=await Promise.all(['contact','about'].map(async slug=>stableHtml(await(await context.request.get(origin+'/site/'+slug)).text())))
 const roles={}
 try{
  for(const role of ['admin','member']){
   const target=await browser.newContext(),tab=await target.newPage();roles[role]={context:target,page:tab}
   const link=await fixtureRuntime.invitePerson(context,{email:['synthetic-pane-preview-'+role,'example.test'].join('@'),displayName:'Preview '+role,nativeRole:role,roles:[]})
   await tab.goto(link);await tab.getByRole('button',{name:/Confirm/}).click();await tab.waitForURL(url=>url.pathname==='/app')
  }
  roles.visitor={context:await browser.newContext()};roles.visitor.page=await roles.visitor.context.newPage()
  const admin=roles.admin.page
  const axe=await readFile('node_modules/axe-core/axe.min.js','utf8')
  const mailBefore=await fixtureRuntime.mailAttemptCount(),outboundBefore=fixtureRuntime.outboundRequests.length
  const afterInvitations=await state()
  // Assertions run at one width; the same selected screens are captured at both widths.
  for(const slug of ['contact','about']){
   const path='/preview/'+selected.id+'/'+slug
   for(const role of ['visitor','member']){
    const refused=await roles[role].context.request.get(origin+path,{maxRedirects:0})
    assert.equal(refused.status(),role==='visitor'?303:403)
    assert.ok(!(await refused.text()).includes(selected.site.pages.find(item=>item.slug===slug).body),'Private content is absent from refusals')
   }
   await admin.setViewportSize({width:1440,height:1000});await admin.goto(origin+path)
   assert.equal(await admin.locator('.preview-banner').count(),1)
   assert.equal(await admin.getByRole('heading',{name:selected.site.pages.find(item=>item.slug===slug).title,exact:true}).count(),1)
   assert.ok((await admin.locator('.public-content').innerText()).includes(selected.site.pages.find(item=>item.slug===slug).body))
   assert.equal(await admin.locator('[data-typed-form]').count(),slug==='about'?1:0)
   const form=admin.locator('.contact-form'),button=form.getByRole('button',{name:slug==='contact'?'Send message':'Send project request',exact:true})
   assert.equal(await form.locator('fieldset').evaluate(node=>node.disabled),true)
   assert.ok(await form.locator('input:not([type="hidden"]),textarea,select,button').evaluateAll(nodes=>nodes.every(node=>node.matches(':disabled'))),'Every visible input and sending control is disabled')
   const posts=[];const observe=request=>{if(request.method()==='POST')posts.push(new URL(request.url()).pathname)};admin.on('request',observe)
   await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();await admin.mouse.click(box.x+box.width/2,box.y+box.height/2)
   assert.equal(admin.url(),origin+path,'A pointer attempt stays on the selected preview')
   await admin.getByRole('heading',{level:1}).click();await button.evaluate(node=>node.focus())
   assert.equal(await button.evaluate(node=>node===document.activeElement),false,'The disabled submit control cannot gain keyboard focus')
   await admin.keyboard.press('Space');await admin.keyboard.press('Enter')
   const lastNav=admin.locator('.public-header a').last();await lastNav.focus();await admin.keyboard.press('Tab')
   assert.equal(await form.evaluate(node=>node.contains(document.activeElement)),false,'Tab skips every disabled form control')
   await admin.waitForTimeout(200);admin.off('request',observe)
   assert.deepEqual(posts,[],'Pointer and keyboard attempts emit no submission')
   assert.equal(admin.url(),origin+path)
   await admin.evaluate(axe);assert.deepEqual((await admin.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}))).violations.map(item=>item.id),[],'Private preview accessibility')
   assert.ok(await admin.locator('main label,main p,main button,.preview-banner').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).every(node=>parseFloat(getComputedStyle(node).fontSize)>=13)),'Preview text is readable')
   assert.deepEqual(await admin.locator('button,a[href],summary').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()&&!node.textContent.trim()&&!node.dataset.tip).map(node=>node.outerHTML)),[],'Preview icon-only controls have tooltips')
   await admin.getByRole('heading',{level:1}).click()
   for(const width of [1440,390]){
    await admin.setViewportSize({width,height:1000});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Private preview overflow at '+width)
    await admin.screenshot({path:resolve(folder,'private-preview-'+slug+'-'+width+'.png'),fullPage:true})
   }
  }
  assert.deepEqual(await state(),afterInvitations,'Preview controls change no enquiries, notification state, approvals or live records')
  assert.equal(await fixtureRuntime.mailAttemptCount(),mailBefore,'No mail attempt is retained')
  assert.equal(fixtureRuntime.outboundRequests.length,outboundBefore,'Preview sends no verification or notification request')
  const changed=structuredClone(selected.site);changed.pages.find(item=>item.slug==='contact').body='Newer contact draft only.';changed.forms[0].name='Newer project request only.'
  const newer=await call('/api/pane/prepare',{site:changed,base:selected.id});assert.notEqual(newer.id,selected.id)
  await admin.setViewportSize({width:1440,height:1000});await admin.goto(origin+'/preview/'+selected.id+'/contact');assert.ok((await admin.locator('.public-content').innerText()).includes(selected.site.pages.find(item=>item.slug==='contact').body))
  await admin.locator('.public-header a[href="./about"]').first().click()
  assert.equal(new URL(admin.url()).pathname,'/preview/'+selected.id+'/about','Native preview navigation retains the selected revision')
  assert.equal(await admin.getByRole('heading',{name:'Preview project request',exact:true}).count(),1)
  assert.doesNotMatch(await admin.locator('body').innerText(),/Newer contact draft only|Newer project request only/)
  await admin.goto(origin+'/preview/'+newer.id+'/about');assert.equal(await admin.getByRole('heading',{name:'Newer project request only.',exact:true}).count(),1,'The later draft has its own preview')
  const current=await state();assert.deepEqual(current.revisions.find(item=>item.id===selected.id),selected,'The selected snapshot and hash stay immutable');assert.deepEqual(current.live,baseline.live)
  assert.deepEqual(await Promise.all(['contact','about'].map(async slug=>stableHtml(await(await context.request.get(origin+'/site/'+slug)).text()))),liveBefore,'Draft changes and preview attempts do not change the live pages')
  console.log('PROBE PUBLISH-002 access: selected ordinary and typed preview routes -> signed-out 303, member 403, admin content and draft banner.')
  console.log('PROBE PUBLISH-002 sending: admin visible submit and keyboard attempts -> zero POST requests, enquiries, mail attempts and outbound requests; live pages unchanged.')
  console.log('PROBE PUBLISH-002 revision: later draft and native preview navigation -> old contents and selected snapshot hash retained; new draft has separate contents.')
 }finally{
  for(const role of Object.values(roles))await role.context.close()
  if(previous.draft){const restored=await call('/api/pane/prepare',{site:previous.draft.site});if(previous.live)await call('/api/pane/publish',{revision:restored.id})}
 }
 console.log('Private selected preview journey passed: native admin, member and signed-out sessions, ordinary and typed disabled forms, pointer and keyboard refusal, no side effects, immutable selected source, accessibility and screens at 1440 and 390.')
}
try {
 await page.goto(origin+'/');await page.locator('.door').waitFor();await page.evaluate(()=>document.fonts.ready)
 const sharedTheme=await theme();assert.ok(sharedTheme.every(Boolean),'LOBBY-001: Lobby loads shared theme tokens')
 await capture('installed-lobby')
 await page.goto(origin+'/signin');assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: sign-in shares Lobby theme');await capture('signin')
 if(fixtureRuntime)await fixtureRuntime.bootstrap(context)
 try { await page.goto(entry) } catch { throw Error('Private local sign-in navigation failed.') };await page.waitForURL(url=>['/setup','/app'].includes(url.pathname))
 if(new URL(page.url()).pathname==='/setup'){
  assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: setup shares Lobby theme');await capture('setup');await page.getByRole('checkbox').check();await submit(page.getByRole('button',{name:'Finish setup'}))
 }
 assert.deepEqual(await theme(),sharedTheme,'LOBBY-001: workspace shares Lobby theme');assert.equal(await page.locator('a[href="#main"]').count(),1);assert.equal(await page.locator('#main').count(),1);await capture('empty-workspace')
 console.log('Shared Lobby and workspace theme passed: installed Lobby, sign-in, setup, workspace anchors, self-hosted Figtree, fuchsia, no overflow and icon tooltips at 1440 and 390.')
 if (!lobbyOnly && !previewOnly) {
 await page.goto(origin+'/site');await capture('not-published');await page.goto(origin+'/app')
 await page.getByLabel('Site name',{exact:true}).fill(fixture.name)
 await page.getByLabel('Description',{exact:true}).fill(fixture.description)
 for(const p of fixture.pages){const set=page.locator('#start-'+p.slug);await set.getByLabel('Page title').fill(p.title);await set.getByLabel('Text').fill(p.body)}
 await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 await capture('prepared-draft')
 const preview=await page.getByRole('link',{name:'Preview draft'}).getAttribute('href')
 const first=(await page.locator('form[action="/app/publish"] input[name="revision"]').getAttribute('value'))
 const previewFonts=new Map()
 for(const p of fixture.pages){await page.goto(origin+preview.replace(/\/home$/,'/'+p.slug));assert.equal(await page.locator('.preview-banner').count(),1,'PRESENT-001: draft banner');previewFonts.set(p.slug,await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily));await capture('preview-'+p.slug)}
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}));await capture('published-workspace')
 for(const p of fixture.pages){await page.goto(origin+(p.slug==='home'?'/site':'/site/'+p.slug));assert.ok((await page.title()).includes(fixture.name),'PRESENT-001: business title');assert.doesNotMatch(await page.title(),/\bPane\b/);assert.doesNotMatch(await page.locator('body').innerText(),/\bPane\b/);assert.equal(await page.locator('[src*="/brand/"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').count(),0);assert.equal(await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily),previewFonts.get(p.slug),'PRESENT-001: preview typography');await capture('live-'+p.slug)}
 await page.getByLabel('Your name',{exact:true}).fill('Avery Cooper')
 await page.getByLabel('Email address',{exact:true}).fill('avery@example.test')
 await page.getByLabel('Message',{exact:true}).fill('Could you cater our studio opening for 24 people next Friday?')
 await Promise.all([page.waitForURL('**/site/contact?sent=1'),page.getByRole('button',{name:'Send message'}).click()]);await capture('contact-sent')
 await page.goto(origin+'/app/inquiries');await capture('inquiries');await page.goto(origin+'/app/sites');await capture('sites-and-visits')
 await page.goto(origin+'/app');const text=page.getByLabel('Text',{exact:true})
 const changedBody=fixture.pages[0].body+'\n\nFriday dinner service now runs until 8 PM.'
 await text.fill(changedBody);assert.equal(await text.inputValue(),changedBody);await capture('edited-page')
 await submit(page.getByRole('button',{name:'Prepare draft revision'}))
 const nextPreview=await page.getByRole('link',{name:'Preview this page'}).getAttribute('href');await page.goto(origin+nextPreview);await capture('change-preview')
 await page.goto(origin+'/app');await submit(page.getByRole('button',{name:'Approve & publish'}))
 await page.goto(origin+'/site');assert.ok((await page.textContent('body')).includes('Friday dinner service'))
 await page.goto(origin+'/app/sites');const restore=page.locator('form[action="/app/rollback"]').filter({has:page.locator(`input[value="${first}"]`)})
 await submit(restore.getByRole('button'),'/app/sites');await page.goto(origin+'/site');assert.ok(!(await page.textContent('body')).includes('Friday dinner service'));await capture('rolled-back-site')
 await page.goto(origin+'/app/moves')
 const imported={...fixture,name:'Riverbend move-in'};await page.getByLabel('Source JSON',{exact:true}).fill(JSON.stringify(imported,null,2))
 await submit(page.getByRole('button',{name:'Check import'}),'/app/import/dry-run');await capture('import-review')
 await submit(page.getByRole('button',{name:'Approve import'}),'/app/moves');await capture('import-applied')
 await submit(page.getByRole('button',{name:'Undo import'}),'/app/moves');await capture('import-undone')
 await page.goto(origin+'/app/inquiries');await page.getByText('Erase personal data',{exact:true}).click();await submit(page.getByRole('button',{name:'Permanently erase message'}),'/app/inquiries');await capture('message-erased')
 await siteStylesJourney({page,context,origin,folder})
 console.log('Browser journey passed: sign-in, setup, five-page prepare/preview/publish, contact, visits, change, rollback, reviewed move-in/undo, erasure at 1440 and 390.')
 }
 if(!lobbyOnly&&fixtureRuntime)await privatePreviewJourney()
} catch(error) {await capture('journey-failure');throw error} finally {await browser.close();if(lobbyOnly||previewOnly)await fixtureRuntime?.stop()}
