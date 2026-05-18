// 数据提取模块 - 截图 + OCR
const fs = require('fs');
const path = require('path');
const { CURRENT_SCREENSHOT_PATH, MEDIA_ROOT } = require('../../utils/config');
const { sleep } = require('../../utils/browser');
const { closeAllPopups, selectYesterday, selectDate, navigateToTransactionData } = require('./navigate');
const { writeSalesData } = require('../../utils/excel');
const { extractSalesDataFromImage } = require('../../utils/vision');
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const { buildFilteredLocator, getSelectors, getSelectorFilters } = require('../../utils/elements');
const { matchCurrentPage, waitForPageReady, ensureOnPageWithRefresh } = require('../../utils/page');
const { selectDateWithCalendar } = require('../../utils/calendar');

// ========== 已完成页面记录（避免重复提取）==========
// 记录格式: { '页面类型': { timestamp, data } }
const _extractedPages = new Map();

/**
 * 记录已完成的提取
 * @param {string} pageType - 页面类型如 'salesData'
 * @param {object} data - 提取的数据
 */
function markPageExtracted(pageType, data) {
  _extractedPages.set(pageType, {
    timestamp: Date.now(),
    data
  });
  console.log(`📝 已记录 ${pageType} 提取完成（避免重复提取）`);
}

/**
 * 检查是否已提取过（5分钟内有效）
 * @param {string} pageType - 页面类型
 * @returns {object|null} 已提取的数据 或 null
 */
function getExtractedPage(pageType) {
  const record = _extractedPages.get(pageType);
  if (!record) return null;
  
  const age = Date.now() - record.timestamp;
  if (age > 5 * 60 * 1000) {
    // 超过5分钟，清除记录
    _extractedPages.delete(pageType);
    return null;
  }
  console.log(`♻️ 检测到 ${pageType} 已在 ${Math.round(age / 1000)} 秒前提取过，直接使用缓存`);
  return record.data;
}

/**
 * 获取页面上显示的统计时间
 * @param {Page} page
 * @returns {Promise<string|null>} 统计时间 如 '2026-04-20' 或 '2026-03-01 ~ 2026-03-31' 或 null
 */
async function getPageStatTime(page) {
  try {
    const statTime = await page.evaluate(() => {
      // 单日模式：匹配 "统计时间：2026-04-20"
      const singleMatch = document.body.innerText.match(/统计时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
      if (singleMatch) {
        return singleMatch[1];
      }
      
      // 范围模式：匹配 "统计时间：2026-03-01 ~ 2026-03-31"
      const rangeMatch = document.body.innerText.match(/统计时间[：:]\s*(\d{4}-\d{2}-\d{2})\s*[~-]\s*(\d{4}-\d{2}-\d{2})/);
      if (rangeMatch) {
        return `${rangeMatch[1]} ~ ${rangeMatch[2]}`;
      }
      
      return null;
    });
    return statTime;
  } catch (e) {
    console.log('⚠️ 获取统计时间失败:', e.message);
    return null;
  }
}

/**
 * 标准化日期用于比较
 * YYYY-MM (整月) 和 YYYY-MM-DD (单日) 统一比较逻辑
 */
function normalizeDateForCompare(dateStr) {
  if (!dateStr) return null;
  
  // 整月格式 YYYY-MM：返回 YYYY-MM-01 用于比较
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return dateStr + '-01';
  }
  
  // 范围格式 YYYY-MM-DD ~ YYYY-MM-DD：提取开始和结束日期
  const rangeMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})\s*[~-]\s*(\d{4}-\d{2}-\d{2})/);
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2] };
  }
  
  return dateStr;
}

/**
 * 比较两个日期是否匹配（支持整月 vs 单日）
 */
function datesMatch(expected, actual) {
  // 标准化
  const expNorm = normalizeDateForCompare(expected);
  const actNorm = normalizeDateForCompare(actual);
  
  // 直接相等
  if (expNorm === actNorm) return true;
  
  // 整月 vs 单日（期望是整月，实际是当月第一天）
  if (typeof expNorm === 'string' && typeof actNorm === 'string') {
    // YYYY-MM-01 vs YYYY-MM-01
    if (expNorm === actNorm) return true;
    // YYYY-MM vs YYYY-MM-DD（只要月份相同即可）
    if (expected === expNorm.slice(0, 7) && actual.slice(0, 7) === expNorm.slice(0, 7)) {
      return true;
    }
  }
  
  // 范围 vs 单日：期望范围的第一天 = 实际单日
  if (typeof expNorm === 'object' && typeof actNorm === 'string') {
    if (expNorm.start === actNorm) return true;
  }
  
  // 单日 vs 范围：期望单日 = 实际范围第一天
  if (typeof expNorm === 'string' && typeof actNorm === 'object') {
    if (expNorm === actNorm.start) return true;
  }
  
  return false;
}

/**
 * 验证页面统计时间是否与预期一致
 * @param {Page} page
 * @param {string} expectedDate - 期望的日期 如 '2026-04-20' 或 '2026-04' (整月)
 * @returns {Promise<{valid: boolean, actualDate: string|null, message: string}>}
 */
async function validatePageStatTime(page, expectedDate) {
  const actualDate = await getPageStatTime(page);
  
  if (!actualDate) {
    return {
      valid: false,
      actualDate: null,
      message: '⚠️ 无法获取页面统计时间'
    };
  }
  
  if (datesMatch(expectedDate, actualDate)) {
    return {
      valid: true,
      actualDate,
      message: `✅ 统计时间验证通过: ${actualDate}`
    };
  } else {
    return {
      valid: false,
      actualDate,
      message: `⚠️ 统计时间不一致！期望: ${expectedDate}, 实际: ${actualDate}`
    };
  }
}

/**
 * 刷新当前页面并重新检测（防止 session 失效）
 * @param {Page} page
 * @param {string} targetPage - 目标页面类型
 * @returns {Promise<string|null>} 检测到的页面类型
 */
async function refreshAndDetectPage(page, targetPage) {
  console.log('🔄 刷新页面并重新检测 session...');
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForPageReady(page, null);
    await waitWithHeartbeat(page, 2000, '页面刷新后等待');
    
    const detected = await matchCurrentPage(page);
    console.log(`🔍 刷新后检测到页面: ${detected || '未知'}`);
    return detected;
  } catch (e) {
    console.log(`⚠️ 刷新失败: ${e.message}`);
    return null;
  }
}

/**
 * 确保在目标页面（带自动重试机制）
 * @param {Page} page
 * @param {string} targetPage - 目标页面类型
 * @param {object} ctx - 上下文
 * @returns {Promise<boolean>} 是否成功
 */
async function ensureOnTargetPage(page, targetPage, ctx) {
  const currentPage = await matchCurrentPage(page);
  console.log(`📍 当前页面: ${currentPage || '未知'}，目标: ${targetPage}`);
  
  if (currentPage === targetPage) {
    // 已在目标页面，刷新检测 session 是否有效
    const recheck = await refreshAndDetectPage(page, targetPage);
    if (recheck === targetPage) {
      console.log('✅ Session 有效，使用当前页面');
      return true;
    } else {
      // 刷新后页面变了，需要重新导航
      console.log('⚠️ Session 可能失效，强制导航...');
      await navigateToTransactionData(page, ctx);
      return true;
    }
  } else {
    // 不在目标页面，直接导航
    console.log(`📍 导航到 ${targetPage}...`);
    await navigateToTransactionData(page, ctx);
    return true;
  }
}

function parseMetrics(ocrResult) {
  const VALUE_KEYS = ['当前值', '当前数', '当前', '数', '指标', 'value', '数值', '指标数值', '当前数值'];
  const NAME_KEYS = ['指标名称', '名称', 'name'];
  const flat = {};

  const walk = (obj) => {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          let name = null, val = null;
          for (const nk of NAME_KEYS) { if (item[nk] != null) { name = String(item[nk]); break; } }
          for (const vk of VALUE_KEYS) { if (item[vk] != null) { val = String(item[vk]); break; } }
          if (name && val) flat[name] = val.replace(/,/g, '');
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, val] of Object.entries(obj)) {
        if (Array.isArray(val)) {
          // 递归处理数组（可能包含指标对象）
          walk(val);
        } else if (typeof val === 'object' && val !== null) {
          let extracted = null;
          for (const vk of VALUE_KEYS) { if (vk in val) { extracted = String(val[vk]); break; } }
          if (extracted !== null) {
            flat[key] = extracted.replace(/,/g, '');
          } else {
            walk(val);
          }
        } else {
          flat[key] = val;
        }
      }
    }
  };
  walk(typeof ocrResult === 'string' ? JSON.parse(ocrResult) : ocrResult);

  const STRIP_RE = /[¥￥￥]/g;
  const NUM_RE = /[^\d]/g;
  const PCT_RE = /[^\d.%]/g;

  const valOf = (aliases) => {
    for (const k of aliases) {
      if (flat[k] != null) return String(flat[k]);
    }
    return null;
  };

  return {
    '成交金额': valOf(['成交金额'])?.replace(STRIP_RE, '').trim() || '',
    '成交订单数': valOf(['成交订单数', '订单数', '成交数'])?.replace(NUM_RE, '') || '',
    '成交买家数': valOf(['成交买家数', '支付买家数', '买家数'])?.replace(NUM_RE, '') || '',
    '成交转化率': valOf(['成交转化率', '支付转化率', '转化率'])?.replace(PCT_RE, '') || '',
    '客单价': valOf(['客单价'])?.replace(STRIP_RE, '').trim() || '',
    '成交老买家占比': valOf(['成交老买家占比'])?.replace(PCT_RE, '') || '',
    '店铺关注用户数': valOf(['店铺关注用户数', '关注用户数'])?.replace(NUM_RE, '') || '',
    '退款金额': valOf(['退款金额'])?.replace(STRIP_RE, '').trim() || '',
    '退款单数': valOf(['退款单数'])?.replace(NUM_RE, '') || '',
    '平均访客价值': valOf(['平均访客价值', '平均访客价值AV'])?.replace(STRIP_RE, '').trim() || '',
  };
}

async function captureScreenshot(page, outputPath = CURRENT_SCREENSHOT_PATH, clip = null) {
  await waitWithHeartbeat(page, 2000, '等待字体加载');
  const options = { path: outputPath, timeout: 30000, animations: 'disabled' };
  if (clip) options.clip = clip;
  await page.screenshot(options);
  console.log('截图保存到 ' + outputPath);
  return outputPath;
}

/**
 * 捕获销售数据区域截图
 * 
 * @param {Page} page
 * @param {object} ctx - 上下文
 * @param {string|null} dateStr - 日期字符串，'SKIP' 跳过日期选择
 * @param {object} options - { skipNavigate: boolean, forceRefresh: boolean }
 * @returns {Promise<string>} 截图路径
 */
async function captureOverviewRegion(page, ctx = null, dateStr = null, options = {}) {
  console.log('🎯 使用精准卡片截图...');

  // ========== 页面检测 + session 验证 ==========
  const targetPage = 'salesData';
  
  // 注意：dateStr === 'SKIP' 时不应该刷新（日期已由日历选择器选好）
  // 其他情况（单日选择）可以刷新验证 session
  
  const currentPage = await matchCurrentPage(page);
  const currentUrl = page.url();
  console.log(`📍 当前页面: ${currentPage || '未知'}`);
  console.log(`📍 当前 URL: ${currentUrl}`);
  
  const isOnTargetPage = currentPage === targetPage && currentUrl.includes('/stores_data/operation');
  
  if (isOnTargetPage) {
    // 在目标页面
    if (dateStr === 'SKIP') {
      // 日期已选好，不刷新，保持状态
      console.log('✅ 在目标页面，日期已选好，不刷新页面');
    } else {
      // 单日选择，刷新验证 session
      const recheck = await ensureOnPageWithRefresh(page, targetPage);
      if (!recheck) {
        // 刷新后不在目标页面，需要重新导航
        console.log(`⚠️ 刷新后不在目标页面，导航...`);
        await navigateToTransactionData(page, ctx);
      }
    }
  } else {
    // 不在目标页面，导航
    console.log(`⚠️ 当前在 ${currentPage || '未知页面'}，导航到销售数据...`);
    await navigateToTransactionData(page, ctx);
  }

  // ========== 日期选择 ==========
  if (dateStr === 'SKIP') {
    console.log('📅 dateStr 为 SKIP，跳过日期选择');
  } else if (dateStr) {
    await selectDate(page, dateStr);
  } else {
    await selectYesterday(page, ctx);
  }

  // ========== 验证统计时间 ==========
  // 确定期望的日期（单日模式用 dateStr，范围模式跳过验证）
  const expectedDate = (dateStr && dateStr !== 'SKIP') ? dateStr : null;
  
  if (expectedDate) {
    // 单日模式：验证统计时间是否一致
    console.log(`🔍 验证统计时间，期望: ${expectedDate}`);
    
    // 等待页面数据更新（日期选择后需要等待）
    await waitWithHeartbeat(page, 2000, '等待日期选择后数据更新');
    
    const validation = await validatePageStatTime(page, expectedDate);
    console.log(validation.message);
    
    if (!validation.valid) {
      // 统计时间不一致，"昨日"按钮选择失败
      // 备用方案：使用日历选择器
      console.log('🔄 使用备用方案：日历选择器...');
      console.log(`📅 日历选择日期: ${expectedDate}`);
      
      await selectDateWithCalendar(page, expectedDate);
      await waitWithHeartbeat(page, 3000, '等待日历选择后数据更新');
      
      // 再次验证
      const recheck = await validatePageStatTime(page, expectedDate);
      console.log(recheck.message);
      
      if (!recheck.valid) {
        console.log('❌ 备用方案也失败，日期选择仍然不一致');
        throw new Error(`统计时间不一致！期望: ${expectedDate}, 实际: ${recheck.actualDate}`);
      }
    }
  }

  // ========== 关闭弹窗 ==========
  try {
    await closeAllPopups(page);
    console.log('✅ 弹窗遮罩已关闭');
  } catch (e) {
    console.log('⚠️ 关闭弹窗失败（继续）:', e.message);
  }

  // ========== 范围模式：等待数据更新 ==========
  if (dateStr === 'SKIP') {
    // 范围模式需要等待页面数据更新（日历选择后）
    console.log('⏳ 等待范围数据加载...');
    await waitWithHeartbeat(page, 5000, '等待范围数据加载');
    
    // 验证统计时间
    const currentStatTime = await getPageStatTime(page);
    console.log(`📅 当前统计时间: ${currentStatTime || '未知'}`);
  }

  // ========== 滚动到交易概况卡片 ==========
  await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="card-box_container__"]');
    for (const card of cards) {
      if (card.textContent.includes('交易概况') && card.textContent.includes('成交金额')) {
        card.scrollIntoView({ block: 'center' });
        break;
      }
    }
  });
  await waitWithHeartbeat(page, 1500, '滚动后等待卡片渲染');

  try { await closeAllPopups(page); } catch (e) {}
  await waitWithHeartbeat(page, 500, '等待通知面板关闭');

  // ========== 精准截图 ==========
  const selectors = getSelectors('salesData', 'dataCard');
  const filters = getSelectorFilters('salesData', 'dataCard');

  try {
    const card = await buildFilteredLocator(page, selectors, filters);
    if (card) {
      const count = await card.count();
      if (count > 0) {
        // 有多个匹配时取第一个
        const targetCard = count > 1 ? card.first() : card;
        await targetCard.waitFor({ timeout: 5000 });
        console.log('⏳ 等待字体渲染...');
        await waitWithHeartbeat(page, 2500, '字体加载等待');
        await targetCard.screenshot({ path: CURRENT_SCREENSHOT_PATH, timeout: 30000 });
        console.log('📸 交易概况卡片截图保存到 ' + CURRENT_SCREENSHOT_PATH);
        return CURRENT_SCREENSHOT_PATH;
      }
    }
  } catch (e) {
    console.log('⚠️ buildFilteredLocator 失败，改用全屏截图:', e.message);
  }

  await waitWithHeartbeat(page, 1000, '降级全屏截图前等待');
  await page.screenshot({ path: CURRENT_SCREENSHOT_PATH, timeout: 30000 });
  console.log('📸 全屏截图保存到 ' + CURRENT_SCREENSHOT_PATH);
  return CURRENT_SCREENSHOT_PATH;
}

/**
 * 完整的销售数据提取流程
 * 
 * @param {Page} page
 * @param {object} ctx - 上下文
 * @param {string|null} shopId
 * @param {string|null} shopName
 * @param {string|null} dateStr - 'SKIP' 跳过日期选择
 * @returns {Promise<{metrics: object, excelPath: string}>}
 */
async function fullExtractSales(page, ctx = null, shopId = null, shopName = null, dateStr = null) {
  const PAGE_TYPE = 'salesData';
  
  // ========== 检查是否已提取过 ==========
  const cached = getExtractedPage(PAGE_TYPE);
  if (cached) {
    console.log(`♻️ 检测到 ${PAGE_TYPE} 已提取，直接返回缓存数据`);
    return cached;
  }
  
  console.log('📊 开始提取销售数据...');

  // 调用截图（自动检测页面 + session 刷新）
  // ensureOnPageWithRefresh 会：
  // - 在目标页面 → 刷新验证 session → 有效则直接用
  // - 不在目标页面 → 返回 false → navigateToTransactionData 导航
  const imagePath = await captureOverviewRegion(page, ctx, dateStr);

  const mediaPath = path.join(MEDIA_ROOT, 'current_screenshot.png');
  if (fs.existsSync(imagePath)) {
    fs.copyFileSync(imagePath, mediaPath);
    console.log('📸 截图已复制到 media 目录');
  }

  console.log('🔍 OCR 识别中...');
  const ocrResult = await extractSalesDataFromImage(fs.readFileSync(imagePath));
  console.log('✅ OCR 识别成功');

  const metrics = parseMetrics(ocrResult);

  const excelPath = await writeSalesData(shopId, shopName, dateStr, metrics);

  // ========== 记录已提取（避免重复提取）==========
  const result = { metrics, excelPath };
  markPageExtracted(PAGE_TYPE, result);

  return result;
}

module.exports = {
  parseMetrics,
  captureScreenshot,
  captureOverviewRegion,
  fullExtractSales,
  markPageExtracted,
  getExtractedPage,
};
