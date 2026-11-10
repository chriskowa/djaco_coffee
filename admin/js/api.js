// ---------------- AUTHENTICATION & SESSION MANAGEMENT ----------------
    function getAuthToken() {
      return localStorage.getItem('djaco_admin_token') || '';
    }

    function getAuthUser() {
      try {
        return JSON.parse(localStorage.getItem('djaco_admin_user') || 'null');
      } catch (e) {
        return null;
      }
    }

    function setAuth(token, user) {
      localStorage.setItem('djaco_admin_token', token);
      localStorage.setItem('djaco_admin_user', JSON.stringify(user));
      updateUserUI(user);
    }

    function clearAuth() {
      localStorage.removeItem('djaco_admin_token');
      localStorage.removeItem('djaco_admin_user');
      updateUserUI(null);
    }

    function updateUserUI(user = null) {
      const u = user || getAuthUser();
      const nameEl = document.getElementById('currentUserName');
      const roleEl = document.getElementById('currentUserRole');
      if (nameEl && roleEl) {
        if (u) {
          nameEl.innerText = u.name || u.username;
          roleEl.innerText = (u.role || 'ADMIN').toUpperCase();
        } else {
          nameEl.innerText = 'Tamu';
          roleEl.innerText = 'OFFLINE';
        }
      }
    }

    function showLoginScreen(show) {
      const loginOverlay = document.getElementById('loginOverlay');
      const adminContainer = document.getElementById('adminAppContainer');
      const menuToggleBtn = document.getElementById('menuToggleBtn');

      if (show) {
        loginOverlay.classList.add('show');
        loginOverlay.style.display = 'flex';
        adminContainer.style.display = 'none';
        if (menuToggleBtn) menuToggleBtn.style.display = 'none';
      } else {
        loginOverlay.classList.remove('show');
        loginOverlay.style.display = 'none';
        adminContainer.style.display = 'flex';
        if (menuToggleBtn) menuToggleBtn.style.display = 'flex';
      }
    }

    function togglePasswordVisibility() {
      const pass = document.getElementById('loginPassword');
      const icon = document.getElementById('passwordToggleIcon');
      if (pass.type === 'password') {
        pass.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        pass.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }

    async function handleLoginSubmit(event) {
      event.preventDefault();
      const usernameInput = document.getElementById('loginUsername');
      const passwordInput = document.getElementById('loginPassword');
      const submitBtn = document.getElementById('loginSubmitBtn');
      const alertBox = document.getElementById('loginAlert');

      alertBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...';

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            username: usernameInput.value.trim(),
            password: passwordInput.value
          })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Login gagal, periksa username & password');
        }

        setAuth(data.token, data.user);
        passwordInput.value = '';
        showLoginScreen(false);
        showToast(`Selamat datang, ${data.user.name}!`);
        startApp();
      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#faebe8';
        alertBox.style.color = '#ad3d2b';
        alertBox.innerText = err.message || 'Gagal terhubung ke server API';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Masuk Dashboard</span> <i class="fa-solid fa-arrow-right"></i>';
      }
    }

    async function logout() {
      if (!confirm('Apakah Anda yakin ingin keluar dari dashboard DjaCo?')) return;
      try {
        await apiPost('logout');
      } catch (e) {
        console.warn('Logout API error:', e);
      }
      clearAuth();
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      showLoginScreen(true);
      showToast('Anda telah berhasil keluar');
    }

    function handleUnauthorized() {
      clearAuth();
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      showLoginScreen(true);
      showToast('Sesi login Anda telah berakhir. Silakan login kembali.', true);
    }

    // API calls helper with Bearer Token Authorization
    async function apiFetch(action, params = {}) {
      const urlParams = new URLSearchParams({ action, _t: Date.now(), ...params });
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}?${urlParams.toString()}`, {
        headers,
        cache: 'no-store'
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Sesi berakhir, silakan login kembali.');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API error');
      return data;
    }

    async function apiPost(action, body = {}) {
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...body })
      });

      if (response.status === 401 && action !== 'login') {
        handleUnauthorized();
        throw new Error('Sesi berakhir, silakan login kembali.');
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API error');
      return data;
    }

    // Load All Data from API (Optimized with single batch request)
    async function reloadData() {
      const listeningDot = document.getElementById('listeningDot');
      listeningDot.style.opacity = '0.5';

      try {
        const data = await apiFetch('admindata', { limit: 50 });
        products = data.products || [];
        productOptions = data.options || [];
        ingredients = data.ingredients || [];
        expenses = data.expenses || [];
        debts = data.debts || [];
        debtSummary = data.debtSummary || null;
        recipes = data.recipes || [];
        reports = data.reports;
        orders = data.orders || [];

        checkNewOrders(orders);

        renderDashboardOverview();
        filterOrders();
        renderProductsGrid();
        populateCategoryFilter();

        if (activeTab === 'pos') {
          renderPosMenu();
          renderPosCart();
        } else if (activeTab === 'ingredients') {
          renderIngredientsGrid();
        } else if (activeTab === 'expenses') {
          renderExpensesList();
        } else if (activeTab === 'debts') {
          renderDebtsList();
        }

        listeningDot.style.opacity = '1';
        if (isInitialLoad) {
          isInitialLoad = false;
        } else {
          showToast("Database berhasil disinkronisasi");
        }
      } catch (err) {
        console.error(err);
        if (err.message && (err.message.includes('Sesi berakhir') || err.message.includes('Akses ditolak'))) {
          // Token tidak ada atau kedaluwarsa, layar login akan otomatis tampil
          return;
        }
        showToast("Gagal mengambil data dari Server API", true);
      }
    }

    // Check if new orders are present
    function checkNewOrders(fetchedOrders) {
      if (fetchedOrders.length === 0) return;

      const currentInvoices = fetchedOrders.map(o => o.invoiceNo);

      if (isInitialLoad) {
        knownOrderInvoices = currentInvoices;
        return;
      }

      const newOrders = fetchedOrders.filter(o => !knownOrderInvoices.includes(o.invoiceNo));

      if (newOrders.length > 0) {
        playNotificationSound();
        const newest = newOrders[0];
        showPushNotification(
          "Order Baru Masuk! ☕",
          `Invoice: ${newest.invoiceNo} - ${newest.customerName} (${rupiah(newest.netSales)})`
        );
        showToast(`Order baru masuk: ${newest.invoiceNo}`);

        const badge = document.getElementById('newOrdersBadge');
        const currentCount = Number(badge.innerText || 0) + newOrders.length;
        badge.innerText = currentCount;
        badge.style.display = 'inline-block';

        knownOrderInvoices = [...knownOrderInvoices, ...newOrders.map(o => o.invoiceNo)];
      }
    }

    // Reset order badge when entering orders tab
    document.getElementById('nav-orders').addEventListener('click', () => {
      const badge = document.getElementById('newOrdersBadge');
      badge.innerText = '0';
      badge.style.display = 'none';
    });