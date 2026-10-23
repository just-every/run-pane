import type { Dashboard } from '../model'
import { escape, when } from './kit'
export function activityView(data:Dashboard):string {
 if(!data.activity)return ''
 return `<section class="card" aria-labelledby="activity-title"><h2 id="activity-title">Activity log</h2><p class="help">Changes in recorded order. Personal content and credentials are excluded.</p><p><a class="text-link" href="/api/pane/activity/export" download>Export activity</a></p><ol>${data.activity.map(row=>`<li><strong>${escape(row.action)}</strong> · ${escape(row.actor)}${row.agent?` · Agent <code>${escape(row.agent)}</code>`:''}<p><code>${escape(row.subject)}</code> · ${when(String(row.created_at),'short',data.timeZone,data.locale)}</p></li>`).join('')||'<li>No changes recorded yet.</li>'}</ol></section>`
}
