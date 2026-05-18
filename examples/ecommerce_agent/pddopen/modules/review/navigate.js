/**
 * modules/review/navigate.js - 评价页面导航
 * 
 * 功能：
 * - 导航到评价管理页面
 * - 设置每页条数
 * - 分页操作
 */
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');

// 评价页面URL
const REVIEW_PAGE_URL = 'https://mms.pinduoduo.com/goods/evaluation/index?msfrom=mms_sidenav';

// 举报页面URL
const REPORT_PAGE_URL = 'https://mms.pinduoduo.com/goods/evaluation/index?sellerRightProtect=1&msfrom=mms_sidenav';

/**
 * 导航到评价管理页面（如果不在该页面则跳转）
 * @param {Page} page 
 */
async function navigateToReviewPage(page) {
  const currentUrl = page.url();
  // 需要同时满足：在评价页面 且 不在举报页面
  const isReviewPage = currentUrl.includes('/goods/evaluation/index') && !currentUrl.includes('sellerRightProtect=1');
  if (isReviewPage) {
    console.log('📍 已在评价管理页面，跳过导航');
    return;
  }
  
  console.log('📍 导航到评价管理页面...');
  await page.goto(REVIEW_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitWithHeartbeat(page, 3000, '等待评价页面加载');
  
  // 验证页面加载成功
  await page.waitForSelector('table', { timeout: 15000 });
  console.log('✅ 评价页面加载成功');
}

/**
 * 导航到举报页面（评价举报/商家权益保护）
 * @param {Page} page
 */
async function navigateToReportPage(page) {
  const currentUrl = page.url();
  if (currentUrl.includes('sellerRightProtect=1')) {
    console.log('📍 已在举报页面，跳过导航');
    return;
  }
  
  console.log('📍 导航到举报页面...');
  await page.goto(REPORT_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitWithHeartbeat(page, 3000, '等待举报页面加载');
  
  // 验证页面加载成功
  await page.waitForSelector('table', { timeout: 15000 });
  console.log('✅ 举报页面加载成功');
}

/**
 * 设置每页显示条数
 * @param {Page} page 
 * @param {number|string} size - 每页条数（10/20/30/40）或 'max'（自动选择最大）
 */
async function setPageSize(page, size = 'max') {
  const displaySize = size === 'max' ? '最大条数' : `${size} 条`;
  console.log(`📄 设置每页 ${displaySize}...`);
  
  try {
    // 强制关闭所有弹窗（多次尝试确保关闭）
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        // 按 Escape 关闭弹窗
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
        // 移除固定遮罩
        document.querySelectorAll('[class*="MDL_mask"], [class*="modal"], [class*="popup"]').forEach(m => {
          if (m.offsetParent === null || getComputedStyle(m).position === 'fixed') {
            m.remove();
          }
        });
      });
      await page.waitForTimeout(300);
    }
    await waitWithHeartbeat(page, 500, '关闭弹窗');
    
    // 点击下拉框头部
    await page.click('[data-testid="beast-core-select-header"]');
    await waitWithHeartbeat(page, 500, '等待下拉框展开');
    
    // 等待下拉选项出现
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    
    // 获取所有选项，找出最大值
    const options = await page.evaluate(() => {
      const listbox = document.querySelector('[role="listbox"]');
      if (!listbox) return [];
      const items = listbox.querySelectorAll('[role="option"]');
      return Array.from(items).map((item, index) => {
        const text = item.innerText?.trim() || '';
        const num = parseInt(text.match(/\d+/)?.[0] || '0');
        return { index: index + 1, text, num };
      });
    });
    
    console.log(`   可选: ${options.map(o => o.num).join(', ')}`);
    
    // 确定要选择的选项
    let targetNum;
    if (size === 'max') {
      targetNum = Math.max(...options.map(o => o.num));
    } else {
      targetNum = parseInt(size);
    }
    
    // 找到对应的选项并点击
    const targetOption = options.find(o => o.num === targetNum);
    if (!targetOption) {
      console.log(`⚠️ 未找到 ${targetNum} 条，使用第一个`);
      await page.click(`[role="option"]:nth-child(1)`);
      targetNum = options[0]?.num || 10;
    } else {
      await page.click(`[role="option"]:nth-child(${targetOption.index})`);
    }
    
    await waitWithHeartbeat(page, 800, '等待切换完成');
    console.log(`✅ 每页已切换为 ${targetNum} 条`);
    
  } catch (e) {
    console.log(`⚠️ 设置每页条数失败: ${e.message}，继续执行...`);
  }
}

/**
 * 获取总评价数和总页数
 * @param {Page} page
 * @returns {Object} { total, pageSize, totalPages }
 */
async function getPaginationInfo(page) {
  const info = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    
    // 查找总条数 - "共有 1496 条"
    const totalMatch = bodyText.match(/共\s*有\s*(\d+)\s*条/);
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    
    // 查找每页条数 - 查找"每页"之后的数字
    const pageSizeMatch = bodyText.match(/每页[\s\n]*(\d+)[\s\n]*条/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 10;
    
    return { total, pageSize, totalPages: Math.ceil(total / pageSize) };
  });
  
  return info;
}

/**
 * 点击下一页
 * @param {Page} page
 * @returns {boolean}
 */
async function clickNextPage(page) {
  try {
    // 查找分页组件中的"下一页"按钮 (li 元素，class 包含 PGT_next_)
    const nextBtn = page.locator('[data-testid="beast-core-pagination-next"]');
    
    // 检查是否禁用（class 不包含 PGT_disabled_ 时才可用）
    const className = await nextBtn.getAttribute('class').catch(() => '');
    if (className.includes('PGT_disabled')) {
      return false;
    }
    
    await nextBtn.click();
    return true;
  } catch (e) {
    console.log(`⚠️ 点击下一页失败: ${e.message}`);
    return false;
  }
}

/**
 * 点击上一页
 * @param {Page} page
 * @returns {boolean}
 */
async function clickPrevPage(page) {
  try {
    const prevBtn = page.locator('[data-testid="beast-core-pagination-prev"]');
    const className = await prevBtn.getAttribute('class').catch(() => '');
    if (className.includes('PGT_disabled')) {
      return false;
    }
    await prevBtn.click();
    return true;
  } catch (e) {
    console.log(`⚠️ 点击上一页失败: ${e.message}`);
    return false;
  }
}

/**
 * 跳转到指定页码
 * @param {Page} page
 * @param {number} pageNum
 * @returns {boolean}
 */
async function goToPage(page, pageNum) {
  try {
    // 找到页码输入框
    const input = page.locator('[data-testid="beast-core-pagination-jumper-input"]');
    if (await input.count() === 0) {
      console.log('⚠️ 未找到页码输入框');
      return false;
    }
    
    await input.clear();
    await input.fill(String(pageNum));
    await input.press('Enter');
    await waitWithHeartbeat(page, 1500, `跳转到第 ${pageNum} 页`);
    
    return true;
  } catch (e) {
    console.log(`⚠️ 跳转页面失败: ${e.message}`);
    return false;
  }
}

/**
 * 检查并确保每页条数是最大值（翻页后可能重置，需要检查）
 * @param {Page} page
 * @returns {Promise<boolean>} true=已经是最大，false=已重新设置
 */
async function ensureMaxPageSize(page) {
  try {
    const info = await getPaginationInfo(page);
    const maxPageSize = 40;  // 最大值固定为 40
    
    if (info.pageSize < maxPageSize) {
      console.log(`⚠️ 每页条数被重置为 ${info.pageSize}，正在恢复为 ${maxPageSize}...`);
      await setPageSize(page, 'max');
      return false;
    }
    return true;
  } catch (e) {
    console.log(`⚠️ 检查每页条数失败: ${e.message}`);
    return true;
  }
}

module.exports = {
  navigateToReviewPage,
  navigateToReportPage,
  setPageSize,
  ensureMaxPageSize,
  getPaginationInfo,
  clickNextPage,
  clickPrevPage,
  goToPage
};