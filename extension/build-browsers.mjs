import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const output = resolve(source, '../extension-builds');
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));
const files = ['background.js', 'content.js', 'popup.html', 'popup.css', 'popup.js', 'PRIVACY.md', 'icons'];
for (const browser of ['chromium', 'firefox', 'safari']) {
  const target = resolve(output, browser);
  await mkdir(target, { recursive: true });
  for (const file of files) await cp(resolve(source, file), resolve(target, file), { recursive: true });
  const variant = structuredClone(manifest);
  if (browser !== 'chromium') variant.background = { scripts: ['background.js'] };
  if (browser === 'firefox') {
    variant.browser_specific_settings = { gecko: {
      id: 'voicevision@voicevision.app', strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    } };
    const popup = await readFile(resolve(target, 'popup.js'), 'utf8');
    await writeFile(resolve(target, 'popup.js'), `const VOICEVISION_LOCAL_ONLY = true;\n${popup}`);
    await writeFile(resolve(target, 'PRIVACY.md'), '# VoiceVision Firefox privacy\n\nThis package uses local commands and manual reading controls. Cloud interpretation is disabled. Page text and commands are not transmitted. Settings are saved in browser extension storage. Browser speech support may be unavailable; typing and controls remain available. No analytics or background clipboard access.\n');
  }
  await writeFile(resolve(target, 'manifest.json'), `${JSON.stringify(variant, null, 2)}\n`);
}
console.log(`Browser packages prepared in ${output}. Safari still needs its native wrapper and signing.`);
