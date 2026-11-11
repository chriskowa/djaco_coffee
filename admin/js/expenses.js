// ---------------- EXPENSES (BEBAN OPERASIONAL: GAJI, SERVIS, DLL) ----------------
    function renderExpensesList() {
      const q = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
      const cat = document.getElementById('expenseCategoryFilter')?.value || 'Semua';
      const sourceFilter = document.getElementById('expenseSourceFilter')?.value || 'Semua';
      const tbody = document.getElementById('expensesTableBody');
      const badge = document.getElementById('totalExpenseAmountBadge');
      if (!tbody) return;

      const filtered = expenses.filter(e => {
        const matchQ = (e.title || '').toLowerCase().includes(q) || (e.expenseNo || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
        const matchCat = cat === 'Semua' || e.category === cat;
        const matchSource = sourceFilter === 'Semua' || (e.paymentSource || 'Kas Tunai (Laci)') === sourceFilter;
        return matchQ && matchCat && matchSource;
      });

      const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      if (badge) badge.innerText = `Total: ${rupiah(totalAmount)}`;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#888;">Belum ada catatan pengeluaran.</td></tr>`;
      } else {
        tbody.innerHTML = filtered.map(e => {
          const isTransferToBank = e.category === 'Setor Kas ke Bank' || e.category === 'Transfer Kas ke Bank';
          const pSource = e.paymentSource || 'Kas Tunai (Laci)';
          const sourceBadge = pSource === 'Transfer Bank'
            ? `<span class="badge" style="background:#ecfdf5; color:#047857; font-size:11px;"><i class="fa-solid fa-building-columns"></i> Bank</span>`
            : `<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11px;"><i class="fa-solid fa-money-bill-wave"></i> Kas Laci</span>`;

          const catBadge = isTransferToBank
            ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-size:11px; font-weight:700;"><i class="fa-solid fa-arrow-right-arrow-left"></i> Setor Laci ke Bank</span>`
            : `<span class="badge" style="background:#efe0c8; color:#6b4329; font-size:11px;">${esc(e.category)}</span>`;

          return `
            <tr style="border-bottom:1px solid #ead7ba;">
              <td style="padding:12px 14px;"><code>${esc(e.expenseNo)}</code></td>
              <td style="padding:12px 14px;">${esc(e.expenseDate)}</td>
              <td style="padding:12px 14px;">${catBadge}</td>
              <td style="padding:12px 14px; font-weight:700; color:var(--dark);">${esc(e.title)}</td>
              <td style="padding:12px 14px;">${sourceBadge}</td>
              <td style="padding:12px 14px; font-weight:800; color:${isTransferToBank ? '#b45309' : 'var(--danger)'};">${rupiah(e.amount)}</td>
              <td style="padding:12px 14px; font-size:12px; color:#795d48;">${esc(e.notes || '-')}</td>
              <td style="padding:12px 14px; text-align:right;">
                <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    function filterExpenses() {
      renderExpensesList();
    }

    function openAddExpenseModal(id = null) {
      const modal = document.getElementById('expenseModalOverlay');
      const form = document.getElementById('expenseForm');
      form.reset();

      document.getElementById('exp-id').value = '0';
      document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
      const sourceInput = document.getElementById('exp-payment-source');
      if (sourceInput) sourceInput.value = 'Kas Tunai (Laci)';
      document.getElementById('expenseModalTitle').innerText = 'Catat Beban / Pengeluaran';

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
      btn.innerText = 'Menyimpan...';

      const payload = {
        id: Number(document.getElementById('exp-id').value),
        category: document.getElementById('exp-category').value,
        title: document.getElementById('exp-title').value.trim(),
        paymentSource: document.getElementById('exp-payment-source')?.value || 'Kas Tunai (Laci)',
        amount: Number(document.getElementById('exp-amount').value),
        notes: document.getElementById('exp-notes').value.trim(),
        expenseDate: document.getElementById('exp-date').value
      };

      try {
        await apiPost('saveexpense', payload);
        showToast('Pengeluaran berhasil dicatat!');
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