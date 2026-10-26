import assert from 'node:assert/strict'
import {keys,excludes} from './browser-ai-riders.mjs'

// Inspect the complete network body against the selected native post snapshot.
export function postProvider(payload,page,site,input,forbidden){
 const mode=input.mode,images=mode==='alt'?page.sections.flatMap(section=>section.blocks).filter(block=>block.image):[]
 const texts=[{target:'title',text:page.title},...(page.sections?page.sections.flatMap(section=>section.blocks.flatMap(block=>block.kind==='text'?[{target:'block:'+block.id,text:block.text}]:block.image?[{target:'alt:'+block.id,text:block.image.alt??''}]:[])):[{target:'body',text:page.body}])].filter(item=>item.text.trim())
 keys(payload,['model','store','max_completion_tokens','messages','response_format'],'Author provider body allowlist')
 assert.equal(payload.store,false);assert.equal(payload.messages.length,2)
 for(const message of payload.messages)keys(message,['role','content'],'Author message allowlist')
 assert.equal(payload.messages[0].role,'system');assert.equal(typeof payload.messages[0].content,'string');assert.equal(payload.messages[1].role,'user')
 const context={mode,language:mode==='translate'?input.language:'',tone:mode==='tone'?input.tone:'',selection:['rewrite','shorten','tone'].includes(mode)?input.selection:'',page:{title:page.title,body:page.body,search:{title:page.search?.title||site.name,description:page.search?.description||site.description}},...(mode==='translate'?{texts}:{}),images:images.map(block=>({target:'block:'+block.id,previous:block.image.alt??''}))}
 assert.deepEqual(payload.messages[1].content,[{type:'text',text:JSON.stringify(context)},...images.flatMap(block=>[{type:'text',text:'block:'+block.id},{type:'image_url',image_url:{url:block.image.src,detail:'low'}}])],'Author sends only the selected post and explicitly named images')
 const variant=(kind,targets)=>({type:'object',additionalProperties:false,properties:{kind:{type:'string',enum:[kind]},label:{type:'string'},target:{type:'string',enum:targets},after:{type:'string'}},required:['kind','label','target','after']})
 const schema=mode==='translate'?{type:'object',additionalProperties:false,properties:{translations:{type:'object',additionalProperties:false,properties:Object.fromEntries(texts.map(item=>[item.target,{type:'string'}])),required:texts.map(item=>item.target)}},required:['translations']}:{type:'object',additionalProperties:false,properties:{suggestions:{type:'array',items:{anyOf:[mode==='alt'?variant('alt',images.map(block=>'block:'+block.id)):variant('text',['selection'])]}}},required:['suggestions']}
 assert.deepEqual(payload.response_format,{type:'json_schema',json_schema:{name:'pane_proposals',strict:true,schema}},'Author output schema contains only selected targets')
 excludes(payload,forbidden,'Entire author provider body excludes private values')
}
