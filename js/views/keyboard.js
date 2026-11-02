/* Huruf — Keyboard: type Arabic with Latin keys (Lexilogos Quranic layout), switch mushaf fonts. */
(function (Q) {
  'use strict';
  const { h } = Q;
  Q.views = Q.views || {};

  const SAMPLE = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

  const CHEAT = [
    { title: 'Plain letters', note: 'Lower case', rows: [['a', 'ا'], ['b', 'ب'], ['t', 'ت'], ['j', 'ج'], ['d', 'د'], ['r', 'ر'], ['s', 'س'], ['g', 'ع']] },
    { title: 'Heavy letters', note: 'Upper case', rows: [['H', 'ح'], ['S', 'ص'], ['D', 'ض'], ['T', 'ط'], ['Z', 'ظ']] },
    { title: 'Add dots', note: "Type ' after the letter", rows: [["t'", 'ث'], ["H'", 'خ'], ["d'", 'ذ'], ["s'", 'ش'], ["g'", 'غ'], ["h'", 'ة']] },
    { title: 'Vowel marks', note: 'Type after the letter', rows: [['=a', 'بَ'], ['=i', 'بِ'], ['=u', 'بُ'], ['=o', 'بْ'], ['=w', 'بّ'], ['==a', 'بً'], ['==i', 'بٍ'], ['==u', 'بٌ']] },
    { title: 'Hamza', note: '', rows: [['-', 'ء'], ['-a', 'أ'], ['a--', 'إ'], ['y--', 'ئ'], ['w--', 'ؤ'], ['aa', 'آ'], ['--a', 'ءا'], ['Y', 'ى']] },
    { title: 'Huruf extras', note: 'Not on Lexilogos', rows: [["a'", 'ٱ'], ['=A', 'بٰ'], ['=~', 'آ'], ['1=', '١'], [',=', '،'], ['?=', '؟']] },
  ];

  const SPECIAL_KEYS = [['أ', '-a'], ['إ', 'a--'], ['آ', 'aa'], ['ٱ', "a'"], ['ئ', 'y--'], ['ؤ', 'w--'], ['ة', "h'"], ['ى', 'Y']];

  Q.views.keyboard = function (root) {
    const st = Q.store.state;
    const settings = st.settings;
    let on = true;
    if (!settings.kbFont) settings.kbFont = settings.font || 'hafs';
    if (!settings.kbSize) settings.kbSize = 44;

    const ta = h('textarea', {
      id: 'kb-text', class: 'kb-editor', dir: 'rtl', lang: 'ar', spellcheck: false, autocomplete: 'off',
      'aria-label': 'Arabic text', placeholder: 'اكتب هنا · type here',
    });
    ta.value = st.draft != null && st.draft !== '' ? st.draft : SAMPLE;

    const breakdown = h('div', { class: 'breakdown', 'aria-live': 'polite' });
    const fontNote = h('p', { class: 'small muted' });

    function applyFont() {
      ta.style.fontFamily = Q.arabicFontCss(settings.kbFont);
      ta.style.setProperty('--kb-size', settings.kbSize + 'px');
      breakdown.style.setProperty('--f-arabic', Q.arabicFontCss(settings.kbFont));
      fontNote.replaceChildren(Q.FONT[settings.kbFont].note, ' Compare with ', h('a', { href: 'https://quran.com/1', target: '_blank', rel: 'noopener' }, 'Quran.com'), ' (its settings let you switch between Uthmani and Indo-Pak too).');
    }

    let saveT = null;
    function update() {
      clearTimeout(saveT);
      saveT = setTimeout(() => { st.draft = ta.value; Q.store.save(); }, 300);
      const cl = Q.clusters(ta.value).slice(0, 240);
      breakdown.replaceChildren(...cl.map(c => {
        if (c.base === ' ' || c.base === '\n') return h('span', { class: 'bd space', 'aria-hidden': 'true' });
        const info = Q.charInfo(c.base);
        const keys = [info && info.key, ...c.marks.map(m => (Q.charInfo(m) || {}).key)].filter(Boolean).join(' ');
        const names = [info ? info.name : c.base, ...c.marks.map(m => (Q.charInfo(m) || {}).name).filter(Boolean)].join(' + ');
        const snd = Q.clusterSound(c);
        return h('span', { class: 'bd', title: names },
          h('span', { class: 'ar' }, c.base + c.marks.join('')),
          h('span', { class: 'nm' }, names),
          keys ? h('span', { class: 'k' }, keys) : null,
          snd ? h('span', { class: 'snd' }, snd) : null);
      }));
      if (!cl.length) breakdown.append(h('p', { class: 'empty' }, 'Start typing and each letter will be named here.'));
    }

    function insert(text) {
      const a = ta.selectionStart, b = ta.selectionEnd;
      ta.setRangeText(text, a, b, 'end');
      ta.focus();
      update();
    }
    function backspace() {
      const a = ta.selectionStart, b = ta.selectionEnd;
      if (a !== b) ta.setRangeText('', a, b, 'end');
      else if (a > 0) ta.setRangeText('', a - 1, a, 'end');
      ta.focus();
      update();
    }

    ta.addEventListener('input', e => {
      if (on && !e.isComposing && e.inputType === 'insertText' && e.data) {
        const pos = ta.selectionStart;
        const before = ta.value.slice(0, pos), after = ta.value.slice(pos);
        const nb = Q.translit.applyOnce(before);
        if (nb !== before) { ta.value = nb + after; ta.setSelectionRange(nb.length, nb.length); }
      }
      update();
    });
    ta.addEventListener('paste', e => {
      if (!on) return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[A-Za-z]/.test(text)) return;
      e.preventDefault();
      insert(Q.translit.convert(text));
    });

    /* toolbar */
    const fontSel = h('select', { id: 'kb-font', class: 'input', onchange: e => { settings.kbFont = e.target.value; Q.store.save(); applyFont(); } },
      Q.FONTS.map(f => h('option', { value: f.id, selected: f.id === settings.kbFont }, f.label)));
    const sizeIn = h('input', { id: 'kb-size', type: 'range', min: 24, max: 96, step: 2, value: settings.kbSize, 'aria-label': 'Text size', oninput: e => { settings.kbSize = Number(e.target.value); applyFont(); }, onchange: () => Q.store.save() });
    const onToggle = h('label', { class: 'toggle', title: 'Turn off to type Latin letters as they are' },
      h('input', { id: 'kb-on', type: 'checkbox', checked: true, onchange: e => { on = e.target.checked; ta.focus(); } }), 'Latin → Arabic');

    const toolbar = h('div', { class: 'kb-toolbar' },
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', { for: 'kb-font' }, 'Script / font'), fontSel),
        h('div', { class: 'field' }, h('label', { for: 'kb-size' }, 'Size'), sizeIn)),
      h('div', { class: 'row' }, onToggle,
        h('button', { class: 'btn', type: 'button', onclick: () => Q.copy(ta.value, ta) }, 'Copy'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { ta.value = ''; ta.focus(); update(); } }, 'Clear'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { ta.value = SAMPLE; update(); } }, 'Bismillah')));

    /* on-screen keys */
    const keycap = (ch, key, name, wide) => h('button', { class: 'keycap' + (wide ? ' wide' : ''), type: 'button', title: name || '', onclick: () => insert(ch) },
      h('span', { class: 'ar' }, ch.length === 1 && Q.isMark(ch) ? 'ب' + ch : ch),
      h('span', { class: 'k', dir: 'ltr' }, key),
      name ? h('span', { class: 'nm' }, name) : null);

    const keysLetters = h('div', { class: 'keys', dir: 'rtl' }, Q.LETTERS.map(l => keycap(l.ch, l.key, l.name)));
    const keysSpecial = h('div', { class: 'keys', dir: 'rtl' }, SPECIAL_KEYS.map(([ch, key]) => keycap(ch, key, (Q.charInfo(ch) || {}).name ? (Q.charInfo(ch).name.split(' (')[0]) : '')));
    const keysMarks = h('div', { class: 'keys', dir: 'rtl' },
      Q.MARKS.map(m => keycap(m.mark, m.key, m.name)),
      h('button', { class: 'keycap wide', type: 'button', onclick: () => insert(' ') }, h('span', { class: 'ar', style: { fontSize: '16px', lineHeight: '46px' } }, 'space'), h('span', { class: 'k' }, '␣')),
      h('button', { class: 'keycap wide', type: 'button', onclick: backspace, 'aria-label': 'Delete' }, h('span', { style: { fontSize: '20px', lineHeight: '46px' } }, '⌫'), h('span', { class: 'k' }, 'delete')));

    const cheat = h('div', { class: 'cheat' }, CHEAT.map(sec => h('div', { class: 'cheat-sec' },
      h('div', null, h('b', null, sec.title), sec.note ? h('div', { class: 'small muted' }, sec.note) : null),
      h('div', { class: 'cheat-pairs' }, sec.rows.map(r => h('span', { class: 'pair' },
        h('kbd', { class: 'key', dir: 'ltr' }, r[0]),
        h('span', { class: 'ar' + (/[٠-٩،؟]/.test(r[1]) ? ' ar-plain' : '') }, r[1])))))));

    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Keyboard'),
          h('p', null, 'Type Arabic with your normal keyboard, using the same keys as the Lexilogos Quranic keyboard. Each letter you type is named underneath. Try ', h('kbd', { class: 'key' }, 'b=is=om=i'), ' for بِسْمِ.'))),
      h('section', { class: 'card stack' }, toolbar, h('div', { class: 'frame kb-frame' }, ta), fontNote),
      h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Letter by letter'), h('span', { class: 'small muted' }, 'Name · keys · sound')), breakdown),
      h('div', { class: 'split' },
        h('section', { class: 'card stack' },
          h('h2', null, 'Click to insert'),
          h('div', { class: 'eyebrow' }, 'Letters'), keysLetters,
          h('div', { class: 'eyebrow' }, 'Hamza and special forms'), keysSpecial,
          h('div', { class: 'eyebrow' }, 'Marks'), keysMarks),
        h('section', { class: 'card' }, h('h2', null, 'How typing works'), cheat))));

    applyFont();
    update();
    return () => { clearTimeout(saveT); st.draft = ta.value; Q.store.save(true); };
  };
})(window.Q = window.Q || {});
