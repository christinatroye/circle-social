-- Hearts on the wall: each guest can heart a comment once; the count shows under it.
CREATE TABLE IF NOT EXISTS wall_hearts (
  post_id bigint NOT NULL REFERENCES wall_posts (id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, guest_id)
);
