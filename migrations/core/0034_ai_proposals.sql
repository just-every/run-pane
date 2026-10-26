-- Pending bodies are private application content, never activity metadata.
CREATE TABLE pane_ai_proposals(
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, base TEXT NOT NULL, slug TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'requesting', mode TEXT NOT NULL, model TEXT NOT NULL,
 images TEXT NOT NULL, suggestions TEXT NOT NULL, decisions TEXT,
 accepted_revision TEXT, last_revision TEXT, undone INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TABLE pane_ai_history(actor TEXT PRIMARY KEY,head_revision TEXT NOT NULL,entries TEXT NOT NULL,position INTEGER NOT NULL);
ALTER TABLE pane_activity ADD COLUMN details TEXT;
CREATE TRIGGER pane_activity_ai_create AFTER INSERT ON pane_ai_proposals WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at,agent,details) VALUES(NEW.actor,'ai.request','proposal:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('operation',NEW.mode,'page',NEW.slug,'images',json(NEW.images),'sourceRevision',NEW.base,'request',NEW.id,'proposal',NEW.id,'provider','OpenAI','model',NEW.model,'outcome',NEW.status));
END;
CREATE TRIGGER pane_activity_ai_ready AFTER UPDATE OF status ON pane_ai_proposals WHEN OLD.status IS NOT NEW.status AND EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at,agent,details) VALUES(NEW.actor,CASE WHEN NEW.status='ready' THEN 'ai.propose' ELSE 'ai.failed' END,'proposal:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('operation',NEW.mode,'page',NEW.slug,'images',json(NEW.images),'sourceRevision',NEW.base,'request',NEW.id,'proposal',NEW.id,'provider','OpenAI','model',NEW.model,'outcome',NEW.status));
END;
CREATE TRIGGER pane_activity_ai_decide AFTER UPDATE OF decisions,undone ON pane_ai_proposals WHEN EXISTS(SELECT 1 FROM pane_audit_context WHERE id=1) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at,agent,details) VALUES(NEW.actor,CASE WHEN OLD.decisions IS NULL THEN 'ai.decide' WHEN NEW.undone=1 THEN 'ai.undo' ELSE 'ai.redo' END,'proposal:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('operation',NEW.mode,'page',NEW.slug,'images',json(NEW.images),'sourceRevision',NEW.base,'resultRevision',NEW.last_revision,'request',NEW.id,'proposal',NEW.id,'provider','OpenAI','model',NEW.model,'decisions',json(NEW.decisions),'outcome',CASE WHEN OLD.decisions IS NULL THEN 'decided' WHEN NEW.undone=1 THEN 'undone' ELSE 'restored' END));
END;
