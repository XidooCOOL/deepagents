<template>
  <div class="workflow-config">
    <div class="page-header">
      <h2>⚙️ 工作流配置中心</h2>
      <p class="subtitle">配置自动化工作流 · 定义执行步骤 · 管理上传文件</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon><component :is="icons.Reading" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ workflowTemplates.length }}</div>
              <div class="stats-label">工作流模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon><component :is="icons.List" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalSteps }}</div>
              <div class="stats-label">总步骤数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon><component :is="icons.FolderOpened" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ fileTemplates.length }}</div>
              <div class="stats-label">文件模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #f56c6c;">
              <el-icon><component :is="icons.VideoPlay" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ executedCount }}</div>
              <div class="stats-label">执行次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="main-card">
      <div class="card-header">
        <h3>📋 工作流模板列表</h3>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateDialog = true" icon="Plus">创建模板</el-button>
        </div>
      </div>

      <el-table :data="workflowTemplates" border stripe>
        <el-table-column prop="name" label="模板名称" min-width="150">
          <template #default="scope">
            <div class="template-name">
              <el-icon><component :is="icons.Connection" /></el-icon>
              <strong>{{ scope.row.name }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="platform" label="适用平台" width="150">
          <template #default="scope">
            <el-tag v-for="p in scope.row.platforms" :key="p" size="small" type="success" style="margin: 2px;">
              {{ p }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="steps" label="步骤数" width="100">
          <template #default="scope">{{ scope.row.steps.length }} 步</template>
        </el-table-column>
        <el-table-column prop="parameters" label="参数" width="100">
          <template #default="scope">{{ scope.row.parameters.length }} 个</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="editWorkflow(scope.row)">编辑</el-button>
            <el-button size="small" type="success" @click="previewWorkflow(scope.row)">预览</el-button>
            <el-button size="small" type="danger" @click="deleteWorkflow(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card class="param-card">
          <div class="card-header">
            <h3>📝 参数模板管理</h3>
            <el-button size="small" type="primary" @click="showParamDialog = true" icon="Plus">创建参数模板</el-button>
          </div>
          
          <el-table :data="parameterTemplates" border stripe size="small">
            <el-table-column prop="name" label="参数名称" width="150" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="scope">
                <el-tag size="small" :type="getParamTypeTag(scope.row.type)">{{ scope.row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button size="small" @click="editParam(scope.row)" icon="Edit" />
                <el-button size="small" type="danger" @click="deleteParam(scope.row)" icon="Delete" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="file-card">
          <div class="card-header">
            <h3>📁 文件/图片配置</h3>
            <el-button size="small" type="primary" @click="showFileDialog = true" icon="Plus">添加文件配置</el-button>
          </div>
          
          <div class="file-list">
            <div v-for="file in fileTemplates" :key="file.id" class="file-item">
              <div class="file-info">
                <el-icon :size="20"><component :is="getFileIcon(file.type)" /></el-icon>
                <div class="file-details">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-type">{{ file.type }} · {{ file.source }}</div>
                </div>
              </div>
              <div class="file-actions">
                <el-tag v-if="file.required" size="small" type="danger">必填</el-tag>
                <el-tag v-else size="small" type="info">可选</el-tag>
                <el-button-group>
                  <el-button size="small" @click="editFile(file)" icon="Edit" />
                  <el-button size="small" type="danger" @click="deleteFile(file)" icon="Delete" />
                </el-button-group>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showCreateDialog" :title="editingWorkflow ? '编辑工作流模板' : '创建工作流模板'" width="90%" top="5vh">
      <div v-if="currentWorkflow" class="workflow-editor">
        <el-form :model="currentWorkflow" label-width="120px">
          <el-form-item label="模板名称">
            <el-input v-model="currentWorkflow.name" placeholder="例如：商品发布工作流" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="currentWorkflow.description" type="textarea" :rows="2" placeholder="描述此工作流的用途" />
          </el-form-item>
          <el-form-item label="适用平台">
            <el-checkbox-group v-model="currentWorkflow.platforms">
              <el-checkbox label="抖音" />
              <el-checkbox label="拼多多" />
              <el-checkbox label="淘宝" />
              <el-checkbox label="京东" />
            </el-checkbox-group>
          </el-form-item>
        </el-form>

        <el-divider>📝 参数定义</el-divider>
        
        <div class="params-section">
          <div v-for="(param, index) in currentWorkflow.parameters" :key="index" class="param-item">
            <el-input v-model="param.name" placeholder="参数名" style="width: 150px;" />
            <el-select v-model="param.type" placeholder="类型" style="width: 120px;">
              <el-option label="文本" value="text" />
              <el-option label="数字" value="number" />
              <el-option label="文件列表" value="files" />
              <el-option label="下拉选择" value="select" />
              <el-option label="布尔值" value="boolean" />
            </el-select>
            <el-input v-model="param.description" placeholder="描述" style="flex: 1;" />
            <el-input v-model="param.default" placeholder="默认值" style="width: 150px;" />
            <el-button type="danger" @click="removeParam(index)" icon="Delete" />
          </div>
          <el-button type="primary" @click="addParam" icon="Plus">添加参数</el-button>
        </div>

        <el-divider>🔧 工作流步骤</el-divider>

        <div class="steps-section">
          <el-table :data="currentWorkflow.steps" border size="small">
            <el-table-column label="顺序" width="80" type="index" />
            <el-table-column label="步骤名称" width="150">
              <template #default="scope">
                <el-input v-model="scope.row.name" placeholder="步骤名称" />
              </template>
            </el-table-column>
            <el-table-column label="操作类型" width="150">
              <template #default="scope">
                <el-select v-model="scope.row.action" @change="onActionChange(scope.row)">
                  <el-option label="导航" value="navigate" />
                  <el-option label="点击" value="click" />
                  <el-option label="输入文本" value="input" />
                  <el-option label="上传文件" value="upload" />
                  <el-option label="等待" value="wait" />
                  <el-option label="条件判断" value="if" />
                  <el-option label="循环" value="loop" />
                  <el-option label="执行子工作流" value="subworkflow" />
                  <el-option label="截图" value="screenshot" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="配置">
              <template #default="scope">
                <div class="step-config">
                  <template v-if="scope.row.action === 'navigate'">
                    <el-input v-model="scope.row.config.url" placeholder="URL地址" />
                  </template>
                  
                  <template v-else-if="scope.row.action === 'click' || scope.row.action === 'input'">
                    <el-select v-model="scope.row.config.selectorType" placeholder="选择器类型" style="width: 100px;">
                      <el-option label="CSS" value="css" />
                      <el-option label="XPath" value="xpath" />
                      <el-option label="ID" value="id" />
                      <el-option label="文本" value="text" />
                    </el-select>
                    <el-input v-model="scope.row.config.selector" placeholder="选择器表达式" style="flex: 1;" />
                    <template v-if="scope.row.action === 'input'">
                      <el-input v-model="scope.row.config.value" placeholder="输入值，使用{param}引用参数" style="margin-top: 5px;" />
                    </template>
                  </template>
                  
                  <template v-else-if="scope.row.action === 'upload'">
                    <el-select v-model="scope.row.config.paramName" placeholder="参数名" style="width: 150px;">
                      <el-option v-for="p in currentWorkflow.parameters.filter(p => p.type === 'files')" :key="p.name" :label="p.name" :value="p.name" />
                    </el-select>
                    <el-select v-model="scope.row.config.selectorType" placeholder="选择器类型" style="width: 100px;">
                      <el-option label="CSS" value="css" />
                      <el-option label="XPath" value="xpath" />
                    </el-select>
                    <el-input v-model="scope.row.config.selector" placeholder="选择器" style="flex: 1;" />
                  </template>
                  
                  <template v-else-if="scope.row.action === 'wait'">
                    <el-input v-model="scope.row.config.duration" placeholder="等待时间（毫秒）" type="number" style="width: 150px;" />
                  </template>
                  
                  <template v-else-if="scope.row.action === 'if'">
                    <el-input v-model="scope.row.config.condition" placeholder="条件表达式" style="flex: 1;" />
                  </template>
                  
                  <template v-else-if="scope.row.action === 'loop'">
                    <el-input v-model="scope.row.config.items" placeholder="循环项" style="flex: 1;" />
                  </template>
                  
                  <template v-else-if="scope.row.action === 'subworkflow'">
                    <el-select v-model="scope.row.config.workflowName" placeholder="子工作流">
                      <el-option v-for="wf in workflowTemplates" :key="wf.id" :label="wf.name" :value="wf.name" />
                    </el-select>
                  </template>
                  
                  <template v-else-if="scope.row.action === 'screenshot'">
                    <el-input v-model="scope.row.config.filename" placeholder="截图文件名" style="flex: 1;" />
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="描述" width="150">
              <template #default="scope">
                <el-input v-model="scope.row.description" placeholder="步骤描述" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button-group>
                  <el-button size="small" @click="moveStep(scope.$index, -1)" :disabled="scope.$index === 0" icon="Top" />
                  <el-button size="small" @click="moveStep(scope.$index, 1)" :disabled="scope.$index === currentWorkflow.steps.length - 1" icon="Bottom" />
                  <el-button size="small" type="danger" @click="removeStep(scope.$index)" icon="Delete" />
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" @click="addStep" icon="Plus" style="margin-top: 10px;">添加步骤</el-button>
        </div>

        <el-divider>📊 参数预览</el-divider>
        
        <div class="param-preview">
          <pre>{{ formatJSON(currentWorkflow.parameters) }}</pre>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveWorkflow">保存模板</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPreviewDialog" title="🔍 工作流预览" width="80%">
      <div v-if="previewWorkflowData" class="workflow-preview">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ previewWorkflowData.name }}</el-descriptions-item>
          <el-descriptions-item label="步骤数">{{ previewWorkflowData.steps.length }}</el-descriptions-item>
          <el-descriptions-item label="适用平台" :span="2">
            <el-tag v-for="p in previewWorkflowData.platforms" :key="p" size="small" type="success" style="margin: 2px;">{{ p }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>步骤流程</el-divider>

        <el-timeline>
          <el-timeline-item v-for="(step, index) in previewWorkflowData.steps" :key="index" :color="getStepColor(step.action)">
            <el-card class="step-preview-card">
              <div class="step-preview-header">
                <span class="step-number">步骤 {{ index + 1 }}</span>
                <el-tag size="small" :type="getActionTagType(step.action)">{{ getActionName(step.action) }}</el-tag>
              </div>
              <div class="step-preview-name">{{ step.name }}</div>
              <div class="step-preview-config">
                <pre>{{ formatJSON(step.config) }}</pre>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <el-divider>参数列表</el-divider>

        <el-table :data="previewWorkflowData.parameters" border size="small">
          <el-table-column prop="name" label="参数名" width="120" />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="scope">
              <el-tag size="small">{{ scope.row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="default" label="默认值" width="120" />
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="showParamDialog" :title="editingParam ? '编辑参数' : '创建参数模板'" width="50%">
      <el-form :model="currentParam" label-width="100px">
        <el-form-item label="参数名称">
          <el-input v-model="currentParam.name" placeholder="参数名称" />
        </el-form-item>
        <el-form-item label="参数类型">
          <el-select v-model="currentParam.type" placeholder="选择类型">
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="文件列表" value="files" />
            <el-option label="下拉选择" value="select" />
            <el-option label="布尔值" value="boolean" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="currentParam.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="currentParam.default" placeholder="默认值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showParamDialog = false">取消</el-button>
        <el-button type="primary" @click="saveParam">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showFileDialog" :title="editingFile ? '编辑文件配置' : '添加文件配置'" width="50%">
      <el-form :model="currentFile" label-width="100px">
        <el-form-item label="文件名称">
          <el-input v-model="currentFile.name" placeholder="如：商品主图" />
        </el-form-item>
        <el-form-item label="文件类型">
          <el-select v-model="currentFile.type" placeholder="选择类型">
            <el-option label="图片" value="image" />
            <el-option label="视频" value="video" />
            <el-option label="文档" value="document" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="currentFile.source" placeholder="选择来源">
            <el-option label="本地文件" value="local" />
            <el-option label="网络URL" value="url" />
            <el-option label="云存储" value="cloud" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="currentFile.required" />
        </el-form-item>
        <el-form-item label="文件格式">
          <el-input v-model="currentFile.extensions" placeholder="如：jpg,png,jpeg" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="currentFile.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFileDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as icons from '@element-plus/icons-vue'

export default {
  name: 'WorkflowConfig',
  setup() {
    const workflowTemplates = ref([])
    const parameterTemplates = ref([])
    const fileTemplates = ref([])
    const showCreateDialog = ref(false)
    const showPreviewDialog = ref(false)
    const showParamDialog = ref(false)
    const showFileDialog = ref(false)
    const editingWorkflow = ref(false)
    const editingParam = ref(null)
    const editingFile = ref(null)
    const previewWorkflowData = ref(null)
    const currentWorkflow = ref(null)
    const currentParam = ref({ name: '', type: 'text', description: '', default: '' })
    const currentFile = ref({ name: '', type: 'image', source: 'local', required: false, extensions: 'jpg,png', description: '' })
    const executedCount = ref(0)

    const totalSteps = computed(() => {
      return workflowTemplates.value.reduce((sum, wf) => sum + wf.steps.length, 0)
    })

    const onActionChange = (step) => {
      const defaultConfigs = {
        navigate: { url: '' },
        click: { selectorType: 'css', selector: '' },
        input: { selectorType: 'css', selector: '', value: '' },
        upload: { selectorType: 'css', selector: '', paramName: '' },
        wait: { duration: 1000 },
        if: { condition: '' },
        loop: { items: '' },
        subworkflow: { workflowName: '' },
        screenshot: { filename: '' }
      }
      step.config = defaultConfigs[step.action] || {}
    }

    const addParam = () => {
      currentWorkflow.value.parameters.push({ name: '', type: 'text', description: '', default: '' })
    }

    const removeParam = (index) => {
      currentWorkflow.value.parameters.splice(index, 1)
    }

    const addStep = () => {
      currentWorkflow.value.steps.push({
        name: '',
        action: 'navigate',
        config: { url: '' },
        description: ''
      })
    }

    const removeStep = (index) => {
      currentWorkflow.value.steps.splice(index, 1)
    }

    const moveStep = (index, direction) => {
      const steps = currentWorkflow.value.steps
      const newIndex = index + direction
      if (newIndex >= 0 && newIndex < steps.length) {
        [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]]
      }
    }

    const saveWorkflow = () => {
      if (!currentWorkflow.value.name) {
        ElMessage.warning('请输入模板名称')
        return
      }
      
      if (editingWorkflow.value) {
        const index = workflowTemplates.value.findIndex(wf => wf.id === currentWorkflow.value.id)
        if (index !== -1) {
          workflowTemplates.value[index] = { ...currentWorkflow.value }
        }
        ElMessage.success('模板已更新')
      } else {
        workflowTemplates.value.push({
          ...currentWorkflow.value,
          id: Date.now()
        })
        ElMessage.success('模板已创建')
      }
      
      showCreateDialog.value = false
      editingWorkflow.value = false
    }

    const editWorkflow = (workflow) => {
      currentWorkflow.value = JSON.parse(JSON.stringify(workflow))
      editingWorkflow.value = true
      showCreateDialog.value = true
    }

    const previewWorkflow = (workflow) => {
      previewWorkflowData.value = workflow
      showPreviewDialog.value = true
    }

    const deleteWorkflow = (workflow) => {
      ElMessageBox.confirm(`确定要删除模板 "${workflow.name}" 吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = workflowTemplates.value.findIndex(wf => wf.id === workflow.id)
        if (index !== -1) {
          workflowTemplates.value.splice(index, 1)
          ElMessage.success('模板已删除')
        }
      }).catch(() => {})
    }

    const saveParam = () => {
      if (!currentParam.value.name) {
        ElMessage.warning('请输入参数名称')
        return
      }
      
      if (editingParam.value) {
        const index = parameterTemplates.value.findIndex(p => p.id === editingParam.value.id)
        if (index !== -1) {
          parameterTemplates.value[index] = { ...currentParam.value, id: editingParam.value.id }
        }
        ElMessage.success('参数已更新')
      } else {
        parameterTemplates.value.push({
          ...currentParam.value,
          id: Date.now()
        })
        ElMessage.success('参数已创建')
      }
      
      showParamDialog.value = false
      editingParam.value = null
      currentParam.value = { name: '', type: 'text', description: '', default: '' }
    }

    const editParam = (param) => {
      currentParam.value = { ...param }
      editingParam.value = param
      showParamDialog.value = true
    }

    const deleteParam = (param) => {
      ElMessageBox.confirm(`确定要删除参数 "${param.name}" 吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = parameterTemplates.value.findIndex(p => p.id === param.id)
        if (index !== -1) {
          parameterTemplates.value.splice(index, 1)
          ElMessage.success('参数已删除')
        }
      }).catch(() => {})
    }

    const saveFile = () => {
      if (!currentFile.value.name) {
        ElMessage.warning('请输入文件名称')
        return
      }
      
      if (editingFile.value) {
        const index = fileTemplates.value.findIndex(f => f.id === editingFile.value.id)
        if (index !== -1) {
          fileTemplates.value[index] = { ...currentFile.value, id: editingFile.value.id }
        }
        ElMessage.success('文件配置已更新')
      } else {
        fileTemplates.value.push({
          ...currentFile.value,
          id: Date.now()
        })
        ElMessage.success('文件配置已创建')
      }
      
      showFileDialog.value = false
      editingFile.value = null
      currentFile.value = { name: '', type: 'image', source: 'local', required: false, extensions: 'jpg,png', description: '' }
    }

    const editFile = (file) => {
      currentFile.value = { ...file }
      editingFile.value = file
      showFileDialog.value = true
    }

    const deleteFile = (file) => {
      ElMessageBox.confirm(`确定要删除文件配置 "${file.name}" 吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const index = fileTemplates.value.findIndex(f => f.id === file.id)
        if (index !== -1) {
          fileTemplates.value.splice(index, 1)
          ElMessage.success('文件配置已删除')
        }
      }).catch(() => {})
    }

    const getParamTypeTag = (type) => {
      const types = { text: 'primary', number: 'success', files: 'warning', select: 'info', boolean: '' }
      return types[type] || 'info'
    }

    const getFileIcon = (type) => {
      const icons = { image: 'Picture', video: 'VideoCamera', document: 'Document' }
      return icons[type] || 'Files'
    }

    const getStepColor = (action) => {
      const colors = {
        navigate: '#409eff',
        click: '#67c23a',
        input: '#e6a23c',
        upload: '#f56c6c',
        wait: '#909399',
        if: '#9c27b0',
        loop: '#ff5722',
        subworkflow: '#00bcd4',
        screenshot: '#795548'
      }
      return colors[action] || '#909399'
    }

    const getActionTagType = (action) => {
      const types = {
        navigate: 'primary',
        click: 'success',
        input: 'warning',
        upload: 'danger',
        wait: 'info',
        if: '',
        loop: 'warning',
        subworkflow: '',
        screenshot: 'info'
      }
      return types[action] || 'info'
    }

    const getActionName = (action) => {
      const names = {
        navigate: '导航',
        click: '点击',
        input: '输入',
        upload: '上传',
        wait: '等待',
        if: '条件',
        loop: '循环',
        subworkflow: '子工作流',
        screenshot: '截图'
      }
      return names[action] || action
    }

    const formatJSON = (obj) => {
      return JSON.stringify(obj, null, 2)
    }

    const initSampleData = () => {
      workflowTemplates.value = [
        {
          id: 1,
          name: '商品发布工作流',
          description: '在电商平台发布商品的标准流程',
          platforms: ['抖音', '拼多多', '淘宝'],
          parameters: [
            { name: 'title', type: 'text', description: '商品标题', default: '' },
            { name: 'price', type: 'number', description: '商品价格', default: '' },
            { name: 'description', type: 'text', description: '商品描述', default: '' },
            { name: 'images', type: 'files', description: '商品图片', default: '' }
          ],
          steps: [
            { name: '打开发布页', action: 'navigate', config: { url: 'https://creator.douyin.com/product/publish' }, description: '导航到商品发布页面' },
            { name: '选择类目', action: 'click', config: { selectorType: 'css', selector: '.category-select' }, description: '点击类目选择器' },
            { name: '输入标题', action: 'input', config: { selectorType: 'css', selector: '.product-title', value: '{title}' }, description: '填写商品标题' },
            { name: '输入价格', action: 'input', config: { selectorType: 'css', selector: '.product-price', value: '{price}' }, description: '填写商品价格' },
            { name: '输入描述', action: 'input', config: { selectorType: 'css', selector: '.product-desc', value: '{description}' }, description: '填写商品描述' },
            { name: '上传图片', action: 'upload', config: { selectorType: 'css', selector: '.image-upload', paramName: 'images' }, description: '上传商品图片' },
            { name: '提交审核', action: 'click', config: { selectorType: 'css', selector: '.submit-btn' }, description: '点击提交按钮' }
          ]
        },
        {
          id: 2,
          name: '好评回复工作流',
          description: '自动回复店铺好评',
          platforms: ['抖音', '拼多多'],
          parameters: [
            { name: 'reviewCount', type: 'number', description: '回复数量', default: '10' }
          ],
          steps: [
            { name: '打开评价页', action: 'navigate', config: { url: 'https://creator.douyin.com/review/list' }, description: '导航到评价页面' },
            { name: '筛选好评', action: 'click', config: { selectorType: 'css', selector: '.filter-positive' }, description: '点击好评筛选' },
            { name: '循环回复', action: 'loop', config: { items: '{reviewCount}' }, description: '循环处理好评' },
            { name: '输入回复', action: 'input', config: { selectorType: 'css', selector: '.reply-input', value: '感谢您的支持，欢迎再次光临！' }, description: '填写回复内容' },
            { name: '提交回复', action: 'click', config: { selectorType: 'css', selector: '.submit-reply' }, description: '提交回复' }
          ]
        }
      ]

      parameterTemplates.value = [
        { id: 1, name: 'title', type: 'text', description: '商品标题', default: '' },
        { id: 2, name: 'price', type: 'number', description: '商品价格', default: '' },
        { id: 3, name: 'description', type: 'text', description: '商品描述', default: '' },
        { id: 4, name: 'images', type: 'files', description: '商品图片列表', default: '' }
      ]

      fileTemplates.value = [
        { id: 1, name: '商品主图', type: 'image', source: 'local', required: true, extensions: 'jpg,png', description: '商品主图，至少1张' },
        { id: 2, name: '商品详情图', type: 'image', source: 'local', required: false, extensions: 'jpg,png', description: '商品详情图片' },
        { id: 3, name: '商品视频', type: 'video', source: 'local', required: false, extensions: 'mp4', description: '商品展示视频' }
      ]
    }

    onMounted(() => {
      initSampleData()
    })

    return {
      icons,
      workflowTemplates,
      parameterTemplates,
      fileTemplates,
      showCreateDialog,
      showPreviewDialog,
      showParamDialog,
      showFileDialog,
      editingWorkflow,
      editingParam,
      editingFile,
      previewWorkflowData,
      currentWorkflow,
      currentParam,
      currentFile,
      executedCount,
      totalSteps,
      onActionChange,
      addParam,
      removeParam,
      addStep,
      removeStep,
      moveStep,
      saveWorkflow,
      editWorkflow,
      previewWorkflow,
      deleteWorkflow,
      saveParam,
      editParam,
      deleteParam,
      saveFile,
      editFile,
      deleteFile,
      getParamTypeTag,
      getFileIcon,
      getStepColor,
      getActionTagType,
      getActionName,
      formatJSON
    }
  }
}
</script>

<style scoped>
.workflow-config { padding: 20px; }
.page-header { margin-bottom: 30px; }
.page-header h2 { margin: 0 0 10px 0; font-size: 28px; color: #303133; }
.subtitle { color: #909399; margin: 0; }
.stats-card { margin-bottom: 20px; }
.stats-content { display: flex; align-items: center; gap: 15px; }
.stats-icon { width: 50px; height: 50px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
.stats-info { flex: 1; }
.stats-value { font-size: 24px; font-weight: bold; color: #303133; }
.stats-label { color: #909399; font-size: 14px; }
.main-card { margin-top: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.card-header h3 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 10px; }
.template-name { display: flex; align-items: center; gap: 8px; }
.workflow-editor { max-height: 70vh; overflow-y: auto; }
.params-section { margin: 20px 0; }
.param-item { display: flex; gap: 10px; margin-bottom: 10px; }
.steps-section { margin: 20px 0; }
.step-config { display: flex; flex-direction: column; gap: 5px; }
.param-preview { background: #f5f7fa; padding: 15px; border-radius: 8px; }
.param-preview pre { margin: 0; font-size: 12px; }
.workflow-preview { max-height: 70vh; overflow-y: auto; }
.step-preview-card { margin-bottom: 10px; }
.step-preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.step-number { font-weight: bold; color: #409eff; }
.step-preview-name { font-size: 16px; font-weight: 500; color: #303133; margin-bottom: 8px; }
.step-preview-config { background: #f5f7fa; padding: 10px; border-radius: 4px; }
.step-preview-config pre { margin: 0; font-size: 12px; }
.param-card, .file-card { height: 100%; }
.file-list { display: flex; flex-direction: column; gap: 10px; }
.file-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f5f7fa; border-radius: 8px; }
.file-info { display: flex; align-items: center; gap: 12px; }
.file-details { display: flex; flex-direction: column; }
.file-name { font-weight: 500; color: #303133; }
.file-type { font-size: 12px; color: #909399; }
.file-actions { display: flex; align-items: center; gap: 10px; }
</style>
