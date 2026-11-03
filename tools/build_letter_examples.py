"""Pick real Quran words that show each letter clearly, from data/quran/*.json.

For every letter we look for words where it carries a plain short vowel (no shadda),
preferably as the first sound of the word, in the surahs a beginner hears most.
usage: python3 tools/build_letter_examples.py data/quran data/letter-examples.json
"""
import json, os, sys, re

src, out = sys.argv[1:3]
F, K, D = 'َ', 'ِ', 'ُ'
SHADDA = 'ّ'
MARK = re.compile('[ً-ٰٟۖ-ۭ]')
LETTERS = {
    'baa': 'ب', 'taa': 'ت', 'thaa': 'ث', 'jeem': 'ج', 'Haa': 'ح', 'khaa': 'خ', 'daal': 'د', 'dhaal': 'ذ',
    'raa': 'ر', 'zaay': 'ز', 'seen': 'س', 'sheen': 'ش', 'Saad': 'ص', 'Daad': 'ض', 'Taa': 'ط', 'Zaa': 'ظ',
    'ayn': 'ع', 'ghayn': 'غ', 'faa': 'ف', 'qaaf': 'ق', 'kaaf': 'ك', 'laam': 'ل', 'meem': 'م', 'noon': 'ن',
    'haa': 'ه', 'waaw': 'و', 'yaa': 'ي', 'hamza': 'أإ',
}
FAMILIAR = {1: 6, 112: 6, 113: 5, 114: 5, 108: 4, 103: 4, 110: 3, 109: 3, 111: 3, 106: 3, 105: 3, 107: 3}

def clusters(word):
    out = []
    for ch in word:
        if MARK.match(ch) and out: out[-1][1] += ch
        else: out.append([ch, ''])
    return out

cands = {k: [] for k in LETTERS}
alif = []
for fn in sorted(os.listdir(src)):
    if not fn[0].isdigit(): continue
    doc = json.load(open(os.path.join(src, fn), encoding='utf8'))
    s = doc['n']
    for vi, verse in enumerate(doc['verses'], 1):
        for wi, word in enumerate(verse['ar'].split(' ')):
            cl = clusters(word)
            bases = [c[0] for c in cl]
            # first pronounced position: skip ٱل article and prefixes are fine to keep
            start = 0
            if bases[:2] == ['ٱ', 'ل']: start = 2
            elif bases[:1] == ['ٱ']: start = 1
            for li, (b, m) in enumerate(cl):
                v = 'a' if F in m else 'i' if K in m else 'u' if D in m else None
                if not v or SHADDA in m: continue
                for lid, chars in LETTERS.items():
                    if b in chars:
                        score = FAMILIAR.get(s, 0) * 2 + (6 if li == start else 0) - len(bases) - li
                        cands[lid].append((score, s, vi, wi, li, v, word))
            # alif as a long vowel: consonant + fatha followed by ا
            for li in range(1, len(cl)):
                if cl[li][0] == 'ا' and F in cl[li - 1][1] and cl[li][1] == '':
                    alif.append((FAMILIAR.get(s, 0) * 2 - len(bases), s, vi, wi, li, 'aa', word))
                    break

def pick(lst, n=3):
    lst = sorted(lst, key=lambda x: -x[0])
    chosen, vowels, words = [], set(), set()
    for item in lst:  # first pass: different vowels
        if item[5] in vowels or item[6] in words: continue
        chosen.append(item); vowels.add(item[5]); words.add(item[6])
        if len(chosen) == n: break
    for item in lst:
        if len(chosen) == n: break
        if item[6] in words: continue
        chosen.append(item); words.add(item[6])
    return [{'s': x[1], 'v': x[2], 'w': x[3], 'pos': x[4], 'vowel': x[5], 'ar': x[6]} for x in chosen]

result = {lid: pick(lst) for lid, lst in cands.items()}
result['alif'] = pick(alif)
json.dump(result, open(out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
for k, v in result.items(): print(k, [f"{x['ar']} ({x['s']}:{x['v']})" for x in v])
