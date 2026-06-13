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

function loginAttemptIdentifier(): string
{
    $remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return hash('sha256', $remoteAddress);
}

function securityAudit(string $event, array $context = []): void
{
    $entry = [
        'event' => $event,
        'role' => $_SESSION['role'] ?? getAuthorizedApiRole() ?? 'anonymous',
        'user_id' => $_SESSION['current_user']['id'] ?? null,
        'client' => substr(loginAttemptIdentifier(), 0, 12),
        'context' => $context,
    ];
    error_log('[KPI Audit] ' . json_encode($entry, JSON_UNESCAPED_SLASHES));
}

function loginRateLimitStatus(): array
{
    ensureAppSchema();
    $stmt = getDb()->prepare(
        'SELECT attempt_count, window_started, blocked_until
         FROM auth_login_attempts WHERE identifier = ? LIMIT 1'
    );
    $stmt->execute([loginAttemptIdentifier()]);
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

function recordFailedLogin(): void
{
    ensureAppSchema();
    $pdo = getDb();
    $identifier = loginAttemptIdentifier();
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

function clearLoginAttempts(): void
{
    ensureAppSchema();
    $stmt = getDb()->prepare('DELETE FROM auth_login_attempts WHERE identifier = ?');
    $stmt->execute([loginAttemptIdentifier()]);
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

function isLeader(): bool
{
    $apiRole = getAuthorizedApiRole();
    return (isset($_SESSION['role']) && in_array($_SESSION['role'], ['leader', 'admin'], true))
        || in_array($apiRole, ['leader', 'admin'], true);
}

function ensureAuthorized(): void
{
    if (!isset($_SESSION['role']) && !hasApiAccess()) {
        jsonResponse(['success' => false, 'error' => 'Unauthorized'], 401);
    }

    if (($_SESSION['role'] ?? null) === 'staff') {
        $userId = (int) ($_SESSION['current_user']['id'] ?? 0);
        $stmt = getDb()->prepare('SELECT id, name, posisi FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            $_SESSION = [];
            session_regenerate_id(true);
            jsonResponse(['success' => false, 'error' => 'Sesi tidak lagi valid. Silakan login kembali.'], 401);
        }
        $_SESSION['current_user'] = [
            'id' => (int) $user['id'],
            'nama' => $user['name'],
            'posisi' => $user['posisi'],
        ];
    }
}

function getUserByPin(string $pin): ?array
{
    $pdo = getDb();
    ensureAppSchema($pdo);
    $stmt = $pdo->query('SELECT id, name, posisi, pin_hash FROM users WHERE pin_hash IS NOT NULL');
    foreach ($stmt->fetchAll() as $user) {
        if (password_verify($pin, (string) $user['pin_hash'])) {
            unset($user['pin_hash']);
            return $user;
        }
    }
    return null;
}

function isUserPinInUse(string $pin, int $excludeId = 0): bool
{
    $pdo = getDb();
    ensureAppSchema($pdo);
    $stmt = $pdo->prepare('SELECT id, pin_hash FROM users WHERE id != ? AND pin_hash IS NOT NULL');
    $stmt->execute([$excludeId]);
    foreach ($stmt->fetchAll() as $user) {
        if (password_verify($pin, (string) $user['pin_hash'])) {
            return true;
        }
    }
    return false;
}

function loadUsers(): array
{
    $pdo = getDb();
    $stmt = $pdo->query('SELECT id, name, posisi FROM users ORDER BY name');
    return $stmt->fetchAll();
}

function loadSubmissionAnswers(int $submissionId): array
{
    $pdo = getDb();
    ensureAppSchema($pdo);
    $stmt = $pdo->prepare('SELECT kpi_id AS id, tier, actual_value AS actualValue, link FROM submission_answers WHERE submission_id = ? ORDER BY id ASC');
    $stmt->execute([$submissionId]);
    return array_map(function ($answer) {
        $answer['tier'] = (int) $answer['tier'];
        $answer['actualValue'] = $answer['actualValue'] !== null ? (float) $answer['actualValue'] : null;
        return $answer;
    }, $stmt->fetchAll());
}

function normalizeSubmission(array $submission): array
{
    $definitions = getKpiDefinitions();
    $snapshot = loadSubmissionDefinitionSnapshot((int) $submission['id']);
    $definition = $snapshot ?? ($definitions[$submission['posisi']] ?? ['kpis' => []]);

    return [
        'id' => (string) $submission['id'],
        'user_id' => $submission['user_id'] !== null ? (int) $submission['user_id'] : null,
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
        'kpiAnswers' => loadSubmissionAnswers((int) $submission['id']),
        'definition' => $definition,
    ];
}

function loadSubmissions(string $role, ?array $currentUser): array
{
    $pdo = getDb();
    $sql = 'SELECT * FROM submissions ORDER BY id DESC';
    $params = [];

    if ($role === 'staff' && $currentUser) {
        $sql = 'SELECT * FROM submissions WHERE user_id = ? ORDER BY id DESC';
        $params = [$currentUser['id']];
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $submissions = $stmt->fetchAll();

    return array_map('normalizeSubmission', $submissions);
}
