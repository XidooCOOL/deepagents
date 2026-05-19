<template>
  <div class="page-container">
    <n-card :title="pageTitle" :bordered="false">
      <p class="text-gray-500 mb-4">
        此页面正在迁移到 Naive UI，敬请期待...
      </p>
      <n-space>
        <n-button type="primary" @click="$router.push('/')">
          <template #icon><n-icon><HomeOutline /></n-icon></template>
          返回首页
        </n-button>
        <n-button quaternary @click="$router.push('/ai')">
          <template #icon><n-icon><Chatbubbles /></n-icon></template>
          去 AI 助手
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeOutline, Chatbubbles } from '@vicons/ionicons5'

const route = useRoute()
const pageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/agent': 'Agent 控制台',
    '/ai-assistant': 'AI 助手',
    '/chat': '聊天界面',
    '/data': '数据分析',
    '/elements': '元素管理',
    '/feishu': '飞书集成',
    '/llm-config': 'LLM 配置',
    '/orders': '订单管理',
    '/product-library': '商品库',
    '/product-publish': '商品发布',
    '/published-products': '已发布商品',
    '/scheduled-tasks': '定时任务',
    '/skills': '技能管理',
    '/stores': '店铺管理',
    '/tasks': '任务管理',
    '/webhooks': 'Webhook 管理',
    '/workflow': '工作流',
    '/workflow-config': '工作流配置',
    '/pdd/dashboard': '拼多多数据概览',
    '/pdd/stores': '拼多多店铺管理'
  }
  return titleMap[route.path] || '页面开发中'
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}
</style>
