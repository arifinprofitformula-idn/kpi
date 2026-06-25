SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submissions (
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
    CONSTRAINT fk_submissions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_submissions_evaluator
        FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assessment_assignments (
    evaluator_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (evaluator_id, subject_id),
    CONSTRAINT fk_assessment_evaluator
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_subject
        FOREIGN KEY (subject_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submission_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    kpi_id VARCHAR(32) NOT NULL,
    tier INT NOT NULL,
    calculated_tier INT NULL,
    final_tier INT NULL,
    actual_value DECIMAL(15,4) NULL,
    link TEXT DEFAULT '',
    evidence_notes TEXT NULL,
    evidence_checklist_json LONGTEXT NULL,
    achievement_note TEXT NULL,
    decision_reason TEXT NULL,
    coaching_note TEXT NULL,
    evidence_status VARCHAR(32) NOT NULL DEFAULT 'not_required',
    CONSTRAINT fk_submission_answers_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submission_answer_evidences (
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
    CONSTRAINT fk_answer_evidence_answer
        FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE CASCADE,
    CONSTRAINT fk_answer_evidence_verifier
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submission_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    submission_answer_id INT NULL,
    actor_user_id INT NULL,
    event VARCHAR(100) NOT NULL,
    old_value LONGTEXT NULL,
    new_value LONGTEXT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission_audit_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_audit_answer
        FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE SET NULL,
    CONSTRAINT fk_submission_audit_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submission_definition_snapshots (
    submission_id INT PRIMARY KEY,
    definition_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_definition_snapshots_submission
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_login_attempts (
    identifier CHAR(64) PRIMARY KEY,
    attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    window_started INT UNSIGNED NOT NULL,
    blocked_until INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
