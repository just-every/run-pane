ALTER TABLE pane_comments ADD COLUMN import_pending INTEGER NOT NULL DEFAULT 0 CHECK(import_pending IN (0,1));
CREATE TRIGGER pane_comments_no_erased_replay BEFORE INSERT ON pane_comments
WHEN EXISTS(SELECT 1 FROM pane_erased_comments WHERE id=NEW.id)
BEGIN SELECT RAISE(ABORT,'Erased comments cannot be imported again'); END;

DROP TRIGGER pane_comments_insert_audit;
CREATE TRIGGER pane_comments_insert_audit AFTER INSERT ON pane_comments BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT COALESCE(actor,NEW.actor),CASE WHEN NEW.import_pending=1 THEN 'comment.import' ELSE 'comment.submit' END,'comment:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
DROP TRIGGER pane_comments_update_audit;
CREATE TRIGGER pane_comments_update_audit AFTER UPDATE ON pane_comments BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,CASE WHEN OLD.import_pending!=NEW.import_pending THEN 'comment.import-release' WHEN OLD.state!=NEW.state THEN 'comment.'||NEW.state WHEN OLD.body!=NEW.body THEN 'comment.edit' ELSE 'comment.thread' END,'comment:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
