/* =========================================
   packager.js  —  开发者安装包打包器
   职责：把扩展自身的源文件抓取并打包成 ZIP，
         供 chrome://extensions「开发者模式 → 加载已解压的扩展程序」使用。
   特点：零第三方依赖。CRC32 手写表驱动；
         压缩用浏览器原生 CompressionStream('deflate-raw')，
         不支持时自动回退到 STORE（不压缩）。
   加载顺序：在 widgets.js 之后加载
   ========================================= */

/* 内置搜索引擎图标 key（与 icons/search-engine/<key>.svg 一一对应） */
const PACKAGER_ENGINE_ICONS = [
    'baidu', 'bilibili', 'bing', 'douban', 'douyin', 'duckduckgo',
    'github', 'google', 'googlescholar', 'jd', 'sougou', 'taobao',
    'toutiao', 'weibo', 'xiaohongshu', 'yahoo', 'youtube', 'zhihu'
];

const Packager = {
    /* 需要打包的文件清单（相对扩展根目录）。
       抓取失败的文件会被静默跳过，保证整体打包不会中断。 */
    FILES: [
        // 清单
        'manifest.json',
        // 页面
        'newtab.html',
        'changelog.html',
        'converter.html',
        'index.html',
        // 样式
        'css/tokens.css',
        'css/base.css',
        'css/components.css',
        'css/pages.css',
        // 脚本
        'js/settings.js',
        'js/wp-cache.js',
        'js/kaomoji.js',
        'js/core.js',
        'js/sliders.js',
        'js/panels.js',
        'js/widgets.js',
        'js/page-theme.js',
        'js/changelog.js',
        'js/packager.js',
        // 图标
        'icons/Frostart2606-64px.png',
        'icons/Frostart2606-64px-margined.png',
        'icons/Frostart2606-256px.png',
        'icons/Frostart2606-256px-margined.png',
        'icons/gledery@250w_250h_1c.avif',
        'icons/phaswer-logo.png',
        ...PACKAGER_ENGINE_ICONS.map(k => `icons/search-engine/${k}.svg`),
        // 文档
        'LICENSE',
        'PRIVACY.md',
        'README.md'
    ],

    /* 把相对路径解析为扩展内可 fetch 的绝对 URL */
    _getUrl(path) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            return chrome.runtime.getURL(path);
        }
        return path;
    },

    /* 抓取单个文件为 Uint8Array，失败返回 null */
    async _fetchFile(path) {
        try {
            const res = await fetch(this._getUrl(path));
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            return new Uint8Array(buf);
        } catch (e) {
            return null;
        }
    },

    /* 打包并触发下载 */
    async download() {
        const btn = document.getElementById('pack-download-btn');
        if (!btn) return;
        if (btn.disabled) return; // 防重复点击

        // 环境检测：打包靠 fetch 读取项目自身文件。
        // 扩展环境（chrome-extension:）通过 chrome.runtime.getURL 抓取；
        // 在线网页（http/https）通过相对路径抓取，二者皆可。
        // 仅本地 file:// 直接打开时浏览器会拦截 fetch，读不到文件。
        if (location.protocol === 'file:') {
            showToast('本地直接打开无法打包哦，请用在线网页版或已加载的扩展新标签页', 'error');
            return;
        }

        const label = btn.querySelector('.pack-btn-label');
        const originalText = label ? label.textContent : '';
        btn.disabled = true;
        if (label) label.textContent = '打包中…';

        try {
            const entries = [];
            let fail = 0;
            for (const path of this.FILES) {
                const data = await this._fetchFile(path);
                if (data) {
                    entries.push({ name: path, data });
                } else {
                    fail++;
                }
            }
            // manifest.json 是扩展的核心，缺失则包无效
            if (!entries.some(e => e.name === 'manifest.json')) {
                throw new Error('无法读取 manifest.json');
            }
            if (entries.length === 0) throw new Error('没有抓到任何文件');

            const zip = await buildZip(entries);
            const blob = new Blob([zip], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ver = (typeof SettingsManager !== 'undefined' && SettingsManager.VERSION) || '0.0.0';
            a.href = url;
            a.download = `Frostart-v${ver}-dev.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            const extra = fail ? `（${fail} 个文件跳过）` : '';
            showToast(`安装包已生成~ 共 ${entries.length} 个文件${extra}`);
        } catch (e) {
            console.error('Packager error:', e);
            showToast('打包失败了：' + (e.message || '未知错误'), 'error');
        } finally {
            btn.disabled = false;
            if (label) label.textContent = originalText;
        }
    }
};

/* =========================================
   ZIP 编码（STORE / DEFLATE）
   ========================================= */

/* CRC32 表（标准多项式 0xEDB88320） */
const ZIP_CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc = (ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/* 把 JS Date 转为 DOS 时间/日期（ZIP 用） */
function dosDateTime(d) {
    const time = ((d.getHours() & 0x1F) << 11) |
                 ((d.getMinutes() & 0x3F) << 5) |
                 ((d.getSeconds() >> 1) & 0x1F);
    const date = (((d.getFullYear() - 1980) & 0x7F) << 9) |
                 (((d.getMonth() + 1) & 0x0F) << 5) |
                 (d.getDate() & 0x1F);
    return { time, date };
}

/* 用原生 CompressionStream 做 raw deflate 压缩。
   返回压缩后的 Uint8Array；不可用 / 失败 / 空数据时返回 null（回退 STORE）。 */
async function deflateRaw(uint8) {
    if (typeof CompressionStream === 'undefined' || uint8.length === 0) return null;
    try {
        const cs = new CompressionStream('deflate-raw');
        const writer = cs.writable.getWriter();
        writer.write(uint8);
        writer.close();
        const reader = cs.readable.getReader();
        const chunks = [];
        let total = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            total += value.length;
        }
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { out.set(c, off); off += c.length; }
        return out;
    } catch (e) {
        return null;
    }
}

/* 由 [{name, data}] 构建完整 ZIP 字节 */
async function buildZip(entries) {
    const now = dosDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBytes = encodeUtf8(entry.name);
        const crc = crc32(entry.data);

        // 压缩：仅当确实更小时才采用
        let method = 0; // STORE
        let stored = entry.data;
        const compressed = await deflateRaw(entry.data);
        if (compressed && compressed.length < entry.data.length) {
            method = 8; // DEFLATE
            stored = compressed;
        }
        const compSize = stored.length;
        const uncompSize = entry.data.length;

        // —— 本地文件头（30 字节 + 文件名）——
        const lfh = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(lfh.buffer);
        lv.setUint32(0, 0x04034b50, true);        // 签名
        lv.setUint16(4, 20, true);                 // 需要版本 2.0
        lv.setUint16(6, 0, true);                  // 标志位
        lv.setUint16(8, method, true);             // 压缩方法
        lv.setUint16(10, now.time, true);          // 修改时间
        lv.setUint16(12, now.date, true);          // 修改日期
        lv.setUint32(14, crc, true);               // CRC-32
        lv.setUint32(18, compSize, true);          // 压缩大小
        lv.setUint32(22, uncompSize, true);        // 原始大小
        lv.setUint16(26, nameBytes.length, true);  // 文件名长度
        lv.setUint16(28, 0, true);                 // 额外字段长度
        lfh.set(nameBytes, 30);

        localParts.push(lfh, stored);

        // —— 中央目录记录（46 字节 + 文件名）——
        const cdh = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(cdh.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);                 // 制作版本
        cv.setUint16(6, 20, true);                 // 需要版本
        cv.setUint16(8, 0, true);                  // 标志位
        cv.setUint16(10, method, true);            // 压缩方法
        cv.setUint16(12, now.time, true);
        cv.setUint16(14, now.date, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, compSize, true);
        cv.setUint32(24, uncompSize, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);                 // 额外字段长度
        cv.setUint16(32, 0, true);                 // 注释长度
        cv.setUint16(34, 0, true);                 // 起始磁盘号
        cv.setUint16(36, 0, true);                 // 内部属性
        cv.setUint32(38, 0, true);                 // 外部属性
        cv.setUint32(42, offset, true);            // 本地头偏移
        cdh.set(nameBytes, 46);

        centralParts.push(cdh);
        offset += lfh.length + stored.length;
    }

    // 中央目录大小与起始偏移
    let centralSize = 0;
    for (const p of centralParts) centralSize += p.length;
    const centralOffset = offset;

    // —— 结束记录（22 字节）——
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);                       // 磁盘号
    ev.setUint16(6, 0, true);                       // 中央目录起始磁盘
    ev.setUint16(8, entries.length, true);          // 本磁盘记录数
    ev.setUint16(10, entries.length, true);         // 总记录数
    ev.setUint32(12, centralSize, true);            // 中央目录大小
    ev.setUint32(16, centralOffset, true);          // 中央目录偏移
    ev.setUint16(20, 0, true);                      // 注释长度

    // 合并所有片段
    const all = [...localParts, ...centralParts, eocd];
    let total = 0;
    for (const p of all) total += p.length;
    const zip = new Uint8Array(total);
    let pos = 0;
    for (const p of all) { zip.set(p, pos); pos += p.length; }
    return zip;
}

/* =========================================
   初始化
   ========================================= */
function initPackager() {
    const btn = document.getElementById('pack-download-btn');
    if (btn) btn.addEventListener('click', () => Packager.download());

    /* 「获取项目文件以安装」卡片是给在线预览（网页版）用户准备的——
       他们还没安装扩展，需要下载 ZIP 来加载。
       已安装为扩展的用户（运行在 chrome-extension: 协议下）隐藏此卡片。 */
    const packSection = document.querySelector('.pack-section');
    if (packSection) {
        const isExtension = location.protocol === 'chrome-extension:';
        if (isExtension) {
            packSection.style.display = 'none';
        }
    }
}
