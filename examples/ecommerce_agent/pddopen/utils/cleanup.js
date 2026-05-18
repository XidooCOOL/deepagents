/**
 * cleanup.js - 文件清理模块
 * 保留最近 N 天的文件，删除旧的
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, DATA_ROOT } = require('./config');

// ========== 辅助函数 ==========

/**
 * 获取目录下所有文件（含子目录）
 * @param {string} dir - 目录路径
 * @param {number} keepDays - 保留最近 N 天
 * @returns {Array} {path, mtimeMs} 数组
 */
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const result = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        result.push({ path: fullPath, mtimeMs: stat.mtimeMs });
      }
    }
  }
  walk(dir);
  return result;
}

/**
 * 删除过期文件
 * @param {string} dir - 目录路径
 * @param {number} keepDays - 保留最近 N 天
 * @param {string} label - 日志标签
 * @returns {object} {deletedCount, deletedSize}
 */
function cleanupDir(dir, keepDays = 7, label = '目录') {
  if (!fs.existsSync(dir)) {
    console.log(`📁 ${label} 不存在，跳过`);
    return { deletedCount: 0, deletedSize: 0 };
  }

  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const cutoff = now - keepDays * msPerDay;

  const files = listFiles(dir);
  if (files.length === 0) {
    console.log(`📁 ${label} 为空，跳过`);
    return { deletedCount: 0, deletedSize: 0 };
  }

  let deletedCount = 0;
  let deletedSize = 0;

  for (const file of files) {
    if (file.mtimeMs < cutoff) {
      try {
        const size = fs.statSync(file.path).size;
        fs.unlinkSync(file.path);
        deletedCount++;
        deletedSize += size;
      } catch (e) {
        console.warn(`⚠️ 删除失败: ${file.path} - ${e.message}`);
      }
    }
  }

  if (deletedCount > 0) {
    const sizeStr = formatBytes(deletedSize);
    console.log(`🗑️ ${label}: 删除 ${deletedCount} 个过期文件 (${sizeStr})`);
  } else {
    console.log(`✅ ${label}: 无过期文件`);
  }

  return { deletedCount, deletedSize };
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

// ========== 公共 API ==========

/**
 * 清理 backup 目录 - 保留最近 N 天
 * @param {number} keepDays - 默认保留7天
 */
function cleanupBackup(keepDays = 7) {
  const backupDir = path.join(PROJECT_ROOT, 'backup');
  return cleanupDir(backupDir, keepDays, 'backup');
}

/**
 * 清理 screenshots 目录 - 保留最近 N 天
 * @param {number} keepDays - 默认保留7天
 */
function cleanupScreenshots(keepDays = 7) {
  const screenshotsDir = path.join(DATA_ROOT, 'screenshots');
  return cleanupDir(screenshotsDir, keepDays, 'screenshots');
}

/**
 * 清理 temp 目录 - 保留最新1个截图
 */
function cleanupTemp() {
  const tempDir = path.join(PROJECT_ROOT, 'temp');
  if (!fs.existsSync(tempDir)) return { deletedCount: 0, deletedSize: 0 };

  // temp 目录只保留 current_screenshot.png，其他全删
  const files = fs.readdirSync(tempDir);
  let deletedCount = 0;
  let deletedSize = 0;

  for (const file of files) {
    if (file === 'current_screenshot.png') continue;
    const fullPath = path.join(tempDir, file);
    try {
      const size = fs.statSync(fullPath).size;
      fs.unlinkSync(fullPath);
      deletedCount++;
      deletedSize += size;
    } catch (e) {
      // 忽略
    }
  }

  if (deletedCount > 0) {
    console.log(`🗑️ temp: 删除 ${deletedCount} 个临时文件 (${formatBytes(deletedSize)})`);
  }

  return { deletedCount, deletedSize };
}

/**
 * 完整清理 - 清理所有临时文件
 */
function cleanupAll() {
  console.log('🧹 开始清理临时文件...');
  const b1 = cleanupBackup(7);
  const b2 = cleanupScreenshots(7);
  const b3 = cleanupTemp();
  const total = b1.deletedCount + b2.deletedCount + b3.deletedCount;
  const totalSize = b1.deletedSize + b2.deletedSize + b3.deletedSize;
  console.log(`✅ 清理完成: 删除 ${total} 个文件 (${formatBytes(totalSize)})`);
  return { total, totalSize };
}

module.exports = {
  cleanupBackup,
  cleanupScreenshots,
  cleanupTemp,
  cleanupAll,
};