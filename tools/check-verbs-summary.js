#!/usr/bin/env node
/* ============================================================================
   check-verbs-summary.js — validates data/verbs-summary.js
   ----------------------------------------------------------------------------
   The Verbs Summary page shows hand-written conjugation tables. This script
   recomputes every Italian form independently and fails on any mismatch:

     • regular verbs (mangiare, credere, dormire, invitare) → a small rule
       engine below (stems, endings, -iare / -giare spelling rules)
     • andare, fare, essere, avere, stare → data/irregular-verbs.json, the
       existing reference dataset, so irregular forms are never derived by
       applying regular endings
     • compound / passive forms → auxiliary from the dataset + participle,
       with essere-agreement (-o/-a, -i/-e)

   It also checks structure (12 forms, the 5 core verbs everywhere, valid
   person keys) and Persian typography (half-spaces in می‌/ه‌ام, Persian
   ی/ک instead of Arabic ي/ك, no empty translations).

   Usage:  node tools/check-verbs-summary.js     (exit code 1 on any error)
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data', 'verbs-summary.js'), 'utf8'), sandbox);
const DATA = sandbox.window.VERBS_SUMMARY;
const REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'irregular-verbs.json'), 'utf8'));

const SIX = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];
const IMP = ['tu', 'Lei', 'noi', 'voi', 'Loro'];
const PLURAL = { io: false, tu: false, lui: false, noi: true, voi: true, loro: true };
const AGR_END = { msg: 'o', fsg: 'a', mpl: 'i', fpl: 'e' };

const errors = [];
let checked = 0;
const fail = (where, msg) => errors.push(where + ': ' + msg);

/* ------------------------------------------------------------------ */
/* Reference forms                                                     */
/* ------------------------------------------------------------------ */
const refVerb = (inf) => REF.verbs.find(v => v.infinitive === inf) || null;
const ESSERE = refVerb('essere').conjugations;
const AVERE = refVerb('avere').conjugations;
const STARE = refVerb('stare').conjugations;

/** stem + ending with Italian spelling rules: mangi+i → mangi, mangi+erò → mangerò. */
function join(stem, ending) {
  if (/i$/.test(stem) && /^i/.test(ending)) return stem + ending.slice(1);
  if (/[cg]i$/.test(stem) && /^e/.test(ending)) return stem.slice(0, -1) + ending;
  return stem + ending;
}
const bySix = (arr) => { const o = {}; SIX.forEach((p, i) => { o[p] = arr[i]; }); return o; };
const byImp = (arr) => { const o = {}; IMP.forEach((p, i) => { o[p] = arr[i]; }); return o; };

/** Regular conjugation engine — only ever used for verbs flagged regular. */
function regular(inf) {
  const grp = inf.slice(-3);              // are | ere | ire
  const stem = inf.slice(0, -3);
  const vowel = grp[0];
  const map = (ends) => bySix(ends.map(e => join(stem, e)));
  const fut = join(stem, grp === 'ire' ? 'ir' : 'er');
  return {
    presente: map({ are: ['o', 'i', 'a', 'iamo', 'ate', 'ano'], ere: ['o', 'i', 'e', 'iamo', 'ete', 'ono'], ire: ['o', 'i', 'e', 'iamo', 'ite', 'ono'] }[grp]),
    imperfetto: map(['vo', 'vi', 'va', 'vamo', 'vate', 'vano'].map(e => vowel + e)),
    futuro: bySix(['ò', 'ai', 'à', 'emo', 'ete', 'anno'].map(e => fut + e)),
    condizionale: bySix(['ei', 'esti', 'ebbe', 'emmo', 'este', 'ebbero'].map(e => fut + e)),
    congiuntivo: map(grp === 'are' ? ['i', 'i', 'i', 'iamo', 'iate', 'ino'] : ['a', 'a', 'a', 'iamo', 'iate', 'ano']),
    imperativo: byImp({ are: ['a', 'i', 'iamo', 'ate', 'ino'], ere: ['i', 'a', 'iamo', 'ete', 'ano'], ire: ['i', 'a', 'iamo', 'ite', 'ano'] }[grp].map(e => join(stem, e))),
    gerundio: join(stem, grp === 'are' ? 'ando' : 'endo'),
    participio: join(stem, { are: 'ato', ere: 'uto', ire: 'ito' }[grp])
  };
}

/** The same shape, read from the irregular-verb dataset. */
function fromDataset(inf) {
  const c = refVerb(inf).conjugations;
  const imperativo = {};
  IMP.forEach(p => { imperativo[p] = c.imperativo[p === 'Loro' ? 'loro' : p].replace(/^(\S+) \((\S+)\)$/, '$1 / $2'); });
  return {
    presente: c.indicativo.presente, imperfetto: c.indicativo.imperfetto,
    futuro: c.indicativo.futuro_semplice, condizionale: c.condizionale.presente,
    congiuntivo: c.congiuntivo.presente, imperativo,
    gerundio: c.gerundio.presente, participio: c.participio.passato
  };
}

const slash = (pp, pl) => pp.slice(0, -1) + (pl ? 'i/e' : 'o/a');
const agree = (pp, key) => pp.slice(0, -1) + AGR_END[key];
const PRON = { io: 'io', tu: 'tu', lui: 'lui/lei', noi: 'noi', voi: 'voi', loro: 'loro' };

/** Expected Italian for one row. Returns { exact } or { contains }. */
function expected(inf, meta, tense, p) {
  const f = meta.regular ? regular(inf) : fromDataset(inf);
  const pp = f.participio;
  const essere = meta.aux === 'essere';
  const pl = PLURAL[p];
  const ppAux = essere ? slash(pp, pl) : pp;
  const isAgr = p in AGR_END;
  const sg = isAgr && /sg$/.test(p);
  switch (tense) {
    case 'presente': case 'imperfetto': case 'futuro': case 'condizionale':
      return { exact: f[tense][p] };
    case 'congiuntivo': return { exact: 'che ' + PRON[p] + ' ' + f.congiuntivo[p] };
    case 'imperativo': return { exact: f.imperativo[p] + '!' };
    case 'imperativo_neg': return { exact: 'non ' + (p === 'tu' ? inf : f.imperativo[p]) + '!' };
    case 'gerundio': return { exact: f.gerundio };
    case 'stare_gerundio': return { exact: STARE.indicativo.presente[p] + ' ' + f.gerundio };
    case 'gerundio_passato': return { exact: (essere ? 'essendo ' : 'avendo ') + ppAux };
    case 'passato_prossimo': return { exact: (essere ? ESSERE : AVERE).indicativo.presente[p] + ' ' + ppAux };
    case 'trapassato': return { exact: (essere ? ESSERE : AVERE).indicativo.imperfetto[p] + ' ' + ppAux };
    case 'passivo_presente':
      return isAgr ? { contains: (sg ? 'è ' : 'sono ') + agree(pp, p) }
                   : { exact: ESSERE.indicativo.presente[p] + ' ' + slash(pp, pl) };
    case 'passivo_pp':
      return isAgr ? { contains: (sg ? 'è ' : 'sono ') + agree('stato', p) + ' ' + agree(pp, p) }
                   : { exact: ESSERE.indicativo.presente[p] + ' ' + slash('stato', pl) + ' ' + slash(pp, pl) };
    case 'passivo_trap':
      return isAgr ? { contains: (sg ? 'era ' : 'erano ') + agree('stato', p) + ' ' + agree(pp, p) }
                   : { exact: ESSERE.indicativo.imperfetto[p] + ' ' + slash('stato', pl) + ' ' + slash(pp, pl) };
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* Persian typography                                                  */
/* ------------------------------------------------------------------ */
const FA_LETTER = '[\\u0600-\\u06FF]';
/* Ordinary words that genuinely start with «می» (not the verbal prefix). */
const MI_WORDS = /(^|[\s(«])(میوه|میانوند|میز|میل|میلیون|میهمان|میدان)/g;
function checkPersian(where, s) {
  if (typeof s !== 'string' || !s.trim()) return fail(where, 'empty Persian text');
  const plain = s.replace(/\*[^*]*\*/g, '').replace(MI_WORDS, '$1');
  if (!new RegExp(FA_LETTER).test(plain) && !/[…]/.test(plain)) fail(where, 'no Persian script in "' + s + '"');
  if (new RegExp('(^|[\\s(«])ن?می(?=' + FA_LETTER + ')').test(plain)) fail(where, 'missing half-space after می in "' + s + '"');
  if (new RegExp('ه (ام|ای|ایم|اید|اند)(?!' + FA_LETTER + ')').test(plain)) fail(where, 'perfect ending written with a space in "' + s + '"');
  if (/[يك]/.test(plain)) fail(where, 'Arabic ي/ك instead of Persian ی/ک in "' + s + '"');
  if ((s.match(/\*/g) || []).length % 2) fail(where, 'unbalanced *italian* marker in "' + s + '"');
}

/* ------------------------------------------------------------------ */
/* Walk the data                                                       */
/* ------------------------------------------------------------------ */
if (DATA.forms.length !== 12) fail('forms', 'expected 12 forms, found ' + DATA.forms.length);
const ids = new Set();

/* Verb metadata must agree with the reference dataset where it overlaps. */
Object.entries(DATA.verbs).forEach(([inf, meta]) => {
  checkPersian('verbs.' + inf, meta.fa);
  checkPersian('verbs.' + inf + '.noteFa', meta.noteFa);
  const f = meta.regular ? regular(inf) : fromDataset(inf);
  if (meta.pp !== f.participio) fail('verbs.' + inf, 'participle ' + meta.pp + ' ≠ ' + f.participio);
  if (meta.ger !== f.gerundio) fail('verbs.' + inf, 'gerund ' + meta.ger + ' ≠ ' + f.gerundio);
  const r = refVerb(inf);
  if (r && r.auxiliary !== meta.aux) fail('verbs.' + inf, 'auxiliary ' + meta.aux + ' ≠ dataset ' + r.auxiliary);
  if (r && meta.regular) fail('verbs.' + inf, 'listed in the irregular dataset but flagged regular');
});

function checkRows(where, inf, meta, table) {
  if (!Array.isArray(table.rows) || !table.rows.length) return fail(where, 'no rows');
  const keys = table.rows.map(r => r[0]);
  (table.irr || []).forEach(k => { if (!keys.includes(k)) fail(where, 'irr key "' + k + '" not in rows'); });
  table.rows.forEach(([p, it, fa]) => {
    const w = where + '[' + p + ']';
    if (!DATA.persons[p]) fail(w, 'unknown person key');
    checkPersian(w, fa);
    const exp = expected(inf, meta, table.tense, p);
    checked++;
    if (!exp) return fail(w, 'unknown tense "' + table.tense + '"');
    if (exp.exact !== undefined && it !== exp.exact) fail(w, '"' + it + '" — expected "' + exp.exact + '"');
    if (exp.contains !== undefined && it.indexOf(exp.contains) < 0) fail(w, '"' + it + '" — expected to contain "' + exp.contains + '"');
  });
}

DATA.forms.forEach((form, i) => {
  const where = 'form ' + (i + 1) + ' (' + form.id + ')';
  if (ids.has(form.id)) fail(where, 'duplicate id');
  ids.add(form.id);
  if (form.num !== i + 1) fail(where, 'num is ' + form.num);
  ['it', 'fa', 'use', 'regular', 'irregular'].forEach(k => { if (!form[k]) fail(where, 'missing ' + k); });
  ['fa', 'use', 'regular', 'irregular'].forEach(k => checkPersian(where + '.' + k, form[k]));
  checkPersian(where + '.formula.fa', form.formula.fa);
  form.formula.steps.forEach((s, j) => checkPersian(where + '.step' + j, s));
  (form.notes || []).forEach((s, j) => checkPersian(where + '.note' + j, s));

  DATA.core.forEach(inf => {
    const entry = form.verbs[inf];
    if (!entry) return fail(where, 'core verb ' + inf + ' missing');
    if (entry.na) return checkPersian(where + '.' + inf + '.na', entry.na);
    if (!entry.tables || !entry.tables.length) fail(where, inf + ' has neither tables nor a not-applicable note');
  });
  Object.entries(form.verbs).forEach(([inf, entry]) => {
    const meta = DATA.verbs[inf];
    if (!meta) return fail(where, 'unknown verb ' + inf);
    if (entry.note) checkPersian(where + '.' + inf + '.note', entry.note);
    (entry.tables || []).forEach((t, j) => checkRows(where + '.' + inf + '.t' + j, inf, meta, t));
  });
  (form.extra || []).forEach((t, j) => {
    const meta = { regular: false, aux: refVerb(t.verb).auxiliary };
    checkRows(where + '.extra' + j, t.verb, meta, t);
  });

  /* Every applicable core verb has at least one example sentence. */
  DATA.core.forEach(inf => {
    if (form.verbs[inf] && form.verbs[inf].na) return;
    if (!form.examples.some(e => e.verb === inf)) fail(where, 'no example for ' + inf);
  });
  form.examples.forEach((e, j) => {
    if (!e.it || !e.it.trim()) fail(where + '.ex' + j, 'empty Italian sentence');
    checkPersian(where + '.ex' + j, e.fa);
  });
});

if (errors.length) {
  console.error('✗ verbs-summary: ' + errors.length + ' problem(s)\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('✓ verbs-summary: ' + DATA.forms.length + ' forms, ' + checked + ' conjugated forms verified');
