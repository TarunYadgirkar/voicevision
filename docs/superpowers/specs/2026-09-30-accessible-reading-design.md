# VoiceVision: accessible reading product

Status: approved by user and implemented. Science review updated October 2, 2026.

## Goal

Help disabled people, including people with low vision, color vision differences, light sensitivity, and eye conditions, adjust web content to their individual reading needs. Keep voice optional. Describe adjustments by what they do, without claiming to correct or treat an eye condition.

## Approaches

1. Recommended: improve the existing web app and Chrome extension together. Reuse the shared filter engine and command parser, deliver useful reading controls, and fix recovery and accessibility.
2. Web app only: faster preview, but adaptations stay on the demo page.
3. New native application: broader desktop scope, but requires a separate platform, permission model, and assistive-technology integration. Outside this first release.

## First release

- Replace hackathon-first landing flow with an immediate reading workspace: adjust text, contrast, glare, color, and motion; show a reading sample and clear installation guidance for using the extension on other sites.
- Provide text sizing and line spacing, readable default typography, clearly labeled large controls, keyboard access, visible focus, status announcements, and narrow-screen reflow.
- Offer optional reading presets described by need: larger text, less glare, clearer text, and less motion. Each preset lists its changes and remains adjustable.
- Remove central/peripheral/half-field masks from all user controls and commands, including explicit previews. Keep only optional educational colour comparisons. Previously saved masks must not restore. Condition labels alone and labels accompanying an unrelated functional request must not prescribe settings.
- Preserve optional color adjustments, but replace "Correct my vision" and clinical accuracy claims with descriptions of screen color changes and individual preference.
- Provide one-step undo and always-visible reset. Undo restores the previous full settings snapshot. Reset cancels pending interpretations before clearing changes, so a late AI response cannot reapply them.
- Keep voice, typing, and manual controls equivalent. Report microphone denial, no speech, unsupported speech input, and network failure with a usable alternative. Speech recognition may use the browser vendor's service; distinguish this from local command parsing.
- Keep common commands local. Make cloud interpretation optional, explain what is sent, and validate returned settings before applying. Bound requests and cancel obsolete responses.
- Apply the same safe behavior and useful controls to the Chrome popup, including typed commands and clear feedback when the current page cannot be modified.

## Implementation boundaries

Extend existing FilterState, persistence, shared adaptations, parser, and filter engine. Use these from both the app and extension; rebuild the committed extension bundle. Migrate stored preferences safely. Preserve unrelated changes and follow the repository's npm lockfile.

## Verification

Baseline: 66 tests. Current verification is recorded in docs/VALIDATION.md. Tests do not establish usability.

Add focused regressions for condition commands versus explicit simulation, undo/reset, persistence migration, invalid AI output, and late-response cancellation. Run unit tests, type checks, lint, production build, and extension build. Verify browser flows with keyboard, 200% zoom, a narrow viewport, reduced motion, microphone denial, and failed interpretation. Run an automated accessibility audit. Record VoiceOver and live extension checks only when actually performed.

Product readiness also needs testing with disabled users; automated checks alone cannot establish that this works for their individual conditions.

Reference: WCAG 2.2 https://www.w3.org/WAI/WCAG22/quickref/
