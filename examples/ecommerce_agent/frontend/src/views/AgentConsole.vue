<template>
  <div class="agent-console">
    <div class="page-header">
      <h2>🤖 AI Agent 工作台</h2>
      <p class="subtitle">实时监控 Agent 工作状态、查看 LLM 决策过程、与 AI Agent 对话</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="status-card">
          <div class="status-content">
            <div class="status-indicator" :class="agentStatus">
              <div class="pulse"></div>
            </div>
            <div class="status-info">
              <div class="status-label">Agent 状态</div>
              <div class="status-value">{{ getStatusText(agentStatus) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" :style="{ background: getTaskColor(currentTask?.type) }">
              <el-icon><component :is="Task" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ currentTask?.type || 'N/A' }}</div>
              <div class="stats-label">当前任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon><component :is="Clock" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ formatDuration(runningTime) }}</div>
              <div class="stats-label">运行时长</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon><component :is="ChatDotRound" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ conversationCount }}</div>
              <div class="stats-label">对话轮次</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="conversation-card">
          <div class="card-header">
            <h3>💬 与 Agent 对话</h3>
            <el-button size="small" @click="clearConversation" icon="Delete">清空对话</el-button>
          </div>
          
          <div class="conversation-list" ref="conversationListRef">
            <div v-for="(msg, index) in conversationHistory" :key="index" 
                 class="message" :class="msg.role">
              <div class="message-avatar">
                <el-avatar :size="36" :icon="msg.role === 'user' ? 'User' : 'Robot'" />
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">{{ msg.role === 'user' ? '你' : 'Agent' }}</span>
                  <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div class="message-text">
                  <pre>{{ msg.content }}</pre>
                </div>
              </div>
            </div>
            
            <div v-if="isAgentTyping" class="message agent">
              <div class="message-avatar">
                <el-avatar :size="36" icon="Robot" />
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">Agent</span>
                  <span class="typing-indicator">
                    <span></span><span></span><span></span>
                  </span>
                </div>
                <div class="message-text typing">
                  <pre>Agent 正在思考中...</pre>
                </div>
              </div>
            </div>
          </div>
          
          <div class="conversation-input">
            <el-input
              v-model="userInput"
              type="textarea"
              :rows="3"
              placeholder="输入自然语言指令，如：帮我发布商品到抖音店铺"
              :disabled="agentStatus === 'running'"
              @keydown.enter.ctrl="sendMessage"
            />
            <div class="input-actions">
              <el-tag v-if="agentStatus === 'running'" type="warning" size="small">
                Agent 正在执行任务，请稍候...
              </el-tag>
              <el-button type="primary" @click="sendMessage" :disabled="!userInput.trim() || agentStatus === 'running'" icon="Promotion">
                发送指令
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="logs-card">
          <div class="card-header">
            <h3>📊 Agent 工作日志</h3>
            <el-select v-model="logFilter" size="small" style="width: 120px;">
              <el-option label="全部" value="all" />
              <el-option label="思考" value="think" />
              <el-option label="决策" value="decide" />
              <el-option label="操作" value="action" />
              <el-option label="结果" value="result" />
            </el-select>
          </div>
          
          <div class="logs-list" ref="logsListRef">
            <div v-for="(log, index) in filteredLogs" :key="index" class="log-item" :class="log.type">
              <div class="log-time">{{ formatTime(log.timestamp) }}</div>
              <div class="log-type">
                <el-tag size="small" :type="getLogTagType(log.type)">
                  {{ getLogTypeName(log.type) }}
                </el-tag>
              </div>
              <div class="log-content">
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.details" class="log-details">
                  <pre>{{ log.details }}</pre>
                </div>
              </div>
            </div>
          </div>
          
          <div class="logs-footer">
            <el-button size="small" @click="clearLogs" icon="Delete">清空日志</el-button>
            <el-button size="small" @click="refreshLogs" icon="Refresh">刷新</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <el-card class="llm-decision-card">
          <div class="card-header">
            <h3>🧠 LLM 决策过程</h3>
          </div>
          <div class="decision-timeline">
            <el-timeline>
              <el-timeline-item v-for="(decision, index) in llmDecisions" :key="index" 
                              :color="decision.color" :timestamp="formatTime(decision.timestamp)" placement="top">
                <el-card class="decision-item">
                  <h4>{{ decision.title }}</h4>
                  <p>{{ decision.description }}</p>
                  <div class="decision-confidence">
                    置信度: <el-progress :percentage="decision.confidence" :color="decision.color" /></div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="skills-usage-card">
          <div class="card-header">
            <h3>🎯 技能使用情况</h3>
          </div>
          <div class="skills-list">
            <div v-for="(skill, index) in skillsUsage" :key="index" class="skill-item">
              <div class="skill-header">
                <span class="skill-name">{{ skill.name }}</span>
                <el-tag size="small" type="success">使用 {{ skill.usageCount }} 次</el-tag>
              </div>
              <el-progress :percentage="skill.percentage" :color="skill.color" :stroke-width="10" />
              <div class="skill-desc">{{ skill.description }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="browser-view-card">
          <div class="card-header">
            <h3>🌐 Agent 浏览器视图</h3>
            <el-button size="small" @click="toggleBrowserView" icon="FullScreen">
              {{ showBrowserView ? '收起' : '全屏' }}
            </el-button>
          </div>
          <div class="browser-view">
            <div v-if="!showBrowserView" class="browser-placeholder">
              <el-icon :size="60"><component :is="Monitor" /></el-icon>
              <p>Agent 浏览器操作将在此显示</p>
              <el-button type="primary" @click="toggleBrowserView" size="small">
                预览视图
              </el-button>
            </div>
            <div v-else class="browser-active">
              <div class="browser-toolbar">
                <el-tag size="small">{{ currentPage || '未导航' }}</el-tag>
                <el-tag v-if="currentStore" size="small" type="success">{{ currentStore }}</el-tag>
              </div>
              <div class="browser-content">
                <el-image v-if="browserScreenshot" :src="browserScreenshot" fit="contain" />
                <div v-else class="browser-empty">
                  <p>暂无截图</p>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="agent-abilities-card">
          <div class="card-header">
            <h3>⚡ Agent 能力展示</h3>
            <el-tag type="info">基于 DeepAgents 框架</el-tag>
          </div>
          
          <div class="abilities-grid">
            <div v-for="(ability, index) in agentAbilities" :key="index" class="ability-item">
              <div class="ability-icon">
                <el-icon><component :is="ability.icon" /></el-icon>
              </div>
              <div class="ability-info">
                <h4>{{ ability.name }}</h4>
                <p>{{ ability.description }}</p>
                <el-tag v-for="tag in ability.tags" :key="tag" size="small" style="margin-right: 5px;">
                  {{ tag }}
                </el-tag>
              </div>
              <div class="ability-status">
                <el-switch v-model="ability.enabled" :disabled="ability.locked" />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as icons from '@element-plus/icons-vue'

export default {
  name: 'AgentConsole',
  setup() {
    const Task = icons.Task
    const Clock = icons.Clock
    const ChatDotRound = icons.ChatDotRound
    const Monitor = icons.Monitor
    
    const agentStatus = ref('idle')
    const currentTask = ref(null)
    const runningTime = ref(0)
    const conversationHistory = ref([])
    const conversationCount = ref(0)
    const userInput = ref('')
    const isAgentTyping = ref(false)
    const logs = ref([])
    const logFilter = ref('all')
    const llmDecisions = ref([])
    const skillsUsage = ref([])
    const browserScreenshot = ref('')
    const currentPage = ref('')
    const currentStore = ref('')
    const showBrowserView = ref(false)
    const conversationListRef = ref(null)
    const logsListRef = ref(null)

    const agentAbilities = ref([
      {
        name: '智能任务规划',
        description: '自动分析任务需求，制定执行计划',
        icon: 'Operation',
        tags: ['任务分解', '优先级排序'],
        enabled: true,
        locked: false
      },
      {
        name: '浏览器自动化',
        description: '控制浏览器执行各种网页操作',
        icon: 'Monitor',
        tags: ['点击', '输入', '导航'],
        enabled: true,
        locked: false
      },
      {
        name: 'DOM 元素智能定位',
        description: '自动识别和定位页面元素',
        icon: 'Aim',
        tags: ['CSS', 'XPath', '智能匹配'],
        enabled: true,
        locked: false
      },
      {
        name: '自然语言理解',
        description: '理解用户自然语言指令',
        icon: 'ChatLineRound',
        tags: ['意图识别', '实体提取'],
        enabled: true,
        locked: false
      },
      {
        name: '内容自动生成',
        description: 'AI 自动生成商品描述、回复内容等',
        icon: 'Document',
        tags: ['商品标题', '好评回复'],
        enabled: true,
        locked: false
      },
      {
        name: '数据智能分析',
        description: '分析运营数据并生成优化建议',
        icon: 'DataAnalysis',
        tags: ['趋势分析', '异常检测'],
        enabled: true,
        locked: false
      }
    ])

    let timer = null
    let simulationTimer = null

    const filteredLogs = computed(() => {
      if (logFilter.value === 'all') return logs.value
      return logs.value.filter(log => log.type === logFilter.value)
    })

    const getStatusText = (status) => {
      const statusMap = {
        idle: '空闲',
        running: '执行中',
        waiting: '等待输入',
        error: '异常'
      }
      return statusMap[status] || status
    }

    const getTaskColor = (type) => {
      const colorMap = {
        publish: '#409eff',
        good_review: '#67c23a',
        fetch_data: '#e6a23c',
        analyze: '#f56c6c'
      }
      return colorMap[type] || '#909399'
    }

    const getLogTagType = (type) => {
      const typeMap = {
        think: 'info',
        decide: 'warning',
        action: 'success',
        result: ''
      }
      return typeMap[type] || 'info'
    }

    const getLogTypeName = (type) => {
      const nameMap = {
        think: '思考',
        decide: '决策',
        action: '操作',
        result: '结果'
      }
      return nameMap[type] || type
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) return `${hours}小时${minutes}分`
      if (minutes > 0) return `${minutes}分${secs}秒`
      return `${secs}秒`
    }

    const sendMessage = async () => {
      if (!userInput.value.trim() || agentStatus.value === 'running') return
      
      const message = userInput.value.trim()
      userInput.value = ''
      
      conversationHistory.value.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
      })
      conversationCount.value++
      
      scrollToBottom()
      
      isAgentTyping.value = true
      agentStatus.value = 'running'
      runningTime.value = 0
      
      addLog('think', '分析用户指令', '理解任务需求...')
      
      await simulateAgentThinking(message)
    }

    const simulateAgentThinking = async (message) => {
      await delay(1500)
      
      addLog('decide', '制定执行计划', `分析结果：${getTaskAnalysis(message)}`)
      
      llmDecisions.value.unshift({
        title: '意图分析',
        description: `识别用户意图：${getIntent(message)}`,
        confidence: Math.floor(Math.random() * 20) + 80,
        color: '#409eff',
        timestamp: Date.now()
      })
      
      await delay(1000)
      
      addLog('decide', '选择执行策略', '基于技能系统选择最优方案')
      
      llmDecisions.value.unshift({
        title: '策略选择',
        description: '选择执行技能：product-publish',
        confidence: Math.floor(Math.random() * 15) + 85,
        color: '#67c23a',
        timestamp: Date.now()
      })
      
      skillsUsage.value[0] = {
        name: 'product-publish',
        description: '商品发布技能',
        usageCount: skillsUsage.value[0]?.usageCount + 1 || 1,
        percentage: Math.min(100, (skillsUsage.value[0]?.percentage || 0) + 20),
        color: '#409eff'
      }
      
      await delay(2000)
      
      addLog('action', '开始执行任务', '初始化浏览器...')
      
      currentPage.value = 'https://creator.douyin.com'
      currentStore.value = '抖音旗舰店'
      
      await delay(1500)
      
      addLog('action', '导航到目标页面', '打开商品发布页面')
      
      browserScreenshot.value = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RG91eWluIENyZWF0b3I8L3RleHQ+PC9zdmc+'
      
      await delay(1000)
      
      addLog('result', '任务执行完成', '商品信息已自动填写完成')
      
      isAgentTyping.value = false
      agentStatus.value = 'idle'
      
      conversationHistory.value.push({
        role: 'agent',
        content: `已理解您的指令「${message}」，任务已自动执行完成。\n\n执行摘要：\n1. ✅ 分析任务需求\n2. ✅ 选择商品发布技能\n3. ✅ 导航到抖音创作者平台\n4. ✅ 自动填写商品信息\n\n如需查看详细日志或调整参数，请告诉我！`,
        timestamp: Date.now()
      })
      
      conversationCount.value++
      scrollToBottom()
      
      ElMessage.success('任务执行完成')
    }

    const getTaskAnalysis = (message) => {
      if (message.includes('发布') || message.includes('上架')) return '商品发布任务'
      if (message.includes('好评') || message.includes('评价')) return '好评管理任务'
      if (message.includes('数据') || message.includes('统计')) return '数据采集任务'
      return '综合任务'
    }

    const getIntent = (message) => {
      if (message.includes('发布') && message.includes('抖音')) return '在抖音平台发布商品'
      if (message.includes('好评')) return '管理店铺好评'
      return '其他操作'
    }

    const addLog = (type, message, details = '') => {
      logs.value.unshift({
        type,
        message,
        details,
        timestamp: Date.now()
      })
      
      if (logs.value.length > 100) {
        logs.value = logs.value.slice(0, 100)
      }
      
      nextTick(() => scrollLogsToTop())
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (conversationListRef.value) {
          conversationListRef.value.scrollTop = conversationListRef.value.scrollHeight
        }
      })
    }

    const scrollLogsToTop = () => {
      nextTick(() => {
        if (logsListRef.value) {
          logsListRef.value.scrollTop = 0
        }
      })
    }

    const clearConversation = () => {
      ElMessageBox.confirm('确定要清空所有对话记录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        conversationHistory.value = []
        conversationCount.value = 0
        ElMessage.success('对话已清空')
      }).catch(() => {})
    }

    const clearLogs = () => {
      logs.value = []
      ElMessage.success('日志已清空')
    }

    const refreshLogs = () => {
      ElMessage.success('日志已刷新')
    }

    const toggleBrowserView = () => {
      showBrowserView.value = !showBrowserView.value
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    const startTimer = () => {
      timer = setInterval(() => {
        if (agentStatus.value === 'running') {
          runningTime.value++
        }
      }, 1000)
    }

    const startSimulation = () => {
      simulationTimer = setInterval(() => {
        if (agentStatus.value === 'idle' && Math.random() > 0.95) {
          addLog('action', '系统自检', 'Agent 状态正常，等待任务...')
        }
      }, 5000)
    }

    onMounted(() => {
      startTimer()
      startSimulation()
      
      skillsUsage.value = [
        { name: 'product-publish', description: '商品发布技能', usageCount: 12, percentage: 60, color: '#409eff' },
        { name: 'good-review', description: '好评管理技能', usageCount: 8, percentage: 40, color: '#67c23a' },
        { name: 'data-collection', description: '数据采集技能', usageCount: 5, percentage: 25, color: '#e6a23c' }
      ]
      
      llmDecisions.value = [
        {
          title: '任务理解',
          description: '成功解析用户指令',
          confidence: 95,
          color: '#409eff',
          timestamp: Date.now() - 60000
        },
        {
          title: '技能匹配',
          description: '选择合适的执行技能',
          confidence: 88,
          color: '#67c23a',
          timestamp: Date.now() - 30000
        }
      ]
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
      if (simulationTimer) clearInterval(simulationTimer)
    })

    return {
      Task,
      Clock,
      ChatDotRound,
      Monitor,
      agentStatus,
      currentTask,
      runningTime,
      conversationHistory,
      conversationCount,
      userInput,
      isAgentTyping,
      logs,
      logFilter,
      filteredLogs,
      llmDecisions,
      skillsUsage,
      browserScreenshot,
      currentPage,
      currentStore,
      showBrowserView,
      conversationListRef,
      logsListRef,
      agentAbilities,
      getStatusText,
      getTaskColor,
      getLogTagType,
      getLogTypeName,
      formatTime,
      formatDuration,
      sendMessage,
      clearConversation,
      clearLogs,
      refreshLogs,
      toggleBrowserView
    }
  }
}
</script>

<style scoped>
.agent-console {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #303133;
}

.subtitle {
  color: #909399;
  margin: 0;
}

.status-card, .stats-card {
  margin-bottom: 20px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-indicator {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-indicator.idle { background: #67c23a; }
.status-indicator.running { background: #409eff; }
.status-indicator.waiting { background: #e6a23c; }
.status-indicator.error { background: #f56c6c; }

.pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 14px;
  color: #909399;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stats-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.stats-label {
  color: #909399;
  font-size: 14px;
}

.conversation-card, .logs-card {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 15px;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
}

.message-header {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 12px;
}

.message-role {
  font-weight: bold;
  color: #303133;
}

.message-time {
  color: #909399;
}

.message-text {
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.message.agent .message-text {
  background: #ecf5ff;
}

.typing-indicator {
  display: flex;
  gap: 3px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #409eff;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.conversation-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logs-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 10px;
}

.log-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
}

.log-time {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.log-type {
  white-space: nowrap;
}

.log-content {
  flex: 1;
}

.log-message {
  font-size: 14px;
  color: #303133;
}

.log-details {
  margin-top: 5px;
}

.log-details pre {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 5px;
  border-radius: 3px;
  margin: 0;
}

.logs-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.decision-card {
  height: 500px;
  overflow-y: auto;
}

.decision-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.decision-item p {
  margin: 0 0 10px 0;
  color: #606266;
}

.decision-confidence {
  font-size: 12px;
  color: #909399;
}

.skills-list {
  padding: 10px;
}

.skill-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.skill-name {
  font-weight: bold;
  color: #303133;
}

.skill-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.browser-view {
  height: 400px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.browser-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.browser-placeholder p {
  margin: 15px 0;
}

.browser-active {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.browser-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.browser-content {
  flex: 1;
  padding: 10px;
  overflow: auto;
  background: white;
}

.browser-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.abilities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.ability-item {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ability-icon {
  width: 50px;
  height: 50px;
  background: #409eff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.ability-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.ability-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.ability-status {
  margin-top: auto;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
