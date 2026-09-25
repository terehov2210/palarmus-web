/**
 * Blender's raw export -> the GLB the site ships. Same recipe as scripts/pack-model.mjs, minus
 * the simplify pass (export.py already decimated per bone) and with the node tree kept intact:
 * the site finds zones, implants and resected bones by the extras on each mesh node, and the
 * joint empties are the rig for later poses.
 *
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions \
 *                   @gltf-transform/functions meshoptimizer
 *   node 3d/scripts/pack.mjs 3d/source/skeleton-raw.glb public/models/skeleton.glb
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, prune, quantize, reorder, weld, textureCompress } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const [, , input, output] = process.argv;

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(input);
await doc.transform(
  dedup(),
  weld(),
  // Index locality for meshopt's codec; see scripts/pack-model.mjs for the measurement.
  reorder({ encoder: MeshoptEncoder, target: "size" }),
  // keepLeaves: an empty joint with nothing under it yet is still part of the rig.
  prune({ keepLeaves: true, keepExtras: true }),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 88 }),
);
doc.createExtension(KHRMeshQuantization).setRequired(true);
await doc.transform(quantize({ pattern: /.*/, quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }));
doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(output, doc);

const root = doc.getRoot();
const tris = root
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const tagged = root.listNodes().filter((n) => Object.keys(n.getExtras()).length).length;
console.log(`${output}  ${root.listMeshes().length} meshes  ${Math.round(tris / 1000)}k tris  ${tagged} tagged nodes`);
