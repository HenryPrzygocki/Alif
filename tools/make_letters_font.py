"""Builds fonts/uthmanic-hafs-letters.woff2: the KFGQPC Uthmanic Hafs font, but with the two
dots drawn under yaa (ي) when it stands alone or ends a word.

The Madani mushaf writes a final yaa without dots, so the original font draws ي and ى the same
way at the end of a word. That is right for reading the mushaf (the surah pages keep the
original), but in letter practice it hides the dots that tell ي apart from ى, ب, ت, ث and ن.

Usage (pip install fonttools brotli):
    python3 tools/make_letters_font.py fonts/uthmanic-hafs.woff2 fonts/uthmanic-hafs-letters.woff2
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.ttLib.tables import otTables

src, dst = sys.argv[1], sys.argv[2]
f = TTFont(src)
glyf, hmtx = f['glyf'], f['hmtx']

ISO, FINA, DOTLESS_FINA_PART, DOTS = 'afii57450', 'afii57450.zz04', '_379', 'd2'
NEW_FINA = 'afii57450.fdots'
# where the dots go (font units) and how far the "below" mark anchor (kasra, tanwin kasr) moves down
ISO_DOTS = (500, -640)
FINA_DOTS = (835, -940)
BELOW_DROP = 300


def comp(name, x, y):
    c = GlyphComponent()
    c.glyphName, c.x, c.y, c.flags = name, x, y, 0x4  # ROUND_XY_TO_GRID
    return c


# 1. isolated yaa: the dotless body plus the two dots
iso = glyf[ISO]
iso.components.append(comp(DOTS, *ISO_DOTS))

# 2. a new final form for yaa only (alif maqsura keeps the shared dotless one)
order = f.getGlyphOrder()
order.append(NEW_FINA)
f.setGlyphOrder(order)
g = Glyph()
g.numberOfContours = -1
g.components = [comp(DOTLESS_FINA_PART, 0, 0), comp(DOTS, *FINA_DOTS)]
glyf.glyphs[NEW_FINA] = g
glyf.glyphOrder = order
hmtx[NEW_FINA] = hmtx[FINA]
if 'post' in f and hasattr(f['post'], 'extraNames'):
    pass

# 3. shaping: the final-form lookup sends yaa to the new glyph
gsub = f['GSUB'].table
fina_lookups = [fr.Feature.LookupListIndex for fr in gsub.FeatureList.FeatureRecord if fr.FeatureTag == 'fina']
for idxs in fina_lookups:
    for li in idxs:
        for st in gsub.LookupList.Lookup[li].SubTable:
            m = getattr(st, 'mapping', None)
            if m and m.get(ISO) == FINA:
                m[ISO] = NEW_FINA

# 4. glyph class and mark positions (vowel marks above/below), with "below" moved under the dots
gdef = f['GDEF'].table
if gdef.GlyphClassDef:
    gdef.GlyphClassDef.classDefs[NEW_FINA] = gdef.GlyphClassDef.classDefs.get(FINA, 1)
gpos = f['GPOS'].table
for lk in gpos.LookupList.Lookup:
    for st in lk.SubTable:
        t = st.ExtSubTable if hasattr(st, 'ExtSubTable') else st
        if getattr(t, 'LookupType', lk.LookupType) not in (4,) or not hasattr(t, 'BaseCoverage'):
            continue
        glyphs = t.BaseCoverage.glyphs
        if FINA in glyphs:
            src_rec = t.BaseArray.BaseRecord[glyphs.index(FINA)]
            rec = otTables.BaseRecord()
            rec.BaseAnchor = []
            for a in src_rec.BaseAnchor:
                if a is None:
                    rec.BaseAnchor.append(None); continue
                n = otTables.Anchor(); n.Format = 1; n.XCoordinate = a.XCoordinate; n.YCoordinate = a.YCoordinate
                rec.BaseAnchor.append(n)
            glyphs.append(NEW_FINA)
            t.BaseArray.BaseRecord.append(rec)
            t.BaseArray.BaseCount = len(t.BaseArray.BaseRecord)
        for name in (ISO, NEW_FINA):
            if name in glyphs:
                rec = t.BaseArray.BaseRecord[glyphs.index(name)]
                for a in rec.BaseAnchor:
                    if a is not None and a.YCoordinate < 0:
                        a.YCoordinate -= BELOW_DROP

# rename the family so it can sit next to the original
for rec in f['name'].names:
    if rec.nameID in (1, 3, 4, 6, 16):
        try:
            s = rec.toUnicode()
        except Exception:
            continue
        rec.string = s.replace('KFGQPC Uthmanic Script HAFS', 'Uthmanic Hafs Letters').replace('KFGQPCUthmanicScriptHAFS', 'UthmanicHafsLetters')
f.flavor = 'woff2'
f.save(dst)
print('wrote', dst)
