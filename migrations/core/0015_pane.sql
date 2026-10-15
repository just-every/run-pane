CREATE TABLE pane_revisions (id TEXT PRIMARY KEY, site TEXT NOT NULL, hash TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE pane_state (id INTEGER PRIMARY KEY CHECK(id=1), live TEXT REFERENCES pane_revisions(id));
CREATE TABLE pane_approvals (id TEXT PRIMARY KEY, action TEXT NOT NULL, revision TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE pane_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE pane_erased_messages (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE pane_visits (day TEXT NOT NULL, path TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,path));
CREATE TABLE pane_rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL);
