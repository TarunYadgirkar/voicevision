# VoiceVision privacy

## Voice and typed commands

VoiceVision does not record or store audio. Voice input uses your browser's Web Speech API. Depending on your browser, speech recognition may send audio to the browser provider's servers. Microphone permission belongs to the website where you use voice input. Typing and buttons work without microphone access.

Common typed and spoken commands are interpreted locally in the browser. VoiceVision does not send these transcripts to its API.

## Optional cloud interpretation

Cloud interpretation is off by default. You can explicitly enable it in the popup's Voice and cloud privacy section. When enabled, unrecognized commands send command text and current display settings to the VoiceVision API and Google Gemini. No page content, URL, page title, or account identifier is included. Network requests expose ordinary connection metadata, including your IP address, to the hosting provider. Avoid personal or medical details in commands; describe the adjustment you want instead.

Turning the option off cancels a pending request and prevents its reply from changing your settings. It cannot retract data already transmitted.

## Retention

VoiceVision has no transcript database or analytics. Its API does not deliberately retain command text. Hosting providers and Google may process or retain data according to their policies; VoiceVision cannot promise that those services retain nothing. The API uses short-lived in-memory IP request counters to limit abuse.

## Local preferences

Display settings, your site/global preference and the cloud opt-in choice are stored in extension storage on your device. Site-specific settings use the site's origin as their storage key. These saved origins are not transmitted by VoiceVision. Transcripts are not persisted. Reset restores display defaults; cloud opt-in can be turned off separately.

## Permissions and limitations

The extension's site access allows it to adjust supported web pages. Storage saves preferences locally. Browser settings pages, extension stores and some PDF viewers cannot be adjusted. Microphone access is requested only when you start voice input. Color adjustments and reading controls are personal preferences, not diagnosis or treatment.
