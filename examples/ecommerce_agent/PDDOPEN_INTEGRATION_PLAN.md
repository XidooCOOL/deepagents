# pddopen 与电商助手整合方案

## 📋 项目分析

### pddopen 项目功能概览

基于您仓库的 `QUICKSTART.md`，pddopen 是一个**拼多多后台自动化工具**，主要功能包括：

| 功能模块 | 描述 |
|---------|------|
| **店铺管理** | 多店铺添加、列表、停止、退出登录 |
| **销售数据** | 提取昨日/指定日期销售数据 |
| **客服绩效** | 提取客服绩效数据 |
| **推广数据** | 提取推广数据 |
| **数据导出** | Excel文件导出（分Sheet） |
| **批量处理** | 支持批量多个店铺操作 |
| **飞书集成** | 二维码通知、健康检查 |
| **浏览器自动化** | 后台自动登录、操作 |

### 目录结构分析

```
pddopen/
├── accounts/          # 店铺账户管理
├── data/              # 数据存储
├── modules/           # 功能模块
├── refs/              # 参考文件
├── scripts/           # 脚本文件
├── temp/              # 临时文件
├── utils/             # 工具函数
├── BUGS.md
├── DEVELOPMENT.md
├── FUNCTIONS.md
├── QUICKSTART.md      # 快速入门
├── SKILL.md
├── WIKI.md
├── config.json
├── package.json
└── package-lock.json
```

---

## 🎯 整合方案设计

### 1. 菜单结构调整

**优化后的侧边栏菜单：**

```
🖥️ 控制台 (首页)
├── 数据概览
└── 快捷操作

🛒 拼多多平台 [新增主分类]
├── 店铺管理
├── 销售数据
├── 客服绩效
├── 推广数据
├── 批量操作
└── 配置管理

🤖 AI Agent
├── 智能助手
├── Agent工作台
├── 任务对话
└── 工作流配置

⚙️ 系统设置
├── 多平台店铺
├── 元素管理
├── 技能管理
├── 模型配置
├── 飞书集成
└── Webhook管理

📋 任务中心
├── 任务管理
└── 定时任务

📊 数据中心
├── 多平台订单
├── 多平台商品
├── 商品库
├── 批量发布
├── 已发布
└── 数据分析
```

### 2. 新增页面设计

#### 页面 1: 拼多多店铺管理 (`/pdd/stores`)
**功能：**
- 店铺列表展示（与 pddopen 同步）
- 添加新店铺
- 编辑店铺配置
- 启动/停止店铺浏览器
- 健康检查
- 执行统计查看

#### 页面 2: 拼多多销售数据 (`/pdd/sales`)
**功能：**
- 销售数据提取
- 日期范围选择
- Excel 数据展示
- 图表可视化
- 数据导出

#### 页面 3: 拼多多客服绩效 (`/pdd/service`)
**功能：**
- 客服数据提取
- 绩效排行榜
- 趋势分析
- 数据导出

#### 页面 4: 拼多多推广数据 (`/pdd/ads`)
**功能：**
- 推广数据提取
- 推广效果分析
- ROI 计算
- 数据导出

#### 页面 5: 拼多多批量操作 (`/pdd/batch`)
**功能：**
- 选择多个店铺
- 批量数据提取
- 批量执行任务
- 任务进度监控

#### 页面 6: 拼多多配置管理 (`/pdd/config`)
**功能：**
- 基础配置
- 飞书配置
- 浏览器配置
- 高级设置

---

## 🛠️ 技术架构整合

### 1. 前端架构调整

```
frontend/src/
├── views/
│   ├── Home.vue                  # 首页（优化为多平台概览）
│   ├── AIAssistant.vue
│   ├── AgentConsole.vue
│   ├── ChatInterface.vue
│   ├── Data.vue
│   ├── Elements.vue
│   ├── Feishu.vue
│   ├── Home.vue
│   ├── LLMConfig.vue
│   ├── Orders.vue
│   ├── ProductLibrary.vue
│   ├── ProductPublish.vue
│   ├── Products.vue
│   ├── PublishedProducts.vue
│   ├── ScheduledTasks.vue
│   ├── Skills.vue
│   ├── Stores.vue                # 改为多平台店铺管理
│   ├── Tasks.vue
│   ├── Webhooks.vue
│   ├── Workflow.vue
│   ├── WorkflowConfig.vue
│   │
│   └── pdd/                      # [新增] 拼多多模块
│       ├── Stores.vue
│       ├── SalesData.vue
│       ├── ServicePerformance.vue
│       ├── AdsData.vue
│       ├── BatchOperation.vue
│       └── Config.vue
│
├── components/
│   └── pdd/                      # [新增] 拼多多组件
│       ├── StoreCard.vue
│       ├── DataTable.vue
│       ├── DateRangePicker.vue
│       ├── BatchSelector.vue
│       └── ProgressMonitor.vue
│
└── api/
    └── pdd/                      # [新增] 拼多多API调用
        ├── stores.ts
        ├── sales.ts
        ├── service.ts
        ├── ads.ts
        └── config.ts
```

### 2. 后端架构调整

```
backend/
├── api/
│   ├── status.py
│   ├── feishu.py
│   ├── webhooks.py
│   ├── ai_intelligent.py
│   │
│   └── pdd/                       # [新增] 拼多多API
│       ├── stores.py
│       ├── sales.py
│       ├── service.py
│       ├── ads.py
│       ├── batch.py
│       ├── config.py
│       └── __init__.py
│
├── pdd_integration/               # [新增] pddopen 集成模块
│   ├── __init__.py
│   ├── adapter.py                 # pddopen 适配器
│   ├── config_manager.py          # 配置管理
│   ├── data_processor.py          # 数据处理
│   └── task_runner.py             # 任务执行器
│
├── ai/
│   ├── intelligent_agent.py
│   └── skills/
│       └── pdd/                   # [新增] 拼多多技能
│           ├── extract_sales.py
│           ├── extract_service.py
│           ├── extract_ads.py
│           └── batch_operation.py
│
├── database/
│   ├── models.py
│   └── pdd_models.py              # [新增] 拼多多数据模型
│
└── main.py                        # 注册拼多多路由
```

### 3. 数据库模型扩展

新增拼多多相关模型：

```python
# database/pdd_models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from database.models import Base

class PddStore(Base):
    """拼多多店铺"""
    __tablename__ = 'pdd_stores'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    shop_id = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default='inactive')  # active/inactive/error
    last_extract = Column(DateTime)
    config = Column(JSON)

class PddSalesData(Base):
    """拼多多销售数据"""
    __tablename__ = 'pdd_sales_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False)
    orders = Column(Integer)
    gmv = Column(Float)
    visitors = Column(Integer)
    conversion = Column(Float)
    # ... 更多字段

class PddServicePerformance(Base):
    """拼多多客服绩效"""
    __tablename__ = 'pdd_service_performance'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False)
    cs_name = Column(String(100))
    response_rate = Column(Float)
    satisfaction = Column(Float)
    # ... 更多字段

class PddAdsData(Base):
    """拼多多推广数据"""
    __tablename__ = 'pdd_ads_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False)
    spend = Column(Float)
    impressions = Column(Integer)
    clicks = Column(Integer)
    orders = Column(Integer)
    roi = Column(Float)
    # ... 更多字段

class PddTaskRecord(Base):
    """拼多多任务记录"""
    __tablename__ = 'pdd_task_records'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_type = Column(String(50))  # sales/service/ads/batch
    stores = Column(JSON)           # 涉及的店铺列表
    status = Column(String(50))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    result = Column(JSON)
    error = Column(Text)
```

---

## 🤖 AI Agent 集成

### 1. 新增拼多多专门技能

| 技能名称 | 功能描述 | 使用场景 |
|---------|---------|---------|
| **提取销售数据** | 自动调用 pddopen 提取销售数据 | 每日自动提取、周报生成 |
| **提取客服绩效** | 提取和分析客服绩效数据 | 绩效管理、激励决策 |
| **提取推广数据** | 获取推广效果数据 | ROI 分析、预算优化 |
| **批量数据提取** | 多店铺同时提取数据 | 月度汇总、数据分析 |
| **数据分析报告** | 基于数据生成AI分析报告 | 智能决策、运营建议 |

### 2. 工作流模板新增

**模板 1: 拼多多每日数据提取**
```
触发: 每日定时触发 (如 9:00 AM)
步骤:
  1. 提取所有店铺销售数据
  2. 提取所有店铺客服绩效
  3. 提取所有店铺推广数据
  4. 生成每日分析报告
  5. 发送报告到飞书/邮箱
```

**模板 2: 拼多多智能运营助手**
```
触发: 用户提问/定时
步骤:
  1. 获取近期数据
  2. AI 分析数据趋势
  3. 生成运营建议
  4. 可选: 自动执行建议操作
```

---

## 📊 首页/控制台优化

### 多平台数据概览

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 多平台数据概览                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 拼多多   │  │ 淘宝     │  │ 京东     │  │ 汇总     │       │
│  │ ¥12,580 │  │ ¥8,960  │  │ ¥5,420  │  │ ¥26,960 │       │
│  │ 订单:86 │  │ 订单:54 │  │ 订单:32 │  │ 订单:172│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐│
│  │ 🔥 快速操作                                               ││
│  ├───────────────────────────────────────────────────────────┤│
│  │ [📦 拼多多商品发布]  [📊 提取今日数据]  [💬 客服消息回复]  ││
│  │ [📈 查看数据报表]  [⚙️ 系统配置]                           ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────┐  ┌───────────────────────────────────┐│
│  │ 📋 待执行任务        │  │ 📈 今日销售趋势                     ││
│  ├─────────────────────┤  ├───────────────────────────────────┤│
│  │ • 提取拼多多数据    │  │ [图表区域]                        ││
│  │ • 发布新商品        │  │                                   ││
│  │ • 回复客服消息      │  │                                   ││
│  └─────────────────────┘  └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 实施计划

### 阶段 1: 基础架构搭建（1-2周）
1. 完善菜单结构，添加拼多多分类
2. 创建拼多多页面骨架
3. 设计并创建数据库表
4. 搭建 pddopen 适配器框架

### 阶段 2: 店铺管理（1周）
1. 拼多多店铺管理页面
2. 配置管理页面
3. pddopen 配置同步
4. 店铺状态监控

### 阶段 3: 数据提取与展示（2周）
1. 销售数据提取与展示
2. 客服绩效数据提取与展示
3. 推广数据提取与展示
4. 数据图表可视化
5. Excel 导出功能

### 阶段 4: 批量操作与AI集成（2周）
1. 批量操作功能
2. 拼多多 Agent 技能开发
3. 工作流模板创建
4. AI 分析报告生成

### 阶段 5: 测试与优化（1周）
1. 整体功能测试
2. 性能优化
3. 用户体验优化
4. 文档完善

---

## 📝 关键整合点总结

| 模块 | 优先级 | 整合方式 |
|-----|-------|---------|
| 菜单导航 | ⭐⭐⭐⭐⭐ | 新增拼多多主分类，重构店铺管理为多平台 |
| 数据模型 | ⭐⭐⭐⭐⭐ | 新增拼多多相关数据表 |
| pddopen 集成 | ⭐⭐⭐⭐⭐ | 适配器模式封装，保持 pddopen 独立 |
| AI 技能 | ⭐⭐⭐⭐ | 新增拼多多专用技能 |
| 数据可视化 | ⭐⭐⭐⭐ | 图表展示拼多多数据 |
| 飞书集成 | ⭐⭐⭐ | 复用现有飞书集成模块 |
| 工作流 | ⭐⭐⭐ | 新增拼多多工作流模板 |

---

这个方案保持了 pddopen 的独立性，同时将其功能无缝集成到电商助手中！
