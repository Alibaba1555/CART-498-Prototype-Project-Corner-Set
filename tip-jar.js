(() => {
  const live = document.getElementById('live');
  const button = document.getElementById('simulate-tip');
  const card = live.querySelector('.tip-card');
  const label = document.getElementById('jar-total');
  const stack = card.querySelector('.tip-stack');
  document.getElementById('live-feedback').append(card);
  let total = 0, sequence = 0, busy = false;
  const queue = [];
  const positions = [[0,0,-3],[7,3,4],[-5,1,-5],[5,5,2]];
  function makeCard(amount, sum) {
    const node = document.createElement('div');
    node.className = 'tip-playing-card';
    const [x,y,r] = positions[sequence++ % positions.length];
    node.style.setProperty('--land-x', `${x}px`);
    node.style.setProperty('--land-y', `${y}px`);
    node.style.setProperty('--land-r', `${r}deg`);
    node.innerHTML = `<div class="tip-playing-inner"><div class="tip-playing-back"><div class="tip-back-pattern"><span class="tip-back-seal"><b>CS</b></span></div></div><div class="tip-playing-front"><span class="tip-corner">♡</span><small>Tips received</small><strong>${amount ? '+$' + amount : '$0'}</strong><small>TOTAL $${sum} CAD</small><span class="tip-corner bottom">♡</span></div></div>`;
    return node;
  }
  stack.append(makeCard(0,0));
  function dealNext() {
    if (busy || !queue.length) return;
    busy = true;
    const sum = queue.shift();
    const node = makeCard(5,sum);
    node.classList.add('is-dealing');
    stack.append(node);
    label.textContent = `Received 5 dollars. Total tips: ${sum} CAD`;
    setTimeout(() => {
      node.classList.remove('is-dealing');
      while (stack.children.length > 4) stack.firstElementChild.remove();
      busy = false;
      dealNext();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1120);
  }
  const sync = () => { button.disabled = live.hidden; };
  new MutationObserver(sync).observe(live,{attributes:true,attributeFilter:['hidden']});
  sync();
  button.addEventListener('click', () => {
    if (live.hidden) return;
    total += 5;
    queue.push(total);
    dealNext();
  });
})();
