/* Huruf — Latin → Arabic typing, following the Lexilogos "Quranic Arabic" keyboard.
   https://www.lexilogos.com/keyboard/arabic_quranic.htm
   Conversion happens as you type: "t" becomes ت, and a following ' turns it into ث. */
(function (Q) {
  'use strict';
  const M = Q.MARK;

  // [latin keys, arabic output, extra?]  extra = added by Huruf, not on Lexilogos
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
  Q.KEY_RULES = RULES;

  /* Each rule is matched against the text as it looks *while* you type it:
     "t'" is matched as "ت'", "==a" as "==a", "a--" as "اء-". */
  let compiled = [];
  function applyOnce(text) {
    for (const r of compiled) {
      if (text.endsWith(r.form)) return text.slice(0, text.length - r.form.length) + r.out;
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
    compiled.push({ key, form, out });
    compiled.sort((a, b) => b.form.length - a.form.length);
  });

  Q.translit = { applyOnce, convert };

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
  Q.charInfo = ch => INFO[ch] || null;

  const MARK_RE = /[ً-ٰٟۖ-ۭ]/;
  Q.isMark = ch => MARK_RE.test(ch);

  /* Split Arabic text into clusters: a base letter plus the marks on it */
  Q.clusters = function (text) {
    const out = [];
    for (const ch of text) {
      if (Q.isMark(ch) && out.length && out[out.length - 1].base !== '\n') out[out.length - 1].marks.push(ch);
      else out.push({ base: ch, marks: [] });
    }
    return out;
  };

  /* Rough sound for one cluster, e.g. بَ → "ba", بْ → "b", بّ → "bba" */
  Q.clusterSound = function (c) {
    const info = INFO[c.base];
    let cons = info && info.letter ? info.letter.tr : null;
    if (c.base === 'أ' || c.base === 'إ' || c.base === 'ء' || c.base === 'ئ' || c.base === 'ؤ') cons = 'ʾ';
    if (cons == null) return '';
    let v = '';
    let doubled = false;
    for (const m of c.marks) {
      if (m === M.fatha) v = 'a';
      else if (m === M.kasra) v = 'i';
      else if (m === M.damma) v = 'u';
      else if (m === M.fathatan) v = 'an';
      else if (m === M.kasratan) v = 'in';
      else if (m === M.dammatan) v = 'un';
      else if (m === M.daggerAlif) v = 'aa';
      else if (m === M.shadda) doubled = true;
    }
    if (cons === 'ʾ' && v) cons = '';
    if (!v && !c.marks.includes(M.sukun) && !doubled) return '';
    return (doubled ? cons + cons : cons) + v;
  };
})(window.Q = window.Q || {});
