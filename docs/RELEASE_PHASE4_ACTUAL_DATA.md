# KPI Phase 4 Actual Data Release Notes

## Summary

Phase 4 adds Section C `Input Data Aktual` to the KPI Evidence workflow. KPI
definitions can now define dynamic actual-data fields, submissions store those
rows per KPI answer, and superior/admin users must verify required actual data
before final approval.

The release is backward compatible with old KPI definitions and old submissions.

## User-Facing Changes

- KPI reports and print/export views include actual data and evidence summary.
- Approved submissions remain locked.
- Old submissions without actual data rows continue to open normally.

## Admin Changes

- KPI Settings can define `actualDataFields` per KPI.
- A KPI can mark one actual-data field as the `actualValueSourceFieldId`.
- Admin users can verify or reject actual data and evidence.
- Approval is blocked until required actual data and required evidence are
  verified.

## Assessed User Changes

- The assessed user fills Section C `Input Data Aktual Saya` when configured for
  a KPI.
- Required actual-data values, source document, and data date are validated.
- If a KPI uses `actualValueSourceFieldId`, the main actual value is sourced
  from that actual-data field.
- Existing KPIs without actual-data fields keep the old manual actual-value
  input behavior.

## Superior/Admin Verification Changes

- Superior/admin users review each actual-data row.
- Verification statuses are `pending`, `verified`, `rejected`, or
  `not_required`.
- Rejecting actual data requires a note.
- Verification and rejection are written to submission audit logs and security
  audit logs.

## Database Migrations

The release adds:

- `submission_answer_actual_data`
- `submission_answers.actual_data_status`

The migration also confirms Phase 2/3 structures exist:

- evidence verification columns on `submission_answer_evidences`
- `calculated_tier`, `final_tier`, `achievement_note`, `decision_reason`,
  `coaching_note`, and `evidence_status` on `submission_answers`
- `submission_audit_logs`

The migration is additive and repeatable. It does not drop or truncate tables.

## New Scripts

- `scripts/migrate_phase4_actual_data.php`
  - CLI-only migration script.
  - Calls `ensureAppSchema($pdo, true)`.
  - Works even when `KPI_ALLOW_SCHEMA_MIGRATIONS=0`.

- `scripts/check_phase4_schema.php`
  - CLI-only schema readiness check.
  - Prints `PASS` or `FAIL` per required table, column, and foreign key.
  - Does not modify data.

## Preset Input Data Aktual Brand Executive Meezan Gold

Admin can populate the Brand Executive Meezan Gold actual-data fields without
manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Brand Executive Meezan Gold`.
3. Click `Terapkan Preset Brand Executive Meezan Gold`.
4. Review the generated actual-data fields per KPI.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements.

## Preset Input Data Aktual Brand Executive Silvergram

Admin can populate the Brand Executive Silvergram actual-data fields without
manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Brand Executive Silvergram`.
3. Click `Terapkan Preset Brand Executive Silvergram`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements. Existing actual-data fields with the same ID are updated, while
unrelated custom fields remain in place.

## Preset Input Data Aktual Staff Marcom CRM & Database

Admin can populate the Staff Marcom CRM & Database actual-data fields without
manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Staff Marcom - CRM & Database`, `Staff Markom`, or the relevant CRM
   staff position alias.
3. Click `Terapkan Preset Staff Marcom CRM & Database`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements. Existing actual-data fields with the same ID are updated, while
unrelated custom fields remain in place.

## Preset Input Data Aktual Staff Marcom Design & Web

Admin can populate the Staff Marcom Design & Web actual-data fields without
manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Staff Marcom - Design & Web`, `Staff Markom Designer & Web
   Developer`, or the relevant design/web staff position alias.
3. Click `Terapkan Preset Staff Marcom Design & Web`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements. Existing actual-data fields with the same ID are updated, while
unrelated custom fields remain in place.

## Preset Input Data Aktual Staff Marcom Social Media

Admin can populate the Staff Marcom Social Media actual-data fields without
manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Staff Marcom - Social Media`, `Staff Markom Designer & Video`, or
   the relevant visual content staff position alias.
3. Click `Terapkan Preset Staff Marcom Social Media`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements. Existing actual-data fields with the same ID are updated, while
unrelated custom fields remain in place.

## Posisi Staff Markom Designer & Video

The default KPI definitions include `Staff Markom - Designer & Video`, based on
`KPI_Evidence_Document_StaffMarkom_Locky.xlsx`.

Admin can populate its actual-data fields without manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Staff Markom - Designer & Video`.
3. Click `Terapkan Preset Staff Markom Designer & Video`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset follows the Locky evidence workbook: the assessed user fills Section
C actual data, each actual-data row uses `Sumber Dokumen / Bukti` as primary
evidence, and the superior verifies data before final scoring. Existing saved
positions are not overwritten.

## Preset Input Data Aktual Staff Marcom Photo & Video Production

Admin can populate the Staff Marcom Photo & Video Production actual-data fields
without manual one-by-one setup:

1. Open `Pengaturan Form KPI`.
2. Select `Staff Marcom - Photo & Video Production`, `Staff Markom Foto &
   Video`, or the relevant content production staff position alias.
3. Click `Terapkan Preset Staff Marcom Photo & Video Production`.
4. Review the generated actual-data fields for KPI1 to KPI7.
5. Click `Simpan Pengaturan`.

The preset only merges `actualDataFields` and `actualValueSourceFieldId`. It
preserves KPI names, targets, weights, scoring tiers, and existing evidence
requirements. Existing actual-data fields with the same ID are updated, while
unrelated custom fields remain in place.

## Deployment Steps Summary

Local:

```bash
npm ci
npm run check
git add .
git commit -m "Deploy KPI Phase 4 actual data verification"
git push origin main
```

Server:

```bash
cd /home/CPANEL_USER/kpi.arvadigital.web.id
git fetch origin
git checkout main
git pull origin main
php scripts/migrate_phase4_actual_data.php
php scripts/check_phase4_schema.php
```

Do not overwrite production `.env` or `.kpi.env`.

## Rollback Notes

Code rollback can use the previous commit:

```bash
git reset --hard PREVIOUS_COMMIT
```

Database rollback should restore the pre-deploy SQL backup only if production
data created after the release can be discarded or has already been exported.

Emergency partial rollback can revert code only because the Phase 4 schema is
additive and older code should ignore the additional table/columns.

## Known Risks

- Production migration requires a database user with schema privileges.
- Misconfigured actual-data fields can block approval until corrected.
- Shared hosting may not have Node.js, so `assets/react/` must be built and
  committed before deployment.
- Manual smoke testing is required to confirm role assignments match the
  production organization chart.

## Smoke Test Checklist

- Admin can save actual-data fields in KPI Settings.
- Evaluator is rejected when required actual data is missing.
- Evaluator can submit when actual data and evidence are complete.
- Superior/admin can verify actual data.
- Superior/admin can reject actual data with a note.
- Audit log records actual-data verification/rejection.
- Approval is blocked until required actual data and evidence are verified.
- Approval succeeds after all required gates are satisfied.
- Approved submission is locked.
- PDF export includes actual data summary.
- Old submissions still open normally.
