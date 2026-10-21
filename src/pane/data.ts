import { scheduleOverview } from './schedules'
import { trafficBreakdowns } from './visit-data'
import type { Dashboard } from './model'
import { revision } from './content'
export async function dashboardData(db:D1Database,name:string,role:string):Promise<Dashboard> {
 const [revs, live, messages, visits, approvals, imports, operators, traffic] = await Promise.all([
  db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 50').all(),
  db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),
  db.prepare('SELECT * FROM pane_messages ORDER BY created_at DESC LIMIT 100').all(),
  db.prepare('SELECT path,SUM(count) AS count FROM pane_visits GROUP BY path ORDER BY path').all(),
  db.prepare('SELECT * FROM pane_approvals ORDER BY created_at DESC LIMIT 100').all(),
  db.prepare('SELECT id,state,created_at FROM ik_jobs ORDER BY created_at DESC LIMIT 30').all(),
  db.prepare('SELECT id,display_name,role,status FROM oa_operators ORDER BY created_at,id').all<{id:string;display_name:string;role:string;status:string}>(),
  trafficBreakdowns(db),
 ])
 const revisions = revs.results.map(revision)
 const liveRevision = live ? revision(live) : null
 const schedules = await scheduleOverview(db,revisions[0]??null,liveRevision)
 return {name,role,traffic,schedules,revisions,draft:revisions[0]??null,live:live?revision(live):null,messages:messages.results as any,visits:visits.results as any,approvals:approvals.results as any,imports:imports.results as any,people:Object.fromEntries(operators.results.map(o=>[o.id,o.display_name])),team:operators.results.filter(o=>o.status==='active').map(o=>({name:o.display_name,role:o.role}))}
}
