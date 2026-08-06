/* ============================================================================
   wordbank.js — browsable vocabulary pages (verbs, words, phrases)
   ----------------------------------------------------------------------------
   Powers any page that is "a big list of words" instead of a grammar lesson:
     • search + category filter + favourites filter
     • card grid (Italian / English / optional Farsi + example)
     • "learned" marking with progress bar, stored per level
     • flashcard mode (reuses <flash-deck>)
     • quiz mode with auto-generated multiple choice questions
     • audio (SpeechSynthesis) and copy on every card

   A page supplies:
     window.WORDBANK = {
       file, num, icon, title, subtitle, intro,
       showFarsi: true|false,
       categories: [ { id, label, icon } ],
       words: [ { it, en, fa?, cat, pos?, ex?, exEn? } ]
     }
   and calls ITA.mountWordbank(window.WORDBANK).
   ========================================================================== */
(function () {
  'use strict';
  const ITA = window.ITA;
  const { store, shuffle, addXp, markComplete, toggleBookmark, toggleFavorite, isFavorite } = ITA;

  const wordbankPage = {
    props: { cfg: { type: Object, required: true } },
    data() {
      return {
        store,
        W: this.cfg,
        levelName: ITA.LEVEL,
        q: '',
        cat: 'all',
        onlyFav: false,
        onlyUnknown: false,
        mode: 'grid',          // 'grid' | 'flash' | 'quiz'
        quiz: null,
        quizAnswers: {},
        quizDone: false
      };
    },
    computed: {
      words() { return this.W.words; },
      /** id used for favourites / learned bookkeeping */
      filtered() {
        const q = ITA.normalise(this.q);
        return this.words.filter(w => {
          if (this.cat !== 'all' && w.cat !== this.cat) return false;
          if (this.onlyFav && !isFavorite(this.key(w))) return false;
          if (this.onlyUnknown && store.known[this.key(w)]) return false;
          if (!q) return true;
          return ITA.normalise([w.it, w.en, w.fa || '', w.ex || ''].join(' ')).indexOf(q) >= 0;
        });
      },
      knownCount() { return this.words.filter(w => store.known[this.key(w)]).length; },
      pct() { return Math.round(this.knownCount / this.words.length * 100); },
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
          back: this.W.showFarsi ? (w.fa + '  ·  ' + w.en) : w.en,
          note: w.ex || ''
        }));
      },
      quizScore() {
        if (!this.quiz) return 0;
        return this.quiz.filter((q, i) => this.quizAnswers[i] === q.answer).length;
      },
      prev() {
        const i = ITA.lessons.findIndex(l => l.file === this.W.file);
        return i > 0 ? ITA.lessons[i - 1] : null;
      },
      next() {
        const i = ITA.lessons.findIndex(l => l.file === this.W.file);
        return i >= 0 && i < ITA.lessons.length - 1 ? ITA.lessons[i + 1] : null;
      }
    },
    methods: {
      key(w) { return this.W.file + ':' + w.it; },
      toggleKnown(w) {
        const k = this.key(w);
        if (store.known[k]) delete store.known[k];
        else { store.known[k] = true; addXp(2); }
      },
      isKnown(w) { return !!store.known[this.key(w)]; },
      fav(w) { toggleFavorite(this.key(w)); },
      isFav(w) { return isFavorite(this.key(w)); },
      catLabel(id) {
        const c = this.W.categories.find(c => c.id === id);
        return c ? c.icon + ' ' + c.label : id;
      },
      toggleTr() { store.hideTranslations = !store.hideTranslations; },
      complete() { markComplete(this.W.file); },
      bookmark() { toggleBookmark(this.W.file); },
      /** Builds 12 multiple-choice questions from the (filtered) word list. */
      buildQuiz() {
        const pool = this.filtered.length >= 8 ? this.filtered : this.words;
        const picks = shuffle(pool).slice(0, Math.min(12, pool.length));
        const field = this.W.showFarsi ? 'fa' : 'en';
        this.quiz = picks.map(w => {
          const wrong = shuffle(this.words.filter(x => x.it !== w.it)).slice(0, 3);
          const opts = shuffle([w].concat(wrong)).map(x => x[field]);
          return {
            word: w.it,
            hint: w.ex || '',
            options: opts,
            answer: opts.indexOf(w[field])
          };
        });
        this.quizAnswers = {};
        this.quizDone = false;
        this.mode = 'quiz';
      },
      answerQuiz(qi, oi) {
        if (this.quizAnswers[qi] !== undefined) return;
        this.quizAnswers[qi] = oi;
        if (Object.keys(this.quizAnswers).length === this.quiz.length) {
          this.quizDone = true;
          addXp(this.quizScore * 5);
          store.scores[this.W.file] = {
            correct: this.quizScore, total: this.quiz.length,
            pct: Math.round(this.quizScore / this.quiz.length * 100)
          };
        }
      },
      quizCls(qi, oi) {
        if (this.quizAnswers[qi] === undefined) return '';
        if (oi === this.quiz[qi].answer) return 'correct';
        return this.quizAnswers[qi] === oi ? 'wrong' : '';
      },
      shuffleGrid() { this.W.words = shuffle(this.words); }
    },
    template: `
      <a class="skip-link" href="#main">Vai al contenuto</a>
      <site-header :current="W.file"></site-header>

      <main id="main" class="container">
        <header class="hero animate-in">
          <p class="card-kicker" style="color:rgba(255,255,255,.85)">Lezione {{ W.num }} · Italiano {{ levelName }}</p>
          <h1>{{ W.icon }} {{ W.title }}</h1>
          <p>{{ W.subtitle }}</p>
          <div class="hero-stats">
            <div class="hero-stat"><b>{{ words.length }}</b><span>parole</span></div>
            <div class="hero-stat"><b>{{ W.categories.length }}</b><span>categorie</span></div>
            <div class="hero-stat"><b>{{ knownCount }}</b><span>imparate</span></div>
            <div class="hero-stat" v-if="store.scores[W.file]"><b>{{ store.scores[W.file].pct }}%</b><span>ultimo quiz</span></div>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" @click="bookmark" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)">
              {{ store.bookmarks.includes(W.file) ? '🔖 Salvata' : '🔖 Salva' }}
            </button>
            <button class="btn btn-ghost btn-sm" @click="toggleTr" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)">
              {{ store.hideTranslations ? '👁️ Mostra traduzioni' : '🙈 Nascondi traduzioni' }}
            </button>
          </div>
        </header>

        <!-- Intro -->
        <grammar-card v-if="W.intro" icon="🎯" kicker="Come usare questa pagina" :title="W.introTitle || 'Istruzioni'">
          <p v-html="W.intro"></p>
          <ul>
            <li><b>✓ Imparata</b>: segna una parola come imparata (+2 XP) e segui la barra di progresso.</li>
            <li><b>★</b>: aggiungi ai preferiti per ritrovarla con il filtro «Preferite».</li>
            <li><b>🔊</b>: ascolta la pronuncia italiana; <b>⧉</b> copia la parola.</li>
            <li><b>🃏 Flashcard</b> e <b>❓ Quiz</b> usano solo le parole filtrate in quel momento.</li>
          </ul>
        </grammar-card>

        <!-- Progress -->
        <section class="card">
          <progress-bar :value="pct" label="Parole imparate" :right="knownCount + ' / ' + words.length + ' (' + pct + '%)'"></progress-bar>
          <div class="btn-row">
            <button class="btn" :class="mode === 'grid' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'grid'">📋 Elenco</button>
            <button class="btn" :class="mode === 'flash' ? 'btn-primary' : 'btn-ghost'" @click="mode = 'flash'">🃏 Flashcard</button>
            <button class="btn" :class="mode === 'quiz' ? 'btn-primary' : 'btn-ghost'" @click="buildQuiz">❓ Quiz</button>
          </div>
        </section>

        <!-- Toolbar -->
        <div class="vocab-toolbar">
          <div class="search-box">
            <span class="s-icon" aria-hidden="true">🔍</span>
            <input type="search" v-model="q" :placeholder="W.searchPlaceholder || 'Cerca in italiano, inglese o farsi…'"
                   aria-label="Cerca una parola">
          </div>
          <button class="btn btn-ghost btn-sm" :class="{ 'btn-blue': onlyFav }" @click="onlyFav = !onlyFav">★ Preferite</button>
          <button class="btn btn-ghost btn-sm" :class="{ 'btn-blue': onlyUnknown }" @click="onlyUnknown = !onlyUnknown">📕 Da imparare</button>
        </div>

        <div class="chip-row">
          <button class="chip" :class="{ active: cat === 'all' }" @click="cat = 'all'">Tutte <small>{{ words.length }}</small></button>
          <button v-for="c in W.categories" :key="c.id" class="chip" :class="{ active: cat === c.id }" @click="cat = c.id">
            {{ c.icon }} {{ c.label }} <small>{{ catCounts[c.id] || 0 }}</small>
          </button>
        </div>

        <!-- GRID MODE -->
        <div v-if="mode === 'grid'">
          <p class="small muted">{{ filtered.length }} parole mostrate.</p>
          <div class="vocab-grid">
            <article v-for="(w, i) in filtered" :key="w.it + i" class="vocab-card"
                     :class="{ 'hidden-tr': store.hideTranslations }"
                     :style="{ animationDelay: Math.min(i, 20) * 20 + 'ms', borderColor: isKnown(w) ? 'var(--ok)' : '' }">
              <div class="vc-top">
                <span class="vc-it">{{ w.it }}</span>
                <span v-if="w.pos" class="vc-pos">{{ w.pos }}</span>
              </div>
              <p class="vc-en">{{ w.en }}</p>
              <p v-if="W.showFarsi" class="vc-fa" lang="fa" dir="rtl">{{ w.fa }}</p>
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
          <p v-if="!filtered.length" class="muted center" style="margin-top:24px">
            Nessun risultato per «{{ q }}». Prova un'altra parola o cambia categoria.
          </p>
        </div>

        <!-- FLASHCARD MODE -->
        <section v-else-if="mode === 'flash'" class="card">
          <div class="card-head">
            <span class="card-badge" aria-hidden="true">🃏</span>
            <div><p class="card-kicker">Ripasso</p><h2 style="font-size:1.2rem">Flashcard ({{ flashcards.length }})</h2></div>
          </div>
          <flash-deck :cards="flashcards" :deck-id="W.file" :key="flashcards.length + cat + q"></flash-deck>
        </section>

        <!-- QUIZ MODE -->
        <section v-else class="card">
          <div class="card-head">
            <span class="card-badge" aria-hidden="true">❓</span>
            <div><p class="card-kicker">Verifica</p><h2 style="font-size:1.2rem">Quiz — che cosa significa?</h2></div>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="buildQuiz">↻ Nuovo quiz</button>
          </div>

          <div v-for="(qz, qi) in quiz" :key="qi" class="q-block">
            <div class="q-prompt">
              <span class="q-index" aria-hidden="true">{{ qi + 1 }}</span>
              <span class="q-sentence">{{ qz.word }}
                <speak-btn :text="qz.word" style="vertical-align:middle"></speak-btn>
              </span>
            </div>
            <div class="opt-list">
              <button v-for="(o, oi) in qz.options" :key="oi" class="opt" :class="quizCls(qi, oi)"
                      :disabled="quizAnswers[qi] !== undefined" @click="answerQuiz(qi, oi)">
                <span class="opt-key" aria-hidden="true">{{ 'ABCD'[oi] }}</span>
                <span :class="W.showFarsi ? 'fa' : ''">{{ o }}</span>
              </button>
            </div>
            <p v-if="quizAnswers[qi] !== undefined && qz.hint" class="feedback"
               :class="quizAnswers[qi] === qz.answer ? 'ok' : 'no'">
              {{ quizAnswers[qi] === qz.answer ? '✅ ' : '❌ ' }}<span class="it">{{ qz.hint }}</span>
            </p>
          </div>

          <div v-if="quizDone" class="score-box" style="margin-top:16px">
            <div class="score-ring" :style="{ '--pct': Math.round(quizScore / quiz.length * 100) }">
              <span>{{ Math.round(quizScore / quiz.length * 100) }}%</span>
            </div>
            <div>
              <p style="margin:0;font-weight:800">{{ quizScore }} / {{ quiz.length }} corrette</p>
              <p class="small muted" style="margin:0">Hai guadagnato {{ quizScore * 5 }} XP.</p>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-left:auto" @click="buildQuiz">↻ Riprova</button>
          </div>
        </section>

        <!-- Complete + pager -->
        <section class="card center" style="margin-top:22px">
          <h2 style="font-size:1.15rem">Hai finito questa sezione?</h2>
          <p class="muted small">Segnala come completata per guadagnare 50 XP.</p>
          <button class="btn btn-primary" @click="complete" :disabled="store.completed[W.file]">
            {{ store.completed[W.file] ? '✓ Completata' : '✓ Segna come completata (+50 XP)' }}
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
        <p>Italiano {{ levelName }} · Corso interattivo di grammatica · I progressi restano nel tuo browser (localStorage).</p>
      </footer>
      <toast-host></toast-host>
    `
  };

  ITA.mountWordbank = function (cfg) {
    document.title = cfg.title + ' · Italiano ' + ITA.LEVEL;
    return ITA.createPage({
      components: { 'wordbank-page': wordbankPage },
      data: () => ({ cfg: cfg }),
      template: '<wordbank-page :cfg="cfg"></wordbank-page>'
    });
  };
})();
