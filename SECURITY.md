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
setx DATABASE_URL "postgres://postgres:postgres@localhost:5432/clover%20golf"
pnpm install
pnpm run db:init
```

Run the local dependency guard before adding packages:

```powershell
pnpm run security:scan
```

Install scripts are not approved by default. Review any package that asks for
`preinstall`, `install`, `postinstall`, `prepare`, `prepack`, or `postpack`.

The PostgreSQL database name is `clover golf`. The JSON file
`data/clover golf.json` remains only as a local fallback/seed file.
