"""Web export: decimate the bones, merge them into as few meshes as the zone logic allows, and
write a GLB with the zone / implant / resection tags as glTF extras.

blender -b <skeleton.blend> -P export.py -- <out.glb> [bone-tris]
(also writes <out>-implants.glb)

Merging: bones are joined when they share a joint, a zone list and a material, so highlighting a
zone still works on the merged mesh. Bones a resected variant replaces stay separate, since the
site hides exactly that mesh. Result: a few dozen draw calls instead of ~350.
"""
import sys, bpy, bmesh
from collections import defaultdict

args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]
BONE_TRIS = int(args[1]) if len(args) > 1 else 140_000
scene = bpy.context.scene
OBJ = bpy.data.objects

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

def apply_modifiers(o):
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)

# Curves (cap seams, brim stitching) become meshes
for o in [o for o in OBJ if o.type == "CURVE"]:
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    m = bpy.data.objects.new(o.name, me)
    scene.collection.objects.link(m)
    m.parent, m.matrix_parent_inverse, m.matrix_basis = o.parent, o.matrix_parent_inverse.copy(), o.matrix_basis.copy()
    for k in o.keys():
        m[k] = o[k]
    bpy.data.objects.remove(o)

meshes = [o for o in OBJ if o.type == "MESH"]
bones = [o for o in meshes if "implant" not in o and not o.name.startswith("Cap ")]
source = sum(tris(o) for o in bones)
ratio = BONE_TRIS / source

# Decimate: a shared ratio, but never below a floor that keeps small bones recognisable
for o in bones:
    t = tris(o)
    r = min(1.0, max(ratio, 160 / max(t, 1)))
    if r < 0.999:
        m = o.modifiers.new("dec", "DECIMATE")
        m.ratio = r
        m.use_collapse_triangulate = True
        # Open edges are the flat cuts between zone pieces (stage2 `split`) or resection rims.
        # Pinning them keeps neighbouring pieces meeting exactly: collapse would move each
        # side's copy of the ring differently and open a crack between zones.
        bm = bmesh.new()
        bm.from_mesh(o.data)
        rim = sorted({v.index for e in bm.edges if e.is_boundary for v in e.verts})
        bm.free()
        if rim:
            vg = o.vertex_groups.new(name="rim")
            vg.add(rim, 1.0, "REPLACE")
            m.vertex_group = "rim"
            m.invert_vertex_group = True
        apply_modifiers(o)
        if rim:
            o.vertex_groups.remove(o.vertex_groups["rim"])
print(f"REPORT bones {source} -> {sum(tris(o) for o in bones)} tris")

# Merge
keep_apart = {o.get("replaces") for o in meshes if o.get("replaces")}
groups = defaultdict(list)
for o in meshes:
    if o.name in keep_apart or "resected" in o:
        continue
    if "implant" in o:
        key = (o.parent.name, "implant", o["implant"], o.data.materials[0].name)
    else:
        key = (o.parent.name, "bone", o.get("zones", ""), o.data.materials[0].name if o.data.materials else "")
    groups[key].append(o)

def merged_name(key, objs):
    if len(objs) == 1:
        return objs[0].name
    parent, kind, tag = key[0], key[1], key[2]
    if kind == "implant":
        return f"Implant {tag} {key[3].split(' ')[-1]} ({parent})"
    if objs[0].name.startswith("Cap "):
        return f"Cap {key[3].split(' ')[-1]}"
    return f"{parent} {tag or 'bones'}"

for key, objs in groups.items():
    if len(objs) < 2:
        continue
    name = merged_name(key, objs)
    props = {k: objs[0][k] for k in objs[0].keys()}
    with bpy.context.temp_override(object=objs[0], active_object=objs[0], selected_objects=objs,
                                   selected_editable_objects=objs):
        bpy.ops.object.join()
    o = objs[0]
    o.name = o.data.name = name
    for k, v in props.items():
        o[k] = v

meshes = [o for o in OBJ if o.type == "MESH"]
for o in meshes:
    for k in [k for k in o.keys() if k not in ("zones", "implant", "resected", "replaces")]:
        del o[k]
    o.hide_render = False  # visibility is the site's job; hidden flags would not survive export anyway
print(f"REPORT meshes {len(meshes)} tris {sum(tris(o) for o in meshes)}")
for o in sorted(meshes, key=lambda o: o.name):
    print("REPORT mesh", o.name, tris(o), dict(o.items()))

# ---------------------------------------------------------------- ambient occlusion -> vertex colours
#
# The meshes have no UVs, so the shading detail goes into a per-vertex colour: baked AO (crevices,
# foramina, joint gaps, under the cap brim), and for bone also the colour itself: warm aged ivory,
# darker and browner where occluded, with a slow, low-contrast variation so the figure does not read
# as one flat plastic. Implants and the cap only get the occlusion, as a multiplier on their
# material colour. The site multiplies COLOR_0 into its materials.
import math
from mathutils import Vector, noise

scene.render.engine = "CYCLES"
try:
    cprefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            cprefs.compute_device_type = kind
            cprefs.get_devices()
            if any(d.type == kind for d in cprefs.devices):
                break
        except TypeError:
            continue
    for d in cprefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:  # CPU is fine, only slower
    print("REPORT bake on CPU:", e)
scene.cycles.samples = 128
if scene.world is None:
    scene.world = bpy.data.worlds.new("bake")
scene.world.light_settings.distance = 0.04  # metres: joint-gap scale, not whole-body

meshes = [o for o in OBJ if o.type == "MESH"]
for o in meshes:
    me = o.data
    for a in list(me.color_attributes):
        me.color_attributes.remove(a)
    me.color_attributes.new("AO", "BYTE_COLOR", "POINT")
    me.color_attributes.active_color = me.color_attributes["AO"]

def bake(targets, hidden):
    for o in meshes:
        o.hide_render = o in hidden
    with bpy.context.temp_override(selected_objects=targets, selected_editable_objects=targets,
                                   active_object=targets[0], object=targets[0]):
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")

hardware = [o for o in meshes if "implant" in o or "resected" in o]
replaced = [o for o in meshes if o.name in keep_apart]
# Resting figure: nothing hidden inside it that would darken it from within
bake([o for o in meshes if o not in hardware], hidden=hardware)
# Opened zones: hardware and cut bones, with the bones they replace out of the way
bake(hardware, hidden=replaced)
for o in meshes:
    o.hide_render = False

IVORY = Vector((0.74, 0.62, 0.45))    # linear; sRGB ~ #ddcfb4
SHADOW = Vector((0.16, 0.1, 0.05))
for o in meshes:
    me = o.data
    attr = me.color_attributes["AO"]
    mw = o.matrix_world
    bone = "implant" not in o and not o.name.startswith("Cap ")
    for v, c in zip(me.vertices, attr.data):
        ao = c.color[0]
        if bone:
            t = ao ** 1.4
            p = mw @ v.co
            n = noise.noise(p * 9.0) * 0.5 + noise.noise(p * 31.0) * 0.25  # ~ +-0.4
            col = SHADOW.lerp(IVORY, t) * (1 + 0.07 * n)
            col.z *= 1 - 0.05 * n  # blotches warm up as they darken
            c.color = (*col, 1)
        else:
            g = 0.5 + 0.5 * ao ** 1.2
            c.color = (g, g, g, 1)
print("REPORT baked AO into", len(meshes), "meshes")

# Two files. The figure (bones, cut bones, cap) is what the hero shows first; the hardware only
# appears once a zone opens, so it ships separately and the site fetches it in the background.
# Both carry the full joint hierarchy, so an implant lands under the joint of the same name.
empties = [o for o in OBJ if o.type == "EMPTY"]
hardware_meshes = [o for o in meshes if "implant" in o]
figure_meshes = [o for o in meshes if "implant" not in o]
for path, part in ((OUT, figure_meshes), (OUT.replace(".glb", "-implants.glb"), hardware_meshes)):
    for o in OBJ:
        o.select_set(o in part or o in empties)
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_image_format="WEBP",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_vertex_color="ACTIVE",
    )
    print("REPORT wrote", path, len(part), "meshes")
