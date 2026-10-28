import type {Site} from './model'
import {siteStyleCss} from './site-styles'
import {codeHashes} from './custom-code'

/** The same approved styles cover pages, posts, collection items and search. */
export async function styleResponse(response:Response,site:Site,fontBase:string):Promise<Response>{
 if(!site.styles||!response.headers.get('content-type')?.includes('text/html'))return response
 const style='<style data-pane-layout>'+siteStyleCss(site.styles,fontBase)+'</style>'
 const hashes=await codeHashes(style,'style'),headers=new Headers(response.headers)
 headers.set('content-security-policy',(headers.get('content-security-policy')??'').replace("style-src 'self'","style-src 'self' "+hashes.join(' ')))
 const styled=new HTMLRewriter().on('head',{element(element){element.append(style,{html:true})}}).on('.public-site',{element(element){element.setAttribute('data-site-styles','')}}).transform(response)
 return new Response(styled.body,{status:response.status,headers})
}
