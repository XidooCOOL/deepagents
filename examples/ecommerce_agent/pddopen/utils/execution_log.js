/**
 * execution_log.js - 执行日志和统计模块
 * Phase 3: 执行日志和统计
 * 
 * @author 小古
 * @date 2026-04-22
 */

const fs = require('fs');
const path = require('path');
const { DATA_ROOT } = require('./config');

// 日志文件路径
const LOG_FILE = path.join(DATA_ROOT, 'execution_log.json');

// 日志条目结构
class ExecutionLog {
  constructor(shop, type, date) {
    this.shop = shop;
    this.type = type;          // 'sales' | 'service' | 'ads' | 'all'
    this.date = date;
    this.startTime = Date.now();
    this.status = 'running';   // 'running' | 'success' | 'failed'
    this.error = null;
    this.duration = null;
    this.metrics = null;
  }

  success(metrics = null) {
    this.status = 'success';
    this.duration = Date.now() - this.startTime;
    this.metrics = metrics;
    this.save();
    return this;
  }

  fail(error) {
    this.status = 'failed';
    this.duration = Date.now() - this.startTime;
    this.error = typeof error === 'string' ? error : error.message;
    this.save();
    return this;
  }

  toJSON() {
    return {
      shop: this.shop,
      type: this.type,
      date: this.date,
      status: this.status,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: this.duration,
      error: this.error,
      metrics: this.metrics
    };
  }

  save() {
    const logs = readLogs();
    logs.push(this.toJSON());
    writeLogs(logs);
  }
}

// 读取所有日志
function readLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('⚠️ 读取日志失败:', e.message);
  }
  return [];
}

// 写入日志
function writeLogs(logs) {
  try {
    // 确保目录存在
    if (!fs.existsSync(DATA_ROOT)) {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
    }
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('⚠️ 写入日志失败:', e.message);
  }
}

// 获取统计信息
function getStats(days = 7) {
  const logs = readLogs();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const recent = logs.filter(l => new Date(l.startTime).getTime() > cutoff);
  
  const total = recent.length;
  const success = recent.filter(l => l.status === 'success').length;
  const failed = recent.filter(l => l.status === 'failed').length;
  
  const avgDuration = total > 0
    ? Math.round(recent.reduce((sum, l) => sum + (l.duration || 0), 0) / total)
    : 0;
  
  // 按类型统计
  const byType = {};
  for (const type of ['sales', 'service', 'ads', 'all']) {
    const typeLogs = recent.filter(l => l.type === type);
    const typeSuccess = typeLogs.filter(l => l.status === 'success').length;
    byType[type] = {
      total: typeLogs.length,
      success: typeSuccess,
      failed: typeLogs.length - typeSuccess,
      rate: typeLogs.length > 0 ? Math.round(typeSuccess / typeLogs.length * 100) : 0
    };
  }

  return {
    period: `最近${days}天`,
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round(success / total * 100) : 0,
    avgDuration,
    byType,
    recentLogs: recent.slice(-10)  // 最近10条
  };
}

// 打印统计
function printStats(days = 7) {
  const stats = getStats(days);
  
  console.log('\n📊 执行统计 (' + stats.period + ')');
  console.log('─'.repeat(40));
  console.log(`  总执行: ${stats.total} 次`);
  console.log(`  成功:   ${stats.success} 次`);
  console.log(`  失败:   ${stats.failed} 次`);
  console.log(`  成功率: ${stats.successRate}%`);
  console.log(`  平均耗时: ${(stats.avgDuration / 1000).toFixed(1)}s`);
  console.log('\n📈 按类型统计:');
  for (const [type, data] of Object.entries(stats.byType)) {
    if (data.total > 0) {
      console.log(`  ${type}: ${data.success}/${data.total} (${data.rate}%)`);
    }
  }
}

// 清除旧日志
function clearLogs(beforeDays = 30) {
  const logs = readLogs();
  const cutoff = Date.now() - beforeDays * 24 * 60 * 60 * 1000;
  
  const filtered = logs.filter(l => new Date(l.startTime).getTime() > cutoff);
  writeLogs(filtered);
  
  console.log(`🗑️ 清除 ${logs.length - filtered.length} 条旧日志`);
  return logs.length - filtered.length;
}

module.exports = {
  ExecutionLog,
  getStats,
  printStats,
  clearLogs,
  LOG_FILE
};
