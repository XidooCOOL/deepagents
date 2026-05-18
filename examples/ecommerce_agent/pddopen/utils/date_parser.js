/**
 * date_parser.js - 自然语言日期解析模块
 * 支持：单日、日期范围、月度、自然语言相对日期
 * 
 * @author 小古
 * @date 2026-04-21
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取月份天数
 * @param {number} year 
 * @param {number} month - 1-12
 * @returns {number}
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 检查日期范围是否超过拼多多限制（31天）
 * @param {string} start - YYYY-MM-DD
 * @param {string} end - YYYY-MM-DD
 * @returns {{ valid: boolean, days: number, message?: string }}
 */
function checkDateRangeLimit(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  
  if (days > 31) {
    return {
      valid: false,
      days,
      message: `日期范围 ${days} 天，超过拼多多 31 天限制`
    };
  }
  return { valid: true, days };
}

/**
 * 解析自然语言日期
 * @param {string} text - 用户输入的日期文本
 * @param {Date} now - 基准日期，默认当前时间
 * @returns {{ type: 'range'|'single', start: string, end?: string, days: number } | null}
 */
function parseNaturalDate(text, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const d = now.getDate();
  
  // 清理文本
  const cleanText = text.replace(/\s+/g, '').toLowerCase();
  
  // ==================== 1. 精确日期 ====================
  // 2026-04-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanText)) {
    return { type: 'single', start: cleanText, days: 1 };
  }
  
  // ==================== 2. 日期范围 ====================
  // 2026-02-22到2026-04-15 或 2026-02-22至2026-04-15 或 2026-02-22~2026-04-15
  const rangeMatch = cleanText.match(/(\d{4}-\d{2}-\d{2})[到至~～](\d{4}-\d{2}-\d{2})/);
  if (rangeMatch) {
    const result = { type: 'range', start: rangeMatch[1], end: rangeMatch[2] };
    const check = checkDateRangeLimit(result.start, result.end);
    result.days = check.days;
    return result;
  }
  
  // 无分隔符日期范围：20260328~20260406 或 20260328到20260406
  const rangeMatchNoSep = cleanText.match(/(\d{8})[到至~～](\d{8})/);
  if (rangeMatchNoSep) {
    const start = rangeMatchNoSep[1];
    const end = rangeMatchNoSep[2];
    // 转换为标准格式
    const startFormatted = `${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)}`;
    const endFormatted = `${end.slice(0,4)}-${end.slice(4,6)}-${end.slice(6,8)}`;
    const result = { type: 'range', start: startFormatted, end: endFormatted };
    const check = checkDateRangeLimit(result.start, result.end);
    result.days = check.days;
    return result;
  }
  
  // 无分隔符单日：20260328
  if (/^\d{8}$/.test(cleanText)) {
    const formatted = `${cleanText.slice(0,4)}-${cleanText.slice(4,6)}-${cleanText.slice(6,8)}`;
    return { type: 'single', start: formatted, days: 1 };
  }
  
  // ==================== 3. 月份 ====================
  // 3月、3月份、当月3月、2026-04（YYYY-MM格式）或 202603（YYYYMM格式）
  const monthMatch = cleanText.match(/^(当月|这个月)?(\d{1,2})月(?:份)?/);
  const ymMatch = cleanText.match(/^(\d{4})-(\d{2})$/);
  const ymNoSepMatch = cleanText.match(/^(\d{4})(\d{2})$/);
  
  if (monthMatch) {
    const month = parseInt(monthMatch[2]);
    if (month >= 1 && month <= 12) {
      const days = getDaysInMonth(y, month);
      const start = `${y}-${String(month).padStart(2, '0')}-01`;
      const end = `${y}-${String(month).padStart(2, '0')}-${days}`;
      const isCurrentMonth = (parseInt(monthMatch[2]) === m + 1);
      return { type: 'range', start, end, days, isCurrentMonth };
    }
  }
  
  // YYYYMM 格式（如 202603）
  if (ymMatch) {
    const year = parseInt(ymMatch[1]);
    const month = parseInt(ymMatch[2]);
    if (month >= 1 && month <= 12) {
      const isCurrentMonth = (year === y && month === m + 1);
      
      if (isCurrentMonth) {
        // 当月：解析为当月1号到昨日（返回范围格式，写入副本文件）
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const end = formatDate(now);
        const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
        return { type: 'range', start, end, days, isCurrentMonth: true };
      } else {
        // 过去月份：返回 YYYY-MM 格式（写入正常文件）
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        return { type: 'single', start: monthStr, isMonth: true };
      }
    }
  }
  
  // YYYYMM 格式（如 202603）
  if (ymNoSepMatch) {
    const year = parseInt(ymNoSepMatch[1]);
    const month = parseInt(ymNoSepMatch[2]);
    if (month >= 1 && month <= 12) {
      const isCurrentMonth = (year === y && month === m + 1);
      
      if (isCurrentMonth) {
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const end = formatDate(now);
        const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
        return { type: 'range', start, end, days, isCurrentMonth: true };
      } else {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        return { type: 'single', start: monthStr, isMonth: true };
      }
    }
  }
  
  // ==================== 4. 上个月 / 上月 ====================
  if (cleanText.includes('上个月') || cleanText.includes('上月')) {
    const prevMonth = m === 0 ? 11 : m - 1;
    const prevYear = m === 0 ? y - 1 : y;
    const days = getDaysInMonth(prevYear, prevMonth + 1);
    const start = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
    const end = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${days}`;
    return { type: 'range', start, end, days };
  }
  
  // ==================== 5. 本月 / 这个月 ====================
  if (cleanText.includes('本月') || cleanText.includes('这个月')) {
    const days = getDaysInMonth(y, m + 1);
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end = formatDate(now);
    return { type: 'range', start, end, days };
  }
  
  // ==================== 6. 最近N天 ====================
  // 最近7天、最近30天
  const recentMatch = cleanText.match(/最近(\d+)天/);
  if (recentMatch) {
    const n = parseInt(recentMatch[1]);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - n + 1);
    const start = formatDate(startDate);
    const end = formatDate(now);
    return { type: 'range', start, end, days: n };
  }
  
  // ==================== 7. 上周 ====================
  if (cleanText.includes('上周')) {
    const day = now.getDay() || 7; // 周日=0，转为7
    const monday = new Date(now);
    monday.setDate(monday.getDate() - day - 6);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { 
      type: 'range', 
      start: formatDate(monday), 
      end: formatDate(sunday), 
      days: 7 
    };
  }
  
  // ==================== 8. 本周 ====================
  if (cleanText.includes('本周') || cleanText.includes('这周')) {
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - day + 1);
    return { 
      type: 'range', 
      start: formatDate(monday), 
      end: formatDate(now), 
      days: day 
    };
  }
  
  // ==================== 8. 上月 / 上个月 ====================
  if (cleanText === '上月' || cleanText === '上个月' || cleanText === '上个月') {
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    return { 
      type: 'range', 
      start: formatDate(firstDay), 
      end: formatDate(lastDay), 
      days: lastDay.getDate() 
    };
  }
  
  // ==================== 9. 本月 / 当月 ====================
  if (cleanText === '本月' || cleanText === '当月' || cleanText === '这个月') {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return { 
      type: 'range', 
      start: formatDate(firstDay), 
      end: formatDate(lastDay), 
      days: lastDay.getDate() 
    };
  }
  
  // ==================== 10. 昨天 ====================
  if (cleanText === '昨天' || cleanText === '昨日') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { type: 'single', start: formatDate(yesterday), days: 1 };
  }
  
  // ==================== 11. 今天 ====================
  if (cleanText === '今天' || cleanText === '今日') {
    return { type: 'single', start: formatDate(now), days: 1 };
  }
  
  // 无法解析
  return null;
}

/**
 * 从参数列表中提取日期描述
 * @param {string[]} args - 命令行参数
 * @returns {string|null} - 日期描述文本
 */
function extractDateText(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // 跳过已知选项
    if (arg.startsWith('--')) continue;
    if (arg === '-h' || arg === '--help') continue;
    
    // 检查是否是日期相关文本
    if (/\d{4}-\d{2}/.test(arg)) return arg;  // 2026-04
    if (/\d{8}/.test(arg)) return arg;         // 20260328, 20260328~20260406
    if (/\d{1,2}月/.test(arg)) return arg;     // 3月
    if (/[上下本]周/.test(arg)) return arg;    // 上周
    if (/最近\d+天/.test(arg)) return arg;     // 最近7天
    if (/[上下本]个月/.test(arg)) return arg;  // 上个月
    if (/[研究]日/.test(arg)) return arg;      // 昨天、今天
    if (/[到至~～]/.test(arg)) return arg;     // 日期范围分隔符
  }
  return null;
}

module.exports = {
  formatDate,
  getDaysInMonth,
  checkDateRangeLimit,
  parseNaturalDate,
  extractDateText
};
