/* Huruf — content data.
   Everything the app teaches lives here, so new modules mostly mean new data. */
(function (Q) {
  'use strict';

  // Arabic combining marks (Unicode)
  const M = {
    fatha: 'َ', kasra: 'ِ', damma: 'ُ', sukun: 'ْ', shadda: 'ّ',
    fathatan: 'ً', kasratan: 'ٍ', dammatan: 'ٌ',
    daggerAlif: 'ٰ', maddah: 'ٓ',
  };
  Q.MARK = M;

  /* The 28 letters plus hamza.
     key   = Lexilogos Quranic keyboard key
     tr    = consonant sound used to build syllables (ba, bi, bu…)
     joins = does the letter connect to the letter after it?
     heavy = one of the seven "full mouth" letters (خ ص ض غ ط ق ظ)
     like  = letters that look similar  · soundLike = letters that sound similar */
  Q.LETTERS = [
    { id: 'alif', ch: 'ا', name: 'Alif', key: 'a', tr: '', joins: false, group: 'alif',
      like: ['laam'], soundLike: ['ayn'],
      tip: 'A silent seat. It carries a hamza (أ) or makes the vowel before it long (baa). Iqra 1 reads أَ as a plain "a".' },
    { id: 'baa', ch: 'ب', name: 'Baa', key: 'b', tr: 'b', joins: true, group: 'baa',
      like: ['taa', 'thaa', 'noon', 'yaa'], soundLike: [],
      tip: 'Like the b in "bat". One dot below.' },
    { id: 'taa', ch: 'ت', name: 'Taa', key: 't', tr: 't', joins: true, group: 'baa',
      like: ['baa', 'thaa', 'noon', 'yaa'], soundLike: ['taaH'],
      tip: 'A light t. Tongue tip touches just behind the upper front teeth. Two dots above.' },
    { id: 'thaa', ch: 'ث', name: 'Thaa', key: "t'", tr: 'th', joins: true, group: 'baa',
      like: ['taa', 'baa', 'noon'], soundLike: ['seen', 'dhaal'],
      tip: 'The "th" in "think". Tongue tip slightly out between the teeth. Three dots above.' },
    { id: 'jeem', ch: 'ج', name: 'Jeem', key: 'j', tr: 'j', joins: true, group: 'jeem',
      like: ['Haa', 'khaa'], soundLike: [],
      tip: 'The j in "jam". One dot inside, below the curve.' },
    { id: 'Haa', ch: 'ح', name: 'Ḥaa', alt: 'throat h', key: 'H', tr: 'ḥ', joins: true, group: 'jeem',
      like: ['jeem', 'khaa'], soundLike: ['haa'],
      tip: 'A strong, breathy h from the middle of the throat, like breathing hard to fog up glass. No dots. Not the soft ه.' },
    { id: 'khaa', ch: 'خ', name: 'Khaa', key: "H'", tr: 'kh', joins: true, group: 'jeem', heavy: true,
      like: ['Haa', 'jeem'], soundLike: ['ghayn', 'qaaf'],
      tip: 'Like "ch" in Scottish "loch" or German "Bach". Made at the top of the throat. A heavy letter. One dot above.' },
    { id: 'daal', ch: 'د', name: 'Daal', key: 'd', tr: 'd', joins: false, group: 'daal',
      like: ['dhaal', 'raa'], soundLike: ['Daad'],
      tip: 'The d in "dog". A light letter. Does not join to the next letter.' },
    { id: 'dhaal', ch: 'ذ', name: 'Dhaal', key: "d'", tr: 'dh', joins: false, group: 'daal',
      like: ['daal', 'zaay'], soundLike: ['zaay', 'Zaa'],
      tip: 'The "th" in "this" (voiced). Tongue tip between the teeth. Light. One dot above.' },
    { id: 'raa', ch: 'ر', name: 'Raa', key: 'r', tr: 'r', joins: false, group: 'raa',
      like: ['zaay', 'daal', 'waaw'], soundLike: [],
      tip: 'A tapped or rolled r, like Spanish "pero". Usually heavy with fatha and damma, light with kasra.' },
    { id: 'zaay', ch: 'ز', name: 'Zaay', key: 'z', tr: 'z', joins: false, group: 'raa',
      like: ['raa', 'dhaal'], soundLike: ['dhaal', 'Zaa'],
      tip: 'The z in "zoo". Like raa with one dot above.' },
    { id: 'seen', ch: 'س', name: 'Seen', key: 's', tr: 's', joins: true, group: 'seen',
      like: ['sheen', 'Saad'], soundLike: ['Saad', 'thaa'],
      tip: 'A light s, like "see". Three little teeth, no dots.' },
    { id: 'sheen', ch: 'ش', name: 'Sheen', key: "s'", tr: 'sh', joins: true, group: 'seen',
      like: ['seen', 'thaa'], soundLike: [],
      tip: 'The "sh" in "she". Seen with three dots above.' },
    { id: 'Saad', ch: 'ص', name: 'Ṣaad', alt: 'heavy s', key: 'S', tr: 'ṣ', joins: true, group: 'Saad', heavy: true,
      like: ['Daad', 'Taa'], soundLike: ['seen'],
      tip: 'A heavy s. Raise the back of the tongue so the mouth feels full and the sound comes out deep.' },
    { id: 'Daad', ch: 'ض', name: 'Ḍaad', alt: 'heavy d', key: 'D', tr: 'ḍ', joins: true, group: 'Saad', heavy: true,
      like: ['Saad', 'Zaa'], soundLike: ['daal', 'Zaa'],
      tip: 'A heavy d made with the side of the tongue against the upper back teeth. Unique to Arabic, so drill it with your teacher.' },
    { id: 'Taa', ch: 'ط', name: 'Ṭaa', alt: 'heavy t', key: 'T', tr: 'ṭ', joins: true, group: 'Taa', heavy: true,
      like: ['Zaa', 'Saad'], soundLike: ['taa'],
      tip: 'A heavy t. Same spot as ت, but with the back of the tongue raised and a full, deep sound.' },
    { id: 'Zaa', ch: 'ظ', name: 'Ẓaa', alt: 'heavy dh', key: 'Z', tr: 'ẓ', joins: true, group: 'Taa', heavy: true,
      like: ['Taa', 'Daad'], soundLike: ['dhaal', 'zaay', 'Daad'],
      tip: 'A heavy "th" as in "this". Tongue between the teeth like ذ, but deep and full.' },
    { id: 'ayn', ch: 'ع', name: 'ʿAyn', key: 'g', tr: 'ʿ', joins: true, group: 'ayn',
      like: ['ghayn', 'hamza'], soundLike: ['alif', 'hamza'],
      tip: 'A squeezed sound from the middle of the throat. There is nothing like it in English, so copy your teacher closely.' },
    { id: 'ghayn', ch: 'غ', name: 'Ghayn', key: "g'", tr: 'gh', joins: true, group: 'ayn', heavy: true,
      like: ['ayn', 'faa'], soundLike: ['khaa'],
      tip: 'Like a gargle, or the French r in "Paris". Top of the throat. A heavy letter. ʿAyn with a dot.' },
    { id: 'faa', ch: 'ف', name: 'Faa', key: 'f', tr: 'f', joins: true, group: 'faa',
      like: ['qaaf', 'ghayn'], soundLike: [],
      tip: 'The f in "fish". One dot above.' },
    { id: 'qaaf', ch: 'ق', name: 'Qaaf', key: 'q', tr: 'q', joins: true, group: 'faa', heavy: true,
      like: ['faa', 'waaw'], soundLike: ['kaaf', 'khaa'],
      tip: 'A deep k from the very back of the tongue, near the throat. Heavy. Two dots above.' },
    { id: 'kaaf', ch: 'ك', name: 'Kaaf', key: 'k', tr: 'k', joins: true, group: 'kaaf',
      like: ['laam'], soundLike: ['qaaf'],
      tip: 'A light k, like "kite". Made further forward than ق.' },
    { id: 'laam', ch: 'ل', name: 'Laam', key: 'l', tr: 'l', joins: true, group: 'kaaf',
      like: ['alif', 'kaaf'], soundLike: [],
      tip: 'The l in "lip". Light, except in the name Allah after a fatha or damma.' },
    { id: 'meem', ch: 'م', name: 'Meem', key: 'm', tr: 'm', joins: true, group: 'meem',
      like: ['haa', 'faa'], soundLike: ['noon'],
      tip: 'The m in "moon".' },
    { id: 'noon', ch: 'ن', name: 'Noon', key: 'n', tr: 'n', joins: true, group: 'meem',
      like: ['baa', 'taa', 'yaa'], soundLike: ['meem'],
      tip: 'The n in "noon". One dot above a deep bowl.' },
    { id: 'haa', ch: 'ه', name: 'Haa', alt: 'soft h', key: 'h', tr: 'h', joins: true, group: 'meem',
      like: ['meem', 'waaw'], soundLike: ['Haa'],
      tip: 'A soft, airy h like "hat", from the deepest part of the throat. Not the strong ح.' },
    { id: 'waaw', ch: 'و', name: 'Waaw', key: 'w', tr: 'w', joins: false, group: 'waaw',
      like: ['raa', 'qaaf', 'meem'], soundLike: [],
      tip: 'The w in "wet". After a damma it makes a long "oo". Does not join to the next letter.' },
    { id: 'yaa', ch: 'ي', name: 'Yaa', key: 'y', tr: 'y', joins: true, group: 'waaw',
      like: ['noon', 'baa', 'taa'], soundLike: [],
      tip: 'The y in "yes". After a kasra it makes a long "ee". Two dots below.' },
    { id: 'hamza', ch: 'ء', name: 'Hamza', key: '-', tr: 'ʾ', joins: false, group: 'waaw',
      like: ['ayn'], soundLike: ['ayn', 'alif'], noSound: true,
      tip: 'A quick catch in the throat, like the break in "uh-oh". It often sits on an alif (أ), waaw (ؤ) or yaa (ئ).' },
  ];

  Q.L = {};
  Q.LETTERS.forEach((l, i) => { l.order = i; Q.L[l.id] = l; });

  // Shape families, in alphabet order. Used for picking what to practise.
  Q.GROUPS = [
    { id: 'alif', label: 'ا' },
    { id: 'baa', label: 'ب ت ث' },
    { id: 'jeem', label: 'ج ح خ' },
    { id: 'daal', label: 'د ذ' },
    { id: 'raa', label: 'ر ز' },
    { id: 'seen', label: 'س ش' },
    { id: 'Saad', label: 'ص ض' },
    { id: 'Taa', label: 'ط ظ' },
    { id: 'ayn', label: 'ع غ' },
    { id: 'faa', label: 'ف ق' },
    { id: 'kaaf', label: 'ك ل' },
    { id: 'meem', label: 'م ن ه' },
    { id: 'waaw', label: 'و ي ء' },
  ];
  Q.GROUPS.forEach(g => { g.letters = Q.LETTERS.filter(l => l.group === g.id).map(l => l.id); });

  /* Vowel marks used by the "Read the sounds" drills. */
  Q.VOWELS = {
    a:  { id: 'a',  mark: M.fatha,    name: 'Fatḥa',  suffix: 'a' },
    i:  { id: 'i',  mark: M.kasra,    name: 'Kasra',  suffix: 'i' },
    u:  { id: 'u',  mark: M.damma,    name: 'Ḍamma',  suffix: 'u' },
    an: { id: 'an', mark: M.fathatan, name: 'Tanwīn fatḥ', suffix: 'an' },
    in: { id: 'in', mark: M.kasratan, name: 'Tanwīn kasr', suffix: 'in' },
    un: { id: 'un', mark: M.dammatan, name: 'Tanwīn ḍamm', suffix: 'un' },
  };

  /* Build the written form + sound for one letter carrying one vowel. */
  Q.syllable = function (letterId, vowelId) {
    const l = Q.L[letterId];
    const v = Q.VOWELS[vowelId];
    let ch = l.ch;
    if (letterId === 'alif') {
      // Alif can't carry a vowel itself; Iqra writes it with hamza: أَ إِ أُ
      ch = (vowelId === 'i' || vowelId === 'in') ? 'إ' : 'أ';
    }
    return { text: ch + v.mark, sound: (l.tr || '') + v.suffix };
  };

  /* Written forms by position, using the zero-width joiner to force shaping. */
  const ZWJ = '‍';
  Q.forms = function (letterId) {
    const l = Q.L[letterId];
    if (l.id === 'hamza') return { isolated: l.ch };
    if (!l.joins) return { isolated: l.ch, final: ZWJ + l.ch };
    return { isolated: l.ch, initial: l.ch + ZWJ, medial: ZWJ + l.ch + ZWJ, final: ZWJ + l.ch };
  };

  /* Marks reference (harakat). key = keyboard sequence in this app. */
  Q.MARKS = [
    { id: 'fatha', mark: M.fatha, name: 'Fatḥa', key: '=a', sound: 'a', what: 'A small slanted line above. Short "a".' },
    { id: 'kasra', mark: M.kasra, name: 'Kasra', key: '=i', sound: 'i', what: 'A small slanted line below. Short "i".' },
    { id: 'damma', mark: M.damma, name: 'Ḍamma', key: '=u', sound: 'u', what: 'A tiny waaw above. Short "u".' },
    { id: 'sukun', mark: M.sukun, name: 'Sukūn', key: '=o', sound: '–', what: 'No vowel: the letter closes the syllable, as in أَبْ "ab". In the Madani mushaf it looks like a small open head.' },
    { id: 'shadda', mark: M.shadda, name: 'Shadda', key: '=w', sound: '×2', what: 'The letter is doubled, as in أَبَّ "abba". Sits with a vowel mark.' },
    { id: 'fathatan', mark: M.fathatan, name: 'Tanwīn fatḥ', key: '==a', sound: 'an', what: 'Two fatḥas. Adds an "n" sound: "an".' },
    { id: 'kasratan', mark: M.kasratan, name: 'Tanwīn kasr', key: '==i', sound: 'in', what: 'Two kasras. "in".' },
    { id: 'dammatan', mark: M.dammatan, name: 'Tanwīn ḍamm', key: '==u', sound: 'un', what: 'Two ḍammas. "un".' },
    { id: 'dagger', mark: M.daggerAlif, name: 'Small alif', key: '=A', sound: 'aa', what: 'A small upright alif above. Read a long "aa", as in ٱلرَّحْمَٰنِ.' },
    { id: 'maddah', mark: M.maddah, name: 'Madda', key: '=~', sound: 'long', what: 'A wavy line. Stretch the sound longer than normal.' },
  ];

  /* The six Iqra volumes, summarised. Editions vary a little. */
  Q.IQRA = [
    { n: 1, title: 'Single letters with fatḥa', covers: 'Every letter read with fatḥa: أَ بَ تَ … read as a, ba, ta. No letter names, just sounds.', mode: 'sounds', marks: ['a'] },
    { n: 2, title: 'Joined letters and long a', covers: 'Letters joined into words, with fatḥa. The long "aa" made by alif.', mode: 'joined', marks: ['a'] },
    { n: 3, title: 'Kasra and ḍamma', covers: 'The i and u vowels, then long ee (ي) and oo (و).', mode: 'sounds', marks: ['a', 'i', 'u'] },
    { n: 4, title: 'Tanwīn and sukūn', covers: 'an / in / un, letters with sukūn, and the bouncing qalqala letters.', mode: 'sounds', marks: ['a', 'i', 'u', 'an', 'in', 'un'] },
    { n: 5, title: 'Shadda, al- and stopping', covers: 'Shadda, the two kinds of al- (moon and sun letters), the name Allah, and how to stop at the end of a verse.', mode: 'joined', marks: ['a', 'i', 'u', 'an', 'in', 'un'] },
    { n: 6, title: 'Tajwīd and real verses', covers: 'Noon sākin and tanwīn rules, the long madd, the opening letters of some sūrahs, and reading Quranic verses.', mode: 'joined', marks: ['a', 'i', 'u', 'an', 'in', 'un'] },
  ];

  /* Practice modes */
  Q.MODES = [
    { id: 'names', label: 'Letter names', short: 'Names', desc: 'See a letter, say its name.' },
    { id: 'sounds', label: 'Read the sounds', short: 'Sounds', desc: 'Letters with vowel marks. Say ba, bi, bu…' },
    { id: 'joined', label: 'Joined letters', short: 'Joined', desc: 'Short joined groups, read syllable by syllable.' },
    { id: 'quiz', label: 'Spot the letter', short: 'Spot it', desc: 'Pick the right letter from look-alikes.' },
  ];
  Q.MODE = Object.fromEntries(Q.MODES.map(m => [m.id, m]));

  /* Arabic fonts the user can switch between. */
  Q.FONTS = [
    { id: 'hafs', label: 'Uthmani · Madani mushaf', css: "'Uthmanic Hafs', 'Amiri Quran', 'Scheherazade New', serif", note: 'The King Fahd Complex font used by Quran.com. Matches the common Madani mushaf.' },
    { id: 'indopak', label: 'Indo-Pak', css: "'IndoPak Nastaleeq', 'Scheherazade New', serif", note: 'The South Asian mushaf style, used by Quran.com\'s Indo-Pak option.' },
    { id: 'amiri', label: 'Amiri Quran', css: "'Amiri Quran', 'Scheherazade New', serif", note: 'Classic Naskh book style.' },
    { id: 'scheherazade', label: 'Scheherazade New', css: "'Scheherazade New', 'Amiri Quran', serif", note: 'Open, roomy letters. Easy for beginners.' },
    { id: 'naskh', label: 'Noto Naskh (plain)', css: "'Noto Naskh Arabic', 'Scheherazade New', serif", note: 'A plain everyday style, like signs and websites.' },
  ];
  Q.FONT = Object.fromEntries(Q.FONTS.map(f => [f.id, f]));
})(window.Q = window.Q || {});
