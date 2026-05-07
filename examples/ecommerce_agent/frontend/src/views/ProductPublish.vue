<template>
  <div class="product-publish">
    <div class="page-header">
      <h2>🚀 商品批量发布</h2>
      <p class="subtitle">配置数据源 → 自动匹配 → 批量发布到多个平台</p>
    </div>

    <el-steps :active="currentStep" align-center finish-status="success" style="margin-bottom: 30px;">
      <el-step title="配置数据源" description="链接参数 + SKU + 图片" />
      <el-step title="数据关联" description="匹配图片文件夹" />
      <el-step title="预览确认" description="检查待发布商品" />
      <el-step title="执行发布" description="批量发布任务" />
    </el-steps>

    <!-- 步骤1: 配置数据源 -->
    <div v-show="currentStep === 0" class="step-content">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>📊 数据源配置</span>
            <el-button type="primary" size="small" @click="addDataSource">
              <el-icon><Plus /></el-icon>
              添加数据源
            </el-button>
          </div>
        </template>

        <el-alert
          title="💡 支持多个数据源"
          description="可以为不同的商品链接配置不同的数据源，或者多个链接共享同一数据源"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        />

        <!-- 链接参数数据源 -->
        <div class="data-source-section">
          <h4>📋 链接参数数据源</h4>
          <p class="section-desc">包含商品标题、价格、产地等基本信息的 Excel 文件</p>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Excel 文件">
                <el-input v-model="dataSources.linkParams.filePath" placeholder="输入 Excel 文件路径">
                  <template #append>
                    <el-button @click="browseFile('linkParams')">浏览</el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="工作表">
                <el-input v-model="dataSources.linkParams.sheetName" placeholder="Sheet1" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="操作">
                <el-button type="primary" @click="loadLinkParamsData" :loading="loadingLinkParams">
                  加载预览
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 链接参数字段映射 -->
          <div v-if="dataSources.linkParams.preview.length > 0" class="field-mapping">
            <h5>字段映射配置</h5>
            <el-row :gutter="15">
              <el-col :span="6">
                <el-form-item label="标题字段" required>
                  <el-select v-model="fieldMappings.title" placeholder="选择列" style="width: 100%;">
                    <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="价格字段">
                  <el-select v-model="fieldMappings.price" placeholder="选择列" clearable style="width: 100%;">
                    <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="产地字段">
                  <el-select v-model="fieldMappings.origin" placeholder="选择列" clearable style="width: 100%;">
                    <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="品牌字段">
                  <el-select v-model="fieldMappings.brand" placeholder="选择列" clearable style="width: 100%;">
                    <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 数据预览 -->
          <div v-if="dataSources.linkParams.preview.length > 0" class="data-preview">
            <h5>数据预览（前5行）</h5>
            <el-table :data="dataSources.linkParams.preview" border size="small" max-height="250">
              <el-table-column v-for="col in dataSources.linkParams.columns" :key="col" :prop="col" :label="col" min-width="120" show-overflow-tooltip />
            </el-table>
            <div class="preview-info">
              共 {{ dataSources.linkParams.totalRows }} 行数据
            </div>
          </div>
        </div>

        <el-divider />

        <!-- SKU数据源 -->
        <div class="data-source-section">
          <h4>📦 SKU 数据源（可选）</h4>
          <p class="section-desc">包含商品规格、货号、库存等 SKU 信息的 Excel 文件</p>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="SKU Excel 文件">
                <el-input v-model="dataSources.sku.filePath" placeholder="输入 SKU Excel 文件路径">
                  <template #append>
                    <el-button @click="browseFile('sku')">浏览</el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="工作表">
                <el-input v-model="dataSources.sku.sheetName" placeholder="Sheet1" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="操作">
                <el-button @click="loadSkuData" :loading="loadingSku">
                  加载预览
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- SKU 字段映射 -->
          <div v-if="dataSources.sku.preview.length > 0" class="field-mapping">
            <h5>SKU 字段映射</h5>
            <el-row :gutter="15">
              <el-col :span="8">
                <el-form-item label="SKU编号字段" required>
                  <el-select v-model="skuFieldMappings.skuId" placeholder="选择列" style="width: 100%;">
                    <el-option v-for="col in dataSources.sku.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="规格字段">
                  <el-select v-model="skuFieldMappings.specs" placeholder="选择列" clearable style="width: 100%;">
                    <el-option v-for="col in dataSources.sku.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="库存字段" required>
                  <el-select v-model="skuFieldMappings.stock" placeholder="选择列" style="width: 100%;">
                    <el-option v-for="col in dataSources.sku.columns" :key="col" :label="col" :value="col" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- SKU 数据预览 -->
          <div v-if="dataSources.sku.preview.length > 0" class="data-preview">
            <h5>SKU 数据预览（前5行）</h5>
            <el-table :data="dataSources.sku.preview" border size="small" max-height="200">
              <el-table-column v-for="col in dataSources.sku.columns" :key="col" :prop="col" :label="col" min-width="100" />
            </el-table>
          </div>
        </div>

        <el-divider />

        <!-- 图片文件夹 -->
        <div class="data-source-section">
          <h4>🖼️ 图片文件夹</h4>
          <p class="section-desc">包含商品图片的文件夹，每个商品对应一个子文件夹</p>
          
          <el-row :gutter="20">
            <el-col :span="16">
              <el-form-item label="图片根目录">
                <el-input v-model="dataSources.images.folderPath" placeholder="输入图片文件夹路径">
                  <template #append>
                    <el-button @click="browseFolder('images')">浏览</el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="选项">
                <el-checkbox v-model="dataSources.images.includeSubfolders">包含子目录</el-checkbox>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="文件夹命名规则">
                <el-select v-model="folderNamingRule" placeholder="选择规则" style="width: 100%;">
                  <el-option label="文件夹名 = 商品标题" value="title" />
                  <el-option label="文件夹名 = SKU编号" value="sku_id" />
                  <el-option label="文件夹名 = 序号 (001, 002...)" value="index" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="匹配字段">
                <el-select v-model="folderMatchField" placeholder="选择字段" style="width: 100%;">
                  <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="`链接参数.${col}`" :value="`link.${col}`" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-button type="primary" @click="scanImageFolders" :loading="scanningImages">
            <el-icon><FolderOpened /></el-icon>
            扫描图片文件夹
          </el-button>

          <!-- 图片文件夹预览 -->
          <div v-if="imageFolders.length > 0" class="folder-preview">
            <h5>已扫描的子文件夹 ({{ imageFolders.length }} 个)</h5>
            <div class="folder-grid">
              <el-tag v-for="folder in imageFolders.slice(0, 20)" :key="folder" size="small" style="margin: 4px;">
                📁 {{ folder }}
              </el-tag>
              <el-tag v-if="imageFolders.length > 20" size="small" type="info">
                ... 还有 {{ imageFolders.length - 20 }} 个
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 步骤2: 数据关联 -->
    <div v-show="currentStep === 1" class="step-content">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🔗 数据关联配置</span>
            <el-button type="primary" size="small" @click="autoMatchProducts">
              <el-icon><MagicStick /></el-icon>
              自动匹配
            </el-button>
          </div>
        </template>

        <el-alert
          title="💡 自动匹配规则"
          description="根据选定的匹配字段，自动将链接参数数据与图片文件夹进行关联"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        />

        <div class="match-settings">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="匹配字段">
                <el-select v-model="matchField" style="width: 100%;">
                  <el-option v-for="col in dataSources.linkParams.columns" :key="col" :label="col" :value="col" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="匹配方式">
                <el-select v-model="matchType" style="width: 100%;">
                  <el-option label="精确匹配" value="exact" />
                  <el-option label="模糊匹配（包含）" value="contains" />
                  <el-option label="模糊匹配（开头）" value="startswith" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-button type="primary" @click="performMatching" style="margin-top: 4px;">
                执行匹配
              </el-button>
            </el-col>
          </el-row>
        </div>

        <el-divider />

        <!-- 匹配结果 -->
        <div class="match-results">
          <h5>匹配结果</h5>
          <el-table :data="matchResults" border size="small" max-height="400">
            <el-table-column prop="title" label="商品标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="folder" label="匹配文件夹" min-width="150">
              <template #default="scope">
                <el-tag v-if="scope.row.folder" type="success" size="small">
                  📁 {{ scope.row.folder }}
                </el-tag>
                <el-tag v-else type="danger" size="small">
                  ❌ 未匹配
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="imageCount" label="图片数" width="80" align="center" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'matched' ? 'success' : 'warning'" size="small">
                  {{ scope.row.status === 'matched' ? '已匹配' : '待处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button size="small" @click="editMatch(scope.row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="match-summary">
            <el-statistic title="总商品数" :value="matchResults.length" />
            <el-statistic title="已匹配" :value="matchedCount" />
            <el-statistic title="未匹配" :value="unmatchedCount" />
            <el-statistic title="匹配率" :value="matchRate" suffix="%" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 步骤3: 预览确认 -->
    <div v-show="currentStep === 2" class="step-content">
      <el-card>
        <template #header>
          <span>📋 待发布商品预览</span>
        </template>

        <div class="publish-settings">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="目标平台">
                <el-checkbox-group v-model="selectedPlatforms">
                  <el-checkbox label="抖音" />
                  <el-checkbox label="拼多多" />
                  <el-checkbox label="淘宝" />
                  <el-checkbox label="京东" />
                </el-checkbox-group>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="发布设置">
                <el-checkbox v-model="publishSettings.autoGenerateTitle">自动生成标题</el-checkbox>
                <el-checkbox v-model="publishSettings.keepPriceOriginal">保持原价不变</el-checkbox>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="价格公式">
                <el-input v-model="publishSettings.priceFormula" placeholder="如: cost * 1.5" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-divider />

        <!-- 商品预览列表 -->
        <div class="product-preview">
          <div class="preview-header">
            <span>共 {{ productsToPublish.length }} 个商品待发布</span>
            <el-button size="small" @click="refreshPreview">刷新</el-button>
          </div>

          <el-table :data="productsToPublish" border size="small" max-height="400">
            <el-table-column type="index" width="50" />
            <el-table-column label="商品信息" min-width="250">
              <template #default="scope">
                <div class="product-info">
                  <div class="product-images">
                    <el-image
                      v-for="(img, idx) in scope.row.images.slice(0, 3)"
                      :key="idx"
                      :src="getImageUrl(img)"
                      fit="cover"
                      style="width: 50px; height: 50px; margin-right: 5px; border-radius: 4px;"
                    />
                    <span v-if="scope.row.images.length > 3">+{{ scope.row.images.length - 3 }}</span>
                  </div>
                  <div class="product-details">
                    <div class="product-title">{{ scope.row.title }}</div>
                    <div class="product-price">¥{{ scope.row.price }}</div>
                    <div class="product-sku" v-if="scope.row.skuData.length > 0">
                      SKU: {{ scope.row.skuData.length }} 个规格
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="产地" prop="origin" width="100" />
            <el-table-column label="图片数" prop="images" width="80" align="center">
              <template #default="scope">
                {{ scope.row.images.length }}
              </template>
            </el-table-column>
            <el-table-column label="SKU数" width="80" align="center">
              <template #default="scope">
                {{ scope.row.skuData?.length || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="平台" width="150">
              <template #default="scope">
                <el-tag v-for="p in selectedPlatforms" :key="p" size="small" type="success" style="margin: 2px;">
                  {{ p }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="publish-summary">
          <el-alert
            :title="`即将发布 ${productsToPublish.length} 个商品到 ${selectedPlatforms.length} 个平台，共 ${productsToPublish.length * selectedPlatforms.length} 个发布任务`"
            type="success"
            show-icon
          />
        </div>
      </el-card>
    </div>

    <!-- 步骤4: 执行发布 -->
    <div v-show="currentStep === 3" class="step-content">
      <el-card>
        <template #header>
          <span>🚀 发布执行</span>
        </template>

        <div class="publish-execution">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总任务数" :value="totalTasks" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="成功" :value="successTasks" :value-style="{ color: '#67c23a' }" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="失败" :value="failedTasks" :value-style="{ color: '#f56c6c' }" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="进行中" :value="runningTasks" :value-style="{ color: '#409eff' }" />
            </el-col>
          </el-row>

          <el-progress
            :percentage="publishProgress"
            :color="publishProgressColor"
            style="margin: 30px 0;"
          />

          <div class="publish-log">
            <h5>执行日志</h5>
            <div class="log-list">
              <div v-for="(log, idx) in publishLogs" :key="idx" class="log-item" :class="log.type">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>

          <div class="execution-actions">
            <el-button v-if="!isPublishing" type="primary" size="large" @click="startPublish">
              开始发布
            </el-button>
            <el-button v-else type="warning" size="large" @click="pausePublish">
              暂停
            </el-button>
            <el-button size="large" @click="resetPublish">
              重置
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 底部操作 -->
    <div class="step-actions">
      <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
      <el-button v-if="currentStep < 3" type="primary" @click="nextStep" :disabled="!canNextStep">
        下一步
      </el-button>
      <el-button v-if="currentStep === 3 && !isPublishing" type="success" @click="startPublish">
        开始发布
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, FolderOpened, MagicStick } from '@element-plus/icons-vue'
import axios from 'axios'

const currentStep = ref(0)

const dataSources = ref({
  linkParams: {
    filePath: '',
    sheetName: 'Sheet1',
    columns: [] as string[],
    preview: [] as any[],
    totalRows: 0
  },
  sku: {
    filePath: '',
    sheetName: 'Sheet1',
    columns: [] as string[],
    preview: [] as any[]
  },
  images: {
    folderPath: '',
    includeSubfolders: false
  }
})

const fieldMappings = ref({
  title: '',
  price: '',
  origin: '',
  brand: ''
})

const skuFieldMappings = ref({
  skuId: '',
  specs: '',
  stock: ''
})

const folderNamingRule = ref('title')
const folderMatchField = ref('')

const loadingLinkParams = ref(false)
const loadingSku = ref(false)
const scanningImages = ref(false)

const imageFolders = ref<string[]>([])

const matchField = ref('')
const matchType = ref('exact')
const matchResults = ref<any[]>([])

const selectedPlatforms = ref<string[]>(['拼多多'])
const publishSettings = ref({
  autoGenerateTitle: false,
  keepPriceOriginal: true,
  priceFormula: ''
})

const productsToPublish = ref<any[]>([])

const isPublishing = ref(false)
const publishProgress = ref(0)
const publishLogs = ref<any[]>([])
const totalTasks = computed(() => productsToPublish.value.length * selectedPlatforms.value.length)
const successTasks = ref(0)
const failedTasks = ref(0)
const runningTasks = computed(() => Math.floor(publishProgress.value / 100 * totalTasks.value) - successTasks.value - failedTasks.value)

const matchedCount = computed(() => matchResults.value.filter(r => r.folder).length)
const unmatchedCount = computed(() => matchResults.value.filter(r => !r.folder).length)
const matchRate = computed(() => matchResults.value.length > 0 ? Math.round(matchedCount.value / matchResults.value.length * 100) : 0)

const publishProgressColor = computed(() => {
  if (publishProgress.value < 30) return '#f56c6c'
  if (publishProgress.value < 70) return '#e6a23c'
  return '#67c23a'
})

const canNextStep = computed(() => {
  if (currentStep.value === 0) {
    return dataSources.value.linkParams.preview.length > 0 && fieldMappings.value.title
  }
  if (currentStep.value === 1) {
    return matchedCount.value > 0
  }
  return true
})

const loadLinkParamsData = async () => {
  if (!dataSources.value.linkParams.filePath) {
    ElMessage.warning('请输入 Excel 文件路径')
    return
  }

  loadingLinkParams.value = true
  try {
    const response = await axios.post('/api/product-library/excel/preview', {
      file_path: dataSources.value.linkParams.filePath,
      max_rows: 10
    })

    dataSources.value.linkParams.columns = response.data.columns.map((c: any) => c.name)
    dataSources.value.linkParams.preview = response.data.rows
    dataSources.value.linkParams.totalRows = response.data.total_rows

    // 自动选择第一个字段作为标题
    if (dataSources.value.linkParams.columns.length > 0 && !fieldMappings.value.title) {
      fieldMappings.value.title = dataSources.value.linkParams.columns[0]
    }

    ElMessage.success('数据加载成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '加载失败')
  }
  loadingLinkParams.value = false
}

const loadSkuData = async () => {
  if (!dataSources.value.sku.filePath) {
    ElMessage.warning('请输入 SKU Excel 文件路径')
    return
  }

  loadingSku.value = true
  try {
    const response = await axios.post('/api/product-library/excel/preview', {
      file_path: dataSources.value.sku.filePath,
      max_rows: 10
    })

    dataSources.value.sku.columns = response.data.columns.map((c: any) => c.name)
    dataSources.value.sku.preview = response.data.rows

    ElMessage.success('SKU 数据加载成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '加载失败')
  }
  loadingSku.value = false
}

const scanImageFolders = async () => {
  if (!dataSources.value.images.folderPath) {
    ElMessage.warning('请输入图片文件夹路径')
    return
  }

  scanningImages.value = true
  try {
    const response = await axios.post('/api/product-library/scan-folder', {
      path: dataSources.value.images.folderPath,
      include_subfolders: dataSources.value.images.includeSubfolders,
      max_count: 500
    })

    // 获取所有子文件夹
    const folders = new Set<string>()
    response.data.images.forEach((img: any) => {
      const parts = img.relative_path.split('/')
      if (parts.length > 1) {
        folders.add(parts[0])
      }
    })

    imageFolders.value = Array.from(folders).sort()
    ElMessage.success(`扫描完成，找到 ${imageFolders.value.length} 个子文件夹`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '扫描失败')
  }
  scanningImages.value = false
}

const performMatching = () => {
  if (!matchField.value) {
    ElMessage.warning('请选择匹配字段')
    return
  }

  matchResults.value = dataSources.value.linkParams.preview.map((row: any, index: number) => {
    const title = row[matchField.value] || ''
    const matchedFolder = findMatchingFolder(title)
    
    return {
      index,
      title,
      price: row[fieldMappings.value.price] || '',
      folder: matchedFolder?.name || '',
      folderImages: matchedFolder?.images || [],
      imageCount: matchedFolder?.images?.length || 0,
      status: matchedFolder ? 'matched' : 'pending'
    }
  })

  ElMessage.success(`匹配完成：${matchedCount.value} 个已匹配，${unmatchedCount.value} 个未匹配`)
}

const findMatchingFolder = (title: string) => {
  for (const folder of imageFolders.value) {
    if (matchType.value === 'exact' && folder === title) {
      return { name: folder, images: [] }
    }
    if (matchType.value === 'contains' && folder.includes(title)) {
      return { name: folder, images: [] }
    }
    if (matchType.value === 'startswith' && folder.startsWith(title.substring(0, Math.min(5, title.length)))) {
      return { name: folder, images: [] }
    }
  }
  return null
}

const autoMatchProducts = () => {
  if (dataSources.value.linkParams.columns.length > 0) {
    matchField.value = fieldMappings.value.title
    performMatching()
  }
}

const editMatch = (row: any) => {
  ElMessage.info('编辑匹配功能')
}

const refreshPreview = () => {
  productsToPublish.value = matchResults.value
    .filter(r => r.status === 'matched')
    .map(r => ({
      title: r.title,
      price: r.price,
      origin: '',
      folder: r.folder,
      images: [],
      skuData: []
    }))

  ElMessage.success('预览已刷新')
}

const nextStep = () => {
  if (currentStep.value === 1) {
    refreshPreview()
  }
  currentStep.value++
}

const startPublish = async () => {
  if (selectedPlatforms.value.length === 0) {
    ElMessage.warning('请选择至少一个发布平台')
    return
  }

  isPublishing.value = true
  publishProgress.value = 0
  successTasks.value = 0
  failedTasks.value = 0
  publishLogs.value = []

  addLog('info', '开始发布任务...')

  const total = productsToPublish.value.length * selectedPlatforms.value.length
  let completed = 0

  for (const product of productsToPublish.value) {
    for (const platform of selectedPlatforms.value) {
      addLog('info', `正在发布: ${product.title} -> ${platform}`)

      await new Promise(resolve => setTimeout(resolve, 500))

      completed++
      publishProgress.value = Math.round((completed / total) * 100)
      successTasks.value++
    }
  }

  addLog('success', '所有发布任务已完成！')
  isPublishing.value = false
}

const pausePublish = () => {
  isPublishing.value = false
  addLog('warning', '发布已暂停')
}

const resetPublish = () => {
  isPublishing.value = false
  publishProgress.value = 0
  successTasks.value = 0
  failedTasks.value = 0
  publishLogs.value = []
  currentStep.value = 0
}

const addLog = (type: string, message: string) => {
  const now = new Date()
  publishLogs.value.push({
    type,
    time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
    message
  })
}

const browseFile = (type: string) => {
  ElMessage.info('请在输入框中输入文件路径')
}

const browseFolder = (type: string) => {
  ElMessage.info('请在输入框中输入文件夹路径')
}

const getImageUrl = (path: string) => {
  if (!path) return ''
  return `/api/product-library/image?filename=${encodeURIComponent(path)}`
}

onMounted(() => {
  // 初始化
})
</script>

<style scoped>
.product-publish {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
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

.step-content {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-source-section {
  margin-bottom: 20px;
}

.data-source-section h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.section-desc {
  color: #909399;
  font-size: 13px;
  margin: 0 0 15px 0;
}

.field-mapping {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.field-mapping h5 {
  margin: 0 0 15px 0;
  color: #606266;
}

.data-preview {
  margin-top: 20px;
}

.data-preview h5 {
  margin: 0 0 10px 0;
  color: #606266;
}

.preview-info {
  margin-top: 10px;
  color: #909399;
  font-size: 13px;
}

.folder-preview {
  margin-top: 20px;
}

.folder-preview h5 {
  margin: 0 0 10px 0;
  color: #606266;
}

.folder-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.match-settings {
  margin-bottom: 20px;
}

.match-results h5 {
  margin: 0 0 15px 0;
  color: #606266;
}

.match-summary {
  display: flex;
  gap: 30px;
  margin-top: 20px;
  justify-content: center;
}

.publish-settings {
  margin-bottom: 20px;
}

.product-info {
  display: flex;
  gap: 10px;
}

.product-images {
  display: flex;
  align-items: center;
}

.product-details {
  flex: 1;
}

.product-title {
  font-weight: 500;
  margin-bottom: 5px;
}

.product-price {
  color: #f56c6c;
  font-weight: bold;
}

.product-sku {
  font-size: 12px;
  color: #909399;
}

.publish-summary {
  margin-top: 20px;
}

.publish-execution {
  padding: 20px;
}

.publish-log {
  margin: 30px 0;
}

.publish-log h5 {
  margin: 0 0 15px 0;
}

.log-list {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-item {
  margin-bottom: 8px;
  display: flex;
  gap: 15px;
}

.log-item.success .log-message {
  color: #67c23a;
}

.log-item.warning .log-message {
  color: #e6a23c;
}

.log-item.error .log-message {
  color: #f56c6c;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
}

.execution-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

.step-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-step__title) {
  font-size: 14px;
}

:deep(.el-step__description) {
  font-size: 12px;
}
</style>
