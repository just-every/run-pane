-- Append-only activity metadata. No request bodies, addresses, cookies or credentials.
CREATE TABLE pane_activity(sequence INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT NOT NULL,subject TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE pane_audit_context(id INTEGER PRIMARY KEY CHECK(id=1),actor TEXT,action TEXT NOT NULL);
CREATE TABLE pane_anonymized_people(id TEXT PRIMARY KEY);
CREATE TRIGGER pane_activity_revision AFTER INSERT ON pane_revisions  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,CASE WHEN (SELECT action FROM pane_audit_context WHERE id=1)='settings.search' THEN 'settings.search' ELSE 'edit' END,'revision:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_approval AFTER INSERT ON pane_approvals  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,NEW.action,'revision:'||NEW.revision,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_person_add AFTER INSERT ON oa_operators  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'person.invite','person:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_person_change AFTER UPDATE OF role,status,email,display_name ON oa_operators WHEN (OLD.role IS NOT NEW.role OR OLD.status IS NOT NEW.status OR OLD.email IS NOT NEW.email OR OLD.display_name IS NOT NEW.display_name) AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,COALESCE((SELECT action FROM pane_audit_context WHERE id=1),'system'),CASE WHEN NEW.id IN (SELECT id FROM pane_anonymized_people) THEN 'erased-person' ELSE 'person:'||NEW.id END,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_settings AFTER INSERT ON oa_auth_audit  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'settings.change','authentication',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_connection_insert AFTER INSERT ON rer_dependency_link  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'connection.change','connection',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_connection_update AFTER UPDATE ON rer_dependency_link  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'connection.change','connection',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_connection_delete AFTER DELETE ON rer_dependency_link  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'connection.change','connection',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_domain_insert AFTER INSERT ON oa_domain_rules  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'connection.change','authentication-domain',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_domain_delete AFTER DELETE ON oa_domain_rules  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'connection.change','authentication-domain',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_inquiry_change AFTER UPDATE ON pane_messages WHEN (OLD.status IS NOT NEW.status OR OLD.assignee IS NOT NEW.assignee OR OLD.follow_up_at IS NOT NEW.follow_up_at) AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,COALESCE((SELECT action FROM pane_audit_context WHERE id=1),'system'),'enquiry:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_inquiry_erase AFTER DELETE ON pane_messages  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'erasure','enquiry:'||OLD.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_import_add AFTER INSERT ON ik_jobs  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'import','import:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_import_change AFTER UPDATE OF state ON ik_jobs WHEN OLD.state IS NOT NEW.state AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'import.'||NEW.state,'import:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_review AFTER INSERT ON pane_page_reviews  WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(CASE WHEN (SELECT actor FROM pane_audit_context WHERE id=1) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE (SELECT actor FROM pane_audit_context WHERE id=1) END,'review','page:'||NEW.page_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;

-- Preserve known historical decisions; do not infer absent historical actions.
INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,action,'revision:'||revision,created_at FROM pane_approvals ORDER BY created_at,id;
