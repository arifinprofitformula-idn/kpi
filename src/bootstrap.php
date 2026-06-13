<?php
declare(strict_types=1);

require_once __DIR__ . '/../config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('kpi_session');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
$GLOBALS['csp_nonce'] = base64_encode(random_bytes(18));
header(
    "Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' 'nonce-{$GLOBALS['csp_nonce']}'; "
    . "style-src 'self'; img-src 'self' data:; connect-src 'self'; "
    . "object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
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
