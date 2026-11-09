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

        // Ingredients
        $ingStmt = $pdo->query("
            SELECT 
                id, code, name, unit, 
                CAST(cost_per_unit AS DECIMAL(12,2)) as cost_per_unit, 
                CAST(current_stock AS DECIMAL(12,2)) as current_stock, 
                CAST(min_stock AS DECIMAL(12,2)) as min_stock 
            FROM ingredients 
            ORDER BY name ASC
        ");
        $rawIngredients = $ingStmt->fetchAll();
        $ingredients = array_map(function($i) {
            return [
                'id'          => (int)$i['id'],
                'code'        => (string)$i['code'],
                'name'        => (string)$i['name'],
                'unit'        => (string)$i['unit'],
                'costPerUnit' => (float)$i['cost_per_unit'],
                'stock'       => (float)$i['current_stock'],
                'minStock'    => (float)$i['min_stock']
            ];
        }, $rawIngredients);

        // Expenses
        $expStmt = $pdo->query("
            SELECT 
                id, expense_no as expenseNo, category, title, 
                CAST(amount AS DECIMAL(12,2)) as amount, notes, 
                expense_date as expenseDate, created_at as createdAt 
            FROM expenses 
            ORDER BY expense_date DESC, id DESC 
            LIMIT 50
        ");
        $rawExpenses = $expStmt->fetchAll();
        $expenses = array_map(function($e) {
            return [
                'id'          => (int)$e['id'],
                'expenseNo'   => (string)$e['expenseNo'],
                'category'    => (string)$e['category'],
                'title'       => (string)$e['title'],
                'amount'      => (float)$e['amount'],
                'notes'       => (string)($e['notes'] ?? ''),
                'expenseDate' => (string)$e['expenseDate'],
                'createdAt'   => (string)$e['createdAt']
            ];
        }, $rawExpenses);

        // Product Recipes
        $recStmt = $pdo->query("
            SELECT 
                pr.id, pr.product_id as productId, pr.ingredient_id as ingredientId, 
                i.name as ingredientName, i.unit, 
                CAST(i.cost_per_unit AS DECIMAL(12,2)) as costPerUnit, 
                CAST(pr.quantity AS DECIMAL(10,2)) as quantity, 
                CAST(pr.quantity * i.cost_per_unit AS DECIMAL(12,2)) as subtotalCost 
            FROM product_recipes pr 
            JOIN ingredients i ON pr.ingredient_id = i.id 
            ORDER BY pr.product_id, i.name
        ");
        $recipes = $recStmt->fetchAll();

        // Reports / Summary stats
        $statsStmt = $pdo->query("
            SELECT 
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status != 'Cancelled' THEN total ELSE 0 END), 0) as todaySales,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as todayOrders,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pendingOrders,
                COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status != 'Cancelled' THEN total ELSE 0 END), 0) as monthSales
            FROM orders
        ");
        $stats = $statsStmt->fetch();

        // Month expenses
        $monthExp = (float)$pdo->query("
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE YEAR(expense_date) = YEAR(CURDATE()) AND MONTH(expense_date) = MONTH(CURDATE())
        ")->fetchColumn();

        // Month estimated COGS of sold items
        $monthCogs = (float)$pdo->query("
            SELECT COALESCE(SUM(oi.qty * COALESCE(p.cogs, 0)), 0)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE()) AND o.status != 'Cancelled'
        ")->fetchColumn();

        $activeProdCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'Active'")->fetchColumn();
        $totalIngCount   = (int)$pdo->query("SELECT COUNT(*) FROM ingredients")->fetchColumn();
        $lowStockCount   = (int)$pdo->query("SELECT COUNT(*) FROM ingredients WHERE current_stock <= min_stock")->fetchColumn();

        $mSales = (float)$stats['monthSales'];
        $mGross = $mSales - $monthCogs;
        $mNet = $mGross - $monthExp;

        jsonSuccess([
            'products'    => $products,
            'options'     => $options,
            'orders'      => $orders,
            'ingredients' => $ingredients,
            'expenses'    => $expenses,
            'recipes'     => $recipes,
            'reports'     => [
                'todaySales'          => (float)$stats['todaySales'],
                'todayOrders'         => (int)$stats['todayOrders'],
                'pendingOrders'       => (int)$stats['pendingOrders'],
                'totalProducts'       => $activeProdCount,
                'totalIngredients'    => $totalIngCount,
                'lowStockIngredients' => $lowStockCount,
                'monthSales'          => $mSales,
                'monthCogs'           => $monthCogs,
                'monthGrossProfit'    => $mGross,
                'monthExpenses'       => $monthExp,
                'monthNetProfit'      => $mNet
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

                    // Potong stok bahan baku otomatis jika produk memiliki resep
                    $recipeDeductStmt = $pdo->prepare("
                        UPDATE ingredients i
                        JOIN product_recipes pr ON i.id = pr.ingredient_id
                        SET i.current_stock = GREATEST(0, i.current_stock - (pr.quantity * :qty))
                        WHERE pr.product_id = :product_id
                    ");
                    $recipeDeductStmt->execute([
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

            // If product has recipes and cogs was not explicitly entered, auto-calculate from recipe BOM
            if ($cogs <= 0 && $exists) {
                $calcStmt = $pdo->prepare("
                    SELECT COALESCE(SUM(pr.quantity * i.cost_per_unit), 0)
                    FROM product_recipes pr
                    JOIN ingredients i ON pr.ingredient_id = i.id
                    WHERE pr.product_id = ?
                ");
                $calcStmt->execute([$id]);
                $recipeCogs = (float)$calcStmt->fetchColumn();
                if ($recipeCogs > 0) {
                    $cogs = $recipeCogs;
                }
            }

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

    // ---------------------------------------------------------
    // 10. INGREDIENTS (MASTER BAHAN BAKU)
    // ---------------------------------------------------------
    case 'getingredients':
        $currentUser = requireAuth($pdo);
        $stmt = $pdo->query("SELECT * FROM ingredients ORDER BY name ASC");
        jsonSuccess(['ingredients' => $stmt->fetchAll()]);
        break;

    case 'saveingredient':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');

        $id          = (int)($input['id'] ?? 0);
        $code        = trim($input['code'] ?? '');
        $name        = trim($input['name'] ?? '');
        $unit        = trim($input['unit'] ?? 'gram');
        $costPerUnit = (float)($input['costPerUnit'] ?? 0);
        $stock       = (float)($input['stock'] ?? 0);
        $minStock    = (float)($input['minStock'] ?? 0);

        if (empty($code) || empty($name)) jsonError('Kode dan nama bahan wajib diisi');

        if ($id > 0) {
            $stmt = $pdo->prepare("
                UPDATE ingredients 
                SET code = ?, name = ?, unit = ?, cost_per_unit = ?, current_stock = ?, min_stock = ?
                WHERE id = ?
            ");
            $stmt->execute([$code, $name, $unit, $costPerUnit, $stock, $minStock, $id]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO ingredients (code, name, unit, cost_per_unit, current_stock, min_stock)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$code, $name, $unit, $costPerUnit, $stock, $minStock]);
            $id = (int)$pdo->lastInsertId();
        }

        // Recalculate HPP otomatis untuk semua produk yang memakai bahan ini
        $pdo->prepare("
            UPDATE products p
            SET p.cogs = COALESCE((
                SELECT SUM(pr.quantity * i.cost_per_unit)
                FROM product_recipes pr
                JOIN ingredients i ON pr.ingredient_id = i.id
                WHERE pr.product_id = p.id
            ), p.cogs)
            WHERE p.id IN (SELECT product_id FROM product_recipes WHERE ingredient_id = ?)
        ")->execute([$id]);

        jsonSuccess(['message' => 'Bahan baku berhasil disimpan dan HPP produk terkait telah diperbarui', 'id' => $id]);
        break;

    case 'deleteingredient':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) jsonError('ID bahan wajib diisi');

        $stmt = $pdo->prepare("DELETE FROM ingredients WHERE id = ?");
        $stmt->execute([$id]);
        jsonSuccess(['message' => 'Bahan baku berhasil dihapus']);
        break;

    // ---------------------------------------------------------
    // 11. RESTOCK BAHAN BAKU (DENGAN MOVING AVERAGE COST)
    // ---------------------------------------------------------
    case 'restockingredient':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo);

        $ingredientId  = (int)($input['ingredientId'] ?? 0);
        $quantity      = (float)($input['quantity'] ?? 0);
        $totalCost     = (float)($input['totalCost'] ?? 0);
        $supplier      = trim($input['supplier'] ?? 'Supplier');
        $purchasedAt   = trim($input['purchasedAt'] ?? date('Y-m-d'));
        $recordExpense = !empty($input['recordExpense']);

        if ($ingredientId <= 0 || $quantity <= 0 || $totalCost <= 0) {
            jsonError('Data pembelian tidak lengkap (ingredientId, quantity, totalCost wajib valid)');
        }

        try {
            $pdo->beginTransaction();

            // Ambil data bahan saat ini
            $stmt = $pdo->prepare("SELECT * FROM ingredients WHERE id = ?");
            $stmt->execute([$ingredientId]);
            $ing = $stmt->fetch();
            if (!$ing) jsonError('Bahan baku tidak ditemukan');

            $oldStock = (float)$ing['current_stock'];
            $oldCost  = (float)$ing['cost_per_unit'];

            // Rumus Moving Average Cost
            $newStock = $oldStock + $quantity;
            $newCostPerUnit = $newStock > 0 
                ? (($oldStock * $oldCost) + $totalCost) / $newStock 
                : ($totalCost / $quantity);

            // Update stok dan harga rata-rata bahan
            $updIng = $pdo->prepare("
                UPDATE ingredients 
                SET current_stock = :new_stock, cost_per_unit = :new_cost 
                WHERE id = :id
            ");
            $updIng->execute([
                ':new_stock' => $newStock,
                ':new_cost'  => $newCostPerUnit,
                ':id'        => $ingredientId
            ]);

            // Catat ke riwayat pembelian
            $purchaseNo = 'PO-' . date('Ymd-His') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            $insPurchase = $pdo->prepare("
                INSERT INTO ingredient_purchases (
                    purchase_no, ingredient_id, quantity, total_cost, unit_cost, supplier, purchased_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $insPurchase->execute([
                $purchaseNo, $ingredientId, $quantity, $totalCost, ($totalCost / $quantity), $supplier, $purchasedAt
            ]);

            // Jika dicatat ke tabel pengeluaran operasional
            if ($recordExpense) {
                $expNo = 'EXP-' . date('Ymd-His') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
                $insExp = $pdo->prepare("
                    INSERT INTO expenses (expense_no, category, title, amount, notes, expense_date)
                    VALUES (?, 'Bahan Baku', ?, ?, ?, ?)
                ");
                $insExp->execute([
                    $expNo,
                    "Beli " . $ing['name'] . " ($quantity " . $ing['unit'] . ")",
                    $totalCost,
                    "Pembelian $purchaseNo dari $supplier",
                    $purchasedAt
                ]);
            }

            // Recalculate HPP untuk semua produk yang menggunakan bahan ini
            $pdo->prepare("
                UPDATE products p
                SET p.cogs = COALESCE((
                    SELECT SUM(pr.quantity * i.cost_per_unit)
                    FROM product_recipes pr
                    JOIN ingredients i ON pr.ingredient_id = i.id
                    WHERE pr.product_id = p.id
                ), p.cogs)
                WHERE p.id IN (SELECT product_id FROM product_recipes WHERE ingredient_id = ?)
            ")->execute([$ingredientId]);

            $pdo->commit();

            jsonSuccess([
                'message'        => 'Restock berhasil dicatat dan HPP produk terkait telah disinkronkan',
                'newStock'       => $newStock,
                'newCostPerUnit' => $newCostPerUnit
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('Gagal memproses restock: ' . $e->getMessage(), 500);
        }
        break;

    // ---------------------------------------------------------
    // 12. RECIPES & HPP CALCULATOR (BOM)
    // ---------------------------------------------------------
    case 'getrecipes':
        $currentUser = requireAuth($pdo);
        $productId = trim($_GET['productId'] ?? '');
        $sql = "
            SELECT 
                pr.id, pr.product_id as productId, pr.ingredient_id as ingredientId, 
                i.name as ingredientName, i.unit, 
                CAST(i.cost_per_unit AS DECIMAL(12,2)) as costPerUnit, 
                CAST(pr.quantity AS DECIMAL(10,2)) as quantity, 
                CAST(pr.quantity * i.cost_per_unit AS DECIMAL(12,2)) as subtotalCost 
            FROM product_recipes pr 
            JOIN ingredients i ON pr.ingredient_id = i.id 
        ";
        if (!empty($productId)) {
            $stmt = $pdo->prepare($sql . " WHERE pr.product_id = ? ORDER BY i.name");
            $stmt->execute([$productId]);
        } else {
            $stmt = $pdo->query($sql . " ORDER BY pr.product_id, i.name");
        }
        jsonSuccess(['recipes' => $stmt->fetchAll()]);
        break;

    case 'saverecipe':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');

        $productId = trim($input['productId'] ?? '');
        $items     = $input['items'] ?? [];

        if (empty($productId)) jsonError('productId wajib diisi');

        try {
            $pdo->beginTransaction();

            $pdo->prepare("DELETE FROM product_recipes WHERE product_id = ?")->execute([$productId]);

            if (is_array($items) && !empty($items)) {
                $ins = $pdo->prepare("INSERT INTO product_recipes (product_id, ingredient_id, quantity) VALUES (?, ?, ?)");
                foreach ($items as $item) {
                    $ingId = (int)($item['ingredientId'] ?? 0);
                    $qty = (float)($item['quantity'] ?? 0);
                    if ($ingId > 0 && $qty > 0) {
                        $ins->execute([$productId, $ingId, $qty]);
                    }
                }
            }

            // Hitung total HPP otomatis
            $calcStmt = $pdo->prepare("
                SELECT COALESCE(SUM(pr.quantity * i.cost_per_unit), 0)
                FROM product_recipes pr
                JOIN ingredients i ON pr.ingredient_id = i.id
                WHERE pr.product_id = ?
            ");
            $calcStmt->execute([$productId]);
            $cogs = (float)$calcStmt->fetchColumn();

            // Update cogs di tabel products
            $upd = $pdo->prepare("UPDATE products SET cogs = ? WHERE id = ?");
            $upd->execute([$cogs, $productId]);

            $pdo->commit();
            jsonSuccess([
                'message'   => 'Resep berhasil disimpan dan HPP produk otomatis diperbarui',
                'productId' => $productId,
                'cogs'      => $cogs
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonError('Gagal menyimpan resep: ' . $e->getMessage(), 500);
        }
        break;

    // ---------------------------------------------------------
    // 13. EXPENSES (PENGELUARAN OPERASIONAL: GAJI, SERVIS, DLL)
    // ---------------------------------------------------------
    case 'getexpenses':
        $currentUser = requireAuth($pdo);
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 100;
        $category = trim($_GET['category'] ?? '');

        $sql = "SELECT * FROM expenses ";
        $params = [];
        if (!empty($category) && $category !== 'Semua') {
            $sql .= " WHERE category = :cat ";
            $params[':cat'] = $category;
        }
        $sql .= " ORDER BY expense_date DESC, id DESC LIMIT :lim";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        jsonSuccess(['expenses' => $stmt->fetchAll()]);
        break;

    case 'saveexpense':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo);

        $id          = (int)($input['id'] ?? 0);
        $category    = trim($input['category'] ?? 'Operasional');
        $title       = trim($input['title'] ?? '');
        $amount      = (float)($input['amount'] ?? 0);
        $notes       = trim($input['notes'] ?? '');
        $expenseDate = trim($input['expenseDate'] ?? date('Y-m-d'));

        if (empty($title) || $amount <= 0) jsonError('Judul dan nominal pengeluaran wajib valid');

        if ($id > 0) {
            $stmt = $pdo->prepare("
                UPDATE expenses 
                SET category = ?, title = ?, amount = ?, notes = ?, expense_date = ?
                WHERE id = ?
            ");
            $stmt->execute([$category, $title, $amount, $notes, $expenseDate, $id]);
        } else {
            $expNo = 'EXP-' . date('Ymd-His') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            $stmt = $pdo->prepare("
                INSERT INTO expenses (expense_no, category, title, amount, notes, expense_date)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$expNo, $category, $title, $amount, $notes, $expenseDate]);
            $id = (int)$pdo->lastInsertId();
        }

        jsonSuccess(['message' => 'Pengeluaran berhasil dicatat', 'id' => $id]);
        break;

    case 'deleteexpense':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) jsonError('ID pengeluaran wajib diisi');

        $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
        $stmt->execute([$id]);
        jsonSuccess(['message' => 'Pengeluaran berhasil dihapus']);
        break;

    case 'resettransactions':
        if ($method !== 'POST') jsonError('Method POST required', 405);
        $currentUser = requireAuth($pdo, 'admin');

        $confirm = trim($input['confirm'] ?? '');
        if ($confirm !== 'RESET') {
            jsonError('Ketik "RESET" dengan huruf kapital untuk mengonfirmasi pembersihan transaksi.', 400);
        }

        $resetStock = !empty($input['resetStock']);
        $defaultStock = isset($input['defaultStock']) ? max(0, (int)$input['defaultStock']) : 50;
        $resetExpenses = !empty($input['resetExpenses']);

        try {
            // 1. Delete all order items & orders
            $pdo->exec("DELETE FROM order_items");
            $pdo->exec("DELETE FROM orders");

            // Reset auto-increment safely
            try {
                $pdo->exec("ALTER TABLE order_items AUTO_INCREMENT = 1");
                $pdo->exec("ALTER TABLE orders AUTO_INCREMENT = 1");
            } catch (Exception $e) {
                // Ignore if host restricts ALTER TABLE
            }

            // 2. Optional: reset product stock
            if ($resetStock) {
                $stmt = $pdo->prepare("UPDATE products SET stock = ? WHERE status != 'Inactive'");
                $stmt->execute([$defaultStock]);
            }

            // 3. Optional: reset expenses
            if ($resetExpenses) {
                $pdo->exec("DELETE FROM expenses");
                try {
                    $pdo->exec("ALTER TABLE expenses AUTO_INCREMENT = 1");
                } catch (Exception $e) {}
            }

            jsonSuccess([
                'message'       => 'Seluruh data riwayat transaksi berhasil dibersihkan! Database siap digunakan untuk operasional baru.',
                'resetStock'    => $resetStock,
                'resetExpenses' => $resetExpenses
            ]);
        } catch (Exception $e) {
            jsonError('Gagal mereset transaksi: ' . $e->getMessage(), 500);
        }
        break;

    default:
        jsonError("Aksi '$action' tidak dikenali", 404);
        break;
}

