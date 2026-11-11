// =====================================================================
// COMPREHENSIVE FINANCIAL & SALES REPORTS MODULE (P&L, COGS, OPEX, CSV)
// =====================================================================

let reportPeriodPreset = 'thismonth';
let reportStartDateVal = '';
let reportEndDateVal = '';
let currentReportData = null;
let reportTrendChartInstance = null;
let reportExpenseChartInstance = null;

// Helper: Format Date to YYYY-MM-DD
function formatReportDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Compute report preset date ranges
function computeReportPresetDates(preset) {
  const now = new Date();
  let start = '';
  let end = formatReportDateYMD(now);
  let label = '';

  if (preset === 'today') {
    start = end;
    label = `Hari Ini (${formatHumanDate(start)})`;
  } else if (preset === '7days') {
    const d7 = new Date();
    d7.setDate(now.getDate() - 6);
    start = formatReportDateYMD(d7);
    label = `7 Hari Terakhir (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'lastmonth') {
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    start = formatReportDateYMD(firstDayPrev);
    end = formatReportDateYMD(lastDayPrev);
    label = `Bulan Lalu (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'thisyear') {
    start = `${now.getFullYear()}-01-01`;
    label = `Tahun Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else {
    // Default: 'thismonth'
    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    label = `Bulan Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  }

  return { start, end, label };
}

// Entry point when switching to reports tab
function renderReportsModule() {
  if (!reportStartDateVal || !reportEndDateVal) {
    const range = computeReportPresetDates('thismonth');
    reportStartDateVal = range.start;
    reportEndDateVal = range.end;
  }
  loadFinancialReports();
}

// Switch period preset on reports
async function setReportPeriod(preset) {
  reportPeriodPreset = preset;

  // Update button active state
  const btnGroup = document.getElementById('reportPeriodBtnGroup');
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

  const customBox = document.getElementById('reportCustomDateBox');

  if (preset === 'custom') {
    if (customBox) customBox.style.display = 'flex';
    const startInput = document.getElementById('reportStartDate');
    const endInput = document.getElementById('reportEndDate');
    if (startInput && !startInput.value) {
      startInput.value = reportStartDateVal || formatReportDateYMD(new Date());
    }
    if (endInput && !endInput.value) {
      endInput.value = reportEndDateVal || formatReportDateYMD(new Date());
    }
    return;
  }

  if (customBox) customBox.style.display = 'none';

  const range = computeReportPresetDates(preset);
  reportStartDateVal = range.start;
  reportEndDateVal = range.end;

  await loadFinancialReports();
}

// Apply custom dates on reports
async function applyCustomReportDates() {
  const startInput = document.getElementById('reportStartDate');
  const endInput = document.getElementById('reportEndDate');
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

  reportStartDateVal = start;
  reportEndDateVal = end;
  await loadFinancialReports();
}

// Load and render financial reports
async function loadFinancialReports() {
  const spinner = document.getElementById('reportLoadingSpinner');
  const activeText = document.getElementById('reportActivePeriodText');
  const printLabel = document.getElementById('repPrintPeriodLabel');

  if (spinner) spinner.style.display = 'inline-block';

  try {
    const data = await apiFetch('getreports', {
      startDate: reportStartDateVal,
      endDate: reportEndDateVal
    });

    currentReportData = data;

    const periodStr = `${formatHumanDate(reportStartDateVal)} s/d ${formatHumanDate(reportEndDateVal)}`;
    if (activeText) activeText.innerText = `Periode Laporan: ${periodStr}`;
    if (printLabel) printLabel.innerText = `Periode: ${periodStr} | Dicetak: ${new Date().toLocaleString('id-ID')}`;

    // 1. Executive P&L Cards
    renderExecutiveSummaryCards(data);

    // 2. Charts (Trend & Expense Breakdown)
    renderReportTrendChart(data.dailyTrend || []);
    renderReportExpenseChart(data.expensesByCategory || []);

    // 3. Payment Methods Breakdown
    renderReportPaymentMethods(data.paymentMethods || {});

    // 4. Product Sales Performance Table
    populateReportCategoryFilter(data.itemSales || []);
    filterReportProducts();

    // 5. Operating Expenses Table
    renderReportExpensesBreakdown(data.expensesByCategory || [], Number(data.financialSummary?.totalExpenses || 0));

    // 6. Debts & Installments Position & Cashflow
    renderReportDebtSection(data.debtReport || {}, data.financialSummary || {});

    // 7. Cash & Bank Ledger Flow & Current Balances
    renderReportCashSection(data.cashReport || {});

  } catch (err) {
    console.error('Failed to load financial reports:', err);
    if (activeText) activeText.innerText = 'Gagal memuat laporan: ' + (err.message || 'Error API');
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

// 1. Executive P&L Summary Cards
function renderExecutiveSummaryCards(data) {
  const fin = data.financialSummary || {};
  const netSales = Number(fin.netSales || 0);
  const totalCogs = Number(fin.totalCogs || 0);
  const grossProfit = Number(fin.grossProfit || 0);
  const grossMarginPct = Number(fin.grossMarginPct || 0);
  const totalExpenses = Number(fin.totalExpenses || 0);
  const netProfit = Number(fin.netProfit || 0);
  const netMarginPct = Number(fin.netMarginPct || 0);
  const completedOrders = Number(fin.completedOrders || 0);

  const cogsPct = netSales > 0 ? ((totalCogs / netSales) * 100).toFixed(1) : 0;

  document.getElementById('rep-net-sales').innerText = rupiah(netSales);
  document.getElementById('rep-sales-sub').innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success);"></i> ${completedOrders} transaksi sukses`;

  document.getElementById('rep-cogs').innerText = rupiah(totalCogs);
  document.getElementById('rep-cogs-sub').innerHTML = `<i class="fa-solid fa-percent"></i> ${cogsPct}% dari omset`;

  document.getElementById('rep-gross-profit').innerText = rupiah(grossProfit);
  document.getElementById('rep-gross-sub').innerHTML = `<i class="fa-solid fa-chart-line"></i> Margin kotor: ${grossMarginPct}%`;

  document.getElementById('rep-expenses').innerText = rupiah(totalExpenses);
  const expCount = (data.expensesByCategory || []).reduce((acc, c) => acc + (c.count || 0), 0);
  document.getElementById('rep-expenses-sub').innerHTML = `<i class="fa-solid fa-list-check"></i> ${expCount} pos pengeluaran`;

  const netCard = document.getElementById('rep-net-profit-card');
  const netEl = document.getElementById('rep-net-profit');
  const netSubEl = document.getElementById('rep-net-sub');

  if (netEl) netEl.innerText = rupiah(netProfit);

  if (netProfit >= 0) {
    if (netCard) {
      netCard.className = 'report-kpi-card highlight-profit';
    }
    if (netEl) netEl.style.color = 'var(--success)';
    if (netSubEl) netSubEl.innerHTML = `<i class="fa-solid fa-trophy" style="color:var(--success);"></i> Net Margin: +${netMarginPct}% (Untung)`;
  } else {
    if (netCard) {
      netCard.className = 'report-kpi-card highlight-loss';
    }
    if (netEl) netEl.style.color = 'var(--danger)';
    if (netSubEl) netSubEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Net Margin: ${netMarginPct}% (Defisit)`;
  }
}

// 2. Report Daily Trend Chart
function renderReportTrendChart(dailyTrend) {
  const canvas = document.getElementById('reportTrendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (dailyTrend.length === 0) {
    const todayStr = formatReportDateYMD(new Date());
    dailyTrend = [{ date: todayStr, sales: 0, orders: 0 }];
  }

  const labels = dailyTrend.map(d => {
    const parts = d.date.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
  });
  const salesData = dailyTrend.map(d => d.sales);

  if (reportTrendChartInstance) {
    reportTrendChartInstance.destroy();
  }

  reportTrendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Omset Penjualan (Rp)',
          data: salesData,
          backgroundColor: 'rgba(197, 155, 98, 0.75)',
          borderColor: '#c59b62',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ' Omset: ' + rupiah(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (val) {
              return 'Rp' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'k');
            }
          }
        }
      }
    }
  });
}

// 3. Report Expense Doughnut Chart
function renderReportExpenseChart(expensesByCategory) {
  const canvas = document.getElementById('reportExpenseChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (reportExpenseChartInstance) {
    reportExpenseChartInstance.destroy();
  }

  if (expensesByCategory.length === 0) {
    reportExpenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Tidak ada beban'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }

  const labels = expensesByCategory.map(e => e.category);
  const data = expensesByCategory.map(e => e.amount);
  const colors = [
    '#3b1f12', '#c59b62', '#ad3d2b', '#49633c', '#2563eb',
    '#d97706', '#9333ea', '#0d9488', '#64748b'
  ];

  reportExpenseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: { family: 'Plus Jakarta Sans', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ` ${ctx.label}: ${rupiah(ctx.parsed)}`;
            }
          }
        }
      }
    }
  });
}

// 4. Payment Methods Breakdown
function renderReportPaymentMethods(payment) {
  const qrisSales = Number(payment.qrisSales || 0);
  const cashSales = Number(payment.cashSales || 0);
  const qrisCount = Number(payment.qrisCount || 0);
  const cashCount = Number(payment.cashCount || 0);
  const totalSales = qrisSales + cashSales;

  const qrisPct = totalSales > 0 ? Math.round((qrisSales / totalSales) * 100) : 0;
  const cashPct = totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0;

  document.getElementById('rep-qris-sales').innerText = rupiah(qrisSales);
  document.getElementById('rep-qris-count').innerText = `${qrisCount} transaksi`;
  document.getElementById('rep-qris-pct').innerText = `${qrisPct}% dari total omset`;

  document.getElementById('rep-cash-sales').innerText = rupiah(cashSales);
  document.getElementById('rep-cash-count').innerText = `${cashCount} transaksi`;
  document.getElementById('rep-cash-pct').innerText = `${cashPct}% dari total omset`;
}

// 5. Populate Category Filter for Product Table
function populateReportCategoryFilter(itemSales) {
  const sel = document.getElementById('reportCategoryFilter');
  if (!sel) return;

  const currentVal = sel.value || 'Semua';
  const categories = Array.from(new Set(itemSales.map(i => i.category).filter(Boolean))).sort();

  let optionsHtml = '<option value="Semua">Semua Kategori</option>';
  categories.forEach(cat => {
    optionsHtml += `<option value="${esc(cat)}" ${cat === currentVal ? 'selected' : ''}>${esc(cat)}</option>`;
  });
  sel.innerHTML = optionsHtml;
}

// 6. Filter & Render Product Sales Table
function filterReportProducts() {
  if (!currentReportData) return;

  const searchInput = document.getElementById('reportProductSearch');
  const catFilter = document.getElementById('reportCategoryFilter');
  const tbody = document.getElementById('reportProductsTableBody');
  const tfoot = document.getElementById('reportProductsTableFoot');

  if (!tbody || !tfoot) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCat = catFilter?.value || 'Semua';

  const items = (currentReportData.itemSales || []).filter(item => {
    const matchesSearch = !query ||
      (item.productName || '').toLowerCase().includes(query) ||
      (item.productId || '').toLowerCase().includes(query);
    const matchesCat = (selectedCat === 'Semua') || (item.category === selectedCat);
    return matchesSearch && matchesCat;
  });

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #927568; padding: 24px;">Tidak ada produk yang sesuai dengan filter pencarian.</td></tr>`;
    tfoot.innerHTML = '';
    return;
  }

  let totalQty = 0;
  let totalSales = 0;
  let totalCogs = 0;
  let totalGross = 0;

  tbody.innerHTML = items.map((item, idx) => {
    totalQty += item.qtySold;
    totalSales += item.totalSales;
    totalCogs += item.totalCogs;
    totalGross += item.grossProfit;

    const marginColor = item.marginPct >= 50 ? 'var(--success)' : (item.marginPct >= 20 ? 'var(--warning)' : 'var(--danger)');

    return `
      <tr>
        <td style="text-align:center; color:#8c7365;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: var(--coffee);">${esc(item.productName)}</div>
          <div style="font-size: 11px; color: #8c7365;">ID: ${esc(item.productId)}</div>
        </td>
        <td><span class="status-badge" style="background:var(--cream); color:var(--coffee);">${esc(item.category || '-')}</span></td>
        <td style="text-align:center; font-weight:700;">${item.qtySold}</td>
        <td style="text-align:right; color:#8c7365;">${rupiah(item.cogsPerUnit)}</td>
        <td style="text-align:right; font-weight:700; color:var(--coffee);">${rupiah(item.totalSales)}</td>
        <td style="text-align:right; color:#b45309;">${rupiah(item.totalCogs)}</td>
        <td style="text-align:right; font-weight:700; color:${item.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${rupiah(item.grossProfit)}</td>
        <td style="text-align:right; font-weight:800; color:${marginColor};">${item.marginPct}%</td>
      </tr>
    `;
  }).join('');

  const overallMargin = totalSales > 0 ? ((totalGross / totalSales) * 100).toFixed(1) : 0;

  tfoot.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:right; padding: 12px 14px;">TOTAL KESELURUHAN:</td>
      <td style="text-align:center; padding: 12px 14px;">${totalQty} pcs</td>
      <td style="text-align:right; padding: 12px 14px;">-</td>
      <td style="text-align:right; color:var(--coffee); padding: 12px 14px;">${rupiah(totalSales)}</td>
      <td style="text-align:right; color:#b45309; padding: 12px 14px;">${rupiah(totalCogs)}</td>
      <td style="text-align:right; color:${totalGross >= 0 ? 'var(--success)' : 'var(--danger)'}; padding: 12px 14px;">${rupiah(totalGross)}</td>
      <td style="text-align:right; color:var(--coffee); padding: 12px 14px;">${overallMargin}%</td>
    </tr>
  `;
}

// 7. Render Expenses Breakdown Table
function renderReportExpensesBreakdown(expensesByCategory, totalExpenses) {
  const tbody = document.getElementById('reportExpensesBreakdownBody');
  if (!tbody) return;

  if (expensesByCategory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #927568; padding: 20px;">Tidak ada catatan beban operasional pada periode ini.</td></tr>`;
    return;
  }

  tbody.innerHTML = expensesByCategory.map((exp, idx) => {
    const pct = totalExpenses > 0 ? ((exp.amount / totalExpenses) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td style="text-align:center; color:#8c7365;">${idx + 1}</td>
        <td><b style="color:var(--coffee);">${esc(exp.category)}</b></td>
        <td style="text-align:center; font-weight:700;">${exp.count} kali</td>
        <td style="text-align:right; font-weight:700; color:var(--danger);">${rupiah(exp.amount)}</td>
        <td style="text-align:right; font-weight:700; color:var(--coffee);">${pct}%</td>
      </tr>
    `;
  }).join('');
}

// 7B. Render Debt Position & Period Installments Section
function renderReportDebtSection(debtReport = {}, finSummary = {}) {
  const totalLoan = Number(debtReport.totalLoan || 0);
  const totalPaid = Number(debtReport.totalPaid || 0);
  const remaining = Number(debtReport.remainingBalance || 0);
  const periodPaid = Number(debtReport.periodPaymentsTotal || 0);
  const netProfit = Number(finSummary.netProfit || 0);
  const freeCashflow = netProfit - periodPaid;

  // KPI elements
  const elLoan = document.getElementById('rep-total-debt');
  const elPaid = document.getElementById('rep-total-debt-paid');
  const elRem = document.getElementById('rep-total-debt-remaining');
  const elPeriodPaid = document.getElementById('rep-period-debt-paid');

  if (elLoan) elLoan.innerText = rupiah(totalLoan);
  if (elPaid) elPaid.innerText = rupiah(totalPaid);
  if (elRem) elRem.innerText = rupiah(remaining);
  if (elPeriodPaid) elPeriodPaid.innerText = rupiah(periodPaid);

  // Free Cashflow Insight box
  const elCfNetProfit = document.getElementById('rep-cf-net-profit');
  const elCfDebtPaid = document.getElementById('rep-cf-debt-paid');
  const elCfFree = document.getElementById('rep-cf-free-cashflow');
  const elCfStatus = document.getElementById('rep-cf-status-badge');

  if (elCfNetProfit) elCfNetProfit.innerText = rupiah(netProfit);
  if (elCfDebtPaid) elCfDebtPaid.innerText = rupiah(periodPaid);
  if (elCfFree) {
    elCfFree.innerText = rupiah(freeCashflow);
    elCfFree.style.color = freeCashflow >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (elCfStatus) {
    if (periodPaid === 0 && totalLoan === 0) {
      elCfStatus.innerHTML = `<span class="badge" style="background:#efe0c8; color:#6b4329;"><i class="fa-solid fa-circle-info"></i> Tidak Ada Cicilan</span>`;
    } else if (freeCashflow >= 0) {
      elCfStatus.innerHTML = `<span class="badge" style="background:#16a34a; color:#fff;"><i class="fa-solid fa-circle-check"></i> Cash Flow Sehat (Laba menutup cicilan)</span>`;
    } else {
      elCfStatus.innerHTML = `<span class="badge" style="background:#ef4444; color:#fff;"><i class="fa-solid fa-triangle-exclamation"></i> Defisit Kas (Cicilan melebihi laba toko)</span>`;
    }
  }

  // 1. Debt Status Table
  const debtTbody = document.getElementById('reportDebtsTableBody');
  const debtsList = debtReport.debtsList || [];
  if (debtTbody) {
    if (debtsList.length === 0) {
      debtTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #927568; padding: 20px;">Tidak ada data pinjaman modal usaha.</td></tr>`;
    } else {
      debtTbody.innerHTML = debtsList.map(d => {
        const isPaid = (d.status || '').toLowerCase() === 'paid off' || (Number(d.loanAmount) > 0 && Number(d.remainingBalance) <= 0);
        const statusBadge = isPaid
          ? `<span class="badge" style="background:#16a34a; color:#fff; font-size:10px;"><i class="fa-solid fa-circle-check"></i> Lunas</span>`
          : `<span class="badge" style="background:#d97706; color:#fff; font-size:10px;"><i class="fa-solid fa-clock"></i> Aktif</span>`;
        return `
          <tr>
            <td><b style="color:var(--coffee);">${esc(d.creditorName)}</b><br><small style="color:#8c7365;">${esc(d.debtNo)}</small></td>
            <td style="white-space:nowrap;">${esc(d.loanDate)}</td>
            <td style="text-align:right; font-weight:700;">${rupiah(d.loanAmount)}</td>
            <td style="text-align:right; font-weight:700; color:var(--success);">${rupiah(d.totalPaid)}</td>
            <td style="text-align:right; font-weight:700; color:${d.remainingBalance > 0 ? 'var(--danger)' : '#16a34a'};">${rupiah(d.remainingBalance)}</td>
            <td style="text-align:center;">${d.progressPct || 0}%</td>
            <td style="text-align:center;">${statusBadge}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. Period Payments Table
  const payTbody = document.getElementById('reportPeriodPaymentsBody');
  const periodPayments = debtReport.periodPayments || [];
  if (payTbody) {
    if (periodPayments.length === 0) {
      payTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #927568; padding: 20px;">Tidak ada pembayaran cicilan hutang pada periode ini.</td></tr>`;
    } else {
      payTbody.innerHTML = periodPayments.map((p, idx) => `
        <tr>
          <td style="text-align:center; color:#8c7365;">${idx + 1}</td>
          <td style="white-space:nowrap;">${esc(p.paymentDate)}</td>
          <td><code>${esc(p.paymentNo)}</code></td>
          <td><b>${esc(p.creditorName)}</b></td>
          <td style="text-align:right; font-weight:700; color:var(--success);">${rupiah(p.amount)}</td>
          <td><span class="badge" style="background:#efe0c8; color:#6b4329; font-size:10px;">${esc(p.paymentMethod)}</span> ${esc(p.notes || '')}</td>
        </tr>
      `).join('');
    }
  }
}

// 7. Cash & Bank Ledger Flow & Current Balances Renderer
function renderReportCashSection(cashReport = {}) {
  const drawerBal = Number(cashReport.drawerCashBalance || 0);
  const bankBal = Number(cashReport.bankBalance || 0);
  const totalBal = Number(cashReport.totalLiquidCash != null ? cashReport.totalLiquidCash : (drawerBal + bankBal));

  const flow = cashReport.periodFlow || {};
  const cashIn = Number(flow.cashIn || 0);
  const qrisIn = Number(flow.qrisIn || 0);
  const cashLoan = Number(flow.cashLoan || 0);
  const bankLoan = Number(flow.bankLoan || 0);
  const totalIn = Number(flow.totalIn != null ? flow.totalIn : (cashIn + qrisIn + cashLoan + bankLoan));

  const cashExp = Number(flow.cashExpense || 0);
  const bankExp = Number(flow.bankExpense || 0);
  const cashDebt = Number(flow.cashDebtPaid || 0);
  const bankDebt = Number(flow.bankDebtPaid || 0);
  const cashToBank = Number(flow.cashToBank || 0);
  const totalOut = Number(flow.totalOut != null ? flow.totalOut : (cashExp + bankExp + cashDebt + bankDebt));

  const drawerNet = Number(flow.drawerNet != null ? flow.drawerNet : (cashIn + cashLoan - (cashExp + cashDebt + cashToBank)));
  const bankNet = Number(flow.bankNet != null ? flow.bankNet : (qrisIn + bankLoan + cashToBank - (bankExp + bankDebt)));
  const periodNet = Number(flow.periodNet != null ? flow.periodNet : (totalIn - totalOut));

  // Current real-time balances
  const elDrawerBal = document.getElementById('rep-cash-drawer-balance');
  const elBankBal = document.getElementById('rep-cash-bank-balance');
  const elTotalBal = document.getElementById('rep-cash-total-balance');

  if (elDrawerBal) elDrawerBal.innerText = rupiah(drawerBal);
  if (elBankBal) elBankBal.innerText = rupiah(bankBal);
  if (elTotalBal) elTotalBal.innerText = rupiah(totalBal);

  // Period flow summaries
  const elTotalIn = document.getElementById('rep-cashflow-total-in');
  const elTotalOut = document.getElementById('rep-cashflow-total-out');
  const elPeriodNet = document.getElementById('rep-cashflow-period-net');
  const elNetBadge = document.getElementById('rep-cashflow-net-badge');

  if (elTotalIn) elTotalIn.innerText = rupiah(totalIn);
  if (elTotalOut) elTotalOut.innerText = rupiah(totalOut);
  if (elPeriodNet) {
    elPeriodNet.innerText = (periodNet >= 0 ? '+' : '') + rupiah(periodNet);
    elPeriodNet.style.color = periodNet >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  if (elNetBadge) {
    if (periodNet > 0) {
      elNetBadge.innerHTML = `<span class="badge" style="background:#16a34a; color:#fff; font-size:11px;"><i class="fa-solid fa-arrow-trend-up"></i> Surplus Kas (+${rupiah(periodNet)})</span>`;
    } else if (periodNet < 0) {
      elNetBadge.innerHTML = `<span class="badge" style="background:#ef4444; color:#fff; font-size:11px;"><i class="fa-solid fa-arrow-trend-down"></i> Defisit Kas (${rupiah(periodNet)})</span>`;
    } else {
      elNetBadge.innerHTML = `<span class="badge" style="background:#6b7280; color:#fff; font-size:11px;"><i class="fa-solid fa-equals"></i> Kas Berimbang</span>`;
    }
  }

  // Breakdown details
  const elFlowCashIn = document.getElementById('rep-flow-cash-in');
  const elFlowQrisIn = document.getElementById('rep-flow-qris-in');
  const elFlowCashLoan = document.getElementById('rep-flow-cash-loan');
  const elFlowBankLoan = document.getElementById('rep-flow-bank-loan');
  const elFlowCashExp = document.getElementById('rep-flow-cash-exp');
  const elFlowBankExp = document.getElementById('rep-flow-bank-exp');
  const elFlowCashDebt = document.getElementById('rep-flow-cash-debt');
  const elFlowBankDebt = document.getElementById('rep-flow-bank-debt');
  const elFlowCashToBank = document.getElementById('rep-flow-cash-tobank');
  const elFlowDrawerAdj = document.getElementById('rep-flow-drawer-adj');
  const elFlowBankAdj = document.getElementById('rep-flow-bank-adj');
  const elFlowDrawerNet = document.getElementById('rep-flow-drawer-net');
  const elFlowBankNet = document.getElementById('rep-flow-bank-net');

  const drawerAdj = Number(flow.drawerAdj || 0);
  const bankAdj = Number(flow.bankAdj || 0);

  if (elFlowCashIn) elFlowCashIn.innerText = rupiah(cashIn);
  if (elFlowQrisIn) elFlowQrisIn.innerText = rupiah(qrisIn);
  if (elFlowCashLoan) elFlowCashLoan.innerText = rupiah(cashLoan);
  if (elFlowBankLoan) elFlowBankLoan.innerText = rupiah(bankLoan);
  if (elFlowCashExp) elFlowCashExp.innerText = rupiah(cashExp);
  if (elFlowBankExp) elFlowBankExp.innerText = rupiah(bankExp);
  if (elFlowCashDebt) elFlowCashDebt.innerText = rupiah(cashDebt);
  if (elFlowBankDebt) elFlowBankDebt.innerText = rupiah(bankDebt);
  if (elFlowCashToBank) elFlowCashToBank.innerText = rupiah(cashToBank);
  if (elFlowDrawerAdj) elFlowDrawerAdj.innerText = (drawerAdj >= 0 ? '+' : '') + rupiah(drawerAdj);
  if (elFlowBankAdj) elFlowBankAdj.innerText = (bankAdj >= 0 ? '+' : '') + rupiah(bankAdj);

  if (elFlowDrawerNet) {
    elFlowDrawerNet.innerText = (drawerNet >= 0 ? '+' : '') + rupiah(drawerNet);
    elFlowDrawerNet.style.color = drawerNet >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (elFlowBankNet) {
    elFlowBankNet.innerText = (bankNet >= 0 ? '+' : '') + rupiah(bankNet);
    elFlowBankNet.style.color = bankNet >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

// 8. Download Clean CSV / Excel Report
function downloadReportsCSV() {
  if (!currentReportData) {
    alert('Belum ada data laporan untuk di-export.');
    return;
  }

  const fin = currentReportData.financialSummary || {};
  const pay = currentReportData.paymentMethods || {};
  const items = currentReportData.itemSales || [];
  const expenses = currentReportData.expensesByCategory || [];

  let csv = '';

  // Header & Metadata
  csv += 'DJACO COFFEE - LAPORAN KEUANGAN DAN PENJUALAN\n';
  csv += `Periode;${reportStartDateVal} s/d ${reportEndDateVal}\n`;
  csv += `Tanggal Export;${new Date().toLocaleString('id-ID')}\n\n`;

  // Section 1: Executive Income Statement (P&L)
  csv += '=== RINGKASAN EKSEKUTIF LABA RUGI (INCOME STATEMENT) ===\n';
  csv += `Komponen;Nominal (Rp);Keterangan / Rasio\n`;
  csv += `Total Penjualan Bersih (Net Sales);${fin.netSales || 0};${fin.completedOrders || 0} Transaksi Sukses\n`;
  csv += `HPP Bahan Baku (COGS);${fin.totalCogs || 0};Biaya Bahan Baku Terpakai\n`;
  csv += `Laba Kotor (Gross Profit);${fin.grossProfit || 0};Gross Margin: ${fin.grossMarginPct || 0}%\n`;
  csv += `Beban Operasional Toko (Opex);${fin.totalExpenses || 0};Biaya Operasional\n`;
  csv += `Laba Bersih Toko (Net Profit);${fin.netProfit || 0};Net Margin: ${fin.netMarginPct || 0}%\n\n`;

  // Section 2: Payment Methods
  csv += '=== DISTRIBUSI METODE PEMBAYARAN ===\n';
  csv += `Metode Pembayaran;Total Nominal (Rp);Jumlah Transaksi\n`;
  csv += `QRIS Dinamis SpeedCash;${pay.qrisSales || 0};${pay.qrisCount || 0}\n`;
  csv += `Pembayaran Tunai (Cash);${pay.cashSales || 0};${pay.cashCount || 0}\n\n`;

  // Section 3: Product Sales Performance
  csv += '=== RINCIAN KINERJA PENJUALAN PER PRODUK ===\n';
  csv += 'Product ID;Nama Produk;Kategori;Qty Terjual;HPP Per Unit (Rp);Total Omset (Rp);Total HPP (Rp);Laba Kotor (Rp);Margin (%)\n';
  items.forEach(item => {
    const cleanName = (item.productName || '').replace(/;/g, ',');
    const cleanCat = (item.category || '').replace(/;/g, ',');
    csv += `"${item.productId}";"${cleanName}";"${cleanCat}";${item.qtySold};${item.cogsPerUnit};${item.totalSales};${item.totalCogs};${item.grossProfit};${item.marginPct}%\n`;
  });
  csv += '\n';

  // Section 4: Operating Expenses Breakdown
  csv += '=== RINCIAN BEBAN OPERASIONAL PER KATEGORI ===\n';
  csv += 'Kategori Beban;Jumlah Transaksi;Total Pengeluaran (Rp)\n';
  expenses.forEach(e => {
    csv += `"${e.category}";${e.count};${e.amount}\n`;
  });
  csv += '\n';

  // Section 5: Debt Position & Installments
  const debt = currentReportData.debtReport || {};
  csv += '=== LAPORAN LIABILITAS & HUTANG MODAL USAHA ===\n';
  csv += `Komponen;Nominal (Rp);Keterangan\n`;
  csv += `Total Plafon Pinjaman;${debt.totalLoan || 0};Pokok Pinjaman Modal Awal\n`;
  csv += `Total Sudah Dicicil;${debt.totalPaid || 0};Akumulasi Semua Setoran\n`;
  csv += `Sisa Hutang Berjalan;${debt.remainingBalance || 0};Kewajiban Belum Terbayar\n`;
  csv += `Cicilan Dibayar di Periode Ini;${debt.periodPaymentsTotal || 0};Setoran Periode Terpilih\n`;
  csv += `Arus Kas Bersih (Free Cashflow);${fin.freeCashflow || 0};Laba Bersih - Cicilan Periode Ini\n\n`;

  if (Array.isArray(debt.periodPayments) && debt.periodPayments.length > 0) {
    csv += '=== RINCIAN PEMBAYARAN CICILAN PERIODE INI ===\n';
    csv += 'Tanggal;No Bukti;Kreditur;Nominal (Rp);Metode Bayar;Catatan\n';
    debt.periodPayments.forEach(p => {
      csv += `"${p.paymentDate}";"${p.paymentNo}";"${p.creditorName}";${p.amount};"${p.paymentMethod}";"${(p.notes || '').replace(/;/g, ',')}"\n`;
    });
    csv += '\n';
  }

  // Section 6: Cash & Bank Ledger Flow & Balances
  const cash = currentReportData.cashReport || {};
  const cFlow = cash.periodFlow || {};
  csv += '=== LAPORAN ARUS KAS & SALDO KAS USAHA ===\n';
  csv += 'Komponen Kas;Nominal (Rp);Keterangan\n';
  csv += `Saldo Kas Tunai Fisik (Laci Kasir);${cash.drawerCashBalance || 0};Uang Fisik di Toko Saat Ini\n`;
  csv += `Saldo Rekening Bank & QRIS;${cash.bankBalance || 0};Saldo Rekening Usaha Saat Ini\n`;
  csv += `Total Kas Likuid Usaha;${cash.totalLiquidCash || 0};Total Uang Kas Tersedia Saat Ini\n`;
  csv += `Total Uang Kas Masuk Periode Ini;${cFlow.totalIn || 0};Penjualan Tunai + QRIS + Modal Pinjaman Masuk\n`;
  csv += `Total Uang Kas Keluar Periode Ini;${cFlow.totalOut || 0};Beban Operasional + Cicilan Hutang\n`;
  csv += `Arus Kas Bersih Periode Ini;${cFlow.periodNet || 0};Net Cash Flow Periode Ini\n\n`;

  // Trigger file download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan_Keuangan_DjaCo_${reportStartDateVal}_sd_${reportEndDateVal}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Laporan CSV berhasil di-download!');
}

// 9. Print Financial Report (A4 Layout)
function printFinancialReport() {
  document.body.classList.add('printing-report');
  window.print();
  window.onafterprint = () => {
    document.body.classList.remove('printing-report');
  };
}

