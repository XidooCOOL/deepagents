<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-layout has-sider position="absolute" class="h-screen">
            <!-- 侧边栏 -->
            <n-layout-sider
              bordered
              collapse-mode="width"
              :collapsed-width="64"
              :width="240"
              :collapsed="isCollapsed"
              @collapse="toggleSidebar"
              @expand="toggleSidebar"
            >
              <!-- Logo 区域 -->
              <div class="p-4 flex items-center gap-3 border-b border-divider">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <n-icon :size="22" color="white"><component :is="icons.Cart" /></n-icon>
                </div>
                <div v-show="!isCollapsed" class="flex-1 overflow-hidden">
                  <h1 class="text-lg font-bold text-neutral-900 dark:text-white m-0 truncate">电商助手</h1>
                </div>
              </div>

              <!-- 菜单区域 -->
              <n-menu
                :collapsed="isCollapsed"
                :collapsed-width="64"
                :collapsed-icon-size="22"
                :options="menuOptions"
                :value="currentRoute"
                @update:value="handleMenuClick"
              />

              <!-- 底部区域 -->
              <div class="p-3 border-t border-divider">
                <div class="flex items-center justify-between">
                  <div v-show="!isCollapsed" class="flex items-center gap-2">
                    <n-tag size="small" type="info">v1.0.0</n-tag>
                  </div>
                  <n-button size="small" quaternary @click="toggleSidebar">
                    <template #icon>
                      <n-icon>
                        <component :is="isCollapsed ? icons.ArrowForward : icons.ArrowBack" />
                      </n-icon>
                    </template>
                  </n-button>
                </div>
              </div>
            </n-layout-sider>

            <!-- 主内容区 -->
            <n-layout style="min-width: 0">
              <!-- 顶部导航栏 -->
              <n-layout-header bordered class="px-6 flex items-center">
                <n-breadcrumb>
                  <n-breadcrumb-item>
                    <n-icon><component :is="icons.Home" /></n-icon>
                  </n-breadcrumb-item>
                  <n-breadcrumb-item>
                    {{ pageTitle }}
                  </n-breadcrumb-item>
                </n-breadcrumb>

                <div class="flex-1"></div>

                <!-- 右侧操作区 -->
                <n-space align="center">
                  <n-button size="small" quaternary circle @click="toggleTheme">
                    <template #icon>
                      <n-icon><component :is="isDark ? icons.Sunny : icons.Moon" /></n-icon>
                    </template>
                  </n-button>
                  
                  <n-button size="small" quaternary circle @click="showQuickAction = true">
                    <template #icon>
                      <n-icon><component :is="icons.Flash" /></n-icon>
                    </template>
                  </n-button>
                  
                  <n-button size="small" quaternary circle @click="refreshData">
                    <template #icon>
                      <n-icon><component :is="icons.Refresh" /></n-icon>
                    </template>
                  </n-button>
                  
                  <n-dropdown trigger="click">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center cursor-pointer">
                      <span class="text-white text-sm font-medium">U</span>
                    </div>
                    <template #options>
                      <n-dropdown-option :icon="renderIcon(icons.Person)">
                        个人中心
                      </n-dropdown-option>
                      <n-dropdown-option :icon="renderIcon(icons.Settings)">
                        设置
                      </n-dropdown-option>
                      <n-dropdown-option :icon="renderIcon(icons.LogOut)">
                        退出登录
                      </n-dropdown-option>
                    </template>
                  </n-dropdown>
                </n-space>
              </n-layout-header>

              <!-- 内容区域 -->
              <n-layout-content content-style="padding: 24px; min-height: calc(100vh - 64px);">
                <router-view />
              </n-layout-content>
            </n-layout>
          </n-layout>

          <!-- 快捷操作抽屉 -->
          <n-drawer v-model:show="showQuickAction" placement="right" :width="360">
            <n-drawer-content title="⚡ 快捷操作" native-scrollbar>
              <div class="p-4 space-y-6">
                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    <n-icon><component :is="icons.Create" /></n-icon>
                    <span>创建任务</span>
                  </div>
                  <n-button type="primary" @click="$router.push('/agent')" block>
                    <template #icon><n-icon><component :is="icons.Magic" /></n-icon></template>
                    智能任务创建
                  </n-button>
                  <n-button @click="$router.push('/tasks')" block>
                    <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
                    手动创建任务
                  </n-button>
                </div>

                <n-divider />

                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    <n-icon><component :is="icons.Settings" /></n-icon>
                    <span>快速配置</span>
                  </div>
                  <n-button @click="$router.push('/workflow-config')" block>
                    <template #icon><n-icon><component :is="icons.Filter" /></n-icon></template>
                    工作流配置
                  </n-button>
                  <n-button @click="$router.push('/elements')" block>
                    <template #icon><n-icon><component :is="icons.DocText" /></n-icon></template>
                    元素管理
                  </n-button>
                </div>

                <n-divider />

                <div class="space-y-3">
                  <div class="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    <n-icon><component :is="icons.StatsChart" /></n-icon>
                    <span>查看数据</span>
                  </div>
                  <n-button @click="$router.push('/data')" block>
                    <template #icon><n-icon><component :is="icons.TrendingUp" /></n-icon></template>
                    数据分析
                  </n-button>
                  <n-button @click="$router.push('/orders')" block>
                    <template #icon><n-icon><component :is="icons.Cart" /></n-icon></template>
                    订单列表
                  </n-button>
                </div>
              </div>
            </n-drawer-content>
          </n-drawer>
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NButton, NIcon, NTag, NSpace, NBreadcrumb, NBreadcrumbItem, NDrawer, NDrawerContent, NDivider, NDropdown } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const route = useRoute()
const router = useRouter()
const showQuickAction = ref(false)
const isCollapsed = ref(false)
const isDark = ref(false)

const themeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    primaryColorSuppl: '#36ad6a'
  }
}

const theme = computed(() => {
  return isDark.value ? { name: 'dark' } : { name: 'light' }
})

const renderIcon = (icon: any) => {
  return () => h(icon)
}

const menuOptions = [
  {
    label: '核心功能',
    key: 'core',
    type: 'group',
    children: [
      {
        label: '控制台',
        key: '/',
        icon: renderIcon(icons.Home)
      }
    ]
  },
  {
    label: '拼多多平台',
    key: 'pdd',
    type: 'group',
    children: [
      {
        label: '数据概览',
        key: '/pdd/dashboard',
        icon: renderIcon(icons.StatsChart)
      },
      {
        label: '店铺管理',
        key: '/pdd/stores',
        icon: renderIcon(icons.Storefront)
      }
    ]
  },
  {
    label: 'AI 助手',
    key: 'ai',
    type: 'group',
    children: [
      {
        label: '智能 AI 助手',
        key: '/ai',
        icon: renderIcon(icons.Magic)
      },
      {
        label: 'Agent工作台',
        key: '/agent',
        icon: renderIcon(icons.Person)
      },
      {
        label: '工作流配置',
        key: '/workflow-config',
        icon: renderIcon(icons.Settings)
      }
    ]
  },
  {
    label: '配置管理',
    key: 'config',
    type: 'group',
    children: [
      {
        label: '店铺管理',
        key: '/stores',
        icon: renderIcon(icons.Business)
      },
      {
        label: '元素管理',
        key: '/elements',
        icon: renderIcon(icons.DocText)
      },
      {
        label: '技能管理',
        key: '/skills',
        icon: renderIcon(icons.Hammer)
      },
      {
        label: '模型配置',
        key: '/llm-config',
        icon: renderIcon(icons.Cube)
      },
      {
        label: '飞书集成',
        key: '/feishu',
        icon: renderIcon(icons.Chatbubbles)
      },
      {
        label: 'Webhook管理',
        key: '/webhooks',
        icon: renderIcon(icons.Notification)
      }
    ]
  },
  {
    label: '任务中心',
    key: 'tasks',
    type: 'group',
    children: [
      {
        label: '任务管理',
        key: '/tasks',
        icon: renderIcon(icons.List)
      },
      {
        label: '定时任务',
        key: '/scheduled-tasks',
        icon: renderIcon(icons.Time)
      }
    ]
  },
  {
    label: '数据中心',
    key: 'data',
    type: 'group',
    children: [
      {
        label: '订单管理',
        key: '/orders',
        icon: renderIcon(icons.Cart)
      },
      {
        label: '商品管理',
        key: '/products',
        icon: renderIcon(icons.Pricetags)
      },
      {
        label: '商品库',
        key: '/product-library',
        icon: renderIcon(icons.Cube)
      },
      {
        label: '批量发布',
        key: '/product-publish',
        icon: renderIcon(icons.CloudUpload)
      },
      {
        label: '已发布商品',
        key: '/published-products',
        icon: renderIcon(icons.CheckmarkDone)
      },
      {
        label: '数据分析',
        key: '/data',
        icon: renderIcon(icons.StatsChart)
      }
    ]
  }
]

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

const currentRoute = computed(() => route.path)
const pageTitle = computed(() => pageTitleMap[route.path] || '控制台')

const handleMenuClick = (key: string) => {
  router.push(key)
}

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
:deep(.n-layout-sider) {
  transition: all 0.3s ease;
}
</style>
