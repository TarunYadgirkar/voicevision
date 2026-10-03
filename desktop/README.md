# VoiceVision for Mac

A native companion for screen comfort and reading across desktop workflows. macOS13 or later; the local build targets your Mac's architecture.

## Use

Open VoiceVision.app. Its settings window and eye icon in the menu bar provide:

- Display-wide click-through dimming and warm tint. Turn on Enable screen adjustments; Reset removes overlays. Explicit dim/tint voice or typed commands enable overlays. Preferences are saved, but overlays always start off on launch.
- A separate reader with adjustable text size/spacing, selectable text, local read-aloud and Stop reading.
- Explicit Paste from clipboard. No background clipboard monitoring or passage persistence.
- Read selected text from the menu bar after selecting a passage in another app. Needs macOS Accessibility permission and an app that exposes selected text. Secure password fields are rejected. Copy/paste remains available without permission.
- Optional Speak a command. Microphone/speech permission is requested only after clicking. Voice requires on-device English recognition; no cloud fallback. Permission-pending and active voice can be cancelled; closing controls cancels it too. Typing/manual controls remain available.
- Undo includes screen activation and preferences. Reset and quitting remove screen overlays.

Try larger text, smaller text, more spacing, less spacing, less glare, brighter screen, warm tint, remove tint, undo or reset. Reader typography applies inside VoiceVision; it cannot rewrite every app's layout. The browser extension supplies website text adjustments. Native system Zoom/Display settings buttons open macOS accessibility options; they do not activate or change those settings.

## Build

```sh
swift test --package-path desktop
desktop/build-app.sh
```

Result: desktop/dist/VoiceVision.app. Optional first argument chooses an output folder. Requires Xcode/Swift6 toolchain. The script signs locally with an ad-hoc signature and verifies it; it does not notarize the application. Distribution to other Macs needs an appropriate architecture build and Developer ID signing/notarization. No security-setting bypass is part of installation.

## Verification and limits

October2,2026: six native core tests pass; executable and release .app build; signature verification passes; packaged app process stays running after launch. Native UI automation failed twice with “Sky Computer Use native pipe closed before response,” so no window-control, actual overlay, multi-display/fullscreen, successful microphone, selected-text permission or VoiceOver pass is claimed. Browser product's118 tests also pass.

Code/security reviews found and fixed negated commands, screen activation omitted from undo, hidden capture after closing controls, and missing secure-field rejection. Selected text and voice still need live permission/usability testing. This is a local first version, not a notarized public release or clinically validated product.

Screen windows use public AppKit APIs and ignore mouse events. Secure/system screens can behave differently; “across apps” does not mean control over every surface. macOS magnification support: https://support.apple.com/en-gb/guide/mac-help/mchl779716b8/mac. Scientific limits: ../docs/EVIDENCE.md.
