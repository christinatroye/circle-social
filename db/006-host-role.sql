-- A guest can be the host (Christina). Before the reveal her seat is lit beside the speaker's, so guests can read her bio.
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_role_check;
ALTER TABLE guests ADD CONSTRAINT guests_role_check CHECK (role IN ('guest', 'speaker', 'host'));
