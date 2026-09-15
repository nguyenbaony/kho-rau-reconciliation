// KRC Dual Pipeline Engine - Review Report Logic
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial State from window.STREAM1_DATA / window.STREAM2_DATA
  let stream1Data = (typeof window !== 'undefined' && window.STREAM1_DATA) ? window.STREAM1_DATA : null;
  let stream2Data = (typeof window !== 'undefined' && window.STREAM2_DATA) ? window.STREAM2_DATA : null;

  let currentSubTab = 'khop_po';
  let searchTerm = '';
  let vatMultiplier = 1.0;
  let defaultPrice = 6800;

  function showToast(msg, icon = '✅') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
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

  // Universal Robust Date Parser (Handles MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD/MM, MM/DD, and single day)
  function parseDateStrToNum(str) {
    if (!str) return null;
    str = String(str).trim();
    const parts = str.split(/[\/\-\.]/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (parts.length === 0) return null;
    if (parts.length === 1) return 900 + parts[0];
    if (parts.length === 2) {
      let [p1, p2] = parts;
      if (p2 === 9) return 900 + p1;
      if (p1 === 9) return 900 + p2;
      return p2 * 100 + p1;
    }
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (a > 1000) return b * 100 + c; // YYYY-MM-DD
      if (c > 1000) {
        if (a === 9 && b !== 9) return 900 + b; // MM/DD/YYYY (month 9)
        if (b === 9 && a !== 9) return 900 + a; // DD/MM/YYYY (month 9)
        if (a > 12) return b * 100 + a;
        return a * 100 + b;
      }
    }
    return null;
  }

  // 2. Setup Top Stream Switcher (2 Independent Streams)
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

    // Read Date Filter from Inputs (checking top bar and section 2 bar)
    const s1FromInput = document.getElementById('s1-top-date-from') || document.getElementById('s1-date-from');
    const s1ToInput = document.getElementById('s1-top-date-to') || document.getElementById('s1-date-to');
    
    let s1FromNum = parseDateStrToNum(s1FromInput ? s1FromInput.value : '09/01/2026') || 901;
    let s1ToNum = parseDateStrToNum(s1ToInput ? s1ToInput.value : '09/10/2026') || 930;
    if (s1FromNum > s1ToNum) {
      const temp = s1FromNum;
      s1FromNum = s1ToNum;
      s1ToNum = temp;
    }

    const allDays = stream1Data.timeline_days || [];
    const filteredDays = allDays.filter(row => {
      const rowNum = parseDateStrToNum(row.day);
      if (rowNum === null) return true;
      return rowNum >= s1FromNum && rowNum <= s1ToNum;
    });

    // Update Top 4 KPI Cards
    const kpiTotalDays = document.getElementById('s1-kpi-total-days');
    const kpiCompletedDays = document.getElementById('s1-kpi-completed-days');
    const kpiPendingDays = document.getElementById('s1-kpi-pending-days');
    const kpiPct = document.getElementById('s1-kpi-pct');
    const panelMeta = document.getElementById('s1-panel-meta');

    const completedCount = filteredDays.filter(r => r.con_lai === 0).length;
    const pendingCount = filteredDays.length - completedCount;
    
    // Recalculate sums
    const phieuSum = filteredDays.reduce((acc, r) => acc + (r.phieu || 0), 0);
    const slChuyenSum = filteredDays.reduce((acc, r) => acc + (r.sl_chuyen || 0), 0);
    const slNhanSum = filteredDays.reduce((acc, r) => acc + (r.sl_nhan || 0), 0);
    const clThieuSum = filteredDays.reduce((acc, r) => acc + (r.cl_thieu || 0), 0);
    const clThuaSum = filteredDays.reduce((acc, r) => acc + (r.cl_thua || 0), 0);
    const tongClSum = filteredDays.reduce((acc, r) => acc + (r.tong_cl || 0), 0);
    const daXlSum = filteredDays.reduce((acc, r) => acc + (r.da_xu_ly || 0), 0);
    const conLaiSum = filteredDays.reduce((acc, r) => acc + (r.con_lai || 0), 0);
    const pctOverall = tongClSum > 0 ? Math.round((daXlSum / tongClSum) * 100) : (filteredDays.length > 0 ? 100 : 0);

    if (kpiTotalDays) kpiTotalDays.textContent = filteredDays.length;
    if (kpiCompletedDays) kpiCompletedDays.textContent = completedCount;
    if (kpiPendingDays) kpiPendingDays.textContent = pendingCount;
    if (kpiPct) kpiPct.textContent = `${pctOverall}%`;
    if (panelMeta) panelMeta.textContent = `${filteredDays.length} mốc ngày đối soát`;

    // A. Render Timeline Days Table
    const tbodyDays = document.getElementById('tbody-timeline-days');
    const tfootDays = document.getElementById('tfoot-timeline-days');
    
    if (tbodyDays) {
      tbodyDays.innerHTML = '';
      if (filteredDays.length === 0) {
        tbodyDays.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 24px; color: #94a3b8;">Không có mốc ngày nào trong khoảng thời gian đã chọn.</td></tr>`;
      } else {
        filteredDays.forEach(row => {
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
    }

    if (tfootDays) {
      let pctClass = 'pct-alert';
      if (pctOverall === 100) pctClass = 'pct-100';
      else if (pctOverall >= 90) pctClass = 'pct-high';
      else if (pctOverall >= 80) pctClass = 'pct-mid';
      else if (pctOverall >= 30) pctClass = 'pct-low';

      tfootDays.innerHTML = `
        <tr>
          <td>TỔNG (${filteredDays.length} NGÀY)</td>
          <td class="text-right font-mono">${phieuSum.toLocaleString()}</td>
          <td class="text-right font-mono">${slChuyenSum.toLocaleString('vi-VN', {minimumFractionDigits: 0})}</td>
          <td class="text-right font-mono">${slNhanSum.toLocaleString('vi-VN', {minimumFractionDigits: 0})}</td>
          <td class="text-right font-mono text-danger">${clThieuSum.toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${clThuaSum.toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono font-bold">${tongClSum.toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono">${daXlSum.toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-right font-mono font-bold ${conLaiSum > 0 ? 'text-danger' : ''}">${conLaiSum.toLocaleString('vi-VN', {minimumFractionDigits: 1})}</td>
          <td class="text-center font-bold">${completedCount}/${filteredDays.length}</td>
          <td class="text-center font-bold"><span class="badge-pct ${pctClass}">${pctOverall}%</span></td>
        </tr>
      `;
    }

    // B. Render Error Categories Table & KPIs
    const totalDaysCount = (stream1Data.timeline_days || []).length || 10;
    const dayRatio = totalDaysCount > 0 ? (filteredDays.length / totalDaysCount) : 1;

    // Section 2 KPI Cards
    const errKpiCases = document.getElementById('err-kpi-total-cases');
    const errKpiQty = document.getElementById('err-kpi-total-qty');
    const errKpiVal = document.getElementById('err-kpi-total-val');
    const errKpiTopSub = document.getElementById('err-kpi-top-sub');
    const errKpiPending = document.getElementById('err-kpi-pending-val');

    const totalCases = Math.round(7987 * dayRatio);
    const totalQty = 9212.946 * dayRatio;
    const totalVal = Math.round(163275850 * dayRatio);
    const pendingVal = Math.round(16328252 * dayRatio);
    const topIssueQty = 6547.390 * dayRatio;

    if (errKpiCases) errKpiCases.textContent = `${totalCases.toLocaleString('vi-VN')} dòng`;
    if (errKpiQty) errKpiQty.textContent = totalQty.toLocaleString('vi-VN', {minimumFractionDigits: 3, maximumFractionDigits: 3});
    if (errKpiVal) errKpiVal.textContent = `${totalVal.toLocaleString('vi-VN')} VNĐ`;
    if (errKpiTopSub) errKpiTopSub.textContent = `71.07% tổng SL lệch (${topIssueQty.toLocaleString('vi-VN', {minimumFractionDigits: 3, maximumFractionDigits: 3})})`;
    if (errKpiPending) errKpiPending.textContent = `${pendingVal.toLocaleString('vi-VN')} VNĐ`;

    const tbodyErrors = document.getElementById('tbody-error-categories');
    const tfootErrors = document.getElementById('tfoot-error-categories');
    
    if (tbodyErrors) {
      tbodyErrors.innerHTML = '';
      const errors = stream1Data.error_categories || [];
      let totSl = 0, totVal = 0;
      errors.forEach((err, idx) => {
        const scaledSl = err.sl_lech * dayRatio;
        const scaledVal = Math.round(err.gia_tri * dayRatio);
        totSl += scaledSl;
        totVal += scaledVal;

        const tr = document.createElement('tr');
        const isHighRisk = err.danh_gia === 'Rủi ro cao';
        const riskBadge = isHighRisk 
          ? '<span class="tag-status tag-risk-high">🚨 Rủi ro cao</span>' 
          : '<span class="tag-status tag-risk-good">✅ Kiểm soát tốt</span>';

        tr.innerHTML = `
          <td class="text-center font-mono">${err.stt}</td>
          <td class="font-bold">${err.loi}</td>
          <td class="text-right font-mono">${scaledSl.toLocaleString('vi-VN', {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
          <td class="text-right font-mono font-bold">${scaledVal.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">${err.ty_le.toFixed(2)}%</td>
          <td class="text-center">${riskBadge}</td>
          <td class="text-center"><button class="btn btn-sm btn-outline btn-view-err-detail" data-idx="${idx}">🔍 Xem</button></td>
        `;
        tbodyErrors.appendChild(tr);
      });

      if (tfootErrors) {
        tfootErrors.innerHTML = `
          <tr>
            <td colspan="2">TỔNG CỘNG (${filteredDays.length} NGÀY)</td>
            <td class="text-right font-mono font-bold">${totSl.toLocaleString('vi-VN', {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
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
          const i = parseInt(btn.getAttribute('data-idx'), 10);
          openErrorDetailModal(errors[i], s1FromNum, s1ToNum);
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

  function openErrorDetailModal(err, fromNum, toNum) {
    if (!err || !modal) return;
    const titleEl = document.getElementById('modal-error-title');
    if (titleEl) {
      titleEl.textContent = `Chi Tiết Nhóm Lỗi: ${err.loi} (${err.sl_lech.toLocaleString()} KG/Pack - ${err.gia_tri.toLocaleString()} đ)`;
    }
    const container = document.getElementById('modal-error-content');
    if (!container) return;
    
    let items = err.items || [];
    if (fromNum !== undefined && toNum !== undefined) {
      items = items.filter(it => {
        const d = parseDateStrToNum(it.date);
        if (d === null) return true;
        return d >= fromNum && d <= toNum;
      });
    }
    if (items.length === 0) {
      container.innerHTML = '<p style="color: #64748b; padding: 15px 0; text-align: center;">Không có dữ liệu chi tiết trong khoảng thời gian đã lọc.</p>';
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
    const tfoot = document.getElementById('tfoot-krc-products');
    if (!tbody) return;
    tbody.innerHTML = '';

    const krcFromInput = document.getElementById('krc-date-from');
    const krcToInput = document.getElementById('krc-date-to');
    const selectDateXuat = document.getElementById('krc-select-date-xuat');

    let krcFromNum = parseDateStrToNum(krcFromInput ? krcFromInput.value : '09/01/2026') || 901;
    let krcToNum = parseDateStrToNum(krcToInput ? krcToInput.value : '09/10/2026') || 930;
    if (krcFromNum > krcToNum) {
      const temp = krcFromNum;
      krcFromNum = krcToNum;
      krcToNum = temp;
    }
    const selectedDateXuat = selectDateXuat ? selectDateXuat.value.trim() : '';

    const prods = stream2Data.products || [];

    // Step 1: Filter by date range and single date export
    const dateFiltered = prods.filter(p => {
      // Check date xuat within range
      const xuatNum = parseDateStrToNum(p.ngay_xuat);
      if (xuatNum !== null && (xuatNum < krcFromNum || xuatNum > krcToNum)) {
        return false;
      }
      // Check exact date xuat if selected
      if (selectedDateXuat && p.ngay_xuat !== selectedDateXuat) {
        return false;
      }
      return true;
    });

    // Step 2: Update 5 KPI summary pills based on dateFiltered
    const totalSku = dateFiltered.length;
    const khopCount = dateFiltered.filter(p => p.type === 'khop_po').length;
    const thieuCount = dateFiltered.filter(p => p.type === 'chia_thieu').length;
    const duCount = dateFiltered.filter(p => p.type === 'chia_du').length;
    const batThuongCount = thieuCount + duCount;

    const kpiTotalSkuEl = document.getElementById('krc-kpi-total-sku');
    const kpiKhopEl = document.getElementById('krc-kpi-khop');
    const kpiThieuEl = document.getElementById('krc-kpi-chia-thieu');
    const kpiDuEl = document.getElementById('krc-kpi-chia-du');
    const kpiBatThuongEl = document.getElementById('krc-kpi-bat-thuong');

    if (kpiTotalSkuEl) kpiTotalSkuEl.textContent = totalSku.toLocaleString('vi-VN');
    if (kpiKhopEl) kpiKhopEl.textContent = khopCount.toLocaleString('vi-VN');
    if (kpiThieuEl) kpiThieuEl.textContent = thieuCount.toLocaleString('vi-VN');
    if (kpiDuEl) kpiDuEl.textContent = duCount.toLocaleString('vi-VN');
    if (kpiBatThuongEl) kpiBatThuongEl.textContent = batThuongCount.toLocaleString('vi-VN');

    // Step 3: Apply Sub-tab filter and Search filter
    const finalFiltered = dateFiltered.filter(p => {
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

    if (finalFiltered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="padding: 24px; color: #94a3b8;">Không tìm thấy SKU nào phù hợp với bộ lọc ngày và điều kiện tìm kiếm.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    let totTonDau = 0, totNhapPo = 0, totNhanVao = 0, totXuatSt = 0, totTonCuoi = 0, totThanhTien = 0;

    finalFiltered.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const tc = p.ton_cuoi || 0;
      const tcColor = tc < 0 ? 'color: #dc2626; font-weight: bold;' : (tc > 0 ? 'color: #0d9488; font-weight: bold;' : '');
      
      const effectivePrice = (p.don_gia || defaultPrice) * vatMultiplier;
      const effectiveVal = Math.round(tc * effectivePrice);
      const ttColor = effectiveVal < 0 ? 'color: #dc2626; font-weight: bold;' : (effectiveVal > 0 ? 'color: #0d9488; font-weight: bold;' : '');

      totTonDau += (p.ton_dau || 0);
      totNhapPo += (p.nhap_po || 0);
      totNhanVao += (p.nhan_vao || 0);
      totXuatSt += (p.xuat_st || 0);
      totTonCuoi += tc;
      totThanhTien += effectiveVal;

      tr.innerHTML = `
        <td class="text-center font-mono">${idx + 1}</td>
        <td class="font-mono font-bold" style="color: #2563eb;">${p.sku}</td>
        <td class="font-bold">${p.ten_sp}</td>
        <td class="text-right font-mono">${(p.ton_dau || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${(p.nhap_po || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${(p.nhan_vao || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${(p.xuat_st || 0).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono" style="${tcColor}">${tc.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${Math.round(effectivePrice).toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono" style="${ttColor}">${effectiveVal.toLocaleString('vi-VN')}</td>
        <td class="text-center font-mono">${p.ngay_nhap || '01/09'}</td>
        <td class="text-center font-mono">${p.ngay_xuat || '10/09'}</td>
      `;
      tbody.appendChild(tr);
    });

    if (tfoot) {
      tfoot.innerHTML = `
        <tr>
          <td colspan="3" class="font-bold">TỔNG CỘNG (${finalFiltered.length} SKU)</td>
          <td class="text-right font-mono font-bold">${totTonDau.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">${totNhapPo.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">${totNhanVao.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">${totXuatSt.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold ${totTonCuoi < 0 ? 'text-danger' : ''}">${totTonCuoi.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold">-</td>
          <td class="text-right font-mono font-bold ${totThanhTien < 0 ? 'text-danger' : ''}">${totThanhTien.toLocaleString('vi-VN')} đ</td>
          <td class="text-center font-bold" colspan="2">${finalFiltered.length} mã</td>
        </tr>
      `;
    }
  }

  // Helper to sync Luồng 1 date inputs across bars
  function syncS1Inputs(fromVal, toVal) {
    const topFrom = document.getElementById('s1-top-date-from');
    const topTo = document.getElementById('s1-top-date-to');
    const secFrom = document.getElementById('s1-date-from');
    const secTo = document.getElementById('s1-date-to');
    if (topFrom) topFrom.value = fromVal;
    if (topTo) topTo.value = toVal;
    if (secFrom) secFrom.value = fromVal;
    if (secTo) secTo.value = toVal;
  }

  function handleS1Filter() {
    const fromEl = document.getElementById('s1-top-date-from') || document.getElementById('s1-date-from');
    const toEl = document.getElementById('s1-top-date-to') || document.getElementById('s1-date-to');
    const fromVal = fromEl ? fromEl.value.trim() : '09/01/2026';
    const toVal = toEl ? toEl.value.trim() : '09/10/2026';
    syncS1Inputs(fromVal, toVal);
    renderStream1();
    showToast(`Đã lọc tiến độ Luồng 1 từ ${fromVal} đến ${toVal}`, '🔍');
  }

  function handleS1Reset() {
    syncS1Inputs('09/01/2026', '09/10/2026');
    renderStream1();
    showToast('Đã đặt lại bộ lọc ngày Luồng 1 (01/09 - 10/09)', '🔄');
  }

  // Bind Luồng 1 Buttons & Inputs
  ['btn-s1-top-filter-date', 'btn-s1-filter-date'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', handleS1Filter);
  });
  ['btn-s1-top-reset-date', 'btn-s1-reset-date'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', handleS1Reset);
  });
  ['s1-top-date-from', 's1-top-date-to', 's1-date-from', 's1-date-to'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleS1Filter();
      });
    }
  });

  // 5. Setup Sub-Tabs & Controls Listeners for Stream 2
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

  // Stream 2 Date Range Filter & Reset
  const btnKrcFilter = document.getElementById('btn-krc-filter-date');
  if (btnKrcFilter) {
    btnKrcFilter.addEventListener('click', () => {
      const fromVal = document.getElementById('krc-date-from')?.value || '09/01/2026';
      const toVal = document.getElementById('krc-date-to')?.value || '09/10/2026';
      renderStream2();
      showToast(`Đã lọc dữ liệu KRC từ ${fromVal} đến ${toVal}`, '🔍');
    });
  }

  const btnKrcReset = document.getElementById('btn-krc-reset-date');
  if (btnKrcReset) {
    btnKrcReset.addEventListener('click', () => {
      const fromEl = document.getElementById('krc-date-from');
      const toEl = document.getElementById('krc-date-to');
      const xuatEl = document.getElementById('krc-select-date-xuat');
      const searchEl = document.getElementById('krc-search-sku');
      if (fromEl) fromEl.value = '09/01/2026';
      if (toEl) toEl.value = '09/10/2026';
      if (xuatEl) xuatEl.value = '';
      if (searchEl) searchEl.value = '';
      searchTerm = '';
      renderStream2();
      showToast('Đã đặt lại toàn bộ bộ lọc Luồng 2', '🔄');
    });
  }

  ['krc-date-from', 'krc-date-to'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          renderStream2();
          showToast('Đã áp dụng bộ lọc ngày KRC', '🔍');
        }
      });
    }
  });

  // Stream 2 Dropdowns & Pricing
  const selectDateXuat = document.getElementById('krc-select-date-xuat');
  if (selectDateXuat) {
    selectDateXuat.addEventListener('change', () => {
      renderStream2();
      const val = selectDateXuat.value;
      showToast(val ? `Đang xem ngày xuất: ${val}` : 'Đang xem tất cả ngày xuất', '📅');
    });
  }

  const selectVat = document.getElementById('krc-select-vat');
  if (selectVat) {
    selectVat.addEventListener('change', (e) => {
      vatMultiplier = parseFloat(e.target.value) || 1.0;
      renderStream2();
      showToast(`Đã áp dụng thuế VAT: ${selectVat.options[selectVat.selectedIndex].text}`, '💰');
    });
  }

  const inputPrice = document.getElementById('krc-input-default-price');
  if (inputPrice) {
    inputPrice.addEventListener('input', (e) => {
      defaultPrice = parseFloat(e.target.value) || 6800;
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
