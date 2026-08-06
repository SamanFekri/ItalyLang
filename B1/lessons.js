/* ============================================================================
   lessons.js — the master index of the B1 course.
   Loaded by every page so the navigation drawer, the home grid and the
   progress calculations all read from a single source of truth.
   ========================================================================== */
window.LESSONS = [
  { num: 1,  file: '01-trapassato-prossimo.html',  icon: '🕰️', title: 'Trapassato Prossimo',   blurb: 'Il passato del passato: quello che era già successo prima.',            group: 'Il passato' },
  { num: 2,  file: '02-condizionale-passato.html', icon: '💭', title: 'Condizionale Passato',  blurb: 'Sarei andato, avrei voluto: rimpianti, ipotesi e futuro nel passato.', group: 'Il passato' },
  { num: 3,  file: '03-congiuntivo-passato.html',  icon: '🌀', title: 'Congiuntivo Passato',   blurb: 'Penso che sia partito: dubbio e opinione su un fatto già avvenuto.',   group: 'Il congiuntivo' },
  { num: 4,  file: '04-congiuntivo-imperfetto.html', icon: '🌙', title: 'Congiuntivo Imperfetto', blurb: 'Vorrei che tu fossi qui: desideri, ipotesi e cortesia.',            group: 'Il congiuntivo' },
  { num: 5,  file: '05-forma-passiva.html',        icon: '🔄', title: 'Forma Passiva',         blurb: 'Essere, venire e andare + participio: la voce dei giornali.',         group: 'Strutture avanzate' },
  { num: 6,  file: '06-discorso-indiretto.html',   icon: '🗣️', title: 'Discorso Indiretto',    blurb: 'Ha detto che…: riportare parole, domande e ordini di altri.',         group: 'Strutture avanzate' },
  { num: 7,  file: '07-concordanza-tempi.html',    icon: '⚖️', title: 'Concordanza dei Tempi',  blurb: 'Quale tempo nella subordinata? Il sistema completo.',                 group: 'Strutture avanzate' },
  { num: 8,  file: '08-periodo-ipotetico.html',    icon: '🎲', title: 'Periodo Ipotetico',     blurb: 'Se… allora: i tre tipi di ipotesi, dal reale all\'impossibile.',      group: 'Strutture avanzate' },
  { num: 9,  file: '09-pronomi-combinati.html',    icon: '🔗', title: 'Pronomi Combinati',     blurb: 'Me lo, te la, glielo: due pronomi in una parola sola.',               group: 'Pronomi e verbi' },
  { num: 10, file: '10-verbi-pronominali.html',    icon: '🧩', title: 'Verbi Pronominali',     blurb: 'Farcela, andarsene, cavarsela: l\'italiano vero dei madrelingua.',    group: 'Pronomi e verbi' },
  { num: 11, file: '11-gerundio.html',             icon: '🎬', title: 'Gerundio',              blurb: 'Presente e passato: contemporaneità, causa, modo e progressivo.',      group: 'Forme implicite' },
  { num: 12, file: '12-participio-passato.html',   icon: '📜', title: 'Participio Passato',    blurb: 'Irregolari, accordo con i pronomi e uso come aggettivo.',              group: 'Forme implicite' },
  { num: 13, file: '13-frasi-relative.html',       icon: '🪢', title: 'Frasi Relative',        blurb: 'Che, cui, il quale, ciò che: unire due frasi in una.',                group: 'Sintassi' },
  { num: 14, file: '14-preposizioni-avanzate.html', icon: '🧭', title: 'Preposizioni Avanzate', blurb: 'Verbo, aggettivo e nome + preposizione: le combinazioni fisse.',      group: 'Sintassi' },
  { num: 15, file: '15-ripasso-b1.html',           icon: '🏆', title: 'Ripasso Generale B1',   blurb: 'Esame finale: quiz misto, lettura, ascolto, scrittura e parlato.',    group: 'Ripasso' }
];
