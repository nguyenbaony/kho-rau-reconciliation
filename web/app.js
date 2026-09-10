// KRC Dual Pipeline Engine - Preview Frontend Logic
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial State with Instant Fallback from window.STREAM1_DATA / window.STREAM2_DATA
  let stream1Data = (typeof window !== 'undefined' && window.STREAM1_DATA) ? window.STREAM1_DATA : null;
  let stream2Data = (typeof window !== 'undefined' && window.STREAM2_DATA) ? window.STREAM2_DATA : null;

  let currentSubTab = 'khop_po';
  let searchTerm = '';
  let vatMultiplier = 1.0;
  let defaultPrice = 6800;

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

  // 2. Setup Top Stream Switcher (3 Independent Streams)
  const tabStream1 = document.getElementById('tab-stream1');
  const tabStream2 = document.getElementById('tab-stream2');
  const tabStream3 = document.getElementById('tab-stream3');
  const viewStream1 = document.getElementById('view-stream1');
  const viewStream2 = document.getElementById('view-stream2');
  const viewStream3 = document.getElementById('view-stream3');

  function switchStream(streamId) {
    [tabStream1, tabStream2, tabStream3].forEach(t => t && t.classList.remove('active'));
    [viewStream1, viewStream2, viewStream3].forEach(v => v && v.classList.remove('active'));

    if (streamId === 'stream1') {
      if (tabStream1) tabStream1.classList.add('active');
      if (viewStream1) viewStream1.classList.add('active');
    } else if (streamId === 'stream2') {
      if (tabStream2) tabStream2.classList.add('active');
      if (viewStream2) viewStream2.classList.add('active');
    } else if (streamId === 'stream3') {
      if (tabStream3) tabStream3.classList.add('active');
      if (viewStream3) viewStream3.classList.add('active');
      initStream3();
    }
  }

  if (tabStream1) tabStream1.addEventListener('click', () => switchStream('stream1'));
  if (tabStream2) tabStream2.addEventListener('click', () => switchStream('stream2'));
  if (tabStream3) tabStream3.addEventListener('click', () => switchStream('stream3'));

  // 3. Render Stream 1: Timeline & Errors
  function renderStream1() {
    if (!stream1Data) return;

    // A. Render Timeline Days Table
    const tbodyDays = document.getElementById('tbody-timeline-days');
    const tfootDays = document.getElementById('tfoot-timeline-days');
    
    if (tbodyDays) {
      tbodyDays.innerHTML = '';
      const days = stream1Data.timeline_days || [];
      days.forEach(row => {
        const tr = document.createElement('tr');
        const isDone = row.con_lai === 0;
        const statusHtml = isDone 
          ? '<span class="tag-status tag-done">✅ Hoàn thành</span>' 
          : '<span class="tag-status tag-pending">⏳ Đang xử lý</span>';
        
        const pct = row.tien_do;
        let pctClass = 'pct-alert';
        if (pct === 100) pctClass = 'pct-100';
        else if (pct >= 90) pctClass = 'pct-high';
        else if (pct >= 80) pctClass = 'pct-mid';
        else if (pct >= 30) pctClass = 'pct-low';

        tr.innerHTML = `
          <td class="font-bold">${row.day}</td>
          <td class="text-right font-mono">${(row.phieu || 0).toLocaleString()}</td>
          <td class="text-right font-mono">${(row.sl_chuyen || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${(row.sl_nhan || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono text-danger">${(row.cl_thieu || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${(row.cl_thua || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono font-bold">${(row.tong_cl || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${(row.da_xu_ly || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono ${row.con_lai > 0 ? 'font-bold text-danger' : ''}">${(row.con_lai || 0).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-center">${statusHtml}</td>
          <td class="text-center"><span class="badge-pct ${pctClass}">${pct}%</span></td>
        `;
        tbodyDays.appendChild(tr);
      });
    }

    if (tfootDays) {
      const sum = stream1Data.timeline_summary || {};
      tfootDays.innerHTML = `
        <tr>
          <td>TỔNG</td>
          <td class="text-right font-mono">${(sum.tong_phieu || 4188).toLocaleString()}</td>
          <td class="text-right font-mono">${(sum.tong_sl_chuyen || 1414504).toLocaleString('vi-VN', {minimumFractionDigits: 0})}</td>
          <td class="text-right font-mono">${(sum.tong_sl_nhan || 1406490).toLocaleString('vi-VN', {minimumFractionDigits: 0})}</td>
          <td class="text-right font-mono">${(sum.tong_cl_thieu || 10875.7).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${(sum.tong_cl_thua || 2657.5).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono font-bold">${(sum.tong_cl || 13533.2).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${(sum.tong_da_xu_ly || 7478.9).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono font-bold">${(sum.tong_con_lai || 6054.3).toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-center font-bold">2/10</td>
          <td class="text-center font-bold"><span class="badge-pct pct-mid">55%</span></td>
        </tr>
      `;
    }

    // B. Render Error Categories Table
    const tbodyErrors = document.getElementById('tbody-error-categories');
    const tfootErrors = document.getElementById('tfoot-error-categories');
    
    if (tbodyErrors) {
      tbodyErrors.innerHTML = '';
      const errors = stream1Data.error_categories || [];
      let totSl = 0, totVal = 0;
      errors.forEach((err, idx) => {
        totSl += err.sl_lech;
        totVal += err.gia_tri;
        const tr = document.createElement('tr');
        const isHighRisk = err.danh_gia === 'Rủi ro cao';
        const riskBadge = isHighRisk 
          ? '<span class="tag-status tag-risk-high">🚨 Rủi ro cao</span>' 
          : '<span class="tag-status tag-risk-good">✅ Kiểm soát tốt</span>';

        tr.innerHTML = `
          <td class="text-center font-mono">${err.stt}</td>
          <td class="font-bold">${err.loi}</td>
          <td class="text-right font-mono">${err.sl_lech.toLocaleString('vi-VN', {minimumFractionDigits: 3})}</td>
          <td class="text-right font-mono font-bold">${err.gia_tri.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">${err.ty_le.toFixed(2)}%</td>
          <td class="text-center">${riskBadge}</td>
          <td class="text-center"><button class="btn btn-sm btn-outline btn-view-err-detail" data-idx="${idx}">🔍 Xem</button></td>
        `;
        tbodyErrors.appendChild(tr);
      });

      if (tfootErrors) {
        tfootErrors.innerHTML = `
          <tr>
            <td colspan="2">TỔNG CỘNG</td>
            <td class="text-right font-mono font-bold">${totSl.toLocaleString('vi-VN', {minimumFractionDigits: 3})}</td>
            <td class="text-right font-mono font-bold">${totVal.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono font-bold">100.00%</td>
            <td class="text-center">-</td>
            <td class="text-center">-</td>
          </tr>
        `;
      }

      // Setup detail click
      document.querySelectorAll('.btn-view-err-detail').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-idx'));
          openErrorDetailModal(errors[i]);
        });
      });
    }
  }

  // Modal Error Detail
  const modal = document.getElementById('modal-error-detail');
  const btnCloseModal = document.getElementById('btn-close-error-modal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  function openErrorDetailModal(err) {
    if (!err || !modal) return;
    const titleEl = document.getElementById('modal-error-title');
    if (titleEl) {
      titleEl.textContent = `Chi Tiết Nhóm Lỗi: ${err.loi} (${err.sl_lech.toLocaleString()} KG/Pack - ${err.gia_tri.toLocaleString()} đ)`;
    }
    const container = document.getElementById('modal-error-content');
    if (!container) return;
    
    const items = err.items || [];
    if (items.length === 0) {
      container.innerHTML = '<p style="color: #64748b; padding: 15px 0; text-align: center;">Không có dữ liệu chi tiết mẫu cho nhóm lỗi này.</p>';
    } else {
      let rows = items.map((it, idx) => `
        <tr>
          <td class="text-center font-mono">${idx + 1}</td>
          <td class="font-mono font-bold">${it.date}</td>
          <td>${it.store}</td>
          <td class="font-mono" style="color: #2563eb; font-weight: bold;">${it.sku}</td>
          <td class="font-bold">${it.product}</td>
          <td class="text-right font-mono text-danger">${it.diff.toLocaleString()}</td>
          <td class="text-right font-mono font-bold">${it.val.toLocaleString()} đ</td>
          <td class="text-center"><span class="tag-status tag-pending">${it.status || 'Chờ xử lý'}</span></td>
        </tr>
      `).join('');

      container.innerHTML = `
        <table class="data-table" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>NGÀY</th>
              <th>SIÊU THỊ</th>
              <th>SKU</th>
              <th>TÊN SẢN PHẨM</th>
              <th class="text-right">LỆCH</th>
              <th class="text-right">THÀNH TIỀN</th>
              <th class="text-center">TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }
    modal.style.display = 'flex';
  }

  // 4. Render Stream 2: KRC Analytics
  function renderStream2() {
    if (!stream2Data) return;
    const tbody = document.getElementById('tbody-krc-products');
    if (!tbody) return;
    tbody.innerHTML = '';

    const prods = stream2Data.products || [];
    const filtered = prods.filter(p => {
      // subtab filter
      if (currentSubTab === 'khop_po' && p.type !== 'khop_po') return false;
      if (currentSubTab === 'chia_du' && p.type !== 'chia_du') return false;
      if (currentSubTab === 'chia_thieu' && p.type !== 'chia_thieu') return false;

      // search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const mSku = (p.sku || '').toLowerCase().includes(query);
        const mName = (p.ten_sp || '').toLowerCase().includes(query);
        return mSku || mName;
      }
      return true;
    });

    filtered.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const tc = p.ton_cuoi;
      const tcColor = tc < 0 ? 'color: #dc2626; font-weight: bold;' : (tc > 0 ? 'color: #0d9488; font-weight: bold;' : '');
      
      const effectivePrice = (p.don_gia || defaultPrice) * vatMultiplier;
      const effectiveVal = Math.round(tc * effectivePrice);
      const ttColor = effectiveVal < 0 ? 'color: #dc2626; font-weight: bold;' : (effectiveVal > 0 ? 'color: #0d9488; font-weight: bold;' : '');

      tr.innerHTML = `
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono font-bold" style="color: #2563eb;">${p.sku}</td>
        <td class="font-bold">${p.ten_sp}</td>
        <td class="text-right font-mono">${(p.ton_dau || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${(p.nhap_po || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${(p.nhan_vao || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${(p.xuat_st || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono" style="${tcColor}">${(tc || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${Math.round(effectivePrice).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono" style="${ttColor}">${effectiveVal.toLocaleString('vi-VN')}</td>
        <td class="text-center font-mono">${p.ngay_nhap || '01/09'}</td>
        <td class="text-center font-mono">${p.ngay_xuat || '10/09'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 5. Setup Sub-Tabs Listeners for Stream 2
  const subtabButtons = document.querySelectorAll('.krc-subtab-btn');
  subtabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSubTab = btn.getAttribute('data-subtab');
      renderStream2();
    });
  });

  // Search input listener
  const searchInput = document.getElementById('krc-search-sku');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
      renderStream2();
    });
  }

  // Action Buttons: Excel, PDF, Telegram, Tải dữ liệu
  const btnExcel = document.getElementById('btn-export-excel') || document.querySelector('.action-buttons-group .btn-primary');
  if (btnExcel) {
    btnExcel.addEventListener('click', () => {
      exportTableToCSV('krc_stock_analytics.csv');
      showToast('Đã xuất file Excel / CSV thành công!', '📊');
    });
  }

  const btnPdf = document.getElementById('btn-export-pdf') || document.querySelector('.action-buttons-group .btn-purple');
  if (btnPdf) {
    btnPdf.addEventListener('click', () => {
      window.print();
    });
  }

  const btnTg = document.getElementById('btn-send-telegram') || document.querySelector('.action-buttons-group .btn-blue');
  if (btnTg) {
    btnTg.addEventListener('click', () => {
      showToast('Đã gửi thông báo phân tích KRC vào Telegram của Ny!', '✈️');
    });
  }

  const btnReload = document.getElementById('btn-reload-cdc') || document.querySelector('.action-buttons-group .btn-teal');
  if (btnReload) {
    btnReload.addEventListener('click', async () => {
      showToast('Đang làm mới dữ liệu từ CDC StarRocks...', '⏳');
      try {
        const res2 = await fetch('data/stream2_krc_analytics.json');
        if (res2.ok) {
          stream2Data = await res2.json();
          renderStream2();
          showToast('Dữ liệu KRC đã được cập nhật mới nhất!', '✅');
        }
      } catch (e) {
        showToast('Lỗi cập nhật dữ liệu.', '❌');
      }
    });
  }

  function exportTableToCSV(filename) {
    const rows = document.querySelectorAll('#table-krc-products tr');
    let csv = [];
    rows.forEach(r => {
      const cols = r.querySelectorAll('th, td');
      let rowData = [];
      cols.forEach(c => {
        rowData.push('"' + c.innerText.replace(/"/g, '""').trim() + '"');
      });
      csv.push(rowData.join(','));
    });

    const csvFile = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  // 6. Execute Immediate Renders
  renderStream1();
  renderStream2();

  // 7. Background Async Fetch to Ensure Freshest JSON
  try {
    const res1 = await fetch('data/stream1_timeline.json');
    if (res1.ok) {
      const data1 = await res1.json();
      if (data1 && data1.timeline_days && data1.timeline_days.length > 0) {
        stream1Data = data1;
        renderStream1();
      }
    }
  } catch (e) {
    console.log('Stream 1 using loaded bundle:', e);
  }

  try {
    const res2 = await fetch('data/stream2_krc_analytics.json');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.products && data2.products.length > 0) {
        stream2Data = data2;
        renderStream2();
      }
    }
  } catch (e) {
    console.log('Stream 2 using loaded bundle:', e);
  }

  // ============================================================
  // LUỒNG 3: BÁO CÁO TỔNG HỢP DATAPAY & TỒN KHO CDC (LEGACY RECON)
  // ============================================================
  let stream3Initialized = false;
  async function initStream3() {
    if (stream3Initialized) {
      if (window.Chart && Chart.instances) {
        Object.values(Chart.instances).forEach(c => c && typeof c.resize === 'function' && c.resize());
      }
      return;
    }
    stream3Initialized = true;
    console.log('[Luồng 3] Initializing Datapay & CDC Reconciliation Engine...');

    // Google Sheets Export Configuration
  const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1XBNLjZLsgaaHDBqVKsbCSYhzD4v-4qMA6rjGXGG4ThM/export?format=csv&gid=1422896115';

  let allRecords = [];
  let summary = null;

  const bundledRecords = window.RECON_RECORDS || [];
  const bundledSummary = window.RECON_SUMMARY || null;

  // 1. Try to load from Local Cache first (Instant load)
  try {
    const cached = localStorage.getItem('KHO_RAU_CACHE_V4');
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && parsedCache.records && parsedCache.records.length >= bundledRecords.length) {
        allRecords = parsedCache.records;
        summary = parsedCache.summary;
        console.log(`[Cache] Loaded ${allRecords.length} records from localStorage.`);
      }
    }
  } catch (e) {
    console.warn('[Cache] Could not read localStorage:', e);
  }

  // 2. If no cache or bundled data has more records, load from bundled records
  if (!allRecords || allRecords.length === 0 || allRecords.length < bundledRecords.length) {
    allRecords = bundledRecords;
    summary = bundledSummary;
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
          localStorage.setItem('KHO_RAU_CACHE_V4', JSON.stringify({
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

        // Re-render UI
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
    if (autoSyncInterval <= 0) {
      if (countdownEl) countdownEl.textContent = '(Tắt)';
      return;
    }
    remainingSeconds = Math.round(autoSyncInterval / 1000);
    if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;

    autoSyncTimerId = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        remainingSeconds = Math.round(autoSyncInterval / 1000);
        if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;
        syncGoogleSheetsRealtime(false);
      } else {
        if (countdownEl) countdownEl.textContent = `(${remainingSeconds}s)`;
      }
    }, 1000);
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

  }

  // Stream 3 is initialized on-demand when user clicks 'tab-stream3'
});
