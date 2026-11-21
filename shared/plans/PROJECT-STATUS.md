# Creative Motion Lab｜全局状态（2026-11-21）

## 共享创作需求
Cloud Typography 最新要求为 **v2**，参见 shared/briefs/CLOUD-TYPOGRAPHY.md：更长段落、灰蓝低亮背景、每字母独立、明显连续风场、点击永久云雾消散、不自动复原。

## 三位 AI
| AI | 工作区 | 状态 | 预览 |
|---|---|---|---|
| Luci | agents/luci/projects/cloud-typography/ | v1.1 代码完成，本地 UI 测试通过；线上以 Netlify 部署为准 | https://reina-motion-lab.netlify.app/ |
| Gemini | agents/gemini/projects/cloud-typography/ | 原始起始模板；尚未按新需求独立完成 | https://reina-motion-lab.netlify.app/gemini/ |
| DeepSeek | agents/deepseek/projects/cloud-typography/ | 原始起始模板；尚未按新需求独立完成 | https://reina-motion-lab.netlify.app/deepseek/ |

## 参考与长期学习
- 学习路线：shared/plans/LEARNING-ROADMAP.md
- 参考分析：shared/references/VIDEO-INDEX.md
- 参考视频原件 MP4：不在 GitHub 中，其他 AI 如需逐帧分析应由用户单独提供。
- 人停鱼行、夏天的手心、春枝：尚未开始独立工程。
- AI 视频 / 产品宣传 / 3D 方向：仍在长期规划中。

## 对比与发布
三位 AI 仅修改各自 agents/<ai>/ 目录；共享规格和根部署配置由用户确认。root Netlify 发布 Luci，/gemini/ 和 /deepseek/ 是独立静态路径。同一 GitHub main 提交会触发 Netlify 重建，但互不覆盖目录。
