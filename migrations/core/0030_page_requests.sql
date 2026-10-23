CREATE TABLE pane_page_requests (
 id TEXT PRIMARY KEY,
 page_id TEXT NOT NULL,
 revision TEXT NOT NULL REFERENCES pane_revisions(id),
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TRIGGER pane_activity_page_request AFTER INSERT ON pane_page_requests WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),'page.request-review','page:'||NEW.page_id,NEW.created_at);
END;
