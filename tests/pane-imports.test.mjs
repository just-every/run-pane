import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {crawlEdge,sourceOrigin} from './import-crawl-edge.mjs'
import {runtime,origin,settings} from './runtime.mjs'
import {createPortability,readArchive} from '@runeditrun/rer/modules/portability'
import {productPolicy} from '../scripts/pane-policy.mjs'
import {createOperatorAuth} from '../src/modules/operator-auth/index.mjs'
let f,owner,member,verifiedCapture
const notifications=[]
const edge=crawlEdge()
const source=await readFile('fixtures/imports/migration-report.json','utf8')
const call=(action,body,cookie=owner)=>f.request('/api/pane/import/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie??''},body:JSON.stringify(body)})
const ok=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
const data=async()=>ok(await f.request('/api/pane',{headers:{Cookie:owner}}))
before(async()=>{
 f=await runtime({observeOutbound:request=>{if(new URL(request.url).hostname==='api.sendgrid.com')notifications.push(request.url)},outboundService:edge.fetch,bindings:{MAIL_PROVIDER:'sendgrid',MAIL_API_KEY:'synthetic-pane-50'}})
 const boot=await f.request('/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:settings.SETUP_TOKEN,displayName:'synthetic-pane-1'})})
 assert.equal(boot.status,303);owner=boot.headers.get('set-cookie').split(';')[0]
 await f.request('/setup',{method:'POST',headers:{Cookie:owner,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=yes'})
 let mail
 const auth=createOperatorAuth({db:f.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{mail=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
 await auth.invite(new Request(origin+'/auth/invite',{method:'POST',headers:{Origin:origin,Host:new URL(origin).host,Cookie:owner}}),{email:'synthetic-pane-2@example.test',displayName:'synthetic-pane-2',role:'member'})
 const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
 const session=await f.request('/auth/confirm',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token})});assert.equal(session.status,303);member=session.headers.get('set-cookie').split(';')[0]
})
after(async()=>{await f?.mf.dispose()})

test('migration preflight reports complete typed inventory, exceptions, old URLs, form destinations and history without writes',async()=>{
 const before=await data(),plan=await ok(await call('dry-run',{source}))
 assert.deepEqual(await data(),before)
 const r=plan.report;assert.equal(r.phase,'preflight');assert.equal(r.counts.page.source,6);assert.equal(r.counts.page.planned,5)
 for(const state of ['approved','pending','spam'])assert.equal(r.counts['comment:'+state].source,1)
 for(const kind of ['post','media','product','form','unsupported','collection-item','event','gallery'])assert.equal(r.counts[kind].source,1)
 assert.equal(r.inventory.find(item=>item.oldUrl==='https://synthetic-pane-1.example/about').target,'/site/about')
 assert.ok(r.inventory.filter(item=>item.target===null).every(item=>item.reason))
 assert.match(r.inventory.find(item=>item.kind==='media').reason,/not fetched/)
 assert.equal(r.inventory.find(item=>item.kind==='form').destination,'mailto:synthetic-pane-1@example.test')
 assert.match(r.history.join(' '),/Traffic and sales analytics history stays/)
})

test('reviewed apply reconciles the stored draft, lists dangling post links and reopens the retained report',async()=>{
 const plan=await ok(await call('dry-run',{source})),before=await data()
 for(const input of [{source,fingerprint:'wrong'},{source:source+' ',fingerprint:plan.fingerprint}])assert.equal((await call('apply',input)).status,400)
 assert.deepEqual(await data(),before)
 const job=await ok(await call('apply',{source,fingerprint:plan.fingerprint}));assert.equal(job.state,'completed')
 const r=job.report;for(const [kind,count] of Object.entries(r.counts))assert.equal(count.applied,count.planned,kind);assert.equal(r.counts.page.applied,r.counts.page.planned);assert.equal(r.counts.post.applied,0);assert.equal(r.counts.comment.applied,0)
 assert.ok(r.failures.some(issue=>issue.id==='inventory-0'&&issue.check==='link'&&issue.reason.includes('/skipped')))
 assert.ok(r.failures.some(issue=>issue.check==='heading'));assert.ok(r.failures.some(issue=>issue.check==='list'));assert.ok(r.failures.some(issue=>issue.check==='inline-image'))
 const saved=await ok(await call('dry-run',{job:job.id,source:'ignored'}));assert.deepEqual(saved.report,r)
 const state=await data();assert.equal(state.live,before.live);assert.equal(state.draft.id,r.revision)
 const replay=await ok(await call('apply',{source,fingerprint:plan.fingerprint}));assert.equal(replay.id,job.id)
 // The recheck observes native changes, rather than echoing the requested write.
 const changed={...state.draft.site,pages:state.draft.site.pages.map((page,index)=>index===0?{...page,body:'A different native body'}:page)}
 await f.db.prepare('UPDATE pane_revisions SET site=? WHERE id=?').bind(JSON.stringify(changed),r.revision).run()
 const mismatch=await ok(await call('dry-run',{job:job.id}));assert.ok(mismatch.report.failures.some(issue=>issue.check==='text'));assert.equal(mismatch.report.ok,false)
 await f.db.prepare('UPDATE pane_revisions SET site=? WHERE id=?').bind(JSON.stringify(state.draft.site),r.revision).run()
 await ok(await call('undo',{job:job.id}));assert.equal((await data()).draft?.id??null,before.draft?.id??null)
 const undone=await ok(await call('dry-run',{job:job.id}));assert.equal(undone.report.phase,'undone');assert.equal(undone.report.counts.page.applied,0)
})

test('documented WXR inventories 100 posts and 50 comments by state while applying only supported unpublished pages',async()=>{
 const wxr=await readFile('fixtures/imports/wordpress.xml','utf8'),plan=await ok(await call('dry-run',{source:wxr})),r=plan.report
 assert.equal(r.counts.post.source,100);assert.equal(r.counts.comment.source,50);assert.equal(r.counts['comment:approved'].source,17);assert.equal(r.counts['comment:pending'].source,17);assert.equal(r.counts['comment:spam'].source,16)
 assert.equal(r.counts.page.planned,2);assert.equal(r.counts.page.exceptions,2);assert.match(r.inventory.find(item=>item.kind==='page'&&item.targetSlug==='home').reason,/Imported headings, lists and inline links/);assert.equal(r.counts.media.source,102);assert.equal(r.counts.author.source,1);assert.equal(r.counts.taxonomy.source,1);assert.equal(r.counts.form.source,1);assert.equal(r.inventory.find(item=>item.kind==='form').destination,'mailto:synthetic-pane-7@example.test')
 assert.ok(r.inventory.some(item=>item.kind==='comment'&&item.fields.parent==='1'))
 assert.equal(plan.site.pages[0].body,'Welcome Read About or the guide.');assert.equal(plan.site.pages[1].body,'Our story & studio.')
 assert.match(plan.site.pages[0].importedHtml,/<a href="\/site\/about">About<\/a>/)
 assert.match(plan.site.pages[0].importedHtml,/<a href="https:\/\/example.org\/guide">/)
 const before=await data(),job=await ok(await call('apply',{source:wxr,fingerprint:plan.fingerprint}))
 assert.equal(job.report.counts.page.applied,2);assert.equal(job.report.counts.post.applied,0);assert.equal((await data()).live,before.live);assert.equal(job.report.failures.some(issue=>issue.id==='wxr-1'&&issue.reason.startsWith('Dangling internal target:')),false,'An external media path cannot shadow a valid internal page target')
 const preview=await f.request('/preview/'+job.report.revision,{headers:{Cookie:owner}});assert.equal(preview.status,200);const html=await preview.text();assert.match(html,/<h1>Welcome<\/h1>/);assert.match(html,/<a href="\.\/about">About<\/a>/)
 assert.equal(job.report.failures.some(issue=>['rendered-text','rendered-heading','rendered-list'].includes(issue.check)),false)
 assert.ok(job.report.failures.some(issue=>issue.check==='rendered-document-text'&&/without a published-page capture/.test(issue.reason)))
 await ok(await call('undo',{job:job.id}))
})

test('captured Wix sitemap and RSS preserve the source inventory and explicitly report unverified live crawl',async()=>{
 const capture=await readFile('fixtures/imports/wix.json','utf8'),plan=await ok(await call('dry-run',{source:capture})),r=plan.report
 assert.equal(r.counts.page.source,3);assert.equal(r.counts.page.planned,2);assert.equal(r.counts.post.source,1)
 assert.ok(r.inventory.some(item=>item.id==='crawl-authority'&&/Ownership has not been verified/.test(item.reason)))
 const job=await ok(await call('apply',{source:capture,fingerprint:plan.fingerprint}));assert.equal(job.report.counts.page.applied,2)
 assert.ok(job.report.failures.some(issue=>issue.check==='link'&&issue.reason.includes('/missing')))
 for(const check of ['rendered-image','rendered-button','rendered-document-text','redirect'])assert.ok(job.report.failures.some(issue=>issue.check===check),check)
 for(const check of ['rendered-text','rendered-heading','rendered-list'])assert.equal(job.report.failures.some(issue=>issue.check===check),false,check)
 const about=await f.request('/preview/'+job.report.revision+'/about',{headers:{Cookie:owner}})
 assert.match(await about.text(),/<h2>About<\/h2><ul><li>One<\/li><li>Two<\/li><\/ul>/)
 await ok(await call('undo',{job:job.id}))
})

test('Webflow, Framer and Durable captures are reconciled separately with every collection CSV field retained as an exception',async()=>{
 for(const [provider,rows] of [['webflow',3],['framer',2],['durable',0]]){
  const capture=await readFile('fixtures/imports/'+provider+'.json','utf8'),plan=await ok(await call('dry-run',{source:capture})),r=plan.report
  assert.equal(r.counts['collection-item'].source,rows,provider);assert.equal(r.counts['collection-item'].planned,0)
  if(rows){const collection=r.inventory.filter(item=>item.kind==='collection-item');assert.equal(collection[0].fields.Description,'First, second');assert.equal(collection[1].fields.Description,'Quoted "care"\nsecond line');assert.equal(collection[0].fields.Price,'19.95');assert.ok(collection.every(item=>/no collection destination/.test(item.reason)))}
  const job=await ok(await call('apply',{source:capture,fingerprint:plan.fingerprint}));assert.equal(job.report.counts.page.applied,2);assert.equal(job.report.counts['collection-item'].applied,0)
  await ok(await call('undo',{job:job.id}))
 }
})

test('source readers refuse entity declarations, malformed exports, cross-origin captures, duplicate URLs and lossy CSV rows',async()=>{
 const snapshot=JSON.parse(await readFile('fixtures/imports/webflow.json','utf8'))
 const invalid=[JSON.stringify({...snapshot,token:'synthetic-pane-1'}),'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss>&x;</rss>','<rss><broken></rss>','<rss><channel/></rss>',JSON.stringify({...snapshot,documents:[{url:'https://other.example/',html:'x'}]}),JSON.stringify({...snapshot,documents:[snapshot.documents[0],snapshot.documents[0]]}),JSON.stringify({...snapshot,collections:[{name:'Invalid',csv:'Name,Name\na,b'}]}),JSON.stringify({...snapshot,collections:[{name:'Invalid',csv:'Name,Slug\none'}]})]
 const before=await data();for(const source of invalid)assert.equal((await call('dry-run',{source})).status,400,source.slice(0,80));assert.deepEqual(await data(),before)
})

test('retained migration reports remain private to the applying owner or admin and same-origin sessions',async()=>{
 const privateSource=source+'\n'
 const plan=await ok(await call('dry-run',{source:privateSource})),job=await ok(await call('apply',{source:privateSource,fingerprint:plan.fingerprint}))
 assert.equal((await call('dry-run',{job:job.id},member)).status,403);assert.equal((await call('dry-run',{job:job.id},'')).status,401)
 const foreign=await f.request('/api/pane/import/dry-run',{method:'POST',headers:{Origin:'https://other.example',Cookie:owner,'Content-Type':'application/json'},body:JSON.stringify({job:job.id})});assert.equal(foreign.status,403)
 await ok(await call('undo',{job:job.id}))
})

test('unsupported-only WXR retains an exception inventory without inventing a native draft',async()=>{
 const source='<rss xmlns:wp="http://wordpress.org/export/1.2/"><channel><title>synthetic-pane-9</title><wp:wxr_version>1.2</wp:wxr_version><item><title>Only a post</title><wp:post_type>post</wp:post_type><wp:post_id>1</wp:post_id></item></channel></rss>'
 const before=await data(),plan=await ok(await call('dry-run',{source}));assert.equal(plan.site,null);assert.equal(plan.report.counts.post.source,1);assert.equal(plan.report.counts.post.planned,0)
 const job=await ok(await call('apply',{source,fingerprint:plan.fingerprint}));assert.equal(job.report.counts.page.applied,0);assert.equal(job.report.counts.post.applied,0);assert.equal(job.report.ok,false)
 assert.deepEqual((await data()).revisions,before.revisions)
 const report=await ok(await call('dry-run',{job:job.id}));assert.deepEqual(report.report,job.report)
 await ok(await call('undo',{job:job.id}))
})

test('native JSON custom home and separately declared links keep their rendering semantics in the fidelity report',async()=>{
 const native=JSON.parse(await readFile('fixtures/static-site.json','utf8'));native.name='synthetic-pane-native';native.home='about';native.pages[0].body='Literal <script>synthetic-pane-1</script> stays text.';native.pages[0].links=[{label:'About',url:'/site'},{label:'Guide',url:'https://example.org/guide'}]
 const source=JSON.stringify(native),plan=await ok(await call('dry-run',{source})),job=await ok(await call('apply',{source,fingerprint:plan.fingerprint}))
 assert.equal(job.report.ok,true,JSON.stringify(job.report.failures));assert.equal(plan.report.inventory.find(item=>item.title===native.pages[1].title).target,'/site')
 const preview=await f.request('/preview/'+job.report.revision+'/home',{headers:{Cookie:owner}});assert.equal(preview.status,200);const html=await preview.text();assert.match(html,/Literal &lt;script&gt;synthetic-pane-1&lt;\/script&gt; stays text/);assert.doesNotMatch(html,/<script>synthetic-pane-1/)
 await ok(await call('undo',{job:job.id}))
})


test('malformed source references stay visible as exceptions without preventing reviewed import and undo',async()=>{
 const captured=JSON.parse(await readFile('fixtures/imports/wix.json','utf8'))
 captured.documents[0].html+='<a href="http://[">Broken link</a><img src="http://[" alt="Broken image"><img alt="Missing source">'
 const source=JSON.stringify(captured),before=await data(),plan=await ok(await call('dry-run',{source}))
 assert.deepEqual(await data(),before)
 const exceptions=plan.report.inventory.filter(item=>item.id.startsWith('document-0-reference-'))
 assert.equal(exceptions.length,3)
 assert.equal(exceptions.filter(item=>item.kind==='media').length,2)
 assert.equal(plan.report.counts.media.source,3)
 assert.ok(exceptions.some(item=>item.reason==='Invalid link URL: http://['))
 assert.ok(exceptions.some(item=>item.reason==='Invalid image URL: http://['))
 assert.ok(exceptions.some(item=>item.reason==='Image has no source URL.'))
 assert.match(plan.report.inventory.find(item=>item.id==='document-0').reason,/Invalid link URL/)
 const job=await ok(await call('apply',{source,fingerprint:plan.fingerprint}))
 assert.equal(job.report.counts.page.applied,2)
 assert.equal(job.report.failures.filter(issue=>issue.id==='document-0'&&issue.check==='source-reference').length,3)
 assert.equal((await data()).live,before.live)
 assert.deepEqual((await ok(await call('dry-run',{job:job.id}))).report,job.report)
 await ok(await call('undo',{job:job.id}))
 assert.equal((await data()).draft?.id??null,before.draft?.id??null)
})


test('a controlled published Wix crawl proves DNS ownership before capture and retains exact-source proof through reviewed apply and undo',async()=>{
 const before=await data(),outbound=edge.requests.length
 const challenge=await ok(await call('crawl-challenge',{origin:sourceOrigin,provider:'wix'}))
 assert.equal(challenge.record.name,'_pane-import.synthetic-pane-1.example.com')
 assert.equal(edge.requests.length,outbound,'Creating a challenge does not fetch the source')
 const input={challenge:challenge.challenge,confirm:'crawl-source'}
 assert.equal((await call('crawl',input)).status,400,'Missing domain control is refused')
 assert.equal(edge.requests.length,outbound)
 edge.proof=challenge.record.value
 const captured=await ok(await call('crawl',input)),plan=captured.plan
 verifiedCapture=captured
 assert.equal(plan.report.crawl.origin,sourceOrigin)
 assert.equal(plan.report.inventory.some(item=>item.id==='crawl-authority'),false)
 assert.equal(plan.report.counts.page.source,4)
 assert.equal(plan.report.counts.page.planned,3)
 assert.equal(plan.report.counts.post.source,1)
 assert.match(plan.report.inventory.find(item=>item.oldUrl===sourceOrigin+'/missing').reason,/HTTP 404/)
 assert.ok(edge.requests.some(request=>request.url===sourceOrigin+'/discovered'))
 assert.ok(edge.requests.every(request=>request.method==='GET'&&!request.cookie&&!request.authorization))
 assert.deepEqual(await data(),before,'Capturing creates no revision or import job')
 const forged=await ok(await call('dry-run',{source:captured.source+' '}))
 assert.equal(forged.report.crawl,undefined,'Changing any byte removes the verified receipt')
 assert.ok(forged.report.inventory.some(item=>item.id==='crawl-authority'))
 const sourceRequests=edge.requests.length
 const job=await ok(await call('apply',{source:captured.source,fingerprint:plan.fingerprint}))
 assert.equal(job.report.counts.page.applied,3)
 assert.equal(job.report.counts.post.applied,0)
 assert.equal(job.report.crawl.origin,sourceOrigin)
 assert.equal((await data()).live,before.live)
 assert.deepEqual((await ok(await call('dry-run',{job:job.id}))).report,job.report)
 await ok(await call('undo',{job:job.id}))
 assert.equal((await data()).draft?.id??null,before.draft?.id??null)
 assert.equal(edge.requests.length,sourceRequests,'Review, apply, reopen and undo never fetch again')
 const activity=await ok(await f.request('/api/pane/activity',{headers:{Cookie:owner}}))
 assert.ok(activity.some(item=>item.action==='import.crawl'&&item.subject==='crawl:'+captured.receipt.hash))
 assert.ok(activity.some(item=>item.subject==='api:import/crawl'&&item.action==='api.POST.200'))
})

test('crawl consent and authority refuse unsafe origins, altered challenges, members and scoped tokens before outbound work',async()=>{
 const before=edge.dnsRequests.length
 for(const origin of ['http://synthetic-pane-1.example.com','https://127.0.0.1','https://[::1]','https://localhost','https://synthetic-pane-1.internal','https://synthetic-pane-1.example.com:8443','https://synthetic-pane-1.example.com/path','https://user:synthetic-pane-1@synthetic-pane-1.example.com'])assert.equal((await call('crawl-challenge',{origin,provider:'wix'})).status,400,origin)
 assert.equal((await call('crawl-challenge',{origin:sourceOrigin,provider:'wix'},member)).status,403)
 assert.equal((await call('crawl-challenge',{origin:sourceOrigin,provider:'wix'},'')).status,401)
 const challenge=await ok(await call('crawl-challenge',{origin:sourceOrigin,provider:'wix'}))
 assert.equal((await call('crawl',{challenge:challenge.challenge})).status,400)
 assert.equal((await call('crawl',{challenge:challenge.challenge+'x',confirm:'crawl-source'})).status,400)
 assert.equal((await call('crawl',{challenge:challenge.challenge,confirm:'crawl-source'},member)).status,403)
 const token=await ok(await f.request('/api/pane/tokens/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:owner},body:JSON.stringify({name:'synthetic-pane-1',scopes:['imports:write']})}))
 const response=await f.request('/api/pane/import/crawl-challenge',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+token.token},body:JSON.stringify({origin:sourceOrigin,provider:'wix'})})
 assert.equal(response.status,403)
 assert.equal(edge.dnsRequests.length,before)
})

test('controlled crawls refuse private DNS and source redirects without contacting another origin',async()=>{
 for(const mode of ['127.0.0.1','10.0.0.1','100.64.0.1','169.254.169.254','172.16.0.1','192.168.0.1','198.18.0.1','::1','::ffff:127.0.0.1','2001:db8::1','fc00::1','fe80::1','redirect']){
  const challenge=await ok(await call('crawl-challenge',{origin:sourceOrigin,provider:'durable'}))
  edge.proof=challenge.record.value;edge.address=mode==='redirect'?'93.184.215.14':mode;edge.redirect=mode==='redirect'
  const before=edge.requests.length,response=await call('crawl',{challenge:challenge.challenge,confirm:'crawl-source'})
  assert.equal(response.status,400)
  const error=await response.json();assert.match(error.error,mode==='redirect'?/HTTP 302.*redirects are not followed/:/public Internet addresses/)
  assert.equal(edge.requests.length-before,mode==='redirect'?1:0)
 }
 edge.address='93.184.215.14';edge.redirect=false
})


test('verified capture receipts survive installation archive restore and report reads grant no further network authority',async()=>{
 const service=await createPortability({db:f.db,policy:productPolicy}),id=await service.exports.create()
 while((await service.exports.advance(id,{maxParts:100})).phase==='building'){}
 const records=[];for await(const record of readArchive(await service.exports.download(id)))records.push(record)
 const destination=await runtime({outboundService:()=>{throw Error('Restored report unexpectedly requested the network')}})
 try{
  const restore=await createPortability({db:destination.db,policy:productPolicy}),job=await restore.imports.create(records[0])
  for(const part of records.filter(record=>record.kind==='part'))await restore.imports.uploadPart(job,part.index,part)
  const closing=records.at(-1),result=await restore.imports.finalize(job,{contentHash:closing.contentHash,archiveHash:closing.archiveHash})
  assert.equal(result.phase,'complete')
  let mail
  const auth=createOperatorAuth({db:destination.db,config:{...settings,origin,local:true},clientIp:()=> '127.0.0.1',mailSender:{send:async message=>{mail=message;return {status:'accepted',provider:'test-network-edge',providerMessageId:null}}}})
  await auth.requestMagicLink(new Request(origin+'/auth/magic-link',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin}}),{email:settings.OWNER_EMAIL,returnTo:'/app'})
  const token=new URL(mail.text.match(/http:\/\/[^\s]+/)[0]).searchParams.get('token')
  const signed=await destination.request('/auth/confirm',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token})})
  assert.equal(signed.status,303);const cookie=signed.headers.get('set-cookie').split(';')[0]
  const plan=await ok(await destination.request('/api/pane/import/dry-run',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({source:verifiedCapture.source})}))
  assert.equal(plan.report.crawl.origin,sourceOrigin)
  assert.equal(plan.report.crawl.verifiedAt,verifiedCapture.receipt.verifiedAt)
  assert.equal(plan.report.inventory.some(item=>item.id==='crawl-authority'),false)
 }finally{await destination.mf.dispose()}
})


test('imported page bodies preserve semantic headings, nested lists, anchors and inline destinations while scripts, media and widgets stay inert',async()=>{
 const source=await readFile('fixtures/imports/rich-page.json','utf8'),plan=await ok(await call('dry-run',{source})),before=await data()
 const job=await ok(await call('apply',{source,fingerprint:plan.fingerprint}))
 assert.equal((await data()).live,before.live)
 for(const check of ['rendered-text','rendered-link','rendered-heading','rendered-list','anchor'])assert.equal(job.report.failures.some(issue=>issue.check===check),false,check)
 assert.ok(job.report.failures.some(issue=>issue.check==='rendered-image'))
 assert.ok(job.report.failures.some(issue=>issue.check==='rendered-formatting'))
 assert.ok(job.report.failures.some(issue=>issue.check==='rendered-document-text'),'Matching body text must not conceal extra visible page framing')
 const preview=await f.request('/preview/'+job.report.revision+'/home',{headers:{Cookie:owner}}),html=await preview.text()
 for(const pattern of [/<h1 id="welcome">Welcome<\/h1>/,/<strong>bold<\/strong>/,/<em>clear<\/em>/,/<ol start="3"><li>One<\/li><li>Two<ul><li>Nested<\/li><\/ul><\/li><\/ol>/,/<blockquote>Original quote<\/blockquote>/,/<a href="\.\/about#hours" target="_blank" rel="noopener noreferrer">Visit hours<\/a>/,/<a href="sms:\+13035550100">Text<\/a>/,/<figcaption>Source caption<\/figcaption>/])assert.match(html,pattern)
 assert.doesNotMatch(html,/<img[^>]+unfetchable|<iframe|<script>window\.syntheticPane|onclick=/)
 assert.match(html,/<span role="img" aria-label="Source alt"><\/span>/)
 const editor=await f.request('/app?page=home',{headers:{Cookie:owner}})
 const editorHtml=await editor.text();assert.match(editorHtml,/<textarea id="page-text" readonly/)
 assert.equal((editorHtml.match(/id="page-text"/g)??[]).length,1,'Source IDs cannot shadow workspace controls')
 assert.match(editorHtml,/id="pn-imported-page-text"/)
 const edit=await f.request('/app/prepare',{method:'POST',headers:{Origin:origin,Cookie:owner,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({base:job.report.revision,slug:'home','page.home.body':'Replace structured content silently'})})
 assert.equal(edit.status,400)
 assert.equal((await data()).draft.id,job.report.revision)
 await ok(await call('undo',{job:job.id}))
})


const finishHistory=async job=>{
 for(let n=0;job.state!=='completed'&&n<20;n++){
  const previous=job.checkpoint;job=await ok(await call('apply',{job:job.id}));assert.ok(job.checkpoint>previous,'Continuation makes durable progress')
 }
 assert.equal(job.state,'completed');return job
}
const undoHistory=async id=>{
 let job=await ok(await call('undo',{job:id}))
 for(let n=0;job.state!=='undone'&&n<20;n++)job=await ok(await call('undo',{job:id}))
 assert.equal(job.state,'undone')
}

test('reviewed Squarespace CSV retains all 200 dated enquiry forms and fields without notifications, reapply duplicates or lossy undo',async()=>{
 const csv=(await readFile('fixtures/imports/squarespace-enquiries.csv','utf8')).replaceAll('{at}','@'),before=await data(),sent=notifications.length
 const plan=await ok(await call('dry-run',{source:csv}));assert.equal(plan.report.counts.enquiry.planned,200);assert.deepEqual(await data(),before)
 assert.equal((await call('apply',{source:csv,fingerprint:'wrong'})).status,400)
 assert.equal((await call('apply',{source:csv,fingerprint:plan.fingerprint},member)).status,403)
 const job=await finishHistory(await ok(await call('apply',{source:csv,fingerprint:plan.fingerprint})))
 const imported=(await data()).messages.filter(message=>message.imported_from==='Squarespace')
 assert.equal(imported.length,200);assert.equal(new Set(imported.map(row=>row.id)).size,200)
 for(let n=1;n<=200;n++){
  const row=imported.find(row=>row.name==='synthetic-pane-'+n);assert.ok(row,'Enquiry '+n+' remains browsable')
  assert.equal(row.created_at,new Date(Date.UTC(2023,0,n)).toISOString());assert.equal(row.status,'closed');assert.equal(row.acknowledgment_status,'not_requested')
  assert.equal(row.follow_up_at,null);assert.equal(row.reminded_at,null);assert.equal(row.escalated_at,null)
  const submission=JSON.parse(row.submission);assert.equal(submission.formName,n%2?'Consultation':'Workshop');assert.equal(submission.formId,row.form_id)
  assert.equal(submission.fields.find(field=>field.label==='Project').value,'Project '+n)
  assert.equal(submission.fields.find(field=>field.label==='Notes').value,n===1?'Quoted "care", first\nsecond':'Notes '+n)
 }
 const html=await(await f.request('/app/inquiries',{headers:{Cookie:owner}})).text()
 assert.match(html,/synthetic-pane-200/);assert.match(html,/synthetic-pane-1</);assert.match(html,/Original form fields/);assert.match(html,/Imported · Squarespace/)
 const saved=await ok(await call('dry-run',{job:job.id}));assert.equal(saved.report.counts.enquiry.applied,200);assert.equal(saved.report.ok,true)
 await finishHistory(await ok(await call('apply',{source:csv,fingerprint:plan.fingerprint})));assert.equal((await data()).messages.length,before.messages.length+200)
 const tick=await(await f.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-20T12:00:00Z'),cron:'* * * * *'});assert.equal(tick.outcome,'ok')
 assert.equal(notifications.length,sent,'Import and subsequent scheduler send zero notifications')
 assert.ok((await data()).messages.filter(row=>row.imported_from).every(row=>row.reminded_at===null&&row.escalated_at===null))
 await undoHistory(job.id);assert.deepEqual((await data()).messages,before.messages)
 assert.equal((await ok(await call('dry-run',{job:job.id}))).report.counts.enquiry.applied,0)
})

test('monthly CSV baselines reconcile every page and month independently of native traffic and undo exactly',async()=>{
 const source=await readFile('fixtures/imports/squarespace-analytics.csv','utf8'),before=await data(),plan=await ok(await call('dry-run',{source}))
 assert.equal(plan.report.counts['visit-baseline'].planned,24);assert.deepEqual(await data(),before)
 const job=await finishHistory(await ok(await call('apply',{source,fingerprint:plan.fingerprint}))),applied=await data()
 assert.equal(applied.traffic.imported.total,858);assert.equal(applied.traffic.imported.month.length,12);assert.equal(applied.traffic.imported.page.length,24)
 for(let month=1;month<=12;month++){
  const label='2024-'+String(month).padStart(2,'0')
  assert.deepEqual(applied.traffic.imported.month.find(row=>row.label===label),{label,count:month*11})
  assert.deepEqual(applied.traffic.imported.page.filter(row=>row.month===label),[{month:label,path:'/',count:month*10,source:'Squarespace'},{month:label,path:'/contact',count:month,source:'Squarespace'}])
 }
 assert.deepEqual(applied.visits,before.visits)
 for(const dimension of ['day','source','device','location','campaign','referrer','medium','campaignSource'])assert.deepEqual(applied.traffic[dimension],before.traffic[dimension])
 const saved=await ok(await call('dry-run',{job:job.id}));assert.equal(saved.report.counts['visit-baseline'].applied,24);assert.equal(saved.report.ok,true)
 await finishHistory(await ok(await call('apply',{source,fingerprint:plan.fingerprint})));assert.equal((await data()).traffic.imported.total,858)
 await undoHistory(job.id);assert.deepEqual((await data()).traffic,before.traffic)
 for(const invalid of ['Month,Page,Visits\n2024-13,/,1','Month,Page,Visits\n2024-01,/,1.5','Submitted On,Form,Name,Email\nyesterday,Form,Person,invalid'])assert.equal((await call('dry-run',{source:invalid})).status,400)
})

test('import history protects native edits, erases retained personal custody and fences changed capture replay and old archives',async()=>{
 const email='synthetic-pane-501'+'@'+'example.test',csv='Submitted On,Form,Name,Email,Message\n2023-01-01T00:00:00Z,Consultation,synthetic-pane-501,'+email+',Private source answer\n2023-01-02T00:00:00Z,Workshop,synthetic-pane-502,synthetic-pane-502'+'@'+'example.test,Keep this answer'
 const plan=await ok(await call('dry-run',{source:csv})),job=await finishHistory(await ok(await call('apply',{source:csv,fingerprint:plan.fingerprint})))
 const request=async(action,input,cookie=owner)=>f.request('/api/pane/'+action,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)})
 const person=async()=>ok(await request('privacy/export',{email}))
 const row=(await data()).messages.find(row=>row.email===email)
 await ok(await request('messages/update',{id:row.id,status:'replied'}));assert.equal((await call('undo',{job:job.id})).status,400,'Undo refuses to discard native handling')
 assert.equal((await data()).messages.find(message=>message.id===row.id).status,'replied')
 const found=await person();assert.equal(found.messages.length,1);assert.equal(JSON.parse(found.messages[0].submission).fields.find(field=>field.label==='Message').value,'Private source answer')
 const service=await createPortability({db:f.db,policy:productPolicy}),archive=await service.exports.create()
 while((await service.exports.advance(archive,{maxParts:100})).phase==='building'){}
 const records=[];for await(const record of readArchive(await service.exports.download(archive)))records.push(record)
 assert.equal((await request('privacy/erase',{email,confirm:'erase-person-data'},member)).status,403)
 await ok(await request('privacy/erase',{email,confirm:'erase-person-data'}));assert.equal((await person()).messages.length,0)
 assert.ok((await data()).messages.some(message=>message.name==='synthetic-pane-502'),'Unrelated imported enquiry remains')
 assert.equal((await call('dry-run',{job:job.id})).status,400,'Erasure withdraws the retained source CSV')
 for(const source of [csv,csv.replace('Private source answer','Changed source answer')])assert.equal((await call('dry-run',{source})).status,400,'An erased person cannot return through a changed capture')
 const fresh=await service.exports.create();while((await service.exports.advance(fresh,{maxParts:100})).phase==='building'){}
 const after=[];for await(const record of readArchive(await service.exports.download(fresh)))after.push(record)
 assert.doesNotMatch(JSON.stringify(after),/Private source answer|synthetic-pane-501/)
 const restore=await service.imports.create(records[0]);for(const part of records.filter(record=>record.kind==='part'))await service.imports.uploadPart(restore,part.index,part)
 await assert.rejects(()=>service.imports.finalize(restore,{contentHash:records.at(-1).contentHash,archiveHash:records.at(-1).archiveHash}),/erasure_epoch|erased_row/)
})
