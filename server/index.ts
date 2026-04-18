import 'dotenv/config';
import { createHash } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { diagnosticData } from '../src/data/diagnostics';

type Lang = 'en' | 'ar';

type ApiDiagnosis = {
  title: string;
  cause: string;
  solution: string;
  followUp?: {
    question: string;
    options: { id: string; label: string }[];
  };
  context?: {
    symptomId: string;
  };
};

type DiagnoseResponse =
  | { match: true; diagnosis: ApiDiagnosis }
  | { match: false; message: string };

type FollowUpResponse = { diagnosis: Omit<ApiDiagnosis, 'followUp' | 'context'> };

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiModelsResponse = {
  models?: Array<{ name?: string }>;
};

type GeminiDiagnosisResult =
  | { diagnosis: ApiDiagnosis; errorStatus?: undefined }
  | { diagnosis: null; errorStatus?: number };

type GeminiTextResult =
  | { text: string; errorStatus?: undefined }
  | { text: null; errorStatus?: number };

type ApiHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

const GEMINI_CACHE_TTL_MS = 10 * 60 * 1000;
const GEMINI_CACHE_MAX_ENTRIES = 200;
const geminiCache = new Map<string, { expiresAt: number; value: unknown }>();

function nowMs(): number {
  return Date.now();
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function cacheGet<T>(key: string): T | null {
  const entry = geminiCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    geminiCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs = GEMINI_CACHE_TTL_MS): void {
  if (geminiCache.size >= GEMINI_CACHE_MAX_ENTRIES) {
    geminiCache.clear();
  }
  geminiCache.set(key, { expiresAt: nowMs() + ttlMs, value });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  opts: { maxRetries: number; baseDelayMs: number; retryStatuses: number[] },
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= opts.maxRetries) {
    try {
      const res = await fetch(url, init);
      if (!opts.retryStatuses.includes(res.status) || attempt === opts.maxRetries) {
        return res;
      }

      // Exponential backoff with a small jitter.
      const jitter = Math.floor(Math.random() * 120);
      const delay = opts.baseDelayMs * 2 ** attempt + jitter;
      await sleep(delay);
      attempt++;
      continue;
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxRetries) break;
      const jitter = Math.floor(Math.random() * 120);
      const delay = opts.baseDelayMs * 2 ** attempt + jitter;
      await sleep(delay);
      attempt++;
    }
  }

  throw lastError ?? new Error('fetch failed');
}

function looksAutomotive(text: string): boolean {
  const t = text.toLowerCase();
  // Broad heuristic so non-keyword phrasing still routes to automotive mode.
  const keywords = [
    // English
    'car',
    'vehicle',
    'engine',
    'motor',
    'transmission',
    'gear',
    'brake',
    'abs',
    'battery',
    'starter',
    'alternator',
    'coolant',
    'radiator',
    'overheat',
    'smoke',
    'misfire',
    'obd',
    'check engine',
    'oil leak',
    'fuel',
    // Arabic (common terms)
    'سيارة',
    'عربية',
    'مركبة',
    'محرك',
    'موتور',
    'قير',
    'ناقل',
    'فرامل',
    'بطارية',
    'سلف',
    'دينامو',
    'ردياتير',
    'رديتر',
    'تبريد',
    'حرارة',
    'دخان',
    'لمبة',
    'طبلون',
    'حساس',
    'زيت',
    'بنزين',
  ];

  return keywords.some((k) => t.includes(k.toLowerCase()));
}

function normalizeLang(value: unknown): Lang {
  return value === 'ar' ? 'ar' : 'en';
}

function findSymptom(text: string) {
  const lowerText = text.toLowerCase();
  return (
    diagnosticData.find(
      (symptom) =>
        symptom.keywords.some((keyword) => lowerText.includes(keyword)) ||
        symptom.keywordsAr.some((keyword) => lowerText.includes(keyword)),
    ) ?? null
  );
}

function buildDiagnosis(symptomId: string, lang: Lang): ApiDiagnosis | null {
  const symptom = diagnosticData.find((s) => s.id === symptomId);
  if (!symptom) return null;

  return {
    title: symptom.diagnosis[lang],
    cause: symptom.cause[lang],
    solution: symptom.solution[lang],
    followUp: symptom.followUp
      ? {
          question: symptom.followUp.question[lang],
          options: symptom.followUp.options.map((o) => ({
            id: o.id,
            label: o.label[lang],
          })),
        }
      : undefined,
    context: { symptomId: symptom.id },
  };
}

function buildProfessionalDiagnosis(symptomId: string, lang: Lang): ApiDiagnosis | null {
  const base = buildDiagnosis(symptomId, lang);
  if (!base) return null;

  const perSymptom = (() => {
    if (lang === 'ar') {
      switch (symptomId) {
        case 'overheating':
          return {
            likelyCauses: [
              'نقص سائل التبريد بسبب تهريب (خرطوش/رديتر/طرمبة/غطاء رديتر).',
              'تعطل مراوح التبريد أو الريليه/الفيوز أو حساس الحرارة.',
              'ثرموستات عالق (مغلق) أو انسداد في الرديتر/الدورة.',
              'طرمبة ماء ضعيفة أو سير/شداد به مشكلة.',
              'احتمال أضعف لكن مهم: تهريب داخلي (وجه رأس) إذا يوجد نقص ماء مستمر + فقاعات/لبنيّة بالزيت/دخان أبيض كثيف.',
            ].join('\n'),
            distinguishing: [
              'تمييز سريع:',
              '- ترتفع الحرارة في الزحمة وتتحسن على الخط → غالبًا مراوح/تبريد هواء.',
              '- ترتفع بسرعة بعد التشغيل وخرطوش علوي بارد → اشتباه ثرموستات.',
              '- نقص ماء أسبوعيًا → اشتباه تهريب خارجي (أو داخلي إذا لا يظهر أثر).',
            ].join('\n'),
            extraSteps: [
              'خطوات فحص عملية بالترتيب:',
              '1) اترك السيارة تبرد تمامًا ثم افحص مستوى سائل التبريد (لا تفتح الغطاء وهي حارة).',
              '2) افحص آثار تهريب: حول الرديتر، غطاء الرديتر، الخراطيم، القربة، وأسفل الطرمبة.',
              '3) شغّل المكيف وراقب مراوح التبريد: هل تعمل بسرعة/ثبات؟ (إن لم تعمل افحص الفيوز/الريليه).',
              '4) افحص حرارة خراطيم الرديتر بعد التشغيل: فرق كبير جدًا قد يعني انسداد أو ثرموستات.',
              '5) لو متاح OBD: راقب حرارة الماء الفعلية (ECT) بدل الاعتماد على العداد فقط.',
              '6) إذا في نقص مستمر بدون تهريب واضح: اطلب اختبار ضغط للدورة + اختبار غازات عادم في القربة.',
            ].join('\n'),
          };
        case 'not-starting':
          return {
            likelyCauses: [
              'بطارية ضعيفة/شحن منخفض أو أقطاب (أصابع) مرتخية/متأكسدة.',
              'سلف (Starter) أو ريليه/سويتش تشغيل به خلل.',
              'نظام منع التشغيل (Immobilizer) أو حساس وضع القير (PN) يمنع التشغيل.',
            ].join('\n'),
            distinguishing: [
              'تمييز سريع:',
              '- “تكتكة” متكررة → غالبًا بطارية ضعيفة أو أطراف مرتخية.',
              '- لا يوجد أي صوت + كهرباء ضعيفة → بطارية/فيوز رئيسي/أرضي.',
              '- الكهرباء تمام لكن لا يدور السلف → سلف/ريليه/سويتش.',
            ].join('\n'),
            extraSteps: [
              'خطوات فحص عملية:',
              '1) قِس جهد البطارية: 12.4V+ جيد، أقل من 12.0V ضعيف (تقريبي).',
              '2) افحص التوصيلات والأرضي، ونظّف الأقطاب.',
              '3) جرّب اشتراك/شحن: إذا اشتغلت → البطارية/الشحن.',
              '4) افحص فيوزات التشغيل وريليه السلف.',
            ].join('\n'),
          };
        case 'smoke':
          return {
            likelyCauses: [
              'دخان أزرق → حرق زيت (شنابر/جلد بلوف/تهوية كرتير PCV).',
              'دخان أبيض كثيف “لبني” مستمر → ماء داخل السلندرات (وجه رأس/مبرد EGR إن وجد).',
              'دخان أسود → خلطه غنية/وقود زائد (فلتر هواء، حساس MAF، بخاخات، ضغط بنزين).',
            ].join('\n'),
            distinguishing: [
              'تمييز سريع:',
              '- هل الدخان عند الدعس فقط أم على السلانسيه؟',
              '- هل ينقص الزيت أو الماء؟',
              '- هل توجد رائحة بنزين/زيت محترق؟',
            ].join('\n'),
            extraSteps: [
              'خطوات فحص عملية:',
              '1) حدّد اللون بدقة وصوّر فيديو في ضوء النهار.',
              '2) افحص مستوى الزيت/الماء قبل وبعد يومين.',
              '3) اقرأ أكواد OBD (Misfire/MAF/O2).',
              '4) لو أبيض كثيف + نقص ماء → لا تواصل قيادة؛ اطلب فحص ضغط/CO2 للدورة.',
            ].join('\n'),
          };
        case 'brakes':
          return {
            likelyCauses: [
              'فحمات منتهية أو تآكل غير منتظم.',
              'هوبات (ديسكات) معوجّة أو مخدوشة.',
              'نقص زيت فرامل أو وجود هواء في النظام.',
            ].join('\n'),
            distinguishing: [
              'تمييز سريع:',
              '- صوت احتكاك معدني قوي → غالبًا الفحمات انتهت (خطر).',
              '- رعشة مع الفرملة → غالبًا هوبات معوجّة.',
              '- دواسة إسفنجية/تنزل → احتمال هواء/تسريب زيت فرامل (خطر).',
            ].join('\n'),
            extraSteps: [
              'خطوات فحص عملية:',
              '1) افحص مستوى زيت الفرامل فورًا.',
              '2) افحص سماكة الفحمات من خلال الجنط (إن أمكن).',
              '3) لا تؤجل إذا في صوت معدن أو ضعف فرملة—سلامة أولاً.',
            ].join('\n'),
          };
        default:
          return null;
      }
    }

    // English
    switch (symptomId) {
      case 'overheating':
        return {
          likelyCauses: [
            'Low coolant due to an external leak (hose/radiator/water pump/radiator cap).',
            'Cooling fan not engaging (fuse/relay/fan motor/ECT sensor).',
            'Stuck thermostat or restricted radiator/coolant flow.',
            'Weak water pump or belt/tensioner issue.',
            'Less common but important: internal leak/head gasket if persistent coolant loss + bubbles/milky oil/white smoke.',
          ].join('\n'),
          distinguishing: [
            'Quick differentiators:',
            '- Worse in traffic, better at speed → fan/airflow related.',
            '- Heats quickly, upper hose stays cool → thermostat suspicion.',
            '- Coolant drops weekly → likely a leak (external or internal).',
          ].join('\n'),
          extraSteps: [
            'Practical checks (in order):',
            '1) Let it fully cool, then check coolant level (never open hot).',
            '2) Inspect for leaks around radiator/cap/hoses/overflow tank/water pump.',
            '3) Turn on A/C and confirm the fans run consistently; check fuses/relays if not.',
            '4) Feel radiator hoses as it warms up: large delta can indicate restriction/thermostat.',
            '5) If you have OBD, read actual coolant temp (ECT).',
            '6) If coolant loss persists with no visible leak: cooling pressure test + combustion gas test.',
          ].join('\n'),
        };
      case 'not-starting':
        return {
          likelyCauses: [
            'Weak battery/low charge or loose/corroded terminals.',
            'Starter motor / relay / ignition switch issue.',
            'Immobilizer or gear-position interlock preventing crank.',
          ].join('\n'),
          distinguishing: [
            'Quick differentiators:',
            '- Repeated clicking → battery/terminal issue.',
            '- No sound + weak electrics → battery/main fuse/ground.',
            '- Strong electrics but no crank → starter/relay/switch.',
          ].join('\n'),
          extraSteps: [
            'Practical checks:',
            '1) Measure battery voltage; charge/jump-start as needed.',
            '2) Clean/tighten terminals and ground strap.',
            '3) Check starter relay and related fuses.',
          ].join('\n'),
        };
      case 'smoke':
        return {
          likelyCauses: [
            'Blue smoke → burning oil (rings/valve seals/PCV).',
            'Thick white smoke → coolant in cylinders (head gasket).',
            'Black smoke → rich mixture/excess fuel (MAF/injectors/air filter/fuel pressure).',
          ].join('\n'),
          distinguishing: [
            'Quick differentiators:',
            '- When does it happen (idle/accel/decel)?',
            '- Is oil or coolant level dropping?',
            '- Any fuel/oil smell? Any warning lights?',
          ].join('\n'),
          extraSteps: [
            'Practical checks:',
            '1) Confirm the smoke color in daylight; record a short video.',
            '2) Track oil/coolant levels over 48 hours.',
            '3) Scan OBD codes (misfire/MAF/O2).',
            '4) If white smoke + coolant loss: avoid driving; get a pressure/combustion-gas test.',
          ].join('\n'),
        };
      case 'brakes':
        return {
          likelyCauses: [
            'Brake pads worn or uneven wear.',
            'Warped/scored rotors.',
            'Low brake fluid or air in the system.',
          ].join('\n'),
          distinguishing: [
            'Quick differentiators:',
            '- Metal-on-metal grinding → pads likely gone (unsafe).',
            '- Pulsation under braking → rotors.',
            '- Spongy/low pedal → air/leak (unsafe).',
          ].join('\n'),
          extraSteps: [
            'Practical checks:',
            '1) Check brake fluid level now.',
            '2) Inspect pad thickness if possible.',
            '3) Don’t delay if braking feels unsafe.',
          ].join('\n'),
        };
      default:
        return null;
    }
  })();

  const safetyNote =
    lang === 'ar'
      ? 'تنبيه سلامة: إذا ظهرت لمبة حرارة/زيت أو سمعْت طرق قوي أو لاحظت دخان كثيف، أوقف القيادة فورًا وتحقق بأمان.'
      : 'Safety note: If you see oil/temp warning, heavy knocking, or thick smoke, stop driving and check safely.';

  const genericChecks =
    lang === 'ar'
      ? [
          'فحص سريع (10 دقائق):',
          '1) صوّر الأعراض: متى تحدث؟ بارد/حار؟ سرعة/زحمة؟',
          '2) راقب لمبات الطبلون وسجّل أي أكواد إن وجدت (OBD).',
          '3) افحص السوائل (زيت/ماء/فرامل) من حيث المستوى واللون والرائحة.',
          '4) افحص تسريب واضح أسفل السيارة بعد الوقوف.',
          '5) جرّب نفس العرض مع/بدون تكييف، ومع/بدون فرامل، ومع تغيير السرعات.',
        ].join('\n')
      : [
          'Quick checks (10 minutes):',
          '1) Capture the symptom: when does it happen? cold/hot? speed/idle?',
          '2) Note any dashboard lights and pull OBD codes if available.',
          '3) Check fluids (oil/coolant/brake) level, color, smell.',
          '4) Look for visible leaks after parking.',
          '5) Reproduce with/without A/C, braking, and different speeds/gears.',
        ].join('\n');

  const whatToTellMechanic =
    lang === 'ar'
      ? [
          'ماذا تقول للميكانيكي (مختصر مفيد):',
          `- العَرَض: ${base.title}`,
          `- الظروف: (بارد/حار، سرعة/زحمة، بدأ منذ متى).`,
          `- ملاحظات: أصوات/روائح/دخان/لمبات، وهل تم تغيير قطع مؤخرًا.`,
        ].join('\n')
      : [
          'What to tell a mechanic:',
          `- Symptom: ${base.title}`,
          '- Conditions: cold/hot, idle/speed, since when.',
          '- Notes: noises/smells/smoke/lights and any recent repairs.',
        ].join('\n');

  const expandedCause =
    (base.cause?.trim() ? `${base.cause}\n\n` : '') +
    (lang === 'ar'
      ? `الأسباب الأكثر احتمالًا (مرتّبة):\n${perSymptom?.likelyCauses ?? '1) سبب مرتبط مباشرة بالعرض.\n2) سبب كهربائي/حساسات أو توصيلات.\n3) سبب ميكانيكي/تآكل تدريجي.'}\n\n` +
        `${perSymptom?.distinguishing ?? 'تمييز سريع:\n- إذا يظهر العَرَض فقط على البارد → اشتباه حساس/خلل خلطة/بطارية.\n- إذا يزيد مع السرعة/الحمل → اشتباه توازن/تعليق/تغذية وقود/تبريد.\n- إذا يظهر مع رائحة/دخان → اشتباه تسريب أو احتراق غير طبيعي.'}`
      : `Most likely causes (ranked):\n${perSymptom?.likelyCauses ?? '1) A cause directly tied to the symptom.\n2) Electrical/sensor or wiring issue.\n3) Mechanical wear.'}\n\n` +
        `${perSymptom?.distinguishing ?? 'Quick differentiators:\n- Only cold-start → mixture/sensor/battery-related.\n- Worse under load/speed → balance/suspension/fuel/cooling related.\n- With smell/smoke → leak or abnormal combustion.'}`);

  let expandedSolution =
    (base.solution?.trim() ? `${base.solution.trim()}\n\n` : '') +
    `${safetyNote}\n\n` +
    (perSymptom?.extraSteps ? `${perSymptom.extraSteps}\n\n` : '') +
    `${genericChecks}\n\n${whatToTellMechanic}`;

  if (base.context?.symptomId === 'overheating') {
    expandedSolution =
      (lang === 'ar'
        ? 'مهم جدًا: لا تفتح غطاء الرديتر والسيارة حارة. انتظر حتى تبرد تمامًا.\n'
        : 'Important: never open the radiator cap when hot. Let it cool fully.\n') +
      '\n' +
      expandedSolution;
  }

  return {
    ...base,
    cause: expandedCause,
    solution: expandedSolution,
  };
}

function buildClarifyingDiagnosis(lang: Lang): ApiDiagnosis {
  return {
    title: lang === 'ar' ? 'أحتاج تفاصيل إضافية لتشخيص أدق' : 'Need a bit more detail for an accurate diagnosis',
    cause:
      lang === 'ar'
        ? 'الأعراض الحالية غير كافية لتحديد سبب واحد بثقة. غالبًا توجد عدة احتمالات، والتمييز بينها يعتمد على: توقيت العَرَض، الصوت/الرائحة، وجود لمبات، وبيانات OBD إن توفرت.'
        : 'The current description isn’t enough to pick one cause confidently. Several causes can look similar; the differentiator is timing, noise/smell, warning lights, and OBD data (if available).',
    solution:
      lang === 'ar'
        ? 'جاوب على سؤال المتابعة واختر أقرب خيار، أو اكتب: متى يحدث العَرَض (بارد/حار)، وهل يزيد مع السرعة/الفرامل/المكيف، وهل توجد لمبات على الطبلون.'
        : 'Answer the follow-up question (pick the closest option), or describe: cold/hot, worse with speed/braking/A-C, and any dashboard lights.',
    followUp: {
      question:
        lang === 'ar'
          ? 'متى يظهر العَرَض غالبًا؟'
          : 'When does the symptom happen most?',
      options: [
        {
          id: 'cold-start',
          label: lang === 'ar' ? 'عند التشغيل والسيارة باردة' : 'On cold start',
        },
        {
          id: 'idle',
          label: lang === 'ar' ? 'على السلانسيه/وقوف' : 'At idle / stopped',
        },
        {
          id: 'under-load',
          label: lang === 'ar' ? 'مع الدعس/التحميل/طلوع' : 'Under load / acceleration / uphill',
        },
        {
          id: 'high-speed',
          label: lang === 'ar' ? 'على سرعة عالية' : 'At higher speed',
        },
      ],
    },
  };
}

function buildFollowUp(symptomId: string, optionId: string, lang: Lang) {
  const symptom = diagnosticData.find((s) => s.id === symptomId);
  if (!symptom?.followUp) return null;

  const option = symptom.followUp.options.find((o) => o.id === optionId);
  if (!option) return null;

  return {
    title: option.diagnosis[lang],
    cause: option.cause[lang],
    solution: option.solution[lang],
  };
}

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

function getGeminiModelOverride(): string | null {
  const model = process.env.GEMINI_MODEL;
  return typeof model === 'string' && model.trim() ? model.trim() : null;
}

function normalizeModelName(model: string): string {
  const trimmed = model.trim();
  return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
}

function encodeModelPath(model: string): string {
  // Keep path separators, encode each segment to avoid turning '/' into '%2F'
  return model
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return null;
}

function isValidDiagnosis(value: unknown): value is ApiDiagnosis {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== 'string' || typeof v.cause !== 'string' || typeof v.solution !== 'string') return false;
  if (v.followUp != null) {
    if (typeof v.followUp !== 'object') return false;
    const f = v.followUp as Record<string, unknown>;
    if (typeof f.question !== 'string' || !Array.isArray(f.options)) return false;
  }
  return true;
}

async function diagnoseWithGemini(text: string, lang: Lang, history?: ApiHistoryItem[]): Promise<GeminiDiagnosisResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { diagnosis: null };

  const modelOverride = getGeminiModelOverride();
  const modelsToTry = [
    modelOverride,
    // Prefer model names that exist in /v1beta/models (full resource names)
    'models/gemini-2.5-flash',
    'models/gemini-flash-latest',
    'models/gemini-2.0-flash',
    'models/gemini-2.0-flash-lite',
    'models/gemini-pro-latest',
    'models/gemini-2.5-pro',
  ]
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .map(normalizeModelName);

  const systemStyle =
    lang === 'ar'
      ? 'اكتب بالعربية (فصحى/مصرية حسب المستخدم) وبأسلوب مساعد ذكاء اصطناعي احترافي، وخلّي الردود مفصّلة وواضحة.'
      : 'Write in natural English with a professional AI assistant tone; be detailed and clear.';

  const historyBlock = Array.isArray(history) && history.length
    ? `\nConversation history (most recent last):\n` +
      history
        .slice(-10)
        .map((h) => `${h.role.toUpperCase()}: ${String(h.content ?? '').trim()}`)
        .filter((line) => line.length > 0)
        .join('\n')
    : '';

  const prompt =
    `${systemStyle}\n` +
    `You are an automotive diagnostic assistant. Given the user's symptoms, return ONLY valid JSON with this shape:\n` +
    `{"title":string,"cause":string,"solution":string,"followUp":{` +
    `"question":string,"options":[{"id":string,"label":string}]}}\n` +
    `Rules (IMPORTANT):\n` +
    `- Output MUST be pure JSON, no markdown, no code fences, no extra keys.\n` +
    `- Make responses professional and practical (not generic).\n` +
    `- The fields cause/solution should be detailed (multi-sentence) and may include line breaks.\n` +
    `- In cause: list the top 3 likely causes and how to distinguish them (symptoms/tests).\n` +
    `- In solution: give step-by-step checks in priority order, include safety warnings (e.g., stop driving) when relevant, and what to tell a mechanic.\n` +
    `- If you need more info, include followUp with 2-4 choices phrased like real questions; otherwise omit followUp.\n` +
    `User symptoms/context: ${text}` +
    historyBlock;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
      maxOutputTokens: 900,
    },
  };

  let lastErrorStatus: number | undefined;

  const cacheKey = `diag:${lang}:${hashText(prompt)}`;
  const cachedDiagnosis = cacheGet<ApiDiagnosis>(cacheKey);
  if (cachedDiagnosis) return { diagnosis: cachedDiagnosis };

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${encodeModelPath(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchWithBackoff(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        { maxRetries: 2, baseDelayMs: 400, retryStatuses: [429, 503] },
      );

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[gemini] ${model} non-OK: HTTP ${res.status}`);
        lastErrorStatus = res.status;
        // If the model is wrong/unavailable OR temporarily rate-limited/unavailable, try next.
        if (res.status === 404 || res.status === 429 || res.status === 503) continue;
        return { diagnosis: null, errorStatus: res.status };
      }

      const json = (await res.json()) as GeminiGenerateResponse;
      const outputText = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!outputText.trim()) return { diagnosis: null, errorStatus: 502 };

      const jsonText = extractFirstJsonObject(outputText) ?? outputText;
      const parsed = JSON.parse(jsonText) as unknown;
      if (!isValidDiagnosis(parsed)) return { diagnosis: null, errorStatus: 502 };
      cacheSet(cacheKey, parsed);
      return { diagnosis: parsed };
    } catch {
      // Network/JSON parse/etc. Keep server alive and fall back gracefully.
      lastErrorStatus = lastErrorStatus ?? 502;
      continue;
    }
  }

  return { diagnosis: null, errorStatus: lastErrorStatus };
}

async function answerWithGemini(text: string, lang: Lang, history?: ApiHistoryItem[]): Promise<GeminiTextResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { text: null };

  const modelOverride = getGeminiModelOverride();
  const modelsToTry = [
    modelOverride,
    'models/gemini-2.5-flash',
    'models/gemini-flash-latest',
    'models/gemini-2.0-flash',
    'models/gemini-2.0-flash-lite',
    'models/gemini-pro-latest',
    'models/gemini-2.5-pro',
  ]
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    .map(normalizeModelName);

  const systemStyle =
    lang === 'ar'
      ? 'اكتب بالعربية. اجب بشكل واضح ومباشر. لو السؤال غامض اسأل سؤال أو سؤالين توضيحيين فقط.'
      : 'Write in natural English. Answer clearly and directly. If the question is ambiguous, ask 1-2 clarifying questions only.';

  const historyBlock = Array.isArray(history) && history.length
    ? `\nConversation history (most recent last):\n` +
      history
        .slice(-10)
        .map((h) => `${h.role.toUpperCase()}: ${String(h.content ?? '').trim()}`)
        .filter((line) => line.length > 0)
        .join('\n')
    : '';

  const prompt =
    `${systemStyle}\n` +
    `You are a general-purpose helpful assistant. Answer the user's question with practical, accurate guidance. ` +
    `If it involves safety (medical/legal/automotive), include a brief safety note and suggest a professional when appropriate.\n` +
    `User question: ${text}` +
    historyBlock;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 700,
    },
  };

  let lastErrorStatus: number | undefined;

  const cacheKey = `text:${lang}:${hashText(prompt)}`;
  const cachedText = cacheGet<string>(cacheKey);
  if (cachedText) return { text: cachedText };

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${encodeModelPath(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchWithBackoff(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        { maxRetries: 2, baseDelayMs: 400, retryStatuses: [429, 503] },
      );

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[gemini] ${model} non-OK: HTTP ${res.status}`);
        lastErrorStatus = res.status;
        if (res.status === 404 || res.status === 429 || res.status === 503) continue;
        return { text: null, errorStatus: res.status };
      }

      const json = (await res.json()) as GeminiGenerateResponse;
      const outputText = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!outputText.trim()) return { text: null, errorStatus: 502 };
      const finalText = outputText.trim();
      cacheSet(cacheKey, finalText);
      return { text: finalText };
    } catch {
      lastErrorStatus = lastErrorStatus ?? 502;
      continue;
    }
  }

  return { text: null, errorStatus: lastErrorStatus };
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// eslint-disable-next-line no-console
console.log(`[car-diagnosis-api] geminiEnabled=${Boolean(getGeminiApiKey())}`);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'car-diagnosis-api' });
});

app.get('/api/gemini/models', async (_req, res) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    res.status(400).json({ message: 'GEMINI_API_KEY is not set.' });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      res.status(502).json({ message: `Gemini models request failed (HTTP ${r.status}).` });
      return;
    }
    const data = (await r.json()) as GeminiModelsResponse;
    const models = (data.models ?? [])
      .map((m) => m.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);

    res.json({ models });
  } catch {
    res.status(502).json({ message: 'Gemini models request failed.' });
  }
});

app.post('/api/diagnose', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const lang = normalizeLang(req.body?.lang);
  const history = Array.isArray(req.body?.history) ? (req.body.history as ApiHistoryItem[]) : undefined;

  if (!text.trim()) {
    const response: DiagnoseResponse = {
      match: false,
      message: lang === 'ar' ? 'الرجاء إرسال نص الأعراض في الحقل text.' : 'Please send symptoms text in the text field.',
    };
    res.status(400).json(response);
    return;
  }

  void (async () => {
    try {
      const hasGemini = Boolean(getGeminiApiKey());
      if (hasGemini) {
        const automotive = looksAutomotive(text) || Boolean(findSymptom(text));

        if (!automotive) {
          const aiAnswer = await answerWithGemini(text, lang, history);
          if (aiAnswer.text) {
            res.json({ match: false, message: aiAnswer.text } satisfies DiagnoseResponse);
            return;
          }

          if (aiAnswer.errorStatus) {
            // If Gemini is temporarily unavailable, fall back to a helpful automotive-style clarifying flow.
            if (aiAnswer.errorStatus === 429 || aiAnswer.errorStatus === 503 || aiAnswer.errorStatus === 502) {
              res.json({ match: true, diagnosis: buildClarifyingDiagnosis(lang) } satisfies DiagnoseResponse);
              return;
            }

            const message =
              lang === 'ar'
                ? `تعذر الاتصال بـ Gemini (HTTP ${aiAnswer.errorStatus}). تأكد من صلاحية المفتاح وتفعيل Gemini API.`
                : `Gemini request failed (HTTP ${aiAnswer.errorStatus}). Check API key and that Gemini API is enabled.`;

            res.json({ match: false, message } satisfies DiagnoseResponse);
            return;
          }

          res.json({
            match: false,
            message:
              lang === 'ar'
                ? 'لم أستطع توليد رد عام من Gemini. جرّب إعادة المحاولة.'
                : 'Could not generate a general answer from Gemini. Please try again.',
          } satisfies DiagnoseResponse);
          return;
        }

        const aiResult = await diagnoseWithGemini(text, lang, history);
        if (aiResult.diagnosis) {
          res.json({ match: true, diagnosis: aiResult.diagnosis } satisfies DiagnoseResponse);
          return;
        }

        // If Gemini is temporarily unavailable (rate-limit / service), fall back to a professional expert-system response.
        if (aiResult.errorStatus === 429 || aiResult.errorStatus === 503 || aiResult.errorStatus === 502) {
          const symptom = findSymptom(text);
          if (symptom) {
            const diagnosis = buildProfessionalDiagnosis(symptom.id, lang);
            if (diagnosis) {
              res.json({ match: true, diagnosis } satisfies DiagnoseResponse);
              return;
            }
          }

          res.json({ match: true, diagnosis: buildClarifyingDiagnosis(lang) } satisfies DiagnoseResponse);
          return;
        }

        if (aiResult.errorStatus) {
          const message =
            lang === 'ar'
              ? aiResult.errorStatus === 429
                ? 'خدمة Gemini وصلت للحد (429). جرّب بعد شوية أو ارفع/عدّل حد الاستهلاك للمفتاح.'
                : `تعذر الاتصال بـ Gemini (HTTP ${aiResult.errorStatus}). تأكد من صلاحية المفتاح وتفعيل Gemini API.`
              : aiResult.errorStatus === 429
                ? 'Gemini is rate-limited (429). Try again later or adjust your API key quota/billing.'
                : `Gemini request failed (HTTP ${aiResult.errorStatus}). Check API key and that Gemini API is enabled.`;

          res.json({ match: false, message } satisfies DiagnoseResponse);
          return;
        }

        res.json({
          match: false,
          message:
            lang === 'ar'
              ? 'Gemini لم يرجّع رد صالح. جرّب إعادة المحاولة أو راجع إعدادات المفتاح.'
              : 'Gemini did not return a valid response. Try again or verify your API key settings.',
        } satisfies DiagnoseResponse);
        return;
      }

      // Fallback: local expert rules
      const symptom = findSymptom(text);
      if (!symptom) {
        const response: DiagnoseResponse = {
          match: false,
          message:
            lang === 'ar'
              ? 'أقدر أساعد في أي سؤال، لكن بدون Gemini الردود العامة مش متاحة. شغّل `npm run dev:all` وتأكد من إعداد GEMINI_API_KEY.'
              : 'I can help with any question, but without Gemini general answers are unavailable. Run `npm run dev:all` and ensure GEMINI_API_KEY is set.',
        };
        res.json(response);
        return;
      }

      const diagnosis = buildProfessionalDiagnosis(symptom.id, lang);
      if (!diagnosis) {
        res.status(500).json({ match: false, message: 'Internal error' } satisfies DiagnoseResponse);
        return;
      }

      res.json({ match: true, diagnosis } satisfies DiagnoseResponse);
    } catch {
      res.status(500).json({ match: false, message: 'Internal error' } satisfies DiagnoseResponse);
    }
  })();
});

app.post('/api/follow-up', (req, res) => {
  const symptomId = typeof req.body?.symptomId === 'string' ? req.body.symptomId : '';
  const optionId = typeof req.body?.optionId === 'string' ? req.body.optionId : '';
  const lang = normalizeLang(req.body?.lang);

  if (!symptomId || !optionId) {
    res.status(400).json({
      message: lang === 'ar' ? 'symptomId و optionId مطلوبة.' : 'symptomId and optionId are required.',
    });
    return;
  }

  const diagnosis = buildFollowUp(symptomId, optionId, lang);
  if (!diagnosis) {
    res.status(404).json({
      message:
        lang === 'ar'
          ? 'لم يتم العثور على متابعة مطابقة.'
          : 'No matching follow-up option found.',
    });
    return;
  }

  const response: FollowUpResponse = { diagnosis };
  res.json(response);
});

// In serverless environments (like Vercel), you must NOT call listen().
// Vercel will invoke the exported handler per-request.
const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

if (!isServerless) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[car-diagnosis-api] listening on http://localhost:${port}`);
  });
}

export default app;
