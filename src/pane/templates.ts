import type { Site } from './model'
import { sectionText, type Section } from './sections'

// Catalog entries describe editable starting content, never customer facts or endorsements.
export const templateCategories = [
 {id:'restaurant',name:'Restaurant',names:['Neighborhood café','Seasonal kitchen','Family restaurant','Bakery counter','Supper club'],offering:'Menu',items:['Food and drink','Seasonal choices','Dietary information']},
 {id:'salon-spa',name:'Salon and spa',names:['Hair studio','Day spa','Barber shop','Nail studio','Wellness salon'],offering:'Treatments',items:['Services and appointments','Your visit','Care and preparation']},
 {id:'trades',name:'Trades and home services',names:['Home repair','Garden care','Painting company','Electrical service','Plumbing workshop'],offering:'Services',items:['Projects we take on','How estimates work','Service area']},
 {id:'professional',name:'Professional services',names:['Consulting practice','Accounting office','Design consultancy','Legal practice','Independent advisor'],offering:'Expertise',items:['Ways to work together','Our approach','Getting started']},
 {id:'clinic',name:'Clinic',names:['Family clinic','Dental practice','Physical therapy','Eye care','Community clinic'],offering:'Patient information',items:['Available care','Preparing for a visit','Contacting the practice']},
 {id:'studio',name:'Studio',names:['Photography studio','Ceramics workshop','Dance studio','Music studio','Art workshop'],offering:'Our work',items:['Classes and projects','Studio process','Visiting the studio']},
 {id:'retail',name:'Retail',names:['Independent bookshop','Flower shop','Home goods','Bicycle shop','Neighborhood market'],offering:'In the shop',items:['What you can find','Shopping with us','Store information']},
 {id:'nonprofit',name:'Nonprofit',names:['Community group','Arts organization','Neighborhood garden','Education charity','Local foundation'],offering:'Our programs',items:['Our purpose','Community programs','Ways to take part']},
] as const
export const templates = templateCategories.flatMap(category=>category.names.map((name,index)=>({id:category.id+'-'+(index+1),name,category:category.id,categoryName:category.name,variant:index,offering:category.offering,items:category.items})))
export function templateById(id:unknown){const template=templates.find(item=>item.id===id);if(!template)throw Error('Choose a template from the catalog.');return template}
export function templateSite(id:unknown,name:unknown):Site {
 const template=templateById(id)
 if(typeof name!=='string'||!name.trim()||name.length>120)throw Error('Enter your business name (up to 120 characters).')
 const align=template.variant===2?'center' as const:'left' as const
 const block=(id:string,text:string,format:'p'|'h2'='p',column=1,span=12,row=1)=>({id,kind:'text' as const,text,format,column,span,row,order:0,align,vertical:'start' as const})
 const sections=(page:string):Section[]=>{
  const intro=page==='home'?['Welcome to '+name.trim(),'Introduce your '+template.name.toLowerCase()+', the people you help and what visitors can do next.']:page==='services'?[template.offering,'Replace this starting content with the services, choices and information your business offers.']:['Plan your visit','Add your address, opening hours, accessibility information and the best way to contact your team.']
  const split=template.variant===1||template.variant===3
  return [{id:page+'-intro',kind:split?'columns':'text',ratio:template.variant===3?'1:2':'1:1',gap:24,paddingTop:template.variant===4?64:32,paddingBottom:32,background:template.variant===4?'#f7f2f6':'#ffffff',blocks:[block(page+'-heading',intro[0],'h2',1,split?5:12),block(page+'-intro-text',intro[1],'p',split?7:1,split?6:12,split?1:2)]},
   {id:page+'-details',kind:template.variant===0?'text':'columns',ratio:'1:1',gap:24,paddingTop:24,paddingBottom:24,blocks:template.items.flatMap((item,index)=>{
    const columns=template.variant===0?1:template.variant===3?2:3,span=12/columns,column=index%columns*span+1,row=Math.floor(index/columns)*2+1
    return [block(page+'-detail-'+index,item,'h2',column,span,row),block(page+'-copy-'+index,'Add your own '+item.toLowerCase()+'. Review all starting text before publishing.','p',column,span,row+1)]
   })},
   {id:page+'-next',kind:'text',ratio:'1:1',gap:16,paddingTop:24,paddingBottom:32,blocks:[block(page+'-next-heading',page==='visit'?'Talk with us':'Take the next step','h2'),{id:page+'-next-link',kind:'button',text:page==='visit'?'Explore our '+template.offering.toLowerCase():'Plan your visit',link:{href:page==='visit'?'/site/services':'/site/visit-us',newTab:false},column:1,span:12,row:2,order:0,align,vertical:'start'}]}]
 }
 const pages=['home','services','visit-us'].map(slug=>{const content=sections(slug==='visit-us'?'visit':slug);return {id:slug,slug,title:slug==='home'?template.name:slug==='services'?template.offering:'Visit and contact',body:sectionText(content),sections:content}})
 return {template:template.id,name:name.trim(),description:'Add a short description of your business.',home:'home',pages}
}
