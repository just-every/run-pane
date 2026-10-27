import type {Section} from '../src/pane/sections'
export function layoutCss(sections:Section[]):string
export function layoutMarkup(sections:Section[],imageUrl?:(id:string,width:number)=>string,media?:import('../src/pane/gallery').MediaImage[],options?:{htmlMarkup?:(block:import('../src/pane/sections').TextBlock)=>string;formMarkup?:(id:string,instance:string)=>string;live?:boolean;audioFile?:(id:string)=>{url:string;name:string}|undefined;socialMarkup?:()=>string;resolveLink?:(href:string)=>string|undefined;embedMarkup?:(embed:import('../src/pane/embeds').Embed)=>string}):string
