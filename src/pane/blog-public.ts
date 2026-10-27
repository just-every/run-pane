import {socialLinks} from './navigation'
import {preparedImageResponse} from './image-response'
import {layoutMarkup} from '../../public/pane-layout.mjs'
import {publicPage,paragraphs} from './public-view'
import {document} from './views'
import {escape,when} from './ui/kit'
import {localAt} from './schedule-time'
import {bodyLinkResolver,blogPostPath} from './post-links'
import {embedMarkup,pageEmbedOrigins} from './embeds'
import {libraryDownload} from './library-files'
import type {Site} from './model'

const zone=(site:Site)=>site.automations?.timeZone??'America/New_York'
const month=(site:Site,post:Published)=>localAt(Date.parse(post.publishedAt),zone(site)).slice(0,7)
type Published=NonNullable<Site['blogPosts']>[number]
const token=(value:string)=>encodeURIComponent(value.normalize('NFC'))
const xml=(value:string)=>escape(value)
const absolute=(origin:string,path:string)=>new URL(path,origin).href
function shareLinks(origin:string,path:string,title:string){
 const url=absolute(origin,path),encoded=encodeURIComponent(url)
 const links=[['Facebook','https://www.facebook.com/sharer/sharer.php?u='+encoded],['X','https://twitter.com/intent/tweet?url='+encoded+'&text='+encodeURIComponent(title)],['LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+encoded],['Pinterest','https://pinterest.com/pin/create/button/?url='+encoded+'&description='+encodeURIComponent(title)],['Email','mailto:?subject='+encodeURIComponent(title)+'&body='+encoded]]
 return `<nav aria-label="Share this post">${links.map(([name,href])=>`<a href="${escape(href)}" rel="noopener noreferrer"${name==='Email'?'':' target="_blank"'}>Share by ${name}</a>`).join(' · ')}</nav>`
}
function featuredImage(post:Published,path:string){
 const image=post.featuredImage;if(!image)return ''
 return `<img src="${escape(path+'?featured=1&width=0')}"${image.renditions?.length?` srcset="${image.renditions.map(item=>escape(path+'?featured=1&width='+item.width)+' '+item.width+'w').join(', ')}" sizes="(max-width: 700px) 100vw, 1100px"`:''} width="${image.width}" height="${image.height}" loading="lazy" decoding="async" alt="${escape(image.decorative?'':image.alt??'')}">`
}
function metadata(site:Site,post:Published){
 const blog=site.blogs!.find(blog=>blog.id===post.blog)!,prefix='/site/'+blog.prefix
 return `<p>By <a href="${prefix}/author/${token(post.authorSlug)}">${escape(post.byline)}</a> · ${when(post.publishedAt,'day',zone(site),site.locale?.locale??'en-US')}</p><nav aria-label="Post categories">${post.categories.map(name=>`<a href="${prefix}/category/${token(name)}">${escape(name)}</a>`).join(' · ')}</nav><nav aria-label="Post tags">${post.tags.map(name=>`<a href="${prefix}/tag/${token(name)}">${escape(name)}</a>`).join(' · ')}</nav>`
}
function shell(site:Site,title:string,body:string){return `<div class="public-site"><div class="public-shell"><header class="public-header"><a class="public-brand" href="/site">${escape(site.name)}</a><nav aria-label="Blogs">${(site.blogs??[]).map(blog=>`<a href="/site/${escape(blog.prefix)}">${escape(blog.title)}</a>`).join(' · ')}</nav></header><main class="public-main" id="main"><h1>${escape(title)}</h1>${body}</main></div></div>`}
function bodyMarkup(site:Site,post:Published,origin:string){
 const path=blogPostPath(site,post),resolve=bodyLinkResolver(site,'live',post.content.slug)
 const markup=post.content.sections?layoutMarkup(post.content.sections,(id:string,width:number)=>absolute(origin,path)+'?pane-image='+encodeURIComponent(id)+'&width='+width,site.media,{socialMarkup:()=>socialLinks(site),resolveLink:(href:string)=>{const result=resolve(href);return result?absolute(origin,result):undefined},embedMarkup:(embed:Parameters<typeof embedMarkup>[0])=>embedMarkup(embed,false,true)}):paragraphs(post.content.body).map(text=>'<p>'+escape(text)+'</p>').join('')
 return markup.replace(/(?:href|src)="(\/[^"<>]*)"/g,(all:string,path:string)=>all.slice(0,all.indexOf('"')+1)+escape(absolute(origin,path))+'"')
}
function rss(site:Site,blog:NonNullable<Site['blogs']>[number],posts:Published[],origin:string){
 const url=absolute(origin,'/site/'+blog.prefix)
 return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+xml(blog.title)+'</title><link>'+xml(url)+'</link><description>'+xml(site.description)+'</description>'+posts.map(post=>{const href=absolute(origin,blogPostPath(site,post));return '<item><guid isPermaLink="false">'+xml(post.id)+'</guid><title>'+xml(post.content.title)+'</title><link>'+xml(href)+'</link><pubDate>'+new Date(post.publishedAt).toUTCString()+'</pubDate><description>'+xml(bodyMarkup(site,post,origin))+'</description>'+post.categories.map(name=>'<category>'+xml(name)+'</category>').join('')+'</item>'}).join('')+'</channel></rss>'
}
export async function blogResponse(request:Request,site:Site):Promise<Response|null>{
 const url=new URL(request.url),path=decodeURIComponent(url.pathname),head=request.method==='HEAD'
 if(!['GET','HEAD'].includes(request.method))return null
 if(path.startsWith('/site/files/'))return libraryDownload(site,path.slice('/site/files/'.length),head)
 const blog=site.blogs?.find(blog=>path==='/site/'+blog.prefix||path.startsWith('/site/'+blog.prefix+'/'))
 if(!blog)return null
 const prefix='/site/'+blog.prefix,tail=path.slice(prefix.length).replace(/^\//,''),posts=(site.blogPosts??[]).filter(post=>post.blog===blog.id).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id))
 let response:Response
 if(['feed.xml','rss.xml'].includes(tail))response=new Response(rss(site,blog,posts,url.origin),{headers:{'content-type':'application/rss+xml; charset=utf-8','cache-control':'private, no-store'}})
 else{
  const post=posts.find(post=>blogPostPath(site,post)===path)
  if(post){
   const content={...post.content,slug:blog.prefix+'/'+post.content.slug,hidden:true},publicSite={...site,pages:[...site.pages.filter(page=>page.slug!==content.slug),content]}
   let markup=publicPage(publicSite,content.slug,'live',request.headers.get('Sec-GPC')==='1',request.headers.get('DNT')==='1')
   markup=markup.replace('<div class="public-content">','<div class="public-content">'+metadata(site,post))
   markup+=`<aside class="public-site"><div class="public-shell">${shareLinks(url.origin,path,post.content.title)}<p><a href="${prefix}">Back to ${escape(blog.title)}</a></p></div></aside>`
   response=await document(post.content.title+' · '+site.name,markup,'site',pageEmbedOrigins(content),undefined,site.locale?.locale)
   const headers=new Headers(response.headers),canonical=absolute(url.origin,path),image=post.featuredImage?.src
   const body=(await response.text()).replace('</head>',`<link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${escape(post.content.title)}"><meta property="og:description" content="${escape(post.excerpt)}"><meta property="og:url" content="${escape(canonical)}">${image?`<meta property="og:image" content="${escape(absolute(url.origin,path+'?featured=1'))}">`:''}</head>`)
   if(url.searchParams.has('featured')){
    return preparedImageResponse(post.featuredImage,url.searchParams.get('width')??'0',head)
   }
   response=new Response(body,{headers})
  }else{
   let selected=posts,title=blog.title
   const [kind,...parts]=tail.split('/'),value=parts.join('/')
   if(kind==='category'&&value){selected=posts.filter(post=>post.categories.includes(value));title=value}
   else if(kind==='tag'&&value){selected=posts.filter(post=>post.tags.includes(value));title=value}
   else if(kind==='author'&&value){selected=posts.filter(post=>post.authorSlug===value);title=selected[0]?.byline??'Author'}
   else if(kind==='archive'&&/^\d{4}-\d{2}$/.test(value)){selected=posts.filter(post=>month(site,post)===value);title=value}
   else if(tail)return null
   const count=selected.length,page=Number(url.searchParams.get('page')??1)
   if(!Number.isInteger(page)||page<1||page>Math.max(1,Math.ceil(count/blog.pageSize)))return null
   const visible=selected.slice((page-1)*blog.pageSize,page*blog.pageSize)
   const items=visible.map(post=>`<article><h2><a href="${escape(blogPostPath(site,post))}">${escape(post.content.title)}</a></h2>${featuredImage(post,blogPostPath(site,post))}<p>${escape(post.excerpt)}</p>${metadata(site,post)}</article>`).join('')||'<p>No published posts yet.</p>'
   const archives=[...new Set(posts.map(post=>month(site,post)))].map(month=>`<a href="${prefix}/archive/${month}">${month}</a>`).join(' · ')
   response=await document(title+' · '+site.name,shell(site,title,items+`<nav aria-label="Blog pages">${page>1?`<a href="?page=${page-1}">Previous page</a>`:''}${page*blog.pageSize<count?`<a href="?page=${page+1}">Next page</a>`:''}</nav><p><a href="${prefix}/feed.xml">RSS feed</a></p><nav aria-label="Blog archives">${archives}</nav>`),'site')
  }
 }
 return new Response(head?null:response.body,{status:response.status,headers:response.headers})
}
