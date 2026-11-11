// ---------------- DASHBOARD TAB & DYNAMIC PERIOD FILTER ----------------
let dashPeriodPreset = 'thisyear';
let dashStartDateVal = '';
let dashEndDateVal = '';
let dashboardDataCache = null;

// Helper: Format Date to YYYY-MM-DD
function formatDashDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Human-friendly date formatting (e.g. 9 Nov 2026)
function formatHumanDate(ymdStr) {
  if (!ymdStr) return '';
  const parts = ymdStr.split('-');
  if (parts.length !== 3) return ymdStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = parseInt(parts[2], 10);
  const monthName = months[parseInt(parts[1], 10) - 1] || parts[1];
  const year = parts[0];
  return `${day} ${monthName} ${year}`;
}

// Calculate preset date ranges
function computeDashPresetDates(preset) {
  const now = new Date();
  let start = '';
  let end = formatDashDateYMD(now);
  let label = '';

  if (preset === 'today') {
    start = end;
    label = `Hari Ini (${formatHumanDate(start)})`;
  } else if (preset === '7days') {
    const d7 = new Date();
    d7.setDate(now.getDate() - 6);
    start = formatDashDateYMD(d7);
    label = `7 Hari Terakhir (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'lastmonth') {
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    start = formatDashDateYMD(firstDayPrev);
    end = formatDashDateYMD(lastDayPrev);
    label = `Bulan Lalu (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'thismonth') {
    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    label = `Bulan Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else {
    // Default: 'thisyear'
    start = `${now.getFullYear()}-01-01`;
    label = `Tahun Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  }

  return { start, end, label };
}

// Switch period preset on Dashboard
async function setDashboardPeriod(preset) {
  dashPeriodPreset = preset;

  // Update button active state
  const btnGroup = document.getElementById('dashPeriodBtnGroup');
  if (btnGroup) {
    const btns = btnGroup.querySelectorAll('.period-btn');
    btns.forEach(b => {
      b.classList.remove('active');
      if (
        (preset === 'today' && b.innerText.includes('Hari Ini')) ||
        (preset === '7days' && b.innerText.includes('7 Hari')) ||
        (preset === 'thismonth' && b.innerText.includes('Bulan Ini')) ||
        (preset === 'lastmonth' && b.innerText.includes('Bulan Lalu')) ||
        (preset === 'thisyear' && b.innerText.includes('Tahun Ini')) ||
        (preset === 'custom' && b.innerText.includes('Kustom'))
      ) {
        b.classList.add('active');
      }
    });
  }

  const customBox = document.getElementById('dashCustomDateBox');

  if (preset === 'custom') {
    if (customBox) customBox.style.display = 'flex';
    // Initialize inputs if empty
    const startInput = document.getElementById('dashStartDate');
    const endInput = document.getElementById('dashEndDate');
    if (startInput && !startInput.value) {
      startInput.value = dashStartDateVal || formatDashDateYMD(new Date());
    }
    if (endInput && !endInput.value) {
      endInput.value = dashEndDateVal || formatDashDateYMD(new Date());
    }
    return;
  }

  if (customBox) customBox.style.display = 'none';

  const range = computeDashPresetDates(preset);
  dashStartDateVal = range.start;
  dashEndDateVal = range.end;

  await loadDashboardData(dashStartDateVal, dashEndDateVal, range.label);
}

// Apply custom dates from inputs
async function applyCustomDashboardDate() {
  const startInput = document.getElementById('dashStartDate');
  const endInput = document.getElementById('dashEndDate');
  if (!startInput || !endInput) return;

  const start = startInput.value;
  const end = endInput.value;

  if (!start || !end) {
    alert('Harap pilih tanggal mulai dan tanggal selesai.');
    return;
  }

  if (start > end) {
    alert('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
    return;
  }

  dashStartDateVal = start;
  dashEndDateVal = end;
  const label = `Kustom: ${formatHumanDate(start)} - ${formatHumanDate(end)}`;
  await loadDashboardData(start, end, label);
}

// Fetch and render data for specific period
async function loadDashboardData(startDate, endDate, periodLabel) {
  const loadingEl = document.getElementById('dashPeriodLoading');
  const badgeEl = document.getElementById('dashActivePeriodBadge');

  if (loadingEl) loadingEl.style.display = 'inline-block';

  try {
    const res = await apiFetch('getreports', { startDate, endDate });
    dashboardDataCache = res;

    // Update active period badge
    if (badgeEl) {
      badgeEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> ${periodLabel || (formatHumanDate(startDate) + ' - ' + formatHumanDate(endDate))}`;
    }

    // Update stat cards
    const summary = res.financialSummary || {};
    const netSales = Number(summary.netSales || 0);
    const totalCogs = Number(summary.totalCogs || 0);
    const totalExpenses = Number(summary.totalExpenses || 0);
    const netProfit = Number(summary.netProfit || 0);
    const completedOrders = Number(summary.completedOrders || 0);
    const avgBasket = completedOrders > 0 ? (netSales / completedOrders) : 0;

    const revEl = document.getElementById('stat-revenue');
    const cogsEl = document.getElementById('stat-cogs');
    const expEl = document.getElementById('stat-expenses');
    const profitEl = document.getElementById('stat-profit');
    const ordersEl = document.getElementById('stat-orders');
    const avgEl = document.getElementById('stat-avg');

    if (revEl) revEl.innerText = rupiah(netSales);
    if (cogsEl) cogsEl.innerText = rupiah(totalCogs);
    if (expEl) expEl.innerText = rupiah(totalExpenses);
    if (profitEl) {
      profitEl.innerText = rupiah(netProfit);
      profitEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (ordersEl) ordersEl.innerText = completedOrders;
    if (avgEl) avgEl.innerText = rupiah(avgBasket);

    // Update Chart Title
    const chartTitleEl = document.getElementById('dashChartTitle');
    if (chartTitleEl) {
      chartTitleEl.innerHTML = `Grafik Penjualan Harian <span style="font-size:12px; font-weight:500; color:#8c7365;">(${formatHumanDate(startDate)} - ${formatHumanDate(endDate)})</span>`;
    }

    // Render sales trend chart
    renderDashboardTrendChart(res.dailyTrend || []);

    // Render top 5 products
    renderDashboardTopProducts(res.itemSales || []);

    // Render item sales table if present
    renderDashboardItemSales(res.itemSales || []);

    // Render low stock alerts
    renderDashboardLowStock();

    // Render Cash Balance Widgets
    if (res.cashReport) {
      renderCashBalanceWidgets(res.cashReport);
    } else if (cashSummary) {
      renderCashBalanceWidgets(cashSummary);
    }

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    if (badgeEl) badgeEl.innerText = 'Gagal memuat data periode.';
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Low Stock List Renderer
function renderDashboardLowStock() {
  const lowStockList = document.getElementById('low-stock-list');
  if (!lowStockList) return;

  const lowIngredients = (ingredients || []).filter(i => Number(i.stock) <= Number(i.minStock));
  const lowProducts = (products || []).filter(p => Number(p.stock) <= 10);

  if (lowIngredients.length > 0 || lowProducts.length > 0) {
    let html = '';
    lowIngredients.forEach(i => {
      html += `
        <li style="display:flex; justify-content:space-between; align-items:center; background-color: #fef3c7; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #b45309; margin-bottom:4px;">
          <span><i class="fa-solid fa-boxes-stacked"></i> <b>${esc(i.name)}</b> (Bahan Baku)</span>
          <span class="badge-stock" style="background:#b45309; color:#fff; padding:2px 8px; border-radius:99px; font-size:11px;">Sisa: ${i.stock} ${i.unit}</span>
        </li>
      `;
    });
    lowProducts.forEach(p => {
      html += `
        <li style="display:flex; justify-content:space-between; align-items:center; background-color: var(--danger-bg); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--danger); margin-bottom:4px;">
          <span><i class="fa-solid fa-mug-hot"></i> <b>${esc(p.name)}</b></span>
          <span class="badge-stock stock-empty">Sisa Stok: ${p.stock}</span>
        </li>
      `;
    });
    lowStockList.innerHTML = html;
  } else {
    lowStockList.innerHTML = `<li style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Semua stok bahan & produk aman.</li>`;
  }
}

// Top 5 Products Renderer
function renderDashboardTopProducts(itemSales) {
  const topProductsTableBody = document.querySelector('#top-products-table tbody');
  if (!topProductsTableBody) return;

  const sorted = [...itemSales].sort((a, b) => b.qtySold - a.qtySold).slice(0, 5);

  if (sorted.length > 0) {
    topProductsTableBody.innerHTML = sorted.map(p => `
      <tr>
        <td><b>${esc(p.productName)}</b></td>
        <td style="text-align: right; font-weight: 700; color: var(--coffee);">${p.qtySold}x</td>
      </tr>
    `).join('');
  } else {
    topProductsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color: #927568;">Belum ada data penjualan.</td></tr>`;
  }
}

// Item Sales Table Renderer
function renderDashboardItemSales(itemSales) {
  const reportTableBody = document.querySelector('#item-sales-report-table tbody');
  if (!reportTableBody) return;

  if (itemSales && itemSales.length > 0) {
    reportTableBody.innerHTML = itemSales.map((p, idx) => `
      <tr>
        <td style="width: 50px;">${idx + 1}</td>
        <td><b>${esc(p.productName)}</b></td>
        <td style="text-align: center; font-weight: 700;">${p.qtySold} unit</td>
        <td style="text-align: right; font-weight: 700; color: var(--coffee);">${rupiah(p.totalSales)}</td>
      </tr>
    `).join('');
  } else {
    reportTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #927568;">Belum ada data penjualan item.</td></tr>`;
  }
}

// Dynamic Sales & Profit Trend Chart
function renderDashboardTrendChart(dailyTrend) {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (dailyTrend.length === 0) {
    const todayStr = formatDashDateYMD(new Date());
    dailyTrend = [{ date: todayStr, sales: 0, orders: 0 }];
  }

  const labels = dailyTrend.map(d => {
    const parts = d.date.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
  });
  const salesData = dailyTrend.map(d => d.sales);
  const ordersData = dailyTrend.map(d => d.orders);

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Omset Penjualan (Rp)',
          data: salesData,
          borderColor: '#c59b62',
          backgroundColor: 'rgba(197, 155, 98, 0.12)',
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Jumlah Transaksi (Order)',
          data: ordersData,
          borderColor: '#49633c',
          backgroundColor: 'rgba(73, 99, 60, 0.15)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.datasetIndex === 0) {
                return ' Omset: ' + rupiah(context.parsed.y);
              } else {
                return ' Transaksi: ' + context.parsed.y + ' order';
              }
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return 'Rp' + (value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'k');
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            stepSize: 1,
            precision: 0
          }
        }
      }
    }
  });
}

// Initial entry point for Dashboard overview
function renderDashboardOverview() {
  if (!dashStartDateVal || !dashEndDateVal) {
    const range = computeDashPresetDates('thisyear');
    dashStartDateVal = range.start;
    dashEndDateVal = range.end;
    loadDashboardData(dashStartDateVal, dashEndDateVal, range.label);
  } else {
    loadDashboardData(dashStartDateVal, dashEndDateVal);
  }
}

// Cash & Bank Real-Time Ledger renderer
function renderCashBalanceWidgets(customCash = null) {
  const cash = customCash || cashSummary || (dashboardDataCache && dashboardDataCache.cashReport) || null;
  if (!cash) return;

  const drawer = Number(cash.drawerCashBalance || 0);
  const bank = Number(cash.bankBalance || 0);
  const total = Number(cash.totalLiquidCash != null ? cash.totalLiquidCash : (drawer + bank));

  const drawerEls = document.querySelectorAll('.val-cash-drawer');
  const bankEls = document.querySelectorAll('.val-cash-bank');
  const totalEls = document.querySelectorAll('.val-cash-total');

  drawerEls.forEach(el => {
    el.innerText = rupiah(drawer);
    el.style.color = drawer < 0 ? 'var(--danger)' : '#2563eb';
  });

  bankEls.forEach(el => {
    el.innerText = rupiah(bank);
    el.style.color = bank < 0 ? 'var(--danger)' : '#059669';
  });

  totalEls.forEach(el => {
    el.innerText = rupiah(total);
    el.style.color = total < 0 ? 'var(--danger)' : 'var(--coffee)';
  });

  // Also render adjustment history if container is present
  renderCashAdjustmentHistory();
}

// ---------------- CASH ADJUSTMENT / OPENING BALANCE MODAL ----------------
function openCashAdjustmentModal() {
  const modal = document.getElementById('cashAdjustmentModalOverlay');
  if (!modal) return;

  const curDrawer = cashSummary ? Number(cashSummary.drawerCashBalance || 0) : 0;
  const curBank = cashSummary ? Number(cashSummary.bankBalance || 0) : 0;

  const inpDrawer = document.getElementById('adj-drawer-target');
  const inpBank = document.getElementById('adj-bank-target');
  const inpDate = document.getElementById('adj-date');
  const inpNotes = document.getElementById('adj-notes');

  // Pre-populate input fields
  if (inpDrawer) inpDrawer.value = curDrawer > 0 ? curDrawer : '';
  if (inpBank) inpBank.value = curBank > 0 ? curBank : '';

  if (inpDate) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    inpDate.value = `${y}-${m}-${d}`;
  }

  if (inpNotes && !inpNotes.value) {
    inpNotes.value = 'Serah terima kas pengelola baru';
  }

  modal.classList.add('show');
}

function closeCashAdjustmentModal() {
  const modal = document.getElementById('cashAdjustmentModalOverlay');
  if (modal) modal.classList.remove('show');
}

async function saveCashAdjustmentForm(e) {
  if (e) e.preventDefault();

  const inpDrawer = document.getElementById('adj-drawer-target');
  const inpBank = document.getElementById('adj-bank-target');
  const inpDate = document.getElementById('adj-date');
  const inpNotes = document.getElementById('adj-notes');
  const saveBtn = document.getElementById('saveCashAdjustmentBtn');

  const drawerVal = inpDrawer && inpDrawer.value !== '' ? parseFloat(inpDrawer.value) : null;
  const bankVal = inpBank && inpBank.value !== '' ? parseFloat(inpBank.value) : null;
  const dateVal = inpDate ? inpDate.value : '';
  const notesVal = inpNotes ? inpNotes.value.trim() : '';

  if (drawerVal === null && bankVal === null) {
    showToast('Masukkan target nominal saldo Kas Laci atau Kas Bank', 'warning');
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
  }

  try {
    const res = await apiPost('savecashadjustment', {
      drawerTarget: drawerVal,
      bankTarget: bankVal,
      adjustmentDate: dateVal,
      notes: notesVal
    });

    showToast(res.message || 'Saldo kas berhasil disinkronkan', 'success');
    closeCashAdjustmentModal();

    if (typeof reloadData === 'function') {
      await reloadData();
    } else if (typeof loadDashboardData === 'function') {
      await loadDashboardData(dashStartDateVal, dashEndDateVal);
    }
  } catch (err) {
    console.error('Failed to save cash adjustment:', err);
    showToast(err.message || 'Gagal menyimpan penyesuaian saldo kas', 'danger');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Simpan & Terapkan Saldo';
    }
  }
}

function renderCashAdjustmentHistory() {
  const container = document.getElementById('cashAdjustmentHistoryList');
  if (!container) return;

  const list = (cashSummary && Array.isArray(cashSummary.recentAdjustments)) ? cashSummary.recentAdjustments : [];
  if (!list.length) {
    container.innerHTML = '<div style="color: #8c7365; font-style: italic; padding: 6px 0;">Belum ada catatan penyesuaian / kalibrasi saldo kas.</div>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
  list.slice(0, 10).forEach(item => {
    const numAmt = Number(item.amount || 0);
    const isPlus = numAmt >= 0;
    const isDrawer = item.accountType === 'Kas Tunai (Laci)';
    const badgeBg = isDrawer ? '#eff6ff' : '#ecfdf5';
    const badgeColor = isDrawer ? '#2563eb' : '#059669';
    const sign = isPlus ? '+' : '';

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid var(--border); padding: 8px 12px; border-radius: 10px; flex-wrap: wrap; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 6px;">
            ${esc(item.accountType)}
          </span>
          <span style="font-weight: 600; color: var(--coffee); font-size: 12px;">${esc(item.notes || item.adjustmentType)}</span>
          <span style="font-size: 11px; color: #8c7365;">(${item.adjustmentDate})</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 800; font-size: 13px; color: ${isPlus ? '#16a34a' : 'var(--danger)'};">
            ${sign}${rupiah(numAmt)}
          </span>
          <button type="button" class="btn btn-outline btn-sm" onclick="deleteCashAdjustmentRecord(${item.id})" title="Hapus catatan ini" style="padding: 2px 8px; font-size: 11px; color: var(--danger); border-color: #fca5a5; background: #fff5f5;">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

async function deleteCashAdjustmentRecord(id) {
  if (!confirm('Hapus catatan penyesuaian kas ini? Saldo kas akan dihitung ulang secara otomatis.')) return;
  try {
    const res = await apiPost('deletecashadjustment', { id });
    showToast(res.message || 'Catatan penyesuaian kas berhasil dihapus', 'success');
    if (typeof reloadData === 'function') await reloadData();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus penyesuaian kas', 'danger');
  }
}

// Expose cash adjustment functions to window
window.openCashAdjustmentModal = openCashAdjustmentModal;
window.closeCashAdjustmentModal = closeCashAdjustmentModal;
window.saveCashAdjustmentForm = saveCashAdjustmentForm;
window.renderCashAdjustmentHistory = renderCashAdjustmentHistory;
window.deleteCashAdjustmentRecord = deleteCashAdjustmentRecord;
