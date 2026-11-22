# 云中来信 · Cloud Letter (Gemini Edition)

独立于 Luci 与 DeepSeek 的 **Gemini 版本**《云中来信》网页互动艺术作品。

## 目录位置

`agents/gemini/projects/cloud-letter-gemini/`

```text
agents/gemini/projects/cloud-letter-gemini/
├── index.html   # 页面结构与晴空控制栏
├── style.css    # 晴空视觉样式、玻璃态交互区、全局防选中配置
├── script.js    # Canvas 2D 云朵文字引擎、3D 视差、单击消散与携信白鸽气流物理
└── README.md    # 项目说明与部署说明
```

## 核心视觉与交互特性

- **明亮通透晴空**：多层日光天蓝渐变、远中近景软云与轻微镜头视差，整体构图更近、空间沉浸感更强。
- **云雾质感字母系统**：将英文书信拆分为独立字母物理对象，使用离屏多层柔焦与云絮边缘渲染，呈现亮而不刺眼的白云文字与柔和 3D 纵深。
- **单击永久消散**：点击/轻触任意字母，按其字形轮廓采样化作云雾粒子顺风散去，消散后不自动恢复（仅 `RESET` 可复原）。
- **长按白鸽携信 + 流动气流**：长按并拖拽（兼容桌面鼠标与手机触控）召唤半抽象白色飞鸽剪影，衔着小信封沿拖拽方向扇翼滑翔；彻底移除圆形光圈，改为流线风痕、翼尖云丝拖尾与定向空气尾流，吹动、卷散、雾化并带走沿途文字。
- **克制参数控制区**：提供 `WIND`（常风）、`DISORDER`（失序）、`REACH`（风域）与 `RESET`（重置），带中文简注与悬停提示。

## 本地运行

纯静态 HTML / CSS / JavaScript，无需构建工具：

1. 直接用浏览器打开 `index.html`，或
2. 在本目录启动静态服务：
   ```bash
   npx serve .
   ```

## GitHub Pages 部署说明（当前主要平台）

- **当前主要平台**：GitHub Pages（`qianxiaohuaqi-design/creative-motion-lab` 的 `main` 分支通过 `.github/workflows/deploy-pages.yml` 自动部署；原 Netlify 方案因免费额度耗尽已停用）。
- **Gemini 入口地址**：`https://qianxiaohuaqi-design.github.io/creative-motion-lab/gemini/`
- **子路径兼容性**：本作品内 CSS、JS 均使用相对路径（`./style.css`、`./script.js`），无外部资源或根路径依赖，直接兼容 GitHub Pages 子路径。
- **当前映射提示**：仓库现有 `.github/workflows/deploy-pages.yml` 与 `agents/luci/projects/cloud-typography/build-cloudflare.sh` 目前默认将 `agents/gemini/projects/cloud-typography/` 复制到 `/gemini/`；如需将本作品上线至 `/gemini/`，待用户确认后可将本作品同步至 `agents/gemini/projects/cloud-typography/`，或由用户调整共享构建配置。
