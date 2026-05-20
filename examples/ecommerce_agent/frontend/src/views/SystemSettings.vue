<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="管理系统全局配置">
      <template #extra>
        <n-space>
          <n-button @click="exportConfig">
            <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
            导出配置
          </n-button>
          <n-button @click="importConfig">
            <template #icon><n-icon><component :is="icons.CloudUpload" /></n-icon></template>
            导入配置
          </n-button>
          <n-button type="primary" @click="saveConfig">
            <template #icon><n-icon><component :is="icons.Save" /></n-icon></template>
            保存配置
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <!-- 基本设置 -->
      <n-tab-pane name="general" tab="基本设置">
        <n-card title="系统配置">
          <n-form :model="generalConfig" label-placement="left" label-width="120px" class="space-y-4">
            <n-form-item label="系统名称">
              <n-input v-model:value="generalConfig.systemName" placeholder="请输入系统名称" />
            </n-form-item>
            <n-form-item label="API 地址">
              <n-input v-model:value="generalConfig.apiUrl" placeholder="请输入后端 API 地址" />
            </n-form-item>
            <n-form-item label="请求超时">
              <n-input-number v-model:value="generalConfig.timeout" :min="1000" :max="60000" />
              <span class="ml-2 text-sm text-neutral-500">毫秒</span>
            </n-form-item>
            <n-form-item label="自动刷新">
              <n-switch v-model:value="generalConfig.autoRefresh" />
              <span class="ml-2 text-sm text-neutral-500">开启后自动刷新数据</span>
            </n-form-item>
            <n-form-item label="刷新间隔">
              <n-input-number v-model:value="generalConfig.refreshInterval" :min="5" :max="60" />
              <span class="ml-2 text-sm text-neutral-500">秒</span>
            </n-form-item>
            <n-form-item label="默认语言">
              <n-select v-model:value="generalConfig.language" :options="languageOptions" />
            </n-form-item>
            <n-form-item label="主题模式">
              <n-select v-model:value="generalConfig.theme" :options="themeOptions" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <!-- 通知设置 -->
      <n-tab-pane name="notification" tab="通知设置">
        <n-card title="通知配置">
          <n-form :model="notificationConfig" label-placement="left" label-width="120px" class="space-y-4">
            <n-form-item label="邮件通知">
              <n-switch v-model:value="notificationConfig.emailEnabled" />
            </n-form-item>
            <n-form-item label="邮件服务器">
              <n-input v-model:value="notificationConfig.smtpHost" placeholder="SMTP 服务器地址" />
            </n-form-item>
            <n-form-item label="邮件端口">
              <n-input-number v-model:value="notificationConfig.smtpPort" :min="1" :max="65535" />
            </n-form-item>
            <n-form-item label="发件人邮箱">
              <n-input v-model:value="notificationConfig.senderEmail" placeholder="sender@example.com" />
            </n-form-item>
            <n-form-item label="收件人邮箱">
              <n-input v-model:value="notificationConfig.receiverEmail" placeholder="receiver@example.com" />
            </n-form-item>
            <n-form-item label="飞书通知">
              <n-switch v-model:value="notificationConfig.feishuEnabled" />
            </n-form-item>
            <n-form-item label="飞书 Webhook">
              <n-input v-model:value="notificationConfig.feishuWebhook" placeholder="飞书机器人 Webhook 地址" />
            </n-form-item>
            <n-form-item label="任务通知">
              <n-switch v-model:value="notificationConfig.taskNotification" />
              <span class="ml-2 text-sm text-neutral-500">任务完成时发送通知</span>
            </n-form-item>
            <n-form-item label="异常通知">
              <n-switch v-model:value="notificationConfig.errorNotification" />
              <span class="ml-2 text-sm text-neutral-500">系统异常时发送通知</span>
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <!-- 安全设置 -->
      <n-tab-pane name="security" tab="安全设置">
        <n-card title="安全配置">
          <n-form :model="securityConfig" label-placement="left" label-width="120px" class="space-y-4">
            <n-form-item label="登录密码有效期">
              <n-input-number v-model:value="securityConfig.passwordExpireDays" :min="1" :max="365" />
              <span class="ml-2 text-sm text-neutral-500">天</span>
            </n-form-item>
            <n-form-item label="强制修改密码">
              <n-switch v-model:value="securityConfig.forcePasswordChange" />
              <span class="ml-2 text-sm text-neutral-500">首次登录强制修改</span>
            </n-form-item>
            <n-form-item label="登录失败锁定">
              <n-switch v-model:value="securityConfig.loginLockEnabled" />
            </n-form-item>
            <n-form-item label="最大失败次数">
              <n-input-number v-model:value="securityConfig.maxFailedAttempts" :min="3" :max="20" />
              <span class="ml-2 text-sm text-neutral-500">次</span>
            </n-form-item>
            <n-form-item label="锁定时长">
              <n-input-number v-model:value="securityConfig.lockDuration" :min="5" :max="120" />
              <span class="ml-2 text-sm text-neutral-500">分钟</span>
            </n-form-item>
            <n-form-item label="会话超时">
              <n-input-number v-model:value="securityConfig.sessionTimeout" :min="5" :max="120" />
              <span class="ml-2 text-sm text-neutral-500">分钟</span>
            </n-form-item>
            <n-form-item label="双因素认证">
              <n-switch v-model:value="securityConfig.twoFactorAuth" />
              <span class="ml-2 text-sm text-neutral-500">开启双重验证</span>
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <!-- 数据备份 -->
      <n-tab-pane name="backup" tab="数据备份">
        <n-card title="备份配置">
          <n-form :model="backupConfig" label-placement="left" label-width="120px" class="space-y-4">
            <n-form-item label="自动备份">
              <n-switch v-model:value="backupConfig.autoBackup" />
            </n-form-item>
            <n-form-item label="备份时间">
              <n-select v-model:value="backupConfig.backupTime" :options="timeOptions" />
            </n-form-item>
            <n-form-item label="备份保留天数">
              <n-input-number v-model:value="backupConfig.retentionDays" :min="1" :max="365" />
              <span class="ml-2 text-sm text-neutral-500">天</span>
            </n-form-item>
            <n-form-item label="备份路径">
              <n-input v-model:value="backupConfig.backupPath" placeholder="/backup/data" />
            </n-form-item>
            <n-form-item label="备份类型">
              <n-checkbox-group v-model:value="backupConfig.backupTypes">
                <n-space>
                  <n-checkbox value="database" label="数据库" />
                  <n-checkbox value="files" label="文件" />
                  <n-checkbox value="config" label="配置" />
                </n-space>
              </n-checkbox-group>
            </n-form-item>
          </n-form>
          <n-divider />
          <n-space>
            <n-button @click="createBackup">
              <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
              立即备份
            </n-button>
            <n-button @click="restoreBackup">
              <template #icon><n-icon><component :is="icons.CloudUpload" /></n-icon></template>
              恢复备份
            </n-button>
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- 日志设置 -->
      <n-tab-pane name="logging" tab="日志设置">
        <n-card title="日志配置">
          <n-form :model="loggingConfig" label-placement="left" label-width="120px" class="space-y-4">
            <n-form-item label="日志级别">
              <n-select v-model:value="loggingConfig.level" :options="logLevelOptions" />
            </n-form-item>
            <n-form-item label="日志保留天数">
              <n-input-number v-model:value="loggingConfig.retentionDays" :min="1" :max="30" />
              <span class="ml-2 text-sm text-neutral-500">天</span>
            </n-form-item>
            <n-form-item label="日志文件大小">
              <n-input-number v-model:value="loggingConfig.maxFileSize" :min="10" :max="1000" />
              <span class="ml-2 text-sm text-neutral-500">MB</span>
            </n-form-item>
            <n-form-item label="控制台日志">
              <n-switch v-model:value="loggingConfig.consoleEnabled" />
            </n-form-item>
            <n-form-item label="文件日志">
              <n-switch v-model:value="loggingConfig.fileEnabled" />
            </n-form-item>
            <n-form-item label="远程日志">
              <n-switch v-model:value="loggingConfig.remoteEnabled" />
            </n-form-item>
            <n-form-item label="远程日志地址">
              <n-input v-model:value="loggingConfig.remoteUrl" placeholder="远程日志服务器地址" />
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '系统设置'
const activeTab = ref('general')

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const themeOptions = [
  { label: '跟随系统', value: 'auto' },
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' }
]

const timeOptions = [
  { label: '00:00', value: '00:00' },
  { label: '02:00', value: '02:00' },
  { label: '04:00', value: '04:00' },
  { label: '06:00', value: '06:00' },
  { label: '08:00', value: '08:00' },
  { label: '23:00', value: '23:00' }
]

const logLevelOptions = [
  { label: 'DEBUG', value: 'debug' },
  { label: 'INFO', value: 'info' },
  { label: 'WARN', value: 'warn' },
  { label: 'ERROR', value: 'error' }
]

const generalConfig = ref({
  systemName: '电商助手',
  apiUrl: 'http://localhost:8000',
  timeout: 30000,
  autoRefresh: true,
  refreshInterval: 30,
  language: 'zh-CN',
  theme: 'auto'
})

const notificationConfig = ref({
  emailEnabled: true,
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  senderEmail: 'notifications@example.com',
  receiverEmail: 'admin@example.com',
  feishuEnabled: true,
  feishuWebhook: '',
  taskNotification: true,
  errorNotification: true
})

const securityConfig = ref({
  passwordExpireDays: 90,
  forcePasswordChange: false,
  loginLockEnabled: true,
  maxFailedAttempts: 5,
  lockDuration: 15,
  sessionTimeout: 30,
  twoFactorAuth: false
})

const backupConfig = ref({
  autoBackup: true,
  backupTime: '02:00',
  retentionDays: 7,
  backupPath: '/backup/ecommerce_agent',
  backupTypes: ['database', 'files']
})

const loggingConfig = ref({
  level: 'info',
  retentionDays: 7,
  maxFileSize: 100,
  consoleEnabled: true,
  fileEnabled: true,
  remoteEnabled: false,
  remoteUrl: ''
})

const saveConfig = () => {
  message.success('配置已保存')
}

const exportConfig = () => {
  message.info('正在导出配置...')
}

const importConfig = () => {
  message.info('正在导入配置...')
}

const createBackup = () => {
  message.success('备份已创建')
}

const restoreBackup = () => {
  message.info('正在恢复备份...')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
