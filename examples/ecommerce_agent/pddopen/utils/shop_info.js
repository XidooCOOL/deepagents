/**
 * shop_info.js - 当前登录店铺信息检测
 * 
 * 功能：
 * 1. 检测当前页面登录的店铺名称
 * 2. 检测当前登录的管理员名称
 * 3. 验证店铺是否匹配预期
 * 
 * DOM 选择器（整合自真实页面检测）：
 * - mms.pinduoduo.com: .user-name-name (店铺) + .user-name-id (管理员)
 * - yingxiao.pinduoduo.com: [class*="mallName"] (店铺) + 无管理员
 */

const { getSelectors } = require('./elements');
const { closeAllPopups } = require('./page');
const { randomDelay } = require('./browser');

// ========== 辅助函数 ==========

/**
 * 获取域名类型（mms 或 yingxiao）
 */
function getDomainType(url) {
  if (url.includes('yingxiao.pinduoduo.com')) return 'yingxiao';
  return 'mms';
}

/**
 * 尝试多个选择器，返回第一个成功的文本
 */
async function trySelectors(page, selectors) {
  for (const sel of selectors) {
    try {
      const selector = sel.value || sel;
      await page.waitForSelector(selector, { timeout: 2000 });
      const text = await page.$eval(selector, el => el.textContent.trim());
      if (text) return text;
    } catch (e) { continue; }
  }
  return '';
}

// ========== 核心函数 ==========

/**
 * 获取当前页面的店铺名称
 * @param {Page} page - Playwright page 对象
 * @returns {string} 店铺名称，找不到返回空字符串
 */
async function getShopName(page) {
  const url = page.url();
  const domainType = getDomainType(url);
  
  try {
    const selectors = getSelectors(domainType, 'shopName');
    const text = await trySelectors(page, selectors);
    if (text) return text;
    
    // fallback: 搜索包含"店"的元素
    const fallbackText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim() || '';
        if (text.includes('店') && text.length > 1 && text.length < 50) {
          const rect = node.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.top < 100) {
            return text;
          }
        }
      }
      return '';
    });
    return fallbackText;
  } catch (e) {
    console.log('[getShopName] 读取失败:', e.message);
  }
  return '';
}

/**
 * 获取当前登录的管理员名称
 * @param {Page} page - Playwright page 对象
 * @returns {string} 管理员名称，找不到返回空字符串
 * 
 * 注意：yingxiao 域名没有管理员信息，会返回空字符串
 */
async function getAdminName(page) {
  const url = page.url();
  
  // yingxiao 域名没有管理员
  if (url.includes('yingxiao.pinduoduo.com')) {
    return '';
  }
  
  try {
    const selectors = getSelectors('mms', 'adminName');
    const text = await trySelectors(page, selectors);
    return text;
  } catch (e) {
    // 管理员名称可选，找不到就算了
  }
  return '';
}

/**
 * 获取完整的店铺信息
 * @param {Page} page - Playwright page 对象
 * @returns {object} { shopName, adminName }
 */
async function getShopInfo(page) {
  await randomDelay();
  await closeAllPopups(page);
  
  const shopName = await getShopName(page);
  const adminName = await getAdminName(page);
  
  return { shopName, adminName };
}

/**
 * 验证当前店铺是否匹配预期
 * @param {Page} page - Playwright page 对象
 * @param {string} expectShopName - 期望的店铺名称
 * @returns {object} { ok, actual, adminName, message }
 * 
 * 注意：只根据店铺名匹配，管理员仅用于通知用途
 */
async function verifyShopMatch(page, expectShopName) {
  const { shopName: actualShopName, adminName } = await getShopInfo(page);
  
  // 仅根据店铺名匹配（模糊匹配）
  const expectLower = expectShopName.toLowerCase();
  const actualLower = actualShopName.toLowerCase();
  
  const matched = actualLower.includes(expectLower) || expectLower.includes(actualLower);
  
  return {
    ok: matched,
    actual: actualShopName,
    adminName,  // 仅用于通知，不影响匹配结果
    message: matched 
      ? `✅ 店铺匹配成功！预期「${expectShopName}」，实际「${actualShopName}」`
      : `⚠️ 店铺不匹配！预期「${expectShopName}」，实际「${actualShopName}」`
  };
}

module.exports = {
  getShopName,
  getAdminName,
  getShopInfo,
  verifyShopMatch,
};