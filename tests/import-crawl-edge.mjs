// Public-network edge only. The built Worker still owns auth, DNS proof,
// crawl limits, source parsing, custody, reviewed writes and undo.
export const sourceOrigin='https://synthetic-pane-1.example.com'
export function crawlEdge(){
 const state={proof:'',address:'93.184.215.14',redirect:false,requests:[],dnsRequests:[]}
 state.fetch=async request=>{
  const url=new URL(request.url)
  if(url.origin==='https://cloudflare-dns.com'&&url.pathname==='/dns-query'){
   state.dnsRequests.push(url.searchParams.get('type'))
   const type=url.searchParams.get('type')
   const Answer=type==='TXT'?[{type:16,data:'"'+state.proof+'"'}]:type===(state.address.includes(':')?'AAAA':'A')?[{type:state.address.includes(':')?28:1,data:state.address}]:[]
   return Response.json({Status:0,Answer})
  }
  if(url.origin!==sourceOrigin)throw Error('Unexpected source network request: '+url.origin)
  state.requests.push({url:url.href,method:request.method,cookie:request.headers.get('cookie'),authorization:request.headers.get('authorization')})
  const xml=body=>new Response(body,{headers:{'content-type':'application/xml'}})
  const html=body=>new Response('<!doctype html><html><head><title>synthetic-pane-1</title></head><body>'+body+'</body></html>',{headers:{'content-type':'text/html; charset=utf-8'}})
  if(url.pathname==='/sitemap.xml')return state.redirect?new Response(null,{status:302,headers:{location:'https://synthetic-pane-2.example.com/'}}):xml('<sitemapindex><sitemap><loc>'+sourceOrigin+'/pages.xml</loc></sitemap></sitemapindex>')
  if(url.pathname==='/pages.xml')return xml('<urlset>'+['/','/about','/missing'].map(path=>'<url><loc>'+sourceOrigin+path+'</loc></url>').join('')+'</urlset>')
  if(url.pathname==='/blog-feed.xml')return xml('<rss><channel><item><link>'+sourceOrigin+'/blog/story</link></item></channel></rss>')
  if(url.pathname==='/')return html('<h1>Welcome</h1><p>Our studio.</p><a href="/about">About</a><a href="/discovered">Discovered page</a><a href="https://synthetic-pane-2.example.com/">External</a>')
  if(url.pathname==='/about')return html('<h2>Our studio</h2><ul><li>One</li><li>Two</li></ul>')
  if(url.pathname==='/discovered')return html('<p>Found through the page crawl.</p>')
  if(url.pathname==='/blog/story')return html('<h2>Story</h2><p>Read <a href="/about">about us</a>.</p>')
  return new Response('Not found',{status:404,headers:{'content-type':'text/html'}})
 }
 return state
}
