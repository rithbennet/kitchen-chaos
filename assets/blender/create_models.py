"""Author the Kitchen Chaos toy collection in Blender, then export the game library.

Run with Blender --background --factory-startup --python assets/blender/create_models.py.
Coordinates in helpers are game coordinates: X right, Y up, Z toward the viewer.
The .blend preserves individual editable objects; the exporter merges by material.
"""
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
random.seed(17)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    bpy.data.collections.remove(collection)


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def material(name, hex_color, roughness=.55, metal=0):
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*linear, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    return m


skin = material('Warm porcelain skin', 'eab181', .62)
blush = material('Peach cheeks and ears', 'd98570', .65)
hair = material('Espresso hair', '30272b', .4)
hair_light = material('Chestnut sculpted locks', '644433', .48)
hair_ridge = material('Chestnut highlights', '805b40', .5)
ink = material('Ink', '25353b', .55)
white = material('Warm ivory', 'f8efdb', .63)
eye = material('Eye enamel', '141f24', .19)
teal = material('Deep lagoon enamel', '316c6e', .38)
sage = material('Sage cabinet faces', '6ba4a0', .48)
shadow_teal = material('Cabinet inset', '508883', .5)
blue = material('Sky blue cotton', '83bacf', .85)
blue_light = material('Shirt seams', 'b9dce2', .8)
rust = material('Terracotta enamel', 'db805d', .38)
rust_dark = material('Terracotta edge', 'b85f45', .5)
red = material('Tomato leather', 'c84032', .38)
red_light = material('Glove piping', 'ec7951', .46)
brown = material('Cocoa fabric', '674e42', .88)
thread = material('Apron stitching', 'd5c393', .8)
wood = material('Honey maple', 'be8853', .63)
wood_light = material('Maple edge grain', 'dbac74', .66)
wood_dark = material('Walnut handles', '785037', .59)
metal = material('Brushed steel', 'b3c7c6', .28, .72)
brass = material('Satin brass', 'd6ad61', .3, .68)
glass = material('Bottle green enamel', '3e795d', .22, .12)
oven_glass = material('Smoky oven glass', '293b42', .2, .25)
cream = material('Strawberry gelato', 'e89bb2', .8)
cream_dark = material('Strawberry swirls', 'cb6b90', .76)
leaf = material('Herb green', '507b4c', .8)
tile1 = material('Limestone tile', 'd2d2bd', .8)
tile2 = material('Sage limestone tile', 'a6b9ad', .8)
grout = material('Warm grout', '8e9a90', .95)
wall = material('Warm plaster', 'e5ddc6', .9)
wall_side = material('Sage plaster', 'b1c6bd', .9)
sky = material('Window blue', 'a8d2d9', .58)
orange = material('Orange peel', 'ed933c', .85)

current = None
roots = []


def asset(name, position=(0, 0, 0)):
    global current
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    current = bpy.data.objects.new(name, None)
    collection.objects.link(current)
    current.location = xyz(position)
    current.empty_display_size = .1
    current['asset'] = name
    roots.append(current)
    return current


def finish(obj, name, mat, smooth=True):
    obj.name = name
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    current.users_collection[0].objects.link(obj)
    obj.parent = current
    if mat:
        obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = smooth
    return obj


def bevel(obj, amount, segments=3):
    mod = obj.modifiers.new('Soft manufactured edge', 'BEVEL')
    mod.width = amount
    mod.segments = segments
    mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True


def box(name, pos, size, mat, radius=.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(pos))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius:
        bevel(obj, min(radius, min(size) * .45))
    return finish(obj, name, mat, False)


def ball(name, pos, scale, mat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=xyz(pos))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    return finish(obj, name, mat)


def lathe(name, profile, mat, pos=(0, 0, 0), depth=1, segments=24, pleats=0):
    verts, faces = [], []
    for y, r in profile:
        for i in range(segments):
            a = i * math.tau / segments
            rr = r * (1 + pleats * math.cos(a * 12))
            verts.append(xyz((pos[0]+rr*math.cos(a), pos[1]+y, pos[2]+rr*math.sin(a)*depth)))
    for j in range(len(profile)-1):
        for i in range(segments):
            a = j*segments+i
            b = j*segments+(i+1)%segments
            faces.append((a, a+segments, b+segments, b))
    faces.append(tuple(range(segments)))
    faces.append(tuple(reversed(range((len(profile)-1)*segments, len(profile)*segments))))
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)


def cylinder(name, pos, radius, height, mat, axis='y', bottom=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=bottom if bottom is not None else radius, radius2=radius, depth=height, location=xyz(pos))
    obj = bpy.context.object
    if axis != 'y':
        obj.rotation_mode = 'QUATERNION'
        obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(xyz((1, 0, 0) if axis == 'x' else (0, 0, 1)))
    bevel(obj, min(.012, height*.12, radius*.14), 2)
    return finish(obj, name, mat)


def torus(name, pos, radius, thickness, mat, vertical=False, scale=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness, major_segments=32, minor_segments=8, location=xyz(pos))
    obj = bpy.context.object
    if vertical:
        obj.rotation_euler.x = math.pi/2
    if scale:
        obj.scale = scale
    return finish(obj, name, mat)


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 5
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for b, p in zip(spline.bezier_points, points):
        b.co = xyz(p)
        b.handle_left_type = b.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)


def patch(name, coords, mat, thickness=.008):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in coords], [], [tuple(range(len(coords)))])
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    mod = obj.modifiers.new('Fabric thickness', 'SOLIDIFY')
    mod.thickness = thickness
    bevel(obj, .006, 2)
    return finish(obj, name, mat, False)


def text(name, content, pos, size, mat):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = content
    data.align_x = 'CENTER'
    data.size = size
    data.extrude = .0008
    data.resolution_u = 3
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(pos)
    obj.rotation_euler.x = math.pi/2
    return finish(obj, name, mat)


PARTS = {'head':(0,3.23,.4),'chest':(0,2.51,.4),'hips':(0,1.94,.4),
         'armL':(-.49,2.51,.4),'foreL':(-.55,1.98,.43),'handL':(-.57,1.64,.46),
         'armR':(.49,2.51,.4),'foreR':(.55,1.98,.43),'handR':(.57,1.64,.46),
         'thighL':(-.18,1.46,.4),'shinL':(-.18,.82,.4),'footL':(-.18,.39,.49),
         'thighR':(.18,1.46,.4),'shinR':(.18,.82,.4),'footR':(.18,.39,.49)}


def make_character(kind):
    female = kind == 'woman'
    offset = .88 if female else -.88
    for part, position in PARTS.items():
        asset(kind+'_'+part, (position[0]+offset, position[1]-.265, position[2]))
        if part == 'head':
            ball('Sculpted face', (0,0,0), (.376,.418,.326), skin, 32, 20)
            ball('Soft chin', (0,-.223,.056), (.256,.18,.252), skin)
            for s in [-1,1]:
                ball('Ear', (s*.373,-.012,.002), (.073,.111,.084), skin)
                ball('Ear inset', (s*.399,-.014,.047), (.027,.061,.035), blush, 16, 8)
                ball('Cheek', (s*.225,-.098,.265), (.083,.044,.015), blush, 16, 8)
                ball('Eye white', (s*.13,.035,.304), (.067,.083,.027), white)
                ball('Chocolate eye', (s*.127,.03,.328), (.034,.055,.018), eye)
                ball('Eye glint', (s*.127-.012,.049,.344), (.011,.014,.007), white, 12, 8)
                curve('Expressive eyebrow', [(s*.071,.159,.305),(s*.13,.176,.309),(s*.194,.158,.284)], .015, hair)
            ball('Button nose', (0,-.046,.326), (.054,.066,.064), skin)
            curve('Smile', [(-.082,-.178,.294),(0,-.198,.312),(.08,-.177,.294)], .009, hair_light)
            if female:
                # A fitted rear bob, with individually swept locks and a side part.
                ball('Rounded bob back', (0,.058,-.126), (.404,.407,.267), hair, 28, 18)
                for s in [-1,1]:
                    ball('Bob side', (s*.329,-.052,-.016), (.091,.337,.248), hair)
                    for i in range(3):
                        curve('Bob strand', [(s*(.33+i*.018),.19,.058),(s*(.367+i*.006),-.06,.10),(s*(.319+i*.016),-.32,.07)], .005, hair_light)
                for i in range(6):
                    o=ball('Side swept fringe', (-.205+i*.077,.30+(i*.008),.183), (.109,.12,.178), hair)
                    o.rotation_euler.y = -.35
                ball('Hair clip', (.333,.194,.207), (.064,.027,.025), brass, 16, 8)
                for s in [-1,1]:
                    ball('Stud earring', (s*.407,-.066,.075), (.022,.022,.024), brass, 12, 8)
            else:
                ball('Fitted hair back', (0,.14,-.065), (.37,.301,.292), hair_light)
                # Swept overlapping quiff volumes replace the old spiky cylinders.
                for i in range(5):
                    o=ball('Sculpted quiff', (-.235+i*.101,.322+(4-i)*.011,.09), (.142,.146,.222), hair_light)
                    o.rotation_euler.y = -.35
                    curve('Quiff groove', [(-.28+i*.105,.34,.219),(-.27+i*.105,.434,.08),(-.21+i*.105,.42,-.09)], .006, hair_ridge)
                for s in [-1,1]:
                    torus('Round brass spectacles', (s*.143,.027,.351), .116,.012,brass,True)
                    curve('Spectacle temple', [(s*.259,.055,.345),(s*.373,.074,.143),(s*.379,.025,.005)], .01,brass)
                curve('Spectacle bridge', [(-.024,.041,.355),(0,.063,.374),(.024,.041,.355)], .01,brass)
        elif part == 'chest':
            cloth = blue if female else white
            lathe('Tailored shirt', [(-.405,.251),(-.37,.293),(-.19,.303),(.12,.319),(.29,.292),(.385,.201),(.408,.111)], cloth, depth=.68)
            cylinder('Neck', (0,.45,0), .10,.16,skin)
            for s in [-1,1]:
                patch('Folded collar', [(s*.012,.383,.119),(s*.16,.324,.18),(s*.105,.208,.213),(s*.015,.286,.207)], blue_light if female else thread)
                curve('Shoulder seam', [(s*.1,.365,.074),(s*.23,.316,.145),(s*.298,.225,.10)], .005, blue_light if female else thread)
            apron = rust if female else teal
            patch('Apron bib', [(-.163,.234,.221),(-.228,-.369,.216),(.228,-.369,.216),(.163,.234,.221)],apron)
            for s in [-1,1]:
                curve('Apron neck strap', [(s*.139,.22,.231),(s*.137,.331,.19),(s*.104,.376,.067)], .013,apron)
                ball('Apron rivet', (s*.136,.206,.237), (.014,.014,.008),brass,12,8)
            box('Apron pocket',(0,-.199,.232),(.256,.133,.022),apron,.018)
            curve('Pocket stitching',[(-.114,-.15,.247),(-.106,-.246,.247),(.105,-.246,.247),(.114,-.15,.247)],.0035,thread)
            text('Apron monogram','K', (0,.01,.232),.105,white)
        elif part == 'hips':
            if female:
                lathe('Pleated skirt',[(-.426,.383),(-.396,.401),(-.20,.344),(.12,.292),(.172,.286)],brown,depth=.67,segments=48,pleats=.026)
                lathe('Skirt hem',[(-.419,.389),(-.397,.403),(-.378,.392)],wood_dark,depth=.67,segments=48,pleats=.026)
            else:
                box('Tailored trousers',(0,-.003,0),(.603,.317,.373),ink,.1)
            lathe('Apron waist tie',[ (.113,.304),(.16,.304)],rust if female else teal,depth=.68)
            patch('Apron skirt',[(-.219,.12,.22),(-.238,-.295,.25),(.238,-.295,.25),(.219,.12,.22)],rust if female else teal)
            curve('Apron hem',[(-.216,-.264,.26),(0,-.279,.26),(.216,-.264,.26)],.004,thread)
        elif part.startswith('arm'):
            cloth = blue if female else white
            lathe('Soft sleeve',[(-.298,.077),(-.262,.117),(-.16,.119),(.12,.147),(.246,.133),(.301,.05)],cloth,depth=.91)
            lathe('Turned sleeve cuff',[(-.283,.123),(-.234,.125),(-.214,.12)],blue_light if female else thread,depth=.95)
        elif part.startswith('fore'):
            lathe('Forearm',[(-.243,.055),(-.211,.085),(-.08,.091),(.134,.103),(.22,.089),(.242,.043)],skin,depth=.93)
        elif part.startswith('hand'):
            s = -1 if part.endswith('R') else 1
            ball('Boxing glove',(0,-.01,.008),(.162,.17,.147),red)
            ball('Folded thumb',(s*.119,.002,.062),(.073,.107,.076),red)
            lathe('Leather wrist',[ (.086,.105),(.128,.113),(.188,.101)],red_light,depth=.9)
            box('Woven glove label',(0,.133,.108),(.098,.041,.012),white,.008)
            curve('Glove welt',[(-.119,-.088,.079),(0,-.139,.102),(.101,-.099,.10)],.0055,red_light)
            for x in [-.036,0,.036]:
                curve('Glove stitching',[(x,-.045,.149),(x,-.09,.134)],.003,red_light)
        elif part.startswith('thigh'):
            lathe('Upper leg',[(-.325,.06),(-.277,.122),(-.08,.139),(.19,.143),(.285,.102),(.325,.03)],skin if female else ink,depth=.93)
            if not female:
                curve('Trouser side seam',[(.136,.23,0),(.139,0,0),(.119,-.24,0)],.004,teal)
        elif part.startswith('shin'):
            lathe('Lower leg',[(-.318,.047),(-.272,.093),(-.06,.114),(.15,.125),(.274,.101),(.314,.037)],skin if female else ink,depth=.94)
            if female:
                lathe('Ribbed sock',[(-.307,.088),(-.26,.11),(-.02,.117),(.045,.113)],ink,depth=.95)
                lathe('Sock stripe',[ (.003,.118),(.026,.118)],thread,depth=.96)
        elif part.startswith('foot'):
            box('Rubber sole',(0,-.09,.035),(.281,.064,.451),thread,.052)
            ball('Leather shoe',(0,-.016,.043),(.139,.12,.219),teal if female else wood_dark)
            box('Heel tab',(0,.035,-.142),(.072,.1,.044),rust,.017)
            ball('Toe cap',(0,-.034,.159),(.127,.071,.095),white)
            for i in range(3):
                curve('Shoelace',[(-.054,.083-i*.012,.018+i*.042),(0,.096-i*.014,.025+i*.042),(.054,.083-i*.012,.018+i*.042)],.007,white)


def make_props():
    asset('prop_pan',(1.50,2.01,-3.02))
    lathe('Spun steel pan',[(-.05,0),(-.05,.232),(-.028,.281),(.055,.323),(.078,.325),(.083,.304),(.005,.264),(-.017,.21),(-.017,0)],ink,segments=40)
    torus('Polished rolled rim',(0,.072,0),.316,.012,metal)
    box('Pan handle',(0,.005,.571),(.138,.074,.552),wood_dark,.03)
    box('Handle ferrule',(0,.007,.322),(.116,.064,.105),metal,.015)
    torus('Hanging eye',(0,.01,.873),.046,.012,metal)
    for z in [.32,.4]:
        cylinder('Handle rivet',(0,.044,z),.016,.012,brass)
    asset('prop_bottle',(3.08,2.17,-2.98))
    lathe('Blown bottle',[(-.285,0),(-.285,.089),(-.267,.115),(-.23,.118),(.12,.118),(.179,.103),(.229,.044),(.349,.043),(.378,.047),(.398,.047),(.40,0)],glass,segments=32)
    lathe('Paper label',[(-.19,.12),(-.005,.12)],white,segments=32)
    text('Bottle label','OLIO',(0,-.12,.122),.049,teal)
    curve('Olive sprig',[(-.02,-.061,.123),(0,-.025,.124),(.016,-.01,.123)],.003,leaf)
    ball('Olive',(.019,-.045,.128),(.01,.017,.007),leaf,12,8)
    cylinder('Cork',(0,.404,0),.045,.048,wood)
    torus('Bottle base bead',(0,-.253,0),.112,.007,glass)
    asset('prop_rolling',(-.1,1.97,-2.8))
    cylinder('Maple barrel',(0,0,0),.104,.55,wood,'x')
    for s in [-1,1]:
        cylinder('End grain',(s*.271,0,0),.099,.016,wood_light,'x')
        cylinder('Walnut grip',(s*.352,0,0),.043,.153,wood_dark,'x')
        ball('Grip cap',(s*.435,0,0),(.032,.049,.049),wood_dark)
    for y in [-.049,.026,.061]:
        z=math.sqrt(.104**2-y**2)
        curve('Maple grain',[(-.24,y,z),(-.04,y+.003,z),(.245,y-.003,z)],.0018,wood_light)
    asset('prop_plate',(3.95,1.91,-2.86))
    lathe('Glazed ceramic plate',[(-.021,0),(-.021,.157),(-.008,.195),(.018,.245),(.037,.262),(.047,.255),(.028,.219),(.008,.177),(.007,0)],white,segments=40)
    torus('Hand painted rim',(0,.04,0),.246,.006,teal)
    asset('prop_orange',(.08,1.98,-3.29))
    o=ball('Dimpled orange',(0,0,0),(.13,.124,.13),orange,24,16)
    for v in o.data.vertices:
        v.co *= 1 + random.uniform(-.025,.025)
    ball('Stem dimple',(0,.122,0),(.021,.009,.022),wood_dark,12,8)
    o=ball('Citrus leaf',(.035,.132,0),(.048,.012,.02),leaf,16,8)
    o.rotation_euler.y=.2
    asset('prop_egg',(-2.65,1.96,-3.05))
    o=ball('Egg shell',(0,0,0),(.112,.154,.112),white,24,16)
    for v in o.data.vertices:
        taper=1-.13*v.co.z
        v.co.x*=taper
        v.co.y*=taper
    asset('prop_gelato',(-2.32,2.04,-2.98))
    o=ball('Scooped gelato',(0,0,0),(.2,.185,.2),cream,24,16)
    for v in o.data.vertices:
        v.co*=1+.025*math.sin(v.co.x*23)*math.sin(v.co.y*19)
    for i in range(7):
        a=i*math.tau/7
        ball('Scooped edge',(math.cos(a)*.138,-.098,math.sin(a)*.138),(.077,.059,.077),cream,16,8)
    for i in range(3):
        curve('Strawberry ripple',[(-.10+i*.065,.098,.12),(-.13+i*.065,.14,.06),(-.12+i*.065,.165,-.018)],.007,cream_dark)
    asset('prop_bomb',(-2.95,2.06,-2.77))
    ball('Cast bomb shell',(0,0,0),(.219,.219,.219),ink,28,18)
    torus('Equator seam',(0,0,0),.22,.004,metal)
    cylinder('Fuse socket',(0,.222,0),.066,.065,brass)
    torus('Fuse socket rim',(0,.25,0),.055,.01,metal)
    curve('Braided fuse',[(0,.256,0),(.034,.321,0),(.123,.332,0),(.179,.284,0)],.013,wood_light)


def make_kitchen():
    asset('kitchen')
    box('Floor foundation',(0,-.19,0),(10,.35,10),grout,.04)
    for x in range(-5,5):
        for z in range(-5,5):
            box('Stone tile',(x+.5,.005,z+.5),(.987,.018,.987),tile1 if (x+z)%2 else tile2,.006)
    box('Back plaster wall',(0,2.6,-3.8),(10,5.6,.22),wall,.015)
    box('Side plaster wall',(-5,2.6,-.12),(.2,5.6,7.5),wall_side,.015)
    box('Back skirting',(0,.12,-3.657),(9.9,.19,.08),white,.01)
    for row in range(4):
        for col in range(17):
            x=-4.9+col*.61+(row%2)*.3
            if x<4.8:
                box('Glazed backsplash',(x,1.95+row*.3,-3.667),(.586,.286,.029),white,.012)
    box('Cabinet carcass',(.72,.87,-3.02),(7.8,1.62,1.23),teal,.055)
    box('Stone countertop',(.72,1.76,-3.01),(7.94,.15,1.35),white,.046)
    box('Plinth',(.72,.12,-2.35),(7.78,.13,.1),ink,.017)
    for x in [-2.58,-1.5,-.42,.66,1.74,2.82,3.9]:
        box('Shaker cabinet door',(x,.89,-2.365),(1.01,1.31,.07),sage,.026)
        box('Recessed door panel',(x,.85,-2.321),(.81,.99,.021),shadow_teal,.024)
        curve('Brass drawer pull',[(x-.15,1.393,-2.281),(x-.15,1.393,-2.22),(x+.15,1.393,-2.22),(x+.15,1.393,-2.281)],.019,brass)
        for s in [-1,1]:
            cylinder('Pull mount',(x+s*.15,1.393,-2.285),.028,.025,brass,'z')
    # A beveled cooker with a recessed glass door and real cast-iron trivets.
    box('Cooker frame',(1.5,.89,-2.276),(1.12,1.42,.12),ink,.045)
    box('Oven door steel surround',(1.5,.775,-2.193),(.985,.906,.059),metal,.048)
    box('Oven dark glass',(1.5,.759,-2.154),(.879,.733,.029),oven_glass,.062)
    box('Oven inner window',(1.5,.742,-2.132),(.715,.51,.018),ink,.035)
    for y in [.6,.75,.89]:
        box('Visible oven rack',(1.5,y,-2.118),(.62,.012,.012),metal,.004)
    curve('Oven handle',[(1.115,1.287,-2.17),(1.115,1.287,-2.069),(1.88,1.287,-2.069),(1.88,1.287,-2.17)],.029,metal)
    for i in range(4):
        x=1.17+i*.22
        cylinder('Stove dial',(x,1.492,-2.17),.064,.046,metal,'z')
        box('Dial pointer',(x,1.527,-2.14),(.009,.029,.008),ink,.002)
    box('Enamel cooktop',(1.5,1.863,-3),(1.25,.056,1.1),ink,.027)
    for x in [1.19,1.83]:
        for z in [-3.28,-2.72]:
            cylinder('Burner cap',(x,1.912,z),.127,.04,metal)
            torus('Trivet ring',(x,1.936,z),.18,.016,ink)
            for a in range(4):
                dx,dz=math.cos(a*math.pi/2),math.sin(a*math.pi/2)
                curve('Trivet arm',[(x+dx*.105,1.958,z+dz*.105),(x+dx*.234,1.952,z+dz*.234)],.017,ink)
    # Layered basin shell, rounded lip, drain and a gooseneck mixer.
    box('Sink flange',(-1.49,1.847,-3.04),(1.083,.048,.73),metal,.09)
    box('Deep basin shadow',(-1.49,1.876,-3.04),(.922,.027,.577),oven_glass,.096)
    box('Basin interior',(-1.49,1.888,-3.04),(.728,.009,.386),metal,.085)
    cylinder('Sink drain',(-1.49,1.896,-3.04),.062,.008,ink)
    torus('Drain rim',(-1.49,1.901,-3.04),.05,.006,metal)
    curve('Gooseneck tap',[(-1.49,1.877,-3.46),(-1.49,2.287,-3.46),(-1.49,2.405,-3.273),(-1.49,2.239,-3.10)],.037,metal)
    cylinder('Tap foot',(-1.49,1.893,-3.46),.082,.055,metal)
    cylinder('Mixer',(-1.03,1.962,-3.43),.053,.171,metal)
    curve('Mixer lever',[(-1.03,2.023,-3.43),(-1.03,2.08,-3.38),(-1.03,2.081,-3.29)],.018,metal)
    for x in [2.68,3.76]:
        box('Upper cabinet',(x,3.75,-3.44),(1.01,1.30,.62),teal,.035)
        box('Upper shaker door',(x,3.75,-3.102),(.95,1.22,.075),sage,.027)
        box('Upper inset',(x,3.75,-3.057),(.747,1.016,.02),shadow_teal,.02)
        curve('Upper brass pull',[(x-.29,3.39,-3.041),(x-.29,3.39,-2.977),(x-.29,3.68,-2.977),(x-.29,3.68,-3.041)],.018,brass)
    box('Extractor canopy',(1.49,3.25,-3.27),(1.3,.18,.94),metal,.055)
    box('Extractor chimney',(1.49,3.66,-3.42),(.57,.76,.55),metal,.037)
    for i in range(9):
        box('Extractor vent',(1.05+i*.11,3.191,-2.992),(.046,.017,.25),ink,.005)
    # Window trim and a view of soft green hills, as modeled inset layers.
    box('Window frame',(-1.19,3.68,-3.64),(2.47,1.62,.13),white,.035)
    box('Daylight panes',(-1.19,3.68,-3.55),(2.24,1.4,.05),sky,.006)
    box('Garden horizon',(-1.19,3.13,-3.51),(2.23,.29,.02),tile2,.003)
    for x in [-1.98,-1.3,-.57]:
        ball('Garden hill',(x,3.18,-3.52),(.41,.16,.026),tile2,20,12)
    box('Window mullion',(-1.19,3.68,-3.48),(.064,1.4,.073),white,.01)
    box('Window cross rail',(-1.19,3.69,-3.48),(2.24,.063,.073),white,.01)
    box('Oak sill',(-1.19,2.83,-3.49),(2.65,.10,.39),wood,.03)
    # Rounded retro fridge, inset gaskets, embossed badge and grocery note.
    box('Retro refrigerator',(-4.10,1.77,-2.97),(1.49,3.48,1.38),rust_dark,.115)
    for y,h in [(1.21,2.01),(2.84,1.12)]:
        box('Refrigerator gasket',(-4.10,y,-2.232),(1.421,h+.025,.056),ink,.061)
        box('Rounded fridge door',(-4.10,y,-2.171),(1.397,h,.161),rust,.095)
        hy=y+.13
        curve('Fridge chrome handle',[(-3.587,hy-.19,-2.093),(-3.587,hy-.19,-1.977),(-3.587,hy+.25,-1.977),(-3.587,hy+.25,-2.093)],.032,metal)
    text('Fridge badge','CHILL',(-4.1,3.136,-2.076),.083,white)
    o=box('Grocery note',(-4.269,2.72,-2.079),(.316,.349,.016),white,.01)
    o.rotation_euler.y=.1
    text('Note heading','MILK',(-4.27,2.76,-2.063),.047,teal)
    text('Note second line','EGGS',(-4.27,2.685,-2.063),.047,teal)
    ball('Tomato magnet',(-4.27,2.877,-2.048),(.035,.035,.019),red,16,8)
    box('Open oak shelf',(-3.73,4.,-3.47),(1.63,.115,.55),wood,.027)
    for x in [-4.28,-3.18]:
        curve('Shelf bracket',[(x,3.82,-3.68),(x,3.825,-3.37),(x,3.944,-3.26)],.016,brass)
    for i in range(3):
        x=-4.25+i*.39
        lathe('Ceramic storage jar',[(-.13,.082),(-.11,.105),(.106,.105),(.135,.087)], [white,sage,rust][i],pos=(x,4.18,-3.47))
        cylinder('Jar wood lid',(x,4.324,-3.47),.114,.035,wood)
        ball('Jar lid knob',(x,4.352,-3.47),(.025,.023,.025),brass,12,8)
    cylinder('Utensil rail',(3.24,2.77,-3.33),.023,1.4,metal,'x')
    for i in range(3):
        x=2.76+i*.4
        torus('Utensil hook',(x,2.735,-3.306),.044,.009,brass,True)
        cylinder('Utensil handle',(x,2.512,-3.3),.021,.34,wood_dark)
        if i == 1:
            box('Spatula blade',(x,2.28,-3.3),(.136,.195,.026),metal,.02)
            for dx in [-.038,0,.038]:
                box('Spatula slot',(x+dx,2.295,-3.283),(.012,.119,.005),ink,.005)
        else:
            ball('Spoon bowl',(x,2.288,-3.3),(.072,.097,.032),metal)
    box('Butcher block',(-.10,1.868,-2.81),(.76,.057,.51),wood,.055)
    for dx in [-.2,0,.2]:
        box('Board grain',(-.1+dx,1.9,-2.81),(.008,.002,.427),wood_light,.001)
    box('Folded towel',(-2.53,1.859,-2.43),(.37,.038,.59),white,.024)
    for x in [-2.65,-2.6,-2.46,-2.41]:
        box('Towel woven stripe',(x,1.88,-2.43),(.018,.004,.53),rust,.001)
    cylinder('Soap bottle',(-2.2,2.024,-3.35),.097,.29,brass,bottom=.108)
    cylinder('Soap pump',(-2.2,2.198,-3.35),.024,.076,ink)
    box('Soap spout',(-2.2,2.235,-3.318),(.123,.029,.047),ink,.01)
    lathe('Terracotta planter',[(-.124,.104),(.10,.162),(.14,.167),(.152,.147),(.09,.139)],rust,pos=(-.31,2.,-3.35))
    cylinder('Pot soil',(-.31,2.112,-3.35),.137,.014,brown)
    for i in range(11):
        a=i*2.4
        x,z=-.31+math.sin(a)*.13,-3.35+math.cos(a)*.13
        curve('Herb stalk',[(-.31,2.1,-3.35),(x,2.23,z),(x,2.33+math.sin(i)*.05,z)],.007,leaf)
        o=ball('Herb leaf',(x,2.287+math.sin(i)*.04,z),(.067,.143,.027),leaf,16,8)
        o.rotation_euler.y=math.sin(a)*.6
    cylinder('Pendant flex',(.1,5.05,-.5),.018,.63,ink)
    lathe('Spun pendant',[(-.133,.375),(-.11,.389),(.077,.128),(.15,.09)],teal,pos=(.1,4.61,-.5),segments=40)
    cylinder('Warm diffuser',(.1,4.486,-.5),.35,.018,white)


make_character('man')
make_character('woman')
make_props()
make_kitchen()

# Editable source contains the assembled game scene, named part pivots and all details.
scene=bpy.context.scene
scene.world.color=(.22,.22,.22)
bpy.ops.object.camera_add(location=xyz((6.1,5.6,11.2)))
camera=bpy.context.object
camera.name='Art review camera'
camera.rotation_euler=(xyz((0,1.6,-.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=49
scene.camera=camera
for name,pos,power,size in [('Key',(-3,8,6),1700,6),('Fill',(4,5,1),900,5)]:
    bpy.ops.object.light_add(type='AREA',location=xyz(pos))
    light_obj=bpy.context.object
    light_obj.name=name
    light_obj.data.energy=power
    light_obj.data.shape='DISK'
    light_obj.data.size=size
    light_obj.rotation_euler=(xyz((0,1,-1))-light_obj.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.render.resolution_x=1440
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=roots[0]
source=ROOT/'assets/blender/kitchen-chaos.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)

# Export using the same path as a manual edit of the .blend file.
exec(compile((ROOT/'assets/blender/export_models.py').read_text(),str(ROOT/'assets/blender/export_models.py'),'exec'))
