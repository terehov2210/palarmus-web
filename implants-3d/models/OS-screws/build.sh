#!/bin/bash
# Osteosynthesis screws #35-41, 47, 48, 50 from the shared screw generator (tools/screws.py).
#   ./build.sh                    everything, with Cycles review renders
#   ./build.sh --no-render
#   ./build.sh --no-render os37   only names starting with os37
set -e
cd "$(dirname "$0")"
BLENDER="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
python ../../materials/make_materials.py
"$BLENDER" -b --factory-startup -P build_blender.py -- "$(cygpath -w "$PWD")" "$@" 2>&1 | grep -E "^\[|Error|Traceback|line [0-9]" || true
mkdir -p dist
for f in build/*_lod0.glb; do node ../../tools/optimize.mjs "$f" "dist/$(basename "$f")" --webp-quality 85 --max-tex 512 | grep -E "glb:"; done
for f in build/*_lod1.glb; do node ../../tools/optimize.mjs "$f" "dist/$(basename "$f")" --webp-quality 80 --max-tex 256 | grep -E "glb:"; done
