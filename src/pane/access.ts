import type { Page, Site } from './model'
import { operatorAuth, type Bindings } from '../auth.server'
import { document } from './views'
import { escape } from './ui/kit'
export type AccessRule = {mode:'password';salt:string;hash:string}|{mode:'members'}
export type SiteAccess = {mode:'open'|'password'|'coming-soon';title:string;message:string;password?:AccessRule;folders:Record<string,AccessRule>;members:string[]}
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits'])
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))
}
export async function sealPassword(password:string):Promise<AccessRule>{
 if(password.length<12||password.length>200)throw Error('Use a password from 12 to 200 characters.')
 const salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
 return {mode:'password',salt,hash:await passwordHash(password,salt)}
}
export function normalizeRule(value:unknown):AccessRule|undefined {
 if(value===undefined||value===null)return undefined
 const rule=value as AccessRule
 if(rule.mode==='members')return {mode:'members'}
 if(rule.mode==='password'&&/^[a-f0-9]{32}$/.test(rule.salt)&&/^[a-f0-9]{64}$/.test(rule.hash))return {mode:'password',salt:rule.salt,hash:rule.hash}
 throw Error('Choose member access or set a password in access settings.')
}
export function normalizeAccess(value:SiteAccess|undefined):SiteAccess|undefined{
 if(value===undefined)return undefined
 if(!value||!['open','password','coming-soon'].includes(value.mode)||typeof value.title!=='string'||!value.title.trim()||value.title.length>120||typeof value.message!=='string'||value.message.length>2000||!Array.isArray(value.members)||value.members.some(id=>typeof id!=='string'||id.length>240)||!value.folders||typeof value.folders!=='object'||Array.isArray(value.folders))throw Error('Invalid site access settings.')
 const password=normalizeRule(value.password)
 if(password?.mode==='members'||value.mode==='password'&&!password)throw Error('Set a site password before enabling the password gate.')
 return {mode:value.mode,title:value.title.trim(),message:value.message,password,folders:Object.fromEntries(Object.entries(value.folders).map(([name,rule])=>[name,normalizeRule(rule)!])),members:[...new Set(value.members)]}
}
export function pageRules(site:Site,page?:Page):AccessRule[]{return [page?.folder?site.access?.folders[page.folder]:undefined,page?.access].filter((rule):rule is AccessRule=>!!rule)}
export function isProtected(site:Site,page:Page){return site.access?.mode&&site.access.mode!=='open'||pageRules(site,page).length>0}
async function proof(rule:AccessRule,env:Bindings,expires:number){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('pane-access:'+JSON.stringify(rule)+':'+expires)))
}
export async function accessResponse(request:Request,env:Bindings,site:Site,page?:Page):Promise<Response|null>{
 const global=site.access?.mode!=='open'&&site.access?.mode!==undefined
 const rules=[...(global?[site.access?.password]:[]),...pageRules(site,page)]
 if(!global&&!rules.length)return null
 const cookies=request.headers.get('Cookie')??''
 let input:FormData|undefined
 if(request.method==='POST'&&new URL(request.url).searchParams.has('unlock')){
  if(Number(request.headers.get('content-length')??0)>4096)return new Response(null,{status:413,headers:{'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'}})
  const bucket='gate:'+new Date().toISOString().slice(0,16)
  const count=await env.DB.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket).first<{count:number}>()
  if(!count||count.count>20)return new Response('Please try again in a minute.',{status:429,headers:{'cache-control':'private, no-store','retry-after':'60','x-robots-tag':'noindex, nofollow'}})
  input=await request.formData()
 }
 let memberAllowed:boolean|undefined
 for(const [index,rule] of rules.entries()){
  if(rule?.mode==='members'){
   if(memberAllowed===undefined){
    // Native admission, revocation and session validation run on every request.
    try {const session=await operatorAuth(env).getSession(request);memberAllowed=!!session&&(site.access?.members??[]).includes(session.operator.id)}catch{memberAllowed=false}
   }
   if(memberAllowed)continue
  }else if(rule?.mode==='password'){
   const name='pane_access_'+rule.salt,present=cookies.split(';').map(cookie=>cookie.trim()).find(cookie=>cookie.startsWith(name+'='))?.slice(name.length+1)??''
   const signed=/^(\d{13})\.([a-f0-9]{64})$/.exec(present),now=Date.now(),expires=signed?Number(signed[1]):0
   if(signed&&expires>now&&expires<=now+3600000&&signed[2]===await proof(rule,env,expires))continue
   if(input&&await passwordHash(String(input.get('password')??'').slice(0,201),rule.salt)===rule.hash){
    const expires=Date.now()+3600000,token=expires+'.'+await proof(rule,env,expires)
    return new Response(null,{status:303,headers:{location:new URL(request.url).pathname,'cache-control':'private, no-store','set-cookie':`${name}=${token}; Path=/site; HttpOnly; SameSite=Strict; Max-Age=3600${new URL(request.url).protocol==='https:'?'; Secure':''}`}})
   }
  }
  return gate(request,site,rule?.mode==='members',!!input,!!global&&index===0)
 }
 return null
}
async function gate(request:Request,site:Site,members:boolean,invalid:boolean,global:boolean){
 const url=new URL(request.url),title=global?site.access!.title:members?'Member sign-in required':'This page is protected'
 const body=`<div class="public-site"><div class="public-shell"><main class="public-main" id="main"><div class="public-copy"><h1>${escape(title)}</h1>${global?`<p>${escape(site.access!.message)}</p>`:''}${invalid?'<p role="alert">The password was not accepted.</p>':''}${members?`<p>Sign in with an account admitted by the site owner.</p><a href="/signin?returnTo=${encodeURIComponent(url.pathname)}">Member sign in</a>`:(!global||site.access?.password)?`<form class="contact-form" method="post" action="${escape(url.pathname)}?unlock=1"><label>Site password<input type="password" name="password" required maxlength="200" autocomplete="current-password"></label><button type="submit">Open site</button></form>`:''}</div></main></div></div>`
 const response=await document(title,body,'site'),headers=new Headers(response.headers)
 headers.set('cache-control','private, no-store');headers.set('vary','Cookie');headers.set('x-robots-tag','noindex, nofollow')
 return new Response(request.method==='HEAD'?null:response.body,{status:members||invalid?403:200,headers})
}
export async function accessFromForm(site:Site,form:Record<string,any>):Promise<Site>{
 const rule=async(prefix:string,current?:AccessRule)=>{
  const mode=form[prefix+'.mode'];if(mode==='public')return undefined
  if(mode==='members')return {mode:'members'} as AccessRule
  if(mode!=='password')throw Error('Choose an access mode.')
  return form[prefix+'.password']?sealPassword(String(form[prefix+'.password'])):current?.mode==='password'?current:Promise.reject(Error('Set a password before protecting this page.'))
 }
 const folders:Record<string,AccessRule>={}
 for(const [i,name] of (site.folders??[]).entries()){const value=await rule('folder.'+i,site.access?.folders[name]);if(value)folders[name]=value}
 const pages=await Promise.all(site.pages.map(async(page,i)=>({...page,access:page.deleted?page.access:await rule('page.'+i,page.access)})))
 const password=form.sitePassword?await sealPassword(String(form.sitePassword)):form.removeSitePassword==='yes'?undefined:site.access?.password
 return {...site,pages,access:normalizeAccess({mode:form.gateMode,title:String(form.gateTitle??''),message:String(form.gateMessage??''),password,folders,members:Array.isArray(form.members)?form.members:form.members?[form.members]:[]})}
}
