# 学习日志

## 2026-11-19 · 概念与目录建立
- 已确认仓库：`qianxiaohuaqi-design/creative-motion-lab`。
- 用户提出原创改编：天空蓝背景、云质感文字、点击后像云一样消散、微风让文字逐渐失序。
- 初步路线：先 DOM/CSS 简易交互，再 Canvas 2D 云雾粒子，最后连续噪声风场。

## 2026-11-19 · 交互方案确定
- 已确定 A：点击整个单词后先消散，稍后重新凝聚为原单词。
- 延续之前天空蓝、白字的设计。

## 2026-11-19 · Lesson 01 已完成
- 按用户要求由 Luci 直接完成本课代码，不再保留 TODO 让学生补齐。
- 在 `script.js` 用 `textContent`、`split(/\\s+/)`、`createElement("span")`、`append()` 把标题拆成 5 个 `span.word`。
- 在 `style.css` 添加 `.word { display: inline-block; white-space: nowrap; }`，保留单词之间正常空格与换行。
- 页面样式仍为天空蓝背景和白色标题；此阶段没有实现点击、动画、云雾或凝聚。
- 下一步：Lesson 02 点击后淡出与复原，再升级真正的 Canvas 云雾粒子。

## 每次练习记录模板
- 日期：
- 今天完成了：
- 我理解的原理：
- 卡住的问题：
- 自己做出的调整：
- 下一次准备做：
