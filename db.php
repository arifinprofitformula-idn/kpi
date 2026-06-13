<?php
require_once __DIR__ . '/config.php';

function getDb(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function ensureAppSchema(?PDO $pdo = null): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    $pdo = $pdo ?? getDb();
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
    $actualValueColumn = $pdo->query("SHOW COLUMNS FROM submission_answers LIKE 'actual_value'")->fetch();
    if (!$actualValueColumn) {
        $pdo->exec('ALTER TABLE submission_answers ADD actual_value DECIMAL(15,4) NULL AFTER tier');
    }

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
        $skor = $answer['tier'] ?? 0;
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
