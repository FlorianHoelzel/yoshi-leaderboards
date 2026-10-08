(() => {
  const key = 'yoshi-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch {}
  let theme = ['dark', 'light'].includes(preference) ? preference : system.matches ? 'dark' : 'light';

  function apply() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101112' : '#f6f7f2';
    const button = document.querySelector('#theme-toggle');
    if (button) {
      const next = theme === 'dark' ? 'light' : 'dark';
      button.textContent = `${next === 'dark' ? 'Dark' : 'Light'} mode`;
      button.setAttribute('aria-label', `Switch to ${next} mode`);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelector('#theme-toggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      preference = theme;
      try { localStorage.setItem(key, theme); } catch {}
      apply();
    });
  });
  system.addEventListener('change', event => {
    if (!['dark', 'light'].includes(preference)) {
      theme = event.matches ? 'dark' : 'light';
      apply();
    }
  });
})();
