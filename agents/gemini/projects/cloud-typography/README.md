# Gemini｜Cloud Typography（《云中来信》GitHub Pages 发布目录）

本目录为 **《云中来信 · A Letter from the Clouds》** 在 GitHub Pages `/gemini/` 入口的正式发布源码（已与归档目录 `agents/gemini/projects/cloud-letter-gemini/` 保持同步）。

- **在线地址**：`https://qianxiaohuaqi-design.github.io/creative-motion-lab/gemini/`
- **自动部署**：推送至 `main` 分支后，由 `.github/workflows/deploy-pages.yml` 自动构建并发布至 GitHub Pages
- **资源路径**：`index.html` 内均采用相对路径（`./style.css`、`./script.js`），零外部框架或音频/字体资源依赖，直接适配 GitHub Pages 子路径部署

## 核心特性

- **四套晴空时刻与天光景深**：支持 **晴午（Noon）/ 晨曦（Dawn）/ 晚霞（Sunset）/ 暮蓝（Dusk）** 实时切换与分主题离屏字形贴图缓存；依据字母 `z` 轴偏离焦平面的程度自动混入 8%–22% `misty` 雾化贴图，并结合天光方向呈现柔和底光层次。
- **独立云絮字母与永久消散**：默认英文书信与自定义中英文短文均按独立字符拆分为 3D 物理对象；单击/轻触字母后沿笔画轮廓化作云雾粒子永久消散（仅 `RESET` 可复原）。
- **长按白鸽携信与翼尖落羽**：长按并拖拽召唤半抽象白鸽剪影携信滑翔，以流线风痕与云丝尾流卷散、雾化并带走沿途文字（无圆形光圈）；转弯或掠过字母时偶尔从翼尖飘落 1–2 片半抽象白色羽毛随风缓降。
- **「写信与寄信」叙事闭环与终章留白**：点击底部 `WRITE` 打开玻璃写信浮层，支持中英文与换行输入、旧字化雾与新字水汽凝结过渡，以及 `?msg=` 分享链接生成与加载（含长度上限与异常编码安全回退）；当超过 90% 的字母被点散或带走后，画布中央浮现诗意收尾 *"The wind has delivered your letter."*，`RESET` 按钮出现呼吸高亮提示。
- **程序化风声、陀螺仪视差与桌面悬停微反馈**：右上角声音开关默认静音，点击后通过原生 Web Audio API 合成粉红噪声风声并随 `WIND` 与白鸽速度动态滤波；支持 `DeviceOrientationEvent` 倾斜视差（兼容 iOS 权限请求并静默回退）；桌面端鼠标悬停字母触发轻微微亮、受风颤动与 `pointer` 手势光标。
- **「云中明信片」高清导出**：点击右上角 `SAVE` 按钮，将不含 HUD 控件的纯净主画布瞬间定格导出为高清 PNG（`cloud-letter-YYYYMMDD-HHmmss.png`），不阻塞动画循环。

## 本地验收记录（2026-11-26）

- 通过 `node --check agents/gemini/projects/cloud-typography/script.js` 语法检查。
- 通过本地静态 HTTP 服务（`http://127.0.0.1:4173`）在桌面端（`1280x800`）与移动端窄屏（`390x844`）实测全量交互，控制台 **0 JS 报错**，布局无水平溢出且顶部与底部控件均与云字保持清晰安全间距。
