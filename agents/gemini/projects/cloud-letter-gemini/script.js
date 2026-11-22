/**
 * 云中来信 · A Letter from the Clouds (Gemini Independent Edition)
 * -----------------------------------------------------------------
 * 核心视觉与交互架构（纯 Vanilla JS + Canvas 2D）：
 * 1. 明亮通透晴空：多层晴空大气渐变 + 远中近景软云层 + 轻微镜头视差。
 * 2. 云白文字系统：将整封英文信件拆分为独立字母对象，通过离屏多层柔焦渲染
 *    生成“云雾边缘 + 立体柔光”的字母贴图，带柔和 3D 透视与独立漂浮/失序物理。
 * 3. 单击永久消散：点击/轻触任意字母，按其轮廓采样化作云雾粒子顺风飘散，
 *    不再自动恢复，直到点击 RESET。
 * 4. 长按白鸽携信与真实气流：长按（鼠标/触控）召唤一只优雅的半抽象白鸽，
 *    衔着/带着一封小信封沿拖拽方向滑翔扇翼；无任何圆形光圈，改为流线风痕、
 *    翼尖云丝拖尾与空气尾流物理，掠过之处将字母卷散、雾化并带走。
 */

(() => {
  'use strict';

  const canvas = document.getElementById('cloudCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // 控制区 DOM
  const windSlider = document.getElementById('windSlider');
  const disorderSlider = document.getElementById('disorderSlider');
  const reachSlider = document.getElementById('reachSlider');
  const windValueEl = document.getElementById('windValue');
  const disorderValueEl = document.getElementById('disorderValue');
  const reachValueEl = document.getElementById('reachValue');
  const resetBtn = document.getElementById('resetBtn');
  const gestureHint = document.getElementById('gestureHint');

  // 贴合“云中来信”主题的英文书信正文（自动按容器宽度柔和换行）
  const LETTER_PARAGRAPHS = [
    'Dear traveler beneath the open blue,',
    'I folded these words into the morning drift so they might reach you before the wind turns. Some syllables linger like sunlit cirrus overhead, while others turn to mist the moment you touch them.',
    'Hold the sky, and a white dove will cross with this letter—carrying a breeze, and half the words away.',
    '— Sent by the high wind'
  ];

  // 参数状态（0~1 归一化）
  const params = {
    wind: Number(windSlider.value) / 100,
    disorder: Number(disorderSlider.value) / 100,
    reach: Number(reachSlider.value) / 100
  };

  // 画布尺寸与高分屏缩放
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 字体配置与离屏云朵贴图缓存
  let baseFontSize = 36;
  let fontFamily = 'Georgia, "Times New Roman", "Palatino Linotype", serif';
  const glyphCache = new Map();
  let puffSprite = null;

  // 场景实体
  let letters = [];
  let bgClouds = [];
  let cloudParticles = [];
  let windRibbons = [];
  let ambientWisps = [];

  // 轻微镜头视差（增加空间沉浸感）
  const camera = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    focalLength: 820
  };

  // 指针与长按/单击判定状态
  const pointer = {
    isDown: false,
    pointerId: null,
    downTime: 0,
    downX: 0,
    downY: 0,
    x: width * 0.5,
    y: height * 0.5,
    prevX: width * 0.5,
    prevY: height * 0.5,
    vx: 0,
    vy: 0,
    longPressActive: false,
    longPressTimer: null,
    hasMovedFar: false,
    hasInteracted: false
  };

  // 白鸽携信实体（长按生成，松手后继续优雅滑翔淡出）
  const dove = {
    active: false,
    releasing: false,
    opacity: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -0.18,
    bank: 0,
    wingPhase: 0,
    wingSpeed: 7.5,
    scale: 1,
    glideBias: 0,
    trailTimer: 0,
    lastRibbonX: 0,
    lastRibbonY: 0,
    headingX: 1,
    headingY: -0.15
  };

  // -----------------------------------------------------------------
  // 工具函数
  // -----------------------------------------------------------------
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // 平滑伪噪声：用于自然的常风阵风与漂浮相位
  function skyNoise(x, y, t) {
    return (
      Math.sin(x * 0.0042 + t * 0.75) * 0.52 +
      Math.cos(y * 0.0056 - t * 0.55) * 0.33 +
      Math.sin((x + y) * 0.0029 + t * 0.42) * 0.15
    );
  }

  // -----------------------------------------------------------------
  // 离屏云雾粒子精灵（柔和蓬松，绝无生硬圆边）
  // -----------------------------------------------------------------
  function buildPuffSprite() {
    const size = 96;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    // 叠加几团微偏移的柔边径向渐变，营造真实云絮层次
    const blobs = [
      { dx: 0, dy: 0, r: size * 0.46, a: 0.42 },
      { dx: -8, dy: -4, r: size * 0.34, a: 0.28 },
      { dx: 9, dy: 3, r: size * 0.32, a: 0.26 },
      { dx: 2, dy: -7, r: size * 0.28, a: 0.24 }
    ];

    blobs.forEach((b) => {
      const grad = octx.createRadialGradient(
        cx + b.dx,
        cy + b.dy,
        b.r * 0.06,
        cx + b.dx,
        cy + b.dy,
        b.r
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${b.a})`);
      grad.addColorStop(0.45, `rgba(248, 253, 255, ${b.a * 0.58})`);
      grad.addColorStop(0.78, `rgba(226, 243, 255, ${b.a * 0.18})`);
      grad.addColorStop(1, 'rgba(226, 243, 255, 0)');
      octx.fillStyle = grad;
      octx.beginPath();
      octx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
      octx.fill();
    });

    puffSprite = off;
  }

  // -----------------------------------------------------------------
  // 离屏云质感字母渲染器（清晰态 + 雾化态 + 轮廓粒子采样点）
  // -----------------------------------------------------------------
  function getGlyphAsset(char, fontSize, isItalic) {
    const key = `${char}_${Math.round(fontSize)}_${isItalic ? 'i' : 'n'}`;
    if (glyphCache.has(key)) {
      return glyphCache.get(key);
    }

    const pad = Math.ceil(fontSize * 0.65);
    const fontStr = `${isItalic ? 'italic ' : ''}400 ${fontSize}px ${fontFamily}`;

    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    mctx.font = fontStr;
    const metrics = mctx.measureText(char);
    const advance = metrics.width;
    const w = Math.ceil(advance + pad * 2);
    const h = Math.ceil(fontSize * 1.35 + pad * 2);

    // 1. 主云朵字形贴图（亮白但柔和，边缘带云雾蓬松感与天光底影）
    const crisp = document.createElement('canvas');
    crisp.width = w;
    crisp.height = h;
    const cctx = crisp.getContext('2d');
    const drawX = pad;
    const drawY = h * 0.5 + fontSize * 0.31;

    cctx.font = fontStr;
    cctx.textBaseline = 'alphabetic';

    // 第一层：柔和晴空背光晕（增强白云在蓝天上的通透体积感，同时兼容不支持 ctx.filter 的旧版内核）
    cctx.save();
    cctx.filter = `blur(${Math.max(4.5, fontSize * 0.17)}px)`;
    cctx.shadowColor = 'rgba(225, 244, 255, 0.72)';
    cctx.shadowBlur = Math.max(8, fontSize * 0.28);
    cctx.fillStyle = 'rgba(218, 240, 255, 0.52)';
    cctx.fillText(char, drawX, drawY + fontSize * 0.06);
    cctx.restore();

    // 第二层：轻微错位云絮毛边（消除硬矢量字体生硬感）
    const cloudOffsets = [
      [-1.4, -0.8, 0.28],
      [1.5, -0.7, 0.26],
      [-0.9, 1.3, 0.24],
      [1.2, 1.2, 0.24]
    ];
    cctx.save();
    cctx.filter = `blur(${Math.max(1.8, fontSize * 0.062)}px)`;
    cloudOffsets.forEach(([ox, oy, alpha]) => {
      cctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      cctx.fillText(char, drawX + ox, drawY + oy);
    });
    cctx.restore();

    // 第三层：微柔云白主体（亮而不刺眼，带极柔顶部高光）
    cctx.save();
    cctx.filter = `blur(${Math.max(0.55, fontSize * 0.016)}px)`;
    const grad = cctx.createLinearGradient(0, drawY - fontSize * 0.78, 0, drawY + fontSize * 0.22);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
    grad.addColorStop(0.68, 'rgba(249, 253, 255, 0.90)');
    grad.addColorStop(1, 'rgba(225, 242, 255, 0.80)');
    cctx.fillStyle = grad;
    cctx.fillText(char, drawX, drawY);
    cctx.restore();

    // 2. 雾化态贴图（被气流卷散时平滑过渡到此贴图，形成云雾化散开效果）
    const misty = document.createElement('canvas');
    misty.width = w;
    misty.height = h;
    const mistCtx = misty.getContext('2d');
    mistCtx.font = fontStr;
    mistCtx.textBaseline = 'alphabetic';
    mistCtx.filter = `blur(${Math.max(6.5, fontSize * 0.22)}px)`;
    mistCtx.fillStyle = 'rgba(255, 255, 255, 0.86)';
    mistCtx.fillText(char, drawX, drawY);
    mistCtx.filter = `blur(${Math.max(11, fontSize * 0.36)}px)`;
    mistCtx.fillStyle = 'rgba(235, 247, 255, 0.45)';
    mistCtx.fillText(char, drawX, drawY);

    // 3. 采样字母轮廓像素点（用于单击永久消散时精准从笔画化作云雾粒子）
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.font = fontStr;
    maskCtx.textBaseline = 'alphabetic';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillText(char, drawX, drawY);

    const imgData = maskCtx.getImageData(0, 0, w, h).data;
    const samplePoints = [];
    const step = Math.max(3, Math.floor(fontSize / 11));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4 + 3;
        if (imgData[idx] > 90) {
          samplePoints.push({
            dx: x - w * 0.5,
            dy: y - h * 0.5
          });
        }
      }
    }

    const asset = {
      crisp,
      misty,
      w,
      h,
      advance,
      samplePoints
    };
    glyphCache.set(key, asset);
    return asset;
  }

  // -----------------------------------------------------------------
  // 背景晴空柔云层初始化（多景深）
  // -----------------------------------------------------------------
  function initBackgroundClouds() {
    bgClouds = [];
    const count = width < 700 ? 11 : 17;
    for (let i = 0; i < count; i++) {
      const depth = 0.25 + Math.random() * 0.75; // 越大越近
      bgClouds.push({
        x: Math.random() * (width + 400) - 200,
        y: Math.random() * height * 0.96,
        rx: (130 + Math.random() * 240) * (0.7 + depth * 0.65),
        ry: (48 + Math.random() * 92) * (0.7 + depth * 0.55),
        depth,
        alpha: 0.08 + depth * 0.14,
        speed: 4 + depth * 12,
        phase: Math.random() * Math.PI * 2
      });
    }

    ambientWisps = [];
    const wispCount = width < 700 ? 16 : 28;
    for (let i = 0; i < wispCount; i++) {
      ambientWisps.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 45 + Math.random() * 110,
        alpha: 0.04 + Math.random() * 0.08,
        speed: 14 + Math.random() * 24,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // -----------------------------------------------------------------
  // 英文书信排版：按字符拆分为独立物理与 3D 空间对象
  // -----------------------------------------------------------------
  function layoutLetters(preserveGoneSet = null) {
    glyphCache.clear();

    // 镜头更近、主视觉更饱满沉浸的动态字号计算
    const isNarrow = width < 720;
    const maxTextWidth = isNarrow
      ? Math.min(width * 0.88, 520)
      : Math.min(width * 0.74, 960);

    baseFontSize = clamp(
      isNarrow ? width * 0.068 : Math.min(width * 0.036, height * 0.056),
      23,
      46
    );
    const lineHeight = baseFontSize * (isNarrow ? 1.46 : 1.54);
    const paragraphGap = baseFontSize * 0.68;

    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');

    // 先完成自动换行计算，以准确垂直居中整封信件
    const layoutLines = [];
    LETTER_PARAGRAPHS.forEach((para, pIndex) => {
      const isSignature = pIndex === LETTER_PARAGRAPHS.length - 1;
      const isSalutation = pIndex === 0;
      const paraFontSize = isSignature
        ? baseFontSize * 0.82
        : isSalutation
          ? baseFontSize * 1.06
          : baseFontSize;
      const isItalic = isSalutation || isSignature;

      mctx.font = `${isItalic ? 'italic ' : ''}400 ${paraFontSize}px ${fontFamily}`;

      const words = para.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (mctx.measureText(candidate).width > maxTextWidth && currentLine) {
          layoutLines.push({
            text: currentLine,
            fontSize: paraFontSize,
            isItalic,
            isSignature,
            paraIndex: pIndex
          });
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      });

      if (currentLine) {
        layoutLines.push({
          text: currentLine,
          fontSize: paraFontSize,
          isItalic,
          isSignature,
          paraIndex: pIndex
        });
      }

      if (pIndex < LETTER_PARAGRAPHS.length - 1) {
        layoutLines.push({ isGap: true, height: paragraphGap });
      }
    });

    // 计算总高度，确保位于画面视觉黄金中心且避开顶部标题和底部控制栏
    let totalHeight = 0;
    layoutLines.forEach((line) => {
      totalHeight += line.isGap ? line.height : lineHeight;
    });

    const startX = (width - maxTextWidth) * 0.5;
    const usableCenterY = height * 0.485;
    let cursorY = Math.max(96, usableCenterY - totalHeight * 0.5 + baseFontSize * 0.5);

    const newLetters = [];
    let charGlobalId = 0;

    layoutLines.forEach((line) => {
      if (line.isGap) {
        cursorY += line.height;
        return;
      }

      mctx.font = `${line.isItalic ? 'italic ' : ''}400 ${line.fontSize}px ${fontFamily}`;
      const lineWidth = mctx.measureText(line.text).width;

      // 落款微微右偏，正文保持自然舒展的书信左对齐（整体居中于画幅）
      let cursorX = line.isSignature
        ? startX + Math.max(0, maxTextWidth - lineWidth)
        : startX;

      for (let i = 0; i < line.text.length; i++) {
        const ch = line.text[i];
        const advance = mctx.measureText(ch).width;

        if (ch !== ' ') {
          const asset = getGlyphAsset(ch, line.fontSize, line.isItalic);
          const id = charGlobalId;
          const alreadyGone = preserveGoneSet ? preserveGoneSet.has(id) : false;

          // 每个字母自带轻微 3D 纵深与独立漂浮基因
          const homeZ = (Math.sin(id * 1.91) * 0.65 + Math.cos(id * 0.73) * 0.35) * 78;
          const homeX = cursorX + advance * 0.5;
          const homeY = cursorY;

          newLetters.push({
            id,
            char: ch,
            asset,
            fontSize: line.fontSize,
            homeX,
            homeY,
            homeZ,
            x: homeX,
            y: homeY,
            z: homeZ,
            vx: 0,
            vy: 0,
            vz: 0,
            rot: 0,
            vRot: 0,
            tiltX: 0,
            tiltY: 0,
            // 失序累积位移（受 DISORDER 与气流影响，逐渐偏离排布）
            driftX: 0,
            driftY: 0,
            driftRot: 0,
            mistLevel: 0, // 0=清晰云白，1=彻底雾化
            alpha: alreadyGone ? 0 : 1,
            state: alreadyGone ? 'gone' : 'intact', // intact | dissolving | gone
            dissolveProgress: alreadyGone ? 1 : 0,
            phase: id * 0.57 + Math.random() * Math.PI * 2,
            floatSpeed: 0.65 + (id % 7) * 0.11,
            disorderBiasX: (Math.random() - 0.35) * 1.4,
            disorderBiasY: (Math.random() - 0.55) * 1.2,
            disorderSpin: (Math.random() - 0.5) * 0.85,
            hitRadius: Math.max(line.fontSize * 0.58, advance * 0.72),
            wakeExposure: 0
          });
        }

        charGlobalId++;
        cursorX += advance;
      }

      cursorY += lineHeight;
    });

    letters = newLetters;
  }

  // -----------------------------------------------------------------
  // 粒子系统：云雾消散粒子 + 白鸽翼尖气流风痕
  // -----------------------------------------------------------------
  function spawnCloudParticle(opts) {
    if (cloudParticles.length > 520) {
      cloudParticles.shift();
    }
    cloudParticles.push({
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      size: opts.size || 24,
      grow: opts.grow !== undefined ? opts.grow : 14,
      alpha: opts.alpha !== undefined ? opts.alpha : 0.65,
      life: 0,
      maxLife: opts.maxLife || 1.6,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.9,
      stretch: opts.stretch || 1,
      angle: opts.angle || 0
    });
  }

  // 单击永久消散：沿字母笔画轮廓绽放为云雾粒子并随风散去
  function dissolveLetter(letter, reason = 'click', pushVx = 0, pushVy = 0) {
    if (letter.state !== 'intact') return;
    letter.state = 'dissolving';
    letter.dissolveProgress = 0;

    const proj = project3D(letter.x, letter.y, letter.z);
    const pts = letter.asset.samplePoints;
    const targetCount = reason === 'click' ? 30 : 18;
    const stride = Math.max(1, Math.floor(pts.length / targetCount));

    const ambientWindX = 18 + params.wind * 58;
    const ambientWindY = -8 - params.wind * 16;

    for (let i = 0; i < pts.length; i += stride) {
      const p = pts[i];
      const px = proj.sx + p.dx * proj.scale;
      const py = proj.sy + p.dy * proj.scale;
      const burstAngle = Math.atan2(p.dy, p.dx) + (Math.random() - 0.5) * 0.9;
      const burstSpeed = (reason === 'click' ? 14 : 24) + Math.random() * 28;

      spawnCloudParticle({
        x: px,
        y: py,
        vx: Math.cos(burstAngle) * burstSpeed + ambientWindX * (0.45 + Math.random() * 0.55) + pushVx * 0.32,
        vy: Math.sin(burstAngle) * burstSpeed + ambientWindY * (0.45 + Math.random() * 0.55) + pushVy * 0.32,
        size: (14 + Math.random() * 20) * proj.scale,
        grow: 22 + Math.random() * 24,
        alpha: 0.42 + Math.random() * 0.32,
        maxLife: 1.35 + Math.random() * 1.15,
        stretch: reason === 'wake' ? 1.55 : 1.15,
        angle: Math.atan2(pushVy + ambientWindY, pushVx + ambientWindX)
      });
    }
  }

  // 生成流线型风痕丝带（替代圆形光圈，真正呈现空气流动）
  function emitDoveAirflow(dt) {
    dove.trailTimer += dt;
    const speed = Math.hypot(dove.vx, dove.vy);
    const dirX = dove.headingX;
    const dirY = dove.headingY;
    const perpX = -dirY;
    const perpY = dirX;

    const reachScale = 0.65 + params.reach * 1.15;

    // 1. 连续气流丝线（翼尖双轨 + 中央空气流线）
    if (dove.trailTimer >= 0.022) {
      dove.trailTimer = 0;
      const wingSpread = (16 + Math.sin(dove.wingPhase) * 8) * dove.scale;

      // 生成平滑曲线风痕节点
      const ribbonCount = speed > 65 ? 2 : 1;
      for (let r = 0; r < ribbonCount; r++) {
        const side = r === 0 ? -1 : 1;
        const offset = (side * wingSpread * (0.65 + Math.random() * 0.55)) * reachScale * 0.72;
        const startX = dove.x - dirX * 14 + perpX * offset;
        const startY = dove.y - dirY * 14 + perpY * offset;

        windRibbons.push({
          points: [{ x: startX, y: startY }],
          vx: -dirX * (45 + speed * 0.16) + params.wind * 32 + (Math.random() - 0.5) * 18,
          vy: -dirY * (45 + speed * 0.16) - 6 + (Math.random() - 0.5) * 18,
          curl: (Math.random() - 0.5) * 1.6,
          width: 1.1 + Math.random() * 1.9,
          alpha: (0.22 + Math.min(speed / 500, 0.25)) * dove.opacity,
          life: 0,
          maxLife: 0.72 + Math.random() * 0.55,
          maxPoints: 16
        });
      }

      if (windRibbons.length > 90) {
        windRibbons.splice(0, windRibbons.length - 90);
      }

      // 2. 柔长云丝拖尾粒子（轻盈空气雾感）
      const wakeOffset = (Math.random() - 0.5) * 34 * reachScale;
      spawnCloudParticle({
        x: dove.x - dirX * 18 + perpX * wakeOffset,
        y: dove.y - dirY * 18 + perpY * wakeOffset,
        vx: -dirX * (28 + speed * 0.12) + dirX * 12 + params.wind * 25,
        vy: -dirY * (28 + speed * 0.12) + dirY * 12 - 5,
        size: (18 + Math.random() * 20) * (0.85 + params.reach * 0.45),
        grow: 26 + Math.random() * 20,
        alpha: 0.24 * dove.opacity,
        maxLife: 0.95 + Math.random() * 0.65,
        stretch: 2.1 + Math.random() * 0.9,
        angle: Math.atan2(dirY, dirX)
      });
    }
  }

  // -----------------------------------------------------------------
  // 轻微 3D 透视投影（镜头更近、更有空间纵深但克制自然）
  // -----------------------------------------------------------------
  function project3D(x, y, z) {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const camX = camera.x;
    const camY = camera.y;
    const scale = camera.focalLength / (camera.focalLength - z);
    return {
      sx: cx + (x - cx - camX * (z * 0.0045 + 0.35)) * scale,
      sy: cy + (y - cy - camY * (z * 0.0045 + 0.35)) * scale,
      scale
    };
  }

  // -----------------------------------------------------------------
  // 交互事件：兼容桌面鼠标与移动端触控，精确区分单击与长按
  // -----------------------------------------------------------------
  function findHitLetter(px, py) {
    let best = null;
    let bestDist = Infinity;

    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.state !== 'intact') continue;
      const proj = project3D(l.x, l.y, l.z);
      const dx = px - proj.sx;
      const dy = py - proj.sy;
      const dist = Math.hypot(dx, dy);
      const radius = l.hitRadius * proj.scale;
      if (dist <= radius && dist < bestDist) {
        best = l;
        bestDist = dist;
      }
    }
    return best;
  }

  function summonDove(x, y) {
    pointer.longPressActive = true;
    dove.active = true;
    dove.releasing = false;

    // 让白鸽从落点后方微侧轻盈滑入，而不是生硬闪现
    const enterDirX = Math.abs(pointer.vx) > 20 ? Math.sign(pointer.vx) : 1;
    dove.x = x - enterDirX * 26;
    dove.y = y + 10;
    dove.vx = enterDirX * 80;
    dove.vy = -18;
    dove.headingX = enterDirX;
    dove.headingY = -0.15;
    dove.angle = Math.atan2(dove.headingY, dove.headingX);
    dove.opacity = Math.max(dove.opacity, 0.15);

    // 召唤瞬间带起一缕极轻的云丝
    for (let i = 0; i < 6; i++) {
      spawnCloudParticle({
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 18,
        vx: enterDirX * (25 + Math.random() * 35),
        vy: -10 + (Math.random() - 0.5) * 22,
        size: 16 + Math.random() * 14,
        grow: 18,
        alpha: 0.28,
        maxLife: 0.9,
        stretch: 1.7,
        angle: dove.angle
      });
    }
  }

  function releaseDove() {
    if (dove.active && !dove.releasing) {
      dove.releasing = true;
      // 松手后白鸽顺当前方向轻扬滑翔离开，逐渐融回晴空
      const boost = 115;
      dove.vx = dove.vx * 0.55 + dove.headingX * boost;
      dove.vy = dove.vy * 0.55 + dove.headingY * boost - 38;
    }
  }

  function markInteracted() {
    if (!pointer.hasInteracted) {
      pointer.hasInteracted = true;
      gestureHint.classList.add('is-subtle');
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    markInteracted();

    canvas.setPointerCapture(e.pointerId);
    pointer.isDown = true;
    pointer.pointerId = e.pointerId;
    pointer.downTime = performance.now();
    pointer.downX = e.clientX;
    pointer.downY = e.clientY;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.prevX = e.clientX;
    pointer.prevY = e.clientY;
    pointer.vx = 0;
    pointer.vy = 0;
    pointer.hasMovedFar = false;
    pointer.longPressActive = false;

    clearTimeout(pointer.longPressTimer);
    // 长按约 210ms 召唤白鸽携信（既不误触单击，响应又流畅自然）
    pointer.longPressTimer = setTimeout(() => {
      if (pointer.isDown && !pointer.longPressActive) {
        summonDove(pointer.x, pointer.y);
      }
    }, 210);
  });

  canvas.addEventListener('pointermove', (e) => {
    const nx = e.clientX;
    const ny = e.clientY;

    // 轻微镜头视差跟随指针位置
    camera.targetX = ((nx / width) - 0.5) * 28;
    camera.targetY = ((ny / height) - 0.5) * 20;

    if (!pointer.isDown || e.pointerId !== pointer.pointerId) return;
    e.preventDefault();

    const dx = nx - pointer.x;
    const dy = ny - pointer.y;
    pointer.vx = lerp(pointer.vx, dx * 48, 0.35);
    pointer.vy = lerp(pointer.vy, dy * 48, 0.35);
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = nx;
    pointer.y = ny;

    const totalMove = Math.hypot(nx - pointer.downX, ny - pointer.downY);
    if (totalMove > 14) {
      pointer.hasMovedFar = true;
      // 如果按下后立刻开始拖动，提前召唤白鸽顺势掠风
      if (!pointer.longPressActive && performance.now() - pointer.downTime > 85) {
        clearTimeout(pointer.longPressTimer);
        summonDove(nx, ny);
      }
    }
  });

  function handlePointerEnd(e) {
    if (!pointer.isDown || e.pointerId !== pointer.pointerId) return;
    clearTimeout(pointer.longPressTimer);

    const elapsed = performance.now() - pointer.downTime;
    const moveDist = Math.hypot(e.clientX - pointer.downX, e.clientY - pointer.downY);

    // 判定为单击/轻触：精准命中字母则永久消散
    if (!pointer.longPressActive && elapsed < 260 && moveDist < 16) {
      const hit = findHitLetter(e.clientX, e.clientY);
      if (hit) {
        dissolveLetter(hit, 'click');
      }
    } else if (pointer.longPressActive) {
      releaseDove();
    }

    pointer.isDown = false;
    pointer.pointerId = null;
    pointer.longPressActive = false;
  }

  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);

  // 防止移动端长按弹出系统右键菜单
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 参数绑定
  windSlider.addEventListener('input', () => {
    params.wind = Number(windSlider.value) / 100;
    windValueEl.textContent = `${windSlider.value}%`;
  });

  disorderSlider.addEventListener('input', () => {
    params.disorder = Number(disorderSlider.value) / 100;
    disorderValueEl.textContent = `${disorderSlider.value}%`;
  });

  reachSlider.addEventListener('input', () => {
    params.reach = Number(reachSlider.value) / 100;
    reachValueEl.textContent = `${reachSlider.value}%`;
  });

  resetBtn.addEventListener('click', () => {
    cloudParticles = [];
    windRibbons = [];
    dove.active = false;
    dove.releasing = false;
    dove.opacity = 0;
    layoutLetters(null);
  });

  // -----------------------------------------------------------------
  // 物理更新主循环
  // -----------------------------------------------------------------
  function update(dt, t) {
    // 镜头视差平滑缓动
    camera.x = lerp(camera.x, camera.targetX, Math.min(1, dt * 3.5));
    camera.y = lerp(camera.y, camera.targetY, Math.min(1, dt * 3.5));

    // 1. 更新远景流云与空气微丝
    const baseSkySpeed = 0.55 + params.wind * 1.9;
    for (let i = 0; i < bgClouds.length; i++) {
      const c = bgClouds[i];
      c.x += c.speed * baseSkySpeed * dt;
      c.y += Math.sin(t * 0.25 + c.phase) * 2.5 * dt;
      if (c.x - c.rx > width + 180) {
        c.x = -c.rx - 140;
        c.y = Math.random() * height * 0.92;
      }
    }

    for (let i = 0; i < ambientWisps.length; i++) {
      const w = ambientWisps[i];
      w.x += w.speed * (0.45 + params.wind * 2.1) * dt;
      w.y += Math.sin(t * 0.9 + w.phase) * 5 * dt;
      if (w.x - w.len > width + 40) {
        w.x = -w.len - 20;
        w.y = Math.random() * height;
      }
    }

    // 2. 更新白鸽携信飞行运动与气流拖尾
    if (dove.active) {
      if (!dove.releasing) {
        dove.opacity = Math.min(1, dove.opacity + dt * 4.5);

        // 弹性跟随指针，带优雅飞行惯性
        const dx = pointer.x - dove.x;
        const dy = pointer.y - dove.y;
        const stiffness = 13.5;
        const damping = 5.4;

        dove.vx += (dx * stiffness - dove.vx * damping) * dt;
        dove.vy += (dy * stiffness - dove.vy * damping) * dt;

        // 悬停时注入极轻柔的盘旋呼吸与常风微推
        const distToTarget = Math.hypot(dx, dy);
        if (distToTarget < 18) {
          dove.vx += Math.cos(t * 2.2) * 18 * dt;
          dove.vy += Math.sin(t * 3.1) * 14 * dt;
        }

        dove.x += dove.vx * dt;
        dove.y += dove.vy * dt;

        const speed = Math.hypot(dove.vx, dove.vy);
        if (speed > 14) {
          const targetHx = dove.vx / speed;
          const targetHy = dove.vy / speed;
          dove.headingX = lerp(dove.headingX, targetHx, Math.min(1, dt * 8.5));
          dove.headingY = lerp(dove.headingY, targetHy, Math.min(1, dt * 8.5));
          const hLen = Math.hypot(dove.headingX, dove.headingY) || 1;
          dove.headingX /= hLen;
          dove.headingY /= hLen;
        }

        dove.angle = Math.atan2(dove.headingY, dove.headingX);

        // 转弯倾斜感 + 加速扇翼/滑翔动态
        const crossTurn = dove.headingX * dove.vy - dove.headingY * dove.vx;
        dove.bank = lerp(dove.bank, clamp(crossTurn * 0.0025, -0.55, 0.55), Math.min(1, dt * 6));
        const targetWingSpeed = 6.2 + Math.min(speed * 0.018, 6.5);
        dove.wingSpeed = lerp(dove.wingSpeed, targetWingSpeed, Math.min(1, dt * 5));
        dove.wingPhase += dove.wingSpeed * dt;

        emitDoveAirflow(dt);
      } else {
        // 松手后轻扬滑翔淡出
        dove.opacity -= dt * 1.15;
        dove.vx *= Math.pow(0.92, dt * 60);
        dove.vy = dove.vy * Math.pow(0.94, dt * 60) - 22 * dt;
        dove.x += dove.vx * dt;
        dove.y += dove.vy * dt;
        dove.wingPhase += 5.4 * dt;
        dove.angle = Math.atan2(dove.vy, dove.vx);

        if (dove.opacity > 0.18) {
          emitDoveAirflow(dt);
        } else if (dove.opacity <= 0) {
          dove.active = false;
          dove.releasing = false;
          dove.opacity = 0;
        }
      }
    }

    // 3. 更新风痕丝带
    for (let i = windRibbons.length - 1; i >= 0; i--) {
      const r = windRibbons[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        windRibbons.splice(i, 1);
        continue;
      }

      // 丝带头部顺风延展并叠加轻微涡流弯曲
      const head = r.points[0];
      const angleShift = r.curl * dt;
      const cosA = Math.cos(angleShift);
      const sinA = Math.sin(angleShift);
      const nvx = r.vx * cosA - r.vy * sinA;
      const nvy = r.vx * sinA + r.vy * cosA;
      r.vx = nvx * Math.pow(0.975, dt * 60);
      r.vy = nvy * Math.pow(0.975, dt * 60);

      r.points.unshift({
        x: head.x + r.vx * dt,
        y: head.y + r.vy * dt
      });
      if (r.points.length > r.maxPoints) {
        r.points.pop();
      }
    }

    // 4. 更新每个云朵字母（常风 + 独立漂浮失序 + 白鸽尾流卷散雾化）
    const reachPx = (95 + params.reach * 235) * (width < 700 ? 0.78 : 1);
    const doveSpeed = Math.hypot(dove.vx, dove.vy);
    const windStrength = params.wind;
    const disorderStrength = params.disorder;

    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.state === 'gone') continue;

      if (l.state === 'dissolving') {
        l.dissolveProgress += dt * 2.15;
        l.mistLevel = clamp(l.mistLevel + dt * 2.4, 0, 1);
        l.alpha = Math.max(0, 1 - l.dissolveProgress);
        l.x += (l.vx + 16 + windStrength * 45) * dt;
        l.y += (l.vy - 10) * dt;
        if (l.dissolveProgress >= 1) {
          l.state = 'gone';
          l.alpha = 0;
        }
        continue;
      }

      // 字母自身柔和三维漂浮
      const n = skyNoise(l.homeX, l.homeY, t * (0.65 + windStrength * 0.9));
      const floatX = Math.sin(t * l.floatSpeed + l.phase) * (2.5 + disorderStrength * 11) + n * windStrength * 16;
      const floatY = Math.cos(t * l.floatSpeed * 0.86 + l.phase) * (3.2 + disorderStrength * 12);
      const floatZ = Math.sin(t * 0.55 + l.phase) * (10 + disorderStrength * 26);

      // DISORDER 控制长期渐进的轻微失序漂移（像字迹在云端慢慢舒展开）
      const targetDriftX = l.disorderBiasX * disorderStrength * 34 + windStrength * disorderStrength * 28;
      const targetDriftY = l.disorderBiasY * disorderStrength * 24 - windStrength * disorderStrength * 9;
      const targetDriftRot = l.disorderSpin * disorderStrength * 0.28 + n * windStrength * 0.08;

      l.driftX = lerp(l.driftX, targetDriftX, Math.min(1, dt * 0.7));
      l.driftY = lerp(l.driftY, targetDriftY, Math.min(1, dt * 0.7));
      l.driftRot = lerp(l.driftRot, targetDriftRot, Math.min(1, dt * 0.8));

      // 弹簧回拉（失序越高、雾化越重，回拉越松弛，越容易被吹走）
      const anchorX = l.homeX + l.driftX + floatX;
      const anchorY = l.homeY + l.driftY + floatY;
      const anchorZ = l.homeZ + floatZ;

      const springK = lerp(2.8, 0.55, clamp(disorderStrength * 0.6 + l.mistLevel * 0.65, 0, 1));
      l.vx += (anchorX - l.x) * springK * dt;
      l.vy += (anchorY - l.y) * springK * dt;
      l.vz += (anchorZ - l.z) * 1.8 * dt;

      // 常风的轻柔空气吹拂
      l.vx += (windStrength * 14 + n * windStrength * 22) * dt;
      l.vy += (-windStrength * 3.5 + Math.cos(t * 0.9 + l.phase) * windStrength * 8) * dt;

      // 白鸽掠过产生的定向空气尾流（非圆形光圈，呈流线椭圆尾迹风场）
      if (dove.active && dove.opacity > 0.1) {
        const proj = project3D(l.x, l.y, l.z);
        const rx = proj.sx - dove.x;
        const ry = proj.sy - dove.y;

        // 转换到白鸽局部坐标系：along 表示沿飞行方向，across 表示翼展侧向
        const along = rx * dove.headingX + ry * dove.headingY;
        const across = -rx * dove.headingY + ry * dove.headingX;

        // 气流尾迹向白鸽后方拉长，形成真实掠风走廊
        const wakeCenterShift = -reachPx * 0.28;
        const normAlong = (along - wakeCenterShift) / (reachPx * 1.18);
        const normAcross = across / (reachPx * 0.68);
        const wakeDist = Math.hypot(normAlong, normAcross);

        if (wakeDist < 1) {
          const influence = Math.pow(1 - wakeDist, 1.65) * dove.opacity;
          const airSpeed = 120 + Math.min(doveSpeed, 620) * 0.95;

          // 主气流推力沿白鸽飞行方向 + 翼尖卷吸涡流
          const vortexSign = across >= 0 ? 1 : -1;
          const perpX = -dove.headingY;
          const perpY = dove.headingX;

          const pushX = dove.headingX * airSpeed * 1.85 + perpX * vortexSign * airSpeed * 0.42;
          const pushY = dove.headingY * airSpeed * 1.85 + perpY * vortexSign * airSpeed * 0.42;

          l.vx += pushX * influence * dt * 2.2;
          l.vy += pushY * influence * dt * 2.2;
          l.vz += (18 + Math.sin(l.phase + t * 4) * 35) * influence * dt * 2.0;
          l.vRot += vortexSign * influence * (1.8 + doveSpeed * 0.004) * dt;

          // 气流掠过使字母逐渐雾化，并剥离细小云丝随白鸽远去
          l.mistLevel = clamp(l.mistLevel + influence * dt * (0.85 + doveSpeed * 0.0018), 0, 1);
          l.wakeExposure += influence * dt * (0.9 + doveSpeed * 0.0022);

          if (Math.random() < influence * 0.32) {
            spawnCloudParticle({
              x: proj.sx + (Math.random() - 0.5) * l.fontSize * 0.4,
              y: proj.sy + (Math.random() - 0.5) * l.fontSize * 0.4,
              vx: dove.headingX * (45 + doveSpeed * 0.25) + (Math.random() - 0.5) * 20,
              vy: dove.headingY * (45 + doveSpeed * 0.25) - 6 + (Math.random() - 0.5) * 20,
              size: 12 + Math.random() * 14,
              grow: 18,
              alpha: 0.28 * influence,
              maxLife: 0.95 + Math.random() * 0.65,
              stretch: 1.9,
              angle: dove.angle
            });
          }

          // 若白鸽贴近且持续卷过，该字母被白鸽“带走”，永久化雾消散
          if (l.wakeExposure > 0.78 && l.mistLevel > 0.72) {
            dissolveLetter(l, 'wake', dove.vx + dove.headingX * 90, dove.vy + dove.headingY * 90);
            continue;
          }
        }
      }

      // 空气阻尼
      const drag = Math.pow(0.915, dt * 60);
      l.vx *= drag;
      l.vy *= drag;
      l.vz *= Math.pow(0.90, dt * 60);
      l.vRot *= Math.pow(0.89, dt * 60);

      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.z = clamp(l.z + l.vz * dt, -160, 180);

      l.rot += l.vRot * dt;
      l.rot = lerp(l.rot, l.driftRot, Math.min(1, dt * 1.1));

      // 轻度雾化在风过后会极其缓慢地略微凝实（已被带走消散的字母不会恢复）
      if (l.mistLevel > 0 && l.mistLevel < 0.72) {
        l.mistLevel = Math.max(0, l.mistLevel - dt * 0.08);
      }

      // 轻微 3D 倾角，受横向与纵向速度驱动
      l.tiltY = clamp(l.vx * 0.0022 + Math.sin(t * 0.7 + l.phase) * disorderStrength * 0.14, -0.42, 0.42);
      l.tiltX = clamp(l.vy * 0.0022 + Math.cos(t * 0.6 + l.phase) * disorderStrength * 0.12, -0.35, 0.35);
    }

    // 5. 更新消散云雾粒子
    for (let i = cloudParticles.length - 1; i >= 0; i--) {
      const p = cloudParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        cloudParticles.splice(i, 1);
        continue;
      }

      const n = skyNoise(p.x, p.y, t * 1.1);
      p.vx += (params.wind * 18 + n * 16) * dt;
      p.vy += (-6 + Math.cos(t + p.rot) * 9) * dt;
      p.vx *= Math.pow(0.975, dt * 60);
      p.vy *= Math.pow(0.975, dt * 60);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      p.rot += p.vRot * dt;
    }
  }

  // -----------------------------------------------------------------
  // 绘制模块：晴空背景 -> 远景流云 -> 云白文字 -> 风痕丝带 -> 携信白鸽 -> 云雾粒子
  // -----------------------------------------------------------------
  function drawSkyBackground() {
    // 明亮通透的晴朗天空蓝渐变
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#4f9ae6');
    grad.addColorStop(0.38, '#79baf2');
    grad.addColorStop(0.76, '#b7ddfb');
    grad.addColorStop(1, '#e6f4ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 顶部微暖天光（让画面通透诗意，不发闷）
    const sunGlow = ctx.createRadialGradient(
      width * 0.76 - camera.x * 0.6,
      height * 0.14 - camera.y * 0.6,
      10,
      width * 0.76,
      height * 0.14,
      Math.max(width, height) * 0.65
    );
    sunGlow.addColorStop(0, 'rgba(255, 253, 245, 0.34)');
    sunGlow.addColorStop(0.45, 'rgba(232, 246, 255, 0.12)');
    sunGlow.addColorStop(1, 'rgba(232, 246, 255, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, width, height);

    // 远景柔软流云层
    for (let i = 0; i < bgClouds.length; i++) {
      const c = bgClouds[i];
      const px = c.x - camera.x * c.depth * 0.55;
      const py = c.y - camera.y * c.depth * 0.45;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(c.rx / 60, c.ry / 60);
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(puffSprite, -60, -60, 120, 120);
      ctx.restore();
    }

    // 极轻高空空气微丝
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < ambientWisps.length; i++) {
      const w = ambientWisps[i];
      const gradLine = ctx.createLinearGradient(w.x, w.y, w.x + w.len, w.y - 6);
      gradLine.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradLine.addColorStop(0.5, `rgba(255, 255, 255, ${w.alpha})`);
      gradLine.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = gradLine;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.quadraticCurveTo(w.x + w.len * 0.5, w.y - 5, w.x + w.len, w.y - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLetters() {
    // 按 z 轴由远及近排序，保持自然 3D 遮挡层次
    const renderList = letters.filter((l) => l.state !== 'gone');
    renderList.sort((a, b) => a.z - b.z);

    for (let i = 0; i < renderList.length; i++) {
      const l = renderList[i];
      const proj = project3D(l.x, l.y, l.z);

      // 纵深带来的轻微空气感与缩放
      const depthAlpha = clamp(0.84 + (l.z + 100) / 520, 0.68, 1);
      const baseAlpha = l.alpha * depthAlpha;
      if (baseAlpha <= 0.01) continue;

      const scaleX = proj.scale * Math.cos(l.tiltY);
      const scaleY = proj.scale * Math.cos(l.tiltX);
      const w = l.asset.w;
      const h = l.asset.h;

      ctx.save();
      ctx.translate(proj.sx, proj.sy);
      ctx.rotate(l.rot);
      ctx.scale(scaleX, scaleY);

      // 清晰云朵层（随雾化程度柔和淡出）
      const crispAlpha = baseAlpha * clamp(1 - l.mistLevel * 0.92, 0, 1);
      if (crispAlpha > 0.01) {
        ctx.globalAlpha = crispAlpha;
        ctx.drawImage(l.asset.crisp, -w * 0.5, -h * 0.5, w, h);
      }

      // 雾化云团层（被气流拂过时显现柔和雾散效果）
      const mistAlpha = baseAlpha * clamp(l.mistLevel * 1.15, 0, 1);
      if (mistAlpha > 0.01) {
        const mistExpand = 1 + l.mistLevel * 0.24;
        ctx.globalAlpha = mistAlpha * 0.9;
        ctx.drawImage(
          l.asset.misty,
          -w * 0.5 * mistExpand,
          -h * 0.5 * mistExpand,
          w * mistExpand,
          h * mistExpand
        );
      }

      ctx.restore();
    }
  }

  function drawWindRibbons() {
    if (windRibbons.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < windRibbons.length; i++) {
      const r = windRibbons[i];
      if (r.points.length < 3) continue;

      const progress = r.life / r.maxLife;
      const fade = Math.sin(progress * Math.PI); // 柔和渐入渐出
      const alpha = r.alpha * fade;
      if (alpha <= 0.008) continue;

      const head = r.points[0];
      const tail = r.points[r.points.length - 1];
      const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.55, `rgba(242, 250, 255, ${alpha * 0.65})`);
      grad.addColorStop(1, 'rgba(235, 248, 255, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = r.width * (1 - progress * 0.35);
      ctx.beginPath();
      ctx.moveTo(r.points[0].x, r.points[0].y);
      for (let j = 1; j < r.points.length - 1; j++) {
        const xc = (r.points[j].x + r.points[j + 1].x) * 0.5;
        const yc = (r.points[j].y + r.points[j + 1].y) * 0.5;
        ctx.quadraticCurveTo(r.points[j].x, r.points[j].y, xc, yc);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // -----------------------------------------------------------------
  // 绘制简洁优雅的半抽象白鸽剪影 + 小信封（核心“云中来信”意象）
  // -----------------------------------------------------------------
  function drawWhiteDove() {
    if (!dove.active || dove.opacity <= 0.01) return;

    const flap = Math.sin(dove.wingPhase);
    const flapSecondary = Math.sin(dove.wingPhase - 0.55);
    const facingLeft = Math.cos(dove.angle) < 0;
    const s = dove.scale * (width < 700 ? 0.88 : 1.05);

    ctx.save();
    ctx.translate(dove.x, dove.y);
    ctx.rotate(dove.angle);
    if (facingLeft) {
      // 向左飞时保持背朝上、信件朝下的自然姿态
      ctx.scale(1, -1);
    }
    ctx.scale(s, s);
    ctx.globalAlpha = dove.opacity;

    // 柔和白色羽光（不是圆形 UI 光圈，而是贴合羽翼轮廓的柔光）
    ctx.shadowColor = 'rgba(255, 255, 255, 0.72)';
    ctx.shadowBlur = 14;

    // 1. 远侧翅膀（略带晴空淡蓝影，形成空间层次）
    const backWingLift = -24 + flapSecondary * 18;
    const backWingSweep = -12 - Math.abs(flapSecondary) * 8;
    ctx.fillStyle = 'rgba(229, 243, 255, 0.88)';
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.bezierCurveTo(-4, backWingLift * 0.65, -18, backWingLift, backWingSweep - 16, backWingLift + 4);
    ctx.bezierCurveTo(-20, backWingLift * 0.32, -10, -2, -6, 1);
    ctx.closePath();
    ctx.fill();

    // 2. 小巧精致的信封（衔于鸽喙下方轻随风微摆，不抢戏但一眼可辨）
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(42, 102, 162, 0.18)';
    const envSwing = Math.sin(dove.wingPhase * 0.5 - 0.4) * 0.09;
    ctx.translate(21, 5.5);
    ctx.rotate(0.18 + envSwing);

    // 信封主体（柔和奶白信纸）
    const ew = 13.5;
    const eh = 9.2;
    ctx.fillStyle = 'rgba(255, 253, 247, 0.96)';
    ctx.strokeStyle = 'rgba(130, 178, 222, 0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-ew * 0.5, -eh * 0.5, ew, eh, 1.5);
    } else {
      ctx.rect(-ew * 0.5, -eh * 0.5, ew, eh);
    }
    ctx.fill();
    ctx.stroke();

    // 信封折痕（V 形封口）
    ctx.strokeStyle = 'rgba(122, 168, 212, 0.62)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-ew * 0.46, -eh * 0.42);
    ctx.lineTo(0, eh * 0.08);
    ctx.lineTo(ew * 0.46, -eh * 0.42);
    ctx.stroke();

    // 极小的暖色火漆点（点睛“来信”意象，克制不喧宾夺主）
    ctx.fillStyle = 'rgba(222, 132, 122, 0.82)';
    ctx.beginPath();
    ctx.arc(0, eh * 0.06, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. 白鸽流线躯干、轻扬尾羽与头部剪影
    const bodyGrad = ctx.createLinearGradient(-22, -6, 20, 8);
    bodyGrad.addColorStop(0, 'rgba(238, 248, 255, 0.92)');
    bodyGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.99)');
    bodyGrad.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    // 喙尖
    ctx.moveTo(22.5, -1.2);
    // 头部弧线
    ctx.quadraticCurveTo(17.5, -6.5, 11.5, -4.5);
    // 背部延伸至舒展尾羽
    ctx.bezierCurveTo(3, -5.2, -9, -3.5, -26, -7.2);
    ctx.quadraticCurveTo(-20.5, -1.2, -28, 3.2);
    // 下尾与胸腹柔和曲线
    ctx.bezierCurveTo(-14, 5.8, -1, 7.6, 10.5, 4.2);
    ctx.quadraticCurveTo(16.5, 2.5, 22.5, -1.2);
    ctx.closePath();
    ctx.fill();

    // 4. 近侧主羽翼（优雅弧形扇动，带掠过感）
    const frontWingTipY = -30 + flap * 32;
    const frontWingTipX = -15 - flap * 5;
    const wingGrad = ctx.createLinearGradient(4, -2, frontWingTipX, frontWingTipY);
    wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.99)');
    wingGrad.addColorStop(0.75, 'rgba(251, 254, 255, 0.96)');
    wingGrad.addColorStop(1, 'rgba(232, 245, 255, 0.88)');
    ctx.fillStyle = wingGrad;

    ctx.beginPath();
    ctx.moveTo(6.5, -1.5);
    ctx.bezierCurveTo(
      3,
      frontWingTipY * 0.55,
      -6,
      frontWingTipY * 0.96,
      frontWingTipX - 9,
      frontWingTipY
    );
    ctx.bezierCurveTo(
      frontWingTipX - 2,
      frontWingTipY * 0.58 + 3,
      -9,
      frontWingTipY * 0.2 + 5,
      -7.5,
      2.2
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawCloudParticles() {
    for (let i = 0; i < cloudParticles.length; i++) {
      const p = cloudParticles[i];
      const progress = p.life / p.maxLife;
      // 柔和出现、自然膨胀淡散
      const env = progress < 0.16
        ? progress / 0.16
        : Math.pow(1 - (progress - 0.16) / 0.84, 1.45);
      const alpha = p.alpha * env;
      if (alpha <= 0.008) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + p.rot * 0.2);
      ctx.scale(p.stretch, 1);
      ctx.globalAlpha = alpha;
      const r = p.size * 0.5;
      ctx.drawImage(puffSprite, -r, -r, p.size, p.size);
      ctx.restore();
    }
  }

  // -----------------------------------------------------------------
  // 画布缩放与主动画循环
  // -----------------------------------------------------------------
  function handleResize() {
    const goneSet = new Set();
    letters.forEach((l) => {
      if (l.state === 'gone' || l.state === 'dissolving') {
        goneSet.add(l.id);
      }
    });

    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initBackgroundClouds();
    layoutLetters(goneSet.size > 0 ? goneSet : null);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 120);
  });

  // 初始化并启动渲染
  buildPuffSprite();
  handleResize();

  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const t = now / 1000;

    update(dt, t);

    drawSkyBackground();
    drawLetters();
    drawWindRibbons();
    drawCloudParticles();
    drawWhiteDove();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
