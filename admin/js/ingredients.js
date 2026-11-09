// ---------------- INGREDIENTS & HPP CALCULATOR LOGIC ----------------
    function renderIngredientsGrid() {
      const q = (document.getElementById('ingredientSearch')?.value || '').toLowerCase();
      const tbody = document.getElementById('ingredientsTableBody');
      const badge = document.getElementById('ingredientCountBadge');
      if (!tbody) return;

      const filtered = ingredients.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.code || '').toLowerCase().includes(q)
      );

      if (badge) badge.innerText = `${filtered.length} Bahan`;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#888;">Belum ada bahan baku atau tidak ditemukan.</td></tr>`;
      } else {
        tbody.innerHTML = filtered.map(i => {
          const stock = Number(i.stock || 0);
          const minStock = Number(i.minStock || 0);
          let statusBadge = '<span class="status-badge status-completed" style="font-size:11px;">Aman</span>';
          if (stock <= 0) {
            statusBadge = '<span class="status-badge status-cancelled" style="font-size:11px;">Habis</span>';
          } else if (stock <= minStock) {
            statusBadge = '<span class="status-badge" style="background:#fef3c7; color:#b45309; font-size:11px;">Menipis</span>';
          }

          return `
            <tr style="border-bottom:1px solid #ead7ba;">
              <td style="padding:12px 14px;"><code>${esc(i.code)}</code></td>
              <td style="padding:12px 14px; font-weight:700; color:var(--dark);">${esc(i.name)}</td>
              <td style="padding:12px 14px;">${esc(i.unit)}</td>
              <td style="padding:12px 14px; font-weight:800; color:var(--coffee);">${rupiah(i.costPerUnit)} / ${esc(i.unit)}</td>
              <td style="padding:12px 14px; font-weight:700;">${stock.toLocaleString('id-ID')} ${esc(i.unit)}</td>
              <td style="padding:12px 14px;">${statusBadge}</td>
              <td style="padding:12px 14px; text-align:right;">
                <div style="display:inline-flex; gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="openRestockModal(${i.id})" title="Restock Beli Bahan"><i class="fa-solid fa-cart-plus"></i> Beli</button>
                  <button class="btn btn-outline btn-sm" onclick="openAddIngredientModal(${i.id})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                  <button class="btn btn-danger btn-sm" onclick="deleteIngredient(${i.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      renderRecipesTable();
    }

    function filterIngredients() {
      renderIngredientsGrid();
    }

    function openAddIngredientModal(id = null) {
      const modal = document.getElementById('ingredientModalOverlay');
      const form = document.getElementById('ingredientForm');
      const title = document.getElementById('ingredientModalTitle');
      form.reset();

      if (id) {
        const item = ingredients.find(i => i.id === id);
        if (!item) return;
        title.innerText = 'Edit Bahan Baku';
        document.getElementById('ing-id').value = item.id;
        document.getElementById('ing-code').value = item.code;
        document.getElementById('ing-name').value = item.name;
        document.getElementById('ing-unit').value = item.unit;
        document.getElementById('ing-cost').value = item.costPerUnit;
        document.getElementById('ing-stock').value = item.stock;
        document.getElementById('ing-min-stock').value = item.minStock;
      } else {
        title.innerText = 'Tambah Bahan Baku Baru';
        document.getElementById('ing-id').value = '0';
        document.getElementById('ing-code').value = 'RAW-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      }

      modal.classList.add('show');
    }

    function closeIngredientModal() {
      document.getElementById('ingredientModalOverlay').classList.remove('show');
    }

    async function saveIngredientForm(event) {
      event.preventDefault();
      const btn = document.getElementById('saveIngredientBtn');
      btn.disabled = true;
      btn.innerText = 'Menyimpan...';

      const payload = {
        id: Number(document.getElementById('ing-id').value),
        code: document.getElementById('ing-code').value.trim(),
        name: document.getElementById('ing-name').value.trim(),
        unit: document.getElementById('ing-unit').value,
        costPerUnit: Number(document.getElementById('ing-cost').value),
        stock: Number(document.getElementById('ing-stock').value),
        minStock: Number(document.getElementById('ing-min-stock').value || 0)
      };

      try {
        await apiPost('saveingredient', payload);
        showToast('Bahan baku berhasil disimpan');
        closeIngredientModal();
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal menyimpan bahan baku', true);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Simpan Bahan';
      }
    }

    async function deleteIngredient(id) {
      if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini? Resep yang menggunakannya akan ikut terhapus.')) return;
      try {
        await apiPost('deleteingredient', { id });
        showToast('Bahan baku berhasil dihapus');
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal menghapus bahan', true);
      }
    }

    // ---------------- RESTOCK & MOVING AVERAGE LOGIC ----------------
    function openRestockModal(ingredientId = null) {
      const modal = document.getElementById('restockModalOverlay');
      const select = document.getElementById('restock-ing-id');
      const form = document.getElementById('restockForm');
      form.reset();

      select.innerHTML = '<option value="">-- Pilih Bahan Baku --</option>' + ingredients.map(i =>
        `<option value="${i.id}">${esc(i.name)} (${esc(i.code)}) - ${esc(i.unit)}</option>`
      ).join('');

      document.getElementById('restock-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('restock-preview').style.display = 'none';

      if (ingredientId) {
        select.value = ingredientId;
      } else if (ingredients.length > 0) {
        select.value = ingredients[0].id;
      }

      onRestockIngredientChange();
      modal.classList.add('show');
    }

    function closeRestockModal() {
      document.getElementById('restockModalOverlay').classList.remove('show');
    }

    function onRestockIngredientChange() {
      const select = document.getElementById('restock-ing-id');
      const id = Number(select.value);
      const ing = ingredients.find(i => i.id === id);

      if (ing) {
        document.getElementById('restock-current-stock').innerText = `${Number(ing.stock).toLocaleString('id-ID')} ${ing.unit}`;
        document.getElementById('restock-current-cost').innerText = `${rupiah(ing.costPerUnit)} / ${ing.unit}`;
      } else {
        document.getElementById('restock-current-stock').innerText = '-';
        document.getElementById('restock-current-cost').innerText = '-';
      }
      calcRestockUnitCost();
    }

    function calcRestockUnitCost() {
      const select = document.getElementById('restock-ing-id');
      const ing = ingredients.find(i => i.id === Number(select.value));
      const qty = Number(document.getElementById('restock-qty').value || 0);
      const totalCost = Number(document.getElementById('restock-total-cost').value || 0);
      const preview = document.getElementById('restock-preview');

      if (!ing || qty <= 0 || totalCost <= 0) {
        preview.style.display = 'none';
        return;
      }

      const unitCost = totalCost / qty;
      const oldStock = Number(ing.stock || 0);
      const oldCost = Number(ing.costPerUnit || 0);
      const newStock = oldStock + qty;
      const movingAvg = newStock > 0 ? ((oldStock * oldCost) + totalCost) / newStock : unitCost;

      document.getElementById('restock-new-unit-cost').innerText = rupiah(unitCost);
      document.getElementById('restock-avg-cost').innerText = rupiah(movingAvg);
      preview.style.display = 'block';
    }

    async function saveRestockForm(event) {
      event.preventDefault();
      const btn = document.getElementById('saveRestockBtn');
      btn.disabled = true;
      btn.innerText = 'Menyimpan...';

      const payload = {
        ingredientId: Number(document.getElementById('restock-ing-id').value),
        quantity: Number(document.getElementById('restock-qty').value),
        totalCost: Number(document.getElementById('restock-total-cost').value),
        supplier: document.getElementById('restock-supplier').value.trim() || 'Supplier',
        purchasedAt: document.getElementById('restock-date').value,
        recordExpense: document.getElementById('restock-record-expense').checked
      };

      try {
        await apiPost('restockingredient', payload);
        showToast('Restock berhasil dicatat dan HPP produk telah diperbarui!');
        closeRestockModal();
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal mencatat restock', true);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Simpan Pembelian';
      }
    }

    // ---------------- RECIPES (BOM) & LIVE HPP CALCULATOR ----------------
    function renderRecipesTable() {
      const tbody = document.getElementById('recipesTableBody');
      if (!tbody) return;

      tbody.innerHTML = products.map(p => {
        const prodRecipes = recipes.filter(r => String(r.productId) === String(p.id));
        const cogs = Number(p.cogs || 0);
        const price = Number(p.price || 0);
        const margin = price - cogs;
        const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;

        return `
          <tr style="border-bottom:1px solid #ead7ba;">
            <td style="padding:12px 14px; font-weight:700; color:var(--dark);">${esc(p.name)}</td>
            <td style="padding:12px 14px;"><span class="badge" style="background:#efe0c8; color:#6b4329; font-size:11px;">${esc(p.category)}</span></td>
            <td style="padding:12px 14px; font-weight:700;">${rupiah(price)}</td>
            <td style="padding:12px 14px; font-weight:800; color:var(--danger);">${rupiah(cogs)}</td>
            <td style="padding:12px 14px; font-weight:800; color:var(--success);">${rupiah(margin)} <small style="color:#6d5442;">(${marginPct}%)</small></td>
            <td style="padding:12px 14px;">${prodRecipes.length} bahan racikan</td>
            <td style="padding:12px 14px; text-align:right;">
              <button class="btn btn-outline btn-sm" onclick="openRecipeModal('${esc(p.id)}')" style="border-color:var(--coffee); font-weight:700;">
                <i class="fa-solid fa-utensils"></i> Atur Resep
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }



    function openRecipeModal(productId) {
      activeRecipeProductId = productId;
      const product = products.find(p => String(p.id) === String(productId));
      if (!product) return;

      document.getElementById('recipeModalTitle').innerText = `Atur Resep: ${product.name}`;
      document.getElementById('recipeModalSubtitle').innerText = `Kategori: ${product.category} | Harga Jual: ${rupiah(product.price)}`;
      document.getElementById('recipe-summary-price').innerText = rupiah(product.price);

      // Load existing recipe rows
      const existing = recipes.filter(r => String(r.productId) === String(productId));
      localRecipeItems = existing.map(r => ({
        ingredientId: Number(r.ingredientId),
        quantity: Number(r.quantity)
      }));

      if (localRecipeItems.length === 0) {
        localRecipeItems.push({ ingredientId: ingredients[0]?.id || 0, quantity: 1 });
      }

      renderRecipeRowsUI();
      updateRecipeLiveHPP();

      document.getElementById('recipeModalOverlay').classList.add('show');
    }

    function closeRecipeModal() {
      document.getElementById('recipeModalOverlay').classList.remove('show');
    }

    function renderRecipeRowsUI() {
      const container = document.getElementById('recipeItemsContainer');
      if (!container) return;

      container.innerHTML = localRecipeItems.map((item, idx) => {
        const currentIng = ingredients.find(i => i.id === item.ingredientId);
        const unitCost = Number(currentIng?.costPerUnit || 0);
        const subtotal = unitCost * Number(item.quantity || 0);

        const optionsHtml = ingredients.map(i =>
          `<option value="${i.id}" ${i.id === item.ingredientId ? 'selected' : ''}>${esc(i.name)} (${rupiah(i.costPerUnit)}/${i.unit})</option>`
        ).join('');

        return `
          <div style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:8px; align-items:center; background:#fffcf8; border:1px solid #ead7ba; border-radius:12px; padding:8px 12px;">
            <select class="form-control" style="padding:8px;" onchange="onRecipeItemIngChange(${idx}, this.value)">
              ${optionsHtml}
            </select>
            <div style="display:flex; align-items:center; gap:4px;">
              <input type="number" step="0.01" min="0.01" class="form-control" style="padding:8px;" value="${item.quantity}" placeholder="Takaran" oninput="onRecipeItemQtyChange(${idx}, this.value)">
              <span style="font-size:12px; color:#795d48; font-weight:700;">${esc(currentIng?.unit || '')}</span>
            </div>
            <div style="text-align:right; font-weight:700; color:var(--coffee); font-size:13px;">
              ${rupiah(subtotal)}
            </div>
            <button type="button" class="btn btn-danger btn-sm" style="padding:6px 10px;" onclick="removeRecipeRow(${idx})">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
      }).join('');
    }



    function addRecipeRow() {
      const firstIng = ingredients[0]?.id || 0;
      localRecipeItems.push({ ingredientId: firstIng, quantity: 1 });
      renderRecipeRowsUI();
      updateRecipeLiveHPP();
    }

    function removeRecipeRow(idx) {
      localRecipeItems.splice(idx, 1);
      renderRecipeRowsUI();
      updateRecipeLiveHPP();
    }

    function onRecipeItemIngChange(idx, newIngId) {
      localRecipeItems[idx].ingredientId = Number(newIngId);
      renderRecipeRowsUI();
      updateRecipeLiveHPP();
    }

    function onRecipeItemQtyChange(idx, newQty) {
      localRecipeItems[idx].quantity = Number(newQty || 0);
      renderRecipeRowsUI();
      updateRecipeLiveHPP();
    }

    function updateRecipeLiveHPP() {
      const product = products.find(p => String(p.id) === String(activeRecipeProductId));
      const price = Number(product?.price || 0);

      let totalCogs = 0;
      localRecipeItems.forEach(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        if (ing) {
          totalCogs += Number(ing.costPerUnit || 0) * Number(item.quantity || 0);
        }
      });

      const margin = price - totalCogs;
      const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;

      document.getElementById('recipe-summary-cogs').innerText = rupiah(totalCogs);
      document.getElementById('recipe-summary-margin').innerText = `${rupiah(margin)} (${marginPct}%)`;
    }

    async function submitRecipeForm() {
      const btn = document.getElementById('saveRecipeBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

      try {
        const payload = {
          productId: activeRecipeProductId,
          items: localRecipeItems.filter(i => i.ingredientId > 0 && i.quantity > 0)
        };
        await apiPost('saverecipe', payload);
        showToast('Resep menu berhasil disimpan dan HPP otomatis diperbarui!');
        closeRecipeModal();
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Gagal menyimpan resep', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Simpan Resep & Update HPP';
      }
    }