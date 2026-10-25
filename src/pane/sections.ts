import {normalizeImage,type ImageContent} from './images'
import {richText} from '../../public/pane-rich.mjs'
/** Revision data for the first native section door. Media and visual controls follow. */
export type RichNode = {tag:'text';text:string} | {tag:'p'|'p-large'|'p-small'|'h1'|'h2'|'h3'|'h4'|'blockquote'|'pre'|'ul'|'ol'|'li'|'strong'|'em'|'u'|'s'|'br';children:RichNode[]}
export type PhoneBlock = {column?:number;span?:number;row?:number;order?:number;align?:TextBlock['align'];vertical?:TextBlock['vertical'];hidden?:boolean}
export type TextBlock = {
 phone?: PhoneBlock;
 id: string; kind: 'text'|'image'; image?:ImageContent; text: string; format?: 'p'|'h1'|'h2'|'h3'|'h4'|'blockquote'|'pre'|'p-large'|'p-small'|'div'; content?: RichNode[];
 column: number; span: number; row: number; order: number;
 align: 'left' | 'center' | 'right' | 'justify'; vertical: 'start' | 'center' | 'end';
}
export type Section = {
 phone?: {paddingTop?:number;paddingBottom?:number;height?:Section['height'];hidden?:boolean};
 id: string; component?: string; kind: 'text' | 'columns'; ratio: '1:1' | '1:2' | '2:1' | '1:1:1';
 gap: number; paddingTop: number; paddingBottom: number;
 height?: 'auto'|'small'|'medium'|'large'|'full'; background?: string; blocks: TextBlock[];
}
const object = (value: unknown): Record<string, unknown> => {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid section or block.')
 return value as Record<string, unknown>
}
const number = (value: unknown, min: number, max: number, fallback: number): number => {
 if (value === undefined) return fallback
 if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw Error('Section geometry is outside its allowed range.')
 return value
}
const choice = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => {
 if (value === undefined) return fallback
 if (!values.includes(value as T)) throw Error('Unsupported section layout value.')
 return value as T
}
function phone(value:unknown, block:boolean):Record<string,unknown>|undefined {
 if(value===undefined)return undefined
 const source=object(value),result:Record<string,unknown>={}
 const allowed=block?['column','span','row','order','align','vertical','hidden']:['paddingTop','paddingBottom','height','hidden']
 if(Object.keys(source).some(key=>!allowed.includes(key)))throw Error('Unsupported phone layout field.')
 for(const [key,value] of Object.entries(source)) {
  if(key==='hidden'){if(typeof value!=='boolean')throw Error('Phone visibility must be explicit.');result[key]=value}
  else if(key==='height')result[key]=choice(value,['auto','small','medium','large','full'] as const,'auto')
  else if(key==='align')result[key]=choice(value,['left','center','right','justify'] as const,'left')
  else if(key==='vertical')result[key]=choice(value,['start','center','end'] as const,'start')
  else result[key]=number(value,['column','span','row'].includes(key)?1:0,['column','span'].includes(key)?12:key==='row'||key==='order'?100:240,0)
 }
 if(block&&Number(result.column??1)+Number(result.span??12)>13)throw Error('A phone block must fit the twelve-column grid.')
 return result
}
/** Validate the tree rather than accepting author HTML or CSS. */
function normalizeRich(value:unknown, document:boolean):RichNode[] {
 let count=0
 const inline=['text','strong','em','u','s','br']
 const blocks=['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','ul','ol']
 function walk(value:unknown,allowed:string[],depth:number,lists:number):RichNode[] {
  if(!Array.isArray(value)||depth>10)throw Error('Invalid rich text structure.')
  return value.map(raw=>{
   const node=object(raw)
   if(++count>2000||typeof node.tag!=='string'||!allowed.includes(node.tag))throw Error('Unsupported rich text node.')
   if(node.tag==='text'){
    if(Object.keys(node).some(key=>!['tag','text'].includes(key))||typeof node.text!=='string')throw Error('Invalid rich text leaf.')
    return {tag:'text',text:node.text.normalize('NFC')} as RichNode
   }
   if(Object.keys(node).some(key=>!['tag','children'].includes(key)))throw Error('Unsupported rich text field.')
   const list=node.tag==='ul'||node.tag==='ol'
   if(list&&lists>=2)throw Error('Lists support one level of nesting.')
   const children=walk(node.children,list?['li']:node.tag==='li'?[...inline,'ul','ol']:inline,depth+1,lists+(list?1:0))
   if(node.tag==='br'&&children.length)throw Error('A line break has no children.')
   return {tag:node.tag,children} as RichNode
  })
 }
 return walk(value,document?[...blocks,...inline]:inline,0,0)
}
/** Explicit allowlists keep arbitrary CSS, HTML and future blocks out of drafts. */
export function normalizeSections(value: unknown): Section[] | undefined {
 if (value === undefined) return undefined
 if (!Array.isArray(value) || !value.length || value.length > 100) throw Error('Provide between 1 and 100 sections.')
 const ids = new Set<string>()
 const identity = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value) || ids.has(value)) throw Error('Sections and blocks need unique stable identities.')
  ids.add(value); return value
 }
 let characters = 0
 return value.map(raw => {
  const section = object(raw)
  if (Object.keys(section).some(key => !['phone','id','component','kind','ratio','gap','paddingTop','paddingBottom','background','height','blocks'].includes(key))) throw Error('Unsupported section field.')
  const id = identity(section.id)
  if(section.component !== undefined && (typeof section.component !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(section.component)))throw Error('Invalid component reference.')
  if (!Array.isArray(section.blocks) || !section.blocks.length || section.blocks.length > 100) throw Error('Provide between 1 and 100 blocks per section.')
  if (section.background !== undefined && (typeof section.background !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(section.background))) throw Error('Use a hex section background with 3, 4, 6 or 8 digits.')
  const blocks = section.blocks.map(raw => {
   const block = object(raw)
   if (Object.keys(block).some(key => !['phone','image','id','kind','text','column','span','row','order','align','vertical','format','content'].includes(key))) throw Error('Unsupported block field.')
   if (!['text','image'].includes(String(block.kind)) || typeof block.text !== 'string' || (block.kind==='text'&&!block.text.trim())) throw Error('Choose a text block with content or a prepared image.')
   const image=block.kind==='image'?normalizeImage(block.image):undefined
   if(block.kind==='text'&&block.image!==undefined)throw Error('Text blocks cannot contain an image.')
   if(image&&(block.content!==undefined||block.format!==undefined||block.text.normalize('NFC').trim()!==(image.decorative?'':image.alt??'')))throw Error('Image reading text must match its alternative text.')
   const content=block.content===undefined?undefined:normalizeRich(block.content,block.format==='div')
   const text = block.text.normalize('NFC').trim()
   if(content&&richText(content).trim()!==text)throw Error('Rich text and reading text must match.')
   characters += text.length
   if (characters > 20000) throw Error('Section text exceeds 20,000 characters.')
   const column = number(block.column,1,12,1), span = number(block.span,1,12,12)
   if (column + span > 13) throw Error('A block must fit the twelve-column grid.')
   return {...(block.phone===undefined?{}:{phone:phone(block.phone,true)}),id:identity(block.id),kind:block.kind as 'text'|'image',...(image?{image}:{}),...(content?{content}:{}),...(block.format===undefined?{}:{format:choice(block.format,['p','h1','h2','h3','h4','blockquote','pre','p-large','p-small','div'] as const,'p')}),text,column,span,row:number(block.row,1,100,1),order:number(block.order,0,100,0),align:choice(block.align,['left','center','right','justify'] as const,'left'),vertical:choice(block.vertical,['start','center','end'] as const,'start')}
  })
  return {id,...(section.phone===undefined?{}:{phone:phone(section.phone,false)}),...(section.height===undefined?{}:{height:choice(section.height,['auto','small','medium','large','full'] as const,'auto')}),...(section.component ? {component:String(section.component)} : {}),kind:choice(section.kind,['text','columns'] as const,'text'),ratio:choice(section.ratio,['1:1','1:2','2:1','1:1:1'] as const,'1:1'),gap:number(section.gap,0,160,24),paddingTop:number(section.paddingTop,0,240,32),paddingBottom:number(section.paddingBottom,0,240,32),...(section.background === undefined ? {} : {background:String(section.background).toLowerCase()}),blocks}
 })
}
/** Canonical reading order is the stored order, independent of visual overlap. */
export const sectionText = (sections: Section[]) => sections.flatMap(section => section.blocks.map(block => block.text).filter(Boolean)).join('\n\n')
