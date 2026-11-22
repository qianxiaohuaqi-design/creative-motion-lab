/** Cloud Typography v2.5 — lucid sky, subtle depth, cursor-driven wind and permanent dispersal.
 * Each letter owns a 3-D transform. DOM controls remain independent of Canvas fog.
 */
(() => {
  'use strict';
  const sky = document.getElementById('sky');
  const paragraph = document.getElementById('cloud-text');
  const canvas = document.getElementById('mist-canvas');
  const windRange = document.getElementById('wind-range');
  const radiusRange = document.getElementById('radius-range');
  const speedRange = document.getElementById('speed-range');
  const speedValue = document.getElementById('speed-value');
  const timeline = document.getElementById('timeline-range');
  const timeValue = document.getElementById('time-value');
  const takeStatus = document.getElementById('take-status');
  const playButton = document.getElementById('play-button');
  const replayButton = document.getElementById('replay-button');
  const liveButton = document.getElementById('live-button');
  const zoomValue = document.getElementById('zoom-value');
  const densityRange = document.getElementById('density-range');
  const densityValue = document.getElementById('density-value');
  const densityNote = document.getElementById('density-note');
  const birdSizeRange = document.getElementById('bird-size-range');
  const birdSizeValue = document.getElementById('bird-size-value');
  const doveCalmButton = document.getElementById('dove-calm');
  const doveWindButton = document.getElementById('dove-wind');
  const windValue = document.getElementById('wind-value');
  const radiusValue = document.getElementById('radius-value');
  const editTextButton = document.getElementById('edit-text');
  const editor = document.getElementById('text-editor');
  const panelToggle = document.getElementById('panel-toggle');
  const immersiveButton = document.getElementById('immersive-button');
  const exitImmersive = document.getElementById('exit-immersive');
  let panelCollapsed=false;
  const editorInput = document.getElementById('editor-input');
  const editorCount = document.getElementById('editor-count');
  const editorApply = document.getElementById('editor-apply');
  const editorClose = document.getElementById('editor-close');
  const editorCancel = document.getElementById('editor-cancel');
  const editorDefault = document.getElementById('editor-default');
  const gustButton = document.getElementById('gust-button');
  const resetButton = document.getElementById('reset-button');
  const status = document.getElementById('live-status');
  const messenger = document.getElementById('messenger');
  if (!sky || !paragraph || !canvas || !windRange || !radiusRange || !radiusValue || !speedRange || !speedValue || !timeline || !playButton || !replayButton || !liveButton || !resetButton || !densityRange || !densityValue || !birdSizeRange || !birdSizeValue || !doveCalmButton || !doveWindButton) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const original = paragraph.textContent.replace(/\s+/g,' ').trim();
  let currentText=original;
  const letters = [];
  const words = [];
  let baseWords=[],wordPool=[];
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'grapheme'}):null;
  const graphemes=text=>segmenter?Array.from(segmenter.segment(text),s=>s.segment):Array.from(text);
  function parseWords(text){
    const tokens=text.replace(/\r\n?/g,'\n').match(/[\p{Script=Han}]|[^\s\p{Script=Han}]+|[ \t]+|\n/gu)||[];
    const result=[];
    for(const token of tokens){
      if(token==='\n'){result.push({value:'',sep:'\n'});continue;}
      if(/^[ \t]+$/.test(token)){if(result.length&&result[result.length-1].sep!=='\n')result[result.length-1].sep=' ';continue;}
      result.push({value:token,sep:''});
    }
    return result.length?result:[{value:' ',sep:''}];
  }
  const MAX_GLYPHS=1500, MAX_COPIES=4;
  let density=+densityRange.value, maxCopies=MAX_COPIES, activeCount=0, visibleWords=-1;
  let birdSize=+birdSizeRange.value;
  let doveDisperses=true;
  let cachedFitWidth=0,cachedFitHeight=0;
  const effects = new Map();
  const stream = [];
  let lastEmission = 0;
  const masks = new Map();
  const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  const smooth = t => { t = clamp(t,0,1); return t*t*(3-2*t); };
  const random = v => { const f = Math.sin(v * 117.17 + 29.3) * 43758.5; return f - Math.floor(f); };
  let wind = +windRange.value;
  let chaosSpeed = +speedRange.value;
  let chaosClock=0, cameraZoom=1;
  // Record actual rendered simulation states, not a screen recording.
  // Retain only the latest three minutes; creation can continue indefinitely.
  const MAX_TAKE=180000, SAMPLE=67;
  const frames=[];
  let mode='live', playhead=0, lastSample=-Infinity, playbackLast=0;
  let simNow=performance.now();
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
    letters.length=0;words.length=0;visibleWords=-1;activeCount=0;
    baseWords=parseWords(currentText);
    // Repeat FULL copies of the author's text. Never cut off a copy to fit a slider value.
    // The range shrinks for very long texts instead of silently truncating the content.
    const perCopy=baseWords.reduce((n,token)=>n+graphemes(token.value).length,0);
    maxCopies=clamp(Math.floor(MAX_GLYPHS/Math.max(1,perCopy)),1,MAX_COPIES);
    densityRange.max=String(maxCopies);
    wordPool=[];
    for(let copy=0;copy<maxCopies;copy++){
      for(let i=0;i<baseWords.length;i++){
        const token=baseWords[i];
        const lastInCopy=i===baseWords.length-1;
        // A visual separator at copy boundaries; original punctuation and newlines remain intact.
        const sep=lastInCopy&&copy<maxCopies-1&&!token.sep?' ':token.sep;
        wordPool.push({value:token.value,sep});
      }
    }
    paragraph.textContent='';
    wordPool.forEach((token,wi,all)=>{
      const wordText=token.value;
      const word = document.createElement('span');
      word.className = 'word';
      const first=letters.length;
      for (const char of graphemes(wordText)) {
        const el = document.createElement('span');
        el.className = 'letter';
        el.textContent = char;
        el.dataset.char = char;
        el.dataset.index = String(letters.length);
        el.role = 'button';
        el.tabIndex = 0;
        el.setAttribute('aria-label', `吹散字母 ${char}`);
        const index = letters.length;
        letters.push({el,word,index,active:true,gone:false,x:0,y:0,
          biasX:(random(index*1.713)-.5)*2,biasY:(random(index*2.317)-.5)*2,
          zSeed:(random(index*3.199)-.5)*2,framePose:[0,0,0,0,0,0],
          gustX:0,gustY:0,gustZ:0,gustVX:0,gustVY:0,pressDose:0});
        word.append(el);
      }
      paragraph.append(word);
      const space=document.createElement('span');
      space.textContent=token.sep==='\n'?'':token.sep;
      space.className=token.sep==='\n'?'line-break':'word-gap';
      paragraph.append(space);
      words.push({word,space,first,end:letters.length});
    });
  }
  // Keep a stable indexed letter pool so density changes don't destroy dissolution history.
  // Use full words to avoid truncating glyph clusters or leaving broken word endings.
  function fitDensity(){
    const root=document.documentElement;
    const spread=clamp((density-1)/3,0,1);
    root.style.setProperty('--letter-area-width',(90+spread*7)+'vw');
    root.style.setProperty('--letter-area-max',(1080+spread*680)+'px');
    root.style.setProperty('--letter-text-max',(980+spread*710)+'px');
    const composition=paragraph.closest('.composition');
    const header=document.querySelector('.masthead'),footer=document.querySelector('.bottom-bar');
    let font=vw<=520?clamp(vw*.043,17,21):vw<=850?clamp(vw*.037,23,35):clamp(vw*.03,27,44);
    paragraph.style.fontSize=font+'px';
    if(composition&&header&&footer){
      const room=Math.max(130,vh-header.offsetHeight-footer.offsetHeight-22);
      for(let i=0;i<6&&composition.offsetHeight>room&&font>10;i++){
        font=Math.max(10,font*.88);
        paragraph.style.fontSize=font.toFixed(2)+'px';
      }
    }
    cachedFitWidth=vw;cachedFitHeight=vh;
    measure();
  }
  function applyDensity(value,force=false){
    const proposed=Number(value);
    density=clamp(Number.isFinite(proposed)?Math.round(proposed):1,1,maxCopies);
    densityRange.max=String(maxCopies);
    densityRange.value=String(density);
    densityRange.setAttribute('aria-valuetext',density+'份完整原文');
    const count=baseWords.length*density;
    if(force||count!==visibleWords){
      visibleWords=count;
      activeCount=words[count-1].end;
      for(let i=0;i<words.length;i++){
        const w=words[i],shown=i<count;
        w.word.hidden=!shown;w.space.hidden=!shown||i===count-1;
        for(let j=w.first;j<w.end;j++){
          const item=letters[j];item.active=shown;
          item.el.tabIndex=shown&&!item.gone&&mode==='live'?0:-1;
        }
      }
      fitDensity();
    }else if(cachedFitWidth!==vw||cachedFitHeight!==vh)fitDensity();
    densityValue.textContent=density+'×';
    densityNote.textContent=maxCopies<MAX_COPIES?
      '文字较长 · 最多完整重复 '+maxCopies+'×':
      '整段重复 · '+activeCount+' 个字形';
  }
  function applyBirdSize(value){
    birdSize=clamp(Number(value),30,180);
    document.documentElement.style.setProperty('--bird-size',birdSize+'px');
    birdSizeValue.textContent=birdSize+'px';
  }
  function setDoveDispersal(enabled){
    doveDisperses=Boolean(enabled);
    doveCalmButton.setAttribute('aria-pressed',String(!doveDisperses));
    doveWindButton.setAttribute('aria-pressed',String(doveDisperses));
    if(!doveDisperses){
      // Clear only the dissolve charge. Existing wind displacement continues smoothly.
      for(const item of letters)item.pressDose=0;
    }
    if(status)status.textContent=doveDisperses?'白鸽的气流会扰动并吹散云字。':'白鸽的气流会扰动云字，但不会使字母消失。';
  }
  doveCalmButton.addEventListener('click',()=>{if(mode==='live')setDoveDispersal(false);});
  doveWindButton.addEventListener('click',()=>{if(mode==='live')setDoveDispersal(true);});
  // Layout positions in the same coordinate system, regardless of each letter's animation transform.
  function measure() {
    for (const item of letters) {
      if(!item.active)continue;
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
    if(words.length)fitDensity();else measure();
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
    if (mode!=='live' || !item || !item.active || item.gone || effects.has(item.index)) return;
    if (reduced.matches) { item.gone=true; item.el.classList.add('gone'); item.el.tabIndex=-1; return; }
    const now = simNow;
    const {selected,rect} = glyphPoints(item, options.mass ? 14 : 55);
    const cx = rect.left+rect.width/2, cy=rect.top+rect.height/2;
    const particles=[]; const seed=item.index*11.37;
    const strength=options.flow ? .32+wind*.17 : 1.05;
    const flow=options.flow || {x:.96,y:-.27};
    const norm=Math.max(.001,Math.hypot(flow.x,flow.y));
    const flowX=flow.x/norm,flowY=flow.y/norm;
    for(let i=0;i<selected.length;i++){
      const pt=selected[i], r1=random(i*.79+seed),r2=random(i*2.13+seed),r3=random(i*3.3+seed);
      const drift=(110+r1*210)*strength;
      const dx=flowX*drift+(r2-.5)*34;
      const dy=flowY*drift+(r2-.5)*(85+Math.min(2.5,chaosClock/35000)*80);
      particles.push({x:cx+pt.x,y:cy+pt.y,dx,dy,depth:(r3-.62)*210,
        curl:(r2-.5)*85,phase:r1*6.283,radius:3.5+r2*7.0,alpha:.35+r3*.48,
        soft:r3>.55});
    }
    for(let i=0;i<Math.min(12,Math.ceil(selected.length*.32));i++){
      const base=particles[(i*5)%particles.length];
      particles.push({...base,radius:17+random(i+seed)*19,alpha:.08+random(i*2.7+seed)*.13,soft:true});
    }
    effects.set(item.index,{item,start:now+(options.delay||0),duration:2200+random(seed)*1100,particles,hidden:false,zoom:cameraZoom});
  }
  function gust() {
    if (mode!=='live' || gusting) return;
    gusting=true;
    const available=letters.filter(x=>x.active&&!x.gone&&!effects.has(x.index));
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
      if(!item.active || item.gone || effects.has(item.index)) continue;
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
    if (mode!=='live' || press.active || !e.isPrimary || (e.pointerType==='mouse' && e.button!==0)) return;
    if(e.target.closest?.('.bottom-bar,.masthead,button,input,label')) return;
    press.active=true; press.id=e.pointerId;
    press.downX=press.lastX=press.x=e.clientX;
    press.downY=press.lastY=press.y=e.clientY;
    press.downAt=simNow;press.lastAt=performance.now();
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
        field.strength=(.32+2.2*smooth((held-180)/1250))*wind/4;
        // The slider controls both the wake width and the local wind reach.
        field.radius=radiusSetting;
      }
    } else {
      const fade=Math.exp(-dt*.0034);
      field.strength*=fade;
      field.x+=field.dirX*dt*.022*field.strength;
      field.y+=field.dirY*dt*.022*field.strength;
      if(field.strength<.012)field.strength=0;
    }
    if(messenger){
      const visible=!reduced.matches && ((press.active&&press.triggered)||field.strength>.012);
      messenger.style.opacity=visible?String(press.active&&press.triggered?1:Math.min(1,field.strength*1.3)):'0';
      if(visible){
        const angle=Math.atan2(field.dirY,field.dirX)*180/Math.PI;
        const flip=field.dirX<0;
        const tilt=flip?angle-(angle>0?180:-180):angle;
        const w=birdSize,h=birdSize*.625;
        const bank=clamp(field.dirY*25,-24,24);
        const yaw=clamp(field.dirY*17+Math.sin(now*.004)*5,-22,22);
        // Wing-driven flight path: even a stationary hold glides and bobs instead of pinning a sticker to the cursor.
        const phase=now*(.0095+wind*.00022);
        const flutter=clamp(3.2+birdSize*.038,3.5,10.5);
        const glideX=Math.cos(phase*.48)*flutter*.65+field.dirX*Math.min(11,wind*.48);
        const glideY=Math.sin(phase-.8)*flutter;
        const roll=Math.sin(phase*.5)*4.6;
        messenger.style.transform=`translate3d(${(field.x-w/2+glideX).toFixed(1)}px,${(field.y-h/2+glideY).toFixed(1)}px,0) perspective(260px) rotateZ(${(tilt+roll).toFixed(1)}deg) scaleX(${flip?-1:1}) rotateX(${bank.toFixed(1)}deg) rotateY(${yaw.toFixed(1)}deg)`;
      }
    }
    // Articulated wingbeat + subtle opposing wing, tail, neck and envelope lag.
    // These values are captured in each timeline frame for deterministic scrubbing.
    const beat=now*(.0095+wind*.00022);
    const wingLift=Math.sin(beat);
    const docRoot=document.documentElement;
    docRoot.style.setProperty('--wing-angle',`${(-8+wingLift*38).toFixed(2)}deg`);
    docRoot.style.setProperty('--far-wing-angle',`${(7-Math.sin(beat+.68)*29).toFixed(2)}deg`);
    docRoot.style.setProperty('--tail-angle',`${(Math.sin(beat*.64+1)*9).toFixed(2)}deg`);
    docRoot.style.setProperty('--head-angle',`${(Math.sin(beat*.54-1)*3.6).toFixed(2)}deg`);
    docRoot.style.setProperty('--envelope-angle',`${(Math.sin(beat-.95)*11).toFixed(2)}deg`);
    docRoot.style.setProperty('--bird-bob',`${(Math.sin(beat-.8)*2.6).toFixed(2)}px`);
    if(field.strength>.04 && !reduced.matches && now-lastEmission>Math.max(46,86-wind*1.5)){
      stream.push({x:field.x,y:field.y,dx:field.dirX,dy:field.dirY,r:field.radius,power:Math.min(1,field.strength),speed:wind,start:now});
      lastEmission=now;
      if(stream.length>40)stream.shift();
    }
    // BOTH modes apply directional force to letters. Only the dissolve charge is mode-dependent.
    if(field.strength<=0 && !press.active){
      for(const item of letters)item.pressDose=Math.max(0,item.pressDose-seconds*.45);
      return;
    }
    for(const item of letters) {
      if(!item.active||item.gone||effects.has(item.index)) continue;
      const bounds=item.el.getBoundingClientRect();
      const dx=(bounds.left+bounds.width/2)-field.x;
      const dy=(bounds.top+bounds.height/2)-field.y;
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
      if(doveDisperses && press.active && press.triggered && influence>0) {
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
    // Empty sky is safe: a full-scene gust requires its explicit button.
    return;
  });
  // A fading directional wake, rather than a circular UI indicator.
  // Vapor wake: elongated soft sprites have no strokes, rings, or hard boundaries.
  // All samples depend only on their saved birth time and direction, so seeking is deterministic.
  function drawStream(now,history=stream) {
    for(let i=history.length-1;i>=0;i--){
      const s=history[i],t=(now-s.start)/1300;
      if(t>=1){if(history===stream)stream.splice(i,1);continue;}
      if(t<0)continue;
      const fade=smooth(t/.12)*Math.pow(1-t,1.85)*s.power;
      const nx=-s.dy,ny=s.dx;
      const speed=s.speed??4;
      const angle=Math.atan2(s.dy,s.dx);
      for(let k=0;k<4;k++){
        const seed=s.start*.017+k*7.13;
        const spread=(random(seed)-.5)*s.r*(.14+.37*t);
        const drift=20+t*(58+speed*5)+(k+random(seed+2))*Math.min(23,s.r*.105);
        const curl=Math.sin(t*4+k*1.9+s.start*.002)*s.r*.06*t;
        const x=s.x-s.dx*drift+nx*(spread+curl);
        const y=s.y-s.dy*drift+ny*(spread+curl);
        const length=(24+s.r*.34)*(1+t*.7)*( .7+random(seed+5)*.5);
        const width=(6+s.r*.072)*(1+t*1.1);
        ctx.save();
        ctx.translate(x,y);
        ctx.rotate(angle+Math.sin(seed+t*3)*.15);
        ctx.globalAlpha=fade*(.045+random(seed+3)*.025);
        ctx.drawImage(mistStrand,-length/2,-width/2,length,width);
        ctx.restore();
      }
    }
    ctx.globalAlpha=1;
  }
  function particlesFrame(now,snapshot=null) {
    ctx.clearRect(0,0,vw,vh);
    drawStream(now,snapshot?snapshot.stream:stream);
    const px=vw*.5,py=vh*.5;
    const bounds=paragraph.closest('.composition').getBoundingClientRect();
    const anchorX=bounds.left+bounds.width/2,anchorY=bounds.top+bounds.height/2;
    for (const [key,effect] of (snapshot?snapshot.effects:effects)) {
      const age=now-effect.start;
      if(age<0)continue;
      if(!snapshot && !effect.hidden) {
        effect.hidden=true; effect.item.gone=true;
        effect.item.el.classList.add('gone'); effect.item.el.tabIndex=-1;
      }
      const t=age/effect.duration;
      if(t>=1) {if(!snapshot)effects.delete(key);continue;}
      const e=smooth(t), alpha=Math.pow(1-e,.7);
      for(const p of effect.particles){
        const depth=p.depth*e;
        const perspective=clamp(900/(900-depth),.75,1.35);
        const cx=p.x+p.dx*e+Math.sin(now*.0011+p.phase+e*4)*p.curl*e;
        const cy=p.y+p.dy*e+Math.cos(now*.0009+p.phase)*19*e;
        const ratio=cameraZoom/(effect.zoom||1);
        const x=anchorX+(px+(cx-px)*perspective-anchorX)*ratio;
        const y=anchorY+(py+(cy-py)*perspective-anchorY)*ratio;
        const radius=p.radius*(1+e*(p.soft?1.85:1.20))*perspective*ratio;
        ctx.globalAlpha=p.alpha*alpha*(p.soft?.74:1);
        ctx.drawImage(p.soft?mistStrand:mistDot,x-radius,y-radius,radius*2,radius*2);
      }
    }
    ctx.globalAlpha=1;
  }
  function applyZoom(value) {
    cameraZoom=clamp(value,.65,1.85);
    document.documentElement.style.setProperty('--camera-zoom',cameraZoom.toFixed(3));
    zoomValue.textContent=Math.round(cameraZoom*100)+'%';
  }
  function formatTime(ms){const sec=Math.floor(ms/1000);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
  function syncTransport(){
    const duration=frames.length?frames[frames.length-1].t:0;
    timeline.min=String(Math.round(frames.length?frames[0].t:0));
    timeline.max=String(Math.round(duration));
    timeline.value=String(Math.round(mode==='live'?duration:playhead));
    timeValue.textContent=formatTime(mode==='live'?duration:playhead)+' / '+formatTime(duration);
    takeStatus.textContent=mode==='live'?'● 记录最近3分钟':mode==='replay'?'▶ 正在回放':'Ⅱ 暂停 · 可拖动时间轴';
    playButton.textContent=mode==='live'||mode==='replay'?'Ⅱ 暂停':'▶ 播放';
    liveButton.disabled=mode==='live';
    replayButton.disabled=frames.length<2;
    playButton.disabled=mode==='paused'&&frames.length<2;
    for(const el of [windRange,speedRange,radiusRange,densityRange,birdSizeRange,doveCalmButton,doveWindButton,gustButton,document.getElementById('zoom-in'),document.getElementById('zoom-out')])el.disabled=mode!=='live';
  }
  function capture(force=false){
    const t=Math.max(0,simNow-start);
    // Adapt snapshot frequency to the number of visible glyphs.
    const sampleInterval=activeCount>=900?160:activeCount>=600?110:SAMPLE;
    if(!force&&t-lastSample<sampleInterval)return;
    lastSample=t;
    const poses=new Float32Array(activeCount*6);
    for(let i=0;i<activeCount;i++)poses.set(letters[i].framePose,i*6);
    frames.push({t,now:simNow,zoom:cameraZoom,poses,gone:Uint8Array.from(letters.slice(0,activeCount),i=>+i.gone),effects:Array.from(effects),stream:stream.slice(),
      birdTransform:messenger.style.transform,birdOpacity:messenger.style.opacity,
      pose:['--wing-angle','--far-wing-angle','--tail-angle','--head-angle','--envelope-angle','--bird-bob'].map(name=>document.documentElement.style.getPropertyValue(name)),
      controls:[windRange.value,speedRange.value,radiusRange.value,densityRange.value,birdSizeRange.value,doveDisperses?1:0]});
    while(frames.length>1&&frames[0].t<t-MAX_TAKE)frames.shift();
    syncTransport();
  }
  function showFrame(frame,interactive=false){
    if(!frame)return;
    applyZoom(frame.zoom);
    applyDensity(frame.controls[3]);
    applyBirdSize(frame.controls[4]);
    // Playback restores the recorded mode without modifying the historical glyph transforms.
    doveDisperses=Boolean(Number(frame.controls[5]));
    doveCalmButton.setAttribute('aria-pressed',String(!doveDisperses));
    doveWindButton.setAttribute('aria-pressed',String(doveDisperses));
    for(let i=0;i<activeCount;i++){
      const el=letters[i].el,b=i*6,p=frame.poses;
      el.style.transform=p&&p.length>=b+6?`translate3d(${p[b].toFixed(1)}px,${p[b+1].toFixed(1)}px,${p[b+2].toFixed(1)}px) rotateX(${p[b+3].toFixed(1)}deg) rotateY(${p[b+4].toFixed(1)}deg) rotateZ(${p[b+5].toFixed(1)}deg)`:'';
      el.classList.toggle('gone',!!frame.gone[i]);el.tabIndex=interactive&&!frame.gone[i]?0:-1;
    }
    messenger.style.transform=frame.birdTransform;messenger.style.opacity=frame.birdOpacity;
    const poseKeys=['--wing-angle','--far-wing-angle','--tail-angle','--head-angle','--envelope-angle','--bird-bob'];
    if(frame.pose)poseKeys.forEach((name,i)=>document.documentElement.style.setProperty(name,frame.pose[i]));
    [windRange,speedRange,radiusRange,densityRange,birdSizeRange].forEach((el,i)=>el.value=frame.controls[i]);
    windValue.textContent=windRange.value;speedValue.textContent=Number(speedRange.value).toFixed(1)+'×';radiusValue.textContent=radiusRange.value;
    particlesFrame(frame.now,frame);
  }
  function frameAt(time){
    let lo=0,hi=frames.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].t<=time)lo=mid;else hi=mid-1;}
    return frames[lo];
  }
  function freeze(){
    if(mode==='live'){press.active=false;press.id=null;capture(true);playhead=frames[frames.length-1].t;}
    mode='paused';document.documentElement.classList.add('take-paused');showFrame(frameAt(playhead));syncTransport();
  }
  function playback(fromStart=false){
    if(mode==='live')freeze();
    if(frames.length<2)return;
    const end=frames[frames.length-1].t;
    if(fromStart||playhead>=end-1)playhead=frames[0].t;
    mode='replay';playbackLast=performance.now();showFrame(frameAt(playhead));syncTransport();
  }
  function readControls(){wind=+windRange.value;chaosSpeed=+speedRange.value;radiusSetting=+radiusRange.value;field.radius=radiusSetting;}
  function returnLive(){
    if(mode==='live'||!frames.length)return;
    const tail=frames[frames.length-1];showFrame(tail,true);readControls();
    for(const item of letters){item.el.classList.toggle('gone',item.gone);item.el.tabIndex=item.active&&!item.gone?0:-1;}
    playhead=tail.t;mode='live';document.documentElement.classList.remove('take-paused');previousTick=performance.now();syncTransport();
  }
  timeline.addEventListener('input',()=>{const wanted=Number(timeline.value);if(mode==='live')freeze();mode='paused';playhead=clamp(wanted,0,frames[frames.length-1]?.t||0);showFrame(frameAt(playhead));syncTransport();});
  playButton.addEventListener('click',()=>{if(mode==='live'||mode==='replay')freeze();else playback();});
  replayButton.addEventListener('click',()=>playback(true));
  liveButton.addEventListener('click',returnLive);
  document.getElementById('zoom-in').addEventListener('click',()=>{if(mode==='live')applyZoom(cameraZoom+.1);});
  document.getElementById('zoom-out').addEventListener('click',()=>{if(mode==='live')applyZoom(cameraZoom-.1);});
  sky.addEventListener('wheel',ev=>{
    if(ev.target.closest?.('.bottom-bar,.masthead')||ev.ctrlKey||mode!=='live')return;
    ev.preventDefault();const dy=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?vh:1);
    applyZoom(cameraZoom*Math.exp(-clamp(dy,-350,350)*.0014));
  },{passive:false});
  function animate(realNow) {
    const dt=clamp(realNow-previousTick,0,45);previousTick=realNow;
    if(mode==='replay'&&!document.hidden){
      const elapsed=clamp(realNow-playbackLast,0,100);playbackLast=realNow;
      playhead=Math.min(frames[frames.length-1].t,playhead+elapsed);
      showFrame(frameAt(playhead));
      if(playhead>=frames[frames.length-1].t)mode='paused';
      syncTransport();
    }
    if(mode==='live'&&!document.hidden) {
      simNow+=dt;const now=simNow;
      chaosClock+=dt*chaosSpeed;
      updateLocalWind(now,dt);
      const elapsed=now-start;
      const chaos=2.8*(1-Math.exp(-chaosClock/42000));
      const calm=.10+.90*smooth((elapsed-900)/12000);
      const stageScale=clamp(vw/1080,.42,1);
      const breeze=stageScale;
      const motionTime=chaosClock;
      if(reduced.matches){
        for(const item of letters) if(item.active&&!item.gone) item.el.style.transform='';
      } else {
        for (const item of letters) {
          if(!item.active||item.gone||effects.has(item.index)) continue;
          motionImpulse(item,dt);
          const x=item.x*.012,y=item.y*.011,k=item.index;
          const sharedX = Math.sin(elapsed*.00026+x*.45+y*.18)*9 + Math.sin(elapsed*.00013+x*.33)*8;
          const sharedY = Math.cos(elapsed*.00024+y*.37+x*.18)*5;
          const dx=(sharedX + Math.sin(elapsed*.00037+x+k*.12)*5 + (item.biasX*49+Math.sin(motionTime*.00014+k*.17)*21)*chaos)*breeze;
          const dy=(sharedY + Math.sin(elapsed*.00033+y+k*.1)*5 + (item.biasY*42+Math.cos(motionTime*.00016+k*.19)*19)*chaos)*breeze;
          const z=(item.zSeed*12 + Math.sin(elapsed*.00025+x*.41+k*.08)*9 + item.zSeed*55*chaos)*breeze;
          const rz=(Math.sin(elapsed*.0002+k*.13)*1.3+item.biasX*28*chaos)*breeze;
          const rx=(item.biasY*8*chaos+Math.sin(elapsed*.00024+k*.18)*2)*breeze;
          const ry=(item.zSeed*12*chaos+Math.cos(elapsed*.00019+k*.12)*3)*breeze;
          const px=dx+item.gustX,py=dy+item.gustY,pz=z+item.gustZ;
          const impulseAngle=clamp(item.gustVX*.022,-11,11);
          item.framePose=[px,py,pz,rx,ry,rz+impulseAngle];
          item.el.style.transform=`translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${pz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${(rz+impulseAngle).toFixed(1)}deg)`;
        }
      }
      if (effects.size || stream.length) particlesFrame(now);
      capture();
      // Rolling replay buffer; never stop the live artwork at three minutes.
    }
    requestAnimationFrame(animate);
  }
  windRange.addEventListener('input',()=>{wind=+windRange.value;windValue.textContent=String(wind);});
  speedRange.addEventListener('input',()=>{chaosSpeed=+speedRange.value;speedValue.textContent=chaosSpeed.toFixed(1)+'×';});
  radiusRange.addEventListener('input',()=>{radiusSetting=+radiusRange.value;field.radius=radiusSetting;radiusValue.textContent=String(radiusSetting);});
  densityRange.addEventListener('input',()=>{if(mode==='live')applyDensity(densityRange.value);});
  birdSizeRange.addEventListener('input',()=>{if(mode==='live')applyBirdSize(birdSizeRange.value);});
  function setPanelCollapsed(value){
    panelCollapsed=Boolean(value);sky.classList.toggle('panel-collapsed',panelCollapsed);
    panelToggle.textContent=panelCollapsed?'⌄ 展开参数':'⌃ 收起参数';
    panelToggle.setAttribute('aria-expanded',String(!panelCollapsed));
    requestAnimationFrame(()=>fitDensity());
  }
  function setImmersive(value){
    sky.classList.toggle('immersive',Boolean(value));
    exitImmersive.tabIndex=value?0:-1;
    requestAnimationFrame(()=>fitDensity());
  }
  panelToggle.addEventListener('click',()=>setPanelCollapsed(!panelCollapsed));
  immersiveButton.addEventListener('click',()=>setImmersive(true));
  exitImmersive.addEventListener('click',()=>setImmersive(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sky.classList.contains('immersive'))setImmersive(false);});
  const updateEditorCount=()=>{editorCount.textContent=graphemes(editorInput.value).length+' / 1200';};
  function closeEditor(){editor.hidden=true;editTextButton.focus();}
  editTextButton.addEventListener('click',()=>{if(mode!=='live')return;editorInput.value=currentText;editor.hidden=false;updateEditorCount();editorInput.focus();});
  editorClose.addEventListener('click',closeEditor);
  editorCancel.addEventListener('click',closeEditor);
  editorDefault.addEventListener('click',()=>{editorInput.value=original;updateEditorCount();});
  editorInput.addEventListener('input',updateEditorCount);
  editor.addEventListener('pointerdown',e=>e.stopPropagation());
  editor.addEventListener('click',e=>{if(e.target===editor)closeEditor();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!editor.hidden)closeEditor();});
  editorApply.addEventListener('click',()=>{
    const next=editorInput.value.trim();
    if(!next||graphemes(next).length>1200){editorInput.focus();return;}
    closeEditor();if(next===currentText)return;
    currentText=next;effects.clear();stream.length=0;
    build();applyDensity(densityRange.value,true);
    resetButton.click();
    if(status)status.textContent='已更新天空文案，新一轮创作开始。';
  });
  resetButton.addEventListener('click',()=>{
    effects.clear();gusting=false;mode='live';document.documentElement.classList.remove('take-paused');readControls();start=simNow;chaosClock=0;frames.length=0;lastSample=-Infinity;playhead=0;previousTick=performance.now();
    press.active=false;press.id=null;field.strength=0;field.x=-1000;field.y=-1000;
    stream.length=0; lastEmission=0;
    if(messenger)messenger.style.opacity='0';
    for(const item of letters){item.gone=false;item.el.classList.remove('gone');item.el.tabIndex=item.active?0:-1;item.el.style.transform='';item.framePose=[0,0,0,0,0,0];item.gustX=item.gustY=item.gustZ=item.gustVX=item.gustVY=item.pressDose=0;}
    ctx.clearRect(0,0,vw,vh);applyZoom(cameraZoom);capture(true);if(status)status.textContent='新一轮开始，所有字母已恢复。';
  });
  window.addEventListener('resize',resize,{passive:true});
  reduced.addEventListener?.('change',()=>{field.strength=0;});
  document.addEventListener('visibilitychange',()=>{previousTick=performance.now();if(document.hidden){press.active=false;press.id=null;field.strength=0;stream.length=0;ctx.clearRect(0,0,vw,vh);if(messenger)messenger.style.opacity='0';}});
  // Scene controls for the companion export module.
  window.CloudMotionLab={
    getFrames:()=>frames,
    getScene:()=>({sky,letters,canvas,messenger,paragraph,currentText,original}),
    getState:()=>({mode,playhead}),
    freeze:()=>freeze(),
    seek:t=>{const f=frameAt(t);showFrame(f);return f;},
    restoreState:state=>{
      if(state.mode==='live')returnLive();
      else {mode='paused';playhead=state.playhead;showFrame(frameAt(playhead));syncTransport();}
    },
    getConfig:()=>({version:2,text:currentText,wind:+windRange.value,speed:+speedRange.value,radius:+radiusRange.value,density:+densityRange.value,birdSize:+birdSizeRange.value,doveDisperses,zoom:cameraZoom}),
    applyConfig:cfg=>{
      if(!cfg||typeof cfg!=='object')return false;
      currentText=typeof cfg.text==='string'&&cfg.text.trim()&&graphemes(cfg.text.trim()).length<=1200?cfg.text.trim():currentText;
      effects.clear();stream.length=0;build();
      // Migrate v2.4 saved percent values (100–300%) to whole-copy multipliers.
      const loadedDensity=Number(cfg.density);
      const repeats=Number.isFinite(loadedDensity)?
        (cfg.version===1||loadedDensity>MAX_COPIES?Math.round(loadedDensity/100):Math.round(loadedDensity)):1;
      [[windRange,cfg.wind],[speedRange,cfg.speed],[radiusRange,cfg.radius],[densityRange,repeats],[birdSizeRange,cfg.birdSize]].forEach(([input,value])=>{
        if(Number.isFinite(Number(value)))input.value=String(clamp(Number(value),+input.min,+input.max));
      });
      windValue.textContent=windRange.value;speedValue.textContent=(+speedRange.value).toFixed(1)+'×';radiusValue.textContent=radiusRange.value;
      applyDensity(densityRange.value,true);applyBirdSize(birdSizeRange.value);
      setDoveDispersal(cfg.doveDisperses!==false);
      readControls();applyZoom(Number.isFinite(+cfg.zoom)?+cfg.zoom:1);
      resetButton.click();return true;
    }
  };
  exitImmersive.tabIndex=-1;
  build(); applyDensity(densityRange.value,true);applyBirdSize(birdSizeRange.value);resize();start=simNow;
  windValue.textContent=String(wind);
  speedValue.textContent=chaosSpeed.toFixed(1)+'×';
  radiusValue.textContent=String(radiusSetting);
  setDoveDispersal(true);applyZoom(1);capture(true);
  requestAnimationFrame(animate);
})();
