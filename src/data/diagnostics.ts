
export interface Symptom {
  id: string;
  keywords: string[];
  keywordsAr: string[];
  diagnosis: {
    en: string;
    ar: string;
  };
  cause: {
    en: string;
    ar: string;
  };
  solution: {
    en: string;
    ar: string;
  };
  followUp?: {
    question: {
      en: string;
      ar: string;
    };
    options: {
      id: string;
      label: { en: string; ar: string };
      diagnosis: { en: string; ar: string };
      cause: { en: string; ar: string };
      solution: { en: string; ar: string };
    }[];
  };
}

export const diagnosticData: Symptom[] = [
  {
    id: 'not-starting',
    keywords: ['start', 'wont start', 'starting', 'crank', 'dead'],
    keywordsAr: ['تشغيل', 'ما يشتغل', 'سلف', 'بطارية'],
    diagnosis: {
      en: 'Possible battery or starter motor issue',
      ar: 'احتمال وجود مشكلة في البطارية أو محرك التشغيل (السلف)'
    },
    cause: {
      en: 'Weak battery charge or faulty starter system',
      ar: 'ضعف شحن البطارية أو خلل في نظام التشغيل'
    },
    solution: {
      en: 'Check battery voltage, try jump-start, inspect starter connections',
      ar: 'افحص جهد البطارية، جرب اشتراك، افحص توصيلات السلف'
    },
    followUp: {
      question: {
        en: 'Do you hear a clicking sound when turning the key?',
        ar: 'هل تسمع صوت "تكتكة" عند محاولة تشغيل السيارة؟'
      },
      options: [
        {
          id: 'clicking',
          label: { en: 'Yes, clicking sound', ar: 'نعم، صوت تكتكة' },
          diagnosis: { en: 'Low battery or loose terminals', ar: 'ضعف في البطارية أو ارتخاء في الأصابع' },
          cause: { en: 'Insufficient power to engage starter', ar: 'طاقة غير كافية لتشغيل السلف' },
          solution: { en: 'Clean terminals and charge/replace battery', ar: 'نظف أصابع البطارية واشحنها أو استبدلها' }
        },
        {
          id: 'no-sound',
          label: { en: 'No sound at all', ar: 'لا يوجد صوت نهائياً' },
          diagnosis: { en: 'Complete battery failure or ignition switch issue', ar: 'تلف كامل للبطارية أو مشكلة في سويتش التشغيل' },
          cause: { en: 'No electrical flow to the system', ar: 'عدم وصول تيار كهربائي للنظام' },
          solution: { en: 'Test battery with multimeter and check fuses', ar: 'افحص البطارية بجهاز الملتيميتر وافحص الفيوزات' }
        }
      ]
    }
  },
  {
    id: 'shaking',
    keywords: ['shaking', 'vibration', 'vibrating', 'shudder'],
    keywordsAr: ['هزة', 'نفضة', 'رجة', 'اهتزاز'],
    diagnosis: {
      en: 'Wheel imbalance or suspension issue',
      ar: 'عدم توازن العجلات أو مشكلة في نظام التعليق'
    },
    cause: {
      en: 'Uneven tire wear or damaged suspension components',
      ar: 'تآكل غير منتظم للإطارات أو تلف في قطع نظام التعليق'
    },
    solution: {
      en: 'Check wheel balancing, inspect tires, and test suspension system',
      ar: 'افحص ترصيص العجلات، افحص الإطارات، واختبر نظام التعليق'
    },
    followUp: {
      question: {
        en: 'Does the shaking increase at high speed or when braking?',
        ar: 'هل تزيد الرجة عند السرعات العالية أم عند الضغط على الفرامل؟'
      },
      options: [
        {
          id: 'high-speed',
          label: { en: 'High speed (above 80km/h)', ar: 'سرعة عالية (فوق 80 كم/س)' },
          diagnosis: { en: 'Wheel balancing required', ar: 'تحتاج ترصيص عجلات' },
          cause: { en: 'Weight distribution in wheels is uneven', ar: 'توزيع الوزن في العجلات غير متساوي' },
          solution: { en: 'Go to a tire shop for professional balancing', ar: 'توجه لمحل إطارات لعمل ترصيص احترافي' }
        },
        {
          id: 'braking',
          label: { en: 'When braking', ar: 'عند الضغط على الفرامل' },
          diagnosis: { en: 'Warped brake rotors', ar: 'اعوجاج في هوبات الفرامل' },
          cause: { en: 'Excessive heat causing rotor deformation', ar: 'حرارة زائدة أدت لاعوجاج الهوبات' },
          solution: { en: 'Resurface (turn) the rotors or replace them', ar: 'خرط الهوبات أو استبدالها' }
        }
      ]
    }
  },
  {
    id: 'overheating',
    keywords: ['overheating', 'hot', 'temperature', 'steam', 'boiling'],
    keywordsAr: ['حرارة', 'تسخين', 'ترتفع الحرارة', 'غليان'],
    diagnosis: {
      en: 'Cooling system failure',
      ar: 'فشل في نظام التبريد'
    },
    cause: {
      en: 'Low coolant, faulty thermostat, or leaking radiator',
      ar: 'نقص سائل التبريد، تعطل الثرموستات، أو تهريب في الرديتر'
    },
    solution: {
      en: 'Stop driving immediately, check coolant level after cooling, inspect for leaks',
      ar: 'توقف عن القيادة فوراً، افحص مستوى السائل بعد أن تبرد السيارة، وابحث عن تهريب'
    },
    followUp: {
      question: {
        en: 'Is there steam coming from under the hood?',
        ar: 'هل هناك بخار يتصاعد من تحت غطاء المحرك؟'
      },
      options: [
        {
          id: 'steam-yes',
          label: { en: 'Yes, lots of steam', ar: 'نعم، بخار كثيف' },
          diagnosis: { en: 'Major coolant leak or burst hose', ar: 'تهريب كبير لسائل التبريد أو انفجار خرطوش' },
          cause: { en: 'High pressure in cooling system', ar: 'ضغط عالي في نظام التبريد' },
          solution: { en: 'Do not open radiator cap! Tow to a mechanic.', ar: 'لا تفتح غطاء الرديتر! اسحب السيارة للميكانيكي.' }
        },
        {
          id: 'steam-no',
          label: { en: 'No steam, just high gauge', ar: 'لا يوجد بخار، فقط العداد مرتفع' },
          diagnosis: { en: 'Faulty thermostat or cooling fan', ar: 'تعطل الثرموستات أو مروحة التبريد' },
          cause: { en: 'Restricted coolant flow or no airflow', ar: 'انسداد في تدفق السائل أو تعطل المروحة' },
          solution: { en: 'Test cooling fans and replace thermostat', ar: 'افحص مراوح التبريد واستبدل الثرموستات' }
        }
      ]
    }
  },
  {
    id: 'squealing',
    keywords: ['squealing', 'squeak', 'shriek', 'belt noise'],
    keywordsAr: ['صرصرة', 'صوت سير', 'صفير'],
    diagnosis: {
      en: 'Serpentine belt or pulley issue',
      ar: 'مشكلة في سير الماكينة أو البكرة'
    },
    cause: {
      en: 'Worn out belt or failing bearing in a pulley',
      ar: 'سير مهترئ أو تلف في رمان البكرة'
    },
    solution: {
      en: 'Inspect belt for cracks, check tensioner, replace if necessary',
      ar: 'افحص السير بحثاً عن تشققات، افحص الشداد، واستبدله إذا لزم الأمر'
    }
  },
  {
    id: 'smoke',
    keywords: ['smoke', 'smoking', 'exhaust', 'blue smoke', 'white smoke', 'black smoke'],
    keywordsAr: ['دخان', 'شكمان', 'دخان أزرق', 'دخان أبيض', 'دخان أسود'],
    diagnosis: {
      en: 'Engine internal combustion or sealing issue',
      ar: 'مشكلة في الاحتراق الداخلي أو موانع التسرب في المحرك'
    },
    cause: {
      en: 'Various (depends on smoke color)',
      ar: 'متنوع (يعتمد على لون الدخان)'
    },
    solution: {
      en: 'Identify smoke color and perform engine health check',
      ar: 'حدد لون الدخان وقم بإجراء فحص حالة المحرك'
    },
    followUp: {
      question: {
        en: 'What color is the smoke coming from the exhaust?',
        ar: 'ما هو لون الدخان الخارج من الشكمان؟'
      },
      options: [
        {
          id: 'smoke-blue',
          label: { en: 'Blue smoke', ar: 'دخان أزرق' },
          diagnosis: { en: 'Engine is burning oil', ar: 'المحرك يحرق زيت' },
          cause: { en: 'Worn piston rings or valve seals', ar: 'تآكل في شنابر المكبس أو جلد البلوف' },
          solution: { en: 'Engine rebuild or replacement of seals', ar: 'توضيب المحرك أو استبدال موانع التسرب' }
        },
        {
          id: 'smoke-white',
          label: { en: 'White/Milky smoke', ar: 'دخان أبيض كثيف' },
          diagnosis: { en: 'Coolant leaking into cylinders', ar: 'تسرب سائل التبريد داخل الاسطوانات' },
          cause: { en: 'Blown head gasket', ar: 'تلف وجه الرأس (كاسكيت)' },
          solution: { en: 'Pressure test cooling system and replace head gasket', ar: 'اختبر ضغط نظام التبريد واستبدل وجه الرأس' }
        },
        {
          id: 'smoke-black',
          label: { en: 'Black smoke', ar: 'دخان أسود' },
          diagnosis: { en: 'Incomplete fuel combustion', ar: 'احتراق وقود غير كامل' },
          cause: { en: 'Faulty fuel injectors or clogged air filter', ar: 'بخاخات وقود تالفة أو فلتر هواء متسخ' },
          solution: { en: 'Clean injectors and replace air filter', ar: 'تنظيف البخاخات واستبدال فلتر الهواء' }
        }
      ]
    }
  },
  {
    id: 'brakes',
    keywords: ['brake', 'braking', 'grinding', 'stop', 'pedal'],
    keywordsAr: ['فرامل', 'بريك', 'فحمات', 'توقف'],
    diagnosis: {
      en: 'Braking system wear',
      ar: 'تآكل في نظام الفرامل'
    },
    cause: {
      en: 'Worn brake pads or fluid low',
      ar: 'تآكل فحمات الفرامل أو نقص الزيت'
    },
    solution: {
      en: 'Inspect pads, rotors, and fluid level',
      ar: 'افحص الفحمات، الهوبات، ومستوى الزيت'
    },
    followUp: {
      question: {
        en: 'Does it make a grinding metal-on-metal sound?',
        ar: 'هل هناك صوت احتكاك معدني (قوي)؟'
      },
      options: [
        {
          id: 'grind-yes',
          label: { en: 'Yes, grinding sound', ar: 'نعم، صوت احتكاك معدني' },
          diagnosis: { en: 'Brake pads completely worn', ar: 'الفحمات منتهية تماماً' },
          cause: { en: 'Friction material gone, backing plate hitting rotor', ar: 'انتهاء مادة الاحتكاك، الحديد يضرب في الهوب' },
          solution: { en: 'Replace pads and rotors immediately', ar: 'استبدل الفحمات والهوبات فوراً' }
        },
        {
          id: 'grind-no',
          label: { en: 'No, just squeaking', ar: 'لا، مجرد صفير' },
          diagnosis: { en: 'Brake pad wear indicator or dust', ar: 'حساس تآكل الفحمات أو غبار' },
          cause: { en: 'Pads getting low or glaze on surface', ar: 'قرب انتهاء الفحمات أو وجود طبقة زجاجية' },
          solution: { en: 'Check pad thickness and clean assembly', ar: 'افحص سمك الفحمات ونظف المجموعة' }
        }
      ]
    }
  },
  {
    id: 'warning-light',
    keywords: ['light', 'check engine', 'dashboard', 'warning', 'symbol'],
    keywordsAr: ['لمبة', 'مكينة', 'طبلون', 'تحذير', 'علامة'],
    diagnosis: {
      en: 'On-Board Diagnostics (OBD) alert',
      ar: 'تنبيه من نظام التشخيص الذاتي (OBD)'
    },
    cause: {
      en: 'Sensor failure, emission issue, or engine malfunction',
      ar: 'عطل في أحد الحساسات، مشكلة في الانبعاثات، أو خلل في المحرك'
    },
    solution: {
      en: 'Use an OBD-II scanner to read the specific error code (P0xxx)',
      ar: 'استخدم جهاز فحص كمبيوتر (OBD-II) لقراءة رمز الخطأ المحدد'
    },
    followUp: {
      question: {
        en: 'Which light is illuminated on your dashboard?',
        ar: 'أي لمبة مضيئة في الطبلون؟'
      },
      options: [
        {
          id: 'light-engine',
          label: { en: 'Check Engine (Yellow/Orange)', ar: 'لمبة المكينة (صفراء/برتقالية)' },
          diagnosis: { en: 'Emissions or engine management fault', ar: 'خلل في إدارة المحرك أو الانبعاثات' },
          cause: { en: 'Faulty oxygen sensor, spark plugs, or loose gas cap', ar: 'حساس أكسجين تالف، بواجي، أو غطاء بنزين غير محكم' },
          solution: { en: 'Scan for codes. Tighten gas cap first.', ar: 'افحص الأكواد. أحكم إغلاق غطاء البنزين أولاً.' }
        },
        {
          id: 'light-oil',
          label: { en: 'Oil Pressure (Red)', ar: 'لمبة الزيت (حمراء)' },
          diagnosis: { en: 'Critical low oil pressure', ar: 'انخفاض خطير في ضغط الزيت' },
          cause: { en: 'Low oil level or pump failure', ar: 'نقص الزيت أو تعطل طلمبة الزيت' },
          solution: { en: 'Stop engine immediately! Check oil level.', ar: 'أوقف المحرك فوراً! افحص مستوى الزيت.' }
        }
      ]
    }
  },
  {
    id: 'leak',
    keywords: ['leak', 'leaking', 'puddle', 'dripping', 'fluid'],
    keywordsAr: ['تهريب', 'تسريب', 'نقص', 'تنقيط', 'زيت تحت السيارة'],
    diagnosis: {
      en: 'Fluid containment failure',
      ar: 'فشل في احتواء السوائل'
    },
    cause: {
      en: 'Damaged gaskets, seals, or punctured reservoir',
      ar: 'تلف الوجيه، الصوف، أو ثقب في الخزانات'
    },
    solution: {
      en: 'Identify fluid type by color and smell',
      ar: 'حدد نوع السائل من لونه ورائحته'
    },
    followUp: {
      question: {
        en: 'What color is the fluid on the ground?',
        ar: 'ما هو لون السائل الموجود على الأرض؟'
      },
      options: [
        {
          id: 'leak-dark',
          label: { en: 'Dark brown/Black', ar: 'بني غامق أو أسود' },
          diagnosis: { en: 'Engine oil leak', ar: 'تهريب زيت محرك' },
          cause: { en: 'Oil pan gasket or valve cover leak', ar: 'وجه كرتير الزيت أو غطاء البلوف' },
          solution: { en: 'Check oil level and replace leaking gasket', ar: 'افحص مستوى الزيت واستبدل الوجه التالف' }
        },
        {
          id: 'leak-red',
          label: { en: 'Bright Red', ar: 'أحمر فاتح' },
          diagnosis: { en: 'Transmission or power steering fluid', ar: 'زيت القير أو زيت الدركسون' },
          cause: { en: 'Seal failure in transmission or steering rack', ar: 'تلف صوفة القير أو علبة الدركسون' },
          solution: { en: 'Check fluid levels and inspect hoses', ar: 'افحص مستويات السوائل وافحص الخراطيم' }
        },
        {
          id: 'leak-green',
          label: { en: 'Neon Green/Orange', ar: 'أخضر فسفوري أو برتقالي' },
          diagnosis: { en: 'Coolant leak', ar: 'تهريب مياه الرديتر (أنتيفريز)' },
          cause: { en: 'Radiator or water pump failure', ar: 'عطل في الرديتر أو طلمبة الماء' },
          solution: { en: 'Pressure test system and replace faulty component', ar: 'افحص الضغط واستبدل القطعة التالفة' }
        }
      ]
    }
  },
  {
    id: 'ac-issue',
    keywords: ['ac', 'air conditioning', 'hot air', 'not cooling', 'fan'],
    keywordsAr: ['مكيف', 'حر', 'ما يبرد', 'تبريد', 'كمبروسر'],
    diagnosis: {
      en: 'HVAC system inefficiency',
      ar: 'عدم كفاءة نظام التكييف'
    },
    cause: {
      en: 'Low refrigerant, faulty compressor, or clogged cabin filter',
      ar: 'نقص الفريون، تعطل الكمبروسر، أو اتساخ فلتر المقصورة'
    },
    solution: {
      en: 'Check refrigerant pressure and inspect cabin air filter',
      ar: 'افحص ضغط الفريون وافحص فلتر هواء المقصورة'
    },
    followUp: {
      question: {
        en: 'Does the AC blow air at all, or is it just hot?',
        ar: 'هل المكيف يخرج هواء أصلاً، أم يخرج هواء حار فقط؟'
      },
      options: [
        {
          id: 'ac-hot',
          label: { en: 'Blowing hot air', ar: 'يخرج هواء حار' },
          diagnosis: { en: 'Refrigerant leak or compressor failure', ar: 'تهريب فريون أو تعطل الكمبروسر' },
          cause: { en: 'System lost pressure or mechanical clutch failed', ar: 'فقدان ضغط النظام أو تعطل كلتش الكمبروسر' },
          solution: { en: 'Perform a leak test and refill refrigerant', ar: 'أجرِ فحص تهريب وأعد تعبئة الفريون' }
        },
        {
          id: 'ac-weak',
          label: { en: 'Weak airflow', ar: 'دفع الهواء ضعيف' },
          diagnosis: { en: 'Clogged cabin air filter', ar: 'انسداد فلتر هواء المقصورة' },
          cause: { en: 'Accumulated dust and debris blocking airflow', ar: 'تراكم الغبار والأوساخ يعيق تدفق الهواء' },
          solution: { en: 'Replace the cabin air filter (usually behind glovebox)', ar: 'استبدل فلتر هواء المقصورة (غالباً خلف الدرج)' }
        }
      ]
    }
  }
];
