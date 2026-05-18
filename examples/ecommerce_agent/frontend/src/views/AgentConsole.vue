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
              <el-icon><component :is="icons.Box" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalAbilities }}</div>
              <div class="stats-label">能力库总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="input-card">
      <div class="card-header">
        <h3>📝 输入任务指令</h3>
        <div class="header-actions">
          <el-button type="warning" size="small" @click="showAbilityLibrary = true" icon="Box">能力库</el-button>
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
                          <div class="agent-abilities">
                            <el-tag v-for="ability in agent.abilities.slice(0, 2)" :key="ability" size="small" type="info" style="margin: 2px;">
                              {{ ability }}
                            </el-tag>
                            <el-tag v-if="agent.abilities.length > 2" size="small" type="warning">
                              +{{ agent.abilities.length - 2 }}
                            </el-tag>
                          </div>
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
                    <div class="execution-platform">{{ task.platform }}</div>
                  </div>
                </div>
                <div class="execution-actions">
                  <el-tag size="small" :type="getTaskStatusType(task.status)">
                    {{ getTaskStatusText(task.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="execution-abilities">
                <el-tag v-for="ability in task.abilities.slice(0, 3)" :key="ability" size="small" type="info" style="margin: 2px;">
                  {{ ability }}
                </el-tag>
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

    <el-dialog v-model="showAbilityLibrary" title="📦 能力库" width="80%">
      <el-tabs v-model="abilityLibraryTab">
        <el-tab-pane label="基础能力" name="basic">
          <el-row :gutter="20">
            <el-col :span="8" v-for="(ability, index) in abilityLibrary.basic" :key="index">
              <el-card class="ability-card" shadow="hover">
                <div class="ability-header">
                  <el-icon :size="24" :style="{ color: ability.color }"><component :is="ability.icon" /></el-icon>
                  <div class="ability-info">
                    <div class="ability-name">{{ ability.name }}</div>
                    <div class="ability-desc">{{ ability.description }}</div>
                  </div>
                </div>
                <div class="ability-tags">
                  <el-tag v-for="tag in ability.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <el-tab-pane label="技能" name="skills">
          <el-row :gutter="20">
            <el-col :span="8" v-for="(ability, index) in abilityLibrary.skills" :key="index">
              <el-card class="ability-card" shadow="hover">
                <div class="ability-header">
                  <el-icon :size="24" :style="{ color: ability.color }"><component :is="ability.icon" /></el-icon>
                  <div class="ability-info">
                    <div class="ability-name">{{ ability.name }}</div>
                    <div class="ability-desc">{{ ability.description }}</div>
                  </div>
                </div>
                <div class="ability-tags">
                  <el-tag v-for="tag in ability.tags" :key="tag" size="small" type="success">{{ tag }}</el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <el-tab-pane label="知识库" name="knowledge">
          <el-row :gutter="20">
            <el-col :span="8" v-for="(ability, index) in abilityLibrary.knowledge" :key="index">
              <el-card class="ability-card" shadow="hover">
                <div class="ability-header">
                  <el-icon :size="24" :style="{ color: ability.color }"><component :is="ability.icon" /></el-icon>
                  <div class="ability-info">
                    <div class="ability-name">{{ ability.name }}</div>
                    <div class="ability-desc">{{ ability.description }}</div>
                  </div>
                </div>
                <div class="ability-tags">
                  <el-tag v-for="tag in ability.tags" :key="tag" size="small" type="warning">{{ tag }}</el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="showAgentManager" title="🤖 Agent 管理" width="90%">
      <el-tabs v-model="agentManagerTab">
        <el-tab-pane label="已配置的 Agent" name="list">
          <el-row :gutter="20">
            <el-col :span="12" v-for="(agents, platform) in configuredAgents" :key="platform">
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
                  <el-avatar :size="40" :style="{ background: agent.color }">
                    {{ agent.name.charAt(agent.name.length - 1) }}
                  </el-avatar>
                  <div class="agent-config-info">
                    <div class="agent-config-name">{{ agent.name }}</div>
                    <div class="agent-config-status">
                      <el-switch v-model="agent.active" size="small" />
                      <el-tag v-if="agent.active" size="small" type="success">启用</el-tag>
                      <el-tag v-else size="small" type="info">禁用</el-tag>
                    </div>
                  </div>
                  <el-button-group>
                    <el-button size="small" @click="openAbilityConfig(platform, index)" icon="Box">能力</el-button>
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

    <el-dialog v-model="showAbilityConfig" title="⚙️ Agent 能力配置" width="80%">
      <div v-if="selectedAgent" class="ability-config">
        <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
          <template #title>
            <strong>{{ selectedAgent.name }}</strong> 的能力配置
          </template>
        </el-alert>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="ability-section-card">
              <template #header>
                <div class="section-header">
                  <span>📋 复制能力</span>
                  <el-button size="small" type="primary" @click="copyAbilities" icon="CopyDocument">从其他 Agent 复制</el-button>
                </div>
              </template>
              
              <div class="ability-list">
                <el-tag v-for="ability in selectedAgent.abilities" :key="ability" closable size="large" 
                        type="success" style="margin: 5px;" @close="removeAbility(ability)">
                  {{ ability }}
                </el-tag>
                <el-tag v-if="selectedAgent.abilities.length === 0" type="info">暂无能力，请从下方添加</el-tag>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="ability-section-card">
              <template #header>
                <span>🛠️ 添加能力</span>
              </template>
              
              <el-collapse v-model="addAbilityActive">
                <el-collapse-item title="基础能力" name="basic">
                  <div v-for="ability in abilityLibrary.basic" :key="ability.name" class="ability-option">
                    <el-checkbox :checked="selectedAgent.abilities.includes(ability.name)" 
                               @change="toggleAbility(ability.name)">
                      <div class="ability-option-content">
                        <strong>{{ ability.name }}</strong>
                        <div class="ability-option-desc">{{ ability.description }}</div>
                      </div>
                    </el-checkbox>
                  </div>
                </el-collapse-item>
                
                <el-collapse-item title="技能" name="skills">
                  <div v-for="ability in abilityLibrary.skills" :key="ability.name" class="ability-option">
                    <el-checkbox :checked="selectedAgent.abilities.includes(ability.name)"
                               @change="toggleAbility(ability.name)">
                      <div class="ability-option-content">
                        <strong>{{ ability.name }}</strong>
                        <div class="ability-option-desc">{{ ability.description }}</div>
                      </div>
                    </el-checkbox>
                  </div>
                </el-collapse-item>
                
                <el-collapse-item title="知识库" name="knowledge">
                  <div v-for="ability in abilityLibrary.knowledge" :key="ability.name" class="ability-option">
                    <el-checkbox :checked="selectedAgent.abilities.includes(ability.name)"
                               @change="toggleAbility(ability.name)">
                      <div class="ability-option-content">
                        <strong>{{ ability.name }}</strong>
                        <div class="ability-option-desc">{{ ability.description }}</div>
                      </div>
                    </el-checkbox>
                  </div>
                </el-collapse-item>
                
                <el-collapse-item title="自定义能力" name="custom">
                  <el-input v-model="customAbilityName" placeholder="输入自定义能力名称" style="margin-bottom: 10px;">
                    <template #append>
                      <el-button @click="addCustomAbility" icon="Plus">添加</el-button>
                    </template>
                  </el-input>
                </el-collapse-item>
              </el-collapse>
            </el-card>
          </el-col>
        </el-row>
        
        <div slot="footer">
          <el-button @click="showAbilityConfig = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showCopyAbilities" title="📋 从其他 Agent 复制能力" width="50%">
      <el-form label-width="120px">
        <el-form-item label="选择源 Agent">
          <el-select v-model="copySourceAgent" placeholder="选择 Agent" @change="onSelectCopySource">
            <el-option-group v-for="(agents, platform) in configuredAgents" :key="platform" :label="platform">
              <el-option v-for="agent in agents" :key="agent.name" :label="agent.name" :value="agent.name"
                        :disabled="agent.name === selectedAgent?.name" />
            </el-option-group>
          </el-select>
        </el-form-item>
        
        <el-form-item label="该 Agent 的能力">
          <el-tag v-for="ability in copySourceAbilities" :key="ability" size="large" type="success" style="margin: 5px;">
            {{ ability }}
          </el-tag>
          <el-tag v-if="copySourceAbilities.length === 0" type="info">该 Agent 暂无能力</el-tag>
        </el-form-item>
      </el-form>
      
      <div slot="footer">
        <el-button @click="showCopyAbilities = false">取消</el-button>
        <el-button type="primary" @click="confirmCopyAbilities" :disabled="!copySourceAgent">复制所有能力</el-button>
      </div>
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
            <el-table-column prop="abilities" label="使用能力" min-width="200">
              <template #default="scope">
                <el-tag v-for="ability in scope.row.abilities.slice(0, 3)" :key="ability" size="small" type="info" style="margin: 2px;">
                  {{ ability }}
                </el-tag>
                <el-tag v-if="scope.row.abilities.length > 3" size="small" type="warning">
                  +{{ scope.row.abilities.length - 3 }}
                </el-tag>
              </template>
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
    const showAbilityLibrary = ref(false)
    const showAbilityConfig = ref(false)
    const showExamples = ref(false)
    const showCopyAbilities = ref(false)
    const logFilter = ref('all')
    const logsListRef = ref(null)
    const activeAnalysisTab = ref('agents')
    const agentManagerTab = ref('list')
    const abilityLibraryTab = ref('basic')
    const taskSteps = ref([])
    const currentStepIndex = ref(-1)
    const plannedPlatformAgents = ref({})
    const completedTasks = ref(0)
    const selectedAgent = ref(null)
    const selectedAgentKey = ref({ platform: '', index: 0 })
    const addAbilityActive = ref('basic')
    const customAbilityName = ref('')
    const copySourceAgent = ref('')
    const copySourceAbilities = ref([])

    let executionTimer = null

    const abilityLibrary = ref({
      basic: [
        { name: '浏览器自动化', description: '控制浏览器执行网页操作', icon: 'Monitor', color: '#409eff', tags: ['点击', '输入', '导航', '截图'] },
        { name: 'DOM元素定位', description: '智能识别和定位页面元素', icon: 'Aim', color: '#67c23a', tags: ['CSS', 'XPath', '智能匹配'] },
        { name: '自然语言理解', description: '理解用户自然语言指令', icon: 'ChatLineRound', color: '#e6a23c', tags: ['意图识别', '实体提取'] },
        { name: '反检测机制', description: '模拟人类行为避免被检测', icon: 'Shield', color: '#f56c6c', tags: ['随机延迟', '行为模拟'] }
      ],
      skills: [
        { name: '商品发布技能', description: '在各平台发布商品的完整流程', icon: 'Goods', color: '#409eff', tags: ['抖音', '拼多多', '淘宝'] },
        { name: '好评管理技能', description: '自动回复和管理好评', icon: 'ChatDotRound', color: '#67c23a', tags: ['回复', '追评', '分析'] },
        { name: '数据采集技能', description: '采集订单和销售数据', icon: 'DataAnalysis', color: '#e6a23c', tags: ['订单', '销售', '推广'] },
        { name: '订单处理技能', description: '处理订单和物流信息', icon: 'Box', color: '#909399', tags: ['发货', '退款', '售后'] }
      ],
      knowledge: [
        { name: '平台规则知识库', description: '各平台的运营规则和规范', icon: 'Document', color: '#409eff', tags: ['抖音规则', '拼多多规则', '淘宝规则'] },
        { name: '商品知识库', description: '商品信息管理和优化建议', icon: 'Collection', color: '#67c23a', tags: ['标题优化', '描述生成'] },
        { name: '行业经验库', description: '电商运营最佳实践', icon: 'Star', color: '#e6a23c', tags: ['运营技巧', '案例分析'] }
      ]
    })

    const configuredAgents = ref({
      '抖音': [
        { name: '抖音-A旗舰店', color: '#fe2c55', active: true, description: '主旗舰店', 
          abilities: ['浏览器自动化', '商品发布技能', '好评管理技能'] },
        { name: '抖音-B专卖店', color: '#ff6b9d', active: true, description: '专卖店',
          abilities: ['浏览器自动化', '好评管理技能', '自然语言理解'] },
        { name: '抖音-C专营店', color: '#c94b6d', active: false, description: '专营店',
          abilities: [] }
      ],
      '拼多多': [
        { name: '拼多多-旗舰店', color: '#ee4d2e', active: true, description: '主旗舰店',
          abilities: ['浏览器自动化', '商品发布技能', '数据采集技能'] }
      ],
      '淘宝': [
        { name: '淘宝-官方店', color: '#ff5000', active: true, description: '官方店铺',
          abilities: ['浏览器自动化', '商品发布技能', '订单处理技能'] }
      ],
      '京东': [
        { name: '京东-自营店', color: '#c9190e', active: false, description: '自营店铺',
          abilities: [] }
      ]
    })

    const newAgentForm = ref({
      platform: '',
      name: '',
      description: '',
      active: true,
      abilities: []
    })

    const taskExamples = [
      {
        title: '多平台商品发布',
        description: '使用多个 Agent 同时发布商品',
        agents: ['抖音-A旗舰店', '抖音-B专卖店', '拼多多-旗舰店'],
        input: '帮我把新品发布到抖音A、抖音B和拼多多'
      },
      {
        title: '好评管理',
        description: '让有好评管理技能的 Agent 处理好评',
        agents: ['抖音-A旗舰店', '抖音-B专卖店'],
        input: '用抖音A和抖音B处理所有待回复的好评'
      }
    ]

    const totalAgents = computed(() => {
      return Object.values(configuredAgents.value).flat().filter(a => a.active).length
    })

    const totalAbilities = computed(() => {
      return abilityLibrary.value.basic.length + abilityLibrary.value.skills.length + abilityLibrary.value.knowledge.length
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
      const colorMap = { '抖音': '#fe2c55', '拼多多': '#ee4d2e', '淘宝': '#ff5000', '京东': '#c9190e' }
      return colorMap[platform] || '#409eff'
    }

    const getStatusText = (status) => {
      const statusMap = { idle: '空闲', running: '执行中', analyzing: '分析中', completed: '已完成' }
      return statusMap[status] || status
    }

    const getPlatformTagType = (platform) => {
      const typeMap = { '抖音': '', '拼多多': 'warning', '淘宝': 'success', '京东': 'danger' }
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

    const openAbilityConfig = (platform, index) => {
      selectedAgent.value = configuredAgents.value[platform][index]
      selectedAgentKey.value = { platform, index }
      showAbilityConfig.value = true
    }

    const toggleAbility = (abilityName) => {
      if (!selectedAgent.value) return
      const index = selectedAgent.value.abilities.indexOf(abilityName)
      if (index === -1) {
        selectedAgent.value.abilities.push(abilityName)
      } else {
        selectedAgent.value.abilities.splice(index, 1)
      }
    }

    const removeAbility = (ability) => {
      if (!selectedAgent.value) return
      const index = selectedAgent.value.abilities.indexOf(ability)
      if (index !== -1) {
        selectedAgent.value.abilities.splice(index, 1)
      }
    }

    const addCustomAbility = () => {
      if (!customAbilityName.value.trim() || !selectedAgent.value) return
      if (!selectedAgent.value.abilities.includes(customAbilityName.value.trim())) {
        selectedAgent.value.abilities.push(customAbilityName.value.trim())
        customAbilityName.value = ''
        ElMessage.success('自定义能力添加成功')
      }
    }

    const copyAbilities = () => {
      showCopyAbilities.value = true
      copySourceAgent.value = ''
      copySourceAbilities.value = []
    }

    const onSelectCopySource = () => {
      for (const platform of Object.keys(configuredAgents.value)) {
        const agent = configuredAgents.value[platform].find(a => a.name === copySourceAgent.value)
        if (agent) {
          copySourceAbilities.value = [...agent.abilities]
          break
        }
      }
    }

    const confirmCopyAbilities = () => {
      if (!copySourceAgent.value || !selectedAgent.value) return
      selectedAgent.value.abilities = [...copySourceAbilities.value]
      showCopyAbilities.value = false
      ElMessage.success(`已从 ${copySourceAgent.value} 复制 ${copySourceAbilities.value.length} 个能力`)
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
        
        const totalAgentsCount = Object.values(plannedPlatformAgents.value).flat().length
        addLog('decide', '分配 Agent', `共 ${totalAgentsCount} 个 Agent 将参与执行`)
        
        taskSteps.value = generateTaskSteps(platforms, tasks)
        
        globalStatus.value = 'idle'
        ElMessage.success('任务分析完成，请查看 Agent 分配')
      }, 1500)
    }

    const analyzeTaskContent = (input) => {
      const tasks = []
      if (input.includes('发布') || input.includes('上架')) tasks.push({ type: 'publish', name: '商品发布' })
      if (input.includes('好评') || input.includes('评价')) tasks.push({ type: 'review', name: '好评管理' })
      if (input.includes('数据') || input.includes('订单')) tasks.push({ type: 'data', name: '数据采集' })
      return tasks.length > 0 ? tasks : [{ type: 'general', name: '通用任务' }]
    }

    const createMultiAgentPlans = (platforms, tasks) => {
      const plans = {}
      platforms.forEach(platform => {
        const agents = configuredAgents.value[platform] || []
        const activeAgents = agents.filter(a => a.active)
        if (activeAgents.length > 0) {
          plans[platform] = activeAgents.map(agent => ({
            name: agent.name,
            color: agent.color,
            abilities: [...agent.abilities],
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
            steps.push({ name: `${agent.name} - ${task.name}`, agentName: agent.name, platform: platform })
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
      
      const totalAgentsCount = Object.values(plannedPlatformAgents.value).flat().length
      addLog('execute', '任务执行开始', `共 ${totalAgentsCount} 个 Agent 将并行执行`)
      
      Object.entries(plannedPlatformAgents.value).forEach(([platform, agents]) => {
        agents.forEach((agent, index) => {
          const task = {
            id: `task-${platform}-${index}`,
            agentName: agent.name,
            platform: platform,
            color: agent.color,
            abilities: [...agent.abilities],
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
        { name: '加载能力', completed: false },
        { name: '加载技能', completed: false },
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
        abilities: task.abilities,
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
        description: newAgentForm.value.description,
        abilities: []
      })
      
      ElMessage.success('Agent 创建成功')
      resetNewAgentForm()
      agentManagerTab.value = 'list'
    }

    const resetNewAgentForm = () => {
      newAgentForm.value = { platform: '', name: '', description: '', active: true, abilities: [] }
    }

    const useExample = (example) => {
      taskInput.value = example.input
      showExamples.value = false
      ElMessage.success('已加载示例指令')
    }

    const exportSummary = () => {
      const report = `# Agent 执行报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 执行摘要

- 总任务数: ${executingTasks.value.length}
- 成功: ${executingTasks.value.filter(t => t.status === 'completed').length}

## 详细结果

` + executionSummary.value.map((item, i) => 
        `${i + 1}. **${item.agentName}** (${item.platform})
   - 使用能力: ${item.abilities.join(', ') || '无'}
   - 状态: ${item.status === 'success' ? '✅ 成功' : '❌ 失败'}
   - 耗时: ${item.duration}
`
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
      showAbilityLibrary,
      showAbilityConfig,
      showExamples,
      showCopyAbilities,
      logFilter,
      logsListRef,
      activeAnalysisTab,
      taskSteps,
      currentStepIndex,
      plannedPlatformAgents,
      completedTasks,
      configuredAgents,
      abilityLibrary,
      newAgentForm,
      agentManagerTab,
      abilityLibraryTab,
      taskExamples,
      totalAgents,
      totalAbilities,
      detectedPlatforms,
      estimatedAgents,
      filteredLogs,
      selectedAgent,
      addAbilityActive,
      customAbilityName,
      copySourceAgent,
      copySourceAbilities,
      getPlatformColor,
      getStatusText,
      getPlatformTagType,
      getTaskStatusType,
      getTaskStatusText,
      getLogTagType,
      getLogTypeName,
      formatTime,
      openAbilityConfig,
      toggleAbility,
      removeAbility,
      addCustomAbility,
      copyAbilities,
      onSelectCopySource,
      confirmCopyAbilities,
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
.agent-console {
  @apply p-6 bg-gray-50 dark:bg-neutral-900 min-h-screen;
}

.page-header {
  @apply mb-8;
}

.page-header h2 {
  @apply m-0 mb-2 text-2xl font-bold text-gray-800 dark:text-neutral-100;
}

.subtitle {
  @apply text-gray-400 dark:text-neutral-400 m-0 text-sm;
}

.status-card, .stats-card {
  @apply mb-5 rounded-xl;
}

.status-content, .stats-content {
  @apply flex items-center gap-4;
}

.status-indicator {
  @apply relative w-12 h-12 rounded-full flex items-center justify-center;
}

.status-indicator.idle { @apply bg-green-500; }
.status-indicator.running { @apply bg-blue-500; }
.status-indicator.analyzing { @apply bg-yellow-500; }
.status-indicator.completed { @apply bg-gray-400 dark:bg-neutral-600; }

.pulse {
  @apply absolute w-full h-full rounded-full;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
}

.status-info, .stats-info {
  @apply flex-1;
}

.status-label, .stats-label {
  @apply text-sm text-gray-400 dark:text-neutral-400;
}

.status-value, .stats-value {
  @apply text-2xl font-bold text-gray-800 dark:text-neutral-100;
}

.stats-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl;
}

.stats-value {
  @apply text-xl;
}

.input-card, .analysis-card, .execution-card, .logs-card, .summary-card {
  @apply mb-5 rounded-xl;
}

.card-header {
  @apply flex justify-between items-center mb-4;
}

.card-header h3 {
  @apply m-0 text-lg;
}

.header-actions {
  @apply flex gap-3;
}

.input-actions {
  @apply flex justify-between items-center mt-4;
}

.input-tips, .input-buttons {
  @apply flex gap-3;
}

.execution-list {
  @apply max-h-128 overflow-y-auto;
}

.execution-item {
  @apply bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg mb-4;
}

.execution-header {
  @apply flex justify-between items-center mb-3;
}

.execution-info {
  @apply flex items-center gap-3;
}

.execution-details {
  @apply flex flex-col;
}

.execution-name {
  @apply font-bold text-gray-700 dark:text-neutral-200;
}

.execution-platform {
  @apply text-xs text-gray-400 dark:text-neutral-400;
}

.execution-abilities {
  @apply flex flex-wrap gap-1 mb-3;
}

.execution-progress {
  @apply mb-3;
}

.execution-steps {
  @apply flex gap-2 overflow-x-auto py-3;
}

.step-item {
  @apply flex items-center gap-1.5 min-w-24 p-1.5 bg-white dark:bg-neutral-700 rounded transition-all duration-300;
}

.step-item.active {
  @apply bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500;
}

.step-item.completed {
  @apply bg-blue-50 dark:bg-blue-900/20;
}

.step-indicator {
  @apply w-5 h-5 rounded-full bg-gray-300 dark:bg-neutral-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0;
}

.step-item.active .step-indicator {
  @apply bg-blue-500;
}

.step-item.completed .step-indicator {
  @apply bg-green-500;
}

.step-content {
  @apply flex-1 min-w-0;
}

.step-name {
  @apply text-xs text-gray-700 dark:text-neutral-200 font-medium;
}

.logs-list {
  @apply max-h-100 overflow-y-auto p-3 bg-gray-50 dark:bg-neutral-800 rounded;
}

.log-item {
  @apply flex gap-3 p-2 bg-white dark:bg-neutral-700 rounded mb-2;
}

.log-time {
  @apply text-xs text-gray-400 dark:text-neutral-400 whitespace-nowrap;
}

.log-type {
  @apply whitespace-nowrap;
}

.log-content {
  @apply flex-1;
}

.log-message {
  @apply text-sm text-gray-700 dark:text-neutral-200;
}

.log-details {
  @apply text-xs text-gray-500 dark:text-neutral-400 mt-1;
}

.platform-card {
  @apply mb-4 rounded-xl;
}

.platform-header {
  @apply flex items-center gap-3;
}

.platform-badge {
  @apply w-8 h-8 rounded flex items-center justify-center text-white font-bold;
}

.platform-info {
  @apply flex-1;
}

.platform-name {
  @apply font-bold text-gray-700 dark:text-neutral-200;
}

.platform-count {
  @apply text-xs text-gray-400 dark:text-neutral-400;
}

.agent-list {
  @apply mt-3;
}

.agent-item {
  @apply flex items-center gap-3 p-2 bg-gray-50 dark:bg-neutral-800 rounded-lg mb-2;
}

.agent-info {
  @apply flex-1;
}

.agent-name {
  @apply font-medium text-gray-700 dark:text-neutral-200 text-sm;
}

.agent-abilities {
  @apply flex flex-wrap gap-1 mt-1;
}

.agent-config-card {
  @apply mb-4 rounded-xl;
}

.agent-config-item {
  @apply flex items-center gap-3 p-3 border-b border-gray-100 dark:border-neutral-700;
}

.agent-config-info {
  @apply flex-1;
}

.agent-config-name {
  @apply font-medium text-gray-700 dark:text-neutral-200;
}

.agent-config-status {
  @apply flex items-center gap-2 mt-1;
}

.ability-card {
  @apply mb-4 rounded-xl;
}

.ability-header {
  @apply flex items-center gap-3 mb-3;
}

.ability-info {
  @apply flex-1;
}

.ability-name {
  @apply font-bold text-gray-700 dark:text-neutral-200;
}

.ability-desc {
  @apply text-xs text-gray-400 dark:text-neutral-400 mt-1;
}

.ability-tags {
  @apply flex flex-wrap gap-1;
}

.ability-section-card {
  @apply h-full rounded-xl;
}

.section-header {
  @apply flex justify-between items-center;
}

.ability-list {
  @apply flex flex-wrap gap-2 min-h-24 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg;
}

.ability-option {
  @apply p-3 border-b border-gray-100 dark:border-neutral-700 last:border-0;
}

.ability-option:last-child {
  @apply border-0;
}

.ability-option-content {
  @apply inline-block;
}

.ability-option-desc {
  @apply text-xs text-gray-400 dark:text-neutral-400 mt-1;
}

.example-card {
  @apply mb-4 rounded-xl;
}

.example-content {
  @apply mb-3;
}

.example-title {
  @apply font-bold text-gray-700 dark:text-neutral-200 mb-1;
}

.example-desc {
  @apply text-sm text-gray-500 dark:text-neutral-400 mb-3;
}

.example-agents {
  @apply flex flex-wrap gap-1;
}
</style>
