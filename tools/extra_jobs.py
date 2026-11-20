"""용사 · 주둔지 건물 · 스킨 그림 지시문을 만든다 → art/jobs_extra.json   (그리기: python3 tools/codex_art.py 4 999 art/jobs_extra.json)
 · 용사 6장: 한 장에 2×2 = [보통 대기, 보통 공격 / 각성 대기, 각성 공격]. 파일 sheet_hero_<id>__<id>aw.png → units/hero_<id>(_atk) · hero_<id>aw(_atk)
 · 스킨 4종 × 5장: 군별과 계급에 상관없이 쓰는 복장 한 벌(10병과). 파일 sheet_skin<id>_<A>__<B>.png → units/skin<id>_<병과>(_atk)
 · 건물 5장: 한 장에 건물 하나. 파일 bld_<id>.png → tools/cut_buildings.py 가 www/img/bld_<id>.webp 로 만든다
사용: python3 tools/extra_jobs.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import soft_jobs as S
jobs = []
def add(file, prompt, w=1024, h=1024): jobs.append({'file': 'art/raw_soft/' + file, 'w': w, 'h': h, 'prompt': prompt})

# ── 전설의 용사 ──
HERO_HEAD = ("A game sprite sheet with exactly four separate chibi character illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
             "No borders, no panels, no labels, no text, no arrows, no ground. " + S.STYLE + ", round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight, tiny mouth. "
             "All four figures are the same legendary hero character: {who}. The top row shows the hero's normal outfit and the bottom row shows the same hero in a grander awakened outfit. ")
HEROES = {
 'storm': ('a bold young artillery captain with a confident grin and a red headband tied under a round olive steel helmet',
           'a long olive trench coat with brass buttons and a brown leather belt with pouches, brown boots',
           'standing proudly with one hand resting on a big olive rocket standing upright beside him',
           'thrusting one arm forward to the right while three small olive rockets streak up and to the right with bright orange flame trails and gray smoke puffs, shouting',
           'the same coat now trimmed with gold, a golden helmet with a small red plume, and a short flame-orange cape',
           'small glowing orange ember sparks floating around him'),
 'phoenix': ('a brave young combat medic with a gentle smile and a bright red scarf',
             'a round olive helmet with a white band, an olive uniform with a white armband with a red cross, a short cape made of red and orange feathers, brown boots',
             'holding a white first-aid bag with a red cross in one hand and a rifle at rest in the other',
             'firing the rifle to the right with a bright orange star-shaped muzzle flash while a few glowing orange feathers swirl around him',
             'the feather cape has become two big glowing red-orange feathered wings on his back, and the helmet has a golden laurel wreath',
             'a soft golden glow and a few drifting orange feathers around him'),
 'hawk': ('a calm young sharpshooter with sharp focused eyes and a small brown hawk perched on his shoulder',
          'a dark green hooded cloak over an olive uniform, a brown leather strap across the chest, brown boots',
          'standing with a long black scoped rifle held upright, the hawk on his shoulder',
          'kneeling on one knee and aiming the long scoped rifle to the right with a thin bright white-yellow flash at the muzzle, the hawk flying above him',
          'the cloak now has golden feather-shaped trim and a golden clasp, the scope of the rifle glints gold, and the hawk has bright golden wings',
          'a few small golden feathers drifting around him'),
 'inferno': ('a tough young flame trooper with soot smudges on his cheeks and a daring grin, clear goggles pushed up on his forehead',
             'a dark red fireproof suit with black gloves and black boots, two round yellow fuel tanks on his back',
             'holding a flame sprayer nozzle pointed down, a tiny pilot flame at its tip',
             'spraying a big stream of orange and yellow fire to the right from the nozzle, leaning forward',
             'the suit now has golden trim and a flame-patterned red and gold cape, the fuel tanks are golden',
             'the flame is hotter with blue-white at its core, small sparks floating around him'),
 'frost': ('a stern but cute winter general with frosty white eyebrows and red cold-bitten cheeks',
           'a big white fur hat with ear flaps, a long light blue winter greatcoat with a white fur collar and silver buttons, white mittens, gray boots',
           'standing with a tall frosty blue staff topped with a snowflake crystal, a few snowflakes drifting',
           'swinging the staff forward to the right and sending a wave of pale blue snowflakes and small ice crystals to the right',
           'the fur hat now has a small crown of ice crystals, and he wears a long cape of pale blue ice with icicles along its edge',
           'a swirling ring of snowflakes around him'),
 'marshal': ('a dignified supreme commander with a neat dark mustache and a calm confident smile',
             'a dark green peaked cap with a red band, a dark green dress uniform with gold buttons and a red sash across the chest, white gloves, black boots, a small radio headset',
             'standing tall with a short commander baton tucked under one arm',
             'pointing the baton forward to the right, curved yellow signal arcs and small golden star sparkles spreading to the right, shouting an order',
             'a white and gold greatcoat draped over the shoulders like a cape, the peaked cap is white with gold leaf trim, and the baton glows gold',
             'bright golden star sparkles around him'),
}
for hid, (who, outfit, idle, atk, aw_outfit, aw_extra) in HEROES.items():
    add(f'sheet_hero_{hid}__{hid}aw.png', HERO_HEAD.format(who=who)
        + f"Normal outfit: {outfit}. Top-left: standing idle in the normal outfit, {idle}. Top-right: the same character in action in the normal outfit, {atk}. "
        + f"Awakened outfit: {aw_outfit}. Bottom-left: standing idle in the awakened outfit, {idle}, {aw_extra}. Bottom-right: the same character in action in the awakened outfit, {atk}, {aw_extra}. " + S.TAIL)

# ── 스킨: 군별·계급에 상관없이 쓰는 복장 한 벌 ──
SKINS = {
 'desert': ('young desert soldier boy', 'a wide-brimmed tan boonie hat with sand goggles on it, a tan and light brown desert camouflage uniform with rolled-up sleeves, a sand-colored neck scarf, and light brown boots'),
 'snow': ('young winter soldier boy', 'a white hooded snow parka with a gray fur trim on the hood, white snow camouflage trousers with light gray patches, white mittens, snow goggles pushed up on the forehead, and white boots'),
 'night': ('young night-operations soldier boy', 'a black tactical helmet with green-lensed night-vision goggles flipped up on top, a black tactical uniform with a dark gray vest and pouches, a black neck scarf, fingerless gloves, and black boots'),
 'gold': ('young honor guard soldier boy', 'a white ceremonial peaked cap with a gold band and a black visor, a white ceremonial dress jacket with gold buttons, gold braided cords on one shoulder and gold trim, white gloves, white trousers with a gold side stripe, and shiny black shoes'),
}
KIT = S.BR['army'][2]      # 병과별 (전용 복장, 대기, 공격) 문구는 육군 것을 쓴다
for sid, (who, outfit) in SKINS.items():
    for k1, k2 in S.DEFAULT_PAIRS:
        def row(pos, k):
            _, idle, atk = KIT[k]
            idle = idle.replace('wearing a black gas mask over the face, ', 'a black gas mask hanging at the neck, ')      # 얼굴이 보이게
            return f"{pos[0]}: standing idle, {idle}. {pos[1]}: the same character in action, {atk}. "
        add(f'sheet_skin{sid}_{k1}__{k2}.png', S.HEAD.format(who=who) + f"All four wear exactly the same outfit: {outfit}. "
            + row(('Top-left', 'Top-right'), k1) + row(('Bottom-left', 'Bottom-right'), k2) + S.TAIL)

# ── 주둔지 건물 ──
BLD_HEAD = ("A single cute game building illustration, centered, on a plain solid pure white background. No ground plane, no shadow on the background, no people, no text, no letters, no numbers, no flags with symbols. "
            + "Art style: soft hand-drawn storybook illustration, thin dark brown outlines, gentle watercolor and colored-pencil shading with subtle paper grain, warm muted colors. "
            "The building is drawn in a simple front three-quarter view, chunky and toy-like, filling most of the image but not touching the edges. ")
BLDS = {
 'camp': 'A training camp tent: a big olive green canvas army tent with a dark open entrance flap, wooden pegs and ropes, a small red pennant on a pole at the top, and a wooden training dummy standing beside it.',
 'up': 'An armory workshop: a small wooden workshop hut with a brown shingle roof, an anvil and a hammer in front, a rack of tools on the wall, a small chimney with a puff of smoke, and a few stacked ammunition crates beside the door.',
 'summon': 'A barracks headquarters: a cozy cream-colored barracks house with a bright red roof, a wooden double door, two windows with light blue glass, a small bell above the door, and a plain green pennant on a pole on the roof.',
 'pick': 'A supply depot: a pile of wooden supply crates and olive canvas sacks under a small olive canvas canopy on wooden posts, with a barrel, a hand cart, and one open crate showing canned food.',
 'elite': 'A radio signal tower: a tall slim steel lattice radio tower on a small concrete base with a red blinking light on top, two small satellite dishes, and a little olive control box with dials at its foot.',
}
for bid, text in BLDS.items(): add(f'bld_{bid}.png', BLD_HEAD + text)

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art/jobs_extra.json')
json.dump(jobs, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(jobs), '장 →', out)
