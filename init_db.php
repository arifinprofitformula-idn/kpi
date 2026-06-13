<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo = getDb();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            posisi VARCHAR(255) NOT NULL,
            pin VARCHAR(32) NULL UNIQUE,
            pin_hash VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            nama VARCHAR(255) NOT NULL,
            posisi VARCHAR(255) NOT NULL,
            periode VARCHAR(64) NOT NULL,
            tanggal VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'Pending',
            kehadiran_sakit INT NOT NULL DEFAULT 0,
            kehadiran_izin INT NOT NULL DEFAULT 0,
            kehadiran_alpa INT NOT NULL DEFAULT 0,
            kehadiran_cuti INT NOT NULL DEFAULT 0,
            score_kpi DECIMAL(5,2) NOT NULL DEFAULT 0,
            pct_kpi DECIMAL(5,2) NOT NULL DEFAULT 0,
            pct_kehadiran DECIMAL(5,2) NOT NULL DEFAULT 0,
            final_achievement DECIMAL(5,2) NOT NULL DEFAULT 0,
            catatan TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_answers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_id INT NOT NULL,
            kpi_id VARCHAR(32) NOT NULL,
            tier INT NOT NULL,
            actual_value DECIMAL(15,4) NULL,
            link TEXT DEFAULT '',
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS auth_login_attempts (
            identifier CHAR(64) PRIMARY KEY,
            attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            window_started INT UNSIGNED NOT NULL,
            blocked_until INT UNSIGNED NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    ensureAppSchema($pdo);
    fwrite(STDOUT, "Database schema is ready.\n");
} catch (Throwable $ex) {
    fwrite(STDERR, "Migration failed: {$ex->getMessage()}\n");
    exit(1);
}
