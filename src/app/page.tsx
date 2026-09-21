'use client';
import { IshiharaPlate } from '@/components/IshiharaPlate';
import { CommandBar } from '@/components/CommandBar';
import { AdaptationControls } from '@/components/AdaptationControls';
import { ProofSection } from '@/components/ProofSection';
import { getFilterState, useFilterState } from '@/hooks/useFilterState';
import { useCommandRunner } from '@/hooks/useCommandRunner';

function Hero() {
  return (
    <section className="relative isolate pt-10 sm:pt-16">
      {/* The plate sits over the tail of the headline, the way the Hermeus engine crops
          its own hero line. The type stays readable; the plate is what you look at. */}
      <div className="pointer-events-none absolute right-0 top-0 z-20 w-56 sm:w-80 lg:w-[26rem]">
        <IshiharaPlate
          type="deuteranopia"
          drift
          title="An Ishihara plate built from coloured dots, with the digit 7 readable through hue alone"
        />
      </div>

      <h1 className="type-display relative z-10 max-w-3xl text-5xl sm:text-7xl lg:text-8xl">
        Say how you see and the screen changes.
      </h1>

      <p className="type-body relative z-30 mt-6 text-lg text-muted sm:text-xl">
        VoiceVision reads your words on this device and adapts colour, contrast, magnification and motion on
        the page you are already reading. The plate above hides a 7 that only hue can tell you about, so it is
        the first thing to change when you ask for help.
      </p>
    </section>
  );
}

export default function Home() {
  const filters = useFilterState();
  const runner = useCommandRunner({ getState: getFilterState, onCommand: filters.apply });

  const handleReset = () => {
    filters.reset();
    runner.clearHistory();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
      <Hero />

      <section aria-labelledby="controls-heading" className="mt-14 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <h2 id="controls-heading" className="sr-only">
          Adapt this page
        </h2>

        <div className="rounded-lg bg-raised p-5 sm:p-6">
          <CommandBar
            onSubmit={runner.run}
            onReset={handleReset}
            pending={runner.pending}
            error={runner.error}
            entries={runner.entries}
          />
          <div className="mt-6">
            <AdaptationControls
              state={filters.state}
              onToggle={filters.toggle}
              onRemove={filters.remove}
              onIntensityChange={filters.setIntensity}
              onColorAssistChange={filters.setColorAssist}
              onReset={handleReset}
            />
          </div>
        </div>

        <aside className="rounded-lg bg-raised p-5 sm:p-6">
          <h3 className="type-heading text-xl">Things people say</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {[
              'I have deuteranopia',
              'Everything is too bright',
              'Dark mode and bold text',
              'My peripheral vision is gone',
              'Show me what a deuteranope sees',
              'Reset',
            ].map(phrase => (
              <li key={phrase}>
                <button
                  type="button"
                  onClick={() => runner.run(phrase)}
                  className="w-full rounded-md bg-surface px-3 py-2 text-left text-text
                    transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.2,0,0,1)]
                    hover:bg-sunken active:scale-96"
                >
                  {phrase}
                </button>
              </li>
            ))}
          </ul>
          <p className="type-body mt-4 text-sm text-faint">
            The parser on this device answers most of these with no network call. Anything it cannot place goes to
            the model, and the reply says which one handled it.
          </p>
        </aside>
      </section>

      <div className="mt-4">
        <ProofSection />
      </div>
    </main>
  );
}
