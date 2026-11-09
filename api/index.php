<?php
/**
 * DjaCo Coffee - Main API Handler
 * High-performance lightweight REST API with MySQL backend
 */

require_once __DIR__ . '/config.php';

$pdo = getDbConnection();

// Read input method & parameters
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Support JSON POST body or form-data
$input = [];
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            $input = $decoded;
        }
    }
    if (empty($input)) {
        $input = $_POST;
    }
    if (empty($action) && isset($input['action'])) {
        $action = $input['action'];
    }
}

$action = strtolower(trim($action));

// -------------------------------------------------------------
// Routing Actions
// -------------------------------------------------------------

switch ($action) {

    // ---------------------------------------------------------
    // 0. AUTHENTICATION (Login, Logout, Check Auth)
    // ---------------------------------------------------------
    case 'login':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $username = trim($input['username'] ?? '');
        $password = (string)($input['password'] ?? '');

        if (empty($username) || empty($password)) {
            jsonError('Username dan password wajib diisi');
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username LIMIT 1");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            // Delay untuk mencegah brute force attack
            usleep(300000); // 300ms
            jsonError('Username atau password salah', 401);
        }

        // Generate token kriptografi yang aman
        $token = bin2hex(random_bytes(32));
        $updateToken = $pdo->prepare("
            UPDATE users 
            SET token = :token, token_expired_at = DATE_ADD(NOW(), INTERVAL 7 DAY) 
            WHERE id = :id
        ");
        $updateToken->execute([
            ':token' => $token,
            ':id'    => $user['id']
        ]);

        jsonSuccess([
            'message' => 'Login berhasil',
            'token'   => $token,
            'user'    => [
                'id'       => (int)$user['id'],
                'username' => $user['username'],
                'name'     => $user['name'],
                'role'     => $user['role']
            ]
        ]);
        break;

    case 'logout':
        $token = getBearerToken();
        if (!empty($token)) {
            $stmt = $pdo->prepare("UPDATE users SET token = NULL, token_expired_at = NULL WHERE token = :token");
            $stmt->execute([':token' => $token]);
        }
        jsonSuccess(['message' => 'Logout berhasil']);
        break;

    case 'checkauth':
        $currentUser = requireAuth($pdo);
        jsonSuccess([
            'authenticated' => true,
            'user'          => [
                'id'       => (int)$currentUser['id'],
                'username' => $currentUser['username'],
                'name'     => $currentUser['name'],
                'role'     => $currentUser['role']
            ]
        ]);
        break;

    // ---------------------------------------------------------
    // 1. GET ALL DATA (Products + Options + Announcements)
    // ---------------------------------------------------------
    case 'all':
        $productsStmt = $pdo->query("
            SELECT 
                id, name, category, 
                CAST(price AS DECIMAL(10,2)) as price, 
                CAST(cogs AS DECIMAL(10,2)) as cogs, 
                stock, status, image, description, 
                featured, has_variant as hasVariant 
            FROM products 
            WHERE status != 'Inactive'
            ORDER BY category ASC, name ASC
        ");
        $rawProducts = $productsStmt->fetchAll();
        $products = array_map(function($p) {
            return [
                'id'          => (string)$p['id'],
                'name'        => (string)$p['name'],
                'category'    => (string)$p['category'],
                'price'       => (float)$p['price'],
                'cogs'        => (float)$p['cogs'],
                'stock'       => (int)$p['stock'],
                'status'      => (string)$p['status'],
                'image'       => (string)$p['image'],
                'description' => (string)($p['description'] ?? ''),
                'featured'    => (bool)$p['featured'],
                'hasVariant'  => (bool)$p['hasVariant']
            ];
        }, $rawProducts);

        $optionsStmt = $pdo->query("
            SELECT 
                product_id as productId, 
                group_name as `group`, 
                option_name as `option`, 
                CAST(price_add AS DECIMAL(10,2)) as priceAdd, 
                is_default as `default`, 
                is_required as `required`, 
                sort_order as `sort`, 
                status 
            FROM product_options 
            WHERE status != 'Inactive'
            ORDER BY sort_order ASC, id ASC
        ");
        $rawOptions = $optionsStmt->fetchAll();
        $options = array_map(function($o) {
            return [
                'productId' => (string)$o['productId'],
                'group'     => (string)$o['group'],
                'option'    => (string)$o['option'],
                'priceAdd'  => (float)$o['priceAdd'],
                'default'   => (bool)$o['default'],
                'required'  => (bool)$o['required'],
                'sort'      => (int)$o['sort'],
                'status'    => (string)$o['status']
            ];
        }, $rawOptions);

        $announcementsStmt = $pdo->query("
            SELECT 
                title, message, 
                button_text as buttonText, 
                link, status, sort_order as `sort` 
            FROM announcements 
            WHERE status != 'Inactive'
            ORDER BY sort_order ASC, id ASC
        ");
        $announcements = $announcementsStmt->fetchAll();

        jsonSuccess([
            'products'      => $products,
            'options'       => $options,
            'announcements' => $announcements
        ]);
        break;

    // ---------------------------------------------------------
    // 2. GET ANNOUNCEMENTS ONLY
    // ---------------------------------------------------------
    case 'announcements':
        $stmt = $pdo->query("
            SELECT title, message, button_text as buttonText, link, status, sort_order as `sort` 
            FROM announcements 
            WHERE status != 'Inactive' 
            ORDER BY sort_order ASC, id ASC
        ");
        jsonSuccess(['announcements' => $stmt->fetchAll()]);
        break;

    // ---------------------------------------------------------
    // 3. ADMIN DATA (Products, Options, Orders, Reports)
    // ---------------------------------------------------------
    case 'admindata':
        $currentUser = requireAuth($pdo);
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 50;

        // Products
        $productsStmt = $pdo->query("SELECT * FROM products ORDER BY id ASC");
        $rawProducts = $productsStmt->fetchAll();
        $products = array_map(function($p) {
            return [
                'id'          => (string)$p['id'],
                'name'        => (string)$p['name'],
                'category'    => (string)$p['category'],
                'price'       => (float)$p['price'],
                'cogs'        => (float)$p['cogs'],
                'stock'       => (int)$p['stock'],
                'status'      => (string)$p['status'],
                'image'       => (string)$p['image'],
                'description' => (string)($p['description'] ?? ''),
                'featured'    => (bool)$p['featured'],
                'hasVariant'  => (bool)$p['has_variant']
            ];
        }, $rawProducts);

        // Options
        $optionsStmt = $pdo->query("
            SELECT 
                product_id as productId, 
                group_name as `group`, 
                option_name as `option`, 
                CAST(price_add AS DECIMAL(10,2)) as priceAdd, 
                is_default as `default`, 
                is_required as `required`, 
                sort_order as `sort`, 
                status 
            FROM product_options 
            ORDER BY sort_order ASC, id ASC
        ");
        $rawOptions = $optionsStmt->fetchAll();
        $options = array_map(function($o) {
            return [
                'productId' => (string)$o['productId'],
                'group'     => (string)$o['group'],
                'option'    => (string)$o['option'],
                'priceAdd'  => (float)$o['priceAdd'],
                'default'   => (bool)$o['default'],
                'required'  => (bool)$o['required'],
                'sort'      => (int)$o['sort'],
                'status'    => (string)$o['status']
            ];
        }, $rawOptions);

        // Orders with items
        $ordersStmt = $pdo->prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT :limit");
        $ordersStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $ordersStmt->execute();
        $rawOrders = $ordersStmt->fetchAll();

        $orderIds = array_column($rawOrders, 'id');
        $itemsByOrderId = [];
        if (!empty($orderIds)) {
            $inClause = implode(',', array_map('intval', $orderIds));
            $itemsStmt = $pdo->query("SELECT * FROM order_items WHERE order_id IN ($inClause)");
            while ($item = $itemsStmt->fetch()) {
                $itemsByOrderId[$item['order_id']][] = [
                    'productId'   => $item['product_id'],
                    'name'        => $item['product_name'],
                    'category'    => $item['category'],
                    'basePrice'   => (float)$item['base_price'],
                    'unitPrice'   => (float)$item['unit_price'],
                    'qty'         => (int)$item['qty'],
                    'optionsText' => $item['options_text'],
                    'itemNote'    => $item['item_note'],
                    'subtotal'    => (float)$item['subtotal']
                ];
            }
        }

        $orders = array_map(function($o) use ($itemsByOrderId) {
            return [
                'id'            => (int)$o['id'],
                'invoiceNo'     => (string)$o['invoice_no'],
                'transactionId' => (string)($o['transaction_id'] ?? ''),
                'customerName'  => (string)($o['customer_name'] ?? '-'),
                'customerPhone' => (string)($o['customer_phone'] ?? '-'),
                'paymentMethod' => (string)($o['payment_method'] ?? 'QRIS'),
                'status'        => (string)$o['status'],
                'notes'         => (string)($o['notes'] ?? ''),
                'discount'      => (float)$o['discount'],
                'adminFee'      => (float)$o['admin_fee'],
                'packagingCost' => (float)$o['packaging_cost'],
                'otherExpense'  => (float)$o['other_expense'],
                'total'         => (float)$o['total'],
                'netSales'      => (float)$o['total'],
                'items'         => $itemsByOrderId[$o['id']] ?? [],
                'createdAt'     => (string)$o['created_at']
            ];
        }, $rawOrders);

        // Reports / Summary stats
        $today = date('Y-m-d');
        $statsStmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(created_at) = :today AND status != 'Cancelled' THEN total ELSE 0 END), 0) as todaySales,
                COUNT(CASE WHEN DATE(created_at) = :today THEN 1 END) as todayOrders,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pendingOrders
            FROM orders
        ");
        $statsStmt->execute([':today' => $today]);
        $stats = $statsStmt->fetch();

        $activeProdCount = $pdo->query("SELECT COUNT(*) FROM products WHERE status = 'Active'")->fetchColumn();

        jsonSuccess([
            'products' => $products,
            'options'  => $options,
            'orders'   => $orders,
            'reports'  => [
                'todaySales'    => (float)$stats['todaySales'],
                'todayOrders'   => (int)$stats['todayOrders'],
                'pendingOrders' => (int)$stats['pendingOrders'],
                'totalProducts' => (int)$activeProdCount
            ]
        ]);
        break;

    // ---------------------------------------------------------
    // 4. CHECK NEW ORDERS (Lightweight polling for POS sound alert)
    // ---------------------------------------------------------
    case 'checkneworders':
        $currentUser = requireAuth($pdo);
        $stmt = $pdo->query("
            SELECT 
                invoice_no as invoiceNo, 
                customer_name as customerName, 
                total as netSales, 
                status, 
                created_at as createdAt 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 15
        ");
        $recent = $stmt->fetchAll();
        jsonSuccess([
            'orders' => $recent,
            'count'  => count($recent)
        ]);
        break;

    // ---------------------------------------------------------
    // 5. CREATE ORDER (Frontend & POS)
    // ---------------------------------------------------------
    case 'createorder':
        if ($method !== 'POST') {
            jsonError('Method POST required', 405);
        }

        $invoiceNo     = trim($input['invoiceNo'] ?? '');
        $transactionId = trim($input['transactionId'] ?? '');
        $customerName  = trim($input['customerName'] ?? '-') ?: '-';
        $customerPhone = trim($input['customerPhone'] ?? '-') ?: '-';
        $paymentMethod = trim($input['paymentMethod'] ?? 'QRIS');
        $notes         = trim($input['notes'] ?? '');
        $items         = $input['items'] ?? [];
        $discount      = (float)($input['discount'] ?? 0);
        $adminFee      = (float)($input['adminFee'] ?? 0);
        $packagingCost = (float)($input['packagingCost'] ?? 0);
        $otherExpense  = (float)($input['otherExpense'] ?? 0);
        $total         = (float)($input['total'] ?? 0);

        if (empty($invoiceNo)) {
            $invoiceNo = 'DJC-' . date('Ymd-His-') . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
        }

        if (empty($items) || !is_array($items)) {
            jsonError('Order items tidak boleh kosong');
        }

        try {
            $pdo->beginTransaction();

            // Insert into orders
            $orderStmt = $pdo->prepare("
                INSERT INTO orders (
                    invoice_no, transaction_id, customer_name, customer_phone, 
                    payment_method, status, notes, discount, admin_fee, 
                    packaging_cost, other_expense, total
                ) VALUES (
                    :invoice_no, :transaction_id, :customer_name, :customer_phone, 
                    :payment_method, 'Pending', :notes, :discount, :admin_fee, 
                    :packaging_cost, :other_expense, :total
                )
            ");
            $orderStmt->execute([
                ':invoice_no'     => $invoiceNo,
                ':transaction_id' => $transactionId,
                ':customer_name'  => $customerName,
                ':customer_phone' => $customerPhone,
                ':payment_method' => $paymentMethod,
                ':notes'          => $notes,
                ':discount'       => $discount,
                ':admin_fee'      => $adminFee,
                ':packaging_cost' => $packagingCost,
                ':other_expense'  => $otherExpense,
                ':total'          => $total
            ]);

            $orderId = (int)$pdo->lastInsertId();

            // Insert items and decrease stock
            $itemStmt = $pdo->prepare("
                INSERT INTO order_items (
                    order_id, invoice_no, product_id, product_name, category, 
                    base_price, unit_price, qty, options_text, item_note, subtotal
                ) VALUES (
                    :order_id, :invoice_no, :product_id, :product_name, :category, 
                    :base_price, :unit_price, :qty, :options_text, :item_note, :subtotal
                )
            ");

            $stockStmt = $pdo->prepare("
                UPDATE products 
                SET stock = GREATEST(0, stock - :qty) 
                WHERE id = :product_id
            ");

            foreach ($items as $it) {
                $pId = (string)($it['productId'] ?? $it['id'] ?? '');
                $pName = (string)($it['name'] ?? $it['productName'] ?? 'Menu');
                $pCat = (string)($it['category'] ?? '');
                $bPrice = (float)($it['basePrice'] ?? 0);
                $uPrice = (float)($it['unitPrice'] ?? $bPrice);
                $qty = max(1, (int)($it['qty'] ?? 1));
                $optText = (string)($it['optionsText'] ?? '');
                $itNote = (string)($it['itemNote'] ?? '');
                $sub = (float)($it['subtotal'] ?? ($uPrice * $qty));

                $itemStmt->execute([
                    ':order_id'     => $orderId,
                    ':invoice_no'   => $invoiceNo,
                    ':product_id'   => $pId,
                    ':product_name' => $pName,
                    ':category'     => $pCat,
                    ':base_price'   => $bPrice,
                    ':unit_price'   => $uPrice,
                    ':qty'          => $qty,
                    ':options_text' => $optText,
                    ':item_note'    => $itNote,
                    ':subtotal'     => $sub
                ]);

                if (!empty($pId)) {
                    $stockStmt->execute([
                        ':qty'        => $qty,
                        ':product_id' => $pId
                    ]);
                }
            }

            $pdo->commit();

            // Return latest products with updated stock
            $freshProductsStmt = $pdo->query("
                SELECT id, name, category, price, cogs, stock, status, image, description, featured, has_variant as hasVariant 
                FROM products 
                WHERE status != 'Inactive'
            ");
            $freshProducts = $freshProductsStmt->fetchAll();

            jsonSuccess([
                'message'   => 'Order berhasil dibuat',
                'invoiceNo' => $invoiceNo,
                'products'  => $freshProducts
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('Gagal membuat order: ' . $e->getMessage(), 500);
        }
        break;

    // ---------------------------------------------------------
    // 6. SAVE PRODUCT (Create / Update Product + Options)
    // ---------------------------------------------------------
    case 'saveproduct':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');

        $id          = trim($input['id'] ?? '');
        $name        = trim($input['name'] ?? '');
        $category    = trim($input['category'] ?? 'Menu');
        $status      = trim($input['status'] ?? 'Active');
        $price       = (float)($input['price'] ?? 0);
        $cogs        = (float)($input['cogs'] ?? 0);
        $stock       = (int)($input['stock'] ?? 0);
        $featured    = !empty($input['featured']) ? 1 : 0;
        $hasVariant  = !empty($input['hasVariant']) ? 1 : 0;
        $image       = trim($input['image'] ?? '');
        $description = trim($input['description'] ?? '');
        $options     = $input['options'] ?? [];

        if (empty($name)) {
            jsonError('Nama produk wajib diisi');
        }

        try {
            $pdo->beginTransaction();

            if (empty($id)) {
                // Generate auto ID
                $maxId = (int)$pdo->query("SELECT MAX(CAST(id AS UNSIGNED)) FROM products WHERE id REGEXP '^[0-9]+$'")->fetchColumn();
                $id = (string)($maxId + 1);
            }

            // Check if product exists
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE id = ?");
            $checkStmt->execute([$id]);
            $exists = (bool)$checkStmt->fetchColumn();

            if ($exists) {
                $updateStmt = $pdo->prepare("
                    UPDATE products SET 
                        name = :name, category = :category, status = :status, 
                        price = :price, cogs = :cogs, stock = :stock, 
                        featured = :featured, has_variant = :has_variant, 
                        image = :image, description = :description 
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':id'          => $id,
                    ':name'        => $name,
                    ':category'    => $category,
                    ':status'      => $status,
                    ':price'       => $price,
                    ':cogs'        => $cogs,
                    ':stock'       => $stock,
                    ':featured'    => $featured,
                    ':has_variant' => $hasVariant,
                    ':image'       => $image,
                    ':description' => $description
                ]);
            } else {
                $insertStmt = $pdo->prepare("
                    INSERT INTO products (
                        id, name, category, status, price, cogs, stock, 
                        featured, has_variant, image, description
                    ) VALUES (
                        :id, :name, :category, :status, :price, :cogs, :stock, 
                        :featured, :has_variant, :image, :description
                    )
                ");
                $insertStmt->execute([
                    ':id'          => $id,
                    ':name'        => $name,
                    ':category'    => $category,
                    ':status'      => $status,
                    ':price'       => $price,
                    ':cogs'        => $cogs,
                    ':stock'       => $stock,
                    ':featured'    => $featured,
                    ':has_variant' => $hasVariant,
                    ':image'       => $image,
                    ':description' => $description
                ]);
            }

            // Update options if variants enabled
            $pdo->prepare("DELETE FROM product_options WHERE product_id = ?")->execute([$id]);
            if ($hasVariant && is_array($options) && !empty($options)) {
                $optStmt = $pdo->prepare("
                    INSERT INTO product_options (
                        product_id, group_name, option_name, price_add, 
                        is_default, is_required, sort_order, status
                    ) VALUES (
                        :product_id, :group_name, :option_name, :price_add, 
                        :is_default, :is_required, :sort_order, :status
                    )
                ");
                foreach ($options as $idx => $opt) {
                    $g = trim($opt['group'] ?? '');
                    $o = trim($opt['option'] ?? '');
                    if (empty($g) || empty($o)) continue;

                    $optStmt->execute([
                        ':product_id'  => $id,
                        ':group_name'  => $g,
                        ':option_name' => $o,
                        ':price_add'   => (float)($opt['priceAdd'] ?? 0),
                        ':is_default'  => !empty($opt['default']) ? 1 : 0,
                        ':is_required' => !empty($opt['required']) ? 1 : 0,
                        ':sort_order'  => (int)($opt['sort'] ?? ($idx + 1)),
                        ':status'      => (string)($opt['status'] ?? 'Active')
                    ]);
                }
            }

            $pdo->commit();
            jsonSuccess(['message' => 'Produk berhasil disimpan', 'id' => $id]);

        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('Gagal menyimpan produk: ' . $e->getMessage(), 500);
        }
        break;

    // ---------------------------------------------------------
    // 7. UPDATE ORDER STATUS
    // ---------------------------------------------------------
    case 'updateorderstatus':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo);
        $invoiceNo = trim($input['invoiceNo'] ?? '');
        $newStatus = trim($input['status'] ?? '');

        if (empty($invoiceNo) || empty($newStatus)) {
            jsonError('invoiceNo dan status wajib diisi');
        }

        $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE invoice_no = ?");
        $stmt->execute([$newStatus, $invoiceNo]);

        jsonSuccess(['message' => "Status invoice $invoiceNo berhasil diubah ke $newStatus"]);
        break;

    // ---------------------------------------------------------
    // 8. DELETE PRODUCT
    // ---------------------------------------------------------
    case 'deleteproduct':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');
        $id = trim($input['id'] ?? '');
        if (empty($id)) jsonError('ID produk wajib diisi');

        // Delete product (cascades to options)
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        jsonSuccess(['message' => "Produk $id berhasil dihapus"]);
        break;

    // ---------------------------------------------------------
    // 9. MARK QRIS DOWNLOADED
    // ---------------------------------------------------------
    case 'markqrisdownloaded':
        $invoiceNo = trim($input['invoiceNo'] ?? '');
        if (!empty($invoiceNo)) {
            $stmt = $pdo->prepare("UPDATE orders SET qris_downloaded = 1 WHERE invoice_no = ?");
            $stmt->execute([$invoiceNo]);
        }
        jsonSuccess(['message' => 'QRIS download tercatat']);
        break;

    default:
        jsonError("Aksi '$action' tidak dikenali", 404);
        break;
}

