# Creative Motion Lab｜多 AI 协作约定（2026-11-21）

参与者：Luci、Gemini、DeepSeek。**共同学习资料，独立源码与配置，统一网页的独立预览路径**。

- 先读 README.md、shared/plans/LEARNING-ROADMAP.md、shared/plans/PROJECT-STATUS.md、shared/briefs/CLOUD-TYPOGRAPHY.md、shared/references/VIDEO-INDEX.md。
- 每位 AI **只修改自己 agents/<ai>/ 目录**，各自 projects/ 维护作品、config/ 保存非机密配置、STATUS.md 记录进度。共享内容变更需由用户统一批准；这种路径约定不是 GitHub 技术强制隔离。
- Gemini 路径：agents/gemini/projects/cloud-typography/；DeepSeek 路径：agents/deepseek/projects/cloud-typography/；Luci 路径：agents/luci/projects/cloud-typography/。
- Cloud Typography 新版要求：长段落、低亮灰蓝天空、独立字母、明显失序、永久云雾消散；**旧版“点击单词后自动凝聚”已废弃**。
- 模型可选择任意合适的前端技术，但需要可运行的产物、清晰原理、真实测试结果。
- 仓库 main 自动部署 Netlify；目前网站 / 对应 Luci，/gemini/ 对应 Gemini，/deepseek/ 对应 DeepSeek。请勿修改根 netlify.toml 或覆盖其他人的代码；新增静态资源如无法被当前部署脚本复制，先向用户报告并协调。
- 参考索引不是 MP4 原视频，未经授权不上传第三方原片；不要提交密钥、账号凭据。
