CREATE TABLE pane_page_schedules (
 id TEXT PRIMARY KEY,
 page_id TEXT NOT NULL,
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
CREATE INDEX pane_due_pages ON pane_page_schedules(occurrence_at) WHERE executed_at IS NULL AND cancelled_at IS NULL;

CREATE TRIGGER pane_activity_page_schedule AFTER INSERT ON pane_page_schedules WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(action,subject,created_at,actor)
 SELECT CASE WHEN NEW.approved_by IS NULL THEN 'schedule.save' ELSE 'schedule.approve' END,'page-schedule:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),actor FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_activity_page_schedule_cancel AFTER UPDATE OF cancelled_at ON pane_page_schedules WHEN NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(action,subject,created_at,actor)
 SELECT 'schedule.cancel','page-schedule:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),actor FROM pane_audit_context WHERE id=1;
END;
