/**
 * modules/review/review.js - 评价数据提取
 * 
 * 功能：
 * - 提取评价数据（DOM读取）
 * - 分页遍历
 * - 星级数字解析（1-5）- 用户评价分的星星数量就是星级
 * - 回复状态检测
 */
const { getCssQuerySelectors } = require('../../utils/elements');
const { waitWithHeartbeat } = require('../../utils/sigkill_guard');
const config = require('../../utils/config');
const { navigateToReviewPage, setPageSize } = require('./navigate');

/**
 * 提取单页评价数据
 * @param {Page} page
 * @returns {Promise<Array>} 评价列表
 */
async function extractPageReviews(page) {
  const reviews = await page.evaluate(() => {
    const results = [];
    
    // 硬编码匹配函数（内联到 evaluate 内）
    function isHeaderRow(row) {
      const className = row.className || '';
      return className.includes('stickyHeader') || 
             className.includes('bodyGroupHeader') || 
             className.includes('bodyGroupCell');
    }
    
    // 查找所有 tr 元素
    const allRows = document.querySelectorAll('tr');
    
    allRows.forEach((row) => {
      try {
        // 跳过表头和分组头行
        if (isHeaderRow(row)) return;
        
        // 获取全部文本
        const allText = row.innerText;
        if (!allText.includes('订单编号')) return;
        
        // 解析订单编号
        const orderMatch = allText.match(/订单编号[：:]\s*(\d{6}-\d{15,})/);
        if (!orderMatch) return;
        const orderId = orderMatch[1];
        
        // 解析星级 - 查找前一个兄弟元素（分组表头行）的星星数量
        // 用户评价分的星星数量 = 星级
        let starNum = 5;
        let prevRow = row.previousElementSibling;
        while (prevRow) {
          if (prevRow.className && prevRow.className.includes('bodyGroupHeader')) {
            const starSvgs = prevRow.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
            if (starSvgs.length > 0 && starSvgs.length <= 5) {
              starNum = starSvgs.length;
              break;
            }
          }
          prevRow = prevRow.previousElementSibling;
        }
        
        // 解析评价时间
        const timeMatch = allText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '';
        
        // 解析评价内容
        let content = '';
        const lines = allText.split('\n');
        for (const line of lines) {
          if (line.includes('订单编号')) break;
          if (line.trim() && !time.includes(line.trim())) {
            content = line.trim();
          }
        }
        
        // 解析买家昵称
        const buyerMatch = allText.match(/买家昵称[：:]\s*([^\n]+)/);
        const buyerName = buyerMatch ? buyerMatch[1].trim() : '';
        
        // 解析商品ID
        const goodsIdMatch = allText.match(/ID[：:]\s*(\d+)/);
        const goodsId = goodsIdMatch ? goodsIdMatch[1] : '';
        
        // 检测是否已回复
        const isReplied = (allText.includes('查看回复') || allText.includes('已回复')) ? '是' : '否';
        
        // 检测是否有"举报"按钮
        let hasReportBtn = false;
        row.querySelectorAll('a').forEach(btn => {
          if (btn.innerText.includes('举报')) hasReportBtn = true;
        });
        const isReported = !hasReportBtn;
        
        results.push({
          orderId,
          star: starNum,
          buyerName,
          goodsId,
          content: content.substring(0, 500),
          time,
          isReplied,
          isReported
        });
      } catch (e) {}
    });
    
    return results;
  });
  
  return reviews;
}

/**
 * 获取总评价数和总页数
 */
async function getPaginationInfo(page) {
  const info = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const totalMatch = bodyText.match(/共\s*有\s*(\d+)\s*条/);
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    const pageSizeMatch = bodyText.match(/每页[\s\n]*(\d+)[\s\n]*条/);
    const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 10;
    return { total, pageSize, totalPages: Math.ceil(total / pageSize) };
  });
  return info;
}

/**
 * 点击下一页
 */
async function clickNextPage(page) {
  try {
    const nextBtn = page.locator('[data-testid="beast-core-pagination-next"]');
    const className = await nextBtn.getAttribute('class').catch(() => '');
    if (className.includes('PGT_disabled')) return false;
    await nextBtn.click();
    return true;
  } catch (e) {
    console.log(`⚠️ 点击下一页失败: ${e.message}`);
    return false;
  }
}

/**
 * 提取全部评价数据
 */
async function extractReviews(page, options = {}) {
  const cfg = config.get('review') || {};
  const pageSize = options.pageSize || cfg.page_size || 'max';
  const maxPages = options.maxPages;
  const limit = options.limit || 200;  // 默认限制200条
  const safeLimit = Math.min(limit, 200);  // 最多200条
  
  await navigateToReviewPage(page);
  await setPageSize(page, pageSize);
  await waitWithHeartbeat(page, 1000, '等待分页信息更新');
  
  const pageInfo = await getPaginationInfo(page);
  const actualPageSize = pageInfo.pageSize === 10 ? (pageSize === 'max' ? 40 : parseInt(pageSize)) : pageInfo.pageSize;
  const totalPages = Math.ceil(pageInfo.total / actualPageSize);
  
  // 按条数限制计算页数
  const pagesNeededForLimit = Math.ceil(safeLimit / actualPageSize);
  const pagesToFetch = maxPages !== undefined 
    ? Math.min(totalPages, maxPages, pagesNeededForLimit) 
    : Math.min(totalPages, pagesNeededForLimit);
  
  console.log(`📊 总计 ${pageInfo.total} 条，每页 ${actualPageSize} 条，共 ${totalPages} 页`);
  console.log(`📄 设置提取上限 ${safeLimit} 条（最多 ${pagesToFetch} 页）`);
  
  const allReviews = [];
  
  for (let i = 1; i <= pagesToFetch && allReviews.length < safeLimit; i++) {
    console.log(`📄 提取第 ${i}/${pagesToFetch} 页...`);
    const pageReviews = await extractPageReviews(page);
    allReviews.push(...pageReviews);
    console.log(`   已提取 ${allReviews.length} 条`);
    
    if (i < pagesToFetch && allReviews.length < safeLimit) {
      await waitWithHeartbeat(page, 1000, '等待加载下一页');
      const hasNext = await clickNextPage(page);
      if (!hasNext) {
        console.log('⚠️ 已到最后一页，停止提取');
        break;
      }
      await waitWithHeartbeat(page, 1500, '等待页面切换');
    }
  }
  
  // 如果超过 limit，截断
  const result = allReviews.slice(0, safeLimit);
  console.log(`✅ 共提取 ${result.length} 条评价`);
  return result;
}

module.exports = {
  extractPageReviews,
  getPaginationInfo,
  clickNextPage,
  extractReviews
};
