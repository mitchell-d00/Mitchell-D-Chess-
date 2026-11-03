;; Original MIT SIMD kernels. Memory: accumulator scratch at 0; int16 model at 1024.
(module
  (memory (export "memory") 8)
  (func (export "update") (param $w i32) (param $b i32) (param $sign i32) (param $h i32)
    (local $i i32) (local $half i32) (local $s v128)
    (local.set $half (i32.shl (local.get $h) (i32.const 1)))
    (local.set $s (i16x8.splat (local.get $sign)))
    (loop $next
      (v128.store (local.get $i)
        (i16x8.add (v128.load (local.get $i))
          (i16x8.mul (v128.load (i32.add (local.get $w) (local.get $i))) (local.get $s))))
      (v128.store (i32.add (local.get $half) (local.get $i))
        (i16x8.add (v128.load (i32.add (local.get $half) (local.get $i)))
          (i16x8.mul (v128.load (i32.add (local.get $b) (local.get $i))) (local.get $s))))
      (local.set $i (i32.add (local.get $i) (i32.const 16)))
      (br_if $next (i32.lt_u (local.get $i) (local.get $half)))))
  (func $term (param $a i32) (param $w i32) (result v128)
    (local $x v128) (local $v v128) (local $lo v128) (local $hi v128)
    (local.set $x (i16x8.min_s (i16x8.max_s (v128.load (local.get $a)) (i16x8.splat (i32.const 0))) (i16x8.splat (i32.const 255))))
    (local.set $v (v128.load (local.get $w)))
    (local.set $lo (i32x4.extend_low_i16x8_s (local.get $x)))
    (local.set $hi (i32x4.extend_high_i16x8_s (local.get $x)))
    (i32x4.add
      (i32x4.mul (i32x4.mul (local.get $lo) (local.get $lo)) (i32x4.extend_low_i16x8_s (local.get $v)))
      (i32x4.mul (i32x4.mul (local.get $hi) (local.get $hi)) (i32x4.extend_high_i16x8_s (local.get $v)))))
  (func (export "score") (param $side i32) (param $h i32) (result i32)
    (local $half i32) (local $us i32) (local $them i32) (local $weights i32) (local $i i32) (local $sum v128)
    (local.set $half (i32.shl (local.get $h) (i32.const 1)))
    (local.set $us (select (local.get $half) (i32.const 0) (local.get $side)))
    (local.set $them (i32.sub (local.get $half) (local.get $us)))
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
      (i32.const 16320))))
