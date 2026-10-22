-- Enquiry ownership, status and follow-up stay on the message row so erasing a
-- message erases its owner, reminders and escalations with it.
ALTER TABLE pane_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE pane_messages ADD COLUMN assignee TEXT;
ALTER TABLE pane_messages ADD COLUMN follow_up_at INTEGER;
ALTER TABLE pane_messages ADD COLUMN reminded_at INTEGER;
ALTER TABLE pane_messages ADD COLUMN reminder_to TEXT;
ALTER TABLE pane_messages ADD COLUMN reminder_status TEXT;
ALTER TABLE pane_messages ADD COLUMN escalated_at INTEGER;
ALTER TABLE pane_messages ADD COLUMN escalated_to TEXT;
ALTER TABLE pane_messages ADD COLUMN escalation_status TEXT;
CREATE INDEX pane_messages_follow_up ON pane_messages(status,follow_up_at);
