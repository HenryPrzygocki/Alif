/* Alif — saved progress and the stats derived from it.
   Everything is stored in this browser (localStorage). Use Setup → Export to back it up. */
(function (Q) {
  'use strict';

  // The site was first called Huruf. The storage keys keep that name so saved progress carries over.
  const KEY = 'huruf.v1';
  const HIST_LEN = 12;      // how many recent attempts per letter feed "mastery"

  function fresh() {
    return {
      v: 1,
      createdAt: Date.now(),
      settings: { goal: 150, font: 'hafs', theme: 'system', ramadan: '', iqraBook: 1, iqraPage: '', translit: 'en' },
      practice: {
        mode: 'sounds', groups: Q.GROUPS.map(g => g.id), marks: ['a'], rowLen: 4, words: 2,
        rounds: 12, focusWeak: true, lookalikes: true, showKeys: true, showSetup: false, focus: 'all',
      },
      letters: {},     // id -> { n, w, last, hist }
      modes: {},       // mode -> { n, w }
      ml: {},          // "mode:letter" -> [n, w]
      syl: {},         // "letter:vowel" -> [n, w]
      conf: {},        // "target>picked" -> count   (from Spot the letter)
      days: {},        // YYYY-MM-DD -> { n, w, ms, rounds, rMs, rUnits }
      sessions: [],    // { t, mode, n, w, ms }
      draft: '',
      quran: freshQuran(),
    };
  }
  function freshQuran() {
    return {
      list: [],        // surahs you are learning, most recent first
      v: {},           // "surah:verse" -> { s: stage 1-6, due: YYYY-MM-DD, n: reviews, miss: lapses, last }
      prefs: { text: 'translit', meaning: false, trans: true, reciter: 'husary', speed: 1, repeat: 1, gap: false, loop: false, basmala: true, transLang: 'en', remind: true },
      done: {},        // surah -> { at } when you said "I've memorized this surah"
      last: null,      // { n, tab, verse }
    };
  }
  // days until the next review, by stage
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

  function merge(base, saved) {
    const out = Object.assign(base, saved);
    out.settings = Object.assign(fresh().settings, saved.settings || {});
    out.practice = Object.assign(fresh().practice, saved.practice || {});
    const q = saved.quran || {};
    out.quran = Object.assign(freshQuran(), q);
    out.quran.prefs = Object.assign(freshQuran().prefs, q.prefs || {});
    out.quran.done = Object.assign({}, q.done || {});
    // before line-by-line memorizing, a verse only counted after two spaced reviews; count what you already learned
    if (!out.quran.memV1) { Object.values(out.quran.v).forEach(r => { if (!r.mem) r.mem = r.last || Date.now(); }); out.quran.memV1 = true; }
    return out;
  }

  let S = merge(fresh(), Q.storage.get(KEY, {}) || {});
  let saveTimer = null;
  const listeners = new Set();

  const store = Q.store = {
    get state() { return S; },
    save(now) {
      clearTimeout(saveTimer);
      if (now) Q.storage.set(KEY, S);
      else saveTimer = setTimeout(() => Q.storage.set(KEY, S), 150);
      listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setSetting(k, v) { S.settings[k] = v; store.save(); },
    setPractice(k, v) { S.practice[k] = v; store.save(); },

    /* ---------- recording ---------- */
    _day() {
      const k = Q.dayKey();
      return S.days[k] || (S.days[k] = { n: 0, w: 0, ms: 0, rounds: 0, rMs: 0, rUnits: 0 });
    },
    _letter(id, wrong) {
      const r = S.letters[id] || (S.letters[id] = { n: 0, w: 0, last: 0, hist: '' });
      r.n++; if (wrong) r.w++;
      r.last = Date.now();
      r.hist = (r.hist + (wrong ? '0' : '1')).slice(-HIST_LEN);
    },
    _bump(map, key, wrong) {
      const r = map[key] || (map[key] = [0, 0]);
      r[0]++; if (wrong) r[1]++;
    },

    /* One row read aloud and self-checked.
       units: [{ letter, vowel?, wrong }] · revealMs: time until reveal · activeMs: whole round */
    recordRound({ mode, units, revealMs, activeMs }) {
      const d = store._day();
      units.forEach(u => {
        store._letter(u.letter, u.wrong);
        if (u.wrong && u.said && u.said !== u.letter) S.conf[u.letter + '>' + u.said] = (S.conf[u.letter + '>' + u.said] || 0) + 1;
        store._bump(S.ml, mode + ':' + u.letter, u.wrong);
        if (u.vowel) store._bump(S.syl, u.letter + ':' + u.vowel, u.wrong);
        d.n++; if (u.wrong) d.w++;
      });
      const m = S.modes[mode] || (S.modes[mode] = { n: 0, w: 0 });
      m.n += units.length; m.w += units.filter(u => u.wrong).length;
      d.rounds++;
      d.ms += Math.min(activeMs || 0, 90000);
      if (revealMs && revealMs < 60000) { d.rMs += revealMs; d.rUnits += units.length; }
      store.save();
    },

    /* One quiz question checked by the site.
       A wrong vowel on the right letter counts against the syllable, not the letter. */
    recordQuiz({ mode = 'quiz', target, picked, vowel, pickedVowel, ms }) {
      const letterWrong = target !== picked;
      const wrong = letterWrong || (vowel && vowel !== pickedVowel);
      const d = store._day();
      store._letter(target, letterWrong);
      store._bump(S.ml, mode + ':' + target, wrong);
      if (vowel) store._bump(S.syl, target + ':' + vowel, wrong);
      const m = S.modes[mode] || (S.modes[mode] = { n: 0, w: 0 });
      m.n++; if (wrong) m.w++;
      d.n++; if (wrong) d.w++;
      d.rounds++;
      d.ms += Math.min(ms || 0, 60000);
      if (letterWrong) S.conf[target + '>' + picked] = (S.conf[target + '>' + picked] || 0) + 1;
      store.save();
      return wrong;
    },

    recordSession(sess) {
      if (!sess.n) return;
      S.sessions.push(Object.assign({ t: Date.now() }, sess));
      if (S.sessions.length > 400) S.sessions = S.sessions.slice(-400);
      store.save();
    },

    /* ---------- derived stats ---------- */
    mastery(id) {
      const r = S.letters[id];
      if (!r || !r.n) return null;
      const ok = [...r.hist].filter(c => c === '1').length;
      const recent = (ok + 1) / (r.hist.length + 2);           // smoothed recent accuracy
      const confidence = Math.min(1, 0.5 + r.n / 16);          // new letters can't be "solid" yet
      return recent * confidence;
    },
    level(id) {
      const m = store.mastery(id);
      if (m == null) return 0;
      if (m < 0.45) return 1;
      if (m < 0.65) return 2;
      if (m < 0.8) return 3;
      if (m < 0.9) return 4;
      return 5;
    },
    LEVELS: ['New', 'Struggling', 'Shaky', 'Getting there', 'Good', 'Solid'],

    /* Higher weight = shown more often */
    weight(id) {
      const r = S.letters[id];
      const m = store.mastery(id);
      let w = 0.5 + 3 * (1 - (m == null ? 0.35 : m));
      if (!r || !r.n) w += 1.2;
      else w += Math.min(1.5, ((Date.now() - r.last) / 86400000) * 0.3);
      return w;
    },

    weakest(n = 5, minSeen = 3) {
      return Q.LETTERS
        .filter(l => (S.letters[l.id] || {}).n >= minSeen)
        .map(l => ({ l, m: store.mastery(l.id), r: S.letters[l.id] }))
        .sort((a, b) => a.m - b.m)
        .slice(0, n);
    },

    accuracy(id) {
      const r = S.letters[id];
      return r && r.n ? 1 - r.w / r.n : null;
    },

    totals() {
      let n = 0, w = 0, ms = 0, rMs = 0, rUnits = 0, days = 0;
      for (const d of Object.values(S.days)) {
        n += d.n; w += d.w; ms += d.ms; rMs += d.rMs || 0; rUnits += d.rUnits || 0;
        if (d.n) days++;
      }
      return { n, w, ms, days, acc: n ? 1 - w / n : null, secPer: rUnits ? rMs / rUnits / 1000 : null };
    },

    today() {
      return S.days[Q.dayKey()] || { n: 0, w: 0, ms: 0, rounds: 0, rMs: 0, rUnits: 0 };
    },

    /* ---------- Quran memorization ---------- */
    qPrefs() { return S.quran.prefs; },
    setQPref(k, v) { S.quran.prefs[k] = v; store.save(); },
    qAdd(n) {
      S.quran.list = [n, ...S.quran.list.filter(x => x !== n)];
      store.save();
    },
    qRemove(n) { S.quran.list = S.quran.list.filter(x => x !== n); store.save(); },
    qSetLast(last) { S.quran.last = Object.assign({}, S.quran.last, last); store.save(); },
    qVerse(key) { return S.quran.v[key] || null; },
    /* Memorized means you learned it (line by line) or said so. Revision keeps it fresh;
       a slip in revision brings the verse back sooner but never takes "memorized" away. */
    qStatus(key) {
      const r = S.quran.v[key];
      if (!r) return 'new';
      return r.mem || r.s >= 3 ? 'memorized' : 'learning';
    },
    /* a verse finished in the Learn coach */
    qLearned(key) {
      const r = S.quran.v[key] || (S.quran.v[key] = { s: 1, due: Q.dayKey(Q.addDays(new Date(), 1)), n: 0, miss: 0, last: Date.now() });
      if (!r.mem) { r.mem = Date.now(); store._day().q = (store._day().q || 0) + 1; }
      S.quran.list = [Number(key.split(':')[0]), ...S.quran.list.filter(x => x !== Number(key.split(':')[0]))];
      store.save();
    },
    /* "I've memorized this surah": every verse counts, first revision in a few days */
    qMemorizeSurah(n, count) {
      for (let v = 1; v <= count; v++) {
        const key = n + ':' + v;
        const r = S.quran.v[key] || (S.quran.v[key] = { s: 2, due: Q.dayKey(Q.addDays(new Date(), 3)), n: 0, miss: 0, last: Date.now() });
        if (!r.mem) r.mem = Date.now();
      }
      S.quran.done[n] = { at: Date.now() };
      S.quran.list = [n, ...S.quran.list.filter(x => x !== n)];
      store.save();
    },
    qUnmemorizeSurah(n, count) {
      for (let v = 1; v <= count; v++) delete S.quran.v[n + ':' + v];
      delete S.quran.done[n];
      store.save();
    },
    qDone(n) { return S.quran.done[n] || null; },
    remindOn() { return S.quran.prefs.remind !== false; },
    /* surahs with verses due for revision, with how many and when you last recited them */
    qReviseList(onDay = Q.dayKey()) {
      if (!store.remindOn()) return [];
      const by = {};
      for (const [k, r] of Object.entries(S.quran.v)) {
        const n = Number(k.split(':')[0]);
        const g = by[n] || (by[n] = { n, due: 0, last: 0 });
        if (r.due <= onDay) g.due++;
        g.last = Math.max(g.last, r.last || 0);
      }
      return Object.values(by).filter(g => g.due > 0).sort((a, b) => a.last - b.last);
    },
    /* grade a recall: 'again' | 'hard' | 'good' */
    qGrade(key, grade) {
      const r = S.quran.v[key] || (S.quran.v[key] = { s: 0, due: Q.dayKey(), n: 0, miss: 0, last: 0 });
      r.n++; r.last = Date.now();
      if (grade === 'again') { r.s = 1; r.miss++; r.due = Q.dayKey(Q.addDays(new Date(), 1)); }
      else if (grade === 'hard') { r.s = Math.max(1, r.s); r.due = Q.dayKey(Q.addDays(new Date(), Math.max(1, Math.floor(INTERVALS[r.s] / 2)))); }
      else { r.s = Math.min(6, r.s + 1); r.due = Q.dayKey(Q.addDays(new Date(), INTERVALS[r.s])); if (!r.mem) r.mem = Date.now(); }
      const d = store._day();
      d.q = (d.q || 0) + 1;
      if (grade === 'again') d.qw = (d.qw || 0) + 1;
      store.save();
    },
    qDue(onDay = Q.dayKey()) {
      return Object.entries(S.quran.v).filter(([, r]) => r.due <= onDay).map(([k]) => k)
        .sort((a, b) => { const [x1, y1] = a.split(':').map(Number), [x2, y2] = b.split(':').map(Number); return x1 - x2 || y1 - y2; });
    },
    qNextDue() {
      const today = Q.dayKey();
      const future = Object.values(S.quran.v).map(r => r.due).filter(d => d > today).sort();
      return future[0] || null;
    },
    qSummary(n, count) {
      let mem = 0, learning = 0, due = 0;
      const today = Q.dayKey();
      for (let v = 1; v <= count; v++) {
        const r = S.quran.v[n + ':' + v];
        if (!r) continue;
        if (r.mem || r.s >= 3) mem++; else learning++;
        if (r.due <= today) due++;
      }
      return { mem, learning, fresh: count - mem - learning, due, count };
    },
    qTotals() {
      const all = Object.values(S.quran.v);
      return { learned: all.length, memorized: all.filter(r => r.mem || r.s >= 3).length, due: store.qDue().length };
    },

    streak() {
      let cur = 0, best = 0, run = 0;
      const active = d => d && (d.n > 0 || d.q > 0);
      const keys = Object.keys(S.days).filter(k => active(S.days[k])).sort();
      let prev = null;
      for (const k of keys) {
        const d = Q.parseDay(k);
        run = prev && Q.daysBetween(prev, d) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = d;
      }
      // current streak: ends today, or yesterday if today isn't done yet
      let day = new Date();
      if (!active(S.days[Q.dayKey(day)])) day = Q.addDays(day, -1);
      while (active(S.days[Q.dayKey(day)])) { cur++; day = Q.addDays(day, -1); }
      return { cur, best: Math.max(best, cur) };
    },

    /* Last `n` days as [{ key, date, n, w, acc, secPer, ms }] */
    series(n = 30) {
      const out = [];
      const today = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const date = Q.addDays(today, -i), key = Q.dayKey(date), d = S.days[key];
        out.push({
          key, date,
          n: d ? d.n : 0, w: d ? d.w : 0, ms: d ? d.ms : 0,
          acc: d && d.n ? 1 - d.w / d.n : null,
          secPer: d && d.rUnits ? d.rMs / d.rUnits / 1000 : null,
        });
      }
      return out;
    },

    /* Mix-ups as pairs, both directions together: ض→ص and ص→ض count as one pair */
    mixups(n = 8, min = 1) {
      const pairs = {};
      for (const [k, c] of Object.entries(S.conf)) {
        const [a, b] = k.split('>');
        if (!Q.L[a] || !Q.L[b]) continue;
        const [x, y] = Q.L[a].order < Q.L[b].order ? [a, b] : [b, a];
        const key = x + '|' + y;
        const p = pairs[key] || (pairs[key] = { a: x, b: y, count: 0, ab: 0, ba: 0 });
        p.count += c;
        if (a === x) p.ab += c; else p.ba += c;
      }
      return Object.values(pairs).filter(p => p.count >= min).sort((p, q) => q.count - p.count).slice(0, n);
    },
    /* letters you mix this one up with, most frequent first */
    partners(id) {
      return store.mixups(50).filter(p => p.a === id || p.b === id)
        .map(p => ({ id: p.a === id ? p.b : p.a, count: p.count }));
    },
    /* Your weak spots: struggling letters plus the letters you mix them up with.
       Returns { ids, why: { id: reason } }, or ids = [] when there is not enough practice yet. */
    weakSpots(max = 12, allowedIds = null) {
      const why = {};
      const ids = [];
      const ok = id => Q.L[id] && (!allowedIds || allowedIds.includes(id));
      const add = (id, reason) => { if (!ok(id) || ids.length >= max) return; if (!ids.includes(id)) ids.push(id); if (!why[id]) why[id] = reason; };
      const weak = store.weakest(29, 3).filter(x => x.m < 0.7 && ok(x.l.id)).slice(0, 10);
      weak.forEach(({ l }) => {
        add(l.id, store.LEVELS[store.level(l.id)].toLowerCase());
        store.partners(l.id).slice(0, 2).forEach(p => add(p.id, 'you mix it up with ' + l.name));
      });
      store.mixups(6, 2).forEach(p => { add(p.a, 'mixed up with ' + Q.L[p.b].name); add(p.b, 'mixed up with ' + Q.L[p.a].name); });
      return { ids: ids.length >= 2 ? ids : [], why };
    },

    confusions(n = 8) {
      return Object.entries(S.conf)
        .map(([k, c]) => { const [t, p] = k.split('>'); return { target: Q.L[t], picked: Q.L[p], count: c }; })
        .filter(x => x.target && x.picked)
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
    },

    /* ---------- data ---------- */
    exportJSON() { return JSON.stringify(S, null, 1); },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.v) throw new Error('This file is not an Alif backup.');
      S = merge(fresh(), data);
      store.save(true);
    },
    reset() { S = fresh(); store.save(true); },
  };

  // never lose the last few seconds of work when the tab closes
  window.addEventListener('pagehide', () => Q.storage.set(KEY, S));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Q.storage.set(KEY, S); });
})(window.Q = window.Q || {});
