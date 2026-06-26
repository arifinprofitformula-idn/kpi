<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "This migration may only be run from the CLI.\n";
    exit(1);
}

require_once dirname(__DIR__) . '/db.php';

function out(string $message): void
{
    echo $message . PHP_EOL;
}

function quoteIdentifier(string $identifier): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
        throw new RuntimeException('Unsafe identifier: ' . $identifier);
    }

    return '`' . $identifier . '`';
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->query('SHOW TABLES LIKE ' . $pdo->quote($table));

    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $pdo, string $table, string $column): bool
{
    if (!tableExists($pdo, $table)) {
        return false;
    }

    $stmt = $pdo->query('SHOW COLUMNS FROM ' . quoteIdentifier($table) . ' LIKE ' . $pdo->quote($column));

    return (bool) $stmt->fetch();
}

function addColumnIfMissing(PDO $pdo, string $table, string $column, string $definition, ?string $after = null): void
{
    if (columnExists($pdo, $table, $column)) {
        out("OK column exists: {$table}.{$column}");
        return;
    }

    $sql = 'ALTER TABLE ' . quoteIdentifier($table) . ' ADD ' . quoteIdentifier($column) . ' ' . $definition;
    if ($after !== null && columnExists($pdo, $table, $after)) {
        $sql .= ' AFTER ' . quoteIdentifier($after);
    }
    $pdo->exec($sql);
    out("ADDED column: {$table}.{$column}");
}

function foreignKeyExists(PDO $pdo, string $table, string $column, string $referencedTable): bool
{
    $stmt = $pdo->prepare(
        "SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
           AND REFERENCED_TABLE_NAME = ?
         LIMIT 1"
    );
    $stmt->execute([$table, $column, $referencedTable]);

    return (bool) $stmt->fetchColumn();
}

function constraintExists(PDO $pdo, string $constraintName): bool
{
    $stmt = $pdo->prepare(
        "SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND CONSTRAINT_NAME = ?
         LIMIT 1"
    );
    $stmt->execute([$constraintName]);

    return (bool) $stmt->fetchColumn();
}

function primaryKeyExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        "SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND CONSTRAINT_TYPE = 'PRIMARY KEY'
         LIMIT 1"
    );
    $stmt->execute([$table]);

    return (bool) $stmt->fetchColumn();
}

function ensureIdPrimaryColumn(PDO $pdo, string $table): void
{
    if (columnExists($pdo, $table, 'id')) {
        out("OK column exists: {$table}.id");
        return;
    }

    if (primaryKeyExists($pdo, $table)) {
        throw new RuntimeException("Table {$table} has a primary key but no id column. Manual review is required.");
    }

    $pdo->exec('ALTER TABLE ' . quoteIdentifier($table) . ' ADD id INT AUTO_INCREMENT PRIMARY KEY FIRST');
    out("ADDED column: {$table}.id");
}

function safeConstraintName(PDO $pdo, string $preferred): string
{
    if (!constraintExists($pdo, $preferred)) {
        return $preferred;
    }

    for ($i = 2; $i <= 20; $i++) {
        $candidate = $preferred . '_' . $i;
        if (!constraintExists($pdo, $candidate)) {
            return $candidate;
        }
    }

    throw new RuntimeException('Unable to allocate safe constraint name for ' . $preferred);
}

function addForeignKeyIfMissing(
    PDO $pdo,
    string $table,
    string $column,
    string $referencedTable,
    string $referencedColumn,
    string $onDelete,
    string $preferredConstraint
): void {
    if (foreignKeyExists($pdo, $table, $column, $referencedTable)) {
        out("OK foreign key exists: {$table}.{$column} -> {$referencedTable}.{$referencedColumn}");
        return;
    }

    if (!tableExists($pdo, $referencedTable)) {
        throw new RuntimeException("Cannot add foreign key because table {$referencedTable} is missing.");
    }

    $constraint = safeConstraintName($pdo, $preferredConstraint);
    $pdo->exec(
        'ALTER TABLE ' . quoteIdentifier($table)
        . ' ADD CONSTRAINT ' . quoteIdentifier($constraint)
        . ' FOREIGN KEY (' . quoteIdentifier($column) . ')'
        . ' REFERENCES ' . quoteIdentifier($referencedTable) . '(' . quoteIdentifier($referencedColumn) . ')'
        . ' ON DELETE ' . $onDelete
    );
    out("ADDED foreign key: {$constraint}");
}

function ensureEvidenceTable(PDO $pdo): void
{
    if (tableExists($pdo, 'submission_answer_evidences')) {
        out('OK table exists: submission_answer_evidences');
        return;
    }

    $pdo->exec(
        "CREATE TABLE submission_answer_evidences (
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
    out('CREATED table: submission_answer_evidences');
}

function ensureActualDataTable(PDO $pdo): void
{
    if (tableExists($pdo, 'submission_answer_actual_data')) {
        out('OK table exists: submission_answer_actual_data');
        return;
    }

    $pdo->exec(
        "CREATE TABLE submission_answer_actual_data (
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
    out('CREATED table: submission_answer_actual_data');
}

function ensureAuditLogTable(PDO $pdo): void
{
    if (tableExists($pdo, 'submission_audit_logs')) {
        out('OK table exists: submission_audit_logs');
        return;
    }

    $pdo->exec(
        "CREATE TABLE submission_audit_logs (
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
    out('CREATED table: submission_audit_logs');
}

try {
    out('Phase 4 Actual Data migration started.');
    $pdo = getDb();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    out('Running application schema bootstrap with force=true.');
    try {
        ensureAppSchema($pdo, true);
    } catch (Throwable $bootstrapError) {
        out('WARN application schema bootstrap reported: ' . $bootstrapError->getMessage());
        out('Continuing with targeted Phase 4 idempotent schema checks.');
    }

    foreach (['users', 'submissions', 'submission_answers'] as $baseTable) {
        if (!tableExists($pdo, $baseTable)) {
            throw new RuntimeException("Required base table is missing: {$baseTable}");
        }
        out("OK base table exists: {$baseTable}");
    }

    addColumnIfMissing($pdo, 'submission_answers', 'calculated_tier', 'INT NULL', 'tier');
    addColumnIfMissing($pdo, 'submission_answers', 'final_tier', 'INT NULL', 'calculated_tier');
    addColumnIfMissing($pdo, 'submission_answers', 'actual_data_status', "VARCHAR(32) NOT NULL DEFAULT 'not_required'", 'actual_data_json');
    addColumnIfMissing($pdo, 'submission_answers', 'achievement_note', 'TEXT NULL', 'evidence_checklist_json');
    addColumnIfMissing($pdo, 'submission_answers', 'decision_reason', 'TEXT NULL', 'achievement_note');
    addColumnIfMissing($pdo, 'submission_answers', 'coaching_note', 'TEXT NULL', 'decision_reason');
    addColumnIfMissing($pdo, 'submission_answers', 'evidence_status', "VARCHAR(32) NOT NULL DEFAULT 'not_required'", 'coaching_note');

    ensureEvidenceTable($pdo);
    ensureIdPrimaryColumn($pdo, 'submission_answer_evidences');
    addColumnIfMissing($pdo, 'submission_answer_evidences', 'is_verified', 'TINYINT(1) NOT NULL DEFAULT 0', 'is_submitted');
    addColumnIfMissing($pdo, 'submission_answer_evidences', 'verification_status', "VARCHAR(32) NOT NULL DEFAULT 'pending'", 'is_verified');
    addColumnIfMissing($pdo, 'submission_answer_evidences', 'verifier_note', 'TEXT NULL', 'verification_status');
    addColumnIfMissing($pdo, 'submission_answer_evidences', 'verified_by', 'INT NULL', 'verifier_note');
    addColumnIfMissing($pdo, 'submission_answer_evidences', 'verified_at', 'TIMESTAMP NULL', 'verified_by');
    addForeignKeyIfMissing($pdo, 'submission_answer_evidences', 'submission_answer_id', 'submission_answers', 'id', 'CASCADE', 'fk_answer_evidence_answer');
    addForeignKeyIfMissing($pdo, 'submission_answer_evidences', 'verified_by', 'users', 'id', 'SET NULL', 'fk_answer_evidence_verifier');

    ensureActualDataTable($pdo);
    ensureIdPrimaryColumn($pdo, 'submission_answer_actual_data');
    $actualColumns = [
        'submission_answer_id' => ['INT NOT NULL', null],
        'field_id' => ['VARCHAR(64) NOT NULL', 'submission_answer_id'],
        'field_label' => ['VARCHAR(255) NOT NULL', 'field_id'],
        'field_type' => ["VARCHAR(32) NOT NULL DEFAULT 'text'", 'field_label'],
        'field_unit' => ['VARCHAR(64) NULL', 'field_type'],
        'sort_order' => ['INT NOT NULL DEFAULT 0', 'field_unit'],
        'is_required' => ['TINYINT(1) NOT NULL DEFAULT 0', 'sort_order'],
        'source_required' => ['TINYINT(1) NOT NULL DEFAULT 0', 'is_required'],
        'data_date_required' => ['TINYINT(1) NOT NULL DEFAULT 0', 'source_required'],
        'verification_required' => ['TINYINT(1) NOT NULL DEFAULT 1', 'data_date_required'],
        'used_as_actual_value' => ['TINYINT(1) NOT NULL DEFAULT 0', 'verification_required'],
        'value_text' => ['TEXT NULL', 'used_as_actual_value'],
        'value_number' => ['DECIMAL(18,4) NULL', 'value_text'],
        'value_date' => ['DATE NULL', 'value_number'],
        'source_document' => ['TEXT NULL', 'value_date'],
        'data_date' => ['DATE NULL', 'source_document'],
        'submitted_note' => ['TEXT NULL', 'data_date'],
        'verification_status' => ["VARCHAR(32) NOT NULL DEFAULT 'pending'", 'submitted_note'],
        'verifier_note' => ['TEXT NULL', 'verification_status'],
        'verified_by' => ['INT NULL', 'verifier_note'],
        'verified_at' => ['TIMESTAMP NULL', 'verified_by'],
        'created_at' => ['TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'verified_at'],
    ];
    foreach ($actualColumns as $column => [$definition, $after]) {
        addColumnIfMissing($pdo, 'submission_answer_actual_data', $column, $definition, $after);
    }
    addForeignKeyIfMissing($pdo, 'submission_answer_actual_data', 'submission_answer_id', 'submission_answers', 'id', 'CASCADE', 'fk_answer_actual_data_answer');
    addForeignKeyIfMissing($pdo, 'submission_answer_actual_data', 'verified_by', 'users', 'id', 'SET NULL', 'fk_answer_actual_data_verifier');

    ensureAuditLogTable($pdo);
    ensureIdPrimaryColumn($pdo, 'submission_audit_logs');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'submission_id', 'INT NOT NULL', 'id');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'submission_answer_id', 'INT NULL', 'submission_id');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'actor_user_id', 'INT NULL', 'submission_answer_id');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'event', 'VARCHAR(100) NOT NULL', 'actor_user_id');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'old_value', 'LONGTEXT NULL', 'event');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'new_value', 'LONGTEXT NULL', 'old_value');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'note', 'TEXT NULL', 'new_value');
    addColumnIfMissing($pdo, 'submission_audit_logs', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'note');
    addForeignKeyIfMissing($pdo, 'submission_audit_logs', 'submission_id', 'submissions', 'id', 'CASCADE', 'fk_submission_audit_submission');
    addForeignKeyIfMissing($pdo, 'submission_audit_logs', 'submission_answer_id', 'submission_answers', 'id', 'SET NULL', 'fk_submission_audit_answer');
    addForeignKeyIfMissing($pdo, 'submission_audit_logs', 'actor_user_id', 'users', 'id', 'SET NULL', 'fk_submission_audit_actor');

    out('Phase 4 Actual Data migration completed successfully.');
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
