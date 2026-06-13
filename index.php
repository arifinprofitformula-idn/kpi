<?php
declare(strict_types=1);
require_once __DIR__ . '/src/bootstrap.php';
$isAuthenticated = isset($_SESSION['role']);
$appUrl = 'login';
$appLabel = $isAuthenticated ? 'Buka Dashboard' : 'Masuk Sekarang';
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Sistem KPI Sales & Marketing PT. Emas Perak Indonesia untuk penilaian, monitoring, dan pelaporan kinerja yang terstruktur." />
<title>KPI EPI | Sistem Manajemen Kinerja</title>
<link rel="stylesheet" href="assets/css/landing.css?v=<?= (int) @filemtime(__DIR__ . '/assets/css/landing.css') ?>" />
</head>
<body>
<header class="landing-nav">
  <div class="landing-container nav-inner">
    <a class="landing-brand" href="./" aria-label="KPI EPI">
      <img src="assets/logo-epi-hitam.png" alt="Indonesian Bullion Ecosystem" />
    </a>
    <a class="landing-button landing-button-primary landing-button-small" href="<?= htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8') ?>">
      <?= htmlspecialchars($appLabel, ENT_QUOTES, 'UTF-8') ?>
    </a>
  </div>
</header>

<main>
  <section class="landing-hero">
    <div class="hero-grid" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-one" aria-hidden="true"></div>
    <div class="hero-glow hero-glow-two" aria-hidden="true"></div>
    <div class="landing-container hero-content">
      <span class="landing-chip">Sistem KPI internal PT. Emas Perak Indonesia</span>
      <h1>Penilaian kinerja yang lebih tertib, transparan, dan mudah ditindaklanjuti.</h1>
      <p>
        Satukan target, penilaian berjenjang, monitoring hasil, dan laporan KPI dalam satu sistem
        yang jelas untuk Admin, Manager, Supervisor, dan Staff.
      </p>
      <div class="hero-actions">
        <a class="landing-button landing-button-light" href="<?= htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8') ?>">
          <?= htmlspecialchars($appLabel, ENT_QUOTES, 'UTF-8') ?>
        </a>
        <a class="landing-button landing-button-outline" href="#cara-kerja">Lihat Cara Kerja</a>
      </div>
      <div class="hero-stats">
        <div><strong>4 Peran</strong><span>dalam satu sistem</span></div>
        <div><strong>1 Hirarki</strong><span>penilaian terkontrol</span></div>
        <div><strong>PDF</strong><span>laporan siap digunakan</span></div>
      </div>
    </div>
  </section>

  <section class="landing-section landing-section-white" id="manfaat">
    <div class="landing-container">
      <div class="section-heading">
        <span>Manfaat Utama</span>
        <h2>Satu alur kerja untuk seluruh proses KPI.</h2>
        <p>Setiap pengguna melihat informasi dan menjalankan tugas sesuai tanggung jawabnya.</p>
      </div>
      <div class="feature-grid">
        <article class="feature-card feature-blue">
          <span class="feature-number">01</span>
          <h3>Penilaian berjenjang</h3>
          <p>Admin menentukan siapa menilai siapa, mengikuti struktur Manager, Supervisor, dan Staff.</p>
        </article>
        <article class="feature-card feature-gold">
          <span class="feature-number">02</span>
          <h3>Data terpusat</h3>
          <p>Target, skor, kehadiran, catatan, dan bukti penilaian tersimpan dalam satu sumber data.</p>
        </article>
        <article class="feature-card feature-green">
          <span class="feature-number">03</span>
          <h3>Laporan konsisten</h3>
          <p>Hasil KPI dapat diekspor menjadi dokumen PDF formal dengan format perusahaan.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="landing-band">
    <div class="landing-container">
      <span>Dirancang untuk organisasi yang rapi</span>
      <h2>Dari pengaturan indikator hingga laporan final, seluruh proses berada dalam satu tempat.</h2>
    </div>
  </section>

  <section class="landing-section landing-section-soft" id="peran">
    <div class="landing-container">
      <div class="section-heading">
        <span>Akses Berdasarkan Peran</span>
        <h2>Setiap akun bekerja sesuai kewenangannya.</h2>
      </div>
      <div class="role-grid">
        <article class="role-card">
          <div class="role-icon">A</div>
          <h3>Admin</h3>
          <p>Mengelola akun, indikator KPI, jalur penilaian, dan menilai kinerja Manager.</p>
        </article>
        <article class="role-card">
          <div class="role-icon">M</div>
          <h3>Manager</h3>
          <p>Melihat KPI sendiri dan menilai Supervisor atau Staff yang ditetapkan Admin.</p>
        </article>
        <article class="role-card">
          <div class="role-icon">S</div>
          <h3>Supervisor</h3>
          <p>Melihat KPI sendiri dan melakukan penilaian terhadap Staff yang ditugaskan.</p>
        </article>
        <article class="role-card">
          <div class="role-icon">ST</div>
          <h3>Staff</h3>
          <p>Melihat hasil penilaian KPI pribadi tanpa akses untuk menilai akun lain.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="landing-section landing-section-white" id="cara-kerja">
    <div class="landing-container workflow-layout">
      <div class="section-heading section-heading-left">
        <span>Cara Kerjanya</span>
        <h2>Tiga langkah menuju evaluasi kinerja yang jelas.</h2>
        <p>Alurnya sederhana, tetapi tetap menjaga kontrol akses dan akuntabilitas data.</p>
      </div>
      <div class="workflow-list">
        <article>
          <span>01</span>
          <div><h3>Admin menyiapkan struktur</h3><p>Akun, jabatan, indikator, bobot, target, dan hubungan penilai ditentukan terlebih dahulu.</p></div>
        </article>
        <article>
          <span>02</span>
          <div><h3>Atasan melakukan penilaian</h3><p>Manager dan Supervisor mengisi capaian berdasarkan akun yang sudah diberikan kepada mereka.</p></div>
        </article>
        <article>
          <span>03</span>
          <div><h3>Hasil dipantau dan dilaporkan</h3><p>Pengguna melihat hasil sesuai aksesnya dan laporan formal dapat diekspor untuk dokumentasi.</p></div>
        </article>
      </div>
    </div>
  </section>

  <section class="landing-cta">
    <div class="landing-container cta-inner">
      <div>
        <span>Mulai bekerja lebih terstruktur</span>
        <h2>Akses dashboard KPI EPI dan lanjutkan proses penilaian tim Anda.</h2>
      </div>
      <a class="landing-button landing-button-light" href="<?= htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8') ?>">
        <?= htmlspecialchars($appLabel, ENT_QUOTES, 'UTF-8') ?>
      </a>
    </div>
  </section>
</main>

<footer class="landing-footer">
  <div class="landing-container footer-inner">
    <img src="assets/logo-epi-hitam.png" alt="Indonesian Bullion Ecosystem" />
    <p>Sistem KPI Sales &amp; Marketing PT. Emas Perak Indonesia.</p>
  </div>
</footer>
</body>
</html>
