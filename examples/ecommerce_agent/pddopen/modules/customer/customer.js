#!/usr/bin/env node
// 客服绩效数据提取脚本
// 2026-04-25 迁移：简单按钮改用 page.locator()，日历逻辑保留 evaluate

const { findAccountByKeyword } = require('../../utils/accounts');
const { startChrome } = require('../../utils/browser');
const { fullLoginFlow } = require('../../utils/login');
const { writeCustomerPerformance } = require('../../utils/excel');
const { waitWithHeartbeat, safeGoto } = require('../../utils/sigkill_guard');
const { getCssQuerySelector, getCssQuerySelectors } = require('../../utils/elements');
const playwright = require('playwright');

const CUSTOMER_PERFORMANCE_URL = 'https://mms.pinduoduo.com/mms-chat/overview/merchant';

// ========================
// 简单按钮操作（可迁移）
// ========================

/**
 * 打开客服页面日历（Playwright 原生方式）
 */
async function openCalendar(page) {
  // 关闭 header mask（如果存在）
  try {
    await page.evaluate(() => {
      const mask = document.querySelector('#mms-header__mask, [class*="header__mask"]');
      if (mask) mask.remove();
    });
  } catch (e) {}
  
  // 使用 force 点击日历图标（避免被 header 遮挡）
  const calendarIcon = page.locator('[class*="RPR_iconCalendar"]').first();
  await calendarIcon.click({ force: true, timeout: 5000 });
  await waitWithHeartbeat(page, 2000, '等待日历打开');
}

/**
 * 点击查询按钮（Playwright 原生方式）
 */
async function clickQuery(page) {
  console.log('  🖱️ 点击查询');
  await page.locator('button').filter({ hasText: '查询' }).click();
  await waitWithHeartbeat(page, 5000, '等待查询结果');
}

/**
 * 点击确认按钮（Playwright 原生方式）
 */
async function clickConfirm(page) {
  console.log('  🖱️ 点击确认');
  await page.locator('button').filter({ hasText: '确认' }).click();
  await waitWithHeartbeat(page, 2000, '等待确定');
}

/**
 * 点击刷新按钮（如果有）
 */
async function clickRefresh(page) {
  const refreshBtn = page.locator('button').filter({ hasText: '刷新' });
  if (await refreshBtn.count() > 0) {
    console.log('  🖱️ 点击刷新');
    await refreshBtn.click();
    await waitWithHeartbeat(page, 2000, '等待刷新');
  }
}

// ========================
// 日历日期操作（保留 evaluate）
// ========================

/**
 * 点击日期 - 使用 evaluate（日历逻辑复杂，保留）
 * 客服日历结构：两个月份在同一个面板里，用月份标题的 x 坐标判断归属
 */
async function clickDate(page, targetDay, targetMonth) {
  const dayCellSelector = getCssQuerySelector('calendar', 'dayCell');
  const monthTitleSelector = getCssQuerySelector('calendar', 'monthTitle');
  
  const result = await page.evaluate((params) => {
    const { day, targetMonth, dayCellSelector, monthTitleSelector } = params;
    
    const panel = document.querySelector('[class*="RPR_outerPickerWrapper"]');
    
    const monthTitles = Array.from(document.querySelectorAll(monthTitleSelector || '[class*="RPR_dateText"]'))
      .map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent?.trim(), x: Math.round(r.x) };
      })
      .sort((a, b) => a.x - b.x);
    
    let panelMidX;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      panelMidX = rect.x + rect.width / 2;
    } else if (monthTitles.length >= 2) {
      panelMidX = (monthTitles[0].x + monthTitles[1].x) / 2;
    } else {
      panelMidX = 800;
    }
    
    const targetMonthNum = parseInt(targetMonth);
    const targetTitle = targetMonthNum + '月';
    const titleIndex = monthTitles.findIndex(m => m.text === targetTitle);
    const targetSide = titleIndex === 1 || (titleIndex === -1 && monthTitles.length > 0 && monthTitles[monthTitles.length - 1].text === targetTitle) ? 'right' : 'left';
    
    const selector = dayCellSelector || '[class*="RPR_tdDay_"]';
    const candidates = [];
    
    document.querySelectorAll(selector).forEach(td => {
      const text = td.innerText?.trim();
      if (parseInt(text) !== day) return;
      
      const className = td.className?.toString() || '';
      if (className.includes('RPR_outOfMonth')) return;
      
      const rect = td.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      
      const x = Math.round(rect.x);
      const side = x < panelMidX ? 'left' : 'right';
      
      candidates.push({ x: x, y: Math.round(rect.y), side: side, td: td });
    });
    
    if (candidates.length === 0) return '未找到';
    
    let filtered = candidates.filter(c => c.side === targetSide);
    if (filtered.length === 0) filtered = candidates;
    
    filtered.sort((a, b) => a.y - b.y || a.x - b.x);
    
    const selected = filtered[0];
    const clickX = selected.x + selected.td.getBoundingClientRect().width / 2;
    const clickY = selected.y + selected.td.getBoundingClientRect().height / 2;
    const event = new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY
    });
    selected.td.dispatchEvent(event);
    
    return `(${selected.x}, ${selected.y})`;
  }, { day: targetDay, targetMonth: targetMonth, dayCellSelector, monthTitleSelector });
  
  console.log(`    🖱️ 点击${targetDay}日: ${result}`);
}

/**
 * 切换到目标月份（保留 evaluate）
 */
async function switchToMonth(page, targetYear, targetMonth) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  let monthDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
  if (monthDiff === 0) return true;
  
  console.log(`  📅 需要翻页: ${monthDiff > 0 ? '+' : ''}${monthDiff} 个月`);
  
  const direction = monthDiff < 0 ? 'prev' : 'next';
  
  for (let i = 0; i < Math.abs(monthDiff); i++) {
    await page.evaluate((dir) => {
      const arrows = document.querySelectorAll('*');
      let targetChar = dir === 'prev' ? '‹' : '›';
      
      arrows.forEach(el => {
        if (el.innerText === targetChar || el.innerText === (dir === 'prev' ? '<' : '>')) {
          const rect = el.getBoundingClientRect();
          const isLeftArrow = rect.x > 680 && rect.x < 820;
          const isRightArrow = rect.x > 830 && rect.x < 970;
          
          if ((dir === 'prev' && isLeftArrow) || (dir === 'next' && isRightArrow)) {
            el.click();
          }
        }
      });
    }, direction);
    
    await waitWithHeartbeat(page, 1000, '翻页');
  }
  
  return true;
}

/**
 * 选择日期范围（使用迁移后的函数）
 */
async function selectDateRange(page, startDay, startMonth, endDay, endMonth) {
  console.log(`  📅 选择 ${startDay}日 ~ ${endDay}日`);
  
  console.log(`  🖱️ 点击开始日期: ${startDay}日 (${startMonth}月)`);
  await clickDate(page, startDay, startMonth);
  await waitWithHeartbeat(page, 500, '等待选中');
  
  console.log(`  🖱️ 点击结束日期: ${endDay}日 (${endMonth}月)`);
  await clickDate(page, endDay, endMonth);
  await waitWithHeartbeat(page, 500, '等待选中');
  
  console.log(`  🖱️ 点击确认`);
  await clickConfirm(page);
  await waitWithHeartbeat(page, 2000, '等待日期确定');
  
  return true;
}

/**
 * 选择昨日日期（常用快捷操作）
 */
async function selectYesterday(page) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const year = yesterday.getFullYear();
  const month = yesterday.getMonth() + 1;
  const day = yesterday.getDate();
  
  console.log(`\n📅 选择昨日: ${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
  
  await openCalendar(page);
  await waitWithHeartbeat(page, 1000, '日历打开');
  
  await switchToMonth(page, year, month);
  await waitWithHeartbeat(page, 500, '月份切换');
  
  await clickDate(page, day, month);
  await waitWithHeartbeat(page, 500, '选择日期');
  
  await clickConfirm(page);
  await waitWithHeartbeat(page, 1500, '确定日期');
}

// ========================
// 数据提取（保留 evaluate）
// ========================

/**
 * 提取客服绩效数据
 * 表格列：序号 | 客服账号 | 客服服务分 | 咨询人数 | 询单人数 | ... | 投诉数
 */
async function extractCustomerPerformance(page) {
  console.log('\n📊 提取客服绩效数据...');
  
  const data = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return [];
    
    const rows = table.querySelectorAll('tbody tr');
    const result = [];
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 5) return;
      
      // 列索引：
      // 0=序号, 1=客服账号, 2=客服服务分, 3=咨询人数, 4=询单人数, 
      // 5=最终成团人数, 6=询单转化率, 7=客服销售额, 8=去退销售额,
      // 9=需要人工回复的咨询人数, 10=人工接待人数, 11=3分钟未回复人数,
      // 12=3分钟人工回复率, 13=30秒应答率, 14=平均人工响应时长,
      // 15=评分≤3订单数, 16=纠纷退款数, 17=投诉数
      
      const seqNum = cells[0]?.innerText?.trim();
      const customerName = cells[1]?.innerText?.trim();
      
      // 跳过平均行，保留总计和其他客服
      if (!customerName || customerName.includes('平均')) return;
      
      result.push({
        seqNum: seqNum,
        customerName: customerName,
        serviceScore: cells[2]?.innerText?.trim() || '-',
        consultCount: cells[3]?.innerText?.trim() || '0',    // 咨询人数
        inquiryCount: cells[4]?.innerText?.trim() || '0',    // 询单人数
        groupCount: cells[5]?.innerText?.trim() || '0',      // 最终成团人数
        conversionRate: cells[6]?.innerText?.trim() || '-',
        salesAmount: cells[7]?.innerText?.trim() || '0',
        netSalesAmount: cells[8]?.innerText?.trim() || '0',
        needReplyCount: cells[9]?.innerText?.trim() || '0',
        humanReplyCount: cells[10]?.innerText?.trim() || '0',
        threeMinNoReply: cells[11]?.innerText?.trim() || '0',
        threeMinReplyRate: cells[12]?.innerText?.trim() || '-',
        thirtySecRate: cells[13]?.innerText?.trim() || '-',
        avgResponseTime: cells[14]?.innerText?.trim() || '-',
        lowScoreOrders: cells[15]?.innerText?.trim() || '0',
        disputeRefunds: cells[16]?.innerText?.trim() || '0',
        complaints: cells[17]?.innerText?.trim() || '0',
      });
    });
    
    return result;
  });
  
  if (data.length === 0) {
    console.log('  ⚠️ 未找到数据');
  } else {
    console.log(`  ✅ 提取到 ${data.length} 条数据`);
    // 打印店铺总计（第一条）
    const shopTotal = data.find(d => d.customerName.includes('总计'));
    if (shopTotal) {
      console.log(`  📊 店铺总计: 咨询人数=${shopTotal.consultCount}, 询单人数=${shopTotal.inquiryCount}`);
    }
  }
  
  return data;
}

// ========================
// 主脚本兼容入口
// ========================

/**
 * 复用已有浏览器提取客服绩效
 * @param {number|null} port - CDP 端口（如已有浏览器）
 * @param {string} shopName - 店铺名
 * @param {string} shopId - 店铺ID
 * @param {string} date - 日期 YYYY-MM-DD（用于客服绩效通常是月份）
 * @returns {Promise<object>} 提取结果
 */
async function extractCustomerPerformancePlaywright(port, shopName, shopId, date) {
  console.log(`\n👥 提取客服绩效: ${shopName} (${date})`);
  
  let page = null;
  let browser = null;
  
  try {
    // 连接已有浏览器
    if (port) {
      console.log(`  🔗 复用已有浏览器 (端口: ${port})`);
      browser = await playwright.chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      const context = browser.contexts()[0] || await browser.newContext();
      page = context.pages()[0] || await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
    
    // 导航到客服绩效页面
    console.log(`  📍 导航到客服绩效页面`);
    await page.goto(CUSTOMER_PERFORMANCE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // 等待页面加载完成
    console.log('  ⏳ 等待页面加载...');
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      console.log('  ⚠️ networkidle 超时，继续');
    }
    await waitWithHeartbeat(page, 3000, '页面初始化');
    
    // 滚动到顶部确保按钮可见
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitWithHeartbeat(page, 1000);
    
    // 关闭可能存在的弹出层（常用功能等）
    console.log('  🗑️ 关闭弹出层');
    await page.keyboard.press('Escape');
    await waitWithHeartbeat(page, 1000, '关闭弹出层');
    
    // 解析日期（支持 YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD 范围）
    let startDate, endDate;
    if (date && date.includes('~')) {
      // 范围格式：2026-04-24~2026-04-25
      const parts = date.split('~');
      startDate = new Date(parts[0]);
      endDate = new Date(parts[1]);
        console.log(`  📅 日期范围: ${parts[0]} ~ ${parts[1]}`);
    } else if (date && /^\d{4}-\d{2}$/.test(date)) {
        // 整月格式：2026-04 → 展开为整月范围
        const [year, month] = date.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0); // 当月最后一天
        console.log(`  📅 整月: ${date} (${startDate.getDate()}日 ~ ${endDate.getDate()}日)`);
    } else {
      // 单日格式
      startDate = date ? new Date(date) : new Date();
      endDate = startDate;
      console.log(`  📅 单日: ${date || '今日'}`);
    }
    
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const startDay = startDate.getDate();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();
    
    // 打开日历
    console.log(`  📅 打开日历选择器`);
    await openCalendar(page);
    await waitWithHeartbeat(page, 2000, '日历打开');
    
    // 如果跨月，先切换到开始月份
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    
    if (startYear !== todayYear || startMonth !== todayMonth) {
      console.log(`  📅 切换到 ${startYear}-${startMonth}`);
      await switchToMonth(page, startYear, startMonth);
      await waitWithHeartbeat(page, 1000, '月份切换');
    }
    
    // 选择开始日期
    console.log(`  📅 选择开始日期: ${startYear}-${startMonth}-${startDay}`);
    await clickDate(page, startDay, startMonth);
    await waitWithHeartbeat(page, 500, '选择开始日期');
    
    // 如果结束日期与开始日期不同月份，需要切换
    if (endYear !== startYear || endMonth !== startMonth) {
      console.log(`  📅 切换到 ${endYear}-${endMonth}`);
      await switchToMonth(page, endYear, endMonth);
      await waitWithHeartbeat(page, 1000, '月份切换');
    }
    
    // 选择结束日期
    console.log(`  📅 选择结束日期: ${endYear}-${endMonth}-${endDay}`);
    await clickDate(page, endDay, endMonth);
    await waitWithHeartbeat(page, 500, '选择结束日期');
    
    // 点击确认
    await clickConfirm(page);
    await waitWithHeartbeat(page, 1500, '确定日期');
    
    // 关闭日历弹窗
    await page.keyboard.press('Escape');
    await waitWithHeartbeat(page, 1000, '关闭日历');
    
    // 点击查询按钮（可能需要滚动或强制点击）
    console.log('  🖱️ 点击查询');
    try {
      const queryBtn = page.locator('button:has-text("查询")').first();
      if (await queryBtn.isVisible({ timeout: 3000 })) {
        await queryBtn.click();
      } else {
        // 强制点击
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const queryBtn = btns.find(b => b.innerText.includes('查询'));
          if (queryBtn) queryBtn.click();
        });
      }
    } catch (e) {
      console.log('  ⚠️ 查询按钮点击失败:', e.message);
    }
    await waitWithHeartbeat(page, 3000, '等待查询结果');
    
    // 提取数据
    const data = await extractCustomerPerformance(page);
    
    if (data.length === 0) {
      console.log('  ⚠️ 未提取到数据');
      return { items: [], success: false };
    }
    
    console.log(`  ✅ 提取到 ${data.length} 条客服数据`);
    
    // 写入 Excel（使用新的数据格式）
    const monthStr = date || new Date().toISOString().slice(0, 10);
    const filePath = await writeCustomerPerformanceV2(shopId, shopName, monthStr, data);
    console.log(`  💾 数据已保存: ${filePath}`);
    
    return { items: data, success: true };
  } catch (e) {
    console.error('  ❌ 提取失败:', e.message);
    return { items: [], success: false, error: e.message };
  }
}

/**
 * 写入客服绩效数据 V2（新格式）
 */
async function writeCustomerPerformanceV2(shopId, shopName, dateStr, rows) {
  const XLSX = require('xlsx');
  const path = require('path');
  const { DATA_ROOT, DATA_BACKUP_ROOT } = require('../../utils/config');
  
  const filePath = path.join(DATA_ROOT, `CustomerPerformance_${shopId}.xlsx`);
  
  // 备份
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    const backupDir = path.join(DATA_ROOT, 'backup');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(filePath, path.join(backupDir, `CustomerPerformance_${shopId}.${ts}.xlsx`));
  }
  
  // 创建工作簿
  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }
  
  // 表头
  const headers = [
    '日期', '店铺', '客服账号', '客服服务分', '咨询人数', '询单人数', 
    '最终成团人数', '询单转化率', '客服销售额(元)', '去退销售额(元)',
    '需要人工回复的咨询人数', '人工接待人数', '3分钟未回复人数', '3分钟人工回复率',
    '30秒应答率', '平均人工响应时长', '评分≤3订单数', '纠纷退款数', '投诉数'
  ];
  
  // 转换为行数据
  const sheetData = rows.map(row => [
    dateStr,
    shopName,
    row.customerName,
    row.serviceScore,
    row.consultCount,
    row.inquiryCount,
    row.groupCount,
    row.conversionRate,
    row.salesAmount,
    row.netSalesAmount,
    row.needReplyCount,
    row.humanReplyCount,
    row.threeMinNoReply,
    row.threeMinReplyRate,
    row.thirtySecRate,
    row.avgResponseTime,
    row.lowScoreOrders,
    row.disputeRefunds,
    row.complaints
  ]);
  
  // 添加表头作为第一行
  sheetData.unshift(headers);
  
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // 使用日期作为 Sheet 名，处理重名问题
  let sheetName = dateStr.includes('~') ? dateStr : dateStr.slice(0, 10);
  // 如果 Sheet 名已存在，添加后缀
  let sheetIndex = 1;
  let baseSheetName = sheetName;
  while (workbook.SheetNames.includes(sheetName)) {
    sheetName = `${baseSheetName}_${sheetIndex}`;
    sheetIndex++;
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, filePath);
  console.log(`  📝 写入 ${sheetName} Sheet，${rows.length} 条数据`);
  
  return filePath;
}

// ========================
// 主流程
// ========================

async function getCustomerPerformance(account) {
  console.log(`\n👥 提取客服绩效: ${account.shop_name}`);
  
  // 启动浏览器
  const browserInfo = await startChrome(account);
  console.log(`  🌐 浏览器启动成功 (端口: ${browserInfo.port})`);
  
  const browser = await playwright.chromium.connectOverCDP(`http://localhost:${browserInfo.port}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    // 登录
    await fullLoginFlow(page, account);
    console.log('  ✅ 登录成功');
    
    // 导航
    console.log(`  📍 导航到客服绩效页面`);
    await safeGoto(page, CUSTOMER_PERFORMANCE_URL, { waitUntil: 'domcontentloaded' });
    await waitWithHeartbeat(page, 3000, '等待页面加载');
    
    // 选择昨日
    await selectYesterday(page);
    
    // 查询
    await clickQuery(page);
    await waitWithHeartbeat(page, 3000, '等待查询结果');
    
    // 提取数据
    const data = await extractCustomerPerformance(page);
    
    if (data.length === 0) {
      console.log('  ⚠️ 未提取到数据');
    } else {
      console.log(`  ✅ 提取到 ${data.length} 条客服数据`);
      
      // 写入 Excel
      const filePath = await writeCustomerPerformance(data, account.shop_name);
      console.log(`  💾 数据已保存: ${filePath}`);
    }
    
    return data;
  } catch (e) {
    console.error('  ❌ 提取失败:', e.message);
    return [];
  } finally {
    await browser.close();
  }
}

// CLI 入口
async function main() {
  const keyword = process.argv[2] || '瞳粉';
  const account = await findAccountByKeyword(keyword);
  
  if (!account) {
    console.log('❌ 未找到账号:', keyword);
    process.exit(1);
  }
  
  await getCustomerPerformance(account);
}

if (require.main === module) {
  main();
}

module.exports = {
  getCustomerPerformance,
  extractCustomerPerformancePlaywright,
  selectYesterday,
  selectDateRange,
  openCalendar,
  clickQuery,
  clickConfirm,
  clickRefresh,
  extractCustomerPerformance,
  writeCustomerPerformanceV2,
};
