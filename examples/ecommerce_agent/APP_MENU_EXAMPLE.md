# App.vue 菜单调整示例代码

## 一、整合后的侧边栏菜单完整代码

```vue
<template>
  <el-container class="app-container">
    <el-aside :width="isCollapsed ? '64px' : '240px'" class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="logo">
        <el-icon :size="isCollapsed ? 32 : 28" color="#409eff"><component :is="icons.ShoppingCart" /></el-icon>
        <h2 v-show="!isCollapsed">电商助手</h2>
        <div v-show="!isCollapsed" class="platform-badge">多平台版</div>
      </div>
      
      <el-menu :default-active="activeMenu" class="sidebar-menu" router :collapse="isCollapsed">
        <!-- 核心功能 -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">🖥️ 核心功能</div>
          <el-menu-item index="/">
            <el-icon><component :is="icons.HomeFilled" /></el-icon>
            <template #title>控制台</template>
          </el-menu-item>
        </div>
        
        <!-- 拼多多平台 (新增) -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">🛒 拼多多平台</div>
          <el-menu-item index="/pdd/stores">
            <el-icon><component :is="icons.OfficeBuilding" /></el-icon>
            <template #title>店铺管理</template>
          </el-menu-item>
          <el-menu-item index="/pdd/products/publish">
            <el-icon><component :is="icons.Upload" /></el-icon>
            <template #title>商品发布</template>
          </el-menu-item>
          <el-menu-item index="/pdd/orders">
            <el-icon><component :is="icons.ShoppingCart" /></el-icon>
            <template #title>订单处理</template>
          </el-menu-item>
          <el-menu-item index="/pdd/marketing">
            <el-icon><component :is="icons.Present" /></el-icon>
            <template #title>营销活动</template>
          </el-menu-item>
          <el-menu-item index="/pdd/data">
            <el-icon><component :is="icons.DataAnalysis" /></el-icon>
            <template #title>数据报表</template>
          </el-menu-item>
          <el-menu-item index="/pdd/config">
            <el-icon><component :is="icons.Setting" /></el-icon>
            <template #title>API配置</template>
          </el-menu-item>
        </div>
        
        <!-- AI Agent -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">🤖 AI Agent</div>
          <el-menu-item index="/ai-assistant">
            <el-icon><component :is="icons.MagicStick" /></el-icon>
            <template #title>智能助手</template>
          </el-menu-item>
          <el-menu-item index="/agent">
            <el-icon><component :is="icons.Robot" /></el-icon>
            <template #title>Agent工作台</template>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><component :is="icons.ChatDotRound" /></el-icon>
            <template #title>任务对话</template>
          </el-menu-item>
          <el-menu-item index="/workflow-config">
            <el-icon><component :is="icons.Setting" /></el-icon>
            <template #title>工作流配置</template>
          </el-menu-item>
        </div>
        
        <!-- 配置管理 -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">⚙️ 配置管理</div>
          <el-menu-item index="/stores">
            <el-icon><component :is="icons.OfficeBuilding" /></el-icon>
            <template #title>多平台店铺</template>
          </el-menu-item>
          <el-menu-item index="/elements">
            <el-icon><component :is="icons.Document" /></el-icon>
            <template #title>元素管理</template>
          </el-menu-item>
          <el-menu-item index="/skills">
            <el-icon><component :is="icons.Tools" /></el-icon>
            <template #title>技能管理</template>
          </el-menu-item>
          <el-menu-item index="/llm-config">
            <el-icon><component :is="icons.Cpu" /></el-icon>
            <template #title>模型配置</template>
          </el-menu-item>
          <el-menu-item index="/feishu">
            <el-icon><component :is="icons.Message" /></el-icon>
            <template #title>飞书集成</template>
          </el-menu-item>
          <el-menu-item index="/webhooks">
            <el-icon><component :is="icons.Bell" /></el-icon>
            <template #title>Webhook管理</template>
          </el-menu-item>
        </div>
        
        <!-- 任务中心 -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">📋 任务中心</div>
          <el-menu-item index="/tasks">
            <el-icon><component :is="icons.List" /></el-icon>
            <template #title>任务管理</template>
          </el-menu-item>
          <el-menu-item index="/scheduled-tasks">
            <el-icon><component :is="icons.Clock" /></el-icon>
            <template #title>定时任务</template>
          </el-menu-item>
        </div>
        
        <!-- 数据中心 -->
        <div class="menu-section">
          <div class="menu-title" v-show="!isCollapsed">📊 数据中心</div>
          <el-menu-item index="/orders">
            <el-icon><component :is="icons.ShoppingCart" /></el-icon>
            <template #title>多平台订单</template>
          </el-menu-item>
          <el-menu-item index="/products">
            <el-icon><component :is="icons.Goods" /></el-icon>
            <template #title>多平台商品</template>
          </el-menu-item>
          <el-menu-item index="/product-library">
            <el-icon><component :is="icons.Box" /></el-icon>
            <template #title>商品库</template>
          </el-menu-item>
          <el-menu-item index="/product-publish">
            <el-icon><component :is="icons.Upload" /></el-icon>
            <template #title>批量发布</template>
          </el-menu-item>
          <el-menu-item index="/published-products">
            <el-icon><component :is="icons.DocumentChecked" /></el-icon>
            <template #title>已发布</template>
          </el-menu-item>
          <el-menu-item index="/data">
            <el-icon><component :is="icons.DataAnalysis" /></el-icon>
            <template #title>数据分析</template>
          </el-menu-item>
        </div>
      </el-menu>
      
      <div class="sidebar-footer">
        <div class="version-info" v-show="!isCollapsed">
          <el-tag size="small" type="success">v1.0.0</el-tag>
          <span>DeepAgents</span>
        </div>
        <el-button class="collapse-btn" @click="toggleSidebar" :icon="isCollapsed ? icons.ArrowRight : icons.ArrowLeft" circle size="small" />
      </div>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div class="header-title">
            <h1>{{ pageTitle }}</h1>
            <el-dropdown v-if="['/', '/pdd'].some(p => currentPath.startsWith(p))" class="platform-switcher">
              <span class="el-dropdown-link">
                <el-tag size="small" type="primary">当前平台: {{ currentPlatform }}</el-tag>
                <el-icon><component :is="icons.ArrowDown" /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="switchPlatform('全部平台')">
                    <el-icon><component :is="icons.Apps" /></el-icon>全部平台
                  </el-dropdown-item>
                  <el-dropdown-item @click="switchPlatform('拼多多')">
                    <el-icon><component :is="icons.ShoppingCart" /></el-icon>拼多多
                  </el-dropdown-item>
                  <el-dropdown-item @click="switchPlatform('淘宝')">
                    <el-icon><component :is="icons.Shop" /></el-icon>淘宝
                  </el-dropdown-item>
                  <el-dropdown-item @click="switchPlatform('京东')">
                    <el-icon><component :is="icons.Box" /></el-icon>京东
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-button-group>
            <el-button @click="refreshData" :icon="icons.Refresh" size="default">刷新</el-button>
            <el-button type="primary" @click="showQuickAction = true" :icon="icons.Lightning" size="default">
              {{ isPddPage ? '拼多多快捷操作' : '快捷操作' }}
            </el-button>
            <el-button @click="showHelp" :icon="icons.QuestionFilled" size="default">帮助</el-button>
          </el-button-group>
          <el-badge :value="3" class="notification-badge">
            <el-button :icon="icons.Bell" circle size="default" />
          </el-badge>
          <el-dropdown>
            <div class="user-avatar">
              <el-avatar :size="36" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="icons.User">个人中心</el-dropdown-item>
                <el-dropdown-item :icon="icons.Setting">设置</el-dropdown-item>
                <el-dropdown-item divided :icon="icons.SwitchButton">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
    
    <!-- 快捷操作抽屉 -->
    <el-drawer v-model="showQuickAction" :title="isPddPage ? '⚡ 拼多多快捷操作' : '⚡ 快捷操作'" size="400px" direction="rtl">
      <div class="quick-actions">
        <!-- 拼多多快捷操作 -->
        <template v-if="isPddPage">
          <div class="action-section">
            <h4>🎯 拼多多常用操作</h4>
            <el-button type="primary" @click="$router.push('/pdd/products/publish')" style="width: 100%; margin-bottom: 10px;">
              发布拼多多商品
            </el-button>
            <el-button @click="$router.push('/pdd/orders')" style="width: 100%; margin-bottom: 10px;">
              查看拼多多订单
            </el-button>
            <el-button @click="$router.push('/pdd/marketing')" style="width: 100%;">
              创建营销活动
            </el-button>
          </div>
          
          <el-divider />
          
          <div class="action-section">
            <h4>🤖 调用拼多多 Agent</h4>
            <el-button @click="callAgent('pdd_publish')" style="width: 100%; margin-bottom: 10px;">
              AI 智能发布商品
            </el-button>
            <el-button @click="callAgent('pdd_order')" style="width: 100%;">
              AI 自动处理订单
            </el-button>
          </div>
        </template>
        
        <!-- 通用快捷操作 -->
        <template v-else>
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
        </template>
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
        <el-tab-pane label="拼多多平台">
          <el-steps direction="vertical" :space="80" :active="3">
            <el-step title="步骤 1: 配置 API" description="在【拼多多平台】-【API配置】中配置拼多多开放平台密钥" />
            <el-step title="步骤 2: 绑定店铺" description="在【店铺管理】中添加并授权拼多多店铺" />
            <el-step title="步骤 3: 开始使用" description="利用 AI Agent 自动处理拼多多运营工作" />
          </el-steps>
        </el-tab-pane>
        <el-tab-pane label="常见问题">
          <el-collapse>
            <el-collapse-item title="如何配置拼多多 API？">
              <p>1. 进入【拼多多平台】-【API配置】</p>
              <p>2. 输入您的 app_key 和 app_secret</p>
              <p>3. 点击保存并测试连接</p>
            </el-collapse-item>
            <el-collapse-item title="拼多多 Agent 可以做什么？">
              <p>- 自动优化商品标题和详情页</p>
              <p>- 自动回复客户消息</p>
              <p>- 自动创建营销活动</p>
              <p>- 自动分析运营数据</p>
            </el-collapse-item>
            <el-collapse-item title="支持多平台管理吗？">
              <p>支持！可以同时管理拼多多、淘宝、京东等多个平台的店铺</p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as icons from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();

const activeMenu = computed(() => route.path);
const showQuickAction = ref(false);
const showHelpDialog = ref(false);
const isCollapsed = ref(false);
const currentPlatform = ref('全部平台');

// 判断当前是否在拼多多相关页面
const isPddPage = computed(() => route.path.startsWith('/pdd'));

const currentPath = computed(() => route.path);

const shortcuts = [
  { key: 'Ctrl + N', action: '创建新任务' },
  { key: 'Ctrl + S', action: '保存当前配置' },
  { key: 'Ctrl + R', action: '刷新页面' },
  { key: 'Ctrl + Q', action: '打开快捷操作' },
  { key: 'Ctrl + B', action: '切换侧边栏' },
  { key: 'Esc', action: '关闭弹窗' }
];

const pageTitleMap: Record<string, string> = {
  '/': '控制台',
  '/pdd/stores': '拼多多店铺管理',
  '/pdd/products/publish': '拼多多商品发布',
  '/pdd/orders': '拼多多订单处理',
  '/pdd/marketing': '拼多多营销活动',
  '/pdd/data': '拼多多数据报表',
  '/pdd/config': '拼多多API配置',
  '/agent': 'Agent工作台',
  '/chat': '任务对话',
  '/workflow-config': '工作流配置',
  '/stores': '多平台店铺管理',
  '/tasks': '任务管理',
  '/workflow': '工作流',
  '/elements': 'DOM元素管理',
  '/skills': '技能管理',
  '/scheduled-tasks': '定时任务',
  '/data': '数据分析',
  '/orders': '多平台订单',
  '/products': '多平台商品',
  '/product-library': '商品库',
  '/product-publish': '批量发布',
  '/published-products': '已发布商品',
  '/llm-config': '模型配置',
  '/feishu': '飞书集成',
  '/webhooks': 'Webhook管理',
  '/ai-assistant': '智能助手',
  '/tasks/:id': '任务详情'
};

const pageTitle = computed(() => pageTitleMap[route.path] || '控制台');

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const refreshData = () => {
  ElMessage.success('数据已刷新');
  window.location.reload();
};

const showHelp = () => {
  showHelpDialog.value = true;
};

const switchPlatform = (platform: string) => {
  currentPlatform.value = platform;
  ElMessage.success(`已切换到: ${platform}`);
  // 根据平台跳转到对应页面
  if (platform === '拼多多') {
    router.push('/pdd/stores');
  } else if (platform === '全部平台') {
    router.push('/');
  }
};

const callAgent = (agentType: string) => {
  showQuickAction.value = false;
  ElMessage.info(`正在调用 ${agentType} Agent...`);
  // 这里跳转到 Agent 工作台并传递参数
  router.push({ path: '/agent', query: { type: agentType } });
};

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
    e.preventDefault();
    showQuickAction.value = true;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Logo 区域新增样式 */
.platform-badge {
  font-size: 10px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 10px;
}

/* 头部标题区域新增样式 */
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-switcher {
  margin-left: 15px;
}

.platform-switcher .el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

/* 侧边栏样式保持原有优化 */
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
}

.sidebar {
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.sidebar.collapsed {
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
}

.logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  transition: all 0.3s ease;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  color: white;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 10px 0;
}

.menu-section {
  margin-bottom: 16px;
}

.menu-title {
  padding: 12px 20px 8px;
  font-size: 11px;
  color: #909399;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.collapse-btn {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.collapse-btn:hover {
  background: #409eff;
  border-color: #409eff;
  color: white;
  transform: scale(1.1);
}

.header {
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid #f0f0f0;
}

.header-left h1 {
  margin: 0 0 6px 0;
  font-size: 26px;
  color: #303133;
  font-weight: 600;
  background: linear-gradient(135deg, #303133 0%, #409eff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification-badge {
  margin-left: 8px;
}

.user-avatar {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
}

.main {
  padding: 24px 32px;
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
  padding: 24px;
}

.action-section {
  margin-bottom: 24px;
}

.action-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

:deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 4px 12px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

:deep(.el-menu-item:hover) {
  background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
  transform: translateX(4px);
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

:deep(.el-menu-item.is-active .el-icon) {
  color: white;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 8px;
}
</style>
```

---

## 二、主要改动点总结

| 改动区域 | 改动内容 |
|---------|---------|
| Logo 区域 | 新增 "多平台版" 标识标签 |
| 菜单结构 | 新增 "拼多多平台" 分类，包含 6 个子页面 |
| 店铺管理 | 改为 "多平台店铺"，统一管理各平台店铺 |
| 数据中心 | 各页面改为多平台相关命名 |
| 顶部导航 | 新增平台切换下拉菜单，动态显示当前平台 |
| 快捷操作 | 根据当前页面动态显示拼多多专用快捷操作 |
| 帮助对话框 | 新增拼多多平台专属帮助文档 |
| 样式优化 | Logo 区域渐变背景从蓝色改为蓝绿渐变，代表多平台 |
