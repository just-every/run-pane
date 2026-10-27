import {restoreLinks} from './lifecycle'
import type {Site} from './model'

/** Approval removes only the deletion redirect belonging to this restored item. */
export function restoredRedirects(draft:Site,live:Site,kind:'page'|'post',id:string,path:string){
 const entry=draft.trash?.filter(entry=>entry.kind===kind&&entry.id===id&&entry.path===path&&entry.restoredAt).at(-1)
 const redirects=(live.redirects??[]).filter(redirect=>!(entry&&!draft.redirects?.some(current=>current.from===path)&&redirect.from===entry.path&&redirect.to===entry.deletionTarget))
 if(redirects.some(redirect=>redirect.from===path))throw Error('Review the newer redirect using this restored URL before publishing.')
 return redirects
}

/** Merge the restored page's recorded menu place without adopting other draft menus. */
export function restorePublishedMenu(draft:Site,site:Site,id:string,path:string){
 const entry=draft.trash?.filter(entry=>entry.kind==='page'&&entry.id===id&&entry.path===path&&entry.restoredAt).at(-1)
 if(entry)restoreLinks(site,entry.placement)
}
