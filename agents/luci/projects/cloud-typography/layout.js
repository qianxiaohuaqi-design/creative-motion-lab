/* Cloud Typography v2.6: one editable journal-text region, decoration layer.
 * Layout values are normalized to the full artwork canvas, not page pixels.
 */
(() => {
  'use strict';
  const app=window.CloudMotionLab,sky=document.getElementById('sky');
  const stage=document.getElementById('text-plane'),paragraph=document.getElementById('cloud-text');
  const title=document.querySelector('.eyebrow'),subtitle=document.querySelector('.subtitle');
  const toggle=document.getElementById('layout-toggle'),toolbar=document.getElementById('layout-toolbar');
  if(!app||!sky||!stage||!paragraph||!toggle||!toolbar)return;
  const full=document.getElementById('layout-full'),center=document.getElementById('layout-center');
  const styleInput=document.getElementById('layout-style');
  const checks={top:document.getElementById('layout-show-top'),
    bottom:document.getElementById('layout-show-bottom'),
    brand:document.getElementById('layout-show-brand')};
  const status=document.getElementById('layout-status');
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const finite=(x,fallback)=>Number.isFinite(Number(x))?Number(x):fallback;
  const defaults=()=>({
    region:{x:.10,y:.20,w:.80,h:.60,shape:'rect',style:'none'},
    decorations:{top:{visible:true,x:.50,y:.085},bottom:{visible:true,x:.50,y:.905},brand:true}
  });
  let state=defaults(),editing=false,drag=null;
  const region=document.createElement('div');
  region.id='editable-region';region.setAttribute('aria-label','可调整的云中文字框');
  stage.insertBefore(region,paragraph);
  region.append(paragraph);
  const grip=document.createElement('span');grip.className='region-grip';
  grip.setAttribute('aria-hidden','true');region.append(grip);
  const draft=document.createElement('div');draft.id='layout-draft';draft.hidden=true;
  stage.append(draft);
  title.classList.add('movable-caption');title.dataset.caption='top';
  subtitle.classList.add('movable-caption');subtitle.dataset.caption='bottom';
  function rect(input){
    const w=clamp(finite(input?.w,.80),.12,.99),h=clamp(finite(input?.h,.60),.12,.98);
    return {x:clamp(finite(input?.x,.1),0,1-w),y:clamp(finite(input?.y,.2),0,1-h),
      w,h,shape:'rect',style:['none','dashed','glass'].includes(input?.style)?input.style:'none'};
  }
  function snapshot(){
    return {region:{...state.region},decorations:{
      top:{...state.decorations.top},bottom:{...state.decorations.bottom},
      brand:state.decorations.brand}};
  }
  function render(){
    const r=state.region;
    region.style.left=(r.x*100).toFixed(3)+'%';
    region.style.top=(r.y*100).toFixed(3)+'%';
    region.style.width=(r.w*100).toFixed(3)+'%';
    region.style.height=(r.h*100).toFixed(3)+'%';
    region.dataset.style=r.style;styleInput.value=r.style;
    for(const [key,element] of [['top',title],['bottom',subtitle]]){
      const c=state.decorations[key];element.hidden=!c.visible;
      element.style.left=(c.x*100).toFixed(3)+'%';
      element.style.top=(c.y*100).toFixed(3)+'%';
      checks[key].checked=c.visible;
    }
    checks.brand.checked=state.decorations.brand;
    sky.classList.toggle('layout-hide-brand',!state.decorations.brand);
    status.textContent='1 个矩形文字框 · '+Math.round(r.w*100)+'% × '+Math.round(r.h*100)+
      '% · 可在空白处拖动重新框选';
  }
  function apply(value){
    const d=defaults(),deco=value?.decorations||{};
    function caption(key){
      const c=deco[key]||{},fallback=d.decorations[key];
      return {visible:c.visible!==false,x:clamp(finite(c.x,fallback.x),0,1),
        y:clamp(finite(c.y,fallback.y),0,1)};
    }
    state={region:rect(value?.region||d.region),
      decorations:{top:caption('top'),bottom:caption('bottom'),brand:deco.brand!==false}};
    render();app.reflowLayout();
  }
  function edit(on){
    editing=Boolean(on);drag=null;draft.hidden=true;
    // Geometry changes intentionally begin a fresh timeline rather than
    // replaying old glyph transforms on a different set of screen positions.
    app.resetArtwork();
    sky.classList.toggle('layout-editing',editing);toolbar.hidden=!editing;
    toggle.setAttribute('aria-pressed',String(editing));
    toggle.textContent=editing?'✓ 完成排版':'▧ 排版模式';
    render();requestAnimationFrame(()=>app.reflowLayout());
  }
  toggle.addEventListener('click',()=>edit(!editing));
  full.addEventListener('click',()=>{
    state.region={...state.region,x:.015,y:.035,w:.97,h:.93};
    render();app.reflowLayout();
  });
  center.addEventListener('click',()=>{state.region=defaults().region;render();app.reflowLayout();});
  styleInput.addEventListener('change',()=>{state.region.style=styleInput.value;render();});
  for(const [key,input] of Object.entries(checks)){
    input.addEventListener('change',()=>{
      if(key==='brand')state.decorations.brand=input.checked;
      else state.decorations[key].visible=input.checked;
      render();app.reflowLayout();
    });
  }
  function point(event){
    const r=stage.getBoundingClientRect();
    return {x:clamp((event.clientX-r.left)/Math.max(1,r.width),0,1),
      y:clamp((event.clientY-r.top)/Math.max(1,r.height),0,1)};
  }
  function showDraft(x,y,w,h){
    draft.style.left=(x*100)+'%';draft.style.top=(y*100)+'%';
    draft.style.width=(w*100)+'%';draft.style.height=(h*100)+'%';
  }
  stage.addEventListener('pointerdown',event=>{
    if(!editing||(event.pointerType==='mouse'&&event.button!==0))return;
    const at=point(event),caption=event.target.closest?.('.movable-caption');
    const onRegion=event.target.closest?.('#editable-region');
    if(caption){
      drag={kind:'caption',key:caption.dataset.caption,id:event.pointerId,at,
        start:{...state.decorations[caption.dataset.caption]}};
    }else if(onRegion){
      drag={kind:event.target===grip?'resize':'move',id:event.pointerId,at,start:{...state.region}};
    }else{
      drag={kind:'draw',id:event.pointerId,at};
      draft.hidden=false;showDraft(at.x,at.y,0,0);
    }
    event.preventDefault();event.stopPropagation();
  });
  window.addEventListener('pointermove',event=>{
    if(!editing||!drag||event.pointerId!==drag.id)return;
    const at=point(event),dx=at.x-drag.at.x,dy=at.y-drag.at.y;
    if(drag.kind==='caption'){
      const c=state.decorations[drag.key];
      c.x=clamp(drag.start.x+dx,0,1);c.y=clamp(drag.start.y+dy,0,1);
    }else if(drag.kind==='move'){
      const r=state.region;
      r.x=clamp(drag.start.x+dx,0,1-r.w);r.y=clamp(drag.start.y+dy,0,1-r.h);
    }else if(drag.kind==='resize'){
      const r=state.region;
      r.w=clamp(drag.start.w+dx,.12,.99-r.x);r.h=clamp(drag.start.h+dy,.12,.99-r.y);
    }else if(drag.kind==='draw'){
      showDraft(Math.min(at.x,drag.at.x),Math.min(at.y,drag.at.y),Math.abs(dx),Math.abs(dy));
    }
    render();
  },{passive:true});
  function finish(event){
    if(!drag||event.pointerId!==drag.id)return;
    if(drag.kind==='draw'){
      const at=point(event),w=Math.abs(at.x-drag.at.x),h=Math.abs(at.y-drag.at.y);
      if(w>.08&&h>.08)state.region=rect({
        ...state.region,x:Math.min(at.x,drag.at.x),y:Math.min(at.y,drag.at.y),w,h});
    }
    drag=null;draft.hidden=true;render();app.reflowLayout();
  }
  window.addEventListener('pointerup',finish);
  window.addEventListener('pointercancel',finish);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&editing){event.preventDefault();edit(false);}
  });
  // Existing save/load and presets call this same app object on click.
  const beforeGet=app.getConfig,beforeApply=app.applyConfig;
  app.getConfig=()=>({...beforeGet(),version:3,layout:snapshot()});
  app.applyConfig=config=>{
    const okay=beforeApply(config);
    if(okay){apply(config?.layout||defaults());app.resetArtwork();}
    return okay;
  };
  app.getLayout=snapshot;app.setLayout=apply;app.toggleLayoutEditing=edit;
  render();app.reflowLayout();
})();