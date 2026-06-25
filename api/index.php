<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    jsonResponse(['success' => false, 'error' => 'Metode HTTP tidak diizinkan.'], 405);
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > MAX_REQUEST_BYTES) {
    jsonResponse(['success' => false, 'error' => 'Payload terlalu besar.'], 413);
}

$contentType = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if ($contentType !== 'application/json') {
    jsonResponse(['success' => false, 'error' => 'Content-Type harus application/json.'], 415);
}

if (!verifySameOriginRequest()) {
    jsonResponse(['success' => false, 'error' => 'Origin request tidak diizinkan.'], 403);
}

$payload = getPayload();
try {
    action_handler($payload);
} catch (Throwable $ex) {
    error_log(sprintf('[KPI API] %s in %s:%d', $ex->getMessage(), $ex->getFile(), $ex->getLine()));
    $response = ['success' => false, 'error' => 'Terjadi kesalahan pada server.'];
    if (APP_DEBUG) {
        $response['debug'] = $ex->getMessage();
    }
    jsonResponse($response, 500);
}

function action_handler(array $payload): void
{
    $action = is_string($payload['action'] ?? null) ? $payload['action'] : '';
    if (strlen($action) > 64) {
        jsonResponse(['success' => false, 'error' => 'Aksi API tidak valid.'], 400);
    }

    if ($action === 'health') {
        jsonResponse(['success' => true, 'message' => 'OK']);
    }

    if ($action === 'login') {
        handleLogin($payload);
    }

    ensureAuthorized();
    if (!hasApiAccess() && !verifyCsrfToken()) {
        jsonResponse(['success' => false, 'error' => 'Token keamanan tidak valid. Muat ulang halaman.'], 419);
    }

    switch ($action) {
        case 'definitions':
            jsonResponse(['success' => true, 'data' => ['posisiData' => getKpiDefinitions()]]);
            break;
        case 'logout':
            securityAudit('logout');
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', [
                    'expires' => time() - 42000,
                    'path' => $params['path'],
                    'domain' => $params['domain'],
                    'secure' => $params['secure'],
                    'httponly' => $params['httponly'],
                    'samesite' => $params['samesite'],
                ]);
            }
            session_destroy();
            jsonResponse(['success' => true]);
            break;
        case 'loadData':
            handleLoadData();
            break;
        case 'submitKpi':
            handleSubmit($payload);
            break;
        case 'approveSubmission':
            handleApprove($payload);
            break;
        case 'requestRevisi':
            handleRevisi($payload);
            break;
        case 'saveUser':
            handleSaveUser($payload);
            break;
        case 'deleteUser':
            handleDeleteUser($payload);
            break;
        case 'saveKpiDefinitions':
            handleSaveKpiDefinitions($payload);
            break;
        default:
            jsonResponse(['success' => false, 'error' => 'Aksi API tidak dikenali.'], 404);
    }
}

function handleLoadData(): void
{
    $role = $_SESSION['role'] ?? getAuthorizedApiRole() ?? 'api';
    $currentUser = $_SESSION['current_user'] ?? null;
    try {
        $response = [
            'success' => true,
            'role' => $role,
            'currentUser' => $currentUser,
            'submissions' => loadSubmissions($role, $currentUser),
            'users' => [],
            'assessableUsers' => isset($currentUser['id'])
                ? loadAssessableUsers((int) $currentUser['id'])
                : [],
            'posisiData' => getKpiDefinitions(),
        ];

        if (isAdmin()) {
            $response['users'] = loadUsers();
        }
    } catch (PDOException $ex) {
        if (!isAdmin()) {
            throw $ex;
        }

        error_log('[KPI Database] Admin dashboard entered degraded mode: ' . $ex->getMessage());
        $response = [
            'success' => true,
            'role' => $role,
            'currentUser' => $currentUser,
            'submissions' => [],
            'users' => [],
            'assessableUsers' => [],
            'posisiData' => enrichKpiDefinitions(POSISI_DATA),
            'databaseAvailable' => false,
            'warning' => 'Admin berhasil masuk, tetapi database belum dapat diakses. Periksa konfigurasi database hosting.',
        ];
    }

    jsonResponse($response);
}

function handleSubmit(array $payload): void
{
    $userRole = $_SESSION['role'] ?? 'api';
    $currentUser = $_SESSION['current_user'] ?? null;
    $subjectUserId = (int) ($payload['subjectUserId'] ?? 0);
    $selectedPeriode = trim($payload['selectedPeriode'] ?? '');
    $draftAnswers = $payload['draftAnswers'] ?? [];
    $draftKehadiran = $payload['draftKehadiran'] ?? ['sakit' => 0, 'izin' => 0, 'alpa' => 0, 'cuti' => 0];
    if (!is_array($draftAnswers) || !is_array($draftKehadiran)) {
        jsonResponse(['success' => false, 'error' => 'Format data KPI tidak valid.']);
    }

    if (!$currentUser || !in_array($userRole, ['admin', 'manager', 'supervisor'], true)) {
        jsonResponse(['success' => false, 'error' => 'Akun ini tidak memiliki akses untuk melakukan penilaian.'], 403);
    }
    if (!evaluatorCanAssess((int) $currentUser['id'], $subjectUserId)) {
        jsonResponse(['success' => false, 'error' => 'Anda tidak ditugaskan untuk menilai akun tersebut.'], 403);
    }
    if ($selectedPeriode === '' || strlen($selectedPeriode) > 64) {
        jsonResponse(['success' => false, 'error' => 'Periode penilaian tidak valid.']);
    }

    $subjectStmt = getDb()->prepare(
        'SELECT id, name, posisi FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
    );
    $subjectStmt->execute([$subjectUserId]);
    $subject = $subjectStmt->fetch();
    if (!$subject) {
        jsonResponse(['success' => false, 'error' => 'Akun yang dinilai tidak ditemukan.'], 404);
    }
    $selectedNama = $subject['name'];
    $selectedPosisi = $subject['posisi'];
    $definitions = getKpiDefinitions();
    if (!isset($definitions[$selectedPosisi])) {
        jsonResponse(['success' => false, 'error' => 'Posisi tidak valid.']);
    }

    $answers = [];
    foreach ($definitions[$selectedPosisi]['kpis'] as $kpi) {
        if (!isset($draftAnswers[$kpi['id']]['actualValue']) || $draftAnswers[$kpi['id']]['actualValue'] === '') {
            jsonResponse(['success' => false, 'error' => "Nilai aktual untuk KPI {$kpi['nama']} belum diisi."]);
        }

        $actualValue = filter_var($draftAnswers[$kpi['id']]['actualValue'], FILTER_VALIDATE_FLOAT);
        if ($actualValue === false || !is_finite((float) $actualValue)) {
            jsonResponse(['success' => false, 'error' => "Nilai aktual untuk KPI {$kpi['nama']} harus berupa angka."]);
        }

        $matchedTier = calculateKpiTier($kpi, (float) $actualValue);
        if (!$matchedTier) {
            jsonResponse([
                'success' => false,
                'error' => "Nilai aktual {$actualValue} untuk KPI {$kpi['nama']} tidak masuk ke formula skor mana pun. Hubungi Admin.",
            ]);
        }

        $link = trim((string) ($draftAnswers[$kpi['id']]['link'] ?? ''));
        if (strlen($link) > 2048) {
            jsonResponse(['success' => false, 'error' => "Link bukti untuk KPI {$kpi['nama']} terlalu panjang."]);
        }
        if ($link !== '' && (
            filter_var($link, FILTER_VALIDATE_URL) === false
            || !in_array(strtolower((string) parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true)
        )) {
            jsonResponse(['success' => false, 'error' => "Link bukti untuk KPI {$kpi['nama']} harus berupa URL HTTP/HTTPS."]);
        }

        $answers[] = [
            'id' => $kpi['id'],
            'tier' => (int) $matchedTier['skor'],
            'actualValue' => (float) $actualValue,
            'link' => $link,
        ];
    }

    $attendance = [];
    foreach (['sakit', 'izin', 'alpa', 'cuti'] as $attendanceType) {
        $value = filter_var($draftKehadiran[$attendanceType] ?? 0, FILTER_VALIDATE_INT);
        if ($value === false || $value < 0 || $value > HARI_KERJA) {
            jsonResponse(['success' => false, 'error' => 'Data kehadiran harus berupa angka 0 sampai ' . HARI_KERJA . '.']);
        }
        $attendance[$attendanceType] = $value;
    }
    if (array_sum($attendance) > HARI_KERJA) {
        jsonResponse(['success' => false, 'error' => 'Total ketidakhadiran tidak boleh melebihi jumlah hari kerja.']);
    }
    $draftKehadiran = $attendance;

    $scoreCalc = calcScore($selectedPosisi, $answers, $draftKehadiran, $definitions);
    $pdo = getDb();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO submissions (user_id, evaluator_user_id, nama, posisi, periode, tanggal, status, kehadiran_sakit, kehadiran_izin, kehadiran_alpa, kehadiran_cuti, score_kpi, pct_kpi, pct_kehadiran, final_achievement, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $subjectUserId,
            (int) $currentUser['id'],
            $selectedNama,
            $selectedPosisi,
            $selectedPeriode,
            date('d M Y'),
            'Approved',
            intval($draftKehadiran['sakit'] ?? 0),
            intval($draftKehadiran['izin'] ?? 0),
            intval($draftKehadiran['alpa'] ?? 0),
            intval($draftKehadiran['cuti'] ?? 0),
            $scoreCalc['scoreKPI'],
            $scoreCalc['pctFromKPI'],
            $scoreCalc['kehadiranPct'],
            $scoreCalc['finalAchievement'],
            ''
        ]);

        $submissionId = (int) $pdo->lastInsertId();
        $insertAnswer = $pdo->prepare('INSERT INTO submission_answers (submission_id, kpi_id, tier, actual_value, link) VALUES (?, ?, ?, ?, ?)');
        foreach ($answers as $answer) {
            $insertAnswer->execute([
                $submissionId,
                $answer['id'],
                $answer['tier'],
                $answer['actualValue'],
                $answer['link'],
            ]);
        }
        saveSubmissionDefinitionSnapshot($submissionId, $definitions[$selectedPosisi]);
        $pdo->commit();
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }

    jsonResponse(['success' => true]);
}

function handleApprove(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID submission tidak valid.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Approved', '', $id]);
    securityAudit('submission_approved', ['submission_id' => $id]);
    jsonResponse(['success' => true]);
}

function handleRevisi(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    $note = trim($payload['note'] ?? '');
    if ($id <= 0 || $note === '') {
        jsonResponse(['success' => false, 'error' => 'ID submission dan catatan revisi harus diisi.']);
    }
    if (strlen($note) > 2000) {
        jsonResponse(['success' => false, 'error' => 'Catatan revisi maksimal 2000 karakter.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Revisi', $note, $id]);
    securityAudit('submission_revision_requested', ['submission_id' => $id]);
    jsonResponse(['success' => true]);
}

function handleSaveUser(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    $name = trim($payload['name'] ?? '');
    $username = strtolower(trim($payload['username'] ?? ''));
    $email = strtolower(trim($payload['email'] ?? ''));
    $role = strtolower(trim($payload['role'] ?? 'staff'));
    $posisi = trim($payload['posisi'] ?? '');
    $password = (string) ($payload['password'] ?? '');
    $isActive = filter_var($payload['isActive'] ?? true, FILTER_VALIDATE_BOOL);
    $subjectIds = $payload['subjectIds'] ?? [];

    if (
        $name === ''
        || $username === ''
        || $email === ''
        || $posisi === ''
        || ($id <= 0 && $password === '')
    ) {
        jsonResponse(['success' => false, 'error' => 'Nama, username, email, posisi, dan password akun baru harus diisi.']);
    }
    if (
        strlen($name) > 255
        || strlen($posisi) > 255
        || preg_match('/^[a-z0-9._-]{3,64}$/', $username) !== 1
        || filter_var($email, FILTER_VALIDATE_EMAIL) === false
        || strlen($email) > 255
        || !in_array($role, ['admin', 'manager', 'supervisor', 'staff'], true)
        || !is_array($subjectIds)
    ) {
        jsonResponse(['success' => false, 'error' => 'Data akun tidak valid. Periksa username, email, role, dan posisi.']);
    }
    if ($password !== '' && (strlen($password) < 10 || strlen($password) > 128)) {
        jsonResponse(['success' => false, 'error' => 'Password harus terdiri dari 10 sampai 128 karakter.']);
    }
    if ($role !== 'admin' && !isset(getKpiDefinitions()[$posisi])) {
        jsonResponse(['success' => false, 'error' => 'Posisi tidak tersedia pada pengaturan form KPI.']);
    }

    $subjectIds = array_values(array_unique(array_filter(
        array_map('intval', $subjectIds),
        fn ($subjectId) => $subjectId > 0 && $subjectId !== $id
    )));
    $pdo = getDb();
    if ($subjectIds !== []) {
        $placeholders = implode(',', array_fill(0, count($subjectIds), '?'));
        $subjectStmt = $pdo->prepare(
            "SELECT id, account_role FROM users WHERE id IN ({$placeholders}) AND is_active = 1"
        );
        $subjectStmt->execute($subjectIds);
        $subjects = $subjectStmt->fetchAll();
        if (count($subjects) !== count($subjectIds)) {
            jsonResponse(['success' => false, 'error' => 'Salah satu akun yang dinilai tidak tersedia.']);
        }
        foreach ($subjects as $subject) {
            if (!canEvaluateRole($role, $subject['account_role'])) {
                jsonResponse([
                    'success' => false,
                    'error' => ucfirst($role) . ' tidak dapat ditugaskan menilai akun ' . $subject['account_role'] . '.',
                ]);
            }
        }
    }

    if ($id === (int) ($_SESSION['current_user']['id'] ?? 0) && (!$isActive || $role !== 'admin')) {
        jsonResponse(['success' => false, 'error' => 'Admin tidak dapat menonaktifkan atau mengubah role akunnya sendiri.']);
    }

    $pdo->beginTransaction();
    try {
        if ($id > 0) {
            if ($password === '') {
                $stmt = $pdo->prepare(
                    'UPDATE users SET name = ?, username = ?, email = ?, account_role = ?,
                     posisi = ?, is_active = ? WHERE id = ?'
                );
                $stmt->execute([$name, $username, $email, $role, $posisi, $isActive ? 1 : 0, $id]);
            } else {
                $stmt = $pdo->prepare(
                    'UPDATE users SET name = ?, username = ?, email = ?, password_hash = ?,
                     account_role = ?, posisi = ?, is_active = ?, pin = NULL, pin_hash = NULL
                     WHERE id = ?'
                );
                $stmt->execute([
                    $name,
                    $username,
                    $email,
                    password_hash($password, PASSWORD_DEFAULT),
                    $role,
                    $posisi,
                    $isActive ? 1 : 0,
                    $id,
                ]);
            }
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO users
                 (name, username, email, password_hash, account_role, posisi, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $name,
                $username,
                $email,
                password_hash($password, PASSWORD_DEFAULT),
                $role,
                $posisi,
                $isActive ? 1 : 0,
            ]);
            $id = (int) $pdo->lastInsertId();
        }

        $pdo->prepare('DELETE FROM assessment_assignments WHERE evaluator_id = ?')->execute([$id]);
        $insertAssignment = $pdo->prepare(
            'INSERT INTO assessment_assignments (evaluator_id, subject_id) VALUES (?, ?)'
        );
        foreach ($subjectIds as $subjectId) {
            $insertAssignment->execute([$id, $subjectId]);
        }

        $incomingStmt = $pdo->prepare(
            'SELECT assignment.evaluator_id, evaluator.account_role
             FROM assessment_assignments assignment
             INNER JOIN users evaluator ON evaluator.id = assignment.evaluator_id
             WHERE assignment.subject_id = ?'
        );
        $incomingStmt->execute([$id]);
        $deleteIncoming = $pdo->prepare(
            'DELETE FROM assessment_assignments WHERE evaluator_id = ? AND subject_id = ?'
        );
        foreach ($incomingStmt->fetchAll() as $incoming) {
            if (!canEvaluateRole($incoming['account_role'], $role)) {
                $deleteIncoming->execute([(int) $incoming['evaluator_id'], $id]);
            }
        }
        $pdo->commit();
    } catch (PDOException $ex) {
        $pdo->rollBack();
        if ((string) $ex->getCode() === '23000') {
            jsonResponse(['success' => false, 'error' => 'Username atau email sudah digunakan akun lain.']);
        }
        throw $ex;
    }

    securityAudit('user_saved', [
        'target_user_id' => $id,
        'role' => $role,
        'subject_count' => count($subjectIds),
    ]);
    jsonResponse(['success' => true]);
}

function handleDeleteUser(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID user tidak valid.']);
    }
    if ($id === (int) ($_SESSION['current_user']['id'] ?? 0)) {
        jsonResponse(['success' => false, 'error' => 'Admin tidak dapat menghapus akunnya sendiri.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    securityAudit('user_deleted', ['target_user_id' => $id]);
    jsonResponse(['success' => true]);
}

function handleLogin(array $payload): void
{
    $identifier = strtolower(trim((string) ($payload['identifier'] ?? '')));
    $password = (string) ($payload['password'] ?? '');
    if ($identifier === '' || strlen($identifier) > 255 || $password === '' || strlen($password) > 128) {
        jsonResponse(['success' => false, 'error' => 'Username/email atau password tidak valid.']);
    }
    if (!verifyCsrfToken()) {
        jsonResponse(['success' => false, 'error' => 'Token keamanan tidak valid. Muat ulang halaman.'], 419);
    }

    $rateLimit = loginRateLimitStatus($identifier);
    if ($rateLimit['blocked']) {
        header('Retry-After: ' . $rateLimit['retry_after']);
        jsonResponse([
            'success' => false,
            'error' => 'Terlalu banyak percobaan login. Coba kembali beberapa saat lagi.',
        ], 429);
    }

    $user = getUserByIdentifier($identifier);
    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        recordFailedLogin($identifier);
        usleep(random_int(100000, 300000));
        jsonResponse(['success' => false, 'error' => 'Username/email atau password salah.']);
    }
    $_SESSION['role'] = $user['account_role'];
    $_SESSION['current_user'] = normalizeUser($user);

    if (password_needs_rehash((string) $user['password_hash'], PASSWORD_DEFAULT)) {
        $rehash = getDb()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $rehash->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
    }
    clearLoginAttempts($identifier);
    session_regenerate_id(true);
    $_SESSION['created_at'] = time();
    $_SESSION['last_activity'] = time();
    $_SESSION['last_rotation'] = time();
    rotateCsrfToken();
    securityAudit('login_success');
    jsonResponse([
        'success' => true,
        'role' => $_SESSION['role'],
        'currentUser' => $_SESSION['current_user'],
    ]);
}

function handleSaveKpiDefinitions(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $rawDefinitions = $payload['definitions'] ?? null;
    if (!is_array($rawDefinitions)) {
        jsonResponse(['success' => false, 'error' => 'Format definisi KPI tidak valid.']);
    }

    $definitions = normalizeKpiDefinitions($rawDefinitions);
    $activePositions = array_column(
        array_filter(loadUsers(), fn ($user) => $user['role'] !== 'admin'),
        'posisi'
    );
    $missingPositions = array_values(array_diff(array_unique($activePositions), array_keys($definitions)));
    if ($missingPositions !== []) {
        jsonResponse([
            'success' => false,
            'error' => 'Posisi masih digunakan oleh user: ' . implode(', ', $missingPositions) . '.',
        ]);
    }

    backfillSubmissionDefinitionSnapshots(getKpiDefinitions());
    saveKpiDefinitions($definitions);
    securityAudit('kpi_definitions_saved', ['position_count' => count($definitions)]);
    jsonResponse(['success' => true, 'data' => ['posisiData' => $definitions]]);
}

function normalizeKpiDefinitions(array $rawDefinitions): array
{
    if (count($rawDefinitions) > 100) {
        jsonResponse(['success' => false, 'error' => 'Jumlah posisi melebihi batas sistem.']);
    }

    $definitions = [];
    foreach ($rawDefinitions as $positionName => $definition) {
        $positionName = trim((string) $positionName);
        if ($positionName === '' || strlen($positionName) > 255 || isset($definitions[$positionName])) {
            jsonResponse(['success' => false, 'error' => 'Nama posisi wajib diisi dan harus unik.']);
        }

        $rawKpis = is_array($definition) ? ($definition['kpis'] ?? null) : null;
        if (!is_array($rawKpis) || $rawKpis === [] || count($rawKpis) > 100) {
            jsonResponse(['success' => false, 'error' => "Posisi {$positionName} harus memiliki minimal satu KPI."]);
        }

        $kpis = [];
        $ids = [];
        $totalWeight = 0.0;
        foreach ($rawKpis as $index => $rawKpi) {
            $id = trim((string) ($rawKpi['id'] ?? ''));
            $name = trim((string) ($rawKpi['nama'] ?? ''));
            $target = trim((string) ($rawKpi['target'] ?? ''));
            $unit = trim((string) ($rawKpi['unit'] ?? ''));
            $weight = filter_var($rawKpi['bobot'] ?? null, FILTER_VALIDATE_FLOAT);
            if (
                $id === ''
                || preg_match('/^[A-Za-z0-9_-]{1,32}$/', $id) !== 1
                || $name === ''
                || strlen($name) > 255
                || $target === ''
                || strlen($target) > 2000
                || $unit === ''
                || strlen($unit) > 64
                || $weight === false
                || $weight <= 0
            ) {
                jsonResponse(['success' => false, 'error' => "Data KPI ke-" . ($index + 1) . " pada {$positionName} belum lengkap."]);
            }
            if (isset($ids[$id])) {
                jsonResponse(['success' => false, 'error' => "ID KPI {$id} pada {$positionName} harus unik."]);
            }

            $rawTiers = $rawKpi['tiers'] ?? null;
            if (!is_array($rawTiers) || $rawTiers === [] || count($rawTiers) > 20) {
                jsonResponse(['success' => false, 'error' => "KPI {$name} harus memiliki minimal satu opsi capaian."]);
            }

            $tiers = [];
            $scores = [];
            foreach ($rawTiers as $rawTier) {
                $label = trim((string) ($rawTier['label'] ?? ''));
                $score = filter_var($rawTier['skor'] ?? null, FILTER_VALIDATE_INT);
                $rule = is_array($rawTier['rule'] ?? null) ? $rawTier['rule'] : [];
                $operator = trim((string) ($rule['operator'] ?? ''));
                $ruleValue = filter_var($rule['value'] ?? null, FILTER_VALIDATE_FLOAT);
                $ruleMax = $operator === 'between'
                    ? filter_var($rule['max'] ?? null, FILTER_VALIDATE_FLOAT)
                    : null;
                if (
                    $label === ''
                    || strlen($label) > 255
                    || $score === false
                    || $score < 0
                    || $score > 2
                    || !in_array($operator, ['gte', 'gt', 'between', 'lte', 'lt', 'eq'], true)
                    || $ruleValue === false
                    || ($operator === 'between' && ($ruleMax === false || $ruleMax < $ruleValue))
                ) {
                    jsonResponse([
                        'success' => false,
                        'error' => "Formula pada KPI {$name} tidak valid. Periksa label, skor, operator, dan batas angkanya.",
                    ]);
                }
                if (isset($scores[$score])) {
                    jsonResponse(['success' => false, 'error' => "Skor opsi pada KPI {$name} harus unik."]);
                }
                $scores[$score] = true;
                $tiers[] = [
                    'label' => $label,
                    'skor' => $score,
                    'rule' => [
                        'operator' => $operator,
                        'value' => (float) $ruleValue,
                        'max' => $operator === 'between' ? (float) $ruleMax : null,
                    ],
                ];
            }

            $ids[$id] = true;
            $totalWeight += (float) $weight;
            $kpis[] = [
                'id' => $id,
                'nama' => $name,
                'bobot' => (float) $weight,
                'target' => $target,
                'unit' => $unit,
                'tiers' => $tiers,
            ];
        }

        if (abs($totalWeight - 100.0) > 0.001) {
            jsonResponse(['success' => false, 'error' => "Total bobot posisi {$positionName} harus tepat 100% (saat ini {$totalWeight}%)."]);
        }
        $definitions[$positionName] = ['kpis' => $kpis];
    }

    if ($definitions === []) {
        jsonResponse(['success' => false, 'error' => 'Minimal satu posisi harus tersedia.']);
    }
    return $definitions;
}
