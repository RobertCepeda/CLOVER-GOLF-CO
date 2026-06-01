CREATE TABLE IF NOT EXISTS account (
  id integer PRIMARY KEY DEFAULT 1,
  email text NOT NULL,
  password text NOT NULL,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  totp_secret text NOT NULL DEFAULT '',
  updated_at timestamptz,
  CONSTRAINT account_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  salt text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  contact text NOT NULL,
  interest text,
  cap_style text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Nuevo'
);

INSERT INTO account (id, email, password, two_factor_enabled, totp_secret)
VALUES (1, 'prueba07@gmail.com', '12345678', false, '')
ON CONFLICT (id) DO NOTHING;
