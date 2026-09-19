/* ============================================================
   Questionnaire page · zero dependency

   Eight qualifying questions, then contact details. Submissions
   go to POST /api/questionnaire, which stores and emails them
   immediately. On success the visitor is sent to the booking
   calendar with the reference attached, so a completed booking
   links back to these answers. If they never book, the answers
   are already saved.
   ============================================================ */

(function () {
  "use strict";

  var LANG_KEY = "ma-lang";

  /* ------------------------------------------------------------------
     Questions. English wording is the reference set; Arabic is a
     professional register rather than a literal back-translation.
     Values sent to the server are the English strings so the stored
     record stays readable.
     ------------------------------------------------------------------ */

  var QUESTIONS = [
    {
      id: "problem",
      type: "multi",
      q: { en: "What is the real problem you need solved?",
           ar: "ما المشكلة الحقيقية التي تحتاج إلى حلّها؟" },
      options: [
        { en: "Launch before my competitors do",                         ar: "الإطلاق قبل المنافسين" },
        { en: "Growth is outpacing our engineering capacity",            ar: "نموّنا يتجاوز طاقتنا الهندسية" },
        { en: "We need senior engineers without the hiring overhead",    ar: "نحتاج مهندسين كباراً دون أعباء التوظيف" },
        { en: "We are burning money on tech that does not work",         ar: "نهدر المال على تقنية لا تعمل" },
        { en: "Our legacy system is a liability we cannot afford to ignore", ar: "نظامنا القديم عبء لا نستطيع تجاهله" },
        { en: "We need AI built into our product before we fall behind", ar: "نحتاج إدراج الذكاء الاصطناعي في منتجنا قبل أن نتأخر" },
        { en: "We want to enter a new market this year",                 ar: "نريد دخول سوق جديد هذا العام" },
        { en: "We have an idea but no technical co-founder",             ar: "لدينا فكرة دون شريك تقني" },
        { en: "We need to rebuild from scratch the right way",           ar: "نحتاج إعادة البناء من الصفر بالطريقة الصحيحة" },
        { en: "Something else",                                          ar: "أمر آخر" }
      ]
    },
    {
      id: "urgency",
      type: "single",
      q: { en: "How urgently do you need this?",
           ar: "ما مدى استعجالك لهذا؟" },
      options: [
        { en: "We are already behind and need to start now",             ar: "متأخرون بالفعل ونحتاج البدء الآن" },
        { en: "Within 90 days, planning is done",                        ar: "خلال 90 يوماً، والتخطيط منتهٍ" },
        { en: "3 to 6 months out but I want the best team secured",      ar: "خلال 3 إلى 6 أشهر، وأريد تأمين أفضل فريق" },
        { en: "6 to 12 months, but I want to start conversations now",   ar: "من 6 إلى 12 شهراً، لكن أريد بدء الحوار الآن" },
        { en: "Still evaluating but I am serious about moving forward",  ar: "ما زلت أقيّم، لكنني جاد في المضي قدماً" }
      ]
    },
    {
      id: "budget",
      type: "single",
      optional: true,
      q: { en: "What is your investment range? (USD)",
           ar: "ما نطاق استثمارك؟ (دولار أمريكي)" },
      options: [
        { en: "Under $10K, validating the idea",                         ar: "أقل من 10 آلاف دولار، للتحقق من الفكرة" },
        { en: "$10K to $25K, building to validate",                      ar: "من 10 إلى 25 ألف دولار، للبناء والتحقق" },
        { en: "$25K to $50K, serious about shipping",                    ar: "من 25 إلى 50 ألف دولار، جادون في الإطلاق" },
        { en: "$50K to $100K, ready to scale",                           ar: "من 50 إلى 100 ألف دولار، جاهزون للتوسّع" },
        { en: "$100K and above, full product investment",                ar: "100 ألف دولار فأكثر، استثمار كامل في المنتج" },
        { en: "Not sure yet, need guidance on this",                     ar: "لست متأكداً بعد، أحتاج توجيهاً في هذا" }
      ]
    },
    {
      id: "engineering",
      type: "single",
      q: { en: "What is your current engineering situation?",
           ar: "ما وضعك الهندسي الحالي؟" },
      options: [
        { en: "In-house team that is stretched thin",                    ar: "فريق داخلي منهك" },
        { en: "External vendor that is underdelivering",                 ar: "مزوّد خارجي لا يفي بالمتطلب" },
        { en: "No team yet, starting from scratch",                      ar: "لا فريق بعد، نبدأ من الصفر" },
        { en: "Solo technical founder who needs more hands",             ar: "مؤسس تقني وحيد يحتاج دعماً" },
        { en: "Non-technical founder who needs everything",              ar: "مؤسس غير تقني يحتاج كل شيء" }
      ]
    },
    {
      id: "stage",
      type: "single",
      q: { en: "Where is your company right now?",
           ar: "أين شركتك اليوم؟" },
      options: [
        { en: "Pre-revenue and racing to launch",                        ar: "ما قبل الإيرادات، ونسابق للإطلاق" },
        { en: "Funded and need to move fast",                            ar: "حصلنا على تمويل ونحتاج التحرك بسرعة" },
        { en: "Growing SMB ready to build properly",                     ar: "شركة نامية جاهزة للبناء بشكل صحيح" },
        { en: "Established enterprise needing specialized depth",        ar: "مؤسسة راسخة تحتاج عمقاً تخصصياً" },
        { en: "Government or public sector organization",                ar: "جهة حكومية أو مؤسسة عامة" }
      ]
    },
    {
      id: "win",
      type: "multi",
      q: { en: "What does a win look like for you in 6 months?",
           ar: "كيف يبدو النجاح بالنسبة لك بعد 6 أشهر؟" },
      options: [
        { en: "Product live and acquiring real users",                   ar: "منتج مطروح يستقطب مستخدمين حقيقيين" },
        { en: "Engineering team fully onboarded and shipping fast",      ar: "فريق هندسي مكتمل ينجز بسرعة" },
        { en: "Costs cut without losing quality",                        ar: "خفض التكاليف دون المساس بالجودة" },
        { en: "A new revenue stream is live",                            ar: "تدفّق إيرادات جديد يعمل" },
        { en: "Technical debt cleared and codebase future-proof",        ar: "سداد الدين التقني وجاهزية الكود للمستقبل" },
        { en: "AI features live in production",                          ar: "خصائص ذكاء اصطناعي مطبّقة في الإنتاج" },
        { en: "A new market entered and validated",                      ar: "دخول سوق جديد والتحقق منه" }
      ]
    },
    {
      id: "blocker",
      type: "single",
      q: { en: "What is holding you back from moving forward right now?",
           ar: "ما الذي يعطّلك عن المضي قدماً الآن؟" },
      options: [
        { en: "Nothing, I am ready to talk",                             ar: "لا شيء، أنا جاهز للحديث" },
        { en: "Still searching for the right partner",                   ar: "ما زلت أبحث عن الشريك المناسب" },
        { en: "Budget approval is in progress",                          ar: "اعتماد الميزانية قيد الإجراء" },
        { en: "Comparing a few options",                                 ar: "أقارن بين عدة خيارات" },
        { en: "Not sure if outsourcing is the right call",               ar: "لست متأكداً إن كان التعهيد هو الخيار الصحيح" },
        { en: "I need to see proof before committing",                   ar: "أحتاج رؤية أدلة قبل الالتزام" },
        { en: "Internal alignment is still needed",                      ar: "ما زال التوافق الداخلي مطلوباً" }
      ]
    },
    {
      id: "source",
      type: "single",
      q: { en: "Where did you hear about me?",
           ar: "كيف علمت عني؟" },
      options: [
        { en: "ChatGPT",                          ar: "ChatGPT" },
        { en: "Claude",                           ar: "Claude" },
        { en: "Perplexity",                       ar: "Perplexity" },
        { en: "Gemini",                           ar: "Gemini" },
        { en: "Google search",                    ar: "بحث جوجل" },
        { en: "LinkedIn",                         ar: "لينكدإن" },
        { en: "Referral (friend or colleague)",   ar: "توصية (صديق أو زميل)" },
        { en: "Clutch or G2",                     ar: "Clutch أو G2" },
        { en: "X (Twitter)",                      ar: "إكس (تويتر)" },
        { en: "YouTube",                          ar: "يوتيوب" },
        { en: "Blog or article",                  ar: "مدونة أو مقال" },
        { en: "Event or conference",              ar: "فعالية أو مؤتمر" },
        { en: "Other",                            ar: "أخرى" }
      ]
    }
  ];

  var ROLES = [
    { en: "Founder / CEO",           ar: "مؤسس / رئيس تنفيذي" },
    { en: "CTO / VP Engineering",    ar: "مدير تقني / نائب رئيس هندسي" },
    { en: "Product Manager",         ar: "مدير منتج" },
    { en: "Developer",               ar: "مطوّر" },
    { en: "Designer",                ar: "مصمّم" },
    { en: "Marketing / Growth",      ar: "تسويق / نموّ" },
    { en: "Operations",              ar: "عمليات" },
    { en: "Investor",                ar: "مستثمر" },
    { en: "Other",                   ar: "أخرى" }
  ];

  /* ------------------------------------------------------------------
     Interface copy
     ------------------------------------------------------------------ */

  var T = {
    en: {
      "brand.name": "Dr. Mohammed Al Amin",
      "brand.role": "Cybersecurity Leader · Founder",
      "nav.about": "About", "nav.expertise": "Expertise", "nav.initiatives": "Initiatives",
      "nav.journey": "Journey", "nav.credentials": "Credentials", "nav.collaborate": "Collaborate",
      "nav.questionnaire": "Questionnaire", "nav.book": "Book a Call",
      "foot.tag": "Security infrastructure · Logistics technology · Innovation ecosystems",
      "foot.contact": "Contact", "foot.social": "Elsewhere", "foot.markets": "Markets",
      "foot.loc": "Riyadh, Saudi Arabia", "foot.marketsList": "Saudi Arabia · Sudan · GCC",
      "foot.langs": "Arabic · English", "foot.rights": "All rights reserved.",
      "foot.built": "Built secure by default.",
      "q.eyebrow": "Questionnaire",
      "q.title": "Request a Consultation",
      "q.lead": "Eight short questions, about a minute. Your answers reach me directly, so our first call opens with real context instead of introductions.",
      "q.a1": "No sales pitch at the end",
      "q.a2": "You can book a call right after",
      "q.a3": "Your answers stay with me",
      "q.answered": "answered",
      "q.contactTitle": "Your details",
      "q.first": "First name", "q.last": "Last name", "q.email": "Email",
      "q.phone": "Phone number", "q.company": "Company name", "q.role": "Your role",
      "q.about": "Briefly describe what you are building", "q.opt": "(optional)",
      "q.submit": "Request Consultation",
      "q.submitNote": "No sales pitch. Just a straightforward conversation.",
      "q.consent": "By submitting, you agree that I may keep these answers and contact you about your enquiry.",
      "q.doneTitle": "Answers received",
      "q.doneSub": "Saved. Opening the calendar so you can pick a time.",
      "q.nextEyebrow": "After you send",
      "q.nextTitle": "What Happens Next",
      "q.step1Title": "Free Consultation",
      "q.step1Body": "A clear plan covering the architecture and tooling to use, the technical approach, the schedule and the budget.",
      "q.step2Title": "Technical Discussion",
      "q.step2Body": "A short series of conversations about the frameworks and technologies that will turn the idea into something real.",
      "q.step3Title": "Start Work",
      "q.step3Body": "Once you give the nod, work begins on the agreed scope, with the schedule we settled on.",
      "q.multi": "Select all that apply",
      "q.single": "Choose one",
      "q.errRequired": "This field is required.",
      "q.errEmail": "Enter a valid email address.",
      "q.errPhone": "Enter a valid phone number.",
      "q.errSend": "Could not send. Please try again.",
      "q.sending": "Sending…",
      "q.selectRole": "Select your role"
    },
    ar: {
      "brand.name": "د. محمد الأمين",
      "brand.role": "قائد أمن سيبراني · مؤسس",
      "nav.about": "نبذة عني", "nav.expertise": "الخبرات", "nav.initiatives": "المبادرات",
      "nav.journey": "المسار المهني", "nav.credentials": "المؤهلات", "nav.collaborate": "التعاون",
      "nav.questionnaire": "الاستبيان", "nav.book": "احجز جلسة",
      "foot.tag": "بنية أمنية · تقنية لوجستية · منظومات ابتكار",
      "foot.contact": "تواصل", "foot.social": "في مكان آخر", "foot.markets": "الأسواق",
      "foot.loc": "الرياض، المملكة العربية السعودية", "foot.marketsList": "السعودية · السودان · دول الخليج",
      "foot.langs": "العربية · الإنجليزية", "foot.rights": "جميع الحقوق محفوظة.",
      "foot.built": "مبنى آمناً بشكل افتراضي.",
      "q.eyebrow": "الاستبيان",
      "q.title": "اطلب استشارة",
      "q.lead": "ثمانية أسئلة قصيرة تستغرق نحو دقيقة. تصلني إجاباتك مباشرة، لتبدأ أول مكالمة بيننا بسياق واضح بدلاً من التعارف المعتاد.",
      "q.a1": "بلا عروض بيعية في النهاية",
      "q.a2": "يمكنك حجز جلسة مباشرة بعدها",
      "q.a3": "إجاباتك تبقى لديّ",
      "q.answered": "أُجيب عليها",
      "q.contactTitle": "بياناتك",
      "q.first": "الاسم الأول", "q.last": "اسم العائلة", "q.email": "البريد الإلكتروني",
      "q.phone": "رقم الهاتف", "q.company": "اسم الشركة", "q.role": "دورك",
      "q.about": "اشرح بإيجاز ما تبنيه", "q.opt": "(اختياري)",
      "q.submit": "اطلب استشارة",
      "q.submitNote": "بلا عروض بيعية. مجرد حديث مباشر.",
      "q.consent": "بالإرسال، أنت توافق على احتفاظي بهذه الإجابات والتواصل معك بشأن طلبك.",
      "q.doneTitle": "تم استلام الإجابات",
      "q.doneSub": "تم الحفظ. جارٍ فتح التقويم لتختار الوقت المناسب.",
      "q.nextEyebrow": "بعد الإرسال",
      "q.nextTitle": "ما يحدث بعد ذلك",
      "q.step1Title": "استشارة مجانية",
      "q.step1Body": "خطة واضحة تغطي البنية التقنية والأدوات المناسبة، والمقاربة الفنية، والجدول الزمني، والميزانية.",
      "q.step2Title": "نقاش تقني",
      "q.step2Body": "سلسلة قصيرة من الجلسات حول الأطر والتقنيات التي تحوّل الفكرة إلى واقع ملموس.",
      "q.step3Title": "بدء العمل",
      "q.step3Body": "بمجرد موافقتك، يبدأ العمل على النطاق المتفق عليه وفق الجدول الذي أعددناه.",
      "q.multi": "اختر كل ما ينطبق",
      "q.single": "اختر إجابة واحدة",
      "q.errRequired": "هذا الحقل مطلوب.",
      "q.errEmail": "أدخل بريداً إلكترونياً صحيحاً.",
      "q.errPhone": "أدخل رقم هاتف صحيحاً.",
      "q.errSend": "تعذّر الإرسال. يرجى المحاولة مرة أخرى.",
      "q.sending": "جارٍ الإرسال…",
      "q.selectRole": "اختر دورك"
    }
  };

  /* ------------------------------------------------------------------
     State and helpers
     ------------------------------------------------------------------ */

  var LANG = "en";
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function t(key) {
    var dict = T[LANG] || T.en;
    return dict[key] !== undefined ? dict[key] : (T.en[key] !== undefined ? T.en[key] : key);
  }

  function lang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch (_) {}
    return document.documentElement.lang === "ar" ? "ar" : "en";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------ */

  function renderQuestions() {
    var box = $("#qQuestions");
    if (!box) return;

    box.innerHTML = QUESTIONS.map(function (question, index) {
      var number = String(index + 1).padStart(2, "0");
      var hint = question.type === "multi" ? t("q.multi") : t("q.single");
      var inputType = question.type === "multi" ? "checkbox" : "radio";

      var options = question.options.map(function (option) {
        return '' +
          '<label class="q-opt">' +
            '<input type="' + inputType + '" name="q-' + question.id + '" value="' + escapeHtml(option.en) + '" />' +
            '<span>' + escapeHtml(option[ LANG ] || option.en) + '</span>' +
          '</label>';
      }).join("");

      return '' +
        '<fieldset class="q-block" data-type="' + question.type + '">' +
          '<legend class="q-legend">' +
            '<span class="q-num mono">' + number + '</span>' +
            '<span class="q-q">' + escapeHtml(question.q[LANG] || question.q.en) +
              (question.optional ? ' <span class="opt">' + t("q.opt") + '</span>' : '') +
            '</span>' +
            '<span class="q-hint mono">' + hint + '</span>' +
          '</legend>' +
          '<div class="q-options">' + options + '</div>' +
        '</fieldset>';
    }).join("");

    var total = $("#qTotal");
    if (total) total.textContent = String(QUESTIONS.length);

    $$("#qQuestions input").forEach(function (input) {
      input.addEventListener("change", function () {
        markPicked();
        updateProgress();
      });
    });

    updateProgress();
  }

  /*
   * Radios and checkboxes are visually hidden, so the picked state is
   * mirrored onto the label. Radios deselect a sibling automatically,
   * so every control in the page is refreshed rather than just one.
   */
  function markPicked() {
    $$("#qQuestions input").forEach(function (input) {
      var label = input.closest(".q-opt");
      if (label) label.classList.toggle("is-picked", input.checked);
    });
  }

  function renderRoles() {
    var select = $("#qRole");
    if (!select) return;
    select.innerHTML =
      '<option value="">' + escapeHtml(t("q.selectRole")) + "</option>" +
      ROLES.map(function (role) {
        return '<option value="' + escapeHtml(role.en) + '">' + escapeHtml(role[LANG] || role.en) + "</option>";
      }).join("");
  }

  function updateProgress() {
    var answered = QUESTIONS.filter(function (question) {
      return $$('input[name="q-' + question.id + '"]:checked').length > 0;
    }).length;

    var count = $("#qCount");
    var bar = $("#qProgressBar");
    if (count) count.textContent = String(answered);
    if (bar) bar.style.width = Math.round((answered / QUESTIONS.length) * 100) + "%";
  }

  /* ------------------------------------------------------------------
     Validation and submit
     ------------------------------------------------------------------ */

  function setFieldError(id, message) {
    var input = document.getElementById(id);
    if (!input) return;
    var field = input.closest(".field");
    var slot = document.querySelector('[data-err="' + id + '"]');
    if (field) field.classList.toggle("has-err", Boolean(message));
    if (slot) slot.textContent = message || "";
  }

  function clearErrors() {
    ["qFirst", "qLast", "qEmail", "qPhone", "qCompany", "qRole"].forEach(function (id) {
      setFieldError(id, "");
    });
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function isPhone(value) {
    var digits = value.replace(/[^0-9]/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }

  function collectAnswers() {
    return QUESTIONS.map(function (question) {
      var checked = $$('input[name="q-' + question.id + '"]:checked');
      return {
        id: question.id,
        question: question.q.en,
        type: question.type,
        values: checked.map(function (input) { return input.value; })
      };
    });
  }

  async function submit(event) {
    event.preventDefault();
    clearErrors();

    var first = $("#qFirst").value.trim();
    var last = $("#qLast").value.trim();
    var email = $("#qEmail").value.trim();
    var phone = $("#qPhone").value.trim();
    var company = $("#qCompany").value.trim();
    var role = $("#qRole").value;

    var ok = true;
    if (!first) { setFieldError("qFirst", t("q.errRequired")); ok = false; }
    if (!last) { setFieldError("qLast", t("q.errRequired")); ok = false; }
    if (!isEmail(email)) { setFieldError("qEmail", email ? t("q.errEmail") : t("q.errRequired")); ok = false; }
    if (!isPhone(phone)) { setFieldError("qPhone", phone ? t("q.errPhone") : t("q.errRequired")); ok = false; }
    if (!company) { setFieldError("qCompany", t("q.errRequired")); ok = false; }
    if (!role) { setFieldError("qRole", t("q.errRequired")); ok = false; }

    if (!ok) {
      var firstError = document.querySelector(".field.has-err");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    var button = $("#qSubmit");
    var original = button.textContent;
    button.disabled = true;
    button.textContent = t("q.sending");

    try {
      var response = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first,
          lastName: last,
          email: email,
          phone: phone,
          company: company,
          role: role,
          about: $("#qAbout").value.trim(),
          locale: LANG,
          answers: collectAnswers()
        })
      });

      if (!response.ok) throw new Error("bad status");
      var data = await response.json();

      var form = $("#qForm");
      var done = $("#qDone");
      var sub = $("#qDoneSub");
      if (sub) sub.textContent = t("q.doneSub") + " (" + (data.ref || "") + ")";
      if (done) done.hidden = false;
      if (form) {
        $$("#qForm fieldset, #qForm .q-contact, #qForm .q-progress, #qForm .q-progress-label, #qSubmit, #qForm .form-note")
          .forEach(function (node) { node.style.display = "none"; });
      }

      /* Answers are already stored. Send them on to the calendar. */
      window.setTimeout(function () {
        window.location.href = "/?qref=" + encodeURIComponent(data.ref || "") + "#booking";
      }, 1700);
    } catch (_) {
      button.disabled = false;
      button.textContent = original;
      var note = $(".q-consent");
      if (note) {
        note.textContent = t("q.errSend");
        note.style.color = "var(--danger)";
      }
    }
  }

  /* ------------------------------------------------------------------
     Chrome: language, nav, scroll bar, year
     ------------------------------------------------------------------ */

  function applyI18n() {
    var html = document.documentElement;
    html.lang = LANG;
    html.dir = LANG === "ar" ? "rtl" : "ltr";

    $$("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    $$(".lang-opt").forEach(function (el) {
      el.classList.toggle("is-on", el.getAttribute("data-lang") === LANG);
    });

    document.title = LANG === "ar"
      ? "الاستبيان · د. محمد الأمين"
      : "Questionnaire · Dr. Mohammed Al Amin";

    renderQuestions();
    renderRoles();
  }

  function initChrome() {
    var toggle = $("#langToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        LANG = LANG === "en" ? "ar" : "en";
        try { localStorage.setItem(LANG_KEY, LANG); } catch (_) {}
        applyI18n();
        try {
          document.dispatchEvent(new CustomEvent("ma:langchange", { detail: { lang: LANG } }));
        } catch (_) {}
      });
    }

    var burger = $("#burger");
    var navLinks = $("#navLinks");
    if (burger && navLinks) {
      burger.addEventListener("click", function () {
        var open = navLinks.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
      navLinks.addEventListener("click", function (event) {
        if (event.target.tagName === "A") {
          navLinks.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }

    var bar = $("#scrollProgress");
    if (bar) {
      window.addEventListener("scroll", function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      }, { passive: true });
    }

    var year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", function () {
    LANG = lang();
    initChrome();
    applyI18n();

    var form = $("#qForm");
    if (form) form.addEventListener("submit", submit);
  });
})();
