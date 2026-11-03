/* Huruf — human voices for letters.
   1. Your teacher's recordings, saved in this browser (IndexedDB).
   2. Real Quran words that show each letter, from Quran.com's word-by-word recordings. */
(function (Q) {
  'use strict';

  /* ---------- teacher recordings ---------- */
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
  let keys = null;   // cached set of saved keys
  const player = new Audio();
  let playingUrl = null;

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
      Q.audio && Q.audio.stop();
      if (playingUrl) URL.revokeObjectURL(playingUrl);
      playingUrl = URL.createObjectURL(blob);
      player.src = playingUrl;
      await new Promise(res => { player.onended = res; player.onerror = res; player.play().catch(res); });
      return true;
    },
    stop() { player.pause(); },
    available: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.indexedDB),
  };

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

  /* ---------- Quran example words ---------- */
  let examples = null;
  Q.letterExamples = async function (id) {
    if (!examples) {
      try { const r = await fetch('data/letter-examples.json'); examples = r.ok ? await r.json() : {}; }
      catch (e) { examples = {}; }
    }
    return examples[id] || [];
  };

  /* Hear a letter: teacher recording first, else the first Quran example word */
  Q.hearLetter = async function (id, vowel) {
    const k = vowel ? `sound:${id}:${vowel}` : `name:${id}`;
    if (await Q.voice.has(k)) return Q.voice.play(k);
    if (vowel && await Q.voice.has(`sound:${id}:a`)) return Q.voice.play(`sound:${id}:a`);
    const ex = await Q.letterExamples(id);
    const pick = (vowel && ex.find(e => e.vowel === vowel)) || ex[0];
    if (!pick) return false;
    Q.voice.stop();
    await Q.audio.word(pick.s, pick.v, pick.w, 'husary').catch(() => Q.toast('Could not play the audio. Check your connection.'));
    return true;
  };
})(window.Q = window.Q || {});
