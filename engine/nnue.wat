;; Original MIT SIMD kernels. Scratch at 0, model at 1024, bounded ply frames after model.
(module
  (memory (export "memory") 8)
  (func $updateAt (param $dst i32) (param $w i32) (param $b i32) (param $sign i32) (param $h i32)
    (local $i i32) (local $half i32) (local $s v128)
    (local.set $half (i32.shl (local.get $h) (i32.const 1)))
    (local.set $s (i16x8.splat (local.get $sign)))
    (loop $next
      (v128.store (i32.add (local.get $dst) (local.get $i))
        (i16x8.add (v128.load (i32.add (local.get $dst) (local.get $i)))
          (i16x8.mul (v128.load (i32.add (local.get $w) (local.get $i))) (local.get $s))))
      (v128.store (i32.add (local.get $dst) (i32.add (local.get $half) (local.get $i)))
        (i16x8.add (v128.load (i32.add (local.get $dst) (i32.add (local.get $half) (local.get $i))))
          (i16x8.mul (v128.load (i32.add (local.get $b) (local.get $i))) (local.get $s))))
      (local.set $i (i32.add (local.get $i) (i32.const 16)))
      (br_if $next (i32.lt_u (local.get $i) (local.get $half)))))
  ;; Retain scratch update for initial rebuilds and callers without a ply frame.
  (func (export "update") (param $w i32) (param $b i32) (param $sign i32) (param $h i32)
    (call $updateAt (i32.const 0) (local.get $w) (local.get $b) (local.get $sign) (local.get $h)))
  (func $change (param $dst i32) (param $piece i32) (param $square i32) (param $sign i32) (param $h i32)
    (local $sq i32) (local $colour i32) (local $type i32) (local $white i32) (local $black i32)
    (local.set $sq (i32.add (i32.shl (i32.shr_u (local.get $square) (i32.const 4)) (i32.const 3)) (i32.and (local.get $square) (i32.const 7))))
    (local.set $colour (i32.shr_u (i32.and (local.get $piece) (i32.const 8)) (i32.const 3)))
    (local.set $type (i32.shl (i32.sub (i32.and (local.get $piece) (i32.const 7)) (i32.const 1)) (i32.const 6)))
    (local.set $white (i32.mul (i32.add (i32.add (i32.mul (local.get $colour) (i32.const 384)) (local.get $type)) (local.get $sq)) (local.get $h)))
    (local.set $black (i32.mul (i32.add (i32.add (i32.mul (i32.sub (i32.const 1) (local.get $colour)) (i32.const 384)) (local.get $type)) (i32.xor (local.get $sq) (i32.const 56))) (local.get $h)))
    (call $updateAt (local.get $dst) (i32.add (i32.const 1024) (i32.shl (local.get $white) (i32.const 1))) (i32.add (i32.const 1024) (i32.shl (local.get $black) (i32.const 1))) (local.get $sign) (local.get $h)))
  (func $address (param $piece i32) (param $square i32) (param $h i32) (param $flip i32) (result i32)
    (local $sq i32) (local $colour i32)
    (local.set $sq (i32.add (i32.shl (i32.shr_u (local.get $square) (i32.const 4)) (i32.const 3)) (i32.and (local.get $square) (i32.const 7))))
    (local.set $colour (i32.xor (i32.shr_u (i32.and (local.get $piece) (i32.const 8)) (i32.const 3)) (local.get $flip)))
    (i32.add (i32.const 1024) (i32.mul (i32.shl (local.get $h) (i32.const 1))
      (i32.add (i32.add (i32.mul (local.get $colour) (i32.const 384))
        (i32.shl (i32.sub (i32.and (local.get $piece) (i32.const 7)) (i32.const 1)) (i32.const 6)))
        (i32.xor (local.get $sq) (i32.mul (local.get $flip) (i32.const 56)))))))
  ;; Normal/capture/promotion/en-passant moves fuse parent copy and all deltas.
  (func $moveAt (param $dst i32) (param $src i32) (param $piece i32) (param $promoted i32) (param $from i32) (param $to i32) (param $captured i32) (param $capSq i32) (param $h i32)
    (local $wf i32) (local $bf i32) (local $wt i32) (local $bt i32) (local $wc i32) (local $bc i32) (local $i i32) (local $half i32) (local $x v128) (local $y v128)
    (local.set $wf (call $address (local.get $piece) (local.get $from) (local.get $h) (i32.const 0)))
    (local.set $bf (call $address (local.get $piece) (local.get $from) (local.get $h) (i32.const 1)))
    (local.set $wt (call $address (local.get $promoted) (local.get $to) (local.get $h) (i32.const 0)))
    (local.set $bt (call $address (local.get $promoted) (local.get $to) (local.get $h) (i32.const 1)))
    (if (local.get $captured) (then
      (local.set $wc (call $address (local.get $captured) (local.get $capSq) (local.get $h) (i32.const 0)))
      (local.set $bc (call $address (local.get $captured) (local.get $capSq) (local.get $h) (i32.const 1)))))
    (local.set $half (i32.shl (local.get $h) (i32.const 1)))
    (loop $next
      (local.set $x (i16x8.sub (i16x8.add (v128.load (i32.add (local.get $src) (local.get $i))) (v128.load (i32.add (local.get $wt) (local.get $i)))) (v128.load (i32.add (local.get $wf) (local.get $i)))))
      (local.set $y (i16x8.sub (i16x8.add (v128.load (i32.add (local.get $src) (i32.add (local.get $half) (local.get $i)))) (v128.load (i32.add (local.get $bt) (local.get $i)))) (v128.load (i32.add (local.get $bf) (local.get $i)))))
      (if (local.get $captured) (then
        (local.set $x (i16x8.sub (local.get $x) (v128.load (i32.add (local.get $wc) (local.get $i)))))
        (local.set $y (i16x8.sub (local.get $y) (v128.load (i32.add (local.get $bc) (local.get $i)))))))
      (v128.store (i32.add (local.get $dst) (local.get $i)) (local.get $x))
      (v128.store (i32.add (local.get $dst) (i32.add (local.get $half) (local.get $i))) (local.get $y))
      (local.set $i (i32.add (local.get $i) (i32.const 16)))
      (br_if $next (i32.lt_u (local.get $i) (local.get $half)))))
  ;; Copy/update a whole move in one JS/WASM crossing, including special moves.
  (func (export "transition") (param $dst i32) (param $src i32) (param $m i32) (param $piece i32) (param $promoted i32) (param $captured i32) (param $capSq i32) (param $h i32)
    (local $to i32) (local $rook i32) (local $rf i32) (local $rt i32)
    (if (i32.and (i32.ne (local.get $m) (i32.const 0)) (i32.eqz (i32.and (i32.shr_u (local.get $m) (i32.const 17)) (i32.const 4)))) (then
      (call $moveAt (local.get $dst) (local.get $src) (local.get $piece) (local.get $promoted) (i32.and (local.get $m) (i32.const 127)) (i32.and (i32.shr_u (local.get $m) (i32.const 7)) (i32.const 127)) (local.get $captured) (local.get $capSq) (local.get $h))
      (return)))
    (memory.copy (local.get $dst) (local.get $src) (i32.shl (local.get $h) (i32.const 2)))
    (if (local.get $m) (then
      (local.set $to (i32.and (i32.shr_u (local.get $m) (i32.const 7)) (i32.const 127)))
      (call $change (local.get $dst) (local.get $piece) (i32.and (local.get $m) (i32.const 127)) (i32.const -1) (local.get $h))
      (call $change (local.get $dst) (local.get $promoted) (local.get $to) (i32.const 1) (local.get $h))
      (if (local.get $captured) (then (call $change (local.get $dst) (local.get $captured) (local.get $capSq) (i32.const -1) (local.get $h))))
      (if (i32.and (i32.shr_u (local.get $m) (i32.const 17)) (i32.const 4)) (then
        (local.set $rook (i32.or (i32.const 4) (i32.and (local.get $piece) (i32.const 8))))
        (local.set $rf (if (result i32) (i32.eq (local.get $to) (i32.const 6)) (then (i32.const 7)) (else
          (if (result i32) (i32.eq (local.get $to) (i32.const 2)) (then (i32.const 0)) (else
          (if (result i32) (i32.eq (local.get $to) (i32.const 118)) (then (i32.const 119)) (else (i32.const 112))))))))
        (local.set $rt (if (result i32) (i32.eq (local.get $to) (i32.const 6)) (then (i32.const 5)) (else
          (if (result i32) (i32.eq (local.get $to) (i32.const 2)) (then (i32.const 3)) (else
          (if (result i32) (i32.eq (local.get $to) (i32.const 118)) (then (i32.const 117)) (else (i32.const 115))))))))
        (call $change (local.get $dst) (local.get $rook) (local.get $rf) (i32.const -1) (local.get $h))
        (call $change (local.get $dst) (local.get $rook) (local.get $rt) (i32.const 1) (local.get $h)))))))
  (func $term (param $a i32) (param $w i32) (result v128)
    (local $x v128) (local $v v128) (local $lo v128) (local $hi v128)
    (local.set $x (i16x8.min_s (i16x8.max_s (v128.load (local.get $a)) (i16x8.splat (i32.const 0))) (i16x8.splat (i32.const 255))))
    (local.set $v (v128.load (local.get $w)))
    (local.set $lo (i32x4.extend_low_i16x8_s (local.get $x)))
    (local.set $hi (i32x4.extend_high_i16x8_s (local.get $x)))
    (i32x4.add
      (i32x4.mul (i32x4.mul (local.get $lo) (local.get $lo)) (i32x4.extend_low_i16x8_s (local.get $v)))
      (i32x4.mul (i32x4.mul (local.get $hi) (local.get $hi)) (i32x4.extend_high_i16x8_s (local.get $v)))))
  (func $scoreAt (export "scoreAt") (param $acc i32) (param $side i32) (param $h i32) (result i32)
    (local $half i32) (local $us i32) (local $them i32) (local $weights i32) (local $i i32) (local $sum v128)
    (local.set $half (i32.shl (local.get $h) (i32.const 1)))
    (local.set $us (i32.add (local.get $acc) (select (local.get $half) (i32.const 0) (local.get $side))))
    (local.set $them (i32.add (local.get $acc) (select (i32.const 0) (local.get $half) (local.get $side))))
    (local.set $weights (i32.add (i32.const 1024) (i32.mul (i32.const 769) (local.get $half))))
    (loop $next
      (local.set $sum (i32x4.add (local.get $sum)
        (i32x4.add
          (call $term (i32.add (local.get $us) (local.get $i)) (i32.add (local.get $weights) (local.get $i)))
          (call $term (i32.add (local.get $them) (local.get $i)) (i32.add (i32.add (local.get $weights) (local.get $half)) (local.get $i))))))
      (local.set $i (i32.add (local.get $i) (i32.const 16)))
      (br_if $next (i32.lt_u (local.get $i) (local.get $half))))
    (i32.div_s
      (i32.mul (i32.add
        (i32.div_s (i32.add (i32.add (i32x4.extract_lane 0 (local.get $sum)) (i32x4.extract_lane 1 (local.get $sum)))
          (i32.add (i32x4.extract_lane 2 (local.get $sum)) (i32x4.extract_lane 3 (local.get $sum)))) (i32.const 255))
        (i32.load16_s (i32.add (i32.const 1024) (i32.mul (i32.const 771) (local.get $half))))) (i32.const 400))
      (i32.const 16320)))
  (func (export "score") (param $side i32) (param $h i32) (result i32)
    (call $scoreAt (i32.const 0) (local.get $side) (local.get $h))))
