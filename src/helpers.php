<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

function getPayload(): array
{
    $raw = file_get_contents('php://input', false, null, 0, MAX_REQUEST_BYTES + 1);
    if (!is_string($raw) || $raw === '') {
        jsonResponse(['success' => false, 'error' => 'Payload JSON wajib diisi.'], 400);
    }
    if (strlen($raw) > MAX_REQUEST_BYTES) {
        jsonResponse(['success' => false, 'error' => 'Payload terlalu besar.'], 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(['success' => false, 'error' => 'Payload JSON tidak valid.'], 400);
    }
    return $data;
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $data['csrfToken'] = csrfToken();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getApiKey(): ?string
{
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? null;
    if (!is_string($apiKey)) {
        return null;
    }
    return trim($apiKey);
}

function loginAttemptIdentifier(?string $loginIdentifier = null): string
{
    $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $normalizedLogin = strtolower(trim((string) $loginIdentifier));
    if ($normalizedLogin === '') {
        $normalizedLogin = 'unknown';
    }

    return hash('sha256', $remoteAddress . '|' . $normalizedLogin);
}

function securityAudit(string $event, array $context = []): void
{
    $entry = [
        'event' => $event,
        'role' => $_SESSION['role'] ?? getAuthorizedApiRole() ?? 'anonymous',
        'user_id' => $_SESSION['current_user']['id'] ?? null,
        'client' => substr(loginAttemptIdentifier($_SESSION['current_user']['username'] ?? null), 0, 12),
        'context' => $context,
    ];
    error_log('[KPI Audit] ' . json_encode($entry, JSON_UNESCAPED_SLASHES));
}

function authLoginAttemptsTableExists(): bool
{
    try {
        $stmt = getDb()->prepare('SHOW TABLES LIKE ?');
        $stmt->execute(['auth_login_attempts']);
        return (bool) $stmt->fetchColumn();
    } catch (Throwable $ex) {
        return false;
    }
}

function loginRateLimitStatus(string $loginIdentifier): array
{
    ensureAppSchema();
    if (!authLoginAttemptsTableExists()) {
        return ['blocked' => false, 'retry_after' => 0];
    }

    $stmt = getDb()->prepare(
        'SELECT attempt_count, window_started, blocked_until
         FROM auth_login_attempts WHERE identifier = ? LIMIT 1'
    );
    $stmt->execute([loginAttemptIdentifier($loginIdentifier)]);
    $attempt = $stmt->fetch();
    $now = time();
    if (!$attempt || (int) $attempt['blocked_until'] <= $now) {
        return ['blocked' => false, 'retry_after' => 0];
    }
    return [
        'blocked' => true,
        'retry_after' => max(1, (int) $attempt['blocked_until'] - $now),
    ];
}

function recordFailedLogin(string $loginIdentifier): void
{
    ensureAppSchema();
    if (!authLoginAttemptsTableExists()) {
        error_log('[KPI Security] auth_login_attempts table missing; skipped failed login tracking');
        return;
    }

    $pdo = getDb();
    $identifier = loginAttemptIdentifier($loginIdentifier);
    $now = time();
    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT IGNORE INTO auth_login_attempts
             (identifier, attempt_count, window_started, blocked_until)
             VALUES (?, 0, ?, 0)'
        );
        $insert->execute([$identifier, $now]);

        $select = $pdo->prepare(
            'SELECT attempt_count, window_started
             FROM auth_login_attempts WHERE identifier = ? FOR UPDATE'
        );
        $select->execute([$identifier]);
        $attempt = $select->fetch();
        $windowStarted = (int) ($attempt['window_started'] ?? $now);
        $attemptCount = (int) ($attempt['attempt_count'] ?? 0);
        if ($now - $windowStarted > LOGIN_WINDOW_SECONDS) {
            $windowStarted = $now;
            $attemptCount = 0;
        }
        $attemptCount++;
        $blockedUntil = $attemptCount >= LOGIN_MAX_ATTEMPTS
            ? $now + LOGIN_LOCKOUT_SECONDS
            : 0;

        $update = $pdo->prepare(
            'UPDATE auth_login_attempts
             SET attempt_count = ?, window_started = ?, blocked_until = ?
             WHERE identifier = ?'
        );
        $update->execute([$attemptCount, $windowStarted, $blockedUntil, $identifier]);
        $pdo->commit();
        error_log('[KPI Security] Failed login from identifier ' . substr($identifier, 0, 12));
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }
}

function clearLoginAttempts(string $loginIdentifier): void
{
    ensureAppSchema();
    if (!authLoginAttemptsTableExists()) {
        return;
    }

    $stmt = getDb()->prepare('DELETE FROM auth_login_attempts WHERE identifier = ?');
    $stmt->execute([loginAttemptIdentifier($loginIdentifier)]);
}

function getAuthorizedApiRole(): ?string
{
    $apiKey = getApiKey();
    if (!$apiKey) {
        return null;
    }

    foreach (API_KEYS as $role => $key) {
        if (hash_equals($key, $apiKey)) {
            return $role;
        }
    }

    return null;
}

function hasApiAccess(): bool
{
    return getAuthorizedApiRole() !== null;
}

function isAdmin(): bool
{
    return (isset($_SESSION['role']) && $_SESSION['role'] === 'admin')
        || getAuthorizedApiRole() === 'admin';
}

function canEvaluateRole(string $evaluatorRole, string $subjectRole): bool
{
    return match ($evaluatorRole) {
        'admin' => $subjectRole === 'manager',
        'manager' => in_array($subjectRole, ['supervisor', 'staff'], true),
        'supervisor' => $subjectRole === 'staff',
        default => false,
    };
}

function ensureAuthorized(): void
{
    if (!isset($_SESSION['role']) && !hasApiAccess()) {
        jsonResponse(['success' => false, 'error' => 'Unauthorized'], 401);
    }

    if (isset($_SESSION['current_user']['id'])) {
        $userId = (int) ($_SESSION['current_user']['id'] ?? 0);
        $stmt = getDb()->prepare(
            'SELECT id, name, username, email, account_role, posisi
             FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            $_SESSION = [];
            session_regenerate_id(true);
            jsonResponse(['success' => false, 'error' => 'Sesi tidak lagi valid. Silakan login kembali.'], 401);
        }
        $_SESSION['role'] = $user['account_role'];
        $_SESSION['current_user'] = normalizeUser($user);
    }
}

function normalizeUser(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'nama' => $user['name'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['account_role'],
        'posisi' => $user['posisi'],
        'isActive' => !isset($user['is_active']) || (bool) $user['is_active'],
    ];
}

function getUserByIdentifier(string $identifier): ?array
{
    $pdo = getDb();
    ensureAppSchema($pdo);
    $stmt = $pdo->prepare(
        'SELECT id, name, username, email, password_hash, account_role, posisi, is_active
         FROM users
         WHERE is_active = 1 AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
         LIMIT 1'
    );
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function loadUsers(): array
{
    $pdo = getDb();
    $stmt = $pdo->query(
        'SELECT id, name, username, email, account_role, posisi, is_active
         FROM users ORDER BY name'
    );
    $users = array_map('normalizeUser', $stmt->fetchAll());
    $assignmentStmt = $pdo->query(
        'SELECT evaluator_id, subject_id FROM assessment_assignments
         ORDER BY evaluator_id, subject_id'
    );
    $assignments = [];
    foreach ($assignmentStmt->fetchAll() as $assignment) {
        $assignments[(int) $assignment['evaluator_id']][] = (int) $assignment['subject_id'];
    }
    foreach ($users as &$user) {
        $user['subjectIds'] = $assignments[$user['id']] ?? [];
    }
    unset($user);
    return $users;
}

function loadAssessableUsers(int $evaluatorId): array
{
    $stmt = getDb()->prepare(
        'SELECT subject.id, subject.name, subject.username, subject.email,
                subject.account_role, subject.posisi, subject.is_active
         FROM assessment_assignments assignment
         INNER JOIN users subject ON subject.id = assignment.subject_id
         WHERE assignment.evaluator_id = ? AND subject.is_active = 1
         ORDER BY subject.name'
    );
    $stmt->execute([$evaluatorId]);
    return array_map('normalizeUser', $stmt->fetchAll());
}

function evaluatorCanAssess(int $evaluatorId, int $subjectId): bool
{
    if ($evaluatorId <= 0 || $subjectId <= 0 || $evaluatorId === $subjectId) {
        return false;
    }
    $stmt = getDb()->prepare(
        'SELECT evaluator.account_role AS evaluator_role,
                subject.account_role AS subject_role,
                assignment.subject_id
         FROM users evaluator
         INNER JOIN users subject ON subject.id = ?
         LEFT JOIN assessment_assignments assignment
           ON assignment.evaluator_id = evaluator.id AND assignment.subject_id = subject.id
         WHERE evaluator.id = ? AND evaluator.is_active = 1 AND subject.is_active = 1
         LIMIT 1'
    );
    $stmt->execute([$subjectId, $evaluatorId]);
    $access = $stmt->fetch();
    return $access
        && $access['subject_id'] !== null
        && canEvaluateRole($access['evaluator_role'], $access['subject_role']);
}

function loadSubmissionAnswers(int $submissionId): array
{
    $pdo = getDb();
    ensureAppSchema($pdo);
    $stmt = $pdo->prepare(
        'SELECT id AS answerId, kpi_id AS id, tier, calculated_tier AS calculatedTier,
                final_tier AS finalTier, actual_value AS actualValue, link,
                evidence_notes AS notes, evidence_checklist_json AS checklistJson,
                achievement_note AS achievementNote, decision_reason AS decisionReason,
                coaching_note AS coachingNote, evidence_status AS evidenceStatus
         FROM submission_answers WHERE submission_id = ? ORDER BY id ASC'
    );
    $stmt->execute([$submissionId]);
    $answers = array_map(function ($answer) {
        $answer['tier'] = (int) $answer['tier'];
        $answer['calculatedTier'] = $answer['calculatedTier'] !== null ? (int) $answer['calculatedTier'] : (int) $answer['tier'];
        $answer['finalTier'] = $answer['finalTier'] !== null ? (int) $answer['finalTier'] : (int) $answer['tier'];
        $answer['actualValue'] = $answer['actualValue'] !== null ? (float) $answer['actualValue'] : null;
        $checklist = is_string($answer['checklistJson'] ?? null) && $answer['checklistJson'] !== ''
            ? json_decode($answer['checklistJson'], true)
            : [];
        $answer['checklist'] = is_array($checklist) ? array_values(array_filter(
            array_map(fn ($item) => trim((string) $item), $checklist),
            fn ($item) => $item !== ''
        )) : [];
        unset($answer['checklistJson']);
        return $answer;
    }, $stmt->fetchAll());
    $evidencesByAnswer = loadSubmissionAnswerEvidences(array_column($answers, 'answerId'));
    foreach ($answers as &$answer) {
        $answer['evidences'] = $evidencesByAnswer[(int) $answer['answerId']] ?? [];
    }
    unset($answer);
    return $answers;
}

function recordSubmissionAudit(
    int $submissionId,
    ?int $submissionAnswerId,
    ?int $actorUserId,
    string $event,
    mixed $oldValue = null,
    mixed $newValue = null,
    string $note = ''
): void {
    ensureAppSchema();
    $encode = fn ($value) => $value === null
        ? null
        : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = getDb()->prepare(
        'INSERT INTO submission_audit_logs
         (submission_id, submission_answer_id, actor_user_id, event, old_value, new_value, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $submissionId,
        $submissionAnswerId,
        $actorUserId,
        $event,
        $encode($oldValue),
        $encode($newValue),
        $note,
    ]);
}

function loadSubmissionAuditLogs(int $submissionId): array
{
    ensureAppSchema();
    $stmt = getDb()->prepare(
        'SELECT audit.*, actor.name AS actor_name
         FROM submission_audit_logs audit
         LEFT JOIN users actor ON actor.id = audit.actor_user_id
         WHERE audit.submission_id = ?
         ORDER BY audit.id DESC'
    );
    $stmt->execute([$submissionId]);
    return array_map(function ($log) {
        return [
            'id' => (int) $log['id'],
            'submissionAnswerId' => $log['submission_answer_id'] !== null ? (int) $log['submission_answer_id'] : null,
            'actorUserId' => $log['actor_user_id'] !== null ? (int) $log['actor_user_id'] : null,
            'actorName' => $log['actor_name'],
            'event' => $log['event'],
            'oldValue' => is_string($log['old_value']) ? json_decode($log['old_value'], true) : null,
            'newValue' => is_string($log['new_value']) ? json_decode($log['new_value'], true) : null,
            'note' => $log['note'],
            'createdAt' => $log['created_at'],
        ];
    }, $stmt->fetchAll());
}

function loadSubmissionAnswerEvidences(array $answerIds): array
{
    $answerIds = array_values(array_unique(array_filter(array_map('intval', $answerIds), fn ($id) => $id > 0)));
    if ($answerIds === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($answerIds), '?'));
    $stmt = getDb()->prepare(
        "SELECT evidence.*, verifier.name AS verifier_name
         FROM submission_answer_evidences evidence
         LEFT JOIN users verifier ON verifier.id = evidence.verified_by
         WHERE evidence.submission_answer_id IN ({$placeholders})
         ORDER BY evidence.id ASC"
    );
    $stmt->execute($answerIds);
    $grouped = [];
    foreach ($stmt->fetchAll() as $evidence) {
        $grouped[(int) $evidence['submission_answer_id']][] = [
            'id' => (int) $evidence['id'],
            'requirementId' => $evidence['requirement_id'],
            'requirementLabel' => $evidence['requirement_label'],
            'expectedFormat' => $evidence['expected_format'],
            'evidenceUrl' => $evidence['evidence_url'],
            'submittedNote' => $evidence['submitted_note'],
            'isSubmitted' => (bool) $evidence['is_submitted'],
            'verificationStatus' => $evidence['is_submitted'] ? $evidence['verification_status'] : 'missing',
            'verifierNote' => $evidence['verifier_note'],
            'verifiedBy' => $evidence['verified_by'] !== null ? [
                'id' => (int) $evidence['verified_by'],
                'name' => $evidence['verifier_name'],
            ] : null,
            'verifiedAt' => $evidence['verified_at'],
        ];
    }
    return $grouped;
}

function evidenceItemsForAnswer(array $kpi, ?array $answer): array
{
    $required = is_array($kpi['evidenceChecklist'] ?? null) ? $kpi['evidenceChecklist'] : [];
    $stored = is_array($answer['evidences'] ?? null) ? $answer['evidences'] : [];
    if ($stored !== [] || $required === []) {
        return $stored;
    }

    $checked = is_array($answer['checklist'] ?? null) ? $answer['checklist'] : [];
    return array_values(array_map(function ($label, $index) use ($answer, $checked) {
        $label = trim((string) $label);
        $isSubmitted = in_array($label, $checked, true);
        return [
            'id' => null,
            'requirementId' => ($answer['id'] ?? 'kpi') . ':' . ($index + 1),
            'requirementLabel' => $label,
            'expectedFormat' => '',
            'evidenceUrl' => $answer['link'] ?? '',
            'submittedNote' => $answer['notes'] ?? '',
            'isSubmitted' => $isSubmitted,
            'verificationStatus' => $isSubmitted ? 'pending' : 'missing',
            'verifierNote' => null,
            'verifiedBy' => null,
            'verifiedAt' => null,
        ];
    }, $required, array_keys($required)));
}

function normalizeSubmission(array $submission): array
{
    $definitions = getKpiDefinitions();
    $snapshot = loadSubmissionDefinitionSnapshot((int) $submission['id']);
    $definition = $snapshot ?? ($definitions[$submission['posisi']] ?? ['kpis' => []]);
    $answers = loadSubmissionAnswers((int) $submission['id']);
    foreach ($answers as &$answer) {
        $kpi = null;
        foreach (($definition['kpis'] ?? []) as $definitionKpi) {
            if (($definitionKpi['id'] ?? '') === ($answer['id'] ?? '')) {
                $kpi = $definitionKpi;
                break;
            }
        }
        $answer['evidences'] = $kpi ? evidenceItemsForAnswer($kpi, $answer) : ($answer['evidences'] ?? []);
    }
    unset($answer);

    return [
        'id' => (string) $submission['id'],
        'user_id' => $submission['user_id'] !== null ? (int) $submission['user_id'] : null,
        'evaluator_user_id' => $submission['evaluator_user_id'] !== null
            ? (int) $submission['evaluator_user_id']
            : null,
        'evaluatorName' => $submission['evaluator_name'] ?? null,
        'nama' => $submission['nama'],
        'posisi' => $submission['posisi'],
        'periode' => $submission['periode'],
        'tanggal' => $submission['tanggal'],
        'status' => $submission['status'],
        'kehadiran' => [
            'sakit' => (int) $submission['kehadiran_sakit'],
            'izin' => (int) $submission['kehadiran_izin'],
            'alpa' => (int) $submission['kehadiran_alpa'],
            'cuti' => (int) $submission['kehadiran_cuti'],
        ],
        'scoreCalc' => [
            'scoreKPI' => (string) $submission['score_kpi'],
            'pctFromKPI' => (string) $submission['pct_kpi'],
            'kehadiranPct' => (string) $submission['pct_kehadiran'],
            'finalAchievement' => (string) $submission['final_achievement'],
        ],
        'catatan' => $submission['catatan'],
        'created_at' => $submission['created_at'],
        'kpiAnswers' => $answers,
        'definition' => $definition,
        'auditLogs' => loadSubmissionAuditLogs((int) $submission['id']),
    ];
}

function loadSubmissions(string $role, ?array $currentUser): array
{
    $pdo = getDb();
    $sql = 'SELECT submissions.*, evaluator.name AS evaluator_name
            FROM submissions
            LEFT JOIN users evaluator ON evaluator.id = submissions.evaluator_user_id
            ORDER BY submissions.id DESC';
    $params = [];

    if ($role !== 'admin' && $currentUser) {
        $sql = 'SELECT DISTINCT submissions.*, evaluator.name AS evaluator_name
                FROM submissions
                LEFT JOIN users evaluator ON evaluator.id = submissions.evaluator_user_id
                LEFT JOIN assessment_assignments assignment
                  ON assignment.subject_id = submissions.user_id
                 AND assignment.evaluator_id = ?
                WHERE submissions.user_id = ? OR assignment.evaluator_id = ?
                ORDER BY submissions.id DESC';
        $params = [$currentUser['id'], $currentUser['id'], $currentUser['id']];
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $submissions = $stmt->fetchAll();

    return array_map('normalizeSubmission', $submissions);
}
