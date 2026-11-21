/** Cloud Typography v1.4 — lucid sky, subtle depth, cursor-driven wind and permanent dispersal.
 * Each letter owns a 3-D transform. DOM controls remain independent of Canvas fog.
 */
(() => {
  'use strict';
  const sky = document.getElementById('sky');
  const paragraph = document.getElementById('cloud-text');
  const canvas = document.getElementById('mist-canvas');
  const windRange = document.getElementById('wind-range');
  const chaosRange = document.getElementById('chaos-range');
  const radiusRange = document.getElementById('radius-range');
  const windValue = document.getElementById('wind-value');
  const chaosValue = document.getElementById('chaos-value');
  const radiusValue = document.getElementById('radius-value');
  const gustButton = document.getElementById('gust-button');
  const resetButton = document.getElementById('reset-button');
  const status = document.getElementById('live-status');
  const halo = document.getElementById('wind-halo');
  if (!sky || !paragraph || !canvas || !windRange || !chaosRange || !radiusRange || !radiusValue || !resetButton) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const original = paragraph.textContent.replace(/\s+/g, ' ').trim();
  const letters = [];
  const effects = new Map();
  const masks = new Map();
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const smooth = t => { t = clamp(t,0,1); return t*t*(3-2*t); };
  const random = v => { const f = Math.sin(v * 117.17 + 29.3) * 43758.5; return f - Math.floor(f); };
  let wind = +windRange.value;
  let disorder = +chaosRange.value / 100;
  let radiusSetting = +radiusRange.value;
  let start = performance.now();
  let vw = window.innerWidth, vh = window.innerHeight, dpr = 1;
  let lastAnnouncement = 0;
  let gusting = false;
  // Pointer state is deliberately separate from per-letter state: a tap remains a tap.
  const press = { active:false, id:null, x:0,y:0, downX:0,downY:0, downAt:0,
    lastX:0,lastY:0,lastAt:0, triggered:false, dirX:.94,dirY:-.34 };
  const field = {x:-1000,y:-1000,dirX:.94,dirY:-.34, strength:0, radius:radiusSetting};
  let previousTick = performance.now();
  let suppressClicksUntil = 0;

  function build() {
    paragraph.textContent = '';
    original.split(' ').forEach((wordText, wi, all) => {
      const word = document.createElement('span');
      word.className = 'word';
      for (const char of wordText) {
        const el = document.createElement('span');
        el.className = 'letter';
        el.textContent = char;
        el.dataset.char = char;
        el.dataset.index = String(letters.length);
        el.role = 'button';
        el.tabIndex = 0;
        el.setAttribute('aria-label', `吹散字母 ${char}`);
        const index = letters.length;
        letters.push({el,word,index,gone:false,x:0,y:0,
          biasX:(random(index*1.713)-.5)*2,biasY:(random(index*2.317)-.5)*2,
          zSeed:(random(index*3.199)-.5)*2,
          gustX:0,gustY:0,gustZ:0,gustVX:0,gustVY:0,pressDose:0});
        word.append(el);
      }
      paragraph.append(word);
      if (wi < all.length-1) paragraph.append(document.createTextNode(' '));
    });
  }
  // Layout positions in the same coordinate system, regardless of each letter's animation transform.
  function measure() {
    for (const item of letters) {
      item.x = item.word.offsetLeft + item.el.offsetLeft + item.el.offsetWidth / 2;
      item.y = item.word.offsetTop + item.el.offsetTop + item.el.offsetHeight / 2;
    }
  }
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    canvas.width = Math.max(1,Math.round(vw * dpr));
    canvas.height = Math.max(1,Math.round(vh * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    measure();
  }
  function createMistSprite(elongated) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.save(); g.translate(64,64); if (elongated) g.scale(1.38,.72);
    const gradient = g.createRadialGradient(0,0,0,0,0,54);
    gradient.addColorStop(0,'rgba(255,255,255,.92)');
    gradient.addColorStop(.18,'rgba(251,253,255,.58)');
    gradient.addColorStop(.49,'rgba(246,251,253,.22)');
    gradient.addColorStop(.78,'rgba(243,250,252,.07)');
    gradient.addColorStop(1,'rgba(240,250,252,0)');
    g.fillStyle = gradient; g.fillRect(-64,-64,128,128); g.restore();
    return c;
  }
  const mistDot = createMistSprite(false);
  const mistStrand = createMistSprite(true);
  function glyphPoints(item, maxPoints) {
    const rect = item.el.getBoundingClientRect();
    const style = getComputedStyle(item.el);
    const w = Math.max(4,item.el.offsetWidth), h = Math.max(4,item.el.offsetHeight);
    const key = `${item.el.textContent}|${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${w}x${h}`;
    let points = masks.get(key);
    if (!points) {
      const scale = 1.5;
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.ceil(w*scale); offscreen.height = Math.ceil(h*scale);
      const g = offscreen.getContext('2d', {willReadFrequently:true});
      g.scale(scale,scale); g.fillStyle='#fff';
      g.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      g.textAlign='center'; g.textBaseline='middle';
      g.fillText(item.el.textContent,w/2,h/2);
      const data = g.getImageData(0,0,offscreen.width,offscreen.height).data;
      points=[];
      for(let y=0;y<offscreen.height;y+=3) for(let x=0;x<offscreen.width;x+=3) {
        if (data[(y*offscreen.width+x)*4+3] > 75) points.push({x:x/scale-w/2,y:y/scale-h/2});
      }
      if (!points.length) points.push({x:0,y:0});
      masks.set(key,points);
    }
    const selected=[];
    const n=Math.min(maxPoints,points.length);
    for(let i=0;i<n;i++)selected.push(points[Math.floor(i*points.length/n)]);
    return {selected,rect};
  }
  function dissolve(item, options={}) {
    if (!item || item.gone || effects.has(item.index)) return;
    if (reduced.matches) { item.gone=true; item.el.classList.add('gone'); item.el.tabIndex=-1; return; }
    const now = performance.now();
    const {selected,rect} = glyphPoints(item, options.mass ? 14 : 55);
    const cx = rect.left+rect.width/2, cy=rect.top+rect.height/2;
    const particles=[]; const seed=item.index*11.37;
    const strength=.78+wind*.16;
    const flow=options.flow || {x:.96,y:-.27};
    const norm=Math.max(.001,Math.hypot(flow.x,flow.y));
    const flowX=flow.x/norm,flowY=flow.y/norm;
    for(let i=0;i<selected.length;i++){
      const pt=selected[i], r1=random(i*.79+seed),r2=random(i*2.13+seed),r3=random(i*3.3+seed);
      const drift=(110+r1*210)*strength;
      const dx=flowX*drift+(r2-.5)*34;
      const dy=flowY*drift+(r2-.5)*(85+disorder*140);
      particles.push({x:cx+pt.x,y:cy+pt.y,dx,dy,depth:(r3-.62)*210,
        curl:(r2-.5)*85,phase:r1*6.283,radius:3.5+r2*7.0,alpha:.35+r3*.48,
        soft:r3>.55});
    }
    for(let i=0;i<Math.min(12,Math.ceil(selected.length*.32));i++){
      const base=particles[(i*5)%particles.length];
      particles.push({...base,radius:17+random(i+seed)*19,alpha:.08+random(i*2.7+seed)*.13,soft:true});
    }
    effects.set(item.index,{item,start:now+(options.delay||0),duration:2200+random(seed)*1100,particles,hidden:false});
  }
  function gust() {
    if (gusting) return;
    gusting=true;
    const available=letters.filter(x=>!x.gone&&!effects.has(x.index));
    available.forEach((item,i)=>dissolve(item,{mass:true,delay:i*14+random(item.index*2.1)*280}));
    if(status) status.textContent='一阵风掠过，字母正向天空的远处散开。';
    window.setTimeout(()=>{gusting=false;},800);
  }
  // Stop a completed press-and-sweep from also firing the ordinary click gesture.
  sky.addEventListener('click', e=>{
    if(performance.now() < suppressClicksUntil && !e.target.closest?.('.bottom-bar,.masthead')) {
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  paragraph.addEventListener('click', e=>{
    const node=e.target.closest?.('.letter');
    if (!node) return;
    const item=letters[+node.dataset.index]; dissolve(item);
    if (status && performance.now()-lastAnnouncement>850) { status.textContent=`字母 ${node.textContent} 随风散去。`;lastAnnouncement=performance.now(); }
    e.stopPropagation();
  });
  paragraph.addEventListener('keydown', e=>{
    if (!['Enter',' '].includes(e.key)) return;
    const node=e.target.closest?.('.letter');
    if (!node) return;
    e.preventDefault();e.stopPropagation();dissolve(letters[+node.dataset.index]);
  });
  gustButton?.addEventListener('click',gust);
  // 3-D transforms can cause hit testing to target the scene instead of a projected glyph.
  // Recover the nearest actual letter beneath the pointer (also improves touch targeting).
  function nearestLetter(clientX,clientY) {
    let best = null, score = Infinity;
    for(const item of letters){
      if(item.gone || effects.has(item.index)) continue;
      const r=item.el.getBoundingClientRect();
      const pad=4;
      if(clientX<r.left-pad || clientX>r.right+pad || clientY<r.top-pad || clientY>r.bottom+pad)continue;
      const dx=(clientX-(r.left+r.right)/2)/Math.max(10,r.width);
      const dy=(clientY-(r.top+r.bottom)/2)/Math.max(10,r.height);
      const d=dx*dx+dy*dy;
      if(d<score){score=d;best=item;}
    }
    return best;
  }
  // -------- Press and hold to create a local, directional wind field --------
  // Mouse drag steers the gust. Staying in one place produces a rightward breeze.
  function handlePointerDown(e) {
    if (press.active || !e.isPrimary || (e.pointerType==='mouse' && e.button!==0)) return;
    if(e.target.closest?.('.bottom-bar,.masthead,button,input,label')) return;
    press.active=true; press.id=e.pointerId;
    press.downX=press.lastX=press.x=e.clientX;
    press.downY=press.lastY=press.y=e.clientY;
    press.downAt=press.lastAt=performance.now();
    press.triggered=false; press.dirX=.94;press.dirY=-.34;
  }
  function handlePointerMove(e) {
    if(!press.active || e.pointerId!==press.id) return;
    const now=performance.now();
    const dt=Math.max(12,now-press.lastAt);
    const vx=(e.clientX-press.lastX)/dt,vy=(e.clientY-press.lastY)/dt;
    if(Math.hypot(vx,vy)>.018) {
      const length=Math.hypot(vx,vy);
      press.dirX=press.dirX*.72+vx/length*.28;
      press.dirY=press.dirY*.72+vy/length*.28;
    }
    press.x=e.clientX;press.y=e.clientY;
    press.lastX=e.clientX;press.lastY=e.clientY;press.lastAt=now;
  }
  function handlePointerEnd(e) {
    if(!press.active || e.pointerId!==press.id)return;
    if(press.triggered) suppressClicksUntil=performance.now()+420;
    press.active=false;press.id=null;
    // field.strength is not reset here: the remaining wind decays naturally.
  }
  // Block Chrome's native text selection and drag ghosting during wind sweeps.
  // This also covers whitespace text nodes between .word elements.
  sky.addEventListener('selectstart', event => {
    if (!event.target.closest?.('.bottom-bar')) event.preventDefault();
  });
  sky.addEventListener('dragstart', event => {
    if (!event.target.closest?.('.bottom-bar')) event.preventDefault();
  });
  sky.addEventListener('pointerdown',handlePointerDown);
  window.addEventListener('pointermove',handlePointerMove,{passive:true});
  window.addEventListener('pointerup',handlePointerEnd);
  window.addEventListener('pointercancel',handlePointerEnd);
  window.addEventListener('blur',()=>{press.active=false;press.id=null;});
  sky.addEventListener('contextmenu',e=>{if(press.active && !e.target.closest?.('.bottom-bar'))e.preventDefault();});

  function updateLocalWind(now,dt) {
    const seconds=dt/1000;
    if(press.active) {
      const held=now-press.downAt;
      const travelled=Math.hypot(press.x-press.downX,press.y-press.downY);
      // A short tap stays a click. A hold or an intentional drag becomes wind.
      if(held>=270 || (held>=150 && travelled>13))press.triggered=true;
      if(press.triggered) {
        const unit=Math.max(.001,Math.hypot(press.dirX,press.dirY));
        field.dirX=press.dirX/unit;field.dirY=press.dirY/unit;
        field.x=press.x;field.y=press.y;
        field.strength=.35+2.2*smooth((held-180)/1700);
        // Actual affected area and halo diameter always share the slider's radius.
        field.radius=radiusSetting;
      }
    } else {
      const fade=Math.exp(-dt*.0034);
      field.strength*=fade;
      field.x+=field.dirX*dt*.022*field.strength;
      field.y+=field.dirY*dt*.022*field.strength;
      if(field.strength<.012)field.strength=0;
    }
    if(halo){
      const visible=!reduced.matches && field.strength>.012;
      halo.style.opacity=visible?String(Math.min(.63,field.strength*.26)):'0';
      if(visible){
        const scale=field.radius/95;
        halo.style.transform=`translate3d(${field.x.toFixed(1)}px,${field.y.toFixed(1)}px,0) scale(${scale.toFixed(2)}) rotate(${(Math.atan2(field.dirY,field.dirX)*180/Math.PI).toFixed(0)}deg)`;
      }
    }
    if(field.strength<=0 && !press.active){
      for(const item of letters)item.pressDose=Math.max(0,item.pressDose-seconds*.45);
      return;
    }
    const bounds=paragraph.getBoundingClientRect();
    for(const item of letters) {
      if(item.gone||effects.has(item.index)) continue;
      const dx=(bounds.left+item.x+item.gustX)-field.x;
      const dy=(bounds.top+item.y+item.gustY)-field.y;
      const dist=Math.hypot(dx,dy);
      const influence=dist<field.radius?Math.pow(1-dist/field.radius,1.32)*field.strength:0;
      if(influence>0 && !reduced.matches) {
        const radialX=dx/Math.max(1,dist),radialY=dy/Math.max(1,dist);
        const curl=Math.sin(now*.0017+item.index*.7)*.23;
        const ax=(field.dirX*300+radialX*135-radialY*90*curl)*influence;
        const ay=(field.dirY*300+radialY*135+radialX*90*curl)*influence;
        item.gustVX+=ax*seconds;
        item.gustVY+=ay*seconds;
      }
      if(press.active && press.triggered && influence>0) {
        item.pressDose+=influence*seconds*1.45;
        const threshold=.60+random(item.index*4.17)*.72;
        if(item.pressDose>=threshold){
          dissolve(item,{flow:{x:field.dirX,y:field.dirY}});
          continue;
        }
      } else item.pressDose=Math.max(0,item.pressDose-seconds*.30);
    }
  }
  // Apply a spring-like recovery to surviving letters after the gust has passed.
  function motionImpulse(item,dt) {
    const s=dt/1000;
    const drag=Math.exp(-s*3.8), recovery=Math.exp(-s*1.0);
    item.gustVX*=drag;item.gustVY*=drag;
    item.gustX=clamp((item.gustX+item.gustVX*s)*recovery,-145,145);
    item.gustY=clamp((item.gustY+item.gustVY*s)*recovery,-145,145);
    item.gustZ=clamp((item.gustZ+Math.hypot(item.gustVX,item.gustVY)*s*.07)*recovery,-90,90);
  }
  // ---------------------------------------------------------------
  sky.addEventListener('click',e=>{
    if(e.target.closest?.('.masthead,.bottom-bar')) return;
    const item=nearestLetter(e.clientX,e.clientY);
    if(item){
      dissolve(item);
      return;
    }
    if(e.target.closest?.('.composition'))return;
    gust();
  });
  function particlesFrame(now) {
    ctx.clearRect(0,0,vw,vh);
    const px=vw*.5,py=vh*.5;
    for (const [key,effect] of effects) {
      const age=now-effect.start;
      if(age<0)continue;
      if(!effect.hidden) {
        effect.hidden=true; effect.item.gone=true;
        effect.item.el.classList.add('gone'); effect.item.el.tabIndex=-1;
      }
      const t=age/effect.duration;
      if(t>=1) {effects.delete(key);continue;}
      const e=smooth(t), alpha=Math.pow(1-e,.7);
      for(const p of effect.particles){
        const depth=p.depth*e;
        const perspective=clamp(900/(900-depth),.75,1.35);
        const cx=p.x+p.dx*e+Math.sin(now*.0011+p.phase+e*4)*p.curl*e;
        const cy=p.y+p.dy*e+Math.cos(now*.0009+p.phase)*19*e;
        const x=px+(cx-px)*perspective;
        const y=py+(cy-py)*perspective;
        const radius=p.radius*(1+e*(p.soft?1.85:1.20))*perspective;
        ctx.globalAlpha=p.alpha*alpha*(p.soft?.74:1);
        ctx.drawImage(p.soft?mistStrand:mistDot,x-radius,y-radius,radius*2,radius*2);
      }
    }
    ctx.globalAlpha=1;
  }
  function animate(now) {
    const dt=clamp(now-previousTick,0,45);previousTick=now;
    if (!document.hidden) {
      updateLocalWind(now,dt);
      const elapsed=now-start;
      const chaos=disorder*smooth((elapsed-3300)/30000);
      const calm=.10+.90*smooth((elapsed-900)/15000);
      const stageScale=clamp(vw/1080,.42,1);
      const breeze=wind/3*stageScale;
      if(reduced.matches){
        for(const item of letters) if(!item.gone) item.el.style.transform='';
      } else {
        for (const item of letters) {
          if(item.gone||effects.has(item.index)) continue;
          motionImpulse(item,dt);
          const x=item.x*.012,y=item.y*.011,k=item.index;
          const sharedX = Math.sin(elapsed*.00026+x*.45+y*.18)*9 + Math.sin(elapsed*.00013+x*.33)*8;
          const sharedY = Math.cos(elapsed*.00024+y*.37+x*.18)*5;
          const dx=(sharedX + Math.sin(elapsed*.00037+x+k*.12)*5 + (item.biasX*49+Math.sin(elapsed*.00014+k*.17)*17)*chaos)*breeze*calm;
          const dy=(sharedY + Math.sin(elapsed*.00033+y+k*.1)*5 + (item.biasY*42+Math.cos(elapsed*.00016+k*.19)*15)*chaos)*breeze*calm;
          const z=(item.zSeed*12 + Math.sin(elapsed*.00025+x*.41+k*.08)*9 + item.zSeed*55*chaos)*breeze*calm;
          const rz=(Math.sin(elapsed*.0002+k*.13)*1.3+item.biasX*20*chaos)*breeze*calm;
          const rx=(item.biasY*6*chaos+Math.sin(elapsed*.00024+k*.18)*2)*breeze*calm;
          const ry=(item.zSeed*10*chaos+Math.cos(elapsed*.00019+k*.12)*3)*breeze*calm;
          const px=dx+item.gustX,py=dy+item.gustY,pz=z+item.gustZ;
          const impulseAngle=clamp(item.gustVX*.022,-11,11);
          item.el.style.transform=`translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${pz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${(rz+impulseAngle).toFixed(1)}deg)`;
        }
      }
      if (effects.size) particlesFrame(now);
    }
    requestAnimationFrame(animate);
  }
  windRange.addEventListener('input',()=>{wind=+windRange.value;windValue.textContent=String(wind).padStart(2,'0');});
  chaosRange.addEventListener('input',()=>{disorder=+chaosRange.value/100;chaosValue.textContent=String(chaosRange.value).padStart(2,'0');});
  radiusRange.addEventListener('input',()=>{radiusSetting=+radiusRange.value;field.radius=radiusSetting;radiusValue.textContent=String(radiusSetting);});
  resetButton.addEventListener('click',()=>{
    effects.clear();gusting=false;start=performance.now();
    press.active=false;press.id=null;field.strength=0;field.x=-1000;field.y=-1000;
    if(halo)halo.style.opacity='0';
    for(const item of letters){item.gone=false;item.el.classList.remove('gone');item.el.tabIndex=0;item.el.style.transform='';item.gustX=item.gustY=item.gustZ=item.gustVX=item.gustVY=item.pressDose=0;}
    ctx.clearRect(0,0,vw,vh); if(status)status.textContent='天空重新开始，所有字母已恢复。';
  });
  window.addEventListener('resize',resize,{passive:true});
  reduced.addEventListener?.('change',()=>{start=performance.now();field.strength=0;});
  document.addEventListener('visibilitychange',()=>{previousTick=performance.now();if(document.hidden){press.active=false;press.id=null;field.strength=0;}});
  build(); resize();
  windValue.textContent=String(wind).padStart(2,'0');
  chaosValue.textContent=String(chaosRange.value).padStart(2,'0');
  radiusValue.textContent=String(radiusSetting);
  requestAnimationFrame(animate);
})();
