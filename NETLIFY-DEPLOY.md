# Netlify 在线预览部署说明

- Netlify 项目名：`reina-motion-lab`
- Netlify 项目控制台：https://app.netlify.com/projects/reina-motion-lab
- 预期网站地址：https://reina-motion-lab.netlify.app
- 网站状态：Netlify 项目已创建，**尚未连接 GitHub 仓库并首次部署**。请勿把预期网址误当成已上线。
- GitHub 代码仓库：`qianxiaohuaqi-design/creative-motion-lab` （Private）
- 正式发布分支：`main`
- 部署配置：仓库根目录的 `netlify.toml`。无需 npm 依赖；构建时只将 `index.html`、`style.css`、`script.js` 复制到 `dist/`，不会把设计笔记公开到站点。

## 完成 Git 关联的步骤（由仓库主人在 Netlify 控制台授权）

1. 打开项目控制台 → **Project configuration** → **Developer settings** → **Continuous deployment** → **Repository**。
2. 点击 **Link repository** → 选择 GitHub。
3. 若 GitHub 要求安装/授权 Netlify GitHub App，可选择只允许访问本项目的仓库 `creative-motion-lab`，不必授予全部仓库。
4. 选择 `qianxiaohuaqi-design/creative-motion-lab`，部署分支 `main`。
5. Netlify 会读取根目录 `netlify.toml`，它已指定构建命令与发布目录；无需另填构建命令，若页面显示配置可对照核实：Build command 为 `mkdir -p dist && cp ... dist/`；Publish directory 为 `dist`。
6. 确认后首次部署，等待 Deploys 页面出现成功状态。然后访问预期网址验证网页可正常打开。

## 今后
修改 Cloud Typography 的网页文件并推送至 GitHub `main`，成功关联 Git 后 Netlify 会自动部署新版。

注意：此 Netlify 项目的默认网址是公开的，即使 GitHub 仓库为私有。避免在网页静态资源中放入密钥、个人隐私和未授权素材。后续新增公开资源时，应同步修改 `netlify.toml` 中的构建复制规则。

相关 Netlify 官方文档：
https://docs.netlify.com/build/git-workflows/repo-permissions-linking/
