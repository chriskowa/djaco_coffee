// System Configurations
    const DEFAULT_API_URL = '/api/index.php';
    let savedApiUrl = localStorage.getItem('djaco_admin_api_url');
    if (savedApiUrl && (savedApiUrl.includes('script.google.com') || savedApiUrl === '../api/index.php')) {
      savedApiUrl = null;
      localStorage.removeItem('djaco_admin_api_url');
    }
    let API_URL = savedApiUrl || DEFAULT_API_URL;
    const QRIS_STATIC = '00020101021126760024ID.CO.SPEEDCASH.MERCHANT01189360081530004376840215ID10260043768480303UKE51440014ID.CO.QRIS.WWW0215ID10265263133030303UKE5204581253033605802ID5910DJACO KAFE6006MALANG61056514662410509S392458630117202606291523420830703A0163040F0E';

    // Application States
    let products = [];
    let productOptions = [];
    let orders = [];
    let ingredients = [];
    let expenses = [];
    let debts = [];
    let debtSummary = null;
    let cashSummary = null;
    let recipes = [];
    let activeRecipeProductId = null;
    let localRecipeItems = [];
    let reports = null;
    let activeTab = 'dashboard';
    let knownOrderInvoices = [];
    let isInitialLoad = true;
    let pollingIntervalId = null;

    // POS Cart & Modal Selector State
    let posCart = [];
    let posEditingInvoice = null;
    let posSelectedCategory = 'Semua';
    let posModalProduct = null;
    let posModalQty = 1;
    let posModalSelections = {}; // { groupName: optionName }

    // Active Invoice Modal State
    let activeInvoiceOrder = null;

    // Hold POS order state
    let heldOrders = [];
    const HELD_ORDERS_KEY = 'djaco_held_orders_v1';

    // Chart Instance
    let salesChartInstance = null;

    // Helper: format Rupiah
    const rupiah = (num) => 'Rp' + Number(num || 0).toLocaleString('id-ID');

    // Toast Notification helper
    function showToast(message, isAlert = false) {
      const toastEl = document.getElementById('adminToast');
      const textEl = document.getElementById('toastMessage');

      textEl.innerText = message;
      if (isAlert) {
        toastEl.style.borderLeft = '4px solid var(--danger)';
      } else {
        toastEl.style.borderLeft = '4px solid var(--success)';
      }

      toastEl.classList.add('show');
      setTimeout(() => {
        toastEl.classList.remove('show');
      }, 3500);
    }

    // Audio Chime Synthesis using Web Audio API
    function playNotificationSound() {
      if (!document.getElementById('settings-play-sound').checked) return;
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const chime = (freq, startTime, duration) => {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, startTime);
          osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.2);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 1.2, startTime);

          gainNode.gain.setValueAtTime(0.2, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.005, startTime + duration);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + duration);
          osc2.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        chime(880, now, 0.4);
        chime(987.77, now + 0.15, 0.4);
        chime(1318.51, now + 0.3, 0.6);
      } catch (e) {
        console.warn('AudioContext failed:', e);
      }
    }

    function testNotificationSound() {
      playNotificationSound();
      showToast("Chime sound tested!");
    }

    // Browser Push Notifications
    function requestNotificationPermission() {
      if (!('Notification' in window)) {
        alert('Browser tidak mensupport notifikasi push.');
        return;
      }
      Notification.requestPermission().then(permission => {
        updateNotificationBtn(permission);
      });
    }

    function updateNotificationBtn(permission) {
      const btn = document.getElementById('notifyPermissionBtn');
      if (!btn) return;

      if (permission === 'granted') {
        btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #fff;"></i> Notifikasi Browser Aktif';
        btn.className = 'btn btn-success';
        btn.onclick = null;
      } else if (permission === 'denied') {
        btn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Notifikasi Diblokir';
        btn.className = 'btn btn-danger';
        btn.disabled = true;
      }
    }

    function showPushNotification(title, body) {
      if (!document.getElementById('settings-show-push').checked) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body: body,
              icon: '/assets/favicon.png' || '/assets/icon-192.png',
              badge: '/assets/favicon.png'
            });
          }).catch(err => {
            console.warn("Service Worker notification failed, falling back:", err);
            new Notification(title, {
              body: body,
              icon: '/assets/favicon.png' || '/assets/icon-192.png'
            });
          });
        } else {
          new Notification(title, {
            body: body,
            icon: '/assets/favicon.png' || '/assets/icon-192.png'
          });
        }
      }
    }

    function triggerTestPush() {
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') showTestPush();
        });
      } else {
        showTestPush();
      }
    }

    function showTestPush() {
      showPushNotification("DjaCo Coffee Test", "Notifikasi push bekerja dengan sukses!");
      showToast("Test push notification sent!");
    }

    // Routing / Tab Switcher
    function switchTab(tabId) {
      activeTab = tabId;
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

      document.getElementById(`section-${tabId}`).classList.add('active');
      document.getElementById(`nav-${tabId}`).classList.add('active');

      const titles = {
        'dashboard': 'Dashboard Ringkasan',
        'pos': 'POS Kasir / Point of Sale',
        'orders': 'Kelola Pesanan',
        'products': 'Kelola Database Produk',
        'ingredients': 'Master Bahan Baku & Kalkulator HPP',
        'expenses': 'Beban & Pengeluaran Operasional',
        'debts': 'Manajemen Hutang & Cicilan Modal',
        'reports': 'Laporan Keuangan & Penjualan Lengkap',
        'settings': 'Pengaturan Dashboard'
      };
      document.getElementById('pageTitle').innerText = titles[tabId] || 'Admin Panel';

      // Sync window URL hash without scrolling
      if (window.location.hash !== '#' + tabId) {
        if (history.replaceState) {
          history.replaceState(null, '', '#' + tabId);
        } else {
          window.location.hash = '#' + tabId;
        }
      }

      closeSidebar();

      // Hide Floating Cart Bar when leaving POS
      const floatBar = document.getElementById('posFloatingCartBar');
      if (floatBar && tabId !== 'pos') {
        floatBar.style.display = 'none';
      }

      if (tabId === 'dashboard') {
        renderDashboardOverview();
      } else if (tabId === 'pos') {
        renderPosMenu();
        renderPosCart();
      } else if (tabId === 'orders') {
        if (typeof filterOrders === 'function') {
          filterOrders();
        }
      } else if (tabId === 'ingredients') {
        renderIngredientsGrid();
      } else if (tabId === 'expenses') {
        renderExpensesList();
      } else if (tabId === 'debts') {
        if (typeof renderDebtsList === 'function') {
          renderDebtsList();
        }
      } else if (tabId === 'reports') {
        if (typeof renderReportsModule === 'function') {
          renderReportsModule();
        }
      }
    }

    function closeSidebar() {
      const sidebar = document.getElementById('sidebarMenu');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar) sidebar.classList.remove('show');
      if (backdrop) backdrop.classList.remove('show');
    }

    function toggleSidebar() {
      if (window.innerWidth <= 768) {
        // Mobile Drawer Toggle
        const sidebar = document.getElementById('sidebarMenu');
        const backdrop = document.getElementById('sidebarBackdrop');
        if (!sidebar) return;
        const isShowing = sidebar.classList.toggle('show');
        if (backdrop) {
          if (isShowing) {
            backdrop.classList.add('show');
          } else {
            backdrop.classList.remove('show');
          }
        }
      } else {
        // Desktop Mini / Full Sidebar Toggle
        document.body.classList.toggle('sidebar-collapsed');
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('djaco_sidebar_collapsed', isCollapsed ? 'true' : 'false');
      }
    }