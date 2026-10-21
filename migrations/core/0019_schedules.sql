CREATE TABLE pane_schedule_ticks (
 id TEXT PRIMARY KEY,
 scheduled_at INTEGER NOT NULL,
 revision TEXT REFERENCES pane_revisions(id)
);
CREATE TABLE pane_schedule_clock (
 id INTEGER PRIMARY KEY CHECK(id=1),
 scheduled_at INTEGER NOT NULL
);
CREATE TABLE pane_schedule_events (
 id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES pane_schedule_ticks(id),
 revision TEXT NOT NULL REFERENCES pane_revisions(id),
 rule TEXT NOT NULL,
 kind TEXT NOT NULL,
 occurrence TEXT NOT NULL,
 occurrence_at INTEGER,
 time_zone TEXT NOT NULL,
 executed_at INTEGER NOT NULL,
 data TEXT NOT NULL
);
CREATE INDEX pane_schedule_history ON pane_schedule_events(executed_at DESC);
CREATE TABLE pane_schedule_banners (
 revision TEXT NOT NULL REFERENCES pane_revisions(id),
 rule TEXT NOT NULL,
 text TEXT NOT NULL,
 PRIMARY KEY(revision,rule)
);
CREATE TABLE pane_page_reviews (
 id TEXT PRIMARY KEY,
 page_id TEXT NOT NULL,
 actor TEXT NOT NULL,
 reviewed_at INTEGER NOT NULL
);
CREATE INDEX pane_reviews_page ON pane_page_reviews(page_id,reviewed_at DESC);
