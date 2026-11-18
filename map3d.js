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
      BUILDINGS.at(-1).landmark = "corner-set";
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
  // Distinct rear blocks: corner cafe, market hall, and adapted music warehouse.
  const rear = columns.map(([x0,x1],i)=>{
    const block={x0,x1,z0:-300,z1:-227,row:3,col:i};
    BLOCKS.push(block);return block;
  });
  addBuilding(rear[0],-198,-137,-286,-242,1);
  BUILDINGS.at(-1).landmark='cafe';
  addBuilding(rear[0],-130,-98,-291,-249,3);
  addBuilding(rear[1],-53,52,-288,-249,1);
  BUILDINGS.at(-1).landmark='market';
  addBuilding(rear[2],100,195,-292,-245,2);
  BUILDINGS.at(-1).landmark='warehouse';
  // Staggered western frontage leaves a clear junction and an open waterfront.
  const westBlock={x0:-335,x1:-247,z0:12,z1:149,row:4,col:0};
  BLOCKS.push(westBlock);
  addBuilding(westBlock,-326,-280,21,77,3);
  addBuilding(westBlock,-314,-254,87,132,2);
  BUILDINGS.at(-1).landmark='cafe';
  // Complete the northwest corner without filling the foreground sightline.
  for(const [z0,z1] of [[-300,-227],[-203,-62],[-38,-12]]) {
    const b={x0:-335,x1:-247,z0,z1,row:5,col:0};BLOCKS.push(b);
    if(z1-z0>60){
      addBuilding(b,-326,-290,z0+9,z0+48,2);
      addBuilding(b,-283,-257,z0+13,z1-9,1);
    }
  }
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
  TREES.push({x:-327,z:173,r:7,h:18},{x:-253,z:298,r:6,h:16});
  const KIOSKS=[
    {x:-307,z:248,w:30,d:23,tone:'food'},
    {x:-260,z:248,w:26,d:23,tone:'coffee'},
    {x:153,z:259,w:36,d:28,tone:'coffee'}
  ];
  streetLamps.push({x:-239,z:155},{x:-316,z:322},{x:-248,z:322});
  const TARGET = [0, FLOOR * 3.5, 34]; // middle of floor 4, front facade
  const initial = {yaw:-0.58,pitch:0.46,zoom:1.12,panX:0,panY:0};
  let defaultFraming=true;
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
    return {x:width/2+(cx-34*Math.sin(.58))*scale+view.panX,y:height*.51-cy*scale+view.panY,depth};
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
  // Paint lettering in its vertical world plane so it turns with the roof.
  function signText(label, x, y, z, width, height, color) {
    const base = project([x,y,z]), right = project([x+width,y,z]);
    const top = project([x,y+height,z]);
    ctx.save();
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(label);
    const cap = metrics.actualBoundingBoxAscent || 46;
    ctx.transform((right.x-base.x)/metrics.width,(right.y-base.y)/metrics.width,
      (base.x-top.x)/cap,(base.y-top.y)/cap,base.x,base.y);
    ctx.fillStyle = color;
    ctx.fillText(label,0,0);
    ctx.restore();
  }

  function drawRoofSign(b) {
    const y = b.floors*FLOOR, z = b.z+4;
    const steel = night ? '#83939a' : '#849298';
    for (const dx of [-38,0,38]) {
      const x = b.x+dx;
      line([[x,y,z-8],[x,y+13,z],[x,y,z]],steel,.85);
    }
    for (const rise of [5,12])
      line([[b.x-44,y+rise,z],[b.x+44,y+rise,z]],steel,.65);
    const frontFirst = project([0,0,1]).depth < project([0,0,0]).depth;
    for (const offset of (frontFirst ? [2,1,0] : [0,1,2])) {
      const face = offset === 2;
      signText('CORNER SET',b.x,y+4,z+offset,91,14,
        face ? (night ? '#ff9786' : '#b55850') : '#794846');
    }
  }

  function nookArc(radius,height,start,end) {
    return Array.from({length:25},(_,i)=>{
      const angle = start+(end-start)*i/24;
      return [23+radius*Math.cos(angle),height,278+radius*Math.sin(angle)];
    });
  }

  function drawNookBench() {
    const a = Math.PI*.78, b = Math.PI*1.22;
    for (const angle of [a+.1,b-.1]) {
      const x=23+47*Math.cos(angle), z=278+47*Math.sin(angle);
      line([[x,-2,z],[x,3,z]],night?'#81918d':'#81958d',1.5);
    }
    for (const radius of [45,47,49]) {
      polygon([...nookArc(radius,3,a,b),...nookArc(radius+1.6,3,b,a)],
        night?'#84968c':'#adbbb0',night?'#60766d':'#899d90',.35);
    }
  }

  function drawNookBoard() {
    const x=44,z=250;
    for (const dx of [-6,6])
      line([[x+dx,-2,z-4],[x+dx,10,z],[x+dx,-2,z+3]],'#9e8c77',.9);
    polygon([[x-7,0,z+2.5],[x+7,0,z+2.5],[x+7,10,z],[x-7,10,z]],
      night?'#384947':'#455954','#b7a58c',.7);
    signText('LIVE',x,5.7,z+1.4,9,2.9,'#eee9d8');
    signText('SETS',x,1.6,z+2.5,9,2.9,'#eee9d8');
  }

  function faceDetails(f) {
    if(f.side==='top') {
      const b=f.b,h=b.floors*FLOOR;
      const x=b.x-b.w/2+4,X=b.x+b.w/2-4,z=b.z-b.d/2+4,Z=b.z+b.d/2-4;
      polygon([[x,h,z],[X,h,z],[X,h,Z],[x,h,Z]],night?'#475a6c':'#f0f3f4',night?'#5d7181':'#e1e6e8',.65);
      line([[x,h,Z],[x,h,z],[X,h,z]],night?'#334555':'#d4dde1',1.1);
      if(!b.landmark && (b.floors>=4 || b.variant===1)) {
        const inset={x:b.x+6,z:b.z-5,w:b.w*.38,d:b.d*.35,floors:0.24};
        boxFaces(inset).sort((a,b)=>a.depth-b.depth).forEach(face=>{
          polygon(face.p.map(([px,py,pz])=>[px,py+h,pz]),face.color,night?'#718595':'#dce3e6',.5);
        });
      }
      if(b.landmark==='corner-set') drawRoofSign(b);
      if(b.landmark==='market') {
        // Three sawtooth bays; pale glazing faces the quieter rear street.
        for(let i=0;i<3;i++){
          const x0=x+i*(X-x)/3,x1=x+(i+1)*(X-x)/3;
          polygon([[x0,h,z],[x1,h+9,z],[x1,h+9,Z],[x0,h,Z]],night?'#617987':'#e3ebed','#b8c6ce',.6);
          polygon([[x1,h,z],[x1,h+9,z],[x1,h+9,Z],[x1,h,Z]],night?'#a1c4ca':'#c4dce2','#aebfc7',.5);
        }
      }
      if(b.landmark==='warehouse') {
        const chimney={x:b.x-24,z:b.z-5,w:8,d:9,floors:0.65};
        boxFaces(chimney).sort((a,b)=>a.depth-b.depth).forEach(face=>
          polygon(face.p.map(([x,y,z])=>[x,y+h,z]),face.color,'#9baeb8',.6));
        const tx=b.x+20,tz=b.z-4;
        const circle=(r,y)=>Array.from({length:33},(_,i)=>[tx+r*Math.cos(i*Math.PI/16),y,tz+r*Math.sin(i*Math.PI/16)]);
        for(const dx of [-6,6])for(const dz of [-6,6])
          line([[tx+dx,h,tz+dz],[tx+dx,h+9,tz+dz]],night?'#8797a1':'#aebbc1',1);
        const faces=[];
        for(let i=0;i<24;i++){
          const a=i*Math.PI/12,c=(i+1)*Math.PI/12;
          const q=[[tx+10*Math.cos(a),h+9,tz+10*Math.sin(a)],[tx+10*Math.cos(c),h+9,tz+10*Math.sin(c)],[tx+10*Math.cos(c),h+25,tz+10*Math.sin(c)],[tx+10*Math.cos(a),h+25,tz+10*Math.sin(a)]];
          faces.push({q,depth:q.reduce((n,v)=>n+project(v).depth,0)/4});
        }
        faces.sort((a,b)=>a.depth-b.depth).forEach(f=>polygon(f.q,night?'#76828a':'#c5cfd2','#a1afb6',.4));
        polygon(circle(10,h+25),night?'#8c9ba4':'#e1e7e8','#a1afb6',.6);
        line(circle(10.2,h+13),night?'#a4b0b5':'#adbcc2',.6);
        line(circle(10.2,h+21),night?'#a4b0b5':'#adbcc2',.6);
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
    if(f.side==='front' && f.b.landmark) {
      const b=f.b,x=b.x-b.w/2+4,X=b.x+b.w/2-4,z=b.z+b.d/2;
      if(b.landmark==='cafe') {
        // Subdued striped canvas awning and broad ground-floor shop windows.
        for(let i=0;i<6;i++){
          const l=x+(X-x)*i/6,r=x+(X-x)*(i+1)/6;
          polygon([[l,17,z],[r,17,z],[r,14,z+8],[l,14,z+8]],
            i%2?(night?'#8daba4':'#bccfc8'):(night?'#bdc9c5':'#eef1eb'),'#a7b8b3',.35);
        }
      } else {
        polygon([[x+4,5,z+.1],[X-4,5,z+.1],[X-4,17,z+.1],[x+4,17,z+.1]],
          night?'#b5b994':'#c6d5db',null);
        for(let px=x+10;px<X-4;px+=14)line([[px,5,z+.2],[px,17,z+.2]],night?'#6e818c':'#eef1f2',1);
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
  function drawWaterfrontLandmark(kind,time) {
    const seconds=reduced.matches?0:time/1000;
    if(kind==='pier'){
      const cuboid=(x,z,w,d,y,h)=>{
        boxFaces({x,z,w,d,floors:h/FLOOR}).sort((a,b)=>a.depth-b.depth).forEach(f=>
          polygon(f.p.map(([px,py,pz])=>[px,py+y,pz]),
            night?(f.side==='top'?'#958a75':'#645f55'):(f.side==='top'?'#d2c5ad':'#a99d87'),'#99aaa9',.5));
      };
      for(const x of [66,86])for(const z of [344,365,390])cuboid(x,z,3,3,-12,14);
      cuboid(76,361,28,58,-1,4);
      cuboid(76,392,48,16,-1,4);
      for(let z=335;z<390;z+=5)line([[63,3.1,z],[89,3.1,z]],night?'#b0a58c':'#b5a58d',.5);
      for(let z=386;z<=398;z+=4)line([[53,3.1,z],[99,3.1,z]],night?'#b0a58c':'#b5a58d',.5);
      for(const x of [55,97])cuboid(x,396,3,3,3,5);
    } else {
      const bob=Math.sin(seconds*1.4)*.65;
      const cx=117,cz=389;
      const point=(x,y,z)=>[cx+x,y-4+bob+Math.sin(seconds*.9)*x*.035,cz+z];
      // Small moored skiff; a taut line attaches it to the pier, not open water.
      line([[97,5,396],point(-8,-2,0)],night?'#879fa5':'#9aadb2',.7);
      const hull=[[-7,-3,-17],[7,-3,-17],[8,-3,10],[0,-3,21],[-8,-3,10]];
      polygon(hull.map(v=>point(...v)),night?'#899da4':'#ecf0ed','#a0b6bd',.9);
      polygon([[-4,-2,-12],[4,-2,-12],[5,-2,8],[0,-2,15],[-5,-2,8]].map(v=>point(...v)),night?'#425963':'#b6cbd0',null);
      for(const z of [-7,5])line([point(-5,-1,z),point(5,-1,z)],night?'#a9b3a6':'#ded9c6',2);
      for(let i=0;i<3;i++){
        const phase=reduced.matches?(i+1)/3:(seconds*.22+i/3)%1;
        ctx.save();ctx.globalAlpha=(1-phase)*.45;
        line(Array.from({length:25},(_,j)=>{const a=j*Math.PI/12;return [cx+(12+phase*12)*Math.cos(a),-9.5,cz+(24+phase*10)*Math.sin(a)];}),night?'#8db2bd':'#edf8f8',.8);
        ctx.restore();
      }
    }
  }
  function drawParkBench(mx,bz,facing=1) {
    const wood=night?'#81928c':'#acbcb3',edge=night?'#536b64':'#829b90';
    for(let slat=0;slat<4;slat++){
      const z=bz-3.5+slat*1.9;
      polygon([[mx-14,4,z],[mx+14,4,z],[mx+14,4,z+1.4],[mx-14,4,z+1.4]],wood,edge,.35);
    }
    const back=bz-facing*4;
    for(const x of [mx-10,mx+10]){
      line([[x,0,bz-2.5],[x,4,bz-2.5],[x,4,bz+2.5],[x,0,bz+2.5]],night?'#9baba8':'#718782',1.2);
      line([[x,3,back],[x,10,back]],edge,1);
    }
    for(const y of [6.5,9])polygon([[mx-14,y,back],[mx+14,y,back],[mx+14,y+1.6,back],[mx-14,y+1.6,back]],wood,edge,.4);
    for(const x of [mx-13,mx+13])line([[x,4,bz+2*facing],[x,7,bz+2*facing],[x,7,back]],edge,1);
  }
  function drawStreetFurniture(k,bench=false) {
    const faces=[];
    const add=(p,color)=>faces.push({p,color,depth:p.reduce((v,p)=>v+project(p).depth,0)/p.length});
    const solid=(x,z,w,d,base,h,color)=>{
      const center=project([x,base+h/2,z]).depth;
      boxFaces({x,z,w,d,floors:h/FLOOR}).forEach(f=>{
        const p=f.p.map(([px,py,pz])=>[px,py+base,pz]);
        const depth=p.reduce((v,p)=>v+project(p).depth,0)/4;
        if(f.side!=='top' && depth<center-.001)return;
        add(p,f.side==='top'?color:(night?'#586b73':'#c4d0d3'));
      });
    };
    const {x,z,w,d}=k;
    if(bench){
      const wood=night?'#a89a7d':'#c3b497';
      for(const dx of [-11,11])for(const dz of [-3,3])solid(x+dx,z+dz,1.6,1.6,0,5,'#9eafb0');
      for(let i=0;i<4;i++)solid(x,z-3+i*2,29,1.5,5,1,wood);
      for(const dx of [-11,11])solid(x+dx,z-4,1.4,1.4,5,8,'#9eafb0');
      for(const y of [9,12])solid(x,z-4,29,1.2,y,1.8,wood);
      for(const dx of [-14,14])solid(x+dx,z,1.4,8,8,1,'#a1b3b0');
    } else {
      // Separate solid shell, service hatch, and projecting canopy; no coplanar panels.
      solid(x,z,w,d,0,20,night?'#a7b8b7':'#edf1ec');
      const front=z+d/2;
      const frontVisible=project([x,10,front]).depth>project([x,10,z]).depth;
      if(frontVisible){
        add([[x-w*.35,9,front+.12],[x+w*.35,9,front+.12],[x+w*.35,17,front+.12],[x-w*.35,17,front+.12]],night?'#cbb997':'#536b73');
        // Window jambs and a clear sill, inset well below the canopy.
        for(const dx of [-w*.37,w*.37])solid(x+dx,front+.4,1.2,1.2,8.5,9,'#e5ece8');
        solid(x,front+.4,w*.76,1.2,17.5,1,'#e5ece8');
      }
      solid(x,front+2,w*.82,4,8,1.6,night?'#bbaa8c':'#d7c9af');
      solid(x,z+2,w+4,d+10,21,1.8,night?'#a6b9af':'#d7e3db');
      const roof=faces.find(f=>f.p.every(p=>Math.abs(p[1]-22.8)<.001));
      if(roof)roof.roofTexture=k;
    }
    faces.sort((a,b)=>a.depth-b.depth).forEach(f=>{
      polygon(f.p,f.color,night?'#899ca2':'#aebfc2',.4);
      if(f.roofTexture){
        const {x,z,w,d,tone}=f.roofTexture;
        for(let i=0;i<6;i++){
          const l=x-(w+4)/2+(w+4)*i/6,r=l+(w+4)/6;
          polygon([[l,22.8,z-d/2-3],[r,22.8,z-d/2-3],[r,22.8,z+d/2+7],[l,22.8,z+d/2+7]],
            i%2?(night?'#becac2':'#f1f3ec'):(tone==='food'?'#c5a68b':'#a4bdb0'),null);
        }
        line([...f.p,f.p[0]],night?'#899ca2':'#aebfc2',.4);
      }
    });
  }
  function drawKiosk(k){drawStreetFurniture(k);}
  function drawPlanter(x,z){
    const b={x,z,w:18,d:11,floors:4/FLOOR};
    boxFaces(b).sort((a,b)=>a.depth-b.depth).forEach(f=>polygon(f.p,
      f.side==='top'?(night?'#5c7767':'#a8c0ab'):(night?'#617477':'#c6d3d0'),'#a1b4b3',.5));
    for(const dx of [-5,0,5])line([[x+dx,4,z],[x+dx+1,7,z-1]],night?'#91a99a':'#87a58f',1.5);
  }
  function drawAir(item,time) {
    if(item.smoke){
      const {x,y,z,r,alpha}=item.smoke,p=project([x,y,z]);
      const scale=Math.min(width/410,height/440)*view.zoom;
      ctx.save();ctx.globalAlpha=alpha;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*scale);
      g.addColorStop(0,night?'#c4d2db':'#b5c3cb');g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r*scale,0,Math.PI*2);ctx.fill();ctx.restore();
      return;
    }
    const {x,y,z,heading,phase}=item.bird;
    const flap=Math.sin(phase)*6;
    const size=.32;
    const at=(a,b,c)=>[x+size*(a*Math.cos(heading)-c*Math.sin(heading)),y+b*size,z+size*(a*Math.sin(heading)+c*Math.cos(heading))];
    const faces=[
      {p:[at(-2,0,-3),at(2,0,-3),at(0,3,1),at(0,0,6)],c:'#c3ced2'},
      {p:[at(-1,1,0),at(-12,flap,-3),at(-6,flap*.5,5)],c:'#e3e9eb'},
      {p:[at(1,1,0),at(12,flap,-3),at(6,flap*.5,5)],c:'#adbdc6'},
      {p:[at(-1,1,5),at(1,1,5),at(0,2,9)],c:'#d8e0e3'}
    ];
    faces.sort((a,b)=>a.p.reduce((v,p)=>v+project(p).depth,0)-b.p.reduce((v,p)=>v+project(p).depth,0))
      .forEach(f=>polygon(f.p,f.c,night?'#8ca0ae':'#9eafb7',.4));
  }
  function draw(time=0) {
    ctx.clearRect(0,0,width,height);
    // Continuous waterfront: street -> recreation apron -> promenade -> river.
    // Open foreground preserves sightlines toward the original performance blocks.
    const flat=(x0,z0,x1,z1,y,color,edge=null)=>
      polygon([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],color,edge);
    flat(-359,-308,223,345,-5,night?'#283744':'#e5eaeb');
    flat(-359,345,223,450,-10,night?'#203d4a':'#b9d5dc');
    // A cross street connects the existing street grid to the recreation area.
    flat(-223,204,223,226,-3,night?'#23303d':'#f8f9fa');
    for(const x of [-76,76]) {
      for(let dx=-8;dx<=8;dx+=4) flat(x+dx,207,x+dx+2,223,-2.8,night?'#6e818b':'#d2dadc');
    }
    flat(-223,311,223,345,-2,night?'#52616a':'#d8dedc');
    line([[-220,-1,344],[220,-1,344]],night?'#87969d':'#b1bfc4',1.3);
    // Western street continues into a pedestrian forecourt rather than a dead edge.
    flat(-343,0,-224,160,-5,night?'#283744':'#e5eaeb');
    flat(-247,0,-224,226,-3,night?'#23303d':'#f8f9fa');
    flat(-343,160,-224,311,-3,night?'#3d5054':'#e2e8e4');
    flat(-343,204,-224,226,-2.8,night?'#536368':'#eef0eb');
    // Level paved forecourt: stalls face a clear waterfront pedestrian aisle.
    flat(-337,231,-234,280,-2.5,night?'#45565e':'#e4e8e5');
    flat(-337,280,-234,311,-2.4,night?'#55676b':'#f1f2ec');
    // Coast and promenade continue past the recreation grounds.
    flat(-359,311,-223,345,-2,night?'#52616a':'#d8dedc');

    // Coherent parallel currents: long, shallow curves drifting in one direction.
    const waterTime=reduced.matches?0:time/1000;
    for(let row=0;row<6;row++){
      const z=355+row*16;
      for(let segment=0;segment<5;segment++){
        const phase=(waterTime*.028+segment*.2+row*.073)%1;
        const x=-450+phase*800;
        const length=48+12*Math.sin(row*1.7+segment);
        ctx.save();ctx.globalAlpha=Math.sin(Math.PI*phase)**2*.23;
        const points=Array.from({length:25},(_,i)=>{
          const px=x+i/24*length;
          return [px,-9.7,z+Math.sin(px*.016-waterTime*.35+row*.4)*.8];
        }).filter(p=>p[0]>-355&&p[0]<219);
        if(points.length>1)line(points,night?'#92b8c1':'#edf7f6',.65);
        ctx.restore();
      }
    }
    // Dark near-shore depth and the vertical stone retaining wall.
    flat(-359,345,223,351,-9.8,night?'#1c3540':'#a9c8cd');
    polygon([[-359,-2,345],[223,-2,345],[223,-10,345],[-359,-10,345]],
      night?'#52636b':'#b3c0c2',night?'#74848a':'#a4b4b8',.6);
    flat(-359,341,223,345,-1.8,night?'#8b989b':'#dce3df');
    for(let x=-350;x<223;x+=24)
      line([[x,-2.1,345.1],[x,-9.5,345.1]],night?'#6b7c82':'#97aaae',.5);
    // Grounded, quiet shadows beneath the pier and boat.
    polygon([[60,-9.6,345],[91,-9.6,345],[104,-9.6,401],[52,-9.6,401]],
      night?'#142b3440':'#789ba733',null);
    polygon(Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return [117+10*Math.cos(a),-9.6,389+23*Math.sin(a)];}),
      night?'#132a3440':'#648e9a30',null);
    // Small current rings at the pilings, sharing the existing animation clock.
    for(const x of [66,86])for(const z of [365,390]){
      const phase=reduced.matches?.35:(waterTime*.3+x*.02+z*.01)%1;
      ctx.save();ctx.globalAlpha=(1-phase)*.24;
      line(Array.from({length:25},(_,i)=>{const a=i*Math.PI/12;return [x+(2+phase*4)*Math.cos(a),-9.5,z+(2+phase*4)*Math.sin(a)];}),night?'#92bcc5':'#edf8f6',.6);
      ctx.restore();
    }
    line([[-357,5,344],[-223,5,344]],night?'#87969d':'#aab9bd',.8);
    for(let x=-355;x<-223;x+=22)line([[x,-1,344],[x,5,344]],night?'#87969d':'#aab9bd',.7);
    // A striped crossing connects the western forecourt to the original sidewalk.
    for(let z=185;z<201;z+=4)flat(-246,z,-225,z+2,-2.6,night?'#87969d':'#cad6d7');
    // One regulation-proportioned neighborhood court with a generous run-off area.
    flat(-203,232,-55,309,-2,night?'#42565a':'#d0dad5');
    flat(-193,237,-65,305,-1.8,night?'#496963':'#96b5aa');
    const paint=night?'#cad9d3':'#f4f6ef';
    line([[-193,-1.6,237],[-65,-1.6,237],[-65,-1.6,305],[-193,-1.6,305],[-193,-1.6,237]],paint,1);
    line([[-129,-1.6,237],[-129,-1.6,305]],paint,1);
    const ring=(x,z,r,y)=>Array.from({length:49},(_,i)=>[x+r*Math.cos(i*Math.PI/24),y,z+r*Math.sin(i*Math.PI/24)]);
    line(ring(-129,271,9,-1.5),paint,.8);
    for(const [x,sign] of [[-193,1],[-65,-1]]) {
      line([[x,-1.5,258],[x+sign*24,-1.5,258],[x+sign*24,-1.5,284],[x,-1.5,284]],paint,.8);
      line(ring(x+sign*24,271,7,-1.4),paint,.7);
      line([[x+sign*4,-1,271],[x+sign*4,13,271]],night?'#9aabb0':'#8e9fa6',1.4);
      polygon([[x+sign*4,10,265],[x+sign*4,16,265],[x+sign*4,16,277],[x+sign*4,10,277]],paint,'#8e9fa6',.5);
      line(ring(x+sign*8,271,2.8,10),night?'#e7b18b':'#c28765',1);
    }
    // Broad pedestrian connection leads from the park to a low timber pier.
    flat(-40,227,207,309,-2,night?'#394e4e':'#dae4dd');
    flat(66,226,86,335,-1.5,night?'#617171':'#f0f1e9');
    polygon(nookArc(34,-1.6,Math.PI/2,Math.PI*1.5),
      night?'#555b58':'#e8e3d6',null);
    for(const r of [26,33])
      line(nookArc(r,-1.5,Math.PI/2,Math.PI*1.5),night?'#73766b':'#d1cabb',.65);
    // Low railings leave the view open; a gap marks the pier entrance.
    for(const [a,b] of [[-220,58],[94,220]]) {
      line([[a,5,344],[b,5,344]],night?'#87969d':'#aab9bd',.8);
      for(let x=a;x<b;x+=22) line([[x,-1,344],[x,5,344]],night?'#87969d':'#aab9bd',.7);
    }
    // A paved coffee terrace stays east of the unobstructed pier approach.
    flat(117,235,190,286,-1.5,night?'#4b5d63':'#e4e9e5');
    flat(98,287,202,310,-1.4,night?'#58696c':'#eef1eb');
    polygon([[-207,-4,-203],[207,-4,-203],[207,-4,203],[-207,-4,203]],'#e4e8ea','#d6dcdf');
    // Quiet streets and raised building plots.
    for(const z of [-50,54]) polygon([[-207,-3,z-12],[207,-3,z-12],[207,-3,z+12],[-207,-3,z+12]],'#f8f9fa',null);
    for(const x of [-76,76]) polygon([[x-12,-3,-203],[x+12,-3,-203],[x+12,-3,203],[x-12,-3,203]],'#f8f9fa',null);
    // Connected road corridors; reserved strips never intersect building plots.
    for(const [x0,z0,x1,z1] of [
      [-359,-308,223,-300],[-247,-300,-207,226],
      [-359,-227,223,-203],[-88,-300,-64,226],[64,-300,88,226],
      [-359,-62,-207,-38],[-359,-12,-247,12],
      [207,-300,223,226],[-359,149,-247,171],
      [-359,-300,-335,226],[-359,204,223,226]
    ])flat(x0,z0,x1,z1,-2.7,night?'#23303d':'#f8f9fa');
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
          for(const bz of [z0+17,z1-17]) drawParkBench(mx,bz,bz<mz?1:-1);
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
    const airTime=reduced.matches?0:time/1000;
    for(let i=0;i<7;i++){
      const age=(airTime*.18+i/7)%1;
      const smoke={x:123+age*24,y:64+age*53,z:-273+age*9,r:3+age*9,alpha:(1-age)*.22};
      scene.push({smoke,depth:project([smoke.x,smoke.y,smoke.z]).depth});
    }
    // One flock crosses in eight seconds, followed by a quiet interval.
    // Invisible outside the pass; reduced-motion users see no airborne movement.
    const flightClock=(airTime+24)%34;
    if(!reduced.matches && flightClock<8){
      const pass=Math.floor((airTime+24)/34),direction=pass%2?1:-1;
      const progress=flightClock/8;
      const random=i=>{const n=Math.sin(i*127.1+pass*311.7+19.3)*43758.5453;return n-Math.floor(n);};
      for(let i=0;i<16;i++){
        const spreadX=(random(i*4)-.5)*150;
        const spreadZ=(random(i*4+1)-.5)*160;
        const bird={
          x:direction*(-720+1440*progress)+spreadX,
          z:70+spreadZ+progress*100,
          y:158+random(i*4+2)*32+Math.sin(airTime*1.4+i)*2,
          heading:Math.atan2(-direction*1440,100),
          phase:airTime*(7+random(i*4+3)*2)+i*1.7
        };
        scene.push({bird,depth:project([bird.x,bird.y,bird.z]).depth});
      }
    }
    scene.push({landmark:'pier',depth:project([76,0,366]).depth});
    for(const [x,z] of [[-316,294],[-276,294],[133,299],[177,299]])
      scene.push({bench:{x,z},depth:project([x,0,z]).depth});
    for(const [x,z] of [[-22,241],[23,241]])scene.push({planter:{x,z},depth:project([x,0,z]).depth});
    scene.push({nookBench:true,depth:project([-24,0,278]).depth},
      {nookBoard:true,depth:project([44,0,250]).depth});
    KIOSKS.forEach(kiosk=>scene.push({kiosk,depth:project([kiosk.x,0,kiosk.z]).depth}));
    scene.push({landmark:'boat',depth:project([117,0,389]).depth});
    scene.sort((a,b)=>a.depth-b.depth).forEach(item=>{
      if(item.nookBench)drawNookBench();
      else if(item.nookBoard)drawNookBoard();
      else if(item.planter)drawPlanter(item.planter.x,item.planter.z);
      else if(item.bench)drawParkBench(item.bench.x,item.bench.z);
      else if(item.kiosk)drawKiosk(item.kiosk);
      else if(item.bird||item.smoke)drawAir(item,time);
      else if(item.landmark)drawWaterfrontLandmark(item.landmark,time);
      else if(item.lamp)drawStreetLamp(item.lamp);
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
  function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const firstSize=!width||!height;width=rect.width;height=rect.height;if(defaultFraming){view={...initial};const anchor=project(TARGET);view.panX=width*.48-anchor.x;view.panY=height*.46-anchor.y;}const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);refresh();}
  const distance=ps=>Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);
  canvas.addEventListener('pointerdown',e=>{defaultFraming=false;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.classList.add('is-dragging');});
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
  canvas.addEventListener('wheel',e=>{defaultFraming=false;e.preventDefault();view.zoom=clamp(view.zoom*Math.exp(-e.deltaY*.001),.65,2.4);refresh();},{passive:false});
  const reset=()=>{defaultFraming=true;view={...initial};const p=project(TARGET);view.panX=width*.48-p.x;view.panY=height*.46-p.y;refresh();};
  canvas.addEventListener('dblclick',reset);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0','Home'].includes(e.key))return;e.preventDefault();
    defaultFraming=false;
    if(e.key==='ArrowLeft')view.yaw-=.12;if(e.key==='ArrowRight')view.yaw+=.12;
    if(e.key==='ArrowUp')view.pitch=clamp(view.pitch-.08,.15,1.1);if(e.key==='ArrowDown')view.pitch=clamp(view.pitch+.08,.15,1.1);
    if(e.key==='+'||e.key==='=')view.zoom=clamp(view.zoom*1.15,.65,2.4);if(e.key==='-')view.zoom=clamp(view.zoom/1.15,.65,2.4);
    if(e.key==='0'||e.key==='Home')reset();refresh();
  });
  host.querySelector('[data-map="in"]').addEventListener('click',()=>{defaultFraming=false;view.zoom=clamp(view.zoom*1.2,.65,2.4);refresh();});
  host.querySelector('[data-map="out"]').addEventListener('click',()=>{defaultFraming=false;view.zoom=clamp(view.zoom/1.2,.65,2.4);refresh();});
  host.querySelector('[data-map="reset"]').addEventListener('click',reset);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}else{resize();refresh();}}).observe(canvas);
  document.addEventListener('visibilitychange',refresh);
  reduced.addEventListener('change',refresh);
  document.addEventListener('corner-map-update',refresh);
  document.addEventListener('corner-theme-change',()=>{night=document.documentElement.dataset.theme==='night';refresh();});
  resize();
})();
