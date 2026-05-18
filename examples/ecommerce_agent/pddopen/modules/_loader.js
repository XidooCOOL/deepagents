/**
 * _loader.js - 模块自动加载器
 * 
 * 功能：自动扫描 modules/ 下的子目录，加载所有 index.js
 * 使用方式：
 *   const modules = require('./modules');
 *   modules.extract.extractSales(...)
 *   modules.customer.getPerformance(...)
 * 
 * 新增模块只需创建目录和 index.js，无需手动注册
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = __dirname;

/**
 * 加载所有业务模块
 * @returns {Object} modules - { extract: {...}, customer: {...}, tuike: {...}, ... }
 */
function loadModules() {
  const modules = {};
  
  console.log('\n📦 加载业务模块...');
  
  // 扫描 modules 目录下的所有子目录
  const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    // 只处理目录，跳过 _loader.js 和隐藏文件
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    
    const moduleName = entry.name;
    const indexPath = path.join(MODULES_DIR, moduleName, 'index.js');
    
    // 检查是否有 index.js
    if (!fs.existsSync(indexPath)) {
      console.log(`  ⚠ ${moduleName}/ 目录无 index.js，跳过`);
      continue;
    }
    
    try {
      modules[moduleName] = require(indexPath);
      console.log(`  ✓ ${moduleName}`);
    } catch (e) {
      console.error(`  ✗ ${moduleName} 加载失败: ${e.message}`);
    }
  }
  
  console.log(`📦 共加载 ${Object.keys(modules).length} 个模块\n`);
  
  return modules;
}

/**
 * 加载指定模块
 * @param {string} moduleName - 模块名
 * @returns {Object} 模块内容
 */
function loadModule(moduleName) {
  const indexPath = path.join(MODULES_DIR, moduleName, 'index.js');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`模块不存在: ${moduleName}`);
  }
  return require(indexPath);
}

/**
 * 获取所有模块名称
 * @returns {string[]} 模块名数组
 */
function listModules() {
  return fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name);
}

module.exports = loadModules();
module.exports.loadModule = loadModule;
module.exports.listModules = listModules;
