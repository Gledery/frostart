# Frostart

> 做了个新标签页插件，主要是想自己用，顺便开源出来

![license](https://img.shields.io/badge/license-GPL--3.0-blue)
![manifest](https://img.shields.io/badge/manifest-v3-success)
![version](https://img.shields.io/badge/version-1.0.0-informational)

---

## 这是什么

**Frostart** 是鸢做的一款可高度自定义的本地毛玻璃浏览器首页插件~

设计语言继承自我自己维护的 [PhasWer 小站](https://phaswer.pages.dev/)。这其实是我第一次写这种工具性的项目，所以肯定有各种问题，慢慢改吧。

## 功能列表

写在这里主要是备忘，可能会有更新不及时的地方，欢迎指正。

### 视觉与主题
- 浅色 / 深色 / 跟随系统
- 自定义主题色（accent）
- 四种壁纸模式：渐变 / 纯色 / 图片上传 / 必应每日壁纸
- 自定义渐变颜色、角度
- 派生光斑（根据背景色算的，低饱和背景也能有光斑）
- 壁纸颜色变化用 `@property` 类型化变量做成了可插值过渡

### 时钟
- 12/24 小时制
- 显示秒、星期、农历
- 时钟字体可以和正文字体分开设置
- 右键时钟：复制时间 / 切时制 / 切显示秒

### 搜索
- 17 个内置引擎
- 自定义引擎（URL 里用 `%s` 当关键词占位）
- 搜索框左侧的引擎图标可以点开快捷切换列表
- `/` 聚焦搜索框

### 快捷方式
- 拖拽排序（FLIP 动画）
- 图标支持上传图片 / SVG / 自动抓 favicon（DuckDuckGo 接口）
- 图标编辑器：缩放、平移、独立背景色
- 右键菜单：编辑 / 新标签打开 / 删除

### 设置面板
- 六个分区：外观 / 时钟 / 文本 / 壁纸 / 搜索 / 图标 / 数据与关于
- 设置项搜索（抽屉打开时按 `/`）
- 所有改动实时生效
- 配置导出 / 导入 / 恢复默认
- 自动检查更新（GitHub Releases）

### 彩蛋
- **角落 Kaomoji**：藏在右下角的颜文字，随你的点击节奏分三阶段切换表情（开心 → 无奈 → 崩溃），空闲时还会做点小动作。这个是从 PhasWer 主站移植过来的。

---

## 安装

### 方式一：从源码加载

1. Clone 或下载本仓库。
2. 打开 `chrome://extensions/`。
3. 右上角开 **开发者模式**。
4. 点 **加载已解压的扩展程序**，选仓库根目录。
5. 开个新标签页就能看到了。

> Edge / Brave / Vivaldi / Arc 这些 Chromium 系的浏览器应该也都能用，没全部测过。

### 方式二：从 Release 下载 zip

去 [Releases](https://github.com/Gledery/Frostart/releases) 下载最新 zip，解压后按方式一的步骤 2–5 加载。

---

## 更新

由于这个插件是以已解压的扩展程序加载的，Chrome 不会自动更新，需要手动操作：

1. 插件会在打开新标签页时自动检查 GitHub Releases 是否有新版本（每 6 小时一次）。如果有，版本号旁边会显示一个醒目的徽章。
2. 也可以在 **设置 → 数据与关于 → 关于此项目** 里点「检查更新」手动检查。
3. 发现新版本后，点击徽章跳转到 Releases 页面，下载新版 zip。
4. 解压并用新文件替换旧的扩展目录（或放一个新的目录）。

> 配置保存在浏览器的 `chrome.storage.local` 里，更新代码不会丢失设置。

---

## 项目结构

```
Frostart/
├── manifest.json              # MV3 清单
├── newtab.html                # 主新标签页
├── converter.html             # iTab ⇄ Frostart 转换工具（独立网页，不属于扩展页面）
├── changelog.html             # 更新日志
├── index.html                 # 落地页（非必需）
├── css/
│   ├── tokens.css             # 设计令牌（@property / 主题变量）
│   ├── base.css               # 重置 / 壁纸系统 / 玻璃效果
│   ├── components.css         # 组件层
│   └── pages.css              # 页面专属
├── js/
│   ├── settings.js            # 配置管理（防抖保存、迁移、备份）
│   ├── wp-cache.js            # 首屏壁纸缓存
│   ├── page-theme.js          # 子页面主题同步
│   ├── changelog.js           # 更新日志渲染
│   ├── core.js                # 应用骨架
│   ├── sliders.js             # 滑块系统
│   ├── panels.js              # 设置面板
│   ├── widgets.js             # 右键菜单 / 拖拽 / 图标编辑器
│   └── kaomoji.js             # 角落颜文字
├── icons/
└── LICENSE                    # GPL-3.0
```

---

## 技术栈

使用的包括原生 JS，CSS Custom Properties + `@property` + `backdrop-filter`，Canvas 压图和 FLIP 动画。

之所以不上框架，一是插件就这么大没必要，二是想保持代码可直接阅读，这样想抄哪段直接拿走就行（只要遵守 GPL-3.0协议都欢迎）。

---

## 性能

首屏用了三层防线消除壁纸闪烁（内联缓存 → DOMContentLoaded → 首帧应用），动画遵守 `prefers-reduced-motion`。滑块支持点数值直接输入，还支持中文特殊词（`跟随` / `隐藏` / `胶囊`）。

---

## 隐私

**此插件不收集任何数据。** 详见 [PRIVACY.md](./PRIVACY.md)。

---

## 贡献

想反馈 bug 或者提建议，欢迎到 [GitHub Issues](https://github.com/Gledery/Frostart/issues) 提 issue，或者直接 [B 站私信](https://space.bilibili.com/3461577804089941) 找我。

---

## 协议

[GPL-3.0](./LICENSE) © 灰鸢 Gledery

---

<p align="center">
  © 灰鸢 Gledery 闲的没事用肝创建 (。・ω・。)<br>
  你滑到底了哇，去喝杯水吧~
</p>
