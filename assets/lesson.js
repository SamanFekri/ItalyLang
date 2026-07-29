/* ============================================================================
   lesson.js — turns a LESSON data object into a full lesson page.
   ----------------------------------------------------------------------------
   Each lesson HTML file only declares its content (window.LESSON) and calls
   ITA.mountLesson().  The teaching order is fixed here so every lesson in the
   course is structured identically:

     1 Meaning → 2 Formula → 3 Rule → 4 Timeline → 5 Tables → 6 Examples
     → 7 Mistakes → 8 Practice → 9 Conversation → 10 Summary → Review

   ========================================================================== */
(function () {
  'use strict';
  const ITA = window.ITA;
  const { store, markComplete, toggleBookmark, shuffle } = ITA;

  const lessonPage = {
    props: { lesson: { type: Object, required: true } },
    data() {
      return {
        store,
        L: this.lesson,
        query: '',
        randomCard: null
      };
    },
    computed: {
      file() { return this.L.file; },
      index() { return ITA.lessons.findIndex(l => l.file === this.file); },
      prev() { return this.index > 0 ? ITA.lessons[this.index - 1] : null; },
      next() { return this.index >= 0 && this.index < ITA.lessons.length - 1 ? ITA.lessons[this.index + 1] : null; },
      isBookmarked() { return store.bookmarks.indexOf(this.file) >= 0; },
      isDone() { return !!store.completed[this.file]; },
      score() { return store.scores[this.file]; },
      /** Filters the examples with the search box. */
      shownExamples() {
        const q = ITA.normalise(this.query);
        if (!q) return this.L.examples;
        return this.L.examples.filter(e =>
          ITA.normalise(e.it + ' ' + e.natural + ' ' + (e.note || '')).indexOf(q) >= 0);
      },
      sections() {
        const s = [
          { id: 'intro', label: '1 · Introduzione' },
          { id: 'formula', label: '2 · Formula' },
          { id: 'regola', label: '3 · Regola' }
        ];
        if (this.L.timeline) s.push({ id: 'timeline', label: '4 · Linea del tempo' });
        if (this.L.tables && this.L.tables.length) s.push({ id: 'tabelle', label: '5 · Coniugazione' });
        s.push({ id: 'esempi', label: '6 · Esempi' });
        s.push({ id: 'errori', label: '7 · Errori comuni' });
        s.push({ id: 'esercizi', label: '8 · Esercizi' });
        if (this.L.dialogue) s.push({ id: 'dialogo', label: '9 · Conversazione' });
        s.push({ id: 'flashcards', label: '🃏 Flashcard' });
        s.push({ id: 'riassunto', label: '10 · Riassunto' });
        return s;
      }
    },
    methods: {
      complete() { markComplete(this.file); },
      bookmark() { toggleBookmark(this.file); },
      toggleTr() { store.hideTranslations = !store.hideTranslations; },
      /** "Ripasso casuale": pops one random example on screen. */
      randomReview() {
        const pool = this.L.examples;
        this.randomCard = pool[Math.floor(Math.random() * pool.length)];
        this.$nextTick(() => {
          const el = document.getElementById('ripasso-casuale');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    },
    template: `
      <a class="skip-link" href="#main">Vai al contenuto</a>
      <site-header :current="L.file"></site-header>

      <main id="main" class="container">
        <!-- ── Lesson hero ─────────────────────────────────────────── -->
        <header class="hero animate-in">
          <p class="card-kicker" style="color:rgba(255,255,255,.85)">
            Lezione {{ L.num }} · Italiano A2{{ L.group ? ' · ' + L.group : '' }}
          </p>
          <h1>{{ L.icon }} {{ L.title }}</h1>
          <p>{{ L.subtitle }}</p>
          <div class="hero-stats">
            <div class="hero-stat"><b>{{ L.examples.length }}</b><span>esempi</span></div>
            <div class="hero-stat"><b>{{ L.mistakes.length }}</b><span>errori tipici</span></div>
            <div class="hero-stat"><b>{{ L.flashcards.length }}</b><span>flashcard</span></div>
            <div class="hero-stat" v-if="score"><b>{{ score.pct }}%</b><span>ultimo punteggio</span></div>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" @click="bookmark" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)">
              {{ isBookmarked ? '🔖 Salvata' : '🔖 Salva lezione' }}
            </button>
            <button class="btn btn-ghost btn-sm" @click="toggleTr" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)">
              {{ store.hideTranslations ? '👁️ Mostra traduzioni' : '🙈 Nascondi traduzioni' }}
            </button>
            <button class="btn btn-ghost btn-sm" @click="randomReview" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)">
              🎲 Ripasso casuale
            </button>
          </div>
        </header>

        <!-- ── Section index ───────────────────────────────────────── -->
        <nav class="section-nav" aria-label="Sezioni della lezione">
          <a v-for="s in sections" :key="s.id" :href="'#' + s.id">{{ s.label }}</a>
        </nav>

        <!-- ── Random review card ──────────────────────────────────── -->
        <section v-if="randomCard" id="ripasso-casuale" class="card card--tip animate-in">
          <div class="card-head">
            <span class="card-badge" aria-hidden="true">🎲</span>
            <div><p class="card-kicker">Ripasso casuale</p><h2 style="font-size:1.1rem">Ricordi questa frase?</h2></div>
            <button class="mini-btn" style="margin-left:auto" @click="randomCard = null" aria-label="Chiudi">✕</button>
          </div>
          <example-card :ex="randomCard"></example-card>
          <button class="btn btn-ghost btn-sm" @click="randomReview">🎲 Un'altra</button>
        </section>

        <!-- ── 1. Introduction ─────────────────────────────────────── -->
        <grammar-card id="intro" icon="🎯" kicker="Passo 1 · Significato" :title="'Che cos\\'è: ' + L.title">
          <p><b>Che cos'è?</b> {{ L.intro.what }}</p>
          <p><b>Quando si usa?</b> {{ L.intro.when }}</p>
          <p><b>Perché è importante?</b> {{ L.intro.why }}</p>
          <div class="card card--warn" style="margin:14px 0 0">
            <h3 style="font-size:1rem;margin-bottom:8px">⚠️ Errori tipici dei principianti</h3>
            <ul style="margin:0">
              <li v-for="(m, i) in L.intro.mistakes" :key="i">{{ m }}</li>
            </ul>
          </div>
        </grammar-card>

        <!-- ── 2. Syntax formula ───────────────────────────────────── -->
        <grammar-card id="formula" icon="🧩" kicker="Passo 2 · Formula" title="La struttura della frase">
          <syntax-box v-for="(f, i) in L.formulas" :key="i" :label="f.label" :rows="f.rows"></syntax-box>
          <p v-if="L.formulaNote" class="small muted">{{ L.formulaNote }}</p>
        </grammar-card>

        <!-- ── 3. Grammar rules ────────────────────────────────────── -->
        <grammar-card id="regola" icon="📐" kicker="Passo 3 · Regola" title="La regola, spiegata semplice">
          <div v-for="(r, i) in L.rules" :key="i" style="margin-bottom:18px">
            <h3>{{ i + 1 }}. {{ r.title }}</h3>
            <p v-html="r.body"></p>
            <ul v-if="r.points && r.points.length">
              <li v-for="(p, pi) in r.points" :key="pi" v-html="p"></li>
            </ul>
            <div v-if="r.exception" class="card card--warn" style="margin:10px 0 0;padding:12px 15px">
              <b>⚠️ Eccezione:</b> {{ r.exception }}
            </div>
          </div>
        </grammar-card>

        <!-- ── 4. Timeline ─────────────────────────────────────────── -->
        <grammar-card v-if="L.timeline" id="timeline" icon="🕰️" kicker="Passo 4 · Tempo"
                      :title="L.timeline.title || 'Dove si colloca nel tempo'">
          <p v-if="L.timeline.intro">{{ L.timeline.intro }}</p>
          <timeline-strip :points="L.timeline.points" :caption="L.timeline.caption"></timeline-strip>
        </grammar-card>

        <!-- ── 5. Conjugation tables ───────────────────────────────── -->
        <grammar-card v-if="L.tables && L.tables.length" id="tabelle" icon="📊" kicker="Passo 5 · Coniugazione"
                      title="Tabelle di coniugazione">
          <p class="small muted">Clicca il titolo di una tabella per aprirla o chiuderla. Il pulsante 🔊 legge la forma ad alta voce.</p>
          <verb-table v-for="(t, i) in L.tables" :key="i" :table="t" :open="i === 0"></verb-table>
        </grammar-card>

        <!-- ── 6. Examples ─────────────────────────────────────────── -->
        <grammar-card id="esempi" icon="💬" kicker="Passo 4 · Esempi"
                      :title="L.examples.length + ' esempi con traduzione'">
          <div class="vocab-toolbar">
            <div class="search-box">
              <span class="s-icon" aria-hidden="true">🔍</span>
              <input type="search" v-model="query" placeholder="Cerca negli esempi…" aria-label="Cerca negli esempi">
            </div>
            <button class="btn btn-ghost btn-sm" @click="toggleTr">
              {{ store.hideTranslations ? '👁️ Mostra' : '🙈 Nascondi' }} traduzioni
            </button>
          </div>
          <p class="small muted">Ogni esempio: <b>italiano</b> ↓ <i>traduzione letterale</i> ↓ inglese naturale ↓ nota grammaticale.</p>
          <example-card v-for="(e, i) in shownExamples" :key="i" :ex="e" :n="i + 1"></example-card>
          <p v-if="!shownExamples.length" class="muted center">Nessun esempio trovato per «{{ query }}».</p>
        </grammar-card>

        <!-- ── 7. Common mistakes ──────────────────────────────────── -->
        <grammar-card id="errori" icon="🚨" kicker="Passo 5 · Errori" title="Errori comuni — e perché">
          <mistake-card v-for="(m, i) in L.mistakes" :key="i" :m="m"></mistake-card>
        </grammar-card>

        <!-- ── 8. Exercises ────────────────────────────────────────── -->
        <grammar-card id="esercizi" icon="✏️" kicker="Passo 6 · Pratica" title="Esercizi interattivi">
          <exercise-panel :ex="L.exercises" :lesson-file="L.file"></exercise-panel>
        </grammar-card>

        <!-- ── 9. Mini conversation ────────────────────────────────── -->
        <grammar-card v-if="L.dialogue" id="dialogo" icon="🎭" kicker="Passo 7 · Conversazione"
                      :title="L.dialogue.title">
          <p v-if="L.dialogue.intro" class="small muted">{{ L.dialogue.intro }}</p>
          <dialogue-box :lines="L.dialogue.lines"></dialogue-box>
        </grammar-card>

        <!-- ── Flashcards ──────────────────────────────────────────── -->
        <grammar-card id="flashcards" icon="🃏" kicker="Memoria" title="Flashcard" collapsible :open="false">
          <flash-deck :cards="L.flashcards" :deck-id="L.file"></flash-deck>
        </grammar-card>

        <!-- ── 10. Summary ─────────────────────────────────────────── -->
        <div id="riassunto" style="margin-bottom:20px">
          <summary-card :summary="L.summary"></summary-card>
        </div>

        <!-- ── Complete + pager ────────────────────────────────────── -->
        <section class="card center">
          <h2 style="font-size:1.15rem">Hai finito la lezione {{ L.num }}?</h2>
          <p class="muted small">Segna la lezione come completata per guadagnare 50 XP e sbloccare il badge nel menu.</p>
          <button class="btn btn-primary" @click="complete" :disabled="isDone">
            {{ isDone ? '✓ Lezione completata' : '✓ Segna come completata (+50 XP)' }}
          </button>
        </section>

        <nav class="pager" aria-label="Navigazione tra lezioni">
          <a v-if="prev" :href="prev.file"><p class="p-dir">← Precedente</p><p class="p-title">{{ prev.icon }} {{ prev.title }}</p></a>
          <span v-else style="flex:1"></span>
          <a v-if="next" :href="next.file" class="next"><p class="p-dir">Successiva →</p><p class="p-title">{{ next.icon }} {{ next.title }}</p></a>
          <span v-else style="flex:1"></span>
        </nav>
      </main>

      <footer class="site-footer">
        <p>Italiano A2 · Corso interattivo di grammatica · I progressi restano nel tuo browser (localStorage).</p>
      </footer>
      <toast-host></toast-host>
    `
  };

  /** Boots a lesson page from window.LESSON. */
  ITA.mountLesson = function (lesson) {
    document.title = lesson.title + ' · Italiano A2';
    return ITA.createPage({
      components: { 'lesson-page': lessonPage },
      data: () => ({ lesson: lesson }),
      template: '<lesson-page :lesson="lesson"></lesson-page>'
    });
  };
})();
