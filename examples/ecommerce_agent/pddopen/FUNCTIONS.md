# pdd-open 函数文档

> v8.1.0 - 所有模块导出函数一览

---

## 目录

- [modules/review - 评价管理](#modulesreview---评价管理)
- [utils/excel.js](#utilsexceljs---excel-读写)
- [utils/browser.js](#utilsbrowserjs---chrome-启停)
- [utils/login.js](#utilsloginjs---扫码登录)
- [utils/notify.js](#utilsnotifyjs---飞书通知)
- [utils/accounts.js](#utilsaccountsjs---账号管理)
- [utils/calendar.js](#utilscalendarjs---日历操作)
- [utils/page.js](#utilspagejs---页面操作)
- [utils/elements.js](#utilselementsjs---元素选择器)
- [utils/vision.js](#utilsvisionjs---vlm-视觉识别)
- [utils/args_parser.js](#utilsargs_parserjs---参数解析)
- [utils/date_parser.js](#utilsdate_parserjs---日期解析)
- [utils/health_check.js](#utilshealth_checkjs---健康检查)
- [utils/cleanup.js](#utilscleanupjs---清理工具)
- [utils/data_cache.js](#utilsdata_cachejs---数据缓存)

---

## modules/review - 评价管理

### modules/review/reply.js

#### batchReplyReviews(page, options)

批量回复评价（筛选近30天 + 5星）

```javascript
await batchReplyReviews(page, {
  limit: 200,           // 最大处理条数，默认 200（最多200条）
  replyText: null,      // 自定义回复文本，默认随机模板
  shopId: '18',         // 店铺ID（用于 Excel 文件名）
  shopName: '瞳粉美瞳专营店'  // 店铺名称
});
```

**返回值**：
```javascript
{ replied: 3, skipped: 47, excelAdded: 1 }
```

---

#### batchReportReviews(page, options)

批量举报评价（筛选近30天 + 1-2星）

```javascript
await batchReportReviews(page, {
  stars: [1, 2],        // 目标星级，默认 [1, 2]
  reason: '同行恶意差评', // 举报原因，默认 '同行恶意差评'
  limit: 200,           // 最大处理条数，默认 200（最多200条）
  shopId: '18',         // 店铺ID（用于 Excel 文件名）
  shopName: '瞳粉美瞳专营店'  // 店铺名称
});
```

**返回值**：
```javascript
{ reported: 20, skipped: 5, excelAdded: 20 }
```

---

#### getRandomTemplate(templates)

获取随机回复模板

```javascript
getRandomTemplate();              // 使用默认模板
getRandomTemplate(['谢谢惠顾']);   // 使用指定模板
```

---

#### getReportTemplate(reason, star, hasImages)

获取举报内容模板

```javascript
getReportTemplate('同行恶意差评', 1, false);
// 返回包含模板内容的举报文本
```

---

#### 其他函数

| 函数 | 说明 |
|------|------|
| `getShopNames(options)` | 获取店铺名列表（用于检测回复内容） |
| `containsShopReply(text, shopNames)` | 检查是否包含店铺回复 |
| `extractPageReviews(page, shopNames)` | 提取单页评价 |
| `canReply(page, options)` | 检查是否可回复 |
| `submitReply(page, text, modalType)` | 提交回复 |
| `clickReplyButton(page, options)` | 点击回复按钮 |
| `isQuickReplyModalOpen(page, shopNames)` | 检查弹窗是否打开 |
| `closeReplyModal(page)` | 关闭回复弹窗 |
| `closeModal(page, type)` | 关闭弹窗 |
| `ensureModalClosed(page)` | 确保弹窗已关闭 |
| `clickReportButton(page, options)` | 点击举报按钮 |
| `selectReportReason(page, reason)` | 选择举报原因 |
| `fillReportContent(page, content)` | 填写举报内容 |
| `clickModalButton(page, text)` | 点击弹窗按钮 |

---

### modules/review/filter.js

#### clearAllFilters(page)

清除所有筛选条件

```javascript
await clearAllFilters(page);
```

---

#### setTimeFilter(page, period)

设置时间筛选

```javascript
await setTimeFilter(page, '30');  // 近30天
await setTimeFilter(page, '90');  // 近90天
await setTimeFilter(page, '180'); // 近180天
await setTimeFilter(page, 'custom'); // 自定义
```

**默认值**：`'30'`（近30天）

---

#### setStarFilter(page, star)

设置星级筛选

```javascript
await setStarFilter(page, 5);  // 5星
await setStarFilter(page, 1);  // 1星
await setStarFilter(page, 0);  // 全部星级
```

---

#### filterOneToTwoStars(page)

筛选1-2星（快捷方法）

```javascript
await filterOneToTwoStars(page);
```

---

### modules/review/navigate.js

#### navigateToReviewPage(page)

导航到评价管理页面

```javascript
await navigateToReviewPage(page);
```

---

#### setPageSize(page, size)

设置每页显示条数

```javascript
await setPageSize(page, 'max');  // 自动选择最大值（40条）
await setPageSize(page, 20);     // 指定条数
```

**默认值**：`'max'`（自动选择最大条数）

---

#### getPaginationInfo(page)

获取分页信息

```javascript
const info = await getPaginationInfo(page);
// { total: 279, pageSize: 40, totalPages: 7 }
```

---

### modules/review/review.js

#### extractReviews(page, options)

提取评价数据

```javascript
await extractReviews(page, {
  pageSize: 40,    // 每页条数，默认 40
  limit: 200      // 最大条数限制，默认 200（最多200条）
});
```

---

## utils/excel.js - Excel 读写

| 函数 | 说明 |
|------|------|
| `writeSalesData(shopId, shopName, dateStr, metrics)` | 写入销售数据 |
| `writePromotionData(shopId, shopName, dateStr, metrics)` | 写入推广数据 |
| `readSalesData()` | 读取销售数据 |
| `writeCustomerPerformance(shopId, shopName, month, data)` | 写入客服绩效 |
| `readCustomerPerformance(filePath)` | 读取客服绩效 |
| `getCustomerPerformanceMonths(shopId)` | 获取已提取月份 |
| `writeReviewData(shopId, reviews)` | 写入评价数据 |
| `updateReplyStatus(shopId, orderId)` | 更新回复状态 |
| `updateReportStatus(shopId, orderId)` | 更新举报状态 |

---

## utils/browser.js - Chrome 启停

| 函数 | 说明 |
|------|------|
| `killPort(port)` | 强制关闭端口进程 |
| `cleanPort(port)` | 清理端口占用 |
| `startChrome(acc)` | 启动 Chrome（指定 Profile） |
| `stopChrome(port)` | 停止 Chrome |
| `stopBrowserByShop(shop)` | 按店铺名停止 |
| `sleep(ms)` | 等待毫秒 |
| `randomDelay(min, max)` | 随机延迟 |

---

## utils/login.js - 扫码登录

| 函数 | 说明 |
|------|------|
| `connectToChrome(port)` | 连接到 Chrome CDP |
| `fullLoginFlow(port, shopName)` | 完整登录流程 |
| `closeAllPopups(page)` | 关闭所有弹窗 |
| `captureQrCode(page)` | 截取二维码图片 |
| `waitForLogin(page, timeout)` | 等待登录成功 |
| `verifyShopMatch(page, expectedShop)` | 验证店铺匹配 |
| `logoutAccount(page)` | 退出登录 |

---

## utils/notify.js - 飞书通知

| 函数 | 说明 |
|------|------|
| `notify(title, message, type)` | 发送通知 |
| `sendText(text, chatId)` | 发送文本 |
| `sendImage(imagePath, chatId)` | 发送图片 |
| `sendQrCode(qrPath, shopName)` | 发送二维码 |
| `sendLoginSuccess(shopName, adminName)` | 登录成功通知 |
| `sendExtractComplete(shopName, dataType)` | 提取完成通知 |
| `sendError(error, shopName)` | 错误通知 |

---

## utils/accounts.js - 账号管理

| 函数 | 说明 |
|------|------|
| `readAllAccounts()` | 读取所有账号 |
| `findAccountByKeyword(keyword)` | 按关键词查找（模糊匹配） |
| `getNextAvailablePort(startPort)` | 获取可用端口 |
| `isPortAvailable(port)` | 检查端口可用 |
| `isBrowserRunning(port)` | 检查浏览器运行状态 |
| `addAccount(shopName, shopId, adminName)` | 添加账号 |
| `listAccountsWithStatus()` | 列出所有账号及状态 |

---

## utils/calendar.js - 日历操作

| 函数 | 说明 |
|------|------|
| `selectDateRange(page, startDate, endDate)` | 选择日期范围 |
| `selectDateWithCalendar(page, dateStr)` | 用日历选择单日 |
| `openCalendar(page)` | 打开日历控件 |
| `getDateInputs(page)` | 获取日期输入框 |
| `getMonthPanels(page)` | 获取月份面板 |
| `switchToMonth(page, year, month)` | 切换到指定月份 |

---

## utils/page.js - 页面操作

| 函数 | 说明 |
|------|------|
| `waitForPageReady(page)` | 等待页面就绪 |
| `getCurrentPage(page)` | 获取当前页面名称 |
| `isOnPage(page, pageName)` | 检查是否在指定页面 |
| `isLoggedIn(page)` | 检查登录状态 |
| `ensureOnPage(page, pageName)` | 确保在指定页面 |
| `safeGoto(page, url, options)` | 安全跳转 |
| `closeAllPopups(page)` | 关闭所有弹窗 |

---

## utils/elements.js - 元素选择器

| 函数 | 说明 |
|------|------|
| `loadElements()` | 加载 elements.json |
| `matchPage(url)` | 匹配当前 URL |
| `getSelectors(page, elementName)` | 获取元素选择器 |
| `getSelector(page, elementName)` | 获取单个选择器 |
| `buildLocator(page, elementName)` | 构建 Playwright Locator |
| `getCssQuerySelector(elementName)` | 获取 CSS 查询选择器 |

---

## utils/vision.js - VLM 视觉识别

| 函数 | 说明 |
|------|------|
| `callMinimaxVLM(imageBase64, prompt)` | 调用 MiniMax VLM |
| `callArkVLM(imageBase64, prompt)` | 调用火山引擎 Ark VLM |
| `extractSalesDataFromImage(imageBase64)` | 从图片提取销售数据 |
| `extractCustomerServiceDataFromImage(imageBase64)` | 从图片提取客服数据 |

---

## utils/args_parser.js - 参数解析

| 类/方法 | 说明 |
|---------|------|
| `ArgsParser` | 参数解析器类 |
| `ArgsParser#get(name)` | 获取参数值 |
| `ArgsParser#has(name)` | 检查参数是否存在 |
| `ArgsParser#date()` | 解析日期参数 |

---

## utils/date_parser.js - 日期解析

| 函数 | 说明 |
|------|------|
| `parseDate(text)` | 解析自然语言日期文本 |
| `getYesterday()` | 获取昨天日期 |
| `getLastMonth()` | 获取上月日期范围 |
| `getCurrentMonth()` | 获取本月日期范围 |
| `getLast7Days()` | 获取最近7天 |
| `parseDateRange(text)` | 解析日期范围 |

---

## utils/health_check.js - 健康检查

| 函数 | 说明 |
|------|------|
| `checkBrowserHealth(port)` | 检查浏览器健康 |
| `checkLoginStatus(page)` | 检查登录状态 |
| `checkAllShops()` | 检查所有店铺 |
| `runHealthCheck(shop)` | 执行健康检查 |

---

## utils/cleanup.js - 清理工具

| 函数 | 说明 |
|------|------|
| `cleanupOldBackups(days)` | 清理旧备份 |
| `cleanupTempFiles()` | 清理临时文件 |
| `cleanupBrowserData()` | 清理浏览器数据 |

---

## utils/data_cache.js - 数据缓存

| 函数 | 说明 |
|------|------|
| `setCache(key, data)` | 设置缓存 |
| `getCache(key)` | 获取缓存 |
| `clearCache(key)` | 清除缓存 |
| `isCached(key)` | 检查是否缓存 |

---

## scripts/pdd-open.js - CLI 主入口

| 函数 | 说明 |
|------|------|
| `ph()` | 打印帮助信息 |
| `he(error, shop)` | 错误处理 |
| `gy()` | 获取昨天日期 |
| `main()` | 主函数 |

---

## modules/customer - 客服绩效

| 函数 | 说明 |
|------|------|
| `extractCustomerPerformance(page, options)` | 提取客服绩效 |
| `extractCustomerPerformancePlaywright(page, options)` | Playwright 提取 |

---

## modules/extract - 销售数据

| 函数 | 说明 |
|------|------|
| `fullExtractSales(page, dateStr, options)` | 完整提取销售数据 |
| `extractSalesData(page, dateStr)` | 提取销售数据 |
| `extractSalesFromScreenshot(page)` | 从截图提取数据 |

---

## modules/tuike - 推广数据

| 函数 | 说明 |
|------|------|
| `extractTuikePromotion(page, dateStr)` | 提取推广数据 |
| `navigateToTuike(page)` | 导航到推广页面 |
| `parseTuikeData(page)` | 解析推广数据 |

---

*最后更新：2026-04-29*