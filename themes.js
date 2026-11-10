(() => {
  const root = document.documentElement;
  const choices = Array.from(document.querySelectorAll('input[name="palette"]'));
  const toggle = document.getElementById('theme-toggle');
  const note = document.getElementById('theme-description');
  const normalNote = note.textContent;
  let preferredMode = root.dataset.theme || 'day';
  function select(choice) {
    const locked = choice.value === 'flyer';
    if (!toggle.disabled) preferredMode = root.dataset.theme || 'day';
    root.dataset.palette = choice.value;
    choice.checked = true;
    const mode = locked ? 'night' : preferredMode;
    if (typeof applyTheme === 'function') applyTheme(mode);
    else root.dataset.theme = mode;
    toggle.disabled = locked;
    note.textContent = locked ? 'Always on for Flyer.' : normalNote;
  }
  let saved;
  try { saved = localStorage.getItem('corner-set-palette'); } catch {}
  select(choices.find(choice => choice.value === saved) || choices[0]);
  for (const choice of choices) choice.addEventListener('change', () => {
    select(choice);
    try { localStorage.setItem('corner-set-palette', choice.value); } catch {}
  });
})();
