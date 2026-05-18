/**
 * sidebar.js - 侧边栏导航模块
 * 
 * 拼多多商家后台侧边栏导航逻辑：
 * | 侧边栏点击 | 还需要做什么 |
 * |-----------|-------------|
 * | 交易数据 | 直接到目标页面 ✅ |
 * | 客服数据 | 点"客服绩效数据" tab |
 * | 推广报表 | 直接到目标页面 ✅ |
 */

const { randomDelay } = require('./browser');

/**
 * 点击侧边栏菜单项
 * @param {Page} page 
 * @param {string} menuText - 菜单文本（交易数据、客服数据、推广报表）
 * @returns {Promise<boolean>} - 是否成功
 */
async function clickSidebarMenu(page, menuText) {
  console.log(`🖱️ 点击侧边栏「${menuText}」...`);
  
  const clicked = await page.evaluate((text) => {
    // 查找侧边栏中匹配文本的元素
    const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('[class*="menu"]') || document.body;
    const elements = sidebar.querySelectorAll('*');
    
    for (const el of elements) {
      if (el.textContent?.trim() === text && el.offsetParent !== null) {
        // 确保元素可见
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.click();
          return true;
        }
      }
    }
    return false;
  }, menuText);
  
  if (clicked) {
    console.log(`✅ 侧边栏「${menuText}」点击成功`);
    return true;
  }
  
  console.log(`⚠️ 侧边栏「${menuText}」点击失败`);
  return false;
}

/**
 * 导航到交易数据页面
 * @param {Page} page 
 * @param {Object} ctx
 * @returns {Promise<boolean>}
 */
async function navigateToSalesDataFromSidebar(page, ctx) {
  // 1. 点击侧边栏"交易数据"
  const clicked = await clickSidebarMenu(page, '交易数据');
  if (clicked) {
    await randomDelay(2000, 3000);
    return true;
  }
  return false;
}

/**
 * 导航到客服绩效页面（需要二次点击）
 * @param {Page} page 
 * @param {Object} ctx
 * @returns {Promise<boolean>}
 */
async function navigateToCustomerPerformanceFromSidebar(page, ctx) {
  // 1. 点击侧边栏"客服数据"
  console.log('🖱️ 侧边栏点击「客服数据」（展开子菜单）...');
  const clicked1 = await clickSidebarMenu(page, '客服数据');
  if (!clicked1) {
    console.log('❌ 无法点击「客服数据」');
    return false;
  }
  
  // 2. 等待子菜单展开
  await randomDelay(1000, 2000);
  
  // 3. 点击"客服绩效数据"
  console.log('🖱️ 点击「客服绩效数据」tab...');
  const clicked2 = await page.evaluate(() => {
    // 查找"客服绩效数据"文本
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.textContent?.trim() === '客服绩效数据' && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.click();
          return true;
        }
      }
    }
    return false;
  });
  
  if (clicked2) {
    console.log('✅ 「客服绩效数据」点击成功');
    await randomDelay(2000, 3000);
    return true;
  }
  
  console.log('❌ 无法点击「客服绩效数据」');
  return false;
}

/**
 * 导航到推广报表页面
 * @param {Page} page 
 * @param {Object} ctx
 * @returns {Promise<boolean>}
 */
async function navigateToTuikeReportFromSidebar(page, ctx) {
  // 1. 点击侧边栏"推广报表"
  const clicked = await clickSidebarMenu(page, '推广报表');
  if (clicked) {
    await randomDelay(2000, 3000);
    return true;
  }
  return false;
}

/**
 * Fallback 侧边栏导航（URL 导航失败时使用）
 * @param {Page} page 
 * @param {string} target - 目标页面类型：'salesData' | 'customerPerformance' | 'tuikeReport'
 * @param {Object} ctx
 * @returns {Promise<boolean>}
 */
async function sidebarFallback(page, target, ctx) {
  console.log(`🔄 使用侧边栏 fallback 导航到: ${target}`);
  
  try {
    switch (target) {
      case 'salesData':
        return await navigateToSalesDataFromSidebar(page, ctx);
        
      case 'customerPerformance':
        return await navigateToCustomerPerformanceFromSidebar(page, ctx);
        
      case 'tuikeReport':
        return await navigateToTuikeReportFromSidebar(page, ctx);
        
      default:
        console.error(`❌ 未知的侧边栏目标: ${target}`);
        return false;
    }
  } catch (e) {
    console.error(`❌ 侧边栏导航失败: ${e.message}`);
    return false;
  }
}

module.exports = {
  clickSidebarMenu,
  navigateToSalesDataFromSidebar,
  navigateToCustomerPerformanceFromSidebar,
  navigateToTuikeReportFromSidebar,
  sidebarFallback
};
