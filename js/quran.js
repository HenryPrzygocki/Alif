/* Alif — Quran data and recitation audio.
   Text and translations ship with the site (data/quran). Audio streams from public Quran CDNs:
   per-verse files from Quran.com (with word timings, when its API answers) or EveryAyah. */
(function (Q) {
  'use strict';

  const pad = (n, l = 3) => String(n).padStart(l, '0');

  Q.RECITERS = [
    { id: 'husary', label: 'Al-Ḥuṣarī', sub: 'Murattal · steady pace', everyayah: 'Husary_128kbps', qcom: 6 },
    { id: 'muallim', label: 'Al-Ḥuṣarī · teaching', sub: 'Muʿallim · slow, made for learners', everyayah: 'Husary_Muallim_128kbps', qcom: 12 },
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
        const res = await fetch(Q.asset('data/quran/index.json'));
        if (!res.ok) throw new Error('Could not load the surah list');
        quran.index = await res.json();
      }
      return quran.index;
    },
    meta(n) { return (quran.index || []).find(x => x.n === n) || null; },
    async load(n) {
      if (docs[n]) return docs[n];
      const res = await fetch(Q.asset(`data/quran/${n}.json`));
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
    /* translations follow their own language setting, separate from the transliteration spelling */
    lang() { return (Q.store.qPrefs().transLang === 'pt') ? 'pt' : 'en'; },
    name(doc) { return quran.lang() === 'pt' ? doc.pt : doc.en; },
    metaName(meta) { return quran.lang() === 'pt' ? meta.pt : meta.en; },
    translation(v) { return quran.lang() === 'pt' ? v.pt : v.en; },
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

  /* ---------- word timings (Quran.com), cached per chapter ----------
     1. api.quran.com v4: per-verse files, sometimes with word segments
     2. api.qurancdn.com (what Quran.com's own player uses): whole-surah file + verse and word timings
     Whatever answers is used; without either, per-verse audio from EveryAyah still plays. */
  const timingMem = {};
  const fetchJSON = async (url, ms = 7000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  };
  const hasSeg = d => !!(d && Object.values(d).some(x => x.seg && x.seg.length));

  async function timings(n, reciter) {
    const r = Q.RECITER[reciter];
    if (!r || !r.qcom) return null;
    const key = `huruf.qt2.${r.qcom}.${n}`;
    if (timingMem[key] !== undefined) return timingMem[key];
    const cached = Q.storage.get(key, null);
    if (cached && Date.now() - cached.t < 30 * 86400000) return (timingMem[key] = cached.d);
    timingMem[key] = null;
    let d = null;
    try {
      const json = await fetchJSON(`https://api.quran.com/api/v4/recitations/${r.qcom}/by_chapter/${n}?per_page=300&fields=segments`);
      d = {};
      (json.audio_files || []).forEach(f => {
        const v = Number(String(f.verse_key).split(':')[1]);
        let url = f.url || '';
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url && !/^https?:/.test(url)) url = 'https://verses.quran.com/' + url;
        d[v] = { url, seg: normSegments(f.segments, 0) };
      });
      if (!Object.keys(d).length) d = null;
    } catch (e) { d = null; }
    if (!hasSeg(d)) {
      try {
        const json = await fetchJSON(`https://api.qurancdn.com/api/qdc/audio/reciters/${r.qcom}/audio_files?chapter=${n}&segments=true`);
        const f = (json.audio_files || [])[0];
        if (f && f.audio_url && Array.isArray(f.verse_timings)) {
          const q = {};
          f.verse_timings.forEach(vt => {
            const v = Number(String(vt.verse_key).split(':')[1]);
            const from = Number(vt.timestamp_from) || 0, to = Number(vt.timestamp_to) || 0;
            q[v] = { url: f.audio_url, start: from / 1000, end: to / 1000, seg: normSegments(vt.segments, from, to) };
          });
          if (hasSeg(q)) d = q;
        }
      } catch (e) { /* not reachable: keep what we have */ }
    }
    timingMem[key] = d;
    if (hasSeg(d)) Q.storage.set(key, { t: Date.now(), d });
    return d;
  }
  /* → [{ w: 0-based word, start, end }] in milliseconds of the audio file */
  function normSegments(seg, from = 0, to = 0) {
    if (!Array.isArray(seg) || !seg.length) return null;
    const rows = seg.filter(s => Array.isArray(s) && s.length >= 3);
    if (!rows.length) return null;
    const four = rows[0].length >= 4;
    const zeroBased = rows.some(s => s[0] === 0);
    let out = rows.map(s => ({
      w: s[0] - (zeroBased ? 0 : 1),
      start: Number(four ? s[2] : s[1]),
      end: Number(four ? s[3] : s[2]),
    })).filter(s => s.w >= 0 && s.end > s.start);
    // timings given relative to the verse inside a whole-surah file: shift them
    if (from > 0 && out.length && Math.max(...out.map(s => s.end)) <= (to - from) + 80) out = out.map(s => ({ w: s.w, start: s.start + from, end: s.end + from }));
    return out.length ? out : null;
  }

  function everyAyah(r, n, v) { return `https://everyayah.com/data/${r.everyayah}/${pad(n)}${pad(v)}.mp3`; }

  /* rough length of each word, for spreading words over a clip that has no timings */
  function wordWeights(words) { return words.map(w => [...w].filter(ch => /[ء-يٱ]/.test(ch)).length + 1); }

  /* ---------- player ----------
     One shared audio element. A clip is { src, start, end, seg }; play() takes a list of clips to try
     in order and resolves when the clip ends (rejects with 'stopped' if cut short). */
  const audio = new Audio();
  audio.preload = 'auto';
  let current = null;
  let rate = 1;
  let lastClip = 0;

  function finish(ok) {
    if (!current) return;
    const c = current;
    current = null;
    cancelAnimationFrame(c.raf);
    if (ok) lastClip = Math.max(0, (c.end != null ? Math.min(audio.currentTime, c.end) : audio.currentTime) - (c.start || 0));
    if (c.onWord) c.onWord(-1, 0);
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
    let seg = current.seg;
    // no timings: spread the words over the clip by their length, so the sweep still moves word by word
    if (!seg && current.est && current.onWord && isFinite(audio.duration) && audio.duration > 0) {
      const from = (current.start || 0) * 1000, to = (current.end != null ? current.end : audio.duration) * 1000;
      const total = current.est.reduce((a, b) => a + b, 0) || 1;
      let at = from;
      seg = current.seg = current.est.map((len, i) => { const d = (to - from) * len / total; const s = { w: i, start: at, end: at + d }; at += d; return s; });
    }
    if (seg && current.onWord) {
      let w = -1, p = 0;
      for (const s of seg) {
        if (t >= s.start - 30 && t < s.end) { w = s.w; p = Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start))); break; }
      }
      if (w !== current.lastW || Math.abs(p - current.lastP) > 0.02) { current.lastW = w; current.lastP = p; current.onWord(w, p); }
    }
    current.raf = requestAnimationFrame(track);
  }

  function play(clips, onWord = null) {
    stop();
    return new Promise((resolve, reject) => {
      current = { resolve, reject, onWord, lastW: -2, lastP: 0, raf: 0, start: 0, end: null, seg: null, est: null };
      const mine = current;
      let i = 0;
      const tryNext = () => {
        if (current !== mine) return;
        if (i >= clips.length) { current = null; reject(new Error('audio-unavailable')); return; }
        const clip = clips[i++];
        Object.assign(mine, { start: clip.start || 0, end: clip.end != null ? clip.end : null, seg: clip.seg || null, est: clip.est || null });
        audio.onerror = () => tryNext();
        if (audio.src !== clip.src) audio.src = clip.src;
        audio.playbackRate = rate;
        const go = () => {
          if (current !== mine) return;
          try { audio.currentTime = mine.start; } catch (e) { /* not seekable yet */ }
          audio.play().then(() => { mine.raf = requestAnimationFrame(track); }).catch(err => {
            if (current !== mine) return;
            if (err && err.name === 'NotAllowedError') { current = null; reject(err); }
            else tryNext();
          });
        };
        if (mine.start && audio.readyState < 1) audio.addEventListener('loadedmetadata', go, { once: true }); else go();
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
    /* play one verse; onWord(index, progress 0–1 inside the word) fires as words are recited */
    async verse(n, v, reciterId, onWord) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      const t = await timings(n, r.id);
      const est = docs[n] && docs[n].verses[v - 1] ? wordWeights(docs[n].verses[v - 1].words) : null;
      const clips = [];
      if (t && t[v] && t[v].url) clips.push({ src: t[v].url, start: t[v].start, end: t[v].end, seg: t[v].seg, est });
      clips.push({ src: everyAyah(r, n, v), est });
      if (r.id === 'husary') clips.push({ src: `https://verses.quran.com/Husary/mp3/${pad(n)}${pad(v)}.mp3`, est });
      return play(clips, onWord);
    },
    /* the Bismillah before a surah: Al-Fātiḥah's first verse, with its word timings */
    async basmala(reciterId, onWord) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      const t = await timings(1, r.id);
      const est = wordWeights(Q.BASMALA.split(' '));
      const clips = [];
      if (t && t[1] && t[1].url) clips.push({ src: t[1].url, start: t[1].start, end: t[1].end, seg: t[1].seg, est });
      clips.push({ src: everyAyah(r, 1, 1), est });
      if (r.id === 'husary') clips.push({ src: 'https://verses.quran.com/Husary/mp3/001001.mp3', est });
      return play(clips, onWord);
    },
    /* one word: Quran.com's own recording of that word (clearer than a cut from the verse);
       a cut from the reciter's verse only if that recording is missing. No highlight sweep. */
    async word(n, v, w, reciterId) {
      const r = Q.RECITER[reciterId] || Q.RECITERS[0];
      const clips = [{ src: `https://audio.qurancdn.com/wbw/${pad(n)}_${pad(v)}_${pad(w + 1)}.mp3` }];
      const t = await timings(n, r.id);
      const s = t && t[v] && t[v].seg && t[v].seg.find(x => x.w === w);
      if (s && t[v].url) clips.push({ src: t[v].url, start: Math.max(0, s.start - 40) / 1000, end: (s.end + 60) / 1000 });
      return play(clips);
    },
    /* 'word' when Quran.com timings were found for this surah, 'verse' otherwise, null before the first try */
    following(n, reciterId) {
      const r = Q.RECITER[reciterId] || {};
      const t = timingMem[`huruf.qt2.${r.qcom}.${n}`];
      if (!r.qcom) return 'verse';
      if (t === undefined) return null;
      return hasSeg(t) ? 'word' : 'verse';
    },
    lastDuration() { return lastClip || (isFinite(audio.duration) ? audio.duration : 0); },
  };

  /* cancellable pause, e.g. "your turn to repeat" */
  Q.wait = function (ms, token) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (token) token.onCancel = () => { clearTimeout(t); reject(new Error('stopped')); };
    });
  };
})(window.Q = window.Q || {});
