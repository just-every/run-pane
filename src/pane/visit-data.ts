export type TrafficCount = { label: string; count: number }
export type TrafficBreakdowns = Record<'day' | 'source' | 'device' | 'location' | 'campaign', TrafficCount[]>

export async function trafficBreakdowns(db: D1Database): Promise<TrafficBreakdowns> {
  const [day, source, device, location, campaign] = await Promise.all([
    db.prepare('SELECT day AS label,SUM(count) AS count FROM pane_visits GROUP BY day ORDER BY day').all<TrafficCount>(),
    db.prepare('SELECT source AS label,SUM(count) AS count FROM pane_visits GROUP BY source ORDER BY count DESC,source').all<TrafficCount>(),
    db.prepare('SELECT device AS label,SUM(count) AS count FROM pane_visits GROUP BY device ORDER BY count DESC,device').all<TrafficCount>(),
    db.prepare("SELECT CASE WHEN country='' THEN 'Unknown' WHEN region='' THEN country ELSE country||'-'||region END AS label,SUM(count) AS count FROM pane_visits GROUP BY country,region ORDER BY count DESC,country,region").all<TrafficCount>(),
    db.prepare('SELECT campaign AS label,SUM(count) AS count FROM pane_visits GROUP BY campaign ORDER BY count DESC,campaign').all<TrafficCount>(),
  ])
  return { day: day.results, source: source.results, device: device.results, location: location.results, campaign: campaign.results }
}
