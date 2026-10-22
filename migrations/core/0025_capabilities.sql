-- Pane-owned grants leave Base roles and last-owner/session protections intact.
CREATE TABLE pane_roles(operator_id TEXT PRIMARY KEY REFERENCES oa_operators(id),roles TEXT NOT NULL,changed_by TEXT NOT NULL,changed_at INTEGER NOT NULL);
CREATE TRIGGER pane_roles_insert AFTER INSERT ON pane_roles WHEN EXISTS(SELECT 1 FROM pane_audit_context) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context),'roles.change','person:'||NEW.operator_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_roles_update AFTER UPDATE ON pane_roles WHEN OLD.roles IS NOT NEW.roles AND EXISTS(SELECT 1 FROM pane_audit_context) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context),'roles.change','person:'||NEW.operator_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
