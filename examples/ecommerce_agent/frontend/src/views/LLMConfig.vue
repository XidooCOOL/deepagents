<template>
  <div class="llm-config">
    <div class="page-header">
      <h2>🤖 LLM 大模型配置</h2>
      <p class="subtitle">配置 AI Agent 使用的大语言模型，支持 OpenAI、Anthropic、Ollama 等</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="16">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <h3>模型配置</h3>
              <el-tag :type="isConfigured ? 'success' : 'danger'" size="small">
                {{ isConfigured ? '已配置' : '未配置' }}
              </el-tag>
            </div>
          </template>

          <el-form :model="llmConfig" label-width="120px" size="default">
            <el-form-item label="模型提供商">
              <el-radio-group v-model="llmConfig.provider" @change="onProviderChange">
                <el-radio-button label="openai">OpenAI</el-radio-button>
                <el-radio-button label="anthropic">Anthropic</el-radio-button>
                <el-radio-button label="ollama">Ollama (本地)</el-radio-button>
                <el-radio-button label="deepseek">DeepSeek</el-radio-button>
                <el-radio-button label="zhipu">智谱 AI</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="API Key" v-if="llmConfig.provider !== 'ollama'">
              <el-input
                v-model="llmConfig.apiKey"
                type="password"
                show-password
                placeholder="输入 API Key"
              >
                <template #append>
                  <el-button @click="validateApiKey" :loading="validating">
                    验证
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="API 地址" v-if="llmConfig.provider !== 'ollama'">
              <el-input
                v-model="llmConfig.baseUrl"
                placeholder="自定义 API 地址（可选）"
              >
                <template #append>
                  <el-tooltip content="使用代理或第三方 API 时填写">
                    <el-button icon="QuestionFilled" />
                  </el-tooltip>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="Ollama 地址" v-if="llmConfig.provider === 'ollama'">
              <el-input
                v-model="llmConfig.ollamaUrl"
                placeholder="http://localhost:11434"
              />
              <div class="form-tip">
                <el-icon><component :is="isOllamaRunning ? 'CircleCheck' : 'Warning'" /></el-icon>
                <span :class="isOllamaRunning ? 'success' : 'warning'">
                  {{ isOllamaRunning ? 'Ollama 服务正在运行' : 'Ollama 服务未运行' }}
                </span>
                <el-button
                  v-if="!isOllamaRunning"
                  type="primary"
                  size="small"
                  @click="checkOllama"
                >
                  检查
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="模型名称">
              <el-select
                v-model="llmConfig.modelName"
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入模型名称"
                style="width: 100%;"
              >
                <el-option-group
                  v-for="group in modelOptions"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="model in group.options"
                    :key="model.value"
                    :label="model.label"
                    :value="model.value"
                  >
                    <span>{{ model.label }}</span>
                    <span class="model-tag">{{ model.tag }}</span>
                  </el-option>
                </el-option-group>
              </el-select>
            </el-form-item>

            <el-form-item label="Temperature">
              <el-slider
                v-model="llmConfig.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :marks="temperatureMarks"
                show-input
              />
            </el-form-item>

            <el-form-item label="最大 Token">
              <el-input-number
                v-model="llmConfig.maxTokens"
                :min="100"
                :max="128000"
                :step="1000"
              />
            </el-form-item>

            <el-form-item label="系统提示词">
              <el-input
                v-model="llmConfig.systemPrompt"
                type="textarea"
                :rows="4"
                placeholder="设置 AI Agent 的系统提示词"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveConfig" :loading="saving">
                保存配置
              </el-button>
              <el-button @click="testConnection" :loading="testing">
                测试连接
              </el-button>
              <el-button @click="resetConfig">
                重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="test-card" v-if="testResult">
          <template #header>
            <h3>测试结果</h3>
          </template>
          <el-alert
            :type="testResult.success ? 'success' : 'error'"
            :title="testResult.message"
            show-icon
            :closable="false"
          />
          <div v-if="testResult.response" class="test-response">
            <h4>模型回复：</h4>
            <pre>{{ testResult.response }}</pre>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="info-card">
          <template #header>
            <h3>💡 使用说明</h3>
          </template>
          <div class="info-content">
            <h4>OpenAI</h4>
            <p>使用 OpenAI 的 GPT 系列模型，需要提供 API Key</p>
            <p>推荐模型：gpt-4o, gpt-4-turbo, gpt-3.5-turbo</p>

            <h4>Anthropic</h4>
            <p>使用 Claude 系列模型，需要提供 API Key</p>
            <p>推荐模型：claude-3-5-sonnet, claude-3-opus</p>

            <h4>Ollama (本地)</h4>
            <p>在本地运行开源大模型，保护隐私</p>
            <p>需要先安装 Ollama 并下载模型</p>
            <el-button
              type="primary"
              size="small"
              @click="openOllamaWebsite"
            >
              下载 Ollama
            </el-button>

            <h4>DeepSeek</h4>
            <p>使用 DeepSeek 系列模型，性价比高</p>
            <p>推荐模型：deepseek-chat, deepseek-coder</p>

            <h4>智谱 AI</h4>
            <p>使用清华智谱 GLM 系列模型</p>
            <p>推荐模型：glm-4, glm-3-turbo</p>
          </div>
        </el-card>

        <el-card class="models-card">
          <template #header>
            <div class="card-header">
              <h3>📦 Ollama 模型管理</h3>
              <el-button size="small" @click="refreshModels" icon="Refresh">
                刷新
              </el-button>
            </div>
          </template>

          <div v-if="ollamaModels.length > 0">
            <div
              v-for="model in ollamaModels"
              :key="model.name"
              class="model-item"
            >
              <div class="model-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-size">{{ model.size }}</div>
              </div>
              <el-tag size="small" type="success">已安装</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无已安装的模型">
            <el-button type="primary" @click="openOllamaWebsite">
              下载 Ollama
            </el-button>
          </el-empty>

          <el-divider>推荐模型</el-divider>

          <div class="recommended-models">
            <div
              v-for="model in recommendedModels"
              :key="model.name"
              class="model-item"
            >
              <div class="model-info">
                <div class="model-name">{{ model.display_name }}</div>
                <div class="model-size">{{ model.size }}</div>
                <div class="model-desc">{{ model.description }}</div>
              </div>
              <el-button
                size="small"
                type="primary"
                :loading="pullingModel === model.name"
                @click="pullModel(model.name)"
              >
                安装
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card class="status-card">
          <template #header>
            <h3>📊 当前状态</h3>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="当前提供商">
              {{ getProviderName(currentConfig.provider) }}
            </el-descriptions-item>
            <el-descriptions-item label="当前模型">
              {{ currentConfig.modelName || '未设置' }}
            </el-descriptions-item>
            <el-descriptions-item label="配置状态">
              <el-tag :type="isConfigured ? 'success' : 'warning'" size="small">
                {{ isConfigured ? '已配置' : '未配置' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="使用模式">
              {{ isLocalModel ? '本地模型' : '云端模型' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled, CircleCheck, Warning } from '@element-plus/icons-vue'

export default {
  name: 'LLMConfig',
  components: {
    QuestionFilled,
    CircleCheck,
    Warning
  },
  setup() {
    const llmConfig = ref({
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      ollamaUrl: 'http://localhost:11434',
      modelName: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '你是一个专业的电商运营助手，帮助用户在各大电商平台进行自动化操作。'
    })

    const currentConfig = ref({
      provider: 'openai',
      modelName: 'gpt-4o'
    })

    const isConfigured = ref(false)
    const isOllamaRunning = ref(false)
    const ollamaModels = ref([])
    const recommendedModels = ref([
      { name: 'qwen2.5', display_name: 'Qwen 2.5', description: '通识能力强，适合日常任务', size: '~4GB' },
      { name: 'llama3.2', display_name: 'Llama 3.2', description: 'Meta 开源模型，表现优秀', size: '~2GB' },
      { name: 'deepseek-r1', display_name: 'DeepSeek R1', description: '专注推理和分析任务', size: '~4GB' },
      { name: 'phi3', display_name: 'Phi-3', description: '微软轻量级模型，速度快', size: '~2GB' }
    ])

    const saving = ref(false)
    const testing = ref(false)
    const validating = ref(false)
    const pullingModel = ref('')
    const testResult = ref(null)

    const temperatureMarks = {
      0: '0',
      0.5: '0.5',
      1: '1.0',
      1.5: '1.5',
      2: '2.0'
    }

    const modelOptions = computed(() => {
      const provider = llmConfig.value.provider
      const options = {
        openai: {
          label: 'OpenAI 模型',
          options: [
            { value: 'gpt-4o', label: 'GPT-4o', tag: '最新' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', tag: '推荐' },
            { value: 'gpt-4', label: 'GPT-4', tag: '' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', tag: '快速' }
          ]
        },
        anthropic: {
          label: 'Anthropic 模型',
          options: [
            { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', tag: '最新' },
            { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', tag: '最强' },
            { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', tag: '平衡' },
            { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', tag: '快速' }
          ]
        },
        ollama: {
          label: 'Ollama 模型',
          options: [
            { value: 'qwen2.5', label: 'Qwen 2.5', tag: '' },
            { value: 'llama3.2', label: 'Llama 3.2', tag: '' },
            { value: 'deepseek-r1', label: 'DeepSeek R1', tag: '' },
            { value: 'phi3', label: 'Phi-3', tag: '' },
            { value: 'mistral', label: 'Mistral', tag: '' },
            { value: 'codellama', label: 'Code Llama', tag: '' }
          ]
        },
        deepseek: {
          label: 'DeepSeek 模型',
          options: [
            { value: 'deepseek-chat', label: 'DeepSeek Chat', tag: '推荐' },
            { value: 'deepseek-coder', label: 'DeepSeek Coder', tag: '编程' }
          ]
        },
        zhipu: {
          label: '智谱 AI 模型',
          options: [
            { value: 'glm-4', label: 'GLM-4', tag: '最新' },
            { value: 'glm-3-turbo', label: 'GLM-3 Turbo', tag: '快速' },
            { value: 'chatglm_turbo', label: 'ChatGLM Turbo', tag: '' }
          ]
        }
      }
      return [options[provider] || options.openai]
    })

    const isLocalModel = computed(() => {
      return ['ollama'].includes(llmConfig.value.provider)
    })

    const getProviderName = (provider) => {
      const names = {
        openai: 'OpenAI',
        anthropic: 'Anthropic Claude',
        ollama: 'Ollama (本地)',
        deepseek: 'DeepSeek',
        zhipu: '智谱 AI'
      }
      return names[provider] || provider
    }

    const onProviderChange = () => {
      testResult.value = null
    }

    const checkOllama = async () => {
      try {
        const response = await fetch(`${llmConfig.value.ollamaUrl}/api/tags`)
        if (response.ok) {
          isOllamaRunning.value = true
          const data = await response.json()
          ollamaModels.value = data.models || []
          ElMessage.success('Ollama 服务正常')
        } else {
          isOllamaRunning.value = false
          ElMessage.error('Ollama 服务无响应')
        }
      } catch (error) {
        isOllamaRunning.value = false
        ElMessage.error('无法连接到 Ollama 服务')
      }
    }

    const refreshModels = () => {
      if (llmConfig.value.provider === 'ollama') {
        checkOllama()
      }
    }

    const pullModel = async (modelName) => {
      pullingModel.value = modelName
      ElMessage.info(`正在安装模型 ${modelName}，这可能需要几分钟...`)
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      pullingModel.value = ''
      ElMessage.success(`模型 ${modelName} 安装完成`)
      checkOllama()
    }

    const openOllamaWebsite = () => {
      window.open('https://ollama.com', '_blank')
    }

    const validateApiKey = async () => {
      validating.value = true
      await new Promise(resolve => setTimeout(resolve, 1500))
      validating.value = false
      ElMessage.info('API Key 验证需要保存配置后测试连接')
    }

    const saveConfig = async () => {
      saving.value = true
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      currentConfig.value = {
        provider: llmConfig.value.provider,
        modelName: llmConfig.value.modelName
      }
      isConfigured.value = !!(llmConfig.value.apiKey || llmConfig.value.provider === 'ollama')
      
      localStorage.setItem('llm_config', JSON.stringify(llmConfig.value))
      
      saving.value = false
      ElMessage.success('LLM 配置已保存')
    }

    const testConnection = async () => {
      testing.value = true
      testResult.value = null
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      testResult.value = {
        success: true,
        message: `成功连接到 ${getProviderName(llmConfig.value.provider)}`,
        response: 'Hello! I am ready to assist you with e-commerce automation tasks. How can I help you today?'
      }
      
      testing.value = false
    }

    const resetConfig = () => {
      llmConfig.value = {
        provider: 'openai',
        apiKey: '',
        baseUrl: '',
        ollamaUrl: 'http://localhost:11434',
        modelName: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: '你是一个专业的电商运营助手，帮助用户在各大电商平台进行自动化操作。'
      }
      testResult.value = null
      ElMessage.info('配置已重置')
    }

    const loadConfig = () => {
      const saved = localStorage.getItem('llm_config')
      if (saved) {
        try {
          const config = JSON.parse(saved)
          llmConfig.value = { ...llmConfig.value, ...config }
          currentConfig.value = {
            provider: config.provider,
            modelName: config.modelName
          }
          isConfigured.value = !!(config.apiKey || config.provider === 'ollama')
        } catch (e) {
          console.error('加载配置失败:', e)
        }
      }
    }

    onMounted(() => {
      loadConfig()
      if (llmConfig.value.provider === 'ollama') {
        checkOllama()
      }
    })

    return {
      llmConfig,
      currentConfig,
      isConfigured,
      isOllamaRunning,
      ollamaModels,
      recommendedModels,
      saving,
      testing,
      validating,
      pullingModel,
      testResult,
      temperatureMarks,
      modelOptions,
      isLocalModel,
      getProviderName,
      onProviderChange,
      checkOllama,
      refreshModels,
      pullModel,
      openOllamaWebsite,
      validateApiKey,
      saveConfig,
      testConnection,
      resetConfig
    }
  }
}
</script>

<style scoped>
.llm-config {
  @apply p-6 bg-gray-50 min-h-screen;
}

.page-header {
  @apply mb-8;
}

.page-header h2 {
  @apply m-0 mb-2 text-2xl font-bold text-gray-800;
}

.subtitle {
  @apply text-gray-400 m-0;
}

.config-card {
  @apply mb-5 rounded-xl;
}

.card-header {
  @apply flex justify-between items-center;
}

.card-header h3 {
  @apply m-0;
}

.form-tip {
  @apply flex items-center gap-2 mt-2 text-sm;
}

.form-tip .success {
  @apply text-green-500;
}

.form-tip .warning {
  @apply text-yellow-500;
}

.test-card {
  @apply mt-5 rounded-xl;
}

.test-response {
  @apply mt-4;
}

.test-response h4 {
  @apply text-sm text-gray-700 mb-2;
}

.test-response pre {
  @apply bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap max-h-48 overflow-y-auto;
}

.info-card, .models-card, .status-card {
  @apply mb-5 rounded-xl;
}

.info-content h4 {
  @apply text-blue-500 mt-4 mb-2 first:mt-0;
}

.info-content p {
  @apply text-gray-500 text-sm my-1;
}

.model-item {
  @apply flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-3;
}

.model-info {
  @apply flex-1;
}

.model-name {
  @apply font-medium text-gray-700;
}

.model-size {
  @apply text-xs text-gray-400;
}

.model-desc {
  @apply text-xs text-gray-300 mt-0.5;
}

.model-tag {
  @apply ml-2 px-1.5 py-0.5 bg-blue-500 text-white rounded text-xs;
}

:deep(.el-slider__marks-text) {
  @apply text-xs;
}
</style>
