# Clover Golf PostgreSQL

Database name: `clover golf`

## Design

The schema is normalized to 3NF and uses:

- `uuid` primary keys with PostgreSQL 18 `uuidv7()` defaults.
- `timestamptz` for dates.
- `boolean` for flags.
- `varchar(n)` where length limits are meaningful.
- Explicit `primary key`, `foreign key`, `unique`, `not null`, and `check` constraints.
- Snake case table and column names.

## Tables

- `users`: admin and customer accounts.
- `product_categories`: catalog groups such as `gorras` and `mujer`.
- `products`: product master data.
- `product_images`: thumbnail, 360 and lookbook image references.
- `product_tags`: reusable product labels.
- `product_tag_assignments`: product to tag join table.
- `carts`: active and submitted customer carts.
- `cart_items`: selected products and quantities.
- `favorites`: user saved products.
- `inquiries`: contact/order inquiry messages.

## Local setup

Set credentials in the current PowerShell session:

```powershell
$env:PGPASSWORD="YOUR_POSTGRES_PASSWORD"
$env:DATABASE_ADMIN_URL="postgres://postgres:$env:PGPASSWORD@localhost:5432/postgres"
$env:DATABASE_URL="postgres://postgres:$env:PGPASSWORD@localhost:5432/clover%20golf"
$env:CLOVER_ADMIN_EMAIL="YOUR_ADMIN_EMAIL"
$env:CLOVER_ADMIN_PASSWORD="YOUR_ADMIN_PASSWORD"
corepack pnpm run db:init
```

Optional least-privilege app role:

```powershell
$env:CLOVER_APP_DB_PASSWORD="YOUR_APP_ROLE_PASSWORD"
corepack pnpm run db:init
```

Then use this app connection string:

```powershell
$env:DATABASE_URL="postgres://clover_app:$env:CLOVER_APP_DB_PASSWORD@localhost:5432/clover%20golf"
```

RLS is enabled on user-owned tables. The optional `clover_app` role gets explicit
policies for the server-side app, while PostgreSQL stays local-only.

## Operations

Use `pg_stat_statements` to find expensive queries before adding indexes. Keep
PostgreSQL local-only; do not expose port `5432` to the internet.
