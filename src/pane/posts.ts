import {cleanSlug} from './pages'
import {DraftConflict,prepare,revision} from './content'
import type {Page,Revision,Site} from './model'
export type Post={id:string;author:string;blog:string;state:'draft'|'review';content:Page}
export class PostDenied extends Error{}
export async function latestContent(db:D1Database):Promise<Revision|null>{const row=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first();return row?revision(row):null}
export function ownPost(site:Site,id:unknown,actor:string,manage:boolean){
 const post=site.posts?.find(post=>post.id===id)
 if(!post||!manage&&post.author!==actor)throw new PostDenied('This post is outside your content permissions.')
 return post
}
export function postView(row:Revision|null,actor:string,manage:boolean){return {base:row?.id??null,posts:(row?.site.posts??[]).filter(post=>manage||post.author===actor)}}
/** A post is private content, not a live page. Server-owned attribution cannot
 * be changed by an author, and submitting does not publish or send a message. */
export async function savePost(db:D1Database,actor:string,input:Record<string,any>,manage:boolean,submit:boolean){
 const base=await latestContent(db)
 if(!base||base.id!==input.base)throw new DraftConflict(base)
 const existing=input.id?ownPost(base.site,input.id,actor,manage):undefined
 if(submit&&!existing)throw Error('Save your own post before submitting it.')
 if(input.author!==undefined&&input.author!==(existing?.author??actor))throw new PostDenied('Post authorship is assigned by the server.')
 const id=existing?.id??crypto.randomUUID()
 const content=submit?existing!.content:input.content
 if(!content||typeof content!=='object'||Array.isArray(content))throw Error('Provide a post title, URL and body.')
 const allowed=['slug','title','body','sections','importedHtml','links','search','id','hidden']
 if(Object.keys(content).some(key=>!allowed.includes(key)))throw new PostDenied('Posts accept content fields only, not site settings, access or executable code.')
 const post:Post={id,author:existing?.author??actor,blog:cleanSlug(submit?existing!.blog:input.blog??existing?.blog??'news'),state:submit?'review':'draft',content:{...content,id,hidden:true}}
 if(submit&&existing?.state==='review')return base
 const site=structuredClone(base.site);site.posts=[...(site.posts??[]).filter(item=>item.id!==id),post]
 return prepare(db,actor,site,base.id)
}
