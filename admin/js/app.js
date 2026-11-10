// ---------------- SETTINGS TAB ----------------
    function saveSettings() {
      const inputUrl = document.getElementById('settings-api-url').value.trim();
      if (!inputUrl) {
        alert("API URL tidak boleh kosong.");
        return;
      }

      localStorage.setItem('djaco_admin_api_url', inputUrl);
      API_URL = inputUrl;
      showToast("Pengaturan berhasil disimpan!");
      reloadData();
    }

    document.getElementById('settings-api-url').value = API_URL;

// ---------------- BACKGROUND POLLING FOR NEW ORDERS ----------------
    function startOrderPolling() {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }

      // Fast poll (every 6 seconds) for new orders using lightweight endpoint
      pollingIntervalId = setInterval(async () => {
        try {
          const data = await apiFetch('checkneworders');
          const freshOrders = data.orders || [];

          // Check if any fresh invoice is not known
          const hasNew = freshOrders.some(o => !knownOrderInvoices.includes(o.invoiceNo));

          if (hasNew) {
            // Trigger alerts & sounds immediately
            checkNewOrders(freshOrders);
            // Refresh entire admin dashboard data (reports, items, stocks)
            await reloadData();
          }
        } catch (e) {
          console.warn("Background fast notification polling error:", e);
        }
      }, 6000);
    }

    // ---------------- RESET DATABASE TRANSACTIONS ----------------
    function openResetDatabaseModal() {
      document.getElementById('resetConfirmText').value = '';
      document.getElementById('resetStockCheck').checked = false;
      document.getElementById('resetExpensesCheck').checked = false;
      document.getElementById('resetDatabaseModalOverlay').classList.add('show');
    }

    function closeResetDatabaseModal() {
      document.getElementById('resetDatabaseModalOverlay').classList.remove('show');
    }

    async function executeResetDatabase() {
      const confirmVal = document.getElementById('resetConfirmText').value.trim();
      if (confirmVal !== 'RESET') {
        alert('Ketik kata "RESET" (huruf kapital) untuk mengonfirmasi pembersihan database transaksi!');
        return;
      }

      const resetStock = document.getElementById('resetStockCheck').checked;
      const resetExpenses = document.getElementById('resetExpensesCheck').checked;
      const btn = document.getElementById('btnExecuteReset');

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membersihkan...';

      try {
        const payload = {
          confirm: 'RESET',
          resetStock: resetStock,
          defaultStock: 50,
          resetExpenses: resetExpenses
        };
        const res = await apiPost('resettransactions', payload);
        showToast(res.message || 'Database transaksi berhasil dibersihkan!');

        // Clear local storage POS and held orders
        posCart = [];
        heldOrders = [];
        localStorage.removeItem(HELD_ORDERS_KEY);
        renderPosCart();
        renderHeldOrders();

        closeResetDatabaseModal();
        await reloadData();
        switchTab('dashboard');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Gagal mereset database transaksi.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Ya, Bersihkan Database';
      }
    }

    // ---------------- SYNC HISTORICAL SALES FROM GOOGLE SPREADSHEET ----------------
    async function syncSpreadsheetSales() {
      const btn = document.getElementById('btnSyncSpreadsheet');
      const scriptUrl = document.getElementById('spreadsheet-sync-url')?.value.trim();

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyinkronkan...';
      }

      try {
        const res = await apiPost('importspreadsheetsales', { scriptUrl: scriptUrl });
        showToast(res.message || 'Sinkronisasi berhasil!');
        await reloadData();
      } catch (err) {
        console.error('Sync failed:', err);
        alert('Gagal menyinkronkan data: ' + (err.message || 'Error server'));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Tarik Data Penjualan';
        }
      }
    }

    function startApp() {
      // Restore sidebar collapsed preference on desktop
      if (window.innerWidth > 768) {
        const isCollapsed = localStorage.getItem('djaco_sidebar_collapsed') === 'true';
        if (isCollapsed) {
          document.body.classList.add('sidebar-collapsed');
        }
      }

      loadHeldOrders();

      // Read URL hash on load (e.g. #pos, #products)
      const hash = (window.location.hash || '').replace('#', '').trim();
      const validTabs = ['dashboard', 'pos', 'orders', 'products', 'ingredients', 'expenses', 'reports', 'settings'];
      const initialTab = validTabs.includes(hash) ? hash : 'dashboard';
      switchTab(initialTab);

      reloadData();
      startOrderPolling();
    }

    // Responsive URL Hash Change routing
    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace('#', '').trim();
      const validTabs = ['dashboard', 'pos', 'orders', 'products', 'ingredients', 'expenses', 'reports', 'settings'];
      if (validTabs.includes(hash) && activeTab !== hash) {
        switchTab(hash);
      }
    });

    // Responsive POS resize listener
    window.addEventListener('resize', () => {
      if (activeTab === 'pos') {
        const floatBar = document.getElementById('posFloatingCartBar');
        const container = document.querySelector('.pos-container');
        if (window.innerWidth > 860) {
          if (floatBar) floatBar.style.display = 'none';
          if (container) container.classList.remove('show-cart');
        } else {
          renderPosCart();
        }
      }
    });

    // Keyboard shortcut to toggle sidebar (Ctrl+B / Cmd+B)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        // Only toggle if not actively typing inside input or textarea
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          toggleSidebar();
        }
      }
    });

    // Page Load Initializer
    window.addEventListener('load', () => {
      const token = getAuthToken();
      const user = getAuthUser();

      if (!token || !user) {
        showLoginScreen(true);
      } else {
        updateUserUI(user);
        showLoginScreen(false);
        startApp();
      }

      // Register Service Worker for Chrome Mobile push notifications support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(reg => console.log('ServiceWorker registered for Admin scope', reg))
          .catch(err => console.warn('ServiceWorker registration failed', err));
      }

      if ('Notification' in window) {
        updateNotificationBtn(Notification.permission);
        if (Notification.permission === 'default') {
          setTimeout(() => {
            Notification.requestPermission().then(permission => {
              updateNotificationBtn(permission);
            });
          }, 1500);
        }
      }
    });