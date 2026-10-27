import {resolvedBodyHref} from './pane-body-links.mjs'
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function linkedBody(body,link,resolve,button=false,style='primary'){
 if(!link)return body
 const href=resolvedBodyHref(link.href,resolve)
 return `<a${button?` class="button${style==='secondary'||style==='tertiary'?' '+style:''}"`:''} data-body-href="${escape(link.href)}"${href?` href="${escape(href)}"`:''}${link.newTab?' target="_blank" rel="noopener noreferrer"':''}>${body}</a>`
}
export function bodyEmbed(block,render){
 return render?render(block.embed):`<section class="external-embed"><h2>${escape(block.embed.title)}</h2><p>External content is disabled in the editor.</p></section>`
}
