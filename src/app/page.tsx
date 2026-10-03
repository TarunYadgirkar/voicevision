'use client';
import { useState } from 'react';
import { ArrowCounterClockwise, BookOpen, Eye, TextAa, SunDim, Pause } from '@phosphor-icons/react';
import { CommandBar } from '@/components/CommandBar';
import { AdaptationControls } from '@/components/AdaptationControls';
import { ProofSection } from '@/components/ProofSection';
import { getFilterState, useFilterState } from '@/hooks/useFilterState';
import { useCommandRunner } from '@/hooks/useCommandRunner';
import { defaultFilterState } from '@/types';
import type { FilterState } from '@/types';

const PRESETS = [
  { label: 'Larger text', hint: 'Room to read', icon: TextAa, settings: { textScale: 1.5, lineSpacing: 1.8 } },
  { label: 'Less glare', hint: 'Softer light', icon: SunDim, settings: { brightness: 0.8, warmTone: true } },
  { label: 'Clearer text', hint: 'Bold & contrast', icon: Eye, settings: { boldText: true, highContrast: true, lineSpacing: 1.8 } },
  { label: 'Less motion', hint: 'A calmer page', icon: Pause, settings: { reduceMotion: true } },
] satisfies { label: string; hint: string; icon: typeof TextAa; settings: Partial<FilterState> }[];

export default function Home() {
  const filters = useFilterState();
  const runner = useCommandRunner({ getState: getFilterState, onCommand: filters.apply, onUndo: filters.undo });
  const [readingText, setReadingText] = useState('A little space can make a big difference.\n\nReading should feel comfortable. Change the text size, give each line more room, or soften the light until this page works for you. There is no single setting that suits everyone.\n\nTry one change at a time. Your preferences stay on this browser, and you can undo a change or reset whenever you want.');
  const [speechRevision, setSpeechRevision] = useState(0);
  const handleReset = () => { setSpeechRevision(value => value + 1); runner.clearHistory(); filters.reset(); };
  const change = (action: () => void) => { setSpeechRevision(value => value + 1); runner.cancel(); action(); };
  const submit = (transcript: string) => { setSpeechRevision(value => value + 1); void runner.run(transcript); };

  return (
    <>
      <a href="#workspace" className="skip-link">Skip to reading controls</a>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8">
        <a href="#workspace" className="flex min-h-11 items-center gap-2 text-xl font-semibold"><BookOpen size={28} aria-hidden />VoiceVision</a>
        <a href="#extension-help" className="min-h-11 rounded-full border border-line bg-raised px-4 py-2.5 text-sm font-medium">Use on other websites</a>
      </header>
      <main id="workspace" className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div><p className="eyebrow">Your reading workspace</p><h1 className="type-display mt-2 text-4xl sm:text-5xl">Make room for your eyes.</h1><p className="type-body mt-3 text-muted">Bigger text. Softer light. Your pace. Choose what feels easier.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!filters.canUndo} onClick={() => change(filters.undo)} className="workspace-button"><ArrowCounterClockwise size={20} aria-hidden />Undo</button>
            <button type="button" onClick={handleReset} className="workspace-button">Reset all</button>
          </div>
        </div>
        <section aria-label="Starting points" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRESETS.map(preset => <button key={preset.label} type="button" onClick={() => change(() => filters.replace({ ...defaultFilterState, ...preset.settings }))}
            className="preset-button"><preset.icon size={28} aria-hidden /><span><span className="block font-semibold">{preset.label}</span><span className="block text-sm text-muted">{preset.hint}</span></span><span aria-hidden className="ml-auto text-accent">↗</span></button>)}
        </section>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section data-vv-controls aria-labelledby="controls-heading" className="workspace-card">
            <h2 id="controls-heading" className="type-heading mb-2 text-2xl">Tell us what helps</h2>
            <p className="mb-5 text-sm text-muted">Speak, type, or use the controls below.</p>
            <CommandBar onSubmit={submit} cancellationRevision={speechRevision} onReset={handleReset} pending={runner.pending} error={runner.error} entries={runner.entries} />
            {runner.pending && <button type="button" onClick={runner.cancel} className="workspace-button mt-3">Cancel request</button>}
            <label className="my-5 flex min-h-11 items-start gap-3 rounded-lg bg-surface p-3 text-sm">
              <input type="checkbox" checked={runner.allowCloud} onChange={event => change(() => runner.setAllowCloud(event.target.checked))} className="mt-1" />
              <span><span className="block font-medium">Allow AI help for unfamiliar commands</span><span className="block mt-1 text-muted">Off by default. If enabled, unfamiliar commands are sent to our server and Google Gemini. Common commands work locally. Browser voice recognition may use your browser provider’s speech service.</span></span>
            </label>
            <div className="border-t border-line pt-5"><AdaptationControls state={filters.state} onToggle={adaptation => change(() => filters.toggle(adaptation))} onRemove={adaptation => change(() => filters.remove(adaptation))} onIntensityChange={(key, value) => change(() => filters.setIntensity(key, value))} onReadingChange={(key, value) => change(() => filters.setReading(key, value))} onColorAssistChange={assist => change(() => filters.setColorAssist(assist))} onReset={handleReset} /></div>
          </section>
          <section aria-labelledby="preview-heading" className="workspace-card reading-card">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-2"><h2 id="preview-heading" className="eyebrow">Reading preview</h2><span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm text-accent-strong">Changes apply to this page</span></div>
            <article className="reading-copy"><h3 className="type-heading mb-5 text-3xl">A clearer place to start.</h3>{readingText.split('\n\n').map((paragraph, index) => <p key={index} className="mb-5 whitespace-pre-wrap">{paragraph}</p>)}</article>
            <div className="mt-8 border-t border-line pt-5"><label htmlFor="reading-text" className="block font-medium">Try your own text</label><p id="reading-note" className="mt-1 mb-3 text-sm text-muted">Paste a passage to see how your settings feel. This text stays in this tab.</p><textarea id="reading-text" aria-describedby="reading-note" value={readingText} onChange={event => setReadingText(event.target.value)} rows={5} className="w-full rounded-lg border border-line bg-surface p-3" /></div>
            <p className="mt-5 text-sm text-muted">Adjustments support reading comfort. They do not diagnose or treat an eye condition.</p>
          </section>
        </div>
        <details id="extension-help" className="workspace-card mt-6">
          <summary className="type-heading text-xl">Use VoiceVision on other websites</summary>
          <p className="type-body mt-4">The browser extension applies your settings to pages you visit. It is currently installed manually in desktop Chrome or Edge.</p>
          <ol className="mt-4 list-decimal space-y-3 pl-6"><li>Get the extension folder from the <a href="https://github.com/TarunYadgirkar/voicevision" className="font-medium text-accent underline underline-offset-4">VoiceVision repository</a>.</li><li>Open your browser’s Extensions page and enable Developer mode.</li><li>Choose “Load unpacked” and select the extension folder.</li><li>Open a website, then open VoiceVision from your browser toolbar. Choose whether settings apply to this site or all sites.</li></ol>
          <p className="mt-4 text-sm text-muted">Some browser pages and protected websites cannot be changed. This workspace changes its own page; it does not change other tabs.</p>
        </details>
        <details className="workspace-card mt-6">
          <summary className="type-heading text-xl">What these tools can help with</summary>
          <p className="type-body mt-4">Larger text, magnification and contrast are established access strategies for low vision. The right settings depend on your task and preferences; a diagnosis alone does not choose them. <a href="https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/low-vision" className="text-accent underline">National Eye Institute guidance</a></p>
          <p className="type-body mt-4">Blindness in one eye differs from losing part of your visual field. Hiding half the screen removes information and has no established benefit for either condition. VoiceVision does not offer field-loss masks. <a href="https://www.rnib.org.uk/your-eyes/eye-conditions-az/monocular-vision-sight-in-one-eye/" className="text-accent underline">RNIB: vision in one eye</a></p>
          <p className="type-body mt-4">Colour shifts and warm tint are optional experiments in comfort, not vision correction or eye protection. VoiceVision itself has not been clinically validated. <a href="https://www.cochrane.org/evidence/CD003303_reading-aids-adults-low-vision" className="text-accent underline">Cochrane: evidence for reading aids</a></p>
        </details>
        <div className="mt-6"><ProofSection /></div>
        <footer className="mt-8 text-sm text-muted">Built around your preferences. Use your browser’s zoom and assistive tools alongside VoiceVision.</footer>
      </main>
    </>
  );
}
