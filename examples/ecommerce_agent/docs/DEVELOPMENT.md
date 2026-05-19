
# 开发指南

本文档详细介绍如何开发和扩展电商 Agent 系统。

## 目录

- [环境搭建](#环境搭建)
- [项目架构](#项目架构)
- [后端开发](#后端开发)
- [前端开发](#前端开发)
- [添加新平台](#添加新平台)
- [添加新任务类型](#添加新任务类型)
- [代码规范](#代码规范)

## 环境搭建

### 后端开发环境

1. 克隆项目
```bash
git clone &lt;repository-url&gt;
cd examples/ecommerce_agent
```

2. 安装依赖（推荐使用 uv）
```bash
# 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 创建虚拟环境并安装依赖
uv sync

# 激活虚拟环境
source .venv/bin/activate
```

3. 安装 Playwright 浏览器
```bash
playwright install
```

4. 初始化数据库
```bash
python -c "from backend.database.models import init_db; init_db()"
```

5. 启动开发服务器
```bash
python -m backend.main
```

### 前端开发环境

1. 进入前端目录
```bash
cd frontend
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

## 项目架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Views      │  │  Components  │  │    Composables│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                        Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │     API      │  │    Agent     │  │   Browser    │ │
│  │   (FastAPI)  │  │  (DeepAgent) │  │ (Playwright) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Database   │  │  Scheduler   │  │    Utils     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 后端架构

```
backend/
├── api/              # API 路由层
│   ├── __init__.py
│   ├── stores.py
│   ├── tasks.py
│   ├── products.py
│   ├── orders.py
│   └── realtime.py
├── agent/            # Agent 核心逻辑
│   ├── core.py
│   ├── task_templates.py
│   ├── workflows.py
│   └── exception_handler.py
├── browser/          # 浏览器自动化
│   ├── manager.py
│   ├── elements.py
│   └── anti_detect.py
├── database/         # 数据层
│   ├── models.py
│   └── vector_store.py
├── utils/            # 工具模块
│   ├── encryption.py
│   ├── realtime_manager.py
│   └── resource_monitor.py
├── config.py         # 配置管理
└── main.py          # 应用入口
```

### 前端架构

```
frontend/src/
├── views/            # 页面组件
│   ├── Home.vue
│   ├── Stores.vue
│   ├── Tasks.vue
│   └── ...
├── components/       # 可复用组件
├── composables/      # 组合式函数
│   └── useRealtime.ts
├── api/              # API 调用
│   └── index.ts
├── router/           # 路由配置
│   └── index.ts
├── App.vue          # 根组件
├── main.ts          # 入口文件
└── style.css        # 全局样式
```

## 后端开发

### 添加新的 API 端点

1. 在 `backend/api/` 创建新文件或修改现有文件

2. 定义 Pydantic 模型（如需要）
```python
from pydantic import BaseModel

class NewEntityCreate(BaseModel):
    name: str
    description: str

class NewEntityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
```

3. 实现 CRUD 操作
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.models import get_db, NewEntity

router = APIRouter(prefix="/api/new-entities", tags=["New Entities"])

@router.get("")
def get_entities(db: Session = Depends(get_db)):
    return db.query(NewEntity).all()

@router.post("")
def create_entity(data: NewEntityCreate, db: Session = Depends(get_db)):
    entity = NewEntity(**data.model_dump())
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity
```

4. 在 `backend/main.py` 注册路由
```python
from backend.api.new_entities import router as new_entities_router
app.include_router(new_entities_router)
```

### 添加新的数据库模型

1. 在 `backend/database/models.py` 添加模型
```python
class NewEntity(Base):
    __tablename__ = "new_entities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系（如需要）
    store_id = Column(Integer, ForeignKey("stores.id"))
    store = relationship("Store", back_populates="new_entities")
```

2. 更新相关模型的关系
```python
class Store(Base):
    # ...
    new_entities = relationship("NewEntity", back_populates="store")
```

## 前端开发

### 添加新页面

1. 在 `frontend/src/views/` 创建新组件
```vue
&lt;template&gt;
  &lt;div class="page-container"&gt;
    &lt;n-card :title="pageTitle"&gt;
      页面内容
    &lt;/n-card&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() =&gt; '新页面')
&lt;/script&gt;

&lt;style scoped&gt;
.page-container {
  padding: 20px;
}
&lt;/style&gt;
```

2. 在 `frontend/src/router/index.ts` 添加路由
```typescript
{
  path: '/new-page',
  name: 'NewPage',
  component: () =&gt; import('../views/NewPage.vue')
}
```

3. 在 `App.vue` 添加导航链接（如需要）

### 添加新的 API 调用

在 `frontend/src/api/index.ts` 添加：
```typescript
export interface NewEntity {
  id: number
  name: string
  description: string
  created_at: string
}

export const newEntitiesApi = {
  async getAll(): Promise&lt;NewEntity[]&gt; {
    return apiRequest('/api/new-entities')
  },
  
  async create(data: Omit&lt;NewEntity, 'id' | 'created_at'&gt;): Promise&lt;{ id: number }&gt; {
    return apiRequest('/api/new-entities', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  
  async delete(id: number): Promise&lt;void&gt; {
    return apiRequest(`/api/new-entities/${id}`, {
      method: 'DELETE'
    })
  }
}
```

### 使用 Naive UI 组件

参考 [Naive UI 文档](https://www.naiveui.com)，常用组件：

```vue
&lt;template&gt;
  &lt;n-button type="primary"&gt;主要按钮&lt;/n-button&gt;
  &lt;n-input v-model:value="inputValue" placeholder="输入内容" /&gt;
  &lt;n-card title="卡片标题"&gt;卡片内容&lt;/n-card&gt;
  &lt;n-table :columns="columns" :data="data" /&gt;
  &lt;n-modal v-model:show="showModal" title="弹窗标题"&gt;
    弹窗内容
  &lt;/n-modal&gt;
&lt;/template&gt;
```

## 添加新平台

### 1. 创建平台适配模块

在 `backend/browser/` 创建 `platform_yourplatform.py`：
```python
class YourPlatformAdapter:
    def __init__(self, browser_manager):
        self.browser = browser_manager
        self.platform = "yourplatform"
    
    async def login(self, username: str, password: str):
        """实现登录逻辑"""
        pass
    
    async def publish_product(self, product_data):
        """实现发布商品逻辑"""
        pass
    
    async def fetch_orders(self):
        """实现获取订单逻辑"""
        pass
```

### 2. 添加元素配置

在 `configs/elements/yourplatform/` 创建配置文件：
```json
{
  "login": {
    "username_input": "#username",
    "password_input": "#password",
    "login_button": "#login-btn"
  },
  "publish": {
    "title_input": "#title",
    "price_input": "#price"
  }
}
```

### 3. 注册平台

在 `backend/browser/manager.py` 添加平台注册：
```python
PLATFORMS = {
    "douyin": DouyinAdapter,
    "pinduoduo": PinduoduoAdapter,
    "yourplatform": YourPlatformAdapter  # 新增
}
```

### 4. 添加前端页面

在 `frontend/src/views/` 创建平台相关页面

## 添加新任务类型

### 1. 定义任务模板

在 `backend/agent/task_templates.py` 添加：
```python
TASK_TEMPLATES = {
    "your_task_type": {
        "name": "你的任务名称",
        "description": "任务描述",
        "steps": [
            "步骤1",
            "步骤2",
            "步骤3"
        ],
        "required_params": ["param1", "param2"]
    }
}
```

### 2. 实现任务逻辑

在 `backend/agent/workflows.py` 添加工作流：
```python
async def your_task_workflow(agent, task_id, params):
    """执行你的任务"""
    await agent.update_progress(task_id, 0, "开始执行")
    
    # 步骤1
    await agent.update_progress(task_id, 25, "执行步骤1")
    # 实现逻辑
    
    # 步骤2
    await agent.update_progress(task_id, 50, "执行步骤2")
    # 实现逻辑
    
    # 完成
    await agent.update_progress(task_id, 100, "任务完成")
    return {"success": True}
```

### 3. 添加前端配置界面

在前端创建任务配置组件

## 代码规范

### Python 代码规范

遵循 PEP 8 规范，使用以下工具：

- **格式化**: Black
- **代码检查**: Ruff
- **类型检查**: MyPy

配置在 `pyproject.toml` 中

```bash
# 格式化代码
black backend/

# 代码检查
ruff check backend/

# 类型检查
mypy backend/
```

### TypeScript 代码规范

使用 ESLint 和 Prettier：

```bash
# 格式化
npm run format

# 代码检查
npm run lint
```

### Git 提交规范

使用约定式提交格式：

```
&lt;type&gt;(&lt;scope&gt;): &lt;subject&gt;

&lt;body&gt;

&lt;footer&gt;
```

Type 选项：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链

## 测试指南

### 运行测试

```bash
# 后端测试
pytest

# 前端测试
cd frontend
npm run test
```

### 编写测试

后端测试示例：
```python
def test_create_store(test_session):
    store = Store(name="Test", platform="douyin")
    test_session.add(store)
    test_session.commit()
    
    assert store.id is not None
    assert store.name == "Test"
```

前端测试示例：
```typescript
import { mount } from '@vue/test-utils'
import Component from './Component.vue'

test('renders correctly', () =&gt; {
    const wrapper = mount(Component)
    expect(wrapper.text()).toContain('expected')
})
```

## 调试技巧

### 后端调试

1. 使用打印语句
```python
print(f"Debug info: {variable}")
```

2. 使用 logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Debug message")
```

3. 使用断点
```python
import pdb; pdb.set_trace()
```

### 前端调试

1. 使用 Vue DevTools
2. 使用浏览器控制台
3. 使用 `console.log` 和 `debugger`

## 常见问题

### 数据库迁移

修改模型后，重新初始化数据库（开发阶段）：
```bash
rm -f data/ecommerce.db
python -c "from backend.database.models import init_db; init_db()"
```

### Playwright 问题

更新浏览器：
```bash
playwright install --force
```

### 依赖问题

重新安装依赖：
```bash
# Python
uv sync --reinstall

# Node.js
rm -rf node_modules package-lock.json
npm install
```

## 下一步

- 阅读 [API 文档](./API.md) 了解接口详情
- 查看 [架构文档](./ARCHITECTURE.md) 了解系统设计
- 查看 [示例代码](../configs/) 了解配置格式
