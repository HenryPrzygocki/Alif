/* Alif — when does Ramadan start?
   An Islamic day begins at sunset, so Ramadan "starts" the evening before the first fast:
   that night is the first taraweeh. Known dates are looked up; later years fall back to the
   browser's Umm al-Qura calendar. Setup keeps an optional override for local moon sighting. */
(function (Q) {
  'use strict';

  // First day of fasting (1 Ramadan). Sources: Umm al-Qura calendar and FCNA/ISNA
  // astronomical projections both give Monday 8 Feb 2027; first taraweeh Sunday 7 Feb.
  const KNOWN_FIRST_FAST = { 1448: '2027-02-08' };

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

  /* First fast of the next (or current) Ramadan */
  function firstFast(today) {
    for (const [year, key] of Object.entries(KNOWN_FIRST_FAST)) {
      const d = Q.parseDay(key);
      if (Q.daysBetween(today, d) > -30) return { fast: d, year: Number(year), source: 'known' };
    }
    if (fmt) {
      for (let i = -30; i < 400; i++) {
        const d = Q.addDays(today, i);
        const x = hijri(d);
        if (x.m === 9 && x.d === 1 && Q.daysBetween(today, d) > -30) return { fast: d, year: x.y, source: 'calendar' };
      }
    }
    return { fast: Q.parseDay('2027-02-08'), year: 1448, source: 'known' };
  }

  /* { night, fast, days (until the first night), phase: 'before' | 'tonight' | 'during', dayOf, year } */
  Q.ramadan = function () {
    const today = Q.addDays(new Date(), 0);
    const custom = Q.store.state.settings.ramadan;
    let info;
    if (custom && /^\d{4}-\d{2}-\d{2}$/.test(custom) && Q.daysBetween(today, Q.parseDay(custom)) > -30) {
      info = { fast: Q.parseDay(custom), year: null, source: 'custom' };
    } else {
      info = firstFast(today);
    }
    const night = Q.addDays(info.fast, -1);
    const days = Q.daysBetween(today, night);
    const dayOf = Q.daysBetween(info.fast, today) + 1;
    const phase = days > 0 ? 'before' : days === 0 ? 'tonight' : 'during';
    return Object.assign(info, { night, days: Math.max(0, days), dayOf, phase, inRamadan: phase === 'during', start: night });
  };
})(window.Q = window.Q || {});
