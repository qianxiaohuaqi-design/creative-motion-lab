# 云中来信 · Cloud Letter (Gemini Edition)

独立于 Luci 与 DeepSeek 的 **Gemini 版本**《云中来信》网页互动艺术作品。

## 目录位置

`agents/gemini/projects/cloud-letter-gemini/`

```text
agents/gemini/projects/cloud-letter-gemini/
├── index.html   # 页面结构与晴空控制栏
├── style.css    # 晴空视觉样式、玻璃态交互区、全局防选中配置
├── script.js    # Canvas 2D 云朵文字引擎、3D 视差、单击消散与携信白鸽气流物理
└── README.md    # 项目说明与独立部署指南
```

## 核心视觉与交互特性

- **明亮通透晴空**：多层日光天蓝渐变、远中近景软云与轻微镜头视差，整体构图更贴近正文，空间沉浸感更强。
- **云雾质感字母系统**：将英文书信拆分为独立字母物理对象，使用离屏多层柔焦与云絮边缘渲染，呈现亮而不刺眼的白云文字与柔和 3D 纵深。
- **单击永久消散**：点击/轻触任意字母，按其字形轮廓采样化作云雾粒子顺风散去，消散后不自动恢复（仅 `RESET` 可复原）。
- **长按白鸽携信 + 流动气流**：长按并拖拽（兼容桌面鼠标与手机触控）召唤半抽象白色飞鸽剪影，衔着小信封沿拖拽方向滑翔扇翼；彻底移除圆形光圈，改为流线风痕、翼尖云丝拖尾与定向空气尾流，吹动、卷散、雾化并带走沿途文字。
- **克制参数控制区**：提供 `WIND`（常风）、`DISORDER`（失序）、`REACH`（风域）与 `RESET`（重置），带中文简注与悬停提示。

## 本地运行

纯静态 HTML / CSS / JavaScript，无需构建工具：

1. 直接用浏览器打开 `index.html`，或
2. 在本目录启动静态服务：
   ```bash
   npx serve .
   ```

## Netlify 独立部署配置（不冲突 Luci 根站点）

独立站点名称：`cloud-letter-gemini`（Site ID: `6afd08f9-6d11-4851-b9aa-e4708583fb3e`）

关联同一 GitHub 仓库 `qianxiaohuaqi-design/creative-motion-lab` 时按以下配置填写：

- **Base directory**：`agents/gemini/projects/cloud-letter-gemini`
- **Build command**：留空
- **Publish directory**：`.`
