# 电商自动化系统 - 快速入门指南

欢迎使用电商自动化系统！本指南将帮助你在本地环境快速部署和启动项目。

## 📋 前置要求

在开始之前，请确保你的电脑已安装以下软件：

- **Python 3.11 或更高版本**
- **Node.js 18 或更高版本**
- **npm**（通常随 Node.js 一起安装）

检查环境是否满足要求：

```bash
# 检查 Python 版本
python --version
# 或
python3 --version

# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

## 🚀 快速启动（推荐）

### 方法一：使用启动脚本（最简单）

#### macOS / Linux 用户

```bash
# 1. 进入项目目录
cd /path/to/ecommerce_agent

# 2. 首次运行 - 安装依赖和初始化
./quick_start.sh setup

# 3. 启动服务
./quick_start.sh start

# 4. 查看服务状态
./quick_start.sh status

# 5. 停止服务
./quick_start.sh stop
```

#### Windows 用户

```cmd
# 1. 进入项目目录
cd C:\path\to\ecommerce_agent

# 2. 首次运行 - 安装依赖和初始化
quick_start.bat setup

# 3. 启动服务
quick_start.bat start

# 4. 查看服务状态
quick_start.bat status

# 5. 停止服务
quick_start.bat stop
```

### 方法二：手动启动（更灵活）

#### 1. 后端启动

```bash
# 进入项目目录
cd /path/to/ecommerce_agent

# （可选）安装 uv（比 pip 快）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装 Python 依赖
uv sync
# 或使用 pip
pip install -e .

# 安装 Playwright 浏览器
uv run playwright install chromium

# 初始化数据库
mkdir -p data/db

# 启动后端服务
export PYTHONPATH=$(pwd)
uv run python -m backend.main
```

后端服务将在 **http://localhost:8000** 启动。

#### 2. 前端启动

打开一个新的终端窗口：

```bash
# 进入前端目录
cd /path/to/ecommerce_agent/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 **http://localhost:5173** 启动。

## 🌐 访问应用

服务启动后，在浏览器中访问以下地址：

| 服务 | 地址 | 描述 |
|------|------|------|
| **前端应用** | http://localhost:5173 | 主界面 |
| **后端 API** | http://localhost:8000 | API 服务 |
| **Swagger 文档** | http://localhost:8000/docs | API 文档（交互式） |
| **ReDoc 文档** | http://localhost:8000/redoc | API 文档（格式美观） |

## ✅ 验证安装

### 1. 检查后端

```bash
curl http://localhost:8000/
```

预期输出：
```json
{"app":"Ecommerce Agent","version":"0.1.0","status":"running"}
```

### 2. 检查前端

在浏览器中访问 http://localhost:5173，确认：

- [ ] 页面正常加载
- [ ] 左侧菜单栏完整显示
- [ ] 可以正常切换页面
- [ ] 浏览器控制台没有错误

## 📖 功能说明

### 左侧菜单导航

1. **控制台** - 首页概览和统计数据
2. **拼多多平台**
   - 数据概览 - 平台数据统计
   - 店铺管理 - 管理拼多多店铺
   - 数据提取 - 提取各类数据
   - 评论管理 - 管理商品评论
   - 批量操作 - 批量处理任务
   - 数据详情 - 查看详细数据
3. **AI 助手**
   - 智能 AI 助手 - AI 对话
   - Agent 工作台 - Agent 管理
   - 工作流配置 - 工作流设置
4. **配置管理**
   - 店铺管理 - 全局店铺管理
   - 元素管理 - DOM 元素配置
   - 技能管理 - 技能管理
   - 模型配置 - AI 模型配置
   - 飞书集成 - 飞书机器人配置
   - Webhook 管理 - Webhook 配置
   - **系统监控** - 服务状态监控 ⭐
   - **API 测试** - 测试后端 API ⭐
   - **系统设置** - 全局设置 ⭐
5. **任务中心**
   - 任务管理 - 管理任务
   - 定时任务 - 定时任务配置
6. **数据中心**
   - 数据分析 - 数据分析图表
   - 订单管理 - 订单数据管理
   - 商品管理 - 商品管理
   - 商品库 - 商品库管理
   - 批量发布 - 批量发布商品
   - 已发布商品 - 已发布商品

## 🔧 常见问题

### Q: 端口被占用怎么办？

**A:** 查找并关闭占用端口的进程，或修改启动端口。

```bash
# 查找占用端口的进程（Linux/macOS）
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows（PowerShell）
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Q: npm install 很慢或失败？

**A:** 使用国内镜像源加速：

```bash
npm config set registry https://registry.npmmirror.com
cd frontend
npm install
```

### Q: Python ModuleNotFoundError？

**A:** 确保设置了 PYTHONPATH：

```bash
export PYTHONPATH=/path/to/ecommerce_agent
```

### Q: 如何查看日志？

**A:** 如果你使用启动脚本，可以查看：

```bash
# 查看后端日志
tail -f backend.log

# 查看前端日志
tail -f frontend/frontend.log
```

## 📚 更多文档

- [完整部署指南](./LOCAL_DEPLOYMENT.md) - 详细的部署文档
- [README.md](./README.md) - 项目介绍和功能说明
- [QUICKSTART.md](./QUICKSTART.md) - 原始快速启动指南
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) - 开发指南

## 💡 提示

1. **首次使用建议**：先访问控制台页面，了解系统整体布局
2. **系统监控**：使用"系统监控"页面查看服务状态
3. **API 测试**：使用"API 测试"页面验证后端功能
4. **数据管理**：在拼多多平台菜单下管理店铺和数据

## 🆘 需要帮助？

如果遇到问题：

1. 先查看本指南的"常见问题"部分
2. 检查服务日志，了解具体错误
3. 参考完整部署文档：[LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)

祝你使用愉快！🎉
