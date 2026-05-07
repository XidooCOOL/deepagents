<template>
  <div class="product-library">
    <div class="page-header">
      <h2>📦 商品库</h2>
      <p class="subtitle">管理商品图片、Excel 模板和商品数据，支持批量发布</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 商品管理 Tab -->
      <el-tab-pane label="商品列表" name="products">
        <div class="toolbar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品..."
            style="width: 200px;"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px;">
            <el-option label="全部" value="" />
            <el-option label="待发布" value="ready" />
            <el-option label="已发布" value="published" />
            <el-option label="已下架" value="offline" />
          </el-select>
          <el-select v-model="filterCategory" placeholder="分类" clearable style="width: 120px;">
            <el-option label="全部" value="" />
            <el-option label="服装鞋帽" value="服装鞋帽" />
            <el-option label="数码产品" value="数码产品" />
            <el-option label="家居用品" value="家居用品" />
            <el-option label="食品饮料" value="食品饮料" />
            <el-option label="美妆护肤" value="美妆护肤" />
          </el-select>
          <el-button type="primary" @click="showAddProduct = true" icon="Plus">添加商品</el-button>
          <el-button type="success" @click="showImportDialog = true" icon="Upload">导入 Excel</el-button>
        </div>

        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">商品总数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card ready">
              <div class="stat-value">{{ stats.ready }}</div>
              <div class="stat-label">待发布</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card published">
              <div class="stat-value">{{ stats.published }}</div>
              <div class="stat-label">已发布</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card offline">
              <div class="stat-value">{{ stats.offline }}</div>
              <div class="stat-label">已下架</div>
            </el-card>
          </el-col>
        </el-row>

        <el-table :data="filteredProducts" border stripe>
          <el-table-column type="selection" width="55" />
          <el-table-column label="商品信息" min-width="250">
            <template #default="scope">
              <div class="product-info">
                <el-image
                  v-if="scope.row.images && scope.row.images.length > 0"
                  :src="getImageUrl(scope.row.images[0])"
                  fit="cover"
                  style="width: 60px; height: 60px; border-radius: 4px;"
                />
                <div v-else class="no-image">无图</div>
                <div class="product-details">
                  <div class="product-title">{{ scope.row.title }}</div>
                  <div class="product-id">{{ scope.row.product_id }}</div>
                  <el-tag size="small" v-for="tag in scope.row.tags" :key="tag" style="margin: 2px;">
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="150">
            <template #default="scope">
              <div class="price-info">
                <div class="price">¥{{ scope.row.price }}</div>
                <div class="original-price" v-if="scope.row.original_price">
                  ¥{{ scope.row.original_price }}
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="库存" width="100">
            <template #default="scope">
              <span :class="{ 'low-stock': scope.row.stock < 20 }">
                {{ scope.row.stock }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="100">
            <template #default="scope">
              <el-tag size="small">{{ scope.row.category }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="图片" width="80">
            <template #default="scope">
              <span>{{ scope.row.images ? scope.row.images.length : 0 }} 张</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="editProduct(scope.row)">编辑</el-button>
              <el-button size="small" type="primary" @click="matchImages(scope.row)">匹配图片</el-button>
              <el-button size="small" type="success" @click="publishProduct(scope.row)">
                {{ scope.row.status === 'published' ? '已发布' : '发布' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 图片管理 Tab -->
      <el-tab-pane label="图片管理" name="images">
        <div class="toolbar">
          <el-input
            v-model="imageFolderPath"
            placeholder="输入图片文件夹路径，如：/data/images"
            style="flex: 1;"
            clearable
          >
            <template #append>
              <el-button @click="scanImages">扫描</el-button>
            </template>
          </el-input>
          <el-checkbox v-model="includeSubfolders">包含子目录</el-checkbox>
          <el-button type="primary" @click="scanImages" icon="FolderOpened">扫描文件夹</el-button>
        </div>

        <el-row :gutter="20" class="stats-row" v-if="imageStats.total > 0">
          <el-col :span="8">
            <el-card class="stat-card">
              <div class="stat-value">{{ imageStats.total }}</div>
              <div class="stat-label">图片总数</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="stat-card">
              <div class="stat-value">{{ imageStats.folders }}</div>
              <div class="stat-label">文件夹</div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="stat-card">
              <div class="stat-value">{{ imageStats.scanTime }}s</div>
              <div class="stat-label">扫描耗时</div>
            </el-card>
          </el-col>
        </el-row>

        <div class="image-grid" v-if="images.length > 0">
          <div v-for="(img, index) in images" :key="index" class="image-item" @click="selectImage(img)">
            <el-image
              :src="getImageUrl(img.path)"
              :fit="'cover'"
              style="width: 100%; height: 150px;"
              :preview-src-list="[getImageUrl(img.path)]"
            />
            <div class="image-info">
              <div class="image-name">{{ img.filename }}</div>
              <div class="image-meta">
                <span>{{ img.file_size_formatted }}</span>
                <span v-if="img.width && img.height">{{ img.width }}x{{ img.height }}</span>
              </div>
            </div>
            <div class="image-actions">
              <el-checkbox
                :model-value="selectedImages.includes(img.path)"
                @change="toggleImageSelection(img.path)"
              />
            </div>
          </div>
        </div>

        <el-empty v-else description="请先扫描图片文件夹" />

        <div class="batch-actions" v-if="selectedImages.length > 0">
          <el-badge :value="selectedImages.length" type="primary">
            <el-button>已选中图片</el-button>
          </el-badge>
          <el-button type="primary" @click="batchMatchToProduct">批量匹配到商品</el-button>
          <el-button @click="clearSelection">清空选择</el-button>
        </div>
      </el-tab-pane>

      <!-- Excel 模板 Tab -->
      <el-tab-pane label="Excel 模板" name="excel">
        <div class="toolbar">
          <el-button type="primary" @click="showExcelUpload = true" icon="Upload">上传 Excel</el-button>
          <el-button @click="showExcelPath = true" icon="FolderOpened">输入路径</el-button>
        </div>

        <el-card v-if="excelConfig.filePath" class="excel-preview-card">
          <template #header>
            <div class="card-header">
              <span>Excel 配置</span>
              <el-button size="small" @click="clearExcelConfig">清除</el-button>
            </div>
          </template>
          
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文件路径">
              {{ excelConfig.filePath }}
            </el-descriptions-item>
            <el-descriptions-item label="总行数">
              {{ excelConfig.totalRows }}
            </el-descriptions-item>
            <el-descriptions-item label="列数">
              {{ excelConfig.columns.length }}
            </el-descriptions-item>
            <el-descriptions-item label="可用行数">
              {{ excelConfig.totalRows - 1 }}
            </el-descriptions-item>
          </el-descriptions>

          <el-divider>字段映射配置</el-divider>

          <div class="mapping-form">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="标题字段">
                  <el-select v-model="excelConfig.mappings.title" placeholder="选择列" clearable>
                    <el-option v-for="col in excelConfig.columns" :key="col.name" :label="col.name" :value="col.name" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="价格字段">
                  <el-select v-model="excelConfig.mappings.price" placeholder="选择列" clearable>
                    <el-option v-for="col in excelConfig.columns" :key="col.name" :label="col.name" :value="col.name" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="描述字段">
                  <el-select v-model="excelConfig.mappings.description" placeholder="选择列" clearable>
                    <el-option v-for="col in excelConfig.columns" :key="col.name" :label="col.name" :value="col.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="分类字段">
                  <el-select v-model="excelConfig.mappings.category" placeholder="选择列" clearable>
                    <el-option v-for="col in excelConfig.columns" :key="col.name" :label="col.name" :value="col.name" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="库存字段">
                  <el-select v-model="excelConfig.mappings.stock" placeholder="选择列" clearable>
                    <el-option v-for="col in excelConfig.columns" :key="col.name" :label="col.name" :value="col.name" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="图片文件夹">
                  <el-input v-model="excelConfig.imagesFolder" placeholder="图片文件夹路径" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <el-button type="primary" @click="generateProducts" :loading="generating">
                生成商品预览
              </el-button>
              <el-button type="success" @click="batchCreateProducts" :disabled="generatedProducts.length === 0">
                批量创建 {{ generatedProducts.length }} 个商品
              </el-button>
            </el-form-item>
          </div>

          <el-divider>数据预览（前 5 行）</el-divider>

          <el-table :data="excelConfig.previewData" border size="small" max-height="300">
            <el-table-column v-for="col in excelConfig.columns" :key="col.name" :prop="col.name" :label="col.name" min-width="120" />
          </el-table>
        </el-card>

        <el-empty v-else description="请上传或选择 Excel 文件" />
      </el-tab-pane>

      <!-- 批量发布 Tab -->
      <el-tab-pane label="批量发布" name="batch">
        <div class="batch-publish">
          <el-alert
            title="批量发布功能"
            description="从商品库中选择商品，批量发布到多个平台"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;"
          />

          <el-row :gutter="20">
            <el-col :span="12">
              <el-card>
                <template #header>选择商品</template>
                <el-checkbox-group v-model="selectedProductIds">
                  <el-checkbox
                    v-for="product in products.filter(p => p.status === 'ready')"
                    :key="product.id"
                    :label="product.id"
                    style="display: block; margin-bottom: 10px;"
                  >
                    {{ product.title }} - ¥{{ product.price }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card>
                <template #header>选择平台</template>
                <el-checkbox-group v-model="selectedPlatforms">
                  <el-checkbox label="抖音" style="display: block; margin-bottom: 10px;" />
                  <el-checkbox label="拼多多" style="display: block; margin-bottom: 10px;" />
                  <el-checkbox label="淘宝" style="display: block; margin-bottom: 10px;" />
                  <el-checkbox label="京东" style="display: block; margin-bottom: 10px;" />
                </el-checkbox-group>
              </el-card>
            </el-col>
          </el-row>

          <div class="publish-summary" v-if="selectedProductIds.length > 0 && selectedPlatforms.length > 0">
            <el-alert
              :title="`将发布 ${selectedProductIds.length} 个商品到 ${selectedPlatforms.length} 个平台，共 ${selectedProductIds.length * selectedPlatforms.length} 个任务`"
              type="success"
              show-icon
            />
            <el-button type="primary" size="large" style="margin-top: 20px;" @click="startBatchPublish">
              开始批量发布
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Excel 路径输入对话框 -->
    <el-dialog v-model="showExcelPath" title="输入 Excel 文件路径" width="500px">
      <el-input v-model="excelFilePath" placeholder="输入 Excel 文件路径，如：/data/templates/products.xlsx" />
      <template #footer>
        <el-button @click="showExcelPath = false">取消</el-button>
        <el-button type="primary" @click="loadExcelFromPath">加载</el-button>
      </template>
    </el-dialog>

    <!-- Excel 上传对话框 -->
    <el-dialog v-model="showExcelUpload" title="上传 Excel 文件" width="500px">
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleExcelChange"
        accept=".xlsx,.xls,.csv"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx, .xls, .csv 格式</div>
        </template>
      </el-upload>
    </el-dialog>

    <!-- 商品编辑对话框 -->
    <el-dialog v-model="showEditProduct" :title="editingProduct?.id ? '编辑商品' : '添加商品'" width="800px">
      <el-form :model="productForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商品标题" required>
              <el-input v-model="productForm.title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品分类">
              <el-select v-model="productForm.category" style="width: 100%;">
                <el-option label="服装鞋帽" value="服装鞋帽" />
                <el-option label="数码产品" value="数码产品" />
                <el-option label="家居用品" value="家居用品" />
                <el-option label="食品饮料" value="食品饮料" />
                <el-option label="美妆护肤" value="美妆护肤" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="价格" required>
              <el-input-number v-model="productForm.price" :min="0" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原价">
              <el-input-number v-model="productForm.original_price" :min="0" :precision="2" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="库存">
              <el-input-number v-model="productForm.stock" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="商品描述">
          <el-input v-model="productForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="商品标签">
          <el-select v-model="productForm.tags" multiple filterable allow-create default-first-option placeholder="输入标签" style="width: 100%;">
            <el-option label="新品" value="新品" />
            <el-option label="热卖" value="热卖" />
            <el-option label="推荐" value="推荐" />
            <el-option label="促销" value="促销" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="image-list">
            <div v-for="(img, index) in productForm.images" :key="index" class="image-item-small">
              <el-image :src="getImageUrl(img)" fit="cover" style="width: 80px; height: 80px;" />
              <el-button type="danger" size="small" circle @click="removeProductImage(index)">×</el-button>
            </div>
            <el-button @click="showImagePicker = true" style="width: 80px; height: 80px;">+</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditProduct = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <!-- 图片选择对话框 -->
    <el-dialog v-model="showImagePicker" title="选择图片" width="80%">
      <div class="toolbar">
        <el-input v-model="pickerImageFolder" placeholder="图片文件夹路径" style="flex: 1;" />
        <el-button @click="loadPickerImages">加载</el-button>
      </div>
      <div class="image-grid">
        <div v-for="(img, index) in pickerImages" :key="index" class="image-item" @click="selectPickerImage(img.path)">
          <el-image :src="getImageUrl(img.path)" fit="cover" style="width: 100%; height: 100px;" />
          <div class="image-name">{{ img.filename }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入商品" width="80%">
      <el-steps :active="importStep" align-center>
        <el-step title="选择文件" />
        <el-step title="配置映射" />
        <el-step title="预览确认" />
      </el-steps>

      <div v-if="importStep === 0" class="import-step">
        <el-upload
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleImportFile"
          accept=".xlsx,.xls,.csv"
          style="width: 100%;"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div>拖拽文件或点击上传 Excel 文件</div>
        </el-upload>
        <el-divider>或输入已有文件路径</el-divider>
        <el-input v-model="importFilePath" placeholder="输入 Excel 文件路径">
          <template #append>
            <el-button @click="loadImportFile">加载</el-button>
          </template>
        </el-input>
      </div>

      <div v-else-if="importStep === 1" class="import-step">
        <el-form label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="标题列">
                <el-select v-model="importMappings.title" style="width: 100%;">
                  <el-option v-for="col in importExcelData.columns" :key="col.name" :label="col.name" :value="col.name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="价格列">
                <el-select v-model="importMappings.price" style="width: 100%;">
                  <el-option v-for="col in importExcelData.columns" :key="col.name" :label="col.name" :value="col.name" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="描述列">
                <el-select v-model="importMappings.description" style="width: 100%;">
                  <el-option v-for="col in importExcelData.columns" :key="col.name" :label="col.name" :value="col.name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分类列">
                <el-select v-model="importMappings.category" style="width: 100%;">
                  <el-option v-for="col in importExcelData.columns" :key="col.name" :label="col.name" :value="col.name" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="图片文件夹">
            <el-input v-model="importImagesFolder" placeholder="图片文件夹路径">
              <template #append>
                <el-checkbox v-model="importIncludeSubfolders">包含子目录</el-checkbox>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <div v-else-if="importStep === 2" class="import-step">
        <el-alert
          :title="`将创建 ${importPreviewData.length} 个商品`"
          type="success"
          show-icon
          style="margin-bottom: 20px;"
        />
        <el-table :data="importPreviewData.slice(0, 10)" border size="small" max-height="300">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="price" label="价格" />
          <el-table-column prop="category" label="分类" />
          <el-table-column prop="image_count" label="图片数" width="80" />
        </el-table>
        <el-pagination
          v-if="importPreviewData.length > 10"
          layout="prev, pager, next"
          :total="importPreviewData.length"
          :page-size="10"
          style="margin-top: 20px; justify-content: center;"
        />
      </div>

      <template #footer>
        <el-button v-if="importStep > 0" @click="importStep--">上一步</el-button>
        <el-button v-if="importStep < 2" type="primary" @click="nextImportStep">下一步</el-button>
        <el-button v-else type="success" @click="confirmImport" :loading="importing">
          确认导入 {{ importPreviewData.length }} 个商品
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, UploadFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const activeTab = ref('products')
const searchKeyword = ref('')
const filterStatus = ref('')
const filterCategory = ref('')
const showAddProduct = ref(false)
const showEditProduct = ref(false)
const showImportDialog = ref(false)
const showExcelPath = ref(false)
const showExcelUpload = ref(false)
const showImagePicker = ref(false)
const generating = ref(false)
const importing = ref(false)

const excelFilePath = ref('')
const imageFolderPath = ref('')
const includeSubfolders = ref(false)
const images = ref<any[]>([])
const selectedImages = ref<string[]>([])
const pickerImageFolder = ref('')
const pickerImages = ref<any[]>([])
const editingProduct = ref<any>(null)

const excelConfig = ref({
  filePath: '',
  totalRows: 0,
  columns: [] as any[],
  previewData: [] as any[],
  mappings: {
    title: '',
    price: '',
    description: '',
    category: '',
    stock: ''
  },
  imagesFolder: ''
})

const generatedProducts = ref<any[]>([])

const importStep = ref(0)
const importFilePath = ref('')
const importFile = ref<any>(null)
const importExcelData = ref({ columns: [], rows: [] })
const importMappings = ref({
  title: '',
  price: '',
  description: '',
  category: ''
})
const importImagesFolder = ref('')
const importIncludeSubfolders = ref(false)
const importPreviewData = ref<any[]>([])

const selectedProductIds = ref<number[]>([])
const selectedPlatforms = ref<string[]>([])

const products = ref([
  {
    id: 1,
    product_id: 'PRD100001',
    title: '2024夏季新款运动鞋男透气轻便跑步鞋',
    price: 299.00,
    original_price: 399.00,
    stock: 150,
    status: 'ready',
    category: '服装鞋帽',
    tags: ['新品', '热卖'],
    images: [],
    description: '轻便透气，适合跑步和日常穿着'
  },
  {
    id: 2,
    product_id: 'PRD100002',
    title: '智能蓝牙耳机Pro降噪无线耳机',
    price: 199.00,
    original_price: 299.00,
    stock: 80,
    status: 'published',
    category: '数码产品',
    tags: ['新品'],
    images: [],
    description: '主动降噪，长续航，高品质音质'
  },
  {
    id: 3,
    product_id: 'PRD100003',
    title: '家用收纳箱套装大容量储物箱',
    price: 89.00,
    original_price: 129.00,
    stock: 200,
    status: 'ready',
    category: '家居用品',
    tags: ['推荐'],
    images: [],
    description: '塑料收纳箱，适合衣柜和储物'
  }
])

const stats = computed(() => ({
  total: products.value.length,
  ready: products.value.filter(p => p.status === 'ready').length,
  published: products.value.filter(p => p.status === 'published').length,
  offline: products.value.filter(p => p.status === 'offline').length
}))

const imageStats = computed(() => ({
  total: images.value.length,
  folders: new Set(images.value.map(img => img.path.split('/').slice(0, -1).join('/'))).size,
  scanTime: 0
}))

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    if (searchKeyword.value && !p.title.toLowerCase().includes(searchKeyword.value.toLowerCase())) return false
    if (filterStatus.value && p.status !== filterStatus.value) return false
    if (filterCategory.value && p.category !== filterCategory.value) return false
    return true
  })
})

const productForm = ref({
  title: '',
  price: 0,
  original_price: 0,
  stock: 100,
  category: '服装鞋帽',
  description: '',
  tags: [] as string[],
  images: [] as string[]
})

const getImageUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/product-library/image?filename=${encodeURIComponent(path)}`
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    draft: 'info',
    ready: 'warning',
    published: 'success',
    offline: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    draft: '草稿',
    ready: '待发布',
    published: '已发布',
    offline: '已下架'
  }
  return texts[status] || status
}

const scanImages = async () => {
  if (!imageFolderPath.value) {
    ElMessage.warning('请输入图片文件夹路径')
    return
  }

  try {
    const response = await axios.post('/api/product-library/scan-folder', {
      path: imageFolderPath.value,
      include_subfolders: includeSubfolders.value,
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      max_count: 500
    })

    images.value = response.data.images
    ElMessage.success(`扫描完成，找到 ${response.data.total} 张图片`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '扫描失败')
  }
}

const selectImage = (img: any) => {
  const index = selectedImages.value.indexOf(img.path)
  if (index === -1) {
    selectedImages.value.push(img.path)
  } else {
    selectedImages.value.splice(index, 1)
  }
}

const toggleImageSelection = (path: string) => {
  const index = selectedImages.value.indexOf(path)
  if (index === -1) {
    selectedImages.value.push(path)
  } else {
    selectedImages.value.splice(index, 1)
  }
}

const clearSelection = () => {
  selectedImages.value = []
}

const batchMatchToProduct = () => {
  ElMessage.success(`已选择 ${selectedImages.value.length} 张图片，可用于匹配商品`)
}

const loadExcelFromPath = async () => {
  if (!excelFilePath.value) {
    ElMessage.warning('请输入文件路径')
    return
  }

  try {
    const response = await axios.post('/api/product-library/excel/preview', {
      file_path: excelFilePath.value,
      max_rows: 10
    })

    excelConfig.value.filePath = excelFilePath.value
    excelConfig.value.totalRows = response.data.total_rows
    excelConfig.value.columns = response.data.columns
    excelConfig.value.previewData = response.data.rows

    showExcelPath.value = false
    activeTab.value = 'excel'
    ElMessage.success('Excel 文件加载成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '加载失败')
  }
}

const handleExcelChange = (file: any) => {
  excelFilePath.value = file.raw.path
}

const clearExcelConfig = () => {
  excelConfig.value = {
    filePath: '',
    totalRows: 0,
    columns: [],
    previewData: [],
    mappings: { title: '', price: '', description: '', category: '', stock: '' },
    imagesFolder: ''
  }
}

const generateProducts = async () => {
  if (!excelConfig.value.mappings.title) {
    ElMessage.warning('请选择标题字段映射')
    return
  }

  generating.value = true

  try {
    const response = await axios.post('/api/product-library/products/from-excel', {
      file_path: excelConfig.value.filePath,
      mappings: excelConfig.value.mappings,
      images_folder: excelConfig.value.imagesFolder,
      include_subfolders: includeSubfolders.value
    })

    generatedProducts.value = response.data.products
    ElMessage.success(`生成了 ${response.data.total} 个商品预览`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '生成失败')
  }

  generating.value = false
}

const batchCreateProducts = () => {
  products.value.push(...generatedProducts.value)
  ElMessage.success(`已添加 ${generatedProducts.value.length} 个商品`)
  generatedProducts.value = []
}

const editProduct = (product: any) => {
  editingProduct.value = product
  productForm.value = { ...product }
  showEditProduct.value = true
}

const saveProduct = () => {
  if (editingProduct.value) {
    Object.assign(editingProduct.value, productForm.value)
    ElMessage.success('商品已更新')
  } else {
    products.value.push({
      id: Date.now(),
      product_id: `PRD${Date.now()}`,
      ...productForm.value,
      status: 'ready'
    })
    ElMessage.success('商品已添加')
  }
  showEditProduct.value = false
}

const removeProductImage = (index: number) => {
  productForm.value.images.splice(index, 1)
}

const matchImages = (product: any) => {
  ElMessage.info('请到"图片管理"中选择图片后匹配')
  activeTab.value = 'images'
}

const publishProduct = (product: any) => {
  if (product.status === 'published') {
    ElMessage.info('该商品已发布')
    return
  }
  product.status = 'published'
  ElMessage.success(`商品 "${product.title}" 已发布`)
}

const loadPickerImages = async () => {
  if (!pickerImageFolder.value) return

  try {
    const response = await axios.post('/api/product-library/scan-folder', {
      path: pickerImageFolder.value,
      include_subfolders: true,
      max_count: 100
    })
    pickerImages.value = response.data.images
  } catch (error) {
    ElMessage.error('加载图片失败')
  }
}

const selectPickerImage = (path: string) => {
  if (!productForm.value.images.includes(path)) {
    productForm.value.images.push(path)
  }
  showImagePicker.value = false
}

const handleImportFile = (file: any) => {
  importFile.value = file
  importFilePath.value = file.raw.path
}

const loadImportFile = async () => {
  if (!importFilePath.value) {
    ElMessage.warning('请输入文件路径')
    return
  }

  try {
    const response = await axios.post('/api/product-library/excel/preview', {
      file_path: importFilePath.value,
      max_rows: 10
    })
    importExcelData.value = {
      columns: response.data.columns,
      rows: response.data.rows
    }
    importStep.value = 1
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '加载失败')
  }
}

const nextImportStep = () => {
  if (importStep.value === 1) {
    if (!importMappings.value.title || !importMappings.value.price) {
      ElMessage.warning('请至少配置标题和价格字段')
      return
    }
    importPreviewData.value = importExcelData.value.rows
  }
  importStep.value++
}

const confirmImport = async () => {
  importing.value = true

  try {
    const response = await axios.post('/api/product-library/products/from-excel', {
      file_path: importFilePath.value,
      mappings: importMappings.value,
      images_folder: importImagesFolder.value,
      include_subfolders: importIncludeSubfolders.value
    })

    products.value.push(...response.data.products)
    ElMessage.success(`成功导入 ${response.data.total} 个商品`)
    showImportDialog.value = false
    importStep.value = 0
  } catch (error: any) {
    ElMessage.error(error.response?.data?.detail || '导入失败')
  }

  importing.value = false
}

const startBatchPublish = () => {
  const count = selectedProductIds.value.length * selectedPlatforms.value.length
  ElMessageBox.confirm(
    `确认发布 ${selectedProductIds.value.length} 个商品到 ${selectedPlatforms.value.length} 个平台？共 ${count} 个任务。`,
    '批量发布确认',
    {
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    ElMessage.success('批量发布任务已创建，请在任务管理中查看')
  }).catch(() => {})
}

onMounted(() => {})
</script>

<style scoped>
.product-library { padding: 20px; }

.page-header { margin-bottom: 30px; }
.page-header h2 { margin: 0 0 10px 0; font-size: 28px; color: #303133; }
.subtitle { color: #909399; margin: 0; }

.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }

.stats-row { margin-bottom: 20px; }

.stat-card { text-align: center; padding: 20px; }
.stat-card .stat-value { font-size: 28px; font-weight: bold; color: #409eff; }
.stat-card .stat-label { color: #909399; margin-top: 5px; }
.stat-card.ready .stat-value { color: #e6a23c; }
.stat-card.published .stat-value { color: #67c23a; }
.stat-card.offline .stat-value { color: #f56c6c; }

.product-info { display: flex; gap: 10px; }
.product-details { flex: 1; }
.product-title { font-weight: 500; margin-bottom: 4px; }
.product-id { font-size: 12px; color: #909399; margin-bottom: 5px; }

.no-image {
  width: 60px; height: 60px;
  background: #f5f7fa;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; color: #909399; font-size: 12px;
}

.price-info .price { font-weight: bold; color: #f56c6c; font-size: 16px; }
.price-info .original-price { text-decoration: line-through; color: #909399; font-size: 12px; }

.low-stock { color: #f56c6c; font-weight: bold; }

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.image-item {
  position: relative;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.image-item:hover { border-color: #409eff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

.image-info { padding: 8px; background: #f5f7fa; }
.image-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.image-meta { display: flex; justify-content: space-between; font-size: 11px; color: #909399; margin-top: 4px; }

.image-actions {
  position: absolute; top: 8px; right: 8px;
  background: white; border-radius: 50%;
  padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.batch-actions {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: white; padding: 15px 25px; border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex; gap: 15px; align-items: center;
  z-index: 1000;
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.mapping-form { margin: 20px 0; }

.excel-preview-card { margin-top: 20px; }

.batch-publish { padding: 10px; }

.publish-summary { margin-top: 30px; text-align: center; }

.import-step { padding: 20px 0; }

.image-list { display: flex; gap: 10px; flex-wrap: wrap; }
.image-item-small { position: relative; }
.image-item-small .el-button {
  position: absolute; top: -8px; right: -8px;
  width: 20px; height: 20px; padding: 0;
}

:deep(.el-upload-dragger) { padding: 40px; }
</style>
