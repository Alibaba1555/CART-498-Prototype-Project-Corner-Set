/* Fictional nearby performances and proximity simulation; no GPS or payment API. */
(() => {
  const born = Date.now();
  const gigs = [
    {id:'alex',name:'Alex',style:'Acoustic · Guitar & vocals',place:'Place des Arts · Floor 4',point:[0,84,34],ground:[0,50],minutes:20},
    {id:'mika',name:'Mika',style:'Jazz · Saxophone',place:'West corner · Street level',point:[-95,8,70],ground:[-95,70],minutes:35},
    {id:'leo',name:'Leo',style:'Electronic · Live loops',place:'North plaza · Street level',point:[112,8,-60],ground:[112,-60],minutes:45}
  ].map(g=>({...g,endsAt:born+g.minutes*60000}));
  let position={x:-170,z:160}, selected='alex', connected=null, walking=false, walkTimer, tipArtist=null;
  let performerScreen='home';
  const host=$('.map-3d');
  const myPin=document.createElement('div');myPin.className='my-map-position';myPin.hidden=true;myPin.setAttribute('aria-hidden','true');host.append(myPin);
  const pins=new Map();
  for(const g of gigs){
    const b=document.createElement('button');b.type='button';b.className='performance-pin';b.hidden=true;b.innerHTML='<span aria-hidden="true"></span>';
    b.setAttribute('aria-label',`${g.name}, ${g.style}, approximate performance area`);
    b.addEventListener('click',()=>select(g.id));host.append(b);pins.set(g.id,b);
    const row=document.createElement('button');row.type='button';row.className='nearby-item';row.dataset.gig=g.id;
    row.innerHTML=`<span>● ${g.name}<br><small>${g.style}</small></span><small class="gig-distance"></small>`;
    row.addEventListener('click',()=>select(g.id));$('#nearby-list').append(row);
  }
  const distance=g=>Math.hypot(position.x-g.ground[0],position.z-g.ground[1]);
  const available=g=>Date.now()<g.endsAt;
  function select(id){selected=id;render();document.dispatchEvent(new Event('corner-map-update'));}
  function stopWalk(){clearInterval(walkTimer);walking=false;$('#walk-start').textContent='Walk toward performance';}
  function performRoleSwitch(){
    stopWalk();
    if($('#tip-dialog').open)$('#tip-dialog').close();
    if(userRole==='performer'){
      performerScreen=screen==='profile'?profileReturnScreen:screen;
      userRole='audience';
    }else userRole='performer';
    const audience=userRole==='audience';
    document.querySelectorAll('.performer-home').forEach(e=>e.hidden=audience);
    $('#audience-home').hidden=!audience;$('#audience-demo').hidden=!audience;
    $('#role-label').textContent=audience?'AUDIENCE / ALEX':'PERFORMER / ALEX';
    $('#switch-role').textContent=audience?'Switch to Performer':'Switch to Audience';
    $('#open-profile').setAttribute('aria-label',`Open Alex’s ${audience?'audience':'performer'} profile. Double tap to switch role.`);
    $('.profile-identity .tag').textContent=audience?'AUDIENCE':'PERFORMER';
    $('#floor-label').hidden=audience;
    $('.map-signal-key').innerHTML=audience?'<i aria-hidden="true"></i>Red · Nearby performances':'<i aria-hidden="true"></i>Approximate area · Floor 4';
    $('.map-legend p').textContent=audience?'Blue · You / Red · Approximate areas':'Signal stays visible through buildings · Not an exact pin';
    $('#city-canvas').setAttribute('aria-label',audience?'Rotatable neighborhood. Blue is your simulated location; red marks nearby performances.':'Rotatable neighborhood. Red marks approximately floor four.');
    $('#map-instructions').textContent='Drag to rotate. Shift-drag or use two fingers to pan. Scroll or pinch to zoom. Arrow keys rotate; plus and minus zoom; Home resets. Fictional example locations. Nearby performances are also listed below the map. Use prototype walk controls to simulate proximity.';
    $('#fast-forward').hidden=audience;
    connected=null;
    const destination=audience?'home':isActive()?'live':performerScreen==='live'?'finished':performerScreen;
    showScreen(destination);render();document.dispatchEvent(new Event('corner-map-update'));
    toast(audience?'Audience mode. Follow the blue dot.':'Performer mode.');
  }
  function render(){
    if(userRole!=='audience'){myPin.hidden=true;pins.forEach(b=>b.hidden=true);return;}
    const live=gigs.filter(available);
    const prior=connected;
    if(connected){const g=gigs.find(g=>g.id===connected);if(!available(g)||distance(g)>65||isOffline())connected=null;}
    if(!connected&&!isOffline()){
      const nearest=live.slice().sort((a,b)=>distance(a)-distance(b))[0];
      if(nearest&&distance(nearest)<=45){connected=nearest.id;selected=nearest.id;}
    }
    if(prior!==connected){
      if($('#tip-dialog').open){$('#tip-dialog').close();tipArtist=null;}
      if(connected)toast(`Connected to ${gigs.find(g=>g.id===connected).name}’s set.`);
      else if(prior)toast('You left the performance area.');
    }
    const g=gigs.find(g=>g.id===selected), isConnected=connected===g.id;
    $('#nearby-status').textContent=isOffline()?'Offline — nearby connections are unavailable.':connected?`You’re near ${gigs.find(g=>g.id===connected).name}’s set. Connected automatically.`:'Move closer to a red area to connect automatically.';
    $('#artist-name').textContent=g.name;$('#artist-avatar').textContent=g.name[0];$('#artist-style').textContent=g.style;$('#artist-location').textContent=g.place;
    $('#audience-distance').textContent=`≈ ${Math.round(distance(g))} m away`;
    $('#audience-connection').textContent=!available(g)?'SET ENDED':isConnected?'CONNECTED':'NEARBY';
    $('#audience-timer').textContent=formatTime(g.endsAt-Date.now());
    $('#performance-card').classList.toggle('is-connected',isConnected);
    $('#tip-open').disabled=!isConnected||!available(g)||isOffline();
    $('#performance-card .footnote').textContent=isConnected?'Enjoy the moment. Tips are optional.':'Connect nearby to support the performer.';
    document.querySelectorAll('.nearby-item').forEach(row=>{const item=gigs.find(g=>g.id===row.dataset.gig);row.setAttribute('aria-pressed',String(item.id===selected));row.querySelector('.gig-distance').textContent=available(item)?`≈ ${Math.round(distance(item))} m`:'Ended';});
    pins.forEach((b,id)=>{b.hidden=!available(gigs.find(g=>g.id===id));b.setAttribute('aria-pressed',String(id===selected));});
    myPin.hidden=false;
  }
  // Circle wipe starts at the avatar, like an expanding game-scene ripple.
  let roleTransitionBusy = false;
async function switchRole() {
  if (roleTransitionBusy) return;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    performRoleSwitch();
    return;
  }

  roleTransitionBusy = true;

  const app = document.querySelector(".app");
  const avatar = document.querySelector("#open-profile");
  const box = app.getBoundingClientRect();
  const avatarBox = avatar.getBoundingClientRect();

  const DURATION = 2500;
  const HALF = DURATION / 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    roleTransitionBusy = false;
    performRoleSwitch();
    return;
  }

  const width = box.width;
  const height = window.innerHeight;
  const centerX = avatarBox.left + avatarBox.width / 2 - box.left;
  const centerY = avatarBox.top + avatarBox.height / 2;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.setAttribute("aria-hidden", "true");

  Object.assign(canvas.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    zIndex: "1000",
    pointerEvents: "auto"
  });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#151515";
  ctx.fillStyle = "#fff";

  const radius = Math.hypot(
    Math.max(Math.abs(centerX), Math.abs(width - centerX)),
    Math.max(Math.abs(centerY), Math.abs(height - centerY))
  );

  const samples = Array.from({ length: 100 }, (_, i) => {
    const angle = (i / 100) * Math.PI * 2;

    return {
      angle,
      cos: Math.cos(angle),
      sin: Math.sin(angle)
    };
  });

  let clipTop = Math.max(0, box.top);
  let clipBottom = Math.min(height, box.bottom);
  let changed = false;
  let frame;
  let timeout;
  let finishAnimation;

  function changePage() {
    if (changed) return;
    changed = true;

    performRoleSwitch();

    const nextBox = app.getBoundingClientRect();
    clipTop = Math.max(0, nextBox.top);
    clipBottom = Math.min(height, nextBox.bottom);
  }

  function wavePath(r, time, phase = 0) {
    ctx.beginPath();

    const amplitude = Math.min(15, r * 0.1);

    samples.forEach((point, index) => {
      const wobble =
        Math.sin(point.angle * 7 + time * 1.5 + phase) * 0.65 +
        Math.sin(point.angle * 15 - time + phase) * 0.35;

      const rr = r + amplitude * wobble;
      const x = centerX + point.cos * rr;
      const y = centerY + point.sin * rr;

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.closePath();
  }

  function draw(elapsed) {
    const time = elapsed / 1000;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    ctx.beginPath();
    ctx.rect(0, clipTop, width, Math.max(0, clipBottom - clipTop));
    ctx.clip();

    if (elapsed < HALF) {
      const progress = elapsed / HALF;
      const outerRadius = progress * (radius + 190);

      for (let i = 0; i < 5; i++) {
        const r = outerRadius - i * 38;
        if (r <= 0) continue;

        wavePath(r, time, i * 0.22);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const progress = Math.min(1, (elapsed - HALF) / HALF);
      const openingRadius = progress * (radius + 30);

      ctx.fillRect(0, clipTop, width, clipBottom - clipTop);

      if (openingRadius > 0) {
        ctx.globalCompositeOperation = "destination-out";
        wavePath(openingRadius, time);
        ctx.fill();

        ctx.globalCompositeOperation = "source-over";

        for (let i = 0; i < 5; i++) {
          wavePath(openingRadius + i * 38, time, i * 0.22);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function interrupt() {
    finishAnimation?.();
  }

  function onVisibilityChange() {
    if (document.hidden) interrupt();
  }

  document.body.append(canvas);
  app.setAttribute("aria-busy", "true");
  document.documentElement.classList.add("role-transitioning");

  try {
    await new Promise((resolve) => {
      finishAnimation = resolve;
      let startTime;

      function tick(now) {
        try {
          startTime ??= now;
          const elapsed = now - startTime;

          if (elapsed >= DURATION) {
            resolve();
            return;
          }

          if (elapsed >= HALF && !changed) {
            changePage();
          }

          draw(elapsed);
          frame = requestAnimationFrame(tick);
        } catch {
          resolve();
        }
      }

      window.addEventListener("resize", interrupt);
      document.addEventListener("visibilitychange", onVisibilityChange);

      timeout = setTimeout(resolve, DURATION + 1500);
      frame = requestAnimationFrame(tick);
    });
  } finally {
    cancelAnimationFrame(frame);
    clearTimeout(timeout);

    window.removeEventListener("resize", interrupt);
    document.removeEventListener("visibilitychange", onVisibilityChange);

    changePage();
    canvas.remove();

    app.removeAttribute("aria-busy");
    document.documentElement.classList.remove("role-transitioning");

    roleTransitionBusy = false;
  }
}
  $('#switch-role').addEventListener('click',switchRole);
  $('#walk-start').addEventListener('click',()=>{
    if(walking){stopWalk();return;}
    const target=gigs.find(g=>g.id===$('#walk-target').value);if(!available(target)){toast('That set has ended. Choose another performance.');return;}
    select(target.id);walking=true;$('#walk-start').textContent='Stop walking';
    walkTimer=setInterval(()=>{
      const dx=target.ground[0]-position.x,dz=target.ground[1]-position.z,d=Math.hypot(dx,dz);
      const step=Math.min(4,d);if(d>0){position.x+=dx/d*step;position.z+=dz/d*step;}
      if(d<=4)stopWalk();render();document.dispatchEvent(new Event('corner-map-update'));
    },80);
  });
  $('#walk-reset').addEventListener('click',()=>{stopWalk();position={x:-170,z:160};render();document.dispatchEvent(new Event('corner-map-update'));});
  $('#tip-open').addEventListener('click',()=>{
    render();if($('#tip-open').disabled)return;
    tipArtist=connected;$('#tip-title').textContent=`Support ${gigs.find(g=>g.id===tipArtist).name}.`;$('#tip-dialog').showModal();
  });
  $('#tip-confirm').addEventListener('click',()=>{
    const id=tipArtist;render();if(!id||connected!==id||isOffline()||!available(gigs.find(g=>g.id===id))){toast('Reconnect to the set before tipping.');return;}
    const amount=document.querySelector('input[name="tip"]:checked').value;
    $('#tip-dialog').close();toast(`Demo $${amount} CAD tip for ${gigs.find(g=>g.id===id).name}. No payment charged.`);tipArtist=null;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWalk();});
  window.cornerAudience={switchRole,getState:()=>({active:userRole==='audience',gigs:gigs.filter(available),position,pins,myPin}),render};
  setInterval(render,500);render();
})();
