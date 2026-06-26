# KPI Phase 4 Actual Data Deployment Runbook

Repository: `arifinprofitformula-idn/kpi`

Target runtime: shared hosting/cPanel or PHP/MySQL server with PHP 8.2+ and
MySQL/MariaDB. Shared hosting does not need Node.js because the React build must
already be committed in `assets/react/`.

Do not overwrite production `.env` or `.kpi.env`.

## Final Deployment Command Order

Local:

```bash
npm ci
npm run check
git add .
git commit -m "Deploy KPI Phase 4 actual data verification"
git push origin main
```

Server:

1. Backup database.
2. Backup app folder.
3. Update from remote or run `git pull`.
4. Run `php scripts/migrate_phase4_actual_data.php`.
5. Run `php scripts/check_phase4_schema.php`.
6. Smoke test.
7. Monitor logs.

## 1. Release Overview

Phase 4 adds Actual Data Input & Verification to the KPI Evidence workflow:

- Adds Section C `Input Data Aktual` per KPI.
- Stores actual data rows per submission answer in the database.
- Allows superior/admin users to verify or reject actual data.
- Blocks approval until required actual data and required evidence are verified.
- Adds print/export actual data summary.
- Preserves old KPI definitions and old submissions.

The migration is additive. Existing submissions without actual data rows should
continue to display normally.

## 2. Pre-Deploy Local Checklist

Run these commands locally before pushing:

```bash
git status
npm ci
npm run lint
npm run test
npm run check:php
npm run check
git diff --check
```

Confirm:

- `assets/react/app.js` and `assets/react/app.css` are updated if build output
  changed.
- `scripts/migrate_phase4_actual_data.php` exists.
- `scripts/check_phase4_schema.php` exists.
- `DEPLOYMENT_PHASE4_ACTUAL_DATA.md` exists.
- `.env` is not committed.

If `git status` shows `.env`, stop and remove it from the commit scope before
deployment.

## 3. Production Backup Checklist

### cPanel

Before updating code:

1. Open cPanel phpMyAdmin.
2. Select the KPI production database.
3. Export the full database as SQL.
4. Download and verify the SQL backup file exists locally.
5. Compress the production app folder from File Manager.
6. Save the current commit hash from Git Version Control or Terminal.
7. Save a secure copy of the production `.env` or external `.kpi.env`.
8. Confirm SSL is active for the production domain.

### SSH

Use placeholders for the real account, path, database, and date:

```bash
cd /home/CPANEL_USER/kpi.arvadigital.web.id
git rev-parse HEAD
tar -czf backup_kpi_app_before_phase4_DATE.tar.gz /home/CPANEL_USER/kpi.arvadigital.web.id
mysqldump -u DB_USER -p DB_NAME > backup_kpi_db_before_phase4_DATE.sql
```

Store backups somewhere outside the public document root when possible.

## 4. Deployment Steps For cPanel Git Version Control

1. Open cPanel.
2. Open **Git Version Control**.
3. Open **Manage** for the KPI repository.
4. Click **Update from Remote**.
5. Confirm the latest expected commit is active.
6. Confirm production `.env` or `.kpi.env` was not overwritten.
7. Open cPanel Terminal, or SSH, and run the migration commands in section 6.
8. Purge Cloudflare, LiteSpeed, or hosting cache if used.

If the repository is deployed by ZIP upload instead of cPanel Git, upload the
verified build output from local/CI, including `assets/react/`, and keep the
production environment file untouched.

## 5. Deployment Steps For SSH

Main branch flow:

```bash
cd /home/CPANEL_USER/kpi.arvadigital.web.id
git fetch origin
git checkout main
git pull origin main
php scripts/migrate_phase4_actual_data.php
php scripts/check_phase4_schema.php
```

Release branch flow:

```bash
cd /home/CPANEL_USER/kpi.arvadigital.web.id
git fetch origin
git checkout release/phase4-actual-data
git pull origin release/phase4-actual-data
php scripts/migrate_phase4_actual_data.php
php scripts/check_phase4_schema.php
```

After the release branch is verified, merge it to `main` according to the team
release process.

## 6. Database Migration

Prefer running the migration from CLI:

```bash
php scripts/migrate_phase4_actual_data.php
```

Then verify the schema:

```bash
php scripts/check_phase4_schema.php
```

The migration script is CLI-only, additive, and repeatable. It calls the app
schema bootstrap with force enabled, so it can run even when production has:

```ini
KPI_ALLOW_SCHEMA_MIGRATIONS="0"
```

If the runtime database user does not have `ALTER` or `CREATE` privilege, use
one of these approaches:

- Temporarily switch `.env` or `.kpi.env` to a migration DB user, run the two
  scripts, then restore the restricted runtime DB user.
- Run the scripts from a shell where environment variables point to the
  migration DB user.
- Import equivalent SQL manually in phpMyAdmin if CLI migration is not possible.

After migration, return production to the restricted runtime DB user if that is
the normal setup.

Expected success indicators:

```text
Phase 4 Actual Data migration completed successfully.
PASS Phase 4 schema is ready.
```

If either command exits non-zero, stop the deployment and inspect the error
before allowing users back into the workflow.

## 7. Post-Deploy Smoke Test

Use a test subject or non-critical KPI where possible:

A. Login as admin.
B. Open KPI Settings.
C. Add or apply `actualDataFields` to one KPI.
D. Save settings.
E. Login as evaluator.
F. Submit KPI with missing required actual data and confirm backend rejects.
G. Submit KPI with complete actual data and evidence.
H. Confirm submission status is `Submitted` or `Evidence Reviewed`, not auto
   `Approved`.
I. Login as admin/superior.
J. Verify actual data row.
K. Reject actual data row with note.
L. Confirm audit log event.
M. Verify evidence.
N. Try approve before all required actual data/evidence are verified and confirm
   approval is blocked.
O. Approve after all required actual data/evidence are verified.
P. Confirm approved submission is locked.
Q. Export PDF and confirm actual data summary appears.

Also open one old submission that existed before Phase 4 and confirm it still
loads normally.

## 8. Security Smoke Test

Confirm these URLs return `403` or `404`:

```text
/.env
/init_db.php
/README.md
/database/schema.sql
/src/bootstrap.php
/scripts/migrate_phase4_actual_data.php
/scripts/check_phase4_schema.php
```

If either script is accessible from the browser, add or update `.htaccess`
protection before continuing. The scripts are CLI-only, but the files should
still not be web-readable on production.

## 9. Rollback Plan

### Code Rollback

With SSH:

```bash
cd /home/CPANEL_USER/kpi.arvadigital.web.id
git reset --hard PREVIOUS_COMMIT
```

With cPanel Git Version Control, checkout or deploy the previous known-good
commit.

### Database Rollback

Restore the SQL backup from before deployment only if production data created
after deployment can be discarded or has already been exported.

Typical restore flow:

```bash
mysql -u DB_USER -p DB_NAME < backup_kpi_db_before_phase4_DATE.sql
```

### Emergency Partial Rollback

If the schema migration completed but the application code must be reverted,
revert code only first. The Phase 4 schema is additive, and older code should
ignore the extra table/columns.

Keep the database and app backups available until the release has been stable.

## 10. Monitoring

For 48 hours after deployment:

- Check cPanel Errors.
- Check PHP error logs.
- Check `[KPI Audit]` events.
- Check `[KPI Security]` events.
- Monitor failed submission reports.
- Monitor approval gate errors.
- Confirm no staff can verify their own data unless allowed by role rules.

Investigate repeated actual data validation errors quickly; they may indicate a
KPI field configuration issue rather than a server issue.

## 11. Final Deployment Command Order

Local:

```bash
npm ci
npm run check
git add .
git commit -m "Deploy KPI Phase 4 actual data verification"
git push origin main
```

Server:

1. Backup database.
2. Backup app folder.
3. Update from remote or run:

   ```bash
   git pull origin main
   ```

4. Run:

   ```bash
   php scripts/migrate_phase4_actual_data.php
   php scripts/check_phase4_schema.php
   ```

5. Smoke test.
6. Monitor logs.
