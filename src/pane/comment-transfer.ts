import type {Bindings} from '../auth.server'
import {parseImportDocument} from './import-formats'
import {latestContent} from './posts'
import {commentList,type Comment} from './comments'
import {escape,key,hidden} from './ui/kit'
import {blogPostPath} from './post-links'
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('')
const tag=(name:string,value:string)=>`<${name}>${escape(value)}</${name}>`
/** Private owner export: email addresses never enter the public feed. */
export async function exportCommentWxr(env:Bindings){
 const current=await latestContent(env.DB);if(!current)throw Error('Save a site first.')
 const rows=await commentList(env.DB),posts=[...new Map([...(current.site.blogPosts??[]),...(current.site.posts??[])].map(post=>[post.id,post])).values()],numbers=new Map(rows.map((row,i)=>[row.id,String(i+1)]))
 for(const id of new Set(rows.map(row=>row.post)))if(!posts.some(post=>post.id===id))posts.push({id,blog:'',content:{slug:'former-post-'+posts.length,title:'Former post',body:''}} as typeof posts[number])
 const items=posts.map((post,i)=>tag('item','').replace('</item>',[
  tag('title',post.content.title),tag('link',new URL(current.site.blogs?.some(blog=>blog.id===post.blog)?blogPostPath(current.site,post):'/site',env.AUTH_ORIGIN).href),tag('wp:post_id',String(i+1)),tag('wp:post_name',post.content.slug),tag('wp:post_type','post'),tag('wp:status','draft'),tag('content:encoded',post.content.body),
  ...rows.filter(row=>row.post===post.id).map(row=>'<wp:comment>'+[
   tag('wp:comment_id',numbers.get(row.id)!),tag('pane:comment_key',row.id),tag('wp:comment_author',row.name),tag('wp:comment_author_email',row.email),tag('wp:comment_author_url',row.website),tag('wp:comment_date_gmt',row.created_at.replace('T',' ').replace(/\.000Z$|Z$/,'')),tag('wp:comment_content',row.body),tag('wp:comment_approved',row.state==='approved'?'1':row.state==='pending'?'0':'spam'),tag('wp:comment_parent',row.parent?numbers.get(row.parent)??'0':'0'),tag('wp:comment_type','comment')
  ].join('')+'</wp:comment>')
 ].join('')+'</item>')).join('')
 return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:pane="https://runeditrun.com/pane/wxr"><channel>'+tag('title',current.site.name)+tag('link',env.AUTH_ORIGIN)+tag('wp:base_site_url',env.AUTH_ORIGIN)+tag('wp:wxr_version','1.2')+items+'</channel></rss>'
}
export async function planCommentTransfer(db:D1Database,source:string,post:string,sourcePost:string){
 const input=parseImportDocument(source);if(input.format!=='wordpress-wxr')throw Error('Choose a WordPress WXR export.')
 const current=await latestContent(db),target=current?.site.posts?.find(item=>item.id===post)
 if(!target)throw Error('Choose an existing native post.')
 const matches=input.items.filter(item=>item.kind==='post'&&(item.id===sourcePost||item.oldUrl===sourcePost));if(matches.length!==1)throw Error('Choose the unique source post URL shown in the WXR inventory.');const parentPost=matches[0]
 const sourceRows=input.items.filter(item=>item.kind==='comment'&&item.fields?.post===parentPost.id)
 if(!sourceRows.length||sourceRows.length>100)throw Error('Choose a post with 1 to 100 comments per transfer.')
 const ids=new Map<string,string>()
 for(const row of sourceRows){const fields=row.fields!;if(!fields.id||ids.has(fields.id))throw Error('Source comment identifiers must be unique.');ids.set(fields.id,fields.key&&/^[a-zA-Z0-9-]{1,100}$/.test(fields.key)?fields.key:'wxr-'+await digest((input.origin??'')+':'+parentPost.id+':'+fields.id))}
 const comments:Comment[]=sourceRows.map(row=>{
  const f=row.fields!,date=f.date.trim().replace(' ','T'),stamp=Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(date)?date:date+'Z'),parent=f.parent&&f.parent!=='0'?ids.get(f.parent):null
  if(!f.name?.trim()||f.name.length>120||!/^\S+@\S+\.\S+$/.test(f.email??'')||f.email.length>254||!f.body?.trim()||f.body.length>5000||(!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?$/.test(f.date)||!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,19)!==date.slice(0,19))||!['approved','pending','spam'].includes(row.state??'')||f.parent!=='0'&&f.parent&&!parent)throw Error('Comment has unsupported author, date, state, content or parent; nothing was imported.')
  if(f.website&&(!/^https?:\/\//.test(f.website)||f.website.length>500))throw Error('Comment website must be an HTTP or HTTPS address.')
  return {id:ids.get(f.id)!,post,parent:parent??null,name:f.name,email:f.email.trim().toLowerCase(),website:f.website??'',body:f.body,state:row.state as Comment['state'],actor:null,created_at:new Date(stamp).toISOString()}
 })
 if(new Set(comments.map(row=>row.id)).size!==comments.length)throw Error('Comment identifiers collide.')
 for(const row of comments)if(row.parent){const parent=comments.find(item=>item.id===row.parent);if(!parent||parent.parent||parent.state!=='approved')throw Error('Threads need one approved top-level parent; deeper or hidden-parent threads remain unsupported.')}
 for(const row of comments)if(await db.prepare('SELECT id FROM pane_comments WHERE id=? UNION ALL SELECT id FROM pane_erased_comments WHERE id=?').bind(row.id,row.id).first())throw Error('This source comment already exists or was erased; it cannot be replayed.')
 const fingerprint=await digest(JSON.stringify({source,post,sourcePost,revision:current!.id,comments}))
 return {fingerprint,comments,post,revision:current!.id,title:target.content.title,sourcePost,sourceTitle:parentPost.title}
}
export async function applyCommentTransfer(db:D1Database,source:string,post:string,sourcePost:string,fingerprint:string){
 const plan=await planCommentTransfer(db,source,post,sourcePost);if(plan.fingerprint!==fingerprint)throw Error('The reviewed transfer changed. Review it again.')
 const ordered=[...plan.comments.filter(row=>!row.parent),...plan.comments.filter(row=>row.parent)]
 await db.batch([db.prepare('UPDATE pane_audit_context SET valid=CASE WHEN (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? THEN 1 ELSE 0 END WHERE id=1').bind(plan.revision),...ordered.map(row=>db.prepare(`INSERT INTO pane_comments(id,post,parent,name,email,website,body,state,actor,created_at,import_pending) VALUES(?,?,?,?,?,?,?,?,?,?,1)`).bind(row.id,row.post,row.parent,row.name,row.email,row.website,row.body,row.state,row.actor,row.created_at))])
 return {imported:plan.comments.length,ids:plan.comments.map(row=>row.id)}
}
export function transferForm(site:import('./model').Site){return `<details><summary>Comment portability</summary><p>Export private commenter data as WXR, or review comments from one source post for an existing native post. Imports remain private until you explicitly release them. No notification is sent.</p><p><a class="text-link" href="/app/comments/export">Export comments as WXR</a></p><form method="post" action="/app/comments/import-review" class="edit-form">${key()}<label>WXR export<textarea name="source" required rows="8"></textarea></label><label>Source post URL<input type="url" name="sourcePost" required placeholder="https://your-old-site.example/your-post"></label><label for="comment-transfer-post">Destination post</label><select id="comment-transfer-post" name="post">${(site.posts??[]).map(post=>`<option value="${escape(post.id)}">${escape(post.content.title)}</option>`).join('')}</select><button class="secondary">Review comment import</button></form></details>`}
export function transferReview(plan:Awaited<ReturnType<typeof planCommentTransfer>>,source:string){return `<h1>Review comment import</h1><p>${escape(plan.sourceTitle)} → ${escape(plan.title)}. These comments remain private with their original approval states until you release them.</p><ul>${plan.comments.map(row=>`<li>${escape(row.name)} · ${escape(row.created_at)} · ${escape(row.state)}${row.parent?' · Threaded reply':''}<p>${escape(row.body)}</p></li>`).join('')}</ul><form method="post" action="/app/comments/import-apply">${key()}${hidden('post',plan.post)}${hidden('sourcePost',plan.sourcePost)}${hidden('fingerprint',plan.fingerprint)}<textarea name="source" hidden>${escape(source)}</textarea><button class="secondary">Import private comments</button></form>`}
