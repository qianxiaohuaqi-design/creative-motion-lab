/**
 * 云中来信 · A Letter from the Clouds (Gemini Independent Edition)
 * -----------------------------------------------------------------
 * 核心视觉与交互架构（纯 Vanilla JS + Canvas 2D + Web Audio API）：
 * 1. 四时晴空系统：支持晴午（Noon）/ 晨曦（Dawn）/ 晚霞（Sunset）/ 暮蓝（Dusk）
 *    四套天色切换，按主题缓存离屏字形贴图，同步微调背光边缘与白鸽羽翼高光。
 * 2. 云白文字与光学景深：独立字母对象结合 Z 轴偏离焦平面的程度自动混入 8%–22%
 *    misty 雾化贴图，搭配天光方向柔和底光，呈现立体空气透视。
 * 3. 「写信与寄信」闭环：支持中英文与换行自定义来信、旧字化雾消散与新字水汽凝结、
 *    `?msg=` URL 链接编解码、白鸽转弯/掠字落羽、以及 >90% 消散后的终章诗意留白。
 * 4. 多感官与端能力适配：Web Audio 程序化粉红噪声风声（默认静音）、移动端陀螺仪视差、
 *    桌面端悬停微震与手势光标、高清「云中明信片」PNG 一键定格导出。
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
  const writeBtn = document.getElementById('writeBtn');
  const gestureHint = document.getElementById('gestureHint');
  const skyHeaderEl = document.querySelector('.sky-header');
  const controlDockEl = document.querySelector('.control-dock');

  // 顶部天色切换、风声与明信片导出 DOM
  const themeSwitcher = document.getElementById('themeSwitcher');
  const themeChips = Array.from(document.querySelectorAll('.theme-chip'));
  const soundBtn = document.getElementById('soundBtn');
  const saveBtn = document.getElementById('saveBtn');

  // 写信浮层 DOM
  const writeModal = document.getElementById('writeModal');
  const writeBackdrop = document.getElementById('writeBackdrop');
  const closeWriteBtn = document.getElementById('closeWriteBtn');
  const letterInput = document.getElementById('letterInput');
  const letterCountEl = document.getElementById('letterCount');
  const restoreDefaultBtn = document.getElementById('restoreDefaultBtn');
  const writeFeedbackEl = document.getElementById('writeFeedback');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const applyLetterBtn = document.getElementById('applyLetterBtn');

  // 默认英文书信正文（保留原始完整叙事与排版质感）
  const DEFAULT_PARAGRAPHS = [
    'Dear traveler beneath the open blue,',
    'I folded these words into the morning drift so they might reach you before the wind turns. Some syllables linger like sunlit cirrus overhead, while others turn to mist the moment you touch them.',
    'Hold the sky, and a white dove will cross with this letter—carrying a breeze, and half the words away.',
    '— Sent by the high wind'
  ];
  const MAX_MESSAGE_LENGTH = 360;

  // 四套晴空时刻主题配置（天色、太阳光晕、字母背光与白鸽高光）
  const SKY_THEMES = {
    noon: {
      id: 'noon',
      skyStops: ['#4f9ae6', '#79baf2', '#b7ddfb', '#e6f4ff'],
      sunPos: { x: 0.76, y: 0.14 },
      sunCore: [255, 253, 245, 0.36],
      sunMid: [232, 246, 255, 0.13],
      sunEdge: [232, 246, 255, 0],
      glyphTop: 'rgba(255, 255, 255, 0.97)',
      glyphMid: 'rgba(249, 253, 255, 0.91)',
      glyphBottom: 'rgba(220, 240, 255, 0.80)',
      glyphBackGlow: 'rgba(225, 244, 255, 0.72)',
      glyphBackFill: 'rgba(218, 240, 255, 0.50)',
      glyphUnderRim: 'rgba(202, 234, 255, 0.42)',
      glyphMistyCore: 'rgba(255, 255, 255, 0.86)',
      glyphMistyHalo: 'rgba(235, 247, 255, 0.46)',
      hoverGlow: 'rgba(255, 255, 255, 0.82)',
      doveShadow: 'rgba(255, 255, 255, 0.74)',
      doveBackWing: 'rgba(228, 243, 255, 0.88)',
      doveWingStops: ['rgba(255, 255, 255, 0.99)', 'rgba(251, 254, 255, 0.96)', 'rgba(232, 245, 255, 0.88)'],
      doveBodyStops: ['rgba(238, 248, 255, 0.92)', 'rgba(255, 255, 255, 0.99)', 'rgba(255, 255, 255, 0.98)'],
      featherFill: 'rgba(252, 254, 255, 0.92)',
      featherQuill: 'rgba(216, 236, 252, 0.72)',
      epilogueMain: 'rgba(255, 255, 255, 0.97)',
      epilogueSub: 'rgba(242, 250, 255, 0.86)',
      epilogueGlow: 'rgba(24, 78, 138, 0.44)'
    },
    dawn: {
      id: 'dawn',
      skyStops: ['#5f8ec9', '#90b0dc', '#dfcad2', '#fae7dc'],
      sunPos: { x: 0.81, y: 0.32 },
      sunCore: [255, 234, 210, 0.44],
      sunMid: [255, 218, 202, 0.16],
      sunEdge: [255, 218, 202, 0],
      glyphTop: 'rgba(255, 252, 247, 0.97)',
      glyphMid: 'rgba(255, 246, 240, 0.91)',
      glyphBottom: 'rgba(236, 224, 242, 0.82)',
      glyphBackGlow: 'rgba(255, 224, 204, 0.74)',
      glyphBackFill: 'rgba(250, 226, 216, 0.50)',
      glyphUnderRim: 'rgba(230, 216, 244, 0.44)',
      glyphMistyCore: 'rgba(255, 250, 246, 0.86)',
      glyphMistyHalo: 'rgba(255, 230, 218, 0.46)',
      hoverGlow: 'rgba(255, 242, 228, 0.86)',
      doveShadow: 'rgba(255, 232, 214, 0.76)',
      doveBackWing: 'rgba(238, 228, 246, 0.88)',
      doveWingStops: ['rgba(255, 252, 247, 0.99)', 'rgba(255, 246, 238, 0.96)', 'rgba(248, 226, 218, 0.88)'],
      doveBodyStops: ['rgba(246, 236, 244, 0.93)', 'rgba(255, 253, 249, 0.99)', 'rgba(255, 248, 240, 0.98)'],
      featherFill: 'rgba(255, 249, 244, 0.92)',
      featherQuill: 'rgba(236, 216, 222, 0.72)',
      epilogueMain: 'rgba(255, 252, 248, 0.97)',
      epilogueSub: 'rgba(252, 242, 238, 0.86)',
      epilogueGlow: 'rgba(72, 50, 82, 0.42)'
    },
    sunset: {
      id: 'sunset',
      skyStops: ['#466eb0', '#8483ba', '#dda28e', '#f5cfa3'],
      sunPos: { x: 0.24, y: 0.56 },
      sunCore: [255, 224, 174, 0.48],
      sunMid: [250, 190, 152, 0.18],
      sunEdge: [250, 190, 152, 0],
      glyphTop: 'rgba(255, 250, 240, 0.97)',
      glyphMid: 'rgba(255, 241, 224, 0.91)',
      glyphBottom: 'rgba(234, 212, 224, 0.82)',
      glyphBackGlow: 'rgba(255, 214, 156, 0.78)',
      glyphBackFill: 'rgba(255, 218, 176, 0.52)',
      glyphUnderRim: 'rgba(255, 202, 148, 0.46)',
      glyphMistyCore: 'rgba(255, 247, 235, 0.87)',
      glyphMistyHalo: 'rgba(255, 218, 176, 0.46)',
      hoverGlow: 'rgba(255, 232, 192, 0.88)',
      doveShadow: 'rgba(255, 218, 168, 0.78)',
      doveBackWing: 'rgba(236, 220, 236, 0.88)',
      doveWingStops: ['rgba(255, 249, 238, 0.99)', 'rgba(255, 240, 216, 0.96)', 'rgba(255, 220, 178, 0.90)'],
      doveBodyStops: ['rgba(244, 228, 234, 0.93)', 'rgba(255, 250, 242, 0.99)', 'rgba(255, 240, 216, 0.98)'],
      featherFill: 'rgba(255, 246, 232, 0.92)',
      featherQuill: 'rgba(236, 206, 184, 0.72)',
      epilogueMain: 'rgba(255, 250, 242, 0.97)',
      epilogueSub: 'rgba(255, 238, 220, 0.86)',
      epilogueGlow: 'rgba(72, 38, 62, 0.44)'
    },
    dusk: {
      id: 'dusk',
      skyStops: ['#203a68', '#385f97', '#668ec0', '#9cbbe0'],
      sunPos: { x: 0.28, y: 0.78 },
      sunCore: [196, 226, 255, 0.28],
      sunMid: [152, 194, 242, 0.11],
      sunEdge: [152, 194, 242, 0],
      glyphTop: 'rgba(248, 252, 255, 0.95)',
      glyphMid: 'rgba(232, 244, 255, 0.89)',
      glyphBottom: 'rgba(188, 218, 248, 0.78)',
      glyphBackGlow: 'rgba(176, 218, 255, 0.74)',
      glyphBackFill: 'rgba(174, 216, 255, 0.46)',
      glyphUnderRim: 'rgba(160, 206, 255, 0.48)',
      glyphMistyCore: 'rgba(236, 247, 255, 0.84)',
      glyphMistyHalo: 'rgba(176, 216, 255, 0.44)',
      hoverGlow: 'rgba(212, 236, 255, 0.86)',
      doveShadow: 'rgba(182, 220, 255, 0.74)',
      doveBackWing: 'rgba(196, 222, 248, 0.86)',
      doveWingStops: ['rgba(248, 252, 255, 0.98)', 'rgba(232, 245, 255, 0.94)', 'rgba(196, 226, 255, 0.88)'],
      doveBodyStops: ['rgba(208, 228, 250, 0.92)', 'rgba(248, 252, 255, 0.98)', 'rgba(234, 246, 255, 0.96)'],
      featherFill: 'rgba(238, 248, 255, 0.90)',
      featherQuill: 'rgba(182, 216, 248, 0.74)',
      epilogueMain: 'rgba(244, 250, 255, 0.97)',
      epilogueSub: 'rgba(210, 232, 255, 0.84)',
      epilogueGlow: 'rgba(12, 26, 56, 0.56)'
    }
  };

  // 参数状态（0~1 归一化）
  const params = {
    wind: Number(windSlider.value) / 100,
    disorder: Number(disorderSlider.value) / 100,
    reach: Number(reachSlider.value) / 100
  };

  // 当前天色主题与平滑渐变插值状态
  let currentThemeId = 'noon';
  const renderedSky = {
    stops: SKY_THEMES.noon.skyStops.map(hexToRgb),
    sunPos: { ...SKY_THEMES.noon.sunPos },
    sunCore: [...SKY_THEMES.noon.sunCore],
    sunMid: [...SKY_THEMES.noon.sunMid],
    sunEdge: [...SKY_THEMES.noon.sunEdge]
  };

  // 画布尺寸与高分屏缩放
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 字体配置与按主题分桶的离屏云朵贴图缓存
  let baseFontSize = 36;
  const fontFamily =
    'Georgia, "Times New Roman", "Palatino Linotype", "Songti SC", "Noto Serif SC", "STSong", "SimSun", serif';
  const themeGlyphCaches = {
    noon: new Map(),
    dawn: new Map(),
    sunset: new Map(),
    dusk: new Map()
  };
  const glyphMaskCache = new Map();
  const sharedMeasureCanvas = document.createElement('canvas');
  const sharedMeasureCtx = sharedMeasureCanvas.getContext('2d');
  const sharedMaskCanvas = document.createElement('canvas');
  const sharedMaskCtx = sharedMaskCanvas.getContext('2d', { willReadFrequently: true });
  let puffSprite = null;

  // 当前文案（null 表示默认英文来信；string 表示自定义来信）
  let activeMessageText = null;

  // 场景实体
  let letters = [];
  let fadingOutLetters = [];
  let bgClouds = [];
  let cloudParticles = [];
  let windRibbons = [];
  let ambientWisps = [];
  let feathers = [];
  let hoveredLetter = null;

  // 终章留白状态
  let epilogueActive = false;
  let epilogueOpacity = 0;

  // 轻微镜头视差 + 陀螺仪视差融合
  const camera = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    focalLength: 820
  };

  const pointerParallax = { x: 0, y: 0 };
  const gyro = {
    supported: typeof window.DeviceOrientationEvent !== 'undefined',
    permissionChecked: false,
    listening: false,
    baseGamma: null,
    baseBeta: null,
    x: 0,
    y: 0
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

  // 白鸽携信实体
  const dove = {
    active: false,
    releasing: false,
    opacity: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -0.18,
    prevAngle: -0.18,
    bank: 0,
    wingPhase: 0,
    wingSpeed: 7.5,
    scale: 1,
    trailTimer: 0,
    featherCooldown: 0,
    headingX: 1,
    headingY: -0.15
  };

  // -----------------------------------------------------------------
  // 工具与颜色插值函数
  // -----------------------------------------------------------------
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  }

  function rgbToCss(rgb) {
    return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
  }

  function rgbaToCss(rgba) {
    return `rgba(${Math.round(rgba[0])}, ${Math.round(rgba[1])}, ${Math.round(rgba[2])}, ${rgba[3].toFixed(3)})`;
  }

  function skyNoise(x, y, t) {
    return (
      Math.sin(x * 0.0042 + t * 0.75) * 0.52 +
      Math.cos(y * 0.0056 - t * 0.55) * 0.33 +
      Math.sin((x + y) * 0.0029 + t * 0.42) * 0.15
    );
  }

  // -----------------------------------------------------------------
  // URL 参数安全编解码（?msg=...）
  // -----------------------------------------------------------------
  function sanitizeMessageText(raw) {
    if (typeof raw !== 'string') return '';
    // 移除危险/不可见控制字符，仅保留常规文本与换行
    const normalized = raw
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
    if (!normalized) return '';
    return normalized.slice(0, MAX_MESSAGE_LENGTH);
  }

  function parseMessageFromUrl() {
    try {
      const search = window.location.search;
      if (!search || search.length < 5) return null;
      const pairs = search.slice(1).split('&');
      let rawVal = null;
      for (let i = 0; i < pairs.length; i++) {
        const eqIdx = pairs[i].indexOf('=');
        const key = eqIdx === -1 ? pairs[i] : pairs[i].slice(0, eqIdx);
        if (key === 'msg') {
          rawVal = eqIdx === -1 ? '' : pairs[i].slice(eqIdx + 1);
          break;
        }
      }
      if (rawVal === null || rawVal.length > 3200) return null;
      const decoded = decodeURIComponent(rawVal.replace(/\+/g, ' '));
      const clean = sanitizeMessageText(decoded);
      return clean || null;
    } catch (_) {
      // 解析失败或非法百分号转义时静默回退默认英文来信
      return null;
    }
  }

  function buildShareUrl(text) {
    const url = new URL(window.location.href);
    url.searchParams.set('msg', text);
    return url.toString();
  }

  function syncUrlWithMessage(text) {
    try {
      const url = new URL(window.location.href);
      if (text) {
        url.searchParams.set('msg', text);
      } else {
        url.searchParams.delete('msg');
      }
      window.history.replaceState(null, '', url.toString());
    } catch (_) {
      // file:// 或受限环境静默忽略
    }
  }

  // -----------------------------------------------------------------
  // Web Audio API 程序化风声引擎（默认静音，用户点击开关后初始化）
  // -----------------------------------------------------------------
  const soundEngine = {
    enabled: false,
    ctx: null,
    masterGain: null,
    windGain: null,
    windFilter: null,
    pinkBuffer: null,
    lfoOsc: null,
    noiseSource: null,

    ensureContext() {
      if (this.ctx) return true;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      try {
        const actx = new AudioCtx();
        const masterGain = actx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(actx.destination);

        // 生成 3 秒无缝循环粉红噪声缓冲（Paul Kellet 滤波系数 + 接缝平滑淡化）
        const sampleRate = actx.sampleRate;
        const length = Math.floor(sampleRate * 3);
        const buffer = actx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
          b6 = white * 0.115926;
        }
        const seam = 128;
        for (let i = 0; i < seam; i++) {
          const t = i / seam;
          data[i] = data[i] * t + data[length - seam + i] * (1 - t);
        }

        // 高空风声链路：粉红噪声 -> 柔和高通 -> 动态低通 -> 增益
        const noiseSource = actx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        const highpass = actx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 65;

        const windFilter = actx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 320;
        windFilter.Q.value = 1.1;

        // 极缓呼吸 LFO，模拟自然阵风起伏
        const lfoOsc = actx.createOscillator();
        const lfoGain = actx.createGain();
        lfoOsc.frequency.value = 0.14;
        lfoGain.gain.value = 75;
        lfoOsc.connect(lfoGain);
        lfoGain.connect(windFilter.frequency);

        const windGain = actx.createGain();
        windGain.gain.value = 0.05;

        noiseSource.connect(highpass);
        highpass.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        noiseSource.start();
        lfoOsc.start();

        this.ctx = actx;
        this.masterGain = masterGain;
        this.windGain = windGain;
        this.windFilter = windFilter;
        this.pinkBuffer = buffer;
        this.lfoOsc = lfoOsc;
        this.noiseSource = noiseSource;
        return true;
      } catch (_) {
        return false;
      }
    },

    toggle() {
      if (!this.enabled) {
        if (!this.ensureContext()) return false;
        this.enabled = true;
        try {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          const now = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setTargetAtTime(1, now, 0.14);
        } catch (_) {}
      } else {
        this.enabled = false;
        if (this.ctx) {
          try {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(0, now, 0.08);
          } catch (_) {}
        }
      }
      return this.enabled;
    },

    update(doveSpeed, doveOpacity) {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const doveFactor = dove.active ? clamp(doveSpeed / 520, 0, 1) * doveOpacity : 0;
        const targetFreq = 175 + params.wind * 540 + doveFactor * 980;
        const targetGain = 0.028 + params.wind * 0.105 + doveFactor * 0.125;

        this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.09);
        this.windGain.gain.setTargetAtTime(targetGain, now, 0.09);
      } catch (_) {}
    },

    playDissolvePuff() {
      if (!this.enabled || !this.ctx || !this.pinkBuffer || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.pinkBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.35;
        filter.frequency.setValueAtTime(860 + Math.random() * 180, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.34);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.095, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        const offset = Math.random() * 2.1;
        src.start(now, offset, 0.4);
      } catch (_) {}
    },

    playDoveSwoosh() {
      if (!this.enabled || !this.ctx || !this.pinkBuffer || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.pinkBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.15;
        filter.frequency.setValueAtTime(240, now);
        filter.frequency.exponentialRampToValueAtTime(640, now + 0.22);
        filter.frequency.exponentialRampToValueAtTime(260, now + 0.54);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        const offset = Math.random() * 1.8;
        src.start(now, offset, 0.6);
      } catch (_) {}
    }
  };

  // -----------------------------------------------------------------
  // 陀螺仪视差（兼容 iOS 权限与 Android 免授权，失败静默回退）
  // -----------------------------------------------------------------
  function handleDeviceOrientation(e) {
    if (e.gamma === null || e.beta === null) return;
    if (gyro.baseGamma === null || gyro.baseBeta === null) {
      gyro.baseGamma = e.gamma;
      gyro.baseBeta = e.beta;
    }
    const dg = clamp(e.gamma - gyro.baseGamma, -24, 24) / 24;
    const db = clamp(e.beta - gyro.baseBeta, -24, 24) / 24;
    gyro.x = dg * 24;
    gyro.y = db * 16;
  }

  function enableGyroListener() {
    if (gyro.listening || !gyro.supported) return;
    try {
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
      gyro.listening = true;
    } catch (_) {}
  }

  function requestGyroIfPossible() {
    if (!gyro.supported || gyro.permissionChecked) return;
    gyro.permissionChecked = true;
    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        window.DeviceOrientationEvent.requestPermission()
          .then((state) => {
            if (state === 'granted') {
              enableGyroListener();
            }
          })
          .catch(() => {});
      } else {
        enableGyroListener();
      }
    } catch (_) {}
  }

  if (gyro.supported && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
    enableGyroListener();
  }

  // -----------------------------------------------------------------
  // 离屏云雾粒子精灵
  // -----------------------------------------------------------------
  function buildPuffSprite() {
    const size = 96;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

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
  // 离屏云质感字母渲染器（按天色主题缓存 + 结合天光方向的柔和底光）
  // -----------------------------------------------------------------
  function getGlyphMaskData(char, fontSize, isItalic, pad) {
    const maskKey = `${char}_${Math.round(fontSize)}_${isItalic ? 'i' : 'n'}`;
    if (glyphMaskCache.has(maskKey)) {
      return glyphMaskCache.get(maskKey);
    }

    const fontStr = `${isItalic ? 'italic ' : ''}400 ${fontSize}px ${fontFamily}`;
    sharedMeasureCtx.font = fontStr;
    const metrics = sharedMeasureCtx.measureText(char);
    const advance = Math.max(metrics.width, fontSize * 0.28);
    const w = Math.ceil(advance + pad * 2);
    const h = Math.ceil(fontSize * 1.48 + pad * 2);
    const drawX = pad;
    const drawY = h * 0.5 + fontSize * 0.34;

    sharedMaskCanvas.width = w;
    sharedMaskCanvas.height = h;
    sharedMaskCtx.clearRect(0, 0, w, h);
    sharedMaskCtx.font = fontStr;
    sharedMaskCtx.textBaseline = 'alphabetic';
    sharedMaskCtx.fillStyle = '#ffffff';
    sharedMaskCtx.fillText(char, drawX, drawY);

    const imgData = sharedMaskCtx.getImageData(0, 0, w, h).data;
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

    const maskData = { w, h, drawX, drawY, advance, fontStr, samplePoints };
    if (glyphMaskCache.size > 480) {
      glyphMaskCache.clear();
    }
    glyphMaskCache.set(maskKey, maskData);
    return maskData;
  }

  function getGlyphAsset(char, fontSize, isItalic, themeId = currentThemeId) {
    const cache = themeGlyphCaches[themeId] || themeGlyphCaches.noon;
    const key = `${char}_${Math.round(fontSize)}_${isItalic ? 'i' : 'n'}`;
    if (cache.has(key)) {
      return cache.get(key);
    }

    const theme = SKY_THEMES[themeId] || SKY_THEMES.noon;
    const pad = Math.ceil(fontSize * 0.65);
    const mask = getGlyphMaskData(char, fontSize, isItalic, pad);
    const { w, h, drawX, drawY, advance, fontStr, samplePoints } = mask;

    // 结合天光方向偏移背光与底光，强化云絮的立体迎光面与底光层次
    const lightVecX = theme.sunPos.x - 0.5;
    const lightVecY = theme.sunPos.y - 0.5;
    const backShiftX = -lightVecX * fontSize * 0.14;
    const underShiftY = Math.max(1.4, fontSize * 0.065 - lightVecY * fontSize * 0.06);

    // 1. 主云朵字形贴图
    const crisp = document.createElement('canvas');
    crisp.width = w;
    crisp.height = h;
    const cctx = crisp.getContext('2d');
    cctx.font = fontStr;
    cctx.textBaseline = 'alphabetic';

    // 第一层：天光方向柔和背光晕与底部天光散射
    cctx.save();
    cctx.filter = `blur(${Math.max(4.5, fontSize * 0.17)}px)`;
    cctx.shadowColor = theme.glyphBackGlow;
    cctx.shadowBlur = Math.max(8, fontSize * 0.28);
    cctx.fillStyle = theme.glyphBackFill;
    cctx.fillText(char, drawX + backShiftX, drawY + underShiftY);
    cctx.restore();

    // 第二层：柔和底光边与轻微错位云絮毛边
    cctx.save();
    cctx.filter = `blur(${Math.max(2.2, fontSize * 0.075)}px)`;
    cctx.fillStyle = theme.glyphUnderRim;
    cctx.fillText(char, drawX + backShiftX * 0.6, drawY + Math.max(1.5, fontSize * 0.055));
    cctx.restore();

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

    // 第三层：迎光云白主体渐变
    cctx.save();
    cctx.filter = `blur(${Math.max(0.55, fontSize * 0.016)}px)`;
    const grad = cctx.createLinearGradient(
      drawX - lightVecX * fontSize * 0.3,
      drawY - fontSize * 0.78,
      drawX + lightVecX * fontSize * 0.3,
      drawY + fontSize * 0.24
    );
    grad.addColorStop(0, theme.glyphTop);
    grad.addColorStop(0.66, theme.glyphMid);
    grad.addColorStop(1, theme.glyphBottom);
    cctx.fillStyle = grad;
    cctx.fillText(char, drawX, drawY);
    cctx.restore();

    // 2. 雾化态贴图（同时服务于 Z 轴光学景深与气流雾化）
    const misty = document.createElement('canvas');
    misty.width = w;
    misty.height = h;
    const mistCtx = misty.getContext('2d');
    mistCtx.font = fontStr;
    mistCtx.textBaseline = 'alphabetic';
    mistCtx.filter = `blur(${Math.max(6.5, fontSize * 0.22)}px)`;
    mistCtx.fillStyle = theme.glyphMistyCore;
    mistCtx.fillText(char, drawX, drawY);
    mistCtx.filter = `blur(${Math.max(11, fontSize * 0.36)}px)`;
    mistCtx.fillStyle = theme.glyphMistyHalo;
    mistCtx.fillText(char, drawX, drawY);

    const asset = {
      crisp,
      misty,
      w,
      h,
      advance,
      samplePoints
    };

    if (cache.size > 480) {
      cache.clear();
    }
    cache.set(key, asset);
    return asset;
  }

  // -----------------------------------------------------------------
  // 背景晴空柔云层初始化
  // -----------------------------------------------------------------
  function initBackgroundClouds() {
    bgClouds = [];
    const count = width < 700 ? 11 : 17;
    for (let i = 0; i < count; i++) {
      const depth = 0.25 + Math.random() * 0.75;
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
  // 中英文混排分词与排版计算
  // -----------------------------------------------------------------
  const CJK_CHAR_RE = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
  const NO_LINE_START_PUNCT_RE = /^[，。、！？；：”’》」』）,.!?;:\])]/;

  function tokenizeParagraph(para) {
    const tokens = [];
    let buffer = '';
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      if (ch === ' ' || ch === '\t') {
        if (buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        tokens.push(' ');
      } else if (CJK_CHAR_RE.test(ch)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        tokens.push(ch);
      } else {
        buffer += ch;
      }
    }
    if (buffer) {
      tokens.push(buffer);
    }
    return tokens;
  }

  function wrapParagraph(para, fontStr, maxTextWidth) {
    sharedMeasureCtx.font = fontStr;
    const tokens = tokenizeParagraph(para);
    const lines = [];
    let current = '';

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === ' ') {
        if (current && !current.endsWith(' ')) {
          if (sharedMeasureCtx.measureText(current + ' ').width <= maxTextWidth) {
            current += ' ';
          } else {
            lines.push(current.trimEnd());
            current = '';
          }
        }
        continue;
      }

      const candidate = current + tok;
      if (sharedMeasureCtx.measureText(candidate).width <= maxTextWidth) {
        current = candidate;
      } else if (current) {
        // 避让行首标点，尽量与前一字符保持同尾
        if (NO_LINE_START_PUNCT_RE.test(tok) && sharedMeasureCtx.measureText(candidate).width <= maxTextWidth + baseFontSize * 0.65) {
          lines.push(candidate.trimEnd());
          current = '';
        } else {
          lines.push(current.trimEnd());
          current = tok;
        }
      } else {
        // 超长无空格拉丁串兜底逐字切分
        let sub = '';
        for (let j = 0; j < tok.length; j++) {
          const nextSub = sub + tok[j];
          if (sharedMeasureCtx.measureText(nextSub).width > maxTextWidth && sub) {
            lines.push(sub);
            sub = tok[j];
          } else {
            sub = nextSub;
          }
        }
        current = sub;
      }
    }

    if (current.trim().length > 0) {
      lines.push(current.trimEnd());
    }
    return lines;
  }

  function buildParagraphSpecs() {
    if (!activeMessageText) {
      return DEFAULT_PARAGRAPHS.map((text, idx) => ({
        text,
        isSalutation: idx === 0,
        isSignature: idx === DEFAULT_PARAGRAPHS.length - 1,
        isBlank: false
      }));
    }

    const rawLines = activeMessageText.split('\n');
    const specs = [];
    let lastNonBlankIdx = -1;
    rawLines.forEach((line, idx) => {
      if (line.trim().length > 0) {
        lastNonBlankIdx = idx;
      }
    });

    for (let i = 0; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trim();
      if (!trimmed) {
        if (specs.length > 0 && !specs[specs.length - 1].isBlank) {
          specs.push({ text: '', isSalutation: false, isSignature: false, isBlank: true });
        }
        continue;
      }
      const isSignature =
        specs.length >= 1 &&
        i === lastNonBlankIdx &&
        /^(—|--|——|-\s)/.test(trimmed);
      specs.push({
        text: trimmed,
        isSalutation: false,
        isSignature,
        isBlank: false
      });
    }
    return specs;
  }

  function layoutLetters(options = {}) {
    const { preserveGoneSet = null, condense = false } = options;

    const isNarrow = width < 720;
    const maxTextWidth = isNarrow
      ? Math.min(width * 0.88, 520)
      : Math.min(width * 0.74, 960);

    let candidateFontSize = clamp(
      isNarrow ? width * 0.068 : Math.min(width * 0.036, height * 0.056),
      23,
      46
    );

    const paraSpecs = buildParagraphSpecs();
    const headerRect = skyHeaderEl ? skyHeaderEl.getBoundingClientRect() : null;
    const dockRect = controlDockEl ? controlDockEl.getBoundingClientRect() : null;
    const topSafe = Math.max(
      isNarrow ? 128 : 94,
      headerRect && headerRect.height > 0 ? Math.ceil(headerRect.bottom) + 26 : 0
    );
    const bottomSafe = Math.max(
      isNarrow ? 136 : 112,
      dockRect && dockRect.height > 0 ? Math.ceil(height - dockRect.top) + 22 : 0
    );
    const availableHeight = Math.max(190, height - topSafe - bottomSafe);

    let layoutLines = [];
    let lineHeight = candidateFontSize * (isNarrow ? 1.46 : 1.54);
    let totalHeight = 0;

    // 如自定义长文行数较多，自适应微调字号确保完整落入晴空可视安全区
    for (let attempt = 0; attempt < 6; attempt++) {
      layoutLines = [];
      lineHeight = candidateFontSize * (isNarrow ? 1.46 : 1.54);
      const paragraphGap = candidateFontSize * 0.62;

      paraSpecs.forEach((spec, pIndex) => {
        if (spec.isBlank) {
          layoutLines.push({ isGap: true, height: paragraphGap * 0.85 });
          return;
        }
        const paraFontSize = spec.isSignature
          ? candidateFontSize * 0.82
          : spec.isSalutation
            ? candidateFontSize * 1.06
            : candidateFontSize;
        const isItalic = spec.isSalutation || spec.isSignature;
        const fontStr = `${isItalic ? 'italic ' : ''}400 ${paraFontSize}px ${fontFamily}`;

        const wrapped = wrapParagraph(spec.text, fontStr, maxTextWidth);
        wrapped.forEach((lineText) => {
          sharedMeasureCtx.font = fontStr;
          layoutLines.push({
            text: lineText,
            fontSize: paraFontSize,
            isItalic,
            isSignature: spec.isSignature,
            lineWidth: sharedMeasureCtx.measureText(lineText).width
          });
        });

        if (pIndex < paraSpecs.length - 1 && !paraSpecs[pIndex + 1].isBlank) {
          layoutLines.push({ isGap: true, height: paragraphGap });
        }
      });

      totalHeight = 0;
      layoutLines.forEach((line) => {
        totalHeight += line.isGap ? line.height : lineHeight;
      });

      if (totalHeight <= availableHeight || candidateFontSize <= 17.5) {
        break;
      }
      const ratio = Math.sqrt(availableHeight / totalHeight);
      candidateFontSize = Math.max(17, candidateFontSize * clamp(ratio, 0.72, 0.92));
    }

    baseFontSize = candidateFontSize;

    // 计算对齐参考框：默认书信保持稳重左对齐版式；自定义短文按最宽行居中对齐更显诗意
    let blockWidth = maxTextWidth;
    if (activeMessageText) {
      let maxMeasured = 0;
      layoutLines.forEach((line) => {
        if (!line.isGap) {
          maxMeasured = Math.max(maxMeasured, line.lineWidth);
        }
      });
      blockWidth = clamp(maxMeasured, Math.min(180, maxTextWidth), maxTextWidth);
    }

    const startX = (width - blockWidth) * 0.5;
    const usableCenterY = topSafe + (height - topSafe - bottomSafe) * 0.49;
    let cursorY = Math.max(topSafe + baseFontSize * 0.58, usableCenterY - totalHeight * 0.5 + baseFontSize * 0.5);

    const newLetters = [];
    let charGlobalId = 0;
    let visualLineIndex = 0;

    layoutLines.forEach((line) => {
      if (line.isGap) {
        cursorY += line.height;
        return;
      }

      const fontStr = `${line.isItalic ? 'italic ' : ''}400 ${line.fontSize}px ${fontFamily}`;
      sharedMeasureCtx.font = fontStr;

      let cursorX = startX;
      if (line.isSignature) {
        cursorX = startX + Math.max(0, blockWidth - line.lineWidth);
      } else if (activeMessageText && visualLineIndex <= 3 && layoutLines.filter((l) => !l.isGap).length <= 3) {
        // 极短的自定义诗句/祝福语居中排布
        cursorX = (width - line.lineWidth) * 0.5;
      }

      for (let i = 0; i < line.text.length; i++) {
        const ch = line.text[i];
        const advance = sharedMeasureCtx.measureText(ch).width;

        if (ch !== ' ' && ch !== '\t') {
          const asset = getGlyphAsset(ch, line.fontSize, line.isItalic, currentThemeId);
          const id = charGlobalId;
          const alreadyGone = preserveGoneSet ? preserveGoneSet.has(id) : false;

          const homeZ = (Math.sin(id * 1.91) * 0.65 + Math.cos(id * 0.73) * 0.35) * 78;
          const homeX = cursorX + advance * 0.5;
          const homeY = cursorY;

          const startCondensing = condense && !alreadyGone;
          const condenseDelay = startCondensing
            ? 0.08 + visualLineIndex * 0.075 + i * 0.011
            : 0;

          newLetters.push({
            id,
            char: ch,
            isItalic: line.isItalic,
            asset,
            fontSize: line.fontSize,
            homeX,
            homeY,
            homeZ,
            x: homeX,
            y: homeY,
            z: startCondensing ? homeZ - 26 : homeZ,
            vx: 0,
            vy: 0,
            vz: 0,
            rot: 0,
            vRot: 0,
            tiltX: 0,
            tiltY: 0,
            driftX: 0,
            driftY: 0,
            driftRot: 0,
            mistLevel: startCondensing ? 0.92 : 0,
            alpha: alreadyGone ? 0 : startCondensing ? 0 : 1,
            state: alreadyGone ? 'gone' : 'intact',
            dissolveProgress: alreadyGone ? 1 : 0,
            condenseProgress: startCondensing ? 0 : 1,
            condenseDelay,
            hoverLevel: 0,
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

      visualLineIndex++;
      cursorY += lineHeight;
    });

    letters = newLetters;
    hoveredLetter = null;
    updateEpilogueState();
  }

  // -----------------------------------------------------------------
  // 粒子、风痕与白鸽落羽系统
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

  function dissolveLetter(letter, reason = 'click', pushVx = 0, pushVy = 0) {
    if (letter.state !== 'intact') return;
    letter.state = 'dissolving';
    letter.dissolveProgress = 0;
    if (hoveredLetter === letter) {
      hoveredLetter = null;
      canvas.style.cursor = 'default';
    }

    if (reason === 'click') {
      soundEngine.playDissolvePuff();
    }

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

  function getDoveWingTipWorld() {
    const s = dove.scale * (width < 700 ? 0.88 : 1.05);
    const flap = Math.sin(dove.wingPhase);
    const localTipX = -24 - flap * 5;
    const localTipY = -30 + flap * 32;
    const facingLeft = Math.cos(dove.angle) < 0;
    const flipY = facingLeft ? -1 : 1;

    const sx = localTipX * s;
    const sy = localTipY * flipY * s;
    const cosA = Math.cos(dove.angle);
    const sinA = Math.sin(dove.angle);

    return {
      x: dove.x + sx * cosA - sy * sinA,
      y: dove.y + sx * sinA + sy * cosA
    };
  }

  function spawnFeatherFromWingTip(count = 1) {
    if (!dove.active || dove.opacity < 0.25) return;
    const tip = getDoveWingTipWorld();
    for (let i = 0; i < count; i++) {
      if (feathers.length >= 26) {
        feathers.shift();
      }
      feathers.push({
        x: tip.x + (Math.random() - 0.5) * 10,
        y: tip.y + (Math.random() - 0.5) * 8,
        vx: dove.vx * 0.14 + (Math.random() - 0.5) * 26,
        vy: dove.vy * 0.1 + 8 + Math.random() * 14,
        length: 12 + Math.random() * 6,
        width: 3.4 + Math.random() * 1.6,
        rot: Math.random() * Math.PI * 2,
        baseTilt: (Math.random() - 0.5) * 0.65,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 2.1 + Math.random() * 1.2,
        fallSpeed: 17 + Math.random() * 13,
        life: 0,
        maxLife: 3.1 + Math.random() * 1.4,
        alpha: 0.72 + Math.random() * 0.2
      });
    }
  }

  function emitDoveAirflow(dt) {
    dove.trailTimer += dt;
    const speed = Math.hypot(dove.vx, dove.vy);
    const dirX = dove.headingX;
    const dirY = dove.headingY;
    const perpX = -dirY;
    const perpY = dirX;

    const reachScale = 0.65 + params.reach * 1.15;

    if (dove.trailTimer >= 0.022) {
      dove.trailTimer = 0;
      const wingSpread = (16 + Math.sin(dove.wingPhase) * 8) * dove.scale;

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
  // 轻微 3D 透视投影
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
  // 交互事件：兼容桌面悬停微震、单击永久消散与长按白鸽携信
  // -----------------------------------------------------------------
  function findHitLetter(px, py) {
    let best = null;
    let bestDist = Infinity;

    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.state !== 'intact' || l.alpha < 0.25) continue;
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
    const wasActive = dove.active;
    dove.active = true;
    dove.releasing = false;
    hoveredLetter = null;
    canvas.style.cursor = 'default';

    const enterDirX = Math.abs(pointer.vx) > 20 ? Math.sign(pointer.vx) : 1;
    dove.x = x - enterDirX * 26;
    dove.y = y + 10;
    dove.vx = enterDirX * 80;
    dove.vy = -18;
    dove.headingX = enterDirX;
    dove.headingY = -0.15;
    dove.angle = Math.atan2(dove.headingY, dove.headingX);
    dove.prevAngle = dove.angle;
    dove.opacity = Math.max(dove.opacity, 0.15);

    if (!wasActive) {
      soundEngine.playDoveSwoosh();
    }

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
    if (!writeModal.hidden) return;
    e.preventDefault();
    markInteracted();
    requestGyroIfPossible();

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

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
    pointer.longPressTimer = setTimeout(() => {
      if (pointer.isDown && !pointer.longPressActive) {
        summonDove(pointer.x, pointer.y);
      }
    }, 210);
  });

  canvas.addEventListener('pointermove', (e) => {
    const nx = e.clientX;
    const ny = e.clientY;

    pointerParallax.x = ((nx / width) - 0.5) * 28;
    pointerParallax.y = ((ny / height) - 0.5) * 20;

    if (!pointer.isDown) {
      if (e.pointerType !== 'touch' && writeModal.hidden) {
        const hit = findHitLetter(nx, ny);
        hoveredLetter = hit;
        canvas.style.cursor = hit ? 'pointer' : 'default';
      }
      return;
    }

    if (e.pointerId !== pointer.pointerId) return;
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
      if (!pointer.longPressActive && performance.now() - pointer.downTime > 85) {
        clearTimeout(pointer.longPressTimer);
        summonDove(nx, ny);
      }
    }
  });

  canvas.addEventListener('pointerleave', () => {
    hoveredLetter = null;
    canvas.style.cursor = 'default';
  });

  function handlePointerEnd(e) {
    if (!pointer.isDown || e.pointerId !== pointer.pointerId) return;
    clearTimeout(pointer.longPressTimer);

    const elapsed = performance.now() - pointer.downTime;
    const moveDist = Math.hypot(e.clientX - pointer.downX, e.clientY - pointer.downY);

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
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // -----------------------------------------------------------------
  // 天色时刻切换、写信浮层、声音与明信片导出交互
  // -----------------------------------------------------------------
  function setSkyTheme(themeId) {
    if (!SKY_THEMES[themeId] || currentThemeId === themeId) return;
    currentThemeId = themeId;

    if (themeId === 'noon') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', themeId);
    }

    themeChips.forEach((chip) => {
      const isMatch = chip.dataset.theme === themeId;
      chip.classList.toggle('is-active', isMatch);
      chip.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });

    // 重绑每个字母的当前主题贴图（优先命中分主题缓存）
    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      l.asset = getGlyphAsset(l.char, l.fontSize, l.isItalic, currentThemeId);
    }
    for (let i = 0; i < fadingOutLetters.length; i++) {
      const f = fadingOutLetters[i];
      f.asset = getGlyphAsset(f.char, f.fontSize, f.isItalic, currentThemeId);
    }
  }

  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', (e) => {
      const chip = e.target.closest('.theme-chip');
      if (!chip || !chip.dataset.theme) return;
      setSkyTheme(chip.dataset.theme);
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const isOn = soundEngine.toggle();
      soundBtn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      soundBtn.title = isOn ? '风声已开启（点击静音）' : '风声开关（默认静音）';
    });
  }

  function exportPostcard() {
    if (!saveBtn) return;
    // 确保当前帧处于最新完整绘制态
    renderScene();

    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const stamp =
      `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-` +
      `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    const filename = `cloud-letter-${stamp}.png`;

    const triggerDownload = (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(triggerDownload, 'image/png');
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    saveBtn.classList.add('is-saved');
    clearTimeout(saveBtn._savedTimer);
    saveBtn._savedTimer = setTimeout(() => {
      saveBtn.classList.remove('is-saved');
    }, 1100);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', exportPostcard);
  }

  // 写信浮层逻辑
  function updateLetterCounter() {
    if (!letterInput || !letterCountEl) return;
    letterCountEl.textContent = `${letterInput.value.length} / ${MAX_MESSAGE_LENGTH}`;
  }

  function openWriteModal() {
    if (!writeModal) return;
    hoveredLetter = null;
    canvas.style.cursor = 'default';
    letterInput.value = activeMessageText || '';
    writeFeedbackEl.textContent = '';
    updateLetterCounter();
    writeModal.hidden = false;
    writeModal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      letterInput.focus();
    });
  }

  function closeWriteModal() {
    if (!writeModal) return;
    writeModal.hidden = true;
    writeModal.setAttribute('aria-hidden', 'true');
    writeFeedbackEl.textContent = '';
  }

  function transitionOldLettersToMist() {
    const ambientWindX = 24 + params.wind * 64;
    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.state === 'gone') continue;
      fadingOutLetters.push({
        ...l,
        vx: l.vx + ambientWindX * (0.4 + Math.random() * 0.45) + (Math.random() - 0.5) * 28,
        vy: l.vy - 18 - Math.random() * 24,
        fadeLife: 0,
        fadeDuration: 0.46 + Math.random() * 0.18
      });

      if (i % 2 === 0) {
        const proj = project3D(l.x, l.y, l.z);
        spawnCloudParticle({
          x: proj.sx,
          y: proj.sy,
          vx: ambientWindX * (0.55 + Math.random() * 0.4),
          vy: -14 - Math.random() * 20,
          size: (18 + Math.random() * 14) * proj.scale,
          grow: 26,
          alpha: 0.24 * l.alpha,
          maxLife: 1.05 + Math.random() * 0.45,
          stretch: 1.45,
          angle: -0.2
        });
      }
    }
  }

  function applyCustomLetterText(newTextOrNull) {
    transitionOldLettersToMist();
    activeMessageText = newTextOrNull;
    syncUrlWithMessage(activeMessageText);
    epilogueActive = false;
    epilogueOpacity = 0;
    resetBtn.classList.remove('is-epilogue');
    layoutLetters({ preserveGoneSet: null, condense: true });
    soundEngine.playDoveSwoosh();
  }

  if (writeBtn) {
    writeBtn.addEventListener('click', openWriteModal);
  }
  if (closeWriteBtn) {
    closeWriteBtn.addEventListener('click', closeWriteModal);
  }
  if (writeBackdrop) {
    writeBackdrop.addEventListener('click', closeWriteModal);
  }
  if (letterInput) {
    letterInput.addEventListener('input', () => {
      updateLetterCounter();
      writeFeedbackEl.textContent = '';
    });
  }

  if (applyLetterBtn) {
    applyLetterBtn.addEventListener('click', () => {
      const clean = sanitizeMessageText(letterInput.value);
      if (!clean) {
        writeFeedbackEl.textContent = '请先写下一段寄往云端的文字，或点击下方恢复默认来信。';
        letterInput.focus();
        return;
      }
      applyCustomLetterText(clean);
      closeWriteModal();
    });
  }

  if (restoreDefaultBtn) {
    restoreDefaultBtn.addEventListener('click', () => {
      applyCustomLetterText(null);
      closeWriteModal();
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const clean = sanitizeMessageText(letterInput.value);
      const targetText = clean || activeMessageText;
      if (!targetText) {
        writeFeedbackEl.textContent = '请先输入内容，再生成专属寄信链接。';
        letterInput.focus();
        return;
      }

      const shareUrl = buildShareUrl(targetText);
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const helper = document.createElement('textarea');
          helper.value = shareUrl;
          helper.setAttribute('readonly', '');
          helper.style.position = 'fixed';
          helper.style.opacity = '0';
          document.body.appendChild(helper);
          helper.select();
          document.execCommand('copy');
          document.body.removeChild(helper);
        }
        writeFeedbackEl.textContent = '已复制寄信链接 ✓ 打开链接即可重现这封云中来信';
      } catch (_) {
        writeFeedbackEl.textContent = `请复制链接：${shareUrl}`;
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && writeModal && !writeModal.hidden) {
      closeWriteModal();
    }
  });

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
    feathers = [];
    fadingOutLetters = [];
    dove.active = false;
    dove.releasing = false;
    dove.opacity = 0;
    epilogueActive = false;
    epilogueOpacity = 0;
    resetBtn.classList.remove('is-epilogue');
    layoutLetters({ preserveGoneSet: null, condense: true });
  });

  // -----------------------------------------------------------------
  // 终章留白统计（>90% 字母消散或被白鸽带走）
  // -----------------------------------------------------------------
  function updateEpilogueState() {
    if (letters.length === 0) {
      epilogueActive = false;
    } else {
      let goneCount = 0;
      for (let i = 0; i < letters.length; i++) {
        if (letters[i].state === 'gone') {
          goneCount++;
        }
      }
      epilogueActive = goneCount / letters.length > 0.9;
    }
    resetBtn.classList.toggle('is-epilogue', epilogueActive);
  }

  // -----------------------------------------------------------------
  // 物理更新主循环
  // -----------------------------------------------------------------
  function update(dt, t) {
    // 天色梯度丝滑过渡
    const targetTheme = SKY_THEMES[currentThemeId] || SKY_THEMES.noon;
    const skyLerp = Math.min(1, dt * 7.5);
    for (let i = 0; i < 4; i++) {
      const targetRgb = hexToRgb(targetTheme.skyStops[i]);
      for (let c = 0; c < 3; c++) {
        renderedSky.stops[i][c] = lerp(renderedSky.stops[i][c], targetRgb[c], skyLerp);
      }
      renderedSky.sunCore[i] = lerp(renderedSky.sunCore[i], targetTheme.sunCore[i], skyLerp);
      renderedSky.sunMid[i] = lerp(renderedSky.sunMid[i], targetTheme.sunMid[i], skyLerp);
      renderedSky.sunEdge[i] = lerp(renderedSky.sunEdge[i], targetTheme.sunEdge[i], skyLerp);
    }
    renderedSky.sunPos.x = lerp(renderedSky.sunPos.x, targetTheme.sunPos.x, skyLerp);
    renderedSky.sunPos.y = lerp(renderedSky.sunPos.y, targetTheme.sunPos.y, skyLerp);

    // 融合指针视差与移动端陀螺仪视差
    camera.targetX = pointerParallax.x + gyro.x;
    camera.targetY = pointerParallax.y + gyro.y;
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

    // 2. 更新白鸽携信飞行运动、气流拖尾与转弯落羽
    dove.featherCooldown = Math.max(0, dove.featherCooldown - dt);
    if (dove.active) {
      dove.prevAngle = dove.angle;
      if (!dove.releasing) {
        dove.opacity = Math.min(1, dove.opacity + dt * 4.5);

        const dx = pointer.x - dove.x;
        const dy = pointer.y - dove.y;
        const stiffness = 13.5;
        const damping = 5.4;

        dove.vx += (dx * stiffness - dove.vx * damping) * dt;
        dove.vy += (dy * stiffness - dove.vy * damping) * dt;

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

        const crossTurn = dove.headingX * dove.vy - dove.headingY * dove.vx;
        dove.bank = lerp(dove.bank, clamp(crossTurn * 0.0025, -0.55, 0.55), Math.min(1, dt * 6));
        const targetWingSpeed = 6.2 + Math.min(speed * 0.018, 6.5);
        dove.wingSpeed = lerp(dove.wingSpeed, targetWingSpeed, Math.min(1, dt * 5));
        dove.wingPhase += dove.wingSpeed * dt;

        let angleDelta = dove.angle - dove.prevAngle;
        while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
        const turnRate = Math.abs(angleDelta) / Math.max(dt, 0.001);

        // 显著转弯时偶尔从翼尖飘落 1–2 片轻量羽毛
        if ((Math.abs(dove.bank) > 0.24 || turnRate > 1.8) && dove.featherCooldown <= 0 && Math.random() < 0.38) {
          spawnFeatherFromWingTip(Math.random() < 0.35 ? 2 : 1);
          dove.featherCooldown = 0.55 + Math.random() * 0.55;
        }

        emitDoveAirflow(dt);
      } else {
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

    // 4. 更新换信过渡中化雾退场的旧字母
    for (let i = fadingOutLetters.length - 1; i >= 0; i--) {
      const f = fadingOutLetters[i];
      f.fadeLife += dt;
      const progress = clamp(f.fadeLife / f.fadeDuration, 0, 1);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.mistLevel = clamp(f.mistLevel + dt * 1.8, 0, 1);
      f.alpha = Math.max(0, (1 - progress) * 0.9);
      if (progress >= 1) {
        fadingOutLetters.splice(i, 1);
      }
    }

    // 5. 更新每个云朵字母（凝结浮现 + 悬停微震 + 常风失序 + 白鸽尾流）
    const reachPx = (95 + params.reach * 235) * (width < 700 ? 0.78 : 1);
    const doveSpeed = Math.hypot(dove.vx, dove.vy);
    const windStrength = params.wind;
    const disorderStrength = params.disorder;
    let sweptLetterThisFrame = false;
    let stateChangedToGone = false;

    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.state === 'gone') continue;

      // 悬停微震平滑权重
      const isHovered = l === hoveredLetter && l.state === 'intact';
      l.hoverLevel = lerp(l.hoverLevel, isHovered ? 1 : 0, Math.min(1, dt * (isHovered ? 10 : 6)));

      // 水汽凝结浮现动画
      if (l.condenseProgress < 1) {
        if (l.condenseDelay > 0) {
          l.condenseDelay = Math.max(0, l.condenseDelay - dt);
        } else {
          l.condenseProgress = Math.min(1, l.condenseProgress + dt * 1.75);
          const ease = 1 - Math.pow(1 - l.condenseProgress, 3);
          l.alpha = ease;
          l.mistLevel = (1 - ease) * 0.92;
          l.z = lerp(l.homeZ - 26, l.homeZ, ease);
        }
      }

      if (l.state === 'dissolving') {
        l.dissolveProgress += dt * 2.15;
        l.mistLevel = clamp(l.mistLevel + dt * 2.4, 0, 1);
        l.alpha = Math.max(0, 1 - l.dissolveProgress);
        l.x += (l.vx + 16 + windStrength * 45) * dt;
        l.y += (l.vy - 10) * dt;
        if (l.dissolveProgress >= 1) {
          l.state = 'gone';
          l.alpha = 0;
          stateChangedToGone = true;
        }
        continue;
      }

      const n = skyNoise(l.homeX, l.homeY, t * (0.65 + windStrength * 0.9));
      const floatX = Math.sin(t * l.floatSpeed + l.phase) * (2.5 + disorderStrength * 11) + n * windStrength * 16;
      const floatY = Math.cos(t * l.floatSpeed * 0.86 + l.phase) * (3.2 + disorderStrength * 12);
      const floatZ = Math.sin(t * 0.55 + l.phase) * (10 + disorderStrength * 26);

      const targetDriftX = l.disorderBiasX * disorderStrength * 34 + windStrength * disorderStrength * 28;
      const targetDriftY = l.disorderBiasY * disorderStrength * 24 - windStrength * disorderStrength * 9;
      const targetDriftRot = l.disorderSpin * disorderStrength * 0.28 + n * windStrength * 0.08;

      l.driftX = lerp(l.driftX, targetDriftX, Math.min(1, dt * 0.7));
      l.driftY = lerp(l.driftY, targetDriftY, Math.min(1, dt * 0.7));
      l.driftRot = lerp(l.driftRot, targetDriftRot, Math.min(1, dt * 0.8));

      const anchorX = l.homeX + l.driftX + floatX;
      const anchorY = l.homeY + l.driftY + floatY;
      const anchorZ = l.homeZ + floatZ;

      const springK = lerp(2.8, 0.55, clamp(disorderStrength * 0.6 + l.mistLevel * 0.65, 0, 1));
      l.vx += (anchorX - l.x) * springK * dt;
      l.vy += (anchorY - l.y) * springK * dt;
      if (l.condenseProgress >= 1) {
        l.vz += (anchorZ - l.z) * 1.8 * dt;
      }

      l.vx += (windStrength * 14 + n * windStrength * 22) * dt;
      l.vy += (-windStrength * 3.5 + Math.cos(t * 0.9 + l.phase) * windStrength * 8) * dt;

      // 白鸽掠过产生的定向空气尾流
      if (dove.active && dove.opacity > 0.1 && l.condenseProgress > 0.4) {
        const proj = project3D(l.x, l.y, l.z);
        const rx = proj.sx - dove.x;
        const ry = proj.sy - dove.y;

        const along = rx * dove.headingX + ry * dove.headingY;
        const across = -rx * dove.headingY + ry * dove.headingX;

        const wakeCenterShift = -reachPx * 0.28;
        const normAlong = (along - wakeCenterShift) / (reachPx * 1.18);
        const normAcross = across / (reachPx * 0.68);
        const wakeDist = Math.hypot(normAlong, normAcross);

        if (wakeDist < 1) {
          const influence = Math.pow(1 - wakeDist, 1.65) * dove.opacity;
          if (influence > 0.32) {
            sweptLetterThisFrame = true;
          }
          const airSpeed = 120 + Math.min(doveSpeed, 620) * 0.95;

          const vortexSign = across >= 0 ? 1 : -1;
          const perpX = -dove.headingY;
          const perpY = dove.headingX;

          const pushX = dove.headingX * airSpeed * 1.85 + perpX * vortexSign * airSpeed * 0.42;
          const pushY = dove.headingY * airSpeed * 1.85 + perpY * vortexSign * airSpeed * 0.42;

          l.vx += pushX * influence * dt * 2.2;
          l.vy += pushY * influence * dt * 2.2;
          l.vz += (18 + Math.sin(l.phase + t * 4) * 35) * influence * dt * 2.0;
          l.vRot += vortexSign * influence * (1.8 + doveSpeed * 0.004) * dt;

          l.mistLevel = clamp(l.mistLevel + influence * dt * (1.15 + doveSpeed * 0.0024), 0, 1);
          l.wakeExposure += influence * dt * (1.35 + doveSpeed * 0.0032);

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

          if (l.wakeExposure > 0.56 && l.mistLevel > 0.54) {
            dissolveLetter(l, 'wake', dove.vx + dove.headingX * 90, dove.vy + dove.headingY * 90);
            continue;
          }
        }
      }

      const drag = Math.pow(0.915, dt * 60);
      l.vx *= drag;
      l.vy *= drag;
      l.vz *= Math.pow(0.90, dt * 60);
      l.vRot *= Math.pow(0.89, dt * 60);

      l.x += l.vx * dt;
      l.y += l.vy * dt;
      if (l.condenseProgress >= 1) {
        l.z = clamp(l.z + l.vz * dt, -160, 180);
      }

      l.rot += l.vRot * dt;
      l.rot = lerp(l.rot, l.driftRot, Math.min(1, dt * 1.1));

      if (l.condenseProgress >= 1 && l.mistLevel > 0 && l.mistLevel < 0.72) {
        l.mistLevel = Math.max(0, l.mistLevel - dt * 0.08);
      }

      l.tiltY = clamp(l.vx * 0.0022 + Math.sin(t * 0.7 + l.phase) * disorderStrength * 0.14, -0.42, 0.42);
      l.tiltX = clamp(l.vy * 0.0022 + Math.cos(t * 0.6 + l.phase) * disorderStrength * 0.12, -0.35, 0.35);
    }

    if (sweptLetterThisFrame && dove.active && dove.featherCooldown <= 0 && Math.random() < 0.28) {
      spawnFeatherFromWingTip(Math.random() < 0.3 ? 2 : 1);
      dove.featherCooldown = 0.6 + Math.random() * 0.65;
    }

    if (stateChangedToGone) {
      updateEpilogueState();
    }

    // 终章留白柔和淡入
    epilogueOpacity = lerp(epilogueOpacity, epilogueActive ? 1 : 0, Math.min(1, dt * 2.4));

    // 6. 更新白鸽落羽物理（受常风漂移、轻摇缓降并淡出）
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        feathers.splice(i, 1);
        continue;
      }

      f.swayPhase += f.swaySpeed * dt;
      const windX = 16 + params.wind * 56 + skyNoise(f.x, f.y, t * 0.9) * 18;
      const swayX = Math.cos(f.swayPhase) * 24;

      f.vx = lerp(f.vx, windX + swayX, Math.min(1, dt * 1.8));
      f.vy = lerp(f.vy, f.fallSpeed + Math.sin(f.swayPhase * 2) * 4, Math.min(1, dt * 2.2));
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot = f.baseTilt + Math.sin(f.swayPhase) * 0.48;
    }

    // 7. 更新消散云雾粒子
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

    // 8. 更新程序化风声实时参数
    soundEngine.update(doveSpeed, dove.opacity);
  }

  // -----------------------------------------------------------------
  // 绘制模块
  // -----------------------------------------------------------------
  function drawSkyBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, rgbToCss(renderedSky.stops[0]));
    grad.addColorStop(0.38, rgbToCss(renderedSky.stops[1]));
    grad.addColorStop(0.76, rgbToCss(renderedSky.stops[2]));
    grad.addColorStop(1, rgbToCss(renderedSky.stops[3]));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const sx = width * renderedSky.sunPos.x;
    const sy = height * renderedSky.sunPos.y;
    const sunGlow = ctx.createRadialGradient(
      sx - camera.x * 0.6,
      sy - camera.y * 0.6,
      10,
      sx,
      sy,
      Math.max(width, height) * 0.68
    );
    sunGlow.addColorStop(0, rgbaToCss(renderedSky.sunCore));
    sunGlow.addColorStop(0.45, rgbaToCss(renderedSky.sunMid));
    sunGlow.addColorStop(1, rgbaToCss(renderedSky.sunEdge));
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, width, height);

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

  function drawSingleGlyph(l, t, isFadingOut) {
    const proj = project3D(l.x, l.y, l.z);
    const depthAlpha = clamp(0.84 + (l.z + 100) / 520, 0.66, 1);
    const baseAlpha = l.alpha * depthAlpha;
    if (baseAlpha <= 0.01) return;

    // 悬停受风微震与轻微放大
    const hover = isFadingOut ? 0 : (l.hoverLevel || 0);
    const tremorX = hover > 0.01 ? Math.sin(t * 14 + l.id * 1.7) * 1.35 * hover : 0;
    const tremorY = hover > 0.01 ? Math.cos(t * 11 + l.id * 2.3) * 1.0 * hover : 0;
    const tremorRot = hover > 0.01 ? Math.sin(t * 12 + l.id) * 0.03 * hover : 0;
    const hoverScale = 1 + hover * 0.045;

    const scaleX = proj.scale * Math.cos(l.tiltY) * hoverScale;
    const scaleY = proj.scale * Math.cos(l.tiltX) * hoverScale;
    const w = l.asset.w;
    const h = l.asset.h;

    // Z 轴光学景深：根据偏离焦平面 (z=0) 的程度自动混入 8%–22% misty 雾化贴图
    const depthDeviation = clamp(Math.abs(l.z) / 110, 0, 1);
    const depthMist = lerp(0.08, 0.22, depthDeviation);
    const effectiveMist = clamp(depthMist + l.mistLevel * (1 - depthMist), 0, 1);

    ctx.save();
    ctx.translate(proj.sx + tremorX, proj.sy + tremorY);
    ctx.rotate(l.rot + tremorRot);
    ctx.scale(scaleX, scaleY);

    const crispAlpha = baseAlpha * clamp(1 - effectiveMist * 0.92, 0, 1);
    if (crispAlpha > 0.01) {
      ctx.globalAlpha = crispAlpha;
      ctx.drawImage(l.asset.crisp, -w * 0.5, -h * 0.5, w, h);

      // 克制的悬停微亮反馈（无圆形光圈，贴合字形本身的日光亮斑）
      if (hover > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = crispAlpha * 0.22 * hover;
        ctx.drawImage(l.asset.crisp, -w * 0.5, -h * 0.5, w, h);
        ctx.restore();
      }
    }

    const mistAlpha = baseAlpha * clamp(effectiveMist * 1.15, 0, 1);
    if (mistAlpha > 0.01) {
      const mistExpand = 1 + effectiveMist * 0.24;
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

  function drawLetters(t) {
    const renderList = [];
    for (let i = 0; i < fadingOutLetters.length; i++) {
      renderList.push({ item: fadingOutLetters[i], fading: true });
    }
    for (let i = 0; i < letters.length; i++) {
      if (letters[i].state !== 'gone') {
        renderList.push({ item: letters[i], fading: false });
      }
    }

    renderList.sort((a, b) => a.item.z - b.item.z);

    for (let i = 0; i < renderList.length; i++) {
      drawSingleGlyph(renderList[i].item, t, renderList[i].fading);
    }
  }

  function drawEpilogue(t) {
    if (epilogueOpacity <= 0.01) return;
    const theme = SKY_THEMES[currentThemeId] || SKY_THEMES.noon;
    const breath = 0.9 + Math.sin(t * 1.15) * 0.08;
    const cx = width * 0.5 - camera.x * 0.28;
    const cy = height * 0.46 - camera.y * 0.24;
    const mainSize = clamp(width < 700 ? width * 0.056 : width * 0.026, 20, 32);
    const subSize = clamp(mainSize * 0.46, 12, 15);

    ctx.save();
    ctx.globalAlpha = epilogueOpacity * breath;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = theme.epilogueGlow;
    ctx.shadowBlur = 16;

    ctx.font = `italic 400 ${mainSize}px ${fontFamily}`;
    ctx.fillStyle = theme.epilogueMain;
    ctx.fillText('The wind has delivered your letter.', cx, cy);
    ctx.fillText('The wind has delivered your letter.', cx, cy);

    ctx.shadowBlur = 10;
    ctx.font = `400 ${subSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = theme.epilogueSub;
    ctx.fillText('云散风清 · 信已寄达', cx, cy + mainSize * 1.32);
    ctx.restore();
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
      const fade = Math.sin(progress * Math.PI);
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

  function drawFeathers() {
    if (feathers.length === 0) return;
    const theme = SKY_THEMES[currentThemeId] || SKY_THEMES.noon;

    for (let i = 0; i < feathers.length; i++) {
      const f = feathers[i];
      const progress = f.life / f.maxLife;
      const fadeIn = progress < 0.12 ? progress / 0.12 : 1;
      const fadeOut = progress > 0.55 ? 1 - (progress - 0.55) / 0.45 : 1;
      const alpha = f.alpha * fadeIn * Math.max(0, fadeOut);
      if (alpha <= 0.01) continue;

      const flutterScaleY = 0.55 + 0.45 * Math.abs(Math.cos(f.swayPhase * 0.7));
      const hl = f.length * 0.5;
      const hw = f.width * flutterScaleY;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = theme.doveShadow;
      ctx.shadowBlur = 5;

      // 半抽象柔羽剪影
      ctx.fillStyle = theme.featherFill;
      ctx.beginPath();
      ctx.moveTo(-hl, 0.4);
      ctx.bezierCurveTo(-hl * 0.35, -hw * 1.15, hl * 0.45, -hw * 0.95, hl, -0.3);
      ctx.bezierCurveTo(hl * 0.5, hw * 0.88, -hl * 0.3, hw * 1.05, -hl, 0.4);
      ctx.closePath();
      ctx.fill();

      // 纤细羽轴
      ctx.strokeStyle = theme.featherQuill;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-hl * 0.9, 0.3);
      ctx.quadraticCurveTo(0, -hw * 0.15, hl * 0.85, -0.2);
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawWhiteDove() {
    if (!dove.active || dove.opacity <= 0.01) return;

    const theme = SKY_THEMES[currentThemeId] || SKY_THEMES.noon;
    const flap = Math.sin(dove.wingPhase);
    const flapSecondary = Math.sin(dove.wingPhase - 0.55);
    const facingLeft = Math.cos(dove.angle) < 0;
    const s = dove.scale * (width < 700 ? 0.88 : 1.05);

    ctx.save();
    ctx.translate(dove.x, dove.y);
    ctx.rotate(dove.angle);
    if (facingLeft) {
      ctx.scale(1, -1);
    }
    ctx.scale(s, s);
    ctx.globalAlpha = dove.opacity;

    ctx.shadowColor = theme.doveShadow;
    ctx.shadowBlur = 14;

    // 1. 远侧翅膀
    const backWingLift = -24 + flapSecondary * 18;
    const backWingSweep = -12 - Math.abs(flapSecondary) * 8;
    ctx.fillStyle = theme.doveBackWing;
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.bezierCurveTo(-4, backWingLift * 0.65, -18, backWingLift, backWingSweep - 16, backWingLift + 4);
    ctx.bezierCurveTo(-20, backWingLift * 0.32, -10, -2, -6, 1);
    ctx.closePath();
    ctx.fill();

    // 2. 小巧信封
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(42, 102, 162, 0.18)';
    const envSwing = Math.sin(dove.wingPhase * 0.5 - 0.4) * 0.09;
    ctx.translate(21, 5.5);
    ctx.rotate(0.18 + envSwing);

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

    ctx.strokeStyle = 'rgba(122, 168, 212, 0.62)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-ew * 0.46, -eh * 0.42);
    ctx.lineTo(0, eh * 0.08);
    ctx.lineTo(ew * 0.46, -eh * 0.42);
    ctx.stroke();

    ctx.fillStyle = 'rgba(222, 132, 122, 0.82)';
    ctx.beginPath();
    ctx.arc(0, eh * 0.06, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. 白鸽流线躯干
    const bodyGrad = ctx.createLinearGradient(-22, -6, 20, 8);
    bodyGrad.addColorStop(0, theme.doveBodyStops[0]);
    bodyGrad.addColorStop(0.55, theme.doveBodyStops[1]);
    bodyGrad.addColorStop(1, theme.doveBodyStops[2]);
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(22.5, -1.2);
    ctx.quadraticCurveTo(17.5, -6.5, 11.5, -4.5);
    ctx.bezierCurveTo(3, -5.2, -9, -3.5, -26, -7.2);
    ctx.quadraticCurveTo(-20.5, -1.2, -28, 3.2);
    ctx.bezierCurveTo(-14, 5.8, -1, 7.6, 10.5, 4.2);
    ctx.quadraticCurveTo(16.5, 2.5, 22.5, -1.2);
    ctx.closePath();
    ctx.fill();

    // 4. 近侧主羽翼
    const frontWingTipY = -30 + flap * 32;
    const frontWingTipX = -15 - flap * 5;
    const wingGrad = ctx.createLinearGradient(4, -2, frontWingTipX, frontWingTipY);
    wingGrad.addColorStop(0, theme.doveWingStops[0]);
    wingGrad.addColorStop(0.75, theme.doveWingStops[1]);
    wingGrad.addColorStop(1, theme.doveWingStops[2]);
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

  function renderScene(t = performance.now() / 1000) {
    drawSkyBackground();
    drawLetters(t);
    drawCloudParticles();
    drawEpilogue(t);
    drawWindRibbons();
    drawFeathers();
    drawWhiteDove();
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

    // 尺寸变更时重建各主题字号缓存
    Object.values(themeGlyphCaches).forEach((cache) => cache.clear());
    glyphMaskCache.clear();

    initBackgroundClouds();
    layoutLetters({
      preserveGoneSet: goneSet.size > 0 ? goneSet : null,
      condense: false
    });
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 120);
  });

  // 初始化并解析 URL 自定义来信
  activeMessageText = parseMessageFromUrl();
  buildPuffSprite();
  handleResize();

  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const t = now / 1000;

    update(dt, t);
    renderScene(t);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
