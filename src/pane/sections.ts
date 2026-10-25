/** Revision data for the first native section door. Media and visual controls follow. */
export type TextBlock = {
 id: string; kind: 'text'; text: string; format?: 'p'|'h1'|'h2'|'h3'|'h4'|'blockquote'|'pre';
 column: number; span: number; row: number; order: number;
 align: 'left' | 'center' | 'right'; vertical: 'start' | 'center' | 'end';
}
export type Section = {
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
  if (Object.keys(section).some(key => !['id','component','kind','ratio','gap','paddingTop','paddingBottom','background','height','blocks'].includes(key))) throw Error('Unsupported section field.')
  const id = identity(section.id)
  if(section.component !== undefined && (typeof section.component !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(section.component)))throw Error('Invalid component reference.')
  if (!Array.isArray(section.blocks) || !section.blocks.length || section.blocks.length > 100) throw Error('Provide between 1 and 100 blocks per section.')
  if (section.background !== undefined && (typeof section.background !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(section.background))) throw Error('Use a hex section background with 3, 4, 6 or 8 digits.')
  const blocks = section.blocks.map(raw => {
   const block = object(raw)
   if (Object.keys(block).some(key => !['id','kind','text','column','span','row','order','align','vertical','format'].includes(key))) throw Error('Unsupported block field.')
   if (block.kind !== 'text' || typeof block.text !== 'string' || !block.text.trim()) throw Error('Only nonempty text blocks are supported by this section door.')
   const text = block.text.normalize('NFC').trim()
   characters += text.length
   if (characters > 20000) throw Error('Section text exceeds 20,000 characters.')
   const column = number(block.column,1,12,1), span = number(block.span,1,12,12)
   if (column + span > 13) throw Error('A block must fit the twelve-column grid.')
   return {id:identity(block.id),kind:'text' as const,...(block.format===undefined?{}:{format:choice(block.format,['p','h1','h2','h3','h4','blockquote','pre'] as const,'p')}),text,column,span,row:number(block.row,1,100,1),order:number(block.order,0,100,0),align:choice(block.align,['left','center','right'] as const,'left'),vertical:choice(block.vertical,['start','center','end'] as const,'start')}
  })
  return {id,...(section.height===undefined?{}:{height:choice(section.height,['auto','small','medium','large','full'] as const,'auto')}),...(section.component ? {component:String(section.component)} : {}),kind:choice(section.kind,['text','columns'] as const,'text'),ratio:choice(section.ratio,['1:1','1:2','2:1','1:1:1'] as const,'1:1'),gap:number(section.gap,0,160,24),paddingTop:number(section.paddingTop,0,240,32),paddingBottom:number(section.paddingBottom,0,240,32),...(section.background === undefined ? {} : {background:String(section.background).toLowerCase()}),blocks}
 })
}
/** Canonical reading order is the stored order, independent of visual overlap. */
export const sectionText = (sections: Section[]) => sections.flatMap(section => section.blocks.map(block => block.text)).join('\n\n')
