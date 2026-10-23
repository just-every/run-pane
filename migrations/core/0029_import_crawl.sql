-- Exact captured bytes, not caller-supplied provenance, carry DNS control proof.
CREATE TABLE pane_import_crawls(hash TEXT NOT NULL,actor TEXT NOT NULL,origin TEXT NOT NULL,provider TEXT NOT NULL,verified_at TEXT NOT NULL,PRIMARY KEY(hash,actor));
CREATE TRIGGER pane_activity_crawl AFTER INSERT ON pane_import_crawls WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context WHERE id=1),'import.crawl','crawl:'||NEW.hash,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
