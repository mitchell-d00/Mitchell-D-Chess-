// MIT. C++ port of this repository's Mitchell engine; see LICENSE for original
// copyright. Neural weights are supplied separately with Thomas Jahn's MIT
// attribution. Freestanding: no linked chess engine, C/C++ runtime, account or
// network service.
#include <wasm_simd128.h>
using i8 = signed char;
using u8 = unsigned char;
using i16 = short;
using u16 = unsigned short;
using i32 = int;
using u32 = unsigned int;
using u64 = unsigned long long;
using i64 = long long;
extern "C" void *memcpy(void *d, const void *s, u32 n) {
  u8 *a = (u8 *)d;
  const u8 *b = (const u8 *)s;
  u32 i = 0;
  for (; n - i >= 16; i += 16)
    wasm_v128_store(a + i, wasm_v128_load(b + i));
  for (; i < n; i++)
    ((volatile u8 *)a)[i] = b[i];
  return d;
}
extern "C" void *memset(void *d, int v, u32 n) {
  u8 *a = (u8 *)d;
  u32 i = 0;
  v128_t fill = wasm_i8x16_splat((i8)v);
  for (; n - i >= 16; i += 16)
    wasm_v128_store(a + i, fill);
  for (; i < n; i++)
    ((volatile u8 *)a)[i] = (u8)v;
  return d;
}
extern "C" __attribute__((import_module("env"), import_name("clock"))) double
clock_ms();
#define API(name) extern "C" __attribute__((export_name(name)))
static constexpr int P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BLACK = 8,
                     WHITE = 0, MATE = 100000, INF = 1000000, MAXPLY = 96;
static inline int imin(int a, int b) { return a < b ? a : b; }
static inline int imax(int a, int b) { return a > b ? a : b; }
static inline int iabs(int a) { return a < 0 ? -a : a; }
#include "tables.inc"
static constexpr int ND[8] = {-33, -31, -18, -14, 14, 18, 31, 33},
                     BD[4] = {-17, -15, 15, 17}, RD[4] = {-16, -1, 1, 16},
                     KD[8] = {-17, -16, -15, -1, 1, 15, 16, 17};
static inline int mv(int f, int t, int pr, int fl) {
  return f | (t << 7) | (pr << 14) | (fl << 17);
}
static inline int mfrom(int m) { return m & 127; }
static inline int mto(int m) { return (m >> 7) & 127; }
static inline int flags(int m) { return (m >> 17) & 15; }
static inline int promo(int m) { return (m >> 14) & 7; }
struct Moves {
  int data[256];
  int length;
  Moves() : length(0) {}
  void push(int a) {
    if (length < 256)
      data[length++] = a;
  }
  void push(int a, int b, int c, int d) {
    push(a);
    push(b);
    push(c);
    push(d);
  }
  int &operator[](int i) { return data[i]; }
  int indexOf(int m) const {
    for (int i = 0; i < length; i++)
      if (data[i] == m)
        return i;
    return -1;
  }
  void remove(int at) {
    for (int i = at + 1; i < length; i++)
      data[i - 1] = data[i];
    length--;
  }
};
static u64 hashSeed = 0x2545F4919E3779B9ULL, Z[2048], ZS, ZC[16], ZE[8];
static int CR[128];
static u64 nextHash() {
  hashSeed += 0x9E3779B97F4A7C15ULL;
  u64 z = hashSeed;
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
  return z ^ (z >> 31);
}
static i16 weights[197440];
static int hidden = 128;
static u8 kpk[24576];
struct Position {
  i8 storage[256];
  i8 *b;
  int kingSq[2], side, castle, ep, half, full, ply;
  u64 hash, histHash[2049];
  int um[2048], uc[2048], ue[2048], uh[2048], cap[2048];
  bool nnue;
  int np;
  u8 valid[256];
  int am[256], ap[256], an[256], ac[256], as[256], count[256];
  i16 av[256][512];
  void initBoard() {
    b = storage + 64;
    memset(storage, 0, sizeof(storage));
    nnue = false;
    np = 0;
    ply = 0;
    kingSq[0] = kingSq[1] = 0;
  }
  bool load(const char *text) {
    initBoard();
    int rank = 7, file = 0, at = 0;
    while (text[at] && text[at] != ' ') {
      char ch = text[at++];
      if (ch == '/') {
        if (file != 8 || rank == 0)
          return false;
        rank--;
        file = 0;
        continue;
      }
      if (ch >= '1' && ch <= '8') {
        file += ch - '0';
        if (file > 8)
          return false;
        continue;
      }
      int colour = ch >= 'a' && ch <= 'z' ? BLACK : 0;
      char lower = colour ? ch : ch + 32;
      const char *chars = " pnbrqk";
      int ty = 0;
      for (int t = 1; t <= 6; t++)
        if (chars[t] == lower)
          ty = t;
      if (!ty || file >= 8 || rank < 0)
        return false;
      int sq = (rank << 4) | file++;
      b[sq] = ty | colour;
      if (ty == K)
        kingSq[colour >> 3] = sq;
    }
    if (rank || file != 8 || text[at++] != ' ')
      return false;
    side = text[at] == 'b' ? BLACK : 0;
    while (text[at] && text[at] != ' ')
      at++;
    if (text[at])
      at++;
    castle = 0;
    while (text[at] && text[at] != ' ') {
      char ch = text[at++];
      if (ch == 'K')
        castle |= 1;
      if (ch == 'Q')
        castle |= 2;
      if (ch == 'k')
        castle |= 4;
      if (ch == 'q')
        castle |= 8;
    }
    if (text[at])
      at++;
    ep = -1;
    if (text[at] && text[at] != '-')
      ep = (text[at] - 'a') + ((text[at + 1] - '1') << 4);
    while (text[at] && text[at] != ' ')
      at++;
    if (text[at])
      at++;
    half = 0;
    while (text[at] >= '0' && text[at] <= '9')
      half = half * 10 + text[at++] - '0';
    if (text[at])
      at++;
    full = 0;
    while (text[at] >= '0' && text[at] <= '9')
      full = full * 10 + text[at++] - '0';
    if (full < 1)
      full = 1;
    computeHash();
    histHash[0] = hash;
    return true;
  }
  void computeHash() {
    hash = ZC[castle];
    for (int s = 0; s < 128; s++) {
      if (s & 0x88) {
        s += 7;
        continue;
      }
      if (b[s])
        hash ^= Z[(int)b[s] * 128 + s];
    }
    if (side)
      hash ^= ZS;
    if (ep >= 0)
      hash ^= ZE[ep & 7];
  }
  bool attacked(int sq, int by) const {
    int s;
    if (!by) {
      s = sq - 15;
      if (!(s & 0x88) && b[s] == P)
        return true;
      s = sq - 17;
      if (!(s & 0x88) && b[s] == P)
        return true;
    } else {
      s = sq + 15;
      if (!(s & 0x88) && b[s] == (P | BLACK))
        return true;
      s = sq + 17;
      if (!(s & 0x88) && b[s] == (P | BLACK))
        return true;
    }
    for (int i = 0; i < 8; i++) {
      s = sq + ND[i];
      if (!(s & 0x88) && b[s] == (N | by))
        return true;
      s = sq + KD[i];
      if (!(s & 0x88) && b[s] == (K | by))
        return true;
    }
    for (int i = 0; i < 4; i++) {
      s = sq + BD[i];
      while (!(s & 0x88)) {
        int p = b[s];
        if (p) {
          if (p == (B | by) || p == (Q | by))
            return true;
          break;
        }
        s += BD[i];
      }
      s = sq + RD[i];
      while (!(s & 0x88)) {
        int p = b[s];
        if (p) {
          if (p == (R | by) || p == (Q | by))
            return true;
          break;
        }
        s += RD[i];
      }
    }
    return false;
  }
  bool inCheck() const { return attacked(kingSq[side >> 3], side ^ BLACK); }
  Moves gen(bool captures = false) const {
    Moves out;
    int us = side, them = us ^ BLACK, fwd = us ? -16 : 16, start = us ? 6 : 1,
        last = us ? 0 : 7;
    for (int s = 0; s < 128; s++) {
      if (s & 0x88) {
        s += 7;
        continue;
      }
      int p = b[s];
      if (!p || (p & BLACK) != us)
        continue;
      int ty = p & 7, t;
      if (ty == P) {
        t = s + fwd;
        if (!(t & 0x88) && !b[t]) {
          if ((t >> 4) == last)
            out.push(mv(s, t, Q, 0), mv(s, t, N, 0), mv(s, t, R, 0),
                     mv(s, t, B, 0));
          else if (!captures) {
            out.push(mv(s, t, 0, 0));
            if ((s >> 4) == start && !b[t + fwd])
              out.push(mv(s, t + fwd, 0, 8));
          }
        }
        for (int i = -1; i <= 1; i += 2) {
          t = s + fwd + i;
          if (t & 0x88)
            continue;
          if (b[t] && (b[t] & BLACK) == them) {
            if ((t >> 4) == last)
              out.push(mv(s, t, Q, 1), mv(s, t, N, 1), mv(s, t, R, 1),
                       mv(s, t, B, 1));
            else
              out.push(mv(s, t, 0, 1));
          } else if (t == ep)
            out.push(mv(s, t, 0, 3));
        }
      } else if (ty == N || ty == K) {
        const int *dirs = ty == N ? ND : KD;
        for (int i = 0; i < 8; i++) {
          t = s + dirs[i];
          if (t & 0x88)
            continue;
          if (!b[t]) {
            if (!captures)
              out.push(mv(s, t, 0, 0));
          } else if ((b[t] & BLACK) == them)
            out.push(mv(s, t, 0, 1));
        }
      } else {
        const int *dirs = ty == B ? BD : ty == R ? RD : KD;
        int n = ty == Q ? 8 : 4;
        for (int i = 0; i < n; i++) {
          t = s + dirs[i];
          while (!(t & 0x88)) {
            if (!b[t]) {
              if (!captures)
                out.push(mv(s, t, 0, 0));
            } else {
              if ((b[t] & BLACK) == them)
                out.push(mv(s, t, 0, 1));
              break;
            }
            t += dirs[i];
          }
        }
      }
    }
    if (!captures) {
      if (!us) {
        if ((castle & 1) && !b[5] && !b[6] && b[7] == R &&
            !attacked(4, BLACK) && !attacked(5, BLACK) && !attacked(6, BLACK))
          out.push(mv(4, 6, 0, 4));
        if ((castle & 2) && !b[3] && !b[2] && !b[1] && b[0] == R &&
            !attacked(4, BLACK) && !attacked(3, BLACK) && !attacked(2, BLACK))
          out.push(mv(4, 2, 0, 4));
      } else {
        if ((castle & 4) && !b[117] && !b[118] && b[119] == (R | BLACK) &&
            !attacked(116, 0) && !attacked(117, 0) && !attacked(118, 0))
          out.push(mv(116, 118, 0, 4));
        if ((castle & 8) && !b[115] && !b[114] && !b[113] &&
            b[112] == (R | BLACK) && !attacked(116, 0) && !attacked(115, 0) &&
            !attacked(114, 0))
          out.push(mv(116, 114, 0, 4));
      }
    }
    return out;
  }
  void addFeature(i16 *a, int piece, int sq, int sign) {
    if (!piece)
      return;
    int h = hidden, s = (sq >> 4) * 8 + (sq & 7), ty = (piece & 7) - 1,
        c = piece & 8 ? 1 : 0, w = (c * 384 + ty * 64 + s) * h,
        z = ((1 - c) * 384 + ty * 64 + (s ^ 56)) * h;
    for (int i = 0; i < h; i++) {
      a[i] = (i16)(a[i] + sign * weights[w + i]);
      a[h + i] = (i16)(a[h + i] + sign * weights[z + i]);
    }
  }
  void initNeural() {
    nnue = true;
    np = 0;
    valid[0] = 1;
    count[0] = 0;
    for (int i = 0; i < hidden; i++)
      av[0][i] = av[0][i + hidden] = weights[768 * hidden + i];
    for (int s = 0; s < 128; s++) {
      if (s & 0x88) {
        s += 7;
        continue;
      }
      if (b[s]) {
        addFeature(av[0], b[s], s, 1);
        count[0]++;
      }
    }
  }
  void accPush(int m, int p, int next, int c, int cs) {
    int d = ++np;
    if (d >= 256)
      __builtin_trap();
    valid[d] = 0;
    am[d] = m;
    ap[d] = p;
    an[d] = next;
    ac[d] = c;
    as[d] = cs;
    count[d] = count[d - 1] - (c ? 1 : 0);
  }
  static int featureOffset(int piece, int sq, int perspective) {
    int s = (sq >> 4) * 8 + (sq & 7), ty = (piece & 7) - 1,
        c = (piece & BLACK) ? 1 : 0;
    return ((c ^ perspective) * 384 + ty * 64 +
            (s ^ (perspective ? 56 : 0))) * hidden;
  }
  template <bool Capture, bool Castle> void updateAccumulator(int d) {
    int m = am[d], f = mfrom(m), t = mto(m), h = hidden;
    for (int side = 0; side < 2; side++) {
      const i16 *remove = weights + featureOffset(ap[d], f, side),
                *add = weights + featureOffset(an[d], t, side);
      const i16 *captured = nullptr, *rookFrom = nullptr, *rookTo = nullptr;
      if constexpr (Capture)
        captured = weights + featureOffset(ac[d], as[d], side);
      if constexpr (Castle) {
        int rf = t == 6 ? 7 : t == 2 ? 0 : t == 118 ? 119 : 112,
            rt = t == 6 ? 5 : t == 2 ? 3 : t == 118 ? 117 : 115,
            rook = R | (ap[d] & BLACK);
        rookFrom = weights + featureOffset(rook, rf, side);
        rookTo = weights + featureOffset(rook, rt, side);
      }
      const i16 *source = av[d - 1] + side * h;
      i16 *target = av[d] + side * h;
      // All accepted hidden widths are multiples of eight. Wrapping i16 SIMD
      // addition matches the original typed accumulator exactly, including
      // capture, en passant, promotion and castling feature removal.
      for (int i = 0; i < h; i += 8) {
        v128_t v = wasm_i16x8_sub(wasm_v128_load(source + i),
                                 wasm_v128_load(remove + i));
        v = wasm_i16x8_add(v, wasm_v128_load(add + i));
        if constexpr (Capture)
          v = wasm_i16x8_sub(v, wasm_v128_load(captured + i));
        if constexpr (Castle) {
          v = wasm_i16x8_sub(v, wasm_v128_load(rookFrom + i));
          v = wasm_i16x8_add(v, wasm_v128_load(rookTo + i));
        }
        wasm_v128_store(target + i, v);
      }
    }
  }
  i16 *ensure() {
    int first = np;
    while (!valid[first])
      first--;
    for (int d = first + 1; d <= np; d++) {
      int m = am[d];
      if (!m)
        memcpy(av[d], av[d - 1], hidden * 2 * sizeof(i16));
      else if (flags(m) & 4)
        updateAccumulator<false, true>(d);
      else if (ac[d])
        updateAccumulator<true, false>(d);
      else
        updateAccumulator<false, false>(d);
      valid[d] = 1;
    }
    return av[np];
  }
  int rawScore() {
    i16 *a = ensure();
    int h = hidden, us = side ? h : 0, them = side ? 0 : h, off = 769 * h;
    u32 sum = 0;
    for (int i = 0; i < h; i++) {
      int x = imax(0, imin(255, a[us + i])),
          y = imax(0, imin(255, a[them + i]));
      sum += (u32)(x * x * weights[off + i]);
      sum += (u32)(y * y * weights[off + h + i]);
    }
    return (int)(((i64)((i32)sum / 255 + weights[771 * h]) * 400) / 16320);
  }
  void make(int m) {
    if (ply >= 2047)
      __builtin_trap();
    int f = mfrom(m), t = mto(m), pr = promo(m), fl = flags(m), p = b[f],
        us = side, cs = (fl & 2) ? (us ? t + 16 : t - 16) : t, c = b[cs];
    um[ply] = m;
    uc[ply] = castle;
    ue[ply] = ep;
    uh[ply] = half;
    cap[ply] = c;
    ply++;
    if (c) {
      hash ^= Z[c * 128 + cs];
      b[cs] = 0;
    }
    hash ^= Z[p * 128 + f];
    b[f] = 0;
    int next = pr ? (pr | us) : p;
    b[t] = next;
    hash ^= Z[next * 128 + t];
    if ((p & 7) == K)
      kingSq[us >> 3] = t;
    if (fl & 4) {
      int rf = t == 6     ? 7
               : t == 2   ? 0
               : t == 118 ? 119
                          : 112,
          rt = t == 6     ? 5
               : t == 2   ? 3
               : t == 118 ? 117
                          : 115,
          rp = b[rf];
      b[rf] = 0;
      b[rt] = rp;
      hash ^= Z[rp * 128 + rf] ^ Z[rp * 128 + rt];
    }
    hash ^= ZC[castle];
    castle &= CR[f] & CR[t];
    hash ^= ZC[castle];
    if (ep >= 0)
      hash ^= ZE[ep & 7];
    ep = -1;
    if (fl & 8) {
      ep = (f + t) >> 1;
      hash ^= ZE[ep & 7];
    }
    half = ((p & 7) == P || c) ? 0 : half + 1;
    if (us)
      full++;
    side ^= BLACK;
    hash ^= ZS;
    histHash[ply] = hash;
    if (nnue)
      accPush(m, p, next, c, cs);
  }
  void unmake() {
    if (nnue) {
      if (np)
        np--;
      else
        nnue = false;
    }
    int n = --ply, m = um[n], f = mfrom(m), t = mto(m), pr = promo(m),
        fl = flags(m);
    side ^= BLACK;
    int us = side, p = pr ? (P | us) : b[t];
    b[f] = p;
    b[t] = 0;
    if (fl & 2)
      b[us ? t + 16 : t - 16] = cap[n];
    else
      b[t] = cap[n];
    if ((p & 7) == K)
      kingSq[us >> 3] = f;
    if (fl & 4) {
      int rf = t == 6     ? 7
               : t == 2   ? 0
               : t == 118 ? 119
                          : 112,
          rt = t == 6     ? 5
               : t == 2   ? 3
               : t == 118 ? 117
                          : 115;
      b[rf] = b[rt];
      b[rt] = 0;
    }
    castle = uc[n];
    ep = ue[n];
    half = uh[n];
    if (us)
      full--;
    hash = histHash[ply];
  }
  void makeNull() {
    int n = ply;
    um[n] = 0;
    uc[n] = castle;
    ue[n] = ep;
    uh[n] = half;
    cap[n] = 0;
    ply++;
    hash ^= ZS;
    if (ep >= 0)
      hash ^= ZE[ep & 7];
    ep = -1;
    side ^= BLACK;
    half++;
    histHash[ply] = hash;
    if (nnue)
      accPush(0, 0, 0, 0, 0);
  }
  void unmakeNull() {
    if (nnue) {
      if (np)
        np--;
      else
        nnue = false;
    }
    int n = --ply;
    castle = uc[n];
    ep = ue[n];
    half = uh[n];
    side ^= BLACK;
    hash = histHash[ply];
  }
  Moves legal() {
    Moves ms = gen(), out;
    int us = side;
    for (int i = 0; i < ms.length; i++) {
      make(ms[i]);
      if (!attacked(kingSq[us >> 3], us ^ BLACK))
        out.push(ms[i]);
      unmake();
    }
    return out;
  }
  int least(i8 *bb, int sq, int side) {
    int s, best = -1, bestV = 99;
    if (!side) {
      s = sq - 15;
      if (!(s & 0x88) && bb[s] == P)
        return s;
      s = sq - 17;
      if (!(s & 0x88) && bb[s] == P)
        return s;
    } else {
      s = sq + 15;
      if (!(s & 0x88) && bb[s] == (P | BLACK))
        return s;
      s = sq + 17;
      if (!(s & 0x88) && bb[s] == (P | BLACK))
        return s;
    }
    for (int i = 0; i < 8; i++) {
      s = sq + ND[i];
      if (!(s & 0x88) && bb[s] == (N | side))
        return s;
    }
    for (int i = 0; i < 4; i++) {
      s = sq + BD[i];
      while (!(s & 0x88)) {
        int p = bb[s];
        if (p) {
          if ((p & BLACK) == side && ((p & 7) == B || (p & 7) == Q)) {
            int v = (p & 7) == B ? 3 : 5;
            if (v < bestV) {
              bestV = v;
              best = s;
            }
          }
          break;
        }
        s += BD[i];
      }
      s = sq + RD[i];
      while (!(s & 0x88)) {
        int p = bb[s];
        if (p) {
          if ((p & BLACK) == side && ((p & 7) == R || (p & 7) == Q)) {
            int v = (p & 7) == R ? 4 : 5;
            if (v < bestV) {
              bestV = v;
              best = s;
            }
          }
          break;
        }
        s += RD[i];
      }
    }
    if (best >= 0)
      return best;
    for (int i = 0; i < 8; i++) {
      s = sq + KD[i];
      if (!(s & 0x88) && bb[s] == (K | side))
        return s;
    }
    return -1;
  }
  int see(int m) {
    i8 scratch[256] = {0};
    i8 *bb = scratch + 64;
    for (int i = 0; i < 128; i++)
      bb[i] = b[i];
    int from = mfrom(m), to = mto(m), fl = flags(m), pr = promo(m), gain[64],
        d = 0, by = b[from] & BLACK, target = (fl & 2) ? P : b[to] & 7;
    gain[0] = target ? SEEVAL[target] : 0;
    int attacker = b[from] & 7;
    if (pr) {
      gain[0] += SEEVAL[pr] - SEEVAL[P];
      attacker = pr;
    }
    bb[from] = 0;
    if (fl & 2)
      bb[by ? to + 16 : to - 16] = 0;
    by ^= BLACK;
    while (true) {
      int s = least(bb, to, by);
      if (s < 0)
        break;
      d++;
      gain[d] = SEEVAL[attacker] - gain[d - 1];
      attacker = bb[s] & 7;
      if (attacker == K && least(bb, to, by ^ BLACK) >= 0) {
        d--;
        break;
      }
      bb[s] = 0;
      by ^= BLACK;
    }
    while (d > 0) {
      gain[d - 1] = -imax(-gain[d - 1], gain[d]);
      d--;
    }
    return gain[0];
  }
};
static void initSearchMemory(int bits);
static Position pos;
static char input[8192], fenOut[512];
static int outMoves[256], outState[8];
static u64 perftAt(int d) {
  if (!d)
    return 1;
  Moves ms = pos.legal();
  u64 nodes = 0;
  for (int i = 0; i < ms.length; i++) {
    pos.make(ms[i]);
    nodes += perftAt(d - 1);
    pos.unmake();
  }
  return nodes;
}
static void intText(char *out, int &n, int value) {
  char t[16];
  int i = 0;
  do {
    t[i++] = '0' + value % 10;
    value /= 10;
  } while (value);
  while (i)
    out[n++] = t[--i];
}
API("init") void core_init() {
  hashSeed = 0x2545F4919E3779B9ULL;
  for (auto &x : Z)
    x = nextHash();
  ZS = nextHash();
  for (auto &x : ZC)
    x = nextHash();
  for (auto &x : ZE)
    x = nextHash();
  for (auto &x : CR)
    x = 15;
  CR[0] = 13;
  CR[7] = 14;
  CR[4] = 12;
  CR[112] = 7;
  CR[119] = 11;
  CR[116] = 3;
  pos.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  initSearchMemory(19);
}
API("input_ptr") int input_ptr() { return (int)input; }
API("model_ptr") int model_ptr() { return (int)weights; }
API("kpk_ptr") int kpk_ptr() { return (int)kpk; }
API("set_hidden") int set_hidden(int h) {
  if (h < 16 || h > 256 || h % 8)
    return 0;
  hidden = h;
  pos.nnue = false;
  return 1;
}
API("load") int load_position() { return pos.load(input); }
API("legal") int legal_moves() {
  Moves m = pos.legal();
  for (int i = 0; i < m.length; i++)
    outMoves[i] = m[i];
  return m.length;
}
API("moves_ptr") int moves_ptr() { return (int)outMoves; }
API("play") int play(int m) {
  Moves legal = pos.legal();
  if (legal.indexOf(m) < 0)
    return 0;
  pos.make(m);
  return 1;
}
API("unplay") int unplay() {
  if (!pos.ply)
    return 0;
  pos.unmake();
  return 1;
}
API("null_move") void null_move() { pos.makeNull(); }
API("unnull") void unnull() {
  if (pos.ply)
    pos.unmakeNull();
}
API("perft") u64 perft(int depth) {
  return depth < 0 || depth > 7 ? 0 : perftAt(depth);
}
API("hash_lo") int hash_lo() { return (i32)pos.hash; }
API("hash_hi") int hash_hi() { return (i32)(pos.hash >> 32); }
API("state_ptr") int state_ptr() {
  outState[0] = pos.side;
  outState[1] = pos.castle;
  outState[2] = pos.ep;
  outState[3] = pos.half;
  outState[4] = pos.full;
  outState[5] = pos.kingSq[0];
  outState[6] = pos.kingSq[1];
  outState[7] = pos.ply;
  return (int)outState;
}
API("raw_score") int raw_score() {
  if (!pos.nnue)
    pos.initNeural();
  return pos.rawScore();
}
API("see") int see_move(int m) { return pos.see(m); }
API("fen_ptr") int fen_ptr() {
  int n = 0;
  const char *chars = " pnbrqk";
  for (int r = 7; r >= 0; r--) {
    int empty = 0;
    for (int f = 0; f < 8; f++) {
      int p = pos.b[(r << 4) | f];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        fenOut[n++] = '0' + empty;
        empty = 0;
      }
      char c = chars[p & 7];
      fenOut[n++] = (p & BLACK) ? c : c - 32;
    }
    if (empty)
      fenOut[n++] = '0' + empty;
    if (r)
      fenOut[n++] = '/';
  }
  fenOut[n++] = ' ';
  fenOut[n++] = pos.side ? 'b' : 'w';
  fenOut[n++] = ' ';
  int before = n;
  if (pos.castle & 1)
    fenOut[n++] = 'K';
  if (pos.castle & 2)
    fenOut[n++] = 'Q';
  if (pos.castle & 4)
    fenOut[n++] = 'k';
  if (pos.castle & 8)
    fenOut[n++] = 'q';
  if (n == before)
    fenOut[n++] = '-';
  fenOut[n++] = ' ';
  if (pos.ep < 0)
    fenOut[n++] = '-';
  else {
    fenOut[n++] = 'a' + (pos.ep & 7);
    fenOut[n++] = '1' + (pos.ep >> 4);
  }
  fenOut[n++] = ' ';
  intText(fenOut, n, pos.half);
  fenOut[n++] = ' ';
  intText(fenOut, n, pos.full);
  fenOut[n] = 0;
  return (int)fenOut;
}

template <int Size> struct Ints {
  int data[Size];
  int &operator[](int i) { return data[i]; }
  int *fill(int v) {
    for (int i = 0; i < Size; i++)
      data[i] = v;
    return data;
  }
};
static Ints<128> ZONE, PAW, PAB;
static Ints<8> EW, EB, EMinW, EMaxB, EMaxW, EMinB;
static Moves EPieces;
static constexpr int ATK_W[7] = {0, 0, 2, 2, 3, 5, 0},
                     MOB_MG[7] = {0, 0, 4, 4, 2, 1, 0},
                     MOB_EG[7] = {0, 0, 4, 5, 4, 2, 0},
                     MOB_BASE[7] = {0, 0, 4, 6, 6, 12, 0};
static constexpr struct {
  int safeMobility, pawnThreat, backward, connectedRooks, bishopPawn,
      kingPasser;
} EVAL_WEIGHTS = {3, 18, 9, 12, 3, 4};
struct KPKResult {
  bool win;
  int owner;
};
static KPKResult kpkResult;
static KPKResult *probeKPK(Position &pos) {
  int pawn = -1, owner = 0;
  for (int s = 0; s < 128; s++) {
    if (s & 0x88) {
      s += 7;
      continue;
    }
    if (!pos.b[s] || (pos.b[s] & 7) == K)
      continue;
    if ((pos.b[s] & 7) != P || pawn >= 0)
      return nullptr;
    pawn = s;
    owner = pos.b[s] & BLACK;
  }
  if (pawn < 0)
    return nullptr;
  int wk = pos.kingSq[owner >> 3], bk = pos.kingSq[(owner ^ BLACK) >> 3],
      ps = (pawn >> 4) * 8 + (pawn & 7), ws = (wk >> 4) * 8 + (wk & 7),
      bs = (bk >> 4) * 8 + (bk & 7);
  if (owner) {
    ps ^= 56;
    ws ^= 56;
    bs ^= 56;
  }
  if ((ps & 7) > 3) {
    ps ^= 7;
    ws ^= 7;
    bs ^= 7;
  }
  if ((ps >> 3) < 1 || (ps >> 3) > 6)
    return nullptr;
  int index = ((((ps & 7) * 6 + (ps >> 3) - 1) * 64 + ws) * 64 + bs) * 2 +
              (pos.side == owner ? 0 : 1);
  kpkResult = {!!(kpk[index >> 3] & (1 << (index & 7))), owner};
  return &kpkResult;
}
static int evaluate(Position &pos, int mode);
static int neuralEvaluate(Position &pos) {
  if (!pos.nnue)
    pos.initNeural();
  if (pos.count[pos.np] <= 4)
    return evaluate(pos, 2);
  return pos.rawScore();
}
#include "evaluation.inc"
API("evaluate") int eval_position(int mode) { return evaluate(pos, mode); }
static int TT_SIZE=1<<19,TT_MASK=(1<<19)-1;
static u32 *ttLo,*ttHi;static i32 *ttMove,*ttScore;static i8 *ttDepth,*ttFlag;
extern "C" u8 __heap_base;
static int contextMode = -1, contextSide = -1, contextQ = -1,
           contextContempt = -1;
static void clearTT() {
  memset(ttDepth, 255, TT_SIZE);
  memset(ttFlag, 255, TT_SIZE);
}
// Hash storage uses the heap area explicitly; no C/C++ allocator is linked.
static void initSearchMemory(int bits){
 TT_SIZE=1<<bits;TT_MASK=TT_SIZE-1;
 u32 base=((u32)&__heap_base+63)&~63U,required=base+(u32)TT_SIZE*18;
 u32 current=__builtin_wasm_memory_size(0)*65536U;
 if(required>current){u32 target=64U*1024*1024;if(required>target)__builtin_trap();if(__builtin_wasm_memory_grow(0,(target-current)/65536U)==(u32)-1)__builtin_trap();}
 ttLo=(u32*)base;ttHi=ttLo+TT_SIZE;ttMove=(i32*)(ttHi+TT_SIZE);ttScore=ttMove+TT_SIZE;ttDepth=(i8*)(ttScore+TT_SIZE);ttFlag=ttDepth+TT_SIZE;
 clearTT();contextMode=-1;
}
API("set_memory") int set_memory(int bits){if(bits!=19&&bits!=21)return 0;initSearchMemory(bits);return 1;}
static bool EXACT_ENDGAMES=false;
static bool deadPosition(Position&p){int minors=0,bishops=0,colour=-1;for(int s=0;s<128;s++){if(s&0x88){s+=7;continue;}int ty=p.b[s]&7;if(!ty||ty==K)continue;if(ty==P||ty==R||ty==Q)return false;minors++;if(ty==B){int c=((s>>4)+(s&7))&1;if(colour<0)colour=c;else if(colour!=c)colour=2;bishops++;}}return minors<=1||(minors==bishops&&colour!=2);}
API("set_endgames") void set_endgames(int enabled){bool next=enabled!=0;if(EXACT_ENDGAMES!=next){EXACT_ENDGAMES=next;clearTT();contextMode=-1;}}
struct Searcher {
  Position *p;
  int mode;
  bool q, adv, useNull, aborted;
  int rootSide, contempt, seldepth, rootDepth, rootBest, rootScore, timeMs;
  double deadline;
  u64 nodes;
  int killers[MAXPLY + 2][2], hist[2048], counter[2048], evalStack[MAXPLY + 2];
  i16 contHist[2048][2048], capHist[2048 * 7];
  bool contValid[2048];
  u32 ecLo[32768], ecHi[32768];
  int ecValue[32768], ecFull[32768];
  void reset(int evalMode, bool advanced, bool quiescence, bool nullMove,
             int drawContempt, int milliseconds) {
    p = &pos;
    mode = evalMode;
    adv = advanced;
    q = quiescence;
    useNull = nullMove;
    contempt = drawContempt;
    rootSide = pos.side;
    nodes = 0;
    seldepth = 0;
    rootDepth = 0;
    rootBest = 0;
    rootScore = 0;
    aborted = false;
    timeMs = milliseconds;
    deadline = milliseconds > 0 ? clock_ms() + milliseconds : 1e300;
    memset(killers, 0, sizeof(killers));
    memset(hist, 0, sizeof(hist));
    memset(counter, 0, sizeof(counter));
    memset(evalStack, 0, sizeof(evalStack));
    memset(contValid, 0, sizeof(contValid));
    memset(capHist, 0, sizeof(capHist));
    memset(ecLo, 0, sizeof(ecLo));
    memset(ecHi, 0, sizeof(ecHi));
    memset(ecValue, 0, sizeof(ecValue));
    memset(ecFull, 0, sizeof(ecFull));
    if (mode == 3) {
      if (!p->nnue)
        p->initNeural();
    } else
      p->nnue = false;
    if (contextMode != mode || contextSide != rootSide || contextQ != (int)q ||
        contextContempt != contempt) {
      clearTT();
      contextMode = mode;
      contextSide = rootSide;
      contextQ = q;
      contextContempt = contempt;
    }
  }
  int eval() {
    u32 lo = (u32)p->hash, hi = (u32)(p->hash >> 32), h = lo & 32767;
    if (ecFull[h] == p->full && ecLo[h] == lo && ecHi[h] == hi)
      return ecValue[h];
    int v = ::evaluate(*p, mode);
    ecLo[h] = lo;
    ecHi[h] = hi;
    ecFull[h] = p->full;
    ecValue[h] = v;
    return v;
  }
  Moves order(Moves ms, int ttm, int ply, int prevKey) {
    int sc[256], *k = killers[ply], cm = prevKey ? counter[prevKey] : 0;
    auto *b = p->b;
    for (int i = 0; i < ms.length; i++) {
      int m = ms[i], fl = flags(m), pr = promo(m), v;
      if (m == ttm)
        v = 100000000;
      else if (fl & 1) {
        int victim = (fl & 2) ? P : b[mto(m)] & 7, att = b[mfrom(m)] & 7,
            mvv = VAL[victim] * 10 - VAL[att] / 10;
        if (!adv || VAL[victim] >= VAL[att])
          v = 50000000 + mvv;
        else
          v = p->see(m) >= 0 ? 50000000 + mvv : -50000000 + mvv;
        if (pr)
          v += VAL[pr];
        v += capHist[(b[mfrom(m)] * 128 + mto(m)) * 7 + victim];
      } else if (pr)
        v = pr == Q ? 45000000 : -60000000;
      else if (m == k[0])
        v = 40000000;
      else if (m == k[1])
        v = 39000000;
      else if (m == cm)
        v = 38000000;
      else {
        int hk = b[mfrom(m)] * 128 + mto(m);
        v = hist[hk] + (contValid[prevKey] ? contHist[prevKey][hk] : 0);
      }
      sc[i] = v;
    }
    for (int i = 1; i < ms.length; i++) {
      int move = ms[i], score = sc[i], j = i - 1;
      while (j >= 0 && sc[j] < score) {
        ms[j + 1] = ms[j];
        sc[j + 1] = sc[j];
        j--;
      }
      ms[j + 1] = move;
      sc[j + 1] = score;
    }
    return ms;
  }
  bool checkTime() {
    nodes++;
    if ((nodes & (timeMs > 0 && timeMs < 100 ? 127 : 1023)) == 0 &&
        clock_ms() >= deadline)
      aborted = true;
    return aborted;
  }
  bool isDraw() {
    if (p->half >= 100)
      return true;
    for (int i = p->ply - 2; i >= 0 && i >= p->ply - p->half; i -= 2)
      if (p->histHash[i] == p->hash)
        return true;
    return false;
  }
  int drawScore() { return p->side == rootSide ? -contempt : contempt; }
  void histUpdate(int key, int bonus) {
    int h = hist[key];
    hist[key] = h + bonus - (h * iabs(bonus) / 16384);
  }
  int qs(int alpha, int beta, int ply, int qd) {
    if (checkTime())
      return 0;
    if (ply > seldepth)
      seldepth = ply;
    int us = p->side;
    bool inCheck = p->inCheck();
    if(EXACT_ENDGAMES&&mode==3&&p->count[p->np]<=4){
      if(deadPosition(*p))return 0;
      if(!p->legal().length)return inCheck?-MATE+ply:0;
    }
    if (isDraw() && (!inCheck || p->legal().length))
      return drawScore();
    int stand = inCheck ? -INF : eval();
    if (ply >= MAXPLY)
      return inCheck && !p->legal().length ? -MATE + ply : eval();
    if (!inCheck) {
      if (stand >= beta)
        return stand;
      if (stand > alpha)
        alpha = stand;
      if (qd > 12)
        return stand;
    }
    Moves ms = order(p->gen(!inCheck), 0, ply, 0);
    int legal = 0;
    for (int i = 0; i < ms.length; i++) {
      int m = ms[i], fl = flags(m), pr = promo(m);
      if (!inCheck && !(fl & 2) && !pr) {
        int vic = VAL[p->b[mto(m)] & 7];
        if (stand + vic + 200 < alpha)
          continue;
        if (adv && VAL[p->b[mfrom(m)] & 7] > vic && p->see(m) < 0)
          continue;
      }
      p->make(m);
      if (p->attacked(p->kingSq[us >> 3], us ^ BLACK)) {
        p->unmake();
        continue;
      }
      legal++;
      int sc = -qs(-beta, -alpha, ply + 1, qd + 1);
      p->unmake();
      if (aborted)
        return 0;
      if (sc >= beta)
        return sc;
      if (sc > alpha)
        alpha = sc;
    }
    return inCheck && !legal ? -MATE + ply : alpha;
  }
  bool hasPieces(int side) {
    for (int s = 0; s < 128; s++) {
      if (s & 0x88) {
        s += 7;
        continue;
      }
      int piece = p->b[s];
      if (piece && (piece & BLACK) == side && (piece & 7) != P &&
          (piece & 7) != K)
        return true;
    }
    return false;
  }
  int negamax(int depth, int alpha, int beta, int ply, bool allowNull,
              int prevKey, int excluded = 0) {
    if (checkTime())
      return 0;
    if (ply > 0 && isDraw() && (!p->inCheck() || p->legal().length))
      return drawScore();
    int us = p->side;
    bool inCheck = p->attacked(p->kingSq[us >> 3], us ^ BLACK);
    if (inCheck && ply < 2 * (rootDepth ? rootDepth : 8) + 6)
      depth++;
    if (depth <= 0)
      return q ? qs(alpha, beta, ply, 0) : eval();
    if (ply >= MAXPLY)
      return eval();
    if (ply > seldepth)
      seldepth = ply;
    int mAlpha = imax(alpha, -MATE + ply), mBeta = imin(beta, MATE - ply - 1);
    if (ply > 0 && mAlpha >= mBeta)
      return mAlpha;
    u32 lo = (u32)p->hash, hi = (u32)(p->hash >> 32), h = lo & TT_MASK;
    int ttm = 0, alpha0 = alpha;
    bool pv = beta - alpha > 1, hasGenerated = false;
    Moves generated;
    if (ttFlag[h] >= 0 && ttLo[h] == lo && ttHi[h] == hi) {
      ttm = ttMove[h];
      if (ttm) {
        generated = p->gen();
        hasGenerated = true;
        if (generated.indexOf(ttm) < 0)
          ttm = 0;
      }
      if (ttm && !excluded && ply > 0 && ttDepth[h] >= depth && !pv) {
        int ts = ttScore[h];
        if (ts > MATE - 1000)
          ts -= ply;
        else if (ts < -MATE + 1000)
          ts += ply;
        int tf = ttFlag[h];
        if (tf == 0)
          return ts;
        if (tf == 1 && ts >= beta)
          return ts;
        if (tf == 2 && ts <= alpha)
          return ts;
      }
    }
    int staticEval = inCheck ? -INF : eval();
    evalStack[ply] = staticEval;
    bool improving = !inCheck && ply >= 2 && staticEval > evalStack[ply - 2];
    if (!excluded && !pv && !inCheck && ply > 0) {
      if (adv) {
        if (depth <= 7 && iabs(beta) < MATE - 1000 &&
            staticEval - (85 * depth - (improving ? 45 : 0)) >= beta)
          return staticEval;
        if (depth <= 2 && staticEval + 260 * depth < alpha) {
          int rz = qs(alpha, beta, ply, 0);
          if (aborted)
            return 0;
          if (rz < alpha)
            return rz;
        }
      }
      if (useNull && allowNull && depth >= 3 && staticEval >= beta &&
          hasPieces(us)) {
        int reduction = 3 + (depth >= 7 ? 1 : 0) +
                        (adv ? imin(2, (staticEval - beta) / 220) : 0);
        p->makeNull();
        int ns = -negamax(depth - 1 - reduction, -beta, -beta + 1, ply + 1,
                          false, 0);
        p->unmakeNull();
        if (aborted)
          return 0;
        if (ns >= beta) {
          if (depth < 10)
            return ns >= MATE - 1000 ? beta : ns;
          int verify =
              negamax(depth - reduction, beta - 1, beta, ply, false, prevKey);
          if (aborted)
            return 0;
          if (verify >= beta)
            return verify;
        }
      }
    }
    if (!excluded && adv && !ttm && pv && depth >= 6) {
      negamax(depth - 3, alpha, beta, ply, true, prevKey);
      if (aborted)
        return 0;
      if (ttLo[h] == lo && ttHi[h] == hi) {
        if (!hasGenerated) {
          generated = p->gen();
          hasGenerated = true;
        }
        ttm = generated.indexOf(ttMove[h]) >= 0 ? ttMove[h] : 0;
      }
    }
    int singularMove = 0;
    if (!excluded && adv && ply > 0 && depth >= 7 && ttm && ttLo[h] == lo &&
        ttHi[h] == hi && ttDepth[h] >= depth - 3 && ttFlag[h] != 2 &&
        iabs(ttScore[h]) < MATE - 1000) {
      int singularBeta = ttScore[h] - depth * 2,
          alternatives = negamax((depth - 1) >> 1, singularBeta - 1,
                                 singularBeta, ply, false, prevKey, ttm);
      if (aborted)
        return 0;
      if (alternatives < singularBeta)
        singularMove = ttm;
    }
    if (!hasGenerated)
      generated = p->gen();
    bool staged = mode == 3 && ttm && !excluded;
    Moves ms;
    if (staged)
      ms.push(ttm);
    else
      ms = order(generated, ttm, ply, prevKey);
    int legal = 0, best = -INF, bestM = 0, *k = killers[ply];
    Moves quietsTried;
    auto *b = p->b;
    for (int i = 0; i < ms.length || staged; i++) {
      if (i == ms.length && staged) {
        staged = false;
        ms = order(generated, ttm, ply, prevKey);
        int hashIndex = ms.indexOf(ttm);
        if (hashIndex >= 0)
          ms.remove(hashIndex);
        i = 0;
        if (!ms.length)
          break;
      }
      int m = ms[i];
      if (m == excluded)
        continue;
      int fl = flags(m), pr = promo(m);
      bool quiet = !(fl & 1) && !pr;
      int to = mto(m), key = b[mfrom(m)] * 128 + to;
      if (!excluded && adv && !pv && ply > 0 && !inCheck && legal > 0 &&
          best > -MATE + 1000) {
        if (quiet && m != k[0] && m != k[1]) {
          if (depth <= 5 &&
              quietsTried.length >=
                  (improving ? 4 + depth * depth : 2 + (depth * depth >> 1)))
            continue;
          if (depth <= 4 && staticEval + 110 + 95 * depth <= alpha)
            continue;
          if (depth <= 3 && hist[key] < -3000 * depth)
            continue;
        } else if ((fl & 1) && !pv && depth <= 5 && m != ttm &&
                   p->see(m) < -90 * depth)
          continue;
      }
      p->make(m);
      if (p->attacked(p->kingSq[us >> 3], us ^ BLACK)) {
        p->unmake();
        continue;
      }
      legal++;
      bool givesCheck = p->attacked(p->kingSq[(us ^ BLACK) >> 3], us);
      int childKey = b[to] * 128 + to, sc,
          nextDepth = depth - 1 + (m == singularMove ? 1 : 0);
      if (legal == 1)
        sc = -negamax(nextDepth, -beta, -alpha, ply + 1, true, childKey);
      else {
        int red = 0;
        if (depth >= 3 && quiet && !inCheck && !givesCheck &&
            legal > (pv ? 3 : 2)) {
          if (adv) {
            red = LMR[imin(depth, 63)][imin(legal, 63)];
            if (pv)
              red--;
            if (m == k[0] || m == k[1])
              red--;
            if (!improving)
              red++;
            if (hist[key] > 4000)
              red--;
            if (red > depth - 2)
              red = depth - 2;
            if (red < 0)
              red = 0;
          } else
            red = legal > 8 && depth >= 5 ? 2 : 1;
        }
        sc = -negamax(nextDepth - red, -alpha - 1, -alpha, ply + 1, true,
                      childKey);
        if (!aborted && sc > alpha && red)
          sc = -negamax(nextDepth, -alpha - 1, -alpha, ply + 1, true, childKey);
        if (!aborted && sc > alpha && sc < beta)
          sc = -negamax(nextDepth, -beta, -alpha, ply + 1, true, childKey);
      }
      p->unmake();
      if (aborted)
        return 0;
      if (sc > best) {
        best = sc;
        bestM = m;
        if (sc > alpha) {
          alpha = sc;
          if (ply == 0) {
            rootBest = m;
            rootScore = sc;
          }
          if (alpha >= beta) {
            if (quiet) {
              if (k[0] != m) {
                k[1] = k[0];
                k[0] = m;
              }
              int bonus = imin(depth * depth * 8, 1600);
              histUpdate(key, bonus);
              for (int qi = 0; qi < quietsTried.length; qi++)
                histUpdate(quietsTried[qi], -bonus);
              if (prevKey) {
                counter[prevKey] = m;
                if (!contValid[prevKey]) {
                  memset(contHist[prevKey], 0, sizeof(contHist[prevKey]));
                  contValid[prevKey] = true;
                }
                i16 *ch = contHist[prevKey];
                ch[key] = (i16)(ch[key] + bonus - ch[key] * bonus / 16384);
                for (int cq = 0; cq < quietsTried.length; cq++) {
                  int ck = quietsTried[cq];
                  ch[ck] = (i16)(ch[ck] - bonus - ch[ck] * bonus / 16384);
                }
              }
            }
            if (fl & 1) {
              int cv = (fl & 2) ? P : b[to] & 7, ci = key * 7 + cv,
                  cb = imin(1200, depth * depth * 8);
              capHist[ci] = (i16)(capHist[ci] + cb - capHist[ci] * cb / 16384);
            }
            break;
          }
        }
      }
      if (quiet)
        quietsTried.push(key);
    }
    if (!legal && excluded)
      return -INF;
    if (!legal)
      return inCheck ? -MATE + ply : 0;
    int store = best;
    if (store > MATE - 1000)
      store += ply;
    else if (store < -MATE + 1000)
      store -= ply;
    if (!excluded && (ttLo[h] != lo || ttHi[h] != hi ||
                      depth >= ttDepth[h] - 2 || ttFlag[h] != 0)) {
      ttLo[h] = lo;
      ttHi[h] = hi;
      ttMove[h] = bestM;
      ttScore[h] = store;
      ttDepth[h] = (i8)depth;
      ttFlag[h] = best >= beta ? 1 : best <= alpha0 ? 2 : 0;
    }
    return best;
  }
};
static Searcher searcher;
static int resultMove = 0, resultScore = 0, resultDepth = 0;
static bool resultValid = false;
API("reset_tt") void reset_tt() {
  clearTT();
  contextMode = -1;
}
API("fixed")
int fixed(int depth, int mode, int adv, int q, int nullMove, int contempt) {
  searcher.reset(mode, adv, q, nullMove, contempt, 0);
  searcher.rootDepth = depth;
  int score = searcher.negamax(depth, -INF, INF, 0, false, 0);
  resultMove = searcher.rootBest;
  resultScore = score;
  resultDepth = depth;
  resultValid = true;
  return score;
}
API("quiescence") int quiescence(int mode, int adv, int alpha, int beta) {
  searcher.reset(mode, adv, true, true, 0, 0);
  return searcher.qs(alpha, beta, 0, 0);
}
API("iterate")
int iterate(int maxDepth, int milliseconds, int mode, int adv, int q,
            int contempt) {
  Moves legal = pos.legal();
  resultValid = false;
  resultMove = 0;
  resultScore = 0;
  resultDepth = 0;
  if (!legal.length)
    return 0;
  int best = legal[0], bestScore = 0, depthDone = 0, prev = 0, lastBest = 0,
      stability = 0;
  double start = clock_ms();
  searcher.reset(mode, adv, q, true, contempt, milliseconds);
  searcher.deadline = start + milliseconds;
  double t0 = clock_ms();
  for (int d = 1; d <= maxDepth; d++) {
    searcher.rootBest = 0;
    searcher.rootDepth = d;
    int v;
    if (adv && d >= 5 && iabs(prev) < MATE - 1000) {
      int w = 30, a = prev - w, beta = prev + w;
      while (true) {
        searcher.rootBest = 0;
        v = searcher.negamax(d, a, beta, 0, false, 0);
        if (searcher.aborted)
          break;
        if (v <= a) {
          a = imax(-INF, a - w * 3);
          w *= 3;
        } else if (v >= beta) {
          beta = imin(INF, beta + w * 3);
          w *= 3;
        } else
          break;
        if (w > 900) {
          a = -INF;
          beta = INF;
        }
      }
    } else
      v = searcher.negamax(d, -INF, INF, 0, false, 0);
    if (searcher.aborted)
      break;
    if (searcher.rootBest) {
      best = searcher.rootBest;
      bestScore = v;
      depthDone = d;
      prev = v;
    }
    if (iabs(bestScore) > MATE - 1000 && d >= 4)
      break;
    stability = best == lastBest ? stability + 1 : 0;
    lastBest = best;
    double soft = stability >= 3 ? .55 : .85;
    if (clock_ms() - t0 > milliseconds * soft)
      break;
  }
  if (legal.indexOf(best) < 0)
    return 0;
  resultMove = best;
  resultScore = bestScore;
  resultDepth = depthDone;
  resultValid = true;
  return best;
}
API("result_move") int result_move() { return resultMove; }
API("result_score") int result_score() { return resultScore; }
API("result_depth") int result_depth() { return resultDepth; }
API("result_valid") int result_valid() { return resultValid; }
API("nodes") double nodes() { return (double)searcher.nodes; }
API("seldepth") int seldepth() { return searcher.seldepth; }
