import type { Site, Page } from '../model'
import { codePolicy } from '../custom-code'
import { escape } from './kit'
export function customCodeSettings(site:Site,page:Page):string {
 const fields=(code:Record<string,string|undefined>|undefined,prefix:string,keys:string[])=>keys.map(key=>`<label for="${prefix+key}">${escape(prefix==='code.site.'?'Site '+key:'Page '+key)} code</label><textarea id="${prefix+key}" name="${prefix+key}" maxlength="20000" rows="3">${escape(code?.[key]??'')}</textarea>`).join('')
 return `<details class="custom-code-settings"><summary>Custom code settings</summary><p>Third-party code runs only after publication and consent, inside an isolated frame. Outbound requests, forms and nested frames are denied. CSS styles the live page and its code frame; resource-loading CSS is refused. Verification metadata appears in the live document header. Previews stay inert.</p>${fields(site.customCode,'code.site.',['css','html','header','footer'])}${fields(page.customCode,'code.page.',['header','html'])}<p>Frame policy: <code>${escape(codePolicy)}</code></p></details>`
}
