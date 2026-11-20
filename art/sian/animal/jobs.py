# 동물 유닛 시안(적용하지 않음): 육군 = 땅개(강아지), 의경 = 오소리. 군별 한 줄 세우기 1장 + 게임 화면에 얹어 볼 시트 4장
import json, os, sys
sys.path.insert(0, '/home/user/soldier-random-defense/tools')
import soft_jobs as S
OUT = os.path.dirname(os.path.abspath(__file__)) + '/raw/'
jobs = []
def add(file, prompt, w=1024, h=1024): jobs.append({'file': OUT + file, 'w': w, 'h': h, 'prompt': prompt})
HEAD = ("A game sprite sheet with exactly four separate chibi character illustrations arranged in a clean 2x2 grid with wide empty gaps between them, on a plain solid pure white background. "
        "No borders, no panels, no labels, no text, no arrows, no ground. " + S.STYLE + ", round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight, tiny mouth. "
        "All four figures are the same {who}, standing upright on two legs like a person, with the same cute face. It is clearly an animal (animal head, ears, muzzle, fur, tail), not a human. ")
DOG = ('cute anthropomorphic puppy soldier: a fluffy tan-and-cream Korean Jindo-style puppy with pointy ears poking out through the helmet, a black button nose, a cream muzzle and a curled-up fluffy tail',
       S.BR['army'][1])
BADGER = ('cute anthropomorphic badger police officer: a chubby little badger with gray fur, a white face with two bold black stripes running over the eyes to the small round ears, a black button nose and a short stubby tail',
          S.BR['police'][1])
def sheet(name, who, outfit, a, b):
    add(name, HEAD.format(who=who) + f"The character wears {outfit}. "
        + f"Top-left: standing idle, {a[0]}. Top-right: the same character in action, {a[1]}. Bottom-left: standing idle, {b[0]}. Bottom-right: the same character in action, {b[1]}. " + S.TAIL)
sheet('sheet_army_inf__inf-art.png', *DOG, ('holding a black rifle at rest across the body', S.RIFLE), ('holding one olive mortar shell in both paws next to a short dark mortar tube on a bipod', S.MORTAR))
sheet('sheet_army_med__sig.png', *DOG, ('a white armband with a red cross, holding a white first-aid bag with a red cross', S.BAND), ('wearing a headset, carrying an olive radio backpack with a long antenna, holding a radio handset', S.RADIO))
P = S.BR['police'][2]
sheet('sheet_police_inf__art.png', *BADGER, P['inf'][1:], ('wearing a navy blue riot helmet with a clear visor pushed up, holding a big rectangular transparent riot shield in front', P['art'][2]))
sheet('sheet_police_med__sig.png', *BADGER, P['med'][1:], P['sig'][1:])
add('lineup.png', "A character lineup concept sheet with exactly six separate chibi animal soldier characters standing side by side in one single horizontal row with clear gaps between them, on a plain solid pure white background. "
    "No borders, no panels, no labels, no text, no arrows, no ground. " + S.STYLE + ", round rosy pink blush on the cheeks, small oval dark brown eyes with a white highlight, tiny mouth. "
    "Each is a different cute anthropomorphic animal standing upright on two legs, full body, all the same height, facing the viewer, clearly an animal and not a human. From left to right: "
    f"1) a fluffy tan-and-cream Jindo-style puppy with pointy ears and a curled tail, wearing {S.BR['army'][1]}, holding a black rifle at rest. "
    f"2) a chubby gray spotted seal pup with whiskers and flippers, wearing {S.BR['navy'][1]}, holding a small brass telescope. "
    f"3) a small green crocodile with a toothy friendly grin and a thick tail, wearing {S.BR['marine'][1]}, holding a black rifle at rest. "
    f"4) a white tiger cub with black stripes and a long striped tail, wearing {S.BR['sf'][1]}, arms crossed with a confident look. "
    f"5) a young brown falcon with a cream chest, a small hooked yellow beak and folded wings, wearing {S.BR['air'][1]}, saluting with one wing. "
    f"6) a chubby gray badger with a white face and two bold black stripes over the eyes, wearing {S.BR['police'][1]}, holding a short black police baton. "
    "Nothing overlapping, nothing touching the image edges. No insignia, no emblems, no flags, no letters, no numbers, original character design.", 1536, 1024)
json.dump(jobs, open(os.path.dirname(os.path.abspath(__file__)) + '/jobs.json', 'w'), ensure_ascii=False, indent=1); print(len(jobs))
