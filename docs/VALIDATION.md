# Software validation

Verified locally October 2, 2026. This records software behavior, not clinical effectiveness or WCAG conformance.

- 118 tests passed across 10 files: command validation, condition safeguards, reading styles, persistence, undo, stale cloud replies, speech errors/cancellation, rate limits and extension protocol.
- ESLint, TypeScript, Next.js production build and Chrome extension build passed.
- Production dependency audit: zero findings. Development dependencies retain upstream advisories; the test environment is not a public service.
- Browser: keyboard `/` focuses command input; Enter applies larger text (18px to21.6px); Undo returns18px. A preset was separately checked at18px to27px.
- Browser:320px and640px viewports reflow without horizontal overflow. System reduced-motion emulation is recognized. Automated axe checks report zero violations on tested web states, including expanded details. These are limited snapshots, not a conformance claim. Actual browser200% zoom and VoiceOver remain untested.
- Real Chromium MV3 extension in an isolated profile: popup preset changes fixture text20px to26px; Undo returns20px. A one-eye-blindness command leaves settings unchanged and creates no mask. Cloud consent starts off. A Chromium storage echo ordering bug discovered here was fixed and covered by regression.
- Extension popup automated axe injection was blocked by its Content Security Policy. No bypass performed and no popup audit pass claimed.
- Live successful microphone capture, live paid cloud interpretation, store publication and affected-user studies remain unverified. Microphone errors and obsolete results have automated coverage.

Reviews covered code correctness, React behavior and API security. Findings were fixed: diagnosis-driven compound commands, stale speech/cloud results, conditional announcements, dynamic/direct-container text, authored page appearance restoration and extension undo.

Before claiming benefit for a particular condition, test reading accuracy, comprehension, task completion, fatigue and preference with affected users. See [evidence boundaries](EVIDENCE.md).
