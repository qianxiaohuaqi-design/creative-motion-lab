# Gemini Agent Progress (`agents/gemini/STATUS.md`)

## 部署平台与上线信息（2026-11-23 已同步上线）

- **当前主要部署平台**：GitHub Pages（通过 `.github/workflows/deploy-pages.yml` 在 `main` 分支自动触发构建与部署）
- **原平台状态**：Netlify 因免费额度耗尽，已停止作为主要部署渠道（不再按旧 Netlify 流程发布，不修改 Netlify 配置）
- **GitHub 仓库**：`https://github.com/qianxiaohuaqi-design/creative-motion-lab`（Public，分支 `main`）
- **Gemini 作品入口**：`https://qianxiaohuaqi-design.github.io/creative-motion-lab/gemini/`
- **隔离边界**：仅维护 `agents/gemini/` 内文件，不触碰 `agents/luci/`、`agents/deepseek/`、`shared/` 及共享部署工作流

## 当前目录与部署映射

| 目录 | 内容状态 | 相对路径兼容性 | 当前是否由 `deploy-pages.yml` 发布到 `/gemini/` |
| --- | --- | --- | --- |
| `agents/gemini/projects/cloud-typography/` | 已同步《云中来信》Gemini 独立互动艺术成品 | 已使用 `./style.css`、`./script.js`，无外部依赖（兼容子路径） | **是**（推送后自动触发 GitHub Pages 部署） |
| `agents/gemini/projects/cloud-letter-gemini/` | 《云中来信》Gemini 独立互动艺术作品归档源码 | 已使用 `./style.css`、`./script.js`，无外部依赖（兼容子路径） | 归档副本（与 `cloud-typography/` 保持一致） |
| `agents/gemini/projects/ai-video/` | AI 视频预留空间（暂无成品） | — | 否 |

## 最新上线作品：《云中来信》（Cloud Letter — Gemini Edition）

- **发布目录**：`agents/gemini/projects/cloud-typography/`（同步自 `agents/gemini/projects/cloud-letter-gemini/`）
- **包含文件**：`index.html`、`style.css`、`script.js`、`README.md`
- **核心特性自检**：
  - [x] 明亮通透晴空背景 + 远中近景流云 + 轻微 3D 镜头视差，构图更近、更沉浸
  - [x] 英文书信按单个字母拆分为独立对象，离屏多层柔焦实现云雾边缘与柔和 3D 空间感
  - [x] 单击/轻触字母后沿笔画轮廓化雾永久消散，不自动恢复
  - [x] 长按召唤半抽象白鸽剪影携小信封，带翅膀扇动与掠过滑翔感
  - [x] 取消圆形光圈，采用流线风痕、云丝拖尾与定向空气尾流卷散、雾化并带走文字
  - [x] 控制区保留 `WIND`、`DISORDER`、`REACH`、`RESET` 及中英文说明与 tooltip
  - [x] 纯 HTML / CSS / JS，全部采用相对路径，兼容 GitHub Pages 子路径部署、桌面鼠标与手机触控
