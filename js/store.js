/* Huruf — saved progress and the stats derived from it.
   Everything is stored in this browser (localStorage). Use Setup → Export to back it up. */
(function (Q) {
  'use strict';

  const KEY = 'huruf.v1';
  const HIST_LEN = 12;      // how many recent attempts per letter feed "mastery"

  function fresh() {
    return {
      v: 1,
      createdAt: Date.now(),
      settings: { goal: 150, font: 'hafs', theme: 'system', ramadan: '', iqraBook: 1, iqraPage: '', translit: 'pt' },
      practice: {
        mode: 'sounds', groups: Q.GROUPS.map(g => g.id), marks: ['a'], rowLen: 4, words: 2,
        rounds: 12, focusWeak: true, lookalikes: true, showKeys: true, hideSetup: false,
      },
      letters: {},     // id -> { n, w, last, hist }
      modes: {},       // mode -> { n, w }
      ml: {},          // "mode:letter" -> [n, w]
      syl: {},         // "letter:vowel" -> [n, w]
      conf: {},        // "target>picked" -> count   (from Spot the letter)
      days: {},        // YYYY-MM-DD -> { n, w, ms, rounds, rMs, rUnits }
      sessions: [],    // { t, mode, n, w, ms }
      draft: '',
    };
  }

  function merge(base, saved) {
    const out = Object.assign(base, saved);
    out.settings = Object.assign(fresh().settings, saved.settings || {});
    out.practice = Object.assign(fresh().practice, saved.practice || {});
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

    streak() {
      let cur = 0, best = 0, run = 0;
      const keys = Object.keys(S.days).filter(k => S.days[k].n > 0).sort();
      let prev = null;
      for (const k of keys) {
        const d = Q.parseDay(k);
        run = prev && Q.daysBetween(prev, d) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = d;
      }
      // current streak: ends today, or yesterday if today isn't done yet
      let day = new Date();
      if (!(S.days[Q.dayKey(day)] || {}).n) day = Q.addDays(day, -1);
      while ((S.days[Q.dayKey(day)] || {}).n) { cur++; day = Q.addDays(day, -1); }
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
      if (!data || typeof data !== 'object' || !data.v) throw new Error('This file is not a Huruf backup.');
      S = merge(fresh(), data);
      store.save(true);
    },
    reset() { S = fresh(); store.save(true); },
  };
})(window.Q = window.Q || {});
