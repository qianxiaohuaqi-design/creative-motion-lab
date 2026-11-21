/**
 * Cloud Typography v1.1 | Creative Motion Lab
 * Every letter is an independent DOM object. No build tools or external libraries.
 * Coherent time-based wind gradually disrupts the paragraph; clicking a letter
 * turns its sampled glyph into drifting, fading cloud-wisps forever (until reset).
 */
(() => {
  'use strict';
  const sky = document.getElementById('sky');
  const paragraph = document.getElementById('cloud-text');
  const canvas = document.getElementById('mist-canvas');
  const windRange = document.getElementById('wind-range');
  const chaosRange = document.getElementById('chaos-range');
  const windValue = document.getElementById('wind-value');
  const chaosValue = document.getElementById('chaos-value');
  const reset = document.getElementById('reset-button');
  const gustButton = document.getElementById('gust-button');
  const status = document.getElementById('live-status');
  if (!sky || !paragraph || !canvas || !windRange || !chaosRange || !reset) return;
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const original = paragraph.textContent.trim().replace(/\s+/g, ' ');
  const letters = [];
  const effects = new Map();
  const maskCache = new Map();
  const pseudo = n => { const t = Math.sin(n * 81.271 + 17.33) * 43758.5453; return t - Math.floor(t); };
  const clamp = (n,a,b) => Math.min(b, Math.max(a,n));
  const ease = n => { n = clamp(n,0,1); return n*n*(3-2*n); };
  let wind = Number(windRange.value);
  let disorder = Number(chaosRange.value)/100;
  let begin = performance.now(), start = begin, lastFrame = begin;
  let canvasWidth = 0, canvasHeight = 0, dpr = 1;
  let rafId = 0;
  let gusting = false;
  let spoken = 0;

  function buildLetters() {
    paragraph.textContent = '';
    original.split(' ').forEach((wordText, wi, all) => {
      const word = document.createElement('span');
      word.className = 'word';
      for (const symbol of wordText) {
        const node = document.createElement('span');
        node.className = 'letter';
        node.textContent = symbol;
        node.dataset.char = symbol;
        node.dataset.index = String(letters.length);
        node.tabIndex = 0;
        node.setAttribute('role','button');
        node.setAttribute('aria-label', `吹散字母 ${symbol}`);
        const item = {element:node,index:letters.length, gone:false, x:0,y:0,randX:(pseudo(letters.length*1.7)-.5)*2,randY:(pseudo(letters.length*2.3)-.5)*2};
        letters.push(item);
        word.append(node);
      }
      paragraph.append(word);
      if (wi < all.length-1) paragraph.append(document.createTextNode(' '));
    });
    measure();
  }

  function measure() {
    for (const item of letters) {
      // Width/height are layout dimensions, unaffected by CSS transform.
      const el = item.element;
      const word = el.parentElement;
      item.x = word.offsetLeft + el.offsetLeft + el.offsetWidth / 2;
      item.y = word.offsetTop + el.offsetTop + el.offsetHeight / 2;
    }
  }
  function resize() {
    canvasWidth = window.innerWidth; canvasHeight=window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1,1.65);
    canvas.width = Math.max(1,Math.round(canvasWidth*dpr));
    canvas.height = Math.max(1,Math.round(canvasHeight*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    measure();
  }

  function makeSprite(wide=false) {
    const c=document.createElement('canvas'); c.width=128; c.height=128;
    const g=c.getContext('2d');
    if (wide) {
      g.save(); g.translate(64,64); g.scale(1.6,.58);
      const grad=g.createRadialGradient(0,0,0,0,0,48);
      grad.addColorStop(0,'rgba(255,255,255,.80)');
      grad.addColorStop(.3,'rgba(247,249,246,.33)');
      grad.addColorStop(.7,'rgba(250,252,255,.10)');
      grad.addColorStop(1,'rgba(237,243,240,0)');
      g.fillStyle=grad; g.fillRect(-64,-64,128,128);g.restore();
    } else {
      const grad=g.createRadialGradient(64,64,1,64,64,62);
      grad.addColorStop(0,'rgba(250,251,248,.91)');
      grad.addColorStop(.17,'rgba(251,251,247,.62)');
      grad.addColorStop(.44,'rgba(242,246,241,.28)');
      grad.addColorStop(.77,'rgba(236,243,240,.075)');
      grad.addColorStop(1,'rgba(236,243,240,0)');
      g.fillStyle=grad;g.fillRect(0,0,128,128);
    }
    return c;
  }
  const cloudDot=makeSprite(), cloudWisp=makeSprite(true);

  function sampleGlyph(item, limit) {
    const element=item.element;
    const rect=element.getBoundingClientRect();
    const style=getComputedStyle(element);
    const fontKey=`${element.textContent}|${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${Math.round(rect.width)}x${Math.round(rect.height)}`;
    let template=maskCache.get(fontKey);
    if (!template) {
      const scale=1.25, w=Math.max(5,Math.ceil(rect.width*scale)),h=Math.max(5,Math.ceil(rect.height*scale));
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const g=c.getContext('2d',{willReadFrequently:true});
      g.scale(scale,scale);
      g.fillStyle='white';
      g.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      g.textAlign='center';g.textBaseline='middle';
      g.fillText(element.textContent,rect.width/2,rect.height/2 - rect.height*.01);
      const data=g.getImageData(0,0,w,h).data;
      const points=[];
      for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){
        if(data[(y*w+x)*4+3]>90)points.push({x:x/scale-rect.width/2,y:y/scale-rect.height/2});
      }
      template=points;
      maskCache.set(fontKey,template);
    }
    if (!template.length) template=[{x:0,y:0}];
    const selected=[];
    const count=Math.min(limit,template.length);
    const stride=template.length/count;
    for(let j=0;j<count;j++)selected.push(template[Math.floor(j*stride)]);
    return {points:selected,rect};
  }

  function dissolve(item, options={}) {
    if(item.gone || effects.has(item.index))return;
    const now=performance.now();
    if(reduced.matches){
      item.gone=true; item.element.classList.add('gone'); item.element.tabIndex=-1;
      return;
    }
    const particles=[];
    const {points,rect}=sampleGlyph(item,options.mass?20:65);
    const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
    const seed=item.index*12.48+3;
    for(let i=0;i<points.length;i++){
      const p=points[i];
      const rand=pseudo(i*.713+seed),r2=pseudo(i*1.91+seed),r3=pseudo(i*3.21+seed);
      const v=.5+rand*1.3;
      particles.push({
        x0:cx+p.x,y0:cy+p.y,
        drift:(75+rand*180)*(0.7+wind*.20)*v,
        rise:(r2-.48)*(90+disorder*160),
        curl:(r3-.5)*55,phase:rand*6.283,
        radius:4.5+r2*8.4,
        alpha:.27+r3*.45,
        speed:.70+r2*.48,
        wisp:r3>.45
      });
    }
    // Sparse, larger cloud wisps keep the motion closer to vapor than glitter.
    for(let i=0;i<Math.max(6,Math.floor(points.length*.26));i++){
      const source=particles[(i*7)%Math.max(1,particles.length)];
      if(!source)continue;
      particles.push({...source, radius:21+pseudo(i+seed)*24,alpha:.09+pseudo(i*.6+seed)*.09,drift:source.drift*1.15,wisp:true});
    }
    effects.set(item.index,{item,start:now+(options.delay||0),particles,duration:2100+pseudo(seed)*1050,hidden:false});
  }

  function scatterAll() {
    if(gusting)return;
    gusting=true;
    const visible=letters.filter(x=>!x.gone && !effects.has(x.index));
    visible.forEach((item,i)=>dissolve(item,{mass:true,delay:i*24+pseudo(item.index)*250}));
    status.textContent='一阵风穿过文字，字母正向天空各处散去。';
    window.setTimeout(()=>{gusting=false;},700);
  }

  paragraph.addEventListener('click',ev=>{
    const el=ev.target.closest('.letter');
    if(!el)return;
    const item=letters[Number(el.dataset.index)];
    dissolve(item);
    const now=performance.now();
    if(now-spoken>700){status.textContent=`字母 ${el.dataset.char} 被风吹走，不会自动回来。`;spoken=now;}
    ev.stopPropagation();
  });
  paragraph.addEventListener('keydown',ev=>{
    if(ev.key!=='Enter' && ev.key!==' ')return;
    const el=ev.target.closest('.letter');
    if(!el)return;
    ev.preventDefault();ev.stopPropagation();
    const item=letters[Number(el.dataset.index)];
    dissolve(item);
  });
  // The optional gust button may be absent in some layouts; sky click still triggers a gust.
  gustButton?.addEventListener('click', scatterAll);
  // Projected 3D glyphs can miss browser hit-testing by a few pixels.
  // A spatial fallback ensures individual letters remain reliably clickable.
  function nearestLetter(x,y){
    let best=null,score=Infinity;
    for(const item of letters){
      if(item.gone||effects.has(item.index))continue;
      const r=item.element.getBoundingClientRect();
      if(x<r.left-4||x>r.right+4||y<r.top-4||y>r.bottom+4)continue;
      const dx=(x-(r.left+r.right)/2)/Math.max(10,r.width);
      const dy=(y-(r.top+r.bottom)/2)/Math.max(10,r.height);
      if(dx*dx+dy*dy<score){score=dx*dx+dy*dy;best=item;}
    }
    return best;
  }
  sky.addEventListener('click',ev=>{
    if(ev.target.closest?.('.masthead,.bottom-bar'))return;
    const nearest=nearestLetter(ev.clientX,ev.clientY);
    if(nearest){dissolve(nearest);return;}
    if(ev.target.closest?.('.composition'))return;
    scatterAll();
  });

  function drawClouds(now) {
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    for(const [key,effect] of effects) {
      const age=now-effect.start;
      if(age<0)continue;
      if(!effect.hidden){
        effect.hidden=true;
        effect.item.gone=true;
        effect.item.element.classList.add('gone');
        effect.item.element.tabIndex=-1;
      }
      const t=age/effect.duration;
      if(t>=1){effects.delete(key);continue;}
      const progression=ease(t);
      const windShift=progression*(.50+wind*.20);
      const haze=Math.pow(1-progression,.68);
      for(const p of effect.particles){
        const px=p.x0+p.drift*windShift + Math.sin(now*.0012+p.phase+progression*4)*p.curl*progression;
        const py=p.y0+p.rise*progression+Math.cos(now*.0009+p.phase)*22*progression;
        const radius=p.radius*(1+progression*(p.wisp?2.25:1.25));
        ctx.globalAlpha=p.alpha*haze*(p.wisp?.76:1);
        ctx.drawImage(p.wisp?cloudWisp:cloudDot,px-radius,py-radius,radius*2,radius*2);
      }
    }
    ctx.globalAlpha=1;
  }

  function animate(now) {
    if(!document.hidden){
      const time=now-begin;
      const entropy=disorder*ease((time-3300)/30000);
      const calm=.10+.90*ease((time-900)/15000);
      const mobileScale=clamp(canvasWidth/1080,.42,1);
      const breeze=(wind/3)*mobileScale;
      if(reduced.matches){
        for(const item of letters)if(!item.gone)item.element.style.transform='';
      }else{
        for(const item of letters){
          if(item.gone||effects.has(item.index))continue;
          const k=item.index,x=item.x*.012,y=item.y*.011;
          const sharedX=Math.sin(time*.00026+x*.45+y*.18)*9+Math.sin(time*.00013+x*.33)*8;
          const sharedY=Math.cos(time*.00024+y*.37+x*.18)*5;
          const dx=(sharedX+Math.sin(time*.00037+x+k*.12)*5+(item.randX*49+Math.sin(time*.00014+k*.17)*17)*entropy)*breeze*calm;
          const dy=(sharedY+Math.sin(time*.00033+y+k*.1)*5+(item.randY*42+Math.cos(time*.00016+k*.19)*15)*entropy)*breeze*calm;
          const depth=(item.randX*12+Math.sin(time*.00025+x*.41+k*.08)*9+item.randX*55*entropy)*breeze*calm;
          const rz=(Math.sin(time*.0002+k*.13)*1.3+item.randX*20*entropy)*breeze*calm;
          const rx=(item.randY*6*entropy+Math.sin(time*.00024+k*.18)*2)*breeze*calm;
          const ry=(item.randX*10*entropy+Math.cos(time*.00019+k*.12)*3)*breeze*calm;
          item.element.style.transform=`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,${depth.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg)`;
        }
      }
      if(effects.size)drawClouds(now);
    }
    requestAnimationFrame(animate);
  }

  windRange.addEventListener('input',()=>{wind=Number(windRange.value);windValue.textContent=String(wind).padStart(2,'0');});
  chaosRange.addEventListener('input',()=>{disorder=Number(chaosRange.value)/100;chaosValue.textContent=String(chaosRange.value).padStart(2,'0');});
  reset.addEventListener('click',()=>{
    effects.clear(); gusting=false; begin=performance.now();
    for(const item of letters){item.gone=false;item.element.classList.remove('gone');item.element.tabIndex=0;item.element.style.transform='';}
    ctx.clearRect(0,0,canvasWidth,canvasHeight);
    status.textContent='文字重新开始排列。这是主动重置，并不是自动凝聚。';
  });
  window.addEventListener('resize',resize,{passive:true});
  reduced.addEventListener?.('change',()=>{begin=performance.now();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)lastFrame=performance.now();});
  buildLetters();
  resize();
  rafId=requestAnimationFrame(animate);
})();
