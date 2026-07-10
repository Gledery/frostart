/* =========================================
   core.js  —  应用骨架与全局状态
   职责：全局状态变量 / 常量 / 应用初始化 / 设置应用 /
         壁纸应用 / 字体 / 文本色 / 主题 / 时钟 / 搜索 /
         引擎弹窗 / 宽度单位 / 快捷方式 / 设置抽屉 /
         模态框 / 数据管理 / Toast
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   说明：所有模块共享全局作用域，函数互相调用，请勿改为模块隔离。
   ========================================= */
/* 可变状态集中管理：减少裸全局变量，降低重名风险（Q3）
   所有模块共享 Frostart.state.xxx 读写，替代原来的散装 let。 */
const Frostart = window.Frostart || {};
Frostart.state = {
    editingShortcutId: null,
    pendingIconStyle: null,       // 快捷方式编辑：待提交的裁切/背景
    pendingEngineIcon: '',        // 自定义引擎编辑：待提交的图标源
    pendingEngineIconStyle: null, // 自定义引擎编辑：待提交的裁切/背景
};

// 搜索引擎配置（key 与 icons/search-engine/<key>.svg 一一对应）
const SEARCH_ENGINES = {
    google:        { url: 'https://www.google.com/search?q=',          label: 'Google' },
    bing:          { url: 'https://www.bing.com/search?q=',            label: 'Bing' },
    baidu:         { url: 'https://www.baidu.com/s?wd=',               label: '百度' },
    duckduckgo:    { url: 'https://duckduckgo.com/?q=',                label: 'DuckDuckGo' },
    sougou:        { url: 'https://www.sogou.com/web?query=',          label: '搜狗' },
    yahoo:         { url: 'https://search.yahoo.com/search?p=',        label: 'Yahoo' },
    bilibili:      { url: 'https://search.bilibili.com/all?keyword=',  label: '哔哩哔哩' },
    youtube:       { url: 'https://www.youtube.com/results?search_query=', label: 'YouTube' },
    zhihu:         { url: 'https://www.zhihu.com/search?q=',           label: '知乎' },
    weibo:         { url: 'https://s.weibo.com/weibo?q=',              label: '微博' },
    douban:        { url: 'https://www.douban.com/search?q=',          label: '豆瓣' },
    xiaohongshu:   { url: 'https://www.xiaohongshu.com/search_result?keyword=', label: '小红书' },
    douyin:        { url: 'https://www.douyin.com/search/',            label: '抖音' },
    toutiao:       { url: 'https://so.toutiao.com/search?keyword=',    label: '今日头条' },
    taobao:        { url: 'https://s.taobao.com/search?q=',            label: '淘宝' },
    jd:            { url: 'https://search.jd.com/Search?keyword=',     label: '京东' },
    github:        { url: 'https://github.com/search?q=',              label: 'GitHub' },
    googlescholar: { url: 'https://scholar.google.com/scholar?q=',     label: 'Google 学术' }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 同步从 localStorage 读取缓存的设置，抢先应用 CSS 变量（消除首屏闪烁）
    const cached = SettingsManager.loadSync();
    if (cached) {
        applyTheme(cached.theme);
        const root = document.documentElement;
        root.style.setProperty('--blur-amount', `${cached.blur}px`);
        root.style.setProperty('--saturation-amount', `${cached.saturation}%`);
        root.style.setProperty('--icon-size', `${cached.iconSize}px`);
        root.style.setProperty('--border-radius', `${cached.borderRadius}px`);
        root.style.setProperty('--shortcut-gap', `${cached.shortcutGap}px`);
        root.style.setProperty('--shortcut-name-size', cached.shortcutNameSize === 0 ? '0px' : `${cached.shortcutNameSize}px`);
        root.style.setProperty('--clock-size', `${cached.clockSize}px`);
        root.style.setProperty('--search-width', `${cached.searchWidth}px`);
        root.style.setProperty('--search-height', `${cached.searchHeight}px`);
        root.style.setProperty('--content-position', cached.contentPosition);
        document.body.classList.toggle('hide-shortcut-names', cached.shortcutNameSize === 0);
    }
    // 2. 异步从 chrome.storage 读取权威设置，完整初始化
    await SettingsManager.load();
    initializeApp();
});

function initializeApp() {
    initFaviconFallback();
    bindThemeButtons();        // 绑定主题按钮事件（只一次）
    applyTheme(SettingsManager.get('theme'));  // 先确定主题，applyTextColors 依赖 data-theme 解析默认色
    syncThemeUI();             // 同步主题按钮选中态
    // 首屏：临时禁用壁纸过渡，避免从 initial-value 到用户保存值出现一次 0.8s 颜色过渡闪动；
    // 下一帧移除，恢复正常过渡行为。
    document.body.classList.add('wp-instant');
    applySettings();
    requestAnimationFrame(() => {
        document.body.classList.remove('wp-instant');
    });
    initAccentPicker();
    initKaomojiToggle();
    initTime();
    initTimeFormat();
    initSearch();
    initKeyboardShortcuts();
    initShortcuts();
    initSettingsDrawer();
    initTabs();
    initModal();
    initDataManagement();
    initStorageIndicator();
    initSliders();
    initWallpaperSettings();
    // 必应每日壁纸：开屏按天检查并静默更新（已有当天缓存则直接复用）
    if (SettingsManager.get('wallpaperMode') === 'bing') {
        refreshBingWallpaper();
    }
    initSearchEngine();
    initFontSetting();
    initClockFont();
    initSwitches();
    initTextColors();
    initContextMenu();
    initDragSort();
    initCustomEngines();
    initEnginePopup();
    initIconEditor();
    initWidthUnitToggle();
    initSettingsSearch();
    initPackager();
    initUpdateCheck();
}

/* =========================================
   应用设置到 DOM
   ========================================= */
function applySettings() {
    const settings = SettingsManager.getAll();
    const root = document.documentElement;

    // 自定义主题色（空值=移除覆盖，回归主题默认 accent）
    applyAccentColor(settings.accentColor);

    root.style.setProperty('--blur-amount', `${settings.blur}px`);
    root.style.setProperty('--saturation-amount', `${settings.saturation}%`);
    root.style.setProperty('--icon-size', `${settings.iconSize}px`);
    root.style.setProperty('--border-radius', `${settings.borderRadius}px`);
    root.style.setProperty('--shortcut-gap', `${settings.shortcutGap}px`);
    root.style.setProperty('--shortcut-name-size', settings.shortcutNameSize === 0 ? '0px' : `${settings.shortcutNameSize}px`);
    document.body.classList.toggle('hide-shortcut-names', settings.shortcutNameSize === 0);
    root.style.setProperty('--clock-size', `${settings.clockSize}px`);
    root.style.setProperty('--search-width', `${settings.searchWidth}px`);
    root.style.setProperty('--search-height', `${settings.searchHeight}px`);
    applySearchRadiusValue(settings.searchRadius >= 9999 ? SEARCH_RADIUS_MAX : settings.searchRadius);
    root.style.setProperty('--content-position', settings.contentPosition);
    const maxWidthValue = settings.iconMaxWidthUnit === '%' ? `${settings.iconMaxWidth}%` : `${settings.iconMaxWidth}px`;
    root.style.setProperty('--icon-max-width', maxWidthValue);
    // 同步宽度单位切换按钮 + 滑块范围（导入/重置后单位可能变化）
    syncWidthUnitUI(settings.iconMaxWidthUnit);

    // 图标背景透明度自定义（-1 = 默认高不透明度，确保可见）
    applyIconBgOpacity(settings.iconBgOpacity);

    // 图标模糊自定义（-1 = 跟随主模糊）
    if (settings.iconBlur >= 0) {
        root.style.setProperty('--icon-blur-amount', `${settings.iconBlur}px`);
    } else {
        root.style.removeProperty('--icon-blur-amount');
    }

    applyWallpaper(settings);
    applyFont(settings.customFont);
    applyClockFont(settings.clockFont);
    applyTextColors(settings);
    updateSliderValues();
    updateWallpaperUI(settings);
    renderSearchEngineGrid();
    updateSearchEngineUI(settings.searchEngine);
    updateSearchEngineIndicator();
    updateSwitchUI(settings);
    updateTimeFormatUI(settings.timeFormat);
    updateFontPresets(settings.customFont);
    updateClockFontPresets(settings.clockFont);
}

/* =========================================
   壁纸渲染
   ========================================= */
// blob alpha 值缓存：仅在主题切换时变化，避免 applyWallpaper 每次都触发 getComputedStyle 强制回流
let _blobAlphaCache = null;
function getBlobAlphas() {
    if (_blobAlphaCache) return _blobAlphaCache;
    const cs = getComputedStyle(document.documentElement);
    _blobAlphaCache = {
        strong: parseFloat(cs.getPropertyValue('--blob-alpha-strong')) || 0.5,
        soft: parseFloat(cs.getPropertyValue('--blob-alpha-soft')) || 0.38,
    };
    return _blobAlphaCache;
}

function applyWallpaper(settings) {
    document.body.dataset.wallpaper = settings.wallpaperMode;

    const imageLayer = document.querySelector('.wallpaper-image');

    // 图片层：仅在 image/bing 模式下设置背景图。
    // 切到 gradient/solid 时不清空背景图——靠 opacity:0 隐藏即可，
    // 这样从图片模式切回时图片能随 opacity 平滑淡出，而不是被瞬切清空。
    // 仅当处于 image/bing 模式却没有对应图片（无效态/用户点清除）时才显式清空。
    if (imageLayer) {
        if (settings.wallpaperMode === 'image' && settings.wallpaperImage) {
            imageLayer.style.backgroundImage = `url("${settings.wallpaperImage}")`;
        } else if (settings.wallpaperMode === 'bing' && settings.bingWallpaperUrl) {
            imageLayer.style.backgroundImage = `url("${settings.bingWallpaperUrl}")`;
        } else if (settings.wallpaperMode === 'image' || settings.wallpaperMode === 'bing') {
            imageLayer.style.backgroundImage = '';
        }
    }

    // 纯色壁纸（写入类型化变量 --wp-solid，便于平滑过渡）
    document.documentElement.style.setProperty('--wp-solid', settings.wallpaperColor);

    // 自定义渐变（写入类型化颜色/角度分量，由 CSS 组装为 linear-gradient，使颜色/角度变化可平滑过渡）
    const c1 = settings.gradientColor1 || '#e8eef7';
    const c2 = settings.gradientColor2 || '#dde6f5';
    const angle = settings.gradientAngle || 135;
    const root = document.documentElement;
    root.style.setProperty('--wp-c1', c1);
    root.style.setProperty('--wp-c2', c2);
    root.style.setProperty('--wp-angle', `${angle}deg`);

    // 光斑颜色：用户自定义优先；否则跟随壁纸派生（提取背景色相，提升饱和度，
    // 让光斑在低饱和背景下依然可见，对齐 PhasWer 风格）。
    // 输出完整的 rgba 字符串（而非 RGB 三元组），避免 rgba() 内嵌套含逗号的 CSS 变量导致解析不一致。
    const solid = settings.wallpaperColor || c1;
    const customBlob1 = settings.blobColor1;
    const customBlob2 = settings.blobColor2;
    const blob1Rgb = customBlob1 ? hexToRgbTriplet(customBlob1)
        : (settings.wallpaperMode === 'solid' ? hexToBlobRgb(solid, 0) : hexToBlobRgb(c1, 0));
    const blob2Rgb = customBlob2 ? hexToRgbTriplet(customBlob2)
        : (settings.wallpaperMode === 'solid' ? hexToBlobRgb(solid, 40) : hexToBlobRgb(c2, 0));
    // 缓存 blob alpha 值，避免每次 applyWallpaper 都 getComputedStyle 触发强制回流。
    // alpha 值仅在主题切换时变化，由 applyTheme() 清除缓存。
    const alphas = getBlobAlphas();
    const alphaStrong = alphas.strong;
    const alphaSoft = alphas.soft;
    const blobC1Strong = `rgba(${blob1Rgb}, ${alphaStrong})`;
    const blobC1Soft = `rgba(${blob1Rgb}, ${alphaSoft})`;
    const blobC2Strong = `rgba(${blob2Rgb}, ${alphaStrong})`;
    const blobC2Soft = `rgba(${blob2Rgb}, ${alphaSoft})`;
    root.style.setProperty('--blob-c1-strong', blobC1Strong);
    root.style.setProperty('--blob-c1-soft', blobC1Soft);
    root.style.setProperty('--blob-c2-strong', blobC2Strong);
    root.style.setProperty('--blob-c2-soft', blobC2Soft);

    // 图片壁纸遮罩透明度
    const maskOpacity = settings.wallpaperMask / 100;
    document.documentElement.style.setProperty('--wallpaper-mask-opacity', maskOpacity);

    // 图片壁纸模糊度
    const imageBlur = settings.wallpaperBlur || 0;
    document.documentElement.style.setProperty('--wallpaper-image-blur', `${imageBlur}px`);

    // 写入首屏壁纸缓存，供 newtab.html 内联脚本在主 JS 加载前同步应用，消除首屏闪烁
    writeWallpaperCache({
        mode: settings.wallpaperMode,
        wpSolid: settings.wallpaperColor || '',
        wpC1: c1,
        wpC2: c2,
        wpAngle: `${angle}deg`,
        blobC1Strong, blobC1Soft, blobC2Strong, blobC2Soft,
        maskOpacity,
        imageBlur,
        image: (settings.wallpaperMode === 'image' && settings.wallpaperImage)
            ? settings.wallpaperImage
            : (settings.wallpaperMode === 'bing' && settings.bingWallpaperUrl ? settings.bingWallpaperUrl : '')
    });
}

/* 首屏壁纸缓存：把 applyWallpaper 已计算的全部 CSS 变量序列化到 localStorage，
   供 newtab.html 顶部内联脚本在主 JS 加载前同步读取并应用，避免首屏从默认壁纸闪到自定义壁纸。
   图片数据可能很大，若触发配额错误则去掉 image 字段重试。 */
function writeWallpaperCache(cache) {
    const KEY = 'frostartWpCache';
    const dump = (obj) => localStorage.setItem(KEY, JSON.stringify(obj));
    try {
        dump(cache);
    } catch (e) {
        try {
            dump({ ...cache, image: '' });
        } catch (e2) { /* 放弃缓存，首屏回退到默认值 */ }
    }
}

/* =========================================
   必应每日壁纸
   直连 Bing 官方接口（HPImageArchive），需在 manifest 中声明 host_permissions。
   按天缓存：当天已拉取则复用 URL，跨天或手动刷新时重新请求。
   拉取失败保留上一次缓存，保证离线/异常下仍有壁纸。
   ========================================= */
const BING_WALLPAPER_API = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';

function getTodayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function refreshBingWallpaper(force) {
    const today = getTodayDateStr();
    const current = SettingsManager.getAll();
    // 当天且已有缓存：无需请求
    if (!force && current.bingWallpaperDate === today && current.bingWallpaperUrl) return;

    try {
        const res = await fetch(BING_WALLPAPER_API, { cache: 'no-store' });
        if (!res.ok) throw new Error('Bing API HTTP ' + res.status);
        const data = await res.json();
        const img = data && data.images && data.images[0];
        if (!img || !img.url) throw new Error('Bing API 未返回图片');
        const url = 'https://www.bing.com' + img.url;

        SettingsManager.set('bingWallpaperUrl', url);
        SettingsManager.set('bingWallpaperDate', today);
        SettingsManager.set('bingWallpaperTitle', img.title || '');
        SettingsManager.set('bingWallpaperCopyright', img.copyright || '');

        // 仅在当前仍为必应模式时实时应用，避免覆盖用户已切换到的其它模式
        if (SettingsManager.get('wallpaperMode') === 'bing') {
            applyWallpaper(SettingsManager.getAll());
        }
        if (typeof updateBingWallpaperInfo === 'function') updateBingWallpaperInfo();
        if (force) showToast('必应壁纸已更新~');
    } catch (e) {
        if (!current.bingWallpaperUrl) {
            showToast('必应壁纸加载失败，请检查网络', 'error');
        } else if (force) {
            showToast('刷新失败，仍显示上次的壁纸', 'error');
        }
    }
}

/* 光斑专用派生：从背景色提取色相，统一提升到中等饱和度/中高明度，
   保证低饱和（接近灰/白）的背景也能浮现与背景同色系的可见光斑（对齐 PhasWer 风格）。
   hueShift 为色相偏移度数，用于让第二个光斑（c2）与第一个拉开差异。 */
function hexToBlobRgb(hex, hueShift = 0) {
    const { h, s, l } = hexToHsl(hex);

    // 低饱和度/高亮度的背景（灰白）→ 用一个有辨识度的默认蓝紫色调
    // 中高饱和背景 → 保留其色相并提升饱和度
    let outH = (h + hueShift + 360) % 360;
    let outS, outL;

    if (s < 8 || l > 92) {
        // 几乎是纯灰/纯白：用 PhasWer 默认蓝紫光斑色相
        outH = (hueShift === 0 ? 215 : 265);
        outS = 70;
        outL = 62;
    } else {
        // 提升饱和度与明度，让光斑透出来
        outS = Math.min(85, Math.max(45, s + 30));
        outL = Math.min(66, Math.max(50, l + 10));
    }

    return hslToRgbTriplet(outH, outS, outL);
}

/* 把 #hex 颜色直接转为 "R,G,B" 三元组字符串，供 rgba(var(--blob-c1), alpha) 使用。
   用于用户自定义光斑色场景：直接使用用户选定的颜色，不做派生。 */
function hexToRgbTriplet(hex) {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (isNaN(num) || h.length !== 6) return '91, 110, 225';
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
}

function hexToHsl(hex) {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    if (isNaN(num) || h.length !== 6) return { h: 215, s: 70, l: 62 };
    let r = ((num >> 16) & 255) / 255;
    let g = ((num >> 8) & 255) / 255;
    let b = (num & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue = 0, sat = 0;
    const light = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
        sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: hue = ((b - r) / d + 2); break;
            case b: hue = ((r - g) / d + 4); break;
        }
        hue *= 60;
    }
    return { h: hue, s: sat * 100, l: light * 100 };
}

function hslToRgbTriplet(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return `${r}, ${g}, ${b}`;
}

/* =========================================
   字体加载（真正生效）
   ========================================= */
function applyFont(fontName) {
    const root = document.documentElement;
    if (!fontName || !fontName.trim()) {
        root.style.removeProperty('--custom-font');
        removeFontLink();
        return;
    }

    root.style.setProperty('--custom-font', fontName);

    // 尝试从 Google Fonts 加载（仅当字体名不是系统字体时）
    const systemFonts = ['HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
        'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'Arial', 'sans-serif',
        'Helvetica', 'Helvetica Neue'];
    const isSystem = systemFonts.some(sf => fontName.toLowerCase().includes(sf.toLowerCase()));

    if (!isSystem) {
        loadGoogleFont(fontName);
    } else {
        removeFontLink();
    }
}

function loadGoogleFont(fontName) {
    removeFontLink();
    const family = fontName.split(',')[0].trim().replace(/\s+/g, '+');
    const link = document.createElement('link');
    link.id = 'custom-font-link';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
}

function removeFontLink() {
    const existing = document.getElementById('custom-font-link');
    if (existing) existing.remove();
}

/* =========================================
   自定义文本颜色（细化控制）
   ========================================= */
function applyTextColors(settings) {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

    // 各主题下"未自定义"时的默认色
    // 时钟/日期/快捷名称默认白色（浮于壁纸/毛玻璃上更清晰）；
    // 搜索文字/占位符/设置图标保持各自主题的深浅色（搜索框内是浅色玻璃背景）。
    const WHITE = '#ffffff';
    const defaults = theme === 'dark'
        ? { clock: WHITE, date: 'rgba(255,255,255,0.78)', shortcutName: 'rgba(255,255,255,0.78)', searchText: '#f0f0f8', searchPlaceholder: '#888898', settingsIcon: '#f0f0f8' }
        : { clock: WHITE, date: 'rgba(255,255,255,0.82)', shortcutName: 'rgba(255,255,255,0.82)', searchText: '#1a1a2a', searchPlaceholder: '#6a6a7a', settingsIcon: '#1a1a2a' };

    // 解析顺序：单独覆盖 > 全局文本色 > 主题默认色
    const global = settings.globalTextColor || '';
    const resolve = (specific, def) => specific || global || def;

    const map = [
        { key: 'clockColor', cssVar: '--clock-color', value: resolve(settings.clockColor, defaults.clock) },
        { key: 'dateColor', cssVar: '--date-color', value: resolve(settings.dateColor, defaults.date) },
        { key: 'shortcutNameColor', cssVar: '--shortcut-name-color', value: resolve(settings.shortcutNameColor, defaults.shortcutName) },
        { key: 'searchTextColor', cssVar: '--search-text-color', value: resolve(settings.searchTextColor, defaults.searchText) },
        { key: 'searchPlaceholderColor', cssVar: '--search-placeholder-color', value: resolve(settings.searchPlaceholderColor, defaults.searchPlaceholder) },
        { key: 'settingsIconColor', cssVar: '--settings-icon-color', value: resolve('', defaults.settingsIcon) }
    ];
    map.forEach(({ cssVar, value }) => {
        root.style.setProperty(cssVar, value);
    });

    // 保留 --global-text-color 给可能的外部引用，但不再依赖它做级联解析
    if (global) {
        root.style.setProperty('--global-text-color', global);
    } else {
        root.style.removeProperty('--global-text-color');
    }
}

/* =========================================
   主题
   ========================================= */
/* 绑定主题按钮事件（只应在初始化时调一次，避免重复绑定） */
function bindThemeButtons() {
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-theme-option]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SettingsManager.set('theme', btn.dataset.themeOption);
            applyTheme(btn.dataset.themeOption);
        });
    });
}

/* 同步主题按钮选中态（可重复调，用于初始化 / 导入 / 重置后） */
function syncThemeUI() {
    const theme = SettingsManager.get('theme');
    document.querySelectorAll('[data-theme-option]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeOption === theme);
    });
}

function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    // 主题切换后 blob alpha 值变化，清除缓存以重新读取
    _blobAlphaCache = null;
    // 主题切换后图标背景基色 RGB 变化，需重新应用
    applyIconBgOpacity(SettingsManager.get('iconBgOpacity'));
    // 文本默认色随主题变化，需重新解析（单独/全局覆盖的优先级在函数内保留）
    applyTextColors(SettingsManager.getAll());
}

/* 自定义主题色：非空时覆盖 --accent-color，空值则移除覆盖回归主题默认 */
function applyAccentColor(color) {
    const root = document.documentElement;
    if (color && typeof color === 'string') {
        root.style.setProperty('--accent-color', color);
    } else {
        root.style.removeProperty('--accent-color');
    }
}

/* 主题色选择器：预设色板 + 自定义拾色器 + 恢复默认 */
function initAccentPicker() {
    const picker = document.getElementById('accent-picker');
    if (!picker) return;
    const swatches = picker.querySelectorAll('.accent-swatch');
    const customInput = document.getElementById('accent-color-input');
    const customLabel = picker.querySelector('.accent-custom');
    const resetBtn = document.getElementById('accent-reset-btn');

    // 同步选中态：哪个控件对应当前 accentColor
    function syncActiveState(color) {
        const current = (color || '').toLowerCase();
        swatches.forEach(sw => {
            sw.classList.toggle('active', sw.dataset.color.toLowerCase() === current);
        });
        // 自定义激活：当前色不在预设里，且非空
        const isPreset = Array.from(swatches).some(sw => sw.dataset.color.toLowerCase() === current);
        customLabel.classList.toggle('active', !!current && !isPreset);
        resetBtn.classList.toggle('active', !current);
        if (current) customInput.value = current;
    }

    // 设置并保存
    function setAccent(color) {
        SettingsManager.set('accentColor', color);
        applyAccentColor(color);
        syncActiveState(color);
    }

    swatches.forEach(sw => {
        sw.addEventListener('click', () => setAccent(sw.dataset.color));
    });

    customInput.addEventListener('input', (e) => setAccent(e.target.value));

    resetBtn.addEventListener('click', () => setAccent(''));

    // 初始化选中态
    syncActiveState(SettingsManager.get('accentColor'));
}

/* 角落颜文字开关：读取设置决定 init/destroy，并绑定开关实时响应 */
function initKaomojiToggle() {
    const toggle = document.getElementById('kaomoji-toggle');
    if (!toggle || !window.KaomojiWidget) return;

    // 应用当前设置到组件
    function applyKaomojiState(enabled) {
        if (enabled) {
            if (!window.KaomojiWidget.isActive()) window.KaomojiWidget.init();
        } else {
            if (window.KaomojiWidget.isActive()) window.KaomojiWidget.destroy();
        }
    }

    // 初始态
    toggle.checked = SettingsManager.get('kaomoji') !== false;
    applyKaomojiState(toggle.checked);

    // 开关变化时实时响应
    toggle.addEventListener('change', () => {
        SettingsManager.set('kaomoji', toggle.checked);
        applyKaomojiState(toggle.checked);
    });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (SettingsManager.get('theme') === 'auto') {
        applyTheme('auto');
    }
});

/* =========================================
   时间
   ========================================= */
function initTime() {
    updateTime();
    let timer = setInterval(updateTime, 1000);
    // 标签页隐藏时暂停时钟（省电 + 避免无谓 DOM 写入），恢复时立即对齐一次
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(timer);
        } else {
            updateTime();
            timer = setInterval(updateTime, 1000);
        }
    });
}

// 缓存时钟/日期 DOM 引用，避免每秒 getElementById
let _timeEl = null;
let _dateEl = null;
// 日期字符串缓存：日期每天只变一次，避免每秒重复创建 Intl 格式化器
let _lastDateKey = '';
let _cachedDateStr = '';

function updateTime() {
    const now = new Date();
    if (!_timeEl) _timeEl = document.getElementById('time');
    if (!_dateEl) _dateEl = document.getElementById('date');

    const format = SettingsManager.get('timeFormat') || 24;
    const showSeconds = SettingsManager.get('showSeconds') || false;

    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    let suffix = '';

    if (format === 12) {
        suffix = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12 || 12;
    }

    const hh = String(hours).padStart(2, '0');
    let timeStr = `${hh}:${minutes}`;
    if (showSeconds) timeStr += `:${seconds}`;
    timeStr += suffix;

    _timeEl.textContent = timeStr;

    // 日期每天只变一次，将其纳入缓存 key（含 showWeek/showLunar 设置项），
    // 避免每秒重复调用 toLocaleDateString / getLunarDate（创建 Intl 格式化器开销大）
    const showWeek = SettingsManager.get('showWeek') !== false;
    const showLunar = SettingsManager.get('showLunar') || false;
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${showWeek}-${showLunar}`;
    if (dateKey !== _lastDateKey) {
        _lastDateKey = dateKey;
        let dateStr = showWeek
            ? now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        if (showLunar) {
            const lunar = getLunarDate(now);
            if (lunar) dateStr += ` · ${lunar}`;
        }
        _cachedDateStr = dateStr;
    }
    _dateEl.textContent = _cachedDateStr;
}

/* 农历日期（标准写法）：使用 Intl 中文农历日历提取结构化数据后查表转中文，
   规避各浏览器 Intl 输出格式不一致的问题。
   输出形如：正月初一 / 五月十五 / 闰六月初八 */
const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '腊月'];
const LUNAR_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

// 缓存农历格式化器，避免每次调用都 new Intl.DateTimeFormat（构造开销大）
let _lunarFmt = null;
function getLunarDate(date) {
    try {
        if (!_lunarFmt) {
            _lunarFmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                month: 'numeric',
                day: 'numeric'
            });
        }
        const parts = _lunarFmt.formatToParts(date);
        let monthNum = 0, dayNum = 0, isLeap = false;
        for (const p of parts) {
            if (p.type === 'month') {
                // 闰月在 Intl 里通常表现为带前缀（如 "6" 或 "leap6"），清洗取数值
                const raw = p.value;
                const m = raw.match(/(\d+)/);
                if (m) monthNum = parseInt(m[1], 10);
                isLeap = /闰|leap/i.test(raw);
            } else if (p.type === 'day') {
                const m = p.value.match(/(\d+)/);
                if (m) dayNum = parseInt(m[1], 10);
            }
        }
        if (!monthNum || !dayNum) return null;

        const monthName = LUNAR_MONTH_NAMES[monthNum - 1] || `${monthNum}月`;
        const dayName = LUNAR_DAY_NAMES[dayNum - 1] || `${dayNum}日`;
        // 闰月标准写法：前缀"闰"，如"闰六月初八"
        return (isLeap ? '闰' : '') + monthName + dayName;
    } catch (e) {
        return null;
    }
}

/* =========================================
   时间格式设置
   ========================================= */
function initTimeFormat() {
    document.querySelectorAll('[data-time-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            const fmt = parseInt(btn.dataset.timeFormat);
            document.querySelectorAll('[data-time-format]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            SettingsManager.set('timeFormat', fmt);
            updateTime();
        });
    });
}

function updateTimeFormatUI(format) {
    document.querySelectorAll('[data-time-format]').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.timeFormat) === format);
    });
}

/* =========================================
   搜索
   ========================================= */
function initSearch() {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const engine = SettingsManager.get('searchEngine') || 'google';
            const config = getEngineConfig(engine);
            const query = encodeURIComponent(searchInput.value.trim());
            const targetUrl = config.url + query;

            if (SettingsManager.get('searchInNewTab')) {
                window.open(targetUrl, '_blank', 'noopener');
            } else {
                window.location.href = targetUrl;
            }
        }
    });

    updateSearchEngineIndicator();
}

function updateSearchEngineIndicator() {
    const engine = SettingsManager.get('searchEngine') || 'google';
    const indicator = document.getElementById('search-engine-indicator');
    if (!indicator) return;

    const config = getEngineConfig(engine);
    indicator.innerHTML = renderEngineIconHtml(engine, 28, config.label);
    indicator.title = config.label;
}

function getEngineIconFile(engine) {
    // 内置引擎全部使用同名 SVG；找不到时回退到 google
    if (SEARCH_ENGINES[engine]) return `${engine}.svg`;
    return 'google.svg';
}

/* 取得自定义引擎对象（按 id）；不存在返回 null */
function getCustomEngine(engineKey) {
    return (SettingsManager.get('customEngines') || []).find(e => e.id === engineKey) || null;
}

/* 渲染引擎图标 HTML（内置走 svg 文件，自定义引擎有 icon 则用上传图标+裁切 transform，
   否则回退首字母）。size 为正方形像素。 */
function renderEngineIconHtml(engineKey, size, fallbackText) {
    const custom = getCustomEngine(engineKey);
    if (custom && custom.icon) {
        const tf = iconStyleToTransform(custom.iconStyle);
        return `<img src="${escapeHtml(custom.icon)}" alt="${escapeHtml(custom.name || '')}" style="width:${size}px;height:${size}px;object-fit:contain;${tf ? tf : ''}">`;
    }
    if (custom) {
        const ch = (custom.name || '?').charAt(0).toUpperCase();
        return `<span style="font-size:${Math.round(size * 0.5)}px;font-weight:600;color:var(--text-primary);">${escapeHtml(ch)}</span>`;
    }
    const label = SEARCH_ENGINES[engineKey] ? SEARCH_ENGINES[engineKey].label : (fallbackText || engineKey);
    return `<img src="icons/search-engine/${getEngineIconFile(engineKey)}" alt="${escapeHtml(label)}" style="width:${size}px;height:${size}px;object-fit:contain;">`;
}

function initEnginePopup() {
    const indicator = document.getElementById('search-engine-indicator');
    const popup = document.getElementById('engine-popup');
    if (!indicator || !popup) return;

    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        // 关闭快捷切换功能时不弹出列表
        if (!SettingsManager.get('engineQuickSwitch')) return;
        renderEnginePopup();
        popup.classList.toggle('show');
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-engine-indicator') && !e.target.closest('.engine-popup')) {
            popup.classList.remove('show');
        }
    });
}

/* 获取已加入快捷切换的引擎列表（key 顺序保持 pinned 顺序） */
function getPinnedEngines() {
    const pinned = SettingsManager.get('pinnedEngines') || [];
    const custom = SettingsManager.get('customEngines') || [];
    const customIds = new Set(custom.map(e => e.id));
    // 过滤掉已删除的自定义引擎
    return pinned.filter(key => SEARCH_ENGINES[key] || customIds.has(key));
}

/* 切换某个引擎是否加入快捷切换列表 */
function toggleEnginePinned(key) {
    let pinned = getPinnedEngines();
    if (pinned.includes(key)) {
        pinned = pinned.filter(k => k !== key);
    } else {
        pinned.push(key);
    }
    SettingsManager.set('pinnedEngines', pinned);
}

function renderEnginePopup() {
    const popup = document.getElementById('engine-popup');
    if (!popup) return;
    const current = SettingsManager.get('searchEngine') || 'google';

    // 只渲染已加入快捷切换的引擎（当前默认引擎始终保留，避免无法选中）
    const pinnedKeys = getPinnedEngines();
    const currentEngine = SettingsManager.get('searchEngine') || 'google';
    const visibleKeys = pinnedKeys.includes(currentEngine) || !currentEngine
        ? pinnedKeys
        : [...pinnedKeys, currentEngine];
    const customList = SettingsManager.get('customEngines') || [];
    const engines = visibleKeys.map(key => {
        const builtIn = SEARCH_ENGINES[key];
        if (builtIn) return { key, label: builtIn.label, custom: false };
        const c = customList.find(e => e.id === key);
        return { key, label: c ? c.name : key, custom: true };
    });

    if (engines.length === 0) {
        popup.innerHTML = `<div class="engine-popup-empty">未选择引擎<br><span>在设置 → 搜索中添加</span></div>`;
        return;
    }

    popup.innerHTML = engines.map(en => {
        const iconHtml = en.custom
            ? renderEngineIconHtml(en.key, 24, en.label)
            : `<img src="icons/search-engine/${getEngineIconFile(en.key)}" alt="${escapeHtml(en.label)}" style="width:24px;height:24px;object-fit:contain;border-radius:6px;">`;
        // label 可能来自导入的自定义引擎名，转义防止 title/alt 属性被 " 断开注入
        return `<div class="engine-popup-item${en.key === current ? ' active' : ''}" data-engine="${en.key}" title="${escapeHtml(en.label)}">${iconHtml}</div>`;
    }).join('');

    popup.querySelectorAll('.engine-popup-item').forEach(item => {
        item.addEventListener('click', () => {
            const key = item.dataset.engine;
            SettingsManager.set('searchEngine', key);
            updateSearchEngineUI(key);
            updateSearchEngineIndicator();
            popup.classList.remove('show');
        });
    });
}

function initWidthUnitToggle() {
    // 初始化按钮状态与滑块范围
    syncWidthUnitUI(SettingsManager.get('iconMaxWidthUnit'));

    document.querySelectorAll('[data-width-unit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const unit = btn.dataset.widthUnit;
            SettingsManager.set('iconMaxWidthUnit', unit);

            syncWidthUnitUI(unit);
            handleIconMaxWidthChange(
                parseInt(document.getElementById('icon-max-width-slider').value),
                document.getElementById('icon-max-width-value')
            );
        });
    });
}

/* 同步宽度单位切换按钮的 active 状态与滑块 min/max/value（初始化/导入/重置后通用） */
function syncWidthUnitUI(unit) {
    unit = unit || 'px';
    document.querySelectorAll('[data-width-unit]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.widthUnit === unit);
    });
    updateWidthSliderRange(unit);
}

function updateWidthSliderRange(unit) {
    const slider = document.getElementById('icon-max-width-slider');
    if (!slider) return;
    const currentValue = SettingsManager.get('iconMaxWidth') || 960;
    if (unit === '%') {
        slider.min = 30;
        slider.max = 100;
        slider.value = Math.min(Math.max(currentValue, 30), 100);
    } else {
        slider.min = 200;
        slider.max = 1920;
        slider.value = Math.min(Math.max(currentValue, 200), 1920);
    }
}

function getEngineConfig(engineKey) {
    const builtIn = SEARCH_ENGINES[engineKey];
    if (builtIn) return builtIn;
    const custom = (SettingsManager.get('customEngines') || []).find(e => e.id === engineKey);
    if (custom) {
        // 运行时防御：仅信任 http/https，避免恶意配置（导入/旧数据）注入 javascript:/data: 触发 XSS
        const probe = (custom.url || '').replace('%s', 'x');
        if (/^https?:\/\//i.test(probe)) {
            return { url: custom.url, label: custom.name };
        }
    }
    return SEARCH_ENGINES.google;
}

/* =========================================
   快捷方式
   ========================================= */
function initShortcuts() {
    renderShortcuts();
    renderShortcutsList();
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts-container');
    const shortcuts = SettingsManager.get('shortcuts') || [];

    // 入场动画只在首次渲染时播放，后续重渲染（编辑/删除/排序）不再重播
    const isFirstRender = !container.dataset.entered;
    container.innerHTML = shortcuts.map((shortcut, index) => `
        <div class="shortcut-item" draggable="true" data-id="${shortcut.id}" data-url="${escapeHtml(shortcut.url)}"${isFirstRender ? ` style="animation-delay: ${0.5 + index * 0.05}s"` : ''}>
            <div class="shortcut-icon"${iconStyleToBg(shortcut.iconStyle) ? ` style="${iconStyleToBg(shortcut.iconStyle)}"` : ''}>
                ${getShortcutIcon(shortcut)}
            </div>
            <span class="shortcut-name">${escapeHtml(shortcut.name)}</span>
        </div>
    `).join('');
    container.dataset.entered = '1';

    container.querySelectorAll('.shortcut-item').forEach(item => {
        item.addEventListener('click', () => openShortcut(item.dataset.url));
    });
}

function openShortcut(url) {
    if (!url) return;
    // 安全防御：仅允许 http/https/mailto，拦截 javascript:/data: 等
    // （导入的配置可能绕过新增时的校验，这里兜底）
    if (!/^(https?|mailto):/i.test(url)) return;
    if (SettingsManager.get('openInNewTab')) {
        window.open(url, '_blank', 'noopener');
    } else {
        window.location.href = url;
    }
}

function renderShortcutsList() {
    const list = document.getElementById('shortcuts-list');
    const shortcuts = SettingsManager.get('shortcuts') || [];

    if (shortcuts.length === 0) {
        list.innerHTML = '<div class="setting-hint" style="text-align:center;padding:16px;">还没有快捷方式</div>';
        return;
    }

    list.innerHTML = shortcuts.map(shortcut => `
        <div class="shortcut-list-item" data-id="${shortcut.id}">
            <div class="shortcut-list-info">
                <div class="shortcut-list-icon"${iconStyleToBg(shortcut.iconStyle) ? ` style="${iconStyleToBg(shortcut.iconStyle)}"` : ''}>
                    ${getShortcutIcon(shortcut, true)}
                </div>
                <div class="shortcut-list-details">
                    <span class="shortcut-list-name">${escapeHtml(shortcut.name)}</span>
                    <span class="shortcut-list-url">${escapeHtml(shortcut.url)}</span>
                </div>
            </div>
            <div class="shortcut-list-actions">
                <button class="shortcut-action-btn edit-shortcut" aria-label="编辑" title="编辑">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="shortcut-action-btn delete-shortcut" aria-label="删除" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.edit-shortcut').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.shortcut-list-item').dataset.id);
            openEditShortcutModal(id);
        });
    });

    list.querySelectorAll('.delete-shortcut').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.closest('.shortcut-list-item').dataset.id);
            SettingsManager.removeShortcut(id);
            renderShortcuts();
            renderShortcutsList();
        });
    });
}

function getShortcutIcon(shortcut, small = false) {
    const name = shortcut.name || '?';
    const fallbackChar = name.charAt(0).toUpperCase();

    // 自定义图标（含内置 SVG 品牌 logo）：SVG 用 contain + 70% 尺寸保留留白，
    // 位图（用户上传）沿用 cover 填满
    if (shortcut.icon) {
        const tf = iconStyleToTransform(shortcut.iconStyle);
        const isSvg = shortcut.icon.toLowerCase().endsWith('.svg');
        const sizeStyle = isSvg
            ? `object-fit: contain; width: 70%; height: 70%;${tf ? ' ' + tf : ''}`
            : (tf ? tf : '');
        return `
            <img src="${escapeHtml(shortcut.icon)}"
                 alt="${escapeHtml(shortcut.name)}"
                 class="shortcut-favicon"
                 data-fallback="${escapeHtml(fallbackChar)}"${sizeStyle ? ` style="${sizeStyle}"` : ''}>
        `;
    }

    // 尝试获取 favicon，使用更可靠的 DuckDuckGo API
    let domain;
    try {
        domain = new URL(shortcut.url).hostname;
    } catch (e) {
        return `<span class="fallback-icon">${escapeHtml(fallbackChar)}</span>`;
    }

    // DuckDuckGo 的 favicon 服务更稳定
    const faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    return `
        <img src="${faviconUrl}" 
             alt="${escapeHtml(shortcut.name)}" 
             class="shortcut-favicon"
             data-fallback="${escapeHtml(fallbackChar)}">
    `;
}

/* =========================================
   图标 Fallback 处理
   ========================================= */
function initFaviconFallback() {
    document.addEventListener('error', function(e) {
        const target = e.target;
        // 提前返回：只处理快捷方式图标的加载失败
        if (!target || !target.classList || !target.classList.contains('shortcut-favicon')) return;
        const fallback = target.dataset.fallback || '?';
        target.style.display = 'none';
        const span = document.createElement('span');
        span.className = 'fallback-icon';
        span.textContent = fallback;
        target.parentElement.appendChild(span);
    }, true);
}

/* =========================================
   悬浮抽屉（设置面板）
   ========================================= */
function initSettingsDrawer() {
    const settingsBtn = document.getElementById('settings-btn');
    const drawer = document.getElementById('settings-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('close-settings');

    settingsBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (drawer.classList.contains('open')) closeDrawer();
            const modal = document.getElementById('modal-overlay');
            if (modal.classList.contains('open')) closeModal();
            const resetOverlay = document.getElementById('reset-confirm-overlay');
            if (resetOverlay && resetOverlay.classList.contains('open')) {
                resetOverlay.classList.remove('open');
            }
        }
    });
}

function openDrawer() {
    document.getElementById('settings-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
    document.getElementById('settings-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
}

/* =========================================
   模态框（快捷方式编辑）
   ========================================= */
function initModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const addBtn = document.getElementById('add-shortcut-btn');
    const cancelBtn = document.getElementById('modal-cancel');

    addBtn.addEventListener('click', () => {
        Frostart.state.editingShortcutId = null;
        Frostart.state.pendingIconStyle = null;
        document.getElementById('modal-title').textContent = '添加快捷方式';
        document.getElementById('shortcut-name').value = '';
        document.getElementById('shortcut-url').value = '';
        document.getElementById('shortcut-icon').value = '';
        clearIconPreview();
        modalOverlay.classList.add('open');
        setTimeout(() => document.getElementById('shortcut-name').focus(), 100);
    });

    cancelBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    document.getElementById('modal-confirm').addEventListener('click', saveShortcut);

    // 图标上传：读文件 → 打开编辑器（裁切/缩放/背景）→ 写入
    const iconUploadBtn = document.getElementById('icon-upload-btn');
    const iconUploadInput = document.getElementById('icon-upload-input');
    if (iconUploadBtn && iconUploadInput) {
        iconUploadBtn.addEventListener('click', () => iconUploadInput.click());
        iconUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            iconUploadInput.value = ''; // 允许重复选同一文件
            readIconFile(file, (source, type) => {
                openIconEditor({
                    source,
                    type,
                    existingStyle: Frostart.state.pendingIconStyle,
                    onConfirm: (result) => {
                        document.getElementById('shortcut-icon').value = result.src;
                        Frostart.state.pendingIconStyle = result.iconStyle;
                        showIconPreview(result.src, result.iconStyle);
                    }
                });
            });
        });
    }
}

function showIconPreview(src, iconStyle) {
    const preview = document.getElementById('icon-preview');
    if (preview) {
        preview.style.display = 'flex';
        preview.style.backgroundImage = `url("${src}")`;
        // 预览框沿用独立背景，便于所见即所得
        if (iconStyle && iconStyle.bgEnabled) {
            preview.style.backgroundColor = (iconStyle.bgColor && iconStyle.bgColor !== 'transparent')
                ? iconStyle.bgColor : 'transparent';
        } else {
            preview.style.backgroundColor = '';
        }
    }
}

function clearIconPreview() {
    const preview = document.getElementById('icon-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = '';
    }
}

function openEditShortcutModal(id) {
    const shortcuts = SettingsManager.get('shortcuts') || [];
    const shortcut = shortcuts.find(s => s.id === id);
    if (!shortcut) return;

    Frostart.state.editingShortcutId = id;
    Frostart.state.pendingIconStyle = shortcut.iconStyle || null;
    document.getElementById('modal-title').textContent = '编辑快捷方式';
    document.getElementById('shortcut-name').value = shortcut.name;
    document.getElementById('shortcut-url').value = shortcut.url;
    document.getElementById('shortcut-icon').value = shortcut.icon || '';
    if (shortcut.icon) showIconPreview(shortcut.icon, shortcut.iconStyle); else clearIconPreview();
    document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    Frostart.state.editingShortcutId = null;
}

function saveShortcut() {
    const name = document.getElementById('shortcut-name').value.trim();
    const url = document.getElementById('shortcut-url').value.trim();
    const icon = document.getElementById('shortcut-icon').value.trim();

    if (!name || !url) {
        alert('请填写名称和网址');
        return;
    }

    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
        finalUrl = 'https://' + url;
    }

    // 校验 URL 有效性
    try {
        new URL(finalUrl);
    } catch (e) {
        alert('网址格式不太对w');
        return;
    }

    if (Frostart.state.editingShortcutId !== null) {
        SettingsManager.updateShortcut(Frostart.state.editingShortcutId, { name, url: finalUrl, icon, iconStyle: icon ? Frostart.state.pendingIconStyle : null });
    } else {
        SettingsManager.addShortcut({ name, url: finalUrl, icon, iconStyle: icon ? Frostart.state.pendingIconStyle : null });
    }

    Frostart.state.pendingIconStyle = null;
    renderShortcuts();
    renderShortcutsList();
    closeModal();
}

/* =========================================
   存储空间用量指示器
   ========================================= */
const STORAGE_QUOTA = {
    chrome: 10 * 1024 * 1024,   // chrome.storage.local ≈ 10 MB
    // localStorage 配额按 UTF-16 字符计为 5 MB（5,242,880 字符），
    // 本工具换算为字节显示，故对应 10 MB 字节。
    local: 10 * 1024 * 1024
};

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* 估算 localStorage 已用字节：键值字符串按 UTF-16（每字符 2 字节）计算 */
function getLocalStorageBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key) || '';
        total += (key.length + val.length) * 2;
    }
    return total;
}

function renderStorageBar(fillEl, valueEl, used, quota, animate) {
    const pct = Math.min(100, (used / quota) * 100);
    if (fillEl) {
        if (animate) {
            // 先关闭过渡并归零，强制重排落实 0%，下一帧再恢复过渡设目标值，
            // 这样每次都能可靠触发进度条从 0 弹起。
            fillEl.style.transition = 'none';
            fillEl.style.width = '0%';
            void fillEl.offsetWidth;
            requestAnimationFrame(() => {
                fillEl.style.transition = '';
                fillEl.style.width = pct + '%';
            });
        } else {
            fillEl.style.width = pct + '%';
        }
    }
    if (valueEl) {
        if (animate) {
            animateNumber(valueEl, 0, used, quota, pct);
        } else {
            valueEl.textContent = formatBytes(used) + ' / ' + formatBytes(quota) +
                ' · ' + pct.toFixed(pct < 0.1 ? 2 : 1) + '%';
        }
    }
}

/* 数字 count-up 动画：用 cubic-out 缓动，约 0.6s 完成 */
function animateNumber(el, from, to, quota, pct) {
    const duration = 600;
    const start = performance.now();
    el.classList.add('updating');
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = from + (to - from) * eased;
        el.textContent = formatBytes(cur) + ' / ' + formatBytes(quota) +
            ' · ' + (cur / quota * 100).toFixed(pct < 0.1 ? 2 : 1) + '%';
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            el.classList.remove('updating');
        }
    }
    requestAnimationFrame(tick);
}

function refreshStorageIndicator(animate) {
    // chrome.storage.local：异步查询实际字节数
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local &&
        typeof chrome.storage.local.getBytesInUse === 'function') {
        try {
            chrome.storage.local.getBytesInUse((used) => {
                if (chrome.runtime.lastError) return;
                renderStorageBar(
                    document.getElementById('storage-cs-fill'),
                    document.getElementById('storage-cs-value'),
                    used || 0, STORAGE_QUOTA.chrome, animate
                );
            });
        } catch (e) { /* getBytesInUse 不可用，保持占位文本 */ }
    }
    // localStorage：同步估算
    renderStorageBar(
        document.getElementById('storage-ls-fill'),
        document.getElementById('storage-ls-value'),
        getLocalStorageBytes(), STORAGE_QUOTA.local, animate
    );
}

function initStorageIndicator() {
    // 首次渲染：带动画（进度条从 0 弹起）
    refreshStorageIndicator(true);

    // 数据变化时自动刷新（静默，不带高光）
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(() => refreshStorageIndicator(false));
    }

    // 手动刷新按钮：图标旋转 + 高光扫过
    const refreshBtn = document.getElementById('storage-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (refreshBtn.classList.contains('spinning')) return; // 防抖
            refreshBtn.classList.add('spinning');
            refreshStorageIndicator(true);
            setTimeout(() => refreshBtn.classList.remove('spinning'), 700);
        });
    }
}

/* =========================================
   数据管理
   ========================================= */
function initDataManagement() {
    // 填充"关于此项目"的版本号
    const versionEl = document.getElementById('about-version');
    if (versionEl) {
        const ver = (SettingsManager.VERSION || '1.0.0');
        versionEl.textContent = 'v' + ver;
    }

    document.getElementById('export-btn').addEventListener('click', () => {
        SettingsManager.export();
        showToast('配置已导出~');
    });

    const importFile = document.getElementById('import-file');
    document.getElementById('import-btn').addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                await SettingsManager.import(file);
                applySettings();
                renderShortcuts();
                renderShortcutsList();
                renderCustomEngines();
                applyTheme(SettingsManager.get('theme'));
                syncThemeUI();
                showToast('配置导入成功');
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
        importFile.value = '';
    });

    // 重置：用自定义弹窗确认，替代原生 confirm()
    const resetBtn = document.getElementById('reset-btn');
    const resetOverlay = document.getElementById('reset-confirm-overlay');
    const resetConfirmOk = document.getElementById('reset-confirm-ok');
    const resetConfirmCancel = document.getElementById('reset-confirm-cancel');

    if (resetBtn && resetOverlay) {
        resetBtn.addEventListener('click', () => {
            resetOverlay.classList.add('open');
        });
        resetConfirmCancel.addEventListener('click', () => {
            resetOverlay.classList.remove('open');
        });
        // 点遮罩关闭
        resetOverlay.addEventListener('click', (e) => {
            if (e.target === resetOverlay) resetOverlay.classList.remove('open');
        });
        resetConfirmOk.addEventListener('click', async () => {
            await SettingsManager.reset();
            location.reload();
        });
    }

    // 修复：扩展环境（chrome-extension://）下用 <a> 直接打开 .md 时，Chrome 以
    // text/plain 加载且响应头不带 charset，会用系统默认编码（中文 Windows 上为
    // GBK）解析 UTF-8 文件，导致中文乱码。GitHub / 在线网页因服务器返回
    // charset=utf-8 不受影响。这里改为 fetch（Response.text() 始终按 UTF-8 解码）
    // 后在新标签页以正确 charset 显示，对正常环境也无副作用。
    document.querySelectorAll('a.about-link-btn[href$=".md"]').forEach(a => {
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = a.getAttribute('href');
            try {
                const res = await fetch(href);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const text = await res.text();
                const win = window.open('', '_blank');
                if (!win) return; // 弹窗被拦截，保持已阻止的默认行为
                const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                win.document.open();
                win.document.write(
                    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
                    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
                    '<title>' + esc(href) + '</title>' +
                    '<style>' +
                    'body{margin:0;background:#1a1a1a;color:#e6e6e6;' +
                    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.6}' +
                    'pre{padding:24px;white-space:pre-wrap;word-break:break-word}' +
                    '@media(prefers-color-scheme:light){body{background:#fafafa;color:#222}}' +
                    '</style></head><body><pre>' + esc(text) + '</pre></body></html>'
                );
                win.document.close();
            } catch (err) {
                // fetch 失败（如本地 file:// 打开被浏览器拦截），回退到原生打开
                window.open(href, '_blank');
            }
        });
    });
}

/* =========================================
   Toast 通知
   ========================================= */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        // 双层 rAF：确保浏览器先渲染初始状态（opacity:0），再触发 transition
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/* =========================================
   更新检查
   直接读 GitHub 上 manifest.json 的 version 字段做对比。
   一旦改仓库名 / 默认分支名，下面两个 URL 必须同步修改。
   ========================================= */
const UPDATE_REPO = 'Gledery/Frostart';
const UPDATE_BRANCH = 'main';
const UPDATE_API = `https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_BRANCH}/manifest.json`;
const UPDATE_RELEASES_URL = `https://github.com/${UPDATE_REPO}/archive/refs/heads/${UPDATE_BRANCH}.zip`;
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 小时节流

/* 语义化版本比较：返回 1(a>b) / -1(a<b) / 0(相等) */
function compareVersions(a, b) {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1;
        if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
}

function initUpdateCheck() {
    const checkBtn = document.getElementById('check-update-btn');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            // 有更新时点击直接下载最新源码 zip，否则执行检查
            if (checkBtn.classList.contains('has-update')) {
                window.open(UPDATE_RELEASES_URL, '_blank', 'noopener');
            } else {
                checkForUpdates(true);
            }
        });
    }
    // 打开新标签页时静默检查（受 6 小时节流控制）
    checkForUpdates(false);
}

async function checkForUpdates(manual) {
    const currentVersion = SettingsManager.VERSION;

    // 节流：非手动检查时，6 小时内不重复请求
    let lastCheck = 0;
    try { lastCheck = parseInt(localStorage.getItem('frostart_update_check') || '0', 10); }
    catch (e) {}

    if (!manual && Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) {
        updateButtonState(currentVersion);
        return;
    }

    // 手动检查时给按钮反馈
    const btn = document.getElementById('check-update-btn');
    const btnLabel = document.getElementById('check-update-label');
    if (manual && btn) {
        btn.disabled = true;
        if (btnLabel) btnLabel.textContent = '检查中…';
    }

    try {
        const res = await fetch(UPDATE_API);

        let latestVersion = null;

        if (res.ok) {
            const data = await res.json();
            latestVersion = data.version || null;
        }
        // 404 = 仓库还没推上去 / 私有 / 网络挂了，静默处理

        // 缓存结果
        try {
            localStorage.setItem('frostart_update_check', String(Date.now()));
            if (latestVersion) {
                localStorage.setItem('frostart_update_latest', latestVersion);
            } else {
                localStorage.removeItem('frostart_update_latest');
            }
        } catch (e) {}

        if (manual) {
            if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
                showToast(`发现新版本 v${latestVersion}！点击按钮前往下载`);
            } else {
                showToast('当前已是最新版本~');
            }
        }

        updateButtonState(currentVersion, latestVersion);
    } catch (e) {
        if (manual) showToast('检查更新失败，可能是网络问题', 'error');
        updateButtonState(currentVersion);
    } finally {
        if (manual && btn) {
            btn.disabled = false;
        }
    }
}

/* 有新版时把按钮变成高亮态，无新版时恢复默认 */
function updateButtonState(currentVersion, latestVersion) {
    const btn = document.getElementById('check-update-btn');
    const label = document.getElementById('check-update-label');
    if (!btn || !label) return;

    if (latestVersion === undefined) {
        try { latestVersion = localStorage.getItem('frostart_update_latest'); }
        catch (e) { latestVersion = null; }
    }

    if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
        label.textContent = `v${latestVersion} 可更新`;
        btn.classList.add('has-update');
    } else {
        label.textContent = '检查更新';
        btn.classList.remove('has-update');
    }
}

