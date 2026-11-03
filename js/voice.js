/* Huruf — hearing individual letters.

   SWITCHED OFF for now: there is no good recording of each letter on its own yet.
   While it is off, no "Hear" buttons or recording tools appear anywhere.

   To switch it on later, set `enabled: true` below and pick a source:
     source: 'files'    put recordings in audio/letters/ named by letter id:
                          baa.mp3        the letter's name ("Bá")
                          baa-a.mp3      with fatḥa ("bá")
                          baa-i.mp3      with kasra ("bi")
                          baa-u.mp3      with ḍamma ("bu")
                        Letter ids are in js/data.js (alif, baa, taa, thaa, jeem, Haa, khaa, …).
     source: 'teacher'  shows a "Record your teacher" card on the Letters page; the clips are
                        saved in this browser and used for every Hear button.
   Teacher clips, when they exist, are always preferred over files. */
(function (Q) {
  'use strict';

  Q.LETTER_AUDIO = {
    enabled: false,
    source: 'files',
    dir: 'audio/letters/',
    ext: 'mp3',
  };

  /* ---------- teacher recordings (IndexedDB) ---------- */
  const DB = 'huruf-voice', STORE = 'clips';
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('no-indexeddb'));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(d => new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
    }));
  }
  let keys = null;
  const player = new Audio();
  let playingUrl = null;
  const playUrl = url => new Promise(res => {
    Q.audio && Q.audio.stop();
    player.src = url;
    player.onended = () => res(true);
    player.onerror = () => res(false);
    player.play().catch(() => res(false));
  });

  Q.voice = {
    /* keys look like "name:baa" (the letter's name) or "sound:baa:a" (bá, bi, bu…) */
    async keys() {
      if (!keys) { try { keys = new Set(await tx('readonly', s => s.getAllKeys())); } catch (e) { keys = new Set(); } }
      return keys;
    },
    async has(key) { return (await Q.voice.keys()).has(key); },
    async save(key, blob) { await tx('readwrite', s => s.put(blob, key)); (await Q.voice.keys()).add(key); },
    async remove(key) { await tx('readwrite', s => s.delete(key)); (await Q.voice.keys()).delete(key); },
    async play(key) {
      const blob = await tx('readonly', s => s.get(key));
      if (!blob) return false;
      if (playingUrl) URL.revokeObjectURL(playingUrl);
      playingUrl = URL.createObjectURL(blob);
      return playUrl(playingUrl);
    },
    stop() { player.pause(); },
    canRecord: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.indexedDB),
  };

  /* Is hearing letters switched on? (and, for the recording card, is the teacher source chosen) */
  Q.letterAudioOn = () => !!Q.LETTER_AUDIO.enabled;
  Q.teacherRecordingOn = () => Q.letterAudioOn() && Q.LETTER_AUDIO.source === 'teacher' && Q.voice.canRecord;

  /* simple recorder: start() → stop() resolves a Blob */
  Q.voice.recorder = function () {
    let media = null, stream = null, chunks = [];
    return {
      async start() {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        media = new MediaRecorder(stream);
        media.ondataavailable = e => chunks.push(e.data);
        media.start();
      },
      stop() {
        return new Promise(resolve => {
          if (!media || media.state !== 'recording') return resolve(null);
          media.onstop = () => { stream.getTracks().forEach(t => t.stop()); resolve(new Blob(chunks, { type: media.mimeType || 'audio/webm' })); };
          media.stop();
        });
      },
      get recording() { return !!media && media.state === 'recording'; },
      dispose() { try { if (media && media.state === 'recording') media.stop(); } catch (e) { /* ignore */ } if (stream) stream.getTracks().forEach(t => t.stop()); },
    };
  };

  /* Hear a letter (name) or a letter with a vowel. Does nothing while the switch is off. */
  Q.hearLetter = async function (id, vowel) {
    if (!Q.letterAudioOn()) return false;
    const k = vowel ? `sound:${id}:${vowel}` : `name:${id}`;
    if (await Q.voice.has(k)) return Q.voice.play(k);
    if (Q.LETTER_AUDIO.source !== 'files') return false;
    const { dir, ext } = Q.LETTER_AUDIO;
    const ok = await playUrl(`${dir}${id}${vowel ? '-' + vowel : ''}.${ext}`);
    if (!ok && vowel) return playUrl(`${dir}${id}.${ext}`);
    return ok;
  };
})(window.Q = window.Q || {});
