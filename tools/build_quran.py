"""Build data/quran/*.json for the Surahs section.

Sources (download them first, then pass the folders):
  quran-cloud (npm, CC BY 4.0)                       Uthmani text (QuranEnc / KFGQPC) + Sahih International
  @kmaslesa/holy-quran-word-by-word-full-data (npm)  Quran.com word-by-word English meanings
  fawazahmed0/quran-api  editions/por-helminasr.json Portuguese translation (Helmi Nasr)

usage: python3 tools/build_quran.py QURAN_CLOUD_DIR (dist/chapters/en) WBW_DATA_JSON POR_JSON OUT_DIR
"""
import json, re, sys, os, collections

qc_dir, wbw_path, por_path, out = sys.argv[1:5]
CHAPTERS = list(range(1, 115))

PT_NAMES = {
    2: 'A Vaca', 3: 'A Família de Imran', 4: 'As Mulheres', 5: 'A Mesa Servida', 6: 'Os Rebanhos', 7: 'Os Cimos',
    8: 'Os Espólios', 9: 'O Arrependimento', 10: 'Jonas', 11: 'Hud', 12: 'José', 13: 'O Trovão', 14: 'Abraão',
    15: 'Al-Hijr', 16: 'As Abelhas', 17: 'A Viagem Noturna', 18: 'A Caverna', 19: 'Maria', 20: 'Ta-Ha',
    21: 'Os Profetas', 22: 'A Peregrinação', 23: 'Os Crentes', 24: 'A Luz', 25: 'O Critério', 26: 'Os Poetas',
    27: 'As Formigas', 28: 'As Narrativas', 29: 'A Aranha', 30: 'Os Romanos', 31: 'Luqman', 32: 'A Prostração',
    33: 'Os Partidos', 34: 'Sabá', 35: 'O Criador', 36: 'Ya-Sin', 37: 'Os Enfileirados', 38: 'Sad', 39: 'Os Grupos',
    40: 'O Perdoador', 41: 'Os Versículos Detalhados', 42: 'A Consulta', 43: 'Os Ornamentos', 44: 'A Fumaça',
    45: 'A Genuflexão', 46: 'As Dunas', 47: 'Muhammad', 48: 'A Vitória', 49: 'Os Aposentos', 50: 'Qaf',
    51: 'Os Ventos Disseminadores', 52: 'O Monte', 53: 'A Estrela', 54: 'A Lua', 55: 'O Misericordioso',
    56: 'O Evento Inevitável', 57: 'O Ferro', 58: 'A Discussão', 59: 'O Desterro', 60: 'A Examinada',
    61: 'As Fileiras', 62: 'A Sexta-feira', 63: 'Os Hipócritas', 64: 'As Defraudações Mútuas', 65: 'O Divórcio',
    66: 'A Proibição', 67: 'A Soberania', 68: 'O Cálamo', 69: 'A Realidade', 70: 'As Vias de Ascensão', 71: 'Noé',
    72: 'Os Jinns', 73: 'O Envolto', 74: 'O Agasalhado', 75: 'A Ressurreição', 76: 'O Homem', 77: 'Os Enviados',
    1: 'A Abertura', 78: 'A Notícia', 79: 'Os Arrebatadores', 80: 'Franziu a testa', 81: 'O Enrolamento',
    82: 'O Rompimento', 83: 'Os Fraudadores', 84: 'A Fenda', 85: 'As Constelações', 86: 'O Astro Noturno',
    87: 'O Altíssimo', 88: 'O Evento Avassalador', 89: 'A Aurora', 90: 'A Cidade', 91: 'O Sol',
    92: 'A Noite', 93: 'A Manhã', 94: 'O Alívio', 95: 'O Figo', 96: 'O Coágulo', 97: 'O Decreto',
    98: 'A Evidência', 99: 'O Terremoto', 100: 'Os Corcéis', 101: 'A Calamidade', 102: 'A Rivalidade',
    103: 'O Tempo', 104: 'O Difamador', 105: 'O Elefante', 106: 'Os Coraixitas', 107: 'A Ajuda',
    108: 'A Abundância', 109: 'Os Descrentes', 110: 'O Socorro', 111: 'As Fibras', 112: 'A Sinceridade',
    113: 'A Alvorada', 114: 'Os Homens',
}

# The 10 verses where the text and Quran.com's word list split words differently (index is 0-based)
JOIN_TEXT = {'2:72': (3, ''), '2:181': (2, ' '), '8:6': (3, ' '), '13:37': (7, ' '), '37:130': (2, ' ')}
JOIN_MEANING = {'15:7': 0, '27:20': 3, '36:22': 0, '37:164': 0, '41:47': 24}

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
        qmap = None
        if key in JOIN_TEXT:            # the text splits what Quran.com counts as one word
            i, sep = JOIN_TEXT[key]
            words[i:i + 2] = [words[i] + sep + words[i + 1]]
            ar = ' '.join(words) if sep == '' else None
        if key in JOIN_MEANING:         # Quran.com splits what the text writes as one word
            i = JOIN_MEANING[key]
            ms[i:i + 2] = [ms[i] + ' ' + ms[i + 1]]
            qmap = list(range(i + 1)) + list(range(i, len(words)))   # Quran.com word -> our word
        assert len(ms) == len(words), (key, len(ms), len(words))
        verse = {'ar': ar if ar is not None else ' '.join(words), 'w': ms, 'en': v['translation'], 'pt': clean_pt(por[c][v['id']], v['id'])}
        if any(' ' in w for w in words):
            verse['words'] = words      # a word with a space inside: keep the split explicit
        if qmap:
            verse['qmap'] = qmap
        verses.append(verse)
    doc = {'n': c, 'name': ch['transliteration'], 'ar': ch['name'], 'en': ch['translation'], 'pt': PT_NAMES[c],
           'place': ch['type'], 'verses': verses}
    json.dump(doc, open(os.path.join(out, f'{c}.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    words_total = sum(len(v['ar'].split(' ')) for v in verses)
    index.append({'n': c, 'name': ch['transliteration'], 'ar': ch['name'], 'en': ch['translation'], 'pt': PT_NAMES[c],
                  'place': ch['type'], 'verses': len(verses), 'words': words_total})
json.dump(index, open(os.path.join(out, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('built', len(index), 'surahs')
