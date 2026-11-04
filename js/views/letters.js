/* Huruf — Letters: the alphabet by shape family, plus the vowel marks. */
(function (Q) {
  'use strict';
  const { h } = Q;
  Q.views = Q.views || {};

  const LEVEL_COLORS = ['transparent', 'var(--m1)', 'var(--m2)', 'var(--m3)', 'var(--m4)', 'var(--m5)'];

  Q.views.letters = function (root) {
    let selected = Q.storage.get('huruf.letter', 'baa');
    if (!Q.L[selected]) selected = 'baa';

    const groupsEl = h('div', { class: 'groups' });
    const detailEl = h('aside', { class: 'detail card' });

    function renderGroups() {
      groupsEl.replaceChildren(...Q.GROUPS.map((g, gi) =>
        h('div', { class: 'group-row' },
          h('span', { class: 'gn' }, gi + 1),
          h('div', { class: 'group-letters' }, g.letters.map(id => {
            const l = Q.L[id];
            const lvl = Q.store.level(id);
            return h('button', { class: 'lt', type: 'button', 'aria-pressed': String(id === selected), onclick: () => select(id), title: l.name },
              lvl ? h('span', { class: 'lvl', style: { background: LEVEL_COLORS[lvl] }, title: Q.store.LEVELS[lvl] }) : null,
              h('span', { class: 'ar' }, l.ch),
              h('span', { class: 'nm' }, l.name),
              h('span', { class: 'k' }, l.key));
          })))));
    }

    function select(id) {
      selected = id;
      Q.storage.set('huruf.letter', id);
      renderGroups();
      renderDetail();
      if (window.innerWidth <= 1100) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderDetail() {
      const l = Q.L[selected];
      const f = Q.forms(selected);
      const rec = Q.store.state.letters[selected];
      const formBox = (key, label) => h('div', { class: f[key] ? '' : 'na' },
        h('span', { class: 'ar' }, f[key] || '–'), h('span', null, label));
      const vowels = l.noSound ? null : h('div', { class: 'stack', style: { gap: '8px' } },
        h('div', { class: 'eyebrow' }, 'With vowels'),
        h('div', { class: 'vowel-row' }, ['a', 'i', 'u'].map(v => {
          const sy = Q.syllable(selected, v);
          const kids = [h('span', { class: 'ar' }, sy.text), h('b', null, sy.sound), h('span', { class: 'small muted' }, Q.VOWELS[v].name + (Q.letterAudioOn() ? ' · ▶' : ''))];
          return Q.letterAudioOn()
            ? h('button', { type: 'button', class: 'vowel-btn', title: 'Hear ' + sy.sound, onclick: () => Q.hearLetter(selected, v) }, kids)
            : h('div', null, kids);
        })));
      const like = (l.like || []).map(id => Q.L[id]);
      const hearEl = Q.letterAudioOn() ? h('div', { class: 'stack', style: { gap: '8px' } }, h('div', { class: 'eyebrow' }, 'Hear it')) : null;
      currentHearEl = hearEl;
      if (hearEl) fillHear(hearEl, selected);
      detailEl.replaceChildren(...[
        h('div', { class: 'hero' },
          h('span', { class: 'ar' }, l.ch),
          h('div', { class: 'stack', style: { gap: '6px' } },
            h('h2', null, l.name),
            l.alt ? h('span', { class: 'muted' }, l.alt) : null,
            h('div', { class: 'tags' },
              h('span', { class: 'tag' + (l.heavy ? ' heavy' : '') }, l.heavy ? 'Heavy letter' : 'Light letter'),
              h('span', { class: 'tag' }, l.joins ? 'Joins both sides' : 'Joins on the right only'),
              h('span', { class: 'tag' }, 'Key ', h('span', { class: 'mono' }, l.key))))),
        h('p', null, Q.mixed(l.tip)),
        h('div', { class: 'stack', style: { gap: '8px' } },
          h('div', { class: 'eyebrow' }, 'Shapes in a word'),
          h('div', { class: 'forms' }, formBox('isolated', 'alone'), formBox('initial', 'start'), formBox('medial', 'middle'), formBox('final', 'end'))),
        vowels,
        hearEl,
        like.length ? h('div', { class: 'stack', style: { gap: '8px' } },
          h('div', { class: 'eyebrow' }, 'Easy to mix up with'),
          h('div', { class: 'chips' }, like.map(o => h('button', { class: 'chip', type: 'button', onclick: () => select(o.id) }, h('span', { class: 'ar' }, o.ch), o.name)))) : null,
        h('div', { class: 'stack', style: { gap: '6px' } },
          h('div', { class: 'eyebrow' }, 'Your record'),
          rec && rec.n
            ? h('p', { class: 'small' }, `${rec.n} reads · ${Q.pct(1 - rec.w / rec.n)} right · `, h('b', null, Q.store.LEVELS[Q.store.level(selected)]))
            : h('p', { class: 'small muted' }, 'Not practised yet.')),
        h('button', { class: 'btn', type: 'button', onclick: () => { Q.practiceOnly = [selected, ...like.map(o => o.id)].filter(id => Q.L[id]); const cur = Q.MODE[Q.store.state.practice.mode]; if (Q.L[selected].noSound && cur && cur.sound) Q.store.setPractice('mode', 'names'); Q.go('practice'); } },
          'Practise ' + l.name + ' and its look-alikes')].filter(Boolean));
    }

    /* Hear the letter (only when letter audio is switched on, see js/voice.js) */
    async function fillHear(el, id) {
      if (!el) return;
      const l = Q.L[id];
      const items = [[null, l.name], ...(l.noSound ? [] : ['a', 'i', 'u'].map(v => [v, Q.syllable(id, v).sound]))];
      const kids = [h('div', { class: 'eyebrow' }, 'Hear it'),
        h('div', { class: 'row' }, items.map(([v, label]) => h('button', { class: 'btn sm', type: 'button', onclick: () => Q.hearLetter(id, v) }, '▶ ' + label)))];
      if (Q.teacherRecordingOn()) kids.push(h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { recCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); rec.jump(id); } }, '● Record your teacher saying it'));
      el.replaceChildren(...kids);
    }

    /* Record your teacher: walk through the letters, one clip each */
    const KINDS = [
      { id: 'name', label: 'Letter names', say: l => l.name },
      { id: 'a', label: 'With fatḥa', say: l => Q.syllable(l.id, 'a').sound, text: l => Q.syllable(l.id, 'a').text },
      { id: 'i', label: 'With kasra', say: l => Q.syllable(l.id, 'i').sound, text: l => Q.syllable(l.id, 'i').text },
      { id: 'u', label: 'With ḍamma', say: l => Q.syllable(l.id, 'u').sound, text: l => Q.syllable(l.id, 'u').text },
    ];
    const recCard = h('section', { class: 'card stack', id: 'teacher-voice' });
    const rec = (function () {
      let kind = 'name', idx = 0, recorder = null, busy = false;
      const list = () => Q.LETTERS.filter(l => kind === 'name' || !l.noSound);
      const keyOf = l => kind === 'name' ? 'name:' + l.id : `sound:${l.id}:${kind}`;
      async function draw() {
        const keys = await Q.voice.keys();
        const L = list();
        idx = Math.max(0, Math.min(idx, L.length - 1));
        const l = L[idx];
        const K = KINDS.find(k => k.id === kind);
        const done = L.filter(x => keys.has(keyOf(x))).length;
        const has = keys.has(keyOf(l));
        const recording = recorder && recorder.recording;
        recCard.replaceChildren(
          h('div', { class: 'card-head' }, h('h2', null, 'Record your teacher'), h('span', { class: 'small muted' }, `${done} of ${L.length} recorded`)),
          h('p', { class: 'small', style: { color: 'var(--ink-2)', maxWidth: '70ch' } }, 'In your next lesson, ask your teacher to say each one while you record. Their voice then plays everywhere you press ▶ Hear. Recordings stay in this browser on this device (they are not part of the backup file).'),
          h('div', { class: 'seg' }, KINDS.map(k => h('button', { type: 'button', 'aria-pressed': String(kind === k.id), onclick: () => { kind = k.id; draw(); } }, k.label))),
          h('div', { class: 'rec-stage' },
            h('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Previous', onclick: () => { idx--; draw(); } }, '←'),
            h('div', { class: 'rec-letter' },
              h('span', { class: 'ar' }, K.text ? K.text(l) : l.ch),
              h('b', null, 'Say: ' + K.say(l)),
              h('span', { class: 'small ' + (has ? '' : 'muted') }, has ? '✓ Recorded' : 'Not recorded yet')),
            h('button', { class: 'btn ghost', type: 'button', 'aria-label': 'Next', onclick: () => { idx++; draw(); } }, '→')),
          h('div', { class: 'row', style: { justifyContent: 'center' } },
            recording
              ? h('button', { class: 'btn danger lg', type: 'button', onclick: stopRec }, '■ Stop', h('kbd', null, 'Space'))
              : h('button', { class: 'btn primary lg', type: 'button', onclick: startRec }, has ? '● Record again' : '● Record', h('kbd', null, 'Space')),
            has && !recording ? h('button', { class: 'btn', type: 'button', onclick: () => Q.voice.play(keyOf(l)) }, '▶ Play') : null,
            has && !recording ? h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await Q.voice.remove(keyOf(l)); draw(); fillHear(detailHear(), selected); } }, 'Delete') : null),
          h('div', { class: 'rec-grid', dir: 'rtl' }, L.map((x, i) => h('button', { type: 'button', class: 'rec-dot' + (keys.has(keyOf(x)) ? ' done' : '') + (i === idx ? ' on' : ''), title: x.name, onclick: () => { idx = i; draw(); } }, K.text ? K.text(x) : x.ch))));
      }
      async function startRec() {
        if (busy) return;
        busy = true;
        try { recorder = Q.voice.recorder(); await recorder.start(); }
        catch (e) { Q.toast('Microphone not allowed. Check the browser’s site settings.'); recorder = null; }
        busy = false;
        draw();
      }
      async function stopRec() {
        if (!recorder) return;
        const blob = await recorder.stop();
        recorder = null;
        const l = list()[idx];
        if (blob && blob.size) { await Q.voice.save(keyOf(l), blob); Q.toast('Saved ' + (KINDS.find(k => k.id === kind).say(l))); idx++; }
        draw();
        if (l.id === selected) fillHear(detailHear(), selected);
      }
      return {
        draw,
        jump(id) { const i = list().findIndex(x => x.id === id); if (i >= 0) idx = i; draw(); },
        key(e) {
          if (!recCard.matches(':hover') && !recCard.contains(document.activeElement) && !(recorder && recorder.recording)) return false;
          if (e.key === ' ') { e.preventDefault(); recorder && recorder.recording ? stopRec() : startRec(); return true; }
          if (e.key === 'ArrowRight') { idx++; draw(); return true; }
          if (e.key === 'ArrowLeft') { idx--; draw(); return true; }
          return false;
        },
        dispose() { if (recorder) recorder.dispose(); },
      };
    })();
    let currentHearEl = null;
    const detailHear = () => currentHearEl;

    const GUIDE = {
      en: [
        ['ḥ', 'ح', 'strong h from the middle of the throat'],
        ['h', 'ه', 'soft, airy h'],
        ['ṣ ḍ ṭ ẓ', 'ص ض ط ظ', 'heavy versions of s, d, t, dh'],
        ['th', 'ث', 'as in think'],
        ['dh', 'ذ', 'as in this'],
        ['kh', 'خ', 'as in loch'],
        ['gh', 'غ', 'a gargled r'],
        ['sh', 'ش', 'as in she'],
        ['q', 'ق', 'a deep k'],
        ['ʿ', 'ع', 'ʿayn, squeezed throat sound'],
        ['ʾ', 'ء', 'hamza, the catch in uh-oh'],
        ['a i u', 'ـَ ـِ ـُ', 'short vowels'],
        ['an in un', 'ـً ـٍ ـٌ', 'tanwīn: vowel + n'],
      ],
      pt: [
        ['á · ó', 'بَ صَ', 'fatḥa: "á" nas letras leves, "ó" nas pesadas'],
        ['i · u', 'ـِ ـُ', 'kasra e ḍamma'],
        ['án ón in un', 'ـً ـٍ ـٌ', 'tanwīn: vogal + n bem pronunciado, sem nasalar'],
        ['só dó tó dhó', 'صَ ضَ طَ ظَ', 'letras pesadas: boca cheia, fundo da língua alto'],
        ['ṣi ḍu ṭi', 'صِ ضُ طِ', 'com kasra e ḍamma, o ponto lembra que continua pesada'],
        ['rhó', 'خَ', 'rh raspado, como um rr carioca bem forte'],
        ['ró', 'رَ', 'r batido de "caro", nunca o de "rato"'],
        ['ghó', 'غَ', 'gargarejo com voz, como o r francês'],
        ['qó', 'قَ', 'k do fundo da garganta'],
        ['ḥá', 'حَ', 'h forte e soprado do meio da garganta'],
        ['há', 'هَ', 'h suave do inglês "hat", nunca mudo'],
        ['chá · djá', 'شَ جَ', 'como "chá" e "Djavan"'],
        ['thá · dhá', 'ثَ ذَ', 'th do inglês: "think" · "this"'],
        ['ʿá', 'عَ', 'ʿain: aperto no meio da garganta'],
        ['ʾ', 'ء', 'hamza: a travinha de "ô-ôu"'],
        ['ti · di', 'تِ دِ', 'secos, nunca "tchi" nem "dji"'],
      ],
    };
    const guideEl = h('div', { class: 'guide' });
    const renderGuide = () => guideEl.replaceChildren(...GUIDE[Q.SCHEME].map(([tr, ar, what]) => h('div', { class: 'guide-row' },
      h('b', { class: 'translit' }, tr), h('span', { class: 'ar' }, ar), h('span', { class: 'small' }, what))));
    const guide = h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', null, 'Reading the transliteration'), h('span', { class: 'small muted' }, 'The Latin spelling used in practice and quizzes')),
      guideEl);

    const marks = h('section', { class: 'card stack' },
      h('div', { class: 'card-head' },
        h('h2', null, 'Vowel marks (ḥarakāt)'),
        h('span', { class: 'small muted' }, 'Shown on ب. The key is how to type it on the Keyboard page.')),
      h('div', { class: 'marks-grid' }, Q.MARKS.map(m => {
        const sample = m.id === 'maddah' ? 'آ' : m.id === 'shadda' ? 'بَّ' : 'ب' + m.mark;
        return h('div', { class: 'mark-card' },
          h('span', { class: 'ar' }, sample),
          h('div', null, h('b', null, m.name, ' ', h('kbd', { class: 'key' }, m.key)), h('p', null, Q.mixed(m.what))));
      })));

    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Letters'),
          h('p', null, 'All 28 letters plus hamza, grouped by shape. Letters in the same row share a body and differ only by their dots. Read each row from right to left.')),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Transliteration'), Q.schemeSwitch(() => { renderGroups(); renderDetail(); renderGuide(); }))),
      h('div', { class: 'letters-layout' }, h('section', { class: 'card' }, groupsEl), detailEl),
      guide,
      Q.teacherRecordingOn() ? recCard : null,
      marks));

    renderGroups();
    renderDetail();
    renderGuide();
    if (Q.teacherRecordingOn()) rec.draw();
    const onKey = e => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (Q.teacherRecordingOn()) rec.key(e);
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); rec.dispose(); Q.voice.stop(); };
  };
})(window.Q = window.Q || {});
