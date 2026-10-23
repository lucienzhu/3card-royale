# Measured results

| Hidden layers | ONNX bytes | Best epoch | Val accuracy | Test accuracy | Wins vs Code AI | Browser p95, 220 actions | Browser p95, 512 actions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64/32 | 114,638 | 10 | 88.23% | 88.88% | 452/1000 (45.2%) | 0.20 ms | 0.30 ms |
| 128/64 | 244,180 | 10 | 88.95% | 89.35% | 460/1000 (46.0%) | 0.40 ms | 0.70 ms |
| 256/128 | 552,407 | 5 | 88.78% | 89.36% | 462/1000 (46.2%) | 0.80 ms | 1.80 ms |
| 512/256 | 1,365,463 | 5 | 89.28% | 89.57% | 450/1000 (45.0%) | 2.20 ms | 5.30 ms |

Accuracy means agreement with teacher actions. Win rates are a separate 1,000-game evaluation per model.

Latency: Chrome on Mac, WASM one thread, FP32, 100 measured runs after three warmups. Physical phone latency is unmeasured.

The data has p95 220 candidates for attack/defense; 512 is a synthetic capacity stress test, above the observed dataset maximum of 227.

The 512 experiment uses the same data and ten-epoch schedule. Greater training accuracy without a matching validation gain indicates overfitting; the saved checkpoint minimizes validation loss.
