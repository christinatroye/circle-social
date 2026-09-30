CREATE TABLE IF NOT EXISTS circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  title text NOT NULL,
  speaker text NOT NULL,
  speaker_line text NOT NULL DEFAULT '',
  question text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  reveal_at timestamptz NOT NULL,
  room_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'speaker')),
  name text NOT NULL,
  first_name text NOT NULL,
  email text NOT NULL,
  introduction varchar(320) NOT NULL DEFAULT '',
  introduction_confirmed_at timestamptz,
  shared boolean NOT NULL DEFAULT true,
  been_before boolean NOT NULL DEFAULT false,
  token text NOT NULL UNIQUE,
  device_hash text,
  first_opened_at timestamptz,
  last_seen_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, email)
);

CREATE TABLE IF NOT EXISTS guest_events (
  id bigserial PRIMARY KEY,
  guest_id uuid NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  kind text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guest_events_guest_at ON guest_events (guest_id, at DESC);

CREATE TABLE IF NOT EXISTS intro_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  from_guest uuid NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  to_guest uuid NOT NULL REFERENCES guests (id) ON DELETE CASCADE,
  note varchar(600) NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'introduced', 'not now')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_started timestamptz NOT NULL
);
