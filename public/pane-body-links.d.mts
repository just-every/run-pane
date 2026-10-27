export type BodyLink={href:string;newTab:boolean}
export function safeBodyHref(value:unknown):string|undefined
export function normalizeBodyLink(value:unknown):BodyLink
export function resolvedBodyHref(href:string,resolve?:(href:string)=>string|undefined):string|undefined
