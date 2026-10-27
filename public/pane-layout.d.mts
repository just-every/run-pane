import type {Section} from '../src/pane/sections'
export function layoutCss(sections:Section[]):string
export function layoutMarkup(sections:Section[],imageUrl?:(id:string,width:number)=>string,media?:import('../src/pane/gallery').MediaImage[],options?:{resolveLink?:(href:string)=>string|undefined;embedMarkup?:(embed:import('../src/pane/embeds').Embed)=>string}):string
