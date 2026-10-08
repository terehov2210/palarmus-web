#!/bin/bash
# Hip cups, liner, heads + total hip assemblies (DeltaWay and Revistem M stems).
# Needs models/H1-deltaway-stem/build/*.glb and models/H8-revistem/build/*.glb (run their build.sh first).
#   ./build.sh              everything, with Cycles review renders
#   ./build.sh --no-render
set -e
cd "$(dirname "$0")"
BLENDER="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
python ../../materials/make_materials.py
python build_sdf.py
"$BLENDER" -b --factory-startup -P build_blender.py -- "$(cygpath -w "$PWD")" "$@" 2>&1 | grep -E "^\[|Error|Traceback" || true
mkdir -p dist
for f in build/*_lod0.glb; do
  node ../../tools/optimize.mjs "$f" "dist/$(basename "$f")" --webp-quality 85 --max-tex 512 | grep -E "glb:"
done
for f in build/*_lod1.glb; do
  node ../../tools/optimize.mjs "$f" "dist/$(basename "$f")" --webp-quality 80 --max-tex 256 | grep -E "glb:"
done
