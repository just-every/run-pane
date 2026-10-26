-- Model suggestions remain private to the initiating native owner. Archives omit
-- this transient proposal store; accepted content is an ordinary site revision.
CREATE TABLE pane_ai_proposals(
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, base TEXT NOT NULL, slug TEXT NOT NULL,
 mode TEXT NOT NULL, suggestions TEXT NOT NULL, decisions TEXT,
 accepted_revision TEXT, last_revision TEXT, undone INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TRIGGER pane_activity_ai_create AFTER INSERT ON pane_ai_proposals WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at,agent) VALUES(NEW.actor,'ai.propose','proposal:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL);
END;
CREATE TRIGGER pane_activity_ai_decide AFTER UPDATE ON pane_ai_proposals WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at,agent) VALUES(NEW.actor,CASE WHEN OLD.decisions IS NULL THEN 'ai.decide' WHEN NEW.undone=1 THEN 'ai.undo' ELSE 'ai.redo' END,'proposal:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL);
END;
