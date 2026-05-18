# pdd-open 快速使用指南

> 拼多多商家后台数据自动提取工具 v8.0.0

---

## 🚀 快速开始

### 1. 列出所有店铺
```bash
pdd-open --list
```

### 2. 打开店铺后台（仅登录）
```bash
pdd-open 瞳粉
```

### 3. 提取昨日销售+推广数据（常用）
```bash
pdd-open XIDOO --tian
```

---

## 📊 数据提取命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `--sales` 或 `--extract` | 销售数据（默认昨日） | `pdd-open XIDOO --sales` |
| `--service [YYYY-MM]` | 客服绩效（默认昨日） | `pdd-open XIDOO --service` |
| `--ads` 或 `--tuike` | 推广数据（默认昨日） | `pdd-open XIDOO --ads` |
| `--all` 或 `--tian` | 销售+推广+客服（常用） | `pdd-open XIDOO --tian` |

### 指定日期

```bash
# 自然语言日期（自动解析）
pdd-open XIDOO --tian 上月          # 上月整月
pdd-open XIDOO --tian 本月          # 本月至今
pdd-open XIDOO --tian 近7天         # 最近7天

# 指定日期
pdd-open XIDOO --sales --date 2026-04-20

# 日期范围
pdd-open XIDOO --sales 2026-04-15~2026-04-20
```

---

## 🔧 管理命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `--list` | 列出所有店铺 | `pdd-open --list` |
| `--stop <店铺>` | 停止浏览器 | `pdd-open --stop XIDOO` |
| `--logout [店铺]` | 退出登录 | `pdd-open --logout` |
| `--add "店名" SHOPID` | 添加店铺 | `pdd-open --add "新店" 123` |
| `--stats [天数]` | 查看执行统计 | `pdd-open --stats` |
| `--health` | 健康检查 | `pdd-open XIDOO --health` |
| `--batch A,B` | 批量处理 | `pdd-open --batch XIDOO,瞳粉 --sales` |

---

## 📁 数据输出

提取的数据保存在 `data/` 目录：

| 文件 | 说明 |
|------|------|
| `Sales_Data.xlsx` | 销售数据（多店铺分Sheet） |
| `Promotion_Data.xlsx` | 推广数据 |
| `CustomerPerformance_店铺ID.xlsx` | 客服绩效 |

---

## 👤 店铺匹配

店铺名支持模糊匹配：

```bash
pdd-open XIDOO       # 匹配 XIDOO隐形眼镜旗舰店
pdd-open 旗舰店      # 匹配所有旗舰店
pdd-open 瞳粉        # 匹配瞳粉美瞳专营店
```

---

## ⚠️ 注意事项

1. **首次登录**：扫码后会发送二维码到飞书
2. **超时处理**：大数据量提取可能较慢，请耐心等待
3. **Cookie 有效期**：约7天，过期需重新扫码
4. **进程管理**：用 `--stop` 停止，不要直接关浏览器

---

## 🆘 常用问题

**Q: 浏览器没响应？**
```bash
pdd-open --stop XIDOO
pdd-open XIDOO --tian
```

**Q: 提取失败？**
```bash
pdd-open XIDOO --health   # 检查状态
```

**Q: 想看完整帮助？**
```bash
pdd-open --help
```

---

*最后更新：2026-04-23*
