/* Cloud Typography v2.8 — independently editable text regions, shapes, transforms.
 * All coordinates are normalized to the art stage. The animation engine owns
 * the glyph pool; this editor owns region geometry/content and selected state.
 */
(() => {
  'use strict';
  const app=window.CloudMotionLab,sky=document.getElementById('sky');
  const stage=document.getElementById('text-plane'),paragraph=document.getElementById('cloud-text');
  const title=document.querySelector('.eyebrow'),subtitle=document.querySelector('.subtitle');
  const toggle=document.getElementById('layout-toggle'),toolbar=document.getElementById('layout-toolbar');
  if(!app||!sky||!stage||!paragraph||!toggle||!toolbar)return;
  const $=id=>document.getElementById(id);
  const buttons={full:$('layout-full'),center:$('layout-center'),add:$('layout-add'),
    remove:$('layout-delete'),applyText:$('layout-apply-text')};
  const pick=$('layout-zone-select'),shape=$('layout-shape'),styleInput=$('layout-style');
  const textarea=$('layout-zone-text'),textCount=$('layout-text-count');
  const motionInput=$('layout-motion'),motionValue=$('layout-motion-value');
  const fontAuto=$('layout-font-auto'),fontInput=$('layout-font-size');
  const fontValue=$('layout-font-value'),fontHint=$('layout-font-hint');
  const checks={top:$('layout-show-top'),bottom:$('layout-show-bottom'),brand:$('layout-show-brand')};
  const status=$('layout-status'),MAX_ZONES=6,MAX_GLYPHS=1500;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const num=(x,f)=>Number.isFinite(Number(x))?Number(x):f;
  const gr=t=>typeof Intl.Segmenter==='function'?
    Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(t),s=>s.segment):
    Array.from(t);
  const size=t=>gr(t).filter(c=>!/\s/.test(c)).length;
  const original=app.getRegions()[0].text;
  const defaultRegion=()=>({id:'zone-1',x:.10,y:.20,w:.80,h:.60,
    shape:'rect',style:'none',motion:1,fontSize:null,text:original});
  const defaults=()=>({zones:[defaultRegion()],selected:'zone-1',
    decorations:{top:{visible:true,x:.5,y:.085},bottom:{visible:true,x:.5,y:.905},brand:true}});
  let state=defaults(),editing=false,drag=null,nextId=2;
  const els=new Map();
  const primary=document.createElement('div');primary.id='editable-region';primary.className='text-region';
  primary.setAttribute('aria-label','文字模块 1');
  stage.insertBefore(primary,paragraph);
  paragraph.classList.add('zone-text');primary.append(paragraph);
  const draft=document.createElement('div');draft.id='layout-draft';draft.hidden=true;stage.append(draft);
  title.classList.add('movable-caption');title.dataset.caption='top';
  subtitle.classList.add('movable-caption');subtitle.dataset.caption='bottom';
  function controls(frame){
    const label=document.createElement('span');label.className='region-label';
    const grip=document.createElement('span');grip.className='region-grip';
    grip.setAttribute('aria-hidden','true');frame.append(label,grip);
  }
  controls(primary);
  els.set('zone-1',{frame:primary,textEl:paragraph});
  function validRegion(value,index){
    const id=typeof value?.id==='string'&&/^zone-[a-z0-9-]+$/i.test(value.id)?
      value.id:'zone-'+(index+1);
    const w=clamp(num(value?.w,.52),.12,.97),h=clamp(num(value?.h,.4),.12,.96);
    const text=typeof value?.text==='string'&&value.text.trim()?
      gr(value.text.trim()).slice(0,1200).join(''):'写下想说的话';
    return {id,x:clamp(num(value?.x,.14),0,1-w),y:clamp(num(value?.y,.16),0,1-h),w,h,
      shape:['rect','circle','ellipse'].includes(value?.shape)?value.shape:'rect',
      style:['none','dashed','glass'].includes(value?.style)?value.style:'none',
      motion:clamp(num(value?.motion,1),.3,2),
      fontSize:value?.fontSize==null||value.fontSize===''?null:clamp(num(value.fontSize,32),12,72),text};
  }
  function reconcilePrimaryText(){
    const live=app.getRegions();
    for(const zone of state.zones){
      const match=live.find(r=>r.id===zone.id);
      if(match&&match.text&&match.text!==zone.text)zone.text=match.text;
    }
  }
  function snapshot(){
    reconcilePrimaryText();
    return {zones:state.zones.map(z=>({...z})),selected:state.selected,
      decorations:{top:{...state.decorations.top},bottom:{...state.decorations.bottom},
        brand:state.decorations.brand}};
  }
  function selected(){return state.zones.find(z=>z.id===state.selected)||state.zones[0];}
  function ensureNodes(){
    const liveIds=new Set(state.zones.map(z=>z.id));
    for(const [id,nodes] of els)if(!liveIds.has(id)){
      if(id!=='zone-1')nodes.frame.remove();els.delete(id);
    }
    for(const z of state.zones){
      if(els.has(z.id))continue;
      const frame=document.createElement('div');frame.className='text-region';
      const textEl=document.createElement('div');textEl.className='zone-text';
      frame.append(textEl);controls(frame);stage.insertBefore(frame,draft);
      els.set(z.id,{frame,textEl});
    }
    for(const [i,z] of state.zones.entries()){
      const e=els.get(z.id);
      e.frame.dataset.zoneId=z.id;
      e.frame.setAttribute('aria-label','文字模块 '+(i+1));
    }
  }
  function refreshOptions(){
    const old=[...pick.options].map(o=>o.value).join('|');
    const wanted=state.zones.map(z=>z.id).join('|');
    if(old!==wanted){
      pick.textContent='';
      state.zones.forEach((z,i)=>{
        const o=document.createElement('option');o.value=z.id;o.textContent='文字框 '+(i+1);
        pick.append(o);
      });
    }
    pick.value=state.selected;
  }
  function roundCircle(z){
    if(z.shape!=='circle')return;
    const b=stage.getBoundingClientRect(),ratio=b.width/Math.max(1,b.height);
    const h=z.w*ratio;
    if(h>.95){z.h=.95;z.w=Math.min(z.w,.95/ratio);}
    else z.h=h;
    z.x=clamp(z.x,0,1-z.w);z.y=clamp(z.y,0,1-z.h);
  }
  function render(syncSelection=false){
    ensureNodes();
    for(const [i,z] of state.zones.entries()){
      const e=els.get(z.id);e.frame.dataset.style=z.style;e.frame.dataset.shape=z.shape;
      e.frame.dataset.fontSize=z.fontSize==null?'auto':String(z.fontSize);
      e.frame.classList.toggle('selected',z.id===state.selected);
      e.frame.style.left=(z.x*100).toFixed(3)+'%';
      e.frame.style.top=(z.y*100).toFixed(3)+'%';
      e.frame.style.width=(z.w*100).toFixed(3)+'%';
      e.frame.style.height=(z.h*100).toFixed(3)+'%';
      e.frame.querySelector('.region-label').textContent='文字框 '+(i+1)+' · 拖动移动';
    }
    for(const [key,el] of [['top',title],['bottom',subtitle]]){
      const c=state.decorations[key];el.hidden=!c.visible;
      el.style.left=(c.x*100).toFixed(3)+'%';el.style.top=(c.y*100).toFixed(3)+'%';
      checks[key].checked=c.visible;
    }
    checks.brand.checked=state.decorations.brand;
    sky.classList.toggle('layout-hide-brand',!state.decorations.brand);
    refreshOptions();
    if(syncSelection){
      const z=selected();
      textarea.value=z.text;shape.value=z.shape;styleInput.value=z.style;
      motionInput.value=String(z.motion);motionValue.textContent=z.motion.toFixed(1)+'×';
      fontAuto.checked=z.fontSize===null;
      fontInput.disabled=z.fontSize===null;
      if(z.fontSize!=null)fontInput.value=String(z.fontSize);
      fontValue.textContent=z.fontSize===null?'自动':z.fontSize+'px';
      textCount.textContent=gr(textarea.value).length+' / 1200';
    }
    buttons.remove.disabled=state.zones.length<=1;
    buttons.add.disabled=state.zones.length>=MAX_ZONES;
    if(syncSelection)updateFontHint();
    status.textContent='共 '+state.zones.length+' 个文字框，已选文字框 '+
      (state.zones.indexOf(selected())+1)+' · 总字形 '+state.zones.reduce((n,z)=>n+size(z.text),0)+' / 1500';
  }
  function updateFontHint(){
    const z=selected(),nodes=els.get(z.id);
    if(!nodes)return;
    const overflow=nodes.frame.dataset.textOverflow==='true';
    fontHint.textContent=overflow?
      '文字超出当前框，请缩小字号、减少重复倍数或扩大文字框':
      (z.fontSize===null?'自动根据当前文字框调整大小':'手动字号，不会自动缩小');
  }
  function reflowFont(){
    app.reflowLayout();updateFontHint();
  }
  function syncEngine(){
    const ok=app.setRegions(state.zones.map(z=>({id:z.id,text:z.text,
      element:els.get(z.id).textEl,motion:z.motion})));
    if(!ok){status.textContent='文字总量过多，无法应用；请缩短文本';return false;}
    reflowFont();return true;
  }
  function addBox(rectInput){
    if(state.zones.length>=MAX_ZONES){status.textContent='最多 6 个文字框';return false;}
    const z=validRegion({
      id:'zone-'+nextId++,x:.16+state.zones.length*.06,y:.17+state.zones.length*.06,
      w:.36,h:.30,text:'在这里写下新的文字',...rectInput
    },state.zones.length);
    if(state.zones.reduce((n,x)=>n+size(x.text),0)+size(z.text)>MAX_GLYPHS){
      status.textContent='文字总量已达到 1500 个字形上限';return false;
    }
    state.zones.push(z);state.selected=z.id;render(true);syncEngine();return true;
  }
  function apply(value){
    const d=defaults(),dec=value?.decorations||{};
    const old=value?.zones?.length?value.zones:
      (value?.region?[{...value.region,id:'zone-1',text:app.getRegions()[0]?.text||original}]:d.zones);
    const list=old.slice(0,MAX_ZONES).map(validRegion);
    let total=0;const clean=[];
    for(const z of list){if(total+size(z.text)>MAX_GLYPHS)break;total+=size(z.text);clean.push(z);}
    if(!clean.length)clean.push(defaultRegion());
    // Stable ids, including older v2.6 single-frame saved settings.
    const used=new Set();clean.forEach((z,i)=>{
      if(used.has(z.id))z.id='zone-'+(i+1);used.add(z.id);
    });
    // Preserve the original h1 container even if an imported layout lacks zone-1.
    if(!used.has('zone-1'))clean[0].id='zone-1';
    const newCaptions={};
    for(const key of ['top','bottom']){
      const v=dec[key]||d.decorations[key],fallback=d.decorations[key];
      newCaptions[key]={visible:v.visible!==false,x:clamp(num(v.x,fallback.x),0,1),
        y:clamp(num(v.y,fallback.y),0,1)};
    }
    state={zones:clean,selected:clean.some(z=>z.id===value?.selected)?value.selected:clean[0].id,
      decorations:{...newCaptions,brand:dec.brand!==false}};
    nextId=Math.max(2,...clean.map(z=>(Number(z.id.replace('zone-',''))||0)+1));
    for(const z of state.zones)roundCircle(z);
    render(true);syncEngine();
  }
  function edit(on){
    if(on)reconcilePrimaryText();
    editing=Boolean(on);drag=null;draft.hidden=true;
    app.resetArtwork();sky.classList.toggle('layout-editing',editing);
    toolbar.hidden=!editing;toggle.setAttribute('aria-pressed',String(editing));
    toggle.textContent=editing?'✓ 完成排版':'▧ 排版模式';
    render(true);requestAnimationFrame(()=>reflowFont());
  }
  toggle.addEventListener('click',()=>edit(!editing));
  buttons.add.addEventListener('click',()=>addBox());
  buttons.remove.addEventListener('click',()=>{
    if(state.zones.length<2)return;
    const target=selected();
    if(target.id==='zone-1'){
      // Keep the original semantic h1 and its DOM container as primary;
      // promote the next frame when deleting the original primary module.
      const survivor=state.zones.find(z=>z.id!=='zone-1');
      const idx=state.zones.indexOf(survivor);
      state.zones=state.zones.filter(z=>z.id!=='zone-1'&&z.id!==survivor.id);
      state.zones.unshift({...survivor,id:'zone-1'});
      state.selected='zone-1';
    }else{
      state.zones=state.zones.filter(z=>z.id!==target.id);
      state.selected=state.zones[0].id;
    }
    render(true);syncEngine();
  });
  pick.addEventListener('change',()=>{state.selected=pick.value;render(true);});
  buttons.full.addEventListener('click',()=>{
    const z=selected();Object.assign(z,{x:.015,y:.035,w:.97,h:.93,shape:'rect'});
    render(true);app.reflowLayout();
  });
  buttons.center.addEventListener('click',()=>{
    const z=selected();Object.assign(z,{x:.10,y:.20,w:.80,h:.60,shape:'rect'});
    render(true);app.reflowLayout();
  });
  shape.addEventListener('change',()=>{
    const z=selected();z.shape=shape.value;roundCircle(z);render(true);app.reflowLayout();
  });
  styleInput.addEventListener('change',()=>{selected().style=styleInput.value;render();});
  fontAuto.addEventListener('change',()=>{
    const z=selected();
    if(fontAuto.checked)z.fontSize=null;
    else{
      const rendered=parseFloat(getComputedStyle(els.get(z.id).textEl).fontSize);
      z.fontSize=clamp(Math.round(Number.isFinite(rendered)?rendered:32),12,72);
      fontInput.value=String(z.fontSize);
    }
    render(true);reflowFont();
  });
  fontInput.addEventListener('input',()=>{
    const z=selected();
    z.fontSize=clamp(num(fontInput.value,32),12,72);
    fontAuto.checked=false;fontInput.disabled=false;
    fontValue.textContent=z.fontSize+'px';
    els.get(z.id).frame.dataset.fontSize=String(z.fontSize);
    reflowFont();
  });
  motionInput.addEventListener('input',()=>{
    motionValue.textContent=num(motionInput.value,1).toFixed(1)+'×';
  });
  motionInput.addEventListener('change',()=>{
    const z=selected();z.motion=clamp(num(motionInput.value,1),.3,2);
    motionValue.textContent=z.motion.toFixed(1)+'×';
    syncEngine();
  });
  textarea.addEventListener('input',()=>{textCount.textContent=gr(textarea.value).length+' / 1200';});
  buttons.applyText.addEventListener('click',()=>{
    const z=selected(),value=textarea.value.trim();
    if(!value||gr(value).length>1200){
      status.textContent='请输入 1～1200 个字符';return;
    }
    const total=state.zones.reduce((n,r)=>n+(r.id===z.id?size(value):size(r.text)),0);
    if(total>MAX_GLYPHS){
      status.textContent='所有文字框合计最多 1500 个字形，请缩短文字';return;
    }
    z.text=value;render(true);syncEngine();
  });
  for(const [key,input] of Object.entries(checks)){
    input.addEventListener('change',()=>{
      if(key==='brand')state.decorations.brand=input.checked;
      else state.decorations[key].visible=input.checked;
      render();app.reflowLayout();
    });
  }
  function point(e){
    const r=stage.getBoundingClientRect();
    return {x:clamp((e.clientX-r.left)/Math.max(1,r.width),0,1),
      y:clamp((e.clientY-r.top)/Math.max(1,r.height),0,1)};
  }
  function draftRect(a,b){
    draft.style.left=(Math.min(a.x,b.x)*100)+'%';
    draft.style.top=(Math.min(a.y,b.y)*100)+'%';
    draft.style.width=(Math.abs(a.x-b.x)*100)+'%';
    draft.style.height=(Math.abs(a.y-b.y)*100)+'%';
  }
  stage.addEventListener('pointerdown',event=>{
    if(!editing||(event.pointerType==='mouse'&&event.button!==0))return;
    if(event.target.closest?.('.layout-toolbar,.bottom-bar,.masthead'))return;
    const at=point(event),caption=event.target.closest?.('.movable-caption');
    const frame=event.target.closest?.('.text-region');
    if(caption){
      const key=caption.dataset.caption;
      drag={kind:'caption',key,id:event.pointerId,at,start:{...state.decorations[key]}};
    }else if(frame){
      const id=frame.dataset.zoneId,z=state.zones.find(v=>v.id===id);
      if(!z)return;
      state.selected=id;render(true);
      drag={kind:event.target.classList.contains('region-grip')?'resize':'move',
        id:event.pointerId,at,start:{...z},regionId:id};
    }else{
      drag={kind:'draw',id:event.pointerId,at};draft.hidden=false;draftRect(at,at);
    }
    if(event.preventDefault)event.preventDefault();
    if(event.stopPropagation)event.stopPropagation();
  });
  window.addEventListener('pointermove',event=>{
    if(!editing||!drag||event.pointerId!==drag.id)return;
    const at=point(event),dx=at.x-drag.at.x,dy=at.y-drag.at.y;
    if(drag.kind==='caption'){
      const c=state.decorations[drag.key];
      c.x=clamp(drag.start.x+dx,0,1);c.y=clamp(drag.start.y+dy,0,1);
    }else if(drag.kind==='move'){
      const z=selected();z.x=clamp(drag.start.x+dx,0,1-z.w);
      z.y=clamp(drag.start.y+dy,0,1-z.h);
    }else if(drag.kind==='resize'){
      const z=selected();
      z.w=clamp(drag.start.w+dx,.12,.99-z.x);
      z.h=clamp(drag.start.h+dy,.12,.99-z.y);
      roundCircle(z);
    }else if(drag.kind==='draw')draftRect(drag.at,at);
    render();
  },{passive:true});
  function finish(event){
    if(!drag||event.pointerId!==drag.id)return;
    if(drag.kind==='draw'){
      const at=point(event),w=Math.abs(at.x-drag.at.x),h=Math.abs(at.y-drag.at.y);
      if(w>.10&&h>.10)addBox({x:Math.min(at.x,drag.at.x),
        y:Math.min(at.y,drag.at.y),w,h});
    }
    drag=null;draft.hidden=true;render();app.reflowLayout();
  }
  window.addEventListener('pointerup',finish);
  window.addEventListener('pointercancel',finish);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&editing){
      const active=document.activeElement;
      if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return;
      event.preventDefault();edit(false);
    }
  });
  const oldGet=app.getConfig,oldApply=app.applyConfig;
  app.getConfig=()=>({...oldGet(),version:4,layout:snapshot()});
  app.applyConfig=cfg=>{
    if(!oldApply(cfg))return false;
    apply(cfg?.layout||snapshot());return true;
  };
  app.getLayout=snapshot;app.setLayout=apply;app.toggleLayoutEditing=edit;
  window.addEventListener('resize',()=>requestAnimationFrame(updateFontHint));
  render(true);syncEngine();
})();