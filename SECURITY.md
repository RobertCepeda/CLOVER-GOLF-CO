# Clover Golf Co. Security

This project uses `pnpm` instead of `npm`.

Do not run dependency installs inside Google Drive shortcut paths if pnpm reports
symlink errors. Use a local folder such as `C:\Users\ceped\Projects\clover-pag-web`.

```powershell
corepack enable
corepack prepare pnpm@11.4.0 --activate
pnpm run dev
```

PostgreSQL:

```powershell
$env:PGPASSWORD="YOUR_POSTGRES_PASSWORD"
$env:DATABASE_ADMIN_URL="postgres://postgres:$env:PGPASSWORD@localhost:5432/postgres"
$env:DATABASE_URL="postgres://postgres:$env:PGPASSWORD@localhost:5432/clover%20golf"
$env:CLOVER_ADMIN_EMAIL="YOUR_ADMIN_EMAIL"
$env:CLOVER_ADMIN_PASSWORD="YOUR_ADMIN_PASSWORD"
corepack pnpm install --ignore-scripts
corepack pnpm run db:init
```

Run the local dependency guard before adding packages:

```powershell
pnpm run security:scan
```

Install scripts are not approved by default. Review any package that asks for
`preinstall`, `install`, `postinstall`, `prepare`, `prepack`, or `postpack`.

The PostgreSQL database name is `clover golf`. The JSON file
`data/clover golf.json` remains only as a local fallback/seed file.
