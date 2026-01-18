# 免费车登记系统 Demo

## 项目概述

免费车登记系统是一个基于Taro + React + TypeScript + TailwindCSS开发的应用，主要用于车辆登记管理。系统支持微信小程序形态，包含完整的前端功能和后台管理系统。

### 项目特点

- 🔧 **专注微信小程序**：仅支持微信小程序平台
- 🚀 **现代化技术栈**：Taro 4.1.5 + React 18 + TypeScript 5
- 💅 **美观UI**：基于TailwindCSS构建的现代化界面
- 🔒 **安全可靠**：集成Supabase认证和权限管理
- ⚡ **高性能**：部署到EdgeOne平台，享受CDN加速

## 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| Taro | 4.1.5 | 多端开发框架 |
| React | 18.3.1 | UI框架 |
| TypeScript | 5.9.2 | 类型安全 |
| TailwindCSS | 3.4.17 | CSS框架 |
| Zustand | 5.0.8 | 状态管理 |
| Supabase | 2.56.1 | 后端即服务 |

### 构建工具
| 工具 | 版本 | 用途 |
|------|------|------|
| Vite | 4.5.14 | 构建工具 |
| pnpm | 10.22.0 | 包管理器 |
| Biome | 2.3.4 | 代码质量工具 |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10
- 微信开发者工具（开发微信小程序时需要）

### 安装依赖

```bash
pnpm install
```

### 开发模式

#### 微信小程序

```bash
pnpm run dev:weapp
```

然后在微信开发者工具中打开项目目录即可预览。

### 构建生产版本

#### 微信小程序

```bash
pnpm run build:weapp
```

构建产物会生成在 `dist` 目录。



## 项目结构

```
├── admin/             # 后台管理系统代码
├── config/            # 配置文件
├── dist-admin/        # 后台构建输出目录
├── edge-functions/    # EdgeOne边缘函数
├── src/               # 前端源码
│   ├── assets/        # 静态资源
│   ├── client/        # 客户端配置
│   ├── db/            # 数据库相关
│   ├── hooks/         # 自定义Hook
│   ├── pages/         # 页面组件
│   │   ├── history/   # 历史记录页
│   │   ├── home/      # 首页
│   │   ├── login/     # 登录页
│   │   ├── profile/   # 个人中心
│   │   └── result/    # 结果页
│   ├── styles/        # 样式文件
│   └── utils/         # 工具函数
├── supabase/          # Supabase配置
├── edgeone.config.js  # EdgeOne部署配置
└── package.json       # 项目依赖配置
```

## 核心功能演示

### 1. 登录功能

- 支持手机号登录
- 集成Supabase认证
- 自动保存登录状态

### 2. 车辆登记

- 支持手动输入车辆信息
- 支持OCR识别（通过扫描车辆信息自动录入）
- 实时验证输入信息

### 3. 历史记录

- 查看所有登记记录
- 支持按日期、车辆类型等筛选
- 支持分页加载

### 4. 个人中心

- 查看用户信息
- 修改密码
- 查看系统版本

### 5. 后台管理

- 用户管理：增删改查系统用户
- 设备管理：管理相关设备
- 记录查询：查询和导出登记记录
- 系统配置：配置系统参数

## 部署说明

### 1. 部署到EdgeOne

项目已成功部署到腾讯云EdgeOne平台，访问地址：

```
https://free-vehicle-admin-f1rais8s.edgeone.cool?eo_token=efa6c9ebb64df0bbdc41c162bfc269bf&eo_time=1766756694
```

### 2. 手动部署步骤

```bash
# 1. 准备部署目录
xcopy "admin" "dist-admin" /E /I /H /Y

# 2. 进入部署目录
cd dist-admin

# 3. 初始化EdgeOne项目
edgeone pages init

# 4. 部署到EdgeOne
edgeone pages deploy -n free-vehicle-admin
```

## 开发指南

### 代码规范

项目使用Biome进行代码质量检查和格式化：

```bash
pnpm run lint
```

### 新增页面

1. 在 `src/pages` 目录下创建新页面文件夹
2. 创建 `index.tsx` 文件编写页面组件
3. 创建 `index.config.ts` 配置页面路由
4. 在 `src/app.tsx` 中注册页面

### 数据库操作

项目使用Supabase作为后端服务，数据库操作主要通过 `src/db/api.ts` 中的API进行。

### 状态管理

使用Zustand进行状态管理，状态定义在 `src/store` 目录下。

## 配置说明

### 环境变量

项目支持多种环境的配置：

- `.env.development`：开发环境配置
- `.env.production`：生产环境配置
- `.env.test`：测试环境配置

主要环境变量：

```env
TARO_APP_SUPABASE_URL=your_supabase_url
TARO_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
TARO_APP_NAME=your_app_name
TARO_APP_APP_ID=your_app_id
```

### EdgeOne配置

EdgeOne部署配置在 `edgeone.config.js` 文件中，包含：

- 项目基本信息
- 部署目录配置
- 环境变量
- CDN缓存策略
- 安全头配置
- 边缘函数配置

## 常见问题

### 1. 如何修改主题色？

在 `src/styles/overrides.scss` 文件中修改主题色变量。

### 2. 如何添加新的API？

在 `src/db/api.ts` 文件中添加新的API函数。

### 3. 如何部署到其他平台？

项目基于Taro框架，支持部署到多个平台，具体配置可以参考Taro官方文档。

### 4. 如何配置微信小程序APPID？

在 `src/project.config.json` 文件中修改 `appid` 字段。

## 联系方式

如果您在使用过程中遇到问题，欢迎通过以下方式联系我们：

- 项目地址：https://github.com/your-repo-url
- 邮箱：your-email@example.com

## 更新日志

### v1.0.0

- 初始版本发布
- 支持微信小程序
- 实现车辆登记功能
- 实现历史记录查询
- 实现后台管理系统
- 支持EdgeOne部署

---

**Demo 结束** - 感谢您使用免费车登记系统！