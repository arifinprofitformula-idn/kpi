<?php
require_once __DIR__ . '/config.php';

function getDb(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_PORT,
        DB_NAME
    );
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::ATTR_TIMEOUT => 5,
    ]);

    return $pdo;
}

function ensureAppSchema(?PDO $pdo = null, bool $force = false): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    $pdo = $pdo ?? getDb();
    if (!ALLOW_SCHEMA_MIGRATIONS && !$force) {
        $ready = true;
        return;
    }

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
        "CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_definition_snapshots (
            submission_id INT PRIMARY KEY,
            definition_json LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    $userColumns = [
        'username' => "ALTER TABLE users ADD username VARCHAR(64) NULL UNIQUE AFTER name",
        'email' => "ALTER TABLE users ADD email VARCHAR(255) NULL UNIQUE AFTER username",
        'password_hash' => "ALTER TABLE users ADD password_hash VARCHAR(255) NULL AFTER email",
        'account_role' => "ALTER TABLE users ADD account_role VARCHAR(20) NOT NULL DEFAULT 'staff' AFTER password_hash",
        'is_active' => "ALTER TABLE users ADD is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER posisi",
    ];
    foreach ($userColumns as $column => $sql) {
        if (!$pdo->query("SHOW COLUMNS FROM users LIKE " . $pdo->quote($column))->fetch()) {
            $pdo->exec($sql);
        }
    }
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS assessment_assignments (
            evaluator_id INT NOT NULL,
            subject_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (evaluator_id, subject_id),
            CONSTRAINT fk_assessment_evaluator
                FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_assessment_subject
                FOREIGN KEY (subject_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    if (!$pdo->query("SHOW COLUMNS FROM submissions LIKE 'evaluator_user_id'")->fetch()) {
        $pdo->exec(
            'ALTER TABLE submissions ADD evaluator_user_id INT NULL AFTER user_id,
             ADD CONSTRAINT fk_submissions_evaluator
             FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL'
        );
    }
    $actualValueColumn = $pdo->query("SHOW COLUMNS FROM submission_answers LIKE 'actual_value'")->fetch();
    if (!$actualValueColumn) {
        $pdo->exec('ALTER TABLE submission_answers ADD actual_value DECIMAL(15,4) NULL AFTER tier');
    }
    if (!$pdo->query("SHOW COLUMNS FROM submission_answers LIKE 'evidence_notes'")->fetch()) {
        $pdo->exec('ALTER TABLE submission_answers ADD evidence_notes TEXT NULL AFTER link');
    }
    if (!$pdo->query("SHOW COLUMNS FROM submission_answers LIKE 'actual_data_json'")->fetch()) {
        $pdo->exec('ALTER TABLE submission_answers ADD actual_data_json LONGTEXT NULL AFTER actual_value');
    }
    if (!$pdo->query("SHOW COLUMNS FROM submission_answers LIKE 'evidence_checklist_json'")->fetch()) {
        $pdo->exec('ALTER TABLE submission_answers ADD evidence_checklist_json LONGTEXT NULL AFTER evidence_notes');
    }
    $answerColumns = [
        'calculated_tier' => 'ALTER TABLE submission_answers ADD calculated_tier INT NULL AFTER tier',
        'final_tier' => 'ALTER TABLE submission_answers ADD final_tier INT NULL AFTER calculated_tier',
        'actual_data_status' => "ALTER TABLE submission_answers ADD actual_data_status VARCHAR(32) NOT NULL DEFAULT 'not_required' AFTER actual_data_json",
        'achievement_note' => 'ALTER TABLE submission_answers ADD achievement_note TEXT NULL AFTER evidence_checklist_json',
        'decision_reason' => 'ALTER TABLE submission_answers ADD decision_reason TEXT NULL AFTER achievement_note',
        'coaching_note' => 'ALTER TABLE submission_answers ADD coaching_note TEXT NULL AFTER decision_reason',
        'evidence_status' => "ALTER TABLE submission_answers ADD evidence_status VARCHAR(32) NOT NULL DEFAULT 'not_required' AFTER coaching_note",
    ];
    foreach ($answerColumns as $column => $sql) {
        if (!$pdo->query("SHOW COLUMNS FROM submission_answers LIKE " . $pdo->quote($column))->fetch()) {
            $pdo->exec($sql);
        }
    }
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
            CONSTRAINT fk_answer_evidence_answer
                FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE CASCADE,
            CONSTRAINT fk_answer_evidence_verifier
                FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS submission_answer_actual_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            submission_answer_id INT NOT NULL,
            field_id VARCHAR(64) NOT NULL,
            field_label VARCHAR(255) NOT NULL,
            field_type VARCHAR(32) NOT NULL DEFAULT 'text',
            field_unit VARCHAR(64) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_required TINYINT(1) NOT NULL DEFAULT 0,
            source_required TINYINT(1) NOT NULL DEFAULT 0,
            data_date_required TINYINT(1) NOT NULL DEFAULT 0,
            verification_required TINYINT(1) NOT NULL DEFAULT 1,
            used_as_actual_value TINYINT(1) NOT NULL DEFAULT 0,
            value_text TEXT NULL,
            value_number DECIMAL(18,4) NULL,
            value_date DATE NULL,
            source_document TEXT NULL,
            data_date DATE NULL,
            submitted_note TEXT NULL,
            verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
            verifier_note TEXT NULL,
            verified_by INT NULL,
            verified_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_answer_actual_data_answer
                FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE CASCADE,
            CONSTRAINT fk_answer_actual_data_verifier
                FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $evidenceColumns = [
        'is_verified' => "ALTER TABLE submission_answer_evidences ADD is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_submitted",
        'verification_status' => "ALTER TABLE submission_answer_evidences ADD verification_status VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER is_verified",
        'verifier_note' => "ALTER TABLE submission_answer_evidences ADD verifier_note TEXT NULL AFTER verification_status",
        'verified_by' => "ALTER TABLE submission_answer_evidences ADD verified_by INT NULL AFTER verifier_note",
        'verified_at' => "ALTER TABLE submission_answer_evidences ADD verified_at TIMESTAMP NULL AFTER verified_by",
    ];
    foreach ($evidenceColumns as $column => $sql) {
        if (!$pdo->query("SHOW COLUMNS FROM submission_answer_evidences LIKE " . $pdo->quote($column))->fetch()) {
            $pdo->exec($sql);
        }
    }
    $verifierFk = $pdo->prepare(
        "SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'submission_answer_evidences'
           AND COLUMN_NAME = 'verified_by'
           AND REFERENCED_TABLE_NAME = 'users'
         LIMIT 1"
    );
    $verifierFk->execute();
    if (!$verifierFk->fetchColumn()) {
        $pdo->exec(
            'ALTER TABLE submission_answer_evidences
             ADD CONSTRAINT fk_answer_evidence_verifier
            FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL'
        );
    }
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
            CONSTRAINT fk_submission_audit_submission
                FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            CONSTRAINT fk_submission_audit_answer
                FOREIGN KEY (submission_answer_id) REFERENCES submission_answers(id) ON DELETE SET NULL,
            CONSTRAINT fk_submission_audit_actor
                FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pinHashColumn = $pdo->query("SHOW COLUMNS FROM users LIKE 'pin_hash'")->fetch();
    if (!$pinHashColumn) {
        $pdo->exec('ALTER TABLE users ADD pin_hash VARCHAR(255) NULL AFTER pin');
    }
    $pinColumn = $pdo->query("SHOW COLUMNS FROM users LIKE 'pin'")->fetch();
    if ($pinColumn && ($pinColumn['Null'] ?? 'NO') !== 'YES') {
        $pdo->exec('ALTER TABLE users MODIFY pin VARCHAR(32) NULL');
    }

    $legacyUsers = $pdo->query(
        "SELECT id, pin FROM users
         WHERE pin IS NOT NULL AND pin != '' AND (pin_hash IS NULL OR pin_hash = '')"
    )->fetchAll();
    if ($legacyUsers !== []) {
        $migratePin = $pdo->prepare('UPDATE users SET pin = NULL, pin_hash = ? WHERE id = ?');
        foreach ($legacyUsers as $legacyUser) {
            $migratePin->execute([
                password_hash((string) $legacyUser['pin'], PASSWORD_DEFAULT),
                (int) $legacyUser['id'],
            ]);
        }
    }

    $admin = $pdo->prepare('SELECT id FROM users WHERE account_role = ? LIMIT 1');
    $admin->execute(['admin']);
    if (!$admin->fetchColumn() && ADMIN_PASSWORD_HASH !== '') {
        $insertAdmin = $pdo->prepare(
            'INSERT INTO users
             (name, username, email, password_hash, account_role, posisi, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)'
        );
        $insertAdmin->execute([
            'Administrator',
            ADMIN_USERNAME,
            ADMIN_EMAIL,
            ADMIN_PASSWORD_HASH,
            'admin',
            'Administrator',
        ]);
    }
    $ready = true;
}

function inferTierRule(string $label, int $score): array
{
    $normalized = str_replace(['–', '—'], '-', trim($label));
    preg_match_all('/(?<![A-Za-z0-9])-?\d+(?:[.,]\d+)?/', $normalized, $matches);
    $numbers = array_map(
        fn ($value) => (float) str_replace(',', '.', $value),
        $matches[0] ?? []
    );

    if (preg_match('/(?:≥|>=)/u', $normalized) && isset($numbers[0])) {
        return ['operator' => 'gte', 'value' => $numbers[0], 'max' => null];
    }
    if (preg_match('/(?:≤|<=)/u', $normalized) && isset($numbers[0])) {
        return ['operator' => 'lte', 'value' => $numbers[0], 'max' => null];
    }
    if (preg_match('/(?:^|\s)>(?![=])/', $normalized) && isset($numbers[0])) {
        return ['operator' => 'gt', 'value' => $numbers[0], 'max' => null];
    }
    if (preg_match('/(?:^|\s)<(?![=])/', $normalized) && isset($numbers[0])) {
        return ['operator' => 'lt', 'value' => $numbers[0], 'max' => null];
    }
    if (
        count($numbers) >= 2
        && preg_match('/\d+(?:[.,]\d+)?\s*(?:%?\s*)-\s*\d/u', $normalized)
    ) {
        return ['operator' => 'between', 'value' => min($numbers[0], $numbers[1]), 'max' => max($numbers[0], $numbers[1])];
    }
    if (isset($numbers[0]) && preg_match('/stagnan/i', $normalized)) {
        return ['operator' => 'eq', 'value' => $numbers[0], 'max' => null];
    }
    if (isset($numbers[0])) {
        return ['operator' => $score === 0 ? 'lte' : 'gte', 'value' => $numbers[0], 'max' => null];
    }

    return ['operator' => 'eq', 'value' => (float) $score, 'max' => null];
}

function inferAndNormalizeKpiRules(array $definitions): array
{
    foreach ($definitions as &$definition) {
        foreach ($definition['kpis'] as &$kpi) {
            $formulaText = strtolower(
                ($kpi['target'] ?? '') . ' ' . implode(' ', array_column($kpi['tiers'], 'label'))
            );
            $kpi['unit'] = match (true) {
                str_contains($formulaText, '%') => '%',
                str_contains($formulaText, 'rp') => 'Rp',
                str_contains($formulaText, 'menit') => 'menit',
                str_contains($formulaText, 'hari') || str_contains($formulaText, 'h+') || str_contains($formulaText, 'h-') => 'hari',
                str_contains($formulaText, 'improvement') => 'improvement',
                str_contains($formulaText, 'insight') => 'insight',
                str_contains($formulaText, 'kolaborasi') => 'kolaborasi',
                str_contains($formulaText, 'stagnan') => 'varian stagnan',
                default => 'angka',
            };
            foreach ($kpi['tiers'] as &$tier) {
                $tier['rule'] = inferTierRule((string) $tier['label'], (int) $tier['skor']);
            }
            unset($tier);

            $byScore = [];
            foreach ($kpi['tiers'] as $index => $tier) {
                $byScore[(int) $tier['skor']] = $index;
            }
            if (!isset($byScore[2], $byScore[1], $byScore[0])) {
                continue;
            }

            $highRule = &$kpi['tiers'][$byScore[2]]['rule'];
            $middleRule = &$kpi['tiers'][$byScore[1]]['rule'];
            $lowRule = &$kpi['tiers'][$byScore[0]]['rule'];

            if (in_array($highRule['operator'], ['gte', 'gt'], true)) {
                if ($middleRule['operator'] === 'between' && $middleRule['max'] < $highRule['value']) {
                    $middleRule['max'] = $highRule['value'];
                }
                $middleFloor = $middleRule['operator'] === 'between'
                    ? $middleRule['value']
                    : ($middleRule['operator'] === 'gte' ? $middleRule['value'] : null);
                if ($middleFloor !== null && in_array($lowRule['operator'], ['gt', 'gte'], true)) {
                    $lowRule = ['operator' => 'lt', 'value' => $middleFloor, 'max' => null];
                } elseif (
                    $middleFloor !== null
                    && in_array($lowRule['operator'], ['lt', 'lte'], true)
                    && $lowRule['value'] < $middleFloor
                ) {
                    $lowRule = ['operator' => 'lt', 'value' => $middleFloor, 'max' => null];
                }
            } elseif (in_array($highRule['operator'], ['lte', 'lt'], true)) {
                if ($middleRule['operator'] === 'between' && $middleRule['value'] > $highRule['value']) {
                    $middleRule['value'] = $highRule['value'];
                }
                $middleCeiling = $middleRule['operator'] === 'between'
                    ? $middleRule['max']
                    : ($middleRule['operator'] === 'lte' ? $middleRule['value'] : null);
                if ($middleCeiling !== null && in_array($lowRule['operator'], ['lt', 'lte'], true)) {
                    $lowRule = ['operator' => 'gt', 'value' => $middleCeiling, 'max' => null];
                } elseif (
                    $middleCeiling !== null
                    && in_array($lowRule['operator'], ['gt', 'gte'], true)
                    && $lowRule['value'] > $middleCeiling
                ) {
                    $lowRule = ['operator' => 'gt', 'value' => $middleCeiling, 'max' => null];
                }
            } elseif ($highRule['operator'] === 'eq' && $middleRule['operator'] === 'eq') {
                $lowRule = [
                    'operator' => 'gte',
                    'value' => max($highRule['value'], $middleRule['value']) + 1,
                    'max' => null,
                ];
            }
            unset($highRule, $middleRule, $lowRule);
        }
        unset($kpi);
    }
    unset($definition);
    return $definitions;
}

function enrichKpiDefinitions(array $definitions): array
{
    foreach ($definitions as $positionName => $definition) {
        $kpis = $definition['kpis'] ?? [];
        foreach ($kpis as $kpiIndex => $kpi) {
            $kpi['unit'] = trim((string) ($kpi['unit'] ?? '%')) ?: '%';
            $rawEvidenceChecklist = is_array($kpi['evidenceChecklist'] ?? null) ? $kpi['evidenceChecklist'] : [];
            $evidenceChecklist = [];
            foreach ($rawEvidenceChecklist as $item) {
                $item = trim((string) $item);
                if ($item !== '') {
                    $evidenceChecklist[] = $item;
                }
            }
            $kpi['evidenceChecklist'] = array_values(array_unique($evidenceChecklist));
            $rawActualDataFields = is_array($kpi['actualDataFields'] ?? null) ? $kpi['actualDataFields'] : [];
            $actualDataFields = [];
            $actualFieldIds = [];
            $actualValueSourceFieldId = '';
            $rawActualValueSourceFieldId = trim((string) ($kpi['actualValueSourceFieldId'] ?? ''));
            $normalizeBool = fn ($value, bool $default = false): bool => filter_var(
                $value,
                FILTER_VALIDATE_BOOL,
                FILTER_NULL_ON_FAILURE
            ) ?? $default;
            foreach ($rawActualDataFields as $fieldIndex => $field) {
                if (!is_array($field)) {
                    continue;
                }
                $fieldId = trim((string) ($field['id'] ?? ''));
                if ($fieldId === '') {
                    $fieldId = 'field_' . ($fieldIndex + 1);
                }
                $fieldId = preg_replace('/[^A-Za-z0-9_-]/', '_', $fieldId) ?: 'field_' . ($fieldIndex + 1);
                if (isset($actualFieldIds[$fieldId])) {
                    continue;
                }
                $label = trim((string) ($field['label'] ?? ''));
                if ($label === '') {
                    continue;
                }
                $type = trim((string) ($field['type'] ?? 'text'));
                if (!in_array($type, ['number', 'percent', 'currency', 'text', 'textarea', 'date', 'url', 'boolean'], true)) {
                    $type = 'text';
                }
                $usedAsActualValue = $normalizeBool($field['usedAsActualValue'] ?? false);
                if ($usedAsActualValue && $actualValueSourceFieldId === '') {
                    $actualValueSourceFieldId = $fieldId;
                } elseif ($usedAsActualValue) {
                    $usedAsActualValue = false;
                }
                $actualFieldIds[$fieldId] = true;
                $actualDataFields[] = [
                    'id' => $fieldId,
                    'label' => $label,
                    'type' => $type,
                    'unit' => trim((string) ($field['unit'] ?? '')),
                    'required' => $normalizeBool($field['required'] ?? false),
                    'sourceRequired' => $normalizeBool($field['sourceRequired'] ?? false),
                    'dataDateRequired' => $normalizeBool($field['dataDateRequired'] ?? false),
                    'verificationRequired' => $normalizeBool($field['verificationRequired'] ?? true, true),
                    'usedAsActualValue' => $usedAsActualValue,
                    'helperText' => trim((string) ($field['helperText'] ?? '')),
                ];
            }
            if ($actualValueSourceFieldId === '' && isset($actualFieldIds[$rawActualValueSourceFieldId])) {
                $actualValueSourceFieldId = $rawActualValueSourceFieldId;
                foreach ($actualDataFields as &$actualDataField) {
                    $actualDataField['usedAsActualValue'] = $actualDataField['id'] === $actualValueSourceFieldId;
                }
                unset($actualDataField);
            }
            $kpi['actualValueSourceFieldId'] = $actualValueSourceFieldId;
            $kpi['actualDataFields'] = $actualDataFields;
            $tiers = $kpi['tiers'] ?? [];
            foreach ($tiers as $tierIndex => $tier) {
                if (!isset($tier['rule']) || !is_array($tier['rule'])) {
                    $tier['rule'] = inferTierRule((string) ($tier['label'] ?? ''), (int) ($tier['skor'] ?? 0));
                }
                $tiers[$tierIndex] = $tier;
            }
            $kpi['tiers'] = $tiers;
            $kpis[$kpiIndex] = $kpi;
        }
        $definition['kpis'] = $kpis;
        $definitions[$positionName] = $definition;
    }
    return $definitions;
}

function getKpiDefinitions(): array
{
    ensureAppSchema();
    $pdo = getDb();
    $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute(['kpi_definitions']);
    $json = $stmt->fetchColumn();
    $definitions = is_string($json) && $json !== '' ? json_decode($json, true) : POSISI_DATA;
    if (!is_array($definitions) || $definitions === []) {
        $definitions = POSISI_DATA;
    }
    foreach (POSISI_DATA as $positionName => $defaultDefinition) {
        if (!isset($definitions[$positionName])) {
            $definitions[$positionName] = $defaultDefinition;
        }
    }

    $versionStmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1');
    $versionStmt->execute(['kpi_formula_version']);
    $formulaVersion = (int) $versionStmt->fetchColumn();
    if ($formulaVersion < 4) {
        $definitions = inferAndNormalizeKpiRules($definitions);
        $json = json_encode($definitions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $saveStmt = $pdo->prepare(
            'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );
        $pdo->beginTransaction();
        try {
            $saveStmt->execute(['kpi_definitions', $json]);
            $saveStmt->execute(['kpi_formula_version', '4']);
            $pdo->commit();
        } catch (Throwable $ex) {
            $pdo->rollBack();
            throw $ex;
        }
    }

    return enrichKpiDefinitions($definitions);
}

function saveKpiDefinitions(array $definitions): void
{
    ensureAppSchema();
    $json = json_encode($definitions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Definisi KPI tidak dapat disimpan.');
    }

    $stmt = getDb()->prepare(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );
    $stmt->execute(['kpi_definitions', $json]);
    $stmt->execute(['kpi_formula_version', '4']);
}

function saveSubmissionDefinitionSnapshot(int $submissionId, array $definition): void
{
    ensureAppSchema();
    $json = json_encode($definition, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Snapshot definisi KPI tidak dapat disimpan.');
    }

    $stmt = getDb()->prepare(
        'INSERT INTO submission_definition_snapshots (submission_id, definition_json) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE definition_json = VALUES(definition_json)'
    );
    $stmt->execute([$submissionId, $json]);
}

function loadSubmissionDefinitionSnapshot(int $submissionId): ?array
{
    ensureAppSchema();
    $stmt = getDb()->prepare(
        'SELECT definition_json FROM submission_definition_snapshots WHERE submission_id = ? LIMIT 1'
    );
    $stmt->execute([$submissionId]);
    $json = $stmt->fetchColumn();
    if (!is_string($json) || $json === '') {
        return null;
    }

    $definition = json_decode($json, true);
    if (!is_array($definition)) {
        return null;
    }

    $enriched = enrichKpiDefinitions(['snapshot' => $definition]);
    return $enriched['snapshot'];
}

function backfillSubmissionDefinitionSnapshots(array $definitions): void
{
    ensureAppSchema();
    $pdo = getDb();
    $stmt = $pdo->query(
        'SELECT s.id, s.posisi
         FROM submissions s
         LEFT JOIN submission_definition_snapshots snapshot ON snapshot.submission_id = s.id
         WHERE snapshot.submission_id IS NULL'
    );

    foreach ($stmt->fetchAll() as $submission) {
        $definition = $definitions[$submission['posisi']] ?? null;
        if (is_array($definition)) {
            saveSubmissionDefinitionSnapshot((int) $submission['id'], $definition);
        }
    }
}

function calcScore(
    string $posisiKey,
    array $kpiAnswers,
    array $kehadiran,
    ?array $definitions = null
): array {
    $definitions = $definitions ?? getKpiDefinitions();
    $def = $definitions[$posisiKey] ?? null;
    if (!$def) {
        return [
            'scoreKPI' => '0.00',
            'pctFromKPI' => '0.0',
            'kehadiranPct' => '0.0',
            'finalAchievement' => '0.0',
        ];
    }

    $totalWeightedScore = 0.0;
    foreach ($def['kpis'] as $kpi) {
        $answer = array_filter($kpiAnswers, fn ($item) => ($item['id'] ?? '') === $kpi['id']);
        $answer = $answer ? array_values($answer)[0] : null;
        $skor = $answer['finalTier'] ?? $answer['final_tier'] ?? $answer['tier'] ?? 0;
        $totalWeightedScore += ($skor * ($kpi['bobot'] / 100.0));
    }

    $scoreKPI = $totalWeightedScore;
    $pctFromKPI = ($scoreKPI / 2.0) * 100.0;
    $kehadiranPct = max(
        0.0,
        100.0 - (($kehadiran['alpa'] ?? 0) * 70.0 / HARI_KERJA * 100.0)
            - (($kehadiran['izin'] ?? 0) * 20.0 / HARI_KERJA * 100.0)
            - (($kehadiran['sakit'] ?? 0) * 10.0 / HARI_KERJA * 100.0)
    );
    $finalAchievement = ($pctFromKPI * 0.5) + ($kehadiranPct * 0.5);

    return [
        'scoreKPI' => number_format($scoreKPI, 2, '.', ''),
        'pctFromKPI' => number_format($pctFromKPI, 1, '.', ''),
        'kehadiranPct' => number_format($kehadiranPct, 1, '.', ''),
        'finalAchievement' => number_format($finalAchievement, 1, '.', ''),
    ];
}

function tierRuleMatches(float $actualValue, array $rule): bool
{
    $operator = $rule['operator'] ?? '';
    $value = (float) ($rule['value'] ?? 0);
    $max = (float) ($rule['max'] ?? 0);

    return match ($operator) {
        'gte' => $actualValue >= $value,
        'gt' => $actualValue > $value,
        'lte' => $actualValue <= $value,
        'lt' => $actualValue < $value,
        'eq' => abs($actualValue - $value) < 0.00001,
        'between' => $actualValue >= min($value, $max) && $actualValue <= max($value, $max),
        default => false,
    };
}

function calculateKpiTier(array $kpi, float $actualValue): ?array
{
    $tiers = $kpi['tiers'] ?? [];
    usort($tiers, fn ($a, $b) => ((int) ($b['skor'] ?? 0)) <=> ((int) ($a['skor'] ?? 0)));
    foreach ($tiers as $tier) {
        if (tierRuleMatches($actualValue, $tier['rule'] ?? [])) {
            return $tier;
        }
    }
    return null;
}
