import assert from 'node:assert/strict'

export const privateSentinels=Object.fromEntries(['otherPage','unpublished','history','visitor','form','enquiry','account','secret'].map((name,index)=>[name,`synthetic-pane-private-${index+1}-${name}`]))
export function keys(value,expected,label){assert.deepEqual(Object.keys(value).sort(),[...expected].sort(),label)}
export function excludes(value,forbidden,label){const text=JSON.stringify(value);for(const secret of forbidden)if(secret)assert.equal(text.includes(secret),false,label)}

// The entire paid-edge body is inspected, including instructions and output schema.
export function providerInput(record,source,mode){
 const {payload,input}=record,page=source.site.pages.find(page=>page.slug==='home')
 keys(payload,['model','store','max_completion_tokens','messages','response_format'],'Provider body allowlist')
 assert.equal(payload.model,'gpt-4.1-mini');assert.equal(payload.store,false);assert.ok(Number.isInteger(payload.max_completion_tokens))
 assert.equal(payload.messages.length,2)
 for(const message of payload.messages)keys(message,['role','content'],'Message allowlist')
 assert.equal(payload.messages[0].role,'system');assert.equal(typeof payload.messages[0].content,'string')
 assert.equal(payload.messages[1].role,'user')
 const images=mode==='alt'?page.sections.flatMap(section=>section.blocks).filter(block=>block.image).slice(0,5):[]
 const content=payload.messages[1].content
 assert.equal(content.length,1+images.length*2,'Only named image bytes accompany the selected context')
 keys(content[0],['type','text'],'Selected context part allowlist');assert.equal(content[0].type,'text')
 keys(input,['mode','language','tone','selection','page','images',...(mode==='search'?['checks','destinations','headings']:[])],'Selected context allowlist')
 assert.deepEqual(input.page,{title:page.title,body:page.body,search:{title:page.search?.title||source.site.name,description:page.search?.description||source.site.description}},'Exact selected page content')
 assert.equal(input.mode,mode);assert.equal(input.language,'');assert.equal(input.tone,'');assert.equal(input.selection,'')
 assert.deepEqual(input.images,images.map(block=>({target:'block:'+block.id,previous:block.image.alt??''})))
 if(mode==='search'){
  assert.deepEqual(input.destinations,[{id:'about',title:'Our studio'}],'Only the existing page-local link label and identifier are sent')
  assert.deepEqual(input.headings,[{target:'title',text:page.title},...page.sections.flatMap(section=>section.blocks).filter(block=>block.kind==='text').map(block=>({target:'block:'+block.id,text:block.text}))])
  assert.ok(input.checks.length>0,'The selected weak page has search findings')
  for(const check of input.checks){keys(check,['field','issue'],'Search finding allowlist');assert.ok(['duplicate','missing','review'].includes(check.issue));assert.ok(['title','description','heading','links','canonical','image'].includes(check.field))}
 }
 for(const [index,block] of images.entries()){
  assert.deepEqual(content[index*2+1],{type:'text',text:'block:'+block.id})
  assert.deepEqual(content[index*2+2],{type:'image_url',image_url:{url:block.image.src,detail:'low'}})
 }
 keys(payload.response_format,['type','json_schema'],'Response format allowlist');assert.equal(payload.response_format.type,'json_schema')
 const schema=payload.response_format.json_schema
 keys(schema,['name','strict','schema'],'Output schema envelope allowlist');assert.equal(schema.strict,true)
 const targets=new Set(['title','description','structured-data','about',...page.sections.flatMap(section=>section.blocks).map(block=>'block:'+block.id)])
 function shape(node){
  if(node.anyOf){keys(node,['anyOf'],'Schema alternatives allowlist');node.anyOf.forEach(shape);return}
  if(node.type==='object'){
   keys(node,['type','additionalProperties','properties','required'],'Schema object allowlist');assert.equal(node.additionalProperties,false)
   keys(node.properties,Object.keys(node.properties).filter(key=>['suggestions','kind','label','target','after'].includes(key)),'Schema property allowlist')
   assert.deepEqual([...node.required].sort(),Object.keys(node.properties).sort());Object.values(node.properties).forEach(shape)
  }else if(node.type==='array'){keys(node,['type','items'],'Schema array allowlist');shape(node.items)}
  else{keys(node,node.enum?['type','enum']:['type'],'Schema leaf allowlist');assert.equal(node.type,'string');if(node.enum)for(const value of node.enum)assert.ok(targets.has(value)||['search-title','search-description','heading','link','finding','alt'].includes(value),'Only selected identifiers and supported kinds occur in the output schema')}
 }
 shape(schema.schema)
 excludes(payload,Object.values(privateSentinels),'No private-data class crosses the paid edge')
}

export function auditMetadata(events,requests,forbidden){
 for(const event of events.filter(event=>event.action.startsWith('ai.'))){
  keys(event,['sequence','action','subject','created_at','agent','details','actor'],'Audit event allowlist')
  assert.ok(Number.isInteger(event.sequence));assert.equal(event.actor,'Browser proof owner');assert.equal(event.agent,null);assert.ok(Number.isFinite(Date.parse(event.created_at)))
  const details=JSON.parse(event.details),trace=requests.get(details.request)
  assert.ok(trace,'Every AI event links to an observed explicit request')
  const decision=['ai.decide','ai.undo','ai.redo'].includes(event.action)
  keys(details,['operation','page','images','sourceRevision','request','proposal','provider','model','outcome',...(decision?['resultRevision','decisions']:[])],'Audit metadata allowlist')
  assert.equal(event.subject,'proposal:'+details.request);assert.equal(details.proposal,details.request)
  assert.equal(details.operation,trace.mode);assert.equal(details.page,'home');assert.equal(details.sourceRevision,trace.base)
  assert.deepEqual(details.images,trace.images);assert.equal(details.provider,'OpenAI');assert.equal(details.model,'gpt-4.1-mini')
  assert.equal(details.outcome,{'ai.request':'requesting','ai.propose':'ready','ai.failed':'failed','ai.decide':'decided','ai.undo':'undone','ai.redo':'restored'}[event.action])
  if(decision){assert.equal(details.resultRevision,trace.result);assert.deepEqual(details.decisions,trace.decisions)}
  excludes(event,[...Object.values(privateSentinels),...forbidden],'Audit contains metadata without sensitive bodies or errors')
 }
}
