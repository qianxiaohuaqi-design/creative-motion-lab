/**
 * Cloud Typography — complete interactive motion study.
 * No external libraries. HTML spans keep the words accessible; a Canvas overlay
 * draws transient cloud particles so that the original DOM layout never shifts.
 */
(() => {
  'use strict';
  const headline = document.getElementById('cloud-text');
  const canvas = document.getElementById('mist-canvas');
  const slider = document.getElementById('wind-range');
  const windValue = document.getElementById('wind-value');
  const resetButton = document.getElementById('reset-button');
  const liveStatus = document.getElementById('live-status');
  if (!headline || !canvas || !slider || !resetButton) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const preferReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const words = [];
  const effects = new Map();
  const originalText = headline.textContent.trim();
  const parts = originalText.split(/\s+/).filter(Boolean);
  const start = performance.now();
  let wind = Number(slider.value);
  let begin = start;
  let lastTime = start;
  let frame = 0;
  let dpr = 1;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  const TIMING = Object.freeze({ disperse: 1550, pause: 570, return: 1660 });
  const totalDuration = TIMING.disperse + TIMING.pause + TIMING.return;
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pseudo = n => { const a = Math.sin(n * 127.1 + 78.23) * 43758.5453; return a - Math.floor(a); };

  function createWords() {
    headline.textContent = '';
    parts.forEach((text, index) => {
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('role', 'button');
      word.tabIndex = 0;
      word.setAttribute('aria-label', `让 ${text} 化作云朵并重新凝聚`);
      word.dataset.word = text;
      word.style.animationDelay = `${index * 0.14}s`;
      const chars = [];
      [...text].forEach((letter, i) => {
        const char = document.createElement('span');
        char.className = 'char';
        char.dataset.char = letter;
        char.textContent = letter;
        char.setAttribute('aria-hidden', 'true');
        word.append(char);
        chars.push(char);
      });
      word.addEventListener('click', () => dissolve(word));
      word.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); dissolve(word); }
      });
      headline.append(word);
      if (index < parts.length - 1) headline.append(' ');
      words.push({ element: word, chars, text, index });
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function sprite(radius) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32,32,0,32,32,31);
    grad.addColorStop(0,'rgba(255,255,255,1)');
    grad.addColorStop(.14,'rgba(255,255,255,.91)');
    grad.addColorStop(.38,'rgba(255,255,255,.42)');
    grad.addColorStop(.75,'rgba(255,255,255,.08)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0,0,size,size);
    return c;
  }
  const softDot = sprite();

  // Sample pixel opacity from an offscreen text mask to turn an actual word into particles.
  function sampleText(word) {
    const rect = word.getBoundingClientRect();
    const style = window.getComputedStyle(headline);
    const layer = document.createElement('canvas');
    const scale = 1.3;
    const w = Math.max(1,Math.ceil(rect.width * scale));
    const h = Math.max(1,Math.ceil(rect.height * scale));
    layer.width = w; layer.height = h;
    const g = layer.getContext('2d', { willReadFrequently: true });
    if (!g) return [];
    g.scale(scale,scale);
    g.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'white';
    g.fillText(word.dataset.word, rect.width / 2, rect.height / 2 - 1);
    const pixels = g.getImageData(0,0,w,h).data;
    const candidates = [];
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const alpha = pixels[(y*w+x)*4+3];
        if (alpha > 66 && pseudo((x + y*37)*.731) > .16) candidates.push({x:x/scale,y:y/scale});
      }
    }
    // Spread samples over the entire glyph rather than using only the left side.
    const cap = Math.min(340, Math.max(125, Math.round(rect.width * .72)));
    if (candidates.length > cap) {
      for (let i = candidates.length-1; i>0; i--) {
        const j = Math.floor(pseudo(i*1.183+rect.width)* (i+1));
        [candidates[i], candidates[j]]=[candidates[j], candidates[i]];
      }
      candidates.length = cap;
    }
    const strength = .35 + wind / 5;
    const droplets = candidates.map((pt,i) => {
      const random = pseudo(i * 7.531 + rect.left * .07);
      const random2 = pseudo(i * 11.23 + rect.top * .13);
      const spread = 40 + random * (90 + 75 * strength);
      const theta = (random - .5) * 2.9 - .3;
      return {
        x0: rect.left + pt.x,
        y0: rect.top + pt.y,
        dx: Math.cos(theta)*spread + 34*strength,
        dy: Math.sin(theta)*spread*.7 - 31 - random2*42,
        radius: 3.4 + random2*8.0,
        phase: random*6.283,
        alpha: .38 + random*.54
      };
    });
    // A second, broader low-opacity layer forms soft cloud wisps around the glyph.
    // These are still generated from the real character mask, not random background snow.
    const vapor = droplets.filter((_, i) => i % 5 === 0).map((p, i) => ({
      ...p, dx: p.dx * .77, dy: p.dy * .83,
      radius: 19 + pseudo(i*9.7)*19,
      alpha: .10 + pseudo(i*2.17)*.09
    }));
    return [...vapor, ...droplets];
  }

  function dissolve(word) {
    if (effects.has(word)) return; // Per-word lock; other words remain interactive.
    if (preferReducedMotion.matches) {
      word.style.opacity = '.17';
      word.style.filter = 'blur(3px)';
      word.setAttribute('aria-disabled', 'true');
      const id = { reduced: true };
      effects.set(word, id);
      window.setTimeout(() => {
        if (effects.get(word) !== id) return;
        word.style.opacity = ''; word.style.filter = '';
        word.removeAttribute('aria-disabled');
        effects.delete(word);
      }, 350);
      return;
    }
    const particles = sampleText(word);
    if (!particles.length) return;
    effects.set(word, { time: performance.now(), particles });
    word.classList.add('dispersing');
    word.setAttribute('aria-disabled','true');
    liveStatus.textContent = `${word.dataset.word} 化作云朵，正在重新凝聚。`;
  }

  function drawParticles(now) {
    ctx.clearRect(0,0,viewportWidth,viewportHeight);
    for (const [word, effect] of effects) {
      if (effect.reduced) continue;
      const elapsed = now - effect.time;
      if (elapsed >= totalDuration) {
        word.classList.remove('dispersing');
        word.removeAttribute('aria-disabled');
        effects.delete(word);
        continue;
      }
      const out = elapsed < TIMING.disperse;
      const hold = elapsed >= TIMING.disperse && elapsed < TIMING.disperse + TIMING.pause;
      const progress = out ? ease(elapsed/TIMING.disperse) : hold ? 1 : 1-ease((elapsed-TIMING.disperse-TIMING.pause)/TIMING.return);
      // Converging opacity rises as particles approach their original letter pixels.
      const opacity = out ? 1 - .55*progress : hold ? .45 : .40 + .60*(1-progress);
      for (const p of effect.particles) {
        const waver = Math.sin(now*.00065 + p.phase)*6*progress;
        const cx = p.x0 + p.dx*progress + waver;
        const cy = p.y0 + p.dy*progress + Math.cos(now*.00043+p.phase)*5*progress;
        const size = p.radius*(.83 + .6*progress);
        ctx.globalAlpha = p.alpha*opacity;
        ctx.drawImage(softDot,cx-size,cy-size,size*2,size*2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    // Keep movement time based, not frame based, so the same effect survives 60/120Hz.
    const dt = clamp(now-lastTime,0,60); lastTime=now;
    frame++;
    const t = now-begin;
    const chaos = ease(Math.min(1,t/36000));
    const strength = wind / 2;
    if (!preferReducedMotion.matches && strength > 0) {
      words.forEach(({element,chars,index}) => {
        if (effects.has(element)) return; // Keep source pixels still during dispersal.
        const shared = Math.sin(t*.00018+.4)*5.2;
        const dx = (shared + Math.sin(t*.00031+index*.62)*3.5 + Math.sin(t*.0001+index*2.7)*chaos*9) * strength;
        const dy = (Math.cos(t*.00023+index*.41)*3 + Math.sin(t*.00013+index*.8)*chaos*5.5)*strength;
        const rotation = (Math.sin(t*.00015+index*.53)*.8+chaos*Math.sin(t*.00009+index*1.3)*2)*strength;
        element.style.transform=`translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg)`;
        chars.forEach((char,j) => {
          const x=(Math.sin(t*.00026+index*.58+j*.42)*1.2 + chaos*Math.sin(index*5.6+j*2.37+t*.00017)*3.2)*strength;
          const y=(Math.cos(t*.00029+j*.33+index*.3)*1.1 + chaos*Math.cos(j*2.47+index+t*.00012)*2.5)*strength;
          const a=(Math.sin(t*.00022+j*.36)*.35 + chaos*Math.sin(j*2.9+index)*2.5)*strength;
          char.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${a.toFixed(2)}deg)`;
        });
      });
    } else {
      words.forEach(({element,chars}) => {
        element.style.transform=''; chars.forEach(char=>char.style.transform='');
      });
    }
    if (effects.size || frame%6===0) drawParticles(now);
    requestAnimationFrame(animate);
  }

  slider.addEventListener('input', () => { wind=Number(slider.value); windValue.textContent=String(wind).padStart(2,'0'); });
  resetButton.addEventListener('click', () => {
    begin=performance.now();
    effects.forEach((e,word)=>{
      word.classList.remove('dispersing');
      word.style.opacity=''; word.style.filter=''; word.removeAttribute('aria-disabled');
    });
    effects.clear(); ctx.clearRect(0,0,viewportWidth,viewportHeight);
    liveStatus.textContent='天空已恢复初始状态。';
  });
  const refreshMotionMode = () => { begin=performance.now(); };
  preferReducedMotion.addEventListener?.('change',refreshMotionMode);
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime=performance.now();
  });

  createWords();
  resize();
  windValue.textContent=String(wind).padStart(2,'0');
  requestAnimationFrame(animate);
})();
