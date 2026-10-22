-- A successful native claim/confirmation has no preexisting session. Its newly
-- admitted person is the actor; authenticated administration keeps its caller.
DROP TRIGGER pane_activity_person_add;
DROP TRIGGER pane_activity_person_change;
CREATE TRIGGER pane_activity_person_add AFTER INSERT ON oa_operators WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(COALESCE((SELECT actor FROM pane_audit_context WHERE id=1),NEW.id),CASE WHEN NEW.role='owner' THEN 'owner.claim' ELSE 'person.invite' END,'person:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER pane_activity_person_change AFTER UPDATE OF role,status,email,display_name ON oa_operators
WHEN (OLD.role IS NOT NEW.role OR OLD.status IS NOT NEW.status OR OLD.email IS NOT NEW.email OR OLD.display_name IS NOT NEW.display_name) AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(
 CASE WHEN COALESCE((SELECT actor FROM pane_audit_context WHERE id=1),NEW.id) IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE COALESCE((SELECT actor FROM pane_audit_context WHERE id=1),NEW.id) END,
 COALESCE((SELECT action FROM pane_audit_context WHERE id=1),'system'),CASE WHEN NEW.id IN (SELECT id FROM pane_anonymized_people) THEN 'erased-person' ELSE 'person:'||NEW.id END,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
