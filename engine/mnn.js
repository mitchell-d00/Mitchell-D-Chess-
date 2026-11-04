  // Mitchell Neural Network, original MIT implementation and MNN1 format.
  // Shared sparse piece-square embeddings; two colour-relative accumulators.
  // No third-party engine code, network, pretrained initialization or labels.
  var MNN_MODEL = { format: 'MNN1', data: '__MNN_MODEL__' };
  var MNN_WEIGHTS = null, MNN_KERNEL = null, MNN_SCRATCH = null;
  var MNN_CONFIG = { wasm: true };
  var MNN_KERNEL_DATA = '__MNN_KERNEL__';
  function mnnDecode(text) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', bytes = [], bits = 0, value = 0;
    for (var i = 0; i < text.length; i++) {
      var digit = alphabet.indexOf(text[i]); if (digit < 0) continue;
      value = (value << 6) | digit; bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((value >> bits) & 255); }
    }
    return new Uint8Array(bytes);
  }
  function mnnWeights() {
    if (MNN_WEIGHTS) return MNN_WEIGHTS;
    var bytes = mnnDecode(MNN_MODEL.data), view = new DataView(bytes.buffer);
    if (bytes.length < 16 || String.fromCharCode.apply(null, bytes.subarray(0, 4)) !== 'MNN1') throw new Error('Invalid Mitchell model magic');
    var hidden = view.getUint16(4, true), inputs = view.getUint16(6, true);
    var inputScale = view.getUint16(8, true), outputScale = view.getUint16(10, true), limit = view.getUint16(12, true);
    if (hidden < 8 || hidden > 128 || hidden % 8 || inputs !== 768 || inputScale !== 256 || outputScale !== 256 || limit > 200 || view.getUint16(14, true)) throw new Error('Unsupported Mitchell model header');
    if (bytes.length !== 16 + (inputs + 2) * hidden * 2) throw new Error('Wrong Mitchell model length');
    var data = new Int16Array((bytes.length - 16) / 2);
    for (var k = 0; k < data.length; k++) data[k] = view.getInt16(16 + k * 2, true);
    if (typeof WebAssembly !== 'undefined') try {
      MNN_KERNEL = new WebAssembly.Instance(new WebAssembly.Module(mnnDecode(MNN_KERNEL_DATA))).exports;
      var shared = new Int16Array(MNN_KERNEL.memory.buffer, 1024, data.length); shared.set(data); data = shared;
      MNN_SCRATCH = new Int32Array(MNN_KERNEL.memory.buffer, 0, hidden * 2);
    } catch (unsupported) { MNN_KERNEL = null; }
    MNN_WEIGHTS = { hidden: hidden, clip: inputScale, divisor: inputScale * outputScale, limit: limit, data: data };
    return MNN_WEIGHTS;
  }
  function mnnFeature(piece, square, black) {
    var sq = ((square >> 4) << 3) | (square & 7), colour = !!(piece & 8);
    return (((colour !== !!black) ? 6 : 0) + (piece & 7) - 1) * 64 + (black ? sq ^ 56 : sq);
  }
  function MitchellAccumulator(pos) {
    this.weights = mnnWeights(); this.ply = 0; this.capacity = 256;
    this.values = []; this.valid = new Uint8Array(this.capacity); this.count = new Uint8Array(this.capacity);
    this.moves = new Int32Array(this.capacity); this.pieces = new Int8Array(this.capacity);
    this.promoted = new Int8Array(this.capacity); this.captured = new Int8Array(this.capacity); this.captureSquares = new Int16Array(this.capacity);
    var h = this.weights.hidden, root = this.values[0] = new Int32Array(h * 2);
    root.set(this.weights.data.subarray(0, h), 0); root.set(this.weights.data.subarray(0, h), h);
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      if (pos.b[s]) { this.add(root, pos.b[s], s, 1); this.count[0]++; }
    }
    this.valid[0] = 1;
  }
  MitchellAccumulator.prototype.add = function (values, piece, square, sign) {
    var h = this.weights.hidden, data = this.weights.data;
    var w = h + mnnFeature(piece, square, false) * h, b = h + mnnFeature(piece, square, true) * h;
    if (MNN_CONFIG.wasm && MNN_KERNEL) {
      if (values !== MNN_SCRATCH) MNN_SCRATCH.set(values);
      MNN_KERNEL.update(1024 + w * 2, 1024 + b * 2, sign, h);
      if (values !== MNN_SCRATCH) values.set(MNN_SCRATCH);
    } else for (var k = 0; k < h; k++) { values[k] += sign * data[w + k]; values[h + k] += sign * data[b + k]; }
  };
  MitchellAccumulator.prototype.push = function (move, piece, promoted, captured, captureSquare) {
    var next = this.ply + 1;
    if (next >= this.capacity) {
      this.capacity *= 2;
      for (var key of ['valid', 'count', 'moves', 'pieces', 'promoted', 'captured', 'captureSquares']) {
        var grown = new this[key].constructor(this.capacity); grown.set(this[key]); this[key] = grown;
      }
    }
    this.moves[next] = move; this.pieces[next] = piece; this.promoted[next] = promoted;
    this.captured[next] = captured; this.captureSquares[next] = captureSquare;
    this.count[next] = this.count[this.ply] - (captured ? 1 : 0); this.valid[next] = 0; this.ply = next;
  };
  MitchellAccumulator.prototype.ensure = function () {
    var base = this.ply;
    while (!this.valid[base]) base--;
    for (var at = base + 1; at <= this.ply; at++) {
      var values = this.values[at] || (this.values[at] = new Int32Array(this.weights.hidden * 2));
      values.set(this.values[at - 1]);
      var target = MNN_CONFIG.wasm && MNN_KERNEL ? MNN_SCRATCH : values;
      if (target !== values) target.set(values);
      var move = this.moves[at];
      if (move) {
        var from = move & 127, to = (move >> 7) & 127, flags = (move >> 17) & 15;
        this.add(target, this.pieces[at], from, -1); this.add(target, this.promoted[at], to, 1);
        if (this.captured[at]) this.add(target, this.captured[at], this.captureSquares[at], -1);
        if (flags & 4) {
          var rookFrom = to === 6 ? 7 : to === 2 ? 0 : to === 118 ? 119 : 112;
          var rookTo = to === 6 ? 5 : to === 2 ? 3 : to === 118 ? 117 : 115;
          var rook = R | (this.pieces[at] & 8);
          this.add(target, rook, rookFrom, -1); this.add(target, rook, rookTo, 1);
        }
      }
      if (target !== values) values.set(target);
      this.valid[at] = 1;
    }
    return this.values[this.ply];
  };
  MitchellAccumulator.prototype.whiteCorrection = function () {
    var values = this.ensure(), w = this.weights, h = w.hidden, output = (768 + 1) * h, total = 0;
    if (MNN_CONFIG.wasm && MNN_KERNEL) { MNN_SCRATCH.set(values); total = MNN_KERNEL.score(h); }
    else for (var k = 0; k < h; k++) {
      var white = Math.max(0, Math.min(w.clip, values[k])), black = Math.max(0, Math.min(w.clip, values[h + k]));
      total += (white - black) * w.data[output + k];
    }
    // Symmetric rounding preserves colour antisymmetry, including exact ties.
    var score = Math.sign(total) * Math.round(Math.abs(total) / w.divisor);
    return Math.max(-w.limit, Math.min(w.limit, score)) || 0;
  };
  function mnnEvaluate(pos) {
    var base = evaluate(pos, 'full'), accumulator = pos.mnn || (pos.mnn = new MitchellAccumulator(pos));
    if (accumulator.count[accumulator.ply] <= 4) return base;
    return base + (pos.side ? -1 : 1) * accumulator.whiteCorrection();
  }
