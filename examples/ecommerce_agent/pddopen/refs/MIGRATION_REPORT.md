# Playwright 原生点击方式迁移可行性报告

> 日期：2026-04-25
> 分析人：小古

---

## 一、两种点击方式对比

### 1. Playwright 原生方式（reply.js 采用）

```javascript
// page.locator() + click()
await page.locator('[data-testid="beast-core-select-header"]').click();

// page.locator() + fill()
await page.locator('[class*="MDL_modal__"] textarea').fill('回复内容');

// page.locator() + filter()
const sendBtn = page.locator('button').filter({ hasText: '发送' });

// page.locator() + waitForSelector()
await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

// 配合 Playwright 的自动等待机制
await page.click('button', { timeout: 5000 });
```

**优点：**
- ✅ Playwright 自动等待元素可见/可点击
- ✅ 语义清晰，代码可读性好
- ✅ 内置重试机制，更稳定
- ✅ 调试友好（Playwright DevTools 追踪）
- ✅ `filter().click()` 可精确定位目标元素

**缺点：**
- ❌ 复杂场景（如嵌套定位）有时不如 evaluate 直接
- ❌ 需要元素有稳定的 CSS 选择器或 data-testid

### 2. evaluate 方式（customer.js 等采用）

```javascript
// page.evaluate() 直接操作 DOM
await page.evaluate(() => {
  const inputs = document.querySelectorAll('input[placeholder*="开始时间"]');
  if (inputs.length > 0) inputs[0].click();
});

// 带参数的 evaluate
const result = await page.evaluate((params) => {
  const els = document.querySelectorAll(params.selector);
  return Array.from(els).map(el => el.textContent);
}, { selector: '.title' });
```

**优点：**
- ✅ 完全控制 DOM，可做复杂计算
- ✅ 适合动态/隐藏元素的定位
- ✅ 可批量操作（一次性获取多个元素）

**缺点：**
- ❌ 无自动等待，需手动处理时序
- ❌ 调试困难（DOM 操作不连贯）
- ❌ 代码冗长，可读性差

---

## 二、各模块迁移可行性分析

### 模块 | 当前方式 | 迁移可行性 | 评估

#### 1. reply.js（评价管理）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| setPageSize | `page.click()` | ✅ 已完成 | 使用 `data-testid` 选择器 |
| clickNextPage | `page.locator().click()` | ✅ 已完成 | `beast-core-pagination-next` |
| clickPrevPage | `page.locator().click()` | ✅ 已完成 | `beast-core-pagination-prev` |
| goToPage | `page.locator().fill()` | ✅ 已完成 | jumper-input |
| 点击筛选按钮 | `page.click()` | ✅ 已完成 | 使用 filter + hasText |

**结论：** reply.js 已完全采用 Playwright 原生方式 ✅

---

#### 2. navigate.js（评价页面导航）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| navigateToReviewPage | `page.goto()` | ✅ 无需改 | 页面导航 |
| navigateToReportPage | `page.goto()` | ✅ 无需改 | 页面导航 |
| setPageSize | 混合 (`page.click()` + `evaluate`) | ⚠️ 部分可行 | 已改用 page.click()，弹窗处理用 evaluate |
| clickNextPage | `page.locator().click()` | ✅ 已完成 | 在模块内 |
| clickPrevPage | `page.locator().click()` | ✅ 已完成 | 在模块内 |
| goToPage | `page.locator().fill()` | ✅ 已完成 | 在模块内 |

**结论：** navigate.js 已基本迁移完成 ✅

---

#### 3. customer.js（客服绩效）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| openCalendar | `evaluate()` | ✅ 可迁移 | 改用 `page.locator('input').click()` |
| clickDate | `evaluate()` | ⚠️ 复杂 | 涉及面板判断，建议保留 evaluate |
| 点击查询按钮 | `evaluate()` | ✅ 可迁移 | `page.locator('text=查询').click()` |
| 点击刷新按钮 | `evaluate()` | ✅ 可迁移 | `page.locator('text=刷新').click()` |

**迁移难点：** `clickDate` 函数的日历面板判断逻辑复杂，涉及：
- 动态月份面板定位
- DOM 结构遍历
- 跨月日期处理

**建议：** `clickDate` 保留 evaluate，其余改用 page.locator()

---

#### 4. extract.js（推广数据 + 销售数据）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| navigateToTransactionData | `evaluate()` | ✅ 可迁移 | 侧边栏导航改用 text 选择器 |
| selectYesterday | `page.click()` | ✅ 已完成 | 昨日按钮 |
| selectDate | `evaluate()` | ⚠️ 复杂 | 日历选择逻辑复杂 |
| 提取数据 | `evaluate()` | ✅ 保持 | 纯数据读取，无需改 |

**迁移难点：** `selectDate` 依赖日历组件的 DOM 结构判断

**建议：** 导航改用 page.locator()，数据提取保持 evaluate

---

#### 6. calendar.js（通用日历）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| selectDateWithCalendar | `evaluate()` | ⚠️ 复杂 | 日历选择逻辑复杂，建议保留 |
| isCalendarOpen | `evaluate()` | ✅ 可迁移 | 改用 `page.locator('[class*="calendar"]').count()` |

---

## 三、迁移工作量评估

| 模块 | 改动范围 | 工作量 | 风险 |
|------|----------|--------|------|
| navigate.js | 小部分 | ⭐ | 低 |
| customer.js | 按钮操作 | ⭐⭐ | 低 |
| filter.js | 筛选操作 | ⭐ | 低 |
| extract.js | 导航操作 | ⭐⭐ | 中 |
| calendar.js | 日历选择 | ⭐⭐⭐ | 中 |

**预计总工作量：** ⭐⭐（约 2-3 小时）

---

## 四、迁移策略建议

### 策略 1：保守迁移（推荐）

**只迁移简单场景：**
- ✅ 按钮点击（`page.locator('text=xxx').click()`）
- ✅ 下拉框选择（`page.locator().filter().click()`）
- ✅ 输入框填充（`page.locator().fill()`）

**保留 evaluate：**
- ⚠️ 日历日期选择（DOM 结构复杂）
- ⚠️ 跨 iframe 操作
- ⚠️ 动态坐标计算

### 策略 2：全面迁移

**优点：** 代码风格统一
**缺点：** 工作量大，风险高（日历逻辑可能不稳定）

---

## 五、核心选择器模式

### 按钮点击（推荐）

```javascript
// 文字按钮（最可靠）
await page.locator('button').filter({ hasText: '查询' }).click();

// 图标按钮（依赖 data-testid）
await page.locator('[data-testid="beast-core-icon-refresh"]').click();

// 下拉框
await page.locator('[data-testid="beast-core-select-header"]').click();
await page.locator('[role="option"]').filter({ hasText: '40条/页' }).click();
```

### 下拉选择（推荐）

```javascript
// 打开下拉框
await page.click('[data-testid="beast-core-select-header"]');

// 等待选项
await page.waitForSelector('[role="listbox"]');

// 选择选项（filter 方式）
await page.locator('[role="option"]').filter({ hasText: '40条/页' }).click();

// 或者索引方式
await page.locator('[role="option"]').nth(3).click();
```

### 输入填充（推荐）

```javascript
// 文本输入
await page.locator('input[placeholder*="日期"]').fill('2026-04-24');

// 翻页跳转
await page.locator('[data-testid="beast-core-pagination-jumper-input"]').fill('5');
await page.locator('[data-testid="beast-core-pagination-jumper-input"]').press('Enter');
```

---

## 六、结论

| 方案 | 推荐度 | 说明 |
|------|--------|------|
| **保守迁移** | ⭐⭐⭐⭐ | 只迁移简单场景，保留复杂 evaluate |
| 全面迁移 | ⭐⭐ | 工作量大，风险高 |
| 保持现状 | ⭐ | 已有代码稳定，但风格不统一 |

**小古建议：** 采用**保守迁移**策略，优先统一按钮和下拉框操作，日历等复杂场景保留 evaluate。

---

## 七、待迁移清单

### 高优先级（简单，可立即执行）

- [ ] customer.js - openCalendar() → `page.locator('input').click()`
- [ ] customer.js - 查询按钮 → `page.locator('text=查询').click()`
- [ ] customer.js - 刷新按钮 → `page.locator('text=刷新').click()`
- [ ] filter.js - 所有 evaluate 点击 → `page.locator().click()`

### 中优先级（需测试）

- [ ] extract.js - navigateToTransactionData() 侧边栏点击
- [ ] calendar.js - isCalendarOpen() 改用 locator 方式

### 低优先级（建议保留 evaluate）

- [ ] customer.js - clickDate() 日历日期选择
- [ ] extract.js - selectDate() 日历日期选择
- [ ] calendar.js - selectDateWithCalendar() 日历选择

---

*报告结束*


---

#### 5. filter.js（评价筛选）
| 功能 | 当前方式 | 迁移可行性 | 备注 |
|------|----------|------------|------|
| clickFilterButton | `evaluate()` | ✅ 可迁移 | 使用 `page