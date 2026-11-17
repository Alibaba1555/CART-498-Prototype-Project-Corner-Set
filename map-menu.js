(() => {
  const app = document.querySelector('.app');
  const home = document.getElementById('home');
  const svg = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  const icons = {
    live: svg('<path d="m9 5 11 7-11 7z"/><path d="M4 6v12"/>'),
    role: svg('<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>'),
    night: svg('<path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'),
    profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'),
    menu: svg('<path d="M5 7h14M5 12h14M5 17h14"/>')
  };
  const nav = document.createElement('nav');
  nav.className = 'corner-menu';
  nav.setAttribute('aria-label','Map actions');
  nav.innerHTML = '<button class="menu-scrim" tabindex="-1" aria-label="Close menu"></button><div class="corner-actions" id="corner-actions" inert>'+
    [['live','Start live'],['role','Switch to audience'],['night','Dark mode'],['profile','My profile']].map(([key,label],i)=>
    '<button type="button" class="corner-action" data-action="'+key+'" style="--order:'+i+'">'+icons[key]+'<span>'+label+'</span></button>').join('')+
    '</div><button type="button" class="corner-trigger" aria-expanded="false" aria-controls="corner-actions">'+icons.menu+'<span>Menu</span></button>';
  app.append(nav);
  const trigger=nav.querySelector('.corner-trigger'), actions=nav.querySelector('.corner-actions');
  function close(focus=false) {
    nav.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); actions.inert=true;
    if(focus) trigger.focus();
  }
  trigger.addEventListener('click',()=>{
    const open=!nav.classList.contains('is-open');
    nav.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open));actions.inert=!open;
  });
  nav.querySelector('.menu-scrim').addEventListener('click',()=>close(true));
  nav.addEventListener('keydown',e=>{if(e.key==='Escape'){close(true);e.stopPropagation();}});
  nav.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.action;
    close(action==='night');
    if(action==='live') document.getElementById('start').click();
    if(action==='role') document.getElementById('switch-role').click();
    if(action==='profile') document.getElementById('open-profile').click();
    if(action==='night'){
      const toggle=document.getElementById('theme-toggle');
      // Flyer intentionally locks night mode; return to Studio before switching to day.
      if(toggle.disabled) {
        const studio=document.querySelector('[name="palette"][value="studio"]');
        studio.checked=true;studio.dispatchEvent(new Event('change',{bubbles:true}));
        applyTheme('night');
      }
      toggle.click();
    }
    sync();
  }));
  function sync(){
    const performer=typeof userRole==='undefined'||userRole==='performer';
    const visible=!home.hidden;
    app.classList.toggle("audience-map-active",visible&&!performer);
    app.classList.toggle('map-home-active',visible);
    nav.hidden=!visible;
    nav.querySelector('[data-action="live"]').hidden=!performer;
    nav.querySelector('[data-action="role"] span').textContent=performer?'Switch to audience':'Switch to performer';
    if(!visible)close();
    const night=document.documentElement.dataset.theme==='night';
    const button=nav.querySelector('[data-action="night"]');
    button.setAttribute('aria-pressed',String(night));
    button.querySelector('svg').outerHTML=night?icons.sun:icons.night;
    button.querySelector('span').textContent=night?'Light mode':'Dark mode';
    nav.querySelector('[data-action="live"] span').textContent=typeof isActive==='function'&&isActive()?'Manage live':'Start live';
  }
  new MutationObserver(sync).observe(home,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(sync).observe(document.getElementById('audience-home'),{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  sync();
})();
