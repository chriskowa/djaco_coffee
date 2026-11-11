// ---------------- POS TAB SYSTEM ----------------
    function renderPosMenu() {
      const grid = document.getElementById('posProductsGrid');
      const searchInput = document.getElementById('posSearch');
      const q = (searchInput ? searchInput.value : '').toLowerCase().trim();

      // Count items currently in posCart per product
      const cartCounts = {};
      posCart.forEach(item => {
        const pid = String(item.productId);
        cartCounts[pid] = (cartCounts[pid] || 0) + (Number(item.qty) || 0);
      });

      // Filter menu items
      const activeProducts = products.filter(p => {
        const isAct = String(p.status || 'Active').toLowerCase() === 'active';
        const matchQuery = !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchCategory = posSelectedCategory === 'Semua' || p.category === posSelectedCategory;
        return isAct && matchQuery && matchCategory;
      });

      // Render category filter pills
      const categories = ['Semua', ...new Set(products.map(p => p.category))].filter(Boolean);
      const pillsWrapper = document.getElementById('posCategoryPills');
      if (pillsWrapper) {
        pillsWrapper.innerHTML = categories.map(c => `
          <button type="button" class="category-pill ${posSelectedCategory === c ? 'active' : ''}" onclick="selectPosCategory('${c}')">${c}</button>
        `).join('');
      }

      const selectWrapper = document.getElementById('posCategorySelect');
      if (selectWrapper) {
        selectWrapper.innerHTML = categories.map(c => `
          <option value="${c}" ${posSelectedCategory === c ? 'selected' : ''}>${c}</option>
        `).join('');
      }

      if (!grid) return;

      if (activeProducts.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #8c7365;">
            <i class="fa-solid fa-mug-hot" style="font-size: 36px; opacity: 0.3; margin-bottom: 12px; display: block;"></i>
            <div style="font-weight: 700; font-size: 14px;">Menu Tidak Ditemukan</div>
            <div style="font-size: 12px; color: #a49185; margin-top: 4px;">Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.</div>
          </div>
        `;
        return;
      }

      grid.innerHTML = activeProducts.map(p => {
        const pIdStr = String(p.id);
        const inCartQty = cartCounts[pIdStr] || 0;
        const hasOpt = productOptions.some(o => String(o.productId) === pIdStr && String(o.status).toLowerCase() !== 'inactive');
        const imgStyle = p.image ? `background-image: url('${p.image}');` : `background-image: linear-gradient(135deg, #efe0c8, #d9b98c);`;

        const stockNum = Number(p.stock) || 0;
        let stockBadge = `<span class="pos-card-badge-stock stock-ok">Stok: ${stockNum}</span>`;
        let disabledAttr = '';
        if (stockNum <= 0) {
          stockBadge = `<span class="pos-card-badge-stock stock-danger">Habis</span>`;
          disabledAttr = 'style="opacity: 0.55; cursor: not-allowed;"';
        } else if (stockNum <= 5) {
          stockBadge = `<span class="pos-card-badge-stock stock-warn">Sisa: ${stockNum}</span>`;
        }

        return `
          <div class="pos-product-card" onclick="clickPosProduct('${p.id}')" ${disabledAttr}>
            <div class="pos-product-image" style="${imgStyle}">
              ${stockBadge}
              ${hasOpt ? `<span class="pos-card-badge-variant"><i class="fa-solid fa-layer-group"></i> Varian</span>` : ''}
              ${inCartQty > 0 ? `<span class="pos-card-badge-incart"><i class="fa-solid fa-check"></i> ${inCartQty}x</span>` : ''}
            </div>
            <div class="pos-product-details">
              <div class="pos-product-name" title="${p.name}">${p.name}</div>
              <div class="pos-product-bottom-row">
                <div class="pos-product-price">${rupiah(p.price)}</div>
                <button type="button" class="pos-card-add-btn" title="Tambah ke keranjang">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function selectPosCategory(cat) {
      posSelectedCategory = cat;
      const selectWrapper = document.getElementById('posCategorySelect');
      if (selectWrapper) {
        selectWrapper.value = cat;
      }
      renderPosMenu();
    }

    function filterPosMenu() {
      renderPosMenu();
    }

    function clickPosProduct(productId) {
      const p = products.find(prod => String(prod.id) === String(productId));
      if (!p || Number(p.stock) <= 0) return;

      const optionsList = productOptions.filter(o => String(o.productId) === String(p.id) && String(o.status).toLowerCase() !== 'inactive');

      if (optionsList.length > 0) {
        // Has variants, open selector modal
        openPosProductModal(p, optionsList);
      } else {
        // Standard product, add directly
        addPosDirectToCart(p);
      }
    }

    // Direct add for products with no options
    function addPosDirectToCart(product) {
      const pIdStr = String(product.id);
      const cartQty = posCart.filter(item => String(item.productId) === pIdStr).reduce((s, i) => s + (Number(i.qty) || 0), 0);
      if (cartQty >= Number(product.stock)) {
        showToast("Stok produk tidak mencukupi!", true);
        return;
      }

      const existingIndex = posCart.findIndex(item => String(item.productId) === pIdStr && (!item.options || item.options.length === 0));
      if (existingIndex > -1) {
        posCart[existingIndex].qty += 1;
        posCart[existingIndex].subtotal = posCart[existingIndex].qty * posCart[existingIndex].unitPrice;
      } else {
        posCart.push({
          uid: 'pos-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          productId: product.id,
          name: product.name,
          category: product.category || 'Menu',
          qty: 1,
          basePrice: Number(product.price),
          unitPrice: Number(product.price),
          options: [],
          optionsText: '',
          itemNote: '',
          subtotal: Number(product.price),
          checked: true
        });
      }

      showToast(`+1 ${product.name} dimasukkan keranjang`);
      renderPosCart();
      renderPosMenu();
    }

    // Modal POS Options selection
    function openPosProductModal(product, optionsList) {
      posModalProduct = product;
      posModalQty = 1;
      posModalSelections = {};

      // Group options by type
      const groups = {};
      optionsList.forEach(o => {
        if (!groups[o.group]) groups[o.group] = [];
        groups[o.group].push(o);
      });

      // Set defaults
      Object.entries(groups).forEach(([groupName, opts]) => {
        const def = opts.find(o => o.default) || opts[0];
        if (def) posModalSelections[groupName] = def;
      });

      document.getElementById('posModalTitle').innerText = product.name;
      document.getElementById('posItemNote').value = '';

      renderPosModalOptions(groups);
      updatePosModalPrice();

      document.getElementById('posProductModalOverlay').classList.add('show');
    }

    function closePosProductModal() {
      document.getElementById('posProductModalOverlay').classList.remove('show');
    }

    function renderPosModalOptions(groupedOptions) {
      const container = document.getElementById('posOptionList');
      window._currentPosModalGroups = groupedOptions;

      container.innerHTML = Object.entries(groupedOptions).map(([groupName, opts]) => {
        const chipsHtml = opts.map((o, idx) => {
          const isActive = posModalSelections[groupName]?.option === o.option;
          return `
            <button type="button" class="opt-chip ${isActive ? 'active' : ''}" 
              data-group="${encodeURIComponent(groupName)}" 
              data-idx="${idx}" 
              onclick="handlePosOptionClick(this)">
              ${o.option} ${o.priceAdd ? `(+ ${rupiah(o.priceAdd)})` : ''}
            </button>
          `;
        }).join('');

        return `
          <div>
            <div style="font-size:11px; font-weight:700; color:#8c7365; text-transform:uppercase; margin-bottom:6px;">${groupName}</div>
            <div class="opt-chip-grid">${chipsHtml}</div>
          </div>
        `;
      }).join('');
    }

    function handlePosOptionClick(btn) {
      const groupName = decodeURIComponent(btn.getAttribute('data-group'));
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const opts = window._currentPosModalGroups ? window._currentPosModalGroups[groupName] : null;
      if (opts && opts[idx]) {
        posModalSelections[groupName] = opts[idx];
        renderPosModalOptions(window._currentPosModalGroups);
        updatePosModalPrice();
      }
    }

    function updatePosModalPrice() {
      const basePrice = Number(posModalProduct.price || 0);
      const extraPrice = Object.values(posModalSelections).reduce((s, o) => s + Number(o.priceAdd || 0), 0);
      const unitPrice = basePrice + extraPrice;

      document.getElementById('posModalQty').innerText = posModalQty;
      document.getElementById('posModalTotalPrice').innerText = rupiah(unitPrice * posModalQty);
    }

    function changePosModalQty(change) {
      const pIdStr = String(posModalProduct.id);
      const cartQty = posCart.filter(item => String(item.productId) === pIdStr).reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const maxAvailable = Number(posModalProduct.stock) - cartQty;

      posModalQty = Math.max(1, Math.min(maxAvailable, posModalQty + change));
      updatePosModalPrice();
    }

    function addPosModalItemToCart() {
      const basePrice = Number(posModalProduct.price || 0);
      const extraPrice = Object.values(posModalSelections).reduce((s, o) => s + Number(o.priceAdd || 0), 0);
      const unitPrice = basePrice + extraPrice;
      const note = (document.getElementById('posItemNote').value || '').trim();

      const optionsPayload = Object.entries(posModalSelections).map(([g, o]) => ({
        group: g,
        option: o.option,
        priceAdd: Number(o.priceAdd || 0)
      }));

      const optionsText = optionsPayload.map(o => `${o.group}: ${o.option}${o.priceAdd ? ` (+${rupiah(o.priceAdd)})` : ''}`).join(', ');

      posCart.push({
        uid: 'pos-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        productId: posModalProduct.id,
        name: posModalProduct.name,
        category: posModalProduct.category || 'Menu',
        qty: posModalQty,
        basePrice: Number(posModalProduct.price || 0),
        unitPrice: unitPrice,
        options: optionsPayload,
        optionsText: optionsText,
        itemNote: note,
        subtotal: unitPrice * posModalQty,
        checked: true
      });

      showToast(`+${posModalQty} ${posModalProduct.name} dimasukkan keranjang`);
      closePosProductModal();
      renderPosCart();
      renderPosMenu();
    }

    function togglePosCartItemSelection(uid) {
      const item = posCart.find(i => i.uid === uid);
      if (item) {
        item.checked = !(item.checked !== false);
        renderPosCart();
      }
    }

    // POS Cart rendering
    function renderPosCart() {
      const wrapper = document.getElementById('posCartItemsWrapper');
      const floatBar = document.getElementById('posFloatingCartBar');
      const countBadge = document.getElementById('posCartCountBadge');
      const container = document.querySelector('.pos-container');
      const isCartView = container && container.classList.contains('show-cart');

      // Initialize datetime if empty
      const dtInput = document.getElementById('posOrderDateTime');
      if (dtInput && !dtInput.value) {
        setPosDateTimeNow();
      }

      renderPosRecentTransactions();

      const totalItemsCount = posCart.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      if (countBadge) {
        countBadge.innerText = `${totalItemsCount} item`;
      }

      if (posCart.length === 0) {
        if (wrapper) {
          wrapper.innerHTML = `
            <div class="pos-cart-empty">
              <div class="pos-cart-empty-icon"><i class="fa-solid fa-basket-shopping"></i></div>
              <div class="pos-cart-empty-title">Keranjang Kasir Kosong</div>
              <div class="pos-cart-empty-desc">Pilih menu dari katalog untuk menambahkan item ke keranjang belanja.</div>
            </div>
          `;
        }
        document.getElementById('pos-subtotal').innerText = 'Rp0';
        document.getElementById('pos-grandtotal').innerText = 'Rp0';

        // Reset Mobile Badge
        const mBadge = document.getElementById('posMobileCartBadge');
        if (mBadge) {
          mBadge.innerText = '0';
          mBadge.style.display = 'none';
        }

        // Hide Floating Bar
        if (floatBar) {
          floatBar.style.display = 'none';
        }

        calculatePosChange();
        return;
      }

      if (wrapper) {
        wrapper.innerHTML = posCart.map(item => `
          <div class="pos-cart-item ${item.checked === false ? 'item-unchecked' : ''}">
            <input type="checkbox" ${item.checked !== false ? 'checked' : ''} 
              onchange="togglePosCartItemSelection('${item.uid}')" 
              class="pos-cart-checkbox" title="Centang untuk menyertakan dalam pembayaran">
            
            <div class="pos-cart-item-info">
              <div class="pos-cart-item-name">${item.name}</div>
              ${item.optionsText ? `<div class="pos-cart-item-options">${item.optionsText}</div>` : ''}
              ${item.itemNote ? `<div class="pos-cart-item-note"><i class="fa-solid fa-pen-to-square"></i> ${item.itemNote}</div>` : ''}
              <div class="pos-cart-item-unit-price">${rupiah(item.unitPrice)} / porsi</div>
            </div>
            
            <div class="pos-cart-item-actions">
              <div class="pos-cart-item-subtotal">${rupiah(item.subtotal)}</div>
              <div style="display:flex; align-items:center; gap:6px;">
                <div class="qty-counter">
                  <button type="button" onclick="changePosCartQty('${item.uid}', -1)" title="Kurang">−</button>
                  <span class="qty-num">${item.qty}</span>
                  <button type="button" onclick="changePosCartQty('${item.uid}', 1)" title="Tambah">+</button>
                </div>
                <button type="button" class="pos-cart-delete-btn" onclick="removePosCartItem('${item.uid}')" title="Hapus Item">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }

      const checkedItems = posCart.filter(i => i.checked !== false);
      const subtotal = checkedItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

      document.getElementById('pos-subtotal').innerText = rupiah(subtotal);
      document.getElementById('pos-grandtotal').innerText = rupiah(subtotal);

      calculatePosChange();

      // Update Mobile POS Cart Badge in top tab
      const mBadge = document.getElementById('posMobileCartBadge');
      if (mBadge) {
        if (totalItemsCount > 0) {
          mBadge.innerText = totalItemsCount;
          mBadge.style.display = 'inline-block';
        } else {
          mBadge.style.display = 'none';
        }
      }

      // Update Floating Bottom Cart Bar
      if (floatBar) {
        const floatCount = document.getElementById('posFloatingCartCount');
        const floatTotal = document.getElementById('posFloatingCartTotal');
        if (floatCount) floatCount.innerText = totalItemsCount;
        if (floatTotal) floatTotal.innerText = rupiah(subtotal);

        // Show floating bar only on mobile/tablet (<= 860px) when in menu catalog view
        if (window.innerWidth <= 860 && !isCartView && activeTab === 'pos') {
          floatBar.style.display = 'flex';
          // Trigger bump animation
          floatBar.classList.remove('cart-bump');
          void floatBar.offsetWidth;
          floatBar.classList.add('cart-bump');
        } else {
          floatBar.style.display = 'none';
        }
      }
    }

    function removePosCartItem(uid) {
      const index = posCart.findIndex(i => i.uid === uid);
      if (index !== -1) {
        const item = posCart[index];
        posCart.splice(index, 1);
        showToast(`${item.name} dihapus dari keranjang`);
        renderPosCart();
        renderPosMenu();
      }
    }

    // Toggle POS Mobile views between catalog menu and cart checkout drawer
    function togglePosMobileView(view) {
      const container = document.querySelector('.pos-container');
      const btnMenu = document.getElementById('pos-btn-menu');
      const btnCart = document.getElementById('pos-btn-cart');
      const floatBar = document.getElementById('posFloatingCartBar');

      if (!container) return;

      if (view === 'cart') {
        container.classList.add('show-cart');
        if (btnCart) {
          btnCart.classList.add('active', 'btn-primary');
          btnCart.classList.remove('btn-outline');
        }
        if (btnMenu) {
          btnMenu.classList.remove('active', 'btn-primary');
          btnMenu.classList.add('btn-outline');
        }
        if (floatBar) floatBar.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.classList.remove('show-cart');
        if (btnMenu) {
          btnMenu.classList.add('active', 'btn-primary');
          btnMenu.classList.remove('btn-outline');
        }
        if (btnCart) {
          btnCart.classList.remove('active', 'btn-primary');
          btnCart.classList.add('btn-outline');
        }
        // Show floating bar if on mobile and cart has items
        if (floatBar && posCart.length > 0 && window.innerWidth <= 860 && activeTab === 'pos') {
          floatBar.style.display = 'flex';
        }
      }
    }

    function changePosCartQty(uid, change) {
      const index = posCart.findIndex(i => i.uid === uid);
      if (index === -1) return;

      const item = posCart[index];
      const p = products.find(prod => String(prod.id) === String(item.productId));
      if (!p) {
        posCart.splice(index, 1);
        renderPosCart();
        renderPosMenu();
        return;
      }

      const otherQty = posCart.filter(i => String(i.productId) === String(item.productId) && i.uid !== uid).reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const maxAvailable = Number(p.stock) - otherQty;

      const newQty = item.qty + change;
      if (newQty <= 0) {
        posCart.splice(index, 1);
        showToast(`${item.name} dihapus dari keranjang`);
      } else if (newQty > maxAvailable) {
        showToast(`Stok maksimal tercapai (${p.stock})`, true);
        return;
      } else {
        item.qty = newQty;
        item.subtotal = item.qty * item.unitPrice;
      }

      renderPosCart();
      renderPosMenu();
    }

    function getLocalDateTimeInputValue(date = new Date()) {
      const d = (date instanceof Date && !isNaN(date)) ? date : new Date(date);
      const pad = n => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    }

    function setPosDateTimeNow() {
      const dtInput = document.getElementById('posOrderDateTime');
      if (dtInput) {
        dtInput.value = getLocalDateTimeInputValue(new Date());
      }
    }

    function clearPosCart() {
      if (posCart.length === 0) return;
      if (!confirm("Kosongkan semua item di keranjang kasir?")) return;
      posCart = [];
      document.getElementById('posCustomerName').value = '';
      document.getElementById('posCustomerPhone').value = '';
      document.getElementById('posOrderNotes').value = '';
      setPosDateTimeNow();
      renderPosCart();
      renderPosMenu();
      showToast("Keranjang kasir telah dikosongkan");
    }

    function togglePosPayment(method) {
      const calcPanel = document.getElementById('posChangeCalculator');
      if (method === 'Tunai') {
        calcPanel.style.display = 'block';
        calculatePosChange();
      } else {
        calcPanel.style.display = 'none';
      }
    }

    function calculatePosChange() {
      const checkedItems = posCart.filter(i => i.checked !== false);
      const subtotal = checkedItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
      const cashVal = Number(document.getElementById('posCashReceived').value || 0);
      const changeDue = Math.max(0, cashVal - subtotal);

      document.getElementById('posChangeDue').innerText = cashVal >= subtotal ? rupiah(changeDue) : "Uang belum cukup";
    }

    // Toggle POS Checkout Status (Langsung Selesai vs Pending)
    function handlePosStatusOptionChange() {
      const isCompleted = document.getElementById('posOptCompleted')?.checked;
      const btn = document.getElementById('posSubmitOrderBtn');
      const badge = document.getElementById('posStatusIndicatorBadge');
      const lblCompleted = document.getElementById('posOptCompletedLabel');
      const lblPending = document.getElementById('posOptPendingLabel');

      if (isCompleted) {
        if (btn) {
          btn.className = 'btn btn-success';
          btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Bayar & Selesai (Masuk Pembukuan)';
        }
        if (badge) {
          badge.style.color = 'var(--success)';
          badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Masuk Pembukuan';
        }
        if (lblCompleted) {
          lblCompleted.style.background = 'var(--success-bg)';
          lblCompleted.style.borderColor = 'var(--success)';
          lblCompleted.style.color = 'var(--success)';
        }
        if (lblPending) {
          lblPending.style.background = 'var(--light)';
          lblPending.style.borderColor = 'var(--border)';
          lblPending.style.color = 'var(--dark)';
        }
      } else {
        if (btn) {
          btn.className = 'btn btn-primary';
          btn.innerHTML = '<i class="fa-solid fa-clock"></i> Simpan Antrean Order (Pending)';
        }
        if (badge) {
          badge.style.color = 'var(--warning)';
          badge.innerHTML = '<i class="fa-solid fa-clock"></i> Masuk Antrean';
        }
        if (lblPending) {
          lblPending.style.background = 'var(--warning-bg)';
          lblPending.style.borderColor = 'var(--warning)';
          lblPending.style.color = 'var(--warning)';
        }
        if (lblCompleted) {
          lblCompleted.style.background = 'var(--light)';
          lblCompleted.style.borderColor = 'var(--border)';
          lblCompleted.style.color = 'var(--dark)';
        }
      }
    }

    // Checkout POS Transactions
    async function checkoutPosOrder() {
      const checkedItems = posCart.filter(i => i.checked !== false);
      if (checkedItems.length === 0) {
        alert("Pilih minimal satu item untuk dibayar!");
        return;
      }

      const total = checkedItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
      const method = document.getElementById('posPaymentMethod').value;
      const cashVal = Number(document.getElementById('posCashReceived').value || 0);

      if (method === 'Tunai' && cashVal < total) {
        alert("Nominal pembayaran cash kurang!");
        return;
      }

      const customerName = document.getElementById('posCustomerName').value.trim() || 'Walk-in Kasir';
      const customerPhone = document.getElementById('posCustomerPhone').value.trim() || '-';
      const notes = document.getElementById('posOrderNotes').value.trim() || 'Order POS Kasir';
      const status = document.getElementById('posOptPending')?.checked ? 'Pending' : 'Completed';

      const rawDateTime = document.getElementById('posOrderDateTime')?.value;
      const createdAt = rawDateTime ? rawDateTime.replace('T', ' ') + ':00' : null;

      const isEditing = Boolean(posEditingInvoice);
      const targetEndpoint = isEditing ? 'updateorder' : 'createorder';

      const payload = {
        action: isEditing ? 'updateOrder' : 'createOrder',
        invoiceNo: isEditing ? posEditingInvoice : undefined,
        customerName,
        customerPhone,
        paymentMethod: method,
        status: status,
        createdAt: createdAt,
        notes,
        items: checkedItems.map(i => ({
          productId: i.productId,
          name: i.name,
          category: i.category || '',
          basePrice: Number(i.basePrice || i.unitPrice || 0),
          unitPrice: Number(i.unitPrice || 0),
          qty: Number(i.qty || 1),
          options: (i.options || []).map(o => ({ group: o.group, option: o.option, priceAdd: Number(o.priceAdd || 0) })),
          optionsText: i.optionsText || '',
          itemNote: i.itemNote || '',
          subtotal: Number(i.subtotal != null ? i.subtotal : (Number(i.unitPrice || 0) * Number(i.qty || 1)))
        })),
        discount: 0,
        adminFee: 0,
        packagingCost: 0,
        otherExpense: 0,
        total: total
      };

      try {
        showToast(isEditing ? `Menyimpan penyesuaian ${posEditingInvoice}...` : (status === 'Completed' ? "Menyelesaikan transaksi & membukukan..." : "Menyimpan transaksi antrean..."));
        const result = await apiPost(targetEndpoint, payload);

        // Save state for invoice printing
        activeInvoiceOrder = {
          ...payload,
          ...result,
          status: result.status || status,
          invoiceNo: result.invoiceNo || posEditingInvoice,
          transactionId: result.transactionId,
          total: result.total || total,
          createdAt: result.createdAt || (rawDateTime ? new Date(rawDateTime) : new Date()),
          date: result.date || result.createdAt || (rawDateTime ? new Date(rawDateTime) : new Date()),
          items: checkedItems // Hold localized items details
        };

        // Open Invoice & reset
        showAdminInvoiceModal(activeInvoiceOrder);

        // Reset edit mode
        posEditingInvoice = null;
        const banner = document.getElementById('posEditModeBanner');
        if (banner) banner.style.display = 'none';

        // Remove only checked items, and reset remaining items to checked
        posCart = posCart.filter(i => i.checked === false);
        posCart.forEach(i => i.checked = true);

        setPosDateTimeNow();
        handlePosStatusOptionChange();
        renderPosCart();
        renderPosMenu();
        togglePosMobileView('menu');
        await reloadData();
        renderPosRecentTransactions();
      } catch (err) {
        console.error(err);
        alert("Gagal memproses transaksi POS. Cek koneksi & Deployment URL.");
      }
    }

    // Hold Orders Logic
    function esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function loadHeldOrders() {
      try {
        heldOrders = JSON.parse(localStorage.getItem(HELD_ORDERS_KEY) || '[]');
      } catch (e) {
        heldOrders = [];
      }
      renderHeldOrders();
    }

    function saveHeldOrders() {
      try {
        localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(heldOrders));
      } catch (e) { }
      renderHeldOrders();
    }

    function holdPosOrder() {
      if (posCart.length === 0) {
        alert("Keranjang kosong!");
        return;
      }
      const nameInput = document.getElementById('posCustomerName').value.trim();
      const defaultName = 'Grup ' + (heldOrders.length + 1);
      const title = prompt("Masukkan Nama Grup / Nomor Meja untuk transaksi sementara ini:", nameInput || defaultName);
      if (title === null) return; // cancelled

      const labelName = title.trim() || defaultName;
      const customerPhone = document.getElementById('posCustomerPhone').value.trim();
      const notes = document.getElementById('posOrderNotes').value.trim();
      const orderDateTime = document.getElementById('posOrderDateTime')?.value || '';

      const heldObj = {
        id: 'held-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        label: labelName,
        customerName: labelName,
        customerPhone: customerPhone,
        notes: notes,
        orderDateTime: orderDateTime,
        items: JSON.parse(JSON.stringify(posCart)),
        createdAt: new Date().toISOString()
      };

      heldOrders.push(heldObj);
      saveHeldOrders();

      // Reset POS Cart
      posCart = [];
      document.getElementById('posCustomerName').value = '';
      document.getElementById('posCustomerPhone').value = '';
      document.getElementById('posOrderNotes').value = '';
      setPosDateTimeNow();
      renderPosCart();
      renderPosMenu();
      showToast("Transaksi sementara disimpan!");
    }

    function resumeHeldOrder(id) {
      const idx = heldOrders.findIndex(h => h.id === id);
      if (idx === -1) return;

      const held = heldOrders[idx];
      if (posCart.length > 0) {
        const confirmMerge = confirm("Keranjang aktif tidak kosong. Apakah Anda ingin MENGGABUNGKAN item keranjang ini?");
        if (!confirmMerge) return;
        // Merge
        held.items.forEach(hItem => {
          const match = posCart.find(cItem => cItem.productId === hItem.productId && JSON.stringify(cItem.options) === JSON.stringify(hItem.options));
          if (match) {
            match.qty += hItem.qty;
            match.subtotal = match.qty * match.unitPrice;
          } else {
            posCart.push(hItem);
          }
        });
      } else {
        posCart = held.items;
        document.getElementById('posCustomerName').value = held.customerName || '';
        document.getElementById('posCustomerPhone').value = held.customerPhone || '';
        document.getElementById('posOrderNotes').value = held.notes || '';
        if (held.orderDateTime) {
          const dtInput = document.getElementById('posOrderDateTime');
          if (dtInput) dtInput.value = held.orderDateTime;
        }
      }

      heldOrders.splice(idx, 1);
      saveHeldOrders();

      renderPosCart();
      renderPosMenu();
      if (window.innerWidth <= 860) {
        togglePosMobileView('cart');
      }
      showToast("Transaksi dibuka kembali!");
    }

    function deleteHeldOrder(id) {
      const confirmDel = confirm("Apakah Anda yakin ingin menghapus transaksi sementara ini?");
      if (!confirmDel) return;
      heldOrders = heldOrders.filter(h => h.id !== id);
      saveHeldOrders();
      showToast("Transaksi sementara dihapus!");
    }

    function renderHeldOrders() {
      const wrapper = document.getElementById('posHeldOrdersWrapper');
      if (!wrapper) return;
      if (heldOrders.length === 0) {
        wrapper.innerHTML = `<div style="text-align:center; padding:10px 0; color:#8c7365; font-size:11px;">Tidak ada transaksi hold.</div>`;
        return;
      }

      wrapper.innerHTML = heldOrders.map(h => {
        const totalItems = h.items.reduce((s, i) => s + i.qty, 0);
        const totalCost = h.items.reduce((s, i) => s + i.subtotal, 0);
        return `
          <div class="held-order-card" style="background:#fcfbf9; border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:12px;">
              <strong style="color:var(--coffee);">${esc(h.label)}</strong>
              <div style="color:#8c7365; font-size:10px; margin-top:2px;">
                ${totalItems} item · ${rupiah(totalCost)}
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button onclick="resumeHeldOrder('${h.id}')" style="border:0; background:#efe0c8; color:#6b4329; font-size:10px; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:700;">
                Buka
              </button>
              <button onclick="deleteHeldOrder('${h.id}')" style="border:0; background:#faebe8; color:var(--danger); font-size:10px; padding:4px 8px; border-radius:6px; cursor:pointer;">
                Hapus
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // ---------------- LOAD ORDER TO POS FOR ADJUSTMENTS / EDIT ----------------
    function loadOrderToPos(invoiceNo) {
      const order = orders.find(o => o.invoiceNo === invoiceNo);
      if (!order) {
        showToast("Transaksi " + invoiceNo + " tidak ditemukan", true);
        return;
      }

      if (posCart.length > 0 && posEditingInvoice !== invoiceNo) {
        if (!confirm("Keranjang kasir aktif tidak kosong. Apakah Anda ingin MENGGANTIKAN keranjang dengan transaksi " + invoiceNo + "?")) {
          return;
        }
      }

      switchTab('pos');
      posEditingInvoice = invoiceNo;

      // Populate POS Cart items
      if (Array.isArray(order.items) && order.items.length > 0) {
        posCart = order.items.map(it => {
          let opts = [];
          if (Array.isArray(it.options)) {
            opts = it.options;
          } else if (it.optionsText) {
            opts = it.optionsText.split(',').map(part => {
              const [g, o] = part.split(':').map(s => s.trim());
              return { group: g || 'Varian', option: o || g };
            });
          }
          return {
            uid: 'edit-' + Math.random().toString(36).substring(2, 9),
            productId: it.productId,
            name: it.name,
            unitPrice: Number(it.unitPrice) || Number(it.basePrice) || 0,
            qty: Number(it.qty) || 1,
            subtotal: Number(it.subtotal) || ((Number(it.unitPrice) || 0) * (Number(it.qty) || 1)),
            options: opts,
            itemNote: it.itemNote || '',
            checked: true
          };
        });
      } else {
        posCart = [];
      }

      // Populate form fields
      document.getElementById('posCustomerName').value = (order.customerName === '-' ? '' : order.customerName) || '';
      document.getElementById('posCustomerPhone').value = (order.customerPhone === '-' ? '' : order.customerPhone) || '';
      document.getElementById('posOrderNotes').value = order.notes || '';
      document.getElementById('posPaymentMethod').value = order.paymentMethod || 'QRIS';
      togglePosPayment(order.paymentMethod || 'QRIS');

      // Set datetime
      const rawDt = order.date || order.createdAt;
      const dtInput = document.getElementById('posOrderDateTime');
      if (dtInput) {
        dtInput.value = rawDt ? getLocalDateTimeInputValue(new Date(rawDt)) : getLocalDateTimeInputValue(new Date());
      }

      // Set status radio
      const isCompleted = String(order.status || '').toLowerCase() === 'completed';
      if (isCompleted) {
        const r1 = document.getElementById('posOptCompleted');
        if (r1) r1.checked = true;
      } else {
        const r2 = document.getElementById('posOptPending');
        if (r2) r2.checked = true;
      }
      handlePosStatusOptionChange();

      // Show edit banner
      const banner = document.getElementById('posEditModeBanner');
      const badge = document.getElementById('posEditingInvoiceBadge');
      if (banner) banner.style.display = 'block';
      if (badge) badge.innerText = invoiceNo;

      // Update submit button styling
      const submitBtn = document.getElementById('posSubmitOrderBtn');
      if (submitBtn) {
        submitBtn.className = 'btn btn-warning';
        submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Penyesuaian (${invoiceNo})`;
      }

      renderPosCart();
      renderPosMenu();
      renderPosRecentTransactions();

      if (window.innerWidth <= 860) {
        togglePosMobileView('cart');
      }

      showToast(`Transaksi ${invoiceNo} siap disesuaikan`);
    }

    function cancelPosEditMode() {
      if (!posEditingInvoice) return;
      posEditingInvoice = null;
      const banner = document.getElementById('posEditModeBanner');
      if (banner) banner.style.display = 'none';
      posCart = [];
      document.getElementById('posCustomerName').value = '';
      document.getElementById('posCustomerPhone').value = '';
      document.getElementById('posOrderNotes').value = '';
      setPosDateTimeNow();
      handlePosStatusOptionChange();
      renderPosCart();
      renderPosMenu();
      renderPosRecentTransactions();
      showToast("Mode penyesuaian transaksi dibatalkan");
    }

    // ---------------- RECENT TRANSACTIONS IN POS ----------------
    function renderPosRecentTransactions() {
      const wrapper = document.getElementById('posRecentTransactionsWrapper');
      if (!wrapper) return;

      if (!Array.isArray(orders) || orders.length === 0) {
        wrapper.innerHTML = `<div style="text-align:center; padding:12px; color:#8c7365; font-size:11px;">Belum ada riwayat transaksi.</div>`;
        return;
      }

      // Take latest 5 transactions
      const recentList = orders.slice(0, 5);

      wrapper.innerHTML = recentList.map(o => {
        const rawDate = o.date || o.createdAt;
        const timeStr = rawDate ? new Date(rawDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
        const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '';
        const isCompleted = String(o.status || '').toLowerCase() === 'completed';
        const isCancelled = String(o.status || '').toLowerCase() === 'cancelled';
        
        let statusBadge = `<span style="font-size:10px; font-weight:700; color:var(--success); background:var(--success-bg); padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-check"></i> Selesai</span>`;
        if (isCancelled) {
          statusBadge = `<span style="font-size:10px; font-weight:700; color:var(--danger); background:#faebe8; padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-xmark"></i> Batal</span>`;
        } else if (!isCompleted) {
          statusBadge = `<span style="font-size:10px; font-weight:700; color:#b45309; background:#fef3c7; padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-clock"></i> Pending</span>`;
        }

        const isBeingEdited = posEditingInvoice === o.invoiceNo;
        const cardBg = isBeingEdited ? '#fff8e1' : '#fcfbf9';
        const cardBorder = isBeingEdited ? '1.5px solid #ffb300' : '1px solid var(--border)';

        return `
          <div style="background:${cardBg}; border:${cardBorder}; border-radius:10px; padding:9px 10px; font-size:11px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-weight:800; color:var(--coffee);">${o.invoiceNo}</span>
              ${statusBadge}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; color:#8c7365; margin-bottom:6px;">
              <span><b>${o.customerName || '-'}</b> · ${o.paymentMethod || 'QRIS'}</span>
              <span><i class="fa-regular fa-clock" style="font-size:10px;"></i> ${dateStr} ${timeStr}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #e8d8c3; padding-top:6px;">
              <span style="font-weight:800; color:var(--coffee); font-size:12px;">${rupiah(o.netSales || o.total)}</span>
              <div style="display:flex; gap:5px;">
                <button type="button" onclick="showOrderInvoice('${o.invoiceNo}')" style="background:#fff; border:1px solid var(--border); padding:3px 7px; border-radius:6px; font-size:10px; color:#5c4333; cursor:pointer; font-weight:600;" title="Buka Struk">
                  <i class="fa-solid fa-receipt"></i> Struk
                </button>
                <button type="button" onclick="loadOrderToPos('${o.invoiceNo}')" style="background:#efe0c8; border:1px solid #d9b98c; padding:3px 7px; border-radius:6px; font-size:10px; color:#6b4329; cursor:pointer; font-weight:700;" title="Muat & Edit Transaksi ini">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button type="button" onclick="deleteOrder('${o.invoiceNo}')" style="background:#fff0f0; border:1px solid #f5c2c7; padding:3px 7px; border-radius:6px; font-size:10px; color:var(--danger); cursor:pointer; font-weight:700;" title="Hapus Transaksi ${o.invoiceNo}">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }