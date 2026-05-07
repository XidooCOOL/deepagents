<template>
  <div class="elements-manager">
    <div class="page-header">
      <h2>🔧 DOM 元素管理中心</h2>
      <p class="subtitle">管理各平台的页面元素，支持多选择器、版本管理和 Playwright 调试</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="元素列表" name="list">
        <div class="toolbar">
          <el-select v-model="selectedPlatform" placeholder="选择平台" style="width: 150px;" @change="onPlatformChange">
            <el-option-group label="电商平台">
              <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
            </el-option-group>
          </el-select>
          <el-select v-model="selectedPage" placeholder="选择页面" style="width: 150px;" @change="loadElements">
            <el-option-group :label="getPlatformName(selectedPlatform) + ' 页面'">
              <el-option v-for="page in pageOptions" :key="page.value" :label="page.label" :value="page.value" />
            </el-option-group>
          </el-select>
          <el-input v-model="searchKeyword" placeholder="搜索元素名称" style="width: 200px;" clearable>
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="openAddModal" icon="Plus">添加元素</el-button>
          <el-button @click="showImportDialog = true" icon="Upload">批量导入</el-button>
          <el-button @click="exportElements" icon="Download">导出</el-button>
        </div>

        <div v-if="selectedElements.length > 0" class="batch-toolbar">
          <el-tag type="primary">已选择 {{ selectedElements.length }} 个元素</el-tag>
          <el-button size="small" @click="batchEnable" type="success">批量启用</el-button>
          <el-button size="small" @click="batchDisable" type="warning">批量禁用</el-button>
          <el-button size="small" @click="batchUpdatePage" type="info">批量修改页面</el-button>
          <el-button size="small" @click="batchDelete" type="danger">批量删除</el-button>
          <el-button size="small" @click="clearSelection">清空选择</el-button>
        </div>

        <el-table :data="filteredElements" border stripe @selection-change="onSelectionChange">
          <el-table-column type="selection" width="55" />
          <el-table-column label="元素信息" min-width="200">
            <template #default="scope">
              <div class="element-info">
                <div class="element-name">
                  <strong>{{ scope.row.name }}</strong>
                  <el-tag size="small" type="info" style="margin-left: 8px;">{{ getActionLabel(scope.row.action_type) }}</el-tag>
                </div>
                <div class="element-desc">{{ scope.row.description || '无描述' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="主选择器" min-width="180">
            <template #default="scope">
              <code class="selector-code">{{ scope.row.selectors?.[0]?.value || scope.row.selector }}</code>
              <el-tag size="small" type="primary" style="margin-left: 5px;">
                {{ scope.row.selectors?.[0]?.type || scope.row.selector_type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="备用选择器" min-width="200">
            <template #default="scope">
              <div v-if="scope.row.selectors && scope.row.selectors.length > 1" class="backup-selectors">
                <el-tag v-for="(sel, idx) in scope.row.selectors.slice(1)" :key="idx" size="small" style="margin: 2px;">
                  {{ sel.type }}: {{ sel.value }}
                </el-tag>
              </div>
              <span v-else class="no-backup">无备用</span>
            </template>
          </el-table-column>
          <el-table-column label="版本" width="80">
            <template #default="scope">
              <el-tag size="small">v{{ scope.row.version }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-switch v-model="scope.row.is_active" @change="updateElement(scope.row)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" @click="testSelector(scope.row)" icon="View">测试</el-button>
              <el-button size="small" type="success" @click="debugWithPlaywright(scope.row)" icon="Monitor">调试</el-button>
              <el-button size="small" @click="editElement(scope.row)" icon="Edit">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteElement(scope.row)" icon="Delete">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="页面调试" name="debug">
        <div class="debug-toolbar">
          <el-button type="primary" @click="loadStores" :loading="loadingStores" size="small">
            🔄 刷新店铺
          </el-button>
          <el-tag v-if="currentStore" type="success">
            当前店铺: {{ currentStore.name }} ({{ getPlatformLabel(currentStore.platform) }})
          </el-tag>
          <el-tag v-if="browserInfo" type="info">
            浏览器状态: {{ browserInfo.active_tabs }} 个活跃 Tab
          </el-tag>
        </div>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="debug-config">
              <template #header>
                <span>🔍 Playwright 页面调试</span>
              </template>
              <el-form :model="debugConfig" label-width="100px" label-position="top">
                <el-form-item label="选择店铺">
                  <el-select v-model="debugConfig.storeId" placeholder="选择已登录店铺" style="width: 100%;" @change="onStoreChange">
                    <el-option-group v-for="group in storeGroups" :key="group.label" :label="group.label">
                      <el-option v-for="store in group.options" :key="store.id" :label="store.name" :value="store.id">
                        <div class="store-option">
                          <span>{{ store.name }}</span>
                          <el-tag v-if="store.has_browser" size="small" type="success" style="margin-left: 8px;">已登录</el-tag>
                          <el-tag v-else size="small" type="info" style="margin-left: 8px;">未启动</el-tag>
                        </div>
                      </el-option>
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item label="页面URL">
                  <el-input v-model="debugConfig.url" placeholder="输入页面URL">
                    <template #append>
                      <el-button @click="loadPresetUrl">预设</el-button>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item label="预设页面">
                  <el-select v-model="debugConfig.presetPage" placeholder="选择预设页面" clearable style="width: 100%;" @change="loadPresetUrl">
                    <el-option-group label="登录">
                      <el-option label="登录页" value="login" />
                    </el-option-group>
                    <el-option-group label="商品">
                      <el-option label="商品发布页" value="publish" />
                      <el-option label="发布成功页" value="publish_success" />
                      <el-option label="商品列表" value="goods_list" />
                    </el-option-group>
                    <el-option-group label="订单">
                      <el-option label="订单列表" value="order_list" />
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item label="等待选择器">
                  <el-input v-model="debugConfig.waitSelector" placeholder="等待元素出现" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="openDebugPage" :loading="openingPage" style="width: 100%;" :disabled="!debugConfig.storeId">
                    <el-icon><Monitor /></el-icon>
                    打开页面
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>

            <el-card class="selector-tester" style="margin-top: 20px;">
              <template #header>
                <span>🧪 选择器测试</span>
              </template>
              <el-form :model="selectorTest" label-width="100px" label-position="top">
                <el-form-item label="选择器">
                  <el-input v-model="selectorTest.selector" placeholder="输入 CSS/XPath 选择器">
                    <template #append>
                      <el-button @click="testCurrentSelector" :loading="testing" type="primary" :disabled="!debugConfig.storeId">
                        测试
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>
                <el-form-item label="选择器类型">
                  <el-radio-group v-model="selectorTest.selectorType">
                    <el-radio-button label="css">CSS</el-radio-button>
                    <el-radio-button label="xpath">XPath</el-radio-button>
                    <el-radio-button label="text">文本</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="操作类型">
                  <el-select v-model="selectorTest.actionType" style="width: 100%;">
                    <el-option label="点击 (click)" value="click" />
                    <el-option label="输入 (input)" value="input" />
                    <el-option label="提取 (extract)" value="extract" />
                    <el-option label="等待 (wait)" value="wait" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button @click="highlightElement" :disabled="!pageOpened || !selectorTest.selector || !debugConfig.storeId" type="warning" style="width: 100%;">
                    <el-icon><Aim /></el-icon>
                    高亮元素
                  </el-button>
                </el-form-item>
              </el-form>

              <el-divider>测试结果</el-divider>
              <div v-if="testResult" class="test-result">
                <el-alert :type="testResult.success ? 'success' : 'error'" :title="testResult.message" show-icon />
                <el-descriptions v-if="testResult.success" :column="2" border style="margin-top: 15px;">
                  <el-descriptions-item label="找到元素">
                    <el-tag :type="testResult.found ? 'success' : 'danger'">
                      {{ testResult.found ? '是' : '否' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="元素数量">
                    {{ testResult.count || 0 }}
                  </el-descriptions-item>
                  <el-descriptions-item label="元素文本" :span="2">
                    <code>{{ testResult.text || '-' }}</code>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="testResult.boundingBox" label="位置" :span="2">
                    x: {{ testResult.boundingBox.x }}, y: {{ testResult.boundingBox.y }},
                    {{ testResult.boundingBox.width }}x{{ testResult.boundingBox.height }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-card>
          </el-col>

          <el-col :span="16">
            <el-card class="page-preview">
              <template #header>
                <div class="preview-header">
                  <span>📷 页面预览</span>
                  <div>
                    <el-button size="small" @click="takeScreenshot" :disabled="!pageOpened || !debugConfig.storeId">
                      截图
                    </el-button>
                    <el-button size="small" @click="refreshPage" :disabled="!pageOpened || !debugConfig.storeId">
                      刷新
                    </el-button>
                  </div>
                </div>
              </template>
              <div class="preview-container">
                <img v-if="screenshotUrl" :src="screenshotUrl" alt="页面截图" class="preview-image" @error="handleImageError" />
                <div v-else class="no-preview">
                  <el-icon :size="48"><Picture /></el-icon>
                  <p>暂无截图</p>
                  <p class="hint">请先选择店铺并打开页面</p>
                </div>
              </div>
            </el-card>

            <el-card v-if="pageInfo" style="margin-top: 20px;">
              <template #header>
                <span>📊 页面信息</span>
              </template>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="页面标题">{{ pageInfo.title }}</el-descriptions-item>
                <el-descriptions-item label="URL">{{ pageInfo.url }}</el-descriptions-item>
                <el-descriptions-item label="视口大小">{{ pageInfo.viewport?.width }}x{{ pageInfo.viewport?.height }}</el-descriptions-item>
                <el-descriptions-item label="输入框">{{ pageInfo.elements?.inputs || 0 }} 个</el-descriptions-item>
                <el-descriptions-item label="按钮">{{ pageInfo.elements?.buttons || 0 }} 个</el-descriptions-item>
                <el-descriptions-item label="链接">{{ pageInfo.elements?.links || 0 }} 个</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="批量导入导出" name="import-export">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>📤 导出元素</span>
              </template>
              <el-form label-width="100px">
                <el-form-item label="导出范围">
                  <el-radio-group v-model="exportConfig.scope">
                    <el-radio label="all">全部</el-radio>
                    <el-radio label="platform">按平台</el-radio>
                    <el-radio label="page">按页面</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item v-if="exportConfig.scope === 'platform'" label="选择平台">
                  <el-select v-model="exportConfig.platform" style="width: 100%;">
                    <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="exportConfig.scope === 'page'" label="选择页面">
                  <el-cascader v-model="exportConfig.platformPage" :options="platformPageOptions" style="width: 100%;" />
                </el-form-item>
                <el-form-item label="导出格式">
                  <el-radio-group v-model="exportConfig.format">
                    <el-radio label="json">JSON</el-radio>
                    <el-radio label="csv">CSV</el-radio>
                    <el-radio label="excel">Excel</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="doExport" icon="Download">导出</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>📥 导入元素</span>
              </template>
              <el-upload drag action="#" :auto-upload="false" :on-change="handleImportFile" :limit="1" accept=".json,.csv,.xlsx">
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div>拖拽文件或点击上传</div>
                <template #tip>
                  <div class="el-upload__tip">支持 JSON、CSV、Excel 格式</div>
                </template>
              </el-upload>
              <el-button v-if="importFile" type="primary" @click="doImport" style="margin-top: 15px; width: 100%;">
                确认导入 {{ importFile.name }}
              </el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="版本历史" name="versions">
        <el-alert title="版本管理功能" description="元素修改会自动记录版本历史，可以随时回滚到之前的版本" type="info" :closable="false" style="margin-bottom: 20px;" />
        <el-table :data="versionHistory" border>
          <el-table-column prop="name" label="元素名称" />
          <el-table-column prop="version" label="版本" width="80" />
          <el-table-column prop="selector" label="选择器" min-width="150">
            <template #default="scope">
              <code>{{ scope.row.selector }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="修改时间" width="180" />
          <el-table-column prop="updated_by" label="修改人" width="120" />
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button size="small" type="primary" @click="rollbackVersion(scope.row)">回滚</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="预设模板" name="templates">
        <el-alert title="预设模板" description="使用预设模板快速创建元素配置，支持平台改版后快速更新" type="info" :closable="false" style="margin-bottom: 20px;" />
        <el-row :gutter="20">
          <el-col :span="8" v-for="template in templates" :key="template.name">
            <el-card shadow="hover" class="template-card">
              <template #header>
                <div class="template-header">
                  <span>{{ template.name }}</span>
                  <el-tag size="small">{{ template.count }} 个元素</el-tag>
                </div>
              </template>
              <div class="template-desc">{{ template.description }}</div>
              <div class="template-platforms">
                <el-tag v-for="p in template.platforms" :key="p" size="small" style="margin: 2px;">{{ p }}</el-tag>
              </div>
              <el-button type="primary" size="small" @click="applyTemplate(template)" style="margin-top: 15px; width: 100%;">
                应用模板
              </el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showAddModal" :title="editingElement ? '编辑元素' : '添加元素'" width="800px" :fullscreen="isFullscreen">
      <el-form :model="elementForm" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="元素名称" required>
              <el-input v-model="elementForm.name" placeholder="例如: goods_id_input" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示名称">
              <el-input v-model="elementForm.display_name" placeholder="例如: 商品ID输入框" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="elementForm.description" placeholder="元素用途描述" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="elementForm.action_type" style="width: 100%;">
            <el-option label="🖱️ 点击 (click)" value="click" />
            <el-option label="⌨️ 输入 (input)" value="input" />
            <el-option label="📤 上传 (upload)" value="upload" />
            <el-option label="📋 提取 (extract)" value="extract" />
            <el-option label="⏳ 等待 (wait)" value="wait" />
            <el-option label="🔗 导航 (navigate)" value="navigate" />
          </el-select>
        </el-form-item>

        <el-divider>选择器配置 <span style="color: #909399; font-weight: normal;">（主选择器失效时自动尝试备用）</span></el-divider>

        <div v-for="(selector, index) in elementForm.selectors" :key="index" class="selector-item">
          <el-row :gutter="10">
            <el-col :span="3">
              <el-tag :type="index === 0 ? 'success' : 'info'" size="small">
                {{ index === 0 ? '主' : `备${index}` }}
              </el-tag>
            </el-col>
            <el-col :span="4">
              <el-select v-model="selector.type" placeholder="类型">
                <el-option label="CSS" value="css" />
                <el-option label="XPath" value="xpath" />
                <el-option label="ID" value="id" />
                <el-option label="Class" value="class" />
                <el-option label="文本" value="text" />
              </el-select>
            </el-col>
            <el-col :span="13">
              <el-input v-model="selector.value" :placeholder="getSelectorPlaceholder(selector.type)" />
            </el-col>
            <el-col :span="4">
              <el-button v-if="elementForm.selectors.length > 1" type="danger" icon="Delete" circle @click="removeSelector(index)" />
              <el-button v-if="debugConfig.storeId && selector.value" type="success" icon="View" circle @click="testSingleSelector(selector, index)" :loading="testingSelectorIndex === index" />
            </el-col>
          </el-row>
        </div>

        <el-button type="primary" plain @click="addSelector" icon="Plus">添加备用选择器</el-button>

        <el-divider content-position="left">测试选择器</el-divider>
        <div class="selector-test-section">
          <el-button @click="testFormSelector" :loading="testingFormSelector" type="primary" :disabled="!debugConfig.storeId">
            🧪 批量测试所有选择器
          </el-button>
          <el-button @click="switchToDebug" type="warning">🔍 打开调试面板</el-button>
        </div>

        <div v-if="selectorTestResults.length > 0" class="test-results-list">
          <el-divider>测试结果</el-divider>
          <el-table :data="selectorTestResults" size="small">
            <el-table-column prop="index" label="#" width="60" />
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="value" label="选择器" />
            <el-table-column prop="found" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.found ? 'success' : 'danger'" size="small">
                  {{ scope.row.found ? '✓ 找到' : '✗ 未找到' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="数量" width="80" />
          </el-table>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="showAddModal = false">取消</el-button>
        <el-button @click="isFullscreen = !isFullscreen">{{ isFullscreen ? '退出全屏' : '全屏编辑' }}</el-button>
        <el-button type="primary" @click="saveElement">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showImportDialog" title="批量导入元素" width="600px">
      <el-alert title="导入说明" type="info" :closable="false" style="margin-bottom: 20px;">
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>支持 JSON、CSV、Excel 格式</li>
          <li>JSON 格式：包含 elements 数组</li>
          <li>导入会覆盖现有同名元素</li>
        </ul>
      </el-alert>
      <el-upload drag action="#" :auto-upload="false" :on-change="handleImportFile" accept=".json,.csv,.xlsx" style="width: 100%;">
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div>拖拽文件到此处或点击上传</div>
      </el-upload>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="doImport" :disabled="!importFile">导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchPageDialog" title="批量修改页面" width="400px">
      <el-form label-width="100px">
        <el-form-item label="目标平台">
          <el-select v-model="batchUpdateData.platform" style="width: 100%;">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标页面">
          <el-select v-model="batchUpdateData.page" style="width: 100%;">
            <el-option v-for="page in pageOptions" :key="page.value" :label="page.label" :value="page.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchPageDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchUpdatePage">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, UploadFilled, Download, View, Edit, Delete, Monitor, Camera, Aim, Picture } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = '/api/playwright-debug'

const activeTab = ref('list')
const selectedPlatform = ref('pinduoduo')
const selectedPage = ref('login')
const searchKeyword = ref('')
const showAddModal = ref(false)
const showImportDialog = ref(false)
const showBatchPageDialog = ref(false)
const editingElement = ref<any>(null)
const selectedElements = ref<any[]>([])
const isFullscreen = ref(false)
const testingFormSelector = ref(false)
const testingSelectorIndex = ref<number | null>(null)
const selectorTestResults = ref<any[]>([])
const importFile = ref<any>(null)
const loadingStores = ref(false)
const browserInfo = ref<any>(null)

const stores = ref<any[]>([])
const currentStore = ref<any>(null)

const platforms = [
  { value: 'pinduoduo', label: '拼多多' },
  { value: 'douyin', label: '抖音' },
  { value: 'taobao', label: '淘宝' },
  { value: 'jd', label: '京东' }
]

const pageOptions = [
  { value: 'login', label: '登录页' },
  { value: 'publish', label: '商品发布页' },
  { value: 'publish_success', label: '发布成功页' },
  { value: 'product_detail', label: '商品详情页' },
  { value: 'order_list', label: '订单列表页' },
  { value: 'order_detail', label: '订单详情页' }
]

const elements = ref<any[]>([])
const versionHistory = ref<any[]>([])

const elementForm = ref({
  name: '',
  display_name: '',
  description: '',
  action_type: 'click',
  selectors: [{ type: 'css', value: '' }]
})

const debugConfig = ref({
  storeId: null as number | null,
  url: '',
  presetPage: '',
  waitSelector: ''
})

const selectorTest = ref({
  selector: '',
  selectorType: 'css',
  actionType: 'click'
})

const testResult = ref<any>(null)
const openingPage = ref(false)
const testing = ref(false)
const pageOpened = ref(false)
const screenshotUrl = ref('')
const pageInfo = ref<any>(null)

const exportConfig = ref({
  scope: 'all',
  platform: 'pinduoduo',
  platformPage: [],
  format: 'json'
})

const batchUpdateData = ref({
  platform: 'pinduoduo',
  page: 'login'
})

const templates = ref([
  { name: '商品发布基础', description: '包含商品标题、价格、描述等输入框', platforms: ['拼多多', '抖音', '淘宝'], count: 8 },
  { name: '登录表单', description: '用户名、密码、验证码输入框', platforms: ['拼多多', '抖音', '淘宝', '京东'], count: 5 },
  { name: '发布成功提取', description: '提取商品ID、链接等信息', platforms: ['拼多多', '抖音'], count: 4 }
])

const storeGroups = computed(() => {
  const groups: Record<string, any[]> = {}
  stores.value.forEach(store => {
    const label = getPlatformLabel(store.platform) + '平台'
    if (!groups[label]) groups[label] = []
    groups[label].push(store)
  })
  return Object.entries(groups).map(([label, options]) => ({ label, options }))
})

const platformPageOptions = computed(() => {
  return platforms.map(p => ({
    label: p.label,
    value: p.value,
    children: pageOptions.map(pg => ({ label: pg.label, value: pg.value }))
  }))
})

const filteredElements = computed(() => {
  let result = elements.value.filter(e => e.platform === selectedPlatform.value && e.page === selectedPage.value)
  if (searchKeyword.value) {
    result = result.filter(e => e.name.toLowerCase().includes(searchKeyword.value.toLowerCase()))
  }
  return result
})

const getPlatformName = (platform: string) => {
  return platforms.find(p => p.value === platform)?.label || platform
}

const getPlatformLabel = (platform: string) => {
  return platforms.find(p => p.value === platform)?.label || platform
}

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    click: '点击', input: '输入', upload: '上传', extract: '提取', wait: '等待', navigate: '导航'
  }
  return labels[action] || action
}

const getSelectorPlaceholder = (type: string) => {
  const placeholders: Record<string, string> = {
    css: "例如: input[name='username']",
    xpath: "例如: //input[@id='username']",
    id: "例如: username",
    class: "例如: login-form",
    text: "例如: 登录"
  }
  return placeholders[type] || ''
}

const onPlatformChange = () => {
  selectedPage.value = 'login'
  loadElements()
}

const loadElements = () => {
  elements.value = [
    { id: 1, name: 'username_input', display_name: '用户名输入框', description: '登录用户名输入', selectors: [{ type: 'css', value: "input[name='username']" }, { type: 'xpath', value: "//input[@name='username']" }], selector_type: 'css', selector: "input[name='username']", action_type: 'input', page: 'login', platform: 'pinduoduo', version: 1, is_active: true },
    { id: 2, name: 'password_input', display_name: '密码输入框', description: '登录密码输入', selectors: [{ type: 'css', value: "input[name='password']" }], selector_type: 'css', selector: "input[name='password']", action_type: 'input', page: 'login', platform: 'pinduoduo', version: 1, is_active: true },
    { id: 3, name: 'login_button', display_name: '登录按钮', description: '登录确认按钮', selectors: [{ type: 'text', value: '登录' }, { type: 'css', value: 'button[type="submit"]' }], selector_type: 'text', selector: '登录', action_type: 'click', page: 'login', platform: 'pinduoduo', version: 2, is_active: true },
    { id: 7, name: 'product_id', display_name: '商品ID', description: '发布成功后的商品ID', selectors: [{ type: 'css', value: '#goods_id' }, { type: 'css', value: '[data-goods-id]' }, { type: 'css', value: '.goods-id' }], selector_type: 'css', selector: '#goods_id', action_type: 'extract', page: 'publish_success', platform: 'pinduoduo', version: 1, is_active: true },
    { id: 8, name: 'product_url', display_name: '商品链接', description: '商品详情页链接', selectors: [{ type: 'css', value: '.goods-link' }, { type: 'css', value: "a[href*='goods']" }], selector_type: 'css', selector: '.goods-link', action_type: 'extract', page: 'publish_success', platform: 'pinduoduo', version: 1, is_active: true }
  ]
}

const loadStores = async () => {
  loadingStores.value = true
  try {
    const res = await axios.get(`${API_BASE}/stores`)
    stores.value = res.data.stores
    browserInfo.value = null

    try {
      const testRes = await axios.get(`${API_BASE}/test-connection`)
      browserInfo.value = testRes.data
    } catch {}

    if (debugConfig.value.storeId) {
      currentStore.value = stores.value.find(s => s.id === debugConfig.value.storeId)
    }
  } catch (e: any) {
    ElMessage.error('获取店铺列表失败')
  }
  loadingStores.value = false
}

const onStoreChange = (storeId: number) => {
  currentStore.value = stores.value.find(s => s.id === storeId)
  pageOpened.value = false
  screenshotUrl.value = ''
  pageInfo.value = null
  testResult.value = null
}

const onSelectionChange = (selection: any[]) => {
  selectedElements.value = selection
}

const clearSelection = () => {
  selectedElements.value = []
}

const openAddModal = () => {
  editingElement.value = null
  elementForm.value = { name: '', display_name: '', description: '', action_type: 'click', selectors: [{ type: 'css', value: '' }] }
  selectorTestResults.value = []
  showAddModal.value = true
}

const addSelector = () => {
  elementForm.value.selectors.push({ type: 'css', value: '' })
}

const removeSelector = (index: number) => {
  elementForm.value.selectors.splice(index, 1)
}

const editElement = (element: any) => {
  editingElement.value = element
  elementForm.value = {
    name: element.name,
    display_name: element.display_name || '',
    description: element.description || '',
    action_type: element.action_type || 'click',
    selectors: element.selectors?.length ? [...element.selectors] : [{ type: element.selector_type || 'css', value: element.selector }]
  }
  selectorTestResults.value = []
  showAddModal.value = true
}

const updateElement = async (element: any) => {
  ElMessage.success(`元素 ${element.name} 状态已更新`)
}

const saveElement = () => {
  if (!elementForm.value.name) {
    ElMessage.warning('请输入元素名称')
    return
  }
  if (editingElement.value) {
    const index = elements.value.findIndex(e => e.id === editingElement.value.id)
    if (index !== -1) {
      elements.value[index] = { ...elements.value[index], ...elementForm.value, version: elements.value[index].version + 1, updated_at: new Date().toISOString() }
    }
    ElMessage.success('元素已更新')
  } else {
    elements.value.push({ id: Date.now(), platform: selectedPlatform.value, page: selectedPage.value, ...elementForm.value, version: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    ElMessage.success('元素已添加')
  }
  showAddModal.value = false
  editingElement.value = null
}

const deleteElement = async (element: any) => {
  await ElMessageBox.confirm(`确定删除元素 "${element.name}" 吗？`, '删除确认', { type: 'warning' })
  elements.value = elements.value.filter(e => e.id !== element.id)
  ElMessage.success('元素已删除')
}

const openDebugPage = async () => {
  if (!debugConfig.value.storeId) {
    ElMessage.warning('请先选择店铺')
    return
  }
  if (!debugConfig.value.url) {
    ElMessage.warning('请输入页面URL')
    return
  }

  openingPage.value = true
  try {
    const res = await axios.post(`${API_BASE}/open-page`, {
      store_id: debugConfig.value.storeId,
      url: debugConfig.value.url,
      wait_selector: debugConfig.value.waitSelector,
      wait_timeout: 5000
    })

    if (res.data.success) {
      screenshotUrl.value = res.data.screenshot + '?t=' + Date.now()
      pageOpened.value = true
      ElMessage.success('页面已打开: ' + res.data.page_title)

      try {
        const infoRes = await axios.post(`${API_BASE}/get-page-info`, {
          store_id: debugConfig.value.storeId,
          url: debugConfig.value.url
        })
        pageInfo.value = infoRes.data
      } catch {}
    } else {
      ElMessage.error(res.data.detail || '打开页面失败')
    }
  } catch (e: any) {
    ElMessage.error('打开页面失败: ' + (e.response?.data?.detail || e.message))
  }
  openingPage.value = false
}

const loadPresetUrl = async () => {
  if (!debugConfig.value.presetPage) return
  try {
    const res = await axios.get(`${API_BASE}/platform-urls`)
    const platform = currentStore.value?.platform || 'pinduoduo'
    const platformUrls = res.data[platform]
    if (platformUrls && platformUrls[debugConfig.value.presetPage]) {
      debugConfig.value.url = platformUrls[debugConfig.value.presetPage]
    }
  } catch {
    const urls: Record<string, Record<string, string>> = {
      'pinduoduo': { 'login': 'https://mms.pinduoduo.com/login', 'publish': 'https://mms.pinduoduo.com/goods/create', 'publish_success': 'https://mms.pinduoduo.com/goods/success' },
      'douyin': { 'login': 'https://creator.douyin.com', 'publish': 'https://creator.douyin.com/product/publish' }
    }
    const platform = currentStore.value?.platform || 'pinduoduo'
    const platformUrls = urls[platform]
    if (platformUrls && debugConfig.value.presetPage) {
      debugConfig.value.url = platformUrls[debugConfig.value.presetPage] || ''
    }
  }
}

const takeScreenshot = async () => {
  try {
    const res = await axios.post(`${API_BASE}/take-screenshot`, { store_id: debugConfig.value.storeId })
    if (res.data.success) {
      screenshotUrl.value = res.data.screenshot + '?t=' + Date.now()
      ElMessage.success('截图已保存')
    }
  } catch (e: any) {
    ElMessage.error('截图失败: ' + (e.message || '未知错误'))
  }
}

const refreshPage = async () => {
  if (debugConfig.value.url) {
    await openDebugPage()
  }
}

const handleImageError = () => {
  setTimeout(() => {
    if (screenshotUrl.value) {
      screenshotUrl.value = screenshotUrl.value.split('?')[0] + '?t=' + Date.now()
    }
  }, 1000)
}

const testSelector = async (element: any) => {
  if (!debugConfig.value.storeId) {
    ElMessage.warning('请先选择店铺')
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const selectors = element.selectors || [{ type: element.selector_type || 'css', value: element.selector }]
    const results = []
    for (const sel of selectors) {
      try {
        const res = await axios.post(`${API_BASE}/test-selector`, { selector: sel.value, selector_type: sel.type, action_type: element.action_type || 'click' }, { params: { store_id: debugConfig.value.storeId, url: debugConfig.value.url || undefined } })
        results.push(res.data)
      } catch { results.push({ found: false, count: 0 }) }
    }
    const validResult = results.find(r => r.found)
    if (validResult) {
      testResult.value = { success: true, found: true, count: validResult.element_count, message: `找到 ${validResult.element_count} 个元素`, text: validResult.element_text, boundingBox: validResult.bounding_box }
      ElMessage.success('选择器测试成功')
    } else {
      testResult.value = { success: false, found: false, count: 0, message: '所有选择器均未找到元素' }
      ElMessage.warning('未找到元素')
    }
  } catch (e: any) {
    testResult.value = { success: false, found: false, message: e.message || '测试失败' }
    ElMessage.error('测试失败')
  }
  testing.value = false
}

const debugWithPlaywright = (element: any) => {
  activeTab.value = 'debug'
  if (element.platform) debugConfig.value.storeId = null
  selectorTest.value.selector = element.selectors?.[0]?.value || element.selector
  selectorTest.value.selectorType = element.selectors?.[0]?.type || element.selector_type || 'css'
  if (!debugConfig.value.url && element.page) {
    const pageMap: Record<string, string> = { 'login': 'login', 'publish': 'publish', 'publish_success': 'publish_success' }
    debugConfig.value.presetPage = pageMap[element.page] || 'login'
    loadPresetUrl()
  }
  ElMessage.info('已切换到调试面板，请先选择店铺并打开页面')
}

const testCurrentSelector = async () => {
  if (!selectorTest.value.selector) { ElMessage.warning('请输入选择器'); return }
  if (!debugConfig.value.storeId) { ElMessage.warning('请先选择店铺'); return }
  testing.value = true
  testResult.value = null
  try {
    const res = await axios.post(`${API_BASE}/test-selector`, { selector: selectorTest.value.selector, selector_type: selectorTest.value.selectorType, action_type: selectorTest.value.actionType }, { params: { store_id: debugConfig.value.storeId, url: debugConfig.value.url || undefined } })
    if (res.data.success) {
      testResult.value = { success: true, found: res.data.found, count: res.data.element_count, message: res.data.found ? `找到 ${res.data.element_count} 个元素` : '未找到元素', text: res.data.element_text, boundingBox: res.data.bounding_box }
      ElMessage.success(res.data.found ? '选择器有效' : '未找到元素')
    } else {
      testResult.value = { success: false, found: false, message: res.data.error || '测试失败' }
      ElMessage.error(res.data.error || '测试失败')
    }
  } catch (e: any) {
    testResult.value = { success: false, found: false, message: e.message || '测试失败' }
    ElMessage.error('测试失败: ' + (e.message || '未知错误'))
  }
  testing.value = false
}

const testSingleSelector = async (selector: any, index: number) => {
  if (!debugConfig.value.storeId) { ElMessage.warning('请先选择店铺'); return }
  testingSelectorIndex.value = index
  try {
    const res = await axios.post(`${API_BASE}/test-selector`, { selector: selector.value, selector_type: selector.type, action_type: 'click' }, { params: { store_id: debugConfig.value.storeId, url: debugConfig.value.url || undefined } })
    ElMessage.success(res.data.found ? `选择器 ${index + 1} 有效` : `选择器 ${index + 1} 无效`)
  } catch { ElMessage.error('测试失败') }
  testingSelectorIndex.value = null
}

const testFormSelector = async () => {
  if (!debugConfig.value.storeId) { ElMessage.warning('请先选择店铺'); return }
  if (!debugConfig.value.url) { ElMessage.warning('请先打开页面'); return }
  testingFormSelector.value = true
  selectorTestResults.value = []
  try {
    for (let i = 0; i < elementForm.value.selectors.length; i++) {
      const sel = elementForm.value.selectors[i]
      try {
        const res = await axios.post(`${API_BASE}/test-selector`, { selector: sel.value, selector_type: sel.type, action_type: 'click' }, { params: { store_id: debugConfig.value.storeId, url: debugConfig.value.url } })
        selectorTestResults.value.push({ index: i + 1, type: sel.type, value: sel.value, found: res.data.found, count: res.data.element_count || 0 })
      } catch { selectorTestResults.value.push({ index: i + 1, type: sel.type, value: sel.value, found: false, count: 0 }) }
    }
    const successCount = selectorTestResults.value.filter(r => r.found).length
    ElMessage.success(`测试完成: ${successCount}/${selectorTestResults.value.length} 个选择器有效`)
  } catch { ElMessage.error('批量测试失败') }
  testingFormSelector.value = false
}

const highlightElement = async () => {
  if (!selectorTest.value.selector) { ElMessage.warning('请输入选择器'); return }
  if (!debugConfig.value.storeId) { ElMessage.warning('请先选择店铺'); return }
  testing.value = true
  try {
    const res = await axios.post(`${API_BASE}/highlight-element`, null, { params: { store_id: debugConfig.value.storeId, url: debugConfig.value.url || undefined, selector: selectorTest.value.selector, selector_type: selectorTest.value.selectorType } })
    if (res.data.success) {
      ElMessage.success(res.data.message)
      screenshotUrl.value = res.data.screenshot + '?t=' + Date.now()
    } else {
      ElMessage.error(res.data.error || '高亮失败')
    }
  } catch (e: any) { ElMessage.error('高亮失败: ' + (e.message || '未知错误')) }
  testing.value = false
}

const switchToDebug = () => {
  activeTab.value = 'debug'
  ElMessage.info('请先选择店铺，然后打开页面测试选择器')
}

const batchEnable = () => { selectedElements.value.forEach(e => e.is_active = true); ElMessage.success(`已启用 ${selectedElements.value.length} 个元素`); clearSelection() }
const batchDisable = () => { selectedElements.value.forEach(e => e.is_active = false); ElMessage.success(`已禁用 ${selectedElements.value.length} 个元素`); clearSelection() }
const batchUpdatePage = () => { if (selectedElements.value.length === 0) { ElMessage.warning('请先选择元素'); return }; batchUpdateData.value = { platform: selectedElements.value[0].platform || 'pinduoduo', page: selectedElements.value[0].page || 'login' }; showBatchPageDialog.value = true }
const confirmBatchUpdatePage = () => { selectedElements.value.forEach(e => { e.platform = batchUpdateData.value.platform; e.page = batchUpdateData.value.page }); ElMessage.success(`已修改 ${selectedElements.value.length} 个元素的页面配置`); showBatchPageDialog.value = false; clearSelection() }
const batchDelete = async () => { await ElMessageBox.confirm(`确定删除选中的 ${selectedElements.value.length} 个元素吗？`, '批量删除', { type: 'warning' }); const ids = selectedElements.value.map(e => e.id); elements.value = elements.value.filter(e => !ids.includes(e.id)); ElMessage.success('批量删除完成'); clearSelection() }
const handleImportFile = (file: any) => { importFile.value = file.raw }
const doImport = () => { ElMessage.success('导入成功'); showImportDialog.value = false; importFile.value = null; loadElements() }
const exportElements = () => { const data = JSON.stringify(filteredElements.value, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `elements_${selectedPlatform.value}_${selectedPage.value}.json`; a.click(); ElMessage.success('导出成功') }
const doExport = () => { exportElements() }
const rollbackVersion = (version: any) => { ElMessage.success(`已回滚到 v${version.version} 版本`) }
const applyTemplate = (template: any) => { ElMessage.success(`已应用 "${template.name}" 模板`) }

onMounted(() => { loadElements(); loadStores() })
</script>

<style scoped>
.elements-manager {
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
  @apply flex gap-3 items-center mb-5 flex-wrap;
}

.debug-toolbar {
  @apply flex gap-3 items-center mb-5;
}

.batch-toolbar {
  @apply flex gap-3 items-center mb-4 p-4 bg-blue-50 rounded-lg;
}

.element-info {
  @apply flex flex-col;
}

.element-name {
  @apply font-medium;
}

.element-desc {
  @apply text-xs text-gray-400 mt-1;
}

.selector-code {
  @apply bg-gray-100 px-2 py-1 rounded text-xs;
}

.backup-selectors {
  @apply flex flex-wrap gap-1;
}

.no-backup {
  @apply text-gray-300 text-sm;
}

.selector-item {
  @apply mb-3 p-3 bg-gray-50 rounded-lg;
}

.selector-test-section {
  @apply flex items-center gap-4 mt-4;
}

.preview-container {
  @apply w-full min-h-96 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center;
}

.preview-image {
  @apply w-full h-auto max-h-200 object-contain;
}

.no-preview {
  @apply flex flex-col items-center justify-center text-gray-300;
}

.no-preview p {
  @apply mt-3;
}

.no-preview .hint {
  @apply text-xs text-gray-400;
}

.preview-header {
  @apply flex justify-between items-center;
}

.template-card {
  @apply mb-5 rounded-xl;
}

.template-header {
  @apply flex justify-between items-center;
}

.template-desc {
  @apply text-gray-500 text-sm mb-3;
}

.template-platforms {
  @apply mt-3;
}

.test-result {
  @apply mt-3;
}

.test-results-list {
  @apply mt-4;
}

.store-option {
  @apply flex items-center justify-between w-full;
}

@media (max-width: 768px) {
  .debug-panel {
    @apply grid-cols-1;
  }
}
</style>
