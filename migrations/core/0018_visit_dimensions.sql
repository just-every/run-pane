-- Existing totals predate dimension collection and remain unclassified.
CREATE TABLE pane_visits_dimensions (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'Unknown',
  device TEXT NOT NULL DEFAULT 'unknown',
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,path,source,device,country,region,campaign)
);

INSERT INTO pane_visits_dimensions(day,path,count)
SELECT day,path,count FROM pane_visits;

DROP TABLE pane_visits;
ALTER TABLE pane_visits_dimensions RENAME TO pane_visits;
