# 00｜Cloud Typography — 云间来信（工作名）

当前状态：**Lesson 01 基线完成，完整动画尚未实现。**

## 目标
受思花《时间尽头的无序之书》的“文字逐渐失序”理念启发，原创制作天空蓝背景、白色云朵字、轻缓微风的互动作品。交互方案 A 已确认：点击**整个单词**后像云一样消散，过一会儿重新凝聚为同一个词。

## 现有文件
- index.html：页面入口和标题。
- style.css：蓝天渐变和排版。
- script.js：将 THE WIND REMEMBERS OUR WORDS 拆成五个 span.word（Lesson 01）。
- DESIGN.md：详细视觉方案、技术与未决事项。
- TASKS.md：分阶段任务及实际完成状态。
- AI-HANDOFF.md：交给其他 AI 的实施规范与验收标准。
- LEARNING-LOG.md：已进行课程的记录。

## 已完成
- 原生 HTML/CSS/JavaScript 静态页面可运行。
- 天空蓝背景、白色英文标题。
- JavaScript 拆词、独立单词 DOM 元素。
- Netlify 首次生产部署成功：https://reina-motion-lab.netlify.app

## 未实现
点击反馈、模糊/云粒子消散、重新凝聚、轻缓微风、字母失序、视频导出。

## 运行与下一步
用 VS Code + Live Server 打开 index.html，或直接 Chrome 打开。
下一步优先 M1：单词点击淡出并自动恢复，然后逐步引入微风和 Canvas 云粒子。详见 TASKS.md。

原视频、原作者工程和源码不在本仓库；参考详情见 shared/references/VIDEO-INDEX.md。

## 归属
这里是 Luci 的个人作品目录；共用目标见 shared/briefs/CLOUD-TYPOGRAPHY.md，共用起点见 shared/starter/cloud-typography/。
