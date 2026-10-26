import assert from 'node:assert/strict'
import {privateSentinels,providerInput,auditMetadata} from '../tests/browser-ai-riders.mjs'

// Loaded by the existing canvas AI journey; no independent test registration.
export async function riderProof({fixture,page,context,starter,workshopImages,data,prepare,editor,propose,decide,history,capture}){
 const {origin}=fixture,traces=new Map(),privateValues=['synthetic-pane-4','https://images.example.test/private?signature=synthetic-pane-signed-image'],forbidden=[...privateValues],receipts=[]
 const post=(path,body,headers={})=>context.request.post(origin+path,{headers:{Origin:origin,...headers},data:body})
 const activity=async()=>{const response=await context.request.get(origin+'/api/pane/activity');assert.equal(response.status(),200);return response.json()}
 await fixture.seedAiPrivateData(privateSentinels)
 const images=await workshopImages()
 let source,mode
 fixture.observeAiEdge(async record=>{
  providerInput(record,source,mode,privateValues)
  const click=(await activity()).filter(event=>event.action==='ai.request').at(-1),details=JSON.parse(click.details)
  traces.set(details.request,{base:source.id,mode,images:mode==='alt'?images.map((_,index)=>'block:image-'+index):[],results:{}})
  auditMetadata([click],traces,forbidden)
 })
 try{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000})
   const site=structuredClone(starter),home=site.pages.find(page=>page.slug==='home')
   site.pages.find(page=>page.slug==='about').body=privateSentinels.otherPage
   site.pages.find(page=>page.slug==='about').links=[{label:'Private image',url:privateValues[1]}]
   site.pages.push({slug:'private-draft',title:'Private draft',body:privateSentinels.unpublished,hidden:true})
   home.body=privateSentinels.history;await prepare(site)
   home.body=starter.pages.find(page=>page.slug==='home').body
   home.search={title:'',description:''}
   home.sections=[{id:'workshop',kind:'text',ratio:'1:1',gap:24,paddingTop:32,paddingBottom:32,blocks:[{id:'intro',kind:'text',text:home.body,column:1,span:12,row:1,order:0,align:'left',vertical:'start'},...images.map((image,index)=>({id:'image-'+index,kind:'image',image,text:'',column:1,span:12,row:index+2,order:index+1,align:'left',vertical:'start'}))]}]
   source=await prepare(site)
   assert.ok((await data()).revisions.some(revision=>revision.site.pages.some(page=>page.body===privateSentinels.history)),'The excluded revision history really exists')
   const original=structuredClone(source),liveBefore=(await data()).live,publicBefore=await (await context.request.get(origin+'/site')).text()
   forbidden.push(home.body,'synthetic-pane-raw-provider-error',...images.map(image=>image.src),'https://images.example.test/private?signature=synthetic-pane-signed-image')
   await editor()
   const panel=page.locator('[data-ai-assist]')
   for(const operation of ['search','alt']){
    mode=operation
    await panel.getByLabel('Help with',{exact:true}).selectOption(mode)
    const count=fixture.aiOutbounds.length,disclosure=panel.locator('#ai-disclosure')
    assert.equal(await disclosure.count(),1,'Consent disclosure exists before sending');await disclosure.scrollIntoViewIfNeeded();assert.equal(await disclosure.isVisible(),true,'Consent disclosure is visible before sending')
    const text=await disclosure.innerText()
    assert.match(text,/OpenAI, accessed through Base AI/,'Consent names the actual processor and access path')
    assert.ok(text.includes(home.title),'Consent identifies the selected page')
    assert.match(text,/selected content/);assert.match(text,/named images/);assert.match(text,/until you accept/);assert.match(text,/Publishing is separate/)
    assert.equal(await panel.getByRole('button',{name:'Send to OpenAI',exact:true}).getAttribute('aria-describedby'),'ai-disclosure')
    if(mode==='alt')for(let index=0;index<images.length;index++){
     const named=panel.locator(`[data-ai-image-id="block:image-${index}"]`)
     await named.scrollIntoViewIfNeeded();assert.equal(await named.isVisible(),true);assert.ok((await named.innerText()).includes('block:image-'+index),'Consent identifies each named image');assert.equal(await named.locator('img').getAttribute('src'),images[index].src)
    }
    assert.equal(fixture.aiOutbounds.length,count,'Reviewing consent and named inputs sends nothing')
    await disclosure.scrollIntoViewIfNeeded();await capture('rider-'+mode+'-consent',width)
    const tokenResponse=await post('/api/pane/tokens/create',{name:'Synthetic rider scope',scopes:['pages:read','draft:write'],days:1})
    assert.equal(tokenResponse.status(),200);const scoped=await tokenResponse.json();forbidden.push(scoped.token)
    const calls=fixture.aiOutbounds.length
    for(const [path,body] of [['propose',{base:source.id,slug:'home',mode,consent:true,images:images.map((_,index)=>'block:image-'+index)}],['decide',{id:'synthetic-pane-no-proposal',base:source.id,decisions:[]}],['undo',{id:'synthetic-pane-no-proposal',base:source.id}]])assert.equal((await post('/api/pane/ai/'+path,body,{Authorization:'Bearer '+scoped.token})).status(),403,'Scoped owner token is refused at '+path)
    assert.equal((await context.request.get(origin+'/api/pane/ai/history',{headers:{Authorization:'Bearer '+scoped.token}})).status(),403)
    assert.equal(fixture.aiOutbounds.length,calls,'Scoped refusals cause zero outbound requests')
    const proposal=await propose(mode,width)
    assert.equal(fixture.aiOutbounds.length,calls+1,'Generation makes exactly one provider request and no linked fetch or mail')
    assert.deepEqual(fixture.aiOutbounds.at(-1),{origin:'https://api.openai.com',path:'/v1/chat/completions',method:'POST'})
    for(const item of proposal.suggestions){
     const control=panel.locator(`[data-suggestion-id="${item.id}"]`),row=control.locator('xpath=ancestor::article')
     assert.equal(await control.inputValue(),'','Every decision starts pending')
     if(item.before!==undefined)assert.equal(await row.locator('dd').first().innerText(),item.before,'The reviewed source is displayed')
    }
    const beforeAccept=fixture.aiOutbounds.length
    await decide(proposal,item=>mode==='search'?['search-title','search-description'].includes(item.kind):item.target==='block:image-0')
    const state=await data(),trace=traces.get(proposal.id)
    trace.results['ai.decide']=state.draft.id;trace.decisions=proposal.suggestions.map(item=>({id:item.id,accept:mode==='search'?['search-title','search-description'].includes(item.kind):item.target==='block:image-0'}))
    assert.equal(fixture.aiOutbounds.length,beforeAccept,'Acceptance causes zero provider, mail, linked fetch or other outbound requests')
    assert.deepEqual(state.revisions.find(revision=>revision.id===source.id),source,'Acceptance preserves the entire immutable source revision and its hash')
    assert.equal(state.live.id,liveBefore.id);assert.equal(await (await context.request.get(origin+'/site')).text(),publicBefore,'Acceptance never publishes')
    forbidden.push(...proposal.suggestions.flatMap(item=>[item.before,item.after]).filter(value=>value&&value.length>20))
    const auditOutcome=async(action,afterSequence)=>{
     const events=await activity(),outcomes=events.filter(event=>event.sequence>afterSequence&&event.action.startsWith('ai.'))
     assert.deepEqual(outcomes.map(event=>event.action),[action],'Exactly the requested lifecycle outcome is audited')
     assert.equal(JSON.parse(outcomes[0].details).request,proposal.id)
     auditMetadata(events,traces,forbidden)
     return outcomes[0].sequence
    }
    const decided=(await activity()).filter(event=>event.action==='ai.decide'&&JSON.parse(event.details).request===proposal.id)
    assert.equal(decided.length,1,'Mixed decisions are audited once');auditMetadata(await activity(),traces,forbidden)
    let sequence=decided[0].sequence
    for(const [action,label,expected] of [['ai.undo','Undo accepted changes',source.site],['ai.redo','Redo accepted changes',state.draft.site]]){
     await history(label)
     const next=await data();trace.results[action]=next.draft.id
     assert.notEqual(next.draft.id,state.draft.id,'History creates a separate immutable revision')
     assert.deepEqual(next.draft.site,expected,'History restores the exact expected site')
     assert.equal(next.live.id,liveBefore.id);assert.equal(await (await context.request.get(origin+'/site')).text(),publicBefore)
     assert.equal(fixture.aiOutbounds.length,beforeAccept,'History sends zero outbound requests')
     sequence=await auditOutcome(action,sequence)
     await capture('rider-'+mode+'-'+action.slice(3),width)
    }
    receipts.push({width,mode,request:proposal.id,source:source.id,results:trace.results,providerCalls:1,decisionOutboundCalls:0})
    source=(await data()).draft;await editor()
    const rejected=await propose(mode,width),rejectionTrace=traces.get(rejected.id),beforeReject=await data(),rejectCalls=fixture.aiOutbounds.length
    const prior=(await activity()).at(-1).sequence
    await decide(rejected,()=>false)
    rejectionTrace.results['ai.decide']=null
    rejectionTrace.decisions=rejected.suggestions.map(item=>({id:item.id,accept:false}))
    const rejectedState=await data(),rejectionEvents=(await activity()).filter(event=>event.sequence>prior&&event.action.startsWith('ai.'))
    assert.deepEqual(rejectionEvents.map(event=>event.action),['ai.decide'],'Rejection-only decisions are audited once')
    assert.equal(JSON.parse(rejectionEvents[0].details).request,rejected.id)
    assert.equal(rejectedState.draft.id,source.id);assert.deepEqual(rejectedState.revisions,beforeReject.revisions,'Rejection creates no revision')
    assert.equal(rejectedState.live.id,liveBefore.id);assert.equal(fixture.aiOutbounds.length,rejectCalls)
    auditMetadata(await activity(),traces,forbidden)
    await capture('rider-'+mode+'-rejected',width)
    receipts.push({width,mode,outcome:'rejection-only',request:rejected.id,source:source.id,results:rejectionTrace.results,decisionOutboundCalls:0})
    await prepare(original.site);source=(await data()).draft;await editor()
   }
   mode='search';fixture.failAiProvider(true)
   const failed=await post('/api/pane/ai/propose',{base:source.id,slug:'home',mode,consent:true})
   assert.equal(failed.status(),400);assert.ok(!(await failed.text()).includes('synthetic-pane-raw-provider-error'),'Raw provider failure is not returned')
   fixture.failAiProvider(false)
   const events=await activity();assert.ok(events.some(event=>event.action==='ai.failed'));auditMetadata(events,traces,forbidden)
   assert.equal((await data()).draft.id,source.id,'Provider failure creates no draft')
   const policy=await post('/api/pane/policies/generate',{base:source.id});assert.equal(policy.status(),200)
   const policies=await policy.json(),body=policies.site.pages.find(page=>page.policyStarter==='privacy').body
   for(const phrase of ['OpenAI, accessed through Base AI','explicit owner click','selected page text','explicitly named native images','individually accepted','separate owner approval','Starter for owner review'])assert.ok(body.includes(phrase),'Connected editable policy starter discloses '+phrase)
   for(const old of source.site.pages)assert.deepEqual(policies.site.pages.find(page=>page.slug===old.slug),old,'Policy generation preserves existing pages')
   assert.equal((await data()).live.id,liveBefore.id,'Policy starters remain unpublished')
  }
  return receipts
 }finally{fixture.observeAiEdge(undefined);fixture.failAiProvider(false)}
}
