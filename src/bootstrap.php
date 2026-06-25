<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';

if (APP_ENV === 'production') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
}

assertProductionConfig();

function isHttpsRequest(): bool
{
    return (
        isset($_SERVER['HTTPS'])
        && $_SERVER['HTTPS'] !== ''
        && strtolower((string) $_SERVER['HTTPS']) !== 'off'
    ) || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secureCookie = APP_ENV === 'production' || isHttpsRequest();
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.gc_maxlifetime', (string) SESSION_ABSOLUTE_TIMEOUT);
    session_name(APP_ENV === 'production' ? '__Host-kpi_session' : 'kpi_session');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secureCookie,
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

$now = time();
if (isset($_SESSION['role'])) {
    $createdAt = (int) ($_SESSION['created_at'] ?? $now);
    $lastActivity = (int) ($_SESSION['last_activity'] ?? $now);
    if (
        $now - $lastActivity > SESSION_IDLE_TIMEOUT
        || $now - $createdAt > SESSION_ABSOLUTE_TIMEOUT
    ) {
        $_SESSION = [];
        session_regenerate_id(true);
    } else {
        $_SESSION['last_activity'] = $now;
        $_SESSION['created_at'] = $createdAt;
        $lastRotation = (int) ($_SESSION['last_rotation'] ?? $createdAt);
        if ($now - $lastRotation > 900) {
            session_regenerate_id(true);
            $_SESSION['last_rotation'] = $now;
        }
    }
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cross-Origin-Opener-Policy: same-origin');
header('Cross-Origin-Resource-Policy: same-origin');
header('Cache-Control: no-store, private');
if (APP_ENV === 'production' && isHttpsRequest()) {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
$GLOBALS['csp_nonce'] = base64_encode(random_bytes(18));
header(
    "Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' 'nonce-{$GLOBALS['csp_nonce']}'; "
    . "style-src 'self'; img-src 'self' data:; connect-src 'self'; "
    . "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    . (APP_ENV === 'production' ? "; upgrade-insecure-requests" : '')
);

function cspNonce(): string
{
    return (string) $GLOBALS['csp_nonce'];
}

function csrfToken(): string
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function rotateCsrfToken(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(): bool
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return is_string($provided) && hash_equals(csrfToken(), $provided);
}

function verifySameOriginRequest(): bool
{
    $fetchSite = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($fetchSite === 'cross-site') {
        return false;
    }

    $origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($origin === '') {
        return true;
    }

    $scheme = isHttpsRequest() ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $expected = APP_URL;
    if ($expected !== '' && !preg_match('#^https?://#i', $expected)) {
        $expected = "{$scheme}://{$expected}";
    }

    if ($expected !== '') {
        $parts = parse_url($expected);
        $expectedScheme = strtolower((string) ($parts['scheme'] ?? $scheme));
        $expectedHost = strtolower((string) ($parts['host'] ?? ''));
        $expectedPort = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        $expected = $expectedHost !== '' ? "{$expectedScheme}://{$expectedHost}{$expectedPort}" : '';
    }

    if ($expected === '') {
        $expected = $host !== '' ? "{$scheme}://{$host}" : '';
    }

    return $expected !== '' && hash_equals(strtolower($expected), strtolower($origin));
}
