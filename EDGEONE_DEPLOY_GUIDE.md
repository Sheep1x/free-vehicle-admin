# 免费车登记后台管理系统 - EdgeOne 部署指南

## 概述

本指南将帮助您将免费车登记后台管理系统部署到腾讯云EdgeOne平台。

## 前置条件

1. 已安装 Node.js (推荐 v18+)
2. 已安装 EdgeOne CLI 工具
3. 已注册腾讯云账号并开通EdgeOne服务

## 快速开始

### 1. 安装 EdgeOne CLI

```bash
npm install -g edgeone
```

### 2. 登录 EdgeOne

```bash
edgeone login
```

**注意**：登录时会提示选择站点：
- 中国站点：适用于中国大陆用户
- 全球站点：适用于海外用户

### 3. 部署后台管理系统

我们提供了两种部署方式：

#### 方式一：使用简化部署脚本（推荐）

```bash
node deploy-admin-simple.js
```

#### 方式二：手动部署

```bash
# 1. 准备部署目录
xcopy "admin" "dist-admin" /E /I /H /Y

# 2. 进入部署目录
cd dist-admin

# 3. 初始化EdgeOne项目
edgeone pages init

# 4. 部署到EdgeOne
edgeone pages deploy
```

## 环境变量配置

系统会自动读取 `.env` 文件中的环境变量：

```env
TARO_APP_SUPABASE_URL=https://codvnervcuxohwtxotpn.supabase.co
TARO_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHZuZXJ2Y3V4b2h3dHhvdHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTg0MjQsImV4cCI6MjA4MTA5NDQyNH0.FrxgBbqYWmlhrSKZPLtZzn1DMcVEwyGTHs4mKYUuUTQ
TARO_APP_NAME=免费车登记
TARO_APP_APP_ID=app-84zvdc9gufwh
```

## 部署配置

### EdgeOne配置文件

系统会自动创建 `edgeone.json` 配置文件：

```json
{
  "name": "free-vehicle-admin",
  "description": "免费车登记后台管理系统",
  "version": "1.0.0",
  "env": {
    "SUPABASE_URL": "https://your-supabase-url.supabase.co",
    "SUPABASE_ANON_KEY": "your-anon-key",
    "APP_NAME": "免费车登记"
  },
  "headers": {
    "**/*.html": {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff"
    },
    "**/*.js": {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "application/javascript; charset=utf-8"
    },
    "**/*.css": {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "text/css; charset=utf-8"
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 缓存策略

- **HTML文件**：不缓存（no-cache）
- **CSS/JS文件**：长期缓存（1年）
- **图片资源**：长期缓存（1年）

### 安全头配置

- `X-Frame-Options: DENY` - 防止点击劫持
- `X-Content-Type-Options: nosniff` - 防止MIME类型嗅探
- `X-XSS-Protection: 1; mode=block` - XSS保护
- `Referrer-Policy: strict-origin-when-cross-origin` - 引用策略

## 部署步骤详解

### 1. 环境检查

脚本会自动检查：
- EdgeOne CLI是否安装
- 用户是否已登录
- 必要的文件是否存在

### 2. 准备部署文件

- 复制 `admin` 目录到 `dist-admin`
- 注入环境变量到 `admin.js`
- 创建EdgeOne配置文件

### 3. 部署到EdgeOne

- 初始化EdgeOne项目
- 上传文件到EdgeOne
- 配置CDN和缓存
- 生成访问地址

## 部署后操作

### 1. 查看部署状态

```bash
edgeone pages list
```

### 2. 查看访问地址

部署完成后，EdgeOne会提供一个访问地址，格式类似：
```
https://free-vehicle-admin-xxx.pages.edgeone.io
```

### 3. 自定义域名（可选）

如果需要使用自定义域名：

1. 在EdgeOne控制台添加域名
2. 配置DNS解析
3. 申请SSL证书

## 故障排除

### 登录失败

如果登录时遇到问题：

1. 检查网络连接
2. 尝试使用VPN（海外用户）
3. 检查EdgeOne服务状态

### 部署失败

常见原因：

1. **环境变量缺失**：确保 `.env` 文件存在且包含必要变量
2. **文件路径错误**：检查 `admin` 目录是否存在
3. **网络问题**：检查网络连接和EdgeOne服务状态

### 缓存问题

如果更新后页面没有变化：

1. 清除浏览器缓存
2. 在EdgeOne控制台清除CDN缓存
3. 等待缓存过期

## 性能优化建议

### 1. 资源优化

- 压缩CSS和JavaScript文件
- 优化图片大小
- 使用WebP格式图片

### 2. CDN配置

- 启用Brotli压缩
- 配置合理的缓存时间
- 使用HTTP/2

### 3. 安全加固

- 启用HTTPS
- 配置CSP策略
- 定期更新依赖

## 监控和维护

### 1. 访问监控

- 在EdgeOne控制台查看访问统计
- 监控错误率和响应时间
- 设置告警规则

### 2. 定期维护

- 定期更新部署
- 检查环境变量配置
- 监控资源使用情况

## 支持

如遇到问题，请：

1. 查看EdgeOne官方文档
2. 联系腾讯云技术支持
3. 检查项目GitHub Issues

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本部署功能
- 集成环境变量配置
- 添加缓存和安全头配置