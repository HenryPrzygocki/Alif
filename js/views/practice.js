/* Huruf — Practice.
   Read-aloud modes: you say it, reveal, and mark what you missed.
   Quiz modes: you pick an answer and the site checks it. */
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
    if (!Q.MODE[cfg.mode]) cfg.mode = 'sounds';
    let session = null;
    let round = null;
    let only = Q.practiceOnly || null;   // temporary letter list (e.g. "practise my weakest")
    Q.practiceOnly = null;
    let advanceTimer = null;

    const mode = () => Q.MODE[cfg.mode];
    const isQuiz = () => mode().kind === 'quiz';

    /* ---------------- layout ---------------- */
    const setupEl = h('aside', { class: 'setup card', id: 'practice-options' });
    const stageTop = h('div', { class: 'stage-top' });
    const stageEl = h('div', { class: 'frame stage' });
    const actionsEl = h('div', { class: 'stage-actions' });
    const layout = h('div', { class: 'practice' + (cfg.hideSetup ? ' focus' : '') }, setupEl, h('div', { class: 'stage-wrap' }, stageTop, stageEl, actionsEl));
    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null,
          h('h1', null, 'Letter practice'),
          h('p', null, 'Read-aloud modes: say each letter from right to left, reveal, and click what you missed. Quiz modes: pick the answer and the site checks it.'))),
      layout));

    function toggleSetup() {
      store.setPractice('hideSetup', !cfg.hideSetup);
      layout.classList.toggle('focus', cfg.hideSetup);
      if (session && session.over) renderSummaryTop(); else if (round) renderTop();
    }

    /* ---------------- pool & generation ---------------- */
    function pool() {
      let ids = only && only.length ? only.slice()
        : Q.LETTERS.filter(l => cfg.groups.includes(l.group)).map(l => l.id);
      if (mode().sound) ids = ids.filter(id => !Q.L[id].noSound);
      return ids;
    }
    const weightOf = id => cfg.focusWeak ? store.weight(id) : 1;
    const marks = () => cfg.marks && cfg.marks.length ? cfg.marks : ['a'];

    function nextLetter(ids, prev, avoid = []) {
      if (cfg.lookalikes && prev && Math.random() < 0.35) {
        const like = (Q.L[prev].like || []).filter(x => ids.includes(x) && !avoid.includes(x));
        if (like.length) return Q.pick(like);
      }
      const choices = ids.filter(x => x !== prev && !avoid.includes(x));
      return Q.weightedPick(choices.length ? choices : ids, weightOf);
    }

    function makeRow() {
      const ids = pool();
      const units = [];
      let prev = null;
      for (let i = 0; i < cfg.rowLen; i++) {
        const id = nextLetter(ids, prev, units.slice(-2).map(u => u.letter));
        prev = id;
        if (cfg.mode === 'names') units.push({ letter: id, text: Q.L[id].ch, wrong: false });
        else {
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
          let vs = marks();                       // tanwīn only on the last letter of a word
          if (i < len - 1) { const inner = vs.filter(v => v.length === 1); vs = inner.length ? inner : ['a']; }
          const v = Q.pick(vs);
          const syl = Q.syllable(id, v);
          units.push({ letter: id, vowel: v, text: syl.text, sound: syl.sound, wrong: false });
        }
        words.push(units);
      }
      return { kind: 'joined', words, units: words.flat() };
    }

    /* Quiz options: the right answer plus look-alikes, sound-alikes and other vowels */
    function syllableOptions(target, v) {
      const opts = [];
      const seenKey = new Set(), seenSound = new Set();
      const add = (id, vv) => {
        if (opts.length >= 4 || !Q.L[id] || Q.L[id].noSound) return;
        const sy = Q.syllable(id, vv);
        if (seenKey.has(id + ':' + vv) || seenSound.has(sy.sound)) return;
        seenKey.add(id + ':' + vv); seenSound.add(sy.sound);
        opts.push({ letter: id, vowel: vv, text: sy.text, sound: sy.sound });
      };
      add(target, v);
      const l = Q.L[target];
      const like = Q.shuffle(l.like || []), soundLike = Q.shuffle(l.soundLike || []);
      const otherVowels = Q.shuffle(marks().filter(x => x !== v));
      if (like[0]) add(like[0], v);
      if (otherVowels[0]) add(target, otherVowels[0]);
      if (soundLike[0]) add(soundLike[0], v);
      like.slice(1).forEach(id => add(id, v));
      soundLike.slice(1).forEach(id => add(id, v));
      Q.shuffle(Q.LETTERS.map(x => x.id)).forEach(id => add(id, v));
      return Q.shuffle(opts);
    }

    function makeQuiz() {
      const ids = pool();
      const target = Q.weightedPick(ids, weightOf);
      const l = Q.L[target];
      if (cfg.mode === 'quiz') {
        const near = [...new Set([...(l.like || []), ...(l.soundLike || [])])].filter(x => x !== target);
        const set = new Set([target]);
        Q.shuffle(near).forEach(x => { if (set.size < 4) set.add(x); });
        Q.shuffle(Q.LETTERS.map(x => x.id)).forEach(x => { if (set.size < 4) set.add(x); });
        const dir = Math.random() < 0.5 ? 'toLetter' : 'toName';
        return { kind: 'quiz', target, dir, options: Q.shuffle([...set]).map(id => ({ letter: id, text: Q.L[id].ch, label: Q.L[id].name })), picked: null };
      }
      const v = Q.pick(marks());
      const sy = Q.syllable(target, v);
      return {
        kind: 'quiz', target, vowel: v, text: sy.text, sound: sy.sound,
        dir: cfg.mode === 'q-sound' ? 'toSound' : 'toGlyph',
        options: syllableOptions(target, v), picked: null,
      };
    }

    /* ---------------- session flow ---------------- */
    function startSession() {
      finishSession(false);
      session = { mode: cfg.mode, total: cfg.rounds, done: [], n: 0, w: 0, ms: 0, rMs: 0, rUnits: 0, streak: 0, bestStreak: 0, missed: new Map() };
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
      round = isQuiz() ? makeQuiz() : cfg.mode === 'joined' ? makeJoined() : makeRow();
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
      if (round.revealMs < 60000) { session.rMs += round.revealMs; session.rUnits += round.units.length; }
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

    function answerQuiz(i) {
      if (!round || round.kind !== 'quiz' || round.picked) return;
      const o = round.options[i];
      if (!o) return;
      round.picked = o;
      const ms = performance.now() - round.shownAt;
      const wrong = store.recordQuiz({ mode: cfg.mode, target: round.target, picked: o.letter, vowel: round.vowel, pickedVowel: o.vowel, ms });
      round.wrong = wrong;
      session.n++;
      session.ms += Math.min(ms, 60000);
      if (wrong) {
        session.w++; session.streak = 0;
        session.missed.set(round.target, (session.missed.get(round.target) || 0) + 1);
      } else {
        session.streak++; session.bestStreak = Math.max(session.bestStreak, session.streak);
      }
      session.done.push(wrong ? 'miss' : 'done');
      renderRound();
      if (!wrong) advanceTimer = setTimeout(advance, 700);
    }

    /* ---------------- rendering ---------------- */
    function glyphSize(n) {
      if (cfg.mode === 'joined') return cfg.words <= 2 ? '96px' : '76px';
      if (n <= 1) return '150px';
      if (n <= 3) return '112px';
      if (n <= 5) return '90px';
      return '72px';
    }

    function optionsButton() {
      return h('button', { class: 'btn ghost sm', type: 'button', 'aria-expanded': String(!cfg.hideSetup), 'aria-controls': 'practice-options', onclick: toggleSetup },
        cfg.hideSetup ? 'Show options' : 'Hide options', h('kbd', null, 'O'));
    }

    function renderTop() {
      const dots = h('div', { class: 'progress-dots', 'aria-hidden': 'true' });
      for (let i = 0; i < session.total; i++) {
        const st = session.done[i];
        dots.append(h('i', { class: st || (i === session.done.length ? 'now' : '') }));
      }
      const acc = session.n ? Q.pct(1 - session.w / session.n) : '–';
      stageTop.replaceChildren(
        h('div', { class: 'row' },
          h('span', { class: 'eyebrow' }, mode().label),
          h('span', { class: 'tag' + (isQuiz() ? ' auto' : '') }, isQuiz() ? 'Checked for you' : 'You mark yourself'),
          only ? h('span', { class: 'tag' }, 'Focused: ' + only.map(id => Q.L[id].ch).join(' ')) : null),
        h('div', { class: 'row' },
          isQuiz() && session.streak >= 3 ? h('span', { class: 'tag streak' }, session.streak + ' in a row') : null,
          dots,
          h('span', { class: 'small muted num' }, `${Math.min(session.done.length + (round && round.kind === 'quiz' && round.picked ? 0 : 1), session.total)} / ${session.total} · ${acc} right`),
          optionsButton()));
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
            h('span', { class: 'ans' + (round.revealed ? ' show' : ' hide') }, answerLabel(u))));
        });
        stageEl.replaceChildren(wrap);
      } else if (round.kind === 'joined') {
        const wrap = h('div', { class: 'word-row' });
        let k = 0;
        round.words.forEach(word => {
          const start = k;
          const glyph = h('div', { class: 'glyph' }, word.map(u => h('span', { class: u.wrong ? 'wrong' : '' }, u.text)));
          const syls = h('div', { class: 'syls' + (round.revealed ? ' show' : ' hide') },
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
      let prompt;
      if (round.dir === 'toLetter') {
        prompt = h('div', { class: 'prompt' },
          h('div', { class: 'eyebrow' }, 'Which letter is'),
          h('div', { class: 'q' }, l.name + (l.alt ? ` (${l.alt})` : '')),
          h('div', { class: 'muted' }, l.tr ? `sound: ${l.tr}` : 'the silent seat for hamza and long a'));
      } else if (round.dir === 'toName') {
        prompt = h('div', { class: 'prompt' }, h('div', { class: 'eyebrow' }, 'What is this letter called?'), h('div', { class: 'glyph' }, l.ch));
      } else if (round.dir === 'toSound') {
        prompt = h('div', { class: 'prompt' }, h('div', { class: 'eyebrow' }, 'How does this sound?'), h('div', { class: 'glyph' }, round.text));
      } else {
        prompt = h('div', { class: 'prompt' },
          h('div', { class: 'eyebrow' }, 'Which one is'),
          h('div', { class: 'q translit' }, round.sound),
          l.alt ? h('div', { class: 'muted' }, l.alt) : h('div', { class: 'muted' }, ' '));
      }
      const glyphOptions = round.dir === 'toLetter' || round.dir === 'toGlyph';
      const opts = h('div', { class: 'options' });
      round.options.forEach((o, i) => {
        let cls = 'option';
        const isTarget = o.letter === round.target && (!round.vowel || o.vowel === round.vowel);
        if (round.picked) {
          if (isTarget) cls += ' right';
          else if (o === round.picked) cls += ' picked-wrong';
          else cls += ' dim';
        }
        opts.append(h('button', { class: cls, type: 'button', onclick: () => answerQuiz(i), disabled: !!round.picked && !isTarget && o !== round.picked },
          h('span', { class: 'idx' }, i + 1),
          glyphOptions ? h('span', { class: 'ar' }, o.text)
            : round.dir === 'toSound' ? h('span', { class: 'nm translit' }, o.sound)
              : h('span', { class: 'nm' }, o.label)));
      });
      stageEl.replaceChildren(h('div', { class: 'quiz' }, prompt, opts, feedback()));
    }

    function feedback() {
      if (!round.picked) return h('div', { class: 'feedback' }, ' ');
      const l = Q.L[round.target];
      const p = round.picked;
      if (!round.wrong) {
        return h('div', { class: 'feedback good' }, 'Right', session.streak >= 3 ? ` · ${session.streak} in a row` : '');
      }
      const pl = Q.L[p.letter];
      let msg;
      if (cfg.mode === 'quiz') msg = [`That was ${l.name} `, h('span', { class: 'ar inline' }, l.ch), `. You picked ${pl.name} `, h('span', { class: 'ar inline' }, pl.ch), '.'];
      else if (p.letter === round.target) {
        msg = [h('span', { class: 'ar inline' }, round.text), ` is “${round.sound}”. Right letter, but check the vowel: `, h('span', { class: 'ar inline' }, p.text), ` is “${p.sound}”.`];
      } else {
        msg = [h('span', { class: 'ar inline' }, round.text), ` is “${round.sound}” (${l.name}). `, h('span', { class: 'ar inline' }, p.text), ` is “${p.sound}” (${pl.name}).`];
      }
      return h('div', { class: 'feedback bad' }, h('div', null, msg), h('div', { class: 'tip' }, Q.mixed(l.tip)));
    }

    function renderActions() {
      let main, hint;
      if (round.kind === 'quiz') {
        main = h('button', { class: 'btn primary lg', type: 'button', disabled: !round.picked, onclick: next }, 'Next', h('kbd', null, 'Space'));
        hint = round.picked
          ? [h('span', null, round.wrong ? 'Take a look, then press Space for the next one.' : 'Moving on…')]
          : [h('span', null, 'Press ', h('kbd', { class: 'key' }, '1'), '–', h('kbd', { class: 'key' }, String(round.options.length)), ' or click an answer')];
      } else if (!round.revealed) {
        main = h('button', { class: 'btn primary lg', type: 'button', onclick: reveal }, 'Reveal', h('kbd', null, 'Space'));
        hint = [h('span', null, 'Say each one out loud, starting from the right.')];
      } else {
        const wrongN = round.units.filter(u => u.wrong).length;
        const secs = round.revealMs / 1000;
        main = h('button', { class: 'btn primary lg', type: 'button', onclick: next }, wrongN ? `Next · ${wrongN} wrong` : 'Next · all right', h('kbd', null, 'Space'));
        hint = [
          h('span', { class: 'tag', title: 'Time from showing the row to pressing Reveal' }, `${secs.toFixed(1)} s` + (round.units.length > 1 ? ` · ${(secs / round.units.length).toFixed(1)} s each` : '')),
          h('span', null, 'Click what you missed, or press ', h('kbd', { class: 'key' }, '1'), '–', h('kbd', { class: 'key' }, String(Math.min(9, round.units.length)))),
        ];
      }
      actionsEl.replaceChildren(h('div', { class: 'hint' }, hint),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { finishSession(true); round = null; } }, 'End session'),
          main));
    }

    function renderSummaryTop() {
      stageTop.replaceChildren(h('span', { class: 'eyebrow' }, 'Session done · ' + Q.MODE[session.mode].label), h('div', { class: 'row' }, optionsButton()));
    }

    function renderSummary() {
      session.over = true;
      const acc = session.n ? 1 - session.w / session.n : null;
      const missed = [...session.missed.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      const avg = store.totals().secPer;
      const mine = session.rUnits ? session.rMs / session.rUnits / 1000 : null;
      renderSummaryTop();
      stageEl.style.removeProperty('--glyph-size');
      stageEl.replaceChildren(h('div', { class: 'summary' },
        h('div', null,
          h('div', { class: 'big num' }, Q.pct(acc)),
          h('div', { class: 'muted' }, `${session.n} answered · ${session.w} missed · ${Q.fmtDuration(session.ms)}`)),
        h('div', { class: 'summary-facts' },
          mine != null ? h('div', { class: 'stat' }, h('span', { class: 'v' }, mine.toFixed(1), h('small', null, 's')), h('span', { class: 'k' }, `per letter${avg != null ? ` · your average ${avg.toFixed(1)} s` : ''}`)) : null,
          session.bestStreak ? h('div', { class: 'stat' }, h('span', { class: 'v' }, session.bestStreak), h('span', { class: 'k' }, 'best run in a row')) : null,
          h('div', { class: 'stat' }, h('span', { class: 'v' }, Q.fmtInt(store.today().n)), h('span', { class: 'k' }, `today · goal ${store.state.settings.goal}`))),
        missed.length
          ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Missed this time'),
            h('div', { class: 'missed' }, missed.map(id => {
              const l = Q.L[id];
              return h('span', { class: 'miss-chip' }, h('span', { class: 'ar' }, l.ch), h('b', null, l.name), h('span', null, l.noSound ? l.tr : Q.sound(l.id, 'a')));
            })))
          : h('p', null, 'Nothing missed. Mā shāʾ Allāh.')));
      actionsEl.replaceChildren(h('div', { class: 'hint' }, 'Saved to your stats.'),
        h('div', { class: 'row' },
          missed.length ? h('button', { class: 'btn', type: 'button', onclick: () => { only = missed; renderSetup(); startSession(); } }, 'Practise the missed ones') : null,
          h('button', { class: 'btn primary lg', type: 'button', onclick: () => { only = null; renderSetup(); startSession(); } }, 'New session', h('kbd', null, 'Space'))));
    }

    function renderEmpty() {
      stageTop.replaceChildren(h('span', { class: 'eyebrow' }, mode().label), h('div', { class: 'row' }, optionsButton()));
      stageEl.replaceChildren(h('div', { class: 'summary' }, h('h2', null, 'Pick some letters'), h('p', { class: 'muted' }, 'Choose at least one letter group in the options to start.')));
      actionsEl.replaceChildren();
    }

    /* ---------------- options panel ---------------- */
    function set(k, v, restart) {
      store.setPractice(k, v);
      renderSetup();
      if (restart === 'session' || !session || session.over) startSession();
      else newRound();
    }

    function renderSetup() {
      const m = mode();
      const modeBtn = x => h('button', { type: 'button', 'aria-pressed': String(cfg.mode === x.id), onclick: () => set('mode', x.id, 'session') },
        h('b', null, x.label), h('span', null, Q.mixed(Q.fill(x.desc))));
      const modeList = h('div', { class: 'mode-list' },
        h('div', { class: 'mode-group-label' }, 'Read aloud · you mark yourself'),
        Q.MODES.filter(x => x.kind === 'read').map(modeBtn),
        h('div', { class: 'mode-group-label' }, 'Quiz · checked for you'),
        Q.MODES.filter(x => x.kind === 'quiz').map(modeBtn));

      const markChips = m.uses.includes('marks') ? h('div', { class: 'field' },
        h('span', { class: 'label' }, 'Vowel marks'),
        h('div', { class: 'chips' }, MARK_CHIPS.map(c => {
          const on = c.ids.every(x => cfg.marks.includes(x));
          return h('button', {
            class: 'chip', type: 'button', 'aria-pressed': String(on),
            onclick: () => {
              let nextMarks = on ? cfg.marks.filter(x => !c.ids.includes(x)) : [...new Set([...cfg.marks, ...c.ids])];
              if (!nextMarks.length) nextMarks = ['a'];
              set('marks', nextMarks);
            },
          }, h('span', { class: 'ar' }, c.ar), c.label);
        }))) : null;

      const allOn = cfg.groups.length === Q.GROUPS.length;
      const small = { padding: '2px 8px', fontSize: '12.5px' };
      const groups = h('div', { class: 'field' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'label' }, 'Letters'),
          h('div', { class: 'row', style: { gap: '4px' } },
            h('button', { class: 'btn ghost', type: 'button', style: small, onclick: () => { only = null; set('groups', allOn ? [] : Q.GROUPS.map(g => g.id)); } }, allOn ? 'None' : 'All'),
            h('button', {
              class: 'btn ghost', type: 'button', style: small, title: 'Practise only your 6 weakest letters',
              onclick: () => {
                const weak = store.weakest(6, 2).map(x => x.l.id);
                if (weak.length < 2) { Q.toast('Practise a little more first so I can find your weak letters'); return; }
                only = weak; renderSetup(); startSession();
              },
            }, 'Weakest 6'))),
        only ? h('div', { class: 'row small' }, h('span', { class: 'muted' }, 'Only: '), h('span', { class: 'ar', style: { fontSize: '22px' } }, only.map(id => Q.L[id].ch).join(' ')),
          h('button', { class: 'btn ghost', type: 'button', style: small, onclick: () => { only = null; renderSetup(); startSession(); } }, 'Clear')) : null,
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

      const size = m.uses.includes('words') ? stepper('Groups per row', 'words', 1, 4)
        : m.uses.includes('len') ? stepper('Letters per row', 'rowLen', 1, 8) : null;

      const rounds = h('div', { class: 'field' },
        h('span', { class: 'label' }, isQuiz() ? 'Questions per session' : 'Rows per session'),
        h('div', { class: 'seg' }, ROUND_CHOICES.map(n => h('button', { type: 'button', 'aria-pressed': String(cfg.rounds === n), onclick: () => set('rounds', n, 'session') }, n))));

      const toggle = (label, key, title) => h('label', { class: 'toggle', title },
        h('input', { type: 'checkbox', id: 'pr-' + key, checked: !!cfg[key], onchange: e => { store.setPractice(key, e.target.checked); if (key === 'showKeys' && round && round.kind !== 'quiz') renderRound(); } }), label);

      const scheme = h('div', { class: 'field' },
        h('span', { class: 'label' }, 'Transliteration'),
        Q.schemeSwitch(() => { renderSetup(); if (session && session.over) renderSummary(); else newRound(); }));

      setupEl.replaceChildren(...[
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Mode'), modeList),
        markChips, groups,
        h('div', { class: 'row', style: { gap: '18px', alignItems: 'flex-end' } }, size, rounds),
        scheme,
        h('div', { class: 'stack', style: { gap: '8px' } },
          toggle('Show weak letters more often', 'focusWeak', 'Letters you miss come up more'),
          isQuiz() ? null : toggle('Mix in look-alikes', 'lookalikes', 'e.g. ب next to ت and ث'),
          isQuiz() ? null : toggle('Show keyboard keys in answers', 'showKeys')),
      ].filter(Boolean));
    }

    /* ---------------- keyboard ---------------- */
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!round) { startSession(); return; }
        next();
        return;
      }
      if (e.key === 'o' || e.key === 'O') { toggleSetup(); return; }
      if (/^[1-9]$/.test(e.key) && round) {
        const i = Number(e.key) - 1;
        if (round.kind === 'quiz') answerQuiz(i);
        else toggleUnit(i);
      }
    }
    document.addEventListener('keydown', onKey);

    renderSetup();
    startSession();

    return () => {
      document.removeEventListener('keydown', onKey);
      finishSession(false);
    };
  };
})(window.Q = window.Q || {});
