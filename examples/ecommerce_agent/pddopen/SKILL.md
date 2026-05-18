---
name: pdd-open
description: >
  拼多多商家后台多账号管理 + 销售/客服/推广数据自动提取。
  通过 Playwright CDP 连接独立 Chrome 实例，每个账号隔离 Profile + 端口，Cookie 持久化。
  自动截图 + MiniMax VLM 读取数据，写入 Excel。
  当用户提到：打开拼多多、登录拼多多商家后台、提取拼多多数据、打开XIDOO、瞳粉 等时触发。
metadata:
  builtin_skill_version: "8.1.0"
  qwenpaw:
    emoji: "🛒"
---

# pdd-open 拼多多商家后台自动化

> v8.1.0 - 模块化重构版

---

## 快速命令

```bash
# 打开店铺
pdd-open 瞳粉                    # 打开瞳粉后台

# 数据提取
pdd-open XIDOO --tian           # 提取昨日销售+推广+客服+评价
pdd-open XIDOO --sales          # 提取销售数据
pdd-open XIDOO --ads            # 提取推广数据
pdd-open XIDOO --service        # 提取客服绩效

# 评价管理
pdd-open 瞳粉 --review          # 提取评价数据
pdd-open 瞳粉 --review --reply  # 回复5星好评
pdd-open 瞳粉 --review --report # 举报1-2星差评

# 管理
pdd-open --list                 # 列出所有店铺
pdd-open --stop 瞳粉            # 停止店铺浏览器
pdd-open --stop-all             # 一键关闭所有店铺浏览器
pdd-open --health               # 健康检查
```

---

## 功能概览

| 功能 | 说明 | 默认日期 |
|------|------|---------|
| `--sales` / `--extract` | 销售数据 | **昨日** |
| `--service [YYYY-MM]` | 客服绩效 | **昨日**（指定月时为该月整月） |
| `--ads` / `--tuike` | 推广数据 | **昨日** |
| `--all` / `--tian` | 销售+推广+客服（**不含评价管理**） | **昨日** |
| `--review` | 提取评价数据 | 近30天 |
| `--review --reply` | 回复5星好评 | 近30天 |
| `--review --report` | 举报1-2星差评 | 近30天 |

---

## 命令参数详解

### 数据提取参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--date <YYYY-MM-DD>` | 指定销售日期 | **昨日** | `--date 2026-04-20` |

### 评价管理参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--reply-text <文本>` | 自定义回复内容 | **随机模板** | `--reply-text "谢谢惠顾"` |
| `--limit <N>` | 评价提取/回复/举报数量限制 | **200**（最多200条） | `--limit 50` |

### 管理参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--list` | 列出所有店铺及状态 | - | `pdd-open --list` |
| `--stop <店铺>` | 停止店铺浏览器 | - | `pdd-open --stop XIDOO` |
| `--logout [店铺]` | 退出登录 | - | `pdd-open --logout XIDOO` |
| `--add "店名" SHOPID [管理员]` | 添加新账号 | - | `--add "新店" 24` |
| `--stats [天数]` | 执行统计 | **7天** | `--stats 14` |
| `--health` | 健康检查 | - | `pdd-open --health` |
| `--batch A,B` | 批量处理 | - | `--batch XIDOO,瞳粉 --sales` |

---

## 评价管理详解

### 默认筛选条件

| 操作 | 时间范围 | 星级 | 说明 |
|------|---------|------|------|
| **回复** | 近30天 | ⭐5星 | 检查弹窗无回复才回复 |
| **举报** | 近30天 | ⭐1-2星 | 有举报按钮才举报 |
| **提取** | 近30天 | 全部 | 保存到 Excel |

### 回复逻辑

```
筛选条件：近30天 + 5星
处理逻辑：
  1. 点击"回复/互动"按钮
  2. 检查弹窗类型
     - 快捷回复弹窗 → 可回复
     - 评价互动弹窗 → 检查是否有店铺回复
  3. 无店铺回复 → 提交回复
  4. 有店铺回复 → 跳过
  5. 更新 Excel 状态
```

### 举报逻辑

```
筛选条件：近30天 + 1-2星
处理逻辑：
  1. 检查是否有举报按钮
     - 无按钮 → 已举报过，跳过
     - 有按钮 → 继续
  2. 点击举报按钮
  3. 选择举报原因（同行恶意差评）
  4. 填写举报内容
  5. 提交举报
  6. 更新 Excel 状态
```

### 跳过条件

**回复跳过**：
- 弹窗内已有店铺回复 → 跳过
- textarea 显示"暂不能回复" → 跳过
- 点击后弹窗未打开 → 跳过

**举报跳过**：
- 列表页无举报按钮 → 已举报过，跳过
- 非目标星级 → 跳过
- 提交失败 → 跳过

### 每页条数

- **自动选择最大值**（当前为 40 条）
- 设置在筛选操作**之后**，避免被重置

---

## 数据输出

| 文件 | 说明 |
|------|------|
| `data/Sales_Data.xlsx` | 销售数据（按店铺分 Sheet） |
| `data/Promotion_Data.xlsx` | 推广数据 |
| `data/CustomerPerformance_<店铺ID>.xlsx` | 客服绩效 |
| `data/review_<店铺ID>_yes.xlsx` | 5星好评（含回复状态） |
| `data/review_<店铺ID>_no.xlsx` | 1-2星差评（含举报状态） |
| `data/review_<店铺ID>.xlsx` | 全部评价汇总 |

### Excel 列结构

**review_\<shopId\>_yes.xlsx**（5星好评）：
| 列 | 说明 |
|----|------|
| 序号 | 序号 |
| 星级 | 5 |
| 订单号 | 拼多多订单号 |
| 买家昵称 | 买家昵称 |
| 商品ID | 商品ID |
| 评价内容 | 评价文字 |
| 评价时间 | 评价时间 |
| 是否已回复 | 是/否 |
| 是否已举报 | 是/否 |
| 状态 | 已回复/待回复 |

**review_\<shopId\>_no.xlsx**（1-2星差评）：
| 列 | 说明 |
|----|------|
| 序号 | 序号 |
| 星级 | 1 或 2 |
| 订单号 | 拼多多订单号 |
| 买家昵称 | 买家昵称 |
| 商品ID | 商品ID |
| 评价内容 | 差评内容 |
| 评价时间 | 评价时间 |
| 是否已回复 | 是/否 |
| 是否已举报 | 是/否 |
| 状态 | 已举报/待举报 |

---

## 店铺识别

```
XIDOO / XIDOO隐形眼镜 / 21   →  XIDOO隐形眼镜旗舰店
瞳粉 / 瞳粉美瞳 / 22          →  瞳粉美瞳专营店
JEWELRY / JEWELRY DOLL / 23  →  JEWELRY DOLL旗舰店
旗舰店                        →  匹配所有旗舰店
```

---

## 日期识别

```
昨天 / 昨日          →  自动计算 YYYY-MM-DD
上月 / 上个月         →  上月整月
本月 / 当月           →  本月至今
今天 / today          →  当日
近7天                →  最近7天
2026-04-15           →  指定日期
2026-04-15~2026-04-20 →  日期范围
```

---

## Agent 调用指南

**⚠️ 重要：调用时必须设置足够长的 timeout！**

```javascript
// 推荐 timeout 设置
execute_shell_command('node scripts/pdd-open.js "XIDOO" --tian', {
  timeout: 300  // 300秒 = 5分钟
})
```

| 任务类型 | 预计耗时 | 推荐 timeout |
|---------|---------|-------------|
| 单项数据（销售/推广/客服） | ~30秒 | 120秒 |
| 双项数据（销售+推广） | ~60秒 | 180秒 |
| 全量数据（--tian） | ~90秒 | **300秒** |
| 评价管理（100条） | ~3分钟 | 300秒 |
| 评价管理（200条） | ~5分钟 | 600秒 |
| 指定历史日期 | 可能更长 | 600秒 |

---

## 项目结构

```
pdd-open/
├── SKILL.md                     # 本文档
├── FUNCTIONS.md                 # 函数文档
├── BUGS.md                     # 踩坑记录
├── package.json
├── scripts/
│   ├── pdd-open.js             # CLI 主入口
│   ├── reply-and-report.js     # 评价脚本
│   ├── health-check.js         # 健康检查
│   └── cleanup.js               # 清理脚本
├── modules/
│   ├── _loader.js              # 模块加载器
│   ├── customer/               # 客服绩效
│   ├── extract/                # 销售数据
│   ├── review/                 # 评价管理
│   │   ├── filter.js           # 筛选
│   │   ├── navigate.js         # 导航
│   │   ├── reply.js            # 回复/举报
│   │   ├── review.js           # 提取
│   │   └── star-utils.js       # 星级工具
│   └── tuike/                  # 推广数据
├── utils/
│   ├── accounts.js             # 账号管理
│   ├── browser.js              # Chrome 启停
│   ├── calendar.js             # 日历操作
│   ├── config.js               # 配置
│   ├── excel.js                # Excel 读写
│   ├── login.js                # 扫码登录
│   ├── notify.js               # 飞书通知
│   └── vision.js               # VLM 视觉
└── data/                       # 数据输出
```

---

## 踩坑记录

详细踩坑记录和经验总结请查看 [BUGS.md](./BUGS.md)

---

## 依赖

- playwright — 浏览器控制
- xlsx — Excel 读写

*最后更新：2026-04-29*