# Measured results

All historical model comparisons here use the **frozen SDK Code AI baseline**. Browser Hard has been restored to the original table Code AI: NN wins 41.2% and Easy 64 wins 31.5% against it. [Separate browser-policy evaluation](../difficulty-v1/table-code-evaluation.json).

| Policy / hidden layers | ONNX bytes | Best epoch | Val accuracy | Test accuracy | Wins vs SDK Code AI | Browser p95, 220 actions | Browser p95, 512 actions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Uniform random | — | — | — | — | 1/1000 (0.1%) | — | — |
| Easy AI · 64 candidates | — | — | — | — | 361/1000 (36.1%) | — | — |
| 64/32 | 114,638 | 10 | 88.23% | 88.88% | 452/1000 (45.2%) | 0.30 ms | 0.40 ms |
| 128/64 | 244,180 | 10 | 88.95% | 89.35% | 460/1000 (46.0%) | 1.90 ms | 0.70 ms |
| 256/128 | 552,407 | 5 | 88.78% | 89.36% | 462/1000 (46.2%) | 1.10 ms | 1.60 ms |
| 256/512 | 948,695 | 5 | 89.10% | 89.28% | 465/1000 (46.5%) | 1.80 ms | 4.10 ms |
| 512/256 | 1,365,463 | 5 | 89.28% | 89.57% | 450/1000 (45.0%) | 2.00 ms | 4.50 ms |

Accuracy means agreement with teacher actions. Win rates are a separate 1,000-game evaluation per model.

[Easy AI](../difficulty-v1/evaluation.json) uses a 64-play attention limit and
deck-only redraws. It also wins 441/1000 (44.1%) against the deployed 256/128 NN.
Both use the same 500 paired evaluation seeds as the model comparison. Easy has
no ONNX model; its heuristic runtime has not been profiled here. Its 48-candidate
predecessor won 30.4% vs Code and 39.0% vs NN; [archived results](../difficulty-v1/evaluation-48.json).

Latency: Chrome on Mac, WASM one thread, FP32, 100 measured runs after three warmups. Physical phone latency is unmeasured.

The data has p95 220 candidates for attack/defense; 512 is a synthetic capacity stress test, above the observed dataset maximum of 227.

All architectures use the same data and ten-epoch schedule. Greater training accuracy without a matching validation gain indicates overfitting; the saved checkpoint minimizes validation loss.

The table uses the repeat browser run. The first run measured 256/512 at p95 12.40 ms for 220 actions and 29.10 ms for 512 actions. Both raw runs are retained; these short measurements vary with browser/system load and are not a latency guarantee.

[Uniform random](random-baseline.json) uses the same 500 paired seeds and Code AI opponent, with no training. It selects uniformly from legal candidate indices, including swaps and declines. All 1,000 games completed without illegal actions. ONNX size and neural inference latency are not applicable.
