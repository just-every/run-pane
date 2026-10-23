-- Rejection review contains no rejected answers, addresses or visitor identifiers.
CREATE TABLE pane_form_rejections (
 id TEXT PRIMARY KEY,
 form TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(reason IN ('honeypot','rate','turnstile','unavailable')),
 created_at TEXT NOT NULL
);
