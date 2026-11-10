<?php
/**
 * Import Historical Sales Data from Google Spreadsheet (Sheet "Penjualan")
 * Connects to Google Apps Script API and imports orders into MySQL.
 */

require_once __DIR__ . '/config.php';

$pdo = getDbConnection();

$spreadsheetApiUrl = 'https://script.google.com/macros/s/AKfycbw2uB1SnBD5T-IXMb25qCMtnFLFUBkYtBKWr4I_hlSC6ez5r-2D00hmIFuA2eZ0f19cgg/exec?action=admindata&limit=1000';

echo "Fetching historical sales data from Google Spreadsheet...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $spreadsheetApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || empty($response)) {
    die("Error fetching from Google Apps Script. HTTP Code: $httpCode. Error: $curlError\n");
}

$data = json_decode($response, true);
if (!isset($data['orders']) || !is_array($data['orders'])) {
    die("Invalid response format. 'orders' array not found.\n");
}

$orders = $data['orders'];
echo "Retrieved " . count($orders) . " orders from Spreadsheet.\n";

// Map products by name to product_id and category
$productMap = [];
$pStmt = $pdo->query("SELECT id, name, category, price, cogs FROM products");
while ($row = $pStmt->fetch()) {
    $normName = strtolower(trim($row['name']));
    $productMap[$normName] = $row;
}

$insertedOrders = 0;
$skippedOrders = 0;
$insertedItems = 0;

$orderInsertStmt = $pdo->prepare("
    INSERT INTO orders (
        invoice_no, transaction_id, customer_name, customer_phone,
        payment_method, status, notes, discount, admin_fee,
        packaging_cost, other_expense, total, created_at, updated_at
    ) VALUES (
        :invoice_no, :transaction_id, :customer_name, :customer_phone,
        :payment_method, :status, :notes, :discount, :admin_fee,
        :packaging_cost, :other_expense, :total, :created_at, :updated_at
    )
");

$itemInsertStmt = $pdo->prepare("
    INSERT INTO order_items (
        order_id, invoice_no, product_id, product_name, category,
        base_price, unit_price, qty, options_text, item_note, subtotal
    ) VALUES (
        :order_id, :invoice_no, :product_id, :product_name, :category,
        :base_price, :unit_price, :qty, :options_text, :item_note, :subtotal
    )
");

$checkOrderStmt = $pdo->prepare("SELECT id FROM orders WHERE invoice_no = ?");

foreach ($orders as $o) {
    $invoiceNo = trim($o['invoiceNo'] ?? '');
    if (empty($invoiceNo)) continue;

    // Check if order already exists in MySQL
    $checkOrderStmt->execute([$invoiceNo]);
    $existingId = $checkOrderStmt->fetchColumn();

    if ($existingId) {
        $skippedOrders++;
        continue;
    }

    // Parse date/time
    $rawDate = $o['date'] ?? '';
    $createdAt = date('Y-m-d H:i:s');
    if (!empty($rawDate)) {
        $timestamp = strtotime($rawDate);
        if ($timestamp !== false) {
            $createdAt = date('Y-m-d H:i:s', $timestamp);
        }
    }

    $transactionId = trim($o['transactionId'] ?? '') ?: ('TX-' . $invoiceNo);
    $customerName  = trim($o['customerName'] ?? '-') ?: '-';
    $customerPhone = trim($o['customerPhone'] ?? '-') ?: '-';
    $paymentMethod = trim($o['paymentMethod'] ?? 'QRIS') ?: 'QRIS';
    $status        = trim($o['status'] ?? 'Completed') ?: 'Completed';
    $notes         = trim($o['notes'] ?? '');
    $discount      = (float)($o['discount'] ?? 0);
    $total         = (float)($o['netSales'] ?? $o['grossSales'] ?? $o['total'] ?? 0);

    try {
        $pdo->beginTransaction();

        $orderInsertStmt->execute([
            ':invoice_no'     => $invoiceNo,
            ':transaction_id' => $transactionId,
            ':customer_name'  => $customerName,
            ':customer_phone' => $customerPhone,
            ':payment_method' => $paymentMethod,
            ':status'         => $status,
            ':notes'          => $notes,
            ':discount'       => $discount,
            ':admin_fee'      => 0,
            ':packaging_cost' => 0,
            ':other_expense'  => 0,
            ':total'          => $total,
            ':created_at'     => $createdAt,
            ':updated_at'     => $createdAt
        ]);

        $orderId = (int)$pdo->lastInsertId();

        $items = $o['items'] ?? [];
        foreach ($items as $it) {
            $itemName = trim($it['name'] ?? $it['productName'] ?? 'Menu');
            $normItemName = strtolower($itemName);

            $productId = null;
            $category  = 'Menu';
            if (isset($productMap[$normItemName])) {
                $productId = $productMap[$normItemName]['id'];
                $category  = $productMap[$normItemName]['category'];
            }

            $qty         = max(1, (int)($it['qty'] ?? 1));
            $unitPrice   = (float)($it['unitPrice'] ?? $it['price'] ?? 0);
            $basePrice   = $unitPrice;
            $subtotal    = (float)($it['subtotal'] ?? ($unitPrice * $qty));
            $optionsText = trim($it['optionsText'] ?? '');
            $itemNote    = trim($it['itemNote'] ?? '');

            $itemInsertStmt->execute([
                ':order_id'     => $orderId,
                ':invoice_no'   => $invoiceNo,
                ':product_id'   => $productId,
                ':product_name' => $itemName,
                ':category'     => $category,
                ':base_price'   => $basePrice,
                ':unit_price'   => $unitPrice,
                ':qty'          => $qty,
                ':options_text' => $optionsText,
                ':item_note'    => $itemNote,
                ':subtotal'     => $subtotal
            ]);

            $insertedItems++;
        }

        $pdo->commit();
        $insertedOrders++;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error inserting order $invoiceNo: " . $e->getMessage() . "\n";
    }
}

echo "\n============================================\n";
echo "IMPORT SELESAI!\n";
echo "Total Pesanan Ditambahkan: $insertedOrders\n";
echo "Total Item Produk: $insertedItems\n";
echo "Pesanan Dilewati (Sudah Ada): $skippedOrders\n";
echo "============================================\n";

// Display date range and total revenue
$statsStmt = $pdo->query("
    SELECT 
        COUNT(*) as totalOrders,
        MIN(created_at) as earliestDate,
        MAX(created_at) as latestDate,
        SUM(total) as totalRevenue
    FROM orders
");
$stats = $statsStmt->fetch();
echo "Database Sekarang:\n";
echo "- Total Pesanan: " . $stats['totalOrders'] . "\n";
echo "- Rentang Tanggal: " . $stats['earliestDate'] . " s/d " . $stats['latestDate'] . "\n";
echo "- Total Omset: Rp " . number_format($stats['totalRevenue'], 0, ',', '.') . "\n";

