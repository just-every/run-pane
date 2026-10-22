import type { Goal, GoalType } from './goals'
import type { VisitDimensions } from './visit-dimensions'

export type GoalRow = { label: string; visits: number; conversions: number }
export type GoalReport = { id: string; name: string; type: GoalType; page?: string; visits: number; conversions: number; rate: number | null; byPage: GoalRow[]; bySource: GoalRow[]; byCampaign: GoalRow[] }

/** One completion, kept only as the same coarse dimensions a visit keeps. */
export const recordGoal = (db: D1Database, goal: string, path: string, dimensions: VisitDimensions) =>
  db.prepare('INSERT INTO pane_goals(day,goal,path,source,device,country,region,campaign,referrer,medium,campaign_source,count) VALUES(?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(day,goal,path,source,device,country,region,campaign,referrer,medium,campaign_source) DO UPDATE SET count=count+1')
    .bind(new Date().toISOString().slice(0, 10), goal, path, dimensions.source, dimensions.device, dimensions.country, dimensions.region, dimensions.campaign, dimensions.referrer, dimensions.medium, dimensions.campaignSource).run()

const columns = {byPage: 'path', bySource: 'source', byCampaign: 'campaign'} as const

/** Conversions and rate by page, channel and campaign; a visit pool is the goal's page, or the whole site. */
export async function goalReports(db: D1Database, goals: readonly Goal[] = []): Promise<GoalReport[]> {
  return Promise.all(goals.map(async goal => {
    const scope = goal.page ? ' WHERE path=?' : '', bind = goal.page ? [goal.page] : []
    const rows = Object.fromEntries(await Promise.all(Object.entries(columns).map(async ([name, column]) => {
      const [visits, conversions] = await Promise.all([
        db.prepare(`SELECT ${column} AS label,SUM(count) AS count FROM pane_visits${scope} GROUP BY ${column}`).bind(...bind).all<{label: string; count: number}>(),
        db.prepare(`SELECT ${column} AS label,SUM(count) AS count FROM pane_goals WHERE goal=?${goal.page ? ' AND path=?' : ''} GROUP BY ${column}`).bind(goal.id, ...bind).all<{label: string; count: number}>(),
      ])
      const merged = new Map<string, GoalRow>()
      for (const row of visits.results) merged.set(row.label, {label: row.label, visits: row.count, conversions: 0})
      for (const row of conversions.results) merged.set(row.label, {...(merged.get(row.label) ?? {label: row.label, visits: 0}), conversions: row.count})
      return [name, [...merged.values()].sort((a, b) => b.conversions - a.conversions || b.visits - a.visits || a.label.localeCompare(b.label))]
    }))) as Record<keyof typeof columns, GoalRow[]>
    const visits = rows.byPage.reduce((sum, row) => sum + row.visits, 0), conversions = rows.byPage.reduce((sum, row) => sum + row.conversions, 0)
    return {id: goal.id, name: goal.name, type: goal.type, ...(goal.page ? {page: goal.page} : {}), visits, conversions, rate: visits ? conversions / visits : null, ...rows}
  }))
}
