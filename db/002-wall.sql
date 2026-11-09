-- The wall: from the reveal until the Circle, guests can post comments for everyone coming to read.
CREATE TABLE IF NOT EXISTS wall_posts (
  id bigserial PRIMARY KEY,
  circle_id uuid NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_posts_circle ON wall_posts (circle_id, created_at);
