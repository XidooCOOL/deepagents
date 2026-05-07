<template>
  <div class="workflow-config">
    <div class="page-header">
      <h2>⚙️ 工作流配置中心</h2>
      <p class="subtitle">灵活编排步骤 · 智能页面绑定 · 自动 DOM 关联</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6">
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
      <el-col :xs="24" :sm="12" :md="6">
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
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon><component :is="icons.FolderOpened" /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ domElements.length }}</div>
              <div class="stats-label">DOM 元素</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
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
          <el-select v-model="selectedPlatform" placeholder="筛选平台" clearable size="default" style="width: 150px; margin-right: 10px;">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
          <el-button type="primary" @click="showCreateDialog = true" icon="Plus">创建模板</el-button>
        </div>
      </div>

      <el-table :data="filteredWorkflows" border stripe>
        <el-table-column prop="name" label="模板名称" min-width="150">
          <template #default="scope">
            <div class="template-name">
              <el-icon><component :is="icons.Connection" /></el-icon>
              <strong>{{ scope.row.name }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="platform" label="适用平台" width="200">
          <template #default="scope">
            <el-tag v-for="p in scope.row.platforms" :key="p" size="small" type="success" style="margin: 2px;">
              {{ p }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="steps" label="步骤数" width="100">
          <template #default="scope">
            <el-badge :value="scope.row.steps.length" type="primary" />
          </template>
        </el-table-column>
        <el-table-column label="涉及页面" width="150">
          <template #default="scope">
            <el-tag v-for="page in getUniquePages(scope.row)" :key="page" size="small" style="margin: 2px;">
              {{ page }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="editWorkflow(scope.row)" icon="Edit">编辑</el-button>
            <el-button size="small" type="success" @click="duplicateWorkflow(scope.row)" icon="Copy">复制</el-button>
            <el-button size="small" type="info" @click="previewWorkflow(scope.row)" icon="View">预览</el-button>
            <el-button size="small" type="danger" @click="deleteWorkflow(scope.row)" icon="Delete">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showCreateDialog" :title="editingWorkflow ? '✏️ 编辑工作流模板' : '✨ 创建工作流模板'" width="95%" top="3vh" :fullscreen="isFullscreen">
      <template #header>
        <div class="dialog-header">
          <span>{{ editingWorkflow ? '编辑工作流模板' : '创建工作流模板' }}</span>
          <el-button text @click="isFullscreen = !isFullscreen" :icon="isFullscreen ? 'Close' : 'FullScreen'">
            {{ isFullscreen ? '退出全屏' : '全屏编辑' }}
          </el-button>
        </div>
      </template>
      
      <div v-if="currentWorkflow" class="workflow-editor">
        <el-form :model="currentWorkflow" label-width="120px" class="workflow-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板名称" required>
                <el-input v-model="currentWorkflow.name" placeholder="例如：商品发布工作流" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用平台" required>
                <el-checkbox-group v-model="currentWorkflow.platforms">
                  <el-checkbox label="抖音" />
                  <el-checkbox label="拼多多" />
                  <el-checkbox label="淘宝" />
                  <el-checkbox label="京东" />
                </el-checkbox-group>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="描述">
            <el-input v-model="currentWorkflow.description" type="textarea" :rows="2" placeholder="描述此工作流的用途" />
          </el-form-item>
        </el-form>

        <el-divider content-position="left">
          <el-icon><component :is="icons.Setting" /></el-icon>
          参数定义
        </el-divider>
        
        <div class="params-section">
          <el-row :gutter="10" v-for="(param, index) in currentWorkflow.parameters" :key="index" class="param-row">
            <el-col :span="4">
              <el-input v-model="param.name" placeholder="参数名" size="small">
                <template #prepend>{param}</template>
              </el-input>
            </el-col>
            <el-col :span="3">
              <el-select v-model="param.type" placeholder="类型" size="small">
                <el-option label="文本" value="text" />
                <el-option label="数字" value="number" />
                <el-option label="文件列表" value="files" />
                <el-option label="下拉选择" value="select" />
                <el-option label="布尔值" value="boolean" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-input v-model="param.default" placeholder="默认值" size="small" />
            </el-col>
            <el-col :span="10">
              <el-input v-model="param.description" placeholder="描述" size="small" />
            </el-col>
            <el-col :span="3">
              <el-button type="danger" size="small" @click="removeParam(index)" icon="Delete">删除</el-button>
            </el-col>
          </el-row>
          <el-button type="primary" size="small" @click="addParam" icon="Plus">添加参数</el-button>
        </div>

        <el-divider content-position="left">
          <el-icon><component :is="icons.List" /></el-icon>
          工作流步骤（支持拖拽排序）
        </el-divider>

        <div class="steps-section">
          <el-alert
            title="💡 提示：拖拽步骤卡片可以调整顺序，点击步骤卡片可展开详细配置"
            type="info"
            :closable="false"
            style="margin-bottom: 15px;"
          />
          
          <draggable 
            v-model="currentWorkflow.steps" 
            item-key="id" 
            handle=".drag-handle"
            ghost-class="ghost-step"
            @end="onDragEnd"
            class="steps-list"
          >
            <template #item="{ element: step, index }">
              <div 
                class="step-card"
                :class="{ 
                  'active': expandedStepIndex === index,
                  'navigate-step': step.action === 'navigate',
                  'click-step': step.action === 'click',
                  'input-step': step.action === 'input',
                  'upload-step': step.action === 'upload'
                }"
                @click="toggleStepExpand(index)"
              >
                <div class="step-header">
                  <el-icon class="drag-handle"><component :is="icons.Grid" /></el-icon>
                  <span class="step-number">{{ index + 1 }}</span>
                  <el-tag size="small" :type="getActionTagType(step.action)" class="step-action-tag">
                    {{ getActionName(step.action) }}
                  </el-tag>
                  <el-input 
                    v-model="step.name" 
                    placeholder="步骤名称" 
                    size="small" 
                    class="step-name-input"
                    @click.stop
                  />
                  <div class="step-actions" @click.stop>
                    <el-tooltip content="复制步骤" placement="top">
                      <el-button size="small" @click="duplicateStep(index)" icon="Copy" circle />
                    </el-tooltip>
                    <el-tooltip content="在下方插入步骤" placement="top">
                      <el-button size="small" @click="insertStepBelow(index)" icon="Plus" circle type="primary" />
                    </el-tooltip>
                    <el-tooltip content="删除步骤" placement="top">
                      <el-button size="small" @click="removeStep(index)" icon="Delete" circle type="danger" />
                    </el-tooltip>
                    <el-icon class="expand-icon" :class="{ 'expanded': expandedStepIndex === index }">
                      <component :is="icons.ArrowRight" />
                    </el-icon>
                  </div>
                </div>
                
                <div class="step-page-badge" v-if="step.page">
                  <el-tag size="small" type="warning">
                    <el-icon><component :is="icons.Document" /></el-icon>
                    {{ step.page }}
                  </el-tag>
                </div>

                <div v-if="expandedStepIndex === index" class="step-config">
                  <el-divider content-position="left">步骤配置</el-divider>
                  
                  <el-form label-width="100px" size="small">
                    <el-form-item label="操作类型">
                      <el-select v-model="step.action" @change="onActionChange(step)" style="width: 100%;">
                        <el-option label="🔗 导航" value="navigate" />
                        <el-option label="🖱️ 点击" value="click" />
                        <el-option label="⌨️ 输入文本" value="input" />
                        <el-option label="📤 上传文件" value="upload" />
                        <el-option label="⏳ 等待" value="wait" />
                        <el-option label="❓ 条件判断" value="if" />
                        <el-option label="🔄 循环" value="loop" />
                        <el-option label="📋 执行子工作流" value="subworkflow" />
                        <el-option label="📸 截图" value="screenshot" />
                      </el-select>
                    </el-form-item>

                    <el-form-item label="所属页面">
                      <el-select 
                        v-model="step.page" 
                        placeholder="选择页面（可选）" 
                        clearable
                        style="width: 100%;"
                        @change="onPageChange(step, index)"
                      >
                        <el-option-group label="登录流程">
                          <el-option label="登录页" value="login" />
                        </el-option-group>
                        <el-option-group label="商品流程">
                          <el-option label="商品列表" value="products" />
                          <el-option label="商品发布" value="publish" />
                          <el-option label="商品编辑" value="edit" />
                        </el-option-group>
                        <el-option-group label="评价流程">
                          <el-option label="评价列表" value="reviews" />
                          <el-option label="评价回复" value="reply" />
                        </el-option-group>
                        <el-option-group label="订单流程">
                          <el-option label="订单列表" value="orders" />
                          <el-option label="订单详情" value="order-detail" />
                        </el-option-group>
                        <el-option-group label="数据流程">
                          <el-option label="数据中心" value="data" />
                          <el-option label="数据报表" value="report" />
                        </el-option-group>
                      </el-select>
                    </el-form-item>

                    <template v-if="step.action === 'navigate'">
                      <el-form-item label="目标 URL">
                        <el-input v-model="step.config.url" placeholder="https://..." />
                      </el-form-item>
                      <el-form-item label="等待加载">
                        <el-switch v-model="step.config.waitForLoad" />
                        <span style="margin-left: 10px; color: #909399;">等待页面加载完成</span>
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'click' || step.action === 'input'">
                      <el-form-item label="选择 DOM 元素">
                        <el-select 
                          v-model="step.config.elementName" 
                          placeholder="从已配置元素中选择（推荐）" 
                          clearable
                          filterable
                          style="width: 100%;"
                          @change="onElementSelect(step)"
                        >
                          <el-option-group 
                            v-for="group in filteredElementGroups" 
                            :key="group.label" 
                            :label="group.label"
                          >
                            <el-option 
                              v-for="el in group.options" 
                              :key="el.name" 
                              :label="`${el.name} (${el.selector})`" 
                              :value="el.name"
                            >
                              <div class="element-option">
                                <span class="element-name">{{ el.name }}</span>
                                <code class="element-selector">{{ el.selector }}</code>
                              </div>
                            </el-option>
                          </el-option-group>
                        </el-select>
                      </el-form-item>
                      
                      <el-form-item label="选择器类型">
                        <el-radio-group v-model="step.config.selectorType" size="small">
                          <el-radio-button label="css">CSS</el-radio-button>
                          <el-radio-button label="xpath">XPath</el-radio-button>
                          <el-radio-button label="id">ID</el-radio-button>
                          <el-radio-button label="text">文本</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                      
                      <el-form-item label="选择器表达式">
                        <el-input 
                          v-model="step.config.selector" 
                          placeholder="例如: input[name='username'] 或 //button[text()='提交']"
                        >
                          <template #append>
                            <el-button @click="testSelector(step)" :loading="testingSelector">
                              测试
                            </el-button>
                          </template>
                        </el-input>
                      </el-form-item>
                      
                      <el-form-item v-if="step.config.elementName" label="元素详情">
                        <el-alert
                          :title="`已绑定元素: ${step.config.elementName}`"
                          type="success"
                          :closable="false"
                          show-icon
                        />
                      </el-form-item>
                      
                      <template v-if="step.action === 'input'">
                        <el-form-item label="输入值">
                          <el-input 
                            v-model="step.config.value" 
                            placeholder="输入值，支持 {param} 引用参数"
                          />
                        </el-form-item>
                        <el-form-item label="引用参数">
                          <el-tag 
                            v-for="param in currentWorkflow.parameters" 
                            :key="param.name"
                            @click="insertParam(step, param.name)"
                            style="cursor: pointer; margin: 2px;"
                          >
                            { {{ param.name }} }
                          </el-tag>
                        </el-form-item>
                      </template>
                    </template>
                    
                    <template v-else-if="step.action === 'upload'">
                      <el-form-item label="文件参数">
                        <el-select v-model="step.config.paramName" placeholder="选择文件参数" style="width: 100%;">
                          <el-option v-for="p in currentWorkflow.parameters.filter(p => p.type === 'files')" :key="p.name" :label="`{ ${p.name} }`" :value="p.name" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="选择 DOM 元素">
                        <el-select v-model="step.config.elementName" placeholder="从已配置元素中选择" clearable filterable style="width: 100%;">
                          <el-option-group v-for="group in filteredElementGroups" :key="group.label" :label="group.label">
                            <el-option v-for="el in group.options" :key="el.name" :label="el.name" :value="el.name">
                              <span>{{ el.name }}</span>
                              <code style="margin-left: 10px; color: #909399;">{{ el.selector }}</code>
                            </el-option>
                          </el-option-group>
                        </el-select>
                      </el-form-item>
                      <el-form-item label="选择器">
                        <el-input v-model="step.config.selector" placeholder="选择器表达式" />
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'wait'">
                      <el-form-item label="等待时间">
                        <el-input-number v-model="step.config.duration" :min="0" :step="100" />
                        <span style="margin-left: 10px;">毫秒</span>
                      </el-form-item>
                      <el-form-item label="等待条件">
                        <el-select v-model="step.config.waitFor" placeholder="等待条件">
                          <el-option label="固定时间" value="timeout" />
                          <el-option label="元素可见" value="visible" />
                          <el-option label="元素消失" value="hidden" />
                        </el-select>
                      </el-form-item>
                      <el-form-item v-if="step.config.waitFor !== 'timeout'" label="等待选择器">
                        <el-input v-model="step.config.waitSelector" placeholder="选择器表达式" />
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'if'">
                      <el-form-item label="条件表达式">
                        <el-input v-model="step.config.condition" placeholder="例如: {param} > 0" />
                      </el-form-item>
                      <el-form-item label="为真时执行">
                        <el-input v-model="step.config.thenSteps" placeholder="步骤索引，用逗号分隔" />
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'loop'">
                      <el-form-item label="循环项">
                        <el-input v-model="step.config.items" placeholder="例如: {productList}" />
                      </el-form-item>
                      <el-form-item label="循环变量">
                        <el-input v-model="step.config.loopVar" placeholder="例如: product" />
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'subworkflow'">
                      <el-form-item label="子工作流">
                        <el-select v-model="step.config.workflowName" placeholder="选择子工作流" style="width: 100%;">
                          <el-option v-for="wf in workflowTemplates.filter(w => w.id !== currentWorkflow.id)" :key="wf.id" :label="wf.name" :value="wf.name" />
                        </el-select>
                      </el-form-item>
                    </template>
                    
                    <template v-else-if="step.action === 'screenshot'">
                      <el-form-item label="文件名">
                        <el-input v-model="step.config.filename" placeholder="例如: step_{index}_{timestamp}" />
                      </el-form-item>
                      <el-form-item label="截图范围">
                        <el-radio-group v-model="step.config.capture">
                          <el-radio-button label="full">整页</el-radio-button>
                          <el-radio-button label="viewport">可视区域</el-radio-button>
                          <el-radio-button label="element">指定元素</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </template>

                    <el-form-item label="步骤描述">
                      <el-input v-model="step.description" type="textarea" :rows="2" placeholder="步骤的详细描述" />
                    </el-form-item>

                    <el-form-item label="失败处理">
                      <el-select v-model="step.config.onError" placeholder="出错时">
                        <el-option label="停止执行" value="stop" />
                        <el-option label="跳过继续" value="skip" />
                        <el-option label="重试" value="retry" />
                      </el-select>
                      <el-input-number 
                        v-if="step.config.onError === 'retry'" 
                        v-model="step.config.retryCount" 
                        :min="1" 
                        :max="5" 
                        label="重试次数"
                        style="margin-left: 10px;"
                      />
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </template>
          </draggable>
          
          <div class="add-step-actions">
            <el-button type="primary" @click="addStep('navigate')" icon="Plus">
              添加导航步骤
            </el-button>
            <el-button type="success" @click="addStep('click')" icon="Plus">
              添加点击步骤
            </el-button>
            <el-button type="warning" @click="addStep('input')" icon="Plus">
              添加输入步骤
            </el-button>
            <el-button @click="addStep()" icon="Plus">
              添加空步骤
            </el-button>
          </div>

          <el-divider content-position="left">
            <el-icon><component :is="icons.DataAnalysis" /></el-icon>
            步骤概览（页面分布）
          </el-divider>

          <div class="steps-overview">
            <el-card shadow="hover">
              <div class="overview-chart">
                <div 
                  v-for="(page, index) in getPageDistribution(currentWorkflow)" 
                  :key="index"
                  class="page-bar"
                >
                  <span class="page-name">{{ page.name }}</span>
                  <el-progress 
                    :percentage="page.percentage" 
                    :color="page.color"
                    :stroke-width="20"
                  />
                  <span class="page-count">{{ page.count }} 步</span>
                </div>
              </div>
            </el-card>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button @click="validateWorkflow">验证配置</el-button>
          <el-button type="primary" @click="saveWorkflow" :loading="saving">
            {{ editingWorkflow ? '更新模板' : '创建模板' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showPreviewDialog" title="🔍 工作流预览" width="80%">
      <div v-if="previewWorkflowData" class="workflow-preview">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">
            <strong>{{ previewWorkflowData.name }}</strong>
          </el-descriptions-item>
          <el-descriptions-item label="步骤数">
            <el-badge :value="previewWorkflowData.steps.length" type="primary" />
          </el-descriptions-item>
          <el-descriptions-item label="适用平台" :span="2">
            <el-tag v-for="p in previewWorkflowData.platforms" :key="p" size="small" type="success" style="margin: 2px;">
              {{ p }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="涉及页面" :span="2">
            <el-tag v-for="page in getUniquePages(previewWorkflowData)" :key="page" size="small" style="margin: 2px;">
              {{ page }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">步骤流程</el-divider>

        <el-steps :active="previewWorkflowData.steps.length" align-center>
          <el-step 
            v-for="(step, index) in previewWorkflowData.steps" 
            :key="index"
            :title="`步骤 ${index + 1}`"
            :description="`${getActionName(step.action)} - ${step.name}`"
          />
        </el-steps>

        <el-timeline style="margin-top: 30px;">
          <el-timeline-item 
            v-for="(step, index) in previewWorkflowData.steps" 
            :key="index" 
            :color="getStepColor(step.action)"
            :hollow="index % 2 === 1"
          >
            <el-card class="step-preview-card">
              <div class="step-preview-header">
                <span class="step-number">步骤 {{ index + 1 }}</span>
                <el-tag size="small" :type="getActionTagType(step.action)">
                  {{ getActionName(step.action) }}
                </el-tag>
                <el-tag v-if="step.page" size="small" type="warning" style="margin-left: 5px;">
                  <el-icon><component :is="icons.Document" /></el-icon>
                  {{ step.page }}
                </el-tag>
              </div>
              <div class="step-preview-name">{{ step.name }}</div>
              <div v-if="step.config.elementName" class="step-preview-element">
                <el-tag size="small" type="info">
                  绑定元素: {{ step.config.elementName }}
                </el-tag>
              </div>
              <div class="step-preview-config">
                <pre>{{ formatJSON(step.config) }}</pre>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <el-divider content-position="left">参数列表</el-divider>

        <el-table :data="previewWorkflowData.parameters" border size="small">
          <el-table-column prop="name" label="参数名" width="120">
            <template #default="scope">
              <code>{ {{ scope.row.name }} }</code>
            </template>
          </el-table-column>
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

    <el-dialog v-model="showElementDialog" title="🔧 DOM 元素管理" width="70%">
      <div class="element-manager">
        <div class="toolbar">
          <el-select v-model="elementFilter.platform" placeholder="选择平台" clearable style="width: 150px;">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
          <el-select v-model="elementFilter.page" placeholder="选择页面" clearable style="width: 150px;">
            <el-option v-for="pg in pageOptions" :key="pg" :label="pg" :value="pg" />
          </el-select>
          <el-button type="primary" @click="showAddElement = true" icon="Plus">添加元素</el-button>
        </div>

        <el-table :data="filteredElements" border size="small">
          <el-table-column prop="name" label="元素名称" width="150" />
          <el-table-column prop="selector" label="选择器" min-width="200">
            <template #default="scope">
              <code class="selector-code">{{ scope.row.selector }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="selector_type" label="类型" width="100">
            <template #default="scope">
              <el-tag size="small">{{ scope.row.selector_type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="page" label="页面" width="100" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.status === 'active' ? 'success' : 'info'">
                {{ scope.row.status === 'active' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button size="small" @click="editElement(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="showAddElement" title="添加元素" width="50%">
      <el-form :model="currentElement" label-width="100px">
        <el-form-item label="元素名称" required>
          <el-input v-model="currentElement.name" placeholder="例如: username_input" />
        </el-form-item>
        <el-form-item label="所属平台">
          <el-select v-model="currentElement.platform" style="width: 100%;">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属页面">
          <el-select v-model="currentElement.page" style="width: 100%;">
            <el-option v-for="pg in pageOptions" :key="pg" :label="pg" :value="pg" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择器类型">
          <el-select v-model="currentElement.selector_type" style="width: 100%;">
            <el-option label="CSS" value="css" />
            <el-option label="XPath" value="xpath" />
            <el-option label="ID" value="id" />
            <el-option label="文本" value="text" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择器" required>
          <el-input v-model="currentElement.selector" placeholder="选择器表达式" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="currentElement.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddElement = false">取消</el-button>
        <el-button type="primary" @click="saveElement">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import * as icons from '@element-plus/icons-vue'

export default {
  name: 'WorkflowConfig',
  components: { draggable },
  setup() {
    const workflowTemplates = ref([])
    const domElements = ref([])
    const showCreateDialog = ref(false)
    const showPreviewDialog = ref(false)
    const showElementDialog = ref(false)
    const showAddElement = ref(false)
    const editingWorkflow = ref(false)
    const previewWorkflowData = ref(null)
    const currentWorkflow = ref(null)
    const selectedPlatform = ref('')
    const isFullscreen = ref(false)
    const expandedStepIndex = ref(null)
    const saving = ref(false)
    const testingSelector = ref(false)
    const executedCount = ref(0)
    const isDragging = ref(false)

    const platforms = [
      { value: 'douyin', label: '抖音' },
      { value: 'pinduoduo', label: '拼多多' },
      { value: 'taobao', label: '淘宝' },
      { value: 'jingdong', label: '京东' },
      { value: 'xiaohongshu', label: '小红书' }
    ]

    const pageOptions = ['login', 'products', 'publish', 'edit', 'reviews', 'reply', 'orders', 'order-detail', 'data', 'report']

    const elementFilter = ref({ platform: '', page: '' })

    const currentElement = ref({
      name: '',
      platform: 'douyin',
      page: 'login',
      selector_type: 'css',
      selector: '',
      description: '',
      status: 'active'
    })

    const filteredWorkflows = computed(() => {
      if (!selectedPlatform.value) return workflowTemplates.value
      return workflowTemplates.value.filter(wf => wf.platforms.includes(selectedPlatform.value))
    })

    const filteredElements = computed(() => {
      let result = domElements.value
      if (elementFilter.value.platform) {
        result = result.filter(el => el.platform === elementFilter.value.platform)
      }
      if (elementFilter.value.page) {
        result = result.filter(el => el.page === elementFilter.value.page)
      }
      return result
    })

    const filteredElementGroups = computed(() => {
      const groups = []
      const pageMap = {}
      
      filteredElements.value.forEach(el => {
        const key = el.page || 'other'
        if (!pageMap[key]) {
          pageMap[key] = {
            label: `${getPageLabel(key)} - ${key}`,
            options: []
          }
        }
        pageMap[key].options.push(el)
      })
      
      Object.values(pageMap).forEach(group => {
        if (group.options.length > 0) {
          groups.push(group)
        }
      })
      
      return groups
    })

    const getPageLabel = (page) => {
      const labels = {
        login: '登录页',
        products: '商品列表',
        publish: '商品发布',
        edit: '商品编辑',
        reviews: '评价列表',
        reply: '评价回复',
        orders: '订单列表',
        'order-detail': '订单详情',
        data: '数据中心',
        report: '数据报表'
      }
      return labels[page] || page
    }

    const totalSteps = computed(() => {
      return workflowTemplates.value.reduce((sum, wf) => sum + wf.steps.length, 0)
    })

    const getUniquePages = (workflow) => {
      const pages = new Set()
      workflow.steps.forEach(step => {
        if (step.page) pages.add(step.page)
      })
      return Array.from(pages)
    }

    const getPageDistribution = (workflow) => {
      const pageCount = {}
      workflow.steps.forEach(step => {
        const page = step.page || '未分类'
        pageCount[page] = (pageCount[page] || 0) + 1
      })
      
      const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9c27b0']
      const total = workflow.steps.length
      
      return Object.entries(pageCount).map(([name, count], index) => ({
        name: getPageLabel(name) || name,
        count,
        percentage: Math.round((count / total) * 100),
        color: colors[index % colors.length]
      }))
    }

    const toggleStepExpand = (index) => {
      expandedStepIndex.value = expandedStepIndex.value === index ? null : index
    }

    const onDragEnd = () => {
      ElMessage.success('步骤顺序已更新')
    }

    const onActionChange = (step) => {
      const defaultConfigs = {
        navigate: { url: '', waitForLoad: true },
        click: { selectorType: 'css', selector: '', elementName: '' },
        input: { selectorType: 'css', selector: '', value: '', elementName: '' },
        upload: { selectorType: 'css', selector: '', paramName: '', elementName: '' },
        wait: { duration: 1000, waitFor: 'timeout' },
        if: { condition: '', thenSteps: '' },
        loop: { items: '', loopVar: '' },
        subworkflow: { workflowName: '' },
        screenshot: { filename: 'step_{index}', capture: 'viewport' }
      }
      step.config = { ...defaultConfigs[step.action], onError: 'stop', retryCount: 3 }
    }

    const onElementSelect = (step) => {
      if (step.config.elementName) {
        const element = domElements.value.find(el => el.name === step.config.elementName)
        if (element) {
          step.config.selector = element.selector
          step.config.selectorType = element.selector_type
          step.page = element.page
          ElMessage.success(`已自动填充元素: ${element.name}`)
        }
      }
    }

    const onPageChange = (step, index) => {
      if (step.page && currentWorkflow.value.steps[index - 1]) {
        const prevStep = currentWorkflow.value.steps[index - 1]
        if (prevStep.page && prevStep.page !== step.page) {
          ElMessage.warning(`页面切换: ${prevStep.page} → ${step.page}，可能需要添加导航步骤`)
        }
      }
    }

    const insertParam = (step, paramName) => {
      if (!step.config.value) {
        step.config.value = `{${paramName}}`
      } else {
        step.config.value += ` {${paramName}}`
      }
    }

    const testSelector = async (step) => {
      testingSelector.value = true
      await new Promise(resolve => setTimeout(resolve, 1500))
      ElMessage.info('测试功能需要在浏览器环境中运行，当前显示为演示')
      testingSelector.value = false
    }

    const validateWorkflow = () => {
      if (!currentWorkflow.value.name) {
        ElMessage.warning('请输入模板名称')
        return
      }
      if (currentWorkflow.value.steps.length === 0) {
        ElMessage.warning('请至少添加一个步骤')
        return
      }
      
      const errors = []
      currentWorkflow.value.steps.forEach((step, index) => {
        if (!step.name) {
          errors.push(`步骤 ${index + 1}: 缺少步骤名称`)
        }
        if (['click', 'input', 'upload'].includes(step.action)) {
          if (!step.config.selector) {
            errors.push(`步骤 ${index + 1}: 缺少选择器`)
          }
        }
      })
      
      if (errors.length > 0) {
        ElMessage.error({
          message: errors.join('\n'),
          duration: 5000
        })
      } else {
        ElMessage.success('✅ 工作流配置验证通过！')
      }
    }

    const addParam = () => {
      currentWorkflow.value.parameters.push({ name: '', type: 'text', description: '', default: '' })
    }

    const removeParam = (index) => {
      currentWorkflow.value.parameters.splice(index, 1)
    }

    const addStep = (action = 'navigate') => {
      const step = {
        id: Date.now(),
        name: '',
        action,
        page: '',
        config: {},
        description: ''
      }
      onActionChange(step)
      currentWorkflow.value.steps.push(step)
      expandedStepIndex.value = currentWorkflow.value.steps.length - 1
    }

    const removeStep = (index) => {
      ElMessageBox.confirm('确定要删除这个步骤吗？', '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        currentWorkflow.value.steps.splice(index, 1)
        ElMessage.success('步骤已删除')
      }).catch(() => {})
    }

    const duplicateStep = (index) => {
      const original = currentWorkflow.value.steps[index]
      const copy = JSON.parse(JSON.stringify(original))
      copy.id = Date.now()
      copy.name = `${original.name} (副本)`
      currentWorkflow.value.steps.splice(index + 1, 0, copy)
      ElMessage.success('步骤已复制')
    }

    const insertStepBelow = (index) => {
      const newStep = {
        id: Date.now(),
        name: '',
        action: 'navigate',
        page: '',
        config: { url: '', waitForLoad: true, onError: 'stop', retryCount: 3 },
        description: ''
      }
      currentWorkflow.value.steps.splice(index + 1, 0, newStep)
      expandedStepIndex.value = index + 1
      ElMessage.success('已在下方插入新步骤')
    }

    const saveWorkflow = () => {
      saving.value = true
      
      setTimeout(() => {
        if (!currentWorkflow.value.name) {
          ElMessage.warning('请输入模板名称')
          saving.value = false
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
        expandedStepIndex.value = null
        saving.value = false
      }, 500)
    }

    const editWorkflow = (workflow) => {
      currentWorkflow.value = JSON.parse(JSON.stringify(workflow))
      editingWorkflow.value = true
      showCreateDialog.value = true
    }

    const duplicateWorkflow = (workflow) => {
      const copy = JSON.parse(JSON.stringify(workflow))
      copy.id = Date.now()
      copy.name = `${workflow.name} (副本)`
      workflowTemplates.value.push(copy)
      ElMessage.success('模板已复制')
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

    const saveElement = () => {
      if (!currentElement.value.name || !currentElement.value.selector) {
        ElMessage.warning('请填写元素名称和选择器')
        return
      }
      
      domElements.value.push({
        ...currentElement.value,
        id: Date.now(),
        created_at: new Date().toLocaleString('zh-CN'),
        updated_at: new Date().toLocaleString('zh-CN')
      })
      
      showAddElement.value = false
      currentElement.value = {
        name: '', platform: 'douyin', page: 'login',
        selector_type: 'css', selector: '', description: '', status: 'active'
      }
      ElMessage.success('元素已添加')
    }

    const editElement = (element) => {
      ElMessage.info('编辑元素功能')
    }

    const getActionTagType = (action) => {
      const types = {
        navigate: 'primary', click: 'success', input: 'warning',
        upload: 'danger', wait: 'info', if: '', loop: 'warning',
        subworkflow: '', screenshot: 'info'
      }
      return types[action] || 'info'
    }

    const getActionName = (action) => {
      const names = {
        navigate: '导航', click: '点击', input: '输入',
        upload: '上传', wait: '等待', if: '条件',
        loop: '循环', subworkflow: '子工作流', screenshot: '截图'
      }
      return names[action] || action
    }

    const getStepColor = (action) => {
      const colors = {
        navigate: '#409eff', click: '#67c23a', input: '#e6a23c',
        upload: '#f56c6c', wait: '#909399', if: '#9c27b0',
        loop: '#ff5722', subworkflow: '#00bcd4', screenshot: '#795548'
      }
      return colors[action] || '#909399'
    }

    const formatJSON = (obj) => {
      return JSON.stringify(obj, null, 2)
    }

    const initSampleData = () => {
      domElements.value = [
        { id: 1, name: 'username_input', selector: "input[name='username']", selector_type: 'css', description: '用户名输入框', platform: 'douyin', page: 'login', status: 'active' },
        { id: 2, name: 'password_input', selector: "input[name='password']", selector_type: 'css', description: '密码输入框', platform: 'douyin', page: 'login', status: 'active' },
        { id: 3, name: 'login_button', selector: "//button[contains(text(),'登录')]", selector_type: 'xpath', description: '登录按钮', platform: 'douyin', page: 'login', status: 'active' },
        { id: 4, name: 'product_title', selector: "//input[@id='title']", selector_type: 'xpath', description: '商品标题输入框', platform: 'douyin', page: 'publish', status: 'active' },
        { id: 5, name: 'product_price', selector: "#price", selector_type: 'id', description: '商品价格输入框', platform: 'douyin', page: 'publish', status: 'active' },
        { id: 6, name: 'image_upload', selector: ".upload-btn", selector_type: 'css', description: '图片上传按钮', platform: 'douyin', page: 'publish', status: 'active' },
        { id: 7, name: 'submit_button', selector: ".submit-btn", selector_type: 'css', description: '提交按钮', platform: 'douyin', page: 'publish', status: 'active' },
        { id: 8, name: 'review_list', selector: ".review-item", selector_type: 'css', description: '评价列表', platform: 'douyin', page: 'reviews', status: 'active' },
        { id: 9, name: 'reply_input', selector: "textarea[name='reply']", selector_type: 'css', description: '回复输入框', platform: 'douyin', page: 'reply', status: 'active' }
      ]

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
            { id: 1, name: '打开登录页', action: 'navigate', page: 'login', config: { url: 'https://creator.douyin.com/', waitForLoad: true, onError: 'stop' }, description: '导航到抖音创作服务平台' },
            { id: 2, name: '输入用户名', action: 'input', page: 'login', config: { selectorType: 'css', selector: "input[name='username']", elementName: 'username_input', value: '{username}', onError: 'retry', retryCount: 3 }, description: '填写用户名' },
            { id: 3, name: '输入密码', action: 'input', page: 'login', config: { selectorType: 'css', selector: "input[name='password']", elementName: 'password_input', value: '{password}', onError: 'retry', retryCount: 3 }, description: '填写密码' },
            { id: 4, name: '点击登录', action: 'click', page: 'login', config: { selectorType: 'xpath', selector: "//button[contains(text(),'登录')]", elementName: 'login_button', onError: 'stop' }, description: '提交登录' },
            { id: 5, name: '打开发布页', action: 'navigate', page: 'publish', config: { url: 'https://creator.douyin.com/product/publish', waitForLoad: true, onError: 'stop' }, description: '导航到商品发布页面' },
            { id: 6, name: '输入商品标题', action: 'input', page: 'publish', config: { selectorType: 'xpath', selector: "//input[@id='title']", elementName: 'product_title', value: '{title}', onError: 'retry', retryCount: 2 }, description: '填写商品标题' },
            { id: 7, name: '输入商品价格', action: 'input', page: 'publish', config: { selectorType: 'id', selector: '#price', elementName: 'product_price', value: '{price}', onError: 'retry', retryCount: 2 }, description: '填写商品价格' },
            { id: 8, name: '输入商品描述', action: 'input', page: 'publish', config: { selectorType: 'css', selector: '.product-desc', value: '{description}', onError: 'skip' }, description: '填写商品描述' },
            { id: 9, name: '上传商品图片', action: 'upload', page: 'publish', config: { selectorType: 'css', selector: '.upload-btn', elementName: 'image_upload', paramName: 'images', onError: 'retry', retryCount: 2 }, description: '上传商品图片' },
            { id: 10, name: '提交发布', action: 'click', page: 'publish', config: { selectorType: 'css', selector: '.submit-btn', elementName: 'submit_button', onError: 'stop' }, description: '点击提交按钮' },
            { id: 11, name: '等待结果', action: 'wait', page: 'publish', config: { duration: 3000, waitFor: 'timeout' }, description: '等待发布结果' }
          ]
        },
        {
          id: 2,
          name: '好评回复工作流',
          description: '自动回复店铺好评',
          platforms: ['抖音', '拼多多'],
          parameters: [
            { name: 'reviewCount', type: 'number', description: '回复数量', default: '10' },
            { name: 'replyTemplate', type: 'text', description: '回复模板', default: '感谢您的支持，欢迎再次光临！' }
          ],
          steps: [
            { id: 1, name: '打开评价页', action: 'navigate', page: 'reviews', config: { url: 'https://creator.douyin.com/review/list', waitForLoad: true }, description: '导航到评价页面' },
            { id: 2, name: '筛选好评', action: 'click', page: 'reviews', config: { selectorType: 'css', selector: '.filter-positive', onError: 'skip' }, description: '点击好评筛选' },
            { id: 3, name: '循环回复', action: 'loop', page: 'reviews', config: { items: '{reviewCount}', loopVar: 'review', onError: 'skip' }, description: '循环处理好评' },
            { id: 4, name: '输入回复', action: 'input', page: 'reply', config: { selectorType: 'css', selector: "textarea[name='reply']", elementName: 'reply_input', value: '{replyTemplate}', onError: 'skip' }, description: '填写回复内容' },
            { id: 5, name: '提交回复', action: 'click', page: 'reply', config: { selectorType: 'css', selector: '.send-btn', onError: 'skip' }, description: '提交回复' }
          ]
        }
      ]
    }

    onMounted(() => {
      initSampleData()
    })

    return {
      icons,
      workflowTemplates,
      domElements,
      showCreateDialog,
      showPreviewDialog,
      showElementDialog,
      showAddElement,
      editingWorkflow,
      previewWorkflowData,
      currentWorkflow,
      selectedPlatform,
      isFullscreen,
      expandedStepIndex,
      saving,
      testingSelector,
      executedCount,
      platforms,
      pageOptions,
      elementFilter,
      currentElement,
      filteredWorkflows,
      filteredElements,
      filteredElementGroups,
      totalSteps,
      isDragging,
      getUniquePages,
      getPageDistribution,
      getPageLabel,
      toggleStepExpand,
      onDragEnd,
      onActionChange,
      onElementSelect,
      onPageChange,
      insertParam,
      testSelector,
      validateWorkflow,
      addParam,
      removeParam,
      addStep,
      removeStep,
      duplicateStep,
      insertStepBelow,
      saveWorkflow,
      editWorkflow,
      duplicateWorkflow,
      deleteWorkflow,
      saveElement,
      editElement,
      getActionTagType,
      getActionName,
      getStepColor,
      formatJSON
    }
  }
}
</script>

<style scoped>
.workflow-config {
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

.stats-card {
  @apply mb-5 rounded-xl;
}

.stats-content {
  @apply flex items-center gap-4;
}

.stats-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl;
}

.stats-info {
  @apply flex-1;
}

.stats-value {
  @apply text-2xl font-bold text-gray-800;
}

.stats-label {
  @apply text-gray-400 text-sm;
}

.main-card {
  @apply mt-5 rounded-xl;
}

.card-header {
  @apply flex justify-between items-center mb-4;
}

.card-header h3 {
  @apply m-0 text-lg;
}

.header-actions {
  @apply flex items-center;
}

.template-name {
  @apply flex items-center gap-2;
}

.workflow-editor {
  @apply max-h-3xl overflow-y-auto pr-3;
}

.dialog-header {
  @apply flex justify-between items-center w-full;
}

.workflow-form {
  @apply mb-5;
}

.params-section {
  @apply my-5 p-4 bg-gray-50 rounded-lg;
}

.param-row {
  @apply mb-3;
}

.steps-section {
  @apply my-5;
}

.steps-list {
  @apply flex flex-col gap-3 min-h-24;
}

.step-card {
  @apply border-2 border-gray-300 rounded-lg p-4 bg-white cursor-pointer transition-all duration-300;
}

.step-card:hover {
  @apply border-blue-500;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.step-card.active {
  @apply border-blue-500 bg-blue-50;
}

.step-card.navigate-step { @apply border-l-4 border-l-blue-500; }
.step-card.click-step { @apply border-l-4 border-l-green-500; }
.step-card.input-step { @apply border-l-4 border-l-yellow-500; }
.step-card.upload-step { @apply border-l-4 border-l-red-500; }

.ghost-step {
  @apply opacity-50 bg-red-500 border-2 border-dashed border-red-500;
}

.step-header {
  @apply flex items-center gap-3;
}

.drag-handle {
  @apply cursor-move text-gray-400 text-xl;
}

.step-number {
  @apply w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm;
}

.step-action-tag {
  @apply min-w-16 text-center;
}

.step-name-input {
  @apply flex-1 max-w-48;
}

.step-actions {
  @apply flex gap-1 ml-auto;
}

.expand-icon {
  @apply transition-transform duration-300 ml-3;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.step-page-badge {
  @apply mt-2;
}

.step-config {
  @apply mt-4 pt-4 border-t border-dashed border-gray-300;
}

.element-option {
  @apply flex justify-between w-full;
}

.element-name {
  @apply font-medium;
}

.element-selector {
  @apply text-gray-400 text-xs;
}

.add-step-actions {
  @apply flex gap-3 mt-4 flex-wrap;
}

.steps-overview {
  @apply mt-5;
}

.overview-chart {
  @apply flex flex-col gap-4;
}

.page-bar {
  @apply flex items-center gap-4;
}

.page-name {
  @apply w-24 font-medium;
}

.page-count {
  @apply w-16 text-right text-gray-400;
}

.dialog-footer {
  @apply flex gap-3 justify-end;
}

.selector-code {
  @apply bg-gray-100 px-2 py-1 rounded text-xs text-gray-600;
}

.element-manager {
  @apply p-3;
}

.toolbar {
  @apply flex gap-3 mb-5;
}

.workflow-preview {
  @apply max-h-70vh overflow-y-auto;
}

.step-preview-card {
  @apply mb-3;
}

.step-preview-header {
  @apply flex gap-3 items-center mb-2;
}

.step-preview-name {
  @apply text-base font-medium text-gray-800 mb-2;
}

.step-preview-element {
  @apply mb-2;
}

.step-preview-config {
  @apply bg-gray-50 p-3 rounded;
}

.step-preview-config pre {
  @apply m-0 text-xs;
}

@media (max-width: 768px) {
  .add-step-actions {
    @apply flex-col;
  }

  .step-header {
    @apply flex-wrap;
  }

  .step-name-input {
    @apply max-w-none flex-1;
  }
}
</style>
