import type {Bindings} from '../auth.server'
import type {Site} from './model'
import {operatorMail} from '../mail.server.mjs'
import {latestContent,PostDenied} from './posts'
import {rejectForm,verifyForm,limited,visitor} from './form-protection'
import {escape,hidden,key} from './ui/kit'
import {blogPostPath} from './post-links'
export type Comment={id:string;post:string;parent:string|null;name:string;email:string;website:string;body:string;state:'pending'|'approved'|'spam';actor:string|null;created_at:string}
type Settings={blog:string;enabled:number;approval:number;close_days:number;blocked_words:string;likes:number;notification_mode:string}
export async function commentSettings(db:D1Database,blog:string){return await db.prepare('SELECT * FROM pane_comment_settings WHERE blog=?').bind(blog).first<Settings>()??{blog,enabled:0,approval:1,close_days:0,blocked_words:'',likes:0,notification_mode:'immediate'}}
export async function commentsOpen(db:D1Database,site:Site,post:string){
 const published=site.blogPosts?.find(item=>item.id===post);if(!published)return false
 const settings=await commentSettings(db,published.blog),closed=await db.prepare('SELECT closed FROM pane_comment_posts WHERE post=?').bind(post).first<{closed:number}>()
 return !!settings.enabled&&!closed?.closed&&(!settings.close_days||Date.now()<Date.parse(published.publishedAt)+settings.close_days*86400000)
}
export async function commentList(db:D1Database,post?:string){return (await db.prepare('SELECT * FROM pane_comments'+(post?' WHERE post=?':'')+' ORDER BY created_at,id').bind(...(post?[post]:[])).all<Comment>()).results}
async function notify(env:Bindings,id:string,daily=false){
 const recipients=(await env.DB.prepare(`SELECT o.id,o.email FROM oa_operators o LEFT JOIN pane_roles r ON r.operator_id=o.id WHERE o.status='active' AND (o.role IN ('owner','admin') OR (o.role='member' AND EXISTS(SELECT 1 FROM json_each(r.roles) WHERE value='comment-moderator')))`).all<{id:string;email:string}>()).results
 for(const person of recipients){
  const inserted=await env.DB.prepare("INSERT OR IGNORE INTO pane_comment_notifications(comment,recipient,status) VALUES(?,?,?) RETURNING recipient").bind(id,person.id,daily?'pending':'sending').first();if(!inserted||daily)continue
  let status='failed'
  try{const result=await operatorMail(env)?.send({deliveryId:'pane-comment:'+id+':'+person.id,from:env.MAIL_FROM??'',to:[person.email],subject:'Comment needs review',text:'Review the new comment: '+new URL('/app/comments?comment='+encodeURIComponent(id),env.AUTH_ORIGIN).href,html:'<p>A new comment is ready in your private moderation queue.</p>',headers:{}});status=result?.status==='accepted'?'accepted':result?.status==='development'?'suppressed':'uncertain'}catch{status='uncertain'}
  await env.DB.prepare('UPDATE pane_comment_notifications SET status=? WHERE comment=? AND recipient=?').bind(status,id,person.id).run()
 }
}
export async function submitComment(request:Request,env:Bindings,site:Site,post:string){
 if(!await commentsOpen(env.DB,site,post))return Response.json({error:'Comments are closed.'},{status:403})
 if(Number(request.headers.get('content-length')??0)>20000)return Response.json({error:'Comment too large.'},{status:413})
 const form=await request.formData(),id=String(form.get('idempotency')??''),name=String(form.get('name')??'').trim(),email=String(form.get('email')??'').trim().toLowerCase(),body=String(form.get('message')??'').trim(),website=String(form.get('url')??'').trim(),parent=String(form.get('parent')??'')||null,scope='comment:'+post
 if(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!body||body.length>5000||website.length>500||website&&!/^https?:\/\//.test(website))return Response.json({error:'Enter your name, email and a comment up to 5,000 characters.'},{status:400})
 if(String(form.get('website')??''))return rejectForm(env,scope,'honeypot',form)
 if(await env.DB.prepare('SELECT id FROM pane_erased_comments WHERE id=? UNION ALL SELECT id FROM pane_comments WHERE id=?').bind(id,id).first())return Response.json({received:true})
 const sender=await visitor(request,env.SESSION_SECRET)
 if(await limited(env.DB,'comment-visitor:'+sender+':'+post,20)||await limited(env.DB,'comments:'+post,200))return rejectForm(env,scope,'rate',form)
 const proof=await verifyForm(env,String(form.get('cf-turnstile-response')??''),id,scope)
 if(proof!=='verified')return rejectForm(env,scope,proof,form)
 if(parent&&!await env.DB.prepare("SELECT 1 FROM pane_comments WHERE id=? AND post=? AND parent IS NULL AND state='approved'").bind(parent,post).first())return Response.json({error:'Reply to an approved top-level comment.'},{status:400})
 const published=site.blogPosts!.find(item=>item.id===post)!,settings=await commentSettings(env.DB,published.blog)
 const spam=(body.match(/https?:\/\//gi)??[]).length>=6||settings.blocked_words.split(',').map(word=>word.trim().toLowerCase()).filter(Boolean).some(word=>body.toLowerCase().includes(word))
 const prior=await env.DB.prepare("SELECT 1 FROM pane_comments WHERE email=? AND state='approved'").bind(email).first()
 const state=spam?'spam':!settings.approval&&prior?'approved':'pending'
 const saved=await env.DB.prepare('INSERT OR IGNORE INTO pane_comments(id,post,parent,name,email,website,body,state,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_comments WHERE id=?) RETURNING id').bind(id,post,parent,name,email,website,body,state,new Date().toISOString(),id).first()
 if(saved)await notify(env,id,settings.notification_mode==='daily')
 return new Response(null,{status:303,headers:{location:blogPostPath(site,published)+'?comment=received#comments','cache-control':'no-store'}})
}
export async function commentAction(env:Bindings,actor:{id:string;displayName:string},action:string,input:Record<string,any>,moderate=false){
 if(action==='settings'){
  const current=await latestContent(env.DB);if(!current?.site.blogs?.some(blog=>blog.id===input.blog))throw Error('Choose a blog.')
  const days=Number(input.closeDays??0);if(!Number.isInteger(days)||days<0||days>3650)throw Error('Choose a whole number of days from 0 to 3650.')
  await env.DB.prepare('INSERT INTO pane_comment_settings(blog,enabled,approval,close_days,blocked_words,likes,notification_mode) VALUES(?,?,?,?,?,?,?) ON CONFLICT(blog) DO UPDATE SET enabled=excluded.enabled,approval=excluded.approval,close_days=excluded.close_days,blocked_words=excluded.blocked_words,likes=excluded.likes,notification_mode=excluded.notification_mode').bind(input.blog,input.enabled==='on'?1:0,input.approval==='off'?0:1,days,String(input.blockedWords??'').slice(0,1000),input.likes==='on'?1:0,input.notificationMode==='daily'?'daily':'immediate').run();return {saved:true}
 }
 if(action==='close'){
  const current=await latestContent(env.DB);if(!current?.site.blogPosts?.some(post=>post.id===input.post))throw Error('Choose a published post.')
  await env.DB.prepare('INSERT INTO pane_comment_posts(post,closed) VALUES(?,?) ON CONFLICT(post) DO UPDATE SET closed=excluded.closed').bind(input.post,input.closed==='off'?0:1).run();return {saved:true}
 }
 const ids=Array.isArray(input.ids)?input.ids:[input.id];if(!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'))throw Error('Choose up to 100 comments.')
 if(action==='reply'||action==='author-reply'){
  const parent=await env.DB.prepare("SELECT * FROM pane_comments WHERE id=? AND state='approved' AND parent IS NULL").bind(ids[0]).first<Comment>()
  const current=await latestContent(env.DB),post=current?.site.posts?.find(post=>post.id===parent?.post)
  if(!parent||!post||post.author!==actor.id&&!moderate)throw new PostDenied('Only this post’s native author or an authorized comment moderator can reply as its author.')
  const body=String(input.body??'').trim();if(!body||body.length>5000)throw Error('Enter a reply up to 5,000 characters.')
  const person=await env.DB.prepare('SELECT email FROM oa_operators WHERE id=?').bind(actor.id).first<{email:string}>()
  await env.DB.prepare("INSERT INTO pane_comments(id,post,parent,name,email,body,state,actor,created_at) VALUES(?,?,?,?,?,?,'approved',?,?)").bind(crypto.randomUUID(),parent.post,parent.id,post.byline??actor.displayName,person!.email,body,actor.id,new Date().toISOString()).run();return {replied:true}
 }
 if(!['approve','spam','delete','edit'].includes(action))throw Error('Choose a moderation action.')
 if(action==='edit'&&ids.length!==1)throw Error('Edit one comment at a time.')
 if(action==='edit'&&(!String(input.body??'').trim()||String(input.body).length>5000))throw Error('Enter comment text up to 5,000 characters.')
 await env.DB.batch(ids.flatMap(id=>action==='delete'?[env.DB.prepare('INSERT OR IGNORE INTO pane_erased_comments(id) VALUES(?)').bind(id),env.DB.prepare('DELETE FROM pane_comments WHERE id=?').bind(id)]:[action==='edit'?env.DB.prepare('UPDATE pane_comments SET body=? WHERE id=?').bind(String(input.body).trim(),id):env.DB.prepare('UPDATE pane_comments SET state=? WHERE id=?').bind(action==='approve'?'approved':'spam',id)]))
 return {saved:true}
}
export async function commentMarkup(env:Bindings,site:Site,post:string){
 const rows=(await commentList(env.DB,post)).filter(row=>row.state==='approved'),render=(row:Comment)=>`<article id="comment-${escape(row.id)}"><h3>${escape(row.name)}${row.actor?' · Post author':''}</h3><p>${escape(row.body).replaceAll('\n','<br>')}</p></article>`
 const list=rows.filter(row=>!row.parent).map(row=>render(row)+`<div class="comment-replies">${rows.filter(reply=>reply.parent===row.id).map(render).join('')}</div>`).join('')
 const open=await commentsOpen(env.DB,site,post),published=site.blogPosts!.find(item=>item.id===post)!,settings=await commentSettings(env.DB,published.blog)
 const count=await env.DB.prepare('SELECT count FROM pane_post_likes WHERE post=?').bind(post).first<{count:number}>()
 const likes=settings.likes?`<form method="post" action="${escape(blogPostPath(site,published))}?like=1#comments"><p><span data-like-count>${count?.count??0}</span> likes</p><button class="secondary">Like this post</button></form>`:''
 return `<section id="comments" class="public-site" aria-labelledby="comments-heading"><div class="public-shell"><h2 id="comments-heading">Comments</h2>${likes}${list||'<p>No approved comments yet.</p>'}${open?`<form class="edit-form" method="post" data-turnstile-key="${escape(env.TURNSTILE_SITE_KEY??'')}" data-form="comment:${escape(post)}">${hidden('idempotency',crypto.randomUUID())}<label>Name<input name="name" required maxlength="120"></label><label>Email<input name="email" type="email" required maxlength="254"></label><label>Website (optional)<input name="url" type="url" maxlength="500"></label><label>Comment<textarea name="message" required maxlength="5000"></textarea></label><label>Reply to<select name="parent"><option value="">New comment</option>${rows.filter(row=>!row.parent).map(row=>`<option value="${escape(row.id)}">${escape(row.name)}</option>`).join('')}</select></label><div hidden aria-hidden="true"><label>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label></div><p>Your name and approved comment will be public. Your email stays private. Comments may be held for review.</p><div data-turnstile-slot></div><button class="secondary" type="submit">Submit comment</button><p data-verification-status role="status"></p></form><script src="/pane-turnstile.js" defer></script>`:'<p>Comments are closed.</p>'}</div></section>`
}
export async function commentSettingsMarkup(db:D1Database,site:Site){
 return '<details><summary>Comment settings</summary>'+ (await Promise.all((site.blogs??[]).map(async blog=>{const settings=await commentSettings(db,blog.id);return `<form class="edit-form" method="post" action="/app/comments/settings" data-comment-settings>${key()}${hidden('blog',blog.id)}<h2>${escape(blog.title)}</h2><label><input type="checkbox" name="enabled"${settings.enabled?' checked':''}> Enable comments</label><label><input type="checkbox" name="likes"${settings.likes?' checked':''}> Show cookie-free likes</label><label>Notifications<select name="notificationMode"><option value="immediate"${settings.notification_mode==='immediate'?' selected':''}>Each new comment</option><option value="daily"${settings.notification_mode==='daily'?' selected':''}>Daily digest</option></select></label><label>Approval<select name="approval"><option value="on"${settings.approval?' selected':''}>Approve every comment</option><option value="off"${!settings.approval?' selected':''}>Previously approved commenters may post automatically</option></select></label><label>Close after days (0 keeps open)<input type="number" name="closeDays" min="0" max="3650" value="${settings.close_days}"></label><label>Blocked words (comma separated)<input name="blockedWords" maxlength="1000" value="${escape(settings.blocked_words)}"></label><button class="secondary">Save comment settings</button></form>`}))).join('')+'</details>'
}
export async function moderationMarkup(db:D1Database,selected:string){
 const rows=await commentList(db),notifications=(await db.prepare('SELECT comment,recipient,status FROM pane_comment_notifications').all()).results
 return `<h1>Comments</h1><p>Only owners, admins and comment moderators can review this queue. Email delivery state is shown with each comment.</p><form method="post" action="/app/comments/approve">${key()}${rows.map(row=>`<article class="card" id="review-${escape(row.id)}"${row.id===selected?' tabindex="-1"':''}><label><input type="checkbox" name="ids" value="${escape(row.id)}"> Select comment by ${escape(row.name)}</label><p>${escape(row.email)} · ${escape(row.state)}</p><p>${escape(row.body)}</p><p>Notification: ${notifications.filter(item=>item.comment===row.id).map(item=>escape(String(item.status))).join(', ')}</p><a href="/app/comments?comment=${escape(row.id)}">Review comment</a></article>`).join('')||'<p>No comments to review.</p>'}<div class="comment-actions"><button class="secondary">Approve selected</button><button formaction="/app/comments/spam" class="secondary">Mark selected as spam</button><button formaction="/app/comments/delete" class="secondary">Delete selected</button></div></form>${rows.filter(row=>row.id===selected).map(row=>`<form class="edit-form" method="post" action="/app/comments/edit">${key()}${hidden('id',row.id)}<label>Edit comment<textarea name="body" required maxlength="5000">${escape(row.body)}</textarea></label><button class="secondary">Save comment edit</button></form>${row.state==='approved'&&!row.parent?`<form class="edit-form" method="post" action="/app/comments/author-reply">${key()}${hidden('id',row.id)}<label>Reply as post author<textarea name="body" required maxlength="5000"></textarea></label><button class="secondary">Publish reply as post author</button></form>`:''}` ).join('')}`
}
export async function authorCommentMarkup(db:D1Database,site:Site,post:string,actor:string,owner:boolean){
 const entry=site.posts?.find(item=>item.id===post);if(!entry)return ''
 const rows=(await commentList(db,post)).filter(row=>row.state==='approved'&&!row.parent)
 return `<section class="card"><h2>Post comments</h2>${owner?`<form method="post" action="/app/comments/close">${key()}${hidden('post',post)}<label>Comment availability<select name="closed"><option value="on">Close comments</option><option value="off">Reopen comments</option></select></label><button class="secondary">Save availability</button></form>`:''}${entry.author===actor?rows.map(row=>`<form class="edit-form" method="post" action="/app/comments/reply">${key()}${hidden('id',row.id)}<p>${escape(row.name)}: ${escape(row.body)}</p><label>Author reply<textarea name="body" required maxlength="5000"></textarea></label><button class="secondary">Publish author reply</button></form>`).join(''):''}</section>`
}

/** Counts are aggregate. The minute bucket holds only a keyed address digest,
 * never cookies, email, or a persistent visitor identity. */
export async function likePost(request:Request,env:Bindings,site:Site,post:string){
 const published=site.blogPosts?.find(item=>item.id===post)
 if(!published||!(await commentSettings(env.DB,published.blog)).likes)return Response.json({error:'Likes are off.'},{status:403})
 const digest=await visitor(request,env.SESSION_SECRET)
 const minute=new Date().toISOString().slice(0,16),bucket=minute+':like:'+post+':'+digest
 await env.DB.batch([env.DB.prepare('DELETE FROM pane_rate_limits WHERE bucket<?').bind(minute),env.DB.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1').bind(bucket),env.DB.prepare('INSERT INTO pane_post_likes(post,count) SELECT ?,1 WHERE (SELECT count FROM pane_rate_limits WHERE bucket=?)=1 ON CONFLICT(post) DO UPDATE SET count=count+1').bind(post,bucket)])
 return new Response(null,{status:303,headers:{location:blogPostPath(site,published)+'#comments','cache-control':'no-store'}})
}
export async function sendCommentDigests(env:Bindings,now:number){
 const pending=(await env.DB.prepare("SELECT DISTINCT recipient FROM pane_comment_notifications n JOIN pane_comments c ON c.id=n.comment WHERE n.status='pending' AND c.created_at<=? LIMIT 100").bind(new Date(now-86400000).toISOString()).all<{recipient:string}>()).results
 for(const {recipient} of pending){
  const person=await env.DB.prepare("SELECT o.email FROM oa_operators o LEFT JOIN pane_roles r ON r.operator_id=o.id WHERE o.id=? AND o.status='active' AND (o.role IN ('owner','admin') OR (o.role='member' AND EXISTS(SELECT 1 FROM json_each(r.roles) WHERE value='comment-moderator')))").bind(recipient).first<{email:string}>()
  if(!person){await env.DB.prepare("UPDATE pane_comment_notifications SET status='revoked' WHERE recipient=? AND status='pending'").bind(recipient).run();continue}
  const claimed=(await env.DB.prepare("UPDATE pane_comment_notifications SET status='sending' WHERE recipient=? AND status='pending' AND comment IN (SELECT id FROM pane_comments WHERE created_at<=? ORDER BY created_at,id LIMIT 100) RETURNING comment").bind(recipient,new Date(now-86400000).toISOString()).all<{comment:string}>()).results
  if(!claimed.length)continue
  let status='failed'
  const batchKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(claimed.map(row=>row.comment).sort().join(':')))),byte=>byte.toString(16).padStart(2,'0')).join('')
  try{const sent=await operatorMail(env)?.send({deliveryId:'pane-comment-digest:'+recipient+':'+batchKey,from:env.MAIL_FROM??'',to:[person.email],subject:'Daily comment review',text:'Comments ready for review:\n'+claimed.map(row=>new URL('/app/comments?comment='+encodeURIComponent(row.comment),env.AUTH_ORIGIN).href).join('\n'),html:'<p>Comments are ready in your private moderation queue.</p>',headers:{}});status=sent?.status==='accepted'?'accepted':sent?.status==='development'?'suppressed':'uncertain'}catch{status='uncertain'}
  await env.DB.prepare('UPDATE pane_comment_notifications SET status=? WHERE recipient=? AND comment IN (SELECT value FROM json_each(?))').bind(status,recipient,JSON.stringify(claimed.map(row=>row.comment))).run()
 }
}
