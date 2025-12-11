#!/bin/bash

echo "🔧 开始修复后台管理系统..."
echo ""

# 1. 重新配置
echo "1️⃣ 重新配置Supabase连接..."
cd /workspace/app-84zvdc9gufwh
./scripts/setup-admin.sh
echo ""

# 2. 清除浏览器缓存提示
echo "2️⃣ 请手动执行以下操作："
echo "   - 打开浏览器"
echo "   - 按 Ctrl+Shift+Delete (Windows/Linux) 或 Cmd+Shift+Delete (Mac)"
echo "   - 清除缓存和Cookie"
echo ""

# 3. 启动服务器
echo "3️⃣ 启动本地服务器..."
echo ""
echo "✅ 服务器将启动在 http://localhost:8080"
echo "📊 诊断页面: http://localhost:8080/test-connection.html"
echo "🎛️ 管理页面: http://localhost:8080/index.html"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

cd admin
python3 -m http.server 8080
