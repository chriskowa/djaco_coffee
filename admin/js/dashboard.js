// ---------------- DASHBOARD TAB RENDERERS ----------------
    function renderDashboardOverview() {
      if (!reports) return;

      const revenue = reports.monthSales !== undefined ? Number(reports.monthSales) : Number(reports.totalRevenue || 0);
      const profit = reports.monthNetProfit !== undefined ? Number(reports.monthNetProfit) : Number(reports.totalProfit || 0);
      const ordersCount = reports.todayOrders !== undefined ? Number(reports.todayOrders) : Number(reports.totalOrders || 0);

      document.getElementById('stat-revenue').innerText = rupiah(revenue);
      document.getElementById('stat-profit').innerText = rupiah(profit);
      document.getElementById('stat-orders').innerText = ordersCount;

      const avg = ordersCount > 0 ? (revenue / ordersCount) : 0;
      document.getElementById('stat-avg').innerText = rupiah(avg);

      // Render low stock list for ingredients or products
      const lowStockList = document.getElementById('low-stock-list');
      const lowIngredients = ingredients.filter(i => Number(i.stock) <= Number(i.minStock));
      const lowProducts = products.filter(p => Number(p.stock) <= 10);

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
        lowStockList.innerHTML = `<li style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Semua stok aman.</li>`;
      }

      // Render top products
      const topProductsTableBody = document.querySelector('#top-products-table tbody');
      if (reports.topProducts && reports.topProducts.length > 0) {
        topProductsTableBody.innerHTML = reports.topProducts.map(p => `
          <tr>
            <td><b>${p.name}</b></td>
            <td style="text-align: right; font-weight: 700; color: var(--coffee);">${p.qty}x</td>
          </tr>
        `).join('');
      } else {
        topProductsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color: #927568;">Belum ada penjualan.</td></tr>`;
      }

      // Render item sales report per item (Lengkap)
      const reportTableBody = document.querySelector('#item-sales-report-table tbody');
      if (reports.itemSales && reports.itemSales.length > 0) {
        reportTableBody.innerHTML = reports.itemSales.map((p, idx) => `
          <tr>
            <td style="width: 50px;">${idx + 1}</td>
            <td><b>${p.name}</b></td>
            <td style="text-align: center; font-weight: 700;">${p.qty} unit</td>
            <td style="text-align: right; font-weight: 700; color: var(--coffee);">${rupiah(p.revenue)}</td>
          </tr>
        `).join('');
      } else {
        reportTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #927568;">Belum ada data penjualan item.</td></tr>`;
      }

      renderSalesChart();
    }

    function renderSalesChart() {
      if (!reports || !reports.dailySales) return;
      const ctx = document.getElementById('salesChart').getContext('2d');

      const dates = Object.keys(reports.dailySales);
      const recentDates = dates.slice(-15);
      const revenueData = recentDates.map(d => reports.dailySales[d].revenue);
      const profitData = recentDates.map(d => reports.dailySales[d].profit);

      if (salesChartInstance) {
        salesChartInstance.destroy();
      }

      salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: recentDates.map(d => {
            const parts = d.split('-');
            return `${parts[2]}/${parts[1]}`;
          }),
          datasets: [
            {
              label: 'Omset (Revenue)',
              data: revenueData,
              borderColor: '#c59b62',
              backgroundColor: 'rgba(197, 155, 98, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              fill: true
            },
            {
              label: 'Laba Bersih (Net Profit)',
              data: profitData,
              borderColor: '#49633c',
              backgroundColor: 'rgba(73, 99, 60, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              fill: true
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
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return 'Rp' + (value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : (value / 1000).toFixed(0) + 'k');
                }
              }
            }
          }
        }
      });
    }