/* Alif — app shell: navigation, theme, fonts. */
(function (Q) {
  'use strict';
  const { h, s } = Q;

  const icon = (d) => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    ...d.map(p => s('path', { d: p })));

  /* Four places, nothing hidden behind a menu. Other pages open from inside them:
     Revise from Today and Surahs, the alphabet and keyboard from Letters, Setup from the gear. */
  // the settings gear from the Lucide icon set (ISC licence)
  const GEAR = ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'];
  const ROUTES = [
    { id: 'today', label: 'Today', nav: true, view: () => Q.views.today, icon: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'], badge: () => Q.store.qReviseList().length },
    { id: 'surahs', label: 'Quran', nav: true, view: () => Q.views.surahs, icon: ['M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z', 'M8.5 9h6M8.5 12.5h6M8.5 16h3.5'] },
    { id: 'practice', label: 'Alphabet', nav: true, view: () => Q.views.practice, icon: ['M4 5h7v6H4z', 'M13 5h7v6h-7z', 'M4 13h7v6H4z', 'M13 13h7v6h-7z'] },
    { id: 'progress', label: 'Progress', nav: true, view: () => Q.views.progress, icon: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M21 20H3'] },
    { id: 'review', label: 'Revise', parent: 'surahs', view: () => Q.views.review },
    { id: 'letters', label: 'Letters', parent: 'practice', view: () => Q.views.letters },
    { id: 'keyboard', label: 'Keyboard', parent: 'practice', view: () => Q.views.keyboard },
    { id: 'setup', label: 'Setup', parent: 'setup', view: () => Q.views.setup },
  ];
  // pages that live under a nav item: #surah-112 → Surahs
  const SUB_ROUTES = [
    { re: /^surah-(\d+)$/, parent: 'surahs', view: m => root => Q.views.surah(root, Number(m[1])), title: () => 'Surah' },
  ];

  const nav = Q.$('#nav');
  let currentId = null;
  function drawNav() {
    nav.replaceChildren(...ROUTES.filter(r => r.nav).map(r =>
      h('a', { href: '#' + r.id, 'data-route': r.id, 'aria-current': r.id === currentId ? 'page' : null },
        icon(r.icon), h('span', { class: 'lbl' }, r.label),
        r.badge && r.badge() ? h('span', { class: 'nav-badge', title: 'Surahs to revise' }, r.badge()) : null)));
    document.querySelectorAll('.gear').forEach(g => g.setAttribute('aria-current', currentId === 'setup' ? 'page' : 'false'));
  }
  document.querySelectorAll('.gear').forEach(g => g.replaceChildren(icon(GEAR)));
  drawNav();

  /* the small tab row at the top of a section with more than one page */
  Q.sectionTabs = function (items, current) {
    return h('nav', { class: 'subtabs', 'aria-label': 'Section' }, items.map(([id, label]) =>
      h('a', { href: '#' + id, 'aria-current': id === current ? 'page' : null }, label)));
  };
  Q.LETTER_TABS = [['practice', 'Practice'], ['letters', 'All letters'], ['keyboard', 'Keyboard']];

  let cleanup = null;
  function render() {
    const id = (location.hash || '').replace(/^#/, '') || 'today';
    let route = ROUTES.find(r => r.id === id && !r.group);
    let viewFn, navId, title;
    if (route) { viewFn = route.view(); navId = route.parent || route.id; title = route.label; }
    else {
      const sub = SUB_ROUTES.map(x => ({ x, m: id.match(x.re) })).find(y => y.m);
      if (sub) { viewFn = sub.x.view(sub.m); navId = sub.x.parent; title = sub.x.title(); }
      else { route = ROUTES[0]; viewFn = route.view(); navId = 'today'; title = 'Today'; }
    }
    currentId = navId;
    drawNav();
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
    document.title = navId === 'today' ? 'Alif' : `${title} · Alif`;
    window.scrollTo(0, 0);
  }
  Q.refreshNav = drawNav;

  Q.go = id => { if (location.hash === '#' + id) render(); else location.hash = id; };

  function railFoot() {
    const r = Q.ramadan();
    const foot = Q.$('#rail-foot');
    const head = Q.$('#phone-count');
    if (Q.store.state.settings.countdown === false) { if (head) head.textContent = ''; foot.replaceChildren(); return; }
    if (head) head.textContent = r.phase === 'during' ? `Day ${r.dayOf} of Ramadan` : r.phase === 'tonight' ? 'Ramadan tonight' : `${r.days} ${r.days === 1 ? 'day' : 'days'} to Ramadan`;
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
    document.documentElement.style.setProperty('--f-quran', Q.quranFontCss(Q.store.state.settings.font));
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

  /* New version published? Offer a one-click reload (checks on load, on return to the tab, every 20 min) */
  async function checkUpdate() {
    if (!Q.VERSION || document.getElementById('update-bar')) return;
    try {
      const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const { v } = await res.json();
      if (v && v > Q.VERSION) {
        document.body.append(h('div', { id: 'update-bar', role: 'status' },
          h('span', null, 'A new version of Alif is ready.'),
          h('button', { class: 'btn primary sm', type: 'button', onclick: () => { Q.store.save(true); location.reload(); } }, 'Reload now')));
      }
    } catch (e) { /* offline: try later */ }
  }
  setTimeout(checkUpdate, 2500);
  setInterval(checkUpdate, 20 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

  Q.applyTheme();
  Q.applyFont();
  Q.applyScheme(Q.store.state.settings.translit);
  railFoot();
  window.addEventListener('hashchange', render);
  let navTimer = null;
  Q.store.onChange(() => {
    clearTimeout(navTimer); navTimer = setTimeout(Q.refreshNav, 200);
    Q.applyTheme(); Q.applyFont(); railFoot();
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
