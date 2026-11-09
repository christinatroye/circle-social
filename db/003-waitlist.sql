-- The waitlist: a guest moved off the list keeps their row, bio and link, but has no seat until given one back.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz;
