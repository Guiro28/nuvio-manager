// Dashboard appearance is a device-local preference, independent of Nuvio profiles.
(() => {
  let theme = 'dark';
  try { if (localStorage.getItem('nuvio-manager-theme') === 'light') theme = 'light'; } catch {}
  document.documentElement.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    function update() {
      const light = document.documentElement.dataset.theme === 'light';
      button.textContent = light ? '☾ Mode sombre' : '☀ Mode clair';
      button.setAttribute('aria-label', light ? 'Passer en mode sombre' : 'Passer en mode clair');
      button.setAttribute('aria-pressed', String(light));
    }
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('nuvio-manager-theme', next); } catch {}
      update();
    });
    update();
  });
})();
