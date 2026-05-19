
# API 文档

本文档详细描述了电商 Agent 系统的所有 API 端点。

## 基础信息

- **Base URL**: `http://localhost:8000`
- **认证方式**: 暂未实现（开发阶段）
- **数据格式**: JSON

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {}
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## API 端点

### 1. 店铺管理 (Stores)

#### 获取店铺列表

```http
GET /api/stores
```

**响应示例**:
```json
[
  {
    "id": 1,
    "name": "我的抖音店铺",
    "platform": "douyin",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### 获取单个店铺

```http
GET /api/stores/{store_id}
```

**路径参数**:
- `store_id` (integer, 必需): 店铺 ID

#### 创建店铺

```http
POST /api/stores
```

**请求体**:
```json
{
  "name": "店铺名称",
  "platform": "douyin",
  "username": "用户名",
  "password": "密码",
  "is_active": true
}
```

**平台选项**: `douyin`, `pinduoduo`, `taobao`

#### 删除店铺

```http
DELETE /api/stores/{store_id}
```

---

### 2. 任务管理 (Tasks)

#### 获取任务列表

```http
GET /api/tasks?store_id={store_id}
```

**查询参数**:
- `store_id` (integer, 可选): 按店铺筛选

**响应示例**:
```json
[
  {
    "id": 1,
    "store_id": 1,
    "name": "商品发布任务",
    "task_type": "publish",
    "status": "running",
    "progress": 50,
    "current_step": "上传图片",
    "created_at": "2024-01-01T00:00:00",
    "started_at": "2024-01-01T00:05:00"
  }
]
```

**任务状态**: `pending`, `running`, `completed`, `failed`, `paused`

**任务类型**: `publish`, `good_review`, `fetch_data`, `analyze`

#### 创建任务

```http
POST /api/tasks
```

**请求体**:
```json
{
  "store_id": 1,
  "task_type": "publish",
  "name": "发布新商品"
}
```

#### 暂停任务

```http
PUT /api/tasks/{task_id}/pause
```

#### 恢复任务

```http
PUT /api/tasks/{task_id}/resume
```

#### 删除任务

```http
DELETE /api/tasks/{task_id}
```

---

### 3. DOM 元素管理 (DOM Elements)

#### 获取元素列表

```http
GET /api/dom-elements?platform={platform}&amp;page={page}
```

**查询参数**:
- `platform` (string, 可选): 按平台筛选
- `page` (string, 可选): 按页面筛选

**响应示例**:
```json
[
  {
    "id": 1,
    "platform": "douyin",
    "page": "login",
    "name": "username_input",
    "selector": "#username",
    "selector_type": "css",
    "description": "用户名输入框",
    "version": 1,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### 创建元素

```http
POST /api/dom-elements
```

**请求体**:
```json
{
  "platform": "douyin",
  "page": "login",
  "name": "password_input",
  "selector": "#password",
  "selector_type": "css",
  "description": "密码输入框",
  "version": 1,
  "is_active": true
}
```

#### 更新元素

```http
PUT /api/dom-elements/{element_id}
```

#### 删除元素

```http
DELETE /api/dom-elements/{element_id}
```

---

### 4. 定时任务管理 (Scheduled Tasks)

#### 获取定时任务列表

```http
GET /api/scheduled-tasks?store_id={store_id}
```

#### 创建定时任务

```http
POST /api/scheduled-tasks
```

**请求体**:
```json
{
  "store_id": 1,
  "task_type": "publish",
  "name": "每日发布",
  "cron_expression": "0 9 * * *",
  "is_active": true
}
```

**Cron 表达式格式**: `分 时 日 月 周`

#### 暂停定时任务

```http
PUT /api/scheduled-tasks/{task_id}/pause
```

#### 恢复定时任务

```http
PUT /api/scheduled-tasks/{task_id}/resume
```

#### 删除定时任务

```http
DELETE /api/scheduled-tasks/{task_id}
```

---

### 5. 订单管理 (Orders)

#### 获取订单列表

```http
GET /api/orders?store_id={store_id}
```

**响应示例**:
```json
[
  {
    "id": 1,
    "order_id": "ORD123456",
    "store_id": 1,
    "store_name": "我的店铺",
    "platform": "douyin",
    "status": "pending_ship",
    "amount": 99.99,
    "item_count": 1,
    "buyer_name": "张三",
    "create_time": "2024-01-01T00:00:00",
    "pay_time": "2024-01-01T00:01:00"
  }
]
```

**订单状态**: `pending_pay`, `pending_ship`, `shipped`, `completed`

---

### 6. 商品管理 (Products)

#### 获取商品列表

```http
GET /api/products?store_id={store_id}
```

**响应示例**:
```json
[
  {
    "id": 1,
    "product_id": "PRD123456",
    "store_id": 1,
    "store_name": "我的店铺",
    "platform": "douyin",
    "title": "示例商品",
    "category": "数码产品",
    "price": 99.99,
    "original_price": 199.99,
    "stock": 100,
    "sales": 50,
    "status": "online",
    "create_time": "2024-01-01T00:00:00",
    "update_time": "2024-01-01T00:00:00"
  }
]
```

---

### 7. 数据分析 (Analytics)

#### 获取统计摘要

```http
GET /api/analytics/summary
```

**响应示例**:
```json
{
  "revenue": 128650.00,
  "orders": 856,
  "customers": 623,
  "conversion_rate": 3.8
}
```

#### 获取趋势数据

```http
GET /api/analytics/trends
```

**响应示例**:
```json
{
  "dates": ["2024-03-01", "2024-03-02", "2024-03-03"],
  "values": [15000, 18000, 22000]
}
```

#### 获取热销商品

```http
GET /api/analytics/top-products
```

**响应示例**:
```json
[
  {
    "rank": 1,
    "name": "智能蓝牙耳机",
    "sales": 320,
    "revenue": 63968
  }
]
```

#### 获取平台统计

```http
GET /api/analytics/platform-stats
```

**响应示例**:
```json
[
  {
    "name": "抖音",
    "revenue": 45200,
    "orders": 280,
    "percentage": 35
  }
]
```

---

### 8. 实时通信 (WebSocket)

#### 连接 WebSocket

```
ws://localhost:8000/api/realtime/ws
```

**客户端消息格式**:
```json
{
  "action": "subscribe",
  "channels": ["tasks", "system"]
}
```

**服务端推送消息格式**:
```json
{
  "type": "task_progress",
  "data": {
    "task_id": 1,
    "progress": 75,
    "current_step": "发布中..."
  },
  "timestamp": "2024-01-01T00:00:00",
  "source": "backend"
}
```

**事件类型**:
- `task_created`: 任务创建
- `task_started`: 任务开始
- `task_progress`: 任务进度更新
- `task_completed`: 任务完成
- `task_failed`: 任务失败
- `system_alert`: 系统警报
- `browser_opened`: 浏览器打开
- `browser_closed`: 浏览器关闭
- `browser_error`: 浏览器错误

---

### 9. 系统端点

#### 根路径

```http
GET /
```

**响应示例**:
```json
{
  "app": "Ecommerce Agent",
  "version": "0.1.0",
  "status": "running"
}
```

#### 健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "healthy"
}
```

---

## 错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 使用示例

### JavaScript (Fetch)

```javascript
// 获取店铺列表
fetch('http://localhost:8000/api/stores')
  .then(response =&gt; response.json())
  .then(data =&gt; console.log(data));

// 创建任务
fetch('http://localhost:8000/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    store_id: 1,
    task_type: 'publish',
    name: '测试任务'
  })
})
  .then(response =&gt; response.json())
  .then(data =&gt; console.log(data));
```

### Python (requests)

```python
import requests

# 获取任务列表
response = requests.get('http://localhost:8000/api/tasks')
tasks = response.json()
print(tasks)

# 创建店铺
data = {
    'name': '新店铺',
    'platform': 'douyin',
    'is_active': True
}
response = requests.post('http://localhost:8000/api/stores', json=data)
print(response.json())
```

---

## 注意事项

1. 所有时间格式均为 ISO 8601
2. 金额单位为元
3. 分页参数将在后续版本添加
4. WebSocket 连接需要保持活跃状态

## 更新日志

### v0.1.0 (2024-01-01)
- 初始版本发布
- 基础 API 端点实现
- 店铺、任务、订单、商品管理
