import type {Dashboard,Page} from '../model'
import {pageId} from '../pages'
import {escape,hidden,key} from './kit'

export function pageSchedule(data:Dashboard,page:Page):string {
 const draft=data.draft!,id=pageId(page)
 const request=data.pageRequests?.find(request=>request.page_id===id&&data.revisions.find(row=>row.id===request.revision)?.site.pages.some(candidate=>pageId(candidate)===id&&JSON.stringify(candidate)===JSON.stringify(page)))
 const current=data.schedules?.pages.find(entry=>entry.pageId===id&&entry.expiredAt===null)
 const fields=key()+hidden('base',draft.id)+hidden('page',id)+hidden('slug',page.slug)
 const zones=['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu','America/Phoenix']
 return `<details data-page-schedule><summary>Page publication schedule</summary>${current?`<p role="status">${current.approved?'Approved':'Awaiting approval'} for ${escape(current.occurrence)} (${escape(current.timeZone)}). Source <code>${escape(current.sourceRevision.slice(0,8))}</code>.</p>`:''}<form class="edit-form" method="post" action="/app/page-schedule">${fields}${hidden('review',request?.id??'')}<label>Publish page at<input type="datetime-local" name="occurrence" required step="60" value="${escape(current?.occurrence??'')}"></label><label>Unpublish page at (optional)<input type="datetime-local" name="end" step="60" value="${escape(current?.end??'')}"></label><label>Page time zone<select name="timeZone" aria-label="Page time zone">${zones.map(zone=>`<option${zone===(current?.timeZone??data.timeZone??'America/Chicago')?' selected':''}>${zone}</option>`).join('')}</select></label><p>Approval publishes only this reviewed page. Later private work stays private. Expiry removes only the scheduled version. Unapproved times are flagged when due.</p><button class="secondary">Save unapproved page time</button>${request?'<button class="secondary" name="approve" value="yes">Approve scheduled page</button>':'<p>Send this page for review before approving its schedule.</p>'}</form>${current?`<form method="post" action="/app/page-schedule">${fields}${hidden('cancel','yes')}<button class="secondary">Cancel page schedule</button></form>`:''}</details>`
}
