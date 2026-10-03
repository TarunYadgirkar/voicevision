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
