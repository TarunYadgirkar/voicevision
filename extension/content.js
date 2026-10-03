"use strict";
(() => {
  // src/lib/filters.ts
  var SIMULATION_MATRICES = {
    deuteranopia: [
      [0.367, 0.861, -0.228],
      [0.28, 0.673, 0.047],
      [-0.012, 0.043, 0.969]
    ],
    protanopia: [
      [0.152, 0.848, 0],
      [0.114, 0.886, 0],
      [0, 0.094, 0.906]
    ],
    tritanopia: [
      [1, 0.168, -0.168],
      [0, 0.92, 0.08],
      [0, 0.923, 0.077]
    ]
  };
  var IDENTITY = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  var SHIFT_MATRICES = {
    protanopia: [
      [0, 0, 0],
      [0.7, 1, 0],
      [0.7, 0, 1]
    ],
    deuteranopia: [
      [0, 0, 0],
      [0.7, 1, 0],
      [0.7, 0, 1]
    ],
    tritanopia: [
      [1, 0, 0.7],
      [0, 1, 0.7],
      [0, 0, 0]
    ]
  };
  function multiply(a, b) {
    return a.map((row) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
  }
  function subtract(a, b) {
    return a.map((row, i) => row.map((v, j) => v - b[i][j]));
  }
  function add(a, b) {
    return a.map((row, i) => row.map((v, j) => v + b[i][j]));
  }
  var CORRECTION_MATRICES = {
    deuteranopia: buildCorrection("deuteranopia"),
    protanopia: buildCorrection("protanopia"),
    tritanopia: buildCorrection("tritanopia")
  };
  function buildCorrection(type) {
    return add(IDENTITY, multiply(SHIFT_MATRICES[type], subtract(IDENTITY, SIMULATION_MATRICES[type])));
  }
  var COLOR_MATRICES = {
    simulate: SIMULATION_MATRICES,
    correct: CORRECTION_MATRICES
  };
  var DICHROMACY_TYPES = ["deuteranopia", "protanopia", "tritanopia"];
  var COLOR_ASSIST_MODES = ["simulate", "correct"];
  function blendMatrixValues(matrix, t) {
    const rows = matrix.map(
      (row, i) => row.map((v, j) => {
        const identityVal = IDENTITY[i][j];
        return (identityVal * (1 - t) + v * t).toFixed(3);
      })
    );
    return [...rows.map((row) => `${row.join(" ")} 0 0`), "0 0 0 1 0"].join("\n");
  }
  function updateColorMatrices(intensity, idPrefix = "") {
    for (const assist of COLOR_ASSIST_MODES) {
      for (const mode of DICHROMACY_TYPES) {
        const el = document.getElementById(`${idPrefix}${mode}-${assist}-matrix`);
        if (el) el.setAttribute("values", blendMatrixValues(COLOR_MATRICES[assist][mode], intensity));
      }
    }
  }
  function colorPart(state, idPrefix) {
    const intensity = state.intensities.colorMode;
    if (state.colorMode === "achromatopsia") {
      return state.colorAssist === "simulate" ? `grayscale(${Math.round(intensity * 100)}%)` : `contrast(${Math.round(100 + 60 * intensity)}%)`;
    }
    if (!state.colorMode) return null;
    return `url(#${idPrefix}${state.colorMode}-${state.colorAssist})`;
  }
  function invertParts(state) {
    const { intensities } = state;
    if (state.darkMode) return [`invert(${Math.round(93 * intensities.darkMode)}%) hue-rotate(180deg)`];
    if (state.invertColors) return [`invert(${Math.round(100 * intensities.invertColors)}%) hue-rotate(180deg)`];
    return [];
  }
  function toneParts(state) {
    const { intensities } = state;
    const parts = [];
    if (state.warmTone) parts.push(`sepia(${Math.round(25 * intensities.warmTone)}%)`);
    if (state.highContrast) parts.push(`contrast(${Math.round(100 + 50 * intensities.highContrast)}%)`);
    if (state.blur) {
      parts.push(`contrast(${Math.round(100 + 60 * intensities.blur)}%)`);
      parts.push(`brightness(${Math.round(100 + 15 * intensities.blur)}%)`);
    }
    return parts;
  }
  function brightnessParts(state) {
    if (state.brightness !== null) return [`brightness(${state.brightness})`];
    if (state.darkMode) return [`brightness(${(1 - 0.2 * state.intensities.darkMode).toFixed(2)})`];
    return [];
  }
  function buildFilterString(state, idPrefix = "") {
    const parts = [
      colorPart(state, idPrefix),
      ...invertParts(state),
      ...toneParts(state),
      ...brightnessParts(state)
    ].filter((part) => part !== null);
    return parts.join(" ") || "none";
  }
  var readingStyles = /* @__PURE__ */ new Map();
  var readingObserver = null;
  var WRAP_PROPERTIES = ["white-space", "overflow-wrap", "max-width", "min-width"];
  var READING_SELECTOR = "input:not([type]),input[type=text],input[type=email],input[type=search],input[type=tel],input[type=url],input[type=number],textarea,[contenteditable],div,section,article,main,header,footer,p,li,dt,dd,blockquote,h1,h2,h3,h4,h5,h6,span,a,label,td,th,pre,code";
  var CONTROL_SELECTOR = 'button,input[type=password],input[type=checkbox],input[type=radio],input[type=submit],input[type=button],input[type=file],select,[role="button"],[role="slider"],[data-vv-controls]';
  function restoreReadingStyles() {
    for (const [element, original] of readingStyles) {
      for (const property of original.wrapProperties) element.style.setProperty(property.name, property.value, property.priority);
      if (original.fontValue) element.style.setProperty("font-size", original.fontValue, original.fontPriority);
      else element.style.removeProperty("font-size");
      if (original.lineValue) element.style.setProperty("line-height", original.lineValue, original.linePriority);
      else element.style.removeProperty("line-height");
    }
  }
  function clearReadingPreferences() {
    readingObserver?.disconnect();
    readingObserver = null;
    restoreReadingStyles();
    readingStyles.clear();
  }
  function applyTextWrapping(element, active) {
    if (!active || element.matches("input")) return;
    element.style.setProperty("white-space", "pre-wrap", "important");
    element.style.setProperty("overflow-wrap", "anywhere", "important");
    element.style.setProperty("max-width", "100%", "important");
    element.style.setProperty("min-width", "0", "important");
  }
  function applyReadingPreferences(state) {
    if (state.textScale === 1 && state.lineSpacing === 1.6 && !state.textWrap) {
      clearReadingPreferences();
      return;
    }
    readingObserver?.disconnect();
    restoreReadingStyles();
    for (const element of readingStyles.keys()) {
      if (!element.isConnected) readingStyles.delete(element);
    }
    const elements = Array.from(document.querySelectorAll(READING_SELECTOR)).filter((element) => !element.closest(CONTROL_SELECTOR)).filter((element) => !/^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER)$/.test(element.tagName) || Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) && !element.querySelector(CONTROL_SELECTOR));
    for (const element of elements) {
      if (readingStyles.has(element)) continue;
      readingStyles.set(element, {
        wrapProperties: WRAP_PROPERTIES.map((name) => ({ name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) })),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        fontValue: element.style.getPropertyValue("font-size"),
        fontPriority: element.style.getPropertyPriority("font-size"),
        lineValue: element.style.getPropertyValue("line-height"),
        linePriority: element.style.getPropertyPriority("line-height")
      });
    }
    for (const element of elements) {
      const original = readingStyles.get(element);
      element.style.setProperty("font-size", `${original.fontSize * state.textScale}px`, "important");
      element.style.setProperty("line-height", String(state.lineSpacing), "important");
      applyTextWrapping(element, state.textWrap);
    }
    readingObserver = new MutationObserver(() => applyReadingPreferences(state));
    readingObserver.observe(document.body, { childList: true, subtree: true });
  }
  function applyDimOverlay(active, intensity) {
    let overlay = document.getElementById("vv-dim-overlay");
    if (!active) {
      if (overlay) overlay.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "vv-dim-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483645;pointer-events:none;background:black;";
      document.documentElement.appendChild(overlay);
    }
    overlay.style.opacity = (0.15 + intensity * 0.45).toFixed(2);
  }
  var BOLD_TEXT_CSS = `body, p, span, a, li, h1, h2, h3, h4, h5, h6, label, button, td, th, input, textarea {
  font-weight: 600 !important;
}`;
  function applyBoldText(active) {
    let style = document.getElementById("vv-bold-text-style");
    if (!active) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = "vv-bold-text-style";
      style.textContent = BOLD_TEXT_CSS;
      document.head.appendChild(style);
    }
  }
  var REDUCE_MOTION_CSS = `*, *::before, *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}`;
  function applyReduceMotion(active) {
    let style = document.getElementById("vv-reduce-motion-style");
    if (!active) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = "vv-reduce-motion-style";
      style.textContent = REDUCE_MOTION_CSS;
      document.head.appendChild(style);
    }
    document.querySelectorAll("video[autoplay]").forEach((v) => v.pause());
  }
  function applyZoom(zoom, intensity) {
    let overlay = document.getElementById("vv-zoom-overlay");
    if (zoom === "full") {
      if (overlay) overlay.remove();
      const root = document.documentElement;
      root.style.zoom = `${Math.round(100 + intensity * 150)}%`;
      return;
    }
    document.documentElement.style.zoom = "";
    if (!zoom) {
      if (overlay) overlay.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "vv-zoom-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
      document.documentElement.appendChild(overlay);
    }
    const visibleRadius = Math.round(45 - intensity * 30);
    const midRadius = Math.min(95, visibleRadius + 25);
    if (zoom === "center") {
      overlay.innerHTML = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vv-mac-grad" cx="50%" cy="50%" r="${visibleRadius}%">
          <stop offset="0%" stop-color="black" stop-opacity="0.7"/>
          <stop offset="60%" stop-color="black" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="black" stop-opacity="0"/>
        </radialGradient>
        <filter id="vv-mac-blur">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#vv-mac-grad)" filter="url(#vv-mac-blur)"/>
    </svg>`;
    } else if (zoom === "peripheral") {
      overlay.innerHTML = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vv-tunnel-grad" cx="50%" cy="50%" r="${midRadius}%">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="${Math.max(10, visibleRadius)}%" stop-color="black" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.92"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#vv-tunnel-grad)"/>
    </svg>`;
    }
  }
  function applyHemianopia(side) {
    let overlay = document.getElementById("vv-hemianopia-overlay");
    if (!side) {
      if (overlay) overlay.remove();
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "vv-hemianopia-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
      document.documentElement.appendChild(overlay);
    }
    const gradientDir = side === "left" ? "to right" : "to left";
    overlay.innerHTML = `<div style="position:absolute;inset:0;width:55%;${side === "right" ? "right:0;left:auto;" : "left:0;"}
    background:linear-gradient(${gradientDir}, black 80%, transparent 100%);"></div>`;
  }
  function resetFilters() {
    clearReadingPreferences();
    const root = document.documentElement;
    document.body.style.filter = "none";
    root.style.colorScheme = "";
    root.style.zoom = "";
    root.classList.remove("vv-dark", "vv-invert");
    const zoomOverlay = document.getElementById("vv-zoom-overlay");
    if (zoomOverlay) zoomOverlay.remove();
    const hemiOverlay = document.getElementById("vv-hemianopia-overlay");
    if (hemiOverlay) hemiOverlay.remove();
    const dimOverlay = document.getElementById("vv-dim-overlay");
    if (dimOverlay) dimOverlay.remove();
    const boldTextStyle = document.getElementById("vv-bold-text-style");
    if (boldTextStyle) boldTextStyle.remove();
    const reduceMotionStyle = document.getElementById("vv-reduce-motion-style");
    if (reduceMotionStyle) reduceMotionStyle.remove();
  }

  // src/lib/intent.ts
  var STEP = 0.2;
  var BASELINE_INTENSITY = 0.5;
  function emptyCommand() {
    return {
      colorMode: null,
      colorAssist: null,
      darkMode: null,
      highContrast: null,
      brightness: null,
      warmTone: null,
      invertColors: null,
      blur: null,
      hemianopia: null,
      zoom: null,
      dimOverlay: null,
      boldText: null,
      reduceMotion: null,
      textWrap: null,
      textScale: null,
      lineSpacing: null,
      intensities: null,
      reset: false,
      explanation: ""
    };
  }
  function normalize(transcript) {
    return transcript.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
  }
  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }
  function stepIntensity(current, key, delta) {
    const base = current.intensities?.[key] ?? BASELINE_INTENSITY;
    return clamp01(Number((base + delta).toFixed(2)));
  }
  var RESET_RE = /\b(reset|start over|go back to normal|back to normal|clear (all|the)? ?filters?|remove all filters|turn everything off|turn it all off|normal vision|undo everything)\b/;
  var OFF_RE = /\b(turn off|switch off|shut off|disable|remove|stop|get rid of|cancel|undo|no more)\b/;
  var OFF_TARGETS = [
    { test: /\b(wrap(ping)?|reflow)\b/, label: "text wrapping", patch: { textWrap: false } },
    { test: /\bdark ?mode\b/, label: "dark mode", patch: { darkMode: false } },
    { test: /\b(high )?contrast\b/, label: "contrast boost", patch: { highContrast: false } },
    { test: /\b(warm ?tone|warmth|night mode|blue light filter)\b/, label: "warm tone", patch: { warmTone: false } },
    { test: /\b(invert(ed)?( colors?)?)\b/, label: "inverted colors", patch: { invertColors: false } },
    { test: /\b(zoom|magnification|magnifier)\b/, label: "zoom", patch: { zoom: null, clear: ["zoom"] } },
    { test: /\b(dim(ming)?( overlay)?|the dimmer)\b/, label: "dimming", patch: { dimOverlay: false } },
    { test: /\bbold( text)?\b/, label: "bold text", patch: { boldText: false } },
    { test: /\b(reduce[d]? motion|the motion filter)\b/, label: "reduced motion", patch: { reduceMotion: false } },
    { test: /\b(color ?blind(ness)?|deuteranopia|protanopia|tritanopia|achromatopsia|the color filter)\b/, label: "color filter", patch: { colorMode: null, clear: ["colorMode"] } },
    { test: /\b(hemianopia|field loss|the side (mask|overlay))\b/, label: "field loss overlay", patch: { hemianopia: null, clear: ["hemianopia"] } },
    { test: /\b(clarity boost|the blur filter|cataract(s)?)\b/, label: "clarity boost", patch: { blur: false } }
  ];
  var RELATIVE_RULES = [
    { test: /\b(wrap (the )?(text|lines|long lines)|word wrap|reflow text)\b/, label: "text wrapping", patch: { textWrap: true } },
    { test: /\b(less glare|reduce glare|softer light)\b/, label: "softer light", patch: { brightness: 0.8, warmTone: true } },
    {
      test: /\b((bigger|larger|increase|enlarge) (the )?(text|font)|(?:text|font)( size)? (bigger|larger)|make (the )?(text|font) (bigger|larger))\b/,
      label: "larger text",
      patch: (c) => ({ textScale: Math.min(2, Number((c.textScale + STEP).toFixed(2))) })
    },
    {
      test: /\b((smaller|decrease|reduce) (the )?(text|font)|(?:text|font)( size)? smaller|make (the )?(text|font) smaller)\b/,
      label: "smaller text",
      patch: (c) => ({ textScale: Math.max(1, Number((c.textScale - STEP).toFixed(2))) })
    },
    {
      test: /\b((more|increase|wider) (line )?spacing|space (the )?lines (out|more))\b/,
      label: "more line spacing",
      patch: (c) => ({ lineSpacing: Math.min(2.4, Number((c.lineSpacing + STEP).toFixed(2))) })
    },
    {
      test: /\b((less|reduce|decrease) (line )?spacing)\b/,
      label: "less line spacing",
      patch: (c) => ({ lineSpacing: Math.max(1.4, Number((c.lineSpacing - STEP).toFixed(2))) })
    },
    {
      test: /\b(darker|make it dimmer|dim it more|too light)\b/,
      label: "darker",
      patch: (c) => c.darkMode ? { intensities: { darkMode: stepIntensity(c, "darkMode", STEP) } } : { darkMode: true }
    },
    {
      test: /\b(lighter|less dark|brighten it|brighter)\b/,
      label: "lighter",
      patch: (c) => {
        const next = stepIntensity(c, "darkMode", -STEP);
        return next === 0 ? { darkMode: false } : { intensities: { darkMode: next } };
      }
    },
    {
      test: /\b(more contrast|increase contrast|higher contrast|punch(ier)? up the contrast)\b/,
      label: "more contrast",
      patch: (c) => ({ highContrast: true, intensities: { highContrast: stepIntensity(c, "highContrast", STEP) } })
    },
    {
      test: /\b(less contrast|lower contrast|reduce contrast)\b/,
      label: "less contrast",
      patch: (c) => ({ intensities: { highContrast: stepIntensity(c, "highContrast", -STEP) } })
    },
    {
      test: /\b(zoom in( more)?|magnify more|make it bigger|even bigger)\b/,
      label: "more zoom",
      patch: (c) => c.zoom ? { intensities: { zoom: stepIntensity(c, "zoom", STEP) } } : { zoom: "full", intensities: { zoom: BASELINE_INTENSITY } }
    },
    {
      test: /\b(zoom out|less zoom|make it smaller)\b/,
      label: "less zoom",
      patch: (c) => ({ intensities: { zoom: stepIntensity(c, "zoom", -STEP) } })
    },
    {
      test: /\b(more severe|stronger|more intense)\b/,
      label: "stronger",
      patch: (c) => ({ intensities: { colorMode: stepIntensity(c, "colorMode", STEP) } })
    },
    {
      test: /\b(less severe|tone it down|milder|weaker)\b/,
      label: "milder",
      patch: (c) => ({ intensities: { colorMode: stepIntensity(c, "colorMode", -STEP) } })
    }
  ];
  var SIMULATE_RE = /\b(simulate|simulation|preview|show me what|what (it|things|colors?) looks? like (for|to)|as a (deuteranope|protanope|tritanope) sees|deuteranope sees|demo mode)\b/;
  var CORRECT_RE = /\b(help me see colors?|correct (my |the )?colors?|fix (my |the )?colors?)\b/;
  var CONDITION_RULES = [
    {
      test: /\b(red[- ]green color ?blind(ness)?|deuteranopia|deuteranomaly|deuteranope|can'?t tell red from green|confuse red and green|red and green (look the same|blend))\b/,
      label: "deuteranopia",
      patch: { colorMode: "deuteranopia" }
    },
    {
      test: /\b(protanopia|protanomaly|protanope|red weakness|reds? looks? dark)\b/,
      label: "protanopia",
      patch: { colorMode: "protanopia" }
    },
    {
      test: /\b(blue[- ]yellow color ?blind(ness)?|tritanopia|tritanomaly|tritanope)\b/,
      label: "tritanopia",
      patch: { colorMode: "tritanopia" }
    },
    {
      test: /\b(achromatopsia|monochrom(e|acy)|no color vision|everything is gr[ae]y)\b/,
      label: "achromatopsia",
      patch: { colorMode: "achromatopsia" }
    },
    {
      test: /\b(everything (is|looks) (blurry|foggy|hazy)|my vision is cloudy|can'?t focus)\b/,
      label: "clarity boost",
      patch: { blur: true }
    },
    {
      test: /\b(macular degeneration|a ?m ?d|central vision loss|blind spot in (the )?cent(er|re))\b/,
      label: "field loss",
      patch: { zoom: "center" }
    },
    {
      test: /\b(glaucoma|tunnel vision|peripheral vision loss|can'?t see the sides|losing my side vision)\b/,
      label: "field loss",
      patch: { zoom: "peripheral" }
    },
    {
      test: /\b(need everything bigger|make (everything|things) (bigger|larger)|can'?t read small text|magnify)\b/,
      label: "magnification",
      patch: { zoom: "full" }
    },
    {
      test: /\b(hemianopia|blind on my left|lost (my )?vision on (my |the )?left|left (visual )?field is gone)\b.*\bleft\b|\bleft (side )?(hemianopia|field loss)\b|\b(blind on|lost vision on) (my |the )?left\b/,
      label: "field loss",
      patch: { hemianopia: "left" }
    },
    {
      test: /\b(right (side )?(hemianopia|field loss))\b|\b(blind on|lost vision on) (my |the )?right\b|\bright (visual )?field is gone\b/,
      label: "field loss",
      patch: { hemianopia: "right" }
    },
    {
      test: /\b(too bright|hurts my eyes|screen is blinding|blinding)\b/,
      label: "dimmed",
      patch: { darkMode: true, brightness: 0.6 }
    },
    {
      test: /\b(dark ?mode|make it dark|too white|white background hurts)\b/,
      label: "dark mode",
      patch: { darkMode: true }
    },
    {
      test: /\b(low contrast|can'?t read the text|text is hard to (see|read)|everything looks faded|washed out)\b/,
      label: "contrast boost",
      patch: { highContrast: true }
    },
    {
      test: /\b(light sensitive|light sensitivity|fluorescent lights bother me|bright lights hurt|screen gives me headaches)\b/,
      label: "photophobia comfort",
      patch: { dimOverlay: true, warmTone: true }
    },
    {
      test: /\b(warm it up|reduce blue light|night mode|warm tone)\b/,
      label: "warm tone",
      patch: { warmTone: true }
    },
    {
      test: /\b(flip the colors?|invert( the)? colors?|reverse colors?)\b/,
      label: "inverted colors",
      patch: { invertColors: true }
    },
    {
      test: /\b(things look (smeared|doubled)|letters look (fuzzy|thin)|bold(er)? text)\b/,
      label: "bold text",
      patch: { boldText: true }
    },
    {
      test: /\b(animations make me dizzy|autoplay videos bother me|reduce motion|moving things make me (nauseous|sick))\b/,
      label: "reduced motion",
      patch: { reduceMotion: true }
    }
  ];
  function mergePatch(command, patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (key === "intensities") {
        command.intensities = { ...command.intensities ?? {}, ...value };
        continue;
      }
      command[key] = value;
    }
  }
  function parseOffCommand(text) {
    const target = OFF_TARGETS.find((t) => t.test.test(text));
    if (!target) return null;
    const command = emptyCommand();
    mergePatch(command, target.patch);
    command.explanation = `Turned off ${target.label}.`;
    return command;
  }
  function resolveColorAssist(text) {
    if (SIMULATE_RE.test(text) && !/\b(no|not|never|don'?t)\b/.test(text)) return "simulate";
    if (CORRECT_RE.test(text)) return "correct";
    return null;
  }
  function parseResetCommand() {
    const command = emptyCommand();
    command.reset = true;
    command.explanation = "Cleared every filter.";
    return command;
  }
  function applyRules(text, current, command) {
    const labels = [];
    for (const rule of [...RELATIVE_RULES, ...CONDITION_RULES]) {
      if (!rule.test.test(text)) continue;
      if (typeof rule.patch !== "function" && rule.patch.colorMode && !/\b(simulate|simulation|preview|show me what|sees|color filter|color adjustment|adjust (the |my )?colors?|help me see colors?|can'?t tell|confuse|look the same|blend|looks? dark)\b/.test(text)) continue;
      const patch = typeof rule.patch === "function" ? rule.patch(current) : rule.patch;
      const isFieldMask = patch.zoom === "center" || patch.zoom === "peripheral" || patch.hemianopia;
      if (isFieldMask) continue;
      mergePatch(command, patch);
      labels.push(rule.label);
    }
    return labels;
  }
  function applyColorAssist(text, current, command) {
    const assist = resolveColorAssist(text);
    if (!assist || assist === "simulate" && !command.colorMode && !current.colorMode) return [];
    command.colorAssist = assist;
    const labels = [];
    if (assist === "correct" && !command.colorMode && !current.colorMode) {
      command.colorMode = "deuteranopia";
      labels.push("deuteranopia");
    }
    labels.push(assist === "correct" ? "color adjustment" : "deficiency preview");
    return labels;
  }
  var FUNCTIONAL_REQUEST_RE = /\b(wrap|wrapping|reflow|larger|bigger|smaller|spacing|contrast|glare|bright|dark|dim|bold|text|letters|read small|magnify|zoom|warm|motion|moving|animations|night mode|help me see colors|can'?t tell|confuse|looks? dark|color filter|adjust|simulate|preview|show me what)\b/;
  var CONDITION_ADVICE_RE = /\b(macular degeneration|a ?m ?d|glaucoma|tunnel vision|central vision loss|peripheral vision loss|field loss|hemianopia|cataracts?|astigmatism|presbyopia|monocular|deuteranopia|protanopia|tritanopia|achromatopsia|color ?blind(ness)?|no color vision|photophobia|migraine|low vision|blind.*(left|right)|lost.*vision.*(left|right))\b/;
  function parseIntent(transcript, current) {
    const text = normalize(transcript);
    if (!text) return null;
    if (RESET_RE.test(text)) return parseResetCommand();
    if (/\b(do not|don'?t|never|no)\b.*\b(wrap|wrapping|reflow)\b/.test(text)) {
      return { ...emptyCommand(), textWrap: false, explanation: "Text wrapping turned off." };
    }
    if (OFF_RE.test(text)) return parseOffCommand(text);
    const command = emptyCommand();
    if (CONDITION_ADVICE_RE.test(text) && !FUNCTIONAL_REQUEST_RE.test(text)) {
      command.explanation = "Settings unchanged. Choose an adjustment for your reading needs; a condition name does not determine the right settings.";
      return command;
    }
    const labels = [...applyRules(text, current, command), ...applyColorAssist(text, current, command)];
    if (labels.length === 0) {
      if (!CONDITION_ADVICE_RE.test(text)) return null;
      command.explanation = "Settings unchanged. Blindness in one eye differs from visual-field loss. Choose text size, spacing, contrast or magnification for your reading needs; these tools do not restore vision.";
      return command;
    }
    command.explanation = `Applied ${labels.join(", ")}.`;
    return command;
  }

  // src/types/index.ts
  var defaultIntensities = {
    colorMode: 1,
    darkMode: 1,
    highContrast: 1,
    warmTone: 1,
    invertColors: 1,
    blur: 0.5,
    zoom: 0.5,
    dimOverlay: 0.5
  };
  var defaultFilterState = {
    colorMode: null,
    colorAssist: "correct",
    darkMode: false,
    highContrast: false,
    brightness: null,
    warmTone: false,
    invertColors: false,
    blur: false,
    hemianopia: null,
    zoom: null,
    dimOverlay: false,
    boldText: false,
    reduceMotion: false,
    textWrap: false,
    textScale: 1,
    lineSpacing: 1.6,
    intensities: defaultIntensities
  };

  // src/lib/persistence.ts
  var STORAGE_KEY = "voicevision.state";
  var SCHEMA_VERSION = 1;
  function boundedNumber(value, fallback, min, max) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }
  function asRecord(value) {
    return value && typeof value === "object" ? value : {};
  }
  function normalizeBrightness(value) {
    return typeof value === "number" && Number.isFinite(value) ? boundedNumber(value, 1, 0.1, 1.5) : null;
  }
  function normalizeFilterState(value) {
    const source = asRecord(value);
    const state = { ...defaultFilterState, intensities: { ...defaultIntensities } };
    const flags = [
      "darkMode",
      "highContrast",
      "warmTone",
      "invertColors",
      "blur",
      "dimOverlay",
      "boldText",
      "reduceMotion",
      "textWrap"
    ];
    for (const flag of flags) {
      if (typeof source[flag] === "boolean") state[flag] = source[flag];
    }
    const colors = ["deuteranopia", "protanopia", "tritanopia", "achromatopsia"];
    state.colorMode = colors.find((color) => source.colorMode === color) ?? null;
    if (source.colorAssist === "simulate") state.colorMode = null;
    state.zoom = source.zoom === "full" ? "full" : null;
    state.brightness = normalizeBrightness(source.brightness);
    state.textScale = boundedNumber(source.textScale, 1, 1, 2);
    state.lineSpacing = boundedNumber(source.lineSpacing, 1.6, 1.4, 2.4);
    const intensities = asRecord(source.intensities);
    for (const key of Object.keys(defaultIntensities)) {
      state.intensities[key] = boundedNumber(intensities[key], defaultIntensities[key], 0, 1);
    }
    return state;
  }
  var BOOT_SCRIPT = `(function(){try{
var r=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||'null');
if(!r||r.version!==${SCHEMA_VERSION}||!r.state)return;
if(r.state.darkMode===true){document.documentElement.classList.add('vv-dark');document.documentElement.style.colorScheme='dark';}
}catch(e){}})();`;

  // src/lib/command.ts
  var BOOLEAN_KEYS = ["darkMode", "highContrast", "warmTone", "invertColors", "blur", "dimOverlay", "boldText", "reduceMotion", "textWrap"];
  var ENUMS = {
    colorMode: ["deuteranopia", "protanopia", "tritanopia", "achromatopsia"],
    colorAssist: ["correct", "simulate"],
    zoom: ["center", "peripheral", "full"],
    hemianopia: ["left", "right"]
  };
  var RANGES = { brightness: [0.1, 1.5], textScale: [1, 2], lineSpacing: [1.4, 2.4] };
  var INTENSITY_KEYS = ["colorMode", "darkMode", "highContrast", "warmTone", "invertColors", "blur", "zoom", "dimOverlay"];
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function inRange(value, min, max) {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  }
  function validFields(value) {
    if (!BOOLEAN_KEYS.every((key) => value[key] == null || typeof value[key] === "boolean")) return false;
    if (!Object.entries(ENUMS).every(([key, options]) => value[key] == null || options.includes(value[key]))) return false;
    return Object.entries(RANGES).every(([key, [min, max]]) => value[key] == null || inRange(value[key], min, max));
  }
  function parseIntensities(value) {
    if (value == null) return null;
    if (!isRecord(value)) return false;
    const result = {};
    for (const key of INTENSITY_KEYS) {
      const item = value[key];
      if (item === void 0) continue;
      if (!inRange(item, 0, 1)) return false;
      result[key] = item;
    }
    return result;
  }
  function validClear(value) {
    return value === void 0 || Array.isArray(value) && value.every((key) => ["zoom", "colorMode", "hemianopia"].includes(key));
  }
  function validateCommand(value) {
    if (!isRecord(value) || typeof value.reset !== "boolean") return null;
    if (!validFields(value) || !validClear(value.clear)) return null;
    if (value.explanation !== void 0 && typeof value.explanation !== "string") return null;
    const intensities = parseIntensities(value.intensities);
    if (intensities === false) return null;
    const keys = [...BOOLEAN_KEYS, ...Object.keys(ENUMS), ...Object.keys(RANGES)];
    const fields = Object.fromEntries(keys.map((key) => [key, value[key] ?? null]));
    return {
      ...fields,
      reset: value.reset,
      intensities,
      ...value.clear === void 0 ? {} : { clear: value.clear },
      explanation: typeof value.explanation === "string" ? value.explanation.slice(0, 400) : "Reading settings updated."
    };
  }
  function protectAssistiveCommand(command, transcript) {
    const affirmativeColorPreview = /\b(simulate|simulation|preview|show me what)\b/i.test(transcript) && !/\b(no|not|never|don'?t)\b/i.test(transcript);
    return {
      ...command,
      zoom: command.zoom === "center" || command.zoom === "peripheral" ? null : command.zoom,
      hemianopia: null,
      colorAssist: command.colorAssist === "simulate" && !affirmativeColorPreview ? "correct" : command.colorAssist
    };
  }
  function hasCommandChanges(command) {
    if (command.reset) return true;
    return Object.entries(command).some(([key, value]) => {
      if (["explanation", "reset"].includes(key) || value == null) return false;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    });
  }

  // src/extension/content.ts
  var PREFIX = "vv-";
  var GLOBAL_KEY = "vvState";
  var SCOPE_KEY = "vvScope";
  if (!window.__voicevisionInjected) {
    window.__voicevisionInjected = true;
    init();
  }
  function storageKey(scope) {
    return scope === "site" ? `${GLOBAL_KEY}:${location.origin}` : GLOBAL_KEY;
  }
  function statesEqual(left, right) {
    return Object.keys(left).every((key) => key === "intensities" ? Object.keys(left.intensities).every((name) => left.intensities[name] === right.intensities[name]) : left[key] === right[key]);
  }
  function hydrate(raw) {
    return normalizeFilterState(raw);
  }
  function injectFilterDefs() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
    const filters = COLOR_ASSIST_MODES.flatMap(
      (assist) => DICHROMACY_TYPES.map((type) => {
        const id = `${PREFIX}${type}-${assist}`;
        return `<filter id="${id}" color-interpolation-filters="linearRGB">
        <feColorMatrix id="${id}-matrix" type="matrix" values="${blendMatrixValues(COLOR_MATRICES[assist][type], 1)}"/>
      </filter>`;
      })
    );
    svg.innerHTML = `<defs>${filters.join("")}</defs>`;
    document.documentElement.appendChild(svg);
  }
  function init() {
    injectFilterDefs();
    const originalFilter = document.body.style.getPropertyValue("filter");
    const originalFilterPriority = document.body.style.getPropertyPriority("filter");
    const computedFilter = getComputedStyle(document.body).filter;
    const originalColorScheme = document.documentElement.style.getPropertyValue("color-scheme");
    const originalColorSchemePriority = document.documentElement.style.getPropertyPriority("color-scheme");
    const originalZoom = document.documentElement.style.getPropertyValue("zoom");
    const originalZoomPriority = document.documentElement.style.getPropertyPriority("zoom");
    function restorePageAppearance() {
      document.body.style.setProperty("filter", originalFilter, originalFilterPriority);
      document.documentElement.style.setProperty("color-scheme", originalColorScheme, originalColorSchemePriority);
      document.documentElement.style.setProperty("zoom", originalZoom, originalZoomPriority);
    }
    let scope = "global";
    let state = hydrate(void 0);
    let previousState = null;
    let revision = 0;
    let loadRevision = 0;
    function remember() {
      previousState = { ...state, intensities: { ...state.intensities } };
      revision += 1;
    }
    function applyAll() {
      updateColorMatrices(state.intensities.colorMode, PREFIX);
      const filter = buildFilterString(state, PREFIX);
      if (filter === "none") {
        document.body.style.setProperty("filter", originalFilter, originalFilterPriority);
      } else {
        document.body.style.setProperty("filter", [computedFilter && computedFilter !== "none" ? computedFilter : "", filter].filter(Boolean).join(" "), originalFilterPriority);
      }
      document.documentElement.style.setProperty("color-scheme", state.darkMode ? "dark" : originalColorScheme, originalColorSchemePriority);
      applyZoom(state.zoom, state.intensities.zoom);
      if (!state.zoom) document.documentElement.style.setProperty("zoom", originalZoom, originalZoomPriority);
      applyHemianopia(state.hemianopia);
      applyDimOverlay(state.dimOverlay, state.intensities.dimOverlay);
      applyBoldText(state.boldText);
      applyReduceMotion(state.reduceMotion);
      applyReadingPreferences(state);
    }
    function persist() {
      chrome.storage.local.set({ [storageKey(scope)]: state });
    }
    function resetAll() {
      state = hydrate(void 0);
      resetFilters();
      restorePageAppearance();
    }
    function resetCommand() {
      if (statesEqual(state, hydrate(void 0))) return;
      remember();
      resetAll();
    }
    function mergeCommand(cmd) {
      if (cmd.reset) {
        resetCommand();
        return;
      }
      const pick = (value, fallback) => value !== null && value !== void 0 ? value : fallback;
      const before = state;
      state = {
        colorMode: cmd.clear?.includes("colorMode") ? null : pick(cmd.colorMode, state.colorMode),
        colorAssist: pick(cmd.colorAssist, state.colorAssist),
        darkMode: pick(cmd.darkMode, state.darkMode),
        highContrast: pick(cmd.highContrast, state.highContrast),
        brightness: pick(cmd.brightness, state.brightness),
        warmTone: pick(cmd.warmTone, state.warmTone),
        invertColors: pick(cmd.invertColors, state.invertColors),
        blur: pick(cmd.blur, state.blur),
        hemianopia: cmd.clear?.includes("hemianopia") ? null : pick(cmd.hemianopia, state.hemianopia),
        zoom: cmd.clear?.includes("zoom") ? null : pick(cmd.zoom, state.zoom),
        dimOverlay: pick(cmd.dimOverlay, state.dimOverlay),
        boldText: pick(cmd.boldText, state.boldText),
        reduceMotion: pick(cmd.reduceMotion, state.reduceMotion),
        textWrap: pick(cmd.textWrap, state.textWrap),
        textScale: pick(cmd.textScale, state.textScale),
        lineSpacing: pick(cmd.lineSpacing, state.lineSpacing),
        intensities: cmd.intensities ? { ...state.intensities, ...cmd.intensities } : state.intensities
      };
      if (statesEqual(before, state)) return;
      const next = state;
      state = before;
      remember();
      state = next;
      applyAll();
    }
    function loadScoped(next, done) {
      scope = next;
      const loading = ++loadRevision;
      const startingRevision = revision;
      chrome.storage.local.get([storageKey(next), GLOBAL_KEY], (data) => {
        if (loading !== loadRevision || startingRevision !== revision) {
          done?.();
          return;
        }
        remember();
        state = hydrate(data[storageKey(next)] ?? data[GLOBAL_KEY]);
        applyAll();
        done?.();
      });
    }
    chrome.storage.local.get(SCOPE_KEY, (data) => {
      loadScoped(data[SCOPE_KEY] === "site" ? "site" : "global");
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const change = changes[storageKey(scope)];
      if (!change?.newValue) return;
      const next = hydrate(change.newValue);
      if (statesEqual(next, state)) return;
      remember();
      state = next;
      applyAll();
    });
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== "voicevision-mic") return;
      let recognition = null;
      let disconnected = false;
      function post(message) {
        if (!disconnected) port.postMessage(message);
      }
      port.onMessage.addListener((msg) => {
        if (msg.type === "STOP") {
          recognition?.stop();
          return;
        }
        if (msg.type !== "START") return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
          post({ type: "error", error: "unsupported" });
          return;
        }
        recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;
        recognition.onstart = () => post({ type: "start" });
        recognition.onend = () => post({ type: "end" });
        recognition.onerror = (e) => post({ type: "error", error: e.error });
        recognition.onresult = (e) => post({ type: "result", transcript: e.results[0][0].transcript });
        try {
          recognition.start();
        } catch {
          post({ type: "error", error: "audio-capture" });
        }
      });
      port.onDisconnect.addListener(() => {
        disconnected = true;
        recognition?.abort();
      });
    });
    const OFF_VALUE_IS_NULL = ["colorMode", "zoom", "hemianopia", "brightness"];
    function getState(_message, sendResponse) {
      sendResponse(state);
      return;
    }
    function applyCommandMessage(message, sendResponse) {
      const command = validateCommand(message.command);
      if (!command) {
        sendResponse({ error: "Command not recognized. Use the reading controls." });
        return;
      }
      if (message.expectedRevision !== void 0 && message.expectedRevision !== revision) {
        sendResponse({ error: "Settings changed while the command was processing. Try again." });
        return;
      }
      const safe = protectAssistiveCommand(command, typeof message.transcript === "string" ? message.transcript : "");
      if (hasCommandChanges(safe)) {
        mergeCommand(safe);
        persist();
      }
      sendResponse(state);
      return;
    }
    function undoMessage(_message, sendResponse) {
      if (previousState) {
        const restored = previousState;
        remember();
        state = restored;
        applyAll();
        persist();
      }
      sendResponse(state);
      return;
    }
    function replaceStateMessage(message, sendResponse) {
      remember();
      state = hydrate(message.state);
      applyAll();
      persist();
      sendResponse(state);
      return;
    }
    function setReadingMessage(message, sendResponse) {
      const bounds = { textScale: [1, 2], lineSpacing: [1.4, 2.4], brightness: [0.1, 1.5] };
      const range = bounds[message.key];
      if (!range || !Number.isFinite(message.value) || message.value < range[0] || message.value > range[1]) {
        sendResponse({ error: "Reading value outside the supported range." });
        return;
      }
      remember();
      state = { ...state, [message.key]: message.value };
      applyAll();
      persist();
      sendResponse(state);
      return;
    }
    function toggleFilterMessage(message, sendResponse) {
      if (!["colorMode", "zoom", "hemianopia", "brightness", "darkMode", "highContrast", "warmTone", "invertColors", "blur", "dimOverlay", "boldText", "reduceMotion", "textWrap"].includes(message.key)) {
        sendResponse({ error: "Unknown setting." });
        return;
      }
      remember();
      const off = OFF_VALUE_IS_NULL.includes(message.key) ? null : false;
      state = { ...state, [message.key]: off };
      applyAll();
      persist();
      sendResponse(state);
      return;
    }
    function setIntensityMessage(message, sendResponse) {
      if (!Number.isFinite(message.value) || (message.key === "brightness" ? message.value < 0.1 || message.value > 1.5 : !Object.hasOwn(state.intensities, message.key) || message.value < 0 || message.value > 1)) {
        sendResponse({ error: "Invalid strength value." });
        return;
      }
      remember();
      state = message.key === "brightness" ? { ...state, brightness: message.value } : { ...state, intensities: { ...state.intensities, [message.key]: message.value } };
      applyAll();
      persist();
      sendResponse(state);
      return;
    }
    function scopeMessage(message, sendResponse) {
      if (message.scope !== "site" && message.scope !== "global") return;
      chrome.storage.local.set({ [SCOPE_KEY]: message.scope });
      loadScoped(message.scope, () => {
        persist();
        sendResponse({ scope: message.scope, state });
      });
      return true;
    }
    function interpretMessage(message, sendResponse) {
      if (typeof message.transcript !== "string" || !message.transcript.trim() || message.transcript.length > 300) {
        sendResponse({ handled: false, revision });
        return;
      }
      const command = parseIntent(message.transcript, state);
      if (!command) {
        sendResponse({ handled: false, revision });
        return;
      }
      const safe = protectAssistiveCommand(command, typeof message.transcript === "string" ? message.transcript : "");
      if (hasCommandChanges(safe)) {
        mergeCommand(safe);
        persist();
      }
      sendResponse({ handled: true, command, state });
      return;
    }
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case "GET_STATE":
          return getState(message, sendResponse);
        case "APPLY_COMMAND":
          return applyCommandMessage(message, sendResponse);
        case "UNDO":
          return undoMessage(message, sendResponse);
        case "REPLACE_STATE":
          return replaceStateMessage(message, sendResponse);
        case "SET_READING":
          return setReadingMessage(message, sendResponse);
        case "TOGGLE_FILTER":
          return toggleFilterMessage(message, sendResponse);
        case "SET_INTENSITY":
          return setIntensityMessage(message, sendResponse);
        case "vv:scope":
          return scopeMessage(message, sendResponse);
        case "vv:interpret":
          return interpretMessage(message, sendResponse);
      }
    });
  }
})();
