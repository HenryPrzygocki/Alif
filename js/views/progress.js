/* Huruf — Progress: where you are strong, where you slip, and how steady you have been. */
(function (Q) {
  'use strict';
  const { h, s } = Q;
  Q.views = Q.views || {};

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  const shortDate = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  /* Small single-series chart. kind: 'bar' | 'line' */
  function chart({ data, get, kind, yMax, minMax, fmtY, fmtTip, label }) {
    const W = 360, H = 170, L = 36, R = 10, T = 12, B = 24;
    const iw = W - L - R, ih = H - T - B;
    const vals = data.map(get);
    const max = yMax != null ? yMax : Math.max(minMax || 0, niceMax(Math.max(0, ...vals.filter(v => v != null)) * 1.1));
    const y = v => T + ih - (v / max) * ih;
    const n = data.length;
    const band = iw / n;
    const x = i => L + band * i + band / 2;

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
    const grid = s('g', { class: 'grid' });
    [0, 0.5, 1].forEach(f => {
      const v = max * f;
      grid.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v) }));
      svg.append(s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, fmtY(v)));
    });
    svg.prepend(grid);
    [0, Math.floor((n - 1) / 2), n - 1].forEach(i => {
      svg.append(s('text', { x: x(i), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, shortDate(data[i].date)));
    });
    svg.append(s('line', { class: 'axis', x1: L, x2: W - R, y1: T + ih, y2: T + ih }));

    if (kind === 'bar') {
      const bw = Math.max(2, band - 2);
      vals.forEach((v, i) => {
        if (!v) return;
        const top = y(v), x0 = x(i) - bw / 2, base = T + ih, r = Math.min(2, bw / 2, base - top);
        svg.append(s('path', {
          d: `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${base} Z`,
          fill: 'var(--accent)',
        }));
      });
    } else {
      let d = '', pen = false;
      vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(Math.min(v, max)).toFixed(1);
        pen = true;
      });
      svg.append(s('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      vals.forEach((v, i) => {
        if (v == null) return;
        svg.append(s('circle', { cx: x(i), cy: y(Math.min(v, max)), r: '3.5', fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': '2' }));
      });
    }

    // hover layer
    const cross = s('line', { y1: T, y2: T + ih, stroke: 'var(--ink-3)', 'stroke-width': '1', 'stroke-dasharray': '3 3', opacity: '0' });
    svg.append(cross);
    const hit = s('rect', { x: L, y: T, width: iw, height: ih, fill: 'transparent' });
    hit.addEventListener('mousemove', e => {
      const pt = svg.getBoundingClientRect();
      const px = (e.clientX - pt.left) / pt.width * W;
      const i = Math.max(0, Math.min(n - 1, Math.floor((px - L) / band)));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', '1');
      Q.showTip(`<b>${Q.fmtDate(data[i].date, { weekday: 'short', month: 'short', day: 'numeric' })}</b><br>${fmtTip(data[i])}`, e.clientX, e.clientY);
    });
    hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', '0'); Q.hideTip(); });
    svg.append(hit);
    return h('div', { class: 'chart' }, svg);
  }

  /* Calendar of practice days, from a few weeks back up to Ramadan */
  function calendar(goal) {
    const st = Q.store.state;
    const today = Q.addDays(new Date(), 0);
    const r = Q.ramadan();
    const keys = Object.keys(st.days).sort();
    let start = keys.length ? Q.parseDay(keys[0]) : today;
    const minStart = Q.addDays(today, -7 * 8);
    if (start > minStart) start = minStart;
    if (Q.daysBetween(start, today) > 7 * 26) start = Q.addDays(today, -7 * 26);
    let end = r.inRamadan ? Q.addDays(r.start, 29) : r.start;
    if (Q.daysBetween(today, end) > 7 * 30) end = Q.addDays(today, 7 * 30);
    start = Q.addDays(start, -start.getDay());   // weeks start on Sunday

    const grid = h('div', { class: 'heat', role: 'img', 'aria-label': 'Practice calendar up to Ramadan' });
    grid.style.gridTemplateRows = '16px repeat(7, 15px)';
    let lastMonth = -1;
    const weeks = Math.ceil((Q.daysBetween(start, end) + 1) / 7);
    for (let w = 0; w < weeks; w++) {
      const first = Q.addDays(start, w * 7);
      const m = first.getMonth();
      grid.append(h('span', { class: 'small muted', style: { fontSize: '10.5px', width: '15px', whiteSpace: 'nowrap', overflow: 'visible' } }, m !== lastMonth ? first.toLocaleDateString(undefined, { month: 'short' }) : ''));
      lastMonth = m;
      for (let d = 0; d < 7; d++) {
        const date = Q.addDays(start, w * 7 + d);
        const key = Q.dayKey(date);
        const diff = Q.daysBetween(today, date);
        const rec = st.days[key];
        let cls = '';
        if (Q.daysBetween(end, date) > 0) cls = 'pad';
        else if (Q.dayKey(date) === Q.dayKey(r.start)) cls = 'ramadan';
        else if (diff > 0) cls = 'future';
        else if (rec && rec.n) {
          const f = rec.n / goal;
          cls = f >= 1 ? 'h4' : f >= 0.5 ? 'h3' : f >= 0.25 ? 'h2' : 'h1';
        }
        if (diff === 0) cls += ' today';
        const cell = h('i', { class: cls });
        cell.addEventListener('mouseenter', e => {
          let txt = `<b>${Q.fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</b><br>`;
          if (cls.includes('ramadan')) txt += 'Ramadan begins (expected)';
          else if (diff > 0) txt += `${diff} ${diff === 1 ? 'day' : 'days'} from now`;
          else txt += rec && rec.n ? `${rec.n} reads · ${Q.pct(1 - rec.w / rec.n)} right` : 'No practice';
          Q.showTip(txt, e.clientX, e.clientY);
        });
        cell.addEventListener('mouseleave', Q.hideTip);
        grid.append(cell);
      }
    }
    return grid;
  }

  Q.views.progress = function (root) {
    const st = Q.store.state;
    const tot = Q.store.totals();
    const streak = Q.store.streak();
    const goal = st.settings.goal || 150;
    const series = Q.store.series(30);
    const any30 = series.some(d => d.n);

    const tile = (v, k, small) => h('div', { class: 'card stat' }, h('span', { class: 'v' }, v, small ? h('small', null, small) : null), h('span', { class: 'k' }, k));

    const tiles = h('div', { class: 'grid cols-4' },
      tile(Q.fmtInt(tot.n), 'letters read in total'),
      tile(Q.pct(tot.acc), 'right overall'),
      tile(streak.cur, `day streak · best ${streak.best}`, streak.cur === 1 ? 'day' : 'days'),
      tile(tot.secPer == null ? '–' : tot.secPer.toFixed(1), 'seconds per letter before reveal', tot.secPer == null ? '' : 's'));

    const trends = any30
      ? h('div', { class: 'grid cols-3' },
        h('div', { class: 'stack' }, h('h3', null, 'Letters read per day'),
          chart({ data: series, get: d => d.n, kind: 'bar', fmtY: v => Math.round(v), fmtTip: d => `${d.n} reads`, label: 'Letters read per day, last 30 days' })),
        h('div', { class: 'stack' }, h('h3', null, 'Accuracy'),
          chart({ data: series, get: d => d.acc, kind: 'line', yMax: 1, fmtY: v => Math.round(v * 100) + '%', fmtTip: d => d.acc == null ? 'No practice' : `${Q.pct(d.acc)} right of ${d.n}`, label: 'Daily accuracy, last 30 days' })),
        h('div', { class: 'stack' }, h('h3', null, 'Seconds per letter'),
          chart({ data: series, get: d => d.secPer, kind: 'line', minMax: 2, fmtY: v => v.toFixed(v < 10 ? 1 : 0) + 's', fmtTip: d => d.secPer == null ? 'No timed rows' : `${d.secPer.toFixed(1)} s per letter`, label: 'Reading speed, seconds per letter, last 30 days' })))
      : h('p', { class: 'empty' }, 'Your daily charts will appear here after your first practice session.');

    /* mastery grid */
    const mastery = h('div', { class: 'mastery-grid' }, Q.LETTERS.map(l => {
      const lvl = Q.store.level(l.id);
      const rec = st.letters[l.id];
      return h('button', {
        class: 'mt l' + lvl, type: 'button',
        title: `${l.name}: ${Q.store.LEVELS[lvl]}${rec && rec.n ? ` · ${rec.n} reads` : ''}`,
        onclick: () => { Q.storage.set('huruf.letter', l.id); Q.go('letters'); },
      },
        h('span', { class: 'ar' }, l.ch),
        h('span', { class: 'p' }, rec && rec.n ? Q.pct(1 - rec.w / rec.n) : 'new'),
        h('span', { class: 'c' }, rec && rec.n ? rec.n + ' reads' : l.name));
    }));
    const legend = h('div', { class: 'legend' }, Q.store.LEVELS.map((name, i) => h('span', null, h('i', { class: 'l' + i, style: { background: i ? `var(--m${i})` : 'transparent' } }), name)));

    /* confusions */
    const conf = Q.store.confusions(6);
    const confEl = conf.length
      ? h('div', { class: 'conf-list' }, conf.map(c => h('div', { class: 'conf' },
        h('span', { class: 'ar' }, c.target.ch), h('span', { class: 'arrow' }, '→'), h('span', { class: 'ar', style: { color: 'var(--bad)' } }, c.picked.ch),
        h('span', { class: 'small' }, `${c.target.name} taken for ${c.picked.name}`),
        h('span', { class: 'small muted num' }, c.count + '×'))))
      : h('p', { class: 'empty' }, 'No mix-ups recorded yet. They come from the "Spot the letter" mode.');

    /* hardest sounds */
    const syl = Object.entries(st.syl)
      .filter(([, v]) => v[0] >= 3)
      .map(([k, v]) => { const [id, vow] = k.split(':'); return { id, vow, n: v[0], acc: 1 - v[1] / v[0] }; })
      .filter(x => Q.L[x.id] && Q.VOWELS[x.vow])
      .sort((a, b) => a.acc - b.acc).slice(0, 8);
    const sylEl = syl.length
      ? h('div', { class: 'mastery-grid' }, syl.map(x => {
        const sy = Q.syllable(x.id, x.vow);
        return h('div', { class: 'mt l0', style: { borderStyle: 'solid', color: 'var(--ink)' } },
          h('span', { class: 'ar' }, sy.text), h('span', { class: 'p' }, sy.sound), h('span', { class: 'c' }, `${Q.pct(x.acc)} of ${x.n}`));
      }))
      : h('p', { class: 'empty' }, 'Needs a few rounds of "Read the sounds" first.');

    /* by mode */
    const modeRows = Q.MODES.map(m => ({ m, r: st.modes[m.id] })).filter(x => x.r && x.r.n);
    const modeTable = modeRows.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'mode-table' },
        h('thead', null, h('tr', null, h('th', null, 'Mode'), h('th', { style: { textAlign: 'right' } }, 'Reads'), h('th', { style: { textAlign: 'right' } }, 'Right'))),
        h('tbody', null, modeRows.map(({ m, r }) => h('tr', null, h('td', null, m.label), h('td', { class: 'n' }, Q.fmtInt(r.n)), h('td', { class: 'n' }, Q.pct(1 - r.w / r.n)))))))
      : h('p', { class: 'empty' }, 'Nothing yet.');

    const sessions = st.sessions.slice(-8).reverse();
    const sessEl = sessions.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'mode-table' },
        h('thead', null, h('tr', null, h('th', null, 'When'), h('th', null, 'Mode'), h('th', { style: { textAlign: 'right' } }, 'Reads'), h('th', { style: { textAlign: 'right' } }, 'Right'), h('th', { style: { textAlign: 'right' } }, 'Time'))),
        h('tbody', null, sessions.map(x => h('tr', null,
          h('td', null, new Date(x.t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })),
          h('td', null, (Q.MODE[x.mode] || { short: x.mode }).short),
          h('td', { class: 'n' }, x.n), h('td', { class: 'n' }, Q.pct(1 - x.w / x.n)), h('td', { class: 'n' }, Q.fmtDuration(x.ms)))))))
      : h('p', { class: 'empty' }, 'Finished sessions will be listed here.');

    root.append(h('div', { class: 'page' },
      h('div', { class: 'page-head' },
        h('div', null, h('h1', null, 'Progress'),
          h('p', null, `${tot.days} ${tot.days === 1 ? 'day' : 'days'} of practice and ${Q.fmtDuration(tot.ms)} in total. Hover over the charts for details.`))),
      tiles,
      h('section', { class: 'card stack' },
        h('div', { class: 'card-head' }, h('h2', null, 'Every day until Ramadan'),
          h('div', { class: 'legend' },
            h('span', null, h('i', { style: { background: 'var(--m0)' } }), 'none'),
            h('span', null, h('i', { style: { background: 'var(--m2)' } }), '< ¼ goal'),
            h('span', null, h('i', { style: { background: 'var(--m3)' } }), '< ½'),
            h('span', null, h('i', { style: { background: 'var(--m4)' } }), '< goal'),
            h('span', null, h('i', { style: { background: 'var(--m5)' } }), 'goal met'),
            h('span', null, h('i', { style: { background: 'var(--gold)' } }), 'Ramadan'))),
        calendar(goal)),
      h('section', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', null, 'Last 30 days')), trends),
      h('section', { class: 'card stack' },
        h('div', { class: 'card-head' }, h('h2', null, 'Every letter'), legend),
        h('p', { class: 'small muted' }, 'Based on your last 12 tries of each letter. A letter needs a few reads before it can count as solid. Click one to open it.'),
        mastery),
      h('div', { class: 'grid cols-2' },
        h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Mix-ups')), confEl),
        h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Trickiest sounds')), sylEl)),
      h('div', { class: 'grid cols-2' },
        h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'By mode')), modeTable),
        h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Recent sessions')), sessEl))));
  };
})(window.Q = window.Q || {});
