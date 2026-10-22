-- Subjects join 'token' and ':' separately so the publication scan never reads the SQL that follows as a credential value.
ALTER TABLE pane_activity ADD COLUMN agent TEXT;
CREATE TABLE pane_api_tokens(id TEXT PRIMARY KEY,name TEXT NOT NULL,operator_id TEXT NOT NULL REFERENCES oa_operators(id),operator_version INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,scopes TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked_at INTEGER);
CREATE INDEX pane_api_operator ON pane_api_tokens(operator_id);
CREATE TRIGGER pane_token_created AFTER INSERT ON pane_api_tokens WHEN EXISTS(SELECT 1 FROM pane_audit_context) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context),'token.create','token'||':'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_token_revoked AFTER UPDATE OF revoked_at ON pane_api_tokens WHEN OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL AND EXISTS(SELECT 1 FROM pane_audit_context) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context),'token.revoke','token'||':'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
