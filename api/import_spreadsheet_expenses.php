<?php
/**
 * DjaCo Coffee - Import Spreadsheet Expenses & Link Raw Materials
 * 
 * Script / API Endpoint to import categorized expenses from:
 * 1. Sheet 'Pengeluaran awal'
 * 2. Sheet 'Penjualan dan Pengeluaran' (Pembelian Bahan Baku)
 * 3. Match and synchronize Raw Materials (ingredients & ingredient_purchases)
 */

require_once __DIR__ . '/config.php';

function runImportSpreadsheetExpenses($pdo) {
    // 1. Ingredients Definitions to Ensure Exist
    $ingredientsToEnsure = [
        [
            'code' => 'RAW-KENTANG',
            'name' => 'Kentang Frozen / Fresh (French Fries)',
            'unit' => 'gram',
            'cost_per_unit' => 30.00, // Rp 30.000 / 1000g
            'stock' => 1000,
            'min_stock' => 500
        ],
        [
            'code' => 'RAW-SEMPOL',
            'name' => 'Sempol Ayam Siap Goreng',
            'unit' => 'pack',
            'cost_per_unit' => 25000.00,
            'stock' => 2,
            'min_stock' => 1
        ],
        [
            'code' => 'RAW-AYAM',
            'name' => 'Daging Ayam Segar / Fillet',
            'unit' => 'gram',
            'cost_per_unit' => 30.00, // Rp 30.000 / 1000g
            'stock' => 1000,
            'min_stock' => 500
        ],
        [
            'code' => 'RAW-MINYAK',
            'name' => 'Minyak Goreng Sawit',
            'unit' => 'ml',
            'cost_per_unit' => 19.00, // Rp 19.000 / 1000ml
            'stock' => 1000,
            'min_stock' => 500
        ],
        [
            'code' => 'RAW-TEPUNG-CAKRA',
            'name' => 'Tepung Terigu Cakra Kembar',
            'unit' => 'gram',
            'cost_per_unit' => 14.50, // Rp 14.500 / 1000g
            'stock' => 1000,
            'min_stock' => 500
        ],
        [
            'code' => 'RAW-KRIMER',
            'name' => 'Kapal Api Krim Kafe (Krimer Bubuk)',
            'unit' => 'gram',
            'cost_per_unit' => 62.00, // Rp 6.200 / 100g
            'stock' => 200,
            'min_stock' => 100
        ],
        [
            'code' => 'RAW-SAUS-SAMBAL',
            'name' => 'Saus Sambal Delmonte Extra Hot',
            'unit' => 'gram',
            'cost_per_unit' => 25.20, // Rp 12.600 / 500g
            'stock' => 500,
            'min_stock' => 200
        ],
        [
            'code' => 'RAW-STRAWBERRY',
            'name' => 'Syrup Dripp Strawberry Premium',
            'unit' => 'ml',
            'cost_per_unit' => 136.84, // Rp 104.000 / 760ml
            'stock' => 760,
            'min_stock' => 200
        ]
    ];

    $ingMap = []; // code => id

    // Load existing ingredients
    $stmt = $pdo->query("SELECT id, code FROM ingredients");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $ingMap[$row['code']] = (int)$row['id'];
    }

    $newIngCount = 0;
    $insertIngStmt = $pdo->prepare("
        INSERT INTO ingredients (code, name, unit, cost_per_unit, current_stock, min_stock)
        VALUES (:code, :name, :unit, :cost, :stock, :min_stock)
    ");

    foreach ($ingredientsToEnsure as $ing) {
        if (!isset($ingMap[$ing['code']])) {
            $insertIngStmt->execute([
                ':code'      => $ing['code'],
                ':name'      => $ing['name'],
                ':unit'      => $ing['unit'],
                ':cost'      => $ing['cost_per_unit'],
                ':stock'     => $ing['stock'],
                ':min_stock' => $ing['min_stock']
            ]);
            $ingMap[$ing['code']] = (int)$pdo->lastInsertId();
            $newIngCount++;
        }
    }

    // 2. Definisi Lengkap Transaksi Pengeluaran dari Spreadsheet
    // Dipisahkan dan disesuaikan kategorinya:
    // - Peralatan & Perlengkapan
    // - Bahan Baku
    // - Kemasan & Packaging
    // - Utilitas & Listrik
    // - Operasional Lainnya
    $expenseList = [
        // --- Dari Sheet 'Pengeluaran awal' ---
        [
            'no'       => 'EXP-20260412-0001',
            'date'     => '2026-04-12',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Alat dan Bahan Modal Awal',
            'amount'   => 5955000.00,
            'notes'    => 'Pengadaan awal alat seduh, mesin espresso manual, grinder, dan perlengkapan mini bar',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260415-0001',
            'date'     => '2026-04-15',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Grinder One 2 Cup & Mixer Frother',
            'amount'   => 575000.00,
            'notes'    => 'Grinder One 2 Cup, Mixer Frother untuk frothing susu',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260503-0001',
            'date'     => '2026-05-03',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Portable Mini Bar with Umbrella',
            'amount'   => 1500000.00,
            'notes'    => 'Booth gerobak portable mini bar lipat & payung cafe DjaCo',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260503-0002',
            'date'     => '2026-05-03',
            'category' => 'Operasional Lainnya',
            'title'    => 'Pelatihan Master Kopi Barista',
            'amount'   => 695400.00,
            'notes'    => 'Biaya workshop / pelatihan barista Master Kopi 3 Mei',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260503-0003',
            'date'     => '2026-05-03',
            'category' => 'Bahan Baku',
            'title'    => 'Bubuk Matcha Piculabs',
            'amount'   => 121000.00,
            'notes'    => 'Bahan baku bubuk matcha pure Piculabs untuk menu Matcha Latte',
            'raw_code' => 'RAW-MATCHA',
            'raw_qty'  => 500, // gram
            'raw_cost' => 242.00
        ],
        [
            'no'       => 'EXP-20260503-0004',
            'date'     => '2026-05-03',
            'category' => 'Kemasan & Packaging',
            'title'    => 'Cup Kertas (Hot Paper Cup)',
            'amount'   => 54349.00,
            'notes'    => 'Kemasan cup kertas take away minuman panas',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260506-0001',
            'date'     => '2026-05-06',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Milk Jug & Jarum Kopi Espresso',
            'amount'   => 162000.00,
            'notes'    => 'Milk jug stainless latte art dan jarum distributor espresso (WDT tool)',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260506-0002',
            'date'     => '2026-05-06',
            'category' => 'Bahan Baku',
            'title'    => 'Bean Van Hoven 100gr + V60 Filter + Cappuccino',
            'amount'   => 147000.00,
            'notes'    => 'Bahan seduh manual brew V60 dan beans Van Hoven sample',
            'raw_code' => 'RAW-BEANS',
            'raw_qty'  => 300, // gram
            'raw_cost' => 490.00
        ],
        [
            'no'       => 'EXP-20260512-0001',
            'date'     => '2026-05-12',
            'category' => 'Bahan Baku',
            'title'    => 'Bean Coffee Van Hoven (1kg)',
            'amount'   => 450000.00,
            'notes'    => 'Biji kopi premium Arabica Van Hoven untuk espresso based',
            'raw_code' => 'RAW-BEANS',
            'raw_qty'  => 1000,
            'raw_cost' => 450.00
        ],
        [
            'no'       => 'EXP-20260515-0001',
            'date'     => '2026-05-15',
            'category' => 'Bahan Baku',
            'title'    => 'Bean Coffee DS Robusta (1kg)',
            'amount'   => 120000.00,
            'notes'    => 'Biji kopi Robusta DS untuk menu es kopi susu & kopi tubruk',
            'raw_code' => 'RAW-BEANS',
            'raw_qty'  => 1000,
            'raw_cost' => 120.00
        ],
        [
            'no'       => 'EXP-20260521-0001',
            'date'     => '2026-05-21',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Kursi Lipat + Meja Portable',
            'amount'   => 388560.00,
            'notes'    => 'Fasilitas meja & kursi lipat outdoor pelanggan',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260524-0001',
            'date'     => '2026-05-24',
            'category' => 'Utilitas & Listrik',
            'title'    => 'Lampu LED + Connector',
            'amount'   => 130000.00,
            'notes'    => 'Penerangan booth dan connector kabel LED',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260525-0001',
            'date'     => '2026-05-25',
            'category' => 'Utilitas & Listrik',
            'title'    => 'Kabel, Connector LED, Isolasi Listrik',
            'amount'   => 30000.00,
            'notes'    => 'Perlengkapan jalur listrik & isolasi kabel mini bar',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260526-0001',
            'date'     => '2026-05-26',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => '5 Cangkir Enamel Tubruk',
            'amount'   => 60000.00,
            'notes'    => 'Cangkir enamel jadul untuk sajian kopi tubruk panas',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260526-0002',
            'date'     => '2026-05-26',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Sendok Teh 1 Lusin (12 pcs)',
            'amount'   => 15000.00,
            'notes'    => 'Sendok teh stainless bar kopi',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260601-0001',
            'date'     => '2026-06-01',
            'category' => 'Operasional Lainnya',
            'title'    => 'Print Buku Menu + Laminating',
            'amount'   => 22000.00,
            'notes'    => 'Cetak warna dan laminating daftar menu meja DjaCo',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260604-0001',
            'date'     => '2026-06-04',
            'category' => 'Bahan Baku',
            'title'    => 'Bahan Makanan & Snack Awal',
            'amount'   => 524500.00,
            'notes'    => 'Stok awal aneka bahan snack (mendoan, pisang, indomie, telur, sosis, bumbu dapur)',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260604-0002',
            'date'     => '2026-06-04',
            'category' => 'Operasional Lainnya',
            'title'    => 'Print Menu Tambahan + Laminating',
            'amount'   => 22000.00,
            'notes'    => 'Cetak update menu dan laminating tambahan',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260604-0003',
            'date'     => '2026-06-04',
            'category' => 'Operasional Lainnya',
            'title'    => 'Operasional Perlengkapan Mini Bar 1',
            'amount'   => 153200.00,
            'notes'    => 'Kebutuhan operasional mini bar & kebersihan',
            'raw_code' => null
        ],
        [
            'no'       => 'EXP-20260604-0004',
            'date'     => '2026-06-04',
            'category' => 'Operasional Lainnya',
            'title'    => 'Operasional Perlengkapan Mini Bar 2',
            'amount'   => 77500.00,
            'notes'    => 'Kebutuhan operasional harian kasir/bar',
            'raw_code' => null
        ],

        // --- Dari Sheet 'Penjualan dan Pengeluaran' (Pembelian Bahan Baku) ---
        [
            'no'       => 'EXP-20260621-0001',
            'date'     => '2026-06-21',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Kentang Frozen (1kg)',
            'amount'   => 30000.00,
            'notes'    => 'Bahan baku French Fries 1kg',
            'raw_code' => 'RAW-KENTANG',
            'raw_qty'  => 1000,
            'raw_cost' => 30.00
        ],
        [
            'no'       => 'EXP-20260621-0002',
            'date'     => '2026-06-21',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Sempol Ayam Siap Goreng',
            'amount'   => 25000.00,
            'notes'    => 'Bahan baku Sempol DjaCo',
            'raw_code' => 'RAW-SEMPOL',
            'raw_qty'  => 1,
            'raw_cost' => 25000.00
        ],
        [
            'no'       => 'EXP-20260622-0001',
            'date'     => '2026-06-22',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Daging Ayam Segar (1kg)',
            'amount'   => 30000.00,
            'notes'    => 'Daging ayam segar 1kg untuk Ayam Geprek Sambal Bawang',
            'raw_code' => 'RAW-AYAM',
            'raw_qty'  => 1000,
            'raw_cost' => 30.00
        ],
        [
            'no'       => 'EXP-20260622-0002',
            'date'     => '2026-06-22',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Minyak Goreng (1 Liter)',
            'amount'   => 19000.00,
            'notes'    => 'Minyak goreng 1L untuk deep fryer & wajan gorengan',
            'raw_code' => 'RAW-MINYAK',
            'raw_qty'  => 1000,
            'raw_cost' => 19.00
        ],
        [
            'no'       => 'EXP-20260622-0003',
            'date'     => '2026-06-22',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Tepung Cakra Kembar (1kg)',
            'amount'   => 14500.00,
            'notes'    => 'Tepung terigu protein tinggi untuk adonan ayam crispy & camilan',
            'raw_code' => 'RAW-TEPUNG-CAKRA',
            'raw_qty'  => 1000,
            'raw_cost' => 14.50
        ],
        [
            'no'       => 'EXP-20260624-0001',
            'date'     => '2026-06-24',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Chocolatos Drink Chocolate (5 sachet)',
            'amount'   => 10600.00,
            'notes'    => 'Bahan minuman cokelat (5 sachet @ Rp 2.120)',
            'raw_code' => 'RAW-CHOCO',
            'raw_qty'  => 140, // 5 sachet ~ 140g
            'raw_cost' => 75.71
        ],
        [
            'no'       => 'EXP-20260624-0002',
            'date'     => '2026-06-24',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Van Houten Cocoa Powder (40gr)',
            'amount'   => 15000.00,
            'notes'    => 'Cokelat bubuk Van Houten murni untuk signature dark chocolate / mocha',
            'raw_code' => 'RAW-CHOCO',
            'raw_qty'  => 40,
            'raw_cost' => 375.00
        ],
        [
            'no'       => 'EXP-20260624-0003',
            'date'     => '2026-06-24',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Kapal Api Krim Kafe (100gr)',
            'amount'   => 6200.00,
            'notes'    => 'Krimer bubuk untuk kopi & minuman blended',
            'raw_code' => 'RAW-KRIMER',
            'raw_qty'  => 100,
            'raw_cost' => 62.00
        ],
        [
            'no'       => 'EXP-20260624-0004',
            'date'     => '2026-06-24',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Saus Sambal Delmonte Extra Hot (500gr)',
            'amount'   => 12600.00,
            'notes'    => 'Pelengkap aneka snack gorengan & ayam geprek',
            'raw_code' => 'RAW-SAUS-SAMBAL',
            'raw_qty'  => 500,
            'raw_cost' => 25.20
        ],
        [
            'no'       => 'EXP-20260625-0001',
            'date'     => '2026-06-25',
            'category' => 'Kemasan & Packaging',
            'title'    => 'Pembelian Botol Takeaway 250ml (20 pcs)',
            'amount'   => 32000.00,
            'notes'    => 'Botol kemasan minuman take away (20 pcs @ Rp 1.600)',
            'raw_code' => 'PKG-BOTOL',
            'raw_qty'  => 20,
            'raw_cost' => 1600.00
        ],
        [
            'no'       => 'EXP-20260628-0001',
            'date'     => '2026-06-28',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Palm Sugar / Gula Aren (250gr)',
            'amount'   => 24500.00,
            'notes'    => 'Gula aren murni untuk Kopi Susu Gula Aren',
            'raw_code' => 'RAW-AREN',
            'raw_qty'  => 250,
            'raw_cost' => 98.00
        ],
        [
            'no'       => 'EXP-20260628-0002',
            'date'     => '2026-06-28',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Syrup Dripp Strawberry (760ml)',
            'amount'   => 104000.00,
            'notes'    => 'Sirup perisa Strawberry premium merk Dripp',
            'raw_code' => 'RAW-STRAWBERRY',
            'raw_qty'  => 760,
            'raw_cost' => 136.84
        ],
        [
            'no'       => 'EXP-20260628-0003',
            'date'     => '2026-06-28',
            'category' => 'Bahan Baku',
            'title'    => 'Pembelian Susu Diamond UHT Milk Rich (1 Liter)',
            'amount'   => 24100.00,
            'notes'    => 'Susu UHT Fresh Rich Milk Diamond untuk latte & cappuccino',
            'raw_code' => 'RAW-MILK',
            'raw_qty'  => 1000,
            'raw_cost' => 24.10
        ],
        [
            'no'       => 'EXP-20260628-0004',
            'date'     => '2026-06-28',
            'category' => 'Peralatan & Perlengkapan',
            'title'    => 'Gelas Whisky Crystal Old (2 pcs)',
            'amount'   => 27030.00,
            'notes'    => 'Gelas saji premium Whisky Crystal Old (2 pcs @ Rp 13.515)',
            'raw_code' => null
        ]
    ];

    $checkExpStmt = $pdo->prepare("SELECT id FROM expenses WHERE expense_no = :no LIMIT 1");
    $insertExpStmt = $pdo->prepare("
        INSERT INTO expenses (expense_no, category, title, amount, notes, expense_date)
        VALUES (:no, :category, :title, :amount, :notes, :expense_date)
    ");
    $updateExpStmt = $pdo->prepare("
        UPDATE expenses 
        SET category = :category, title = :title, amount = :amount, notes = :notes, expense_date = :expense_date
        WHERE expense_no = :no
    ");

    $checkPurchStmt = $pdo->prepare("SELECT id FROM ingredient_purchases WHERE purchase_no = :pno LIMIT 1");
    $insertPurchStmt = $pdo->prepare("
        INSERT INTO ingredient_purchases (purchase_no, ingredient_id, quantity, total_cost, unit_cost, supplier, purchased_at)
        VALUES (:pno, :ing_id, :qty, :total_cost, :unit_cost, :supplier, :purchased_at)
    ");

    $insertedExpenses = 0;
    $updatedExpenses = 0;
    $insertedPurchases = 0;
    $totalAmount = 0;

    foreach ($expenseList as $exp) {
        $totalAmount += $exp['amount'];
        $checkExpStmt->execute([':no' => $exp['no']]);
        $existing = $checkExpStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $updateExpStmt->execute([
                ':no'           => $exp['no'],
                ':category'     => $exp['category'],
                ':title'        => $exp['title'],
                ':amount'       => $exp['amount'],
                ':notes'        => $exp['notes'],
                ':expense_date' => $exp['date']
            ]);
            $updatedExpenses++;
        } else {
            $insertExpStmt->execute([
                ':no'           => $exp['no'],
                ':category'     => $exp['category'],
                ':title'        => $exp['title'],
                ':amount'       => $exp['amount'],
                ':notes'        => $exp['notes'],
                ':expense_date' => $exp['date']
            ]);
            $insertedExpenses++;
        }

        // Jika terhubung dengan bahan baku, catat ke ingredient_purchases
        if (!empty($exp['raw_code']) && isset($ingMap[$exp['raw_code']])) {
            $ingId = $ingMap[$exp['raw_code']];
            $purchNo = 'PURCH-' . substr($exp['no'], 4); // contoh: PURCH-20260503-0003
            $qty = $exp['raw_qty'] ?? 1;
            $unitCost = $exp['raw_cost'] ?? ($exp['amount'] / $qty);

            $checkPurchStmt->execute([':pno' => $purchNo]);
            if (!$checkPurchStmt->fetch()) {
                $insertPurchStmt->execute([
                    ':pno'          => $purchNo,
                    ':ing_id'       => $ingId,
                    ':qty'          => $qty,
                    ':total_cost'   => $exp['amount'],
                    ':unit_cost'    => $unitCost,
                    ':supplier'     => 'Supplier Spreadsheet DjaCo',
                    ':purchased_at' => $exp['date']
                ]);
                $insertedPurchases++;

                // Perbarui cost_per_unit pada ingredient jika perlu
                $pdo->prepare("UPDATE ingredients SET cost_per_unit = :cost WHERE id = :id")->execute([
                    ':cost' => $unitCost,
                    ':id'   => $ingId
                ]);
            }
        }
    }

    return [
        'success'           => true,
        'message'           => "Berhasil mengimpor " . ($insertedExpenses + $updatedExpenses) . " pengeluaran & menyesuaikan bahan baku.",
        'newIngredients'    => $newIngCount,
        'insertedExpenses'  => $insertedExpenses,
        'updatedExpenses'   => $updatedExpenses,
        'totalExpenses'     => count($expenseList),
        'totalAmount'       => $totalAmount,
        'insertedPurchases' => $insertedPurchases
    ];
}

// Jika dijalankan langsung lewat CLI
if (php_sapi_name() === 'cli') {
    $res = runImportSpreadsheetExpenses(getDbConnection());
    echo json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}
