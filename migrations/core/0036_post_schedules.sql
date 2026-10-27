CREATE TABLE pane_post_schedules (
 id TEXT PRIMARY KEY,
 post_id TEXT NOT NULL,
 source_revision TEXT NOT NULL REFERENCES pane_revisions(id),
 review TEXT,
 occurrence TEXT NOT NULL,
 occurrence_at INTEGER NOT NULL,
 time_zone TEXT NOT NULL,
 end_occurrence TEXT,
 end_at INTEGER,
 expired_at INTEGER,
 expiry_revision TEXT REFERENCES pane_revisions(id),
 created_by TEXT NOT NULL REFERENCES oa_operators(id),
 approved_by TEXT REFERENCES oa_operators(id),
 created_at INTEGER NOT NULL,
 cancelled_at INTEGER,
 executed_at INTEGER,
 result_revision TEXT REFERENCES pane_revisions(id)
);
CREATE INDEX pane_due_posts ON pane_post_schedules(occurrence_at) WHERE executed_at IS NULL AND cancelled_at IS NULL;

CREATE TRIGGER pane_activity_post_schedule AFTER INSERT ON pane_post_schedules WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(action,subject,created_at,actor)
 SELECT CASE WHEN NEW.approved_by IS NULL THEN 'schedule.save' ELSE 'schedule.approve' END,'post-schedule:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),actor FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_activity_post_schedule_cancel AFTER UPDATE OF cancelled_at ON pane_post_schedules WHEN NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(action,subject,created_at,actor)
 SELECT 'schedule.cancel','post-schedule:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),actor FROM pane_audit_context WHERE id=1;
END;
