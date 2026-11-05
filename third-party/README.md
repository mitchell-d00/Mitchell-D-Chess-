# Neural network provenance

The distributed model is **128HL-S-5732M-Tmix-Q5-v19.nnue**, published in the
MIT-licensed [Leorik repository](https://github.com/lithander/Leorik), by Thomas Jahn.
It was obtained from commit `7c936b1494ee0140ec8d2d5ae67ea61c9c33cefe`, path
`Resources/Leorik 3.1 Networks/128HL-S-5732M-Tmix-Q5-v19.nnue`.

- Size: 197,440 bytes (including the upstream padding).
- SHA-256: `794f2d101e3974eab1a5d37b60b78898ff8bc93c2813831973a9c4dccd51a704`.
- Upstream architecture: 768 binary piece/square inputs, 128 hidden int16
  accumulators per perspective, squared clipped ReLU, one scalar output.
- Upstream training: Leorik describes these nets as trained from scratch using
  Bullet and labelled self-play positions. The filename identifies the 5732M,
  generation-19 training run. This project does not claim to have trained it.
- Licence: the repository's MIT licence, retained verbatim in
  `LEORIK-LICENSE.txt` and inside the standalone HTML. No separate restrictive
  notice was present for these networks in the inspected revision.

Only the permissive network weights are imported. The JavaScript accumulator
implementation, binary decoder and 1,206-byte WASM SIMD kernel are new code in
this project. The serialized tensor layout, perspective transform and numerical
scaling follow the model's documented inference format. Leorik is credited for
its network and format; it is not presented as original training by Mitchell.

No Stockfish or Leela code, libraries or neural weights are included. Such
engines may be installed independently as test opponents; they are never runtime
dependencies. The existing CC0 opening data remains unchanged.

The exact pinned network is also checked in as `third-party/leorik-128.nnue` so
contributors can rebuild offline without fetching a model. The build verifies
the SHA-256 above. Players still need only the generated `index.html`.
