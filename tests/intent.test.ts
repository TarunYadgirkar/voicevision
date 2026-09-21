import { describe, expect, it } from 'vitest';
import { parseIntent } from '@/lib/intent';
import { defaultFilterState, FilterState } from '@/types';

function stateWith(patch: Partial<FilterState> = {}): FilterState {
  return { ...defaultFilterState, intensities: { ...defaultFilterState.intensities }, ...patch };
}

function parse(phrase: string, patch: Partial<FilterState> = {}) {
  const command = parseIntent(phrase, stateWith(patch));
  expect(command, `expected a command for "${phrase}"`).not.toBeNull();
  return command!;
}

describe('conditions and symptoms', () => {
  it('maps red-green colorblindness to deuteranopia', () => {
    expect(parse('I have red-green colorblindness').colorMode).toBe('deuteranopia');
  });

  it('maps a symptom description to deuteranopia', () => {
    expect(parse("I can't tell red from green").colorMode).toBe('deuteranopia');
  });

  it('maps protanopia', () => {
    expect(parse('I have protanopia').colorMode).toBe('protanopia');
  });

  it('maps blue-yellow colorblindness to tritanopia', () => {
    expect(parse('blue-yellow colorblind').colorMode).toBe('tritanopia');
  });

  it('maps no colour vision to achromatopsia', () => {
    expect(parse('I have no color vision at all').colorMode).toBe('achromatopsia');
  });

  it('maps cataracts to the clarity boost', () => {
    expect(parse('I have cataracts').blur).toBe(true);
  });

  it('maps macular degeneration to centre field loss', () => {
    expect(parse('I have macular degeneration').zoom).toBe('center');
  });

  it('maps glaucoma to peripheral field loss', () => {
    expect(parse('glaucoma').zoom).toBe('peripheral');
  });

  it('maps a request for bigger text to full zoom', () => {
    expect(parse("I can't read small text").zoom).toBe('full');
  });

  it('maps stroke-side vision loss to hemianopia', () => {
    expect(parse('I lost vision on my left side').hemianopia).toBe('left');
    expect(parse('I am blind on my right').hemianopia).toBe('right');
  });

  it('maps a too-bright screen to dark mode plus reduced brightness', () => {
    const command = parse('the screen is too bright');
    expect(command.darkMode).toBe(true);
    expect(command.brightness).toBe(0.6);
  });

  it('maps dark mode', () => {
    expect(parse('make it dark').darkMode).toBe(true);
  });

  it('maps washed-out text to a contrast boost', () => {
    expect(parse('everything looks faded').highContrast).toBe(true);
  });

  it('maps photophobia to dimming plus warmth', () => {
    const command = parse('I am light sensitive');
    expect(command.dimOverlay).toBe(true);
    expect(command.warmTone).toBe(true);
  });

  it('maps night mode to warm tone', () => {
    expect(parse('turn on night mode').warmTone).toBe(true);
  });

  it('maps astigmatism to bold text', () => {
    expect(parse('I have astigmatism').boldText).toBe(true);
  });

  it('maps motion sickness to reduced motion', () => {
    expect(parse('animations make me dizzy').reduceMotion).toBe(true);
  });
});

describe('compound commands', () => {
  it('sets both fields for a two-condition phrase', () => {
    const command = parse('I have deuteranopia and tunnel vision');
    expect(command.colorMode).toBe('deuteranopia');
    expect(command.zoom).toBe('peripheral');
  });

  it('combines a colour deficiency with a comfort complaint', () => {
    const command = parse("I'm colorblind and the screen is too bright");
    expect(command.colorMode).toBe('deuteranopia');
    expect(command.colorAssist).toBe('correct');
    expect(command.darkMode).toBe(true);
  });

  it('combines dark mode and high contrast', () => {
    const command = parse('dark mode and more contrast');
    expect(command.darkMode).toBe(true);
    expect(command.highContrast).toBe(true);
  });
});

describe('relative magnitude commands', () => {
  it('steps dark mode intensity up when it is already on', () => {
    const command = parse('make it darker', { darkMode: true, intensities: { ...defaultFilterState.intensities, darkMode: 0.5 } });
    expect(command.intensities?.darkMode).toBe(0.7);
    expect(command.darkMode).toBeNull();
  });

  it('turns dark mode on when it is off', () => {
    expect(parse('make it darker').darkMode).toBe(true);
  });

  it('turns dark mode off when stepping below zero', () => {
    const command = parse('lighter', { darkMode: true, intensities: { ...defaultFilterState.intensities, darkMode: 0.2 } });
    expect(command.darkMode).toBe(false);
  });

  it('steps zoom intensity when a zoom mode is already active', () => {
    const command = parse('zoom in more', { zoom: 'full', intensities: { ...defaultFilterState.intensities, zoom: 0.5 } });
    expect(command.intensities?.zoom).toBe(0.7);
    expect(command.zoom).toBeNull();
  });

  it('starts full zoom when nothing is zoomed yet', () => {
    const command = parse('zoom in');
    expect(command.zoom).toBe('full');
    expect(command.intensities?.zoom).toBe(0.5);
  });

  it('steps colour severity down', () => {
    const command = parse('tone it down', { colorMode: 'deuteranopia', intensities: { ...defaultFilterState.intensities, colorMode: 0.8 } });
    expect(command.intensities?.colorMode).toBe(0.6);
  });
});

describe('negation and reset', () => {
  it('turns off only dark mode', () => {
    const command = parse('turn off dark mode');
    expect(command.darkMode).toBe(false);
    expect(command.highContrast).toBeNull();
    expect(command.colorMode).toBeNull();
    expect(command.reset).toBe(false);
  });

  it('removes the zoom without touching anything else', () => {
    const command = parse('get rid of the zoom');
    expect(command.zoom).toBeNull();
    expect(command.darkMode).toBeNull();
  });

  it('resets everything', () => {
    const command = parse('reset');
    expect(command.reset).toBe(true);
    expect(command.colorMode).toBeNull();
  });

  it('treats "back to normal" as a reset', () => {
    expect(parse('go back to normal').reset).toBe(true);
  });
});

describe('colorAssist', () => {
  it('corrects when the person says they are colorblind', () => {
    expect(parse('I am colorblind').colorAssist).toBe('correct');
  });

  it('corrects on a direct request for help with colours', () => {
    expect(parse('help me see colors').colorAssist).toBe('correct');
  });

  it('simulates when asked to preview a deficiency', () => {
    const command = parse('show me what a deuteranope sees');
    expect(command.colorAssist).toBe('simulate');
    expect(command.colorMode).toBe('deuteranopia');
  });

  it('simulates on the word simulate', () => {
    expect(parse('simulate protanopia').colorAssist).toBe('simulate');
  });

  it('leaves colorAssist null when colour is not mentioned', () => {
    expect(parse('make it dark').colorAssist).toBeNull();
  });
});

describe('phrases the parser must not guess at', () => {
  it.each([
    'what time is it',
    'play some jazz please',
    'open a new tab and search for shoes',
    'hey there how are you doing today',
    'send my sister a message about dinner',
  ])('returns null for %s', phrase => {
    expect(parseIntent(phrase, stateWith())).toBeNull();
  });
});
