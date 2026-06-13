# KPI Sales & Marketing

Aplikasi KPI dengan frontend React 19, build Vite, backend PHP 8.4, dan MySQL.
Backend tetap menjadi sumber kebenaran untuk otorisasi, validasi formula, dan
perhitungan skor.

## Architecture

```text
frontend/
  components/       Halaman fitur React
  lib/api.js       HTTP client dan CSRF lifecycle
  lib/kpi.js       Logika domain formula KPI
  App.jsx          Auth, navigasi, dan orkestrasi data
src/
  bootstrap.php    Session dan HTTP security headers
  helpers.php      Auth serta query/read model
api/index.php      Endpoint dan command handlers
db.php             Koneksi, schema compatibility, formula, scoring
tests/frontend/    Unit test domain frontend
scripts/           Quality-check utilities
```

## Requirements

- PHP 8.4 dengan `pdo_mysql`
- MySQL/MariaDB
- Node.js 22.12 atau lebih baru
- npm 10 atau lebih baru

## Configuration

Konfigurasi sensitif dibaca dari environment. Gunakan `.env.example` sebagai
referensi dan atur variabel tersebut melalui konfigurasi Apache/PHP atau
environment sistem. Jangan commit secret produksi.

Variabel utama:

- `KPI_DB_HOST`, `KPI_DB_NAME`, `KPI_DB_USER`, `KPI_DB_PASS`
- `KPI_ADMIN_PIN`, `KPI_LEADER_PIN`
- `KPI_APP_ENV=production`
- `KPI_APP_DEBUG=0`
- `KPI_WORK_DAYS=26`

Fallback bawaan hanya ditujukan untuk development lokal.

## Setup

```bash
npm install
php init_db.php
npm run build
```

`init_db.php` hanya dapat dijalankan melalui CLI dan tidak dapat dibuka dari
web.

## Development

```bash
npm run dev
```

Vite digunakan untuk frontend development. PHP/Apache tetap melayani API.

## Quality Gates

```bash
npm run lint
npm run test
npm run check:php
npm run check
```

`npm run check` menjalankan lint, unit test, PHP syntax check, dan production
build.

## Production

```bash
npm ci
npm run check
```

Deploy source PHP bersama hasil build `assets/react/`. Folder tersebut
diabaikan Git karena sebaiknya dibuat oleh pipeline build, tetapi harus tersedia
pada server runtime.

## Security

- Session cookie `HttpOnly` dan `SameSite=Lax`
- CSRF token untuk seluruh endpoint terautentikasi
- Content Security Policy dan HTTP security headers
- PIN staff disimpan menggunakan `password_hash`
- PIN tidak pernah dikirim kembali melalui API
- Installer database tidak dapat diakses melalui HTTP
- Detail exception hanya masuk server log kecuali debug diaktifkan

Untuk production, gunakan HTTPS dan ganti seluruh credential/PIN bawaan.
# kpi
