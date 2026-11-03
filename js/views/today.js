/* Huruf — Today: countdown, Iqra path, today's numbers, where to start. */
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

  Q.views.today = function (root) {
    const st = Q.store.state;
    const r = Q.ramadan();
    const book = st.settings.iqraBook || 1;
    const today = Q.store.today();
    const streak = Q.store.streak();
    const goal = st.settings.goal || 150;

    /* greeting */
    const head = h('div', { class: 'page-head' },
      h('div', null,
        h('h1', { class: 'hello' }, 'As-salāmu ʿalaykum', h('span', { class: 'ar' }, 'السَّلَامُ عَلَيْكُمْ')),
        h('p', null, Q.fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }) + '. A little every day adds up. Ten focused minutes beats one long session a week.')),
      h('a', { class: 'btn primary lg', href: '#practice' }, 'Start practice'));

    /* countdown */
    const booksLeft = 6 - book + 1;
    const perBook = r.days > 0 ? Math.floor(r.days / booksLeft) : 0;
    const fmtLong = d => Q.fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' });
    const shown = r.phase === 'during' ? r.dayOf : r.days;
    let body;
    if (r.phase === 'during') {
      body = [h('div', { class: 'eyebrow' }, 'Ramadan Mubarak'), h('h2', null, `Day ${r.dayOf} of Ramadan`), h('p', { class: 'sub' }, 'Keep reading every day. Every letter counts.')];
    } else if (r.phase === 'tonight') {
      body = [h('div', { class: 'eyebrow' }, 'Tonight'), h('h2', null, 'Ramadan begins at sunset'), h('p', { class: 'sub' }, `First taraweeh tonight. First fast ${fmtLong(r.fast)}.`)];
    } else {
      body = [
        h('div', { class: 'eyebrow' }, 'Countdown'),
        h('h2', null, `${r.days === 1 ? 'Day' : 'Days'} until Ramadan${r.year ? ' ' + r.year : ''}`),
        h('p', { class: 'sub' }, `Begins at sunset on ${fmtLong(r.night)}, ${r.night.getFullYear()}: the first taraweeh. First fast ${fmtLong(r.fast)}.`,
          r.source === 'custom' ? ' (Your own date from Setup.)' : ' Expected date; your mosque confirms it after the moon sighting.'),
        h('p', { class: 'sub' }, `That is about ${Math.round(r.days / 7)} weeks. With ${booksLeft} Iqra ${booksLeft === 1 ? 'book' : 'books'} to go, aim for roughly `, h('b', null, `${perBook} days per book`), '.'),
      ];
    }
    const countdown = h('section', { class: 'card countdown' },
      h('div', { class: 'ayah-num' }, ornament(),
        h('div', null, h('span', { class: 'n num' }, shown), h('span', { class: 'n-ar' }, Q.toArabicDigits(shown)))),
      h('div', { class: 'stack' }, body));

    /* today numbers */
    const goalPct = Math.min(1, today.n / goal);
    const todayCard = h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', null, 'Today'), h('span', { class: 'small muted num' }, `goal ${goal} reads`)),
      h('div', { class: 'stack', style: { gap: '6px' } },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'small' }, today.n >= goal ? 'Goal reached. Alḥamdulillāh.' : `${goal - today.n} reads to today's goal`),
          h('span', { class: 'small muted num' }, Q.pct(goalPct))),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(goalPct * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: (goalPct * 100) + '%' } }))),
      h('div', { class: 'grid cols-2', style: { gap: '14px' } },
        h('div', { class: 'stat' }, h('span', { class: 'v' }, Q.fmtInt(today.n)), h('span', { class: 'k' }, 'letters read')),
        h('div', { class: 'stat' }, h('span', { class: 'v' }, today.n ? Q.pct(1 - today.w / today.n) : '–'), h('span', { class: 'k' }, 'right')),
        h('div', { class: 'stat' }, h('span', { class: 'v' }, streak.cur, h('small', null, streak.cur === 1 ? 'day' : 'days')), h('span', { class: 'k' }, 'streak · best ' + streak.best)),
        h('div', { class: 'stat' }, h('span', { class: 'v' }, Math.round(today.ms / 60000), h('small', null, 'min')), h('span', { class: 'k' }, 'practised'))));

    /* Iqra path */
    const track = h('div', { class: 'iqra-track' }, Q.IQRA.map(b =>
      h('button', {
        type: 'button', class: 'iqra-step' + (b.n < book ? ' done' : '') + (b.n === book ? ' current' : ''),
        title: b.covers, 'aria-pressed': String(b.n === book),
        onclick: () => { Q.store.setSetting('iqraBook', b.n); Q.go('today'); },
      },
        h('span', { class: 'bn' }, (b.n < book ? '✓ ' : '') + 'Iqra ' + b.n),
        h('span', { class: 'bt' }, b.title))));
    const cur = Q.IQRA[book - 1];
    const iqra = h('section', { class: 'card stack' },
      h('div', { class: 'card-head' },
        h('h2', null, 'Your Iqra path'),
        h('span', { class: 'small muted' }, 'Click the book you are on with your teacher')),
      track,
      h('p', { class: 'small', style: { color: 'var(--ink-2)' } }, h('b', null, `Iqra ${cur.n}: `), Q.mixed(Q.fill(cur.covers)),
        cur.n >= 4 ? ' Huruf drills the letters and vowels for now. Sukūn, shadda and real words are the next modules to build.' : ''));

    /* trickiest letters */
    // only letters that really are weak (below "Good"), not just the lowest of a strong set
    const weak = Q.store.weakest(5, 3).filter(x => x.m < 0.8);
    const pairsToday = Q.store.mixups(2, 2);
    const weakCard = h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, 'Your weak spots'), weak.length || pairsToday.length ? h('a', { class: 'small', href: '#progress' }, 'All stats') : null),
      weak.length || pairsToday.length
        ? h('div', { class: 'stack' },
          weak.length ? null : h('p', { class: 'small muted' }, 'No struggling letters right now. These pairs still trip you up:'),
          h('div', { class: 'weak-list' }, weak.map(({ l, m, r: rec }) =>
            h('div', { class: 'weak-item' },
              h('span', { class: 'ar' }, l.ch),
              h('div', { class: 'stack', style: { gap: '4px' } },
                h('div', { class: 'row', style: { justifyContent: 'space-between' } },
                  h('span', { class: 'nm' }, l.name), h('span', { class: 'small muted num' }, `${Q.pct(1 - rec.w / rec.n)} right · ${rec.n} reads`)),
                h('div', { class: 'bar' }, h('i', { style: { width: Math.round(m * 100) + '%' } }))),
              h('span', { class: 'tag' }, Q.store.LEVELS[Q.store.level(l.id)])))),
          pairsToday.length ? h('div', { class: 'stack', style: { gap: '0' } }, h('div', { class: 'eyebrow', style: { marginTop: '6px' } }, 'You often mix up'), pairsToday.map(Q.mixPairRow)) : null,
          h('button', { class: 'btn primary', type: 'button', onclick: () => { Q.store.setPractice('focus', 'weak'); Q.go('practice'); } }, 'Practise my weak spots'))
        : h('p', { class: 'empty' }, 'Do a few rounds of practice and the letters you miss most will show up here.'));

    /* quick start */
    const rec = PRESETS.find(p => p.book === Math.min(book, 4));
    const quick = h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, 'Quick start')),
      h('div', { class: 'quick' }, PRESETS.map(p =>
        h('a', { href: '#practice', class: p === rec ? 'rec' : '', onclick: e => { e.preventDefault(); Q.startPreset(p.preset); } },
          h('b', null, p.title + (p === rec ? ' · for you now' : '')), h('span', null, Q.mixed(Q.fill(p.sub)))))));

    /* Quran: reviews due and surahs in progress (filled in once the surah list loads) */
    const quranCard = h('section', { class: 'card today-quran' },
      h('div', { class: 'card-head' }, h('h2', null, 'Your surahs'), h('a', { class: 'small', href: '#surahs' }, 'All surahs')),
      h('p', { class: 'empty' }, 'Loading…'));
    Q.quran.loadIndex().then(index => {
      const due = Q.store.qDue();
      const list = Q.store.state.quran.list.map(n => index.find(x => x.n === n)).filter(Boolean).slice(0, 3);
      const verses = Q.store.today().q || 0;
      const kids = [h('div', { class: 'card-head' }, h('h2', null, 'Your surahs'), h('a', { class: 'small', href: '#surahs' }, 'All surahs'))];
      kids.push(h('div', { class: 'review-cta' + (due.length ? ' has-due' : ''), style: { padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' } },
        h('div', null,
          h('b', null, due.length ? `${due.length} ${due.length === 1 ? 'verse' : 'verses'} to review` : 'No reviews due'),
          h('div', { class: 'small muted' }, verses ? `${verses} verse ${verses === 1 ? 'practice' : 'practices'} today` : 'Reviews keep what you memorized from fading')),
        due.length ? h('a', { class: 'btn primary', href: '#review' }, 'Review now') : null));
      if (list.length) {
        list.forEach(meta => {
          const sum = Q.store.qSummary(meta.n, meta.verses);
          kids.push(h('a', { class: 'srow', href: '#surah-' + meta.n, style: { gridTemplateColumns: 'minmax(0, 1fr) 120px auto' } },
            h('span', { class: 'srow-name' }, h('b', null, meta.name), h('span', { class: 'small muted' }, `${sum.mem} of ${sum.count} memorized`)),
            segBarMini(sum),
            h('span', { class: 'ar sname', style: { fontSize: '22px' } }, meta.ar)));
        });
      } else {
        kids.push(h('p', { class: 'small', style: { color: 'var(--ink-2)' } }, 'Start with Al-Fātiḥah: it is recited in every prayer. Listen to it word by word, then learn it one verse at a time.'),
          h('a', { class: 'btn primary', href: '#surah-1' }, 'Start Al-Fātiḥah'));
      }
      quranCard.replaceChildren(...kids);
    }).catch(() => quranCard.replaceChildren(h('p', { class: 'empty' }, 'Surahs load when the site is opened from its web address.')));

    root.append(h('div', { class: 'page' },
      head,
      h('div', { class: 'split' }, countdown, todayCard),
      h('div', { class: 'split' }, quranCard, weakCard),
      quick,
      iqra));
  };
  function segBarMini(sum) {
    return h('div', { class: 'qbar' }, h('i', { class: 'mem', style: { width: (sum.mem / sum.count * 100) + '%' } }), h('i', { class: 'lrn', style: { width: (sum.learning / sum.count * 100) + '%' } }));
  }
})(window.Q = window.Q || {});
