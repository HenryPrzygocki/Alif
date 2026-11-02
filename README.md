# Huruf

A personal practice desk for learning to read the Quran, starting from the letters. It follows the six-book **Iqra** method and counts down to Ramadan.

## What's in it

| Page | What it does |
|---|---|
| **Today** | Ramadan countdown, your Iqra book and pace, today's goal, your trickiest letters, quick-start drills |
| **Practice** | Read a row out loud, reveal, click what you got wrong. Four modes: *Letter names*, *Read the sounds* (fatḥa / kasra / ḍamma / tanwīn), *Joined letters*, *Spot the letter* (multiple choice between look-alikes). Weak letters come up more often. Fully keyboard-driven: `Space` reveal/next, `1`–`9` mark wrong |
| **Letters** | All 28 letters + hamza grouped by shape, with name, sound, pronunciation tip, positional forms, vowels, look-alikes and your record. Vowel-mark reference |
| **Keyboard** | Type Arabic with Latin keys, using the [Lexilogos Quranic keyboard](https://www.lexilogos.com/keyboard/arabic_quranic.htm) layout (`t'` → ث, `=a` → fatḥa…). Shows each letter by name as you type. Switch between Uthmani (Madani), Indo-Pak and other fonts |
| **Progress** | Practice calendar up to Ramadan, 30-day trends (volume, accuracy, seconds per letter), mastery of every letter, mix-ups, hardest syllables, sessions |
| **Setup** | Iqra book, daily goal, Ramadan date override, font, theme, backup / restore |

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
js/views/*.js       one file per page
js/app.js           navigation, theme, font
```

Plain JavaScript, no framework. New drills mostly mean new data in `js/data.js` plus a generator in `js/views/practice.js`.

## Ideas for next modules

- Long vowels (بَا بِي بُو) and sukūn pairs (أَبْ) for Iqra 2–4
- Shadda, sun and moon letters, the name Allah (Iqra 5)
- Real words from Juz ʿAmma, with Quran.com word-by-word audio
- Teacher recordings for each letter; record yourself and compare
- Typing practice on the Lexilogos layout
- Follow-along reading of short sūrahs with word highlighting
- Tajwīd colour-coding

## Credits

- **KFGQPC Uthmanic Script Hafs** font by the King Fahd Glorious Quran Printing Complex, and the **IndoPak Nastaleeq** font, both as distributed by [Quran.com](https://github.com/quran/quran.com-frontend-next)
- Amiri Quran, Scheherazade New, Noto Naskh Arabic, Literata, Instrument Sans and JetBrains Mono via Google Fonts
- Typing layout follows [Lexilogos](https://www.lexilogos.com/keyboard/arabic_quranic.htm)
- Lesson order follows *Iqra: Cara Cepat Belajar Membaca Al-Qur'an* by KH. As'ad Humam
