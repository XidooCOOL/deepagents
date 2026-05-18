/**
 * navigate.js - 页面导航模块
 * 2026-04-25 更新：clickDateButton 使用 Playwright 原生方式
 */
const { waitForPageReady, getCurrentPage, closeAllPopups } = require('../../utils/page');
const { randomDelay } = require('../../utils/browser');
const { selectDateWithCalendar } = require('../../utils/calendar');
const { sidebarFallback } = require('../../utils/sidebar');

const SALES_DATA_BASE_URL = 'https://mms.pinduoduo.com/sycm/stores_data/operation';

/**
 * 导航到交易数据页面
 */
async function navigateToTransactionData(page, ctx, options) {
  options = options || {};
  const shouldSelectYesterday = options.selectYesterday || false;
  const currentPage = await getCurrentPage(page);
  
  if (currentPage === 'salesData') {
    if (shouldSelectYesterday) {
      const isYesterday = page.url().includes('dateFlag=0');
      if (!isYesterday) {
        console.log('📅 切换到昨日数据...');
        await clickDateButton(page, '昨日');
      } else {
        console.log('✅ 已在交易数据页面（昨日）');
      }
    }
    await waitForPageReady(page, ctx);
    return page;
  }
  
  console.log('📍 导航到交易数据页面...');
  
  // 主方案：URL 直接导航
  try {
    await page.goto(SALES_DATA_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForPageReady(page, ctx);
    console.log('✅ URL 导航成功');
  } catch (e) {
    console.log('⚠️ URL 导航失败，使用侧边栏 fallback...');
    const sidebarOk = await sidebarFallback(page, 'salesData', ctx);
    if (!sidebarOk) {
      throw new Error('无法导航到交易数据页面');
    }
  }
  
  if (shouldSelectYesterday) {
    await clickDateButton(page, '昨日');
  }
  
  console.log('✅ 导航完成');
  return page;
}

/**
 * 点击日期按钮（Playwright 原生方式）
 * @param {Page} page
 * @param {string} buttonText - 按钮文本，如 '昨日'
 */
async function clickDateButton(page, buttonText) {
  await randomDelay(1000, 2000);
  console.log(`📅 点击"${buttonText}"按钮...`);
  
  // 使用 page.locator() + filter 方式
  // 日期按钮通常在页面顶部区域
  try {
    // 方案1: 查找包含目标文字的按钮
    const btn = page.locator('button, div').filter({ hasText: buttonText }).first();
    
    // 检查按钮是否在顶部区域（y < 200）
    const isInHeader = await btn.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.y < 200 && rect.y > 0;
    });
    
    if (isInHeader) {
      await btn.click();
      console.log(`✅ 点击"${buttonText}"成功`);
    } else {
      // 方案2: 查找所有按钮，逐一检查位置
      const buttons = page.locator('[class*="date-picker"] button, [class*="date-picker"] div');
      const count = await buttons.count();
      
      let clicked = false;
      for (let i = 0; i < count; i++) {
        const b = buttons.nth(i);
        const text = await b.textContent();
        const y = await b.evaluate(el => el.getBoundingClientRect().y);
        
        if (text?.trim() === buttonText && y < 200 && y > 0) {
          await b.click();
          console.log(`✅ 点击"${buttonText}"成功`);
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        // 方案3: evaluate 兜底
        console.log('⚠️ locator 方式未找到，使用 evaluate 兜底');
        await page.evaluate((text) => {
          const divs = document.querySelectorAll('.date-picker-group_date-picker-item-inner__1BAKo');
          for (const div of divs) {
            if (div.textContent?.trim() === text && div.getBoundingClientRect().y < 200) {
              div.click();
              return true;
            }
          }
          return false;
        }, buttonText);
      }
    }
    
    // 等待页面刷新数据
    await page.waitForFunction(
      () => window.location.href.includes('dateFlag=0'),
      { timeout: 5000 }
    ).then(() => true).catch(() => false);
    
    await randomDelay(5000, 8000);
    
    // 获取当前统计时间
    const statTime = await page.evaluate(() => {
      const match = document.body.innerText.match(/统计时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    });
    if (statTime) {
      console.log(`✅ 当前统计时间: ${statTime}`);
    }
    
    return true;
  } catch (e) {
    console.log(`⚠️ 点击"${buttonText}"失败:`, e.message);
    return false;
  }
}

/**
 * 选择昨日日期
 */
async function selectYesterday(page, ctx) {
  await closeAllPopups(page);
  const currentPage = await getCurrentPage(page);
  if (currentPage !== 'salesData') {
    await navigateToTransactionData(page, ctx);
  }
  await waitForPageReady(page, ctx);
  await randomDelay(2000, 3000);
  await closeAllPopups(page);
  await clickDateButton(page, '昨日');
  return page;
}

/**
 * 选择指定日期
 */
async function selectDate(page, dateStr, ctx) {
  await closeAllPopups(page);
  
  const currentPage = await getCurrentPage(page);
  if (currentPage !== 'salesData') {
    await navigateToTransactionData(page, ctx);
  }
  
  await waitForPageReady(page, ctx);
  await randomDelay(2000, 3000);
  await closeAllPopups(page);
  
  console.log(`📅 选择日期: ${dateStr}`);
  
  // 检查是否是范围日期
  const isRange = dateStr.includes('~') || dateStr.includes('到') || dateStr.includes('至');
  
  if (isRange) {
    console.log('📅 范围日期，使用日历范围选择...');
    const { selectDateRange } = require('../../utils/calendar');
    const parts = dateStr.split(/[~-]/);
    const start = parts.slice(0, 3).join('-');
    const end = parts.slice(-3).join('-');
    await selectDateRange(page, start, end);
  } else {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = targetDate.getTime() === yesterday.getTime();
    const isToday = targetDate.getTime() === today.getTime();
    
    if (isToday) {
      console.log('📅 目标是今天，页面默认就是今天');
    } else if (isYesterday) {
      console.log('📅 目标日期是昨日，点击"昨日"按钮...');
      await clickDateButton(page, '昨日');
    } else {
      console.log('📅 非昨日日期，使用日历选择...');
      await selectDateWithCalendar(page, dateStr);
    }
  }
  
  return page;
}

module.exports = {
  navigateToTransactionData,
  selectYesterday,
  selectDate,
  closeAllPopups
};
