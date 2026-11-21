"""기준 화면(전투 화면 · 도토리 초원)용 그림 10장 — E 광택 캐주얼풍으로 유닛·적·배경을 한 그림체로 맞춘다.
사용: python3 art/ref/jobs.py && python3 tools/codex_art.py 3 99 art/ref/jobs.json   →  art/ref/raw/*.png
게임에 넣기: python3 -I art/ref/apply.py   →  www/img/v2/ (주소에 ?art=2 를 붙이면 이 그림으로 보인다)
 · 유닛: 군별마다 2×2 한 장(왼쪽 위 보병 · 오른쪽 위 포병 · 왼쪽 아래 의무 · 오른쪽 아래 통신), 대기 자세만.
 · 적(고철 군단): 3칸 × 2줄 한 장(병정 · 드론 · 장갑차 / 정예 표적 · 대장 전차 · 고철 더미)
 · 배경: 땅 한 장 + 길 바닥 한 장(둘 다 화면 가득, 흰 바탕 아님) + 소품 12개 시트"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = ('polished casual mobile game art style, smooth vector shapes with glossy gradient shading, strong shiny highlights, vivid saturated colors, clean thick dark brown outlines')
CHIBI = (STYLE + '; very cute chibi proportions with a huge round head and a tiny body (2 heads tall), big round sparkling dark eyes with white highlights, rosy cheeks, '
         'a bold simple silhouette that stays readable when the picture is shrunk to a tiny size')
UNIT = ("A game sprite sheet with exactly four separate chibi character illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no labels, no text, no arrows, no ground, no cast shadows. Art style: " + CHIBI + ". "
        "All four figures are the same {who}, standing upright on two legs like a person, full body, facing the viewer and turned very slightly to the right, with the same cute face. "
        "It is clearly an animal (animal head, ears, muzzle or beak, fur or feathers, tail), not a human. The character wears {wear}. "
        "Top-left: {a}. Top-right: {b}. Bottom-left: {c}. Bottom-right: {d}. "
        "Each figure is the same size, centered inside its own quadrant, nothing overlapping, nothing touching the image edges and nothing crossing into another quadrant. "
        "No insignia, no emblems, no flags, no letters, no numbers, original character design.")
MED = 'wearing a white armband with a red cross and holding a white first-aid bag with a big red cross'
B = {
 'army': ('cute anthropomorphic puppy soldier: a fluffy tan-and-cream Korean Jindo-style puppy with pointy ears poking out through the helmet, a black button nose, a cream muzzle and a curled-up fluffy tail',
          'a round helmet with an olive-green woodland camouflage cover and a matching olive-green camouflage uniform with dark brown boots',
          'holding a black rifle at rest across the body', 'hugging one big olive artillery shell with both paws', MED,
          'wearing a headset, carrying an olive radio backpack with a long antenna and holding a radio handset'),
 'navy': ('cute anthropomorphic seal pup sailor: a chubby light-gray spotted seal pup with long whiskers, a black nose, flippers used like hands and a small tail flipper',
          'a white round sailor cap with a navy blue band and a white sailor uniform with a navy blue square collar and a navy blue neckerchief',
          'holding a black rifle at rest across the body', 'hugging one big gray naval gun shell with both flippers', MED,
          'wearing big headphones and holding a small gray radar dish'),
 'marine': ('cute anthropomorphic crocodile marine: a small bright green crocodile with a long rounded snout, a friendly toothy grin, a pale yellow belly and a thick bumpy tail',
            'a brown-green camouflage field cap with a short brim, a matching brown-green camouflage uniform and a bright red neck scarf',
            'holding a black rifle at rest across the body with a confident grin', 'hugging one big olive artillery shell with both arms', MED,
            'carrying an olive radio backpack with a long antenna and holding a radio handset'),
 'sf': ('cute anthropomorphic white tiger cub commando: a white tiger cub with bold black stripes, round ears, a pink nose, icy blue eyes and a long striped tail',
        'a plain black beret and a black tactical uniform with a dark gray vest and black boots',
        'holding a compact black submachine gun at rest with a cool little smirk', 'holding a bundle of three red dynamite sticks in one paw and a small detonator box in the other', 
        'wearing a red cross patch on the arm and holding a black medical bag with a big red cross',
        'wearing a headset with a microphone and carrying a black radio backpack with a long antenna'),
 'air': ('cute anthropomorphic young falcon airman: a small brown falcon with a cream speckled chest, a small hooked yellow beak, dark teardrop marks under the eyes, feathered wings used like arms and hands, and yellow feet',
         'a blue garrison side cap and a sky-blue uniform shirt with dark blue trousers',
         'holding a black rifle at rest across the body', 'carrying a short green anti-aircraft missile launcher tube on one shoulder', MED,
         'wearing a black headset with a microphone and holding a small tablet'),
 'police': ("cute anthropomorphic Steller's sea eagle police officer: a chubby sea eagle chick with dark chocolate-brown feathers, a white forehead patch, white shoulder feathers, a short white tail, "
            "a very big bright orange-yellow hooked beak, yellow feet, and feathered wings used like arms and hands",
            'a navy blue police cap with a black brim and a light blue police shirt with navy blue trousers',
            'holding a short black police baton with a friendly smile', 'wearing a navy blue riot helmet with a clear visor pushed up and holding a big rectangular transparent riot shield in front',
            'wearing a white armband with a red cross and holding a white first-aid kit box with a big red cross', 'holding a black walkie-talkie up to the beak'),
}
jobs = []
def add(file, prompt, w=1024, h=1024, scene=False): jobs.append({'file': 'art/ref/raw/' + file, 'w': w, 'h': h, 'prompt': prompt, **({'scene': True} if scene else {})})
add('ground.png', "A top-down (bird's-eye view, looking straight down) background painting of a sunny acorn meadow for a casual mobile tower defense game, filling the entire image edge to edge. Art style: " + STYLE.replace('clean thick dark brown outlines', 'soft thin outlines')
    + ". The whole middle of the picture is calm open lawn: bright fresh green grass with gentle lighter and darker painted patches, a few tiny clover leaves, tiny white and yellow flowers and a few fallen brown acorns scattered sparsely. "
    "Only along the four outer edges of the picture there is a narrow border of denser decoration seen from above: round oak tree canopies with acorns, round bushes, mossy rocks, red mushrooms and oak leaves. "
    "No path, no road, no buildings, no characters, no animals, no text, no letters, no user interface, no frame. Evenly lit, cheerful, not too busy, medium contrast so that game pieces placed on top stay easy to see.", 1024, 1536, True)
add('road.png', "A seamless-looking top-down ground texture for a casual mobile game, filling the entire image edge to edge with no border: a warm sandy beige dirt path surface with small rounded pebbles, a few flat stepping stones, "
    "tiny cracks and a few tiny grass tufts, seen from straight above. Art style: " + STYLE.replace('clean thick dark brown outlines', 'soft thin outlines') + ". "
    "Uniform everywhere (no single focal object, no vignette, no dark corners), evenly lit, low contrast, gentle details only. No grass field, no objects, no characters, no text, no frame.", 1024, 1536, True)
add('props.png', "A game sprite sheet with exactly twelve separate prop illustrations arranged in a clean grid of 4 columns and 3 rows with wide empty gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no frames, no labels, no text, no letters, no numbers, no cast shadows. Art style for every prop: " + STYLE + ". These are scenery props for a cute acorn meadow battlefield, each seen from the front and slightly above. "
    "Row 1, left to right: (1) a round leafy oak tree with a short trunk and a few brown acorns among the leaves; (2) a round green bush with small red berries; (3) a cluster of three red mushrooms with white spots; (4) a mossy gray boulder with a small grass tuft. "
    "Row 2, left to right: (5) a neat pile of brown acorns; (6) a wooden signpost with one arrow-shaped plank and a carved paw print; (7) a short section of rustic wooden picket fence; (8) a patch of white daisies and yellow buttercups. "
    "Row 3, left to right: (9) a tree stump with rings on top and a tiny sprout; (10) a low barricade wall made of stacked burlap sacks stuffed with acorns; (11) a wooden flagpole with a red triangular pennant flag; (12) a wooden barrel beside a small wooden crate. "
    "Each prop is centered in its own cell, all about the same visual size, nothing overlapping, nothing touching the image edges or crossing into another cell.", 1536, 1024)
# 적 1차(raw/enemies_a.png)는 녹슨 금속을 사실적으로 칠해 어둡고 유닛과 그림체가 달랐다 → 유닛과 같은 2등신·굵은 윤곽선·밝은 색으로 다시 그렸다
add('enemies.png', "A game sprite sheet with exactly six separate enemy illustrations arranged in a clean grid of 3 columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no labels, no text, no letters, no numbers, no ground, no cast shadows. Art style: " + CHIBI + ". Simple toy-like shapes with few details, flat clean color areas and one glossy highlight each, NOT realistic, NOT gritty, no rust texture, no scratches. "
    "These are the 'Scrap Legion': cute but naughty little toy robots, painted in bright steel-blue and light gray with red and yellow accents and glowing red eyes, all facing and moving toward the right side. "
    "Row 1, left to right: (1) a small robot foot soldier with an upside-down tin bucket as a helmet, one big round glowing red eye, a boxy light steel-blue body, short stubby arms and legs, marching with a grumpy look; "
    "(2) a small flying drone robot: a round light-gray ball body with one big glowing red eye, two little spinning propellers on top and a tiny red antenna ball; "
    "(3) a chunky armored car robot: a squat rounded dark steel-blue vehicle with thick bolted plates, four small fat wheels, two angry glowing red eyes on the front and a little exhaust pipe with one small smoke puff. "
    "Row 2, left to right: (4) an elite robot captain: a bigger bulky purple robot with gold trim, a tall gold antenna crest, two glowing red eyes and big round fists; "
    "(5) a boss: a big chubby bright red toy tank with a short fat cannon, a round gold hatch on top, two angry glowing yellow eyes on the turret and gray caterpillar tracks, clearly the largest one; "
    "(6) a small heap of broken robot parts: a gear, a spring, a bolt and a bent steel-blue plate, with one small puff of smoke. "
    "Each one is centered in its own cell, nothing overlapping, nothing touching the image edges or crossing into another cell. No insignia, no emblems, no flags, original designs.", 1536, 1024)
for k, (who, wear, a, b, c, d) in B.items(): add(f'units_{k}.png', UNIT.format(who=who, wear=wear, a=a, b=b, c=c, d=d))
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장', max(len(j['prompt']) for j in jobs))

# ══ 2차 (2026-11-21, 사용자가 이 그림체로 확정) ═══════════════════════════════
#  조합 병과 36종(군별 3×2 한 장) · 대기실 배경 · 지역 보스 9종 · 나머지 지역 9곳의 땅·길·소품.  사용: python3 art/ref/jobs.py && python3 tools/codex_art.py 3 99 art/ref/jobs.json
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(HERE)), 'tools'))
import soft_jobs as S
MIX = ['inf-art', 'inf-med', 'inf-sig', 'art-med', 'art-sig', 'med-sig']
FIX = {  # 동물 세계관에 안 맞는 예전 문구(사람 손·개 동반)를 바꾼 것
 ('police', 'med-sig'): (None, 'holding a big yellow search flashlight in one wing, with a tiny white search drone hovering beside the shoulder'),
 ('police', 'art-med'): ('a bulky dark green padded bomb disposal suit with a big round helmet and a clear face visor', 'holding small wire cutters'),
}
SHEET6 = ("A game sprite sheet with exactly six separate chibi character illustrations arranged in a clean grid of 3 columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
          "No borders, no panels, no labels, no text, no arrows, no ground, no cast shadows. Art style: " + CHIBI + ". "
          "All six figures are the same {who}, standing upright on two legs like a person, full body, facing the viewer and turned very slightly to the right, with the same cute face. "
          "It is clearly an animal (animal head, ears, muzzle or beak, fur or feathers, tail), not a human. Unless said otherwise the character wears {wear}. "
          "Row 1, left to right: (1) {p0}; (2) {p1}; (3) {p2}. Row 2, left to right: (4) {p3}; (5) {p4}; (6) {p5}. "
          "Each figure is the same size, centered inside its own cell, nothing overlapping, nothing touching the image edges and nothing crossing into another cell. "
          "No insignia, no emblems, no flags, no letters, no numbers, no humans, original character design.")
def animalize(t): return t.replace('both hands', 'both arms').replace(' beside him', ' beside').replace(' his ', ' the ').replace('near the face', 'near the eyes')
for k, (who, wear, *_rest) in B.items():
    ps = []
    for m in MIX:
        outfit, idle = FIX.get((k, m)) or S.BR[k][2][m][:2]
        ps.append((f'wearing {outfit} instead of the usual outfit, ' if outfit else '') + animalize(idle))
    add(f'mix_{k}.png', SHEET6.format(who=who, wear=wear, **{f'p{i}': p for i, p in enumerate(ps)}), 1536, 1024)

add('title.png', "A cheerful key-art illustration for a cute mobile tower defense game, portrait orientation, filling the entire image. Art style: " + CHIBI + ". "
    "In the lower third, six cute anthropomorphic animal soldiers stand side by side behind a low wall of stacked burlap sacks full of acorns, facing the viewer with brave happy faces: from left to right "
    "a gray spotted seal pup in a white sailor uniform and sailor cap, a green crocodile in a camouflage field cap with a red neck scarf, a fluffy tan-and-cream Korean Jindo-style puppy with upright pointy triangular ears poking out through holes in its round olive camouflage helmet (the ears must stand up, not floppy), a black button nose and a cream muzzle, in an olive camouflage uniform holding a rifle (in the middle, slightly bigger), "
    "a white tiger cub in a black beret and black tactical uniform, a brown falcon in a sky-blue air force shirt and blue side cap, and a dark brown sea eagle with a big orange beak in a navy police cap and light blue police shirt. "
    "Behind them a sunny green meadow with oak trees and a winding dirt path; far away on the path a few small toy-like steel-blue robots with red eyes and one small red toy tank are approaching. "
    "The upper half of the image is a clear bright blue sky with a few soft white clouds and a gentle sun glow, kept simple and empty. The caps and uniforms are plain: no badges, no anchors, no wings, no stars, no insignia. No text, no letters, no logo, no user interface, no frame, no humans.", 1024, 1536, True)

ROBOT = (CHIBI + ". Simple toy-like shapes with few details, flat clean color areas and one glossy highlight each, NOT realistic, NOT gritty, no rust texture. "
         "These are boss machines of the 'Scrap Legion': big naughty toy robots and vehicles with angry glowing yellow eyes, all facing and moving toward the right side. ")
add('bosses_a.png', "A game sprite sheet with exactly six separate boss enemy illustrations arranged in a clean grid of 3 columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no labels, no text, no letters, no numbers, no ground, no cast shadows. Art style: " + ROBOT +
    "Row 1, left to right: (1) a chubby teal-blue toy hovercraft with a black rubber skirt, a big round fan at the back and water spray; (2) a heavy orange-brown toy truck carrying one huge fat cannon on its back; "
    "(3) a white and ice-blue toy armored car with thick rounded plates, snow piled on its roof and a snowplow at the front. "
    "Row 2, left to right: (4) a round dark-green toy helicopter with spinning rotor blades and stubby landing skids; (5) a dark red toy armored car with a flamethrower nozzle at the front shooting a small orange flame; "
    "(6) a purple toy truck carrying a rack of colorful firework rockets pointing up and forward. "
    "Each one is centered in its own cell, about the same size, nothing overlapping, nothing touching the image edges or crossing into another cell. No insignia, no emblems, no flags, original designs.", 1536, 1024)
add('bosses_b.png', "A game sprite sheet with exactly four separate boss enemy illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no labels, no text, no letters, no numbers, no ground, no cast shadows. Art style: " + ROBOT +
    "Top-left: a flying drone carrier: a fat gray flying saucer-like machine with four propellers and round holes from which two tiny drones peek out. "
    "Top-right: a dark storm-gray toy bomber airplane with two propellers and a small dark cloud with a lightning bolt trailing behind it. "
    "Bottom-left: a giant steel robot: a tall bulky silver-blue humanoid robot with huge fists, shoulder plates, a chest reactor glowing orange and a small crown-like antenna. "
    "Bottom-right: a small round wooden training target dummy on a stand with a red and white bullseye. "
    "Each one is centered in its own quadrant, nothing overlapping, nothing touching the image edges or crossing into another quadrant. No insignia, no emblems, no flags, original designs.", 1024, 1024)

SOFT = STYLE.replace('clean thick dark brown outlines', 'soft thin outlines')
AREA = {  # 지역: (땅 한가운데, 가장자리 장식, 길 바닥, 소품 12개 — 큰 것 6 · 작은 것 5 · 덤 1)
 'beach': ('a sunny seashell beach', 'warm pale golden sand with gentle ripple marks, a few small seashells and one or two starfish scattered sparsely',
           'turquoise shallow sea water with white foam, palm leaves, big seashells, starfish, driftwood and beach grass',
           'damp darker tan beach sand with scattered small seashells, pebbles and tiny bits of seaweed',
           'a leaning palm tree with coconuts; a big sandcastle with a tiny flag; a striped beach parasol stuck in the sand; a wooden rowboat pulled ashore; a stack of wooden crates with a fishing net; a big spiral conch shell on a rock; '
           'a red starfish; a pile of seashells; a small crab; a patch of beach grass; a coconut cut in half; a red and white life ring leaning on a post'),
 'desert': ('a sunny cactus desert', 'pale yellow desert sand with soft dune shadows, a few tiny pebbles and dry grass tufts scattered sparsely',
            'green cactuses with pink flowers, orange sandstone rocks, dry bushes and small pottery jars',
            'cracked orange-brown dry clay ground with small stones and a few dry twigs',
            'a tall green saguaro cactus with pink flowers; a round barrel cactus cluster; a big orange sandstone rock arch; a wooden water well with a bucket; a striped desert tent; a stack of clay pots and jars; '
            'a small prickly pear cactus; a dry tumbleweed; a pile of sandstone pebbles; a tiny desert flower patch; a wooden canteen and rope; a wooden wagon wheel leaning on a rock'),
 'snow': ('a snowy hill in winter', 'clean white snow with soft pale-blue shadows, gentle sparkles and a few small footprints scattered sparsely',
          'snow-covered pine trees, snowy bushes with red berries, icy rocks, little snow mounds and frozen puddles',
          'packed brown earth path with small stones and thin patches of melting snow along it',
          'a snow-covered pine tree; a cheerful snowman with a carrot nose and scarf; a small log cabin woodpile covered with snow; an icy blue rock with icicles; a wooden sled with a sack; a round igloo; '
          'a snowy bush with red berries; a pile of snowballs; a small frozen puddle with a fish shape; a tiny pine sapling in snow; a lantern on a snowy post; a wooden signboard covered with snow'),
 'city': ('an old ruined market town square', 'worn pale gray cobblestone pavement with moss in the cracks, a few fallen leaves and small weeds scattered sparsely',
          'broken market stalls with striped awnings, cracked brick walls, wooden crates of fruit, barrels, street lamps and potted plants',
          'old reddish-brown brick pavement with a few missing bricks and small weeds in the cracks',
          'a market stall with a red and white striped awning and fruit crates; a broken brick wall corner with ivy; an old iron street lamp; a wooden cart with pumpkins; a stone fountain with water; a stack of barrels and sacks; '
          'a crate of apples; a potted flower; a pile of loose bricks; a wooden stool with a basket; a hanging shop sign on a post without any writing; a small pile of pumpkins'),
 'jungle': ('a vine-covered jungle riverside', 'deep green jungle grass with big leaf shadows, tiny ferns and a few fallen tropical flowers scattered sparsely',
            'big tropical leaves, hanging vines, pink and orange jungle flowers, mossy stones, bamboo and a blue river edge',
            'dark reddish-brown muddy jungle path with small roots, pebbles and fallen leaves',
            'a jungle tree with hanging vines and broad leaves; a clump of tall green bamboo; a mossy ancient stone statue head of a friendly frog; a giant pink tropical flower plant; a wooden rope bridge post with ropes; a hollow log with mushrooms; '
            'a big fern; a pile of yellow bananas; a red tropical flower; a mossy pebble pile; a tiny blue frog on a leaf; a bamboo fence section'),
 'volcano': ('a fiery volcano slope', 'dark charcoal-gray volcanic rock ground with faint warm orange glow in thin cracks and a little ash scattered sparsely',
             'glowing orange lava pools and lava streams, black jagged rocks, small smoking vents and red crystals',
             'dark basalt stone path with thin glowing orange lava cracks and small black pebbles',
             'a small smoking volcano cone with lava dripping; a cluster of red glowing crystals; a jagged black rock spire; a charred dead tree with embers; a pool of bubbling orange lava ringed with rocks; a stone brazier with a big flame; '
             'a small smoking vent; a pile of black rocks with one glowing ember; a red crystal shard; a little lava bubble puddle; a burnt tree stump; an iron torch on a pole'),
 'harbor': ('a lighthouse harbor dock', 'light gray concrete quay floor with painted pale lines worn away, small puddles and a few rope bits scattered sparsely',
            'deep blue sea water with small waves, wooden pier posts with ropes, life rings, stacked colorful cargo crates, anchors and seagull feathers',
            'weathered warm brown wooden dock boards with nail heads and small gaps, seen from straight above, no clear direction',
            'a red and white striped lighthouse; a stack of colorful cargo containers; a big iron anchor leaning on a post; a harbor crane hook with a crate; a small fishing boat on a trailer; a pile of barrels and coiled ropes; '
            'a mooring post with rope; a crate of fish; a red and white life ring; a small lobster trap; a seagull standing on a post; a signal lamp on a pole'),
 'airfield': ('a grassy airfield above the clouds', 'short pale green airfield grass with soft cloud shadows and a few tiny white flowers scattered sparsely',
              'fluffy white clouds drifting over the edges, orange windsocks, striped runway markers, small landing lights and fuel barrels',
              'dark gray asphalt runway surface with tiny cracks, a few small white and yellow paint specks, evenly worn',
              'an airfield control tower with a striped roof; an orange windsock on a pole; a small parked blue propeller plane; a round radar dish on a stand; a stack of fuel barrels; an open hangar toolbox cart; '
              'an orange traffic cone pair; a runway landing light; a small fluffy cloud; a wooden crate with a parachute; a red and white striped barrier; a spare airplane propeller leaning on a crate'),
 'hq': ('the inside yard of a dark scrap-metal fortress at night', 'dark navy steel floor plates with rivets, faint red glow lines and a few loose bolts scattered sparsely',
        'tall scrap metal walls, big gears, red warning lights, pipes with steam, piles of junk metal and glowing red control panels',
        'dark gunmetal riveted floor plating with faint red glowing seams and small bolts',
        'a tall scrap-metal watchtower with a red light; a huge gear half-buried in the floor; a pile of junk robot parts; a steaming pipe machine with a pressure gauge; a red glowing control console; a stack of steel drums; '
        'a red warning lamp on a short pole; a small heap of bolts and nuts; a broken robot arm; a little steam vent; a spring and gear pile; a spiked metal barricade'),
}
for th, (place, mid, edge, road, props) in AREA.items():
    add(f'ground_{th}.png', f"A top-down (bird's-eye view, looking straight down) background painting of {place} for a casual mobile tower defense game, filling the entire image edge to edge. Art style: " + SOFT
        + f". The whole middle of the picture is calm open ground: {mid}. Only along the four outer edges of the picture there is a narrow border of denser decoration seen from above: {edge}. "
        "No path, no road, no buildings in the middle, no characters, no animals, no text, no letters, no user interface, no frame. Evenly lit, not too busy, medium contrast so that game pieces placed on top stay easy to see.", 1024, 1536, True)
    add(f'road_{th}.png', f"A seamless-looking top-down ground texture for a casual mobile game, filling the entire image edge to edge with no border: {road}, seen from straight above. Art style: " + SOFT + ". "
        "Uniform everywhere (no single focal object, no vignette, no dark corners), evenly lit, low contrast, gentle details only. No objects, no characters, no text, no frame.", 1024, 1536, True)
    ps = [x.strip() for x in props.split(';')]; assert len(ps) == 12, (th, len(ps))
    add(f'props_{th}.png', "A game sprite sheet with exactly twelve separate prop illustrations arranged in a clean grid of 4 columns and 3 rows with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no frames, no labels, no text, no letters, no numbers, no cast shadows. Art style for every prop: " + STYLE + f". These are scenery props for {place} in a cute game, each seen from the front and slightly above. "
        + ' '.join(f"Row {r + 1}, left to right: " + '; '.join(f'({r * 4 + i + 1}) {ps[r * 4 + i]}' for i in range(4)) + '.' for r in range(3))
        + " Each prop is centered in its own cell, all about the same visual size, nothing overlapping, nothing touching the image edges or crossing into another cell.", 1536, 1024)
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장', max(len(j['prompt']) for j in jobs))

# ══ 3차 (2026-11-21): 공격 동작 문구 — 예전 그림의 공격 동작 문구를 동물에 맞게 고쳐 쓴다 ═══════════
ATK_FIX = {
 ('police', 'med-sig'): (None, 'thrusting the big yellow search flashlight forward to the right with a short bright cone of light, the tiny white search drone darting forward beside it, shouting'),
}
def atk_text(k, m):
    outfit, pose = ATK_FIX.get((k, m)) or (S.BR[k][2][m][0], S.BR[k][2][m][2])
    return (f'wearing {outfit} instead of the usual outfit, ' if outfit else '') + animalize(pose)
# (3차의 한 장짜리 공격 자세 12장은 4차의 두 장짜리로 바꾸며 지웠다 — 위의 atk_text 문구는 4차가 그대로 쓴다)

# ══ 4차 (2026-11-21): 공격 동작 2장(준비 → 발사) — 3차의 한 장짜리 공격 자세를 대신한다 ═══════════
#  한 그림 안에 같은 캐릭터의 두 장면을 위아래로 그린다(위 = 준비: 효과 없이 겨누거나 팔을 당긴 자세, 아래 = 발사: 섬광·연기·반짝이가 붙은 자세) → 두 장이 같은 몸·같은 자리로 나온다.
#  군별마다 4장: [보병·포병·의무](3×2) · [통신·보+포·보+의](3×2) · [보+통·포+의](2×2) · [포+통·의+통](2×2) = 24장.  게임: 대기 → 준비 → 발사 → 준비 → 대기.
ANIM_SETS = [['inf', 'art', 'med'], ['sig', 'inf-art', 'inf-med'], ['inf-sig', 'art-med'], ['art-sig', 'med-sig']]
for k, (who, wear, *_rest) in B.items():
    for si, ts in enumerate(ANIM_SETS):
        n = len(ts); cols = 'three' if n == 3 else 'two'
        add(f'anim_{k}_{si + 1}.png',
            f"A game animation sprite sheet with exactly {n * 2} separate chibi character illustrations arranged in a clean grid of {cols} columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
            "No borders, no panels, no labels, no text, no arrows, no ground, no cast shadows. Art style: " + CHIBI + ". "
            f"All figures are the same {who}, standing on two legs like a person, with the same cute face. It is clearly an animal (animal head, ears, muzzle or beak, fur or feathers, tail), not a human. Unless said otherwise the character wears {wear}. "
            "Each COLUMN is one character shown in two frames of the same attack animation, acting toward the right side: the bottom cell is the ACTION frame described below, and the top cell is the READY frame of that same character a split second earlier. "
            "In the READY frame the character has the same outfit, the same equipment, the same size, the same position in its cell and the same viewing angle as in its ACTION frame, but is only winding up: the weapon or tool is raised and aimed, or the throwing arm is pulled back, "
            "the body leans slightly back, the mouth is closed with a focused look, anything that will be thrown is still held, and there is absolutely NO muzzle flash, NO flame, NO smoke, NO sparkles, NO signal marks, NO beams, NO motion lines and NO impact stars. "
            + ' '.join(f"Column {i + 1} ACTION frame (bottom): {atk_text(k, t)}." for i, t in enumerate(ts))
            + " All figures are full body and drawn at exactly the same body size. Effects in the ACTION frames are small and stay close to the character; nothing flies far away. "
            "Each figure is centered inside its own cell with its feet near the bottom of the cell, nothing overlapping, nothing touching the image edges and nothing crossing into another cell. "
            "No insignia, no emblems, no flags, no letters, no numbers, no humans, original character design.", 1536 if n == 3 else 1024, 1024)
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장', max(len(j['prompt']) for j in jobs))

# ══ 5차 (2026-11-21): 남은 그림 — 전설의 용사 · 계급 장식 · 전투 표식/효과 · 결과 화면 그림 ═══════════
#  용사: 용사 6종 × 동물 6종. 한 장 = 동물 2종(줄) × [대기 · 준비 · 발사](칸) → 용사마다 3장, 모두 18장. units/<군별>_hero_<용사>(.webp · _rdy · _atk)
HERO = {  # 용사 옷 · 대기 · 발사 (예전 용사 그림의 설정을 동물에 맞게 옮김)
 'storm': ('a round olive steel helmet with a red headband tied under it, a long olive trench coat with brass buttons and a brown leather belt with pouches, and brown boots',
           'standing proudly with one arm resting on a big olive rocket standing upright beside',
           'thrusting one arm forward to the right while three small olive rockets streak up and to the right with short orange flame trails and small gray smoke puffs, shouting'),
 'phoenix': ('a round olive helmet with a white band, an olive uniform with a white armband with a red cross, a bright red scarf, and a short cape made of red and orange feathers',
             'holding a white first-aid bag with a red cross in one hand and a rifle at rest in the other',
             'firing the rifle to the right with a bright orange star-shaped muzzle flash while a few glowing orange feathers swirl close around'),
 'hawk': ('a dark green hooded cloak with golden feather-shaped trim over an olive uniform, a brown leather strap across the chest, and brown boots',
          'standing with a long black scoped sniper rifle held upright',
          'kneeling on one knee and aiming the long scoped rifle to the right with a thin bright white-yellow flash at the muzzle, one eye closed'),
 'inferno': ('clear goggles pushed up on the forehead, a dark red fireproof suit with black gloves and black boots, and two round yellow fuel tanks on the back',
             'holding a flame sprayer nozzle pointed down with a tiny pilot flame at its tip, daring grin',
             'spraying a short stream of orange and yellow fire to the right from the nozzle, leaning forward'),
 'frost': ('a big white fur hat with ear flaps, a long light blue winter greatcoat with a white fur collar and silver buttons, white mittens, and gray boots',
           'standing with a tall frosty blue staff topped with a snowflake crystal',
           'swinging the staff forward to the right and sending a small wave of pale blue snowflakes and ice crystals to the right'),
 'marshal': ('a dark green peaked cap with a red band, a dark green dress uniform with gold buttons and a red sash across the chest, white gloves, and a small radio headset',
             'standing tall with a short commander baton tucked under one arm, calm confident smile',
             'pointing the baton forward to the right, with curved yellow signal arcs and small golden star sparkles close in front, shouting an order'),
}
HERO_PAIRS = [('army', 'navy'), ('marine', 'sf'), ('air', 'police')]
for hid, (outfit, idle, fire) in HERO.items():
    for a, b in HERO_PAIRS:
        add(f'hero_{hid}_{a}_{b}.png',
            "A game animation sprite sheet with exactly six separate chibi character illustrations arranged in a clean grid of 3 columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
            "No borders, no panels, no labels, no text, no arrows, no ground, no cast shadows. Art style: " + CHIBI + ". "
            f"Both rows show the same legendary hero costume worn by two different animals. Row 1 is {B[a][0].split(':')[1].strip()}. Row 2 is {B[b][0].split(':')[1].strip()}. "
            "Each is clearly that animal (animal head, ears, muzzle or beak, fur or feathers, tail), standing on two legs like a person, not a human. "
            f"Instead of any ordinary uniform, both wear this hero costume: {outfit}. "
            f"The three cells of a row are the same character in three frames. Column 1 (IDLE): facing the viewer and turned very slightly to the right, {idle}. "
            f"Column 3 (ACTION), acting toward the right side: {fire}. "
            "Column 2 (READY): the same character a split second before the ACTION frame, in the same place and at the same size and viewing angle, only winding up: the weapon or tool is raised and aimed or the arm is pulled back, the body leans slightly back, "
            "the mouth is closed with a focused look, and there is absolutely NO muzzle flash, NO flame, NO smoke, NO sparkles, NO signal marks, NO snowflakes, NO motion lines. "
            "All six figures are full body and drawn at exactly the same body size. Effects in the ACTION frames are small and stay close to the character; nothing flies far away. "
            "Each figure is centered inside its own cell with its feet near the bottom of the cell, nothing overlapping, nothing touching the image edges and nothing crossing into another cell. "
            "No insignia, no emblems, no flags, no letters, no numbers, no humans, original character design.", 1536, 1024)
SHEET12 = ("A game sprite sheet with exactly twelve separate illustrations arranged in a clean grid of 4 columns and 3 rows with wide empty gaps between them, on a plain solid pure white background. "
           "No borders, no panels, no frames, no labels, no text, no letters, no numbers, no cast shadows. Art style for every item: " + STYLE + ". ")
SHEET12_TAIL = " Each item is centered in its own cell, all about the same visual size, nothing overlapping, nothing touching the image edges or crossing into another cell."
# 계급 장식: 캐릭터 뒤나 위에 덧붙인다(위관 깃발 · 영관 쌍깃발 · 장성 망토/햇살/별 · 각성 용사 날개/왕관)
add('ranks.png', SHEET12 + "These are rank decorations that a game places behind or above a small character, each shown alone with no character. "
    "Row 1, left to right: (1) a small white triangular pennant flag on a thin wooden pole; (2) a red banner flag with a gold border and gold fringe on a wooden pole with a gold tip; "
    "(3) a blue banner flag with a gold border and gold fringe on a wooden pole with a gold tip; (4) a wide flowing red cape with a gold border, seen from the front, spread open like a curtain with an empty gap in the middle where a character would stand. "
    "Row 2, left to right: (5) a round golden sunburst of pointed rays, like a halo disc; (6) a golden laurel wreath ring; (7) a pair of big golden feathered wings spread open, with an empty gap between them; (8) a small golden crown with red gems. "
    "Row 3, left to right: (9) one shiny gold five-pointed star; (10) one shiny silver five-pointed star; (11) a small bronze medal on a short ribbon; (12) a glowing white-yellow four-pointed sparkle." + SHEET12_TAIL, 1536, 1024)
# 전투 표식과 효과: 특수 발판 표식 3종(속사 · 고지 · 급소) + 폭발 · 연기 · 회복 · 번개 · 얼음 · 불꽃 · 동전 · 반짝임 · 기절 별
add('marks.png', SHEET12 + "These are battle markers and effect sprites for a cute tower defense game. "
    "Row 1, left to right: (1) a round sky-blue badge with two white arrowhead chevrons pointing right (a speed symbol); (2) a round lime-green badge with a white crosshair target symbol; "
    "(3) a round orange-red badge with a white five-pointed star; (4) a puffy orange and yellow cartoon explosion burst with a white-hot center. "
    "Row 2, left to right: (5) a soft gray smoke puff cloud; (6) a cluster of three bright green plus signs of different sizes; (7) a bright yellow zigzag lightning bolt; (8) a pale blue ice crystal snowflake. "
    "Row 3, left to right: (9) a small orange and yellow flame; (10) a shiny gold coin with a tiny sparkle; (11) a glowing white-yellow four-pointed sparkle star; (12) three small yellow stars arranged in a curved arc (a dizzy symbol)." + SHEET12_TAIL, 1536, 1024)
# 결과 화면 그림 4종
add('result.png', "A game illustration sheet with exactly four separate chibi illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no labels, no text, no letters, no numbers, no ground, no cast shadows. Art style: " + CHIBI + ". "
    "The main character in all four is the same cute anthropomorphic puppy soldier: a fluffy tan-and-cream Korean Jindo-style puppy with upright pointy ears poking out through a round olive camouflage helmet, a black button nose, a cream muzzle and a curled-up fluffy tail, in an olive camouflage uniform. "
    "Top-left (victory): the puppy jumps for joy holding a big golden trophy cup above its head, with a few pieces of colorful confetti close around. "
    "Top-right (defeat): the puppy sits on the ground looking sad with a white bandage patch on its helmet and a small white flag in one paw, one teardrop. "
    "Bottom-left (stage clear): the puppy salutes proudly beside a small wooden signpost with three gold stars on top. "
    "Bottom-right (guide): the puppy stands like a teacher holding a wooden pointer stick, pointing up to the right with a friendly smile. "
    "Each illustration is centered in its own quadrant, about the same size, nothing overlapping, nothing touching the image edges or crossing into another quadrant. No insignia, no emblems, no flags with symbols, no humans.", 1024, 1024)
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장', max(len(j['prompt']) for j in jobs))
