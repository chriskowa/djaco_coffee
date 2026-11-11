-- Database Schema for DjaCo Coffee
-- Generated on 2026-11-09

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table structure for products
-- --------------------------------------------------------
DROP TABLE IF EXISTS `product_recipes`;
DROP TABLE IF EXISTS `ingredient_purchases`;
DROP TABLE IF EXISTS `ingredients`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `product_options`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `users`;

-- --------------------------------------------------------
-- Table structure for users (Admin & Kasir)
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'admin',
  `token` varchar(64) DEFAULT NULL,
  `token_expired_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`),
  KEY `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`username`, `password`, `name`, `role`) VALUES
('admin', '$2y$10$7S8IJEwqbrevVtjVrlVp3.oQ.NhlqXRXSphwTw2p41LeHqlsRZp32', 'Administrator DjaCo', 'admin'),
('kasir', '$2y$10$3bm/cLHye7w2mIXXjw.3WujsWccSNC6NZ4yIh3nOb5fFGWHV6.19e', 'Kasir DjaCo', 'kasir');

CREATE TABLE `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'Menu',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `cogs` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `image` varchar(255) DEFAULT '',
  `description` text DEFAULT NULL,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `has_variant` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for product_options
-- --------------------------------------------------------
CREATE TABLE `product_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(50) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `option_name` varchar(100) NOT NULL,
  `price_add` decimal(12,2) NOT NULL DEFAULT 0.00,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_product_options_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for announcements
-- --------------------------------------------------------
CREATE TABLE `announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `message` text DEFAULT NULL,
  `button_text` varchar(100) DEFAULT 'Lihat info',
  `link` varchar(255) DEFAULT '',
  `sort_order` int(11) NOT NULL DEFAULT 1,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for orders
-- --------------------------------------------------------
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(60) NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT '-',
  `customer_phone` varchar(50) DEFAULT '-',
  `payment_method` varchar(50) DEFAULT 'QRIS',
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `admin_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `packaging_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `other_expense` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `qris_downloaded` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invoice_no` (`invoice_no`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for order_items
-- --------------------------------------------------------
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `invoice_no` varchar(60) NOT NULL,
  `product_id` varchar(50) DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `base_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `qty` int(11) NOT NULL DEFAULT 1,
  `options_text` text DEFAULT NULL,
  `item_note` text DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_invoice_no` (`invoice_no`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data: products
INSERT INTO `products` (`id`, `name`, `category`, `price`, `cogs`, `stock`, `status`, `image`, `description`, `featured`, `has_variant`) VALUES
('1', 'Tubruk', 'Coffee Based', 8000, 0, 98, 'Active', '', 'Kopi tradisional khas Indonesia yang diseduh langsung dengan ampasnya.', 0, 0),
('2', 'Americano', 'Coffee Based', 15000, 2910, 87, 'Active', '', 'Kopi hitam klasik yang dibuat dari espresso berkualitas dan air.', 1, 1),
('3', 'Kopi Susu Gula Aren', 'Coffee Based', 18000, 5945, 66, 'Active', '', 'Es kopi susu kekinian yang manis dan gurih dari gula aren murni.', 1, 1),
('4', 'Special Secret Vanilla Americano', 'Coffee Based', 18000, 0, 97, 'Active', '', 'Es kopi hitam spesial dengan sentuhan sirup vanilla rahasia DjaCo.', 1, 1),
('5', 'Espresso', 'Coffee Based', 12000, 0, 100, 'Active', '', 'Ekstrak kopi pekat murni dengan aroma kuat dan rasa intens.', 1, 0),
('6', 'V60 (Ice / Hot)', 'Coffee Based', 25000, 0, 100, 'Active', '', 'Kopi seduh manual menggunakan metode V60 dengan biji kopi pilihan.', 1, 1),
('7', 'Cappuccino', 'Coffee Based', 23000, 0, 100, 'Active', '', 'Perpaduan seimbang antara espresso, susu panas, dan busa susu tebal.', 1, 1),
('8', 'Latte', 'Coffee Based', 23000, 0, 100, 'Active', '', 'Minuman kopi lembut dengan dominasi susu cair hangat dan sedikit espresso.', 0, 1),
('9', 'Mocha', 'Coffee Based', 23000, 0, 100, 'Active', '', 'Kombinasi nikmat antara espresso, susu, dan saus cokelat premium.', 0, 1),
('10', 'Affogato', 'Coffee Based', 20000, 0, 100, 'Active', '', 'Satu scoop es krim vanilla lembut yang disiram dengan espresso panas.', 0, 0),
('11', 'Teh Tarik Gula Aren', 'Refreshing Tea', 15000, 0, 100, 'Active', '', 'Teh tarik tradisional bertekstur creamy dengan pemanis gula aren asli.', 0, 1),
('12', 'Earl Grey / Jasmine Tea (Hot/Iced)', 'Refreshing Tea', 10000, 0, 100, 'Active', '', 'Pilihan teh premium Earl Grey yang harum bergamot atau Jasmine tea yang menenangkan.', 0, 1),
('13', 'Iced Lychee Tea', 'Refreshing Tea', 15000, 0, 100, 'Active', '', 'Es teh manis dengan rasa buah leci segar yang aromatik.', 1, 1),
('14', 'Iced Lemon Tea', 'Refreshing Tea', 13000, 0, 100, 'Active', '', 'Teh es segar dengan perasan jeruk lemon asli yang melegakan dahaga.', 1, 1),
('15', 'Matcha Gula Aren', 'Non-Coffee', 23000, 0, 100, 'Active', '', 'Kombinasi matcha autentik yang berpadu seru dengan manisnya gula aren.', 1, 1),
('16', 'Matcha Latte', 'Non-Coffee', 22000, 6450, 99, 'Active', '', 'Minuman teh hijau Jepang (matcha) murni berpadu dengan susu creamy.', 1, 1),
('17', 'Chocolate Gula Aren', 'Non-Coffee', 23000, 0, 100, 'Active', '', 'Paduan unik cokelat premium dengan manis khas gula aren.', 0, 1),
('18', 'Signature Chocolate', 'Non-Coffee', 22000, 0, 54, 'Active', '', 'Minuman cokelat pekat khas DjaCo yang creamy dan lezat.', 0, 1),
('19', 'Spesial Ayam Geprek', 'Main Course (Makanan Berat)', 18000, 0, 100, 'Active', '', 'Ayam goreng tepung krispi yang digeprek dengan sambal bawang pedas mantap disajikan bersama nasi hangat.', 0, 0),
('20', 'Indomie Kuah Special', 'Main Course (Makanan Berat)', 13000, 0, 100, 'Active', '', 'Mie instan kuah hangat berkuah gurih dengan racikan bumbu spesial dan topping.', 0, 0),
('21', 'Indomie Goreng Special', 'Main Course (Makanan Berat)', 13000, 0, 100, 'Active', '', 'Mie instan goreng favorit yang dimasak spesial dengan tambahan topping pelengkap.', 0, 0),
('22', 'Mix Platter', 'Light Bites (Camilan / Snack)', 20000, 0, 100, 'Active', '', 'Kombinasi aneka camilan gorengan lezat dalam satu piring saji.', 0, 0),
('23', 'French Fries', 'Light Bites (Camilan / Snack)', 15000, 0, 99, 'Active', '', 'Kentang goreng renyah bertabur garam gurih khas camilan kafe.', 0, 0),
('24', 'Tempe Mendoan', 'Light Bites (Camilan / Snack)', 12000, 0, 100, 'Active', '', 'Tempe goreng tepung khas mendoan yang empuk dan kaya bumbu daun bawang.', 0, 0),
('25', 'Pisang Goreng', 'Light Bites (Camilan / Snack)', 13000, 0, 100, 'Active', '', 'Pisang goreng manis tradisional yang cocok menemani waktu ngopi.', 0, 0),
('26', 'Cireng Bumbu Rujak', 'Light Bites (Camilan / Snack)', 13000, 0, 100, 'Active', '', 'Cireng goreng kenyal bertekstur garing disajikan dengan cocolan bumbu rujak pedas manis.', 0, 0),
('27', 'Sempol', 'Light Bites (Camilan / Snack)', 12000, 0, 100, 'Active', '', 'Jajanan sempol ayam tusuk yang digoreng gurih berbalut telur.', 0, 0),
('28', 'Tahu Kriuk', 'Light Bites (Camilan / Snack)', 10000, 0, 100, 'Active', '', 'Tahu goreng dengan balutan tepung krispi bertekstur sangat renyah.', 0, 0),
('29', 'Jamur Enoki', 'Light Bites (Camilan / Snack)', 12000, 0, 100, 'Active', '', 'Jamur enoki goreng tepung yang renyah, gurih, dan krispi.', 0, 0),
('30', 'Kopi Susu Gula Aren', 'Bottled', 18000, 0, 100, 'Active', '', 'Es kopi susu kekinian yang manis dan gurih dari gula aren murni.', 1, 0),
('31', 'Black Coffee', 'Bottled', 15000, 0, 100, 'Active', '', 'Americano', 1, 0),
('32', 'Matcha Latte', 'Bottled', 22000, 0, 91, 'Active', '', 'Minuman teh hijau Jepang (matcha) murni berpadu dengan susu creamy.', 1, 0),
('33', 'Cappuccino', 'Bottled', 23000, 0, 100, 'Active', '', 'Perpaduan seimbang antara espresso, susu panas, dan busa susu tebal.', 1, 0),
('34', 'Special Americano Vanila', 'Bottled', 18000, 0, 100, 'Active', '', '', 1, 0);

-- Seed data: product_options
INSERT INTO `product_options` (`product_id`, `group_name`, `option_name`, `price_add`, `is_default`, `is_required`, `sort_order`, `status`) VALUES
('11', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('11', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('11', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('11', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('11', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('11', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('11', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('11', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('11', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('12', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('12', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('12', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('12', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('12', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('12', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('12', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('12', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('12', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('13', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('13', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('13', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('13', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('13', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('13', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('13', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('13', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('13', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('14', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('14', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('14', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('14', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('14', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('14', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('14', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('14', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('14', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('15', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('15', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('15', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('15', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('15', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('15', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('15', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('15', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('15', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('16', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('16', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('16', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('16', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('16', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('16', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('16', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('16', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('16', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('17', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('17', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('17', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('17', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('17', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('17', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('17', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('17', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('17', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('18', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('18', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('18', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('18', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('18', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('18', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('18', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('18', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('18', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('2', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('2', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('2', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('2', 'Ice Level', 'Less Ice', 0, 0, 1, 1, 'Active'),
('2', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('2', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('2', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('2', 'Ice Level', 'Normal Ice', 0, 1, 1, 2, 'Active'),
('2', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('3', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('3', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('3', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('3', 'Ice Level', 'Less Ice', 0, 0, 1, 1, 'Active'),
('3', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('3', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('3', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('3', 'Ice Level', 'Normal Ice', 0, 1, 1, 2, 'Active'),
('3', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('4', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('4', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('4', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('4', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('4', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('4', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('4', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('4', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('4', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('6', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('6', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('6', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('6', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('6', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('6', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('6', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('6', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('6', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('7', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('7', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('7', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('7', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('7', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('7', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('7', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('7', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('7', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('8', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('8', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('8', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('8', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('8', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('8', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('8', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('8', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('8', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active'),
('9', 'Cup Type', 'Cup', 0, 1, 1, 1, 'Active'),
('9', 'Temperature', 'Ice', 0, 1, 1, 1, 'Active'),
('9', 'Sugar', 'Less Sugar', 0, 0, 1, 1, 'Active'),
('9', 'Ice Level', 'Less Ice', 0, 0, 0, 1, 'Active'),
('9', 'Cup Type', 'Bottle', 3000, 0, 1, 2, 'Active'),
('9', 'Temperature', 'Hot', 0, 0, 1, 2, 'Active'),
('9', 'Sugar', 'Normal Sugar', 0, 1, 1, 2, 'Active'),
('9', 'Ice Level', 'Normal Ice', 0, 1, 0, 2, 'Active'),
('9', 'Sugar', 'Sweet', 0, 0, 1, 3, 'Active');

-- Seed data: announcements
INSERT INTO `announcements` (`title`, `message`, `button_text`, `link`, `sort_order`, `status`) VALUES
('Promo Hari Ini', 'Pesan menu favorit DjaCo langsung dari web.', 'Rute ke DjaCo', 'https://maps.app.goo.gl/9bNzKf8WoiN2Kkf57', 1, 'Active'),
('Info Jam Operasional', 'DjaCo siap melayani pesanan harian. Cek menu favorit dan stok terbaru di halaman ini.', 'WhatsApp DjaCo', 'https://wa.me/6282244400532', 2, 'Active');

-- --------------------------------------------------------
-- Table structure for ingredients (Master Bahan Baku)
-- --------------------------------------------------------
CREATE TABLE `ingredients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(30) NOT NULL UNIQUE,
  `name` varchar(100) NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'gram',
  `cost_per_unit` decimal(12,2) NOT NULL DEFAULT 0.00,
  `current_stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `min_stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ingredients` (`id`, `code`, `name`, `unit`, `cost_per_unit`, `current_stock`, `min_stock`) VALUES
(1, 'RAW-BEANS', 'Biji Kopi House Blend (Arabica/Robusta)', 'gram', 120.00, 5000.00, 500.00),
(2, 'RAW-MILK', 'Fresh Milk / UHT (Susu Sapi)', 'ml', 18.00, 20000.00, 2000.00),
(3, 'RAW-AREN', 'Gula Aren Cair Murni', 'ml', 35.00, 5000.00, 500.00),
(4, 'RAW-VANILLA', 'Sirup Vanilla Premium', 'ml', 110.00, 1000.00, 200.00),
(5, 'RAW-MATCHA', 'Bubuk Matcha Pure', 'gram', 150.00, 2000.00, 200.00),
(6, 'RAW-CHOCO', 'Bubuk Chocolate Signature', 'gram', 125.00, 3000.00, 300.00),
(7, 'RAW-TEA', 'Daun Teh Premium Earl Grey / Jasmine', 'gram', 80.00, 1000.00, 100.00),
(8, 'PKG-CUP14', 'Cup Dingin 14oz + Tutup Seal/Lid', 'pcs', 650.00, 500.00, 100.00),
(9, 'PKG-CUP16', 'Cup Dingin 16oz + Tutup Seal/Lid', 'pcs', 750.00, 500.00, 100.00),
(10, 'PKG-BOTOL', 'Botol Kaca/Plastik 250ml', 'pcs', 2500.00, 100.00, 20.00),
(11, 'PKG-STRAW', 'Sedotan Kertas / Plastik Ramah Lingkungan', 'pcs', 100.00, 1000.00, 200.00);

-- --------------------------------------------------------
-- Table structure for product_recipes (Resep & Komposisi BOM)
-- --------------------------------------------------------
CREATE TABLE `product_recipes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(50) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  CONSTRAINT `fk_recipe_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipe_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_recipes` (`product_id`, `ingredient_id`, `quantity`) VALUES
('3', 1, 18.00),
('3', 2, 120.00),
('3', 3, 25.00),
('3', 8, 1.00),
('3', 11, 1.00),
('2', 1, 18.00),
('2', 8, 1.00),
('2', 11, 1.00),
('16', 5, 20.00),
('16', 2, 150.00),
('16', 8, 1.00),
('16', 11, 1.00);

-- --------------------------------------------------------
-- Table structure for ingredient_purchases (Histori Pembelian)
-- --------------------------------------------------------
CREATE TABLE `ingredient_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_no` varchar(50) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `total_cost` decimal(12,2) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `supplier` varchar(100) DEFAULT NULL,
  `purchased_at` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  CONSTRAINT `fk_purchase_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for expenses (Beban Operasional: Gaji, Servis, dll)
-- --------------------------------------------------------
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `expense_no` varchar(50) NOT NULL UNIQUE,
  `category` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_source` varchar(50) NOT NULL DEFAULT 'Kas Tunai (Laci)',
  `notes` text DEFAULT NULL,
  `expense_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_expense_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for debts (Pinjaman / Modal Usaha)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `debts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `debt_no` varchar(50) NOT NULL UNIQUE,
  `creditor_name` varchar(150) NOT NULL,
  `loan_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `deposit_account` varchar(50) NOT NULL DEFAULT 'Transfer Bank',
  `loan_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `tenor_months` int(11) DEFAULT 0,
  `interest_rate` decimal(6,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_loan_date` (`loan_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for debt_payments (Pembayaran Cicilan Hutang)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `debt_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `debt_id` int(11) NOT NULL,
  `payment_no` varchar(50) NOT NULL UNIQUE,
  `payment_date` date NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) NOT NULL DEFAULT 'Transfer Bank',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_debt_id` (`debt_id`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `fk_debt_payments_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auto-sync initial product COGS from recipe BOM
UPDATE `products` p 
SET p.cogs = (
    SELECT COALESCE(SUM(pr.quantity * i.cost_per_unit), 0) 
    FROM `product_recipes` pr 
    JOIN `ingredients` i ON pr.ingredient_id = i.id 
    WHERE pr.product_id = p.id
) 
WHERE EXISTS (
    SELECT 1 FROM `product_recipes` pr WHERE pr.product_id = p.id
);

SET FOREIGN_KEY_CHECKS = 1;
