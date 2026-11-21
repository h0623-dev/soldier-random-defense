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
