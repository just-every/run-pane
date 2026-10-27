CREATE TABLE pane_comment_settings(blog TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,approval INTEGER NOT NULL DEFAULT 1,close_days INTEGER NOT NULL DEFAULT 0,blocked_words TEXT NOT NULL DEFAULT '',likes INTEGER NOT NULL DEFAULT 0,notification_mode TEXT NOT NULL DEFAULT 'immediate');
CREATE TABLE pane_comment_posts(post TEXT PRIMARY KEY,closed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE pane_comments(id TEXT PRIMARY KEY,post TEXT NOT NULL,parent TEXT REFERENCES pane_comments(id) ON DELETE SET NULL,name TEXT NOT NULL,email TEXT NOT NULL,website TEXT NOT NULL DEFAULT '',body TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('pending','approved','spam')),actor TEXT,created_at TEXT NOT NULL);
CREATE INDEX pane_comments_post ON pane_comments(post,state,created_at);
CREATE INDEX pane_comments_email ON pane_comments(email);
CREATE TABLE pane_comment_notifications(comment TEXT NOT NULL REFERENCES pane_comments(id) ON DELETE CASCADE,recipient TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(comment,recipient));
CREATE TABLE pane_erased_comments(id TEXT PRIMARY KEY);
CREATE TRIGGER pane_comments_insert_audit AFTER INSERT ON pane_comments BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT NEW.actor,'comment.submit','comment:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_comments_update_audit AFTER UPDATE ON pane_comments BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,CASE WHEN OLD.state!=NEW.state THEN 'comment.'||NEW.state WHEN OLD.body!=NEW.body THEN 'comment.edit' ELSE 'comment.thread' END,'comment:'||NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_comments_delete_audit AFTER DELETE ON pane_comments BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'comment.erase','comment:'||OLD.id,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TABLE pane_post_likes(post TEXT PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0);
CREATE TRIGGER pane_comment_settings_insert_audit AFTER INSERT ON pane_comment_settings BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'comments.settings','blog:'||NEW.blog,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_comment_settings_update_audit AFTER UPDATE ON pane_comment_settings BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'comments.settings','blog:'||NEW.blog,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_comment_posts_insert_audit AFTER INSERT ON pane_comment_posts BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'comments.availability','post:'||NEW.post,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
CREATE TRIGGER pane_comment_posts_update_audit AFTER UPDATE ON pane_comment_posts BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,'comments.availability','post:'||NEW.post,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM pane_audit_context WHERE id=1;
END;
