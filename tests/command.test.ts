import { describe, expect, it } from 'vitest';
import { validateCommand, protectAssistiveCommand } from '@/lib/command';

describe('untrusted commands', () => {
  it('rejects malformed values and out-of-range settings', () => {
    for (const value of [null, [], { reset: 'yes' }, { reset: false, brightness: 99 }, { reset: false, darkMode: 'false' }, { reset: false, intensities: { zoom: -1 } }]) {
      expect(validateCommand(value)).toBeNull();
    }
  });
  it('accepts a partial command and fills omitted fields with null', () => {
    expect(validateCommand({ reset: false, boldText: true, explanation: 'Bold text on.' })).toMatchObject({ boldText: true, darkMode: null });
  });
  it('accepts a model reply that sets every unmentioned field to null', () => {
    const reply = {
      colorMode: null, colorAssist: null, darkMode: true, highContrast: null, warmTone: null, invertColors: null,
      blur: null, dimOverlay: null, boldText: null, reduceMotion: null, textWrap: null, brightness: null,
      textScale: null, lineSpacing: null, zoom: null, hemianopia: null,
      intensities: { colorMode: null, darkMode: 0.8, zoom: null }, clear: null, reset: null, explanation: null,
    };
    const command = validateCommand(reply);
    expect(command).toMatchObject({ darkMode: true, reset: false, intensities: { darkMode: 0.8 }, explanation: 'Reading settings updated.' });
    expect(command).not.toHaveProperty('clear');
    expect(command!.intensities).not.toHaveProperty('zoom');
  });
  it('still rejects wrongly typed values beside nulls', () => {
    for (const value of [{ reset: false, clear: 'zoom' }, { reset: false, clear: ['mask'] }, { reset: false, intensities: { zoom: '0.5' } }, { reset: false, explanation: 4 }]) {
      expect(validateCommand(value)).toBeNull();
    }
  });
  it('accepts bounded reading settings and discards unknown properties', () => {
    const command = validateCommand({ reset: false, textScale: 1.5, lineSpacing: 2, secret: 'ignore' });
    expect(command).toMatchObject({ textScale: 1.5, lineSpacing: 2 });
    expect(command).not.toHaveProperty('secret');
  });
});

it('never applies retired field-loss masks from cloud or explicit previews', () => {
  for (const transcript of ['simulate glaucoma', 'do not simulate glaucoma', 'blind in left eye']) {
    const command = validateCommand({ reset: false, zoom: 'peripheral', hemianopia: 'left' })!;
    const safe = protectAssistiveCommand(command, transcript);
    expect(safe.zoom).toBeNull();
    expect(safe.hemianopia).toBeNull();
  }
});
