<?php
// Helper untuk mendeteksi path absolut server
echo "<h3>DJACO Admin Path Finder</h3>";
echo "Salin baris di bawah ini dan gunakan untuk menggantikan baris <b>AuthUserFile</b> di file <b>admin/.htaccess</b> Anda:<br><br>";
echo "<code style='background:#eee;padding:8px 12px;display:inline-block;font-size:16px;border:1px solid #ccc;border-radius:4px;'>";
echo 'AuthUserFile "' . dirname(__FILE__) . '/admin/.htpasswd"';
echo "</code>";
?>
