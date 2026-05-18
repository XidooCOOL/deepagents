/**
 * stealth.js - 浏览器指纹反检测
 * 转译自 TypeScript 版本
 */

// 应用 stealth 混淆，在 context init 注入
function generateStealthJs() {
  return `
    (() => {
      const _gProto = EventTarget.prototype;
      const _gKey = '__lsn';
      if (_gProto[_gKey]) return 'skipped';
      try {
        Object.defineProperty(_gProto, _gKey, { value: true, enumerable: false, configurable: true });
      } catch {}

      // 固定UA与启动层一致
      try {
        const FIXED_UA = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', { get: () => FIXED_UA, configurable: true });
        Object.defineProperty(navigator, 'appVersion', { get: () => FIXED_UA, configurable: true });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true });
      } catch {}

      // 隐藏webdriver
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
      } catch {}

      // 补全window.chrome
      try {
        if (!window.chrome) {
          window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
        }
      } catch {}

      // 伪造插件列表
      try {
        if (!navigator.plugins || navigator.plugins.length === 0) {
          const fakePlugins = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '' }
          ];
          fakePlugins.item = i => fakePlugins[i] || null;
          fakePlugins.namedItem = n => fakePlugins.find(p => p.name === n) || null;
          fakePlugins.refresh = () => {};
          Object.defineProperty(navigator, 'plugins', { get: () => fakePlugins, configurable: true });
        }
      } catch {}

      // 语言设置
      try {
        Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'], configurable: true });
      } catch {}

      // 权限API修复
      try {
        const origQuery = window.Permissions?.prototype?.query;
        if (origQuery) {
          window.Permissions.prototype.query = function (p) {
            if (p?.name === 'notifications') return Promise.resolve({ state: Notification.permission, onchange: null });
            return origQuery.call(this, p);
          };
        }
      } catch {}

      // 清理自动化痕迹
      try {
        delete window.__playwright;
        delete window.__puppeteer;
        for (const prop of Object.getOwnPropertyNames(window)) {
          if (prop.startsWith('cdc_') || prop.startsWith('__cdc_')) {
            try { delete window[prop] } catch {}
          }
        }
      } catch {}

      // 清理错误堆栈
      try {
        const d = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');
        const patterns = ['puppeteer_evaluation_script','pptr:','debugger://','__playwright','__puppeteer'];
        if (d?.get) {
          Object.defineProperty(Error.prototype, 'stack', {
            get: function() {
              const s = d.get.call(this);
              return typeof s === 'string' 
                ? s.split('\\n').filter(l => !patterns.some(p => l.includes(p))).join('\\n')
                : s;
            },
            configurable: true
          });
        }
      } catch {}

      // 函数toString伪装
      const _origToString = Function.prototype.toString;
      const _disguised = new WeakMap();
      try {
        Object.defineProperty(Function.prototype, 'toString', {
          value: function(){ return _disguised.get(this) ?? _origToString.call(this); },
          writable: true,
          configurable: true
        });
      } catch {};
      const _disguise = (fn, name) => {
        _disguised.set(fn, 'function ' + name + '() { [native code] }');
        try { Object.defineProperty(fn, 'name', { value: name, configurable: true }) } catch {}
      };

      // 防debugger陷阱（修复正则漏检）
      try {
        const _OrigFunction = Function;
        const re = /\\bdebugger\\s*;?/g;
        const clean = s => typeof s === 'string' ? s.replace(re, '') : s;
        const F = function(...a){
          if (a.length > 0) {
            a[a.length - 1] = clean(a[a.length - 1]);
          }
          return new.target ? Reflect.construct(_OrigFunction,a,new.target) : _OrigFunction.apply(this,a);
        };
        F.prototype = _OrigFunction.prototype;
        Object.setPrototypeOf(F, _OrigFunction);
        _disguise(F, 'Function');
        if (window.Function !== F) window.Function = F;

        const _oe = window.eval;
        const pe = function(c){ return _oe.call(this, clean(c)) };
        _disguise(pe, 'eval');
        if (window.eval !== pe) window.eval = pe;
      } catch {}

      // 控制台方法伪装
      try {
        const ms = ['log','warn','error','info','debug','table','trace','dir','group','groupEnd','groupCollapsed','clear','count','assert','profile','profileEnd','time','timeEnd','timeStamp'];
        for (const m of ms) {
          if (typeof console[m] !== 'function') continue;
          const o = console[m];
          const w = function(...a){ return o.apply(console, a) };
          Object.defineProperty(w, 'length', { value: o.length ?? 0, configurable: true });
          _disguise(w, m);
          console[m] = w;
        }
      } catch {}

      // 窗口大小伪装
      try {
        const wd = window.outerWidth - window.innerWidth;
        const hd = window.outerHeight - window.innerHeight;
        if (wd>100||hd>200) {
          Object.defineProperty(window, 'outerWidth', { get: ()=>window.innerWidth, configurable:true });
          const ho = Math.max(40, Math.min(120, hd));
          Object.defineProperty(window, 'outerHeight', { get: ()=>window.innerHeight+ho, configurable:true });
        }
      } catch {}

      // 清理性能记录
      try {
        const og = Performance.prototype.getEntries;
        const ogt = Performance.prototype.getEntriesByType;
        const ogn = Performance.prototype.getEntriesByName;
        const bad = ['debugger','devtools','__puppeteer','__playwright','pptr:'];
        const f = es => Array.isArray(es) ? es.filter(e=>!bad.some(b=>(e.name??'').includes(b))) : es;
        Performance.prototype.getEntries = function(){ return f(og.call(this)) };
        Performance.prototype.getEntriesByType = function(t){ return f(ogt.call(this,t)) };
        Performance.prototype.getEntriesByName = function(n,t){ return f(ogn.call(this,n,t)) };
      } catch {}

      // 清理document特征
      try {
        for (const p of Object.getOwnPropertyNames(document)) {
          if (p.startsWith('$cdc_')||p.startsWith('$chrome_')) {
            try { delete document[p] } catch {}
          }
        }
      } catch {}

      // iframe环境同步
      try {
        const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
        if (d?.get) {
          Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get: function() {
              const w = d.get.call(this);
              if (w) try { w.chrome = w.chrome || window.chrome } catch {};
              return w;
            },
            configurable: true
          });
        }
      } catch {}

      // Canvas指纹混淆
      try {
        const o = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(x,y,w,h){
          const d = o.call(this,x,y,w,h);
          for(let i=0;i<d.data.length;i+=4) {
            d.data[i + 3] = (d.data[i + 3] + 1) % 256;
          }
          return d;
        };
        _disguise(CanvasRendering2D.prototype.getImageData, 'getImageData');
      } catch {}

      // WebGL显卡指纹伪装
      try {
        const o = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(p){
          if(p === 0x9245) return 'Google Inc.';
          if(p === 0x9246) return 'Intel(R) UHD Graphics 630 (Direct3D11)';
          return o.call(this,p);
        };
        _disguise(WebGLRenderingContext.prototype.getParameter, 'getParameter');
      } catch {}

      // 音频指纹混淆（全频段修复）
      try {
        const o = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = function(d){
          o.call(this,d);
          for (let i = 0; i < d.length; i++) {
            d[i] += (Math.random() * 2 - 1) * 0.5;
          }
        };
        _disguise(AnalyserNode.prototype.getFloatFrequencyData, 'getFloatFrequencyData');
      } catch {}

      // 屏幕分辨率伪装
      try {
        const W=1920,H=1080,AW=1920,AH=1040,CD=24,PD=24;
        const sd=(k,v)=>({get:()=>v,configurable:true});
        Object.defineProperty(screen,'width',sd('width',W));
        Object.defineProperty(screen,'height',sd('height',H));
        Object.defineProperty(screen,'availWidth',sd('availWidth',AW));
        Object.defineProperty(screen,'availHeight',sd('availHeight',AH));
        Object.defineProperty(screen,'colorDepth',sd('colorDepth',CD));
        Object.defineProperty(screen,'pixelDepth',sd('pixelDepth',PD));
      } catch {}

      // 时区伪装
      try {
        const TZ='Asia/Shanghai',OFFSET=-480;
        const o=Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions=function(){
          const r=o.call(this);r.timeZone=TZ;return r;
        };
        Date.prototype.getTimezoneOffset=()=>OFFSET;
      } catch {}

      return 'applied';
    })()
  `;
}

module.exports = { generateStealthJs };
