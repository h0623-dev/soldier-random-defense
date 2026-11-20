"""표창 아이콘 18종 · 재화 기호 · 대기실 버튼 그림 (E 광택 캐주얼풍, 상점 그림과 같은 그림체). 한 장에 12개(4칸 × 3줄).
사용: python3 art/icons/jobs.py && python3 tools/codex_art.py 2 99 art/icons/jobs.json  →  art/icons/raw/sheet_<cm|misc|ui|battle>.png
게임에 넣기: python3 art/icons/apply.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = 'polished casual mobile game icon style, smooth vector shapes with glossy gradient shading, strong shiny highlights, vivid colors, thin dark outlines'
HEAD = ("A game icon sprite sheet with exactly twelve separate item illustrations arranged in a clean grid of 4 columns and 3 rows with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no frames, no labels, no text, no letters, no numbers. Art style for every item: " + STYLE + ". "
        "Each item is centered in its own cell, all items about the same visual size, nothing overlapping, nothing touching the image edges or crossing into another cell. ")
CM = ("These are collectible award badges for a cute animal army. Row 1, left to right: (1) a round green welcome wreath with a golden paw print in the middle and a small red bow; "
      "(2) a red pet collar with a shiny golden bell and a small four-leaf clover charm; (3) a small steel shovel stuck in a mound of brown dirt; (4) a wooden storage crate overflowing with brown acorns. "
      "Row 2, left to right: (5) a red lunch box with a bone-shaped biscuit on top; (6) a rolled parchment scroll tied with a red wax seal, with a red target mark on it; "
      "(7) a golden animal paw with three sharp silver claws and a slash mark; (8) a round silver badge with a sharp golden eagle eye in a crosshair. "
      "Row 3, left to right: (9) a wooden clipboard with a paper sheet showing a big gold star stamp and a green upward arrow; (10) a golden hourglass in front of a small blue shield; "
      "(11) a small brown travel bag with a red heart tag; (12) a blue award ribbon rosette with a white paw print in the center.")
BADGE = "a round gold-rimmed medal badge showing the cute head of {a}, hanging from a short {c} ribbon"
MISC = ("Row 1, left to right: (1) " + BADGE.format(a='a tan-and-cream puppy wearing a round camouflage helmet', c='green') + "; (2) " + BADGE.format(a='a gray spotted seal pup wearing a white sailor cap with a navy band', c='navy blue')
        + "; (3) " + BADGE.format(a='a green crocodile wearing a camouflage field cap and a red neck scarf', c='red') + "; (4) " + BADGE.format(a='a white tiger cub with black stripes wearing a black beret', c='dark gray') + ". "
        "Row 2, left to right: (5) " + BADGE.format(a='a brown falcon with a small yellow beak wearing a blue garrison side cap', c='sky blue') + "; (6) "
        + BADGE.format(a='a dark brown sea eagle with a white forehead and a big orange-yellow beak wearing a navy blue police cap', c='royal blue')
        + "; (7) one single large bright blue faceted diamond gem, front view; (8) one thick shiny gold coin with a star embossed on it, front view. "
        "Row 3, left to right: (9) a small sky-blue metal supply box with a yellow latch and a white star on the front; (10) a wooden clipboard with a paper sheet showing three green check marks; "
        "(11) a golden trophy cup with two handles and a star; (12) an open brown record book with a red ribbon bookmark and a quill pen. Original designs, no insignia, no emblems, no flags.")
UI = ("These are menu button icons for a cute animal army game. Row 1, left to right: (1) a round sky-blue help button with one big white question mark symbol on it (this single question mark is the only symbol allowed); "
      "(2) two cute animal paws, one tan and one gray, giving each other a high-five with a small yellow spark between them; (3) a shopping cart filled with blue diamond gems and a small gift box; "
      "(4) a round olive-brown camouflage army helmet with a golden paw print on the front. "
      "Row 2, left to right: (5) two crossed silver swords with golden hilts in front of a small red shield; (6) a big golden five-pointed star framed by a green laurel wreath; "
      "(7) three face-down cards fanned out, with olive-green backs and a gold star on each back; (8) an orange megaphone speaker with three blue sound waves coming out. "
      "Row 3, left to right: (9) a small camouflage uniform jacket hanging on a wooden clothes hanger; (10) an open training manual book with a big green upward arrow rising from it; "
      "(11) a dark iron blacksmith anvil with a golden hammer above it and orange sparks; (12) an orange megaphone speaker with a red diagonal cross over it, no sound waves.")
BATTLE = ("These are battle screen icons and small buildings for a cute animal army game. Row 1, left to right: (1) a red triangular flag on a golden pole; (2) a shiny golden gear cog; "
          "(3) an open wooden door with a green arrow pointing out of it; (4) a round red button with a white cross mark on it. "
          "Row 2, the first four of five small cute buildings, each seen from the front at a slight angle, each standing on a small round patch of grass: (5) an olive-green army training tent with a small red flag on top; "
          "(6) a small brick blacksmith workshop with a smoking chimney and an anvil in front; (7) a headquarters house with white walls, a red tiled roof, a golden bell above the door and a green flag; "
          "(8) a supply depot market stall with an olive canopy, wooden crates, barrels and sacks. "
          "Row 3, left to right: (9) a tall steel radio tower with an antenna on top and a small blinking red light, standing on a small round patch of grass; (10) one silver sword with a golden hilt pointing up; "
          "(11) a round red and white target with a crosshair; (12) a thick closed brown leather book with a golden star on the cover and a red bookmark.")
jobs = [{'file': 'art/icons/raw/sheet_battle.png', 'w': 1536, 'h': 1024, 'prompt': HEAD + BATTLE},
        {'file': 'art/icons/raw/sheet_ui.png', 'w': 1536, 'h': 1024, 'prompt': HEAD + UI},
        {'file': 'art/icons/raw/sheet_cm.png', 'w': 1536, 'h': 1024, 'prompt': HEAD + CM},
        {'file': 'art/icons/raw/sheet_misc.png', 'w': 1536, 'h': 1024, 'prompt': HEAD + MISC}]
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장')
