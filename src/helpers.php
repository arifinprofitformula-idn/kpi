<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

function getPayload(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) {
        return $data;
    }
    return $_REQUEST;
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
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_REQUEST['api_key'] ?? null;
    if (!is_string($apiKey)) {
        return null;
    }
    return trim($apiKey);
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
