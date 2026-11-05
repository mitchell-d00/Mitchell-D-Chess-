// ================= Pieces =================
const PIECE_PATHS = {
  p: { body: ['M22.5 9a4.5 4.5 0 0 0-2.7 8.1c-2 1.2-3.3 3.3-3.3 5.8 0 2 .9 3.8 2.4 5-3.4 1.4-5.9 4.2-6.4 7.1h20c-.5-2.9-3-5.7-6.4-7.1 1.5-1.2 2.4-3 2.4-5 0-2.5-1.3-4.6-3.3-5.8A4.5 4.5 0 0 0 22.5 9z'] },
  r: { body: ['M12.5 18h20v-7h-4v3h-3.5v-3h-5v3h-3.5v-3h-4z', 'M15 30h15l-1-12H16z', 'M13 35h19l-1.6-5H14.6z'], det: 'M16 18h13M15 30h15' },
  n: { body: ['M14 35h18c.3-6.5-1.6-11.5-3.6-15.5 1.6-2.6 1-6-1.8-7.8l-.8-3.2-2.2 2.6c-5.2.8-9.4 4.7-11.1 10.2l-.9 3.2c-.4 1.9 1.6 3 3 1.7l2-1.8c1.6.1 3-.5 3.9-1.6.2 4.4-6.8 6.3-6.5 12.2z'], det: 'M24.5 13.5c2 1.5 3 4 2.6 6.5', eye: [18.2, 15.6] },
  b: { body: ['M22.5 11.5c-5 3.8-7.2 8.6-5.8 12.6.8 2.4 3 3.6 5.8 3.6s5-1.2 5.8-3.6c1.4-4-.8-8.8-5.8-12.6z', 'M15.5 31.5h14l-1.6-3.6H17.1z', 'M14 35h17l-1.5-3.5h-14z'], circ: [[22.5, 8.4, 2.6]], det: 'M25.4 15.6l-4.6 4.6' },
  q: { body: ['M9 14.5L13 31h19l4-16.5-6 7.5-.5-10.5-4.5 9.5-2.5-11.5-2.5 11.5-4.5-9.5-.5 10.5z', 'M12.5 35h20l-.6-4H13.1z'], circ: [[9, 14.5, 2.1], [15.5, 11.5, 2.1], [22.5, 9.5, 2.1], [29.5, 11.5, 2.1], [36, 14.5, 2.1]], det: 'M13.2 31h18.6' },
  k: { body: ['M12.5 31h20l2.6-9.2c-2.9-4.3-8.4-4.2-11-.6 0-3.1-1-5.6-1.6-5.6s-1.6 2.5-1.6 5.6c-2.6-3.6-8.1-3.7-11 .6z', 'M11.5 35h22l-1-4h-20z'], cross: 'M22.5 5v9M18.8 8.6h7.4', det: 'M13 31h19' }
};
function pieceSVG(type, color, extra) {
  const P = PIECE_PATHS[type], f = color === 'w' ? 'var(--pw)' : 'var(--pb)', l = color === 'w' ? 'var(--pw-line)' : 'var(--pb-line)';
  let s = `<svg viewBox="0 0 45 45" aria-hidden="true" ${extra || ''}><g fill="${f}" stroke="${l}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">`;
  if (P.cross) s += `<path d="${P.cross}" fill="none" stroke-width="2.4"/>`;
  P.body.forEach(d => s += `<path d="${d}"/>`);
  (P.circ || []).forEach(c => s += `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}"/>`);
  if (P.det) s += `<path d="${P.det}" fill="none"/>`;
  if (P.eye) s += `<circle cx="${P.eye[0]}" cy="${P.eye[1]}" r="1.1" fill="${l}" stroke="none"/>`;
  return s + '</g></svg>';
}
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

