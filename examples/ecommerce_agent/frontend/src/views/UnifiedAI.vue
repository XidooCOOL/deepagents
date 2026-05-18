<template>
  <div class="unified-ai">
    <div class="page-header">
      <div class="header-content">
        <h2>🤖 智能 AI 助手</h2>
        <p class="subtitle">一个入口，多种智能。根据你的需求自动匹配最合适的 AI 功能</p>
      </div>
      <div class="header-actions">
        <el-select v-model="currentMode" placeholder="选择模式" style="width: 160px;" @change="onModeChange">
          <el-option label="智能模式 (推荐)" value="auto" />
          <el-option label="任务规划" value="planning" />
          <el-option label="Agent 执行" value="agent" />
          <el-option label="对话交互" value="chat" />
        </el-select>
      </div>
    </div>

    <div class="main-content">
      <el-row :gutter="20">
        <!-- 左侧：对话区域 -->
        <el-col :span="16">
          <el-card class="chat-card">
            <div class="chat-header">
              <div class="header-left">
                <div class="mode-indicator" :class="currentMode">
                  <el-icon><component :is="modeIcon" /></el-icon>
                  <span>{{ modeTitle }}</span>
                </div>
              </div>
              <div class="header-right">
                <el-tag v-if="currentMode === 'auto'" type="success" size="small">
                  智能识别中
                </el-tag>
                <el-button size="small" @click="clearChat" icon="Delete">清空</el-button>
              </div>
            </div>

            <div class="chat-messages" ref="messagesContainer">
              <div v-if="messages.length === 0" class="welcome-state">
                <div class="welcome-icon">
                  <el-icon :size="72"><MagicStick /></el-icon>
                </div>
                <h3>欢迎使用智能 AI 助手</h3>
                <p>告诉我你想要做什么，AI 会自动识别你的需求并匹配合适的功能</p>
                
                <div class="quick-scenarios">
                  <div class="scenario-grid">
                    <div
                      v-for="scenario in quickScenarios"
                      :key="scenario.id"
                      class="scenario-card"
                      @click="selectScenario(scenario)"
                    >
                      <div class="scenario-icon" :style="{ background: scenario.color }">
                        <el-icon :size="28"><component :is="scenario.icon" /></el-icon>
                      </div>
                      <h4>{{ scenario.title }}</h4>
                      <p>{{ scenario.desc }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-for="(msg, index) in messages"
                :key="index"
                class="message"
                :class="msg.role"
              >
                <div class="message-avatar">
                  <el-avatar :size="38" :style="{ background: msg.role === 'user' ? '#409eff' : '#67c23a' }">
                    {{ msg.role === 'user' ? '我' : 'AI' }}
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="message-sender">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
                    <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                    <el-tag v-if="msg.intentType" size="small" :type="getIntentTagType(msg.intentType)">
                      {{ getIntentLabel(msg.intentType) }}
                    </el-tag>
                  </div>
                  
                  <div class="message-bubble">
                    <div v-if="msg.type === 'text'" v-html="renderMarkdown(msg.content)"></div>
                    
                    <div v-else-if="msg.type === 'intent'">
                      <div class="intent-detection">
                        <div class="intent-header">
                          <el-icon :size="20"><MagicStick /></el-icon>
                          <span>智能识别结果</span>
                        </div>
                        
                        <div class="intent-info">
                          <div class="intent-item">
                            <span class="label">识别意图</span>
                            <span class="value">{{ getIntentLabel(msg.content.intentType) }}</span>
                          </div>
                          <div v-if="msg.content.platforms?.length" class="intent-item">
                            <span class="label">涉及平台</span>
                            <div class="tags">
                              <el-tag v-for="p in msg.content.platforms" :key="p" size="small" type="success">
                                {{ p }}
                              </el-tag>
                            </div>
                          </div>
                          <div v-if="msg.content.confidence" class="intent-item">
                            <span class="label">置信度</span>
                            <div class="confidence-bar">
                              <el-progress :percentage="msg.content.confidence * 100" :stroke-width="12" :show-text="false" />
                              <span>{{ Math.round(msg.content.confidence * 100) }}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="mode-suggestions">
                          <div class="suggestion-title">推荐使用模式：</div>
                          <el-radio-group v-model="suggestedMode" size="small">
                            <el-radio-button v-for="mode in msg.content.suggestedModes" :key="mode.value" :label="mode.value">
                              {{ mode.label }}
                            </el-radio-button>
                          </el-radio-group>
                        </div>
                        
                        <div class="intent-actions">
                          <el-button type="primary" @click="proceedWithSuggestion(msg)">
                            立即执行
                          </el-button>
                          <el-button @click="refineIntent(msg)">
                            我想调整
                          </el-button>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else-if="msg.type === 'plan'">
                      <div class="plan-display">
                        <div class="plan-header">
                          <h4>📋 执行计划</h4>
                          <div class="plan-meta">
                            <el-tag size="small" type="warning">预计 {{ msg.content.duration }} 秒</el-tag>
                            <el-tag size="small" :type="getPriorityTag(msg.content.priority)">
                              {{ msg.content.priority }} 优先级
                            </el-tag>
                          </div>
                        </div>
                        
                        <el-steps :active="planStepIndex" direction="vertical" class="plan-steps">
                          <el-step
                            v-for="(step, i) in msg.content.steps"
                            :key="i"
                            :title="step.name"
                            :description="step.desc"
                            :status="getStepStatus(i)"
                          />
                        </el-steps>
                        
                        <div v-if="!isExecuting" class="plan-actions">
                          <el-button type="primary" @click="executePlan(msg)" icon="VideoPlay">
                            开始执行
                          </el-button>
                          <el-button @click="savePlan(msg)" icon="Document">
                            保存计划
                          </el-button>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else-if="msg.type === 'execution'">
                      <div class="execution-display">
                        <div class="exec-header">
                          <el-icon :size="20" :class="msg.content.status">
                            <component :is="getExecIcon(msg.content.status)" />
                          </el-icon>
                          <span>{{ getExecStatusText(msg.content.status) }}</span>
                          <el-tag v-if="msg.content.progress !== undefined" size="small">
                            {{ msg.content.progress }}%
                          </el-tag>
                        </div>
                        
                        <div v-if="msg.content.progress !== undefined" class="exec-progress">
                          <el-progress 
                            :percentage="msg.content.progress" 
                            :color="getProgressColor(msg.content.progress)"
                            :stroke-width="10"
                          />
                          <div class="step-text">{{ msg.content.currentStep || '初始化中...' }}</div>
                        </div>
                        
                        <div v-if="msg.content.logs" class="exec-logs">
                          <div class="logs-title">执行日志</div>
                          <div class="logs-list">
                            <div v-for="(log, i) in msg.content.logs.slice(-8)" :key="i" class="log-item">
                              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                              <el-tag size="small" :type="getLogType(log.type)">
                                {{ log.type }}
                              </el-tag>
                              <span class="log-text">{{ log.message }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else-if="msg.type === 'result'">
                      <div class="result-display">
                        <el-alert
                          :type="msg.content.success ? 'success' : 'error'"
                          :title="msg.content.success ? '任务完成' : '任务失败'"
                          :description="msg.content.message"
                          show-icon
                        />
                        
                        <div v-if="msg.content.details" class="result-details">
                          <h5>详细信息</h5>
                          <pre>{{ JSON.stringify(msg.content.details, null, 2) }}</pre>
                        </div>
                        
                        <div class="result-actions">
                          <el-button size="small" @click="viewHistory(msg.content.taskId)">
                            查看历史
                          </el-button>
                          <el-button size="small" type="primary" @click="repeatTask(msg.content)">
                            重复执行
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isTyping" class="message assistant typing">
                <div class="message-avatar">
                  <el-avatar :size="38" style="background: #67c23a;">
                    <el-icon class="is-loading"><Loading /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content">
                  <div class="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="chat-input">
              <div class="input-wrapper">
                <el-input
                  v-model="inputMessage"
                  type="textarea"
                  :rows="2"
                  :autosize="{ minRows: 2, maxRows: 6 }"
                  :placeholder="inputPlaceholder"
                  @keydown.enter.ctrl="sendMessage"
                  :disabled="isProcessing"
                />
              </div>
              <div class="input-actions">
                <div class="left-actions">
                  <el-tooltip content="使用模板">
                    <el-button icon="Document" circle @click="showTemplates = true" :disabled="isProcessing" />
                  </el-tooltip>
                  <el-tooltip content="查看推荐">
                    <el-button icon="MagicStick" circle @click="showRecommendations = true" :disabled="isProcessing" />
                  </el-tooltip>
                </div>
                <div class="right-actions">
                  <span class="shortcut-hint">Ctrl + Enter 发送</span>
                  <el-button
                    type="primary"
                    @click="sendMessage"
                    :disabled="!inputMessage.trim() || isProcessing"
                    :loading="isProcessing"
                  >
                    {{ isProcessing ? '处理中...' : '发送' }}
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：智能推荐和功能区 -->
        <el-col :span="8">
          <div class="sidebar">
            <!-- 状态卡片 -->
            <el-card class="status-card">
              <template #header>
                <div class="card-header">
                  <span>⚡ 系统状态</span>
                  <el-tag :type="connected ? 'success' : 'info'" size="small">
                    {{ connected ? '已连接' : '连接中...' }}
                  </el-tag>
                </div>
              </template>
              <div class="status-grid">
                <div class="status-item">
                  <span class="label">活跃 Agent</span>
                  <span class="value">{{ activeAgentsCount }}</span>
                </div>
                <div class="status-item">
                  <span class="label">进行中任务</span>
                  <span class="value">{{ activeTasksCount }}</span>
                </div>
                <div class="status-item">
                  <span class="label">今日完成</span>
                  <span class="value">{{ todayCompleted }}</span>
                </div>
              </div>
            </el-card>

            <!-- 快捷操作 -->
            <el-card class="actions-card">
              <template #header>
                <span>🚀 快捷操作</span>
              </template>
              <div class="action-list">
                <div v-for="action in quickActions" :key="action.id" class="action-item" @click="sendQuickAction(action.text)">
                  <el-icon :size="18"><component :is="action.icon" /></el-icon>
                  <span>{{ action.text }}</span>
                </div>
              </div>
            </el-card>

            <!-- 最近任务 -->
            <el-card class="recent-tasks-card">
              <template #header>
                <div class="card-header">
                  <span>📋 最近任务</span>
                  <el-button size="small" text @click="showAllTasks">查看全部</el-button>
                </div>
              </template>
              <div class="task-list">
                <div v-for="task in recentTasks" :key="task.id" class="task-item">
                  <div class="task-icon" :style="{ background: task.color }">
                    <el-icon><component :is="task.icon" /></el-icon>
                  </div>
                  <div class="task-info">
                    <div class="task-name">{{ task.name }}</div>
                    <div class="task-time">{{ task.time }}</div>
                  </div>
                  <el-tag :type="getTaskStatusType(task.status)" size="small">
                    {{ task.status }}
                  </el-tag>
                </div>
                <div v-if="recentTasks.length === 0" class="empty-tasks">
                  暂无任务记录
                </div>
              </div>
            </el-card>

            <!-- 能力库 -->
            <el-card class="abilities-card">
              <template #header>
                <span>✨ AI 能力</span>
              </template>
              <div class="abilities-grid">
                <div v-for="ability in aiAbilities" :key="ability.id" class="ability-item">
                  <div class="ability-icon" :style="{ color: ability.color }">
                    <el-icon :size="20"><component :is="ability.icon" /></el-icon>
                  </div>
                  <span class="ability-name">{{ ability.name }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 模板抽屉 -->
    <el-drawer v-model="showTemplates" title="📝 任务模板" size="420px" direction="rtl">
      <div class="template-list">
        <el-card
          v-for="template in taskTemplates"
          :key="template.id"
          class="template-card"
          shadow="hover"
          @click="useTemplate(template)"
        >
          <div class="template-header">
            <div class="template-icon" :style="{ background: template.color }">
              <el-icon :size="22"><component :is="template.icon" /></el-icon>
            </div>
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p>{{ template.desc }}</p>
            </div>
          </div>
          <div class="template-tags">
            <el-tag v-for="tag in template.tags" :key="tag" size="small" type="info">
              {{ tag }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <!-- 推荐抽屉 -->
    <el-drawer v-model="showRecommendations" title="💡 AI 推荐" size="400px" direction="rtl">
      <div class="recommendations-content">
        <el-tabs v-model="recommendationTab">
          <el-tab-pane label="发布时间" name="time">
            <div class="recommend-form">
              <el-select v-model="timeRecForm.platform" placeholder="选择平台" class="w-full mb-3">
                <el-option label="抖音" value="抖音" />
                <el-option label="拼多多" value="拼多多" />
                <el-option label="淘宝" value="淘宝" />
              </el-select>
              <el-button type="primary" @click="getTimeRecommendation" :loading="loadingRec" class="w-full">
                获取推荐时间
              </el-button>
            </div>
            <div v-if="timeRecommendation" class="rec-result">
              <div class="result-item">
                <span class="label">推荐发布时间</span>
                <span class="value text-blue-500 font-bold">{{ timeRecommendation.bestTime }}</span>
              </div>
              <div class="result-item">
                <span class="label">理由</span>
                <span class="value">{{ timeRecommendation.reason }}</span>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="价格策略" name="price">
            <div class="recommend-form">
              <el-input-number v-model="priceRecForm.cost" placeholder="成本价" class="w-full mb-2" :min="0" />
              <el-input v-model="priceRecForm.category" placeholder="商品类目" class="mb-2" />
              <el-select v-model="priceRecForm.platform" placeholder="目标平台" class="w-full mb-3">
                <el-option label="抖音" value="抖音" />
                <el-option label="拼多多" value="拼多多" />
                <el-option label="淘宝" value="淘宝" />
              </el-select>
              <el-button type="primary" @click="getPriceRecommendation" :loading="loadingRec" class="w-full">
                获取价格建议
              </el-button>
            </div>
            <div v-if="priceRecommendation" class="rec-result">
              <div class="price-main">
                <span class="label">建议售价</span>
                <span class="price-value">¥{{ priceRecommendation.suggested }}</span>
              </div>
              <div class="price-range">
                建议区间：¥{{ priceRecommendation.min }} - ¥{{ priceRecommendation.max }}
              </div>
              <el-progress :percentage="priceRecommendation.margin" class="mt-3" />
              <div class="margin-text">预计利润率 {{ priceRecommendation.margin }}%</div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="平台选择" name="platform">
            <div class="recommend-form">
              <el-input v-model="platformRecForm.category" placeholder="商品类目" class="mb-2" />
              <el-input-number v-model="platformRecForm.price" placeholder="预估价格" class="w-full mb-3" :min="0" />
              <el-button type="primary" @click="getPlatformRecommendation" :loading="loadingRec" class="w-full">
                获取平台推荐
              </el-button>
            </div>
            <div v-if="platformRecommendations?.length" class="platform-list">
              <div v-for="(rec, i) in platformRecommendations" :key="rec.platform" class="platform-item" :class="{ top: i === 0 }">
                <div class="platform-rank">
                  <span v-if="i === 0" class="crown">👑</span>
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <div class="platform-info">
                  <div class="platform-name">{{ rec.platform }}</div>
                  <div class="platform-score">
                    <el-progress :percentage="rec.score" :stroke-width="8" />
                    <span>{{ rec.score }}分</span>
                  </div>
                </div>
                <el-tag v-if="i === 0" size="small" type="success">推荐</el-tag>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as icons from '@element-plus/icons-vue'
import markdownIt from 'markdown-it'

const md = markdownIt()

// 状态
const currentMode = ref('auto')
const messages = ref([])
const inputMessage = ref('')
const isProcessing = ref(false)
const isTyping = ref(false)
const messagesContainer = ref(null)
const showTemplates = ref(false)
const showRecommendations = ref(false)
const connected = ref(true)
const suggestedMode = ref('')
const isExecuting = ref(false)
const planStepIndex = ref(-1)
const recommendationTab = ref('time')
const loadingRec = ref(false)

// 推荐表单
const timeRecForm = ref({ platform: '抖音' })
const priceRecForm = ref({ cost: 0, category: '', platform: '抖音' })
const platformRecForm = ref({ category: '', price: 0 })

// 推荐结果
const timeRecommendation = ref(null)
const priceRecommendation = ref(null)
const platformRecommendations = ref([])

// 模式配置
const modeConfig = {
  auto: { icon: 'MagicStick', title: '智能模式', placeholder: '告诉我你想要做什么，AI 会自动识别并匹配合适的功能...' },
  planning: { icon: 'List', title: '任务规划', placeholder: '详细描述你的任务，AI 会为你生成完整的执行计划...' },
  agent: { icon: 'Robot', title: 'Agent 执行', placeholder: '输入任务指令，AI Agent 将帮你完成执行...' },
  chat: { icon: 'ChatDotRound', title: '对话交互', placeholder: '有什么问题或需求？用自然语言和我交流吧...' }
}

// 快速场景
const quickScenarios = [
  { id: 'publish', icon: 'Goods', title: '发布商品', desc: '在多个平台发布新商品', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'review', icon: 'ChatDotRound', title: '管理好评', desc: '自动回复和管理好评', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'data', icon: 'DataAnalysis', title: '采集数据', desc: '采集订单和销售数据', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'order', icon: 'ShoppingCart', title: '处理订单', desc: '处理发货和订单管理', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'price', icon: 'TrendCharts', title: '价格分析', desc: '获取智能定价建议', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'platform', icon: 'OfficeBuilding', title: '平台推荐', desc: '找到最适合的平台', color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
]

// 快捷操作
const quickActions = [
  { id: 1, icon: 'Goods', text: '发布新品到抖音' },
  { id: 2, icon: 'ChatDotRound', text: '处理今日好评' },
  { id: 3, icon: 'DataAnalysis', text: '采集今日数据' },
  { id: 4, icon: 'ShoppingCart', text: '查看今日订单' }
]

// 任务模板
const taskTemplates = [
  { id: 1, name: '商品发布', desc: '在多个平台发布新商品', icon: 'Goods', color: '#667eea', tags: ['发布', '抖音', '拼多多'], template: '帮我把新品发布到抖音和拼多多。商品信息：\n- 标题：{title}\n- 价格：{price}' },
  { id: 2, name: '好评管理', desc: '自动回复好评和追评', icon: 'ChatDotRound', color: '#f5576c', tags: ['好评', '回复', '自动化'], template: '帮我处理所有待回复的好评，使用友好的回复模板' },
  { id: 3, name: '数据采集', desc: '采集订单和销售数据', icon: 'DataAnalysis', color: '#4facfe', tags: ['数据', '订单', '销售'], template: '采集今日所有店铺的订单数据和销售数据' },
  { id: 4, name: '批量上下架', desc: '批量管理商品上下架', icon: 'Box', color: '#43e97b', tags: ['商品', '上下架', '批量'], template: '帮我把所有缺货的商品下架' }
]

// 最近任务
const recentTasks = ref([
  { id: 1, name: '发布夏季T恤', icon: 'Goods', color: '#667eea', time: '10分钟前', status: '完成' },
  { id: 2, name: '处理好评', icon: 'ChatDotRound', color: '#f5576c', time: '30分钟前', status: '进行中' }
])

// AI 能力
const aiAbilities = [
  { id: 1, name: '任务分解', icon: 'List', color: '#409eff' },
  { id: 2, name: '意图识别', icon: 'MagicStick', color: '#67c23a' },
  { id: 3, name: '智能推荐', icon: 'TrendCharts', color: '#e6a23c' },
  { id: 4, name: '自动执行', icon: 'VideoPlay', color: '#f56c6c' },
  { id: 5, name: '数据分析', icon: 'DataAnalysis', color: '#909399' },
  { id: 6, name: '价格优化', icon: 'Tickets', color: '#00d4ff' }
]

// 统计
const activeAgentsCount = 5
const activeTasksCount = 2
const todayCompleted = 18

// 计算属性
const modeIcon = computed(() => modeConfig[currentMode.value].icon)
const modeTitle = computed(() => modeConfig[currentMode.value].title)
const inputPlaceholder = computed(() => modeConfig[currentMode.value].placeholder)

// 辅助函数
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const renderMarkdown = (content) => {
  return md.render(content)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 添加消息
const addMessage = (role, content, type = 'text', intentType = null) => {
  messages.value.push({
    role,
    content,
    type,
    intentType,
    timestamp: Date.now()
  })
  scrollToBottom()
}

// 选择快速场景
const selectScenario = (scenario) => {
  const texts = {
    publish: '帮我把新品发布到抖音、拼多多和淘宝',
    review: '处理所有待回复的好评',
    data: '采集今日所有店铺的订单数据',
    order: '查看并处理今日待发货的订单',
    price: '我想了解一下商品的最佳定价策略',
    platform: '帮我推荐一下适合我的商品的平台'
  }
  inputMessage.value = texts[scenario.id]
  sendMessage()
}

// 发送快捷操作
const sendQuickAction = (text) => {
  inputMessage.value = text
  sendMessage()
}

// 使用模板
const useTemplate = (template) => {
  inputMessage.value = template.template
  showTemplates.value = false
  ElMessage.success('模板已加载')
}

// 模式切换
const onModeChange = () => {
  ElMessage.info(`已切换到${modeTitle.value}`)
}

// 意图识别相关
const getIntentLabel = (type) => {
  const labels = {
    publish: '商品发布',
    review: '好评管理',
    data: '数据采集',
    order: '订单处理',
    price: '价格分析',
    platform: '平台推荐',
    general: '通用咨询',
    unknown: '未知意图'
  }
  return labels[type] || '通用咨询'
}

const getIntentTagType = (type) => {
  const types = {
    publish: 'primary',
    review: 'success',
    data: 'warning',
    order: 'info',
    price: 'danger',
    platform: '',
    general: 'info',
    unknown: 'info'
  }
  return types[type] || 'info'
}

// 主发送消息函数
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isProcessing.value) return

  const userInput = inputMessage.value
  inputMessage.value = ''
  isProcessing.value = true

  addMessage('user', userInput)

  isTyping.value = true
  await new Promise(resolve => setTimeout(resolve, 800))

  if (currentMode.value === 'auto') {
    await handleAutoMode(userInput)
  } else if (currentMode.value === 'planning') {
    await handlePlanningMode(userInput)
  } else if (currentMode.value === 'agent') {
    await handleAgentMode(userInput)
  } else {
    await handleChatMode(userInput)
  }

  isProcessing.value = false
}

// 智能模式处理
const handleAutoMode = async (input) => {
  const intentResult = analyzeIntent(input)
  isTyping.value = false

  suggestedMode.value = intentResult.suggestedModes[0].value

  addMessage('assistant', intentResult, 'intent', intentResult.intentType)
}

// 意图分析
const analyzeIntent = (input) => {
  const lower = input.toLowerCase()
  let intentType = 'unknown'
  let platforms = []
  let confidence = 0.5

  if (lower.includes('发布') || lower.includes('上架') || lower.includes('商品')) {
    intentType = 'publish'
    confidence = 0.85
  } else if (lower.includes('好评') || lower.includes('评价') || lower.includes('回复')) {
    intentType = 'review'
    confidence = 0.88
  } else if (lower.includes('数据') || lower.includes('采集') || lower.includes('订单')) {
    intentType = 'data'
    confidence = 0.82
  } else if (lower.includes('订单') || lower.includes('发货') || lower.includes('处理')) {
    intentType = 'order'
    confidence = 0.78
  } else if (lower.includes('价格') || lower.includes('定价') || lower.includes('策略')) {
    intentType = 'price'
    confidence = 0.80
  } else if (lower.includes('平台') || lower.includes('推荐') || lower.includes('选择')) {
    intentType = 'platform'
    confidence = 0.75
  } else {
    intentType = 'general'
    confidence = 0.6
  }

  if (lower.includes('抖音')) platforms.push('抖音')
  if (lower.includes('拼多多')) platforms.push('拼多多')
  if (lower.includes('淘宝')) platforms.push('淘宝')
  if (lower.includes('京东')) platforms.push('京东')

  const modes = getSuggestedModes(intentType)

  return {
    intentType,
    platforms,
    confidence,
    suggestedModes: modes,
    userInput: input
  }
}

const getSuggestedModes = (intentType) => {
  if (['publish', 'review', 'data', 'order'].includes(intentType)) {
    return [
      { value: 'agent', label: 'Agent 执行' },
      { value: 'planning', label: '任务规划' }
    ]
  } else if (['price', 'platform'].includes(intentType)) {
    return [
      { value: 'chat', label: '对话交互' },
      { value: 'planning', label: '任务规划' }
    ]
  }
  return [
    { value: 'chat', label: '对话交互' },
    { value: 'planning', label: '任务规划' },
    { value: 'agent', label: 'Agent 执行' }
  ]
}

// 继续执行建议
const proceedWithSuggestion = async (msg) => {
  const mode = suggestedMode.value
  currentMode.value = mode

  if (mode === 'agent') {
    await handleAgentMode(msg.content.userInput)
  } else if (mode === 'planning') {
    await handlePlanningMode(msg.content.userInput)
  } else {
    await handleChatMode(msg.content.userInput)
  }
}

const refineIntent = (msg) => {
  inputMessage.value = '我想调整一下需求：'
  scrollToBottom()
}

// 任务规划模式
const handlePlanningMode = async (input) => {
  isTyping.value = false

  const plan = generatePlan(input)
  addMessage('assistant', plan, 'plan')
}

const generatePlan = (input) => {
  const steps = [
    { name: '任务分析', desc: '分析任务需求和目标' },
    { name: 'Agent 分配', desc: '选择合适的 AI Agent' },
    { name: '执行准备', desc: '加载技能和配置' },
    { name: '执行任务', desc: '按步骤执行任务' },
    { name: '结果验证', desc: '验证执行结果' }
  ]

  return {
    steps,
    duration: 120,
    priority: '中'
  }
}

const getStepStatus = (i) => {
  if (i < planStepIndex.value) return 'success'
  if (i === planStepIndex.value) return 'process'
  return 'wait'
}

const getPriorityTag = (p) => {
  if (p === '高') return 'danger'
  if (p === '中') return 'warning'
  return 'info'
}

const executePlan = async (msg) => {
  isExecuting.value = true
  planStepIndex.value = 0

  addMessage('assistant', {
    status: 'running',
    progress: 0,
    currentStep: '初始化执行环境...',
    logs: []
  }, 'execution')

  for (let i = 0; i < msg.content.steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1200))
    planStepIndex.value = i + 1

    const lastMsg = messages.value[messages.value.length - 1]
    lastMsg.content.progress = ((i + 1) / msg.content.steps.length) * 100
    lastMsg.content.currentStep = msg.content.steps[i].name
    lastMsg.content.logs.push({
      timestamp: Date.now(),
      type: 'info',
      message: `✅ ${msg.content.steps[i].name}`
    })
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  isExecuting.value = false
  planStepIndex.value = -1

  addMessage('assistant', {
    success: true,
    message: '任务执行成功！',
    taskId: `TASK-${Date.now()}`,
    details: { completedAt: new Date().toISOString() }
  }, 'result')
}

const savePlan = (msg) => {
  ElMessage.success('计划已保存')
}

// Agent 模式
const handleAgentMode = async (input) => {
  isTyping.value = false

  addMessage('assistant', {
    status: 'running',
    progress: 10,
    currentStep: '正在分配 Agent...',
    logs: [{ timestamp: Date.now(), type: 'info', message: '任务已接收' }]
  }, 'execution')

  await simulateExecution(input)
}

const simulateExecution = async (input) => {
  const steps = [
    { step: '分析任务', progress: 20, logType: 'info' },
    { step: '选择 Agent', progress: 35, logType: 'info' },
    { step: '加载技能', progress: 50, logType: 'success' },
    { step: '执行操作', progress: 75, logType: 'success' },
    { step: '验证结果', progress: 90, logType: 'info' }
  ]

  for (const s of steps) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const execMsg = messages.value[messages.value.length - 1]
    execMsg.content.progress = s.progress
    execMsg.content.currentStep = s.step
    execMsg.content.logs.push({
      timestamp: Date.now(),
      type: s.logType,
      message: s.step
    })
    
    messages.value = [...messages.value]
    scrollToBottom()
  }

  await new Promise(resolve => setTimeout(resolve, 500))
  
  addMessage('assistant', {
    success: true,
    message: 'Agent 任务执行完成！',
    taskId: `AGENT-${Date.now()}`,
    details: { input, completedAt: new Date().toISOString() }
  }, 'result')
}

const getExecIcon = (status) => {
  const map = { running: 'Loading', completed: 'SuccessFilled', failed: 'CircleClose' }
  return map[status] || 'Loading'
}

const getExecStatusText = (status) => {
  const map = { running: '执行中...', completed: '执行完成', failed: '执行失败' }
  return map[status] || status
}

const getProgressColor = (p) => p < 40 ? '#f56c6c' : p < 80 ? '#e6a23c' : '#67c23a'
const getLogType = (t) => {
  const map = { info: 'info', success: 'success', warning: 'warning', error: 'danger' }
  return map[t] || 'info'
}

// 对话模式
const handleChatMode = async (input) => {
  isTyping.value = false

  const responses = [
    '好的，我理解你的需求了。让我为你详细解答...',
    '这个问题很有趣！我来帮你分析一下...',
    '收到！我会尽力帮助你解决这个问题...'
  ]
  const resp = responses[Math.floor(Math.random() * responses.length)]
  
  addMessage('assistant', `${resp}\n\n你可以继续补充更多细节，或者告诉我还需要什么帮助。`)
}

const getTaskStatusType = (status) => {
  return status === '完成' ? 'success' : status === '进行中' ? 'warning' : 'info'
}

const viewHistory = (taskId) => {
  ElMessage.info(`查看任务 ${taskId} 的历史记录`)
}

const repeatTask = (content) => {
  ElMessage.info('准备重复执行任务...')
}

const showAllTasks = () => {
  ElMessage.info('打开任务列表...')
}

const clearChat = () => {
  messages.value = []
  isExecuting.value = false
  planStepIndex.value = -1
  ElMessage.info('对话已清空')
}

// 推荐功能
const getTimeRecommendation = async () => {
  loadingRec.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  timeRecommendation.value = {
    bestTime: '20:00 - 22:00',
    reason: '该时段用户活跃度最高，转化率比平均高35%'
  }
  loadingRec.value = false
}

const getPriceRecommendation = async () => {
  if (!priceRecForm.value.cost) {
    ElMessage.warning('请输入成本价')
    return
  }
  loadingRec.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const suggested = Math.round(priceRecForm.value.cost * 1.8)
  priceRecommendation.value = {
    suggested,
    min: Math.round(priceRecForm.value.cost * 1.5),
    max: Math.round(priceRecForm.value.cost * 2.2),
    margin: 44
  }
  loadingRec.value = false
}

const getPlatformRecommendation = async () => {
  if (!platformRecForm.value.category) {
    ElMessage.warning('请输入商品类目')
    return
  }
  loadingRec.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  platformRecommendations.value = [
    { platform: '抖音', score: 92 },
    { platform: '拼多多', score: 78 },
    { platform: '淘宝', score: 65 }
  ]
  loadingRec.value = false
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.unified-ai {
  min-height: calc(100vh - 120px);
  @apply bg-gray-50 p-6;
}

.page-header {
  @apply flex justify-between items-center mb-6;
}

.header-content h2 {
  @apply m-0 mb-1 text-2xl font-bold text-gray-800;
}

.subtitle {
  @apply m-0 text-sm text-gray-400;
}

.main-content {
  @apply min-h-0;
}

.chat-card {
  @apply h-[calc(100vh-200px)] flex flex-col rounded-xl;
}

.chat-header {
  @apply flex justify-between items-center p-4 border-b border-gray-100;
}

.header-left, .header-right {
  @apply flex items-center gap-3;
}

.mode-indicator {
  @apply flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium;
}

.mode-indicator.auto {
  @apply bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-600;
}

.mode-indicator.planning {
  @apply bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600;
}

.mode-indicator.agent {
  @apply bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-600;
}

.mode-indicator.chat {
  @apply bg-gradient-to-r from-green-50 to-teal-50 text-green-600;
}

.chat-messages {
  @apply flex-1 overflow-y-auto p-5 bg-gray-50;
}

.welcome-state {
  @apply text-center py-10;
}

.welcome-icon {
  @apply mb-6 text-gray-300;
}

.welcome-state h3 {
  @apply m-0 mb-2 text-xl text-gray-700;
}

.welcome-state p {
  @apply m-0 mb-8 text-gray-400;
}

.quick-scenarios {
  @apply mt-8;
}

.scenario-grid {
  @apply grid grid-cols-2 gap-4;
}

.scenario-card {
  @apply p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-300;
}

.scenario-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center text-white mb-3;
}

.scenario-card h4 {
  @apply m-0 mb-1 text-sm font-medium text-gray-800;
}

.scenario-card p {
  @apply m-0 text-xs text-gray-400;
}

.message {
  @apply flex gap-4 mb-6;
}

.message.user {
  @apply flex-row-reverse;
}

.message-content {
  @apply max-w-3xl;
}

.message-header {
  @apply flex items-center gap-2 mb-1.5 flex-wrap;
}

.message.user .message-header {
  @apply flex-row-reverse;
}

.message-sender {
  @apply font-medium text-sm text-gray-700;
}

.message-time {
  @apply text-xs text-gray-400;
}

.message-bubble {
  @apply p-4 rounded-2xl;
}

.message.user .message-bubble {
  @apply bg-blue-500 text-white rounded-br-sm;
}

.message.assistant .message-bubble {
  @apply bg-white text-gray-800 rounded-bl-sm shadow-sm;
}

.intent-detection {
  @apply min-w-80;
}

.intent-header {
  @apply flex items-center gap-2 mb-4 text-blue-600 font-medium;
}

.intent-info {
  @apply space-y-3 mb-4;
}

.intent-item {
  @apply flex items-center justify-between;
}

.intent-item .label {
  @apply text-sm text-gray-500;
}

.intent-item .value {
  @apply text-sm font-medium text-gray-800;
}

.tags {
  @apply flex gap-1.5;
}

.confidence-bar {
  @apply flex items-center gap-3 flex-1;
}

.confidence-bar .el-progress {
  @apply flex-1;
}

.confidence-bar span {
  @apply text-sm text-gray-600;
}

.mode-suggestions {
  @apply mb-4;
}

.suggestion-title {
  @apply text-sm text-gray-500 mb-2;
}

.intent-actions {
  @apply flex gap-3;
}

.plan-display {
  @apply min-w-80;
}

.plan-header {
  @apply flex justify-between items-center mb-4;
}

.plan-header h4 {
  @apply m-0 text-base font-bold;
}

.plan-meta {
  @apply flex gap-2;
}

.plan-steps {
  @apply mb-4;
}

.plan-actions {
  @apply flex gap-3;
}

.execution-display {
  @apply min-w-80;
}

.exec-header {
  @apply flex items-center gap-2 mb-4 font-medium;
}

.exec-header .running {
  @apply text-blue-500 animate-spin;
}

.exec-header .completed {
  @apply text-green-500;
}

.exec-progress {
  @apply mb-4;
}

.step-text {
  @apply mt-2 text-sm text-gray-500;
}

.exec-logs {
  @apply bg-gray-50 p-3 rounded-lg max-h-36 overflow-y-auto;
}

.logs-title {
  @apply text-xs font-medium text-gray-500 mb-2;
}

.logs-list {
  @apply space-y-1;
}

.log-item {
  @apply flex items-center gap-2 py-1 text-sm;
}

.log-time {
  @apply text-gray-400 text-xs;
}

.log-text {
  @apply text-gray-600;
}

.result-display {
  @apply min-w-80;
}

.result-details {
  @apply mt-4;
}

.result-details h5 {
  @apply my-3 text-gray-600 text-sm;
}

.result-details pre {
  @apply bg-gray-50 p-3 rounded text-xs max-h-40 overflow-y-auto;
}

.result-actions {
  @apply mt-4 flex gap-3;
}

.typing-indicator {
  @apply flex gap-1.5 p-4;
}

.typing-indicator span {
  @apply w-2.5 h-2.5 bg-gray-400 rounded-full;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input {
  @apply p-4 border-t border-gray-100 bg-white;
}

.input-wrapper {
  @apply mb-3;
}

.input-actions {
  @apply flex justify-between items-center;
}

.left-actions, .right-actions {
  @apply flex items-center gap-3;
}

.shortcut-hint {
  @apply text-xs text-gray-400;
}

.sidebar {
  @apply flex flex-col gap-5 h-full;
}

.status-card .card-header,
.recent-tasks-card .card-header {
  @apply flex justify-between items-center;
}

.status-grid {
  @apply grid grid-cols-3 gap-4;
}

.status-item {
  @apply text-center;
}

.status-item .label {
  @apply block text-xs text-gray-400 mb-1;
}

.status-item .value {
  @apply block text-lg font-bold text-gray-800;
}

.action-list {
  @apply space-y-2;
}

.action-item {
  @apply flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors;
}

.task-list {
  @apply space-y-3;
}

.task-item {
  @apply flex items-center gap-3 p-2 rounded-lg;
}

.task-icon {
  @apply w-9 h-9 rounded-lg flex items-center justify-center text-white;
}

.task-info {
  @apply flex-1 min-w-0;
}

.task-name {
  @apply text-sm font-medium text-gray-800 truncate;
}

.task-time {
  @apply text-xs text-gray-400;
}

.empty-tasks {
  @apply text-center text-gray-400 text-sm py-4;
}

.abilities-grid {
  @apply grid grid-cols-2 gap-3;
}

.ability-item {
  @apply flex items-center gap-2.5 p-3 rounded-lg bg-gray-50;
}

.ability-icon {
  @apply w-8 h-8 rounded-lg flex items-center justify-center bg-white;
}

.ability-name {
  @apply text-xs font-medium text-gray-700;
}

.template-list {
  @apply p-3;
}

.template-card {
  @apply mb-4 cursor-pointer transition-all duration-300 hover:shadow-md;
}

.template-header {
  @apply flex gap-3 mb-3;
}

.template-icon {
  @apply w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0;
}

.template-info h4 {
  @apply m-0 mb-1 text-gray-800 font-medium;
}

.template-info p {
  @apply m-0 text-xs text-gray-400;
}

.template-tags {
  @apply flex flex-wrap gap-1.5;
}

.recommendations-content {
  @apply p-3;
}

.recommend-form {
  @apply mb-5;
}

.w-full {
  width: 100%;
}

.rec-result {
  @apply p-4 bg-gray-50 rounded-lg;
}

.result-item {
  @apply flex justify-between items-center py-2 text-sm;
}

.result-item .label {
  @apply text-gray-500;
}

.result-item .value {
  @apply text-gray-700;
}

.price-main {
  @apply text-center mb-2;
}

.price-main .label {
  @apply block text-sm text-gray-500 mb-1;
}

.price-value {
  @apply text-3xl font-bold text-red-500;
}

.price-range {
  @apply text-center text-sm text-gray-500;
}

.margin-text {
  @apply text-center text-xs text-gray-400 mt-1;
}

.platform-list {
  @apply space-y-3;
}

.platform-item {
  @apply flex items-center gap-3 p-3 rounded-lg bg-gray-50;
}

.platform-item.top {
  @apply bg-yellow-50 border border-yellow-200;
}

.platform-rank {
  @apply w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-sm;
}

.platform-rank .crown {
  @apply text-lg;
}

.platform-info {
  @apply flex-1;
}

.platform-name {
  @apply font-medium text-gray-700 mb-1 text-sm;
}

.platform-score {
  @apply flex items-center gap-2;
}

.platform-score .el-progress {
  @apply flex-1;
}

.platform-score span {
  @apply text-xs text-gray-500;
}
</style>
