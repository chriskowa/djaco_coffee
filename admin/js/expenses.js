// ---------------- EXPENSES (BEBAN OPERASIONAL: GAJI, SERVIS, DLL) ----------------
    function renderExpensesList() {
      const q = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
      const cat = document.getElementById('expenseCategoryFilter')?.value || 'Semua';
      const tbody = document.getElementById('expensesTableBody');
      const badge = document.getElementById('totalExpenseAmountBadge');
      if (!tbody) return;

      const filtered = expenses.filter(e => {
        const matchQ = (e.title || '').toLowerCase().includes(q) || (e.expenseNo || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
        const matchCat = cat === 'Semua' || e.category === cat;
        return matchQ && matchCat;
      });

      const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      if (badge) badge.innerText = `Total: ${rupiah(totalAmount)}`;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#888;">Belum ada catatan pengeluaran.</td></tr>`;
      } else {
        tbody.innerHTML = filtered.map(e => `
          <tr style="border-bottom:1px solid #ead7ba;">
            <td style="padding:12px 14px;"><code>${esc(e.expenseNo)}</code></td>
            <td style="padding:12px 14px;">${esc(e.expenseDate)}</td>
            <td style="padding:12px 14px;"><span class="badge" style="background:#efe0c8; color:#6b4329; font-size:11px;">${esc(e.category)}</span></td>
            <td style="padding:12px 14px; font-weight:700; color:var(--dark);">${esc(e.title)}</td>
            <td style="padding:12px 14px; font-weight:800; color:var(--danger);">${rupiah(e.amount)}</td>
            <td style="padding:12px 14px; font-size:12px; color:#795d48;">${esc(e.notes || '-')}</td>
            <td style="padding:12px 14px; text-align:right;">
              <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>
        `).join('');
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
      document.getElementById('expenseModalTitle').innerText = 'Catat Beban / Pengeluaran';

      modal.classList.add('show');
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
        amount: Number(document.getElementById('exp-amount').value),
        notes: document.getElementById('exp-notes').value.trim(),
        expenseDate: document.getElementById('exp-date').value
      };

      try {
        await apiPost('saveexpense', payload);
        showToast('Pengeluaran berhasil dicatat!');
        closeExpenseModal();
        await reloadData();
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
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal menghapus pengeluaran', true);
      }
    }