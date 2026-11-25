# 云中来信 · Cloud Typography (Luci)

An interactive cloud-letter artwork built with HTML, CSS, and JavaScript. This folder is Luci's independent project. The other agent folders and the repository's shared configuration are not modified here.

Live site: https://qianxiaohuaqi-design.github.io/creative-motion-lab/

## Release

**v2.7 — multi-region journal creator**, implemented on top of v2.1's articulated 2.5D bird, vapor wake and time-axis interaction.

### Create
- Click **编辑文字** to replace the prose (up to 1,200 graphemes). Supports Chinese, Latin text, punctuation and line breaks. Applying new text clears the former take.
- **文本重复倍数** (1×–4×) duplicates the **entire user-provided text** in its original order. It does not inject words or truncate a repeated copy. To keep at most 1,500 live glyphs, long texts automatically have a lower maximum complete-copy multiplier (shown beside the slider). Old percentage-based presets/saved settings are migrated.
- Chaos is **automatically progressive**; there is no chaos-intensity slider. **混乱速度** controls how quickly the progression occurs; 0 stops its progression.
- A click dissolves one glyph; a press and drag summons the courier. **只送信** stirs the letters without dissolving them; **吹散云字** also allows local dissolution after sufficient exposure.
- Empty-sky clicks have no destructive action. The explicit **吹散整段** button remains available.

### Present
- Six old sliders became **five**: dove wind, chaos speed, airflow reach, text count, and independent dove screen size.
- The parameter tray can be collapsed; **沉浸** hides the controls. Escape or the exit button restores them.
- Scroll to zoom the composition, not the bird. Bird size is independent of zoom.

### Playback & file output
- Timeline stores up to approximately 15 snapshots per second using typed numeric arrays (fewer for especially dense scenes). Only the most recent 3 minutes are retained; **live creation does not stop** at 3 minutes.
- Presets: **晨间微风**, **云中来信**, **漫天飞絮**. They begin a fresh take while keeping your text.
- **保存设置 / 恢复设置** uses local browser storage. It is per browser/device; it is not cloud sync.
- **保存画面**: PNG frame.
- **导出 GIF**: up to 8 seconds, 10 fps. Default **HD 960×540** landscape / **540×960** portrait; optional standard 640×360 / 360×640. A global median-cut palette sampled from the scene replaces RGB332, with reserved near-white lettering and light ordered dithering. GIF still has a hard 256-color limit; WebM is preferred for highest fidelity.
- **导出视频**: up to 30 seconds, 20 fps, 960×540 landscape / 540×960 portrait. Uses MediaRecorder with supported WebM or MP4 mime types. The browser must support Canvas captureStream + MediaRecorder.
- Exports are clean **canvas renderings** of the recorded scene, not pixel-perfect screenshots of DOM/CSS. They include glyphs, visual mist, articulated dove frames and main composition text but intentionally exclude all controls. Some perspective/font details may differ from the live scene. Video export processes at real-time speed.
- Browser export errors are surfaced in the status area. It does not upload content to a server.

## Development

Open index.html in a modern Chromium, Firefox, or Safari browser. No build step, external runtime, or CDN dependency. The page loads script.js, export.js, and layout.js.

## QA checklist

1. Enter Chinese/English lines; save, reset, and re-edit. Verify no leftover old letters or obsolete replay history.
2. Set chaos speed to 0, then 12. Check that progression stops/accelerates and that it never removes letters by itself.
3. Use the two dove modes on identical text. Both must push/rotate glyphs; only the dispersing mode removes them.
4. Rotate/swipe/zoom on small and large screens; bird size must stay independent.
5. Toggle panel and immersive, including Escape; check focus and text editor interaction.
6. Interact for over three minutes. Verify the live artwork keeps running and only the rolling replay window moves.
7. Replay the dove's wing pose and custom text, then resume from the most recent frame.
8. Test PNG, GIF and video exports, inspect actual produced files in the target browser, and compare their layout to the live scene.
9. Save settings, change presets, restore them and refresh the page. Confirm the stored snapshot can be restored manually.
11. Type Chinese/English paragraphs, select 1×/2×/3×/4× and confirm each repeated block is intact and no default text was inserted. Repeat with very long input and confirm dynamic multiplier cap.
12. Compare standard/HD GIF dimension, legibility and color gradients. Use WebM where GIF palette loss is unacceptable.
10. Verify network/resource constraints and performance on a real phone, especially 300% text density.

Automated API/logic simulations and syntax validation were run during development; **actual browser visual and media-codec acceptance remains outstanding**.

## v2.6 · 自由排版（第一阶段）

- 「排版模式」提供一个真实的矩形文字区域：拖动框体移动、右下角调整大小，或在空白画布拖出新范围。支持一键铺满和恢复居中。
- 上方标题、下方短句可分别隐藏与拖动，顶部品牌栏可隐藏；三个样式为无框、虚线、玻璃便签。
- 排版编辑与云字动力学互斥，结束排版重新开启本轮，避免旧时间轴与新几何不匹配。
- 原有自定义文案、1×–4×、白鸽、录像、GIF/PNG 导出依然工作；布局保存在浏览器设置中，老配置采用默认布局。
- 此阶段**仅支持一个可移动矩形文字框**；多框、圆形、自由手绘轮廓将另外开发，尚未实现。

## v2.7 · 多文字模块与独立文案

- 在「排版模式」中可新增、选择、拖动、缩放、删除 **最多六个文字框**；空白处框选可直接新增模块。
- 每框独立文字（最多 1200 字符簇）、漂移幅度（0.3–2×）、矩形/圆形/椭圆、无边框/虚线/半透明便签样式；可选择「铺满选中框」与「恢复居中」。
- 文本重复倍数依然为每框 1–4× 的完整重复。所有框合计最多约 1500 字形，超长文字会减少最大倍数。
- 白鸽、点击吹散、自动失序、时间轴与 GIF/PNG/视频导出使用统一的字母状态，防止多区域动画历史错乱。
- 每次增删模块或更改文案，会开启新一轮时间轴记录。拖动和缩放后需要退出排版模式才继续动画。
- 浏览器本地保存/恢复包含各模块的文案、位置、形状、风格、漂移幅度及装饰文字状态。兼容 v2.6 单模块布局配置。
- 圆形/椭圆形文本采用安全的内部排版宽度，不裁剪成任意手绘路径。自由手绘轮廓、图层高级编辑仍属后续增强。

### v2.7 验收建议
1. 进入排版模式，添加 2～6 个文字框，分别输入不同中英文句子；切换框后保持各自文字。
2. 测试拖动、缩放、圆形和椭圆形、修改边框样式与漂移幅度。
3. 删除非主框及第一个主框，确认其他模块不会消失或遗留旧字符。
4. 用常规「编辑文字」按钮更新第一框，然后进入排版模式并保存、恢复，确保新文字不会被旧布局覆盖。
5. 测试 1×～4×、白鸽吹散、回放与 GIF/PNG/视频，确认多个框都出现在导出画面中。
6. 超长文本超出 1500 字形总量时应提示并拒绝该次变更。
7. 多框已加入，任意手绘形状、独立颜色和高级图层仍未提供。

## v2.8 · 每个文字框独立字号

- 「排版模式 → 当前模块文字」增加自动字号开关与 **12–72 px 手动文字大小**滑块。
- 默认自动适配：每个模块按自身尺寸与当前重复倍数选择尽可能大的可读字号，替代此前逐步缩到 9px 的逻辑。
- 关闭自动字号后，手动尺寸始终优先，不再偷偷缩小；如果容器不够大，显示文字溢出提示，可扩大区域、减少重复次数或减小字号。
- 字号与每框的文字、形状、位置一起保存和恢复，旧版本布局默认为自动适配。
- GIF、PNG 和视频导出使用各文字框实际计算后的字号。
