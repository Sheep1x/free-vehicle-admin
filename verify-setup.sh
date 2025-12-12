#!/bin/bash

echo "🔍 验证Supabase配置..."
echo ""

# 检查.env文件
echo "1️⃣ 检查.env文件..."
if grep -q "codvnervcuxohwtxotpn.supabase.co" /workspace/app-84zvdc9gufwh/.env; then
    echo "   ✅ .env文件配置正确"
else
    echo "   ❌ .env文件配置错误"
    exit 1
fi

# 检查admin.js文件
echo "2️⃣ 检查admin/admin.js文件..."
if grep -q "codvnervcuxohwtxotpn.supabase.co" /workspace/app-84zvdc9gufwh/admin/admin.js; then
    echo "   ✅ admin.js文件配置正确"
else
    echo "   ❌ admin.js文件配置错误"
    exit 1
fi

# 检查test-connection.html文件
echo "3️⃣ 检查admin/test-connection.html文件..."
if grep -q "codvnervcuxohwtxotpn.supabase.co" /workspace/app-84zvdc9gufwh/admin/test-connection.html; then
    echo "   ✅ test-connection.html文件配置正确"
else
    echo "   ❌ test-connection.html文件配置错误"
    exit 1
fi

echo ""
echo "✅ 所有配置文件验证通过！"
echo ""
echo "📋 下一步操作："
echo "   1. 启动后台管理系统："
echo "      cd /workspace/app-84zvdc9gufwh/admin"
echo "      python3 -m http.server 8080"
echo ""
echo "   2. 在浏览器中访问："
echo "      诊断工具: http://localhost:8080/test-connection.html"
echo "      管理系统: http://localhost:8080/index.html"
echo ""
echo "   3. 测试小程序："
echo "      cd /workspace/app-84zvdc9gufwh"
echo "      pnpm run dev:weapp"
echo ""
