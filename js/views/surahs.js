/* Huruf — Surahs: memorize short surahs by ear and by heart.
   #surahs        library: your surahs, where to start, all surahs
   #surah-112     one surah: 1 Listen · 2 Learn · 3 Test
   #review        verses due today, from every surah you are learning */
(function (Q) {
  'use strict';
  const { h } = Q;
  Q.views = Q.views || {};

  const store = () => Q.store;
  const prefs = () => Q.store.qPrefs();

  /* ---------------- shared pieces ---------------- */

  function loading(root, text) { root.replaceChildren(h('div', { class: 'page' }, h('p', { class: 'empty' }, text || 'Loading…'))); }
  function failed(root, err) {
    root.replaceChildren(h('div', { class: 'page' }, h('div', { class: 'card stack' },
      h('h2', null, 'Could not load the surah data'),
      h('p', { class: 'muted' }, 'Open the site from its web address (GitHub Pages) or a local server; browsers block these files when a page is opened straight from disk. ' + (err && err.message ? '(' + err.message + ')' : '')))));
  }

  /* a run of steps that can be cancelled (playing, pausing for your turn…) */
  function makeRun() {
    const tok = { stopped: false, onCancel: null };
    tok.cancel = () => { tok.stopped = true; if (tok.onCancel) tok.onCancel(); Q.audio.stop(); };
    return tok;
  }
  const isStop = e => e && (e.message === 'stopped');
  function audioProblem(e) {
    if (isStop(e)) return;
    if (e && e.name === 'NotAllowedError') Q.toast('Press play again to allow sound');
    else Q.toast('Could not play the recitation. Check your connection.');
  }

  function statusChip(status) {
    const label = { new: 'New', learning: 'Learning', memorized: 'Memorized' }[status];
    return h('span', { class: 'qchip ' + status }, label);
  }

  function segBar(sum) {
    const pct = x => (x / sum.count * 100) + '%';
    return h('div', { class: 'qbar', role: 'img', 'aria-label': `${sum.mem} memorized, ${sum.learning} learning, ${sum.fresh} new` },
      h('i', { class: 'mem', style: { width: pct(sum.mem) } }),
      h('i', { class: 'lrn', style: { width: pct(sum.learning) } }));
  }

  function verseBadge(n, attrs = {}) {
    return h('button', Object.assign({ class: 'vbadge', type: 'button', 'aria-label': 'Verse ' + n }, attrs), h('span', null, n));
  }

  /* Words of one verse. hide(i) → 'show' | 'cue' | 'blank'. */
  function wordLine(doc, v, opt = {}) {
    const p = prefs();
    const mode = opt.mode || p.text;
    const verse = doc.verses[v - 1];
    const tr = Q.quran.translit(doc, v);
    const line = h('div', { class: 'qline mode-' + mode + (opt.size ? ' size-' + opt.size : ''), dir: mode === 'translit' ? 'ltr' : 'rtl' });
    verse.words.forEach((ar, i) => {
      const state = opt.hide ? opt.hide(i) : 'show';
      const showMeaning = opt.meaning != null ? opt.meaning : p.meaning;
      const cls = 'qw' + (state !== 'show' ? ' hidden ' + state : '');
      let arEl, trEl;
      if (state === 'show') {
        arEl = h('span', { class: 'qw-ar ar' }, ar);
        trEl = h('span', { class: 'qw-tr' }, tr[i]);
      } else if (state === 'cue') {
        arEl = h('span', { class: 'qw-ar ar' }, Q.quran.cue(ar, true));
        trEl = h('span', { class: 'qw-tr' }, Q.quran.cue(tr[i], false));
      } else {
        arEl = h('span', { class: 'qw-ar ar' }, ' ');
        trEl = h('span', { class: 'qw-tr' }, ' ');
      }
      const kids = mode === 'arabic' ? [arEl] : mode === 'both' ? [arEl, trEl] : [arEl, trEl];
      const btn = h('button', {
        class: cls, type: 'button', 'data-i': i,
        title: state === 'show' ? (verse.w[i] || '') : 'Tap to peek',
        onclick: () => opt.onWord && opt.onWord(i, btn),
      }, kids, showMeaning && state === 'show' ? h('span', { class: 'qw-m' }, verse.w[i]) : null);
      line.append(btn);
    });
    return line;
  }

  /* light up the word being recited; p (0–1) sweeps through it, like karaoke */
  function highlightWord(container, v, w, p = 0) {
    const line = container.querySelector(`[data-verse="${v}"] .qline`);
    const el = w >= 0 && line ? line.querySelector(`.qw[data-i="${w}"]`) : null;
    container.querySelectorAll('.qw.now').forEach(x => { if (x !== el) x.classList.remove('now'); });
    if (!el) return;
    el.classList.add('now');
    el.style.setProperty('--p', p.toFixed(3));
  }

  /* The word you tapped: big, with its sound and meaning, and buttons to hear it again */
  function wordFocus(doc) {
    const el = h('div', { class: 'wfocus', hidden: true });
    let cur = null, tok = null;
    const stopW = () => { if (tok) { tok.cancel(); tok = null; } };
    async function say(times) {
      stopW();
      const t = tok = makeRun();
      try {
        for (let k = 0; k < times; k++) {
          await Q.audio.word(doc.n, cur.v, cur.i, prefs().reciter);
          if (t.stopped) return;
          if (k < times - 1) await Q.wait(Math.round(Q.audio.lastDuration() * 1000 * 1.6 + 900), t);
          if (t.stopped) return;
        }
      } catch (e) { audioProblem(e); }
      finally { if (tok === t) tok = null; }
    }
    function draw() {
      const verse = doc.verses[cur.v - 1];
      const tr = Q.quran.translit(doc, cur.v);
      el.hidden = false;
      el.replaceChildren(
        h('span', { class: 'ar' }, verse.words[cur.i]),
        h('div', null, h('div', { class: 'tr' }, tr[cur.i]), h('div', { class: 'm' }, `${verse.w[cur.i] || ''} · verse ${cur.v}, word ${cur.i + 1}`)),
        h('div', { class: 'row' },
          h('button', { class: 'btn sm', type: 'button', onclick: () => say(1) }, '▶ Again'),
          h('button', { class: 'btn sm', type: 'button', onclick: () => say(3), title: 'Plays it 3 times with a pause after each so you can repeat' }, 'Repeat ×3'),
          h('button', { class: 'btn sm', type: 'button', onclick: () => say(5) }, '×5'),
          h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Close', onclick: () => { stopW(); el.hidden = true; } }, '✕')));
    }
    return {
      el,
      show(v, i) { cur = { v, i }; draw(); say(1); },
      stop: stopW,
      redraw() { if (cur && !el.hidden) draw(); },
    };
  }

  /* Text / translation / transliteration / reciter / speed controls */
  function displayBar(onChange, opts = {}) {
    const p = prefs();
    const seg = (label, key, items) => h('div', { class: 'field' }, h('span', { class: 'label' }, label),
      h('div', { class: 'seg' }, items.map(([val, text]) => h('button', {
        type: 'button', 'aria-pressed': String(p[key] === val),
        onclick: () => { store().setQPref(key, val); onChange(key); },
      }, text))));
    const toggle = (label, key) => h('label', { class: 'toggle' },
      h('input', { type: 'checkbox', id: 'qp-' + key, checked: !!p[key], onchange: e => { store().setQPref(key, e.target.checked); onChange(key); } }), label);
    const reciter = h('div', { class: 'field' }, h('label', { class: 'label', for: 'qp-reciter' }, 'Reciter'),
      h('select', { id: 'qp-reciter', class: 'input', onchange: e => { store().setQPref('reciter', e.target.value); onChange('reciter'); } },
        Q.RECITERS.map(r => h('option', { value: r.id, selected: r.id === p.reciter }, r.label + ' — ' + r.sub))));
    return h('div', { class: 'qbar-controls' },
      seg('Text', 'text', [['translit', 'Transliteration'], ['both', 'Both'], ['arabic', 'Arabic']]),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Translation'),
        h('div', { class: 'seg' }, [['off', 'Off'], ['en', 'English'], ['pt', 'Português']].map(([val, text]) => h('button', {
          type: 'button', 'aria-pressed': String(val === 'off' ? !p.trans : (p.trans && p.transLang === val)),
          onclick: () => { if (val === 'off') store().setQPref('trans', false); else { store().setQPref('trans', true); store().setQPref('transLang', val); } onChange('trans'); },
        }, text)))),
      h('div', { class: 'field' }, h('span', { class: 'label', title: 'How the transliteration is spelled' }, 'Spelling'), Q.schemeSwitch(() => onChange('scheme'))),
      opts.audio === false ? null : reciter,
      opts.audio === false ? null : seg('Speed', 'speed', [[0.75, '0.75×'], [1, '1×']]),
      h('div', { class: 'stack', style: { gap: '4px' } },
        toggle('Word meanings', 'meaning')));
  }

  /* ---------------- library ---------------- */
  Q.views.surahs = function (root) {
    loading(root);
    let alive = true;
    Q.quran.loadIndex().then(index => { if (alive) render(index); }).catch(e => alive && failed(root, e));
    let sort = Q.storage.get('huruf.surahSort', 'short');
    let filter = '';

    function card(meta) {
      const sum = store().qSummary(meta.n, meta.verses);
      return h('a', { class: 'scard', href: '#surah-' + meta.n },
        h('div', { class: 'scard-top' }, h('span', { class: 'snum' }, meta.n), h('span', { class: 'ar sname' }, meta.ar)),
        h('b', null, meta.name),
        h('span', { class: 'small muted' }, `${Q.quran.metaName(meta)} · ${meta.verses} verses`),
        segBar(sum),
        h('span', { class: 'small' }, `${sum.mem} of ${sum.count} memorized`, sum.due ? h('span', { class: 'qchip due' }, sum.due + ' due') : null));
    }

    function render(index) {
      const list = store().state.quran.list.map(n => index.find(x => x.n === n)).filter(Boolean);
      const due = store().qDue();
      const next = store().qNextDue();

      const reviewCard = h('section', { class: 'card review-cta' + (due.length ? ' has-due' : '') },
        h('div', { class: 'stack', style: { gap: '4px' } },
          h('div', { class: 'eyebrow' }, 'Review'),
          h('h2', null, due.length ? `${due.length} ${due.length === 1 ? 'verse' : 'verses'} to review today` : 'Nothing to review today'),
          h('p', { class: 'small muted' }, due.length ? 'Say each one from memory, then check yourself. About ' + Math.max(1, Math.round(due.length * 0.4)) + ' min.'
            : next ? `Next review: ${Q.fmtDate(Q.parseDay(next), { weekday: 'long', month: 'short', day: 'numeric' })}.` : 'Learn a verse in a surah and it will come back here on a schedule.')),
        due.length ? h('a', { class: 'btn primary lg', href: '#review' }, 'Start review') : null);

      const mine = list.length
        ? h('section', { class: 'stack' }, h('h2', null, 'Your surahs'), h('div', { class: 'scard-grid' }, list.map(card)))
        : h('section', { class: 'stack' },
          h('h2', null, 'Start here'),
          h('p', { class: 'muted', style: { maxWidth: '64ch' } }, 'Al-Fātiḥah comes first, since every prayer needs it. The short ones after it are the surahs most people learn next.'),
          h('div', { class: 'scard-grid' }, Q.STARTER_SURAHS.slice(0, 6).map(n => index.find(x => x.n === n)).filter(Boolean).map(card)));

      const rows = h('div', { class: 'srows' });
      const renderRows = () => {
        let items = index.slice();
        if (sort === 'short') items.sort((a, b) => a.words - b.words);
        const f = filter.trim().toLowerCase();
        if (f) items = items.filter(x => (x.name + ' ' + x.en + ' ' + x.pt + ' ' + x.n + ' ' + x.ar).toLowerCase().includes(f));
        rows.replaceChildren(...items.map(meta => {
          const sum = store().qSummary(meta.n, meta.verses);
          const status = sum.mem === sum.count ? 'memorized' : (sum.mem || sum.learning) ? 'learning' : 'new';
          return h('a', { class: 'srow', href: '#surah-' + meta.n },
            h('span', { class: 'snum' }, meta.n),
            h('span', { class: 'srow-name' }, h('b', null, meta.name), h('span', { class: 'small muted' }, Q.quran.metaName(meta))),
            h('span', { class: 'small muted num' }, meta.verses + ' verses'),
            statusChip(status),
            h('span', { class: 'ar sname' }, meta.ar));
        }));
        if (!items.length) rows.append(h('p', { class: 'empty' }, 'No surah matches “' + filter + '”.'));
      };
      const search = h('input', { id: 'surah-search', class: 'input', type: 'search', placeholder: 'Find a surah: name, meaning or number', value: filter, oninput: e => { filter = e.target.value; renderRows(); } });
      const sortSeg = h('div', { class: 'seg' }, [['short', 'Shortest first'], ['mushaf', 'Mushaf order']].map(([val, label]) =>
        h('button', { type: 'button', 'aria-pressed': String(sort === val), onclick: e => { sort = val; Q.storage.set('huruf.surahSort', val); sortSeg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); renderRows(); } }, label)));
      renderRows();

      root.replaceChildren(h('div', { class: 'page' },
        h('div', { class: 'page-head' }, h('div', null,
          h('h1', null, 'Surahs'),
          h('p', null, 'Memorize short surahs by ear and by heart. Listen to Al-Ḥuṣarī, learn one verse at a time, then test yourself. Verses you learn come back for review on a schedule, so they stick.'))),
        reviewCard,
        mine,
        h('section', { class: 'card stack' },
          h('div', { class: 'card-head' }, h('h2', null, 'All surahs'), h('span', { class: 'small muted' }, 'Al-Fātiḥah and Juz ʿAmma (78–114)')),
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, search, sortSeg),
          rows)));
    }
    return () => { alive = false; };
  };

  /* ---------------- one surah ---------------- */
  Q.views.surah = function (root, n) {
    loading(root);
    let alive = true;
    let cleanup = [];
    Promise.all([Q.quran.loadIndex(), Q.quran.load(n)]).then(([, doc]) => { if (alive) build(doc); }).catch(e => alive && failed(root, e));

    function build(doc) {
      const count = doc.verses.length;
      const last = store().state.quran.last;
      let tab = last && last.n === n && last.tab ? last.tab : (store().qSummary(n, count).learning || store().qSummary(n, count).mem ? 'learn' : 'listen');
      let run = null;

      const head = h('div', { class: 'surah-head' });
      const tabsEl = h('div', { class: 'qtabs', role: 'tablist' });
      const bar = h('div', { class: 'card qdisplay' });
      const body = h('div', { class: 'qbody' });
      const barWrap = h('details', { class: 'qdisplay-details', open: window.innerWidth > 760 }, h('summary', null, 'Display and audio settings'), bar);
      root.replaceChildren(h('div', { class: 'page' }, head, tabsEl, barWrap, body));

      function renderHead() {
        const sum = store().qSummary(n, count);
        const inList = store().state.quran.list.includes(n);
        head.replaceChildren(
          h('a', { class: 'back', href: '#surahs' }, '← All surahs'),
          h('div', { class: 'surah-title' },
            h('div', null,
              h('h1', null, doc.name, h('span', { class: 'ar title-ar' }, doc.ar)),
              h('p', { class: 'muted' }, `${Q.quran.name(doc)} · ${count} verses · revealed in ${doc.place === 'meccan' ? 'Makkah' : 'Madinah'}`)),
            h('div', { class: 'surah-progress' },
              segBar(sum),
              h('span', { class: 'small' }, `${sum.mem} memorized · ${sum.learning} learning · ${sum.fresh} new`),
              h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { inList ? store().qRemove(n) : store().qAdd(n); renderHead(); } },
                inList ? '✓ In your surahs' : '+ Add to your surahs'))));
      }

      function renderTabs() {
        const tabs = [['listen', '1', 'Listen', 'Hear it, word by word'], ['learn', '2', 'Learn', 'One verse at a time'], ['test', '3', 'Test', 'Check what stuck']];
        tabsEl.replaceChildren(...tabs.map(([id, num, label, sub]) => h('button', {
          type: 'button', role: 'tab', 'aria-selected': String(tab === id), class: 'qtab',
          onclick: () => { if (tab !== id) { tab = id; store().qSetLast({ n, tab }); renderTabs(); renderBody(); } },
        }, h('span', { class: 'qtab-num' }, num), h('span', null, h('b', null, label), h('span', null, sub)))));
      }

      function onPref(key) {
        if (key === 'speed') { Q.audio.setRate(prefs().speed); }
        if (key === 'scheme') renderHead();
        if (key === 'reciter' && run) { run.cancel(); run = null; }
        bar.replaceChildren(displayBar(onPref));
        if (key !== 'speed' && key !== 'reciter') {
          if (tabCleanup && tabCleanup.redraw) tabCleanup.redraw(); else renderBody(true);
        }
      }

      let tabCleanup = null;
      function renderBody(keepState) {
        if (run) { run.cancel(); run = null; }
        if (tabCleanup) tabCleanup(keepState);
        tabCleanup = null;
        body.replaceChildren();
        if (tab === 'listen') tabCleanup = listenTab(doc, body, r => { run = r; });
        else if (tab === 'learn') tabCleanup = learnTab(doc, body, r => { run = r; }, keepState);
        else tabCleanup = testTab(doc, body, r => { run = r; }, () => { renderHead(); });
        renderHead();
      }

      Q.audio.setRate(prefs().speed);
      store().qSetLast({ n, tab });
      renderHead();
      renderTabs();
      bar.append(displayBar(onPref));
      renderBody();
      cleanup.push(() => { if (run) run.cancel(); if (tabCleanup) tabCleanup(); });
    }

    return () => { alive = false; cleanup.forEach(fn => fn()); Q.audio.stop(); };
  };

  /* ---------- 1 Listen ---------- */
  const learnState = {};   // per surah: { v, step, level } kept while the page is open

  function listenTab(doc, body, setRun) {
    const n = doc.n, count = doc.verses.length;
    const p = prefs();
    let pos = 1;
    let run = null;
    let turnEl = null;

    const list = h('div', { class: 'qverses' });
    const status = h('span', { class: 'small muted', 'aria-live': 'polite' });
    const followNote = h('span', { class: 'follow-note' });
    const focus = wordFocus(doc);
    function drawFollow() {
      const f = Q.audio.following(n, prefs().reciter);
      followNote.textContent = f === 'word' ? 'Following each word as it is recited' : f === 'verse' ? 'Following verse by verse (word timings not available for this recitation)' : '';
    }
    const playBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => run ? stopRun() : playFrom(pos) });

    function drawVerses() {
      list.replaceChildren();
      if (n !== 1 && n !== 9) {
        const tr = Q.quran.basmalaTranslit();
        list.append(h('div', { class: 'qverse basmala', 'data-verse': '0' },
          h('div', { class: 'qline mode-' + prefs().text, dir: prefs().text === 'translit' ? 'ltr' : 'rtl' },
            Q.BASMALA.split(' ').map((w, i) => h('span', { class: 'qw static' }, h('span', { class: 'qw-ar ar' }, w), prefs().text !== 'arabic' ? h('span', { class: 'qw-tr' }, tr[i]) : null)))));
      }
      doc.verses.forEach(verse => {
        list.append(h('div', { class: 'qverse', 'data-verse': verse.n },
          verseBadge(verse.n, { onclick: () => playFrom(verse.n), title: 'Play from verse ' + verse.n }),
          h('div', { class: 'qverse-main' },
            wordLine(doc, verse.n, { onWord: i => { stopRun(); focus.show(verse.n, i); } }),
            prefs().trans ? h('p', { class: 'qtrans' }, Q.quran.translation(verse)) : null)));
      });
      mark(pos, false);
    }

    function mark(v, scroll) {
      list.querySelectorAll('.qverse.current').forEach(x => x.classList.remove('current'));
      const el = list.querySelector(`[data-verse="${v}"]`);
      if (el) { el.classList.add('current'); if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      status.textContent = v ? `Verse ${v} of ${count}` : 'Bismillah';
    }
    function yourTurn(v, ms) {
      if (turnEl) turnEl.remove();
      const el = list.querySelector(`[data-verse="${v}"] .qverse-main`);
      if (!el) return;
      turnEl = h('div', { class: 'your-turn' }, h('span', null, 'Your turn: say it'), h('i', { style: { animationDuration: ms + 'ms' } }));
      el.append(turnEl);
    }

    async function playFrom(start) {
      stopRun();
      run = makeRun();
      setRun(run);
      const tok = run;
      drawButton();
      try {
        do {
          for (let v = start; v <= count; v++) {
            pos = v;
            if (v === 1 && n !== 1 && n !== 9 && prefs().basmala) {
              mark(0, true);
              await Q.audio.basmala(prefs().reciter);
              if (tok.stopped) return;
            }
            for (let r = 0; r < prefs().repeat; r++) {
              mark(v, r === 0);
              const playing = Q.audio.verse(n, v, prefs().reciter, (w, p) => highlightWord(list, v, w, p));
              setTimeout(drawFollow, 50);
              await playing;
              drawFollow();
              if (tok.stopped) return;
              if (prefs().gap) {
                const ms = Math.round(Q.audio.lastDuration() * 1000 / prefs().speed * 1.1 + 700);
                yourTurn(v, ms);
                await Q.wait(ms, tok);
                if (turnEl) { turnEl.remove(); turnEl = null; }
                if (tok.stopped) return;
              }
            }
          }
          start = 1;
        } while (prefs().loop && !tok.stopped);
        pos = 1;
        mark(1, false);
      } catch (e) { audioProblem(e); }
      finally { if (run === tok) { run = null; setRun(null); drawButton(); } if (turnEl) { turnEl.remove(); turnEl = null; } }
    }
    function stopRun() {
      if (run) { run.cancel(); run = null; setRun(null); }
      focus.stop();
      if (turnEl) { turnEl.remove(); turnEl = null; }
      highlightWord(list, 0, -1);
      drawButton();
    }
    function drawButton() { playBtn.replaceChildren(run ? '❚❚ Pause' : (pos > 1 ? `▶ Play from verse ${pos}` : '▶ Play surah')); }

    const opt = (label, key, values) => h('div', { class: 'field' }, h('span', { class: 'label' }, label),
      h('div', { class: 'seg' }, values.map(([val, text]) => h('button', {
        type: 'button', 'aria-pressed': String(prefs()[key] === val),
        onclick: e => { store().setQPref(key, val); e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); },
      }, text))));

    const player = h('div', { class: 'qplayer' },
      focus.el,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Previous verse', onclick: () => { pos = Math.max(1, pos - 1); if (run) playFrom(pos); else { mark(pos, true); drawButton(); } } }, '⏮'),
        playBtn,
        h('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Next verse', onclick: () => { pos = Math.min(count, pos + 1); if (run) playFrom(pos); else { mark(pos, true); drawButton(); } } }, '⏭'),
        status, followNote),
      h('div', { class: 'row qplayer-opts' },
        opt('Each verse', 'repeat', [[1, '1×'], [2, '2×'], [3, '3×'], [5, '5×']]),
        opt('Pause for you to repeat', 'gap', [[false, 'Off'], [true, 'On']]),
        opt('When it ends', 'loop', [[false, 'Stop'], [true, 'Start again']]),
        n !== 1 ? opt('Bismillah first', 'basmala', [[true, 'Yes'], [false, 'No']]) : null));

    body.append(
      h('p', { class: 'hint-line' }, 'Tap any word to hear it alone. Tap a verse number to start there. ', h('kbd', { class: 'key' }, 'Space'), ' play or pause, ', h('kbd', { class: 'key' }, '↑'), h('kbd', { class: 'key' }, '↓'), ' change verse.'),
      list, player);
    drawVerses();
    drawButton();

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === ' ') { e.preventDefault(); run ? stopRun() : playFrom(pos); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pos = Math.min(count, pos + 1); run ? playFrom(pos) : (mark(pos, true), drawButton()); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pos = Math.max(1, pos - 1); run ? playFrom(pos) : (mark(pos, true), drawButton()); }
    }
    document.addEventListener('keydown', onKey);
    const cleanup = () => { document.removeEventListener('keydown', onKey); stopRun(); };
    cleanup.redraw = () => { drawVerses(); focus.redraw(); };
    return cleanup;
  }

  /* ---------- 2 Learn ---------- */
  const LEVELS = [
    { id: 0, label: 'All words', hide: () => 'show' },
    { id: 1, label: 'Some hidden', hide: i => (i % 2 === 1 ? 'cue' : 'show') },
    { id: 2, label: 'First letters', hide: () => 'cue' },
    { id: 3, label: 'Hidden', hide: () => 'blank' },
  ];

  function learnTab(doc, body, setRun, keepState) {
    const n = doc.n, count = doc.verses.length;
    const st = learnState[n] || (learnState[n] = { v: firstUnlearned(), step: 'listen', level: 1 });
    if (!keepState && !learnState[n].touched) Object.assign(st, { v: firstUnlearned(), step: 'listen', level: 1 });
    let run = null;
    let peek = new Set();
    let checked = false;
    const rec = Q.recorder ? Q.recorder() : null;

    function firstUnlearned() {
      for (let v = 1; v <= count; v++) if (store().qStatus(n + ':' + v) === 'new') return v;
      return 1;
    }
    const focus = wordFocus(doc);
    function stopRun() { if (run) { run.cancel(); run = null; setRun(null); } focus.stop(); }
    function startRun() { stopRun(); run = makeRun(); setRun(run); return run; }

    const picker = h('div', { class: 'vpicker' });
    const steps = h('div', { class: 'lsteps' });
    const stage = h('div', { class: 'frame lstage' });
    const controls = h('div', { class: 'lcontrols' });
    body.append(
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, picker),
      steps, stage, focus.el, controls);

    function go(v, step) {
      stopRun();
      if (rec && v !== st.v) rec.reset();
      st.v = v; st.step = step || 'listen'; st.touched = true;
      peek = new Set(); checked = false;
      if (st.step === 'recall' && st.level === 0) st.level = 1;
      draw();
    }

    function draw() {
      // verse picker
      picker.replaceChildren(h('span', { class: 'small muted' }, 'Verse'), ...doc.verses.map(verse => {
        const s = store().qStatus(verse.key);
        return h('button', { type: 'button', class: 'vdot ' + s + (verse.n === st.v ? ' on' : ''), title: `Verse ${verse.n}: ${s}`, onclick: () => go(verse.n, 'listen') }, verse.n);
      }));
      // steps
      const list = [['listen', 'Listen & repeat'], ['recall', 'Say it from memory']];
      if (st.v > 1) list.push(['connect', 'Join it to the verses before']);
      steps.replaceChildren(...list.map(([id, label], i) => h('button', {
        type: 'button', class: 'lstep' + (st.step === id ? ' on' : '') + (list.findIndex(x => x[0] === st.step) > i ? ' done' : ''),
        onclick: () => go(st.v, id),
      }, h('span', { class: 'lstep-num' }, i + 1), label)));
      if (st.step === 'listen') drawListen();
      else if (st.step === 'recall') drawRecall();
      else if (st.step === 'connect') drawConnect();
      else drawDone();
    }

    function verseBlock(v, hide, size) {
      const verse = doc.verses[v - 1];
      return h('div', { class: 'qverse big', 'data-verse': v },
        verseBadge(v, { tabindex: -1 }),
        h('div', { class: 'qverse-main' },
          wordLine(doc, v, {
            size, hide,
            onWord: (i) => {
              if (hide && hide(i) !== 'show') { peek.add(v + ':' + i); draw(); return; }
              stopRun(); focus.show(v, i);
            },
          }),
          prefs().trans && (!hide || checked) ? h('p', { class: 'qtrans' }, Q.quran.translation(verse)) : null));
    }

    async function playVerses(from, to, opts = {}) {
      const tok = startRun();
      try {
        for (let rep = 0; rep < (opts.times || 1); rep++) {
          for (let v = from; v <= to; v++) {
            await Q.audio.verse(n, v, prefs().reciter, (w, p) => highlightWord(stage, v, w, p));
            if (tok.stopped) return;
            if (opts.gap) {
              const ms = Math.round(Q.audio.lastDuration() * 1000 / prefs().speed * 1.15 + 700);
              const t = stage.querySelector('.your-turn-big');
              if (t) { t.hidden = false; t.querySelector('i').style.animationDuration = ms + 'ms'; t.querySelector('i').classList.remove('go'); void t.offsetWidth; t.querySelector('i').classList.add('go'); }
              await Q.wait(ms, tok);
              if (t) t.hidden = true;
              if (tok.stopped) return;
            }
          }
        }
      } catch (e) { audioProblem(e); }
      finally { if (run === tok) { run = null; setRun(null); } highlightWord(stage, 0, -1); }
    }

    function drawListen() {
      const v = st.v;
      stage.replaceChildren(
        h('div', { class: 'eyebrow' }, `Verse ${v} of ${count}`),
        verseBlock(v, null, 'xl'),
        h('div', { class: 'your-turn-big', hidden: true }, h('span', null, 'Your turn: say it out loud'), h('i')));
      controls.replaceChildren(
        h('p', { class: 'muted' }, 'Listen, then repeat in the pause. Copy the reciter’s sounds and rhythm, not just the words.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary lg', type: 'button', onclick: () => playVerses(v, v, { times: 3, gap: true }) }, '▶ Listen and repeat ×3'),
          h('button', { class: 'btn', type: 'button', onclick: () => playVerses(v, v) }, 'Play once'),
          h('button', { class: 'btn ghost', type: 'button', onclick: stopRun }, 'Stop')),
        recorderBlock(v),
        h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
          h('button', { class: 'btn primary', type: 'button', onclick: () => go(v, 'recall') }, 'Next: say it from memory →')));
    }

    function drawRecall() {
      const v = st.v;
      const lvl = LEVELS[st.level];
      const hide = i => (checked || peek.has(v + ':' + i)) ? 'show' : lvl.hide(i);
      stage.replaceChildren(h('div', { class: 'eyebrow' }, `Verse ${v} of ${count}`), verseBlock(v, hide, 'xl'));
      const levelSeg = h('div', { class: 'seg' }, LEVELS.map(L => h('button', {
        type: 'button', 'aria-pressed': String(st.level === L.id), onclick: () => { st.level = L.id; peek = new Set(); checked = false; draw(); },
      }, L.label)));
      controls.replaceChildren(
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('p', { class: 'muted' }, checked ? 'How did it go?' : 'Say the whole verse out loud. Tap a hidden word if you need a peek.'),
          levelSeg),
        checked
          ? h('div', { class: 'row' },
            h('button', { class: 'btn', type: 'button', onclick: () => { checked = false; peek = new Set(); draw(); } }, 'Not yet, try again'),
            h('button', { class: 'btn primary lg', type: 'button', onclick: () => {
              if (st.level < 3) { st.level++; checked = false; peek = new Set(); Q.toast('Good. Now with fewer words showing'); draw(); return; }
              store().qLearned(doc.verses[v - 1].key);
              Q.toast('Verse ' + v + ' learned');
              if (v > 1) go(v, 'connect'); else if (v < count) { st.level = 1; go(v + 1, 'listen'); } else go(v, 'done');
            } }, st.level < 3 ? 'I said it right: hide more' : 'I said it right'))
          : h('div', { class: 'row' },
            h('button', { class: 'btn primary lg', type: 'button', onclick: () => { checked = true; draw(); playVerses(v, v); } }, 'Check: show and play', h('kbd', null, 'Space')),
            h('button', { class: 'btn ghost', type: 'button', onclick: () => go(v, 'listen') }, '← Listen again')),
        recorderBlock(v));
    }

    function drawConnect() {
      const v = st.v, from = Math.max(1, v - 2);
      const blocks = [];
      for (let x = from; x <= v; x++) blocks.push(verseBlock(x, i => (checked || peek.has(x + ':' + i)) ? 'show' : (i === 0 ? 'cue' : 'blank'), 'lg'));
      stage.replaceChildren(h('div', { class: 'eyebrow' }, `Verses ${from}–${v}, joined`), ...blocks);
      controls.replaceChildren(
        h('p', { class: 'muted' }, checked ? 'Did you get them all, in order?' : `Say verses ${from} to ${v} in one go, from memory. Only the first letter of each verse is shown.`),
        checked
          ? h('div', { class: 'row' },
            h('button', { class: 'btn', type: 'button', onclick: () => { checked = false; peek = new Set(); draw(); } }, 'Not yet, try again'),
            h('button', { class: 'btn primary lg', type: 'button', onclick: () => { st.level = 1; if (v < count) go(v + 1, 'listen'); else go(v, 'done'); } }, v < count ? `Yes. On to verse ${v + 1} →` : 'Yes. Finish'))
          : h('div', { class: 'row' },
            h('button', { class: 'btn primary lg', type: 'button', onclick: () => { checked = true; draw(); playVerses(from, v); } }, 'Check: show and play', h('kbd', null, 'Space'))));
    }

    function drawDone() {
      picker.replaceChildren();
      steps.replaceChildren();
      stage.replaceChildren(h('div', { class: 'summary' },
        h('div', { class: 'big' }, 'Mā shāʾ Allāh'),
        h('p', null, `You worked through all ${count} verses of ${doc.name}. They are now in your review schedule and will come back tomorrow.`)));
      controls.replaceChildren(h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => go(1, 'listen') }, 'Go through it again'),
        h('button', { class: 'btn primary lg', type: 'button', onclick: () => { store().qSetLast({ n, tab: 'test' }); Q.go('surah-' + n); } }, 'Test the whole surah')));
      store().qAdd(n);
    }

    function recorderBlock(v) {
      if (!rec) return null;
      return rec.block(() => Q.audio.verse(n, v, prefs().reciter), 'verse ' + v, stopRun);
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === ' ') {
        e.preventDefault();
        const primary = controls.querySelector('.btn.primary.lg');
        if (primary) primary.click();
      }
    }
    document.addEventListener('keydown', onKey);
    if (!store().state.quran.list.includes(n)) store().qAdd(n);
    draw();
    const cleanup = () => { document.removeEventListener('keydown', onKey); stopRun(); if (rec) rec.dispose(); };
    cleanup.redraw = () => { draw(); focus.redraw(); };
    return cleanup;
  }

  /* ---------- 3 Test ---------- */
  function testTab(doc, body, setRun, onProgress) {
    const n = doc.n, count = doc.verses.length;
    let run = null;
    let mode = null;
    function stopRun() { if (run) { run.cancel(); run = null; setRun(null); } }
    const scores = store().state.quran.tests || (store().state.quran.tests = {});
    let redrawActive = null;

    function menu() {
      stopRun();
      redrawActive = null;
      mode = null;
      const best = scores[n] || {};
      const card = (id, title, who, desc, disabled) => h('button', { type: 'button', class: 'tcard', disabled, onclick: () => start(id) },
        h('span', { class: 'qchip ' + (who === 'auto' ? 'auto' : '') }, who === 'auto' ? 'Checked for you' : 'You check'),
        h('b', null, title), h('span', { class: 'small muted' }, desc),
        best[id] ? h('span', { class: 'small' }, `Last time: ${Q.pct(best[id].score)} · ${Q.fmtDate(new Date(best[id].t), { month: 'short', day: 'numeric' })}`) : null);
      body.replaceChildren(
        h('div', { class: 'tcards' },
          card('recall', 'Say it from memory', 'self', 'Each verse starts hidden. Say it, reveal it, be honest. This sets when each verse comes back for review.'),
          card('order', 'Put the words in order', 'auto', 'The words of each verse are shuffled. Tap them in the right order.'),
          card('next', 'What comes next?', 'auto', count < 3 ? 'Needs a surah with at least 3 verses.' : 'You see one verse. Pick how the next one starts.', count < 3)));
    }

    function saveScore(id, score) {
      scores[n] = Object.assign({}, scores[n], { [id]: { score, t: Date.now() } });
      store().save();
    }

    function start(id) {
      mode = id;
      if (id === 'recall') { const sess = recallRun(doc.verses.map(v => v.key), body, setRun, r => { run = r; }, res => { saveScore('recall', res.score); onProgress(); }, menu); redrawActive = sess.redraw; }
      else if (id === 'order') orderRun();
      else nextRun();
    }

    /* word order */
    function orderRun() {
      let v = 1, errors = 0, total = 0, perfect = 0;
      const p = prefs();
      function draw() {
        const verse = doc.verses[v - 1];
        const tr = Q.quran.translit(doc, v);
        const items = verse.words.map((ar, i) => ({ i, ar, tr: tr[i] }));
        const shuffled = items.length > 1 ? Q.shuffle(items) : items;
        if (items.length > 2 && shuffled.every((x, k) => x.i === k)) shuffled.reverse();
        let next = 0, mistakes = 0;
        const dir = 'rtl';   // build the verse in mushaf order, right to left
        const answer = h('div', { class: 'qline answer mode-' + p.text, dir, 'data-empty': 'Tap the words in order. The first word goes on the right.' });
        const pool = h('div', { class: 'qline pool mode-' + p.text, dir });
        const fb = h('div', { class: 'feedback' }, ' ');
        const label = x => [h('span', { class: 'qw-ar ar' }, x.ar), p.text === 'arabic' ? null : h('span', { class: 'qw-tr' }, x.tr)];
        shuffled.forEach(x => {
          const btn = h('button', { class: 'qw', type: 'button', onclick: () => {
            const want = items[next];
            if (x.ar === want.ar && x.tr === want.tr) {
              btn.remove();
              answer.append(h('span', { class: 'qw static placed' }, label(x)));
              next++;
              if (next === items.length) finishVerse(mistakes);
            } else {
              mistakes++; errors++;
              btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
              fb.className = 'feedback bad'; fb.replaceChildren(h('div', null, 'Not that one yet'));
            }
          } }, label(x));
          pool.append(btn);
        });
        body.replaceChildren(
          h('div', { class: 'stage-top' }, h('span', { class: 'eyebrow' }, `Put the words in order · verse ${v} of ${count}`), h('button', { class: 'btn ghost sm', type: 'button', onclick: menu }, 'End test')),
          h('div', { class: 'frame lstage' },
            h('div', { class: 'row' }, verseBadge(v, { tabindex: -1 }), h('span', { class: 'small muted' }, p.trans ? Q.quran.translation(verse) : '')),
            answer, h('hr', { class: 'soft' }), pool, fb));
        function finishVerse(m) {
          total++;
          if (!m) perfect++;
          fb.className = 'feedback good';
          fb.textContent = m ? `Done, with ${m} ${m === 1 ? 'slip' : 'slips'}` : 'Perfect';
          store().qGrade(verse.key, m === 0 ? 'good' : m <= 2 ? 'hard' : 'again');
          onProgress();
          const tok = makeRun(); stopRun(); run = tok; setRun(tok);
          Q.audio.verse(n, v, prefs().reciter).catch(audioProblem);
          body.querySelector('.frame').append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
            h('button', { class: 'btn primary lg', type: 'button', onclick: () => { stopRun(); if (v < count) { v++; draw(); } else done(); } }, v < count ? 'Next verse' : 'See result', h('kbd', null, 'Space'))));
        }
      }
      function done() {
        const score = total ? perfect / total : 0;
        saveScore('order', score);
        body.replaceChildren(h('div', { class: 'frame lstage' }, h('div', { class: 'summary' },
          h('div', { class: 'big num' }, Q.pct(score)), h('p', null, `${perfect} of ${total} verses with no slips · ${errors} slips in total`))),
          h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: menu }, 'Back to tests'), h('button', { class: 'btn primary', type: 'button', onclick: orderRun }, 'Again')));
      }
      draw();
    }

    /* what comes next */
    function nextRun() {
      const p = prefs();
      const order = Q.shuffle(doc.verses.slice(0, -1).map(v => v.n));
      let k = 0, right = 0;
      const opening = (v) => {
        const verse = doc.verses[v - 1];
        const tr = Q.quran.translit(doc, v);
        const take = Math.min(verse.words.length, 3);
        return { ar: verse.words.slice(0, take).join(' ') + (verse.words.length > take ? ' …' : ''), tr: tr.slice(0, take).join(' ') + (verse.words.length > take ? ' …' : '') };
      };
      function draw() {
        const v = order[k];
        const target = v + 1;
        const seen = new Set([opening(target).ar]);
        const opts = [target];
        Q.shuffle(doc.verses.map(x => x.n).filter(x => x !== target && x !== v)).forEach(x => {
          const o = opening(x).ar;
          if (opts.length < 4 && !seen.has(o)) { seen.add(o); opts.push(x); }
        });
        const shuffled = Q.shuffle(opts);
        let answered = false;
        const fb = h('div', { class: 'feedback' }, ' ');
        const grid = h('div', { class: 'nopts' }, shuffled.map((x, i) => {
          const o = opening(x);
          const btn = h('button', { class: 'nopt', type: 'button', onclick: () => {
            if (answered) return;
            answered = true;
            const ok = x === target;
            if (ok) right++;
            grid.querySelectorAll('.nopt').forEach((b, j) => { if (shuffled[j] === target) b.classList.add('right'); else if (b === btn) b.classList.add('picked-wrong'); else b.classList.add('dim'); });
            fb.className = 'feedback ' + (ok ? 'good' : 'bad');
            fb.textContent = ok ? 'Right' : `Verse ${target} starts differently. Listen:`;
            store()._day().q = (store()._day().q || 0) + 1; store().save();
            const tok = makeRun(); stopRun(); run = tok; setRun(tok);
            Q.audio.verse(n, target, prefs().reciter).catch(audioProblem);
            body.querySelector('.frame').append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
              h('button', { class: 'btn primary lg', type: 'button', onclick: () => { stopRun(); k++; k < order.length ? draw() : done(); } }, k + 1 < order.length ? 'Next' : 'See result', h('kbd', null, 'Space'))));
          } },
            h('span', { class: 'idx' }, i + 1),
            p.text !== 'translit' ? h('span', { class: 'ar' }, o.ar) : h('span', { class: 'ar small-ar' }, o.ar),
            p.text !== 'arabic' ? h('span', { class: 'qw-tr' }, o.tr) : null);
          return btn;
        }));
        body.replaceChildren(
          h('div', { class: 'stage-top' }, h('span', { class: 'eyebrow' }, `What comes next? · ${k + 1} of ${order.length}`), h('button', { class: 'btn ghost sm', type: 'button', onclick: menu }, 'End test')),
          h('div', { class: 'frame lstage' },
            h('div', { class: 'eyebrow' }, `After verse ${v}…`),
            h('div', { class: 'qverse' }, verseBadge(v, { tabindex: -1 }), h('div', { class: 'qverse-main' }, wordLine(doc, v, { size: 'lg', meaning: false }))),
            h('div', { class: 'eyebrow' }, `…verse ${target} begins with`),
            grid, fb));
      }
      function done() {
        const score = order.length ? right / order.length : 0;
        saveScore('next', score);
        body.replaceChildren(h('div', { class: 'frame lstage' }, h('div', { class: 'summary' },
          h('div', { class: 'big num' }, Q.pct(score)), h('p', null, `${right} of ${order.length} right`))),
          h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: menu }, 'Back to tests'), h('button', { class: 'btn primary', type: 'button', onclick: nextRun }, 'Again')));
      }
      draw();
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (mode === 'next' && /^[1-4]$/.test(e.key)) { const b = body.querySelectorAll('.nopt')[Number(e.key) - 1]; if (b) b.click(); }
      if (e.key === ' ' && mode !== 'recall') {
        const primary = body.querySelector('.btn.primary.lg');
        if (primary) { e.preventDefault(); primary.click(); }
      }
    }
    document.addEventListener('keydown', onKey);
    menu();
    const cleanup = () => { document.removeEventListener('keydown', onKey); stopRun(); if (recallCleanup) recallCleanup(); };
    cleanup.redraw = () => { if (redrawActive) redrawActive(); else if (!mode) menu(); };
    return cleanup;
  }

  /* ---------- recall: say it from memory (used by Test and Review) ---------- */
  let recallCleanup = null;
  function recallRun(keys, body, setRun, setLocalRun, onDone, onExit, opts = {}) {
    if (recallCleanup) recallCleanup();
    const queue = keys.slice();
    const requeued = new Set();
    let i = 0, revealed = false, got = 0, shaky = 0, missed = 0;
    let run = null;
    function stopRun() { if (run) { run.cancel(); run = null; setRun(null); setLocalRun(null); } }

    async function draw() {
      const key = queue[i];
      const [n, v] = key.split(':').map(Number);
      const doc = await Q.quran.load(n);
      const verse = doc.verses[v - 1];
      const hide = () => revealed ? 'show' : 'blank';
      const cue = v > 1
        ? h('div', { class: 'qcue' }, h('span', { class: 'eyebrow' }, `After verse ${v - 1}`), wordLine(doc, v - 1, { size: 'sm', meaning: false }))
        : h('div', { class: 'qcue' }, h('span', { class: 'eyebrow' }, `Start of ${doc.name}`), n !== 1 ? h('span', { class: 'ar', style: { fontSize: '22px' } }, Q.BASMALA) : null);
      const firstHint = h('button', { class: 'btn ghost sm', type: 'button', onclick: () => {
        const el = body.querySelector('.recall-verse .qline');
        const first = el && el.querySelector('.qw');
        if (first) { const tr = Q.quran.translit(doc, v); first.classList.remove('blank'); first.classList.add('cue'); first.querySelector('.qw-ar').textContent = Q.quran.cue(verse.words[0], true); const t = first.querySelector('.qw-tr'); if (t) t.textContent = Q.quran.cue(tr[0], false); }
      } }, 'Hint: first letter');
      const verseEl = h('div', { class: 'qverse big recall-verse', 'data-verse': v }, verseBadge(v, { tabindex: -1 }),
        h('div', { class: 'qverse-main' }, wordLine(doc, v, { size: 'lg', hide, onWord: (w) => { if (revealed) Q.audio.word(n, v, w, prefs().reciter).catch(audioProblem); } }),
          revealed && prefs().trans ? h('p', { class: 'qtrans' }, Q.quran.translation(verse)) : null));
      const grade = g => {
        stopRun();
        store().qGrade(key, g);
        if (g === 'again') { missed++; if (!requeued.has(key)) { requeued.add(key); queue.push(key); } }
        else if (g === 'hard') shaky++; else got++;
        i++; revealed = false;
        if (i < queue.length) draw(); else finish();
      };
      body.replaceChildren(
        h('div', { class: 'stage-top' },
          h('span', { class: 'eyebrow' }, `${opts.title || 'Say it from memory'} · ${Math.min(i + 1, queue.length)} of ${queue.length}`),
          h('div', { class: 'row' }, h('span', { class: 'small muted' }, `${doc.name} ${v}`), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { stopRun(); onExit(); } }, opts.exitLabel || 'End test'))),
        h('div', { class: 'frame lstage' }, cue, verseEl,
          revealed ? null : h('p', { class: 'muted center' }, 'Say verse ' + v + ' out loud, then reveal it.')),
        revealed
          ? h('div', { class: 'row grade-row' },
            h('span', { class: 'muted' }, 'How did you do?'),
            h('button', { class: 'btn grade again', type: 'button', onclick: () => grade('again') }, h('kbd', null, '1'), 'Missed it'),
            h('button', { class: 'btn grade hard', type: 'button', onclick: () => grade('hard') }, h('kbd', null, '2'), 'Shaky'),
            h('button', { class: 'btn grade good', type: 'button', onclick: () => grade('good') }, h('kbd', null, '3'), 'Got it'))
          : h('div', { class: 'row grade-row' }, firstHint,
            h('button', { class: 'btn primary lg', type: 'button', onclick: reveal }, 'Reveal and listen', h('kbd', null, 'Space'))));
    }
    function reveal() {
      if (revealed) return;
      revealed = true;
      const [n, v] = queue[i].split(':').map(Number);
      draw().then(() => {
        stopRun(); run = makeRun(); setRun(run); setLocalRun(run);
        const tok = run;
        Q.audio.verse(n, v, prefs().reciter, (w, p) => highlightWord(body, v, w, p)).catch(audioProblem).finally(() => { if (run === tok) { run = null; setRun(null); setLocalRun(null); } });
      });
    }
    function finish() {
      const total = got + shaky + missed;
      const score = total ? got / total : 0;
      body.replaceChildren(h('div', { class: 'frame lstage' }, h('div', { class: 'summary' },
        h('div', { class: 'big num' }, Q.pct(score)),
        h('p', null, `${got} got it · ${shaky} shaky · ${missed} missed`),
        h('p', { class: 'muted' }, 'Missed verses come back tomorrow, shaky ones soon, solid ones later.'))),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: () => onExit() }, opts.doneLabel || 'Back to tests')));
      onDone({ score });
    }
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === ' ' && !revealed) { e.preventDefault(); reveal(); }
      if (revealed && /^[1-3]$/.test(e.key)) { const b = body.querySelectorAll('.grade')[Number(e.key) - 1]; if (b) b.click(); }
    }
    document.addEventListener('keydown', onKey);
    recallCleanup = () => { document.removeEventListener('keydown', onKey); stopRun(); recallCleanup = null; };
    draw();
    return { redraw: () => { if (i < queue.length) draw(); } };
  }

  /* ---------------- review ---------------- */
  Q.views.review = function (root) {
    let alive = true;
    let run = null;
    loading(root);
    Q.quran.loadIndex().then(index => { if (alive) render(index); }).catch(e => alive && failed(root, e));

    function render(index) {
      const due = store().qDue();
      const next = store().qNextDue();
      const body = h('div', { class: 'qbody' });
      const groups = {};
      due.forEach(k => { const s = Number(k.split(':')[0]); (groups[s] = groups[s] || []).push(k); });
      root.replaceChildren(h('div', { class: 'page' },
        h('div', { class: 'page-head' }, h('div', null,
          h('h1', null, 'Review'),
          h('p', null, 'Verses come back after a day, then 3 days, a week, two weeks, a month. Say each one from memory, reveal it, and grade yourself honestly. Missed ones come back sooner.'))),
        h('details', { class: 'qdisplay-details', open: window.innerWidth > 760 }, h('summary', null, 'Display settings'),
          h('div', { class: 'card qdisplay' }, displayBar(() => { if (session) session.redraw(); else render(index); }))),
        body));
      if (!due.length) {
        body.append(h('div', { class: 'frame lstage' }, h('div', { class: 'summary' },
          h('h2', null, 'All caught up'),
          h('p', { class: 'muted' }, next ? `Next review: ${Q.fmtDate(Q.parseDay(next), { weekday: 'long', month: 'long', day: 'numeric' })}.` : 'Learn a few verses in a surah and they will show up here.'),
          h('a', { class: 'btn primary', href: '#surahs' }, 'Go to surahs'))));
        return;
      }
      body.append(h('div', { class: 'card stack' },
        h('h2', null, `${due.length} ${due.length === 1 ? 'verse' : 'verses'} due`),
        h('div', { class: 'chips' }, Object.entries(groups).map(([s, ks]) => {
          const meta = index.find(x => x.n === Number(s));
          return h('span', { class: 'chip' }, h('b', null, meta ? meta.name : 'Surah ' + s), `${ks.length}`);
        })),
        h('div', { class: 'row' }, h('button', { class: 'btn primary lg', type: 'button', onclick: () => {
          session = recallRun(due, body, r => { run = r; }, () => {}, () => { session = null; }, () => { session = null; render(index); }, { title: 'Review', exitLabel: 'Stop review', doneLabel: 'Done' });
        } }, 'Start review', h('kbd', null, 'Space')))));
      const onKey = e => { if (e.key === ' ' && body.querySelector('.btn.primary.lg') && !body.querySelector('.recall-verse')) { e.preventDefault(); body.querySelector('.btn.primary.lg').click(); document.removeEventListener('keydown', onKey); } };
      document.addEventListener('keydown', onKey);
      reviewKey = onKey;
    }
    let reviewKey = null;
    let session = null;
    return () => { alive = false; if (run) run.cancel(); if (recallCleanup) recallCleanup(); if (reviewKey) document.removeEventListener('keydown', reviewKey); Q.audio.stop(); };
  };

  /* ---------------- record yourself ---------------- */
  Q.recorder = function () {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) return null;
    let media = null, chunks = [], url = null, stream = null;
    const mine = new Audio();
    const playMine = () => new Promise(res => { if (!url) return res(); mine.src = url; mine.onended = res; mine.play().catch(res); });
    return {
      block(playReciter, label, stopOthers) {
        const wrap = h('div', { class: 'recorder' });
        const draw = (state) => {
          wrap.replaceChildren(...[
            h('span', { class: 'small muted' }, 'Pronunciation check: '),
            state === 'rec'
              ? h('button', { class: 'btn danger', type: 'button', onclick: stopRec }, '■ Stop recording')
              : h('button', { class: 'btn', type: 'button', onclick: startRec }, url ? '● Record again' : '● Record yourself'),
            url && state !== 'rec' ? h('button', { class: 'btn', type: 'button', onclick: () => { stopOthers(); playMine(); } }, '▶ Mine') : null,
            url && state !== 'rec' ? h('button', { class: 'btn', type: 'button', onclick: async () => { stopOthers(); try { await playReciter(); } catch (e) { if (!isStop(e)) audioProblem(e); return; } await playMine(); } }, '⇄ Reciter, then me') : null].filter(Boolean));
        };
        async function startRec() {
          stopOthers();
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
          catch (e) { Q.toast('Microphone not allowed. Check the browser’s site settings.'); return; }
          chunks = [];
          media = new MediaRecorder(stream);
          media.ondataavailable = e => chunks.push(e.data);
          media.onstop = () => {
            if (url) URL.revokeObjectURL(url);
            url = URL.createObjectURL(new Blob(chunks, { type: media.mimeType || 'audio/webm' }));
            stream.getTracks().forEach(t => t.stop());
            draw('ready');
          };
          media.start();
          draw('rec');
        }
        function stopRec() { if (media && media.state === 'recording') media.stop(); }
        draw(url ? 'ready' : 'idle');
        return wrap;
      },
      reset() { mine.pause(); if (url) URL.revokeObjectURL(url); url = null; },
      dispose() {
        try { if (media && media.state === 'recording') media.stop(); } catch (e) { /* ignore */ }
        if (stream) stream.getTracks().forEach(t => t.stop());
        mine.pause();
        if (url) URL.revokeObjectURL(url);
      },
    };
  };
})(window.Q = window.Q || {});
