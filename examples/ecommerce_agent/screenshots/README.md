# 页面截图保存标准

## 保存位置

### 1. 项目目录备份
- 位置：`/workspace/examples/ecommerce_agent/screenshots/`
- 用途：本地备份和归档

### 2. 前端静态资源目录（可公开访问）
- 位置：`/workspace/examples/ecommerce_agent/frontend/public/screenshots/`
- 用途：通过前端服务（http://localhost:5173/）公开访问

## 文件命名规范

使用数字前缀 + 描述性名称的格式：
- `01-home-page.png` - 首页
- `02-ai-assistant.png` - AI 智能助手
- `03-store-management.png` - 店铺管理
- `04-task-management.png` - 任务管理
- `05-product-management.png` - 商品管理
- `06-data-analysis.png` - 数据分析
- `07-agent-workbench.png` - Agent 工作台
- `08-workflow-config.png` - 工作流配置
- `09-product-library.png` - 商品库

## 访问方式

### 本地文件访问
直接在项目目录中查看：
- `screenshots/01-home-page.png`

### 云端访问
通过前端服务访问：
- `http://localhost:5173/screenshots/01-home-page.png`

## 保存流程

1. 使用浏览器工具访问页面
2. 截图保存到临时位置
3. 复制到项目备份目录：`screenshots/`
4. 复制到前端静态目录：`frontend/public/screenshots/`
5. 确保文件命名规范统一
