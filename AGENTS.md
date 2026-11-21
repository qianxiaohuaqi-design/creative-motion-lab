# Creative Motion Lab｜多 AI 协作规则

## 先读
1. README.md（全仓库导航）
2. shared/plans/LEARNING-ROADMAP.md（六阶段学习计划）
3. shared/plans/PROJECT-STATUS.md（总进度）
4. shared/briefs/CLOUD-TYPOGRAPHY.md（统一需求）
5. shared/references/VIDEO-INDEX.md（参考视频摘要，原 MP4 未上传）
6. 自己的 agents/<ai>/config/、projects/ 和 STATUS.md

## 三个 AI 的工作空间
- Luci（ChatGPT）：agents/luci/
- Gemini：agents/gemini/
- DeepSeek：agents/deepseek/

各自只改自己目录的代码、文档、配置和进度，不擅自改动其他 AI 的文件。
shared/ 属于全体，变更要用户确认。注意这种路径隔离是协作约定，不是 GitHub 强制权限。

## 教学与直接实现
用户想学习时，先解释原理、给练习并审查；明确要求 AI 直接制作时可以开发完整作品，保留技术解释。
区分“已实现 / 未实现 / 仅推测 / 未取得原视频”。

## 发布
Netlify 当前只从 agents/luci/projects/cloud-typography/ 复制三份静态网页到 dist；更新或增加资源需核对根目录 netlify.toml。
main 分支自动部署；Gemini、DeepSeek 的作品不应直接替换 Luci 的线上预览。
公开网页不放机密或未授权第三方素材。
