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
            username VARCHAR(64) NULL UNIQUE,
            email VARCHAR(255) NULL UNIQUE,
            password_hash VARCHAR(255) NULL,
            account_role VARCHAR(20) NOT NULL DEFAULT 'staff',
            posisi VARCHAR(255) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            pin VARCHAR(32) NULL UNIQUE,
            pin_hash VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            evaluator_user_id INT NULL,
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS assessment_assignments (
            evaluator_id INT NOT NULL,
            subject_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (evaluator_id, subject_id),
            FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_answers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_id INT NOT NULL,
            kpi_id VARCHAR(32) NOT NULL,
            tier INT NOT NULL,
            calculated_tier INT NULL,
            final_tier INT NULL,
            actual_value DECIMAL(15,4) NULL,
            actual_data_json LONGTEXT NULL,
            link TEXT DEFAULT '',
            evidence_notes TEXT NULL,
            evidence_checklist_json LONGTEXT NULL,
            achievement_note TEXT NULL,
            decision_reason TEXT NULL,
            coaching_note TEXT NULL,
            evidence_status VARCHAR(32) NOT NULL DEFAULT 'not_required',
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_answer_evidences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_answer_id INT NOT NULL,
            requirement_id VARCHAR(64) NOT NULL,
            requirement_label VARCHAR(255) NOT NULL,
            expected_format VARCHAR(255) NOT NULL DEFAULT '',
            evidence_url TEXT NULL,
            submitted_note TEXT NULL,
            is_submitted TINYINT(1) NOT NULL DEFAULT 0,
            is_verified TINYINT(1) NOT NULL DEFAULT 0,
            verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
            verifier_note TEXT NULL,
            verified_by INT NULL,
            verified_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_answer_requirement (submission_answer_id, requirement_id),
            FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE CASCADE,
            FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_id INT NOT NULL,
            submission_answer_id INT NULL,
            actor_user_id INT NULL,
            event VARCHAR(100) NOT NULL,
            old_value LONGTEXT NULL,
            new_value LONGTEXT NULL,
            note TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE SET NULL,
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
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
    ensureAppSchema($pdo, true);
    fwrite(STDOUT, "Database schema is ready.\n");
} catch (Throwable $ex) {
    fwrite(STDERR, "Migration failed: {$ex->getMessage()}\n");
    exit(1);
}
