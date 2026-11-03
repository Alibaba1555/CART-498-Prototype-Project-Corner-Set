(() => {
  const live = document.getElementById('live');
  const button = document.getElementById('simulate-tip');
  const card = live.querySelector('.tip-card');
  const label = document.getElementById('jar-total');
  const stack = card.querySelector('.tip-stack');
  document.getElementById('live-feedback').append(card);
  const totalFooter = document.createElement('div');
  totalFooter.className = 'tip-total-footer';
  totalFooter.innerHTML = '<span class="tip-total-label">TOTAL</span><span class="tip-total-value">$0</span><span class="tip-total-currency">CAD</span>';
  card.append(totalFooter);
  const totalValue = totalFooter.querySelector('.tip-total-value');
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
    node.innerHTML = `<div class="tip-playing-inner"><div class="tip-playing-back"><div class="tip-back-pattern"><span class="tip-back-seal"><b>CS</b></span></div></div><div class="tip-playing-front"><span class="tip-corner">♡</span><small>Tips received</small><strong>${amount ? '+$' + amount : '$0'}</strong><span class="tip-corner bottom">♡</span></div></div>`;
    return node;
  }
  stack.append(makeCard(0,0));
  function dealNext() {
    if (busy || !queue.length || live.hidden) return;
    busy = true;
    const { amount, sum } = queue.shift();
    const node = makeCard(amount,sum);
    node.classList.add('is-dealing');
    stack.append(node);
    label.textContent = `Received ${amount} dollars. Total tips: ${total} CAD`;
    setTimeout(() => {
      node.classList.remove('is-dealing');
      while (stack.children.length > 4) stack.firstElementChild.remove();
      busy = false;
      dealNext();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1120);
  }
  function receiveTip(artistId, value) {
    const amount = Number(value);
    if (artistId !== 'alex' || !Number.isFinite(amount) || amount <= 0) return;
    total = Math.round((total + amount) * 100) / 100;
    totalValue.textContent = '$' + total.toLocaleString('en-CA', { maximumFractionDigits: 2 });
    label.textContent = `Total tips: ${total} CAD`;
    queue.push({amount, sum:total});
    dealNext();
  }
  document.addEventListener('corner-tip-received', event => {
    receiveTip(event.detail?.artistId, event.detail?.amount);
  });
  const sync = () => { button.disabled = live.hidden; if (!live.hidden) dealNext(); };
  new MutationObserver(sync).observe(live,{attributes:true,attributeFilter:['hidden']});
  sync();
  button.addEventListener('click', () => {
    if (live.hidden) return;
    receiveTip('alex', 5);
  });
})();
