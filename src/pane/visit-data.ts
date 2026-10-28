export type TrafficCount = { label: string; count: number }
export type NativeTrafficDimension = 'day' | 'source' | 'device' | 'location' | 'campaign' | 'referrer' | 'medium' | 'campaignSource'
export type ImportedTrafficPage = { month: string; path: string; count: number; source: string }
export type TrafficBreakdowns = Record<NativeTrafficDimension, TrafficCount[]> & {
  imported: { total: number; month: TrafficCount[]; page: ImportedTrafficPage[] }
}

export async function trafficBreakdowns(db: D1Database): Promise<TrafficBreakdowns> {
  const [day, source, device, location, campaign, referrer, medium, campaignSource, importedMonth, importedPage] = await Promise.all([
    db.prepare('SELECT day AS label,SUM(count) AS count FROM pane_visits GROUP BY day ORDER BY day').all<TrafficCount>(),
    db.prepare('SELECT source AS label,SUM(count) AS count FROM pane_visits GROUP BY source ORDER BY count DESC,source').all<TrafficCount>(),
    db.prepare('SELECT device AS label,SUM(count) AS count FROM pane_visits GROUP BY device ORDER BY count DESC,device').all<TrafficCount>(),
    db.prepare("SELECT CASE WHEN country='' THEN 'Unknown' WHEN region='' THEN country ELSE country||'-'||region END AS label,SUM(count) AS count FROM pane_visits GROUP BY country,region ORDER BY count DESC,country,region").all<TrafficCount>(),
    db.prepare('SELECT campaign AS label,SUM(count) AS count FROM pane_visits GROUP BY campaign ORDER BY count DESC,campaign').all<TrafficCount>(),
    db.prepare('SELECT referrer AS label,SUM(count) AS count FROM pane_visits GROUP BY referrer ORDER BY count DESC,referrer').all<TrafficCount>(),
    db.prepare('SELECT medium AS label,SUM(count) AS count FROM pane_visits GROUP BY medium ORDER BY count DESC,medium').all<TrafficCount>(),
    db.prepare('SELECT campaign_source AS label,SUM(count) AS count FROM pane_visits GROUP BY campaign_source ORDER BY count DESC,campaign_source').all<TrafficCount>(),
    db.prepare('SELECT month AS label,SUM(count) AS count FROM pane_import_visits GROUP BY month ORDER BY month').all<TrafficCount>(),
    db.prepare('SELECT month,path,SUM(count) AS count,source FROM pane_import_visits GROUP BY month,path,source ORDER BY month,path,source').all<ImportedTrafficPage>(),
  ])
  return { day: day.results, source: source.results, device: device.results, location: location.results, campaign: campaign.results, referrer: referrer.results, medium: medium.results, campaignSource: campaignSource.results,
    imported: { total: importedMonth.results.reduce((total, row) => total + row.count, 0), month: importedMonth.results, page: importedPage.results } }
}
