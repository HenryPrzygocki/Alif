/* Huruf — app shell: navigation, theme, fonts. */
(function (Q) {
  'use strict';
  const { h, s } = Q;

  const icon = (d) => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    ...d.map(p => s('path', { d: p })));

  /* Navigation, in three groups so each part of the site is one click away */
  const ROUTES = [
    { id: 'today', label: 'Today', view: () => Q.views.today, icon: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'] },
    { group: 'Quran' },
    { id: 'surahs', label: 'Surahs', view: () => Q.views.surahs, icon: ['M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z', 'M8.5 9h6M8.5 12.5h6M8.5 16h3.5'] },
    { id: 'review', label: 'Review', view: () => Q.views.review, icon: ['M20 12a8 8 0 1 1-2.6-5.9', 'M20 4v4.5h-4.5', 'M9 12.5l2.2 2.2L15.5 10'], badge: () => Q.store.qDue().length },
    { group: 'Alphabet' },
    { id: 'practice', label: 'Letter practice', view: () => Q.views.practice, icon: ['M8 5.5v13l11-6.5z'] },
    { id: 'letters', label: 'Letters', view: () => Q.views.letters, icon: ['M4 5h7v6H4z', 'M13 5h7v6h-7z', 'M4 13h7v6H4z', 'M13 13h7v6h-7z'] },
    { id: 'keyboard', label: 'Keyboard', view: () => Q.views.keyboard, icon: ['M3 7h18v11H3z', 'M7 11h.01M11 11h.01M15 11h.01M7 14.5h10'] },
    { group: 'You' },
    { id: 'progress', label: 'Progress', view: () => Q.views.progress, icon: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M21 20H3'] },
    { id: 'setup', label: 'Setup', view: () => Q.views.setup, icon: ['M4 7h10M18 7h2M4 17h4M12 17h8', 'M16 5v4M10 15v4'] },
  ];
  // pages that live under a nav item: #surah-112 → Surahs
  const SUB_ROUTES = [
    { re: /^surah-(\d+)$/, parent: 'surahs', view: m => root => Q.views.surah(root, Number(m[1])), title: () => 'Surah' },
  ];

  const nav = Q.$('#nav');
  function drawNav() {
    nav.replaceChildren(...ROUTES.map(r => r.group
      ? h('div', { class: 'nav-group' }, r.group)
      : h('a', { href: '#' + r.id, 'data-route': r.id }, icon(r.icon), h('span', null, r.label),
        r.badge && r.badge() ? h('span', { class: 'nav-badge', title: 'Due today' }, r.badge()) : null)));
  }
  drawNav();

  let cleanup = null;
  let currentId = null;
  function render() {
    const id = (location.hash || '').replace(/^#/, '') || 'today';
    let route = ROUTES.find(r => r.id === id && !r.group);
    let viewFn, navId, title;
    if (route) { viewFn = route.view(); navId = route.id; title = route.label; }
    else {
      const sub = SUB_ROUTES.map(x => ({ x, m: id.match(x.re) })).find(y => y.m);
      if (sub) { viewFn = sub.x.view(sub.m); navId = sub.x.parent; title = sub.x.title(); }
      else { route = ROUTES[0]; viewFn = route.view(); navId = 'today'; title = 'Today'; }
    }
    currentId = navId;
    drawNav();
    const active = nav.querySelector(`a[data-route="${navId}"]`);
    if (active) active.setAttribute('aria-current', 'page');
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    if (Q.audio) Q.audio.stop();
    const root = Q.$('#view');
    root.replaceChildren();
    Q.hideTip();
    try {
      cleanup = viewFn(root);
    } catch (e) {
      console.error(e);
      root.append(h('div', { class: 'page' }, h('div', { class: 'card' }, h('h2', null, 'Something broke on this page'), h('p', { class: 'muted' }, String(e.message || e)))));
    }
    document.title = navId === 'today' ? 'Huruf' : `${title} · Huruf`;
    window.scrollTo(0, 0);
  }
  Q.refreshNav = () => { drawNav(); const a = nav.querySelector(`a[data-route="${currentId}"]`); if (a) a.setAttribute('aria-current', 'page'); };

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
  let navTimer = null;
  Q.store.onChange(() => {
    clearTimeout(navTimer); navTimer = setTimeout(Q.refreshNav, 200);
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
