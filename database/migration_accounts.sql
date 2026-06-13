SET NAMES utf8mb4;

ALTER TABLE users
    ADD COLUMN username VARCHAR(64) NULL UNIQUE AFTER name,
    ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER username,
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,
    ADD COLUMN account_role VARCHAR(20) NOT NULL DEFAULT 'staff' AFTER password_hash,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER posisi;

ALTER TABLE submissions
    ADD COLUMN evaluator_user_id INT NULL AFTER user_id,
    ADD CONSTRAINT fk_submissions_evaluator
        FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE assessment_assignments (
    evaluator_id INT NOT NULL,
    subject_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (evaluator_id, subject_id),
    CONSTRAINT fk_assessment_evaluator
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assessment_subject
        FOREIGN KEY (subject_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
