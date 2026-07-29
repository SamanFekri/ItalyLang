/* ============================================================================
   lessons.js — the master index of the course.
   Loaded by every page so the navigation drawer, the home grid and the
   progress calculations all read from a single source of truth.
   ========================================================================== */
window.LESSONS = [
  { num: 1,  file: '01-essere.html',            icon: '🟢', title: 'Essere',                 blurb: 'To be — present, past participle and the expressions that use it.', group: 'Le basi' },
  { num: 2,  file: '02-avere.html',             icon: '🔵', title: 'Avere',                  blurb: 'To have — present tense plus ho fame, ho sete, ho paura…',          group: 'Le basi' },
  { num: 3,  file: '03-presente.html',          icon: '⏱️', title: 'Presente Indicativo',    blurb: '-are, -ere, -ire, -isc- verbs and the key irregulars.',            group: 'Le basi' },
  { num: 4,  file: '04-verbi-modali.html',      icon: '🔑', title: 'Verbi Modali',           blurb: 'Dovere, potere, volere + infinitive — and modals in the past.',     group: 'Strutture' },
  { num: 5,  file: '05-passato-prossimo.html',  icon: '📅', title: 'Passato Prossimo',       blurb: 'The A2 past tense: avere vs essere, agreement, signal words.',      group: 'Strutture' },
  { num: 6,  file: '06-verbi-riflessivi.html',  icon: '🪞', title: 'Verbi Riflessivi',       blurb: 'Mi alzo, ti chiami, ci svegliamo — daily routine verbs.',          group: 'Strutture' },
  { num: 7,  file: '07-piacere.html',           icon: '❤️', title: 'Piacere',                blurb: 'Mi piace / mi piacciono and the indirect object pronouns.',        group: 'Strutture' },
  { num: 8,  file: '08-stare-gerundio.html',    icon: '🎬', title: 'Stare + Gerundio',       blurb: 'Sto mangiando — the “right now” tense, and when NOT to use it.',   group: 'Strutture' },
  { num: 9,  file: '09-preposizioni.html',      icon: '🔗', title: 'Verbo + Preposizione',   blurb: 'The a / di / zero-preposition system after verbs.',                group: 'Strutture' },
  { num: 10, file: '10-sapere-conoscere.html',  icon: '🧠', title: 'Sapere vs Conoscere',    blurb: 'Two verbs, one English word “to know” — a decision tree.',         group: 'Verbi chiave' },
  { num: 11, file: '11-fare.html',              icon: '🛠️', title: 'Fare',                   blurb: 'Fare colazione, fare una passeggiata, fa freddo…',                 group: 'Verbi chiave' },
  { num: 12, file: '12-andare-venire.html',     icon: '🚶', title: 'Andare / Venire',        blurb: 'Movement, direction, purpose: andare a + infinito.',               group: 'Verbi chiave' },
  { num: 13, file: '13-dire.html',              icon: '💬', title: 'Dire',                   blurb: 'Dire vs parlare, reported speech, everyday expressions.',          group: 'Verbi chiave' },
  { num: 14, file: '14-imperativo.html',        icon: '📣', title: 'Imperativo',             blurb: 'Giving instructions: positive, negative and the polite Lei form.',  group: 'Verbi chiave' },
  { num: 15, file: '15-verbi-quotidiani.html',  icon: '🗂️', title: '100 Verbi Quotidiani',   blurb: 'The 100 most useful A2 verbs, grouped by everyday topic.',         group: 'Ripasso' },
  { num: 16, file: '16-vocabolario-200.html',   icon: '🇮🇷', title: '200 Parole + فارسی',    blurb: 'The 200 most important words with Farsi and English meanings.',    group: 'Ripasso' },
  { num: 17, file: '17-ripasso.html',           icon: '🏆', title: 'Ripasso Generale',       blurb: 'Mixed final review: 60 questions across every lesson.',            group: 'Ripasso' }
];
