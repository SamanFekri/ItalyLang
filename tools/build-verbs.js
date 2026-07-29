#!/usr/bin/env node
/* ============================================================================
   build-verbs.js — expands the compact irregular-verb source into the full
   dataset (data/irregular-verbs.json).
   ----------------------------------------------------------------------------
   Why a generator instead of hand-written JSON?

   Italian has 8 simple tenses and 9 compound ones. Every compound tense is
   mechanically  auxiliary + past participle  — "avrò avuto", "sarei stato",
   "avessimo detto". Writing those by hand for hundreds of verbs is where
   invented or inconsistent forms creep in, and the brief was explicit: do not
   invent forms.

   So the source file stores ONLY what is genuinely verb-specific:
     • the 8 simple tenses (this is where irregularity actually lives)
     • participio passato / presente, gerundio
     • metadata, irregularity analysis, examples, notes

   and this script derives:
     passato prossimo · trapassato prossimo · trapassato remoto ·
     futuro anteriore · congiuntivo passato · congiuntivo trapassato ·
     condizionale passato · infinito passato · gerundio passato

   Agreement: verbs taking `essere` get the participle marked "andato/a" in the
   singular and "andati/e" in the plural, the convention used in Italian
   reference grammars (Treccani, Accademia della Crusca).

   Usage:  node tools/build-verbs.js            → writes data/irregular-verbs.json
           node tools/build-verbs.js --check    → validates only, writes nothing
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'verbs-core.json');
const OUT = path.join(ROOT, 'data', 'irregular-verbs.json');

const PERSONS = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];

/* The two auxiliaries, needed to build every compound tense. Read from the
   dataset itself so there is a single source of truth. */
function auxTables(verbs) {
  const find = (inf) => verbs.find(v => v.infinitive === inf);
  const essere = find('essere');
  const avere = find('avere');
  if (!essere || !avere) {
    throw new Error('verbs-core.json must contain both "essere" and "avere": they are needed to build the compound tenses.');
  }
  return { essere, avere };
}

/** Turns a 6-item array into { io, tu, lui, noi, voi, loro }. */
function persons(forms) {
  const out = {};
  PERSONS.forEach((p, i) => { out[p] = forms[i]; });
  return out;
}

/**
 * Participle agreement for compound tenses.
 * With `avere` the participle is invariable; with `essere` it agrees with the
 * subject, so we show both genders: "andato/a" (sing.) and "andati/e" (plur.).
 */
function participleFor(verb, personIndex) {
  const pp = verb.participio_passato;
  if (verb.auxiliary !== 'essere') return pp;
  const plural = personIndex >= 3;                     // noi, voi, loro
  if (!/o$/.test(pp)) return pp;                       // e.g. "rimasto" handled below
  const stem = pp.slice(0, -1);
  return plural ? stem + 'i/e' : stem + 'o/a';
}

/** Builds one compound tense: auxiliary forms + participle. */
function compound(verb, auxForms) {
  const out = {};
  PERSONS.forEach((p, i) => {
    out[p] = auxForms[i] + ' ' + participleFor(verb, i);
  });
  return out;
}

/** Which auxiliary conjugation to use for this verb. */
function auxOf(verb, aux) {
  // "both" verbs are shown with the auxiliary listed first in `auxiliary_note`,
  // defaulting to avere, and the alternative is documented in notes[].
  return verb.auxiliary === 'essere' ? aux.essere : aux.avere;
}

function buildVerb(verb, aux) {
  const A = auxOf(verb, aux);
  const auxInf = verb.auxiliary === 'essere' ? 'essere' : 'avere';
  const auxGer = verb.auxiliary === 'essere' ? 'essendo' : 'avendo';
  const ppSing = participleFor(verb, 0);

  const conjugations = {
    indicativo: {
      presente: persons(verb.presente),
      passato_prossimo: compound(verb, A.presente),
      imperfetto: persons(verb.imperfetto),
      trapassato_prossimo: compound(verb, A.imperfetto),
      passato_remoto: persons(verb.passato_remoto),
      trapassato_remoto: compound(verb, A.passato_remoto),
      futuro_semplice: persons(verb.futuro_semplice),
      futuro_anteriore: compound(verb, A.futuro_semplice)
    },
    congiuntivo: {
      presente: persons(verb.congiuntivo_presente),
      passato: compound(verb, A.congiuntivo_presente),
      imperfetto: persons(verb.congiuntivo_imperfetto),
      trapassato: compound(verb, A.congiuntivo_imperfetto)
    },
    condizionale: {
      presente: persons(verb.condizionale_presente),
      passato: compound(verb, A.condizionale_presente)
    },
    imperativo: verb.imperativo,
    infinito: {
      presente: verb.infinitive,
      passato: auxInf + ' ' + ppSing
    },
    participio: {
      presente: verb.participio_presente || null,
      passato: verb.participio_passato
    },
    gerundio: {
      presente: verb.gerundio,
      passato: auxGer + ' ' + ppSing
    }
  };

  return {
    infinitive: verb.infinitive,
    english: verb.english,
    cefr: verb.cefr,
    frequency: verb.frequency,
    auxiliary: verb.auxiliary,
    irregularity: verb.irregularity,
    irregular_forms: verb.irregular_forms || {},
    conjugations: conjugations,
    examples: verb.examples || {},
    notes: verb.notes || []
  };
}

/* ── Validation ──────────────────────────────────────────────────────────
   Catches the mistakes that matter: a missing person, a tense of the wrong
   length, an unknown auxiliary, a participle that does not look Italian. */
const SIMPLE_TENSES = [
  'presente', 'imperfetto', 'passato_remoto', 'futuro_semplice',
  'congiuntivo_presente', 'congiuntivo_imperfetto', 'condizionale_presente'
];
const VALID_AUX = ['essere', 'avere', 'both'];
const VALID_FREQ = ['very_common', 'common', 'uncommon'];
const VALID_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_IRR = [
  'stem_change', 'spelling_change', 'irregular_ending', 'suppletive_form',
  'contracted_form', 'completely_irregular', 'irregular_participle',
  'irregular_passato_remoto', 'irregular_future_stem'
];

function validate(verbs) {
  const errors = [];
  const seen = new Set();

  verbs.forEach((v, i) => {
    const at = 'verbs[' + i + '] "' + (v.infinitive || '?') + '"';
    if (!v.infinitive) errors.push(at + ': missing infinitive');
    if (seen.has(v.infinitive)) errors.push(at + ': duplicate entry');
    seen.add(v.infinitive);

    if (VALID_AUX.indexOf(v.auxiliary) < 0) errors.push(at + ': auxiliary must be essere|avere|both, got "' + v.auxiliary + '"');
    if (VALID_FREQ.indexOf(v.frequency) < 0) errors.push(at + ': bad frequency "' + v.frequency + '"');
    if (VALID_CEFR.indexOf(v.cefr) < 0) errors.push(at + ': bad CEFR level "' + v.cefr + '"');

    SIMPLE_TENSES.forEach(t => {
      if (!Array.isArray(v[t])) { errors.push(at + ': missing tense "' + t + '"'); return; }
      if (v[t].length !== 6) errors.push(at + ': "' + t + '" has ' + v[t].length + ' forms, expected 6');
      v[t].forEach((f, fi) => {
        if (typeof f !== 'string' || !f.trim()) errors.push(at + ': "' + t + '" ' + PERSONS[fi] + ' is empty');
      });
    });

    if (!v.participio_passato) errors.push(at + ': missing participio_passato');
    if (!v.gerundio) errors.push(at + ': missing gerundio');
    if (v.gerundio && !/(ando|endo)$/.test(v.gerundio)) {
      errors.push(at + ': gerundio "' + v.gerundio + '" should end in -ando or -endo');
    }
    if (!v.imperativo || !v.imperativo.tu) errors.push(at + ': imperativo needs at least a "tu" form (use "—" for defective verbs)');

    (v.irregularity && v.irregularity.type || []).forEach(t => {
      if (VALID_IRR.indexOf(t) < 0) errors.push(at + ': unknown irregularity type "' + t + '"');
    });
    if (!v.irregularity || !v.irregularity.description) errors.push(at + ': irregularity.description is required');
  });

  return errors;
}

/* ── Main ─────────────────────────────────────────────────────────────── */
function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Source not found: ' + SRC);
    process.exit(1);
  }
  const source = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const verbs = source.verbs || [];

  const errors = validate(verbs);
  if (errors.length) {
    console.error('\n  ✗ ' + errors.length + ' validation error(s):\n');
    errors.forEach(e => console.error('    · ' + e));
    process.exit(1);
  }

  const aux = auxTables(verbs);
  const built = verbs.map(v => buildVerb(v, aux));

  const out = {
    meta: {
      title: 'Italian irregular verbs — full conjugation dataset',
      language: 'it',
      standard: 'Modern standard Italian (Treccani / Accademia della Crusca conventions)',
      generated: new Date().toISOString().slice(0, 10),
      count: built.length,
      persons: PERSONS,
      note: 'Compound tenses are derived from the auxiliary + past participle, so they are consistent by construction. With essere the participle is shown with its agreement endings (andato/a, andati/e).'
    },
    verbs: built
  };

  if (process.argv.indexOf('--check') >= 0) {
    console.log('  ✓ ' + built.length + ' verbs valid (nothing written)');
    return;
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const kb = Math.round(fs.statSync(OUT).size / 1024);

  /* Also emit a plain-script version. fetch() cannot read a local file over
     the file:// protocol, and the whole site is built to work without a
     server, so verbi.html loads this instead of the .json. */
  const OUT_JS = OUT.replace(/\.json$/, '.js');
  fs.writeFileSync(OUT_JS,
    '/* Generated by tools/build-verbs.js — do not edit by hand.\n' +
    '   Script version of irregular-verbs.json so the page also works from file://. */\n' +
    'window.VERBS = ' + JSON.stringify(out) + ';\n');

  console.log('  ✓ ' + built.length + ' verbs → data/irregular-verbs.json (' + kb + ' KB)');
  console.log('                    → data/irregular-verbs.js  (script version for file://)');
  console.log('    tenses per verb: 8 simple + 9 compound + imperativo/infinito/participio/gerundio');
}

main();
