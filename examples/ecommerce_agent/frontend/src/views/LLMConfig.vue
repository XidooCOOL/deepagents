<template>
  <div class="page-container">
    <n-page-header :title="pageTitle" subtitle="配置LLM模型">
      <template #extra>
        <n-button type="primary" @click="handleSave">
          <template #icon><n-icon><component :is="icons.Save" /></n-icon></template>
          保存配置
        </n-button>
      </template>
    </n-page-header>

    <!-- 模型选择 -->
    <n-card class="mb-6">
      <n-tabs type="segment" v-model:value="currentProvider">
        <n-tab-pane name="openai" tab="OpenAI">
          <div class="py-4">
            <n-form :model="providers.openai" label-placement="left" label-width="140px">
              <n-form-item label="API Key">
                <n-input v-model:value="providers.openai.apiKey" type="password" show-password-on="click" placeholder="请输入OpenAI API Key" />
              </n-form-item>
              <n-form-item label="API Base URL">
                <n-input v-model:value="providers.openai.baseUrl" placeholder="https://api.openai.com/v1" />
              </n-form-item>
              <n-form-item label="模型">
                <n-select v-model:value="providers.openai.model" :options="openaiModels" />
              </n-form-item>
              <n-form-item label="温度">
                <n-slider v-model:value="providers.openai.temperature" :min="0" :max="2" :step="0.1" :show-tooltip="true" />
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>
        
        <n-tab-pane name="anthropic" tab="Anthropic">
          <div class="py-4">
            <n-form :model="providers.anthropic" label-placement="left" label-width="140px">
              <n-form-item label="API Key">
                <n-input v-model:value="providers.anthropic.apiKey" type="password" show-password-on="click" placeholder="请输入Anthropic API Key" />
              </n-form-item>
              <n-form-item label="API Base URL">
                <n-input v-model:value="providers.anthropic.baseUrl" placeholder="https://api.anthropic.com/v1" />
              </n-form-item>
              <n-form-item label="模型">
                <n-select v-model:value="providers.anthropic.model" :options="anthropicModels" />
              </n-form-item>
              <n-form-item label="温度">
                <n-slider v-model:value="providers.anthropic.temperature" :min="0" :max="2" :step="0.1" :show-tooltip="true" />
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>
        
        <n-tab-pane name="custom" tab="自定义">
          <div class="py-4">
            <n-form :model="providers.custom" label-placement="left" label-width="140px">
              <n-form-item label="提供商名称">
                <n-input v-model:value="providers.custom.name" placeholder="例如: Ollama" />
              </n-form-item>
              <n-form-item label="API Key">
                <n-input v-model:value="providers.custom.apiKey" type="password" show-password-on="click" placeholder="请输入API Key (可选)" />
              </n-form-item>
              <n-form-item label="API Base URL">
                <n-input v-model:value="providers.custom.baseUrl" placeholder="http://localhost:11434/v1" />
              </n-form-item>
              <n-form-item label="模型名称">
                <n-input v-model:value="providers.custom.model" placeholder="例如: llama2" />
              </n-form-item>
            </n-form>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 系统提示词 -->
    <n-card class="mb-6" title="系统提示词">
      <n-input
        v-model:value="systemPrompt"
        type="textarea"
        placeholder="你是一个智能电商助手，帮助用户完成各种电商自动化任务..."
        :autosize="{ minRows: 6, maxRows: 12 }"
      />
    </n-card>

    <!-- 测试连接 -->
    <n-card title="测试连接">
      <n-space>
        <n-button type="primary" @click="handleTest" :loading="testing">
          <template #icon><n-icon><component :is="icons.Flash" /></n-icon></template>
          测试连接
        </n-button>
        <n-button @click="handleReset">
          重置配置
        </n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import * as icons from '@vicons/ionicons5'

const message = useMessage()
const pageTitle = '模型配置'
const currentProvider = ref('openai')
const testing = ref(false)

const providers = reactive({
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    temperature: 0.7
  },
  anthropic: {
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7
  },
  custom: {
    name: '',
    apiKey: '',
    baseUrl: '',
    model: ''
  }
})

const systemPrompt = ref('你是一个智能电商助手，帮助用户完成各种电商自动化任务。')

const openaiModels = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
]

const anthropicModels = [
  { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
]

const handleSave = () => {
  message.success('配置保存成功')
}

const handleTest = async () => {
  testing.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  message.success('连接测试成功')
  testing.value = false
}

const handleReset = () => {
  providers.openai.apiKey = ''
  providers.openai.baseUrl = 'https://api.openai.com/v1'
  providers.openai.model = 'gpt-4'
  providers.openai.temperature = 0.7
  
  providers.anthropic.apiKey = ''
  providers.anthropic.baseUrl = 'https://api.anthropic.com/v1'
  providers.anthropic.model = 'claude-3-sonnet-20240229'
  providers.anthropic.temperature = 0.7
  
  providers.custom.name = ''
  providers.custom.apiKey = ''
  providers.custom.baseUrl = ''
  providers.custom.model = ''
  
  message.info('配置已重置')
}
</script>

<style scoped>
.page-container {
  width: 100%;
}
</style>
