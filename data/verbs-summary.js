/* ============================================================================
   verbs-summary.js — content of the "Verbs Summary" page (verbs-summary.html)
   ----------------------------------------------------------------------------
   12 Italian verb forms explained for Persian-speaking learners.

   Every conjugated form is written out by hand — nothing is generated at
   runtime — and checked by  `node tools/check-verbs-summary.js`  (npm test):
     • regular verbs (mangiare, credere, dormire, invitare) against an
       independent rule engine
     • andare / fare / essere / avere against data/irregular-verbs.json
     • Persian strings for missing half-spaces (ZWNJ) and empty cells

   Shape of one form:
     { id, num, it, fa, use, formula: { parts, example, fa, steps },
       endings: [ { title, cols, rows: [[personKey, ...cells]] } ],
       regular, irregular,                       ← Persian prose
       verbs: { mangiare: { tables: [ { title, tense, rows, irr } ], note, na } },
       extra: [ { title, verb, tense, rows } ],  ← e.g. imperfetto of essere
       examples: [ { verb, it, fa } ], notes: [ … ] }

   Rows are [personKey, italian, persian]. In Persian strings, *word* marks an
   Italian word: the page renders it as an isolated LTR span inside RTL text.
   ========================================================================== */
(function () {
  'use strict';

  const SIX = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];
  const IMP = ['tu', 'Lei', 'noi', 'voi', 'Loro'];
  const AGR = ['msg', 'fsg', 'mpl', 'fpl'];

  /** Pairs [italian, persian] with the person keys, in order. */
  function zip(keys, pairs) {
    if (pairs.length !== keys.length) {
      throw new Error('verbs-summary: expected ' + keys.length + ' rows, got ' + pairs.length + ' (' + pairs[0] + ')');
    }
    return pairs.map((p, i) => [keys[i], p[0], p[1]]);
  }
  const six = (pairs) => zip(SIX, pairs);
  const imp = (pairs) => zip(IMP, pairs);
  const agr = (pairs) => zip(AGR, pairs);

  /* Grammatical persons. `it` is the Italian label, `fa` the Persian one. */
  const PERSONS = {
    io:   { it: 'Io',      fa: 'من' },
    tu:   { it: 'Tu',      fa: 'تو' },
    lui:  { it: 'Lui/Lei', fa: 'او' },
    noi:  { it: 'Noi',     fa: 'ما' },
    voi:  { it: 'Voi',     fa: 'شما' },
    loro: { it: 'Loro',    fa: 'آنها' },
    Lei:  { it: 'Lei (formale)',  fa: 'شما (محترمانه)' },
    Loro: { it: 'Loro (formale)', fa: 'شما (جمع، رسمی)' },
    msg:  { it: 'masch. sing.', fa: 'مذکر، مفرد' },
    fsg:  { it: 'femm. sing.',  fa: 'مؤنث، مفرد' },
    mpl:  { it: 'masch. plur.', fa: 'مذکر، جمع' },
    fpl:  { it: 'femm. plur.',  fa: 'مؤنث، جمع' },
    ger:  { it: 'gerundio',     fa: 'وجه وصفی' }
  };

  /* The verbs used throughout the page. `extra` verbs appear only where the
     five core verbs cannot (invitare: a transitive verb with a person as
     object, needed for a full person-by-person passive table). */
  const VERBS = {
    mangiare: { fa: 'غذا خوردن', group: '-are', regular: true, aux: 'avere', pp: 'mangiato', ger: 'mangiando',
                noteFa: 'باقاعده. در فعل‌های *-giare* حرف *i* پیش از *e* و *i* حذف می‌شود: *mangerò*، *tu mangi*.' },
    credere:  { fa: 'باور کردن', group: '-ere', regular: true, aux: 'avere', pp: 'creduto', ger: 'credendo',
                noteFa: 'فعل باقاعدهٔ گروه *-ere*؛ الگوی همهٔ فعل‌های باقاعدهٔ این گروه.' },
    dormire:  { fa: 'خوابیدن', group: '-ire', regular: true, aux: 'avere', pp: 'dormito', ger: 'dormendo',
                noteFa: 'باقاعده و بدون *-isc-*: *dormo*، نه «dormisco».' },
    andare:   { fa: 'رفتن', group: '-are', regular: false, aux: 'essere', pp: 'andato', ger: 'andando',
                noteFa: 'بی‌قاعده در حال (*vado*)، آینده و شرطی (*andr-*)، التزامی و امری. فعل کمکی: *essere*.' },
    fare:     { fa: 'انجام دادن / کردن', group: '-are (lat. facere)', regular: false, aux: 'avere', pp: 'fatto', ger: 'facendo',
                noteFa: 'بی‌قاعده؛ بسیاری از صورت‌هایش از ریشهٔ لاتین *facere* (*fac-*) می‌آیند: *facevo*، *facendo*.' },
    invitare: { fa: 'دعوت کردن', group: '-are', regular: true, aux: 'avere', pp: 'invitato', ger: 'invitando', extra: true,
                noteFa: 'فعل متعدی باقاعده؛ فقط در بخش مجهول برای نشان دادن همهٔ اشخاص آمده است.' }
  };

  const NO_PASSIVE = {
    andare:  { na: '*andare* فعل لازم (ناگذر) است و مفعول مستقیم ندارد، پس مجهول نمی‌شود. *sono andato* مجهول نیست؛ گذشتهٔ نزدیکِ معلوم است: «رفتم».' },
    dormire: { na: '*dormire* فعل لازم است (مفعول مستقیم ندارد)، پس صورت مجهول ندارد. *ho dormito* یعنی «خوابیدم»، نه مجهول.' }
  };

  const FORMS = [
    /* ------------------------------------------------------------------ 1 */
    {
      id: 'presente', num: 1, it: 'Presente', fa: 'زمان حال',
      use: 'برای کاری که الان یا به‌طور عادت انجام می‌شود، حقیقت‌های کلی، و اغلب برای آیندهٔ نزدیک (*Domani vado a Roma* = «فردا به رم می‌روم»). مثل فارسی، یک صورت هم «می‌خورم» است و هم «دارم می‌خورم».',
      formula: {
        parts: [{ text: 'radice', note: 'mangi- · cred- · dorm-', type: 'verb' }, { text: 'desinenza', note: '-o · -i · -a/-e …', type: 'extra' }],
        example: 'mangi + o = mangio · cred + o = credo · dorm + o = dormo',
        fa: 'ریشه (مصدر منهای *-are* / *-ere* / *-ire*) + شناسهٔ زمان حال',
        steps: [
          'پایانهٔ مصدر را بردارید: *mangiare* ← *mangi-*، *credere* ← *cred-*، *dormire* ← *dorm-*.',
          'شناسهٔ مناسبِ شخص را از جدول زیر اضافه کنید.',
          'بعضی فعل‌های *-ire* (مثل *finire*) در *io، tu، lui، loro* میانوندِ *-isc-* می‌گیرند: *finisco*. اما *dormire* این‌طور نیست: *dormo*.',
          'در فعل‌های *-iare* حرف *i* تکرار نمی‌شود: *tu mangi* (نه «mangii»).'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are · mangiare', '-ere · credere', '-ire · dormire', '-ire + isc · finire'],
        rows: [
          ['io', '-o', '-o', '-o', '-isco'], ['tu', '-i', '-i', '-i', '-isci'], ['lui', '-a', '-e', '-e', '-isce'],
          ['noi', '-iamo', '-iamo', '-iamo', '-iamo'], ['voi', '-ate', '-ete', '-ite', '-ite'], ['loro', '-ano', '-ono', '-ono', '-iscono']
        ]
      }],
      regular: '*mangiare*، *credere* و *dormire* دقیقاً از جدول شناسه‌ها پیروی می‌کنند.',
      irregular: '*andare* ← *vado, vai, va, andiamo, andate, vanno* (فقط *noi* و *voi* باقاعده‌اند). *fare* ← *faccio, fai, fa, facciamo, fate, fanno*.',
      verbs: {
        mangiare: { tables: [{ tense: 'presente', rows: six([
          ['mangio', 'من غذا می‌خورم'], ['mangi', 'تو غذا می‌خوری'], ['mangia', 'او غذا می‌خورد'],
          ['mangiamo', 'ما غذا می‌خوریم'], ['mangiate', 'شما غذا می‌خورید'], ['mangiano', 'آنها غذا می‌خورند']]) }] },
        credere: { tables: [{ tense: 'presente', rows: six([
          ['credo', 'من باور می‌کنم'], ['credi', 'تو باور می‌کنی'], ['crede', 'او باور می‌کند'],
          ['crediamo', 'ما باور می‌کنیم'], ['credete', 'شما باور می‌کنید'], ['credono', 'آنها باور می‌کنند']]) }] },
        dormire: { tables: [{ tense: 'presente', rows: six([
          ['dormo', 'من می‌خوابم'], ['dormi', 'تو می‌خوابی'], ['dorme', 'او می‌خوابد'],
          ['dormiamo', 'ما می‌خوابیم'], ['dormite', 'شما می‌خوابید'], ['dormono', 'آنها می‌خوابند']]) }] },
        andare: { tables: [{ tense: 'presente', irr: ['io', 'tu', 'lui', 'loro'], rows: six([
          ['vado', 'من می‌روم'], ['vai', 'تو می‌روی'], ['va', 'او می‌رود'],
          ['andiamo', 'ما می‌رویم'], ['andate', 'شما می‌روید'], ['vanno', 'آنها می‌روند']]) }] },
        fare: { tables: [{ tense: 'presente', irr: ['io', 'tu', 'lui', 'noi', 'loro'], rows: six([
          ['faccio', 'من انجام می‌دهم'], ['fai', 'تو انجام می‌دهی'], ['fa', 'او انجام می‌دهد'],
          ['facciamo', 'ما انجام می‌دهیم'], ['fate', 'شما انجام می‌دهید'], ['fanno', 'آنها انجام می‌دهند']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Io mangio la pasta ogni giorno.', fa: 'من هر روز پاستا می‌خورم.' },
        { verb: 'credere', it: 'Non credo a questa storia.', fa: 'این داستان را باور نمی‌کنم.' },
        { verb: 'dormire', it: 'Il bambino dorme otto ore.', fa: 'بچه هشت ساعت می‌خوابد.' },
        { verb: 'andare', it: 'Domani vado a Roma.', fa: 'فردا به رم می‌روم.' },
        { verb: 'fare', it: 'Che cosa fai stasera?', fa: 'امشب چه کار می‌کنی؟' }
      ],
      notes: [
        '*fare* معنای وسیعی دارد و ترجمه‌اش به بافت بستگی دارد: *faccio colazione* = «صبحانه می‌خورم»، *fa freddo* = «هوا سرد است»، *faccio una foto* = «عکس می‌گیرم».',
        'ضمیر فاعلی معمولاً حذف می‌شود چون شناسه شخص را نشان می‌دهد: *mangio* = «(من) می‌خورم».'
      ]
    },

    /* ------------------------------------------------------------------ 2 */
    {
      id: 'passato-prossimo', num: 2, it: 'Passato Prossimo', fa: 'گذشتهٔ نزدیک / گذشتهٔ کامل‌شده',
      use: 'برای کاری که در گذشته انجام شده و تمام شده است. در فارسی هم با گذشتهٔ ساده (*ho mangiato* = «خوردم») و هم با ماضی نقلی («خورده‌ام») ترجمه می‌شود؛ بافت جمله تعیین می‌کند کدام طبیعی‌تر است.',
      formula: {
        parts: [{ text: 'avere / essere', note: 'presente', type: 'subject' }, { text: 'participio passato', note: '-ato · -uto · -ito', type: 'verb' }],
        example: 'ho mangiato · ho creduto · ho dormito · sono andato/a · ho fatto',
        fa: 'زمان حالِ *avere* یا *essere* + اسم مفعول (*participio passato*)',
        steps: [
          'اسم مفعول باقاعده: *-are* ← *-ato* (*mangiato*)، *-ere* ← *-uto* (*creduto*)، *-ire* ← *-ito* (*dormito*).',
          '*avere*: با فعل‌های متعدی (*mangiare, credere, fare*) و بسیاری از فعل‌های لازم مثل *dormire*.',
          '*essere*: با فعل‌های حرکت و تغییر حالت (*andare, venire, partire, arrivare, nascere*)، فعل‌های انعکاسی و خودِ *essere*.',
          'با *essere* اسم مفعول با فاعل مطابقت می‌کند: *Marco è andato*، *Maria è andata*، *i ragazzi sono andati*، *le ragazze sono andate*.',
          'با *avere* اسم مفعول با فاعل مطابقت نمی‌کند: *Maria ha mangiato*. (استثنا: با ضمیر مفعولی *lo/la/li/le*: *la pizza? L\'ho mangiata*.)'
        ]
      },
      endings: [{
        title: 'Ausiliari al presente · فعل‌های کمکی در زمان حال',
        cols: ['avere', 'essere'],
        rows: [['io', 'ho', 'sono'], ['tu', 'hai', 'sei'], ['lui', 'ha', 'è'], ['noi', 'abbiamo', 'siamo'], ['voi', 'avete', 'siete'], ['loro', 'hanno', 'sono']]
      }],
      regular: 'اسم مفعول *mangiato*، *creduto* و *dormito* باقاعده است؛ هر سه با *avere* صرف می‌شوند.',
      irregular: '*fare* اسم مفعول بی‌قاعده دارد: *fatto*. *andare* اسم مفعول باقاعده دارد (*andato*) ولی فعل کمکی‌اش *essere* است، پس مطابقت می‌کند: *andato/a, andati/e*.',
      verbs: {
        mangiare: { tables: [{ tense: 'passato_prossimo', rows: six([
          ['ho mangiato', 'من غذا خوردم / خورده‌ام'], ['hai mangiato', 'تو غذا خوردی / خورده‌ای'], ['ha mangiato', 'او غذا خورد / خورده است'],
          ['abbiamo mangiato', 'ما غذا خوردیم / خورده‌ایم'], ['avete mangiato', 'شما غذا خوردید / خورده‌اید'], ['hanno mangiato', 'آنها غذا خوردند / خورده‌اند']]) }] },
        credere: { tables: [{ tense: 'passato_prossimo', rows: six([
          ['ho creduto', 'من باور کردم / باور کرده‌ام'], ['hai creduto', 'تو باور کردی / باور کرده‌ای'], ['ha creduto', 'او باور کرد / باور کرده است'],
          ['abbiamo creduto', 'ما باور کردیم / باور کرده‌ایم'], ['avete creduto', 'شما باور کردید / باور کرده‌اید'], ['hanno creduto', 'آنها باور کردند / باور کرده‌اند']]) }] },
        dormire: { tables: [{ tense: 'passato_prossimo', rows: six([
          ['ho dormito', 'من خوابیدم / خوابیده‌ام'], ['hai dormito', 'تو خوابیدی / خوابیده‌ای'], ['ha dormito', 'او خوابید / خوابیده است'],
          ['abbiamo dormito', 'ما خوابیدیم / خوابیده‌ایم'], ['avete dormito', 'شما خوابیدید / خوابیده‌اید'], ['hanno dormito', 'آنها خوابیدند / خوابیده‌اند']]) }] },
        andare: { tables: [{ tense: 'passato_prossimo', rows: six([
          ['sono andato/a', 'من رفتم / رفته‌ام'], ['sei andato/a', 'تو رفتی / رفته‌ای'], ['è andato/a', 'او رفت / رفته است'],
          ['siamo andati/e', 'ما رفتیم / رفته‌ایم'], ['siete andati/e', 'شما رفتید / رفته‌اید'], ['sono andati/e', 'آنها رفتند / رفته‌اند']]) }],
          note: 'پایانهٔ *-o / -i* برای مذکر و *-a / -e* برای مؤنث است: *(io, Marco) sono andato* / *(io, Maria) sono andata*.' },
        fare: { tables: [{ tense: 'passato_prossimo', irr: SIX, rows: six([
          ['ho fatto', 'من انجام دادم / انجام داده‌ام'], ['hai fatto', 'تو انجام دادی / انجام داده‌ای'], ['ha fatto', 'او انجام داد / انجام داده است'],
          ['abbiamo fatto', 'ما انجام دادیم / انجام داده‌ایم'], ['avete fatto', 'شما انجام دادید / انجام داده‌اید'], ['hanno fatto', 'آنها انجام دادند / انجام داده‌اند']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Ieri ho mangiato una pizza.', fa: 'دیروز یک پیتزا خوردم.' },
        { verb: 'andare', it: 'Maria è andata al mercato.', fa: 'ماریا به بازار رفت.' },
        { verb: 'fare', it: 'Abbiamo fatto i compiti.', fa: 'تکالیف را انجام دادیم.' },
        { verb: 'dormire', it: 'Stanotte ho dormito poco.', fa: 'دیشب کم خوابیدم.' },
        { verb: 'credere', it: 'Non ho creduto alle sue parole.', fa: 'حرف‌هایش را باور نکردم.' }
      ],
      notes: [
        '«خوردم» یا «خورده‌ام»؟ برای کاری در زمانی مشخص در گذشته (*ieri ho mangiato*) گذشتهٔ ساده طبیعی‌تر است؛ برای تجربه یا نتیجه‌ای که هنوز مهم است (*hai mai mangiato il sushi?* = «تا حالا سوشی خورده‌ای؟») ماضی نقلی.',
        'در گفتار شمال ایتالیا *passato prossimo* تقریباً جای *passato remoto* را گرفته است.'
      ]
    },

    /* ------------------------------------------------------------------ 3 */
    {
      id: 'imperfetto', num: 3, it: 'Imperfetto', fa: 'گذشتهٔ استمراری یا عادتی',
      use: 'برای عادت‌های گذشته («هر تابستان می‌رفتیم»)، توصیف حالت و پس‌زمینه در گذشته، و کاری که در جریان بود وقتی کار دیگری رخ داد. معادل فارسی‌اش معمولاً ماضی استمراری است («می‌خوردم»).',
      formula: {
        parts: [{ text: 'infinito − re', note: 'mangia- · crede- · dormi-', type: 'verb' }, { text: '-vo · -vi · -va', note: '-vamo · -vate · -vano', type: 'extra' }],
        example: 'mangia + vo = mangiavo · crede + vo = credevo · dormi + vo = dormivo',
        fa: 'مصدر منهای *-re* + *-vo, -vi, -va, -vamo, -vate, -vano*',
        steps: [
          'فقط *-re* را از آخر مصدر حذف کنید تا حرف صدادار گروه بماند: *mangia-*، *crede-*، *dormi-*.',
          'شناسه‌های *-vo, -vi, -va, -vamo, -vate, -vano* را اضافه کنید.',
          'ایمپرفتو تقریباً در همهٔ فعل‌ها باقاعده است؛ حتی *andare* (*andavo*) و *avere* (*avevo*).'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are', '-ere', '-ire'],
        rows: [['io', '-avo', '-evo', '-ivo'], ['tu', '-avi', '-evi', '-ivi'], ['lui', '-ava', '-eva', '-iva'],
               ['noi', '-avamo', '-evamo', '-ivamo'], ['voi', '-avate', '-evate', '-ivate'], ['loro', '-avano', '-evano', '-ivano']]
      }],
      regular: '*mangiavo*، *credevo*، *dormivo* و حتی *andavo* کاملاً باقاعده‌اند.',
      irregular: '*fare* ← *facevo* (ریشهٔ لاتین *face-*). همین‌طور *dire* ← *dicevo*، *bere* ← *bevevo*، *tradurre* ← *traducevo*. *essere* کاملاً بی‌قاعده است: *ero, eri, era…* (جدول پایین).',
      verbs: {
        mangiare: { tables: [{ tense: 'imperfetto', rows: six([
          ['mangiavo', 'من غذا می‌خوردم'], ['mangiavi', 'تو غذا می‌خوردی'], ['mangiava', 'او غذا می‌خورد'],
          ['mangiavamo', 'ما غذا می‌خوردیم'], ['mangiavate', 'شما غذا می‌خوردید'], ['mangiavano', 'آنها غذا می‌خوردند']]) }],
          note: '«او غذا می‌خورد» در گذشته و حال یک‌جور نوشته می‌شود ولی متفاوت تلفظ می‌شود: *mangia* = mi-khor-ad، *mangiava* = mi-khord.' },
        credere: { tables: [{ tense: 'imperfetto', rows: six([
          ['credevo', 'من باور می‌کردم'], ['credevi', 'تو باور می‌کردی'], ['credeva', 'او باور می‌کرد'],
          ['credevamo', 'ما باور می‌کردیم'], ['credevate', 'شما باور می‌کردید'], ['credevano', 'آنها باور می‌کردند']]) }],
          note: '*credevo che…* اغلب یعنی «فکر می‌کردم که…».' },
        dormire: { tables: [{ tense: 'imperfetto', rows: six([
          ['dormivo', 'من می‌خوابیدم'], ['dormivi', 'تو می‌خوابیدی'], ['dormiva', 'او می‌خوابید'],
          ['dormivamo', 'ما می‌خوابیدیم'], ['dormivate', 'شما می‌خوابیدید'], ['dormivano', 'آنها می‌خوابیدند']]) }],
          note: 'برای حالتِ در جریان، فارسی «خواب بودم» را ترجیح می‌دهد: *mentre dormivo* = «وقتی خواب بودم».' },
        andare: { tables: [{ tense: 'imperfetto', rows: six([
          ['andavo', 'من می‌رفتم'], ['andavi', 'تو می‌رفتی'], ['andava', 'او می‌رفت'],
          ['andavamo', 'ما می‌رفتیم'], ['andavate', 'شما می‌رفتید'], ['andavano', 'آنها می‌رفتند']]) }] },
        fare: { tables: [{ tense: 'imperfetto', irr: SIX, rows: six([
          ['facevo', 'من انجام می‌دادم'], ['facevi', 'تو انجام می‌دادی'], ['faceva', 'او انجام می‌داد'],
          ['facevamo', 'ما انجام می‌دادیم'], ['facevate', 'شما انجام می‌دادید'], ['facevano', 'آنها انجام می‌دادند']]) }] }
      },
      extra: [
        { title: 'essere — بودن (completamente irregolare · کاملاً بی‌قاعده)', verb: 'essere', tense: 'imperfetto', irr: SIX, rows: six([
          ['ero', 'من بودم'], ['eri', 'تو بودی'], ['era', 'او بود'], ['eravamo', 'ما بودیم'], ['eravate', 'شما بودید'], ['erano', 'آنها بودند']]) },
        { title: 'avere — داشتن (regolare · باقاعده)', verb: 'avere', tense: 'imperfetto', rows: six([
          ['avevo', 'من داشتم'], ['avevi', 'تو داشتی'], ['aveva', 'او داشت'], ['avevamo', 'ما داشتیم'], ['avevate', 'شما داشتید'], ['avevano', 'آنها داشتند']]) }
      ],
      examples: [
        { verb: 'mangiare', it: 'Da bambino mangiavo sempre la frutta.', fa: 'بچه که بودم همیشه میوه می‌خوردم.' },
        { verb: 'credere', it: 'Credevo che fosse vero.', fa: 'فکر می‌کردم (که) حقیقت دارد.' },
        { verb: 'dormire', it: 'Mentre dormivo, è suonato il telefono.', fa: 'وقتی خواب بودم، تلفن زنگ زد.' },
        { verb: 'andare', it: 'Ogni estate andavamo al mare.', fa: 'هر تابستان به کنار دریا می‌رفتیم.' },
        { verb: 'fare', it: 'Che cosa facevi ieri alle otto?', fa: 'دیروز ساعت هشت چه کار می‌کردی؟' }
      ],
      notes: [
        '*imperfetto* یا *passato prossimo*؟ پس‌زمینه، عادت و توصیف ← *imperfetto*؛ رویدادِ تمام‌شده ← *passato prossimo*: *Mentre dormivo (پس‌زمینه), è suonato il telefono (رویداد).*'
      ]
    },

    /* ------------------------------------------------------------------ 4 */
    {
      id: 'condizionale', num: 4, it: 'Condizionale', fa: 'وجه شرطی',
      use: 'برای کاری که تحت یک شرط انجام می‌شد، آرزو، درخواست مؤدبانه (*vorrei un caffè* = «یک قهوه می‌خواستم / لطفاً یک قهوه») و توصیه (*dovresti dormire* = «بهتر است بخوابی»). فارسی صورت شرطیِ جداگانه ندارد؛ معمولاً ماضی استمراری («می‌خوردم، اگر…») یا عبارت‌هایی مثل «دلم می‌خواهد» به کار می‌رود.',
      formula: {
        parts: [{ text: 'radice del futuro', note: 'manger- · creder- · dormir-', type: 'verb' }, { text: '-ei · -esti · -ebbe', note: '-emmo · -este · -ebbero', type: 'extra' }],
        example: 'manger + ei = mangerei · creder + ei = crederei · dormir + ei = dormirei',
        fa: 'ریشهٔ آینده + *-ei, -esti, -ebbe, -emmo, -este, -ebbero*',
        steps: [
          '*-e* آخر مصدر را بردارید: *credere* ← *creder-*، *dormire* ← *dormir-*.',
          'در فعل‌های *-are* حرف *a* به *e* تبدیل می‌شود: *mangiare* ← *manger-* (و *i* در *-giare* هم حذف می‌شود).',
          'شناسه‌ها را اضافه کنید. ریشهٔ شرطی همیشه همان ریشهٔ آینده است.',
          'ریشه‌های بی‌قاعده: *andare* ← *andr-*، *fare* ← *far-*، *essere* ← *sar-*، *avere* ← *avr-*، *potere* ← *potr-*، *volere* ← *vorr-*.'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are', '-ere', '-ire'],
        rows: [['io', '-erei', '-erei', '-irei'], ['tu', '-eresti', '-eresti', '-iresti'], ['lui', '-erebbe', '-erebbe', '-irebbe'],
               ['noi', '-eremmo', '-eremmo', '-iremmo'], ['voi', '-ereste', '-ereste', '-ireste'], ['loro', '-erebbero', '-erebbero', '-irebbero']]
      }],
      regular: '*mangerei*، *crederei*، *dormirei* از قاعده پیروی می‌کنند.',
      irregular: '*andare* ← *andrei* (نه «anderei»)، *fare* ← *farei*. شناسه‌ها همان شناسه‌های باقاعده است؛ فقط ریشه عوض می‌شود.',
      verbs: {
        mangiare: { tables: [{ tense: 'condizionale', rows: six([
          ['mangerei', 'من غذا می‌خوردم، اگر…'], ['mangeresti', 'تو غذا می‌خوردی، اگر…'], ['mangerebbe', 'او غذا می‌خورد، اگر…'],
          ['mangeremmo', 'ما غذا می‌خوردیم، اگر…'], ['mangereste', 'شما غذا می‌خوردید، اگر…'], ['mangerebbero', 'آنها غذا می‌خوردند، اگر…']]) }] },
        credere: { tables: [{ tense: 'condizionale', rows: six([
          ['crederei', 'من باور می‌کردم، اگر…'], ['crederesti', 'تو باور می‌کردی، اگر…'], ['crederebbe', 'او باور می‌کرد، اگر…'],
          ['crederemmo', 'ما باور می‌کردیم، اگر…'], ['credereste', 'شما باور می‌کردید، اگر…'], ['crederebbero', 'آنها باور می‌کردند، اگر…']]) }] },
        dormire: { tables: [{ tense: 'condizionale', rows: six([
          ['dormirei', 'من می‌خوابیدم، اگر…'], ['dormiresti', 'تو می‌خوابیدی، اگر…'], ['dormirebbe', 'او می‌خوابید، اگر…'],
          ['dormiremmo', 'ما می‌خوابیدیم، اگر…'], ['dormireste', 'شما می‌خوابیدید، اگر…'], ['dormirebbero', 'آنها می‌خوابیدند، اگر…']]) }] },
        andare: { tables: [{ tense: 'condizionale', irr: SIX, rows: six([
          ['andrei', 'من می‌رفتم، اگر…'], ['andresti', 'تو می‌رفتی، اگر…'], ['andrebbe', 'او می‌رفت، اگر…'],
          ['andremmo', 'ما می‌رفتیم، اگر…'], ['andreste', 'شما می‌رفتید، اگر…'], ['andrebbero', 'آنها می‌رفتند، اگر…']]) }] },
        fare: { tables: [{ tense: 'condizionale', irr: SIX, rows: six([
          ['farei', 'من انجام می‌دادم، اگر…'], ['faresti', 'تو انجام می‌دادی، اگر…'], ['farebbe', 'او انجام می‌داد، اگر…'],
          ['faremmo', 'ما انجام می‌دادیم، اگر…'], ['fareste', 'شما انجام می‌دادید، اگر…'], ['farebbero', 'آنها انجام می‌دادند، اگر…']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Mangerei volentieri una pizza.', fa: 'دلم می‌خواهد یک پیتزا بخورم. (با کمال میل یک پیتزا می‌خوردم.)' },
        { verb: 'andare', it: 'Andrei in Italia, ma non ho tempo.', fa: 'به ایتالیا می‌رفتم، ولی وقت ندارم.' },
        { verb: 'fare', it: 'Che cosa faresti al mio posto?', fa: 'اگر جای من بودی چه کار می‌کردی؟' },
        { verb: 'dormire', it: 'Dormirei tutto il giorno!', fa: 'کاش می‌شد تمام روز را بخوابم!' },
        { verb: 'credere', it: 'Io non crederei mai a una storia così.', fa: 'من هرگز چنین داستانی را باور نمی‌کردم.' }
      ],
      notes: [
        'ترجمهٔ شرطی به فارسی به نقش جمله بستگی دارد: شرط ← «می‌خوردم، اگر…»؛ آرزو ← «دلم می‌خواهد…» یا «کاش…»؛ ادب ← «می‌خواستم…» یا «لطفاً…».',
        'در جملهٔ «اگر»، بعد از *se* شرطی نمی‌آید بلکه *congiuntivo imperfetto*: *Se avessi tempo, andrei in Italia* = «اگر وقت داشتم، به ایتالیا می‌رفتم».'
      ]
    },

    /* ------------------------------------------------------------------ 5 */
    {
      id: 'futuro', num: 5, it: 'Futuro Semplice', fa: 'زمان آینده',
      use: 'برای کارهایی که در آینده انجام خواهد شد، پیش‌بینی و قول. همچنین برای حدس دربارهٔ زمان حال: *Sarà a casa* = «احتمالاً خانه است».',
      formula: {
        parts: [{ text: 'radice del futuro', note: 'manger- · creder- · dormir-', type: 'verb' }, { text: '-ò · -ai · -à', note: '-emo · -ete · -anno', type: 'extra' }],
        example: 'manger + ò = mangerò · creder + ò = crederò · dormir + ò = dormirò',
        fa: 'ریشهٔ آینده (همان ریشهٔ شرطی) + *-ò, -ai, -à, -emo, -ete, -anno*',
        steps: [
          '*-e* آخر مصدر را بردارید؛ در فعل‌های *-are* حرف *a* به *e* تبدیل می‌شود: *mangiare* ← *manger-*.',
          'شناسه‌های *-ò, -ai, -à, -emo, -ete, -anno* را اضافه کنید (روی *ò* و *à* علامت تکیه لازم است).',
          'ریشه‌های بی‌قاعده مثل شرطی است: *andr-* (*andrò*)، *far-* (*farò*)، *sar-* (*sarò*)، *avr-* (*avrò*).'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are', '-ere', '-ire'],
        rows: [['io', '-erò', '-erò', '-irò'], ['tu', '-erai', '-erai', '-irai'], ['lui', '-erà', '-erà', '-irà'],
               ['noi', '-eremo', '-eremo', '-iremo'], ['voi', '-erete', '-erete', '-irete'], ['loro', '-eranno', '-eranno', '-iranno']]
      }],
      regular: '*mangerò*، *crederò*، *dormirò* باقاعده‌اند.',
      irregular: '*andare* ← *andrò, andrai…*؛ *fare* ← *farò, farai…*. شناسه‌ها باقاعده‌اند؛ فقط ریشه کوتاه یا متفاوت است.',
      verbs: {
        mangiare: { tables: [{ tense: 'futuro', rows: six([
          ['mangerò', 'من غذا خواهم خورد'], ['mangerai', 'تو غذا خواهی خورد'], ['mangerà', 'او غذا خواهد خورد'],
          ['mangeremo', 'ما غذا خواهیم خورد'], ['mangerete', 'شما غذا خواهید خورد'], ['mangeranno', 'آنها غذا خواهند خورد']]) }] },
        credere: { tables: [{ tense: 'futuro', rows: six([
          ['crederò', 'من باور خواهم کرد'], ['crederai', 'تو باور خواهی کرد'], ['crederà', 'او باور خواهد کرد'],
          ['crederemo', 'ما باور خواهیم کرد'], ['crederete', 'شما باور خواهید کرد'], ['crederanno', 'آنها باور خواهند کرد']]) }] },
        dormire: { tables: [{ tense: 'futuro', rows: six([
          ['dormirò', 'من خواهم خوابید'], ['dormirai', 'تو خواهی خوابید'], ['dormirà', 'او خواهد خوابید'],
          ['dormiremo', 'ما خواهیم خوابید'], ['dormirete', 'شما خواهید خوابید'], ['dormiranno', 'آنها خواهند خوابید']]) }] },
        andare: { tables: [{ tense: 'futuro', irr: SIX, rows: six([
          ['andrò', 'من خواهم رفت'], ['andrai', 'تو خواهی رفت'], ['andrà', 'او خواهد رفت'],
          ['andremo', 'ما خواهیم رفت'], ['andrete', 'شما خواهید رفت'], ['andranno', 'آنها خواهند رفت']]) }] },
        fare: { tables: [{ tense: 'futuro', irr: SIX, rows: six([
          ['farò', 'من انجام خواهم داد'], ['farai', 'تو انجام خواهی داد'], ['farà', 'او انجام خواهد داد'],
          ['faremo', 'ما انجام خواهیم داد'], ['farete', 'شما انجام خواهید داد'], ['faranno', 'آنها انجام خواهند داد']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Domani mangerò da mia nonna.', fa: 'فردا خانهٔ مادربزرگم غذا خواهم خورد.' },
        { verb: 'andare', it: "L'anno prossimo andremo in Sicilia.", fa: 'سال آینده به سیسیل خواهیم رفت.' },
        { verb: 'fare', it: 'Farò del mio meglio.', fa: 'تمام تلاشم را خواهم کرد.' },
        { verb: 'dormire', it: 'Stanotte dormirete in albergo.', fa: 'امشب در هتل خواهید خوابید.' },
        { verb: 'credere', it: 'Nessuno ci crederà.', fa: 'هیچ‌کس باور نخواهد کرد.' }
      ],
      notes: [
        '«خواهم خورد» رسمی و نوشتاری است. در فارسی محاوره معمولاً زمان حال به کار می‌رود: «فردا می‌روم». ایتالیایی هم در گفتار اغلب از *presente* استفاده می‌کند: *Domani vado a Roma*.',
        'آیندهٔ حدسی: *Che ore sono? — Saranno le otto.* = «ساعت چند است؟ — احتمالاً هشت است».'
      ]
    },

    /* ------------------------------------------------------------------ 6 */
    {
      id: 'gerundio-presente', num: 6, it: 'Gerundio Presente', fa: 'وجه وصفی حال / در حال انجام دادن',
      use: 'صورتی ثابت که شخص و زمان ندارد. دو کاربرد اصلی: با *stare* برای کاری که همین الان در جریان است (*sto mangiando* = «دارم غذا می‌خورم»)، و به‌تنهایی برای بیان هم‌زمانی، روش یا علت (*andando a scuola* = «وقتی به مدرسه می‌رفتم»).',
      formula: {
        parts: [{ text: 'radice', note: 'mangi- · cred- · dorm-', type: 'verb' }, { text: '-ando / -endo', note: '-are → -ando · -ere/-ire → -endo', type: 'extra' }],
        example: 'mangiando · credendo · dormendo · andando · facendo',
        fa: '*-are* ← *-ando*؛ *-ere* و *-ire* ← *-endo*',
        steps: [
          'پایانهٔ مصدر را بردارید و *-ando* (گروه *-are*) یا *-endo* (گروه‌های *-ere* و *-ire*) اضافه کنید.',
          'وجه وصفی تغییر نمی‌کند: برای همهٔ اشخاص یکی است. شخص را فعل *stare* یا فاعلِ جملهٔ اصلی نشان می‌دهد.',
          'زمان حالِ استمراری: *stare* (*sto, stai, sta, stiamo, state, stanno*) + وجه وصفی.'
        ]
      },
      endings: [{
        title: 'Desinenze · پایانه‌ها',
        cols: ['-are', '-ere', '-ire'],
        rows: [['ger', '-ando', '-endo', '-endo']]
      }, {
        title: 'stare + gerundio · حال استمراری',
        cols: ['stare (presente)', 'esempio'],
        rows: [['io', 'sto', 'sto mangiando'], ['tu', 'stai', 'stai mangiando'], ['lui', 'sta', 'sta mangiando'],
               ['noi', 'stiamo', 'stiamo mangiando'], ['voi', 'state', 'state mangiando'], ['loro', 'stanno', 'stanno mangiando']]
      }],
      regular: '*mangiando*، *credendo*، *dormendo* و حتی *andando* باقاعده‌اند.',
      irregular: '*fare* ← *facendo* (از *facere*، نه «fando»). همین‌طور *dire* ← *dicendo*، *bere* ← *bevendo*.',
      verbs: {
        mangiare: { tables: [
          { title: 'Gerundio · وجه وصفی', tense: 'gerundio', rows: [['ger', 'mangiando', 'در حال غذا خوردن / با غذا خوردن']] },
          { title: 'stare + gerundio · حال استمراری', tense: 'stare_gerundio', rows: six([
            ['sto mangiando', 'من دارم غذا می‌خورم'], ['stai mangiando', 'تو داری غذا می‌خوری'], ['sta mangiando', 'او دارد غذا می‌خورد'],
            ['stiamo mangiando', 'ما داریم غذا می‌خوریم'], ['state mangiando', 'شما دارید غذا می‌خورید'], ['stanno mangiando', 'آنها دارند غذا می‌خورند']]) }] },
        credere: { tables: [
          { title: 'Gerundio · وجه وصفی', tense: 'gerundio', rows: [['ger', 'credendo', 'به خیال اینکه… / با این باور که…']] }],
          note: '*credere* فعلِ حالت است، پس با *stare* به کار نمی‌رود: «sto credendo» غیرطبیعی است. *Credendo di…* = «به خیال اینکه…».' },
        dormire: { tables: [
          { title: 'Gerundio · وجه وصفی', tense: 'gerundio', rows: [['ger', 'dormendo', 'در حال خوابیدن / با خوابیدن']] },
          { title: 'stare + gerundio · حال استمراری', tense: 'stare_gerundio', rows: six([
            ['sto dormendo', 'من خوابم (در حال خوابیدنم)'], ['stai dormendo', 'تو خوابی'], ['sta dormendo', 'او خواب است'],
            ['stiamo dormendo', 'ما خوابیم'], ['state dormendo', 'شما خوابید'], ['stanno dormendo', 'آنها خوابند']]) }],
          note: '«دارم می‌خوابم» در فارسی یعنی «دارم به خواب می‌روم». برای *sto dormendo* فارسی «خوابم / خواب است» را می‌گوید.' },
        andare: { tables: [
          { title: 'Gerundio · وجه وصفی', tense: 'gerundio', rows: [['ger', 'andando', 'در حال رفتن / وقتی می‌رفتم…']] },
          { title: 'stare + gerundio · حال استمراری', tense: 'stare_gerundio', rows: six([
            ['sto andando', 'من دارم می‌روم'], ['stai andando', 'تو داری می‌روی'], ['sta andando', 'او دارد می‌رود'],
            ['stiamo andando', 'ما داریم می‌رویم'], ['state andando', 'شما دارید می‌روید'], ['stanno andando', 'آنها دارند می‌روند']]) }] },
        fare: { tables: [
          { title: 'Gerundio · وجه وصفی', tense: 'gerundio', irr: ['ger'], rows: [['ger', 'facendo', 'در حال انجام دادن / با انجام دادن']] },
          { title: 'stare + gerundio · حال استمراری', tense: 'stare_gerundio', irr: SIX, rows: six([
            ['sto facendo', 'من دارم انجام می‌دهم'], ['stai facendo', 'تو داری انجام می‌دهی'], ['sta facendo', 'او دارد انجام می‌دهد'],
            ['stiamo facendo', 'ما داریم انجام می‌دهیم'], ['state facendo', 'شما دارید انجام می‌دهید'], ['stanno facendo', 'آنها دارند انجام می‌دهند']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Sto mangiando, ti richiamo dopo.', fa: 'دارم غذا می‌خورم، بعداً بهت زنگ می‌زنم.' },
        { verb: 'credere', it: 'Credendo di avere ragione, non ha ascoltato nessuno.', fa: 'به خیال اینکه حق با اوست، به حرف هیچ‌کس گوش نداد.' },
        { verb: 'dormire', it: 'Il gatto sta dormendo sul divano.', fa: 'گربه روی مبل خوابیده است.' },
        { verb: 'andare', it: 'Andando a scuola, ho incontrato Luca.', fa: 'وقتی داشتم به مدرسه می‌رفتم، لوکا را دیدم.' },
        { verb: 'fare', it: 'Facendo sport, si sta meglio.', fa: 'با ورزش کردن، حال آدم بهتر می‌شود.' }
      ],
      notes: [
        'ضمیرها به آخر وجه وصفی می‌چسبند: *mangiandolo* = «در حال خوردنِ آن»، *facendolo* = «با انجام دادنِ آن».',
        'فاعلِ وجه وصفی معمولاً همان فاعلِ جملهٔ اصلی است: در *Andando a scuola, ho incontrato Luca* کسی که می‌رفت «من» هستم.'
      ]
    },

    /* ------------------------------------------------------------------ 7 */
    {
      id: 'gerundio-passato', num: 7, it: 'Gerundio Passato', fa: 'وجه وصفی گذشته / پس از انجام دادن',
      use: 'کاری که پیش از کارِ جملهٔ اصلی انجام شده است، اغلب با معنای علت («چون … کرده بودم») یا ترتیب زمانی («پس از اینکه …»). فارسی صورت جداگانه‌ای برای آن ندارد و از جملهٔ کامل استفاده می‌کند.',
      formula: {
        parts: [{ text: 'avendo / essendo', note: 'gerundio dell\'ausiliare', type: 'subject' }, { text: 'participio passato', note: 'mangiato · andato/a', type: 'verb' }],
        example: 'avendo mangiato · avendo creduto · avendo dormito · essendo andato/a · avendo fatto',
        fa: 'وجه وصفیِ فعل کمکی (*avendo* یا *essendo*) + اسم مفعول',
        steps: [
          'فعل کمکی همان فعل کمکیِ *passato prossimo* است: *ho mangiato* ← *avendo mangiato*؛ *sono andato* ← *essendo andato*.',
          'با *avendo* اسم مفعول تغییر نمی‌کند و برای همهٔ اشخاص یکی است.',
          'با *essendo* اسم مفعول با فاعل مطابقت می‌کند: *essendo andato / andata / andati / andate*.'
        ]
      },
      endings: [{
        title: 'Ausiliare · فعل کمکی',
        cols: ['avere', 'essere'],
        rows: [['ger', 'avendo + participio', 'essendo + participio (-o/-a/-i/-e)']]
      }],
      regular: '*avendo mangiato*، *avendo creduto*، *avendo dormito*: ساختار ثابت با اسم مفعول باقاعده.',
      irregular: '*avendo fatto* (اسم مفعول بی‌قاعدهٔ *fatto*). *essendo andato/a*: فعل کمکی *essere* و مطابقت با فاعل.',
      verbs: {
        mangiare: { tables: [{ tense: 'gerundio_passato', rows: six([
          ['avendo mangiato', '(من) پس از اینکه غذا خوردم، …'], ['avendo mangiato', '(تو) پس از اینکه غذا خوردی، …'], ['avendo mangiato', '(او) پس از اینکه غذا خورد، …'],
          ['avendo mangiato', '(ما) پس از اینکه غذا خوردیم، …'], ['avendo mangiato', '(شما) پس از اینکه غذا خوردید، …'], ['avendo mangiato', '(آنها) پس از اینکه غذا خوردند، …']]) }],
          note: 'صورت ایتالیایی برای همه یکی است؛ شخص را فعلِ جملهٔ اصلی مشخص می‌کند.' },
        credere: { tables: [{ tense: 'gerundio_passato', rows: six([
          ['avendo creduto', '(من) چون باور کرده بودم، …'], ['avendo creduto', '(تو) چون باور کرده بودی، …'], ['avendo creduto', '(او) چون باور کرده بود، …'],
          ['avendo creduto', '(ما) چون باور کرده بودیم، …'], ['avendo creduto', '(شما) چون باور کرده بودید، …'], ['avendo creduto', '(آنها) چون باور کرده بودند، …']]) }] },
        dormire: { tables: [{ tense: 'gerundio_passato', rows: six([
          ['avendo dormito', '(من) چون خوابیده بودم، …'], ['avendo dormito', '(تو) چون خوابیده بودی، …'], ['avendo dormito', '(او) چون خوابیده بود، …'],
          ['avendo dormito', '(ما) چون خوابیده بودیم، …'], ['avendo dormito', '(شما) چون خوابیده بودید، …'], ['avendo dormito', '(آنها) چون خوابیده بودند، …']]) }] },
        andare: { tables: [{ tense: 'gerundio_passato', rows: six([
          ['essendo andato/a', '(من) پس از اینکه رفتم، …'], ['essendo andato/a', '(تو) پس از اینکه رفتی، …'], ['essendo andato/a', '(او) پس از اینکه رفت، …'],
          ['essendo andati/e', '(ما) پس از اینکه رفتیم، …'], ['essendo andati/e', '(شما) پس از اینکه رفتید، …'], ['essendo andati/e', '(آنها) پس از اینکه رفتند، …']]) }],
          note: 'فقط پایانهٔ اسم مفعول تغییر می‌کند: مفرد *andato/a*، جمع *andati/e*.' },
        fare: { tables: [{ tense: 'gerundio_passato', irr: SIX, rows: six([
          ['avendo fatto', '(من) پس از اینکه انجام دادم، …'], ['avendo fatto', '(تو) پس از اینکه انجام دادی، …'], ['avendo fatto', '(او) پس از اینکه انجام داد، …'],
          ['avendo fatto', '(ما) پس از اینکه انجام دادیم، …'], ['avendo fatto', '(شما) پس از اینکه انجام دادید، …'], ['avendo fatto', '(آنها) پس از اینکه انجام دادند، …']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Avendo mangiato troppo, mi sento male.', fa: 'چون زیاد غذا خورده‌ام، حالم بد است.' },
        { verb: 'andare', it: 'Essendo andata via presto, Anna non ha visto la fine del film.', fa: 'آنا چون زود رفته بود، آخر فیلم را ندید.' },
        { verb: 'fare', it: 'Avendo fatto i compiti, i ragazzi sono usciti.', fa: 'بچه‌ها پس از اینکه تکالیفشان را انجام دادند، بیرون رفتند.' },
        { verb: 'dormire', it: 'Avendo dormito bene, mi sono svegliato di buon umore.', fa: 'چون خوب خوابیده بودم، سرحال بیدار شدم.' },
        { verb: 'credere', it: 'Avendo creduto alle sue promesse, ho perso tutto.', fa: 'چون قول‌هایش را باور کرده بودم، همه‌چیز را از دست دادم.' }
      ],
      notes: [
        'این ساختار بیشتر در زبان نوشتاری و رسمی به کار می‌رود. در گفتار اغلب می‌گویند: *Dopo aver mangiato…* («بعد از غذا خوردن…») یا *Siccome avevo mangiato…* («چون غذا خورده بودم…»).'
      ]
    },

    /* ------------------------------------------------------------------ 8 */
    {
      id: 'trapassato-prossimo', num: 8, it: 'Trapassato Prossimo', fa: 'ماضی بعید',
      use: 'برای کاری که پیش از یک لحظه یا کارِ دیگر در گذشته انجام شده بود: «وقتی رسیدم، آنها غذا خورده بودند». دقیقاً معادل ماضی بعید فارسی است.',
      formula: {
        parts: [{ text: 'avevo / ero …', note: 'imperfetto di avere / essere', type: 'subject' }, { text: 'participio passato', note: 'mangiato · andato/a', type: 'verb' }],
        example: 'avevo mangiato · avevo creduto · avevo dormito · ero andato/a · avevo fatto',
        fa: '*imperfetto*ِ *avere* یا *essere* + اسم مفعول',
        steps: [
          'فعل کمکی را مثل *passato prossimo* انتخاب کنید، ولی آن را در *imperfetto* صرف کنید: *ho* ← *avevo*، *sono* ← *ero*.',
          'قواعد مطابقت هم همان است: با *essere* اسم مفعول با فاعل مطابقت می‌کند (*Maria era andata*).'
        ]
      },
      endings: [{
        title: 'Ausiliari all\'imperfetto · فعل‌های کمکی در گذشتهٔ استمراری',
        cols: ['avere', 'essere'],
        rows: [['io', 'avevo', 'ero'], ['tu', 'avevi', 'eri'], ['lui', 'aveva', 'era'], ['noi', 'avevamo', 'eravamo'], ['voi', 'avevate', 'eravate'], ['loro', 'avevano', 'erano']]
      }],
      regular: '*avevo mangiato*، *avevo creduto*، *avevo dormito*.',
      irregular: '*avevo fatto* (اسم مفعول بی‌قاعده). *ero andato/a* (فعل کمکی *essere* با مطابقت).',
      verbs: {
        mangiare: { tables: [{ tense: 'trapassato', rows: six([
          ['avevo mangiato', 'من غذا خورده بودم'], ['avevi mangiato', 'تو غذا خورده بودی'], ['aveva mangiato', 'او غذا خورده بود'],
          ['avevamo mangiato', 'ما غذا خورده بودیم'], ['avevate mangiato', 'شما غذا خورده بودید'], ['avevano mangiato', 'آنها غذا خورده بودند']]) }] },
        credere: { tables: [{ tense: 'trapassato', rows: six([
          ['avevo creduto', 'من باور کرده بودم'], ['avevi creduto', 'تو باور کرده بودی'], ['aveva creduto', 'او باور کرده بود'],
          ['avevamo creduto', 'ما باور کرده بودیم'], ['avevate creduto', 'شما باور کرده بودید'], ['avevano creduto', 'آنها باور کرده بودند']]) }] },
        dormire: { tables: [{ tense: 'trapassato', rows: six([
          ['avevo dormito', 'من خوابیده بودم'], ['avevi dormito', 'تو خوابیده بودی'], ['aveva dormito', 'او خوابیده بود'],
          ['avevamo dormito', 'ما خوابیده بودیم'], ['avevate dormito', 'شما خوابیده بودید'], ['avevano dormito', 'آنها خوابیده بودند']]) }] },
        andare: { tables: [{ tense: 'trapassato', rows: six([
          ['ero andato/a', 'من رفته بودم'], ['eri andato/a', 'تو رفته بودی'], ['era andato/a', 'او رفته بود'],
          ['eravamo andati/e', 'ما رفته بودیم'], ['eravate andati/e', 'شما رفته بودید'], ['erano andati/e', 'آنها رفته بودند']]) }] },
        fare: { tables: [{ tense: 'trapassato', irr: SIX, rows: six([
          ['avevo fatto', 'من انجام داده بودم'], ['avevi fatto', 'تو انجام داده بودی'], ['aveva fatto', 'او انجام داده بود'],
          ['avevamo fatto', 'ما انجام داده بودیم'], ['avevate fatto', 'شما انجام داده بودید'], ['avevano fatto', 'آنها انجام داده بودند']]) }] }
      },
      examples: [
        { verb: 'mangiare', it: 'Quando sono arrivato, avevano già mangiato.', fa: 'وقتی رسیدم، آنها غذا خورده بودند.' },
        { verb: 'andare', it: 'Ero già andata via quando hai chiamato.', fa: 'وقتی زنگ زدی، من رفته بودم.' },
        { verb: 'fare', it: 'Non avevo mai fatto una cosa simile.', fa: 'هرگز چنین کاری نکرده بودم.' },
        { verb: 'dormire', it: 'Avevo dormito solo tre ore.', fa: 'فقط سه ساعت خوابیده بودم.' },
        { verb: 'credere', it: 'Gli avevo creduto, ma mi ha mentito.', fa: 'حرفش را باور کرده بودم، ولی به من دروغ گفت.' }
      ],
      notes: [
        'کلمهٔ *già* («قبلاً، دیگر») زیاد با این زمان می‌آید: *avevano già mangiato* = «(دیگر) غذا خورده بودند».'
      ]
    },

    /* ------------------------------------------------------------------ 9 */
    {
      id: 'imperativo', num: 9, it: 'Imperativo', fa: 'وجه امری',
      use: 'برای دستور، خواهش، دعوت و راهنمایی. وجه امری برای *io* وجود ندارد (به خودمان دستور نمی‌دهیم). صورت *noi* یعنی «بیایید… کنیم». صورت‌های *Lei* و *Loro* (محترمانه) از *congiuntivo presente* گرفته می‌شوند.',
      formula: {
        parts: [{ text: 'radice', note: 'mangi- · cred- · dorm-', type: 'verb' }, { text: 'desinenza', note: 'tu: -a (are) · -i (ere/ire)', type: 'extra' }],
        example: 'mangia! · credi! · dormi! — negativo: non mangiare!',
        fa: 'ریشه + شناسهٔ امری؛ نفیِ *tu* = *non* + مصدر',
        steps: [
          '*tu*: گروه *-are* ← *-a* (*mangia!*)؛ گروه‌های *-ere/-ire* ← *-i* (*credi! dormi!*).',
          '*noi* و *voi* همان صورت زمان حال است: *mangiamo! mangiate!*',
          '*Lei* و *Loro* (محترمانه) = *congiuntivo presente*: *mangi! mangino!*',
          'نفی: برای *tu* ← *non* + مصدر (*non mangiare!*)؛ برای بقیه ← *non* + صورت امری (*non mangiate!*).',
          'صورت‌های کوتاه بی‌قاعده: *andare* ← *va\'* یا *vai*؛ *fare* ← *fa\'* یا *fai*. با ضمیر، حرف بی‌صدا دوتا می‌شود: *fallo!* (انجامش بده)، *vacci!* (برو آنجا).'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are', '-ere', '-ire'],
        rows: [['tu', '-a', '-i', '-i'], ['Lei', '-i', '-a', '-a'], ['noi', '-iamo', '-iamo', '-iamo'], ['voi', '-ate', '-ete', '-ite'], ['Loro', '-ino', '-ano', '-ano']]
      }],
      regular: '*mangia!*، *credi!*، *dormi!* و صورت‌های دیگرِ این سه فعل از جدول پیروی می‌کنند.',
      irregular: '*andare*: *va\'/vai, vada, andiamo, andate, vadano*. *fare*: *fa\'/fai, faccia, facciamo, fate, facciano*. صورت «*io*» وجود ندارد و نباید ساخته شود.',
      verbs: {
        mangiare: { tables: [
          { title: 'Affermativo · مثبت', tense: 'imperativo', rows: imp([
            ['mangia!', 'غذا بخور!'], ['mangi!', 'غذا بخورید! (محترمانه)'], ['mangiamo!', 'بیایید غذا بخوریم!'], ['mangiate!', 'غذا بخورید!'], ['mangino!', 'غذا بخورید! (جمع، رسمی)']]) },
          { title: 'Negativo · منفی', tense: 'imperativo_neg', rows: imp([
            ['non mangiare!', 'غذا نخور!'], ['non mangi!', 'غذا نخورید! (محترمانه)'], ['non mangiamo!', 'بیایید غذا نخوریم!'], ['non mangiate!', 'غذا نخورید!'], ['non mangino!', 'غذا نخورید! (جمع، رسمی)']]) }] },
        credere: { tables: [
          { title: 'Affermativo · مثبت', tense: 'imperativo', rows: imp([
            ['credi!', 'باور کن!'], ['creda!', 'باور کنید! (محترمانه)'], ['crediamo!', 'بیایید باور کنیم!'], ['credete!', 'باور کنید!'], ['credano!', 'باور کنید! (جمع، رسمی)']]) },
          { title: 'Negativo · منفی', tense: 'imperativo_neg', rows: imp([
            ['non credere!', 'باور نکن!'], ['non creda!', 'باور نکنید! (محترمانه)'], ['non crediamo!', 'بیایید باور نکنیم!'], ['non credete!', 'باور نکنید!'], ['non credano!', 'باور نکنید! (جمع، رسمی)']]) }] },
        dormire: { tables: [
          { title: 'Affermativo · مثبت', tense: 'imperativo', rows: imp([
            ['dormi!', 'بخواب!'], ['dorma!', 'بخوابید! (محترمانه)'], ['dormiamo!', 'بیایید بخوابیم!'], ['dormite!', 'بخوابید!'], ['dormano!', 'بخوابید! (جمع، رسمی)']]) },
          { title: 'Negativo · منفی', tense: 'imperativo_neg', rows: imp([
            ['non dormire!', 'نخواب!'], ['non dorma!', 'نخوابید! (محترمانه)'], ['non dormiamo!', 'بیایید نخوابیم!'], ['non dormite!', 'نخوابید!'], ['non dormano!', 'نخوابید! (جمع، رسمی)']]) }] },
        andare: { tables: [
          { title: 'Affermativo · مثبت', tense: 'imperativo', irr: ['tu', 'Lei', 'Loro'], rows: imp([
            ["va' / vai!", 'برو!'], ['vada!', 'بروید! (محترمانه)'], ['andiamo!', 'بیایید برویم! / برویم!'], ['andate!', 'بروید!'], ['vadano!', 'بروید! (جمع، رسمی)']]) },
          { title: 'Negativo · منفی', tense: 'imperativo_neg', irr: ['Lei', 'Loro'], rows: imp([
            ['non andare!', 'نرو!'], ['non vada!', 'نروید! (محترمانه)'], ['non andiamo!', 'بیایید نرویم!'], ['non andate!', 'نروید!'], ['non vadano!', 'نروید! (جمع، رسمی)']]) }] },
        fare: { tables: [
          { title: 'Affermativo · مثبت', tense: 'imperativo', irr: ['tu', 'Lei', 'noi', 'Loro'], rows: imp([
            ["fa' / fai!", 'انجام بده!'], ['faccia!', 'انجام بدهید! (محترمانه)'], ['facciamo!', 'بیایید انجام بدهیم!'], ['fate!', 'انجام بدهید!'], ['facciano!', 'انجام بدهید! (جمع، رسمی)']]) },
          { title: 'Negativo · منفی', tense: 'imperativo_neg', irr: ['Lei', 'noi', 'Loro'], rows: imp([
            ['non fare!', 'انجام نده!'], ['non faccia!', 'انجام ندهید! (محترمانه)'], ['non facciamo!', 'بیایید انجام ندهیم!'], ['non fate!', 'انجام ندهید!'], ['non facciano!', 'انجام ندهید! (جمع، رسمی)']]) }],
          note: '*Faccia pure!* = «بفرمایید! / راحت باشید!» (محترمانه).' }
      },
      examples: [
        { verb: 'mangiare', it: 'Mangia la verdura!', fa: 'سبزیجاتت را بخور!' },
        { verb: 'andare', it: 'Non andare via!', fa: 'نرو!' },
        { verb: 'fare', it: 'Signora, faccia pure!', fa: 'خانم، بفرمایید!' },
        { verb: 'dormire', it: 'Dormite bene!', fa: 'خوب بخوابید!' },
        { verb: 'credere', it: 'Credimi, è la verità!', fa: 'حرفم را باور کن، حقیقت دارد!' }
      ],
      notes: [
        '*Loro* محترمانه امروزه کمیاب و بسیار رسمی است؛ در عمل برای جمع از *voi* استفاده می‌شود.',
        'ضمیرها به آخر صورت‌های *tu*، *noi* و *voi* می‌چسبند (*credimi!* = «باورم کن!»)، ولی پیش از صورت‌های *Lei* و *Loro* می‌آیند (*mi creda!*).'
      ]
    },

    /* ------------------------------------------------------------------ 10 */
    {
      id: 'congiuntivo-presente', num: 10, it: 'Congiuntivo Presente', fa: 'وجه التزامی حال',
      use: 'بعد از فعل‌ها و عبارت‌هایی که امید، خواسته، نظر، شک، احساس یا لزوم را بیان می‌کنند (*spero che*، *voglio che*، *penso che*، *è importante che*). تقریباً همیشه پس از *che* می‌آید و معادل التزامی فارسی است: «که … بروم».',
      formula: {
        parts: [{ text: 'che', type: 'subject' }, { text: 'radice', note: 'mangi- · cred- · dorm-', type: 'verb' }, { text: '-i (are) / -a (ere, ire)', note: '-iamo · -iate · -ino/-ano', type: 'extra' }],
        example: 'che tu mangi · che tu creda · che tu dorma · che tu vada · che tu faccia',
        fa: '*che* + ریشه + شناسهٔ التزامی',
        steps: [
          'گروه *-are*: *-i, -i, -i, -iamo, -iate, -ino*.',
          'گروه‌های *-ere* و *-ire*: *-a, -a, -a, -iamo, -iate, -ano*.',
          'سه شخص مفرد (*io, tu, lui/lei*) یک صورت دارند؛ برای روشن بودن معمولاً ضمیر را می‌آورند: *che io vada / che tu vada*.',
          'در فعل‌های بی‌قاعده، صورت‌های مفرد و *loro* از ریشهٔ *io* در زمان حال ساخته می‌شوند: *vado* ← *vada*، *faccio* ← *faccia*. صورت‌های *noi* و *voi* از ریشهٔ باقاعده: *andiamo, andiate*.'
        ]
      },
      endings: [{
        title: 'Desinenze regolari · شناسه‌های باقاعده',
        cols: ['-are', '-ere', '-ire'],
        rows: [['io', '-i', '-a', '-a'], ['tu', '-i', '-a', '-a'], ['lui', '-i', '-a', '-a'], ['noi', '-iamo', '-iamo', '-iamo'], ['voi', '-iate', '-iate', '-iate'], ['loro', '-ino', '-ano', '-ano']]
      }],
      regular: '*mangi*، *creda*، *dorma* (و جمع‌هایشان) از جدول پیروی می‌کنند. توجه: *mangi* با یک *i* نوشته می‌شود.',
      irregular: 'ریشهٔ بی‌قاعده از صورت *io* در زمان حال: *andare* ← *vada, vada, vada, andiamo, andiate, vadano*؛ *fare* ← *faccia, faccia, faccia, facciamo, facciate, facciano*.',
      verbs: {
        mangiare: { tables: [{ tense: 'congiuntivo', rows: six([
          ['che io mangi', '(که) من غذا بخورم'], ['che tu mangi', '(که) تو غذا بخوری'], ['che lui/lei mangi', '(که) او غذا بخورد'],
          ['che noi mangiamo', '(که) ما غذا بخوریم'], ['che voi mangiate', '(که) شما غذا بخورید'], ['che loro mangino', '(که) آنها غذا بخورند']]) }] },
        credere: { tables: [{ tense: 'congiuntivo', rows: six([
          ['che io creda', '(که) من باور کنم'], ['che tu creda', '(که) تو باور کنی'], ['che lui/lei creda', '(که) او باور کند'],
          ['che noi crediamo', '(که) ما باور کنیم'], ['che voi crediate', '(که) شما باور کنید'], ['che loro credano', '(که) آنها باور کنند']]) }] },
        dormire: { tables: [{ tense: 'congiuntivo', rows: six([
          ['che io dorma', '(که) من بخوابم'], ['che tu dorma', '(که) تو بخوابی'], ['che lui/lei dorma', '(که) او بخوابد'],
          ['che noi dormiamo', '(که) ما بخوابیم'], ['che voi dormiate', '(که) شما بخوابید'], ['che loro dormano', '(که) آنها بخوابند']]) }] },
        andare: { tables: [{ tense: 'congiuntivo', irr: ['io', 'tu', 'lui', 'loro'], rows: six([
          ['che io vada', '(که) من بروم'], ['che tu vada', '(که) تو بروی'], ['che lui/lei vada', '(که) او برود'],
          ['che noi andiamo', '(که) ما برویم'], ['che voi andiate', '(که) شما بروید'], ['che loro vadano', '(که) آنها بروند']]) }] },
        fare: { tables: [{ tense: 'congiuntivo', irr: SIX, rows: six([
          ['che io faccia', '(که) من انجام بدهم'], ['che tu faccia', '(که) تو انجام بدهی'], ['che lui/lei faccia', '(که) او انجام بدهد'],
          ['che noi facciamo', '(که) ما انجام بدهیم'], ['che voi facciate', '(که) شما انجام بدهید'], ['che loro facciano', '(که) آنها انجام بدهند']]) }] }
      },
      examples: [
        { verb: 'andare', it: 'Spero che tu vada a trovare la nonna.', fa: 'امیدوارم (که) به دیدن مادربزرگ بروی.' },
        { verb: 'mangiare', it: 'È importante che i bambini mangino la frutta.', fa: 'مهم است که بچه‌ها میوه بخورند.' },
        { verb: 'dormire', it: 'Penso che Marco dorma ancora.', fa: 'فکر می‌کنم مارکو هنوز خواب باشد.' },
        { verb: 'fare', it: 'Voglio che facciate attenzione.', fa: 'می‌خواهم (که) دقت کنید.' },
        { verb: 'credere', it: 'Non è necessario che tu ci creda.', fa: 'لازم نیست (که) باورش کنی.' }
      ],
      notes: [
        'اگر فاعل دو بخش جمله یکی باشد، به جای *che* + التزامی از مصدر استفاده می‌شود: *Spero di andare* = «امیدوارم بروم» (نه «spero che io vada»).',
        'بعد از *penso che* فارسی گاهی التزامی («خواب باشد») و گاهی اخباری («خواب است») می‌آورد؛ ایتالیایی معیار التزامی را لازم می‌داند.'
      ]
    },

    /* ------------------------------------------------------------------ 11 */
    {
      id: 'passivo-presente', num: 11, it: 'Passivo Presente', fa: 'مجهول حال',
      use: 'وقتی کار مهم‌تر از کننده است: «نان خورده می‌شود». فقط فعل‌های متعدی (دارای مفعول مستقیم) مجهول می‌شوند؛ مفعولِ جملهٔ معلوم فاعلِ جملهٔ مجهول می‌شود. کننده (اگر بیاید) با *da* («توسط») می‌آید.',
      formula: {
        parts: [{ text: 'soggetto', type: 'subject' }, { text: 'essere', note: 'presente', type: 'verb' }, { text: 'participio', note: 'concordato · مطابق با فاعل', type: 'extra' }, { text: '(da + agente)', note: 'اختیاری', type: 'object' }],
        example: 'La pizza è mangiata (da Marco). · Io sono invitato/a.',
        fa: 'فاعل + *essere* در زمان حال + اسم مفعولِ مطابق با فاعل (+ *da* + کننده)',
        steps: [
          'جملهٔ معلوم: *Marco mangia la pizza* ← مفعول (*la pizza*) فاعل می‌شود.',
          '*essere* را با فاعل جدید صرف کنید: *la pizza è*، *le mele sono*.',
          'اسم مفعول با فاعل مطابقت می‌کند (*-o / -a / -i / -e*): *mangiato, mangiata, mangiati, mangiate*.',
          'کننده با *da* می‌آید: *da Marco* = «توسط مارکو». فارسی معمولاً در این حالت جملهٔ معلوم را ترجیح می‌دهد: «مارکو پیتزا را می‌خورد».'
        ]
      },
      endings: [{
        title: 'essere + participio · مطابقت',
        cols: ['essere (presente)', 'participio'],
        rows: [['io', 'sono', '-o / -a'], ['tu', 'sei', '-o / -a'], ['lui', 'è', '-o / -a'], ['noi', 'siamo', '-i / -e'], ['voi', 'siete', '-i / -e'], ['loro', 'sono', '-i / -e']]
      }],
      regular: '*invitato*، *mangiato*، *creduto*: اسم مفعول باقاعده، فقط پایانه برای مطابقت تغییر می‌کند.',
      irregular: '*fatto/a/i/e* (اسم مفعول بی‌قاعدهٔ *fare*). *andare* و *dormire* لازم‌اند و اصلاً مجهول ندارند.',
      verbs: {
        invitare: { tables: [{ tense: 'passivo_presente', rows: six([
          ['sono invitato/a', 'من دعوت می‌شوم'], ['sei invitato/a', 'تو دعوت می‌شوی'], ['è invitato/a', 'او دعوت می‌شود'],
          ['siamo invitati/e', 'ما دعوت می‌شویم'], ['siete invitati/e', 'شما دعوت می‌شوید'], ['sono invitati/e', 'آنها دعوت می‌شوند']]) }],
          note: 'فعل *invitare* فقط برای این بخش اضافه شده تا مجهول را با همهٔ اشخاص نشان دهد؛ «من خورده می‌شوم» معنای طبیعی ندارد.' },
        mangiare: { tables: [{ tense: 'passivo_presente', rows: agr([
          ['il pane è mangiato', 'نان خورده می‌شود'], ['la pizza è mangiata', 'پیتزا خورده می‌شود'],
          ['i biscotti sono mangiati', 'بیسکویت‌ها خورده می‌شوند'], ['le mele sono mangiate', 'سیب‌ها خورده می‌شوند']]) }] },
        credere: { tables: [{ tense: 'passivo_presente', rows: agr([
          ['il racconto è creduto', 'آن ماجرا باور می‌شود'], ['la notizia è creduta', 'آن خبر باور می‌شود'],
          ['i testimoni sono creduti', 'حرف شاهدها باور می‌شود'], ['le promesse sono credute', 'قول‌ها باور می‌شوند']]) }],
          note: 'فارسی در این مورد جملهٔ معلوم را طبیعی‌تر می‌داند: *la notizia è creduta da tutti* = «همه این خبر را باور می‌کنند».' },
        fare: { tables: [{ tense: 'passivo_presente', irr: AGR, rows: agr([
          ['il lavoro è fatto', 'کار انجام می‌شود'], ['la torta è fatta in casa', 'کیک در خانه درست می‌شود'],
          ['i compiti sono fatti', 'تکالیف انجام می‌شوند'], ['le foto sono fatte', 'عکس‌ها گرفته می‌شوند']]) }],
          note: 'ترجمهٔ *fare* به مفعول بستگی دارد: کار ← «انجام شدن»، کیک ← «درست شدن»، عکس ← «گرفته شدن».' },
        andare: NO_PASSIVE.andare,
        dormire: NO_PASSIVE.dormire
      },
      examples: [
        { verb: 'mangiare', it: 'Il cibo è mangiato in fretta.', fa: 'غذا با عجله خورده می‌شود.' },
        { verb: 'mangiare', it: 'Questo piatto è mangiato in tutta Italia.', fa: 'این غذا در سراسر ایتالیا خورده می‌شود.' },
        { verb: 'invitare', it: 'Siamo invitati alla festa di Giulia.', fa: 'ما به مهمانی جولیا دعوت شده‌ایم.' },
        { verb: 'fare', it: 'Il lavoro è fatto con cura.', fa: 'کار با دقت انجام می‌شود.' },
        { verb: 'credere', it: 'Questa notizia non è creduta da nessuno.', fa: 'هیچ‌کس این خبر را باور نمی‌کند.' },
        { verb: 'aprire', it: 'La porta è aperta.', fa: 'در باز است. (صفت: حالت، نه مجهول)' },
        { verb: 'aprire', it: 'La porta è aperta dal portiere alle otto.', fa: 'در ساعت هشت توسط دربان باز می‌شود. (مجهول)' }
      ],
      notes: [
        'مجهول یا صفت؟ *La porta è aperta* معمولاً یعنی «در باز است» (حالت؛ *aperta* صفت است). اگر بتوان *da* + کننده اضافه کرد یا *essere* را با *venire* عوض کرد (*la porta viene aperta*)، جمله مجهول است: «در باز می‌شود».',
        'برای رفع ابهام، ایتالیایی در زمان‌های ساده اغلب از *venire* به جای *essere* استفاده می‌کند: *il pane viene mangiato* = «نان خورده می‌شود» (فقط عمل، نه حالت).',
        'جملهٔ *Siamo invitati* بسته به بافت هم «دعوت می‌شویم» ترجمه می‌شود و هم «دعوت شده‌ایم» (حالت).'
      ]
    },

    /* ------------------------------------------------------------------ 12 */
    {
      id: 'passivo-passato', num: 12, it: 'Passivo Passato', fa: 'مجهول گذشته',
      use: 'مجهولِ گذشته دو صورت اصلی دارد: *è stato mangiato* (مجهولِ *passato prossimo*: «خورده شد / خورده شده است») و *era stato mangiato* (مجهولِ *trapassato prossimo*: «خورده شده بود»، یعنی پیش از یک لحظهٔ دیگر در گذشته).',
      formula: {
        parts: [{ text: 'è / era', note: 'essere: presente / imperfetto', type: 'subject' }, { text: 'stato/a/i/e', note: 'participio di essere', type: 'verb' }, { text: 'participio', note: 'concordato', type: 'extra' }],
        example: 'la pizza è stata mangiata · la pizza era stata mangiata',
        fa: '*essere* (حال یا گذشتهٔ استمراری) + *stato* + اسم مفعول — هر دو اسم مفعول با فاعل مطابقت می‌کنند',
        steps: [
          '*è stato* + اسم مفعول ← کاری که در گذشته روی فاعل انجام شد: *il pane è stato mangiato* = «نان خورده شد».',
          '*era stato* + اسم مفعول ← کاری که پیش از لحظهٔ دیگری در گذشته انجام شده بود: *il pane era stato mangiato* = «نان خورده شده بود».',
          'هم *stato* و هم اسم مفعول مطابقت می‌کنند: *la pizza è stata mangiata*، *le mele sono state mangiate*.',
          'با *venire* نمی‌توان زمان مرکب ساخت («è venuto mangiato» غلط است)؛ در زمان‌های مرکب فقط *essere*.'
        ]
      },
      endings: [{
        title: 'essere + stato · مطابقت',
        cols: ['passato prossimo', 'trapassato'],
        rows: [['io', 'sono stato/a', 'ero stato/a'], ['tu', 'sei stato/a', 'eri stato/a'], ['lui', 'è stato/a', 'era stato/a'],
               ['noi', 'siamo stati/e', 'eravamo stati/e'], ['voi', 'siete stati/e', 'eravate stati/e'], ['loro', 'sono stati/e', 'erano stati/e']]
      }],
      regular: '*è stato invitato*، *è stato mangiato*، *è stato creduto*.',
      irregular: '*è stato fatto* (اسم مفعول بی‌قاعده). *andare* و *dormire* لازم‌اند و مجهول ندارند.',
      verbs: {
        invitare: { tables: [
          { title: 'è stato invitato · دعوت شد / دعوت شده است', tense: 'passivo_pp', rows: six([
            ['sono stato/a invitato/a', 'من دعوت شدم / دعوت شده‌ام'], ['sei stato/a invitato/a', 'تو دعوت شدی / دعوت شده‌ای'], ['è stato/a invitato/a', 'او دعوت شد / دعوت شده است'],
            ['siamo stati/e invitati/e', 'ما دعوت شدیم / دعوت شده‌ایم'], ['siete stati/e invitati/e', 'شما دعوت شدید / دعوت شده‌اید'], ['sono stati/e invitati/e', 'آنها دعوت شدند / دعوت شده‌اند']]) },
          { title: 'era stato invitato · دعوت شده بود', tense: 'passivo_trap', rows: six([
            ['ero stato/a invitato/a', 'من دعوت شده بودم'], ['eri stato/a invitato/a', 'تو دعوت شده بودی'], ['era stato/a invitato/a', 'او دعوت شده بود'],
            ['eravamo stati/e invitati/e', 'ما دعوت شده بودیم'], ['eravate stati/e invitati/e', 'شما دعوت شده بودید'], ['erano stati/e invitati/e', 'آنها دعوت شده بودند']]) }] },
        mangiare: { tables: [
          { title: 'è stato mangiato · خورده شد', tense: 'passivo_pp', rows: agr([
            ['il pane è stato mangiato', 'نان خورده شد'], ['la pizza è stata mangiata', 'پیتزا خورده شد'],
            ['i biscotti sono stati mangiati', 'بیسکویت‌ها خورده شدند'], ['le mele sono state mangiate', 'سیب‌ها خورده شدند']]) },
          { title: 'era stato mangiato · خورده شده بود', tense: 'passivo_trap', rows: agr([
            ['il pane era stato mangiato', 'نان خورده شده بود'], ['la pizza era stata mangiata', 'پیتزا خورده شده بود'],
            ['i biscotti erano stati mangiati', 'بیسکویت‌ها خورده شده بودند'], ['le mele erano state mangiate', 'سیب‌ها خورده شده بودند']]) }] },
        credere: { tables: [
          { title: 'è stato creduto · باور شد', tense: 'passivo_pp', rows: agr([
            ['il racconto è stato creduto', 'آن ماجرا باور شد'], ['la notizia è stata creduta', 'آن خبر باور شد'],
            ['i testimoni sono stati creduti', 'حرف شاهدها باور شد'], ['le promesse sono state credute', 'قول‌ها باور شدند']]) },
          { title: 'era stato creduto · باور شده بود', tense: 'passivo_trap', rows: agr([
            ['il racconto era stato creduto', 'آن ماجرا باور شده بود'], ['la notizia era stata creduta', 'آن خبر باور شده بود'],
            ['i testimoni erano stati creduti', 'حرف شاهدها باور شده بود'], ['le promesse erano state credute', 'قول‌ها باور شده بودند']]) }] },
        fare: { tables: [
          { title: 'è stato fatto · انجام شد', tense: 'passivo_pp', irr: AGR, rows: agr([
            ['il lavoro è stato fatto', 'کار انجام شد'], ['la torta è stata fatta in casa', 'کیک در خانه درست شد'],
            ['i compiti sono stati fatti', 'تکالیف انجام شدند'], ['le foto sono state fatte', 'عکس‌ها گرفته شدند']]) },
          { title: 'era stato fatto · انجام شده بود', tense: 'passivo_trap', irr: AGR, rows: agr([
            ['il lavoro era stato fatto', 'کار انجام شده بود'], ['la torta era stata fatta in casa', 'کیک در خانه درست شده بود'],
            ['i compiti erano stati fatti', 'تکالیف انجام شده بودند'], ['le foto erano state fatte', 'عکس‌ها گرفته شده بودند']]) }] },
        andare: NO_PASSIVE.andare,
        dormire: NO_PASSIVE.dormire
      },
      examples: [
        { verb: 'mangiare', it: 'La torta è stata mangiata in cinque minuti.', fa: 'کیک در پنج دقیقه خورده شد.' },
        { verb: 'mangiare', it: 'Quando siamo arrivati, la torta era già stata mangiata.', fa: 'وقتی رسیدیم، کیک خورده شده بود.' },
        { verb: 'invitare', it: 'Sono stata invitata da Giulia.', fa: 'جولیا مرا دعوت کرد. (از طرف جولیا دعوت شدم.)' },
        { verb: 'fare', it: 'Il lavoro è stato fatto bene.', fa: 'کار خوب انجام شد.' },
        { verb: 'credere', it: 'La sua storia non era stata creduta da nessuno.', fa: 'هیچ‌کس داستانش را باور نکرده بود.' }
      ],
      notes: [
        '*è stato mangiato* ← «خورده شد» یا «خورده شده است» (کار تمام شده). *era stato mangiato* ← «خورده شده بود» (پیش از لحظهٔ دیگری در گذشته؛ اغلب با *già* یا جمله‌ای با *quando*).',
        'برای عادت یا پس‌زمینه در گذشته از *imperfetto* استفاده می‌شود: *il pane veniva mangiato ogni sera* = «نان هر شب خورده می‌شد».'
      ]
    }
  ];

  window.VERBS_SUMMARY = { persons: PERSONS, verbs: VERBS, forms: FORMS, core: ['mangiare', 'credere', 'dormire', 'andare', 'fare'] };
})();
