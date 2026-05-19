<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="智能电商助手，帮您完成各种任务">
      <template #extra>
        <n-space>
          <n-button @click="clearChat">
            <template #icon><n-icon><component :is="icons.Trash" /></n-icon></template>
            清空对话
          </n-button>
          <n-button type="primary" @click="newChat">
            <template #icon><n-icon><component :is="icons.Add" /></n-icon></template>
            新建对话
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <n-grid :x-gap="20" :y-gap="20" cols="1 l:4">
      <!-- 左侧对话列表 -->
      <n-grid-item span="1" l-span="1">
        <n-card title="历史对话" :bordered="false">
          <n-list>
            <n-list-item v-for="chat in chatHistory" :key="chat.id" :clickable="true" :class="{ 'bg-gray-100 dark:bg-gray-800': currentChatId === chat.id }" @click="selectChat(chat.id)">
              <div class="flex items-center gap-3 w-full">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <n-icon :size="16" color="white"><component :is="icons.Chatbubbles" /></n-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">{{ chat.title }}</div>
                  <div class="text-xs text-neutral-500">{{ chat.time }}</div>
                </div>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>

      <!-- 右侧聊天区域 -->
      <n-grid-item span="1" l-span="3">
        <n-card :bordered="false" class="flex flex-col h-[calc(100vh-200px)]">
          <!-- 聊天消息 -->
          <div class="flex-1 overflow-y-auto mb-4" ref="messagesContainer">
            <div v-if="messages.length === 0" class="text-center py-12">
              <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <n-icon :size="40" color="white"><component :is="icons.Chatbubbles" /></n-icon>
              </div>
              <h2 class="text-2xl font-bold mb-2">电商智能助手</h2>
              <p class="text-neutral-500 mb-8">我可以帮您完成各种电商任务，比如发布商品、管理订单等</p>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('帮我发布商品到抖音')">
                  <div class="flex items-center gap-3">
                    <n-icon :size="20" color="#18a058"><component :is="icons.CloudUpload" /></n-icon>
                    <span class="font-medium">发布商品</span>
                  </div>
                  <p class="text-sm text-neutral-500 mt-2">帮我把商品发布到抖音店铺</p>
                </n-card>
                <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('分析今天的销售数据')">
                  <div class="flex items-center gap-3">
                    <n-icon :size="20" color="#18a058"><component :is="icons.TrendingUp" /></n-icon>
                    <span class="font-medium">分析数据</span>
                  </div>
                  <p class="text-sm text-neutral-500 mt-2">分析今天的销售数据</p>
                </n-card>
                <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('抓取最新的订单数据')">
                  <div class="flex items-center gap-3">
                    <n-icon :size="20" color="#18a058"><component :is="icons.Download" /></n-icon>
                    <span class="font-medium">抓取订单</span>
                  </div>
                  <p class="text-sm text-neutral-500 mt-2">抓取最新的订单数据</p>
                </n-card>
                <n-card hoverable class="text-left cursor-pointer" @click="handleQuickQuestion('创建一个定时任务')">
                  <div class="flex items-center gap-3">
                    <n-icon :size="20" color="#18a058"><component :is="icons.Time" /></n-icon>
                    <span class="font-medium">定时任务</span>
                  </div>
                  <p class="text-sm text-neutral-500 mt-2">创建一个定时任务</p>
                </n-card>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div v-for="(msg, index) in messages" :key="index">
                <div v-if="msg.role === 'user'" class="flex justify-end">
                  <div class="bg-primary text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                    {{ msg.content }}
                  </div>
                </div>
                <div v-else class="flex gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <n-icon :size="20" color="white"><component :is="icons.Person" /></n-icon>
                  </div>
                  <div class="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                    <div v-if="msg.type === 'text'" class="whitespace-pre-wrap">{{ msg.content }}</div>
                    <div v-else-if="msg.type === 'task'" class="space-y-3">
                      <n-alert type="info" :closable="false">
                        <template #icon>
                          <n-icon><component :is="icons.Create" /></n-icon>
                        </template>
                        {{ msg.content }}
                      </n-alert>
                      <n-space>
                        <n-button type="primary" size="small" @click="goToTask">
                          <template #icon><n-icon><component :is="icons.Play" /></n-icon></template>
                          开始执行
                        </n-button>
                        <n-button size="small" @click="editTask">
                          <template #icon><n-icon><component :is="icons.Create" /></n-icon></template>
                          编辑任务
                        </n-button>
                      </n-space>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <n-divider />
          <div class="mt-4">
            <n-input
              v-model:value="inputMessage"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 6 }"
              placeholder="输入您的问题，按 Ctrl+Enter 发送..."
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
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useMessage, useRouter } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const router = useRouter()
const pageTitle = 'AI 助手'
const inputMessage = ref('')
const loading = ref(false)
const currentChatId = ref(1)
const messagesContainer = ref<HTMLElement | null>(null)

const chatHistory = ref([
  { id: 1, title: '商品发布咨询', time: '10分钟前' },
  { id: 2, title: '数据统计分析', time: '1小时前' },
  { id: 3, title: '订单处理', time: '昨天' }
])

const messages = ref<Array<{ role: 'user' | 'assistant', content: string, type?: 'text' | 'task' }>>([
  { role: 'user', content: '帮我发布这个商品到抖音' },
  { role: 'assistant', content: '好的，我来帮您发布商品。请先告诉我一些信息：\n\n1. 商品在商品库中吗？\n2. 需要设置什么特殊参数吗？\n3. 要发布到哪个店铺？', type: 'text' }
])

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

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
  
  scrollToBottom()
  
  // 模拟AI回复
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  let reply = ''
  let type: 'text' | 'task' = 'text'
  
  if (userMessage.includes('发布')) {
    reply = '好的，我为您创建了一个商品发布任务。'
    type = 'task'
  } else if (userMessage.includes('分析')) {
    reply = '数据分析完成！今天的销售情况：\n- 总销售额：¥128,560\n- 总订单：1,248单\n- 热销商品：无线蓝牙耳机\n\n需要我生成详细的分析报告吗？'
  } else if (userMessage.includes('订单')) {
    reply = '好的，我来抓取最新的订单数据。选择您要抓取的店铺和时间范围，我就可以开始啦！'
  } else if (userMessage.includes('定时')) {
    reply = '没问题，我来帮您创建定时任务。您希望：\n1. 任务做什么？\n2. 什么时候执行？\n3. 执行频率？'
  } else {
    reply = '您好！我是电商智能助手，我可以帮您完成各种任务，比如商品发布、订单管理、数据分析等。请告诉我您想做什么？'
  }
  
  messages.value.push({
    role: 'assistant',
    content: reply,
    type
  })
  
  loading.value = false
  scrollToBottom()
}

const handleQuickQuestion = (question: string) => {
  inputMessage.value = question
  handleSend()
}

const selectChat = (id: number) => {
  currentChatId.value = id
  message.info(`切换到对话 ${id}`)
}

const clearChat = () => {
  messages.value = []
  message.success('对话已清空')
}

const newChat = () => {
  messages.value = []
  currentChatId.value = chatHistory.value.length + 1
  chatHistory.value.unshift({ id: currentChatId.value, title: '新对话', time: '刚刚' })
  message.success('已创建新对话')
}

const goToTask = () => {
  router.push('/tasks')
}

const editTask = () => {
  router.push('/agent')
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
