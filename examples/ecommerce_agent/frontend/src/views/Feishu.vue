<template>
  <div class="feishu-page">
    <div class="page-header">
      <h2>📱 飞书集成</h2>
      <p class="subtitle">配置飞书机器人，接收任务告警和发送每日报告</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="配置" name="config">
        <el-row :gutter="20">
          <el-col :span="14">
            <el-card>
              <template #header>
                <span>飞书应用配置</span>
              </template>
              <el-form :model="configForm" label-width="140px" label-position="left">
                <el-form-item label="App ID">
                  <el-input v-model="configForm.app_id" placeholder="cli_xxxxxxxxxxxx" />
                </el-form-item>
                <el-form-item label="App Secret">
                  <el-input v-model="configForm.app_secret" type="password" show-password placeholder="应用凭证密钥" />
                </el-form-item>
                <el-form-item label="Verification Token">
                  <el-input v-model="configForm.verification_token" type="password" show-password placeholder="事件订阅验证令牌" />
                  <div class="form-tip">在飞书开放平台 → 事件与回调 → 事件配置中获取</div>
                </el-form-item>
                <el-form-item label="机器人名称">
                  <el-input v-model="configForm.bot_name" placeholder="电商Agent助手" />
                </el-form-item>
                <el-divider />
                <el-form-item>
                  <el-button type="primary" @click="saveConfig" :loading="saving">
                    保存配置
                  </el-button>
                  <el-button @click="testConnection" :loading="testing">
                    测试连接
                  </el-button>
                  <el-button type="danger" @click="deleteConfig" v-if="configStatus.configured">
                    删除配置
                  </el-button>
                </el-form-item>
              </el-form>

              <el-alert
                v-if="configStatus.configured"
                title="飞书已配置"
                type="success"
                :closable="false"
                style="margin-top: 20px;"
              >
                <template #default>
                  App ID: {{ configStatus.app_id }}<br/>
                  可以发送消息和接收事件了
                </template>
              </el-alert>
            </el-card>

            <el-card style="margin-top: 20px;">
              <template #header>
                <span>Webhook 配置</span>
              </template>
              <el-form label-width="120px" label-position="left">
                <el-form-item label="事件订阅 URL">
                  <el-input :value="webhookUrl" disabled>
                    <template #append>
                      <el-button @click="copyWebhookUrl">复制</el-button>
                    </template>
                  </el-input>
                  <div class="form-tip">
                    将此 URL 填入飞书开放平台 → 事件与回调 → 事件配置 → 请求地址
                  </div>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>

          <el-col :span="10">
            <el-card>
              <template #header>
                <span>快速测试</span>
              </template>
              <el-form label-width="100px">
                <el-form-item label="接收者类型">
                  <el-select v-model="testForm.receiveIdType" style="width: 100%;">
                    <el-option label="Open ID" value="open_id" />
                    <el-option label="User ID" value="user_id" />
                    <el-option label="Union ID" value="union_id" />
                    <el-option label="Email" value="email" />
                    <el-option label="Chat ID" value="chat_id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="接收者 ID">
                  <el-input v-model="testForm.receiveId" placeholder="ou_xxxxxxxx 或群 ID" />
                </el-form-item>
                <el-form-item label="消息类型">
                  <el-select v-model="testForm.cardType" style="width: 100%;">
                    <el-option label="任务告警" value="task_alert" />
                    <el-option label="每日报告" value="daily_report" />
                    <el-option label="商品发布" value="product_published" />
                    <el-option label="资源告警" value="resource_alert" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="sendTestMessage" :loading="sending" :disabled="!configStatus.configured">
                    发送测试消息
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <el-card style="margin-top: 20px;">
              <template #header>
                <span>可用模板</span>
              </template>
              <el-space direction="vertical" style="width: 100%;">
                <div v-for="tmpl in templates" :key="tmpl.type" class="template-item">
                  <div class="template-name">{{ tmpl.name }}</div>
                  <div class="template-desc">{{ tmpl.description }}</div>
                </div>
              </el-space>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="群聊管理" name="chats">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>飞书群列表</span>
              <el-button size="small" @click="loadChats" :loading="loadingChats">
                刷新
              </el-button>
            </div>
          </template>

          <el-table :data="chatList" v-loading="loadingChats" stripe>
            <el-table-column prop="name" label="群名称" min-width="150" />
            <el-table-column prop="chat_id" label="群 ID" min-width="200">
              <template #default="scope">
                <code>{{ scope.row.chat_id }}</code>
                <el-button size="small" link @click="copyToClipboard(scope.row.chat_id)">
                  复制
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="member_count" label="成员数" width="100" />
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" @click="sendToChat(scope.row)">
                  发送消息
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="消息日志" name="logs">
        <el-card>
          <template #header>
            <span>发送记录</span>
          </template>
          <el-table :data="messageLogs" stripe>
            <el-table-column prop="type" label="类型" width="120">
              <template #default="scope">
                <el-tag size="small">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="receiver" label="接收者" min-width="150" />
            <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
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

    <el-dialog v-model="showSendDialog" title="发送消息" width="500px">
      <el-form label-width="100px">
        <el-form-item label="接收者">
          <el-input :value="selectedChat?.name || selectedChat?.chat_id" disabled />
        </el-form-item>
        <el-form-item label="消息类型">
          <el-select v-model="sendForm.cardType" style="width: 100%;">
            <el-option label="任务告警" value="task_alert" />
            <el-option label="每日报告" value="daily_report" />
            <el-option label="商品发布" value="product_published" />
            <el-option label="资源告警" value="resource_alert" />
          </el-select>
        </el-form-item>
        <template v-if="sendForm.cardType === 'task_alert'">
          <el-form-item label="任务名称">
            <el-input v-model="sendForm.taskName" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="sendForm.status">
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="运行中" value="running" />
            </el-select>
          </el-form-item>
          <el-form-item label="消息">
            <el-input v-model="sendForm.message" type="textarea" rows="2" />
          </el-form-item>
        </template>
        <template v-else-if="sendForm.cardType === 'daily_report'">
          <el-form-item label="标题">
            <el-input v-model="sendForm.title" />
          </el-form-item>
          <el-form-item label="店铺名称">
            <el-input v-model="sendForm.storeName" />
          </el-form-item>
          <el-form-item label="数据">
            <el-input v-model="sendForm.stats" type="textarea" rows="3" placeholder='{"销售额": "10000元", "订单数": "50"}' />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="showSendDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSend" :loading="sending">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const API_BASE = '/api/feishu'

const activeTab = ref('config')
const configStatus = ref({ configured: false, app_id: '', webhook_url: '' })
const configForm = reactive({
  app_id: '',
  app_secret: '',
  verification_token: '',
  bot_name: ''
})
const testForm = reactive({
  receiveIdType: 'chat_id',
  receiveId: '',
  cardType: 'task_alert'
})
const sendForm = reactive({
  cardType: 'task_alert',
  taskName: '测试任务',
  status: 'success',
  message: '这是一条测试消息',
  title: '每日运营报告',
  storeName: '测试店铺',
  stats: '{"销售额": "10000元", "订单数": "50"}'
})

const saving = ref(false)
const testing = ref(false)
const sending = ref(false)
const loadingChats = ref(false)
const chatList = ref<any[]>([])
const messageLogs = ref<any[]>([])
const showSendDialog = ref(false)
const selectedChat = ref<any>(null)

const webhookUrl = computed(() => {
  return `${window.location.origin}${API_BASE}/webhook`
})

const templates = [
  { type: 'task_alert', name: '任务告警', description: '任务执行状态变更时发送通知' },
  { type: 'daily_report', name: '每日报告', description: '每日运营数据汇总报告' },
  { type: 'product_published', name: '商品发布', description: '商品发布成功通知' },
  { type: 'resource_alert', name: '资源告警', description: '系统资源使用率告警' }
]

const loadConfig = async () => {
  try {
    const res = await axios.get(`${API_BASE}/config`)
    configStatus.value = res.data
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

const saveConfig = async () => {
  if (!configForm.app_id || !configForm.app_secret) {
    ElMessage.warning('请填写 App ID 和 App Secret')
    return
  }

  saving.value = true
  try {
    await axios.post(`${API_BASE}/config`, configForm)
    ElMessage.success('配置已保存')
    await loadConfig()
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.response?.data?.detail || e.message))
  }
  saving.value = false
}

const deleteConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要删除飞书配置吗？', '确认', { type: 'warning' })
    await axios.delete(`${API_BASE}/config`)
    ElMessage.success('配置已删除')
    configStatus.value = { configured: false, app_id: '', webhook_url: '' }
    configForm.app_id = ''
    configForm.app_secret = ''
    configForm.verification_token = ''
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const testConnection = async () => {
  testing.value = true
  try {
    const res = await axios.post(`${API_BASE}/test`)
    ElMessage.success(res.data.message)
  } catch (e: any) {
    ElMessage.error(e.response?.data?.detail || '连接失败')
  }
  testing.value = false
}

const sendTestMessage = async () => {
  if (!testForm.receiveId) {
    ElMessage.warning('请输入接收者 ID')
    return
  }

  sending.value = true
  try {
    const data: Record<string, any> = {}

    if (testForm.cardType === 'task_alert') {
      data.task_name = '测试任务'
      data.status = 'success'
      data.message = '这是一条测试消息'
    } else if (testForm.cardType === 'daily_report') {
      data.title = '每日运营报告'
      data.stats = { 销售额: '10000元', 订单数: '50' }
      data.store_name = '测试店铺'
    } else if (testForm.cardType === 'product_published') {
      data.product_title = '测试商品'
      data.platform = '拼多多'
      data.product_url = 'https://example.com'
    } else if (testForm.cardType === 'resource_alert') {
      data.resource_type = 'CPU'
      data.usage = 85
      data.threshold = 80
    }

    await axios.post(`${API_BASE}/messages/send-card`, {
      receive_id_type: testForm.receiveIdType,
      receive_id: testForm.receiveId,
      card_type: testForm.cardType,
      data
    })

    ElMessage.success('消息已发送')
    messageLogs.value.unshift({
      type: testForm.cardType,
      receiver: testForm.receiveId,
      content: JSON.stringify(data),
      status: 'success',
      created_at: new Date().toLocaleString()
    })
  } catch (e: any) {
    ElMessage.error('发送失败: ' + (e.response?.data?.detail || e.message))
    messageLogs.value.unshift({
      type: testForm.cardType,
      receiver: testForm.receiveId,
      content: '发送失败',
      status: 'failed',
      created_at: new Date().toLocaleString()
    })
  }
  sending.value = false
}

const loadChats = async () => {
  loadingChats.value = true
  try {
    const res = await axios.get(`${API_BASE}/chats`)
    chatList.value = res.data.chats || []
  } catch (e: any) {
    ElMessage.error('获取群列表失败: ' + (e.response?.data?.detail || e.message))
  }
  loadingChats.value = false
}

const sendToChat = (chat: any) => {
  selectedChat.value = chat
  showSendDialog.value = true
}

const confirmSend = async () => {
  sending.value = true
  try {
    const data: Record<string, any> = {}

    if (sendForm.cardType === 'task_alert') {
      data.task_name = sendForm.taskName
      data.status = sendForm.status
      data.message = sendForm.message
    } else if (sendForm.cardType === 'daily_report') {
      data.title = sendForm.title
      data.stats = JSON.parse(sendForm.stats || '{}')
      data.store_name = sendForm.storeName
    }

    await axios.post(`${API_BASE}/messages/send-card`, {
      receive_id_type: 'chat_id',
      receive_id: selectedChat.value.chat_id,
      card_type: sendForm.cardType,
      data
    })

    ElMessage.success('消息已发送')
    showSendDialog.value = false
  } catch (e: any) {
    ElMessage.error('发送失败: ' + (e.response?.data?.detail || e.message))
  }
  sending.value = false
}

const copyWebhookUrl = () => {
  navigator.clipboard.writeText(webhookUrl.value)
  ElMessage.success('已复制到剪贴板')
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

onMounted(async () => {
  await loadConfig()
})
</script>

<style scoped>
.feishu-page {
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

.form-tip {
  @apply text-xs text-gray-400 mt-1;
}

.card-header {
  @apply flex justify-between items-center;
}

.template-item {
  @apply p-3 border border-gray-200 rounded-lg mb-3;
}

.template-name {
  @apply font-semibold text-gray-700 mb-1;
}

.template-desc {
  @apply text-xs text-gray-400;
}
</style>
