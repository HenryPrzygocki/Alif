/* Huruf — when does Ramadan start?
   Uses the browser's Umm al-Qura (Saudi) Islamic calendar. The real start depends on the
   moon sighting your community follows, so Setup lets you type your own date. */
(function (Q) {
  'use strict';

  let fmt = null;
  try {
    fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (fmt.resolvedOptions().calendar !== 'islamic-umalqura') fmt = null;
  } catch (e) { fmt = null; }

  function hijri(d) {
    const p = {};
    fmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return { y: parseInt(p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) };
  }

  Q.ramadan = function () {
    const today = Q.addDays(new Date(), 0);
    const custom = Q.store.state.settings.ramadan;

    if (custom && /^\d{4}-\d{2}-\d{2}$/.test(custom)) {
      const start = Q.parseDay(custom);
      const days = Q.daysBetween(today, start);
      if (days > -30) {
        return { start, days, inRamadan: days <= 0, dayOf: 1 - days, year: null, source: 'custom' };
      }
    }

    if (fmt) {
      const h = hijri(today);
      if (h.m === 9) {
        return { start: Q.addDays(today, 1 - h.d), days: 0, inRamadan: true, dayOf: h.d, year: h.y, source: 'calendar' };
      }
      for (let i = 1; i < 400; i++) {
        const d = Q.addDays(today, i);
        const x = hijri(d);
        if (x.m === 9 && x.d === 1) return { start: d, days: i, inRamadan: false, year: x.y, source: 'calendar' };
      }
    }
    // Fallback: Ramadan 1448 is expected to begin around 8 February 2027
    const start = new Date(2027, 1, 8, 12);
    return { start, days: Q.daysBetween(today, start), inRamadan: false, year: 1448, source: 'fallback' };
  };
})(window.Q = window.Q || {});
