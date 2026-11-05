  // Original JS inference for the MIT-licensed Leorik 3.1 network format.
  // Trained weights: Thomas Jahn. See the full MIT notices in the HTML and third-party/.
  var NNUE_MODEL = { hidden: 128, data: '__MODEL__' };
  var NNUE_WEIGHTS = null, NNUE_KERNEL = null, NNUE_SCRATCH = null;
  var NNUE_CONFIG = { wasm: true };
  var NNUE_STACK_BASE = 0, NNUE_FRAMES = null, NNUE_STACK_OWNER = null, NNUE_FRAME_VALID = new Uint8Array(256);
  var NNUE_KERNEL_DATA = '__KERNEL__';
  function neuralDecode(text) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', bytes = new Uint8Array(Math.floor(text.length * 3 / 4)), bits = 0, n = 0, out = 0;
    for (var j = 0; j < text.length; j++) {
      var v = alphabet.indexOf(text[j]); if (v < 0) continue;
      bits = (bits << 6) | v; n += 6;
      if (n >= 8) { n -= 8; bytes[out++] = (bits >> n) & 255; }
    }
    return bytes.subarray(0, out);
  }
  function neuralWeights() {
    if (NNUE_WEIGHTS) return NNUE_WEIGHTS;
    var bytes = neuralDecode(NNUE_MODEL.data), out = bytes.length;
    var size = (768 * NNUE_MODEL.hidden + 3 * NNUE_MODEL.hidden + 1) * 2;
    if (out < size) throw new Error('Truncated neural network');
    // Decode explicitly as little endian rather than assuming host endianness.
    var weights = new Int16Array(size / 2);
    for (var j = 0; j < weights.length; j++) weights[j] = bytes[j * 2] | (bytes[j * 2 + 1] << 8);
    try {
      if (typeof WebAssembly !== 'undefined') {
        NNUE_KERNEL = new WebAssembly.Instance(new WebAssembly.Module(neuralDecode(NNUE_KERNEL_DATA))).exports;
        NNUE_STACK_BASE = (1024 + weights.byteLength + 15) & ~15;
        var required = NNUE_STACK_BASE + 256 * NNUE_MODEL.hidden * 4;
        if (required > NNUE_KERNEL.memory.buffer.byteLength) NNUE_KERNEL.memory.grow(Math.ceil((required - NNUE_KERNEL.memory.buffer.byteLength) / 65536));
        NNUE_FRAMES = [];
        for (var frame = 0; frame < 256; frame++) NNUE_FRAMES.push(new Int16Array(NNUE_KERNEL.memory.buffer, NNUE_STACK_BASE + frame * NNUE_MODEL.hidden * 4, NNUE_MODEL.hidden * 2));
        var view = new Int16Array(NNUE_KERNEL.memory.buffer, 1024, weights.length); view.set(weights); weights = view;
        NNUE_SCRATCH = new Int16Array(NNUE_KERNEL.memory.buffer, 0, NNUE_MODEL.hidden * 2);
      }
    } catch (unsupported) { NNUE_KERNEL = null; }
    NNUE_WEIGHTS = weights; return weights;
  }
  function NeuralAccumulator(pos) {
    var h = NNUE_MODEL.hidden, w = neuralWeights();
    this.h = h; this.weights = w; this.ply = 0;
    this.values = [new Int16Array(h * 2)];
    this.valid = new Uint8Array(256); this.valid[0] = 1;
    this.moves = new Int32Array(256); this.pieces = new Int8Array(256);
    this.promoted = new Int8Array(256); this.captured = new Int8Array(256); this.capSq = new Int16Array(256);
    this.count = new Int8Array(256);
    var initial = NNUE_CONFIG.wasm && NNUE_KERNEL ? NNUE_SCRATCH : this.values[0];
    for (var i = 0; i < h; i++) initial[i] = initial[i + h] = w[768 * h + i];
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      if (pos.b[s]) { this.add(initial, pos.b[s], s, 1); this.count[0]++; }
    }
    if (initial !== this.values[0]) this.values[0].set(initial);
  }
  NeuralAccumulator.prototype.add = function (acc, piece, square, sign) {
    if (!piece) return;
    var h = this.h, w = this.weights, sq = (square >> 4) * 8 + (square & 7), type = (piece & 7) - 1,
        colour = piece & BLACK ? 1 : 0, white = (colour * 384 + type * 64 + sq) * h,
        black = ((1 - colour) * 384 + type * 64 + (sq ^ 56)) * h;
    if (NNUE_CONFIG.wasm && NNUE_KERNEL) {
      if (acc !== NNUE_SCRATCH) NNUE_SCRATCH.set(acc);
      NNUE_KERNEL.update(1024 + white * 2, 1024 + black * 2, sign, h);
      if (acc !== NNUE_SCRATCH) acc.set(NNUE_SCRATCH);
      return;
    }
    for (var i = 0; i < h; i++) {
      acc[i] += sign * w[white + i]; acc[h + i] += sign * w[black + i];
    }
  };
  NeuralAccumulator.prototype.push = function (m, piece, promoted, captured, capSq) {
    var p = ++this.ply;
    if (p >= this.valid.length) throw new Error('Neural accumulator stack overflow');
    this.valid[p] = 0; this.moves[p] = m; this.pieces[p] = piece;
    this.promoted[p] = promoted; this.captured[p] = captured; this.capSq[p] = capSq;
    this.count[p] = this.count[p - 1] - (captured ? 1 : 0);
  };
  NeuralAccumulator.prototype.ensure = function () {
    var p = this.ply, first = p;
    while (!this.valid[first]) first--;
    if (NNUE_CONFIG.wasm && NNUE_KERNEL) {
      // A bounded 256-frame cache belongs to one accumulator at a time. JS copies
      // stay authoritative, so switching positions/backends cannot leak state.
      if (NNUE_STACK_OWNER !== this) { NNUE_STACK_OWNER = this; NNUE_FRAME_VALID.fill(0); }
      if (!NNUE_FRAME_VALID[first]) { NNUE_FRAMES[first].set(this.values[first]); NNUE_FRAME_VALID[first] = 1; }
      for (var d = first + 1; d <= p; d++) {
        var target = this.values[d] || (this.values[d] = new Int16Array(this.h * 2));
        NNUE_KERNEL.transition(NNUE_STACK_BASE + d * this.h * 4, NNUE_STACK_BASE + (d - 1) * this.h * 4,
          this.moves[d], this.pieces[d], this.promoted[d], this.captured[d], this.capSq[d], this.h);
        target.set(NNUE_FRAMES[d]); this.valid[d] = 1; NNUE_FRAME_VALID[d] = 1;
      }
      return this.values[p];
    }
    for (var d = first + 1; d <= p; d++) {
      var target = this.values[d] || (this.values[d] = new Int16Array(this.h * 2));
      var a = NNUE_CONFIG.wasm && NNUE_KERNEL ? NNUE_SCRATCH : target;
      a.set(this.values[d - 1]);
      var m = this.moves[d];
      if (m) {
        var f = m & 127, t = (m >> 7) & 127;
        this.add(a, this.pieces[d], f, -1); this.add(a, this.promoted[d], t, 1);
        if (this.captured[d]) this.add(a, this.captured[d], this.capSq[d], -1);
        if ((m >> 17) & 4) {
          var rf = t === 6 ? 7 : t === 2 ? 0 : t === 118 ? 119 : 112,
              rt = t === 6 ? 5 : t === 2 ? 3 : t === 118 ? 117 : 115;
          this.add(a, R | (this.pieces[d] & BLACK), rf, -1);
          this.add(a, R | (this.pieces[d] & BLACK), rt, 1);
        }
      }
      if (a !== target) target.set(a);
      if (NNUE_STACK_OWNER === this) NNUE_FRAME_VALID[d] = 0;
      this.valid[d] = 1;
    }
    return this.values[p];
  };
  NeuralAccumulator.prototype.score = function (side) {
    var h = this.h, a = this.ensure(), w = this.weights, offset = 769 * h,
        us = side ? h : 0, them = side ? 0 : h, sum = 0;
    if (NNUE_CONFIG.wasm && NNUE_KERNEL) return NNUE_KERNEL.scoreAt(NNUE_STACK_BASE + this.ply * h * 4, side, h);
    for (var i = 0; i < h; i++) {
      var x = Math.max(0, Math.min(255, a[us + i])), y = Math.max(0, Math.min(255, a[them + i]));
      sum = (sum + Math.imul(x * x, w[offset + i]) + Math.imul(y * y, w[offset + h + i])) | 0;
    }
    return (((sum / 255 | 0) + w[771 * h]) * 400 / (255 * 64)) | 0;
  };
  function neuralEvaluate(pos) {
    var acc = pos.nnue || (pos.nnue = new NeuralAccumulator(pos));
    // Preserve exact KPK draws and the existing sparse mating/endgame guidance.
    if (acc.count[acc.ply] <= 4) return evaluate(pos, 'full');
    return acc.score(pos.side);
  }
