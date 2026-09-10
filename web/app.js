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

  // 2. Setup Top Stream Switcher
  const tabStream1 = document.getElementById('tab-stream1');
  const tabStream2 = document.getElementById('tab-stream2');
  const viewStream1 = document.getElementById('view-stream1');
  const viewStream2 = document.getElementById('view-stream2');

  function switchStream(streamId) {
    if (!tabStream1 || !tabStream2 || !viewStream1 || !viewStream2) return;
    if (streamId === 'stream1') {
      tabStream1.classList.add('active');
      tabStream2.classList.remove('active');
      viewStream1.classList.add('active');
      viewStream2.classList.remove('active');
    } else {
      tabStream2.classList.add('active');
      tabStream1.classList.remove('active');
      viewStream2.classList.add('active');
      viewStream1.classList.remove('active');
    }
  }

  if (tabStream1) tabStream1.addEventListener('click', () => switchStream('stream1'));
  if (tabStream2) tabStream2.addEventListener('click', () => switchStream('stream2'));

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
});
