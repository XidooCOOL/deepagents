/**
 * elements.js - 页面元素注册表加载器
 * 
 * 统一管理所有页面元素的 CSS 选择器定义
 * 来源：C:\Users\Administrator\.openclaw\skills\pdd-open\src\elements.js
 * 
 * 读取 references/elements.json，按页面名和元素名查找选择器
 * 支持 shared 区（跨页面复用）
 *
 * selectors 支持类型：
 *   - text      : 文本匹配 page.getByText(value)
 *   - css       : 标准 CSS 选择器
 *   - css-prefix: CSS class 前缀包含匹配 [class*='prefix__']
 *
 * 更新日志：
 *   2026-04-23: v1.3.0 添加 getCssQuerySelector() 支持在 evaluate 中使用
 */
const fs = require('fs');
const path = require('path');
const { ELEMENTS_PATH } = require('./config');

let _cache = null;

function loadElements() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(ELEMENTS_PATH, 'utf8'));
    return _cache;
  } catch (e) {
    console.error('[elements] 加载失败:', e.message);
    return null;
  }
}

/**
 * 判断某 key 是否为系统 meta 信息（不作为页面）
 */
function isMetaKey(key) {
  return key === '_meta' || key === 'shared' || key.startsWith('_');
}

/**
 * 根据 URL 判断当前页面名称
 * @param {string} url
 * @returns {string|null} pageName
 */
function matchPage(url) {
  const data = loadElements();
  if (!data) return null;

  for (const [pageName, pageInfo] of Object.entries(data)) {
    if (isMetaKey(pageName)) continue;
    if (pageInfo.urlContains && url.includes(pageInfo.urlContains)) {
      return pageName;
    }
  }
  return null;
}

/**
 * CSS class 前缀转换为包含匹配选择器
 * card-box_container__ → [class*='card-box_container__']
 * @param {string} prefix
 * @returns {string}
 */
function buildCssPrefixSelector(prefix) {
  return `[class*='${prefix}']`;
}

/**
 * 根据选择器类型构建 Playwright Locator
 * @param {Page} page
 * @param {Object} selectorEntry { type, value, note }
 * @param {string} keyword 可选，文字过滤关键词（用于 css-prefix 类型补全文字匹配）
 * @returns {Locator}
 */
function buildLocator(page, selectorEntry, keyword = null) {
  const { type, value } = selectorEntry;

  if (type === 'css-prefix') {
    const locator = page.locator(buildCssPrefixSelector(value));
    // CSS 前缀匹配同类多个元素，需要加文字过滤确定是哪一个
    if (keyword) {
      return locator.filter({ hasText: new RegExp(keyword) });
    }
    return locator;
  } else if (type === 'text') {
    return page.getByText(value);
  } else if (type === 'css') {
    return page.locator(value);
  } else {
    // 默认当 css 处理
    return page.locator(value);
  }
}

/**
 * 根据选择器列表构建 Locator，并依次尝试直到成功
 * @param {Page} page
 * @param {Array} selectors [{ type, value, note }, ...]
 * @param {string} keyword 可选，文字过滤关键词（用于 css-prefix 类型补全文字匹配）
 * @returns {Promise<Locator|null>}
 */
async function buildLocatorFromSelectors(page, selectors, keyword = null) {
  for (const sel of selectors) {
    try {
      const locator = buildLocator(page, sel, keyword);
      const count = await locator.count();
      if (count > 0) {
        return locator;
      }
    } catch (e) {
      // 单个失败继续试下一个
    }
  }
  return null;
}

/**
 * 构建带过滤条件的 Locator
 * @param {Page} page
 * @param {Array} selectors 选择器数组
 * @param {Array} filters 过滤条件 [{ type: 'hasText', value: '文本' }, ...]
 * @param {string} keyword 可选，文字过滤关键词
 * @returns {Promise<Locator|null>}
 */
async function buildFilteredLocator(page, selectors, filters, keyword = null) {
  let locator = await buildLocatorFromSelectors(page, selectors, keyword);
  if (!locator) return null;

  for (const f of (filters || [])) {
    if (f.type === 'hasText') {
      locator = locator.filter({ hasText: f.value });
    } else if (f.type === 'has') {
      locator = locator.filter({ has: page.locator(f.value) });
    }
  }
  return locator;
}

/**
 * 获取某页面的元素选择器列表
 * @param {string} pageName  'shared' | 'login' | 'home' | ...
 * @param {string} elementName
 * @returns {Array} 选择器数组
 */
function getSelectors(pageName, elementName) {
  const data = loadElements();
  if (!data || !data[pageName]) return [];

  // shared 区没有 elements 层，元素直接挂在 shared 下
  if (pageName === 'shared') {
    const el = data.shared?.[elementName];
    return el?.selectors || [];
  }
  const el = data[pageName].elements?.[elementName];
  return el?.selectors || [];
}

/**
 * 获取单个选择器（第一个有效）
 * @param {string} pageName
 * @param {string} elementName
 * @returns {Object|null} { type, value, note }
 */
function getSelector(pageName, elementName) {
  const selectors = getSelectors(pageName, elementName);
  return selectors[0] || null;
}

/**
 * 获取某元素的过滤条件
 * @param {string} pageName
 * @param {string} elementName
 * @returns {Array} 过滤条件数组
 */
function getSelectorFilters(pageName, elementName) {
  const data = loadElements();
  if (!data || !data[pageName]) return [];

  // shared 区没有 elements 层
  if (pageName === 'shared') {
    const el = data.shared?.[elementName];
    return el?.filters || [];
  }
  const el = data[pageName].elements?.[elementName];
  return el?.filters || [];
}

/**
 * 获取某元素的 fallback 坐标（当所有选择器失效时）
 * @param {string} pageName
 * @param {string} elementName
 * @returns {{x: number, y: number}|null}
 */
function getFallbackCoords(pageName, elementName) {
  const data = loadElements();
  if (!data || !data[pageName]) return null;

  // shared 区没有 elements 层
  if (pageName === 'shared') {
    const el = data.shared?.[elementName];
    return el?.fallbackCoords || null;
  }
  const el = data[pageName].elements?.[elementName];
  return el?.fallbackCoords || null;
}

/**
 * 判断是否在指定页面
 * @param {string} url
 * @param {string} pageName
 * @returns {boolean}
 */
function isOnPage(url, pageName) {
  const data = loadElements();
  if (!data || !data[pageName]) return false;
  return url.includes(data[pageName].urlContains);
}

/**
 * 获取页面描述
 * @param {string} pageName
 * @returns {string}
 */
function getPageDescription(pageName) {
  const data = loadElements();
  return data[pageName]?.description || pageName;
}

/**
 * 列出所有已注册页面（不含 shared）
 * @returns {Array<{name, description, urlContains}>}
 */
function listPages() {
  const data = loadElements();
  if (!data) return [];

  return Object.entries(data)
    .filter(([k]) => !isMetaKey(k))
    .map(([name, info]) => ({
      name,
      description: info.description || '',
      urlContains: info.urlContains || ''
    }));
}

/**
 * 列出 shared 区所有元素名
 * @returns {Array<string>}
 */
function listSharedElements() {
  const data = loadElements();
  if (!data || !data.shared) return [];
  return Object.keys(data.shared.elements || {});
}

/**
 * 获取 CSS 查询选择器字符串（用于在 page.evaluate() 中使用）
 * 返回第一个有效选择器的查询字符串
 * @param {string} pageName
 * @param {string} elementName
 * @returns {string} CSS 选择器字符串，如 "[class*='RPR_dateText_']" 或 ".user-name-name"
 */
function getCssQuerySelector(pageName, elementName) {
  const selectors = getSelectors(pageName, elementName);
  if (!selectors || selectors.length === 0) return null;

  for (const sel of selectors) {
    if (sel.type === 'css-prefix') {
      return buildCssPrefixSelector(sel.value);
    } else if (sel.type === 'css') {
      return sel.value;
    }
    // text 类型不支持转换为 CSS 查询，返回 null
  }
  return null;
}

/**
 * 获取所有 CSS 查询选择器（用于轮询尝试）
 * @param {string} pageName
 * @param {string} elementName
 * @returns {Array<string>} CSS 选择器字符串数组
 */
function getCssQuerySelectors(pageName, elementName) {
  const selectors = getSelectors(pageName, elementName);
  if (!selectors || selectors.length === 0) return [];

  return selectors
    .filter(sel => sel.type === 'css-prefix' || sel.type === 'css')
    .map(sel => {
      if (sel.type === 'css-prefix') {
        return buildCssPrefixSelector(sel.value);
      }
      return sel.value;
    });
}

module.exports = {
  loadElements,
  matchPage,
  getSelectors,
  getSelector,
  getSelectorFilters,
  getFallbackCoords,
  isOnPage,
  getPageDescription,
  listPages,
  listSharedElements,
  buildCssPrefixSelector,
  buildLocator,
  buildLocatorFromSelectors,
  buildFilteredLocator,
  // v1.3.0 新增：支持在 evaluate 中使用的 CSS 选择器
  getCssQuerySelector,
  getCssQuerySelectors,
};
