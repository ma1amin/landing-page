/* ============================================================
   Questionnaire widget · zero dependency

   A timed prompt for the main page. Bilingual copy, RTL aware,
   theme inherited from styles.css, and the call to action opens
   the questionnaire page.

   Public surface:
     window.QUESTIONNAIRE_CONFIG      optional configuration
     window.QUESTIONNAIRE_MANUAL_INIT set true to skip auto start
     window.QuestionnaireWidget.init(config)
     window.questionnaireWidget       live instance once started
   ============================================================ */

(function (window, document) {
  "use strict";

  var LANG_KEY = "ma-lang";                 // shared with the rest of the site
  var MOBILE_MAX = 700;

  /* ---------- Copy ---------- */

  var TEXT = {
    status:      { en: "Open now",                  ar: "مفتوح الآن" },
    label:       { en: "Questionnaire invitation",  ar: "دعوة إلى الاستبيان" },
    close:       { en: "Dismiss questionnaire invitation", ar: "إخفاء دعوة الاستبيان" },
    eyebrow:     { en: "QUESTIONNAIRE / 60 SECONDS", ar: "استبيان · 60 ثانية" },
    title:       { en: "Tell me what you're <span>building.</span>",
                   ar: "أخبرني بما <span>تبنيه.</span>" },
    description: { en: "Eight short questions, about a minute. I read every answer myself, so our first call opens with real context instead of introductions.",
                   ar: "ثمانية أسئلة قصيرة تستغرق نحو دقيقة. أقرأ كل إجابة بنفسي، لتبدأ أول مكالمة بيننا بسياق واضح بدلاً من التعارف المعتاد." },
    points:      { en: ["Eight questions", "About 60 seconds", "No obligation", "Book a call next"],
                   ar: ["ثمانية أسئلة", "نحو 60 ثانية", "دون أي التزام", "ثم احجز جلسة"] },
    ctaLabel:    { en: "Start the questionnaire",   ar: "ابدأ الاستبيان" },
    footnote:    { en: "No sales pitch · Answers reach me directly",
                   ar: "بلا عروض بيعية · تصلني إجاباتك مباشرة" },
    arrow:       { en: "\u2192",                    ar: "\u2190" }
  };

  var DEFAULTS = {
    delay: 3500,
    dismissDays: 14,
    storageKey: "questionnaireWidgetDismissedAt",
    ctaUrl: "/questionnaire",
    draggable: true,
    showOnMobile: true,
    analytics: true,
    debug: false
  };

  /* ---------- Small helpers ---------- */

  function merge(base, extra) {
    var result = {}, key;
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) result[key] = base[key];
    for (key in extra) if (Object.prototype.hasOwnProperty.call(extra, key)) result[key] = extra[key];
    return result;
  }

  function currentLang() {
    try {
      var saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch (_) {}
    return document.documentElement.lang === "ar" ? "ar" : "en";
  }

  /* Resolves a { en, ar } pair, or passes plain values straight through. */
  function pick(value, lang) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value[lang] !== undefined ? value[lang] : value.en;
    }
    return value;
  }

  /* For text nodes: neutralises markup. */
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /*
   * For attribute values: also neutralises quotes so a value can
   * never break out of its attribute. The original escaped only
   * & < >, which left href="" open to a stray double quote.
   */
  function escapeAttr(value) {
    return escapeHtml(value)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon() {
    return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function track(config, action, detail) {
    if (!config.analytics) return;
    var payload = { event: "questionnaire_widget", action: action, detail: detail || null };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    try {
      document.dispatchEvent(new CustomEvent("questionnaire:" + action, { detail: payload }));
    } catch (_) {}
    if (config.debug && window.console) console.info("[QuestionnaireWidget]", payload);
  }

  function isDismissed(config) {
    try {
      var saved = Number(window.localStorage.getItem(config.storageKey));
      return saved && (Date.now() - saved) < config.dismissDays * 86400000;
    } catch (_) { return false; }
  }

  function saveDismissal(config) {
    try { window.localStorage.setItem(config.storageKey, String(Date.now())); } catch (_) {}
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  /* ---------- Markup ---------- */

  function createMarkup(config, lang) {
    var points = pick(TEXT.points, lang).map(function (point) {
      return "<li>" + icon() + escapeHtml(point) + "</li>";
    }).join("");

    var element = document.createElement("aside");
    element.className = "questionnaire-widget";
    element.setAttribute("aria-label", pick(TEXT.label, lang));
    element.innerHTML =
      '<div class="questionnaire-widget-card">' +
        '<div class="questionnaire-widget-head" data-q-drag-handle>' +
          '<span class="questionnaire-widget-status">' +
            '<i class="questionnaire-widget-dot"></i>' +
            '<span data-q-text="status">' + escapeHtml(pick(TEXT.status, lang)) + '</span>' +
          '</span>' +
          '<button class="questionnaire-widget-close" type="button" data-q-attr="close">' +
            '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<p class="questionnaire-widget-kicker" data-q-text="eyebrow">' +
          escapeHtml(pick(TEXT.eyebrow, lang)) +
        '</p>' +
        /* title is trusted author copy so the amber <span> works */
        '<h2 class="questionnaire-widget-title" data-q-html="title">' +
          pick(TEXT.title, lang) +
        '</h2>' +
        '<p class="questionnaire-widget-copy" data-q-text="description">' +
          escapeHtml(pick(TEXT.description, lang)) +
        '</p>' +
        '<ul class="questionnaire-widget-points" data-q-html="points">' + points + '</ul>' +
        '<a class="questionnaire-widget-cta" data-q-href href="' + escapeAttr(config.ctaUrl) + '">' +
          '<span data-q-text="ctaLabel">' + escapeHtml(pick(TEXT.ctaLabel, lang)) + '</span>' +
          '<span class="questionnaire-widget-arrow" aria-hidden="true" data-q-text="arrow">' +
            pick(TEXT.arrow, lang) +
          '</span>' +
        '</a>' +
        '<p class="questionnaire-widget-foot" data-q-text="footnote">' +
          escapeHtml(pick(TEXT.footnote, lang)) +
        '</p>' +
      '</div>';
    return element;
  }

  /* Rewrites every translated string without rebuilding the widget. */
  function applyLang(element, config, lang) {
    element.setAttribute("aria-label", pick(TEXT.label, lang));
    element.querySelectorAll("[data-q-text]").forEach(function (node) {
      node.textContent = pick(TEXT[node.getAttribute("data-q-text")], lang);
    });
    element.querySelectorAll("[data-q-html]").forEach(function (node) {
      var key = node.getAttribute("data-q-html");
      node.innerHTML = key === "points"
        ? pick(TEXT.points, lang).map(function (p) {
            return "<li>" + icon() + escapeHtml(p) + "</li>";
          }).join("")
        : pick(TEXT[key], lang);
    });
    var close = element.querySelector("[data-q-attr='close']");
    if (close) close.setAttribute("aria-label", pick(TEXT.close, lang));
    var cta = element.querySelector("[data-q-href]");
    if (cta) cta.setAttribute("href", escapeAttr(config.ctaUrl));
  }

  /* ---------- Dragging ---------- */

  function enableDrag(element, handle, config) {
    if (!config.draggable || !window.PointerEvent) return;
    var active = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function clamp(left, top) {
      var maxX = window.innerWidth - element.offsetWidth - 8;
      var maxY = window.innerHeight - element.offsetHeight - 8;
      return {
        left: Math.max(8, Math.min(maxX, left)),
        top: Math.max(8, Math.min(maxY, top))
      };
    }

    handle.addEventListener("pointerdown", function (event) {
      if (event.target.closest("button, a") || isMobile()) return;
      var rect = element.getBoundingClientRect();
      active = true;
      startX = event.clientX; startY = event.clientY;
      startLeft = rect.left; startTop = rect.top;
      element.style.insetInlineEnd = "auto";
      element.style.insetBlockEnd = "auto";
      element.style.left = rect.left + "px";
      element.style.top = rect.top + "px";
      element.classList.add("q-is-dragging");
      handle.setPointerCapture(event.pointerId);
      track(config, "drag_start");
    });

    handle.addEventListener("pointermove", function (event) {
      if (!active) return;
      var next = clamp(startLeft + event.clientX - startX, startTop + event.clientY - startY);
      element.style.left = next.left + "px";
      element.style.top = next.top + "px";
    });

    function stop() {
      if (!active) return;
      active = false;
      element.classList.remove("q-is-dragging");
      track(config, "drag_end");
    }

    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);

    /*
     * Keep a dragged card on screen if the window is resized.
     * Without this the card keeps its old pixel offset and can end
     * up outside the viewport.
     */
    window.addEventListener("resize", function () {
      if (!element.style.left) return;
      var next = clamp(parseFloat(element.style.left) || 0, parseFloat(element.style.top) || 0);
      element.style.left = next.left + "px";
      element.style.top = next.top + "px";
    });
  }

  /* ---------- Start ---------- */

  function init(userConfig) {
    var config = merge(DEFAULTS, userConfig || window.QUESTIONNAIRE_CONFIG || {});
    if (document.querySelector(".questionnaire-widget") || isDismissed(config)) return null;
    if (!config.showOnMobile && window.matchMedia("(max-width: " + MOBILE_MAX + "px)").matches) return null;

    var lang = currentLang();
    var element = createMarkup(config, lang);
    document.body.appendChild(element);

    var closeButton = element.querySelector(".questionnaire-widget-close");
    var cta = element.querySelector(".questionnaire-widget-cta");

    closeButton.addEventListener("click", function () {
      saveDismissal(config);
      element.classList.remove("q-is-visible");
      track(config, "dismiss");
      window.setTimeout(function () { element.remove(); }, 300);
    });

    cta.addEventListener("click", function () {
      track(config, "cta_click", config.ctaUrl);
    });

    enableDrag(element, element.querySelector("[data-q-drag-handle]"), config);

    /* Follow the site language switch instead of staying in English. */
    document.addEventListener("ma:langchange", function (event) {
      applyLang(element, config, event.detail && event.detail.lang === "ar" ? "ar" : "en");
    });

    window.setTimeout(function () {
      element.classList.add("q-is-visible");
      track(config, "impression");
    }, Math.max(0, Number(config.delay) || 0));

    return {
      element: element,
      dismiss: function () { closeButton.click(); },
      show: function () { element.classList.add("q-is-visible"); },
      hide: function () { element.classList.remove("q-is-visible"); },
      reset: function () {
        try { window.localStorage.removeItem(config.storageKey); } catch (_) {}
      }
    };
  }

  window.QuestionnaireWidget = { init: init, defaults: DEFAULTS, text: TEXT };

  if (!window.QUESTIONNAIRE_MANUAL_INIT) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.questionnaireWidget = init();
      });
    } else {
      window.questionnaireWidget = init();
    }
  }
})(window, document);
