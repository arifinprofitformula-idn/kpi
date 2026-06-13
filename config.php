<?php
declare(strict_types=1);

function localEnvValues(): array
{
    static $values = null;
    if (is_array($values)) {
        return $values;
    }

    $path = __DIR__ . '/.env';
    if (!is_file($path) || !is_readable($path)) {
        return $values = [];
    }

    $parsed = parse_ini_file($path, false, INI_SCANNER_RAW);
    return $values = is_array($parsed) ? $parsed : [];
}

function envValue(string $key, string $default = ''): string
{
    $value = getenv($key);
    if (is_string($value) && $value !== '') {
        return $value;
    }

    $local = localEnvValues()[$key] ?? null;
    return is_string($local) && $local !== '' ? $local : $default;
}

function envBool(string $key, bool $default = false): bool
{
    return filter_var(
        envValue($key, $default ? '1' : '0'),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? $default;
}

function envInt(string $key, int $default, int $min, int $max): int
{
    $value = filter_var(envValue($key, (string) $default), FILTER_VALIDATE_INT);
    if ($value === false) {
        return $default;
    }
    return max($min, min($max, $value));
}

define('APP_ENV', envValue('KPI_APP_ENV', 'development'));
define('APP_DEBUG', envBool('KPI_APP_DEBUG'));
define('APP_URL', rtrim(envValue('KPI_APP_URL'), '/'));
define('DB_HOST', envValue('KPI_DB_HOST', 'localhost'));
define('DB_PORT', envInt('KPI_DB_PORT', 3306, 1, 65535));
define('DB_NAME', envValue('KPI_DB_NAME', 'kpi_app'));
define('DB_USER', envValue('KPI_DB_USER', 'kpi_user'));
define('DB_PASS', envValue('KPI_DB_PASS', 'secret'));
define('ADMIN_USERNAME', strtolower(envValue('KPI_ADMIN_USERNAME', 'admin')));
define('ADMIN_EMAIL', strtolower(envValue('KPI_ADMIN_EMAIL', 'admin@kpi.local')));
define('ADMIN_PASSWORD_HASH', envValue('KPI_ADMIN_PASSWORD_HASH', envValue('KPI_ADMIN_PIN_HASH')));
define('HARI_KERJA', envInt('KPI_WORK_DAYS', 26, 1, 31));
define('ALLOW_SCHEMA_MIGRATIONS', envBool('KPI_ALLOW_SCHEMA_MIGRATIONS', APP_ENV !== 'production'));
define('SESSION_IDLE_TIMEOUT', envInt('KPI_SESSION_IDLE_TIMEOUT', 1800, 300, 86400));
define('SESSION_ABSOLUTE_TIMEOUT', envInt('KPI_SESSION_ABSOLUTE_TIMEOUT', 28800, 1800, 604800));
define('LOGIN_MAX_ATTEMPTS', envInt('KPI_LOGIN_MAX_ATTEMPTS', 5, 3, 20));
define('LOGIN_WINDOW_SECONDS', envInt('KPI_LOGIN_WINDOW_SECONDS', 900, 60, 86400));
define('LOGIN_LOCKOUT_SECONDS', envInt('KPI_LOGIN_LOCKOUT_SECONDS', 900, 60, 86400));
define('MAX_REQUEST_BYTES', envInt('KPI_MAX_REQUEST_BYTES', 1048576, 16384, 5242880));
const API_KEYS = [];

function assertProductionConfig(): void
{
    if (APP_ENV !== 'production') {
        return;
    }

    $errors = [];
    if (APP_DEBUG) {
        $errors[] = 'KPI_APP_DEBUG harus 0';
    }
    if (filter_var(APP_URL, FILTER_VALIDATE_URL) === false || !str_starts_with(APP_URL, 'https://')) {
        $errors[] = 'KPI_APP_URL harus URL HTTPS yang valid';
    }
    if (DB_PASS === '' || in_array(DB_PASS, ['secret', 'change-me'], true) || strlen(DB_PASS) < 12) {
        $errors[] = 'KPI_DB_PASS harus kuat dan minimal 12 karakter';
    }
    if (filter_var(ADMIN_EMAIL, FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'KPI_ADMIN_EMAIL wajib berupa alamat email yang valid';
    }
    if (
        ADMIN_PASSWORD_HASH === ''
        || (password_get_info(ADMIN_PASSWORD_HASH)['algo'] ?? null) === null
    ) {
        $errors[] = 'KPI_ADMIN_PASSWORD_HASH wajib berupa password_hash yang valid';
    }
    if ($errors !== []) {
        throw new RuntimeException('Konfigurasi production tidak aman: ' . implode('; ', $errors));
    }
}

const POSISI_DATA = [
    'Brand Executive Silvergram' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Pencapaian Target Revenue Brand', 'bobot' => 40, 'target' => '≥100% dari target tahunan', 'tiers' => [
                ['label' => 'Capaian ≥ 120%', 'skor' => 2],
                ['label' => 'Capaian 95% - 104%', 'skor' => 1],
                ['label' => 'Capaian < 95%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Channel Productivity & Activation', 'bobot' => 20, 'target' => '≥75% SC & EPIS Aktif', 'tiers' => [
                ['label' => 'Capaian ≥ 80%', 'skor' => 2],
                ['label' => 'Capaian 70% - 79%', 'skor' => 1],
                ['label' => 'Capaian < 70%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Conversion & Funnel Impact', 'bobot' => 15, 'target' => '≥90% Leads ditindaklanjuti ≤ H+1 hari', 'tiers' => [
                ['label' => 'Capaian ≥ 10%', 'skor' => 2],
                ['label' => 'Capaian 3% - 9%', 'skor' => 1],
                ['label' => 'Capaian < 3%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Eksekusi Roadmap & Campaign', 'bobot' => 10, 'target' => '≥90% milestone campaign terealisasi sesuai timeline', 'tiers' => [
                ['label' => 'Capaian ≥ 95%', 'skor' => 2],
                ['label' => 'Capaian 85% - 94%', 'skor' => 1],
                ['label' => 'Capaian < 85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Portofolio & Product Velocity', 'bobot' => 5, 'target' => 'Tidak ada Varian Stagnan > 3 bulan', 'tiers' => [
                ['label' => 'Capaian 0 stagnan', 'skor' => 2],
                ['label' => 'Capaian 1 stagnan', 'skor' => 1],
                ['label' => 'Capaian >2 stagnan', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Strategic Improvement', 'bobot' => 5, 'target' => 'Min. 2 improvement berdampak revenue', 'tiers' => [
                ['label' => 'Capaian ≥3 improvement berdampak', 'skor' => 2],
                ['label' => 'Capaian 1-2 improvement', 'skor' => 1],
                ['label' => 'Capaian 0 improvement', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Reporting & Governance', 'bobot' => 5, 'target' => '100% Tepat Waktu', 'tiers' => [
                ['label' => 'Capaian 100% tepat waktu & akurat', 'skor' => 2],
                ['label' => 'Capaian 70% (1x terlambat ringan)', 'skor' => 1],
                ['label' => 'Capaian <70% (>1x terlambat/ data mismatch)', 'skor' => 0],
            ]],
        ],
    ],
    'Brand Executive Meezan Gold' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Pencapaian Target Revenue Brand', 'bobot' => 40, 'target' => 'Mencapai Omzet Rp200 M', 'tiers' => [
                ['label' => 'Capaian ≥ 105%', 'skor' => 2],
                ['label' => 'Capaian 95% - 104%', 'skor' => 1],
                ['label' => 'Capaian < 95%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Channel Productivity & Activation (EPIS)', 'bobot' => 15, 'target' => '≥75% EPIS Aktif Bertransaksi Meezan Gold', 'tiers' => [
                ['label' => 'Capaian ≥ 75%', 'skor' => 2],
                ['label' => 'Capaian 50% - 74%', 'skor' => 1],
                ['label' => 'Capaian < 49%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Eksekusi Roadmap & Campaign', 'bobot' => 10, 'target' => '≥90% milestone campaign terealisasi sesuai timeline', 'tiers' => [
                ['label' => 'Capaian ≥ 90%', 'skor' => 2],
                ['label' => 'Capaian 50% - 89%', 'skor' => 1],
                ['label' => 'Capaian < 49%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Brand Trust & Positioning Consistency', 'bobot' => 10, 'target' => '100% Audit konten & campaign bulanan', 'tiers' => [
                ['label' => 'Capaian ≥ 95%', 'skor' => 2],
                ['label' => 'Capaian 85% - 94%', 'skor' => 1],
                ['label' => 'Capaian > 85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Strategic Partnership & Ecosystem Growth', 'bobot' => 15, 'target' => '≥3 Kolaborasi berdampak revenue', 'tiers' => [
                ['label' => 'Capaian ≥ 3 Kolaborasi', 'skor' => 2],
                ['label' => 'Capaian 1-2 Kolaborasi', 'skor' => 1],
                ['label' => 'Capaian 0 Kolaborasi', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Reporting & Governance', 'bobot' => 10, 'target' => '100% Tepat Waktu', 'tiers' => [
                ['label' => 'Capaian 100% tepat waktu & akurat', 'skor' => 2],
                ['label' => 'Capaian 70% (1x terlambat ringan)', 'skor' => 1],
                ['label' => 'Capaian <70% (>1x terlambat/ data mismatch)', 'skor' => 0],
            ]],
        ],
    ],
    'Marketing Communication Leader' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Demand & Lead Growth Impact', 'bobot' => 25, 'target' => 'Pertumbuhan leads per bulan vs baseline OGSM >15%', 'tiers' => [
                ['label' => 'Capaian ≥ 15% growth', 'skor' => 2],
                ['label' => 'Capaian 8 - 14%', 'skor' => 1],
                ['label' => 'Capaian < 8%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Funnel Conversion & Performance Marketing', 'bobot' => 20, 'target' => 'Conversion rate atau CPL improvement >2%', 'tiers' => [
                ['label' => 'Capaian > 2%', 'skor' => 2],
                ['label' => 'Capaian 1 - 2%', 'skor' => 1],
                ['label' => 'Capaian < 1%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Produk Digital Revenue Achievement', 'bobot' => 20, 'target' => 'Realisasi vs target bulanan', 'tiers' => [
                ['label' => 'Capaian ≥ 105%', 'skor' => 2],
                ['label' => 'Capaian 70% - 104%', 'skor' => 1],
                ['label' => 'Capaian < 70%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'SLA Support to Brand Executive', 'bobot' => 15, 'target' => '% pekerjaan selesai sesuai SLA', 'tiers' => [
                ['label' => 'Capaian ≥ 95%', 'skor' => 2],
                ['label' => 'Capaian 85% - 94%', 'skor' => 1],
                ['label' => 'Capaian > 85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Campaign & Roadmap Execution', 'bobot' => 10, 'target' => 'Program terealisasi ÷ direncanakan', 'tiers' => [
                ['label' => 'Capaian ≥ 95%', 'skor' => 2],
                ['label' => 'Capaian 85% - 94%', 'skor' => 1],
                ['label' => 'Capaian > 85%', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Team Performance & Discipline', 'bobot' => 5, 'target' => '≥80% anggota tim mencapai KPI individu', 'tiers' => [
                ['label' => 'Capaian ≥85 Tim Achieve KPI', 'skor' => 2],
                ['label' => 'Capaian 70% - 84%', 'skor' => 1],
                ['label' => 'Capaian <70%', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Reporting & Budget Control', 'bobot' => 5, 'target' => '1 report/bulan tepat waktu', 'tiers' => [
                ['label' => 'Capaian 100% tepat waktu & akurat', 'skor' => 2],
                ['label' => 'Capaian 70% (1x terlambat ringan)', 'skor' => 1],
                ['label' => 'Capaian <70% (>1x terlambat/ data mismatch)', 'skor' => 0],
            ]],
        ],
    ],
    'Staff Marcom - CRM & Database' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Kualitas & Ketepatan Update Database CRM', 'bobot' => 25, 'target' => 'Mengukur kualitas data CRM', 'tiers' => [
                ['label' => 'Capaian ≥95% data terupdate', 'skor' => 2],
                ['label' => 'Capaian 85 – 94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Aktivasi Channel & Komunitas EPI', 'bobot' => 20, 'target' => 'Target ≥150 story/bulan, ≥100 broadcast/bulan', 'tiers' => [
                ['label' => 'Capaian ≥100% target', 'skor' => 2],
                ['label' => 'Capaian 80–99%', 'skor' => 1],
                ['label' => 'Capaian <80%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Respons Interaksi Audiens', 'bobot' => 15, 'target' => 'Mengukur kecepatan respon DM/comment', 'tiers' => [
                ['label' => 'First response ≤15 menit', 'skor' => 2],
                ['label' => 'First response 16–30 menit', 'skor' => 1],
                ['label' => 'First response > 30 menit', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Support Campaign CRM', 'bobot' => 15, 'target' => 'Mengukur support CRM terhadap campaign', 'tiers' => [
                ['label' => 'Capaian ≥95%', 'skor' => 2],
                ['label' => 'Capaian 85 – 94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Administrasi EPIC Hub', 'bobot' => 10, 'target' => 'Mengukur kerapihan admin platform', 'tiers' => [
                ['label' => 'Capaian ≥95% task selesai', 'skor' => 2],
                ['label' => 'Capaian 85 – 94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Insight & Analisis CRM', 'bobot' => 10, 'target' => 'Mengukur kemampuan membaca data pelanggan', 'tiers' => [
                ['label' => 'Capaian ≥4 insight', 'skor' => 2],
                ['label' => 'Capaian 2 - 3 insight', 'skor' => 1],
                ['label' => 'Capaian <2 insight', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Pertumbuhan Database', 'bobot' => 5, 'target' => 'Mengukur pertumbuhan database CRM', 'tiers' => [
                ['label' => 'Capaian ≥ 7%', 'skor' => 2],
                ['label' => 'Capaian 4 - 6%', 'skor' => 1],
                ['label' => 'Capaian < 4%', 'skor' => 0],
            ]],
        ],
    ],
    'Staff Marcom - Design & Web' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Ketepatan Waktu Penyelesaian Desain dan Web', 'bobot' => 25, 'target' => '≥95% task selesai sesuai SLA', 'tiers' => [
                ['label' => 'Capaian ≥95% task selesai sesuai SLA', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Produktivitas Output Desain Digital', 'bobot' => 20, 'target' => '≥100% target output bulanan tercapai', 'tiers' => [
                ['label' => 'Capaian ≥100%', 'skor' => 2],
                ['label' => 'Capaian 85%–99%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Kualitas dan Konsistensi Visual Brand', 'bobot' => 15, 'target' => '≥90% output lolos tanpa major revisi', 'tiers' => [
                ['label' => 'Capaian ≥90%', 'skor' => 2],
                ['label' => 'Capaian 80%–89%', 'skor' => 1],
                ['label' => 'Capaian <80%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Penyelesaian Landing Page dan Website', 'bobot' => 15, 'target' => '≥95% LP/website selesai, live, dan berfungsi sesuai brief', 'tiers' => [
                ['label' => 'Capaian ≥95%', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Dukungan Visual terhadap Campaign Marketing', 'bobot' => 10, 'target' => '≥95% kebutuhan visual campaign selesai sesuai timeline', 'tiers' => [
                ['label' => 'Capaian ≥95%', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Improvement Desain dan Tampilan Digital', 'bobot' => 10, 'target' => '≥4 improvement visual/UI actionable per bulan', 'tiers' => [
                ['label' => 'Capaian ≥4 improvement', 'skor' => 2],
                ['label' => 'Capaian 2–3 improvement', 'skor' => 1],
                ['label' => 'Capaian <2 improvement', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Riset Kompetitor dan Implementasi Insight Visual', 'bobot' => 5, 'target' => '≥3 insight visual kompetitor diimplementasikan per bulan', 'tiers' => [
                ['label' => 'Capaian ≥3 insight', 'skor' => 2],
                ['label' => 'Capaian 1–2 insight', 'skor' => 1],
                ['label' => 'Capaian 0 insight', 'skor' => 0],
            ]],
        ],
    ],
    'Staff Marcom - Social Media Content' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Disiplin Eksekusi dan Publikasi Konten Media Sosial', 'bobot' => 25, 'target' => 'Posting sesuai tanggal & jam Content Calendar Approved', 'tiers' => [
                ['label' => '≥ 95% on-time', 'skor' => 2],
                ['label' => '85-94%', 'skor' => 1],
                ['label' => '<85%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Kinerja Engagement Konten di Media Sosial', 'bobot' => 20, 'target' => 'Kualitas konten yang diproduksi', 'tiers' => [
                ['label' => '≥5%', 'skor' => 2],
                ['label' => '3-4.9%', 'skor' => 1],
                ['label' => '<3%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Dukungan Konten terhadap Campaign Marketing', 'bobot' => 15, 'target' => 'SLA = deadline pada task tracker', 'tiers' => [
                ['label' => '≥ 95% on-time', 'skor' => 2],
                ['label' => '85-94%', 'skor' => 1],
                ['label' => '<85%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Ketepatan Perencanaan dan Kalender Konten', 'bobot' => 15, 'target' => 'H-3 Completed + Approved', 'tiers' => [
                ['label' => 'H-3 Kalender Selesai', 'skor' => 2],
                ['label' => 'H-1', 'skor' => 1],
                ['label' => 'Tidak Selesai', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Analisis Insight dan Optimalisasi Performa Media Sosial', 'bobot' => 10, 'target' => 'Kemampuan membaca data performa', 'tiers' => [
                ['label' => '≥4 insight actionable / bulan', 'skor' => 2],
                ['label' => '2-3 insight', 'skor' => 1],
                ['label' => '<1', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Dukungan Lintas Tim dan Ketepatan Respons Pekerjaan', 'bobot' => 10, 'target' => 'Support kebutuhan Marcom Team', 'tiers' => [
                ['label' => '≥ 95% on-time', 'skor' => 2],
                ['label' => '85-94%', 'skor' => 1],
                ['label' => '<85%', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Pertumbuhan Audiens Media Sosial', 'bobot' => 5, 'target' => 'Pertumbuhan follower (bulan berjalan vs sebelumnya)', 'tiers' => [
                ['label' => '≥8%', 'skor' => 2],
                ['label' => '4-7%', 'skor' => 1],
                ['label' => '<4%', 'skor' => 0],
            ]],
        ],
    ],
    'Staff Marcom - Photo & Video Production' => [
        'kpis' => [
            ['id' => 'k1', 'nama' => 'Ketepatan Waktu Produksi Foto & Video', 'bobot' => 25, 'target' => 'SLA: Foto produk 1 hr, Reel 1 hr, Video campaign 2 hr, Recap event 2 hr, Dok. mentah H+1', 'tiers' => [
                ['label' => 'Capaian ≥95% task selesai sesuai SLA', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian < 85%', 'skor' => 0],
            ]],
            ['id' => 'k2', 'nama' => 'Kualitas Visual dan Kepatuhan terhadap Brief', 'bobot' => 20, 'target' => 'Sesuai brief, brand guideline, tanpa revisi major', 'tiers' => [
                ['label' => 'Capaian ≥90% tanpa major revisi', 'skor' => 2],
                ['label' => 'Capaian 80%–89%', 'skor' => 1],
                ['label' => 'Capaian < 80%', 'skor' => 0],
            ]],
            ['id' => 'k3', 'nama' => 'Output Konten Visual untuk Campaign & Media Sosial', 'bobot' => 20, 'target' => '78 video final/bulan, 30 foto final/bulan', 'tiers' => [
                ['label' => 'Capaian ≥100% dari target output bulanan', 'skor' => 2],
                ['label' => 'Capaian 85 - 99%', 'skor' => 1],
                ['label' => 'Capaian < 85%', 'skor' => 0],
            ]],
            ['id' => 'k4', 'nama' => 'Dokumentasi Event dan Ketepatan Materi Pasca-Event', 'bobot' => 15, 'target' => 'Highlight/recap max H+2, file mentah max H+1', 'tiers' => [
                ['label' => 'Capaian ≥95% event terdokumentasi lengkap & on-time', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
            ['id' => 'k5', 'nama' => 'Produktivitas Pengambilan Konten (Take Content)', 'bobot' => 10, 'target' => '78 Take Content Final', 'tiers' => [
                ['label' => 'Capaian ≥100% target sesi terlaksana', 'skor' => 2],
                ['label' => 'Capaian 85%–99%', 'skor' => 1],
                ['label' => 'Capaian < 85%', 'skor' => 0],
            ]],
            ['id' => 'k6', 'nama' => 'Riset Referensi Visual Kompetitor dan Insight Produksi', 'bobot' => 5, 'target' => 'Total insight referensi & usulan penerapan ke EPI', 'tiers' => [
                ['label' => 'Capaian ≥4 insight visual usable/bulan', 'skor' => 2],
                ['label' => 'Capaian 2-3 insight', 'skor' => 1],
                ['label' => 'Capaian <2 insight', 'skor' => 0],
            ]],
            ['id' => 'k7', 'nama' => 'Manajemen Arsip Aset Foto & Video', 'bobot' => 5, 'target' => 'Aset tersimpan sesuai standar', 'tiers' => [
                ['label' => 'Capaian ≥95% aset tertata sesuai standar', 'skor' => 2],
                ['label' => 'Capaian 85%–94%', 'skor' => 1],
                ['label' => 'Capaian <85%', 'skor' => 0],
            ]],
        ],
    ],
];
