<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/bootstrap.php';
require_once __DIR__ . '/../src/helpers.php';

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
    $action = $payload['action'] ?? '';

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
            $_SESSION = [];
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
    $response = [
        'success' => true,
        'role' => $role,
        'currentUser' => $currentUser,
        'submissions' => loadSubmissions($role, $currentUser),
        'users' => [],
        'posisiData' => getKpiDefinitions(),
    ];

    if (isAdmin()) {
        $response['users'] = loadUsers();
    }

    jsonResponse($response);
}

function handleSubmit(array $payload): void
{
    $userRole = $_SESSION['role'] ?? 'api';
    $currentUser = $_SESSION['current_user'] ?? null;
    $selectedPosisi = trim($payload['selectedPosisi'] ?? '');
    $selectedNama = trim($payload['selectedNama'] ?? '');
    $selectedPeriode = trim($payload['selectedPeriode'] ?? '');
    $draftAnswers = $payload['draftAnswers'] ?? [];
    $draftKehadiran = $payload['draftKehadiran'] ?? ['sakit' => 0, 'izin' => 0, 'alpa' => 0, 'cuti' => 0];

    if ($userRole === 'staff' && $currentUser) {
        $selectedNama = $currentUser['nama'];
        $selectedPosisi = $currentUser['posisi'];
    }

    if ($selectedNama === '' || $selectedPosisi === '' || $selectedPeriode === '') {
        jsonResponse(['success' => false, 'error' => 'Nama, posisi, dan periode harus diisi.']);
    }

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
        $stmt = $pdo->prepare('INSERT INTO submissions (user_id, nama, posisi, periode, tanggal, status, kehadiran_sakit, kehadiran_izin, kehadiran_alpa, kehadiran_cuti, score_kpi, pct_kpi, pct_kehadiran, final_achievement, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $userId = $currentUser['id'] ?? null;
        $stmt->execute([
            $userId,
            $selectedNama,
            $selectedPosisi,
            $selectedPeriode,
            date('d M Y'),
            'Pending',
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
    if (!isLeader()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID submission tidak valid.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Approved', '', $id]);
    jsonResponse(['success' => true]);
}

function handleRevisi(array $payload): void
{
    if (!isLeader()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    $note = trim($payload['note'] ?? '');
    if ($id <= 0 || $note === '') {
        jsonResponse(['success' => false, 'error' => 'ID submission dan catatan revisi harus diisi.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Revisi', $note, $id]);
    jsonResponse(['success' => true]);
}

function handleSaveUser(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    $name = trim($payload['name'] ?? '');
    $posisi = trim($payload['posisi'] ?? '');
    $pin = trim($payload['pin'] ?? '');

    if ($name === '' || $posisi === '' || ($id <= 0 && $pin === '')) {
        jsonResponse(['success' => false, 'error' => 'Nama, posisi, dan PIN user baru harus diisi.']);
    }

    if (!isset(getKpiDefinitions()[$posisi])) {
        jsonResponse(['success' => false, 'error' => 'Posisi tidak tersedia pada pengaturan form KPI.']);
    }

    if ($pin !== '' && ($pin === PIN_ADMIN || $pin === PIN_LEADER)) {
        jsonResponse(['success' => false, 'error' => 'PIN bertabrakan dengan kode sistem.']);
    }

    if ($pin !== '') {
        if (isUserPinInUse($pin, $id)) {
            jsonResponse(['success' => false, 'error' => 'PIN sudah digunakan oleh user lain.']);
        }
    }

    $pdo = getDb();
    if ($id > 0) {
        if ($pin === '') {
            $stmt = $pdo->prepare('UPDATE users SET name = ?, posisi = ? WHERE id = ?');
            $stmt->execute([$name, $posisi, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET name = ?, posisi = ?, pin = NULL, pin_hash = ? WHERE id = ?');
            $stmt->execute([$name, $posisi, password_hash($pin, PASSWORD_DEFAULT), $id]);
        }
    } else {
        $stmt = $pdo->prepare('INSERT INTO users (name, posisi, pin, pin_hash) VALUES (?, ?, NULL, ?)');
        $stmt->execute([$name, $posisi, password_hash($pin, PASSWORD_DEFAULT)]);
    }

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

    $pdo = getDb();
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

function handleLogin(array $payload): void
{
    $pin = trim((string) ($payload['pin'] ?? ''));
    if ($pin === '') {
        jsonResponse(['success' => false, 'error' => 'PIN harus diisi.']);
    }

    if ($pin === PIN_ADMIN) {
        $_SESSION['role'] = 'admin';
        $_SESSION['current_user'] = null;
    } elseif ($pin === PIN_LEADER) {
        $_SESSION['role'] = 'leader';
        $_SESSION['current_user'] = null;
    } else {
        $user = getUserByPin($pin);
        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'PIN tidak dikenali.']);
        }
        $_SESSION['role'] = 'staff';
        $_SESSION['current_user'] = [
            'id' => (int) $user['id'],
            'nama' => $user['name'],
            'posisi' => $user['posisi'],
        ];
    }

    session_regenerate_id(true);
    rotateCsrfToken();
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
    $activePositions = array_column(loadUsers(), 'posisi');
    $missingPositions = array_values(array_diff(array_unique($activePositions), array_keys($definitions)));
    if ($missingPositions !== []) {
        jsonResponse([
            'success' => false,
            'error' => 'Posisi masih digunakan oleh user: ' . implode(', ', $missingPositions) . '.',
        ]);
    }

    backfillSubmissionDefinitionSnapshots(getKpiDefinitions());
    saveKpiDefinitions($definitions);
    jsonResponse(['success' => true, 'data' => ['posisiData' => $definitions]]);
}

function normalizeKpiDefinitions(array $rawDefinitions): array
{
    $definitions = [];
    foreach ($rawDefinitions as $positionName => $definition) {
        $positionName = trim((string) $positionName);
        if ($positionName === '' || isset($definitions[$positionName])) {
            jsonResponse(['success' => false, 'error' => 'Nama posisi wajib diisi dan harus unik.']);
        }

        $rawKpis = is_array($definition) ? ($definition['kpis'] ?? null) : null;
        if (!is_array($rawKpis) || $rawKpis === []) {
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
                || $target === ''
                || $unit === ''
                || $weight === false
                || $weight <= 0
            ) {
                jsonResponse(['success' => false, 'error' => "Data KPI ke-" . ($index + 1) . " pada {$positionName} belum lengkap."]);
            }
            if (isset($ids[$id])) {
                jsonResponse(['success' => false, 'error' => "ID KPI {$id} pada {$positionName} harus unik."]);
            }

            $rawTiers = $rawKpi['tiers'] ?? null;
            if (!is_array($rawTiers) || $rawTiers === []) {
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
