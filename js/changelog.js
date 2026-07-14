/* =========================================
   changelog.js  —  更新日志渲染
   职责：版本数据 / 侧边栏导航 / 版本卡片渲染 / 滚动联动
   注意：MV3 默认 CSP 禁止内联 <script>，从 changelog.html 抽成外部文件。
   ========================================= */

const versions = [
    {
        version: '1.0.6', date: '2026-7-13',
        changes: [
            '重构：抽取工具函数到 js/utils/ 目录（数学、字符串、版本比较、色彩转换）',
            '重构：合并字体加载函数，消除 core.js 和 panels.js 之间的重复代码',
            '重构：抽取公共服务层 services.js，解除模块间的循环依赖',
            '清理：项目中所有 var 替换为 let/const',
            '规范化：统一所有 JS 文件的头部注释格式',
        ]
    },
    {
        version: '1.0.6 beta', date: '2026-7-14',
        changes: [
            '新增贡献指南（CONTRIBUTING.md）及 Issue / PR 模板以规范协作流程',
            'README 贡献章节新增改动分类指引',
            '关于此项目卡片新增「贡献指南」入口',
        ]
    },    
    {
        version: '1.0.5', date: '2026-7-11',
        changes: [
            '与 PhasWer 同步更新了新版的 pw-switch 并扩展了点击区域',
            '统一了所有小按钮的 active 交互反馈：按下回缩改为 scale(0.85)，hover 不再使用 translateY',
            '标签页导航 tab-btn 添加了 hover 浮起和 active 回缩动画',
        ]
    },
    {
        version: '1.0.4', date: '2026-7-10',
        changes: [
            '优化了时钟性能：缓存 DOM 引用和日期字符串以避免每秒重复调用 toLocaleDateString 和创建 Intl 格式化器',
            '缓存了农历日期的 Intl.DateTimeFormat 实例',
            '优化了壁纸渲染：缓存 blob alpha 值，避免拖动滑块时 getComputedStyle 每次触发强制回流',
            '优化了 escapeHtml：用字符串替换替代每次创建 DOM 元素',
            '移除了图标元素的永久 will-change，减少不必要的 GPU 图层开销',
        ]
    },
    {
        version: '1.0.3', date: '2026-7-7',
        changes: [
            '修复了扩展里点开 README / 隐私声明中文会乱码的问题',
            '在 README 中添加了有关浏览器兼容性的说明',
        ]
    },
    {
        version: '1.0.2', date: '2026-6-29',
        changes: [
            '修了一堆 innerHTML 没转义的 Bug',
            '修复了上传非正方形自定义图标时被 object-fit:cover 提前裁掉的问题',
        ]
    },
    {
        version: '1.0.1', date: '2026-6-28',
        changes: [
            '修复了网页版点击下载安装包会提示需要先把插件加载到浏览器导致根本装不上的问题（我去竟然错在最逆天的地方了',
            '重写了更新检查：不再依赖 GitHub Releases，改成直接读 GitHub 上 manifest.json 的 version 字段做对比（懒是人类之光',
            '清掉了一堆老版本配置迁移代码（反正一个用户都没有x',
            '关于此项目卡片新增了项目说明（README）入口',
        ]
    },
    {
        version: '1.0.0', date: '2026-6-25',
        changes: [
            '开香槟！！！！Frostart的第一个公开测试版！！！',
            '此版本与含有新增卡片的PhasWer主站的3.10.1版本同步发布',
            '新增了更新检查功能，打开新标签页自动检查 GitHub Releases，有新版时检查更新按钮会变为发现更新（特别漂亮的按钮OwU）',
            '修复了已安装为扩展时仍显示获取项目文件以安装卡片的问题',
            '修改了安装说明和更新说明',
        ]
    },
    {
        version: '0.1.16', date: '2026-6-24',
        changes: [
            '新增了存储空间用量指示器',
            '新增了必应每日壁纸模式',
            '修复了从图片壁纸切回渐变/纯色模式时缺少淡出过渡动画的问题',
        ]
    },
    {
        version: '0.1.15', date: '2026-6-23',
        changes: [
            '「恢复默认设置」移到了导出和导入按钮旁边',
            '用自定义弹窗替换了所有原生 confirm()',
            '修复了刚进入新标签页时视觉设置会从默认闪到用户配置的 FOUC 问题',
            '修复了 Toast 在 async 调用后不播放入场动画的问题',
        ]
    },
    {
        version: '0.1.14', date: '2026-6-22',
        changes: [
            '新增了下载安装包的功能',
        ]
    },
    {
        version: '0.1.13', date: '2026-6-21',
        changes: [
            '修复了字体栈写了 HarmonyOS Sans SC 却没有 @font-face的问题',
            '新增了时钟在标签页隐藏时自动暂停的功能以节省资源',
            '清理了多处永久 will-change 和过度的模糊，降低 GPU 开销',
            '全局变量收拢到 Frostart.state / WidgetState 命名空间以减少命名冲突',
            '新增了发版检查清单（RELEASE_CHECKLIST.md）',
        ]
    },
    {
        version: '0.1.12', date: '2026-6-20',
        changes: [
            '修复了图片压缩使用 PNG 格式导致壁纸占用存储过大的问题',
            '修复了导入配置后主题按钮重复绑定事件监听的问题',
            '修复了右键菜单「在新标签打开」未校验 URL 协议的问题',
            '修复了每次编辑快捷方式时所有图标重新播放入场动画的问题',
            '修复了拖拽排序时重复 id 会导致快捷方式丢失的问题',
            '更新日志和落地页的内联脚本改为外部文件以符合 MV3 CSP 规范',
        ]
    },
    {
        version: '0.1.11', date: '2026-6-19',
        changes: [
            '为开源做准备：新增了 README.md 和 PRIVACY.md',
            '转换工具重写成了完全自包含的单文件',
            '删除了没人引用的 js/converter.js',
            '关于卡片加了 GitHub 仓库和隐私声明的链接入口',
            '内置了 FROSTART_DEFAULTS 默认配置，转换工具不再依赖 settings.js',
        ]
    },
    {
        version: '0.1.10', date: '2026-6-18',
        changes: [
            '修复了时钟数字字体预览按钮全部显示为默认字体的问题',
            '光斑颜色的跟随渐变从按钮改为了开关',
            '修复了刚进入新标签页时壁纸会从默认色闪一下到自定义壁纸的问题',
            '修正了首次使用时默认壁纸不是晨雾蓝的问题',
            '现在光斑颜色指示框现在会跟随实际生效的光斑色变化',
            '更新日志的 hero 区域和版本说明文案复制了 PhasWer 主站的文案',
            '转换工具的背景改为了默认壁纸',
        ]
    },
    {
        version: '0.1.9', date: '2026-6-17',
        changes: [
            '默认快捷方式改用内置 SVG',
            '修正了 about-logo 缩放方向',
            '给滑块、拾色器、按钮等元素补充了阴影',
            '添加了 favicon',
            '采用 GPL-3.0 协议，添加了 LICENSE 文件',
        ]
    },
    {
        version: '0.1.8', date: '2026-6-16',
        changes: [
            '"数据"标签页改名为"数据与关于"，新增项目介绍与作者卡片',
            '头像和 logo 从圆形改成了圆角矩形',
            '设计了新的 Frostart 图标',
        ]
    },
    {
        version: '0.1.7', date: '2026-6-15',
        changes: [
            '修复了点壁纸预设后设置不保存的问题',
            '修复了光斑颜色显示与拾色器不一致的问题',
            '修正了农历写法不标准的问题',
            '搜索栏聚焦高光现在跟随 accent',
            '移除了打开设置时的背景变暗和模糊遮罩',
        ]
    },
    {
        version: '0.1.6', date: '2026-6-14',
        changes: [
            '把角落的 Kaomoji 从 PhasWer 主站搬过来了，删除了原本针对各子页面的欢迎语',
            '外观面板新增"主题色"，8 个预设 + 拾色器',
            '新增了光斑颜色可以单独控制',
        ]
    },
    {
        version: '0.1.5', date: '2026-6-13',
        changes: [
            '把的 app.js 拆分成了 core / sliders / panels / widgets 四个模块',
            '把的 styles.css 拆分成了 tokens / base / components / pages 四层',
            '转换工具改为了引用主站共享样式并跟随主题',
            '新增了更新日志 (changelog.html) 入口',
            '转换工具的转换逻辑抽离为了独立的 converter.js',
        ]
    }
];

function getVersionLevel(v) {
    const parts = v.split('.');
    if (parts[1] === '0' && parts[2] === '0') return 'major';
    if (parts[2] === '0') return 'minor';
    return 'patch';
}

const LEVEL_COLORS = {
    major: '#27ae60',
    minor: '#6dbf8b',
    patch: '#b8deca'
};

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';
    if (!versions.length) {
        sidebar.style.display = 'none';
        return;
    }
    sidebar.style.display = '';
    let currentMajor = null;
    versions.forEach(function (v) {
        const major = v.version.split('.')[0];
        if (major !== currentMajor) {
            currentMajor = major;
            const title = document.createElement('div');
            title.className = 'sidebar-section-title';
            title.textContent = 'v' + major + '.x';
            sidebar.appendChild(title);
        }
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.version = v.version;
        const dot = document.createElement('span');
        dot.className = 'sidebar-dot';
        dot.style.background = LEVEL_COLORS[getVersionLevel(v.version)];
        item.appendChild(dot);
        item.appendChild(document.createTextNode('v' + v.version));
        item.addEventListener('click', function () {
            const el = document.getElementById('v-' + v.version);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight');
                setTimeout(function () { el.classList.remove('highlight'); }, 1500);
            }
        });
        sidebar.appendChild(item);
    });
}

function renderVersions() {
    const list = document.getElementById('versionList');
    list.innerHTML = '';
    if (!versions.length) {
        const empty = document.createElement('div');
        empty.className = 'version-empty';
        empty.textContent = '暂无版本记录';
        list.appendChild(empty);
        return;
    }
    versions.forEach(function (v) {
        const level = getVersionLevel(v.version);
        const card = document.createElement('div');
        card.className = 'version-card';
        card.id = 'v-' + v.version;
        card.dataset.level = level;

        const header = document.createElement('div');
        header.className = 'version-header';

        const badge = document.createElement('span');
        badge.className = 'version-badge';
        badge.textContent = 'v' + v.version;

        const date = document.createElement('span');
        date.className = 'version-date';
        date.textContent = v.date;

        header.appendChild(badge);
        header.appendChild(date);

        const inner = document.createElement('div');
        inner.className = 'version-body-inner';

        v.changes.forEach(function (desc) {
            const item = document.createElement('div');
            item.className = 'change-item';
            item.textContent = desc;
            inner.appendChild(item);
        });

        card.appendChild(header);
        card.appendChild(inner);
        list.appendChild(card);
    });
}

function initScrollSpy() {
    const sidebar = document.getElementById('sidebar');
    const items = document.querySelectorAll('.sidebar-item');
    const cards = document.querySelectorAll('.version-card');

    sidebar.addEventListener('wheel', function (e) {
        e.stopPropagation();
    }, { passive: true });

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const ver = entry.target.id.replace('v-', '');
                items.forEach(function (item) {
                    const isActive = item.dataset.version === ver;
                    item.classList.toggle('active', isActive);
                    if (isActive) {
                        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                });
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    cards.forEach(function (card) { observer.observe(card); });
}

// 仅在 changelog 页面（存在对应 DOM 时）执行渲染，避免在 newtab 等页面加载本文件时报错
if (document.getElementById('sidebar') && document.getElementById('versionList')) {
    renderSidebar();
    renderVersions();
    initScrollSpy();
}

// 入场动画触发：与 PhasWer 一致，window.load 后添加 .animate-in
window.addEventListener('load', function () {
    const hero = document.querySelector('.changelog-hero');
    if (hero) hero.classList.add('animate-in');
});
