// ================= Settings =================
const BOARD_THEMES = [
  ['Tournament', '#eeeed2', '#769656'], ['Walnut', '#f0d9b5', '#b58863'], ['Ocean', '#dee3e6', '#8ca2ad'],
  ['Slate', '#d7dbe1', '#5f6d7c'], ['Coral', '#f6e3d8', '#d27d63'], ['Violet', '#e7e0f0', '#8a6fb0'],
  ['Midnight', '#9aa4b1', '#3c4655'], ['Mint', '#e6f2ea', '#5aa77b'],
  ['High contrast', '#ffffff', '#626b78'], ['Blue & sand', '#fff3c4', '#4f6e94']
];
const PIECE_THEMES = [
  ['Classic', '#fbfaf5', '#262321'], ['Ivory & ebony', '#f2e6cc', '#3b2b1f'], ['Ice & fire', '#dcf0ff', '#c2382a'],
  ['Gold & silver', '#e8c35a', '#9aa4ae'], ['Mint & plum', '#c8f0da', '#5b2d6e'], ['Sky & ink', '#9fd2ff', '#1f2c4d'], ['High contrast', '#ffffff', '#000000']
];
const DEF = { theme: 'system', light: '#eeeed2', dark: '#769656', pw: '#fbfaf5', pb: '#262321', coords: true, legal: true, lastmove: true, anim: 'normal', sound: true, autoQueen: false, speed: 'normal' };
let S = Object.assign({}, DEF, store.get('settings', {}));
const saveS = () => store.set('settings', S);
function lum(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; const f = c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); }
// Pure black or white, whichever contrasts more strongly with the piece fill.
function pieceOutline(hex) { const l = lum(hex) + .05; return l / .05 >= 1.05 / l ? '#000000' : '#ffffff'; }
function applySettings() {
  const r = document.documentElement;
  if (S.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
  r.style.setProperty('--sq-light', S.light); r.style.setProperty('--sq-dark', S.dark);
  r.style.setProperty('--pw', S.pw); r.style.setProperty('--pb', S.pb);
  r.style.setProperty('--pw-line', pieceOutline(S.pw));
  r.style.setProperty('--pb-line', pieceOutline(S.pb));
  r.style.setProperty('--anim', S.anim === 'off' ? '0ms' : S.anim === 'fast' ? '90ms' : '170ms');
  r.dataset.motion = S.anim === 'off' ? 'off' : '';
  const dark = S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#themeBtn').textContent = dark ? '☀ Light' : '☾ Dark';
  $('#themeBtn').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
$('#themeBtn').onclick = () => {
  const dark = S.theme === 'dark' || (S.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  S.theme = dark ? 'light' : 'dark'; saveS(); applySettings();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

