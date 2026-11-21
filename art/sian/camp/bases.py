"""주둔지 바닥 판을 지역마다(2026-11-21 사용자: "지역별로 바꿔 줘"). 한 장 = 바닥 5종(2칸 × 3줄, 마지막 칸은 비움).
사용: python3 art/sian/camp/bases.py && python3 tools/codex_art.py 2 9 art/sian/camp/bases.json → python3 -I art/sian/camp/apply.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = 'polished casual mobile game art style, smooth vector shapes with glossy gradient shading, strong shiny highlights, vivid saturated colors, clean thick dark brown outlines'
B = {
 'meadow': 'warm golden-brown cobblestone street pavement with a few green grass tufts, with a low pale stone curb along the back edge',
 'beach': 'a pale sandy seaside boardwalk of light wooden planks with a little sand and a few small seashells, with a low driftwood beam along the back edge',
 'desert': 'orange sandstone paving slabs with a little drifted sand, with a low adobe clay wall along the back edge',
 'snow': 'gray stone pavement with patches of white snow, with a low stone curb topped with snow along the back edge',
 'city': 'red brick street pavement in a herringbone pattern, with a low gray concrete curb along the back edge',
 'jungle': 'mossy green-gray stone slabs with small ferns and vines creeping over them, with a low row of thick bamboo logs along the back edge',
 'volcano': 'dark charcoal basalt paving slabs with thin glowing orange lava cracks, with a low jagged black rock curb along the back edge',
 'harbor': 'weathered brown wooden dock planks with nail heads, with a low solid wooden beam and two short mooring posts along the back edge',
 'airfield': 'light gray concrete airfield apron with a painted yellow line, with a low red-and-white striped barrier beam along the back edge',
 'hq': 'dark navy steel floor plates with rivets and thin glowing red seams, with a low dark steel wall along the back edge',
}
HEAD = ("A game sprite sheet with exactly five separate illustrations arranged in a clean grid of 2 columns and 3 rows with wide empty gaps between them (the bottom-right cell stays empty), on a plain solid pure white background. "
        "No borders around the cells, no panels, no labels, no text, no letters, no numbers, no cast shadows on the background. Art style for every item: " + STYLE + ". "
        "Each item is one wide ground platform strip for a game: a flat piece of ground about three times as wide as tall, seen from the front and slightly above so that the top surface looks like a wide trapezoid (narrower at the back, wider at the front) with a thin darker front edge, "
        "completely empty on top with nothing standing on it. All five have exactly the same shape and size and differ only in material. ")
ks = list(B); jobs = []
for i, part in enumerate([ks[:5], ks[5:]]):
    pos = ['Row 1 left', 'Row 1 right', 'Row 2 left', 'Row 2 right', 'Row 3 left']
    jobs.append({'file': f'art/sian/camp/raw_bases_{i + 1}.png', 'w': 1536, 'h': 1024, 'prompt': HEAD + ' '.join(f'{pos[j]}: {B[k]}.' for j, k in enumerate(part))
                 + ' Each strip is centered in its own cell, nothing overlapping, nothing touching the image edges or crossing into another cell.'})
json.dump(jobs, open(HERE + '/bases.json', 'w'), ensure_ascii=False, indent=1); json.dump([ks[:5], ks[5:]], open(HERE + '/bases_order.json', 'w')); print(len(jobs), '장')
