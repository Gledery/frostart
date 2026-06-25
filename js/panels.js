/* =========================================
   panels.js  —  设置面板分区逻辑
   职责：壁纸设置 UI / 搜索引擎网格 / 字体预设 /
         时钟字体 / 文本颜色 / 自定义引擎
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   ========================================= */

/* 壁纸过渡开关：enabled=true 时启用平滑过渡（点击预设/恢复默认/松手时），
   enabled=false 时瞬切（拖动颜色/角度时，避免迟滞）。
   通过给 body 加/去 wp-instant 类，CSS 中对该类禁用壁纸相关 transition。 */
function setWallpaperTransition(enabled) {
    document.body.classList.toggle('wp-instant', !enabled);
}

/* 把 core.js 产生的 "R,G,B" 三元组字符串转回 #hex，供回写颜色选择器指示框。
   依赖 hexToBlobRgb / hexToRgbTriplet（定义在 core.js）。 */
function rgbTripletToHex(triplet) {
    const parts = String(triplet).split(',').map(p => parseInt(p.trim(), 10));
    if (parts.length !== 3 || parts.some(isNaN)) return '#5b6ee1';
    return '#' + parts.map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
}

/* 计算当前实际生效的光斑颜色（#hex）：自定义色优先，否则按壁纸模式从背景派生。
   which = 1 或 2。派生逻辑与 core.js applyWallpaper 保持一致。 */
function getEffectiveBlobHex(which) {
    const s = SettingsManager.getAll();
    const custom = which === 1 ? s.blobColor1 : s.blobColor2;
    if (custom) return custom;
    if (s.wallpaperMode === 'solid') {
        return rgbTripletToHex(hexToBlobRgb(s.wallpaperColor || '#e6eef7', which === 1 ? 0 : 40));
    }
    const base = which === 1 ? (s.gradientColor1 || '#e8eef7') : (s.gradientColor2 || '#dde6f5');
    return rgbTripletToHex(hexToBlobRgb(base, 0));
}

/* 把当前实际生效的光斑色回写到颜色选择器，使指示框跟随真实光斑色变化。
   在所有改变光斑实际颜色的操作（渐变预设/渐变颜色/恢复默认/跟随渐变/模式切换/纯色）后调用。 */
function updateBlobIndicators() {
    const b1 = document.getElementById('blob-color-1');
    const b2 = document.getElementById('blob-color-2');
    if (b1) b1.value = getEffectiveBlobHex(1);
    if (b2) b2.value = getEffectiveBlobHex(2);
}

/* =========================================
   壁纸设置
   ========================================= */
function initWallpaperSettings() {
    const settings = SettingsManager.getAll();

    // 展开式区块逻辑
    document.querySelectorAll('.wallpaper-type-block').forEach(block => {
        const type = block.dataset.type;
        const toggle = block.querySelector('.switch input');

        // 初始展开当前模式
        block.classList.toggle('expanded', type === settings.wallpaperMode);
        if (toggle) toggle.checked = (type === settings.wallpaperMode);

        // 点击标题行切换
        const header = block.querySelector('.wallpaper-type-header');
        header.addEventListener('click', (e) => {
            if (e.target.closest('.switch')) return;
            selectWallpaperType(type);
        });

        // switch 切换
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    selectWallpaperType(type);
                } else {
                    // 至少保持一个开启，不允许全部关闭
                    toggle.checked = true;
                }
            });
        }
    });

    // 上传本地图片
    const uploadInput = document.getElementById('wallpaper-upload');
    document.getElementById('wallpaper-upload-btn').addEventListener('click', () => {
        uploadInput.click();
    });

    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('请选择图片文件', 'error');
            return;
        }
        compressImage(file, 1920, 0.85, (dataUrl) => {
            SettingsManager.set('wallpaperImage', dataUrl);
            applyWallpaper(SettingsManager.getAll());
            updateWallpaperUI(SettingsManager.getAll());
            showToast('壁纸已设置');
        });
        uploadInput.value = '';
    });

    // URL 输入
    const urlInput = document.getElementById('wallpaper-url');
    urlInput.value = SettingsManager.get('wallpaperImage') || '';
    urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        if (!val) {
            SettingsManager.set('wallpaperImage', '');
            applyWallpaper(SettingsManager.getAll());
            updateWallpaperUI(SettingsManager.getAll());
            return;
        }
        if (!/^https?:\/\//i.test(val) && !val.startsWith('data:')) {
            showToast('网址不太对哦，要以 http:// 或 https:// 开头', 'error');
            return;
        }
        SettingsManager.set('wallpaperImage', val);
        applyWallpaper(SettingsManager.getAll());
        updateWallpaperUI(SettingsManager.getAll());
    });

    // 纯色选择器
    const colorPicker = document.getElementById('wallpaper-color');
    colorPicker.value = SettingsManager.get('wallpaperColor') || '#e6eef7';
    colorPicker.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('wallpaperColor', colorPicker.value);
        applyWallpaper(SettingsManager.getAll());
        // 纯色模式下，纯色改变会让派生光斑色跟着变，同步指示框
        updateBlobIndicators();
    });
    colorPicker.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 清除图片
    document.getElementById('wallpaper-clear-btn').addEventListener('click', () => {
        SettingsManager.set('wallpaperImage', '');
        document.getElementById('wallpaper-url').value = '';
        applyWallpaper(SettingsManager.getAll());
        updateWallpaperUI(SettingsManager.getAll());
    });

    // 渐变颜色 1
    const gc1 = document.getElementById('gradient-color-1');
    gc1.value = settings.gradientColor1 || '#e8eef7';
    gc1.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('gradientColor1', gc1.value);
        applyWallpaper(SettingsManager.getAll());
        updateBlobIndicators();
    });
    gc1.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变颜色 2
    const gc2 = document.getElementById('gradient-color-2');
    gc2.value = settings.gradientColor2 || '#dde6f5';
    gc2.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('gradientColor2', gc2.value);
        applyWallpaper(SettingsManager.getAll());
        updateBlobIndicators();
    });
    gc2.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变角度
    const angleSlider = document.getElementById('gradient-angle-slider');
    const angleValue = document.getElementById('gradient-angle-value');
    angleSlider.value = settings.gradientAngle || 135;
    angleValue.textContent = `${angleSlider.value}°`;
    angleSlider.addEventListener('input', () => {
        setWallpaperTransition(false);
        angleValue.textContent = `${angleSlider.value}°`;
        SettingsManager.set('gradientAngle', parseInt(angleSlider.value));
        applyWallpaper(SettingsManager.getAll());
    });
    angleSlider.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 渐变预设
    document.querySelectorAll('.gradient-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const c1 = preset.dataset.c1;
            const c2 = preset.dataset.c2;
            const angle = parseInt(preset.dataset.angle) || 135;

            gc1.value = c1;
            gc2.value = c2;
            angleSlider.value = angle;
            angleValue.textContent = `${angle}°`;

            setWallpaperTransition(true);
            SettingsManager.set('gradientColor1', c1);
            SettingsManager.set('gradientColor2', c2);
            SettingsManager.set('gradientAngle', angle);
            applyWallpaper(SettingsManager.getAll());
            updateBlobIndicators();
        });
    });

    // 光斑颜色（跟随渐变开关：开=自动派生，关=自定义）
    const blob1 = document.getElementById('blob-color-1');
    const blob2 = document.getElementById('blob-color-2');
    const blobFollow = document.getElementById('blob-follow-gradient');

    // 同步开关状态与颜色选择器可用性：两个自定义色均为空视为“跟随渐变”
    function syncBlobFollowState() {
        const s = SettingsManager.getAll();
        const following = !s.blobColor1 && !s.blobColor2;
        blobFollow.checked = following;
        blob1.disabled = following;
        blob2.disabled = following;
        // 指示框显示当前实际生效的光斑色（自定义色或派生色），而非硬编码默认色
        updateBlobIndicators();
    }

    syncBlobFollowState();
    blobFollow.addEventListener('change', () => {
        setWallpaperTransition(true);
        if (blobFollow.checked) {
            // 开启跟随渐变：清空自定义色，交由背景派生
            SettingsManager.set('blobColor1', '');
            SettingsManager.set('blobColor2', '');
            showToast('光斑已恢复跟随渐变~');
        } else {
            // 关闭跟随渐变：以当前生效色作为自定义起点，避免视觉突变
            SettingsManager.set('blobColor1', getEffectiveBlobHex(1));
            SettingsManager.set('blobColor2', getEffectiveBlobHex(2));
        }
        applyWallpaper(SettingsManager.getAll());
        syncBlobFollowState();
    });
    blob1.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('blobColor1', blob1.value);
        applyWallpaper(SettingsManager.getAll());
    });
    blob1.addEventListener('change', () => {
        setWallpaperTransition(true);
    });
    blob2.addEventListener('input', () => {
        setWallpaperTransition(false);
        SettingsManager.set('blobColor2', blob2.value);
        applyWallpaper(SettingsManager.getAll());
    });
    blob2.addEventListener('change', () => {
        setWallpaperTransition(true);
    });

    // 恢复默认渐变（同时清空光斑自定义色，回归一致的默认外观）
    document.getElementById('gradient-reset-btn').addEventListener('click', () => {
        gc1.value = '#e8eef7';
        gc2.value = '#dde6f5';
        angleSlider.value = 135;
        angleValue.textContent = '135°';

        setWallpaperTransition(true);
        SettingsManager.set('gradientColor1', '#e8eef7');
        SettingsManager.set('gradientColor2', '#dde6f5');
        SettingsManager.set('gradientAngle', 135);
        SettingsManager.set('blobColor1', '');
        SettingsManager.set('blobColor2', '');
        applyWallpaper(SettingsManager.getAll());
        syncBlobFollowState();
        showToast('已恢复默认渐变');
    });

    // 必应每日壁纸：手动刷新
    const bingRefreshBtn = document.getElementById('bing-refresh-btn');
    if (bingRefreshBtn) {
        bingRefreshBtn.addEventListener('click', () => {
            if (typeof refreshBingWallpaper !== 'function') return;
            bingRefreshBtn.disabled = true;
            const orig = bingRefreshBtn.textContent;
            bingRefreshBtn.textContent = '刷新中…';
            refreshBingWallpaper(true).finally(() => {
                bingRefreshBtn.disabled = false;
                bingRefreshBtn.textContent = orig;
            });
        });
    }
    updateBingWallpaperInfo();
}

function selectWallpaperType(type) {
    SettingsManager.set('wallpaperMode', type);
    applyWallpaper(SettingsManager.getAll());
    // 模式切换会改变光斑派生源（渐变色↔纯色），同步指示框
    updateBlobIndicators();

    // 切到必应模式：若当日壁纸未缓存则拉取
    if (type === 'bing' && typeof refreshBingWallpaper === 'function') {
        refreshBingWallpaper();
    }

    // 更新所有区块的展开状态和 switch
    document.querySelectorAll('.wallpaper-type-block').forEach(block => {
        const isActive = block.dataset.type === type;
        block.classList.toggle('expanded', isActive);
        const toggle = block.querySelector('.switch input');
        if (toggle) toggle.checked = isActive;
    });
}

function updateWallpaperUI(settings) {
    // 更新展开状态
    document.querySelectorAll('.wallpaper-type-block').forEach(block => {
        const isActive = block.dataset.type === settings.wallpaperMode;
        block.classList.toggle('expanded', isActive);
        const toggle = block.querySelector('.switch input');
        if (toggle) toggle.checked = isActive;
    });

    // 预览
    const preview = document.getElementById('wallpaper-preview');
    if (preview) {
        if (settings.wallpaperImage) {
            preview.style.backgroundImage = `url("${settings.wallpaperImage}")`;
            preview.classList.remove('empty');
            preview.textContent = '';
        } else {
            preview.style.backgroundImage = '';
            preview.classList.add('empty');
            preview.textContent = '尚未设置图片';
        }
    }

    // URL 输入框
    const urlInput = document.getElementById('wallpaper-url');
    if (urlInput) urlInput.value = settings.wallpaperImage || '';

    // 颜色选择器
    const colorPicker = document.getElementById('wallpaper-color');
    if (colorPicker) colorPicker.value = settings.wallpaperColor || '#e6eef7';

    // 渐变颜色
    const gc1 = document.getElementById('gradient-color-1');
    if (gc1) gc1.value = settings.gradientColor1 || '#e8eef7';
    const gc2 = document.getElementById('gradient-color-2');
    if (gc2) gc2.value = settings.gradientColor2 || '#dde6f5';
    const angleSlider = document.getElementById('gradient-angle-slider');
    if (angleSlider) {
        angleSlider.value = settings.gradientAngle || 135;
        const angleValue = document.getElementById('gradient-angle-value');
        if (angleValue) angleValue.textContent = `${settings.gradientAngle || 135}°`;
    }

    // 必应模式遮罩/模糊滑块同步（与图片模式共享同一设置项，导入/重置后需回填）
    const bingMask = document.getElementById('bing-mask-slider');
    if (bingMask) {
        bingMask.value = settings.wallpaperMask;
        const bingMaskValue = document.getElementById('bing-mask-value');
        if (bingMaskValue) bingMaskValue.textContent = `${settings.wallpaperMask}%`;
    }
    const bingBlur = document.getElementById('bing-blur-slider');
    if (bingBlur) {
        bingBlur.value = settings.wallpaperBlur;
        const bingBlurValue = document.getElementById('bing-blur-value');
        if (bingBlurValue) bingBlurValue.textContent = `${settings.wallpaperBlur}px`;
    }
    updateBingWallpaperInfo();

    // 光斑指示框跟随实际生效的光斑色（导入/重置后重新同步）
    updateBlobIndicators();
}

/* 必应每日壁纸版权/标题信息展示 */
function updateBingWallpaperInfo() {
    const wrap = document.getElementById('bing-info-wrap');
    const text = document.getElementById('bing-info-text');
    if (!wrap || !text) return;
    const s = SettingsManager.getAll();
    const info = s.bingWallpaperCopyright || s.bingWallpaperTitle;
    if (info) {
        text.textContent = info;
        wrap.style.display = '';
    } else {
        wrap.style.display = 'none';
    }
}

/* =========================================
   搜索引擎
   ========================================= */
function initSearchEngine() {
    renderSearchEngineGrid();

    const grid = document.getElementById('search-engine-grid');
    if (grid) {
        // 单击：加入／移出快捷切换（当前默认引擎不可移出）
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-search-engine]');
            if (!btn) return;
            const engine = btn.dataset.searchEngine;
            const pinned = getPinnedEngines();
            const isPinned = pinned.includes(engine);
            if (engine === SettingsManager.get('searchEngine') && isPinned) {
                showToast('默认引擎需要留在列表里OwO');
                return;
            }
            toggleEnginePinned(engine);
            renderSearchEngineGrid();
            showToast(isPinned ? '已移出快捷切换' : '已加入快捷切换~');
        });
    }

    // 快捷切换开关
    const quickSwitch = document.getElementById('engine-quick-switch');
    if (quickSwitch) {
        quickSwitch.checked = SettingsManager.get('engineQuickSwitch');
        quickSwitch.addEventListener('change', () => {
            SettingsManager.set('engineQuickSwitch', quickSwitch.checked);
        });
    }
}

function renderSearchEngineGrid() {
    const grid = document.getElementById('search-engine-grid');
    if (!grid) return;
    const current = SettingsManager.get('searchEngine') || 'google';
    const pinned = getPinnedEngines();

    // 已加入的排在前面，其余按内置顺序在后
    const entries = Object.entries(SEARCH_ENGINES).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        pinned: pinned.includes(key)
    }));
    entries.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return 0;
    });

    const html = entries.map(en => {
        const isCurrent = en.key === current;
        // pinned = 已加入快捷切换；active = 当前默认引擎
        return `
            <button class="engine-chip${en.pinned ? ' pinned' : ''}${isCurrent ? ' active' : ''}" data-search-engine="${en.key}" title="${escapeHtml(en.label)}">
                <span class="engine-chip-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <img src="icons/search-engine/${en.key}.svg" alt="${escapeHtml(en.label)}" class="engine-chip-icon">
                <span class="engine-chip-name">${escapeHtml(en.label)}</span>
                ${isCurrent ? '<span class="engine-chip-current">默认</span>' : ''}
            </button>`;
    }).join('');
    grid.innerHTML = html;
}

function updateSearchEngineUI(engine) {
    document.querySelectorAll('[data-search-engine]').forEach(btn => {
        const isCurrent = btn.dataset.searchEngine === engine;
        btn.classList.toggle('active', isCurrent);
        // 同步"默认"角标
        let badge = btn.querySelector('.engine-chip-current');
        if (isCurrent && !badge) {
            badge = document.createElement('span');
            badge.className = 'engine-chip-current';
            badge.textContent = '默认';
            btn.appendChild(badge);
        } else if (!isCurrent && badge) {
            badge.remove();
        }
    });
}

/* =========================================
   字体设置
   ========================================= */
function initFontSetting() {
    const fontInput = document.getElementById('custom-font');
    const settings = SettingsManager.getAll();

    if (settings.customFont) {
        fontInput.value = settings.customFont;
    }

    fontInput.addEventListener('change', () => {
        const font = fontInput.value.trim();
        SettingsManager.set('customFont', font);
        applyFont(font);
        updateFontPresets(font);
    });

    // 字体预设点击
    document.querySelectorAll('[data-font-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const font = btn.dataset.fontPreset;
            fontInput.value = font;
            SettingsManager.set('customFont', font);
            applyFont(font);
            updateFontPresets(font);
        });
    });
}

function updateFontPresets(currentFont) {
    document.querySelectorAll('[data-font-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.fontPreset === currentFont);
    });
}

/* =========================================
   时钟数字字体设置（独立于全局字体）
   ========================================= */
function applyClockFont(fontName) {
    const root = document.documentElement;
    if (!fontName || !fontName.trim()) {
        root.style.removeProperty('--clock-font');
        removeClockFontLink();
        return;
    }

    root.style.setProperty('--clock-font', fontName);
    loadClockFont(fontName);
}

function loadClockFont(fontName) {
    removeClockFontLink();
    const family = fontName.split(',')[0].trim().replace(/\s+/g, '+');
    const link = document.createElement('link');
    link.id = 'clock-font-link';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
}

function removeClockFontLink() {
    const existing = document.getElementById('clock-font-link');
    if (existing) existing.remove();
}

function preloadClockFontPreviews() {
    const families = [...new Set(
        [...document.querySelectorAll('[data-clock-font]')]
            .map(btn => (btn.dataset.clockFont || '').trim())
            .filter(Boolean)
    )];
    if (families.length === 0) return;

    const familyParams = families
        .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400`)
        .sort()
        .join('&');
    const link = document.createElement('link');
    link.id = 'clock-font-previews-link';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    document.head.appendChild(link);
}

function initClockFont() {
    document.querySelectorAll('[data-clock-font]').forEach(btn => {
        btn.addEventListener('click', () => {
            const font = btn.dataset.clockFont;
            SettingsManager.set('clockFont', font);
            applyClockFont(font);
            updateClockFontPresets(font);
        });
    });

    // 惰性加载预览字体：首次打开设置时引入，确保预览按钮能显示各自字形
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', preloadClockFontPreviews, { once: true });
    }
}

function updateClockFontPresets(currentFont) {
    document.querySelectorAll('[data-clock-font]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.clockFont === (currentFont || ''));
    });
}

/* =========================================
   文本颜色设置
   ========================================= */
function initTextColors() {
    // fallback = 未自定义时选择器显示的颜色（与 applyTextColors 的默认色取向一致）
    const items = [
        { id: 'clock-color', key: 'clockColor', fallback: '#ffffff' },
        { id: 'date-color', key: 'dateColor', fallback: '#ffffff' },
        { id: 'shortcut-name-color', key: 'shortcutNameColor', fallback: '#ffffff' },
        { id: 'search-text-color', key: 'searchTextColor', fallback: '#1a1a2a' },
        { id: 'search-placeholder-color', key: 'searchPlaceholderColor', fallback: '#6a6a7a' }
    ];
    const settings = SettingsManager.getAll();

    // 全局颜色（无单独取向，用中性深色）
    const GLOBAL_FALLBACK = '#1a1a2a';
    const globalPicker = document.getElementById('global-text-color-picker');
    const globalReset = document.getElementById('global-text-color-reset');
    if (globalPicker) {
        globalPicker.value = settings.globalTextColor || GLOBAL_FALLBACK;
        globalPicker.addEventListener('input', () => {
            SettingsManager.set('globalTextColor', globalPicker.value);
            applyTextColors(SettingsManager.getAll());
        });
    }
    if (globalReset) {
        globalReset.addEventListener('click', () => {
            SettingsManager.set('globalTextColor', '');
            applyTextColors(SettingsManager.getAll());
            globalPicker.value = GLOBAL_FALLBACK;
        });
    }

    // 单独覆盖
    items.forEach(({ id, key, fallback }) => {
        const picker = document.getElementById(`${id}-picker`);
        const reset = document.getElementById(`${id}-reset`);
        if (!picker) return;

        picker.value = settings[key] || fallback;

        picker.addEventListener('input', () => {
            SettingsManager.set(key, picker.value);
            applyTextColors(SettingsManager.getAll());
        });

        if (reset) {
            reset.addEventListener('click', () => {
                SettingsManager.set(key, '');
                applyTextColors(SettingsManager.getAll());
                picker.value = fallback;
                picker.value = '#1a1a2a';
            });
        }
    });

    // 全部重置
    const resetAll = document.getElementById('reset-color-all');
    if (resetAll) {
        resetAll.addEventListener('click', () => {
            items.forEach(({ id, key, fallback }) => {
                SettingsManager.set(key, '');
                const p = document.getElementById(`${id}-picker`);
                if (p) p.value = fallback;
            });
            SettingsManager.set('globalTextColor', '');
            if (globalPicker) globalPicker.value = GLOBAL_FALLBACK;
            applyTextColors(SettingsManager.getAll());
            showToast('已重置所有文本颜色');
        });
    }
}

/* =========================================
   自定义搜索引擎
   ========================================= */
function initCustomEngines() {
    const addBtn = document.getElementById('add-engine-btn');
    const overlay = document.getElementById('engine-modal-overlay');
    const cancelBtn = document.getElementById('engine-modal-cancel');
    const confirmBtn = document.getElementById('engine-modal-confirm');
    const nameInput = document.getElementById('engine-name');
    const urlInput = document.getElementById('engine-url');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            nameInput.value = '';
            urlInput.value = '';
            Frostart.state.pendingEngineIcon = '';
            Frostart.state.pendingEngineIconStyle = null;
            clearEngineIconPreview();
            overlay.classList.add('open');
            setTimeout(() => nameInput.focus(), 100);
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => overlay.classList.remove('open'));
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    }

    // 自定义引擎图标上传：读文件 → 编辑器 → 暂存
    const engineIconUploadBtn = document.getElementById('engine-icon-upload-btn');
    const engineIconUploadInput = document.getElementById('engine-icon-upload-input');
    if (engineIconUploadBtn && engineIconUploadInput) {
        engineIconUploadBtn.addEventListener('click', () => engineIconUploadInput.click());
        engineIconUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            engineIconUploadInput.value = '';
            readIconFile(file, (source, type) => {
                openIconEditor({
                    source,
                    type,
                    existingStyle: Frostart.state.pendingEngineIconStyle,
                    onConfirm: (result) => {
                        Frostart.state.pendingEngineIcon = result.src;
                        Frostart.state.pendingEngineIconStyle = result.iconStyle;
                        showEngineIconPreview(result.src, result.iconStyle);
                    }
                });
            });
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();

            if (!name || !url) {
                showToast('请填写名称和 URL', 'error');
                return;
            }
            if (!url.includes('%s')) {
                showToast('URL 必须包含 %s', 'error');
                return;
            }
            // 安全校验：只允许 http/https 搜索引擎 URL，防止 javascript:/data: 等协议
            // 在 window.open / location.href 中触发 XSS（防御导入恶意配置的场景）
            const testUrl = url.replace('%s', 'test');
            if (!/^https?:\/\//i.test(testUrl)) {
                showToast('URL 必须以 http:// 或 https:// 开头', 'error');
                return;
            }
            try {
                new URL(testUrl);
            } catch (e) {
                showToast('URL 格式不太对', 'error');
                return;
            }

            const engines = SettingsManager.get('customEngines') || [];
            const id = 'custom_' + Date.now();
            const newEngine = { id, name, url: url.replace('%s', '') };
            if (Frostart.state.pendingEngineIcon) {
                newEngine.icon = Frostart.state.pendingEngineIcon;
                newEngine.iconStyle = Frostart.state.pendingEngineIconStyle;
            }
            engines.push(newEngine);
            SettingsManager.set('customEngines', engines);
            // 新增自定义引擎默认加入快捷切换
            const pinned = getPinnedEngines();
            if (!pinned.includes(id)) {
                pinned.push(id);
                SettingsManager.set('pinnedEngines', pinned);
            }
            Frostart.state.pendingEngineIcon = '';
            Frostart.state.pendingEngineIconStyle = null;
            renderCustomEngines();
            overlay.classList.remove('open');
            showToast('引擎已添加~');
        });
    }

    renderCustomEngines();
}

/* 自定义引擎图标预览（与 shortcut 预览同结构） */
function showEngineIconPreview(src, iconStyle) {
    const preview = document.getElementById('engine-icon-preview');
    if (preview) {
        preview.style.display = 'flex';
        preview.style.backgroundImage = `url("${src}")`;
        preview.style.backgroundColor = (iconStyle && iconStyle.bgEnabled && iconStyle.bgColor && iconStyle.bgColor !== 'transparent')
            ? iconStyle.bgColor : '';
    }
}

function clearEngineIconPreview() {
    const preview = document.getElementById('engine-icon-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
        preview.style.backgroundColor = '';
    }
}

function renderCustomEngines() {
    const list = document.getElementById('custom-engines-list');
    if (!list) return;
    const engines = SettingsManager.get('customEngines') || [];

    if (engines.length === 0) {
        list.innerHTML = '<div class="setting-hint" style="padding:8px 0;">暂无自定义引擎</div>';
        return;
    }

    list.innerHTML = engines.map(en => `
        <div class="shortcut-list-item" data-engine-id="${en.id}">
            <div class="shortcut-list-info">
                <div class="shortcut-list-icon"${iconStyleToBg(en.iconStyle) ? ` style="${iconStyleToBg(en.iconStyle)}"` : ''}>
                    ${renderEngineIconHtml(en.id, 22, en.name)}
                </div>
                <div class="shortcut-list-details">
                    <span class="shortcut-list-name">${escapeHtml(en.name)}</span>
                    <span class="shortcut-list-url">${escapeHtml(en.url)}（关键词会加在末尾）</span>
                </div>
            </div>
            <div class="shortcut-list-actions">
                <button class="shortcut-action-btn use-engine" title="使用此引擎">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="shortcut-action-btn delete-engine" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.use-engine').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('[data-engine-id]').dataset.engineId;
            SettingsManager.set('searchEngine', id);
            updateSearchEngineUI(id);
            updateSearchEngineIndicator();
            showToast('已切换引擎~');
        });
    });

    list.querySelectorAll('.delete-engine').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('[data-engine-id]').dataset.engineId;
            let engines = SettingsManager.get('customEngines') || [];
            engines = engines.filter(en => en.id !== id);
            SettingsManager.set('customEngines', engines);
            // 同步从快捷切换列表移除
            let pinned = getPinnedEngines().filter(k => k !== id);
            SettingsManager.set('pinnedEngines', pinned);
            if (SettingsManager.get('searchEngine') === id) {
                SettingsManager.set('searchEngine', 'google');
                if (!pinned.includes('google') && SEARCH_ENGINES.google) {
                    pinned.push('google');
                    SettingsManager.set('pinnedEngines', pinned);
                }
                updateSearchEngineUI('google');
                updateSearchEngineIndicator();
            }
            renderCustomEngines();
            renderSearchEngineGrid();
        });
    });
}

