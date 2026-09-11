#!/usr/bin/env bash
# ==============================================================================
# Script Triển Khai Tự Động Kho Rau Củ (KRC) Dashboard Lên Server KFM (Nginx)
# Domain: https://app-scm.kfm.vn/rau-cu-kfm
# ==============================================================================

set -e

TARGET_DIR="/var/www/app-scm/rau-cu-kfm"
REPO_URL="https://github.com/nguyenbaony/kho-rau-reconciliation.git"
BRANCH="main"

echo "=== 1. TẠO HOẶC CẬP NHẬT THƯ MỤC SOURCE CODE ==="
if [ -d "$TARGET_DIR/.git" ]; then
    echo ">> Thư mục đã tồn tại, đang kéo mã nguồn mới nhất từ GitHub ($BRANCH)..."
    cd "$TARGET_DIR"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    echo ">> Clone mới từ GitHub vào $TARGET_DIR..."
    mkdir -p "$(dirname "$TARGET_DIR")"
    git clone -b "$BRANCH" "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

# Phân quyền web server đọc được
echo ">> Phân quyền file (chown www-data / nginx)..."
chown -R www-data:www-data "$TARGET_DIR" 2>/dev/null || chown -R nginx:nginx "$TARGET_DIR" 2>/dev/null || true
chmod -R 755 "$TARGET_DIR"

echo "=== 2. HƯỚNG DẪN CẤU HÌNH NGINX CHO /rau-cu-kfm ==="
cat << 'EOF'

Thêm khối cấu hình sau vào bên trong block 'server { ... }' của domain app-scm.kfm.vn:

--------------------------------------------------------------------------------
location /rau-cu-kfm {
    alias /var/www/app-scm/rau-cu-kfm;
    index index.html;
    try_files $uri $uri/ /rau-cu-kfm/index.html;

    # Cấu hình cache cho static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|json)$ {
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }
}
--------------------------------------------------------------------------------

Sau đó kiểm tra và reload Nginx:
  sudo nginx -t
  sudo systemctl reload nginx

EOF

echo "=== HOÀN THÀNH TRIỂN KHAI SOURCE CODE ==="
