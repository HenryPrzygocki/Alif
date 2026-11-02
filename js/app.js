/* Huruf — app shell: navigation, theme, fonts. */
(function (Q) {
  'use strict';
  const { h, s } = Q;

  const icon = (d) => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    ...d.map(p => s('path', { d: p })));

  const ROUTES = [
    { id: 'today', label: 'Today', view: () => Q.views.today, icon: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'] },
    { id: 'practice', label: 'Practice', view: () => Q.views.practice, icon: ['M8 5.5v13l11-6.5z'] },
    { id: 'letters', label: 'Letters', view: () => Q.views.letters, icon: ['M4 5h7v6H4z', 'M13 5h7v6h-7z', 'M4 13h7v6H4z', 'M13 13h7v6h-7z'] },
    { id: 'keyboard', label: 'Keyboard', view: () => Q.views.keyboard, icon: ['M3 7h18v11H3z', 'M7 11h.01M11 11h.01M15 11h.01M7 14.5h10'] },
    { id: 'progress', label: 'Progress', view: () => Q.views.progress, icon: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M21 20H3'] },
    { id: 'setup', label: 'Setup', view: () => Q.views.setup, icon: ['M4 7h10M18 7h2M4 17h4M12 17h8', 'M16 5v4M10 15v4'] },
  ];

  const nav = Q.$('#nav');
  ROUTES.forEach(r => nav.append(h('a', { href: '#' + r.id, 'data-route': r.id }, icon(r.icon), h('span', null, r.label))));

  let cleanup = null;
  function render() {
    const id = (location.hash || '').replace(/^#/, '') || 'today';
    const route = ROUTES.find(r => r.id === id) || ROUTES[0];
    nav.querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
    nav.querySelector(`a[data-route="${route.id}"]`).setAttribute('aria-current', 'page');
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    const root = Q.$('#view');
    root.replaceChildren();
    Q.hideTip();
    try {
      cleanup = route.view()(root);
    } catch (e) {
      console.error(e);
      root.append(h('div', { class: 'page' }, h('div', { class: 'card' }, h('h2', null, 'Something broke on this page'), h('p', { class: 'muted' }, String(e.message || e)))));
    }
    document.title = route.id === 'today' ? 'Huruf' : `${route.label} · Huruf`;
    root.focus && window.scrollTo(0, 0);
  }

  Q.go = id => { if (location.hash === '#' + id) render(); else location.hash = id; };

  function railFoot() {
    const r = Q.ramadan();
    const foot = Q.$('#rail-foot');
    foot.replaceChildren(...(
      r.phase === 'during'
        ? [h('div', { class: 'big' }, 'Day ' + r.dayOf), h('div', { class: 'small' }, 'of Ramadan. Ramadan Mubarak')]
        : r.phase === 'tonight'
          ? [h('div', { class: 'big' }, 'Tonight'), h('div', { class: 'small' }, 'Ramadan begins at sunset')]
          : [h('div', { class: 'big num' }, r.days + (r.days === 1 ? ' day' : ' days')), h('div', { class: 'small' }, 'until Ramadan · ' + Q.fmtDate(r.night, { weekday: 'short', month: 'short', day: 'numeric' }))]
    ));
  }

  Q.applyTheme = function () {
    const t = Q.store.state.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else if (Q.applyTheme._set) document.documentElement.removeAttribute('data-theme');
    Q.applyTheme._set = t === 'light' || t === 'dark';
  };
  Q.applyFont = function () {
    document.documentElement.style.setProperty('--f-arabic', Q.arabicFontCss(Q.store.state.settings.font));
  };

  /* Shared chart tooltip */
  const tip = Q.$('#tooltip');
  Q.showTip = (html, x, y) => {
    tip.innerHTML = html;
    tip.classList.add('show');
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
    const top = y - hgt - 12 < 8 ? y + 16 : y - hgt - 12;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  };
  Q.hideTip = () => tip.classList.remove('show');

  Q.applyTheme();
  Q.applyFont();
  Q.applyScheme(Q.store.state.settings.translit);
  railFoot();
  window.addEventListener('hashchange', render);
  Q.store.onChange(() => {
    Q.applyTheme(); Q.applyFont();
    if (Q.store.state.settings.translit !== Q.SCHEME) Q.applyScheme(Q.store.state.settings.translit);
  });

  /* Small EN / PT switch used on several pages */
  Q.schemeSwitch = function (onChange) {
    const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': 'Transliteration' });
    Q.SCHEMES.forEach(sc => wrap.append(h('button', {
      type: 'button', 'aria-pressed': String(Q.SCHEME === sc.id), title: sc.label + ': ' + sc.example,
      onclick: () => {
        Q.store.setSetting('translit', sc.id);
        Q.applyScheme(sc.id);
        wrap.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(Q.SCHEMES[i].id === sc.id)));
        if (onChange) onChange(sc.id);
      },
    }, sc.short)));
    return wrap;
  };
  render();
  // keep the countdown honest if the tab stays open past midnight
  setInterval(railFoot, 60 * 60 * 1000);
})(window.Q = window.Q || {});
