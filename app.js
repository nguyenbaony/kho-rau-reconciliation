// Báo Cáo Đối Soát Kho Rau Củ (KRC) - Frontend Logic
document.addEventListener('DOMContentLoaded', async () => {
  let allRecords = (typeof window !== 'undefined' && window.RECON_RECORDS) ? window.RECON_RECORDS : [];
  let summary = (typeof window !== 'undefined' && window.RECON_SUMMARY) ? window.RECON_SUMMARY : null;
  if (allRecords && allRecords.length > 0) {
    allRecords = allRecords.filter(r => r.sku && r.sku !== 'Mã hàng' && r.sku !== 'Ma hang' && r.sku !== 'Ma hng' && r.to_order !== 'CLV4');
  }

  // Format and Date Helpers (Global within DOMContentLoaded)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatNumber = (val, decimals = 2) => {
    return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(val || 0);
  };

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

  function showToast(msg, icon = '✅') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ============================================================
  // LUỒNG 3: BÁO CÁO TỔNG HỢP DATAPAY & TỒN KHO CDC (LEGACY RECON)
  // ============================================================
  let stream3Initialized = false;
  async function initStream3() {
    if (stream3Initialized) {
      setTimeout(() => {
        const currentMode = document.querySelector('.view-tab-btn.active')?.getAttribute('data-view') || 'analytics';
        if (currentMode === 'analytics' && typeof updateAnalyticsCharts === 'function' && typeof filterRecords === 'function') {
          updateAnalyticsCharts(filterRecords());
        }
        if (window.Chart && Chart.instances) {
          Object.values(Chart.instances).forEach(c => c && typeof c.resize === 'function' && c.resize());
        }
      }, 50);
      return;
    }
    stream3Initialized = true;
    console.log('[Luồng 3] Initializing Datapay & CDC Reconciliation Engine...');

    // Google Sheets Export Configuration
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1XBNLjZLsgaaHDBqVKsbCSYhzD4v-4qMA6rjGXGG4ThM/export?format=csv&gid=1422896115';

    const bundledRecords = window.RECON_RECORDS || [];
    const bundledSummary = window.RECON_SUMMARY || null;

    // 1. Try to load from bundled data first (Instant)
    if (bundledRecords && bundledRecords.length > 0) {
      allRecords = bundledRecords;
      summary = bundledSummary;
      console.log(`[Luồng 3] Loaded ${allRecords.length} bundled records.`);
    } else {
      // Try local cache
      try {
        const cached = localStorage.getItem('KHO_RAU_CACHE_V5');
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && parsedCache.records && parsedCache.records.length > 0) {
            allRecords = parsedCache.records;
            summary = parsedCache.summary;
            console.log(`[Cache] Loaded ${allRecords.length} records from localStorage.`);
          }
        }
      } catch (e) {
        console.warn('[Cache] Could not read localStorage:', e);
      }
    }

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
  allRecords = allRecords.filter(r => r.sku && r.sku !== 'Mã hàng' && r.sku !== 'Ma hang' && r.sku !== 'Ma hng' && r.to_order !== 'CLV4');

  let currentStep = 'all';
  let searchQuery = '';
  let selectedDate = '';
  let selectedStore = '';
  let selectedError = '';
  let selectedStatus = '';
  let selectedWarehouse = '';
  let dateRange = { from: '', to: '' };

  let currentPage = 1;
  const pageSize = 50;


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
    const currentVal = dateSelect.value;
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

    if (currentVal && Array.from(dateSelect.options).some(o => o.value === currentVal)) {
      dateSelect.value = currentVal;
    }
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

      // Warehouse Filter (KRC vs KRCBT)
      if (selectedWarehouse) {
        const isBanh = (item.product_name || '').toUpperCase().includes('BÁNH') ||
                       (item.product_name || '').toUpperCase().includes('BANH') ||
                       (item.product_name || '').toUpperCase().includes('SANDWICH') ||
                       (item.product_name || '').toUpperCase().includes('BREAD') ||
                       (item.product_name || '').toUpperCase().includes('CROISSANT') ||
                       (item.warehouse_id || '').toUpperCase().includes('KRCBT') ||
                       (item.to_order || '').toUpperCase().includes('KRCBT') ||
                       (item.unit || '').toUpperCase() === 'KHAY' ||
                       (item.unit || '').toUpperCase() === 'CÁI';
        if (selectedWarehouse === 'KRCBT' && !isBanh) return false;
        if (selectedWarehouse === 'KRC' && isBanh) return false;
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

  // 3c. Báo Cáo Chênh Lệch Hằng Ngày (5 Chỉ Tiêu KRC & KRCBT)
  const renderDailyDiscrepancy = () => {
    const list = filterRecords();
    const dayMap = {};

    list.forEach(item => {
      const d = item.transfer_date || 'Chưa rõ';
      const isBanh = (item.product_name || '').toUpperCase().includes('BÁNH') ||
                     (item.product_name || '').toUpperCase().includes('BANH') ||
                     (item.product_name || '').toUpperCase().includes('SANDWICH') ||
                     (item.product_name || '').toUpperCase().includes('BREAD') ||
                     (item.product_name || '').toUpperCase().includes('CROISSANT') ||
                     (item.warehouse_id || '').toUpperCase().includes('KRCBT') ||
                     (item.to_order || '').toUpperCase().includes('KRCBT') ||
                     (item.unit || '').toUpperCase() === 'KHAY' ||
                     (item.unit || '').toUpperCase() === 'CÁI';
      const whKey = isBanh ? 'KRCBT' : 'KRC';
      const key = `${d}__${whKey}`;

      if (!dayMap[key]) {
        dayMap[key] = {
          date: d,
          warehouse_code: whKey,
          warehouse_name: isBanh ? '🥖 Kho Bánh Tươi' : '🥦 Kho Rau Củ',
          ticketSet: new Set(),
          discrepancyTicketSet: new Set(),
          total_transferred: 0,
          total_received: 0,
          total_diff_abs: 0,
          total_surplus: 0,
          total_shortage: 0,
          natural_loss_qty: 0,
          natural_loss_vnd: 0,
          warehouse_penalty_vnd: 0,
          store_penalty_vnd: 0,
          total_loss_val: 0
        };
      }

      const entry = dayMap[key];
      const ticketId = item.to_order || item.pt_transfer || item.id;
      entry.ticketSet.add(ticketId);

      const qTrans = Number(item.qty_transferred) || 0;
      const qRecv = Number(item.qty_received) || 0;
      const qDiff = Number(item.qty_diff) || 0;

      entry.total_transferred += qTrans;
      entry.total_received += qRecv;
      entry.total_diff_abs += Math.abs(qDiff);

      if (qDiff !== 0 || Number(item.natural_loss_qty || 0) > 0) {
        entry.discrepancyTicketSet.add(ticketId);
      }

      // 3. SL Dư (Thừa)
      if (qRecv > qTrans) {
        entry.total_surplus += (qRecv - qTrans);
      }

      // 4. SL Thiếu (đã trừ hao hụt)
      if (qTrans > qRecv) {
        const lossQ = Number(item.natural_loss_qty) || 0;
        const netShortage = Math.max(0, (qTrans - qRecv) - lossQ);
        entry.total_shortage += netShortage;
      }

      // 5. Hao hụt
      entry.natural_loss_qty += (Number(item.natural_loss_qty) || 0);
      entry.natural_loss_vnd += (Number(item.loss_value) || 0);

      // Chế tài
      entry.warehouse_penalty_vnd += (Number(item.warehouse_penalty) || 0);
      entry.store_penalty_vnd += (Number(item.store_penalty) || 0);
      entry.total_loss_val += (Number(item.warehouse_penalty || 0) + Number(item.store_penalty || 0) + Number(item.loss_value || 0) + Number(item.undetermined_value || 0));
    });

    const entries = Object.values(dayMap).sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    // Compute Overall Daily KPI Cards
    let grandTickets = 0, krcTickets = 0, krcbtTickets = 0;
    let grandDiffQty = 0, grandDiffVal = 0;
    let grandSurplusQty = 0;
    let grandShortageQty = 0, grandWhPenalty = 0, grandStPenalty = 0;
    let grandLossQty = 0, grandLossVal = 0;

    entries.forEach(e => {
      const tCnt = e.ticketSet.size;
      grandTickets += tCnt;
      if (e.warehouse_code === 'KRC') krcTickets += tCnt;
      else krcbtTickets += tCnt;

      grandDiffQty += e.total_diff_abs;
      grandDiffVal += e.total_loss_val;
      grandSurplusQty += e.total_surplus;
      grandShortageQty += e.total_shortage;
      grandWhPenalty += e.warehouse_penalty_vnd;
      grandStPenalty += e.store_penalty_vnd;
      grandLossQty += e.natural_loss_qty;
      grandLossVal += e.natural_loss_vnd;
    });

    // Update 5 KPI Cards in UI
    const elTickets = document.getElementById('daily-kpi-tickets');
    const elTicketsSub = document.getElementById('daily-kpi-tickets-sub');
    const elDiffQty = document.getElementById('daily-kpi-diff-qty');
    const elDiffVal = document.getElementById('daily-kpi-diff-val');
    const elSurplusQty = document.getElementById('daily-kpi-surplus-qty');
    const elShortageQty = document.getElementById('daily-kpi-shortage-qty');
    const elShortageSub = document.getElementById('daily-kpi-shortage-sub');
    const elLossQty = document.getElementById('daily-kpi-loss-qty');
    const elLossSub = document.getElementById('daily-kpi-loss-sub');

    if (elTickets) elTickets.textContent = `${formatNumber(grandTickets, 0)} Phiếu`;
    if (elTicketsSub) elTicketsSub.textContent = `🥦 KRC: ${formatNumber(krcTickets, 0)} | 🥖 KRCBT: ${formatNumber(krcbtTickets, 0)}`;
    if (elDiffQty) elDiffQty.textContent = `${formatNumber(grandDiffQty, 2)} Kg/Khay`;
    if (elDiffVal) elDiffVal.textContent = `Trị giá: ${formatCurrency(grandDiffVal)}`;
    if (elSurplusQty) elSurplusQty.textContent = `+${formatNumber(grandSurplusQty, 2)} Kg/Khay`;
    if (elShortageQty) elShortageQty.textContent = `-${formatNumber(grandShortageQty, 2)} Kg/Khay`;
    if (elShortageSub) elShortageSub.textContent = `Phạt DC: ${formatCurrency(grandWhPenalty)} | ST: ${formatCurrency(grandStPenalty)}`;
    if (elLossQty) elLossQty.textContent = `${formatNumber(grandLossQty, 2)} Kg`;
    if (elLossSub) elLossSub.textContent = `Định mức: ${formatCurrency(grandLossVal)}`;

    // Render Table
    const tbody = document.getElementById('daily-discrepancy-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 36px; color: var(--text-muted);">Không có dữ liệu chốt sổ hằng ngày cho bộ lọc hiện tại.</td></tr>`;
      return;
    }

    entries.forEach(e => {
      const tr = document.createElement('tr');
      const tTotal = e.ticketSet.size;
      const tDisc = e.discrepancyTicketSet.size;
      const tPerf = Math.max(0, tTotal - tDisc);
      const perfPct = tTotal > 0 ? ((tPerf / tTotal) * 100).toFixed(1) : '100.0';

      const whBadge = e.warehouse_code === 'KRCBT'
        ? `<span class="badge badge-purple" style="font-weight: 600;">🥖 KRCBT</span>`
        : `<span class="badge badge-green" style="font-weight: 600;">🥦 KRC</span>`;

      tr.innerHTML = `
        <td style="font-weight: 700; color: #fff;">${formatDateVN(e.date)}</td>
        <td>${whBadge}</td>
        <td style="text-align: center;">
          <span style="font-weight: 700; color: #38bdf8;">${tTotal}</span> 
          <span style="font-size: 0.73rem; color: var(--text-muted);">(${tPerf} khớp / <b style="color: #f87171;">${tDisc} lệch</b>)</span>
          <div style="font-size: 0.72rem; color: #34d399;">Khớp: ${perfPct}%</div>
        </td>
        <td class="text-right" style="font-weight: 500;">${formatNumber(e.total_transferred, 2)}</td>
        <td class="text-right" style="font-weight: 500;">${formatNumber(e.total_received, 2)}</td>
        <td class="text-right" style="font-weight: 700; color: #f87171;">${formatNumber(e.total_diff_abs, 2)}</td>
        <td class="text-right" style="font-weight: 700; color: #34d399;">+${formatNumber(e.total_surplus, 2)}</td>
        <td class="text-right" style="font-weight: 700; color: #fb923c;">-${formatNumber(e.total_shortage, 2)}</td>
        <td class="text-right" style="color: #f87171; font-weight: 600;">${formatCurrency(e.warehouse_penalty_vnd)}</td>
        <td class="text-right" style="color: #c084fc; font-weight: 600;">${formatCurrency(e.store_penalty_vnd)}</td>
        <td class="text-right" style="color: #fde047; font-weight: 600;">${formatNumber(e.natural_loss_qty, 2)}</td>
        <td class="text-right" style="color: #38bdf8; font-weight: 700;">${formatCurrency(e.total_loss_val)}</td>
        <td style="text-align: center;">
          <button class="btn btn-outline btn-filter-day" data-date="${e.date}" data-wh="${e.warehouse_code}" style="padding: 4px 8px; font-size: 0.74rem;">
            🔍 Xem Lệch
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Drill-down button handler
    document.querySelectorAll('.btn-filter-day').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const d = ev.currentTarget.getAttribute('data-date');
        const wh = ev.currentTarget.getAttribute('data-wh');
        selectedDate = d;
        selectedWarehouse = wh;
        const selWh = document.getElementById('filter-warehouse');
        if (selWh) selWh.value = wh;
        switchViewMode('recon');
        showToast(`Đang mở chi tiết các phiếu lệch ngày ${formatDateVN(d)} - Kho ${wh}`, '🔍');
      });
    });
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
    modal.style.display = 'flex';
  };

  // Close Modal
  document.getElementById('btn-modal-close').addEventListener('click', () => {
    document.getElementById('modal-claim-detail').classList.remove('active');
    document.getElementById('modal-claim-detail').style.display = 'none';
  });

  // View Mode Switcher
  const modeAnalyticsBtn = document.getElementById('mode-tab-analytics');
  const modeReconBtn = document.getElementById('mode-tab-recon');
  const modeTelegramBtn = document.getElementById('mode-tab-telegram');
  const modeDailyBtn = document.getElementById('mode-tab-daily');

  const analyticsView = document.getElementById('analytics-view-section');
  const reconView = document.getElementById('recon-view-section');
  const telegramView = document.getElementById('telegram-feed-section');
  const dailyView = document.getElementById('daily-view-section');

  let currentViewMode = 'analytics';
  const switchViewMode = (mode) => {
    currentViewMode = mode;
    [modeAnalyticsBtn, modeReconBtn, modeTelegramBtn, modeDailyBtn].forEach(b => {
      if (b) b.classList.remove('active');
    });

    if (analyticsView) analyticsView.style.display = 'none';
    if (reconView) reconView.style.display = 'none';
    if (telegramView) telegramView.style.display = 'none';
    if (dailyView) dailyView.style.display = 'none';

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
    } else if (mode === 'daily') {
      if (modeDailyBtn) modeDailyBtn.classList.add('active');
      if (dailyView) dailyView.style.display = 'block';
      renderDailyDiscrepancy();
    }
  };

  if (modeAnalyticsBtn) modeAnalyticsBtn.addEventListener('click', () => switchViewMode('analytics'));
  if (modeReconBtn) modeReconBtn.addEventListener('click', () => switchViewMode('recon'));
  if (modeTelegramBtn) modeTelegramBtn.addEventListener('click', () => switchViewMode('telegram'));
  if (modeDailyBtn) modeDailyBtn.addEventListener('click', () => switchViewMode('daily'));

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
  const dateFromInput = document.getElementById('input-date-from');
  const dateToInput = document.getElementById('input-date-to');
  const btnApplyDateRange = document.getElementById('btn-apply-date-range');
  const btnResetDateRange = document.getElementById('btn-reset-date-range');

  if (dateSelect) {
    dateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      selectedDate = val;
      dateRange = { from: '', to: '' };
      currentPage = 1;
      renderTable();
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
      if (fromVal || toVal) {
        showToast(`Đã lọc từ ${formatDateVN(fromVal) || 'đầu'} đến ${formatDateVN(toVal) || 'nay'}`, '🔍');
      }
    });
  }

  if (btnResetDateRange) {
    btnResetDateRange.addEventListener('click', () => {
      if (dateFromInput) dateFromInput.value = '2026-09-01';
      if (dateToInput) dateToInput.value = '2026-09-16';
      if (dateSelect) dateSelect.value = '';
      selectedDate = '';
      dateRange = { from: '', to: '' };
      currentPage = 1;
      renderTable();
      showToast('Đã đặt lại bộ lọc ngày.', '🔄');
    });
  }

  const filterWarehouse = document.getElementById('filter-warehouse');
  if (filterWarehouse) {
    filterWarehouse.addEventListener('change', (e) => {
      selectedWarehouse = e.target.value;
      currentPage = 1;
      renderTable();
      const label = selectedWarehouse === 'KRCBT' ? '🥖 Kho Bánh Tươi (KRCBT)' : (selectedWarehouse === 'KRC' ? '🥦 Kho Rau Củ (KRC)' : 'Tất cả kho (KRC & KRCBT)');
      showToast(`Đang lọc: ${label}`, '🏢');
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
      selectedWarehouse = '';
      dateRange = { from: '', to: '' };

      if (inputSearch) inputSearch.value = '';
      if (dateSelect) dateSelect.value = '';
      if (dateRangeContainer) dateRangeContainer.style.display = 'none';
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      if (filterWarehouse) filterWarehouse.value = '';
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

  // Daily Report Action Handlers (5 chỉ tiêu)
  const btnCopyDailyTg = document.getElementById('btn-copy-daily-telegram');
  if (btnCopyDailyTg) {
    btnCopyDailyTg.addEventListener('click', () => {
      const ticketsTxt = document.getElementById('daily-kpi-tickets')?.textContent || '248 Phiếu';
      const ticketsSub = document.getElementById('daily-kpi-tickets-sub')?.textContent || '';
      const diffQtyTxt = document.getElementById('daily-kpi-diff-qty')?.textContent || '142.5 Kg';
      const diffValTxt = document.getElementById('daily-kpi-diff-val')?.textContent || '';
      const surplusTxt = document.getElementById('daily-kpi-surplus-qty')?.textContent || '+28.4 Kg';
      const shortageTxt = document.getElementById('daily-kpi-shortage-qty')?.textContent || '-86.2 Kg';
      const shortageSub = document.getElementById('daily-kpi-shortage-sub')?.textContent || '';
      const lossTxt = document.getElementById('daily-kpi-loss-qty')?.textContent || '27.9 Kg';
      const lossSub = document.getElementById('daily-kpi-loss-sub')?.textContent || '';
      const nowStr = new Date().toLocaleDateString('vi-VN');

      const telegramMsg = `🥦🥖 BÁO CÁO CHÊNH LỆCH GIAO NHẬN HẰNG NGÀY (${nowStr})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ SỐ PHIẾU ĐIỀU CHUYỂN: ${ticketsTxt} (${ticketsSub})
2️⃣ TỔNG SL CHÊNH LỆCH: ${diffQtyTxt} (${diffValTxt})
3️⃣ SẢN LƯỢNG DƯ (THỪA): ${surplusTxt} (ST nhận thừa)
4️⃣ SẢN LƯỢNG THIẾU: ${shortageTxt} (${shortageSub})
5️⃣ HAO HỤT: ${lossTxt} (${lossSub})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Tra cứu & đối soát chi tiết TO/PT: https://app-scm.kfm.vn/rau-cu-kfm`;

      navigator.clipboard.writeText(telegramMsg).then(() => {
        showToast('Đã sao chép mẫu bản tin Telegram 7:30 AM vào bộ nhớ tạm!', '📋');
      }).catch(() => {
        prompt('Sao chép bản tin Telegram:', telegramMsg);
      });
    });
  }

  const btnExportDailyCsv = document.getElementById('btn-export-daily-csv');
  if (btnExportDailyCsv) {
    btnExportDailyCsv.addEventListener('click', () => {
      const rows = document.querySelectorAll('#daily-discrepancy-tbody tr');
      if (!rows || rows.length === 0) {
        showToast('Không có dữ liệu ngày để xuất!', '⚠️');
        return;
      }
      const headers = ['Ngày Giao', 'Phân Hệ Kho', 'Số Phiếu', 'Tổng Xuất', 'Tổng Nhận', 'SL Lệch', 'SL Dư', 'SL Thiếu', 'Phạt Kho DC', 'Phạt Siêu Thị', 'Hao Hụt Kg', 'Trị Giá Thất Thoát'];
      let csv = '\uFEFF' + headers.join(',') + '\n';
      rows.forEach(r => {
        const cols = Array.from(r.querySelectorAll('td')).map(c => `"${c.innerText.replace(/"/g, '""').replace(/\n/g, ' ')}"`);
        if (cols.length >= 12) {
          csv += cols.slice(0, 12).join(',') + '\n';
        }
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Bao_Cao_Chenh_Lech_Hang_Ngay_KRC_KRCBT_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      showToast('Đã xuất file CSV Báo cáo chênh lệch hằng ngày thành công!', '📥');
    });
  }

  // Toast Notification Helper
  const showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    if (type === 'success') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else if (type === 'warning') {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    toast.innerHTML = `${icon}<span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  };

  // Fast CSV Parser (RFC 4180 compliant)
  function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (insideQuotes && next === '"') {
          currentVal += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === ',' && !insideQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if ((c === '\r' || c === '\n') && !insideQuotes) {
        if (c === '\r' && next === '\n') i++;
        currentRow.push(currentVal.trim());
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += c;
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
    }
    return rows;
  }

  const parseVnDecimal = (val) => {
    if (!val) return 0;
    let clean = String(val).trim().replace(/"/g, '').replace(/\s+/g, '');
    if (/\.\d{3},\d+/.test(clean)) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (/,\d+/.test(clean)) {
      clean = clean.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
      clean = clean.replace(/\./g, '');
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 10000) / 10000;
  };

  const parseVnCurrency = (val) => {
    if (!val) return 0;
    let clean = String(val).trim().replace(/"/g, '').replace(/\s+/g, '').replace(/VND/gi, '').replace(/₫/g, '');
    if (clean.includes('.')) clean = clean.replace(/\./g, '');
    if (clean.includes(',')) clean = clean.replace(/,/g, '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num);
  };

  const getCol = (arr, idx, def = '') => {
    if (idx < arr.length && arr[idx] !== undefined && arr[idx] !== null) {
      return String(arr[idx]).trim();
    }
    return def;
  };

  function processSheetCSV(csvText) {
    const rows = parseCSV(csvText);
    if (!rows || rows.length < 5) return null;

    let headerIndex = 2;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const lineStr = rows[i].join(' ');
      if (lineStr.includes('TO') && lineStr.includes('PT') && (lineStr.includes('SL') || lineStr.includes('Chuyển'))) {
        headerIndex = i;
        break;
      }
    }

    const records = [];
    let totalTransferred = 0;
    let totalReceived = 0;
    let totalDiff = 0;
    let totalLossVal = 0;
    let totalStorePenalty = 0;
    let totalWarehousePenalty = 0;
    let totalUndeterminedVal = 0;

    for (let r = headerIndex + 1; r < rows.length; r++) {
      const cols = rows[r];
      if (!cols || cols.length < 10) continue;

      const sku = getCol(cols, 4);
      const productName = getCol(cols, 5);
      if (!sku && !productName) continue;
      if (sku === 'Mã hàng' || sku === 'Ma hang' || sku === 'Ma hng') continue;

      const handler = getCol(cols, 0);
      const transferDate = getCol(cols, 1);
      const storeName = getCol(cols, 2);
      const storeId = getCol(cols, 3);
      const unit = getCol(cols, 6);

      const qtyTransferred = parseVnDecimal(getCol(cols, 7, '0'));
      const qtyReceived = parseVnDecimal(getCol(cols, 8, '0'));
      let qtyDiff = parseVnDecimal(getCol(cols, 9, '0'));
      if (qtyDiff === 0 && (qtyTransferred > 0 || qtyReceived > 0)) {
        qtyDiff = Math.round((qtyTransferred - qtyReceived) * 1000) / 1000;
      }

      const ptTransfer = getCol(cols, 10);
      const crateCode = getCol(cols, 11);
      const toOrder = getCol(cols, 12);
      const naturalLossQty = parseVnDecimal(getCol(cols, 13, '0'));
      const storeReturnQty = parseVnDecimal(getCol(cols, 14, '0'));
      const undeterminedQty = parseVnDecimal(getCol(cols, 15, '0'));

      const status = getCol(cols, 20, 'Pending');
      const errorType = getCol(cols, 21);
      const responsible = getCol(cols, 25);
      const imageLink = getCol(cols, 26);
      const dcConfirm = getCol(cols, 27);
      const dcNote = getCol(cols, 28);
      const kfmFeedback = getCol(cols, 29);

      const categoryV2 = getCol(cols, 31, 'OTHER');
      const costPrice = parseVnCurrency(getCol(cols, 34, '0'));

      const totalValue = Math.round(qtyDiff * costPrice);
      let valNaturalLoss = Math.round(naturalLossQty * costPrice);

      const rawValStore = getCol(cols, 37, '');
      const rawValWarehouse = getCol(cols, 38, '');
      const rawValUndetermined = getCol(cols, 39, '');

      let valStore = rawValStore !== '' ? parseVnCurrency(rawValStore) : 0;
      let valWarehouse = rawValWarehouse !== '' ? parseVnCurrency(rawValWarehouse) : 0;
      let valUndetermined = rawValUndetermined !== '' ? parseVnCurrency(rawValUndetermined) : 0;

      if (valStore === 0 && valWarehouse === 0 && valUndetermined === 0 && valNaturalLoss === 0) {
        if (/Kho/i.test(responsible) || /claim/i.test(dcConfirm) || /DC/i.test(errorType)) {
          valWarehouse = totalValue;
        } else if (/ST|iêu thị|ieu thi/i.test(responsible) || /ST/i.test(errorType)) {
          valStore = totalValue;
        } else if (/Hao/i.test(errorType) || naturalLossQty > 0) {
          valNaturalLoss = totalValue;
        } else {
          valUndetermined = totalValue;
        }
      }

      const gsm = getCol(cols, 40);
      const rsm = getCol(cols, 41);
      const area = getCol(cols, 42);

      records.push({
        id: 'REC-' + String(records.length + 1).padStart(5, '0'),
        handler,
        transfer_date: transferDate,
        store_id: storeId,
        store_name: storeName,
        area,
        sku,
        product_name: productName,
        unit,
        category_v2: categoryV2,
        to_order: toOrder,
        pt_transfer: ptTransfer,
        crate_code: crateCode,
        qty_transferred: qtyTransferred,
        qty_received: qtyReceived,
        qty_diff: qtyDiff,
        natural_loss_qty: naturalLossQty,
        store_return_qty: storeReturnQty,
        undetermined_qty: undeterminedQty,
        cost_price: costPrice,
        total_value: totalValue,
        loss_value: valNaturalLoss,
        store_penalty: valStore,
        warehouse_penalty: valWarehouse,
        undetermined_value: valUndetermined,
        status,
        error_type: errorType,
        responsible_party: responsible,
        dc_confirmation: dcConfirm,
        dc_note: dcNote,
        kfm_feedback: kfmFeedback,
        image_link: imageLink,
        gsm,
        rsm
      });

      totalTransferred += qtyTransferred;
      totalReceived += qtyReceived;
      totalDiff += qtyDiff;
      totalLossVal += valNaturalLoss;
      totalStorePenalty += valStore;
      totalWarehousePenalty += valWarehouse;
      totalUndeterminedVal += valUndetermined;
    }

    const summary = {
      generated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      total_records: records.length,
      total_qty_transferred: Math.round(totalTransferred * 100) / 100,
      total_qty_received: Math.round(totalReceived * 100) / 100,
      total_qty_diff: Math.round(totalDiff * 100) / 100,
      financial_summary: {
        total_natural_loss_vnd: totalLossVal,
        total_store_penalty_vnd: totalStorePenalty,
        total_warehouse_penalty_vnd: totalWarehousePenalty,
        total_undetermined_vnd: totalUndeterminedVal,
        grand_total_penalty_vnd: totalStorePenalty + totalWarehousePenalty
      }
    };

    return { records, summary };
  }

  let isSyncing = false;

  async function syncGoogleSheetsRealtime(isManual = false) {
    if (isSyncing) return;
    isSyncing = true;

    const btnSync = document.getElementById('btn-sync-sheet');
    const statusText = document.getElementById('status-sheet-sync');

    if (btnSync) {
      btnSync.style.opacity = '0.75';
      btnSync.style.pointerEvents = 'none';
      btnSync.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span id="btn-sync-sheet-text">Đang tải Sheets...</span>`;
    }

    try {
      const liveUrl = `${GOOGLE_SHEET_CSV_URL}&_t=${Date.now()}`;
      console.log('[Realtime] Fetching Google Sheets CSV:', liveUrl);
      const res = await fetch(liveUrl);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const csvText = await res.text();
      
      const parsed = processSheetCSV(csvText);
      if (parsed && parsed.records && parsed.records.length > 0) {
        const prevCount = allRecords.length;
        allRecords = parsed.records;
        summary = parsed.summary;

        // Save to cache
        try {
          localStorage.setItem('KHO_RAU_CACHE_V5', JSON.stringify({
            records: allRecords,
            summary: summary,
            syncedAt: Date.now()
          }));
        } catch (e) {
          console.warn('[Cache] Could not write to localStorage:', e);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
        if (statusText) {
          statusText.innerHTML = `Google Sheets: <b style="color: #10b981;">Realtime</b> <span style="font-size: 0.74rem; color: #94a3b8;">(${timeStr} - ${formatNumber(allRecords.length, 0)} dòng)</span>`;
        }

        const topStatusEl = document.getElementById('top-status-text');
        if (topStatusEl) {
          topStatusEl.innerHTML = `Sheets: <b>Realtime</b> <span style="font-size: 0.72rem; color: #a7f3d0;">(${formatNumber(allRecords.length, 0)} dòng)</span>`;
        }

        populateDates();
        populateStores();
        updateKPIs(filterRecords());
        renderTable();
        const currentMode = document.querySelector('.view-tab-btn.active')?.getAttribute('data-view') || 'analytics';
        if (currentMode === 'analytics') {
          updateAnalyticsCharts(filterRecords());
        }

        if (isManual) {
          showToast(`✓ Đã đồng bộ thành công ${formatNumber(allRecords.length, 0)} dòng mới nhất từ Google Sheets!`, 'success');
        } else if (prevCount > 0 && prevCount !== allRecords.length) {
          showToast(`⚡ Cập nhật Realtime: ${formatNumber(allRecords.length, 0)} dòng (+${allRecords.length - prevCount} mới)`, 'info');
        }
      }
    } catch (err) {
      console.error('[Realtime] Sync error:', err);
      if (isManual) {
        showToast('⚠️ Không thể tải trực tiếp từ Google Sheets, hiển thị dữ liệu lưu gần nhất.', 'warning');
      }
      if (statusText && (!allRecords || allRecords.length === 0)) {
        statusText.innerHTML = `Google Sheets: <span style="color:#f87171;">Lỗi kết nối</span>`;
      }
    } finally {
      isSyncing = false;
      if (btnSync) {
        btnSync.style.opacity = '1';
        btnSync.style.pointerEvents = 'auto';
        btnSync.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> <span id="btn-sync-sheet-text">Đồng Bộ Google Sheet</span>`;
      }
    }
  }

  // Realtime Auto-Sync Polling
  const selectAutoSync = document.getElementById('select-auto-sync');
  const countdownEl = document.getElementById('auto-sync-countdown');
  let autoSyncInterval = 60000;
  let remainingSeconds = 60;
  let autoSyncTimerId = null;

  function resetAutoSyncTimer() {
    if (autoSyncTimerId) clearInterval(autoSyncTimerId);
    const topCountdownEl = document.getElementById('top-countdown');
    if (autoSyncInterval <= 0) {
      if (countdownEl) countdownEl.textContent = '(Tắt)';
      if (topCountdownEl) topCountdownEl.textContent = '(Tắt)';
      return;
    }
    remainingSeconds = Math.round(autoSyncInterval / 1000);
    if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;
    if (topCountdownEl) topCountdownEl.textContent = `(${remainingSeconds}s)`;

    autoSyncTimerId = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = Math.round(autoSyncInterval / 1000);
        if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;
        if (topCountdownEl) topCountdownEl.textContent = `(${remainingSeconds}s)`;
        syncGoogleSheetsRealtime(false);
      } else {
        if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;
        if (topCountdownEl) topCountdownEl.textContent = `(${remainingSeconds}s)`;
      }
    }, 1000);
  }

  // Top header sync pill click listener
  const topSyncPill = document.getElementById('top-sync-pill');
  if (topSyncPill) {
    topSyncPill.addEventListener('click', () => {
      syncGoogleSheetsRealtime(true);
    });
  }

  if (selectAutoSync) {
    selectAutoSync.addEventListener('change', (e) => {
      autoSyncInterval = parseInt(e.target.value, 10);
      resetAutoSyncTimer();
      if (autoSyncInterval > 0) {
        showToast(`⚡ Đã bật tự động cập nhật Realtime mỗi ${autoSyncInterval / 60000} phút.`, 'info');
      } else {
        showToast('Đã tắt tự động cập nhật Realtime.', 'info');
      }
    });
  }

  // Sync button feedback
  const btnSyncSheetEl = document.getElementById('btn-sync-sheet');
  if (btnSyncSheetEl) {
    btnSyncSheetEl.addEventListener('click', () => {
      syncGoogleSheetsRealtime(true);
    });
  }

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
      modalGroups.style.display = 'flex';
      loadTelegramGroups();
    });
  }

  if (btnCloseGroups) {
    btnCloseGroups.addEventListener('click', () => {
      modalGroups.classList.remove('active');
      modalGroups.style.display = 'none';
    });
  }

  if (modalGroups) {
    modalGroups.addEventListener('click', (e) => {
      if (e.target === modalGroups) {
        modalGroups.classList.remove('active');
        modalGroups.style.display = 'none';
      }
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
  // ==========================================================================
  // TELEGRAM MONITORING ENGINE (KRC, ABA, DC & CẢNH BÁO KHẨN CẤP WEB A)
  // ==========================================================================
  const DEFAULT_TELEGRAM_ITEMS = [
    {
      "id": "msg-krc-01",
      "chat_id": "1828938896",
      "message_id": 969297,
      "group_type": "KRC",
      "group_title": "KRC - ECG (Kho Rau Củ)",
      "store_code": "HCM2 - ECG",
      "sender_name": "Huy Nguyễn - SC019264",
      "sender_role": "NVBH Siêu Thị",
      "sender_username": "@Huynguyenkfm",
      "date": "16/09/2026 09:09",
      "timestamp": 1789534140,
      "text": "Tài xế giao nhầm rổ cho siêu thị nên hiện tại sthi em dư những sp này vượt sức bán, nhờ ac ht điều chuyển siêu thị giúp em nha. @nynguyen09",
      "image_url": "media/telegram/rau_cu_1001828938896_969297.jpg",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969297",
      "tme_url": "https://t.me/c/1828938896/969297"
    },
    {
      "id": "msg-krc-02",
      "chat_id": "1828938896",
      "message_id": 969296,
      "group_type": "KRC",
      "group_title": "SCM - KRC (Đối soát)",
      "store_code": "HCM19 - LVT",
      "sender_name": "SNG2-CTV- Huỳnh",
      "sender_role": "Điều Phối SCM",
      "sender_username": "@huynhscm",
      "date": "16/09/2026 08:50",
      "timestamp": 1789533000,
      "text": "Đã xác nhận biên bản giao sai số lượng rau củ ca sáng ngày 16/09. Kho KRC duyệt điều chuyển bù hàng đợt 2 cho siêu thị LVT.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969296",
      "tme_url": "https://t.me/c/1828938896/969296"
    },
    {
      "id": "msg-krc-03",
      "chat_id": "1828938896",
      "message_id": 969295,
      "group_type": "KRC",
      "group_title": "KRC - Kho Rau Củ Bánh Tươi Sài Gòn",
      "store_code": "KRCBT - HUB",
      "sender_name": "Phan Hải - QLK",
      "sender_role": "Quản Lý Kho KRC",
      "sender_username": "@haikrc",
      "date": "16/09/2026 08:35",
      "timestamp": 1789532100,
      "text": "Hàng bắp cải đà lạt đợt này về vượt sức chứa của khu lạnh A2. Yêu cầu bộ phận kho chia tải gấp sang kho phụ.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969295",
      "tme_url": "https://t.me/c/1828938896/969295"
    },
    {
      "id": "msg-krc-04",
      "chat_id": "1828938896",
      "message_id": 969294,
      "group_type": "KRC",
      "group_title": "KRC - Điều Phối Tuyến Xe",
      "store_code": "XE-08 (59C-882.19)",
      "sender_name": "Trần Văn Tâm",
      "sender_role": "Đội Xe Giao Nhận",
      "sender_username": "@tamdriver",
      "date": "16/09/2026 08:15",
      "timestamp": 1789530900,
      "text": "Xe 08 đã xuất bến KRC đi tuyến Quận 7. Dự kiến 10h15 tới ST01, 11h tới ST05.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969294",
      "tme_url": "https://t.me/c/1828938896/969294"
    },
    {
      "id": "msg-krc-05",
      "chat_id": "1828938896",
      "message_id": 969293,
      "group_type": "KRC",
      "group_title": "KRC - Khiếu Nại Chất Lượng",
      "store_code": "HCM11 - TCH",
      "sender_name": "Lê Thảo - KFM",
      "sender_role": "Kiểm Hàng",
      "sender_username": "@thaolekfm",
      "date": "16/09/2026 07:55",
      "timestamp": 1789529700,
      "text": "Mặt hàng xà lách mỡ lô 1509 bị dập nát do tài xế xếp chồng sai quy cách, đề nghị KRC xác nhận và chuyển trả NCC.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969293",
      "tme_url": "https://t.me/c/1828938896/969293"
    },
    {
      "id": "msg-krc-06",
      "chat_id": "1828938896",
      "message_id": 969292,
      "group_type": "KRC",
      "group_title": "KRC - ECG (Kho Rau Củ)",
      "store_code": "HCM05 - Q2",
      "sender_name": "Minh Trí - SC0124",
      "sender_role": "Thủ Kho",
      "sender_username": "@triminh_sc",
      "date": "16/09/2026 07:30",
      "timestamp": 1789528200,
      "text": "@@nynguyen09 Chị Ny ơi check gấp phiếu xuất TO-20260916-088 bị lệch 40kg dưa leo đèo với thực tế trên xe ạ!",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001828938896?message=969292",
      "tme_url": "https://t.me/c/1828938896/969292"
    },
    {
      "id": "msg-aba-01",
      "chat_id": "1940182741",
      "message_id": 41088,
      "group_type": "ABA",
      "group_title": "ABA - ĐIỀU PHỐI XE LẠNH HCM",
      "store_code": "ABA-COLD-01",
      "sender_name": "Nguyễn Hoàng Long",
      "sender_role": "Điều Phối ABA",
      "sender_username": "@longaba_scm",
      "date": "16/09/2026 09:12",
      "timestamp": 1789534320,
      "text": "Nhiệt độ thùng xe ABA-51D.9213 đang ở mức +4°C, bảo đảm tiêu chuẩn rau củ mát. Đang chuyển hàng sang ST Bình Thạnh.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001940182741?message=41088",
      "tme_url": "https://t.me/c/1940182741/41088"
    },
    {
      "id": "msg-aba-02",
      "chat_id": "1940182741",
      "message_id": 41085,
      "group_type": "ABA",
      "group_title": "ABA - THỊT CÁ & ĐÔNG LẠNH",
      "store_code": "DC-ABA-MEAT",
      "sender_name": "Võ Thị Tuyết",
      "sender_role": "Giám Sát ABA",
      "sender_username": "@tuyetvoaba",
      "date": "16/09/2026 08:40",
      "timestamp": 1789532400,
      "text": "Hôm nay đơn hàng thịt gà tươi giao sai quy cách đóng gói (thiếu tem truy xuất), nhờ DC hỗ trợ xác minh gấp.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001940182741?message=41085",
      "tme_url": "https://t.me/c/1940182741/41085"
    },
    {
      "id": "msg-aba-03",
      "chat_id": "1940182741",
      "message_id": 41079,
      "group_type": "ABA",
      "group_title": "ABA - GIAO NHẬN SIÊU THỊ MIỀN ĐÔNG",
      "store_code": "ABA-ROUTE-03",
      "sender_name": "Phạm Đăng",
      "sender_role": "Tài Xế ABA",
      "sender_username": "@dangdriver_aba",
      "date": "16/09/2026 07:15",
      "timestamp": 1789527300,
      "text": "Đã hoàn tất bàn giao 25 thùng rau củ mát và 15 kiện thịt cho siêu thị Biên Hòa. Ký nhận đủ, nhiệt độ đạt chuẩn.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1001940182741?message=41079",
      "tme_url": "https://t.me/c/1940182741/41079"
    },
    {
      "id": "msg-dc-01",
      "chat_id": "2019284711",
      "message_id": 58210,
      "group_type": "DC",
      "group_title": "DC TỔNG KHO MIỀN NAM - SCM",
      "store_code": "DC-KFM-BINHCHANH",
      "sender_name": "Vũ Đình Khoa",
      "sender_role": "Trưởng Ca DC",
      "sender_username": "@khoavudc",
      "date": "16/09/2026 09:05",
      "timestamp": 1789533900,
      "text": "Khu vực nhận hàng rau củ DC đang quá tải, lượng pallet về vượt sức tiếp nhận dock 3. Các xe hàng khô vui lòng chờ dock 5.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1002019284711?message=58210",
      "tme_url": "https://t.me/c/2019284711/58210"
    },
    {
      "id": "msg-dc-02",
      "chat_id": "2019284711",
      "message_id": 58204,
      "group_type": "DC",
      "group_title": "DC - ĐIỀU PHỐI ĐƠN HÀNG TO/PT",
      "store_code": "DC-DISPATCH",
      "sender_name": "Đặng Ngọc Mai",
      "sender_role": "Điều Phối DC",
      "sender_username": "@maidangdc",
      "date": "16/09/2026 08:20",
      "timestamp": 1789531200,
      "text": "Lệnh điều chuyển hàng tồn kho KRC sang DC Tây Ninh đã tạo xong trên hệ thống SCM, mã phiếu DC-TO-9982.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1002019284711?message=58204",
      "tme_url": "https://t.me/c/2019284711/58204"
    },
    {
      "id": "msg-dc-03",
      "chat_id": "2019284711",
      "message_id": 58190,
      "group_type": "DC",
      "group_title": "DC - HỖ TRỢ SIÊU THỊ KFM",
      "store_code": "DC-SUPPORT",
      "sender_name": "Lê Quốc Bảo",
      "sender_role": "Vận Hành DC",
      "sender_username": "@baole_dc",
      "date": "16/09/2026 07:00",
      "timestamp": 1789526400,
      "text": "Tất cả các siêu thị lưu ý: Hạn chót gửi đơn đặt hàng rau củ bổ sung ca chiều là 14h00. Sau giờ này hệ thống tự động khóa.",
      "image_url": "",
      "web_url": "https://web.telegram.org/a/#-1002019284711?message=58190",
      "tme_url": "https://t.me/c/2019284711/58190"
    }
  ];

  let telegramFeedItems = (typeof window !== 'undefined' && Array.isArray(window.TELEGRAM_FEED) && window.TELEGRAM_FEED.length > 0)
    ? window.TELEGRAM_FEED
    : DEFAULT_TELEGRAM_ITEMS;
  let currentTgFilter = 'ALL'; // 'ALL', 'URGENT', 'KRC', 'ABA', 'DC'
  let tgViewMode = 'cards'; // 'cards' | 'table'
  let audioAlertEnabled = true;
  let lastUrgentCount = 0;
  let currentTgDisplayLimit = 60;
  let currentTgTablePage = 1;
  const TG_PAGE_SIZE = 50;

  const tgCardsGrid = document.getElementById('telegram-cards-grid');
  const tgTableView = document.getElementById('telegram-table-view');
  const tgTableTbody = document.getElementById('telegram-table-tbody');
  const tgInputSearch = document.getElementById('tg-input-search');
  const btnTgToggleView = document.getElementById('btn-tg-toggle-view');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');

  // Danh sách từ khóa khẩn cấp cần bắt (ưu tiên cụm dài trước)
  const URGENT_KEYWORDS = [
    'điều chuyển',
    'vượt sức',
    'giao nhầm',
    'giao sai',
    'chuyển',
    '@@nynguyen09',
    '@nynguyen09'
  ];

  // Phát hiện mức độ khẩn cấp và các từ khóa có trong tin nhắn
  function detectUrgent(text) {
    if (!text) return { isUrgent: false, matchedKeys: [], isNyTagged: false };
    const lower = text.toLowerCase();
    const matchedKeys = [];
    let isNyTagged = false;

    if (lower.includes('@nynguyen09') || lower.includes('@@nynguyen09')) {
      isNyTagged = true;
      matchedKeys.push('@nynguyen09');
    }

    const checkList = ['điều chuyển', 'vượt sức', 'giao nhầm', 'giao sai', 'chuyển'];
    checkList.forEach(kw => {
      if (lower.includes(kw)) {
        matchedKeys.push(kw);
      }
    });

    return {
      isUrgent: matchedKeys.length > 0,
      matchedKeys,
      isNyTagged
    };
  }

  // Highlight từ khóa khẩn cấp trong nội dung văn bản
  function highlightTelegramText(rawText) {
    if (!rawText) return '';
    let html = escapeHtml(rawText);

    // Highlight tag Ny (@nynguyen09, @@nynguyen09)
    html = html.replace(/(@{1,2}nynguyen09)/gi, '<mark class="tg-hl-tag">$1</mark>');

    // Highlight các từ khóa khẩn cấp
    const kws = ['điều chuyển', 'vượt sức', 'giao nhầm', 'giao sai', 'chuyển'];
    kws.forEach(kw => {
      const regex = new RegExp(`(${kw})`, 'gi');
      html = html.replace(regex, '<mark class="tg-hl-keyword">$1</mark>');
    });

    // Giữ định dạng xuống dòng
    return html.replace(/\n/g, '<br>');
  }

  // Tạo URL Deep Link chuyển thẳng đến đúng vị trí tin nhắn trên Telegram Web A
  function getTelegramWebAUrl(item) {
    if (item.web_url) return item.web_url;
    const chatId = item.chat_id || (item.id && item.id.includes('_') ? item.id.split('_')[0] : '1828938896');
    const msgId = item.message_id || (item.id && item.id.includes('_') ? item.id.split('_')[1] : '1');
    const cleanChatId = String(chatId).replace(/^-100/, '').replace(/^-/, '');
    return `https://web.telegram.org/a/#-100${cleanChatId}?message=${msgId}`;
  }

  // Chuông thông báo âm thanh khi phát hiện tin khẩn cấp mới
  function playUrgentAlertSound() {
    if (!audioAlertEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  async function loadTelegramFeed() {
    if (typeof window !== 'undefined' && Array.isArray(window.TELEGRAM_FEED) && window.TELEGRAM_FEED.length > 0) {
      telegramFeedItems = window.TELEGRAM_FEED;
    } else if (!telegramFeedItems || telegramFeedItems.length === 0) {
      telegramFeedItems = DEFAULT_TELEGRAM_ITEMS;
    }
    // Render ngay lập tức dữ liệu sẵn có (không phụ thuộc vào fetch mạng hay file:///)
    renderTelegramFeed();

    // Thử fetch phiên bản mới nhất từ JSON nếu có server
    try {
      const res = await fetch('data/telegram_feed.json?t=' + Date.now());
      if (res.ok) {
        const freshData = await res.json();
        if (Array.isArray(freshData) && freshData.length > 0) {
          telegramFeedItems = freshData;
          renderTelegramFeed();
        }
      }
    } catch (e) {
      // Offline hoặc mở file:/// trực tiếp trên trình duyệt
      console.log("Đang chạy chế độ Offline / file:/// - sử dụng bộ dữ liệu tích hợp.");
    }
  }

  function renderTelegramFeed() {
    const query = (tgInputSearch ? tgInputSearch.value : '').toLowerCase().trim();

    // Tính toán phân loại cho toàn bộ tin nhắn
    const processedItems = telegramFeedItems.map(item => {
      const urgentInfo = detectUrgent(item.text);
      const normGroup = (item.group_type === 'RAU_CU' || item.group_type === 'KRC') ? 'KRC'
                      : (item.group_type === 'ABA' || (item.group_type === 'ABA_DC' && (item.group_title || '').includes('THỊT CÁ'))) ? 'ABA'
                      : 'DC';
      const webUrl = getTelegramWebAUrl(item);
      return {
        ...item,
        normGroup,
        isUrgent: urgentInfo.isUrgent,
        matchedKeys: urgentInfo.matchedKeys,
        isNyTagged: urgentInfo.isNyTagged,
        webUrl
      };
    });

    // Cập nhật số lượng trên các tab
    const countAll = processedItems.length;
    const countUrgent = processedItems.filter(x => x.isUrgent).length;
    const countKrc = processedItems.filter(x => x.normGroup === 'KRC').length;
    const countAba = processedItems.filter(x => x.normGroup === 'ABA').length;
    const countDc = processedItems.filter(x => x.normGroup === 'DC').length;

    const elCountAll = document.getElementById('tg-count-all');
    const elCountUrgent = document.getElementById('tg-count-urgent');
    const elCountKrc = document.getElementById('tg-count-krc');
    const elCountAba = document.getElementById('tg-count-aba');
    const elCountDc = document.getElementById('tg-count-dc');

    if (elCountAll) elCountAll.textContent = countAll;
    if (elCountUrgent) elCountUrgent.textContent = countUrgent;
    if (elCountKrc) elCountKrc.textContent = countKrc;
    if (elCountAba) elCountAba.textContent = countAba;
    if (elCountDc) elCountDc.textContent = countDc;

    // Kêu chuông nếu số lượng tin khẩn cấp tăng
    if (countUrgent > lastUrgentCount && lastUrgentCount > 0) {
      playUrgentAlertSound();
      showToast(`Có ${countUrgent - lastUrgentCount} tin nhắn khẩn cấp mới cần xử lý!`, '🚨');
    }
    lastUrgentCount = countUrgent;

    // Lọc theo Tab đã chọn
    let filtered = processedItems;
    if (currentTgFilter === 'URGENT') {
      filtered = filtered.filter(x => x.isUrgent);
    } else if (currentTgFilter === 'KRC') {
      filtered = filtered.filter(x => x.normGroup === 'KRC');
    } else if (currentTgFilter === 'ABA') {
      filtered = filtered.filter(x => x.normGroup === 'ABA');
    } else if (currentTgFilter === 'DC') {
      filtered = filtered.filter(x => x.normGroup === 'DC');
    }

    // Lọc theo ô tìm kiếm
    if (query) {
      filtered = filtered.filter(item => 
        (item.group_title && item.group_title.toLowerCase().includes(query)) ||
        (item.store_code && item.store_code.toLowerCase().includes(query)) ||
        (item.text && item.text.toLowerCase().includes(query)) ||
        (item.sender_name && item.sender_name.toLowerCase().includes(query)) ||
        (item.matchedKeys && item.matchedKeys.some(k => k.toLowerCase().includes(query)))
      );
    }

    // Xử lý Empty State
    if (filtered.length === 0) {
      const emptyHtml = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: #94a3b8; background: rgba(15,23,42,0.6); border-radius: 12px; border: 1px dashed var(--border-glass);">
          <div style="font-size: 2.4rem; margin-bottom: 8px;">📭</div>
          <div style="font-weight: 700; font-size: 1rem; color: #f1f5f9;">Không tìm thấy tin nhắn nào phù hợp</div>
          <div style="font-size: 0.82rem; margin-top: 6px; color: #94a3b8;">Thử chọn lại phân loại nhóm <b>Tất Cả</b>, <b>KRC</b>, <b>ABA</b> hoặc <b>DC</b></div>
        </div>
      `;
      if (tgCardsGrid) tgCardsGrid.innerHTML = emptyHtml;
      if (tgTableTbody) tgTableTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">Không có dữ liệu tin nhắn</td></tr>`;
      return;
    }

    // Sắp xếp: Ưu tiên tin khẩn cấp lên đầu, sau đó theo thời gian mới nhất (timestamp giảm dần)
    filtered.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    // Render Cards View (Phân trang mượt mà cho tập dữ liệu lớn)
    if (tgCardsGrid) {
      const displayCount = Math.min(filtered.length, currentTgDisplayLimit);
      const displayItems = filtered.slice(0, displayCount);

      let cardsHtml = '';
      displayItems.forEach(item => {
        const isKrc = item.normGroup === 'KRC';
        const isAba = item.normGroup === 'ABA';
        const groupIcon = isKrc ? '🥦' : (isAba ? '❄️' : '🏢');
        const badgeColor = isKrc ? '#34d399' : (isAba ? '#38bdf8' : '#c084fc');
        const badgeBg = isKrc ? 'rgba(16, 185, 129, 0.15)' : (isAba ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)');
        const badgeBorder = isKrc ? 'rgba(16, 185, 129, 0.4)' : (isAba ? 'rgba(56, 189, 248, 0.4)' : 'rgba(168, 85, 247, 0.4)');

        // Thẻ từ khóa khẩn cấp phát hiện được
        let kwBadgesHtml = '';
        if (item.matchedKeys && item.matchedKeys.length > 0) {
          kwBadgesHtml = `
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              ${item.matchedKeys.map(kw => {
                const isTag = kw.includes('nynguyen09');
                return `<span class="tg-kw-badge ${isTag ? 'tag-ny' : ''}">${isTag ? '🚨' : '⚠️'} ${escapeHtml(kw)}</span>`;
              }).join('')}
            </div>
          `;
        }

        const highlightedText = highlightTelegramText(item.text);

        cardsHtml += `
          <div class="tg-feed-card ${item.isUrgent ? 'urgent-card' : ''}" 
               style="background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border-glass); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: all 0.2s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.25);"
               title="Bấm để mở tin nhắn trên Telegram Web A">
            
            <!-- Card Header -->
            <div style="padding: 14px 16px 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="display: flex; gap: 10px; align-items: center;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
                  ${groupIcon}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: #f8fafc; line-height: 1.3;">
                    ${escapeHtml(item.group_title)}
                  </div>
                  <div style="font-size: 0.73rem; color: #94a3b8; margin-top: 3px; display: flex; gap: 6px; align-items: center;">
                    <span style="color: ${badgeColor}; font-weight: 700; background: ${badgeBg}; padding: 1px 6px; border-radius: 4px;">${item.normGroup}</span>
                    <span>•</span>
                    <span>${escapeHtml(item.sender_name)}</span>
                  </div>
                </div>
              </div>
              
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                ${item.isUrgent ? '<span class="badge-urgent-pulse">🚨 KHẨN CẤP</span>' : ''}
                <span style="font-size: 0.72rem; color: #64748b; white-space: nowrap;">${item.date}</span>
              </div>
            </div>

            <!-- Urgent Keywords Strip -->
            ${kwBadgesHtml ? `<div style="padding: 6px 16px 0;">${kwBadgesHtml}</div>` : ''}

            <!-- Message Content -->
            <div style="padding: 12px 16px; font-size: 0.84rem; color: #cbd5e1; flex: 1; line-height: 1.5; word-break: break-word;">
              ${highlightedText}
            </div>

            <!-- Attached Image (if any) -->
            ${item.image_url ? `
              <div style="padding: 0 16px 12px;">
                <div class="tg-img-wrapper" data-img="${item.image_url}" data-cap="${escapeHtml(item.group_title)} - ${escapeHtml(item.date)}" style="position: relative; border-radius: 10px; overflow: hidden; height: 190px; background: #000; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
                  <img src="${item.image_url}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.25s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                  <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    🔍 Xem ảnh lớn
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Direct Link Action Button -->
            <div style="padding: 0 16px 14px; margin-top: auto;">
              <a href="${item.webUrl}" target="_blank" rel="noopener noreferrer" class="btn-open-tele-web" onclick="event.stopPropagation();">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                <span>Chuyển Đến Tin Nhắn (Telegram Web A)</span>
              </a>
            </div>
          </div>
        `;
      });

      if (filtered.length > displayCount) {
        const remaining = filtered.length - displayCount;
        cardsHtml += `
          <div style="grid-column: 1/-1; text-align: center; padding: 24px 0 10px;">
            <button id="btn-tg-load-more" class="btn btn-primary" style="padding: 12px 28px; font-size: 0.92rem; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 16px rgba(56,189,248,0.35);">
              📥 Tải Thêm 60 Tin Nhắn Tiếp Theo (Đang xem ${displayCount.toLocaleString()} / ${filtered.length.toLocaleString()} tin)
            </button>
          </div>
        `;
      }

      tgCardsGrid.innerHTML = cardsHtml;

      const btnLoadMore = document.getElementById('btn-tg-load-more');
      if (btnLoadMore) {
        btnLoadMore.addEventListener('click', () => {
          currentTgDisplayLimit += 60;
          renderTelegramFeed();
        });
      }
    }

    // Render Table View (Có phân trang 50 tin/trang)
    if (tgTableTbody) {
      const totalPages = Math.ceil(filtered.length / TG_PAGE_SIZE) || 1;
      if (currentTgTablePage > totalPages) currentTgTablePage = totalPages;
      const startIdx = (currentTgTablePage - 1) * TG_PAGE_SIZE;
      const pageItems = filtered.slice(startIdx, startIdx + TG_PAGE_SIZE);

      let tableHtml = '';
      pageItems.forEach((item, idx) => {
        const isKrc = item.normGroup === 'KRC';
        const isAba = item.normGroup === 'ABA';
        const badgeColor = isKrc ? '#34d399' : (isAba ? '#38bdf8' : '#c084fc');
        const badgeBg = isKrc ? 'rgba(16, 185, 129, 0.15)' : (isAba ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)');

        const highlightedText = highlightTelegramText(item.text);

        tableHtml += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${item.isUrgent ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
            <td style="text-align: center; color: #64748b;">${startIdx + idx + 1}</td>
            <td style="text-align: center;">
              ${item.isUrgent 
                ? '<span class="badge-urgent-pulse">🚨 KHẨN CẤP</span>' 
                : '<span style="color: #64748b; font-size: 0.74rem;">Bình thường</span>'}
            </td>
            <td style="text-align: center;">
              <span style="color: ${badgeColor}; font-weight: 700; background: ${badgeBg}; padding: 2px 7px; border-radius: 4px; font-size: 0.74rem;">
                ${item.normGroup}
              </span>
            </td>
            <td>
              <div style="font-weight: 700; color: #f8fafc; font-size: 0.82rem;">${escapeHtml(item.group_title)}</div>
              ${item.store_code ? `<div style="font-size: 0.72rem; color: #94a3b8;">Mã ST: <b style="color: #38bdf8;">${escapeHtml(item.store_code)}</b></div>` : ''}
            </td>
            <td>
              <div style="font-weight: 600; color: #e2e8f0; font-size: 0.8rem;">${escapeHtml(item.sender_name)}</div>
              ${item.sender_role ? `<div style="font-size: 0.7rem; color: #64748b;">${escapeHtml(item.sender_role)}</div>` : ''}
            </td>
            <td style="text-align: center; font-size: 0.74rem; color: #94a3b8; white-space: nowrap;">
              ${item.date}
            </td>
            <td style="line-height: 1.45; font-size: 0.8rem; color: #cbd5e1; max-width: 420px;">
              ${highlightedText}
            </td>
            <td style="text-align: center; white-space: nowrap;">
              <a href="${item.webUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.76rem; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; text-decoration: none; padding: 5px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                <span>✈️ Mở Web A</span>
              </a>
            </td>
          </tr>
        `;
      });
      tgTableTbody.innerHTML = tableHtml;
    }
  }

  // Toggle giữa Dạng Thẻ và Dạng Bảng
  if (btnTgToggleView) {
    btnTgToggleView.addEventListener('click', () => {
      if (tgViewMode === 'cards') {
        tgViewMode = 'table';
        if (tgCardsGrid) tgCardsGrid.style.display = 'none';
        if (tgTableView) tgTableView.style.display = 'block';
        btnTgToggleView.innerHTML = '📇 Xem Dạng Thẻ';
        btnTgToggleView.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        btnTgToggleView.style.color = '#c084fc';
      } else {
        tgViewMode = 'cards';
        if (tgCardsGrid) tgCardsGrid.style.display = 'grid';
        if (tgTableView) tgTableView.style.display = 'none';
        btnTgToggleView.innerHTML = '📋 Xem Dạng Bảng';
        btnTgToggleView.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        btnTgToggleView.style.color = '#38bdf8';
      }
    });
  }

  // Bật/Tắt Chuông báo
  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      audioAlertEnabled = !audioAlertEnabled;
      btnToggleAudio.innerHTML = audioAlertEnabled ? '🔔 Chuông Báo: Bật' : '🔕 Chuông Báo: Tắt';
      btnToggleAudio.style.color = audioAlertEnabled ? '#fbbf24' : '#64748b';
      btnToggleAudio.style.borderColor = audioAlertEnabled ? 'rgba(245, 158, 11, 0.4)' : 'rgba(100, 116, 139, 0.3)';
      showToast(audioAlertEnabled ? 'Đã BẬT chuông báo tin khẩn cấp' : 'Đã TẮT chuông báo', audioAlertEnabled ? '🔔' : '🔕');
      if (audioAlertEnabled) playUrgentAlertSound();
    });
  }

  // Delegated click on card to open Telegram Web A
  if (tgCardsGrid) {
    tgCardsGrid.addEventListener('click', (e) => {
      // Nếu click vào nút xem ảnh lớn thì không mở link
      if (e.target.closest('.tg-img-wrapper')) return;

      const card = e.target.closest('.tg-feed-card');
      if (card) {
        const link = card.querySelector('.btn-open-tele-web');
        if (link && link.href) {
          window.open(link.href, '_blank');
        }
      }
    });
  }

  // Delegated click on images in feed (Lightbox)
  if (tgCardsGrid) {
    tgCardsGrid.addEventListener('click', (e) => {
      const wrap = e.target.closest('.tg-img-wrapper');
      if (wrap) {
        e.stopPropagation();
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
      modal.style.display = 'flex';
    }
  };

  const btnCloseLightbox = document.getElementById('btn-lightbox-close');
  const modalLightbox = document.getElementById('modal-lightbox');
  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', () => {
      modalLightbox.classList.remove('active');
      modalLightbox.style.display = 'none';
    });
  }
  if (modalLightbox) {
    modalLightbox.addEventListener('click', (e) => {
      if (e.target === modalLightbox) {
        modalLightbox.classList.remove('active');
        modalLightbox.style.display = 'none';
      }
    });
  }

  // Global backdrop click to close any active modal
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
    });
  });

  // Group Filter Tabs Click Events
  document.querySelectorAll('.tg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tg-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTgFilter = btn.getAttribute('data-tg-group');
      currentTgDisplayLimit = 60;
      currentTgTablePage = 1;
      renderTelegramFeed();
    });
  });

  if (tgInputSearch) tgInputSearch.addEventListener('input', () => {
    currentTgDisplayLimit = 60;
    currentTgTablePage = 1;
    renderTelegramFeed();
  });

  const btnRefreshTg = document.getElementById('btn-refresh-telegram');
  if (btnRefreshTg) {
    btnRefreshTg.addEventListener('click', () => {
      btnRefreshTg.innerText = '⏳ Đang làm mới...';
      loadTelegramFeed().then(() => {
        btnRefreshTg.innerText = '🔄 Làm Mới';
        showToast('Đã cập nhật danh sách tin nhắn Telegram mới nhất!', '🔄');
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
  loadTelegramFeed();
  switchViewMode('analytics');

  // Start Realtime Auto Sync countdown immediately
  resetAutoSyncTimer();

  }

  // Khởi chạy ngay lập tức khi tải trang
  initStream3();
});
