<template>
  <div class="page-container flex flex-col h-[calc(100vh-100px)]">
    <n-page-header :title="pageTitle" subtitle="与 AI 协作完成电商任务">
      <template #extra>
        <n-space>
          <n-button @click="showSettings = true">
            <template #icon><n-icon><component :is="icons.Settings" /></n-icon></template>
            设置
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <div class="flex-1 flex gap-4 overflow-hidden">
      <!-- 左侧：任务信息面板 -->
      <div class="w-80 flex-shrink-0">
        <n-card title="当前任务" :bordered="false" class="h-full">
          <n-space vertical>
            <n-descriptions :column="1" bordered>
              <n-descriptions-item label="任务ID">
                #12345
              </n-descriptions-item>
              <n-descriptions-item label="任务类型">
                <n-tag type="info">商品发布</n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="状态">
                <n-tag type="warning">进行中</n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="创建时间">
                2024-01-15 14:30
              </n-descriptions-item>
            </n-descriptions>

            <n-divider />
            
            <div>
              <div class="text-sm font-medium mb-2">执行步骤</div>
              <n-steps current="2">
                <n-step title="登录店铺" description="登录抖音商家后台" status="finish" />
                <n-step title="发布商品" description="正在上传商品信息" status="process" />
                <n-step title="验证商品" description="等待平台审核" status="wait" />
                <n-step title="完成" description="任务完成" status="wait" />
              </n-steps>
            </div>

            <n-divider />

            <div>
              <div class="text-sm font-medium mb-2">进度</div>
              <n-progress type="line" :percentage="45" :show-indicator="true" />
            </div>

            <n-space justify="center">
              <n-button type="primary" @click="pauseTask">
                <template #icon><n-icon><component :is="icons.Pause" /></n-icon></template>
                暂停
              </n-button>
              <n-button type="error" @click="stopTask">
                <template #icon><n-icon><component :is="icons.Stop" /></n-icon></template>
                停止
              </n-button>
            </n-space>
          </n-space>
        </n-card>
      </div>

      <!-- 中间：聊天区域 -->
      <div class="flex-1 flex flex-col">
        <n-card :bordered="false" class="flex-1 flex flex-col">
          <div class="flex-1 overflow-y-auto mb-4" ref="messagesContainer">
            <n-timeline>
              <n-timeline-item type="success" title="任务开始" time="14:30:00">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p class="text-sm">任务开始执行，目标是发布 5 个商品到抖音店铺</p>
                </div>
              </n-timeline-item>
              <n-timeline-item type="success" title="登录成功" time="14:30:05">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p class="text-sm">已成功登录抖音商家后台</p>
                </div>
              </n-timeline-item>
              <n-timeline-item type="info" title="正在处理" time="14:30:15">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p class="text-sm mb-2">正在上传第 2 个商品...</p>
                  <div class="flex gap-2">
                    <n-tag size="small">无线蓝牙耳机</n-tag>
                    <n-tag size="small" type="success">已完成</n-tag>
                  </div>
                  <div class="flex gap-2 mt-2">
                    <n-tag size="small">快速无线充电器</n-tag>
                    <n-spin size="small" />
                  </div>
                </div>
              </n-timeline-item>
              <n-timeline-item type="default" title="用户提问" time="14:30:20">
                <div class="flex gap-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <n-icon :size="16" color="white"><component :is="icons.Person" /></n-icon>
                  </div>
                  <div class="flex-1">
                    <div class="bg-primary text-white rounded-2xl rounded-br-md px-3 py-2 inline-block">
                      能加快一点速度吗？
                    </div>
                  </div>
                </div>
              </n-timeline-item>
              <n-timeline-item type="info" title="AI 回复" time="14:30:22">
                <div class="flex gap-3">
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <n-icon :size="16" color="white"><component :is="icons.Chatbubbles" /></n-icon>
                  </div>
                  <div class="flex-1">
                    <div class="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2">
                      好的，我会加快处理速度。不过需要注意，过快可能会触发平台风控。
                    </div>
                  </div>
                </div>
              </n-timeline-item>
            </n-timeline>
          </div>

          <n-divider />
          
          <div>
            <n-input
              v-model:value="inputMessage"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="输入指令或问题..."
              @keyup.enter.ctrl="handleSend"
            />
            <div class="flex items-center justify-between mt-3">
              <div class="text-sm text-neutral-500">
                按 Ctrl + Enter 发送
              </div>
              <n-space>
                <n-button quaternary size="small">
                  <template #icon><n-icon><component :is="icons.Attach" /></n-icon></template>
                </n-button>
                <n-button type="primary" @click="handleSend" :loading="loading">
                  <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
                  发送
                </n-button>
              </n-space>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧：文件和日志 -->
      <div class="w-80 flex-shrink-0">
        <n-card title="日志" :bordered="false" class="h-full">
          <n-tabs type="line" default-value="logs">
            <n-tab-pane name="logs" tab="执行日志">
              <n-log
                :lines="logLines"
                :rows="20"
                :font-size="12"
                class="h-[400px]"
              />
            </n-tab-pane>
            <n-tab-pane name="files" tab="相关文件">
              <n-list>
                <n-list-item>
                  <div class="flex items-center gap-3 w-full">
                    <n-icon :size="20" color="#18a058"><component :is="icons.DocumentText" /></n-icon>
                    <div class="flex-1">
                      <div class="text-sm font-medium">商品列表.xlsx</div>
                      <div class="text-xs text-neutral-500">5 个商品 · 2.3MB</div>
                    </div>
                    <n-button quaternary size="small">
                      <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
                    </n-button>
                  </div>
                </n-list-item>
                <n-list-item>
                  <div class="flex items-center gap-3 w-full">
                    <n-icon :size="20" color="#18a058"><component :is="icons.Images" /></n-icon>
                    <div class="flex-1">
                      <div class="text-sm font-medium">产品图片.zip</div>
                      <div class="text-xs text-neutral-500">15 张图片 · 8.7MB</div>
                    </div>
                    <n-button quaternary size="small">
                      <template #icon><n-icon><component :is="icons.Download" /></n-icon></template>
                    </n-button>
                  </div>
                </n-list-item>
              </n-list>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </div>

    <!-- 设置抽屉 -->
    <n-drawer v-model:show="showSettings" width="400" placement="right">
      <n-drawer-content title="聊天设置" native-scrollbar>
        <n-form label-placement="left" label-width="100px">
          <n-form-item label="消息样式">
            <n-select v-model:value="messageStyle" :options="styleOptions" />
          </n-form-item>
          <n-form-item label="字体大小">
            <n-slider v-model:value="fontSize" :min="12" :max="20" />
          </n-form-item>
          <n-form-item label="自动滚动">
            <n-switch v-model:value="autoScroll" />
          </n-form-item>
          <n-form-item label="时间戳">
            <n-switch v-model:value="showTimestamp" />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="showSettings = false">取消</n-button>
            <n-button type="primary" @click="saveSettings">保存</n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '任务聊天'
const inputMessage = ref('')
const loading = ref(false)
const showSettings = ref(false)
const messageStyle = ref('modern')
const fontSize = ref(14)
const autoScroll = ref(true)
const showTimestamp = ref(true)
const messagesContainer = ref<HTMLElement | null>(null)

const styleOptions = [
  { label: '现代风格', value: 'modern' },
  { label: '简洁风格', value: 'simple' },
  { label: '气泡风格', value: 'bubble' }
]

const logLines = ref([
  '[14:30:00] 任务开始',
  '[14:30:02] 初始化浏览器',
  '[14:30:04] 加载登录页面',
  '[14:30:05] 输入用户名',
  '[14:30:06] 输入密码',
  '[14:30:07] 点击登录按钮',
  '[14:30:08] 等待登录验证',
  '[14:30:10] 登录成功',
  '[14:30:12] 导航到商品发布页面',
  '[14:30:14] 开始上传商品 1/5',
  '[14:30:18] 商品 1 上传成功',
  '[14:30:20] 开始上传商品 2/5',
  '[14:30:22] 正在处理商品图片...',
  '[14:30:25] 正在填写商品信息...'
])

const handleSend = async () => {
  if (!inputMessage.value.trim()) return
  
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  logLines.value.push(`[${new Date().toLocaleTimeString()}] 用户: ${inputMessage.value}`)
  inputMessage.value = ''
  loading.value = false
  message.success('消息已发送')
}

const pauseTask = () => {
  message.info('任务已暂停')
}

const stopTask = () => {
  message.warning('任务已停止')
}

const saveSettings = () => {
  message.success('设置已保存')
  showSettings.value = false
}

onMounted(() => {
  // 模拟日志追加
  setInterval(() => {
    const actions = ['正在处理...', '上传中...', '验证中...', '等待响应...']
    const randomAction = actions[Math.floor(Math.random() * actions.length)]
    logLines.value.push(`[${new Date().toLocaleTimeString()}] ${randomAction}`)
  }, 3000)
})
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
