# Cloud Typography｜云间来信 v1.1 — Windswept Letters

这是 Luci 独立作品。参考思花《时间尽头的无序之书》的有序→失序概念，但使用原创文案、源码和美术表现。

## v1.1 改动
- 46 个英文单词、204 个独立字母对象；从短标题升级为长段落。
- 将天空改成柔和灰蓝，收敛白字光晕。
- 每个字母独立缓慢漂移和旋转；空间相关的连续风场与渐强失序，可调 WIND、DISORDER。
- 点击**单个字母**，它被 Canvas 字形像素采样转成柔软云雾粒子，受风、卷曲和扩散影响散去。
- 不自动重组，只有按“重新开始”才会复位。
- 点击空白天空或“吹散整段”，触发一阵整体强风，字母按时间差接连飘走。
- 保留原生 HTML/CSS/JS，零第三方依赖，支持桌面、手机、键盘和减少动态效果设置。

## 运行与代码
直接浏览器打开 index.html，或在 VS Code 使用 Live Server。
- index.html：长段落和交互控制。
- style.css：灰蓝天空、云白字形、响应式布局。
- script.js：字母拆分、连续风场、离屏字形采样、粒子与永久消散状态。

## 在线地址
- Luci：https://reina-motion-lab.netlify.app/
- Gemini：https://reina-motion-lab.netlify.app/gemini/
- DeepSeek：https://reina-motion-lab.netlify.app/deepseek/

当前三个版本部署在不同路径；不要把 Gemini / DeepSeek 起始副本误认作各自完成的成品。

## 验收
参见 TESTING.md。浏览器本地测试过桌面 1440×900、手机 390×844、单字点击、不自动恢复、重置、整段吹散，未遇到 JavaScript 报错。实际观感仍由用户主观验收。
