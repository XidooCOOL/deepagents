# pdd-open 踩坑记录

> v8.1.0 - 经验总结与 Bug 修复记录

---

## 目录

- [评价管理](#评价管理)
- [页面操作](#页面操作)
- [Excel 操作](#excel-操作)
- [其他问题](#其他问题)

---

## 评价管理

### Bug 1：评价回复弹窗区分

**问题**：拼多多有两类弹窗，需要区分处理

**现象**：
- 已回复过的评价：textarea placeholder = "暂不能回复"，按钮不可点击
- 未回复的评价：textarea placeholder = "该条评论暂无互动，快捷回复参与互动"，可正常回复

**解决**：点击评价后检查弹窗内容
```javascript
const afterClick = await page.evaluate((names) => {
  // ... 检测逻辑
  const textboxPlaceholder = textbox ? textbox.placeholder : '';
  if (textboxDisabled || textboxPlaceholder === '暂不能回复') {
    return { canReply: false, reason: '暂不能回复' };
  }
  return { canReply: true };
});
```

### Bug 2：回复按钮选择器

**问题**：找不到回复按钮

**原因**：按钮属性是 `data-tracking-click-viewid="reply_btn"`，文本是"回复"（不是"发布"）

**解决**：使用正确的选择器
```javascript
// 错误 ❌
page.locator('button:has-text("回复")')

// 正确 ✅
page.locator('table a:has-text("回复/互动")')
```

### Bug 3：评价表格操作按钮是 `<a>` 链接

**问题**：使用 button 选择器找不到举报/回复按钮

**原因**：拼多多评价表格的操作按钮是 `<a>` 链接不是 `<button>`

**解决**：
```javascript
// 错误 ❌
page.locator('button:has-text("回复/互动")')
page.locator('button:has-text("举报")')

// 正确 ✅
page.locator('table a:has-text("回复/互动")')
page.locator('table a:has-text("举报")')
```

### Bug 4：星级筛选没有 "1-2星" 组合按钮

**问题**：筛选 1-2 星差评时找不到按钮

**原因**：星级筛选是分开的单个按钮，没有 "1-2星" 组合按钮

**解决**：
```javascript
// 错误 ❌
page.locator('text=1-2星')

// 正确 ✅
await clickFilterButton(page, '1星');
await clickFilterButton(page, '2星');
```

### Bug 5：React 状态更新

**问题**：输入框内容输入后 React 状态没有更新

**解决**：使用 `textarea.fill()` 可以自动处理 React 状态更新
```javascript
// 错误 ❌
await page.locator('textarea').click();
await page.keyboard.type('回复内容');

// 正确 ✅
await page.locator('textarea').fill('回复内容');
```

### Bug 6：举报按钮不存在 = 已举报过

**问题**：列表页某些评价没有举报按钮

**原因**：没有举报按钮说明该评价已经举报过了

**解决**：检查按钮存在性即可判断
```javascript
const hasReportBtn = Array.from(reportBtns).some(a => 
  a.innerText.trim() === '举报'
);
const isReported = !hasReportBtn; // 无按钮 = 已举报
```

---

## 页面操作

### Bug 7：弹窗关闭被拦截

**问题**：点击关闭按钮被弹窗遮罩拦截

**原因**：弹窗遮罩层挡住了关闭按钮

**解决**：使用多管齐下的方式
```javascript
async function closeModal(page) {
  // 1. 先按 ESC
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // 2. 然后用 JS 强制移除
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="beast-core-modal"]')
      .forEach(el => el.remove());
    document.querySelectorAll('[data-testid="beast-core-modal-mask"]')
      .forEach(el => el.remove());
  });
}
```

### Bug 8：日历点击不生效

**问题**：双月份日历面板点击日期无效

**原因**：坐标点击在双面板模式下位置不准确

**解决**：在 evaluate 内直接调用 click()
```javascript
// 错误 ❌
await page.locator(dateSelector).click();

// 正确 ✅
await page.evaluate(() => {
  const dates = document.querySelectorAll('.calendar-date');
  dates.forEach(d => {
    if (d.innerText.includes('15')) d.click();
  });
});
```

### Bug 9：日历跨月日期选择错误

**问题**：跨月选择日期时选错了月份

**原因**：双月份面板有左右两个日期区域

**解决**：取 x 坐标最大的实例（右侧面板的日期）
```javascript
const rightDates = dates.filter(d => {
  const rect = d.getBoundingClientRect();
  return rect.x > window.innerWidth / 2;
});
```

### Bug 10：buildFilteredLocator strict mode violation

**问题**：页面有多个匹配元素，selectOne 报错

**原因**：选择器匹配了多个元素

**解决**：取第一个匹配
```javascript
// 错误 ❌
page.locator('.card').click();

// 正确 ✅
page.locator('.card').first().click();
```

---

## Excel 操作

### Bug 11：writeReviewData 返回值不匹配

**问题**：reply.js 调用 writeReviewData 时用 `.added` 取值失败

**原因**：writeReviewData 最初返回 `filePaths[]` 数组，而不是 `{added, skipped}` 对象

**解决**：统一返回值格式
```javascript
// excel.js 返回
return {
  filePaths,
  added: addedLowStar + addedHighStar,
  total: reviews.length,
  skipped: duplicateCount
};

// reply.js 调用
const writeResult = await excel.writeReviewData(shopId, pageReviews);
excelAddedCount += writeResult.added || 0;
```

### Bug 12：record.js 功能重复

**问题**：Excel 写入功能分散在 record.js 和 excel.js

**原因**：早期实现时没有统一

**解决**：迁移到 excel.js，删除 record.js
```javascript
// 统一使用 excel.js
const excel = require('../../utils/excel');
excel.writeReviewData();
excel.updateReplyStatus();
excel.updateReportStatus();
```

---

## 其他问题

### Bug 13：args_parser.get() 布尔值返回 null

**问题**：用 args_parser 检测 `--review` 参数时返回 null

**原因**：布尔标志返回 true 而不是 null

**解决**：
```javascript
// 错误 ❌
const doReview = p.get('--review'); // 可能返回 null

// 正确 ✅
const doReview = p.has('--review'); // 返回 true/false
```

### Bug 14：浏览器复用检测失效

**问题**：浏览器已启动但 isBrowserRunning 返回 false

**原因**：端口冲突或进程管理问题

**解决**：检查进程表
```javascript
const { isBrowserRunning, stopBrowserByShop } = require('../utils/browser');
if (!await isBrowserRunning(port)) {
  // 强制停止后重启
  await stopBrowserByShop(shop);
  await startChrome(acc);
}
```

---

## 经验总结

### 1. 评价回复流程

```
1. 筛选 → 近30天 + 5星
2. 遍历评价列表
3. 点击评价行 → 弹出回复框
4. 检查弹窗状态
   - 有回复 → 跳过
   - 无回复 → 填写回复内容
5. 点击"回复"按钮
6. 关闭弹窗
7. 更新 Excel 状态
```

### 2. 差评举报流程

```
1. 筛选 → 近30天 + 1星 + 2星
2. 遍历评价列表
3. 检查举报按钮是否存在
   - 无按钮 → 已举报过，跳过
   - 有按钮 → 点击举报
4. 选择举报原因
5. 填写举报内容
6. 提交举报
7. 更新 Excel 状态
```

### 3. Excel 文件命名规范

| 文件 | 内容 |
|------|------|
| `review_<shopId>_yes.xlsx` | 5星好评 |
| `review_<shopId>_no.xlsx` | 1-2星差评 |

### 4. 状态枚举

```javascript
const STATUS = {
  PENDING_REPLY: '待回复',   // 5星未回复
  REPLIED: '已回复',         // 已回复
  REPORTED: '已举报',        // 已举报
  SKIP: '无需处理'          // 3-4星
};
```

---

## Bug 15：时间筛选 30 天无效 + 每页条数重置 + limit 无限大

**问题**：
1. 调用 `filter.setTimeFilter(page, '30')` 时传入 `'30'` 但 switch 没有处理这个 case，默认走 `'90'`
2. 每页条数使用 `cfg.page_size || 40`，但 40 不是最大条数
3. 默认 limit 是 999，可能处理过多评价

**发现时间**：2026-04-29

**修复**：

1. `filter.js` 添加 `'30'` case，默认改为 `'30'`：
```javascript
switch (period) {
  case '30': targetText = '近30天'; break;  // ✅ 新增
  case '90': targetText = '近90天'; break;
  case '180': targetText = '近180天'; break;
  case 'custom': targetText = '自定义'; break;
  default: targetText = '近30天';  // ✅ 默认改为30天
}
```

2. `pdd-open.js` 使用 `'max'` 代替固定数字：
```javascript
await setPageSize(page, 'max');  // ✅ 使用最大条数
```

3. 限制 limit 最多 200 条：
```javascript
const limit = options.limit || 200;
const safeLimit = Math.min(limit, 200);  // ✅ 最多200条
```

**涉及文件**：
- `modules/review/filter.js`
- `modules/review/reply.js`
- `scripts/pdd-open.js`

### Bug 16：每页最大条数被筛选操作重置

**问题**：`setPageSize('max')` 在 `clearAllFilters` 和筛选操作之前设置，但筛选操作会重置每页条数

**原因**：`clearAllFilters` 和筛选按钮点击会触发页面刷新，导致之前设置的每页条数被重置

**发现时间**：2026-04-29

**修复**：

最佳方案：**把 `setPageSize('max')` 放在筛选操作之后**

```javascript
// ✅ 先清除筛选
await filter.clearAllFilters(page);
await waitWithHeartbeat(page, 1500, '清除筛选');

// ✅ 设置目标筛选条件（筛选会重置每页条数，所以先做筛选）
await filter.setTimeFilter(page, '30');
await waitWithHeartbeat(page, 1500, '筛选近30天');
await filter.setStarFilter(page, 5);
await waitWithHeartbeat(page, 1500, '筛选5星');

// ✅ 最后设置每页最大条数（筛选完成后设置，避免被重置）
await setPageSize(page, 'max');
```

**涉及文件**：
- `modules/review/reply.js` - 调整 `setPageSize` 调用顺序

---

*最后更新：2026-04-29*
