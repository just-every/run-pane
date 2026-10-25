-- Rejected answers are opt-in, private and excluded from installation archives.
CREATE TABLE pane_spam_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)));
INSERT INTO pane_spam_settings(id,enabled) VALUES(1,0);
CREATE TABLE pane_rejected_content(id TEXT PRIMARY KEY,form TEXT NOT NULL,reason TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL,expires_at INTEGER NOT NULL,held INTEGER NOT NULL DEFAULT 0 CHECK(held IN (0,1)));
CREATE INDEX pane_rejected_email ON pane_rejected_content(email);
CREATE TRIGGER pane_spam_settings_audit AFTER UPDATE ON pane_spam_settings WHEN OLD.enabled!=NEW.enabled AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'spam.retention','spam-settings',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_spam_hold_audit AFTER UPDATE OF held ON pane_rejected_content WHEN OLD.held!=NEW.held AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,CASE WHEN NEW.held=1 THEN 'spam.hold' ELSE 'spam.release' END,'rejection:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_spam_delete_audit AFTER DELETE ON pane_rejected_content WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'spam.remove','rejection:'||OLD.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
