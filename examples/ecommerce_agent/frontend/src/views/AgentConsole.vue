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
              <el-icon><component :is="icons.Robot" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalAgents }}</div>
              <div class="stats-label">Agent总数</div>
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
              <div class="stats-label">已完成任务</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon><component :is="icons.Link" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ activePlatforms }}</div>
              <div class="stats-label">活跃平台</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="input-card">
      <div class="card-header">
        <h3>📝 输入任务指令</h3>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="showAgentManager = true" icon="Setting">Agent 管理</el-button>
          <el-button type="success" size="small" @click="showExamples = true" icon="Connection">示例指令</el-button>
        </div>
      </div>
      
      <el-input
        v-model="taskInput"
        type="textarea"
        :rows="4"
        placeholder="输入任务指令，例如：
· 帮我把新品发布到抖音、拼多多和淘宝
· 用抖音A和抖音B处理好评
· 采集所有店铺的今日订单数据"
        :disabled="globalStatus === 'running'"
      />
      
      <div class="input-actions">
        <div class="input-tips">
          <el-tag v-if="detectedPlatforms.length > 0" type="success" size="small">
            检测到平台: {{ detectedPlatforms.join(', ') }}
          </el-tag>
          <el-tag v-if="estimatedAgents > 0" type="info" size="small">
            将启动 {{ estimatedAgents }} 个 Agent
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
            <el-tab-pane label="Agent 分配" name="agents">
              <el-row :gutter="20">
                <el-col :span="8" v-for="(platformAgents, platform) in plannedPlatformAgents" :key="platform">
                  <el-card class="platform-card">
                    <div class="platform-header">
                      <div class="platform-badge" :style="{ background: getPlatformColor(platform) }">
                        {{ platform.charAt(0) }}
                      </div>
                      <div class="platform-info">
                        <div class="platform-name">{{ platform }}</div>
                        <div class="platform-count">{{ platformAgents.length }} 个 Agent</div>
                      </div>
                    </div>
                    
                    <div class="agent-list">
                      <div v-for="(agent, index) in platformAgents" :key="index" class="agent-item">
                        <el-avatar :size="28" :style="{ background: agent.color }">
                          {{ agent.name.charAt(agent.name.length - 1) }}
                        </el-avatar>
                        <div class="agent-info">
                          <div class="agent-name">{{ agent.name }}</div>
                          <div class="agent-tasks">{{ agent.tasks.join(', ') }}</div>
                        </div>
                        <el-tag size="small" type="success">就绪</el-tag>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </el-tab-pane>
            
            <el-tab-pane label="执行计划" name="plan">
              <el-steps :active="currentStepIndex" align-center finish-status="success">
                <el-step v-for="(step, index) in taskSteps" :key="index" 
                        :title="step.name" :description="`Agent: ${step.agentName}`" />
              </el-steps>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" v-if="globalStatus === 'running' || executingTasks.length > 0">
      <el-col :span="14">
        <el-card class="execution-card">
          <div class="card-header">
            <h3>⚡ 实时任务执行</h3>
            <el-tag v-if="globalStatus === 'running'" type="warning" size="small" :hit="true">
              {{ executingTasks.filter(t => t.status === 'running').length }} 个 Agent 执行中
            </el-tag>
          </div>
          
          <div class="execution-list">
            <div v-for="(task, index) in executingTasks" :key="task.id" class="execution-item">
              <div class="execution-header">
                <div class="execution-info">
                  <el-avatar :size="36" :style="{ background: task.color }">
                    {{ task.agentName.charAt(task.agentName.length - 1) }}
                  </el-avatar>
                  <div class="execution-details">
                    <div class="execution-name">{{ task.agentName }}</div>
                    <div class="execution-platform">{{ task.platform }} · {{ task.tasks.join('+') }}</div>
                  </div>
                </div>
                <div class="execution-actions">
                  <el-tag size="small" :type="getTaskStatusType(task.status)">
                    {{ getTaskStatusText(task.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="execution-progress">
                <el-progress :percentage="task.progress" :color="task.color" :stroke-width="12" />
              </div>
              
              <div class="execution-steps">
                <div v-for="(step, stepIndex) in task.steps" :key="stepIndex" 
                     class="step-item" :class="{ active: stepIndex === task.currentStep, completed: step.completed }">
                  <div class="step-indicator">
                    <el-icon v-if="step.completed" :size="14"><component :is="icons.SuccessFilled" /></el-icon>
                    <el-icon v-else-if="stepIndex === task.currentStep" :size="14" class="is-loading"><component :is="icons.Loading" /></el-icon>
                    <span v-else>{{ stepIndex + 1 }}</span>
                  </div>
                  <div class="step-content">
                    <div class="step-name">{{ step.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="10">
        <el-card class="logs-card">
          <div class="card-header">
            <h3>📊 执行日志</h3>
            <el-button size="small" @click="clearLogs" icon="Delete">清空</el-button>
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
                <div v-if="log.details" class="log-details">{{ log.details }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showAgentManager" title="🤖 Agent 管理" width="80%">
      <el-tabs v-model="agentManagerTab">
        <el-tab-pane label="已配置的 Agent" name="list">
          <el-row :gutter="20">
            <el-col :span="8" v-for="(agents, platform) in configuredAgents" :key="platform">
              <el-card class="agent-config-card">
                <template #header>
                  <div class="platform-header">
                    <div class="platform-badge" :style="{ background: getPlatformColor(platform) }">
                      {{ platform.charAt(0) }}
                    </div>
                    <span>{{ platform }}</span>
                    <el-tag size="small" type="info">{{ agents.length }} 个</el-tag>
                  </div>
                </template>
                
                <div v-for="(agent, index) in agents" :key="index" class="agent-config-item">
                  <el-avatar :size="32" :style="{ background: agent.color }">
                    {{ agent.name.charAt(agent.name.length - 1) }}
                  </el-avatar>
                  <div class="agent-config-info">
                    <div class="agent-config-name">{{ agent.name }}</div>
                    <div class="agent-config-status">
                      <el-tag v-if="agent.active" size="small" type="success">启用</el-tag>
                      <el-tag v-else size="small" type="info">禁用</el-tag>
                    </div>
                  </div>
                  <el-button-group>
                    <el-button size="small" @click="editAgent(platform, index)" icon="Edit" />
                    <el-button size="small" type="danger" @click="removeAgent(platform, index)" icon="Delete" />
                  </el-button-group>
                </div>
                
                <el-button type="primary" size="small" @click="addAgent(platform)" icon="Plus" style="width: 100%; margin-top: 10px;">
                  添加 Agent
                </el-button>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <el-tab-pane label="添加新 Agent" name="add">
          <el-form :model="newAgentForm" label-width="100px">
            <el-form-item label="选择平台">
              <el-select v-model="newAgentForm.platform" placeholder="选择平台">
                <el-option label="抖音" value="抖音" />
                <el-option label="拼多多" value="拼多多" />
                <el-option label="淘宝" value="淘宝" />
                <el-option label="京东" value="京东" />
              </el-select>
            </el-form-item>
            <el-form-item label="Agent 名称">
              <el-input v-model="newAgentForm.name" placeholder="例如：抖音-A旗舰店" />
            </el-form-item>
            <el-form-item label="Agent 描述">
              <el-input v-model="newAgentForm.description" type="textarea" :rows="3" placeholder="描述此 Agent 的职责" />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch v-model="newAgentForm.active" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitNewAgent">创建 Agent</el-button>
              <el-button @click="resetNewAgentForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="showExamples" title="💡 示例指令" width="60%">
      <el-card v-for="(example, index) in taskExamples" :key="index" class="example-card" shadow="hover">
        <div class="example-content">
          <div class="example-title">{{ example.title }}</div>
          <div class="example-desc">{{ example.description }}</div>
          <div class="example-agents">
            <el-tag v-for="agent in example.agents" :key="agent" size="small" type="success" style="margin: 3px;">
              {{ agent }}
            </el-tag>
          </div>
        </div>
        <el-button type="primary" size="small" @click="useExample(example)">使用此指令</el-button>
      </el-card>
    </el-dialog>

    <el-row :gutter="20" v-if="executionSummary.length > 0" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="summary-card">
          <div class="card-header">
            <h3>✅ 执行结果汇总</h3>
            <el-button type="primary" size="small" @click="exportSummary" icon="Download">导出报告</el-button>
          </div>
          
          <el-table :data="executionSummary" border stripe>
            <el-table-column prop="agentName" label="Agent" min-width="150">
              <template #default="scope">
                <el-avatar :size="24" :style="{ background: scope.row.color, fontSize: '10px' }">
                  {{ scope.row.agentName.charAt(scope.row.agentName.length - 1) }}
                </el-avatar>
                {{ scope.row.agentName }}
              </template>
            </el-table-column>
            <el-table-column prop="platform" label="平台" width="100">
              <template #default="scope">
                <el-tag :type="getPlatformTagType(scope.row.platform)">{{ scope.row.platform }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="tasks" label="任务" min-width="200">
              <template #default="scope">{{ scope.row.tasks.join(' + ') }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'">
                  {{ scope.row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
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
    const executingTasks = ref([])
    const executionLogs = ref([])
    const executionSummary = ref([])
    const showAnalysis = ref(false)
    const showAgentManager = ref(false)
    const showExamples = ref(false)
    const logFilter = ref('all')
    const logsListRef = ref(null)
    const activeAnalysisTab = ref('agents')
    const agentManagerTab = ref('list')
    const taskSteps = ref([])
    const currentStepIndex = ref(-1)
    const plannedPlatformAgents = ref({})
    const completedTasks = ref(0)

    let executionTimer = null

    const configuredAgents = ref({
      '抖音': [
        { name: '抖音-A旗舰店', color: '#fe2c55', active: true, description: '主旗舰店，负责新品发布' },
        { name: '抖音-B专卖店', color: '#ff6b9d', active: true, description: '专卖店，负责好评管理' },
        { name: '抖音-C专营店', color: '#c94b6d', active: false, description: '专营店，待启用' }
      ],
      '拼多多': [
        { name: '拼多多-旗舰店', color: '#ee4d2e', active: true, description: '主旗舰店' }
      ],
      '淘宝': [
        { name: '淘宝-官方店', color: '#ff5000', active: true, description: '官方店铺' }
      ],
      '京东': [
        { name: '京东-自营店', color: '#c9190e', active: false, description: '自营店铺，待启用' }
      ]
    })

    const newAgentForm = ref({
      platform: '',
      name: '',
      description: '',
      active: true
    })

    const taskExamples = [
      {
        title: '多平台多 Agent 商品发布',
        description: '使用多个店铺的 Agent 同时发布商品',
        agents: ['抖音-A旗舰店', '抖音-B专卖店', '拼多多-旗舰店', '淘宝-官方店'],
        input: '帮我把新品发布到抖音A、抖音B、拼多多和淘宝'
      },
      {
        title: '指定 Agent 处理好评',
        description: '让特定的 Agent 处理好评回复',
        agents: ['抖音-A旗舰店', '抖音-B专卖店'],
        input: '用抖音A和抖音B处理所有待回复的好评'
      },
      {
        title: '全平台数据采集',
        description: '所有启用的 Agent 采集各自的数据',
        agents: ['抖音-A旗舰店', '拼多多-旗舰店', '淘宝-官方店'],
        input: '采集所有店铺的今日订单数据'
      }
    ]

    const totalAgents = computed(() => {
      return Object.values(configuredAgents.value).flat().filter(a => a.active).length
    })

    const activePlatforms = computed(() => {
      return Object.keys(configuredAgents.value).filter(p => 
        configuredAgents.value[p].some(a => a.active)
      ).length
    })

    const detectedPlatforms = computed(() => {
      if (!taskInput.value) return []
      const platforms = []
      if (taskInput.value.includes('抖音')) platforms.push('抖音')
      if (taskInput.value.includes('拼多多')) platforms.push('拼多多')
      if (taskInput.value.includes('淘宝')) platforms.push('淘宝')
      if (taskInput.value.includes('京东')) platforms.push('京东')
      return [...new Set(platforms)]
    })

    const estimatedAgents = computed(() => {
      if (!taskInput.value) return 0
      let count = 0
      const platforms = detectedPlatforms.value
      
      platforms.forEach(platform => {
        const agents = configuredAgents.value[platform] || []
        if (taskInput.value.includes('A') && agents[0]) count++
        if (taskInput.value.includes('B') && agents[1]) count++
        if (taskInput.value.includes('C') && agents[2]) count++
        if (!taskInput.value.includes('A') && !taskInput.value.includes('B') && !taskInput.value.includes('C')) {
          count += agents.filter(a => a.active).length
        }
      })
      
      return Math.max(count, platforms.length)
    })

    const filteredLogs = computed(() => {
      if (logFilter.value === 'all') return executionLogs.value
      return executionLogs.value.filter(log => log.type === logFilter.value)
    })

    const getPlatformColor = (platform) => {
      const colorMap = {
        '抖音': '#fe2c55',
        '拼多多': '#ee4d2e',
        '淘宝': '#ff5000',
        '京东': '#c9190e'
      }
      return colorMap[platform] || '#409eff'
    }

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
      const typeMap = { pending: 'info', running: 'warning', completed: 'success', failed: 'danger' }
      return typeMap[status] || 'info'
    }

    const getTaskStatusText = (status) => {
      const textMap = { pending: '等待', running: '执行中', completed: '完成', failed: '失败' }
      return textMap[status] || status
    }

    const getLogTagType = (type) => {
      const typeMap = { analyze: 'info', decide: 'warning', execute: 'success', complete: '' }
      return typeMap[type] || 'info'
    }

    const getLogTypeName = (type) => {
      const nameMap = { analyze: '分析', decide: '决策', execute: '执行', complete: '完成' }
      return nameMap[type] || type
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const analyzeTask = () => {
      if (!taskInput.value.trim()) return
      
      globalStatus.value = 'analyzing'
      showAnalysis.value = true
      
      addLog('analyze', '开始分析任务', taskInput.value)
      
      setTimeout(() => {
        const platforms = detectedPlatforms.value
        const tasks = analyzeTaskContent(taskInput.value)
        
        addLog('decide', '识别执行平台', `检测到 ${platforms.length} 个平台`)
        
        plannedPlatformAgents.value = createMultiAgentPlans(platforms, tasks)
        
        const totalAgents = Object.values(plannedPlatformAgents.value).flat().length
        addLog('decide', '分配 Agent', `共 ${totalAgents} 个 Agent 将参与执行`)
        
        taskSteps.value = generateTaskSteps(platforms, tasks)
        
        globalStatus.value = 'idle'
        ElMessage.success('任务分析完成，请查看 Agent 分配')
      }, 1500)
    }

    const analyzeTaskContent = (input) => {
      const tasks = []
      if (input.includes('发布') || input.includes('上架')) {
        tasks.push({ type: 'publish', name: '商品发布' })
      }
      if (input.includes('好评') || input.includes('评价')) {
        tasks.push({ type: 'review', name: '好评管理' })
      }
      if (input.includes('数据') || input.includes('订单')) {
        tasks.push({ type: 'data', name: '数据采集' })
      }
      return tasks.length > 0 ? tasks : [{ type: 'general', name: '通用任务' }]
    }

    const createMultiAgentPlans = (platforms, tasks) => {
      const plans = {}
      
      platforms.forEach(platform => {
        const agents = configuredAgents.value[platform] || []
        const activeAgents = agents.filter(a => a.active)
        
        if (activeAgents.length > 0) {
          plans[platform] = activeAgents.map((agent, index) => ({
            name: agent.name,
            color: agent.color,
            tasks: tasks.map(t => t.name)
          }))
        }
      })
      
      return plans
    }

    const generateTaskSteps = (platforms, tasks) => {
      const steps = []
      platforms.forEach(platform => {
        const agents = configuredAgents.value[platform] || []
        const activeAgents = agents.filter(a => a.active)
        
        activeAgents.forEach(agent => {
          tasks.forEach(task => {
            steps.push({
              name: `${agent.name} - ${task.name}`,
              agentName: agent.name,
              platform: platform
            })
          })
        })
      })
      return steps
    }

    const executeTask = async () => {
      if (!taskInput.value.trim()) return
      
      globalStatus.value = 'running'
      executingTasks.value = []
      executionSummary.value = []
      
      const totalAgents = Object.values(plannedPlatformAgents.value).flat().length
      addLog('execute', '任务执行开始', `共 ${totalAgents} 个 Agent 将并行执行`)
      
      Object.entries(plannedPlatformAgents.value).forEach(([platform, agents]) => {
        agents.forEach((agent, index) => {
          const task = {
            id: `task-${platform}-${index}`,
            agentName: agent.name,
            platform: platform,
            color: agent.color,
            tasks: agent.tasks,
            status: 'running',
            progress: 0,
            currentStep: 0,
            steps: generateExecutionSteps(agent)
          }
          executingTasks.value.push(task)
        })
      })
      
      await runParallelExecution()
    }

    const generateExecutionSteps = (agent) => {
      return [
        { name: '初始化', completed: false },
        { name: '加载技能', completed: false },
        { name: '导航页面', completed: false },
        { name: '执行任务', completed: false },
        { name: '验证结果', completed: false },
        { name: '完成', completed: false }
      ]
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
          
          addLog('complete', '所有任务执行完成', `成功执行 ${executingTasks.value.length} 个 Agent`)
          
          generateExecutionSummary()
          
          ElMessage.success('所有 Agent 任务执行完成！')
        }
      }, 1000)
    }

    const updateTaskProgress = async (task) => {
      await delay(800 + Math.random() * 400)
      
      if (task.currentStep > 0) {
        task.steps[task.currentStep - 1].completed = true
      }
      
      const progressMap = { 0: 5, 1: 20, 2: 40, 3: 70, 4: 90, 5: 100 }
      task.progress = progressMap[task.currentStep] || task.progress
      
      addLog('execute', task.agentName, `步骤 ${task.currentStep + 1}: ${task.steps[task.currentStep].name}`)
      
      task.currentStep++
      
      if (task.currentStep >= task.steps.length) {
        task.status = 'completed'
        task.progress = 100
        task.steps[task.steps.length - 1].completed = true
        addLog('complete', task.agentName, '任务执行成功')
      }
      
      currentStepIndex.value = Math.max(...executingTasks.value.map(t => t.currentStep))
    }

    const generateExecutionSummary = () => {
      executionSummary.value = executingTasks.value.map(task => ({
        agentName: task.agentName,
        platform: task.platform,
        tasks: task.tasks,
        color: task.color,
        status: task.status === 'completed' ? 'success' : 'failed',
        duration: `${(task.steps.length * 1.5).toFixed(1)}秒`
      }))
    }

    const addLog = (type, message, details = '') => {
      executionLogs.value.unshift({ type, message, details, timestamp: Date.now() })
      if (executionLogs.value.length > 200) {
        executionLogs.value = executionLogs.value.slice(0, 200)
      }
      nextTick(() => {
        if (logsListRef.value) logsListRef.value.scrollTop = 0
      })
    }

    const clearLogs = () => {
      executionLogs.value = []
    }

    const addAgent = (platform) => {
      newAgentForm.value.platform = platform
      newAgentForm.value.name = `${platform}-${(configuredAgents.value[platform]?.length || 0) + 1}`
      agentManagerTab.value = 'add'
    }

    const editAgent = (platform, index) => {
      ElMessage.info('编辑功能开发中')
    }

    const removeAgent = (platform, index) => {
      ElMessageBox.confirm('确定要删除此 Agent 吗？', '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        configuredAgents.value[platform].splice(index, 1)
        ElMessage.success('Agent 已删除')
      }).catch(() => {})
    }

    const submitNewAgent = () => {
      if (!newAgentForm.value.platform || !newAgentForm.value.name) {
        ElMessage.warning('请填写完整信息')
        return
      }
      
      const platform = newAgentForm.value.platform
      if (!configuredAgents.value[platform]) {
        configuredAgents.value[platform] = []
      }
      
      configuredAgents.value[platform].push({
        name: newAgentForm.value.name,
        color: getPlatformColor(platform),
        active: newAgentForm.value.active,
        description: newAgentForm.value.description
      })
      
      ElMessage.success('Agent 创建成功')
      resetNewAgentForm()
      agentManagerTab.value = 'list'
    }

    const resetNewAgentForm = () => {
      newAgentForm.value = { platform: '', name: '', description: '', active: true }
    }

    const useExample = (example) => {
      taskInput.value = example.input
      showExamples.value = false
      ElMessage.success('已加载示例指令')
    }

    const exportSummary = () => {
      const report = `# Agent 执行报告\n\n生成时间: ${new Date().toLocaleString('zh-CN')}\n\n## 执行摘要\n\n- 总任务数: ${executingTasks.value.length}\n- 成功: ${executingTasks.value.filter(t => t.status === 'completed').length}\n\n## 详细结果\n\n` + executionSummary.value.map((item, i) => 
        `${i + 1}. **${item.agentName}** (${item.platform})\n   - 任务: ${item.tasks.join(' + ')}\n   - 状态: ${item.status === 'success' ? '✅ 成功' : '❌ 失败'}\n   - 耗时: ${item.duration}\n`
      ).join('\n')
      
      const blob = new Blob([report], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agent-report-${Date.now()}.md`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('报告已导出')
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    onUnmounted(() => {
      if (executionTimer) clearInterval(executionTimer)
    })

    return {
      icons,
      globalStatus,
      taskInput,
      executingTasks,
      executionLogs,
      executionSummary,
      showAnalysis,
      showAgentManager,
      showExamples,
      logFilter,
      logsListRef,
      activeAnalysisTab,
      taskSteps,
      currentStepIndex,
      plannedPlatformAgents,
      completedTasks,
      configuredAgents,
      newAgentForm,
      agentManagerTab,
      taskExamples,
      totalAgents,
      activePlatforms,
      detectedPlatforms,
      estimatedAgents,
      filteredLogs,
      getPlatformColor,
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
      addAgent,
      editAgent,
      removeAgent,
      submitNewAgent,
      resetNewAgentForm,
      useExample,
      exportSummary
    }
  }
}
</script>

<style scoped>
.agent-console { padding: 20px; }
.page-header { margin-bottom: 30px; }
.page-header h2 { margin: 0 0 10px 0; font-size: 28px; color: #303133; }
.subtitle { color: #909399; margin: 0; font-size: 14px; }
.status-card, .stats-card { margin-bottom: 20px; }
.status-content, .stats-content { display: flex; align-items: center; gap: 15px; }
.status-indicator { position: relative; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.status-indicator.idle { background: #67c23a; }
.status-indicator.running { background: #409eff; }
.status-indicator.analyzing { background: #e6a23c; }
.status-indicator.completed { background: #909399; }
.pulse { position: absolute; width: 100%; height: 100%; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } }
.status-info, .stats-info { flex: 1; }
.status-label, .stats-label { font-size: 14px; color: #909399; }
.status-value, .stats-value { font-size: 24px; font-weight: bold; color: #303133; }
.stats-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
.stats-value { font-size: 20px; }
.input-card, .analysis-card, .execution-card, .logs-card, .summary-card { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.card-header h3 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 10px; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.input-tips { display: flex; gap: 10px; }
.input-buttons { display: flex; gap: 10px; }
.execution-list { max-height: 500px; overflow-y: auto; }
.execution-item { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
.execution-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.execution-info { display: flex; align-items: center; gap: 10px; }
.execution-details { display: flex; flex-direction: column; }
.execution-name { font-weight: bold; color: #303133; }
.execution-platform { font-size: 12px; color: #909399; }
.execution-progress { margin-bottom: 15px; }
.execution-steps { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; }
.step-item { display: flex; align-items: center; gap: 6px; min-width: 100px; padding: 6px 8px; background: white; border-radius: 4px; transition: all 0.3s; }
.step-item.active { background: #ecf5ff; border: 2px solid #409eff; }
.step-item.completed { background: #f0f9ff; }
.step-indicator { width: 20px; height: 20px; border-radius: 50%; background: #dcdfe6; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white; flex-shrink: 0; }
.step-item.active .step-indicator { background: #409eff; }
.step-item.completed .step-indicator { background: #67c23a; }
.step-content { flex: 1; min-width: 0; }
.step-name { font-size: 12px; color: #303133; font-weight: 500; }
.logs-list { max-height: 400px; overflow-y: auto; padding: 10px; background: #f5f7fa; border-radius: 4px; }
.log-item { display: flex; gap: 10px; padding: 8px; background: white; border-radius: 4px; margin-bottom: 8px; }
.log-time { font-size: 12px; color: #909399; white-space: nowrap; }
.log-type { white-space: nowrap; }
.log-content { flex: 1; }
.log-message { font-size: 14px; color: #303133; }
.log-details { font-size: 12px; color: #606266; margin-top: 3px; }
.platform-card { margin-bottom: 15px; }
.platform-header { display: flex; align-items: center; gap: 10px; }
.platform-badge { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.platform-info { flex: 1; }
.platform-name { font-weight: bold; color: #303133; }
.platform-count { font-size: 12px; color: #909399; }
.agent-list { margin-top: 10px; }
.agent-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px; }
.agent-info { flex: 1; }
.agent-name { font-weight: 500; color: #303133; font-size: 14px; }
.agent-tasks { font-size: 12px; color: #909399; }
.agent-config-card { margin-bottom: 15px; }
.agent-config-item { display: flex; align-items: center; gap: 10px; padding: 8px; }
.agent-config-info { flex: 1; }
.agent-config-name { font-weight: 500; color: #303133; }
.agent-config-status { margin-top: 3px; }
.example-card { margin-bottom: 15px; }
.example-content { margin-bottom: 10px; }
.example-title { font-weight: bold; color: #303133; margin-bottom: 5px; }
.example-desc { font-size: 14px; color: #606266; margin-bottom: 10px; }
.example-agents { display: flex; flex-wrap: wrap; gap: 5px; }
</style>
