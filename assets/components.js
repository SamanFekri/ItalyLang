/* ============================================================================
   components.js — the reusable teaching components
   ----------------------------------------------------------------------------
     <grammar-card>   collapsible section wrapper with icon + kicker
     <syntax-box>     visual formula:  Soggetto + Verbo + Infinito
     <timeline-strip> past / present / future diagram
     <verb-table>     collapsible conjugation table, irregulars highlighted
     <example-card>   Italian → literal → natural → grammar note
     <mistake-card>   ❌ wrong / ✅ correct / why
     <dialogue-box>   A2 conversation with hoverable grammar glosses
     <summary-card>   formula + key rules + memory tips
     <flash-deck>     flippable flashcards with keyboard control
     <vocab-list>     the vocabulary set of a lesson (grid + flashcards)
     <guided-practice> worked examples: prompt → how to think → answer
   Registered globally through window.ITA_COMPONENTS.
   ========================================================================== */
(function () {
  'use strict';
  const C = (window.ITA_COMPONENTS = window.ITA_COMPONENTS || {});
  const { store, speak, shuffle, toggleFavorite, isFavorite } = window.ITA;

  /* ------------------------------------------------------------------ */
  /* Collapsible card wrapper                                            */
  /* ------------------------------------------------------------------ */
  C['grammar-card'] = {
    props: {
      title: String,
      icon: { type: String, default: '📘' },
      kicker: String,
      id: String,
      collapsible: { type: Boolean, default: false },
      open: { type: Boolean, default: true },
      variant: { type: String, default: '' }   // '' | 'tip' | 'warn' | 'accent'
    },
    data() { return { show: this.open }; },
    computed: {
      cls() { return this.variant ? 'card card--' + this.variant : 'card'; },
      bodyId() { return (this.id || 'sec') + '-body'; }
    },
    template: `
      <section :class="cls" :id="id">
        <component :is="collapsible ? 'button' : 'div'"
                   :class="collapsible ? 'collapse-head' : ''"
                   :aria-expanded="collapsible ? String(show) : null"
                   :aria-controls="collapsible ? bodyId : null"
                   @click="collapsible ? show = !show : null">
          <div class="card-head" style="margin-bottom:0;flex:1">
            <span class="card-badge" aria-hidden="true">{{ icon }}</span>
            <div>
              <p v-if="kicker" class="card-kicker">{{ kicker }}</p>
              <h2 style="font-size:1.3rem">{{ title }}</h2>
            </div>
          </div>
          <span v-if="collapsible" class="collapse-caret" aria-hidden="true">▼</span>
        </component>
        <transition name="fade">
          <div v-show="show" :id="bodyId" :class="collapsible ? 'collapse-body' : ''" style="margin-top:12px">
            <slot></slot>
          </div>
        </transition>
      </section>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Syntax formula                                                      */
  /* ------------------------------------------------------------------ */
  /* rows: [ { parts: [ { text, note, type } ], example: 'Io devo studiare' } ] */
  C['syntax-box'] = {
    props: {
      label: { type: String, default: 'Formula' },
      rows: { type: Array, required: true }
    },
    template: `
      <div class="syntax-box">
        <p class="sb-label">{{ label }}</p>
        <div v-for="(row, ri) in rows" :key="ri">
          <div class="syntax-row">
            <template v-for="(p, i) in row.parts" :key="i">
              <span v-if="i > 0" class="sb-plus" aria-hidden="true">+</span>
              <span class="sb-part" :class="p.type ? 't-' + p.type : ''"
                    :style="{ animationDelay: (i * 60) + 'ms' }">
                {{ p.text }}
                <small v-if="p.note">{{ p.note }}</small>
              </span>
            </template>
          </div>
          <p v-if="row.example" class="sb-example">
            <span class="it">{{ row.example }}</span>
            <span v-if="row.translation" class="muted"> — {{ row.translation }}</span>
          </p>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Timeline                                                            */
  /* ------------------------------------------------------------------ */
  /* points: [ { label, time, example, now } ] */
  C['timeline-strip'] = {
    props: { points: { type: Array, required: true }, caption: String },
    template: `
      <div class="timeline">
        <div class="timeline-track" aria-hidden="true"></div>
        <ol class="timeline-points" style="list-style:none;padding:0;margin:0">
          <li v-for="(p, i) in points" :key="i" class="tl-point" :class="{ now: p.now }">
            <div class="tl-dot" aria-hidden="true"></div>
            <div class="tl-time">{{ p.time }}</div>
            <div class="tl-label">{{ p.label }}</div>
            <p v-if="p.example" class="tl-ex it">{{ p.example }}</p>
            <p v-if="p.note" class="tl-ex muted">{{ p.note }}</p>
          </li>
        </ol>
        <p v-if="caption" class="small muted center" style="margin-top:14px">{{ caption }}</p>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Conjugation table                                                   */
  /* ------------------------------------------------------------------ */
  /* table: { title, note, columns:[..], rows:[ { cells:[..], irregular:[1] } ] } */
  C['verb-table'] = {
    props: {
      table: { type: Object, required: true },
      open: { type: Boolean, default: true }
    },
    data() { return { show: this.open }; },
    methods: {
      isIrr(row, i) { return (row.irregular || []).indexOf(i) >= 0; },
      say(row) { speak(row.cells.join(' ')); }
    },
    template: `
      <div style="margin-bottom:18px">
        <button class="collapse-head" :aria-expanded="String(show)" @click="show = !show"
                style="margin-bottom:10px">
          <h3 style="margin:0;font-size:1.02rem">{{ table.title }}</h3>
          <span class="collapse-caret" aria-hidden="true">▼</span>
        </button>
        <transition name="fade">
          <div v-show="show">
            <div class="table-wrap">
              <table class="verb-table">
                <caption class="sr-only">{{ table.title }}</caption>
                <thead>
                  <tr><th v-for="(c, i) in table.columns" :key="i" scope="col">{{ c }}</th><th><span class="sr-only">Audio</span></th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in table.rows" :key="ri">
                    <td v-for="(cell, ci) in row.cells" :key="ci" :class="ci > 0 ? 'form' : ''">
                      <span :class="isIrr(row, ci) ? 'irr' : ''">{{ cell }}</span>
                    </td>
                    <td style="width:44px">
                      <speak-btn :text="row.cells.join(' ')" :label="'Ascolta ' + row.cells.join(' ')"></speak-btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-legend">
              <span><span class="irr">forma</span> = irregolare / da memorizzare</span>
              <span v-if="table.note">💡 {{ table.note }}</span>
            </div>
          </div>
        </transition>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Example card                                                        */
  /* ------------------------------------------------------------------ */
  /* ex: { it, literal, natural, note } */
  C['example-card'] = {
    props: { ex: { type: Object, required: true }, n: Number },
    data() { return { store, local: false }; },
    computed: {
      hidden() { return store.hideTranslations && !this.local; }
    },
    template: `
      <article class="example-card animate-in">
        <div class="ex-it">
          <span class="it">{{ ex.it }}</span>
          <span class="ex-tools">
            <speak-btn :text="ex.it"></speak-btn>
            <copy-btn :text="ex.it"></copy-btn>
            <button v-if="store.hideTranslations" class="mini-btn" @click="local = !local"
                    :aria-label="local ? 'Nascondi traduzione' : 'Mostra traduzione'">{{ local ? '🙈' : '👁️' }}</button>
          </span>
        </div>
        <div v-if="!hidden">
          <p class="ex-arrow" aria-hidden="true">↓ letterale</p>
          <p class="ex-lit">{{ ex.literal }}</p>
          <p class="ex-arrow" aria-hidden="true">↓ naturale</p>
          <p class="ex-nat">{{ ex.natural }}</p>
          <p v-if="ex.note" class="ex-note">🔎 {{ ex.note }}</p>
        </div>
        <p v-else class="small muted" style="margin:6px 0 0">Traduzioni nascoste — premi 👁️ per vedere.</p>
      </article>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Mistake card                                                        */
  /* ------------------------------------------------------------------ */
  C['mistake-card'] = {
    props: { m: { type: Object, required: true } },
    template: `
      <div class="mistake-card">
        <div class="mk-side mk-wrong">
          <p class="mk-tag">❌ Sbagliato</p>
          <p class="mk-text it">{{ m.wrong }}</p>
        </div>
        <div class="mk-side mk-right">
          <p class="mk-tag">✅ Corretto</p>
          <p class="mk-text it">{{ m.right }}</p>
        </div>
        <p class="mk-why"><b>Perché:</b> {{ m.why }}</p>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Dialogue with hoverable glosses                                     */
  /* ------------------------------------------------------------------ */
  /* line: { speaker, icon, side, it, en, glosses: [ { term, expl } ] }    */
  C['dialogue-box'] = {
    props: { lines: { type: Array, required: true } },
    data() { return { store, showEn: true, playing: false, showVoices: false }; },
    computed: {
      /** Italian voices available on this device, for the picker. */
      itVoices() { return window.ITA.voicesFor('it-IT'); },
      hasChoice() { return this.itVoices.length > 1; },
      /**
       * The cast of this dialogue: one entry per distinct speaker, in order of
       * appearance. That order is the only thing that decides which voice a
       * character gets — gender is not considered.
       */
      cast() {
        const out = [];
        this.lines.forEach(l => {
          const name = l.speaker || '—';
          if (out.some(c => c.name === name)) return;
          out.push({ name: name, icon: l.icon || '🗣️', index: out.length });
        });
        return out;
      },
      singleMode() { return store.voices.mode === 'single'; },
      /** The voices actually in rotation on this device. */
      pool() { return window.ITA.qualityPool('it-IT'); },
      poolNames() { return this.pool.map(v => v.name).join(' · ') || '—'; }
    },
    methods: {
      /** The cast entry for a line — its character's fixed voice profile. */
      roleOf(line) {
        const name = line.speaker || '—';
        return this.cast.find(c => c.name === name) || { index: 0, name: name };
      },
      indexOfLine(line) { return this.roleOf(line).index; },
      gOf(v) { return window.ITA.voiceGender(v); },
      /** Plays the whole dialogue, each character in their own voice. */
      playAll() {
        if (this.playing) { window.ITA.stopSpeaking(); this.playing = false; return; }
        this.playing = true;
        window.ITA.speakSequence(
          this.lines.map(l => {
            const r = this.roleOf(l);
            return { text: l.it, persona: r.index, speaker: r.name };
          }),
          () => { this.playing = false; }
        );
      },
      /** Plays a sample line so you can hear the character you just assigned. */
      previewVoice(role) {
        this.$nextTick(() => window.ITA.speak(
          'Ciao, sono ' + role.name + '. Piacere di conoscerti!',
          'it-IT', { persona: role.index, speaker: role.name }
        ));
      },
      /** Which voice a character will actually use right now. */
      voiceNameFor(role) {
        const saved = store.voices;
        if (saved.byName && saved.byName[role.name]) return saved.byName[role.name];
        const v = window.ITA.castVoice('it-IT', saved.mode === 'single' ? null : role.index);
        return v ? v.name : '—';
      },
      /** Clears the per-character overrides for this dialogue. */
      resetVoices() {
        this.cast.forEach(r => { delete store.voices.byName[r.name]; });
        store.voices.base = null;
        window.ITA.toast('Voci automatiche ripristinate');
      },
      /** Splits an Italian line into plain text + <gloss> chunks. */
      chunks(line) {
        const gl = line.glosses || [];
        if (!gl.length) return [{ text: line.it }];
        // Build a regex of all glossed terms, longest first (avoids partial hits).
        const terms = gl.map(g => g.term).sort((a, b) => b.length - a.length);
        const esc = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const re = new RegExp('(' + esc.join('|') + ')', 'g');
        return line.it.split(re).filter(s => s !== '').map(part => {
          const hit = gl.find(g => g.term === part);
          return hit ? { text: part, expl: hit.expl } : { text: part };
        });
      },
      say(line) { speak(line.it, 'it-IT', { persona: this.indexOfLine(line), speaker: this.roleOf(line).name }); }
    },
    template: `
      <div>
        <div class="row" style="justify-content:flex-end;margin-bottom:10px">
          <button class="btn btn-ghost btn-sm" @click="showEn = !showEn">
            {{ showEn ? '🙈 Nascondi inglese' : '👁️ Mostra inglese' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="playAll">
            {{ playing ? '⏹ Ferma' : '🔊 Ascolta tutto' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="showVoices = !showVoices"
                  :aria-expanded="String(showVoices)">🎙️ Voci</button>
        </div>

        <!-- Voice picker + diagnostics -->
        <div v-if="showVoices" class="card card--tip" style="padding:14px;margin-bottom:12px">
          <p v-if="!itVoices.length" class="small" style="margin:0 0 8px;color:var(--err)">
            ⚠️ Nessuna voce italiana trovata sul tuo dispositivo: il browser userà la voce
            predefinita del sistema (di solito inglese). Installa una voce italiana —
            macOS: Impostazioni di Sistema → Accessibilità → Contenuto letto → Voce di sistema → Gestisci voci → Italiano.
          </p>
          <p v-else class="small" style="margin:0 0 8px">
            ℹ️ {{ itVoices.length }} voci italiane disponibili · in uso: <b>{{ poolNames }}</b>.
          </p>
          <details style="margin-bottom:10px">
            <summary class="small" style="cursor:pointer">Voci italiane rilevate ({{ itVoices.length }})</summary>
            <ul class="small muted" style="margin:6px 0 0">
              <li v-for="v in itVoices" :key="v.name">
                {{ v.name }} — {{ v.lang }}<span v-if="v.localService"> · offline</span>
                <span v-if="gOf(v)"> · {{ gOf(v) === 'f' ? 'femminile' : 'maschile' }}</span>
              </li>
            </ul>
          </details>
          <p class="small muted" style="margin-bottom:10px">
            Voci in rotazione: <b>{{ poolNames }}</b>. I personaggi le ricevono
            nell'ordine in cui parlano, senza alcuna modifica di tono.
          </p>

          <p class="card-kicker" style="margin-bottom:8px">I personaggi</p>
          <div class="grid grid-2" style="gap:10px">
            <div v-for="role in cast" :key="role.name" style="padding:9px 11px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm)">
              <div class="row" style="gap:7px">
                <span aria-hidden="true">{{ role.icon }}</span>
                <span class="small" style="font-weight:700">{{ role.name }}</span>
                <button class="mini-btn" style="margin-left:auto" @click="previewVoice(role)"
                        :aria-label="'Ascolta ' + role.name">🔊</button>
              </div>
              <p class="small muted" style="margin:4px 0 0">{{ voiceNameFor(role) }}</p>
              <select v-model="store.voices.byName[role.name]" @change="previewVoice(role)"
                      class="fill-input" style="width:100%;min-width:0;margin-top:6px;font-family:var(--font);font-size:.8rem"
                      :aria-label="'Voce di ' + role.name">
                <option :value="undefined">Automatica</option>
                <option v-for="v in itVoices" :key="v.name" :value="v.name">{{ v.name }}</option>
              </select>
            </div>
          </div>

          <label class="row small" style="margin-top:12px;gap:8px;cursor:pointer">
            <input type="checkbox" :checked="singleMode"
                   @change="store.voices.mode = $event.target.checked ? 'single' : 'auto'">
            <span>Usa <b>una sola voce</b> per tutti i personaggi</span>
          </label>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" @click="previewVoice(cast[0])" v-if="cast.length">▶ Prova</button>
            <button class="btn btn-ghost btn-sm" @click="resetVoices">↻ Ripristina automatiche</button>
            <a class="btn btn-ghost btn-sm" href="../voci.html">🩺 Diagnostica voci</a>
          </div>
        </div>
        <div class="dialogue">
          <div v-for="(l, i) in lines" :key="i" class="dl-line" :class="{ right: l.side === 'right' }">
            <div class="dl-avatar" aria-hidden="true">{{ l.icon || '🗣️' }}</div>
            <div class="dl-bubble">
              <p class="dl-speaker">{{ l.speaker }}</p>
              <p class="dl-it">
                <template v-for="(c, ci) in chunks(l)" :key="ci"><span v-if="c.expl" class="gloss" tabindex="0"
                      :aria-label="c.text + ': ' + c.expl">{{ c.text }}<span class="gloss-pop">{{ c.expl }}</span></span><template v-else>{{ c.text }}</template></template>
                <speak-btn :text="l.it" :persona="indexOfLine(l)" :speaker="roleOf(l).name"
                           style="vertical-align:middle;margin-left:6px"></speak-btn>
              </p>
              <p v-if="showEn" class="dl-en">{{ l.en }}</p>
            </div>
          </div>
        </div>
        <p class="small muted" style="margin-top:12px">💡 Passa il mouse (o usa Tab) sulle parole <span class="gloss">sottolineate</span> per la spiegazione grammaticale.</p>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Summary card                                                        */
  /* ------------------------------------------------------------------ */
  /* summary: { formula, rules: [], tips: [] } */
  C['summary-card'] = {
    props: { summary: { type: Object, required: true } },
    template: `
      <section class="summary-card">
        <p class="card-kicker" style="color:rgba(255,255,255,.8)">Riassunto</p>
        <h2 style="font-size:1.35rem">📌 Da ricordare</h2>
        <div class="sc-formula">{{ summary.formula }}</div>
        <h3 style="font-size:1rem">Regole chiave</h3>
        <ul>
          <li v-for="(r, i) in summary.rules" :key="i">{{ r }}</li>
        </ul>
        <h3 style="font-size:1rem;margin-top:16px">Trucchi per memorizzare</h3>
        <div v-for="(t, i) in summary.tips" :key="i" class="sc-tip">🧠 {{ t }}</div>
      </section>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Flashcards                                                          */
  /* ------------------------------------------------------------------ */
  /* cards: [ { front, back, hint, sub } ] */
  C['flash-deck'] = {
    props: { cards: { type: Array, required: true }, deckId: { type: String, default: 'deck' } },
    data() { return { i: 0, flipped: false, order: [], store }; },
    created() { this.order = this.cards.map((_, i) => i); },
    computed: {
      card() { return this.cards[this.order[this.i]] || {}; },
      favId() { return this.deckId + ':' + (this.card.front || ''); }
    },
    methods: {
      flip() { this.flipped = !this.flipped; },
      next() { this.flipped = false; this.i = (this.i + 1) % this.order.length; },
      prev() { this.flipped = false; this.i = (this.i - 1 + this.order.length) % this.order.length; },
      mix() { this.order = shuffle(this.order); this.i = 0; this.flipped = false; },
      fav() { toggleFavorite(this.favId); },
      isFav() { return isFavorite(this.favId); },
      key(e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.flip(); }
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      }
    },
    template: `
      <div class="flash-stage">
        <button class="flash-card" :class="{ flipped }" @click="flip" @keydown="key"
                :aria-label="'Flashcard ' + (i + 1) + ' di ' + order.length + '. Premi Invio per girare.'">
          <div class="flash-inner">
            <div class="flash-face flash-front">
              <p class="flash-term">{{ card.front }}</p>
              <p v-if="card.sub" class="flash-sub">{{ card.sub }}</p>
              <p v-if="card.hint" class="flash-hint">💡 {{ card.hint }}</p>
              <p class="flash-flip-hint">clicca / Invio per girare</p>
            </div>
            <div class="flash-face flash-back">
              <p class="flash-term" style="font-family:var(--font)">{{ card.back }}</p>
              <p v-if="card.note" class="flash-sub">{{ card.note }}</p>
              <p class="flash-flip-hint">← → per cambiare carta</p>
            </div>
          </div>
        </button>

        <div class="flash-nav">
          <button class="icon-btn" @click="prev" aria-label="Carta precedente">←</button>
          <span class="flash-count">{{ i + 1 }} / {{ order.length }}</span>
          <button class="icon-btn" @click="next" aria-label="Carta successiva">→</button>
          <button class="icon-btn" @click="mix" aria-label="Mescola le carte" title="Mescola">🔀</button>
          <speak-btn :text="card.front" style="width:38px;height:38px;font-size:1rem"></speak-btn>
          <button class="icon-btn" :class="{ 'is-on': isFav() }" @click="fav"
                  :aria-label="isFav() ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'">★</button>
        </div>
        <progress-bar :value="(i + 1) / order.length * 100" style="width:100%;max-width:460px"></progress-bar>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Lesson vocabulary set                                               */
  /* ------------------------------------------------------------------ */
  /* vocab: { intro, categories: [ {id,label,icon} ],
              words: [ { it, en, fa?, cat, pos?, ex?, exEn? } ] }
     Same word shape as the wordbank pages, so a lesson set can be moved
     into a wordbank page (and back) without touching the data.          */
  C['vocab-list'] = {
    props: {
      vocab: { type: Object, required: true },
      deckId: { type: String, default: 'vocab' }
    },
    data() { return { store, q: '', cat: 'all', onlyUnknown: false, mode: 'grid' }; },
    computed: {
      words() { return this.vocab.words; },
      categories() { return this.vocab.categories || []; },
      filtered() {
        const q = window.ITA.normalise(this.q);
        return this.words.filter(w => {
          if (this.cat !== 'all' && w.cat !== this.cat) return false;
          if (this.onlyUnknown && store.known[this.key(w)]) return false;
          if (!q) return true;
          return window.ITA.normalise([w.it, w.en, w.fa || '', w.ex || ''].join(' ')).indexOf(q) >= 0;
        });
      },
      knownCount() { return this.words.filter(w => store.known[this.key(w)]).length; },
      pct() { return this.words.length ? Math.round(this.knownCount / this.words.length * 100) : 0; },
      catCounts() {
        const m = {};
        this.words.forEach(w => { m[w.cat] = (m[w.cat] || 0) + 1; });
        return m;
      },
      flashcards() {
        const src = this.filtered.length ? this.filtered : this.words;
        return src.map(w => ({
          front: w.it,
          sub: w.pos || '',
          back: w.fa ? (w.fa + '  ·  ' + w.en) : w.en,
          note: w.ex || ''
        }));
      }
    },
    methods: {
      key(w) { return this.deckId + ':' + w.it; },
      toggleKnown(w) {
        const k = this.key(w);
        if (store.known[k]) delete store.known[k];
        else { store.known[k] = true; window.ITA.addXp(2); }
      },
      isKnown(w) { return !!store.known[this.key(w)]; },
      fav(w) { toggleFavorite(this.key(w)); },
      isFav(w) { return isFavorite(this.key(w)); },
      catLabel(id) {
        const c = this.categories.find(c => c.id === id);
        return c ? c.icon + ' ' + c.label : id;
      }
    },
    template: `
      <div>
        <p v-if="vocab.intro" v-html="vocab.intro"></p>
        <progress-bar :value="pct" label="Parole imparate"
                      :right="knownCount + ' / ' + words.length + ' (' + pct + '%)'"></progress-bar>

        <div class="btn-row">
          <button class="btn btn-sm" :class="mode === 'grid' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'grid'">📋 Elenco</button>
          <button class="btn btn-sm" :class="mode === 'flash' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'flash'">🃏 Flashcard</button>
          <button class="btn btn-ghost btn-sm" :class="{ 'btn-blue': onlyUnknown }" @click="onlyUnknown = !onlyUnknown">📕 Da imparare</button>
        </div>

        <div class="vocab-toolbar">
          <div class="search-box">
            <span class="s-icon" aria-hidden="true">🔍</span>
            <input type="search" v-model="q" placeholder="Cerca una parola…" aria-label="Cerca una parola del lessico">
          </div>
        </div>

        <div v-if="categories.length" class="chip-row">
          <button class="chip" :class="{ active: cat === 'all' }" @click="cat = 'all'">Tutte <small>{{ words.length }}</small></button>
          <button v-for="c in categories" :key="c.id" class="chip" :class="{ active: cat === c.id }" @click="cat = c.id">
            {{ c.icon }} {{ c.label }} <small>{{ catCounts[c.id] || 0 }}</small>
          </button>
        </div>

        <div v-if="mode === 'grid'">
          <p class="small muted">{{ filtered.length }} parole mostrate. ✓ = imparata (+2 XP) · ★ = preferita.</p>
          <div class="vocab-grid">
            <article v-for="(w, i) in filtered" :key="w.it + i" class="vocab-card"
                     :class="{ 'hidden-tr': store.hideTranslations }"
                     :style="{ animationDelay: Math.min(i, 20) * 20 + 'ms', borderColor: isKnown(w) ? 'var(--ok)' : '' }">
              <div class="vc-top">
                <span class="vc-it">{{ w.it }}</span>
                <span v-if="w.pos" class="vc-pos">{{ w.pos }}</span>
              </div>
              <p class="vc-en">{{ w.en }}</p>
              <p v-if="w.fa" class="vc-fa" lang="fa" dir="rtl">{{ w.fa }}</p>
              <p v-if="w.ex" class="vc-ex">« {{ w.ex }} »</p>
              <p v-if="w.exEn" class="small muted" style="margin:2px 0 0">{{ w.exEn }}</p>
              <div class="vc-tools">
                <speak-btn :text="w.ex || w.it"></speak-btn>
                <copy-btn :text="w.it"></copy-btn>
                <button class="mini-btn" :class="{ on: isFav(w) }" @click="fav(w)"
                        :aria-label="isFav(w) ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'">★</button>
                <button class="mini-btn" :style="isKnown(w) ? 'color:var(--ok);border-color:var(--ok)' : ''"
                        @click="toggleKnown(w)" :aria-label="isKnown(w) ? 'Segna come da ripassare' : 'Segna come imparata'">✓</button>
                <span v-if="w.cat" class="pill" style="margin-left:auto;font-size:.66rem">{{ catLabel(w.cat) }}</span>
              </div>
            </article>
          </div>
          <p v-if="!filtered.length" class="muted center" style="margin-top:20px">Nessuna parola trovata per «{{ q }}».</p>
        </div>

        <flash-deck v-else :cards="flashcards" :deck-id="deckId" :key="flashcards.length + cat + q"></flash-deck>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* Guided practice — worked examples before the free exercises         */
  /* ------------------------------------------------------------------ */
  /* guided: { intro, steps: [ { prompt, think, answer, why } ] } */
  C['guided-practice'] = {
    props: { guided: { type: Object, required: true } },
    data() { return { shown: {} }; },
    methods: {
      reveal(i) { this.shown[i] = true; },
      revealAll() { this.guided.steps.forEach((s, i) => { this.shown[i] = true; }); }
    },
    template: `
      <div class="card card--tip" style="margin:0 0 18px">
        <div class="card-head">
          <span class="card-badge" aria-hidden="true">🧭</span>
          <div>
            <p class="card-kicker">Pratica guidata</p>
            <h3 style="font-size:1.05rem;margin:0">{{ guided.title || 'Ragioniamo insieme' }}</h3>
          </div>
        </div>
        <p v-if="guided.intro" class="small muted">{{ guided.intro }}</p>

        <div v-for="(s, i) in guided.steps" :key="i" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ i + 1 }}</span>
            <span class="q-sentence">{{ s.prompt }}</span>
          </div>
          <p class="small muted" style="margin:6px 0 0 35px">🤔 <b>Come si ragiona:</b> {{ s.think }}</p>
          <button v-if="!shown[i]" class="btn btn-ghost btn-sm" style="margin-left:35px;margin-top:8px"
                  @click="reveal(i)">👁️ Mostra la soluzione</button>
          <p v-else class="feedback ok">
            ✅ <b class="it">{{ s.answer }}</b><span v-if="s.why"> — {{ s.why }}</span>
          </p>
        </div>

        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" @click="revealAll">👁️ Mostra tutte le soluzioni</button>
        </div>
      </div>
    `
  };
})();
