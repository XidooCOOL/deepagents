<template>
  <n-config-provider>
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <div class="app-container h-screen flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden">
            <!-- 侧边栏 -->
            <aside
              class="sidebar flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-shrink-0 transition-all duration-300 flex"
              :class="isCollapsed ? 'w-16' : 'w-64'"
            >
              <!-- Logo 区域 -->
              <div class="logo-area h-16 px-4 flex items-center border-b border-neutral-200 dark:border-neutral-800">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <n-icon :size="20" color="white"><component :is="icons.Cart" /></n-icon>
                  </div>
                  <h1 v-show="!isCollapsed" class="text-lg font-semibold tracking-tight m-0">电商助手</h1>
                </div>
              </div>

              <!-- 菜单区域 -->
              <nav class="flex-1 overflow-y-auto py-3">
                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">🖥️ 核心功能</div>
                  <div class="space-y-1">
                    <router-link to="/" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Home" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">控制台</span>
                    </router-link>
                  </div>
                </div>

                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">🛒 拼多多平台</div>
                  <div class="space-y-1">
                    <router-link to="/pdd/dashboard" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/pdd/dashboard' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.StatsChart" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">数据概览</span>
                    </router-link>
                    <router-link to="/pdd/stores" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/pdd/stores' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Storefront" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">店铺管理</span>
                    </router-link>
                  </div>
                </div>

                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">🤖 AI 助手</div>
                  <div class="space-y-1">
                    <router-link to="/ai" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/ai' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Magic" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">智能 AI 助手</span>
                    </router-link>
                    <router-link to="/agent" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/agent' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Person" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">Agent工作台</span>
                    </router-link>
                    <router-link to="/workflow-config" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/workflow-config' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Settings" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">工作流配置</span>
                    </router-link>
                  </div>
                </div>

                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">⚙️ 配置管理</div>
                  <div class="space-y-1">
                    <router-link to="/stores" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/stores' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Business" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">店铺管理</span>
                    </router-link>
                    <router-link to="/elements" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/elements' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.DocText" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">元素管理</span>
                    </router-link>
                    <router-link to="/skills" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/skills' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Hammer" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">技能管理</span>
                    </router-link>
                    <router-link to="/llm-config" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/llm-config' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Cube" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">模型配置</span>
                    </router-link>
                    <router-link to="/feishu" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/feishu' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Chatbubbles" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">飞书集成</span>
                    </router-link>
                    <router-link to="/webhooks" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/webhooks' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Notification" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">Webhook管理</span>
                    </router-link>
                  </div>
                </div>

                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">📋 任务中心</div>
                  <div class="space-y-1">
                    <router-link to="/tasks" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/tasks' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.List" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">任务管理</span>
                    </router-link>
                    <router-link to="/scheduled-tasks" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/scheduled-tasks' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Time" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">定时任务</span>
                    </router-link>
                  </div>
                </div>

                <div class="px-3 mb-2">
                  <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-2" v-show="!isCollapsed">📊 数据中心</div>
                  <div class="space-y-1">
                    <router-link to="/orders" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/orders' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Cart" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">订单管理</span>
                    </router-link>
                    <router-link to="/products" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/products' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Pricetags" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">商品管理</span>
                    </router-link>
                    <router-link to="/product-library" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/product-library' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.Cube" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">商品库</span>
                    </router-link>
                    <router-link to="/product-publish" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/product-publish' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.CloudUpload" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">批量发布</span>
                    </router-link>
                    <router-link to="/published-products" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/published-products' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.CheckmarkDone" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">已发布</span>
                    </router-link>
                    <router-link to="/data" class="menu-item flex items-center gap-3 px-3 py-2 rounded-md transition-colors" :class="route.path === '/data' ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'">
                      <n-icon :size="18"><component :is="icons.StatsChart" /></n-icon>
                      <span v-show="!isCollapsed" class="text-sm">数据分析</span>
                    </router-link>
                  </div>
                </div>
              </nav>

              <!-- 底部区域 -->
              <div class="border-t border-neutral-200 dark:border-neutral-800 p-3">
                <div class="flex items-center justify-between">
                  <div v-show="!isCollapsed" class="flex items-center gap-2">
                    <span class="text-xs text-neutral-500">v1.0.0</span>
                  </div>
                  <button
                    @click="toggleSidebar"
                    class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <n-icon :size="18">
                      <component :is="isCollapsed ? icons.ArrowForward : icons.ArrowBack" />
                    </n-icon>
                  </button>
                </div>
              </div>
            </aside>

            <!-- 主内容区 -->
            <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
              <!-- 顶部导航栏 -->
              <header class="header h-16 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-6 gap-4">
                <!-- 面包屑 -->
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="text-neutral-600 dark:text-neutral-400">电商助手</span>
                    <span class="text-neutral-400">/</span>
                    <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ pageTitle }}</span>
                  </div>
                  <n-tag size="small" type="warning" class="ml-2">PRODUCTION</n-tag>
                </div>

                <div class="flex-1"></div>

                <!-- 右侧操作区 -->
                <div class="flex items-center gap-3">
                  <n-button size="small" @click="toggleTheme" quaternary>
                    <template #icon>
                      <n-icon><component :is="isDark ? icons.Sunny : icons.Moon" /></n-icon>
                    </template>
                    <span class="hidden sm:inline">{{ isDark ? '亮色' : '暗色' }}</span>
                  </n-button>

                  <n-button size="small" @click="showQuickAction = true" quaternary>
                    <template #icon>
                      <n-icon><component :is="icons.Flash" /></n-icon>
                    </template>
                    <span class="hidden sm:inline">快捷操作</span>
                  </n-button>

                  <n-button size="small" @click="refreshData" quaternary>
                    <template #icon>
                      <n-icon><component :is="icons.Refresh" /></n-icon>
                    </template>
                  </n-button>

                  <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center cursor-pointer">
                    <span class="text-white text-sm font-medium">U</span>
                  </div>
                </div>
              </header>

              <!-- 内容区域 -->
              <div class="flex-1 overflow-auto p-6">
                <router-view />
              </div>
            </main>

            <!-- 快捷操作抽屉 -->
            <n-drawer v-model:show="showQuickAction" title="⚡ 快捷操作" placement="right" :width="400">
              <div class="p-4 space-y-4">
                <div class="space-y-2">
                  <h4 class="text-sm font-semibold text-neutral-500">🎯 创建任务</h4>
                  <n-button type="primary" @click="$router.push('/agent')" style="width: 100%;">
                    智能任务创建
                  </n-button>
                  <n-button @click="$router.push('/tasks')" style="width: 100%;">
                    手动创建任务
                  </n-button>
                </div>

                <n-divider />

                <div class="space-y-2">
                  <h4 class="text-sm font-semibold text-neutral-500">📝 快速配置</h4>
                  <n-button @click="$router.push('/workflow-config')" style="width: 100%;">
                    工作流配置
                  </n-button>
                  <n-button @click="$router.push('/elements')" style="width: 100%;">
                    元素管理
                  </n-button>
                </div>

                <n-divider />

                <div class="space-y-2">
                  <h4 class="text-sm font-semibold text-neutral-500">📊 查看数据</h4>
                  <n-button @click="$router.push('/data')" style="width: 100%;">
                    数据分析
                  </n-button>
                  <n-button @click="$router.push('/orders')" style="width: 100%;">
                    订单列表
                  </n-button>
                </div>
              </div>
            </n-drawer>
          </div>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import * as icons from '@vicons/ionicons5'

const route = useRoute()
const showQuickAction = ref(false)
const isCollapsed = ref(false)
const isDark = ref(false)

const renderIcon = (icon: any) => {
  return () => h(icon)
}

const pageTitleMap: Record<string, string> = {
  '/': '控制台',
  '/ai': '智能 AI 助手',
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
  '/published-products': '已发布商品',
  '/llm-config': '模型配置',
  '/feishu': '飞书集成',
  '/webhooks': 'Webhook管理',
  '/ai-assistant': '智能助手',
  '/pdd/dashboard': '数据概览',
  '/pdd/stores': '店铺管理'
}

const pageTitle = computed(() => pageTitleMap[route.path] || '控制台')

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', String(isCollapsed.value))
}

const refreshData = () => {
  window.location.reload()
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const savedCollapsed = localStorage.getItem('sidebarCollapsed')
  if (savedCollapsed !== null) {
    isCollapsed.value = savedCollapsed === 'true'
  }

  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  } else if (savedTheme === 'light') {
    isDark.value = false
    document.documentElement.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = prefersDark
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    }
  }
})
</script>

<style scoped>
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.menu-item {
  text-decoration: none;
}

.menu-item:hover {
  text-decoration: none;
}
</style>
