import {normalizeMedia} from './gallery'
import {normalizeImage,type ImageContent} from './images'
import {cleanSlug} from './pages'
import type {Page,Site} from './model'
import type {Post} from './posts'

export type Blog={id:string;prefix:string;title:string;comments:boolean;pageSize:number}
/** Public attribution is editorial content, never a projection of an account. */
export type PublishedPost={id:string;blog:string;sourceReview:string;excerpt:string;categories:string[];tags:string[];byline:string;authorSlug:string;featuredImage?:ImageContent;content:Page;publishedAt:string;updatedAt:string}
const object=(value:unknown):Record<string,any>=>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide blog or post details.')
 return value as Record<string,any>
}
function text(value:unknown,label:string,max:number,empty=false):string{
 if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())||/[\u0000-\u001f]/.test(value))throw Error(`${label} needs text up to ${max} characters.`)
 return value.normalize('NFC').trim()
}
function identity(value:unknown):string{
 if(typeof value!=='string'||!value.trim()||value.length>240||/[\u0000-\u001f]/.test(value))throw Error('Blog and post identities need bounded, nonempty text.')
 return value
}
export function authorSlug(value:unknown):string{
 const slug=cleanSlug(value)
 if(slug.includes('/'))throw Error('Use one URL segment for the public author slug.')
 return slug
}
export function normalizeTaxonomy(value:unknown):string[]{
 if(value===undefined)return []
 if(!Array.isArray(value)||value.length>30)throw Error('Provide at most 30 categories or tags.')
 return [...new Set(value.map(label=>text(label,'Category or tag',80)))]
}
export function normalizeBlogs(value:unknown):Blog[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>100)throw Error('Provide at most 100 blogs.')
 const ids=new Set<string>(),prefixes=new Set<string>()
 return value.map(raw=>{
  const blog=object(raw)
  if(Object.keys(blog).some(key=>!['id','prefix','title','comments','pageSize'].includes(key)))throw Error('Unsupported blog setting.')
  const id=identity(blog.id),prefix=cleanSlug(blog.prefix??id),title=text(blog.title,'Blog title',120)
  if(ids.has(id)||prefixes.has(prefix))throw Error('Every blog needs a unique identity and URL prefix.')
  if(blog.comments!==undefined&&typeof blog.comments!=='boolean')throw Error('Choose whether blog comments are enabled.')
  const pageSize=blog.pageSize??10
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw Error('Blog page size must be from 1 to 100.')
  ids.add(id);prefixes.add(prefix)
  return {id,prefix,title,comments:blog.comments??false,pageSize}
 })
}
export function normalizePostMetadata(raw:Record<string,any>){
 const excerpt=text(raw.excerpt??'','Post excerpt',1000,true),categories=normalizeTaxonomy(raw.categories),tags=normalizeTaxonomy(raw.tags)
 const byline=raw.byline===undefined?undefined:text(raw.byline,'Public byline',120,true)
 return {excerpt,categories,tags,...(raw.media===undefined?{}:{media:normalizeMedia(raw.media)}),...(byline?{byline}:{}),...(raw.authorSlug===undefined?{}:{authorSlug:authorSlug(raw.authorSlug)}),...(raw.featuredImage===undefined?{}:{featuredImage:normalizeImage(raw.featuredImage)})}
}
const contentFields=['slug','title','body','sections','importedHtml','links','search','id','hidden']
/** Keep post normalization outside the page and site settings implementation. */
export function normalizePostCollections(input:Site,normalizePage:(page:Page,media?:import('./gallery').MediaImage[])=>Page):Partial<Site>{
 const result:Partial<Site>={},blogs=normalizeBlogs(input.blogs)??[]
 const ensureBlog=(id:string)=>{
  if(!blogs.some(blog=>blog.id===id)){
   // Existing private blog identifiers acquire explicit configuration on save.
   const prefix=cleanSlug(id)
   if(blogs.some(blog=>blog.prefix===prefix))throw Error('Every blog needs a unique URL prefix.')
   if(blogs.length>=100)throw Error('Provide at most 100 blogs.')
   blogs.push({id,prefix,title:text(id,'Blog title',120),comments:false,pageSize:10})
  }
 }
 const content=(raw:unknown,id:string,hidden:boolean,media?:import('./gallery').MediaImage[])=>{
  const source=object(raw)
  if(Object.keys(source).some(key=>!contentFields.includes(key)))throw Error('Posts accept content fields only.')
  const page=normalizePage({...source,id,hidden} as Page,media)
  return page
 }
 if(input.posts!==undefined){
  if(!Array.isArray(input.posts)||input.posts.length>1000)throw Error('Provide at most 1000 private posts.')
  const ids=new Set<string>(),paths=new Set<string>()
  result.posts=input.posts.map(raw=>{
   const post=object(raw),id=identity(post.id),author=identity(post.author),blog=cleanSlug(post.blog)
   if(ids.has(id)||!['draft','review'].includes(post.state))throw Error('Invalid private post identity or state.')
   if(Object.keys(post).some(key=>!['id','author','blog','state','content','excerpt','categories','tags','byline','authorSlug','featuredImage','media','review'].includes(key)))throw Error('Unsupported private post field.')
   ids.add(id);ensureBlog(blog)
   const metadata=normalizePostMetadata(post),page=content(post.content,id,true,metadata.media),path=blog+'::'+page.slug
   if(paths.has(path))throw Error('Each private post needs a unique URL within its blog.')
   paths.add(path)
   if(post.review!==undefined&&(typeof post.review!=='string'||!/^[a-f0-9]{64}$/.test(post.review)))throw Error('Invalid submitted post review.')
   return {id,author,blog,state:post.state,content:page,...metadata,...(post.review===undefined?{}:{review:post.review})} as Post
  })
 }
 if(input.blogPosts!==undefined){
  if(!Array.isArray(input.blogPosts)||input.blogPosts.length>1000)throw Error('Provide at most 1000 approved blog posts.')
  const ids=new Set<string>(),paths=new Set<string>()
  result.blogPosts=input.blogPosts.map(raw=>{
   const post=object(raw),id=identity(post.id),blog=cleanSlug(post.blog)
   if(ids.has(id)||Object.keys(post).some(key=>!['id','blog','sourceReview','content','excerpt','categories','tags','byline','authorSlug','featuredImage','publishedAt','updatedAt'].includes(key)))throw Error('Invalid approved post identity or public fields.')
   if(typeof post.sourceReview!=='string'||!/^[a-f0-9]{64}$/.test(post.sourceReview))throw Error('Approved posts retain their reviewed source identifier.')
   ids.add(id);ensureBlog(blog)
   const page=content(post.content,id,false),path=blog+'::'+page.slug,metadata=normalizePostMetadata(post)
   if(['category','tag','author','archive','feed.xml','rss.xml'].includes(page.slug.split('/')[0]))throw Error('Choose a post URL outside reserved blog index paths.')
   if(paths.has(path))throw Error('Each approved post needs a unique URL within its blog.')
   paths.add(path)
   if(!metadata.byline||!metadata.authorSlug)throw Error('Review an explicit public byline and author slug before publishing.')
   for(const field of ['publishedAt','updatedAt'])if(typeof post[field]!=='string'||!Number.isFinite(Date.parse(post[field])))throw Error('Invalid post publication date.')
   return {id,blog,sourceReview:post.sourceReview,...metadata,byline:metadata.byline,authorSlug:metadata.authorSlug,content:page,publishedAt:post.publishedAt,updatedAt:post.updatedAt}
  })
 }
 for(const blog of blogs){
  if(blogs.some(other=>other.id!==blog.id&&(other.prefix.startsWith(blog.prefix+'/')||blog.prefix.startsWith(other.prefix+'/')))||input.pages.some(page=>page.slug===blog.prefix||page.slug.startsWith(blog.prefix+'/')))throw Error('A blog URL prefix must not overlap another blog or a page.')
 }
 if(input.blogs!==undefined||blogs.length)result.blogs=blogs
 return result
}
