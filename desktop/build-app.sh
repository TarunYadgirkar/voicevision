#!/bin/bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
output_dir="${1:-$project_dir/dist}"
swift build --package-path "$project_dir" -c release
binary_dir="$(swift build --package-path "$project_dir" -c release --show-bin-path)"
app_dir="$output_dir/VoiceVision.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
cp "$binary_dir/VoiceVision" "$app_dir/Contents/MacOS/VoiceVision"
cp "$project_dir/Info.plist" "$app_dir/Contents/Info.plist"
codesign --force --sign - "$app_dir"
codesign --verify --strict "$app_dir"
echo "Built $app_dir (local ad-hoc signature; not notarized)."
