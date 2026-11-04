/* Alif — Latin → Arabic typing, following the Lexilogos "Quranic Arabic" keyboard.
   https://www.lexilogos.com/keyboard/arabic_quranic.htm
   Conversion happens as you type: "t" becomes ت, and a following ' turns it into ث. */
(function (Q) {
  'use strict';
  const M = Q.MARK;

  // [latin keys, arabic output, extra?]  extra = added here, not on Lexilogos
  const RULES = [
    ['a', 'ا'], ['b', 'ب'], ['t', 'ت'], ["t'", 'ث'], ['j', 'ج'], ['H', 'ح'], ["H'", 'خ'],
    ['d', 'د'], ["d'", 'ذ'], ['r', 'ر'], ['z', 'ز'], ['s', 'س'], ["s'", 'ش'],
    ['S', 'ص'], ['D', 'ض'], ["S'", 'ض'], ['T', 'ط'], ['Z', 'ظ'], ["T'", 'ظ'],
    ['g', 'ع'], ["g'", 'غ'], ['f', 'ف'], ['q', 'ق'], ['k', 'ك'], ['l', 'ل'], ['m', 'م'],
    ['n', 'ن'], ['h', 'ه'], ["h'", 'ة'], ['w', 'و'], ['y', 'ي'], ['Y', 'ى'],
    ['-', 'ء'], ['-a', 'أ'], ['a--', 'إ'], ['--a', 'ءا'], ['y--', 'ئ'], ['w--', 'ؤ'], ['aa', 'آ'],
    ['=a', M.fatha], ['=i', M.kasra], ['=u', M.damma],
    ['==a', M.fathatan], ['==i', M.kasratan], ['==u', M.dammatan],
    ['=w', M.shadda], ['=o', M.sukun],
    ["a'", 'ٱ', true], ['=A', M.daggerAlif, true], ['=~', M.maddah, true],
    ['0=', '٠'], ['1=', '١'], ['2=', '٢'], ['3=', '٣'], ['4=', '٤'],
    ['5=', '٥'], ['6=', '٦'], ['7=', '٧'], ['8=', '٨'], ['9=', '٩'],
    [',=', '،', true], ['?=', '؟', true],
  ];
  /* Every Latin letter types something Arabic, so no Latin letter is ever left in the text.
     These go beyond Lexilogos: the vowels and the letters Arabic does not have get the
     closest Arabic letter, and capitals that mean nothing on Lexilogos type like the small letter.
     (H S D T Z Y keep their own meaning: ح ص ض ط ظ ى.) */
  const ALIASES = [
    ['i', 'ي'], ['e', 'ي'], ['u', 'و'], ['o', 'و'], ['p', 'ب'], ['v', 'ف'], ['c', 'ك'], ['x', 'ش'],
  ];
  const SMALL = Object.fromEntries(RULES.concat(ALIASES).filter(r => /^[a-z]$/.test(r[0])).map(r => [r[0], r[1]]));
  const TAKEN = new Set(RULES.map(r => r[0]).filter(k => /^[A-Z]$/.test(k)));
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(C => { if (!TAKEN.has(C)) ALIASES.push([C, SMALL[C.toLowerCase()]]); });
  ALIASES.forEach(([k, out]) => RULES.push([k, out, true]));
  Q.KEY_RULES = RULES;
  Q.KEY_ALIASES = ALIASES;

  const MARK_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;
  Q.isMark = ch => MARK_RE.test(ch);

  /* Put a vowel mark on the letter before the caret, the way it can really be written:
     one vowel per letter (a new one replaces the old: fatḥa, kasra, ḍamma, tanwīn, sukūn),
     no doubled shadda or small alif, and nothing at all when there is no letter to carry it. */
  const VOWEL_MARKS = new Set([M.fatha, M.kasra, M.damma, M.fathatan, M.kasratan, M.dammatan, M.sukun]);
  const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3]/;
  function attach(text, mark) {
    let i = text.length;
    while (i > 0 && Q.isMark(text[i - 1])) i--;
    if (!i || !ARABIC_LETTER.test(text[i - 1])) return text;
    const marks = [...text.slice(i)].filter(m => m !== mark && !(VOWEL_MARKS.has(mark) && VOWEL_MARKS.has(m)));
    marks.push(mark);
    marks.sort((a, b) => (b === M.shadda) - (a === M.shadda));   // shadda first, as the mushaf stores it
    return text.slice(0, i) + marks.join('');
  }

  /* Each rule is matched against the text as it looks *while* you type it:
     "t'" is matched as "ت'", "==a" as "==a", "a--" as "اء-". */
  let compiled = [];
  function applyOnce(text) {
    for (const r of compiled) {
      if (!text.endsWith(r.form)) continue;
      const before = text.slice(0, text.length - r.form.length);
      return r.mark ? attach(before, r.out) : before + r.out;
    }
    return text;
  }
  function convert(latin) {
    let out = '';
    for (const ch of latin) out = applyOnce(out + ch);
    return out;
  }
  // compile in order of key length so shorter forms exist before longer ones use them
  RULES.slice().sort((a, b) => a[0].length - b[0].length).forEach(([key, out]) => {
    const form = convert(key.slice(0, -1)) + key.slice(-1);
    compiled.push({ key, form, out, mark: out.length === 1 && Q.isMark(out) });
    compiled.sort((a, b) => b.form.length - a.form.length);
  });

  Q.translit = { applyOnce, convert, attach };

  /* Reverse lookup: Arabic character → names and keys, for the letter-by-letter view */
  const EXTRA_NAMES = {
    'ة': 'Taa marbūṭa (h/t ending)', 'ى': 'Alif maqṣūra (long a)', 'أ': 'Alif + hamza above',
    'إ': 'Alif + hamza below', 'ئ': 'Hamza on yaa', 'ؤ': 'Hamza on waaw', 'آ': 'Alif madda (long a)',
    'ٱ': 'Alif waṣla (silent when joined)', 'ء': 'Hamza', ' ': 'space',
  };
  const INFO = {};
  RULES.forEach(([key, out]) => {
    if ([...out].length !== 1) return;
    if (!INFO[out]) INFO[out] = { key };
  });
  Q.LETTERS.forEach(l => { INFO[l.ch] = Object.assign(INFO[l.ch] || {}, { name: l.name, letter: l }); });
  Object.entries(EXTRA_NAMES).forEach(([ch, name]) => { INFO[ch] = Object.assign(INFO[ch] || {}, { name }); });
  Q.MARKS.forEach(m => { INFO[m.mark] = Object.assign(INFO[m.mark] || {}, { name: m.name, mark: m }); });
  Q.charInfo = ch => {
    const i = INFO[ch];
    if (!i) return null;
    return i.letter ? Object.assign({}, i, { name: i.letter.name }) : i;
  };

  /* Split Arabic text into clusters: a base letter plus the marks on it */
  Q.clusters = function (text) {
    const out = [];
    for (const ch of text) {
      if (Q.isMark(ch) && out.length && out[out.length - 1].base !== '\n') out[out.length - 1].marks.push(ch);
      else out.push({ base: ch, marks: [] });
    }
    return out;
  };

  /* Rough sound for one cluster in the current scheme, e.g. بَ → "bá", بْ → "b", بّ → "bbá" */
  const ALIF_SEATS = { 'أ': 'alif', 'إ': 'alif', 'ء': 'hamza', 'ئ': 'hamza', 'ؤ': 'hamza' };
  Q.clusterSound = function (c) {
    const info = INFO[c.base];
    const id = ALIF_SEATS[c.base] || (info && info.letter ? info.letter.id : null);
    if (!id) return '';
    let v = null, doubled = false, long = false;
    for (const m of c.marks) {
      if (m === M.fatha) v = 'a';
      else if (m === M.kasra) v = 'i';
      else if (m === M.damma) v = 'u';
      else if (m === M.fathatan) v = 'an';
      else if (m === M.kasratan) v = 'in';
      else if (m === M.dammatan) v = 'un';
      else if (m === M.daggerAlif) { v = v || 'a'; long = true; }
      else if (m === M.shadda) doubled = true;
    }
    const cons = Q.L[id].tr || '';
    if (!v) return c.marks.includes(M.sukun) || doubled ? (doubled ? cons + cons : cons) : '';
    if (id === 'hamza' && v) {
      // hamza on a seat reads like alif with that vowel
      return Q.sound('alif', v) + (long ? (Q.SCHEME === 'pt' ? 'á' : 'a') : '');
    }
    const snd = Q.sound(id, v);
    const body = doubled ? cons + snd : snd;
    return long ? body + (Q.SCHEME === 'pt' ? 'á' : 'a') : body;
  };
})(window.Q = window.Q || {});
