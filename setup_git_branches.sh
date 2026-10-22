#!/bin/bash
# ==============================================================================
# SCRIPT KHỞI TẠO GIT & TẠO PHÂN NHÁNH TỰ ĐỘNG CHO NHÓM 4 - GEHIHI
# Dự án: Vòng tay thông minh cảnh báo té ngã (Smart Fall-Guard Wristband)
# ==============================================================================

set -e

echo "🚀 Đang khởi tạo Git Repository..."
git init
git checkout -B main

echo "📦 Đang thêm toàn bộ cấu trúc thư mục và file khung..."
git add .
git commit -m "chore: initialize project structure, spiral docs, and skeleton files for Group 4 GEHIHI"

echo "🌿 Đang tạo nhánh tích hợp chung (develop)..."
git branch -M main
git checkout -b develop

echo "🛠️ Đang tạo các nhánh thành viên và nhánh theo Spiral..."
# Nhánh theo thành viên chuyên trách
git branch feat/firmware-esp32          # Trần Đình Nam - Embedded & Firmware Lead
git branch feat/iot-infra-broker        # Phạm Việt Tiến - IoT Infrastructure & Cloud Lead
git branch feat/backend-server          # Nguyễn Hữu Chính - Backend Lead
git branch feat/frontend-dashboard      # Đỗ Hải Đăng - Frontend & UI/UX Lead

# Nhánh theo từng giai đoạn Spiral
git branch spiral-1/foundation
git branch spiral-2/core-algorithm-realtime
git branch spiral-3/resilience-alert-simulator
git branch spiral-4/testing-kpis-delivery

git checkout main

echo "✅ Đã tạo thành công các nhánh:"
git branch -a

if [ -n "$1" ]; then
    echo "☁️ Đang liên kết với GitHub Remote: $1"
    git remote remove origin 2>/dev/null || true
    git remote add origin "$1"
    echo "⬆️ Đang đẩy toàn bộ các nhánh lên GitHub..."
    git push -u origin --all
    echo "🎉 Hoàn tất đẩy toàn bộ nhánh và khung dự án lên GitHub!"
else
    echo ""
    echo "💡 HƯỚNG DẪN ĐẨY LÊN GITHUB NHÓM:"
    echo "   1. Tạo một Repository trống trên GitHub (không tích chọn tạo README)."
    echo "   2. Chạy lệnh sau để đẩy toàn bộ các nhánh lên GitHub:"
    echo "      git remote add origin <URL_GITHUB_REPO_CUA_NHOM>"
    echo "      git push -u origin --all"
fi
