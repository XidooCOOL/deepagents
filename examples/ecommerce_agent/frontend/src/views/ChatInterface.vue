<template>
  <div class="chat-interface">
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-info">
          <h2>💬 任务对话</h2>
          <p class="subtitle">用自然语言描述任务，AI Agent 帮你分析和执行</p>
        </div>
        <div class="header-actions">
          <el-select v-model="selectedAgent" placeholder="选择 Agent" size="default" style="width: 150px; margin-right: 10px;">
            <el-option-group v-for="(agents, platform) in availableAgents" :key="platform" :label="platform">
              <el-option v-for="agent in agents" :key="agent.name" :label="agent.name" :value="agent.name" />
            </el-option-group>
          </el-select>
          <el-button @click="clearChat" icon="Delete">清空对话</el-button>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon :size="64"><ChatDotRound /></el-icon>
          </div>
          <h3>欢迎使用任务对话</h3>
          <p>输入自然语言指令，AI Agent 将帮你分析和执行任务</p>
          
          <div class="quick-actions">
            <el-tag
              v-for="action in quickActions"
              :key="action.text"
              @click="sendQuickAction(action.text)"
              type="info"
              class="quick-action"
            >
              {{ action.text }}
            </el-tag>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message"
          :class="msg.role"
        >
          <div class="message-avatar">
            <el-avatar :size="36" :style="{ background: msg.role === 'user' ? '#409eff' : '#67c23a' }">
              {{ msg.role === 'user' ? '我' : 'AI' }}
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">{{ msg.role === 'user' ? '你' : 'AI Agent' }}</span>
              <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="message-bubble">
              <div v-if="msg.type === 'text'" v-html="renderMarkdown(msg.content)"></div>
              
              <div v-else-if="msg.type === 'task-analysis'" class="task-analysis">
                <h4>📋 任务分析结果</h4>
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="任务类型">
                    {{ msg.content.taskType }}
                  </el-descriptions-item>
                  <el-descriptions-item label="涉及平台">
                    <el-tag v-for="p in msg.content.platforms" :key="p" size="small" type="success">
                      {{ p }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="需要 Agent">
                    {{ msg.content.agentsNeeded }}
                  </el-descriptions-item>
                  <el-descriptions-item label="预计步骤">
                    {{ msg.content.stepsCount }}
                  </el-descriptions-item>
                </el-descriptions>
                
                <div v-if="msg.content.subTasks" class="sub-tasks">
                  <h5>子任务分解：</h5>
                  <el-steps :active="msg.content.currentStep" align-center finish-status="success">
                    <el-step
                      v-for="(task, i) in msg.content.subTasks"
                      :key="i"
                      :title="task.name"
                      :description="task.agent"
                    />
                  </el-steps>
                </div>
              </div>
              
              <div v-else-if="msg.type === 'execution'" class="execution-status">
                <div class="status-header">
                  <el-icon :size="20" :class="msg.content.status">
                    <component :is="getStatusIcon(msg.content.status)" />
                  </el-icon>
                  <span>{{ getStatusText(msg.content.status) }}</span>
                </div>
                
                <div v-if="msg.content.progress !== undefined" class="progress-section">
                  <el-progress :percentage="msg.content.progress" :color="getProgressColor(msg.content.progress)" />
                  <div class="step-info">
                    当前步骤：{{ msg.content.currentStep || '初始化' }}
                  </div>
                </div>
                
                <div v-if="msg.content.logs" class="execution-logs">
                  <div
                    v-for="(log, i) in msg.content.logs.slice(-5)"
                    :key="i"
                    class="log-item"
                  >
                    <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                    <el-tag size="small" :type="getLogType(log.type)">
                      {{ log.type }}
                    </el-tag>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                </div>
              </div>
              
              <div v-else-if="msg.type === 'result'" class="task-result">
                <el-alert
                  :type="msg.content.success ? 'success' : 'error'"
                  :title="msg.content.success ? '任务执行成功' : '任务执行失败'"
                  :description="msg.content.message"
                  show-icon
                />
                
                <div v-if="msg.content.details" class="result-details">
                  <h5>执行详情：</h5>
                  <pre>{{ JSON.stringify(msg.content.details, null, 2) }}</pre>
                </div>
                
                <div class="result-actions">
                  <el-button size="small" @click="viewTaskHistory(msg.content.taskId)">
                    查看任务历史
                  </el-button>
                  <el-button size="small" type="primary" @click="repeatTask(msg.content.taskConfig)">
                    重复执行
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isTyping" class="message assistant typing">
          <div class="message-avatar">
            <el-avatar :size="36" style="background: #67c23a;">
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
            placeholder="输入任务指令，例如：帮我把新品发布到抖音、拼多多和淘宝..."
            @keydown.enter.ctrl="sendMessage"
            :disabled="isProcessing"
          />
        </div>
        <div class="input-actions">
          <div class="left-actions">
            <el-tooltip content="上传附件">
              <el-button icon="Paperclip" circle :disabled="isProcessing" />
            </el-tooltip>
            <el-tooltip content="插入模板">
              <el-button icon="Document" circle @click="showTemplates = true" :disabled="isProcessing" />
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
    </div>

    <el-drawer v-model="showTemplates" title="📝 任务模板" size="400px" direction="rtl">
      <div class="template-list">
        <el-card
          v-for="template in taskTemplates"
          :key="template.name"
          class="template-card"
          shadow="hover"
          @click="useTemplate(template)"
        >
          <h4>{{ template.name }}</h4>
          <p>{{ template.description }}</p>
          <div class="template-tags">
            <el-tag v-for="tag in template.tags" :key="tag" size="small" type="info">
              {{ tag }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Loading, SuccessFilled, CircleClose, WarningFilled, Document, Paperclip } from '@element-plus/icons-vue'
import markdownIt from 'markdown-it'

const md = markdownIt()

export default {
  name: 'ChatInterface',
  components: {
    ChatDotRound,
    Loading,
    SuccessFilled,
    CircleClose,
    WarningFilled,
    Document,
    Paperclip
  },
  setup() {
    const messages = ref([])
    const inputMessage = ref('')
    const isProcessing = ref(false)
    const isTyping = ref(false)
    const messagesContainer = ref(null)
    const selectedAgent = ref('')
    const showTemplates = ref(false)

    const availableAgents = ref({
      '抖音': [
        { name: '抖音-A旗舰店', abilities: ['商品发布', '好评管理'] },
        { name: '抖音-B专卖店', abilities: ['好评管理', '数据采集'] }
      ],
      '拼多多': [
        { name: '拼多多-旗舰店', abilities: ['商品发布', '数据采集'] }
      ],
      '淘宝': [
        { name: '淘宝-官方店', abilities: ['商品发布', '订单处理'] }
      ]
    })

    const quickActions = [
      { text: '帮我发布商品到抖音' },
      { text: '处理所有好评' },
      { text: '采集今日订单数据' },
      { text: '分析销售趋势' }
    ]

    const taskTemplates = ref([
      {
        name: '商品发布',
        description: '在多个平台发布新商品',
        tags: ['发布', '抖音', '拼多多', '淘宝'],
        template: '帮我把新品发布到抖音、拼多多和淘宝。商品信息如下：\n- 标题：{title}\n- 价格：{price}\n- 描述：{description}'
      },
      {
        name: '好评管理',
        description: '自动回复好评和追评',
        tags: ['好评', '回复', '自动化'],
        template: '帮我处理所有待回复的好评，使用统一的回复模板'
      },
      {
        name: '数据采集',
        description: '采集订单和销售数据',
        tags: ['数据', '订单', '销售'],
        template: '采集今日所有店铺的订单数据和销售数据'
      },
      {
        name: '批量上下架',
        description: '批量管理商品上下架',
        tags: ['商品', '上下架', '批量'],
        template: '帮我把所有缺货的商品下架，并上架新的商品'
      }
    ])

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const renderMarkdown = (content) => {
      return md.render(content)
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    const getStatusIcon = (status) => {
      const icons = {
        pending: 'Loading',
        running: 'Loading',
        completed: 'SuccessFilled',
        failed: 'CircleClose',
        warning: 'WarningFilled'
      }
      return icons[status] || 'Loading'
    }

    const getStatusText = (status) => {
      const texts = {
        pending: '等待执行',
        running: '执行中...',
        completed: '执行完成',
        failed: '执行失败',
        warning: '存在警告'
      }
      return texts[status] || status
    }

    const getProgressColor = (progress) => {
      if (progress < 30) return '#f56c6c'
      if (progress < 70) return '#e6a23c'
      return '#67c23a'
    }

    const getLogType = (type) => {
      const types = {
        info: 'info',
        success: 'success',
        warning: 'warning',
        error: 'danger'
      }
      return types[type] || 'info'
    }

    const addMessage = (role, content, type = 'text') => {
      messages.value.push({
        role,
        content,
        type,
        timestamp: Date.now()
      })
      scrollToBottom()
    }

    const sendQuickAction = (text) => {
      inputMessage.value = text
      sendMessage()
    }

    const useTemplate = (template) => {
      inputMessage.value = template.template
      showTemplates.value = false
      ElMessage.success('模板已加载')
    }

    const sendMessage = async () => {
      if (!inputMessage.value.trim() || isProcessing.value) return

      const userMessage = inputMessage.value
      inputMessage.value = ''
      isProcessing.value = true

      addMessage('user', userMessage)

      isTyping.value = true
      await new Promise(resolve => setTimeout(resolve, 1000))

      const taskAnalysis = analyzeTask(userMessage)
      isTyping.value = false

      addMessage('assistant', taskAnalysis, 'task-analysis')
      await new Promise(resolve => setTimeout(resolve, 500))

      isTyping.value = true
      await new Promise(resolve => setTimeout(resolve, 800))

      const executionStatus = {
        status: 'running',
        progress: 0,
        currentStep: '初始化'
      }
      isTyping.value = false
      addMessage('assistant', { ...executionStatus, logs: [] }, 'execution')

      await simulateExecution(userMessage)
    }

    const analyzeTask = (input) => {
      const platforms = []
      if (input.includes('抖音')) platforms.push('抖音')
      if (input.includes('拼多多')) platforms.push('拼多多')
      if (input.includes('淘宝')) platforms.push('淘宝')
      if (input.includes('京东')) platforms.push('京东')

      const taskTypes = []
      if (input.includes('发布') || input.includes('上架')) taskTypes.push('商品发布')
      if (input.includes('好评') || input.includes('评价')) taskTypes.push('好评管理')
      if (input.includes('数据') || input.includes('订单')) taskTypes.push('数据采集')

      return {
        taskType: taskTypes.join('、') || '通用任务',
        platforms: platforms.length > 0 ? platforms : ['抖音'],
        agentsNeeded: `${platforms.length || 1} 个 Agent`,
        stepsCount: 5 + (platforms.length * 2),
        subTasks: [
          { name: '初始化', agent: selectedAgent.value || '系统' },
          { name: '加载技能', agent: selectedAgent.value || '系统' },
          { name: '执行任务', agent: selectedAgent.value || '系统' },
          { name: '验证结果', agent: selectedAgent.value || '系统' }
        ],
        currentStep: 0
      }
    }

    const simulateExecution = async (taskInput) => {
      const executionMsg = messages.value[messages.value.length - 1]
      const steps = [
        { step: '初始化 Agent', progress: 15, logType: 'info' },
        { step: '加载商品发布技能', progress: 30, logType: 'info' },
        { step: '导航到发布页面', progress: 45, logType: 'success' },
        { step: '填写商品信息', progress: 60, logType: 'success' },
        { step: '上传商品图片', progress: 75, logType: 'success' },
        { step: '提交审核', progress: 90, logType: 'success' },
        { step: '验证发布结果', progress: 95, logType: 'info' }
      ]

      for (const s of steps) {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        executionMsg.content.progress = s.progress
        executionMsg.content.currentStep = s.step
        executionMsg.content.logs = executionMsg.content.logs || []
        executionMsg.content.logs.push({
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
        message: '商品已成功发布到抖音平台！',
        taskId: `TASK-${Date.now()}`,
        taskConfig: taskInput,
        details: {
          platform: '抖音',
          productId: 'PRD-' + Date.now(),
          status: 'pending_review',
          publishedAt: new Date().toISOString()
        }
      }, 'result')

      isProcessing.value = false
    }

    const clearChat = () => {
      messages.value = []
      ElMessage.info('对话已清空')
    }

    const viewTaskHistory = (taskId) => {
      ElMessage.info(`查看任务 ${taskId} 的历史记录`)
    }

    const repeatTask = (taskConfig) => {
      inputMessage.value = taskConfig
      sendMessage()
    }

    onMounted(() => {
      scrollToBottom()
    })

    return {
      messages,
      inputMessage,
      isProcessing,
      isTyping,
      messagesContainer,
      selectedAgent,
      availableAgents,
      quickActions,
      showTemplates,
      taskTemplates,
      scrollToBottom,
      renderMarkdown,
      formatTime,
      getStatusIcon,
      getStatusText,
      getProgressColor,
      getLogType,
      sendMessage,
      sendQuickAction,
      useTemplate,
      clearChat,
      viewTaskHistory,
      repeatTask
    }
  }
}
</script>

<style scoped>
.chat-interface {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 20px;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  background: white;
}

.header-info h2 {
  margin: 0 0 5px 0;
  font-size: 20px;
  color: #303133;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  margin-bottom: 20px;
  color: #dcdfe6;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #606266;
}

.empty-state p {
  margin: 0 0 30px 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.quick-action {
  cursor: pointer;
  padding: 10px 20px;
  font-size: 14px;
  transition: all 0.3s;
}

.quick-action:hover {
  transform: scale(1.05);
}

.message {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.message.user .message-header {
  flex-direction: row-reverse;
}

.message-sender {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
}

.message-bubble {
  padding: 15px 20px;
  border-radius: 12px;
  line-height: 1.6;
}

.message.user .message-bubble {
  background: #409eff;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-bubble {
  background: white;
  color: #303133;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.task-analysis {
  min-width: 400px;
}

.task-analysis h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.task-analysis h5 {
  margin: 15px 0 10px 0;
  color: #606266;
}

.sub-tasks {
  margin-top: 15px;
}

.execution-status {
  min-width: 300px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  font-weight: 500;
}

.status-header .running {
  color: #409eff;
  animation: spin 1s linear infinite;
}

.status-header .completed {
  color: #67c23a;
}

.status-header .failed {
  color: #f56c6c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-section {
  margin-bottom: 15px;
}

.step-info {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

.execution-logs {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
}

.log-time {
  color: #c0c4cc;
  font-size: 11px;
}

.log-message {
  color: #606266;
}

.task-result {
  min-width: 300px;
}

.result-details {
  margin-top: 15px;
}

.result-details h5 {
  margin: 10px 0;
  color: #606266;
}

.result-details pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.result-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 15px 20px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #909399;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #ebeef5;
  background: white;
}

.input-wrapper {
  margin-bottom: 15px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions,
.right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortcut-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.template-list {
  padding: 10px;
}

.template-card {
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  transform: translateX(-5px);
}

.template-card h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.template-card p {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #909399;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
</style>
