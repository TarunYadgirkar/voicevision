# VoiceVision accessible reading implementation plan

> For agentic workers: implement bounded tasks in parallel; preserve other workers' changes. Test behavior before implementation and review integration before publication.

Goal: deliver useful, reversible reading adjustments in the web app and extension.
Architecture: extend existing shared state, parser, and filter engine; both clients consume the same reading controls. Keep simulations explicit and optional cloud parsing cancellable.
Tech stack: Next.js, React, TypeScript strict, npm, Vitest, Chrome MV3.

## Constraints
- Voice remains optional; typed and manual controls work without cloud interpretation.
- No clinical treatment/correction claims. Ordinary condition commands never hide content.
- Preserve existing npm lockfile and generated extension bundle workflow.

## Task 1: Shared reading engine
Files: src/types/index.ts, src/lib/{adaptations,filters,intent,persistence}.ts, tests/*.
- [x] Add failing tests: glaucoma/mac degeneration/field loss commands must not create masks; explicit field simulation also must not. Stored legacy masks must not restore.
- [x] Add textScale (1–2), lineSpacing (1.4–2.4), validated state restoration and optional colour comparisons. Keep shared metadata available to both clients.
- [x] Run npm test, then npm run build:ext after integration.

## Task 2: Web interface
Files: src/app/{page.tsx,globals.css}, src/components/{AdaptationControls,ProofSection}.tsx.
- [x] Replace hero-first flow with reading workspace, manual controls, reading sample, preset buttons, optional colour comparison.
- [x] Use native radios, large targets, contrast-safe tokens, narrow-screen reflow, status regions, skip link.
- [x] Verify keyboard, narrow-screen reflow, reduced motion and actual controls in browser. Actual browser200% zoom remains a manual check; see VALIDATION.md.

## Task 3: Extension
Files: extension/{popup.html,popup.css,popup.js,PRIVACY.md}, src/extension/content.ts.
- [x] Add typed commands, text size/line spacing, useful presets, cloud opt-in, undo/reset, recoverable page/microphone errors.
- [x] Reuse shared state and parser, remove field masking from every user command, migrate saved state.
- [x] Verify extension build and popup/content integration.

## Task 4: Command recovery and delivery
Files: src/hooks/{useCommandRunner,useFilterState,useSpeechRecognition}.ts, src/components/{CommandBar,VoiceButton}.tsx, src/app/api/interpret/*, README.md.
- [x] Add request cancellation and stale-response rejection, one-step full-state undo, optional cloud parsing, validated model output, actionable microphone errors.
- [x] Regression tests must exercise reset/newer command against delayed response.
- [x] Run tests, typecheck, lint, production build, extension build; review via code-reviewer, React reviewer and security reviewer.
- [x] Fix findings, commit meaningful segments, push, verify remote branch. Implementation published as812efac; runtime dependencies as6b76619.
