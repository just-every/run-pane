-- Structured answers share the inbox receipt, archive custody and erasure fences.
-- Older flattened records cannot be assigned a reliable form identity retroactively.
ALTER TABLE pane_messages ADD COLUMN form_id TEXT;
ALTER TABLE pane_messages ADD COLUMN submission TEXT;
CREATE INDEX pane_messages_form_date ON pane_messages(form_id,created_at,id);
-- Opted-in rejected text keeps the same structured values for an explicit later rescue.
ALTER TABLE pane_rejected_content ADD COLUMN submission TEXT;
