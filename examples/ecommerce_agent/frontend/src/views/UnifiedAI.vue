<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="统一AI工作台">
      <template #extra>
        <n-button type="primary" @click="handleNew">
          <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
          新建任务
        </n-button>
      </template>
    </n-page-header>

    <!-- 快捷功能 -->
    <n-grid :x-gap="20" :y-gap="20" cols="1 s:2 m:4" class="mb-6">
      <n-grid-item>
        <n-card hoverable class="text-center cursor-pointer" @click="$router.push('/ai')">
          <n-icon :size="32" color="#18a058"><component :is="icons.Chatbubbles" /></n-icon>
          <div class="font-medium mt-2">智能对话</div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable class="text-center cursor-pointer" @click="$router.push('/agent')">
          <n-icon :size="32" color="#18a058"><component :is="icons.Person" /></n-icon>
          <div class="font-medium mt-2">Agent工作流</div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable class="text-center cursor-pointer" @click="$router.push('/workflow-config')">
          <n-icon :size="32" color="#18a058"><component :is="icons.Settings" /></n-icon>
          <div class="font-medium mt-2">工作流配置</div>
        </n-card>
      </n-grid-item>
      <n-grid-item>
        <n-card hoverable class="text-center cursor-pointer" @click="$router.push('/llm-config')">
          <n-icon :size="32" color="#18a058"><component :is="icons.Cube" /></n-icon>
          <div class="font-medium mt-2">模型设置</div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 最近对话 -->
    <n-card title="最近对话" :bordered="false">
      <n-list>
        <n-list-item v-for="item in recentChats" :key="item.id" clickable>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <n-avatar :size="32">
                <component :is="icons.Chatbubbles" />
              </n-avatar>
              <div>
                <div class="font-medium">{{ item.title }}</div>
                <div class="text-sm text-neutral-500">{{ item.preview }}</div>
              </div>
            </div>
            <div class="text-sm text-neutral-500">{{ item.time }}</div>
          </div>
        </n-list-item>
      </n-list>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '统一AI'

const recentChats = ref([
  { id: 1, title: '商品发布咨询', preview: '你好，我想了解如何批量发布商品...', time: '5分钟前' },
  { id: 2, title: '数据统计分析', preview: '请帮我分析一下最近的销售数据...', time: '30分钟前' },
  { id: 3, title: '订单处理', preview: '如何自动处理待发货订单...', time: '2小时前' }
])

const handleNew = () => {
  message.info('新建对话')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
