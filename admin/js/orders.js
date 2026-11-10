// ---------------- QRIS GENERATOR ALGORITHM ----------------
    function parseTLV(s) {
      let a = [], i = 0;
      while (i < s.length) {
        let id = s.substr(i, 2), len = parseInt(s.substr(i + 2, 2), 10), val = s.substr(i + 4, len);
        a.push({ id, len, val });
        i += 4 + len;
      }
      return a;
    }
    function buildTLV(a) { return a.map(x => x.id + String(x.val.length).padStart(2, '0') + x.val).join(''); }
    function crc16ccitt(str) {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
      return crc.toString(16).toUpperCase().padStart(4, '0');
    }
    function qrisDynamic(amount) {
      const base = QRIS_STATIC.replace(/6304[0-9A-F]{4}$/i, ''), arr = parseTLV(base), out = [];
      let has54 = false;
      arr.forEach(x => {
        if (x.id === '01') x.val = '12';
        if (x.id === '54') { x.val = String(amount); has54 = true; }
        if (x.id === '62') return;
        out.push(x);
        if (x.id === '53' && !has54) { out.push({ id: '54', val: String(amount) }); has54 = true; }
      });
      const noCrc = buildTLV(out) + '6304';
      return noCrc + crc16ccitt(noCrc);
    }

    // ---------------- INVOICE & RECEIPT RENDERER ----------------
    function showAdminInvoiceModal(order) {
      activeInvoiceOrder = order;

      // Render receipt text inside .invoicebox
      const box = document.getElementById('adminInvoiceBox');
      const orderDateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');
      const isCompleted = String(order.status || '').toLowerCase() === 'completed';
      const displayStatus = isCompleted ? 'LUNAS / SELESAI' : (order.status || 'Pending');
      const statusColor = isCompleted ? '#2e7d32' : (String(order.status || '').toLowerCase() === 'cancelled' ? '#c62828' : '#b45309');

      const itemsRowsHtml = order.items.map(it => `
        <div class="receipt-row">
          <span>${it.name} x${it.qty}${it.optionsText ? `<br><small style="color:#666;">${it.optionsText}</small>` : ''}${it.itemNote ? `<br><small style="color:red;">Note: ${it.itemNote}</small>` : ''}</span>
          <b>${rupiah(it.subtotal || (it.qty * it.unitPrice))}</b>
        </div>
      `).join('');

      box.innerHTML = `
        <h3>DjaCo Coffee</h3>
        <div class="receipt-meta">
          Invoice: <b>${order.invoiceNo}</b><br>
          ${orderDateStr}<br>
          Pembeli: ${order.customerName}<br>
          Status: <b style="color:${statusColor};">${displayStatus}</b>
        </div>
        
        ${itemsRowsHtml}
        
        <div class="receipt-row">
          <span>Subtotal</span>
          <b>${rupiah(order.total)}</b>
        </div>
        <div class="receipt-row">
          <span>Metode Pembayaran</span>
          <b>${order.paymentMethod}</b>
        </div>
        <div class="receipt-row" style="border-bottom:2px dashed #000; font-weight:bold;">
          <span>TOTAL</span>
          <b>${rupiah(order.total)}</b>
        </div>
        ${order.notes ? `<div style="font-size:10px; margin-top:8px; font-style:italic;">Catatan: ${order.notes}</div>` : ''}
        <div class="receipt-meta" style="margin-top:15px; font-weight:bold;">
          Terima Kasih Atas Kunjungan Anda!
        </div>
      `;

      // Render QRIS if Payment Method is QRIS
      const qrBox = document.getElementById('adminInvoiceQrBox');
      const downloadBtn = document.getElementById('adminDownloadQrisBtn');

      if (order.paymentMethod === 'QRIS') {
        qrBox.style.display = 'block';
        downloadBtn.style.display = 'block';

        const qrisPayload = qrisDynamic(order.total);
        const qrUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(qrisPayload) + '&size=520&margin=1';

        document.getElementById('adminQrisImg').src = qrUrl;
        document.getElementById('adminQrisAmount').innerText = rupiah(order.total);
      } else {
        qrBox.style.display = 'none';
        downloadBtn.style.display = 'none';
      }

      // Setup WA receipt link
      const waText = buildWaOrderLines(order).join('\n');
      document.getElementById('adminWaLink').href = 'https://wa.me/' + (order.customerPhone !== '-' ? order.customerPhone.replace(/[^0-9]/g, '') : '') + '?text=' + encodeURIComponent(waText);

      document.getElementById('invoiceModalOverlay').classList.add('show');
    }

    function buildWaOrderLines(order) {
      const isCompleted = String(order.status || '').toLowerCase() === 'completed';
      const lines = [
        `Halo ${order.customerName}, ini struk pembelian Anda di DjaCo Coffee:`,
        '',
        `No Invoice: ${order.invoiceNo}`,
        `Status: ${isCompleted ? 'LUNAS / SELESAI' : (order.status || 'Pending')}`,
        `Metode: ${order.paymentMethod}`,
        ''
      ];
      order.items.forEach(it => {
        lines.push(`- ${it.name} x${it.qty}${it.optionsText ? ` (${it.optionsText})` : ''} = ${rupiah(it.subtotal || (it.qty * it.unitPrice))}`);
      });
      lines.push('', `Total: ${rupiah(order.total)}`);
      if (order.notes) lines.push('', `Catatan: ${order.notes}`);
      lines.push('', 'Terima kasih sudah memesan! ☕');
      return lines;
    }

    function closeInvoiceModal() {
      document.getElementById('invoiceModalOverlay').classList.remove('show');
      activeInvoiceOrder = null;
    }

    async function downloadAdminQris() {
      if (!activeInvoiceOrder || activeInvoiceOrder.paymentMethod !== 'QRIS') return;

      const qrisPayload = qrisDynamic(activeInvoiceOrder.total);
      const qrUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(qrisPayload) + '&size=520&margin=1';

      try {
        // Quietly log download to Sheets
        await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'markQrisDownloaded',
            invoiceNo: activeInvoiceOrder.invoiceNo,
            transactionId: activeInvoiceOrder.transactionId
          })
        });

        const res = await fetch(qrUrl);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `QRIS-DjaCo-${activeInvoiceOrder.invoiceNo}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("QRIS berhasil disimpan");
      } catch (e) {
        window.open(qrUrl, '_blank');
      }
    }

    // Trigger invoice print display for historical records
    function showOrderInvoice(invoiceNo) {
      const order = orders.find(o => o.invoiceNo === invoiceNo);
      if (order) {
        // Adjust localized fields to prevent map crashes
        const mappedOrder = {
          ...order,
          createdAt: order.date,
          total: order.netSales
        };
        showAdminInvoiceModal(mappedOrder);
      }
    }

    // ---------------- ORDERS TAB RENDERERS ----------------
    function renderOrdersList(ordersToRender = orders) {
      const container = document.getElementById('orders-list-container');
      if (ordersToRender.length === 0) {
        container.innerHTML = `
          <div class="panel" style="text-align: center; color: #8c7365; padding: 40px;">
            <i class="fa-solid fa-circle-question" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
            <p>Tidak ada transaksi yang cocok.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = ordersToRender.map(o => {
        const rawDate = o.date || o.createdAt;
        const orderDateStr = rawDate ? new Date(rawDate).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '-';

        let statusClass = 'status-pending';
        let actionButtonsHtml = '';
        const currentStatus = String(o.status || 'Pending').toLowerCase();

        if (currentStatus === 'pending') {
          statusClass = 'status-pending';
          actionButtonsHtml = `
            <button class="btn btn-warning btn-sm" onclick="changeStatus('${o.invoiceNo}', 'Processed')">Proses Order</button>
            <button class="btn btn-danger btn-sm" onclick="changeStatus('${o.invoiceNo}', 'Cancelled')">Batalkan</button>
          `;
        } else if (currentStatus === 'processed' || currentStatus === 'qr downloaded') {
          statusClass = 'status-processed';
          actionButtonsHtml = `
            <button class="btn btn-success btn-sm" onclick="changeStatus('${o.invoiceNo}', 'Completed')">Selesai</button>
            <button class="btn btn-danger btn-sm" onclick="changeStatus('${o.invoiceNo}', 'Cancelled')">Batalkan</button>
          `;
        } else if (currentStatus === 'completed' || currentStatus === 'selesai') {
          statusClass = 'status-completed';
        } else if (currentStatus === 'cancelled' || currentStatus === 'batal') {
          statusClass = 'status-cancelled';
        }

        const itemsHtml = o.items.map(it => `
          <div class="order-item-row">
            <div>
              <div class="order-item-name">${it.name} <span style="color:#8c7365;">x${it.qty}</span></div>
              ${it.optionsText ? `<div class="order-item-desc"><i class="fa-solid fa-tag"></i> ${it.optionsText}</div>` : ''}
              ${it.itemNote ? `<div class="order-item-desc" style="color:var(--danger);"><i class="fa-regular fa-comment"></i> Catatan: ${it.itemNote}</div>` : ''}
            </div>
            <div style="font-weight: 700; color: var(--coffee);">${rupiah(it.subtotal)}</div>
          </div>
        `).join('');

        return `
          <div class="order-card" id="order-card-${o.invoiceNo}">
            <div class="order-card-header">
              <div class="order-meta-info">
                <h3>Invoice: ${o.invoiceNo}</h3>
                <div class="order-date"><i class="fa-regular fa-calendar"></i> ${orderDateStr}</div>
              </div>
              <span class="status-badge ${statusClass}">${o.status}</span>
            </div>

            <div class="customer-info-row">
              <span>Customer: <b>${o.customerName}</b></span>
              <span>WhatsApp: <b><a href="https://wa.me/${o.customerPhone.replace(/[^0-9]/g, '')}" target="_blank" style="color: var(--success); text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> ${o.customerPhone}</a></b></span>
              <span>Metode: <b>${o.paymentMethod}</b></span>
            </div>

            <div class="order-items-list">
              ${itemsHtml || '<div style="font-size:12px; color:#8c7365; font-style:italic;">Detail item tidak tersedia</div>'}
            </div>

            ${o.notes ? `<div class="order-notes"><b>Catatan Pesanan:</b> ${o.notes}</div>` : ''}

            <div class="order-card-footer">
              <div class="order-total-price">
                <span>Total Belanja:</span>${rupiah(o.netSales)}
              </div>
              <div class="order-actions-buttons">
                <button class="btn btn-outline btn-sm" onclick="showOrderInvoice('${o.invoiceNo}')"><i class="fa-solid fa-receipt"></i> Struk / QRIS</button>
                ${actionButtonsHtml}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }



    function filterOrders() {
      const q = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();
      const dateFilter = document.getElementById('orderDateFilter')?.value || '';

      const filtered = orders.filter(o => {
        const matchQ = !q ||
          (o.invoiceNo || '').toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerPhone || '').toLowerCase().includes(q);

        let matchDate = true;
        if (dateFilter) {
          const rawDate = String(o.date || o.createdAt || '');
          matchDate = rawDate.startsWith(dateFilter);
        }

        return matchQ && matchDate;
      });
      renderOrdersList(filtered);
    }

    function clearOrderDateFilter() {
      const el = document.getElementById('orderDateFilter');
      if (el) el.value = '';
      filterOrders();
    }

    async function changeStatus(invoiceNo, newStatus) {
      if (!confirm(`Ubah status invoice ${invoiceNo} menjadi ${newStatus}?`)) return;

      const card = document.getElementById(`order-card-${invoiceNo}`);
      if (card) card.style.opacity = '0.5';

      try {
        await apiPost('updateorderstatus', { invoiceNo, status: newStatus });
        showToast(`Invoice ${invoiceNo} berhasil di-update ke ${newStatus}`);
        await reloadData();
      } catch (err) {
        console.error(err);
        showToast("Gagal memperbarui status order", true);
        if (card) card.style.opacity = '1';
      }
    }