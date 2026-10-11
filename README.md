# CueFlow 手机提词器

零依赖、可安装的 PWA。支持英文台词、本地自动保存、自动滚动、字号/速度、镜像、屏幕常亮、前置摄像头预览与浏览器内录像。

## 本地运行

相机权限要求 HTTPS 或 localhost：

```bash
cd teleprompter
python3 -m http.server 4173
```

电脑打开 `http://localhost:4173`。手机安装时应部署到 HTTPS 地址，然后：

- iPhone Safari：用 Safari 打开 HTTPS 地址 → 点底部“分享” → 向下滑动 → “添加到主屏幕” → “添加”
- Android Chrome：菜单 → 安装应用

录像格式由浏览器决定。iPhone 上建议使用最新版 Safari；不支持网页录像时，应用仍可作为纯提词器使用。
