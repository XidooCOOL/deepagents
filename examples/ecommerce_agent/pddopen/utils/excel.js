// Excel 写入模块 - 按照模板写入数据
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { DATA_ROOT, SALES_DATA_FILE, PROMOTION_DATA_FILE,
        SALES_DATA_FILE_RANGE, PROMOTION_DATA_FILE_RANGE,
        getCustomerFilePath, getCustomerFilePathRange } = require('./config');

// ========== 日期类型判断函数 ==========

/**
 * 判断日期字符串是否为单日格式 (YYYY-MM-DD)
 * @param {string} dateStr
 * @returns {boolean}
 */
function isSingleDay(dateStr) {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * 获取文件路径（根据日期类型选择单日/范围文件）
 * @param {string} dateStr - 日期字符串
 * @param {string} type - 'sales' 或 'promotion'
 * @returns {{ filePath: string, isRange: boolean }}
 */
function getFilePath(dateStr, type) {
  const isRange = dateStr.includes('~') || dateStr.includes('到') || dateStr.includes('至');
  if (type === 'sales') {
    return {
      filePath: isRange ? SALES_DATA_FILE_RANGE : SALES_DATA_FILE,
      isRange
    };
  } else if (type === 'promotion') {
    return {
      filePath: isRange ? PROMOTION_DATA_FILE_RANGE : PROMOTION_DATA_FILE,
      isRange
    };
  }
  return { filePath: '', isRange: false };
}

/**
 * 判断是否为完整月份 (YYYY-MM)
 * 注意：即使后面被自动转为 YYYY-MM-DD~YYYY-MM-DD 范围格式，
 * 只要原始输入是 YYYY-MM 格式，就认为是整月数据
 * @param {string} monthStr
 * @returns {boolean}
 */
function isFullMonth(monthStr, isOriginalFullMonth = false) {
  if (!monthStr) return false;
  // 如果原始输入就是整月格式，即使被自动转为范围也认为是整月
  if (isOriginalFullMonth) return true;
  // 非整月格式才检查
  return /^\d{4}-\d{2}$/.test(monthStr);
}

/**
 * 获取客服绩效文件路径（按店铺ID分文件）
 * @param {string} shopId - 店铺ID
 * @param {boolean} isRange - 是否为时间段数据
 * @returns {string} 文件路径
 */
function getCustomerPerformanceFilePath(shopId, isRange = false) {
  return isRange ? getCustomerFilePathRange(shopId) : getCustomerFilePath(shopId);
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 自动备份 Excel 文件
function backupExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const backupDir = path.join(DATA_ROOT, 'backup');
  ensureDir(backupDir);
  
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  const backupPath = path.join(backupDir, `${baseName}.${timestamp}${ext}`);
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`💾 自动备份已保存: ${backupPath}`);
  return backupPath;
}

// 写入销售数据
async function writeSalesData(shopId, shopName, dateStr, metrics) {
  ensureDir(DATA_ROOT);
  
  // 根据日期类型选择文件
  const { filePath, isRange } = getFilePath(dateStr, 'sales');
  if (isRange) {
    console.log(`📋 时间段数据，写入副本文件: ${path.basename(filePath)}`);
  }
  
  // 自动备份
  backupExcel(filePath);
  
  const sheetName = shopName;
  
  // 标准化的行数据
  const row = {
    "日期/指数": dateStr.replace(/-0/g, '-').replace(/-0(?=\d\d$)/, '-'),
    "成交金额": parseFloat(String(metrics['成交金额']).replace(/,/g, '')) || metrics['成交金额'] || '',
    "成交订单数": parseInt(String(metrics['成交订单数']).replace(/,/g, '')) || metrics['成交订单数'] || '',
    "成交买家数": parseInt(String(metrics['成交买家数']).replace(/,/g, '')) || metrics['成交买家数'] || '',
    "成交转化率": metrics['成交转化率'] || '',
    "客单价": parseFloat(String(metrics['客单价']).replace(/,/g, '')) || metrics['客单价'] || '',
    "成交老买家占比": metrics['成交老买家占比'] || '',
    "店铺关注用户数": parseInt(String(metrics['店铺关注用户数']).replace(/,/g, '')) || metrics['店铺关注用户数'] || '',
    "退款金额": parseFloat(String(metrics['退款金额']).replace(/,/g, '')) || metrics['退款金额'] || '',
    "退款单数": parseInt(String(metrics['退款单数']).replace(/,/g, '')) || metrics['退款单数'] || '',
    "平均访客价值": parseFloat(String(metrics['平均访客价值']).replace(/,/g, '')) || metrics['平均访客价值'] || '',
  };

  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }

  let data = [];
  if (workbook.SheetNames.includes(sheetName)) {
    const sheet = workbook.Sheets[sheetName];
    data = XLSX.utils.sheet_to_json(sheet);
    data = data.filter(r => r["日期/指数"] !== row["日期/指数"]);
  }
  data.push(row);

  const sheet = XLSX.utils.json_to_sheet(data);
  if (workbook.SheetNames.includes(sheetName)) {
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter(n => n !== sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath);

  console.log(`💾 销售数据已写入: ${filePath} -> ${sheetName}`);
  return filePath;
}

// 写入推广数据
async function writePromotionData(shopName, dateStr, items) {
  ensureDir(DATA_ROOT);
  
  // 根据日期类型选择文件
  const { filePath, isRange } = getFilePath(dateStr, 'promotion');
  if (isRange) {
    console.log(`📋 时间段数据，写入副本文件: ${path.basename(filePath)}`);
  }
  
  backupExcel(filePath);
  
  const sheetName = shopName;
  const dataItems = items.map(item => ({ ...item, '日期': dateStr }));

  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }

  let existingData = [];
  if (workbook.SheetNames.includes(sheetName)) {
    const sheet = workbook.Sheets[sheetName];
    existingData = XLSX.utils.sheet_to_json(sheet);
    existingData = existingData.filter(r => r["日期"] != null);
  }
  
  // 替换同日期数据
  existingData = existingData.filter(r => r["日期"] !== dateStr);
  const allData = [...existingData, ...dataItems];

  const headerOrder = ["日期", "成交花费(元)", "交易额(元)", "实际投产比", "成交笔数", "曝光量", "点击量", "点击转化率"];
  const sheet = XLSX.utils.json_to_sheet(allData, { header: headerOrder });
  if (workbook.SheetNames.includes(sheetName)) {
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter(n => n !== sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filePath);
  
  console.log(`💾 推广数据已写入: ${filePath} -> ${sheetName}`);
  return filePath;
}

// 读取销售数据
async function readSalesData(shopName, options = {}) {
  // 根据选项决定读取哪个文件
  let filePath = SALES_DATA_FILE;
  if (options.isRange) {
    filePath = SALES_DATA_FILE_RANGE;
  }
  
  if (!fs.existsSync(filePath)) return null;
  const workbook = XLSX.readFile(filePath);
  if (!workbook.SheetNames.includes(shopName)) return null;
  return XLSX.utils.sheet_to_json(workbook.Sheets[shopName]);
}

// 读取客服绩效数据
// 格式：
// - 文件: CustomerPerformance_{shop_id}.xlsx（按店铺ID分文件）
// - Sheet名: 客服名（如"张三"）
// - 表头: 日期 | 店铺 | 客服服务分 | 咨询人数 | ...（16个指标）
// - 每个客服一个Sheet，Sheet内按日期存储多店铺的数据
async function writeCustomerPerformance(customerName, shopId, shopName, monthStr, rows, options = {}) {
  ensureDir(DATA_ROOT);
  
  // 判断是否整月/单日（范围格式 1~31号 需要用 Range 文件）
  const isFullMonthFlag = isFullMonth(monthStr, options.isFullMonth);
  const isRangeFormat = monthStr.includes('~');  // 范围格式如 "2026-04-01~2026-04-22"
  
  // 获取文件路径（整月/单日存储普通文件，范围存储 Range 文件）
  const filePath = getCustomerPerformanceFilePath(shopId, isRangeFormat);
  
  if (isRangeFormat) {
    console.log(`📋 时间段数据，写入副本文件: ${path.basename(filePath)}`);
  }
  
  // 自动备份
  backupExcel(filePath);
  
  // Sheet 名称就是客服名
  const sheetName = customerName;

  // 新表头：日期 | 店铺 | 16个指标
  const standardHeaders = [
    '日期', '店铺',
    '客服服务分', '咨询人数', '询单人数', '最终成团人数',
    '询单转化率', '客服销售额 (元)', '去退销售额 (元)', '需要人工回复的咨询人数',
    '人工接待人数', '3 分钟未回复人数', '3 分钟人工回复率', '30 秒应答率',
    '平均人工响应时长', '评分≤3 订单数', '纠纷退款数', '投诉数'
  ];

  // 客服绩效表格列映射（从原始HTML表格提取）// 表头格式（实际）：客服名 | 客服服务分 | 咨询人数 | 询单人数 | ... | 投诉数
// 数据列：第0列=客服名，第1-16列=16个指标
const CUSTOMER_METRIC_HEADERS = [
  '客服服务分', '咨询人数', '询单人数', '最终成团人数',
  '询单转化率', '客服销售额 (元)', '去退销售额 (元)', '需要人工回复的咨询人数',
  '人工接待人数', '3 分钟未回复人数', '3 分钟人工回复率', '30 秒应答率',
  '平均人工响应时长', '评分≤3 订单数', '纠纷退款数', '投诉数'
];
const CUSTOMER_COL_CUSTOMER = 1;      // 第1列：客服名（如"粥粥23号店"）
const CUSTOMER_COL_METRICS_START = 2; // 第2列开始：指标

  // 处理 rows（数组格式：[headerRow, dataRow1, dataRow2, ...]）
  let processedRows = [];
  
  console.log('[客服绩效] 原始数据行数:', rows.length);
  
  if (rows.length > 1) {
    // 遍历数据行（跳过表头行 i=0）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      // 第1列是客服名（如"粥粥23号店"）
      const rowCustomerName = String(row[CUSTOMER_COL_CUSTOMER] || '').trim();
      
      // 跳过无效的客服名
      if (!rowCustomerName || 
          rowCustomerName.includes('统计') || 
          rowCustomerName.includes('总计') ||
          rowCustomerName.includes('月') ||
          rowCustomerName === '客服名' ||
          rowCustomerName === '序号' ||
          rowCustomerName.includes('主账号') ||  // 过滤掉主账号行
          rowCustomerName.length < 2) {    // 客服名至少2个字符
        continue;
      }
      
      console.log('[客服绩效] 有效数据行:', rowCustomerName);
      
      // 日期标准化（时间段格式转为单日）
      let dateStr = monthStr;
      if (monthStr.includes('~')) {
        // 取范围的第一天
        const [start] = monthStr.split('~');
        dateStr = start.trim();
      }
      
      // 构建数据对象 - 包含原始客服名（第1列）用于分组
      const obj = { '日期': dateStr, '店铺': shopName };
      
      // 填充16个指标（从第2列开始）
      for (let j = 0; j < CUSTOMER_METRIC_HEADERS.length; j++) {
        const colIndex = CUSTOMER_COL_METRICS_START + j;
        const value = row[colIndex];
        // 空值填 '-' 表示暂无数据
        obj[CUSTOMER_METRIC_HEADERS[j]] = (value !== undefined && value !== null && value !== '') 
          ? String(value).trim() 
          : '-';
      }
      
      // 保存原始客服名用于分组
      obj._customerName = row[CUSTOMER_COL_CUSTOMER];
      
      processedRows.push(obj);
    }
  }

  // 按客服名分组（每个客服名对应一个 Sheet）
  const customerGroups = {};
  for (const row of processedRows) {
    const cName = row._customerName;
    if (!cName || cName === 'undefined') continue;
    if (!customerGroups[cName]) customerGroups[cName] = [];
    customerGroups[cName].push(row);
  }

  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }

  // 处理每个客服组
  for (const [sheetName, rows] of Object.entries(customerGroups)) {
    // 跳过无效的客服名
    if (!sheetName || sheetName === 'undefined' || sheetName === 'null') continue;
    
    // 如果客服 sheet 不存在，创建新的
    if (!workbook.SheetNames.includes(sheetName)) {
      const sheet = XLSX.utils.json_to_sheet(rows, { header: standardHeaders });
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    } else {
      // 客服 sheet 已存在，增量写入（跳过已有日期）
      const existingSheet = workbook.Sheets[sheetName];
      const existingData = XLSX.utils.sheet_to_json(existingSheet);
      
      // 提取已有日期集合
      const existingDates = new Set(existingData.map(r => r['日期']).filter(Boolean));
      
      // 过滤掉已有日期的数据
      const newData = rows.filter(r => !existingDates.has(r['日期']));
      
      if (newData.length > 0) {
        // 合并数据
        const mergedData = [...existingData, ...newData];
        
        // 重建 sheet
        const newSheet = XLSX.utils.json_to_sheet(mergedData, { header: standardHeaders });
        delete workbook.Sheets[sheetName];
        workbook.SheetNames = workbook.SheetNames.filter(n => n !== sheetName);
        XLSX.utils.book_append_sheet(workbook, newSheet, sheetName);
      }
    }
  }
  
  XLSX.writeFile(workbook, filePath);
  console.log(`💾 客服绩效已写入: ${path.basename(filePath)}，${Object.keys(customerGroups).length} 个客服，${processedRows.length} 行数据`);
  return filePath;
}

// 读取客服绩效数据（按客服名和店铺）
function readCustomerPerformance(customerName, shopId) {
  const filePath = getCustomerFilePath(shopId);
  if (!fs.existsSync(filePath)) return null;
  
  try {
    const workbook = XLSX.readFile(filePath);
    if (!workbook.SheetNames.includes(customerName)) return null;
    return XLSX.utils.sheet_to_json(workbook.Sheets[customerName]);
  } catch (e) {
    console.error('读取客服绩效失败:', e.message);
    return null;
  }
}

// 获取客服数据已采集的月份
function getCustomerPerformanceMonths(shopId) {
  const filePath = getCustomerFilePath(shopId);
  if (!fs.existsSync(filePath)) return [];
  
  try {
    const workbook = XLSX.readFile(filePath);
    const months = [];
    for (const sheetName of workbook.SheetNames) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      const dates = data.map(r => r['日期']).filter(Boolean);
      const monthSet = new Set(dates.map(d => d.substring(0, 7)));  // YYYY-MM
      monthSet.forEach(m => months.push(m));
    }
    return [...new Set(months)];
  } catch (e) {
    return [];
  }
}

// ============================================
// 客服月记录表（索引表）
// ============================================

/**
 * 获取客服月记录文件路径
 * 文件: CustomerPerformance_Index.xlsx（记录所有店铺的提取月份）
 */
function getCustomerIndexPath() {
  return path.join(DATA_ROOT, 'CustomerPerformance_Index.xlsx');
}

/**
 * 写入客服月记录
 * @param {string} shopId - 店铺ID
 * @param {string} shopName - 店铺名（Sheet名用这个，更直观）
 * @param {string} customerName - 客服名
 * @param {string} monthStr - 月份 (YYYY-MM)
 */
async function writeCustomerMonthRecord(shopId, shopName, customerName, monthStr) {
  ensureDir(DATA_ROOT);
  const filePath = getCustomerIndexPath();
  
  // 自动备份（文件存在才备份）
  if (fs.existsSync(filePath)) {
    backupExcel(filePath);
  }
  
  let workbook;
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
  } else {
    workbook = XLSX.utils.book_new();
  }
  
  // Sheet 名 = 店铺名（更直观）
  const sheetName = shopName;
  
  // 标准表头
  const headers = ['月份', '店铺ID', '客服名', '店铺名', '提取时间'];
  
  // 读取或创建 sheet
  let sheetData = [];
  if (workbook.SheetNames.includes(sheetName)) {
    sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    // 过滤掉该月份（如果已存在则更新，避免重复）
    sheetData = sheetData.filter(r => r['月份'] !== monthStr);
  }
  
  // 添加新记录
  sheetData.push({
    '月份': monthStr,
    '店铺ID': shopId,
    '客服名': customerName,
    '店铺名': shopName,
    '提取时间': new Date().toISOString()
  });
  
  // 按月份排序
  sheetData.sort((a, b) => String(a['月份'] || '').localeCompare(String(b['月份'] || '')));
  
  // 重建 sheet
  const newSheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
  if (workbook.SheetNames.includes(sheetName)) {
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter(n => n !== sheetName);
  }
  XLSX.utils.book_append_sheet(workbook, newSheet, sheetName);
  
  XLSX.writeFile(workbook, filePath);
  console.log(`📋 客服月记录已更新: ${path.basename(filePath)} / ${sheetName} / ${monthStr}`);
}

/**
 * 读取客服月记录
 * @param {string} shopName - 店铺名（Sheet名）
 * @returns {Array} 已提取的月份记录列表
 */
function readCustomerMonthRecords(shopName) {
  const filePath = getCustomerIndexPath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    if (!workbook.SheetNames.includes(shopName)) {
      return [];
    }
    return XLSX.utils.sheet_to_json(workbook.Sheets[shopName]);
  } catch (e) {
    console.error('读取客服月记录失败:', e.message);
    return [];
  }
}

/**
 * 获取客服已提取月份列表（按店铺名）
 * @param {string} shopName - 店铺名
 * @returns {string[]} 已提取月份数组
 */
function getExtractedCustomerMonths(shopName) {
  const records = readCustomerMonthRecords(shopName);
  return records.map(r => r['月份']).filter(Boolean);
}

/**
 * 检查客服月份是否已提取
 * @param {string} shopName - 店铺名
 * @param {string} monthStr - 月份 (YYYY-MM)
 * @returns {boolean} 是否已提取
 */
function isCustomerMonthExtracted(shopName, monthStr) {
  const extracted = getExtractedCustomerMonths(shopName);
  return extracted.includes(monthStr);
}

module.exports = {
  writeSalesData,
  writePromotionData,
  readSalesData,
  writeCustomerPerformance,
  readCustomerPerformance,
  getCustomerPerformanceMonths,
  writeCustomerMonthRecord,
  readCustomerMonthRecords,
  getExtractedCustomerMonths,
  isCustomerMonthExtracted,
  isSingleDay,
  isFullMonth,
  getFilePath,
  getCustomerPerformanceFilePath,
  getCustomerIndexPath,
  writeReviewData,
  updateReplyStatus,
  updateReportStatus,
};

/**
 * 写入评价数据到 Excel
 * @param {string} shopName - 店铺名（Sheet名）
 * @param {Array} reviews - 评价数据数组
 * @returns {string} 文件路径
 */
async function writeReviewData(shopId, reviews) {
  ensureDir(DATA_ROOT);
  
  // 表头（新增：是否已举报、状态）
  const headers = ['序号', '星级', '订单号', '买家昵称', '商品ID', '评价内容', '评价时间', '是否已回复', '是否已举报', '状态'];
  
  // 统计写入数量
  let addedLowStar = 0, addedHighStar = 0;
  
  // ========== 1. 订单ID去重 ==========
  const seenOrderIds = new Set();
  const uniqueReviews = reviews.filter(r => {
    if (!r.orderId) return true;
    if (seenOrderIds.has(r.orderId)) return false;
    seenOrderIds.add(r.orderId);
    return true;
  });
  
  const duplicateCount = reviews.length - uniqueReviews.length;
  if (duplicateCount > 0) {
    console.log(`🔄 去重：跳过 ${duplicateCount} 条重复订单`);
  }
  
  // ========== 2. 按星级分类 ==========
  const lowStarReviews = uniqueReviews.filter(r => r.star <= 2); // 1-2星
  const highStarReviews = uniqueReviews.filter(r => r.star === 5); // 5星
  // 3-4星不再记录
  
  const filePaths = [];
  
  // ========== 3. 写入低星级文件 (1-2星) ==========
  if (lowStarReviews.length > 0) {
    const fileName = `review_${shopId}_no.xlsx`;
    const filePath = path.join(DATA_ROOT, fileName);
    
    // 读取现有数据做增量
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        const wb = XLSX.readFile(filePath);
        existingData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) || [];
      } catch (e) {}
    }
    
    // 合并去重
    const existingOrderIds = new Set(existingData.map(r => r['订单号']).filter(Boolean));
    const newData = lowStarReviews.filter(r => !existingOrderIds.has(r.orderId));
    
    if (newData.length > 0) {
      const allData = [...existingData, ...newData.map((r, i) => ({
        '序号': existingData.length + i + 1,
        '星级': r.star || '',
        '订单号': r.orderId || '',
        '买家昵称': r.buyerName || '',
        '商品ID': r.goodsId || '',
        '评价内容': r.content || '',
        '评价时间': r.time || '',
        '是否已回复': r.isReplied || '否',
        '是否已举报': r.isReported === true ? '是' : '否',
        '状态': r.isReported === true ? '已举报' : '待举报'
      }))];
      
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(allData, { header: headers });
      XLSX.utils.book_append_sheet(workbook, sheet, '差评');
      XLSX.writeFile(workbook, filePath);
      
      console.log(`💾 差评(${lowStarReviews.length}条) 已写入: ${fileName}`);
      addedLowStar = newData.length;
      filePaths.push(filePath);
    } else {
      console.log(`📋 差评文件已存在，无新增数据: ${fileName}`);
    }
  } else {
    console.log(`📋 无差评，跳过`);
  }
  
  // ========== 4. 写入高星级文件 (5星) ==========
  if (highStarReviews.length > 0) {
    const fileName = `review_${shopId}_yes.xlsx`;
    const filePath = path.join(DATA_ROOT, fileName);
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
      try {
        const wb = XLSX.readFile(filePath);
        existingData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) || [];
      } catch (e) {}
    }
    
    const existingOrderIds = new Set(existingData.map(r => r['订单号']).filter(Boolean));
    const newData = highStarReviews.filter(r => !existingOrderIds.has(r.orderId));
    
    if (newData.length > 0) {
      const allData = [...existingData, ...newData.map((r, i) => ({
        '序号': existingData.length + i + 1,
        '星级': r.star || '',
        '订单号': r.orderId || '',
        '买家昵称': r.buyerName || '',
        '商品ID': r.goodsId || '',
        '评价内容': r.content || '',
        '评价时间': r.time || '',
        '是否已回复': r.isReplied || '否',
        '是否已举报': r.isReported === true ? '是' : '否',
        '状态': r.isReplied === '是' ? '已回复' : (r.isReported === true ? '已举报' : '待回复')
      }))];
      
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(allData, { header: headers });
      XLSX.utils.book_append_sheet(workbook, sheet, '好评');
      XLSX.writeFile(workbook, filePath);
      
      console.log(`💾 好评(${highStarReviews.length}条) 已写入: ${fileName}`);
      addedHighStar = newData.length;
      filePaths.push(filePath);
    } else {
      console.log(`📋 好评文件已存在，无新增数据: ${fileName}`);
    }
  } else {
    console.log(`📋 无5星评价，跳过`);
  }
  
  // ========== 5. 汇总 ==========
  console.log(`📊 评价汇总：共 ${uniqueReviews.length} 条`);
  console.log(`   ⭐1-2星: ${lowStarReviews.length} 条 → review_${shopId}_no.xlsx`);
  console.log(`   ⭐5星: ${highStarReviews.length} 条 → review_${shopId}_yes.xlsx`);
  console.log(`   ⭐3-4星: ${uniqueReviews.length - lowStarReviews.length - highStarReviews.length} 条（未单独保存）`);
  
  // 返回统一格式
  return {
    filePaths,
    added: addedLowStar + addedHighStar,
    total: reviews.length,
    lowStarCount: lowStarReviews.length,
    highStarCount: highStarReviews.length,
    skipped: duplicateCount
  };
}

// ========================
// 评价状态更新函数（从 record.js 迁移）
// ========================

const REVIEW_STATUS = {
  PENDING_REPLY: '待回复',
  REPLIED: '已回复',
  REPORTED: '已举报',
  SKIP: '无需处理'
};

/**
 * 更新评价记录状态
 * @param {string} shopId - 店铺ID
 * @param {string} orderId - 订单号
 * @param {string} newStatus - 新状态
 * @param {string} statusType - 'reply' | 'report'
 * @returns {boolean} 是否更新成功
 */
function updateReviewStatus(shopId, orderId, newStatus, statusType = 'reply') {
  // 根据状态类型确定目标文件
  const targetFile = statusType === 'report' ? `review_${shopId}_no.xlsx` : `review_${shopId}_yes.xlsx`;
  const filePath = path.join(DATA_ROOT, targetFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ 未找到文件: ${targetFile}`);
    return false;
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const compareOrderId = String(orderId);
    let updated = false;
    
    data.forEach(row => {
      const excelOrderId = String(row['订单号'] || '');
      const match = excelOrderId === compareOrderId || excelOrderId === compareOrderId.slice(-10);
      if (match) {
        row['状态'] = newStatus;
        if (statusType === 'reply') {
          row['是否已回复'] = '是';
        } else if (statusType === 'report') {
          row['是否已举报'] = '是';
        }
        updated = true;
        console.log(`  📝 更新状态: 订单${excelOrderId.slice(-10)} → ${newStatus}`);
      }
    });
    
    if (updated) {
      const newWorksheet = XLSX.utils.json_to_sheet(data);
      newWorksheet['!cols'] = worksheet['!cols'];
      workbook.Sheets[sheetName] = newWorksheet;
      XLSX.writeFile(workbook, filePath);
    }
    
    return updated;
  } catch (e) {
    console.log(`⚠️ 更新状态失败: ${e.message}`);
    return false;
  }
}

/**
 * 更新回复状态
 * @param {string} shopId - 店铺ID
 * @param {string} orderId - 订单号
 * @returns {boolean} 是否更新成功
 */
function updateReplyStatus(shopId, orderId) {
  return updateReviewStatus(shopId, orderId, REVIEW_STATUS.REPLIED, 'reply');
}

/**
 * 更新举报状态
 * @param {string} shopId - 店铺ID
 * @param {string} orderId - 订单号
 * @returns {boolean} 是否更新成功
 */
function updateReportStatus(shopId, orderId) {
  return updateReviewStatus(shopId, orderId, REVIEW_STATUS.REPORTED, 'report');
}
