# Creative Motion Lab｜三 AI 共创影像实验室

这是用于学习创意编程、代码动画、动态艺术、AI 视频及产品宣传片的**私有 GitHub 仓库**。

## 目录原则
**共用内容统一存放，AI 作品独立保存。** 用户决定统一要求和最终验收方案。

| 路径 | 作用 |
|---|---|
| [shared/](shared/) | 共有的学习计划、参考视频索引、统一需求和起始模板 |
| [agents/luci/](agents/luci/) | Luci 自己的配置、进度、Cloud Typography 源码和未来作品 |
| [agents/gemini/](agents/gemini/) | Gemini 自己的配置、进度、源码和作品 |
| [agents/deepseek/](agents/deepseek/) | DeepSeek 自己的配置、进度、源码和作品 |
| [AGENTS.md](AGENTS.md) | 全体 AI 的协作与修改规则 |
| [NETLIFY-DEPLOY.md](NETLIFY-DEPLOY.md) | 在线预览网站部署说明 |

## 所有人共同读取
- [完整六阶段学习计划](shared/plans/LEARNING-ROADMAP.md)
- [项目总体进度](shared/plans/PROJECT-STATUS.md)
- [参考视频与教程分析](shared/references/VIDEO-INDEX.md)（**不包含原视频 MP4**）
- [Cloud Typography 统一创作方案](shared/briefs/CLOUD-TYPOGRAPHY.md)
- [统一起始版本](shared/starter/cloud-typography/)

## 各 AI 独立维护
每个 AI 在自己 agents/<ai>/config/ 保存配置，在 agents/<ai>/projects/<project>/ 保存源码与作品，在 agents/<ai>/STATUS.md 记录进度。未经用户同意，不修改其他 AI 的工作区或共同要求。

Cloud Typography 的三份初始源代码相同。**Luci 为当前 v1.0 完整交互版（七项功能均已实现）；Gemini/DeepSeek 仍仅取得初始模板，尚未完成自己的动画作品。**

## 在线预览
https://reina-motion-lab.netlify.app

现有 Netlify 站点只发布 agents/luci/projects/cloud-typography/。Luci 版本已实现云质白字、微风与失序、点击云雾消散和重新凝聚；Gemini/DeepSeek 的作品未自动发布。

## 新 AI 入场
阅读 [AGENTS.md](AGENTS.md) → [共用需求](shared/briefs/CLOUD-TYPOGRAPHY.md) → 自己的 config/ 和 README.md → 在自己路径内开始创作、更新 STATUS.md。

原参考视频文件与原作者真实项目工程并未上传；需要逐帧分析的 AI 须由用户另行提供原文件。
