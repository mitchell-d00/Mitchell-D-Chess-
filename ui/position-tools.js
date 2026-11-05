// Original MIT offline position/game tools. Embedded verbatim into index.html.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory;
  else root.PositionTools = factory(root.ENGINE);
})(typeof self !== 'undefined' ? self : globalThis, function (E) {
  'use strict';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const MAX_TEXT = 256000, MAX_PLIES = 1024, RESULTS = ['*', '1-0', '0-1', '1/2-1/2'];
  function fail(message) { throw new Error(message); }
  function validateFen(input) {
    if (typeof input !== 'string' || input.length > 512) fail('FEN must be a short text position.');
    let fields = input.trim().split(/\s+/);
    if (fields.length === 4) fields.push('0', '1');
    if (fields.length !== 6) fail('FEN needs a board, side, castling, en passant and two move counters.');
    const rows = fields[0].split('/'), kings = [0, 0], pawns = [0, 0], count = [0, 0];
    if (rows.length !== 8) fail('FEN needs eight ranks.');
    for (let r = 0; r < 8; r++) {
      let width = 0;
      for (const ch of rows[r]) {
        if (/^[1-8]$/.test(ch)) { width += +ch; continue; }
        if (!/^[pnbrqkPNBRQK]$/.test(ch)) fail('FEN contains an unknown piece.');
        width++; const side = ch === ch.toLowerCase() ? 1 : 0; count[side]++;
        if (ch.toLowerCase() === 'k') kings[side]++;
        if (ch.toLowerCase() === 'p') { pawns[side]++; if (r === 0 || r === 7) fail('Pawns cannot remain on the first or last rank.'); }
      }
      if (width !== 8) fail('Every FEN rank must contain eight squares.');
    }
    if (kings.some(n => n !== 1)) fail('The position needs exactly one king of each colour.');
    if (count.some(n => n > 16) || pawns.some(n => n > 8)) fail('The position has too many pieces or pawns.');
    if (!/^[wb]$/.test(fields[1])) fail('Side to move must be w or b.');
    if (fields[2] !== '-' && (!/^[KQkq]+$/.test(fields[2]) || new Set(fields[2]).size !== fields[2].length)) fail('Invalid castling rights.');
    if (fields[3] !== '-' && !/^[a-h][36]$/.test(fields[3])) fail('Invalid en passant square.');
    if (!/^\d+$/.test(fields[4]) || !/^\d+$/.test(fields[5]) || +fields[4] > 1000000 || +fields[5] < 1 || +fields[5] > 1000000) fail('Invalid move counters.');
    const p = new E.Chess(fields.join(' ')), a = p.kingSq[0], b = p.kingSq[1];
    if (Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 4) - (b >> 4))) <= 1) fail('Kings cannot be adjacent.');
    for (const [right, king, rook, piece] of [['K',4,7,0],['Q',4,0,0],['k',116,119,8],['q',116,112,8]]) {
      if (fields[2].includes(right) && (p.b[king] !== (6 | piece) || p.b[rook] !== (4 | piece))) fail('Castling rights do not match the king and rook positions.');
    }
    if (p.ep >= 0) {
      const step = p.side ? 16 : -16;
      if ((p.ep >> 4) !== (p.side ? 2 : 5) || p.b[p.ep] || p.b[p.ep + step] !== (1 | (p.side ^ 8)) || p.b[p.ep - step] || p.half !== 0) fail('En passant does not match a just-played double pawn move.');
    }
    if (p.inCheck(p.side ^ 8)) fail('The side that just moved cannot have left its own king in check.');
    return p.fen();
  }
  function fromMoves(start, moves, tags, result) {
    const startFen = validateFen(start), p = new E.Chess(startFen), sans = [], fens = [startFen], lastFromTo = [null], canonical = [];
    if (!Array.isArray(moves) || moves.length > MAX_PLIES) fail('The game is too long.');
    for (let i = 0; i < moves.length; i++) {
      const u = moves[i];
      if (typeof u !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) fail('Invalid move at ply ' + (i + 1) + '.');
      const m = p.findUci(u); if (!m) fail('Illegal move ' + u + ' at ply ' + (i + 1) + '.');
      canonical.push(p.uci(m)); sans.push(p.san(m)); lastFromTo.push([E.sqName(E.mFrom(m)), E.sqName(E.mTo(m))]); p.make(m); fens.push(p.fen());
    }
    if (!RESULTS.includes(result || '*')) fail('Invalid game result.');
    return { version: 1, startFen, moves: canonical, sans, fens, lastFromTo, tags: tags || {}, result: result || '*' };
  }
  function fromFen(text) { return fromMoves(validateFen(text), [], {}, '*'); }
  function sanMove(p, input) {
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input)) return p.findUci(input);
    const normalize = s => s.replace(/[!?]+$/g, '').replace(/[+#]+$/g, '').replace(/0/g, 'O').replace(/([a-h][18])([QRBN])$/, '$1=$2');
    const token = normalize(input), target = token.match(/([a-h][1-8])(?:=[QRBN])?$/), type = /^[NBRQK]/.test(token) ? ' pnbrqk'.indexOf(token[0].toLowerCase()) : 1;
    const candidates = p.legalMoves().filter(m => token.startsWith('O-O') ? !!(E.mFlags(m) & 4) : target && E.sqName(E.mTo(m)) === target[1] && (p.b[E.mFrom(m)] & 7) === type);
    const matches = candidates.filter(m => normalize(p.san(m)) === token);
    return matches.length === 1 ? matches[0] : 0;
  }
  function parsePgn(input) {
    if (typeof input !== 'string' || input.length > MAX_TEXT) fail('Use one PGN game of at most 256,000 characters.');
    if (!input.trim()) fail('Paste a PGN game first.');
    let text = input.replace(/^\uFEFF/, ''), at = 0, variations = 0, skipped = false, result = null;
    const tags = Object.create(null), tokens = [];
    function space() { while (/\s/.test(text[at] || '') && at < text.length) at++; }
    space();
    while (text[at] === '[') {
      const match = text.slice(at).match(/^\[([A-Za-z][A-Za-z0-9_]*)\s+"((?:\\.|[^"\\])*)"\s*\]/);
      if (!match || match[2].length > 4096 || Object.keys(tags).length >= 64) fail('Invalid or oversized PGN header.');
      if (Object.prototype.hasOwnProperty.call(tags, match[1])) fail('Duplicate PGN header: ' + match[1] + '.');
      tags[match[1]] = match[2].replace(/\\([\\"])/g, '$1'); at += match[0].length; space();
    }
    while (at < text.length) {
      const ch = text[at];
      if (/\s/.test(ch)) { at++; continue; }
      if (ch === '{') { const end = text.indexOf('}', at + 1); if (end < 0) fail('Unclosed PGN comment.'); at = end + 1; continue; }
      if (ch === ';' || (ch === '%' && (at === 0 || text[at - 1] === '\n'))) { const end = text.indexOf('\n', at + 1); at = end < 0 ? text.length : end + 1; continue; }
      if (ch === '(') { variations++; skipped = true; at++; continue; }
      if (ch === ')') { if (!variations) fail('Unmatched PGN variation bracket.'); variations--; at++; continue; }
      if (ch === '[') fail('Import one game at a time. A second or misplaced header was found.');
      if (ch === '}') fail('Unmatched PGN comment bracket.');
      let end = at; while (end < text.length && !/[\s{}();]/.test(text[end])) end++;
      let token = text.slice(at, end); at = end;
      if (variations) continue;
      token = token.replace(/^\d+\.(?:\.\.)?/, '');
      if (!token || /^\.+$/.test(token) || /^\$\d+$/.test(token) || /^[!?]+$/.test(token) || /^e\.?p\.?$/i.test(token)) continue;
      token = token.replace(/\$\d+$/, '');
      if (RESULTS.includes(token)) { if (result !== null) fail('More than one PGN result was found.'); result = token; continue; }
      if (result !== null) fail('Moves follow the PGN result. Import only one game.');
      tokens.push(token); if (tokens.length > MAX_PLIES) fail('Import supports at most 1,024 half-moves.');
    }
    if (variations) fail('Unclosed PGN variation.');
    if (tags.Variant && !/^(standard|chess|from position)$/i.test(tags.Variant)) fail('Only standard chess PGN is supported.');
    if (tags.SetUp && !/^[01]$/.test(tags.SetUp)) fail('Invalid SetUp header.');
    if (tags.SetUp === '1' && !tags.FEN) fail('SetUp 1 requires a FEN header.');
    if (tags.SetUp === '0' && tags.FEN && validateFen(tags.FEN) !== START) fail('FEN conflicts with SetUp 0.');
    if (tags.Result && !RESULTS.includes(tags.Result)) fail('Invalid Result header.');
    if (tags.Result && result && tags.Result !== result) fail('PGN header and move-text results disagree.');
    const startFen = validateFen(tags.FEN || START), p = new E.Chess(startFen), moves = [];
    for (let i = 0; i < tokens.length; i++) {
      const m = sanMove(p, tokens[i]); if (!m) fail('Could not play “' + tokens[i] + '” at half-move ' + (i + 1) + '.');
      moves.push(p.uci(m)); p.make(m);
    }
    const record = fromMoves(startFen, moves, tags, result || tags.Result || '*');
    record.notice = skipped ? 'Loaded the main line; variations were skipped.' : '';
    return record;
  }
  function exportPgn(record, supplied) {
    const tags = Object.assign({}, record.tags || {}, supplied || {}), result = record.result || '*';
    if (!RESULTS.includes(result)) fail('Invalid game result.');
    tags.Result = result;
    if (record.startFen !== START) { tags.SetUp = '1'; tags.FEN = record.startFen; } else { delete tags.SetUp; delete tags.FEN; }
    const quote = value => String(value).replace(/[\r\n]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let out = Object.keys(tags).filter(k => /^[A-Za-z][A-Za-z0-9_]*$/.test(k)).map(k => '[' + k + ' "' + quote(tags[k]) + '"]').join('\n') + '\n\n';
    const fields = record.startFen.split(' '); let black = fields[1] === 'b', number = +fields[5];
    record.sans.forEach((san, i) => { if (!black) out += number + '. '; else if (i === 0) out += number + '... '; out += san + ' '; if (black) number++; black = !black; });
    return out + result + '\n';
  }
  function hashFen(hash) {
    if (!hash.startsWith('#fen=')) return null;
    if (hash.length > 2048) fail('The position link is too long.');
    let value; try { value = decodeURIComponent(hash.slice(5)); } catch (error) { fail('The position link has invalid encoding.'); }
    return validateFen(value);
  }
  return { START, MAX_TEXT, MAX_PLIES, validateFen, fromMoves, fromFen, parsePgn, exportPgn, hashFen };
});
