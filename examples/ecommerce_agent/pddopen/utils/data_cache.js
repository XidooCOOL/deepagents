/**
 * 数据缓存管理器
 * 避免重复采集，根据索引判断是否需要拉取数据
 * 
 * 使用方式：
 *   const cache = require('./data_cache');
 *   await cache.getData('sales', 'XIDOO', '2026-04', { force: false });
 */

const fs = require('fs');
const path = require('path');
const { getCustomerFilePath, getCustomerFilePathRange } = require('./config');

// 数据目录 - 使用相对路径
const DATA_DIR = path.resolve(__dirname, '../data');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

// Excel 文件路径配置
// 注意：客服数据已改为按店铺ID分文件，路径通过 getCustomerFilePath 动态生成

const FILE_PATHS = {
  sales: {
    normal: 'Sales_Data.xlsx',
    range: 'Sales_Data_Range.xlsx'
  },
  promotion: {
    normal: 'Promotion_Data.xlsx',
    range: 'Promotion_Data_Range.xlsx'
  },
  customer: {
    // 客服数据按店铺ID分文件，格式: CustomerPerformance_{shop_id}.xlsx
    // 这里保留占位，实际路径通过 getCustomerFilePath 生成
    pattern: 'CustomerPerformance_{shop_id}.xlsx'
  }
};

// ============================================
// 索引管理
// ============================================

/**
 * 读取索引文件
 */
function readIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return { version: '1.0', shops: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  } catch (e) {
    console.error('读取索引失败:', e.message);
    return { version: '1.0', shops: {} };
  }
}

/**
 * 写入索引文件
 */
function writeIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * 更新索引中的记录
 */
function updateIndexRecord(shop, type, filePath, dates, options = {}) {
  const index = readIndex();
  
  // 确保结构存在
  if (!index.shops[shop]) {
    index.shops[shop] = {};
  }
  if (!index.shops[shop][type]) {
    index.shops[shop][type] = { files: {} };
  }
  
  const typeInfo = index.shops[shop][type];
  
  // 找出文件的 key（如 'normal', 'daily', 'monthly'）
  const fileKey = Object.keys(FILE_PATHS[type] || {}).find(
    k => FILE_PATHS[type][k] === path.basename(filePath)
  ) || 'normal';
  
  if (options.isRange) {
    // 时间段模式
    if (!typeInfo.files[fileKey]) {
      typeInfo.files[fileKey] = { ranges: [] };
    }
    // 添加新的日期范围
    const existing = typeInfo.files[fileKey].ranges || [];
    const exists = existing.find(r => r.start === options.start && r.end === options.end);
    if (!exists) {
      existing.push({
        start: options.start,
        end: options.end,
        updatedAt: new Date().toISOString()
      });
    }
    typeInfo.files[fileKey].lastUpdated = new Date().toISOString();
  } else if (options.isDaily) {
    // 按日记录
    if (!typeInfo.files[fileKey]) {
      typeInfo.files[fileKey] = { dates: [] };
    }
    const dateSet = new Set(typeInfo.files[fileKey].dates || []);
    dates.forEach(d => dateSet.add(d));
    typeInfo.files[fileKey].dates = Array.from(dateSet).sort();
    typeInfo.files[fileKey].lastUpdated = new Date().toISOString();
  } else if (options.isMonthly) {
    // 按月记录
    if (!typeInfo.files[fileKey]) {
      typeInfo.files[fileKey] = { months: [] };
    }
    const monthSet = new Set(typeInfo.files[fileKey].months || []);
    dates.forEach(d => monthSet.add(d));
    typeInfo.files[fileKey].months = Array.from(monthSet).sort();
    typeInfo.files[fileKey].lastUpdated = new Date().toISOString();
  }
  
  typeInfo.files[fileKey].filePath = filePath;
  
  writeIndex(index);
  return index;
}

/**
 * 获取索引中的记录
 */
function getIndexRecord(shop, type) {
  const index = readIndex();
  return index.shops[shop]?.[type] || null;
}

// ============================================
// Excel 操作
// ============================================

/**
 * 获取 Excel 文件路径
 * @param {string} type - 数据类型 (sales/promotion/customer)
 * @param {object} options - 选项
 * @param {string} options.shopId - 店铺ID（客服数据需要）
 * @param {string} options.isRange - 是否为时间段数据
 */
function getExcelPath(type, options = {}) {
  const { isRange = false, shopId = '' } = options;
  
  if (type === 'customer' && shopId) {
    // 客服数据按店铺ID分文件
    return isRange ? getCustomerFilePathRange(shopId) : getCustomerFilePath(shopId);
  }
  
  let fileName;
  if (type === 'sales') {
    fileName = isRange ? FILE_PATHS.sales.range : FILE_PATHS.sales.normal;
  } else if (type === 'promotion') {
    fileName = isRange ? FILE_PATHS.promotion.range : FILE_PATHS.promotion.normal;
  } else {
    return path.join(DATA_DIR, 'CustomerPerformance.xlsx');
  }
  
  return path.join(DATA_DIR, fileName);
}

/**
 * 标准化日期格式（统一为 YYYY-MM-DD）
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // 已经是 YYYY-MM-DD 格式（带前导零）
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // YYYY-M-D 格式（没有前导零）
  const match = str.match(/^(\d{4})-(\d+)-(\d+)$/);
  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  }
  
  // 其他格式，尝试解析
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  
  return str; // 无法标准化就返回原值
}

/**
 * 读取 Excel 文件中的日期列表
 * @param {string} excelPath - Excel 文件路径
 * @param {string} keyName - 可选，店铺名或客服名用于定位 sheet
 * @param {string} type - 数据类型 ('sales'/'promotion'/'customer')
 */
function readExcelDates(excelPath, keyName = null, type = 'sales') {
  if (!fs.existsSync(excelPath)) {
    return [];
  }
  
  try {
    const xlsx = require('xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    if (workbook.SheetNames.length === 0) return [];
    
    // 客服数据：Sheet 名是客服名，不是店铺名
    // 需要遍历所有 Sheet 收集日期
    if (type === 'customer') {
      const allDates = [];
      for (const sheetName of workbook.SheetNames) {
        const dates = extractDatesFromSheet(workbook.Sheets[sheetName]);
        allDates.push(...dates);
      }
      return [...new Set(allDates)];
    }
    
    // 销售/推广数据：Sheet 名是店铺名
    let targetSheet = keyName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames[0];
      if (keyName) {
        console.warn(`Sheet "${keyName}" 不存在，fallback 到 "${targetSheet}"`);
      }
    }
    
    const sheet = workbook.Sheets[targetSheet];
    const dates = extractDatesFromSheet(sheet);
    
    return [...new Set(dates)];
  } catch (e) {
    console.error('读取 Excel 日期失败:', e.message);
    return [];
  }
}

/**
 * 从单个 sheet 提取日期
 */
function extractDatesFromSheet(sheet) {
  const xlsx = require('xlsx');
  const dates = [];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) return dates;
  
  // 找到日期列
  const headers = data[0];
  let dateColIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toLowerCase();
    if (h.includes('日期') || h.includes('时间') || h.includes('date') || h === '日期/指数') {
      dateColIndex = i;
      break;
    }
  }
  
  if (dateColIndex === -1) return dates;
  
  // 提取日期并标准化（跳过无效值）
  for (let i = 1; i < data.length; i++) {
    const val = data[i][dateColIndex];
    if (val) {
      const str = String(val).trim();
      if (str === 'SKIP' || str === 'N/A' || str === '' || str === '统计日期') {
        continue;
      }
      const normalized = normalizeDate(val);
      if (normalized) {
        dates.push(normalized);
      }
    }
  }
  
  return dates;
}

/**
 * 读取 Excel 数据
 * @param {string} excelPath - Excel 文件路径
 * @param {string} keyName - 可选，店铺名或客服名用于定位 sheet
 * @param {string} type - 数据类型 ('sales'/'promotion'/'customer')
 */
function readExcelData(excelPath, keyName = null, type = 'sales') {
  if (!fs.existsSync(excelPath)) {
    return null;
  }
  
  try {
    const xlsx = require('xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    if (workbook.SheetNames.length === 0) return null;
    
    // 客服数据：Sheet 名是客服名，需要遍历所有 Sheet 合并数据
    if (type === 'customer') {
      const allData = [];
      for (const sheetName of workbook.SheetNames) {
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        allData.push(...sheetData);
      }
      return allData.length > 0 ? allData : null;
    }
    
    // 销售/推广数据：Sheet 名是店铺名
    let targetSheet = keyName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames[0];
    }
    
    const sheet = workbook.Sheets[targetSheet];
    return xlsx.utils.sheet_to_json(sheet);
  } catch (e) {
    console.error('读取 Excel 数据失败:', e.message);
    return null;
  }
}

// ============================================
// 日期处理
// ============================================

/**
 * 解析日期范围，返回日期列表
 */
function parseDateRange(dateStr) {
  const { parseNaturalDate } = require('./date_parser');
  return parseNaturalDate(dateStr);
}

/**
 * 展开日期范围为具体日期列表
 */
function expandDates(dateStr) {
  const parsed = parseDateRange(dateStr);
  const dates = [];
  
  if (!parsed) {
    console.warn('日期解析失败:', dateStr);
    return dates;
  }
  
  // 处理月份格式（如 2026-04）
  if (parsed.isMonth && parsed.start) {
    const [year, month] = parsed.start.split('-').map(Number);
    const days = getDaysInMonth(year, month);
    for (let d = 1; d <= days; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return dates;
  }
  
  // 处理 YYYY-MM-DD 格式
  if (parsed.type === 'single' || parsed.type === 'single_day') {
    if (parsed.start && parsed.end) {
      const start = new Date(parsed.start);
      const end = new Date(parsed.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (parsed.start) {
      dates.push(parsed.start);
    }
  } else if (parsed.type === 'range') {
    // 日期范围
    const start = new Date(parsed.start);
    const end = new Date(parsed.end);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  
  return dates;
}

/**
 * 获取月份天数
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// ============================================
// 核心功能
// ============================================

/**
 * 检查数据完整性
 * @param {string} shop - 店铺名
 * @param {string} type - 数据类型 (sales/promotion/customer)
 * @param {string} dateStr - 日期字符串
 * @param {object} options - 选项
 * @param {string} options.shopId - 店铺ID（客服数据需要）
 * @returns {object} 完整性检查结果
 */
function checkCompleteness(shop, type, dateStr, options = {}) {
  const { isRange = false, isDaily = false, isMonthly = false, shopId = '' } = options;
  
  // 1. 解析目标日期
  const targetDates = expandDates(dateStr);
  
  // 2. 获取 Excel 路径
  const excelPath = getExcelPath(type, { isRange, shopId });
  
  // 3. 读取 Excel 中的日期
  const existingDates = readExcelDates(excelPath, shop, type);
  
  // 4. 找出缺失的日期（标准化后比较）
  const existingSet = new Set(existingDates.map(normalizeDate).filter(Boolean));
  const targetSet = new Set(targetDates);
  const missingDates = targetDates.filter(d => !existingSet.has(d));
  
  // 5. 读取完整数据检查空值
  const data = readExcelData(excelPath, shop, type);
  const incompleteRows = [];
  if (data) {
    data.forEach((row, idx) => {
      for (const [key, val] of Object.entries(row)) {
        if (val === '' || val === null || val === undefined) {
          incompleteRows.push(idx + 2); // +2 因为表头是第1行，数据从第2行开始
          break;
        }
      }
    });
  }
  
  return {
    excelPath,
    targetDates,
    existingDates,
    missingDates,
    incompleteRows,
    // 日期完整就算"完整"，空值检查作为警告信息
    isComplete: missingDates.length === 0,
    // 但记录空值情况
    hasEmptyRows: incompleteRows.length > 0,
    hasData: data !== null && data.length > 0
  };
}

/**
 * 主入口：获取数据（支持缓存）
 * @param {string} type - 数据类型
 * @param {string} shop - 店铺名
 * @param {string} dateStr - 日期字符串
 * @param {object} options - 选项
 * @returns {object} { source: 'cache'|'fresh', data: [...] }
 */
async function getData(type, shop, dateStr, options = {}) {
  const { force = false, isRange = false, isDaily = false, isMonthly = false } = options;
  
  console.log(`\n📦 数据缓存检查:`);
  console.log(`   店铺: ${shop}`);
  console.log(`   类型: ${type}`);
  console.log(`   日期: ${dateStr}`);
  console.log(`   强制: ${force}`);
  
  // 1. 检查完整性
  const check = checkCompleteness(shop, type, dateStr, { isRange, isDaily, isMonthly });
  
  console.log(`   目标日期: ${check.targetDates.length} 天`);
  console.log(`   已有日期: ${check.existingDates.length} 天`);
  console.log(`   缺失日期: ${check.missingDates.length} 天`);
  
  // 2. 判断是否需要采集
  if (!force && check.isComplete) {
    // ✅ 完整，直接返回缓存
    console.log(`   ✅ 数据完整，直接返回缓存`);
    return {
      source: 'cache',
      data: check.data,
      excelPath: check.excelPath,
      complete: true
    };
  }
  
  if (check.missingDates.length === 0 && !force) {
    // 只有空值问题，不需要重新采集
    console.log(`   ⚠️ 数据完整但有${check.incompleteRows.length}行空值，将返回`);
    return {
      source: 'cache',
      data: check.data,
      excelPath: check.excelPath,
      complete: false,
      hasEmptyRows: true
    };
  }
  
  if (force) {
    console.log(`   🔄 强制模式，需要重新采集`);
  } else {
    console.log(`   📥 需要采集缺失的 ${check.missingDates.length} 天数据`);
  }
  
  // 返回需要采集的信息，让调用者决定如何采集
  return {
    source: 'need_fetch',
    missingDates: check.missingDates,
    excelPath: check.excelPath,
    complete: false,
    force
  };
}

/**
 * 标记数据已更新（更新索引）
 */
function markUpdated(shop, type, filePath, dates, options = {}) {
  updateIndexRecord(shop, type, filePath, dates, options);
  console.log(`   ✅ 索引已更新`);
}

/**
 * 强制获取：跳过缓存，直接采集
 */
async function forceFetch(fetcher, type, shop, dateStr, options = {}) {
  console.log(`\n🔄 强制获取模式 - 将重新采集全部数据`);
  
  // 调用采集函数
  const result = await fetcher(type, shop, dateStr, { force: true, ...options });
  
  return result;
}

module.exports = {
  // 索引管理
  readIndex,
  writeIndex,
  updateIndexRecord,
  getIndexRecord,
  
  // Excel 操作
  getExcelPath,
  readExcelDates,
  readExcelData,
  
  // 日期处理
  parseDateRange,
  expandDates,
  
  // 核心功能
  checkCompleteness,
  getData,
  markUpdated,
  forceFetch,
  
  // 常量
  FILE_PATHS
};