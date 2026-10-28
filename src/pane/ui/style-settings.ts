import {siteStyleDefaults} from '../../../public/pane-site-styles.mjs'
import type {Site} from '../model'
import {escape} from './kit'
export function styleSettings(site:Site):string {
 const styles=site.styles??siteStyleDefaults
 const select=(key:'headingFont'|'bodyFont'|'button',label:string,options:[string,string][])=>`<label>${label}<select name="style.${key}">${options.map(([value,name])=>`<option value="${value}"${styles[key]===value?' selected':''}>${name}</option>`).join('')}</select></label>`
 const fonts:[string,string][]=[['figtree','Figtree'],['georgia','Georgia'],['system','System'],['mono','JetBrains Mono']]
 return `<details><summary>Site style settings</summary>${select('headingFont','Heading font',fonts)}${select('bodyFont','Body font',fonts)}${(['primary','heading','text','background','sectionBackground'] as const).map(key=>`<label>${({primary:'Primary color',heading:'Heading color',text:'Text color',background:'Page background',sectionBackground:'Section background'})[key]}<input name="style.${key}" type="color" value="${escape(styles[key])}"></label>`).join('')}${select('button','Button shape',[['square','Square'],['rounded','Rounded'],['pill','Pill']])}${(['gap','paddingTop','paddingBottom'] as const).map(key=>`<label>${({gap:'Default column gap',paddingTop:'Default top padding',paddingBottom:'Default bottom padding'})[key]}<input name="style.${key}" type="number" min="0" max="${key==='gap'?160:240}" value="${styles[key]}"></label>`).join('')}<p>New sections use these defaults. Reset a section’s layout to inherit them again. Publish the draft to apply styles to the live site.</p></details>`
}
