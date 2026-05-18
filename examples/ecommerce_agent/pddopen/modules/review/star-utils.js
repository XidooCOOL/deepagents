/**
 * 查找元素的最近祖先（向上遍历）
 * @param {Element} element - 起始元素
 * @param {Function} filterFn - 过滤函数，返回 true 表示匹配
 * @returns {Element|null}
 */
function findClosestAncestor(element, filterFn) {
  let current = element;
  while (current) {
    if (filterFn(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * 查找最近的星星分组行
 * @param {Element} row - 评价行
 * @returns {number} 星星数量（1-5）
 */
function findStarFromGroup(row) {
  // 方法1：向上查找 bodyGroupCell 分组行
  const groupRow = findClosestAncestor(row, el => 
    el.classList && el.classList.contains('TB_bodyGroupCell_5-178-0')
  );
  
  if (groupRow) {
    const starSvgs = groupRow.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
    if (starSvgs.length > 0) {
      return starSvgs.length;
    }
  }
  
  // 方法2：向上查找任何包含星星SVG的分组行
  const ancestorWithStars = findClosestAncestor(row, el => {
    const svgs = el.querySelectorAll && el.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
    return svgs && svgs.length > 0;
  });
  
  if (ancestorWithStars) {
    const svgs = ancestorWithStars.querySelectorAll('svg[data-testid="beast-core-icon-star_filled"]');
    return svgs.length;
  }
  
  // 方法3：从行文本中解析（如"⭐1星"）
  const rowText = row.innerText;
  const starMatch = rowText.match(/(\d)\s*星/);
  if (starMatch) {
    return parseInt(starMatch[1]);
  }
  
  // 默认返回5
  return 5;
}

// 导出
module.exports = { findClosestAncestor, findStarFromGroup };