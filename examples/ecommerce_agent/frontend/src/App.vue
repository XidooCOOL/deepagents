<template>
  <el-container class="app-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon :size="32" color="#409eff"><component :is="icons.ShoppingCart" /></el-icon>
        <h2>电商助手</h2>
      </div>
      
      <el-menu :default-active="activeMenu" class="sidebar-menu" router>
        <div class="menu-section">
          <div class="menu-title">🖥️ 核心功能</div>
          <el-menu-item index="/">
            <el-icon><component :is="icons.HomeFilled" /></el-icon>
            <span>控制台</span>
          </el-menu-item>
        </div>
        
        <div class="menu-section">
          <div class="menu-title">🤖 AI Agent</div>
          <el-menu-item index="/agent">
            <el-icon><component :is="icons.Robot" /></el-icon>
            <span>Agent工作台</span>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><component :is="icons.ChatDotRound" /></el-icon>
            <span>任务对话</span>
          </el-menu-item>
          <el-menu-item index="/workflow-config">
            <el-icon><component :is="icons.Setting" /></el-icon>
            <span>工作流配置</span>
          </el-menu-item>
        </div>
        
        <div class="menu-section">
          <div class="menu-title">⚙️ 配置管理</div>
          <el-menu-item index="/stores">
            <el-icon><component :is="icons.OfficeBuilding" /></el-icon>
            <span>店铺管理</span>
          </el-menu-item>
          <el-menu-item index="/elements">
            <el-icon><component :is="icons.Document" /></el-icon>
            <span>元素管理</span>
          </el-menu-item>
          <el-menu-item index="/skills">
            <el-icon><component :is="icons.Tools" /></el-icon>
            <span>技能管理</span>
          </el-menu-item>
          <el-menu-item index="/llm-config">
            <el-icon><component :is="icons.Cpu" /></el-icon>
            <span>模型配置</span>
          </el-menu-item>
        </div>
        
        <div class="menu-section">
          <div class="menu-title">📋 任务中心</div>
          <el-menu-item index="/tasks">
            <el-icon><component :is="icons.List" /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/scheduled-tasks">
            <el-icon><component :is="icons.Clock" /></el-icon>
            <span>定时任务</span>
          </el-menu-item>
        </div>
        
        <div class="menu-section">
          <div class="menu-title">📊 数据中心</div>
          <el-menu-item index="/orders">
            <el-icon><component :is="icons.ShoppingCart" /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
          <el-menu-item index="/products">
            <el-icon><component :is="icons.Goods" /></el-icon>
            <span>商品管理</span>
          </el-menu-item>
          <el-menu-item index="/product-library">
            <el-icon><component :is="icons.Box" /></el-icon>
            <span>商品库</span>
          </el-menu-item>
          <el-menu-item index="/product-publish">
            <el-icon><component :is="icons.Upload" /></el-icon>
            <span>批量发布</span>
          </el-menu-item>
          <el-menu-item index="/data">
            <el-icon><component :is="icons.DataAnalysis" /></el-icon>
            <span>数据分析</span>
          </el-menu-item>
        </div>
      </el-menu>
      
      <div class="sidebar-footer">
        <div class="version-info">
          <el-tag size="small" type="success">v1.0.0</el-tag>
          <span>DeepAgents</span>
        </div>
      </div>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h1>{{ pageTitle }}</h1>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-button-group>
            <el-button @click="refreshData" icon="Refresh" size="default">刷新</el-button>
            <el-button @click="showHelp" icon="QuestionFilled" size="default">帮助</el-button>
          </el-button-group>
          <el-badge :value="3" class="notification-badge">
            <el-button icon="Bell" circle size="default" />
          </el-badge>
        </div>
      </el-header>
      
      <el-main class="main">
        <router-view />
      </el-main>
      
      <el-footer class="footer" height="60px">
        <div class="footer-content">
          <span>© 2024 电商助手 - 基于 DeepAgents 框架</span>
          <el-link type="primary" href="https://github.com/XidooCOOL/deepagents" target="_blank">
            GitHub
          </el-link>
        </div>
      </el-footer>
    </el-container>
    
    <el-drawer v-model="showQuickAction" title="⚡ 快捷操作" size="400px" direction="rtl">
      <div class="quick-actions">
        <div class="action-section">
          <h4>🎯 创建任务</h4>
          <el-button type="primary" @click="$router.push('/agent')" style="width: 100%; margin-bottom: 10px;">
            智能任务创建
          </el-button>
          <el-button @click="$router.push('/tasks')" style="width: 100%;">
            手动创建任务
          </el-button>
        </div>
        
        <el-divider />
        
        <div class="action-section">
          <h4>📝 快速配置</h4>
          <el-button @click="$router.push('/workflow-config')" style="width: 100%; margin-bottom: 10px;">
            工作流配置
          </el-button>
          <el-button @click="$router.push('/elements')" style="width: 100%;">
            元素管理
          </el-button>
        </div>
        
        <el-divider />
        
        <div class="action-section">
          <h4>📊 查看数据</h4>
          <el-button @click="$router.push('/data')" style="width: 100%; margin-bottom: 10px;">
            数据分析
          </el-button>
          <el-button @click="$router.push('/orders')" style="width: 100%;">
            订单列表
          </el-button>
        </div>
      </div>
    </el-drawer>
    
    <el-dialog v-model="showHelpDialog" title="❓ 帮助指南" width="60%">
      <el-tabs>
        <el-tab-pane label="快速开始">
          <el-steps direction="vertical" :space="100" :active="4">
            <el-step title="步骤 1: 创建工作流" description="在【工作流配置】中定义自动化步骤" />
            <el-step title="步骤 2: 配置技能" description="在【技能管理】中选择 Agent 能力" />
            <el-step title="步骤 3: 创建任务" description="在【Agent工作台】中输入任务指令" />
            <el-step title="步骤 4: 执行监控" description="实时查看任务执行进度和日志" />
          </el-steps>
        </el-tab-pane>
        <el-tab-pane label="常见问题">
          <el-collapse>
            <el-collapse-item title="如何配置商品发布工作流？">
              <p>1. 进入【工作流配置】页面</p>
              <p>2. 创建新模板，选择"商品发布"类型</p>
              <p>3. 添加步骤：导航、输入、上传等</p>
              <p>4. 定义参数占位符：{title}, {price}, {images}</p>
            </el-collapse-item>
            <el-collapse-item title="如何上传商品图片？">
              <p>1. 在步骤中添加"上传"类型的操作</p>
              <p>2. 配置选择器和参数名（如 images）</p>
              <p>3. 创建任务时，系统会提示上传图片</p>
            </el-collapse-item>
            <el-collapse-item title="多 Agent 如何并行执行？">
              <p>1. 配置多个 Agent 实例</p>
              <p>2. 为每个 Agent 分配不同的技能</p>
              <p>3. 输入任务时，Agent 会自动分配</p>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
        <el-tab-pane label="快捷键">
          <el-table :data="shortcuts" size="small">
            <el-table-column prop="key" label="快捷键" width="150" />
            <el-table-column prop="action" label="功能" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as icons from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => route.path)
const showQuickAction = ref(false)
const showHelpDialog = ref(false)

const shortcuts = [
  { key: 'Ctrl + N', action: '创建新任务' },
  { key: 'Ctrl + S', action: '保存当前配置' },
  { key: 'Ctrl + R', action: '刷新页面' },
  { key: 'Ctrl + Q', action: '打开快捷操作' },
  { key: 'Esc', action: '关闭弹窗' }
]

const pageTitleMap: Record<string, string> = {
  '/': '控制台',
  '/agent': 'Agent工作台',
  '/chat': '任务对话',
  '/workflow-config': '工作流配置',
  '/stores': '店铺管理',
  '/tasks': '任务管理',
  '/workflow': '工作流',
  '/elements': 'DOM元素管理',
  '/skills': '技能管理',
  '/scheduled-tasks': '定时任务',
  '/data': '数据分析',
  '/orders': '订单管理',
  '/products': '商品管理',
  '/product-library': '商品库',
  '/product-publish': '批量发布',
  '/llm-config': '模型配置'
}

const pageTitle = computed(() => pageTitleMap[route.path] || '控制台')

const refreshData = () => {
  ElMessage.success('数据已刷新')
  window.location.reload()
}

const showHelp = () => {
  showHelpDialog.value = true
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.menu-section {
  margin-bottom: 20px;
}

.menu-title {
  padding: 10px 20px;
  font-size: 12px;
  color: #909399;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px;
  border-top: 1px solid #f0f0f0;
  background: white;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.header {
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.notification-badge {
  margin-left: 10px;
}

.main {
  padding: 20px 30px;
  overflow-y: auto;
}

.footer {
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #f0f0f0;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
  color: #909399;
}

.quick-actions {
  padding: 20px;
}

.action-section {
  margin-bottom: 20px;
}

.action-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

:deep(.el-menu-item) {
  height: 45px;
  line-height: 45px;
  margin: 2px 10px;
  border-radius: 6px;
}

:deep(.el-menu-item:hover) {
  background: #ecf5ff;
}

:deep(.el-menu-item.is-active) {
  background: #409eff;
  color: white;
}

:deep(.el-menu-item.is-active .el-icon) {
  color: white;
}
</style>
