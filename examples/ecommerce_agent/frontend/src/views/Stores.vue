<template>
  <div class="stores-page">
    <div class="page-header">
      <h2>🏪 店铺管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddModal = true" icon="Plus">添加店铺</el-button>
        <el-button @click="refreshStores" icon="Refresh">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="6" v-for="store in stores" :key="store.id">
        <el-card class="store-card" :class="{ 'active-store': store.is_active }">
          <div class="store-header">
            <div class="platform-badge" :class="store.platform">
              {{ getPlatformName(store.platform) }}
            </div>
            <el-tag :type="store.is_active ? 'success' : 'warning'" size="small">
              {{ store.is_active ? '已启用' : '已禁用' }}
            </el-tag>
          </div>

          <h3 class="store-name">{{ store.name }}</h3>

          <div class="store-info">
            <div class="info-item">
              <span class="label">账号:</span>
              <span>{{ store.account || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间:</span>
              <span>{{ formatDate(store.created_at) }}</span>
            </div>
          </div>

          <el-divider />

          <div class="browser-status">
            <div class="status-label">
              <span>浏览器状态</span>
              <el-tag
                :type="getBrowserStatusType(store.browser_status)"
                size="small"
                :class="{ 'pulse-tag': store.browser_status === 'recovering' }"
              >
                {{ getBrowserStatusLabel(store.browser_status) }}
              </el-tag>
            </div>

            <div v-if="store.browser_status === 'healthy'" class="browser-info">
              <el-icon color="#67c23a"><CircleCheckFilled /></el-icon>
              <span class="browser-url">{{ store.current_url || '空闲中' }}</span>
            </div>

            <div v-else-if="store.browser_status === 'unhealthy'" class="browser-error">
              <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
              <span>浏览器未启动</span>
            </div>

            <div v-else-if="store.browser_status === 'recovering'" class="browser-recovering">
              <el-icon class="is-loading" color="#e6a23c"><Loading /></el-icon>
              <span>正在恢复...</span>
            </div>

            <div v-if="store.last_used_at" class="last-used">
              最后使用: {{ formatRelativeTime(store.last_used_at) }}
            </div>
          </div>

          <div class="store-actions">
            <el-button
              v-if="store.is_active"
              size="small"
              type="success"
              @click="openBrowser(store)"
              icon="Monitor"
            >
              {{ store.browser_status === 'healthy' ? '重新打开' : '打开浏览器' }}
            </el-button>
            <el-button
              v-if="store.browser_status === 'healthy'"
              size="small"
              type="warning"
              @click="closeBrowser(store)"
              icon="Close"
            >
              关闭
            </el-button>
            <el-button size="small" @click="editStore(store)" icon="Edit">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteStore(store)" icon="Delete">删除</el-button>
          </div>

          <div v-if="store.browser_status === 'healthy'" class="quick-actions">
            <el-button size="small" type="primary" @click="goToDebug(store)" icon="Aim">
              元素调试
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showAddModal" :title="editingStore ? '编辑店铺' : '添加店铺'" width="500px">
      <el-form :model="form" label-width="100px" label-position="left">
        <el-form-item label="店铺名称" required>
          <el-input v-model="form.name" placeholder="例如: 拼多多旗舰店" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="form.platform" style="width: 100%;">
            <el-option label="抖音" value="douyin" />
            <el-option label="拼多多" value="pinduoduo" />
            <el-option label="淘宝" value="taobao" />
            <el-option label="京东" value="jingdong" />
            <el-option label="小红书" value="xiaohongshu" />
          </el-select>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="平台账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="平台密码" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button type="primary" @click="saveStore">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetailDialog" :title="selectedStore?.name" width="600px">
      <el-descriptions v-if="selectedStore" :column="2" border>
        <el-descriptions-item label="店铺名称">{{ selectedStore.name }}</el-descriptions-item>
        <el-descriptions-item label="平台">{{ getPlatformName(selectedStore.platform) }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ selectedStore.account || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="selectedStore.is_active ? 'success' : 'warning'">
            {{ selectedStore.is_active ? '已启用' : '已禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(selectedStore.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="浏览器状态" :span="2">
          <el-tag :type="getBrowserStatusType(selectedStore.browser_status)">
            {{ getBrowserStatusLabel(selectedStore.browser_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="selectedStore.current_url" label="当前页面" :span="2">
          <span class="url-text">{{ selectedStore.current_url }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="openBrowser(selectedStore)">打开浏览器</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, CircleCloseFilled, Loading } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

interface Store {
  id: number
  name: string
  platform: string
  account: string
  is_active: boolean
  created_at: string
  browser_status: string
  current_url: string
  last_used_at: string
}

const stores = ref<Store[]>([])
const showAddModal = ref(false)
const showDetailDialog = ref(false)
const selectedStore = ref<Store | null>(null)
const editingStore = ref<Store | null>(null)

const form = ref({
  name: '',
  platform: 'pinduoduo',
  account: '',
  password: '',
  is_active: true
})

let healthCheckInterval: number | null = null

const getPlatformName = (platform: string): string => {
  const names: Record<string, string> = {
    douyin: '抖音', pinduoduo: '拼多多', taobao: '淘宝', jingdong: '京东', xiaohongshu: '小红书'
  }
  return names[platform] || platform
}

const getBrowserStatusType = (status: string): string => {
  const types: Record<string, string> = {
    healthy: 'success', unhealthy: 'danger', recovering: 'warning', dead: 'info'
  }
  return types[status] || 'info'
}

const getBrowserStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    healthy: '正常', unhealthy: '离线', recovering: '恢复中', dead: '已死亡'
  }
  return labels[status] || status || '未启动'
}

const formatDate = (date: string): string => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatRelativeTime = (date: string): string => {
  if (!date) return '-'
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return formatDate(date)
}

const loadStores = async () => {
  try {
    const res = await axios.get('/api/stores')
    stores.value = res.data.stores || []
  } catch {
    stores.value = [
      { id: 1, name: '拼多多旗舰店', platform: 'pinduoduo', account: 'shop001', is_active: true, created_at: '2024-01-15', browser_status: 'healthy', current_url: 'https://mms.pinduoduo.com', last_used_at: new Date().toISOString() },
      { id: 2, name: '抖音官方店', platform: 'douyin', account: 'shop002', is_active: true, created_at: '2024-01-20', browser_status: 'unhealthy', current_url: '', last_used_at: '' },
      { id: 3, name: '淘宝皇冠店', platform: 'taobao', account: 'shop003', is_active: true, created_at: '2024-02-01', browser_status: 'healthy', current_url: 'https://seller.taobao.com', last_used_at: new Date(Date.now() - 3600000).toISOString() }
    ]
  }
}

const loadBrowserStatus = async () => {
  try {
    const res = await axios.get('/api/status/browsers')
    const browserStatus = res.data.stores || []

    browserStatus.forEach((bs: any) => {
      const store = stores.value.find(s => s.id === bs.id)
      if (store) {
        store.browser_status = bs.browser_open ? 'healthy' : 'unhealthy'
        store.current_url = bs.current_url || ''
      }
    })
  } catch {}
}

const refreshStores = async () => {
  await loadStores()
  await loadBrowserStatus()
  ElMessage.success('已刷新')
}

const viewStore = (store: Store) => {
  selectedStore.value = store
  showDetailDialog.value = true
}

const editStore = (store: Store) => {
  editingStore.value = store
  form.value = {
    name: store.name,
    platform: store.platform,
    account: store.account || '',
    password: '',
    is_active: store.is_active
  }
  showAddModal.value = true
}

const deleteStore = async (store: Store) => {
  try {
    await axios.delete(`/api/stores/${store.id}`)
    stores.value = stores.value.filter(s => s.id !== store.id)
    ElMessage.success('已删除')
  } catch {
    stores.value = stores.value.filter(s => s.id !== store.id)
    ElMessage.success('已删除（本地）')
  }
}

const saveStore = () => {
  if (!form.value.name) {
    ElMessage.warning('请输入店铺名称')
    return
  }

  if (editingStore.value) {
    Object.assign(editingStore.value, {
      name: form.value.name,
      platform: form.value.platform,
      account: form.value.account,
      is_active: form.value.is_active
    })
    ElMessage.success('已更新')
  } else {
    stores.value.push({
      id: Date.now(),
      name: form.value.name,
      platform: form.value.platform,
      account: form.value.account,
      is_active: form.value.is_active,
      created_at: new Date().toISOString(),
      browser_status: 'unhealthy',
      current_url: '',
      last_used_at: ''
    })
    ElMessage.success('已添加')
  }

  showAddModal.value = false
  editingStore.value = null
  form.value = { name: '', platform: 'pinduoduo', account: '', password: '', is_active: true }
}

const openBrowser = async (store: Store) => {
  try {
    ElMessage.info(`正在为 ${store.name} 打开浏览器...`)
    await axios.post(`/api/stores/${store.id}/open-browser`)
    store.browser_status = 'healthy'
    ElMessage.success('浏览器已打开')
  } catch (e: any) {
    ElMessage.error('打开失败: ' + (e.response?.data?.detail || e.message))
  }
}

const closeBrowser = async (store: Store) => {
  try {
    await axios.post(`/api/stores/${store.id}/close-browser`)
    store.browser_status = 'unhealthy'
    store.current_url = ''
    ElMessage.success('浏览器已关闭')
  } catch (e: any) {
    store.browser_status = 'unhealthy'
    store.current_url = ''
    ElMessage.success('浏览器已关闭（本地）')
  }
}

const goToDebug = (store: Store) => {
  router.push({ path: '/elements', query: { store_id: store.id.toString() } })
}

onMounted(async () => {
  await loadStores()
  await loadBrowserStatus()

  healthCheckInterval = window.setInterval(async () => {
    await loadBrowserStatus()
  }, 30000)
})

onUnmounted(() => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }
})
</script>

<style scoped>
.stores-page { padding: 20px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 { margin: 0; }
.header-actions { display: flex; gap: 10px; }

.store-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.store-card.active-store {
  border-left: 3px solid #67c23a;
}

.store-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.platform-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
}

.platform-badge.douyin { background-color: #ff2c55; }
.platform-badge.pinduoduo { background-color: #ff4d4f; }
.platform-badge.taobao { background-color: #ff4400; }
.platform-badge.jingdong { background-color: #ef3e36; }
.platform-badge.xiaohongshu { background-color: #ff6b6b; }

.store-name {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #1f2937;
}

.store-info {
  font-size: 12px;
  color: #6b7280;
}

.info-item {
  display: flex;
  gap: 5px;
  margin-bottom: 4px;
}

.info-item .label { color: #909399; }

.browser-status {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
}

.status-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #606266;
}

.browser-info, .browser-error, .browser-recovering {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.browser-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.last-used {
  margin-top: 8px;
  font-size: 11px;
  color: #909399;
}

.pulse-tag {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.store-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.url-text {
  word-break: break-all;
  font-size: 12px;
  color: #409eff;
}
</style>
