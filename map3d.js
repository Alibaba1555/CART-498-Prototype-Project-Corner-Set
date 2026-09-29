/* Dependency-free 3D neighborhood viewer. Coordinates are illustrative, not GPS.
   x/z = ground plane; y = height. Each floor is FLOOR units high.
   Edit BUILDINGS to change the neighborhood; TARGET anchors the floor-4 signal. */
(() => {
  'use strict';
  const host = document.querySelector('.map-3d');
  const canvas = document.getElementById('city-canvas');
  if (!host || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) { host.classList.add('map-unavailable'); return; }
  const FLOOR = 24;
  const BUILDINGS = [
    {x:0,z:0,w:76,d:66,floors:6,featured:true},
    {x:-126,z:-82,w:62,d:70,floors:4},
    {x:116,z:-106,w:75,d:56,floors:5},
    {x:-133,z:72,w:62,d:62,floors:2},
    {x:127,z:69,w:64,d:64,floors:3},
    {x:0,z:-142,w:60,d:46,floors:2},
    {x:5,z:130,w:67,d:47,floors:2}
  ];
  const TARGET = [0, FLOOR * 3.5, 34]; // middle of floor 4, front facade
  const initial = {yaw:-0.58,pitch:0.52,zoom:1,panX:0,panY:0};
  let view = {...initial}, width=0, height=0, visible=true, frame=0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointers = new Map();
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function project([x,y,z]) {
    const cx=x*Math.cos(view.yaw)-z*Math.sin(view.yaw);
    const cz=x*Math.sin(view.yaw)+z*Math.cos(view.yaw);
    const cy=(y-48)*Math.cos(view.pitch)-cz*Math.sin(view.pitch);
    const depth=(y-48)*Math.sin(view.pitch)+cz*Math.cos(view.pitch);
    const scale=Math.min(width/410,height/440)*view.zoom;
    return {x:width/2+cx*scale+view.panX,y:height*.51-cy*scale+view.panY,depth};
  }
  let night = document.documentElement.dataset.theme === 'night';
  const nightPalette = {
    '#cdd2d5':'#697b8c', '#e0e4e6':'#465564', '#f1f3f4':'#617181',
    '#d4dadd':'#394959', '#e6eaec':'#526373', '#ffffff':'#8292a0',
    '#c9d0d4':'#81909d', '#bac5cc70':'#c7dcd64d', '#e8737930':'#ef87933d',
    '#d87b8066':'#f49aa188', '#e4e8ea':'#303e4b', '#d6dcdf':'#536371',
    '#f8f9fa':'#23303d', '#eef0f1':'#3b4a58', '#aab4bd28':'#070f1966'
  };
  const themed = color => night ? (nightPalette[color] || color) : color;
  function polygon(points,fill,stroke='#cdd2d5',line=0.7) {
    const pts=points.map(project);
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle=themed(fill);ctx.fill();if(stroke){ctx.strokeStyle=themed(stroke);ctx.lineWidth=line;ctx.stroke();}
  }
  function line(points,color,lineWidth=1) {
    ctx.beginPath();points.map(project).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=themed(color);ctx.lineWidth=lineWidth;ctx.stroke();
  }
  function boxFaces(b) {
    const x=b.x-b.w/2,X=b.x+b.w/2,z=b.z-b.d/2,Z=b.z+b.d/2,h=b.floors*FLOOR;
    const faces=[
      {p:[[x,0,z],[X,0,z],[X,h,z],[x,h,z]],color:'#e0e4e6',side:'back'},
      {p:[[X,0,Z],[x,0,Z],[x,h,Z],[X,h,Z]],color:'#f1f3f4',side:'front'},
      {p:[[x,0,Z],[x,0,z],[x,h,z],[x,h,Z]],color:'#d4dadd',side:'left'},
      {p:[[X,0,z],[X,0,Z],[X,h,Z],[X,h,z]],color:'#e6eaec',side:'right'},
      {p:[[x,h,z],[X,h,z],[X,h,Z],[x,h,Z]],color:'#ffffff',side:'top'}
    ];
    faces.forEach(f=>{f.b=b;f.depth=f.p.reduce((s,p)=>s+project(p).depth,0)/4;});return faces;
  }
  function faceDetails(f) {
    if(f.side==='top') return;
    const a=f.p[0],b=f.p[1],h=f.b.floors*FLOOR;
    for(let floor=1;floor<f.b.floors;floor++) line([[a[0],floor*FLOOR,a[2]],[b[0],floor*FLOOR,b[2]]],'#c9d0d4',.7);
    for(let floor=0;floor<f.b.floors;floor++) {
      for(let column=0;column<3;column++) {
        const u=.12+column*.29,v=u+.16;
        polygon([[a[0]+(b[0]-a[0])*u,floor*FLOOR+7,a[2]+(b[2]-a[2])*u],
          [a[0]+(b[0]-a[0])*v,floor*FLOOR+7,a[2]+(b[2]-a[2])*v],
          [a[0]+(b[0]-a[0])*v,floor*FLOOR+16,a[2]+(b[2]-a[2])*v],
          [a[0]+(b[0]-a[0])*u,floor*FLOOR+16,a[2]+(b[2]-a[2])*u]],'#bac5cc70',null);
      }
    }
    if(f.b.featured) {
      polygon([[a[0],72,a[2]],[b[0],72,b[2]],[b[0],96,b[2]],[a[0],96,a[2]]],'#e8737930',null);
      line([[a[0],72,a[2]],[b[0],72,b[2]]],'#d87b8066',1);
    }
  }
  function draw(time=0) {
    ctx.clearRect(0,0,width,height);
    polygon([[-207,-4,-203],[207,-4,-203],[207,-4,203],[-207,-4,203]],'#e4e8ea','#d6dcdf');
    // Quiet streets and raised building plots.
    for(const z of [-50,54]) polygon([[-207,-3,z-12],[207,-3,z-12],[207,-3,z+12],[-207,-3,z+12]],'#f8f9fa',null);
    for(const x of [-76,76]) polygon([[x-12,-3,-203],[x+12,-3,-203],[x+12,-3,203],[x-12,-3,203]],'#f8f9fa',null);
    for(const b of BUILDINGS) {
      const x=b.x-b.w/2,z=b.z-b.d/2;
      polygon([[x-8,0,z-8],[x+b.w+8,0,z-8],[x+b.w+8,0,z+b.d+8],[x-8,0,z+b.d+8]],'#eef0f1','#d4dadd');
      polygon([[x+7,1,z+8],[x+b.w+23,1,z+8],[x+b.w+23,1,z+b.d+21],[x+7,1,z+b.d+21]],'#aab4bd28',null);
    }
    BUILDINGS.flatMap(boxFaces).sort((a,b)=>a.depth-b.depth).forEach(f=>{polygon(f.p,f.color);faceDetails(f);});
    // Area signals remain visible through the illustrative buildings.
    const audience=window.cornerAudience?.getState();
    const targets=audience?.active?audience.gigs.map(g=>({point:g.point,id:g.id})):[{point:TARGET}];
    for(const target of targets){
      const p=project(target.point);
      for(let i=0;i<3;i++) {
        const phase=reduced.matches?(i+1)/3:((time/2600+i/3)%1);
        const r=(10+phase*58)*Math.min(width/390,1.2)*Math.sqrt(view.zoom);
        const alpha=(1-phase)*(night?.38:.24);
        ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
        ctx.fillStyle=`rgba(226,87,100,${alpha*.18})`;ctx.fill();
        ctx.strokeStyle=`rgba(226,87,100,${alpha})`;ctx.lineWidth=1.5;ctx.stroke();
      }
      ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle='#e56570';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();
      if(audience?.active){
        const pin=audience.pins.get(target.id);pin.style.left=`${p.x}px`;pin.style.top=`${p.y}px`;
      }else{
        const label=document.getElementById('floor-label');
        label.style.left=`${clamp(p.x+17,12,width-118)}px`;
        label.style.top=`${clamp(p.y-24,65,height-120)}px`;
      }
    }
    if(audience?.active){
      const p=project([audience.position.x,8,audience.position.z]);
      audience.myPin.style.left=`${p.x}px`;audience.myPin.style.top=`${p.y}px`;
    }
  }
  function loop(t){frame=0;if(!visible||document.hidden)return;draw(t);if(!reduced.matches)frame=requestAnimationFrame(loop);}
  function refresh(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
  function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);refresh();}
  const distance=ps=>Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.classList.add('is-dragging');});
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    const previous=pointers.get(e.pointerId),before=[...pointers.values()];
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    if(pointers.size===2){const after=[...pointers.values()];const d=distance(before);if(d>0)view.zoom=clamp(view.zoom*distance(after)/d,.65,2.4);view.panX=clamp(view.panX+dx/2,-width*.35,width*.35);view.panY=clamp(view.panY+dy/2,-height*.25,height*.25);}
    else if(e.shiftKey||e.buttons===2){view.panX=clamp(view.panX+dx,-width*.35,width*.35);view.panY=clamp(view.panY+dy,-height*.25,height*.25);}
    else {view.yaw+=dx*.008;view.pitch=clamp(view.pitch+dy*.006,.15,1.1);}
    refresh();
  });
  function release(e){pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('is-dragging');}
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,release));
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoom=clamp(view.zoom*Math.exp(-e.deltaY*.001),.65,2.4);refresh();},{passive:false});
  const reset=()=>{view={...initial};refresh();};
  canvas.addEventListener('dblclick',reset);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0','Home'].includes(e.key))return;e.preventDefault();
    if(e.key==='ArrowLeft')view.yaw-=.12;if(e.key==='ArrowRight')view.yaw+=.12;
    if(e.key==='ArrowUp')view.pitch=clamp(view.pitch-.08,.15,1.1);if(e.key==='ArrowDown')view.pitch=clamp(view.pitch+.08,.15,1.1);
    if(e.key==='+'||e.key==='=')view.zoom=clamp(view.zoom*1.15,.65,2.4);if(e.key==='-')view.zoom=clamp(view.zoom/1.15,.65,2.4);
    if(e.key==='0'||e.key==='Home')reset();refresh();
  });
  host.querySelector('[data-map="in"]').addEventListener('click',()=>{view.zoom=clamp(view.zoom*1.2,.65,2.4);refresh();});
  host.querySelector('[data-map="out"]').addEventListener('click',()=>{view.zoom=clamp(view.zoom/1.2,.65,2.4);refresh();});
  host.querySelector('[data-map="reset"]').addEventListener('click',reset);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}else{resize();refresh();}}).observe(canvas);
  document.addEventListener('visibilitychange',refresh);
  reduced.addEventListener('change',refresh);
  document.addEventListener('corner-map-update',refresh);
  document.addEventListener('corner-theme-change',()=>{night=document.documentElement.dataset.theme==='night';refresh();});
  resize();
})();
