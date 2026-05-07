<template>
  <div class="webhook-page">
    <div class="page-header">
      <h2>🔔 Webhook 管理中心</h2>
      <p class="subtitle">统一管理多平台 Webhook 通知配置和消息模板</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="Webhook 配置" name="webhooks">
        <div class="toolbar">
          <el-button type="primary" @click="openAddDialog" icon="Plus">添加 Webhook</el-button>
          <el-button @click="loadWebhooks" icon="Refresh">刷新</el-button>
        </div>

        <el-table :data="webhooks" v-loading="loading" stripe border>
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column label="平台" width="120">
            <template #default="scope">
              <el-tag :color="getPlatformColor(scope.row.platform)">
                {{ getPlatformLabel(scope.row.platform) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="url" label="URL" min-width="200" show-overflow-tooltip />
          <el-table-column label="订阅事件" min-width="200">
            <template #default="scope">
              <el-tag v-for="evt in scope.row.events?.slice(0, 3)" :key="evt" size="small" style="margin: 2px;">
                {{ getEventLabel(evt) }}
              </el-tag>
              <el-tag v-if="scope.row.events?.length > 3" size="small">+{{ scope.row.events.length - 3 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.is_active ? 'success' : 'info'" size="small">
                {{ scope.row.is_active ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" @click="editWebhook(scope.row)" icon="Edit">编辑</el-button>
              <el-button size="small" type="success" @click="testWebhook(scope.row)" icon="View">测试</el-button>
              <el-button size="small" type="danger" @click="deleteWebhook(scope.row)" icon="Delete">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="消息模板" name="templates">
        <div class="toolbar">
          <el-select v-model="templateFilter.platform" placeholder="筛选平台" clearable style="width: 150px;">
            <el-option label="飞书" value="feishu" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="企微" value="wecom" />
          </el-select>
          <el-select v-model="templateFilter.type" placeholder="筛选类型" clearable style="width: 150px;">
            <el-option v-for="t in templateTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <el-button type="primary" @click="openTemplateDialog" icon="Plus">创建模板</el-button>
          <el-button @click="initDefaultTemplates" icon="Download">初始化默认模板</el-button>
        </div>

        <el-table :data="filteredTemplates" v-loading="loadingTemplates" stripe border>
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column label="平台" width="100">
            <template #default="scope">
              <el-tag :color="getPlatformColor(scope.row.platform)" size="small">
                {{ getPlatformLabel(scope.row.platform) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="scope">
              <el-tag type="info" size="small">{{ getTypeLabel(scope.row.template_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="content" label="内容预览" min-width="250" show-overflow-tooltip />
          <el-table-column label="默认" width="80">
            <template #default="scope">
              <el-tag v-if="scope.row.is_default" type="success" size="small">是</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" @click="editTemplate(scope.row)" icon="Edit">编辑</el-button>
              <el-button size="small" @click="previewTemplate(scope.row)" icon="View">预览</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="发送日志" name="history">
        <el-card>
          <template #header>
            <span>发送历史</span>
          </template>
          <el-table :data="sendHistory" stripe>
            <el-table-column prop="event_type" label="事件类型" width="150">
              <template #default="scope">
                <el-tag size="small">{{ getEventLabel(scope.row.event_type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="消息内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="180" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showWebhookDialog" :title="editingWebhook ? '编辑 Webhook' : '添加 Webhook'" width="600px">
      <el-form :model="webhookForm" label-width="100px" label-position="left">
        <el-form-item label="名称" required>
          <el-input v-model="webhookForm.name" placeholder="例如: 任务告警群" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="webhookForm.platform" style="width: 100%;">
            <el-option label="飞书" value="feishu" />
            <el-option label="钉钉" value="dingtalk" />
            <el-option label="企业微信" value="wecom" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Webhook URL" required>
          <el-input v-model="webhookForm.url" placeholder="例如: https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
        </el-form-item>
        <el-form-item label="签名密钥">
          <el-input v-model="webhookForm.secret" type="password" show-password placeholder="可选，用于签名验证" />
        </el-form-item>
        <el-form-item label="订阅事件" required>
          <el-checkbox-group v-model="webhookForm.events">
            <el-row :gutter="10">
              <el-col :span="8" v-for="evt in eventOptions" :key="evt.value">
                <el-checkbox :label="evt.value">{{ evt.label }}</el-checkbox>
              </el-col>
            </el-row>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="高级设置">
          <el-collapse>
            <el-collapse-item title="高级选项">
              <el-form-item label="重试次数">
                <el-input-number v-model="webhookForm.retry_times" :min="0" :max="10" />
              </el-form-item>
              <el-form-item label="超时时间">
                <el-input-number v-model="webhookForm.timeout" :min="1" :max="60" />
                <span style="margin-left: 10px;">秒</span>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showWebhookDialog = false">取消</el-button>
        <el-button type="primary" @click="saveWebhook" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTemplateDialog" :title="editingTemplate ? '编辑模板' : '创建模板'" width="700px">
      <el-form :model="templateForm" label-width="100px" label-position="left">
        <el-form-item label="名称" required>
          <el-input v-model="templateForm.name" placeholder="例如: 任务失败告警" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="平台" required>
              <el-select v-model="templateForm.platform" style="width: 100%;">
                <el-option label="飞书" value="feishu" />
                <el-option label="钉钉" value="dingtalk" />
                <el-option label="企业微信" value="wecom" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模板类型" required>
              <el-select v-model="templateForm.template_type" style="width: 100%;">
                <el-option v-for="t in templateTypes" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="标题">
          <el-input v-model="templateForm.title" placeholder="消息标题，支持变量 {task_name}" />
        </el-form-item>
        <el-form-item label="内容模板" required>
          <el-input v-model="templateForm.content" type="textarea" :rows="6" placeholder="支持变量占位符: {task_name}, {error}, {store_name}" />
          <div class="form-tip">
            使用 <code>{变量名}</code> 格式定义占位符，实际发送时会被替换
          </div>
        </el-form-item>
        <el-form-item label="变量定义">
          <div v-for="(v, idx) in templateForm.variables" :key="idx" class="variable-item">
            <el-input v-model="v.name" placeholder="变量名" style="width: 120px;" />
            <el-input v-model="v.label" placeholder="中文标签" style="width: 120px;" />
            <el-select v-model="v.type" style="width: 100px;">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
            </el-select>
            <el-button type="danger" icon="Delete" circle @click="removeVariable(idx)" />
          </div>
          <el-button type="primary" plain @click="addVariable" icon="Plus">添加变量</el-button>
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="templateForm.is_default" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTemplateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :loading="savingTemplate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPreviewDialog" title="模板预览" width="500px">
      <el-form label-width="80px" v-if="previewData">
        <el-form-item v-for="(v, key) in previewData.variables" :key="key" :label="key">
          <el-input v-model="previewData.variables[key]" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doPreview">预览</el-button>
        </el-form-item>
      </el-form>
      <el-divider v-if="previewResult" />
      <div v-if="previewResult" class="preview-result">
        <h4>标题</h4>
        <div>{{ previewResult.title }}</div>
        <h4>内容</h4>
        <div style="white-space: pre-wrap;">{{ previewResult.content }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const API_BASE = '/api/webhooks'

const activeTab = ref('webhooks')
const loading = ref(false)
const loadingTemplates = ref(false)
const saving = ref(false)
const savingTemplate = ref(false)

const webhooks = ref<any[]>([])
const templates = ref<any[]>([])
const sendHistory = ref<any[]>([])

const showWebhookDialog = ref(false)
const showTemplateDialog = ref(false)
const showPreviewDialog = ref(false)

const editingWebhook = ref<any>(null)
const editingTemplate = ref<any>(null)
const previewData = ref<any>(null)
const previewResult = ref<any>(null)

const templateFilter = reactive({
  platform: '',
  type: ''
})

const webhookForm = reactive({
  name: '',
  platform: 'feishu',
  url: '',
  secret: '',
  events: [] as string[],
  retry_times: 3,
  timeout: 10
})

const templateForm = reactive({
  name: '',
  template_type: 'task_alert',
  platform: 'feishu',
  title: '',
  content: '',
  variables: [] as any[],
  is_default: false
})

const eventOptions = ref<any[]>([])
const templateTypes = ref<any[]>([])

const filteredTemplates = computed(() => {
  let result = templates.value
  if (templateFilter.platform) {
    result = result.filter(t => t.platform === templateFilter.platform)
  }
  if (templateFilter.type) {
    result = result.filter(t => t.template_type === templateFilter.type)
  }
  return result
})

const platformColors: Record<string, string> = {
  feishu: '#2862D4',
  dingtalk: '#1677FF',
  wecom: '#07C160',
  custom: '#909399'
}

const getPlatformLabel = (platform: string) => {
  const labels: Record<string, string> = { feishu: '飞书', dingtalk: '钉钉', wecom: '企微', custom: '自定义' }
  return labels[platform] || platform
}

const getPlatformColor = (platform: string) => platformColors[platform] || '#909399'

const getEventLabel = (event: string) => {
  const eventLabels: Record<string, string> = {
    'task:created': '任务创建', 'task:started': '任务开始', 'task:progress': '任务进度',
    'task:completed': '任务完成', 'task:failed': '任务失败', 'store:login': '店铺登录',
    'store:logout': '店铺登出', 'store:error': '店铺错误', 'system:warning': '系统警告',
    'system:error': '系统错误', 'resource:high': '资源过高', 'product:published': '商品发布',
    'daily:report': '每日报告'
  }
  return eventLabels[event] || event
}

const getTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    task_alert: '任务告警', task_completed: '任务完成', daily_report: '每日报告',
    product_published: '商品发布', resource_alert: '资源告警', store_alert: '店铺告警'
  }
  return typeLabels[type] || type
}

const loadWebhooks = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}`)
    webhooks.value = res.data.webhooks || []
  } catch (e) {
    console.error('加载 Webhook 失败', e)
  }
  loading.value = false
}

const loadTemplates = async () => {
  loadingTemplates.value = true
  try {
    const res = await axios.get(`${API_BASE}/templates`)
    templates.value = res.data.templates || []
  } catch (e) {
    console.error('加载模板失败', e)
  }
  loadingTemplates.value = false
}

const loadOptions = async () => {
  try {
    const [eventsRes, typesRes] = await Promise.all([
      axios.get(`${API_BASE}/events`),
      axios.get(`${API_BASE}/templates/types`)
    ])
    eventOptions.value = eventsRes.data.events || []
    templateTypes.value = typesRes.data.types || []
  } catch (e) {
    console.error('加载选项失败', e)
  }
}

const openAddDialog = () => {
  editingWebhook.value = null
  Object.assign(webhookForm, { name: '', platform: 'feishu', url: '', secret: '', events: [], retry_times: 3, timeout: 10 })
  showWebhookDialog.value = true
}

const editWebhook = (webhook: any) => {
  editingWebhook.value = webhook
  Object.assign(webhookForm, {
    name: webhook.name,
    platform: webhook.platform,
    url: webhook.url,
    secret: webhook.secret || '',
    events: webhook.events || [],
    retry_times: webhook.retry_times || 3,
    timeout: webhook.timeout || 10
  })
  showWebhookDialog.value = true
}

const saveWebhook = async () => {
  if (!webhookForm.name || !webhookForm.url) {
    ElMessage.warning('请填写名称和 URL')
    return
  }

  saving.value = true
  try {
    if (editingWebhook.value) {
      await axios.put(`${API_BASE}/${editingWebhook.value.id}`, webhookForm)
      ElMessage.success('Webhook 已更新')
    } else {
      await axios.post(`${API_BASE}`, webhookForm)
      ElMessage.success('Webhook 已创建')
    }
    showWebhookDialog.value = false
    await loadWebhooks()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.response?.data?.detail || e.message))
  }
  saving.value = false
}

const deleteWebhook = async (webhook: any) => {
  try {
    await ElMessageBox.confirm(`确定删除 Webhook "${webhook.name}" 吗？`, '确认', { type: 'warning' })
    await axios.delete(`${API_BASE}/${webhook.id}`)
    ElMessage.success('已删除')
    await loadWebhooks()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

const testWebhook = async (webhook: any) => {
  try {
    const res = await axios.post(`${API_BASE}/${webhook.id}/test`)
    if (res.data.success) {
      ElMessage.success('测试消息发送成功')
    } else {
      ElMessage.error('发送失败: ' + res.data.error)
    }
  } catch (e: any) {
    ElMessage.error('测试失败: ' + (e.response?.data?.detail || e.message))
  }
}

const openTemplateDialog = () => {
  editingTemplate.value = null
  Object.assign(templateForm, { name: '', template_type: 'task_alert', platform: 'feishu', title: '', content: '', variables: [], is_default: false })
  showTemplateDialog.value = true
}

const editTemplate = (template: any) => {
  editingTemplate.value = template
  Object.assign(templateForm, {
    name: template.name,
    template_type: template.template_type,
    platform: template.platform,
    title: template.title || '',
    content: template.content || '',
    variables: template.variables || [],
    is_default: template.is_default || false
  })
  showTemplateDialog.value = true
}

const saveTemplate = async () => {
  if (!templateForm.name || !templateForm.content) {
    ElMessage.warning('请填写名称和内容')
    return
  }

  savingTemplate.value = true
  try {
    if (editingTemplate.value) {
      await axios.put(`${API_BASE}/templates/${editingTemplate.value.id}`, templateForm)
      ElMessage.success('模板已更新')
    } else {
      await axios.post(`${API_BASE}/templates`, templateForm)
      ElMessage.success('模板已创建')
    }
    showTemplateDialog.value = false
    await loadTemplates()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.response?.data?.detail || e.message))
  }
  savingTemplate.value = false
}

const previewTemplate = (template: any) => {
  editingTemplate.value = template
  previewData.value = {
    variables: {},
    template_id: template.id
  }
  template.variables?.forEach((v: any) => {
    previewData.value.variables[v.name] = `示例${v.label}`
  })
  previewResult.value = null
  showPreviewDialog.value = true
}

const doPreview = async () => {
  try {
    const res = await axios.post(`${API_BASE}/templates/${previewData.value.template_id}/preview`, {
      variables: previewData.value.variables
    })
    previewResult.value = res.data
  } catch (e: any) {
    ElMessage.error('预览失败')
  }
}

const addVariable = () => {
  templateForm.variables.push({ name: '', label: '', type: 'string' })
}

const removeVariable = (index: number) => {
  templateForm.variables.splice(index, 1)
}

const initDefaultTemplates = async () => {
  try {
    const res = await axios.post(`${API_BASE}/templates/init-defaults`)
    ElMessage.success(res.data.message)
    await loadTemplates()
  } catch (e: any) {
    ElMessage.error('初始化失败: ' + (e.response?.data?.detail || e.message))
  }
}

onMounted(async () => {
  await loadOptions()
  await loadWebhooks()
  await loadTemplates()
})
</script>

<style scoped>
.webhook-page {
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

.toolbar {
  @apply flex gap-3 mb-5;
}

.form-tip {
  @apply text-xs text-gray-400 mt-1;
}

.form-tip code {
  @apply bg-gray-100 px-1.5 py-0.5 rounded text-xs;
}

.variable-item {
  @apply flex gap-3 mb-3 items-center;
}

.preview-result {
  @apply p-4 bg-gray-50 rounded-lg;
}

.preview-result h4 {
  @apply text-sm text-gray-500 mt-3 mb-1 first:mt-0;
}
</style>
