<template>
  <div class="page-container flex flex-col h-[calc(100vh-64px)]">
    <!-- 聊天区域 -->
    <div class="flex-1 overflow-y-auto p-6">
      <n-space vertical style="width: 100%; max-width: 800px; margin: 0 auto">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="text-center py-16">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <n-icon :size="32" color="white"><component :is="icons.Person" /></n-icon>
          </div>
          <h2 class="text-2xl font-bold mb-2">你好！我是电商助手</h2>
          <p class="text-neutral-500 dark:text-neutral-400 mb-8">我可以帮你完成各种电商任务，试试问我一些问题吧</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('帮我发布商品到抖音')">
              <div class="flex items-center gap-3">
                <n-icon :size="20" color="#3b82f6"><component :is="icons.CloudUpload" /></n-icon>
                <span>帮我发布商品到抖音</span>
              </div>
            </n-card>
            <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('分析今天的销售数据')">
              <div class="flex items-center gap-3">
                <n-icon :size="20" color="#10b981"><component :is="icons.TrendingUp" /></n-icon>
                <span>分析今天的销售数据</span>
              </div>
            </n-card>
            <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('抓取最新的订单数据')">
              <div class="flex items-center gap-3">
                <n-icon :size="20" color="#8b5cf6"><component :is="icons.Download" /></n-icon>
                <span>抓取最新的订单数据</span>
              </div>
            </n-card>
            <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('创建一个定时任务')">
              <div class="flex items-center gap-3">
                <n-icon :size="20" color="#f59e0b"><component :is="icons.Time" /></n-icon>
                <span>创建一个定时任务</span>
              </div>
            </n-card>
          </div>
        </div>

        <!-- 聊天消息 -->
        <div v-else>
          <div v-for="(msg, index) in messages" :key="index" class="mb-4">
            <div v-if="msg.role === 'user'" class="flex justify-end">
              <div class="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                {{ msg.content }}
              </div>
            </div>
            <div v-else class="flex gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <n-icon :size="20" color="white"><component :is="icons.Person" /></n-icon>
              </div>
              <div class="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                {{ msg.content }}
              </div>
            </div>
          </div>
        </div>
      </n-space>
    </div>

    <!-- 输入区域 -->
    <div class="border-t border-neutral-200 dark:border-neutral-700 p-6">
      <div style="max-width: 800px; margin: 0 auto">
        <n-input
          v-model:value="inputMessage"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          placeholder="输入你的问题..."
          @keyup.enter.ctrl="handleSend"
        />
        <div class="flex items-center justify-between mt-3">
          <div class="text-sm text-neutral-500">
            按 Ctrl + Enter 发送
          </div>
          <n-space>
            <n-button quaternary circle>
              <template #icon><n-icon><component :is="icons.Attach" /></n-icon></template>
            </n-button>
            <n-button type="primary" @click="handleSend" :loading="loading">
              <template #icon><n-icon><component :is="icons.Send" /></n-icon></template>
              发送
            </n-button>
          </n-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '智能AI助手'
const inputMessage = ref('')
const loading = ref(false)

const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])

const handleSend = async () => {
  if (!inputMessage.value.trim()) return
  
  loading.value = true
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: inputMessage.value
  })
  
  const userMessage = inputMessage.value
  inputMessage.value = ''
  
  // 模拟AI回复
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  let reply = ''
  if (userMessage.includes('发布')) {
    reply = '好的！我来帮你发布商品。请告诉我：\n1. 你要发布到哪个平台？\n2. 商品在商品库中吗？\n3. 需要设置什么特殊参数吗？'
  } else if (userMessage.includes('分析')) {
    reply = '数据分析完成！今天的销售情况：\n- 总销售额：¥128,560\n- 总订单：1,248单\n- 热销商品：无线蓝牙耳机\n\n需要我生成详细的分析报告吗？'
  } else if (userMessage.includes('订单')) {
    reply = '好的，我来抓取最新的订单数据。选择你要抓取的店铺和时间范围，我就可以开始啦！'
  } else if (userMessage.includes('定时')) {
    reply = '没问题！我来帮你创建定时任务。你希望：\n1. 任务做什么？\n2. 什么时候执行？\n3. 执行频率？'
  } else {
    reply = '你好！我可以帮你完成各种电商任务，比如商品发布、订单管理、数据分析等。请告诉我你想做什么？'
  }
  
  messages.value.push({
    role: 'assistant',
    content: reply
  })
  
  loading.value = false
}

const handleQuickQuestion = (question: string) => {
  inputMessage.value = question
  handleSend()
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
