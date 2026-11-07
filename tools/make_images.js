/* Renders the share image (img/og.png) and the app icons (img/icon-*.png).
   Run from the repo root after changing the name or tagline:  node tools/make_images.js
   Needs Playwright (npm i -D playwright, or a global install). */
const { chromium } = require('playwright');
const path = require('path');

const NAME = 'Alif';
// the alif from Scheherazade New (SIL OFL), in a 100x100 box; the same path is inlined in index.html and img/favicon.svg
const ALIF = 'M56.4 66.9Q56.4 68.9 55.7 71.7Q55.1 74.6 54.2 77.5Q53.2 80.3 52.4 82.2Q51.5 84.1 51.1 84.1Q50.5 84.1 49.7 83.8Q48.9 83.4 48.9 83Q48.9 82.6 49.5 80.8Q50 79 50 74.7Q50 72.8 49.5 69.2Q49 65.5 48.3 60.9Q47.6 56.2 46.8 51.4Q46 46.5 45.2 42.2Q44.5 37.9 44.1 34.9Q43.6 31.8 43.6 30.9Q43.6 28.9 44.7 25.9Q45.7 22.9 47.4 20.1Q49.1 17.3 51 15.9Q51.6 16.9 51.9 18.3Q52.2 19.7 52.2 20.7V25.4Z';
const mark = `<svg viewBox="0 0 100 100"><path fill="#EAD9A8" d="${ALIF}"/></svg>`;
const TAGLINE = 'Read, listen and memorize the Quran, with transliteration and meaning for every word.';
const root = path.resolve(__dirname, '..');
const font = 'file://' + path.join(root, 'fonts/uthmanic-hafs.woff2');

const css = `
@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600&family=Instrument+Sans:wght@500&display=block');
@font-face { font-family: Hafs; src: url('${font}'); }
* { margin: 0; box-sizing: border-box; }
body { background: #0F2C26; color: #E8F0EC; }
.mark { display: grid; place-items: center; border-radius: 50%; border: 2px solid rgba(234,217,168,.55); }
.mark svg { width: 82%; height: 82%; }
`;

const og = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { width: 1200px; height: 630px; display: grid; grid-template-columns: 420px 1fr; align-items: center; padding: 0 90px; gap: 70px; position: relative; overflow: hidden; }
.mark { width: 380px; height: 380px; }
.ring { position: absolute; left: 70px; top: 105px; width: 420px; height: 420px; border-radius: 50%; border: 1px solid rgba(234,217,168,.18); }
h1 { font: 600 104px/1 Literata, serif; letter-spacing: -.01em; }
p { font: 500 30px/1.4 'Instrument Sans', sans-serif; color: #B9CCC4; margin-top: 26px; max-width: 560px; }
.ar { font-family: Hafs, serif; color: #EAD9A8; font-size: 54px; margin-top: 30px; direction: rtl; text-align: left; }
</style></head><body><div class="ring"></div><div class="mark">${mark}</div><div><h1>${NAME}</h1><p>${TAGLINE}</p><div class="ar">ٱقْرَأْ بِٱسْمِ رَبِّكَ</div></div></body></html>`;

const icon = size => `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
.mark { width: ${size * 0.74}px; height: ${size * 0.74}px; border-width: ${Math.max(2, size / 128)}px; }
</style></head><body><div class="mark">${mark}</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const shoot = async (html, w, h, file) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(root, file) });
    await page.close();
    console.log('wrote', file);
  };
  await shoot(og, 1200, 630, 'img/og.png');
  for (const s of [180, 192, 512]) await shoot(icon(s), s, s, `img/icon-${s}.png`);
  await browser.close();
})();
