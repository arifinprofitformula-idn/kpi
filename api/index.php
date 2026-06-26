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
        case 'submitSelfActualData':
            handleSubmit($payload, true);
            break;
        case 'verifyActualData':
            handleVerifyActualData($payload);
            break;
        case 'verifyEvidence':
            handleVerifyEvidence($payload);
            break;
        case 'approveSubmissionWithEvidence':
            handleApproveSubmissionWithEvidence($payload);
            break;
        case 'updateFinalKpiDecision':
            handleUpdateFinalKpiDecision($payload);
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

function definitionHasActualDataFields(array $definition): bool
{
    foreach (($definition['kpis'] ?? []) as $kpi) {
        if (is_array($kpi['actualDataFields'] ?? null) && count($kpi['actualDataFields']) > 0) {
            return true;
        }
    }

    return false;
}

function handleSubmit(array $payload, bool $selfSubmission = false): void
{
    $userRole = $_SESSION['role'] ?? 'api';
    $currentUser = $_SESSION['current_user'] ?? null;
    $subjectUserId = $selfSubmission ? (int) ($currentUser['id'] ?? 0) : (int) ($payload['subjectUserId'] ?? 0);
    $selectedPeriode = trim($payload['selectedPeriode'] ?? '');
    $draftAnswers = $payload['draftAnswers'] ?? [];
    $draftKehadiran = $payload['draftKehadiran'] ?? ['sakit' => 0, 'izin' => 0, 'alpa' => 0, 'cuti' => 0];
    if (!is_array($draftAnswers) || !is_array($draftKehadiran)) {
        jsonResponse(['success' => false, 'error' => 'Format data KPI tidak valid.']);
    }

    if (!$currentUser) {
        jsonResponse(['success' => false, 'error' => 'Unauthorized'], 401);
    }
    if (!$selfSubmission && !in_array($userRole, ['admin', 'manager', 'supervisor'], true)) {
        jsonResponse(['success' => false, 'error' => 'Akun ini tidak memiliki akses untuk melakukan penilaian.'], 403);
    }
    if (!$selfSubmission && !evaluatorCanAssess((int) $currentUser['id'], $subjectUserId)) {
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
    if (!$selfSubmission && definitionHasActualDataFields($definitions[$selectedPosisi])) {
        jsonResponse([
            'success' => false,
            'error' => 'Input Data Aktual harus diisi oleh akun yang dinilai. Atasan hanya melakukan verifikasi dan keputusan skor.',
        ], 403);
    }

    $answers = [];
    $isValidDate = function (string $value): bool {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $matches) !== 1) {
            return false;
        }
        return checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1]);
    };
    $actualDataError = fn (array $kpi, array $field, string $message): array => [
        'success' => false,
        'error' => "Input Data Aktual untuk KPI {$kpi['nama']} belum lengkap: {$field['label']} {$message}.",
    ];
    foreach ($definitions[$selectedPosisi]['kpis'] as $kpi) {
        $draftAnswer = is_array($draftAnswers[$kpi['id']] ?? null) ? $draftAnswers[$kpi['id']] : [];
        $actualDataFields = is_array($kpi['actualDataFields'] ?? null) ? $kpi['actualDataFields'] : [];
        $submittedActualData = is_array($draftAnswer['actualData'] ?? null) ? $draftAnswer['actualData'] : [];
        $actualValueInput = $draftAnswer['actualValue'] ?? null;
        $actualValueSourceFieldId = trim((string) ($kpi['actualValueSourceFieldId'] ?? ''));
        $actualValueSourceField = null;
        if ($actualValueSourceFieldId !== '') {
            $sourceFieldFound = false;
            foreach ($actualDataFields as $field) {
                if (($field['id'] ?? '') !== $actualValueSourceFieldId) {
                    continue;
                }
                $actualValueSourceField = $field;
                $sourceFieldFound = true;
                $fieldType = (string) ($field['type'] ?? 'text');
                if (!in_array($fieldType, ['number', 'percent', 'currency'], true)) {
                    jsonResponse([
                        'success' => false,
                        'error' => "Sumber nilai aktual untuk KPI {$kpi['nama']} harus bertipe angka, percent, atau currency.",
                    ]);
                }
                $sourcePayload = $submittedActualData[$actualValueSourceFieldId] ?? [];
                $actualValueInput = is_array($sourcePayload)
                    ? ($sourcePayload['valueNumber'] ?? '')
                    : $sourcePayload;
                break;
            }
            if (!$sourceFieldFound) {
                jsonResponse([
                    'success' => false,
                    'error' => "Sumber nilai aktual untuk KPI {$kpi['nama']} tidak ditemukan pada Input Data Aktual.",
                ]);
            }
        }
        if ($actualValueInput === null || $actualValueInput === '') {
            if ($actualValueSourceField !== null) {
                jsonResponse($actualDataError($kpi, $actualValueSourceField, 'wajib diisi sebagai sumber nilai aktual'));
            }
            jsonResponse(['success' => false, 'error' => "Nilai aktual untuk KPI {$kpi['nama']} belum diisi."]);
        }

        $actualValue = filter_var($actualValueInput, FILTER_VALIDATE_FLOAT);
        if ($actualValue === false || !is_finite((float) $actualValue)) {
            if ($actualValueSourceField !== null) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$actualValueSourceField['label']} harus berupa angka.",
                ]);
            }
            jsonResponse(['success' => false, 'error' => "Nilai aktual untuk KPI {$kpi['nama']} harus berupa angka."]);
        }

        $matchedTier = calculateKpiTier($kpi, (float) $actualValue);
        if (!$matchedTier) {
            jsonResponse([
                'success' => false,
                'error' => "Nilai aktual {$actualValue} untuk KPI {$kpi['nama']} tidak masuk ke formula skor mana pun. Hubungi Admin.",
            ]);
        }
        $actualData = [];
        foreach ($actualDataFields as $fieldIndex => $field) {
            $fieldId = trim((string) ($field['id'] ?? ''));
            if ($fieldId === '') {
                continue;
            }
            $fieldLabel = (string) ($field['label'] ?? $fieldId);
            $field['label'] = $fieldLabel;
            $fieldType = (string) ($field['type'] ?? 'text');
            $payloadValue = $submittedActualData[$fieldId] ?? [];
            if (is_array($payloadValue)) {
                $valueText = trim((string) ($payloadValue['valueText'] ?? ''));
                $valueNumber = $payloadValue['valueNumber'] ?? '';
                $valueDate = trim((string) ($payloadValue['valueDate'] ?? ''));
                $sourceDocument = trim((string) ($payloadValue['sourceDocument'] ?? ''));
                $dataDate = trim((string) ($payloadValue['dataDate'] ?? ''));
                $submittedNote = trim((string) ($payloadValue['submittedNote'] ?? ''));
            } else {
                $valueText = trim((string) $payloadValue);
                $valueNumber = $payloadValue;
                $valueDate = trim((string) $payloadValue);
                $sourceDocument = '';
                $dataDate = '';
                $submittedNote = '';
            }

            $value = match ($fieldType) {
                'number', 'percent', 'currency' => $valueNumber,
                'date' => $valueDate,
                default => $valueText,
            };
            $value = is_scalar($value) ? trim((string) $value) : '';
            $isRequired = (bool) ($field['required'] ?? false);
            if ($isRequired && $value === '') {
                jsonResponse($actualDataError($kpi, $field, 'wajib diisi'));
            }
            $maxValueLength = $fieldType === 'textarea' ? 3000 : 500;
            if (strlen($value) > $maxValueLength) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} maksimal {$maxValueLength} karakter.",
                ]);
            }
            if (($field['sourceRequired'] ?? false) && $sourceDocument === '') {
                jsonResponse($actualDataError($kpi, $field, 'source document wajib diisi'));
            }
            if (($field['dataDateRequired'] ?? false) && $dataDate === '') {
                jsonResponse($actualDataError($kpi, $field, 'data date wajib diisi'));
            }
            if (strlen($sourceDocument) > 2048) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} source document maksimal 2048 karakter.",
                ]);
            }
            if (strlen($submittedNote) > 2000) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} submitted note maksimal 2000 karakter.",
                ]);
            }
            if (
                preg_match('/^https?:\/\//i', $sourceDocument) === 1
                && (
                    filter_var($sourceDocument, FILTER_VALIDATE_URL) === false
                    || !in_array(strtolower((string) parse_url($sourceDocument, PHP_URL_SCHEME)), ['http', 'https'], true)
                )
            ) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} source document harus URL HTTP/HTTPS yang valid.",
                ]);
            }
            if ($fieldType === 'date' && $valueDate !== '' && !$isValidDate($valueDate)) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} value date tidak valid.",
                ]);
            }
            if ($dataDate !== '' && !$isValidDate($dataDate)) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} data date tidak valid.",
                ]);
            }
            if (in_array($fieldType, ['number', 'percent', 'currency'], true) && $value !== '') {
                $numericValue = filter_var($value, FILTER_VALIDATE_FLOAT);
                if ($numericValue === false || !is_finite((float) $numericValue)) {
                    jsonResponse([
                        'success' => false,
                        'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} harus berupa angka.",
                    ]);
                }
                $value = (string) (float) $numericValue;
                $valueNumber = $value;
            }
            if ($fieldType === 'url' && $value !== '' && (
                filter_var($value, FILTER_VALIDATE_URL) === false
                || !in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true)
            )) {
                jsonResponse([
                    'success' => false,
                    'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} harus URL HTTP/HTTPS.",
                ]);
            }
            if ($fieldType === 'boolean' && $value !== '') {
                $normalizedBool = match (strtolower($value)) {
                    '1', 'true', 'ya', 'yes' => '1',
                    '0', 'false', 'tidak', 'no' => '0',
                    default => null,
                };
                if ($normalizedBool === null) {
                    jsonResponse([
                        'success' => false,
                        'error' => "Input Data Aktual untuk KPI {$kpi['nama']} tidak valid: {$fieldLabel} harus Ya atau Tidak.",
                    ]);
                }
                $value = $normalizedBool;
                $valueText = $normalizedBool;
            }
            $verificationRequired = (bool) ($field['verificationRequired'] ?? true);
            $usedAsActualValue = (bool) ($field['usedAsActualValue'] ?? false) || $fieldId === $actualValueSourceFieldId;
            $actualData[] = [
                'id' => $fieldId,
                'fieldId' => $fieldId,
                'label' => $fieldLabel,
                'fieldLabel' => $fieldLabel,
                'type' => $fieldType,
                'fieldType' => $fieldType,
                'unit' => (string) ($field['unit'] ?? ''),
                'fieldUnit' => (string) ($field['unit'] ?? ''),
                'sortOrder' => $fieldIndex + 1,
                'value' => $value,
                'valueText' => $fieldType === 'date' || in_array($fieldType, ['number', 'percent', 'currency'], true) ? '' : $valueText,
                'valueNumber' => in_array($fieldType, ['number', 'percent', 'currency'], true) && $value !== '' ? (float) $value : null,
                'valueDate' => $fieldType === 'date' ? $valueDate : '',
                'sourceDocument' => $sourceDocument !== '' ? $sourceDocument : null,
                'dataDate' => $dataDate !== '' ? $dataDate : null,
                'submittedNote' => $submittedNote !== '' ? $submittedNote : null,
                'isRequired' => (bool) ($field['required'] ?? false),
                'sourceRequired' => (bool) ($field['sourceRequired'] ?? false),
                'dataDateRequired' => (bool) ($field['dataDateRequired'] ?? false),
                'verificationRequired' => $verificationRequired,
                'usedAsActualValue' => $usedAsActualValue,
                'verificationStatus' => $verificationRequired ? 'pending' : 'not_required',
            ];
        }
        $actualDataStatus = 'not_required';
        if ($actualData !== []) {
            $actualDataStatus = array_filter($actualData, fn ($item) => $item['verificationRequired']) !== []
                ? 'pending'
                : 'verified';
        }
        $actualDataJson = json_encode($actualData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($actualDataJson === false) {
            throw new RuntimeException('Input data aktual tidak dapat disimpan.');
        }

        $link = trim((string) ($draftAnswer['link'] ?? ''));
        if (strlen($link) > 2048) {
            jsonResponse(['success' => false, 'error' => "Link bukti untuk KPI {$kpi['nama']} terlalu panjang."]);
        }
        if ($link !== '' && (
            filter_var($link, FILTER_VALIDATE_URL) === false
            || !in_array(strtolower((string) parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true)
        )) {
            jsonResponse(['success' => false, 'error' => "Link bukti untuk KPI {$kpi['nama']} harus berupa URL HTTP/HTTPS."]);
        }
        $notes = trim((string) ($draftAnswer['notes'] ?? ''));
        if (strlen($notes) > 2000) {
            jsonResponse(['success' => false, 'error' => "Catatan bukti untuk KPI {$kpi['nama']} maksimal 2000 karakter."]);
        }
        $achievementNote = trim((string) ($draftAnswer['achievementNote'] ?? ''));
        if (strlen($achievementNote) > 3000) {
            jsonResponse(['success' => false, 'error' => "Catatan pencapaian untuk KPI {$kpi['nama']} maksimal 3000 karakter."]);
        }
        $requiredChecklist = is_array($kpi['evidenceChecklist'] ?? null) ? array_values(array_filter(
            array_map(fn ($item) => trim((string) $item), $kpi['evidenceChecklist']),
            fn ($item) => $item !== ''
        )) : [];
        $hasActualDataSourceEvidence = $selfSubmission
            && $actualDataFields !== []
            && array_filter($actualDataFields, fn ($field) => (bool) ($field['sourceRequired'] ?? false)) !== [];
        if ($hasActualDataSourceEvidence) {
            $requiredChecklist = [];
        }
        $submittedChecklist = is_array($draftAnswer['checklist'] ?? null)
            ? array_values(array_filter(
                array_map(fn ($item) => trim((string) $item), $draftAnswer['checklist']),
                fn ($item) => $item !== ''
            ))
            : [];
        $submittedChecklist = array_values(array_intersect($requiredChecklist, $submittedChecklist));
        foreach ($requiredChecklist as $requiredItem) {
            if (!in_array($requiredItem, $submittedChecklist, true)) {
                jsonResponse(['success' => false, 'error' => "Checklist bukti untuk KPI {$kpi['nama']} belum lengkap."]);
            }
        }
        $checklistJson = json_encode($submittedChecklist, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($checklistJson === false) {
            throw new RuntimeException('Checklist bukti tidak dapat disimpan.');
        }

        $answers[] = [
            'id' => $kpi['id'],
            'tier' => (int) $matchedTier['skor'],
            'calculatedTier' => (int) $matchedTier['skor'],
            'finalTier' => $selfSubmission ? null : (int) $matchedTier['skor'],
            'actualValue' => (float) $actualValue,
            'actualData' => $actualData,
            'actualDataJson' => $actualDataJson,
            'actualDataStatus' => $actualDataStatus,
            'link' => $link,
            'notes' => $notes,
            'achievementNote' => $achievementNote,
            'evidenceStatus' => $requiredChecklist === [] ? 'not_required' : 'pending',
            'requiredChecklist' => $requiredChecklist,
            'submittedChecklist' => $submittedChecklist,
            'checklistJson' => $checklistJson,
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
            $selfSubmission ? null : (int) $currentUser['id'],
            $selectedNama,
            $selectedPosisi,
            $selectedPeriode,
            date('d M Y'),
            'Submitted',
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
        $insertAnswer = $pdo->prepare(
            'INSERT INTO submission_answers
             (submission_id, kpi_id, tier, calculated_tier, final_tier, actual_value, actual_data_json,
              actual_data_status, link, evidence_notes, evidence_checklist_json, achievement_note, evidence_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insertActualData = $pdo->prepare(
            'INSERT INTO submission_answer_actual_data
             (submission_answer_id, field_id, field_label, field_type, field_unit, sort_order,
              is_required, source_required, data_date_required, verification_required, used_as_actual_value,
              value_text, value_number, value_date, source_document, data_date, submitted_note,
              verification_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insertEvidence = $pdo->prepare(
            'INSERT INTO submission_answer_evidences
             (submission_answer_id, requirement_id, requirement_label, expected_format, evidence_url, submitted_note, is_submitted)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($answers as $answer) {
            $insertAnswer->execute([
                $submissionId,
                $answer['id'],
                $answer['tier'],
                $answer['calculatedTier'],
                $answer['finalTier'],
                $answer['actualValue'],
                $answer['actualDataJson'],
                $answer['actualDataStatus'],
                $answer['link'],
                $answer['notes'],
                $answer['checklistJson'],
                $answer['achievementNote'],
                $answer['evidenceStatus'],
            ]);
            $answerId = (int) $pdo->lastInsertId();
            foreach ($answer['actualData'] as $actualDataItem) {
                $insertActualData->execute([
                    $answerId,
                    $actualDataItem['fieldId'],
                    $actualDataItem['fieldLabel'],
                    $actualDataItem['fieldType'],
                    $actualDataItem['fieldUnit'] !== '' ? $actualDataItem['fieldUnit'] : null,
                    $actualDataItem['sortOrder'],
                    $actualDataItem['isRequired'] ? 1 : 0,
                    $actualDataItem['sourceRequired'] ? 1 : 0,
                    $actualDataItem['dataDateRequired'] ? 1 : 0,
                    $actualDataItem['verificationRequired'] ? 1 : 0,
                    $actualDataItem['usedAsActualValue'] ? 1 : 0,
                    $actualDataItem['valueText'] !== '' ? $actualDataItem['valueText'] : null,
                    $actualDataItem['valueNumber'],
                    $actualDataItem['valueDate'] !== '' ? $actualDataItem['valueDate'] : null,
                    $actualDataItem['sourceDocument'],
                    $actualDataItem['dataDate'],
                    $actualDataItem['submittedNote'],
                    $actualDataItem['verificationStatus'],
                ]);
            }
            foreach ($answer['requiredChecklist'] as $index => $requirementLabel) {
                $insertEvidence->execute([
                    $answerId,
                    $answer['id'] . ':' . ($index + 1),
                    $requirementLabel,
                    '',
                    $answer['link'],
                    $answer['notes'],
                    in_array($requirementLabel, $answer['submittedChecklist'], true) ? 1 : 0,
                ]);
            }
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
    handleApproveSubmissionWithEvidence($payload);
}

function syncAnswerEvidenceStatus(PDO $pdo, int $submissionAnswerId): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                SUM(CASE WHEN verification_status = ? THEN 1 ELSE 0 END) AS verified_count,
                SUM(CASE WHEN verification_status = ? THEN 1 ELSE 0 END) AS rejected_count
         FROM submission_answer_evidences WHERE submission_answer_id = ?'
    );
    $stmt->execute(['verified', 'rejected', $submissionAnswerId]);
    $status = $stmt->fetch();
    $total = (int) ($status['total'] ?? 0);
    $verified = (int) ($status['verified_count'] ?? 0);
    $rejected = (int) ($status['rejected_count'] ?? 0);
    $evidenceStatus = 'not_required';
    if ($total > 0) {
        $evidenceStatus = $rejected > 0 ? 'rejected' : ($verified === $total ? 'verified' : 'pending');
    }
    $update = $pdo->prepare('UPDATE submission_answers SET evidence_status = ? WHERE id = ?');
    $update->execute([$evidenceStatus, $submissionAnswerId]);
}

function syncAnswerActualDataStatus(PDO $pdo, int $submissionAnswerId): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total,
                SUM(CASE WHEN verification_required = 1 THEN 1 ELSE 0 END) AS required_count,
                SUM(CASE WHEN verification_required = 1 AND verification_status = ? THEN 1 ELSE 0 END) AS verified_count,
                SUM(CASE WHEN verification_required = 1 AND verification_status = ? THEN 1 ELSE 0 END) AS rejected_count
         FROM submission_answer_actual_data WHERE submission_answer_id = ?'
    );
    $stmt->execute(['verified', 'rejected', $submissionAnswerId]);
    $status = $stmt->fetch();
    $total = (int) ($status['total'] ?? 0);
    $required = (int) ($status['required_count'] ?? 0);
    $verified = (int) ($status['verified_count'] ?? 0);
    $rejected = (int) ($status['rejected_count'] ?? 0);
    $actualDataStatus = 'not_required';
    if ($total > 0) {
        $actualDataStatus = $required === 0 ? 'verified' : ($rejected > 0 ? 'rejected' : ($verified === $required ? 'verified' : 'pending'));
    }
    $update = $pdo->prepare('UPDATE submission_answers SET actual_data_status = ? WHERE id = ?');
    $update->execute([$actualDataStatus, $submissionAnswerId]);
}

function recalculateSubmissionScores(PDO $pdo, int $submissionId): void
{
    $submissionStmt = $pdo->prepare(
        'SELECT posisi, kehadiran_sakit, kehadiran_izin, kehadiran_alpa, kehadiran_cuti
         FROM submissions WHERE id = ? LIMIT 1'
    );
    $submissionStmt->execute([$submissionId]);
    $submission = $submissionStmt->fetch();
    if (!$submission) {
        throw new RuntimeException('Submission tidak ditemukan untuk kalkulasi ulang.');
    }
    $definition = loadSubmissionDefinitionSnapshot($submissionId);
    if (!$definition) {
        $definitions = getKpiDefinitions();
        $definition = $definitions[$submission['posisi']] ?? ['kpis' => []];
    }
    $answerStmt = $pdo->prepare(
        'SELECT kpi_id AS id, tier, final_tier AS finalTier
         FROM submission_answers WHERE submission_id = ?'
    );
    $answerStmt->execute([$submissionId]);
    $answers = $answerStmt->fetchAll();
    $scoreCalc = calcScore($submission['posisi'], $answers, [
        'sakit' => (int) $submission['kehadiran_sakit'],
        'izin' => (int) $submission['kehadiran_izin'],
        'alpa' => (int) $submission['kehadiran_alpa'],
        'cuti' => (int) $submission['kehadiran_cuti'],
    ], [$submission['posisi'] => $definition]);
    $update = $pdo->prepare(
        'UPDATE submissions
         SET score_kpi = ?, pct_kpi = ?, pct_kehadiran = ?, final_achievement = ?
         WHERE id = ?'
    );
    $update->execute([
        $scoreCalc['scoreKPI'],
        $scoreCalc['pctFromKPI'],
        $scoreCalc['kehadiranPct'],
        $scoreCalc['finalAchievement'],
        $submissionId,
    ]);
}

function handleVerifyActualData(array $payload): void
{
    $actualDataId = intval($payload['actualDataId'] ?? 0);
    $status = trim((string) ($payload['status'] ?? ''));
    $note = trim((string) ($payload['note'] ?? ''));
    $currentUser = $_SESSION['current_user'] ?? null;
    $currentUserId = isset($currentUser['id']) ? (int) $currentUser['id'] : null;

    if ($actualDataId <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID actual data tidak valid.']);
    }
    if (!in_array($status, ['verified', 'rejected'], true)) {
        jsonResponse(['success' => false, 'error' => 'Status actual data tidak valid.']);
    }
    if ($status === 'rejected' && $note === '') {
        jsonResponse(['success' => false, 'error' => 'Catatan wajib diisi saat actual data ditolak.']);
    }
    if (strlen($note) > 2000) {
        jsonResponse(['success' => false, 'error' => 'Catatan verifikasi actual data maksimal 2000 karakter.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare(
        'SELECT actual.id, actual.field_label, actual.verification_status, actual.verifier_note,
                answer.id AS answer_id, submissions.id AS submission_id, submissions.user_id,
                submissions.status AS submission_status
         FROM submission_answer_actual_data actual
         INNER JOIN submission_answers answer ON answer.id = actual.submission_answer_id
         INNER JOIN submissions ON submissions.id = answer.submission_id
         WHERE actual.id = ? LIMIT 1'
    );
    $stmt->execute([$actualDataId]);
    $actualData = $stmt->fetch();
    if (!$actualData) {
        jsonResponse(['success' => false, 'error' => 'Actual data tidak ditemukan.'], 404);
    }
    if ($actualData['submission_status'] === 'Approved') {
        jsonResponse(['success' => false, 'error' => 'Submission sudah Approved dan terkunci.'], 423);
    }

    $canVerify = isAdmin()
        || ($currentUserId !== null && evaluatorCanAssess($currentUserId, (int) $actualData['user_id']));
    if (!$canVerify) {
        jsonResponse(['success' => false, 'error' => 'Akses verifikasi actual data ditolak.'], 403);
    }

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare(
            'UPDATE submission_answer_actual_data
             SET verification_status = ?, verifier_note = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        $update->execute([$status, $note, $currentUserId, $actualDataId]);
        syncAnswerActualDataStatus($pdo, (int) $actualData['answer_id']);
        recordSubmissionAudit(
            (int) $actualData['submission_id'],
            (int) $actualData['answer_id'],
            $currentUserId,
            $status === 'verified' ? 'actual_data_verified' : 'actual_data_rejected',
            ['status' => $actualData['verification_status'], 'note' => $actualData['verifier_note']],
            ['status' => $status, 'note' => $note, 'fieldLabel' => $actualData['field_label']],
            $note
        );
        $pdo->commit();
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }
    securityAudit($status === 'verified' ? 'actual_data_verified' : 'actual_data_rejected', [
        'actual_data_id' => $actualDataId,
        'status' => $status,
    ]);
    if ($selfSubmission) {
        securityAudit('self_actual_data_submitted', ['submission_id' => $submissionId ?? null]);
    }

    jsonResponse(['success' => true]);
}

function handleVerifyEvidence(array $payload): void
{
    $evidenceId = intval($payload['evidenceId'] ?? 0);
    $status = trim((string) ($payload['status'] ?? ''));
    $note = trim((string) ($payload['note'] ?? ''));
    $currentUser = $_SESSION['current_user'] ?? null;
    $currentUserId = isset($currentUser['id']) ? (int) $currentUser['id'] : null;

    if ($evidenceId <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID evidence tidak valid.']);
    }
    if (!in_array($status, ['verified', 'rejected'], true)) {
        jsonResponse(['success' => false, 'error' => 'Status evidence tidak valid.']);
    }
    if ($status === 'rejected' && $note === '') {
        jsonResponse(['success' => false, 'error' => 'Catatan wajib diisi saat evidence ditolak.']);
    }
    if (strlen($note) > 2000) {
        jsonResponse(['success' => false, 'error' => 'Catatan verifikasi maksimal 2000 karakter.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare(
        'SELECT evidence.id, evidence.verification_status, evidence.verifier_note,
                answer.id AS answer_id, submissions.id AS submission_id, submissions.user_id, submissions.status AS submission_status
         FROM submission_answer_evidences evidence
         INNER JOIN submission_answers answer ON answer.id = evidence.submission_answer_id
         INNER JOIN submissions ON submissions.id = answer.submission_id
         WHERE evidence.id = ? LIMIT 1'
    );
    $stmt->execute([$evidenceId]);
    $evidence = $stmt->fetch();
    if (!$evidence) {
        jsonResponse(['success' => false, 'error' => 'Evidence tidak ditemukan.'], 404);
    }
    if ($evidence['submission_status'] === 'Approved') {
        jsonResponse(['success' => false, 'error' => 'Submission sudah Approved dan terkunci.'], 423);
    }

    $canVerify = isAdmin()
        || ($currentUserId !== null && evaluatorCanAssess($currentUserId, (int) $evidence['user_id']));
    if (!$canVerify) {
        jsonResponse(['success' => false, 'error' => 'Akses verifikasi evidence ditolak.'], 403);
    }

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare(
            'UPDATE submission_answer_evidences
             SET is_verified = ?, verification_status = ?, verifier_note = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        $update->execute([
            $status === 'verified' ? 1 : 0,
            $status,
            $note,
            $currentUserId,
            $evidenceId,
        ]);
        syncAnswerEvidenceStatus($pdo, (int) $evidence['answer_id']);
        recordSubmissionAudit(
            (int) $evidence['submission_id'],
            (int) $evidence['answer_id'],
            $currentUserId,
            $status === 'verified' ? 'evidence_verified' : 'evidence_rejected',
            ['status' => $evidence['verification_status'], 'note' => $evidence['verifier_note']],
            ['status' => $status, 'note' => $note],
            $note
        );
        $pdo->commit();
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }
    securityAudit($status === 'verified' ? 'evidence_verified' : 'evidence_rejected', [
        'evidence_id' => $evidenceId,
        'status' => $status,
    ]);
    jsonResponse(['success' => true]);
}

function handleApproveSubmissionWithEvidence(array $payload): void
{
    if (!isAdmin()) {
        jsonResponse(['success' => false, 'error' => 'Akses ditolak.'], 403);
    }

    $id = intval($payload['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'ID submission tidak valid.']);
    }

    $pdo = getDb();
    $submissionStmt = $pdo->prepare('SELECT id, posisi, status FROM submissions WHERE id = ? LIMIT 1');
    $submissionStmt->execute([$id]);
    $submission = $submissionStmt->fetch();
    if (!$submission) {
        jsonResponse(['success' => false, 'error' => 'Submission tidak ditemukan.'], 404);
    }
    if ($submission['status'] === 'Approved') {
        jsonResponse(['success' => false, 'error' => 'Submission sudah Approved.'], 409);
    }

    $definition = loadSubmissionDefinitionSnapshot($id);
    if (!$definition) {
        $definitions = getKpiDefinitions();
        $definition = $definitions[$submission['posisi']] ?? ['kpis' => []];
    }
    $requiredEvidenceCount = 0;
    $requiredActualDataFields = [];
    foreach (($definition['kpis'] ?? []) as $kpi) {
        $requiredEvidenceCount += count(array_filter(
            array_map(fn ($item) => trim((string) $item), $kpi['evidenceChecklist'] ?? []),
            fn ($item) => $item !== ''
        ));
        $kpiId = (string) ($kpi['id'] ?? '');
        if ($kpiId === '') {
            continue;
        }
        foreach (($kpi['actualDataFields'] ?? []) as $field) {
            if (!is_array($field) || !($field['verificationRequired'] ?? true)) {
                continue;
            }
            $fieldId = trim((string) ($field['id'] ?? ''));
            if ($fieldId === '') {
                continue;
            }
            $requiredActualDataFields[] = [
                'kpiId' => $kpiId,
                'kpiName' => (string) ($kpi['nama'] ?? $kpiId),
                'fieldId' => $fieldId,
                'fieldLabel' => (string) ($field['label'] ?? $fieldId),
            ];
        }
    }

    $evidenceStmt = $pdo->prepare(
        'SELECT
            COUNT(evidence.id) AS total_evidence,
            SUM(CASE WHEN evidence.is_submitted = 0 OR evidence.verification_status <> ? THEN 1 ELSE 0 END) AS incomplete_evidence
         FROM submission_answers answer
         LEFT JOIN submission_answer_evidences evidence ON evidence.submission_answer_id = answer.id
         WHERE answer.submission_id = ?'
    );
    $evidenceStmt->execute(['verified', $id]);
    $evidenceStatus = $evidenceStmt->fetch();
    $totalEvidence = (int) ($evidenceStatus['total_evidence'] ?? 0);
    $incompleteEvidence = (int) ($evidenceStatus['incomplete_evidence'] ?? 0);
    $evidenceTrackingStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM submission_answers
         WHERE submission_id = ? AND evidence_status <> 'not_required'"
    );
    $evidenceTrackingStmt->execute([$id]);
    $hasEvidenceTracking = $totalEvidence > 0 || (int) $evidenceTrackingStmt->fetchColumn() > 0;
    if ($hasEvidenceTracking && $requiredEvidenceCount > 0 && ($totalEvidence < $requiredEvidenceCount || $incompleteEvidence > 0)) {
        jsonResponse([
            'success' => false,
            'error' => 'Approval ditolak: seluruh evidence wajib harus berstatus verified terlebih dahulu.',
        ]);
    }
    $kpiNames = [];
    foreach (($definition['kpis'] ?? []) as $kpi) {
        $kpiNames[(string) ($kpi['id'] ?? '')] = (string) ($kpi['nama'] ?? $kpi['id'] ?? 'KPI');
    }
    $actualDataGateStmt = $pdo->prepare(
        'SELECT answer.kpi_id, actual.field_label, actual.verification_status
         FROM submission_answer_actual_data actual
         INNER JOIN submission_answers answer ON answer.id = actual.submission_answer_id
         WHERE answer.submission_id = ?
           AND actual.verification_required = 1
           AND actual.verification_status <> ?
         ORDER BY answer.id ASC, actual.sort_order ASC, actual.id ASC
         LIMIT 1'
    );
    $actualDataGateStmt->execute([$id, 'verified']);
    $incompleteActualData = $actualDataGateStmt->fetch();
    if ($incompleteActualData) {
        $kpiName = $kpiNames[$incompleteActualData['kpi_id']] ?? $incompleteActualData['kpi_id'];
        jsonResponse([
            'success' => false,
            'error' => "Approval ditolak: Input Data Aktual {$incompleteActualData['field_label']} pada KPI {$kpiName} harus verified terlebih dahulu.",
        ]);
    }
    $actualDataTrackingStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM submission_answers
         WHERE submission_id = ? AND actual_data_status <> 'not_required'"
    );
    $actualDataTrackingStmt->execute([$id]);
    if ($requiredActualDataFields !== [] && (int) $actualDataTrackingStmt->fetchColumn() > 0) {
        $actualRowsStmt = $pdo->prepare(
            'SELECT answer.kpi_id, actual.field_id, actual.verification_status
             FROM submission_answer_actual_data actual
             INNER JOIN submission_answers answer ON answer.id = actual.submission_answer_id
             WHERE answer.submission_id = ?'
        );
        $actualRowsStmt->execute([$id]);
        $actualRows = [];
        foreach ($actualRowsStmt->fetchAll() as $row) {
            $actualRows[(string) $row['kpi_id']][(string) $row['field_id']] = (string) $row['verification_status'];
        }
        foreach ($requiredActualDataFields as $field) {
            $rowStatus = $actualRows[$field['kpiId']][$field['fieldId']] ?? '';
            if ($rowStatus !== 'verified') {
                jsonResponse([
                    'success' => false,
                    'error' => "Approval ditolak: Input Data Aktual {$field['fieldLabel']} pada KPI {$field['kpiName']} harus verified terlebih dahulu.",
                ]);
            }
        }
    }
    $finalTierStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM submission_answers
         WHERE submission_id = ? AND final_tier IS NULL'
    );
    $finalTierStmt->execute([$id]);
    if ((int) $finalTierStmt->fetchColumn() > 0) {
        jsonResponse([
            'success' => false,
            'error' => 'Approval ditolak: seluruh final score KPI harus disimpan terlebih dahulu.',
        ]);
    }

    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Approved', '', $id]);
    $actorUserId = isset($_SESSION['current_user']['id']) ? (int) $_SESSION['current_user']['id'] : null;
    recordSubmissionAudit($id, null, $actorUserId, 'submission_approved', ['status' => $submission['status']], ['status' => 'Approved'], '');
    securityAudit('submission_approved_with_evidence', ['submission_id' => $id]);
    jsonResponse(['success' => true]);
}

function handleUpdateFinalKpiDecision(array $payload): void
{
    $answerId = intval($payload['submissionAnswerId'] ?? 0);
    $finalTier = filter_var($payload['finalTier'] ?? null, FILTER_VALIDATE_INT);
    $decisionReason = trim((string) ($payload['decisionReason'] ?? ''));
    $coachingNote = trim((string) ($payload['coachingNote'] ?? ''));
    $currentUserId = isset($_SESSION['current_user']['id']) ? (int) $_SESSION['current_user']['id'] : null;

    if ($answerId <= 0 || $finalTier === false || !in_array($finalTier, [0, 1, 2], true)) {
        jsonResponse(['success' => false, 'error' => 'Data final score tidak valid.']);
    }
    if (strlen($decisionReason) > 3000 || strlen($coachingNote) > 3000) {
        jsonResponse(['success' => false, 'error' => 'Decision reason dan coaching note maksimal 3000 karakter.']);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare(
        'SELECT answer.*, submissions.id AS submission_id, submissions.user_id,
                submissions.posisi, submissions.status AS submission_status
         FROM submission_answers answer
         INNER JOIN submissions ON submissions.id = answer.submission_id
         WHERE answer.id = ? LIMIT 1'
    );
    $stmt->execute([$answerId]);
    $answer = $stmt->fetch();
    if (!$answer) {
        jsonResponse(['success' => false, 'error' => 'Submission answer tidak ditemukan.'], 404);
    }
    if ($answer['submission_status'] === 'Approved') {
        jsonResponse(['success' => false, 'error' => 'Submission sudah Approved dan terkunci.'], 423);
    }

    $canUpdate = isAdmin()
        || ($currentUserId !== null && evaluatorCanAssess($currentUserId, (int) $answer['user_id']));
    if (!$canUpdate) {
        jsonResponse(['success' => false, 'error' => 'Akses update final score ditolak.'], 403);
    }

    $calculatedTier = $answer['calculated_tier'] !== null ? (int) $answer['calculated_tier'] : (int) $answer['tier'];
    if ($finalTier !== $calculatedTier && $decisionReason === '') {
        jsonResponse(['success' => false, 'error' => 'Decision reason wajib diisi saat final score berbeda dari calculated score.']);
    }
    if ($finalTier === 2) {
        $definition = loadSubmissionDefinitionSnapshot((int) $answer['submission_id']);
        if (!$definition) {
            $definitions = getKpiDefinitions();
            $definition = $definitions[$answer['posisi']] ?? ['kpis' => []];
        }
        $kpiDefinition = null;
        foreach (($definition['kpis'] ?? []) as $definitionKpi) {
            if ((string) ($definitionKpi['id'] ?? '') === (string) $answer['kpi_id']) {
                $kpiDefinition = $definitionKpi;
                break;
            }
        }
        $requiredEvidence = [];
        if (is_array($kpiDefinition)) {
            $requiredEvidence = array_values(array_filter(
                array_map(fn ($item) => trim((string) $item), $kpiDefinition['evidenceChecklist'] ?? []),
                fn ($item) => $item !== ''
            ));
        }
        $evidenceStmt = $pdo->prepare(
            'SELECT COUNT(*) AS total,
                    SUM(CASE WHEN is_submitted = 0 OR verification_status <> ? THEN 1 ELSE 0 END) AS incomplete
             FROM submission_answer_evidences WHERE submission_answer_id = ?'
        );
        $evidenceStmt->execute(['verified', $answerId]);
        $evidence = $evidenceStmt->fetch();
        if (
            $answer['evidence_status'] !== 'not_required'
            &&
            count($requiredEvidence) > 0
            && ((int) ($evidence['total'] ?? 0) < count($requiredEvidence) || (int) ($evidence['incomplete'] ?? 0) > 0)
        ) {
            jsonResponse(['success' => false, 'error' => 'Final score 2 hanya dapat disimpan setelah required evidence verified.']);
        }
        if ($answer['actual_data_status'] !== 'not_required') {
            $actualDataStmt = $pdo->prepare(
                'SELECT field_id, field_label, verification_status
                 FROM submission_answer_actual_data
                 WHERE submission_answer_id = ?
                   AND verification_required = 1
                 ORDER BY sort_order ASC, id ASC
                '
            );
            $actualDataStmt->execute([$answerId]);
            $actualRows = [];
            foreach ($actualDataStmt->fetchAll() as $row) {
                $actualRows[(string) $row['field_id']] = [
                    'label' => (string) $row['field_label'],
                    'status' => (string) $row['verification_status'],
                ];
                if ((string) $row['verification_status'] !== 'verified') {
                    jsonResponse(['success' => false, 'error' => "Final score 2 hanya dapat disimpan setelah Input Data Aktual {$row['field_label']} verified."]);
                }
            }
            if (is_array($kpiDefinition)) {
                foreach (($kpiDefinition['actualDataFields'] ?? []) as $field) {
                    if (!is_array($field) || !($field['verificationRequired'] ?? true)) {
                        continue;
                    }
                    $fieldId = trim((string) ($field['id'] ?? ''));
                    if ($fieldId === '') {
                        continue;
                    }
                    if (($actualRows[$fieldId]['status'] ?? '') !== 'verified') {
                        $fieldLabel = (string) ($field['label'] ?? $fieldId);
                        jsonResponse(['success' => false, 'error' => "Final score 2 hanya dapat disimpan setelah Input Data Aktual {$fieldLabel} verified."]);
                    }
                }
            }
        }
    }

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare(
            'UPDATE submission_answers
             SET final_tier = ?, tier = ?, decision_reason = ?, coaching_note = ?
             WHERE id = ?'
        );
        $update->execute([$finalTier, $finalTier, $decisionReason, $coachingNote, $answerId]);
        recalculateSubmissionScores($pdo, (int) $answer['submission_id']);
        if ($answer['submission_status'] !== 'Approved') {
            $statusUpdate = $pdo->prepare('UPDATE submissions SET status = ? WHERE id = ?');
            $statusUpdate->execute(['Evidence Reviewed', (int) $answer['submission_id']]);
        }
        recordSubmissionAudit(
            (int) $answer['submission_id'],
            $answerId,
            $currentUserId,
            'final_tier_updated',
            [
                'finalTier' => $answer['final_tier'] !== null ? (int) $answer['final_tier'] : null,
                'decisionReason' => $answer['decision_reason'],
                'coachingNote' => $answer['coaching_note'],
            ],
            [
                'finalTier' => $finalTier,
                'decisionReason' => $decisionReason,
                'coachingNote' => $coachingNote,
            ],
            $decisionReason
        );
        $pdo->commit();
    } catch (Throwable $ex) {
        $pdo->rollBack();
        throw $ex;
    }
    jsonResponse(['success' => true]);
}

function handleRevisi(array $payload): void
{
    $id = intval($payload['id'] ?? 0);
    $note = trim($payload['note'] ?? '');
    $currentUserId = isset($_SESSION['current_user']['id']) ? (int) $_SESSION['current_user']['id'] : null;
    if ($id <= 0 || $note === '') {
        jsonResponse(['success' => false, 'error' => 'ID submission dan catatan revisi harus diisi.']);
    }
    if (strlen($note) > 2000) {
        jsonResponse(['success' => false, 'error' => 'Catatan revisi maksimal 2000 karakter.']);
    }

    $pdo = getDb();
    $existing = $pdo->prepare('SELECT status, user_id FROM submissions WHERE id = ? LIMIT 1');
    $existing->execute([$id]);
    $submission = $existing->fetch();
    if (!$submission) {
        jsonResponse(['success' => false, 'error' => 'Submission tidak ditemukan.'], 404);
    }
    if ($submission['status'] === 'Approved') {
        jsonResponse(['success' => false, 'error' => 'Submission sudah Approved dan terkunci.'], 423);
    }
    $canRequestRevision = isAdmin()
        || ($currentUserId !== null && evaluatorCanAssess($currentUserId, (int) $submission['user_id']));
    if (!$canRequestRevision) {
        jsonResponse(['success' => false, 'error' => 'Akses revisi ditolak.'], 403);
    }
    $stmt = $pdo->prepare('UPDATE submissions SET status = ?, catatan = ? WHERE id = ?');
    $stmt->execute(['Revisi', $note, $id]);
    recordSubmissionAudit($id, null, $currentUserId, 'revision_requested', ['status' => $submission['status']], ['status' => 'Revisi'], $note);
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

            $rawEvidenceChecklist = is_array($rawKpi['evidenceChecklist'] ?? null) ? $rawKpi['evidenceChecklist'] : [];
            if (count($rawEvidenceChecklist) > 20) {
                jsonResponse(['success' => false, 'error' => "Checklist bukti pada KPI {$name} melebihi batas sistem."]);
            }
            $evidenceChecklist = [];
            foreach ($rawEvidenceChecklist as $rawEvidenceItem) {
                $evidenceItem = trim((string) $rawEvidenceItem);
                if ($evidenceItem === '' || strlen($evidenceItem) > 255) {
                    jsonResponse(['success' => false, 'error' => "Checklist bukti pada KPI {$name} harus diisi dan maksimal 255 karakter."]);
                }
                if (!in_array($evidenceItem, $evidenceChecklist, true)) {
                    $evidenceChecklist[] = $evidenceItem;
                }
            }
            $rawActualDataFields = is_array($rawKpi['actualDataFields'] ?? null) ? $rawKpi['actualDataFields'] : [];
            if (count($rawActualDataFields) > 30) {
                jsonResponse(['success' => false, 'error' => "Input data aktual pada KPI {$name} melebihi batas sistem."]);
            }
            $allowedActualDataTypes = ['number', 'percent', 'currency', 'text', 'textarea', 'date', 'url', 'boolean'];
            $normalizeBool = fn ($value, bool $default = false): bool => filter_var(
                $value,
                FILTER_VALIDATE_BOOL,
                FILTER_NULL_ON_FAILURE
            ) ?? $default;
            $actualDataFields = [];
            $actualFieldIds = [];
            $actualValueSourceFieldId = '';
            $rawActualValueSourceFieldId = trim((string) ($rawKpi['actualValueSourceFieldId'] ?? ''));
            foreach ($rawActualDataFields as $fieldIndex => $rawField) {
                if (!is_array($rawField)) {
                    jsonResponse(['success' => false, 'error' => "Input data aktual ke-" . ($fieldIndex + 1) . " pada KPI {$name} tidak valid."]);
                }
                $fieldId = trim((string) ($rawField['id'] ?? ''));
                $fieldLabel = trim((string) ($rawField['label'] ?? ''));
                $fieldType = trim((string) ($rawField['type'] ?? 'text'));
                $fieldUnit = trim((string) ($rawField['unit'] ?? ''));
                $helperText = trim((string) ($rawField['helperText'] ?? ''));
                if (
                    $fieldId === ''
                    || preg_match('/^[A-Za-z0-9_-]{1,64}$/', $fieldId) !== 1
                    || $fieldLabel === ''
                    || strlen($fieldLabel) > 255
                    || strlen($fieldUnit) > 64
                    || strlen($helperText) > 500
                    || !in_array($fieldType, $allowedActualDataTypes, true)
                ) {
                    jsonResponse(['success' => false, 'error' => "Input data aktual ke-" . ($fieldIndex + 1) . " pada KPI {$name} belum lengkap."]);
                }
                if (isset($actualFieldIds[$fieldId])) {
                    jsonResponse(['success' => false, 'error' => "ID input data aktual {$fieldId} pada KPI {$name} harus unik."]);
                }
                $usedAsActualValue = $normalizeBool($rawField['usedAsActualValue'] ?? false);
                if ($usedAsActualValue) {
                    if ($actualValueSourceFieldId !== '') {
                        jsonResponse(['success' => false, 'error' => "Hanya satu input data aktual pada KPI {$name} yang boleh menjadi sumber nilai aktual."]);
                    }
                    $actualValueSourceFieldId = $fieldId;
                }
                $actualFieldIds[$fieldId] = true;
                $actualDataFields[] = [
                    'id' => $fieldId,
                    'label' => $fieldLabel,
                    'type' => $fieldType,
                    'unit' => $fieldUnit,
                    'required' => $normalizeBool($rawField['required'] ?? false),
                    'sourceRequired' => $normalizeBool($rawField['sourceRequired'] ?? false),
                    'dataDateRequired' => $normalizeBool($rawField['dataDateRequired'] ?? false),
                    'verificationRequired' => $normalizeBool($rawField['verificationRequired'] ?? true, true),
                    'usedAsActualValue' => $usedAsActualValue,
                    'helperText' => $helperText,
                ];
            }
            if ($actualValueSourceFieldId === '' && $rawActualValueSourceFieldId !== '') {
                if (!isset($actualFieldIds[$rawActualValueSourceFieldId])) {
                    jsonResponse(['success' => false, 'error' => "Sumber nilai aktual pada KPI {$name} harus merujuk ke input data aktual yang valid."]);
                }
                $actualValueSourceFieldId = $rawActualValueSourceFieldId;
                foreach ($actualDataFields as &$actualDataField) {
                    $actualDataField['usedAsActualValue'] = $actualDataField['id'] === $actualValueSourceFieldId;
                }
                unset($actualDataField);
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
                'actualValueSourceFieldId' => $actualValueSourceFieldId,
                'actualDataFields' => $actualDataFields,
                'evidenceChecklist' => $evidenceChecklist,
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
