import type {Collection} from './collection-types'

/** Template initialization offers editable empty schemas without replacing owner content. */
export function collectionStarters(existing:Collection[]=[],reserved:string[]=[]):Collection[]{
 const description=(id:string,label:string)=>({id,label,type:'richText' as const,required:true,help:'Describe this item in your own words.'})
 const starters:Collection[]=[
  {id:'starter-services',title:'Services',prefix:'service-directory',fields:[description('description','Description'),{id:'price',label:'Price in USD',type:'price',help:'Enter the dollar amount without a currency symbol.'},{id:'image',label:'Service image',type:'image',help:'Choose a photo and describe it for visitors who cannot see it.'}],items:[]},
  {id:'starter-team',title:'Team',prefix:'team',fields:[{id:'role',label:'Role',type:'text',required:true,help:'Describe this person’s role.'},description('biography','Biography'),{id:'portrait',label:'Portrait',type:'image',help:'Choose a portrait and add its alternative text.'}],items:[]},
  {id:'starter-projects',title:'Projects',prefix:'projects',fields:[description('description','Description'),{id:'image',label:'Project image',type:'image',help:'Choose a project photo and add its alternative text.'},{id:'completed',label:'Completion date',type:'date',help:'Choose the calendar date when this project was completed.'}],items:[]},
 ]
 const overlaps=(a:string,b:string)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/')
 return [...existing,...starters.filter(starter=>!existing.some(collection=>collection.id===starter.id||overlaps(collection.prefix,starter.prefix))&&!reserved.some(prefix=>overlaps(prefix,starter.prefix)))]
}
