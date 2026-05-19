
# 多平台电商 Agent 系统

基于 DeepAgents 框架的智能电商自动化系统，支持抖音、拼多多、淘宝等多个电商平台。

## 功能特性

- 🌐 **多平台支持**：抖音、拼多多、淘宝等主流电商平台
- 🤖 **智能 Agent**：基于 DeepAgents 的自动化任务执行
- 📊 **数据管理**：订单、商品、数据统计一体化管理
- ⏰ **定时任务**：支持灵活的定时任务配置
- 🔒 **安全可靠**：浏览器指纹反检测，多账户隔离
- 📱 **现代化 UI**：基于 Naive UI 的响应式前端界面
- 💬 **实时通信**：WebSocket 实时任务状态更新

## 技术栈

### 后端
- **框架**: FastAPI
- **数据库**: SQLite + SQLAlchemy ORM
- **浏览器自动化**: Playwright
- **任务调度**: APScheduler
- **AI框架**: DeepAgents

### 前端
- **框架**: Vue 3 + TypeScript
- **UI组件**: Naive UI
- **路由**: Vue Router
- **构建工具**: Vite
- **CSS框架**: UnoCSS

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 18+
- Playwright 浏览器

### 后端启动

```bash
# 进入后端目录
cd examples/ecommerce_agent

# 使用 uv 安装依赖（推荐）
uv sync

# 或使用 pip
pip install -e .

# 初始化数据库
python -c "from backend.database.models import init_db; init_db()"

# 启动后端服务
python -m backend.main
```

后端服务将在 http://localhost:8000 启动

### 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 http://localhost:5173 启动

### 完整启动（使用脚本）

```bash
# 使用管理脚本启动
./manage.sh start

# 停止服务
./manage.sh stop

# 查看状态
./manage.sh status
```

## 项目结构

```
ecommerce_agent/
├── backend/              # 后端代码
│   ├── api/             # API 路由
│   ├── agent/           # Agent 核心逻辑
│   ├── browser/         # 浏览器自动化
│   ├── database/        # 数据库模型
│   ├── utils/           # 工具函数
│   └── main.py          # FastAPI 入口
├── frontend/            # 前端代码
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── composables/ # 组合式函数
│   │   ├── api/         # API 调用
│   │   └── router/      # 路由配置
│   └── package.json
├── configs/             # 配置文件
├── data/                # 数据目录
├── tests/               # 测试文件
└── pyproject.toml       # Python 项目配置
```

## 使用指南

### 1. 配置店铺

1. 访问前端页面，进入"店铺管理"
2. 点击"添加店铺"
3. 选择平台（抖音/拼多多/淘宝）
4. 填写店铺信息并保存

### 2. 创建任务

1. 进入"任务管理"页面
2. 点击"新建任务"
3. 选择店铺和任务类型
4. 配置任务参数并提交

### 3. 查看数据

- **订单管理**: 查看和管理订单数据
- **商品管理**: 管理商品库和已发布商品
- **数据分析**: 查看销售数据和趋势分析

## 测试

### 后端测试

```bash
# 运行所有测试
pytest

# 运行特定测试文件
pytest backend/tests/test_api.py

# 显示详细输出
pytest -v

# 生成覆盖率报告
pytest --cov=backend
```

### 前端测试

```bash
# 运行测试
npm run test

# 启动测试 UI
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

## API 文档

启动后端服务后，访问以下地址查看 API 文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 主要 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/stores` | GET/POST | 店铺管理 |
| `/api/tasks` | GET/POST | 任务管理 |
| `/api/dom-elements` | GET/POST | DOM元素管理 |
| `/api/scheduled-tasks` | GET/POST | 定时任务管理 |
| `/api/orders` | GET | 订单数据 |
| `/api/products` | GET | 商品数据 |
| `/api/analytics/*` | GET | 数据分析 |
| `/api/realtime/ws` | WS | 实时通信 |

详细的 API 文档请参考 [API.md](./docs/API.md)

## 开发指南

### 添加新的电商平台

1. 在 `backend/browser/` 创建平台适配模块
2. 在 `configs/elements/` 添加平台元素配置
3. 在前端添加相应的页面组件
4. 更新路由配置

### 创建新的任务类型

1. 在 `backend/agent/task_templates.py` 添加任务模板
2. 在前端添加任务配置界面
3. 实现对应的自动化逻辑

详细的开发指南请参考 [DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t ecommerce-agent .

# 运行容器
docker run -p 8000:8000 -p 5173:5173 ecommerce-agent
```

### 生产环境配置

1. 修改 `.env` 配置文件
2. 设置生产环境变量
3. 配置反向代理（Nginx）
4. 设置 HTTPS 证书

详细部署指南请参考 [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## 贡献指南

我们欢迎任何形式的贡献！请参考 [CONTRIBUTING.md](./docs/CONTRIBUTING.md) 了解如何参与项目。

## 安全说明

⚠️ 重要提示：
- 请妥善保管店铺凭证
- 不要在生产环境使用默认密钥
- 定期备份数据库
- 遵守各电商平台的使用规则

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 联系方式

- 问题反馈: GitHub Issues
- 邮件: support@example.com

## 致谢

- [DeepAgents](https://github.com/langchain-ai/deepagents) - AI Agent 框架
- [Naive UI](https://www.naiveui.com) - Vue 3 组件库
- [Playwright](https://playwright.dev) - 浏览器自动化框架

---

**注意**: 本项目仅供学习和研究使用，请勿用于非法用途。使用本项目产生的一切后果由使用者自行承担。
