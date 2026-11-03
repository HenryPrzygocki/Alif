# Huruf

A personal practice desk for learning to read the Quran and memorize surahs. It follows the six-book **Iqra** method for the alphabet and counts down to Ramadan.

## What's in it

| Page | What it does |
|---|---|
| **Surahs** | Al-Fātiḥah and all of Juz ʿAmma. Each surah has three steps: **Listen** (Al-Ḥuṣarī verse by verse, tap any word to hear it, repeat each verse, pause for you to repeat, loop), **Learn** (one verse at a time: listen & repeat, say it from memory while words fade away, then join it to the verses before; record yourself and compare) and **Test** (say it from memory, put the words in order, what comes next). Transliteration first by default, or both, or Arabic only |
| **Review** | Spaced review of every verse you have learned: back after 1 day, 3, 7, 14, 30, 60. Say it, reveal, grade yourself |
| **Today** | Ramadan countdown (first taraweeh Sun 7 Feb 2027, first fast Mon 8 Feb), your Iqra book and pace, today's goal, your trickiest letters, quick-start drills |
| **Practice** | *Read aloud* (you mark yourself): Letter names, Read the sounds (fatḥa / kasra / ḍamma / tanwīn), Joined letters. Say the row, reveal, click what you missed. *Quiz* (the site checks): Letter → sound, Sound → letter, Letter ↔ name, with look-alike distractors and an explanation when you miss. Transliteration in **Português (Brasil)** (só, chá, rhó; Iqra style) or **English** (ṣa, sha, kha), switchable anywhere. Weak letters come up more often. Keyboard: `Space` reveal/next, `1`–`9` mark or answer, `O` hide options |
| **Letters** | All 28 letters + hamza grouped by shape, with name, sound, pronunciation tip, positional forms, vowels, look-alikes and your record. Vowel-mark reference |
| **Keyboard** | Type Arabic with Latin keys, using the [Lexilogos Quranic keyboard](https://www.lexilogos.com/keyboard/arabic_quranic.htm) layout (`t'` → ث, `=a` → fatḥa…). Shows each letter by name as you type. Switch between Uthmani (Madani), Indo-Pak and other fonts |
| **Progress** | Practice calendar up to Ramadan, 30-day trends (volume, accuracy, seconds per letter), mastery of every letter, mix-ups, hardest syllables, sessions |
| **Setup** | Iqra book, daily goal, optional Ramadan date override, font, theme, backup / restore |

Progress is saved in the browser (`localStorage`). Use **Setup → Download backup** now and then.

## Run it

No build step. Any static server works:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

### Publish with GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. The site appears at `https://<username>.github.io/<repo>/`.

## How the code is laid out

```
index.html          shell + script tags
css/app.css         all styles (colour tokens at the top, light + dark)
fonts/              Quran fonts (self-hosted)
js/core.js          helpers: element builder, dates, storage, random
js/data.js          ← the content: letters, groups, vowels, marks, Iqra books, modes, fonts
js/store.js         saved progress + derived stats (mastery, streaks, weak letters)
js/ramadan.js       next Ramadan from the Umm al-Qura calendar (overridable)
js/translit.js      Latin → Arabic typing engine
js/quran-translit.js  Uthmani text → transliteration that follows recitation (waṣl, sun letters, idgham, iqlab, stops)
js/quran.js         surah data loading + recitation audio (repeat, pauses, word timings)
data/quran/         surah text, word meanings, EN/PT translations (built by tools/build_quran.py)
js/views/*.js       one file per page
js/app.js           navigation, theme, font
```

Plain JavaScript, no framework. New drills mostly mean new data in `js/data.js` plus a generator in `js/views/practice.js`.

## Letter audio (switched off)

Hearing individual letters is built but turned off until there is a good recording of each letter on its own.
To turn it on, edit the top of `js/voice.js`: set `enabled: true` and either

- `source: 'files'` and add recordings to `audio/letters/` — `baa.mp3` (the name), `baa-a.mp3`, `baa-i.mp3`, `baa-u.mp3`, … (letter ids are in `js/data.js`), or
- `source: 'teacher'` to get a "Record your teacher" card on the Letters page (clips saved in the browser).

Then ▶ Hear buttons appear on the Letters page, after revealing a practice row, and in quiz feedback.

## Ideas for next modules

- Long vowels (بَا بِي بُو) and sukūn pairs (أَبْ) for Iqra 2–4
- Shadda, sun and moon letters, the name Allah (Iqra 5)
- Real words from Juz ʿAmma, with Quran.com word-by-word audio
- Teacher recordings for each letter; record yourself and compare
- Typing practice on the Lexilogos layout
- Follow-along reading of short sūrahs with word highlighting
- Tajwīd colour-coding

## Credits

- Quran text: Uthmani script from [QuranEnc](https://quranenc.com) via the `quran-cloud` package (CC BY 4.0), English translation Saheeh International
- Word-by-word meanings: [Quran.com](https://quran.com) (via `@kmaslesa/holy-quran-word-by-word-full-data`)
- Portuguese translation: Helmi Nasr, via [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api)
- Recitation: Mahmoud Khalil Al-Ḥuṣarī (murattal and muʿallim) streamed from [EveryAyah](https://everyayah.com) and Quran.com; word timings from the Quran.com API when it is reachable

- **KFGQPC Uthmanic Script Hafs** font by the King Fahd Glorious Quran Printing Complex, and the **IndoPak Nastaleeq** font, both as distributed by [Quran.com](https://github.com/quran/quran.com-frontend-next)
- Amiri Quran, Scheherazade New, Noto Naskh Arabic, Literata, Instrument Sans and JetBrains Mono via Google Fonts
- Typing layout follows [Lexilogos](https://www.lexilogos.com/keyboard/arabic_quranic.htm)
- Lesson order follows *Iqra: Cara Cepat Belajar Membaca Al-Qur'an* by KH. As'ad Humam
