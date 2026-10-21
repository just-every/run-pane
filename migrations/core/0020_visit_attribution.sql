-- Earlier aggregate counts cannot recover discarded referrers or UTM tags.
CREATE TABLE pane_visits_attribution (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Unknown',
  device TEXT NOT NULL DEFAULT 'unknown',
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  medium TEXT NOT NULL DEFAULT '',
  campaign_source TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,path,source,device,country,region,campaign,referrer,medium,campaign_source)
);
INSERT INTO pane_visits_attribution(day,path,source,device,country,region,campaign,count)
SELECT day,path,CASE source
  WHEN 'Google' THEN 'Search' WHEN 'Bing' THEN 'Search' WHEN 'DuckDuckGo' THEN 'Search'
  WHEN 'Facebook' THEN 'Social' WHEN 'Instagram' THEN 'Social' WHEN 'LinkedIn' THEN 'Social'
  ELSE source END,device,country,region,campaign,SUM(count)
FROM pane_visits GROUP BY day,path,CASE source
  WHEN 'Google' THEN 'Search' WHEN 'Bing' THEN 'Search' WHEN 'DuckDuckGo' THEN 'Search'
  WHEN 'Facebook' THEN 'Social' WHEN 'Instagram' THEN 'Social' WHEN 'LinkedIn' THEN 'Social'
  ELSE source END,device,country,region,campaign;
DROP TABLE pane_visits;
ALTER TABLE pane_visits_attribution RENAME TO pane_visits;
