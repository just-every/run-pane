import type { Site } from './model'
import { blogPostPath } from './post-links'
import { escape,key } from './ui/kit'
export const fieldTypes=['text','email','phone','address','choice','date','file','consent'] as const
export type FormField={key:string;type:typeof fieldTypes[number];label:string;help:string;placeholder:string;required:boolean;error?:string;options?:string[]}
export type SiteForm={id:string;name:string;submit:string;confirmation:string;redirect?:string;fields:FormField[]}
export type Upload={id:string;name:string;type:string;size:number;hash:string;chunks:string[]}
export type FormState={values:Record<string,string>;errors:Record<string,string>;formId?:string;instance?:string}
export function normalizeForms(value:unknown):SiteForm[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value))throw Error('Provide a list of forms.')
 const forms=value.map((form:any)=>{
  if(!form||typeof form.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(form.id)||typeof form.name!=='string'||!form.name.trim()||form.name.length>120||typeof form.submit!=='string'||!form.submit.trim()||form.submit.length>80||typeof form.confirmation!=='string'||!form.confirmation.trim()||form.confirmation.length>1000||!Array.isArray(form.fields)||!form.fields.length||form.fields.length>40)throw Error('A form needs a name, submit label, confirmation and up to forty fields.')
  if(form.redirect&&!/^\/site(?:\/[a-z0-9-]+)*$/.test(form.redirect))throw Error('Choose a live site path for the confirmation redirect.')
  const fields:FormField[]=form.fields.map((field:any)=>{
   if(!field||typeof field.key!=='string'||!/^[a-z][a-z0-9_]{0,39}$/.test(field.key)||['website','idempotency','attribution','cf-turnstile-response'].includes(field.key)||!fieldTypes.includes(field.type)||typeof field.label!=='string'||!field.label.trim()||field.label.length>120||typeof field.help!=='string'||field.help.length>500||typeof field.placeholder!=='string'||field.placeholder.length>120||typeof field.required!=='boolean'||field.error!==undefined&&(typeof field.error!=='string'||field.error.length>300))throw Error('Each field needs a unique key, supported type, label, help, placeholder and required setting.')
   if(field.type==='choice'&&(!Array.isArray(field.options)||!field.options.length||field.options.length>30||field.options.some((value:unknown)=>typeof value!=='string'||!value||value.length>120)))throw Error('Choice fields need up to thirty text options.')
   return {key:field.key,type:field.type,label:field.label.trim(),help:field.help,placeholder:field.placeholder,required:field.required,error:field.error??'',...(field.type==='choice'?{options:[...new Set(field.options)] as string[]}:{})}
  })
  if(new Set(fields.map(field=>field.key)).size!==fields.length)throw Error('Use unique field keys.')
  if(fields.filter(field=>field.type==='file').length>1)throw Error('Use one private PDF upload per form.')
  return {id:form.id,name:form.name.trim(),submit:form.submit.trim(),confirmation:form.confirmation.trim(),...(form.redirect?{redirect:form.redirect}:{}),fields}
 })
 if(new Set(forms.map(form=>form.id)).size!==forms.length)throw Error('Use unique form identities.')
 return forms
}
/** A form reference grants submission authority only on the page that contains it. */
export function typedForm(site:Site,slug:string,requestedId?:string){
 const page=site.pages.find(page=>page.slug===slug&&!page.deleted)??site.blogPosts?.find(post=>blogPostPath(site,post)==='/site/'+slug)?.content
 const id=requestedId===undefined?page?.formId:requestedId
 if(!page||!id||id!==page.formId&&!page.sections?.some(section=>section.blocks.some(block=>block.kind==='form'&&block.form===id)))return undefined
 return site.forms?.find(form=>form.id===id)
}
export function formMarkup(form:SiteForm,path:string,live:boolean,turnstileKey?:string,state?:FormState,instance?:string,pageSlug?:string){
 if(state&&(state.formId!==undefined&&state.formId!==form.id||state.instance!==undefined&&state.instance!==(instance??'')))state=undefined
 const fields=form.fields.map(field=>{
  const id='field-'+(instance?encodeURIComponent(instance)+'-':'')+field.key,error=state?.errors[field.key],value=state?.values[field.key]??'',described=[field.help?id+'-help':'',error?id+'-error':''].filter(Boolean).join(' ')
  const attrs=`id="${id}" name="${field.key}"${field.error?` data-error-message="${escape(field.error)}"`:''}${field.required?' required aria-required="true"':''}${described?` aria-describedby="${described}"`:''}${error?' aria-invalid="true"':''}`
  const control=field.type==='choice'?`<select ${attrs}><option value="">Choose an option</option>${field.options!.map(option=>`<option${option===value?' selected':''}>${escape(option)}</option>`).join('')}</select>`:field.type==='address'?`<textarea ${attrs} rows="3" maxlength="500" placeholder="${escape(field.placeholder)}">${escape(value)}</textarea>`:field.type==='consent'?`<input ${attrs} type="checkbox" value="yes"${value==='yes'?' checked':''}>`:`<input ${attrs} type="${field.type==='phone'?'tel':field.type==='file'?'file':field.type==='date'?'date':field.type==='email'?'email':'text'}"${field.type==='file'?' accept="application/pdf,.pdf"':` value="${escape(value)}" maxlength="${field.type==='text'?2000:254}" placeholder="${escape(field.placeholder)}"`}${field.type==='phone'?' autocomplete="tel" inputmode="tel"':''}>`
  return `<div class="field"><label for="${id}">${escape(field.label)}${field.required?' (required)':''}</label>${control}${field.help?`<p class="help" id="${id}-help">${escape(field.help)}</p>`:''}${field.type==='file'?'<p class="help">PDF only, up to 5 MB. Files are private to the inbox. Choose the file again after an error.</p>':''}<p class="field-error" id="${id}-error"${error?' role="alert"':' hidden'}>${escape(error??'')}</p></div>`
 }).join('')
 return `<section class="contact-section" aria-label="${escape(form.name)}"><h2>${escape(form.name)}</h2>${!live?'<p class="notice">Draft preview: submissions are disabled.</p>':''}<form method="post" enctype="multipart/form-data" action="${escape(path)}" class="contact-form" data-typed-form${live?` data-turnstile-key="${escape(turnstileKey??'')}" data-form="${escape(pageSlug??(path.slice(6)||'home'))}"`:''}>${key()}<input type="hidden" name="_pane_form" value="${escape(form.id)}">${instance?`<input type="hidden" name="_pane_form_instance" value="${escape(instance)}">`:''}<input type="hidden" name="attribution"><fieldset${live?'':' disabled'}>${fields}<div class="honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabindex="-1" autocomplete="off"></label></div>${live?'<p class="help">Sending uses Cloudflare Turnstile to prevent spam without image puzzles.</p><div data-turnstile-slot></div><p role="status" data-verification-status></p>':''}<button type="submit">${escape(form.submit)}</button></fieldset></form></section>`
}
export async function validateForm(form:SiteForm,fields:FormData,id:string){
 const state:FormState={values:{},errors:{},formId:form.id},uploads:Upload[]=[],answers:string[]=[]
 for(const field of form.fields){
  const raw=fields.get(field.key),value=typeof raw==='string'?raw.trim():'';state.values[field.key]=value
  if(field.type==='file'){
   if(!raw||typeof raw==='string'||!raw.size){if(field.required)state.errors[field.key]='Choose a PDF file.';continue}
   if(raw.size>5*1024*1024){state.errors[field.key]='Choose a file of 5 MB or smaller.';continue}
   const bytes=new Uint8Array(await raw.arrayBuffer())
   if(raw.type!=='application/pdf'||!raw.name.toLowerCase().endsWith('.pdf')||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'){state.errors[field.key]='Choose a PDF file.';continue}
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),chunks:string[]=[]
   for(let i=0;i<bytes.length;i+=65536)chunks.push(btoa(String.fromCharCode(...bytes.slice(i,i+65536))))
   const name=raw.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200)
   uploads.push({id:id+'-'+field.key,name,type:'application/pdf',size:bytes.length,hash,chunks});answers.push(field.label+': '+name+' ('+bytes.length+' bytes)');continue
  }
  if(field.required&&!value)state.errors[field.key]='Complete this required field.'
  else if(value.length> (field.type==='address'?500:field.type==='text'?2000:254))state.errors[field.key]='Shorten this answer.'
  else if(value&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))state.errors[field.key]='Enter a valid email address.'
  else if(value&&field.type==='phone'&&!/^(?:\+?1)?[2-9]\d{2}[2-9]\d{6}$/.test(value.replace(/[ ()\-.]/g,'')))state.errors[field.key]='Enter a valid US phone number.'
  else if(value&&field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))state.errors[field.key]='Enter a valid date.'
  else if(value&&field.type==='choice'&&!field.options!.includes(value))state.errors[field.key]='Choose one of the listed options.'
  else if(value&&field.type==='consent'&&value!=='yes')state.errors[field.key]='Choose this box explicitly.'
  answers.push(field.label+': '+value)
 }
 for(const field of form.fields)if(state.errors[field.key]&&field.error)state.errors[field.key]=field.error
 const message=form.name+'\n'+answers.join('\n')
 if(message.length>5000)state.errors[form.fields[0].key]='Shorten your answers to 5,000 characters in total.'
 return {state,uploads,message,name:state.values.name||'Website visitor',email:form.fields.filter(field=>field.type==='email').map(field=>state.values[field.key]).find(Boolean)??''}
}
export async function boundedForm(request:Request){
 const reader=request.body?.getReader(),chunks:Uint8Array[]=[],limit=6*1024*1024;let size=0
 if(Number(request.headers.get('content-length')??0)>limit)throw Error('Submission exceeds 6 MB.')
 if(reader)while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>limit){await reader.cancel();throw Error('Submission exceeds 6 MB.')}chunks.push(next.value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return new Request(request.url,{method:'POST',headers:request.headers,body:bytes}).formData()
}
export function uploadStatements(db:D1Database,id:string,message:string,uploads:Upload[]){
 return uploads.flatMap(file=>[
  db.prepare('INSERT OR IGNORE INTO pane_files(id,message_id,name,type,size,hash) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_messages WHERE id=? AND message=?) AND NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(file.id,id,file.name,file.type,file.size,file.hash,id,message,id),
  ...file.chunks.map((data,index)=>db.prepare('INSERT OR IGNORE INTO pane_file_chunks(id,file_id,position,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_files WHERE id=? AND hash=?) AND NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(file.id+'-'+index,file.id,index,data,file.id,file.hash,id)),
 ])
}
export async function privateFile(db:D1Database,id:string){
 const file=await db.prepare('SELECT f.* FROM pane_files f JOIN pane_messages m ON m.id=f.message_id WHERE f.id=?').bind(id).first<{name:string;type:string;size:number;hash:string}>()
 if(!file)return new Response(null,{status:404,headers:{'cache-control':'private, no-store'}})
 const chunks=(await db.prepare('SELECT data FROM pane_file_chunks WHERE file_id=? ORDER BY position').bind(id).all<{data:string}>()).results
 const bytes=new Uint8Array(file.size);let offset=0
 for(const chunk of chunks){const part=Uint8Array.from(atob(chunk.data),c=>c.charCodeAt(0));if(offset+part.length>bytes.length)return new Response(null,{status:503});bytes.set(part,offset);offset+=part.length}
 if(offset!==bytes.length)return new Response(null,{status:503})
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')
 if(digest!==file.hash)return new Response(null,{status:503,headers:{'cache-control':'private, no-store'}})
 return new Response(bytes,{headers:{'content-type':file.type,'content-disposition':'attachment; filename="'+file.name.replace(/[^a-zA-Z0-9._ -]/g,'_')+'"','cache-control':'private, no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; sandbox"}})
}
