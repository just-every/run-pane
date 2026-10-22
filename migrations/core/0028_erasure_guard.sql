-- A failed erasure authority/target check aborts the entire audited transaction.
ALTER TABLE pane_audit_context ADD COLUMN valid INTEGER NOT NULL DEFAULT 1 CHECK(valid=1);
