/* Dependency-free 3D neighborhood viewer. Coordinates are illustrative, not GPS.
   x/z = ground plane; y = height. Each floor is FLOOR units high.
   Edit BLOCKS to change the neighborhood; TARGET anchors the floor-4 signal. */
(() => {
  'use strict';
  const host = document.querySelector('.map-3d');
  const canvas = document.getElementById('city-canvas');
  if (!host || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) { host.classList.add('map-unavailable'); return; }
  const FLOOR = 24;
  // Nine street blocks. White corridors are reserved exclusively for roads.
  const BLOCKS = [];
  const columns = [[-207,-88],[-64,64],[88,207]];
  const rows = [[-203,-62],[-38,42],[66,203]];
  rows.forEach(([z0,z1],row)=>columns.forEach(([x0,x1],col)=>{
    BLOCKS.push({x0,x1,z0,z1,row,col});
  }));
  const BUILDINGS = [];
  function addBuilding(block,x0,x1,z0,z1,floors,featured=false) {
    BUILDINGS.push({x:(x0+x1)/2,z:(z0+z1)/2,w:x1-x0,d:z1-z0,
      floors,featured,block});
  }
  BLOCKS.forEach((block,index)=>{
    const {x0,x1,z0,z1,row,col}=block;
    const margin=6,gap=3;
    if((row===2 && col===1)||(row===1 && col===2)) {
      block.park=true;
      return;
    }
    if(row===1 && col===1) {
      // Preserve the original floor-four performance location.
      addBuilding(block,-38,38,-33,33,4,true);
      addBuilding(block,-60,-40,-34,8,2);
      // The east side remains an open forecourt.
      return;
    }
    const left=x0+margin,right=x1-margin,near=z0+margin,far=z1-margin;
    const W=right-left,D=far-near;
    if(row===2 && col===0) {
      // A broad low corner building and an L-shaped courtyard ensemble.
      addBuilding(block,left,left+W*.58,near,near+34,2);
      addBuilding(block,left+W*.61,right,near,near+46,3);
      addBuilding(block,left,right,far-28,far,2);
      addBuilding(block,left,left+25,near+37,far-31,1);
    } else if(row===0 && col===0) {
      // Unequal narrow street lots; a larger rear warehouse.
      let x=left;
      [0.22,0.31,0.41].forEach((fraction,i)=>{
        const w=W*fraction;
        addBuilding(block,x,x+w,near,near+36+i*6,2+i%2);x+=w+3;
      });
      addBuilding(block,left,left+W*.65,far-36,far,2);
      addBuilding(block,left+W*.68,right,far-44,far,3);
    } else if(row===0 && col===2) {
      addBuilding(block,left,left+W*.55,near,near+40,3);
      addBuilding(block,left+W*.59,right,near,near+34,5);
      addBuilding(block,left,left+W*.38,far-30,far,1);
      addBuilding(block,left+W*.42,right,far-42,far,2);
    } else if(row===1) {
      addBuilding(block,left,left+W*.45,near,far,2);
      addBuilding(block,left+W*.49,right,near,far-12,1);
    } else {
      const widths=index%2?[.37,.24,.33]:[.27,.43,.24];
      let x=left;
      widths.forEach((fraction,i)=>{
        const w=W*fraction;
        addBuilding(block,x,x+w,near,near+28+((i+index)%3)*7,2+(i===1?1:0));
        x+=w+3;
      });
      addBuilding(block,left,left+W*.46,far-32,far,2);
      addBuilding(block,left+W*.50,right,far-25,far,1);
    }
  });
  // Give each room a stable light so rotating the model never changes occupancy.
  let roomSeed = 498;
  function roomSample() {
    roomSeed = (Math.imul(roomSeed, 1664525) + 1013904223) >>> 0;
    return roomSeed / 4294967296;
  }
  const windowTints = ['#d5aa78', '#edc993', '#ac906e', '#aac2ca'];
  BUILDINGS.forEach((building, index) => {
    building.variant = index % 3;
    building.windows = {};
    const occupancy = 0.25 + roomSample() * 0.28;
    for (const side of ['back', 'front', 'left', 'right']) {
      const span = side === 'back' || side === 'front' ? building.w : building.d;
      const cols = Math.max(2, Math.min(5, Math.round(span / 17)));
      building.windows[side] = Array.from({length: building.floors}, () =>
        Array.from({length: cols}, () => roomSample() < occupancy
          ? windowTints[Math.floor(roomSample() * windowTints.length)] : '#213041'));
    }
  });
  const streetLamps = [
    {x:-85,z:-86}, {x:-67,z:15}, {x:-34,z:63},
    {x:67,z:-24}, {x:85,z:95}, {x:117,z:-59}
  ];
  const TREES = BLOCKS.filter(b=>b.park).flatMap(b=>{
    const xs=[b.x0+20,b.x1-20],zs=[b.z0+18,b.z1-18];
    return xs.flatMap((x,i)=>zs.map((z,j)=>({x,z,r:7+(i+j)%3,h:15+(i*2+j)*2})));
  });
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
    '#cdd2d5':'#697b8c', '#e0e4e6':'#283544', '#f1f3f4':'#374858',
    '#d4dadd':'#202d3d', '#e6eaec':'#304051', '#ffffff':'#536679',
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
    if(f.side==='top') {
      const b=f.b,h=b.floors*FLOOR;
      const x=b.x-b.w/2+4,X=b.x+b.w/2-4,z=b.z-b.d/2+4,Z=b.z+b.d/2-4;
      polygon([[x,h,z],[X,h,z],[X,h,Z],[x,h,Z]],night?'#475a6c':'#f0f3f4',night?'#5d7181':'#e1e6e8',.65);
      line([[x,h,Z],[x,h,z],[X,h,z]],night?'#334555':'#d4dde1',1.1);
      if(b.floors>=4 || b.variant===1) {
        const inset={x:b.x+6,z:b.z-5,w:b.w*.38,d:b.d*.35,floors:0.24};
        boxFaces(inset).sort((a,b)=>a.depth-b.depth).forEach(face=>{
          polygon(face.p.map(([px,py,pz])=>[px,py+h,pz]),face.color,night?'#718595':'#dce3e6',.5);
        });
      }
      return;
    }
    const a=f.p[0],b=f.p[1],h=f.b.floors*FLOOR;
    for(let floor=1;floor<f.b.floors;floor++) line([[a[0],floor*FLOOR,a[2]],[b[0],floor*FLOOR,b[2]]],(night?'#71849355':'#d2dadd65'),.5);
    for(let floor=0;floor<f.b.floors;floor++) {
      const windows = f.b.windows[f.side][floor];
      const cols = windows.length;
      for(let column=0;column<cols;column++) {
        const step=.84/cols,u=.08+column*step,v=u+step*(f.b.variant===2?.62:.46);
        polygon([[a[0]+(b[0]-a[0])*u,floor*FLOOR+7,a[2]+(b[2]-a[2])*u],
          [a[0]+(b[0]-a[0])*v,floor*FLOOR+7,a[2]+(b[2]-a[2])*v],
          [a[0]+(b[0]-a[0])*v,floor*FLOOR+16,a[2]+(b[2]-a[2])*v],
          [a[0]+(b[0]-a[0])*u,floor*FLOOR+16,a[2]+(b[2]-a[2])*u]],(night?windows[column]:f.b.featured?'#a5b5bf65':'#b3c0c947'),null);
      }
    }
    if(f.b.featured) {
      polygon([[a[0],72,a[2]],[b[0],72,b[2]],[b[0],96,b[2]],[a[0],96,a[2]]],(night?'#ef879329':'#e873791c'),null);
      line([[a[0],72,a[2]],[b[0],72,b[2]]],'#d87b8066',1);
    }
  }
  const clusterStyle = document.createElement('style');

clusterStyle.textContent = `
  .map-cluster {
    position: absolute;
    z-index: 8;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    transform: translate(-50%, -50%);
    border: 2px solid #fff;
    border-radius: 50%;
    background: #d94f60;
    color: #fff;
    box-shadow: 0 0 0 7px #e565701c;
    font: 600 14px "Segoe UI", Arial, sans-serif;
    cursor: pointer;
    touch-action: manipulation;
  }

  .map-cluster:hover {
    background: #be3e50;
    box-shadow: 0 0 0 10px #e5657026;
  }

  .map-cluster:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 6px;
  }
`;

document.head.append(clusterStyle);

const clusterButton = document.createElement('button');
clusterButton.type = 'button';
clusterButton.className = 'map-cluster';
clusterButton.textContent = '2';
clusterButton.hidden = true;

clusterButton.setAttribute(
  'aria-label',
  '2 nearby performances: Leo and Nina. Zoom in to explore.'
);

host.append(clusterButton);

let clusterPoint = null;
let focusFrame = 0;

function stopMapFocus() {
  cancelAnimationFrame(focusFrame);
  focusFrame = 0;
}

clusterButton.addEventListener('click', () => {
  if (!clusterPoint) return;

  stopMapFocus();

  const point = [...clusterPoint];
  const start = { ...view };
  const targetZoom = 2.2;

  view.zoom = targetZoom;
  view.panX = 0;
  view.panY = 0;

  const projected = project(point);

  const destination = {
    ...start,
    zoom: targetZoom,
    panX: width / 2 - projected.x,
    panY: height * 0.46 - projected.y
  };

  view = { ...start };

  if (reduced.matches) {
    view = destination;
    refresh();
    return;
  }

  const started = performance.now();

  function animate(now) {
    const progress = Math.min(1, (now - started) / 500);
    const ease = 1 - Math.pow(1 - progress, 3);

    view.zoom =
      start.zoom + (destination.zoom - start.zoom) * ease;

    view.panX =
      start.panX + (destination.panX - start.panX) * ease;

    view.panY =
      start.panY + (destination.panY - start.panY) * ease;

    refresh();

    if (progress < 1) {
      focusFrame = requestAnimationFrame(animate);
    } else {
      focusFrame = 0;
    }
  }

  focusFrame = requestAnimationFrame(animate);
});

canvas.addEventListener('pointerdown', stopMapFocus);
canvas.addEventListener('wheel', stopMapFocus, { passive: true });
canvas.addEventListener('keydown', stopMapFocus);

host.querySelectorAll('[data-map]').forEach(button => {
  button.addEventListener('click', stopMapFocus, true);
});

function getMapTargets(audience) {
  clusterButton.hidden = true;
  clusterPoint = null;

  if (!audience?.active) {
    return [{ point: TARGET }];
  }

  audience.pins.forEach(pin => {
    pin.style.visibility = 'hidden';
  });

  const targets = audience.gigs.map(g => ({
    point: g.point,
    id: g.id
  }));

  const leo = targets.find(target => target.id === 'leo');
  const nina = targets.find(target => target.id === 'nina');

  if (!leo || !nina) return targets;

  const a = project(leo.point);
  const b = project(nina.point);
  const screenDistance = Math.hypot(a.x - b.x, a.y - b.y);

  if (view.zoom >= 1.75 || screenDistance > 56) {
    return targets;
  }

  clusterPoint = leo.point.map(
    (value, index) => (value + nina.point[index]) / 2
  );

  return [
    ...targets.filter(target =>
      target.id !== 'leo' && target.id !== 'nina'
    ),
    {
      id: 'leo-nina-cluster',
      point: clusterPoint,
      cluster: true
    }
  ];
}

  // Fixed architectural lighting, with a subtle darkening near the ground.
  function drawFacade(f) {
    polygon(f.p,f.color,night?'#435463':'#c9d3d9',.55);
    if(f.side==='top') return;
    const pts=f.p.map(project);
    const top=Math.min(...pts.map(p=>p.y)),bottom=Math.max(...pts.map(p=>p.y));
    const gradient=ctx.createLinearGradient(0,top,0,bottom);
    gradient.addColorStop(0,'rgba(255,255,255,0.08)');
    gradient.addColorStop(1,night?'rgba(4,14,24,0.20)':'rgba(72,94,109,0.09)');
    ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle=gradient;ctx.fill();
  }
  function contactShadow(b) {
    const x=b.x-b.w/2,z=b.z-b.d/2;
    // Layered ground-space shadows remain attached during orbit and zoom.
    for(let i=5;i>=0;i--) {
      const spread=2+i*1.5;
      polygon([[x-spread,0.3,z-spread],[x+b.w+spread,0.3,z-spread],
        [x+b.w+spread,0.3,z+b.d+spread],[x-spread,0.3,z+b.d+spread]],
        night?'rgba(3,10,18,0.045)':'rgba(66,86,101,0.025)',null);
    }
    const dx=10+b.floors*2,dz=8+b.floors*1.3;
    polygon([[x,0.2,z],[x+b.w,0.2,z],[x+b.w+dx,0.2,z+dz],
      [x+b.w+dx,0.2,z+b.d+dz],[x+dx,0.2,z+b.d+dz],[x,0.2,z+b.d]],
      night?'rgba(3,10,18,0.18)':'rgba(89,109,123,0.08)',null);
  }
  function drawTree(t) {
    const base=project([t.x,0,t.z]),c=project([t.x,t.h,t.z]);
    const scale=Math.min(width/410,height/440)*view.zoom;
    line([[t.x,0,t.z],[t.x,t.h,t.z]],night?'#7c897b':'#a8b3a8',2*scale);
    const r=t.r*scale;
    const g=ctx.createRadialGradient(c.x-r*.3,c.y-r*.35,r*.1,c.x,c.y,r);
    g.addColorStop(0,night?'#56766b':'#d5e3d6');
    g.addColorStop(1,night?'#283e39':'#a7c0ad');
    ctx.beginPath();ctx.ellipse(c.x,c.y,r,r*.90,0,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
  }
  function drawLampPool(lamp) {
    const p = project([lamp.x, -2, lamp.z]);
    const scale = Math.min(width/410, height/440) * view.zoom;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale * Math.sin(view.pitch));
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 19);
    pool.addColorStop(0, 'rgba(255,202,135,0.32)');
    pool.addColorStop(0.45, 'rgba(248,191,122,0.16)');
    pool.addColorStop(1, 'rgba(248,191,122,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-19, -19, 38, 38);
    ctx.restore();
  }
  function drawStreetLamp(lamp) {
    const base = [lamp.x, 0, lamp.z], head = [lamp.x, 13, lamp.z];
    const p = project(head);
    const scale = Math.min(width/410, height/440) * view.zoom;
    line([base, head], '#71808a', scale);
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6 * scale);
    halo.addColorStop(0, '#ffdfab');
    halo.addColorStop(0.22, '#ffe0ada0');
    halo.addColorStop(1, '#ffd29a00');
    ctx.fillStyle = halo;
    ctx.fillRect(p.x - 6*scale, p.y - 6*scale, 12*scale, 12*scale);
  }
  function draw(time=0) {
    ctx.clearRect(0,0,width,height);
    polygon([[-207,-4,-203],[207,-4,-203],[207,-4,203],[-207,-4,203]],'#e4e8ea','#d6dcdf');
    // Quiet streets and raised building plots.
    for(const z of [-50,54]) polygon([[-207,-3,z-12],[207,-3,z-12],[207,-3,z+12],[-207,-3,z+12]],'#f8f9fa',null);
    for(const x of [-76,76]) polygon([[x-12,-3,-203],[x+12,-3,-203],[x+12,-3,203],[x-12,-3,203]],'#f8f9fa',null);
    for(const block of BLOCKS) {
      const {x0,x1,z0,z1}=block;
      polygon([[x0+1,-1,z0+1],[x1-1,-1,z0+1],[x1-1,-1,z1-1],[x0+1,-1,z1-1]],
        '#eef0f1','#d4dadd',.5);
      if(block.park) {
        const inset=9;
        polygon([[x0+inset,0,z0+inset],[x1-inset,0,z0+inset],
          [x1-inset,0,z1-inset],[x0+inset,0,z1-inset]],
          block.row===2?(night?'#48545b':'#e3e7e8'):(night?'#344d49':'#dbe6df'),null);
        const mx=(x0+x1)/2,mz=(z0+z1)/2;
        polygon([[mx-5,.1,z0+3],[mx+5,.1,z0+3],[mx+5,.1,z1-3],[mx-5,.1,z1-3]],
          night?'#536362':'#f3f4ef',null);
        polygon([[x0+3,.1,mz-4],[x1-3,.1,mz-4],[x1-3,.1,mz+4],[x0+3,.1,mz+4]],
          night?'#536362':'#f3f4ef',null);
        if(block.row===2) {
          // Low fountain basin: concentric ground-plane rings and short jets.
          const circle=(radius,y)=>Array.from({length:48},(_,i)=>{
            const a=i*Math.PI/24;return [mx+radius*Math.cos(a),y,mz+radius*Math.sin(a)];
          });
          polygon(circle(19,.3),night?'#2e3e49':'#bcc8cf',null);
          polygon(circle(17,3),night?'#596e7d':'#f8fafb',night?'#657d8a':'#c4ced4',.7);
          polygon(circle(13.5,3.1),night?'#477680':'#b8dadd',null);
          const seconds=reduced.matches?0:time/1000;
          // Expanding rings and travelling droplets share the map animation clock.
          for(let i=0;i<3;i++) {
            const phase=(seconds*.45+i/3)%1;
            line(circle(2+phase*11,3.2).concat([circle(2+phase*11,3.2)[0]]),
              `rgba(240,255,255,${(1-phase)*.65})`,.8);
          }
          for(let jet=0;jet<5;jet++) {
            const angle=jet*Math.PI*2/5;
            const arc=t=>[mx+Math.cos(angle)*11*t,
              3.3+Math.sin(Math.PI*t)*(17+Math.sin(seconds*1.6+jet)*1.2),
              mz+Math.sin(angle)*11*t];
            line(Array.from({length:19},(_,i)=>arc(i/18)),night?'#a8dce6aa':'#f5ffffd9',1.1);
            for(let drop=0;drop<3;drop++) {
              const t=(seconds*.7+drop/3+jet*.13)%1,pt=project(arc(t));
              ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(.6,view.zoom*.8),0,Math.PI*2);
              ctx.fillStyle=night?'#d6faff':'#ffffff';ctx.fill();
            }
          }
          for(const bz of [z0+17,z1-17]) {
            const facing=bz<mz?1:-1;
            const wood=night?'#81928c':'#acbcb3',edge=night?'#536b64':'#829b90';
            // Four separate seat slats with a visible front edge.
            for(let slat=0;slat<4;slat++) {
              const z=bz-3.5+slat*1.9;
              polygon([[mx-14,4,z],[mx+14,4,z],[mx+14,4,z+1.4],[mx-14,4,z+1.4]],wood,edge,.35);
            }
            const back=bz-facing*4;
            for(const x of [mx-10,mx+10]) {
              line([[x,0,bz-2.5],[x,4,bz-2.5],[x,4,bz+2.5],[x,0,bz+2.5]],
                night?'#9baba8':'#718782',1.2);
              line([[x,3,back],[x,10,back]],edge,1);
            }
            for(const y of [6.5,9])polygon([[mx-14,y,back],[mx+14,y,back],
              [mx+14,y+1.6,back],[mx-14,y+1.6,back]],wood,edge,.4);
            for(const x of [mx-13,mx+13])line([[x,4,bz+2*facing],[x,7,bz+2*facing],
              [x,7,back]],edge,1);
          }
        }
        // Flat planting beds keep the park visually open.
        for(const [tx,tz] of [[x0+22,z0+20],[x1-22,z0+20],[x0+22,z1-20],[x1-22,z1-20]]) {
          const ring=Array.from({length:20},(_,i)=>{
            const a=i*Math.PI/10;return [tx+8*Math.cos(a),.2,tz+8*Math.sin(a)];
          });
          polygon(ring,night?'#48635a':'#bfd2c6',null);
        }
      }
      // Clip all ground shadows to the block so the white roads stay clear.
      ctx.save();ctx.beginPath();
      [[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]].map(project).forEach((p,i)=>
        i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.closePath();ctx.clip();
      BUILDINGS.filter(b=>b.block===block).forEach(contactShadow);
      ctx.restore();
    }
    // Render each building as one solid object; do not interleave its walls
    // with another building's roof based on their different heights.
    const scene=[...BUILDINGS.map(b=>({building:b,depth:project([b.x,0,b.z]).depth})),
      ...TREES.map(t=>({tree:t,depth:project([t.x,0,t.z]).depth}))];
    if (night) {
      for (const lamp of streetLamps) {
        drawLampPool(lamp);
        scene.push({lamp, depth: project([lamp.x, 0, lamp.z]).depth});
      }
    }
    const walker = window.cornerAudience?.getState();
    if (walker?.active && walker.walkPath?.length) {
      const path = [[walker.position.x,walker.position.z], ...walker.walkPath];
      ctx.save();
      ctx.setLineDash([5,4]);
      line(path.map(([x,z]) => [x,1,z]), night ? '#8dd6ed' : '#307e9e', 2);
      ctx.restore();
    }
    scene.sort((a,b)=>a.depth-b.depth).forEach(item=>{
      if(item.lamp)drawStreetLamp(item.lamp);
      else if(item.tree)drawTree(item.tree);
      else boxFaces(item.building).sort((a,b)=>a.depth-b.depth).forEach(f=>{
        drawFacade(f);faceDetails(f);
      });
    });
    // Area signals remain visible through the illustrative buildings.
    const audience=walker;
    const targets = getMapTargets(audience);
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
      if (audience?.active) {
  if (target.cluster) {
    clusterButton.hidden = false;
    clusterButton.style.left = `${p.x}px`;
    clusterButton.style.top = `${p.y}px`;
  } else {
    const pin = audience.pins.get(target.id);

    if (pin) {
      pin.style.visibility = 'visible';
      pin.style.left = `${p.x}px`;
      pin.style.top = `${p.y}px`;
    }
  }
} else {
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
