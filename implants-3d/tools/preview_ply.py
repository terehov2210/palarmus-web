"""Shape check for reference meshes: workbench renders from several directions, one sheet.

blender -b --factory-startup -P preview_ply.py -- <out.png> <a.ply> [<b.ply> ...]
Views: front (-Y), side (+X), top (+Z), bottom (-Z), and two 3/4 views. Meshes in mm.
"""
import bpy, sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out, plys = Path(args[0]), args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
objs = []
for p in plys:
    bpy.ops.wm.ply_import(filepath=p)
    objs += bpy.context.selected_objects
for o in objs:
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth()
lo = Vector((min(v[i] for o in objs for v in o.bound_box) for i in range(3)))
hi = Vector((max(v[i] for o in objs for v in o.bound_box) for i in range(3)))
c, size = (lo + hi) / 2, max(hi - lo)

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (0.78, 0.78, 0.8)
sc.display.shading.show_cavity = True
sc.render.resolution_x = sc.render.resolution_y = 600
sc.world = bpy.data.worlds.new("w")
sc.world.color = (0.22, 0.22, 0.24)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.type = "ORTHO"
cam.data.ortho_scale = size * 1.15
sc.collection.objects.link(cam)
sc.camera = cam
views = [(0, -1, 0.001), (1, 0, 0.001), (0.001, 0.001, 1), (0.001, 0.001, -1), (0.6, -0.7, 0.4), (-0.6, 0.6, -0.5)]
tmp = []
for i, d in enumerate(views):
    d = Vector(d).normalized()
    cam.location = c + d * size * 3
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = str(out.with_name(f"_v{i}.png"))
    bpy.ops.render.render(write_still=True)
    tmp.append(sc.render.filepath)
# stitch with Blender's own image API (no PIL inside Blender)
W = 600
sheet = bpy.data.images.new("sheet", W * 3, W * 2)
px = [0.0] * (W * 3 * W * 2 * 4)
for i, f in enumerate(tmp):
    img = bpy.data.images.load(f)
    src = list(img.pixels)
    ox, oy = (i % 3) * W, (1 - i // 3) * W
    for y in range(W):
        row = src[y * W * 4:(y + 1) * W * 4]
        start = ((oy + y) * W * 3 + ox) * 4
        px[start:start + W * 4] = row
    Path(f).unlink()
sheet.pixels = px
sheet.filepath_raw = str(out)
sheet.file_format = "PNG"
sheet.save()
