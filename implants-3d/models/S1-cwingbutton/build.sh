#!/bin/bash
# C-WingButton 2 (deployed): CloverButton + WingButton + two knotless loops.
#   ./build.sh              everything, with Cycles review renders
#   ./build.sh --no-render
set -e
cd "$(dirname "$0")"
BLENDER="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
python ../../materials/make_materials.py
python build_sdf.py
"$BLENDER" -b --factory-startup -P build_blender.py -- "$(cygpath -w "$PWD")" "$@" 2>&1 | grep -E "^\[|Error|Traceback" || true
mkdir -p dist
node ../../tools/optimize.mjs build/cwingbutton_lod0.glb dist/cwingbutton_lod0.glb --webp-quality 85 --max-tex 512 | grep -E "glb:"
node ../../tools/optimize.mjs build/cwingbutton_lod1.glb dist/cwingbutton_lod1.glb --webp-quality 80 --max-tex 256 | grep -E "glb:"
