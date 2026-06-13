# Security Review

Tidak ada aplikasi yang dapat dijamin kebal terhadap seluruh serangan. Target
proyek ini adalah defense in depth yang sesuai untuk aplikasi internal pada
shared hosting.

## Kontrol yang diterapkan

- Password hashing untuk PIN staff, admin, dan leader.
- Rate limiting login berbasis identifier IP yang di-hash.
- Session strict mode, cookie `HttpOnly`, `SameSite=Lax`, dan `Secure` pada
  production.
- Prefix cookie `__Host-`, idle timeout, absolute timeout, dan rotasi session ID.
- CSRF token untuk seluruh endpoint terautentikasi.
- Validasi same-origin, HTTP POST, JSON content type, dan ukuran payload.
- Role authorization pada aksi admin dan leader.
- Prepared statements PDO dengan emulated prepares dinonaktifkan.
- CSP nonce, HSTS, anti-clickjacking, MIME sniffing, dan isolation headers.
- Validasi URL HTTP/HTTPS serta batas panjang dan jumlah data.
- JSON bootstrap di-encode dengan `JSON_HEX_*` untuk mencegah script breakout.
- Source, schema, dotfile, installer, dan konfigurasi diblokir oleh Apache.
- Migrasi schema dinonaktifkan di production agar user database dapat memakai
  least privilege.
- Audit log untuk login, logout, approval, perubahan user, dan pengaturan KPI.
- Detail exception tidak dikirim ke client saat production.

## Risiko tersisa

- Login tetap menggunakan satu faktor berupa PIN/passphrase. MFA belum tersedia.
- Admin dan leader adalah credential bersama, sehingga atribusi per individu
  terbatas.
- Rate limiting aplikasi tidak menggantikan WAF terhadap serangan terdistribusi.
- Keamanan akhir bergantung pada cPanel, Apache, PHP, MySQL, DNS, SSL, backup,
  dan keamanan akun GitHub.
- Repository publik mengungkap source code dan definisi KPI bawaan.
- Review ini bukan penetration test eksternal atau sertifikasi keamanan.

## Persyaratan production

- Gunakan HTTPS dan `KPI_APP_URL` yang tepat.
- Gunakan hash PIN privileged, bukan PIN plaintext.
- Gunakan passphrase/PIN minimal 8 karakter dan berbeda untuk setiap akun.
- Gunakan password database acak minimal 12 karakter.
- Set `KPI_APP_DEBUG=0` dan `KPI_ALLOW_SCHEMA_MIGRATIONS=0`.
- Aktifkan ModSecurity atau WAF, MFA cPanel/GitHub, backup harian, dan monitoring
  log.
- Jalankan `npm audit` serta `npm run check` sebelum setiap deployment.
