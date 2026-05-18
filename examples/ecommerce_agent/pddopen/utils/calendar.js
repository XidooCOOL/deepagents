/**
 * calendar.js - 日历日期选择模块（DOM 版本 + elements.json 统一驱动）
 * 2026-04-20 更新：在 evaluate 中执行点击
 * 2026-04-21 更新：使用 DOM 结构判断左右，减少坐标依赖
 * 2026-04-23 更新：全面使用 elements.json 定义的 CSS 选择器
 */
const { randomDelay } = require('./browser');
const { getSelectors, getCssQuerySelector, getCssQuerySelectors } = require('./elements');

/** 打开日历 - 使用 elements.json 定义的选择器 */
async function openCalendar(page) {
  // 获取 elements.json 中定义的选择器
  const customBtnSelectors = getCssQuerySelectors('salesData', 'customDateBtn');
  const fallbackSelector = '.date-picker-group_date-picker-item-inner__1BAKo';
  const allSelectors = [...customBtnSelectors, fallbackSelector];
  
  const result = await page.evaluate((selectors) => {
    for (const sel of selectors) {
      try {
        const divs = document.querySelectorAll(sel);
        for (const div of divs) {
          if (div.textContent?.trim() === '自定义' && div.getBoundingClientRect().y < 200) {
            div.click();
            return true;
          }
        }
      } catch (e) {
        // 选择器语法错误，跳过
      }
    }
    return false;
  }, allSelectors);
  return result;
}

/** 获取日期输入框元素 */
async function getDateInputs(page) {
  return await page.evaluate(() => {
    const inputs = [];
    document.querySelectorAll('input').forEach(i => {
      const b = i.getBoundingClientRect();
      // 扩展 y 范围：兼容销售页面（y=1599）和客服页面（y=150左右）
      if (b.width > 0 && b.y > 100 && b.y < 1700 && i.readOnly) {
        inputs.push({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) });
      }
    });
    return inputs.sort((a, b) => a.x - b.x);
  });
}

/** 
 * 获取月份面板信息 - 使用 elements.json 统一选择器
 * 使用 DOM 结构判断左右，不用固定坐标
 */
async function getMonthPanels(page) {
  // 从 elements.json 获取选择器（在 evaluate 外部调用）
  const monthTitleSelector = getCssQuerySelector('calendar', 'monthTitle');
  const panelHeaderSelector = getCssQuerySelector('calendar', 'panelHeader');
  
  const result = await page.evaluate((selectors) => {
    const { monthTitleSelector, panelHeaderSelector } = selectors;
    
    // 1. 获取月份文本
    const spans = monthTitleSelector 
      ? document.querySelectorAll(monthTitleSelector) 
      : document.querySelectorAll('[class*="RPR_dateText"]');
    const months = Array.from(spans).map(s => s.innerText?.trim());
    
    const arrows = [];
    
    // 2. 从 panelHeader 获取箭头
    const headers = panelHeaderSelector
      ? document.querySelectorAll(panelHeaderSelector)
      : document.querySelectorAll('[class*="RPR_panelHeader"]');
    
    headers.forEach((header, index) => {
      // 查找 SVG（主要）
      const svg = header.querySelector('svg');
      if (svg) {
        const b = svg.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) {
          arrows.push({
            x: Math.round(b.x + b.width / 2),
            y: Math.round(b.y + b.height / 2),
            panel: index === 0 ? 'left' : 'right',
            type: 'svg'
          });
        }
      }
      
      // 备用：查找 <i> 元素（客服页面）
      if (arrows.filter(a => a.panel === (index === 0 ? 'left' : 'right')).length === 0) {
        const iEl = header.querySelector('i');
        if (iEl) {
          const b = iEl.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) {
            arrows.push({
              x: Math.round(b.x + b.width / 2),
              y: Math.round(b.y + b.height / 2),
              panel: index === 0 ? 'left' : 'right',
              type: 'i'
            });
          }
        }
      }
    });
    
    // 3. 备用方案：使用相对位置判断
    // 如果找到的箭头不足 2 个，使用全局查找 + 相对位置
    if (arrows.length < 2) {
      const allSVGs = document.querySelectorAll('[class*="RPR_panelHeader"] svg');
      if (allSVGs.length >= 2) {
        // 按 x 坐标排序，第一个是左，第二个是右
        const sorted = Array.from(allSVGs)
          .map(svg => {
            const b = svg.getBoundingClientRect();
            return { x: b.x, y: b.y, el: svg };
          })
          .sort((a, b) => a.x - b.x);
        
        sorted.forEach((item, idx) => {
          if (idx < 2) {
            arrows.push({
              x: Math.round(item.x + item.el.getBoundingClientRect().width / 2),
              y: Math.round(item.y + item.el.getBoundingClientRect().height / 2),
              panel: idx === 0 ? 'left' : 'right',
              type: 'svg-fallback'
            });
          }
        });
      }
    }
    
    return { months, arrows };
  }, { monthTitleSelector, panelHeaderSelector });  // 传入选择器
  
  return result;
}

/** 
 * 查找日期单元格 - 使用 elements.json 统一选择器
 * 使用月份标题文本判断面板归属（比坐标更准确）
 */
/**
 * 查找日期单元格 - 使用 elements.json 统一选择器
 * 使用 RPR_tableWrapper 区分面板归属（比 outerWrapper 更准确）
 *
 * 日历 DOM 结构（关键！）：
 *   RPR_outerPickerWrapper（整个日历，只有一个根元素）
 *     RPR_headerWrapper
 *       RPR_dateText "3月"  → 对应左面板
 *       RPR_dateText "4月"  → 对应右面板
 *     RPR_contentPickerWrapper
 *       RPR_tableWrapper（x=1592，3月表格）→ 左面板
 *       RPR_tableWrapper（x=1864，4月表格）→ 右面板
 *     RPR_footerWrapper
 *
 * 注意：不能用 outerWrapper 区分，因为两个月份共享同一个 outerWrapper
 */
/**
 * 查找日期单元格 - 使用 elements.json 统一选择器
 * 使用 RPR_tableWrapper 区分面板归属（比 outerWrapper 更准确）
 *
 * 日历 DOM 结构（关键！）：
 *   RPR_outerPickerWrapper（整个日历，只有一个根元素）
 *     RPR_headerWrapper（只有一个）
 *       RPR_dateText "3月"  (x=1759)
 *       RPR_dateText "4月"  (x=2031)
 *     RPR_contentPickerWrapper
 *       RPR_tableWrapper (x=1592) → 3月表格（index 0）
 *       RPR_tableWrapper (x=1864) → 4月表格（index 1）
 *     RPR_footerWrapper
 *
 * 注意：不能用 outerWrapper 区分，两个月份共享同一个 outerWrapper
 * 正确方法：月份标题和 tableWrapper 按 x 坐标排序后一一对应
 */
async function findDayCell(page, day, side) {
  // 从 elements.json 获取选择器
  const dayCellSelectors = getCssQuerySelectors('calendar', 'dayCell');
  const monthTitleSelectors = getCssQuerySelectors('calendar', 'monthTitle');
  const tableWrapperSelectors = getCssQuerySelectors('calendar', 'tableWrapper');

  const result = await page.evaluate((params) => {
    const { d, targetSide, dayCellSelectors, monthTitleSelectors, tableWrapperSelectors } = params;

    // 辅助函数：从选择器数组中查找元素
    const queryAll = (selectors, context = document) => {
      for (const sel of selectors) {
        try {
          const found = context.querySelectorAll(sel);
          if (found.length) return found;
        } catch (e) {}
      }
      return [];
    };

    // 1. 获取月份标题（按 x 坐标排序）
    const monthTitles = Array.from(queryAll(monthTitleSelectors))
      .map(el => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), text: el.textContent?.trim() };
      })
      .sort((a, b) => a.x - b.x);

    // 2. 获取 tableWrapper 列表（按 x 坐标排序）
    const tableWrappers = Array.from(queryAll(tableWrapperSelectors))
      .map(el => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), width: Math.round(r.width) };
      })
      .sort((a, b) => a.x - b.x);

    // 3. 建立月份到 tableWrapper 的映射
    const monthToTableWrapper = {};
    monthTitles.forEach((mt, idx) => {
      if (tableWrappers[idx]) {
        monthToTableWrapper[mt.text] = tableWrappers[idx].x;
      }
    });

    // 4. 计算 x 轴分界线
    let midX = 1800;
    if (tableWrappers.length >= 2) {
      midX = (tableWrappers[0].x + tableWrappers[0].width + tableWrappers[1].x) / 2;
    }

    let res = null;

    // 5. 遍历日期单元格（优先使用 elements.json 选择器，备用硬编码）
    const allSelectors = [...dayCellSelectors, '[class*="RPR_tdDay_"]', '[class*="RPR_cell_"]'];

    for (const selector of allSelectors) {
      if (res) break;
      try {
        document.querySelectorAll(selector).forEach(td => {
          if (res) return;

          const txt = td.innerText?.trim() || '';
          const n = parseInt(txt);
          if (n !== d) return;

          if (td.className.includes('RPR_outOfMonth')) return;

          const r = td.getBoundingClientRect();
          if (r.width < 20 || r.width > 80 || r.height < 20 || r.height > 60) return;
          if (r.y < 150 || r.y > 600) return;

          const cellX = Math.round(r.x + r.width / 2);

          // 6. 找到日期所在的 tableWrapper
          let foundMonth = null;
          let foundSide = null;

          for (const twSel of tableWrapperSelectors) {
            const tableWrapper = td.closest(twSel);
            if (tableWrapper) {
              const twX = Math.round(tableWrapper.getBoundingClientRect().x);
              for (const [month, wrapperX] of Object.entries(monthToTableWrapper)) {
                if (wrapperX === twX) {
                  foundMonth = month;
                  break;
                }
              }
              if (foundMonth) break;
            }
          }

          // 如果用选择器没找到，尝试硬编码
          if (!foundMonth) {
            const tableWrapper = td.closest('[class*="RPR_tableWrapper"]');
            if (tableWrapper) {
              const twX = Math.round(tableWrapper.getBoundingClientRect().x);
              for (const [month, wrapperX] of Object.entries(monthToTableWrapper)) {
                if (wrapperX === twX) {
                  foundMonth = month;
                  break;
                }
              }
            }
          }

          // 如果还没找到，用 x 坐标判断
          if (!foundMonth) {
            foundSide = cellX < midX ? 'left' : 'right';
          } else {
            const monthIndex = monthTitles.findIndex(mt => mt.text === foundMonth);
            if (monthIndex === 0) {
              foundSide = 'left';
            } else if (monthIndex === 1) {
              foundSide = 'right';
            } else {
              foundSide = cellX < midX ? 'left' : 'right';
            }
          }

          if (targetSide === foundSide) {
            res = { x: cellX, y: Math.round(r.y + r.height / 2), month: foundMonth };
          }
        });
      } catch (e) {}
    }

    return res;
  }, { d: day, targetSide: side, dayCellSelectors, monthTitleSelectors, tableWrapperSelectors });

  return result;
}

async function switchToMonth(page, month, side) {
  const m = { '1月': 1, '2月': 2, '3月': 3, '4月': 4, '5月': 5, '6月': 6, '7月': 7, '8月': 8, '9月': 9, '10月': 10, '11月': 11, '12月': 12 };
  
  for (let i = 0; i < 12; i++) {
    const { months, arrows } = await getMonthPanels(page);
    
    // 清理月份格式
    const cleanMonth = (str) => {
      const match = str.match(/(\d+)月/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const leftMonth = cleanMonth(months[0]);
    const rightMonth = cleanMonth(months[1]);
    const targetMonth = cleanMonth(month);
    
    console.log(`      📆 面板: ${months[0]}, ${months[1]} | 目标: ${month} (${targetMonth})`);
    
    // 检查目标月份是否在任意面板上
    if (leftMonth === targetMonth || rightMonth === targetMonth) {
      console.log(`      ✅ 目标月份 ${month} 已在日历中`);
      return true;
    }
    
    if (!targetMonth) return false;
    
    // 根据当前面板和目标月份决定点击哪个箭头
    // 左侧箭头：左侧月份减
    // 右侧箭头：右侧月份加
    let clicks = 0;
    let arrowIndex = -1;
    
    if (side === 'left') {
      // 控制左侧面板
      if (targetMonth < leftMonth) {
        // 需要减月份，点击左侧箭头
        clicks = leftMonth - targetMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'left');
      } else if (targetMonth >= leftMonth && targetMonth <= rightMonth) {
        // 目标在范围内，点击右侧箭头加
        clicks = targetMonth - leftMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'right');
      } else {
        // 目标大于右侧，继续加
        clicks = targetMonth - rightMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'right');
      }
    } else {
      // 控制右侧面板
      if (targetMonth > rightMonth) {
        // 需要加月份，点击右侧箭头
        clicks = targetMonth - rightMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'right');
      } else if (targetMonth >= leftMonth && targetMonth <= rightMonth) {
        // 目标在范围内，点击右侧箭头调整
        clicks = targetMonth - rightMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'right');
      } else {
        // 目标小于左侧，点击左侧箭头减
        clicks = leftMonth - targetMonth;
        arrowIndex = arrows.findIndex(a => a.panel === 'left');
      }
    }
    
    if (arrowIndex >= 0 && clicks > 0) {
      const arrow = arrows[arrowIndex];
      console.log(`      🔄 点击 ${arrow.panel} 箭头 ${clicks} 次`);
      for (let j = 0; j < clicks; j++) {
        await page.mouse.click(arrow.x, arrow.y);
        await randomDelay(800, 1200);
      }
    } else {
      return false;
    }
  }
  return false;
}

/** 选择年份 */
async function selectYear(page, year) {
  return await page.evaluate(y => {
    // 首先在 ST_dropdownPanel 中查找（年份下拉框）
    const panel = document.querySelector('[class*="ST_dropdownPanel"]');
    if (panel) {
      const allItems = panel.querySelectorAll('[class*="cIL"]');
      for (const it of allItems) {
        if (it.innerText?.trim() === y) {
          it.click();
          return '点击: ' + y;
        }
      }
    }
    
    // 备用：在整个页面查找
    const selectors = ['[class*="cIL"]'];
    for (const sel of selectors) {
      const items = document.querySelectorAll(sel);
      for (const it of items) { 
        if (it.innerText?.trim() === y) { 
          it.click(); 
          return '全局点击: ' + y; 
        } 
      }
    }
    
    return false;
  }, year + '年');
}

/** 点击确认按钮 */
async function clickConfirm(page) {
  const result = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmBtns = btns.filter(b => {
      const text = b.textContent?.trim();
      return text === '确认' || text === '确定';
    });
    
    for (const b of confirmBtns) {
      const bb = b.getBoundingClientRect();
      // 放宽条件：只要可见且未禁用
      if (bb.width > 0 && bb.height > 0 && !b.disabled && !b.className.includes('disabled')) {
        return { x: Math.round(bb.x + bb.width / 2), y: Math.round(bb.y + bb.height / 2), text: b.textContent?.trim() };
      }
    }
    
    // 备用：直接找第一个包含"确认"的按钮
    for (const b of confirmBtns) {
      b.click();
      return { clicked: true };
    }
    
    return null;
  });
  
  if (result) {
    if (result.clicked) {
      console.log('      ✅ 点击确认按钮（备用方式）');
    } else {
      await page.mouse.click(result.x, result.y);
      console.log(`      ✅ 点击确认 (${result.x}, ${result.y})`);
    }
    return true;
  }
  
  console.log('      ⚠️ 未找到确认按钮');
  return false;
}

/**
 * 根据月份判断在哪个面板
 * @param {string} targetMonth - 目标月份，如 "3月" 或 "2026年3月"
 * @param {string[]} months - 两个面板的月份 ["3月", "4月"]
 * @returns {'left'|'right'|null}
 */
function getPanelSide(targetMonth, months) {
  if (!months || months.length < 2) return null;
  const left = months[0];
  const right = months[1];
  
  // 处理带年份的格式 "2026年3月"
  const cleanLeft = left.replace(/\d{4}年/, '');
  const cleanRight = right.replace(/\d{4}年/, '');
  const cleanTarget = targetMonth.replace(/\d{4}年/, '');
  
  if (cleanLeft === cleanTarget) return 'left';
  if (cleanRight === cleanTarget) return 'right';
  return null;
}

/** 选择日期范围（优化版） */
async function selectDateRange(page, startDate, endDate) {
  // 交易数据本月不能选当天，往前推一天
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 处理整月格式 (YYYY-MM)
  if (/^\d{4}-\d{2}$/.test(startDate)) {
    const y = parseInt(startDate.split('-')[0]);
    const m = parseInt(startDate.split('-')[1]);
    const lastDay = new Date(y, m, 0).getDate();
    startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    endDate = endDate || `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  }
  if (/^\d{4}-\d{2}$/.test(endDate)) {
    const y = parseInt(endDate.split('-')[0]);
    const m = parseInt(endDate.split('-')[1]);
    const lastDay = new Date(y, m, 0).getDate();
    endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  }
  
  // 如果结束日期是今天，往前推一天（交易数据本月不能选当天）
  if (endDate === todayStr) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    endDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    console.log('      ⚠️ 交易数据本月不能选当天，自动调整为: ' + endDate);
  }
  
  const [sY, sM, sD] = startDate.split('-').map(Number);
  const [eY, eM, eD] = endDate.split('-').map(Number);
  const sMS = sM + '月', eMS = eM + '月';
  const same = startDate === endDate;
  console.log('  📅 选择: ' + startDate + ' ~ ' + endDate + (same ? ' (同天)' : ''));

  // 检查日期范围是否超过31天（拼多多限制）
  if (!same) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) {
      console.log(`      ❌ 日期范围 ${diffDays} 天，超过拼多多限制的 31 天`);
      return false;
    }
  }

  // 1. 打开日历
  const opened = await openCalendar(page);
  if (!opened) return console.log('      ❌ 未找到自定义按钮'), false;
  console.log('      ✅ 点击自定义');
  await randomDelay(3000, 4000);

  // 2. 点击开始日期输入框，打开年份下拉框
  let inputs = await getDateInputs(page);
  if (inputs.length < 1) return console.log('      ❌ 未找到输入框'), false;
  await page.mouse.click(inputs[0].x, inputs[0].y);
  console.log('      ✅ 点击开始输入框');
  await randomDelay(1500, 2000);
  
  // 3. 选择年份（在年份下拉框中直接选择，不需要关闭）
  if (!await selectYear(page, sY)) return console.log('      ❌ 未找到年份'), false;
  console.log('      ✅ 选择 ' + sY + '年');
  await randomDelay(2000, 3000);

  // 4. 获取当前面板月份，判断开始日期在哪边
  let { months } = await getMonthPanels(page);
  console.log('      📆 当前面板月份: ' + months.join(', '));
  
  let startSide = getPanelSide(sMS, months);
  
  // 如果开始月份不在当前面板，需要切换
  if (startSide === null) {
    console.log('      🔄 开始月份 ' + sMS + ' 不在当前面板，切换...');
    // 切换左面板
    const switched = await switchToMonth(page, sMS, 'left');
    if (!switched) return console.log('      ❌ 切换月份失败'), false;
    await randomDelay(500, 1000);
    ({ months } = await getMonthPanels(page));
    startSide = getPanelSide(sMS, months);
  }
  console.log('      ✅ 开始日期在 ' + startSide + ' 侧 (' + sMS + ')');

  // 5. 点击开始日期
  const sc = await findDayCell(page, sD, startSide);
  if (!sc) return console.log('      ❌ 未找到开始日期 ' + sD + '日'), false;
  await page.mouse.click(sc.x, sc.y);
  console.log('      ✅ 点击开始 ' + sD + '日');
  await randomDelay(200, 400);

  // 6. 单日选择：再点一次同一天即可
  if (same) {
    await page.mouse.click(sc.x, sc.y);
    console.log('      ✅ 再次点击同一天');
  } else {
    // 7. 非单日：处理结束日期
    // 7.1 年份不同需要重新选年份
    if (eY !== sY) {
      console.log('      🔄 结束年份不同，重新选择...');
      await page.mouse.click(inputs[1].x, inputs[1].y);
      console.log('      ✅ 点击结束输入框');
      await randomDelay(3000, 4000);
      if (!await selectYear(page, eY)) return console.log('      ❌ 未找到年份'), false;
      console.log('      ✅ 选择 ' + eY + '年');
      await randomDelay(2000, 3000);
    }

    // 7.2 判断结束日期在哪边
    ({ months } = await getMonthPanels(page));
    let endSide = getPanelSide(eMS, months);
    
    // 如果结束月份不在当前面板，需要切换
    if (endSide === null) {
      console.log('      🔄 结束月份 ' + eMS + ' 不在当前面板，切换...');
      const switched = await switchToMonth(page, eMS, 'left');
      if (!switched) return console.log('      ❌ 切换月份失败'), false;
      await randomDelay(500, 1000);
      ({ months } = await getMonthPanels(page));
      endSide = getPanelSide(eMS, months);
    }
    console.log('      ✅ 结束日期在 ' + endSide + ' 侧 (' + eMS + ')');

    // 7.3 点击结束日期
    const ec = await findDayCell(page, eD, endSide);
    if (!ec) return console.log('      ❌ 未找到结束日期 ' + eD + '日'), false;
    await page.mouse.click(ec.x, ec.y);
    console.log('      ✅ 点击结束 ' + eD + '日');
    await randomDelay(500, 800);
  }

  // 8. 点击确认
  const confirmed = await clickConfirm(page);
  if (confirmed) console.log('      ✅ 点击确认');
  return !!confirmed;
}

/**
 * 日历选择日期（兼容 navigate.js）
 * 支持：单个日期 "2026-04-22" 或 范围日期 "2026-04-01~2026-04-22"
 */
async function selectDateWithCalendar(page, dateStr) {
  // 检查是否是范围日期
  const isRange = dateStr.includes('~') || dateStr.includes('至') || dateStr.includes('到');
  
  if (isRange) {
    // 范围日期：2026-04-01~2026-04-22
    const parts = dateStr.split(/[~至到]/);
    const start = parts[0].trim();
    const end = parts.length > 1 ? parts[1].trim() : start;
    return await selectDateRange(page, start, end);
  } else {
    // 单个日期
    return await selectDateRange(page, dateStr, dateStr);
  }
}

module.exports = { selectDateRange, selectDateWithCalendar, openCalendar, getDateInputs, getMonthPanels, switchToMonth };
