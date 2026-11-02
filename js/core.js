/* Huruf — small helpers shared by every view. */
(function (Q) {
  'use strict';

  /* h('div', {class:'x', onclick: fn}, child, 'text', [more]) → element */
  Q.h = function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k in el && typeof v !== 'string') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    appendKids(el, kids);
    return el;
  };
  function appendKids(el, kids) {
    for (const k of kids) {
      if (k == null || k === false) continue;
      if (Array.isArray(k)) appendKids(el, k);
      else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }

  /* SVG element builder */
  Q.s = function s(tag, attrs, ...kids) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    appendKids(el, kids);
    return el;
  };

  Q.$ = (sel, root = document) => root.querySelector(sel);

  /* Randomness */
  Q.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  Q.shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  Q.weightedPick = (items, weightOf) => {
    let total = 0;
    const ws = items.map(it => { const w = Math.max(0.0001, weightOf(it)); total += w; return w; });
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };

  /* Dates: everything is keyed by the learner's local calendar day. */
  Q.dayKey = (d = new Date()) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  Q.parseDay = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  Q.addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  Q.daysBetween = (a, b) => Math.round((Q.parseDay(Q.dayKey(b)) - Q.parseDay(Q.dayKey(a))) / 86400000);

  /* Formatting */
  Q.pct = (x) => (x == null || isNaN(x)) ? '–' : Math.round(x * 100) + '%';
  Q.fmtInt = n => Number(n || 0).toLocaleString();
  Q.fmtDuration = ms => {
    const min = Math.round((ms || 0) / 60000);
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  };
  Q.fmtDate = (d, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) =>
    d.toLocaleDateString(undefined, opts);
  Q.toArabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  /* Safe localStorage */
  Q.storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  };

  /* Toast */
  Q.toast = function (msg) {
    let t = Q.$('#toast');
    if (!t) { t = Q.h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(Q.toast._t);
    Q.toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* Copy to clipboard, with a select-text fallback */
  Q.copy = async function (text, fallbackEl) {
    try { await navigator.clipboard.writeText(text); Q.toast('Copied'); }
    catch (e) {
      if (fallbackEl) { fallbackEl.focus(); fallbackEl.select && fallbackEl.select(); }
      Q.toast('Press Ctrl+C to copy');
    }
  };

  /* Wrap Arabic runs inside English text so they use the Arabic font and read right-to-left */
  const AR = '؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿';
  const AR_RUN = new RegExp(`[${AR}]+(?:[\\s…]+[${AR}]+)*`, 'g');
  Q.mixed = function (str) {
    const out = [];
    let last = 0;
    String(str).replace(AR_RUN, (m, i) => {
      if (i > last) out.push(str.slice(last, i));
      out.push(Q.h('span', { class: 'ar inline' }, m));
      last = i + m.length;
      return m;
    });
    if (last < str.length) out.push(str.slice(last));
    return out;
  };

  /* Arabic font helpers */
  Q.arabicFontCss = id => (Q.FONT[id] || Q.FONT.hafs).css;
})(window.Q = window.Q || {});
