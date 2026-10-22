# 3.9 performance and animation validation

[简体中文](PERFORMANCE-3.9.md). Measured on the local Windows machine, Chromium, DPR2, October22,2026. These are measured results; not every scene passes the144FPS target.

| Scene                                                                                 | Mean rendered FPS | Environment                                                      | Result                                          |
| ------------------------------------------------------------------------------------- | ----------------: | ---------------------------------------------------------------- | ----------------------------------------------- |
| Four players, four Lv.8modules per player,100enemies, fixed world seed3900, full view |            153.11 | Explicit browser frame-rate/vsync restrictions disabled;6seconds | This sample passed; earlier137.72sample did not |
| The same encounter in the520×350quiet view                                            |            122.67 | Same DPR2; additional3seconds                                    | This sample failed; earlier186.31sample passed  |

The final full-view P95frame interval was10.60ms. An earlier alive fixed-seed sample measured137.72/186.31FPS in full/quiet views; the final sample measured153.11/122.67FPS. Both strict144assertions remain. The final command exits nonzero because quiet view did not pass. Evolving combat load and browser scheduling vary between time windows; do not cherry-pick the higher result as a universal pass. The mini-window figure is an unrestricted laboratory measurement; real play remains limited by display cadence, browser scheduling, hardware, resolution and encounter density. This does not guarantee144FPS on all devices or in every dense encounter.

Joint animation is updated on every render tick. Optimizations submit existing bone matrices directly through Phaser's normal quad pipeline, remove invisible legacy enemy animation work, draw particle circles as direct triangle fans, adapt arc tessellation by radius and avoid repeated DOM layout work. Contour chord error stays around0.25world pixels. The shared atlas is3840×3808. Browser tests observe actual GPU submissions and check each model, coordinate bounds, all directions and parts.

Normal-scene quality checks first measure an independent blank-page refresh cadence and compare the game against it. They do not redefine the expected rate from a slowed game. Final normal-scene results are included in publication evidence; they do not substitute for dense-encounter measurements.

## Reproduce the stress fixture

PowerShell; the unchanged target is144FPS. Both viewport measurements and screenshots are retained before assertions:

```powershell
$env:BENCHMARK_UNCAPPED='1'
$env:FULL_ARSENAL='1'
$env:STRESS_MODULES='4'
$env:ENEMY_COUNT='100'
$env:STRESS_SEED='3900'
npm run test:stress
```

The fixture uses one browser and three real Socket.IO protocol clients. The test owns a temporary server and path-checked temporary data directory. It does not use player ranking data. The optional seed makes map placement reproducible; unset it to exercise random maps. Test players have survival protection to sustain renderer load; this is not normal gameplay difficulty.

## Normal scene and native client

At DPR2, the normal144target run rendered142.81FPS against an independent142.86Hz blank-page cadence. The explicitly unrestricted laboratory run rendered143.89FPS with a forced144target assertion (observed RAF324.75FPS). Windows native quiet gameplay measured143.34FPS at device scale1, using a520×350canvas. Native transparency, pinning, click-through, hide/tray restore and F9resize were exercised through the actual IPC path.
