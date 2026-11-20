// 화면에 쓰는 작은 그림 기호(SVG). HTML에서는 data-ic="이름"을 붙이면 시작할 때 채워 넣고, 코드에서는 ic('이름')으로 쓴다.
export const ICON = {
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f6c343" stroke="#8a5a00" stroke-width="2"/><path d="M12 6v12M8.5 9.5h5a2 2 0 010 4h-3a2 2 0 000 4h5" fill="none" stroke="#8a5a00" stroke-width="2" stroke-linecap="round"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v9l-9 5-9-5z" fill="#6fc3ff" stroke="#17466b" stroke-width="2" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v9" fill="none" stroke="#17466b" stroke-width="2"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z" fill="#ff7b6b" stroke="#6b1410" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="12" r="2" fill="#6b1410"/><circle cx="15" cy="12" r="2" fill="#6b1410"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M5 4h13l-3 4 3 4H5z" fill="currentColor"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4v8H9v-8H5z" fill="currentColor"/></svg>',
  tent: '<svg viewBox="0 0 24 24"><path d="M12 4L3 20h18z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 11l-3 9h6z" fill="currentColor"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M8 8h7M8 12h7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sword: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7L10 21l-3-1-3-3-1-3z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M7 20l-3-3" stroke="currentColor" stroke-width="2.3"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
  ring: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.3" stroke-dasharray="4 3"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
  ticket: '<svg viewBox="0 0 24 24"><path d="M3 7h18v3.5a1.5 1.5 0 000 3V17H3v-3.5a1.5 1.5 0 000-3z" fill="#ffb86b" stroke="#7a3d00" stroke-width="2" stroke-linejoin="round"/><path d="M14.5 7.5v9" stroke="#7a3d00" stroke-width="1.8" stroke-dasharray="2 2"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#7fe0ff" stroke="#14506b" stroke-width="2" stroke-linejoin="round"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" fill="none" stroke="#14506b" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.5 5.7 21l1.5-7L2 9.3l7-.8z" fill="currentColor"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><path d="M8 2l4 7 4-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="12" cy="15" r="6" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9.2 9.3a3 3 0 115 2.2c-1 .8-2.2 1.3-2.2 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.4" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l5 4-5 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // 하단 탭용 (한 색으로 굵게)
  cart: '<svg viewBox="0 0 24 24"><path d="M2 4h3l2.6 10.5h10.2L20 7H7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19" r="1.9" fill="currentColor"/><circle cx="16.5" cy="19" r="1.9" fill="currentColor"/></svg>',
  paw: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="5.5" cy="10.5" rx="2.2" ry="2.9"/><ellipse cx="9.8" cy="6" rx="2.3" ry="3.1"/><ellipse cx="14.2" cy="6" rx="2.3" ry="3.1"/><ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.9"/><path d="M12 11.5c3.2 0 6 3.2 6 6 0 2.2-1.9 3-3.6 2.6-1.6-.4-3.2-.4-4.8 0C7.9 20.5 6 19.7 6 17.5c0-2.8 2.8-6 6-6z"/></svg>',
  swords: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11 11M4 4v3.5M4 4h3.5M13 17l4-4M16.5 16.5L20 20"/><path d="M20 4L9 15M20 4v3.5M20 4h-3.5M11 17l-4-4M7.5 16.5L4 20"/></svg>',
  tkt: '<svg viewBox="0 0 24 24"><path d="M3 7h18v3.5a1.5 1.5 0 000 3V17H3v-3.5a1.5 1.5 0 000-3z" fill="currentColor"/><path d="M14.5 8v8" stroke="#3b2e23" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
  shop: '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-5h13L20 9M5 9v11h14V9M4 9h16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="2.3"/></svg>',
};
// 재화 기호는 그림 파일(img/ic/<이름>.webp, 상점과 같은 그림체)로 보여 준다. 그림을 못 읽으면 위의 SVG로 돌아간다
const PIC = { gem: 'gem', coin: 'coin', box: 'box', ticket: 'ticket', bolt: 'bolt', medal: 'medal',      // 재화
  flag: 'flag', menu: 'menu', list: 'mission', book: 'book', exit: 'exit', sword: 'sword', ring: 'target', help: 'help', sound: 'sound' };      // 전투 화면 · 메뉴 (기호 이름 → 그림 파일)
const body = name => (PIC[name] ? `<img src="img/ic/${PIC[name]}.webp" alt="" onerror="this.outerHTML=window.__icSvg('${name}')">` : ICON[name] || '');
if (typeof window !== 'undefined') window.__icSvg = n => ICON[n] || '';
export const ic = (name, cls = '') => `<span class="ic ${cls}">${body(name)}</span>`;
export function fillIcons(root = document) { root.querySelectorAll('[data-ic]').forEach(e => { e.classList.add('ic'); e.innerHTML = body(e.dataset.ic); }); }
