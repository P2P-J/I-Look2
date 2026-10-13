// 테마 공유 코드: ilook1/<배경>/<포인트>/<사이드바 또는 ->/<이름>
// 사람이 읽을 수 있고 메신저로 붙여넣기 안전한 형식. 이름에는 슬래시가 들어가도 된다.
const HEX = /^[0-9a-f]{6}$/;
const NAME_MAX = 24;

export function encodeTheme({ name, seeds }) {
  const h = (v) => v.replace('#', '').toLowerCase();
  return `ilook1/${h(seeds.bg)}/${h(seeds.accent)}/${seeds.sidebar ? h(seeds.sidebar) : '-'}/${name}`;
}

export function decodeTheme(code) {
  const parts = String(code || '').trim().split('/');
  if (parts.length < 5 || parts[0].toLowerCase() !== 'ilook1') return null;
  const [, bg, accent, sidebar] = parts.map((p, i) => (i < 4 ? p.toLowerCase() : p));
  const name = parts.slice(4).join('/').trim().slice(0, NAME_MAX);
  if (!HEX.test(bg) || !HEX.test(accent) || !(sidebar === '-' || HEX.test(sidebar)) || !name) return null;
  const seeds = { bg: '#' + bg, accent: '#' + accent };
  if (sidebar !== '-') seeds.sidebar = '#' + sidebar;
  return { name, seeds };
}
