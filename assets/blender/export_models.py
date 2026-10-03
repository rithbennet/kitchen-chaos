"""Export the open .blend without saving optimization changes back to the source.

Blender --background assets/blender/kitchen-chaos.blend --python assets/blender/export_models.py
"""
from pathlib import Path
import bpy

project = Path(bpy.data.filepath).resolve().parents[2]
output = project / 'public/models/kitchen-chaos.glb'
output.parent.mkdir(parents=True, exist_ok=True)
asset_roots = [o for o in bpy.context.scene.objects if o.type == 'EMPTY' and 'asset' in o]
if not asset_roots:
    raise RuntimeError('No named asset roots found in the Blender scene')

# One mesh per asset, one primitive per material: retain pivots, minimize draw calls.
for root in asset_roots:
    children = [o for o in root.children_recursive if o.type in {'MESH', 'CURVE', 'FONT'}]
    bpy.ops.object.select_all(action='DESELECT')
    for child in children:
        child.select_set(True)
    bpy.context.view_layer.objects.active = children[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = root.name + '_mesh'
    # Place the mesh origin exactly at the physics pivot, baking child transforms.
    bpy.context.scene.cursor.location = root.matrix_world.translation
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

bpy.ops.object.select_all(action='DESELECT')
for root in asset_roots:
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=True,export_extras=True,export_animations=False,
    export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,
    export_materials='EXPORT')
print(f'Exported {len(asset_roots)} assets to {output} ({output.stat().st_size:,} bytes)')
