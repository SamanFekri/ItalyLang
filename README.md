# Italiano Interattivo 🇮🇹

An interactive Italian course built with **Vue 3 (via CDN)**, HTML and CSS.
No backend, no build step — just static files that also work when opened straight from disk.

---

## Running it

**Option 1 — Node server (recommended)**

```bash
npm start              # → http://localhost:3000
```

`server.js` has **zero dependencies** (Node built-ins only), so there is nothing to install.

```bash
node server.js 8080    # custom port
PORT=8080 node server.js
```

**Option 2 — just open the file**

```bash
open index.html
```

> An internet connection is needed on first load: Vue 3 is fetched from the unpkg CDN.
> Everything else (progress, XP, streak, favourites) lives in the browser's `localStorage`.

---

## Project structure

The root holds only what is needed to **deploy** the site plus the **shared engine**.
Each level (A2, B1 today; A1 next) lives in its own folder, built from the exact same
engine and data schema — a level is just a folder plus a `lessons.js`.

```
.
├── index.html                  ← entry page: level picker (deploy entry point)
├── server.js                   ← zero-dependency static dev server
├── package.json
├── README.md
├── assets/                     ← shared by ALL levels
│   ├── styles.css              design system: tokens, light/dark theme, components, responsive
│   ├── app.js                  store (localStorage), XP, streak, theme, audio, <site-header>
│   ├── components.js           reusable teaching components (+ vocab-list, guided-practice)
│   ├── exercises.js            the 7 exercise types + <exercise-panel>
│   ├── lesson.js               renders a full lesson from its data object
│   └── wordbank.js             vocabulary pages (list + flashcards + quiz)
├── A2/                         ← level A2 content (elementare)
│   ├── index.html              course dashboard (progress, search, filters)
│   ├── lessons.js              lesson index — single source of truth for navigation
│   ├── 01-essere.html … 14-imperativo.html
│   ├── 15-verbi-quotidiani.html    100 verbs grouped by topic
│   ├── 16-vocabolario-200.html     200 words with English and Farsi (فارسی)
│   └── 17-ripasso.html             final mixed quiz with per-topic diagnosis
└── B1/                         ← level B1 content (intermedio)
    ├── index.html              course dashboard (progress, search, filters)
    ├── lessons.js              lesson index — single source of truth for navigation
    ├── 01-trapassato-prossimo.html … 14-preposizioni-avanzate.html
    └── 15-ripasso-b1.html          final exam: quiz + reading + listening + writing/speaking prompts
```

### Adding a new level

1. Create the folder (e.g. `A1/`).
2. Copy an existing `lessons.js` (A2's or B1's) and edit its list.
3. In each page set `window.ITA_LEVEL = 'A1'` **before** loading `../assets/app.js`
   — every level then gets its own progress bucket in `localStorage`.
4. Add an entry to the `LEVELS` array in the root `index.html`.

### Adding a lesson to an existing level

1. Add the row to that level's `lessons.js` (e.g. `B1/lessons.js`).
2. Create the HTML file by copying an existing lesson: declare only the
   `window.LESSON = { … }` object and call `ITA.mountLesson(window.LESSON)`.
   All rendering (sections, exercises, flashcards, pager) is automatic.
3. Optional lesson blocks, added for B1 but usable by any level: `L.objectives`
   (bullet list shown in the introduction card), `L.vocab` (a full vocabulary set
   rendered with `<vocab-list>` — grid + flashcards, same shape as a wordbank page),
   and `L.guided` (worked examples shown before the exercises, via `<guided-practice>`).

---

## A2 course contents

| # | Lesson | Topic |
|---|--------|-------|
| 1 | Essere | present tense, past participle, c'è / ci sono, set phrases |
| 2 | Avere | present tense, ho fame / sete / paura, avere bisogno di |
| 3 | Present indicative | -are, -ere, -ire, -isc- verbs, irregulars |
| 4 | Modal verbs | dovere, potere, volere + infinitive; modals in the past |
| 5 | Passato prossimo | essere vs avere, participle agreement, signal words |
| 6 | Reflexive verbs | mi alzo, ti chiami, ci svegliamo; past tense and agreement |
| 7 | Piacere | mi piace / mi piacciono, indirect object pronouns, mancare & servire |
| 8 | Stare + gerund | sto mangiando, stare per, and when *not* to use it |
| 9 | Verb + preposition | the system behind **a**, **di** and no preposition |
| 10 | Sapere vs conoscere | decision tree, ho saputo vs ho conosciuto |
| 11 | Fare | fare colazione, fare la spesa, fa freddo, fare + infinitive |
| 12 | Andare / Venire | a / in / da, andare a + infinitive, set phrases |
| 13 | Dire | dire che vs dire di, reported speech, dire / parlare / raccontare |
| 14 | Imperative | tu, Lei, noi, negation with the infinitive, pronoun placement |
| 15 | 100 everyday verbs | 10 categories × 10 verbs, each with an example |
| 16 | 200 essential words | 12 categories, Italian · English · فارسی |
| 17 | Final review | 60 questions, per-topic scoring and a study plan |

**By the numbers:** 277 translated examples (Italian → literal → natural → grammar note),
845 exercise items, 174 flashcards, 300 vocabulary entries.

---

## B1 course contents

| # | Unit | Topic |
|---|------|-------|
| 1 | Trapassato prossimo | the past-before-the-past: formation, auxiliary choice, agreement, vs passato prossimo/imperfetto |
| 2 | Condizionale passato | regret (avrei voluto/dovuto/potuto), future-in-the-past, unconfirmed news |
| 3 | Congiuntivo passato | opinion, doubt, emotion; indicative vs subjunctive; the two-subjects rule |
| 4 | Congiuntivo imperfetto | wishes, hypotheses, politeness; subjunctive sequence after a past main clause |
| 5 | Forma passiva | essere / venire / andare + participle, the agent with *da*, active ↔ passive |
| 6 | Discorso indiretto | reported statements, questions and commands; pronoun, time and tense shifts |
| 7 | Concordanza dei tempi | the full sequence-of-tenses map, indicative and subjunctive |
| 8 | Periodo ipotetico | the three *if*-clause types, from real to impossible |
| 9 | Pronomi combinati | me lo, te la, glielo — direct + indirect pronouns fused into one word |
| 10 | Verbi pronominali | farcela, andarsene, cavarsela, volerci and other native-sounding idioms |
| 11 | Gerundio | present and past gerund: simultaneity, cause, manner, the progressive |
| 12 | Participio passato | irregulars in depth, agreement rules, adjective use, absolute participle |
| 13 | Frasi relative | che, cui, il quale, ciò che, quanto — joining sentences correctly |
| 14 | Preposizioni avanzate | verb / adjective / noun + preposition, fixed formal expressions |
| 15 | Ripasso generale B1 | mixed quiz with per-topic diagnosis, plus reading, listening and writing/speaking prompts |

**By the numbers:** 252 translated examples, 1,040 exercise items, 191 flashcards,
782 vocabulary entries across the 14 grammar units.

---

## How every lesson is structured

All lessons follow the same teaching sequence:

1. **Meaning** — what it is, when it's used, why it matters, typical beginner mistakes
   (B1 lessons add explicit **learning objectives** here)
2. **Formula** — the sentence structure, shown as visual blocks
3. **Rule** — explained from scratch, exceptions included
4. **Timeline** — where the tense sits in time
5. **Conjugation tables** — collapsible, with irregular forms highlighted
6. **Examples (15+)** — Italian ↓ literal ↓ natural English ↓ grammar note
7. **Vocabulary** *(B1)* — a themed word set for the unit, with grid + flashcard modes
8. **Common mistakes** — ❌ wrong / ✅ correct, with the *why*
9. **Guided practice** *(B1)* — worked examples (prompt → reasoning → answer) before
   the free exercises
10. **Exercises** — 7 types: multiple choice, fill in the blanks, sentence ordering,
    drag & drop, matching, true/false, translation — auto-checked, with hints and scoring
11. **Mini conversation** — a dialogue with grammar explanations on hover
12. **Summary** — formula, key rules, memory tricks

---

## Features

- 🌗 Light/dark theme (follows the system, with a manual toggle)
- 📈 Progress, **XP**, user level and a daily **streak**, stored in `localStorage`
- 🔖 Bookmark lessons, ⭐ favourite verbs and words
- 🔊 Italian pronunciation via the browser's Web Speech API
- ⧉ One-click copy on every example sentence
- 🙈 Hide/show translations for self-testing
- 🎲 Random review, 🃏 shuffleable flashcards, 🔍 search on every page
- ♿ Semantic HTML, keyboard navigation, ARIA, `prefers-reduced-motion` support
- 📱 Responsive layout (mobile, tablet, desktop) plus a print stylesheet

---

## Technical notes

- **No ES modules**: all scripts are classic, so the site also works over `file://`.
- **Single source of truth** for navigation, per level: `A2/lessons.js`, `B1/lessons.js`.
- **Lessons are data, not markup**: each page declares a `LESSON` object and
  rendering is delegated to `assets/lesson.js`.
- **Per-level progress**: the `localStorage` key is `italiano::<LEVEL>::v1` — A2 and B1
  progress, XP and streaks are tracked completely separately.
- The dev server sends `Cache-Control: no-cache`, so editing a lesson and hitting
  refresh shows the change immediately.
