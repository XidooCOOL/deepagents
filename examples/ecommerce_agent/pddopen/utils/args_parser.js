// args_parser.js - 统一命令行参数解析器

const { parseNaturalDate, extractDateText, checkDateRangeLimit } = require("./date_parser");

/**
 * 统一命令行参数解析器
 */
class ArgsParser {
  constructor(args) {
    this.rawArgs = args || [];
    this.keyword = "";
    this.sales = false;
    this.service = false;
    this.ads = false;
    this.salesDate = null;
    this.serviceMonth = null;
    this.adsDate = null;
    this.force = false;
    this.isRange = false;
    this.range = null;
    this.verbose = false;
  }
  
  parse() {
    const args = this.rawArgs;
    
    // 处理命令类参数（不区分顺序）
    this.keyword = args.find(a => !a.startsWith("--")) || "";
    
    // 数据类型开关
    this.sales = this.has("--sales") || this.has("--extract");
    this.service = this.has("--service") || this.has("--customer");
    this.ads = this.has("--ads") || this.has("--tuike");
    const all = this.has("--all") || this.has("--tian");
    
    // --all / --tian 相当于开启 sales + ads + service
    if (all && !this.sales) {
      this.sales = true;
      this.ads = true;
      this.service = true;
    }
    
    // 强制刷新
    this.force = this.has("--force") || this.has("--refresh");
    this.verbose = this.has("--verbose") || this.has("-v");
    
    // 从自然语言中提取日期
    const dateText = extractDateText(args);
    if (dateText) {
      const parsed = parseNaturalDate(dateText);
      if (parsed) {
        // 如果有日期输入，但没有明确指定数据类型，默认提取销售
        if (!this.sales && !this.service && !this.ads && !all) {
          this.sales = true;
        }
        
        if (parsed.type === "single") {
          this.salesDate = parsed.start;
          this.adsDate = parsed.start;
        } else if (parsed.type === "range") {
          const limit = checkDateRangeLimit(parsed.start, parsed.end);
          if (!limit.valid) {
            throw new Error("DATE_RANGE_EXCEEDED:" + limit.message);
          }
          this.isRange = true;
          this.range = { start: parsed.start, end: parsed.end };
          this.salesDate = parsed.start;
          this.adsDate = parsed.start;
        }
      }
    }
    
    // 解析各数据类型的日期参数
    this._parseSalesDate();
    this._parseServiceMonth();
    this._parseAdsDate();
    
    return this;
  }
  
  has(flag) {
    return this.rawArgs.includes(flag);
  }
  
  /**
   * 获取带参数的选项值
   * 例如: --batch A,B  → get('--batch') = ['A,B']
   *      --add "店名" ID  → get('--add') = ['店名', 'ID']
   */
  get(flag) {
    const idx = this.rawArgs.indexOf(flag);
    if (idx >= 0) { if (this.rawArgs.length <= idx + 1 || this.rawArgs[idx + 1].startsWith("--")) { return true; }
      const next = this.rawArgs[idx + 1];
      // 如果下一个参数是选项，返回空数组
      if (next.startsWith('--')) // return [];
      // 如果是带引号的字符串，尝试解析
      if (next.startsWith('"') || next.startsWith("'")) {
        // 返回从当前位置开始的所有非选项参数
        const values = [];
        for (let i = idx + 1; i < this.rawArgs.length; i++) {
          const v = this.rawArgs[i];
          if (v.startsWith('--')) break;
          values.push(v.replace(/^["']|["']$/g, ''));
        }
        return values;
      }
      return [next];
    }
    return null;
  }
  
  getDateValue(flags) {
    for (const flag of flags) {
      const idx = this.rawArgs.indexOf(flag);
      if (idx >= 0 && this.rawArgs.length > idx + 1) {
        const val = this.rawArgs[idx + 1];
        // 支持: YYYY-MM, YYYY-MM-DD, YYYY-MM-DD~YYYY-MM-DD
        if (/^\d{4}-\d{2}(-\d{2}(~\d{4}-\d{2}(-\d{2})?)?)?$/.test(val)) {
          return val;
        }
      }
    }
    return null;
  }
  
  _parseSalesDate() {
    const explicit = this.getDateValue(["--sales", "--extract"]);
    if (explicit) {
      this.salesDate = explicit;
    } else if (this.sales && !this.salesDate) {
      this.salesDate = this._getYesterday();
    }
  }
  
  _parseServiceMonth() {
    // 支持 --date 参数（通用）或 --service 自带日期
    const explicit = this.getDateValue(["--date", "--service", "--customer"]);
    if (explicit) {
      this.serviceMonth = explicit;
    } else if (this.service && !this.serviceMonth) {
      // 客服绩效默认也取昨日
      this.serviceMonth = this._getYesterday();
    }
  }
  
  _parseAdsDate() {
    const explicit = this.getDateValue(["--ads", "--tuike"]);
    if (explicit) {
      this.adsDate = explicit;
    } else if (this.ads && !this.adsDate) {
      this.adsDate = this._getYesterday();
    }
  }
  
  _getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  
  _getLastMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  
  printHelp() {
    console.log("pdd-open - 拼多多商家后台多账号数据提取");
    console.log("");
    console.log("Usage:");
    console.log("  pdd-open <店铺名/ID> [options] [日期描述]");
    console.log("");
    console.log("Commands:");
    console.log("  --list              列出所有账号及运行状态");
    console.log("  --stop <店铺名>     停止店铺浏览器实例");
    console.log('  --add_shop "店铺名" SHOPID [管理员]  添加新账号');
    console.log("  --logout            退出当前账号登录");
    console.log("");
    console.log("Options:");
    console.log("  --sales [日期]       提取销售数据（默认昨日）");
    console.log("  --service [月份]    提取客服绩效数据（默认上月）");
    console.log("  --ads [日期]         提取推广数据（默认昨日）");
    console.log("  --all                提取销售+推广数据（默认昨日）");
    console.log("  --force              强制刷新（忽略缓存）");
    console.log("  --verbose, -v       详细输出");
    console.log("");
    console.log("Aliases:");
    console.log("  --sales  = --extract  (销售数据)");
    console.log("  --service = --customer (客服绩效)");
    console.log("  --ads    = --tuike    (推广数据)");
    console.log("  --all    = --tian      (销售+推广)");
    console.log("");
    console.log("Date Formats:");
    console.log("  单日:    2026-04-15");
    console.log("  范围:    2026-02-22~2026-04-15");
    console.log("  月份:    2026-03 / 3月份");
    console.log("  自然语言: 昨天 / 上周 / 最近7天");
    console.log("");
    console.log("Examples:");
    console.log("  pdd-open XIDOO                 打开XIDOO后台");
    console.log("  pdd-open XIDOO --all           提取XIDOO昨日销售+推广");
    console.log("  pdd-open XIDOO --sales 2026-04-15  提取指定日期销售");
    console.log("  pdd-open XIDOO --service 2026-03   提取指定月份客服");
    console.log("  pdd-open --list               列出所有账号");
  }
  
  summary() {
    const parts = [];
    if (this.sales) parts.push("销售");
    if (this.service) parts.push("客服");
    if (this.ads) parts.push("推广");
    
    let dateInfo = "";
    if (this.isRange) {
      dateInfo = this.range.start + "~" + this.range.end;
    } else {
      if (this.salesDate) dateInfo += "销售:" + this.salesDate + " ";
      if (this.serviceMonth) dateInfo += "客服:" + this.serviceMonth + " ";
      if (this.adsDate) dateInfo += "推广:" + this.adsDate;
    }
    
    return {
      shop: this.keyword,
      types: parts.join("+"),
      dateInfo: dateInfo.trim(),
      force: this.force
    };
  }
}

module.exports = { ArgsParser };