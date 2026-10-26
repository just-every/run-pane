import type {Section} from '../src/pane/sections'
export function layoutCss(sections:Section[]):string
export function layoutMarkup(sections:Section[],imageUrl?:(id:string,width:number)=>string):string
