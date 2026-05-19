<template>
  <div class="home-container">
    <n-card class="mb-6">
      <n-spin :show="loadingStatus">
        <div class="status-section">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#10b981"><CheckmarkCircleOutline /></n-icon>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Status</div>
                  <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Healthy</div>
                </div>
              </div>
            </div>
            
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#525252"><CogOutline /></n-icon>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Compute</div>
                  <n-tag size="small" type="info">N/A</n-tag>
                </div>
              </div>
            </div>
            
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                  <n-icon :size="20" color="#525252"><LinkOutline /></n-icon>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">GitHub</div>
                  <div class="text-sm text-neutral-600 dark:text-neutral-400">No repository connected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-spin>
    </n-card>
    
    <n-card title="控制台" :bordered="false">
      <p class="text-neutral-600 dark:text-neutral-400 mb-4">欢迎使用电商助手管理系统</p>
      <n-space>
        <n-button type="primary" @click="$router.push('/ai')">
          <template #icon><n-icon><Chatbubbles /></n-icon></template>
          智能助手
        </n-button>
        <n-button @click="$router.push('/tasks')">
          <template #icon><n-icon><List /></n-icon></template>
          任务管理
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { CheckmarkCircleOutline, CogOutline, LinkOutline, Chatbubbles, List } from '@vicons/ionicons5'

const message = useMessage()
const loadingStatus = ref(false)
let refreshInterval: number | null = null

const refreshStatus = async () => {
  loadingStatus.value = true
  try {
    // 模拟刷新
  } catch (e) {
    console.error('获取状态失败:', e)
  }
  loadingStatus.value = false
}

onMounted(async () => {
  await refreshStatus()

  refreshInterval = window.setInterval(async () => {
    await refreshStatus()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.home-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
