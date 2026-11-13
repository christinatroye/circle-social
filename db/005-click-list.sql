-- The click list on /host: requests can go to the waitlist, the waitlist email can be marked drafted, and a bio can be marked ready.
ALTER TABLE seat_requests ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz;
ALTER TABLE seat_requests ADD COLUMN IF NOT EXISTS waitlist_email_at timestamptz;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS bio_ready_at timestamptz;
