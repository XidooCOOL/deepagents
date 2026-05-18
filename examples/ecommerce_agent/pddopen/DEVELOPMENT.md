# pdd-open 开发规范

> 新功能开发指南与代码规范

---

## 目录

- [开发铁律](#开发铁律)
- [新增页面元素](#新增页面元素)
- [新增评价功能](#新增评价功能)
- [新增数据提取](#新增数据提取)
- [Excel 输出规范](#excel-输出规范)
- [飞书通知规范](#飞书通知规范)
- [模块开发模板](#模块开发模板)

---

## 开发铁律

> 所有代码修改必须遵循以下流程：

1. **不要擅自修改代码**：遇到问题优先排查原因
2. **说明原因**：先告诉用户问题的根本原因和修改方案
3. **获得同意后再改**：等用户确认才可修改
4. **改完验证**：修改后必须跑一遍完整流程确认修复有效

---

## 新增页面元素

### 1. 确定页面类型

根据 URL 匹配页面：

| URL 模式 | 页面 | 模块 |
|----------|------|------|
| `*/mms.pinduoduo.com/*` | MMS 后台 | mms |
| `*/yingxiao.pinduoduo.com/*` | 营销后台 | yingxiao |
| `*/member.pinduoduo.com/*` | 会员后台 | member |
| 所有页面 | 共享元素 | _shared |

### 2. 添加到 elements.json

```json
{
  "mms": {
    "url": "*/mms.pinduoduo.com/*",
    "elements": {
      "新元素名称": {
        "description": "描述",
        "keyword": "关键词",
        "selectors": [
          {
            "type": "css",
            "value": ".class-name",
            "note": "首选选择器"
          },
          {
            "type": "css-prefix",
            "value": "classPrefix",
            "note": "CSS Modules 前缀"
          }
        ]
      }
    }
  }
}
```

### 3. 选择器类型说明

| type | 说明 | 示例 |
|------|------|------|
| `css` | 标准 CSS 选择器 | `.user-name` |
| `css-prefix` | CSS Modules 前缀自动拼接 | `mallName` → `[class*="mallName"]` |
| `xpath` | XPath 选择器 | `//button[@type="submit"]` |
| `text` | 文本匹配 | `{ "type": "text", "value": "提交" }` |

### 4. 使用选择器

```javascript
// utils/elements.js 提供的函数
const { getSelector, getSelectors, buildLocator } = require('./utils/elements');

// 获取单个选择器
const selector = getSelector(page, '新元素名称');

// 获取多个选择器
const selectors = getSelectors(page, '新元素名称');

// 构建 Playwright Locator
const locator = buildLocator(page, '新元素名称');

// 查找元素
await locator.click();
await locator.fill('内容');
```

---

## 新增评价功能

### 1. 放置位置

```
modules/review/
├── index.js           # 自动导出（无需修改）
├── navigate.js       # 页面导航
├── filter.js         # 筛选功能
├── reply.js          # 回复/举报逻辑
├── review.js         # 评价提取
└── star-utils.js     # 星级工具
```

### 2. 筛选功能（filter.js）

```javascript
// 添加新的筛选条件
async function setContentFilter(page, type) {
  // type: 'hasImage' | 'hasVideo' | 'hasText' | 'hasAppend'
  await clickFilterButton(page, '内容筛选');
  await page.waitForTimeout(500);
  await clickFilterButton(page, type);
}
module.exports = { setContentFilter, /* ... */ };
```

### 3. 页面导航（navigate.js）

```javascript
// 评价管理页面 URL
const REVIEW_PAGE_URL = 'https://mms.pinduoduo.com/goods/evaluation/index';

// 新增页面
async function navigateToNewPage(page) {
  const NEW_PAGE_URL = 'https://mms.pinduoduo.com/xxx/new';
  const currentUrl = page.url();
  if (currentUrl.includes('/xxx/new')) {
    console.log('📍 已在目标页面');
    return;
  }
  await page.goto(NEW_PAGE_URL, { waitUntil: 'domcontentloaded' });
  await waitWithHeartbeat(page, 2000);
}
module.exports = { navigateToNewPage, /* ... */ };
```

### 4. 回复/举报逻辑（reply.js）

```javascript
const excel = require('../../utils/excel');

// 新增批量处理函数
async function batchProcessReviews(page, options) {
  const { limit = 999, shopId } = options;
  let processed = 0, success = 0;
  
  while (processed < limit) {
    // ... 处理逻辑
    
    // 更新 Excel
    if (orderId) {
      excel.updateReplyStatus(shopId, orderId);
    }
    
    processed++;
  }
  
  return { success, processed };
}

module.exports = { batchProcessReviews, /* ... */ };
```

---

## 新增数据提取

### 1. 模块放置

| 数据类型 | 目录 |
|---------|------|
| 销售数据 | `modules/extract/` |
| 客服绩效 | `modules/customer/` |
| 推广数据 | `modules/tuike/` |
| 新功能 | `modules/xxx/` |

### 2. 创建新模块

```
modules/xxx/
├── index.js      # 导出所有函数
└── xxx.js       # 主要功能实现
```

### 3. 模块模板

```javascript
/**
 * modules/xxx/index.js - 模块说明
 */
const xxx = require('./xxx');

module.exports = {
  ...xxx
};
```

```javascript
/**
 * modules/xxx/xxx.js - 功能实现
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const excel = require('../../utils/excel');
const notify = require('../../utils/notify');

/**
 * 提取数据
 * @param {Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function extractData(page, options) {
  const { dateStr, shopId, shopName } = options;
  
  // 1. 导航到目标页面
  await navigateToPage(page);
  
  // 2. 选择日期
  await selectDate(page, dateStr);
  
  // 3. 提取数据（DOM 或截图）
  const data = await extractFromDOM(page);
  // 或
  const data = await extractFromScreenshot(page);
  
  // 4. 写入 Excel
  await excel.writeXxxData(shopId, shopName, dateStr, data);
  
  // 5. 发送通知
  await notify.sendTaskComplete(shopName, 'xxx');
  
  return data;
}

module.exports = {
  extractData
};
```

---

## Excel 输出规范

### 1. 统一使用 excel.js

所有 Excel 操作必须通过 `utils/excel.js`，不要自己实现。

```javascript
const excel = require('../../utils/excel');
```

### 2. 现有函数

| 函数 | 用途 |
|------|------|
| `writeSalesData()` | 销售数据 |
| `writePromotionData()` | 推广数据 |
| `writeCustomerPerformance()` | 客服绩效 |
| `writeReviewData()` | 评价数据 |
| `updateReplyStatus()` | 更新回复状态 |
| `updateReportStatus()` | 更新举报状态 |

### 3. 新增 Excel 函数模板

在 `utils/excel.js` 中添加：

```javascript
/**
 * 写入新类型数据
 * @param {string} shopId - 店铺ID
 * @param {string} shopName - 店铺名
 * @param {string} dateStr - 日期
 * @param {Array} data - 数据
 * @returns {Promise<string>} 文件路径
 */
async function writeXxxData(shopId, shopName, dateStr, data) {
  ensureDir(DATA_ROOT);
  
  // 确定文件名
  const fileName = `xxx_${shopId}.xlsx`;
  const filePath = path.join(DATA_ROOT, fileName);
  
  // 读取现有数据
  let existingData = [];
  if (fs.existsSync(filePath)) {
    const wb = XLSX.readFile(filePath);
    existingData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) || [];
  }
  
  // 合并新数据
  const newData = data.map((item, i) => ({
    '序号': existingData.length + i + 1,
    '字段1': item.field1,
    '字段2': item.field2,
    // ...
  }));
  
  // 写入
  const allData = [...existingData, ...newData];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, filePath);
  
  console.log(`💾 已写入 ${newData.length} 条数据: ${fileName}`);
  return filePath;
}
module.exports = {
  writeXxxData,
  // ... 其他导出
};

---

## 飞书通知规范

### 1. 统一使用 notify.js

```javascript
const { notify, sendText } = require('../../utils/notify');
```

### 2. 现有通知函数

| 函数 | 用途 |
|------|------|
| `notify(title, msg, type)` | 通用通知 |
| `sendText(text)` | 发送文本 |
| `sendError(error, shopName)` | 发送错误 |
| `sendTaskComplete(shop, type)` | 任务完成 |
| `sendTaskError(shop, type, error)` | 任务失败 |
| `sendLoginSuccess(shop, admin)` | 登录成功 |
| `sendLoginFailed(shop, error)` | 登录失败 |

### 3. 发送通知示例

```javascript
// 发送任务完成通知
await notify.sendTaskComplete('瞳粉美瞳专营店', 'review');

// 发送错误通知
await notify.sendError('提取失败: ' + e.message, '瞳粉');

// 发送自定义消息
await notify.sendText('瞳粉提取完成\n销售: 1000元\n推广: 500元');
```

---

## 页面操作规范

### 1. 使用 page.js 工具函数

```javascript
const { 
  waitForPageReady,
  safeGoto,
  closeAllPopups
} = require('../../utils/page');
```

### 2. 安全跳转

```javascript
// 避免页面崩溃导致任务中断
await safeGoto(page, 'https://xxx.com/page', {
  waitUntil: 'domcontentloaded',
  timeout: 60000
});
```

### 3. 关闭弹窗

```javascript
// 通用关闭
await closeAllPopups(page);

// 或使用关闭函数
const { closeModal } = require('../../utils/page');
await closeModal(page);
```

### 4. 等待页面加载

```javascript
// 等待页面就绪
await waitForPageReady(page);

// 等待特定元素
await page.waitForSelector('table', { timeout: 15000 });
```

---

## DOM 操作规范

### 1. 优先使用 Playwright Locator

```javascript
// ✅ 推荐
await page.locator('.button').click();
await page.locator('input').fill('text');

// ⚠️ 避免
await page.evaluate(() => document.querySelector('.button').click());
```

### 2. React 状态更新

```javascript
// ✅ 使用 fill() 自动处理 React 状态
await page.locator('textarea').fill('回复内容');

// ❌ 避免
await page.locator('textarea').click();
await page.keyboard.type('回复内容');
```

### 3. 弹窗处理

```javascript
// 关闭弹窗（多管齐下）
async function closeModal(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid*="modal"]').forEach(el => el.remove());
  });
}
```

### 4. 截图保存

```javascript
const path = require('path');
const screenshotPath = path.join(__dirname, 'output', `page_${Date.now()}.png`);
await page.screenshot({ path: screenshotPath });
```

---

## 模块开发模板

### 新增独立模块

```
modules/newmodule/
├── index.js
└── newmodule.js
```

**index.js:**
```javascript
const nm = require('./newmodule');
module.exports = { ...nm };
```

**newmodule.js:**
```javascript
/**
 * modules/newmodule/newmodule.js - 新功能
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const excel = require('../../utils/excel');
const notify = require('../../utils/notify');
const { safeGoto } = require('../../utils/page');

/**
 * 主功能
 */
async function mainFunction(page, options) {
  const { shopId, shopName } = options;
  
  try {
    // 1. 导航
    await safeGoto(page, 'URL');
    
    // 2. 操作
    await doSomething(page);
    
    // 3. 提取
    const data = await extractData(page);
    
    // 4. 保存
    await excel.writeData(shopId, shopName, data);
    
    // 5. 通知
    await notify.sendTaskComplete(shopName, 'newmodule');
    
    return data;
  } catch (e) {
    await notify.sendTaskError(shopName, 'newmodule', e.message);
    throw e;
  }
}

module.exports = { mainFunction };
```

---

## 代码风格

### 1. 函数命名

- 函数：`camelCase` - `extractData()`, `batchReplyReviews()`
- 常量：`UPPER_SNAKE_CASE` - `DEFAULT_LIMIT`, `MAX_PAGES`
- 类：`PascalCase` - `ArgsParser`

### 2. 异步函数

```javascript
// ✅ 使用 async/await
async function fetchData(page) {
  const result = await page.evaluate(() => /* ... */);
  return result;
}

// ❌ 避免回调
function fetchData(page, callback) {
  page.evaluate(() => /* ... */).then(callback);
}
```

### 3. 错误处理

```javascript
async function safeOperation(page) {
  try {
    await page.locator('.button').click();
    return true;
  } catch (e) {
    console.log(`⚠️ 操作失败: ${e.message}`);
    return false;
  }
}
```

### 4. 日志输出

```javascript
console.log('📍 正在导航...');      // 开始
console.log('✅ 导航完成');         // 成功
console.log('⚠️ 跳过（已存在）');   // 跳过
console.log('❌ 操作失败');         // 失败
```

---

## 测试清单

新增功能后，验证以下内容：

- [ ] 模块加载无错误
- [ ] 命令行参数解析正确
- [ ] 页面导航正常
- [ ] 数据提取正确
- [ ] Excel 输出正确
- [ ] 飞书通知正常
- [ ] 错误处理正常
- [ ] 浏览器复用正常
- [ ] 日志输出清晰

---

## 相关文档

- [SKILL.md](./SKILL.md) - 使用指南
- [BUGS.md](./BUGS.md) - 踩坑记录
- [FUNCTIONS.md](./FUNCTIONS.md) - 函数文档
- [WIKI.md](./WIKI.md) - 技术参考

---

*最后更新：2026-04-29*
