CREATE TABLE pane_page_schedules (
 id TEXT PRIMARY KEY,
 page TEXT NOT NULL,
 source TEXT NOT NULL REFERENCES pane_revisions(id),
 request TEXT NOT NULL,
 time_zone TEXT NOT NULL,
 starts TEXT NOT NULL,
 starts_at INTEGER NOT NULL,
 ends TEXT,
 ends_at INTEGER,
 expired_revision TEXT REFERENCES pane_revisions(id),
 actor TEXT REFERENCES oa_operators(id),
 executed_revision TEXT REFERENCES pane_revisions(id),
 UNIQUE(page)
);
CREATE TRIGGER pane_activity_page_schedule AFTER INSERT ON pane_page_schedules
WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),CASE WHEN NEW.actor IS NULL THEN 'page.schedule' ELSE 'page.schedule-approve' END,'page:'||NEW.page,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_page_reschedule AFTER UPDATE ON pane_page_schedules
WHEN OLD.id!=NEW.id AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),CASE WHEN NEW.actor IS NULL THEN 'page.schedule' ELSE 'page.schedule-approve' END,'page:'||NEW.page,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
