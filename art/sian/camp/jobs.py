"""주둔지(전투 화면 아래 건물 줄) 시안 5가지 — 적용하지 않는다. 한 장 = 건물 5채 + 바닥 판(3칸 × 2줄).
사용: python3 art/sian/camp/jobs.py && python3 tools/codex_art.py 3 99 art/sian/camp/jobs.json → python3 -I art/sian/camp/cut.py → node art/sian/camp/mock.cjs
칸 순서: 훈련소 · 병과 강화 · 신병 소집(가장 큼) / 보급창 · 특수 임무(통신탑) · 바닥 판"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = 'polished casual mobile game art style, smooth vector shapes with glossy gradient shading, strong shiny highlights, vivid saturated colors, clean thick dark brown outlines'
HEAD = ("A game sprite sheet with exactly six separate illustrations arranged in a clean grid of 3 columns and 2 rows with wide empty gaps between them, on a plain solid pure white background. "
        "No borders around the cells, no panels, no labels, no text, no letters, no numbers, no cast shadows on the background. Art style for every item: " + STYLE + ". "
        "Items 1 to 5 are small buildings for the home base of a cute animal army, each seen from the front and slightly above, each standing on its own small patch of ground, all in one consistent design theme: {theme}. Item 3 is the main building and is clearly the largest. "
        "Row 1, left to right: (1) the training camp: {a}; (2) the upgrade workshop: {b}; (3) the recruitment headquarters: {c}. "
        "Row 2, left to right: (4) the supply depot: {d}; (5) the special mission signal tower: {e}; (6) {f}. "
        "Each item is centered in its own cell, nothing overlapping, nothing touching the image edges or crossing into another cell. No insignia, no emblems, no humans, original designs.")
C = {
 'a_forest': ('a cozy forest village built from acorns, mushrooms and tree stumps',
   'an acorn-shaped hut with an acorn-cap roof, a small round door and a red-and-white archery target beside it',
   'a tree-stump blacksmith workshop with a glowing forge inside, an anvil in front and a little smoking chimney',
   'a big round oak-tree town hall with a round wooden door, two round windows, a golden bell above the door and a green flag on top',
   'a red mushroom-roof market stall with sacks of acorns and wooden crates under it',
   'a tall wooden watchtower built around a thin tree trunk with a radio antenna and a glowing red lamp on top',
   'a wide low grassy mound platform, about three times as wide as tall, with a neat wooden picket fence along its back edge and a few daisies, completely empty on top'),
 'b_logfort': ('a rustic frontier fort built from thick logs, canvas and rope',
   'a log cabin barracks with a green canvas roof and a red-and-white target on a post',
   'a log armory with a stone forge chimney, an anvil and a rack of tools in front',
   'a large two-story log command post with a lookout balcony, a brass bell, a big wooden double door and a green flag on a pole',
   'an open log storehouse with a canvas awning, barrels, crates and sacks',
   'a wooden signal tower made of crossed log beams with a small radar dish and a glowing red lamp on top',
   'a wide wooden deck platform made of horizontal planks, about three times as wide as tall, with a thick log post at each end and a rope railing along the back, completely empty on top'),
 'c_toy': ('chunky bright toy-block buildings like a colorful toy playset, rounded and simple',
   'a chunky green toy tent with a yellow door flap and a little red-and-white target',
   'a chunky red toy factory with a big yellow gear on the front and a small blue chimney',
   'a big chunky blue-and-white toy headquarters with a red roof, a golden bell, a round window and a green flag',
   'a chunky yellow toy warehouse with an orange roof and stacked colorful boxes in front',
   'a chunky silver-and-white toy radar tower with a turning dish and a glowing red lamp on top',
   'a wide light-gray stone plaza slab with rounded corners and a thick darker edge, about three times as wide as tall, seen from slightly above, completely empty on top'),
 'd_button': ('every building is shown as an icon on top of a big glossy rounded-square game button, like the bottom action buttons of a casual mobile game; each button has a thick dark outline and a darker bottom edge',
   'a glossy green button with a small army tent icon on it',
   'a glossy orange button with an anvil and a hammer icon on it',
   'a larger glossy golden-yellow button with a cute puppy face wearing a round camouflage helmet and a small green plus sign badge on it',
   'a glossy sky-blue button with a wooden supply crate icon on it',
   'a glossy purple button with a radio tower icon with signal waves on it',
   'a wide dark wooden tray bar, about four times as wide as tall, with a lighter rim and rounded ends, completely empty'),
 'e_staff': ('small cheerful shop-like buildings, each with one cute chibi animal soldier standing in front as its staff member (huge round head, tiny body)',
   'a green army tent with a green crocodile drill instructor in a camouflage cap blowing a whistle in front of it',
   'a small brick forge with a white tiger cub blacksmith in a black beret holding a hammer in front of it',
   'a big white headquarters building with a red roof, a golden bell and a green flag, with a tan-and-cream puppy officer in a camouflage helmet saluting at the door',
   'a supply stall with a green canvas awning and crates, with a gray spotted seal pup clerk in a white sailor cap holding a box in front of it',
   'a steel radio tower with a red lamp on top, with a brown falcon operator in a blue cap and headset standing beside it',
   'a wide strip of warm cobblestone street pavement, about three times as wide as tall, with a low stone curb along the back edge, seen from slightly above, completely empty'),
}
jobs = [{'file': f'art/sian/camp/raw/{k}.png', 'w': 1536, 'h': 1024, 'prompt': HEAD.format(theme=v[0], a=v[1], b=v[2], c=v[3], d=v[4], e=v[5], f=v[6])} for k, v in C.items()]
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장', max(len(j['prompt']) for j in jobs))
