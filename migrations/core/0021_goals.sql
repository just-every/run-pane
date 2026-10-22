-- Aggregate goal completions only: no visitor identifier, message or contact detail.
CREATE TABLE pane_goals (
  day TEXT NOT NULL,
  goal TEXT NOT NULL,
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
  PRIMARY KEY(day,goal,path,source,device,country,region,campaign,referrer,medium,campaign_source)
);
