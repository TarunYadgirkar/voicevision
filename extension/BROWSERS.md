# Browser packages

Build with `npm run build:ext:browsers`. Generated folders in extension-builds are ignored; source remains extension/ and src/extension/content.ts.

| Browser | Package | Current status |
| --- | --- | --- |
| Chrome, Edge, Brave and compatible Chromium browsers | extension-builds/chromium | Manual Load unpacked. Actual Chromium integration verified; Edge/Brave not individually tested. |
| Firefox140+ | extension-builds/firefox | Load manifest.json with about:debugging → This Firefox → Load Temporary Add-on. Local typing/manual controls; microphone and cloud disabled. Temporary installation ends with browser restart; permanent distribution needs Mozilla signing. Live Firefox run unverified. |
| Safari on Mac | extension-builds/safari, wrapped with extension/build-safari.sh | Xcode project and local ad-hoc build prepared. Developer signing/distribution and Safari activation/runtime still required. No security-setting bypass performed or recommended. |

## Text changes

Text sizing now covers ordinary text, text/email/search/url/tel/number fields, textareas and standard contenteditable editors. Words, input values and selection are left alone; password fields and VoiceVision controls are excluded. Wrap long lines is optional and applies reversible pre-wrap/overflow-wrap/max-width/min-width styles. Reset restores original inline values and priorities. Newly inserted ordinary DOM text is included.

This cannot guarantee reflow in canvas-rendered editors, images/scanned documents, closed shadow roots, embedded frames, protected browser pages or every PDF viewer. Fixed-layout websites can still need browser zoom or the reader. It styles presentation, not document content.

## Safari preparation

```sh
extension/build-safari.sh /path/to/new/output-folder
```

Requires macOS/Xcode with safari-web-extension-packager and Python3. Apple packager currently emits mismatched parent/extension bundle identifiers; the script aligns them. Open the generated Xcode project and configure your developer signing for distribution. A local ad-hoc build is not evidence Safari will accept the extension. Apple packaging guidance: https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari.

Firefox packaging uses its supported background scripts and a separate manifest. It declares no data transmission because cloud and microphone paths are disabled in that variant. Chromium/Safari retain explicit optional cloud consent. Mozilla background compatibility: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background.

## Verification October2,2026

124 tests pass, plus lint, TypeScript, web production and extension builds. Real Chromium popup applied26px text to20px textarea/contenteditable, preserved original words, wrapped a long line with scrollWidth equal toclientWidth, and Reset restored20px and white-space:pre. Safari wrapper builds locally after identifier correction; Firefox/Safari live behavior and store signing remain unverified. See docs/EVIDENCE.md for clinical limits.
