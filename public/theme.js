// Dashboard appearance is a device-local preference, independent of Nuvio profiles.
(() => {
  let theme = 'dark';
  try { if (localStorage.getItem('nuvio-manager-theme') === 'light') theme = 'light'; } catch {}
  document.documentElement.dataset.theme = theme;
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    function update() {
      const light = document.documentElement.dataset.theme === 'light';
      const labels = window.i18nTheme && window.i18nTheme(light);
      button.textContent = labels ? labels.text : (light ? '☾ Mode sombre' : '☀ Mode clair');
      button.setAttribute('aria-label', labels ? labels.aria : (light ? 'Passer en mode sombre' : 'Passer en mode clair'));
      button.setAttribute('aria-pressed', String(light));
    }
    window.__themeUpdate = update;
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('nuvio-manager-theme', next); } catch {}
      update();
    });
    update();
  });
})();
