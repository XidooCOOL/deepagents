/**
 * 复用工具：在已连接的 Chrome 中按关键字查找 DOM 元素，自动生成 elements.json 配置
 * 
 * 使用方法：
 *  node utils/find-element.js [port] [pageName] [elementName] [keyword] [description]
 * 例如：
 *  node utils/find-element.js 9301 salesData yesterdayBtn "昨日" "昨日日期按钮"
 * 
 * 导出功能：
 *  - findElementsByKeyword(page, keyword): 查找候选元素
 *  - generateSelectorConfig(candidate): 生成选择器配置
 *  - updateElementInJson(pageName, elementName, config, description, path): 更新 elements.json
 */

const fs = require('fs');
const { chromium } = require('playwright');

// 读取现有的 elements.json
function loadElementsJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`elements.json not found at ${path}`);
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// 写入 elements.json
function saveElementsJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ 已保存到 ${path}`);
}

// 根据 class 属性判断是否是 CSS Modules hash 后缀
function isCssModulesHash(className) {
  // 格式: block__element_hash → 最后一段长度 ~5 位
  const parts = className.split('__');
  return parts.length >= 2 && parts[parts.length - 1].length >= 4 && parts[parts.length - 1].length <= 6;
}

// 从实际 DOM 提取类名，生成选择器配置
function generateSelectorConfig(candidate) {
  const classes = candidate.classes.filter(c => c);
  if (classes.length === 0) {
    // 没有 class → 拒绝生成配置（纯文本匹配太宽泛，会匹配大容器块）
    // 返回 null 让调用方知道这个候选元素不合格
    return null;
  }

  // 找最可能是 CSS Modules 的类名
  for (const cls of classes) {
    if (isCssModulesHash(cls)) {
      // 提取前缀，去掉最后一段 hash
      const prefixParts = cls.split('__');
      prefixParts.pop(); // 去掉 hash
      const prefix = prefixParts.join('__') + '__';
      return {
        type: 'css-prefix',
        value: prefix,
        note: `CSS Modules 前缀，hash 后缀自动匹配`
      };
    }
  }

  // 没有 hash，直接用 CSS
  return {
    type: 'css',
    value: '.' + classes.join('.'),
    note: '普通 CSS 类'
  };
}

// 搜索 DOM 中包含指定文字的可见元素
async function findElementsByKeyword(page, keyword) {
  return page.evaluate((keyword) => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while (walker.nextNode()) {
      node = walker.currentNode;
      // 跳过不可见元素
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible') continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) continue;

      // 文字包含关键词 或者 className 包含关键词（处理图标/纯图片元素）
      // 注意：只匹配文字较短的元素（按钮/链接），排除整块包含多个子元素的容器
      const text = node.textContent.trim();
      const className = typeof node.className === 'string' ? node.className : '';
      const classContains = className.includes(keyword) ||
        (node.classList && typeof node.classList.contains === 'function' && node.classList.contains(keyword));
      // 文字太长的肯定不是按钮，排除掉（如整段导航栏、搜索框说明文字等）
      if (text.length > 15) continue;
      if ((text.includes(keyword) || classContains) && rect.width >= 20 && rect.height >= 15) {
        // 收集信息
        results.push({
          tag: node.tagName.toLowerCase(),
          text: text.slice(0, 50) || '(无文字)', // 截断
          classes: node.className.split(/\s+/).filter(c => c),
          y: Math.round(rect.y),
          x: Math.round(rect.x),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        });
      }
    }
    // 按位置排序（y越小越靠上，排在前面）
    results.sort((a, b) => a.y - b.y);
    return results;
  }, keyword);
}

// 更新 elements.json 中的元素
function updateElementInJson(pageName, elementName, selectorConfig, description, keyword, elementsPath) {
  const data = loadElementsJson(elementsPath);

  // 插入到正确位置
  if (pageName === 'shared') {
    // shared 直接挂在顶层
    data.shared[elementName] = {
      description: description || `${selectorConfig.value} - 自动生成`,
      keyword: keyword,
      selectors: [selectorConfig]
    };
  } else {
    // 其他页面在 elements 下
    if (!data[pageName]) {
      data[pageName] = { _comment: '', elements: {} };
    }
    if (!data[pageName].elements) {
      data[pageName].elements = {};
    }
    data[pageName].elements[elementName] = {
      description: description || `${selectorConfig.value} - 自动生成`,
      keyword: keyword,
      selectors: [selectorConfig]
    };
  }

  saveElementsJson(elementsPath, data);
  return data;
}

// 对候选元素截图
async function captureCandidate(page, candidate, outputPath) {
  // 定位到元素区域，截图
  // 因为我们已经在 page.evaluate 拿到了坐标，直接用 clip
  const clip = {
    x: candidate.x - 5,
    y: candidate.y - 5,
    width: candidate.w + 10,
    height: candidate.h + 10
  };
  await page.screenshot({ path: outputPath, clip, timeout: 5000 });
  return outputPath;
}

// 主函数（命令行调用）
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log(`
用法:
  node find-element.js <port> <pageName> <elementName> <keyword> [description]

参数:
  port        CDP 端口 (比如 9301)
  pageName    页面名: shared | login | home | salesData | customerService | ...
  elementName 元素名: 对应 elements.json 里的 key，比如 yesterdayBtn
  keyword     关键词，搜索包含该文字的可见元素
  description 描述文字 (可选)

示例:
  node find-element.js 9301 salesData yesterdayBtn "昨日" "昨日日期按钮"
`);
    process.exit(1);
  }

  const [port, pageName, elementName, keyword, description] = args;
  const ELEMENTS_PATH = require('path').resolve(__dirname, '../refs/elements.json');

  console.log(`🔍 连接到 CDP 端口 ${port}...`);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];

  // 等待页面稳定
  await page.waitForTimeout(2000);

  console.log(`🔎 搜索包含 "${keyword}" 的可见元素...`);
  const candidates = await findElementsByKeyword(page, keyword);
  console.log(`找到 ${candidates.length} 个候选元素\n`);

  if (candidates.length === 0) {
    console.log('❌ 没找到匹配的元素，请检查关键词');
    await browser.close();
    process.exit(1);
  }

  // 显示候选列表
  candidates.slice(0, 10).forEach((c, i) => {
    console.log(`[${i}] <${c.tag}> "${c.text}" y=${c.y} x=${c.x} w=${c.w} h=${c.h} classes=[${c.classes.join(', ')}]`);
  });
  console.log();

  // 选第一个（按y排序，最上面的就是目标）
  const candidate = candidates[0];
  console.log(`✅ 自动选择最靠上的元素 [0] 作为目标\n`);

  // 生成 selector 配置
  const config = generateSelectorConfig(candidate);
  console.log(`生成选择器配置:
  type: ${config.type}
  value: ${config.value}
  note: ${config.note}
`);

  // 写入 elements.json
  updateElementInJson(pageName, elementName, config, description, ELEMENTS_PATH);
  console.log(`
🎉 完成！已更新 elements.json:
  pageName: ${pageName}
  elementName: ${elementName}
  keyword: ${keyword}
`);

  await browser.close();
}

// 导出供其他模块调用
module.exports = {
  findElementsByKeyword,
  generateSelectorConfig,
  updateElementInJson,
  captureCandidate,
  loadElementsJson,
  saveElementsJson
};

// 如果是命令行直接调用，运行 main
if (require.main === module) {
  const path = require('path');
  main().catch(e => {
    console.error('❌ 错误:', e.message);
    process.exit(1);
  });
}
