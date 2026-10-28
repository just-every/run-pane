-- Historical intake is inert and shares native inbox custody.
ALTER TABLE pane_messages ADD COLUMN imported_from TEXT;
ALTER TABLE pane_messages ADD COLUMN import_revision TEXT;
CREATE TABLE pane_import_visits (
 id TEXT PRIMARY KEY,
 month TEXT NOT NULL,
 path TEXT NOT NULL,
 count INTEGER NOT NULL CHECK(count>=0),
 source TEXT NOT NULL,
 kit_revision TEXT NOT NULL,
 UNIQUE(source,month,path)
);
CREATE TABLE pane_erased_import_people (digest TEXT PRIMARY KEY);
