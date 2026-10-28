import { reviewRejected } from './rejected-content'
import { activity } from './audit'
import { scheduleOverview } from './schedules'
import { trafficBreakdowns } from './visit-data'
import { goalReports } from './goal-data'
import { responseWindow } from './followups'
import type { Dashboard } from './model'
import { revision } from './content'
export async function dashboardData(db:D1Database,name:string,role:string,operatorId?:string):Promise<Dashboard> {
 const [revs, live, messages, visits, approvals, imports, operators, traffic, replies] = await Promise.all([
  db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 50').all(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),
  db.prepare('SELECT * FROM pane_messages ORDER BY created_at DESC,id DESC').all(),
  db.prepare('SELECT path,SUM(count) AS count FROM pane_visits GROUP BY path ORDER BY path').all(),
  db.prepare('SELECT * FROM pane_approvals ORDER BY created_at DESC LIMIT 100').all(),
  db.prepare('SELECT id,state,created_at FROM ik_jobs ORDER BY created_at DESC LIMIT 30').all(),
  db.prepare('SELECT o.id,o.email,o.display_name,o.role,o.status,r.roles FROM oa_operators o LEFT JOIN pane_roles r ON r.operator_id=o.id ORDER BY o.created_at,o.id').all<{id:string;email:string;display_name:string;role:string;status:string;roles:string|null}>(),
  trafficBreakdowns(db),
  db.prepare('SELECT id,message_id,subject,body,status,created_at FROM pane_inquiry_replies ORDER BY created_at,id').all<import('./model').Dashboard['replies'][number]>(),
 ])
 const files=(await db.prepare('SELECT id,message_id,name,size FROM pane_files ORDER BY id').all()).results
 for(const message of messages.results)message.files=files.filter(file=>file.message_id===message.id)
 const revisions = revs.results.map(revision)
 const liveRevision = live ? revision(live) : null
 const schedules = await scheduleOverview(db,revisions[0]??null,liveRevision)
 const goals = await goalReports(db,(liveRevision??revisions[0])?.site.goals)
 const roleLabel=(person:typeof operators.results[number])=>person.roles!==null&&person.role==='member'?(JSON.parse(person.roles).join(', ')||'No content permissions'):person.role
 const current=operators.results.find(person=>person.id===operatorId)
 const pageRequests=(await db.prepare('SELECT * FROM pane_page_requests ORDER BY created_at DESC,id DESC LIMIT 100').all<import('./page-review').PageRequest>()).results
 const rejectedContent=role==='owner'?await reviewRejected(db):undefined
 const spamRetention=role==='owner'?Boolean((await db.prepare('SELECT enabled FROM pane_spam_settings WHERE id=1').first<{enabled:number}>())?.enabled):undefined
 const formRejections=role==='owner'?(await db.prepare('SELECT * FROM pane_form_rejections ORDER BY created_at DESC,id DESC LIMIT 100').all<import('./form-protection').FormRejection>()).results:[]
 const formRejectionCount=(await db.prepare('SELECT COUNT(*) AS total FROM pane_form_rejections').first<{total:number}>())?.total??0
  return {rejectedContent,spamRetention,ownershipPeople:role==='owner'?operators.results.filter(o=>o.role!=='owner'&&o.status==='active').map(o=>({id:o.id,name:o.display_name,email:o.email})):undefined,pageRequests,formRejectionCount,formRejections,locale:(liveRevision??revisions[0])?.site.locale?.locale??'en-US',timeZone:responseWindow((liveRevision??revisions[0])?.site).zone,roleLabel:current?roleLabel(current):role,replies:replies.results,activity:role==='owner'?await activity(db):undefined,name,role,traffic,goals,schedules,revisions,draft:revisions[0]??null,live:live?revision(live):null,messages:messages.results as any,visits:visits.results as any,approvals:approvals.results as any,imports:imports.results as any,people:Object.fromEntries(operators.results.map(o=>[o.id,o.display_name])),assignees:operators.results.filter(o=>o.status==='active'&&o.role!=='member').map(o=>({id:o.id,name:o.display_name,role:o.role})),replyWindow:responseWindow((liveRevision??revisions[0])?.site),team:operators.results.filter(o=>o.status==='active').map(o=>({name:o.display_name,role:roleLabel(o)}))}
}
