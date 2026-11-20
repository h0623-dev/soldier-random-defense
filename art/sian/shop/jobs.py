"""상점 그림 시안 5가지 그림체(한 장에 12가지 물건, 4칸 × 3줄). 사용: python3 art/sian/shop/jobs.py && python3 tools/codex_art.py 5 99 art/sian/shop/jobs.json
칸 순서(왼쪽 위부터): gem1 보석 조금 · gem2 보석 주머니 · gem3 보석 상자 · medal 훈장 / ticket1 티켓 1장 · ticket5 티켓 묶음 · bolt1 행동력 1 · bolt5 행동력 묶음 / crate1 보급 상자 · crate10 보급 상자 더미 · gift 선물 상자 · mascot 강아지 병사"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = ("A game shop icon sprite sheet with exactly twelve separate item illustrations arranged in a clean grid of 4 columns and 3 rows with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no frames, no labels, no text, no letters, no numbers, no ground shadows larger than the item. Art style for every item: {style}. "
        "Each item is centered in its own cell, all items about the same visual size, nothing overlapping, nothing touching the image edges or crossing into another cell. ")
ITEMS = ("Row 1, left to right: (1) a small pile of three bright blue faceted diamond gems; (2) a brown cloth pouch tipped over with many bright blue diamond gems spilling out; "
         "(3) an open wooden treasure chest overflowing with bright blue diamond gems, sparkling; (4) a round gold military medal hanging from a red and white striped ribbon. "
         "Row 2, left to right: (5) one orange-gold raffle ticket with a small star printed on it; (6) a fan of five orange-gold raffle tickets tied with a red band; "
         "(7) a single glowing orange-yellow lightning bolt; (8) an olive-green ammo box filled with five glowing orange-yellow lightning bolts. "
         "Row 3, left to right: (9) an olive-green wooden military supply crate with gold corner trim and a yellow star on the front, lid closed, a soft glow around it; "
         "(10) a stack of three olive-green military supply crates with gold corner trim and yellow stars, the top one slightly open with golden light shining out; "
         "(11) a cream-colored gift box tied with a red ribbon bow; "
         "(12) a cute anthropomorphic puppy soldier shopkeeper: a fluffy tan-and-cream Jindo-style puppy with pointy ears poking out through a round helmet with an olive-brown camouflage cover, "
         "wearing a matching camouflage uniform, standing upright and waving one paw happily. Original design, no insignia, no emblems, no flags.")
STYLES = {
 'a_soft': 'soft hand-drawn storybook illustration, thin dark brown outlines, gentle watercolor and colored-pencil shading with subtle paper grain, warm muted colors',
 'b_bold': 'bold cartoon sticker style, thick dark brown outlines, flat bright saturated colors with simple cel shading and small white highlights',
 'c_clay': 'cute 3D clay toy render, soft rounded chunky shapes, matte plasticine material, soft studio lighting, bright cheerful colors, no outlines',
 'd_pixel': 'crisp 32-bit pixel art, clean dark outlines, limited bright palette, clearly visible square pixels, no anti-aliasing blur',
 'e_glossy': 'polished casual mobile game icon style, smooth vector shapes with glossy gradient shading, strong shiny highlights, vivid colors, thin dark outlines',
}
jobs = [{'file': f'art/sian/shop/raw/sheet_{k}.png', 'w': 1536, 'h': 1024, 'prompt': HEAD.format(style=v) + ITEMS} for k, v in STYLES.items()]
json.dump(jobs, open(HERE + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs), '장')
