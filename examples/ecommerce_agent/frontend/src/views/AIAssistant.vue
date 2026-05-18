<template>
  <div class="ai-assistant">
    <div class="page-header">
      <h2>🤖 智能助手</h2>
      <p class="subtitle">AI驱动的任务理解与自动规划</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="chat-card">
          <template #header>
            <div class="card-header">
              <span class="text-lg font-semibold">💬 智能对话</span>
              <el-tag :type="connected ? 'success' : 'info'" size="small">
                {{ connected ? 'AI 已就绪' : '连接中...' }}
              </el-tag>
            </div>
          </template>
          
          <div class="chat-messages" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="text-6xl mb-4">🚀</div>
              <h3>开始智能任务规划</h3>
              <p>描述您的需求，AI将自动理解并生成执行计划</p>
              <div class="quick-prompts mt-4">
                <el-tag
                  v-for="prompt in quickPrompts"
                  :key="prompt.text"
                  class="mx-1 cursor-pointer hover:bg-blue-50"
                  @click="sendMessage(prompt.text)"
                >
                  {{ prompt.text }}
                </el-tag>
              </div>
            </div>
            
            <div v-else>
              <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="['message', msg.role]"
              >
                <div class="message-avatar">
                  <span v-if="msg.role === 'user'">👤</span>
                  <span v-else>🤖</span>
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="sender">{{ msg.role === 'user' ? '您' : 'AI 助手' }}</span>
                    <span class="time">{{ msg.time }}</span>
                  </div>
                  
                  <div v-if="msg.role === 'user'" class="message-bubble">
                    {{ msg.content }}
                  </div>
                  
                  <div v-else class="ai-response">
                    <div v-if="msg.intent" class="intent-result">
                      <div class="intent-header">
                        <span class="text-sm text-gray-500">识别意图:</span>
                        <el-tag :type="getIntentType(msg.intent.type)" size="small">
                          {{ formatIntentType(msg.intent.type) }}
                        </el-tag>
                        <span class="confidence">
                          置信度: {{ (msg.intent.confidence * 100).toFixed(0) }}%
                        </span>
                      </div>
                      
                      <div v-if="msg.intent.platforms?.length" class="platforms mt-2">
                        <span class="text-xs text-gray-400">涉及平台:</span>
                        <el-tag
                          v-for="p in msg.intent.platforms"
                          :key="p"
                          size="small"
                          class="mx-1"
                        >
                          {{ formatPlatform(p) }}
                        </el-tag>
                      </div>
                      
                      <div v-if="msg.intent.suggestions?.length" class="suggestions mt-2">
                        <span class="text-xs text-gray-400">建议:</span>
                        <ul class="ml-4">
                          <li v-for="s in msg.intent.suggestions" :key="s" class="text-xs text-gray-500">
                            {{ s }}
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div v-if="msg.plan" class="plan-result mt-4">
                      <div class="plan-header">
                        <h4>📋 执行计划</h4>
                        <div class="plan-meta">
                          <el-tag size="small" type="warning">
                            预计 {{ msg.plan.estimated_duration }} 秒
                          </el-tag>
                          <el-tag size="small" :type="getPriorityType(msg.plan.priority)">
                            {{ msg.plan.priority }} 优先级
                          </el-tag>
                        </div>
                      </div>
                      
                      <el-steps :active="currentStepIndex" direction="vertical" class="mt-4">
                        <el-step
                          v-for="(step, idx) in msg.plan.steps"
                          :key="step.id"
                          :title="step.name"
                          :description="step.description"
                          :status="getStepStatus(idx, msg.plan.steps)"
                        >
                          <template #icon>
                            <div
                              :class="[
                                'step-icon',
                                { 'active': idx === currentStepIndex },
                                { 'completed': idx < currentStepIndex }
                              ]"
                            >
                              <span v-if="idx < currentStepIndex">✓</span>
                              <span v-else>{{ idx + 1 }}</span>
                            </div>
                          </template>
                        </el-step>
                      </el-steps>
                      
                      <div class="plan-actions mt-4">
                        <el-button type="primary" @click="executePlan(msg.plan)">
                          ▶️ 开始执行
                        </el-button>
                        <el-button @click="savePlan(msg.plan)">
                          💾 保存计划
                        </el-button>
                      </div>
                    </div>
                    
                    <div v-else class="message-bubble mt-2">
                      {{ msg.content }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="chat-input">
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="描述您的需求，例如：帮我发布一个商品到抖音..."
              @keydown.ctrl.enter="sendMessage()"
            />
            <div class="input-actions mt-3 flex justify-between items-center">
              <div class="left-actions flex gap-2">
                <el-button size="small" @click="clearChat">
                  清空对话
                </el-button>
              </div>
              <div class="right-actions flex gap-2">
                <span class="text-xs text-gray-400">Ctrl+Enter 发送</span>
                <el-button
                  type="primary"
                  @click="sendMessage()"
                  :disabled="!inputText.trim() || loading"
                  :loading="loading"
                >
                  {{ loading ? '分析中...' : '🚀 发送' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="recommend-card mb-4">
          <template #header>
            <span>💡 智能推荐</span>
          </template>
          
          <el-tabs v-model="activeRecommendTab">
            <el-tab-pane label="发布时间" name="time">
              <div class="recommend-form">
                <el-select v-model="recommendForm.platform" placeholder="选择平台" class="w-full mb-3">
                  <el-option label="抖音" value="douyin" />
                  <el-option label="拼多多" value="pinduoduo" />
                  <el-option label="淘宝" value="taobao" />
                  <el-option label="京东" value="jingdong" />
                </el-select>
                <el-button type="primary" @click="getPublishTime" :loading="loadingRecommend">
                  获取推荐时间
                </el-button>
              </div>
              
              <div v-if="publishTimeResult" class="result mt-4">
                <div class="result-item">
                  <span class="label">推荐发布时间:</span>
                  <span class="value font-bold text-blue-500">
                    {{ publishTimeResult.recommended_hour }}:00
                  </span>
                </div>
                <div class="result-item">
                  <span class="label">最佳时段:</span>
                  <span class="value">
                    {{ publishTimeResult.best_hours?.join(', ') }}
                  </span>
                </div>
                <div class="result-item">
                  <span class="label">高峰时段:</span>
                  <span class="value text-red-500">
                    {{ publishTimeResult.peak_hours?.join(', ') }}
                  </span>
                </div>
                <el-alert
                  :title="publishTimeResult.reason"
                  type="info"
                  :closable="false"
                  class="mt-3"
                />
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="价格策略" name="price">
              <div class="recommend-form">
                <el-input
                  v-model.number="priceForm.costPrice"
                  type="number"
                  placeholder="成本价"
                  class="mb-2"
                >
                  <template #prepend>成本价 ¥</template>
                </el-input>
                <el-input
                  v-model="priceForm.category"
                  placeholder="商品类目"
                  class="mb-2"
                />
                <el-select v-model="priceForm.platform" placeholder="目标平台" class="w-full mb-3">
                  <el-option label="抖音" value="douyin" />
                  <el-option label="拼多多" value="pinduoduo" />
                  <el-option label="淘宝" value="taobao" />
                  <el-option label="京东" value="jingdong" />
                </el-select>
                <el-button type="primary" @click="getPriceRecommend" :loading="loadingRecommend">
                  获取建议
                </el-button>
              </div>
              
              <div v-if="priceResult" class="result mt-4">
                <div class="price-result">
                  <div class="price-main">
                    <span class="text-xs text-gray-400">建议售价</span>
                    <div class="text-3xl font-bold text-red-500">
                      ¥{{ priceResult.recommended_price }}
                    </div>
                  </div>
                  <div class="price-range">
                    <span class="text-xs">建议范围: ¥{{ priceResult.min_price }} - ¥{{ priceResult.max_price }}</span>
                  </div>
                </div>
                <el-progress
                  :percentage="parseFloat(priceResult.margin)"
                  :format="() => `${priceResult.margin}% 利润`"
                  class="mt-3"
                />
                <el-tag :type="priceResult.strategy === 'competitive' ? 'success' : 'warning'" class="mt-2">
                  {{ priceResult.strategy === 'competitive' ? '竞争型定价' : '溢价型定价' }}
                </el-tag>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="平台选择" name="platform">
              <div class="recommend-form">
                <el-input
                  v-model="platformForm.category"
                  placeholder="商品类目"
                  class="mb-2"
                />
                <el-input
                  v-model.number="platformForm.price"
                  type="number"
                  placeholder="预估价格"
                  class="mb-3"
                >
                  <template #prepend>价格 ¥</template>
                </el-input>
                <el-button type="primary" @click="getPlatformRecommend" :loading="loadingRecommend">
                  获取推荐
                </el-button>
              </div>
              
              <div v-if="platformResult?.length" class="result mt-4">
                <div
                  v-for="(rec, idx) in platformResult"
                  :key="rec.platform"
                  :class="['platform-item', { 'top': idx === 0 }]"
                >
                  <div class="platform-rank">
                    <span v-if="idx === 0" class="crown">👑</span>
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <div class="platform-info">
                    <span class="name">{{ formatPlatform(rec.platform) }}</span>
                    <div class="score-bar">
                      <el-progress :percentage="rec.score" :stroke-width="8" />
                      <span class="score text-xs">{{ rec.score }}分</span>
                    </div>
                  </div>
                  <el-tag size="small" type="success" v-if="idx === 0">
                    推荐
                  </el-tag>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
        
        <el-card class="learning-card">
          <template #header>
            <span>📊 自适应学习</span>
          </template>
          
          <div class="learning-stats">
            <div class="stat-item">
              <span class="stat-value text-2xl font-bold text-blue-500">
                {{ learningStats.failurePatterns }}
              </span>
              <span class="stat-label">失败模式</span>
            </div>
            <div class="stat-item">
              <span class="stat-value text-2xl font-bold text-green-500">
                {{ learningStats.optimizedSelectors }}
              </span>
              <span class="stat-label">优化选择器</span>
            </div>
          </div>
          
          <el-divider />
          
          <div class="learning-insights">
            <h4 class="text-sm font-medium mb-2">最近改进建议</h4>
            <ul class="insights-list">
              <li v-for="(insight, idx) in insights" :key="idx" class="insight-item">
                <span class="icon">{{ insight.icon }}</span>
                <span class="text">{{ insight.text }}</span>
              </li>
            </ul>
          </div>
          
          <el-button size="small" @click="refreshLearning" class="mt-3">
            🔄 刷新学习数据
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
  intent?: any
  plan?: any
}

interface QuickPrompt {
  text: string
  intent: string
}

const connected = ref(true)
const loading = ref(false)
const loadingRecommend = ref(false)
const inputText = ref('')
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement>()
const currentStepIndex = ref(0)
const activeRecommendTab = ref('time')

const recommendForm = reactive({
  platform: 'douyin'
})

const priceForm = reactive({
  costPrice: 0,
  category: '',
  platform: 'douyin'
})

const platformForm = reactive({
  category: '',
  price: 0
})

const publishTimeResult = ref<any>(null)
const priceResult = ref<any>(null)
const platformResult = ref<any[]>([])

const learningStats = reactive({
  failurePatterns: 12,
  optimizedSelectors: 8
})

const quickPrompts: QuickPrompt[] = [
  { text: '帮我发布商品到抖音', intent: 'publish_product' },
  { text: '回复所有好评', intent: 'manage_reviews' },
  { text: '采集昨天的订单数据', intent: 'collect_data' },
  { text: '调整一下商品价格', intent: 'price_adjustment' }
]

const insights = ref([
  { icon: '💡', text: '抖音商品标题建议包含3-5个关键词' },
  { icon: '⚠️', text: '拼多多选择器需要更新' },
  { icon: '✅', text: '好评回复模板已优化' }
])

const getIntentType = (type: string) => {
  const types: Record<string, string> = {
    'publish_product': 'primary',
    'manage_reviews': 'success',
    'collect_data': 'warning',
    'order_management': 'info',
    'price_adjustment': 'danger',
    'unknown': 'info'
  }
  return types[type] || 'info'
}

const formatIntentType = (type: string) => {
  const names: Record<string, string> = {
    'publish_product': '商品发布',
    'manage_reviews': '评价管理',
    'collect_data': '数据采集',
    'order_management': '订单管理',
    'price_adjustment': '价格调整',
    'stock_update': '库存更新',
    'store_config': '店铺配置',
    'report_generation': '报告生成',
    'general_query': '通用查询',
    'unknown': '未知'
  }
  return names[type] || type
}

const formatPlatform = (platform: string) => {
  const names: Record<string, string> = {
    'douyin': '抖音',
    'pinduoduo': '拼多多',
    'taobao': '淘宝',
    'jingdong': '京东',
    'xiaohongshu': '小红书',
    'all': '全部平台'
  }
  return names[platform] || platform
}

const getPriorityType = (priority: string) => {
  const types: Record<string, string> = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'info'
  }
  return types[priority] || 'info'
}

const getStepStatus = (index: number, steps: any[]) => {
  if (index < currentStepIndex.value) return 'success'
  if (index === currentStepIndex.value) return 'process'
  return 'wait'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async (text?: string) => {
  const content = text || inputText.value.trim()
  if (!content) return
  
  messages.value.push({
    role: 'user',
    content,
    time: new Date().toLocaleTimeString()
  })
  
  inputText.value = ''
  loading.value = true
  scrollToBottom()
  
  try {
    const response = await axios.post('/api/ai/decompose', {
      text: content,
      context: { is_urgent: false }
    })
    
    const plan = response.data
    
    const intentNames: Record<string, string> = {
      'publish_product': '商品发布',
      'manage_reviews': '评价管理',
      'collect_data': '数据采集'
    }
    
    let responseContent = ''
    switch (plan.intent.type) {
      case 'publish_product':
        responseContent = '好的，我已经理解您的商品发布需求，正在生成执行计划...'
        break
      case 'manage_reviews':
        responseContent = '我已识别您的评价管理需求，正在规划操作步骤...'
        break
      case 'collect_data':
        responseContent = '正在为您规划数据采集方案...'
        break
      default:
        responseContent = '我已经理解您的需求，正在生成执行计划...'
    }
    
    messages.value.push({
      role: 'assistant',
      content: responseContent,
      time: new Date().toLocaleTimeString(),
      intent: plan.intent,
      plan: plan
    })
    
    ElMessage.success('计划已生成！')
    
  } catch (error: any) {
    console.error('AI分析失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，AI分析遇到了问题，请稍后再试。',
      time: new Date().toLocaleTimeString()
    })
  }
  
  loading.value = false
  scrollToBottom()
}

const clearChat = () => {
  messages.value = []
  ElMessage.info('对话已清空')
}

const executePlan = (plan: any) => {
  ElMessage.success('开始执行计划！')
}

const savePlan = (plan: any) => {
  ElMessage.success('计划已保存！')
}

const getPublishTime = async () => {
  if (!recommendForm.platform) {
    ElMessage.warning('请选择平台')
    return
  }
  
  loadingRecommend.value = true
  try {
    const response = await axios.post('/api/ai/recommend/publish-time', {
      platform: recommendForm.platform
    })
    publishTimeResult.value = response.data
    ElMessage.success('获取推荐时间成功')
  } catch (error) {
    ElMessage.error('获取失败，请重试')
  }
  loadingRecommend.value = false
}

const getPriceRecommend = async () => {
  if (!priceForm.costPrice || !priceForm.platform) {
    ElMessage.warning('请填写成本价和选择平台')
    return
  }
  
  loadingRecommend.value = true
  try {
    const response = await axios.post('/api/ai/recommend/price', {
      cost_price: priceForm.costPrice,
      category: priceForm.category,
      platform: priceForm.platform
    })
    priceResult.value = response.data
    ElMessage.success('价格策略已生成')
  } catch (error) {
    ElMessage.error('获取失败，请重试')
  }
  loadingRecommend.value = false
}

const getPlatformRecommend = async () => {
  if (!platformForm.category) {
    ElMessage.warning('请填写商品类目')
    return
  }
  
  loadingRecommend.value = true
  try {
    const response = await axios.post('/api/ai/recommend/platform', {
      category: platformForm.category,
      price: platformForm.price
    })
    platformResult.value = response.data.recommendations
    ElMessage.success('平台推荐已生成')
  } catch (error) {
    ElMessage.error('获取失败，请重试')
  }
  loadingRecommend.value = false
}

const refreshLearning = async () => {
  try {
    const response = await axios.get('/api/ai/learning/patterns')
    learningStats.failurePatterns = Object.keys(response.data.failure_patterns || {}).length
    learningStats.optimizedSelectors = Object.keys(response.data.optimized_selectors || {}).length
    ElMessage.success('学习数据已刷新')
  } catch (error) {
    console.error('刷新学习数据失败:', error)
  }
}

onMounted(() => {
  refreshLearning()
})
</script>

<style scoped>
.ai-assistant {
  @apply p-6 bg-gray-50 dark:bg-neutral-900 min-h-screen;
}

.page-header {
  @apply mb-6;
}

.page-header h2 {
  @apply m-0 mb-2 text-2xl font-bold text-gray-800 dark:text-neutral-100;
}

.subtitle {
  @apply text-gray-400 dark:text-neutral-400 m-0;
}

.chat-card {
  @apply rounded-xl;
  height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
}

.card-header {
  @apply flex justify-between items-center;
}

.chat-messages {
  @apply flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-neutral-800;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-neutral-400;
}

.empty-state h3 {
  @apply m-0 mb-2 text-gray-600 dark:text-neutral-300;
}

.empty-state p {
  @apply m-0;
}

.quick-prompts {
  @apply flex flex-wrap justify-center;
}

.message {
  @apply flex gap-3 mb-4;
}

.message.user {
  @apply flex-row-reverse;
}

.message-avatar {
  @apply w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-xl flex-shrink-0;
}

.message.user .message-avatar {
  @apply bg-blue-100 dark:bg-blue-900;
}

.message.assistant .message-avatar {
  @apply bg-green-100 dark:bg-green-900;
}

.message-content {
  @apply max-w-3xl;
}

.message-header {
  @apply flex items-center gap-2 mb-1;
}

.message.user .message-header {
  @apply flex-row-reverse;
}

.sender {
  @apply font-medium text-sm text-gray-700 dark:text-neutral-200;
}

.time {
  @apply text-xs text-gray-400 dark:text-neutral-500;
}

.message-bubble {
  @apply bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-sm;
}

.message.user .message-bubble {
  @apply bg-blue-500 text-white;
}

.ai-response {
  @apply bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm;
}

.intent-result {
  @apply p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg;
}

.intent-header {
  @apply flex items-center gap-2 flex-wrap;
}

.confidence {
  @apply text-xs text-gray-500 dark:text-neutral-400 ml-auto;
}

.platforms, .suggestions {
  @apply flex items-center flex-wrap gap-1;
}

.plan-result {
  @apply p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-xl;
}

.plan-header {
  @apply flex justify-between items-start;
}

.plan-header h4 {
  @apply m-0 text-base font-bold;
}

.plan-meta {
  @apply flex gap-2;
}

.step-icon {
  @apply w-6 h-6 rounded-full bg-gray-300 dark:bg-neutral-600 text-white flex items-center justify-center text-xs font-bold;
}

.step-icon.active {
  @apply bg-blue-500;
}

.step-icon.completed {
  @apply bg-green-500;
}

.plan-actions {
  @apply flex gap-3;
}

.chat-input {
  @apply p-4 border-t border-gray-100 dark:border-neutral-700 bg-white dark:bg-neutral-800;
}

.recommend-card, .learning-card {
  @apply rounded-xl;
}

.recommend-form {
  @apply mt-3;
}

.result {
  @apply p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg;
}

.result-item {
  @apply flex justify-between items-center py-1 text-sm;
}

.result-item .label {
  @apply text-gray-500 dark:text-neutral-400;
}

.platform-item {
  @apply flex items-center gap-3 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg mb-2;
}

.platform-item.top {
  @apply bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800;
}

.platform-rank {
  @apply w-8 h-8 rounded-full bg-white dark:bg-neutral-700 flex items-center justify-center font-bold text-sm;
}

.crown {
  @apply text-xl;
}

.platform-info {
  @apply flex-1;
}

.platform-info .name {
  @apply font-bold text-gray-700 dark:text-neutral-200;
}

.score-bar {
  @apply flex items-center gap-2;
}

.score-bar .el-progress {
  @apply flex-1;
}

.learning-stats {
  @apply flex gap-4;
}

.stat-item {
  @apply flex-1 text-center;
}

.stat-value {
  @apply block;
}

.stat-label {
  @apply text-xs text-gray-400 dark:text-neutral-500;
}

.insights-list {
  @apply list-none p-0 m-0;
}

.insight-item {
  @apply flex items-start gap-2 py-2 text-sm;
}

.insight-item .icon {
  @apply text-lg;
}

.insight-item .text {
  @apply text-gray-600 dark:text-neutral-300;
}

.price-result {
  @apply text-center;
}

.price-main {
  @apply mb-2;
}

.price-range {
  @apply text-center text-xs text-gray-500 dark:text-neutral-400;
}
</style>
