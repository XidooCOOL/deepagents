<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="配置飞书集成">
      <template #extra>
        <n-button type="primary" @click="handleSave">
          <template #icon><n-icon><component :is="icons.Save" /></n-icon></template>
          保存配置
        </n-button>
      </template>
    </n-page-header>

    <!-- 连接状态 -->
    <n-card class="mb-6">
      <n-space vertical>
        <div class="flex items-center justify-between">
          <span class="font-medium">飞书连接状态</span>
          <n-tag :type="connected ? 'success' : 'error'">
            {{ connected ? '已连接' : '未连接' }}
          </n-tag>
        </div>
        <n-button @click="handleConnect" :loading="connecting">
          {{ connected ? '重新连接' : '连接飞书' }}
        </n-button>
      </n-space>
    </n-card>

    <!-- 基础配置 -->
    <n-card title="基础配置" :bordered="false" class="mb-6">
      <n-form :model="form" label-placement="left" label-width="140px">
        <n-form-item label="App ID">
          <n-input v-model:value="form.appId" placeholder="请输入App ID" />
        </n-form-item>
        <n-form-item label="App Secret">
          <n-input v-model:value="form.appSecret" type="password" show-password-on="click" placeholder="请输入App Secret" />
        </n-form-item>
        <n-form-item label="接收通知群">
          <n-input v-model:value="form.chatId" placeholder="请输入群聊ID" />
        </n-form-item>
      </n-form>
    </n-card>

    <!-- 通知设置 -->
    <n-card title="通知设置" :bordered="false">
      <n-form :model="notifications" label-placement="left" label-width="200px">
        <n-form-item label="任务完成通知">
          <n-switch v-model:value="notifications.taskComplete" />
        </n-form-item>
        <n-form-item label="任务失败通知">
          <n-switch v-model:value="notifications.taskFailed" />
        </n-form-item>
        <n-form-item label="每日数据报告">
          <n-switch v-model:value="notifications.dailyReport" />
        </n-form-item>
        <n-form-item label="异常告警通知">
          <n-switch v-model:value="notifications.alerts" />
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '飞书集成'
const connected = ref(false)
const connecting = ref(false)

const form = reactive({
  appId: '',
  appSecret: '',
  chatId: ''
})

const notifications = reactive({
  taskComplete: true,
  taskFailed: true,
  dailyReport: false,
  alerts: true
})

const handleConnect = async () => {
  connecting.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  connected.value = true
  message.success('飞书连接成功')
  connecting.value = false
}

const handleSave = () => {
  message.success('配置保存成功')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
