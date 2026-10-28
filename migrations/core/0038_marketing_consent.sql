-- Historic checkboxes confer no marketing permission. New receipts retain the
-- published prompt and explicit choice on the same atomic enquiry row.
ALTER TABLE pane_messages ADD COLUMN marketing_consent TEXT;
