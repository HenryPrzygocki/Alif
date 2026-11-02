/* Huruf — Practice: read a row aloud, reveal, mark what you missed. */
(function (Q) {
  'use strict';
  const { h } = Q;
  Q.views = Q.views || {};

  const ROUND_CHOICES = [8, 12, 20, 30];
  const MARK_CHIPS = [
    { ids: ['a'], ar: 'بَ', label: 'Fatḥa' },
    { ids: ['i'], ar: 'بِ', label: 'Kasra' },
    { ids: ['u'], ar: 'بُ', label: 'Ḍamma' },
    { ids: ['an', 'in', 'un'], ar: 'بً بٍ بٌ', label: 'Tanwīn' },
  ];

  Q.views.practice = function (root) {
    const store = Q.store;
    const cfg = store.state.practice;
    let session = null;
    let round = null;
    let only = Q.practiceOnly || null;   // temporary letter list (e.g. "practise my weakest")
    Q.practiceOnly = null;
    let advanceTimer = null;

    /* ---------------- layout ---------------- */
    const setupEl = h('aside', { class: 'setup card' });
    const stageTop = h('div', { class: 'stage-top' });
    const stageEl = h('div', { class: 'frame stage' });
    const actionsEl = h('div', { class: 'stage-actions' });
    const page = h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Practice'),
          h('p', null, 'Read the row out loud from right to left. Then reveal the answers and click anything you got wrong. Be honest; it only helps you.'))),
      h('div', { class: 'practice' }, setupEl, h('div', { class: 'stage-wrap' }, stageTop, stageEl, actionsEl)));
    root.append(page);

    /* ---------------- pool & generation ---------------- */
    function pool() {
      let ids = only && only.length ? only.slice()
        : Q.LETTERS.filter(l => cfg.groups.includes(l.group)).map(l => l.id);
      if (cfg.mode === 'sounds' || cfg.mode === 'joined') ids = ids.filter(id => !Q.L[id].noSound);
      return ids;
    }
    const weightOf = id => cfg.focusWeak ? store.weight(id) : 1;

    function nextLetter(ids, prev, avoid = []) {
      if (cfg.lookalikes && prev && Math.random() < 0.35) {
        const like = (Q.L[prev].like || []).filter(x => ids.includes(x) && !avoid.includes(x));
        if (like.length) return Q.pick(like);
      }
      const choices = ids.filter(x => x !== prev && !avoid.includes(x));
      return Q.weightedPick(choices.length ? choices : ids, weightOf);
    }
    function marks() { return cfg.marks && cfg.marks.length ? cfg.marks : ['a']; }

    function makeRow() {
      const ids = pool();
      const units = [];
      let prev = null;
      for (let i = 0; i < cfg.rowLen; i++) {
        const id = nextLetter(ids, prev, units.slice(-2).map(u => u.letter));
        prev = id;
        if (cfg.mode === 'names') {
          units.push({ letter: id, text: Q.L[id].ch, wrong: false });
        } else {
          const v = Q.pick(marks());
          const syl = Q.syllable(id, v);
          units.push({ letter: id, vowel: v, text: syl.text, sound: syl.sound, wrong: false });
        }
      }
      return { kind: 'row', units };
    }

    function makeJoined() {
      const ids = pool();
      const words = [];
      for (let w = 0; w < cfg.words; w++) {
        const len = Math.random() < 0.5 ? 2 : 3;
        const units = [];
        let prev = null;
        for (let i = 0; i < len; i++) {
          let cand = i === 0 ? ids : ids.filter(x => x !== 'alif');
          if (!cand.length) cand = ids;
          const id = nextLetter(cand, prev);
          prev = id;
          // vowels: tanwīn only on the last letter of a word
          let vs = marks();
          if (i < len - 1) { const inner = vs.filter(v => v.length === 1); vs = inner.length ? inner : ['a']; }
          const v = Q.pick(vs);
          const syl = Q.syllable(id, v);
          units.push({ letter: id, vowel: v, text: syl.text, sound: syl.sound, wrong: false });
        }
        words.push(units);
      }
      return { kind: 'joined', words, units: words.flat() };
    }

    function makeQuiz() {
      const ids = pool();
      const target = Q.weightedPick(ids, weightOf);
      const l = Q.L[target];
      const dir = Math.random() < 0.5 ? 'toLetter' : 'toName';
      const near = [...new Set([...(l.like || []), ...(l.soundLike || [])])].filter(x => x !== target);
      const opts = new Set([target]);
      Q.shuffle(near).forEach(x => { if (opts.size < 4) opts.add(x); });
      Q.shuffle(Q.LETTERS.map(x => x.id)).forEach(x => { if (opts.size < 4) opts.add(x); });
      return { kind: 'quiz', target, dir, options: Q.shuffle([...opts]), picked: null };
    }

    /* ---------------- session flow ---------------- */
    function startSession() {
      finishSession(false);
      session = { mode: cfg.mode, total: cfg.rounds, done: [], n: 0, w: 0, ms: 0, missed: new Map() };
      newRound();
    }
    function finishSession(show) {
      clearTimeout(advanceTimer);
      if (session && !session.recorded) {
        if (session.n) store.recordSession({ mode: session.mode, n: session.n, w: session.w, ms: session.ms });
        session.recorded = true;
      }
      if (show && session) renderSummary();
    }

    function newRound() {
      clearTimeout(advanceTimer);
      if (!pool().length) { round = null; renderEmpty(); return; }
      round = cfg.mode === 'quiz' ? makeQuiz() : cfg.mode === 'joined' ? makeJoined() : makeRow();
      round.shownAt = performance.now();
      round.revealed = false;
      renderRound();
    }

    function reveal() {
      if (!round || round.revealed || round.kind === 'quiz') return;
      round.revealed = true;
      round.revealMs = performance.now() - round.shownAt;
      renderRound();
    }

    function next() {
      if (!round) return;
      if (round.kind === 'quiz') { if (round.picked) advance(); return; }
      if (!round.revealed) { reveal(); return; }
      const activeMs = performance.now() - round.shownAt;
      store.recordRound({
        mode: cfg.mode,
        units: round.units.map(u => ({ letter: u.letter, vowel: u.vowel, wrong: u.wrong })),
        revealMs: round.revealMs, activeMs,
      });
      const wrong = round.units.filter(u => u.wrong);
      session.n += round.units.length; session.w += wrong.length; session.ms += Math.min(activeMs, 90000);
      wrong.forEach(u => session.missed.set(u.letter, (session.missed.get(u.letter) || 0) + 1));
      session.done.push(wrong.length ? 'miss' : 'done');
      advance();
    }

    function advance() {
      clearTimeout(advanceTimer);
      if (session.done.length >= session.total) { finishSession(true); round = null; return; }
      newRound();
    }

    function toggleUnit(i) {
      if (!round || !round.revealed || round.kind === 'quiz') return;
      const u = round.units[i];
      if (!u) return;
      u.wrong = !u.wrong;
      renderRound();
    }

    function answerQuiz(id) {
      if (!round || round.kind !== 'quiz' || round.picked) return;
      round.picked = id;
      const ms = performance.now() - round.shownAt;
      store.recordQuiz({ target: round.target, picked: id, ms });
      const wrong = id !== round.target;
      session.n++; if (wrong) { session.w++; session.missed.set(round.target, (session.missed.get(round.target) || 0) + 1); }
      session.ms += Math.min(ms, 60000);
      session.done.push(wrong ? 'miss' : 'done');
      renderRound();
      if (!wrong) advanceTimer = setTimeout(advance, 750);
    }

    /* ---------------- rendering ---------------- */
    function glyphSize(n) {
      if (cfg.mode === 'joined') return cfg.words <= 2 ? '96px' : '76px';
      if (n <= 1) return '150px';
      if (n <= 3) return '112px';
      if (n <= 5) return '90px';
      return '72px';
    }

    function renderTop() {
      const dots = h('div', { class: 'progress-dots', 'aria-label': 'Session progress' });
      for (let i = 0; i < session.total; i++) {
        const st = session.done[i];
        dots.append(h('i', { class: st || (i === session.done.length ? 'now' : '') }));
      }
      const acc = session.n ? Q.pct(1 - session.w / session.n) : '–';
      stageTop.replaceChildren(
        h('div', { class: 'row' },
          h('span', { class: 'eyebrow' }, Q.MODE[cfg.mode].label),
          only ? h('span', { class: 'tag' }, 'Focused: ' + only.length + ' letters') : null),
        h('div', { class: 'row' }, dots, h('span', { class: 'small muted num' }, `${Math.min(session.done.length + 1, session.total)} / ${session.total} · ${acc} right`)));
    }

    function answerLabel(u) {
      const l = Q.L[u.letter];
      if (cfg.mode === 'names') {
        return [h('b', null, l.name), h('span', null, [l.alt || (l.tr ? 'sound: ' + l.tr : 'silent seat'), cfg.showKeys ? ' · key ' + l.key : ''].join(''))];
      }
      return [h('b', null, u.sound), h('span', null, l.name + (cfg.showKeys ? ' · ' + l.key : ''))];
    }

    function renderRound() {
      renderTop();
      stageEl.style.setProperty('--glyph-size', glyphSize(round.units ? round.units.length : 1));
      if (round.kind === 'row') {
        const wrap = h('div', { class: 'row-units' + (round.revealed ? ' revealed' : '') });
        round.units.forEach((u, i) => {
          wrap.append(h('button', {
            class: 'unit' + (u.wrong ? ' wrong' : ''), type: 'button', tabindex: round.revealed ? 0 : -1,
            'aria-label': round.revealed ? `Item ${i + 1}: ${Q.L[u.letter].name}. ${u.wrong ? 'Marked wrong' : 'Marked right'}` : `Item ${i + 1}`,
            onclick: () => toggleUnit(i),
          },
            round.units.length > 1 ? h('span', { class: 'idx' }, i + 1) : null,
            h('span', { class: 'glyph' }, u.text),
            h('span', { class: 'ans' + (round.revealed ? '' : ' hide') }, answerLabel(u))));
        });
        stageEl.replaceChildren(wrap);
      } else if (round.kind === 'joined') {
        const wrap = h('div', { class: 'word-row' });
        let k = 0;
        round.words.forEach(word => {
          const start = k;
          const glyph = h('div', { class: 'glyph' }, word.map(u => h('span', { class: u.wrong ? 'wrong' : '' }, u.text)));
          const syls = h('div', { class: 'syls' + (round.revealed ? '' : ' hide') },
            word.map((u, j) => {
              const idx = start + j;
              return h('button', { class: 'syl' + (u.wrong ? ' wrong' : ''), type: 'button', tabindex: round.revealed ? 0 : -1, onclick: () => toggleUnit(idx) },
                h('b', null, u.sound), h('span', null, idx + 1));
            }));
          k += word.length;
          wrap.append(h('div', { class: 'word' }, glyph, syls));
        });
        stageEl.replaceChildren(wrap);
      } else {
        renderQuiz();
      }
      renderActions();
    }

    function renderQuiz() {
      const l = Q.L[round.target];
      const prompt = round.dir === 'toLetter'
        ? h('div', { class: 'prompt' },
            h('div', { class: 'eyebrow' }, 'Which letter is'),
            h('div', { class: 'q' }, l.name + (l.alt ? ` (${l.alt})` : '')),
            h('div', { class: 'muted' }, l.tr ? `sound: ${l.tr}` : 'the silent seat for hamza and long a'))
        : h('div', { class: 'prompt' },
            h('div', { class: 'eyebrow' }, 'What is this letter called?'),
            h('div', { class: 'glyph' }, l.ch));
      const opts = h('div', { class: 'options' });
      round.options.forEach((id, i) => {
        const o = Q.L[id];
        let cls = 'option';
        if (round.picked) {
          if (id === round.target) cls += ' right';
          else if (id === round.picked) cls += ' picked-wrong';
        }
        opts.append(h('button', { class: cls, type: 'button', onclick: () => answerQuiz(id) },
          h('span', { class: 'idx' }, i + 1),
          round.dir === 'toLetter' ? h('span', { class: 'ar' }, o.ch) : h('span', { class: 'nm' }, o.name)));
      });
      let fb = h('div', { class: 'feedback' });
      if (round.picked) {
        if (round.picked === round.target) fb = h('div', { class: 'feedback good' }, 'Right');
        else {
          const p = Q.L[round.picked];
          fb = h('div', { class: 'feedback bad' }, `That was ${l.name} ${l.ch}. You picked ${p.name} ${p.ch}.`);
        }
      }
      stageEl.replaceChildren(h('div', { class: 'quiz' }, prompt, opts, fb));
    }

    function renderActions() {
      let main, hint;
      if (round.kind === 'quiz') {
        main = h('button', { class: 'btn primary lg', type: 'button', disabled: !round.picked, onclick: next }, 'Next', h('kbd', null, 'Space'));
        hint = [h('span', null, h('kbd', { class: 'key' }, '1'), '–', h('kbd', { class: 'key' }, '4'), ' pick')];
      } else if (!round.revealed) {
        main = h('button', { class: 'btn primary lg', type: 'button', onclick: reveal }, 'Reveal', h('kbd', null, 'Space'));
        hint = [h('span', null, 'Say each one out loud first, starting from the right.')];
      } else {
        const wrongN = round.units.filter(u => u.wrong).length;
        main = h('button', { class: 'btn primary lg', type: 'button', onclick: next }, wrongN ? `Next · ${wrongN} wrong` : 'Next · all right', h('kbd', null, 'Space'));
        hint = [h('span', null, 'Click a letter you missed, or press ', h('kbd', { class: 'key' }, '1'), '–', h('kbd', { class: 'key' }, String(Math.min(9, round.units.length))))];
      }
      actionsEl.replaceChildren(h('div', { class: 'hint' }, hint),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { finishSession(true); round = null; } }, 'End session'),
          main));
    }

    function renderSummary() {
      const acc = session.n ? 1 - session.w / session.n : null;
      const missed = [...session.missed.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      stageTop.replaceChildren(h('span', { class: 'eyebrow' }, 'Session done'));
      stageEl.style.removeProperty('--glyph-size');
      stageEl.replaceChildren(h('div', { class: 'summary' },
        h('div', null, h('div', { class: 'big num' }, Q.pct(acc)), h('div', { class: 'muted' }, `${session.n} read · ${session.w} missed · ${Q.fmtDuration(session.ms)}`)),
        missed.length
          ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Missed this time'), h('div', { class: 'missed' }, missed.map(id => h('span', { title: Q.L[id].name }, Q.L[id].ch))))
          : h('p', null, 'Nothing missed. Mā shāʾ Allāh.')));
      actionsEl.replaceChildren(h('div', { class: 'hint' }, 'Your stats are saved.'),
        h('div', { class: 'row' },
          missed.length ? h('button', { class: 'btn', type: 'button', onclick: () => { only = missed; renderSetup(); startSession(); } }, 'Practise the missed ones') : null,
          h('button', { class: 'btn primary lg', type: 'button', onclick: () => { only = null; renderSetup(); startSession(); } }, 'New session', h('kbd', null, 'Space'))));
      session = Object.assign(session, { over: true });
    }

    function renderEmpty() {
      stageTop.replaceChildren(h('span', { class: 'eyebrow' }, Q.MODE[cfg.mode].label));
      stageEl.replaceChildren(h('div', { class: 'summary' }, h('h2', null, 'Pick some letters'), h('p', { class: 'muted' }, 'Choose at least one letter group on the left to start.')));
      actionsEl.replaceChildren();
    }

    /* ---------------- setup panel ---------------- */
    function set(k, v, restart) {
      store.setPractice(k, v);
      renderSetup();
      if (restart === 'session') startSession();
      else if (session && !session.over) newRound();
      else startSession();
    }

    function renderSetup() {
      const modeList = h('div', { class: 'mode-list' }, Q.MODES.map(m =>
        h('button', { type: 'button', 'aria-pressed': String(cfg.mode === m.id), onclick: () => set('mode', m.id, 'session') },
          h('b', null, m.label), h('span', null, m.desc))));

      const markChips = (cfg.mode === 'sounds' || cfg.mode === 'joined') ? h('div', { class: 'field' },
        h('span', { class: 'label' }, 'Vowel marks'),
        h('div', { class: 'chips' }, MARK_CHIPS.map(c => {
          const on = c.ids.every(x => cfg.marks.includes(x));
          return h('button', {
            class: 'chip', type: 'button', 'aria-pressed': String(on),
            onclick: () => {
              let next = on ? cfg.marks.filter(x => !c.ids.includes(x)) : [...new Set([...cfg.marks, ...c.ids])];
              if (!next.length) next = ['a'];
              set('marks', next);
            },
          }, h('span', { class: 'ar' }, c.ar), c.label);
        }))) : null;

      const allOn = cfg.groups.length === Q.GROUPS.length;
      const groups = h('div', { class: 'field' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'label' }, 'Letters'),
          h('div', { class: 'row', style: { gap: '4px' } },
            h('button', { class: 'btn ghost', type: 'button', style: { padding: '2px 8px', fontSize: '12.5px' }, onclick: () => { only = null; set('groups', allOn ? [] : Q.GROUPS.map(g => g.id)); } }, allOn ? 'None' : 'All'),
            h('button', {
              class: 'btn ghost', type: 'button', style: { padding: '2px 8px', fontSize: '12.5px' },
              title: 'Practise only your 6 weakest letters',
              onclick: () => {
                const weak = store.weakest(6, 2).map(x => x.l.id);
                if (weak.length < 2) { Q.toast('Practise a little more first so I can find your weak letters'); return; }
                only = weak; renderSetup(); startSession();
              },
            }, 'Weakest 6'))),
        only ? h('div', { class: 'row small' }, h('span', { class: 'muted' }, 'Only: '), h('span', { class: 'ar', style: { fontSize: '22px' } }, only.map(id => Q.L[id].ch).join(' ')),
          h('button', { class: 'btn ghost', type: 'button', style: { padding: '2px 8px', fontSize: '12.5px' }, onclick: () => { only = null; renderSetup(); startSession(); } }, 'Clear')) : null,
        h('div', { class: 'chips' }, Q.GROUPS.map(g => {
          const on = cfg.groups.includes(g.id);
          return h('button', {
            class: 'chip', type: 'button', 'aria-pressed': String(on), title: g.letters.map(id => Q.L[id].name).join(', '),
            onclick: () => { only = null; set('groups', on ? cfg.groups.filter(x => x !== g.id) : [...cfg.groups, g.id]); },
          }, h('span', { class: 'ar' }, g.label));
        })));

      const stepper = (label, key, min, max) => h('div', { class: 'field' },
        h('span', { class: 'label' }, label),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'Fewer', onclick: () => set(key, Math.max(min, cfg[key] - 1)) }, '−'),
          h('span', { class: 'num' }, cfg[key]),
          h('button', { type: 'button', 'aria-label': 'More', onclick: () => set(key, Math.min(max, cfg[key] + 1)) }, '+')));

      const size = cfg.mode === 'quiz' ? null
        : cfg.mode === 'joined' ? stepper('Groups per row', 'words', 1, 4)
          : stepper('Letters per row', 'rowLen', 1, 8);

      const rounds = h('div', { class: 'field' },
        h('span', { class: 'label' }, 'Rounds per session'),
        h('div', { class: 'seg' }, ROUND_CHOICES.map(n => h('button', { type: 'button', 'aria-pressed': String(cfg.rounds === n), onclick: () => set('rounds', n, 'session') }, n))));

      const toggle = (label, key, title) => h('label', { class: 'toggle', title },
        h('input', { type: 'checkbox', id: 'pr-' + key, checked: !!cfg[key], onchange: e => { store.setPractice(key, e.target.checked); if (key === 'showKeys' && round && round.kind !== 'quiz') renderRound(); } }), label);

      setupEl.replaceChildren(...[
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Mode'), modeList),
        markChips, groups,
        h('div', { class: 'row', style: { gap: '18px', alignItems: 'flex-end' } }, size, rounds),
        h('div', { class: 'stack', style: { gap: '8px' } },
          toggle('Show weak letters more often', 'focusWeak', 'Letters you miss come up more'),
          toggle('Mix in look-alikes', 'lookalikes', 'e.g. ب next to ت and ث'),
          toggle('Show keyboard keys in answers', 'showKeys'))].filter(Boolean));
    }

    /* ---------------- keyboard ---------------- */
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!round) { only = only || null; startSession(); return; }
        next();
        return;
      }
      if (/^[1-9]$/.test(e.key) && round) {
        const i = Number(e.key) - 1;
        if (round.kind === 'quiz') { if (round.options[i]) answerQuiz(round.options[i]); }
        else toggleUnit(i);
      }
    }
    document.addEventListener('keydown', onKey);

    renderSetup();
    startSession();

    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(advanceTimer);
      finishSession(false);
    };
  };
})(window.Q = window.Q || {});
