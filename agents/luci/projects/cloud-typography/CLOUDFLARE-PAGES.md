# Cloudflare Pages 迁移设置（免费）

当前 GitHub 仓库是私有仓库，请保持私有。Cloudflare Pages 支持连接私有 GitHub 仓库。
截至 2026-11-22，Pages 免费版每月 500 次构建，静态资源请求不计 Workers Functions 用量。

## 迁移目标

维持原 Netlify 路径：
- / → Luci《云中来信》v2.4
- /luci/ → Luci 同一作品
- /gemini/ → Gemini 原有作品
- /deepseek/ → DeepSeek 原有作品

注意：旧 netlify.toml 漏掉了 Luci 新增的 export.js，可能导致线上媒体导出功能不可用；本 Cloudflare 构建脚本已补齐该文件。

## 需要用户在 Cloudflare 控制台进行的一次授权

1. 打开 https://dash.cloudflare.com/ 登录。
2. Workers & Pages → Create application → Pages → Connect to Git。
3. 选择 GitHub；授权只访问 qianxiaohuaqi-design/creative-motion-lab（若提供 Only select repositories）。
4. 设置如下：

| 项目设置 | 值 |
|---|---|
| Project name | reina-motion-lab（如已占用，可改 reina-cloud-letter） |
| Production branch | main |
| Framework preset | None（无框架） |
| Root directory | 留空（仓库根目录） |
| Build command | bash agents/luci/projects/cloud-typography/build-cloudflare.sh |
| Build output directory | dist |
| Environment variables | 不需要 |

5. Save and Deploy，成功后获得实际的 https://<project>.pages.dev 地址。
6. 验收首页、/luci/、/gemini/、/deepseek/，以及 Luci 的 PNG、GIF、WebM 视频导出。
7. 新站验证成功以后再考虑停用 Netlify 自动部署，不要先删除旧站。

## 减少无关项目触发自动构建

在 Cloudflare Pages → Settings → Build → Build watch paths，Include：
- agents/luci/projects/cloud-typography/*
- agents/gemini/projects/cloud-typography/*
- agents/deepseek/projects/cloud-typography/*

如果将来有其他路径下的资源影响网站，应把对应路径也加入 Include。

## 状态

目前已在 GitHub 完成 Cloudflare 构建准备；并没有账号授权，也没有创建 Cloudflare Pages 项目，更没有验证真实 pages.dev 地址。
Cloudflare 不在当前已连接的部署工具范围内，账号本人必须完成首次 GitHub OAuth / Cloudflare 控制台操作。

官方文档：
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/build-watch-paths/
