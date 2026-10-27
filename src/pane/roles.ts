import { operatorAuth, type Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
import type { Dashboard,Revision } from './model'
export const paneRoles=['editor','author','comment-moderator','inbox','reporting'] as const
export type PaneRole=typeof paneRoles[number]
export type Capability='ai:write'|'posts:write'|'settings:write'|'pages:read'|'pages:write'|'inbox:read'|'inbox:write'|'reports:read'|'imports:read'|'imports:write'|'publish'|'erase'|'audit'|'team'|'tokens'
export const ownerCapabilities:Capability[]=['ai:write','posts:write','settings:write','pages:read','pages:write','inbox:read','inbox:write','reports:read','imports:read','imports:write','publish','erase','audit','team','tokens']
const grants:Record<PaneRole,Capability[]>={editor:['pages:read','pages:write','ai:write'],author:['posts:write','ai:write'],'comment-moderator':[],inbox:['inbox:read','inbox:write'],reporting:['reports:read']}
export async function capabilities(db:D1Database,operator:{id:string;role:string}):Promise<Capability[]>{
 if(operator.role==='owner')return [...ownerCapabilities]
 if(operator.role==='admin')return ownerCapabilities.filter(c=>!['publish','erase','audit','team','tokens'].includes(c))
 if(operator.role!=='member')return []
 const row=await db.prepare('SELECT roles FROM pane_roles WHERE operator_id=?').bind(operator.id).first<{roles:string}>()
 // Existing unassigned members retain ACCESS-001's read-only workspace.
 if(!row)return ['pages:read','inbox:read','reports:read','imports:read']
 const roles=JSON.parse(row.roles) as PaneRole[]
 return [...new Set(roles.flatMap(role=>grants[role]??[]))]
}
export async function assignRoles(db:D1Database,actorId:string,input:Record<string,unknown>){
 if(!Array.isArray(input.roles)||input.roles.some(role=>!paneRoles.includes(role)))throw Error('Choose supported Pane roles.')
 const id=String(input.operatorId??''),person=await db.prepare("SELECT id FROM oa_operators WHERE id=? AND role='member' AND status IN ('active','invited') AND NOT EXISTS(SELECT 1 FROM pane_anonymized_people WHERE id=oa_operators.id)").bind(id).first()
 if(!person)throw Error('Assign Pane roles to an active or invited native member.')
 const roles=[...new Set(input.roles)].sort()
 await db.prepare('INSERT INTO pane_roles(operator_id,roles,changed_by,changed_at) VALUES(?,?,?,?) ON CONFLICT(operator_id) DO UPDATE SET roles=excluded.roles,changed_by=excluded.changed_by,changed_at=excluded.changed_at').bind(id,JSON.stringify(roles),actorId,Date.now()).run()
 return {operatorId:id,roles}
}
export const can=(data:Dashboard,capability:Capability)=>data.capabilities?.includes(capability)??(data.role.toLowerCase()==='owner'||data.role.toLowerCase()==='admin')
export function visibleRevision(row:Revision|null,caps:Capability[],actor:{id:string;role:string}):Revision|null{
 if(!row||['owner','admin'].includes(actor.role))return row
 const {posts,...site}=row.site
 return {...row,site:{...site,...(caps.includes('posts:write')&&posts?{posts:posts.filter(post=>post.author===actor.id)}:{})}}
}
export function permittedDashboard(data:Dashboard,caps:Capability[],actor:{id:string;role:string}):Dashboard{
 data={...data,draft:visibleRevision(data.draft,caps,actor),live:visibleRevision(data.live,caps,actor),revisions:data.revisions.map(row=>visibleRevision(row,caps,actor)!)}
 return {...data,capabilities:caps,...(data.role==='owner'?{}:{rejectedContent:undefined,spamRetention:undefined,formRejections:[]}),
  ...(caps.includes('team')?{}:{ownershipPeople:undefined,privacyRequest:undefined}),
  ...(caps.includes('pages:read')?{}:{pageRequests:[],draft:null,live:null,revisions:[],approvals:[],schedules:undefined}),
  ...(caps.includes('inbox:read')?{}:{formRejectionCount:0,formRejections:[],messages:[],replies:[],assignees:[],replyWindow:{zone:'America/New_York',days:1}}),
  ...(caps.includes('reports:read')?{}:{visits:[],traffic:{day:[],source:[],referrer:[],device:[],location:[],campaign:[],campaignSource:[],medium:[]},goals:[]}),
  ...(caps.includes('imports:read')?{}:{imports:[]}),
  ...(caps.includes('audit')?{}:{activity:undefined}),
 }
}
export function routeCapability(path:string,method:string):Capability|undefined{
 if(method==='GET'&&(path.startsWith('/app/files/')||path.startsWith('/api/pane/files/')))return 'inbox:read'
 if(method==='GET')return ({'/api/pane/ai/history':'ai:write','/api/pane/posts':'posts:write','/app/posts':'posts:write','/app/posts/canvas':'posts:write','/api/pane/pages':'pages:read','/api/pane/collections':'pages:read','/api/pane/activity':'audit','/api/pane/activity/export':'audit','/api/pane/roles':'team','/api/pane/tokens':'tokens','/app':'pages:read','/app/canvas':'pages:write','/app/inquiries':'inbox:read','/app/moves':'imports:read','/app/search':'pages:write'} as Record<string,Capability>)[path]
 const action=path.replace(/^\/(api\/pane|app)\//,'')
 if((path.startsWith('/app/spam/')||path.startsWith('/api/pane/spam/'))&&['settings','rescue','purge','hold','release'].includes(action.slice(5)))return 'erase'
 if(path.startsWith('/api/pane/ai/')&&['propose','decide','undo'].includes(path.split('/').at(-1)!))return 'ai:write'
 if(['/api/pane/posts/save','/api/pane/posts/submit','/app/posts/save','/app/posts/submit'].includes(path))return 'posts:write'
 if(['/api/pane/posts/schedule','/app/posts/schedule','/api/pane/posts/schedule-approve','/app/posts/schedule-approve'].includes(path))return 'publish'
 if(['/api/pane/posts/publish','/app/posts/publish'].includes(path))return 'publish'
 if(['/api/pane/blogs/save','/app/blogs/save','/api/pane/library/upload','/app/library/upload'].includes(path))return 'settings:write'
 return ({'component-create':'pages:write',forms:'settings:write',access:'settings:write','privacy/find':'erase','privacy/export':'erase','privacy/erase':'erase','policies/generate':'settings:write','ownership/transfer':'team','team/revoke':'team',prepare:'pages:write',autosave:'pages:write',publish:'publish','publication-revoke':'publish','page-request-review':'pages:write','page-schedule':'publish','page-schedule-approve':'publish','page-publish':'publish',rollback:'publish',review:'pages:write','import/dry-run':'imports:write','import/apply':'imports:write','import/undo':'imports:write','import/crawl-challenge':'imports:write','import/crawl':'imports:write','messages/update':'inbox:write','messages/reply':'inbox:write','messages/erase':'erase','people/erase':'erase','tokens/create':'tokens','tokens/revoke':'tokens','roles/set':'team','roles/invite':'team'} as Record<string,Capability>)[action]
}

/** Hold native invitation delivery until its Pane grants are saved. No alternate
 * account/session system, and no role-bearing link goes out before assignment. */
export async function inviteRoles(env:Bindings,request:Request,actorId:string,input:Record<string,unknown>){
 if(!Array.isArray(input.roles)||!input.roles.length||input.roles.some(role=>!paneRoles.includes(role)))throw Error('Choose explicit Pane roles.')
 if(typeof input.email!=='string'||typeof input.displayName!=='string')throw Error('Provide a name and email.')
 const sender=operatorMail(env)
 if(!sender)throw Error('Configure invitation mail first.')
 const email=input.email.trim().toLowerCase()
 let result:{operatorId:string;roles:unknown[]}|undefined
 const native=operatorAuth(env,{send:async message=>{
  const person=await env.DB.prepare('SELECT id FROM oa_operators WHERE email=?').bind(email).first<{id:string}>()
  if(!person)throw Error('Invitation was not prepared.')
  result=await assignRoles(env.DB,actorId,{operatorId:person.id,roles:input.roles})
  // Returning the real result preserves native failed-send link revocation.
  return sender.send(message)
 }})
 const returnTo=input.roles.includes('editor')?'/app':input.roles.includes('inbox')?'/app/inquiries':input.roles.includes('reporting')?'/app/sites':input.roles.includes('author')?'/app/posts':'/app'
 await native.invite(request,{email,displayName:input.displayName,role:'member',returnTo})
 if(!result)throw Error('Invitation was not prepared.')
 return {...result,invited:true}
}
