/* Huruf — Quran data and recitation audio.
   Text and translations ship with the site (data/quran). Audio streams from public Quran CDNs:
   per-verse files from Quran.com (with word timings, when its API answers) or EveryAyah. */
(function (Q) {
  'use strict';

  const pad = (n, l = 3) => String(n).padStart(l, '0');

  Q.RECITERS = [
    { id: 'husary', label: 'Al-Ḥuṣarī', sub: 'Murattal · steady pace', everyayah: 'Husary_128kbps', qcom: 6 },
    { id: 'muallim', label: 'Al-Ḥuṣarī · teaching', sub: 'Muʿallim · slow, made for learners', everyayah: 'Husary_Muallim_128kbps' },
  ];
  Q.RECITER = Object.fromEntries(Q.RECITERS.map(r => [r.id, r]));
  Q.BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

  /* Suggested first surahs for a new Muslim: needed for prayer, short, very common */
  Q.STARTER_SURAHS = [1, 112, 113, 114, 108, 103, 110, 109, 111, 106, 105, 107];

  const docs = {};
  const quran = Q.quran = {
    index: null,
    async loadIndex() {
      if (!quran.index) {
        const res = await fetch('data/quran/index.json');
        if (!res.ok) throw new Error('Could not load the surah list');
        quran.index = await res.json();
      }
      return quran.index;
    },
    meta(n) { return (quran.index || []).find(x => x.n === n) || null; },
    async load(n) {
      if (docs[n]) return docs[n];
      const res = await fetch(`data/quran/${n}.json`);
      if (!res.ok) throw new Error('Could not load this surah');
      const doc = await res.json();
      doc.verses.forEach((v, i) => { v.n = i + 1; v.key = n + ':' + (i + 1); v.words = v.ar.split(' '); });
      doc._tr = {};
      docs[n] = doc;
      return doc;
    },
    /* transliteration of one verse, per word, in the current scheme */
    translit(doc, v) {
      const sc = Q.SCHEME === 'en' ? 'en' : 'pt';
      const cache = doc._tr[sc] || (doc._tr[sc] = {});
      return cache[v] || (cache[v] = Q.verseTranslit(doc.verses[v - 1].words, sc));
    },
    basmalaTranslit() { return Q.verseTranslit(Q.BASMALA.split(' '), Q.SCHEME === 'en' ? 'en' : 'pt'); },
    name(doc) { return Q.SCHEME === 'en' ? doc.en : doc.pt; },
    translation(v) { return Q.SCHEME === 'en' ? v.en : v.pt; },
    /* first-letter cue for a hidden word */
    cue(text, arabic) {
      if (arabic) {
        // first letter you actually hear: skip the silent alif of waṣl and the article's lam
        let letters = [...text].filter(ch => /[ء-يٱ]/.test(ch));
        if (letters[0] === 'ٱ') { letters = letters.slice(1); if (letters[0] === 'ل' && letters.length > 2) letters = letters.slice(1); }
        return (letters[0] || text[0]) + 'ـ';
      }
      const m = text.match(/^[^a-zA-Zʿ'ḥṣḍṭẓáíúāīū]*([a-zA-Zʿ'ḥṣḍṭẓáíúāīū])/);
      return (m ? m[0] : text[0]) + '…';
    },
  };

  /* ---------- word timings (Quran.com), cached per chapter ---------- */
  const timingMem = {};
  async function timings(n, reciter) {
    const r = Q.RECITER[reciter];
    if (!r || !r.qcom) return null;
    const key = `huruf.qt.${r.qcom}.${n}`;
    if (timingMem[key] !== undefined) return timingMem[key];
    const cached = Q.storage.get(key, null);
    if (cached && Date.now() - cached.t < 30 * 86400000) return (timingMem[key] = cached.d);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://api.quran.com/api/v4/recitations/${r.qcom}/by_chapter/${n}?per_page=300&fields=segments`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const d = {};
      (json.audio_files || []).forEach(f => {
        const v = Number(String(f.verse_key).split(':')[1]);
        let url = f.url || '';
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url && !/^https?:/.test(url)) url = 'https://verses.quran.com/' + url;
        d[v] = { url, seg: normSegments(f.segments) };
      });
      timingMem[key] = Object.keys(d).length ? d : null;
      if (timingMem[key]) Q.storage.set(key, { t: Date.now(), d: timingMem[key] });
    } catch (e) {
      timingMem[key] = null;   // offline, blocked or no data: per-verse audio still works
    }
    return timingMem[key];
  }
  function normSegments(seg) {
    if (!Array.isArray(seg) || !seg.length) return null;
    const rows = seg.filter(s => Array.isArray(s) && s.length >= 3);
    if (!rows.length) return null;
    const four = rows[0].length >= 4;
    const zeroBased = rows.some(s => s[0] === 0);
    return rows.map(s => ({
      w: s[0] - (zeroBased ? 0 : 1),
      start: four ? s[2] : s[1],
      end: four ? s[3] : s[2],
    })).filter(s => s.w >= 0 && s.end > s.start);
  }

  function everyAyah(r, n, v) { return `https://everyayah.com/data/${r.everyayah}/${pad(n)}${pad(v)}.mp3`; }

  /* ---------- player ---------- */
  /* One shared audio element. play() resolves when the clip ends, rejects with 'stopped' if cut short. */
  const audio = new Audio();
  audio.preload = 'auto';
  let current = null;     // { resolve, reject, end, onWord, seg, raf }
  let rate = 1;

  function finish(ok) {
    if (!current) return;
    const c = current;
    current = null;
    cancelAnimationFrame(c.raf);
    if (c.onWord) c.onWord(-1);
    ok ? c.resolve() : c.reject(new Error('stopped'));
  }
  audio.addEventListener('ended', () => finish(true));
  audio.addEventListener('timeupdate', () => {
    if (current && current.end != null && audio.currentTime >= current.end) { audio.pause(); finish(true); }
  });

  function track() {
    if (!current) return;
    const t = audio.currentTime * 1000;
    if (current.end != null && audio.currentTime >= current.end) { audio.pause(); finish(true); return; }
    if (current.seg && current.onWord) {
      let w = -1;
      for (const s of current.seg) if (t >= s.start - 30 && t < s.end) { w = s.w; break; }
      if (w !== current.lastW) { current.lastW = w; current.onWord(w); }
    }
    current.raf = requestAnimationFrame(track);
  }

  function playSrc(srcs, { start = 0, end = null, seg = null, onWord = null } = {}) {
    stop();
    return new Promise((resolve, reject) => {
      current = { resolve, reject, end, seg, onWord, lastW: -2, raf: 0 };
      const mine = current;
      let i = 0;
      const tryNext = () => {
        if (current !== mine) return;
        if (i >= srcs.length) { current = null; reject(new Error('audio-unavailable')); return; }
        const src = srcs[i++];
        audio.onerror = () => tryNext();
        audio.src = src;
        audio.playbackRate = rate;
        const go = () => {
          if (current !== mine) return;
          try { if (start) audio.currentTime = start; } catch (e) { /* not seekable yet */ }
          audio.play().then(() => { mine.raf = requestAnimationFrame(track); }).catch(err => {
            if (current !== mine) return;
            if (err && err.name === 'NotAllowedError') { current = null; reject(err); }
            else tryNext();
          });
        };
        if (start) audio.addEventListener('loadedmetadata', go, { once: true }); else go();
      };
      tryNext();
    });
  }

  function stop() {
    audio.onerror = null;
    if (!audio.paused) audio.pause();
    finish(false);
  }

  Q.audio = {
    el: audio,
    setRate(r) { rate = r; audio.playbackRate = r; },
    stop,
    get playing() { return !!current && !audio.paused; },
    pause() { audio.pause(); },
    resume() { return audio.play(); },
    /* play one verse; onWord(index) fires as words are recited (when timings exist) */
    async verse(n, v, reciterId, onWord) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      const t = await timings(n, r.id);
      const srcs = [];
      if (t && t[v] && t[v].url) srcs.push(t[v].url);
      srcs.push(everyAyah(r, n, v));
      if (r.qcom && !(t && t[v])) srcs.push(`https://verses.quran.com/Husary/mp3/${pad(n)}${pad(v)}.mp3`);
      return playSrc(srcs, { seg: t && t[v] ? t[v].seg : null, onWord });
    },
    basmala(reciterId) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      return playSrc([everyAyah(r, 1, 1), `https://verses.quran.com/Husary/mp3/001001.mp3`]);
    },
    /* one word: Husary's own voice when timings exist, otherwise Quran.com's word audio */
    async word(n, v, w, reciterId) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      const t = await timings(n, r.id);
      const s = t && t[v] && t[v].seg && t[v].seg.find(x => x.w === w);
      if (s && t[v].url) return playSrc([t[v].url], { start: Math.max(0, s.start - 40) / 1000, end: (s.end + 60) / 1000 });
      return playSrc([`https://audio.qurancdn.com/wbw/${pad(n)}_${pad(v)}_${pad(w + 1)}.mp3`]);
    },
    hasWordTimings(n, reciterId) { const t = timingMem[`huruf.qt.${(Q.RECITER[reciterId] || {}).qcom}.${n}`]; return !!(t && Object.values(t).some(x => x.seg)); },
    lastDuration() { return isFinite(audio.duration) ? audio.duration : 0; },
  };

  /* cancellable pause, e.g. "your turn to repeat" */
  Q.wait = function (ms, token) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (token) token.onCancel = () => { clearTimeout(t); reject(new Error('stopped')); };
    });
  };
})(window.Q = window.Q || {});
