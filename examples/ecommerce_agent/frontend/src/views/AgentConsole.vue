<template>
  <div class="agent-console">
    <div class="page-header">
      <h2>🤖 AI Agent 任务中心</h2>
      <p class="subtitle">智能任务分析 · 多 Agent 并行执行 · 实时进度追踪</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="status-card">
          <div class="status-content">
            <div class="status-indicator" :class="globalStatus">
              <div class="pulse"></div>
            </div>
            <div class="status-info">
              <div class="status-label">全局状态</div>
              <div class="status-value">{{ getStatusText(globalStatus) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon><component :is="icons.Tasks" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ activeTasks.length }}</div>
              <div class="stats-label">进行中任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon><component :is="icons.SuccessFilled" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ completedTasks }}</div>
              <div class="stats-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon><component :is="icons.User" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ activeAgents }}</div>
              <div class="stats-label">活跃Agent</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="input-card">
      <div class="card-header">
        <h3>📝 输入任务指令</h3>
        <el-button type="primary" @click="showExamples = true" size="small">示例指令</el-button>
      </div>
      <el-input
        v-model="taskInput"
        type="textarea"
        :rows="4"
        placeholder="输入任务指令，例如：
· 帮我把新品发布到抖音、拼多多和淘宝
· 处理这三个店铺的所有好评
· 采集抖音和拼多多的今日订单数据"
        :disabled="globalStatus === 'running'"
      />
      <div class="input-actions">
        <div class="input-tips">
          <el-tag v-if="detectedPlatforms.length > 0" type="success" size="small">
            检测到平台: {{ detectedPlatforms.join(', ') }}
          </el-tag>
          <el-tag v-if="estimatedTasks > 0" type="info" size="small">
            预计任务数: {{ estimatedTasks }}
          </el-tag>
        </div>
        <div class="input-buttons">
          <el-button @click="analyzeTask" :disabled="!taskInput.trim() || globalStatus === 'running'" icon="Search">
            分析任务
          </el-button>
          <el-button type="primary" @click="executeTask" :disabled="!taskInput.trim() || globalStatus === 'running'" icon="VideoPlay">
            开始执行
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" v-if="showAnalysis">
      <el-col :span="24">
        <el-card class="analysis-card">
          <div class="card-header">
            <h3>🧠 任务分析结果</h3>
            <el-tag type="success">智能拆解完成</el-tag>
          </div>
          
          <el-tabs v-model="activeAnalysisTab">
            <el-tab-pane label="任务拆解" name="breakdown">
              <div class="task-breakdown">
                <el-steps :active="currentStepIndex" align-center finish-status="success">
                  <el-step v-for="(step, index) in taskSteps" :key="index" 
                          :title="step.name" :description="step.platform ? `平台: ${step.platform}` : ''" />
                </el-steps>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="执行计划" name="plan">
              <div class="execution-plan">
                <el-row :gutter="20">
                  <el-col :span="8" v-for="(agent, index) in plannedAgents" :key="index">
                    <el-card class="agent-plan-card" shadow="hover">
                      <div class="agent-header">
                        <el-avatar :size="40" :style="{ background: agent.color }">
                          {{ agent.name.charAt(0) }}
                        </el-avatar>
                        <div class="agent-info">
                          <div class="agent-name">{{ agent.name }}</div>
                          <div class="agent-platform">{{ agent.platform }}</div>
                        </div>
                        <el-tag size="small" type="success">就绪</el-tag>
                      </div>
                      <div class="agent-tasks">
                        <div class="task-label">负责任务：</div>
                        <el-tag v-for="task in agent.tasks" :key="task" size="small" style="margin: 3px;">
                          {{ task }}
                        </el-tag>
                      </div>
                    </el-card>
                  </el-col>
                </el-row>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" v-if="globalStatus === 'running' || executionLogs.length > 0">
      <el-col :span="12">
        <el-card class="execution-card">
          <div class="card-header">
            <h3>⚡ 实时任务执行</h3>
            <el-tag v-if="globalStatus === 'running'" type="warning" size="small" :hit="true">
              执行中
            </el-tag>
          </div>
          
          <div class="execution-list">
            <div v-for="(task, index) in executingTasks" :key="task.id" class="execution-item">
              <div class="execution-header">
                <div class="execution-info">
                  <el-avatar :size="32" :style="{ background: task.color }">
                    {{ task.agentName.charAt(0) }}
                  </el-avatar>
                  <div class="execution-details">
                    <div class="execution-name">{{ task.name }}</div>
                    <div class="execution-platform">{{ task.platform }}</div>
                  </div>
                </div>
                <div class="execution-status">
                  <el-tag size="small" :type="getTaskStatusType(task.status)">
                    {{ getTaskStatusText(task.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="execution-progress">
                <el-progress :percentage="task.progress" :color="task.color" :stroke-width="15" />
              </div>
              
              <div class="execution-steps">
                <div v-for="(step, stepIndex) in task.steps" :key="stepIndex" 
                     class="step-item" :class="{ active: stepIndex === task.currentStep, completed: step.completed }">
                  <div class="step-indicator">
                    <el-icon v-if="step.completed"><component :is="icons.SuccessFilled" /></el-icon>
                    <el-icon v-else-if="stepIndex === task.currentStep"><component :is="icons.Loading" /></el-icon>
                    <span v-else>{{ stepIndex + 1 }}</span>
                  </div>
                  <div class="step-content">
                    <div class="step-name">{{ step.name }}</div>
                    <div class="step-detail" v-if="step.detail">{{ step.detail }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="logs-card">
          <div class="card-header">
            <h3>📊 执行日志</h3>
            <el-select v-model="logFilter" size="small" style="width: 120px;">
              <el-option label="全部" value="all" />
              <el-option label="分析" value="analyze" />
              <el-option label="决策" value="decide" />
              <el-option label="执行" value="execute" />
              <el-option label="完成" value="complete" />
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
            <el-button size="small" @click="clearLogs" icon="Delete">清空</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" v-if="executionSummary.length > 0" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="summary-card">
          <div class="card-header">
            <h3>✅ 执行结果汇总</h3>
            <el-button type="primary" size="small" @click="exportSummary" icon="Download">
              导出报告
            </el-button>
          </div>
          
          <el-table :data="executionSummary" border stripe>
            <el-table-column prop="platform" label="平台" width="120">
              <template #default="scope">
                <el-tag :type="getPlatformTagType(scope.row.platform)">
                  {{ scope.row.platform }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="taskName" label="任务名称" min-width="200" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
                  {{ scope.row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100" />
            <el-table-column prop="details" label="详情" min-width="300" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showExamples" title="示例指令" width="60%">
      <el-card v-for="(example, index) in taskExamples" :key="index" class="example-card" shadow="hover">
        <div class="example-content">
          <div class="example-title">{{ example.title }}</div>
          <div class="example-desc">{{ example.description }}</div>
          <el-tag v-for="platform in example.platforms" :key="platform" size="small" type="success" style="margin: 3px;">
            {{ platform }}
          </el-tag>
        </div>
        <el-button type="primary" size="small" @click="useExample(example)">使用此指令</el-button>
      </el-card>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as icons from '@element-plus/icons-vue'

export default {
  name: 'AgentConsole',
  setup() {
    const globalStatus = ref('idle')
    const taskInput = ref('')
    const activeTasks = ref([])
    const completedTasks = ref(0)
    const activeAgents = ref(0)
    const executingTasks = ref([])
    const executionLogs = ref([])
    const executionSummary = ref([])
    const showAnalysis = ref(false)
    const showExamples = ref(false)
    const logFilter = ref('all')
    const logsListRef = ref(null)
    const activeAnalysisTab = ref('breakdown')
    const taskSteps = ref([])
    const currentStepIndex = ref(-1)
    const plannedAgents = ref([])

    let executionTimer = null

    const taskExamples = [
      {
        title: '多平台商品发布',
        description: '将新品同时发布到抖音、拼多多和淘宝三个平台',
        platforms: ['抖音', '拼多多', '淘宝'],
        input: '帮我把新品发布到抖音、拼多多和淘宝'
      },
      {
        title: '多平台好评管理',
        description: '批量处理多个店铺的好评回复',
        platforms: ['抖音', '拼多多'],
        input: '处理抖音和拼多多店铺的所有待回复好评'
      },
      {
        title: '多平台数据采集',
        description: '同时采集多个平台的订单和销售数据',
        platforms: ['抖音', '拼多多', '淘宝'],
        input: '采集抖音、拼多多和淘宝的今日订单数据'
      }
    ]

    const detectedPlatforms = computed(() => {
      if (!taskInput.value) return []
      const platforms = []
      if (taskInput.value.includes('抖音')) platforms.push('抖音')
      if (taskInput.value.includes('拼多多') || taskInput.value.includes('拼多多')) platforms.push('拼多多')
      if (taskInput.value.includes('淘宝')) platforms.push('淘宝')
      if (taskInput.value.includes('京东')) platforms.push('京东')
      return platforms
    })

    const estimatedTasks = computed(() => {
      return Math.max(1, detectedPlatforms.value.length)
    })

    const filteredLogs = computed(() => {
      if (logFilter.value === 'all') return executionLogs.value
      return executionLogs.value.filter(log => log.type === logFilter.value)
    })

    const getStatusText = (status) => {
      const statusMap = {
        idle: '空闲',
        running: '执行中',
        analyzing: '分析中',
        completed: '已完成'
      }
      return statusMap[status] || status
    }

    const getPlatformTagType = (platform) => {
      const typeMap = {
        '抖音': '',
        '拼多多': 'warning',
        '淘宝': 'success',
        '京东': 'danger'
      }
      return typeMap[platform] || 'info'
    }

    const getTaskStatusType = (status) => {
      const typeMap = {
        pending: 'info',
        running: 'warning',
        completed: 'success',
        failed: 'danger'
      }
      return typeMap[status] || 'info'
    }

    const getTaskStatusText = (status) => {
      const textMap = {
        pending: '等待',
        running: '执行中',
        completed: '完成',
        failed: '失败'
      }
      return textMap[status] || status
    }

    const getLogTagType = (type) => {
      const typeMap = {
        analyze: 'info',
        decide: 'warning',
        execute: 'success',
        complete: ''
      }
      return typeMap[type] || 'info'
    }

    const getLogTypeName = (type) => {
      const nameMap = {
        analyze: '分析',
        decide: '决策',
        execute: '执行',
        complete: '完成'
      }
      return nameMap[type] || type
    }

    const formatTime = (timestamp) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const analyzeTask = () => {
      if (!taskInput.value.trim()) return
      
      globalStatus.value = 'analyzing'
      showAnalysis.value = true
      
      addLog('analyze', '开始分析任务', taskInput.value)
      
      setTimeout(() => {
        const platforms = detectedPlatforms.value
        const tasks = analyzeTaskContent(taskInput.value)
        
        addLog('decide', '识别执行平台', `检测到 ${platforms.length} 个平台: ${platforms.join(', ')}`)
        addLog('decide', '拆解任务步骤', `识别出 ${tasks.length} 个子任务`)
        
        taskSteps.value = generateTaskSteps(platforms, tasks)
        plannedAgents.value = createAgentPlans(platforms, tasks)
        
        globalStatus.value = 'idle'
        ElMessage.success('任务分析完成，请查看执行计划')
      }, 1500)
    }

    const analyzeTaskContent = (input) => {
      const tasks = []
      if (input.includes('发布') || input.includes('上架')) {
        tasks.push({ type: 'publish', name: '商品发布', description: '发布商品到平台' })
      }
      if (input.includes('好评') || input.includes('评价')) {
        tasks.push({ type: 'review', name: '好评管理', description: '处理店铺好评' })
      }
      if (input.includes('数据') || input.includes('订单')) {
        tasks.push({ type: 'data', name: '数据采集', description: '采集订单和销售数据' })
      }
      if (input.includes('分析')) {
        tasks.push({ type: 'analyze', name: '数据分析', description: '分析运营数据' })
      }
      return tasks.length > 0 ? tasks : [{ type: 'general', name: '通用任务', description: '执行通用操作' }]
    }

    const generateTaskSteps = (platforms, tasks) => {
      const steps = []
      platforms.forEach(platform => {
        tasks.forEach(task => {
          steps.push({
            name: `${platform}-${task.name}`,
            platform: platform,
            task: task
          })
        })
      })
      return steps
    }

    const createAgentPlans = (platforms, tasks) => {
      const colorMap = {
        '抖音': '#fe2c55',
        '拼多多': '#ee4d2e',
        '淘宝': '#ff5000',
        '京东': '#c9190e'
      }
      
      return platforms.map((platform, index) => ({
        id: `agent-${index}`,
        name: `${platform} Agent`,
        platform: platform,
        color: colorMap[platform] || '#409eff',
        tasks: tasks.map(t => t.name)
      }))
    }

    const executeTask = async () => {
      if (!taskInput.value.trim()) return
      
      globalStatus.value = 'running'
      executingTasks.value = []
      executionSummary.value = []
      
      addLog('execute', '任务执行开始', `共 ${plannedAgents.value.length} 个 Agent 将并行执行`)
      
      plannedAgents.value.forEach((agent, index) => {
        const task = {
          id: `task-${index}`,
          name: agent.tasks.join('+'),
          platform: agent.platform,
          agentName: agent.name,
          color: agent.color,
          status: 'running',
          progress: 0,
          currentStep: 0,
          steps: generateExecutionSteps(agent)
        }
        executingTasks.value.push(task)
      })
      
      activeAgents.value = executingTasks.value.length
      
      await runParallelExecution()
    }

    const generateExecutionSteps = (agent) => {
      const steps = [
        { name: '初始化 Agent', detail: `启动 ${agent.platform} Agent` },
        { name: '加载技能', detail: `加载 ${agent.tasks[0]} 技能` },
        { name: '导航页面', detail: `打开 ${agent.platform} 控制台` },
        { name: '执行任务', detail: agent.tasks[0] },
        { name: '验证结果', detail: '检查执行结果' },
        { name: '生成报告', detail: '记录执行日志' }
      ]
      return steps.map(s => ({ ...s, completed: false }))
    }

    const runParallelExecution = async () => {
      executionTimer = setInterval(async () => {
        let allCompleted = true
        
        for (const task of executingTasks.value) {
          if (task.status === 'running') {
            allCompleted = false
            await updateTaskProgress(task)
          }
        }
        
        if (allCompleted) {
          clearInterval(executionTimer)
          globalStatus.value = 'idle'
          completedTasks.value += executingTasks.value.length
          activeAgents.value = 0
          
          addLog('complete', '所有任务执行完成', `成功执行 ${executingTasks.value.length} 个任务`)
          
          generateExecutionSummary()
          
          ElMessage.success('所有任务执行完成！')
        }
      }, 1000)
    }

    const updateTaskProgress = async (task) => {
      await delay(800 + Math.random() * 400)
      
      task.currentStep++
      task.steps[task.currentStep - 1].completed = true
      
      const progressMap = {
        0: 5,
        1: 20,
        2: 40,
        3: 70,
        4: 90,
        5: 100
      }
      task.progress = progressMap[task.currentStep] || task.progress
      
      addLog('execute', `${task.platform} Agent`, `${task.steps[task.currentStep - 1].name} - ${task.steps[task.currentStep - 1].detail}`)
      
      if (task.currentStep >= task.steps.length) {
        task.status = 'completed'
        task.progress = 100
        addLog('complete', `${task.platform} 完成`, `${task.name} 执行成功`)
      }
      
      currentStepIndex.value = Math.max(...executingTasks.value.map(t => t.currentStep))
    }

    const generateExecutionSummary = () => {
      executionSummary.value = executingTasks.value.map(task => ({
        platform: task.platform,
        taskName: task.name,
        status: task.status === 'completed' ? 'success' : 'failed',
        duration: `${(task.steps.length * 1.5).toFixed(1)}秒`,
        details: `${task.platform} Agent 成功执行 ${task.tasks?.join(', ') || task.name}`
      }))
    }

    const addLog = (type, message, details = '') => {
      executionLogs.value.unshift({
        type,
        message,
        details,
        timestamp: Date.now()
      })
      
      if (executionLogs.value.length > 200) {
        executionLogs.value = executionLogs.value.slice(0, 200)
      }
      
      nextTick(() => {
        if (logsListRef.value) {
          logsListRef.value.scrollTop = 0
        }
      })
    }

    const clearLogs = () => {
      executionLogs.value = []
    }

    const exportSummary = () => {
      ElMessageBox.confirm('确定要导出执行报告吗？', '导出报告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        const report = generateReport()
        const blob = new Blob([report], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-execution-report-${Date.now()}.md`
        a.click()
        URL.revokeObjectURL(url)
        ElMessage.success('报告已导出')
      }).catch(() => {})
    }

    const generateReport = () => {
      const lines = [
        '# Agent 执行报告',
        '',
        `生成时间: ${new Date().toLocaleString('zh-CN')}`,
        '',
        '## 执行摘要',
        '',
        `- 总任务数: ${executingTasks.value.length}`,
        `- 成功: ${executingTasks.value.filter(t => t.status === 'completed').length}`,
        `- 失败: ${executingTasks.value.filter(t => t.status === 'failed').length}`,
        '',
        '## 详细结果',
        '',
      ]
      
      executionSummary.value.forEach((item, index) => {
        lines.push(`${index + 1}. **${item.platform}** - ${item.taskName}`)
        lines.push(`   - 状态: ${item.status === 'success' ? '✅ 成功' : '❌ 失败'}`)
        lines.push(`   - 耗时: ${item.duration}`)
        lines.push(`   - 详情: ${item.details}`)
        lines.push('')
      })
      
      return lines.join('\n')
    }

    const useExample = (example) => {
      taskInput.value = example.input
      showExamples.value = false
      ElMessage.success('已加载示例指令')
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    onUnmounted(() => {
      if (executionTimer) clearInterval(executionTimer)
    })

    return {
      icons,
      globalStatus,
      taskInput,
      activeTasks,
      completedTasks,
      activeAgents,
      executingTasks,
      executionLogs,
      executionSummary,
      showAnalysis,
      showExamples,
      logFilter,
      logsListRef,
      activeAnalysisTab,
      taskSteps,
      currentStepIndex,
      plannedAgents,
      taskExamples,
      detectedPlatforms,
      estimatedTasks,
      filteredLogs,
      getStatusText,
      getPlatformTagType,
      getTaskStatusType,
      getTaskStatusText,
      getLogTagType,
      getLogTypeName,
      formatTime,
      analyzeTask,
      executeTask,
      clearLogs,
      exportSummary,
      useExample
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
  font-size: 14px;
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
.status-indicator.analyzing { background: #e6a23c; }
.status-indicator.completed { background: #909399; }

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

.input-card, .analysis-card, .execution-card, .logs-card, .summary-card {
  margin-bottom: 20px;
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

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.input-tips {
  display: flex;
  gap: 10px;
}

.input-buttons {
  display: flex;
  gap: 10px;
}

.execution-list {
  max-height: 500px;
  overflow-y: auto;
}

.execution-item {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.execution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.execution-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.execution-details {
  display: flex;
  flex-direction: column;
}

.execution-name {
  font-weight: bold;
  color: #303133;
}

.execution-platform {
  font-size: 12px;
  color: #909399;
}

.execution-progress {
  margin-bottom: 15px;
}

.execution-steps {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 150px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  transition: all 0.3s;
}

.step-item.active {
  background: #ecf5ff;
  border: 2px solid #409eff;
}

.step-item.completed {
  background: #f0f9ff;
}

.step-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.step-item.active .step-indicator {
  background: #409eff;
}

.step-item.completed .step-indicator {
  background: #67c23a;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.step-detail {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logs-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
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
  white-space: pre-wrap;
}

.logs-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.agent-plan-card {
  margin-bottom: 15px;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-weight: bold;
  color: #303133;
}

.agent-platform {
  font-size: 12px;
  color: #909399;
}

.agent-tasks {
  margin-top: 10px;
}

.task-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.example-card {
  margin-bottom: 15px;
}

.example-content {
  margin-bottom: 10px;
}

.example-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.example-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
