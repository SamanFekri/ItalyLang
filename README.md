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
Each level (A2 today, A1/B1 later) lives in its own folder.

```
.
├── index.html                  ← entry page: level picker (deploy entry point)
├── server.js                   ← zero-dependency static dev server
├── package.json
├── README.md
├── assets/                     ← shared by ALL levels
│   ├── styles.css              design system: tokens, light/dark theme, components, responsive
│   ├── app.js                  store (localStorage), XP, streak, theme, audio, <site-header>
│   ├── components.js           reusable teaching components
│   ├── exercises.js            the 7 exercise types + <exercise-panel>
│   ├── lesson.js               renders a full lesson from its data object
│   └── wordbank.js             vocabulary pages (list + flashcards + quiz)
└── A2/                         ← level A2 content
    ├── index.html              course dashboard (progress, search, filters)
    ├── lessons.js              lesson index — single source of truth for navigation
    ├── 01-essere.html … 14-imperativo.html
    ├── 15-verbi-quotidiani.html    100 verbs grouped by topic
    ├── 16-vocabolario-200.html     200 words with English and Farsi (فارسی)
    └── 17-ripasso.html             final mixed quiz with per-topic diagnosis
```

### Adding a new level

1. Create the folder (e.g. `B1/`).
2. Copy `A2/lessons.js` and edit its list.
3. In each page set `window.ITA_LEVEL = 'B1'` **before** loading `../assets/app.js`
   — every level then gets its own progress bucket in `localStorage`.
4. Add an entry to the `LEVELS` array in the root `index.html`.

### Adding a lesson to an existing level

1. Add the row to `A2/lessons.js`.
2. Create the HTML file by copying an existing lesson: declare only the
   `window.LESSON = { … }` object and call `ITA.mountLesson(window.LESSON)`.
   All rendering (sections, exercises, flashcards, pager) is automatic.

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

## How every lesson is structured

All lessons follow the same teaching sequence:

1. **Meaning** — what it is, when it's used, why it matters, typical beginner mistakes
2. **Formula** — the sentence structure, shown as visual blocks
3. **Rule** — explained from scratch, exceptions included
4. **Timeline** — where the tense sits in time
5. **Conjugation tables** — collapsible, with irregular forms highlighted
6. **Examples (15+)** — Italian ↓ literal ↓ natural English ↓ grammar note
7. **Common mistakes** — ❌ wrong / ✅ correct, with the *why*
8. **Exercises** — 7 types: multiple choice, fill in the blanks, sentence ordering,
   drag & drop, matching, true/false, translation — auto-checked, with hints and scoring
9. **Mini conversation** — an A2 dialogue with grammar explanations on hover
10. **Summary** — formula, key rules, memory tricks

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
- **Single source of truth** for navigation: `A2/lessons.js`.
- **Lessons are data, not markup**: each page declares a `LESSON` object and
  rendering is delegated to `assets/lesson.js`.
- **Per-level progress**: the `localStorage` key is `italiano::<LEVEL>::v1`.
- The dev server sends `Cache-Control: no-cache`, so editing a lesson and hitting
  refresh shows the change immediately.
