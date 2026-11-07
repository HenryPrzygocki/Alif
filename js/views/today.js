/* Alif — Today: countdown, Iqra path, today's numbers, where to start. */
(function (Q) {
  'use strict';
  const { h, s } = Q;
  Q.views = Q.views || {};

  /* Start a practice session with a preset */
  Q.startPreset = function (preset) {
    const p = Q.store.state.practice;
    Object.assign(p, preset);
    Q.store.save();
    Q.go('practice');
  };

  const PRESETS = [
    { id: 'iqra1', title: 'Sounds with fatḥa', sub: 'Iqra 1 · بَ تَ ثَ → {baa:a} {taa:a} {thaa:a}', preset: { mode: 'sounds', marks: ['a'] }, book: 1 },
    { id: 'iqra2', title: 'Joined letters', sub: 'Iqra 2 · بَتَثَ → {baa:a}-{taa:a}-{thaa:a}', preset: { mode: 'joined', marks: ['a'] }, book: 2 },
    { id: 'iqra3', title: 'Fatḥa, kasra, ḍamma', sub: 'Iqra 3 · بَ بِ بُ → {baa:a} {baa:i} {baa:u}', preset: { mode: 'sounds', marks: ['a', 'i', 'u'] }, book: 3 },
    { id: 'iqra4', title: 'Add tanwīn', sub: 'Iqra 4 · بً بٍ بٌ → {baa:an} {baa:in} {baa:un}', preset: { mode: 'sounds', marks: ['a', 'i', 'u', 'an', 'in', 'un'] }, book: 4 },
    { id: 'q-sound', title: 'Quiz: letter → sound', sub: 'خَ → {khaa:a}? {Haa:a}? {jeem:a}? The site checks it', preset: { mode: 'q-sound' } },
    { id: 'q-letter', title: 'Quiz: sound → letter', sub: '“{Saad:a}” → صَ سَ ضَ…', preset: { mode: 'q-letter' } },
    { id: 'names', title: 'Letter names', sub: 'ب → {name:baa}. Read aloud', preset: { mode: 'names' } },
    { id: 'quiz', title: 'Quiz: letter ↔ name', sub: 'Tell look-alikes apart: ح خ ج', preset: { mode: 'quiz' } },
  ];

  function ornament() {
    return s('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.1' },
        s('rect', { x: '19', y: '19', width: '62', height: '62', rx: '2' }),
        s('rect', { x: '19', y: '19', width: '62', height: '62', rx: '2', transform: 'rotate(45 50 50)' }),
        s('circle', { cx: '50', cy: '50', r: '28' }),
        s('circle', { cx: '50', cy: '50', r: '30.5', 'stroke-width': '0.6' })));
  }

  /* Today: just what to do next. One card for the Quran, one for the letters, and the countdown. */
  Q.views.today = function (root) {
    const st = Q.store.state;
    const r = Q.ramadan();
    const today = Q.store.today();
    const streak = Q.store.streak();
    const goal = st.settings.goal || 150;
    const fmtLong = d => Q.fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' });

    const head = h('div', { class: 'page-head' },
      h('div', null,
        h('h1', { class: 'hello' }, 'As-salāmu ʿalaykum', h('span', { class: 'ar' }, 'السَّلَامُ عَلَيْكُمْ')),
        h('p', null, Q.fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }))));

    /* the Quran: continue where you were, and what to revise */
    const quranCard = h('section', { class: 'card next-card' }, h('p', { class: 'empty' }, 'Loading…'));
    Q.quran.loadIndex().then(index => {
      const last = st.quran.last && index.find(x => x.n === st.quran.last.n);
      const mine = st.quran.list.map(n => index.find(x => x.n === n)).filter(Boolean);
      const cur = last || mine.find(m => { const x = Q.store.qSummary(m.n, m.verses); return x.mem < x.count; });
      const revise = Q.store.qReviseList().map(g => index.find(x => x.n === g.n)).filter(Boolean);
      const kids = [h('div', { class: 'eyebrow' }, 'Quran')];
      if (cur) {
        const sum = Q.store.qSummary(cur.n, cur.verses);
        const done = sum.mem === sum.count;
        kids.push(
          h('h2', null, cur.name, h('span', { class: 'ar sname' }, cur.ar)),
          h('p', { class: 'small muted' }, done ? 'Memorized. Mā shāʾ Allāh.' : `${sum.mem} of ${sum.count} verses memorized`),
          segBarMini(sum),
          h('a', { class: 'btn primary lg', href: '#surah-' + cur.n }, done ? 'Open ' + cur.name : 'Continue'));
      } else {
        kids.push(h('h2', null, 'Al-Fātiḥah'), h('p', { class: 'small muted' }, 'Recited in every prayer. Listen to it word by word, then learn it one line at a time.'),
          h('a', { class: 'btn primary lg', href: '#surah-1' }, 'Start Al-Fātiḥah'));
      }
      if (revise.length) {
        kids.push(h('div', { class: 'revise-hint' },
          h('span', null, 'Time to revise: ', h('b', null, revise.slice(0, 3).map(m => m.name).join(', ')), revise.length > 3 ? ` and ${revise.length - 3} more` : ''),
          h('a', { class: 'btn sm', href: '#review' }, 'Revise')));
      }
      kids.push(h('a', { class: 'small', href: '#surahs' }, 'All surahs'));
      quranCard.replaceChildren(...kids);
    }).catch(() => quranCard.replaceChildren(h('p', { class: 'empty' }, 'Surahs load when the site is opened from its web address.')));

    /* the letters: today's reading and the letters that still trip you up */
    const weak = Q.store.weakest(5, 3).filter(x => x.m < 0.8);
    const goalPct = Math.min(1, today.n / goal);
    const lettersCard = h('section', { class: 'card next-card' },
      h('div', { class: 'eyebrow' }, 'Letters'),
      h('h2', null, today.n >= goal ? 'Goal reached today' : today.n ? `${goal - today.n} letters to today’s goal` : 'Read some letters today'),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(goalPct * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: (goalPct * 100) + '%' } })),
      weak.length
        ? h('div', { class: 'weak-chips' }, h('span', { class: 'small muted' }, 'Still tricky:'), weak.map(({ l }) => h('span', { class: 'chip static' }, h('span', { class: 'ar' }, l.ch), l.name)))
        : h('p', { class: 'small muted' }, today.n ? 'No weak letters right now.' : 'Say each letter out loud, then check yourself.'),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary lg', href: '#practice', onclick: () => { if (Q.store.state.practice.focus === 'weak' && !weak.length) Q.store.setPractice('focus', 'all'); } }, today.n ? 'Keep practising' : 'Start practice'),
        weak.length ? h('button', { class: 'btn', type: 'button', onclick: () => { Q.store.setPractice('focus', 'weak'); Q.go('practice'); } }, 'Practise the tricky ones') : null));

    /* countdown and streak, one line */
    const days = r.phase === 'during' ? `Day ${r.dayOf} of Ramadan` : r.phase === 'tonight' ? 'Ramadan begins tonight' : `${r.days} ${r.days === 1 ? 'day' : 'days'} until Ramadan`;
    const strip = h('section', { class: 'card count-strip' },
      h('div', { class: 'ayah-num sm' }, ornament(), h('span', { class: 'n num' }, r.phase === 'during' ? r.dayOf : r.days)),
      h('div', { class: 'stack', style: { gap: '2px' } },
        h('b', null, days),
        h('span', { class: 'small muted' }, r.phase === 'before' || !r.phase ? `Begins at sunset ${fmtLong(r.night)} · first fast ${fmtLong(r.fast)}` : 'Ramadan Mubarak')),
      h('div', { class: 'strip-stats' },
        h('span', null, h('b', null, streak.cur), streak.cur === 1 ? ' day streak' : ' day streak'),
        h('a', { class: 'small', href: '#progress' }, 'Your progress')));

    root.append(h('div', { class: 'page' },
      head,
      welcomeCard(),
      h('div', { class: 'grid cols-2 next-grid' }, quranCard, lettersCard),
      strip));
  };
  /* First visit: what this is, where to begin, and where progress is kept. Goes away once dismissed. */
  function welcomeCard() {
    const st = Q.store.state;
    if (st.settings.welcomed) return null;
    const started = Q.store.totals().n > 0 || st.quran.list.length > 0 || Object.keys(st.quran.v).length > 0;
    if (started) return null;
    const close = () => { Q.store.setSetting('welcomed', true); card.remove(); };
    const card = h('section', { class: 'card welcome' },
      h('div', { class: 'card-head' },
        h('h2', null, 'Welcome'),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: close }, 'Hide')),
      h('p', { style: { color: 'var(--ink-2)', maxWidth: '68ch' } },
        'Learn to read the Quran and memorize it, even if you don’t read Arabic yet: every word comes with its transliteration and meaning. Start with a surah or with the letters below.'),
      h('div', { class: 'welcome-foot' },
        h('p', { class: 'small muted' }, 'Free, no account. Your progress stays on this device.'),
        h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'small muted' }, 'Spelling'), Q.schemeSwitch())));
    return card;
  }
  function segBarMini(sum) {
    return h('div', { class: 'qbar' }, h('i', { class: 'mem', style: { width: (sum.mem / sum.count * 100) + '%' } }), h('i', { class: 'lrn', style: { width: (sum.learning / sum.count * 100) + '%' } }));
  }
})(window.Q = window.Q || {});
