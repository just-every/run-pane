CREATE TABLE pane_inquiry_replies(id TEXT PRIMARY KEY,message_id TEXT NOT NULL REFERENCES pane_messages(id) ON DELETE CASCADE,actor TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('sending','accepted','suppressed','failed','uncertain')),created_at TEXT NOT NULL);
CREATE INDEX pane_replies_message ON pane_inquiry_replies(message_id,created_at,id);
CREATE TRIGGER pane_reply_insert AFTER INSERT ON pane_inquiry_replies WHEN EXISTS(SELECT 1 FROM pane_audit_context) BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES((SELECT actor FROM pane_audit_context),'enquiry.reply','enquiry:'||NEW.message_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
