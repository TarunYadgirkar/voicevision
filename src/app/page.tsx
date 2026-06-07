'use client';
import { useState } from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { ActiveModes } from '@/components/ActiveModes';
import { applyFilters, resetFilters } from '@/lib/filters';
import { AccessibilityCommand, FilterState, defaultFilterState } from '@/types';

export default function Home() {
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [lastTranscript, setLastTranscript] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleCommand = (cmd: AccessibilityCommand) => {
    setExplanation(cmd.explanation || '');

    if (cmd.reset) {
      setFilterState(defaultFilterState);
      resetFilters();
      return;
    }

    setFilterState(prev => {
      const next: FilterState = {
        colorMode: cmd.colorMode ?? prev.colorMode,
        darkMode: cmd.darkMode ?? prev.darkMode,
        highContrast: cmd.highContrast ?? prev.highContrast,
        brightness: cmd.brightness ?? prev.brightness,
        warmTone: cmd.warmTone ?? prev.warmTone,
        invertColors: cmd.invertColors ?? prev.invertColors,
      };
      applyFilters(next);
      return next;
    });
  };

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">VoiceVision</h1>
        <p className="text-gray-500">Speak your visual needs. AI adapts the screen.</p>
      </div>

      {/* Voice Controls */}
      <div className="flex flex-col items-center gap-4">
        <VoiceButton onCommand={handleCommand} onTranscript={setLastTranscript} />
        {lastTranscript && (
          <p className="text-sm text-gray-500">
            Heard: &ldquo;{lastTranscript}&rdquo;
          </p>
        )}
        {explanation && (
          <p className="text-sm text-green-600 font-medium">{explanation}</p>
        )}
      </div>

      {/* Active Modes */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Active Filters</h2>
        <ActiveModes state={filterState} />
      </div>

      {/* Test Content Panel */}
      <div className="space-y-6 p-6 border rounded-xl">
        <h2 className="text-lg font-semibold">Test Content Panel</h2>

        {/* Color swatches */}
        <div className="flex gap-2">
          {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#f97316', '#a855f7'].map(c => (
            <div key={c} style={{ backgroundColor: c, width: 48, height: 48, borderRadius: 8 }} />
          ))}
        </div>

        {/* Colorful image */}
        <img
          src="https://picsum.photos/400/200?random=1"
          alt="Test image"
          className="rounded-lg"
        />

        {/* Gradient bar */}
        <div
          style={{ height: 24, background: 'linear-gradient(to right, red, orange, yellow, green, blue, violet)', borderRadius: 6 }}
        />

        {/* Text samples */}
        <div className="space-y-1">
          <p className="text-2xl font-bold">Large heading text</p>
          <p className="text-base">Body text — readable in normal and high-contrast modes.</p>
          <p className="text-sm text-gray-400">Small caption text — tests contrast sensitivity.</p>
        </div>
      </div>
    </main>
  );
}
