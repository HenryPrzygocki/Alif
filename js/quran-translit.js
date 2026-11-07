/* Alif — transliteration of Quranic (Uthmani / Madani) text, word by word, for reciting.
   It reads the way a verse is recited: hamzat al-waṣl is silent mid-verse, sun letters merge
   (ar-raḥmān), shadda doubles, noon and tanween merge or turn to m (iqlab), and each verse
   ends with a stop (waqf): aḥadun → aḥad, ḥāmiyatun → ḥāmiyah, turāban → turābā.
   Two styles: 'en' (al-ḥamdu lillāhi rabbi l-ʿālamīn) and 'pt', Iqra style, where heavy
   letters turn a into o (ar-roḥmán, ṣiróṭo) and long vowels carry an accent (á í ú). */
(function (Q) {
  'use strict';

  const F = 'َ', D = 'ُ', K = 'ِ';
  const FT = 'ً', DT = 'ٌ', KT = 'ٍ';
  const OPEN_F = 'ٗ', OPEN_K = 'ٖ', OPEN_D = 'ٞ';
  const SHADDA = 'ّ', SUKUN_SILENT = 'ْ', SUKUN = 'ۡ';
  const DAGGER = 'ٰ', HAMZA_ABOVE = 'ٔ', HAMZA_BELOW = 'ٕ';
  const MEEM_HIGH = 'ۢ', MEEM_LOW = 'ۭ', SMALL_WAW = 'ۥ', SMALL_YAA = 'ۦ', ROUND_ZERO = '۠';
  const SMALL_HIGH_YAA = '\u06E7', SMALL_HIGH_NOON = '\u06E8';

  const isMark = ch => /[ً-ٰٟۖ-ۭ]/.test(ch);

  const CONS = {
    'ب': 'baa', 'ت': 'taa', 'ث': 'thaa', 'ج': 'jeem', 'ح': 'Haa', 'خ': 'khaa', 'د': 'daal', 'ذ': 'dhaal',
    'ر': 'raa', 'ز': 'zaay', 'س': 'seen', 'ش': 'sheen', 'ص': 'Saad', 'ض': 'Daad', 'ط': 'Taa', 'ظ': 'Zaa',
    'ع': 'ayn', 'غ': 'ghayn', 'ف': 'faa', 'ق': 'qaaf', 'ك': 'kaaf', 'ل': 'laam', 'م': 'meem', 'ن': 'noon',
    'ه': 'haa', 'و': 'waaw', 'ي': 'yaa', 'ى': 'yaa', 'ة': 'taM', 'ء': 'hamza', 'أ': 'hamza', 'إ': 'hamza',
    'ؤ': 'hamza', 'ئ': 'hamza',
  };

  const SPELL = {
    en: {
      baa: 'b', taa: 't', thaa: 'th', jeem: 'j', Haa: 'ḥ', khaa: 'kh', daal: 'd', dhaal: 'dh', raa: 'r', zaay: 'z',
      seen: 's', sheen: 'sh', Saad: 'ṣ', Daad: 'ḍ', Taa: 'ṭ', Zaa: 'ẓ', ayn: 'ʿ', ghayn: 'gh', faa: 'f', qaaf: 'q',
      kaaf: 'k', laam: 'l', meem: 'm', noon: 'n', haa: 'h', waaw: 'w', yaa: 'y', taM: 't', hamza: "'",
    },
    pt: {
      baa: 'b', taa: 't', thaa: 'th', jeem: 'dj', Haa: 'ḥ', khaa: 'rh', daal: 'd', dhaal: 'dh', raa: 'r', zaay: 'z',
      seen: 's', sheen: 'ch', Saad: 'ṣ', Daad: 'ḍ', Taa: 'ṭ', Zaa: 'ẓ', ayn: 'ʿ', ghayn: 'gh', faa: 'f', qaaf: 'q',
      kaaf: 'k', laam: 'l', meem: 'm', noon: 'n', haa: 'h', waaw: 'w', yaa: 'y', taM: 't', hamza: "'",
    },
  };
  // letters that make a following "a" sound deep: written "o" in the Portuguese style
  const HEAVY = new Set(['khaa', 'Saad', 'Daad', 'Taa', 'Zaa', 'ghayn', 'qaaf', 'raa']);

  function units(word) {
    const out = [];
    for (const ch of word) {
      if (isMark(ch)) { if (out.length) out[out.length - 1].m += ch; }
      else if (ch !== '‍') out.push({ b: ch, m: '' });
    }
    return out;
  }

  /* Turn one word into sound tokens: { c: letter id | null, v: 'a'|'i'|'u'|null, long, dbl, tan, sun, art } */
  function tokens(word, first) {
    const U = units(word);
    const T = [];
    const lastTok = () => T[T.length - 1];
    let sunNext = false;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      const m = u.m;
      const has = x => m.includes(x);
      let v = has(F) ? 'a' : has(K) ? 'i' : has(D) ? 'u' : null;
      let tan = null;
      if (has(FT) || has(OPEN_F)) { v = 'a'; tan = 'n'; }
      if (has(KT) || has(OPEN_K)) { v = 'i'; tan = 'n'; }
      if (has(DT) || has(OPEN_D)) { v = 'u'; tan = 'n'; }
      const restIsSeat = U.slice(i + 1).every(x => x.b === 'ا' || x.b === 'ى');
      if ((has(MEEM_HIGH) || has(MEEM_LOW)) && v && restIsSeat) tan = 'm';     // tanween iqlab
      const shad = has(SHADDA);
      const suk = has(SUKUN);
      const silent = has(SUKUN_SILENT) || has(ROUND_ZERO);
      const dag = has(DAGGER);
      let b = u.b;
      if (silent) {
        // an alif with the small circle is read only when you stop on it (ٱلظُّنُونَا۠)
        if (has(ROUND_ZERO) && b === 'ا' && i === U.length - 1 && lastTok()) lastTok().waqfA = true;
        continue;
      }
      if (has(HAMZA_ABOVE) || has(HAMZA_BELOW)) b = 'ء';

      if (b === 'ـ') {
        if (dag) lengthen(T, 'a');
        if (has(SMALL_HIGH_YAA)) lengthen(T, 'i');                      // ٱلنَّبِيِّـۧنَ: nabiyyīn
        if (has(SMALL_HIGH_NOON)) T.push({ c: 'noon', v: null });        // نُـۨجِي: nunjī
        continue;
      }
      if (b === 'ٱ') {
        if (i === 0 && first) {
          const helper = U[1] && U[1].b === 'ل' ? 'a' : (U[2] && U[2].m.includes(D) ? 'u' : 'i');
          T.push({ c: null, v: helper, helper: true });
        }
        continue;
      }
      if (b === 'ا') {
        const t = lastTok();
        if (t && t.tan) continue;                               // seat of tanween fatḥ
        if (t && t.v === 'a') { t.long = true; continue; }      // long ā
        if (t && t.long) continue;
        T.push({ c: null, v: 'a', long: true });
        continue;
      }
      if (b === 'آ') { T.push({ c: 'hamza', v: 'a', long: true }); continue; }
      if (b === 'ى' && (dag || !v)) { lengthen(T, 'a'); continue; }
      if (b === 'و' && dag && !v) { lengthen(T, 'a'); continue; }       // ṣalāh: waaw read as ā
      if ((b === 'و' || b === 'ي') && !v && !shad && !suk) {
        const t = lastTok();
        const want = b === 'و' ? 'u' : 'i';
        if (t && t.v === want && !t.tan) { t.long = true; continue; }
      }
      const c = CONS[b];
      if (!c) continue;
      const unmarked = !v && !suk && !shad && !dag;
      // lam of the article (or of Allah / alladhī) merging into a doubled letter: silent
      if (b === 'ل' && unmarked && U[i + 1] && U[i + 1].m.includes(SHADDA)) {
        sunNext = !!(U[i - 1] && U[i - 1].b === 'ٱ');
        continue;
      }
      const tok = { c, v, dbl: shad, tan };
      if (sunNext) { tok.sun = true; sunNext = false; }
      if (b === 'ل' && suk && U[i - 1] && U[i - 1].b === 'ٱ') tok.art = true;
      if (b === 'ن' && has(MEEM_HIGH) && !v) tok.c = 'meem';   // noon iqlab
      if (dag) { tok.v = 'a'; tok.long = true; }
      // the name Allah (ٱللَّه, لِلَّه): the mushaf leaves its long ā unwritten
      if (b === 'ل' && shad && v === 'a' && U[i + 1] && U[i + 1].b === 'ه' && U[i - 1] && U[i - 1].b === 'ل') tok.long = true;
      if (has(SMALL_WAW) || has(SMALL_YAA)) { tok.long = true; tok.silah = true; }
      T.push(tok);
    }
    return T;
  }
  function lengthen(T, vowel) {
    const t = T[T.length - 1];
    if (t) { if (!t.v) t.v = vowel; t.long = true; }
    else T.push({ c: null, v: vowel, long: true });
  }

  /* Stop at the end of a verse */
  function waqf(T) {
    const L = T[T.length - 1];
    if (!L) return;
    if (L.c === 'taM') { L.v = null; L.tan = null; L.long = false; L.c = 'haa'; L.taH = true; return; }
    if (L.tan) {
      if (L.v === 'a') { L.long = true; } else L.v = null;
      L.tan = null;
      return;
    }
    if (L.silah) { L.v = null; L.long = false; return; }
    if (L.waqfA) { L.v = 'a'; L.long = true; return; }
    if (L.v && !L.long) L.v = null;
  }

  function render(T, scheme, wordStart) {
    const S = SPELL[scheme];
    let out = '';
    let firstCons = true;
    let prev = null;
    for (const t of T) {
      let cons = '';
      if (t.c) {
        cons = S[t.c];
        if (t.c === 'hamza' && (firstCons && wordStart)) cons = '';
        if (prev && prev.art && t.c === 'hamza') cons = '';
        // diphthongs: aw / ay  (Portuguese: au / ai)
        if ((t.c === 'waaw' || t.c === 'yaa') && !t.v && !t.dbl && prev && prev.v === 'a' && !prev.long && !prev.tan && scheme === 'pt') {
          cons = t.c === 'waaw' ? 'u' : 'i';
        }
        if (t.dbl) cons = t.sun && t.c !== 'laam' ? cons + '-' + cons : cons + cons;
        firstCons = false;
      }
      let vow = '';
      if (t.v) {
        if (scheme === 'pt') {
          const heavy = t.c && HEAVY.has(t.c) && t.v === 'a';
          vow = t.long ? { a: heavy ? 'ó' : 'á', i: 'í', u: 'ú' }[t.v] : (heavy ? 'o' : t.v);
        } else vow = t.long ? { a: 'ā', i: 'ī', u: 'ū' }[t.v] : t.v;
      }
      let tan = '';
      if (t.tan) tan = t.tanAssim != null ? t.tanAssim : (t.tan === 'm' ? 'm' : 'n') + (t.tanWasl ? 'i' : '');
      out += cons + vow + tan + (t.art ? '-' : '');
      prev = t;
    }
    return out;
  }

  /* words: the Arabic words of one verse → transliteration per word */
  Q.verseTranslit = function (words, scheme = 'en') {
    const toks = words.map((w, i) => tokens(w, i === 0));
    // links between words
    for (let i = 0; i < toks.length - 1; i++) {
      const cur = toks[i], nxt = toks[i + 1];
      const last = cur[cur.length - 1];
      const nextStartsWasl = units(words[i + 1])[0]?.b === 'ٱ';
      if (!last) continue;
      if (nextStartsWasl) {
        if (last.long && !last.tan && !last.silah) last.long = false;   // long vowel shortens before waṣl
        if (last.silah) { last.long = false; }
        if (last.tan) last.tanWasl = true;                               // tanween takes a helping i
        continue;
      }
      const head = nxt[0];
      if (!head || !head.dbl || !head.c) continue;
      if (last.tan) { last.tanAssim = SPELL[scheme][head.c]; head.dbl = false; }
      else if (!last.v && (last.c === 'noon' || last.c === head.c)) { last.c = head.c; head.dbl = false; }
    }
    // a verse never starts doubled (that shadda belongs to the previous verse's last word)
    if (toks[0] && toks[0][0] && toks[0][0].dbl && toks[0][0].c) toks[0][0].dbl = false;
    if (toks.length) waqf(toks[toks.length - 1]);
    return toks.map((T, i) => disjoined(words[i], scheme) || render(T, scheme, true));
  };

  /* The disjoined letters that open 29 surahs (الٓمٓ, حمٓ, يسٓ…) are recited by their names */
  const DISJOINED = {
    'الم': ['alif', 'laam', 'meem'], 'المص': ['alif', 'laam', 'meem', 'Saad'], 'الر': ['alif', 'laam', 'raa'],
    'المر': ['alif', 'laam', 'meem', 'raa'], 'كهيعص': ['kaaf', 'haa', 'yaa', 'ayn', 'Saad'], 'طه': ['Taa', 'haa'],
    'طسم': ['Taa', 'seen', 'meem'], 'طس': ['Taa', 'seen'], 'يس': ['yaa', 'seen'], 'ص': ['Saad'], 'حم': ['Haa', 'meem'],
    'عسق': ['ayn', 'seen', 'qaaf'], 'ق': ['qaaf'], 'ن': ['noon'],
  };
  const SAY_EN = { alif: 'alif', laam: 'lām', meem: 'mīm', Saad: 'ṣād', raa: 'rā', kaaf: 'kāf', haa: 'hā', yaa: 'yā', ayn: 'ʿain', Taa: 'ṭā', seen: 'sīn', Haa: 'ḥā', qaaf: 'qāf', noon: 'nūn' };
  function disjoined(word, scheme) {
    const bare = word.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
    const ids = DISJOINED[bare];
    if (!ids || !(word.includes('\u0653') || bare === 'طه')) return null;
    return ids.map(id => scheme === 'pt' && Q.PT && Q.PT[id] ? Q.PT[id].name.toLowerCase() : SAY_EN[id]).join('-');
  }
})(window.Q = window.Q || {});
