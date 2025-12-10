# 免费车登记 - 免费车辆登记管理小程序

专门用于登记免费通行车辆信息的微信小程序，通过拍照或上传图片自动提取车辆关键信息，提高免费车辆登记管理效率。

---

## 项目概述

免费车登记是一款基于 Taro + React + TypeScript 开发的微信小程序，集成了文心一言多模态AI能力，能够智能识别车辆信息并记录免费通行原因。

### 核心功能

1. **车辆信息登记**
   - 支持拍照或从相册选择车辆信息图片
   - 自动识别车牌号（含颜色）、车型、轴数、吨位
   - 提取入口信息、通行时间
   - 选择免费原因（紧急车/军警车/应急车/旅游包车）
   - 记录收费员和监控员信息
   - 支持手动编辑修正识别结果
   - 重新识别功能

2. **历史记录**
   - 保存所有登记记录到云端数据库
   - 支持按车牌号搜索筛选
   - 点击记录查看详情
   - 批量删除管理功能
   - 显示免费原因标签
   - 显示收费员和监控员信息

3. **个人中心**
   - 使用说明和帮助文档
   - 关于应用信息
   - 导出功能（规划中）

---

## 技术栈

- **前端框架**: Taro 4.1.5 + React 18
- **开发语言**: TypeScript
- **样式方案**: Tailwind CSS + SCSS
- **状态管理**: Zustand
- **数据库**: Supabase
- **AI能力**: 文心一言多模态大模型
- **包管理器**: pnpm

---

## 项目结构

```
├── src/
│   ├── app.config.ts               # Taro应用配置（路由、TabBar）
│   ├── app.scss                    # 全局样式和主题配色
│   ├── app.tsx                     # 应用入口文件
│   ├── client/
│   │   └── supabase.ts             # Supabase客户端配置
│   ├── db/                         # 数据库操作
│   │   ├── api.ts                  # 数据库API封装
│   │   └── types.ts                # 数据类型定义
│   ├── pages/                      # 页面目录
│   │   ├── home/                   # 首页（车辆登记）
│   │   ├── result/                 # 登记信息页
│   │   ├── history/                # 历史记录页
│   │   └── profile/                # 个人中心页
│   ├── utils/                      # 工具函数
│   │   ├── imageUtils.ts           # 图片处理工具
│   │   └── ocrUtils.ts             # OCR识别工具
│   └── assets/
│       └── images/                 # 图片资源（TabBar图标）
├── supabase/
│   └── migrations/                 # 数据库迁移文件
├── package.json
├── tailwind.config.js              # Tailwind配置
└── tsconfig.json                   # TypeScript配置
```

---

## 数据库设计

### toll_records 表

存储免费车辆登记记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| plate_number | text | 车牌号（含颜色） |
| vehicle_type | text | 车型 |
| axle_count | text | 轴数 |
| tonnage | text | 吨位 |
| entry_info | text | 入口信息 |
| entry_time | timestamptz | 通行时间 |
| amount | numeric | 金额 |
| free_reason | text | 免费原因 |
| toll_collector | text | 收费员 |
| monitor | text | 监控员 |
| image_url | text | 图片URL |
| created_at | timestamptz | 创建时间 |

---

## 页面路由

### TabBar页面

- `/pages/home/index` - 车辆登记（首页）
- `/pages/history/index` - 历史记录
- `/pages/profile/index` - 我的

### 其他页面

- `/pages/result/index` - 登记信息页

---

## 安装和使用

```bash
# 安装依赖
pnpm install

# 代码检查
pnpm run lint
```

---

## 配色方案

采用蓝色系主题，体现专业可靠的科技感：

- **主色**: #1890FF (蓝色)
- **背景色**: 浅蓝渐变
- **卡片**: 白色带阴影
- **文字**: 深灰色

---

## 环境变量

项目使用 `.env` 文件管理环境变量：

```
TARO_APP_NAME=免费车登记
TARO_APP_APP_ID=app-84zvdc9gufwh
TARO_APP_SUPABASE_URL=<Supabase项目URL>
TARO_APP_SUPABASE_ANON_KEY=<Supabase匿名密钥>
```

---

## 开发说明

### OCR识别流程

1. 用户拍照或选择车辆信息图片
2. 图片压缩处理
3. 转换为Base64格式
4. 调用文心一言多模态API进行识别
5. 解析AI返回的结构化数据
6. 选择免费原因并填写相关人员
7. 展示识别结果供用户确认编辑
8. 保存到Supabase数据库

### 车牌识别优化

免费车登记采用增强的车牌识别算法，确保完整识别车牌信息：

**识别内容：**
- 车牌颜色：蓝/黄/绿/白/黑
- 车牌号码：完整的省份简称+字母+数字组合
- 输出格式：颜色 + 空格 + 号码（如：蓝 鲁P233CV）

**技术特点：**
- 优化的AI提示词，明确要求识别完整车牌
- 双重正则匹配规则，提高识别成功率
- 支持有空格和无空格两种格式
- 支持所有省份简称和车牌颜色

详细说明请参考：[docs/OCR_IMPROVEMENTS.md](docs/OCR_IMPROVEMENTS.md)

### 新增功能

**v1.1.0 更新内容：**
- 首页新增独立拍照按钮
- 登记信息页新增免费原因下拉选择
- 新增收费员和监控员输入框
- 新增重新识别按钮
- 自定义返回按钮（左上角"<"）
- 历史记录支持点击查看详情
- 历史记录显示免费原因标签
- 历史记录显示收费员和监控员信息

### 关键依赖

- `miaoda-taro-utils`: 提供流式AI对话能力
- `@supabase/supabase-js`: Supabase客户端
- `@tarojs/*`: Taro框架核心包

---

## 版权信息

© 2025 免费车登记

专业的免费车辆登记管理工具
