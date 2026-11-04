/* Renders the share image (img/og.png) and the app icons (img/icon-*.png).
   Run from the repo root after changing the name or tagline:  node tools/make_images.js
   Needs Playwright (npm i -D playwright, or a global install). */
const { chromium } = require('playwright');
const path = require('path');

const NAME = 'Huruf';
const TAGLINE = 'Learn to read the Quran: the letters first, then short surahs by heart. Road to Ramadan.';
const root = path.resolve(__dirname, '..');
const font = 'file://' + path.join(root, 'fonts/uthmanic-hafs.woff2');

const css = `
@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600&family=Instrument+Sans:wght@500&display=block');
@font-face { font-family: Hafs; src: url('${font}'); }
* { margin: 0; box-sizing: border-box; }
body { background: #0F2C26; color: #E8F0EC; }
.mark { font-family: Hafs, serif; color: #EAD9A8; display: grid; place-items: center; border-radius: 50%; border: 2px solid rgba(234,217,168,.55); }
`;

const og = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { width: 1200px; height: 630px; display: grid; grid-template-columns: 420px 1fr; align-items: center; padding: 0 90px; gap: 70px; position: relative; overflow: hidden; }
.mark { width: 380px; height: 380px; font-size: 230px; padding-top: 40px; }
.ring { position: absolute; left: 70px; top: 105px; width: 420px; height: 420px; border-radius: 50%; border: 1px solid rgba(234,217,168,.18); }
h1 { font: 600 104px/1 Literata, serif; letter-spacing: -.01em; }
p { font: 500 30px/1.4 'Instrument Sans', sans-serif; color: #B9CCC4; margin-top: 26px; max-width: 560px; }
.ar { font-family: Hafs, serif; color: #EAD9A8; font-size: 54px; margin-top: 30px; direction: rtl; text-align: left; }
</style></head><body><div class="ring"></div><div class="mark">حُ</div><div><h1>${NAME}</h1><p>${TAGLINE}</p><div class="ar">ٱقْرَأْ بِٱسْمِ رَبِّكَ</div></div></body></html>`;

const icon = size => `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
.mark { width: ${size * 0.74}px; height: ${size * 0.74}px; font-size: ${size * 0.46}px; padding-top: ${size * 0.08}px; border-width: ${Math.max(2, size / 128)}px; }
</style></head><body><div class="mark">حُ</div></body></html>`;

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
