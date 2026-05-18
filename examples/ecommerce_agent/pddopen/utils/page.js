/**
 * page.js - 页面状态检测与等待模块
 * 
 * 功能：
 * 1. 等待页面加载完成（智能检测）
 * 2. URL 检测（结合 elements.json）
 * 3. 页面状态判断（考虑登录状态跳转）
 * 4. 关闭弹窗（Playwright 原生方式）
 * 
 * 2026-04-25 更新：closeAllPopups 优先使用 Playwright 原生方式
 */
const { randomDelay } = require('./browser');

/**
 * 加载 elements.json（复用 elements.js 的逻辑）
 */
let _elementsCache = null;
function loadElements() {
  if (_elementsCache) return _elementsCache;
  try {
    const fs = require('fs');
    const path = require('path');
    const { ELEMENTS_PATH } = require('./config');
    _elementsCache = JSON.parse(fs.readFileSync(ELEMENTS_PATH, 'utf8'));
    return _elementsCache;
  } catch (e) {
    console.error('[page] 加载 elements.json 失败:', e.message);
    return null;
  }
}

/**
 * 判断是否为 meta 信息（不作为页面）
 */
function isMetaKey(key) {
  return key === '_meta' || key === 'shared' || key.startsWith('_');
}

/**
 * 根据 URL 获取页面名称（匹配 elements.json 的 urlContains）
 */
function getPageName(url) {
  const data = loadElements();
  if (!data || !url) return null;

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const matches = [];
    
    for (const [pageName, pageInfo] of Object.entries(data)) {
      if (isMetaKey(pageName)) continue;
      if (!pageInfo.urlContains) continue;
      
      const pattern = pageInfo.urlContains;
      if (pathname.includes(pattern) || pathname === pattern) {
        const priority = pattern.split('/').filter(Boolean).length;
        matches.push({ pageName, priority });
      }
    }
    
    if (matches.length > 0) {
      matches.sort((a, b) => b.priority - a.priority);
      return matches[0].pageName;
    }
  } catch (e) {}
  
  return null;
}

/**
 * 等待页面加载完成（智能检测）
 */
async function waitForPageReady(page, ctx = null) {
  console.log('⏳ 等待页面加载完成...');
  
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('✅ 网络请求已完成');
  } catch (e) {
    console.log('⚠️ networkidle 超时，继续');
  }
  
  try {
    await page.waitForSelector('body', { state: 'attached', timeout: 10000 });
    await randomDelay(1000, 1500);
    console.log('✅ 页面 DOM 已就绪');
  } catch (e) {
    console.log('⚠️ DOM 等待超时');
  }
  
  try {
    const isLoading = await page.evaluate(() => {
      const loadingEls = document.querySelectorAll('[class*="loading"], [class*="Loading"]');
      return loadingEls.length > 0;
    });
    if (isLoading) {
      console.log('⏳ 检测到 loading 遮罩，等待...');
      await randomDelay(2000, 3000);
    }
  } catch (e) {}
  
  console.log('✅ 页面已就绪');
  return page;
}

/**
 * 获取当前页面名称
 */
async function getCurrentPage(page) {
  const url = page.url();
  return getPageName(url);
}

/**
 * 检查当前页面是否是目标页面
 */
async function isOnPage(page, targetPageName) {
  const currentPage = await getCurrentPage(page);
  return currentPage === targetPageName;
}

/**
 * 特殊页面检测：是否已登录
 */
async function isLoggedIn(page) {
  return !(await isOnPage(page, 'login'));
}

/**
 * 确保在目标页面，如果不在则导航
 */
async function ensureOnPage(page, targetPageName, fallbackUrl = null) {
  const currentPage = await getCurrentPage(page);
  
  if (currentPage === targetPageName) {
    console.log(`✅ 已在【${targetPageName}】页面`);
    await waitForPageReady(page);
    return true;
  }
  
  console.log(`📍 当前在【${currentPage || '未知'}】页面，需要到【${targetPageName}】`);
  
  if (fallbackUrl) {
    console.log(`🚀 导航到 ${fallbackUrl}`);
    await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await waitForPageReady(page);
    
    const afterPage = await getCurrentPage(page);
    if (afterPage === targetPageName) {
      console.log(`✅ 导航成功，已在【${targetPageName}】页面`);
      return true;
    }
    
    if (targetPageName === 'login' && afterPage === 'home') {
      console.log('⚠️ 检测到已登录状态（自动跳转到首页）');
      return false;
    }
  }
  
  return false;
}

/**
 * 安全导航（带等待和验证）
 */
async function safeGoto(page, url, options = {}) {
  const timeout = options.timeout || 20000;
  const targetPageName = options.targetPage || null;
  
  console.log(`🚀 导航: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (e) {
    console.warn(`⚠️ 导航超时/失败: ${e.message}`);
    return false;
  }
  
  await waitForPageReady(page);
  
  if (targetPageName) {
    const afterPage = await getCurrentPage(page);
    if (afterPage !== targetPageName) {
      console.warn(`⚠️ 未到达目标页面【${targetPageName}】，当前在【${afterPage || '未知'}】`);
      
      if (targetPageName === 'login' && afterPage === 'home') {
        console.log('ℹ️ 已登录状态，会自动跳转首页');
        return true;
      }
      
      return false;
    }
    console.log(`✅ 已到达【${targetPageName}】页面`);
  }
  
  return true;
}

// ========================
// 弹窗关闭（Playwright 原生方式）
// ========================

/**
 * 关闭所有弹窗（优先使用 Playwright 原生方式）
 * 
 * 关闭策略：
 * 1. 先尝试 Playwright 原生方式（点击关闭按钮）
 * 2. 再按 ESC（触发页面内置关闭逻辑）
 * 3. 最后用 evaluate 隐藏剩余遮罩层
 */
async function closeAllPopups(page) {
  try {
    // ========== 方式1: Playwright 原生点击关闭按钮 ==========
    
    // 1.1 关闭右侧通知面板（如果有）
    const closeBtn = page.locator('[class*="ImportantList_close"]');
    if (await closeBtn.count() > 0) {
      try {
        await closeBtn.first().click({ timeout: 2000 });
        await randomDelay(300, 500);
      } catch (e) {}
    }
    
    // 1.2 关闭 "我知道了" / "知道了" 按钮
    const knownBtns = [
      page.locator('button').filter({ hasText: '我知道了' }),
      page.locator('button').filter({ hasText: '知道了' }),
      page.locator('button').filter({ hasText: '好的' }),
      page.locator('button').filter({ hasText: '确认' }),
      page.locator('button').filter({ hasText: '确定' }),
    ];
    
    for (const btn of knownBtns) {
      if (await btn.count() > 0) {
        try {
          await btn.first().click({ timeout: 2000 });
          await randomDelay(300, 500);
          break; // 找到一个就停止
        } catch (e) {}
      }
    }
    
    // 1.3 关闭带 "关闭" 文字的按钮
    const closeTextBtns = page.locator('button').filter({ hasText: '关闭' });
    if (await closeTextBtns.count() > 0) {
      try {
        await closeTextBtns.first().click({ timeout: 2000 });
        await randomDelay(300, 500);
      } catch (e) {}
    }
    
    // ========== 方式2: 按 ESC 触发内置关闭 ==========
    try {
      await page.keyboard.press('Escape');
      await randomDelay(300, 500);
    } catch (e) {}
    
    // ========== 方式3: evaluate 强制隐藏遮罩层 ==========
    // 用于处理 Playwright 点击无法关闭的特殊弹窗
    await page.evaluate(() => {
      // 隐藏所有遮罩层
      document.querySelectorAll('[class*="mask"], [class*="overlay"], [class*="Modal"]').forEach(el => {
        if (el && typeof el.style !== 'undefined') {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });
      
      // 移除拖拽蒙层
      document.querySelectorAll('[class*="dragging"], [class*="drag"]').forEach(el => {
        if (el && typeof el.remove === 'function') {
          el.remove();
        }
      });
      
      // 移除 MDL_modal
      document.querySelectorAll('.MDL_modal, [class*="MDL_modal"]').forEach(el => {
        if (el && typeof el.remove === 'function') {
          el.remove();
        }
      });
    });
    
    // 再次按 ESC 确保关闭
    try {
      await page.keyboard.press('Escape');
      await randomDelay(300, 500);
    } catch (e) {}
    
    return page;
  } catch (e) {
    console.log('⚠️ closeAllPopups 异常:', e.message);
    return page;
  }
}

/**
 * 关闭特定类型的弹窗
 * @param {Page} page
 * @param {string} type - 弹窗类型: 'notification' | 'modal' | 'all'
 */
async function closePopupByType(page, type = 'all') {
  switch (type) {
    case 'notification':
      const closeBtn = page.locator('[class*="ImportantList_close"]');
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click();
      }
      break;
      
    case 'modal':
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        document.querySelectorAll('.MDL_modal, [class*="MDL_modal"]').forEach(el => el.remove());
      });
      break;
      
    case 'all':
    default:
      await closeAllPopups(page);
      break;
  }
  
  await randomDelay(300, 500);
  return page;
}

/**
 * 确保在目标页面，如果不在则导航（带重试刷新）
 */
async function ensureOnPageWithRefresh(page, targetPageName, fallbackUrl, retries = 2) {
  for (let i = 0; i < retries; i++) {
    const success = await ensureOnPage(page, targetPageName, fallbackUrl);
    if (success) return true;
    
    if (i < retries - 1) {
      console.log(`🔄 重试... (${i + 1}/${retries})`);
      await randomDelay(2000, 3000);
    }
  }
  return false;
}

/**
 * 检查页面 URL 是否匹配目标
 */
async function matchCurrentPage(page, urlPattern) {
  const url = page.url();
  if (typeof urlPattern === 'string') {
    return url.includes(urlPattern);
  }
  if (urlPattern instanceof RegExp) {
    return urlPattern.test(url);
  }
  return false;
}

module.exports = {
  waitForPageReady,
  getCurrentPage,
  isOnPage,
  isLoggedIn,
  ensureOnPage,
  ensureOnPageWithRefresh,
  safeGoto,
  closeAllPopups,
  closePopupByType,
  matchCurrentPage,
};
