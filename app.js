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
  let selectedStore = '';
  let selectedError = '';
  let selectedStatus = '';

  let currentPage = 1;
  const pageSize = 50;

  // Format Helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatNumber = (val, decimals = 2) => {
    return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(val || 0);
  };

  // 1. Update KPI Dashboard
  const updateKPIs = () => {
    if (!summary) return;
    const totalCount = allRecords.length || summary.total_records;
    document.getElementById('kpi-total-orders').textContent = formatNumber(totalCount, 0);
    document.getElementById('kpi-loss-value').textContent = formatCurrency(summary.financial_summary.total_natural_loss_vnd);
    document.getElementById('kpi-warehouse-val').textContent = formatCurrency(summary.financial_summary.total_warehouse_penalty_vnd);
    document.getElementById('kpi-store-val').textContent = formatCurrency(summary.financial_summary.total_store_penalty_vnd);
    document.getElementById('kpi-undetermined-val').textContent = formatCurrency(summary.financial_summary.total_undetermined_vnd);
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

  // 4. Render Table Rows
  const renderTable = () => {
    const tbody = document.getElementById('recon-tbody');
    const filtered = filterRecords();

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
          <div style="font-size: 0.72rem; color: var(--text-muted);">${item.transfer_date}</div>
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

  // Step Navigation Tabs
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
  document.getElementById('input-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById('filter-store').addEventListener('change', (e) => {
    selectedStore = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById('filter-error').addEventListener('change', (e) => {
    selectedError = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    selectedStatus = e.target.value;
    currentPage = 1;
    renderTable();
  });

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

  // Initial Run
  updateKPIs();
  populateStores();
  renderTable();
});

