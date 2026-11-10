(() => {
  const root = document.documentElement;
  const choices = Array.from(document.querySelectorAll('input[name="palette"]'));
  const toggle = document.getElementById('theme-toggle');
  const note = document.getElementById('theme-description');
  const normalNote = note.textContent;
  let preferredMode = root.dataset.theme || 'day';
  function select(choice, initialMode) {
    const locked = choice.value === 'flyer';
    if (!toggle.disabled) preferredMode = root.dataset.theme || 'day';
    root.dataset.palette = choice.value;
    choice.checked = true;
    const mode = locked ? 'night' : (initialMode || preferredMode);
    preferredMode = locked ? preferredMode : mode;
    if (typeof applyTheme === 'function') applyTheme(mode);
    else root.dataset.theme = mode;
    toggle.disabled = locked;
    note.textContent = locked ? 'Always on for Flyer.' : normalNote;
  }
  // A shared URL takes priority over this browser's saved palette.
  const requested = new URLSearchParams(window.location.search).get('theme');
  const linkedChoice = choices.find(choice => choice.value === requested);
  let saved;
  try { saved = localStorage.getItem('corner-set-palette'); } catch {}
  select(linkedChoice || choices.find(choice => choice.value === saved) || choices[0],
    linkedChoice ? 'day' : undefined);
  for (const choice of choices) choice.addEventListener('change', () => {
    select(choice);
    // Keep the address ready to copy after switching palettes.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('theme', choice.value);
      window.history.replaceState(window.history.state, '', url);
    } catch {}
    try { localStorage.setItem('corner-set-palette', choice.value); } catch {}
  });
})();
