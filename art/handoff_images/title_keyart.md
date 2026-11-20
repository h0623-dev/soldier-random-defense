# 타이틀 · 로딩 일러스트 — 미드저니 등 다른 AI용 지시문

지금 게임에 들어 있는 그림은 Figma로 만든 초안(`art/raw_figma/title_keyart.png` → `www/img/title.webp`)이다.
더 좋은 그림을 만들어 오면 같은 이름으로 바꿔 끼우면 된다.

## 그림 조건
- 세로 2:3 (1024×1536 이상). 파일 이름 `title.png`
- **위쪽 1/3은 빈 하늘** — 게임이 그 자리에 제목 글자를 얹는다. 그림 안에 글자·로고를 넣지 않는다.
- 캐릭터 6명은 가운데 아래쪽에 모으고, **좌우 끝에 붙이지 않는다**(가로 화면에서 위아래가 잘린다).
- **맨 아래 15%에는 중요한 것을 두지 않는다**(메뉴와 로딩 막대가 덮는다). 모래주머니·풀 같은 바닥만.
- 실제 군·경찰 휘장, 국기, 글자 없음. 기존 만화·게임 캐릭터와 닮지 않게.
- 참고 그림으로 `reference/01_style_and_rank_tiers_army.jpg`(그림체)와 지금 초안을 함께 넣으면 그림체가 잘 맞는다.

## 미드저니에 붙여 넣을 지시문
```
cute chibi mobile tower defense game key art, vertical poster, six super-deformed soldier mascots only 2 heads tall with huge round heads and large round solid black eyes, confident smiles, standing side by side in a heroic group pose on top of a tan sandbag wall, facing the viewer: an army soldier in a green camouflage helmet holding a black rifle in the center and slightly larger, a navy sailor in a white sailor uniform with blue collar and white sailor cap, a marine in brown-green camouflage with a red neck scarf, a special forces soldier in a black tactical uniform and black beret, an air force pilot in a blue flight suit holding a white pilot helmet under one arm, a police officer in a navy blue cap and neon yellow reflective vest holding a baton, background of bright green rolling hills with a winding dirt road, a big warm yellow sunrise with soft light rays, light blue sky with a few puffy white clouds, far away on the road a few small funny angry cartoon enemy war machines, a yellow tank with angry eyes, a gray helicopter with angry eyes, a purple armored car, the top third of the image is calm empty sky, very thick uniform black outlines, flat cel colors, minimal shading, clean vector cartoon style, bright cheerful colors --ar 2:3 --no text, letters, numbers, logo, watermark, signature, flag, insignia, realistic
```
- 참고 그림을 쓸 때는 지시문 끝에 `--sref <참고 그림 주소>`를 붙인다.
- 미드저니가 아닌 대화형 AI에는 `--ar` 이후를 지우고 "세로 2:3, 글자·로고·국기·휘장 없음"이라고 덧붙인다.

## 다른 분위기로 만들고 싶을 때 바꿀 부분
- 시간대: `a big warm yellow sunrise` → `a dramatic orange sunset` / `a starry night with a big moon`
- 장소: `green rolling hills` → `a snowy mountain base` / `a sandy beach with a warship` / `a city street at night`
- 구도: `standing side by side` → `charging forward together` / `saluting together`
