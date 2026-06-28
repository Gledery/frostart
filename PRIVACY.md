# 隐私声明

**最后更新：2026-06-26**

**关于隐私：**

你的全部配置都只存在本地浏览器里，通过 `chrome.storage.local` API 读写。Frostart 不会收集，上传，分析任何数据，你可以放心用。

---

## 本地存储

- **扩展环境**：用 `chrome.storage.local`，数据只在你本机的浏览器配置文件里。
- **纯网页环境**（比如 converter.html 被当成独立网页打开时）：降级用 `localStorage`。
- 你随时可以：设置 → 数据与关于 → **导出** 把配置下载成 JSON 自行备份。
- 你随时可以：设置 → 数据与关于 → **恢复默认设置** 清空所有配置。

---

## 外部请求

插件运行时会由浏览器向以下第三方发起请求（这些请求直连第三方，不经过本项目，本项目也不收集任何回传数据）：

- **自定义字体**：当你设置了非系统字体时，浏览器会向 `fonts.googleapis.com`（Google Fonts）请求字体文件
- **默认图标**：快捷方式未上传自定义图标时，浏览器会向 `icons.duckduckgo.com`（DuckDuckGo favicon 服务）请求该网站的图标。请求 URL 形如 `https://icons.duckduckgo.com/ip3/<目标域名>.ico`
- **必应每日壁纸**：当你选择"必应每日壁纸"模式时，浏览器会向 `www.bing.com` 请求壁纸数据和图片。数据接口形如 `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`，图片 URL 形如 `https://www.bing.com/az/hprichbg/rb/<图片名>_1920x1080.jpg`

鸢没有服务器，既看不到也无法获取这些请求的内容。若你希望完全不发起任何外部请求，可只使用系统字体、为快捷方式上传自定义图标，且不开启必应每日壁纸模式。

---

## 用户上传的内容

你上传的壁纸和图标完全在浏览器本地处理（Canvas 压成 PNG 或 base64 编码），不会上传到任何服务器。处理完的数据以 base64 字符串形式存进本地存储。

注意 `chrome.storage.local` 有 5MB 配额限制，超大壁纸可能存不下（这种情况插件会自动降级）。

---

## 权限

manifest.json 中申请了以下权限和主机权限：

```json
{
  "permissions": ["storage"],
  "host_permissions": ["*://*.bing.com/*"]
}
```

- `storage`：用于在本地浏览器中保存你的配置（壁纸、快捷方式、主题等）
- `host_permissions`（`*.bing.com`）：用于必应每日壁纸功能，允许浏览器向 Bing 官方接口请求壁纸数据和图片

---

## 第三方服务的隐私政策

插件本身不收集数据，但加载的外部资源受对应服务方约束：

- Google Fonts: https://policies.google.com/privacy
- DuckDuckGo: https://duckduckgo.com/privacy
- Microsoft Bing: https://privacy.microsoft.com/zh-cn/privacystatement

---

## 关于开源

此插件是开源的：

- 源代码仓库：[GitHub - Gledery/Frostart](https://github.com/Gledery/Frostart)
- 许可证：GPL-3.0（见 [LICENSE](./LICENSE)）

---

## 联系和贡献

对本声明有疑问、或者发现有什么行为跟声明对不上的，欢迎反馈：

- B 站：[灰鸢 Gledery](https://space.bilibili.com/3461577804089941)
- GitHub Issues：[提交 Issue](https://github.com/Gledery/Frostart/issues)

---

## 声明变更

本声明可能随项目迭代更新。功能性变更会在 [更新日志](./changelog.html) 里说明。Frostart不会自动更新，如果你手动下载并更新即视为接受最新版本。
