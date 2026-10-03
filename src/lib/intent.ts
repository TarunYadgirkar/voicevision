import { AccessibilityCommand, ColorAssist, FilterIntensities, FilterState } from '@/types';

// Local, framework-free mirror of the SYSTEM_PROMPT rules in src/app/api/interpret/route.ts.
// It answers the phrasings we can recognise with certainty so the common commands need no
// network round trip; anything it is not sure about returns null and the caller falls back
// to the LLM. Precision beats recall here: a wrong local guess is worse than a slow answer.

const STEP = 0.2;
const BASELINE_INTENSITY = 0.5;

type Patch = Partial<Omit<AccessibilityCommand, 'reset' | 'explanation'>>;

interface Rule {
  test: RegExp;
  label: string;
  patch: Patch | ((current: FilterState) => Patch);
}

function emptyCommand(): AccessibilityCommand {
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
    textScale: null,
    lineSpacing: null,
    intensities: null,
    reset: false,
    explanation: '',
  };
}

function normalize(transcript: string): string {
  return transcript.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function stepIntensity(current: FilterState, key: keyof FilterIntensities, delta: number): number {
  const base = current.intensities?.[key] ?? BASELINE_INTENSITY;
  return clamp01(Number((base + delta).toFixed(2)));
}

const RESET_RE = /\b(reset|start over|go back to normal|back to normal|clear (all|the)? ?filters?|remove all filters|turn everything off|turn it all off|normal vision|undo everything)\b/;

// "turn off X" — a single named filter goes back to its off value, everything else untouched.
const OFF_RE = /\b(turn off|switch off|shut off|disable|remove|stop|get rid of|cancel|undo|no more)\b/;

const OFF_TARGETS: ReadonlyArray<{ test: RegExp; label: string; patch: Patch }> = [
  { test: /\bdark ?mode\b/, label: 'dark mode', patch: { darkMode: false } },
  { test: /\b(high )?contrast\b/, label: 'contrast boost', patch: { highContrast: false } },
  { test: /\b(warm ?tone|warmth|night mode|blue light filter)\b/, label: 'warm tone', patch: { warmTone: false } },
  { test: /\b(invert(ed)?( colors?)?)\b/, label: 'inverted colors', patch: { invertColors: false } },
  { test: /\b(zoom|magnification|magnifier)\b/, label: 'zoom', patch: { zoom: null, clear: ['zoom'] } },
  { test: /\b(dim(ming)?( overlay)?|the dimmer)\b/, label: 'dimming', patch: { dimOverlay: false } },
  { test: /\bbold( text)?\b/, label: 'bold text', patch: { boldText: false } },
  { test: /\b(reduce[d]? motion|the motion filter)\b/, label: 'reduced motion', patch: { reduceMotion: false } },
  { test: /\b(color ?blind(ness)?|deuteranopia|protanopia|tritanopia|achromatopsia|the color filter)\b/, label: 'color filter', patch: { colorMode: null, clear: ['colorMode'] } },
  { test: /\b(hemianopia|field loss|the side (mask|overlay))\b/, label: 'field loss overlay', patch: { hemianopia: null, clear: ['hemianopia'] } },
  { test: /\b(clarity boost|the blur filter|cataract(s)?)\b/, label: 'clarity boost', patch: { blur: false } },
];

// Magnitude commands read the current state, so each patch is a function of it.
const RELATIVE_RULES: ReadonlyArray<Rule> = [
  { test: /\b(less glare|reduce glare|softer light)\b/, label: 'softer light', patch: { brightness: 0.8, warmTone: true } },
  {
    test: /\b((bigger|larger|increase|enlarge) (the )?(text|font)|(?:text|font)( size)? (bigger|larger)|make (the )?(text|font) (bigger|larger))\b/,
    label: 'larger text',
    patch: c => ({ textScale: Math.min(2, Number((c.textScale + STEP).toFixed(2))) }),
  },
  {
    test: /\b((smaller|decrease|reduce) (the )?(text|font)|(?:text|font)( size)? smaller|make (the )?(text|font) smaller)\b/,
    label: 'smaller text',
    patch: c => ({ textScale: Math.max(1, Number((c.textScale - STEP).toFixed(2))) }),
  },
  {
    test: /\b((more|increase|wider) (line )?spacing|space (the )?lines (out|more))\b/,
    label: 'more line spacing',
    patch: c => ({ lineSpacing: Math.min(2.4, Number((c.lineSpacing + STEP).toFixed(2))) }),
  },
  {
    test: /\b((less|reduce|decrease) (line )?spacing)\b/,
    label: 'less line spacing',
    patch: c => ({ lineSpacing: Math.max(1.4, Number((c.lineSpacing - STEP).toFixed(2))) }),
  },
  {
    test: /\b(darker|make it dimmer|dim it more|too light)\b/,
    label: 'darker',
    patch: c => (c.darkMode
      ? { intensities: { darkMode: stepIntensity(c, 'darkMode', STEP) } }
      : { darkMode: true }),
  },
  {
    test: /\b(lighter|less dark|brighten it|brighter)\b/,
    label: 'lighter',
    patch: c => {
      const next = stepIntensity(c, 'darkMode', -STEP);
      return next === 0 ? { darkMode: false } : { intensities: { darkMode: next } };
    },
  },
  {
    test: /\b(more contrast|increase contrast|higher contrast|punch(ier)? up the contrast)\b/,
    label: 'more contrast',
    patch: c => ({ highContrast: true, intensities: { highContrast: stepIntensity(c, 'highContrast', STEP) } }),
  },
  {
    test: /\b(less contrast|lower contrast|reduce contrast)\b/,
    label: 'less contrast',
    patch: c => ({ intensities: { highContrast: stepIntensity(c, 'highContrast', -STEP) } }),
  },
  {
    test: /\b(zoom in( more)?|magnify more|make it bigger|even bigger)\b/,
    label: 'more zoom',
    patch: c => (c.zoom
      ? { intensities: { zoom: stepIntensity(c, 'zoom', STEP) } }
      : { zoom: 'full' as const, intensities: { zoom: BASELINE_INTENSITY } }),
  },
  {
    test: /\b(zoom out|less zoom|make it smaller)\b/,
    label: 'less zoom',
    patch: c => ({ intensities: { zoom: stepIntensity(c, 'zoom', -STEP) } }),
  },
  {
    test: /\b(more severe|stronger|more intense)\b/,
    label: 'stronger',
    patch: c => ({ intensities: { colorMode: stepIntensity(c, 'colorMode', STEP) } }),
  },
  {
    test: /\b(less severe|tone it down|milder|weaker)\b/,
    label: 'milder',
    patch: c => ({ intensities: { colorMode: stepIntensity(c, 'colorMode', -STEP) } }),
  },
];

// Colour comparisons require an explicit request.
const SIMULATE_RE = /\b(simulate|simulation|preview|show me what|what (it|things|colors?) looks? like (for|to)|as a (deuteranope|protanope|tritanope) sees|deuteranope sees|demo mode)\b/;
const CORRECT_RE = /\b(help me see colors?|correct (my |the )?colors?|fix (my |the )?colors?)\b/;

const CONDITION_RULES: ReadonlyArray<Rule> = [
  {
    test: /\b(red[- ]green color ?blind(ness)?|deuteranopia|deuteranomaly|deuteranope|can'?t tell red from green|confuse red and green|red and green (look the same|blend))\b/,
    label: 'deuteranopia',
    patch: { colorMode: 'deuteranopia' },
  },
  {
    test: /\b(protanopia|protanomaly|protanope|red weakness|reds? looks? dark)\b/,
    label: 'protanopia',
    patch: { colorMode: 'protanopia' },
  },
  {
    test: /\b(blue[- ]yellow color ?blind(ness)?|tritanopia|tritanomaly|tritanope)\b/,
    label: 'tritanopia',
    patch: { colorMode: 'tritanopia' },
  },
  {
    test: /\b(achromatopsia|monochrom(e|acy)|no color vision|everything is gr[ae]y)\b/,
    label: 'achromatopsia',
    patch: { colorMode: 'achromatopsia' },
  },
  {
    test: /\b(everything (is|looks) (blurry|foggy|hazy)|my vision is cloudy|can'?t focus)\b/,
    label: 'clarity boost',
    patch: { blur: true },
  },
  {
    test: /\b(macular degeneration|a ?m ?d|central vision loss|blind spot in (the )?cent(er|re))\b/,
    label: 'field loss',
    patch: { zoom: 'center' },
  },
  {
    test: /\b(glaucoma|tunnel vision|peripheral vision loss|can'?t see the sides|losing my side vision)\b/,
    label: 'field loss',
    patch: { zoom: 'peripheral' },
  },
  {
    test: /\b(need everything bigger|make (everything|things) (bigger|larger)|can'?t read small text|magnify)\b/,
    label: 'magnification',
    patch: { zoom: 'full' },
  },
  {
    test: /\b(hemianopia|blind on my left|lost (my )?vision on (my |the )?left|left (visual )?field is gone)\b.*\bleft\b|\bleft (side )?(hemianopia|field loss)\b|\b(blind on|lost vision on) (my |the )?left\b/,
    label: 'field loss',
    patch: { hemianopia: 'left' },
  },
  {
    test: /\b(right (side )?(hemianopia|field loss))\b|\b(blind on|lost vision on) (my |the )?right\b|\bright (visual )?field is gone\b/,
    label: 'field loss',
    patch: { hemianopia: 'right' },
  },
  {
    test: /\b(too bright|hurts my eyes|screen is blinding|blinding)\b/,
    label: 'dimmed',
    patch: { darkMode: true, brightness: 0.6 },
  },
  {
    test: /\b(dark ?mode|make it dark|too white|white background hurts)\b/,
    label: 'dark mode',
    patch: { darkMode: true },
  },
  {
    test: /\b(low contrast|can'?t read the text|text is hard to (see|read)|everything looks faded|washed out)\b/,
    label: 'contrast boost',
    patch: { highContrast: true },
  },
  {
    test: /\b(light sensitive|light sensitivity|fluorescent lights bother me|bright lights hurt|screen gives me headaches)\b/,
    label: 'photophobia comfort',
    patch: { dimOverlay: true, warmTone: true },
  },
  {
    test: /\b(warm it up|reduce blue light|night mode|warm tone)\b/,
    label: 'warm tone',
    patch: { warmTone: true },
  },
  {
    test: /\b(flip the colors?|invert( the)? colors?|reverse colors?)\b/,
    label: 'inverted colors',
    patch: { invertColors: true },
  },
  {
    test: /\b(things look (smeared|doubled)|letters look (fuzzy|thin)|bold(er)? text)\b/,
    label: 'bold text',
    patch: { boldText: true },
  },
  {
    test: /\b(animations make me dizzy|autoplay videos bother me|reduce motion|moving things make me (nauseous|sick))\b/,
    label: 'reduced motion',
    patch: { reduceMotion: true },
  },
];

function mergePatch(command: AccessibilityCommand, patch: Patch): void {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'intensities') {
      command.intensities = { ...(command.intensities ?? {}), ...(value as Partial<FilterIntensities>) };
      continue;
    }
    (command as unknown as Record<string, unknown>)[key] = value;
  }
}

function parseOffCommand(text: string): AccessibilityCommand | null {
  const target = OFF_TARGETS.find(t => t.test.test(text));
  if (!target) return null;
  const command = emptyCommand();
  mergePatch(command, target.patch);
  command.explanation = `Turned off ${target.label}.`;
  return command;
}

function resolveColorAssist(text: string): ColorAssist | null {
  if (SIMULATE_RE.test(text) && !/\b(no|not|never|don'?t)\b/.test(text)) return 'simulate';
  if (CORRECT_RE.test(text)) return 'correct';
  return null;
}

function parseResetCommand(): AccessibilityCommand {
  const command = emptyCommand();
  command.reset = true;
  command.explanation = 'Cleared every filter.';
  return command;
}

function applyRules(text: string, current: FilterState, command: AccessibilityCommand): string[] {
  const labels: string[] = [];
  for (const rule of [...RELATIVE_RULES, ...CONDITION_RULES]) {
    if (!rule.test.test(text)) continue;
    if (typeof rule.patch !== 'function' && rule.patch.colorMode && !/\b(simulate|simulation|preview|show me what|sees|color filter|color adjustment|adjust (the |my )?colors?|help me see colors?|can'?t tell|confuse|look the same|blend|looks? dark)\b/.test(text)) continue;
    const patch = typeof rule.patch === 'function' ? rule.patch(current) : rule.patch;
    const isFieldMask = patch.zoom === 'center' || patch.zoom === 'peripheral' || patch.hemianopia;
    if (isFieldMask) continue;
    mergePatch(command, patch);
    labels.push(rule.label);
  }
  return labels;
}


function applyColorAssist(text: string, current: FilterState, command: AccessibilityCommand): string[] {
  const assist = resolveColorAssist(text);
  if (!assist || (assist === 'simulate' && !command.colorMode && !current.colorMode)) return [];
  command.colorAssist = assist;
  const labels: string[] = [];
  if (assist === 'correct' && !command.colorMode && !current.colorMode) {
    command.colorMode = 'deuteranopia';
    labels.push('deuteranopia');
  }
  labels.push(assist === 'correct' ? 'color adjustment' : 'deficiency preview');
  return labels;
}

const FUNCTIONAL_REQUEST_RE = /\b(larger|bigger|smaller|spacing|contrast|glare|bright|dark|dim|bold|text|letters|read small|magnify|zoom|warm|motion|moving|animations|night mode|help me see colors|can'?t tell|confuse|looks? dark|color filter|adjust|simulate|preview|show me what)\b/;

const CONDITION_ADVICE_RE = /\b(macular degeneration|a ?m ?d|glaucoma|tunnel vision|central vision loss|peripheral vision loss|field loss|hemianopia|cataracts?|astigmatism|presbyopia|monocular|deuteranopia|protanopia|tritanopia|achromatopsia|color ?blind(ness)?|no color vision|photophobia|migraine|low vision|blind.*(left|right)|lost.*vision.*(left|right))\b/;

export function parseIntent(transcript: string, current: FilterState): AccessibilityCommand | null {
  const text = normalize(transcript);
  if (!text) return null;
  if (RESET_RE.test(text)) return parseResetCommand();
  if (OFF_RE.test(text)) return parseOffCommand(text);

  const command = emptyCommand();
  if (CONDITION_ADVICE_RE.test(text) && !FUNCTIONAL_REQUEST_RE.test(text)) {
    command.explanation = 'Settings unchanged. Choose an adjustment for your reading needs; a condition name does not determine the right settings.';
    return command;
  }
  const labels = [...applyRules(text, current, command), ...applyColorAssist(text, current, command)];
  if (labels.length === 0) {
    if (!CONDITION_ADVICE_RE.test(text)) return null;
    command.explanation = 'Settings unchanged. Blindness in one eye differs from visual-field loss. Choose text size, spacing, contrast or magnification for your reading needs; these tools do not restore vision.';
    return command;
  }

  command.explanation = `Applied ${labels.join(', ')}.`;
  return command;
}
