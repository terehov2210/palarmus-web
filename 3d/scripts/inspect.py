"""Import a skeleton source file, report its structure and render a front/3/4 preview.

blender -b -P inspect.py -- <model.fbx|.obj|.glb> <out-prefix>
"""
import sys, math, bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
src, out = args[0], args[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = src.lower().rsplit(".", 1)[-1]
if ext == "fbx":
    bpy.ops.import_scene.fbx(filepath=src)
elif ext == "obj":
    bpy.ops.wm.obj_import(filepath=src)
else:
    bpy.ops.import_scene.gltf(filepath=src)

def is_bone(o):
    # Z-Anatomy tags labels (.j/.i) and muscle attachment areas (.o*/.e*) by suffix; bones are .l/.r/none
    parts = o.name.rsplit(".", 1)
    return len(parts) == 1 or parts[1] in ("l", "r")

for o in [o for o in bpy.context.scene.objects if o.type == "MESH" and not is_bone(o)]:
    bpy.data.objects.remove(o)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and len(o.data.polygons) > 20]
for o in [o for o in bpy.context.scene.objects if o.type == "MESH" and o not in meshes]:
    bpy.data.objects.remove(o)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
print(f"REPORT meshes={len(meshes)} tris={tris}")
for o in sorted(meshes, key=lambda o: o.name)[:400]:
    print("REPORT obj", o.name, len(o.data.polygons))

# Bounds of the whole figure
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
center, size = (lo + hi) / 2, hi - lo
print("REPORT bounds", tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))

mat = bpy.data.materials.new("bone")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.86, 0.83, 0.77, 1)
bsdf.inputs["Roughness"].default_value = 0.55
for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(mat)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 720, 1080
scene.world = bpy.data.worlds.new("w")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.57, 0.6, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.35

up = max(range(3), key=lambda i: size[i])  # tallest axis is "up"
h = size[up]
key = bpy.data.lights.new("key", "AREA"); key.energy = 60 * h * h; key.size = h
k = bpy.data.objects.new("key", key); scene.collection.objects.link(k)

cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = h * 1.1
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam

def look(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y" if up != 1 else "Z").to_euler()

# Pick the front as -Y when Z is up, +Z when Y is up
for label, ang in (("front", 0), ("34", 35)):
    a = math.radians(ang)
    if up == 2:
        off = Vector((math.sin(a), -math.cos(a), 0))
    else:
        off = Vector((math.sin(a), 0, math.cos(a)))
    cam.location = center + off * h * 3
    k.location = center + (off + Vector((0.6, 0, 0)) + Vector([0.5 if i == up else 0 for i in range(3)])) * h * 2
    look(cam, center); look(k, center)
    scene.render.filepath = f"{out}-{label}.png"
    bpy.ops.render.render(write_still=True)
print("REPORT done")
