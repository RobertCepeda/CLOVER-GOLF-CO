CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT uuidv7(),
  full_name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  email_normalized varchar(255) GENERATED ALWAYS AS (lower(email)) STORED,
  password_salt char(32) NOT NULL,
  password_hash char(64) NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  totp_secret varchar(120) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_format_chk CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT users_password_salt_hex_chk CHECK (password_salt ~ '^[0-9a-f]{32}$'),
  CONSTRAINT users_password_hash_hex_chk CHECK (password_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT users_totp_required_chk CHECK (two_factor_enabled = false OR length(totp_secret) >= 16),
  CONSTRAINT users_email_unique UNIQUE (email_normalized)
);

CREATE TABLE IF NOT EXISTS product_categories (
  category_id uuid PRIMARY KEY DEFAULT uuidv7(),
  slug varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_categories_slug_unique UNIQUE (slug),
  CONSTRAINT product_categories_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS products (
  product_id uuid PRIMARY KEY DEFAULT uuidv7(),
  category_id uuid NOT NULL,
  slug varchar(100) NOT NULL,
  name varchar(120) NOT NULL,
  description varchar(500) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_category_fk
    FOREIGN KEY (category_id)
    REFERENCES product_categories(category_id)
    ON DELETE RESTRICT,
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS product_images (
  product_image_id uuid PRIMARY KEY DEFAULT uuidv7(),
  product_id uuid NOT NULL,
  image_kind varchar(32) NOT NULL,
  image_url varchar(255) NOT NULL,
  alt_text varchar(255) NOT NULL,
  display_order smallint NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_images_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(product_id)
    ON DELETE CASCADE,
  CONSTRAINT product_images_kind_chk CHECK (image_kind IN ('thumbnail', 'view_360', 'lookbook'))
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_tag_id uuid PRIMARY KEY DEFAULT uuidv7(),
  slug varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  CONSTRAINT product_tags_slug_unique UNIQUE (slug),
  CONSTRAINT product_tags_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS product_tag_assignments (
  product_id uuid NOT NULL,
  product_tag_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_tag_assignments_pk PRIMARY KEY (product_id, product_tag_id),
  CONSTRAINT product_tag_assignments_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(product_id)
    ON DELETE CASCADE,
  CONSTRAINT product_tag_assignments_tag_fk
    FOREIGN KEY (product_tag_id)
    REFERENCES product_tags(product_tag_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carts (
  cart_id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid,
  status varchar(32) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT carts_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL,
  CONSTRAINT carts_status_chk CHECK (status IN ('active', 'submitted', 'abandoned', 'archived'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id uuid PRIMARY KEY DEFAULT uuidv7(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_cart_fk
    FOREIGN KEY (cart_id)
    REFERENCES carts(cart_id)
    ON DELETE CASCADE,
  CONSTRAINT cart_items_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(product_id)
    ON DELETE RESTRICT,
  CONSTRAINT cart_items_quantity_chk CHECK (quantity > 0),
  CONSTRAINT cart_items_unique UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  favorite_id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT favorites_product_fk
    FOREIGN KEY (product_id)
    REFERENCES products(product_id)
    ON DELETE RESTRICT,
  CONSTRAINT favorites_user_product_unique UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS inquiries (
  inquiry_id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid,
  selected_product_id uuid,
  name varchar(120) NOT NULL,
  contact varchar(255) NOT NULL,
  interest varchar(80) NOT NULL,
  cap_style varchar(120),
  message varchar(1000) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'Nuevo',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL,
  CONSTRAINT inquiries_selected_product_fk
    FOREIGN KEY (selected_product_id)
    REFERENCES products(product_id)
    ON DELETE SET NULL,
  CONSTRAINT inquiries_contact_chk CHECK (length(contact) >= 5),
  CONSTRAINT inquiries_status_chk CHECK (status IN ('Nuevo', 'En revision', 'Respondido', 'Archivado'))
);

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product_idx
  ON product_images(product_id)
  WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS product_tag_assignments_tag_id_idx
  ON product_tag_assignments(product_tag_id);
CREATE INDEX IF NOT EXISTS carts_user_id_idx ON carts(user_id);
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS favorites_product_id_idx ON favorites(product_id);
CREATE INDEX IF NOT EXISTS inquiries_user_id_idx ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS inquiries_selected_product_id_idx ON inquiries(selected_product_id);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries(created_at DESC);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
