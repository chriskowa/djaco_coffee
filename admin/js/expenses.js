// ---------------- EXPENSES (BEBAN OPERASIONAL: GAJI, SERVIS, DLL) ----------------

let expensePeriodPreset = 'all'; // 'all', 'today', 'thismonth', 'lastmonth', 'thisyear', 'custom'
let expenseStartDate = '';
let expenseEndDate = '';
let expenseCurrentPage = 1;
let expensePageSize = 15;

// Helper: Format Date to YYYY-MM-DD
function formatExpenseDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Compute expense preset date ranges
function computeExpensePresetDates(preset) {
  const now = new Date();
  let start = '';
  let end = formatExpenseDateYMD(now);
  let label = '';

  if (preset === 'today') {
    start = end;
    label = `Hari Ini (${formatHumanDate(start)})`;
  } else if (preset === 'thismonth') {
    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    label = `Bulan Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'lastmonth') {
    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
    start = formatExpenseDateYMD(firstDayPrev);
    end = formatExpenseDateYMD(lastDayPrev);
    label = `Bulan Lalu (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else if (preset === 'thisyear') {
    start = `${now.getFullYear()}-01-01`;
    label = `Tahun Ini (${formatHumanDate(start)} - ${formatHumanDate(end)})`;
  } else {
    // 'all'
    start = '';
    end = '';
    label = 'Semua Periode';
  }

  return { start, end, label };
}

// Set expense preset period
function setExpensePeriod(preset) {
  expensePeriodPreset = preset;

  // Update button active state
  const btnGroup = document.getElementById('expensePeriodBtnGroup');
  if (btnGroup) {
    const btns = btnGroup.querySelectorAll('.period-btn');
    btns.forEach(b => {
      b.classList.remove('active');
      if (
        (preset === 'all' && b.innerText.includes('Semua')) ||
        (preset === 'today' && b.innerText.includes('Hari Ini')) ||
        (preset === 'thismonth' && b.innerText.includes('Bulan Ini')) ||
        (preset === 'lastmonth' && b.innerText.includes('Bulan Lalu')) ||
        (preset === 'thisyear' && b.innerText.includes('Tahun Ini')) ||
        (preset === 'custom' && b.innerText.includes('Kustom'))
      ) {
        b.classList.add('active');
      }
    });
  }

  const customBox = document.getElementById('expenseCustomDateBox');
  const badgeEl = document.getElementById('expActivePeriodBadge');

  if (preset === 'custom') {
    if (customBox) customBox.style.display = 'flex';
    const startInput = document.getElementById('expStartDate');
    const endInput = document.getElementById('expEndDate');
    if (startInput && !startInput.value) {
      startInput.value = expenseStartDate || formatExpenseDateYMD(new Date());
    }
    if (endInput && !endInput.value) {
      endInput.value = expenseEndDate || formatExpenseDateYMD(new Date());
    }
    return;
  }

  if (customBox) customBox.style.display = 'none';

  const range = computeExpensePresetDates(preset);
  expenseStartDate = range.start;
  expenseEndDate = range.end;

  if (badgeEl) {
    badgeEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> ${range.label}`;
  }

  expenseCurrentPage = 1;
  renderExpensesList();
}

// Apply custom dates from inputs
function applyCustomExpenseDate() {
  const startInput = document.getElementById('expStartDate');
  const endInput = document.getElementById('expEndDate');
  const badgeEl = document.getElementById('expActivePeriodBadge');
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

  expenseStartDate = start;
  expenseEndDate = end;

  if (badgeEl) {
    badgeEl.innerHTML = `<i class="fa-regular fa-calendar-check"></i> Kustom: ${formatHumanDate(start)} - ${formatHumanDate(end)}`;
  }

  expenseCurrentPage = 1;
  renderExpensesList();
}

// Main Expenses Renderer with Filtering & Pagination
function renderExpensesList() {
  const q = (document.getElementById('expenseSearch')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('expenseCategoryFilter')?.value || 'Semua';
  const sourceFilter = document.getElementById('expenseSourceFilter')?.value || 'Semua';
  const tbody = document.getElementById('expensesTableBody');
  const totalBadge = document.getElementById('totalExpenseAmountBadge');
  const countBadge = document.getElementById('expCountBadge');
  const subInfo = document.getElementById('expenseSubtitleInfo');
  const paginationContainer = document.getElementById('expensePaginationContainer');
  if (!tbody) return;

  const filtered = expenses.filter(e => {
    // 1. Text Search
    const matchQ = !q ||
      (e.title || '').toLowerCase().includes(q) ||
      (e.expenseNo || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q);
    if (!matchQ) return false;

    // 2. Category Filter
    const matchCat = cat === 'Semua' || e.category === cat;
    if (!matchCat) return false;

    // 3. Payment Source Filter
    const matchSource = sourceFilter === 'Semua' || (e.paymentSource || 'Kas Tunai (Laci)') === sourceFilter;
    if (!matchSource) return false;

    // 4. Date Range Filter
    if (expensePeriodPreset !== 'all') {
      const expDate = e.expenseDate || '';
      if (expenseStartDate && expDate < expenseStartDate) return false;
      if (expenseEndDate && expDate > expenseEndDate) return false;
    }

    return true;
  });

  // Calculate totals
  const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCash = filtered.filter(e => (e.paymentSource || 'Kas Tunai (Laci)') === 'Kas Tunai (Laci)').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalBank = filtered.filter(e => e.paymentSource === 'Transfer Bank').reduce((sum, e) => sum + Number(e.amount || 0), 0);

  if (totalBadge) totalBadge.innerText = `Total: ${rupiah(totalAmount)}`;
  if (countBadge) countBadge.innerText = `${filtered.length} pengeluaran`;
  if (subInfo) {
    subInfo.innerHTML = `Kas Laci: <b>${rupiah(totalCash)}</b> | Transfer Bank: <b>${rupiah(totalBank)}</b>`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:35px; color:#8c7365;">Tidak ada catatan pengeluaran yang sesuai kriteria filter.</td></tr>`;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / expensePageSize) || 1;
  if (expenseCurrentPage > totalPages) expenseCurrentPage = totalPages;
  if (expenseCurrentPage < 1) expenseCurrentPage = 1;

  const startIndex = (expenseCurrentPage - 1) * expensePageSize;
  const endIndex = Math.min(startIndex + expensePageSize, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  // Render Table Rows
  tbody.innerHTML = pageItems.map(e => {
    const isTransferToBank = e.category === 'Setor Kas ke Bank' || e.category === 'Transfer Kas ke Bank';
    const pSource = e.paymentSource || 'Kas Tunai (Laci)';
    const sourceBadge = pSource === 'Transfer Bank'
      ? `<span class="badge" style="background:#ecfdf5; color:#047857; font-size:11px; font-weight:700;"><i class="fa-solid fa-building-columns"></i> Bank</span>`
      : `<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700;"><i class="fa-solid fa-money-bill-wave"></i> Kas Laci</span>`;

    const catBadge = isTransferToBank
      ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-size:11px; font-weight:700;"><i class="fa-solid fa-arrow-right-arrow-left"></i> Setor Laci ke Bank</span>`
      : `<span class="badge" style="background:#efe0c8; color:#6b4329; font-size:11px;">${esc(e.category)}</span>`;

    return `
      <tr style="border-bottom:1px solid #ead7ba; transition: background 0.15s;">
        <td style="padding:12px 14px;"><code>${esc(e.expenseNo)}</code></td>
        <td style="padding:12px 14px; white-space:nowrap;">${esc(e.expenseDate)}</td>
        <td style="padding:12px 14px;">${catBadge}</td>
        <td style="padding:12px 14px; font-weight:700; color:var(--dark);">${esc(e.title)}</td>
        <td style="padding:12px 14px;">${sourceBadge}</td>
        <td style="padding:12px 14px; font-weight:800; color:${isTransferToBank ? '#b45309' : 'var(--danger)'};">${rupiah(e.amount)}</td>
        <td style="padding:12px 14px; font-size:12px; color:#795d48;">${esc(e.notes || '-')}</td>
        <td style="padding:12px 14px; text-align:right; white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="openEditExpenseModal(${e.id})" title="Edit" style="padding:4px 8px; margin-right:4px;">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})" title="Hapus" style="padding:4px 8px;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Render Pagination Bar
  renderExpensePagination(totalItems, totalPages, startIndex, endIndex);
}

// Render pagination bar
function renderExpensePagination(totalItems, totalPages, startIndex, endIndex) {
  const container = document.getElementById('expensePaginationContainer');
  if (!container) return;

  if (totalItems <= 0) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div class="pagination-info">
      <span>Menampilkan <b>${startIndex + 1} - ${endIndex}</b> dari <b>${totalItems}</b> pengeluaran</span>
      <span style="color:#d1bba8;">|</span>
      <span>Baris per halaman:</span>
      <select onchange="changeExpensePageSize(this.value)">
        <option value="10" ${expensePageSize === 10 ? 'selected' : ''}>10</option>
        <option value="15" ${expensePageSize === 15 ? 'selected' : ''}>15</option>
        <option value="25" ${expensePageSize === 25 ? 'selected' : ''}>25</option>
        <option value="50" ${expensePageSize === 50 ? 'selected' : ''}>50</option>
        <option value="100" ${expensePageSize === 100 ? 'selected' : ''}>100</option>
      </select>
    </div>
    <div class="pagination-controls">
      <button class="page-btn" onclick="gotoExpensePage(1)" ${expenseCurrentPage === 1 ? 'disabled' : ''} title="Halaman Pertama">
        <i class="fa-solid fa-angles-left"></i>
      </button>
      <button class="page-btn" onclick="gotoExpensePage(${expenseCurrentPage - 1})" ${expenseCurrentPage === 1 ? 'disabled' : ''} title="Sebelumnya">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
  `;

  // Dynamic page numbers
  const maxButtons = 5;
  let startPage = Math.max(1, expenseCurrentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    html += `
      <button class="page-btn ${p === expenseCurrentPage ? 'active' : ''}" onclick="gotoExpensePage(${p})">
        ${p}
      </button>
    `;
  }

  html += `
      <button class="page-btn" onclick="gotoExpensePage(${expenseCurrentPage + 1})" ${expenseCurrentPage === totalPages ? 'disabled' : ''} title="Berikutnya">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <button class="page-btn" onclick="gotoExpensePage(${totalPages})" ${expenseCurrentPage === totalPages ? 'disabled' : ''} title="Halaman Terakhir">
        <i class="fa-solid fa-angles-right"></i>
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function gotoExpensePage(page) {
  expenseCurrentPage = page;
  renderExpensesList();
}

function changeExpensePageSize(size) {
  expensePageSize = Number(size) || 15;
  expenseCurrentPage = 1;
  renderExpensesList();
}

function filterExpenses() {
  expenseCurrentPage = 1;
  renderExpensesList();
}

function openAddExpenseModal() {
  const modal = document.getElementById('expenseModalOverlay');
  const form = document.getElementById('expenseForm');
  form.reset();

  document.getElementById('exp-id').value = '0';
  document.getElementById('exp-date').value = formatExpenseDateYMD(new Date());
  const sourceInput = document.getElementById('exp-payment-source');
  if (sourceInput) sourceInput.value = 'Kas Tunai (Laci)';
  document.getElementById('expenseModalTitle').innerText = 'Catat Beban / Pengeluaran';

  modal.classList.add('show');
}

function openEditExpenseModal(id) {
  const e = expenses.find(x => x.id === Number(id));
  if (!e) return;

  const modal = document.getElementById('expenseModalOverlay');
  document.getElementById('exp-id').value = e.id;
  document.getElementById('exp-category').value = e.category || 'Operasional Lainnya';
  document.getElementById('exp-date').value = e.expenseDate || formatExpenseDateYMD(new Date());
  document.getElementById('exp-title').value = e.title || '';
  const sourceInput = document.getElementById('exp-payment-source');
  if (sourceInput) sourceInput.value = e.paymentSource || 'Kas Tunai (Laci)';
  document.getElementById('exp-amount').value = e.amount || 0;
  document.getElementById('exp-notes').value = e.notes || '';
  document.getElementById('expenseModalTitle').innerText = 'Edit Catatan Pengeluaran';

  modal.classList.add('show');
}

function openSetorBankModal() {
  openAddExpenseModal();
  document.getElementById('expenseModalTitle').innerText = 'Setor Kas Laci ke Rekening Bank';
  document.getElementById('exp-category').value = 'Setor Kas ke Bank';
  document.getElementById('exp-title').value = 'Setor Uang Tunai Laci ke Bank';
  const sourceInput = document.getElementById('exp-payment-source');
  if (sourceInput) sourceInput.value = 'Kas Tunai (Laci)';
  document.getElementById('exp-notes').value = 'Setoran fisik dari kasir kafe ke tabungan bank / QRIS settlement';
}

function closeExpenseModal() {
  document.getElementById('expenseModalOverlay').classList.remove('show');
}

async function saveExpenseForm(event) {
  event.preventDefault();
  const btn = document.getElementById('saveExpenseBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const payload = {
    id: Number(document.getElementById('exp-id').value || 0),
    category: document.getElementById('exp-category').value,
    title: document.getElementById('exp-title').value.trim(),
    paymentSource: document.getElementById('exp-payment-source')?.value || 'Kas Tunai (Laci)',
    amount: Number(document.getElementById('exp-amount').value),
    notes: document.getElementById('exp-notes').value.trim(),
    expenseDate: document.getElementById('exp-date').value
  };

  try {
    const res = await apiPost('saveexpense', payload);
    showToast(res.message || 'Pengeluaran berhasil dicatat!');
    closeExpenseModal();
    await reloadData();
    renderExpensesList();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menyimpan pengeluaran', true);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pengeluaran';
  }
}

async function deleteExpense(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) return;
  try {
    await apiPost('deleteexpense', { id });
    showToast('Pengeluaran berhasil dihapus');
    await reloadData();
    renderExpensesList();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menghapus pengeluaran', true);
  }
}
