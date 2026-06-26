<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "This schema check may only be run from the CLI.\n";
    exit(1);
}

require_once dirname(__DIR__) . '/db.php';

function line(string $status, string $message): void
{
    echo $status . ' ' . $message . PHP_EOL;
}

function quoteIdentifierForCheck(string $identifier): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
        throw new RuntimeException('Unsafe identifier: ' . $identifier);
    }

    return '`' . $identifier . '`';
}

function checkTableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->query('SHOW TABLES LIKE ' . $pdo->quote($table));
    $exists = (bool) $stmt->fetchColumn();
    line($exists ? 'PASS' : 'FAIL', "table {$table}");

    return $exists;
}

function checkColumnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->query('SHOW COLUMNS FROM ' . quoteIdentifierForCheck($table) . ' LIKE ' . $pdo->quote($column));
    $exists = (bool) $stmt->fetch();
    line($exists ? 'PASS' : 'FAIL', "column {$table}.{$column}");

    return $exists;
}

function checkForeignKey(PDO $pdo, string $table, string $column, string $targetTable, string $targetColumn): bool
{
    $stmt = $pdo->prepare(
        "SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
           AND REFERENCED_TABLE_NAME = ?
           AND REFERENCED_COLUMN_NAME = ?
         LIMIT 1"
    );
    $stmt->execute([$table, $column, $targetTable, $targetColumn]);
    $exists = (bool) $stmt->fetchColumn();
    line($exists ? 'PASS' : 'FAIL', "foreign key {$table}.{$column} -> {$targetTable}.{$targetColumn}");

    return $exists;
}

try {
    $pdo = getDb();
    $ok = true;

    $requiredTables = [
        'users',
        'submissions',
        'submission_answers',
        'submission_answer_actual_data',
        'submission_answer_evidences',
        'submission_audit_logs',
    ];
    $existingTables = [];
    foreach ($requiredTables as $table) {
        $existingTables[$table] = checkTableExists($pdo, $table);
        $ok = $existingTables[$table] && $ok;
    }

    $columnsByTable = [
        'submission_answers' => [
            'calculated_tier',
            'final_tier',
            'achievement_note',
            'decision_reason',
            'coaching_note',
            'evidence_status',
            'actual_data_status',
        ],
        'submission_answer_evidences' => [
            'id',
            'submission_answer_id',
            'requirement_id',
            'requirement_label',
            'expected_format',
            'evidence_url',
            'submitted_note',
            'is_submitted',
            'is_verified',
            'verification_status',
            'verifier_note',
            'verified_by',
            'verified_at',
            'created_at',
        ],
        'submission_answer_actual_data' => [
            'id',
            'submission_answer_id',
            'field_id',
            'field_label',
            'field_type',
            'field_unit',
            'sort_order',
            'is_required',
            'source_required',
            'data_date_required',
            'verification_required',
            'used_as_actual_value',
            'value_text',
            'value_number',
            'value_date',
            'source_document',
            'data_date',
            'submitted_note',
            'verification_status',
            'verifier_note',
            'verified_by',
            'verified_at',
            'created_at',
        ],
        'submission_audit_logs' => [
            'id',
            'submission_id',
            'submission_answer_id',
            'actor_user_id',
            'event',
            'old_value',
            'new_value',
            'note',
            'created_at',
        ],
    ];

    foreach ($columnsByTable as $table => $columns) {
        if (!($existingTables[$table] ?? false)) {
            continue;
        }
        foreach ($columns as $column) {
            $ok = checkColumnExists($pdo, $table, $column) && $ok;
        }
    }

    if ($existingTables['submission_answer_actual_data'] ?? false) {
        $ok = checkForeignKey($pdo, 'submission_answer_actual_data', 'submission_answer_id', 'submission_answers', 'id') && $ok;
        $ok = checkForeignKey($pdo, 'submission_answer_actual_data', 'verified_by', 'users', 'id') && $ok;
    }
    if ($existingTables['submission_answer_evidences'] ?? false) {
        $ok = checkForeignKey($pdo, 'submission_answer_evidences', 'submission_answer_id', 'submission_answers', 'id') && $ok;
        $ok = checkForeignKey($pdo, 'submission_answer_evidences', 'verified_by', 'users', 'id') && $ok;
    }
    if ($existingTables['submission_audit_logs'] ?? false) {
        $ok = checkForeignKey($pdo, 'submission_audit_logs', 'submission_id', 'submissions', 'id') && $ok;
        $ok = checkForeignKey($pdo, 'submission_audit_logs', 'submission_answer_id', 'submission_answers', 'id') && $ok;
        $ok = checkForeignKey($pdo, 'submission_audit_logs', 'actor_user_id', 'users', 'id') && $ok;
    }

    if (!$ok) {
        line('FAIL', 'Phase 4 schema is incomplete.');
        exit(1);
    }

    line('PASS', 'Phase 4 schema is ready.');
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Schema check failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
