-- Revocation keeps the immutable approval record and removes live delivery.
CREATE TABLE pane_revoked_revisions(revision TEXT PRIMARY KEY,actor TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TRIGGER pane_revoke_live AFTER INSERT ON pane_revoked_revisions BEGIN
 UPDATE pane_state SET live=NULL WHERE live=NEW.revision;
END;
CREATE TRIGGER pane_refuse_revoked BEFORE UPDATE OF live ON pane_state WHEN NEW.live IN (SELECT revision FROM pane_revoked_revisions) BEGIN
 SELECT RAISE(ABORT,'Revoked revision needs a new draft and approval.');
END;
CREATE TRIGGER pane_activity_revocation AFTER INSERT ON pane_revoked_revisions BEGIN
 INSERT INTO pane_activity(actor,action,subject,created_at) VALUES(NEW.actor,'publication.revoke','revision:'||NEW.revision,NEW.created_at);
END;
