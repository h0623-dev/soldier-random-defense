"""부드러운 손그림풍 그림 지시문을 만든다 → art/jobs_soft.json
캐릭터: 한 장(1024×1024)에 2×2로 [병과A 대기, 병과A 공격 / 병과B 대기, 병과B 공격]. 적: 한 장에 4종(마지막은 2종).
사용: python3 tools/soft_jobs.py"""
import json
STYLE = ("Art style: soft hand-drawn storybook illustration, very cute chibi with a big round head and tiny body (2 heads tall), thin dark brown outlines, "
         "gentle watercolor and colored-pencil shading with subtle paper grain, warm muted colors")
HEAD = ("A game sprite sheet with exactly four separate chibi character illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no labels, no text, no arrows, no ground. " + STYLE + ", round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight, tiny mouth. "
        "All four figures are the same {who} with the same cute face and short dark brown hair. ")
TAIL = ("The action poses face and act toward the right side. Each figure is full body, the same size, centered inside its own quadrant, nothing overlapping, "
        "nothing touching the image edges and nothing crossing into another quadrant. No insignia, no emblems, no flags, no letters, no numbers, original character design.")
BAND = 'throwing a white bandage roll to the right with one arm stretched out, small green plus-shaped sparkles around, cheerful open mouth'
RADIO = 'shouting into the radio handset and pointing forward to the right, yellow lightning-bolt signal marks coming from the antenna, excited open mouth'
RIFLE = 'aiming and firing the rifle to the right with a bright orange-yellow star-shaped muzzle flash, determined expression with open mouth'
CANNON = 'pulling the firing cord of a small olive field cannon on two wheels standing beside him, the cannon fires to the right with a big orange flash and a gray smoke puff, one eye squeezed shut'
MORTAR = 'crouching and covering his ears beside the short mortar tube on a bipod, which fires upward with an orange flash and a small gray smoke puff, eyes squeezed shut'
SPRAY = 'spraying a big cloud of pale green mist to the right from the sprayer wand'
KNEEL = 'kneeling on one knee and firing a rifle to the right with a small orange muzzle flash, the first-aid bag hanging at the hip'
LASER = 'aiming the designator to the right, a thin straight red laser beam shooting to the right, speaking into a radio handset'
EOD = ('a bulky dark green padded bomb disposal suit with a big round helmet and a clear face visor', 'holding small wire cutters', 'tossing a small round black cartoon bomb with a sparking fuse to the right')
BR = {
 'army': ('young army soldier boy', 'a round helmet with an olive-brown woodland camouflage cover and chin strap, a matching olive-brown camouflage uniform with chest pockets, and dark brown boots', {
  'art': (None, 'hugging one big olive artillery shell with both arms', CANNON),
  'inf-med': (None, 'a rifle slung on the back, a white armband with a red cross, holding a small white first-aid bag', KNEEL),
  'inf-sig': (None, 'green face paint stripes on the cheeks, holding big black binoculars near the face', 'crouching low and firing a short black carbine to the right with a small orange muzzle flash, binoculars hanging on the chest, green face paint stripes'),
  'art-med': (None, 'wearing a black gas mask over the face, a small yellow tank on the back, holding a yellow decontamination sprayer wand', SPRAY),
  'art-sig': (None, 'wearing a headset, standing beside a small black rangefinder scope on a tripod', 'looking into the rangefinder scope on the tripod and pointing forward to the right with one arm, a small red crosshair target mark floating at the right, shouting'),
  'med-sig': (None, 'a white armband with a red cross, holding a walkie-talkie in one hand and a rolled green stretcher under the other arm', 'shouting into the walkie-talkie and waving one arm forward to the right, green plus-shaped sparkles and yellow signal bolts around'),
 }),
 'navy': ('young navy sailor boy', 'a white round sailor cap with a navy blue band, a white sailor uniform with a navy blue square collar and a navy blue neckerchief, and black shoes', {
  'inf': (None, 'holding a black rifle at rest across the body', RIFLE),
  'art': (None, 'hugging one big gray naval gun shell with both arms', 'standing beside a small gray naval deck gun turret that fires to the right with a big orange flash and a gray smoke puff, covering one ear'),
  'med': (None, 'a white armband with a red cross, holding a white first-aid bag with a red cross', BAND),
  'sig': (None, 'wearing big headphones and holding a small gray radar dish', 'holding the radar dish forward to the right, curved yellow-green radio wave arcs spreading to the right, excited open mouth'),
  'inf-art': (None, 'gripping the handles of a small black machine gun mounted on a stand', 'firing the mounted machine gun to the right with a bright orange muzzle flash and a few flying brass shells, gritted teeth'),
  'inf-med': ('a black diving wetsuit with blue stripes and blue diving goggles pushed up on the forehead', 'holding an orange and white life ring', 'throwing the orange and white life ring to the right, a few blue water drops flying'),
  'inf-sig': (None, 'holding a brown wooden ship steering wheel in front of the body', 'spinning the wooden steering wheel hard while leaning to the right, curved motion lines and a few blue water drops, shouting'),
  'art-med': (None, 'carefully holding a round black sea mine with short spikes', 'throwing the round black spiked sea mine to the right, a small orange explosion burst at the far right'),
  'art-sig': (None, 'wearing big headphones and hugging a small gray torpedo', 'launching the small gray torpedo out of his arms to the right with a trail of white bubbles, pointing forward'),
  'med-sig': ('a white flight helmet with a dark visor pushed up and a navy blue flight suit', 'giving a thumbs up', 'signaling with two glowing orange marshalling wands, one wand thrust forward to the right, motion lines'),
 }),
 'marine': ('young marine soldier boy', 'a brown-green camouflage field cap with a short brim (plain, no emblem), a matching brown-green camouflage uniform, a bright red neck scarf, and dark brown boots', {
  'inf': (None, 'holding a black rifle at rest across the body, confident grin', 'charging forward and firing the rifle to the right with a bright orange-yellow star-shaped muzzle flash, shouting'),
  'art': (None, 'hugging one big olive artillery shell with both arms', CANNON),
  'med': (None, 'a white armband with a red cross, holding a white first-aid bag with a red cross', BAND),
  'sig': (None, 'carrying an olive radio backpack with a long antenna, holding a radio handset', RADIO),
  'inf-art': (None, 'carrying a short dark mortar tube on one shoulder', MORTAR),
  'inf-med': (None, 'a rifle slung on the back, a white armband with a red cross, holding a small white first-aid bag', KNEEL),
  'inf-sig': (None, 'green face paint stripes on the cheeks, holding a black boat paddle upright', 'lunging forward and firing a short black carbine to the right with a small orange muzzle flash, the black paddle strapped on the back, green face paint stripes'),
  'art-med': (None, 'wearing a black gas mask over the face, a small yellow tank on the back, holding a yellow decontamination sprayer wand', SPRAY),
  'art-sig': (None, 'standing beside a small black laser designator device on a tripod', LASER),
  'med-sig': (None, 'wearing an orange life vest and holding two small red and yellow signal flags', 'waving the two red and yellow signal flags energetically, one flag thrust forward to the right, curved motion lines'),
 }),
 'sf': ('young special forces soldier boy', 'a plain black beret, a black tactical uniform with a dark gray vest, and black boots', {
  'inf': (None, 'holding a compact black submachine gun at rest, cool little smirk', 'firing the submachine gun to the right with a bright orange muzzle flash and a few flying brass shells'),
  'art': (None, 'holding a bundle of three red dynamite sticks in one hand and a small detonator box in the other', 'pressing down the plunger of the detonator box, a big orange explosion burst with smoke at the far right, eyes squeezed shut'),
  'med': (None, 'a red cross patch on the arm, holding a black medical bag with a red cross', BAND),
  'sig': (None, 'wearing a headset with a microphone, carrying a black radio backpack with a long antenna', 'shouting into the headset microphone and pointing forward to the right, yellow lightning-bolt signal marks coming from the antenna'),
  'inf-art': (None, 'holding a short stubby black grenade launcher', 'firing the grenade launcher to the right, a small round grenade flying out with a gray smoke puff and an orange flash'),
  'inf-med': (None, 'a submachine gun slung on the back, a red cross patch on the arm, holding a small black first-aid pouch', 'kneeling on one knee and firing a black pistol to the right with a small orange muzzle flash'),
  'inf-sig': ('a green leafy ghillie hood and a dark green camouflage uniform', 'holding a long black sniper rifle with a scope upright', 'kneeling on one knee and aiming the long sniper rifle to the right, one eye at the scope, a sharp thin white-yellow muzzle flash'),
  'art-med': EOD,
  'art-sig': (None, 'holding a small black laser designator device and a radio handset', LASER),
  'med-sig': (None, 'clear goggles pushed up on the forehead, wearing a big olive parachute backpack with straps', 'jumping in the air with the goggles over the eyes, firing a compact submachine gun to the right with an orange muzzle flash'),
 }),
 'air': ('young air force airman boy', 'a blue garrison side cap, a sky-blue uniform shirt with dark blue trousers, and black shoes', {
  'inf': (None, 'a plain black armband on one arm, holding a black rifle at rest across the body', RIFLE),
  'art': (None, 'carrying a short green anti-aircraft missile launcher tube on one shoulder', 'firing a small missile from the shoulder launcher up and to the right, an orange flame trail and a gray smoke puff behind'),
  'med': (None, 'a white armband with a red cross, holding a white first-aid bag with a red cross', BAND),
  'sig': (None, 'wearing a black headset with a microphone and holding a small tablet', 'speaking into the headset microphone and pointing forward to the right, curved yellow signal arcs spreading to the right'),
  'inf-art': ('an olive green pilot flight suit', 'holding a white pilot helmet with a dark visor under one arm, confident grin', 'wearing the white pilot helmet with the visor down, launching a small toy-like gray fighter jet from one hand to the right with an orange flame trail'),
  'inf-med': ('an orange rescue flight suit and a white helmet', 'holding a coiled rope', 'throwing a rope with a small hook to the right, the rope flying in a curve'),
  'inf-sig': ('an olive green pilot flight suit and a white pilot helmet with the visor up', 'holding a big black camera with a long lens', 'taking a photo with the big camera aimed to the right, a bright white star-shaped camera flash'),
  'art-med': ('a blue mechanic coverall and a blue cap', 'carrying a small white missile under one arm, a wrench in the chest pocket', 'launching the small white missile from his hands to the right with an orange flame trail, a wrench raised in the other hand'),
  'art-sig': ('an olive green pilot flight suit and a white pilot helmet with a dark visor down', 'holding a small round black cartoon bomb', 'throwing the small round black cartoon bomb with a sparking fuse to the right'),
  'med-sig': ('an olive green pilot flight suit and a blue cap', 'carrying a brown cargo box with both hands', 'tossing a brown cargo box hanging from a small white parachute to the right'),
 }),
 'police': ('young police officer boy', 'a plain navy blue police cap with a black brim, a light blue police shirt with navy blue trousers, and black shoes', {
  'inf': (None, 'holding a short black police baton, friendly smile', 'swinging the baton to the right with a curved white swoosh arc, shouting'),
  'art': ('a navy blue riot helmet with a clear visor pushed up and a navy blue riot uniform', 'holding a big rectangular transparent riot shield in front', 'bashing forward to the right with the riot shield, a yellow impact star at the right'),
  'med': (None, 'a white armband with a red cross, holding a white first-aid kit box with a red cross', BAND),
  'sig': (None, 'holding a black walkie-talkie up to the mouth', 'shouting into the walkie-talkie and pointing forward to the right, yellow lightning-bolt signal marks'),
  'inf-art': ('a navy blue riot helmet with a clear visor pushed up and a navy blue riot uniform', 'holding a small round shield in one hand and a baton in the other', 'lunging to the right and striking with the baton, the small round shield raised, a yellow impact star at the right'),
  'inf-med': (None, 'holding an orange life buoy ring, a coiled rope over the shoulder', 'throwing the orange life buoy ring to the right with the rope trailing behind it'),
  'inf-sig': (None, 'wearing a neon yellow reflective vest and holding up a glowing red traffic baton', 'blowing a silver whistle and thrusting the glowing red traffic baton to the right with a red light streak, neon yellow reflective vest'),
  'art-med': EOD,
  'art-sig': (None, 'holding a white and red megaphone', 'shouting into the megaphone aimed to the right, big curved sound wave arcs spreading to the right'),
  'med-sig': (None, 'holding a leash with a small cute brown police dog sitting beside him', 'pointing forward to the right while the small brown police dog leaps forward to the right, barking'),
 }),
}
ROLE = {'inf': 'rifleman', 'art': 'gunner', 'med': 'medic', 'sig': 'signaller'}
PAIRS = {'army': [('art', 'inf-med'), ('inf-sig', 'art-med'), ('art-sig', 'med-sig')]}
DEFAULT_PAIRS = [('inf', 'art'), ('med', 'sig'), ('inf-art', 'inf-med'), ('inf-sig', 'art-med'), ('art-sig', 'med-sig')]

def sheet(b, k1, k2):
    who, base, cls = BR[b]
    def row(pos, k):
        outfit, idle, atk = cls[k]
        return (f"{pos} row character wears {outfit or base}. {pos}-left: standing idle, {idle}, calm little smile. "
                f"{pos}-right: the same character in action, {atk}. ")
    return HEAD.format(who=who) + row('Top', k1) + row('Bottom', k2) + TAIL

EN_HEAD = ("A game sprite sheet with exactly {n} separate cute enemy illustrations arranged {grid} with wide empty gaps between them, on a plain solid pure white background. "
           "No borders, no panels, no labels, no text, no arrows, no ground. " + STYLE + ". Every enemy is drawn in side view facing right, chunky and toy-like, "
           "with big angry cartoon eyes and slanted eyebrows, grumpy but cute. ")
EN_TAIL = "Each one is whole, centered inside its own area, nothing overlapping and nothing touching the image edges. No insignia, no flags, no letters, no numbers, original design."
EN = {
 'normal': 'a grumpy little enemy foot soldier boy with a big round head, 2 heads tall, dark red helmet and dark red uniform, holding a black rifle, marching to the right',
 'fast': 'a small round orange quadcopter attack drone with four rotors and one angry red eye',
 'armor': 'a short chunky dark brown armored car with three big black wheels and a tiny turret with a short gun',
 'elite': 'a chunky purple and black elite armored assault vehicle with four big black wheels, spikes on the front bumper, a twin-barrel turret and a glowing purple antenna',
 'boss': 'a big chunky crimson red battle tank with a short fat cannon, black tracks and a plain gold star on the turret',
 'boss2': 'a big chunky teal military hovercraft with a fat black rubber skirt, a small cabin, one big fan at the back and a short gun',
 'boss3': 'a big chunky sand-yellow self-propelled artillery vehicle on black tracks with one very long thick cannon barrel raised',
 'boss4': 'a big chunky white and light-blue armored snow crawler with wide black tracks, a snow plow blade at the front and a small turret',
 'boss5': 'a big chunky dark gray attack helicopter with a huge round cockpit, a short stubby tail, a spinning rotor on top and two small rocket pods',
 'boss6': 'a big chunky dark green armored car with six black wheels, fuel tanks on the back and a big flamethrower nozzle shooting a small orange flame',
 'boss7': 'a big chunky dark brown rocket launcher truck with eight black wheels and a large box of red-tipped rockets tilted upward on the back',
 'boss8': 'a huge round navy-blue flying drone carrier with four big rotors, a glowing orange core and three tiny drones attached under it',
 'boss9': 'a big chunky dark olive bomber airplane with a fat round body, short wide wings, two propeller engines and a small bomb under each wing',
 'boss10': 'a huge steel-gray walking mech robot tank with two thick legs, a boxy body, a red glowing visor, a big cannon arm and a plain gold star on the chest',
}
EN_SHEETS = [['normal', 'fast', 'armor', 'elite'], ['boss', 'boss2', 'boss3', 'boss4'], ['boss5', 'boss6', 'boss7', 'boss8'], ['boss9', 'boss10']]
POS4 = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right']
TITLE = ("Vertical key art illustration for a cute mobile tower defense game. " + STYLE + ", round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight, tiny smiles. "
         "Six chibi boys stand side by side in a cheerful heroic group pose on top of a wall of tan sandbags in the lower-middle of the picture, facing the viewer, all fully inside the picture and not touching the left or right edge: "
         "(1) an army soldier in a round olive-brown camouflage helmet and uniform holding a black rifle, in the center and slightly larger, (2) a navy sailor in a white sailor uniform with a navy blue collar and a white sailor cap, "
         "(3) a marine in a brown-green camouflage cap and uniform with a bright red neck scarf, (4) a special forces soldier in a black beret and black tactical uniform, "
         "(5) an air force airman in a blue side cap and sky-blue shirt holding a white pilot helmet, (6) a police officer in a navy blue cap and light blue shirt holding a baton. "
         "Behind them a gentle landscape: soft green rolling hills, a winding dirt road, a big warm yellow sunrise with soft light rays, a pale blue sky with a few puffy clouds. "
         "Far in the distance on the road, a few small grumpy cute enemy war machines approach: a crimson red tank with angry eyes, a dark gray helicopter with angry eyes, a purple armored car. "
         "The top third of the image is calm open sky with no objects, left empty for a logo. The bottom edge is only sandbags and grass. "
         "No text, no letters, no numbers, no logo, no watermark, no insignia, no flags, original characters.")

jobs = []
for b in BR:
    for k1, k2 in PAIRS.get(b, DEFAULT_PAIRS):
        jobs.append({'file': f'art/raw_soft/sheet_{b}_{k1}__{k2}.png', 'w': 1024, 'h': 1024, 'prompt': sheet(b, k1, k2)})
for i, names in enumerate(EN_SHEETS):
    if len(names) == 4: grid, parts = 'in a clean 2x2 grid', ' '.join(f'{p}: {EN[n]}.' for p, n in zip(POS4, names))
    else: grid, parts = 'side by side, one in the left half and one in the right half', f'Left: {EN[names[0]]}. Right: {EN[names[1]]}.'
    jobs.append({'file': f"art/raw_soft/enemies_{'__'.join(names)}.png", 'w': 1024, 'h': 1024, 'prompt': EN_HEAD.format(n=len(names), grid=grid) + parts + ' ' + EN_TAIL})
jobs.append({'file': 'art/raw_soft/title_keyart.png', 'w': 1024, 'h': 1536, 'prompt': TITLE})
json.dump(jobs, open('art/jobs_soft.json', 'w'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs'); print(max(len(j['prompt']) for j in jobs), 'max chars')
for i, j in enumerate(jobs): print(i, j['file'])
