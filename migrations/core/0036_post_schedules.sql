CREATE TABLE pane_post_schedules (
 id TEXT PRIMARY KEY,
 post TEXT NOT NULL,
 source TEXT NOT NULL REFERENCES pane_revisions(id),
 review TEXT NOT NULL,
 time_zone TEXT NOT NULL,
 starts TEXT NOT NULL,
 starts_at INTEGER NOT NULL,
 ends TEXT,
 ends_at INTEGER,
 expired_revision TEXT REFERENCES pane_revisions(id),
 actor TEXT REFERENCES oa_operators(id),
 executed_revision TEXT REFERENCES pane_revisions(id),
 UNIQUE(post)
);
CREATE TRIGGER pane_activity_post_schedule AFTER INSERT ON pane_post_schedules
WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),CASE WHEN NEW.actor IS NULL THEN 'post.schedule' ELSE 'post.schedule-approve' END,'post:'||NEW.post,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_post_reschedule AFTER UPDATE ON pane_post_schedules
WHEN OLD.id!=NEW.id AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),CASE WHEN NEW.actor IS NULL THEN 'post.schedule' ELSE 'post.schedule-approve' END,'post:'||NEW.post,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
