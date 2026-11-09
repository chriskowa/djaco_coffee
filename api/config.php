<?php
/**
 * DjaCo Coffee - Database & API Configuration
 */

// Allow CORS & set JSON response
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------------
// Database Credentials
// -------------------------------------------------------------
// Sesuaikan dengan data database MySQL hosting / lokal Anda
$isLocal = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', 'localhost:8000', 'localhost:3000']);

if ($isLocal) {
    define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
    define('DB_PORT', getenv('DB_PORT') ?: '3306');
    define('DB_NAME', getenv('DB_NAME') ?: 'djaco_db');
    define('DB_USER', getenv('DB_USER') ?: 'root');
    define('DB_PASS', getenv('DB_PASS') ?: '');
} else {
    // Pengaturan Production (Shared Hosting cPanel)
    // Ganti nilai di bawah ini dengan database cPanel Anda
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
    define('DB_PORT', getenv('DB_PORT') ?: '3306');
    define('DB_NAME', getenv('DB_NAME') ?: 'djaco_db');
    define('DB_USER', getenv('DB_USER') ?: 'djaco_user');
    define('DB_PASS', getenv('DB_PASS') ?: 'password_database_anda');
}

/**
 * Get PDO Database Connection
 * @return PDO
 */
function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Koneksi database gagal: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    return $pdo;
}

/**
 * Response JSON helper
 */
function jsonSuccess($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($message = 'Terjadi kesalahan', $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Get Bearer Token from HTTP Request Headers / Query / Post
 */
function getBearerToken() {
    $header = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!empty($header) && preg_match('/Bearer\s(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    // Fallback: check query or post param
    return $_GET['token'] ?? $_POST['token'] ?? '';
}

/**
 * Require valid authenticated user
 * @param PDO $pdo
 * @param string|null $requiredRole
 * @return array Authenticated user data
 */
function requireAuth($pdo, $requiredRole = null) {
    $token = getBearerToken();
    if (empty($token)) {
        jsonError('Akses ditolak: Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.', 401);
    }

    $stmt = $pdo->prepare("
        SELECT id, username, name, role, token_expired_at 
        FROM users 
        WHERE token = :token AND token_expired_at > NOW()
        LIMIT 1
    ");
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Sesi login telah berakhir atau tidak valid. Silakan login kembali.', 401);
    }

    if ($requiredRole !== null && strtolower($user['role']) !== strtolower($requiredRole) && strtolower($user['role']) !== 'admin') {
        jsonError('Akses ditolak: Anda tidak memiliki izin untuk fitur ini.', 403);
    }

    return $user;
}

