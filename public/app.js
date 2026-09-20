/* ============================================================
   Dr. Mohammed Al Amin · site behaviour
   - bilingual EN/AR (with RTL)
   - content rendering
   - booking calendar (real availability from /api/slots)
   - collaboration form
   ============================================================ */
(function () {
'use strict';

/* ------------------------------------------------------------------ *
 * i18n strings
 * ------------------------------------------------------------------ */
const T = {
  en: {
    'brand.name': 'Dr. Mohammed Al Amin',
    'brand.role': 'Cybersecurity Leader · Founder',
    'nav.about': 'About', 'nav.expertise': 'Expertise', 'nav.initiatives': 'Initiatives',
    'nav.journey': 'Journey', 'nav.credentials': 'Credentials', 'nav.collaborate': 'Collaborate',
    'nav.questionnaire': 'Questionnaire',
    'nav.book': 'Book a Call',
    'booking.linked': 'Questionnaire received. Choose a time and your answers come with the booking.',

    'hero.badge': 'Available for select engagements',
    'hero.eyebrow': 'Founder @ Arabc0n & InfoLogix · Riyadh, Saudi Arabia',
    'hero.title1': 'Secure by design.',
    'hero.title2': 'Built for regional transformation.',
    'hero.sub': 'I build security infrastructure, logistics technology and innovation ecosystems, taking ideas from threat model to deployed platform across government, telecom and enterprise.',
    'hero.cta1': 'Book a session', 'hero.cta2': 'Explore expertise',
    'hero.meta1': 'Red team · Governance · AI platforms',
    'hero.meta2': 'Saudi Arabia · Sudan · GCC',
    'hero.term': 'profile.sh',

    'stats.years': 'Years in the field', 'stats.redteam': 'Red-team engagements',
    'stats.unit': 'Elite operators led', 'stats.initiatives': 'Flagship initiatives',
    'stats.ventures': 'Ventures founded',

    'about.kicker': 'Who I am',
    'about.title': 'Two decades at the intersection of security, operations and national infrastructure.',
    'about.p1': 'I\'m a cybersecurity leader and founder based in Riyadh. I founded <strong>Arabc0n Cyber Security</strong> as a specialist offensive security firm serving government and enterprise clients across the region, and <strong>InfoLogix</strong>, a technical consulting and logistics development company building AI-driven operations platforms for the Saudi market.',
    'about.p2': 'My career runs from information security advisor and CISO at Sudan\'s National Telecom Corporation through command-and-control operations in Saudi Arabia, to leading red-team programmes trusted by government and telecom operators. That mix of public-sector discipline and offensive mindset is what I bring to every engagement.',
    'about.p3': 'Today I split my time between hands-on security work, building AI-native platforms, and shaping regional initiatives, from a unified Arab cybersecurity governance framework to open-source intelligence infrastructure.',

    'exp.kicker': 'What I do', 'exp.title': 'Expertise',
    'exp.sub': 'From adversary simulation to AI-native platforms: engagement models for teams that need decisions, not slide decks.',

    'ini.kicker': 'Selected work', 'ini.title': 'Initiatives & platforms',
    'ini.sub': 'Strategic regional programmes, AI-native products and open infrastructure, built to outlive the launch.',

    'jr.kicker': 'Track record', 'jr.title': 'Journey',
    'cr.kicker': 'Credentials', 'cr.title': 'Certifications & education',

    'bk.kicker': 'Booking', 'bk.title': 'Book a session',
    'bk.sub': 'Pick a slot that works for you. All times are shown in <strong>Asia/Riyadh (GMT+3)</strong>. You\'ll get a confirmation reference instantly.',
    'bk.step1': 'Choose a session type', 'bk.step2': 'Pick a date & time', 'bk.step3': 'Your details',
    'bk.lgOpen': 'Available', 'bk.lgSel': 'Selected', 'bk.lgFull': 'Unavailable',
    'bk.noSlot': 'No slot selected yet.', 'bk.confirm': 'Confirm booking',
    'bk.note': 'You\'ll receive a confirmation reference on screen, and I\'ll follow up by email.',
    'bk.doneTitle': 'You\'re booked', 'bk.again': 'Book another session',

    'f.name': 'Full name', 'f.email': 'Email',
    'f.org': 'Organisation <span class="opt">(optional)</span>',
    'f.notes': 'What would you like to cover? <span class="opt">(optional)</span>',
    'f.kind': 'Collaboration type',
    'f.link': 'Link <span class="opt">(optional)</span>', 'f.message': 'Message',
    'f.opt': '(optional)', 'f.opt2': '(optional)',
    'f.namePh': 'Your name', 'f.emailPh': 'you@company.com', 'f.orgPh': 'Company / agency',
    'f.notesPh': 'Context, scope, or questions…', 'f.linkPh': 'https://…',
    'f.msgPh': 'What are you building, and where do I fit in?',

    'cl.kicker': 'Open to collaboration', 'cl.title': 'Let\'s build something that matters',
    'cl.sub': 'I\'m actively looking for partners, researchers and operators on the problems below. Tell me what you\'re working on.',
    'cl.interests': 'Areas of interest', 'cl.direct': 'Or reach me directly:',
    'cl.send': 'Send request', 'cl.note': 'Typical response time: within 24 hours.',
    'cl.doneTitle': 'Request received', 'cl.again': 'Send another',

    'cta.title': 'Ready to harden what you\'re building?',
    'cta.sub': 'Whether it\'s an adversary simulation, a security architecture review, or an AI platform from zero, I\'m one message away.',
    'cta.collab': 'Collaborate',

    'foot.tag': 'Security infrastructure · Logistics technology · Innovation ecosystems',
    'foot.contact': 'Contact', 'foot.social': 'Elsewhere',
    'foot.loc': 'Riyadh, Saudi Arabia', 'foot.markets': 'Markets',
    'foot.marketsList': 'Saudi Arabia · Sudan · GCC', 'foot.langs': 'Arabic · English',
    'foot.rights': 'All rights reserved.', 'foot.built': 'Built secure by default.',

    /* runtime */
    'rt.tz': 'Asia/Riyadh (GMT+3)',
    'rt.loading': 'Loading availability…',
    'rt.noDays': 'No availability in this month.',
    'rt.pickDay': 'Select a highlighted day to see available times.',
    'rt.slotsFor': 'Available times on',
    'rt.slotsNone': 'No times left on this day. Please pick another date.',
    'rt.errTaken': 'That slot was just taken. Please choose another time.',
    'rt.errGeneric': 'Something went wrong. Please try again.',
    'rt.errName': 'Please enter your name.',
    'rt.errEmail': 'Please enter a valid email address.',
    'rt.errMessage': 'Please write at least 10 characters.',
    'rt.errSlot': 'Please select a date and time first.',
    'rt.lblSession': 'Session', 'rt.lblDate': 'Date', 'rt.lblTime': 'Time', 'rt.lblDuration': 'Duration',
    'rt.lblFee': 'Fee', 'rt.free': 'Free', 'rt.feeLine': 'Fee: {price}',
    'rt.minutes': '{n} min',
    'rt.doneSub': 'Your {session} is confirmed for {date} at {time}.',
    'rt.clDoneSub': 'Thanks {name}. I\'ll reply to {email} within 24 hours.',
    'rt.sending': 'Sending…',
    'rt.present': 'Present',
  },

  ar: {
    'brand.name': 'د. محمد الأمين',
    'brand.role': 'قائد أمن سيبراني · مؤسس',
    'nav.about': 'نبذة عني', 'nav.expertise': 'الخبرات', 'nav.initiatives': 'المبادرات',
    'nav.journey': 'المسار المهني', 'nav.credentials': 'المؤهلات', 'nav.collaborate': 'التعاون',
    'nav.questionnaire': 'الاستبيان',
    'nav.book': 'احجز جلسة',
    'booking.linked': 'تم استلام الاستبيان. اختر الوقت وستصلني إجاباتك مع الحجز.',

    'hero.badge': 'متاح لعدد محدود من المشاريع',
    'hero.eyebrow': 'مؤسس Arabc0n و InfoLogix · الرياض، المملكة العربية السعودية',
    'hero.title1': 'تصميم آمن.',
    'hero.title2': 'مبني للتحول الإقليمي.',
    'hero.sub': 'أبني البنية الأمنية وتقنيات اللوجستيات ومنظومات الابتكار، من نموذج التهديد وحتى منصة تعمل فعلياً لدى الجهات الحكومية وشركات الاتصالات والمؤسسات.',
    'hero.cta1': 'احجز جلسة', 'hero.cta2': 'استعرض الخبرات',
    'hero.meta1': 'الفريق الأحمر · الحوكمة · منصات الذكاء الاصطناعي',
    'hero.meta2': 'السعودية · السودان · الخليج',
    'hero.term': 'profile.sh',

    'stats.years': 'سنة خبرة', 'stats.redteam': 'مهمات الفريق الأحمر',
    'stats.unit': 'أفراد فريق النخبة', 'stats.initiatives': 'مبادرات رئيسية',
    'stats.ventures': 'شركات أسّستها',

    'about.kicker': 'من أنا',
    'about.title': 'عقدان من الخبرة في ملتقى الأمن والعمليات والبنية التحتية الوطنية.',
    'about.p1': 'أنا قائد أمن سيبراني ومؤسس، أعمل من الرياض. أسّست <strong>Arabc0n للأمن السيبراني</strong> كشركة متخصصة في الأمن الهجومي تخدم الجهات الحكومية والشركات في المنطقة، وأسّست <strong>InfoLogix</strong>، شركة استشارات تقنية وتطوير لوجستي تبني منصات عمليات مدعومة بالذكاء الاصطناعي للسوق السعودي.',
    'about.p2': 'تمتد مسيرتي من العمل مستشاراً لأمن المعلومات ثم رئيساً لأمن المعلومات (CISO) في الهيئة القومية للاتصالات بالسودان، مروراً بعمليات مراكز القيادة والتحكم في السعودية، وصولاً إلى قيادة برامج الفريق الأحمر الموثوقة لدى الجهات الحكومية ومشغّلي الاتصالات. هذا المزيج من الانضباط الحكومي والعقلية الهجومية هو ما أحمله إلى كل مشروع.',
    'about.p3': 'اليوم أقسم وقتي بين العمل الأمني الميداني، وبناء منصات الذكاء الاصطناعي، وصياغة مبادرات إقليمية، من إطار حوكمة سيبرانية عربي موحّد إلى بنية استخبارات مفتوحة المصدر.',

    'exp.kicker': 'ما أقدمه', 'exp.title': 'الخبرات',
    'exp.sub': 'من محاكاة الخصوم إلى منصات الذكاء الاصطناعي: نماذج عمل لفرق تحتاج إلى قرارات، لا إلى عروض تقديمية.',

    'ini.kicker': 'أعمال مختارة', 'ini.title': 'المبادرات والمنصات',
    'ini.sub': 'برامج إقليمية استراتيجية ومنتجات مبنية على الذكاء الاصطناعي وبنية مفتوحة، صُممت لتستمر بعد الإطلاق.',

    'jr.kicker': 'السجل المهني', 'jr.title': 'المسار المهني',
    'cr.kicker': 'المؤهلات', 'cr.title': 'الشهادات والتعليم',

    'bk.kicker': 'الحجز', 'bk.title': 'احجز جلسة',
    'bk.sub': 'اختر الوقت الذي يناسبك. جميع الأوقات بتوقيت <strong>الرياض (GMT+3)</strong>. ستحصل على رقم تأكيد فوراً.',
    'bk.step1': 'اختر نوع الجلسة', 'bk.step2': 'اختر التاريخ والوقت', 'bk.step3': 'بياناتك',
    'bk.lgOpen': 'متاح', 'bk.lgSel': 'محدد', 'bk.lgFull': 'غير متاح',
    'bk.noSlot': 'لم يتم اختيار وقت بعد.', 'bk.confirm': 'تأكيد الحجز',
    'bk.note': 'سيظهر لك رقم تأكيد على الشاشة، وسأتابع معك عبر البريد الإلكتروني.',
    'bk.doneTitle': 'تم حجز جلستك', 'bk.again': 'احجز جلسة أخرى',

    'f.name': 'الاسم الكامل', 'f.email': 'البريد الإلكتروني',
    'f.org': 'الجهة <span class="opt">(اختياري)</span>',
    'f.notes': 'ما الذي ترغب في مناقشته؟ <span class="opt">(اختياري)</span>',
    'f.kind': 'نوع التعاون',
    'f.link': 'رابط <span class="opt">(اختياري)</span>', 'f.message': 'الرسالة',
    'f.opt': '(اختياري)', 'f.opt2': '(اختياري)',
    'f.namePh': 'اسمك', 'f.emailPh': 'you@company.com', 'f.orgPh': 'الشركة / الجهة',
    'f.notesPh': 'السياق أو النطاق أو أسئلتك…', 'f.linkPh': 'https://…',
    'f.msgPh': 'ما الذي تبنيه، وأين يأتي دوري؟',

    'cl.kicker': 'مفتوح للتعاون', 'cl.title': 'لنبنِ شيئاً ذا أثر',
    'cl.sub': 'أبحث بفعالية عن شركاء وباحثين ومشغّلين للعمل على المحاور أدناه. أخبرني بما تعمل عليه.',
    'cl.interests': 'مجالات الاهتمام', 'cl.direct': 'أو تواصل معي مباشرة:',
    'cl.send': 'إرسال الطلب', 'cl.note': 'زمن الاستجابة المعتاد: خلال 24 ساعة.',
    'cl.doneTitle': 'تم استلام طلبك', 'cl.again': 'إرسال طلب آخر',

    'cta.title': 'جاهز لتحصين ما تبنيه؟',
    'cta.sub': 'سواء كانت محاكاة خصم، أو مراجعة معمارية أمنية، أو منصة ذكاء اصطناعي من الصفر، أنا على بُعد رسالة واحدة.',
    'cta.collab': 'تعاون معي',

    'foot.tag': 'البنية الأمنية · تقنيات اللوجستيات · منظومات الابتكار',
    'foot.contact': 'تواصل', 'foot.social': 'في مكان آخر',
    'foot.loc': 'الرياض، المملكة العربية السعودية', 'foot.markets': 'الأسواق',
    'foot.marketsList': 'السعودية · السودان · الخليج', 'foot.langs': 'العربية · الإنجليزية',
    'foot.rights': 'جميع الحقوق محفوظة.', 'foot.built': 'مبني ليكون آمناً بصورة افتراضية.',

    /* runtime */
    'rt.tz': 'الرياض (GMT+3)',
    'rt.loading': 'جارٍ تحميل المواعيد…',
    'rt.noDays': 'لا مواعيد متاحة في هذا الشهر.',
    'rt.pickDay': 'اختر أحد الأيام المُظللة لعرض الأوقات المتاحة.',
    'rt.slotsFor': 'الأوقات المتاحة ليوم',
    'rt.slotsNone': 'لا أوقات متبقية في هذا اليوم. يرجى اختيار تاريخ آخر.',
    'rt.errTaken': 'لقد حُجز هذا الوقت للتو. يرجى اختيار وقت آخر.',
    'rt.errGeneric': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    'rt.errName': 'يرجى إدخال الاسم.',
    'rt.errEmail': 'يرجى إدخال بريد إلكتروني صحيح.',
    'rt.errMessage': 'يرجى كتابة 10 أحرف على الأقل.',
    'rt.errSlot': 'يرجى اختيار التاريخ والوقت أولاً.',
    'rt.lblSession': 'الجلسة', 'rt.lblDate': 'التاريخ', 'rt.lblTime': 'الوقت', 'rt.lblDuration': 'المدة',
    'rt.lblFee': 'الرسوم', 'rt.free': 'مجاناً', 'rt.feeLine': 'الرسوم: {price}',
    'rt.minutes': '{n} دقيقة',
    'rt.doneSub': 'تم تأكيد جلستك ({session}) يوم {date} الساعة {time}.',
    'rt.clDoneSub': 'شكراً {name}. سأرد على {email} خلال 24 ساعة.',
    'rt.sending': 'جارٍ الإرسال…',
    'rt.present': 'حتى الآن',
  },
};

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */
const SKILLS = {
  en: ['Threat Intelligence','Red Teaming','Reverse Engineering','Security Architecture','Security Governance','Malware Analysis','AI-Native Platforms','Fleet & Supply Chain Ops','Knowledge Graphs','Risk Management'],
  ar: ['استخبارات التهديدات','الفريق الأحمر','الهندسة العكسية','المعمارية الأمنية','الحوكمة الأمنية','تحليل البرمجيات الخبيثة','منصات الذكاء الاصطناعي','عمليات الأساطيل وسلاسل التوريد','الرسوم المعرفية','إدارة المخاطر'],
};

const FOCUS = [
  { icon:'🔐',
    t:{en:'Cybersecurity', ar:'الأمن السيبراني'},
    d:{en:'Threat intelligence, red teaming, security architecture, governance.', ar:'استخبارات التهديدات، الفريق الأحمر، المعمارية الأمنية، الحوكمة.'} },
  { icon:'🤖',
    t:{en:'AI & Automation', ar:'الذكاء الاصطناعي والأتمتة'},
    d:{en:'AI-native platform design, intelligent decision support, process automation.', ar:'تصميم منصات أصلية بالذكاء الاصطناعي، دعم القرار الذكي، أتمتة العمليات.'} },
  { icon:'🌍',
    t:{en:'Regional Development', ar:'التنمية الإقليمية'},
    d:{en:'Arab world connectivity, Saudi Vision 2030, innovation ecosystems.', ar:'الربط في العالم العربي، رؤية السعودية 2030، منظومات الابتكار.'} },
  { icon:'📦',
    t:{en:'Logistics & Operations', ar:'اللوجستيات والعمليات'},
    d:{en:'Fleet management, supply chain optimization, operational intelligence.', ar:'إدارة الأساطيل، تحسين سلاسل التوريد، الذكاء التشغيلي.'} },
  { icon:'🔓',
    t:{en:'Open Source & Community', ar:'المصادر المفتوحة والمجتمع'},
    d:{en:'Community-driven initiatives, knowledge graphs, resource intelligence.', ar:'مبادرات يقودها المجتمع، الرسوم المعرفية، استخبارات الموارد.'} },
];

const SERVICES = [
  { icon:'🎯', t:{en:'Red Team & Offensive Security', ar:'الفريق الأحمر والأمن الهجومي'},
    d:{en:'Full-scope adversary simulation, ethical hacking and threat emulation, showing you how an attacker actually gets in, and exactly how to stop them.',
       ar:'محاكاة خصم شاملة واختبار اختراق أخلاقي، لنُريك كيف يدخل المهاجم فعلياً، وبالتحديد كيف توقفه.'},
    g:{en:['Red Team','Pentest','Social Engineering'], ar:['فريق أحمر','اختبار اختراق','هندسة اجتماعية']} },
  { icon:'🏗️', t:{en:'Security Architecture', ar:'المعمارية الأمنية'},
    d:{en:'Design and review of secure enterprise architecture across cloud, network and OT/ICS environments.',
       ar:'تصميم ومراجعة المعمارية الأمنية للمؤسسات عبر البيئات السحابية والشبكية وأنظمة OT/ICS.'},
    g:{en:['Zero Trust','Cloud','OT/ICS'], ar:['انعدام الثقة','سحابة','OT/ICS']} },
  { icon:'🛰️', t:{en:'Threat Intelligence', ar:'استخبارات التهديدات'},
    d:{en:'Evidence-based threat validation, intelligence programmes and MITRE ATT&CK-aligned detection strategy.',
       ar:'تحقّق من التهديدات مبني على الأدلة، وبرامج استخبارات، واستراتيجية كشف متوافقة مع MITRE ATT&CK.'},
    g:{en:['CTI','MITRE ATT&CK','Detection'], ar:['استخبارات','MITRE ATT&CK','كشف']} },
  { icon:'📋', t:{en:'GRC & Compliance', ar:'الحوكمة والامتثال'},
    d:{en:'NCA (ECC/CCC/DCC), SAMA Cybersecurity Framework and ISO 27001 readiness: governance that survives an audit.',
       ar:'الجاهزية لمتطلبات الهيئة الوطنية للأمن السيبراني وإطار الأمن السيبراني للبنك المركزي السعودي وأيزو 27001: حوكمة تصمد أمام التدقيق.'},
    g:{en:['NCA','SAMA','ISO 27001'], ar:['الهيئة الوطنية','البنك المركزي السعودي','أيزو 27001']} },
  { icon:'🤖', t:{en:'AI-Native Security Platforms', ar:'منصات أمنية بالذكاء الاصطناعي'},
    d:{en:'Design and build of AI-powered security products: decision support, automation and analyst augmentation.',
       ar:'تصميم وبناء منتجات أمنية مدعومة بالذكاء الاصطناعي: دعم القرار، الأتمتة، تعزيز قدرات المحللين.'},
    g:{en:['AI','Automation','Product'], ar:['ذكاء اصطناعي','أتمتة','منتج']} },
  { icon:'🚚', t:{en:'Logistics Digital Transformation', ar:'التحول الرقمي اللوجستي'},
    d:{en:'Fleet management, supply chain optimization and operational intelligence for logistics operators.',
       ar:'إدارة الأساطيل وتحسين سلاسل التوريد والذكاء التشغيلي لمشغّلي اللوجستيات.'},
    g:{en:['Fleet','Supply Chain','BI'], ar:['أساطيل','سلاسل التوريد','ذكاء أعمال']} },
  { icon:'🔬', t:{en:'Malware RE & Forensics', ar:'الهندسة العكسية والتحليل الجنائي'},
    d:{en:'Reverse engineering, malware analysis and digital forensics to support incident response.',
       ar:'الهندسة العكسية وتحليل البرمجيات الخبيثة والتحليل الجنائي الرقمي لدعم الاستجابة للحوادث.'},
    g:{en:['RE','Forensics','IR'], ar:['هندسة عكسية','تحليل جنائي','الاستجابة للحوادث']} },
  { icon:'🎓', t:{en:'Executive Advisory & Training', ar:'الاستشارات التنفيذية والتدريب'},
    d:{en:'Board-level advisory, awareness programmes and hands-on training for security and engineering teams.',
       ar:'استشارات على مستوى الإدارة العليا، وبرامج توعية، وتدريب عملي لفرق الأمن والهندسة.'},
    g:{en:['Advisory','Training','Awareness'], ar:['استشارات','تدريب','توعية']} },
];

const INITIATIVES = [
  { icon:'🔐', kind:{en:'Strategic Regional Initiative', ar:'مبادرة إقليمية استراتيجية'},
    t:{en:'Arab Cybersecurity & Digital Intelligence Union', ar:'الاتحاد العربي للأمن السيبراني والاستخبارات الرقمية'},
    d:{en:'A strategic regional initiative to establish a unified cybersecurity governance framework across the Arab world, harmonising policies, standards, operational procedures and digital intelligence practices.',
       ar:'مبادرة إقليمية استراتيجية لإرساء إطار حوكمة سيبرانية موحّد في العالم العربي، ينسّق السياسات والمعايير والإجراءات التشغيلية وممارسات الاستخبارات الرقمية.'},
    g:{en:['Governance','Policy','Arab Region'], ar:['حوكمة','سياسات','المنطقة العربية']},
    o:{en:'Comprehensive roadmap, governance models, training programmes and international cooperation strategies, strengthening collective cyber resilience.',
       ar:'خارطة تنفيذ شاملة ونماذج حوكمة وبرامج تدريب واستراتيجيات تعاون دولي، لتعزيز الصمود السيبراني الجماعي.'} },
  { icon:'🌍', kind:{en:'Ecosystem Platform', ar:'منصة منظومة'},
    t:{en:'Sudan Innovation & Investment Ecosystem', ar:'منظومة الابتكار والاستثمار في السودان'},
    d:{en:'A secure, AI-powered digital platform connecting Sudanese entrepreneurs, investors, mentors, experts and the global diaspora within one trusted innovation ecosystem.',
       ar:'منصة رقمية آمنة مدعومة بالذكاء الاصطناعي تربط رواد الأعمال والمستثمرين والموجّهين والخبراء والمغتربين السودانيين في منظومة ابتكار موثوقة واحدة.'},
    g:{en:['Cloud-Native','Zero Trust','AI Governance'], ar:['سحابية أصلية','انعدام الثقة','حوكمة الذكاء الاصطناعي']},
    o:{en:'Cloud-native modular design, zero-trust access control and built-in encryption, accelerating venture creation and cross-border investment.',
       ar:'تصميم سحابي وحدوي، وتحكّم وصول انعدام الثقة، وتشفير مدمج، لتسريع تأسيس المشاريع والاستثمار العابر للحدود.'} },
  { icon:'⚡', kind:{en:'AI-Native Platform', ar:'منصة ذكاء اصطناعي'},
    t:{en:'Rapid Force Cyber Fusion', ar:'Rapid Force لدمج العمليات السيبرانية'},
    d:{en:'An AI-native cybersecurity platform that improves how organisations detect, validate and respond to threats, combining threat intelligence, automated analysis and decision support.',
       ar:'منصة أمن سيبراني مبنية على الذكاء الاصطناعي تُحسّن كيفية كشف المؤسسات للتهديدات والتحقق منها والاستجابة لها، تجمع الاستخبارات والتحليل الآلي ودعم القرار.'},
    g:{en:['Threat Validation','Automation','Enterprise'], ar:['التحقق من التهديدات','أتمتة','مؤسسات']},
    o:{en:'Evidence-based validation, modular integration and analyst oversight that improves response efficiency without replacing human expertise.',
       ar:'تحقّق مبني على الأدلة، وتكامل وحدوي، وإشراف بشري يرفع كفاءة الاستجابة دون استبدال الخبرة الإنسانية.'} },
  { icon:'🛡️', kind:{en:'AI Platform', ar:'منصة ذكاء اصطناعي'},
    t:{en:'Securify', ar:'Securify'},
    d:{en:'An AI-powered platform for security professionals and leaders to create, manage and enhance cybersecurity knowledge, content and operational assets, from threat intelligence to compliance.',
       ar:'منصة مدعومة بالذكاء الاصطناعي تمكّن المختصين والقادة من إنشاء وإدارة وتطوير المعرفة والمحتوى والأصول التشغيلية الأمنية، من الاستخبارات إلى الامتثال.'},
    g:{en:['Content','Compliance','Research'], ar:['محتوى','امتثال','بحث']},
    o:{en:'Intelligent generation of policies and content, AI-driven threat-intel guidance, and specialised tools for education, research and branding.',
       ar:'توليد ذكي للسياسات والمحتوى، وتوجيه استخباري بالذكاء الاصطناعي، وأدوات متخصصة للتعليم والبحث والعلامة المهنية.'} },
  { icon:'📦', kind:{en:'Logistics OS', ar:'نظام تشغيل لوجستي'},
    t:{en:'Faris', ar:'فارس'},
    d:{en:'An AI-powered logistics operating system for food delivery fleets, restaurants, cloud kitchens and third-party logistics providers in Saudi Arabia.',
       ar:'نظام تشغيل لوجستي مدعوم بالذكاء الاصطناعي لأساطيل التوصيل والمطاعم والمطابخ السحابية ومزوّدي خدمات اللوجستيات في السعودية.'},
    g:{en:['Vision 2030','Fleet Ops','Analytics'], ar:['رؤية 2030','عمليات الأساطيل','تحليلات']},
    o:{en:'Unified fleet and financial operations, driver performance analytics and real-time business intelligence, aligned with Saudi Vision 2030.',
       ar:'عمليات أساطيل ومالية موحّدة، وتحليلات أداء السائقين، وذكاء أعمال لحظي، متوافق مع رؤية السعودية 2030.'} },
  { icon:'🌐', kind:{en:'Open Source', ar:'مفتوح المصدر'},
    t:{en:'NorthStar (ORIG)', ar:'NorthStar: الرسم المعرفي المفتوح للموارد'},
    d:{en:'An open-source, community-driven Resource Intelligence Platform that turns fragmented information into a structured, searchable knowledge graph of tools, platforms and communities.',
       ar:'منصة استخبارات موارد مفتوحة المصدر يقودها المجتمع، تحوّل المعلومات المشتّتة إلى رسم معرفي منظّم وقابل للبحث للأدوات والمنصات والمجتمعات.'},
    g:{en:['Knowledge Graph','Community','Open Data'], ar:['رسم معرفي','مجتمع','بيانات مفتوحة']},
    o:{en:'Preserves discoveries lost across feeds and chats, with AI-assisted curation and a scalable open ecosystem.',
       ar:'يحفظ ما يضيع من اكتشافات بين المنصات والمحادثات، عبر تنسيق بمساعدة الذكاء الاصطناعي ومنظومة مفتوحة قابلة للتوسّع.'} },
];

const TIMELINE = [
  { date:{en:'2023 - Present', ar:'2023 - حتى الآن'}, role:{en:'Founder / CEO', ar:'المؤسس والرئيس التنفيذي'},
    org:{en:'Arabc0n Cyber Security · Riyadh, Saudi Arabia', ar:'Arabc0n للأمن السيبراني · الرياض، السعودية'},
    d:{en:'Founded a specialist offensive security firm delivering ethical hacking, red teaming and threat simulation. 10+ red-team assessments across government and enterprise, built and led a five-person elite ethical hacking unit, and scaled the brand through keynotes and cyber forums.',
       ar:'أسّست شركة متخصصة في الأمن الهجومي تقدّم الاختراق الأخلاقي والفريق الأحمر ومحاكاة التهديدات. أكثر من 10 عمليات تقييم أمني للجهات الحكومية والشركات، وبناء وقيادة وحدة نخبة تضم خمسة خبراء، وتوسيع حضور العلامة عبر المؤتمرات والمنتديات السيبرانية.'},
    current:true },
  { date:'2019', role:{en:'Command & Control Center', ar:'مركز القيادة والتحكم'},
    org:{en:'General Directorate of Water · Najran, Saudi Arabia', ar:'الإدارة العامة للمياه · نجران، السعودية'},
    d:{en:'Monitored CCTV and PLC units across water stations and the network links into the C&C center, repaired and replaced cameras and hardware, and operated the NOC helpdesk system.',
       ar:'متابعة كاميرات المراقبة ووحدات PLC في محطات المياه وشبكات الربط بمركز القيادة والتحكم، وصيانة واستبدال الكاميرات والأجهزة، وتشغيل نظام الدعم الفني في مركز العمليات.'} },
  { date:'2019', role:{en:'Network & CCTV Technician', ar:'فني شبكات وكاميرات'},
    org:{en:'Computer Village · Najran, Saudi Arabia', ar:'Computer Village · نجران، السعودية'},
    d:{en:'Network and CCTV installation and maintenance, backup and recovery operations, and consultations for shops, companies and individuals.',
       ar:'تركيب وصيانة شبكات وكاميرات المراقبة، وإدارة النسخ الاحتياطي والاستعادة، وتقديم الاستشارات والحلول للمحلات والشركات والأفراد.'} },
  { date:{en:'2009 - 2018', ar:'2009 - 2018'}, role:{en:'Chief Information Security Officer (CISO)', ar:'رئيس أمن المعلومات (CISO)'},
    org:{en:'National Telecom Corporation (NCTR) · Khartoum, Sudan', ar:'الهيئة القومية للاتصالات (NCTR) · الخرطوم، السودان'},
    d:{en:'Monitored networks for breaches and investigated violations, ran penetration testing and vulnerability discovery, kept business-critical application systems available, and protected the organisation against IT risk for close to a decade.',
       ar:'مراقبة شبكات المؤسسة للكشف عن الاختراقات والتحقيق في المخالفات، وتنفيذ اختبارات الاختراق واكتشاف الثغرات، وضمان جاهزية الأنظمة التشغيلية، وحماية الشركة من المخاطر التقنية لقرابة عشر سنوات.'} },
  { date:{en:'2006 - 2008', ar:'2006 - 2008'}, role:{en:'Information Security Advisor', ar:'مستشار أمن معلومات'},
    org:{en:'Shortcut Technology · Khartoum, Sudan', ar:'Shortcut Technology · الخرطوم، السودان'},
    d:{en:'Secured government websites, hardened business firewalls alongside the development team, and provided security consultation to governmental companies and institutions.',
       ar:'تأمين مواقع حكومية وتحصين الجدار الناري للأعمال مع فريق التطوير، وتقديم الاستشارات والحلول الأمنية لشركات ومؤسسات حكومية.'} },
  { date:{en:'2003 - 2005', ar:'2003 - 2005'}, role:{en:'Network & Technical Support', ar:'شبكات ودعم فني'},
    org:{en:'Babkier Net · Khartoum, Sudan', ar:'Babkier Net · الخرطوم، السودان'},
    d:{en:'Early career in networking and technical support, the foundation of a career spent understanding how systems actually break.',
       ar:'بداية المسيرة في الشبكات والدعم الفني، الأساس الذي بُنيت عليه سنوات من فهم كيف تتعطّل الأنظمة فعلياً.'} },
];

const CREDS = [
  { icon:'🎓', t:{en:'Professional Doctorate in Information Security', ar:'دكتوراه مهنية في أمن المعلومات'}, s:{en:'Nevada University', ar:'جامعة نيفادا'}, y:'2023' },
  { icon:'🎓', t:{en:'Professional Doctorate in Information Security', ar:'دكتوراه مهنية في أمن المعلومات'}, s:{en:'American Association of Innovation (AAI)', ar:'الرابطة الأمريكية للابتكار (AAI)'}, y:'2023' },
  { icon:'🛡️', t:{en:'Certified Ethical Hacker (CEH v9)', ar:'مخترق أخلاقي معتمد (CEH v9)'}, s:{en:'EC-Council', ar:'EC-Council'}, y:'' },
  { icon:'👤', t:{en:'Certified Information Security Officer (CISO)', ar:'رئيس أمن معلومات معتمد (CISO)'}, s:{en:'Professional Certification', ar:'شهادة مهنية'}, y:'' },
  { icon:'🧬', t:{en:'Advanced Malware Reverse Engineering', ar:'هندسة عكسية متقدمة للبرمجيات الخبيثة'}, s:{en:'Marshal Institute · Malaysia', ar:'معهد مارشال · ماليزيا'}, y:'2017' },
  { icon:'📱', t:{en:'Android Development, Exploitation & Reverse Engineering', ar:'تطوير أندرويد واستغلال ثغراته وهندسته العكسية'}, s:{en:'Marshal Institute · Malaysia', ar:'معهد مارشال · ماليزيا'}, y:'2017' },
  { icon:'🌐', t:{en:'IPv6 Forum Verified', ar:'معتمد من منتدى IPv6'}, s:{en:'IPv6 Forum', ar:'منتدى IPv6'}, y:'' },
  { icon:'🦜', t:{en:'Parrot Ambassador', ar:'سفير Parrot'}, s:{en:'Parrot Security · Community Award', ar:'Parrot Security · جائزة مجتمعية'}, y:'' },
];

const INTERESTS = [
  { icon:'🔐', t:{en:'Cybersecurity infrastructure projects', ar:'مشاريع البنية التحتية الأمنية'},
    d:{en:'Red teaming, security architecture, threat intelligence programmes.', ar:'الفريق الأحمر، المعمارية الأمنية، برامج استخبارات التهديدات.'} },
  { icon:'🌱', t:{en:'Innovation ecosystem development', ar:'تطوير منظومات الابتكار'},
    d:{en:'Ecosystem design, founder support, cross-border collaboration.', ar:'تصميم المنظومات، دعم المؤسسين، التعاون العابر للحدود.'} },
  { icon:'🤖', t:{en:'AI-powered solutions', ar:'حلول قائمة على الذكاء الاصطناعي'},
    d:{en:'Applied AI, automation and decision-support platforms.', ar:'الذكاء الاصطناعي التطبيقي، الأتمتة، منصات دعم القرار.'} },
  { icon:'🌍', t:{en:'Regional digital transformation', ar:'التحول الرقمي الإقليمي'},
    d:{en:'Arab world connectivity, Vision 2030 alignment, national-scale initiatives.', ar:'الربط في العالم العربي، التوافق مع رؤية 2030، المبادرات الوطنية.'} },
];

const SESSIONS = [
  { id:'discovery', dur:20, price:0, t:{en:'Discovery Call', ar:'مكالمة تعارف'},
    d:{en:'A short intro call to scope your security or platform challenge.', ar:'مكالمة تعريفية قصيرة لتحديد نطاق التحدي الأمني أو التقني.'} },
  { id:'technical', dur:45, price:20, t:{en:'Technical Deep Dive', ar:'جلسة تقنية معمقة'},
    d:{en:'Architecture review, threat modelling or platform deep dive with your team.', ar:'مراجعة معمارية أو نمذجة تهديدات أو تحليل معمق للمنصة مع فريقك.'} },
  { id:'advisory', dur:60, price:50, t:{en:'Advisory Retainer Intro', ar:'جلسة استشارية تمهيدية'},
    d:{en:'Scoping ongoing executive advisory and governance support.', ar:'تحديد نطاق الاستشارات التنفيذية ودعم الحوكمة المستمر.'} },
];

/* Localised price label: 0 renders as "Free" / "مجاناً" */
function priceLabel(s) {
  if (!s || s.price === 0) return t('rt.free');
  return LANG === 'ar' ? s.price + ' دولاراً' : '$' + s.price;
}

const KINDS = [
  { id:'joint_research', en:'Joint research', ar:'بحث مشترك' },
  { id:'red_team', en:'Red team engagement', ar:'مهمة فريق أحمر' },
  { id:'ai_logistics', en:'AI & logistics', ar:'ذكاء اصطناعي ولوجستيات' },
  { id:'ecosystem', en:'Ecosystem & community', ar:'المنظومة والمجتمع' },
  { id:'speaking', en:'Speaking & panels', ar:'محاضرات وجلسات نقاش' },
  { id:'other', en:'Other', ar:'أخرى' },
];

const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
};
const DOW = {
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  ar: ['ح','ن','ث','ر','خ','ج','س'],
};
const DOW_FULL = {
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
};

/* ------------------------------------------------------------------ *
 * State + helpers
 * ------------------------------------------------------------------ */
let LANG = 'en';

/*
 * Present when the visitor arrives from the questionnaire page, as
 * /?qref=QNR-XXXX#booking. Sent along with the booking so the two
 * records can be read together.
 */
const Q_REF = (function () {
  try {
    return new URLSearchParams(window.location.search).get('qref') || '';
  } catch (_) { return ''; }
})();
try {
  const saved = localStorage.getItem('ma-lang');
  if (saved === 'en' || saved === 'ar') LANG = saved;
} catch (_) {}

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function t(key, vars) {
  let s = (T[LANG] && T[LANG][key]) || (T.en[key]) || key;
  if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  return s;
}
const pick = (o) => (o && (o[LANG] !== undefined ? o[LANG] : o.en)) || '';

/* Renders a trusted, developer-authored string. Translation values carry
   real markup such as <strong> and <span>, which is why HTML is written
   here at all. Never pass visitor input to this: use setText. */
function setRich(el, str) {
  if (el) el.innerHTML = str == null ? '' : String(str);
}
/* The safe companion: assigns text, so nothing is ever parsed as markup.
   Use this for anything that came from a visitor or from the server. */
function setText(el, str) {
  if (el) el.textContent = str == null ? '' : String(str);
}

/* Riyadh = UTC+3, no DST */
function riyadhNow() { return new Date(Date.now() + 3 * 3600 * 1000); }
function riyadhYMD() { const d = riyadhNow(); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() }; }

/* ------------------------------------------------------------------ *
 * i18n apply
 * ------------------------------------------------------------------ */
function applyI18n() {
  const html = document.documentElement;
  html.lang = LANG;
  html.dir = LANG === 'ar' ? 'rtl' : 'ltr';

  $$('[data-i18n]').forEach((el) => setRich(el, t(el.getAttribute('data-i18n'))));
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });

  $$('.lang-opt').forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-lang') === LANG));

  document.title = LANG === 'ar'
    ? 'د. محمد الأمين · قائد أمن سيبراني ومؤسس'
    : 'Dr. Mohammed Al Amin · Cybersecurity Leader & Founder';

  renderSkills(); renderFocus(); renderServices(); renderInitiatives();
  renderTimeline(); renderCreds(); renderInterests(); renderKinds();
  renderSessions(); renderCalendar(/*keepState*/ true); renderSummary();
}

/* ------------------------------------------------------------------ *
 * Renderers
 * ------------------------------------------------------------------ */
function renderSkills() {
  const box = $('#skillChips'); if (!box) return;
  box.innerHTML = SKILLS[LANG].map((s) => '<span class="chip">' + esc(s) + '</span>').join('');
}

function renderFocus() {
  const box = $('#focusGrid'); if (!box) return;
  box.innerHTML = FOCUS.map((f) =>
    '<article class="focus-card"><h3><i aria-hidden="true">' + f.icon + '</i>' + esc(pick(f.t)) + '</h3><p>' + esc(pick(f.d)) + '</p></article>'
  ).join('');
}

function renderServices() {
  const box = $('#expertiseGrid'); if (!box) return;
  box.innerHTML = SERVICES.map((s) =>
    '<article class="card">' +
      '<div class="card-icon" aria-hidden="true">' + s.icon + '</div>' +
      '<h3>' + esc(pick(s.t)) + '</h3>' +
      '<p>' + esc(pick(s.d)) + '</p>' +
      '<div class="card-tags">' + pick(s.g).map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>' +
    '</article>'
  ).join('');
}

function renderInitiatives() {
  const box = $('#initiativesGrid'); if (!box) return;
  box.innerHTML = INITIATIVES.map((p) =>
    '<article class="project">' +
      '<div class="project-top">' +
        '<div class="project-emoji" aria-hidden="true">' + p.icon + '</div>' +
        '<h3><span class="project-kind">' + esc(pick(p.kind)) + '</span>' + esc(pick(p.t)) + '</h3>' +
      '</div>' +
      '<p>' + esc(pick(p.d)) + '</p>' +
      '<div class="project-tags">' + pick(p.g).map((x) => '<span>' + esc(x) + '</span>').join('') + '</div>' +
      '<div class="project-outcome">' + esc(pick(p.o)) + '</div>' +
    '</article>'
  ).join('');
}

function renderTimeline() {
  const box = $('#timeline'); if (!box) return;
  const now = riyadhYMD();
  box.innerHTML = TIMELINE.map((x) => {
    const date = typeof x.date === 'string' ? x.date : pick(x.date);
    return '<li class="tl-item' + (x.current ? ' is-current' : '') + '">' +
      '<span class="tl-date">' + esc(date) + '</span>' +
      '<h3 class="tl-role">' + esc(pick(x.role)) + '</h3>' +
      '<div class="tl-org">' + esc(pick(x.org)) + '</div>' +
      '<p class="tl-desc">' + esc(pick(x.d)) + '</p>' +
    '</li>';
  }).join('');
  void now;
}

function renderCreds() {
  const box = $('#credsGrid'); if (!box) return;
  box.innerHTML = CREDS.map((c) =>
    '<article class="cred"><div class="cred-badge" aria-hidden="true">' + c.icon + '</div>' +
      '<div><h4>' + esc(pick(c.t)) + '</h4><span>' + esc(pick(c.s)) + '</span>' +
      (c.y ? '<em>' + esc(c.y) + '</em>' : '') + '</div></article>'
  ).join('');
}

function renderInterests() {
  const box = $('#interestList'); if (!box) return;
  box.innerHTML = INTERESTS.map((x) =>
    '<li><b aria-hidden="true">' + x.icon + '</b><div>' + esc(pick(x.t)) + '<span>' + esc(pick(x.d)) + '</span></div></li>'
  ).join('');
}

function renderKinds() {
  const sel = $('#clKind'); if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = KINDS.map((k) => '<option value="' + k.id + '">' + esc(pick({ en: k.en, ar: k.ar })) + '</option>').join('');
  if (prev && KINDS.some((k) => k.id === prev)) sel.value = prev;
}

/* ------------------------------------------------------------------ *
 * Booking calendar
 * ------------------------------------------------------------------ */
let curYear, curMonth;                 // month being displayed
let monthData = null;                  // {days:[{date,slots:[{time,available}]}]}
let selType = 'discovery';
let selDate = null, selTime = null;
let loadingMonth = false;

function monthKey(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }

function renderSessions() {
  const box = $('#sessionTypes'); if (!box) return;
  box.innerHTML = SESSIONS.map((s) =>
    '<button type="button" class="stype' + (s.id === selType ? ' is-on' : '') + '" data-type="' + s.id + '" role="radio" aria-checked="' + (s.id === selType) + '">' +
      '<span class="stype-radio" aria-hidden="true"></span>' +
      '<span class="stype-body"><strong>' + esc(pick(s.t)) + '</strong><span>' + esc(pick(s.d)) + '</span></span>' +
      '<span class="stype-meta">' +
        '<span class="stype-price' + (s.price === 0 ? ' is-free' : '') + '">' + esc(priceLabel(s)) + '</span>' +
        '<span class="stype-dur">' + s.dur + (LANG === 'ar' ? ' دقيقة' : ' min') + '</span>' +
      '</span>' +
    '</button>'
  ).join('');
}

function dayMap() {
  const map = {};
  if (monthData && monthData.days) monthData.days.forEach((d) => { map[d.date] = d; });
  return map;
}

async function loadMonth() {
  const grid = $('#calGrid'), status = $('#calStatus');
  if (!grid) return;
  if (loadingMonth) return;
  loadingMonth = true;

  const key = monthKey(curYear, curMonth);
  $('#calTitle').textContent = MONTHS[LANG][curMonth] + ' ' + curYear;

  const base = riyadhYMD();
  $('#calPrev').disabled = (curYear < base.y) || (curYear === base.y && curMonth <= base.m);

  grid.innerHTML = '<div class="cal-status" style="grid-column:1/-1">' + esc(t('rt.loading')) + '</div>';
  drawDow();

  try {
    const res = await fetch('/api/slots?month=' + key + '&type=' + selType);
    if (!res.ok) throw new Error('bad status');
    monthData = await res.json();
  } catch (e) {
    monthData = null;
    grid.innerHTML = '';
    if (status) { status.hidden = false; status.className = 'cal-status is-err'; status.textContent = t('rt.errGeneric'); }
    loadingMonth = false;
    return;
  }
  loadingMonth = false;

  if (status) { status.hidden = true; status.className = 'cal-status'; }
  drawGrid();

  // refresh the slot strip for the selected day (availability may have changed)
  if (selDate && selDate.slice(0, 7) === key) drawSlots();
  else { const s = $('#slots'); if (s) s.hidden = true; }
}

function drawDow() {
  const box = $('#calDow'); if (!box) return;
  const names = DOW[LANG];
  box.innerHTML = names.map((n) => '<span>' + esc(n) + '</span>').join('');
}

function drawGrid() {
  const grid = $('#calGrid'); if (!grid) return;
  const map = dayMap();
  const first = new Date(Date.UTC(curYear, curMonth, 1));
  const offset = first.getUTCDay();                       // 0 = Sunday
  const total = new Date(Date.UTC(curYear, curMonth + 1, 0)).getUTCDate();

  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="cal-cell is-out" aria-hidden="true"></div>';

  for (let d = 1; d <= total; d++) {
    const dateStr = monthKey(curYear, curMonth) + '-' + String(d).padStart(2, '0');
    const dow = new Date(Date.UTC(curYear, curMonth, d)).getUTCDay();
    const info = map[dateStr];
    const openCount = info ? info.slots.filter((s) => s.available).length : 0;
    const closed = (dow === 5 || dow === 6) || !info;

    const cls = ['cal-cell'];
    if (closed) cls.push('is-empty'); else cls.push('is-open');
    if (selDate === dateStr) cls.push('is-sel');

    const label = closed ? t('bk.lgFull') : t('rt.slotsFor') + ' ' + formatDate(dateStr);
    html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + dateStr + '"' +
      (closed ? ' disabled aria-disabled="true"' : '') +
      ' aria-label="' + esc(label) + '" role="gridcell">' +
      '<span class="dnum">' + d + '</span>' +
      (openCount ? '<span class="ddot" aria-hidden="true"></span>' : '') +
      '</button>';
  }
  grid.innerHTML = html;

  if (!Object.keys(map).length) {
    const st = $('#calStatus');
    if (st) { st.hidden = false; st.className = 'cal-status'; st.textContent = t('rt.noDays'); }
  }
}

function drawSlots() {
  const wrap = $('#slots'), head = $('#slotsHead'), chips = $('#slotChips');
  if (!wrap || !head) return;
  const info = dayMap()[selDate];
  if (!info) { wrap.hidden = true; return; }

  wrap.hidden = false;
  head.innerHTML = '<strong>' + esc(formatDate(selDate)) + '</strong> · ' + esc(t('rt.minutes', { n: currentSession().dur })) + ' · ' + esc(t('rt.tz'));

  const open = info.slots.filter((s) => s.available);
  if (!open.length) {
    chips.innerHTML = '<div class="cal-status">' + esc(t('rt.slotsNone')) + '</div>';
    return;
  }
  chips.innerHTML = open.map((s) =>
    '<button type="button" class="slot-chip' + (selTime === s.time ? ' is-on' : '') + '" data-time="' + s.time + '">' + esc(s.time) + '</button>'
  ).join('');
}

function currentSession() { return SESSIONS.filter((s) => s.id === selType)[0] || SESSIONS[0]; }

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayName = DOW_FULL[LANG][dow];
  const sep = LANG === 'ar' ? '، ' : ', ';
  return dayName + sep + d + ' ' + MONTHS[LANG][m - 1] + ' ' + y;
}

function renderSummary() {
  const box = $('#bookSummary'), btn = $('#bkSubmit');
  if (!box) return;
  if (!selDate || !selTime) {
    box.innerHTML = '<span class="summary-empty">' + esc(t('bk.noSlot')) + '</span>';
    if (btn) btn.disabled = true;
    return;
  }
  const s = currentSession();
  box.innerHTML =
    '<div class="summary-row hl"><span>' + esc(t('rt.lblSession')) + '</span><span>' + esc(pick(s.t)) + '</span></div>' +
    '<div class="summary-row"><span>' + esc(t('rt.lblDate')) + '</span><span>' + esc(formatDate(selDate)) + '</span></div>' +
    '<div class="summary-row"><span>' + esc(t('rt.lblTime')) + '</span><span>' + esc(selTime) + ' ' + esc(t('rt.tz')) + '</span></div>' +
    '<div class="summary-row"><span>' + esc(t('rt.lblDuration')) + '</span><span>' + esc(t('rt.minutes', { n: s.dur })) + '</span></div>' +
    '<div class="summary-row fee"><span>' + esc(t('rt.lblFee')) + '</span><span>' + esc(priceLabel(s)) + '</span></div>';
  if (btn) btn.disabled = false;
}

function renderCalendar(keep) {
  const title = $('#calTitle');
  if (title) title.textContent = MONTHS[LANG][curMonth] + ' ' + curYear;
  if (!keep) return;
  drawDow();
  if (monthData) drawGrid();
  if (selDate) drawSlots();
  renderSummary();
}

function resetBookingForm() {
  $('#bkName').value = ''; $('#bkEmail').value = ''; $('#bkOrg').value = ''; $('#bkNotes').value = '';
  $$('#bookingForm .field').forEach((f) => f.classList.remove('has-err'));
}

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */
function showFieldError(id, msg) {
  const input = document.getElementById(id);
  const field = input && input.closest('.field');
  if (!field) return;
  field.classList.add('has-err');
  const err = field.querySelector('.err');
  if (err) err.textContent = msg;
}
function clearErrors(form) { $$('.field', form).forEach((f) => f.classList.remove('has-err')); }
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

async function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const name = $('#bkName').value.trim();
  const email = $('#bkEmail').value.trim();
  let bad = false;
  if (!name) { showFieldError('bkName', t('rt.errName')); bad = true; }
  if (!validEmail(email)) { showFieldError('bkEmail', t('rt.errEmail')); bad = true; }
  if (!selDate || !selTime) {
    const st = $('#calStatus');
    if (st) { st.hidden = false; st.className = 'cal-status is-err'; st.textContent = t('rt.errSlot'); }
    bad = true;
  }
  if (bad) return;

  const btn = $('#bkSubmit');
  btn.disabled = true; btn.textContent = t('rt.sending');

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: selType, date: selDate, time: selTime,
        name: name, email: email,
        org: $('#bkOrg').value.trim(), notes: $('#bkNotes').value.trim(),
        questionnaireRef: Q_REF,
      }),
    });
    const data = await res.json();

    if (res.status === 409) {
      const st = $('#calStatus');
      if (st) { st.hidden = false; st.className = 'cal-status is-err'; st.textContent = t('rt.errTaken'); }
      selTime = null;
      await loadMonth();
      renderSummary();
      btn.disabled = false; btn.textContent = t('bk.confirm');
      return;
    }
    if (!res.ok) throw new Error((data && data.message) || 'error');

    const s = currentSession();
    form.hidden = true;
    const done = $('#bookDone');
    done.hidden = false;
    $('#doneSub').textContent = t('rt.doneSub', { session: pick(s.t), date: formatDate(selDate), time: selTime });
    setText($('#doneRef'), data.booking.ref);
    const feeEl = $('#doneFee');
    if (feeEl) feeEl.textContent = t('rt.feeLine', { price: priceLabel(s) });
  } catch (err) {
    const st = $('#calStatus');
    if (st) { st.hidden = false; st.className = 'cal-status is-err'; st.textContent = t('rt.errGeneric'); }
    btn.disabled = false; btn.textContent = t('bk.confirm');
  }
}

async function submitCollab(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const name = $('#clName').value.trim();
  const email = $('#clEmail').value.trim();
  const message = $('#clMsg').value.trim();
  let bad = false;
  if (!name) { showFieldError('clName', t('rt.errName')); bad = true; }
  if (!validEmail(email)) { showFieldError('clEmail', t('rt.errEmail')); bad = true; }
  if (message.length < 10) { showFieldError('clMsg', t('rt.errMessage')); bad = true; }
  if (bad) return;

  const btn = $('#clSubmit');
  btn.disabled = true; btn.textContent = t('rt.sending');

  try {
    const res = await fetch('/api/collaborations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name, email: email, org: $('#clOrg').value.trim(),
        kind: $('#clKind').value, link: $('#clLink').value.trim(), message: message,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data && data.message) || 'error');

    form.hidden = true;
    const done = $('#clDone');
    done.hidden = false;
    $('#clDoneSub').textContent = t('rt.clDoneSub', { name: name, email: email });
    setText($('#clDoneRef'), data.ref);
  } catch (err) {
    showFieldError('clMsg', t('rt.errGeneric'));
    btn.disabled = false; btn.textContent = t('cl.send');
  }
}

/* ------------------------------------------------------------------ *
 * Chrome: nav, reveal, counters, scrollspy
 * ------------------------------------------------------------------ */
function initChrome() {
  const nav = $('#nav');
  const bar = $('#scrollProgress');
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-stuck', y > 12);
    if (bar) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger'), links = $('#navLinks');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') { links.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  // scrollspy
  const sections = ['about','expertise','initiatives','journey','credentials','collaborate']
    .map((id) => document.getElementById(id)).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        $$('.nav-links a').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // reveal
  const revealables = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) { setTimeout(() => en.target.classList.add('is-in'), i * 60); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  // counters
  const counters = $$('.stat-num[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const dur = 1100, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach(runCounter);
  }

  const y = $('#year'); if (y) y.textContent = String(riyadhNow().getUTCFullYear());
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
function initBooking() {
  const base = riyadhYMD();
  curYear = base.y; curMonth = base.m;

  /* Arrived from the questionnaire: tell them the answers are attached. */
  const linked = $('#qLinked');
  if (linked && Q_REF) {
    linked.hidden = false;
    linked.textContent = t('booking.linked') + ' (' + Q_REF + ')';
  }

  $('#sessionTypes').addEventListener('click', (e) => {
    const btn = e.target.closest('.stype'); if (!btn) return;
    selType = btn.getAttribute('data-type');
    selTime = null;
    renderSessions(); renderSummary();
    loadMonth();
  });

  $('#calGrid').addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-cell'); if (!cell || cell.disabled) return;
    selDate = cell.getAttribute('data-date');
    selTime = null;
    drawGrid(); drawSlots(); renderSummary();
  });

  $('#slotChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.slot-chip'); if (!chip) return;
    selTime = chip.getAttribute('data-time');
    drawSlots(); renderSummary();
  });

  $('#calPrev').addEventListener('click', () => {
    curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; }
    loadMonth();
  });
  $('#calNext').addEventListener('click', () => {
    curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; }
    loadMonth();
  });

  $('#bookingForm').addEventListener('submit', submitBooking);
  $('#bkReset').addEventListener('click', () => {
    $('#bookDone').hidden = true;
    const form = $('#bookingForm'); form.hidden = false;
    $('#bkSubmit').disabled = false; $('#bkSubmit').textContent = t('bk.confirm');
    resetBookingForm();
    selTime = null;
    loadMonth(); renderSummary();
  });

  $('#collabForm').addEventListener('submit', submitCollab);
  $('#clReset').addEventListener('click', () => {
    $('#clDone').hidden = true;
    const form = $('#collabForm'); form.hidden = false;
    $('#clSubmit').disabled = false; $('#clSubmit').textContent = t('cl.send');
    clearErrors(form);
    ['#clName','#clEmail','#clOrg','#clLink','#clMsg'].forEach((s) => { $(s).value = ''; });
  });

  loadMonth();
}

/* Portrait fallback: local photo, then the GitHub avatar, then the "MA"
   monogram. This used to be an inline onerror attribute, which the
   Content-Security-Policy blocks, so it lives here instead. */
function initPortraitFallback() {
  const img = $('#portraitImg');
  if (!img) return;
  const mono = $('#monoFallback');
  const step = () => {
    if (!img.dataset.fb1) {
      img.dataset.fb1 = '1';
      img.src = 'https://avatars.githubusercontent.com/u/93028621?v=4';
      return;
    }
    img.style.display = 'none';
    if (mono) mono.style.display = 'grid';
  };
  img.addEventListener('error', step);
  /* The image may already have failed before this listener was attached. */
  if (img.complete && img.naturalWidth === 0) step();
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = $('#langToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
        LANG = LANG === 'en' ? 'ar' : 'en';
        try { localStorage.setItem('ma-lang', LANG); } catch (_) {}
        applyI18n();
        try {
          document.dispatchEvent(new CustomEvent('ma:langchange', { detail: { lang: LANG } }));
        } catch (_) {}
    });
  }

  initPortraitFallback();
  applyI18n();
  initChrome();
  initBooking();
});

})();
