'use client';
import { useState } from 'react';
import { Eye, Quotes } from '@phosphor-icons/react';
import { Disclosure } from '@/components/Disclosure';
import { CommandBar } from '@/components/CommandBar';
import { AdaptationControls } from '@/components/AdaptationControls';
import { ChangeLedger } from '@/components/ChangeLedger';
import { ProofSection } from '@/components/ProofSection';
import { getFilterState, useFilterState } from '@/hooks/useFilterState';
import { useCommandRunner } from '@/hooks/useCommandRunner';

// Each phrase is a real request the on-device parser understands, so a click shows the
// product working without a microphone, a network call or an API key.
const PHRASES = ['The text is too small', 'Lines feel cramped', "There's too much glare", 'Make the words clearer', 'Less motion, please'];

const SAMPLE_TEXT = 'A little space can make a big difference.\n\nReading should feel comfortable. Change the text size, give each line more room, or soften the light until this page works for you. There is no single setting that suits everyone.\n\nTry one change at a time. Your preferences stay on this browser, and you can undo a change or reset whenever you want.';

// A <details> that is itself the fragment target does not open on its own.
function openExtensionHelp() {
  const details = document.getElementById('other-websites');
  if (details instanceof HTMLDetailsElement) details.open = true;
}

export default function Home() {
  const filters = useFilterState();
  const runner = useCommandRunner({ getState: getFilterState, onCommand: filters.apply, onUndo: filters.undo });
  const [readingText, setReadingText] = useState(SAMPLE_TEXT);
  const [speechRevision, setSpeechRevision] = useState(0);
  const handleReset = () => { setSpeechRevision(value => value + 1); runner.clearHistory(); filters.reset(); };
  const change = (action: () => void) => { setSpeechRevision(value => value + 1); runner.cancel(); action(); };
  const submit = (transcript: string) => { setSpeechRevision(value => value + 1); void runner.run(transcript); };

  return (
    <>
      <a href="#describe" className="skip-link">Skip to reading controls</a>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <a href="#workspace" className="flex min-h-11 items-center gap-2.5 text-xl font-bold">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-signal text-on-signal"><Eye size={22} weight="bold" /></span>
          VoiceVision
        </a>
        <a href="#other-websites" onClick={openExtensionHelp} className="button shrink-0 px-3 text-sm sm:px-4 sm:text-base">Browser extension</a>
      </header>

      <main id="workspace" className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 pb-16 sm:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <section id="describe" data-vv-controls aria-labelledby="hero-heading" className="flex flex-col gap-7 lg:sticky lg:top-6 lg:pt-6">
            <div className="flex flex-col gap-4">
              <h1 id="hero-heading" className="type-display">Say what&rsquo;s hard to see.</h1>
              <p className="type-lead text-muted">Describe the problem and this page adjusts to fix it. Common requests are understood on your device.</p>
            </div>

            <CommandBar onSubmit={submit} cancellationRevision={speechRevision} pending={runner.pending} error={runner.error} entries={runner.entries} />
            {runner.pending && <button type="button" onClick={runner.cancel} className="button self-start">Cancel request</button>}

            <div className="flex flex-col gap-3">
              <h2 className="type-label">Or try one of these</h2>
              <ul className="flex flex-wrap gap-2">
                {PHRASES.map(phrase => (
                  <li key={phrase}>
                    <button type="button" className="phrase aria-disabled:opacity-50" aria-disabled={runner.pending} onClick={() => { if (!runner.pending) submit(phrase); }}>
                      <Quotes size={18} weight="fill" aria-hidden className="shrink-0 text-muted" />{phrase}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={runner.allowCloud} onChange={event => change(() => runner.setAllowCloud(event.target.checked))} className="mt-0.5" />
              <span className="flex flex-col gap-1">
                <span className="text-base font-bold">Use Gemini for requests VoiceVision doesn&rsquo;t recognise</span>
                <span className="text-muted">Off by default. When on, those requests and your current settings go to our server and Google Gemini. Page text is never sent. Spoken requests may also pass through your browser&rsquo;s speech service.</span>
              </span>
            </label>
          </section>

          <article aria-labelledby="preview-heading" className="sheet overflow-hidden">
            <ChangeLedger state={filters.state} canUndo={filters.canUndo} onUndo={() => change(filters.undo)} onReset={handleReset}
              onRemove={adaptation => change(() => filters.remove(adaptation))} onReadingChange={(key, value) => change(() => filters.setReading(key, value))} />
            <div className="reading-copy flex flex-col gap-5 px-5 py-8 sm:px-10 sm:py-12">
              <h2 id="preview-heading" className="type-title">A clearer place to start</h2>
              {readingText.split('\n\n').map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}
            </div>
            <div className="flex flex-col gap-2 border-t border-line-soft bg-surface px-5 py-6 sm:px-10">
              <label htmlFor="reading-text" className="font-bold">Paste your own text</label>
              <p id="reading-note" className="text-sm text-muted">See how your settings feel on something you actually read. It stays in this tab.</p>
              <textarea id="reading-text" aria-describedby="reading-note" value={readingText} onChange={event => setReadingText(event.target.value)} rows={4}
                className="w-full rounded-[var(--radius-md)] border border-line bg-raised p-3" />
            </div>
          </article>
        </div>

        <section data-vv-controls aria-labelledby="manual-heading" className="panel flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="manual-heading" className="type-title">Adjust by hand</h2>
            <p className="text-muted">Sliders and switches change the same settings your words do.</p>
          </div>
          <AdaptationControls state={filters.state} onToggle={adaptation => change(() => filters.toggle(adaptation))}
            onIntensityChange={(key, value) => change(() => filters.setIntensity(key, value))} onReadingChange={(key, value) => change(() => filters.setReading(key, value))}
            onColorAssistChange={assist => change(() => filters.setColorAssist(assist))} />
        </section>

        <section aria-label="More about VoiceVision" className="flex flex-col">
          <Disclosure id="other-websites" title="Use VoiceVision on other websites">
            <p className="type-body">The browser extension applies your settings to pages you visit. Install it manually in Chrome, Edge or Brave. A local Firefox package and a Safari development wrapper are also available; their signing and release steps differ.</p>
            <ol className="type-body flex list-decimal flex-col gap-2 pl-6">
              <li>Get the extension folder from the <a href="https://github.com/TarunYadgirkar/voicevision" className="font-bold underline">VoiceVision repository</a>.</li>
              <li>Open your browser&rsquo;s Extensions page and turn on Developer mode.</li>
              <li>Choose &ldquo;Load unpacked&rdquo; and select the extension folder.</li>
              <li>Open a website, then open VoiceVision from your browser toolbar. Choose whether settings apply to this site or all sites.</li>
            </ol>
            <p className="type-body text-sm text-muted">The extension can style standard text and typing areas and optionally wrap long lines without rewriting words. Canvas editors, some PDF viewers, embedded frames and protected browser pages have limits. This workspace changes its own page, not other tabs.</p>
          </Disclosure>
          <Disclosure title="What these tools can help with">
            <p className="type-body">Larger text, magnification and contrast are established access strategies for low vision. The right settings depend on your task and preferences; a diagnosis alone does not choose them. <a href="https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/low-vision" className="underline">National Eye Institute guidance</a></p>
            <p className="type-body">Blindness in one eye differs from losing part of your visual field. Hiding half the screen removes information and has no established benefit for either condition, so VoiceVision does not offer field-loss masks. <a href="https://www.rnib.org.uk/your-eyes/eye-conditions-az/monocular-vision-sight-in-one-eye/" className="underline">RNIB: vision in one eye</a></p>
            <p className="type-body">Colour shifts and warm tint are optional comfort experiments, not vision correction or eye protection. VoiceVision has not been clinically validated. <a href="https://www.cochrane.org/evidence/CD003303_reading-aids-adults-low-vision" className="underline">Cochrane: evidence for reading aids</a></p>
          </Disclosure>
          <ProofSection />
        </section>

        <footer className="flex flex-col gap-1 text-sm text-muted">
          <p>Adjustments support reading comfort. They do not diagnose or treat an eye condition. Use your browser&rsquo;s zoom and assistive tools alongside VoiceVision.</p>
          <p>Started at the AI Collective Tri-Valley hackathon, June 2026. <a href="https://github.com/TarunYadgirkar/voicevision" className="underline">Source on GitHub</a></p>
        </footer>
      </main>
    </>
  );
}
