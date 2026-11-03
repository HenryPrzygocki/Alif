/* Huruf — Setup: your Iqra book, Ramadan date, goal, font, theme, and backups. */
(function (Q) {
  'use strict';
  const { h } = Q;
  Q.views = Q.views || {};

  Q.views.setup = function (root) {
    const st = Q.store.state;
    const set = Q.store.state.settings;
    const auto = (() => { const keep = set.ramadan; set.ramadan = ''; const r = Q.ramadan(); set.ramadan = keep; return r; })();

    const field = (label, id, control, help) => h('div', { class: 'field' },
      h('label', { for: id }, label), control, help ? h('p', { class: 'small muted' }, help) : null);

    /* learning */
    const book = h('select', { id: 'set-book', class: 'input', onchange: e => { Q.store.setSetting('iqraBook', Number(e.target.value)); } },
      Q.IQRA.map(b => h('option', { value: b.n, selected: b.n === set.iqraBook }, `Iqra ${b.n} · ${b.title}`)));
    const page = h('input', { id: 'set-page', class: 'input', type: 'text', value: set.iqraPage || '', placeholder: 'e.g. page 14', oninput: e => Q.store.setSetting('iqraPage', e.target.value) });
    const goal = h('input', { id: 'set-goal', class: 'input num', type: 'number', min: 20, max: 2000, step: 10, value: set.goal, onchange: e => { const v = Math.max(20, Math.min(2000, Number(e.target.value) || 150)); e.target.value = v; Q.store.setSetting('goal', v); } });
    const ram = h('input', { id: 'set-ramadan', class: 'input', type: 'date', value: set.ramadan || '', onchange: e => { Q.store.setSetting('ramadan', e.target.value); Q.toast(e.target.value ? 'Ramadan date saved' : 'Using the calendar date'); } });

    /* look */
    const fontPreview = h('div', { class: 'frame', style: { padding: '8px 18px', textAlign: 'center' } });
    const renderPreview = () => {
      fontPreview.replaceChildren(h('span', { class: 'ar', style: { fontSize: '40px', lineHeight: '1.9', fontFamily: Q.arabicFontCss(set.font) } }, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'));
    };
    const font = h('select', { id: 'set-font', class: 'input', onchange: e => { Q.store.setSetting('font', e.target.value); renderPreview(); } },
      Q.FONTS.map(f => h('option', { value: f.id, selected: f.id === set.font }, f.label)));
    const theme = h('div', { class: 'seg', role: 'group', 'aria-label': 'Theme' }, ['system', 'light', 'dark'].map(t =>
      h('button', { type: 'button', 'aria-pressed': String(set.theme === t), onclick: e => {
        Q.store.setSetting('theme', t);
        theme.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      } }, t[0].toUpperCase() + t.slice(1))));

    /* data */
    const fileIn = h('input', { id: 'set-import', type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
      const f = e.target.files[0];
      if (!f) return;
      try { Q.store.importJSON(await f.text()); Q.toast('Backup restored'); Q.go('setup'); }
      catch (err) { Q.toast(err.message || 'Could not read that file'); }
    } });
    let armed = false;
    const resetBtn = h('button', { class: 'btn danger', type: 'button', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Click again to erase everything'; setTimeout(() => { armed = false; resetBtn.textContent = 'Reset all progress'; }, 4000); return; }
      Q.store.reset(); Q.toast('Progress erased'); Q.go('setup');
    } }, 'Reset all progress');

    const exportBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
      const blob = new Blob([Q.store.exportJSON()], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `huruf-backup-${Q.dayKey()}.json` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } }, 'Download backup');

    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Setup'), h('p', null, 'Changes save straight away.'))),
      h('div', { class: 'grid cols-2', style: { alignItems: 'start' } },
        h('section', { class: 'card stack' },
          h('h2', null, 'Your learning'),
          field('Iqra book you are on', 'set-book', book),
          field('Where you are in it', 'set-page', page, 'A note for yourself, like the page your teacher left you on.'),
          field('Daily goal (letters read)', 'set-goal', goal, 'A row of 4 letters counts as 4. 150 is about 10 minutes.'),
          field('First day of fasting (optional)', 'set-ramadan', ram,
            `Already filled in for you: Ramadan begins at sunset on ${Q.fmtDate(auto.night, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} and the first fast is ${Q.fmtDate(auto.fast, { weekday: 'long', month: 'long', day: 'numeric' })}. Only change this if your mosque announces a different day.`)),
        h('section', { class: 'card stack' },
          h('h2', null, 'Look'),
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Transliteration'), Q.schemeSwitch(),
            h('p', { class: 'small muted' }, 'Português writes the sounds the way you would read them in Portuguese, Iqra style: heavy letters take ó (só, dó, rhó), light ones á (sá, chá). It also gives you letter names and tips in Portuguese.')),
          field('Arabic font for practice', 'set-font', font, 'Uthmani matches the Madani mushaf, the most common print worldwide and the default on Quran.com.'),
          fontPreview,
          h('div', { class: 'field' }, h('span', { class: 'label' }, 'Theme'), theme))),
      h('section', { class: 'card stack' },
        h('h2', null, 'Your data'),
        h('p', { class: 'small', style: { color: 'var(--ink-2)', maxWidth: '70ch' } },
          'Your progress lives only in this browser on this computer. Download a backup now and then, and use it to move your progress to another device or browser.'),
        h('div', { class: 'row' }, exportBtn, h('button', { class: 'btn', type: 'button', onclick: () => fileIn.click() }, 'Restore from backup'), fileIn, resetBtn),
        h('p', { class: 'small muted' }, `${Object.keys(st.days).length} days and ${Q.fmtInt(Q.store.totals().n)} reads saved.`)),
      h('p', { class: 'small muted' }, 'Version ' + (Q.VERSION ? Q.VERSION.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2}).*/, '$1-$2-$3 $4:$5 UTC') : 'local'),
        '. If something looks out of date, press Ctrl+Shift+R (Cmd+Shift+R on a Mac) to reload everything.')));
    renderPreview();
  };
})(window.Q = window.Q || {});
