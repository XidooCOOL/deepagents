# 本地部署完整指南

本文档详细介绍如何在本地环境部署和运行电商自动化系统。

## 目录

1. [环境准备](#环境准备)
2. [项目获取](#项目获取)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [完整启动](#完整启动)
6. [常见问题](#常见问题)
7. [快速验证](#快速验证)

---

## 环境准备

### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Python | 3.11+ | 3.12+ |
| Node.js | 18+ | 20+ |
| npm | 9+ | 10+ |

### 检查现有环境

在开始部署前，请先检查你的环境：

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

---

## 项目获取

### 方式 1：直接使用（如果你已经有项目文件）

如果项目已经在你的本地，直接进入项目目录：

```bash
cd /path/to/ecommerce_agent
```

### 方式 2：克隆项目（如果需要从 Git 仓库获取）

```bash
# 克隆项目
git clone <your-repo-url>
cd ecommerce_agent
```

---

## 后端部署

### 1. 安装 Python 依赖管理工具（推荐使用 uv）

`uv` 是一个快速的 Python 包管理工具，比 pip 更快：

**Windows**
```powershell
# 使用 PowerShell 安装
Invoke-WebRequest -Uri https://astral.sh/uv/install.ps1 -OutFile install.ps1
PowerShell -ExecutionPolicy Bypass -File install.ps1
```

**macOS / Linux**
```bash
# 使用 curl 安装
curl -LsSf https://astral.sh/uv/install.sh | sh
```

或者使用 **pip**（如果你不想安装 uv）：
```bash
# 升级 pip
pip install --upgrade pip
```

### 2. 安装项目依赖

```bash
cd /workspace/examples/ecommerce_agent

# 使用 uv（推荐）
uv sync

# 或者使用 pip
pip install -e .
```

### 3. 安装 Playwright 浏览器

Playwright 用于浏览器自动化：

```bash
# 安装所有浏览器
uv run playwright install

# 或者只安装需要的浏览器（如 Chrome）
uv run playwright install chromium
```

### 4. 初始化数据库

```bash
# 使用 uv
uv run python -c "from backend.database.models import init_db; init_db()"

# 或者使用 Python
python -c "from backend.database.models import init_db; init_db()"
```

这将在 `data/db/` 目录下创建 SQLite 数据库文件。

### 5. 配置环境变量（可选）

创建 `.env` 文件（如果需要）：

```bash
# 在项目根目录创建
cp .env.example .env
# 然后编辑 .env 文件，填入你的配置
```

### 6. 启动后端服务

```bash
# 方式 1：使用 uv（推荐）
uv run python -m backend.main

# 方式 2：使用 Python（设置 PYTHONPATH）
export PYTHONPATH=$(pwd)
python -m backend.main

# 方式 3：使用 uvicorn 直接启动
export PYTHONPATH=$(pwd)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

后端服务将在 http://localhost:8000 启动。

### 验证后端是否正常

打开浏览器访问以下地址：

- **API 状态**: http://localhost:8000/
- **Swagger 文档**: http://localhost:8000/docs
- **ReDoc 文档**: http://localhost:8000/redoc

---

## 前端部署

### 1. 进入前端目录

```bash
cd /workspace/examples/ecommerce_agent/frontend
```

### 2. 安装 Node.js 依赖

```bash
# 安装依赖（使用 npm）
npm install

# 或者使用 pnpm（如果已安装）
pnpm install

# 或者使用 yarn（如果已安装）
yarn install
```

### 3. 配置环境变量（可选）

查看并编辑 `.env.development` 文件（如果需要）：

```bash
cat .env.development
```

默认配置通常已经足够：
```env
VITE_API_URL=http://localhost:8000
```

### 4. 启动前端开发服务器

```bash
# 启动开发服务器
npm run dev
```

前端服务将在 http://localhost:5173 启动。

---

## 完整启动（推荐流程）

### 步骤 1：启动后端（新终端）

```bash
cd /workspace/examples/ecommerce_agent
export PYTHONPATH=$(pwd)
uv run python -m backend.main
```

看到以下输出表示启动成功：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 步骤 2：启动前端（新终端）

```bash
cd /workspace/examples/ecommerce_agent/frontend
npm run dev
```

看到以下输出表示启动成功：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 步骤 3：访问应用

打开浏览器访问：http://localhost:5173

---

## 快速验证

### 验证清单

请按顺序验证以下内容：

#### 1. 后端健康检查

```bash
# 检查根路径
curl http://localhost:8000/

# 预期响应：
# {"app":"Ecommerce Agent","version":"0.1.0","status":"running"}
```

#### 2. 检查拼多多 API

```bash
# 健康检查
curl http://localhost:8000/api/pdd/health

# 获取店铺列表
curl http://localhost:8000/api/pdd/stores
```

#### 3. 前端页面检查

在浏览器中访问 http://localhost:5173，检查：

- [ ] 页面正常加载
- [ ] 菜单显示完整
- [ ] 可以正常切换页面
- [ ] 控制台无错误

---

## 使用管理脚本（可选但推荐）

项目提供了管理脚本，可以更方便地管理服务：

```bash
# 查看脚本帮助
./manage.sh help

# 启动所有服务
./manage.sh start

# 停止所有服务
./manage.sh stop

# 查看服务状态
./manage.sh status

# 重启服务
./manage.sh restart
```

---

## 常见问题

### 问题 1：uv 命令找不到

**解决方案**：
```bash
# 重新安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 然后重新打开终端
```

### 问题 2：ModuleNotFoundError: No module named 'xxx'

**解决方案**：
```bash
# 确保设置了 PYTHONPATH
export PYTHONPATH=/path/to/ecommerce_agent

# 重新安装依赖
uv sync
```

### 问题 3：Playwright 安装失败

**解决方案**：
```bash
# 尝试使用国内镜像
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright \
  uv run playwright install chromium

# 或者只安装 chromium
uv run playwright install chromium
```

### 问题 4：端口被占用

**解决方案**：
```bash
# Windows (使用 PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS / Linux
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# 或者修改启动端口
# 后端：修改 main.py 中的端口
# 前端：在 package.json 中修改 dev 脚本
```

### 问题 5：npm install 很慢或失败

**解决方案**：
```bash
# 使用国内镜像源
npm config set registry https://registry.npmmirror.com

# 然后重新安装
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 问题 6：数据库初始化失败

**解决方案**：
```bash
# 确保 data/db 目录存在
mkdir -p data/db

# 检查目录权限
chmod 755 data/db
```

---

## 开发指南

### 添加新功能

1. **后端功能**：在 `backend/` 目录下开发
2. **前端页面**：在 `frontend/src/views/` 目录下开发
3. **数据库模型**：在 `backend/database/models.py` 中定义

### 运行测试

```bash
# 后端测试
pytest backend/tests/

# 前端测试
cd frontend
npm run test
```

---

## 生产环境部署

如果需要部署到生产环境，请参考：

1. 修改配置使用 PostgreSQL/MySQL 数据库
2. 配置 Nginx 反向代理
3. 使用 Docker 容器化部署
4. 配置 HTTPS 证书

详细的生产部署指南请参考 `docs/DEPLOYMENT.md`。

---

## 下一步

部署完成后，你可以：

1. 📖 阅读 [README.md](./README.md) 了解项目功能
2. 🚀 访问 [http://localhost:5173](http://localhost:5173) 开始使用
3. 📚 查看 [API 文档](http://localhost:8000/docs) 了解接口
4. 🛠️ 参考 [DEVELOPMENT.md](./docs/DEVELOPMENT.md) 进行开发

---

## 技术支持

如果遇到问题：

1. 查看日志输出
2. 检查端口是否被占用
3. 确认依赖是否完整安装
4. 查看项目文档

祝你使用愉快！🎉
