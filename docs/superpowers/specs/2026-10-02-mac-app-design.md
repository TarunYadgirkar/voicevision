# VoiceVision for Mac

User requested whole-computer accessibility and chose Mac first. Existing broad implementation authorization applies.

Native SwiftUI/AppKit app, macOS13+. A native app is preferable to an Electron website wrapper for display windows and accessible system controls. Keep the existing browser extension for page text reflow; do not claim arbitrary third-party app text can be rewritten.

First deliverable: installable local .app with menu-bar access and a settings window; click-through dimming/warm overlays across attached displays and Spaces; reader for explicitly pasted or accessibility-selected text; adjustable reader typography, local read-aloud, optional on-device speech commands, undo/reset, saved numeric preferences. Overlays start disabled each launch; quitting removes them. No condition-triggered changes, screen recording, cloud parsing, automatic clipboard reads or background text harvesting. Permission denial leaves typing/manual controls available.

macOS Zoom/Display settings are opened for operating-system magnification/contrast. Do not silently modify those preferences or pretend opening settings enables them. Selected text needs Accessibility permission and depends on source-app support; clipboard paste is the explicit fallback. Voice needs microphone/speech consent and an on-device recognizer. No signing certificate or notarization is assumed.

Test settings bounds, condition commands, repeated-command undo, reset and persistence normalization. Compile/package; exercise the real app UI and actual display overlays without claiming successful permissions, speech, multiple monitors or fullscreen behavior unless verified. Review code and document remaining distribution/usability gates.
