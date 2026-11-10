// =====================================================================
// DEBT & INSTALLMENT MANAGEMENT MODULE (HUTANG & CICILAN MODAL USAHA)
// =====================================================================

let activeHistoryDebtId = null;

// Render Debt List & Summary KPIs
function renderDebtsList() {
  const debtData = window.debts || debts || [];
  const q = (document.getElementById('debtSearch')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('debtStatusFilter')?.value || 'Semua';
  const tbody = document.getElementById('debtsTableBody');
  const badge = document.getElementById('debtTableSummaryBadge');

  if (!tbody) return;

  // Filter list
  const filtered = debtData.filter(d => {
    const matchQ = (d.creditorName || '').toLowerCase().includes(q) ||
                   (d.debtNo || '').toLowerCase().includes(q) ||
                   (d.notes || '').toLowerCase().includes(q);
    const isPaid = (d.status || '').toLowerCase() === 'paid off' || (Number(d.loanAmount) > 0 && Number(d.remainingBalance) <= 0);
    const matchStatus = statusFilter === 'Semua' ||
                        (statusFilter === 'Active' && !isPaid) ||
                        (statusFilter === 'Paid Off' && isPaid);
    return matchQ && matchStatus;
  });

  // Calculate totals
  const totalLoan = debtData.reduce((sum, d) => sum + Number(d.loanAmount || 0), 0);
  const totalPaid = debtData.reduce((sum, d) => sum + Number(d.totalPaid || 0), 0);
  const totalRemaining = Math.max(0, totalLoan - totalPaid);
  const progressPct = totalLoan > 0 ? ((totalPaid / totalLoan) * 100).toFixed(1) : 0;
  const activeCount = debtData.filter(d => (d.status || '').toLowerCase() !== 'paid off' && Number(d.remainingBalance) > 0).length;
  const paidCount = debtData.length - activeCount;

  // Update KPI Cards
  const statLoan = document.getElementById('stat-total-debt');
  const statPaid = document.getElementById('stat-total-debt-paid');
  const statRem = document.getElementById('stat-total-debt-remaining');
  const statProg = document.getElementById('stat-debt-progress');
  const statCounts = document.getElementById('stat-debt-counts');

  if (statLoan) statLoan.innerText = rupiah(totalLoan);
  if (statPaid) statPaid.innerText = rupiah(totalPaid);
  if (statRem) statRem.innerText = rupiah(totalRemaining);
  if (statProg) statProg.innerText = `${progressPct}%`;
  if (statCounts) statCounts.innerText = `${activeCount} Aktif / ${paidCount} Lunas`;

  if (badge) {
    badge.innerText = `${filtered.length} pinjaman | Sisa: ${rupiah(totalRemaining)}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:35px; color:#8c7365;">Belum ada catatan pinjaman / hutang modal usaha.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    const loan = Number(d.loanAmount || 0);
    const paid = Number(d.totalPaid || 0);
    const rem = Math.max(0, loan - paid);
    const pct = loan > 0 ? Math.min(100, Math.round((paid / loan) * 100)) : 0;
    const isPaid = (d.status || '').toLowerCase() === 'paid off' || (loan > 0 && rem <= 0);

    const statusBadge = isPaid
      ? `<span class="badge" style="background:#16a34a; color:#fff; font-size:11px; font-weight:800; padding:4px 9px;"><i class="fa-solid fa-circle-check"></i> Lunas</span>`
      : `<span class="badge" style="background:#d97706; color:#fff; font-size:11px; font-weight:800; padding:4px 9px;"><i class="fa-solid fa-clock"></i> Aktif</span>`;

    const progressColor = pct >= 100 ? '#16a34a' : (pct >= 50 ? '#c59b62' : '#3b1f12');

    return `
      <tr style="border-bottom:1px solid #ead7ba; transition: background 0.15s;">
        <td style="padding:12px 14px;">
          <code>${esc(d.debtNo)}</code>
          ${d.notes ? `<div style="font-size:11px; color:#8c7365; margin-top:3px;">${esc(d.notes)}</div>` : ''}
        </td>
        <td style="padding:12px 14px; font-weight:700; color:var(--dark);">
          ${esc(d.creditorName)}
          ${d.tenorMonths ? `<div style="font-size:11px; color:#8c7365;">Tenor: ${d.tenorMonths} bln ${d.interestRate ? '(' + d.interestRate + '% thn)' : ''}</div>` : ''}
        </td>
        <td style="padding:12px 14px; white-space:nowrap;">
          ${esc(d.loanDate)}
          ${d.dueDate ? `<div style="font-size:10px; color:#9c4221;">Tempo: ${esc(d.dueDate)}</div>` : ''}
        </td>
        <td style="padding:12px 14px; font-weight:800; color:var(--coffee);">${rupiah(loan)}</td>
        <td style="padding:12px 14px; font-weight:800; color:var(--success);">${rupiah(paid)}</td>
        <td style="padding:12px 14px; font-weight:800; color:${rem > 0 ? 'var(--danger)' : '#16a34a'};">${rupiah(rem)}</td>
        <td style="padding:12px 14px; min-width:130px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-bottom:4px;">
            <span>${pct}%</span>
            <span style="color:#8c7365;">${d.paymentCount || 0}x cicil</span>
          </div>
          <div style="width:100%; height:6px; background:#ead7ba; border-radius:999px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${progressColor}; border-radius:999px;"></div>
          </div>
        </td>
        <td style="padding:12px 14px; text-align:center;">${statusBadge}</td>
        <td style="padding:12px 14px; text-align:right; white-space:nowrap;">
          ${!isPaid ? `
            <button class="btn btn-sm btn-primary" onclick="openAddPaymentModal(${d.id})" style="padding:5px 10px; font-size:11px; background:#16a34a; border-color:#16a34a;" title="Bayar Cicilan">
              <i class="fa-solid fa-plus"></i> Cicil
            </button>
          ` : ''}
          <button class="btn btn-sm btn-outline" onclick="openDebtHistoryModal(${d.id})" style="padding:5px 9px; font-size:11px;" title="Riwayat Pembayaran">
            <i class="fa-solid fa-clock-rotate-left"></i> Riwayat
          </button>
          <button class="btn btn-sm btn-outline" onclick="openAddDebtModal(${d.id})" style="padding:5px 8px; font-size:11px;" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteDebt(${d.id})" style="padding:5px 8px; font-size:11px;" title="Hapus">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDebts() {
  renderDebtsList();
}

// ---------------- ADD / EDIT DEBT MODAL ----------------
function openAddDebtModal(id = null) {
  const modal = document.getElementById('debtModalOverlay');
  const form = document.getElementById('debtForm');
  form.reset();

  const titleEl = document.getElementById('debtModalTitle');
  const idInput = document.getElementById('debt-id');

  if (id) {
    const d = debts.find(x => x.id === Number(id));
    if (!d) return;
    titleEl.innerText = 'Edit Data Pinjaman Modal';
    idInput.value = d.id;
    document.getElementById('debt-creditor').value = d.creditorName || '';
    document.getElementById('debt-amount').value = d.loanAmount || 0;
    document.getElementById('debt-date').value = d.loanDate || '';
    document.getElementById('debt-due-date').value = d.dueDate || '';
    document.getElementById('debt-tenor').value = d.tenorMonths || '';
    document.getElementById('debt-interest').value = d.interestRate || '';
    document.getElementById('debt-status').value = d.status || 'Active';
    document.getElementById('debt-notes').value = d.notes || '';
  } else {
    titleEl.innerText = 'Catat Pinjaman / Hutang Modal Baru';
    idInput.value = '0';
    document.getElementById('debt-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('debt-status').value = 'Active';
  }

  modal.classList.add('show');
}

function closeDebtModal() {
  document.getElementById('debtModalOverlay')?.classList.remove('show');
}

async function saveDebtForm(event) {
  event.preventDefault();
  const btn = document.getElementById('saveDebtBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const payload = {
    id: Number(document.getElementById('debt-id').value || 0),
    creditorName: document.getElementById('debt-creditor').value.trim(),
    loanAmount: Number(document.getElementById('debt-amount').value || 0),
    loanDate: document.getElementById('debt-date').value,
    dueDate: document.getElementById('debt-due-date').value || null,
    tenorMonths: Number(document.getElementById('debt-tenor').value || 0),
    interestRate: Number(document.getElementById('debt-interest').value || 0),
    status: document.getElementById('debt-status').value,
    notes: document.getElementById('debt-notes').value.trim()
  };

  try {
    await apiPost('savedebt', payload);
    showToast('Data pinjaman modal berhasil disimpan!');
    closeDebtModal();
    await reloadData();
    renderDebtsList();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menyimpan pinjaman', true);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pinjaman';
  }
}

async function deleteDebt(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data pinjaman ini? Semua riwayat cicilan terkait juga akan terhapus.')) return;
  try {
    await apiPost('deletedebt', { id });
    showToast('Data pinjaman berhasil dihapus');
    await reloadData();
    renderDebtsList();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menghapus pinjaman', true);
  }
}

// ---------------- ADD REPAYMENT / INSTALLMENT MODAL ----------------
function openAddPaymentModal(debtId = null) {
  const modal = document.getElementById('debtPaymentModalOverlay');
  const form = document.getElementById('debtPaymentForm');
  form.reset();

  const select = document.getElementById('pay-debt-id');
  select.innerHTML = debts.map(d => {
    const rem = Math.max(0, Number(d.loanAmount) - Number(d.totalPaid));
    const isPaid = (d.status || '').toLowerCase() === 'paid off' || rem <= 0;
    return `<option value="${d.id}" ${debtId === d.id ? 'selected' : ''}>${esc(d.creditorName)} (${rupiah(d.loanAmount)}) - Sisa: ${rupiah(rem)} ${isPaid ? '[LUNAS]' : ''}</option>`;
  }).join('');

  if (debtId) {
    select.value = String(debtId);
  }

  document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('pay-method').value = 'Transfer Bank';

  modal.classList.add('show');
}

function closeDebtPaymentModal() {
  document.getElementById('debtPaymentModalOverlay')?.classList.remove('show');
}

async function saveDebtPaymentForm(event) {
  event.preventDefault();
  const btn = document.getElementById('saveDebtPaymentBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  const payload = {
    id: 0,
    debtId: Number(document.getElementById('pay-debt-id').value),
    paymentDate: document.getElementById('pay-date').value,
    amount: Number(document.getElementById('pay-amount').value || 0),
    paymentMethod: document.getElementById('pay-method').value,
    notes: document.getElementById('pay-notes').value.trim()
  };

  try {
    const res = await apiPost('savedebtpayment', payload);
    showToast(`Cicilan sebesar ${rupiah(payload.amount)} berhasil dicatat!`);
    closeDebtPaymentModal();
    await reloadData();
    renderDebtsList();

    // If history modal is currently open for this debt, refresh it
    if (activeHistoryDebtId === payload.debtId) {
      openDebtHistoryModal(payload.debtId);
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menyimpan cicilan', true);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pembayaran';
  }
}

// ---------------- DEBT HISTORY MODAL ----------------
function openDebtHistoryModal(debtId) {
  activeHistoryDebtId = debtId;
  const debtData = window.debts || debts || [];
  const d = debtData.find(x => x.id === Number(debtId));
  if (!d) return;

  const modal = document.getElementById('debtHistoryModalOverlay');
  const creditorEl = document.getElementById('historyDebtCreditor');
  const loanEl = document.getElementById('historyDebtLoan');
  const paidEl = document.getElementById('historyDebtPaid');
  const remEl = document.getElementById('historyDebtRemaining');
  const tbody = document.getElementById('debtHistoryTableBody');

  const loan = Number(d.loanAmount || 0);
  const paid = Number(d.totalPaid || 0);
  const rem = Math.max(0, loan - paid);

  if (creditorEl) creditorEl.innerText = `${d.creditorName} (${d.debtNo})`;
  if (loanEl) loanEl.innerText = rupiah(loan);
  if (paidEl) paidEl.innerText = rupiah(paid);
  if (remEl) remEl.innerText = rupiah(rem);

  const payments = d.payments || [];

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:25px; color:#8c7365;">Belum ada riwayat cicilan yang dibayarkan untuk pinjaman ini.</td></tr>`;
  } else {
    tbody.innerHTML = payments.map((p, idx) => `
      <tr style="border-bottom:1px solid #ead7ba;">
        <td style="padding:10px 12px; font-weight:700; color:#8c7365;">#${idx + 1}</td>
        <td style="padding:10px 12px;"><code>${esc(p.paymentNo)}</code></td>
        <td style="padding:10px 12px; white-space:nowrap;">${esc(p.paymentDate)}</td>
        <td style="padding:10px 12px; font-weight:800; color:var(--success);">${rupiah(p.amount)}</td>
        <td style="padding:10px 12px;"><span class="badge" style="background:#efe0c8; color:#6b4329; font-size:11px;">${esc(p.paymentMethod)}</span></td>
        <td style="padding:10px 12px; font-size:12px; color:#6f5845;">${esc(p.notes || '-')}</td>
        <td style="padding:10px 12px; text-align:right;">
          <button class="btn btn-sm btn-danger" onclick="deleteDebtPayment(${p.id}, ${d.id})" style="padding:4px 8px; font-size:11px;" title="Hapus Setoran">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  modal.classList.add('show');
}

function closeDebtHistoryModal() {
  activeHistoryDebtId = null;
  document.getElementById('debtHistoryModalOverlay')?.classList.remove('show');
}

async function deleteDebtPayment(paymentId, debtId) {
  if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus catatan cicilan ini? Saldo sisa hutang akan bertambah kembali.')) return;
  try {
    await apiPost('deletedebtpayment', { id: paymentId });
    showToast('Catatan cicilan berhasil dihapus');
    await reloadData();
    renderDebtsList();
    openDebtHistoryModal(debtId);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Gagal menghapus cicilan', true);
  }
}

