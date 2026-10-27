import {normalizeBodyLink,type BodyLink} from '../../public/pane-body-links.mjs'
import {normalizeEmbed,type Embed} from './embeds'
import {normalizeGallery,type Gallery} from './gallery'
import {normalizeImage,type ImageContent} from './images'
import {richText} from '../../public/pane-rich.mjs'
/** Revision data for the first native section door. Media and visual controls follow. */
export type RichNode = {tag:'text';text:string} | {tag:'a';href:string;newTab:boolean;children:RichNode[]} | {tag:'p'|'p-large'|'p-small'|'h1'|'h2'|'h3'|'h4'|'blockquote'|'pre'|'ul'|'ol'|'li'|'strong'|'em'|'u'|'s'|'br';children:RichNode[];align?:'left'|'center'|'right'|'justify'}
export type PhoneBlock = {column?:number;span?:number;row?:number;order?:number;align?:TextBlock['align'];vertical?:TextBlock['vertical'];hidden?:boolean}
export type TextBlock = {
 phone?: PhoneBlock;
 id: string; kind: 'text'|'image'|'gallery'|'quote'|'video'|'button'|'line'|'spacer'|'accordion'|'chart'|'shape'|'scrolling-text'|'social-links'|'audio'|'map'|'social-post'|'search'|'form'|'summary'|'collection-list'|'html'; listing?:{collection:string;layout:'list'|'grid';limit:number;sort:string;descending:boolean;filter?:{field:string;value:string}}; audio?:{file?:string;download:boolean}; buttonStyle?:'primary'|'secondary'|'tertiary'; chart?:{type:'bar'|'line'|'pie';rows:[string,number][]}; shape?:{form:'circle'|'square'|'triangle';color:string;outlined:boolean}; summary?:string; size?:number; caption?:string; attribution?:string; link?:BodyLink; embed?:Embed; gallery?:Gallery; image?:ImageContent; text: string; format?: 'p'|'h1'|'h2'|'h3'|'h4'|'blockquote'|'pre'|'p-large'|'p-small'|'div'; content?: RichNode[];
 column: number; span: number; row: number; order: number;
 align: 'left' | 'center' | 'right' | 'justify'; vertical: 'start' | 'center' | 'end';
}
export type Section = {
 phone?: {gap?:number;paddingTop?:number;paddingBottom?:number;height?:Section['height'];hidden?:boolean};
 id: string; anchor?:string; component?: string; kind: 'text' | 'columns'; ratio: '1:1' | '1:2' | '2:1' | '1:1:1';
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
 const allowed=block?['column','span','row','order','align','vertical','hidden']:['gap','paddingTop','paddingBottom','height','hidden']
 if(Object.keys(source).some(key=>!allowed.includes(key)))throw Error('Unsupported phone layout field.')
 for(const [key,value] of Object.entries(source)) {
  if(key==='hidden'){if(typeof value!=='boolean')throw Error('Phone visibility must be explicit.');result[key]=value}
  else if(key==='height')result[key]=choice(value,['auto','small','medium','large','full'] as const,'auto')
  else if(key==='align')result[key]=choice(value,['left','center','right','justify'] as const,'left')
  else if(key==='vertical')result[key]=choice(value,['start','center','end'] as const,'start')
  else result[key]=number(value,['column','span','row'].includes(key)?1:0,['column','span'].includes(key)?12:key==='row'||key==='order'?100:key==='gap'?160:240,0)
 }
 if(block&&Number(result.column??1)+Number(result.span??12)>13)throw Error('A phone block must fit the twelve-column grid.')
 return result
}
/** Validate the tree rather than accepting author HTML or CSS. */
function normalizeRich(value:unknown, document:boolean):RichNode[] {
 let count=0
 const inline=['text','a','strong','em','u','s','br']
 const blocks=['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','ul','ol']
 function walk(value:unknown,allowed:string[],depth:number,lists:number,inLink=false):RichNode[] {
  if(!Array.isArray(value)||depth>10)throw Error('Invalid rich text structure.')
  return value.map(raw=>{
   const node=object(raw)
   if(++count>2000||typeof node.tag!=='string'||!allowed.includes(node.tag))throw Error('Unsupported rich text node.')
   if(node.tag==='text'){
    if(Object.keys(node).some(key=>!['tag','text'].includes(key))||typeof node.text!=='string')throw Error('Invalid rich text leaf.')
    return {tag:'text',text:node.text.normalize('NFC')} as RichNode
   }
   if(node.tag==='a'){if(inLink)throw Error('Links cannot contain other links.');const link=normalizeBodyLink({href:node.href,newTab:node.newTab});if(Object.keys(node).some(key=>!['tag','children','href','newTab'].includes(key)))throw Error('Unsupported link field.');return {tag:'a',...link,children:walk(node.children,inline.filter(tag=>tag!=='a'),depth+1,lists,true)} as RichNode}
   const paragraph=['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','li'].includes(node.tag)
   if(Object.keys(node).some(key=>!['tag','children',...(paragraph?['align']:[])].includes(key)))throw Error('Unsupported rich text field.')
   const align=node.align===undefined?undefined:choice(node.align,['left','center','right','justify'] as const,'left')
   const list=node.tag==='ul'||node.tag==='ol'
   if(list&&lists>=2)throw Error('Lists support one level of nesting.')
   const children=walk(node.children,list?['li']:node.tag==='li'?[...inline,'ul','ol']:inline,depth+1,lists+(list?1:0),inLink)
   if(node.tag==='br'&&children.length)throw Error('A line break has no children.')
   return {tag:node.tag,children,...(align?{align}:{})} as RichNode
  })
 }
 return walk(value,document?[...blocks,...inline]:inline,0,0)
}
/** Explicit allowlists keep arbitrary CSS, HTML and future blocks out of drafts. */
export function normalizeSections(value: unknown): Section[] | undefined {
 if (value === undefined) return undefined
 if (!Array.isArray(value) || !value.length || value.length > 100) throw Error('Provide between 1 and 100 sections.')
 const ids = new Set<string>(), anchors = new Set<string>()
 const identity = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value) || ids.has(value)) throw Error('Sections and blocks need unique stable identities.')
  ids.add(value); return value
 }
 let characters = 0
 return value.map(raw => {
  const section = object(raw)
  if (Object.keys(section).some(key => !['anchor','phone','id','component','kind','ratio','gap','paddingTop','paddingBottom','background','height','blocks'].includes(key))) throw Error('Unsupported section field.')
  const id = identity(section.id)
  const anchor=section.anchor
  if(anchor!==undefined&&(typeof anchor!=='string'||! /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(anchor)||anchor==='main'))throw Error('Use a section anchor beginning with a letter, up to 80 letters, numbers, dashes or underscores.')
  const fragment=String(anchor??'section-'+id)
  if(anchors.has(fragment))throw Error('Each section anchor must be unique on its page.')
  anchors.add(fragment)
  if(section.component !== undefined && (typeof section.component !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(section.component)))throw Error('Invalid component reference.')
  if (!Array.isArray(section.blocks) || !section.blocks.length || section.blocks.length > 100) throw Error('Provide between 1 and 100 blocks per section.')
  if (section.background !== undefined && (typeof section.background !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(section.background))) throw Error('Use a hex section background with 3, 4, 6 or 8 digits.')
  const blocks = section.blocks.map(raw => {
   const block = object(raw)
   if (Object.keys(block).some(key => !['listing','audio','buttonStyle','chart','shape','summary','size','caption','attribution','link','embed','phone','gallery','image','id','kind','text','column','span','row','order','align','vertical','format','content'].includes(key))) throw Error('Unsupported block field.')
   if (!['text','image','gallery','quote','video','button','line','spacer','accordion','chart','shape','scrolling-text','social-links','audio','map','social-post','search','form','summary','collection-list','html'].includes(String(block.kind)) || typeof block.text !== 'string' || (['text','quote','video','button','accordion','chart','shape','scrolling-text','social-links','audio','map','social-post','search','form','summary','collection-list','html'].includes(String(block.kind))&&!block.text.trim())) throw Error('Choose a text block with content or a prepared image.')
   const buttonStyle=block.kind==='button'?choice(block.buttonStyle,['primary','secondary','tertiary'] as const,'primary'):undefined
   if(block.buttonStyle!==undefined&&block.kind!=='button')throw Error('Button styles require a button block.')
   let listing:TextBlock['listing']
   if(['summary','collection-list'].includes(String(block.kind))){
    const source=object(block.listing)
    if(Object.keys(source).some(key=>!['collection','layout','limit','sort','descending','filter'].includes(key))||typeof source.collection!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(source.collection)||typeof source.sort!=='string'||!/^title$|^[a-zA-Z0-9_-]{1,80}$/.test(source.sort)||typeof source.descending!=='boolean')throw Error('Choose a collection, sorting and list layout.')
    let filter:NonNullable<TextBlock['listing']>['filter']
    if(source.filter!==undefined){const input=object(source.filter);if(Object.keys(input).some(key=>!['field','value'].includes(key))||typeof input.field!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(input.field)||typeof input.value!=='string'||input.value.length>500)throw Error('Choose a collection filter field and value.');filter={field:input.field,value:input.value}}
    listing={collection:source.collection,layout:choice(source.layout,['list','grid'] as const,'list'),limit:number(source.limit,1,100,10),sort:source.sort,descending:source.descending,...(filter?{filter}:{})}
   }else if(block.listing!==undefined)throw Error('List settings require a collection block.')
   let audio:TextBlock['audio']
   if(block.kind==='audio'){
    const source=object(block.audio)
    if(Object.keys(source).some(key=>!['file','download'].includes(key))||typeof source.download!=='boolean'||source.file!==undefined&&(typeof source.file!=='string'||!/^[a-f0-9-]{36}$/.test(source.file)))throw Error('Choose a library audio file and an explicit download option.')
    if(!source.file&&!block.embed||source.file&&block.embed)throw Error('Choose one library file or audio provider embed.')
    audio={...(source.file?{file:source.file as string}:{}),download:source.download}
   }else if(block.audio!==undefined)throw Error('Audio settings require an audio block.')
   let chart:TextBlock['chart'],shape:TextBlock['shape']
   if(block.kind==='chart'){
    const source=object(block.chart),type=choice(source.type,['bar','line','pie'] as const,'bar')
    if(Object.keys(source).some(key=>!['type','rows'].includes(key))||!Array.isArray(source.rows)||!source.rows.length||source.rows.length>24)throw Error('Enter between 1 and 24 chart rows.')
    const rows=source.rows.map(row=>{if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||!row[0].trim()||row[0].length>120||typeof row[1]!=='number'||!Number.isFinite(row[1])||Math.abs(row[1])>1e12||type==='pie'&&row[1]<0)throw Error('Each chart row needs a label and a finite value; pie values cannot be negative.');return [row[0].normalize('NFC').trim(),row[1]] as [string,number]})
    if(type==='pie'&&!rows.some(row=>row[1]>0))throw Error('A pie chart needs a positive total.')
    chart={type,rows}
   }
   if(block.kind==='shape'){const source=object(block.shape);if(Object.keys(source).some(key=>!['form','color','outlined'].includes(key))||typeof source.color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(source.color)||typeof source.outlined!=='boolean')throw Error('Choose a shape, a six-digit hex color and an explicit outline choice.');shape={form:choice(source.form,['circle','square','triangle'] as const,'circle'),color:source.color.toLowerCase(),outlined:source.outlined}}
   if(block.chart!==undefined&&block.kind!=='chart'||block.shape!==undefined&&block.kind!=='shape')throw Error('Chart and shape settings must match their block type.')
   const summary=block.kind==='accordion'&&typeof block.summary==='string'?block.summary.normalize('NFC').trim():undefined
   if(block.kind==='accordion'&&(!summary||summary.length>120))throw Error('An accordion needs a title up to 120 characters.')
   if(block.summary!==undefined&&block.kind!=='accordion'||block.size!==undefined&&block.kind!=='spacer')throw Error('Catalog settings must match their block type.')
   const size=block.kind==='spacer'?number(block.size,8,240,32):undefined
   if(['line','spacer'].includes(String(block.kind))&&block.text!=='')throw Error('Lines and spacers have no reading text.')
   const gallery=block.kind==='gallery'?normalizeGallery(block.gallery):undefined
   const image=block.kind==='image'?normalizeImage(block.image):undefined
   if(block.image!==undefined&&block.kind!=='image'||block.gallery!==undefined&&block.kind!=='gallery')throw Error('Media must match its block type.')
   const link=block.link===undefined?undefined:normalizeBodyLink(block.link)
   if(link&&!['image','button','shape'].includes(String(block.kind)))throw Error('This block does not support a destination.')
   if(block.kind==='button'&&!link)throw Error('Choose a button destination.')
   const embed=['video','audio','map','social-post'].includes(String(block.kind))?normalizeEmbed(block.embed):undefined
   if(block.embed!==undefined&&!['video','audio','map','social-post'].includes(String(block.kind))||['video','map','social-post'].includes(String(block.kind))&&!embed)throw Error('Provide a video title and YouTube embed URL.')
   if(embed&&block.kind==='audio'&&!['w.soundcloud.com','open.spotify.com'].includes(new URL(embed.url).hostname))throw Error('Choose a SoundCloud or Spotify audio embed.')
   if(embed&&block.kind==='map'&&new URL(embed.url).hostname!=='www.google.com')throw Error('Choose a Google Maps embed.');
   if(embed&&block.kind==='social-post'&&!['www.instagram.com','www.facebook.com'].includes(new URL(embed.url).hostname))throw Error('Choose an Instagram or Facebook post embed.');
   if(embed&&block.kind==='video'&&!['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(new URL(embed.url).hostname))throw Error('Choose a YouTube embed URL.')
   const fieldText=(value:unknown,label:string)=>{if(typeof value!=='string'||value.length>1000)throw Error(label+' must contain at most 1,000 characters.');return value.normalize('NFC').trim()}
   const caption=block.caption===undefined?undefined:fieldText(block.caption,'Caption'),attribution=block.attribution===undefined?undefined:fieldText(block.attribution,'Attribution')
   if(caption!==undefined&&block.kind!=='image'||attribution!==undefined&&block.kind!=='quote'&&block.format!=='blockquote')throw Error('Caption or attribution does not match this block.')
   if(block.content!==undefined&&!['text','quote'].includes(String(block.kind))||block.format!==undefined&&!['text','quote'].includes(String(block.kind)))throw Error('Rich text requires a text or quote block.')
   if(image&&(block.content!==undefined||block.format!==undefined||block.text.normalize('NFC').trim()!==(image.decorative?'':image.alt??'')))throw Error('Image reading text must match its alternative text.')
   const content=block.content===undefined?undefined:normalizeRich(block.content,block.format==='div')
   const text = block.text.normalize('NFC').trim()
   if(content&&richText(content).trim()!==text)throw Error('Rich text and reading text must match.')
   characters += text.length+(caption?.length??0)+(attribution?.length??0)
   if (characters > 20000) throw Error('Section text exceeds 20,000 characters.')
   const column = number(block.column,1,12,1), span = number(block.span,1,12,12)
   if (column + span > 13) throw Error('A block must fit the twelve-column grid.')
   return {...(block.phone===undefined?{}:{phone:phone(block.phone,true)}),id:identity(block.id),kind:block.kind as TextBlock['kind'],...(listing?{listing}:{}),...(audio?{audio}:{}),...(buttonStyle?{buttonStyle}:{}),...(chart?{chart}:{}),...(shape?{shape}:{}),...(summary?{summary}:{}),...(size!==undefined?{size}:{}),...(caption===undefined?{}:{caption}),...(attribution===undefined?{}:{attribution}),...(link?{link}:{}),...(embed?{embed}:{}),...(gallery?{gallery}:{}),...(image?{image}:{}),...(content?{content}:{}),...(block.format===undefined?{}:{format:choice(block.format,['p','h1','h2','h3','h4','blockquote','pre','p-large','p-small','div'] as const,'p')}),text,column,span,row:number(block.row,1,100,1),order:number(block.order,0,100,0),align:choice(block.align,['left','center','right','justify'] as const,'left'),vertical:choice(block.vertical,['start','center','end'] as const,'start')}
  })
  return {id,...(anchor?{anchor:String(anchor)}:{}),...(section.phone===undefined?{}:{phone:phone(section.phone,false)}),...(section.height===undefined?{}:{height:choice(section.height,['auto','small','medium','large','full'] as const,'auto')}),...(section.component ? {component:String(section.component)} : {}),kind:choice(section.kind,['text','columns'] as const,'text'),ratio:choice(section.ratio,['1:1','1:2','2:1','1:1:1'] as const,'1:1'),gap:number(section.gap,0,160,24),paddingTop:number(section.paddingTop,0,240,32),paddingBottom:number(section.paddingBottom,0,240,32),...(section.background === undefined ? {} : {background:String(section.background).toLowerCase()}),blocks}
 })
}
/** Canonical reading order is the stored order, independent of visual overlap. */
export const sectionText = (sections: Section[]) => sections.flatMap(section => section.blocks.map(block => [block.summary,block.text,block.chart?.rows.map(([label,value])=>label+' '+value).join('\n'),block.caption,block.attribution].filter(Boolean).join('\n')).filter(Boolean)).join('\n\n')
