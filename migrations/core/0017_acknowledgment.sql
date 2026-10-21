ALTER TABLE pane_messages ADD COLUMN acknowledgment TEXT;
ALTER TABLE pane_messages ADD COLUMN acknowledgment_status TEXT NOT NULL DEFAULT 'not_requested';
ALTER TABLE pane_messages ADD COLUMN acknowledgment_provider TEXT;
ALTER TABLE pane_messages ADD COLUMN acknowledgment_provider_id TEXT;
