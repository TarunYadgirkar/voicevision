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
  function buildFilterString(state, idPrefix = "") {
    const { intensities } = state;
    const parts = [];
    if (state.colorMode === "achromatopsia") {
      if (state.colorAssist === "simulate") {
        parts.push(`grayscale(${Math.round(intensities.colorMode * 100)}%)`);
      } else {
        parts.push(`contrast(${Math.round(100 + 60 * intensities.colorMode)}%)`);
      }
    } else if (state.colorMode) {
      parts.push(`url(#${idPrefix}${state.colorMode}-${state.colorAssist})`);
    }
    if (state.darkMode) {
      parts.push(`invert(${Math.round(93 * intensities.darkMode)}%) hue-rotate(180deg)`);
    }
    if (state.invertColors && !state.darkMode) {
      parts.push(`invert(${Math.round(100 * intensities.invertColors)}%) hue-rotate(180deg)`);
    }
    if (state.warmTone) parts.push(`sepia(${Math.round(25 * intensities.warmTone)}%)`);
    if (state.highContrast) parts.push(`contrast(${Math.round(100 + 50 * intensities.highContrast)}%)`);
    if (state.blur) {
      parts.push(`contrast(${Math.round(100 + 60 * intensities.blur)}%)`);
      parts.push(`brightness(${Math.round(100 + 15 * intensities.blur)}%)`);
    }
    if (state.brightness !== null) parts.push(`brightness(${state.brightness})`);
    if (state.darkMode && state.brightness === null) {
      parts.push(`brightness(${(1 - 0.2 * intensities.darkMode).toFixed(2)})`);
    }
    return parts.join(" ") || "none";
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
    { test: /\bdark ?mode\b/, label: "dark mode", patch: { darkMode: false } },
    { test: /\b(high )?contrast\b/, label: "contrast boost", patch: { highContrast: false } },
    { test: /\b(warm ?tone|warmth|night mode|blue light filter)\b/, label: "warm tone", patch: { warmTone: false } },
    { test: /\b(invert(ed)?( colors?)?)\b/, label: "inverted colors", patch: { invertColors: false } },
    { test: /\b(zoom|magnification|magnifier)\b/, label: "zoom", patch: { zoom: null } },
    { test: /\b(dim(ming)?( overlay)?|the dimmer)\b/, label: "dimming", patch: { dimOverlay: false } },
    { test: /\bbold( text)?\b/, label: "bold text", patch: { boldText: false } },
    { test: /\b(reduce[d]? motion|the motion filter)\b/, label: "reduced motion", patch: { reduceMotion: false } },
    { test: /\b(color ?blind(ness)?|deuteranopia|protanopia|tritanopia|achromatopsia|the color filter)\b/, label: "color filter", patch: { colorMode: null } },
    { test: /\b(hemianopia|field loss|the side (mask|overlay))\b/, label: "field loss overlay", patch: { hemianopia: null } },
    { test: /\b(clarity boost|the blur filter|cataract(s)?)\b/, label: "clarity boost", patch: { blur: false } }
  ];
  var RELATIVE_RULES = [
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
      test: /\b(zoom out|less zoom|make it smaller|smaller)\b/,
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
  var CORRECT_RE = /\b(help me see colors?|correct (my |the )?colors?|fix (my |the )?colors?|i am color ?blind|i'm color ?blind|i have color ?blindness)\b/;
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
      test: /\b(cataracts?|everything (is|looks) (blurry|foggy|hazy)|my vision is cloudy|can'?t focus)\b/,
      label: "clarity boost",
      patch: { blur: true }
    },
    {
      test: /\b(macular degeneration|a ?m ?d|central vision loss|blind spot in (the )?cent(er|re))\b/,
      label: "central field loss",
      patch: { zoom: "center" }
    },
    {
      test: /\b(glaucoma|tunnel vision|peripheral vision loss|can'?t see the sides|losing my side vision)\b/,
      label: "peripheral field loss",
      patch: { zoom: "peripheral" }
    },
    {
      test: /\b(low vision|need everything bigger|make (everything|things) (bigger|larger)|can'?t read small text|magnify)\b/,
      label: "magnification",
      patch: { zoom: "full" }
    },
    {
      test: /\b(hemianopia|blind on my left|lost (my )?vision on (my |the )?left|left (visual )?field is gone)\b.*\bleft\b|\bleft (side )?(hemianopia|field loss)\b|\b(blind on|lost vision on) (my |the )?left\b/,
      label: "left field loss",
      patch: { hemianopia: "left" }
    },
    {
      test: /\b(right (side )?(hemianopia|field loss))\b|\b(blind on|lost vision on) (my |the )?right\b|\bright (visual )?field is gone\b/,
      label: "right field loss",
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
      test: /\b(light sensitive|light sensitivity|photophobia|migraine|fluorescent lights bother me|bright lights hurt|screen gives me headaches)\b/,
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
      test: /\b(astigmatism|presbyopia|things look (smeared|doubled)|letters look (fuzzy|thin)|bold(er)? text)\b/,
      label: "bold text",
      patch: { boldText: true }
    },
    {
      test: /\b(motion sickness|animations make me dizzy|vestibular|autoplay videos bother me|reduce motion|moving things make me (nauseous|sick))\b/,
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
    if (SIMULATE_RE.test(text)) return "simulate";
    if (CORRECT_RE.test(text)) return "correct";
    return null;
  }
  function parseIntent(transcript, current) {
    const text = normalize(transcript);
    if (!text) return null;
    if (RESET_RE.test(text)) {
      const command2 = emptyCommand();
      command2.reset = true;
      command2.explanation = "Cleared every filter.";
      return command2;
    }
    if (OFF_RE.test(text)) return parseOffCommand(text);
    const command = emptyCommand();
    const labels = [];
    for (const rule of [...RELATIVE_RULES, ...CONDITION_RULES]) {
      if (!rule.test.test(text)) continue;
      mergePatch(command, typeof rule.patch === "function" ? rule.patch(current) : rule.patch);
      labels.push(rule.label);
    }
    const assist = resolveColorAssist(text);
    if (assist) {
      command.colorAssist = assist;
      if (assist === "correct" && !command.colorMode && !current.colorMode) {
        command.colorMode = "deuteranopia";
        labels.push("deuteranopia");
      }
      labels.push(assist === "correct" ? "color correction" : "deficiency preview");
    }
    if (labels.length === 0) return null;
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
    intensities: defaultIntensities
  };

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
  function hydrate(raw) {
    if (!raw) return { ...defaultFilterState, intensities: { ...defaultFilterState.intensities } };
    return {
      ...defaultFilterState,
      ...raw,
      intensities: { ...defaultFilterState.intensities, ...raw.intensities ?? {} }
    };
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
    let scope = "global";
    let state = hydrate(void 0);
    function applyAll() {
      updateColorMatrices(state.intensities.colorMode, PREFIX);
      document.body.style.filter = buildFilterString(state, PREFIX);
      document.documentElement.style.colorScheme = state.darkMode ? "dark" : "";
      applyZoom(state.zoom, state.intensities.zoom);
      applyHemianopia(state.hemianopia);
      applyDimOverlay(state.dimOverlay, state.intensities.dimOverlay);
      applyBoldText(state.boldText);
      applyReduceMotion(state.reduceMotion);
    }
    function persist() {
      chrome.storage.local.set({ [storageKey(scope)]: state });
    }
    function resetAll() {
      state = hydrate(void 0);
      resetFilters();
    }
    function mergeCommand(cmd) {
      if (cmd.reset) {
        resetAll();
        return;
      }
      const pick = (value, fallback) => value !== null && value !== void 0 ? value : fallback;
      state = {
        colorMode: pick(cmd.colorMode, state.colorMode),
        colorAssist: pick(cmd.colorAssist, state.colorAssist),
        darkMode: pick(cmd.darkMode, state.darkMode),
        highContrast: pick(cmd.highContrast, state.highContrast),
        brightness: pick(cmd.brightness, state.brightness),
        warmTone: pick(cmd.warmTone, state.warmTone),
        invertColors: pick(cmd.invertColors, state.invertColors),
        blur: pick(cmd.blur, state.blur),
        hemianopia: pick(cmd.hemianopia, state.hemianopia),
        zoom: pick(cmd.zoom, state.zoom),
        dimOverlay: pick(cmd.dimOverlay, state.dimOverlay),
        boldText: pick(cmd.boldText, state.boldText),
        reduceMotion: pick(cmd.reduceMotion, state.reduceMotion),
        intensities: cmd.intensities ? { ...state.intensities, ...cmd.intensities } : state.intensities
      };
      applyAll();
    }
    function loadScoped(next, done) {
      scope = next;
      chrome.storage.local.get([storageKey(next), GLOBAL_KEY], (data) => {
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
      if (!change?.newValue || JSON.stringify(change.newValue) === JSON.stringify(state)) return;
      state = hydrate(change.newValue);
      applyAll();
    });
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== "voicevision-mic") return;
      let recognition = null;
      port.onMessage.addListener((msg) => {
        if (msg.type === "STOP") {
          recognition?.stop();
          return;
        }
        if (msg.type !== "START") return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
          port.postMessage({ type: "error", error: "unsupported" });
          return;
        }
        recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;
        recognition.onstart = () => port.postMessage({ type: "start" });
        recognition.onend = () => port.postMessage({ type: "end" });
        recognition.onerror = (e) => port.postMessage({ type: "error", error: e.error });
        recognition.onresult = (e) => port.postMessage({ type: "result", transcript: e.results[0][0].transcript });
        recognition.start();
      });
      port.onDisconnect.addListener(() => recognition?.stop());
    });
    const OFF_VALUE_IS_NULL = ["colorMode", "zoom", "hemianopia", "brightness"];
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "GET_STATE") {
        sendResponse(state);
        return;
      }
      if (message.type === "APPLY_COMMAND") {
        mergeCommand(message.command);
        persist();
        sendResponse(state);
        return;
      }
      if (message.type === "TOGGLE_FILTER") {
        const off = OFF_VALUE_IS_NULL.includes(message.key) ? null : false;
        state = { ...state, [message.key]: off };
        applyAll();
        persist();
        sendResponse(state);
        return;
      }
      if (message.type === "SET_INTENSITY") {
        state = message.key === "brightness" ? { ...state, brightness: message.value } : { ...state, intensities: { ...state.intensities, [message.key]: message.value } };
        applyAll();
        persist();
        sendResponse(state);
        return;
      }
      if (message.type === "vv:scope") {
        chrome.storage.local.set({ [SCOPE_KEY]: message.scope });
        loadScoped(message.scope, () => {
          persist();
          sendResponse({ scope: message.scope, state });
        });
        return true;
      }
      if (message.type === "vv:interpret") {
        const command = parseIntent(message.transcript, state);
        if (!command) {
          sendResponse({ handled: false });
          return;
        }
        mergeCommand(command);
        persist();
        sendResponse({ handled: true, command, state });
        return;
      }
    });
  }
})();
