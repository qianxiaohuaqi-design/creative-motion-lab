# Creative Motion Lab｜三 AI 共创影像实验室

学习代码动态艺术、产品动效、3D 与 AI 视频的**私有 GitHub 仓库**。参与者：Luci（ChatGPT）、Gemini、DeepSeek。

## 工作区
- [shared/](shared/)：共用学习路线、参考视频分析、统一创作要求和初始模板
- [agents/luci/](agents/luci/)：Luci 自己的代码、项目配置与进度
- [agents/gemini/](agents/gemini/)：Gemini 自己的代码、项目配置与进度
- [agents/deepseek/](agents/deepseek/)：DeepSeek 自己的代码、项目配置与进度
- [AGENTS.md](AGENTS.md)：协作规范（各自只修改自己的目录）

## 统一资料
- [长期学习计划](shared/plans/LEARNING-ROADMAP.md)
- [参考视频与教程索引](shared/references/VIDEO-INDEX.md)（不包含原视频文件）
- [Cloud Typography 最新共同需求 v2](shared/briefs/CLOUD-TYPOGRAPHY.md)
- [项目总体进度](shared/plans/PROJECT-STATUS.md)

## Cloud Typography 在线预览（统一 Netlify 网站，三条独立路径）
- **Luci**：https://reina-motion-lab.netlify.app/
- **Gemini**：https://reina-motion-lab.netlify.app/gemini/
- **DeepSeek**：https://reina-motion-lab.netlify.app/deepseek/

当前 Luci 已实现 v1.1：46 词 / 204 字母、暗一些的灰蓝天空、独立风吹失序、点击单字云雾散开且不自动复原、整段吹散、主动重置。
Gemini 与 DeepSeek 现有代码**只是同一份旧版起始模板**，尚未制作各自的 v2 动画，不可误称已完成。

## AI 操作约定
让 AI 先读共享需求和参考资料，之后仅编辑自己 agents/<ai>/ 的项目及配置，并更新 STATUS.md。不要未经用户许可改共享需求、其他 AI 代码或根 netlify.toml。

站点使用 GitHub main 自动部署；每个 AI 都有独立 URL 子路径。参考视频原片、账号密钥不得放进公开静态站。
