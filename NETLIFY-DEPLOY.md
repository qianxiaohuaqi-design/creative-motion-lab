# Netlify 多 AI 作品在线预览

站点：https://reina-motion-lab.netlify.app
Netlify 控制台：https://app.netlify.com/projects/reina-motion-lab
关联 GitHub 私有仓库：qianxiaohuaqi-design/creative-motion-lab，生产分支 main。

## 路径映射
- /：agents/luci/projects/cloud-typography/
- /luci/：同一 Luci 版本（方便统一比较）
- /gemini/：agents/gemini/projects/cloud-typography/
- /deepseek/：agents/deepseek/projects/cloud-typography/

根目录 netlify.toml 的构建命令会将每个工作区内的 index.html、style.css、script.js 复制至 dist 的对应目录。更改 main 后自动部署。

## Gemini 如何工作
1. 授权访问这个 GitHub 私有仓库，读取最新 shared/briefs/CLOUD-TYPOGRAPHY.md 与 AGENTS.md。
2. 仅在 agents/gemini/projects/cloud-typography/ 编辑源码、生成作品，更新 agents/gemini/STATUS.md。
3. 如连接 Netlify，可以检查部署状态，但**不必建立另一站点**；提交 main 后同一个 Netlify 站点的 /gemini/ 会自动更新。
4. 用户验收后才考虑将 Gemini 版本用于根路径；任何时候不要覆盖 Luci 与 DeepSeek 工作区。

## 注意
目前只复制每位 AI 的三份基础静态文件。若 Gemini 或 DeepSeek 新增图片、字体或额外 JavaScript 模块，需在向用户申请修改 netlify.toml 前将新文件列出来；或将依赖内容内联到现有文件。不要因加资源而擅自覆盖根部署配置。

GitHub Private 不会让 Netlify 站点自动变私有；所有发布资源可能公开访问，不能包含密钥、第三方未授权视频等。
