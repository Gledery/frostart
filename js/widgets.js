/* =========================================
   widgets.js  —  交互组件与工具
   职责：设置搜索 / 标签页 / 开关 / 键盘快捷键 /
         上下文菜单 / 拖拽排序 / 图标编辑器 /
         图片压缩 / 图标文件读取 / 图标样式工具
   加载顺序：settings.js → core.js → sliders.js → panels.js → widgets.js
   ========================================= */

/* =========================================
   设置搜索
   ========================================= */
const SETTINGS_TAB_LABELS = {
    appearance: '外观',
    clock: '时钟',
    text: '文本',
    wallpaper: '壁纸',
    search: '搜索',
    shortcuts: '图标',
    data: '数据与关于'
};

function initSettingsSearch() {
    const input = document.getElementById('settings-search-input');
    const kbd = document.getElementById('settings-search-kbd');
    const wrap = document.getElementById('settings-search-wrap');
    const drawer = document.getElementById('settings-drawer');
    if (!input || !wrap || !drawer) return;

    // 为每个 .setting-item 建立可搜索文本（标签 + hint + 所属 section + 所属标签页）
    const items = Array.from(drawer.querySelectorAll('.setting-item'));
    items.forEach(item => {
        const label = (item.querySelector('.setting-label, .switch-row .setting-label, .color-input-wrapper .setting-label') || {}).textContent || '';
        const hint = (item.querySelector('.setting-hint') || {}).textContent || '';
        const section = item.closest('.settings-section');
        const sectionTitle = section && section.querySelector('.section-title');
        const sectionText = sectionTitle ? sectionTitle.textContent : '';
        const panel = item.closest('.tab-panel');
        const tabName = panel ? (SETTINGS_TAB_LABELS[panel.dataset.panel] || '') : '';
        item.dataset.searchText = (tabName + ' ' + sectionText + ' ' + label + ' ' + hint + ' ' + item.textContent).replace(/\s+/g, ' ').trim().toLowerCase();
    });

    function clearSearch() {
        drawer.classList.remove('settings-search-active');
        items.forEach(i => {
            i.classList.remove('search-match', 'search-section-keep');
        });
        const empty = drawer.querySelector('.settings-search-empty');
        if (empty) empty.remove();
    }

    function runSearch(raw) {
        const q = raw.trim().toLowerCase();
        if (!q) { clearSearch(); return; }

        let matchedPanels = new Set();
        let matchCount = 0;
        items.forEach(item => {
            const hit = item.dataset.searchText.includes(q);
            item.classList.toggle('search-match', hit);
            if (hit) {
                matchCount++;
                const panel = item.closest('.tab-panel');
                if (panel) matchedPanels.add(panel);
            }
        });

        // 标记匹配项所属 section 内的标题项（保留可见但不属于 match，避免标题淡化）
        items.forEach(item => {
            const section = item.closest('.settings-section');
            if (!section) return;
            const hasMatch = section.querySelector('.setting-item.search-match');
            if (hasMatch) item.classList.add('search-section-keep');
            else item.classList.remove('search-section-keep');
        });

        // 显示第一个命中的标签页
        const tabBtns = drawer.querySelectorAll('.tab-btn');
        const panels = drawer.querySelectorAll('.tab-panel');
        if (matchedPanels.size > 0) {
            const firstPanel = matchedPanels.values().next().value;
            panels.forEach(p => p.classList.toggle('active', p === firstPanel));
            tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === firstPanel.dataset.panel));
        }

        drawer.classList.add('settings-search-active');

        // 空结果提示
        const content = drawer.querySelector('.drawer-content');
        let empty = drawer.querySelector('.settings-search-empty');
        if (matchCount === 0) {
            if (!empty) {
                empty = document.createElement('div');
                empty.className = 'settings-search-empty';
                empty.textContent = `没有找到与"${raw.trim()}"相关的设置`;
                content.appendChild(empty);
            } else {
                empty.textContent = `没有找到与"${raw.trim()}"相关的设置`;
            }
        } else if (empty) {
            empty.remove();
        }
    }

    input.addEventListener('input', () => runSearch(input.value));

    // 清空时恢复默认（外观）标签页
    input.addEventListener('search', () => {
        if (!input.value) {
            clearSearch();
            const firstBtn = drawer.querySelector('.tab-btn[data-tab="appearance"]');
            if (firstBtn) firstBtn.click();
        }
    });

    // "/" 快捷键聚焦搜索框（抽屉打开时）
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && drawer.classList.contains('open') && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            input.focus();
            input.select();
        }
        if (e.key === 'Escape' && document.activeElement === input) {
            input.value = '';
            clearSearch();
            input.blur();
        }
    });

    if (kbd) {
        kbd.addEventListener('click', () => { input.focus(); input.select(); });
    }

    // 抽屉关闭/打开时重置
    const observer = new MutationObserver(() => {
        if (!drawer.classList.contains('open') && input.value) {
            input.value = '';
            clearSearch();
        }
    });
    observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
}

/* =========================================
   标签页导航
   ========================================= */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelector(`[data-panel="${target}"]`).classList.add('active');
        });
    });
}

/* =========================================
   开关
   ========================================= */
function initSwitches() {
    const showSeconds = document.getElementById('show-seconds');
    if (showSeconds) {
        showSeconds.addEventListener('change', () => {
            SettingsManager.set('showSeconds', showSeconds.checked);
            updateTime();
        });
    }

    const showWeek = document.getElementById('show-week');
    if (showWeek) {
        showWeek.addEventListener('change', () => {
            SettingsManager.set('showWeek', showWeek.checked);
            updateTime();
        });
    }

    const showLunar = document.getElementById('show-lunar');
    if (showLunar) {
        showLunar.addEventListener('change', () => {
            SettingsManager.set('showLunar', showLunar.checked);
            updateTime();
        });
    }

    const searchNewTab = document.getElementById('search-new-tab');
    if (searchNewTab) {
        searchNewTab.addEventListener('change', () => {
            SettingsManager.set('searchInNewTab', searchNewTab.checked);
        });
    }

    const openNewTab = document.getElementById('open-new-tab');
    if (openNewTab) {
        openNewTab.addEventListener('change', () => {
            SettingsManager.set('openInNewTab', openNewTab.checked);
        });
    }
}

function updateSwitchUI(settings) {
    const showSeconds = document.getElementById('show-seconds');
    if (showSeconds) showSeconds.checked = settings.showSeconds || false;

    const showWeek = document.getElementById('show-week');
    if (showWeek) showWeek.checked = settings.showWeek !== false;

    const showLunar = document.getElementById('show-lunar');
    if (showLunar) showLunar.checked = settings.showLunar || false;

    const searchNewTab = document.getElementById('search-new-tab');
    if (searchNewTab) searchNewTab.checked = settings.searchInNewTab || false;

    const openNewTab = document.getElementById('open-new-tab');
    if (openNewTab) openNewTab.checked = settings.openInNewTab !== false;

    const engineQuickSwitch = document.getElementById('engine-quick-switch');
    if (engineQuickSwitch) engineQuickSwitch.checked = settings.engineQuickSwitch !== false;
}

/* =========================================
   键盘快捷键
   ========================================= */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // "/" 聚焦搜索框
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && !isAnyOverlayOpen()) {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        }
    });
}

function isAnyOverlayOpen() {
    return document.getElementById('settings-drawer').classList.contains('open') ||
           document.getElementById('modal-overlay').classList.contains('open');
}

/* =========================================
   数据管理（更新含重置）
   ========================================= */

/* =========================================
   右键上下文菜单
   ========================================= */
const WidgetState = {
    contextMenu: null,
};

function initContextMenu() {
    // 右键快捷方式
    document.getElementById('shortcuts-container').addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.shortcut-item');
        if (item) {
            e.preventDefault();
            const id = parseInt(item.dataset.id);
            showContextMenu(e.clientX, e.clientY, [
                { label: '编辑', icon: 'edit', action: () => openEditShortcutModal(id) },
                { label: '在新标签打开', icon: 'external', action: () => openShortcut(item.dataset.url) },
                { divider: true },
                { label: '删除', icon: 'delete', danger: true, action: () => {
                    SettingsManager.removeShortcut(id);
                    renderShortcuts();
                    renderShortcutsList();
                    showToast('已删除~');
                }}
            ]);
        }
    });

    // 右键搜索框：在已加入快捷切换的引擎里切换默认
    document.querySelector('.search-box').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const pinnedKeys = getPinnedEngines();
        const customList = SettingsManager.get('customEngines') || [];
        const engines = pinnedKeys.map(key => {
            const builtIn = SEARCH_ENGINES[key];
            if (builtIn) return { key, label: builtIn.label };
            const c = customList.find(en => en.id === key);
            return { key, label: c ? c.name : key };
        });
        const current = SettingsManager.get('searchEngine') || 'google';
        showContextMenu(e.clientX, e.clientY, engines.map(en => ({
            label: en.label,
            icon: en.key === current ? 'check' : '',
            action: () => {
                SettingsManager.set('searchEngine', en.key);
                updateSearchEngineUI(en.key);
                updateSearchEngineIndicator();
            }
        })));
    });

    // 右键时钟
    document.querySelector('.time-display').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const fmt = SettingsManager.get('timeFormat') || 24;
        const showSec = SettingsManager.get('showSeconds') || false;
        const timeText = document.getElementById('time').textContent;

        showContextMenu(e.clientX, e.clientY, [
            { label: '复制时间', icon: 'copy', action: () => {
                navigator.clipboard.writeText(timeText).then(() => showToast('已复制~'));
            }},
            { divider: true },
            { label: '24 小时制', icon: fmt === 24 ? 'check' : '', action: () => {
                SettingsManager.set('timeFormat', 24);
                updateTimeFormatUI(24);
                updateTime();
            }},
            { label: '12 小时制', icon: fmt === 12 ? 'check' : '', action: () => {
                SettingsManager.set('timeFormat', 12);
                updateTimeFormatUI(12);
                updateTime();
            }},
            { divider: true },
            { label: '显示秒', icon: showSec ? 'check' : '', action: () => {
                const newVal = !showSec;
                SettingsManager.set('showSeconds', newVal);
                const cb = document.getElementById('show-seconds');
                if (cb) cb.checked = newVal;
                updateTime();
            }}
        ]);
    });

    // 右键背景
    document.body.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.shortcut-item') || e.target.closest('.search-box') || e.target.closest('.settings-drawer') || e.target.closest('.modal-overlay') || e.target.closest('.time-display') || e.target.closest('.context-menu')) return;
        e.preventDefault();
        const wpMode = SettingsManager.get('wallpaperMode') || 'gradient';
        const theme = SettingsManager.get('theme') || 'auto';
        showContextMenu(e.clientX, e.clientY, [
            { label: '添加快捷方式', icon: 'add', action: () => {
                document.getElementById('add-shortcut-btn').click();
            }},
            { divider: true },
            { label: '设置', icon: 'settings', action: () => openSettings() },
            { label: '外观设置', icon: 'palette', action: () => {
                openSettings();
                document.querySelector('[data-tab="appearance"]').click();
            }},
            { divider: true },
            { label: '渐变壁纸', icon: wpMode === 'gradient' ? 'check' : '', action: () => switchWallpaperMode('gradient') },
            { label: '图片壁纸', icon: wpMode === 'image' ? 'check' : '', action: () => switchWallpaperMode('image') },
            { label: '纯色壁纸', icon: wpMode === 'solid' ? 'check' : '', action: () => switchWallpaperMode('solid') },
            { divider: true },
            { label: theme === 'light' ? '深色模式' : '浅色模式', icon: 'theme', action: () => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                SettingsManager.set('theme', newTheme);
                applyTheme(newTheme);
            }}
        ]);
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', () => hideContextMenu());
    document.addEventListener('scroll', () => hideContextMenu(), true);
    window.addEventListener('resize', () => hideContextMenu());
}

function showContextMenu(x, y, items) {
    hideContextMenu();

    WidgetState.contextMenu = document.createElement('div');
    WidgetState.contextMenu.className = 'context-menu glass-effect';

    items.forEach(item => {
        if (item.divider) {
            const div = document.createElement('div');
            div.className = 'context-divider';
            WidgetState.contextMenu.appendChild(div);
        } else {
            const btn = document.createElement('button');
            btn.className = `context-item${item.danger ? ' danger' : ''}`;
            // label 可能来自导入的自定义引擎名等不可信数据，转义防 XSS
            btn.innerHTML = `${getMenuIcon(item.icon)}<span>${escapeHtml(item.label)}</span>`;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideContextMenu();
                item.action();
            });
            WidgetState.contextMenu.appendChild(btn);
        }
    });

    document.body.appendChild(WidgetState.contextMenu);

    // 智能定位，防止溢出
    const rect = WidgetState.contextMenu.getBoundingClientRect();
    let posX = x, posY = y;
    if (x + rect.width > window.innerWidth) posX = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight) posY = window.innerHeight - rect.height - 8;
    WidgetState.contextMenu.style.left = `${posX}px`;
    WidgetState.contextMenu.style.top = `${posY}px`;

    requestAnimationFrame(() => WidgetState.contextMenu.classList.add('show'));
}

function hideContextMenu() {
    if (WidgetState.contextMenu) {
        WidgetState.contextMenu.remove();
        WidgetState.contextMenu = null;
    }
}

function getMenuIcon(icon) {
    const icons = {
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
        external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>',
        theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    };
    return `<span class="ctx-icon">${icons[icon] || ''}</span>`;
}

function openSettings() {
    openDrawer();
}

function switchWallpaperMode(mode) {
    selectWallpaperType(mode);
}

/* =========================================
   拖拽排序快捷方式（丝滑 FLIP）
   ========================================= */
WidgetState.draggedItem = null;
WidgetState.dragThrottle = null;

function initDragSort() {
    const container = document.getElementById('shortcuts-container');

    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.shortcut-item');
        if (!item) return;
        WidgetState.draggedItem = item;
        setTimeout(() => item.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
    });

    container.addEventListener('dragend', () => {
        if (WidgetState.draggedItem) WidgetState.draggedItem.classList.remove('dragging');
        WidgetState.draggedItem = null;
        if (WidgetState.dragThrottle) { WidgetState.dragThrottle = null; }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!WidgetState.draggedItem || WidgetState.dragThrottle) return;

        WidgetState.dragThrottle = requestAnimationFrame(() => {
            WidgetState.dragThrottle = null;
            if (!WidgetState.draggedItem) return;

            const target = e.target.closest('.shortcut-item');
            if (!target || target === WidgetState.draggedItem) return;

            const rect = target.getBoundingClientRect();
            const after = (e.clientX - rect.left) > rect.width / 2;

            // 判断是否真的需要移动（避免无效 FLIP）
            const isAlreadyAfter = WidgetState.draggedItem === target.nextSibling;
            const isAlreadyBefore = WidgetState.draggedItem === target;
            if ((after && isAlreadyAfter) || (!after && isAlreadyBefore)) return;

            // FLIP: First
            const allItems = [...container.querySelectorAll('.shortcut-item')];
            const firstRects = new Map();
            allItems.forEach(item => {
                if (item !== WidgetState.draggedItem) firstRects.set(item, item.getBoundingClientRect());
            });

            // 移动 DOM
            if (after) {
                target.parentNode.insertBefore(WidgetState.draggedItem, target.nextSibling);
            } else {
                target.parentNode.insertBefore(WidgetState.draggedItem, target);
            }

            // FLIP: Last + Invert
            allItems.forEach(item => {
                if (item === WidgetState.draggedItem) return;
                const oldRect = firstRects.get(item);
                if (!oldRect) return;
                const newRect = item.getBoundingClientRect();
                const dx = oldRect.left - newRect.left;
                const dy = oldRect.top - newRect.top;
                if (dx === 0 && dy === 0) return;

                // Invert: 瞬间偏移到旧位置
                item.style.transition = 'none';
                item.style.transform = `translate(${dx}px, ${dy}px)`;
                item.style.willChange = 'transform';
            });

            // FLIP: Play（双 rAF 确保浏览器已应用 Invert）
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    allItems.forEach(item => {
                        if (item === WidgetState.draggedItem) return;
                        if (item.style.transform) {
                            item.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.4, 1)';
                            item.style.transform = '';
                            const cleanup = () => {
                                item.style.transition = '';
                                item.style.willChange = '';
                                item.removeEventListener('transitionend', cleanup);
                            };
                            item.addEventListener('transitionend', cleanup);
                        }
                    });
                });
            });
        });
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!WidgetState.draggedItem) return;

        const items = [...container.querySelectorAll('.shortcut-item')];
        const newOrder = items.map(item => parseInt(item.dataset.id));
        const shortcuts = SettingsManager.get('shortcuts') || [];

        // Q6: 按顺序收集，同 id 时只保留第一次出现的那条，避免历史数据/导入损坏导致丢项
        const seen = new Set();
        const reordered = [];
        newOrder.forEach(id => {
            if (seen.has(id)) return;
            seen.add(id);
            const s = shortcuts.find(sc => sc.id === id);
            if (s) reordered.push(s);
        });
        SettingsManager.set('shortcuts', reordered);
        renderShortcutsList();
    });
}

/* =========================================
   工具函数
   ========================================= */
function compressImage(file, maxSize, quality, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // 等比缩放到 maxSize 以内
            if (width > height) {
                if (width > maxSize) { height = height * maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // WebP 有损压缩：quality 参数生效，体积比 PNG 小 5-10 倍。
            // 图标 256px 时体积差异不大但也不亏；壁纸 1920px 时差异显著。
            callback(canvas.toDataURL('image/webp', quality));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* =========================================
   图标文件读取（支持 SVG 原样保留）
   ========================================= */
// 读取图标文件：SVG 保持矢量（base64 data-url），栅格图压缩到 256px PNG
function readIconFile(file, callback) {
    if (!file) return;
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);

    if (isSvg) {
        // SVG：原样读取文本并编码为 data-url，保留矢量
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const b64 = btoa(unescape(encodeURIComponent(text)));
                callback(`data:image/svg+xml;base64,${b64}`, 'svg');
            } catch (err) {
                showToast('SVG 文件解析失败', 'error');
            }
        };
        reader.onerror = () => showToast('读取文件失败', 'error');
        reader.readAsText(file);
        return;
    }

    // 栅格图：维持 2MB 限制，压缩到 256px 提升清晰度
    if (file.size > 2 * 1024 * 1024) {
        showToast('图标不能超过 2MB', 'error');
        return;
    }
    compressImage(file, 256, 0.9, (dataUrl) => callback(dataUrl, 'raster'));
}

/* =========================================
   图标编辑器（裁切 = 缩放 + 平移 / 独立背景）
   ========================================= */
const iconEditorState = {
    source: '',
    type: 'raster',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    bgMode: 'global',     // 'global' | 'transparent' | 'color'
    bgColor: '#ffffff',
    onConfirm: null,
    _drag: null,          // 拖动状态
};

function initIconEditor() {
    const overlay = document.getElementById('icon-editor-overlay');
    const stage = document.getElementById('icon-editor-stage');
    const img = document.getElementById('icon-editor-img');
    const scaleSlider = document.getElementById('icon-editor-scale');
    const scaleValue = document.getElementById('icon-editor-scale-value');
    const bgColorInput = document.getElementById('icon-editor-bg-color');
    const resetBtn = document.getElementById('icon-editor-reset');
    const cancelBtn = document.getElementById('icon-editor-cancel');
    const confirmBtn = document.getElementById('icon-editor-confirm');

    if (!overlay) return;

    // 缩放滑块
    scaleSlider.addEventListener('input', () => {
        iconEditorState.scale = parseInt(scaleSlider.value) / 100;
        scaleValue.textContent = `${scaleSlider.value}%`;
        applyIconEditorTransform();
    });

    // 滚轮缩放
    stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        const next = Math.min(400, Math.max(50, parseInt(scaleSlider.value) + delta));
        scaleSlider.value = next;
        iconEditorState.scale = next / 100;
        scaleValue.textContent = `${next}%`;
        applyIconEditorTransform();
    }, { passive: false });

    // 拖动平移：dx/dy 换算为「舞台尺寸」的百分比（与渲染端 object-fit:contain 配合）
    const onPointerDown = (e) => {
        iconEditorState._drag = {
            startX: e.clientX,
            startY: e.clientY,
            baseX: iconEditorState.offsetX,
            baseY: iconEditorState.offsetY,
            stageW: stage.clientWidth,
            stageH: stage.clientHeight,
        };
        img.setPointerCapture && img.setPointerCapture(e.pointerId);
        stage.classList.add('dragging');
    };
    const onPointerMove = (e) => {
        const d = iconEditorState._drag;
        if (!d) return;
        const dx = (e.clientX - d.startX) / d.stageW * 100;
        const dy = (e.clientY - d.startY) / d.stageH * 100;
        // 限制偏移范围，避免图片拖出舞台
        const maxOffset = (iconEditorState.scale - 1) * 50;
        iconEditorState.offsetX = clamp(d.baseX + dx, -maxOffset, maxOffset);
        iconEditorState.offsetY = clamp(d.baseY + dy, -maxOffset, maxOffset);
        applyIconEditorTransform();
    };
    const onPointerUp = (e) => {
        if (iconEditorState._drag) {
            iconEditorState._drag = null;
            stage.classList.remove('dragging');
        }
    };

    img.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);

    // 背景单选
    document.querySelectorAll('input[name="icon-editor-bg"]').forEach(radio => {
        radio.addEventListener('change', () => {
            iconEditorState.bgMode = radio.value;
            applyIconEditorBg();
        });
    });
    // 颜色选择器：选色即切到 color 模式
    bgColorInput.addEventListener('input', () => {
        iconEditorState.bgColor = bgColorInput.value;
        document.querySelector('input[name="icon-editor-bg"][value="color"]').checked = true;
        iconEditorState.bgMode = 'color';
        applyIconEditorBg();
    });

    resetBtn.addEventListener('click', () => {
        iconEditorState.scale = 1;
        iconEditorState.offsetX = 0;
        iconEditorState.offsetY = 0;
        scaleSlider.value = 100;
        scaleValue.textContent = '100%';
        applyIconEditorTransform();
    });

    cancelBtn.addEventListener('click', closeIconEditor);

    confirmBtn.addEventListener('click', () => {
        const style = {
            scale: round(iconEditorState.scale, 3),
            offsetX: round(iconEditorState.offsetX, 3),
            offsetY: round(iconEditorState.offsetY, 3),
            bgEnabled: iconEditorState.bgMode !== 'global',
            bgColor: iconEditorState.bgMode === 'color'
                ? iconEditorState.bgColor
                : 'transparent',
        };
        // 如果没有任何调整 + 跟随全局，返回 null 以保持向后兼容
        const isDefault = style.scale === 1 && style.offsetX === 0
            && style.offsetY === 0 && !style.bgEnabled;
        const result = {
            src: iconEditorState.source,
            type: iconEditorState.type,
            iconStyle: isDefault ? null : style,
        };
        const cb = iconEditorState.onConfirm;
        closeIconEditor();
        if (cb) cb(result);
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeIconEditor();
    });
}

function applyIconEditorTransform() {
    const img = document.getElementById('icon-editor-img');
    if (!img) return;
    const { scale, offsetX, offsetY } = iconEditorState;
    img.style.transform = `translate(${offsetX}%, ${offsetY}%) scale(${scale})`;
}

function applyIconEditorBg() {
    const stage = document.getElementById('icon-editor-stage');
    if (!stage) return;
    if (iconEditorState.bgMode === 'color') {
        stage.style.backgroundColor = iconEditorState.bgColor;
    } else if (iconEditorState.bgMode === 'transparent') {
        stage.style.backgroundColor = 'transparent';
    } else {
        // 跟随全局：还原棋盘格底纹
        stage.style.backgroundColor = '';
    }
}

// 打开图标编辑器。options: { source, type, existingStyle, onConfirm(result) }
function openIconEditor(options) {
    const overlay = document.getElementById('icon-editor-overlay');
    const img = document.getElementById('icon-editor-img');
    const scaleSlider = document.getElementById('icon-editor-scale');
    const scaleValue = document.getElementById('icon-editor-scale-value');
    const bgColorInput = document.getElementById('icon-editor-bg-color');
    if (!overlay || !img) return;

    iconEditorState.source = options.source;
    iconEditorState.type = options.type || 'raster';
    const es = options.existingStyle || {};
    iconEditorState.scale = es.scale || 1;
    iconEditorState.offsetX = es.offsetX || 0;
    iconEditorState.offsetY = es.offsetY || 0;
    iconEditorState.onConfirm = options.onConfirm || null;

    img.src = options.source;
    const scalePct = Math.round(iconEditorState.scale * 100);
    scaleSlider.value = clamp(scalePct, 50, 400);
    scaleValue.textContent = `${scaleSlider.value}%`;

    // 背景状态
    if (es.bgEnabled) {
        if (es.bgColor && es.bgColor !== 'transparent') {
            iconEditorState.bgMode = 'color';
            iconEditorState.bgColor = es.bgColor;
            bgColorInput.value = es.bgColor;
        } else {
            iconEditorState.bgMode = 'transparent';
        }
    } else {
        iconEditorState.bgMode = 'global';
    }
    const radio = document.querySelector(`input[name="icon-editor-bg"][value="${iconEditorState.bgMode}"]`);
    if (radio) radio.checked = true;

    applyIconEditorTransform();
    applyIconEditorBg();

    overlay.classList.add('open');
}

function closeIconEditor() {
    const overlay = document.getElementById('icon-editor-overlay');
    if (overlay) overlay.classList.remove('open');
    iconEditorState._drag = null;
    iconEditorState.onConfirm = null;
}

/* 根据 iconStyle 生成图片内联 transform（渲染端通用） */
function iconStyleToTransform(style) {
    if (!style) return '';
    const scale = style.scale != null ? style.scale : 1;
    const ox = style.offsetX || 0;
    const oy = style.offsetY || 0;
    if (scale === 1 && ox === 0 && oy === 0) return '';
    return `transform: translate(${ox}%, ${oy}%) scale(${scale}); transform-origin: center center;`;
}

/* 根据 iconStyle 生成容器内联背景（设背景后脱离全局 --icon-bg 控制） */
function iconStyleToBg(style) {
    if (!style || !style.bgEnabled) return '';
    if (style.bgColor && style.bgColor !== 'transparent') {
        return `background-color: ${style.bgColor} !important;`;
    }
    return `background-color: transparent !important;`;
}
