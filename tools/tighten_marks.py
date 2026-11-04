"""Cuts ʾ ʿ (U+02BE, U+02BF) out of Literata and tightens their side bearings, so a
transliteration like naʿbudu reads as one word.
Usage (pip install fonttools brotli):  python3 tools/tighten_marks.py Literata-latin-ext.woff2 fonts/translit-marks-500.woff2"""
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

src, dst = sys.argv[1], sys.argv[2]
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = []
opts.name_IDs = ['*']
opts.notdef_outline = False
f = TTFont(src)
if 'fvar' in f:
    from fontTools.varLib import instancer
    f = instancer.instantiateVariableFont(f, {'opsz': 20})
sub = subset.Subsetter(opts)
sub.populate(unicodes=[0x2BE, 0x2BF])
sub.subset(f)
upm = f['head'].unitsPerEm
glyf, hmtx, cmap = f['glyf'], f['hmtx'], f.getBestCmap()
for cp in (0x2BE, 0x2BF):
    name = cmap[cp]
    g = glyf[name]
    g.recalcBounds(glyf)
    adv, lsb = hmtx[name]
    ink = g.xMax - g.xMin
    pad = int(upm * 0.035)          # small, even bearings on both sides
    shift = pad - g.xMin
    coords = g.getCoordinates(glyf)[0]
    coords.translate((shift, 0))
    g.coordinates = coords
    g.recalcBounds(glyf)
    hmtx[name] = (ink + 2 * pad, g.xMin)
    print(hex(cp), name, 'adv', adv, '->', ink + 2 * pad, 'lsb', lsb, '->', g.xMin, 'upm', upm)
f['hhea'].advanceWidthMax = max(a for a, _ in hmtx.metrics.values())
f.flavor = 'woff2'
f.save(dst)
