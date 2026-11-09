// ---------------- PRODUCTS TAB RENDERERS ----------------
    function populateCategoryFilter() {
      const filterSelect = document.getElementById('productCategoryFilter');
      const cats = [...new Set(products.map(p => p.category))].filter(Boolean);
      const currentSel = filterSelect.value;

      filterSelect.innerHTML = `<option value="Semua">Semua Kategori</option>` +
        cats.map(c => `<option value="${c}">${c}</option>`).join('');

      if (cats.includes(currentSel)) {
        filterSelect.value = currentSel;
      }
    }

    function renderProductsGrid(productsToRender = products) {
      const container = document.getElementById('products-list-container');
      if (productsToRender.length === 0) {
        container.innerHTML = `
          <div class="panel" style="grid-column: 1/-1; text-align: center; color: #8c7365; padding: 40px;">
            <i class="fa-solid fa-mug-hot" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
            <p>Tidak ada produk yang cocok.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = productsToRender.map(p => {
        let stockClass = 'stock-ok';
        let stockText = `Stok: ${p.stock}`;
        if (p.stock === 0) {
          stockClass = 'stock-empty';
          stockText = 'Stok Habis';
        } else if (p.stock <= 5) {
          stockClass = 'stock-low';
          stockText = `Stok Kritis: ${p.stock}`;
        }

        const featuredHtml = p.featured ? `<span class="product-badge-featured">Featured</span>` : '';
        const statusHtml = String(p.status).toLowerCase() !== 'active' ? `<span class="product-badge-inactive">${p.status}</span>` : '';

        const optionsList = productOptions.filter(o => o.productId === p.id && String(o.status).toLowerCase() !== 'inactive');
        const groups = [...new Set(optionsList.map(o => o.group))];
        const variantsLabel = p.hasVariant || groups.length > 0
          ? `<span style="font-size:11px; font-weight:700; color:var(--gold);"><i class="fa-solid fa-cube"></i> ${groups.join(', ')}</span>`
          : '<span style="font-size:11px; color:#8c7365;">Tanpa Varian</span>';

        const imageStyle = p.image ? `background-image: url('${p.image}');` : `background-image: linear-gradient(135deg, #efe0c8, #d9b98c); display:flex; align-items:center; justify-content:center;`;
        const fallbackContent = p.image ? '' : `<i class="fa-solid fa-mug-hot" style="font-size:42px; color:rgba(59,31,18,0.25);"></i>`;

        // Calculate Recipe BOM and Margin
        const prodRecipes = recipes.filter(r => String(r.productId) === String(p.id));
        const recipeCogs = prodRecipes.reduce((s, r) => s + (Number(r.subtotalCost) || (Number(r.quantity) * Number(r.costPerUnit) || 0)), 0);
        const effectiveCogs = recipeCogs > 0 ? recipeCogs : Number(p.cogs || 0);
        const grossProfit = Number(p.price || 0) - effectiveCogs;
        const marginPct = Number(p.price || 0) > 0 ? Math.round((grossProfit / Number(p.price)) * 100) : 0;

        return `
          <div class="product-card" id="product-card-${p.id}">
            <div class="product-image-container" style="${imageStyle}">
              ${fallbackContent}
              ${featuredHtml}
              ${statusHtml}
            </div>
            
            <div class="product-card-body">
              <span class="product-category">${p.category}</span>
              <div class="product-title">${p.name}</div>
              <p class="product-desc">${p.description || 'Tidak ada deskripsi.'}</p>
              
              <div style="margin-top: 4px; display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-stock ${stockClass}">${stockText}</span>
                ${variantsLabel}
              </div>
              
              <div class="product-details-row" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(59,31,18,0.12);">
                <div>
                  <span style="font-size: 10px; color: #8c7365; font-weight: 700; text-transform: uppercase;">Harga Jual</span>
                  <div class="product-card-price">${rupiah(p.price)}</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 10px; color: #8c7365; font-weight: 700; text-transform: uppercase;">HPP / COGS</span>
                  <div style="font-size: 13px; font-weight: 800; color: ${effectiveCogs > 0 ? 'var(--coffee)' : '#b57a26'};">
                    ${effectiveCogs > 0 ? rupiah(effectiveCogs) : '<span style="font-size:11px; color:#aaa;">Belum diset</span>'}
                  </div>
                </div>
              </div>

              <!-- Recipe Connection & Margin Badge -->
              <div style="margin: 8px 0; padding: 6px 10px; border-radius: 8px; background: ${prodRecipes.length > 0 ? '#f0f6ee' : '#faf2e6'}; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                ${prodRecipes.length > 0
                  ? `<span style="color: var(--success); font-weight: 700;"><i class="fa-solid fa-link"></i> ${prodRecipes.length} Bahan (Margin ${marginPct}%)</span>`
                  : `<span style="color: var(--warning); font-weight: 600;"><i class="fa-solid fa-link-slash"></i> Resep Kosong</span>`
                }
                <button class="btn btn-outline btn-sm" onclick="openRecipeModal('${p.id}')" style="padding: 2px 8px; font-size: 10px; border-radius: 6px; background: #fff; border-color: ${prodRecipes.length > 0 ? 'var(--border)' : 'var(--warning)'}; color: var(--coffee-dark);" title="Buka kalkulator resep bahan & HPP">
                  <i class="fa-solid fa-calculator"></i> ${prodRecipes.length > 0 ? 'Hitung Resep' : 'Hubungkan'}
                </button>
              </div>
              
              <div class="product-card-actions">
                <button class="btn btn-outline btn-sm" onclick="openRecipeModal('${p.id}')" title="Atur racikan resep & hitung HPP otomatis" style="border-color: var(--gold); color: var(--coffee);"><i class="fa-solid fa-scale-balanced"></i> Resep BOM</button>
                <button class="btn btn-outline btn-sm" onclick="openEditProductModal('${p.id}')"><i class="fa-regular fa-pen-to-square"></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')"><i class="fa-regular fa-trash-can"></i> Hapus</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }



    function filterProducts() {
      const q = document.getElementById('productSearch').value.toLowerCase();
      const cat = document.getElementById('productCategoryFilter').value;

      const filtered = products.filter(p => {
        const matchQuery = p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchCategory = cat === 'Semua' || p.category === cat;
        return matchQuery && matchCategory;
      });

      renderProductsGrid(filtered);
    }

    async function deleteProduct(productId) {
      if (!confirm(`Apakah Anda yakin ingin menonaktifkan/menghapus produk ${productId}?`)) return;

      const card = document.getElementById(`product-card-${productId}`);
      if (card) card.style.opacity = '0.5';

      try {
        await apiPost('deleteproduct', { id: productId });
        showToast(`Produk ${productId} berhasil dihapus/dinonaktifkan`);
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast("Gagal menghapus produk", true);
        if (card) card.style.opacity = '1';
      }
    }

// ---------------- MODAL ADD / EDIT PRODUCT & VARIANTS BUILDER ----------------
    let currentEditProductId = null;
    let localVariantGroups = [];

    function openAddProductModal() {
      currentEditProductId = null;
      document.getElementById('productModalTitle').innerText = "Tambah Produk Baru";

      document.getElementById('prod-id').value = '';
      document.getElementById('prod-id').disabled = false;
      document.getElementById('prod-name').value = '';
      document.getElementById('prod-category').value = '';
      document.getElementById('prod-status').value = 'Active';
      document.getElementById('prod-price').value = '';
      document.getElementById('prod-cogs').value = '';
      document.getElementById('prod-stock').value = '';
      document.getElementById('prod-featured').checked = false;
      document.getElementById('prod-image').value = '';
      document.getElementById('prod-description').value = '';
      document.getElementById('prod-has-variant').checked = false;

      // Reset Recipe Status in Add Modal
      const hintBox = document.getElementById('prodRecipeHintBox');
      const btnRecipe = document.getElementById('btnProductModalRecipe');
      if (btnRecipe) btnRecipe.style.display = 'none';
      if (hintBox) {
        hintBox.innerHTML = `
          <div style="color:#8c7365;">
            <i class="fa-solid fa-circle-info"></i> Masukkan HPP perkiraan manual di atas, atau simpan produk ini terlebih dahulu untuk kemudian menghubungkan resep bahan baku secara otomatis.
          </div>
        `;
      }

      localVariantGroups = [];
      renderVariantGroupsUI();
      toggleVariantBuilder(false);

      document.getElementById('productModalOverlay').classList.add('show');
    }

    function openEditProductModal(productId) {
      currentEditProductId = productId;
      const p = products.find(prod => prod.id === productId);
      if (!p) return;

      document.getElementById('productModalTitle').innerText = `Edit Produk: ${p.name}`;

      document.getElementById('prod-id').value = p.id;
      document.getElementById('prod-id').disabled = true;
      document.getElementById('prod-name').value = p.name;
      document.getElementById('prod-category').value = p.category;
      document.getElementById('prod-status').value = p.status || 'Active';
      document.getElementById('prod-price').value = p.price;
      document.getElementById('prod-cogs').value = p.cogs || '';
      document.getElementById('prod-stock').value = p.stock;
      document.getElementById('prod-featured').checked = p.featured;
      document.getElementById('prod-image').value = p.image || '';
      document.getElementById('prod-description').value = p.description || '';

      // Check Recipe connection for this product
      const prodRecipes = recipes.filter(r => String(r.productId) === String(p.id));
      const recipeCogs = prodRecipes.reduce((s, r) => s + (Number(r.subtotalCost) || (Number(r.quantity) * Number(r.costPerUnit) || 0)), 0);
      const hintBox = document.getElementById('prodRecipeHintBox');
      const btnRecipe = document.getElementById('btnProductModalRecipe');
      const lblRecipe = document.getElementById('lblProductModalRecipe');

      if (btnRecipe) btnRecipe.style.display = 'inline-flex';
      if (lblRecipe) lblRecipe.innerText = prodRecipes.length > 0 ? `Resep (${prodRecipes.length} Bahan)` : 'Atur Resep BOM';

      if (hintBox) {
        if (prodRecipes.length > 0) {
          const ingNames = prodRecipes.map(r => r.ingredientName).join(', ');
          hintBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--success); font-weight:700;"><i class="fa-solid fa-link"></i> Tersambung Resep (${prodRecipes.length} bahan: ${ingNames})</span>
              <span style="font-weight:800; color:var(--coffee);">HPP: ${rupiah(recipeCogs)}</span>
            </div>
            <div style="font-size:10px; color:#8c7365; margin-top:2px;">Klik tombol "Hitung" untuk menyalin nilai HPP resep ke formulir.</div>
          `;
        } else {
          hintBox.innerHTML = `
            <div style="color:#b57a26;">
              <i class="fa-solid fa-circle-info"></i> Belum ada komposisi resep bahan baku. Klik <b>"Atur Resep BOM"</b> di samping untuk menghubungkan biji kopi, susu, cup, dll.
            </div>
          `;
        }
      }

      const hasVar = p.hasVariant || false;
      document.getElementById('prod-has-variant').checked = hasVar;

      const optionsList = productOptions.filter(o => o.productId === p.id);

      const grouped = {};
      optionsList.forEach(o => {
        if (!grouped[o.group]) grouped[o.group] = [];
        grouped[o.group].push({
          option: o.option,
          priceAdd: o.priceAdd,
          default: o.default,
          required: o.required,
          sort: o.sort,
          status: o.status || 'Active'
        });
      });

      localVariantGroups = Object.entries(grouped).map(([groupName, opts], index) => ({
        id: 'vg-' + Date.now() + '-' + index,
        groupName: groupName,
        options: opts.sort((a, b) => (a.sort || 0) - (b.sort || 0))
      }));

      renderVariantGroupsUI();
      toggleVariantBuilder(hasVar);

      document.getElementById('productModalOverlay').classList.add('show');
    }

    function closeProductModal() {
      document.getElementById('productModalOverlay').classList.remove('show');
    }

    function openRecipeFromProductModal() {
      if (!currentEditProductId) {
        showToast("Simpan produk terlebih dahulu sebelum mengatur resep bahan.", true);
        return;
      }
      closeProductModal();
      openRecipeModal(currentEditProductId);
    }

    function syncCogsFromRecipeModal() {
      if (!currentEditProductId) {
        showToast("Simpan produk terlebih dahulu untuk menghubungkan ke resep bahan.", true);
        return;
      }
      const prodRecipes = recipes.filter(r => String(r.productId) === String(currentEditProductId));
      if (prodRecipes.length === 0) {
        showToast("Belum ada resep bahan untuk produk ini. Buka Resep BOM untuk menambahkan racikan.", true);
        return;
      }
      const recipeCogs = prodRecipes.reduce((s, r) => s + (Number(r.subtotalCost) || (Number(r.quantity) * Number(r.costPerUnit) || 0)), 0);
      document.getElementById('prod-cogs').value = Math.round(recipeCogs);
      showToast(`HPP disinkronkan dari resep: ${rupiah(recipeCogs)}`);
    }

    function toggleVariantBuilder(show) {
      document.getElementById('variantBuilderPanel').style.display = show ? 'block' : 'none';
    }

    function addVariantGroupUI() {
      const newGroup = {
        id: 'vg-' + Date.now(),
        groupName: '',
        options: [
          { option: '', priceAdd: 0, default: true, required: true, sort: 1, status: 'Active' }
        ]
      };
      localVariantGroups.push(newGroup);
      renderVariantGroupsUI();
    }

    function removeVariantGroupUI(groupId) {
      localVariantGroups = localVariantGroups.filter(g => g.id !== groupId);
      renderVariantGroupsUI();
    }

    function addVariantOptionRow(groupId) {
      const group = localVariantGroups.find(g => g.id === groupId);
      if (!group) return;

      const newSort = group.options.length + 1;
      group.options.push({
        option: '',
        priceAdd: 0,
        default: false,
        required: true,
        sort: newSort,
        status: 'Active'
      });
      renderVariantGroupsUI();
    }

    function removeVariantOptionRow(groupId, optIndex) {
      const group = localVariantGroups.find(g => g.id === groupId);
      if (!group) return;

      group.options.splice(optIndex, 1);
      renderVariantGroupsUI();
    }

    function updateGroupName(groupId, val) {
      const group = localVariantGroups.find(g => g.id === groupId);
      if (group) group.groupName = val;
    }

    function updateOptionField(groupId, optIndex, field, val) {
      const group = localVariantGroups.find(g => g.id === groupId);
      if (!group || !group.options[optIndex]) return;

      if (field === 'priceAdd' || field === 'sort') {
        group.options[optIndex][field] = Number(val) || 0;
      } else if (field === 'default') {
        const isChecked = val;
        group.options.forEach((opt, idx) => {
          if (idx === optIndex) opt.default = isChecked;
          else if (isChecked) opt.default = false;
        });
        renderVariantGroupsUI();
      } else {
        group.options[optIndex][field] = val;
      }
    }

    function renderVariantGroupsUI() {
      const container = document.getElementById('variantGroupsContainer');
      if (localVariantGroups.length === 0) {
        container.innerHTML = `<p style="font-size: 12px; color: #8c7365; text-align: center; padding: 20px;">Grup varian kosong. Klik "Tambah Grup".</p>`;
        return;
      }

      container.innerHTML = localVariantGroups.map(g => {
        const optionsRowsHtml = g.options.map((o, idx) => `
          <div class="variant-option-row">
            <input type="text" class="form-control form-control-sm" placeholder="Pilihan" value="${o.option}" onchange="updateOptionField('${g.id}', ${idx}, 'option', this.value)" style="padding:6px; font-size:12px;" required>
            <input type="number" class="form-control form-control-sm" placeholder="+Harga" value="${o.priceAdd}" onchange="updateOptionField('${g.id}', ${idx}, 'priceAdd', this.value)" style="padding:6px; font-size:12px;" min="0">
            <label class="form-row-checkbox" style="margin-bottom:0; justify-content:center;">
              <input type="checkbox" ${o.default ? 'checked' : ''} onchange="updateOptionField('${g.id}', ${idx}, 'default', this.checked)"> Def
            </label>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeVariantOptionRow('${g.id}', ${idx})" style="padding:6px 10px;"><i class="fa fa-times"></i></button>
          </div>
        `).join('');

        return `
          <div class="variant-group-card" id="card-${g.id}">
            <div class="variant-group-header">
              <input type="text" class="form-control" placeholder="Grup Varian" value="${g.groupName}" onchange="updateGroupName('${g.id}', this.value)" style="font-weight:700; padding:8px 12px;" required>
              <button type="button" class="btn btn-danger btn-sm" onclick="removeVariantGroupUI('${g.id}')"><i class="fa-regular fa-trash-can"></i> Hapus</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:8px;">
              ${optionsRowsHtml}
            </div>
            
            <button type="button" class="btn btn-outline btn-sm" onclick="addVariantOptionRow('${g.id}')"><i class="fa fa-plus"></i> Pilihan</button>
          </div>
        `;
      }).join('');
    }



    async function saveProductForm(e) {
      e.preventDefault();

      const submitBtn = document.getElementById('saveProductFormBtn');
      submitBtn.innerText = "Menyimpan...";
      submitBtn.disabled = true;

      const id = document.getElementById('prod-id').value.trim();
      const name = document.getElementById('prod-name').value.trim();
      const category = document.getElementById('prod-category').value.trim();
      const status = document.getElementById('prod-status').value;
      const price = Number(document.getElementById('prod-price').value);
      const cogs = Number(document.getElementById('prod-cogs').value || 0);
      const stock = Number(document.getElementById('prod-stock').value);
      const featured = document.getElementById('prod-featured').checked;
      const image = document.getElementById('prod-image').value.trim();
      const description = document.getElementById('prod-description').value.trim();
      const hasVariant = document.getElementById('prod-has-variant').checked;

      const flatOptionsList = [];
      if (hasVariant) {
        localVariantGroups.forEach(g => {
          if (!g.groupName) return;
          g.options.forEach(o => {
            if (!o.option) return;
            flatOptionsList.push({
              group: g.groupName.trim(),
              option: o.option.trim(),
              priceAdd: Number(o.priceAdd || 0),
              default: o.default || false,
              required: o.required || true,
              sort: Number(o.sort || 1),
              status: o.status || 'Active'
            });
          });
        });
      }

      const payload = {
        id, name, category, status, price, cogs, stock, featured, image, description, hasVariant,
        options: flatOptionsList
      };

      try {
        await apiPost('saveproduct', payload);
        showToast(`Produk "${name}" berhasil disimpan.`);
        closeProductModal();
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast("Gagal menyimpan produk ke database.", true);
      } finally {
        submitBtn.innerText = "Simpan Produk";
        submitBtn.disabled = false;
      }
    }