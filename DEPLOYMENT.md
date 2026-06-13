# Deployment Shared Hosting

Target production:

- URL: `https://kpi.arvadigital.web.id/`
- Repository: `arifinprofitformula-idn/kpi`
- Runtime: PHP 8.2+ dan MySQL/MariaDB

Panduan ini menggunakan istilah menu cPanel. Nama menu pada panel hosting lain
dapat sedikit berbeda.

## 1. Siapkan repository dari komputer lokal

Hasil build React di `assets/react/` harus ikut masuk repository karena shared
hosting umumnya tidak menyediakan Node.js.

```bash
npm ci
npm run check
git add .
git commit -m "Prepare KPI app for production deployment"
git push origin main
```

Pastikan GitHub menampilkan minimal file berikut:

```text
index.php
api.php
api/index.php
assets/react/app.js
assets/react/app.css
config.php
database/schema.sql
.htaccess
```

Jangan pernah commit file `.env`.

## 2. Buat subdomain

Di cPanel buka **Domains** lalu buat:

```text
kpi.arvadigital.web.id
```

Gunakan document root khusus, misalnya:

```text
/home/CPANEL_USER/kpi.arvadigital.web.id
```

Jika DNS domain dikelola di luar hosting, tambahkan record:

```text
Type: A
Name: kpi
Value: IP shared hosting
```

Tunggu DNS aktif sebelum meminta SSL.

## 3. Clone repository

### Repo publik

Di **Git Version Control**, pilih **Create** dan aktifkan **Clone a Repository**.

```text
Clone URL: https://github.com/arifinprofitformula-idn/kpi.git
Repository Path: /home/CPANEL_USER/kpi.arvadigital.web.id
Repository Name: KPI Dashboard
```

Folder tujuan harus kosong. Hapus atau pindahkan folder bawaan seperti
`cgi-bin` terlebih dahulu jika cPanel menolak proses clone.

### Repo privat

Buat SSH key dari cPanel **SSH Access** atau Terminal. Tambahkan public key
tersebut di GitHub:

```text
Repository > Settings > Deploy keys > Add deploy key
```

Izin tulis tidak diperlukan. Gunakan clone URL:

```text
git@github.com:arifinprofitformula-idn/kpi.git
```

Setelah clone, pastikan branch aktif adalah `main`.

## 4. Pilih versi PHP

Di **MultiPHP Manager** atau **Select PHP Version**:

- Pilih PHP 8.2, 8.3, atau 8.4.
- Aktifkan `pdo`, `pdo_mysql`, `json`, `session`, dan `openssl`.
- Gunakan PHP 8.4 jika tersedia dan stabil pada hosting.

## 5. Buat database

Di **MySQL Databases**:

1. Buat database, misalnya `CPANEL_USER_kpi`.
2. Buat user database, misalnya `CPANEL_USER_kpiuser`.
3. Gunakan password acak yang kuat.
4. Tambahkan user ke database dengan **ALL PRIVILEGES**.

Di **phpMyAdmin**, pilih database tersebut lalu import:

```text
database/schema.sql
```

Import harus selesai tanpa error dan menghasilkan lima tabel.

## 6. Buat konfigurasi production

Di root aplikasi, buat file `.env` dengan permission `600` atau `640`:

```ini
KPI_APP_ENV="production"
KPI_APP_DEBUG="0"
KPI_DB_HOST="localhost"
KPI_DB_NAME="CPANEL_USER_kpi"
KPI_DB_USER="CPANEL_USER_kpiuser"
KPI_DB_PASS="GANTI_DENGAN_PASSWORD_DATABASE"
KPI_ADMIN_PIN="GANTI_DENGAN_PIN_ADMIN_KUAT"
KPI_LEADER_PIN="GANTI_DENGAN_PIN_LEADER_KUAT"
KPI_WORK_DAYS="26"
```

Gunakan PIN admin dan leader yang berbeda. Jangan gunakan nilai development
`0000` atau `9999`.

Jika MySQL hosting memakai hostname khusus, ganti `localhost` sesuai informasi
provider.

## 7. Aktifkan SSL

Di **SSL/TLS Status**, jalankan AutoSSL untuk `kpi.arvadigital.web.id`.
Setelah sertifikat valid, buka **Domains** lalu aktifkan **Force HTTPS
Redirect**.

Tes kedua alamat:

```text
http://kpi.arvadigital.web.id/
https://kpi.arvadigital.web.id/
```

Alamat HTTP harus berpindah ke HTTPS.

## 8. Uji aplikasi

1. Buka `https://kpi.arvadigital.web.id/`.
2. Login dengan `KPI_ADMIN_PIN`.
3. Buka Pengaturan Form KPI dan pastikan posisi tampil.
4. Tambahkan satu user dengan PIN unik.
5. Logout dan login sebagai user tersebut.
6. Buat satu input KPI percobaan.
7. Login sebagai leader dan uji approval.
8. Pastikan tidak ada error pada cPanel **Errors**.

Tes proteksi file berikut. Semuanya harus menghasilkan `403` atau `404`:

```text
https://kpi.arvadigital.web.id/.env
https://kpi.arvadigital.web.id/init_db.php
https://kpi.arvadigital.web.id/README.md
```

## 9. Update berikutnya

Di lokal:

```bash
npm ci
npm run check
git add .
git commit -m "Describe the change"
git push origin main
```

Di cPanel **Git Version Control**:

1. Buka **Manage**.
2. Klik **Update from Remote**.
3. Pastikan commit terbaru sudah aktif.
4. Jangan menghapus atau menimpa `.env`.

Backup database sebelum perubahan besar.

## Troubleshooting

### Halaman putih atau asset 404

Pastikan `assets/react/app.js` dan `assets/react/app.css` ada di hosting dan
document root menunjuk ke folder repository.

### Database connection failed

Periksa nama database dan user. cPanel biasanya menambahkan prefix akun.
Pastikan user database sudah ditambahkan ke database dengan privileges.

### HTTP 500

Periksa cPanel **Errors**. Pastikan versi PHP minimal 8.2 dan extension
`pdo_mysql` aktif. Periksa juga syntax serta permission `.env`.

### Login selalu gagal

Pastikan `.env` terbaca, PIN tidak mengandung spasi tanpa sengaja, dan PIN user
berbeda dari PIN admin/leader.

### Clone GitHub gagal

Untuk repository privat, gunakan deploy key SSH. Untuk repository publik,
gunakan URL HTTPS tanpa username dan password.
