/* ============================================================================
   app.js — shared runtime for every page
   ----------------------------------------------------------------------------
   Contains:
     • store        : reactive state persisted to localStorage (XP, streak,
                      progress, bookmarks, favourites, theme, translations)
     • utils        : speak() / copy() / shuffle() / normalise()
     • components   : <site-header>, <nav-drawer>, <progress-bar>, <toast-host>
     • createPage() : boots a Vue app with every shared component registered
   Loaded as a classic script (no ES modules) so the pages also work from
   the file:// protocol without a local server.
   ========================================================================== */
(function () {
  'use strict';

  const { reactive, computed, watch, ref } = Vue;

  /* Bumped on every change to the audio engine. Shown on the diagnostics page
     so a stale cached copy of this file can be spotted immediately. */
  const BUILD = 'voci-8';

  /* Every level (A1, A2, B1…) keeps its own progress bucket, so the store key
     is derived from the level declared by the page.  Pages set
     window.ITA_LEVEL = 'A2' before loading this file. */
  const LEVEL = window.ITA_LEVEL || 'A2';
  const KEY = 'italiano::' + LEVEL + '::v1';

  /* Relative links differ between the root landing page and a level folder. */
  const PATHS = Object.assign({
    home: 'index.html',       // course home for the current level
    levels: '../index.html',  // root level-picker
    base: ''                  // prefix for lesson links ('A2/' from the root page)
  }, window.ITA_PATHS || {});

  /* --------------------------------------------------------------------
     1. PERSISTED STATE
     ------------------------------------------------------------------ */
  const defaults = {
    theme: null,          // 'light' | 'dark' | null (follow system)
    xp: 0,
    streak: 0,
    lastDay: null,        // 'YYYY-MM-DD' of the last active day
    bestStreak: 0,
    completed: {},        // { '05-passato-prossimo.html': true }
    scores: {},           // { file: { correct, total, pct } }
    bookmarks: [],        // [file, ...]
    favorites: [],        // ['mangiare', ...] favourite verbs / words
    hideTranslations: false,
    known: {},            // { 'word-id': true } vocabulary marked as learned
    /* Voice settings.
       mode    'auto'   → characters are dealt the available Italian voices in
                          order of appearance (e.g. Google italiano, Alice)
               'single' → one voice for everybody
       base    pins one voice for everybody, overriding the rotation
       byName  per-character override: { 'Giulia': 'Alice' } */
    voices: { mode: 'auto', base: null, byName: {} }
  };

  function load() {
    let saved = null;
    try {
      const raw = localStorage.getItem(KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) { /* corrupt or private mode → start fresh */ }

    const state = Object.assign({}, defaults, saved || {});

    /* Object.assign is SHALLOW: a `voices` object saved by an older version of
       the app would replace the default wholesale and arrive without `byName`,
       breaking every per-character voice lookup. Rebuild nested shapes here so
       upgrading never leaves half-migrated state behind. */
    state.voices = Object.assign(
      { mode: 'auto', base: null, f: null, m: null, byName: {} },
      state.voices || {}
    );
    // 'multi' was an earlier name for the system-voice mode.
    if (state.voices.mode === 'multi') state.voices.mode = 'system';
    if (!state.voices.byName || typeof state.voices.byName !== 'object') {
      state.voices.byName = {};
    }
    return state;
  }

  const store = reactive(load());

  // Persist on every change (deep watch — the state object is small).
  watch(store, () => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
  }, { deep: true });

  /* --------------------------------------------------------------------
     2. THEME
     ------------------------------------------------------------------ */
  function systemDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function effectiveTheme() {
    return store.theme || (systemDark() ? 'dark' : 'light');
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', effectiveTheme());
  }
  function toggleTheme() {
    store.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme();
  }
  applyTheme();

  /* --------------------------------------------------------------------
     3. XP / STREAK
     ------------------------------------------------------------------ */
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  /** Called once per page load: keeps the daily streak honest. */
  function touchStreak() {
    const t = today();
    if (store.lastDay === t) return;
    if (store.lastDay && daysBetween(store.lastDay, t) === 1) store.streak += 1;
    else store.streak = 1;
    store.lastDay = t;
    if (store.streak > store.bestStreak) store.bestStreak = store.streak;
  }
  function addXp(n) {
    store.xp += n;
    toast('+' + n + ' XP');
  }
  const level = computed(() => Math.floor(store.xp / 100) + 1);
  const levelPct = computed(() => store.xp % 100);

  /* --------------------------------------------------------------------
     4. PROGRESS HELPERS
     ------------------------------------------------------------------ */
  const lessons = window.LESSONS || [];
  const completedCount = computed(() => lessons.filter(l => store.completed[l.file]).length);
  const coursePct = computed(() => lessons.length ? Math.round(completedCount.value / lessons.length * 100) : 0);

  function markComplete(file) {
    if (!store.completed[file]) {
      store.completed[file] = true;
      addXp(50);
      toast('Lezione completata! 🎉  +50 XP');
    }
  }
  function toggleBookmark(file) {
    const i = store.bookmarks.indexOf(file);
    if (i >= 0) { store.bookmarks.splice(i, 1); toast('Segnalibro rimosso'); }
    else { store.bookmarks.push(file); toast('Lezione salvata 🔖'); }
  }
  function toggleFavorite(id) {
    const i = store.favorites.indexOf(id);
    if (i >= 0) store.favorites.splice(i, 1); else store.favorites.push(id);
  }
  const isFavorite = (id) => store.favorites.indexOf(id) >= 0;

  /* --------------------------------------------------------------------
     5. UTILITIES
     ------------------------------------------------------------------ */
  const hasTTS = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  let voices = [];        // cached voice list
  let warnedNoVoice = false;

  /* Browsers populate getVoices() asynchronously: the very first call almost
     always returns []. If we speak before the list is ready, no voice is
     assigned and the engine falls back to the UI language (English), which is
     why Italian text used to be read with an English accent. So: cache the
     list, refresh it on 'voiceschanged', and postpone speaking until it
     arrives. */
  /* Counter bumped whenever the voice list changes. Components read it (via
     voicesFor) so that a list arriving late re-renders the UI. The voice
     objects themselves are deliberately kept OUT of Vue's reactive system:
     wrapping a SpeechSynthesisVoice in a Proxy makes the engine reject it
     when assigned to utterance.voice. */
  const voiceTick = ref(0);

  /* Live record of the last utterance actually sent to the engine — the
     diagnostics page reads this, so what you see is what really happened. */
  const lastSpoken = reactive({
    n: 0, voice: '—', local: false, pitch: 1, rate: 1,
    speaker: '—', index: '—', text: ''
  });

  function refreshVoices() {
    if (!hasTTS) return;
    const v = window.speechSynthesis.getVoices();
    if (v && v.length && v.length !== voices.length) {
      voices = v;
      voiceTick.value++;
    }
  }
  if (hasTTS) {
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    /* Some builds of Chrome and Safari never fire 'voiceschanged' when the
       list is populated after page load, so poll briefly as a safety net. */
    let tries = 0;
    const poll = setInterval(() => {
      refreshVoices();
      if (++tries > 10 || voices.length) clearInterval(poll);
    }, 300);
  }

  const normLang = (l) => String(l || '').toLowerCase().replace('_', '-');

  /* The Web Speech API does not expose a voice's gender, so we infer it from
     the voice name. These cover the Italian voices shipped by macOS, iOS,
     Windows, Edge (natural voices) and Chrome. */
  const VOICE_F = /alice|federica|paola|elsa|isabella|emma|silvia|carla|luciana|chiara|giulia|female|donna|\bwoman\b/i;
  const VOICE_M = /luca|cosimo|diego|giuseppe|marco|paolo|giorgio|riccardo|male|uomo|\bman\b/i;

  /** 'f' | 'm' | null — best guess for a voice's gender, from its name. */
  function voiceGender(v) {
    if (!v || !v.name) return null;
    if (VOICE_M.test(v.name)) return 'm';   // test male first: "Luca" vs "Luciana"
    if (VOICE_F.test(v.name)) return 'f';
    return null;
  }

  /** All voices available for a language tag's base language (e.g. all it-*). */
  function voicesFor(lang, includeBlocked) {
    voiceTick.value;   // establishes the reactive dependency — do not remove
    const base = normLang(lang).split('-')[0];
    return voices.filter(v =>
      normLang(v.lang).split('-')[0] === base &&
      (includeBlocked || !VOICE_BLOCK.test(v.name))
    );
  }

  const byName = (a, b) => a.name.localeCompare(b.name);

  /* ── Casting ───────────────────────────────────────────────────────────
     Characters are dealt voices from this list in order of appearance and
     nothing else: gender is not taken into account, and no pitch shifting is
     applied. Two characters therefore alternate between the first two voices
     available — on a typical Mac, "Google italiano" and "Alice" — and a third
     character reuses the first voice.

     This is deliberate. The Web Speech API exposes no formant control, so the
     only way to fake a male voice is to transpose a female one, and that
     always sounds hollow. Two clean natural voices beat four artificial ones. */
  const CAST_ORDER = [
    /google italiano/i,   // Chrome, natural and well modulated
    /^alice/i,            // macOS/iOS, the best local Italian voice
    /federica/i,
    /^luca/i,
    /isabella|elsa|cosimo|diego|giuseppe/i
  ];

  /* Never cast these: macOS novelty voices, not speech models. */
  const VOICE_BLOCK = /eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|bubbles|jester|organ|trinoids|whisper|wobble|zarvox|bells|boing|bahh|albert|superstar/i;

  /**
   * The voices in rotation, best first, de-duplicated.
   * Falls back to every usable Italian voice if none of the preferred ones
   * are installed.
   */
  function qualityPool(lang) {
    const all = voicesFor(lang);
    if (!all.length) return [];
    const good = [];
    CAST_ORDER.forEach(rx => {
      const hit = all.find(v => rx.test(v.name) && good.indexOf(v) < 0);
      if (hit) good.push(hit);
    });
    return good.length ? good : all;
  }

  /**
   * The voice for a character, by its order of appearance in the dialogue.
   * Plain text (examples, tables, flashcards) passes no index and always gets
   * the first voice.
   */
  function castVoice(lang, index) {
    const pool = qualityPool(lang);
    if (!pool.length) return null;
    const saved = store.voices || {};
    if (saved.base) {
      const hit = pool.find(v => v.name === saved.base)
               || voicesFor(lang).find(v => v.name === saved.base);
      if (hit) return hit;
    }
    if (saved.mode === "single" || index == null) return pool[0];
    return pool[Math.abs(index) % pool.length];
  }

  /* Kept as an alias so older call sites keep working. */
  const baseVoice = castVoice;

  /**
   * Speaks text with the browser's SpeechSynthesis engine.
   * Defaults to Italian; pass 'fa-IR', 'en-US'… for other languages.
   * Always returns the utterance so callers can hook onend/onerror.
   *
   * @param {string} text
   * @param {string} [lang]           BCP-47 tag, default 'it-IT'
   * @param {object} [opts]
   * @param {number} [opts.persona]   character index → which voice in the rotation
   * @param {string} [opts.speaker]   character name, for a saved voice override
   * @param {boolean} [opts.queue]    don't cancel what is already playing
   */
  function speak(text, lang, opts) {
    if (!hasTTS) { toast('Audio non supportato dal browser'); return null; }

    opts = opts || {};
    const tag = lang || 'it-IT';
    if (!opts.queue) window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' ').trim());
    u.lang = tag;
    u.rate = opts.rate || 0.9;

    const say = () => {
      const saved = store.voices || {};
      /* A character explicitly assigned a voice always wins. */
      const named = opts.speaker && saved.byName && saved.byName[opts.speaker]
        ? voicesFor(tag).find(x => x.name === saved.byName[opts.speaker])
        : null;
      const v = named || castVoice(tag, opts.persona);

      if (v) {
        u.voice = v;
        u.lang = v.lang;   // keep utterance and voice consistent
      } else if (!warnedNoVoice && normLang(tag).indexOf('it') === 0) {
        warnedNoVoice = true;
        toast('Nessuna voce italiana installata nel sistema');
      }

      /* No pitch shifting: every voice plays at its natural pitch. Characters
         are told apart by using different voices, not by distorting one. */
      if (opts.pitch) u.pitch = opts.pitch;

      /* Record what was actually used, so the diagnostics page can show the
         real parameters instead of what we believe they should be. */
      lastSpoken.voice = v ? v.name : '(nessuna)';
      lastSpoken.local = v ? !!v.localService : false;
      lastSpoken.pitch = Math.round((u.pitch || 1) * 1000) / 1000;
      lastSpoken.rate = Math.round((u.rate || 1) * 1000) / 1000;
      lastSpoken.speaker = opts.speaker || '(testo semplice)';
      lastSpoken.index = opts.persona != null ? opts.persona : '—';
      lastSpoken.text = u.text.slice(0, 60);
      lastSpoken.n++;

      window.speechSynthesis.speak(u);
    };

    if (voices.length) { say(); return u; }

    // Voice list not ready yet: wait for it, with a timeout as a safety net so
    // audio never gets stuck on browsers that don't fire 'voiceschanged'.
    let fired = false;
    const once = () => {
      if (fired) return;
      fired = true;
      clearTimeout(timer);
      if (typeof window.speechSynthesis.removeEventListener === 'function') {
        window.speechSynthesis.removeEventListener('voiceschanged', once);
      }
      refreshVoices();
      say();
    };
    const timer = setTimeout(once, 350);
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', once);
    }
    refreshVoices();
    if (voices.length) once();
    return u;
  }

  /**
   * Speaks a list of lines one after another, each with its own voice —
   * used to play a whole dialogue with alternating speakers.
   * @param {Array<{text:string, gender?:string, lang?:string}>} lines
   * @param {function} [onDone] called when the last line finishes
   */
  function speakSequence(lines, onDone) {
    if (!hasTTS) { toast('Audio non supportato dal browser'); return; }
    window.speechSynthesis.cancel();
    let i = 0;
    const next = () => {
      if (i >= lines.length) { if (onDone) onDone(); return; }
      const line = lines[i++];
      const u = speak(line.text, line.lang, {
        persona: line.persona, speaker: line.speaker, queue: true
      });
      if (!u) { if (onDone) onDone(); return; }
      u.onend = next;
      u.onerror = next;   // a failed line must not stall the whole dialogue
    };
    next();
  }

  /** Stops any speech in progress. */
  function stopSpeaking() {
    if (hasTTS) window.speechSynthesis.cancel();
  }

  function copy(text) {
    const done = () => toast('Copiato ✓');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallback(text, done));
    } else fallback(text, done);
  }
  function fallback(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Loose comparison for free-text answers: ignores case, accents, punctuation. */
  function normalise(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['’`]/g, "'")
      .replace(/[.,!?;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function answerMatches(given, accepted) {
    const g = normalise(given);
    return (Array.isArray(accepted) ? accepted : [accepted]).some(a => normalise(a) === g);
  }

  /* --- toast host ------------------------------------------------------ */
  const toastState = reactive({ msg: '', id: 0 });
  let toastTimer = null;
  function toast(msg) {
    toastState.msg = msg;
    toastState.id++;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastState.msg = ''; }, 2200);
  }

  /* --------------------------------------------------------------------
     6. SHARED COMPONENTS
     ------------------------------------------------------------------ */
  const components = {};

  /* Sticky top bar: logo, XP, streak, theme toggle, lesson menu. */
  components['site-header'] = {
    props: { current: { type: String, default: '' } },
    data: () => ({ open: false, store, lessons, paths: PATHS, levelName: LEVEL }),
    computed: {
      themeIcon() { return effectiveTheme() === 'dark' ? '☀️' : '🌙'; },
      groups() {
        const out = [];
        this.lessons.forEach(l => {
          let g = out.find(x => x.name === l.group);
          if (!g) { g = { name: l.group, items: [] }; out.push(g); }
          g.items.push(l);
        });
        return out;
      }
    },
    methods: {
      toggleTheme,
      close() { this.open = false; }
    },
    mounted() {
      // Esc closes the drawer — keyboard users should never get trapped.
      this._esc = (e) => { if (e.key === 'Escape') this.open = false; };
      window.addEventListener('keydown', this._esc);
    },
    beforeUnmount() { window.removeEventListener('keydown', this._esc); },
    template: `
      <header class="site-header">
        <div class="header-inner">
          <a class="logo" :href="paths.home">
            <span class="logo-mark" aria-hidden="true">{{ levelName }}</span>
            <span>Italiano <span class="hide-sm">{{ levelName }}</span></span>
          </a>
          <span class="header-spacer"></span>

          <span class="stat-chip hide-sm" :title="'Livello ' + level">⭐ <b>{{ store.xp }}</b> XP</span>
          <span class="stat-chip" :title="'Serie di ' + store.streak + ' giorni'">🔥 <b>{{ store.streak }}</b></span>

          <button class="icon-btn" @click="toggleTheme"
                  :aria-label="'Cambia tema (attuale: ' + (themeIcon === '☀️' ? 'scuro' : 'chiaro') + ')'">
            {{ themeIcon }}
          </button>
          <button class="icon-btn" @click="open = !open"
                  :aria-expanded="String(open)" aria-controls="lesson-drawer" aria-label="Menu delle lezioni">☰</button>
        </div>
      </header>

      <div v-if="open" class="scrim" @click="close"></div>
      <nav id="lesson-drawer" class="nav-drawer" :class="{ open }" aria-label="Lezioni">
        <a class="nav-link" :href="paths.home" :class="{ active: current === 'index.html' }" @click="close">
          <span class="nav-num" aria-hidden="true">🏠</span> Home {{ levelName }}
        </a>
        <a class="nav-link" :href="paths.levels" @click="close">
          <span class="nav-num" aria-hidden="true">↩</span> Tutti i livelli
        </a>
        <a class="nav-link" :href="paths.levels.replace('index.html', 'verbs-summary.html')"
           :class="{ active: current === 'verbs-summary.html' }" @click="close">
          <span class="nav-num" aria-hidden="true">📚</span> Verbs Summary · <span class="fa" lang="fa">خلاصهٔ افعال</span>
        </a>
        <template v-for="g in groups" :key="g.name">
          <h4>{{ g.name }}</h4>
          <a v-for="l in g.items" :key="l.file" class="nav-link" :href="paths.base + l.file"
             :class="{ active: current === l.file, done: store.completed[l.file] }" @click="close">
            <span class="nav-num" aria-hidden="true">{{ store.completed[l.file] ? '✓' : l.num }}</span>
            <span>{{ l.title }}</span>
            <span v-if="store.bookmarks.includes(l.file)" style="margin-left:auto" aria-label="salvata">🔖</span>
          </a>
        </template>
      </nav>
    `
  };
  // `level` is used inside the template above via a global-ish computed.
  components['site-header'].computed.level = () => level.value;

  /* Progress bar with an optional label. */
  components['progress-bar'] = {
    props: { value: { type: Number, default: 0 }, label: String, right: String },
    template: `
      <div>
        <div v-if="label || right" class="progress-label">
          <span>{{ label }}</span><span>{{ right }}</span>
        </div>
        <div class="progress" role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" :style="{ width: Math.max(0, Math.min(100, value)) + '%' }"></div>
        </div>
      </div>
    `
  };

  /* Global toast notifications. */
  components['toast-host'] = {
    data: () => ({ t: toastState }),
    template: `
      <transition name="fade">
        <div v-if="t.msg" class="toast" role="status" aria-live="polite" :key="t.id">{{ t.msg }}</div>
      </transition>
    `
  };

  /* Small round button that reads text aloud in Italian. */
  components['speak-btn'] = {
    props: {
      text: { type: String, required: true },
      lang: { type: String, default: 'it-IT' },
      persona: { type: Number, default: null },// character index → which voice
      speaker: { type: String, default: '' },  // character name
      label: String
    },
    data: () => ({ busy: false }),
    methods: {
      go() {
        this.busy = true;
        const u = speak(this.text, this.lang, {
          persona: this.persona, speaker: this.speaker
        });
        if (u) { u.onend = () => { this.busy = false; }; u.onerror = () => { this.busy = false; }; }
        else this.busy = false;
      }
    },
    template: `
      <button class="mini-btn" :class="{ speaking: busy }" @click.stop="go"
              :aria-label="label || ('Ascolta: ' + text)" :title="label || 'Ascolta'">🔊</button>
    `
  };

  /* Small round button that copies text to the clipboard. */
  components['copy-btn'] = {
    props: { text: { type: String, required: true } },
    methods: { go() { copy(this.text); } },
    template: `<button class="mini-btn" @click.stop="go" aria-label="Copia la frase" title="Copia">⧉</button>`
  };

  /* --------------------------------------------------------------------
     7. PAGE BOOTSTRAP
     ------------------------------------------------------------------ */
  /**
   * Creates and mounts a Vue app with all shared + grammar + exercise
   * components already registered.
   * @param {object} options root component options
   * @param {string} el      mount selector (default '#app')
   */
  function createPage(options, el) {
    touchStreak();
    const app = Vue.createApp(options);
    Object.keys(components).forEach(name => app.component(name, components[name]));
    const extra = window.ITA_COMPONENTS || {};
    Object.keys(extra).forEach(name => app.component(name, extra[name]));
    app.config.globalProperties.$store = store;
    app.config.globalProperties.$speak = speak;
    app.mount(el || '#app');
    return app;
  }

  /* Public API used by the page-level scripts. */
  window.ITA = {
    store, components, createPage, LEVEL, PATHS,
    lessons, completedCount, coursePct, level, levelPct,
    speak, speakSequence, stopSpeaking, voicesFor, voiceGender,
    baseVoice, castVoice, qualityPool,
    refreshVoices, voiceTick, lastSpoken, VERSION: BUILD,
    copy, shuffle, normalise, answerMatches, toast,
    addXp, markComplete, toggleBookmark, toggleFavorite, isFavorite,
    toggleTheme, applyTheme, today
  };
})();
