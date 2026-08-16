# 心情日记 📝

一个纯前端的私人日记 PWA，核心功能是**记录今天的心情**，以及回望**往年今日**写下的文字。

- ✅ 完全本地存储（数据存在手机浏览器 IndexedDB 里，**不经过任何服务器**）
- ✅ 无账号、无云端、无广告
- ✅ 情绪 emoji + 5 维度打分（心情/精力/睡眠/健康/锻炼）
- ✅ 支持照片（偶尔几张）
- ✅ 往年今日回顾
- ✅ 心情热力图（全年心情一览）
- ✅ 时光胶囊（写信给未来的自己）
- ✅ 历史日历浏览 + 补记
- ✅ 数据导出 / 导入备份

## 文件说明

```
index.html     页面结构
style.css      样式
app.js         界面逻辑
db.js          IndexedDB 数据层
manifest.json  PWA 清单
sw.js          Service Worker（离线缓存）
icons/         应用图标
```

## 本地运行

需要先起一个 HTTP 服务器（直接双击打开 HTML 无法使用 IndexedDB 和 PWA）：

```bash
cd daily
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000`。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（例如 `diary`），把本目录推上去：
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/你的用户名/diary.git
   git push -u origin main
   ```
2. 在 GitHub 仓库页面 → **Settings** → **Pages** → Source 选 `Deploy from a branch`，分支选 `main`，目录 `/ (root)` → Save。
3. 稍等片刻，访问 `https://你的用户名.github.io/diary/` 即可。

## 在手机上「安装」（添加到主屏幕）

1. 用手机 Chrome 打开上面的网址
2. 点右上角菜单（⋮）→ **添加到主屏幕 / 安装应用**
3. 桌面出现「心情日记」图标，点开就像原生 App，全屏、可离线使用

## 数据备份（重要）

所有日记只存在**这一台手机的浏览器**里。如果你：
- 清除浏览器数据
- 更换手机
- 更换浏览器

数据会丢失。请在「设置」页定期点击 **导出全部数据**，把 JSON 文件保存到手机里（或发给自己）。换设备后在「设置」页 **导入备份** 即可恢复。

## 更新代码

代码改动后重新 push，手机上一般会自动更新。若发现没更新，把 `sw.js` 里的 `CACHE_NAME` 版本号 `+1`（例如 `diary-cache-v2`），浏览器会重新拉取缓存。

## 之后打包成 APK（可选）

这套代码可以无缝打包成真正的安卓安装包，数据可改存到手机文件系统（更可靠）。需要时再配置 Android 构建环境即可。
