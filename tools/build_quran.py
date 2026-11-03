"""Build data/quran/*.json for the Surahs section.

Sources (download them first, then pass the folders):
  quran-cloud (npm, CC BY 4.0)                       Uthmani text (QuranEnc / KFGQPC) + Sahih International
  @kmaslesa/holy-quran-word-by-word-full-data (npm)  Quran.com word-by-word English meanings
  fawazahmed0/quran-api  editions/por-helminasr.json Portuguese translation (Helmi Nasr)

usage: python3 tools/build_quran.py QURAN_CLOUD_DIR (dist/chapters/en) WBW_DATA_JSON POR_JSON OUT_DIR
"""
import json, re, sys, os, collections

qc_dir, wbw_path, por_path, out = sys.argv[1:5]
CHAPTERS = [1] + list(range(78, 115))

PT_NAMES = {
    1: 'A Abertura', 78: 'A Notícia', 79: 'Os Arrebatadores', 80: 'Franziu a testa', 81: 'O Enrolamento',
    82: 'O Rompimento', 83: 'Os Fraudadores', 84: 'A Fenda', 85: 'As Constelações', 86: 'O Astro Noturno',
    87: 'O Altíssimo', 88: 'O Evento Avassalador', 89: 'A Aurora', 90: 'A Cidade', 91: 'O Sol',
    92: 'A Noite', 93: 'A Manhã', 94: 'O Alívio', 95: 'O Figo', 96: 'O Coágulo', 97: 'O Decreto',
    98: 'A Evidência', 99: 'O Terremoto', 100: 'Os Corcéis', 101: 'A Calamidade', 102: 'A Rivalidade',
    103: 'O Tempo', 104: 'O Difamador', 105: 'O Elefante', 106: 'Os Coraixitas', 107: 'A Ajuda',
    108: 'A Abundância', 109: 'Os Descrentes', 110: 'O Socorro', 111: 'As Fibras', 112: 'A Sinceridade',
    113: 'A Alvorada', 114: 'Os Homens',
}

wbw = json.load(open(wbw_path, encoding='utf8'))
meanings = collections.defaultdict(list)
for page in wbw:
    for ay in page['ayahs']:
        for w in ay['words']:
            if w['char_type_name'] == 'word':
                meanings[w['parentAyahVerseKey']].append((w['position'], (w['translation'] or {}).get('text') or ''))

por = collections.defaultdict(dict)
for x in json.load(open(por_path, encoding='utf8'))['quran']:
    por[x['chapter']][x['verse']] = x['text']

def clean_pt(text, verse):
    text = text.strip()
    if verse == 1:  # this edition puts the surah heading inside verse 1
        text = re.sub(r'^Suratu?\s+[^.]+\.\s*', '', text)
    return text

index = []
os.makedirs(out, exist_ok=True)
for c in CHAPTERS:
    ch = json.load(open(os.path.join(qc_dir, f'{c}.json'), encoding='utf8'))
    verses = []
    for v in ch['verses']:
        key = f"{c}:{v['id']}"
        ar = v['text'].replace('۞', '').strip()
        ar = re.sub(r'\s+', ' ', ar)
        words = ar.split(' ')
        ms = [m for _, m in sorted(meanings[key])]
        assert len(ms) == len(words), (key, len(ms), len(words))
        verses.append({'ar': ar, 'w': ms, 'en': v['translation'], 'pt': clean_pt(por[c][v['id']], v['id'])})
    doc = {'n': c, 'name': ch['transliteration'], 'ar': ch['name'], 'en': ch['translation'], 'pt': PT_NAMES[c],
           'place': ch['type'], 'verses': verses}
    json.dump(doc, open(os.path.join(out, f'{c}.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    words_total = sum(len(v['ar'].split(' ')) for v in verses)
    index.append({'n': c, 'name': ch['transliteration'], 'ar': ch['name'], 'en': ch['translation'], 'pt': PT_NAMES[c],
                  'place': ch['type'], 'verses': len(verses), 'words': words_total})
json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('built', len(index), 'surahs')
