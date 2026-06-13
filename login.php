<?php
declare(strict_types=1);

$requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '');
$requestPath = (string) parse_url($requestUri, PHP_URL_PATH);
if ($requestPath !== '/' && str_ends_with($requestPath, '/login/')) {
    $query = (string) parse_url($requestUri, PHP_URL_QUERY);
    header('Location: ' . rtrim($requestPath, '/') . ($query !== '' ? '?' . $query : ''), true, 301);
    exit;
}

require_once __DIR__ . '/src/bootstrap.php';
$role = $_SESSION['role'] ?? null;
$currentUser = $_SESSION['current_user'] ?? null;
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Akses dashboard KPI Sales & Marketing PT. Emas Perak Indonesia." />
<title>Login KPI | PT. Emas Perak Indonesia</title>
<link rel="stylesheet" href="assets/react/app.css?v=<?= (int) @filemtime(__DIR__ . '/assets/react/app.css') ?>" />
</head>
<body>
<div class="app" id="app"><div class="loading">Memuat aplikasi KPI...</div></div>
<script nonce="<?= htmlspecialchars(cspNonce(), ENT_QUOTES, 'UTF-8') ?>">
window.APP_STATE = {
  role: <?= json_encode($role, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>,
  currentUser: <?= json_encode($currentUser, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>,
};
window.APP_CONFIG = {
  workDays: <?= HARI_KERJA ?>,
  csrfToken: <?= json_encode(csrfToken(), JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>
};
</script>
<script type="module" src="assets/react/app.js?v=<?= (int) @filemtime(__DIR__ . '/assets/react/app.js') ?>"></script>
</body>
</html>
