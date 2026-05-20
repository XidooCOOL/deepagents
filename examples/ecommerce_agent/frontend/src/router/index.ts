import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/ai',
    name: 'UnifiedAI',
    component: () => import('../views/UnifiedAI.vue')
  },
  {
    path: '/agent',
    name: 'AgentConsole',
    component: () => import('../views/AgentConsole.vue')
  },
  {
    path: '/workflow-config',
    name: 'WorkflowConfig',
    component: () => import('../views/WorkflowConfig.vue')
  },
  {
    path: '/stores',
    name: 'Stores',
    component: () => import('../views/Stores.vue')
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/Tasks.vue')
  },
  {
    path: '/workflow/:taskId',
    name: 'Workflow',
    component: () => import('../views/Workflow.vue')
  },
  {
    path: '/elements',
    name: 'Elements',
    component: () => import('../views/Elements.vue')
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('../views/Skills.vue')
  },
  {
    path: '/scheduled-tasks',
    name: 'ScheduledTasks',
    component: () => import('../views/ScheduledTasks.vue')
  },
  {
    path: '/data',
    name: 'Data',
    component: () => import('../views/Data.vue')
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue')
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('../views/Products.vue')
  },
  {
    path: '/product-library',
    name: 'ProductLibrary',
    component: () => import('../views/ProductLibrary.vue')
  },
  {
    path: '/product-publish',
    name: 'ProductPublish',
    component: () => import('../views/ProductPublish.vue')
  },
  {
    path: '/published-products',
    name: 'PublishedProducts',
    component: () => import('../views/PublishedProducts.vue')
  },
  {
    path: '/llm-config',
    name: 'LLMConfig',
    component: () => import('../views/LLMConfig.vue')
  },
  {
    path: '/chat',
    name: 'ChatInterface',
    component: () => import('../views/ChatInterface.vue')
  },
  {
    path: '/feishu',
    name: 'Feishu',
    component: () => import('../views/Feishu.vue')
  },
  {
    path: '/webhooks',
    name: 'Webhooks',
    component: () => import('../views/Webhooks.vue')
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('../views/TaskDetail.vue')
  },
  {
    path: '/ai-assistant',
    name: 'AIAssistant',
    component: () => import('../views/AIAssistant.vue')
  },
  {
    path: '/pdd/stores',
    name: 'PddStores',
    component: () => import('../views/pdd/Stores.vue')
  },
  {
    path: '/pdd/dashboard',
    name: 'PddDashboard',
    component: () => import('../views/pdd/Dashboard.vue')
  },
  {
    path: '/pdd/extract',
    name: 'PddExtract',
    component: () => import('../views/pdd/Extract.vue')
  },
  {
    path: '/pdd/comments',
    name: 'PddComments',
    component: () => import('../views/pdd/Comments.vue')
  },
  {
    path: '/pdd/batch',
    name: 'PddBatch',
    component: () => import('../views/pdd/Batch.vue')
  },
  {
    path: '/pdd/data-detail',
    name: 'PddDataDetail',
    component: () => import('../views/pdd/DataDetail.vue')
  },
  {
    path: '/system-monitor',
    name: 'SystemMonitor',
    component: () => import('../views/SystemMonitor.vue')
  },
  {
    path: '/api-test',
    name: 'ApiTest',
    component: () => import('../views/ApiTest.vue')
  },
  {
    path: '/system-settings',
    name: 'SystemSettings',
    component: () => import('../views/SystemSettings.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
