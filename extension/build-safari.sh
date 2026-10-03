#!/bin/bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
output_dir="${1:-$HOME/Downloads/VoiceVision-Safari}"
cd "$repo_dir"
npm run build:ext:browsers
xcrun safari-web-extension-packager "$repo_dir/extension-builds/safari" \
  --project-location "$output_dir" --app-name 'VoiceVision Safari' \
  --bundle-identifier com.voicevision.safari --macos-only --swift \
  --copy-resources --no-open --no-prompt
python3 - "$output_dir/VoiceVision Safari/VoiceVision Safari.xcodeproj/project.pbxproj" <<'PYTHON'
import sys
from pathlib import Path
project = Path(sys.argv[1])
project.write_text(project.read_text().replace('com.voicevision.VoiceVision-Safari', 'com.voicevision.safari'))
PYTHON
echo 'Safari project prepared. Developer signing and Safari verification remain required.'
