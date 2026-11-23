/* Cloud Typography v2.6 — no external scripts.
 * Canvas export omits editor and controls and reconstructs the art layer.
 * Browsers need MediaRecorder + canvas.captureStream for video export.
 */
(() => {
  'use strict';
  const app=window.CloudMotionLab;
  if(!app)return;
  const status=document.getElementById('export-status');
  const gifQuality=document.getElementById('gif-quality');
  const buttons={save:document.getElementById('save-config'),load:document.getElementById('load-config'),video:document.getElementById('export-video'),gif:document.getElementById('export-gif'),png:document.getElementById('export-png')};
  const presets={
    serene:{wind:3,speed:.5,radius:190,density:1,birdSize:70,doveDisperses:false,zoom:1},
    letters:{wind:7,speed:2,radius:240,density:2,birdSize:80,doveDisperses:false,zoom:1.12},
    storm:{wind:16,speed:7,radius:330,density:3,birdSize:100,doveDisperses:true,zoom:1}
  };
  const storageKey='creative-motion-lab-cloud-typography-v2.4';
  let exporting=false,birdFrames=null;
  const setStatus=message=>{status.textContent=message;};
  function readSaved(){
    try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch(e){return null;}
  }
  function saveConfig(){
    try{localStorage.setItem(storageKey,JSON.stringify(app.getConfig()));setStatus('已保存到本浏览器。');}
    catch(e){setStatus('浏览器不允许本地保存，可继续创作和导出。');}
  }
  function loadConfig(){
    const saved=readSaved();
    if(!saved||!app.applyConfig(saved)){setStatus('还没有可恢复的设置。');return;}
    document.querySelectorAll('.preset-button').forEach(b=>b.setAttribute('aria-pressed','false'));
    setStatus('已恢复保存的文字和参数，新一轮开始。');
  }
  buttons.save.addEventListener('click',saveConfig);
  buttons.load.addEventListener('click',loadConfig);
  document.querySelectorAll('.preset-button').forEach(button=>{
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      if(exporting)return;
      const preset=presets[button.dataset.preset];if(!preset)return;
      app.applyConfig({...app.getConfig(),...preset});
      document.querySelectorAll('.preset-button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      setStatus('已应用「'+button.textContent+'」，新一轮开始。');
    });
  });
  function download(blob,filename){
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=filename;
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function dimensions(kind){
    const portrait=window.innerHeight>window.innerWidth*1.2;
    if(kind==='gif'){
      const hd=gifQuality.value==='hd';
      return portrait?(hd?[540,960]:[360,640]):(hd?[960,540]:[640,360]);
    }
    if(kind==='png')return portrait?[720,1280]:[1280,720];
    return portrait?[540,960]:[960,540];
  }
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  // Cache 16 vector wing poses for playback and export without network dependencies.
  async function prepareBirdFrames(){
    if(birdFrames)return birdFrames;
    const svg=app.getScene().messenger.querySelector('svg'),namespace='http://www.w3.org/2000/svg';
    function build(index){
      return new Promise(resolve=>{
        const beat=index*Math.PI*2/16,clone=svg.cloneNode(true);
        clone.setAttribute('xmlns',namespace);clone.setAttribute('width','160');clone.setAttribute('height','100');
        const style=document.createElementNS(namespace,'style');
        const near=-8+Math.sin(beat)*38,far=7-Math.sin(beat+.68)*29,tail=Math.sin(beat*.64+1)*9,head=Math.sin(beat*.54-1)*3.6,letter=Math.sin(beat-.95)*11;
        style.textContent='.dove-wing{transform-origin:91px 58px;transform:rotate('+near+'deg)}'+
          '.dove-far-wing{transform-origin:98px 53px;transform:rotate('+far+'deg)}'+
          '.dove-tail{transform-origin:59px 65px;transform:rotate('+tail+'deg)}'+
          '.dove-head{transform-origin:117px 51px;transform:rotate('+head+'deg)}'+
          '.dove-envelope{transform-origin:146px 47px;transform:rotate('+letter+'deg)}';
        clone.insertBefore(style,clone.firstChild);
        const data=new XMLSerializer().serializeToString(clone);
        const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
        img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data);
      });
    }
    birdFrames=await Promise.all(Array.from({length:16},(_,i)=>build(i)));
    return birdFrames;
  }
  function drawSky(ctx,w,h){
    const gradient=ctx.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,'#73b5d9');gradient.addColorStop(.45,'#91cae6');gradient.addColorStop(1,'#c1e5f3');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    for(const [x,y,r,a] of [[.56,.43,.47,.12],[.13,.97,.52,.28],[.92,.11,.31,.11]]){
      const fog=ctx.createRadialGradient(w*x,h*y,0,w*x,h*y,w*r);
      fog.addColorStop(0,'rgba(255,255,255,'+a+')');fog.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=fog;ctx.fillRect(w*(x-r),h*y-w*r,w*r*2,w*r*2);
    }
  }
  function drawScene(out,frame,birds,kind='standard'){
    const scene=app.getScene(),vw=window.innerWidth,vh=window.innerHeight;
    const w=out.canvas.width,h=out.canvas.height;
    out.setTransform(1,0,0,1,0,0);out.globalAlpha=1;out.clearRect(0,0,w,h);drawSky(out,w,h);
    const scale=Math.min(w/vw,h/vh),ox=(w-vw*scale)/2,oy=(h-vh*scale)/2;
    out.save();out.translate(ox,oy);out.scale(scale,scale);
    // Draw the deliberately selected journal-frame style, never its edit handles.
    const region=document.getElementById('editable-region');
    if(region&&region.dataset.style&&region.dataset.style!=='none'){
      const r=region.getBoundingClientRect(),kindOfFrame=region.dataset.style;
      out.save();
      out.shadowBlur=0;out.lineWidth=1.2;out.strokeStyle='rgba(255,255,255,.53)';
      if(typeof out.roundRect==='function'){
        out.beginPath();out.roundRect(r.left,r.top,r.width,r.height,15);
      }else{
        out.beginPath();out.rect(r.left,r.top,r.width,r.height);
      }
      if(kindOfFrame==='glass'){
        out.fillStyle='rgba(245,253,255,.11)';out.fill();
      }else if(kindOfFrame==='dashed'&&out.setLineDash)out.setLineDash([7,5]);
      out.stroke();out.restore();
    }
    const style=getComputedStyle(scene.paragraph),fontSize=parseFloat(style.fontSize)||30;
    out.textAlign='center';out.textBaseline='middle';
    out.font=(style.fontWeight||'650')+' '+(fontSize*frame.zoom)+'px '+(style.fontFamily||'Arial');
    out.fillStyle=kind==='gif'?'#ffffff':'rgba(255,255,255,.96)';
    out.shadowColor='rgba(255,255,255,.42)';
    // Thin glyph strokes survive 256-color GIF quantization better than a soft glow.
    out.shadowBlur=kind==='gif'?0:8;
    const poses=frame.poses;
    for(const item of scene.letters){
      if(!item.active||item.el.classList.contains('gone'))continue;
      const rect=item.el.getBoundingClientRect();
      if(rect.right<0||rect.bottom<0||rect.left>vw||rect.top>vh)continue;
      out.save();out.translate(rect.left+rect.width/2,rect.top+rect.height/2);
      // Reproduce the recorded Z rotation; DOM projection provides screen-space position.
      const ix=item.index*6;
      if(poses&&poses.length>=ix+6)out.rotate(poses[ix+5]*Math.PI/180);
      if(kind==='gif'){
        out.strokeStyle='rgba(45,100,138,.22)';out.lineWidth=.65;
        out.strokeText(item.el.textContent,0,0);
      }
      out.fillText(item.el.textContent,0,0);out.restore();
    }
    out.shadowBlur=0;
    // Preserve the editorial framing of the artwork, not its operation controls.
    for(const sel of ['.eyebrow','.subtitle']){
      const el=document.querySelector(sel);if(!el||el.hidden)continue;
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')continue;
      const rect=el.getBoundingClientRect();
      out.save();out.font=(s.fontWeight||'500')+' '+(parseFloat(s.fontSize)||12)*frame.zoom+'px '+(s.fontFamily||'Arial');
      out.fillStyle='rgba(255,255,255,.75)';out.shadowBlur=0;out.fillText(el.textContent,rect.left+rect.width/2,rect.top+rect.height/2);
      out.restore();
    }
    if(scene.canvas.width&&scene.canvas.height)out.drawImage(scene.canvas,0,0,vw,vh);
    const match=/translate3d\((-?[\d.]+)px,(-?[\d.]+)px/.exec(frame.birdTransform||'');
    if(match&&Number(frame.birdOpacity)>.01&&birds.length){
      const size=Number(frame.controls[4])||70;
      const angle=/rotateZ\((-?[\d.]+)deg/.exec(frame.birdTransform||'');
      const heading=angle?Number(angle[1])*Math.PI/180:0;
      const flip=(frame.birdTransform||'').includes('scaleX(-1)')?-1:1;
      const phase=frame.now*(.0095+(Number(frame.controls[0])||0)*.00022);
      const index=((Math.round(phase/Math.PI*8)%16)+16)%16;
      const img=birds[index]||birds.find(Boolean);
      if(img){
        out.save();out.globalAlpha=clamp(Number(frame.birdOpacity),0,1);
        out.translate(Number(match[1])+size/2,Number(match[2])+size*.625/2);
        out.rotate(heading);out.scale(flip,1);
        out.drawImage(img,-size/2,-size*.625/2,size,size*.625);out.restore();
      }
    }
    out.restore();
  }
  function u16(out,n){out.push(n&255,(n>>>8)&255);}

  // One fixed palette for every frame avoids temporal color flicker. A median-cut
  // histogram of the real scene preserves subtle sky blues far better than RGB332.
  function makeGifPalette(samples){
    const count=new Uint32Array(32768),rs=new Uint32Array(32768);
    const gs=new Uint32Array(32768),bs=new Uint32Array(32768);
    for(const sample of samples){
      const d=sample.data;
      for(let p=0;p<d.length;p+=4*5){
        const r=d[p],g=d[p+1],b=d[p+2],key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
        count[key]++;rs[key]+=r;gs[key]+=g;bs[key]+=b;
      }
    }
    const items=[];
    for(let k=0;k<32768;k++)if(count[k]){
      items.push({r:rs[k]/count[k],g:gs[k]/count[k],b:bs[k]/count[k],n:count[k]});
    }
    function box(list){
      let low=[255,255,255],high=[0,0,0],population=0;
      for(const c of list){
        population+=c.n;
        const vals=[c.r,c.g,c.b];
        for(let i=0;i<3;i++){if(vals[i]<low[i])low[i]=vals[i];if(vals[i]>high[i])high[i]=vals[i];}
      }
      const spreads=[high[0]-low[0],(high[1]-low[1])*1.15,(high[2]-low[2])*1.1];
      const axis=spreads.indexOf(Math.max(...spreads));
      return {list,axis,population,score:list.length>1?spreads[axis]*Math.sqrt(population):0};
    }
    const boxes=[box(items)];
    while(boxes.length<240){
      let best=-1,index=-1;
      for(let i=0;i<boxes.length;i++)if(boxes[i].score>best){best=boxes[i].score;index=i;}
      if(best<=0)break;
      const b=boxes[index],axis=['r','g','b'][b.axis];
      b.list.sort((x,y)=>x[axis]-y[axis]);
      let weight=0,cut=0;
      for(let j=0;j<b.list.length-1;j++){
        weight+=b.list[j].n;if(weight>=b.population*.5){cut=j+1;break;}
      }
      if(!cut)cut=Math.max(1,Math.floor(b.list.length/2));
      boxes.splice(index,1,box(b.list.slice(0,cut)),box(b.list.slice(cut)));
    }
    const palette=boxes.map(({list})=>{
      let n=0,r=0,g=0,b=0;
      for(const c of list){n+=c.n;r+=c.r*c.n;g+=c.g*c.n;b+=c.b*c.n;}
      return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];
    });
    // Reserve white lettering, pearl-gray feather and letter-envelope tones.
    palette.push(
      [255,255,255],[253,254,255],[250,252,255],[247,250,254],
      [240,247,251],[230,240,247],[220,234,244],[205,223,235],
      [190,213,228],[176,200,219],[255,250,240],[247,240,228],
      [231,222,203],[220,193,171],[197,140,132],[170,110,108]
    );
    while(palette.length<256)palette.push(palette[palette.length-1]||[0,0,0]);
    return palette.slice(0,256);
  }

  // Standard GIF89a LZW encoder (9–12 bits, clear code 256).
  function lzw(indices){
    let out=[],buffer=0,used=0,size=9,next=258,dict=new Map();
    function write(code){
      buffer|=code<<used;used+=size;
      while(used>=8){out.push(buffer&255);buffer>>>=8;used-=8;}
    }
    write(256);
    let prev=indices[0]||0;
    for(let i=1;i<indices.length;i++){
      const cur=indices[i],key=prev*256+cur,known=dict.get(key);
      if(known!==undefined){prev=known;continue;}
      write(prev);
      if(next<4096){
        dict.set(key,next++);
        if(next===(1<<size)+1&&size<12)size++;
      }else{
        write(256);dict=new Map();size=9;next=258;
      }
      prev=cur;
    }
    write(prev);write(257);
    if(used)out.push(buffer&255);
    return out;
  }

  class GifWriter {
    constructor(w,h,fps,palette){
      this.w=w;this.h=h;this.delay=Math.round(100/fps);this.parts=[];
      this.palette=palette;
      this.cache=new Int16Array(32768);this.cache.fill(-1);
      const header=[71,73,70,56,57,97];
      u16(header,w);u16(header,h);header.push(0xF7,0,0);
      for(const color of palette)header.push(...color);
      header.push(0x21,0xFF,11,...Array.from('NETSCAPE2.0').map(x=>x.charCodeAt(0)),3,1,0,0,0);
      this.parts.push(new Uint8Array(header));
    }
    frame(image){
      const data=image.data,w=this.w,h=this.h,indices=new Uint8Array(w*h);
      const palette=this.palette,cache=this.cache;
      const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x,j=i*4,lum=(data[j]+data[j+1]+data[j+2])/3;
        const bias=lum>245?0:(bayer[(y&3)*4+(x&3)]-7.5)*.55;
        const r=clamp(data[j]+bias,0,255),g=clamp(data[j+1]+bias,0,255),b=clamp(data[j+2]+bias,0,255);
        const key=((r>>3)<<10)|((g>>3)<<5)|(b>>3);
        let index=cache[key];
        if(index<0){
          let nearest=Infinity;
          const rr=((key>>10)&31)*8+4,gg=((key>>5)&31)*8+4,bb=(key&31)*8+4;
          for(let k=0;k<palette.length;k++){
            const c=palette[k],dr=rr-c[0],dg=gg-c[1],db=bb-c[2];
            const distance=dr*dr+1.15*dg*dg+1.10*db*db;
            if(distance<nearest){nearest=distance;index=k;}
          }
          cache[key]=index;
        }
        indices[i]=index;
      }
      const frame=[0x21,0xF9,4,0,this.delay&255,(this.delay>>8)&255,0,0,0x2C];
      u16(frame,0);u16(frame,0);u16(frame,w);u16(frame,h);frame.push(0,8);
      const encoded=lzw(indices);
      for(let i=0;i<encoded.length;i+=255){const part=encoded.slice(i,i+255);frame.push(part.length,...part);}
      frame.push(0);this.parts.push(new Uint8Array(frame));
    }
    finish(){this.parts.push(new Uint8Array([0x3B]));return new Blob(this.parts,{type:'image/gif'});}
  }

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  async function exportArt(kind){
    if(exporting)return;
    const frames=app.getFrames();
    if(!frames.length){setStatus('没有可导出的画面。');return;}
    exporting=true;
    const prior=app.getState();
    const all=[buttons.save,buttons.load,buttons.video,buttons.gif,buttons.png,gifQuality,...document.querySelectorAll('.preset-button')];
    all.forEach(b=>b.disabled=true);
    let stream=null;
    try{
      if(prior.mode==='live')app.freeze();
      const [w,h]=dimensions(kind),canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{willReadFrequently:kind==='gif'});
      const birds=await prepareBirdFrames();
      const end=frames[frames.length-1].t;
      const maxMs=kind==='gif'?8000:kind==='video'?30000:0;
      const start=kind==='png'?end:Math.max(frames[0].t,end-maxMs);
      const fps=kind==='gif'?10:20,step=1000/fps;
      if(kind==='png'){
        const frame=app.seek(end);await nextPaint();drawScene(ctx,frame,birds);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        if(!blob)throw Error('PNG 编码失败');
        download(blob,'cloud-letter.png');setStatus('PNG 画面已导出。');
      }else if(kind==='gif'){
        setStatus('正在分析天空色彩…');
        const samples=[];
        for(const time of [start,(start+end)/2,end]){
          const frame=app.seek(time);
          drawScene(ctx,frame,birds,'gif');
          samples.push(ctx.getImageData(0,0,w,h));
          await nextPaint();
        }
        const writer=new GifWriter(w,h,fps,makeGifPalette(samples));
        samples.length=0;
        const count=Math.max(2,Math.ceil((end-start)/step)+1);
        for(let i=0;i<count;i++){
          const frame=app.seek(Math.min(end,start+i*step));
          drawScene(ctx,frame,birds,'gif');writer.frame(ctx.getImageData(0,0,w,h));
          if(i%3===0){setStatus('正在生成高清 GIF：'+Math.round((i+1)/count*100)+'%');await nextPaint();}
        }
        download(writer.finish(),'cloud-letter-'+gifQuality.value+'.gif');
        setStatus('GIF 已导出（'+w+'×'+h+'，最近最多 8 秒）。');
      }else{
        if(!canvas.captureStream||typeof MediaRecorder==='undefined')throw Error('浏览器不支持视频录制，请导出 GIF。');
        const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
        const mime=types.find(t=>MediaRecorder.isTypeSupported(t));
        if(!mime)throw Error('浏览器没有可用的视频编码器，请使用 GIF。');
        stream=canvas.captureStream(20);
        const chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2600000});
        const done=new Promise((resolve,reject)=>{
          recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
          recorder.onerror=e=>reject(e.error||new Error('视频编码出错'));
          recorder.onstop=()=>resolve();
        });
        const count=Math.max(2,Math.ceil((end-start)/step)+1);
        drawScene(ctx,app.seek(start),birds);recorder.start(500);
        for(let i=1;i<count;i++){
          drawScene(ctx,app.seek(Math.min(end,start+i*step)),birds);
          if(i%20===0)setStatus('正在录制视频：'+Math.round(i/count*100)+'%');
          await wait(step);
        }
        recorder.stop();await done;
        const blob=new Blob(chunks,{type:mime});
        if(blob.size<500)throw Error('视频文件为空');
        download(blob,'cloud-letter.'+(mime.includes('mp4')?'mp4':'webm'));
        setStatus('视频已导出（最近最多 30 秒，20 fps）。');
      }
    }catch(err){setStatus('导出失败：'+(err&&err.message?err.message:'未知错误'));}
    finally{
      if(stream)stream.getTracks().forEach(t=>t.stop());
      app.restoreState(prior);
      all.forEach(b=>b.disabled=false);
      exporting=false;
    }
  }
  buttons.video.addEventListener('click',()=>exportArt('video'));
  buttons.gif.addEventListener('click',()=>exportArt('gif'));
  buttons.png.addEventListener('click',()=>exportArt('png'));
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream){
    buttons.video.disabled=true;buttons.video.title='当前浏览器不支持视频导出，可使用 GIF 或 PNG';
  }
  setStatus('GIF 默认高清 960×540，可切换标准画质；最长8秒。');
})();