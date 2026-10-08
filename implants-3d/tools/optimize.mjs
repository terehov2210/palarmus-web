// Web packaging for one model GLB: dedup -> textures to WebP -> UVs into [0,1] -> quantize + meshopt.
// node tools/optimize.mjs <in.glb> <out.glb> [--webp-quality 90] [--max-tex 1024]
//
// Uses the gltf-transform install in E:/Palarmus/_3d-work. The CLI `webp` command fails on
// Blender-exported PNGs here ("colourspace: parameter space not set"), so textures are
// re-encoded to WebP with Pillow.
import { createRequire } from 'node:module';
const require = createRequire('E:/Palarmus/_3d-work/package.json');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureTransform } = require('@gltf-transform/extensions');
const { dedup, prune, quantize, meshopt } = require('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = require('meshoptimizer');
import { execFileSync } from 'node:child_process';
const PY_WEBP = `
import sys, io
from PIL import Image
q, m = int(sys.argv[1]), int(sys.argv[2])
im = Image.open(io.BytesIO(sys.stdin.buffer.read()))
im.thumbnail((m, m))
buf = io.BytesIO()
im.save(buf, 'WEBP', quality=q, method=6)
sys.stdout.buffer.write(buf.getvalue())
`;

const [, , inPath, outPath, ...rest] = process.argv;
const opt = (name, def) => {
  const i = rest.indexOf(name);
  return i >= 0 ? Number(rest[i + 1]) : def;
};
const quality = opt('--webp-quality', 90);
const maxTex = opt('--max-tex', 1024);

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inPath);

await doc.transform(dedup(), prune());

doc.createExtension(EXTTextureWebP).setRequired(true);
for (const tex of doc.getRoot().listTextures()) {
  const img = tex.getImage();
  if (!img) continue;
  const before = img.byteLength;
  // Pillow does the encode: sharp/libvips in this install fails on every PNG
  // ("colourspace: parameter space not set").
  const out = execFileSync('python', ['-c', PY_WEBP, String(quality), String(maxTex)], {
    input: Buffer.from(img), maxBuffer: 1 << 28,
  });
  tex.setImage(out).setMimeType('image/webp');
  const uri = tex.getURI();
  if (uri) tex.setURI(uri.replace(/\.\w+$/, '.webp'));
  console.log(`  ${tex.getName() || 'texture'}: ${(before / 1024).toFixed(0)} KB -> ${(out.byteLength / 1024).toFixed(0)} KB`);
}

// UVs here are in tiles (millimetres / tile size), far outside [0,1], which quantize() skips.
// Normalise each primitive's UVs into [0,1] and move the scale/offset into KHR_texture_transform
// on every texture of its material, so TEXCOORD_0 quantizes to 14 bits like everything else.
const transformExt = doc.createExtension(KHRTextureTransform);
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const uv = prim.getAttribute('TEXCOORD_0');
    const mat = prim.getMaterial();
    if (!uv || !mat) continue;
    const a = uv.getArray();
    let [u0, v0, u1, v1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < a.length; i += 2) {
      u0 = Math.min(u0, a[i]); u1 = Math.max(u1, a[i]);
      v0 = Math.min(v0, a[i + 1]); v1 = Math.max(v1, a[i + 1]);
    }
    if (u0 >= 0 && v0 >= 0 && u1 <= 1 && v1 <= 1) continue;
    const su = u1 - u0 || 1, sv = v1 - v0 || 1;
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i += 2) {
      out[i] = (a[i] - u0) / su;
      out[i + 1] = (a[i + 1] - v0) / sv;
    }
    prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(out).setBuffer(uv.getBuffer()));
    // glTF UV space: v grows downwards in image space, and KHR_texture_transform maps
    // uv_tex = offset + scale * uv. Same mapping as before: uv_old = (u0,v0) + (su,sv) * uv_new.
    const infos = [mat.getBaseColorTextureInfo(), mat.getMetallicRoughnessTextureInfo(),
      mat.getNormalTextureInfo(), mat.getOcclusionTextureInfo()].filter(Boolean);
    for (const info of infos) {
      info.setExtension('KHR_texture_transform',
        transformExt.createTransform().setOffset([u0, v0]).setScale([su, sv]));
    }
  }
}

// Quantize to 14-bit positions / 10-bit normals; meshopt then compresses the buffers.
await doc.transform(
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write(outPath, doc);
const { statSync } = await import('node:fs');
console.log(`${outPath}: ${(statSync(outPath).size / 1024).toFixed(0)} KB`);
