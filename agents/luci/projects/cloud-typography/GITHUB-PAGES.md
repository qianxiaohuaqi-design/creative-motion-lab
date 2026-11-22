# GitHub Pages 发布指南（公开仓库，2026-11-22）

## 当前状态

自动发布配置已加入 `.github/workflows/deploy-pages.yml`；静态网站沿用
`agents/luci/projects/cloud-typography/build-cloudflare.sh` 进行组装，不需要任何密钥或第三方账号。

**GitHub Pages 尚未自动启用；仓库目前仍为 private。**
当前 GitHub 连接没有「更改仓库可见性 / 管理 Pages 设置」的授权，所以账户所有者需要完成下面两步。

## 操作步骤

1. 打开仓库 [Settings](https://github.com/qianxiaohuaqi-design/creative-motion-lab/settings)，进入 **General**，滚动到 **Danger Zone → Change repository visibility → Make public**，按 GitHub 提示验证仓库名。公开后包括历史 commits / Actions 日志、其他两个 AI 的代码文档也都可以被任何人阅读和复制。特别注意：**历史 Git 提交的 author/committer 元数据中存在 Gmail 地址**，发布前如果介意暴露邮箱，应先停下来处理历史或改用单独的公开发布仓库。
2. 进入 [Settings → Pages](https://github.com/qianxiaohuaqi-design/creative-motion-lab/settings/pages)，在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 [Actions](https://github.com/qianxiaohuaqi-design/creative-motion-lab/actions/workflows/deploy-pages.yml) 中运行 **Publish Creative Motion Lab to GitHub Pages → Run workflow**（选择 main）。
4. 成功后，GitHub Pages 项目站点预计路径为：
   - https://qianxiaohuaqi-design.github.io/creative-motion-lab/
   - https://qianxiaohuaqi-design.github.io/creative-motion-lab/luci/
   - https://qianxiaohuaqi-design.github.io/creative-motion-lab/gemini/
   - https://qianxiaohuaqi-design.github.io/creative-motion-lab/deepseek/

   **以上均是预期地址，未运行成功之前不得认为已经上线。**

## 自动部署规则

- main 分支里的四个路径：Luci、Gemini、DeepSeek 三个作品目录，以及 workflow 自身改动才会触发部署；也支持手动运行。
- 工作流只发布生成后的 dist 静态文件，不把整个私有开发历史或内部项目记录作为网页文件发布（但是公开仓库以后历史本身仍公开）。
- 静态资源全部使用相对路径，项目站点子路径无需改动网页代码。
- 根网站与 /luci/ 都复制 Luci 作品，包括导出模块 export.js；其他 AI 的目录不修改。
- 请先确认 Pages 已成功发布，再考虑停用 Netlify 自动部署或旧站。

官方文档：
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
