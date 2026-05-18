/**
 * modules/review/filter.js - 评价筛选功能
 * 
 * 功能：
 * - 时间筛选（近30天/近90天/近180天/自定义）
 * - 星级筛选（1-5星）
 * - 内容筛选（有图片/有视频/主评有文字/有追加评价）
 * - 回复状态筛选（已回复/未回复）
 * - 搜索（订单编号/商品ID/关键词）
 * 
 * 使用 Playwright 原生 page.locator() 方式，更稳定、可调试
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');

// ========================
// 筛选按钮选择器
// ========================

/**
 * 获取筛选按钮的 locator
 * @param {Page} page
 * @param {string} text - 按钮文本
 * @returns {Locator}
 */
function getFilterButtonLocator(page, text) {
  return page.locator(`[class*="evaluation_search_btn"]`).filter({ hasText: text });
}

/**
 * 获取筛选按钮容器（所有筛选按钮）
 * @param {Page} page
 * @returns {Locator}
 */
function getFilterButtonsContainer(page) {
  return page.locator(`[class*="evaluation_search_btn"]`);
}

// ========================
// 按钮点击操作
// ========================

/**
 * 点击筛选按钮（Playwright 原生方式）
 * @param {Page} page
 * @param {string} text - 按钮文本
 * @returns {Promise<boolean>}
 */
async function clickFilterButton(page, text) {
  try {
    // 先尝试关闭弹窗
    await page.evaluate(() => {
      // 按 ESC 关闭
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      // 关闭 MDL_modal
      document.querySelectorAll('.MDL_modal, [class*="MDL_modal"], [data-testid="beast-core-modal"]').forEach(el => {
        if (typeof el.remove === 'function') el.remove();
      });
    });
    await waitWithHeartbeat(page, 300, '关闭弹窗');
    
    const locator = getFilterButtonLocator(page, text);
    const count = await locator.count();
    
    if (count === 0) {
      console.log(`⚠️ 未找到筛选按钮: "${text}"`);
      return false;
    }
    
    // 使用 force 点击（绕过弹窗遮挡检测）
    await locator.first().click({ force: true });
    return true;
  } catch (e) {
    console.log(`⚠️ 点击筛选按钮失败: ${e.message}`);
    return false;
  }
}

/**
 * 切换筛选按钮状态（如果已选中则取消）
 * @param {Page} page
 * @param {string} text - 按钮文本
 * @returns {Promise<boolean>}
 */
async function toggleFilterButton(page, text) {
  try {
    const locator = getFilterButtonLocator(page, text);
    const count = await locator.count();
    
    if (count === 0) {
      console.log(`⚠️ 未找到筛选按钮: "${text}"`);
      return false;
    }
    
    // 检查是否已选中
    const isChecked = await locator.first().evaluate(el => el.className.includes('checked'));
    
    // 如果已选中，需要点击取消
    if (isChecked) {
      await locator.first().click();
    }
    
    return true;
  } catch (e) {
    console.log(`⚠️ 切换筛选按钮失败: ${e.message}`);
    return false;
  }
}

/**
 * 检查按钮是否被选中
 * @param {Page} page
 * @param {string} text - 按钮文本
 * @returns {Promise<boolean>}
 */
async function isButtonChecked(page, text) {
  try {
    const locator = getFilterButtonLocator(page, text);
    const count = await locator.count();
    
    if (count === 0) return false;
    
    return await locator.first().evaluate(el => el.className.includes('checked'));
  } catch (e) {
    return false;
  }
}

// ========================
// 回复状态筛选
// ========================

/**
 * 点击回复状态筛选按钮（先清除其他回复筛选，再选择目标）
 * @param {Page} page
 * @param {'unreplied' | 'replied' | 'all' | '未回复' | '已回复'} status
 * @returns {Promise<boolean>}
 */
async function setReplyFilter(page, status = 'all') {
  try {
    // 支持中英文参数
    let targetText;
    if (status === 'unreplied' || status === '未回复') {
      targetText = '未回复';
    } else if (status === 'replied' || status === '已回复') {
      targetText = '已回复';
    } else if (status === 'all') {
      // 清除回复筛选：取消选中"已回复"和"未回复"
      await toggleFilterButton(page, '已回复');
      await toggleFilterButton(page, '未回复');
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    } else {
      console.log(`⚠️ setReplyFilter: 未知 status: ${status}`);
      return false;
    }
    
    // 直接点击目标按钮
    const success = await clickFilterButton(page, targetText);
    
    if (success) {
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    console.log(`⚠️ 未找到回复筛选按钮: ${targetText}`);
    return false;
  } catch (e) {
    console.log(`⚠️ setReplyFilter 失败: ${e.message}`);
    return false;
  }
}

/**
 * 筛选未回复评价（最常用的操作）
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function filterUnreplied(page) {
  return await setReplyFilter(page, 'unreplied');
}

/**
 * 筛选已回复评价
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function filterReplied(page) {
  return await setReplyFilter(page, 'replied');
}

/**
 * 显示全部评价
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function filterAll(page) {
  return await setReplyFilter(page, 'all');
}

// ========================
// 时间筛选
// ========================

/**
 * 设置时间筛选
 * @param {Page} page
 * @param {'30' | '90' | '180' | 'custom'} period
 * @returns {Promise<boolean>}
 */
async function setTimeFilter(page, period = '90') {
  try {
    let targetText;
    switch (period) {
      case '30': targetText = '近30天'; break;  // ✅ 新增30天
      case '90': targetText = '近90天'; break;
      case '180': targetText = '近180天'; break;
      case 'custom': targetText = '自定义'; break;
      default: targetText = '近30天';  // ✅ 默认改为30天
    }
    
    const success = await clickFilterButton(page, targetText);
    
    if (success) {
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    console.log(`⚠️ 未找到时间筛选按钮: ${targetText}`);
    return false;
  } catch (e) {
    console.log(`⚠️ setTimeFilter 失败: ${e.message}`);
    return false;
  }
}

/**
 * 获取当前时间筛选状态
 * @param {Page} page
 * @returns {Promise<string>}
 */
async function getCurrentTimeFilter(page) {
  const periods = [
    { text: '近180天', value: '180' },
    { text: '近90天', value: '90' },
    { text: '自定义', value: 'custom' }
  ];
  
  for (const p of periods) {
    if (await isButtonChecked(page, p.text)) {
      return p.value;
    }
  }
  
  return 'unknown';
}

// ========================
// 星级筛选
// ========================

/**
 * 设置星级筛选（先清除其他星级，再选择目标）
 * @param {Page} page
 * @param {number} star - 星级 (1-5)，传 0 表示全部
 * @returns {Promise<boolean>}
 */
async function setStarFilter(page, star = 0) {
  try {
    // 如果是 0，表示全部星级，需要清除所有星级筛选
    if (star === 0) {
      for (let s = 1; s <= 5; s++) {
        await toggleFilterButton(page, `${s}星`);
      }
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    // 点击目标星级
    const targetText = `${star}星`;
    const success = await clickFilterButton(page, targetText);
    
    if (success) {
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    console.log(`⚠️ 未找到星级筛选按钮: ${targetText}`);
    return false;
  } catch (e) {
    console.log(`⚠️ setStarFilter 失败: ${e.message}`);
    return false;
  }
}

/**
 * 筛选 5 星评价
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function filterFiveStars(page) {
  return await setStarFilter(page, 5);
}

/**
 * 筛选 1-2 星评价（用于举报）
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function filterOneToTwoStars(page) {
  try {
    // 先清除所有筛选，恢复默认状态
    await clearAllFilters(page);
    await waitWithHeartbeat(page, 500, '清除筛选完成');
    
    // 点击 1星 和 2星（可以多选）
    await clickFilterButton(page, '1星');
    await waitWithHeartbeat(page, 300, '选中1星');
    await clickFilterButton(page, '2星');
    await waitWithHeartbeat(page, 1500, '等待筛选刷新');
    
    return true;
  } catch (e) {
    console.log(`⚠️ filterOneToTwoStars 失败: ${e.message}`);
    return false;
  }
}

// ========================
// 内容筛选
// ========================

/**
 * 内容筛选类型
 */
const CONTENT_FILTERS = {
  HAS_IMAGE: '有图片',
  HAS_VIDEO: '有视频',
  HAS_TEXT: '主评有文字',
  HAS_APPEND: '有追加评价',
  NONE: '不限',
};

/**
 * 设置内容筛选
 * @param {Page} page
 * @param {keyof CONTENT_FILTERS | string} filterType
 * @returns {Promise<boolean>}
 */
async function setContentFilter(page, filterType = 'NONE') {
  try {
    // 获取筛选文本
    let targetText = CONTENT_FILTERS[filterType] || filterType;
    
    // 不限 = 清除所有内容筛选
    if (filterType === 'NONE' || targetText === '不限') {
      await toggleFilterButton(page, '有图片');
      await toggleFilterButton(page, '有视频');
      await toggleFilterButton(page, '主评有文字');
      await toggleFilterButton(page, '有追加评价');
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    const success = await clickFilterButton(page, targetText);
    
    if (success) {
      await waitWithHeartbeat(page, 1500, '等待筛选刷新');
      return true;
    }
    
    console.log(`⚠️ 未找到内容筛选按钮: ${targetText}`);
    return false;
  } catch (e) {
    console.log(`⚠️ setContentFilter 失败: ${e.message}`);
    return false;
  }
}

// ========================
// 搜索功能
// ========================

/**
 * 获取搜索输入框的 locator
 * @param {Page} page
 * @returns {Locator}
 */
function getSearchInputLocator(page) {
  return page.locator(`[class*="evaluation_search"] input`);
}

/**
 * 设置搜索参数
 * @param {Page} page
 * @param {object} params
 * @param {string} [params.orderId] - 订单编号
 * @param {string} [params.goodsId] - 商品ID
 * @param {string} [params.keyword] - 关键词
 * @returns {Promise<boolean>}
 */
async function setSearchParams(page, params = {}) {
  try {
    const input = getSearchInputLocator(page);
    
    // 清空现有内容
    await input.clear();
    
    // 组合搜索词（如果有多个参数，用空格分隔）
    const searchTerms = [];
    if (params.orderId) searchTerms.push(params.orderId);
    if (params.goodsId) searchTerms.push(params.goodsId);
    if (params.keyword) searchTerms.push(params.keyword);
    
    if (searchTerms.length === 0) {
      // 无搜索参数，直接返回
      return true;
    }
    
    // 填充搜索词
    const searchText = searchTerms.join(' ');
    await input.fill(searchText);
    await waitWithHeartbeat(page, 500, '输入搜索词');
    
    // 按回车搜索
    await input.press('Enter');
    await waitWithHeartbeat(page, 1500, '等待搜索结果');
    
    return true;
  } catch (e) {
    console.log(`⚠️ setSearchParams 失败: ${e.message}`);
    return false;
  }
}

/**
 * 清空搜索
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function clearSearch(page) {
  try {
    const input = getSearchInputLocator(page);
    await input.clear();
    await input.press('Enter');
    await waitWithHeartbeat(page, 1500, '清空搜索');
    return true;
  } catch (e) {
    console.log(`⚠️ clearSearch 失败: ${e.message}`);
    return false;
  }
}

// ========================
// 清除筛选
// ========================

/**
 * 清除所有筛选，恢复默认状态
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function clearAllFilters(page) {
  try {
    // 获取所有已选中的按钮
    const buttons = getFilterButtonsContainer(page);
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      // 使用 classList.contains 或 getAttribute 来检测 checked 状态（避免 React 对象问题）
      const isChecked = await btn.evaluate(el => 
        el.classList.contains('checked') || (el.getAttribute('class') || '').includes('checked')
      );
      
      if (isChecked) {
        await btn.click();
        await waitWithHeartbeat(page, 300, '清除筛选');
      }
    }
    
    console.log('✅ 已清除所有筛选');
    return true;
  } catch (e) {
    console.log(`⚠️ clearAllFilters 失败: ${e.message}`);
    return false;
  }
}

// ========================
// 状态获取
// ========================

/**
 * 获取当前筛选状态
 * @param {Page} page
 * @returns {Promise<object>}
 */
async function getCurrentFilters(page) {
  try {
    const buttons = getFilterButtonsContainer(page);
    const count = await buttons.count();
    
    const filters = {
      time: null,
      reply: null,
      stars: [],
      content: [],
    };
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const isChecked = await btn.evaluate(el => el.className.includes('checked'));
      
      if (!isChecked) continue;
      
      // 判断类型（trim 去掉空白）
      const trimmedText = text.trim();
      if (trimmedText.includes('近')) {
        filters.time = trimmedText;
      } else if (trimmedText === '已回复' || trimmedText === '未回复') {
        filters.reply = trimmedText;
      } else if (trimmedText.includes('星')) {
        filters.stars.push(trimmedText);
      } else if (['有图片', '有视频', '主评有文字', '有追加评价'].includes(trimmedText)) {
        filters.content.push(trimmedText);
      }
    }
    
    return filters;
  } catch (e) {
    console.log(`⚠️ getCurrentFilters 失败: ${e.message}`);
    return null;
  }
}

/**
 * 获取评价总数
 * @param {Page} page
 * @returns {Promise<number>}
 */
async function getTotalCount(page) {
  try {
    // 从页面文本中提取评价总数
    // 匹配格式如 "共 1,234 条" 或 "1234条"
    const text = await page.evaluate(() => document.body.innerText);
    
    // 优先匹配 "共 xxx 条" 格式
    let match = text.match(/共\s*([\d,]+)\s*条/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    
    // 备用：匹配 "xxx条"（不带"共"）
    match = text.match(/(\d+)\s*条/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

// ========================
// 导出
// ========================

module.exports = {
  // 基础操作
  clickFilterButton,
  toggleFilterButton,
  isButtonChecked,
  
  // 回复状态筛选
  setReplyFilter,
  filterUnreplied,
  filterReplied,
  filterAll,
  
  // 时间筛选
  setTimeFilter,
  getCurrentTimeFilter,
  
  // 星级筛选
  setStarFilter,
  filterFiveStars,
  filterOneToTwoStars,
  
  // 内容筛选
  setContentFilter,
  CONTENT_FILTERS,
  
  // 搜索
  setSearchParams,
  clearSearch,
  
  // 清除
  clearAllFilters,
  
  // 状态
  getCurrentFilters,
  getTotalCount,
};
 