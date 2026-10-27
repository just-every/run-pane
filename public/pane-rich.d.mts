import type {RichNode} from '../src/pane/sections'
export function richText(nodes:RichNode[]):string
export function richMarkup(nodes:RichNode[],resolve?:(href:string)=>string|undefined):string
