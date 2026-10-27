import {restoredRedirects} from './lifecycle-publication'
import {missingBodyLinks} from './post-links'
import {cleanSlug} from './pages'
import {DraftConflict,prepare,revision,normalizeSite,contentHash,revisionStatement,approvalStatements} from './content'
import {authorSlug,type PublishedPost} from './blogs'
import {requireImageDescriptions} from './accessibility'
import {postFiles} from './library-files'
import type {ImageContent} from './images'
import type {Page,Revision,Site} from './model'
export type Post={deleted?:boolean;id:string;author:string;blog:string;state:'draft'|'review';content:Page;excerpt?:string;categories?:string[];tags?:string[];byline?:string;authorSlug?:string;featuredImage?:ImageContent;media?:import('./gallery').MediaImage[];review?:string}
export class PostDenied extends Error{}
export async function latestContent(db:D1Database):Promise<Revision|null>{const row=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first();return row?revision(row):null}
export function ownPost(site:Site,id:unknown,actor:string,manage:boolean){
 const post=site.posts?.find(post=>post.id===id)
 if(!post||post.deleted||!manage&&post.author!==actor)throw new PostDenied('This post is outside your content permissions.')
 return post
}
export function postView(row:Revision|null,actor:string,manage:boolean){return {base:row?.id??null,blogs:row?.site.blogs??[],posts:(row?.site.posts??[]).filter(post=>!post.deleted&&(manage||post.author===actor))}}
async function reviewToken(post:Post){
 const {review,...submitted}=post
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(submitted)))
 return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')
}
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
 if(!submit&&existing?.authorSlug&&input.authorSlug!==undefined&&input.authorSlug!==existing.authorSlug)throw Error('The public author slug is stable for this post.')
 const metadata:Record<string,unknown>={}
 for(const field of ['excerpt','categories','tags','byline','featuredImage','media'] as const){
  const value=submit?existing?.[field]:input[field]!==undefined?input[field]:existing?.[field]
  if(value!==undefined&&value!==null)metadata[field]=value
 }
 const post:Post={id,author:existing?.author??actor,blog:cleanSlug(submit?existing!.blog:input.blog??existing?.blog??'news'),state:submit?'review':'draft',content:{...content,id,hidden:true},...metadata,authorSlug:existing?.authorSlug??authorSlug(input.authorSlug??'writer-'+crypto.randomUUID())}
 const site=structuredClone(base.site);site.posts=[...(site.posts??[]).filter(item=>item.id!==id),post]
 const normalized=normalizeSite(site),saved=normalized.posts!.find(item=>item.id===id)!
 if(submit){
  saved.review=await reviewToken(saved)
  if(existing?.state==='review'&&existing.review===saved.review)return base
 }
 return prepare(db,actor,normalized,base.id)
}

/** Explicit native-owner approval copies only the selected reviewed post into
 * the live snapshot. A newer retained draft keeps every author's private work. */
export async function publishPost(db:D1Database,actor:{id:string;role:string},input:{base:string;id:string;review:string}):Promise<Revision>{
 if(actor.role!=='owner'||!await db.prepare("SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first())throw new PostDenied('Only the native owner can publish a reviewed post.')
 const [draft,liveRow]=await Promise.all([latestContent(db),db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()])
 if(!draft||draft.id!==input.base)throw new DraftConflict(draft)
 if(!liveRow)throw Error('Publish the initial site before approving individual posts.')
 const post=ownPost(draft.site,input.id,actor.id,true),live=revision(liveRow)
 if(post.state!=='review'||!post.review||post.review!==input.review||post.review!==await reviewToken(post))throw Error('Submit this current post for review before publishing.')
 if(!post.byline?.trim()||!post.authorSlug)throw Error('Review an explicit public byline and author slug before publishing.')
 const blog=draft.site.blogs?.find(blog=>blog.id===post.blog)
 if(!blog)throw Error('Choose a configured blog before publishing.')
 const liveBlog=live.site.blogs?.find(candidate=>candidate.id===blog.id)
 if(liveBlog&&liveBlog.prefix!==blog.prefix)throw Error('Publish blog URL changes separately before approving an individual post.')
 const previous=live.site.blogPosts?.find(candidate=>candidate.id===post.id)
 const at=Math.max(Date.now(),Date.parse(draft.created_at)+1),created_at=new Date(at).toISOString()
 const approved:PublishedPost={id:post.id,blog:post.blog,sourceReview:post.review,excerpt:post.excerpt??'',categories:post.categories??[],tags:post.tags??[],byline:post.byline,authorSlug:post.authorSlug,...(post.featuredImage?{featuredImage:post.featuredImage}:{}),content:{...structuredClone(post.content),hidden:false},publishedAt:previous?.publishedAt??created_at,updatedAt:created_at}
 const {posts:privatePosts,...publicSite}=live.site
 publicSite.redirects=restoredRedirects(draft.site,live.site,'post',post.id,'/site/'+blog.prefix+'/'+post.content.slug)
 const files=postFiles(draft.site,post.content),fileIds=new Set(files.map(file=>file.id))
 const libraryFiles=[...(live.site.libraryFiles??[]).filter(file=>!fileIds.has(file.id)),...files]
 const used=new Set(approved.content.sections?.flatMap(section=>section.blocks.flatMap(block=>block.gallery?.items.map(item=>item.asset)??[]))??[])
 const copies=(post.media??[]).filter(asset=>used.has(asset.id)).map(asset=>({source:asset.id,asset:{...structuredClone(asset),id:crypto.randomUUID()}}))
 for(const section of approved.content.sections??[])for(const block of section.blocks)for(const item of block.gallery?.items??[])item.asset=copies.find(copy=>copy.source===item.asset)?.asset.id??item.asset
 const media=[...(live.site.media??[]),...copies.map(copy=>copy.asset)]
 const site=normalizeSite({...publicSite,...(media.length?{media}:{}),...(libraryFiles.length?{libraryFiles}:{}),blogs:[...(live.site.blogs??[]).filter(candidate=>candidate.id!==blog.id),blog],blogPosts:[...(live.site.blogPosts??[]).filter(candidate=>candidate.id!==post.id),approved]})
 const missing=missingBodyLinks(site,approved.content);if(missing.length)throw Error('Review deleted or unpublished link targets before publishing: '+missing.join(', '))
 // Reuse the same image-description gate as page publication for the post body.
 requireImageDescriptions({...site,pages:[{...approved.content,hidden:false}]})
 if(approved.featuredImage&&!approved.featuredImage.decorative&&!approved.featuredImage.alt?.trim())throw Error('Accessibility warning: the featured image needs alternative text or an explicit decorative mark before publishing.')
 const published:Revision={id:crypto.randomUUID(),site,actor:actor.id,hash:await contentHash(site),created_at}
 const knownMedia=new Set((draft.site.media??[]).map(asset=>asset.id))
 const retainedMedia=[...(draft.site.media??[]),...(site.media??[]).filter(asset=>!knownMedia.has(asset.id))]
 const retainedSite=normalizeSite({...draft.site,...(retainedMedia.length?{media:retainedMedia}:{}),blogPosts:site.blogPosts})
 const retained:Revision={...draft,id:crypto.randomUUID(),site:retainedSite,hash:await contentHash(retainedSite),created_at:new Date(at+1).toISOString()}
 try{
  await db.batch([
   db.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,?
    WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?
    AND (SELECT live FROM pane_state WHERE id=1)=?`).bind(published.id,JSON.stringify(site),published.hash,actor.id,published.created_at,input.base,live.id),
   ...approvalStatements(db,{id:crypto.randomUUID(),action:'publish',revision:published.id,actor:actor.id,created_at}),
   revisionStatement(db,retained),
  ])
 }catch(error){
  const current=await latestContent(db)
  if(current?.id!==input.base)throw new DraftConflict(current)
  throw error
 }
 return published
}
