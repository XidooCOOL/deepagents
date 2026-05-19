<template>
  <div class="page-container">
    <n-card title="智能 AI 助手" :bordered="false">
      <p class="text-gray-500 mb-4">
        此页面正在迁移到 Naive UI，敬请期待...
      </p>
      <n-space>
        <n-button type="primary" @click="$router.push('/')">
          <template #icon><n-icon><HomeOutline /></n-icon></template>
          返回首页
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeOutline } from '@vicons/ionicons5'

const route = useRoute()
const pageTitle = computed(() => {
  return '智能 AI 助手'
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}
</style>
