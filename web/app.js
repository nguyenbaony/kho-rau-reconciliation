// Kho Rau Reconciliation & Datapay Frontend Engine
document.addEventListener('DOMContentLoaded', async () => {
  let allRecords = window.RECON_RECORDS || [];
  let summary = window.RECON_SUMMARY || null;

  // Fallback: If not loaded via script tag, fetch JSON directly
  if (!allRecords || allRecords.length === 0) {
    try {
      const [recRes, sumRes] = await Promise.all([
        fetch('data/reconciliation_records.json'),
        fetch('data/datapay_summary.json')
      ]);
      if (recRes.ok) allRecords = await recRes.json();
      if (sumRes.ok) summary = await sumRes.json();
    } catch (err) {
      console.warn('Fallback fetch error:', err);
    }
  }

  // Clean data: Filter out any header remnants
  allRecords = allRecords.filter(r => r.sku && r.sku !== 'Mã hàng' && r.to_order !== 'CLV4');

  let currentStep = 'all';
  let searchQuery = '';
  let selectedDate = '';
  let selectedStore = '';
  let selectedError = '';
  let selectedStatus = '';
  let dateRange = { from: '', to: '' };

  let currentPage = 1;
  const pageSize = 50;

  // Format Helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatNumber = (val, decimals = 2) => {
    return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(val || 0);
  };

  // Parse date string (supports MM/DD/YYYY and YYYY-MM-DD)
  const parseDate = (dStr) => {
    if (!dStr) return null;
    const m = String(dStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    const m2 = String(dStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) return new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
    return null;
  };

  const toIsoDate = (dStr) => {
    const d = parseDate(dStr);
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateVN = (dStr) => {
    const d = parseDate(dStr);
    if (!d || isNaN(d.getTime())) return dStr || '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // 1. Update KPI Dashboard (Dynamic based on filtered items or entire dataset)
  const updateKPIs = (items = null) => {
    const list = items !== null ? items : allRecords;
    let totalLoss = 0;
    let totalWarehouse = 0;
    let totalStore = 0;
    let totalUndetermined = 0;

    list.forEach(item => {
      totalLoss += (Number(item.loss_value) || 0);
      totalWarehouse += (Number(item.warehouse_penalty) || 0);
      totalStore += (Number(item.store_penalty) || 0);
      totalUndetermined += (Number(item.undetermined_value) || 0);
    });

    const elTotal = document.getElementById('kpi-total-orders');
    const elLoss = document.getElementById('kpi-loss-value');
    const elWh = document.getElementById('kpi-warehouse-val');
    const elStore = document.getElementById('kpi-store-val');
    const elUndet = document.getElementById('kpi-undetermined-val');

    if (elTotal) elTotal.textContent = formatNumber(list.length, 0);
    if (elLoss) elLoss.textContent = formatCurrency(totalLoss);
    if (elWh) elWh.textContent = formatCurrency(totalWarehouse);
    if (elStore) elStore.textContent = formatCurrency(totalStore);
    if (elUndet) elUndet.textContent = formatCurrency(totalUndetermined);
  };

  // 1b. Populate Date Options
  const populateDates = () => {
    const dateSelect = document.getElementById('filter-date');
    if (!dateSelect) return;
    const dateSet = new Set();
    allRecords.forEach(r => {
      if (r.transfer_date && r.transfer_date !== 'Tổng GT' && r.transfer_date.includes('/')) {
        dateSet.add(r.transfer_date);
      }
    });

    const sortedDates = Array.from(dateSet).sort((a, b) => {
      const da = parseDate(a);
      const db = parseDate(b);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    dateSelect.innerHTML = '<option value="">Tất cả các ngày</option>';
    sortedDates.forEach(dStr => {
      const opt = document.createElement('option');
      opt.value = dStr;
      opt.textContent = `Ngày ${formatDateVN(dStr)}`;
      dateSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '📅 Khoảng ngày tùy chọn...';
    dateSelect.appendChild(customOpt);
  };

  // 2. Populate Store Options
  const populateStores = () => {
    const storeSelect = document.getElementById('filter-store');
    const storeMap = new Map();
    allRecords.forEach(r => {
      if (r.store_id && !storeMap.has(r.store_id) && r.store_id !== 'ID ST') {
        storeMap.set(r.store_id, r.store_name);
      }
    });

    storeSelect.innerHTML = '<option value="">Tất cả siêu thị</option>';
    Array.from(storeMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${id} - ${(name || '').replace('KFM_HCM_', '').replace('KFM_BDU_', '')}`;
      storeSelect.appendChild(opt);
    });
  };

  // 3. Filter Records
  const filterRecords = () => {
    return allRecords.filter(item => {
      // Step Filter
      if (currentStep === 'step1') {
        // Step 1: Điều chuyển TO/PT
        if (!item.to_order && !item.pt_transfer) return false;
      } else if (currentStep === 'step2') {
        // Step 2: Có chênh lệch hoặc hao hụt
        if (item.qty_diff === 0 && item.natural_loss_qty === 0) return false;
      } else if (currentStep === 'step3') {
        // Step 3: Có phản hồi hoặc claim từ DC / Store
        if (!item.dc_confirmation && !item.image_link && !item.dc_note && !item.kfm_feedback) return false;
      } else if (currentStep === 'step4') {
        // Step 4: Có lỗi xác định trách nhiệm
        if (!item.responsible_party && item.warehouse_penalty === 0 && item.store_penalty === 0) return false;
      } else if (currentStep === 'step5') {
        // Step 5: Bảng chốt Datapay (Có số tiền phạt phát sinh)
        if (item.warehouse_penalty === 0 && item.store_penalty === 0 && item.loss_value === 0) return false;
      }

      // Date Filter
      if (selectedDate && selectedDate !== '__custom__') {
        if (item.transfer_date !== selectedDate) return false;
      } else if (dateRange.from || dateRange.to) {
        const itemIso = toIsoDate(item.transfer_date);
        if (itemIso) {
          if (dateRange.from && itemIso < dateRange.from) return false;
          if (dateRange.to && itemIso > dateRange.to) return false;
        }
      }

      // Store Filter
      if (selectedStore && item.store_id !== selectedStore) return false;

      // Error Filter
      if (selectedError && !item.error_type.includes(selectedError)) return false;

      // Status Filter
      if (selectedStatus && !item.status.includes(selectedStatus) && !item.dc_confirmation.includes(selectedStatus)) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchName = (item.product_name || '').toLowerCase().includes(q);
        const matchStore = (item.store_name || '').toLowerCase().includes(q);
        const matchTo = (item.to_order || '').toLowerCase().includes(q);
        const matchPt = (item.pt_transfer || '').toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchStore && !matchTo && !matchPt) return false;
      }

      return true;
    });
  };

  // Chart.js Instances
  let chartErrorInstance = null;
  let chartCategoryInstance = null;
  let chartStoreInstance = null;
  let chartProductInstance = null;

  // 3b. Update Analytics Charts & CDC Matrix
  const updateAnalyticsCharts = (items) => {
    if (typeof Chart === 'undefined') return;
    const list = items || allRecords;

    const errorMap = {};
    const categoryMap = {};
    const storeMap = {};
    const productMap = {};

    let lossVal = 0, lossQty = 0, lossCount = 0;
    let dcVal = 0, dcQty = 0, dcCount = 0;
    let stVal = 0, stQty = 0, stCount = 0;
    let cxdVal = 0, cxdQty = 0, cxdCount = 0;

    list.forEach(item => {
      const err = item.error_type || 'Chưa phân loại';
      const cat = (item.category_v2 || 'KHÁC').replace('2.', '');
      const store = item.store_id || 'Chưa rõ';
      const prod = item.product_name || item.sku;
      const itemVal = (Number(item.warehouse_penalty) || 0) + (Number(item.store_penalty) || 0) + (Number(item.loss_value) || 0) + (Number(item.undetermined_value) || 0);
      const itemQty = Math.abs(Number(item.qty_diff) || 0);

      // Group Error
      errorMap[err] = (errorMap[err] || 0) + itemVal;

      // Group Category
      categoryMap[cat] = (categoryMap[cat] || 0) + itemVal;

      // Group Store
      storeMap[store] = (storeMap[store] || 0) + itemVal;

      // Group Product
      productMap[prod] = (productMap[prod] || 0) + itemVal;

      // CDC Matrix grouping
      if (item.warehouse_penalty > 0 || err.includes('DC')) {
        dcVal += (Number(item.warehouse_penalty) || itemVal);
        dcQty += itemQty;
        dcCount++;
      } else if (item.store_penalty > 0 || err.includes('ST')) {
        stVal += (Number(item.store_penalty) || itemVal);
        stQty += itemQty;
        stCount++;
      } else if (item.loss_value > 0 || err.includes('Hao hụt')) {
        lossVal += (Number(item.loss_value) || itemVal);
        lossQty += itemQty;
        lossCount++;
      } else {
        cxdVal += (Number(item.undetermined_value) || itemVal);
        cxdQty += itemQty;
        cxdCount++;
      }
    });

    // Populate CDC Datapay Matrix Table
    const matrixTbody = document.getElementById('tbody-cdc-matrix');
    if (matrixTbody) {
      const grandTotal = (dcVal + lossVal + stVal + cxdVal) || 1;
      const grandQty = (dcQty + lossQty + stQty + cxdQty);
      const grandCount = (dcCount + lossCount + stCount + cxdCount);
      const calcPct = (v) => ((v / grandTotal) * 100).toFixed(1) + '%';

      matrixTbody.innerHTML = `
        <tr>
          <td><span class="badge badge-rose" style="font-size: 0.8rem;">🏭 Phạt Kho Rau (DC)</span></td>
          <td style="color: var(--text-secondary);">DC giao thiếu, Pick sai mã hàng, dập nát do bảo quản kho</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(dcCount, 0)} dòng</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(dcQty, 2)}</td>
          <td class="text-right" style="font-weight: 700; color: #f87171;">${formatCurrency(dcVal)}</td>
          <td class="text-right" style="font-weight: 700; color: #f87171;">${calcPct(dcVal)}</td>
          <td><span class="badge badge-rose">Kho Rau (DC)</span></td>
        </tr>
        <tr>
          <td><span class="badge badge-amber" style="font-size: 0.8rem;">📉 Hao Hụt Tự Nhiên</span></td>
          <td style="color: var(--text-secondary);">Bay hơi tự nhiên theo định mức quy định (2.5% Trái cây, 3.0% Rau củ)</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(lossCount, 0)} dòng</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(lossQty, 2)}</td>
          <td class="text-right" style="font-weight: 700; color: #fbbf24;">${formatCurrency(lossVal)}</td>
          <td class="text-right" style="font-weight: 700; color: #fbbf24;">${calcPct(lossVal)}</td>
          <td><span class="badge badge-amber">Định Mức Kho</span></td>
        </tr>
        <tr>
          <td><span class="badge badge-purple" style="font-size: 0.8rem;">🏪 Phạt Siêu Thị (ST)</span></td>
          <td style="color: var(--text-secondary);">ST kiểm sai quy trình giao nhận, nhập thiếu, tự làm hỏng tại ST</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(stCount, 0)} dòng</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(stQty, 2)}</td>
          <td class="text-right" style="font-weight: 700; color: #c084fc;">${formatCurrency(stVal)}</td>
          <td class="text-right" style="font-weight: 700; color: #c084fc;">${calcPct(stVal)}</td>
          <td><span class="badge badge-purple">Siêu Thị (ST)</span></td>
        </tr>
        <tr>
          <td><span class="badge badge-cyan" style="font-size: 0.8rem;">❓ Lệch Chưa Xác Định</span></td>
          <td style="color: var(--text-secondary);">Khuất góc camera hoặc đang chờ biên bản đối soát giữa DC và GSM/RSM</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(cxdCount, 0)} dòng</td>
          <td class="text-right" style="font-weight: 600;">${formatNumber(cxdQty, 2)}</td>
          <td class="text-right" style="font-weight: 700; color: #38bdf8;">${formatCurrency(cxdVal)}</td>
          <td class="text-right" style="font-weight: 700; color: #38bdf8;">${calcPct(cxdVal)}</td>
          <td><span class="badge badge-cyan">Chờ Đối Soát</span></td>
        </tr>
        <tr style="background: rgba(255, 255, 255, 0.05); font-weight: 700;">
          <td colspan="2" style="color: #fff;">TỔNG CỘNG CHÊNH LỆCH & CHẾ TÀI</td>
          <td class="text-right" style="color: #38bdf8;">${formatNumber(grandCount, 0)} dòng</td>
          <td class="text-right" style="color: #38bdf8;">${formatNumber(grandQty, 2)}</td>
          <td class="text-right" style="color: #38bdf8; font-size: 0.95rem;">${formatCurrency(grandTotal)}</td>
          <td class="text-right" style="color: #38bdf8;">100.0%</td>
          <td><span class="badge badge-blue">Tổng Hợp CDC</span></td>
        </tr>
      `;
    }

    const palette = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];

    // 1. Render Chart Error
    const sortedErrors = Object.entries(errorMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const canvasError = document.getElementById('chart-error');
    if (canvasError) {
      if (chartErrorInstance) chartErrorInstance.destroy();
      chartErrorInstance = new Chart(canvasError, {
        type: 'doughnut',
        data: {
          labels: sortedErrors.map(x => x[0]),
          datasets: [{
            data: sortedErrors.map(x => x[1]),
            backgroundColor: palette.slice(0, sortedErrors.length),
            borderWidth: 2,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
              }
            }
          }
        }
      });
    }

    // 2. Render Chart Category
    const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const canvasCategory = document.getElementById('chart-category');
    if (canvasCategory) {
      if (chartCategoryInstance) chartCategoryInstance.destroy();
      chartCategoryInstance = new Chart(canvasCategory, {
        type: 'pie',
        data: {
          labels: sortedCats.map(x => x[0]),
          datasets: [{
            data: sortedCats.map(x => x[1]),
            backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'],
            borderWidth: 2,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
              }
            }
          }
        }
      });
    }

    // 3. Render Chart Stores (Top 10)
    const sortedStores = Object.entries(storeMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const canvasStore = document.getElementById('chart-store');
    if (canvasStore) {
      if (chartStoreInstance) chartStoreInstance.destroy();
      chartStoreInstance = new Chart(canvasStore, {
        type: 'bar',
        data: {
          labels: sortedStores.map(x => x[0]),
          datasets: [{
            label: 'Giá Trị Chênh Lệch & Phạt (VNĐ)',
            data: sortedStores.map(x => x[1]),
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', callback: (v) => formatCurrency(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` } }
          }
        }
      });
    }

    // 4. Render Chart Products (Top 10 SKUs)
    const sortedProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const canvasProduct = document.getElementById('chart-product');
    if (canvasProduct) {
      if (chartProductInstance) chartProductInstance.destroy();
      chartProductInstance = new Chart(canvasProduct, {
        type: 'bar',
        data: {
          labels: sortedProducts.map(x => x[0].length > 22 ? x[0].slice(0, 20) + '...' : x[0]),
          datasets: [{
            label: 'Giá Trị Thất Thoát (VNĐ)',
            data: sortedProducts.map(x => x[1]),
            backgroundColor: 'rgba(244, 63, 94, 0.75)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8', callback: (v) => formatCurrency(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 10 } }, grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.x)}` } }
          }
        }
      });
    }
  };

  // 4. Render Table Rows
  const renderTable = () => {
    const tbody = document.getElementById('recon-tbody');
    const filtered = filterRecords();

    // Dynamically update KPIs and Charts when filtered
    updateKPIs(filtered);
    updateAnalyticsCharts(filtered);

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    document.getElementById('page-counter').textContent = 
      `Đang hiển thị ${totalFiltered === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + pageSize, totalFiltered)} của ${formatNumber(totalFiltered, 0)} dòng đối soát`;
    document.getElementById('current-page-num').textContent = `${currentPage} / ${totalPages}`;

    tbody.innerHTML = '';

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 48px; color: var(--text-muted); font-size: 0.95rem;">Không tìm thấy dữ liệu đối soát phù hợp với bộ lọc hiện tại.</td></tr>`;
      return;
    }

    pageItems.forEach(item => {
      const tr = document.createElement('tr');

      let dcBadge = `<span class="badge badge-gray">Chưa duyệt</span>`;
      if ((item.dc_confirmation || '').includes('Đồng ý')) {
        dcBadge = `<span class="badge badge-green">${item.dc_confirmation}</span>`;
      } else if ((item.dc_confirmation || '').includes('Từ chối')) {
        dcBadge = `<span class="badge badge-rose">${item.dc_confirmation}</span>`;
      } else if ((item.dc_confirmation || '').includes('Kiểm tra')) {
        dcBadge = `<span class="badge badge-amber">${item.dc_confirmation}</span>`;
      }

      let respBadge = `<span class="badge badge-gray">CXD</span>`;
      if ((item.responsible_party || '').includes('Kho')) {
        respBadge = `<span class="badge badge-rose">Kho Rau</span>`;
      } else if ((item.responsible_party || '').includes('Siêu thị')) {
        respBadge = `<span class="badge badge-purple">Siêu Thị</span>`;
      } else if (item.loss_value > 0) {
        respBadge = `<span class="badge badge-amber">Hao Hụt</span>`;
      }

      let datapayDisplay = '0 ₫';
      let datapayClass = 'text-muted';
      if (item.warehouse_penalty > 0) {
        datapayDisplay = formatCurrency(item.warehouse_penalty);
        datapayClass = 'badge badge-rose';
      } else if (item.store_penalty > 0) {
        datapayDisplay = formatCurrency(item.store_penalty);
        datapayClass = 'badge badge-purple';
      } else if (item.loss_value > 0) {
        datapayDisplay = formatCurrency(item.loss_value);
        datapayClass = 'badge badge-amber';
      }

      tr.innerHTML = `
        <td>
          <div style="font-weight: 700; color: #fff;">${item.to_order || item.pt_transfer || item.id}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${formatDateVN(item.transfer_date)}</div>
        </td>
        <td>
          <span style="font-weight: 600;">${item.store_id}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.store_name}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #f1f5f9;">${item.product_name}</div>
          <span style="font-size: 0.72rem; color: var(--text-muted);">SKU: ${item.sku}</span>
        </td>
        <td>${item.unit}</td>
        <td class="text-right" style="font-weight: 500;">${formatNumber(item.qty_transferred, 2)}</td>
        <td class="text-right" style="font-weight: 500;">${formatNumber(item.qty_received, 2)}</td>
        <td class="text-right val-diff">${formatNumber(item.qty_diff, 3)}</td>
        <td><span style="font-size: 0.78rem;">${item.error_type || '—'}</span></td>
        <td>${dcBadge}</td>
        <td>${respBadge}</td>
        <td class="text-right">${formatCurrency(item.cost_price)}</td>
        <td class="text-right"><span class="${datapayClass}">${datapayDisplay}</span></td>
        <td>
          <button class="btn-detail" data-id="${item.id}">Chi Tiết</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Detail modal handlers
    document.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const found = allRecords.find(x => x.id === id);
        if (found) showDetailModal(found);
      });
    });
  };

  // 5. Show Detail Modal
  const showDetailModal = (item) => {
    const modal = document.getElementById('modal-claim-detail');
    document.getElementById('modal-item-title').textContent = `Chi Tiết Đối Soát: [${item.id}] ${item.product_name}`;

    let html = `
      <div class="modal-field"><strong>Mã Hàng / Tên:</strong> ${item.sku} - ${item.product_name} (${item.unit})</div>
      <div class="modal-field"><strong>Lệnh Chuyển (TO):</strong> ${item.to_order} | Phiếu PT: ${item.pt_transfer}</div>
      <div class="modal-field"><strong>Chi Nhánh:</strong> [${item.store_id}] ${item.store_name}</div>
      <div class="modal-field"><strong>Ngày Giao:</strong> ${item.transfer_date} | Người xử lý: ${item.handler || 'Hệ thống'}</div>
      <div class="modal-field"><strong>Số Lượng:</strong> Chuyển: ${item.qty_transferred} | Nhận: ${item.qty_received} | Lệch: <span style="color: #f87171; font-weight: bold;">${item.qty_diff}</span></div>
      <div class="modal-field"><strong>Hao Hụt Tự Nhiên:</strong> ${item.natural_loss_qty} (Trị giá: ${formatCurrency(item.loss_value)})</div>
      <div class="modal-field"><strong>Phân Loại Lỗi:</strong> ${item.error_type || 'Không ghi nhận'}</div>
      <div class="modal-field"><strong>DC Xác Nhận:</strong> ${item.dc_confirmation || 'Chưa phản hồi'} ${item.dc_note ? `(${item.dc_note})` : ''}</div>
      <div class="modal-field"><strong>KFM Phản Hồi:</strong> ${item.kfm_feedback || 'Chưa có ý kiến'}</div>
      <div class="modal-field"><strong>Đơn Vị Chịu Phạt:</strong> <span style="color: #38bdf8; font-weight: bold;">${item.responsible_party || 'Chưa phân định'}</span></div>
      <div class="modal-field"><strong>Datapay Kho Rau (DC):</strong> ${formatCurrency(item.warehouse_penalty)}</div>
      <div class="modal-field"><strong>Datapay Siêu Thị (ST):</strong> ${formatCurrency(item.store_penalty)}</div>
      <div class="modal-field"><strong>Bằng Chứng / Ảnh:</strong> ${item.image_link ? `<a href="${item.image_link}" target="_blank" style="color: var(--accent-cyan);">Xem hình ảnh camera</a>` : '<span style="color: var(--text-muted);">Không có link ảnh</span>'}</div>
    `;

    document.getElementById('modal-item-content').innerHTML = html;
    modal.classList.add('active');
  };

  // Close Modal
  document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('modal-claim-detail').classList.remove('active');
  });

  // View Mode Switcher
  const modeAnalyticsBtn = document.getElementById('mode-tab-analytics');
  const modeReconBtn = document.getElementById('mode-tab-recon');
  const modeTelegramBtn = document.getElementById('mode-tab-telegram');

  const analyticsView = document.getElementById('analytics-view-section');
  const reconView = document.getElementById('recon-view-section');
  const telegramView = document.getElementById('telegram-feed-section');

  const switchViewMode = (mode) => {
    [modeAnalyticsBtn, modeReconBtn, modeTelegramBtn].forEach(b => {
      if (b) b.classList.remove('active');
    });

    if (analyticsView) analyticsView.style.display = 'none';
    if (reconView) reconView.style.display = 'none';
    if (telegramView) telegramView.style.display = 'none';

    if (mode === 'analytics') {
      if (modeAnalyticsBtn) modeAnalyticsBtn.classList.add('active');
      if (analyticsView) analyticsView.style.display = 'block';
      const filtered = filterRecords();
      updateAnalyticsCharts(filtered);
    } else if (mode === 'recon') {
      if (modeReconBtn) modeReconBtn.classList.add('active');
      if (reconView) reconView.style.display = 'block';
      renderTable();
    } else if (mode === 'telegram') {
      if (modeTelegramBtn) modeTelegramBtn.classList.add('active');
      if (telegramView) telegramView.style.display = 'block';
      loadTelegramFeed();
    }
  };

  if (modeAnalyticsBtn) modeAnalyticsBtn.addEventListener('click', () => switchViewMode('analytics'));
  if (modeReconBtn) modeReconBtn.addEventListener('click', () => switchViewMode('recon'));
  if (modeTelegramBtn) modeTelegramBtn.addEventListener('click', () => switchViewMode('telegram'));

  // Step Navigation Tabs (Inside Reconciliation View)
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStep = btn.getAttribute('data-step');
      currentPage = 1;
      renderTable();
    });
  });

  // Filters & Search Listeners
  const inputSearch = document.getElementById('input-search');
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  // Date Filter Listeners
  const dateSelect = document.getElementById('filter-date');
  const dateRangeContainer = document.getElementById('date-range-container');
  const dateFromInput = document.getElementById('input-date-from');
  const dateToInput = document.getElementById('input-date-to');
  const btnApplyDateRange = document.getElementById('btn-apply-date-range');
  const btnCloseDateRange = document.getElementById('btn-close-date-range');

  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '__custom__') {
        if (dateRangeContainer) dateRangeContainer.style.display = 'flex';
      } else {
        if (dateRangeContainer) dateRangeContainer.style.display = 'none';
        selectedDate = val;
        dateRange = { from: '', to: '' };
        currentPage = 1;
        renderTable();
      }
    });
  }

  if (btnApplyDateRange) {
    btnApplyDateRange.addEventListener('click', () => {
      const fromVal = dateFromInput ? dateFromInput.value : '';
      const toVal = dateToInput ? dateToInput.value : '';
      dateRange = { from: fromVal, to: toVal };
      selectedDate = '__custom__';
      currentPage = 1;
      renderTable();
    });
  }

  if (btnCloseDateRange) {
    btnCloseDateRange.addEventListener('click', () => {
      if (dateRangeContainer) dateRangeContainer.style.display = 'none';
      if (dateSelect) dateSelect.value = '';
      selectedDate = '';
      dateRange = { from: '', to: '' };
      currentPage = 1;
      renderTable();
    });
  }

  const filterStore = document.getElementById('filter-store');
  if (filterStore) {
    filterStore.addEventListener('change', (e) => {
      selectedStore = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  const filterError = document.getElementById('filter-error');
  if (filterError) {
    filterError.addEventListener('change', (e) => {
      selectedError = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      selectedStatus = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  // Reset Filters Button
  const btnResetFilters = document.getElementById('btn-reset-filters');
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      searchQuery = '';
      selectedDate = '';
      selectedStore = '';
      selectedError = '';
      selectedStatus = '';
      dateRange = { from: '', to: '' };

      if (inputSearch) inputSearch.value = '';
      if (dateSelect) dateSelect.value = '';
      if (dateRangeContainer) dateRangeContainer.style.display = 'none';
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      if (filterStore) filterStore.value = '';
      if (filterError) filterError.value = '';
      if (filterStatus) filterStatus.value = '';

      currentPage = 1;
      renderTable();
    });
  }

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    const totalFiltered = filterRecords().length;
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    const items = filterRecords();
    if (items.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }

    const headers = [
      'Mã Đơn', 'Ngày', 'ID Siêu Thị', 'Tên Siêu Thị', 'SKU', 'Tên Hàng', 'ĐVT',
      'SL Chuyển', 'SL Nhận', 'Chênh Lệch', 'Hao Hụt TN', 'Lỗi', 'DC Xác Nhận',
      'Trách Nhiệm', 'Giá Nhập', 'Datapay Phạt Kho', 'Datapay Phạt ST', 'Hao Hụt VND'
    ];

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    items.forEach(i => {
      const row = [
        `"${i.to_order || i.id}"`,
        `"${i.transfer_date}"`,
        `"${i.store_id}"`,
        `"${(i.store_name || '').replace(/"/g, '""')}"`,
        `"${i.sku}"`,
        `"${(i.product_name || '').replace(/"/g, '""')}"`,
        `"${i.unit}"`,
        i.qty_transferred,
        i.qty_received,
        i.qty_diff,
        i.natural_loss_qty,
        `"${(i.error_type || '').replace(/"/g, '""')}"`,
        `"${(i.dc_confirmation || '').replace(/"/g, '""')}"`,
        `"${(i.responsible_party || '').replace(/"/g, '""')}"`,
        i.cost_price,
        i.warehouse_penalty,
        i.store_penalty,
        i.loss_value
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_Cao_Datapay_Kho_Rau_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  });

  // Share Telegram Handler (Dùng chính tài khoản của Ny)
  const shareBtn = document.getElementById('btn-share-telegram');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const totalRecs = allRecords.length || (summary ? summary.total_records : 0);
      const lossVal = summary ? formatCurrency(summary.financial_summary.total_natural_loss_vnd) : '0 đ';
      const dcVal = summary ? formatCurrency(summary.financial_summary.total_warehouse_penalty_vnd) : '0 đ';
      const stVal = summary ? formatCurrency(summary.financial_summary.total_store_penalty_vnd) : '0 đ';
      const nowStr = new Date().toLocaleDateString('vi-VN');

      const text = `🥦 BÁO CÁO ĐỐI SOÁT KHO RAU (${nowStr})\n━━━━━━━━━━━━━━━━━━━\n📦 Tổng dòng đối soát: ${totalRecs}\n📉 Hao hụt tự nhiên: ${lossVal}\n🏭 Phạt Kho Rau (DC): ${dcVal}\n🏪 Phạt Siêu Thị (ST): ${stVal}\n━━━━━━━━━━━━━━━━━━━\n🌐 Xem bảng chi tiết: https://nguyenbaony.github.io/kho-rau-reconciliation/`;
      const shareUrl = `https://t.me/share/url?url=https://nguyenbaony.github.io/kho-rau-reconciliation/&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    });
  }

  // Sync button feedback
  document.getElementById('btn-sync-sheet').addEventListener('click', () => {
    const btn = document.getElementById('btn-sync-sheet');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Đang tải dữ liệu...`;
    setTimeout(() => {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Đã đồng bộ ${allRecords.length} dòng!`;
      setTimeout(() => {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Đồng Bộ Google Sheet`;
      }, 3000);
    }, 1000);
  });

  document.getElementById('btn-git-push').addEventListener('click', () => {
    alert("Repository đã liên kết với:\nhttps://github.com/nguyenbaony/kho-rau-reconciliation");
  });

  // Telegram Groups Modal Logic
  const modalGroups = document.getElementById('modal-telegram-groups');
  const btnViewGroups = document.getElementById('btn-view-groups');
  const btnCloseGroups = document.getElementById('btn-modal-groups-close');
  const groupsTbody = document.getElementById('groups-tbody');
  const inputSearchGroups = document.getElementById('input-search-groups');
  const filterGroupType = document.getElementById('filter-group-type');

  let telegramData = null;

  async function loadTelegramGroups() {
    if (!telegramData) {
      try {
        const res = await fetch('telegram_groups_analysis.json');
        telegramData = await res.json();
      } catch (e) {
        console.error("Không thể nạp telegram_groups_analysis.json", e);
      }
    }
    renderTelegramGroups();
  }

  function renderTelegramGroups() {
    if (!telegramData || !groupsTbody) return;
    const filter = filterGroupType.value;
    const query = (inputSearchGroups.value || '').toLowerCase().trim();

    let items = [];
    if (filter === 'ALL' || filter === 'KRC') {
      telegramData.krc_groups.forEach(g => items.push({ ...g, category: 'Kho Rau Củ (KRC)', badge: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }));
    }
    if (filter === 'ALL' || filter === 'ABA') {
      telegramData.aba_groups.forEach(g => items.push({ ...g, category: 'Kho ABA', badge: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }));
    }
    if (filter === 'ALL' || filter === 'OTHER') {
      telegramData.other_groups.forEach(g => items.push({ ...g, category: 'Khác', badge: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8' }));
    }

    if (query) {
      items = items.filter(g => g.title.toLowerCase().includes(query));
    }

    let html = '';
    items.forEach((g, idx) => {
      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 8px 12px; color: #94a3b8;">${idx + 1}</td>
          <td style="padding: 8px 12px;">
            <span style="background: ${g.badge}; color: ${g.color}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
              ${g.category}
            </span>
          </td>
          <td style="padding: 8px 12px; font-weight: 500; color: #f1f5f9;">${g.title}</td>
          <td style="padding: 8px 12px; text-align: right; color: ${g.unread_count > 0 ? '#f59e0b' : '#64748b'}; font-weight: 600;">
            ${g.unread_count > 0 ? g.unread_count : '-'}
          </td>
        </tr>
      `;
    });

    groupsTbody.innerHTML = html || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8;">Không tìm thấy nhóm phù hợp</td></tr>';
  }

  if (btnViewGroups) {
    btnViewGroups.addEventListener('click', () => {
      modalGroups.classList.add('active');
      loadTelegramGroups();
    });
  }

  if (btnCloseGroups) {
    btnCloseGroups.addEventListener('click', () => {
      modalGroups.classList.remove('active');
    });
  }

  if (modalGroups) {
    modalGroups.addEventListener('click', (e) => {
      if (e.target === modalGroups) modalGroups.classList.remove('active');
    });
  }

  if (inputSearchGroups) inputSearchGroups.addEventListener('input', renderTelegramGroups);
  if (filterGroupType) filterGroupType.addEventListener('change', renderTelegramGroups);

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Telegram Feed Logic (RAU CỦ vs ABA/DC)
  let telegramFeedItems = [];
  let currentTgFilter = 'ALL';
  const tgCardsGrid = document.getElementById('telegram-cards-grid');
  const tgInputSearch = document.getElementById('tg-input-search');

  async function loadTelegramFeed() {
    try {
      const res = await fetch('data/telegram_feed.json?t=' + Date.now());
      if (res.ok) {
        telegramFeedItems = await res.json();
      }
    } catch (e) {
      console.error("Không thể tải telegram_feed.json", e);
    }
    renderTelegramFeed();
  }

  function renderTelegramFeed() {
    if (!tgCardsGrid) return;
    const query = (tgInputSearch ? tgInputSearch.value : '').toLowerCase().trim();

    let filtered = telegramFeedItems;
    if (currentTgFilter !== 'ALL') {
      filtered = filtered.filter(item => item.group_type === currentTgFilter);
    }
    if (query) {
      filtered = filtered.filter(item => 
        (item.group_title && item.group_title.toLowerCase().includes(query)) ||
        (item.store_code && item.store_code.toLowerCase().includes(query)) ||
        (item.text && item.text.toLowerCase().includes(query)) ||
        (item.sender_name && item.sender_name.toLowerCase().includes(query))
      );
    }

    const totalCount = telegramFeedItems.length;
    const krcCount = telegramFeedItems.filter(x => x.group_type === 'RAU_CU').length;
    const abaCount = telegramFeedItems.filter(x => x.group_type === 'ABA_DC').length;

    const btnAll = document.getElementById('tg-filter-all');
    const btnKrc = document.getElementById('tg-filter-krc');
    const btnAba = document.getElementById('tg-filter-aba');
    if (btnAll) btnAll.innerText = `Tất Cả (${totalCount})`;
    if (btnKrc) btnKrc.innerText = `🥦 1. RAU CỦ (${krcCount})`;
    if (btnAba) btnAba.innerText = `❄️ 2. ABA / DC (${abaCount})`;

    if (filtered.length === 0) {
      tgCardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8; background: rgba(15,23,42,0.6); border-radius: 12px; border: 1px dashed var(--border-glass);">
          <div style="font-size: 2rem; margin-bottom: 8px;">📭</div>
          <div style="font-weight: 600; color: #f1f5f9;">Không tìm thấy tin nhắn/hình ảnh phù hợp</div>
          <div style="font-size: 0.8rem; margin-top: 4px;">Thử chọn lại tab <b>RAU CỦ</b> hoặc <b>ABA/DC</b></div>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(item => {
      const isRau = item.group_type === 'RAU_CU';
      const badgeBg = isRau ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)';
      const badgeBorder = isRau ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)';
      const badgeColor = isRau ? '#34d399' : '#38bdf8';
      const groupIcon = isRau ? '🥦' : '❄️';
      const groupTag = isRau ? 'RAU CỦ' : 'ABA / DC';

      html += `
        <div class="tg-feed-card" style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-glass); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <div style="padding: 14px 16px 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                ${groupIcon}
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.86rem; color: #f8fafc; line-height: 1.25;">${escapeHtml(item.group_title)}</div>
                <div style="font-size: 0.73rem; color: #94a3b8; margin-top: 2px;">
                  <span style="color: ${badgeColor}; font-weight: 700; background: ${badgeBg}; padding: 1px 6px; border-radius: 4px;">${groupTag}</span> • ${escapeHtml(item.sender_name)}
                </div>
              </div>
            </div>
            <span style="font-size: 0.72rem; color: #64748b; white-space: nowrap;">${item.date}</span>
          </div>

          <div style="padding: 12px 16px; font-size: 0.83rem; color: #cbd5e1; flex: 1; line-height: 1.45;">
            ${escapeHtml(item.text)}
          </div>

          <div style="padding: 0 16px 16px;">
            <div class="tg-img-wrapper" data-img="${item.image_url}" data-cap="${escapeHtml(item.group_title)} - ${escapeHtml(item.date)}" style="position: relative; border-radius: 10px; overflow: hidden; height: 210px; background: #000; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
              <img src="${item.image_url}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.25s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                🔍 Xem ảnh lớn
              </div>
            </div>
          </div>
        </div>
      `;
    });
    tgCardsGrid.innerHTML = html;
  }

  // Delegated click on images in feed
  if (tgCardsGrid) {
    tgCardsGrid.addEventListener('click', (e) => {
      const wrap = e.target.closest('.tg-img-wrapper');
      if (wrap) {
        const imgUrl = wrap.getAttribute('data-img');
        const cap = wrap.getAttribute('data-cap');
        openLightbox(imgUrl, cap);
      }
    });
  }

  // Lightbox functions (global scope)
  window.openLightbox = function(url, caption) {
    const modal = document.getElementById('modal-lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    if (modal && img) {
      img.src = url;
      if (cap) cap.innerText = caption || 'Hình ảnh chứng từ đối soát';
      modal.classList.add('active');
    }
  };

  const btnCloseLightbox = document.getElementById('btn-lightbox-close');
  const modalLightbox = document.getElementById('modal-lightbox');
  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', () => {
      modalLightbox.classList.remove('active');
    });
  }
  if (modalLightbox) {
    modalLightbox.addEventListener('click', (e) => {
      if (e.target === modalLightbox) modalLightbox.classList.remove('active');
    });
  }

  // Sub-filter button clicks
  document.querySelectorAll('.tg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tg-tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#94a3b8';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--accent-blue)';
      btn.style.color = '#fff';

      currentTgFilter = btn.getAttribute('data-tg-group');
      renderTelegramFeed();
    });
  });

  if (tgInputSearch) tgInputSearch.addEventListener('input', renderTelegramFeed);

  const btnRefreshTg = document.getElementById('btn-refresh-telegram');
  if (btnRefreshTg) {
    btnRefreshTg.addEventListener('click', () => {
      btnRefreshTg.innerText = '⏳ Đang làm mới...';
      loadTelegramFeed().then(() => {
        btnRefreshTg.innerText = '🔄 Làm Mới';
      });
    });
  }

  // Realtime Polling every 5 seconds when on Telegram tab
  setInterval(() => {
    if (currentViewMode === 'telegram') {
      loadTelegramFeed();
    }
  }, 5000);

  // Initial Run
  populateDates();
  populateStores();
  updateKPIs();
  renderTable();
  switchViewMode('analytics');
});


