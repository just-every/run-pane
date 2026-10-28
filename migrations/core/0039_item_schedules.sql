CREATE TABLE pane_item_schedules (
 id TEXT PRIMARY KEY,
 collection_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 source_revision TEXT NOT NULL REFERENCES pane_revisions(id),
 actor TEXT REFERENCES oa_operators(id),
 starts TEXT NOT NULL,
 starts_at INTEGER NOT NULL,
 time_zone TEXT NOT NULL,
 ends TEXT,
 ends_at INTEGER,
 executed_at INTEGER,
 result_revision TEXT REFERENCES pane_revisions(id),
 expired_at INTEGER,
 expiry_revision TEXT REFERENCES pane_revisions(id),
 cancelled_at INTEGER,
 failure_at INTEGER,
 failure_action TEXT
);
CREATE INDEX pane_item_schedules_due ON pane_item_schedules(starts_at);
CREATE TRIGGER pane_activity_item_schedule AFTER INSERT ON pane_item_schedules
WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),CASE WHEN NEW.actor IS NULL THEN 'item.schedule' ELSE 'item.schedule-approve' END,'item:'||NEW.collection_id||':'||NEW.item_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_item_schedule_cancel AFTER UPDATE OF cancelled_at ON pane_item_schedules
WHEN OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),'item.schedule-cancel','item:'||NEW.collection_id||':'||NEW.item_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
