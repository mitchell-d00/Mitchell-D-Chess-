;; Original MIT integer SIMD kernel for Mitchell's MNN1 format.
;; Scratch: two int32 accumulators at 0. Signed int16 model at byte 1024.
(module
 (memory (export "memory") 4)
 (func (export "update") (param $white i32) (param $black i32) (param $sign i32) (param $h i32)
  (local $i i32) (local $a i32) (local $b i32) (local $mult v128)
  (local.set $mult (i32x4.splat (local.get $sign)))
  (loop $next
   (local.set $a (i32.shl (local.get $i) (i32.const 2)))
   (local.set $b (i32.add (local.get $a) (i32.shl (local.get $h) (i32.const 2))))
   (v128.store (local.get $a)
    (i32x4.add (v128.load (local.get $a))
     (i32x4.mul (local.get $mult) (v128.load16x4_s (i32.add (local.get $white) (i32.shl (local.get $i) (i32.const 1)))))))
   (v128.store (local.get $b)
    (i32x4.add (v128.load (local.get $b))
     (i32x4.mul (local.get $mult) (v128.load16x4_s (i32.add (local.get $black) (i32.shl (local.get $i) (i32.const 1)))))))
   (local.set $i (i32.add (local.get $i) (i32.const 4)))
   (br_if $next (i32.lt_u (local.get $i) (local.get $h)))))
 (func (export "score") (param $h i32) (result i32)
  (local $i i32) (local $a i32) (local $output i32) (local $sum v128) (local $diff v128)
  (local.set $output (i32.add (i32.const 1024) (i32.mul (i32.const 1538) (local.get $h))))
  (loop $next
   (local.set $a (i32.shl (local.get $i) (i32.const 2)))
   (local.set $diff
    (i32x4.sub
     (i32x4.min_s (i32x4.splat (i32.const 256)) (i32x4.max_s (v128.const i32x4 0 0 0 0) (v128.load (local.get $a))))
     (i32x4.min_s (i32x4.splat (i32.const 256)) (i32x4.max_s (v128.const i32x4 0 0 0 0) (v128.load (i32.add (local.get $a) (i32.shl (local.get $h) (i32.const 2))))))))
   (local.set $sum (i32x4.add (local.get $sum)
    (i32x4.mul (local.get $diff) (v128.load16x4_s (i32.add (local.get $output) (i32.shl (local.get $i) (i32.const 1)))))))
   (local.set $i (i32.add (local.get $i) (i32.const 4)))
   (br_if $next (i32.lt_u (local.get $i) (local.get $h))))
  (i32.add (i32.add (i32x4.extract_lane 0 (local.get $sum)) (i32x4.extract_lane 1 (local.get $sum)))
   (i32.add (i32x4.extract_lane 2 (local.get $sum)) (i32x4.extract_lane 3 (local.get $sum)))))
)
