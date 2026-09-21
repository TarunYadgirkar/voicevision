# VoiceVision privacy

## What happens to your voice

Speech recognition runs in your browser through the Web Speech API. VoiceVision never records
audio, never uploads audio, and never writes audio to disk.

## What happens to the transcript

The text of what you said stays on your device while the extension's own parser can act on it.
Most commands ("make it dark", "high contrast", "reset") are handled there, and nothing leaves
the browser.

When the on-device parser cannot work out what you meant, the extension sends the transcript
text, and the list of adaptations currently switched on, to the VoiceVision API so a language
model can interpret it. Only that text and that list are sent: no page content, no URL, no page
title, no account or device identifier.

## What the server keeps

Nothing. The API turns the transcript into a set of display settings, returns them, and keeps no
copy. There is no database and no analytics on the server side.

Incoming requests are counted per IP address in memory for one minute at a time, so that a single
client cannot exhaust the shared free-tier quota. Those counters hold no transcript text and are
lost whenever the server instance restarts.

## What stays on your machine

Your active adaptations are saved with the browser's extension storage so a page keeps its
settings when you reload or open it again. They stay on your device and are never uploaded.

## Permissions

- `activeTab` lets the extension adjust the page you are looking at when you open the popup.
- `storage` saves your adaptations locally.
- Microphone access is granted per site by Chrome, and only while you are pressing the mic.
