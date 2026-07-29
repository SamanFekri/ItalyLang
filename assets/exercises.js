/* ============================================================================
   exercises.js — the practice engine
   ----------------------------------------------------------------------------
     <quiz-card>       multiple-choice quiz with score + XP
     <fill-blanks>     type-the-missing-word, accent/case tolerant
     <word-order>      click or drag word tiles into the right order
     <drag-match>      drag & drop items into the correct bucket
     <match-pairs>     click A then B to connect pairs
     <true-false>      vero / falso with explanations
     <translate-box>   free translation with multiple accepted answers
     <exercise-panel>  tabbed container that wires all of the above together
   Every exercise reports its score upward so the lesson can award XP once.
   ========================================================================== */
(function () {
  'use strict';
  const C = (window.ITA_COMPONENTS = window.ITA_COMPONENTS || {});
  const { shuffle, answerMatches, toast, addXp, store } = window.ITA;

  /* Shared behaviour for every exercise type: emits {correct,total} upward. */
  const scoreMixin = {
    emits: ['score'],
    methods: {
      report(correct, total) { this.$emit('score', { correct: correct, total: total }); }
    }
  };

  /* ------------------------------------------------------------------ */
  /* 1. MULTIPLE CHOICE                                                  */
  /* ------------------------------------------------------------------ */
  /* items: [ { q, sentence, options:[], answer:0, hint, why } ] */
  C['quiz-card'] = {
    mixins: [scoreMixin],
    props: { items: { type: Array, required: true }, title: { type: String, default: 'Scelta multipla' } },
    data() { return { picked: {}, hints: {} }; },
    computed: {
      answered() { return Object.keys(this.picked).length; },
      correct() { return this.items.filter((it, i) => this.picked[i] === it.answer).length; },
      done() { return this.answered === this.items.length; },
      pct() { return this.items.length ? Math.round(this.correct / this.items.length * 100) : 0; }
    },
    methods: {
      pick(qi, oi) {
        if (this.picked[qi] !== undefined) return;
        this.picked[qi] = oi;
        if (this.done) this.report(this.correct, this.items.length);
      },
      cls(qi, oi) {
        if (this.picked[qi] === undefined) return '';
        if (oi === this.items[qi].answer) return 'correct';
        return this.picked[qi] === oi ? 'wrong' : '';
      },
      reset() { this.picked = {}; this.hints = {}; },
      letter(i) { return 'ABCD'[i]; }
    },
    template: `
      <div>
        <div v-for="(it, qi) in items" :key="qi" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ qi + 1 }}</span>
            <span>
              {{ it.q }}
              <span v-if="it.sentence" class="q-sentence" style="display:block;margin-top:4px">{{ it.sentence }}</span>
            </span>
          </div>
          <div class="opt-list" role="group" :aria-label="'Domanda ' + (qi + 1)">
            <button v-for="(o, oi) in it.options" :key="oi" class="opt" :class="cls(qi, oi)"
                    :disabled="picked[qi] !== undefined" @click="pick(qi, oi)">
              <span class="opt-key" aria-hidden="true">{{ letter(oi) }}</span>
              <span class="it">{{ o }}</span>
            </button>
          </div>
          <div class="row" style="margin-top:8px">
            <button v-if="it.hint && picked[qi] === undefined" class="btn btn-ghost btn-sm"
                    @click="hints[qi] = true">💡 Suggerimento</button>
          </div>
          <p v-if="hints[qi] && picked[qi] === undefined" class="feedback hint">💡 {{ it.hint }}</p>
          <p v-if="picked[qi] !== undefined" class="feedback" :class="picked[qi] === it.answer ? 'ok' : 'no'">
            {{ picked[qi] === it.answer ? '✅ Esatto! ' : '❌ Non proprio. ' }}{{ it.why }}
          </p>
        </div>

        <div v-if="done" class="score-box" style="margin-top:18px">
          <div class="score-ring" :style="{ '--pct': pct }"><span>{{ pct }}%</span></div>
          <div>
            <p style="margin:0;font-weight:800">{{ correct }} / {{ items.length }} corrette</p>
            <p class="small muted" style="margin:0">{{ pct >= 80 ? 'Bravissimo! 🎉' : pct >= 50 ? 'Buon lavoro — rileggi la regola.' : 'Rileggi la lezione e riprova.' }}</p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="reset" style="margin-left:auto">↻ Riprova</button>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 2. FILL IN THE BLANKS                                               */
  /* ------------------------------------------------------------------ */
  /* items: [ { before, after, answer|answers[], hint, why, en } ] */
  C['fill-blanks'] = {
    mixins: [scoreMixin],
    props: { items: { type: Array, required: true } },
    data() { return { vals: {}, checked: false, hints: {} }; },
    computed: {
      results() { return this.items.map((it, i) => answerMatches(this.vals[i] || '', it.answers || [it.answer])); },
      correct() { return this.results.filter(Boolean).length; },
      pct() { return Math.round(this.correct / this.items.length * 100); }
    },
    methods: {
      check() { this.checked = true; this.report(this.correct, this.items.length); },
      reset() { this.vals = {}; this.checked = false; this.hints = {}; },
      cls(i) { return !this.checked ? '' : (this.results[i] ? 'ok' : 'no'); },
      solution(it) { return (it.answers || [it.answer])[0]; }
    },
    template: `
      <div>
        <p class="small muted">Scrivi la forma corretta. Gli accenti e le maiuscole non sono obbligatori.</p>
        <div v-for="(it, i) in items" :key="i" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ i + 1 }}</span>
            <span class="q-sentence">
              {{ it.before }}
              <input class="fill-input" :class="cls(i)" type="text" v-model="vals[i]"
                     :aria-label="'Completa la frase ' + (i + 1)" :placeholder="it.placeholder || '...'"
                     @keyup.enter="check" autocomplete="off" autocapitalize="off" spellcheck="false">
              {{ it.after }}
            </span>
          </div>
          <p v-if="it.en" class="small muted" style="margin:2px 0 0 35px">🇬🇧 {{ it.en }}</p>
          <button v-if="it.hint && !checked" class="btn btn-ghost btn-sm" style="margin-left:35px;margin-top:6px"
                  @click="hints[i] = true">💡 Suggerimento</button>
          <p v-if="hints[i] && !checked" class="feedback hint">💡 {{ it.hint }}</p>
          <p v-if="checked" class="feedback" :class="results[i] ? 'ok' : 'no'">
            <template v-if="results[i]">✅ Corretto!</template>
            <template v-else>❌ La risposta giusta è <b class="it">{{ solution(it) }}</b>.</template>
            <span v-if="it.why"> {{ it.why }}</span>
          </p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" @click="check" :disabled="checked">✓ Controlla</button>
          <button class="btn btn-ghost" @click="reset">↻ Riprova</button>
          <span v-if="checked" class="pill" :class="pct >= 70 ? 'pill-ok' : 'pill-warn'">{{ correct }}/{{ items.length }} — {{ pct }}%</span>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 3. SENTENCE ORDERING (click + drag)                                 */
  /* ------------------------------------------------------------------ */
  /* items: [ { words: [], answer: 'Io devo studiare stasera', en, hint } ] */
  C['word-order'] = {
    mixins: [scoreMixin],
    props: { items: { type: Array, required: true } },
    data() {
      return {
        pool: this.items.map(it => shuffle(it.words)),
        built: this.items.map(() => []),
        checked: false, dragFrom: null, hints: {}
      };
    },
    computed: {
      results() { return this.items.map((it, i) => answerMatches(this.built[i].join(' '), [it.answer])); },
      correct() { return this.results.filter(Boolean).length; }
    },
    methods: {
      take(i, wi) { this.built[i].push(this.pool[i].splice(wi, 1)[0]); },
      give(i, wi) { this.pool[i].push(this.built[i].splice(wi, 1)[0]); },
      onDragStart(i, wi, from) { this.dragFrom = { i, wi, from }; },
      onDrop(i, to) {
        const d = this.dragFrom;
        if (!d || d.i !== i || d.from === to) return;
        if (to === 'answer') this.take(i, d.wi); else this.give(i, d.wi);
        this.dragFrom = null;
      },
      check() { this.checked = true; this.report(this.correct, this.items.length); },
      reset() {
        this.pool = this.items.map(it => shuffle(it.words));
        this.built = this.items.map(() => []);
        this.checked = false; this.hints = {};
      }
    },
    template: `
      <div>
        <p class="small muted">Clicca le parole nell'ordine giusto (oppure trascinale). Clicca di nuovo per rimuoverle.</p>
        <div v-for="(it, i) in items" :key="i" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ i + 1 }}</span>
            <span>{{ it.prompt || 'Metti le parole in ordine:' }}
              <span v-if="it.en" class="small muted" style="display:block">🇬🇧 {{ it.en }}</span>
            </span>
          </div>

          <div class="tile-tray answer" @dragover.prevent @drop="onDrop(i, 'answer')"
               :aria-label="'Frase costruita ' + (i + 1)">
            <span v-if="!built[i].length" class="tile-empty">La tua frase apparirà qui…</span>
            <button v-for="(w, wi) in built[i]" :key="wi" class="tile" draggable="true"
                    @dragstart="onDragStart(i, wi, 'answer')" @click="give(i, wi)">{{ w }}</button>
          </div>

          <div class="tile-tray" style="margin-top:10px" @dragover.prevent @drop="onDrop(i, 'pool')"
               :aria-label="'Parole disponibili ' + (i + 1)">
            <span v-if="!pool[i].length" class="tile-empty">— vuoto —</span>
            <button v-for="(w, wi) in pool[i]" :key="wi" class="tile" draggable="true"
                    @dragstart="onDragStart(i, wi, 'pool')" @click="take(i, wi)">{{ w }}</button>
          </div>

          <button v-if="it.hint && !checked" class="btn btn-ghost btn-sm" style="margin-top:8px"
                  @click="hints[i] = true">💡 Suggerimento</button>
          <p v-if="hints[i] && !checked" class="feedback hint">💡 {{ it.hint }}</p>
          <p v-if="checked" class="feedback" :class="results[i] ? 'ok' : 'no'">
            <template v-if="results[i]">✅ Perfetto!</template>
            <template v-else>❌ Ordine corretto: <b class="it">{{ it.answer }}</b></template>
          </p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" @click="check" :disabled="checked">✓ Controlla</button>
          <button class="btn btn-ghost" @click="reset">↻ Riprova</button>
          <span v-if="checked" class="pill pill-info">{{ correct }}/{{ items.length }}</span>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 4. DRAG & DROP INTO BUCKETS                                         */
  /* ------------------------------------------------------------------ */
  /* data: { instructions, buckets: [ {id, label, icon} ], items: [ {text, bucket} ] } */
  C['drag-match'] = {
    mixins: [scoreMixin],
    props: { data: { type: Object, required: true } },
    data() {
      return {
        placed: {},              // itemText -> bucketId
        pool: shuffle(this.data.items.map(i => i.text)),
        dragging: null, over: null, checked: false
      };
    },
    computed: {
      correct() {
        return this.data.items.filter(i => this.placed[i.text] === i.bucket).length;
      }
    },
    methods: {
      bucketItems(id) { return Object.keys(this.placed).filter(t => this.placed[t] === id); },
      start(text) { this.dragging = text; },
      drop(bid) {
        if (!this.dragging) return;
        this.placed[this.dragging] = bid;
        const i = this.pool.indexOf(this.dragging);
        if (i >= 0) this.pool.splice(i, 1);
        this.dragging = null; this.over = null;
      },
      // Keyboard/click fallback: click an item, then click a bucket.
      pick(text) { this.dragging = this.dragging === text ? null : text; },
      back(text) {
        delete this.placed[text];
        this.pool.push(text);
      },
      isRight(text) { return (this.data.items.find(i => i.text === text) || {}).bucket === this.placed[text]; },
      check() { this.checked = true; this.report(this.correct, this.data.items.length); },
      reset() { this.placed = {}; this.pool = shuffle(this.data.items.map(i => i.text)); this.checked = false; }
    },
    template: `
      <div>
        <p class="small muted">{{ data.instructions || 'Trascina ogni elemento nella colonna giusta (o clicca prima l\\'elemento, poi la colonna).' }}</p>

        <div class="tile-tray" style="margin-bottom:14px">
          <span v-if="!pool.length" class="tile-empty">Tutti gli elementi sono stati sistemati ✓</span>
          <button v-for="w in pool" :key="w" class="tile" draggable="true"
                  :class="{ dragging: dragging === w }"
                  @dragstart="start(w)" @click="pick(w)">{{ w }}</button>
        </div>

        <div class="grid grid-2">
          <div v-for="b in data.buckets" :key="b.id" class="card" style="margin:0;padding:14px"
               :class="{ 'drop-hover': over === b.id }"
               @dragover.prevent="over = b.id" @dragleave="over = null" @drop="drop(b.id)"
               @click="dragging && drop(b.id)">
            <h4 style="margin:0 0 8px">{{ b.icon }} {{ b.label }}</h4>
            <div class="tile-tray" style="min-height:70px;border-style:solid">
              <span v-if="!bucketItems(b.id).length" class="tile-empty">trascina qui…</span>
              <button v-for="t in bucketItems(b.id)" :key="t" class="tile" @click.stop="back(t)"
                      :style="checked ? (isRight(t) ? 'border-color:var(--ok);background:var(--ok-bg)' : 'border-color:var(--err);background:var(--err-bg)') : ''">
                {{ t }}<span v-if="checked">{{ isRight(t) ? ' ✓' : ' ✗' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" @click="check" :disabled="checked || pool.length">✓ Controlla</button>
          <button class="btn btn-ghost" @click="reset">↻ Riprova</button>
          <span v-if="checked" class="pill" :class="correct === data.items.length ? 'pill-ok' : 'pill-warn'">
            {{ correct }}/{{ data.items.length }}
          </span>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 5. MATCHING PAIRS                                                   */
  /* ------------------------------------------------------------------ */
  /* pairs: [ { a, b } ] */
  C['match-pairs'] = {
    mixins: [scoreMixin],
    props: { pairs: { type: Array, required: true }, labels: { type: Array, default: () => ['Italiano', 'Significato'] } },
    data() {
      return {
        left: shuffle(this.pairs.map((p, i) => ({ i, text: p.a }))),
        right: shuffle(this.pairs.map((p, i) => ({ i, text: p.b }))),
        selA: null, matched: [], wrong: null, tries: 0
      };
    },
    computed: {
      finished() { return this.matched.length === this.pairs.length; }
    },
    methods: {
      clickA(item) { if (this.isDone(item.i)) return; this.selA = this.selA === item.i ? null : item.i; },
      clickB(item) {
        if (this.selA === null || this.isDone(item.i)) return;
        this.tries++;
        if (this.selA === item.i) {
          this.matched.push(item.i);
          this.selA = null;
          if (this.finished) this.report(this.pairs.length, this.tries);
        } else {
          this.wrong = item.i;
          setTimeout(() => { this.wrong = null; this.selA = null; }, 450);
        }
      },
      isDone(i) { return this.matched.indexOf(i) >= 0; },
      reset() {
        this.left = shuffle(this.pairs.map((p, i) => ({ i, text: p.a })));
        this.right = shuffle(this.pairs.map((p, i) => ({ i, text: p.b })));
        this.selA = null; this.matched = []; this.tries = 0;
      }
    },
    template: `
      <div>
        <p class="small muted">Clicca un elemento a sinistra, poi il suo abbinamento a destra.</p>
        <div class="match-grid">
          <div class="match-col">
            <p class="card-kicker">{{ labels[0] }}</p>
            <button v-for="it in left" :key="'a' + it.i" class="match-item it"
                    :class="{ sel: selA === it.i, done: isDone(it.i) }"
                    :disabled="isDone(it.i)" @click="clickA(it)">{{ it.text }}</button>
          </div>
          <div class="match-col">
            <p class="card-kicker">{{ labels[1] }}</p>
            <button v-for="it in right" :key="'b' + it.i" class="match-item"
                    :class="{ done: isDone(it.i), shake: wrong === it.i }"
                    :disabled="isDone(it.i)" @click="clickB(it)">{{ it.text }}</button>
          </div>
        </div>
        <div class="btn-row">
          <span class="pill" :class="finished ? 'pill-ok' : 'pill-info'">
            {{ matched.length }}/{{ pairs.length }} abbinati · {{ tries }} tentativi
          </span>
          <button class="btn btn-ghost btn-sm" @click="reset">↻ Rimescola</button>
        </div>
        <p v-if="finished" class="feedback ok">🎉 Tutti gli abbinamenti sono corretti!</p>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 6. TRUE / FALSE                                                     */
  /* ------------------------------------------------------------------ */
  /* items: [ { statement, answer: true, why } ] */
  C['true-false'] = {
    mixins: [scoreMixin],
    props: { items: { type: Array, required: true } },
    data() { return { picked: {} }; },
    computed: {
      answered() { return Object.keys(this.picked).length; },
      correct() { return this.items.filter((it, i) => this.picked[i] === it.answer).length; }
    },
    methods: {
      pick(i, v) {
        if (this.picked[i] !== undefined) return;
        this.picked[i] = v;
        if (this.answered === this.items.length) this.report(this.correct, this.items.length);
      },
      cls(i, v) {
        if (this.picked[i] === undefined) return '';
        if (this.picked[i] !== v) return '';
        return this.picked[i] === this.items[i].answer ? 'correct' : 'wrong';
      },
      reset() { this.picked = {}; }
    },
    template: `
      <div>
        <div v-for="(it, i) in items" :key="i" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ i + 1 }}</span>
            <span class="q-sentence">{{ it.statement }}</span>
          </div>
          <div class="tf-row">
            <button class="tf-btn" :class="cls(i, true)" :disabled="picked[i] !== undefined" @click="pick(i, true)">✔ Vero</button>
            <button class="tf-btn" :class="cls(i, false)" :disabled="picked[i] !== undefined" @click="pick(i, false)">✘ Falso</button>
          </div>
          <p v-if="picked[i] !== undefined" class="feedback" :class="picked[i] === it.answer ? 'ok' : 'no'">
            {{ picked[i] === it.answer ? '✅ ' : '❌ ' }}{{ it.why }}
          </p>
        </div>
        <div class="btn-row">
          <span class="pill pill-info">{{ correct }}/{{ items.length }}</span>
          <button class="btn btn-ghost btn-sm" @click="reset">↻ Riprova</button>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 7. TRANSLATION                                                      */
  /* ------------------------------------------------------------------ */
  /* items: [ { en, answers: [], hint, note } ] */
  C['translate-box'] = {
    mixins: [scoreMixin],
    props: { items: { type: Array, required: true } },
    data() { return { vals: {}, checked: {}, hints: {} }; },
    computed: {
      correct() { return this.items.filter((it, i) => this.checked[i] && answerMatches(this.vals[i] || '', it.answers)).length; },
      allChecked() { return Object.keys(this.checked).length === this.items.length; }
    },
    methods: {
      ok(i) { return answerMatches(this.vals[i] || '', this.items[i].answers); },
      check(i) {
        this.checked[i] = true;
        if (this.allChecked) this.report(this.correct, this.items.length);
      },
      reset() { this.vals = {}; this.checked = {}; this.hints = {}; }
    },
    template: `
      <div>
        <p class="small muted">Traduci in italiano. Sono accettate più versioni corrette.</p>
        <div v-for="(it, i) in items" :key="i" class="q-block">
          <div class="q-prompt">
            <span class="q-index" aria-hidden="true">{{ i + 1 }}</span>
            <span>🇬🇧 {{ it.en }}</span>
          </div>
          <input class="text-input" :class="checked[i] ? (ok(i) ? 'ok' : 'no') : ''" type="text"
                 v-model="vals[i]" :aria-label="'Traduzione ' + (i + 1)" placeholder="Scrivi in italiano…"
                 @keyup.enter="check(i)" autocomplete="off" spellcheck="false">
          <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-primary btn-sm" @click="check(i)" :disabled="checked[i]">✓ Controlla</button>
            <button v-if="it.hint && !checked[i]" class="btn btn-ghost btn-sm" @click="hints[i] = true">💡 Suggerimento</button>
          </div>
          <p v-if="hints[i] && !checked[i]" class="feedback hint">💡 {{ it.hint }}</p>
          <p v-if="checked[i]" class="feedback" :class="ok(i) ? 'ok' : 'no'">
            <template v-if="ok(i)">✅ Ottimo!</template>
            <template v-else>❌ Soluzione: <b class="it">{{ it.answers[0] }}</b></template>
            <span v-if="it.answers.length > 1" class="small"> · Anche: <span class="it">{{ it.answers.slice(1).join(' / ') }}</span></span>
            <span v-if="it.note"><br>{{ it.note }}</span>
          </p>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" @click="reset">↻ Ricomincia</button>
          <span class="pill pill-info">{{ correct }}/{{ items.length }}</span>
        </div>
      </div>
    `
  };

  /* ------------------------------------------------------------------ */
  /* 8. EXERCISE PANEL — tabs over every exercise type                   */
  /* ------------------------------------------------------------------ */
  /* ex: { mc:[], fill:[], order:[], dnd:{}, match:[], tf:[], translate:[] }  */
  C['exercise-panel'] = {
    props: { ex: { type: Object, required: true }, lessonFile: String },
    data() {
      return { tab: null, scores: {}, store, awarded: {} };
    },
    computed: {
      tabs() {
        const defs = [
          { id: 'mc', label: '① Scelta multipla', has: (this.ex.mc || []).length },
          { id: 'fill', label: '② Completa', has: (this.ex.fill || []).length },
          { id: 'order', label: '③ Ordina la frase', has: (this.ex.order || []).length },
          { id: 'dnd', label: '④ Trascina', has: this.ex.dnd ? 1 : 0 },
          { id: 'match', label: '⑤ Abbina', has: (this.ex.match || []).length },
          { id: 'tf', label: '⑥ Vero / Falso', has: (this.ex.tf || []).length },
          { id: 'translate', label: '⑦ Traduci', has: (this.ex.translate || []).length }
        ];
        return defs.filter(d => d.has);
      },
      totalCorrect() { return Object.values(this.scores).reduce((s, x) => s + x.correct, 0); },
      totalQuestions() { return Object.values(this.scores).reduce((s, x) => s + x.total, 0); },
      pct() { return this.totalQuestions ? Math.round(this.totalCorrect / this.totalQuestions * 100) : 0; },
      doneTabs() { return Object.keys(this.scores).length; }
    },
    created() { this.tab = this.tabs.length ? this.tabs[0].id : null; },
    methods: {
      onScore(id, payload) {
        this.scores[id] = payload;
        // XP is granted once per exercise type per lesson.
        if (!this.awarded[id]) {
          this.awarded[id] = true;
          addXp(Math.max(5, payload.correct * 5));
        }
        if (this.lessonFile) {
          store.scores[this.lessonFile] = {
            correct: this.totalCorrect, total: this.totalQuestions, pct: this.pct
          };
        }
      },
      isDone(id) { return !!this.scores[id]; }
    },
    template: `
      <div class="ex-panel">
        <div class="ex-tabs" role="tablist" aria-label="Tipi di esercizio">
          <button v-for="t in tabs" :key="t.id" class="ex-tab" :class="{ active: tab === t.id }"
                  role="tab" :aria-selected="String(tab === t.id)" @click="tab = t.id">
            {{ t.label }}<span v-if="isDone(t.id)" class="dot" aria-label="completato"></span>
          </button>
        </div>

        <div style="margin-bottom:16px">
          <progress-bar :value="doneTabs / tabs.length * 100"
                        :label="'Esercizi completati: ' + doneTabs + '/' + tabs.length"
                        :right="totalQuestions ? (totalCorrect + '/' + totalQuestions + ' · ' + pct + '%') : ''"></progress-bar>
        </div>

        <div role="tabpanel">
          <quiz-card      v-if="tab === 'mc'"        :items="ex.mc"        @score="onScore('mc', $event)"></quiz-card>
          <fill-blanks    v-else-if="tab === 'fill'" :items="ex.fill"      @score="onScore('fill', $event)"></fill-blanks>
          <word-order     v-else-if="tab === 'order'" :items="ex.order"    @score="onScore('order', $event)"></word-order>
          <drag-match     v-else-if="tab === 'dnd'"  :data="ex.dnd"        @score="onScore('dnd', $event)"></drag-match>
          <match-pairs    v-else-if="tab === 'match'" :pairs="ex.match"    @score="onScore('match', $event)"></match-pairs>
          <true-false     v-else-if="tab === 'tf'"   :items="ex.tf"        @score="onScore('tf', $event)"></true-false>
          <translate-box  v-else-if="tab === 'translate'" :items="ex.translate" @score="onScore('translate', $event)"></translate-box>
        </div>
      </div>
    `
  };
})();
