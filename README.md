# DjaCo Coffee - Web Order & POS

Aplikasi Mobile Order & Admin POS Kafe DjaCo Coffee dengan frontend PWA (HTML, CSS, JS) dan backend REST API berbasis **PHP & MySQL**.

---

## 📁 Struktur Direktori

```text
djaco.web.id/
├── api/
│   ├── config.php          # Konfigurasi koneksi MySQL & CORS
│   ├── database.sql        # Skema tabel & seed data produk DjaCo
│   └── index.php           # REST API Endpoint (Menu, Order, Admin, POS)
├── admin/
│   ├── index.html          # Panel Admin, Kasir POS & Laporan Penjualan
│   ├── .htaccess           # Proteksi HTTP Basic Auth admin
│   └── .htpasswd           # File kredensial login admin
├── assets/                 # Aset gambar, ikon, favicon
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD otomatis via FTP ke Shared Hosting
├── index.html              # Halaman utama pemesanan pelanggan (Mobile Friendly)
├── manifest.webmanifest    # Konfigurasi PWA Mobile
└── sw.js                   # Service worker offline caching
```

---

## 🚀 Panduan Setup Lokal (Komputer Anda)

1. **Jalankan MySQL:**
   * Buka **Laragon** lalu klik tombol **Start All** (atau jalankan MySQL di XAMPP).
2. **Buat Database & Import Data:**
   * Buka **phpMyAdmin** (`http://localhost/phpmyadmin`) atau HeidiSQL.
   * Buat database baru dengan nama `djaco_db`.
   * Import file [api/database.sql](api/database.sql).
3. **Cek Konfigurasi Database:**
   * Buka [api/config.php](api/config.php).
   * Untuk lokal, default user `root` tanpa password sudah terpasang otomatis.
4. **Login ke Dashboard Admin:**
   * Akses URL: `http://localhost:8000/admin/`
   * Masuk menggunakan kredensial default yang telah dienkripsi (Bcrypt):
     * **Admin:** Username: `admin` | Password: `admin123` (Hak akses penuh kelola menu & pesanan)
     * **Kasir:** Username: `kasir` | Password: `kasir123` (Hak akses POS & pantau pesanan)
5. **Jalankan Web Server Lokal:**
   * Buka terminal di folder ini, lalu jalankan:
     ```bash
     php -S localhost:8000
     ```
   * Buka browser:
     * Pelanggan: `http://localhost:8000/`
     * Admin / POS: `http://localhost:8000/admin/`

---

## 🌐 Panduan Setup di Server Hosting (cPanel)

1. **Buat Database di cPanel:**
   * Masuk ke **cPanel** > **MySQL Databases**.
   * Buat database baru (misal: `u12345_djaco`).
   * Buat user database baru beserta password-nya.
   * Tambahkan user ke database tersebut dengan hak akses **ALL PRIVILEGES**.
2. **Import Database:**
   * Masuk ke **phpMyAdmin** di cPanel.
   * Pilih database yang baru dibuat, lalu klik tab **Import**.
   * Upload file [api/database.sql](api/database.sql) dan klik **Go**.
3. **Sesuaikan Kredensial di `api/config.php`:**
   * Ubah bagian:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'u12345_djaco');
     define('DB_USER', 'u12345_djacouser');
     define('DB_PASS', 'password_anda');
     ```

---

## 🔄 Panduan Setup CI/CD (GitHub Actions ke cPanel)

Setiap Anda melakukan `git push origin main`, web di hosting cPanel akan otomatis ter-update via FTP.

1. **Buat Repository di GitHub** dan push project ini:
   ```bash
   git add .
   git commit -m "Migrasi database ke MySQL + PHP API & setup CI/CD"
   git remote add origin https://github.com/USERNAME/REPO_ANDA.git
   git push -u origin main
   ```
2. **Daftarkan Secret di GitHub:**
   * Buka repo GitHub Anda > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
   * Tambahkan 3 secret berikut:
     * `FTP_SERVER`: Alamat FTP hosting Anda (contoh: `ftp.djaco.web.id` atau IP server).
     * `FTP_USERNAME`: Username FTP cPanel Anda.
     * `FTP_PASSWORD`: Password akun FTP Anda.
3. Selesai! Deployment akan berjalan otomatis di tab **Actions** di GitHub.

